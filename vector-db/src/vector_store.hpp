// VectorStore: the node of record. Owns the canonical metadata map (the only
// place full record truth lives; indexes hold id+vector only), the pluggable
// index set (brute/hnsw/kdtree), metadata filtering, deterministic
// document+chunk identity (upsert, no duplicate logical chunks), reader/writer
// concurrency and binary persistence with atomic save + startup recovery.
#pragma once

#include <atomic>
#include <chrono>
#include <map>
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <string>

#include "brute_force.hpp"
#include "hnsw.hpp"
#include "kd_tree.hpp"
#include "ydb_types.hpp"

namespace ydb {

struct InsertResult {
    bool created = false;
    bool updated = false;
    std::string id;
};

struct SearchResponse {
    Json body;
    bool ok = false;
    std::string error;
};

class VectorStore {
public:
    VectorStore(Metric metric, const std::string& dataDir,
                const std::string& fileName = "vectors.vdb");
    ~VectorStore();

    // --- lifecycle / persistence -----------------------------------------
    bool load(std::string* errOut);          // startup: load records, rebuild indexes
    bool save(std::string* errOut);          // atomic snapshot of records
    void setAutosave(bool on) { autosave_ = on; }
    std::string dataFilePath() const;
    std::string dataDir() const { return dataDir_; }

    // --- records ----------------------------------------------------------
    InsertResult upsert(const VectorRecord& rec,
                        std::string* errOut);      // validated, dedup'd, indexed
    bool remove(const std::string& id, std::string* errOut);
    bool get(const std::string& id, VectorRecord* out, std::string* errOut) const;
    size_t count() const;
    // Drops every record and rebuilds all indexes empty (used by dataset
    // loaders with {"clear":true}).
    bool clearAll(std::string* errOut);

    // --- query ------------------------------------------------------------
    // Runs similarity search with optional metadata filters and index choice.
    SearchResponse search(const std::vector<float>& query, int topK,
                          const std::string& indexName, Metric metric,
                          const Filters& filters, int ef, bool includeVector,
                          std::string* errOut);

    // --- index management -------------------------------------------------
    bool rebuild(const std::string& indexName, std::string* errOut, uint64_t seed);
    Json indexInfo() const;
    Json stats() const;

    // --- accessors (thread-safe snapshots) --------------------------------
    Metric metric() const { return metric_; }
    int dimension() const { return dim_; }
    std::string activeIndexName() const;
    void setActiveIndex(const std::string& name, std::string* errOut);
    void setHnswEfSearch(int ef);

    // All records as refs for benchmark/index rebuild (ordered snapshot).
    std::vector<IndexInsertRef> recordRefs() const;
    std::vector<VectorRecord> allRecords(size_t offset, size_t limit) const;

private:
    Metric metric_;
    int dim_ = 0;
    std::string dataDir_;
    std::string fileName_;
    bool autosave_ = true;

    // Canonical store of record truth, ordered by id for deterministic
    // rebuild/persistence iteration.
    std::map<std::string, VectorRecord> records_;
    // Composite (document_id, chunk_id) -> record id (upsert identity).
    std::map<std::pair<std::string, std::string>, std::string> compositeIndex_;

    BruteForceIndex brute_;
    HnswIndex hnsw_;
    KdTreeIndex kdtree_;
    Index* active_;            // guarded by mutex_; points to one of the three
    std::string activeName_;

    mutable std::shared_mutex mtx_;

    std::chrono::steady_clock::time_point startedAt_ = std::chrono::steady_clock::now();
    std::string lastSaveAt_;
    std::string lastRebuildAt_;
    int64_t rebuildCount_ = 0;

    bool applyRecord(const VectorRecord& rec);          // no lock; validates+indexes
    void removeFromIndexes(const std::string& id);      // no lock
    std::vector<IndexInsertRef> refsLocked() const;     // assumes shared/unique lock
    static std::string nowIso();
    std::string defaultIdFor(const VectorRecord& rec) const;
};

}  // namespace ydb