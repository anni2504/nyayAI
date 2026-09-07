// KD-tree index. Educational/exact: lazily rebuilt on mutation, exact
// axis-split nearest-neighbor walk (ball-within-slab pruning), deterministic
// tie-breaking. Supports euclidean/manhattan metrics only (cosine is not
// axis-aligned; the store rejects index "kdtree" with cosine).
#pragma once

#include <queue>
#include <vector>

#include "ydb_types.hpp"

namespace ydb {

class KdTreeIndex : public Index {
public:
    KdTreeIndex(Metric m, int dim);
    ~KdTreeIndex() override = default;

    const char* name() const override { return "kdtree"; }
    std::string metricName() const override { return ydb::metricName(metric_); }
    int dimension() const override { return dim_; }
    size_t nodeCount() const override { return recs_.size(); }
    void reserve(size_t n) override { recs_.reserve(n); }

    void insert(const IndexInsertRef& ref) override;
    void update(const IndexInsertRef& ref) override;
    bool remove(const std::string& id) override;
    void rebuild(const std::vector<IndexInsertRef>& refs, uint64_t seed) override;
    IndexSearchResult search(const std::vector<float>& q, int topK,
                             uint64_t ef) const override;
    Json config() const override;

private:
    struct TreeNode {
        int recIdx = -1;   // into recs_
        int left = -1;
        int right = -1;
        int axis = 0;
        double split = 0.0;
    };
    struct Rec {
        std::string id;
        std::vector<float> vec;
    };

    Metric metric_;
    int dim_;
    std::vector<Rec> recs_;
    mutable std::vector<TreeNode> tree_;
    mutable int root_ = -1;
    mutable bool dirty_ = true;

    int findRec(const std::string& id) const;
    void ensureClean() const;  // lazily (re)builds tree_ from recs_
    int doBuild(std::vector<int>& idxs, int depth) const;
    // DFS collecting the exact K nearest within ball-within-slab pruning.
    void collect(const std::vector<float>& q, int node, int k,
                 std::priority_queue<std::pair<double, int>>& best) const;
    double axisPlaneDist(const std::vector<float>& q, const std::vector<float>& p,
                         int axis) const;
};

}  // namespace ydb