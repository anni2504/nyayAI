#include "benchmark.hpp"

#include <algorithm>
#include <chrono>
#include <cmath>
#include <random>

namespace ydb {

namespace {
struct Latency {
    std::vector<double> ms;
    int64_t scannedTotal = 0;
    double totalMs = 0.0;
    double avgMs = 0.0, p95Ms = 0.0, maxMs = 0.0, minMs = 0.0, qps = 0.0;
    double recallAtK = 0.0;   // only meaningful for approximate indexes
    int64_t recallCount = 0;

    static double pct(std::vector<double> v, double p) {
        if (v.empty()) return 0.0;
        std::sort(v.begin(), v.end());
        size_t idx = std::min(v.size() - 1, (size_t)((v.size() - 1) * p));
        return v[idx];
    }

    void finish() {
        if (ms.empty()) return;
        std::sort(ms.begin(), ms.end());
        minMs = ms.front();
        maxMs = ms.back();
        avgMs = totalMs / (double)ms.size();
        p95Ms = pct(ms, 0.95);
        qps = (double)ms.size() / (totalMs / 1000.0);
    }
};

Json latencyJson(const char* method, const Latency& l) {
    Json o = Json::makeObj();
    o["method"] = Json::makeStr(method);
    o["queries"] = Json::makeNum((double)l.ms.size());
    o["avg_ms"] = Json::makeNum(l.avgMs);
    o["p95_ms"] = Json::makeNum(l.p95Ms);
    o["max_ms"] = Json::makeNum(l.maxMs);
    o["min_ms"] = Json::makeNum(l.minMs);
    o["total_ms"] = Json::makeNum(l.totalMs);
    o["qps"] = Json::makeNum(l.qps);
    o["recall_at_k"] = Json::makeNum(l.recallAtK);
    o["scanned_total"] = Json::makeNum((double)l.scannedTotal);
    return o;
}
}  // namespace

Json runBenchmark(const BenchmarkConfig& cfg, std::string* errOut) {
    BenchmarkConfig c = cfg;
    if (c.count <= 0 || c.queries <= 0 || c.topK <= 0) {
        if (errOut) *errOut = jsonErr("benchmark needs positive count/queries/topK");
        return {};
    }
    if (c.include_kdtree && c.metric == Metric::Cosine) {
        if (errOut) *errOut = jsonErr("kdtree benchmark requires euclidean/manhattan metric");
        return {};
    }

    LegalDataset ds;
    auto records = ds.generate((size_t)c.count, c.dim, c.seed, errOut);
    if (records.empty() && c.count > 0) return {};

    // In-memory-style isolated store (throwaway temp dir).
    VectorStore store(c.metric, "vector-db-memory", "bench-" + std::to_string(c.seed) + ".vdb");
    store.setAutosave(false);

    const auto tBuild0 = std::chrono::steady_clock::now();
    std::string upErr;
    for (const auto& r : records) store.upsert(r, &upErr);
    const double buildMs = std::chrono::duration<double, std::milli>(
                               std::chrono::steady_clock::now() - tBuild0)
                               .count();

    // Deterministic query set: perturbed copies of sampled source records.
    std::mt19937 rng(c.seed + 12345);
    std::uniform_int_distribution<size_t> pick(0, records.size() - 1);
    std::vector<std::vector<float>> queries;
    queries.reserve((size_t)c.queries);
    for (int q = 0; q < c.queries; ++q) {
        const auto& src = records[pick(rng)].vector;
        std::vector<float> v = src;
        for (float& x : v) {
            double u = (double)(rng() % 2000001) / 1000000.0 - 1.0;
            x += (float)(u * c.jitter);
        }
        queries.push_back(std::move(v));
    }

    // Ground-truth ids per query (brute force, unfiltered) + brute latency
    // measured in the same pass (the truth pass IS the brute-force benchmark).
    Latency bf;
    bf.ms.reserve(queries.size());
    std::vector<std::vector<std::string>> truth;
    truth.reserve(queries.size());
    {
        std::string sErr;
        for (const auto& q : queries) {
            auto t0 = std::chrono::steady_clock::now();
            auto r = store.search(q, c.topK, "brute", c.metric, {}, 0, false, &sErr);
            auto t1 = std::chrono::steady_clock::now();
            bf.ms.push_back(std::chrono::duration<double, std::milli>(t1 - t0).count());
            bf.totalMs += bf.ms.back();
            std::vector<std::string> ids;
            if (r.ok) {
                bf.scannedTotal += (int64_t)r.body.at("scanned").toDoubleOpt().value_or(0.0);
                for (const auto& j : r.body.at("results").arr)
                    if (auto id = j.at("id").toStringOpt()) ids.push_back(*id);
            }
            truth.push_back(std::move(ids));
        }
    }
    bf.finish();
    auto recallFor = [&](const std::vector<std::vector<std::string>>& sets) {
        double sum = 0.0;
        for (size_t i = 0; i < truth.size() && i < sets.size(); ++i) {
            int common = 0;
            for (const auto& id : sets[i])
                if (std::find(truth[i].begin(), truth[i].end(), id) != truth[i].end())
                    ++common;
            sum += (double)common / (double)c.topK;
        }
        return truth.empty() ? 0.0 : sum / (double)truth.size();
    };

    auto timeMethod = [&](const std::string& indexName, int ef,
                          std::vector<std::vector<std::string>>* outSets) {
        Latency L;
        L.ms.reserve(queries.size());
        std::string sErr;
        for (const auto& q : queries) {
            auto t0 = std::chrono::steady_clock::now();
            auto r = store.search(q, c.topK, indexName, c.metric, {}, ef, false, &sErr);
            auto t1 = std::chrono::steady_clock::now();
            L.ms.push_back(std::chrono::duration<double, std::milli>(t1 - t0).count());
            L.totalMs += L.ms.back();
            if (r.ok) {
                L.scannedTotal += (int64_t)r.body.at("scanned").toDoubleOpt().value_or(0.0);
                std::vector<std::string> ids;
                for (const auto& j : r.body.at("results").arr)
                    if (auto id = j.at("id").toStringOpt()) ids.push_back(*id);
                if (outSets) outSets->push_back(std::move(ids));
            } else if (outSets) {
                outSets->push_back({});
            }
        }
        L.finish();
        return L;
    };

    std::vector<std::vector<std::string>> hnswSets;
    auto hnsw = timeMethod("hnsw", c.ef, &hnswSets);
    hnsw.recallAtK = recallFor(hnswSets);
    hnsw.recallCount = (int64_t)hnswSets.size();

    Json out = Json::makeObj();
    out["schema"] = Json::makeStr("nyayai-benchmark/v1");
    out["status"] = Json::makeStr("ok");
    Json dsj = Json::makeObj();
    dsj["count"] = Json::makeNum(c.count);
    dsj["dimension"] = Json::makeNum(c.dim);
    dsj["seed"] = Json::makeNum((double)c.seed);
    dsj["practice_areas"] = Json::makeNum(6.0);
    out["dataset"] = std::move(dsj);
    out["metric"] = Json::makeStr(metricName(c.metric));
    out["top_k"] = Json::makeNum(c.topK);
    out["ef_search"] = Json::makeNum(c.ef);
    out["queries"] = Json::makeNum(c.queries);
    out["build_ms"] = Json::makeNum(buildMs);
    out["index_build"] = Json::makeStr("incremental-upsert (all indexes)");

    Json hnswCfg = Json::makeObj();
    // Pull the real HNSW configuration from the store (source of truth).
    std::string dummy;
    const Json statsNow = store.stats();
    hnswCfg["M"] = statsNow.at("indexes").at("hnsw").at("M");
    hnswCfg["M0"] = statsNow.at("indexes").at("hnsw").at("M0");
    hnswCfg["ef_construction"] = statsNow.at("indexes").at("hnsw").at("ef_construction");
    hnswCfg["ef_search"] = statsNow.at("indexes").at("hnsw").at("ef_search");
    out["hnsw_config"] = std::move(hnswCfg);

    Json methods = Json::makeArr();
    methods.arr.push_back(latencyJson("brute", bf));
    methods.arr.push_back(latencyJson("hnsw", hnsw));
    if (c.include_kdtree) {
        auto kd = timeMethod("kdtree", 0, nullptr);
        kd.recallAtK = 1.0;  // exact index
        methods.arr.push_back(latencyJson("kdtree", kd));
    }
    out["methods"] = std::move(methods);

    const double speedup = bf.avgMs > 0 ? bf.avgMs / (hnsw.avgMs > 0 ? hnsw.avgMs : 1e-12)
                                        : 0.0;
    out["hnsw_speedup_vs_brute_avg"] = Json::makeNum(speedup);
    out["hnsw_recall_at_k"] = Json::makeNum(hnsw.recallAtK);
    out["ground_truth"] = Json::makeStr("brute-force-exact");

    auto startup = std::chrono::steady_clock::now();
    out["wall_time_ms"] = Json::makeNum(
        std::chrono::duration<double, std::milli>(startup - tBuild0).count());
    (void)dummy;
    return out;
}

}  // namespace ydb