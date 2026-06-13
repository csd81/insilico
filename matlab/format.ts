/** Display formatting (`format short`) and the `fprintf`/`sprintf` printf engine. */
import { type Mat, type Value, isMat, isHandle, isComplex, numel, isScalar, asString } from './values';
import { exprToStr, exprToLatex } from './sym';

/** Sentinel pair wrapping a LaTeX fragment in the output stream; the command
 *  window renders the enclosed text with KaTeX (plain text everywhere else). */
export const TEX_OPEN = '';
export const TEX_CLOSE = '';

/** Sentinel pair wrapping a `help` page in the output stream; the command window
 *  renders the enclosed text richly (coloured headers, highlighted .m syntax,
 *  clickable "See also" links). Plain text everywhere else. */
export const HELP_OPEN = '';
export const HELP_CLOSE = '';

/** Format a complex scalar as `a + bi` / `a - bi`. */
function fmtC(re: number, im: number): string {
  const sign = im < 0 || Object.is(im, -0) ? '-' : '+';
  // MATLAB displays complex values with the common decimal format on both parts
  // (no integer/zero special-case): 0 + 2i → '0.0000 + 2.0000i'.
  return `${formatScalar(re, true)} ${sign} ${formatScalar(Math.abs(im), true)}i`;
}
function complexMatrixLines(m: Mat): string[] {
  const cells: string[][] = []; let w = 0;
  for (let r = 0; r < m.rows; r++) { const row: string[] = []; for (let c = 0; c < m.cols; c++) { const i = r + c * m.rows; const s = fmtC(m.data[i], m.idata ? m.idata[i] : 0); row.push(s); w = Math.max(w, s.length); } cells.push(row); }
  return cells.map((row) => '   ' + row.map((s) => s.padStart(w)).join('   '));
}

// ── Number / matrix display ────────────────────────────────────────────
/** Display precision, set by the `format` command (short = default). */
let fmtMode: 'short' | 'long' | 'shorte' | 'longe' | 'shortg' | 'longg' | 'rat' = 'short';
export function setFormatMode(m: string): void {
  const k = m.toLowerCase().replace(/\s+/g, '');
  if (k === '' || k === 'short') fmtMode = 'short';
  else if (k === 'long') fmtMode = 'long';
  else if (k === 'shorte') fmtMode = 'shorte';
  else if (k === 'longe') fmtMode = 'longe';
  else if (k === 'shortg') fmtMode = 'shortg';
  else if (k === 'longg') fmtMode = 'longg';
  else if (k === 'rat' || k === 'rational') fmtMode = 'rat';
  // other format options (compact/loose/hex/bank…) are accepted but don't change numeric precision
}
/** MATLAB `format rat`: approximate x by a fraction p/q via continued fractions. */
function toRational(x: number): string {
  if (Number.isNaN(x)) return '*';
  if (!Number.isFinite(x)) return x > 0 ? '1/0' : '-1/0';
  if (x === 0) return '0';
  const neg = x < 0; let b = Math.abs(x);
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1; const tol = 1e-6 * Math.abs(x);
  for (let i = 0; i < 25; i++) {
    const a = Math.floor(b);
    [h1, h0] = [a * h1 + h0, h1]; [k1, k0] = [a * k1 + k0, k1];
    if (Math.abs(h1 / k1 - Math.abs(x)) <= tol || b === a || k1 > 1e9) break;
    b = 1 / (b - a);
  }
  const s = k1 === 1 ? `${h1}` : `${h1}/${k1}`;
  return neg ? `-${s}` : s;
}
/** Rows of a char matrix as strings (column-major storage → one string per row). */
function charLines(v: Mat): string[] {
  if (v.rows <= 1) return [asString(v)];
  const out: string[] = [];
  for (let r = 0; r < v.rows; r++) { let s = ''; for (let c = 0; c < v.cols; c++) s += String.fromCharCode(v.data[r + c * v.rows]); out.push(s); }
  return out;
}
const z2 = (s: string) => s.replace(/e([+-])(\d)$/, 'e$10$2');   // MATLAB pads the exponent to ≥2 digits
export function formatScalar(x: number, forceDec = false): string {
  if (Number.isNaN(x)) return fmtMode === 'rat' ? '*' : 'NaN';
  if (x === Infinity) return fmtMode === 'rat' ? '1/0' : 'Inf';
  if (x === -Infinity) return fmtMode === 'rat' ? '-1/0' : '-Inf';
  if (fmtMode === 'rat') return toRational(x);
  // forceDec: caller (a non-integer array / a complex part) wants the common decimal
  // format applied even to integer-valued elements, e.g. 1 → '1.0000', matching MATLAB.
  if (!forceDec && Number.isInteger(x) && Math.abs(x) < 1e15) return String(x);
  const a = Math.abs(x);
  switch (fmtMode) {
    case 'longe': return z2(x.toExponential(15));
    case 'shorte': return z2(x.toExponential(4));
    case 'longg': return a !== 0 && (a >= 1e15 || a < 1e-5) ? z2(x.toExponential(14)) : trimG(x.toPrecision(15));
    case 'shortg': return a !== 0 && (a >= 1e5 || a < 1e-5) ? z2(x.toExponential(4)) : trimG(x.toPrecision(5));
    case 'long': {
      if (a !== 0 && (a >= 1e15 || a < 1e-5)) return z2(x.toExponential(15));
      const dec = a === 0 ? 15 : Math.max(0, 15 - Math.floor(Math.log10(a)));
      return x.toFixed(Math.min(dec, 20));
    }
    default:   // short
      if (a !== 0 && (a >= 1e5 || a < 1e-4)) return z2(x.toExponential(4));
      return x.toFixed(4);
  }
}
/** Drop trailing zeros from a toPrecision result (the `g` formats). */
function trimG(s: string): string { return s.includes('.') && !s.includes('e') ? s.replace(/\.?0+$/, '') : s; }

function allIntegers(m: Mat): boolean {
  for (let i = 0; i < m.data.length; i++) if (!Number.isInteger(m.data[i])) return false;
  return true;
}

/** Lines for a numeric matrix body (no name, no surrounding blanks). */
export function matrixLines(m: Mat): string[] {
  if (numel(m) === 0) return ['[]'];
  const ints = allIntegers(m);
  const isInt = !!m.itype && m.itype !== 'single' && m.itype !== 'double';   // integer class → always full integer
  const cells: string[][] = [];
  let width = 0;
  for (let r = 0; r < m.rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < m.cols; c++) {
      const v = m.data[r + c * m.rows];
      // Non-integer real array: every element uses the common decimal format except an
      // exact 0, which stays '0' (MATLAB: linspace(0,1,5) → 0  0.2500 … 1.0000).
      const s = isInt ? String(Math.round(v)) : ints && Math.abs(v) < 1e15 ? String(v) : v === 0 ? '0' : formatScalar(v, true);
      row.push(s);
      width = Math.max(width, s.length);
    }
    cells.push(row);
  }
  return cells.map((row) => '   ' + row.map((s) => s.padStart(width)).join('   '));
}

/** `disp(x)` output. */
/** Brief one-token form of a value, for cell/struct display. */
function brief(v: Value): string {
  if (v.kind === 'gobj') return `<${v.gtype}>`;
  if (isHandle(v)) return `@${v.name ?? 'fn'}`;
  if (v.kind === 'cell') return `{${v.rows}×${v.cols} cell}`;
  if (v.kind === 'struct') return `[${v.rows}×${v.cols} struct]`;
  if (v.kind === 'sparse') return `[${v.rows}×${v.cols} sparse]`;
  if (v.kind === 'str') return v.rows * v.cols === 1 ? `"${v.items[0]}"` : `[${v.rows}×${v.cols} string]`;
  if (v.kind === 'graph') return `[${v.directed ? 'digraph' : 'graph'}]`;
  if (v.kind === 'geom') return `[${v.gkind}]`;
  if (v.kind === 'quantum') return `[quantum ${v.qkind}]`;
  if (v.kind === 'temporal') return v.rows * v.cols === 1 ? fmtTemporal(v.tkind, v.data[0], v.fmt) : `[${v.rows}×${v.cols} ${v.tkind}]`;
  if (v.kind === 'table') return `[${v.nrows}×${v.vars.length} ${v.isTimetable ? 'timetable' : 'table'}]`;
  if (v.kind === 'categorical') return v.rows * v.cols === 1 ? (v.codes[0] ? v.categories[v.codes[0] - 1] : '<undefined>') : `[${v.rows}×${v.cols} categorical]`;
  if (v.kind === 'map') return `[${v.store.size}×1 containers.Map]`;
  if (v.kind === 'dict') return `[${v.store.size}×1 dictionary]`;
  if (v.kind === 'sym') return v.rows * v.cols === 1 ? exprToStr(v.exprs[0]) : `[${v.rows}×${v.cols} sym]`;
  if (v.kind === 'object') return `[${v.className}]`;
  if (v.isChar) return `'${asString(v)}'`;
  if (numel(v) === 0) return '[]';
  if (isScalar(v)) return `[${isComplex(v) ? fmtC(v.data[0], v.idata![0]) : formatScalar(v.data[0])}]`;
  // MATLAB shows a short real ROW vector inline inside a cell/struct, e.g. {[1 2 3 6 5 4]};
  // columns and matrices are shown as a size summary like {2×1 double}.
  if (!isComplex(v) && !v.nd && v.rows === 1 && numel(v) <= 10) {
    return `[${Array.from(v.data, (x) => formatScalar(x)).join(' ')}]`;
  }
  return `[${v.rows}×${v.cols} ${isComplex(v) ? 'complex' : 'double'}]`;
}
function cellLines(v: { rows: number; cols: number; items: Value[] }): string[] {
  if (v.rows * v.cols === 0) return ['  {}'];
  const cells: string[][] = []; let w = 0;
  for (let r = 0; r < v.rows; r++) { const row: string[] = []; for (let c = 0; c < v.cols; c++) { const s = `{${brief(v.items[r + c * v.rows])}}`; row.push(s); w = Math.max(w, s.length); } cells.push(row); }
  return cells.map((row) => '    ' + row.map((s) => s.padEnd(w)).join('    '));
}
function structLines(v: { rows: number; cols: number; fields: Map<string, Value[]> }): string[] {
  if (v.rows === 1 && v.cols === 1) return [...v.fields.entries()].map(([k, vals]) => `    ${k}: ${brief(vals[0])}`);
  return [`  ${v.rows}×${v.cols} struct array with fields:`, ...[...v.fields.keys()].map((k) => `    ${k}`)];
}
// ── LTI model pretty-printing (tf fraction / ss matrices / zpk factored / frd) ──
const ltiNum = (x: number): string => (Math.abs(x - Math.round(x)) < 1e-10 && Math.abs(x) < 1e6 ? String(Math.round(x)) : formatScalar(x).trim());
function polyStr(c: number[], x: string): string {
  const n = c.length - 1, terms: string[] = [];
  for (let i = 0; i < c.length; i++) {
    const p = n - i, a = c[i]; if (Math.abs(a) < 1e-12) continue;
    const aa = Math.abs(a), one = Math.abs(aa - 1) < 1e-12;
    const body = p === 0 ? ltiNum(aa) : `${one ? '' : ltiNum(aa) + ' '}${x}${p === 1 ? '' : '^' + p}`;
    terms.push((a < 0 ? '- ' : '+ ') + body);
  }
  if (!terms.length) return '0';
  const s = terms.join(' '); return s.startsWith('+ ') ? s.slice(2) : '-' + s.slice(2);
}
function fractionLines(numS: string, denS: string): string[] {
  if (denS === '1') return ['  ' + numS];
  const w = Math.max(numS.length, denS.length), ctr = (s: string) => ' '.repeat(Math.floor((w - s.length) / 2)) + s;
  return ['  ' + ctr(numS), '  ' + '-'.repeat(w), '  ' + ctr(denS)];
}
const ltiTs = (v: { props: Map<string, Value> }): number => (v.props.has('Ts') ? (v.props.get('Ts') as Mat).data[0] : 0);
function ltiVarOf(v: { props: Map<string, Value> }): string {
  const vv = v.props.get('Variable'); if (vv) { try { return asString(vv); } catch { /* fall through */ } }
  return ltiTs(v) !== 0 ? 'z' : 's';
}
function ltiFooter(v: { props: Map<string, Value> }, kind: string): string[] {
  const Ts = ltiTs(v);
  return ['', Ts > 0 ? `Sample time: ${ltiNum(Ts)} seconds\nDiscrete-time ${kind}.` : Ts !== 0 ? `Discrete-time ${kind}.` : `Continuous-time ${kind}.`];
}
function factoredStr(rootsMat: Mat | undefined, x: string): string {
  if (!rootsMat || rootsMat.data.length === 0) return '1';
  const re = Array.from(rootsMat.data), im = rootsMat.idata ? Array.from(rootsMat.idata) : re.map(() => 0), used = re.map(() => false), facs: string[] = [];
  for (let i = 0; i < re.length; i++) {
    if (used[i]) continue; used[i] = true;
    if (Math.abs(im[i]) > 1e-9) {
      for (let k = i + 1; k < re.length; k++) if (!used[k] && Math.abs(re[k] - re[i]) < 1e-9 && Math.abs(im[k] + im[i]) < 1e-9) { used[k] = true; break; }
      const b = -2 * re[i], c = re[i] * re[i] + im[i] * im[i];
      facs.push(`(${x}^2 ${b < 0 ? '- ' : '+ '}${ltiNum(Math.abs(b))} ${x} ${c < 0 ? '- ' : '+ '}${ltiNum(Math.abs(c))})`);
    } else { const r = re[i]; facs.push(r === 0 ? x : `(${x} ${r < 0 ? '+ ' : '- '}${ltiNum(Math.abs(r))})`); }
  }
  return facs.join(' ');
}
function ltiLines(v: { className: string; props: Map<string, Value> }): string[] {
  const x = ltiVarOf(v);
  if (v.className === 'tf') {
    const numP = v.props.get('num'), denP = v.props.get('den');
    if (numP && numP.kind === 'cell') {
      const nyc = numP as { rows: number; cols: number; items: Value[] }, dyc = denP as { items: Value[] }, out: string[] = [];
      for (let j = 0; j < nyc.cols; j++) for (let i = 0; i < nyc.rows; i++) {
        out.push('', `  From input ${j + 1} to output ${i + 1}:`, ...fractionLines(polyStr(Array.from((nyc.items[i + j * nyc.rows] as Mat).data), x), polyStr(Array.from((dyc.items[i + j * nyc.rows] as Mat).data), x)));
      }
      return [...out, ...ltiFooter(v, 'transfer function')];
    }
    return [...fractionLines(polyStr(Array.from((numP as Mat).data), x), polyStr(Array.from((denP as Mat).data), x)), ...ltiFooter(v, 'transfer function')];
  }
  if (v.className === 'ss' || v.className === 'dss') {
    const out: string[] = [];
    for (const L of ['A', 'B', 'C', 'D', 'E']) { const Mt = v.props.get(L); if (!Mt) continue; out.push(`  ${L} = `, ...matrixLines(Mt as Mat).map((s) => '  ' + s), ''); }
    return [...out, ...ltiFooter(v, 'state-space model')];
  }
  if (v.className === 'zpk') {
    const k = v.props.has('k') ? (v.props.get('k') as Mat).data[0] : 1;
    const numS = ((Math.abs(k - 1) < 1e-12 ? '' : ltiNum(k) + ' ') + factoredStr(v.props.get('z') as Mat, x)).trim() || ltiNum(k);
    return [...fractionLines(numS, factoredStr(v.props.get('p') as Mat, x)), ...ltiFooter(v, 'zero-pole-gain model')];
  }
  if (v.className === 'frd') {
    const f = v.props.get('Frequency') as Mat | undefined, nf = f ? f.rows * f.cols : 0;
    return [`  Frequency-response data model with ${nf} frequency points.`, ...ltiFooter(v, 'frequency-response data model')];
  }
  return [];
}
/** Generic toolbox-object display: `className with properties:` then `name: brief(value)`. */
function objectLines(v: { className: string; props: Map<string, Value> }): string[] {
  if (v.className === 'tf' || v.className === 'ss' || v.className === 'dss' || v.className === 'zpk' || v.className === 'frd') return ltiLines(v);
  return [`  ${v.className} with properties:`, '', ...[...v.props.entries()].map(([k, val]) => `    ${k}: ${brief(val)}`)];
}
/** MATLAB-style sparse display: a column-major list of `(i,j)  value` lines. */
function sparseLines(v: { rows: number; cols: number; colptr: Int32Array; rowind: Int32Array; values: Float64Array }): string[] {
  if (v.values.length === 0) return [`   All zero sparse: ${v.rows}×${v.cols}`];
  const out: string[] = [];
  for (let j = 0; j < v.cols; j++) for (let p = v.colptr[j]; p < v.colptr[j + 1]; p++) out.push(`   (${v.rowind[p] + 1},${j + 1})${' '.repeat(Math.max(1, 8 - String(v.rowind[p] + 1).length))}${formatScalar(v.values[p])}`);
  return out;
}

export function dispValue(v: Value): string {
  if (v.kind === 'cell') return cellLines(v).join('\n');
  if (v.kind === 'struct') return structLines(v).join('\n');
  if (v.kind === 'sparse') return sparseLines(v).join('\n');
  if (v.kind === 'str') return v.rows * v.cols === 1 ? v.items[0] : strLines(v).join('\n');   // disp of a scalar string is bare text (no quotes); arrays show the quoted grid
  if (v.kind === 'graph') return graphLines(v).join('\n');
  if (v.kind === 'geom') return geomLines(v).join('\n');
  if (v.kind === 'quantum') return quantumLines(v).join('\n');
  if (v.kind === 'object') return objectLines(v).join('\n');
  if (v.kind === 'temporal') return temporalLines(v).join('\n');
  if (v.kind === 'table') return tableLines(v).join('\n');
  if (v.kind === 'categorical') return categoricalLines(v).join('\n');
  if (v.kind === 'sym') return symLines(v).join('\n');
  if (v.kind === 'map') return `  Map with properties:\n\n        Count: ${v.store.size}\n      KeyType: ${v.keyKind}\n    ValueType: ${v.valType}`;
  if (v.kind === 'dict') { const ks = [...v.store.keys()]; return `  dictionary (${v.keyKind} ⟼ ${v.valType}) with ${v.store.size} entries:\n` + ks.map((k) => `    ${typeof k === 'string' ? '"' + k + '"' : k} ⟼ ${brief(v.store.get(k)!)}`).join('\n'); }
  if (v.kind === 'gobj') return `<${v.gtype} handle>`;
  if (isHandle(v)) return `@${v.name ?? 'anonymous'}`;
  if (v.kind === 'num' && v.nd) return ndLines(v).join('\n');
  if (v.isChar) return charLines(v).join('\n');
  if (numel(v) === 0) return '';
  if (isComplex(v)) return isScalar(v) ? fmtC(v.data[0], v.idata![0]) : complexMatrixLines(v).join('\n');
  if (isScalar(v)) { const isInt = !!v.itype && v.itype !== 'single' && v.itype !== 'double'; return isInt ? String(Math.round(v.data[0])) : formatScalar(v.data[0]); }
  return matrixLines(v).join('\n');
}

/** Auto-display of `name = value` (unsuppressed statements). */
export function displayValue(name: string, v: Value): string {
  if (v.kind === 'cell') return `${name} =\n\n  ${v.rows}×${v.cols} cell array\n${cellLines(v).join('\n')}\n`;
  if (v.kind === 'struct') return `${name} =\n\n  struct with fields:\n${structLines(v).join('\n')}\n`;
  if (v.kind === 'sparse') return `${name} = ${v.rows}×${v.cols} sparse double matrix (${v.values.length} nonzeros)\n\n${sparseLines(v).join('\n')}\n`;
  if (v.kind === 'str') return `${name} =\n\n${strLines(v).join('\n')}\n`;
  if (v.kind === 'graph') return `${name} =\n\n  ${v.directed ? 'digraph' : 'graph'} with properties:\n${graphLines(v).join('\n')}\n`;
  if (v.kind === 'geom') return `${name} =\n\n  ${v.gkind} with properties:\n${geomLines(v).join('\n')}\n`;
  if (v.kind === 'quantum') return `${name} =\n\n  quantum.${v.qkind} with properties:\n${quantumLines(v).join('\n')}\n`;
  if (v.kind === 'object') return `${name} =\n\n${objectLines(v).join('\n')}\n`;
  if (v.kind === 'temporal') return `${name} =\n\n${temporalLines(v).join('\n')}\n`;
  if (v.kind === 'table') return `${name} =\n\n  ${v.nrows}×${v.vars.length} ${v.isTimetable ? 'timetable' : 'table'}\n\n${tableLines(v).join('\n')}\n`;
  if (v.kind === 'categorical') return `${name} =\n\n${categoricalLines(v).join('\n')}\n`;
  if (v.kind === 'sym') return `${name} =\n\n${symTexLines(v).join('\n')}\n`;
  if (v.kind === 'map' || v.kind === 'dict') return `${name} =\n\n${dispValue(v)}\n`;
  if (v.kind === 'num' && v.nd) return `${name} =\n\n${ndLines(v).join('\n')}\n`;
  if (v.kind === 'gobj') return `${name} =\n\n  <${v.gtype} handle>\n`;
  if (isHandle(v)) return `${name} =\n\n    @${v.name ?? 'anonymous function'}\n`;
  if (v.isChar) { const ls = charLines(v); return ls.length <= 1 ? `${name} =\n\n    ${ls[0] ?? ''}\n` : `${name} =\n\n` + ls.map((l) => '    ' + l).join('\n') + '\n'; }
  if (numel(v) === 0) return `${name} =\n\n     []\n`;
  if (isComplex(v)) return isScalar(v) ? `${name} =\n\n   ${fmtC(v.data[0], v.idata![0])}\n` : `${name} =\n\n${complexMatrixLines(v).join('\n')}\n`;
  if (isScalar(v)) { const isInt = !!v.itype && v.itype !== 'single' && v.itype !== 'double'; return `${name} =\n\n   ${isInt ? String(Math.round(v.data[0])) : formatScalar(v.data[0])}\n`; }
  return `${name} =\n\n${matrixLines(v).join('\n')}\n`;
}

/** Display of a string array: scalar as `"text"`, otherwise quoted entries in a grid. */
function strLines(v: { rows: number; cols: number; items: string[] }): string[] {
  if (v.rows * v.cols === 1) return [`    "${v.items[0]}"`];
  if (v.rows * v.cols === 0) return ['    0×0 string array'];
  const q = v.items.map((s) => `"${s}"`); let w = 0; for (const s of q) w = Math.max(w, s.length);
  const lines: string[] = [];
  for (let r = 0; r < v.rows; r++) { const row: string[] = []; for (let c = 0; c < v.cols; c++) row.push(q[r + c * v.rows].padEnd(w)); lines.push('    ' + row.join('    ')); }
  return lines;
}

/** Summary display of a graph/digraph: edge & node tables (MATLAB-style). */
function graphLines(v: { directed: boolean; n: number; edges: { s: number; t: number; w: number }[]; names?: string[] }): string[] {
  const weighted = v.edges.some((e) => e.w !== 1);
  return [
    `    Edges: [${v.edges.length}×${weighted ? 2 : 1} table]`,
    `    Nodes: [${v.n}×${v.names ? 1 : 0} table]`,
  ];
}

/** Summary display of a geometry object (Points / ConnectivityList / Vertices / Alpha). */
function geomLines(v: { gkind: string; points: number[][]; conn?: number[][]; alpha?: number; dim: number }): string[] {
  const np = v.points.length, d = v.dim;
  if (v.gkind === 'polyshape') return [`      Vertices: [${np}×2 double]`, `    NumRegions: ${v.points.length ? 1 : 0}`, `      NumHoles: 0`];
  if (v.gkind === 'alphaShape') return [`    Points: [${np}×${d} double]`, `    Alpha: ${v.alpha ?? 0}`];
  return [`    Points: [${np}×${d} double]`, `    ConnectivityList: [${(v.conn ?? []).length}×${d + 1} double]`];
}

/** One cell of a table column, formatted as text. */
function tableCell(col: Value, row: number): string {
  if (col.kind === 'str') return `"${col.items[row] ?? ''}"`;
  if (col.kind === 'temporal') return fmtTemporal(col.tkind, col.data[row], (col as any).fmt);
  if (col.kind === 'num') { const k = col.cols; if (k <= 1) return col.isChar ? String.fromCharCode(col.data[row]) : formatScalar(col.data[row]); const parts: string[] = []; for (let c = 0; c < k; c++) parts.push(formatScalar(col.data[row + c * col.rows])); return parts.join(' '); }
  if (col.kind === 'cell') return brief(col.items[row]);
  return brief(col);
}
/** Grid display of a table: variable-name header, underline, then rows. */
function tableLines(v: { vars: string[]; cols: Value[]; nrows: number; isTimetable?: boolean; rowTimes?: { tkind: string; data: Float64Array } }): string[] {
  const headers = v.vars.slice(); const colVals = v.cols.slice();
  if (v.isTimetable && v.rowTimes) { headers.unshift('Time'); colVals.unshift({ kind: 'temporal', tkind: v.rowTimes.tkind, rows: v.nrows, cols: 1, data: v.rowTimes.data } as Value); }
  const show = Math.min(v.nrows, 100);
  const cells: string[][] = []; for (let r = 0; r < show; r++) cells.push(colVals.map((c) => tableCell(c, r)));
  const widths = headers.map((h, j) => Math.max(h.length, ...cells.map((row) => row[j].length), 4));
  const pad = (s: string, w: number) => s.padStart(w);
  const lines = ['    ' + headers.map((h, j) => pad(h, widths[j])).join('    '), '    ' + widths.map((w) => '_'.repeat(w)).join('    '), ''];
  for (const row of cells) lines.push('    ' + row.map((s, j) => pad(s, widths[j])).join('    '));
  if (v.nrows > show) lines.push(`    … ${v.nrows - show} more rows`);
  return lines;
}

/** Format one datetime (serial datenum) or duration (days) value. */
const TMONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtTemporal(tkind: string, val: number, fmt?: string): string {
  if (Number.isNaN(val)) return tkind === 'datetime' ? 'NaT' : 'NaN';
  if (tkind === 'datetime') {
    const ms = Math.round((val - 719529) * 86400000); const d = new Date(ms); const p2 = (x: number) => String(x).padStart(2, '0');
    const date = `${p2(d.getUTCDate())}-${TMONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
    const h = d.getUTCHours(), mi = d.getUTCMinutes(), s = d.getUTCSeconds();
    return (h || mi || s) ? `${date} ${p2(h)}:${p2(mi)}:${p2(s)}` : date;
  }
  // duration with a single-unit format (set by days/hours/minutes/seconds/years): "N days" etc.
  if (fmt && fmt !== 'hh:mm:ss') {
    const perDay: Record<string, number> = { y: 365.2425, d: 1, h: 1 / 24, m: 1 / 1440, s: 1 / 86400, ms: 1 / 86400000 };
    const label: Record<string, [string, string]> = { y: ['yr', 'yrs'], d: ['day', 'days'], h: ['hr', 'hr'], m: ['min', 'min'], s: ['sec', 'sec'], ms: ['ms', 'ms'] };
    if (perDay[fmt]) { const q = val / perDay[fmt]; const qs = Number.isInteger(q) ? String(q) : String(+q.toFixed(4)); const [one, many] = label[fmt]; return `${qs} ${q === 1 ? one : many}`; }
  }
  // duration → HH:MM:SS (days converted to hours) — MATLAB default 'hh:mm:ss'
  const totalSec = val * 86400; const neg = totalSec < 0;
  // round to the nearest millisecond first, so float error like 5579.9999 doesn't render as 32:60
  const t = Math.round(Math.abs(totalSec) * 1000) / 1000;
  const hh = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), ss = t % 60;
  const p2 = (x: number) => String(Math.floor(x)).padStart(2, '0');
  return `${neg ? '-' : ''}${p2(hh)}:${p2(mm)}:${ss % 1 ? ss.toFixed(3) : p2(ss)}`;
}
function temporalLines(v: { tkind: string; rows: number; cols: number; data: Float64Array; fmt?: string }): string[] {
  if (v.rows * v.cols === 1) return ['   ' + fmtTemporal(v.tkind, v.data[0], v.fmt)];
  const strs: string[] = []; for (let i = 0; i < v.data.length; i++) strs.push(fmtTemporal(v.tkind, v.data[i], v.fmt));
  let w = 0; for (const s of strs) w = Math.max(w, s.length); const lines: string[] = [];
  for (let r = 0; r < v.rows; r++) { const row: string[] = []; for (let c = 0; c < v.cols; c++) row.push(strs[r + c * v.rows].padStart(w)); lines.push('   ' + row.join('   ')); }
  return lines;
}

/** Display of a symbolic array: scalar inline, otherwise a bracketed grid of expressions. */
function symLines(v: { rows: number; cols: number; exprs: import('./sym').SymExpr[] }): string[] {
  if (v.rows * v.cols === 1) return ['    ' + exprToStr(v.exprs[0])];
  const cells: string[][] = []; for (let r = 0; r < v.rows; r++) { const row: string[] = []; for (let c = 0; c < v.cols; c++) row.push(exprToStr(v.exprs[r + c * v.rows])); cells.push(row); }
  return cells.map((row) => '    [ ' + row.join(', ') + ' ]');
}

/** KaTeX-wrapped display of a symbolic value (a scalar inline, a matrix as a bmatrix). */
export function symTexLines(v: { rows: number; cols: number; exprs: import('./sym').SymExpr[] }): string[] {
  if (v.rows * v.cols === 0) return ['    [ ]'];
  if (v.rows * v.cols === 1) return ['    ' + TEX_OPEN + exprToLatex(v.exprs[0]) + TEX_CLOSE];
  const rows: string[] = [];
  for (let r = 0; r < v.rows; r++) { const row: string[] = []; for (let c = 0; c < v.cols; c++) row.push(exprToLatex(v.exprs[r + c * v.rows])); rows.push(row.join(' & ')); }
  return ['    ' + TEX_OPEN + `\\begin{bmatrix}${rows.join(' \\\\ ')}\\end{bmatrix}` + TEX_CLOSE];
}

/** Column display of a categorical array (one label per row). */
function categoricalLines(v: { rows: number; cols: number; codes: Int32Array; categories: string[] }): string[] {
  const label = (i: number) => (v.codes[i] ? v.categories[v.codes[i] - 1] : '<undefined>');
  if (v.rows * v.cols === 1) return ['     ' + label(0)];
  const lines: string[] = [];
  for (let r = 0; r < v.rows; r++) { const row: string[] = []; for (let c = 0; c < v.cols; c++) row.push(label(r + c * v.rows)); lines.push('     ' + row.join('      ')); }
  return lines;
}

/** Summary display of a quantum object. */
function quantumLines(v: { qkind: string; gate?: string; targets?: number[]; controls?: number[]; numQubits?: number; gates?: unknown[]; re?: Float64Array }): string[] {
  if (v.qkind === 'gate') return [`    Type: "${v.gate}"`, `    TargetQubits: [${(v.targets ?? []).join(' ')}]`, ...(v.controls?.length ? [`    ControlQubits: [${v.controls.join(' ')}]`] : [])];
  if (v.qkind === 'circuit') return [`    NumQubits: ${v.numQubits}`, `    Gates: [${v.gates?.length ?? 0}×1 quantum.gate]`];
  return [`    NumQubits: ${v.numQubits}`, `    BasisStates: ${v.re ? v.re.length : 0}`];
}

/** Slice-wise display of an N-D array: each page as `(:,:,k) = <2-D slice>`. */
function ndLines(v: Mat): string[] {
  const dims = v.nd!; const d0 = dims[0], d1 = dims[1], pageSize = d0 * d1;
  const higher = dims.slice(2); const nPages = higher.reduce((p, x) => p * x, 1);
  const out: string[] = [];
  for (let pg = 0; pg < nPages; pg++) {
    let rem = pg; const idx: number[] = []; for (const h of higher) { idx.push((rem % h) + 1); rem = Math.floor(rem / h); }
    const sd = new Float64Array(pageSize); const si = v.idata ? new Float64Array(pageSize) : undefined;
    for (let i = 0; i < pageSize; i++) { sd[i] = v.data[pg * pageSize + i]; if (si) si[i] = v.idata![pg * pageSize + i]; }
    const slice: Mat = { kind: 'num', rows: d0, cols: d1, data: sd, idata: si, isChar: v.isChar };
    out.push(`(:,:,${idx.join(',')}) =`, '', dispValue(slice), '');
  }
  return out;
}

// ── printf ─────────────────────────────────────────────────────────────
/** Flatten args (column-major) into a stream; char args stay grouped for %s. */
function buildStream(args: Value[]): Array<{ s: string } | { n: number }> {
  const stream: Array<{ s: string } | { n: number }> = [];
  for (const a of args) {
    if (isHandle(a)) { stream.push({ s: a.name ?? '@fn' }); continue; }
    if (a.kind === 'gobj') { stream.push({ s: `<${a.gtype}>` }); continue; }
    if (a.kind === 'temporal') { for (const x of a.data) stream.push({ s: fmtTemporal(a.tkind, x, a.fmt) }); continue; }
    if (a.kind === 'sym') { for (const e of a.exprs) stream.push({ s: exprToStr(e) }); continue; }
    if (a.kind === 'categorical') { for (const c of a.codes) stream.push({ s: c ? a.categories[c - 1] : '<undefined>' }); continue; }
    if (a.kind === 'cell' || a.kind === 'struct' || a.kind === 'graph' || a.kind === 'geom' || a.kind === 'quantum' || a.kind === 'object' || a.kind === 'table' || a.kind === 'map' || a.kind === 'dict') { stream.push({ s: brief(a) }); continue; }
    if (a.kind === 'str') { for (const s of a.items) stream.push({ s }); continue; }
    if (a.kind === 'sparse') { for (const v of a.values) stream.push({ n: v }); continue; }
    if (a.isChar) { stream.push({ s: asString(a) }); continue; }
    for (let i = 0; i < a.data.length; i++) stream.push({ n: a.data[i] });
  }
  return stream;
}

const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', '%': '%' };

export function sprintf(fmt: string, args: Value[]): string {
  const stream = buildStream(args);
  let p = 0;
  const nextNum = (): number => { while (p < stream.length && !('n' in stream[p])) p++; const c = stream[p++]; return c && 'n' in c ? c.n : 0; };
  const nextStr = (): string => { const c = stream[p]; if (c && 's' in c) { p++; return c.s; } if (c && 'n' in c) { p++; return String.fromCharCode(c.n); } return ''; };

  const renderOnce = (): { text: string; consumedAny: boolean } => {
    let out = '';
    let consumedAny = false;
    let i = 0;
    while (i < fmt.length) {
      const ch = fmt[i];
      if (ch === '\\') { const e = fmt[i + 1]; out += ESCAPES[e] ?? ('\\' + (e ?? '')); i += 2; continue; }
      if (ch !== '%') { out += ch; i++; continue; }
      // parse conversion
      let j = i + 1;
      let flags = '';
      while ('-+ 0#'.includes(fmt[j])) { flags += fmt[j]; j++; }
      let width = '';
      while (fmt[j] >= '0' && fmt[j] <= '9') { width += fmt[j]; j++; }
      let prec = '';
      if (fmt[j] === '.') { prec += '.'; j++; while (fmt[j] >= '0' && fmt[j] <= '9') { prec += fmt[j]; j++; } }
      const conv = fmt[j];
      i = j + 1;
      if (conv === '%') { out += '%'; continue; }
      consumedAny = true;
      out += applyConv(conv, flags, width, prec, nextNum, nextStr);
    }
    return { text: out, consumedAny };
  };

  // Repeat the format while values remain (MATLAB behaviour).
  let result = '';
  const first = renderOnce();
  result += first.text;
  if (first.consumedAny) {
    while (p < stream.length) {
      const r = renderOnce();
      result += r.text;
      if (!r.consumedAny) break;
    }
  }
  return result;
}

function applyConv(
  conv: string, flags: string, width: string, prec: string,
  nextNum: () => number, nextStr: () => string,
): string {
  const w = width ? parseInt(width, 10) : 0;
  const pr = prec ? parseInt(prec.slice(1), 10) : undefined;
  let body: string;
  switch (conv) {
    case 'd': case 'i': case 'u': {
      const v = nextNum();
      body = Number.isFinite(v) ? String(Math.round(v)) : (v === Infinity ? 'Inf' : v === -Infinity ? '-Inf' : 'NaN');
      break;
    }
    case 'f': { const v = nextNum(); body = Number.isFinite(v) ? v.toFixed(pr ?? 6) : (Number.isNaN(v) ? 'NaN' : (v > 0 ? 'Inf' : '-Inf')); break; }
    case 'e': case 'E': { const v = nextNum(); if (!Number.isFinite(v)) { body = Number.isNaN(v) ? 'NaN' : (v > 0 ? 'Inf' : '-Inf'); } else { body = v.toExponential(pr ?? 6).replace(/e([+-])(\d)$/, 'e$10$2'); if (conv === 'E') body = body.toUpperCase(); } break; }
    case 'g': case 'G': { const v = nextNum(); body = formatG(v, pr ?? 6); if (conv === 'G') body = body.toUpperCase(); break; }
    case 'c': { body = String.fromCharCode(nextNum()); break; }
    case 's': { body = nextStr(); break; }
    default: return '%' + conv;
  }
  if (w > body.length) {
    if (flags.includes('-')) body = body.padEnd(w);
    else if (flags.includes('0') && 'difeEgG'.includes(conv)) {
      const neg = body.startsWith('-');
      body = (neg ? '-' : '') + (neg ? body.slice(1) : body).padStart(w - (neg ? 1 : 0), '0');
    } else body = body.padStart(w);
  }
  return body;
}

function formatG(v: number, sig: number): string {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? 'NaN' : (v > 0 ? 'Inf' : '-Inf');
  if (v === 0) return '0';
  const s = v.toPrecision(sig || 1);
  return s.includes('.') && !s.includes('e') ? s.replace(/\.?0+$/, '') : s;
}
