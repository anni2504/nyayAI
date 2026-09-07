// Structure-aware legal chunking.
//
// Chunks are built around legal structure (sections, articles, judgment
// paragraphs, headings, ALL-CAPS heads) — NOT arbitrary fixed-size blocks.
// Paragraphs are grouped into "sections"; oversized sections are split at
// paragraph boundaries with a small overlap; tiny trailing fragments merge
// into the previous chunk. Every chunk carries stable page/paragraph
// provenance for its first segment.

export interface ChunkerConfig {
  maxChars: number;    // hard ceiling applied at paragraph boundaries
  overlapChars: number; // overlap only when a chunk is force-split
  minChars: number;    // trailing fragment below this merges into previous chunk
}

export const DEFAULT_CHUNKER_CONFIG: ChunkerConfig = {
  maxChars: 1200,
  overlapChars: 150,
  minChars: 60
};

const STRUCTURE_RE =
  /^(?:section|sec\.?|article|art\.?|para|l\.?|part|chapter|schedule|rule|sub-?rule|regulation|clause|subsection|sub-?section)\s*[0-9IVXLCDM]+\.?|^ART\.?\s*[0-9IVXLCDM]+\.?|^PART\s+[IVXLCDM]+\.?|^CHAPTER\s+[IVXLCDM\d]+\.?|^\(\d+\)\s|^\d{1,3}\.\s/i;

const ALL_CAPS_HEADING = /^[A-Z0-9][A-Z0-9 ,.\-:()'&/]{2,70}$/;

export interface ChunkedParagraph {
  text: string;
  page: number;
  paragraph: number; // 1-based within its source page
  section: string | null;
}

export interface ChunkerResultChunk {
  chunk_index: number;
  text: string;
  page: number | null;
  paragraph: number | null;
  section: string | null;
  heading: string | null;
}

export function flattenParagraphs(
  pageParagraphs: Array<{ page: number; paragraphs: string[] }>
): ChunkedParagraph[] {
  const out: ChunkedParagraph[] = [];
  for (const { page, paragraphs } of pageParagraphs) {
    paragraphs.forEach((text, i) => {
      const t = text.trim();
      const sectionMatch = /^(?:section|sec\.?|article|art\.?|para|part|chapter|regulation|rule|clause|subsection)\s*([0-9IVXLCDM]+(?:[A-Za-z]|-[A-Za-z0-9]+)*)/i.exec(t);
      out.push({ text: t, page, paragraph: i + 1, section: sectionMatch ? t.split(/\s+/).slice(0, 4).join(' ') : null });
    });
  }
  return out;
}

function isStructure(paragraph: string): boolean {
  return STRUCTURE_RE.test(paragraph.trim());
}

function isHeading(paragraph: string): boolean {
  const t = paragraph.trim();
  return t.length <= 80 && ALL_CAPS_HEADING.test(t);
}

/**
 * Structure-aware chunker over cleaned page-grouped paragraphs.
 */
export function chunkLegalDocument(
  pageParagraphs: Array<{ page: number; paragraphs: string[] }>,
  config: ChunkerConfig = DEFAULT_CHUNKER_CONFIG
): ChunkerResultChunk[] {
  const paras = flattenParagraphs(pageParagraphs);
  const chunks: Array<{
    text: string;
    heading: string | null;
    section: string | null;
    page: number | null;
    paragraph: number | null;
  }> = [];

  let pendingHeading: string | null = null;
  let current: {
    text: string;
    heading: string | null;
    section: string | null;
    page: number | null;
    paragraph: number | null;
  } | null = null;

  const flush = (withOverlap = false): string => {
    if (!current) return '';
    let overlap = '';
    if (withOverlap && current.text.length > config.overlapChars) {
      overlap = current.text.slice(-config.overlapChars);
    }
    chunks.push({ ...current, text: current.text });
    current = null;
    return overlap;
  };

  for (const p of paras) {
    if (isStructure(p.text)) {
      // structural boundary: flush the current unit; the marker opens a new one
      flush();
      current = {
        text: p.text,
        heading: null,
        section: p.section,
        page: p.page,
        paragraph: p.paragraph
      };
      continue;
    }
    if (isHeading(p.text)) {
      pendingHeading = p.text;
      continue;
    }

    const addition = current ? current.text.length + p.text.length : p.text.length;
    const needsSplit = current && addition > config.maxChars;
    if (needsSplit) {
      const overlap = flush(true);
      current = {
        text: overlap,
        heading: null,
        section: current?.section ?? null,
        page: current?.page ?? p.page,
        paragraph: current?.paragraph ?? p.paragraph
      };
    }

    if (!current) {
      current = {
        text: '',
        heading: pendingHeading,
        section: null,
        page: p.page,
        paragraph: p.paragraph
      };
      pendingHeading = null;
    }
    current.text = current.text ? `${current.text} ${p.text}` : p.text;
    if (current.section === null && p.section) current.section = p.section;
  }
  flush();

  // Merge tiny trailing fragments into the previous chunk to avoid noisy
  // meaningless chunks.
  const merged: ChunkerResultChunk[] = [];
  for (const c of chunks) {
    const prev = merged[merged.length - 1];
    if (prev && c.text.length < config.minChars) {
      prev.text = `${prev.text}\n\n${c.text}`;
      continue;
    }
    merged.push({ ...c, chunk_index: merged.length });
  }
  return merged.map((c, i) => ({ ...c, chunk_index: i }));
}