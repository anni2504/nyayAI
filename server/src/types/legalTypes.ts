// Shared Phase 9 legal-corpus / retrieval / RAG types.
// The canonical raw legal corpus lives in S3 (or a clearly-marked local
// fixture). The vector DB stores chunk embeddings + provenance + chunk text
// only — never full documents.

export type LegalCorpusSourceType = 's3' | 'local-fixture';

/** Embedding provider contract (configurable, never hardwired into the DB). */
export interface LegalEmbeddingProvider {
  name: string;
  model: string;
  dimension: number;
  /** True only for the deterministic fixture provider used in tests. */
  fixture: boolean;
  embedTexts(texts: string[]): Promise<LegalEmbeddingResult>;
}

export interface LegalEmbeddingResult {
  vectors: number[][];
  provider: string;
  model: string;
  dimension: number;
  fixture: boolean;
}

export interface LegalCorpusConfig {
  /** Bucket (real S3) or fixture root path (local). Present only for real S3. */
  bucket: string | null;
  /** e.g. "nyayai-legal-corpus" conceptual layout root. */
  prefixRoot: string;
  /** Countries with a supported layout. Never invent an unconfirmed country. */
  countries: string[];
  /** Top-level advocation case-history prefix (under the bucket). */
  advocatePrefix: string;
  sourceType: LegalCorpusSourceType;
  /** True only when a real S3 corpus is actually reachable/configured. */
  realCorpus: boolean;
}

/** Normalized, extensible legal document metadata (unknown => null). */
export interface LegalDocumentMetadata {
  document_type: string | null;
  court: string | null;
  jurisdiction: string | null;
  country: string;
  case_id: string | null;
  advocate_id: string | null;
  practice_area: string | null;
  year: string | null;
  act: string | null;
  section: string | null;
  title: string | null;
  source: string; // corpus source label, e.g. "s3://bucket" or "fixture://root"
  corpus_name: string;
  corpus_source: LegalCorpusSourceType;
  status?: string; // 'ingested' | 'requires_ocr' | 'failed'
  [key: string]: any;
}

/** One structure-aware chunk of a legal document. */
export interface LegalChunk {
  chunk_id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  page: number | null;
  paragraph: number | null;
  section: string | null;
  heading: string | null;
  metadata: LegalDocumentMetadata;
}

export interface ExtractedDocument {
  key: string;
  document_id: string;
  metadata: LegalDocumentMetadata;
  fullText: string;
  chunks: LegalChunk[];
  extraction: {
    engine: string;
    ocrRequired: boolean;
    structured: boolean;
  };
}

export interface CorpusObjectMeta {
  key: string;
  size: number;
  /** S3 VersionId when versioning enabled, else deterministic content proxy
   *  (mtime+sizefor fixtures). Changes signal a changed document. */
  versionId: string;
  lastModified: string | null;
}

export interface RetrievedEvidence {
  rank: number;
  similarity: number;
  distance: number;
  document_id: string;
  chunk_id: string;
  text: string;
  title: string | null;
  court: string | null;
  jurisdiction: string | null;
  document_type: string | null;
  practice_area: string | null;
  year: string | null;
  act: string | null;
  section: string | null;
  page: string | null;
  paragraph: string | null;
  case_id: string | null;
  advocate_id: string | null;
  s3_bucket: string | null;
  s3_key: string | null;
  s3_version_id: string | null;
  source_url: string | null;
  text_reference: string;
  corpus_source: LegalCorpusSourceType;
}

export interface LegalSearchRequest {
  query: string;
  topK?: number;
  index?: 'hnsw' | 'brute' | 'kdtree';
  ef?: number;
  filters?: Record<string, any>;
}

export interface LegalSearchResponse {
  status: string;
  query: string;
  empty: boolean;
  filters: Record<string, any> | null;
  top_k: number;
  index: string;
  embedding: { provider: string; model: string; dimension: number; fixture: boolean };
  evidence: RetrievedEvidence[];
  retrieval_stats: {
    returned: number;
    scanned: number;
    visited: number;
    elapsed_ms: number;
    fallback_exact_scan: boolean;
    total_vectors: number;
  };
}

export interface Citation {
  index: number;
  document_id: string;
  chunk_id: string;
  title: string | null;
  court: string | null;
  year: string | null;
  act: string | null;
  section: string | null;
  page: string | null;
  paragraph: string | null;
  s3_key: string | null;
  s3_version_id: string | null;
}

export interface LegalRagResponse {
  status: string;
  question: string;
  answer: string;
  insufficient: boolean;
  model: string;
  provider: string;
  fixture: boolean;
  latency_ms: number;
  citations: Citation[];
  evidence: RetrievedEvidence[];
  embedding: { provider: string; model: string; dimension: number; fixture: boolean };
  retrieval_stats: LegalSearchResponse['retrieval_stats'];
}

export interface AdvocateCaseGroup {
  advocate_id: string;
  best_similarity: number;
  count: number;
  practice_areas: string[];
  cases: RetrievedEvidence[];
}

export interface IngestionRunStats {
  status: 'ok' | 'partial' | 'error';
  source: LegalCorpusSourceType;
  realCorpus: boolean;
  mode: 'dry-run' | 'ingest';
  scope: 'one' | 'prefix' | 'all' | 'selected';
  discovered: number;
  processed: number;
  skipped: number;
  failed: number;
  requiresOcr: number;
  chunks: number;
  embeddings: number;
  vectorsInserted: number;
  vectorsDeleted: number;
  elapsedMs: number;
  embedding: { provider: string; model: string; dimension: number; fixture: boolean };
  errors: string[];
  documents: Array<{ key: string; status: string; chunks: number; versionId: string }>;
}

export interface CorpusDocumentEntry {
  document_id: string;
  s3_key: string;
  s3_version_id: string;
  country: string;
  title: string | null;
  document_type: string | null;
  status: string;
  chunk_count: number;
  content_hash: string;
  ingested_at: string;
  /** Where the document was retrieved from (official URL when known). */
  source_url?: string | null;
  /** When the source file was retrieved into the corpus (for constitution docs). */
  retrieved_at?: string | null;
}