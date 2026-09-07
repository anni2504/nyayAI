#include "hnsw.hpp"

#include <algorithm>
#include <cmath>
#include <queue>

namespace ydb {

HnswIndex::HnswIndex(Metric m, int dim, Config cfg)
    : metric_(m), dim_(dim), cfg_(cfg), rng_(cfg.seed) {
    if (cfg_.M <= 0) throw std::runtime_error(jsonErr("HNSW M must be > 0"));
    if (cfg_.M0 < cfg_.M) cfg_.M0 = cfg_.M * 2;
    if (cfg_.efConstruction < cfg_.M) cfg_.efConstruction = cfg_.M;
}

void HnswIndex::setEfSearch(int ef) {
    if (ef > 0) cfg_.efSearch = ef;
}

double HnswIndex::dist(const std::vector<float>& a, const std::vector<float>& b) const {
    return metricDistance(metric_, a, b);
}

int HnswIndex::randLevel() {
    // mL = 1/ln(M) is the standard scaling so most nodes live at base layer 0.
    const double mL = 1.0 / std::log((double)cfg_.M);
    double u = std::max(1e-12, u01_(rng_));
    int level = (int)std::floor(-std::log(u) * mL);
    if (level > cfg_.maxLevelCap) level = cfg_.maxLevelCap;
    return level;
}

int HnswIndex::findNode(const std::string& id) const {
    auto it = idToNode_.find(id);
    return it == idToNode_.end() ? -1 : it->second;
}

// Beam search over one layer of the graph.
std::vector<std::pair<double, int>> HnswIndex::searchLayer(
    int layer, int entry, const std::vector<float>& q, int ef,
    std::vector<char>& marks) const {
    // candidates: min-heap (nearest first); results: bounded max-heap (evict
    // the farthest when the beam exceeds ef).
    using P = std::pair<double, int>;
    std::priority_queue<P, std::vector<P>, std::greater<>> candidates;
    std::priority_queue<P, std::vector<P>, PtrComparer> results;

    auto push = [&](int node, double d) {
        if (marks[(size_t)node]) return;
        if (nodes_[(size_t)node].deleted) return;
        if (layer > nodes_[(size_t)node].level) return;
        marks[(size_t)node] = 1;
        candidates.emplace(d, node);
        results.emplace(d, node);
        if ((int)results.size() > ef) results.pop();
    };

    const double entryDist = dist(nodes_[(size_t)entry].vec, q);
    push(entry, entryDist);
    if (candidates.empty()) return {};

    while (!candidates.empty()) {
        P cur = candidates.top();
        candidates.pop();
        if (results.size() >= (size_t)ef && cur.first > results.top().first) break;
        const int node = cur.second;
        if (layer >= (int)nodes_[(size_t)node].links.size()) continue;
        const auto& nbrs = nodes_[(size_t)node].links[(size_t)layer];
        for (int nb : nbrs) {
            if (marks[(size_t)nb]) continue;
            if (nodes_[(size_t)nb].deleted) continue;
            if (layer > nodes_[(size_t)nb].level) continue;
            marks[(size_t)nb] = 1;
            // Candidate priority is the distance from the neighbor to the QUERY.
            double d = metricDistance(metric_, nodes_[(size_t)nb].vec, q);
            candidates.emplace(d, nb);
            results.emplace(d, nb);
            if ((int)results.size() > ef) results.pop();
        }
    }

    std::vector<P> out;
    out.reserve(results.size());
    while (!results.empty()) {
        out.push_back(results.top());
        results.pop();
    }
    std::sort(out.begin(), out.end(), PtrComparer{});
    return out;
}

// Diversity-based neighbor selection (Malkov & Yashunin heuristic).
// Candidates arrive sorted by distance to the query. A candidate is accepted
// if no already-accepted neighbor is closer to it than the candidate is to the
// query. When keepPruned is false (final construction) rejected candidates are
// discarded; when true they are appended as ties.
std::vector<int> HnswIndex::selectNeighbors(
    const std::vector<std::pair<double, int>>& candidates, int m,
    bool keepPruned) const {
    std::vector<std::pair<double, int>> cand = candidates;
    std::sort(cand.begin(), cand.end(), PtrComparer{});

    std::vector<int> result;
    std::vector<int> pruned;
    result.reserve(std::min<size_t>(cand.size(), (size_t)m));

    for (const auto& c : cand) {
        if ((int)result.size() >= m) break;
        bool keep = true;
        for (int r : result) {
            double between = dist(nodes_[(size_t)c.second].vec,
                                  nodes_[(size_t)r].vec);
            if (between < c.first) {
                keep = false;
                break;
            }
        }
        if (keep) {
            result.push_back(c.second);
        } else if (keepPruned) {
            pruned.push_back(c.second);
        }
    }
    for (int p : pruned) {
        if ((int)result.size() >= m) break;
        result.push_back(p);
    }
    return result;
}

void HnswIndex::connectNeighbor(int layer, int node, int nbr, int maxDegree) {
    auto& links = nodes_[(size_t)node].links[(size_t)layer];
    if (std::find(links.begin(), links.end(), nbr) != links.end()) return;
    links.push_back(nbr);
    if ((int)links.size() > maxDegree) {
        const auto& center = nodes_[(size_t)node].vec;
        std::vector<std::pair<double, int>> scored;
        scored.reserve(links.size());
        for (int nb : links)
            scored.emplace_back(dist(center, nodes_[(size_t)nb].vec), nb);
        std::sort(scored.begin(), scored.end(), PtrComparer{});
        links.clear();
        for (int i = 0; i < (int)scored.size() && (int)links.size() < maxDegree; ++i)
            links.push_back(scored[i].second);
    }
}

void HnswIndex::insert(const IndexInsertRef& ref) {
    int existing = findNode(ref.id);
    if (existing != -1) remove(ref.id);  // idempotence: one representation per id

    const std::vector<float>& v = *ref.vec;
    if (nodes_.empty()) {
        int level = randLevel();
        nodes_.push_back(Node{ref.id, v, {}, level, false});
        nodes_[0].links.assign((size_t)level + 1, std::vector<int>{});
        entryPoint_ = 0;
        maxLevel_ = level;
        idToNode_[ref.id] = 0;
        return;
    }

    const int level = randLevel();
    const int idx = (int)nodes_.size();
    nodes_.push_back(Node{ref.id, v, {}, level, false});
    nodes_[(size_t)idx].links.assign((size_t)level + 1, std::vector<int>{});
    idToNode_[ref.id] = idx;

    std::vector<char> marks(nodes_.size(), 0);

    // Greedy single-nearest descent from the top layer down to level+1.
    int ep = entryPoint_;
    for (int lc = maxLevel_; lc > level; --lc) {
        auto res = searchLayer(lc, ep, v, 1, marks);
        if (!res.empty()) ep = res[0].second;
        std::fill(marks.begin(), marks.end(), 0);
    }

    // Beam-connect from min(level, maxLevel) down to layer 0.
    for (int lc = std::min(level, maxLevel_); lc >= 0; --lc) {
        auto res = searchLayer(lc, ep, v, cfg_.efConstruction, marks);
        std::fill(marks.begin(), marks.end(), 0);
        const int m = lc == 0 ? cfg_.M0 : cfg_.M;
        std::vector<int> nbrs = selectNeighbors(res, m, false);
        nodes_[(size_t)idx].links[(size_t)lc] = nbrs;
        for (int nb : nbrs) connectNeighbor(lc, nb, idx, m);
        if (!res.empty()) ep = res[0].second;
    }

    if (level > maxLevel_) {
        maxLevel_ = level;
        entryPoint_ = idx;
    }
}

bool HnswIndex::remove(const std::string& id) {
    int node = findNode(id);
    if (node < 0) return false;
    nodes_[(size_t)node].deleted = true;  // lazy tombstone; purged on rebuild()

    if (node == entryPoint_) {
        int best = -1, bestLevel = -1;
        for (size_t i = 0; i < nodes_.size(); ++i) {
            if (nodes_[i].deleted) continue;
            if (nodes_[i].level > bestLevel) {
                bestLevel = nodes_[i].level;
                best = (int)i;
            }
        }
        entryPoint_ = best;
        maxLevel_ = bestLevel;
    }
    return true;
}

void HnswIndex::update(const IndexInsertRef& ref) {
    if (findNode(ref.id) == -1) {
        insert(ref);
        return;
    }
    remove(ref.id);
    insert(ref);
}

void HnswIndex::rebuild(const std::vector<IndexInsertRef>& refs, uint64_t seed) {
    nodes_.clear();
    idToNode_.clear();
    entryPoint_ = -1;
    maxLevel_ = -1;
    rng_ = std::mt19937(seed);

    std::vector<IndexInsertRef> ordered = refs;
    std::stable_sort(ordered.begin(), ordered.end(),
                     [](const auto& a, const auto& b) {
                         if (a.ord != b.ord) return a.ord < b.ord;
                         return a.id < b.id;
                     });
    nodes_.reserve(ordered.size());
    for (const auto& r : ordered) insert(r);
}

IndexSearchResult HnswIndex::search(const std::vector<float>& q, int topK,
                                    uint64_t efOverride) const {
    IndexSearchResult res;
    if (nodes_.empty()) return res;
    if (entryPoint_ < 0 || maxLevel_ < 0) return res;
    if (topK <= 0) return res;

    int ef = efOverride > 0 ? (int)efOverride : cfg_.efSearch;
    if (ef < topK) ef = topK;

    std::vector<char> marks(nodes_.size(), 0);

    // Descent with a single-nearest beam down to layer 0 following the entry point.
    int ep = entryPoint_;
    for (int lc = maxLevel_; lc >= 1; --lc) {
        auto r = searchLayer(lc, ep, q, 1, marks);
        std::fill(marks.begin(), marks.end(), 0);
        if (!r.empty()) ep = r[0].second;
    }

    auto base = searchLayer(0, ep, q, ef, marks);
    std::fill(marks.begin(), marks.end(), 0);

    res.visited = (int64_t)base.size();
    res.scanned = res.visited;
    res.hits.reserve(std::min<size_t>(base.size(), (size_t)topK));
    for (const auto& hit : base) {
        res.hits.push_back(IndexHit{nodes_[(size_t)hit.second].id, hit.first});
        if ((int)res.hits.size() >= topK) break;
    }
    return res;
}

Json HnswIndex::config() const {
    Json o = Json::makeObj();
    o["type"] = Json::makeStr("hnsw");
    o["M"] = Json::makeNum(cfg_.M);
    o["M0"] = Json::makeNum(cfg_.M0);
    o["ef_construction"] = Json::makeNum(cfg_.efConstruction);
    o["ef_search"] = Json::makeNum(cfg_.efSearch);
    o["max_level_cap"] = Json::makeNum(cfg_.maxLevelCap);
    o["seed"] = Json::makeNum((double)cfg_.seed);
    o["nodes"] = Json::makeNum((double)nodes_.size());
    int64_t tombs = 0, live = 0;
    for (const auto& n : nodes_) (n.deleted ? tombs : live)++;
    o["live_nodes"] = Json::makeNum((double)live);
    o["tombstones"] = Json::makeNum((double)tombs);
    o["max_level"] = Json::makeNum(maxLevel_);
    o["entry_point_live"] = Json::makeBool(
        entryPoint_ >= 0 && !nodes_[(size_t)entryPoint_].deleted);
    return o;
}

}  // namespace ydb