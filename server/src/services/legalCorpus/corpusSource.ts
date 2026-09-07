// Corpus source abstraction: a real S3 corpus OR a clearly-marked local
// fixture tree (used when AWS is not configured). Both expose the same
// list/read surface so the ingestion pipeline is source-agnostic.
import { promises as fs, createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import type { CorpusObjectMeta } from '../../types/legalTypes.js';
import { logger } from '../../utils/logger.js';

export interface CorpusSource {
  readonly type: 's3' | 'local-fixture';
  readonly realCorpus: boolean;
  readonly label: string;
  list(prefix?: string): Promise<CorpusObjectMeta[]>;
  readObject(key: string): Promise<{ buffer: Buffer; versionId: string; contentType: string | null }>;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf'
};

function contentTypeFor(key: string): string | null {
  const ext = path.extname(key).toLowerCase();
  return CONTENT_TYPE_BY_EXT[ext] || null;
}

/** Deterministic local fixture source. Keys are relative to the fixture root
 *  (which mirrors the bucket layout). */
export class LocalCorpusSource implements CorpusSource {
  readonly type = 'local-fixture' as const;
  readonly realCorpus = false;
  readonly label: string;

  constructor(readonly root: string) {
    this.label = `fixture://${root}`;
  }

  async list(prefix = ''): Promise<CorpusObjectMeta[]> {
    const results: CorpusObjectMeta[] = [];
    const walk = async (dir: string, rel: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const full = path.join(dir, e.name);
        const key = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) await walk(full, key);
        else {
          if (!prefix || key.startsWith(prefix)) {
            const st = await fs.stat(full);
            results.push({
              key,
              size: st.size,
              versionId: `${Math.round(st.mtimeMs)}-${st.size}`,
              lastModified: st.mtime.toISOString()
            });
          }
        }
      }
    };
    await walk(this.root, '');
    return results.sort((a, b) => a.key.localeCompare(b.key));
  }

  async readObject(key: string): Promise<{ buffer: Buffer; versionId: string; contentType: string | null }> {
    const full = path.join(this.root, key);
    const content = await fs.readFile(full);
    const st = await fs.stat(full);
    const versionId = `${Math.round(st.mtimeMs)}-${st.size}`;
    return { buffer: content, versionId, contentType: contentTypeFor(key) };
  }
}

/** Real S3 corpus source using the standard AWS SDK credential chain
 *  (env vars / role / config). Optionally supports a custom endpoint
 *  (S3_ENDPOINT) + path-style addressing for MinIO / LocalStack. */
export class S3CorpusSource implements CorpusSource {
  readonly type = 's3' as const;
  readonly realCorpus = true;
  readonly label: string;

  private clientPromise: Promise<any> | null = null;
  private bucket: string;

  constructor(bucket: string, readonly prefix: string, readonly region?: string) {
    this.bucket = bucket;
    this.label = `s3://${bucket}${prefix ? `/${prefix}` : ''}`;
  }

  private async s3(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import('@aws-sdk/client-s3');
        const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
        return {
          client: new S3Client({
            region: this.region || process.env.AWS_REGION || 'us-east-1',
            ...(endpoint ? { endpoint, forcePathStyle: true } : {})
          }),
          ListObjectsV2Command,
          GetObjectCommand
        };
      })();
    }
    return this.clientPromise;
  }

  async list(prefix = ''): Promise<CorpusObjectMeta[]> {
    const { client, ListObjectsV2Command } = await this.s3();
    const results: CorpusObjectMeta[] = [];
    let continuationToken: string | undefined;
    const effectivePrefix = this.prefix || '';
    do {
      const cmd = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: effectivePrefix ? `${effectivePrefix}/${prefix}` : prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      });
      const res = await client.send(cmd);
      for (const obj of res.Contents || []) {
        if (!obj.Key) continue;
        // versionId is not present on ListObjectsV2; use LastModified as a
        // deterministic change proxy; GetObject may refine it later.
        results.push({
          key: obj.Key,
          size: obj.Size || 0,
          versionId: obj.LastModified
            ? `${Math.round(obj.LastModified.getTime())}-${obj.Size || 0}`
            : `size-${obj.Size || 0}`,
          lastModified: obj.LastModified ? obj.LastModified.toISOString() : null
        });
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);
    return results;
  }

  async readObject(key: string): Promise<{ buffer: Buffer; versionId: string; contentType: string | null }> {
    const { client, GetObjectCommand } = await this.s3();
    const res = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await res.Body.transformToByteArray();
    return {
      buffer: Buffer.from(bytes),
      versionId: res.VersionId || `mw-${res.LastModified?.getTime() || Date.now()}-${bytes.byteLength}`,
      contentType: res.ContentType || contentTypeFor(key)
    };
  }
}

/** Build the configured source. Real S3 only when CORPUS_SOURCE=s3 AND
 *  S3_BUCKET is set; otherwise a local fixture tree (explicitly non-real). */
export function getCorpusSource(env: NodeJS.ProcessEnv = process.env, fsRoot = resolveFixtureDir()): CorpusSource {
  if (env.CORPUS_SOURCE === 's3' && env.S3_BUCKET?.trim()) {
    const bucket = env.S3_BUCKET.trim();
    logger.info(`Phase 9 corpus source: REAL S3 (s3://${bucket})`);
    return new S3CorpusSource(bucket, env.S3_PREFIX?.trim() || '', env.AWS_REGION);
  }
  const root = env.CORPUS_FIXTURE_DIR?.trim() || fsRoot;
  logger.warn(`Phase 9 corpus source: local fixture tree only (${root}). No real legal corpus ingested.`);
  return new LocalCorpusSource(root);
}

export function resolveFixtureDir(): string {
  // server/fixtures/legal-corpus
  const speculated = path.resolve(process.cwd(), 'fixtures', 'legal-corpus');
  try {
    const st = statSync(speculated);
    if (st.isDirectory()) return speculated;
  } catch {
    /* fall through */
  }
  // During tests the cwd may be the repo root; search both.
  try {
    const alt = path.resolve(process.cwd(), 'server', 'fixtures', 'legal-corpus');
    if (statSync(alt).isDirectory()) return alt;
  } catch {
    /* ignore */
  }
  return speculated;
}

export function createReadStreamSafe(key: string): any {
  return createReadStream(key);
}