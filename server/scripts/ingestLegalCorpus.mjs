#!/usr/bin/env node
/*
 * Explicit legal-corpus ingest script (option the user chose).
 *
 * Runs the REAL ingestion pipeline end to end and prints honest per-document
 * results: files discovered -> extracted -> cleaned -> chunked -> embedded ->
 * inserted into the vector DB (or marked requires_ocr / failed). Because doc &
 * chunk ids are deterministic and the manifest is durable, re-running is cheap
 * and idempotent.
 *
 * Optional flag --download-constitutions fetches authoritative text for the
 * India + US Constitutions into the fixture tree before ingestion.
 *
 * Usage (from server/):
 *   node scripts/ingestLegalCorpus.mjs                  # local fixture tree
 *   node scripts/ingestLegalCorpus.mjs --download-constitutions
 *   CORPUS_SOURCE=s3 S3_BUCKET=... node scripts/ingestLegalCorpus.mjs
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));
execSync('npm run build', { stdio: 'ignore', cwd: serverDir });

const downloadConstitutions = process.argv.includes('--download-constitutions');
if (downloadConstitutions) {
  await import('./downloadConstitutions.mjs').then(m => m.default());
}

const { createLegalStack } = await import(join(serverDir, 'dist', 'services', 'legalService.js'));

const stack = createLegalStack();
const stats = await stack.ingest({ scope: 'all' });

await stack.manifest.load();
const manifestStats = stack.manifest.stats();
const byCountry = new Map();
const byType = new Map();
for (const d of stack.manifest.allDocuments()) {
  byCountry.set(d.country, (byCountry.get(d.country) || 0) + 1);
  byType.set(d.document_type, (byType.get(d.document_type) || 0) + 1);
}

console.log('\n=== Legal corpus ingest summary ===');
console.log(`source:                 ${stats.source} (${stack.cfg.prefixRoot})`);
console.log(`discovered:             ${stats.discovered}`);
console.log(`ingested:               ${stats.processed}`);
console.log(`skipped (idempotent):   ${stats.skipped}`);
console.log(`requires_ocr:           ${stats.requiresOcr}`);
console.log(`failed:                 ${stats.failed}`);
console.log(`chunks indexed:         ${stats.chunks}`);
console.log(`manifest documents:     ${manifestStats.documents}`);
console.log(`manifest chunks:        ${manifestStats.chunks}`);
console.log(`documents by country:   ${[...byCountry.entries()].map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`);
console.log(`documents by type:      ${[...byType.entries()].map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`);
if (process.env.CORPUS_SOURCE === 's3' && process.env.S3_BUCKET) {
  if (process.env.LEGAL_DOWNLOAD_CONSTITUTIONS) console.log('note: real S3 corpus mode; fixture constitution downloader unavailable');
} else {
  console.log('note: local fixture tree; set CORPUS_SOURCE=s3 + S3_BUCKET for a real corpus');
}
if (stats.errors && stats.errors.length) {
  console.log('errors:');
  for (const e of stats.errors.slice(0, 20)) console.log(`  - ${e}`);
}
process.exit(stats.failed > 0 && stats.processed === 0 ? 1 : 0);