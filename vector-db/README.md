# nyayai-vdb — custom C++ vector database (Phase 8)

A production-shaped, dependency-light vector database for NYAYAI's future
semantic search over legal documents. Built in C++17 with a hand-rolled
deterministic JSON layer; the only vendored dependency is **cpp-httplib**
(`third_party/httplib.h`) reused from the `Your-OWN-AI-main` ZIP reference —
everything else is written fresh and self-contained.

```
vector-db/
├── Makefile                 (make all|test|api|bench|bench-run|clean)
├── src/
│   ├── ydb_types.{hpp,cpp}  JSON, metrics, VectorRecord, metadata, filters, Index iface
│   ├── brute_force.{hpp,cpp} exact linear-scan index (ground truth)
│   ├── hnsw.{hpp,cpp}       HNSW graph index (insert/search/tombstones/rebuild)
│   ├── kd_tree.{hpp,cpp}    KD-tree index (exact, euclidean/manhattan only)
│   ├── vector_store.{hpp,cpp} node of record: dedupe identity, filters,
│   │                         concurrency, binary persistence, rebuild, stats
│   ├── legal_dataset.{hpp,cpp} deterministic 6-area synthetic legal corpus
│   ├── benchmark.{hpp,cpp}  real benchmark harness (recall@K vs brute force)
│   ├── bench_main.cpp       CLI: vector-db-bench [count dim queries top_k ef metric seed kdtree]
│   ├── embed_provider.{hpp,cpp} optional Ollama embedding provider (off by default)
│   └── httpd.cpp            HTTP API server (vector-db-server)
├── tests/
│   ├── self_test.cpp        in-process deterministic suite (make test)
│   └── api_test.sh          HTTP integration suite (make api)
└── third_party/httplib.h    vendored cpp-httplib (single header)
```

Build: `make all`  →  `build/vector-db-server` and `build/vector-db-tests`.
Run:   `make test` and `make api` verify the whole component with no external
services (no Groq, no Ollama, no network).

---

## 1. Architecture & the boundary it owns

NYAYAI's data planes:

| Plane              | System            | Owns                                    |
|--------------------|-------------------|-----------------------------------------|
| transactional/app  | PostgreSQL (Neon) | users, advocates, bookings, matters      |
| raw legal corpus   | S3                | canonical PDF/AW documents (full text)   |
| **vectors/search** | **nyayai-vdb**    | embeddings, similarity, metadata filters |
| reasoning/RAG      | Groq (later)      | LLM answers (Phase 9)                    |

nyayai-vdb **never stores full documents**. A `VectorRecord` holds an embedding
plus *references*: `text_reference` and the metadata keys `s3_bucket`,
`s3_key`, `s3_version_id`, `title`, `court`, `year`, `section`, `act`,
`page`, `paragraph`. This is the exact provenance Phase 9 needs to cite a
source without the DB holding source bytes.

## 2. Data model

```cpp
struct VectorRecord {
    std::string id;               // stable, unique (default "document_id:chunk_id")
    std::string document_id;
    std::string chunk_id;
    std::vector<float> vector;    // embedding (dimension validated)
    int dimension;
    std::string text_reference;   // e.g. s3://nyayai-legal-corpus/.../x.pdf#page=3
    Metadata metadata;            // extensible key -> string map
    std::string created_at, updated_at;
    std::string embedding_model, embedding_version;  // informational only
};
```

Metadata is an **extensible string map** so new facets never require a schema
migration. Any scalar JSON (string/number/bool) is accepted. Documented keys
today: `country, court, jurisdiction, document_type, case_id, advocate_id,
advocate_name, practice_area, year, source, title, act, section, page,
paragraph, s3_bucket, s3_key, s3_version_id`.

### Identity & idempotence
- A record's identity is `id`; re-`insert`ing the same `id` updates in place.
- `(document_id, chunk_id)` is a **composite upsert key**: re-ingesting the same
  logical chunk under a *different* id updates the original record and keeps
  the original id — duplicate logical chunks are impossible by construction.
- `document_id+chunk_id` is the default `id`, so ids are deterministic.

### Validation (never silently accepts bad vectors)
- dimension must equal the store dimension (fixed by the first insert),
- vectors must be non-empty, finite (no NaN / Inf),
- cosine **query** vectors must be non-zero-magnitude (cosine is undefined
  otherwise); a stored zero vector is allowed and scores max distance,
- persistence load re-validates every vector and refuses corrupt files.

## 3. Metrics
- **cosine** (default, primary): `distance = 1 − cos(a,b)`, exposed
  `similarity = cos ∈ [−1,1]`.
- **euclidean (L2)** and **manhattan (L1)**: `similarity = 1/(1+dist) ∈ (0,1]`.
- All indexes sort ascending by distance, which is monotonic with similarity.

## 4. Indexes (pluggable `Index` interface)

### BruteForceIndex (`brute`) — exact ground truth
Linear scan + `nth_element`, stable tie-breaking by insertion order. Used as
the reference for recall measurement and filtered-search fallback.

### HnswIndex (`hnsw`) — default
Real HNSW (Malkov & Yashunin): multilayer graph, exponential level assignment
(`mL = 1/ln M`), beam search with query-distance candidate ordering, diversity
heuristic neighbor selection, bidirectional links bounded to `M` (base `M0`),
lazy-deletion **tombstones**, deterministic seeded RNG.
- Config: `M=16, M0=32, ef_construction=200, ef_search=100, seed, cap`.
- `rebuild(refs, seed)` reconstructs the graph purely from stored records, so
  recovery never needs the graph persisted — only the vectors.
- Filters on approximate search are candidate-then-filter; if fewer than `topK`
  survive, the store **falls back to an exact filtered scan** and marks
  `fallback_exact_scan: true` (correctness is never silently approximated).

### KdTreeIndex (`kdtree`) — educational/exact
Balanced median-split tree, lazily rebuilt on mutation, ball-within-slab
pruning with a bounded top-K heap (exact for L1/L2). Rejected for cosine
(cosine is not axis-aligned; the store answers an explicit error).

## 5. Persistence & recovery
- Binary little-endian snapshot: magic `NYAIVDB`, version, metric, dimension,
  then length-prefixed records (metadata preserved losslessly).
- Atomic save: write `<store>.vdb.tmp` then `rename(2)` — a crash never leaves
  a half-written store.
- Startup `load()`: parse → re-validate every vector → rebuild all three
  indexes from the canonical records (deterministic, seeded). If the file is
  missing the store starts empty; corrupt files are refused, not truncated.
- Auto-save after every mutation by default (`VECTORDB_AUTOSAVE=0` to disable).

## 6. Concurrency
One `std::shared_mutex` guards the store:
- **readers** (search, items, stats, index info) take a shared lock and run
  concurrently;
- **writers** (insert/update/delete/rebuild/clear) take an exclusive lock;
- persistence snapshots under a shared lock (no mutation during write-out).
Multi-threaded reads during concurrent writes are exercised by
`testConcurrency` (6 writer threads × 300 ops + concurrent searches).

## 7. Embedding provider (optional, decoupled)
`EmbeddingProvider` abstraction: the DB is fully usable with raw vectors over
the API and requires **no embedding service**. An optional Ollama provider
(`VECTORDB_OLLAMA_URL`, model default `nomic-embed-text`) can embed `text`
payloads on insert/search for dev/testing. It is only constructed when the env
var is set; it is never required, and no tests depend on it (or on Groq).

## 8. HTTP API (`vector-db-server`)
`VECTORDB_PORT` (5400), `VECTORDB_DATA_DIR` (./data), `VECTORDB_FILE`,
`VECTORDB_METRIC` (cosine|euclidean|manhattan), `VECTORDB_AUTOSAVE` (1).

| Endpoint            | Purpose                                                      |
|---------------------|--------------------------------------------------------------|
| `GET /health`       | liveness + version + counts + uptime                         |
| `GET /stats`        | counts, dimension, metric, per-index config, persistence     |
| `POST /insert`      | upsert (dedupe identity), validated, indexed, persisted      |
| `POST /search`      | similarity + filters + index choice + `ef`; provenance in results |
| `DELETE /delete/:id`| remove record from every index + persistence                 |
| `GET /items`        | paged records (`offset`,`limit`,`include_vector`)            |
| `POST /index/rebuild` | rebuild `brute`/`hnsw`/`kdtree`/`all` from stored records   |
| `GET /index/info`   | per-index configuration, node counts, tombstones, max level  |
| `POST /benchmark`   | real measured benchmark (see §9)                             |
| `POST /dataset/legal` | load deterministic synthetic legal corpus (`{"clear":true}`) |

All responses are structured JSON. Errors return
`{"status":"error","error":...}` with the right status code. Search results
include `id, document_id, chunk_id, similarity, distance, text_reference,
metadata`, and a `source` projection (`s3_bucket, s3_key, s3_version_id`).

## 9. Benchmarks (real, reproducible, Phase 9/10 reusable)
`POST /benchmark` and the `vector-db-bench` CLI use a **deterministic seeded
legal dataset** (6 practice areas: criminal, constitutional, property,
contract, family, corporate law) and measure with wall-clock time:

- latency **avg / p95 / max / min** and **QPS** for brute-force and HNSW,
- **recall@K vs brute-force ground truth** (exact top-K ids),
- scanned/visited counts, index config, dataset size, dim, `topK`, `ef`,
- everything reusable by Phase 10's evaluation; nothing is fabricated.

Representative measured run (macOS, clang 21, release build):

```
dataset: 50,000 vectors x 64 dims, cosine, seed 42; queries=200, top_k=10, ef=100
  brute      avg 2.976 ms   p95 3.141 ms   QPS 336     scanned 50,000/query
  hnsw       avg 0.451 ms   p95 0.546 ms   QPS 2,216   visited ~100/query
  hnsw recall@10 = 0.9925   speedup = 6.6x vs brute    build: 59.8 s
```

Run it yourself: `make bench-run` (2000 vectors) or
`./build/vector-db-bench 50000 64 200 10 100 cosine 42 0`.

### Why HNSW?
Legal repositories are write-slow, read-many, high-dimensional, and allow
approximate recall (none of the six practice areas need exact top-1). HNSW
gives orders-of-magnitude pairwise-distance reduction as N grows (6.6× at 50K
with a tiny `ef`, ~100 nodes visited vs 50,000 scanned) with tunable
recall/latency via `ef`. Brute force stays as ground truth and as the
filtered-search fallback so correctness is never sacrificed for speed.

## 10. Security
- No credentials anywhere: no AWS/Groq/DB keys in source, `.env` files are
  git-ignored, no secrets in `/health` or `/stats`.
- No arbitrary filesystem access: the data path comes only from
  `VECTORDB_DATA_DIR`; user input never selects a file path.
- Inputs are validated (JSON shape, vector math, filters, bounds) before any
  mutation or search; malformed requests get clean 400s.
- Server binds `127.0.0.1` by default.

## 11. Testing
- `make test` → `vector-db-tests`: 62 deterministic checks across JSON,
  metrics, validation, upsert identity/dedupe, deletion, filtering (+range),
  combined semantic+metadata search, top-K, empty-DB, persistence +
  restart/reload equality, index rebuild + tombstone drop, HNSW recall vs brute
  (0.95 threshold), KD-tree exactness, concurrent reads/writes, determinism.
- `make api` → `api_test.sh`: spawns the server, 40 HTTP assertions (health,
  stats, insert/search/delete/items/rebuild/index-info/benchmark/dataset,
  validation failures, malformed JSON, 404s, **restart persistence**).
- No test touches Groq or Ollama; all seeds are fixed, all stores are temp dirs.

## 12. Reuse from the ZIP reference (`Your-OWN-AI-main.zip`)
- `httplib.h` vendored as-is (cpp-httplib).
- Cosine / euclidean / manhattan distance formulas and the HNSW construction
  shape (level scaling, beam search, bidirectional pruning).
Redesigned/hardened: record model + rich metadata + stable identity and
dedupe, strict vector validation, `Index` pluggability (brute + HNSW +
KD-tree), metadata filtering with exact-fallback, binary persistence with
atomic writes + recovery, rebuild-on-load, reader/writer concurrency, real
benchmark harness, deterministic legal dataset, and the full deterministic
test suites.