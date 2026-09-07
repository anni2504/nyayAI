// Legal embedding provider abstraction.
// The vector DB accepts externally-generated vectors; this layer supplies
// them. Providers are configurable via env and never hardwired into the DB.
// The fixture provider produces deterministic vectors for tests (clearly
// marked fixture=true). Ollama is the default development provider.
import { createHash } from 'node:crypto';
import type { LegalEmbeddingResult, LegalEmbeddingProvider } from '../../types/legalTypes.js';
import { logger } from '../../utils/logger.js';

export async function embedTexts(
  provider: LegalEmbeddingProvider,
  texts: string[]
): Promise<LegalEmbeddingResult> {
  const limit = Array.isArray(texts) ? texts : [texts];
  const vectors = await provider.embedTexts(limit);
  if (vectors.vectors.length !== texts.length) {
    throw new Error(
      `embedding provider '${provider.name}' returned ${vectors.vectors.length} vectors for ${texts.length} texts`
    );
  }
  return vectors;
}

/** Deterministic, dependency-free embedding for fixtures/tests only. The
 *  vectors are NOT semantic; they only make the pipeline reproducible without
 *  an external model. Never used to claim real semantic indexing. */
export class FixtureEmbeddingProvider implements LegalEmbeddingProvider {
  readonly name = 'fixture-hash-embedding';
  readonly model = 'fixture-embed/v1';
  readonly fixture = true;

  constructor(readonly dimension = 64) {}

  private vectorFor(text: string): number[] {
    const h = createHash('sha256').update(`seed:${text}`).digest();
    let s = 0;
    for (let i = 0; i < 16; i++) s = (s * 31 + h[i]) >>> 0;
    const x = s / 0xffffffff;
    const vec: number[] = [];
    for (let i = 0; i < this.dimension; i++) {
      const byte = h[i % h.length];
      const wobble = Math.sin(x * 100 + i * 7 + byte);
      vec.push(wobble);
    }
    const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }

  async embedTexts(texts: string[]): Promise<LegalEmbeddingResult> {
    const vectors = texts.map(t => this.vectorFor(t));
    return { vectors, provider: this.name, model: this.model, dimension: this.dimension, fixture: true };
  }
}

/** Real Ollama embedding provider (development). Uses /api/embed with an
 *  /api/embeddings fallback. Never required by the pipeline. */
export class OllamaEmbeddingProvider implements LegalEmbeddingProvider {
  readonly name = 'ollama';
  readonly fixture = false;
  dimension: number;

  constructor(
    readonly baseUrl: string,
    readonly model: string,
    readonly timeoutMs: number,
    dimension = 0
  ) {
    // 0 = unknown until the first successful embed call.
    this.dimension = dimension;
  }

  async embedTexts(texts: string[]): Promise<LegalEmbeddingResult> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/api/embed`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, input: texts }),
        signal: controller.signal
      });
    } catch (err: any) {
      clearTimeout(timer);
      throw new Error(`Ollama embed unavailable: ${err.message}`);
    }
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 404) {
        return this.embedLegacy(texts);
      }
      throw new Error(`Ollama embed failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const vectors: number[][] = (data.embeddings || []).map((v: number[]) =>
      v.map((n) => (typeof n === 'number' ? n : Number(n)))
    );
    if (!vectors.length || !vectors[0].length) throw new Error('Ollama embed returned empty vectors');
    this.dimension = vectors[0].length;
    return {
      vectors,
      provider: this.name,
      model: this.model,
      dimension: this.dimension,
      fixture: false
    };
  }

  private async embedLegacy(texts: string[]): Promise<LegalEmbeddingResult> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/api/embeddings`;
    const vectors: number[][] = [];
    for (const t of texts) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: t }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Ollama /api/embeddings failed (${res.status})`);
      const data = await res.json();
      const v: number[] = (data.embedding || []).map((n: number) => Number(n));
      if (!v.length) throw new Error('Ollama /api/embeddings returned empty embedding');
      vectors.push(v);
    }
    this.dimension = vectors[0].length;
    return {
      vectors,
      provider: this.name,
      model: this.model,
      dimension: this.dimension,
      fixture: false
    };
  }
}

export function getLegalEmbeddingProvider(env: NodeJS.ProcessEnv = process.env): LegalEmbeddingProvider {
  const choice = (env.LEGAL_EMBEDDING_PROVIDER || '').trim().toLowerCase();
  const dimension = parseInt(env.LEGAL_EMBEDDING_DIM || '64', 10) || 64;

  if (choice === 'ollama' || (!choice && env.OLLAMA_URL?.trim())) {
    const baseUrl = env.OLLAMA_URL?.trim() || 'http://127.0.0.1:11434';
    const model = env.LEGAL_OLLAMA_MODEL?.trim() || 'nomic-embed-text';
    const timeoutMs = parseInt(env.LEGAL_OLLAMA_TIMEOUT || '60000', 10) || 60000;
    logger.info(`Phase 9 embedding provider: Ollama (${model} @ ${baseUrl})`);
    return new OllamaEmbeddingProvider(baseUrl, model, timeoutMs);
  }
  logger.warn('Phase 9 embedding provider: deterministic FIXTURE embeddings (no real embedding model configured)');
  return new FixtureEmbeddingProvider(dimension);
}