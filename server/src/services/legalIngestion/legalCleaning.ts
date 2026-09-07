// Legal-aware text cleaning.
// - drops repeated header/footer boilerplate and page-number-only lines
// - repairs broken line wrapping WITHOUT merging legal structure markers
// - collapses excessive whitespace
// Legal tokens like "Section 302", "Article 21", "Para 15", judgments heads,
// sections / subsections / article numbers are preserved verbatim.

const PAGE_NUMBER_ONLY = /^\s*[-–—]?\s*\d{1,4}\s*[-–—]?\s*$/;
const ALL_CAPS_HEADING = /^[A-Z0-9][A-Z0-9 ,.\-:()'&/]{2,60}$/;
const STRUCTURE_START = /^(?:section|sec\.?|article|art\.?|article|para|l\.?|part|chapter|schedule|rule|sub-?rule|regulation|clause|subsection|sub-?section)\s*\d|^\(\d+\)\s|^\d+\.\s|^ART\.?\s|^PART\s+[IVXLCDM]+|^CHAPTER\s+[IVXLCDM\d]+/i;
const SENTENCE_END = /[.!?;:")\]]$/;

export interface CleanedDocument {
  text: string;
  paragraphs: string[];
  /** paragraphs grouped by original page (page number preserved). */
  pageParagraphs: Array<{ page: number; paragraphs: string[] }>;
  removedBoilerplate: number;
  pageNumberLines: number;
}

/**
 * Clean page-wise extracted text. Each page entry is a string of lines.
 */
export function cleanLegalText(pages: Array<{ page: number; text: string }>): CleanedDocument {
  const perPageLines: string[][] = pages.map(p =>
    p.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  );

  // ---- 1. Drop page-number-only lines (per page; numeric first/last) ----
  let pageNumberLines = 0;
  for (const lines of perPageLines) {
    if (lines.length && PAGE_NUMBER_ONLY.test(lines[0])) {
      lines.shift();
      pageNumberLines++;
    }
    if (lines.length && PAGE_NUMBER_ONLY.test(lines[lines.length - 1])) {
      lines.pop();
      pageNumberLines++;
    }
  }

  // ---- 2. Repeated boilerplate (headers/footers) ----
  const freq = new Map<string, number>();
  for (const lines of perPageLines) {
    for (const l of lines) freq.set(l, (freq.get(l) || 0) + 1);
  }
  let removedBoilerplate = 0;
  const isBoilerplate = (line: string): boolean => {
    const count = freq.get(line) || 0;
    if (count < 3) return false;
    if (line.length > 120) return false;
    if (ALL_CAPS_HEADING.test(line) && count < 4) return false; // legal headings often repeat
    // Preserve legal structure even if it repeats across pages.
    if (STRUCTURE_START.test(line) || /Section |Article |Sub-?sect|Clause |Para \d+/i.test(line)) return false;
    return true;
  };
  for (const lines of perPageLines) {
    const kept: string[] = [];
    for (const l of lines) {
      if (isBoilerplate(l)) removedBoilerplate++;
      else kept.push(l);
    }
    lines.length = 0;
    lines.push(...kept);
  }

  // ---- 3. Repair broken line wrapping (structure-aware merge) ----
  const mergedPages: string[][] = [];
  for (const lines of perPageLines) {
    const merged: string[] = [];
    for (const line of lines) {
      if (merged.length === 0) {
        merged.push(line);
        continue;
      }
      const prev = merged[merged.length - 1];
      const isStructural = STRUCTURE_START.test(prev) || ALL_CAPS_HEADING.test(prev);
      if (!isStructural && !SENTENCE_END.test(prev) && !STRUCTURE_START.test(line)) {
        merged[merged.length - 1] = `${prev} ${line}`;
      } else {
        merged.push(line);
      }
    }
    mergedPages.push(merged);
  }

  // ---- 4. Collapse whitespace, join pages ----
  const paragraphs: string[] = [];
  const pageParagraphs: Array<{ page: number; paragraphs: string[] }> = [];
  for (let pi = 0; pi < mergedPages.length; pi++) {
    const pageLines: string[] = [];
    for (const l of mergedPages[pi]) {
      const normalized = l.replace(/\s+/g, ' ').trim();
      if (!normalized) continue;
      paragraphs.push(normalized);
      pageLines.push(normalized);
    }
    const sourcePage = pages[pi]?.page ?? pi + 1;
    pageParagraphs.push({ page: sourcePage, paragraphs: pageLines });
  }
  return {
    text: paragraphs.join('\n\n'),
    paragraphs,
    pageParagraphs,
    removedBoilerplate,
    pageNumberLines
  };
}