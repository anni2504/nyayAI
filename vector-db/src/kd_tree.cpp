#include "kd_tree.hpp"

#include <algorithm>
#include <cmath>

namespace ydb {

KdTreeIndex::KdTreeIndex(Metric m, int dim) : metric_(m), dim_(dim) {}

int KdTreeIndex::findRec(const std::string& id) const {
    for (size_t i = 0; i < recs_.size(); ++i)
        if (recs_[i].id == id) return (int)i;
    return -1;
}

void KdTreeIndex::insert(const IndexInsertRef& ref) {
    if (findRec(ref.id) != -1) { update(ref); return; }
    recs_.push_back(Rec{ref.id, *ref.vec});
    dirty_ = true;
}

void KdTreeIndex::update(const IndexInsertRef& ref) {
    int i = findRec(ref.id);
    if (i < 0) { insert(ref); return; }
    recs_[(size_t)i].vec = *ref.vec;
    dirty_ = true;
}

bool KdTreeIndex::remove(const std::string& id) {
    int i = findRec(id);
    if (i < 0) return false;
    recs_.erase(recs_.begin() + i);
    dirty_ = true;
    return true;
}

void KdTreeIndex::rebuild(const std::vector<IndexInsertRef>& refs, uint64_t /*seed*/) {
    recs_.clear();
    recs_.reserve(refs.size());
    std::vector<IndexInsertRef> ordered = refs;
    std::stable_sort(ordered.begin(), ordered.end(),
                     [](const auto& a, const auto& b) {
                         if (a.ord != b.ord) return a.ord < b.ord;
                         return a.id < b.id;
                     });
    for (const auto& r : ordered) recs_.push_back(Rec{r.id, *r.vec});
    dirty_ = true;
    ensureClean();
}

int KdTreeIndex::doBuild(std::vector<int>& idxs, int depth) const {
    if (idxs.empty()) return -1;
    const int axis = depth % dim_;
    std::sort(idxs.begin(), idxs.end(), [&](int a, int b) {
        return recs_[(size_t)a].vec[(size_t)axis] < recs_[(size_t)b].vec[(size_t)axis];
    });
    const size_t mid = idxs.size() / 2;

    TreeNode node;
    node.recIdx = idxs[mid];
    node.axis = axis;
    node.split = recs_[(size_t)node.recIdx].vec[(size_t)axis];
    const int cur = (int)tree_.size();
    tree_.push_back(node);

    std::vector<int> left(idxs.begin(), idxs.begin() + (long)mid);
    std::vector<int> right(idxs.begin() + (long)mid + 1, idxs.end());
    tree_[(size_t)cur].left = doBuild(left, depth + 1);
    tree_[(size_t)cur].right = doBuild(right, depth + 1);
    return cur;
}

void KdTreeIndex::ensureClean() const {
    if (!dirty_ && root_ >= 0) return;
    tree_.clear();
    root_ = -1;
    if (recs_.empty()) {
        dirty_ = false;
        return;
    }
    std::vector<int> idxs;
    idxs.reserve(recs_.size());
    for (size_t i = 0; i < recs_.size(); ++i) idxs.push_back((int)i);
    root_ = doBuild(idxs, 0);
    dirty_ = false;
}

double KdTreeIndex::axisPlaneDist(const std::vector<float>& q,
                                  const std::vector<float>& p, int axis) const {
    double d = (double)q[(size_t)axis] - (double)p[(size_t)axis];
    return std::fabs(d);
}

// Exact top-K search: DFS with the splitting-plane rule; the recursion bound is
// the K-th best distance already found (valid lasering for L1/L2 metrics).
void KdTreeIndex::collect(const std::vector<float>& q, int node, int k,
                          std::priority_queue<std::pair<double, int>>& best) const {
    if (node < 0) return;
    const TreeNode& n = tree_[(size_t)node];
    const Rec& rec = recs_[(size_t)n.recIdx];
    double d = metricDistance(metric_, q, rec.vec);
    if ((int)best.size() < k) {
        best.push({d, n.recIdx});
    } else if (d < best.top().first) {
        best.pop();
        best.push({d, n.recIdx});
    }
    double plane = axisPlaneDist(q, rec.vec, n.axis);
    const double bound = (int)best.size() >= k ? best.top().first
                                              : std::numeric_limits<double>::infinity();
    int nearSide = q[(size_t)n.axis] < n.split ? n.left : n.right;
    int farSide = nearSide == n.left ? n.right : n.left;
    collect(q, nearSide, k, best);
    if (plane <= bound) collect(q, farSide, k, best);
}

IndexSearchResult KdTreeIndex::search(const std::vector<float>& q, int topK,
                                      uint64_t /*ef*/) const {
    IndexSearchResult res;
    ensureClean();
    if (root_ < 0 || topK <= 0) return res;
    const size_t k = std::min<size_t>((size_t)topK, recs_.size());

    std::priority_queue<std::pair<double, int>> best;  // max-heap (K nearest kept)
    collect(q, root_, (int)k, best);

    std::vector<std::pair<double, int>> collected;
    collected.reserve(best.size());
    while (!best.empty()) {
        collected.push_back(best.top());
        best.pop();
    }
    std::sort(collected.begin(), collected.end(), [](const auto& a, const auto& b) {
        if (a.first != b.first) return a.first < b.first;
        return a.second < b.second;
    });

    res.scanned = (int64_t)recs_.size();
    res.visited = (int64_t)recs_.size();
    for (const auto& c : collected)
        res.hits.push_back(IndexHit{recs_[(size_t)c.second].id, c.first});
    return res;
}

Json KdTreeIndex::config() const {
    ensureClean();
    Json o = Json::makeObj();
    o["type"] = Json::makeStr("kdtree");
    o["exact"] = Json::makeBool(true);
    o["nodes"] = Json::makeNum((double)tree_.size());
    o["records"] = Json::makeNum((double)recs_.size());
    o["leaf_strategy"] = Json::makeStr("balanced-median-axis-alternating");
    return o;
}

}  // namespace ydb