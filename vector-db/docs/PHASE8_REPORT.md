# Phase 8 — NYAYAI Custom C++ Vector Database — Final Report

Date: 2026-09-07  ·  Component: `vector-db/` (isolated, C++17, zero runtime
dependencies beyond vendored cpp-httplib)  ·  Git: Pushed to `main`.

Reference ZIP inspected and used: `Your-OWN-AI-main.zip` (repo root). All
Phases 1–7 (PostgreSQL app, auth, advocate workflows, bookings, consultations,
document intelligence, Groq) are untouched and remain green (293/293).

Numbered findings & deliverables:

1. **VectorRecord + rich metadata.** `VectorRecord{id, document_id, chunk_id,
   vector, dimension, text_reference, metadata, created_at, updated_at,
   embedding_model, embedding_version}`. Metadata is an extensible string map
   covering at minimum: country, court, jurisdiction, document_type, case_id,
   advocate_id, practice_area, year, source, title, act, section, page,
   paragraph, s3_bucket, s3_key, s3_version_id. New facets need no migration.

2. **No full documents in the vector DB.** Only embeddings + references
   (`text_reference`, `s3_bucket/s3_key/s3_version_id` in metadata). S3
   remains the canonical raw-corpus store. Search responses carry the exact
   provenance Phase 9 needs to cite sources.

3. **Embedding-provider abstraction, not coupled to Ollama.** `VectorStore`
   accepts vectors directly over the API; the DB never requires an embedding
   service. `EmbeddingProvider` (Noop by default; optional Ollama only when
   `VECTORDB_OLLAMA_URL` is set) can embed `text` for dev/test. Dimension is
   validated against the store; a mismatch is a hard 400, never silently
   accepted.

4. **Metrics.** Cosine is primary (`distance = 1 − cos`, `similarity ∈ [−1,1]`);
   euclidean (L2) and manhattan (L1) are full peers (selectable per search and
   at store construction). All indexes sort uniformly by ascending distance.

5. **Validation.** Empty vectors, wrong dimension, NaN, infinities rejected at
   insert/search/API/persistence-load. Cosine query vectors of zero magnitude
   are rejected; stored zero vectors are allowed and score max distance.
   `validation::Code` gives precise error messages.

6. **Indexes.** Pluggable `Index` interface with brute-force (exact, ground
   truth) and a real HNSW: exponential level assignment, beam search with
   query-distance candidate ordering, diversity-based neighbor selection,
   bidirectional links bounded to M/M0, **lazy tombstones on delete**,
   rebuild-from-records, configurable M/M0/ef_construction/ef_search/seed/cap,
   diagnostics (`config()` exposes nodes, live nodes, tombstones, max level,
   entry-point liveness). KD-tree ships as an exact-alternative (L1/L2 only).

7. **Metadata filtering combined with similarity.** AND-composed filters
   (eq/ne/gt/gte/lt/lte over string/number values). Approximate path is
   candidates-then-filter; if fewer than topK survive it falls back to an
   exact filtered scan (`fallback_exact_scan:true`) — correctness is never
   sacrificed for index speed. Proven by `testFiltering` and API cases.

8. **Provenance preserved end-to-end.** `insert` → persisted → `search` returns
   `id, document_id, chunk_id, similarity, distance, text_reference,
   metadata{...}` plus a `source.s3_bucket/s3_key/s3_version_id` projection.
   Restart reload keeps it byte-stable (verified by equality test).

9. **Persistence & recovery.** Atomic binary snapshot (magic + version +
   metric + dim + records; temp-file + `rename(2)`). Startup `load()` parses,
   re-validates every vector, refuses corrupt/mismatched files, then rebuilds
   all indexes from canonical records (deterministic, seeded). Missing file ⇒
   empty DB. Auto-save after every mutation (toggleable).

10. **Deterministic identity, no duplicate logical chunks.** Upsert key is
    `id`; composite `(document_id, chunk_id)` is a secondary identity —
    re-ingesting the same chunk under a different id updates the original
    record and preserves its id. `count()` never grows on re-ingest.

11. **REST API** (localhost by default): `GET /health`, `GET /stats`,
    `POST /insert`, `POST /search`, `DELETE /delete/:id`, `GET /items`,
    `POST /index/rebuild`, `GET /index/info`, `POST /benchmark`,
    `POST /dataset/legal`. Structured JSON everywhere; search results include
    similarity score, metadata, and source reference; malformed requests get
    clean 400s; unknown routes return JSON 404.

12. **Concurrency.** Single `std::shared_mutex`: searches/items/stats read
    concurrently under a shared lock; inserts/deletes/rebuilds/clear serialize
    under an exclusive lock; persistence snapshots under shared. Exercised by
    `testConcurrency` (6 threads × 300 mixed ops + concurrent searches, zero
    errors, invariants hold).

13. **S3 boundary respected.** Fields supported and preserved; **no S3
    ingestion pipeline** (that is Phase 9 and was not implemented).

14. **Real benchmarks, nothing fabricated.** `vector-db-bench` /
    `POST /benchmark` measure wall-clock avg/p95/max/min latency, QPS,
    scanned/visited counts and **recall@K vs brute-force ground truth**.
    Machine + dataset + metric + topK + ef + config are recorded in the JSON,
    reusable by Phase 10. Representative run (50k × 64d, cosine, 200 q, k=10,
    ef=100): brute avg 2.976 ms / 336 QPS; HNSW avg 0.451 ms / 2216 QPS /
    recall@10 0.9925 / **6.6× speedup**.

15. **Deterministic synthetic legal corpus.** Seeded (fixed) RNG over six
    practice areas (criminal, constitutional, property, contract, family,
    corporate) with per-case metadata, court/jurisdiction/act/section/page/
    paragraph, and s3 provenance. Byte-identical regeneration proven.

16. **Comprehensive deterministic tests.** `vector-db-tests` = **62 checks**:
    JSON round-trip, metric math, validation, insert/duplicate-id/composite
    dedupe, delete, retrieval, similarity + top-K, empty DB, filtering
    (+range), combined semantic+metadata, persistence + restart equality,
    index rebuild + tombstone drop, HNSW recall (≥0.95; measured 1.0000 on the
    600-set), KD-tree exactness, concurrent reads/writes, determinism.
    `api_test.sh` = **40 HTTP assertions** incl. restart persistence and
    malformed requests. All seeded; all temp-dir isolated.

17. **No Groq dependency for tests; no quota usage.** Tests touch only local
    C++ (+ curl/python3); embedding provider is never required.

18. **Health/observability.** `/health` and `/stats` expose version, uptime,
    vector/document/chunk counts, dimension, metric, active index, per-index
    config (M, M0, ef*, nodes, tombstones, max level), persistence state
    (file, last save/rebuild). No secrets.

19. **Security.** No credentials/keys in source; `.env` never committed (root
    and `server/.env` are git-ignored); no user-controlled file paths; input
    validation at every entry point; API binds 127.0.0.1.

20. **Isolated integration.** Everything lives under `vector-db/` (src,
    tests, third_party, Makefile, README). It builds/runs/tests on its own and
    does not disturb the Express/TypesScript backend or React frontend.

21. **Design decisions documented.** "Why HNSW", recall measurement vs
    brute-force ground truth, persistence/recovery approach, provenance and
    the S3 boundary, tombstones vs physical removal, filtered-search exact
    fallback written to `vector-db/README.md` (§9, §5, §4).

22. **Phase 9 (S3 corpus → RAG assistant) and Phase 10 (evaluation framework)
    NOT implemented**, per directives. The benchmark harness is the only
    forward-looking artifact, explicitly designed to feed Phase 10.

23. **Build & verification.** `make all` (0 errors, 0 warnings), `make test`
    62/62, `make api` 40/40. Reproduce with `make clean && make all && make
    test && make api`.

24. **Files changed (Phase 8 only).** Added `vector-db/…` (25 files incl.
    vendored `httplib.h`); `.gitignore` extended (`vector-db/build`,
    `vector-db/data`). No Phase 1–7 source was modified.

25. **Honest limitations / next steps.** (a) HNSW build is incremental-update
    cost (ef_construction=200): ~60 s for 50k records on this Mac — a future
    batched/parallel construction pass is the obvious optimization. (b) Recall
    at 50k was 0.9925 with ef=100; larger stores or lower ef will trade recall
    for latency via `ef_search` (tunable per query). (c) The metadata engine
    is string-map equality/range; full-text or nested-array facets would be a
    Phase-10 extension. (d) Persistence is single-file; WAL/multipart would be
    needed past ~10M vectors. These are scoped out of Phase 8 by design.