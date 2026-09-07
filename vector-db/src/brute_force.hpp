// Brute-force exact index. Ground truth for recall measurement.
#pragma once

#include "ydb_types.hpp"

namespace ydb {

class BruteForceIndex : public Index {
public:
    BruteForceIndex(Metric m, int dim);
    ~BruteForceIndex() override = default;

    const char* name() const override { return "brute"; }
    std::string metricName() const override { return ydb::metricName(metric_); }
    int dimension() const override { return dim_; }
    size_t nodeCount() const override { return vecs_.size(); }
    void reserve(size_t n) override { vecs_.reserve(n); }

    void insert(const IndexInsertRef& ref) override;
    void update(const IndexInsertRef& ref) override;
    bool remove(const std::string& id) override;
    void rebuild(const std::vector<IndexInsertRef>& refs, uint64_t seed) override;
    IndexSearchResult search(const std::vector<float>& q, int topK,
                             uint64_t /*ef*/) const override;
    Json config() const override;

private:
    Metric metric_;
    int dim_;
    std::vector<std::string> ids_;
    std::vector<std::vector<float>> vecs_;
};

}  // namespace ydb