// Communications Toolbox — computable, exactly-validatable subset: integer↔binary conversion
// (de2bi/bi2de), error counting (symerr/biterr), and Gray code (bin2gray/gray2bin, integer form).
// Constellation modulators (qammod/pskmod) are deferred — their Gray symbol mapping is hard to
// match without the toolbox. See plan §7.
import type { Builtin } from '../builtins';
import {
  type Value, type Mat, type StructV, isMat, scalar, colVec, rowVec, zeros, toArray, asScalar, asString, toMat as m, map, mat,
} from '../values';
import { erf, erfc, erfinv } from '../specfun';
import type { ToolboxModule } from './types';
import { HELP_COMM } from '../help/help-comm';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);
// special functions for the Q-function — erf/erfc/erfinv from the shared specfun module
const SQRT2 = Math.sqrt(2);
/** Non-negative remainder mod p. */
const gfMod = (n: number, p: number): number => (((Math.round(n) % p) + p) % p);
/** Modular inverse of y in GF(p) (p prime) via the extended Euclidean algorithm. */
function gfModInv(y: number, p: number): number {
  let [r0, r1, t0, t1] = [p, gfMod(y, p), 0, 1];
  while (r1 !== 0) { const q = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [t0, t1] = [t1, t0 - q * t1]; }
  return r0 === 1 ? gfMod(t0, p) : NaN;
}
/** Element-wise GF(p) op: 3rd arg is the prime field order (default 2); shorter operand 0-padded. */
function gfElementwise(a: Value[], op: (x: number, y: number, p: number) => number): Promise<Value[]> {
  const x = toArray(m(a[0])), y = toArray(m(a[1]));
  const p = a.length >= 3 && isMat(a[2]) && (a[2] as Mat).data.length === 1 ? Math.round(asScalar(m(a[2]))) : 2;
  const n = Math.max(x.length, y.length), o: number[] = [];
  for (let i = 0; i < n; i++) o.push(op(x[i] || 0, y[i] || 0, p));
  return ret(rowVec(o));
}
/** Rows of a matrix as number[][]. */
function rows(M: Mat): number[][] { const o: number[][] = []; for (let r = 0; r < M.rows; r++) { const row: number[] = []; for (let c = 0; c < M.cols; c++) row.push(M.data[r + c * M.rows]); o.push(row); } return o; }
const bitWidth = (v: number) => Math.max(1, Math.floor(Math.log2(Math.max(1, v))) + 1);
const bin2gray = (v: number) => v ^ (v >>> 1);
const gray2bin = (v: number) => { let b = 0; for (let t = v; t > 0; t >>>= 1) b ^= t; return b; };
/** Build a complex Mat (re+im) matching the orientation of src. */
// Shape the output like the input: preserve a general r×c matrix for element-wise (length-preserving)
// mapping; otherwise fall back to row/column-vector orientation (e.g. bit-grouping mod/demod).
function shapeOf(src: Mat, n: number): { rows: number; cols: number } {
  if (n === src.rows * src.cols && src.rows > 1 && src.cols > 1) return { rows: src.rows, cols: src.cols };
  const col = src.cols === 1 && src.rows !== 1; return { rows: col ? n : 1, cols: col ? 1 : n };
}
function cplx(src: Mat, re: number[], im: number[]): Mat { const { rows, cols } = shapeOf(src, re.length); return { kind: 'num' as const, rows, cols, data: Float64Array.from(re), idata: Float64Array.from(im) } as Mat; }
function sameShape(src: Mat, vals: number[]): Mat { const { rows, cols } = shapeOf(src, vals.length); return { kind: 'num' as const, rows, cols, data: Float64Array.from(vals) } as Mat; }
/** Square-QAM constellation point (I,Q) for symbol s (MATLAB Gray, no UnitAveragePower). */
function qamPoint(s: number, side: number, kHalf: number): [number, number] { const iIdx = s >>> kHalf, qIdx = s & (side - 1); return [-(side - 1) + 2 * bin2gray(iIdx), (side - 1) - 2 * bin2gray(qIdx)]; }
/** Modified Bessel I0 (series). */
function besselI0(x: number): number { let s = 1, t = 1; for (let k = 1; k < 80; k++) { t *= (x / (2 * k)) ** 2; s += t; if (t < s * 1e-16) break; } return s; }
/** Modified Bessel I_n (series, integer n≥0). */
function besselIn(n: number, x: number): number { if (n === 0) return besselI0(x); let nf = 1; for (let i = 2; i <= n; i++) nf *= i; let t = (x / 2) ** n / nf, s = t; for (let k = 1; k < 100; k++) { t *= (x * x / 4) / (k * (n + k)); s += t; if (Math.abs(t) < Math.abs(s) * 1e-16) break; } return s; }

// ── convolutional-code (trellis) helpers ──
const octDigitsToDec = (o: number) => parseInt(String(Math.round(o)), 8);
const bitParity = (x: number) => { let p = 0; while (x) { p ^= x & 1; x >>>= 1; } return p; };
/** Build a rate-1/n trellis struct from constraint length K and octal code generators. */
function buildTrellis(K: number, codeGen: number[]): { numIn: number; numOut: number; numStates: number; outputs: number[][]; nextStates: number[][] } {
  const n = codeGen.length, g = codeGen.map(octDigitsToDec), nStates = 1 << (K - 1);
  const outputs: number[][] = [], nextStates: number[][] = [];
  for (let s = 0; s < nStates; s++) {
    const orow: number[] = [], nrow: number[] = [];
    for (let u = 0; u < 2; u++) {
      const reg = (u << (K - 1)) | s;                  // current input (MSB) + previous K-1 inputs
      let outv = 0; for (let i = 0; i < n; i++) outv = (outv << 1) | bitParity(reg & g[i]); // MSB = first generator
      orow.push(outv); nrow.push((reg >> 1) & (nStates - 1));
    }
    outputs.push(orow); nextStates.push(nrow);
  }
  return { numIn: 2, numOut: 1 << n, numStates: nStates, outputs, nextStates };
}
/** Pack a numStates×2 number matrix (column-major) as a Mat. */
function intMat(M: number[][]): Mat { const r = M.length, c = M[0].length, d = new Float64Array(r * c); for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) d[i + j * r] = M[i][j]; return mat(r, c, d); }
/** Read a numStates×2 matrix from a Mat (column-major). */
function readMat(M: Mat): number[][] { const out: number[][] = []; for (let i = 0; i < M.rows; i++) { const row: number[] = []; for (let j = 0; j < M.cols; j++) row.push(Math.round(M.data[i + j * M.rows])); out.push(row); } return out; }
/** GF(2) Hamming generator: H=[I_m|P], G=[P'|I_k]. */
const HAMM_PRIM: Record<number, number[]> = { 2: [0, 1, 2], 3: [0, 1, 3], 4: [0, 1, 4], 5: [0, 2, 5], 6: [0, 1, 6], 7: [0, 3, 7], 8: [0, 2, 3, 4, 8], 9: [0, 4, 9], 10: [0, 3, 10], 11: [0, 2, 11], 12: [0, 1, 4, 6, 12], 13: [0, 1, 3, 4, 13], 14: [0, 1, 6, 10, 14], 15: [0, 1, 15], 16: [0, 1, 3, 12, 16] };
function hammHG(mm: number): { H: number[][]; G: number[][]; n: number; k: number } {
  const n = (1 << mm) - 1, k = n - mm, primMask = HAMM_PRIM[mm].reduce((a, e) => a | (1 << e), 0);
  const cols: number[] = []; let poly = 1;
  for (let j = 0; j < n; j++) { cols.push(poly); poly <<= 1; if (poly & (1 << mm)) poly ^= primMask; }
  const H: number[][] = []; for (let i = 0; i < mm; i++) { const row: number[] = []; for (let j = 0; j < n; j++) row.push((cols[j] >> i) & 1); H.push(row); }
  const G: number[][] = []; for (let r = 0; r < k; r++) { const row: number[] = []; for (let cc = 0; cc < mm; cc++) row.push(H[cc][mm + r]); for (let cc = 0; cc < k; cc++) row.push(cc === r ? 1 : 0); G.push(row); }
  return { H, G, n, k };
}

// ── Galois-field GF(2^m) helpers (for primpoly / gfminpol / gftrunc) ──
/** MATLAB gfprimdf: default monic primitive polynomial for GF(2^m), ascending powers (GF(2)). */
const GFPRIMDF: Record<number, number[]> = {
  1: [1, 1], 2: [1, 1, 1], 3: [1, 1, 0, 1], 4: [1, 1, 0, 0, 1], 5: [1, 0, 1, 0, 0, 1],
  6: [1, 1, 0, 0, 0, 0, 1], 7: [1, 0, 0, 1, 0, 0, 0, 1], 8: [1, 0, 1, 1, 1, 0, 0, 0, 1],
  9: [1, 0, 0, 0, 1, 0, 0, 0, 0, 1], 10: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  11: [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1], 12: [1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
  13: [1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1], 14: [1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  15: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 16: [1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
};
/** PRIMPOLY default ('one') primitive polynomial per degree m (decimal), m=1..16. */
const PRIMPOLY_ONE = [3, 7, 11, 19, 37, 67, 137, 285, 529, 1033, 2053, 4179, 8219, 17475, 32771, 69643];
/** Build the GF(2^m) exponential field table: field[e] = m-tuple (bitmask) of alpha^e, e=0..2^m-2. */
function gfField(mm: number): { field: number[]; q: number; m: number; expOf: Map<number, number> } {
  const prim = GFPRIMDF[mm], q = 1 << mm, reduceMask = 1 << mm;
  let primInt = 0; for (let i = 0; i < prim.length; i++) primInt |= prim[i] << i;
  const field: number[] = []; let cur = 1;
  for (let e = 0; e <= q - 2; e++) { field.push(cur); cur <<= 1; if (cur & reduceMask) cur ^= primInt; }
  const expOf = new Map<number, number>(); for (let e = 0; e < q - 1; e++) expOf.set(field[e], e);
  return { field, q, m: mm, expOf };
}
/** Cyclotomic cosets mod 2^m-1 over GF(2) (MATLAB gfcosets); first coset is {0}. */
function gfcosets2(mm: number): number[][] {
  const n = (1 << mm) - 1, cs: number[][] = [], ind = new Array(n).fill(1);
  let i: number | null = mm === 1 ? null : 1;
  while (i !== null) {
    ind[i] = 0; const s = i, v = [s]; let pk = (2 * s) % n;
    while (pk > s) { ind[pk] = 0; v.push(pk); pk = (pk * 2) % n; }
    cs.push(v); i = null; for (let j = 1; j < n; j++) { if (ind[j] === 1) { i = j; break; } }
  }
  cs.unshift([0]); return cs;
}
/** GFTRUNC: drop trailing (highest-order) zero coefficients (keep at least one element). */
function gftruncArr(a: number[]): number[] { let last = a.length - 1; while (last > 0 && a[last] === 0) last--; return a.slice(0, last + 1); }
/** Is `poly` (decimal, bit m + bit 0 set) a primitive polynomial of degree m over GF(2)? */
function isPrimitivePoly(poly: number, mm: number): boolean {
  const n = (1 << mm) - 1, mask = 1 << mm;
  const mul = (a0: number, b0: number) => { let res = 0, a = a0, b = b0; while (b) { if (b & 1) res ^= a; b >>= 1; a <<= 1; if (a & mask) a ^= poly; } return res; };
  const powx = (e0: number) => { let r = 1, b = 2, e = e0; while (e > 0) { if (e & 1) r = mul(r, b); b = mul(b, b); e >>= 1; } return r; };
  if (powx(n) !== 1) return false;
  let nn = n; const ps: number[] = []; for (let d = 2; d * d <= nn; d++) { if (nn % d === 0) { ps.push(d); while (nn % d === 0) nn /= d; } } if (nn > 1) ps.push(nn);
  for (const p of ps) if (powx(n / p) === 1) return false;
  return true;
}
/** All primitive polynomials of degree m over GF(2), ascending decimal (== MATLAB gfprimpoly{m}'). */
function allPrimpolys(mm: number): number[] { const out: number[] = []; for (let p = (1 << mm) + 1; p < (1 << (mm + 1)); p += 2) if (isPrimitivePoly(p, mm)) out.push(p); return out; }
/** popcount (polynomial weight). */
const popcount = (x0: number) => { let x = x0, c = 0; while (x) { c += x & 1; x >>= 1; } return c; };
/** GFMINPOL row for one exponent k over GF(2^m): GF(2) coefficients, ascending, length m+1. */
function gfminpolRow(k: number, F: ReturnType<typeof gfField>, cosets: number[][]): number[] {
  const q = F.q, mm = F.m, mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : F.field[(F.expOf.get(a)! + F.expOf.get(b)!) % (q - 1)]);
  let coeffs: number[];
  if (k < 0) coeffs = [0, F.field[0]];                       // x
  else if (k === 0) coeffs = [F.field[0], F.field[0]];       // x + 1 (MinusOne = alpha^0 = 1 in GF(2))
  else {
    const kk = ((k % (q - 1)) + (q - 1)) % (q - 1);
    const conj = cosets.find((c) => c.includes(kk))!;
    const roots = conj.map((j) => F.field[j]);                // alpha^j
    coeffs = [roots[0], F.field[0]];                          // (x + alpha^{root0})
    for (let j = 1; j < roots.length; j++) {                  // multiply by (x + root_j)
      const r = roots[j], nc = new Array(coeffs.length + 1).fill(0);
      for (let i = 0; i < coeffs.length; i++) { nc[i] ^= mul(coeffs[i], r); nc[i + 1] ^= coeffs[i]; }
      coeffs = nc;
    }
  }
  const row = new Array(mm + 1).fill(0);
  for (let i = 0; i < coeffs.length; i++) row[i] = coeffs[i] & 1; // each coeff is 0 or alpha^0=1
  return row;
}
/** Pack rows (number[][]) as a Mat, column-major. */
function rowsToMat(R: number[][]): Mat { const r = R.length, c = R[0].length, d = new Float64Array(r * c); for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) d[i + j * r] = R[i][j]; return mat(r, c, d); }
/** deintrlv scatter: out[elements[i]] = data[i] (1-based elements). Works row-wise on column data. */
function deintrlvRows(data: number[][], elements: number[]): number[][] { const out: number[][] = new Array(data.length); for (let i = 0; i < data.length; i++) out[elements[i] - 1] = data[i]; return out; }

/** GF(2) polynomial remainder (ascending coefficient vectors). */
function gf2rem(num: number[], den: number[]): number[] {
  const r = num.slice();
  const deg = (a: number[]) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] & 1) return i; return -1; };
  const dd = deg(den); let dr = deg(r);
  while (dr >= dd && dr >= 0) { const sh = dr - dd; for (let j = 0; j <= dd; j++) r[sh + j] ^= den[j] & 1; dr = deg(r); }
  return r.slice(0, Math.max(dd, 0));
}
/** GF(2) polynomial long division (ascending): returns {quotient, remainder}. */
function gf2divmod(num: number[], den: number[]): { q: number[]; r: number[] } {
  const r = num.map((x) => x & 1);
  const deg = (p: number[]) => { for (let i = p.length - 1; i >= 0; i--) if (p[i] & 1) return i; return -1; };
  const dd = deg(den); let dr = deg(r);
  const q = new Array(Math.max(1, dr - dd + 1)).fill(0);
  while (dr >= dd && dr >= 0) { const sh = dr - dd; q[sh] = 1; for (let j = 0; j <= dd; j++) r[sh + j] ^= den[j] & 1; dr = deg(r); }
  return { q, r: r.slice(0, Math.max(dd, 1)) };
}
/** Rank of a GF(2) matrix via Gaussian elimination. */
function gf2rank(A: Mat): number {
  const mm = A.rows, n = A.cols, M: number[][] = [];
  for (let i = 0; i < mm; i++) { const row: number[] = []; for (let j = 0; j < n; j++) row.push(A.data[i + j * mm] & 1); M.push(row); }
  let rank = 0;
  for (let col = 0; col < n && rank < mm; col++) {
    let piv = -1; for (let r = rank; r < mm; r++) if (M[r][col] & 1) { piv = r; break; }
    if (piv < 0) continue;
    [M[rank], M[piv]] = [M[piv], M[rank]];
    for (let r = 0; r < mm; r++) if (r !== rank && (M[r][col] & 1)) for (let c = col; c < n; c++) M[r][c] ^= M[rank][c];
    rank++;
  }
  return rank;
}
/** cyclgen(n,p): systematic parity-check H ((n-k)×n) and generator G (k×n) for the cyclic code
 *  with generator polynomial p (ascending). b[i] = (x^(n-k+i) mod p); H=[I|bᵀ], G=[b|I]. */
function cyclgenImpl(n: number, p: number[]): { h: Mat; g: Mat; k: number } {
  const mdeg = p.length - 1, k = n - mdeg;
  const b: number[][] = [];
  for (let i = 0; i < k; i++) {
    const e = n - k + i; const mono = new Array(e + 1).fill(0); mono[e] = 1;
    const rem = gf2rem(mono, p); const row = new Array(mdeg).fill(0);
    for (let j = 0; j < rem.length && j < mdeg; j++) row[j] = rem[j];
    b.push(row);
  }
  const hd = new Float64Array(mdeg * n);          // H = [I_mdeg | bᵀ], rows=mdeg
  for (let i = 0; i < mdeg; i++) for (let j = 0; j < n; j++) hd[i + j * mdeg] = j < mdeg ? (i === j ? 1 : 0) : b[j - mdeg][i];
  const gd = new Float64Array(k * n);             // G = [b | I_k], rows=k
  for (let i = 0; i < k; i++) for (let j = 0; j < n; j++) gd[i + j * k] = j < mdeg ? b[i][j] : (i === j - mdeg ? 1 : 0);
  return { h: mat(mdeg, n, hd), g: mat(k, n, gd), k };
}

/** gen2par over GF(2): generator [I_r|P] (r×n) → parity [Pᵀ|I_{n-r}], or parity [Q|I_r] →
 *  generator [I_{n-r}|Qᵀ]. Detects form by which side carries the identity. Involutive. */
function gen2parImpl(A: Mat): Mat {
  const r = A.rows, n = A.cols, nk = n - r, at = (i: number, c: number) => A.data[i + c * r];
  const idAt = (off: number) => { for (let i = 0; i < r; i++) for (let j = 0; j < r; j++) if (at(i, off + j) !== (i === j ? 1 : 0)) return false; return true; };
  const data = new Float64Array(nk * n);
  if (idAt(0)) {                                   // generator [I_r | P] → [Pᵀ | I_nk]
    for (let i = 0; i < nk; i++) for (let j = 0; j < n; j++) data[i + j * nk] = j < r ? at(j, r + i) : (i === j - r ? 1 : 0);
  } else {                                         // parity [Q | I_r] → [I_nk | Qᵀ]
    for (let i = 0; i < nk; i++) for (let j = 0; j < n; j++) data[i + j * nk] = j < nk ? (i === j ? 1 : 0) : at(j - nk, i);
  }
  return mat(nk, n, data);
}

export const COMM: ToolboxModule = {
  id: 'comm',
  name: 'Communications Toolbox',
  docBase: 'https://www.mathworks.com/help/comm/ref/',
  builtins: {
    // ── gen2par: swap between standard-form generator [I|P] and parity [P'|I] over GF(2) ──
    gen2par: (a) => ret(gen2parImpl(m(a[0]))),
    // rsgenpolycoeffs(n,k): Reed-Solomon generator-poly coefficients over GF(2^m), MSB-first decimals.
    rsgenpolycoeffs: (a) => {
      const n = Math.round(asScalar(a[0])), k = Math.round(asScalar(a[1])), mm = Math.round(Math.log2(n + 1));
      const F = gfField(mm), q = F.q;
      const gfmul = (x: number, y: number) => (x === 0 || y === 0 ? 0 : F.field[(F.expOf.get(x)! + F.expOf.get(y)!) % (q - 1)]);
      let g = [1]; const tt = (n - k) / 2;
      for (let i = 1; i <= 2 * tt; i++) { const ai = F.field[i % (q - 1)]; const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gfmul(g[j], ai); } g = ng; }
      return ret(rowVec(g));
    },
    // oct2poly(oct[,ord]): binary coefficients of an octal-interpreted number (MSB-first default).
    oct2poly: (a) => {
      const dec = parseInt(String(Math.round(asScalar(a[0]))), 8);
      const nb = Math.max(1, Math.ceil(Math.log2(dec + 1)));
      const msb: number[] = []; for (let i = nb - 1; i >= 0; i--) msb.push((dec >> i) & 1);
      const asc = a.length > 1 && asString(a[1]).toLowerCase().startsWith('a');
      return ret(rowVec(asc ? msb.slice().reverse() : msb));
    },
    // fspl(R,lambda): free-space path loss in dB = 20*log10(max(4*pi*R/lambda, 1)).
    fspl: (a) => { const lam = asScalar(a[1]); return ret(map(m(a[0]), (r) => 20 * Math.log10(Math.max(4 * Math.PI * r / lam, 1)))); },
    // ── GF(p) element-wise arithmetic over a prime field (3rd arg = prime p, default 2) ──
    gfadd: (a) => gfElementwise(a, (x, y, p) => gfMod(x + y, p)),
    gfsub: (a) => gfElementwise(a, (x, y, p) => gfMod(x - y, p)),
    gfmul: (a) => gfElementwise(a, (x, y, p) => gfMod(x * y, p)),
    gfdiv: (a) => gfElementwise(a, (x, y, p) => (gfMod(y, p) === 0 ? NaN : gfMod(x * gfModInv(gfMod(y, p), p), p))),
    gfconv: (a) => { const x = toArray(m(a[0])), y = toArray(m(a[1])), o = new Array(x.length + y.length - 1).fill(0); for (let i = 0; i < x.length; i++) for (let j = 0; j < y.length; j++) o[i + j] ^= (x[i] & 1) & (y[j] & 1); return ret(rowVec(o)); },
    gfdeconv: (a, nargout) => { const { q, r } = gf2divmod(toArray(m(a[0])), toArray(m(a[1]))); return Promise.resolve([rowVec(q), rowVec(r)].slice(0, Math.max(1, nargout))); },
    gfrank: (a) => ret(scalar(gf2rank(m(a[0])))),
    // ── cyclgen(n,p): systematic [H,G,k] for a cyclic code from generator polynomial p ──
    cyclgen: (a, nargout) => {
      if (a.length > 2 && asString(a[2]).toLowerCase().includes('no')) throw new Error('comm:cyclgen: only systematic mode supported');
      const { h, g, k } = cyclgenImpl(Math.round(asScalar(a[0])), toArray(m(a[1])));
      return Promise.resolve([h, g, scalar(k)].slice(0, Math.max(1, nargout)));
    },
    // ── cyclpoly(n,k): first generator polynomial (descending) dividing x^n−1 over GF(2) ──
    cyclpoly: (a) => {
      const n = Math.round(asScalar(a[0])), k = Math.round(asScalar(a[1])), md = n - k;
      const xn1 = new Array(n + 1).fill(0); xn1[0] = 1; xn1[n] = 1;
      for (let v = 0; v < (1 << Math.max(0, md - 1)); v++) {
        const p = new Array(md + 1).fill(0); p[0] = 1; p[md] = 1;
        for (let b = 0; b < md - 1; b++) p[1 + b] = (v >> b) & 1;
        if (gf2rem(xn1, p).every((x) => !x)) return ret(rowVec(p.slice().reverse()));
      }
      throw new Error('cyclpoly: no cyclic generator polynomial found');
    },
    // ── gfweight(M[,'gen'|'par']): minimum Hamming weight (min distance) of a linear code ──
    gfweight: (a) => {
      const mode = a.length > 1 ? asString(a[1]).toLowerCase() : 'gen';
      const G = mode.startsWith('par') ? gen2parImpl(m(a[0])) : m(a[0]);
      const k = G.rows, n = G.cols, gat = (i: number, c: number) => G.data[i + c * k];
      let minw = Infinity;
      for (let mm = 1; mm < (1 << k); mm++) {
        const cw = new Array<number>(n).fill(0);
        for (let i = 0; i < k; i++) if (mm & (1 << i)) for (let c = 0; c < n; c++) cw[c] ^= gat(i, c) & 1;
        const w = cw.reduce((s, x) => s + x, 0);
        if (w > 0 && w < minw) minw = w;
      }
      return ret(scalar(minw));
    },
    // ── zadoffChuSeq(R,N): seq(m) = exp(-iπ·R·m(m+1)/N), m=0..N-1 (column, complex) ──
    zadoffChuSeq: (a) => {
      const R = asScalar(a[0]), N = asScalar(a[1]);
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let mm = 0; mm < N; mm++) { const ph = -Math.PI * R * mm * (mm + 1) / N; re[mm] = Math.cos(ph); im[mm] = Math.sin(ph); }
      return ret({ kind: 'num', rows: N, cols: 1, data: re, idata: im } as Mat);
    },
    // ── Q-function (Gaussian tail) — qfunc(x)=0.5*erfc(x/√2), qfuncinv(p)=√2*erfinv(1−2p) ──
    qfunc: (a) => ret(map(m(a[0]), (x) => 0.5 * erfc(x / SQRT2))),
    qfuncinv: (a) => ret(map(m(a[0]), (p) => SQRT2 * erfinv(1 - 2 * p))),
    // ── oct2dec: interpret each value's decimal digits as octal ──
    oct2dec: (a) => ret(map(m(a[0]), (x) => parseInt(Math.round(x).toString(), 8))),
    // ── quantiz(sig,partition[,codebook]): index of each sample's partition interval (+ quantized values) ──
    quantiz: (a, nargout) => {
      const sig = toArray(m(a[0])), part = toArray(m(a[1]));
      const idx = sig.map((s) => part.filter((p) => p < s).length);
      if (nargout >= 2 && a.length > 2) { const cb = toArray(m(a[2])); return Promise.resolve([colVec(idx), colVec(idx.map((i) => cb[i]))]); }
      return ret(colVec(idx));
    },
    // ── vec2mat(v,c[,pad]): row-major reshape into ceil(n/c)×c, padding the last row ──
    vec2mat: (a) => {
      const v = toArray(m(a[0])), c = Math.round(asScalar(a[1])), n = v.length, rows = Math.max(1, Math.ceil(n / c));
      const pad = a.length > 2 ? asScalar(a[2]) : 0, data = new Float64Array(rows * c).fill(pad);
      for (let i = 0; i < n; i++) data[Math.floor(i / c) + (i % c) * rows] = v[i];
      return ret(mat(rows, c, data));
    },
    // ── compand: μ-law / A-law companding (compressor & expander) ──
    compand: (a) => {
      const param = asScalar(a[1]), V = asScalar(a[2]), method = asString(a[3]).toLowerCase();
      const comp = method.includes('compressor'), isA = method.startsWith('a');
      const lnA = Math.log(param);
      return ret(map(m(a[0]), (x) => {
        const s = Math.sign(x), u = Math.abs(x) / V;
        if (!isA) { // μ-law
          return comp ? s * V * Math.log(1 + param * u) / Math.log(1 + param)
                      : s * (V / param) * ((1 + param) ** (Math.abs(x) / V) - 1);
        }
        if (comp) return s * V * (u < 1 / param ? param * u / (1 + lnA) : (1 + Math.log(param * u)) / (1 + lnA));
        return s * V * (u < 1 / (1 + lnA) ? u * (1 + lnA) / param : Math.exp(u * (1 + lnA) - 1) / param);
      }));
    },
    /** de2bi(d[,n][,base][,flag]) — decimal→binary digits, LSB-first ('right-msb', default). */
    de2bi: (a) => {
      const d = toArray(m(a[0])).map((x) => Math.round(x));
      const msb = a.slice(1).some((x) => isMat(x) && (x as Mat).isChar && asString(x).toLowerCase() === 'left-msb');
      const nums = a.slice(1).filter((x) => isMat(x) && !(x as Mat).isChar).map((x) => Math.round(asScalar(x)));
      const n = nums.length >= 1 ? nums[0] : -1;          // requested digit count
      const base = nums.length >= 2 ? nums[1] : 2;
      let need = 1; for (const v of d) { const w = v <= 0 ? 1 : Math.floor(Math.log(v) / Math.log(base)) + 1; if (w > need) need = w; }   // loop (spread would overflow on large arrays)
      const ncol = n > 0 ? n : need;
      const out = zeros(d.length, ncol);
      d.forEach((v, r) => { let x = v; for (let c = 0; c < ncol; c++) { const digit = x % base; x = Math.floor(x / base); out.data[r + (msb ? ncol - 1 - c : c) * d.length] = digit; } });
      return ret(out);
    },
    /** bi2de(b[,base][,flag]) — binary digits→decimal, LSB-first ('right-msb', default). */
    bi2de: (a) => {
      const B = m(a[0]); const R = (B.rows === 1) ? [toArray(B)] : rows(B);
      let base = 2, msb = false;
      for (const arg of a.slice(1)) { if (isMat(arg) && (arg as Mat).isChar) msb = asString(arg).toLowerCase() === 'left-msb'; else base = Math.round(asScalar(arg)); }
      const vals = R.map((row) => { const digits = msb ? [...row].reverse() : row; return digits.reduce((s, d, j) => s + d * base ** j, 0); });
      return ret(vals.length === 1 ? scalar(vals[0]) : colVec(vals));
    },
    /** [num,rate] = symerr(a,b) — symbol (element) error count and ratio. */
    symerr: (a, nargout) => {
      const x = toArray(m(a[0])), y = toArray(m(a[1])); const num = x.reduce((s, v, i) => s + (v !== y[i] ? 1 : 0), 0);
      return nargout >= 2 ? Promise.resolve([scalar(num), scalar(num / x.length)]) : ret(scalar(num));
    },
    /** [num,rate] = biterr(a,b) — bit error count and ratio (elements compared bitwise). */
    biterr: (a, nargout) => {
      const x = toArray(m(a[0])).map((v) => Math.round(v)), y = toArray(m(a[1])).map((v) => Math.round(v));
      let mx = 1; for (const v of x) if (v > mx) mx = v; for (const v of y) if (v > mx) mx = v;   // loop, not spread
      const w = bitWidth(mx); let num = 0;
      for (let i = 0; i < x.length; i++) { let diff = BigInt(x[i]) ^ BigInt(y[i]); while (diff > 0n) { num += Number(diff & 1n); diff >>= 1n; } }   // BigInt: full >32-bit width
      return nargout >= 2 ? Promise.resolve([scalar(num), scalar(num / (x.length * w))]) : ret(scalar(num));
    },
    /** bin2gray(x) / gray2bin(x) — integer binary-reflected Gray code (element-wise). */
    bin2gray: (a) => ret(map2(m(a[0]), (v) => Number(BigInt(Math.round(v)) ^ (BigInt(Math.round(v)) >> 1n)))),   // BigInt: >32-bit safe
    gray2bin: (a) => ret(map2(m(a[0]), (v) => { let b = 0n; for (let x = BigInt(Math.round(v)); x > 0n; x >>= 1n) b ^= x; return Number(b); })),

    // ── modulation (square QAM + PSK, MATLAB Gray mapping, default scaling) ──
    qammod: (a) => { const x = toArray(m(a[0])).map((v) => Math.round(v)); const M = Math.round(asScalar(a[1])); const side = Math.round(Math.sqrt(M)), kHalf = Math.round(Math.log2(side)); const re: number[] = [], im: number[] = []; for (const xi of x) { const [I, Q] = qamPoint(xi, side, kHalf); re.push(I); im.push(Q); } return ret(cplx(m(a[0]), re, im)); },
    pskmod: (a) => { const x = toArray(m(a[0])).map((v) => Math.round(v)); const M = Math.round(asScalar(a[1])); const off = a.length >= 3 && isMat(a[2]) && !(a[2] as Mat).isChar ? asScalar(a[2]) : 0; const re: number[] = [], im: number[] = []; for (const xi of x) { const th = (2 * Math.PI * gray2bin(xi)) / M + off; re.push(Math.cos(th)); im.push(Math.sin(th)); } return ret(cplx(m(a[0]), re, im)); },
    qamdemod: (a) => {
      const y = m(a[0]); const M = Math.round(asScalar(a[1])); const side = Math.round(Math.sqrt(M)), kHalf = Math.round(Math.log2(side));
      const cre: number[] = [], cim: number[] = []; for (let s = 0; s < M; s++) { const [I, Q] = qamPoint(s, side, kHalf); cre.push(I); cim.push(Q); }
      const yre = toArray(y), yim = y.idata ? Array.from(y.idata) : new Array(yre.length).fill(0);
      return ret(sameShape(y, yre.map((r, i) => { let best = 0, bd = Infinity; for (let s = 0; s < M; s++) { const d = (r - cre[s]) ** 2 + (yim[i] - cim[s]) ** 2; if (d < bd) { bd = d; best = s; } } return best; })));
    },
    pskdemod: (a) => {
      const y = m(a[0]); const M = Math.round(asScalar(a[1])); const off = a.length >= 3 && isMat(a[2]) && !(a[2] as Mat).isChar ? asScalar(a[2]) : 0;
      const cre: number[] = [], cim: number[] = []; for (let s = 0; s < M; s++) { const th = (2 * Math.PI * gray2bin(s)) / M + off; cre.push(Math.cos(th)); cim.push(Math.sin(th)); }
      const yre = toArray(y), yim = y.idata ? Array.from(y.idata) : new Array(yre.length).fill(0);
      return ret(sameShape(y, yre.map((r, i) => { let best = 0, bd = Infinity; for (let s = 0; s < M; s++) { const d = (r - cre[s]) ** 2 + (yim[i] - cim[s]) ** 2; if (d < bd) { bd = d; best = s; } } return best; })));
    },
    /** dpskmod(x,M[,phaserot]) — differential PSK modulation (cumulative phase). */
    dpskmod: (a) => {
      const x = toArray(m(a[0])).map((v) => Math.round(v));
      const M = Math.round(asScalar(a[1]));
      const phaserot = a.length >= 3 && isMat(a[2]) && !(a[2] as Mat).isChar ? asScalar(a[2]) : 0;
      // yPhase = cumsum(phaserot + 2*pi*x/M); y = exp(1i*yPhase)
      const re: number[] = [], im: number[] = []; let acc = 0;
      for (const s of x) { acc += phaserot + (2 * Math.PI * s) / M; re.push(Math.cos(acc)); im.push(Math.sin(acc)); }
      return ret(cplx(m(a[0]), re, im));
    },
    /** dpskdemod(y,M[,phaserot]) — differential PSK demodulation (inverts dpskmod). */
    dpskdemod: (a) => {
      const y = m(a[0]); const M = Math.round(asScalar(a[1]));
      const phaserot = a.length >= 3 && isMat(a[2]) && !(a[2] as Mat).isChar ? asScalar(a[2]) : 0;
      const yre = toArray(y), yim = y.idata ? Array.from(y.idata) : new Array(yre.length).fill(0);
      // unwrap([0; angle(y)]): prepend a 0 reference, unwrap, then diff.
      const ph = [0, ...yre.map((r, i) => Math.atan2(yim[i], r))];
      for (let i = 1; i < ph.length; i++) { let d = ph[i] - ph[i - 1]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; ph[i] = ph[i - 1] + d; }
      const out = yre.map((_, i) => {
        const zPi = (ph[i + 1] - ph[i]) - phaserot;        // phase difference minus rotation
        let z = Math.ceil((zPi * M) / (2 * Math.PI) - 0.5); // round-half-down to nearest integer
        if (z < 0) z += M;                                  // remap to 0:M-1
        return z;
      });
      return ret(sameShape(y, out));
    },
    /** marcumq(a,b[,m]) — generalized Marcum Q-function (numerical integration). */
    marcumq: (a) => {
      const A = asScalar(a[0]), B = asScalar(a[1]); const mm = a.length >= 3 && isMat(a[2]) ? Math.round(asScalar(a[2])) : 1;
      // Q_m(a,b) = ∫_b^∞ x (x/a)^{m-1} exp(-(x²+a²)/2) I_{m-1}(a x) dx ; Simpson on [b, a+b+30].
      const lo = B, hi = A + B + 30, N = 4000, h = (hi - lo) / N;
      const f = (x: number) => x * (A > 0 ? (x / A) ** (mm - 1) : (mm === 1 ? 1 : 0)) * Math.exp(-(x * x + A * A) / 2) * (mm === 1 ? besselI0(A * x) : besselIn(mm - 1, A * x));
      let s = f(lo) + f(hi); for (let i = 1; i < N; i++) s += (i % 2 ? 4 : 2) * f(lo + i * h);
      return ret(scalar((h / 3) * s));
    },
    /** finddelay(x,y) — estimate the delay between signals via cross-correlation. */
    finddelay: (a) => {
      const x = toArray(m(a[0])), y = toArray(m(a[1])); const n = Math.max(x.length, y.length);
      let bestLag = 0, bestC = -Infinity;
      for (let lag = -(n - 1); lag <= n - 1; lag++) { let c = 0; for (let i = 0; i < x.length; i++) { const j = i - lag; if (j >= 0 && j < y.length) c += x[i] * y[j]; } if (c > bestC + 1e-12 || (Math.abs(c - bestC) <= 1e-12 && Math.abs(lag) < Math.abs(bestLag))) { bestC = c; bestLag = lag; } }
      return ret(scalar(-bestLag));   // MATLAB convention: delay of y relative to x
    },

    // ── convolutional codes ──
    /** poly2trellis(K, codeGen) — convert constraint length + octal generators to a trellis struct. */
    poly2trellis: (a) => {
      const K = Math.round(asScalar(a[0])); const codeGen = toArray(m(a[1]));
      const t = buildTrellis(K, codeGen);
      const fields = new Map<string, Value[]>([
        ['numInputSymbols', [scalar(t.numIn)]],
        ['numOutputSymbols', [scalar(t.numOut)]],
        ['numStates', [scalar(t.numStates)]],
        ['nextStates', [intMat(t.nextStates)]],
        ['outputs', [intMat(t.outputs)]],
      ]);
      return ret({ kind: 'struct', rows: 1, cols: 1, fields } as StructV);
    },
    /** convenc(msg, trellis) — encode a binary message through a convolutional trellis. */
    convenc: (a) => {
      const msg = toArray(m(a[0])).map((v) => Math.round(v));
      const tr = a[1] as StructV;
      const outputs = readMat(m(tr.fields.get('outputs')![0]));
      const nextStates = readMat(m(tr.fields.get('nextStates')![0]));
      const numOut = Math.round(asScalar(tr.fields.get('numOutputSymbols')![0]));
      const n = Math.round(Math.log2(numOut));
      let state = 0; const out: number[] = [];
      for (const b of msg) { const ov = outputs[state][b]; for (let i = n - 1; i >= 0; i--) out.push((ov >> i) & 1); state = nextStates[state][b]; }
      return ret(m(a[0]).rows === 1 ? mat(1, out.length, Float64Array.from(out)) : colVec(out));
    },
    /** [ok,msg] = istrellis(t) — verify a struct is a valid trellis. */
    istrellis: (a, nargout) => {
      const v = a[0]; let ok = false;
      if (v && (v as StructV).kind === 'struct') {
        const f = (v as StructV).fields;
        const has = ['numInputSymbols', 'numOutputSymbols', 'numStates', 'nextStates', 'outputs'].every((k) => f.has(k));
        if (has) {
          const ns = Math.round(asScalar(f.get('numStates')![0]));
          const ni = Math.round(asScalar(f.get('numInputSymbols')![0]));
          const nx = m(f.get('nextStates')![0]), ou = m(f.get('outputs')![0]);
          ok = nx.rows === ns && nx.cols === ni && ou.rows === ns && ou.cols === ni;
        }
      }
      const b = { kind: 'num' as const, rows: 1, cols: 1, data: Float64Array.from([ok ? 1 : 0]), isBool: true } as Mat;
      return nargout >= 2 ? Promise.resolve([b, { kind: 'num', rows: ok ? 0 : 1, cols: 0, data: new Float64Array(0), isChar: true } as Mat]) : ret(b);
    },
    /** [H,G,n,k] = hammgen(m) — parity-check and generator matrices of a Hamming code over GF(2). */
    hammgen: (a, nargout) => {
      const mm = Math.round(asScalar(a[0])); const { H, G, n, k } = hammHG(mm);
      const HM = intMat(H), GM = intMat(G);
      if (nargout >= 4) return Promise.resolve([HM, GM, scalar(n), scalar(k)]);
      if (nargout === 3) return Promise.resolve([HM, GM, scalar(n)]);
      if (nargout === 2) return Promise.resolve([HM, GM]);
      return ret(HM);
    },

    // ── Galois-field utilities ──
    /** primpoly(m[,opt][,'nodisplay']) — primitive polynomial(s) for GF(2^m), as decimal column vector. */
    primpoly: (a) => {
      const mm = Math.round(asScalar(a[0]));
      // parse opt: 'min'|'max'|'all'|'one'|number L  (ignore 'nodisplay')
      let opt: string | number = 'one';
      for (const arg of a.slice(1)) {
        if (isMat(arg) && (arg as Mat).isChar) { const s = asString(arg).toLowerCase(); if (s !== 'nodisplay') opt = s; }
        else if (isMat(arg)) opt = Math.round(asScalar(arg));
      }
      if (opt === 'one') return ret(scalar(PRIMPOLY_ONE[mm - 1]));
      const prims = allPrimpolys(mm);
      if (opt === 'all') return ret(colVec(prims));
      if (opt === 'min') return ret(scalar(Math.min(...prims)));
      if (opt === 'max') return ret(scalar(Math.max(...prims)));
      // numeric weight L: keep polys whose (m+1)-bit representation has weight L
      const L = opt as number, sel = prims.filter((p) => popcount(p) === L);
      return ret(sel.length ? colVec(sel) : (mat(0, 0, new Float64Array(0))));
    },
    /** gfminpol(k,m[,p]) — minimal polynomial(s) over GF(2^m) for exponents k (ascending coeffs, GF(2)). */
    gfminpol: (a) => {
      const K = toArray(m(a[0])).map((v) => Math.round(v));
      // second arg is m (scalar) or a prim_poly vector; we read m = round(scalar) or (len-1) of a vector.
      const arg2 = m(a[1]); const mm = arg2.data.length > 1 ? arg2.data.length - 1 : Math.round(asScalar(a[1]));
      const F = gfField(mm), cosets = gfcosets2(mm);
      const R = K.map((k) => gfminpolRow(k, F, cosets));
      if (R.length === 1) return ret(rowVec(gftruncArr(R[0]))); // single → high-order zeros removed
      return ret(rowsToMat(R));
    },
    /** gftrunc(a) — remove highest-order zero coefficients of a GF(p) polynomial (ascending). */
    gftrunc: (a) => ret(rowVec(gftruncArr(toArray(m(a[0])).map((v) => Math.round(v))))),

    // ── I/Q imbalance ──
    /** [ampDB,phaseDeg] = iqcoef2imbal(c) — imbalance a compensator coefficient corrects. */
    // iqimbal2coef(ampDB,phaseDeg): I/Q imbalance → complex compensator coefficient (inverse of iqcoef2imbal).
    iqimbal2coef: (a) => {
      const src = m(a[0]), Aarr = toArray(src), Parr = toArray(m(a[1])); const re: number[] = [], im: number[] = [];
      for (let i = 0; i < Aarr.length; i++) {
        const A = Aarr[i], P = Parr.length === 1 ? Parr[0] : Parr[i];
        const Ig = 10 ** (0.5 * A / 20), Qg = 10 ** (-0.5 * A / 20);
        const ai = -0.5 * P * Math.PI / 180, aq = Math.PI / 2 + 0.5 * P * Math.PI / 180;
        const K11 = Ig * Math.cos(ai), K12 = Qg * Math.cos(aq), K21 = Ig * Math.sin(ai), K22 = Qg * Math.sin(aq);
        const det = K11 * K22 - K12 * K21;
        const R11 = K22 / det, R12 = -K12 / det, R21 = -K21 / det, R22 = K11 / det;
        const w1r = (R11 + R22) / 2, w1i = (R21 - R12) / 2, w2r = (R11 - R22) / 2, w2i = (R21 + R12) / 2;
        const d = w1r * w1r + w1i * w1i;
        re.push((w2r * w1r + w2i * w1i) / d); im.push((w2i * w1r - w2r * w1i) / d);
      }
      return ret(cplx(src, re, im));
    },
    iqcoef2imbal: (a, nargout) => {
      const C = m(a[0]); const cre = toArray(C), cim = C.idata ? Array.from(C.idata) : new Array(cre.length).fill(0);
      const amp: number[] = [], ph: number[] = [];
      for (let i = 0; i < cre.length; i++) {
        const re = cre[i], im = cim[i];
        if (im === 0) {
          const c = re;
          if (Math.abs(c) <= 1) { amp.push(20 * Math.log10((1 - c) / (1 + c))); ph.push(0); }
          else { amp.push(20 * Math.log10((c + 1) / (c - 1))); ph.push(180); }
        } else {
          const R11 = 1 + re, R22 = 1 - re, R21 = im, R12 = im;
          // K0 = [R22 -R21; -R12 R11]
          const k11 = R22, k12 = -R21, k21 = -R12, k22 = R11;
          let av = 0;
          if (R11 !== 1) {
            const C1 = -k11 * k12 + k22 * k21, C2 = k12 * k12 + k21 * k21 - k11 * k11 - k22 * k22;
            const absC = Math.hypot(re, im);
            av = absC <= 1 ? (-C2 - Math.sqrt(C2 * C2 + 4 * C1 * C1)) / (2 * C1)
                           : (-C2 + Math.sqrt(C2 * C2 + 4 * C1 * C1)) / (2 * C1);
          }
          // K = K0 * [1 -av; av 1]
          const K11 = k11 * 1 + k12 * av, K21 = k21 * 1 + k22 * av;
          const K22 = k21 * (-av) + k22 * 1;
          amp.push(20 * Math.log10(K11 / K22));
          ph.push(-2 * Math.atan(K21 / K11) / Math.PI * 180);
        }
      }
      const ampM = cre.length === 1 ? scalar(amp[0]) : sameShape(C, amp);
      const phM = cre.length === 1 ? scalar(ph[0]) : sameShape(C, ph);
      return nargout >= 2 ? Promise.resolve([ampM, phM]) : ret(ampM);
    },

    // ── frequency modulation ──
    /** fmmod(x,Fc,Fs,freqdev[,ini_phase]) — analog frequency modulation. */
    fmmod: (a) => {
      const X = m(a[0]); const x = toArray(X);
      const Fc = asScalar(a[1]), Fs = asScalar(a[2]), freqdev = asScalar(a[3]);
      const iniPhase = a.length >= 5 && isMat(a[4]) && (a[4] as Mat).data.length ? asScalar(a[4]) : 0;
      // int_x = cumsum(x)/Fs ; y = cos(2*pi*Fc*t + 2*pi*freqdev*int_x + ini_phase)
      const y: number[] = []; let acc = 0;
      for (let i = 0; i < x.length; i++) { acc += x[i]; const t = i / Fs; const intx = acc / Fs; y.push(Math.cos(2 * Math.PI * Fc * t + 2 * Math.PI * freqdev * intx + iniPhase)); }
      return ret(sameShape(X, y));
    },

    // ── interleavers (deinterleave) ──
    /** matdeintrlv(data,Nrows,Ncols) — column-fill / row-empty deinterleaver. */
    matdeintrlv: (a) => {
      const D = m(a[0]); const isRow = D.rows === 1;
      const Nrows = Math.round(asScalar(a[1])), Ncols = Math.round(asScalar(a[2]));
      // int_table = reshape(reshape(1:prd,Ncols,Nrows)',[],1): transpose of a col-major Ncols×Nrows fill,
      // read column-major → entry (col c, row r) = c + r*Ncols + 1.
      const intTable: number[] = [];
      for (let c = 0; c < Ncols; c++) for (let r = 0; r < Nrows; r++) intTable.push(c + r * Ncols + 1);
      // data as rows of column vectors (column-major signal: each "symbol" is a row across columns)
      const dataRows = isRow ? toArray(D).map((v) => [v]) : rows(D);
      const out = deintrlvRows(dataRows, intTable);
      return ret(isRow ? rowVec(out.map((r) => r[0])) : rowsToMat(out));
    },
    /** algdeintrlv(data,num,type,...) — algebraic deinterleaver (Takeshita-Costello / Welch-Costas). */
    algdeintrlv: (a) => {
      const D = m(a[0]); const isRow = D.rows === 1; const num = Math.round(asScalar(a[1]));
      const type = asString(a[2]).toLowerCase();
      let intTable: number[] = [];
      if (type === 'takeshita-costello') {
        const k = Math.round(asScalar(a[3])), h = Math.round(asScalar(a[4]));
        const c: number[] = []; for (let mIdx = 0; mIdx < num; mIdx++) c.push(((k * mIdx * (mIdx + 1) / 2) % num) + 1);
        const d = [...c.slice(1), c[0]];
        const v = c.map((_, i) => i).sort((p, q) => c[p] - c[q]); // sort indices by c value (stable)
        intTable = v.map((vi) => d[vi]);
        if (h > 0) intTable = [...intTable.slice(h), ...intTable.slice(0, h)];
      } else { // welch-costas: y(1)=1, y(i)=mod(y(i-1)*alpha, num+1)
        const alpha = Math.round(asScalar(a[3])); const y = [1];
        for (let i = 1; i < num; i++) y.push((y[i - 1] * alpha) % (num + 1));
        intTable = y;
      }
      const dataRows = isRow ? toArray(D).map((v) => [v]) : rows(D);
      const out = deintrlvRows(dataRows, intTable);
      return ret(isRow ? rowVec(out.map((r) => r[0])) : rowsToMat(out));
    },
  },
  help: HELP_COMM,
};

function map2(M: Mat, f: (v: number) => number): Mat { const o = zeros(M.rows, M.cols); for (let i = 0; i < M.data.length; i++) o.data[i] = f(Math.round(M.data[i])); return o; }
