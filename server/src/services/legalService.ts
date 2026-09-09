// Legal stack facade: assembles corpus source, manifest, VDB client,
// embedding provider, ingestion, retrieval and RAG services, and exposes a
// status surface for observability.
import type { LegalCorpusConfig, IngestionRunStats } from '../types/legalTypes.js';
import { corpusConfig, parseCorpusKey } from './legalCorpus/corpusLayout.js';
import path from 'node:path';
import { getCorpusSource } from './legalCorpus/corpusSource.js';
import { CorpusManifest } from './legalCorpus/corpusManifest.js';
import { VectorDbClient } from './vdbClient.js';
import { getLegalEmbeddingProvider } from './legalEmbedding/embeddingProvider.js';
import type { LegalEmbeddingProvider } from '../types/legalTypes.js';
import { IngestionService, type IngestionDeps, type IngestOptions } from './legalIngestion/ingestionService.js';
import { LegalRetrievalService } from './legalRetrievalService.js';
import { LegalRagService, type RagOptions } from './legalRagService.js';
import { logger } from '../utils/logger.js';

export interface LegalStackStatus {
  status: 'ok' | 'degraded';
  corpus: LegalCorpusConfig & { label: string; realCorpus: boolean };
  vdb: { connected: boolean; url: string; vectors?: number; dimension?: number; error?: string };
  embedding: { provider: string; model: string; dimension: number; fixture: boolean };
  manifest: { documents: number; chunks: number };
  lastRun: IngestionRunStats | null;
  /** Honest signal: true only when a real S3 corpus is configured. */
  realCorpus: boolean;
  notice?: string;
}

export class LegalStack {
  readonly cfg: LegalCorpusConfig;
  readonly vdb: VectorDbClient;
  readonly embedding: LegalEmbeddingProvider;
  readonly manifest: CorpusManifest;
  readonly ingestion: IngestionService;
  readonly retrieval: LegalRetrievalService;
  readonly rag: LegalRagService;
  private deps: IngestionDeps;
  private lastRun: IngestionRunStats | null = null;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.cfg = corpusConfig(env);
    const source = getCorpusSource(env);
    this.vdb = new VectorDbClient(env.VECTOR_DB_URL?.trim() || 'http://127.0.0.1:5400');
    this.embedding = getLegalEmbeddingProvider(env);

    const dataDir = env.NYAYAI_DATA_DIR?.trim()
      ? (env.NYAYAI_DATA_DIR.trim() as string)
      : CorpusManifest.defaultDataDir();
    this.manifest = new CorpusManifest(dataDir);
    this.deps = {
      source,
      manifest: this.manifest,
      vdb: this.vdb,
      embedding: this.embedding,
      cfg: this.cfg,
      storageDir: dataDir
    };
    this.ingestion = new IngestionService(this.deps);
    this.retrieval = new LegalRetrievalService(this.vdb, this.embedding);
    this.rag = new LegalRagService(this.retrieval);
    this.manifest.load().catch((err: any) => logger.warn(`corpus manifest load failed: ${err.message}`));
  }

  async ingest(opts: IngestOptions): Promise<IngestionRunStats> {
    this.lastRun = await this.ingestion.run(opts);
    return this.lastRun;
  }

  async discover(prefix?: string) {
    return this.ingestion.discover(prefix);
  }

  /** Open a corpus document by key (the same key the ingestion pipeline indexed).
   *  Guards against path traversal and non-corpus keys so only material under the
   *  corpus layout can ever be returned. */
  async readCorpusFile(key: string): Promise<{ buffer: Buffer; contentType: string | null; key: string }> {
    const normalized = key.replace(/^\/+/, '');
    const segments = normalized.split('/');
    if (segments.some(s => s === '..' || !s) || normalized !== key) {
      throw new Error('invalid corpus key');
    }
    const parsed = parseCorpusKey(normalized, this.cfg);
    if (parsed.country === null && !parsed.isAdvocateCases) {
      throw new Error(`not a corpus document: ${key}`);
    }
    const ext = path.extname(normalized).toLowerCase();
    if (ext !== '.pdf' && ext !== '.txt' && ext !== '.md') {
      throw new Error('unsupported corpus document type');
    }
    const obj = await this.deps.source.readObject(normalized);
    return { buffer: obj.buffer, contentType: obj.contentType, key: normalized };
  }

  async reindex(): Promise<any> {
    const res = await this.vdb.rebuild('all', 42);
    return res;
  }

  async status(): Promise<LegalStackStatus> {
    let vdbConnected = false;
    let vdbInfo: any = null;
    let vdbError: string | undefined;
    try {
      vdbInfo = await this.vdb.health();
      vdbConnected = true;
    } catch (err: any) {
      vdbError = err.message;
    }
    await this.manifest.load();

    const notice = this.cfg.realCorpus
      ? undefined
      : 'Production S3 corpus not configured; local deterministic fixtures used.';

    return {
      status: vdbConnected ? 'ok' : 'degraded',
      corpus: { ...this.cfg, label: this.deps.source.label, realCorpus: this.cfg.realCorpus },
      vdb: {
        connected: vdbConnected,
        url: this.vdb.baseUrl,
        vectors: vdbInfo?.vector_count,
        dimension: vdbInfo?.dimension,
        error: vdbError
      },
      embedding: {
        provider: this.embedding.name,
        model: this.embedding.model,
        dimension: this.embedding.dimension,
        fixture: this.embedding.fixture
      },
      manifest: this.manifest.stats(),
      lastRun: this.lastRun,
      realCorpus: this.cfg.realCorpus,
      notice
    };
  }
}

export { RagOptions };

export function createLegalStack(env: NodeJS.ProcessEnv = process.env): LegalStack {
  return new LegalStack(env);
}