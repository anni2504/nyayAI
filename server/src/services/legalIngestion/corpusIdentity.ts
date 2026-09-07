// Deterministic legal document/chunk identity.
//
// document_id = sha256(country + ':' + s3_key + ':' + versionId)
//   - stable across ingestion runs for the same S3 object/version
//   - changes when the S3 version changes -> old chunks are distinguishable
// chunk_id    = sha256(document_id + ':' + chunkIndex)
//   - deterministic given the same document + chunk position
import { createHash } from 'node:crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function documentIdFrom(parts: { country: string; s3Key: string; versionId: string }): string {
  return sha256([parts.country, parts.s3Key, parts.versionId].join(':'));
}

export function chunkIdFrom(documentId: string, chunkIndex: number): string {
  return sha256(`${documentId}:${chunkIndex}`);
}

/** Short human-friendly prefix of a stable id (for logs/UI). */
export function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 12) : id;
}