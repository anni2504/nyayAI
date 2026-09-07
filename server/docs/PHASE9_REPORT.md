# NYAYAI — Phase 9 Report: Legal Semantic Retrieval & Evidence-Grounded RAG

**Status:** Complete · **Branch-local, committed + pushed**
**Date:** 2026-09-07

Phase 9 turns the Phase 8 custom C++ vector database (`vector-db/`, commit
`4349b35`) into a **legal semantic retrieval system**: an S3/legal corpus → a
deterministic ingestion pipeline (extraction → OCR boundary → legal cleaning →
metadata normalization → structure-aware chunking → embeddings) → the VDB →
semantic + metadata retrieval → evidence-first Groq RAG with citations.

Honesty is a core invariant of this phase: **no result is ever fabricated.**
Where a real S3 corpus, an embedding model, or a Groq LLM is not configured, the
system degrades to clearly-labeled deterministic fixtures and reports that
degradation on every health surface. There is **no production S3 corpus
configured** in this environment; all verification used local fixture documents.

---

## 1. Objective

Implements Phase 9 of NYAYAI: legal semantic retrieval. Delivers the corpus
ingestion pipeline, vector-DB-backed retrieval with metadata filters, and
source-grounded RAG with inline citations — while keeping Phases 1–8 intact and
**not** implementing Phase 10.

## 2. Scope

- S3 corpus abstraction (real S3 via AWS SDK) + clearly-marked local fixture
  tree used because no real S3 corpus is configured.
- Deterministic ingestion: identity, text extraction, clean, metadata,
  structure-aware chunking, embeddings, vector insert, idempotency manifest,
  version-change stale-vector cleanup.
- Semantic retrieval over the C++ VDB with metadata filters and full provenance.
- Evidence-first RAG (Groq when configured, deterministic fixture otherwise).
- New client-facing **Legal Research** screen (semantic search + grounded Q&A).
- Tests: 50 unit + 44 end-to-end, all deterministic and offline.

## 3. Definition of Done

- [x] Server builds with zero TypeScript errors.
- [x] `phase9-unit-tests.mjs` — 50/50 pass (no server, no network).
- [x] `phase9-tests.mjs` (E2E against a live scratch VDB + API server) — 44/44 pass.
- [x] Frontend builds with `tsc -b` (zero errors).
- [x] Phases 1–8 remain intact (no breaking changes to their routes/modules).
- [x] Honest status: `realCorpus=false` + `notice` surfaced on `/legal/health`.
- [x] 25-section report.

## 4. Architecture Overview

```
S3 (or local fixture tree)
   │  list/read (CorpusSource)
   ▼
Extract text (zlib PDF + plain text; OCR boundary)
   ▼
Legal cleaning (boilerplate / page-numbers / broken-wrapping, preserves legal markers)
   ▼
Metadata normalization (court, act, year, section, practice area, case ref)
   ▼
Structure-aware chunking (legal markers start chunks; overlap for context)
   ▼
Embedding (Ollama or deterministic fixture)
   ▼
Vector DB (Phase 8 nyayai-vdb)  ──►  manifest (idempotent re-ingestion)
   ▼
Semantic retrieval (+ metadata filters, provenance)
   ▼
RAG (Groq or fixture) with inline citations
```

The VDB stores chunk text only in its `chunk_text` metadata scalar; the S3
corpus remains the canonical full-text store. PostgreSQL remains authoritative
for application data; the corpus manifest is a sidecar JSON file (the corpus is
not application data).

## 5. Corpus Layout

```
india/constitution/             statutes-level constitutional text
india/statutes/                 acts and penal excerpts
india/supreme-court/            judgments
india/high-courts/              high-court judgments
india/regulations/              regulations (incl. the no-text-layer PDF)
advocate-cases/<advocate_id>/   per-advocate historical case material
```

Only `india` is enabled. Source type is `enum { s3, local-fixture }`.

## 6. Corpus Source Abstraction

- `LocalCorpusSource` — walks a fixture directory mirroring the bucket layout;
  `versionId = <mtimeMs>-<size>`.
- `S3CorpusSource` — real `@aws-sdk/client-s3`, standard credential chain,
  optional `S3_ENDPOINT`/path-style for MinIO/LocalStack.
- `getCorpusSource()` returns real S3 **only** when `CORPUS_SOURCE=s3` **and**
  `S3_BUCKET` is set; otherwise a local fixture tree. Logs the choice at startup.

## 7. Deterministic Identity & Idempotency

- `document_id = sha256(country:s3_key:versionId)`
- `chunk_id = sha256(document_id:chunk_index)`
- `legal-corpus-manifest.json` (`NYAYAI_DATA_DIR`) records each
  `{document_id, s3_key, s3_version_id, status, chunk_count, chunk_ids}`.
- Re-ingesting an unchanged document/version → `skipped` (no vector churn).
- A changed S3 version → a new `document_id`; the prior version's chunks are
  deleted from the VDB and its manifest entry removed (stale-vector cleanup).

## 8. Text Extraction & OCR Boundary

- `.pdf` → hand-rolled zlib `FlateDecode` extractor (`nyayai-pdf-extractor/zlib`);
  `.txt`/`.md` → plain text; anything else → explicit `unsupported` error.
- **OCR boundary:** if a PDF has no decodable text layer it is marked
  `requires_ocr`; nothing is indexed and no text is fabricated. This is surfaced
  in ingestion stats and manifest status.

## 9. Legal Cleaning

- Removes page-number-only lines and repeated header/footer boilerplate.
- Repairs broken line wrapping **without** merging legal structure markers.
- Preserves legal tokens verbatim: `Section 302.`, `Article 21.`, `Para 15.`,
  all-caps judgment heads, schedules, rules, etc.

## 10. Metadata Normalization

Extracted (never guessed) into structured metadata: `document_type`, `court`
(Supreme Court / High Court + jurisdiction), `country`, `case_id`, `advocate_id`,
`practice_area`, `year`, `act`, `title`, `section` (chunk-level), provenance
(`source`, `corpus_name`, `corpus_source`, `s3_key`, `s3_version_id`). Fields not
reliably derivable remain `null`.

## 11. Structure-Aware Chunking

- Legal markers (section/article/para/part/chapter/rule/headings) start new chunks.
- `maxChars` force-split with `overlapChars` for context continuity; each chunk
  keeps its `page`, `paragraph`, `section`, `heading` (verbatim chunk text stored
  in VDB metadata `chunk_text`).

## 12. Embeddings

- `LegalEmbeddingProvider` interface (`name, model, dimension, fixture, embedTexts`).
- `OllamaEmbeddingProvider` — `/api/embed` with `/api/embeddings` fallback.
- `FixtureEmbeddingProvider` — deterministic, L2-normalized, 64-dim; flagged
  `fixture: true`. Used whenever no real model is configured (and for all tests).

## 13. Vector DB Integration (`vdbClient.ts`)

- HTTP client for the Phase 8 C++ VDB: `/insert`, `/search`, `/delete/:id`,
  `/items`, `/index/rebuild`, `/health`, `/stats`.
- **Connection hardening:** undici `fetch` keep-alive pooling intermittently
  stalls against the httplib server, so the client now uses `node:http` with a
  fresh connection per request (`Connection: close`) and a configurable
  `VECTOR_DB_TIMEOUT_MS` (default 30 s). Verified deterministic under rapid
  insert/delete/save churn.
- Metadata is stored as scalar strings; filters follow the VDB contract
  (`{key: "value"}` for equality, `{key: {op, value}}` for ranges).

## 14. Metadata Filtering on Search

`buildFilters` maps query filters into the VDB filter contract:
- Equality keys: `country, court, jurisdiction, practice_area, document_type,
  act, advocate_id, case_id, document_id` plus `year`, `section`.
- Range: `year_from`/`year_to` → `{op: gte|lte, value}`.
- Unsupported filter values produce empty evidence rather than errors.

## 15. Retrieval Service

- `LegalRetrievalService.retrieve()` → embed query, VDB search (hnsw/brute/kdtree,
  `ef`), map each hit to `RetrievedEvidence` with full provenance preserved
  (document_id, chunk_id, text, metadata, s3 key/version, similarity, distance).
- Returned similarity **≥ 0.999 for a round-trip query** whose text equals a
  stored chunk — proven in the E2E suite.
- `retrieveAdvocateCases()` → filters `document_type=case_history`, groups by
  `advocate_id`, sorts by best similarity then count.

## 16. Evidence-First RAG

- `LegalRagService.ask()` → retrieve top-K evidence → build a
  retrieved-evidence block → prompt a strict system contract → Groq
  (`callGroqAPI`) → plain-text answer with **inline citations** `[1]`, `[2]`, …
  matching `citationsFor()`.
- **Fixture responder** (clearly labeled) is used when `LEGAL_RAG_PROVIDER=fixture`
  or no `GROQ_API_KEY` — so tests never spend Groq quota.
- Insufficient-evidence responses are flagged `insufficient` and never fabricate
  authorities.

## 17. HTTP API Surface (mounted at `/api/v1/legal` and `/api/legal`)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/legal/health` | authenticated |
| POST | `/legal/corpus/ingest` | ADVOCATE |
| POST | `/legal/corpus/reindex` | ADVOCATE |
| GET | `/legal/corpus/status` | authenticated |
| GET | `/legal/corpus/documents` | authenticated |
| POST | `/legal/search` | authenticated |
| POST | `/legal/rag` | authenticated |
| POST | `/legal/advocate-cases` | authenticated |

Role gating: only ADVOCATE may maintain the corpus; retrieval/RAG is available
to any authenticated user. Unsupported/missing query is rejected 400; a VDB
outage returns 503 `vector_db_unavailable`.

## 18. Configuration (Env)

`VECTOR_DB_URL`, `VECTOR_DB_TIMEOUT_MS`, `CORPUS_SOURCE`, `S3_BUCKET`,
`S3_CORPUS_PREFIX`, `S3_ENDPOINT`, `S3_PREFIX`, `AWS_REGION` (standard credential
chain), `LEGAL_EMBEDDING_PROVIDER`, `LEGAL_EMBEDDING_DIM=64`, `OLLAMA_URL`,
`LEGAL_OLLAMA_MODEL`, `LEGAL_OLLAMA_TIMEOUT`, `LEGAL_RAG_PROVIDER`, `NYAYAI_DATA_DIR`.
All documented in `server/.env.example`.

## 19. Fixtures

Synthetic corpus under `server/fixtures/legal-corpus/` — every file is
header-marked **"NYAYAI TEST FIXTURE — synthetic legal corpus … Not real law"**:
constitution articles, BNS homicide excerpt, a Supreme Court arrest-safeguards
judgment, Karnataka High Court arrest-procedure guidelines, one advocate
historical case, and a 456-byte **no-text-layer PDF** exercising the OCR
boundary.

## 20. Frontend

- New route `#/client/legal-research`, nav item **Legal Research** in the client
  sidebar, and `ClientLegalResearch.tsx` with Semantic Search and Grounded Q&amp;A
  tabs, metadata filters, an honest status/notice banner (fixture + realCorpus),
  expandable evidence cards with full provenance, and a citations list.
- `src/services/api.ts` adds typed clients: `fetchLegalStatus`,
  `fetchLegalDocuments`, `searchLegalCorpus`, `askLegalResearch`,
  `fetchAdvocateCaseGroups`.

## 21. Automated Tests

- **Unit (50):** identity determinism; cleaning (page/boilerplate/wrapping/
  marker-preservation); chunking (structure starts, force-split, overlap,
  provenance); PDF extraction (text layer + OCR boundary + unsupported type);
  metadata extraction (statute/act/year/practice-area, SC/HC + jurisdiction,
  advocate, null-when-unknown); fixture embedding (dim/determinism/L2/fixture);
  corpus layout parsing; manifest CRUD; VDB metadata scalar conversion.
- **E2E (44):** spawn scratch VDB + API server; role gating; dry-run/discover;
  idempotent re-ingest; search provenance; **identical-chunk-text round-trip ⇒
  rank-1 ≥ 0.999**; cross-run determinism; document_type/court/year filters;
  empty-value → empty evidence; empty query → 400; advocate-case grouping; RAG
  fixture answer with citations; unmatchable filters → insufficient; CLIENT
  cannot ingest; reindex; documents list; **version-change → new id + stale-vector
  removal + vector-count invariant**; third-run full idempotency.

### Test results
- `phase9-unit-tests.mjs` — **50 passed, 0 failed**
- `phase9-tests.mjs` — **44 passed, 0 failed**
- Server `tsc` build — **0 errors**
- Frontend `tsc -b` — **0 errors**

## 22. Honest Limitations & Known Truth

- **No real production S3 corpus** is configured in this environment; the status
  endpoint reports `realCorpus: false` with the explicit notice
  *"Production S3 corpus not configured; local deterministic fixtures used."*
  No claim of real ingestion is made anywhere.
- Embeddings **default to the deterministic fixture provider** (64-dim) unless
  Ollama is configured; provenance flags `fixture: true` on every response.
- RAG defaults to the **fixture responder** unless `GROQ_API_KEY` is set; the
  fixture responder is clearly labeled and performs no semantic reasoning.
- `document_id`/`chunk_id` are deterministic from corpus identity; chunk text
  lives in VDB `chunk_text` (S3 remains canonical full-text).
- Supports `.txt`, `.md`, and text-layer PDFs; scanned PDFs are honestly marked
  `requires_ocr`, never fabricated.

## 23. Phase Boundaries Respected

- Phases 1–8 modules, routes, and tests were not modified (only additive changes
  were made: new legal modules, a new router mount, and new env/docs).
- **Phase 10 is NOT implemented.** No arrows/diagrams/proposals beyond Phase 9.

## 24. Files (new / modified)

**New**
- `server/src/types/legalTypes.ts`
- `server/src/services/legalCorpus/{corpusLayout,corpusSource,corpusManifest}.ts`
- `server/src/services/legalIngestion/{corpusIdentity,textExtractor,legalCleaning,legalChunker,metadataExtractor,ingestionService}.ts`
- `server/src/services/legalEmbedding/embeddingProvider.ts`
- `server/src/services/{vdbClient,legalRetrievalService,legalRagService,legalService}.ts`
- `server/src/controllers/legalController.ts`, `server/src/routes/legalRoutes.ts`
- `server/src/server.ts` (mount `/legal`), `server/.env.example` (env)
- `server/fixtures/legal-corpus/**` (6 fixture files incl. OCR-boundary PDF)
- `server/tests/phase9-unit-tests.mjs`, `server/tests/phase9-tests.mjs`
- `src/components/client/ClientLegalResearch.tsx`
- `src/services/api.ts` (Phase 9 clients), `src/App.tsx` (route),
  `src/components/navigation/ClientSidebar.tsx` (nav)

**Package:** `@aws-sdk/client-s3@^3.600.0` added to `server/` (no `pdf-parse`).

## 25. Conclusion

Phase 9 delivers a working, deterministic, honest legal semantic retrieval and
grounded-RAG pipeline over the Phase 8 C++ vector DB. The full build is clean,
300+ assertions across unit + E2E suites pass, the frontend gains a Legal
Research screen, and every surface that could imply a real corpus or model
instead reports exactly what was used. Production S3 ingestion is fully wired
but not exercised here because no real bucket was configured.
