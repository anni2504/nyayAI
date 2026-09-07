#include "brute_force.hpp"

#include <algorithm>

namespace ydb {

BruteForceIndex::BruteForceIndex(Metric m, int dim) : metric_(m), dim_(dim) {}

void BruteForceIndex::insert(const IndexInsertRef& ref) {
    ids_.push_back(ref.id);
    vecs_.push_back(*ref.vec);
}

void BruteForceIndex::update(const IndexInsertRef& ref) {
    for (size_t i = 0; i < ids_.size(); ++i) {
        if (ids_[i] == ref.id) {
            vecs_[i] = *ref.vec;
            return;
        }
    }
    // Not present yet: treat as insert.
    insert(ref);
}

bool BruteForceIndex::remove(const std::string& id) {
    for (size_t i = 0; i < ids_.size(); ++i) {
        if (ids_[i] == id) {
            ids_.erase(ids_.begin() + (long)i);
            vecs_.erase(vecs_.begin() + (long)i);
            return true;
        }
    }
    return false;
}

void BruteForceIndex::rebuild(const std::vector<IndexInsertRef>& refs, uint64_t /*seed*/) {
    ids_.clear();
    vecs_.clear();
    ids_.reserve(refs.size());
    vecs_.reserve(refs.size());
    for (const auto& r : refs) {
        ids_.push_back(r.id);
        vecs_.push_back(*r.vec);
    }
}

IndexSearchResult BruteForceIndex::search(const std::vector<float>& q, int topK,
                                          uint64_t /*ef*/) const {
    IndexSearchResult res;
    res.scanned = (int64_t)ids_.size();
    res.visited = (int64_t)ids_.size();
    if (ids_.empty()) return res;

    std::vector<std::pair<double, size_t>> scored;
    scored.reserve(ids_.size());
    for (size_t i = 0; i < ids_.size(); ++i)
        scored.emplace_back(metricDistance(metric_, q, vecs_[i]), i);

    const size_t k = std::min<size_t>(topK, scored.size());
    std::nth_element(scored.begin(), scored.begin() + (long)k, scored.end(),
                     [](const auto& a, const auto& b) {
                         if (a.first != b.first) return a.first < b.first;
                         return a.second < b.second;  // stable on distance ties
                     });
    std::sort(scored.begin(), scored.begin() + (long)k,
              [](const auto& a, const auto& b) {
                  if (a.first != b.first) return a.first < b.first;
                  return a.second < b.second;
              });
    res.hits.reserve(k);
    for (size_t i = 0; i < k; ++i)
        res.hits.push_back(IndexHit{ids_[scored[i].second], scored[i].first});
    return res;
}

Json BruteForceIndex::config() const {
    Json o = Json::makeObj();
    o["type"] = Json::makeStr("brute-force");
    o["exact"] = Json::makeBool(true);
    o["algorithm"] = Json::makeStr("linear-scan-nth-element");
    o["nodes"] = Json::makeNum((double)nodeCount());
    return o;
}

}  // namespace ydb