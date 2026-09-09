// Legal corpus bucket/key layout.
//
//   s3://<bucket>/            (or fixture root for local testing)
//     india/constitution/
//     india/statutes/
//     india/supreme-court/
//     india/high-courts/
//     india/regulations/
//     usa/constitution/
//     advocate-cases/<advocate_id>/
//
// "india" and "usa" are the enabled country layouts. The exact bucket and
// prefix root are configurable.
import type { LegalCorpusConfig, LegalCorpusSourceType } from '../../types/legalTypes.js';

export const SUPPORTED_COUNTRIES = ['india', 'usa'] as const;
export type Country = (typeof SUPPORTED_COUNTRIES)[number];

export const INDIA_TOP_LEVELS = [
  'constitution',
  'statutes',
  'supreme-court',
  'high-courts',
  'regulations'
] as const;

export const USA_TOP_LEVELS = ['constitution'] as const;

export const ADVOCATE_CASES_PREFIX = 'advocate-cases';

const DOCUMENT_TYPE_BY_TOP: Record<string, string> = {
  constitution: 'constitution',
  statutes: 'statute',
  regulations: 'regulation',
  'supreme-court': 'judgment',
  'high-courts': 'judgment',
  'advocate-cases': 'case_history'
};

/** Recognized legal doc types (spec-required vocabulary). */
export const LEGAL_DOCUMENT_TYPES = [
  'constitution',
  'statute',
  'regulation',
  'judgment',
  'case_history'
] as const;

export const PRACTICE_AREAS = [
  'criminal',
  'constitutional',
  'property',
  'contract',
  'family',
  'corporate'
] as const;

export const INDIAN_COURTS = [
  'Supreme Court',
  'High Court',
  'District Court',
  'Session Court'
] as const;

export function corpusConfig(env: NodeJS.ProcessEnv = process.env): LegalCorpusConfig {
  const sourceType: LegalCorpusSourceType =
    (env.CORPUS_SOURCE as LegalCorpusSourceType) === 's3' ? 's3' : 'local-fixture';
  const bucket = env.S3_BUCKET?.trim() || null;
  const prefixRoot = env.S3_CORPUS_PREFIX?.trim() || 'nyayai-legal-corpus';
  return {
    bucket,
    prefixRoot,
    countries: [...SUPPORTED_COUNTRIES],
    advocatePrefix: ADVOCATE_CASES_PREFIX,
    sourceType,
    // A "real" corpus requires an explicit s3 source + a configured bucket.
    realCorpus: sourceType === 's3' && !!bucket
  };
}

/** country layout root key (no leading slash). */
export function countryPrefix(country: string, cfg: LegalCorpusConfig): string {
  return `${cfg.prefixRoot}/${country}`;
}

/** advocate-cases layout root key. */
export function advocateCasesPrefix(cfg: LegalCorpusConfig): string {
  return `${cfg.prefixRoot}/${ADVOCATE_CASES_PREFIX}`;
}

export interface ParsedKey {
  country: string | null;
  topLevel: string | null;
  advocateId: string | null;
  documentType: string | null;
  relativePath: string;
  isAdvocateCases: boolean;
}

/** Decompose a corpus object key into its structural parts (or nulls when the
 *  key is not recognized as corpus material). */
export function parseCorpusKey(key: string, cfg: LegalCorpusConfig): ParsedKey {
  const rel = key.replace(`${cfg.prefixRoot}/`, '');
  const parts = rel.split('/').filter(Boolean);
  const parsed: ParsedKey = {
    country: null,
    topLevel: null,
    advocateId: null,
    documentType: null,
    relativePath: rel,
    isAdvocateCases: false
  };

  if (!parts.length) return parsed;
  const first = parts[0];

  // advocate-cases/<advocate_id>/<...>/file
  if (first === ADVOCATE_CASES_PREFIX) {
    parsed.isAdvocateCases = true;
    parsed.documentType = 'case_history';
    if (parts[1]) parsed.advocateId = parts[1];
    if (parts[2] && SUPPORTED_COUNTRIES.includes(parts[2] as Country)) {
      parsed.country = parts[2];
    } else {
      parsed.country = 'india'; // advocate-case material is Indian in the current layout
    }
    if (parts[3]) parsed.topLevel = parts[3];
    return parsed;
  }

  // india/<top>/[court/]/...
  if (SUPPORTED_COUNTRIES.includes(first as Country)) {
    parsed.country = first;
    if (parts[1]) parsed.topLevel = parts[1];
    parsed.documentType = DOCUMENT_TYPE_BY_TOP[parts[1]] || null;
    return parsed;
  }

  return parsed;
}

const FILE_EXT_RE = /\.([a-zA-Z0-9]{1,6})$/;

export function fileExtension(key: string): string | null {
  const m = FILE_EXT_RE.exec(key);
  return m ? m[1].toLowerCase() : null;
}

export function isSupportedDocument(key: string): boolean {
  return fileExtension(key) !== null;
}