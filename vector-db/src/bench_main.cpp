// Standalone benchmark CLI: builds the deterministic legal dataset in an
// isolated store, measures brute-force vs HNSW (and optionally KD-tree) with
// real wall-clock latencies + recall@K, and prints a structured JSON result.
// Usage: vector-db-bench [count] [dim] [queries] [top_k] [ef] [metric]
//                       [seed] [include_kdtree]
#include <cstdio>
#include <cstdlib>
#include <string>

#include "benchmark.hpp"
#include "ydb_types.hpp"

using namespace ydb;

int main(int argc, char** argv) {
    BenchmarkConfig cfg;
    auto num = [&](int i) { return std::atoi(argv[i]); };
    if (argc > 1) cfg.count = num(1);
    if (argc > 2) cfg.dim = num(2);
    if (argc > 3) cfg.queries = num(3);
    if (argc > 4) cfg.topK = num(4);
    if (argc > 5) cfg.ef = num(5);
    if (argc > 6 && metricFromString(argv[6], cfg.metric) == false) {
        std::fprintf(stderr, "unknown metric '%s'\n", argv[6]);
        return 1;
    }
    if (argc > 7) cfg.seed = (uint64_t)std::strtoull(argv[7], nullptr, 10);
    if (argc > 8) cfg.include_kdtree = std::atoi(argv[8]) != 0;

    std::string err;
    Json result = runBenchmark(cfg, &err);
    if (result.isNull()) {
        std::fprintf(stderr, "benchmark failed: %s\n", err.c_str());
        return 1;
    }
    std::fprintf(stdout, "%s\n", result.dump().c_str());
    return 0;
}