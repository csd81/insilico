/**
 * File-format parsers for the sandbox VFS: CSV text, Excel (.xlsx) and MATLAB
 * Live Scripts (.mlx) — both OPC zip+XML containers, unzipped with fflate.
 * Pure functions on bytes/text so they run in the worker and on the main thread.
 */
import { unzipSync, unzlibSync, strFromU8 } from 'fflate';
import { type Table, type Mat, type Value, type Cell, type StructV, type Sparse, zeros, colVec, makeStrArr, makeCell, makeND } from './values';

// ── CSV ────────────────────────────────────────────────────────────────
export interface Csv { headers: string[] | null; rows: (string | number)[][] }

const isNum = (s: string): boolean => s.trim() !== '' && Number.isFinite(Number(s.trim()));

/** Parse CSV/DSV text: quoted fields (with embedded delimiter/quote/newline), numeric inference. */
export function parseCsv(text: string, delim = ','): Csv {
  const t = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const rows: string[][] = []; let row: string[] = []; let field = ''; let i = 0; let quoted = false;
  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };
  while (i < t.length) {
    const c = t[i];
    if (quoted) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i += 2; continue; } quoted = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { quoted = true; i++; continue; }
    if (c === delim) { endField(); i++; continue; }
    if (c === '\n') { endRow(); i++; continue; }
    field += c; i++;
  }
  if (field !== '' || row.length) endRow();
  while (rows.length && rows[rows.length - 1].every((f) => f === '')) rows.pop();   // drop trailing blank lines
  if (!rows.length) return { headers: null, rows: [] };
  // Header row only when row 0 is all-text AND row 1 has a number. An all-string dataset
  // (e.g. a column of names/categories) keeps every row — don't treat row 0 as a header.
  const row0AllText = rows[0].every((f) => f.trim() === '' || !isNum(f));
  const row1HasNum = rows.length > 1 && rows[1].some((f) => isNum(f));
  const hasHeader = rows.length > 1 && row0AllText && row1HasNum;
  const headers = hasHeader ? rows[0].map((h) => h.trim()) : null;
  const body = hasHeader ? rows.slice(1) : rows;
  const data = body.map((r) => r.map((f) => (isNum(f) ? Number(f.trim()) : f)));
  return { headers, rows: data };
}

/** Build the interpreter's Table value from parsed CSV (numeric columns → doubles, else strings). */
export function csvToTable(csv: Csv): Table {
  const ncol = Math.max(0, ...csv.rows.map((r) => r.length), csv.headers?.length ?? 0);
  const nrows = csv.rows.length;
  const vars = Array.from({ length: ncol }, (_, j) => csv.headers?.[j]?.trim() || `Var${j + 1}`);
  const cols: Value[] = [];
  for (let j = 0; j < ncol; j++) {
    const cell = csv.rows.map((r) => r[j]);
    const allNum = cell.every((v) => typeof v === 'number' || v === undefined || v === '');
    if (allNum) cols.push(colVec(cell.map((v) => (typeof v === 'number' ? v : NaN))));
    else cols.push(makeStrArr(nrows, 1, cell.map((v) => (v === undefined ? '' : String(v)))));
  }
  return { kind: 'table', vars, cols, nrows };
}

/** Build a numeric matrix from parsed CSV (non-numeric cells → NaN). */
export function csvToMatrix(csv: Csv): Mat {
  const body = csv.headers ? csv.rows : csv.rows;
  const nrows = body.length; const ncol = Math.max(0, ...body.map((r) => r.length));
  const M = zeros(nrows, ncol);
  for (let r = 0; r < nrows; r++) for (let c = 0; c < ncol; c++) { const v = body[r][c]; M.data[r + c * nrows] = typeof v === 'number' ? v : NaN; }
  return M;
}

/** Serialize a matrix to CSV text (for writematrix/csvwrite). */
export function matrixToCsv(M: Mat): string {
  const out: string[] = [];
  for (let r = 0; r < M.rows; r++) { const row: string[] = []; for (let c = 0; c < M.cols; c++) row.push(String(M.data[r + c * M.rows])); out.push(row.join(',')); }
  return out.join('\n') + '\n';
}

// ── XLSX (OPC zip + XML) ─────────────────────────────────────────────────
export interface Sheet { name: string; grid: (string | number | null)[][] }

const xmlEntities = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
/** Column letters → 0-based index (A→0, Z→25, AA→26, …). */
function colIdx(ref: string): number { const m = ref.match(/^[A-Z]+/); if (!m) return 0; let n = 0; for (const ch of m[0]) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }

export function parseXlsx(bytes: Uint8Array): { sheets: Sheet[] } {
  const files = unzipSync(bytes);
  const read = (p: string) => (files[p] ? strFromU8(files[p]) : '');
  // shared strings: each <si> may hold several <t> runs → concatenate
  const shared: string[] = [];
  for (const si of read('xl/sharedStrings.xml').split('</si>')) {
    if (!si.includes('<si')) continue;
    const parts = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => xmlEntities(m[1]));
    shared.push(parts.join(''));
  }
  // sheet names + order from workbook.xml
  const names = [...read('xl/workbook.xml').matchAll(/<sheet[^>]*\bname="([^"]*)"/g)].map((m) => xmlEntities(m[1]));
  const sheetPaths = Object.keys(files).filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p)).sort((a, b) => (parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0])));
  const sheets: Sheet[] = [];
  sheetPaths.forEach((p, si) => {
    const xml = read(p); const grid: (string | number | null)[][] = [];
    for (const cm of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cm[1]; const inner = cm[2];
      const ref = (attrs.match(/r="([A-Z]+\d+)"/) || [])[1]; if (!ref) continue;
      const t = (attrs.match(/t="([^"]*)"/) || [])[1];
      const row = parseInt(ref.match(/\d+/)![0]) - 1; const col = colIdx(ref);
      let val: string | number | null = null;
      const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
      if (t === 's') val = shared[parseInt(vMatch?.[1] ?? '0')] ?? '';
      else if (t === 'inlineStr' || t === 'str') { const isM = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/); val = isM ? xmlEntities(isM[1]) : (vMatch ? xmlEntities(vMatch[1]) : ''); }
      else if (vMatch) { const n = Number(vMatch[1]); val = Number.isFinite(n) ? n : xmlEntities(vMatch[1]); }
      (grid[row] ||= [])[col] = val;
    }
    for (const r of grid) for (let c = 0; c < r.length; c++) if (r[c] === undefined) r[c] = null;
    sheets.push({ name: names[si] ?? `Sheet${si + 1}`, grid });
  });
  return { sheets };
}

/** First sheet of a workbook as CSV-shaped data (for readtable/readmatrix on .xlsx). */
export function xlsxToCsv(bytes: Uint8Array): Csv {
  const sheet = parseXlsx(bytes).sheets[0];
  if (!sheet) return { headers: null, rows: [] };
  const rows = sheet.grid.map((r) => r.map((v) => (v == null ? '' : v)));
  const hasHeader = rows.length > 0 && rows[0].some((v) => typeof v === 'string' && v.trim() !== '');
  const headers = hasHeader ? rows[0].map((v) => String(v ?? '').trim()) : null;
  return { headers, rows: hasHeader ? rows.slice(1) : rows };
}

// ── MAT-file (Level 5) binary reader ─────────────────────────────────────
// Element data types (miXXX) and array classes (mxXXX) per the MAT-File Format spec.
const MI = { INT8: 1, UINT8: 2, INT16: 3, UINT16: 4, INT32: 5, UINT32: 6, SINGLE: 7, DOUBLE: 9, INT64: 12, UINT64: 13, MATRIX: 14, COMPRESSED: 15, UTF8: 16, UTF16: 17, UTF32: 18 } as const;
const MX = { CELL: 1, STRUCT: 2, OBJECT: 3, CHAR: 4, SPARSE: 5, DOUBLE: 6, SINGLE: 7, INT8: 8, UINT8: 9, INT16: 10, UINT16: 11, INT32: 12, UINT32: 13, INT64: 14, UINT64: 15 } as const;
const MX_ITYPE: Record<number, string> = { 7: 'single', 8: 'int8', 9: 'uint8', 10: 'int16', 11: 'uint16', 12: 'int32', 13: 'uint32', 14: 'int64', 15: 'uint64' };

interface MatTag { type: number; nbytes: number; dataOff: number; next: number }
function readTag(dv: DataView, off: number, le: boolean): MatTag {
  const first = dv.getUint32(off, le);
  if ((first >>> 16) !== 0) return { type: first & 0xffff, nbytes: first >>> 16, dataOff: off + 4, next: off + 8 };   // small-element format
  const nbytes = dv.getUint32(off + 4, le);
  return { type: first, nbytes, dataOff: off + 8, next: off + 8 + (Math.ceil(nbytes / 8) * 8) };
}
/** Read a numeric element's values into a plain number[] (handles every integer/float miType). */
function readNumeric(dv: DataView, t: MatTag, le: boolean): number[] {
  const out: number[] = []; let p = t.dataOff;
  const step = { [MI.INT8]: 1, [MI.UINT8]: 1, [MI.INT16]: 2, [MI.UINT16]: 2, [MI.INT32]: 4, [MI.UINT32]: 4, [MI.SINGLE]: 4, [MI.DOUBLE]: 8, [MI.INT64]: 8, [MI.UINT64]: 8, [MI.UTF8]: 1, [MI.UTF16]: 2, [MI.UTF32]: 4 }[t.type] ?? 1;
  for (let i = 0; i < t.nbytes; i += step, p += step) {
    switch (t.type) {
      case MI.INT8: out.push(dv.getInt8(p)); break;
      case MI.UINT8: case MI.UTF8: out.push(dv.getUint8(p)); break;
      case MI.INT16: out.push(dv.getInt16(p, le)); break;
      case MI.UINT16: case MI.UTF16: out.push(dv.getUint16(p, le)); break;
      case MI.INT32: out.push(dv.getInt32(p, le)); break;
      case MI.UINT32: case MI.UTF32: out.push(dv.getUint32(p, le)); break;
      case MI.SINGLE: out.push(dv.getFloat32(p, le)); break;
      case MI.DOUBLE: out.push(dv.getFloat64(p, le)); break;
      case MI.INT64: out.push(Number(dv.getBigInt64(p, le))); break;
      case MI.UINT64: out.push(Number(dv.getBigUint64(p, le))); break;
      default: out.push(dv.getUint8(p));
    }
  }
  return out;
}

/** Parse one miMATRIX element at `off` (its tag is at `off`) → its variable name + Value. */
function parseMatrix(dv: DataView, off: number, le: boolean): { name: string; value: Value } | null {
  const tag = readTag(dv, off, le);
  if (tag.type !== MI.MATRIX || tag.nbytes === 0) return null;
  let p = tag.dataOff; const end = tag.dataOff + tag.nbytes;
  const next = () => { const t = readTag(dv, p, le); p = t.next; return t; };
  const flags = readNumeric(dv, next(), le);            // array flags (2× uint32)
  const cls = flags[0] & 0xff; const isComplex = !!((flags[0] >> 8) & 0x08); const isLogical = !!((flags[0] >> 8) & 0x02);
  const dims = readNumeric(dv, next(), le);             // dimensions (int32[])
  const nameCodes = readNumeric(dv, next(), le);        // array name (int8[])
  const name = String.fromCharCode(...nameCodes);
  const rows = dims[0] ?? 0; const cols = dims.slice(1).reduce((a, b) => a * b, 1);
  const total = dims.reduce((a, b) => a * b, dims.length ? 1 : 0);

  const numMat = (real: number[], imag: number[] | null): Mat => {
    const data = Float64Array.from({ length: total }, (_, i) => real[i] ?? 0);
    const opts: { idata?: Float64Array; isChar?: boolean; isBool?: boolean } = {};
    if (imag) opts.idata = Float64Array.from({ length: total }, (_, i) => imag[i] ?? 0);
    if (isLogical) opts.isBool = true;
    const m = dims.length > 2 ? makeND(dims, data, opts) : { kind: 'num' as const, rows, cols, data, ...(opts.idata ? { idata: opts.idata } : {}), ...(opts.isBool ? { isBool: true } : {}) };
    if (MX_ITYPE[cls]) (m as Mat).itype = MX_ITYPE[cls];
    return m as Mat;
  };

  if (cls === MX.CHAR) {
    const t = next(); const codes = readNumeric(dv, t, le);
    const data = Float64Array.from({ length: total }, (_, i) => codes[i] ?? 32);
    return { name, value: { kind: 'num', rows, cols, data, isChar: true } };
  }
  if (cls === MX.CELL) {
    const items: Value[] = [];
    for (let i = 0; i < total; i++) { const t = readTag(dv, p, le); const sub = parseMatrix(dv, p, le); p = t.next; items.push(sub ? sub.value : zeros(0, 0)); }
    return { name, value: makeCell(rows, cols, items) as Cell };
  }
  if (cls === MX.STRUCT) {
    const fnLen = readNumeric(dv, next(), le)[0] ?? 32;
    const fnCodes = readNumeric(dv, next(), le);
    const nf = Math.floor(fnCodes.length / fnLen);
    const names: string[] = [];
    for (let f = 0; f < nf; f++) names.push(String.fromCharCode(...fnCodes.slice(f * fnLen, (f + 1) * fnLen)).replace(/\0.*$/, ''));
    const fields = new Map<string, Value[]>(names.map((n) => [n, [] as Value[]]));
    for (let i = 0; i < total; i++) for (const n of names) { const t = readTag(dv, p, le); const sub = parseMatrix(dv, p, le); p = t.next; fields.get(n)!.push(sub ? sub.value : zeros(0, 0)); }
    return { name, value: { kind: 'struct', rows, cols, fields } as StructV };
  }
  if (cls === MX.SPARSE) {
    const ir = readNumeric(dv, next(), le); const jc = readNumeric(dv, next(), le);
    const pr = readNumeric(dv, next(), le); if (isComplex) next();   // skip imaginary part of sparse
    return { name, value: { kind: 'sparse', rows, cols, colptr: Int32Array.from(jc), rowind: Int32Array.from(ir), values: Float64Array.from(pr) } as Sparse };
  }
  // numeric classes (double/single/int*); anything else (objects/tables/opaque) is unsupported → skip.
  if (cls < MX.DOUBLE || cls > MX.UINT64 || !Number.isSafeInteger(total) || total < 0 || total > 5e7) { p = end; return null; }
  const real = readNumeric(dv, next(), le);
  const imag = isComplex ? readNumeric(dv, next(), le) : null;
  return { name, value: numMat(real, imag) };
}

/** Read all variables from a Level-5 MAT-file. Compressed elements are zlib-inflated. */
export function parseMat(bytes: Uint8Array): { name: string; value: Value }[] {
  if (bytes.length < 132) throw new Error('not a valid MAT-file');
  const le = bytes[126] === 0x49 && bytes[127] === 0x4d ? true : !(bytes[126] === 0x4d && bytes[127] === 0x49);   // 'IM'→LE, 'MI'→BE
  const out: { name: string; value: Value }[] = [];
  let off = 128;
  const top = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (off + 8 <= bytes.length) {
    const tag = readTag(top, off, le);
    try {
      if (tag.type === MI.COMPRESSED) {
        const raw = unzlibSync(bytes.subarray(tag.dataOff, tag.dataOff + tag.nbytes));
        const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
        const v = parseMatrix(dv, 0, le); if (v && v.name) out.push(v);
      } else if (tag.type === MI.MATRIX) {
        const v = parseMatrix(top, off, le); if (v && v.name) out.push(v);
      }
    } catch { /* skip a variable we can't parse (e.g. table/object) rather than failing the whole load */ }
    // Top-level compressed elements are not 8-byte padded — the next element follows immediately.
    off = tag.type === MI.COMPRESSED ? tag.dataOff + tag.nbytes : tag.next;
  }
  return out;
}

// ── MLX (MATLAB Live Script: OPC zip, code in matlab/document.xml) ────────
/** Extract the plain `.m` source from a `.mlx` Live Script (the `code`-styled paragraphs). */
export function parseMlx(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const xml = files['matlab/document.xml'] ? strFromU8(files['matlab/document.xml']) : '';
  const lines: string[] = [];
  for (const p of xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? []) {
    const style = p.match(/<w:pStyle[^>]*w:val="([^"]+)"/);
    if (!style || style[1] !== 'code') continue;
    // Lazy [\s\S]*? (not [^<]*) so a <w:t> whose text is wrapped in <![CDATA[ … ]]> — whose
    // payload may contain '<' — is captured whole; the CDATA wrapper is then stripped below.
    const text = [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => xmlEntities(m[1])).join('');
    lines.push(text.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, ''));
  }
  return lines.join('\n');
}
