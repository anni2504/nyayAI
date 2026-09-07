// Deterministic self-test suite for the NYAYAI vector database.
// Build with `make test` -> runs `vector-db-tests`. No external services
// (Groq/Ollama/network) are required.
#include <atomic>
#include <cmath>
#include <cstdio>
#include <filesystem>
#include <limits>
#include <memory>
#include <random>
#include <string>
#include <thread>
#include <vector>

#include "brute_force.hpp"
#include "hnsw.hpp"
#include "kd_tree.hpp"
#include "legal_dataset.hpp"
#include "vector_store.hpp"
#include "ydb_types.hpp"

using namespace ydb;

namespace {

int g_failures = 0;
int g_checks = 0;

void expect(bool cond, const std::string& what) {
    ++g_checks;
    if (!cond) {
        ++g_failures;
        std::fprintf(stderr, "  FAIL: %s\n", what.c_str());
    }
}

std::vector<float> mk(int dim, double seedVal) {
    std::vector<float> v((size_t)dim);
    std::mt19937 rng((uint32_t)seedVal);
    for (int i = 0; i < dim; ++i) v[(size_t)i] = ((double)(rng() % 1000) / 1000.0 - 0.5) * 2.0;
    return v;
}

std::vector<float> unit(double theta) {
    return std::vector<float>{static_cast<float>(std::cos(theta)),
                              static_cast<float>(std::sin(theta))};
}

std::string areaPath(Metric /*m*/) {
    std::string base = (std::filesystem::temp_directory_path() / "nyayai-vdb-tests").string();
    std::error_code ec;
    std::filesystem::remove_all(base, ec);
    std::filesystem::create_directories(base, ec);
    return base;
}

void testJson() {
    // parse + dump round trip
    Json j = Json::parse(R"({"a":1,"b":-2.5,"c":"x\ny","d":[true,false,null],"e":{"f":"g"}})");
    expect(j.at("a").toDoubleOpt().value_or(0) == 1.0, "json int parse");
    expect(j.at("b").toDoubleOpt().value_or(0) == -2.5, "json float parse");
    expect(j.at("c").s == "x\ny", "json escape parse");
    expect(j.at("d").arr.size() == 3, "json array parse");
    expect(j.at("e").at("f").s == "g", "json nested parse");
    Json j2 = Json::parse(j.dump());
    expect(j2.dump() == j.dump(), "json dump round-trip stable/ordered");
    bool threw = false;
    try { Json::parse("{not json"); } catch (const std::exception&) { threw = true; }
    expect(threw, "json malformed input throws");
}

void testMetric() {
    // cosine identities
    std::vector<float> a = unit(0.0), b = unit(0.785398), c = unit(3.1415926535);
    double d_aa = metricDistance(Metric::Cosine, a, a);
    double d_ab = metricDistance(Metric::Cosine, a, b);
    double d_ac = metricDistance(Metric::Cosine, a, c);
    expect(std::fabs(d_aa) < 1e-6, "cosine same -> distance 0");
    expect(std::fabs(d_ac - 2.0) < 1e-6, "cosine opposite -> distance 2");
    expect(std::fabs(1.0 - d_ab - std::cos(0.785398)) < 1e-6, "cosine 45deg similarity");
    expect(std::fabs(toSimilarity(Metric::Cosine, d_ab) - std::cos(0.785398)) < 1e-6,
           "cosine similarity semantics");

    // euclidean known value: (3,4) vs (0,0) -> 5
    std::vector<float> p{3, 4}, z{0, 0};
    expect(std::fabs(metricDistance(Metric::Euclidean, p, z) - 5.0) < 1e-6,
           "euclidean exact value");
    expect(std::fabs(metricDistance(Metric::Manhattan, p, z) - 7.0) < 1e-6,
           "manhattan exact value");

    // zero-norm handling (stored zero vector vs query) -> max distance (doc)
    std::vector<float> q{1, 0}, zero{0, 0};
    expect(metricDistance(Metric::Cosine, zero, q) == 1.0, "zero-norm cosine -> distance 1");

    // validation codes
    std::vector<float> v8 = mk(8, 1);
    expect(validateVector(v8, 8, Metric::Cosine, false) == validation::Code::Ok,
           "valid vector ok");
    expect(validateVector(v8, 16, Metric::Cosine, false) == validation::Code::WrongDimension,
           "wrong dim rejected");
    std::vector<float> nan{1.0f, static_cast<float>(std::nan(""))};
    expect(validateVector(nan, 2, Metric::Cosine, false) == validation::Code::ContainsNaN,
           "NaN rejected");
    std::vector<float> inf{1.0f, std::numeric_limits<float>::infinity()};
    expect(validateVector(inf, 2, Metric::Cosine, false) == validation::Code::ContainsInf,
           "inf rejected");
    std::vector<float> empty;
    expect(validateVector(empty, 0, Metric::Cosine, false) == validation::Code::TooSmall,
           "empty rejected");
    std::vector<float> zq{0, 0};
    expect(validateVector(zq, 2, Metric::Cosine, true) == validation::Code::ZeroNormQuery,
           "zero-norm query rejected for cosine");
    expect(validateVector(zq, 2, Metric::Euclidean, true) == validation::Code::Ok,
           "zero-norm query allowed for euclidean");
}

VectorRecord rec(const std::string& id, const std::string& doc, const std::string& chunk,
                 std::vector<float> v, std::string area = "contract_law",
                 std::string year = "2024") {
    VectorRecord r;
    r.id = id;
    r.document_id = doc;
    r.chunk_id = chunk;
    r.vector = std::move(v);
    r.text_reference = "s3://bucket/corpus/" + area + "/" + doc + ".pdf#page=2";
    r.metadata["country"] = "India";
    r.metadata["practice_area"] = area;
    r.metadata["year"] = year;
    r.metadata["s3_bucket"] = "nyayai-legal-corpus";
    r.metadata["s3_key"] = "corpus/" + area + "/" + doc + ".pdf";
    r.metadata["s3_version_id"] = "v1";
    r.metadata["title"] = "Case " + doc;
    r.metadata["court"] = "Supreme Court of India";
    return r;
}

void testRecordsAndValidation() {
    std::string dir = areaPath(Metric::Cosine) + "/r";
    VectorStore st(Metric::Cosine, dir);
    st.setAutosave(false);

    // empty db
    expect(st.count() == 0, "fresh store empty");
    std::string err;
    SearchResponse sr = st.search(mk(4, 1), 5, "", Metric::Cosine, {}, 0, false, &err);
    expect(sr.ok && sr.body.at("returned").toDoubleOpt().value_or(-1) == 0.0,
           "empty store search returns empty");

    std::vector<float> q = unit(0.0), v1 = unit(0.1), v2 = unit(0.9);
    InsertResult i1 = st.upsert(rec("id1", "doc1", "c1", v1, "contract_law"), &err);
    expect(i1.created && i1.id == "id1", "insert creates");

    // duplicate physical id updates (created=false)
    InsertResult i2 = st.upsert(rec("id1", "doc1", "c1", unit(1.0), "contract_law"), &err);
    expect(i2.updated && st.count() == 1, "duplicate id -> upsert update, count stable");

    // composite-key identity: re-ingest same doc+chunk under a DIFFERENT id
    InsertResult i3 = st.upsert(rec("idX", "doc1", "c1", unit(0.2), "contract_law"), &err);
    expect(i3.updated, "same (doc,chunk) different id -> upsert update");
    expect(i3.id == "id1", "composite identity preserves original id");
    expect(st.count() == 1, "no duplicate logical chunk");

    VectorRecord got;
    expect(st.get("idX", &got, &err) == false, "foreign id still absent");
    expect(st.get("id1", &got, &err) && got.chunk_id == "c1", "record retrievable");

    st.upsert(rec("id2", "doc2", "c1", v2, "criminal_law"), &err);

    // top-k similarity: nearest to q should be id1 (unit(1.0) ~ q)
    sr = st.search(q, 2, "brute", Metric::Cosine, {}, 0, false, &err);
    expect(sr.body.at("results").arr[0].at("id").s == "id1", "nearest by cosine");
    expect(sr.body.at("results").arr[0].at("document_id").s == "doc1", "provenance: document_id");
    expect(sr.body.at("results").arr[0].at("metadata").at("s3_key").s.find("contract_law") !=
               std::string::npos,
           "provenance metadata preserved in results");

    // deletion
    expect(st.remove("id2", &err), "deletion succeeds");
    sr = st.search(q, 5, "brute", Metric::Cosine, {}, 0, false, &err);
    for (const auto& item : sr.body.at("results").arr)
        expect(item.at("id").s != "id2", "deleted record absent from search");

    // invalid dimension / NaN / bad query rejected
    InsertResult bad = st.upsert(rec("bad1", "doc9", "c1", mk(8, 3)), &err);
    expect(!bad.created && !bad.updated, "wrong-dim insert rejected");
    bad = st.upsert(rec("bad2", "doc9", "c1",
                        std::vector<float>{0.0f, static_cast<float>(std::nan(""))}),
                    &err);
    expect(!bad.created && !bad.updated, "NaN insert rejected");
    sr = st.search(std::vector<float>{0.0f, 0.0f}, 5, "brute", Metric::Cosine, {}, 0, false,
                   &err);
    expect(!sr.ok, "zero-norm cosine query rejected");
}

// Metadata filtering combined with similarity search.
void testFiltering() {
    std::string err;
    std::string dir = areaPath(Metric::Cosine) + "/f";
    VectorStore st(Metric::Cosine, dir);
    st.setAutosave(false);

    const int dim = 8;
    for (int i = 0; i < 40; ++i) {
        std::vector<float> v = mk(dim, 100 + i);
        std::string id = "f" + std::to_string(i);
        std::string area = i % 2 == 0 ? "criminal_law" : "contract_law";
        std::string year = i % 3 == 0 ? "2025" : (i % 3 == 1 ? "2024" : "2023");
        st.upsert(rec(id, "D" + std::to_string(i), "c1", v, area, year), &err);
    }
    std::vector<float> q = mk(dim, 555);
    Filters flt;
    flt.push_back(Filter::eq("practice_area", "criminal_law"));
    flt.push_back(Filter::eq("year", "2025"));
    SearchResponse sr = st.search(q, 5, "brute", Metric::Cosine, flt, 0, false, &err);
    expect(sr.ok, "filtered search ok");
    int n = (int)sr.body.at("results").arr.size();
    expect(n > 0 && n <= 5, "filtered results present and bounded by top_k");
    bool allMatch = true;
    for (const auto& item : sr.body.at("results").arr) {
        const Json& md = item.at("metadata");
        if (md.at("practice_area").s != "criminal_law" || md.at("year").s != "2025")
            allMatch = false;
    }
    expect(allMatch, "all filtered results respect every filter (AND)");

    // combined semantic ranking within filters: nearest criminal_law/2025 record
    // to q (brute returns order); verify results sorted by similarity desc.
    bool sorted = true;
    double prev = 1.0;
    for (const auto& item : sr.body.at("results").arr) {
        double sim = item.at("similarity").toDoubleOpt().value_or(-2.0);
        if (sim > prev + 1e-9) sorted = false;
        prev = sim;
    }
    expect(sorted, "filtered results sorted by similarity");

    // numeric range filter (year >= 2024)
    Filters range;
    range.push_back(Filter{"year", Filter::Op::Gte, "2024"});
    sr = st.search(q, 100, "brute", Metric::Cosine, range, 0, false, &err);
    bool yearOk = true;
    for (const auto& item : sr.body.at("results").arr) {
        int y = std::stoi(item.at("metadata").at("year").s);
        if (y < 2024) yearOk = false;
    }
    expect(yearOk, "numeric range filter works");
}

void testPersistenceAndRebuild() {
    std::string err;
    std::string dir = areaPath(Metric::Cosine) + "/p";
    const std::string file = "vectors.vdb";
    std::vector<float> qv{0.5f, 1.0f, 0.2f, 0.9f, 0.1f, 0.8f, 0.3f, 0.7f};
    std::vector<std::string> expectedIds;
    {
        VectorStore st(Metric::Cosine, dir, file);
        st.setAutosave(false);
        for (int i = 0; i < 60; ++i) {
            std::string id = "p" + std::to_string(i);
            st.upsert(rec(id, "D" + std::to_string(i), "c1", mk(8, 700 + i),
                          i % 2 ? "family_law" : "property_law"),
                      &err);
        }
        // tombstones exercise rebuild-on-reload
        st.remove("p10", &err);
        expect(st.save(&err), "save ok");
        expect(std::filesystem::exists(dir + "/" + file), "file exists on disk");
        // capture the pre-restart ground truth (brute force)
        SearchResponse a = st.search(qv, 5, "brute", Metric::Cosine, {}, 0, false, &err);
        for (const auto& item : a.body.at("results").arr)
            expectedIds.push_back(item.at("id").s);
    }
    {
        VectorStore st2(Metric::Cosine, dir, file);
        std::string lerr;
        expect(st2.load(&lerr), "load after restart ok");
        expect(st2.count() == 59, "restart reload count matches (minus tombstone)");
        SearchResponse b = st2.search(qv, 5, "brute", Metric::Cosine, {}, 0, false, &err);
        bool same = expectedIds.size() == b.body.at("results").arr.size();
        for (size_t i = 0; i < expectedIds.size() && same; ++i)
            if (expectedIds[i] != b.body.at("results").arr[i].at("id").s) same = false;
        expect(same, "searches identical before/after restart");

        // rebuild (hnsw) and drop tombstones
        expect(st2.rebuild("hnsw", &err, 42), "hnsw rebuild ok");
        std::string info = st2.indexInfo().dump();
        expect(info.find("tombstones") != std::string::npos, "index info exposes tombstones");
    }
}

double recallAtK(const std::vector<std::vector<std::string>>& gt,
                 const std::vector<std::vector<std::string>>& pred, int k) {
    double sum = 0.0;
    for (size_t i = 0; i < gt.size(); ++i) {
        int c = 0;
        for (auto& id : pred[i])
            if (std::find(gt[i].begin(), gt[i].end(), id) != gt[i].end()) ++c;
        sum += (double)c / (double)k;
    }
    return gt.empty() ? 1.0 : sum / (double)gt.size();
}

// HNSW vs brute recall and kdtree exactness on the deterministic legal set.
void testIndexes() {
    std::string err;
    const int dim = 32;
    std::string dir = areaPath(Metric::Cosine) + "/idx";
    VectorStore st(Metric::Cosine, dir);
    st.setAutosave(false);

    LegalDataset ds;
    auto recs = ds.generate(600, dim, 99, &err);
    for (auto& r : recs) {
        r.id = "x" + r.id;  // keep ids predictable
        st.upsert(r, &err);
    }
    expect(st.count() == 600, "dataset loaded");

    // deterministic queries from perturbations of dataset records
    std::mt19937 rng(1234);
    std::uniform_int_distribution<size_t> pick(0, recs.size() - 1);
    const int queries = 100, k = 10;
    std::vector<std::vector<float>> qs;
    std::vector<std::vector<std::string>> truth, hnswRes;
    for (int t = 0; t < queries; ++t) {
        auto src = recs[pick(rng)].vector;
        for (float& x : src) x += (float)((double)(rng() % 2000) / 1000.0 - 1.0) * 0.05f;
        qs.push_back(src);
        SearchResponse br = st.search(src, k, "brute", Metric::Cosine, {}, 0, false, &err);
        std::vector<std::string> ids;
        for (auto& it : br.body.at("results").arr) ids.push_back(it.at("id").s);
        truth.push_back(ids);
        SearchResponse hn = st.search(src, k, "hnsw", Metric::Cosine, {}, 100, false, &err);
        std::vector<std::string> hnIds;
        for (auto& it : hn.body.at("results").arr) hnIds.push_back(it.at("id").s);
        hnswRes.push_back(hnIds);
    }
    double recHnsw = recallAtK(truth, hnswRes, k);
    std::fprintf(stderr, "  [info] hnsw recall@%d = %.4f\n", k, recHnsw);
    expect(recHnsw >= 0.95, "hnsw recall vs brute is high on seeded legal set");

    // kdtree exactness on euclidean metric
    {
        std::string dir2 = areaPath(Metric::Euclidean) + "/kd";
        VectorStore st2(Metric::Euclidean, dir2);
        st2.setAutosave(false);
        std::vector<VectorRecord> r2;
        for (int i = 0; i < 40; ++i) {
            auto v = mk(dim, 9000 + i);
            st2.upsert(rec("k" + std::to_string(i), "KD" + std::to_string(i), "c1", v), &err);
        }
        std::vector<float> q2 = mk(dim, 4321);
        SearchResponse b2 = st2.search(q2, 5, "brute", Metric::Euclidean, {}, 0, false, &err);
        SearchResponse k2 = st2.search(q2, 5, "kdtree", Metric::Euclidean, {}, 0, false, &err);
        bool same = b2.body.at("results").arr.size() == k2.body.at("results").arr.size();
        for (size_t i = 0; same && i < b2.body.at("results").arr.size(); ++i)
            if (b2.body.at("results").arr[i].at("id").s !=
                k2.body.at("results").arr[i].at("id").s)
                same = false;
        expect(same, "kdtree exact == brute on euclidean");
    }
    // kdtree rejected for cosine
    {
        std::string err2;
        SearchResponse bad = st.search(recs[0].vector, 5, "kdtree", Metric::Cosine, {}, 0,
                                       false, &err2);
        expect(!bad.ok, "kdtree rejected for cosine metric");
    }
}

// Concurrent searches + one writer must be race-free and consistent.
void testConcurrency() {
    std::string err;
    std::string dir = areaPath(Metric::Cosine) + "/conc";
    VectorStore st(Metric::Cosine, dir);
    st.setAutosave(false);
    for (int i = 0; i < 200; ++i) st.upsert(rec("c" + std::to_string(i), "D" + std::to_string(i),
                                                 "c1", mk(8, 2000 + i)),
                                            &err);
    std::atomic<bool> stop{false};
    stop.store(false);
    (void)stop;
    std::atomic<int> errors{0};
    std::vector<std::thread> threads;
    for (int t = 0; t < 6; ++t) {
        threads.emplace_back([&, t]() {
            std::mt19937 rng(3000 + t);
            for (int it = 0; it < 300; ++it) {
                std::string e;
                if (it % 3 == 0) {
                    // reader search
                    SearchResponse r = st.search(mk(8, 1000 + t * 100 + it), 5, "hnsw",
                                                 Metric::Cosine, {}, 0, false, &e);
                    if (!r.ok) { ++errors; continue; }
                    for (auto& item : r.body.at("results").arr) {
                        if (item.at("id").isNull()) ++errors;
                    }
                } else if (it % 3 == 1) {
                    // writer insert with unique id
                    st.upsert(rec("w" + std::to_string(t) + "_" + std::to_string(it),
                                  "D", "c1", mk(8, 10000 + t * 1000 + it)),
                              &e);
                } else {
                    st.remove("c" + std::to_string(it % 200), &e);
                }
            }
        });
    }
    for (auto& th : threads) th.join();
    expect(errors.load() == 0, "no errors during concurrent read/write");
    // invariants still hold
    auto recs = st.allRecords(0, 100000);
    expect(recs.size() == st.count(), "record count consistent after concurrency");
    std::string e;
    SearchResponse r = st.search(mk(8, 55), 5, "brute", Metric::Cosine, {}, 0, false, &e);
    expect(r.ok && r.body.at("results").arr.size() <= 5, "search healthy after concurrency");
}

void testDeterminism() {
    // same dataset generated twice must be byte-identical
    std::string dir = areaPath(Metric::Cosine) + "/det";
    LegalDataset ds1, ds2;
    std::string err;
    auto a = ds1.generate(100, 16, 7, &err);
    auto b = ds2.generate(100, 16, 7, &err);
    bool same = a.size() == b.size();
    for (size_t i = 0; same && i < a.size(); ++i) {
        if (a[i].id != b[i].id || a[i].metadata.at("s3_key") != b[i].metadata.at("s3_key") ||
            a[i].vector != b[i].vector)
            same = false;
    }
    expect(same, "dataset generation is deterministic for a fixed seed");

    // upsert idempotence: same (doc,chunk) never duplicates
    VectorStore st(Metric::Cosine, dir);
    st.setAutosave(false);
    InsertResult last;
    for (int i = 0; i < 3; ++i) {
        last = st.upsert(rec("d", "D1", "c1", mk(8, 5), "family_law"), &err);
        expect(st.count() == 1, "repeated re-ingest stays at one record");
    }
    expect(last.updated, "re-ingest eventually updates rather than duplicating");
}

}  // namespace

int main() {
    std::fprintf(stderr, "nyayai-vdb self tests\n");
    testJson();
    testMetric();
    testRecordsAndValidation();
    testFiltering();
    testPersistenceAndRebuild();
    testIndexes();
    testConcurrency();
    testDeterminism();
    std::fprintf(stderr, "%d checks, %d failures\n", g_checks, g_failures);
    return g_failures == 0 ? 0 : 1;
}