/**
 * Runtime values for the MATLAB subset.
 *
 * Everything numeric is a dense, column-major matrix (scalars are 1×1, strings
 * are 1×n char rows). Function handles are the only other value kind.
 */

export interface Mat {
  kind: 'num';
  rows: number;
  cols: number;
  data: Float64Array;   // column-major real part: element (r,c) at data[r + c*rows]
  idata?: Float64Array; // column-major imaginary part; present ⇒ complex storage
  isChar?: boolean;
  isBool?: boolean;
  itype?: string;       // integer/single class tag: 'int8'…'uint64' | 'single' (absent ⇒ double)
  nd?: number[];        // N-D size (length ≥ 3); data is column-major over nd. rows=nd[0], cols=prod(nd[1:]).
}
export interface Handle {
  kind: 'handle';
  call: (args: Value[], nargout: number) => Promise<Value[]>;
  name?: string;
  src?: string;   // original source text for anonymous functions (func2str)
}
/** Graphics handle (e.g. the result of `gca`). Properties live in the graphics sink. */
export interface GObj {
  kind: 'gobj';
  gtype: 'axes' | 'figure' | 'line';
}
/** Cell array — a rectangular container of arbitrary values (column-major). */
export interface Cell {
  kind: 'cell';
  rows: number;
  cols: number;
  items: Value[];   // column-major: element (r,c) at items[r + c*rows]
}
/** Struct (scalar or array) — named fields, each a per-element value list (column-major). */
export interface StructV {
  kind: 'struct';
  rows: number;
  cols: number;
  fields: Map<string, Value[]>;  // field name → value per element (length rows*cols)
}
/** Sparse matrix in Compressed Sparse Column (CSC) format. */
export interface Sparse {
  kind: 'sparse';
  rows: number;
  cols: number;
  colptr: Int32Array;   // length cols+1: column j occupies rowind/values[colptr[j]..colptr[j+1])
  rowind: Int32Array;   // row index of each stored entry (sorted within a column)
  values: Float64Array; // the stored (structurally nonzero) values
}
/** String array (the `"…"` string class), column-major; scalar = 1×1. */
export interface Str {
  kind: 'str';
  rows: number;
  cols: number;
  items: string[];   // column-major: element (r,c) at items[r + c*rows]
}
/** Graph / digraph object: node count (+ optional names) and a weighted edge list. */
export interface Graph {
  kind: 'graph';
  directed: boolean;
  n: number;                                   // number of nodes
  names?: string[];                            // optional node names (length n)
  edges: { s: number; t: number; w: number }[]; // 0-based endpoints, weight (default 1)
}
/** Geometry object: triangulation / delaunayTriangulation / polyshape / alphaShape. */
export interface Geom {
  kind: 'geom';
  gkind: 'triangulation' | 'delaunayTriangulation' | 'polyshape' | 'alphaShape';
  points: number[][];   // n×d node/vertex coordinates (polyshape: vertices, NaN-row separated per boundary)
  conn?: number[][];    // 0-based connectivity (triangulation simplices)
  alpha?: number;       // alphaShape radius parameter
  dim: number;          // 2 or 3
}
/** Quantum object: a gate, a circuit (list of gates), or a simulated state. */
export interface Quantum {
  kind: 'quantum';
  qkind: 'gate' | 'circuit' | 'state';
  gate?: string;            // gate name (gate)
  targets?: number[];       // target qubits, 1-based (gate)
  controls?: number[];      // control qubits, 1-based (gate)
  angles?: number[];        // rotation angles (gate)
  umat?: number[];          // explicit 2^k×2^k unitary (flat, row-major [re,im] pairs) for unitaryGate
  subgates?: Quantum[];     // compositeGate sub-gates
  numQubits?: number;       // circuit/state qubit count
  gates?: Quantum[];        // circuit's gate list
  re?: Float64Array;        // state amplitudes (real part), length 2^n
  im?: Float64Array;        // state amplitudes (imag part)
}
/** datetime or duration array (column-major). datetime stores serial date numbers
 *  (MATLAB datenum epoch); duration stores a length of time in days. */
export interface Temporal {
  kind: 'temporal';
  tkind: 'datetime' | 'duration';
  rows: number;
  cols: number;
  data: Float64Array;   // datetime → serial datenum; duration → days
  fmt?: string;         // display format
}
/** Table / timetable: named column variables sharing a common row count. */
export interface Table {
  kind: 'table';
  vars: string[];          // variable (column) names
  cols: Value[];           // each variable's data (Mat n×k, Str, or Temporal of n rows)
  nrows: number;
  isTimetable?: boolean;
  rowTimes?: Temporal;     // timetable row-time vector
  rowDimName?: string;     // 'Time' for timetables, 'Row' otherwise
}
/** Symbolic array (Symbolic Math Toolbox): per-element expression trees (column-major). */
export interface Sym {
  kind: 'sym';
  rows: number;
  cols: number;
  exprs: import('./sym').SymExpr[];
  fnArgs?: string[];   // for symbolic functions `syms y(t)` — the formal args; a call y(0) substitutes them
}
/** Categorical array: integer codes (1-based; 0 ⇒ <undefined>) into a category-label list. */
export interface Categorical {
  kind: 'categorical';
  rows: number;
  cols: number;
  codes: Int32Array;     // column-major; 0 = <undefined>
  categories: string[];  // category labels in display/sort order
  ordinal?: boolean;
}
/** containers.Map: a handle (reference) object mapping char/double keys to values. */
export interface MapV { kind: 'map'; keyKind: 'char' | 'double'; valType: string; store: Map<string | number, Value>; }
/** dictionary: a value (copy-on-assign) object mapping char/double keys to values. */
export interface DictV { kind: 'dict'; keyKind: 'char' | 'double'; valType: string; store: Map<string | number, Value>; }
/** Generic toolbox object: a class instance identified by `className`, holding named
 *  properties. Used by toolbox modules (Control `tf`/`ss`, Curve Fitting `cfit`, Statistics
 *  distribution objects, …) so each new object family needs no new Value-union member.
 *  Methods are ordinary builtins that branch on `isObject(v) && v.className === '<name>'`. */
export interface ClassV { kind: 'object'; className: string; props: Map<string, Value>; rows?: number; cols?: number; }
export type Value = Mat | Handle | GObj | Cell | StructV | Sparse | Str | Graph | Geom | Quantum | Temporal | Table | Sym | Categorical | MapV | DictV | ClassV;

export class MatError extends Error {
  identifier?: string;
  constructor(message: string, identifier?: string) { super(message); this.identifier = identifier; }
}

// ── Constructors ───────────────────────────────────────────────────────
export function mat(rows: number, cols: number, data: Float64Array): Mat {
  return { kind: 'num', rows, cols, data };
}
export function zeros(rows: number, cols: number): Mat {
  return mat(rows, cols, new Float64Array(rows * cols));
}
export function scalar(x: number): Mat { return mat(1, 1, Float64Array.of(x)); }
export function bool(b: boolean): Mat { return { ...scalar(b ? 1 : 0), isBool: true }; }
export function empty(): Mat { return mat(0, 0, new Float64Array(0)); }

// Canonical row-array → column-major Mat. Ragged-safe (pads short rows) so it is the single
// adapter for every toolbox; do not reimplement this per-file.
export function fromRows(rowsArr: number[][]): Mat {
  const rows = rowsArr.length;
  const cols = rows ? Math.max(...rowsArr.map((r) => r.length)) : 0;
  const m = zeros(rows, cols);
  for (let r = 0; r < rows; r++) for (let c = 0; c < (rowsArr[r]?.length ?? 0); c++) m.data[r + c * rows] = rowsArr[r][c];
  return m;
}
// Canonical column-major Mat → row-array (inverse of fromRows).
export function matRows(m: Mat): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < m.rows; r++) { const row: number[] = []; for (let c = 0; c < m.cols; c++) row.push(m.data[r + c * m.rows]); out.push(row); }
  return out;
}
export function rowVec(arr: number[]): Mat {
  const m = zeros(1, arr.length);
  m.data.set(arr);
  return m;
}
export function colVec(arr: number[]): Mat {
  const m = zeros(arr.length, 1);
  m.data.set(arr);
  return m;
}
export function str(s: string): Mat {
  const m = zeros(s.length ? 1 : 0, s.length);
  for (let i = 0; i < s.length; i++) m.data[i] = s.charCodeAt(i);
  m.isChar = true;
  return m;
}

// ── Inspectors ─────────────────────────────────────────────────────────
export function isMat(v: Value): v is Mat { return v.kind === 'num'; }
export function isHandle(v: Value): v is Handle { return v.kind === 'handle'; }
export function isCell(v: Value): v is Cell { return v.kind === 'cell'; }
export function isStruct(v: Value): v is StructV { return v.kind === 'struct'; }
export function isSparse(v: Value): v is Sparse { return v.kind === 'sparse'; }
export function isStr(v: Value): v is Str { return v.kind === 'str'; }
export function isGraph(v: Value): v is Graph { return v.kind === 'graph'; }
export function makeGraph(directed: boolean, n: number, edges: { s: number; t: number; w: number }[], names?: string[]): Graph {
  // MATLAB stores edges sorted by endpoints (undirected edges normalized to s<=t), which
  // determines edge indices for findedge/G.Edges. Sort here so indexing matches.
  const norm = edges.map((e) => (!directed && e.s > e.t ? { s: e.t, t: e.s, w: e.w } : { s: e.s, t: e.t, w: e.w }));
  norm.sort((a, b) => a.s - b.s || a.t - b.t);
  return { kind: 'graph', directed, n, edges: norm, names };
}
export function isGeom(v: Value): v is Geom { return v.kind === 'geom'; }
export function isQuantum(v: Value): v is Quantum { return v.kind === 'quantum'; }
export function isTemporal(v: Value): v is Temporal { return v.kind === 'temporal'; }
export function isTable(v: Value): v is Table { return v.kind === 'table'; }
export function isSym(v: Value): v is Sym { return v.kind === 'sym'; }
export function makeSym(rows: number, cols: number, exprs: import('./sym').SymExpr[]): Sym { return { kind: 'sym', rows, cols, exprs }; }
export function isCategorical(v: Value): v is Categorical { return v.kind === 'categorical'; }
export function makeCategorical(rows: number, cols: number, codes: Int32Array, categories: string[], ordinal?: boolean): Categorical { return { kind: 'categorical', rows, cols, codes, categories, ordinal }; }
export function makeTemporal(tkind: 'datetime' | 'duration', rows: number, cols: number, data: Float64Array, fmt?: string): Temporal { return { kind: 'temporal', tkind, rows, cols, data, fmt }; }
export function makeStrArr(rows: number, cols: number, items: string[]): Str { return { kind: 'str', rows, cols, items }; }
export function makeStr(s: string): Str { return { kind: 'str', rows: 1, cols: 1, items: [s] }; }
export function makeCell(rows: number, cols: number, items: Value[]): Cell { return { kind: 'cell', rows, cols, items }; }
export function isMap(v: Value): v is MapV { return v.kind === 'map'; }
export function makeMap(keyKind: 'char' | 'double', valType: string): MapV { return { kind: 'map', keyKind, valType, store: new Map() }; }
/** Normalize a key value to the Map's internal key (string for char keys, number for double). */
export function mapNormKey(m: MapV | DictV, k: Value): string | number { return m.keyKind === 'char' ? asString(k) : asScalar(k); }
export function isDict(v: Value): v is DictV { return v.kind === 'dict'; }
export function makeDict(keyKind: 'char' | 'double', valType: string): DictV { return { kind: 'dict', keyKind, valType, store: new Map() }; }
export function isObject(v: Value): v is ClassV { return v.kind === 'object'; }
export function makeObject(className: string, props: Record<string, Value> | Map<string, Value>, rows = 1, cols = 1): ClassV {
  return { kind: 'object', className, props: props instanceof Map ? props : new Map(Object.entries(props)), rows, cols };
}
export function cloneDict(d: DictV): DictV { return { kind: 'dict', keyKind: d.keyKind, valType: d.valType, store: new Map(d.store) }; }
/** Dimensions of any value. */
export function dimsOf(v: Value): [number, number] {
  if (v.kind === 'num' || v.kind === 'cell' || v.kind === 'struct' || v.kind === 'sparse' || v.kind === 'str' || v.kind === 'temporal') return [v.rows, v.cols];
  if (v.kind === 'table') return [v.nrows, v.vars.length];
  if (v.kind === 'sym' || v.kind === 'categorical') return [v.rows, v.cols];
  return [1, 1];   // graph/handle/gobj are scalar objects

}

// ── Sparse (CSC) constructors / conversions ────────────────────────────
/** Build a CSC matrix from triplets (1-based row/col indices), summing duplicates. */
export function sparseFromTriplets(rows: number, cols: number, ii: number[], jj: number[], vv: number[]): Sparse {
  const acc = new Map<number, number>();
  for (let k = 0; k < ii.length; k++) {
    const i = ii[k] - 1, j = jj[k] - 1; if (i < 0 || i >= rows || j < 0 || j >= cols) throw new MatError('sparse: index out of range');
    const key = j * rows + i; const v = vv.length === 1 ? vv[0] : vv[k];
    acc.set(key, (acc.get(key) ?? 0) + v);
  }
  return sparseFromMap(rows, cols, acc);
}
/** Build CSC from a column-major linear-index → value map (drops exact zeros). */
export function sparseFromMap(rows: number, cols: number, acc: Map<number, number>): Sparse {
  const keys = [...acc.keys()].filter((k) => acc.get(k) !== 0).sort((a, b) => a - b);
  const colptr = new Int32Array(cols + 1);
  const rowind = new Int32Array(keys.length); const values = new Float64Array(keys.length);
  let p = 0, col = 0;
  for (const key of keys) {
    const j = Math.floor(key / rows), i = key - j * rows;
    while (col < j) colptr[++col] = p;
    rowind[p] = i; values[p] = acc.get(key)!; p++;
  }
  while (col < cols) colptr[++col] = p;
  return { kind: 'sparse', rows, cols, colptr, rowind, values };
}
export function denseToSparse(A: Mat): Sparse {
  const acc = new Map<number, number>();
  for (let c = 0; c < A.cols; c++) for (let r = 0; r < A.rows; r++) { const v = A.data[r + c * A.rows]; if (v !== 0) acc.set(c * A.rows + r, v); }
  return sparseFromMap(A.rows, A.cols, acc);
}
export function sparseToDense(S: Sparse): Mat {
  const out = zeros(S.rows, S.cols);
  for (let j = 0; j < S.cols; j++) for (let p = S.colptr[j]; p < S.colptr[j + 1]; p++) out.data[S.rowind[p] + j * S.rows] = S.values[p];
  return out;
}
export function numelOf(v: Value): number { const [r, c] = dimsOf(v); return r * c; }
export function numel(m: Mat): number { return m.rows * m.cols; }
export function isScalar(m: Mat): boolean { return m.rows === 1 && m.cols === 1; }
export function isEmpty(m: Mat): boolean { return m.rows === 0 || m.cols === 0; }

export function asScalar(v: Value, ctx = 'value'): number {
  if (!isMat(v)) throw new MatError(`${ctx}: expected a number, got a function handle`);
  if (numel(v) !== 1) throw new MatError(`${ctx}: expected a scalar (${v.rows}×${v.cols} given)`);
  return v.data[0];
}
export function asString(v: Value): string {
  if (isStr(v)) return v.items.length ? v.items[0] : '';   // string scalar → its text
  if (!isMat(v) || !v.isChar) {
    if (isMat(v) && numel(v) === 0) return '';
    throw new MatError('expected a string');
  }
  let s = '';
  for (let c = 0; c < v.cols; c++) s += String.fromCharCode(v.data[c]);
  return s;
}
/** Truthiness: nonempty and all elements nonzero (MATLAB `if` semantics). */
export function truthy(v: Value): boolean {
  if (v.kind === 'str') return v.items.length === 1 ? v.items[0].length > 0 : v.items.length > 0;
  if (v.kind === 'cell' || v.kind === 'struct') return numelOf(v) > 0;
  if (v.kind === 'sparse') { for (const x of v.values) if (x === 0) return false; return v.values.length === v.rows * v.cols && v.rows > 0; }
  if (!isMat(v)) return true;
  if (numel(v) === 0) return false;
  for (let i = 0; i < v.data.length; i++) if (v.data[i] === 0 && (!v.idata || v.idata[i] === 0)) return false;
  return true;
}

// ── Element-wise ops with implicit expansion ───────────────────────────
function broadcastDims(a: Mat, b: Mat): [number, number] {
  const rows = a.rows === b.rows ? a.rows : (a.rows === 1 ? b.rows : b.rows === 1 ? a.rows : -1);
  const cols = a.cols === b.cols ? a.cols : (a.cols === 1 ? b.cols : b.cols === 1 ? a.cols : -1);
  if (rows < 0 || cols < 0) throw new MatError(`matrix dimensions must agree (${a.rows}×${a.cols} vs ${b.rows}×${b.cols})`);
  return [rows, cols];
}
export function elementwise(a: Mat, b: Mat, f: (x: number, y: number) => number): Mat {
  const [rows, cols] = broadcastDims(a, b);
  const out = zeros(rows, cols);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const av = a.data[(a.rows === 1 ? 0 : r) + (a.cols === 1 ? 0 : c) * a.rows];
    const bv = b.data[(b.rows === 1 ? 0 : r) + (b.cols === 1 ? 0 : c) * b.rows];
    out.data[r + c * rows] = f(av, bv);
  }
  // carry an N-D tag when an operand is N-D and the result matches its layout
  if (a.nd && a.rows === rows && a.cols === cols) out.nd = a.nd.slice();
  else if (b.nd && b.rows === rows && b.cols === cols) out.nd = b.nd.slice();
  return out;
}
export function map(a: Mat, f: (x: number) => number): Mat {
  const out = zeros(a.rows, a.cols);
  for (let i = 0; i < a.data.length; i++) out.data[i] = f(a.data[i]);
  if (a.nd) out.nd = a.nd.slice();
  return out;
}

export function matmul(a: Mat, b: Mat): Mat {
  if (isScalar(a) || isScalar(b)) return elementwise(a, b, (x, y) => x * y);
  if (a.cols !== b.rows) throw new MatError(`inner matrix dimensions must agree (${a.rows}×${a.cols} * ${b.rows}×${b.cols})`);
  const out = zeros(a.rows, b.cols);
  for (let c = 0; c < b.cols; c++)
    for (let k = 0; k < a.cols; k++) {
      const bk = b.data[k + c * b.rows];
      if (bk === 0) continue;
      for (let r = 0; r < a.rows; r++) out.data[r + c * out.rows] += a.data[r + k * a.rows] * bk;
    }
  return out;
}

export function transpose(a: Mat): Mat {
  const out = zeros(a.cols, a.rows);
  for (let c = 0; c < a.cols; c++) for (let r = 0; r < a.rows; r++) out.data[c + r * out.rows] = a.data[r + c * a.rows];
  if (a.idata) { const im = new Float64Array(a.cols * a.rows); for (let c = 0; c < a.cols; c++) for (let r = 0; r < a.rows; r++) im[c + r * out.rows] = a.idata[r + c * a.rows]; out.idata = im; }
  out.isChar = a.isChar;
  return out;
}

/** Conjugate transpose (`'`): transpose with the imaginary part negated. */
export function ctranspose(a: Mat): Mat {
  const out = transpose(a);
  if (out.idata) for (let i = 0; i < out.idata.length; i++) out.idata[i] = -out.idata[i];
  return out;
}

// ── Concatenation ──────────────────────────────────────────────────────
export function horzcat(parts: Mat[]): Mat {
  const nonEmpty = parts.filter((p) => numel(p) > 0);
  if (!nonEmpty.length) return empty();
  const rows = nonEmpty[0].rows;
  let cols = 0;
  for (const p of nonEmpty) { if (p.rows !== rows) throw new MatError('horizontal dimensions mismatch'); cols += p.cols; }
  const out = zeros(rows, cols);
  const anyImag = nonEmpty.some((p) => p.idata);
  const im = anyImag ? new Float64Array(rows * cols) : null;
  let co = 0;
  let allChar = true, allBool = true;
  for (const p of nonEmpty) {
    out.data.set(p.data.subarray(0, rows * p.cols), co * rows);
    if (im && p.idata) im.set(p.idata.subarray(0, rows * p.cols), co * rows);
    co += p.cols; if (!p.isChar) allChar = false; if (!p.isBool) allBool = false;
  }
  if (im) out.idata = im;
  if (allChar) out.isChar = true;
  if (allBool && !allChar && !im) out.isBool = true;
  return out;
}
export function vertcat(parts: Mat[]): Mat {
  const nonEmpty = parts.filter((p) => numel(p) > 0);
  if (!nonEmpty.length) return empty();
  const cols = nonEmpty[0].cols;
  let rows = 0;
  for (const p of nonEmpty) { if (p.cols !== cols) throw new MatError('vertical dimensions mismatch'); rows += p.rows; }
  const out = zeros(rows, cols);
  const anyImag = nonEmpty.some((p) => p.idata);
  const im = anyImag ? new Float64Array(rows * cols) : null;
  let ro = 0;
  let allBool = true, allChar = true;
  for (const p of nonEmpty) {
    for (let c = 0; c < cols; c++) for (let r = 0; r < p.rows; r++) { out.data[(ro + r) + c * rows] = p.data[r + c * p.rows]; if (im) im[(ro + r) + c * rows] = p.idata ? p.idata[r + c * p.rows] : 0; }
    ro += p.rows;
    if (!p.isBool) allBool = false;
    if (!p.isChar) allChar = false;
  }
  if (allChar) out.isChar = true;
  if (im) out.idata = im; else if (allBool && !allChar) out.isBool = true;
  return out;
}

// ── Ranges ─────────────────────────────────────────────────────────────
export function range(from: number, step: number, to: number): Mat {
  if (step === 0) return empty();
  const out: number[] = [];
  const eps = Math.abs(step) * 1e-10;
  if (step > 0) for (let v = from; v <= to + eps; v += step) out.push(v);
  else for (let v = from; v >= to - eps; v += step) out.push(v);
  return rowVec(out);
}

// ── Indexing ───────────────────────────────────────────────────────────
export type Sub = number[] | 'colon';   // 1-based index lists, or whole dimension
/** An index list that remembers the shape of the subscript expression it came from,
 *  so single-subscript indexing can reproduce MATLAB's result-orientation rules. */
export interface IdxList extends Array<number> { srcRows?: number; srcCols?: number; srcLogical?: boolean }

function subToList(s: Sub, dim: number): number[] {
  if (s === 'colon') { const a = []; for (let i = 1; i <= dim; i++) a.push(i); return a; }
  return s;
}

// ── N-D arrays (column-major; data layout = d1×(d2·d3…) 2-D matrix) ──────
const prod = (a: number[]): number => a.reduce((p, x) => p * x, 1);
/** Trim trailing singleton dims beyond the 2nd (MATLAB: a 2×3×1 array is 2×3). */
function normDims(d: number[]): number[] { const out = d.slice(); while (out.length > 2 && out[out.length - 1] === 1) out.pop(); return out; }
/** Full size vector of any matrix. */
export function ndSize(m: Mat): number[] { return m.nd ? m.nd.slice() : [m.rows, m.cols]; }
export function ndimsOf(m: Mat): number { return m.nd ? m.nd.length : 2; }
/** Build a matrix from a size vector + column-major data (sets nd only when N-D). */
export function makeND(dims: number[], data: Float64Array, opts: { idata?: Float64Array | null; isChar?: boolean; isBool?: boolean } = {}): Mat {
  let d = normDims(dims.length ? dims : [0, 0]);
  if (d.length === 1) d = [d[0], 1];
  const rows = d[0], cols = prod(d.slice(1));
  const m: Mat = { kind: 'num', rows, cols, data };
  if (d.length > 2) m.nd = d;
  if (opts.idata) m.idata = opts.idata; if (opts.isChar) m.isChar = true; if (opts.isBool) m.isBool = true;
  return m;
}
/** Effective dimension sizes for N subscripts: collapse extra source dims into the last subscript. */
function subDims(srcDims: number[], nsub: number): number[] {
  if (nsub >= srcDims.length) { const D = srcDims.slice(); while (D.length < nsub) D.push(1); return D; }
  const D = srcDims.slice(0, nsub - 1); D.push(prod(srcDims.slice(nsub - 1))); return D;
}
/** N-D subscripted read (subs.length ≥ 3). */
export function indexGetND(m: Mat, subs: Sub[]): Mat {
  const D = subDims(ndSize(m), subs.length);
  const lists = subs.map((s, d) => subToList(s, D[d]));
  for (let d = 0; d < D.length; d++) for (const idx of lists[d]) {
    if (idx < 1) throw new MatError('Array indices must be positive integers or logical values.');
    if (idx > D[d]) throw new MatError(`Index in position ${d + 1} exceeds array bounds. Index must not exceed ${D[d]}.`);
  }
  const outDims = lists.map((l) => l.length);
  const total = prod(outDims);
  const stride = [1]; for (let d = 1; d < D.length; d++) stride[d] = stride[d - 1] * D[d - 1];
  const ostride = [1]; for (let d = 1; d < outDims.length; d++) ostride[d] = ostride[d - 1] * outDims[d - 1];
  const data = new Float64Array(total); const im = m.idata ? new Float64Array(total) : null;
  for (let o = 0; o < total; o++) {
    let lin = 0; for (let d = 0; d < D.length; d++) { const k = Math.floor(o / ostride[d]) % outDims[d]; lin += (lists[d][k] - 1) * stride[d]; }
    data[o] = m.data[lin]; if (im) im[o] = m.idata![lin];
  }
  return makeND(outDims, data, { idata: im, isChar: m.isChar });
}
/** N-D subscripted assignment (subs.length ≥ 3); grows along the last dim if needed. */
export function indexSetND(m: Mat, subs: Sub[], rhs: Mat): Mat {
  let dims = ndSize(m);
  const D = subDims(dims, subs.length);
  // Determine required size; allow growth on any dim (pads with zeros).
  // A colon on a still-empty (size-0) dimension adopts the rhs's size, so
  // `A(:,:,1) = [2 1;3 5]` on an undefined A grows A to 2×2×1 (not 0×0×1).
  const rdims = ndSize(rhs);
  const need = D.slice();
  subs.forEach((s, d) => {
    if (s === 'colon') need[d] = Math.max(need[d], D[d] || rdims[d] || 1);
    else if (s.length) need[d] = Math.max(need[d], Math.max(...s));
  });
  if (need.some((v, d) => v > D[d])) {
    const newDims = dims.slice(); while (newDims.length < subs.length) newDims.push(1);
    for (let d = 0; d < subs.length; d++) newDims[d] = Math.max(newDims[d] ?? 1, need[d]);
    const grown = new Float64Array(prod(newDims)); const gim = m.idata ? new Float64Array(prod(newDims)) : null;
    // copy old data into the grown array
    const oldStride = [1]; for (let d = 1; d < dims.length; d++) oldStride[d] = oldStride[d - 1] * dims[d - 1];
    const nStride = [1]; for (let d = 1; d < newDims.length; d++) nStride[d] = nStride[d - 1] * newDims[d - 1];
    const tot = numel(m);
    for (let o = 0; o < tot; o++) { let rem = o, lin = 0; for (let d = 0; d < dims.length; d++) { const k = Math.floor(rem / oldStride[d]) % dims[d]; lin += k * nStride[d]; } grown[lin] = m.data[o]; if (gim) gim[lin] = m.idata![o]; }
    m = makeND(newDims, grown, { idata: gim, isChar: m.isChar }); dims = newDims;
  }
  const D2 = subDims(dims, subs.length);
  const lists = subs.map((s, d) => subToList(s, D2[d]));
  const stride = [1]; for (let d = 1; d < D2.length; d++) stride[d] = stride[d - 1] * D2[d - 1];
  const outDims = lists.map((l) => l.length); const total = prod(outDims);
  const ostride = [1]; for (let d = 1; d < outDims.length; d++) ostride[d] = ostride[d - 1] * outDims[d - 1];
  if (rhs.idata && !m.idata) m.idata = new Float64Array(m.data.length);
  const scalarR = rhs.data.length === 1;
  for (let o = 0; o < total; o++) {
    let lin = 0; for (let d = 0; d < D2.length; d++) { const k = Math.floor(o / ostride[d]) % outDims[d]; lin += (lists[d][k] - 1) * stride[d]; }
    m.data[lin] = scalarR ? rhs.data[0] : rhs.data[o];
    if (m.idata) m.idata[lin] = rhs.idata ? (scalarR ? rhs.idata[0] : rhs.idata[o]) : 0;
  }
  return m;
}

export function indexGet(m: Mat, subs: Sub[]): Mat {
  if (subs.length > 2) return indexGetND(m, subs);
  if (subs.length === 1) {
    const s = subs[0];
    if (s === 'colon') { const out = zeros(numel(m), 1); out.data.set(m.data); if (m.idata) out.idata = Float64Array.from(m.idata); out.isChar = m.isChar; return out; }
    if (s.length === 0) { const e = zeros(0, 0); e.isChar = m.isChar; return e; }
    const vals = new Float64Array(s.length); const im = m.idata ? new Float64Array(s.length) : null;
    for (let i = 0; i < s.length; i++) {
      const li = s[i] - 1;
      if (li < 0) throw new MatError('Array indices must be positive integers or logical values.');
      if (li >= numel(m)) throw new MatError(`Index exceeds the number of array elements. Index must not exceed ${numel(m)}.`);
      vals[i] = m.data[li]; if (im) im[i] = m.idata![li];
    }
    // MATLAB result-orientation rule: logical mask → A's orientation if A is a vector, else a column;
    // numeric index → A's orientation when both A and the index are vectors, otherwise the index's shape.
    const sl = s as IdxList; const aVec = m.rows === 1 || m.cols === 1;
    const idxVec = sl.srcRows === undefined || sl.srcRows === 1 || sl.srcCols === 1;
    let oR: number, oC: number;
    if (sl.srcLogical) {
      // Logical mask: a vector A follows A's orientation; for a matrix A the result follows
      // the MASK's orientation when the mask is a vector, else (full-matrix mask) a column.
      const maskRow = sl.srcRows === 1, maskCol = sl.srcCols === 1;
      if (aVec) { if (m.rows === 1) { oR = 1; oC = s.length; } else { oR = s.length; oC = 1; } }
      else if (maskRow && !maskCol) { oR = 1; oC = s.length; }
      else { oR = s.length; oC = 1; }
    }
    else if (aVec && idxVec) { if (m.rows === 1) { oR = 1; oC = s.length; } else { oR = s.length; oC = 1; } }
    else { oR = sl.srcRows ?? 1; oC = sl.srcCols ?? s.length; }
    const out = zeros(oR, oC); out.data.set(vals); if (im) out.idata = im; out.isChar = m.isChar;
    return out;
  }
  if (subs.length === 2) {
    const rs = subToList(subs[0], m.rows);
    const cs = subToList(subs[1], m.cols);
    const out = zeros(rs.length, cs.length); const im = m.idata ? new Float64Array(rs.length * cs.length) : null;
    for (let cc = 0; cc < cs.length; cc++) for (let rr = 0; rr < rs.length; rr++) {
      const r = rs[rr] - 1, c = cs[cc] - 1;
      if (r < 0 || c < 0) throw new MatError('Array indices must be positive integers or logical values.');
      if (r >= m.rows) throw new MatError(`Index in position 1 exceeds array bounds. Index must not exceed ${m.rows}.`);
      if (c >= m.cols) throw new MatError(`Index in position 2 exceeds array bounds. Index must not exceed ${m.cols}.`);
      out.data[rr + cc * out.rows] = m.data[r + c * m.rows]; if (im) im[rr + cc * out.rows] = m.idata![r + c * m.rows];
    }
    if (im) out.idata = im;
    out.isChar = m.isChar;
    return out;
  }
  throw new MatError('only 1-D and 2-D indexing are supported');
}

/** Assign into `m` (growing as needed); returns the (possibly new) matrix. */
export function indexSet(m: Mat, subs: Sub[], rhs: Mat): Mat {
  if (subs.length > 2) return indexSetND(m, subs, rhs);
  if (subs.length === 1) {
    const s = subs[0];
    const idx = s === 'colon' ? subToList('colon', numel(m)) : s;
    for (const ix of idx) if (ix < 1 || !Number.isInteger(ix)) throw new MatError('Array indices must be positive integers or logical values.');
    if (rhs.data.length !== 1 && rhs.data.length !== idx.length) throw new MatError('Unable to perform assignment because the left and right sides have a different number of elements.');
    const need = idx.length ? Math.max(...idx) : 0;
    if (need > numel(m)) {
      // grow a vector (default to row when target is empty/row)
      if (m.rows <= 1) m = growTo(m, 1, Math.max(m.cols, need));
      else if (m.cols === 1) m = growTo(m, Math.max(m.rows, need), 1);
      else throw new MatError('cannot grow a matrix by linear index');
    }
    if (rhs.idata && !m.idata) m.idata = new Float64Array(m.data.length);
    const scalarR = rhs.data.length === 1;
    for (let i = 0; i < idx.length; i++) {
      const li = idx[i] - 1;
      m.data[li] = scalarR ? rhs.data[0] : rhs.data[i];
      if (m.idata) m.idata[li] = rhs.idata ? (scalarR ? rhs.idata[0] : rhs.idata[i]) : 0;
    }
    if (rhs.isChar && (numel(m) === idx.length)) m.isChar = true;
    return m;
  }
  if (subs.length === 2) {
    const rsRaw = subs[0], csRaw = subs[1];
    const checkSub = (s: Sub) => { if (s !== 'colon') for (const ix of s) if (ix < 1 || !Number.isInteger(ix)) throw new MatError('Array indices must be positive integers or logical values.'); };
    checkSub(rsRaw); checkSub(csRaw);
    const maxR = rsRaw === 'colon' ? m.rows : (rsRaw.length ? Math.max(...rsRaw) : 0);
    const maxC = csRaw === 'colon' ? m.cols : (csRaw.length ? Math.max(...csRaw) : 0);
    if (maxR > m.rows || maxC > m.cols) m = growTo(m, Math.max(m.rows, maxR), Math.max(m.cols, maxC));
    if (rhs.idata && !m.idata) m.idata = new Float64Array(m.data.length);
    const rs = subToList(rsRaw, m.rows);
    const cs = subToList(csRaw, m.cols);
    if (rhs.data.length !== 1 && rhs.data.length !== rs.length * cs.length) throw new MatError('Unable to perform assignment because the left and right sides have a different number of elements.');
    const scalarRhs = rhs.data.length === 1;
    for (let cc = 0; cc < cs.length; cc++) for (let rr = 0; rr < rs.length; rr++) {
      const si = rr + cc * rhs.rows;
      m.data[(rs[rr] - 1) + (cs[cc] - 1) * m.rows] = scalarRhs ? rhs.data[0] : rhs.data[si];
      if (m.idata) m.idata[(rs[rr] - 1) + (cs[cc] - 1) * m.rows] = rhs.idata ? (scalarRhs ? rhs.idata[0] : rhs.idata[si]) : 0;
    }
    return m;
  }
  throw new MatError('only 1-D and 2-D indexing are supported');
}

/** Null assignment `A(...) = []` — delete the indexed rows/columns/elements. */
export function indexDelete(m: Mat, subs: Sub[]): Mat {
  if (subs.length === 1) {
    const s = subs[0];
    if (s === 'colon') return empty();
    for (const x of s) if (x > numel(m)) throw new MatError('Matrix index is out of range for deletion.');
    const drop = new Set(s.map((x) => x - 1));
    const keep: number[] = [];
    for (let i = 0; i < numel(m); i++) if (!drop.has(i)) keep.push(m.data[i]);
    const out = m.cols === 1 && m.rows !== 1 ? colVec(keep) : rowVec(keep);
    out.isChar = m.isChar;
    return out;
  }
  if (subs.length === 2) {
    const [rs, cs] = subs;
    if (rs === 'colon' && cs === 'colon') return empty();
    if (rs === 'colon' && cs !== 'colon') {
      for (const x of cs) if (x > m.cols) throw new MatError('Matrix index is out of range for deletion.');
      const drop = new Set(cs.map((x) => x - 1));
      const cols: number[] = [];
      for (let c = 0; c < m.cols; c++) if (!drop.has(c)) cols.push(c);
      const out = zeros(m.rows, cols.length);
      cols.forEach((c, ci) => { for (let r = 0; r < m.rows; r++) out.data[r + ci * m.rows] = m.data[r + c * m.rows]; });
      out.isChar = m.isChar;
      return out;
    }
    if (cs === 'colon' && rs !== 'colon') {
      for (const x of rs) if (x > m.rows) throw new MatError('Matrix index is out of range for deletion.');
      const drop = new Set(rs.map((x) => x - 1));
      const rows: number[] = [];
      for (let r = 0; r < m.rows; r++) if (!drop.has(r)) rows.push(r);
      const out = zeros(rows.length, m.cols);
      rows.forEach((r, ri) => { for (let c = 0; c < m.cols; c++) out.data[ri + c * out.rows] = m.data[r + c * m.rows]; });
      out.isChar = m.isChar;
      return out;
    }
    throw new MatError('a null assignment must have a colon (:) in one subscript');
  }
  throw new MatError('null assignment supports 1-D and 2-D indexing only');
}

function growTo(m: Mat, rows: number, cols: number): Mat {
  if (rows === m.rows && cols === m.cols) return m;
  const out = zeros(rows, cols);
  for (let c = 0; c < m.cols; c++) for (let r = 0; r < m.rows; r++) out.data[r + c * rows] = m.data[r + c * m.rows];
  if (m.idata) { out.idata = new Float64Array(rows * cols); for (let c = 0; c < m.cols; c++) for (let r = 0; r < m.rows; r++) out.idata[r + c * rows] = m.idata[r + c * m.rows]; }
  out.isChar = m.isChar;
  return out;
}

/** Flatten a matrix to a number[] in column-major order (real part). */
export function toArray(m: Mat): number[] { return Array.from(m.data); }

// ── Complex numbers ────────────────────────────────────────────────────
export function isComplex(m: Mat): boolean { return !!m.idata; }
export function cscalar(re: number, im: number): Mat { return { kind: 'num', rows: 1, cols: 1, data: Float64Array.of(re), idata: Float64Array.of(im) }; }
const imAt = (m: Mat, i: number): number => (m.idata ? m.idata[i] : 0);

/** Build a complex matrix, dropping the imaginary store if every element is real. */
export function finishComplex(rows: number, cols: number, re: Float64Array, im: Float64Array): Mat {
  let anyImag = false; for (let i = 0; i < im.length; i++) if (im[i] !== 0) { anyImag = true; break; }
  return anyImag ? { kind: 'num', rows, cols, data: re, idata: im } : { kind: 'num', rows, cols, data: re };
}
const anyC = (a: Mat, b: Mat): boolean => !!a.idata || !!b.idata;

/** Complex element-wise op with implicit expansion. f(ar,ai,br,bi) → [re,im]. */
function cElementwise(a: Mat, b: Mat, f: (ar: number, ai: number, br: number, bi: number) => [number, number]): Mat {
  const rows = a.rows === b.rows ? a.rows : (a.rows === 1 ? b.rows : b.rows === 1 ? a.rows : -1);
  const cols = a.cols === b.cols ? a.cols : (a.cols === 1 ? b.cols : b.cols === 1 ? a.cols : -1);
  if (rows < 0 || cols < 0) throw new MatError(`matrix dimensions must agree (${a.rows}×${a.cols} vs ${b.rows}×${b.cols})`);
  const re = new Float64Array(rows * cols), im = new Float64Array(rows * cols);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const ai0 = (a.rows === 1 ? 0 : r) + (a.cols === 1 ? 0 : c) * a.rows;
    const bi0 = (b.rows === 1 ? 0 : r) + (b.cols === 1 ? 0 : c) * b.rows;
    const [zr, zi] = f(a.data[ai0], imAt(a, ai0), b.data[bi0], imAt(b, bi0));
    re[r + c * rows] = zr; im[r + c * rows] = zi;
  }
  return finishComplex(rows, cols, re, im);
}

// complex scalar helpers
export const cmul = (ar: number, ai: number, br: number, bi: number): [number, number] => [ar * br - ai * bi, ar * bi + ai * br];
export const cdiv = (ar: number, ai: number, br: number, bi: number): [number, number] => { const d = br * br + bi * bi; return [(ar * br + ai * bi) / d, (ai * br - ar * bi) / d]; };
export const cexp = (ar: number, ai: number): [number, number] => { const e = Math.exp(ar); return [e * Math.cos(ai), e * Math.sin(ai)]; };
export const clog = (ar: number, ai: number): [number, number] => [Math.log(Math.hypot(ar, ai)), Math.atan2(ai, ar)];
export const cpow = (ar: number, ai: number, br: number, bi: number): [number, number] => {
  if (ar === 0 && ai === 0) return [br > 0 || (br === 0 && bi === 0) ? (br === 0 && bi === 0 ? 1 : 0) : NaN, 0];
  const [lr, li] = clog(ar, ai); const [mr, mi] = cmul(lr, li, br, bi); return cexp(mr, mi);
};
export const csqrt = (ar: number, ai: number): [number, number] => { const m = Math.hypot(ar, ai); const re = Math.sqrt((m + ar) / 2); const im = Math.sign(ai || 1) * Math.sqrt((m - ar) / 2); return [re, im]; };

// real fast-path wrappers used by the evaluator (stay real when both operands are real)
export const ewAdd = (a: Mat, b: Mat): Mat => anyC(a, b) ? cElementwise(a, b, (ar, ai, br, bi) => [ar + br, ai + bi]) : elementwise(a, b, (x, y) => x + y);
export const ewSub = (a: Mat, b: Mat): Mat => anyC(a, b) ? cElementwise(a, b, (ar, ai, br, bi) => [ar - br, ai - bi]) : elementwise(a, b, (x, y) => x - y);
export const ewMul = (a: Mat, b: Mat): Mat => anyC(a, b) ? cElementwise(a, b, cmul) : elementwise(a, b, (x, y) => x * y);
export const ewRDiv = (a: Mat, b: Mat): Mat => anyC(a, b) ? cElementwise(a, b, cdiv) : elementwise(a, b, (x, y) => x / y);
export const ewLDiv = (a: Mat, b: Mat): Mat => anyC(a, b) ? cElementwise(a, b, (ar, ai, br, bi) => cdiv(br, bi, ar, ai)) : elementwise(a, b, (x, y) => y / x);
export const ewPow = (a: Mat, b: Mat): Mat => {
  // complex if either operand complex, or a negative real raised to a non-integer power
  let needC = anyC(a, b);
  if (!needC) for (let i = 0; i < a.data.length; i++) { const e = b.data[b.data.length === 1 ? 0 : i]; if (a.data[i] < 0 && !Number.isInteger(e)) { needC = true; break; } }
  return needC ? cElementwise(a, b, cpow) : elementwise(a, b, Math.pow);
};

/** Complex-aware equality (`==` / `~=`); returns a logical matrix. */
export function ewEq(a: Mat, b: Mat, want: boolean): Mat {
  const r = anyC(a, b)
    ? cElementwise(a, b, (ar, ai, br, bi) => { const eq = ar === br && ai === bi; return [(want ? eq : !eq) ? 1 : 0, 0]; })
    : elementwise(a, b, (x, y) => ((want ? x === y : x !== y) ? 1 : 0));
  return { kind: 'num', rows: r.rows, cols: r.cols, data: r.data, isBool: true };
}

export function cmatmul(a: Mat, b: Mat): Mat {
  if (!anyC(a, b)) return matmul(a, b);
  if (isScalar(a) || isScalar(b)) return ewMul(a, b);
  if (a.cols !== b.rows) throw new MatError(`inner matrix dimensions must agree (${a.rows}×${a.cols} * ${b.rows}×${b.cols})`);
  const re = new Float64Array(a.rows * b.cols), im = new Float64Array(a.rows * b.cols);
  for (let c = 0; c < b.cols; c++) for (let k = 0; k < a.cols; k++) {
    const br = b.data[k + c * b.rows], bi = imAt(b, k + c * b.rows);
    for (let r = 0; r < a.rows; r++) { const ar = a.data[r + k * a.rows], ai = imAt(a, r + k * a.rows); re[r + c * a.rows] += ar * br - ai * bi; im[r + c * a.rows] += ar * bi + ai * br; }
  }
  return finishComplex(a.rows, b.cols, re, im);
}

/** Element-wise unary complex map. f(re,im) → [re,im]. */
export function cmap(a: Mat, f: (re: number, im: number) => [number, number]): Mat {
  const re = new Float64Array(a.data.length), im = new Float64Array(a.data.length);
  for (let i = 0; i < a.data.length; i++) { const [zr, zi] = f(a.data[i], imAt(a, i)); re[i] = zr; im[i] = zi; }
  return finishComplex(a.rows, a.cols, re, im);
}
/** Real-valued unary map over a complex array (e.g. abs, angle). */
export function cmapReal(a: Mat, f: (re: number, im: number) => number): Mat {
  const out = zeros(a.rows, a.cols);
  for (let i = 0; i < a.data.length; i++) out.data[i] = f(a.data[i], imAt(a, i));
  return out;
}
export function conj(a: Mat): Mat { if (!a.idata) return a; const im = new Float64Array(a.idata.length); for (let i = 0; i < im.length; i++) im[i] = -a.idata[i]; return { kind: 'num', rows: a.rows, cols: a.cols, data: a.data, idata: im }; }
export function realPart(a: Mat): Mat { return mat(a.rows, a.cols, Float64Array.from(a.data)); }
export function imagPart(a: Mat): Mat { const o = zeros(a.rows, a.cols); if (a.idata) o.data.set(a.idata); return o; }

/** Coerce a value to a dense Mat for generic numeric builtins (sparse densifies). */
export function toMat(v: Value, name = 'argument'): Mat {
  if (isSparse(v)) return sparseToDense(v);
  if (!isMat(v)) throw new MatError(`${name}: expected a numeric value`);
  return v;
}
/** Factorial n! (Inf beyond 170). Shared by numeric + symbolic builtins. */
export function factorialN(n: number): number { if (n < 0) return NaN; if (n > 170) return Infinity; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }

/** Saturation limits [min,max] for the integer classes. */
export const INT_LIMITS: Record<string, [number, number]> = {
  int8: [-128, 127], int16: [-32768, 32767], int32: [-2147483648, 2147483647], int64: [-9223372036854775808, 9223372036854775807],
  uint8: [0, 255], uint16: [0, 65535], uint32: [0, 4294967295], uint64: [0, 18446744073709551615],
};
/** Cast a matrix to an integer/single class (saturating round for ints, fround for single). */
export function applyClass(M: Mat, itype: string): Mat {
  if (itype === 'single') {
    const data = Float64Array.from(M.data, Math.fround);
    const idata = M.idata ? Float64Array.from(M.idata, Math.fround) : undefined;
    return { kind: 'num', rows: M.rows, cols: M.cols, data, idata, nd: M.nd, itype: 'single' };
  }
  const lim = INT_LIMITS[itype]; if (!lim) return M;
  const [lo, hi] = lim;
  const data = Float64Array.from(M.data, (x) => (Number.isNaN(x) ? 0 : Math.min(hi, Math.max(lo, Math.round(x)))));
  return { kind: 'num', rows: M.rows, cols: M.cols, data, nd: M.nd, itype };
}
/** Result class of an arithmetic op on two matrices (integer wins over single over double). */
export function pickClass(a: Mat, b: Mat): string | undefined {
  const ta = a.itype, tb = b.itype;
  if (ta && ta !== 'single') return ta;
  if (tb && tb !== 'single') return tb;
  if (ta === 'single' || tb === 'single') return 'single';
  return undefined;
}
