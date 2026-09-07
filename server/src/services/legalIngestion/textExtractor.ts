// Legal text extraction with structure preservation.
//
// PDFs: self-contained extractor (Node zlib). It decodes Flate-compressed
// content streams, walks BT/ET text blocks, and emits page-wise text with
// line/paragraph boundaries. No OCR engine is bundled: a PDF without an
// extractable text layer is marked "requires_ocr" with NO fabricated text.
// Plain text/markdown pass through as single pages.
import { inflateSync } from 'node:zlib';

export interface ExtractedPage {
  page: number;
  text: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  text: string;
  engine: string;
  ocrRequired: boolean;
  structured: boolean;
}

// ---------- PDF internals ----------

function unescapePdfString(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== '\\') {
      out += c;
      continue;
    }
    const next = raw[i + 1];
    if (next === undefined) break;
    i++;
    switch (next) {
      case 'n': out += '\n'; break;
      case 'r': out += '\r'; break;
      case 't': out += '\t'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case '(': out += '('; break;
      case ')': out += ')'; break;
      case '\\': out += '\\'; break;
      default: {
        // octal escape (up to 3 digits)
        const m = /^[0-7]{1,3}/.exec(raw.slice(i));
        if (m) {
          out += String.fromCharCode(parseInt(m[0], 8));
          i += m[0].length - 1;
        } else {
          out += next;
        }
      }
    }
  }
  return out;
}

/** Split a raw PDF into objects: returns object-number -> raw body. */
function splitPdfObjects(raw: string): Map<string, string> {
  const objects = new Map<string, string>();
  const re = /(\d+)\s+\d+\s+obj\b/g;
  let m: RegExpExecArray | null;
  let lastIndex = 0;
  const starts: Array<{ num: string; at: number }> = [];
  while ((m = re.exec(raw))) {
    starts.push({ num: m[1], at: m.index });
  }
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].at : raw.length;
    objects.set(start.num, raw.slice(start.at, end));
  }
  return objects;
}

function findStream(body: string): { streamBytes: Buffer; dict: string } | null {
  const dMatch = /^([\s\S]*?)\s*stream[\r\n]/.exec(body);
  if (!dMatch) return null;
  const dict = dMatch[1];
  const rawStart = dMatch.index + dMatch[0].length;
  const endIdx = body.indexOf('endstream', rawStart);
  if (endIdx === -1) return null;
  let bytes = Buffer.from(body.slice(rawStart, endIdx), 'binary');
  // strip a trailing EOL before endstream
  if (bytes.length && (bytes[bytes.length - 1] === 10 || bytes[bytes.length - 1] === 13)) {
    bytes = bytes.subarray(0, bytes.length - 1);
    if (bytes.length && bytes[bytes.length - 1] === 13) bytes = bytes.subarray(0, bytes.length - 1);
  }
  return { streamBytes: bytes, dict };
}

function isFlate(dict: string): boolean {
  const f = /\/Filter\s*(\[[^\]]*\]|\/?\w+)/.exec(dict)?.[1] || '';
  return /FlateDecode|Fl/.test(f);
}

function decodeStream(body: string): Buffer | null {
  const st = findStream(body);
  if (!st) return null;
  let bytes = st.streamBytes;
  if (isFlate(st.dict)) {
    try {
      bytes = inflateSync(bytes);
    } catch {
      return null;
    }
  }
  return bytes;
}

const TEXT_OP = /(?:\(((?:[^()\\]|\\.)*)\)\s*([Tj"'])|\[((?:[^\[\]()\\]|\\[()\\]|\(\\.*?\)|[0-9.-]+)*)\]\s*TJ)/g;

function parseTextChunk(decoded: string): { blocks: string[]; letters: number } {
  const blocks: string[] = [];
  let letters = 0;
  // One BT/ET can contain many text-positioning operators -> one "line group"
  const btRe = /BT[\s\S]*?ET/g;
  let bt: RegExpExecArray | null;
  while ((bt = btRe.exec(decoded))) {
    const group = bt[0];
    const lines: string[] = [];
    let line = '';
    // split positioning moves: Td/TD/Tm/T* and the ' apostrophe
    const opRe = /([0-9.-]+)\s+([0-9.-]+)\s+(Td|TD|Tm)|T\*|(?:'|")/g;
    const opPositions: number[] = [];
    let o: RegExpExecArray | null;
    while ((o = opRe.exec(group))) opPositions.push(o.index);
    const segments = [0, ...opPositions, group.length];

    const pushLine = (s: string) => {
      const t = s.replace(/\s+/g, ' ').trim();
      if (t) lines.push(t);
    };

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = group.slice(segments[i], segments[i + 1]);
      const piece = parseTextSegment(seg);
      line += piece.text;
      letters += piece.letters;
      if (segments[i + 1] < group.length) {
        // a positioning operator ended this segment -> new line
        pushLine(line);
        line = '';
      }
    }
    pushLine(line);
    if (lines.length) blocks.push(lines.join('\n'));
  }
  return { blocks, letters };
}

function parseTextSegment(seg: string): { text: string; letters: number } {
  let text = '';
  const seSp = /\(((?:[^()\\]|\\.)*)\)\s*([Tj"'])|([0-9.-]+)|\[/g;
  let m: RegExpExecArray | null;
  while ((m = seSp.exec(seg))) {
    if (m[1] !== undefined) {
      // (string) Tj / ' / "
      text += unescapePdfString(m[1]);
      if (m[2] === "'" || m[2] === '"') text += '\n';
    } else if (m[3] !== undefined) {
      // TJ adjustment: negative -> spacing
      const adj = parseFloat(m[3]);
      if (adj < -100) text += ' ';
    }
    // '[' starts array handled implicitly by subsequent (..) & numbers
  }
  return { text, letters: text.replace(/\s/g, '').length };
}

function parsePageTree(raw: string, objects: Map<string, string>): Map<string, string[]> {
  // page object number -> list of content object numbers
  const pageContents = new Map<string, string[]>();
  const rootId = /\/Root\s+(\d+)\s+\d+\s+R/.exec(raw)?.[1];
  const collect = (objNum: string, seen: Set<string>) => {
    if (seen.has(objNum)) return;
    seen.add(objNum);
    const body = objects.get(objNum) || '';
    if (/\/Type\s*\/Pages\b/.test(body)) {
      const kids = [...body.matchAll(/\/Kids\s*\[([^\]]*)\]/g)];
      for (const k of kids) {
        const refs = [...k[1].matchAll(/(\d+)\s+\d+\s+R/g)];
        for (const r of refs) collect(r[1], seen);
      }
    } else if (/\/Type\s*\/Page\b/.test(body)) {
      const cMatch = /\/Contents\s*(\d+\s+\d+\s+R|\[[^\]]*\])/.exec(body);
      if (cMatch) {
        const contentNums: string[] = [];
        const refs = [...cMatch[1].matchAll(/(\d+)\s+\d+\s+R/g)];
        for (const r of refs) contentNums.push(r[1]);
        pageContents.set(objNum, contentNums);
      }
    }
  };
  if (rootId) collect(rootId, new Set());
  return pageContents;
}

export function extractPdfText(buffer: Buffer, docName = 'pdf'): ExtractionResult {
  const raw = decodeTags(buffer.toString('binary'));
  const objects = splitPdfObjects(raw);
  const pageContents = parsePageTree(raw, objects);

  // Build a stable page order from the page tree (sorted by page object number
  // approximates reading order for simple corpus PDFs).
  const orderedPages = [...pageContents.keys()];
  orderedPages.sort((a, b) => Number(a) - Number(b));

  let totalLetters = 0;
  const pages: ExtractedPage[] = [];
  const appendPageText = (contentNums: string[], pageIndex: number) => {
    let combined = '';
    for (const cnum of contentNums) {
      const body = objects.get(cnum) || '';
      const decoded = decodeStream(body);
      if (!decoded) continue;
      const { blocks, letters } = parseTextChunk(decoded.toString('binary'));
      totalLetters += letters;
      combined += blocks.join('\n');
      if (blocks.length) combined += '\n';
    }
    pages.push({ page: pageIndex + 1, text: combined.replace(/\n{3,}/g, '\n\n').trim() });
  };

  if (orderedPages.length) {
    orderedPages.forEach((pn, i) => appendPageText(pageContents.get(pn)!, i));
  } else {
    // No page tree parsed: extract from every object that contains a stream
    // with decodable text (best-effort single page).
    let combined = '';
    for (const body of objects.values()) {
      const decoded = decodeStream(body);
      if (!decoded) continue;
      const { blocks, letters } = parseTextChunk(decoded.toString('binary'));
      if (letters) {
        totalLetters += letters;
        combined += blocks.join('\n') + '\n';
      }
    }
    pages.push({ page: 1, text: combined.trim() });
  }

  const text = pages.map(p => p.text).filter(Boolean).join('\n\n');
  const ocrRequired = totalLetters === 0;
  return { pages, text, engine: 'nyayai-pdf-extractor/zlib', ocrRequired, structured: pages.length > 1 };
}

/** Decode the common PDF document-level byte escapes in the header/dicts. */
function decodeTags(raw: string): string {
  return raw.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// ---------- Plain text ----------

function plainText(buffer: Buffer): ExtractionResult {
  const text = buffer.toString('utf8');
  return {
    pages: [{ page: 1, text }],
    text,
    engine: 'plain-text',
    ocrRequired: false,
    structured: false
  };
}

// ---------- Entry point ----------

export function extractText(buffer: Buffer, key: string): ExtractionResult {
  const lower = key.toLowerCase();
  if (lower.endsWith('.pdf')) return extractPdfText(buffer, key);
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return plainText(buffer);
  throw new Error(`unsupported file type for '${key}'; supported: .pdf .txt .md`);
}