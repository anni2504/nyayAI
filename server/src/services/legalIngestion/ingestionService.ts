// Legal corpus ingestion pipeline.
//
// S3 (or a local fixture tree) -> read -> identify type -> extract text ->
// clean text -> extract/normalize metadata -> structure-aware chunking ->
// embed -> insert into the C++ vector DB. Deterministic identities keep
// re-ingestion idempotent; S3 version changes create distinguishable
// document/chunk ids and remove stale vectors.
import path from 'node:path';
import type {
  IngestionRunStats,
  LegalCorpusConfig,
  LegalDocumentMetadata,
  LegalChunk,
  ExtractedDocument
} from '../../types/legalTypes.js';
import type { CorpusSource } from '../legalCorpus/corpusSource.js';
import { CorpusManifest } from '../legalCorpus/corpusManifest.js';
import { parseCorpusKey, isSupportedDocument, corpusConfig } from '../legalCorpus/corpusLayout.js';
import { extractDocumentMetadata, sourceLabel, OFFICIAL_DOC_SOURCES } from './metadataExtractor.js';
import { extractText } from './textExtractor.js';
import { cleanLegalText } from './legalCleaning.js';
import { chunkLegalDocument, DEFAULT_CHUNKER_CONFIG } from './legalChunker.js';
import { documentIdFrom, chunkIdFrom } from './corpusIdentity.js';
import type { LegalEmbeddingProvider } from '../../types/legalTypes.js';
import { VectorDbClient, chunkMetadataToVdb, type VdbInsertPayload } from '../vdbClient.js';
import { logger } from '../../utils/logger.js';

export interface IngestOptions {
  scope: 'one' | 'prefix' | 'all' | 'selected';
  key?: string;
  prefix?: string;
  keys?: string[];
  country?: string;
  dryRun?: boolean;
  config?: Partial<typeof DEFAULT_CHUNKER_CONFIG>;
}

export interface IngestionDeps {
  source: CorpusSource;
  manifest: CorpusManifest;
  vdb: VectorDbClient;
  embedding: LegalEmbeddingProvider;
  cfg: LegalCorpusConfig;
  storageDir: string;
}

interface DocIngestOutcome {
  key: string;
  status: 'ingested' | 'skipped' | 'requires_ocr' | 'failed' | 'dry-run' | 'unsupported' | 'not-corpus';
  chunks: number;
  versionId: string;
  error?: string;
  documentId?: string;
}

function makeTextReference(sourceRef: string, key: string, page: number | null, paragraph: number | null): string {
  const pagePart = page ? `page=${page}` : 'page=1';
  const paraPart = paragraph ? `para=${paragraph}` : '';
  return `${sourceRef}/${key}#${pagePart}${paraPart ? `#${paraPart}` : ''}`;
}

export class IngestionService {
  constructor(private deps: IngestionDeps) {}

  private isWantedCountry(objectKey: string, country?: string): boolean {
    if (!country) return true;
    const parsed = parseCorpusKey(objectKey, this.deps.cfg);
    return parsed.country === country || (country === 'india' && parsed.isAdvocateCases);
  }

  async discover(prefix?: string): Promise<Array<{ key: string; versionId: string; supported: boolean; corpus: boolean }>> {
    const all = await this.deps.source.list(prefix);
    return all.map(o => {
      const parsed = parseCorpusKey(o.key, this.deps.cfg);
      return {
        key: o.key,
        versionId: o.versionId,
        supported: isSupportedDocument(o.key),
        corpus: parsed.country !== null || parsed.isAdvocateCases
      };
    });
  }

  /** Ingest a single corpus document (used for both 'one' and batch modes). */
  async ingestDocument(
    key: string,
    versionId: string,
    opts: { dryRun?: boolean; chunkerConfig?: IngestOptions['config'] }
  ): Promise<DocIngestOutcome> {
    const { source, manifest, vdb, embedding, cfg } = this.deps;
    const parsed = parseCorpusKey(key, cfg);

    if (!isSupportedDocument(key) || (parsed.country === null && !parsed.isAdvocateCases)) {
      return { key, status: 'not-corpus', chunks: 0, versionId };
    }

    const country = parsed.country ?? 'india';
    const documentId = documentIdFrom({ country, s3Key: key, versionId });

    if (opts.dryRun) {
      return { key, status: 'dry-run', chunks: 0, versionId, documentId };
    }

    // ----- idempotency: same document/version, already ingested -> skip -----
    const existing = manifest.get(documentId);
    if (existing && existing.status === 'ingested') {
      return { key, status: 'skipped', chunks: existing.chunk_count, versionId, documentId };
    }

    try {
      const obj = await source.readObject(key);
      const effectiveVersion = obj.versionId || versionId;
      // Recompute identity with the authoritative version (S3 may return a
      // VersionId even when the list proxy differed).
      const docId = documentIdFrom({ country, s3Key: key, versionId: effectiveVersion });

      const extracted = extractText(obj.buffer, key);

      if (extracted.ocrRequired) {
        // Honest OCR boundary: text layer absent -> mark requires_ocr, do NOT
        // fabricate text, do NOT index anything. Still record the official
        // source + retrieval time so the document remains traceable.
        const sourceUrl = OFFICIAL_DOC_SOURCES[path.basename(key)] || null;
        await manifest.upsertDocument(
          {
            document_id: docId,
            s3_key: key,
            s3_version_id: effectiveVersion,
            country,
            title: filenameTitle(key),
            document_type: parsed.documentType,
            status: 'requires_ocr',
            chunk_count: 0,
            content_hash: '',
            ingested_at: new Date().toISOString(),
            source_url: sourceUrl,
            retrieved_at: sourceUrl ? new Date().toISOString() : null
          },
          []
        );
        return { key, status: 'requires_ocr', chunks: 0, versionId: effectiveVersion, documentId: docId };
      }

      const cleaned = cleanLegalText(extracted.pages);
      const docMeta = extractDocumentMetadata(
        parsed,
        key,
        path.basename(key),
        cleaned.text,
        sourceLabel(cfg),
        cfg.realCorpus && cfg.bucket ? cfg.bucket! : cfg.prefixRoot,
        cfg.sourceType,
        effectiveVersion
      );

      const chunker = chunkLegalDocument(cleaned.pageParagraphs, {
        ...DEFAULT_CHUNKER_CONFIG,
        ...(opts.chunkerConfig || {})
      });
      const chunks: LegalChunk[] = [];
      for (const c of chunker) {
        if (!c.text.trim()) continue;
        const md: LegalDocumentMetadata = {
          ...docMeta.metadata,
          chunk_index: String(c.chunk_index),
          page: c.page !== null ? String(c.page) : null,
          paragraph: c.paragraph !== null ? String(c.paragraph) : null,
          section: c.section,
          chunk_text: c.text,
          heading: c.heading,
          document_type: docMeta.metadata.document_type,
          status: 'ingested'
        };
        chunks.push({
          chunk_id: chunkIdFrom(docId, c.chunk_index),
          document_id: docId,
          chunk_index: c.chunk_index,
          text: c.text,
          page: c.page,
          paragraph: c.paragraph,
          section: c.section,
          heading: c.heading,
          metadata: md
        });
      }

      // ----- embed -----
      const texts = chunks.map(c => c.text);
      let vectors: number[][];
      try {
        const res = await embedding.embedTexts(texts);
        vectors = res.vectors;
        if (vectors.length !== texts.length) throw new Error('embedding count mismatch');
        if (vectors.some(v => v.length !== embedding.dimension)) {
          throw new Error(
            `embedding dimension mismatch: provider dimension=${embedding.dimension}`
          );
        }
      } catch (err: any) {
        return { key, status: 'failed', chunks: 0, versionId: effectiveVersion, error: `embedding failed: ${err.message}` };
      }

      // ----- version-change cleanup: remove stale chunks for prior versions of this key -----
      await this.removeStaleVersions(key, docId);

      // ----- insert into vector DB -----
      const ref = sourceLabel(cfg);
      const rows: VdbInsertPayload[] = chunks.map((c, i) => ({
        id: c.chunk_id,
        document_id: c.document_id,
        chunk_id: c.chunk_id,
        vector: vectors[i],
        text_reference: makeTextReference(ref, key, c.page, c.paragraph),
        metadata: chunkMetadataToVdb({ ...c.metadata, s3_bucket: cfg.realCorpus ? cfg.bucket : 'local-fixture', s3_key: key, s3_version_id: effectiveVersion }),
        embedding_model: embedding.model,
        embedding_version: String(embedding.dimension)
      }));
      const result = await vdb.insertMany(rows);
      if (result.failed.length) {
        logger.warn(`VDB partial failure for ${key}: ${result.failed.length}/${rows.length} inserts failed`);
      }

      await manifest.upsertDocument(
        {
          document_id: docId,
          s3_key: key,
          s3_version_id: effectiveVersion,
          country,
          title: docMeta.metadata.title,
          document_type: parsed.documentType,
          status: rows.length ? 'ingested' : 'failed',
          chunk_count: rows.length,
          content_hash: '',
          ingested_at: new Date().toISOString(),
          source_url: docMeta.metadata.source_url || null,
          retrieved_at: docMeta.metadata.retrieved_at || null
        },
        chunks.map(c => c.chunk_id)
      );

      return { key, status: rows.length ? 'ingested' : 'failed', chunks: rows.length, versionId: effectiveVersion, documentId: docId };
    } catch (err: any) {
      logger.warn(`Ingestion failed for ${key}: ${err.message}`);
      return { key, status: 'failed', chunks: 0, versionId, error: err.message };
    }
  }

  /** Remove prior-version chunks for the same S3 key (stale vector cleanup)
   *  plus anything recorded left over for that key. */
  private async removeStaleVersions(key: string, currentDocId: string): Promise<number> {
    const { manifest, vdb } = this.deps;
    let removed = 0;
    for (const entry of manifest.allDocuments()) {
      if (entry.s3_key !== key || entry.document_id === currentDocId) continue;
      const otherDocId = entry.document_id;
      for (const cid of manifest.chunkIds(otherDocId)) {
        try {
          await vdb.delete(cid);
          removed++;
        } catch (err: any) {
          logger.warn(`stale chunk delete failed ${cid}: ${err.message}`);
        }
      }
      await manifest.removeDocument(otherDocId);
    }
    return removed;
  }

  async run(opts: IngestOptions): Promise<IngestionRunStats> {
    const started = Date.now();
    const { manifest, vdb, embedding, cfg, source } = this.deps;
    const embeddingCfg = { provider: embedding.name, model: embedding.model, dimension: embedding.dimension, fixture: embedding.fixture };
    const stats: IngestionRunStats = {
      status: 'ok',
      source: cfg.sourceType,
      realCorpus: cfg.realCorpus,
      mode: opts.dryRun ? 'dry-run' : 'ingest',
      scope: opts.scope,
      discovered: 0,
      processed: 0,
      skipped: 0,
      failed: 0,
      requiresOcr: 0,
      chunks: 0,
      embeddings: 0,
      vectorsInserted: 0,
      vectorsDeleted: 0,
      elapsedMs: 0,
      embedding: embeddingCfg,
      errors: [],
      documents: []
    };

    let candidates: Array<{ key: string; versionId: string }> = [];
    let wantable: Array<{ key: string; versionId: string }> = [];

    switch (opts.scope) {
      case 'one': {
        if (!opts.key) {
          stats.status = 'error';
          stats.errors.push('scope=one requires a key');
          return stats;
        }
        const all = await source.list();
        const found = all.find(o => o.key === opts.key);
        if (!found) {
          stats.status = 'error';
          stats.errors.push(`object not found in corpus: ${opts.key}`);
          return stats;
        }
        candidates = [{ key: found.key, versionId: found.versionId }];
        break;
      }
      case 'selected': {
        const all = await source.list();
        const byKey = new Map(all.map(o => [o.key, o]));
        candidates = (opts.keys || []).map(k => {
          const o = byKey.get(k);
          if (!o) stats.errors.push(`selected key not found: ${k}`);
          return o ? { key: o.key, versionId: o.versionId } : { key: k, versionId: 'missing' };
        }).filter(c => c.versionId !== 'missing' || true);
        candidates = candidates.filter(c => c.versionId !== 'missing');
        break;
      }
      case 'prefix': {
        const all = await source.list(opts.prefix);
        candidates = all.map(o => ({ key: o.key, versionId: o.versionId }));
        break;
      }
      case 'all': {
        const all = await source.list();
        candidates = all.map(o => ({ key: o.key, versionId: o.versionId }));
        break;
      }
    }

    wantable = candidates.filter(c => this.isWantedCountry(c.key, opts.country));
    stats.discovered = wantable.length;

    for (const c of wantable) {
      const outcome = await this.ingestDocument(c.key, c.versionId, {
        dryRun: !!opts.dryRun,
        chunkerConfig: opts.config
      });
      if (outcome.error) stats.errors.push(`${outcome.key}: ${outcome.error}`);
      switch (outcome.status) {
        case 'dry-run':
        case 'not-corpus':
          stats.processed++;
          stats.documents.push({ key: outcome.key, status: 'dry-run', chunks: 0, versionId: outcome.versionId });
          break;
        case 'ingested':
          stats.processed++;
          stats.chunks += outcome.chunks;
          stats.vectorsInserted += outcome.chunks;
          stats.documents.push({ key: outcome.key, status: 'ingested', chunks: outcome.chunks, versionId: outcome.versionId });
          break;
        case 'skipped':
          stats.skipped++;
          stats.documents.push({ key: outcome.key, status: 'skipped', chunks: outcome.chunks, versionId: outcome.versionId });
          break;
        case 'requires_ocr':
          stats.requiresOcr++;
          stats.errors.push(`${outcome.key}: no text layer; requires OCR/manual review (no fabricated text)`);
          stats.documents.push({ key: outcome.key, status: 'requires_ocr', chunks: 0, versionId: outcome.versionId });
          break;
        case 'failed':
          stats.failed++;
          stats.documents.push({ key: outcome.key, status: 'failed', chunks: 0, versionId: outcome.versionId });
          break;
      }
    }

    stats.embeddings = stats.chunks;
    stats.elapsedMs = Date.now() - started;
    if (stats.failed > 0 && stats.processed === 0) stats.status = 'error';
    else if (stats.failed > 0) stats.status = 'partial';

    logger.info(`Phase 9 ingest run: ${stats.processed} processed, ${stats.skipped} skipped, ${stats.failed} failed, ${stats.chunks} chunks`);
    return stats;
  }
}

function filenameTitle(key: string): string | null {
  const base = path.basename(key).replace(/\.[a-zA-Z0-9]+$/, '');
  return base ? base.replace(/[_\-]+/g, ' ').trim() : null;
}

export function buildIngestionDeps(
  source: CorpusSource,
  manifest: CorpusManifest,
  vdb: VectorDbClient,
  embedding: LegalEmbeddingProvider,
  storageDir: string
): IngestionDeps {
  return {
    source,
    manifest,
    vdb,
    embedding,
    cfg: corpusConfig(),
    storageDir
  };
}