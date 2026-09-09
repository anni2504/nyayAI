// Deterministic, dependency-free PDF generator for the synthetic advocate-case
// corpus. Emits professional A4 legal case-history documents.
//
// Layout: a proper document-flow engine. Blocks are wrapped into physical
// lines against the content width; a cursor (top-down) advances line by line;
// when the cursor passes the bottom margin a new page is created and the
// cursor resets to the top margin. Text is positioned with an explicit
// `Tm x y` text matrix, so nothing can collapse onto a single coordinate.
// A fixed header (rule + title) and footer (rule + "Page N of M") are drawn
// on every page.
//
// The SAME file users open is the file that is ingested, chunked, embedded and
// retrieved: the extractor decodes these FlateDecode/Helvetica BT-ET streams
// straight back to the identical text, so the PDF stays the canonical source.
import { deflateSync } from 'node:zlib';

export interface CasePdfSection {
  heading: string;
  body: string[];
}

export interface CasePdfData {
  caseId: string;
  title: string;
  advocateId: string;
  advocateName: string;
  practiceArea: string;
  jurisdiction: string;
  court: string;
  year: number;
  stage: string;
  outcome: string;
  summary: string;
  facts: string;
  issues: string;
  applicableLaw: string;
  evidence: string;
  arguments: string;
  relief: string;
  codeLines: string[];
  sections: CasePdfSection[];
}

// ---- Paper & margins (A4, points) ----
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 54;
const MARGIN_R = 54;
const MARGIN_TOP = 66;
const MARGIN_BOTTOM = 60;
export const CONTENT_WIDTH = PAGE_W - MARGIN_L - MARGIN_R;
export const CONTENT_HEIGHT = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM;
const TEXT_MAX = CONTENT_WIDTH;
// pdf-y of the first content baseline (top of the flow area)
const FLOW_TOP_Y = PAGE_H - MARGIN_TOP;

// ---- Typography ----
const BODY_SIZE = 10.5;
const BODY_LEAD = 13.9;
const H1_SIZE = 17;
const H1_LEAD = 21;
const H2_SIZE = 12.5;
const H2_LEAD = 16.5;
const META_SIZE = 10;
const META_LEAD = 13.2;
const SMALL_SIZE = 8.5;
const SMALL_LEAD = 10.5;

// ---- Approximate Helvetica advances (per 1/1000 em) for line wrapping ----
const HELV: Record<string, number> = {
  ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667,
  "'": 191, '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333,
  '.': 278, '/': 278, '0': 556, '1': 556, '2': 556, '3': 556, '4': 556,
  '5': 556, '6': 556, '7': 556, '8': 556, '9': 556, ':': 278, ';': 278,
  '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278,
  J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 278, '\\': 278, ']': 278, '^': 469, '_': 556, '`': 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222,
  j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333,
  s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  '{': 334, '|': 260, '}': 334, '~': 584
};

/** Estimated width of a rendered text run at a given font size. */
export function textWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) {
    const adv = HELV[ch] ?? 556;
    w += (adv * size) / 1000;
  }
  return w;
}

/** Greedy word-wrap to a pixel width; hard-splits over-long words. */
export function wrapLines(text: string, size: number, maxWidth = TEXT_MAX): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    let piece = word;
    while (textWidth(line ? `${line} ${piece}` : piece, size) > maxWidth && textWidth(piece, size) > maxWidth) {
      // hard split the current word at the widest safe character
      let cut = Math.max(1, Math.floor((maxWidth / size) * 500));
      while (cut < piece.length && textWidth(piece.slice(0, cut), size) <= maxWidth) cut++;
      cut--;
      if (cut < 1) cut = 1;
      if (line && textWidth(`${line} ${piece.slice(0, cut)}`, size) <= maxWidth) {
        line = `${line} ${piece.slice(0, cut)}`;
        lines.push(line);
        line = '';
      } else {
        lines.push(piece.slice(0, cut));
      }
      piece = piece.slice(cut);
      if (!piece) break;
    }
    if (!piece) continue;
    if (line && textWidth(`${line} ${piece}`, size) > maxWidth) {
      lines.push(line);
      line = piece;
    } else {
      line = line ? `${line} ${piece}` : piece;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [' '];
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function toWinAnsi(s: string): string {
  return s.replace(/[^\x20-\x7E]/g, '');
}

// ---- Document flow ----
interface FlowLine {
  text: string;
  size: number;
  bold: boolean;
}

interface FlowBlock {
  kind: 'title' | 'heading' | 'body' | 'meta' | 'rule';
  text?: string;
  lines: FlowLine[];
  gapBefore: number;
  gapAfter: number;
}

function sectionHeading(text: string): FlowBlock {
  return {
    kind: 'heading',
    text,
    lines: [{ text, size: H2_SIZE, bold: true }],
    gapBefore: 11,
    gapAfter: 3
  };
}

function bodyPara(text: string): FlowBlock {
  const lines = wrapLines(text, BODY_SIZE).map(t => ({ text: t, size: BODY_SIZE, bold: false }));
  return { kind: 'body', lines, gapBefore: 3, gapAfter: 1 };
}

function metaRow(text: string): FlowBlock {
  return { kind: 'meta', lines: wrapLines(text, META_SIZE).map(t => ({ text: t, size: META_SIZE, bold: false })), gapBefore: 0, gapAfter: 0 };
}

function hr(): FlowBlock {
  return { kind: 'rule', lines: [], gapBefore: 6, gapAfter: 6 };
}

/** Paginate a block list into pages; each page is a list of flow lines. */
function paginateBlocks(blocks: FlowBlock[]): FlowLine[][] {
  const pages: FlowLine[][] = [];
  let page: FlowLine[] = [];
  let cursorY = 0;

  const ensureRoomFor = (height: number) => {
    if (cursorY > 0 && cursorY + height > CONTENT_HEIGHT) {
      pages.push(page);
      page = [];
      cursorY = 0;
    }
  };

  for (const block of blocks) {
    if (block.kind === 'rule') {
      ensureRoomFor(4);
      page.push({ text: '__RULE__', size: 0, bold: false });
      cursorY += 4;
      continue;
    }
    const lead = block.lines[0]?.size === H2_SIZE ? H2_LEAD
      : block.lines[0]?.size === H1_SIZE ? H1_LEAD
      : block.lines[0]?.size === META_SIZE ? META_LEAD
      : BODY_LEAD;
    const height = lead * block.lines.length;
    // keep headings from being orphaned at the very bottom of a page
    if (block.kind === 'heading') {
      ensureRoomFor(height + lead);
    } else {
      ensureRoomFor(height + block.gapAfter);
    }
    for (const line of block.lines) {
      if (cursorY + lead > CONTENT_HEIGHT) {
        // single line taller than the remaining page (only for oversized blocks)
        pages.push(page);
        page = [];
        cursorY = 0;
      }
      page.push(line);
      cursorY += lead;
    }
    if (cursorY > 0) cursorY += block.gapAfter;
  }
  pages.push(page);
  return pages;
}

/** Compose the case-history document blocks from the canonical case data. */
function composeBlocks(data: CasePdfData): FlowBlock[] {
  const blocks: FlowBlock[] = [];
  const yr = data.year;

  blocks.push({
    kind: 'title',
    text: data.caseId,
    lines: [{ text: data.caseId, size: H1_SIZE, bold: true }],
    gapBefore: 2,
    gapAfter: 4
  });

  const metaRows: string[] = [
    `CASE ID: ${data.caseId}.`,
    `ADVOCATE: ${data.advocateName} (${data.advocateId}).`,
    `PRACTICE AREA: ${data.practiceArea}.`,
    `JURISDICTION: ${data.jurisdiction}.`,
    `COURT: ${data.court}.`,
    `PROCEDURAL STAGE: ${data.stage}.`,
    `DECIDED ON: 12/09/${yr}.`,
    `FORUM: HIGH COURT OF ${data.jurisdiction.toUpperCase()}.`,
    `OUTCOME: ${data.outcome}`
  ];
  for (const r of metaRows) blocks.push(metaRow(r));
  blocks.push(metaRow(`MATTER NO.: ${data.caseId} - ${data.practiceArea} - ${data.jurisdiction}.`));
  blocks.push(hr());

  const sections: Array<[string, string]> = [
    ['CASE SUMMARY', data.summary],
    ['FACTS', data.facts],
    ['LEGAL ISSUES', data.issues],
    ['APPLICABLE LAW', data.applicableLaw],
    ['EVIDENCE', data.evidence],
    ['ARGUMENTS', data.arguments],
    ['RELIEF SOUGHT', data.relief],
    ['OUTCOME', data.outcome]
  ];
  for (const [heading, para] of sections) {
    blocks.push(sectionHeading(heading));
    blocks.push(bodyPara(para));
  }

  blocks.push(sectionHeading('CASE METADATA'));
  for (const line of data.codeLines) blocks.push(metaRow(line));

  blocks.push(hr());
  blocks.push(sectionHeading('SYNTHETIC DEMONSTRATION DATA - NOT A REAL LEGAL CASE'));
  return blocks;
}

// ---- Content stream rendering ----

function renderTextOp(text: string, size: number, bold: boolean, x: number, y: number): string {
  const font = bold ? 'F2' : 'F1';
  const width = textWidth(text, size);
  return `BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapeText(toWinAnsi(text))}) Tj ET`;
}

function renderRuleOp(x1: number, y: number, x2: number): string {
  return `${x1} ${y.toFixed(2)} m ${x2} ${y.toFixed(2)} l S`;
}

function renderPageContent(lines: FlowLine[], caseId: string, pageNo: number, totalPages: number): string {
  const ops: string[] = ['0.7 w'];

  // ---- header band ----
  ops.push(renderTextOp(`NYAYAI - ADVOCATE CASE HISTORY - ${caseId}`, SMALL_SIZE, true, MARGIN_L, PAGE_H - 38));
  ops.push(renderRuleOp(MARGIN_L, PAGE_H - 44, PAGE_W - MARGIN_R));

  // ---- footer band ----
  const footer = `Page ${pageNo} of ${totalPages}  -  Synthetic demonstration data - not a real legal case.`;
  const fw = textWidth(footer, SMALL_SIZE);
  ops.push(renderRuleOp(MARGIN_L, 48, PAGE_W - MARGIN_R));
  ops.push(renderTextOp(footer, SMALL_SIZE, false, (PAGE_W - fw) / 2, 36));

  // ---- body flow ----
  let cursorY = 0;
  for (const line of lines) {
    if (line.text === '__RULE__') {
      ops.push(renderRuleOp(MARGIN_L, FLOW_TOP_Y - cursorY - 2, PAGE_W - MARGIN_R));
      cursorY += 4;
      continue;
    }
    const y = FLOW_TOP_Y - cursorY;
    ops.push(renderTextOp(line.text, line.size, line.bold, MARGIN_L, y));
    cursorY += line.size === H1_SIZE ? H1_LEAD : line.size === H2_SIZE ? H2_LEAD : line.size === META_SIZE ? META_LEAD : BODY_LEAD;
  }

  return ops.join('\n');
}

function buildPdf(data: CasePdfData): Buffer {
  const blocks = composeBlocks(data);
  const pages = paginateBlocks(blocks);
  const total = pages.length;

  const f1Num = 3 + total * 2;
  const f2Num = f1Num + 1;

  const objects: Array<{ body: string }> = [];

  // 1: catalog
  objects.push({ body: '<< /Type /Catalog /Pages 2 0 R >>' });
  // 2: pages
  const pageObjNums: number[] = [];
  for (let i = 0; i < total; i++) pageObjNums.push(3 + i * 2);
  const kids = pageObjNums.map(n => `${n} 0 R`).join(' ');
  objects.push({ body: `<< /Type /Pages /Kids [ ${kids} ] /Count ${total} >>` });

  // page + content objects (fonts registered by their final object numbers)
  for (let i = 0; i < total; i++) {
    const content = renderPageContent(pages[i], data.caseId, i + 1, total);
    const compressed = deflateSync(Buffer.from(content, 'ascii'), { level: 9 });
    objects.push({
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${f1Num} 0 R /F2 ${f2Num} 0 R >> >> /Contents ${4 + i * 2} 0 R >>`
    });
    objects.push({
      body: `<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n${compressed.toString('binary')}\nendstream`
    });
  }

  // font objects (shared): Helvetica normal + bold
  objects.push({ body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' });
  objects.push({ body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>' });

  const chunks: string[] = [];
  chunks.push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  const offsets: number[] = [0];
  let pos = chunks[0].length;
  for (let i = 1; i <= objects.length; i++) {
    const chunk = `${i} 0 obj\n${objects[i - 1].body}\nendobj\n`;
    offsets.push(pos);
    pos += chunk.length;
    chunks.push(chunk);
  }

  const startxref = pos;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  chunks.push(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`);
  return Buffer.from(chunks.join(''), 'binary');
}

export function generateCasePdf(data: CasePdfData): Buffer {
  return buildPdf(data);
}

// ---- Deterministic case-data builder for the 10x10 advocate corpus ----

export interface AdvocateCaseSpec {
  advocateIndex: number; // 1..10
  caseIndex: number;     // 1..10
  advocateName: string;
  practiceArea: string;
  jurisdiction: string;
  court: string;
}

const PRACTICE_MATERIAL: Record<string, { facts: string; issues: string; law: string; evidence: string; outcome: string; summary: string; label: string }> = {
  criminal: {
    summary: 'Defence of a client accused of an offence, focused on the legality and fairness of the arrest, search and custodial process.',
    facts: 'The client was taken into custody, the grounds of arrest were not reduced to writing, and access to a legal practitioner was delayed. The accused remained in custody and the procedures governing arrest and remand were not fully observed.',
    issues: 'Whether the arrest complied with the safeguards attaching to personal liberty; whether denial of prompt access to counsel vitiates the pre-trial detention; and whether the charge is sustainable on the material on record.',
    law: 'The safeguards concerning arrest, detention and the right to be defended by a legal practitioner of one\'s choice, together with the procedural code governing criminal trial.',
    evidence: 'Witness depositions, custody records, the arrest memo, and the statement of the accused recorded at the first instance.',
    outcome: 'Proceedings concluded with appropriate findings as to the arrest procedure; the matter was disposed of on its merits.',
    label: 'DEFENCE OF AN ACCUSED PERSON - CRIMINAL PROCEEDINGS'
  },
  constitutional: {
    summary: 'Proceedings raising a question of fundamental rights and the enforceability of constitutional safeguards against an act of the State.',
    facts: 'A public authority took a measure alleged to affect the rights of the petitioner. No adequate opportunity was afforded before the impugned action, and the petitioner invoked constitutional remedies.',
    issues: 'Whether the impugned action infringes a constitutionally guaranteed right; whether the limitation on the right is justified and proportionate; and whether the remedy sought lies.',
    law: 'The fundamental rights provisions and the constitutional scheme governing the restriction of rights and the availability of writ remedies.',
    evidence: 'The petition, the impugned order or action, official correspondence and the affidavit of the petitioner.',
    outcome: 'The Court considered the constitutional question and disposed of the proceedings with the appropriate relief.',
    label: 'FUNDAMENTAL RIGHTS - WRIT PROCEEDINGS'
  },
  property: {
    summary: 'Dispute concerning immovable property, possession and the enforcement of rights in land and buildings.',
    facts: 'The parties claimed competing rights over an immovable property. Questions of title, possession and the effect of prior dealings between the parties arose.',
    issues: 'Whether the claimant established title and possession; whether any intervening transaction extinguished the right; and whether an order for possession or injunction is warranted.',
    law: 'The law relating to immovable property, transfer and possession, and the principles governing injunctions in property disputes.',
    evidence: 'Sale deeds, title documents, revenue records, site inspection report and the pleadings of the parties.',
    outcome: 'The rights of the parties were adjudicated upon and the dispute was resolved on the material placed on record.',
    label: 'PROPERTY RIGHTS - TITLE AND POSSESSION DISPUTE'
  },
  contract: {
    summary: 'A claim arising from an agreement, concerning the performance of contractual obligations and the consequences of breach.',
    facts: 'The parties entered into an agreement under which certain obligations were to be performed. One party alleges non-performance and consequential loss.',
    issues: 'Whether a valid agreement existed; whether the terms were breached; and whether the claimant is entitled to the relief sought, including compensation.',
    law: 'The law of contracts governing formation, performance and breach, and the measure of compensation for breach.',
    evidence: 'The written agreement, correspondence between the parties, invoices and the pleadings filed before the court.',
    outcome: 'The contractual rights and obligations were determined and the claim was disposed of accordingly.',
    label: 'CONTRACTUAL OBLIGATIONS - BREACH AND REMEDIES'
  },
  family: {
    summary: 'A family law matter concerning the status, obligations and remedies of the parties arising from a matrimonial or succession relationship.',
    facts: 'The parties are connected by a family relationship giving rise to rights and obligations. Differences arose and a party approached the court for relief.',
    issues: 'Whether the relationship and its attendant obligations are established; whether the relief sought is maintainable; and what order is just in the circumstances.',
    law: 'The personal law applicable to the parties together with the general law governing maintenance, custody and succession.',
    evidence: 'Marriage or relationship records, financial disclosures, and correspondence between the parties.',
    outcome: 'The court considered the welfare and rights of the parties and passed an appropriate order.',
    label: 'FAMILY MATTER - MAINTENANCE, CUSTODY AND RELIEF'
  },
  corporate: {
    summary: 'A commercial matter involving a company, its management or its creditors, concerning corporate obligations and recovery.',
    facts: 'A dispute arose touching upon the affairs of a company, the conduct of its management, or a claim by a creditor or shareholder.',
    issues: 'Whether there is a contravention of corporate or insolvency law; whether the petitioner or claimant has standing; and what relief should follow.',
    law: 'The statutory framework governing companies and insolvency, and the rules of procedure applicable to corporate disputes.',
    evidence: 'Statutory filings, board or shareholders\' records, financial statements and correspondence.',
    outcome: 'The corporate claim was adjudicated and the matter concluded with the appropriate order.',
    label: 'CORPORATE DISPUTE - OBLIGATIONS AND RECOVERY'
  }
};

export function buildAdvocateCaseData(spec: AdvocateCaseSpec): CasePdfData {
  const { advocateIndex, caseIndex, advocateName, practiceArea, jurisdiction, court } = spec;
  const caseNum = advocateIndex * 10 + caseIndex; // advocate 7, case 1 -> 71
  const caseId = `CASE-${String(caseNum).padStart(3, '0')}`;
  const year = 2016 + ((caseNum * 7) % 10);
  const m = PRACTICE_MATERIAL[practiceArea] || PRACTICE_MATERIAL.criminal;
  const matterRef = `Matter No. ${caseId} involving a ${practiceArea} dispute handled by the advocate in ${jurisdiction}.`;

  const CASE_REF_BY_AREA: Record<string, string> = {
    criminal: 'CRIMINAL APPEAL NO.',
    constitutional: 'WRIT NO.',
    property: 'CIVIL SUIT NO.',
    contract: 'CIVIL SUIT NO.',
    family: 'CIVIL SUIT NO.',
    corporate: 'MISC NO.'
  };
  const STATUTES_BY_AREA: Record<string, string> = {
    criminal: 'Code of Criminal Procedure, 1973; Indian Penal Code, 1860',
    constitutional: 'Constitution of India',
    property: 'Code of Civil Procedure, 1908; Transfer of Property Act, 1882',
    contract: 'Code of Civil Procedure, 1908; Contract Act, 1872',
    family: 'Code of Civil Procedure, 1908',
    corporate: 'Companies Act; Insolvency and Bankruptcy Code',
    default: 'Applicable statutes and procedural code'
  };

  return {
    caseId,
    title: `${m.label} (${caseId})`,
    advocateId: `advocate-${String(advocateIndex).padStart(3, '0')}`,
    advocateName,
    practiceArea,
    jurisdiction,
    court,
    year,
    stage: 'Judgment',
    outcome: m.outcome,
    summary: `${matterRef} ${m.facts}`,
    facts: m.facts,
    issues: m.issues,
    applicableLaw: m.law,
    evidence: m.evidence,
    arguments: `It was submitted on behalf of the party that the facts and the applicable law together establish the relief prayed for. The opposing side relied on the material on record in support of its case.`,
    relief: `${m.label}`,
    codeLines: [
      `${CASE_REF_BY_AREA[practiceArea] || 'CASE NO.'} ${String(caseNum).padStart(3, '0')}/${year}.`,
      `FORUM: HIGH COURT OF ${jurisdiction.toUpperCase()}.`,
      `DECIDED ON: 12/09/${year}.`,
      `STATUTES REFERRED: ${STATUTES_BY_AREA[practiceArea] || STATUTES_BY_AREA.default}.`
    ],
    sections: [
      { heading: 'Case Description', body: [m.facts] },
      { heading: 'Issues', body: [m.issues] }
    ]
  };
}

export const ADVOCATE_NAMES = [
  'Adv. Rajesh Varma',
  'Adv. Meera Krishnan',
  'Adv. Arjun Mehta',
  'Adv. Sana Shaikh',
  'Adv. Vikram Rao',
  'Adv. Priya Nair',
  'Adv. Karan Kapoor',
  'Adv. Divya Menon',
  'Adv. Rohan Gupta',
  'Adv. Ananya Iyer'
];

export const ADVOCATE_PRACTICE_AREAS = [
  'criminal',
  'constitutional',
  'property',
  'contract',
  'family',
  'corporate',
  'criminal',
  'property',
  'contract',
  'family'
];

export const ADVOCATE_JURISDICTIONS = [
  'Karnataka',
  'Karnataka',
  'Delhi',
  'Maharashtra',
  'Karnataka',
  'Kerala',
  'Delhi',
  'Maharashtra',
  'Karnataka',
  'Kerala'
];

export const ADVOCATE_COURTS = [
  'High Court',
  'High Court',
  'High Court',
  'High Court',
  'High Court',
  'High Court',
  'High Court',
  'High Court',
  'High Court',
  'High Court'
];