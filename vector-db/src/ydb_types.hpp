// NYAYAI custom C++ vector database - core shared types.
// Zero external dependencies (JSON is hand-rolled and deterministic).
#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <map>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

#ifndef YDB_VERSION
#define YDB_VERSION "0.1.0"
#endif

namespace ydb {

// ---------------------------------------------------------------------------
// Minimal deterministic JSON value (ordered object keys -> stable output).
// ---------------------------------------------------------------------------
struct Json {
    enum class Type { Null, Bool, Num, Str, Arr, Obj };

    Type type = Type::Null;

    // Null
    static Json null() {
        Json j;
        j.type = Type::Null;
        return j;
    }
    bool isNull() const { return type == Type::Null; }
    bool isObject() const { return type == Type::Obj; }
    bool isArray() const { return type == Type::Arr; }
    bool isString() const { return type == Type::Str; }
    bool isNumber() const { return type == Type::Num; }
    bool isBool() const { return type == Type::Bool; }

    // Bool
    bool b = false;
    static Json makeBool(bool v) { Json j; j.type = Type::Bool; j.b = v; return j; }

    // Number (stored as double; also parse dates/ints via string)
    double n = 0.0;
    static Json makeNum(double v) { Json j; j.type = Type::Num; j.n = v; return j; }

    // String
    std::string s;
    static Json makeStr(std::string v) { Json j; j.type = Type::Str; j.s = std::move(v); return j; }

    // Array
    std::vector<Json> arr;
    static Json makeArr() { Json j; j.type = Type::Arr; return j; }
    static Json makeArr(std::vector<Json> v) { Json j; j.type = Type::Arr; j.arr = std::move(v); return j; }

    // Object (std::map => keys iterate in sorted order => deterministic output)
    std::map<std::string, Json> obj;
    static Json makeObj() { Json j; j.type = Type::Obj; return j; }

    const Json& at(const std::string& key) const;
    Json& operator[](const std::string& key);
    std::optional<double> toDoubleOpt() const;
    std::optional<std::string> toStringOpt() const;
    std::optional<std::string> toStrOrNumOpt() const;
    std::string dump() const;
    static Json parse(const std::string& text);  // throws JsonError on malformed input
};

// Accessors with clear errors for API validation.
std::string jsonErr(const std::string& msg);

// ---------------------------------------------------------------------------
// Distance metrics. All functions return a *distance* (lower = more similar)
// so every index can sort ascending by distance uniformly.
// ---------------------------------------------------------------------------
enum class Metric { Cosine, Euclidean, Manhattan };

const char* metricName(Metric m);
bool metricFromString(const std::string& s, Metric& out);
// Semantic similarity for API responses (cosine => [-1,1]; else 0..1).
double toSimilarity(Metric m, double dist);
// Distance implied by a metric for a pair of vectors.
double metricDistance(Metric m, const std::vector<float>& a, const std::vector<float>& b);

namespace validation {
enum class Code {
    Ok,
    WrongDimension,
    ContainsNaN,
    ContainsInf,
    TooSmall,        // fewer than 1 component
    ZeroNormQuery,   // cosine query with ~zero magnitude
};
const char* codeMessage(Code c);
}

// Validates a vector against a store dimension. `queryNorm` is only relevant
// for cosine queries (zero-magnitude queries are rejected for cosine).
validation::Code validateVector(const std::vector<float>& v, int dim, Metric m, bool isQuery);

// ---------------------------------------------------------------------------
// Metadata: extensible key -> string map. Known legal keys are documented in
// README; arbitrary extra keys are preserved and filterable.
// ---------------------------------------------------------------------------
using Metadata = std::map<std::string, std::string>;

// ---------------------------------------------------------------------------
// VectorRecord: the unit of storage. Contains NO full documents - only
// references into S3 (s3_bucket/s3_key/s3_version_id live in metadata).
// ---------------------------------------------------------------------------
struct VectorRecord {
    std::string id;             // stable unique id (string; may embed doc:chunk)
    std::string document_id;    // logical source document
    std::string chunk_id;       // logical chunk within the document
    std::vector<float> vector;  // embedding (dimension validated against store)
    int dimension = 0;
    std::string text_reference; // pointer to the chunk (e.g. "s3://BUCKET/KEY#page=3")
    Metadata metadata;
    std::string created_at;
    std::string updated_at;
    std::string embedding_model;    // optional, informational only
    std::string embedding_version;  // optional, informational only

    Json toJson(const std::vector<std::string>& included_metadata_keys = {}) const;
};

// JSON string escaping used by both serializer and API.
std::string jsonEscape(const std::string& in);

// Filtering: equality/range over metadata values. Combined with AND semantics.
struct Filter {
    enum class Op { Eq, Ne, Gt, Gte, Lt, Lte };
    std::string key;
    Op op = Op::Eq;
    std::string value;

    static Filter eq(std::string k, std::string v);
    bool matches(const Metadata& md) const;
};
using Filters = std::vector<Filter>;  // AND-composed

// Parse filters from JSON object {"key": "value"} or {"key": {"gt": 5}}.
// Throws JsonError on malformed filter spec.
std::optional<Filters> parseFilters(const Json& obj, std::string& errOut);

// ---------------------------------------------------------------------------
// Index interface: pluggable semantic index (brute-force / HNSW / KD-tree).
// Indexes only store (id, vector, store_pos); filtering is handled by the
// VectorStore using the exact base Metadata map.
// ---------------------------------------------------------------------------
struct IndexHit {
    std::string id;
    double distance = 0.0;
};

struct IndexSearchResult {
    std::vector<IndexHit> hits;
    int64_t scanned = 0;
    int64_t visited = 0;  // hnsw nodes visited; == scanned for brute/kd
};

struct IndexInsertRef {
    std::string id;
    const std::vector<float>* vec = nullptr;
    size_t ord = 0;  // deterministic insertion order tie-break
};

class Index {
public:
    virtual ~Index() = default;
    virtual const char* name() const = 0;                    // "brute"|"hnsw"|"kdtree"
    virtual std::string metricName() const = 0;
    virtual int dimension() const = 0;
    virtual size_t nodeCount() const = 0;
    virtual void reserve(size_t n) = 0;                      // optional pre-alloc
    virtual void insert(const IndexInsertRef& ref) = 0;
    virtual void update(const IndexInsertRef& ref) = 0;      // same id, new vector
    virtual bool remove(const std::string& id) = 0;
    virtual void rebuild(const std::vector<IndexInsertRef>& refs,
                         uint64_t seed) = 0;
    virtual IndexSearchResult search(const std::vector<float>& q,
                                     int topK,
                                     uint64_t ef) const = 0;  // ef only meaningful for hnsw
    virtual Json config() const = 0;                          // editorial config snapshot
};

}  // namespace ydb