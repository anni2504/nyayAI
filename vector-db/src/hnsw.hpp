// HNSW (Hierarchical Navigable Small World) graph index.
// Standard construction: bidirectional links with diversity-based neighbor
// selection, per-layer bounded to M (M0 at base layer), deterministic RNG,
// lazy-deletion tombstones. rebuild() reconstructs from record refs so the
// graph can be recovered purely from persisted vectors.
#pragma once

#include <cstdint>
#include <random>
#include <unordered_map>

#include "ydb_types.hpp"

namespace ydb {

class HnswIndex : public Index {
public:
    struct Config {
        int M;
        int M0;
        int efConstruction;
        int efSearch;
        uint64_t seed;
        int maxLevelCap;
        Config()
            : M(16), M0(32), efConstruction(200), efSearch(100), seed(42),
              maxLevelCap(16) {}
        Config(int m, int m0, int efc, int efs, uint64_t sd, int cap)
            : M(m), M0(m0), efConstruction(efc), efSearch(efs), seed(sd),
              maxLevelCap(cap) {}
    };

    HnswIndex(Metric m, int dim, Config cfg = Config{});
    ~HnswIndex() override = default;

    const char* name() const override { return "hnsw"; }
    std::string metricName() const override { return ydb::metricName(metric_); }
    int dimension() const override { return dim_; }
    size_t nodeCount() const override { return nodes_.size(); }
    void reserve(size_t n) override { nodes_.reserve(n); }

    void insert(const IndexInsertRef& ref) override;
    void update(const IndexInsertRef& ref) override;
    bool remove(const std::string& id) override;
    void rebuild(const std::vector<IndexInsertRef>& refs, uint64_t seed) override;
    IndexSearchResult search(const std::vector<float>& q, int topK,
                             uint64_t efOverride) const override;
    Json config() const override;

    void setEfSearch(int ef);

private:
    struct Node {
        std::string id;
        std::vector<float> vec;
        std::vector<std::vector<int>> links;  // links[layer] -> neighbor node idxs
        int level = 0;
        bool deleted = false;
    };

    struct PtrComparer {
        bool operator()(const std::pair<double, int>& a,
                        const std::pair<double, int>& b) const {
            if (a.first != b.first) return a.first < b.first;
            return a.second < b.second;
        }
    };

    Metric metric_;
    int dim_;
    Config cfg_;
    std::vector<Node> nodes_;
    std::unordered_map<std::string, int> idToNode_;
    int entryPoint_ = -1;
    int maxLevel_ = -1;

    std::mt19937 rng_;
    std::uniform_real_distribution<double> u01_{0.0, 1.0};

    int randLevel();
    int findNode(const std::string& id) const;
    double dist(const std::vector<float>& a, const std::vector<float>& b) const;

    // Beam search on a single layer starting at `entry`. `marks` must be sized
    // nodes_.size() and zeroed by the caller; searchLayer flips marks on visits.
    std::vector<std::pair<double, int>> searchLayer(
        int layer, int entry, const std::vector<float>& q, int ef,
        std::vector<char>& marks) const;

    // Diversity-based neighbor selection (standard HNSW heuristic).
    std::vector<int> selectNeighbors(
        const std::vector<std::pair<double, int>>& candidates, int m,
        bool keepPruned) const;

    // Bidirectional link with degree cap + deterministic pruning.
    void connectNeighbor(int layer, int node, int nbr, int maxDegree);
};

}  // namespace ydb