// Corpus ingest manifest: local durable record of which documents/versions
// were ingested and which chunk ids belong to them. Enables idempotent
// re-ingestion, version-change detection, and stale-chunk removal.
// Non-transactional metadata -> JSON store (mirrors jsonStore pattern), NOT
// PostgreSQL, since the corpus is not application data.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CorpusDocumentEntry } from '../../types/legalTypes.js';
import { logger } from '../../utils/logger.js';

interface ManifestFile {
  version: number;
  documents: Record<string, CorpusDocumentEntry>;
  chunkIdsByDocument: Record<string, string[]>;
}

export class CorpusManifest {
  private file: string;
  private data: ManifestFile = { version: 1, documents: {}, chunkIdsByDocument: {} };
  private loaded = false;

  constructor(private dataDir: string) {
    this.file = path.join(dataDir, 'legal-corpus-manifest.json');
  }

  static defaultDataDir(): string {
    return process.env.NYAYAI_DATA_DIR?.trim()
      ? path.resolve(process.env.NYAYAI_DATA_DIR.trim())
      : path.resolve(process.cwd(), 'data');
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      this.data = {
        version: 1,
        documents: parsed.documents || {},
        chunkIdsByDocument: parsed.chunkIdsByDocument || {}
      };
    } catch {
      this.data = { version: 1, documents: {}, chunkIdsByDocument: {} };
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    await fs.rename(tmp, this.file);
  }

  get(documentId: string): CorpusDocumentEntry | undefined {
    return this.data.documents[documentId];
  }

  chunkIds(documentId: string): string[] {
    return this.data.chunkIdsByDocument[documentId] || [];
  }

  allDocuments(): CorpusDocumentEntry[] {
    return Object.values(this.data.documents).sort((a, b) =>
      a.s3_key.localeCompare(b.s3_key)
    );
  }

  async upsertDocument(
    entry: CorpusDocumentEntry,
    chunkIds: string[]
  ): Promise<void> {
    this.data.documents[entry.document_id] = entry;
    this.data.chunkIdsByDocument[entry.document_id] = chunkIds;
    await this.persist();
  }

  async removeDocument(documentId: string): Promise<string[]> {
    const ids = this.chunkIds(documentId);
    delete this.data.chunkIdsByDocument[documentId];
    delete this.data.documents[documentId];
    await this.persist();
    return ids;
  }

  stats(): { documents: number; chunks: number } {
    let chunks = 0;
    for (const ids of Object.values(this.data.chunkIdsByDocument)) chunks += ids.length;
    return { documents: Object.keys(this.data.documents).length, chunks };
  }

  chunkIdsForPrefix(prefix: string): Array<{ documentId: string; chunkIds: string[] }> {
    const out: Array<{ documentId: string; chunkIds: string[] }> = [];
    for (const entry of Object.values(this.data.documents)) {
      if (prefix && !entry.s3_key.startsWith(prefix)) continue;
      out.push({ documentId: entry.document_id, chunkIds: this.data.chunkIdsByDocument[entry.document_id] || [] });
    }
    return out;
  }
}

export function createCorpusManifest(env: NodeJS.ProcessEnv = process.env): CorpusManifest {
  const dir = env.NYAYAI_DATA_DIR?.trim()
    ? path.resolve(env.NYAYAI_DATA_DIR.trim())
    : CorpusManifest.defaultDataDir();
  const manifest = new CorpusManifest(dir);
  manifest.load().catch(err => logger.warn(`Manifest load failed: ${err.message}`));
  return manifest;
}