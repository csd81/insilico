// Curve Fitting Toolbox — computable additions (fit/fittype/polyfit/spline are
// already base): smooth, datastats, polyfit-wrapper, rsquared, plus the
// Spline Toolbox B-form (B-spline) engine (spmak/spval/spapi/…). See plan §7.
import type { Builtin } from '../builtins';
import {
  type Value, type Mat, type StructV, isMat, isStruct, rowVec, colVec, scalar, zeros, mat,
  str, toArray, asString, asScalar, toMat as m, MatError,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_CURVEFIT } from '../help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

// ── B-form struct ───────────────────────────────────────────────────────────
/** Build the MATLAB B-form struct (univariate scalar): form 'B-', knots, coefs, number, order, dim. */
function makeBform(knots: number[], coefs: number[]): StructV {
  const k = knots.length - coefs.length;
  if (k < 1) throw new MatError(`spmak: there should be more knots than coefficients (got ${knots.length} knots, ${coefs.length} coefs)`);
  const fields = new Map<string, Value[]>([
    ['form', [str('B-')]], ['knots', [rowVec(knots)]], ['coefs', [rowVec(coefs)]],
    ['number', [scalar(coefs.length)]], ['order', [scalar(k)]], ['dim', [scalar(1)]],
  ]);
  return { kind: 'struct', rows: 1, cols: 1, fields };
}
/** Read a B-form struct back into plain data. */
function readBform(v: Value): { t: number[]; a: number[]; n: number; k: number } {
  if (!isStruct(v) || asString(v.fields.get('form')?.[0] ?? str('')) !== 'B-') throw new MatError('expected a B-form spline struct (from spmak/spapi)');
  const t = toArray(m(v.fields.get('knots')![0])), a = toArray(m(v.fields.get('coefs')![0]));
  return { t, a, n: a.length, k: t.length - a.length };
}

/** The two-letter form tag of a spline struct ('pp' or 'B-'). */
function splineForm(v: Value): string {
  if (!isStruct(v)) throw new MatError('expected a spline struct (pp-form or B-form)');
  return asString(v.fields.get('form')?.[0] ?? str('')).slice(0, 2);
}

// ── core B-spline math ──────────────────────────────────────────────────────
/** Cox–de Boor: values of all n = (t.length−k) order-k B-splines at x. */
function bsplineValues(t: number[], k: number, x: number): number[] {
  const m1 = t.length - 1;                      // number of order-1 indicator intervals
  let B = new Array<number>(m1).fill(0);
  for (let i = 0; i < m1; i++) if (t[i] <= x && x < t[i + 1]) B[i] = 1;
  // right-endpoint closure: if x sits at the last distinct knot, light the last nonempty interval
  if (x >= t[m1]) { for (let i = m1 - 1; i >= 0; i--) if (t[i] < t[i + 1] && t[i] <= x) { B[i] = 1; break; } }
  for (let r = 2; r <= k; r++) {
    const nb = t.length - r; const Br = new Array<number>(nb).fill(0);
    for (let i = 0; i < nb; i++) {
      const d1 = t[i + r - 1] - t[i], d2 = t[i + r] - t[i + 1];
      const a1 = d1 > 0 ? (x - t[i]) / d1 : 0, a2 = d2 > 0 ? (t[i + r] - x) / d2 : 0;
      Br[i] = a1 * B[i] + a2 * B[i + 1];
    }
    B = Br;
  }
  return B;                                      // length n
}
/** B-form derivative: order k → k−1, coefs Δ-weighted, dropping the outer knots. */
function bsplineDeriv(t: number[], a: number[], k: number): { t: number[]; a: number[]; k: number } {
  const n = a.length;
  if (k <= 1) return { t: t.slice(1, t.length - 1), a: new Array<number>(Math.max(n - 1, 0)).fill(0), k: 0 };
  const ap = new Array<number>(n - 1);
  for (let j = 0; j < n - 1; j++) { const den = t[j + k] - t[j + 1]; ap[j] = den > 0 ? (k - 1) * (a[j + 1] - a[j]) / den : 0; }
  return { t: t.slice(1, t.length - 1), a: ap, k: k - 1 };
}
/** Derivative B-form on a FIXED knot set: d/dx Σ a_j B_{j,k} = Σ a'_j B_{j,k−1}, where the
 *  order-(k−1) basis has one MORE function than the order-k basis. Coefficients are extended
 *  with implicit zeros at both ends, so a single B-spline keeps its (now spread) support — unlike
 *  bsplineDeriv (which assumes a complete spline and trims knots). a indexes B_{0,k}..B_{n−1,k}. */
function bformDerivFixed(t: number[], a: number[], k: number): number[] {
  const nLow = t.length - (k - 1);                 // # of order-(k−1) B-splines
  const ap = new Array<number>(nLow).fill(0);
  const ext = (j: number) => (j >= 0 && j < a.length ? a[j] : 0);   // implicit zeros outside support
  for (let j = 0; j < nLow; j++) { const den = t[j + k - 1] - t[j]; ap[j] = den > 0 ? (k - 1) * (ext(j) - ext(j - 1)) / den : 0; }
  return ap;
}
/** Evaluate a univariate B-form spline at x (Σ a_j B_{j,k}(x)). */
function spvalAt(t: number[], a: number[], k: number, x: number): number {
  const B = bsplineValues(t, k, x); let s = 0; for (let j = 0; j < a.length; j++) s += a[j] * B[j]; return s;
}

// ── knot utilities ──────────────────────────────────────────────────────────
function brk2kntArr(breaks: number[], mults: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < breaks.length; i++) { const mlt = mults.length === breaks.length ? mults[i] : mults[0]; for (let r = 0; r < mlt; r++) out.push(breaks[i]); }
  return out;
}
function distinctSorted(t: number[]): { xi: number[]; mult: number[] } {
  const s = t.slice().sort((p, q) => p - q); const xi: number[] = [], mult: number[] = [];
  for (const v of s) { if (xi.length && v === xi[xi.length - 1]) mult[mult.length - 1]++; else { xi.push(v); mult.push(1); } }
  return { xi, mult };
}
function augkntArr(knots: number[], k: number, mults: number[]): number[] {
  const { xi } = distinctSorted(knots);
  if (xi.length < 2) throw new MatError('augknt: need at least two distinct knots');
  const interior = xi.slice(1, xi.length - 1);
  const im = interior.map((_, i) => (mults.length === interior.length ? mults[i] : mults[0]));
  return brk2kntArr([xi[0], ...interior, xi[xi.length - 1]], [k, ...im, k]);
}
/** Greville sites tstar_i = mean(t[i+1..i+k-1]) (the k−1 interior knots), i=1..n. */
function avekntArr(t: number[], k: number): number[] {
  const n = t.length - k; if (k < 2) throw new MatError('aveknt: order k must be ≥ 2'); if (n < 0) throw new MatError('aveknt: too few knots');
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 1; j <= k - 1; j++) s += t[i + j]; out[i] = s / (k - 1); }
  return out;
}
function aptkntArr(tau: number[], k: number): { knots: number[]; k: number } {
  const n = tau.length; if (n < 2) throw new MatError('aptknt: need at least two sites');
  k = Math.max(1, Math.min(k, n));
  if (k === 1) { const knots = [tau[0]]; for (let i = 0; i < n - 1; i++) knots.push(tau[i] + (tau[i + 1] - tau[i]) / 2); knots.push(tau[n - 1]); return { knots, k }; }
  return { knots: augkntArr([tau[0], ...avekntArr(tau, k), tau[n - 1]], k, [1]), k };
}
/** Cumulative within-run multiplicities m(i)=#{j<i: t(j)=t(i)} for sorted t. */
function knt2mltArr(t: number[]): number[] {
  const s = t.slice().sort((p, q) => p - q); const out = new Array<number>(s.length);
  for (let i = 0; i < s.length; i++) out[i] = i > 0 && s[i] === s[i - 1] ? out[i - 1] + 1 : 0;
  return out;
}

// ── pp conversion ───────────────────────────────────────────────────────────
/** sp2pp: B-form → pp-form (breaks = distinct knots in the basic interval, L×k Taylor coefs). */
function sp2ppStruct(t: number[], a: number[], k: number): StructV {
  const n = a.length; const lo = t[k - 1], hi = t[n];                 // basic interval [t(k), t(n+1)]
  const { xi } = distinctSorted(t);
  const breaks = xi.filter((v) => v >= lo - 1e-300 && v <= hi + 1e-300);
  const L = breaks.length - 1; const coefs = zeros(L, k);             // L×k, MATLAB power order (high→low)
  for (let i = 0; i < L; i++) {
    const xL = breaks[i];
    let dt = t.slice(), da = a.slice(), dk = k, fac = 1;
    for (let p = 0; p < k; p++) {                                     // p-th derivative → power p coefficient
      const val = dk >= 1 ? spvalAt(dt, da, dk, xL) : 0;
      coefs.data[i + (k - 1 - p) * L] = val / fac;                    // column (k-1-p) holds power p
      fac *= (p + 1);
      ({ t: dt, a: da, k: dk } = bsplineDeriv(dt, da, dk));
    }
  }
  const fields = new Map<string, Value[]>([
    ['form', [str('pp')]], ['breaks', [rowVec(breaks)]], ['coefs', [coefs]],
    ['pieces', [scalar(L)]], ['order', [scalar(k)]], ['dim', [scalar(1)]],
  ]);
  return { kind: 'struct', rows: 1, cols: 1, fields };
}

// ── pp-form helpers (mirror the base mkpp/ppval convention: L×k coefs, columns
//    high→low power, Horner in the local variable q − breaks[i]) ──────────────
type PP = { breaks: number[]; coefs: Mat; L: number; k: number };
/** Build a pp struct from breaks (length L+1) and an L×k coefficient matrix. */
function makePP(breaks: number[], coefs: Mat): StructV {
  const L = coefs.rows, k = coefs.cols;
  const fields = new Map<string, Value[]>([
    ['form', [str('pp')]], ['breaks', [rowVec(breaks)]], ['coefs', [coefs]],
    ['pieces', [scalar(L)]], ['order', [scalar(k)]], ['dim', [scalar(1)]],
  ]);
  return { kind: 'struct', rows: 1, cols: 1, fields };
}
/** Read a pp struct (from mkpp/spline/pchip/sp2pp) back into plain data. */
function readPP(v: Value): PP {
  if (!isStruct(v) || asString(v.fields.get('form')?.[0] ?? str('')) !== 'pp') throw new MatError('expected a piecewise-polynomial (pp) struct from spline/mkpp/sp2pp');
  const breaks = toArray(m(v.fields.get('breaks')![0]));
  const coefs = m(v.fields.get('coefs')![0]);
  return { breaks, coefs, L: coefs.rows, k: coefs.cols };
}
/** Evaluate a pp at q: locate the piece, then Horner in (q − breaks[i]). */
function ppEval(pp: PP, q: number): number {
  let i = 0; while (i < pp.L - 1 && q >= pp.breaks[i + 1]) i++;
  const t = q - pp.breaks[i]; let v = 0;
  for (let j = 0; j < pp.k; j++) v = v * t + pp.coefs.data[i + j * pp.L];
  return v;
}
/** Derivative of a pp (order k → k−1): drop the constant column, weight by power. */
function ppDer(pp: PP): StructV {
  const { breaks, coefs, L, k } = pp; if (k <= 1) return makePP(breaks, zeros(L, 1));
  const nc = zeros(L, k - 1);
  for (let i = 0; i < L; i++) for (let j = 0; j < k - 1; j++) nc.data[i + j * L] = coefs.data[i + j * L] * (k - 1 - j);
  return makePP(breaks, nc);
}
/** Antiderivative of a pp (order k → k+1), continuous across breaks. ifa = left-end value. */
function ppInt(pp: PP, ifa: number): StructV {
  const { breaks, coefs, L, k } = pp; const nc = zeros(L, k + 1); let carry = ifa;
  for (let i = 0; i < L; i++) {
    for (let j = 0; j < k; j++) nc.data[i + j * L] = coefs.data[i + j * L] / (k - j);
    nc.data[i + k * L] = carry;
    const h = breaks[i + 1] - breaks[i]; let v = 0;
    for (let j = 0; j <= k; j++) v = v * h + nc.data[i + j * L];
    carry = v;
  }
  return makePP(breaks, nc);
}

// ── small dense linear solve (Gaussian elimination with partial pivoting) ────
function solveDense(A: number[][], b: number[]): number[] {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-300;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let cc = c; cc <= n; cc++) M[r][cc] -= f * M[c][cc]; }
  }
  return M.map((r, i) => r[n] / (M[i][i] || 1e-300));
}

// ── cubic smoothing spline (csaps, univariate, unit weights) ────────────────
/** Build the smoothing-spline pp from (x,y) with smoothing parameter p∈[0,1]
 *  (p<0 ⇒ auto). Returns the pp struct and the p actually used. Algorithm from
 *  MATLAB csaps1 (de Boor, A Practical Guide to Splines, XIV.6ff), W = I. */
function csapsPP(x: number[], y: number[], p: number): { pp: StructV; p: number } {
  const n = x.length;
  const dx: number[] = []; for (let i = 0; i < n - 1; i++) dx.push(x[i + 1] - x[i]);
  const divdif: number[] = []; for (let i = 0; i < n - 1; i++) divdif.push((y[i + 1] - y[i]) / dx[i]);
  if (n === 2) { // straight-line interpolant; p forced to 1
    const C = zeros(1, 4); C.data[0] = 0; C.data[1] = 0; C.data[2] = divdif[0]; C.data[3] = y[0];
    return { pp: makePP(x.slice(), C), p: 1 };
  }
  const mm = n - 2;
  // R: (n-2)×(n-2) symmetric tridiagonal
  const R = Array.from({ length: mm }, () => new Array<number>(mm).fill(0));
  for (let i = 0; i < mm; i++) {
    R[i][i] = 2 * (dx[i + 1] + dx[i]);
    if (i + 1 < mm) R[i][i + 1] = dx[i + 1];
    if (i - 1 >= 0) R[i][i - 1] = dx[i];
  }
  // Qt: (n-2)×n with rows odx(i),-(odx(i+1)+odx(i)),odx(i+1) on diagonals 0,1,2
  const odx = dx.map((v) => 1 / v);
  const Qt = Array.from({ length: mm }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < mm; i++) { Qt[i][i] = odx[i]; Qt[i][i + 1] = -(odx[i + 1] + odx[i]); Qt[i][i + 2] = odx[i + 1]; }
  // QtWQ = Qt*Qt' (W = I)
  const QtQ = Array.from({ length: mm }, () => new Array<number>(mm).fill(0));
  for (let i = 0; i < mm; i++) for (let j = 0; j < mm; j++) { let s = 0; for (let l = 0; l < n; l++) s += Qt[i][l] * Qt[j][l]; QtQ[i][j] = s; }
  let trR = 0, trQ = 0; for (let i = 0; i < mm; i++) { trR += R[i][i]; trQ += QtQ[i][i]; }
  if (p < 0) p = 1 / (1 + trR / (6 * trQ));
  // ((6(1-p))·QtQ + p·R) u = diff(divdif)
  const A = Array.from({ length: mm }, (_, i) => Array.from({ length: mm }, (__, j) => 6 * (1 - p) * QtQ[i][j] + p * R[i][j]));
  const rhs: number[] = []; for (let i = 0; i < mm; i++) rhs.push(divdif[i + 1] - divdif[i]);
  const u = solveDense(A, rhs);                                   // length n-2
  // yi = y − 6(1-p)·diff([0; diff([0;u;0])./dx; 0])  (W = I)
  const aV = [0, ...u, 0];                                        // length n
  const bV: number[] = []; for (let i = 0; i < n - 1; i++) bV.push((aV[i + 1] - aV[i]) / dx[i]);
  const cV = [0, ...bV, 0];                                       // length n+1
  const yi = y.map((v, i) => v - 6 * (1 - p) * (cV[i + 1] - cV[i]));
  const c3 = [0, ...u.map((v) => p * v), 0];                      // length n
  const c2: number[] = []; for (let i = 0; i < n - 1; i++) c2.push((yi[i + 1] - yi[i]) / dx[i] - dx[i] * (2 * c3[i] + c3[i + 1]));
  const L = n - 1; const C = zeros(L, 4);                         // columns high→low power
  for (let i = 0; i < L; i++) {
    C.data[i + 0 * L] = (c3[i + 1] - c3[i]) / dx[i];
    C.data[i + 1 * L] = 3 * c3[i];
    C.data[i + 2 * L] = c2[i];
    C.data[i + 3 * L] = yi[i];
  }
  return { pp: makePP(x.slice(), C), p };
}

// ════════════════════════════════════════════════════════════════════════════
//  Builtins
// ════════════════════════════════════════════════════════════════════════════
const SPLINE_BUILTINS: Record<string, Builtin> = {
  /** sp=spmak(knots,coefs) — assemble a B-form spline from a knot sequence and coefficients. */
  spmak: async (a) => ret(makeBform(toArray(m(a[0])), toArray(m(a[1])))),

  /** [t,c,n,k,d]=spbrk(sp) | out=spbrk(sp,part) — break a B-form into parts. */
  spbrk: async (a, nargout) => {
    const { t, a: co, n, k } = readBform(a[0]);
    if (a.length >= 2 && (isMat(a[1]) ? (a[1] as Mat).isChar : true)) {
      switch (asString(a[1])[0]) {
        case 'k': case 't': return ret(rowVec(t));
        case 'c': return ret(rowVec(co));
        case 'n': return ret(scalar(n));
        case 'o': return ret(scalar(k));
        case 'd': return ret(scalar(1));
        case 'i': return ret(rowVec([t[0], t[t.length - 1]]));
        case 'b': { const { xi } = distinctSorted(t); return ret(rowVec(xi)); }
        default: throw new MatError(`spbrk: unknown part '${asString(a[1])}'`);
      }
    }
    const outs: Value[] = [rowVec(t), rowVec(co), scalar(n), scalar(k), scalar(1)];
    return outs.slice(0, Math.max(1, nargout));
  },

  /** v=spval(sp,x) — evaluate a B-form spline at the points x (same shape as x). */
  spval: async (a) => {
    const { t, a: co, k } = readBform(a[0]); const X = m(a[1]);
    const out = zeros(X.rows, X.cols); for (let i = 0; i < X.data.length; i++) out.data[i] = spvalAt(t, co, k, X.data[i]);
    return ret(out);
  },

  /** pp=sp2pp(sp) — convert a B-form spline to pp-form (then base fnval/fnder/fnint apply). */
  sp2pp: async (a) => { const { t, a: co, k } = readBform(a[0]); return ret(sp2ppStruct(t, co, k)); },

  /** pp=bspline(t) — the single B-spline B_{1,k} with knot sequence t (order k=numel(t)−1),
   *  returned in pp-form over the FULL knot span [t(1),t(end)]. (MATLAB's bspline also plots;
   *  the sandbox returns only the ppform, matching `pp = bspline(t)`.) Unlike sp2pp's
   *  basic-interval convention, the lone B-spline's support is the whole knot sequence, so the
   *  Taylor coefficients are sampled on every distinct-knot subinterval. */
  bspline: async (a) => {
    const t = toArray(m(a[0]));
    const k = t.length - 1;                                          // order = numel(t) − 1, n = 1
    if (k < 1) throw new MatError(`bspline: knot sequence needs at least two knots (got ${t.length})`);
    const { xi } = distinctSorted(t);
    const L = xi.length - 1; const coefs = zeros(L, k);             // L×k, MATLAB power order (high→low)
    // Precompute the derivative B-forms on the fixed knot set t: deriv[p] holds the coefficients
    // of the p-th derivative in the order-(k−p) B-spline basis (deriv[0] = [1], the B-spline itself).
    const deriv: number[][] = [[1]]; let dk = k;
    for (let p = 1; p < k; p++) { deriv.push(bformDerivFixed(t, deriv[p - 1], dk)); dk -= 1; }
    for (let i = 0; i < L; i++) {
      const xL = xi[i];                                            // left break of the subinterval
      let fac = 1;
      for (let p = 0; p < k; p++) {                                // p-th derivative → power-p coefficient
        const val = spvalAt(t, deriv[p], k - p, xL);
        coefs.data[i + (k - 1 - p) * L] = val / fac;               // column (k-1-p) holds power p
        fac *= (p + 1);
      }
    }
    return ret(makePP(xi, coefs));
  },

  /** t=augknt(knots,k[,mults]) — knot sequence with end knots of multiplicity k. */
  augknt: async (a, nargout) => {
    const knots = toArray(m(a[0])), k = Math.round(asScalar(a[1])); const mults = a.length >= 3 ? toArray(m(a[2])) : [1];
    const out = augkntArr(knots, k, mults);
    const { xi } = distinctSorted(knots); void xi;
    return nargout >= 2 ? [rowVec(out), scalar(k - 1)] : [rowVec(out)];
  },

  /** tstar=aveknt(t,k) — knot averages (Greville sites). */
  aveknt: async (a) => ret(rowVec(avekntArr(toArray(m(a[0])), Math.round(asScalar(a[1]))))),

  /** t=brk2knt(breaks,mults) — knot sequence from breaks with given multiplicities. */
  brk2knt: async (a) => ret(rowVec(brk2kntArr(toArray(m(a[0])), toArray(m(a[1])).map((v) => Math.round(v))))),

  /** [xi,m]=knt2brk(t) — distinct knots and their multiplicities. */
  knt2brk: async (a, nargout) => { const { xi, mult } = distinctSorted(toArray(m(a[0]))); return nargout >= 2 ? [rowVec(xi), rowVec(mult)] : [rowVec(xi)]; },

  /** [m,t]=knt2mlt(t) — cumulative knot multiplicities m(i)=#{j<i:t(j)=t(i)}. */
  knt2mlt: async (a, nargout) => { const t = toArray(m(a[0])); const mm = knt2mltArr(t); const ts = t.slice().sort((p, q) => p - q); return nargout >= 2 ? [rowVec(mm), rowVec(ts)] : [rowVec(mm)]; },

  /** [knots,k]=aptknt(tau,k) — knots from data sites making spapi interpolation well-posed. */
  aptknt: async (a, nargout) => { const r = aptkntArr(toArray(m(a[0])), Math.round(asScalar(a[1]))); return nargout >= 2 ? [rowVec(r.knots), scalar(r.k)] : [rowVec(r.knots)]; },

  /** colloc=spcol(knots,k,tau) — B-spline collocation matrix [B_j(tau_i)] (distinct sites). */
  spcol: async (a) => {
    const knots = toArray(m(a[0])), k = Math.round(asScalar(a[1])), tau = toArray(m(a[2]));
    if (knt2mltArr(tau).some((v) => v > 0)) throw new MatError('spcol: repeated sites (derivative collocation) are not supported in the sandbox');
    const n = knots.length - k; const C = zeros(tau.length, n);
    for (let i = 0; i < tau.length; i++) { const B = bsplineValues(knots, k, tau[i]); for (let j = 0; j < n; j++) C.data[i + j * tau.length] = B[j]; }
    return ret(C);
  },

  /** sp=spapi(knots|k,x,y) — interpolating spline (B-form). First arg scalar → order, else knots. */
  spapi: async (a) => {
    const x = toArray(m(a[1])), y = toArray(m(a[2]));
    let knots: number[], k: number;
    const arg0 = m(a[0]);
    if (arg0.rows * arg0.cols === 1) { k = Math.round(arg0.data[0]); ({ knots } = aptkntArr(x, k)); }
    else { knots = toArray(arg0); k = knots.length - x.length; if (k < 1) throw new MatError('spapi: knots and sites are incompatible (need length(knots) > length(x))'); }
    const n = knots.length - k;
    if (n !== x.length) throw new MatError(`spapi: collocation matrix must be square (got ${x.length} sites, ${n} B-splines)`);
    const C: number[][] = []; for (let i = 0; i < x.length; i++) C.push(bsplineValues(knots, k, x[i]));
    const coefs = solveDense(C, y);
    return ret(makeBform(knots, coefs));
  },

  /** v=fnval(f,x) — evaluate a spline (pp-form or B-form) at the points x (shape of x). */
  fnval: async (a) => {
    // fnval(x,f) is also allowed: swap so the struct is first.
    let f = a[0], xv = a[1];
    if (!isStruct(f) && isStruct(xv)) { const t = f; f = xv; xv = t; }
    const X = m(xv); const out = zeros(X.rows, X.cols);
    if (splineForm(f) === 'B-') { const { t, a: co, k } = readBform(f); for (let i = 0; i < X.data.length; i++) out.data[i] = spvalAt(t, co, k, X.data[i]); }
    else { const pp = readPP(f); for (let i = 0; i < X.data.length; i++) out.data[i] = ppEval(pp, X.data[i]); }
    return ret(out);
  },

  /** g=fnder(f[,dorder]) — differentiate a spline dorder times (pp-form or B-form). */
  fnder: async (a) => {
    const dorder = a.length >= 2 ? Math.round(asScalar(a[1])) : 1;
    if (dorder < 0) throw new MatError('fnder: negative differentiation order is not supported (use fnint)');
    if (splineForm(a[0]) === 'B-') {
      let { t, a: co, k } = readBform(a[0]);
      for (let r = 0; r < dorder; r++) ({ t, a: co, k } = bsplineDeriv(t, co, k));
      return ret(makeBform(t, co));
    }
    let pp = readPP(a[0]);
    for (let r = 0; r < dorder; r++) pp = readPP(ppDer(pp));
    return ret(makePP(pp.breaks, pp.coefs));
  },

  /** g=fnint(f[,ifa]) — antiderivative of a spline (pp-form or B-form); ifa = left-end value. */
  fnint: async (a) => {
    const ifa = a.length >= 2 ? asScalar(a[1]) : 0;
    if (splineForm(a[0]) === 'B-') {
      let { t, a: co, n, k } = readBform(a[0]);
      // increase multiplicity of the last knot to k (so the spline is order k+1 there)
      const diffPos: number[] = []; for (let i = 0; i < t.length - 1; i++) if (t[i + 1] > t[i]) diffPos.push(i);
      const lastInc = diffPos[diffPos.length - 1];
      const needed = (lastInc + 1) - n;                 // 1-based index(end) − n
      if (needed > 0) { const tn = t[n + k - 1]; t = [...t, ...new Array<number>(needed).fill(tn)]; co = [...co, ...new Array<number>(needed).fill(0)]; n = n + needed; }
      // integral coefficients: cumsum of a_j·(t(j+k)−t(j))/k
      const w = new Array<number>(n); for (let j = 0; j < n; j++) w[j] = co[j] * (t[j + k] - t[j]) / k;
      if (a.length >= 2) {
        const firstInc = diffPos[0];
        const need2 = k - (firstInc + 1);               // raise left-end multiplicity to k+1
        const lead = new Array<number>(Math.max(need2, 0)).fill(0);
        const knots = [...new Array<number>(need2 + 1).fill(t[0]), ...t, t[n + k - 1]];
        const seq = [ifa, ...lead, ...w]; const cs: number[] = []; let s = 0; for (const v of seq) { s += v; cs.push(s); }
        return ret(makeBform(knots, cs));
      }
      const knots = [...t, t[n + k - 1]];
      const cs: number[] = []; let s = 0; for (const v of w) { s += v; cs.push(s); }
      return ret(makeBform(knots, cs));
    }
    return ret(ppInt(readPP(a[0]), ifa));
  },

  /** out=fnbrk(f,part) — extract a part of a spline (dispatches pp→ppbrk, B-→spbrk). */
  fnbrk: async (a, nargout, env) => {
    if (splineForm(a[0]) === 'B-') return SPLINE_BUILTINS.spbrk(a, nargout, env);
    const pp = readPP(a[0]);
    const part = a.length >= 2 ? asString(a[1]).toLowerCase()[0] : '';
    if (!part) { const outs: Value[] = [rowVec(pp.breaks), pp.coefs, scalar(pp.L), scalar(pp.k), scalar(1)]; return outs.slice(0, Math.max(1, nargout)); }
    switch (part) {
      case 'b': return ret(rowVec(pp.breaks));
      case 'c': return ret(pp.coefs);
      case 'l': case 'p': return ret(scalar(pp.L));     // 'l' / 'pieces'
      case 'o': return ret(scalar(pp.k));               // 'order'
      case 'd': return ret(scalar(1));                  // 'dim'
      case 'i': return ret(rowVec([pp.breaks[0], pp.breaks[pp.breaks.length - 1]]));
      case 'f': return ret(str('ppform'));
      case 'v': return ret(scalar(1));                  // number of variables
      default: throw new MatError(`fnbrk: unknown part '${asString(a[1])}'`);
    }
  },

  /** [v,p]=csaps(x,y[,p]) — cubic smoothing spline (pp-form); p∈[0,1], omitted ⇒ auto. */
  csaps: async (a, nargout) => {
    const x = toArray(m(a[0])), y = toArray(m(a[1]));
    if (x.length !== y.length) throw new MatError('csaps: x and y must have the same length');
    if (x.length < 2) throw new MatError('csaps: need at least two data points');
    const p = a.length >= 3 && !(isMat(a[2]) && m(a[2]).data.length === 0) ? asScalar(a[2]) : -1;
    const r = csapsPP(x, y, p);
    return nargout >= 2 ? [r.pp, scalar(r.p)] : [r.pp];
  },
};

/** Moving-average smoothing with MATLAB's shrinking-window edge rule (window halves at the ends). */
function movingSmooth(y: number[], span: number): number[] {
  if (span % 2 === 0) span -= 1;             // MATLAB forces an odd span
  const h = (span - 1) / 2, n = y.length;
  return y.map((_, i) => { const w = Math.min(h, i, n - 1 - i); let s = 0; for (let k = i - w; k <= i + w; k++) s += y[k]; return s / (2 * w + 1); });
}

/** Savitzky-Golay smoothing: polynomial degree p over window width w. */
function sgSmooth(y: number[], w: number, p: number): number[] {
  if (w % 2 === 0) w += 1;
  const h = (w - 1) / 2;
  const n = y.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - h), hi = Math.min(n - 1, i + h);
    const seg = y.slice(lo, hi + 1);
    // Simple least-squares polynomial fit on segment (up to degree p)
    const deg = Math.min(p, seg.length - 1);
    // Evaluate via Vandermonde fit at the centre
    const cx = seg.map((_, j) => lo + j - i);
    // For deg=0 just mean; deg=1 linear; we stop at deg≤3 for speed
    if (deg === 0) { out[i] = seg.reduce((s, v) => s + v, 0) / seg.length; }
    else { out[i] = seg.reduce((s, v) => s + v, 0) / seg.length; } // placeholder
  }
  return out;
}

/** Fit a polynomial of degree n to (x,y) data. Returns coefficients high→low. */
function polyFit(x: number[], y: number[], n: number): number[] {
  // Build Vandermonde matrix A (rows=points, cols=n+1)
  const m = x.length;
  const A: number[][] = x.map(xi => Array.from({ length: n + 1 }, (_, j) => Math.pow(xi, n - j)));
  // Normal equations: (A^T A) c = A^T y
  const ATA: number[][] = Array.from({ length: n + 1 }, (_, r) =>
    Array.from({ length: n + 1 }, (__, c) => A.reduce((s, row) => s + row[r] * row[c], 0)));
  const ATy: number[] = Array.from({ length: n + 1 }, (_, r) =>
    A.reduce((s, row, i) => s + row[r] * y[i], 0));
  // Gaussian elimination
  const aug = ATA.map((row, i) => [...row, ATy[i]]);
  for (let col = 0; col <= n; col++) {
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-14) continue;
    for (let row = 0; row <= n; row++) {
      if (row === col) continue;
      const f = aug[row][col] / pivot;
      for (let k = 0; k <= n + 1; k++) aug[row][k] -= f * aug[col][k];
    }
  }
  return aug.map((row, i) => row[n + 1] / row[i]);
}

/** Evaluate polynomial coefficients (high→low) at x. */
function polyVal(c: number[], x: number): number {
  return c.reduce((acc, ci) => acc * x + ci, 0);
}

/** R² goodness-of-fit between y and y_fit. */
function rSquared(y: number[], yFit: number[]): number {
  const mean = y.reduce((s, v) => s + v, 0) / y.length;
  const ssTot = y.reduce((s, v) => s + (v - mean) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - yFit[i]) ** 2, 0);
  return ssTot < 1e-14 ? 1 : 1 - ssRes / ssTot;
}

export const CURVEFIT: ToolboxModule = {
  id: 'curvefit',
  name: 'Curve Fitting Toolbox',
  docBase: 'https://www.mathworks.com/help/curvefit/',
  builtins: {
    ...SPLINE_BUILTINS,
    // franke(x,y): Franke's bivariate test surface (element-wise).
    franke: (a) => {
      const X = m(a[0]), x = toArray(X), y = toArray(m(a[1]));
      const out = x.map((xi, i) => { const yi = y[i];
        return 0.75 * Math.exp(-((9 * xi - 2) ** 2 + (9 * yi - 2) ** 2) / 4)
          + 0.75 * Math.exp(-((9 * xi + 1) ** 2) / 49 - (9 * yi + 1) / 10)
          + 0.5 * Math.exp(-((9 * xi - 7) ** 2 + (9 * yi - 3) ** 2) / 4)
          - 0.2 * Math.exp(-((9 * xi - 4) ** 2) - ((9 * yi - 7) ** 2)); });
      return ret(out.length === 1 ? scalar(out[0]) : mat(X.rows, X.cols, Float64Array.from(out)));
    },
    /** smooth(y[,span][,method]) — 'moving' (default). y stays the same orientation. */
    smooth: (a) => {
      const src = m(a[0]); const y = toArray(src);
      let span = 5; let method = 'moving';
      for (const arg of a.slice(1)) { if (isMat(arg) && !(arg as Mat).isChar) span = Math.round(asScalar(arg)); else method = asString(arg).toLowerCase(); }
      if (method !== 'moving') throw new Error(`smooth: method '${method}' not yet implemented (only 'moving')`);
      const out = movingSmooth(y, Math.max(1, span));
      return ret(src.rows === 1 ? rowVec(out) : colVec(out));
    },
    /** datastats(x) — summary statistics struct (num/max/min/mean/median/range/std). */
    datastats: (a) => {
      const x = toArray(m(a[0])).filter((v) => !Number.isNaN(v)); const n = x.length; const s = x.slice().sort((p, q) => p - q);
      const mean = x.reduce((p, q) => p + q, 0) / n; const variance = x.reduce((p, q) => p + (q - mean) ** 2, 0) / Math.max(1, n - 1);
      const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; const mn = Math.min(...x), mx = Math.max(...x);
      const fields = new Map<string, Value[]>([['num', [scalar(n)]], ['max', [scalar(mx)]], ['min', [scalar(mn)]], ['mean', [scalar(mean)]], ['median', [scalar(median)]], ['range', [scalar(mx - mn)]], ['std', [scalar(Math.sqrt(variance))]]]);
      return ret({ kind: 'struct', rows: 1, cols: 1, fields } as StructV);
    },
    /** polyfit2(x, y, n) — least-squares polynomial fit; returns coefficients high→low. */
    polyfit2: (a) => {
      const x = toArray(m(a[0])); const y = toArray(m(a[1]));
      const n = Math.round(asScalar(m(a[2])));
      return ret(rowVec(polyFit(x, y, n)));
    },
    /** polyval2(c, x) — evaluate polynomial with coefficients c at each x. */
    polyval2: (a) => {
      const c = toArray(m(a[0])); const src = m(a[1]); const xv = toArray(src);
      const out = xv.map(xi => polyVal(c, xi));
      // preserve the exact shape of x (element-wise eval), matching MATLAB polyval
      return ret(mat(src.rows, src.cols, Float64Array.from(out)));
    },
    /** rsquared(y, yfit) — R² goodness-of-fit statistic (1 = perfect fit). */
    rsquared: (a) => {
      const y = toArray(m(a[0])); const yfit = toArray(m(a[1]));
      return ret(scalar(rSquared(y, yfit)));
    },
  },
  help: HELP_CURVEFIT,
};
