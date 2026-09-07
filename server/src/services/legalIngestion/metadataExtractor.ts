// Legal metadata extraction/normalization.
// Rule: only populate a field when it can be reliably derived from the corpus
// key, filename or document text. Unknown stays null — metadata is never
// fabricated.
import type { LegalDocumentMetadata, LegalCorpusSourceType } from '../../types/legalTypes.js';
import type { ParsedKey } from '../legalCorpus/corpusLayout.js';
import { corpusConfig } from '../legalCorpus/corpusLayout.js';
import path from 'node:path';

const YEAR_RE = /(19\d{2}|20\d{2})/;
const DECISION_DATE_RE = /\b(?:decided|dated|judgment)\b[^0-9]{0,40}?(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/i;
const CASE_ID_RES = [
  /\b(?:criminal|civil)?\s*(?:appeal|petition|writ|w\.p|misc|case|suit|company petition)\s*(?:no\.?|no|case)?\s*(\d+)\s*\/\s*(\d{4})\b/i,
  /\b(\d{4})\s+(?:INSC|SCC|AIR|CriLJ|CrLJ|ILR|KantLJ)\b/i,
  /\b(?:AIR|SCC|CrLJ|ILR|KantLJ)\s+(\d{4})\s+(?:SC|HC|\d+)\b/i
];

const PRACTICE_KEYWORDS: Array<{ area: string; re: RegExp }> = [
  { area: 'criminal', re: /\b(murder|arrest|bail|theft|rioting|robbery|homicide|offence|offense|ipc|penal code|conviction|unlawful)\b/i },
  { area: 'constitutional', re: /\b(fundamental right|habeas corpus|article 21|article 14|article 19|writ petition|constitutional|right to life|personal liberty)\b/i },
  { area: 'property', re: /\b(transfer of property|rent control|tenancy|easement|partition|eviction|immovable property|land lord|khasra)\b/i },
  { area: 'contract', re: /\b(contract act|breach of contract|agreement|consideration|indemnity|liquidated damages|specific performance)\b/i },
  { area: 'family', re: /\b(divorce|custody|maintenance|family court|guardian|hindu marriage|succession)\b/i },
  { area: 'corporate', re: /\b(companies act|insolvency|shareholder|director|incorporation|corporate)\b/i }
];

const ACT_ALIASES: Array<{ act: string; re: RegExp }> = [
  { act: 'Indian Penal Code, 1860', re: /\bipc\b|\bindian penal code\b/i },
  { act: 'Code of Criminal Procedure, 1973', re: /\bcrpc\b|\bcode of criminal procedure\b/i },
  { act: 'Constitution of India', re: /\bconstitution of india\b|\/constitution\//i },
  { act: 'Code of Civil Procedure, 1908', re: /\bcpc\b|\bcode of civil procedure\b/i },
  { act: 'Evidence Act, 1872', re: /\bindian evidence act\b|\bevidence act\b/i },
  { act: 'Transfer of Property Act, 1882', re: /\btransfer of property act\b/i },
  { act: 'Contract Act, 1872', re: /\b(indian )?contract act\b/i },
  { act: 'Bharatiya Nyaya Sanhita, 2023', re: /\bbharatiya nyaya sanhita\b|\bbns\b/i }
];

function derivePractice(text: string): string | null {
  for (const { area, re } of PRACTICE_KEYWORDS) {
    if (re.test(text)) return area;
  }
  return null;
}

function deriveYear(filename: string, text: string): string | null {
  const dm = DECISION_DATE_RE.exec(text);
  if (dm) return dm[3];
  const ym = YEAR_RE.exec(filename);
  if (ym) return ym[1];
  const y2 = YEAR_RE.exec(text.slice(0, 400));
  if (y2) return y2[1];
  return null;
}

function deriveCaseId(filename: string, text: string): string | null {
  for (const re of CASE_ID_RES) {
    const m = re.exec(filename) || re.exec(text);
    if (m) return m[0].trim();
  }
  return null;
}

function deriveCourt(text: string): { court: string; jurisdiction: string | null } | null {
  const arrival = text.slice(0, 1200);
  const m = /(SUPREME COURT OF INDIA|HIGH COURT OF (?:AT\s+)?[A-Z][A-Z\s]+|HIGH COURT AT [A-Z][A-Z\s]+|DISTRICT COURT(?: OF [A-Z][A-Z\s]+)?|SESSION COURT(?: OF [A-Z][A-Z\s]+)?)/i.exec(arrival);
  if (!m) return null;
  const courtName = m[1].replace(/\s+/g, ' ').trim();
  if (/SUPREME COURT/i.test(courtName)) return { court: 'Supreme Court', jurisdiction: null };
  if (/DISTRICT COURT/i.test(courtName)) return { court: 'District Court', jurisdiction: null };
  if (/SESSION COURT/i.test(courtName)) return { court: 'Session Court', jurisdiction: null };
  const state = /HIGH COURT(?: OF AT?)?\s+([A-Z][A-Z\s]+)?/i.exec(courtName);
  if (!state) return { court: 'High Court', jurisdiction: null };
  let jur = state[1]?.trim() || null;
  if (jur) jur = jur.replace(/^(?:OF|AT)\s+/i, '').trim();
  return { court: 'High Court', jurisdiction: jur || null };
}

function deriveAct(filename: string, text: string): string | null {
  for (const { act, re } of ACT_ALIASES) {
    if (re.test(filename) || re.test(text.slice(0, 800))) return act;
  }
  const titled = filename.replace(/[_\-]+/g, ' ');
  const m = /\b([A-Za-z][A-Za-z\s,-]{3,60})\s+Act\s*(?:,\s*)?(19\d{2}|20\d{2})?/i.exec(titled);
  if (m) return m[1].trim();
  return null;
}

function deriveTitle(filename: string): string | null {
  const base = path.basename(filename).replace(/\.[a-zA-Z0-9]+$/, '');
  if (!base) return null;
  return base.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Build normalized document metadata from the corpus key + extracted text.
 * Fields that cannot be reliably derived are null.
 */
export function extractDocumentMetadata(
  parsed: ParsedKey,
  key: string,
  filename: string,
  text: string,
  sourceLabel: string,
  corpusName: string,
  corpusSource: LegalCorpusSourceType,
  versionId: string
): {
  metadata: LegalDocumentMetadata;
  warns: string[];
} {
  const warns: string[] = [];
  const practice = derivePractice(text.slice(0, 2000));
  const year = deriveYear(filename, text);
  const court = deriveCourt(text);
  const act = deriveAct(filename, text);
  const caseId = deriveCaseId(filename, text);
  const title = deriveTitle(filename);

  if (parsed.country === null) warns.push(`key not recognized within corpus layout: ${key}`);

  const metadata: LegalDocumentMetadata = {
    document_type: parsed.documentType,
    court: court?.court ?? null,
    jurisdiction: court?.jurisdiction ?? null,
    country: parsed.country ?? 'india',
    case_id: caseId,
    advocate_id: parsed.isAdvocateCases ? parsed.advocateId : null,
    practice_area: practice,
    year,
    act,
    section: null, // sections are chunk-level (set during chunking)
    title,
    source: sourceLabel,
    corpus_name: corpusName,
    corpus_source: corpusSource,
    s3_key: key,
    s3_version_id: versionId
  };
  return { metadata, warns };
}

export function sourceLabel(cfg: ReturnType<typeof corpusConfig>): string {
  return cfg.realCorpus && cfg.bucket ? `s3://${cfg.bucket}` : `fixture://`;
}