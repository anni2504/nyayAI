#include "vector_store.hpp"

#include <cmath>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <sys/stat.h>

namespace ydb {

namespace {

// --- little-endian binary helpers -----------------------------------------
bool mkdirs(const std::string& path) {
    std::error_code ec;
    std::filesystem::create_directories(path, ec);
    return ec ? false : true;
}

void putU8(std::ofstream& f, uint8_t v) { f.put((char)v); }
void putU16(std::ofstream& f, uint16_t v) {
    f.put((char)(v & 0xFF)); f.put((char)((v >> 8) & 0xFF));
}
void putU32(std::ofstream& f, uint32_t v) {
    f.put((char)(v & 0xFF)); f.put((char)((v >> 8) & 0xFF));
    f.put((char)((v >> 16) & 0xFF)); f.put((char)((v >> 24) & 0xFF));
}
void putU64(std::ofstream& f, uint64_t v) {
    for (int i = 0; i < 8; ++i) f.put((char)((v >> (8 * i)) & 0xFF));
}
void putStr(std::ofstream& f, const std::string& s) {
    if (s.size() > 0xFFFFFFu) throw std::runtime_error(jsonErr("persisted string too long"));
    putU32(f, (uint32_t)s.size());
    f.write(s.data(), (std::streamsize)s.size());
}
uint8_t getU8(std::ifstream& f) { return (uint8_t)f.get(); }
uint16_t getU16(std::ifstream& f) {
    int a = f.get(), b = f.get();
    if (a < 0 || b < 0) throw std::runtime_error(jsonErr("truncated vecdb (u16)"));
    return (uint16_t)(a | (b << 8));
}
uint32_t getU32(std::ifstream& f) {
    int a = f.get(), b = f.get(), c = f.get(), d = f.get();
    if (a < 0 || b < 0 || c < 0 || d < 0)
        throw std::runtime_error(jsonErr("truncated vecdb (u32)"));
    return (uint32_t)(a | ((uint32_t)b << 8) | ((uint32_t)c << 16) | ((uint32_t)d << 24));
}
uint64_t getU64(std::ifstream& f) {
    uint64_t v = 0;
    for (int i = 0; i < 8; ++i) {
        int b = f.get();
        if (b < 0) throw std::runtime_error(jsonErr("truncated vecdb (u64)"));
        v |= ((uint64_t)b) << (8 * i);
    }
    return v;
}
std::string getStr(std::ifstream& f) {
    uint32_t n = getU32(f);
    if (n > 64 * 1024 * 1024) throw std::runtime_error(jsonErr("vecdb string length absurd"));
    std::string s((size_t)n, '\0');
    f.read(s.data(), (std::streamsize)n);
    if ((size_t)f.gcount() != (size_t)n) throw std::runtime_error(jsonErr("truncated vecdb (str)"));
    return s;
}
const char magic[] = "NYAIVDB";
const uint8_t formatVersion = 1;

uint8_t metricIndex(Metric m) {
    switch (m) {
        case Metric::Cosine: return 0;
        case Metric::Euclidean: return 1;
        case Metric::Manhattan: return 2;
    }
    return 0;
}
}  // namespace

VectorStore::VectorStore(Metric metric, const std::string& dataDir,
                         const std::string& fileName)
    : metric_(metric),
      dataDir_(dataDir),
      fileName_(fileName),
      brute_(metric, dim_),
      hnsw_(metric, dim_),
      kdtree_(metric, dim_),
      active_(&hnsw_),
      activeName_("hnsw") {}

VectorStore::~VectorStore() = default;

std::string VectorStore::dataFilePath() const {
    return dataDir_ + "/" + fileName_;
}

std::string VectorStore::nowIso() {
    std::time_t t = std::time(nullptr);
    char buf[32];
    std::tm tm{};
    gmtime_r(&t, &tm);
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm);
    return buf;
}

std::string VectorStore::defaultIdFor(const VectorRecord& rec) const {
    return rec.document_id + ":" + rec.chunk_id;
}

std::string VectorStore::activeIndexName() const {
    std::shared_lock<std::shared_mutex> lk(mtx_);
    return activeName_;
}

void VectorStore::setActiveIndex(const std::string& name, std::string* errOut) {
    std::unique_lock<std::shared_mutex> lk(mtx_);
    const char* valid[] = {"brute", "hnsw", "kdtree"};
    bool ok = false;
    for (const char* v : valid)
        if (name == v) ok = true;
    if (!ok) {
        if (errOut) *errOut = jsonErr("unknown index '" + name + "'");
        return;
    }
    if (name == "kdtree" && metric_ != Metric::Euclidean && metric_ != Metric::Manhattan) {
        if (errOut) *errOut = jsonErr("kdtree index only supports euclidean/manhattan metrics");
        return;
    }
    if (name == "brute") active_ = &brute_;
    else if (name == "hnsw") active_ = &hnsw_;
    else active_ = &kdtree_;
    activeName_ = name;
    if (errOut) *errOut = "";
}

void VectorStore::setHnswEfSearch(int ef) {
    std::unique_lock<std::shared_mutex> lk(mtx_);
    hnsw_.setEfSearch(ef);
}

bool VectorStore::applyRecord(const VectorRecord& rec) {
    auto it = records_.find(rec.id);
    IndexInsertRef ref{rec.id, &rec.vector, 0};
    if (it == records_.end()) {
        ref.ord = (size_t)std::distance(records_.begin(), records_.lower_bound(rec.id));
        brute_.insert(ref);
        hnsw_.insert(ref);
        kdtree_.insert(ref);
        records_.emplace(rec.id, rec);
    } else {
        it->second = rec;
        ref.ord = (size_t)std::distance(records_.begin(), it);
        brute_.update(ref);
        hnsw_.update(ref);
        kdtree_.update(ref);
    }
    compositeIndex_[{rec.document_id, rec.chunk_id}] = rec.id;
    return true;
}

InsertResult VectorStore::upsert(const VectorRecord& rec, std::string* errOut) {
    std::vector<float> v = rec.vector;
    validation::Code vc =
        validateVector(v, dim_, metric_, false);
    if (vc != validation::Code::Ok) {
        if (errOut) *errOut = jsonErr(validation::codeMessage(vc));
        return {};
    }
    if (dim_ == 0 && !v.empty()) dim_ = (int)v.size();
    if (v.size() != (size_t)dim_) {
        if (errOut) *errOut = jsonErr(validation::codeMessage(validation::Code::WrongDimension));
        return {};
    }

    InsertResult res;
    {
        std::unique_lock<std::shared_mutex> lk(mtx_);
        VectorRecord rec2 = rec;

        // Deterministic id resolution with composite-key upsert identity.
        std::string effId = rec2.id.empty() ? defaultIdFor(rec2) : rec2.id;
        auto idIt = records_.find(effId);
        auto compIt = compositeIndex_.find({rec2.document_id, rec2.chunk_id});
        if (idIt != records_.end()) {
            rec2.id = effId;
            rec2.created_at = idIt->second.created_at;
            rec2.updated_at = nowIso();
            res.updated = true;
        } else if (compIt != compositeIndex_.end() && compIt->second != effId) {
            // Same logical chunk re-ingested under a different id: preserve the
            // original identity, refresh content.
            rec2.id = compIt->second;
            auto old = records_.find(rec2.id);
            if (old != records_.end()) rec2.created_at = old->second.created_at;
            rec2.updated_at = nowIso();
            res.updated = true;
        } else {
            rec2.id = effId;
            rec2.created_at = rec2.created_at.empty() ? nowIso() : rec2.created_at;
            rec2.updated_at = rec2.updated_at.empty() ? nowIso() : rec2.updated_at;
            res.created = true;
        }
        rec2.dimension = dim_;
        applyRecord(rec2);
        res.id = rec2.id;
    }

    if (autosave_) {
        std::string saveErr;
        if (!save(&saveErr)) {
            if (errOut) *errOut = jsonErr("record stored but persistence failed: " + saveErr);
        }
    }
    return res;
}

void VectorStore::removeFromIndexes(const std::string& id) {
    brute_.remove(id);
    hnsw_.remove(id);
    kdtree_.remove(id);
}

bool VectorStore::remove(const std::string& id, std::string* errOut) {
    {
        std::unique_lock<std::shared_mutex> lk(mtx_);
        auto it = records_.find(id);
        if (it == records_.end()) {
            if (errOut) *errOut = jsonErr("record not found");
            return false;
        }
        compositeIndex_.erase({it->second.document_id, it->second.chunk_id});
        removeFromIndexes(id);
        records_.erase(it);
    }
    if (autosave_) {
        std::string saveErr;
        if (!save(&saveErr)) {
            if (errOut) *errOut = jsonErr("record deleted but persistence failed: " + saveErr);
        }
    }
    return true;
}

bool VectorStore::get(const std::string& id, VectorRecord* out, std::string* errOut) const {
    std::shared_lock<std::shared_mutex> lk(mtx_);
    auto it = records_.find(id);
    if (it == records_.end()) {
        if (errOut) *errOut = jsonErr("record not found");
        return false;
    }
    if (out) *out = it->second;
    return true;
}

size_t VectorStore::count() const {
    std::shared_lock<std::shared_mutex> lk(mtx_);
    return records_.size();
}

bool VectorStore::clearAll(std::string* errOut) {
    {
        std::unique_lock<std::shared_mutex> lk(mtx_);
        records_.clear();
        compositeIndex_.clear();
        std::vector<IndexInsertRef> empty;
        brute_.rebuild(empty, 42);
        hnsw_.rebuild(empty, 42);
        kdtree_.rebuild(empty, 42);
    }
    if (autosave_) {
        std::string saveErr;
        if (!save(&saveErr)) {
            if (errOut) *errOut = jsonErr("store cleared but persistence failed: " + saveErr);
            return false;
        }
    }
    return true;
}

std::vector<IndexInsertRef> VectorStore::refsLocked() const {
    std::vector<IndexInsertRef> refs;
    refs.reserve(records_.size());
    size_t ord = 0;
    for (const auto& kv : records_)
        refs.push_back(IndexInsertRef{kv.first, &kv.second.vector, ord++});
    return refs;
}

std::vector<IndexInsertRef> VectorStore::recordRefs() const {
    std::shared_lock<std::shared_mutex> lk(mtx_);
    return refsLocked();
}

std::vector<VectorRecord> VectorStore::allRecords(size_t offset, size_t limit) const {
    std::shared_lock<std::shared_mutex> lk(mtx_);
    std::vector<VectorRecord> out;
    size_t i = 0;
    for (const auto& kv : records_) {
        if (i++ < offset) continue;
        out.push_back(kv.second);
        if (out.size() >= limit) break;
    }
    return out;
}

// --- persistence -----------------------------------------------------------

bool VectorStore::save(std::string* errOut) {
    std::shared_lock<std::shared_mutex> lk(mtx_);
    if (!mkdirs(dataDir_)) {
        if (errOut) *errOut = jsonErr("cannot create data dir: " + dataDir_);
        return false;
    }
    const std::string tmpPath = dataFilePath() + ".tmp";
    {
        std::ofstream f(tmpPath, std::ios::binary | std::ios::trunc);
        if (!f) {
            if (errOut) *errOut = jsonErr("cannot open temporary file: " + tmpPath);
            return false;
        }
        try {
            f.write(magic, (std::streamsize)sizeof(magic) - 1);
            putU8(f, formatVersion);
            putU8(f, metricIndex(metric_));
            putU16(f, (uint16_t)dim_);
            putU64(f, (uint64_t)records_.size());
            for (const auto& kv : records_) {
                const VectorRecord& r = kv.second;
                putStr(f, r.id);
                putStr(f, r.document_id);
                putStr(f, r.chunk_id);
                putU32(f, (uint32_t)r.vector.size());
                for (float x : r.vector) {
                    uint32_t bits;
                    std::memcpy(&bits, &x, 4);
                    putU32(f, bits);
                }
                putStr(f, r.text_reference);
                putU64(f, (uint64_t)r.metadata.size());
                for (const auto& m : r.metadata) {
                    putStr(f, m.first);
                    putStr(f, m.second);
                }
                putStr(f, r.created_at);
                putStr(f, r.updated_at);
                putStr(f, r.embedding_model);
                putStr(f, r.embedding_version);
            }
        } catch (const std::exception& e) {
            if (errOut) *errOut = jsonErr(e.what());
            f.close();
            std::remove(tmpPath.c_str());
            return false;
        }
        f.close();
    }
    if (std::rename(tmpPath.c_str(), dataFilePath().c_str()) != 0) {
        if (errOut) *errOut = jsonErr("cannot atomically rename persistence file");
        return false;
    }
    lastSaveAt_ = nowIso();
    return true;
}

bool VectorStore::load(std::string* errOut) {
    std::unique_lock<std::shared_mutex> lk(mtx_);
    std::ifstream f(dataFilePath(), std::ios::binary);
    if (!f) {
        // Fresh database: nothing to load.
        if (errOut) *errOut = "";
        return true;
    }
    try {
        char m[8];
        f.read(m, (std::streamsize)sizeof(magic) - 1);
        if (f.gcount() != (std::streamsize)sizeof(magic) - 1 ||
            std::memcmp(m, magic, sizeof(magic) - 1) != 0)
            throw std::runtime_error(jsonErr("bad vecdb magic"));
        uint8_t ver = getU8(f);
        if (ver != formatVersion)
            throw std::runtime_error(jsonErr("unsupported vecdb version"));
        uint8_t mi = getU8(f);
        if (mi != metricIndex(metric_))
            throw std::runtime_error(jsonErr("vecdb metric mismatch"));
        dim_ = (int)getU16(f);
        uint64_t count = getU64(f);
        if (count > 100 * 1000 * 1000) throw std::runtime_error(jsonErr("vecdb count absurd"));

        records_.clear();
        compositeIndex_.clear();
        for (uint64_t i = 0; i < count; ++i) {
            VectorRecord r;
            r.id = getStr(f);
            r.document_id = getStr(f);
            r.chunk_id = getStr(f);
            uint32_t vn = getU32(f);
            if (vn > 1u << 24) throw std::runtime_error(jsonErr("vecdb vector length absurd"));
            r.vector.resize(vn);
            for (uint32_t j = 0; j < vn; ++j) {
                uint32_t bits = getU32(f);
                float x;
                std::memcpy(&x, &bits, 4);
                if (std::isnan(x) || std::isinf(x))
                    throw std::runtime_error(jsonErr("vecdb contains non-finite float"));
                r.vector[j] = x;
            }
            if ((int)vn != dim_)
                throw std::runtime_error(jsonErr("vecdb dimension mismatch inside file"));
            r.dimension = dim_;
            r.text_reference = getStr(f);
            uint64_t mn = getU64(f);
            for (uint64_t j = 0; j < mn; ++j) {
                std::string k = getStr(f);
                std::string v = getStr(f);
                r.metadata[k] = v;
            }
            r.created_at = getStr(f);
            r.updated_at = getStr(f);
            r.embedding_model = getStr(f);
            r.embedding_version = getStr(f);
            records_[r.id] = r;
            compositeIndex_[{r.document_id, r.chunk_id}] = r.id;
        }
    } catch (const std::exception& e) {
        records_.clear();
        compositeIndex_.clear();
        dim_ = 0;
        if (errOut) *errOut = jsonErr(std::string("persistence load failed: ") + e.what());
        return false;
    }

    // Rebuild indexes from the reloaded canonical records.
    brute_.rebuild(refsLocked(), 42);
    hnsw_.rebuild(refsLocked(), 42);
    kdtree_.rebuild(refsLocked(), 42);
    lastSaveAt_ = nowIso();
    return true;
}

// --- search ----------------------------------------------------------------

SearchResponse VectorStore::search(const std::vector<float>& query, int topK,
                                   const std::string& indexName, Metric metric,
                                   const Filters& filters, int ef,
                                   bool includeVector, std::string* errOut) {
    SearchResponse resp;
    if (metric != metric_) {
        resp.error = jsonErr("store is built with metric '" + std::string(metricName(metric_)) +
                             "'; requested '" + std::string(metricName(metric)) + "'");
        if (errOut) *errOut = resp.error;
        return resp;
    }
    validation::Code vc = validateVector(query, dim_, metric_, true);
    if (vc != validation::Code::Ok) {
        resp.error = jsonErr(validation::codeMessage(vc));
        if (errOut) *errOut = resp.error;
        return resp;
    }
    if (topK <= 0) topK = 10;
    if (topK > 1000) topK = 1000;

    std::string idx = indexName.empty() ? activeIndexName() : indexName;
    if (idx == "kdtree" && metric_ != Metric::Euclidean && metric_ != Metric::Manhattan) {
        resp.error = jsonErr("kdtree index only supports euclidean/manhattan metrics");
        if (errOut) *errOut = resp.error;
        return resp;
    }

    const auto t0 = std::chrono::steady_clock::now();
    std::shared_lock<std::shared_mutex> lk(mtx_);

    Index* index = nullptr;
    if (idx == "brute") index = &brute_;
    else if (idx == "hnsw") index = &hnsw_;
    else index = &kdtree_;

    bool exact = true;      // brute/kd are exact; hnsw is approximate
    bool fallback = false;  // filtered search fell back to an exact scan
    int64_t scanned = 0;
    int64_t visited = 0;
    std::vector<IndexHit> hits;

    if (filters.empty()) {
        IndexSearchResult r = index->search(query, topK,
                                            (uint64_t)(ef > 0 ? ef : 0));
        hits = r.hits;
        scanned = r.scanned;
        visited = r.visited;
        exact = (idx != "hnsw");
    } else {
        // Filtered search: index to candidates, filter semantically, fall back
        // to an exact filtered scan if the filtered candidate set is too small.
        const size_t n = records_.size();
        int candLimit = (int)std::min<size_t>(std::max<size_t>(topK * 16, 256), n + 1);
        if (candLimit <= 0) candLimit = (int)n;
        IndexSearchResult r = index->search(query, candLimit,
                                            (uint64_t)(ef > 0 ? ef : 0));
        scanned = r.scanned;
        visited = r.visited;
        exact = (idx != "hnsw");
        for (const auto& hit : r.hits) {
            auto it = records_.find(hit.id);
            if (it == records_.end()) continue;  // tombstoned in index
            bool keep = true;
            for (const auto& flt : filters)
                if (!flt.matches(it->second.metadata)) { keep = false; break; }
            if (keep) {
                hits.push_back(hit);
                if ((int)hits.size() >= topK) break;
            }
        }
        if ((int)hits.size() < topK) {
            // Exact fallback scan (respect ignores candidate limit entirely).
            struct Cand { double d; std::string id; };
            std::vector<Cand> best;
            best.reserve(std::min<size_t>((size_t)topK, n));
            for (const auto& kv : records_) {
                const VectorRecord& rr = kv.second;
                bool keep = true;
                for (const auto& flt : filters)
                    if (!flt.matches(rr.metadata)) { keep = false; break; }
                if (!keep) continue;
                double d = metricDistance(metric_, query, rr.vector);
                best.push_back(Cand{d, rr.id});
            }
            std::stable_sort(best.begin(), best.end(),
                             [](const Cand& a, const Cand& b) {
                                 if (a.d != b.d) return a.d < b.d;
                                 return a.id < b.id;
                             });
            std::vector<IndexHit> exactHits;
            for (size_t i = 0; i < best.size() && (int)exactHits.size() < topK; ++i)
                exactHits.push_back(IndexHit{best[i].id, best[i].d});
            // Merge: if we already had some hits from the index, prefer the
            // exact result set entirely (authoritative when fallback occurred).
            hits = exactHits;
            fallback = true;
            exact = true;
            scanned += (int64_t)n;
        }
    }

    const double elapsedMs = std::chrono::duration<double, std::milli>(
                                 std::chrono::steady_clock::now() - t0)
                                 .count();

    Json out = Json::makeObj();
    out["status"] = Json::makeStr("ok");
    out["store"] = Json::makeStr("nyayai-vdb");
    out["metric"] = Json::makeStr(metricName(metric_));
    out["index"] = Json::makeStr(idx);
    out["exact"] = Json::makeBool(exact);
    out["filtered"] = Json::makeBool(!filters.empty());
    out["fallback_exact_scan"] = Json::makeBool(fallback);
    out["top_k"] = Json::makeNum(topK);
    out["returned"] = Json::makeNum((double)hits.size());
    out["total_vectors"] = Json::makeNum((double)records_.size());
    out["query_dimension"] = Json::makeNum((double)query.size());
    out["scanned"] = Json::makeNum((double)scanned);
    out["visited"] = Json::makeNum((double)visited);
    out["elapsed_ms"] = Json::makeNum(elapsedMs);

    Json arr = Json::makeArr();
    for (const auto& hit : hits) {
        auto it = records_.find(hit.id);
        if (it == records_.end()) continue;
        const VectorRecord& rr = it->second;
        Json entry = Json::makeObj();
        entry["id"] = Json::makeStr(rr.id);
        entry["document_id"] = Json::makeStr(rr.document_id);
        entry["chunk_id"] = Json::makeStr(rr.chunk_id);
        entry["distance"] = Json::makeNum(hit.distance);
        entry["similarity"] = Json::makeNum(toSimilarity(metric_, hit.distance));
        entry["text_reference"] = Json::makeStr(rr.text_reference);
        Json md = Json::makeObj();
        for (const auto& kv : rr.metadata) md[kv.first] = Json::makeStr(kv.second);
        entry["metadata"] = std::move(md);
        // Convenience provenance projection for Phase 9 source citation.
        Json src = Json::makeObj();
        auto getm = [&](const char* k) -> std::string {
            auto it2 = rr.metadata.find(k);
            return it2 == rr.metadata.end() ? "" : it2->second;
        };
        src["s3_bucket"] = Json::makeStr(getm("s3_bucket"));
        src["s3_key"] = Json::makeStr(getm("s3_key"));
        src["s3_version_id"] = Json::makeStr(getm("s3_version_id"));
        entry["source"] = std::move(src);
        if (includeVector) {
            Json vec = Json::makeArr();
            for (float x : rr.vector) vec.arr.push_back(Json::makeNum(x));
            entry["vector"] = std::move(vec);
        }
        arr.arr.push_back(std::move(entry));
    }
    out["results"] = std::move(arr);
    resp.body = std::move(out);
    resp.ok = true;
    return resp;
}

// --- index management & observability --------------------------------------

bool VectorStore::rebuild(const std::string& indexName, std::string* errOut, uint64_t seed) {
    std::unique_lock<std::shared_mutex> lk(mtx_);
    std::vector<IndexInsertRef> refs = refsLocked();
    std::vector<IndexInsertRef> refs2 = refs;
    if (indexName.empty() || indexName == "all") {
        brute_.rebuild(refs2, seed);
        hnsw_.rebuild(refs2, seed);
        kdtree_.rebuild(refs2, seed);
    } else if (indexName == "brute") {
        brute_.rebuild(refs2, seed);
    } else if (indexName == "hnsw") {
        hnsw_.rebuild(refs2, seed);
    } else if (indexName == "kdtree") {
        kdtree_.rebuild(refs2, seed);
    } else {
        if (errOut) *errOut = jsonErr("unknown index '" + indexName + "'");
        return false;
    }
    lastRebuildAt_ = nowIso();
    ++rebuildCount_;
    (void)refs;
    return true;
}

Json VectorStore::indexInfo() const {
    std::shared_lock<std::shared_mutex> lk(mtx_);
    Json o = Json::makeObj();
    o["active"] = Json::makeStr(activeName_);
    o["brute"] = brute_.config();
    o["hnsw"] = hnsw_.config();
    o["kdtree"] = kdtree_.config();
    o["metric"] = Json::makeStr(metricName(metric_));
    o["dimension"] = Json::makeNum(dim_);
    return o;
}

Json VectorStore::stats() const {
    std::shared_lock<std::shared_mutex> lk(mtx_);
    Json o = Json::makeObj();
    o["status"] = Json::makeStr("ok");
    o["version"] = Json::makeStr(YDB_VERSION);
    double uptime = std::chrono::duration<double>(
                        std::chrono::steady_clock::now() - startedAt_)
                        .count();
    o["uptime_s"] = Json::makeNum(uptime);

    int64_t docs = 0, chunkCount = 0;
    std::map<std::string, int> dcmap;
    std::map<std::pair<std::string, std::string>, int> uniq;
    for (const auto& kv : records_) {
        dcmap[kv.second.document_id]++;
        uniq[{kv.second.document_id, kv.second.chunk_id}]++;
    }
    docs = (int64_t)dcmap.size();
    chunkCount = (int64_t)uniq.size();
    o["vector_count"] = Json::makeNum((double)records_.size());
    o["document_count"] = Json::makeNum((double)docs);
    o["chunk_count"] = Json::makeNum((double)chunkCount);
    o["dimension"] = Json::makeNum(dim_);
    o["metric"] = Json::makeStr(metricName(metric_));
    o["index"] = Json::makeStr(activeName_);
    o["index_platform"] = Json::makeStr("custom-cpp");

    Json idx = Json::makeObj();
    idx["active"] = Json::makeStr(activeName_);
    idx["brute"] = brute_.config();
    idx["hnsw"] = hnsw_.config();
    idx["kdtree"] = kdtree_.config();
    o["indexes"] = std::move(idx);

    Json p = Json::makeObj();
    p["persistent"] = Json::makeBool(true);
    p["file"] = Json::makeStr(dataFilePath());
    p["last_saved_at"] = Json::makeStr(lastSaveAt_);
    p["last_rebuild_at"] = Json::makeStr(lastRebuildAt_);
    p["rebuild_count"] = Json::makeNum((double)rebuildCount_);
    o["persistence"] = std::move(p);
    return o;
}

}  // namespace ydb