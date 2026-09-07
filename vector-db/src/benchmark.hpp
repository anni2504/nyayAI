// Real benchmark harness. Uses brute-force search as ground truth, measures
// average/p95/max/min latency, throughput (QPS), and recall@K for the HNSW
// (and optionally KD-tree) index over the deterministic legal dataset. All
// numbers are measured; only recall/scanned counts are deterministic since the
// dataset and query construction are seeded.
#pragma once

#include <string>

#include "legal_dataset.hpp"
#include "vector_store.hpp"
#include "ydb_types.hpp"

namespace ydb {

struct BenchmarkConfig {
    int count = 1000;
    int dim = 64;
    int topK = 10;
    int queries = 200;
    int ef = 100;
    Metric metric = Metric::Cosine;
    uint64_t seed = 42;
    bool include_kdtree = false;  // only valid for euclidean/manhattan
    double jitter = 0.10;         // query perturbation relative to source record
};

// Runs the benchmark in an isolated temp directory and returns a structured
// JSON result (reusable by Phase 10). Sets errOut on failure.
Json runBenchmark(const BenchmarkConfig& cfg, std::string* errOut);

}  // namespace ydb