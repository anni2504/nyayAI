#!/usr/bin/env node
/*
 * Optional step in ingestLegalCorpus.mjs: fetch the OFFICIAL Constitution PDFs
 * (Government of India / U.S. National Government Publishing Office) into the
 * local fixture tree so the Legal Corpus can serve the REAL document. If a
 * fetch fails it logs and continues — the existing local fixtures remain.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));

const SOURCES = [
  {
    country: 'india',
    label: 'Constitution of India (Legislative Department, Ministry of Law and Justice)',
    url: 'https://www.legislative.gov.in/static/uploads/2025/07/c9fe9c9b6840524844316f74bb1c556c.pdf',
    file: 'india/constitution/constitution-of-india-official.pdf'
  },
  {
    country: 'usa',
    label: 'Constitution of the United States (U.S. GPO, H.Doc. 110-50)',
    url: 'https://www.govinfo.gov/content/pkg/CDOC-110hdoc50/pdf/CDOC-110hdoc50.pdf',
    file: 'usa/constitution/constitution-of-united-states-official.pdf'
  }
];

export default async function downloadConstitutions() {
  const root = join(serverDir, 'fixtures', 'legal-corpus');
  let ok = 0;
  for (const src of SOURCES) {
    const target = join(root, src.file);
    if (existsSync(target)) {
      console.log(`[constitutions] already present: ${src.file}`);
      ok++;
      continue;
    }
    try {
      console.log(`[constitutions] fetching ${src.url} ...`);
      const res = await fetch(src.url, {
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
        redirect: 'follow',
        signal: AbortSignal.timeout(90_000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 10_000) throw new Error(`response too small (${buf.length} bytes)`);
      if (buf.subarray(0, 4).toString() !== '%PDF') throw new Error('response is not a PDF');
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, buf);
      console.log(`[constitutions] saved ${src.file} (${(buf.length / 1024).toFixed(0)} KiB)`);
      ok++;
    } catch (err) {
      console.warn(`[constitutions] SKIPPED ${src.country}: ${err.message}`);
    }
  }
  console.log(`[constitutions] ${ok}/${SOURCES.length} official PDFs available`);
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  downloadConstitutions().then(n => process.exit(n === SOURCES.length ? 0 : 1));
}