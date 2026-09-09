// Deterministic, dependency-free PDF generator for the synthetic advocate-case
// corpus. Emits valid PDFs whose content streams are FlateDecode-compressed and
// encoded with Helvetica/WinAnsi BT/ET text operators — the exact form the
// legal text extractor (textExtractor.ts) is designed to decode. This keeps the
// SAME file that users open ("View Case PDF") as the file that is ingested,
// chunked, embedded and retrieved — there is no separate display-only PDF.
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

// ---- WinAnsi escaping for literal string PDF operands ----
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function toWinAnsi(s: string): string {
  return s.replace(/[^\x20-\x7E]/g, ''); // ASCII subset of WinAnsi is sufficient
}

// The corpus text extractor locates text blocks with the BT...ET operators. A
// bare "ET" run inside a rendered line (e.g. "SYNTHE"+"TIC") would truncate
// that line, so scrub such runs from rendered lines.
function scrubEtRuns(s: string): string {
  return s
    .split('SYNTHETIC').join('ILLUSTRATIVE')
    .split('PETITION').join('PLEADING')
    .split('ASSET').join('ASSETS')
    .split('(ET)').join('(enquiry)');
}

function wrapLines(text: string, width = 92): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= width) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function contentStream(data: CasePdfData): Buffer {
  // One BT/ET block per rendered line. This keeps the extractor's naive
  // BT[\s\S]*?ET matcher per-line (a stray "ET" in one line can never swallow
  // the rest of the page) while preserving readable WinAnsi/Helvetica output.
  const ops: string[] = [];
  const pushLine = (text: string, size = 11) => {
    ops.push(`BT /F1 ${size} Tf 0 0 Td (${escapeText(toWinAnsi(scrubEtRuns(text)))}) Tj ET`);
  };
  const blank = () => ops.push('BT /F1 11 Tf 0 0 Td ( ) Tj ET');

  pushLine('ILLUSTRATIVE DEMONSTRATION CASE FILE - NOT A REAL LEGAL CASE', 9);
  pushLine('NYAYAI Platform Fixture - all facts, parties and provisions are illustrative only.', 9);
  blank();

  pushLine(`CASE ID: ${data.caseId}`, 11);
  pushLine(`ADVOCATE: ${data.advocateName} (${data.advocateId})`, 11);
  pushLine(`CASE TITLE: ${data.title}`, 11);
  pushLine(`PRACTICE AREA: ${data.practiceArea}`, 11);
  pushLine(`COURT: ${data.court}  -  JURISDICTION: ${data.jurisdiction}`, 11);
  pushLine(`YEAR: ${data.year}  -  STAGE: ${data.stage}`, 11);
  pushLine(`OUTCOME: ${data.outcome}`, 11);
  for (const l of data.codeLines) pushLine(l, 9);
  blank();

  pushLine('MATTER SUMMARY', 12);
  for (const l of wrapLines(data.summary)) pushLine(l);
  blank();

  pushLine('FACTS OF THE CASE', 12);
  for (const l of wrapLines(data.facts)) pushLine(l);
  blank();

  pushLine('ISSUES FOR RESOLUTION', 12);
  for (const l of wrapLines(data.issues)) pushLine(l);
  blank();

  for (const section of data.sections) {
    pushLine(section.heading.toUpperCase(), 12);
    for (const para of section.body) {
      blank();
      for (const l of wrapLines(para)) pushLine(l);
    }
    blank();
  }

  pushLine('APPLICABLE LAW & RELIEF SOUGHT', 12);
  for (const l of wrapLines(data.applicableLaw)) pushLine(l);
  for (const l of wrapLines(data.relief)) pushLine(l);
  blank();

  pushLine('EVIDENCE ON RECORD & SUBMISSIONS', 12);
  for (const l of wrapLines(data.evidence)) pushLine(l);
  for (const l of wrapLines(data.arguments)) pushLine(l);
  blank();

  pushLine('--- END OF ILLUSTRATIVE DEMONSTRATION CASE FILE ---', 9);

  const stream = ops.join('\n');
  return deflateSync(Buffer.from(stream, 'ascii'), { level: 9 });
}

function buildPdf(data: CasePdfData): Buffer {
  const content = contentStream(data);
  const objects: Array<{ body: string }> = [];
  const ref = (num: number) => `${num} 0 obj`;

  // 1: catalog
  objects.push({ body: '<< /Type /Catalog /Pages 2 0 R >>' });
  // 2: pages
  objects.push({ body: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' });
  // 3: page
  objects.push({ body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>` });
  // 4: F1 Helvetica
  objects.push({ body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' });
  // 5: F2 Helvetica-Bold
  objects.push({ body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>' });
  // 6: content stream
  objects.push({
    body: `<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n${content.toString('binary')}\nendstream`
  });

  const chunks: string[] = [];
  chunks.push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  const offsets: number[] = [];
  let pos = chunks[0].length;
  offsets.push(pos); // xref for obj 0 placeholder
  for (let i = 1; i <= objects.length; i++) {
    const num = i;
    const body = objects[i - 1].body;
    const chunk = `${num} 0 obj\n${body}\nendobj\n`;
    chunks.push(chunk);
    offsets.push(pos);
    pos += chunk.length;
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
    label: 'DEFENCE OF AN ACCUSED PERSON — CRIMINAL PROCEEDINGS'
  },
  constitutional: {
    summary: 'Proceedings raising a question of fundamental rights and the enforceability of constitutional safeguards against an act of the State.',
    facts: 'A public authority took a measure alleged to affect the rights of the petitioner. No adequate opportunity was afforded before the impugned action, and the petitioner invoked constitutional remedies.',
    issues: 'Whether the impugned action infringes a constitutionally guaranteed right; whether the limitation on the right is justified and proportionate; and whether the remedy sought lies.',
    law: 'The fundamental rights provisions and the constitutional scheme governing the restriction of rights and the availability of writ remedies.',
    evidence: 'The petition, the impugned order or action, official correspondence and the affidavit of the petitioner.',
    outcome: 'The Court considered the constitutional question and disposed of the proceedings with the appropriate relief.',
    label: 'FUNDAMENTAL RIGHTS — WRIT PROCEEDINGS'
  },
  property: {
    summary: 'Dispute concerning immovable property, possession and the enforcement of rights in land and buildings.',
    facts: 'The parties claimed competing rights over an immovable property. Questions of title, possession and the effect of prior dealings between the parties arose.',
    issues: 'Whether the claimant established title and possession; whether any intervening transaction extinguished the right; and whether an order for possession or injunction is warranted.',
    law: 'The law relating to immovable property, transfer and possession, and the principles governing injunctions in property disputes.',
    evidence: 'Sale deeds, title documents, revenue records, site inspection report and the pleadings of the parties.',
    outcome: 'The rights of the parties were adjudicated upon and the dispute was resolved on the material placed on record.',
    label: 'PROPERTY RIGHTS — TITLE AND POSSESSION DISPUTE'
  },
  contract: {
    summary: 'A claim arising from an agreement, concerning the performance of contractual obligations and the consequences of breach.',
    facts: 'The parties entered into an agreement under which certain obligations were to be performed. One party alleges non-performance and consequential loss.',
    issues: 'Whether a valid agreement existed; whether the terms were breached; and whether the claimant is entitled to the relief sought, including compensation.',
    law: 'The law of contracts governing formation, performance and breach, and the measure of compensation for breach.',
    evidence: 'The written agreement, correspondence between the parties, invoices and the pleadings filed before the court.',
    outcome: 'The contractual rights and obligations were determined and the claim was disposed of accordingly.',
    label: 'CONTRACTUAL OBLIGATIONS — BREACH AND REMEDIES'
  },
  family: {
    summary: 'A family law matter concerning the status, obligations and remedies of the parties arising from a matrimonial or succession relationship.',
    facts: 'The parties are connected by a family relationship giving rise to rights and obligations. Differences arose and a party approached the court for relief.',
    issues: 'Whether the relationship and its attendant obligations are established; whether the relief sought is maintainable; and what order is just in the circumstances.',
    law: 'The personal law applicable to the parties together with the general law governing maintenance, custody and succession.',
    evidence: 'Marriage or relationship records, financial disclosures, and correspondence between the parties.',
    outcome: 'The court considered the welfare and rights of the parties and passed an appropriate order.',
    label: 'FAMILY MATTER — MAINTENANCE, CUSTODY AND RELIEF'
  },
  corporate: {
    summary: 'A commercial matter involving a company, its management or its creditors, concerning corporate obligations and recovery.',
    facts: 'A dispute arose touching upon the affairs of a company, the conduct of its management, or a claim by a creditor or shareholder.',
    issues: 'Whether there is a contravention of corporate or insolvency law; whether the petitioner or claimant has standing; and what relief should follow.',
    law: 'The statutory framework governing companies and insolvency, and the rules of procedure applicable to corporate disputes.',
    evidence: 'Statutory filings, board or shareholders\' records, financial statements and correspondence.',
    outcome: 'The corporate claim was adjudicated and the matter concluded with the appropriate order.',
    label: 'CORPORATE DISPUTE — OBLIGATIONS AND RECOVERY'
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
      `${CASE_REF_BY_AREA[practiceArea] || 'CASE NO.'} ${String(caseNum).padStart(3, '0')}/${year}`,
      `FORUM: HIGH COURT OF ${jurisdiction.toUpperCase()}.`,
      `DECIDED ON 12/09/${year}`,
      `STATUTES REFERRED: ${STATUTES_BY_AREA[practiceArea] || STATUTES_BY_AREA.default}`
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
