// Legal semantic retrieval above the C++ vector DB.
// query -> embed -> vector search (+ metadata filters) -> top-K evidence with
// provenance preserved end-to-end.
import type {
  LegalSearchRequest,
  LegalSearchResponse,
  RetrievedEvidence,
  LegalEmbeddingProvider,
  LegalRagResponse,
  AdvocateCaseGroup,
  Citation
} from '../types/legalTypes.js';
import { VectorDbClient, type VdbSearchResult } from './vdbClient.js';

export function buildFilters(filters?: Record<string, any>): Record<string, any> | null {
  if (!filters || typeof filters !== 'object') return null;
  const out: Record<string, any> = {};
  // VDB contract (vector-db/src/ydb_types.cpp parseFilters): a flat scalar is
  // an Eq filter; a range uses {"op": "...", "value": scalar}.
  const eqKeys = ['country', 'court', 'jurisdiction', 'practice_area', 'document_type', 'act', 'advocate_id', 'case_id', 'document_id'];
  for (const k of eqKeys) {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
      out[k] = String(filters[k]);
    }
  }
  if (filters.year !== undefined && filters.year !== null && filters.year !== '') {
    out.year = String(filters.year);
  }
  if (filters.section !== undefined && filters.section !== null && filters.section !== '') {
    out.section = String(filters.section);
  }
  const fFrom = filters.year_from;
  const fTo = filters.year_to;
  if (fFrom !== undefined && fFrom !== null && fFrom !== '') out.year = { ...(out.year || {}), op: 'gte', value: String(fFrom) };
  if (fTo !== undefined && fTo !== null && fTo !== '') out.year = { ...(out.year || {}), op: 'lte', value: String(fTo) };
  return Object.keys(out).length ? out : null;
}

/** Map a raw VDB search result hit to a RetrievedEvidence object. */
export function evidenceFromHit(hit: VdbSearchResult['results'][number], rank: number): RetrievedEvidence {
  const md = hit.metadata || {};
  return {
    rank,
    similarity: hit.similarity,
    distance: hit.distance,
    document_id: hit.document_id,
    chunk_id: hit.chunk_id,
    text: md.chunk_text || '',
    title: md.title || null,
    court: md.court || null,
    jurisdiction: md.jurisdiction || null,
    document_type: md.document_type || null,
    practice_area: md.practice_area || null,
    year: md.year || null,
    act: md.act || null,
    section: md.section || null,
    page: md.page || null,
    paragraph: md.paragraph || null,
    case_id: md.case_id || null,
    advocate_id: md.advocate_id || null,
    s3_bucket: md.s3_bucket || null,
    s3_key: md.s3_key || null,
    s3_version_id: md.s3_version_id || null,
    text_reference: hit.text_reference,
    corpus_source: (md.corpus_source as any) || 'unknown'
  };
}

export class LegalRetrievalService {
  constructor(
    private vdb: VectorDbClient,
    private embedding: LegalEmbeddingProvider
  ) {}

  async retrieve(req: LegalSearchRequest): Promise<LegalSearchResponse> {
    if (!req.query || !req.query.trim()) {
      throw new Error('query is required');
    }
    const filters = buildFilters(req.filters);
    const emb = await this.embedding.embedTexts([req.query]);
    const vector = emb.vectors[0];
    if (vector.length !== this.embedding.dimension) {
      throw new Error(
        `embedding dimension mismatch: ${vector.length} != provider dimension ${this.embedding.dimension}`
      );
    }
    const topK = Math.min(req.topK || 10, 50);
    const res = await this.vdb.search({
      vector,
      top_k: topK,
      index: req.index || 'hnsw',
      ef: req.ef,
      filters: filters || undefined
    });

    const evidence: RetrievedEvidence[] = res.results.map((hit, i) => evidenceFromHit(hit, i + 1));
    return {
      status: 'ok',
      query: req.query,
      empty: evidence.length === 0,
      filters,
      top_k: topK,
      index: res.index,
      embedding: {
        provider: this.embedding.name,
        model: this.embedding.model,
        dimension: this.embedding.dimension,
        fixture: this.embedding.fixture
      },
      evidence,
      retrieval_stats: {
        returned: res.returned,
        scanned: res.scanned,
        visited: res.visited,
        elapsed_ms: res.elapsed_ms,
        fallback_exact_scan: res.fallback_exact_scan,
        total_vectors: res.total_vectors
      }
    };
  }

  /** Advocate historical-case retrieval: query -> semantic similar case chunks
   *  -> grouped by advocate_id. Only actual stored evidence is used. */
  async retrieveAdvocateCases(
    query: string,
    filters?: Record<string, any>,
    topK = 20
  ): Promise<{ status: string; query: string; groups: AdvocateCaseGroup[]; top_k: number; embedding: LegalSearchResponse['embedding'] }> {
    const res = await this.retrieve({
      query,
      topK,
      filters: { document_type: 'case_history', ...(filters || {}) }
    });
    const groups = new Map<string, AdvocateCaseGroup>();
    for (const ev of res.evidence) {
      const id = ev.advocate_id;
      if (!id) continue;
      const g = groups.get(id) || {
        advocate_id: id,
        best_similarity: -1,
        count: 0,
        practice_areas: [] as string[],
        cases: [] as RetrievedEvidence[]
      };
      g.count++;
      g.best_similarity = Math.max(g.best_similarity, ev.similarity);
      if (ev.practice_area && !g.practice_areas.includes(ev.practice_area)) g.practice_areas.push(ev.practice_area);
      g.cases.push(ev);
      groups.set(id, g);
    }
    const ordered = [...groups.values()].sort((a, b) => {
      if (a.best_similarity !== b.best_similarity) return b.best_similarity - a.best_similarity;
      return b.count - a.count;
    });
    return {
      status: 'ok',
      query,
      groups: ordered,
      top_k: topK,
      embedding: res.embedding
    };
  }

  citationsFor(evidence: RetrievedEvidence[]): Citation[] {
    return evidence.map((e, i) => ({
      index: i + 1,
      document_id: e.document_id,
      chunk_id: e.chunk_id,
      title: e.title,
      court: e.court,
      year: e.year,
      act: e.act,
      section: e.section,
      page: e.page,
      paragraph: e.paragraph,
      s3_key: e.s3_key,
      s3_version_id: e.s3_version_id
    }));
  }
}

export function ragResponseFrom(
  retrieval: LegalSearchResponse,
  answer: string,
  model: string,
  llmProvider: string,
  fixture: boolean,
  latencyMs: number,
  citations: Citation[]
): LegalRagResponse {
  return {
    status: 'ok',
    question: retrieval.query,
    answer,
    insufficient: retrieval.empty || !answer || /insufficient|limited|no direct evidence/i.test(answer),
    model,
    provider: llmProvider,
    fixture,
    latency_ms: latencyMs,
    citations,
    evidence: retrieval.evidence,
    embedding: retrieval.embedding,
    retrieval_stats: retrieval.retrieval_stats
  };
}