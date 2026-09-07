// HTTP client for the Phase 8 C++ vector database (nyayai-vdb).
// Contract confirmed against vector-db/src/httpd.cpp (POST /insert, POST
// /search, DELETE /delete/:id, GET /items, POST /index/rebuild).
// Uses node:http with a fresh connection per request (Connection: close):
// undici/fetch keep-alive pooling intermittently stalls against the Phase 8
// httplib server, so a clean per-request connection is deterministic.
import http from 'node:http';
import { URL } from 'node:url';
import type { LegalCorpusSourceType } from '../types/legalTypes.js';
import { logger } from '../utils/logger.js';

export interface VdbInsertPayload {
  id: string;
  document_id: string;
  chunk_id: string;
  vector: number[];
  text_reference: string;
  metadata: Record<string, string | number | boolean>;
  embedding_model?: string;
  embedding_version?: string;
}

export interface VdbSearchRequest {
  vector: number[];
  top_k?: number;
  index?: 'hnsw' | 'brute' | 'kdtree';
  ef?: number;
  filters?: Record<string, any>;
}

export interface VdbSearchResult {
  status: string;
  index: string;
  metric: string;
  exact: boolean;
  filtered: boolean;
  fallback_exact_scan: boolean;
  top_k: number;
  returned: number;
  total_vectors: number;
  scanned: number;
  visited: number;
  elapsed_ms: number;
  results: Array<{
    id: string;
    document_id: string;
    chunk_id: string;
    distance: number;
    similarity: number;
    text_reference: string;
    metadata: Record<string, string>;
    source?: Record<string, string>;
  }>;
}

export class VdbError extends Error {
  constructor(message: string, readonly status: number | null = null) {
    super(message);
    this.name = 'VdbError';
  }
}

export class VectorDbClient {
  readonly timeoutMs: number;
  constructor(
    readonly baseUrl = process.env.VECTOR_DB_URL?.trim() || 'http://127.0.0.1:5400',
    timeoutMs = parseInt(process.env.VECTOR_DB_TIMEOUT_MS || '30000', 10) || 30000
  ) {
    this.timeoutMs = timeoutMs;
  }

  private async raw(method: string, path: string, body?: any): Promise<any> {
    const url = new URL(`${this.baseUrl}${path}`);
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const timeoutMs = this.timeoutMs;

    let response: { status: number; text: string };
    try {
      response = await new Promise<{ status: number; text: string }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: url.hostname,
            port: url.port,
            path: `${url.pathname}${url.search}`,
            method,
            agent: false,
            timeout: timeoutMs,
            headers: {
              Connection: 'close',
              ...(payload !== undefined
                ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
                : {})
            }
          },
          res => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () =>
              resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString('utf8') })
            );
          }
        );
        req.on('timeout', () => req.destroy(new Error(`request timed out after ${timeoutMs}ms`)));
        req.on('error', err => reject(new VdbError(`vector DB unreachable at ${this.baseUrl}: ${err.message}`)));
        if (payload !== undefined) req.write(payload);
        req.end();
      });
    } catch (err: any) {
      throw err instanceof VdbError ? err : new VdbError(`vector DB unreachable at ${this.baseUrl}: ${err.message}`);
    }

    let data: any = null;
    try {
      data = response.text ? JSON.parse(response.text) : null;
    } catch {
      data = { status: 'error', error: response.text.slice(0, 200) };
    }
    if (response.status >= 400) {
      throw new VdbError(data?.error || data?.message || `VDB ${method} ${path} failed (${response.status})`, response.status);
    }
    return data;
  }

  async health(): Promise<any> {
    return this.raw('GET', '/health');
  }

  async stats(): Promise<any> {
    return this.raw('GET', '/stats');
  }

  async insert(body: VdbInsertPayload): Promise<{ id: string; created: boolean; updated: boolean }> {
    const res = await this.raw('POST', '/insert', body);
    return { id: res.id, created: !!res.created, updated: !!res.updated };
  }

  async search(req: VdbSearchRequest): Promise<VdbSearchResult> {
    return this.raw('POST', '/search', {
      vector: req.vector,
      top_k: req.top_k ?? 10,
      index: req.index ?? 'hnsw',
      ef: req.ef ?? 0,
      filters: req.filters ?? {}
    });
  }

  async delete(id: string): Promise<void> {
    await this.raw('DELETE', `/delete/${encodeURIComponent(id)}`);
  }

  async items(offset = 0, limit = 1000, includeVector = false): Promise<{ items: any[]; total: number }> {
    const res = await this.raw('GET', `/items?offset=${offset}&limit=${limit}&include_vector=${includeVector ? 1 : 0}`);
    return { items: res.items || [], total: res.total || 0 };
  }

  async rebuild(index = 'all', seed = 42): Promise<any> {
    return this.raw('POST', '/index/rebuild', { index, seed });
  }

  async indexInfo(): Promise<any> {
    return this.raw('GET', '/index/info');
  }

  /** Batch insert with minimal per-call overhead and explicit per-doc errors. */
  async insertMany(
    rows: VdbInsertPayload[],
    onProgress?: (done: number, total: number) => void
  ): Promise<{ inserted: number; updated: number; failed: Array<{ id: string; error: string }> }> {
    const result = { inserted: 0, updated: 0, failed: [] as Array<{ id: string; error: string }> };
    for (let i = 0; i < rows.length; i++) {
      try {
        const r = await this.insert(rows[i]);
        if (r.created) result.inserted++;
        else if (r.updated) result.updated++;
        onProgress?.(i + 1, rows.length);
      } catch (err: any) {
        result.failed.push({ id: rows[i].id, error: err.message });
        logger.warn(`VDB insert failed for ${rows[i].id}: ${err.message}`);
      }
    }
    return result;
  }
}

/** Build corpus metadata for a chunk (VDB stores scalars only). */
export function chunkMetadataToVdb(
  metadata: Record<string, string | number | boolean | null>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

export { LegalCorpusSourceType };

export function corpusSourceTag(source: LegalCorpusSourceType): string {
  return source;
}