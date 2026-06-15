// Statistics and Machine Learning Toolbox — first reference implementation of a ToolboxModule.
// Self-contained special-function helpers (logGamma/gammainc/betainc/erf) keep the module
// independent of builtins.ts internals. Distribution pdf/cdf/inv functions, descriptive stats,
// and pdist/squareform/linkage/kmeans. See plan §7.
import type { Builtin } from '../builtins';
import {
  type Value, type Mat, isMat, isObject, makeObject, str, scalar, zeros, rowVec, colVec, toArray, map, numel,
  asString, asScalar, toMat as m, MatError, mat, fromRows, matRows, isCell, isStr, makeCell, bool,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_STATS } from '../help/help-stats';
import { inv, det, schur, svd, qr } from '../linalg';
import { erf, erfc } from '../specfun';
import { matmul, transpose } from '../values';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

// ─────────────────────────── special functions ───────────────────────────
const LN2PI = Math.log(2 * Math.PI);
const G7 = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
/** Natural log of the gamma function (Lanczos approximation, ~1e-13). */
function logGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1; let a = G7[0]; const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += G7[i] / (x + i);
  return 0.5 * LN2PI + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
/** Digamma ψ(x) (recurrence to x≥6 + asymptotic series). */
function digamma(x: number): number {
  let r = 0; while (x < 6) { r -= 1 / x; x++; }
  const f = 1 / (x * x);
  return r + Math.log(x) - 0.5 / x + f * (-1 / 12 + f * (1 / 120 + f * (-1 / 252 + f * (1 / 240 - f * (1 / 132)))));
}
/** Trigamma ψ'(x) (recurrence to x≥6 + asymptotic series). */
function trigamma(x: number): number {
  let r = 0; while (x < 6) { r += 1 / (x * x); x++; }
  const z = 1 / x;
  return r + z + 0.5 * z * z + z * z * z * (1 / 6 - z * z * (1 / 30 - z * z * (1 / 42)));
}
/** Regularized lower incomplete gamma P(a,x) = γ(a,x)/Γ(a). */
function gammainc(x: number, a: number): number {
  if (Number.isNaN(x) || Number.isNaN(a)) return NaN;
  if (x <= 0 || a <= 0) return 0;
  if (x === Infinity) return 1;                      // P(a,∞) = 1 (CDF fully accumulated)
  if (x < a + 1) {                                   // series expansion
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 0; n < 300; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;     // continued fraction for Q, return 1-Q
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}
/** Continued fraction for the regularized incomplete beta (Lentz). */
function betacf(x: number, a: number, b: number): number {
  const FPMIN = 1e-300; const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
  for (let mm = 1; mm <= 300; mm++) {
    const m2 = 2 * mm;
    let aa = mm * (b - mm) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = -(a + mm) * (qab + mm) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}
/** Regularized incomplete beta I_x(a,b). */
function betainc(x: number, a: number, b: number): number {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(x, a, b) / a : 1 - bt * betacf(1 - x, b, a) / b;
}
function nCk(n: number, k: number): number { if (k < 0 || k > n) return 0; return Math.exp(logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)); }
/** log of n-choose-k (log-domain, safe for large populations). */
function lchoose(n: number, k: number): number { return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1); }
const logBeta = (p: number, q: number) => logGamma(p) + logGamma(q) - logGamma(p + q);
/** log of Poisson(j; λ) weight = -λ + j·ln λ - ln(j!). */
const poisLogW = (j: number, lam: number) => -lam + j * Math.log(lam <= 0 ? 1e-300 : lam) - logGamma(j + 1);
/** Noncentral χ² cdf = Poisson(λ=δ/2)-mixture of central χ² cdfs. */
function ncx2cdfS(x: number, v: number, d: number): number {
  if (x <= 0) return 0; let s = 0; const lh = d / 2;
  for (let j = 0; j < 500; j++) { const w = Math.exp(poisLogW(j, lh)); s += w * gammainc(x / 2, v / 2 + j); if (j > lh && w < 1e-15) break; }
  return Math.min(1, s);
}
/** Noncentral F cdf = Poisson(λ=δ/2)-mixture of regularized incomplete betas. */
function ncfcdfS(x: number, v1: number, v2: number, d: number): number {
  if (x <= 0) return 0; let s = 0; const lh = d / 2, arg = v1 * x / (v1 * x + v2);
  for (let j = 0; j < 500; j++) { const w = Math.exp(poisLogW(j, lh)); s += w * betainc(arg, v1 / 2 + j, v2 / 2); if (j > lh && w < 1e-15) break; }
  return Math.min(1, s);
}
/** Noncentral t cdf via the Lenth (1989) Poisson-series; reflect for x<0. */
function nctcdfS(x: number, v: number, d: number): number {
  if (x < 0) return 1 - nctcdfS(-x, v, -d);
  const y = (x * x) / (x * x + v), lh = d * d / 2, phi = 0.5 * (1 + erf(-d / Math.SQRT2));
  let s = 0;
  for (let j = 0; j < 500; j++) {
    const lj = -lh + j * Math.log(lh <= 0 ? 1e-300 : lh);
    const pj = Math.exp(lj - logGamma(j + 1)), qj = Math.exp(lj - logGamma(j + 1.5)) * d / Math.SQRT2;
    s += pj * betainc(y, j + 0.5, v / 2) + qj * betainc(y, j + 1, v / 2);
    if (j > lh && pj < 1e-15 && Math.abs(qj) < 1e-15) break;
  }
  return phi + 0.5 * s;
}
/** Noncentral t pdf via the cdf recurrence f(t)=(v/t)(F_{v+2}(t√((v+2)/v))−F_v(t)). */
function nctpdfS(x: number, v: number, d: number): number {
  if (x === 0) return Math.exp(logGamma((v + 1) / 2) - 0.5 * Math.log(Math.PI * v) - logGamma(v / 2) - d * d / 2);
  const f = Math.sqrt((v + 2) / v);
  return x < 0 ? (v / x) * (nctcdfS(x * f, v + 2, d) - nctcdfS(x, v, d))
               : (-v / x) * (nctcdfS(-x * f, v + 2, -d) - nctcdfS(-x, v, -d));
}
/** Standard-normal inverse CDF (Acklam) + one Halley refinement. */
function norminvStd(p: number): number {
  if (p < 0 || p > 1 || Number.isNaN(p)) return NaN; // outside [0,1] is undefined (MATLAB returns NaN)
  if (p === 0) return -Infinity; if (p === 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const plow = 0.02425, phigh = 1 - plow; let q: number, r: number, x: number;
  if (p < plow) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (p <= phigh) { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  else { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const e = 0.5 * erfc(-x / Math.SQRT2) - p; const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2); return x - u / (1 + x * u / 2);
}
/** Bisection inverse of a monotone-increasing CDF on [lo,hi] (expanding for unbounded support). */
function invCdf(target: number, cdf: (x: number) => number, lo: number, hi: number): number {
  if (Number.isNaN(target) || target < 0 || target > 1) return NaN; // p outside [0,1] is undefined
  if (target === 0) return lo; if (target === 1) return hi;
  let a = lo, b = hi;
  if (!Number.isFinite(a)) { a = -1; while (cdf(a) > target) a *= 2; }
  if (!Number.isFinite(b)) { b = 1; while (cdf(b) < target) b *= 2; }
  for (let i = 0; i < 200; i++) { const mid = (a + b) / 2; if (cdf(mid) < target) a = mid; else b = mid; if (b - a < 1e-13 * (Math.abs(b) + 1)) break; }
  return (a + b) / 2;
}

// ─────────────────────── distribution dispatch helper ───────────────────────
/** Map a per-element function f(x, ...params) over the first arg; later args are scalar params
 *  (with defaults filled in when omitted). Covers the common `fn(X)` / `fn(X,p1,p2)` forms. */
/** Return [M] or [M,V] for a distribution *stat function depending on nargout. */
function statRet(n: number, mean: number, variance: number): Promise<Value[]> { return n >= 2 ? Promise.resolve([scalar(mean), scalar(variance)]) : Promise.resolve([scalar(mean)]); }
function dist(a: Value[], defs: number[], f: (x: number, ...p: number[]) => number): Promise<Value[]> {
  const X = m(a[0]);
  const p = defs.map((dft, i) => (a.length > i + 1 && isMat(a[i + 1]) && numel(m(a[i + 1])) > 0 ? asScalar(a[i + 1]) : dft));
  return ret(map(X, (x) => f(x, ...p)));
}

// ──────────────────────────── descriptive helpers ────────────────────────────
/** Apply a vector reducer column-wise (MATLAB convention: along dim 1, row vector → scalar). */
function colReduceNan(A: Mat, f: (c: number[]) => number): Mat {
  if (A.rows === 1) return scalar(f(toArray(A)));
  const out = new Float64Array(A.cols);
  for (let c = 0; c < A.cols; c++) { const col: number[] = []; for (let r = 0; r < A.rows; r++) col.push(A.data[r + c * A.rows]); out[c] = f(col); }
  return rowVec(Array.from(out));
}
const noNan = (c: number[]) => c.filter((x) => !Number.isNaN(x));
const mean_ = (c: number[]) => c.reduce((s, x) => s + x, 0) / (c.length || 1);
function var_(c: number[], pop = false): number { const mu = mean_(c); const ss = c.reduce((s, x) => s + (x - mu) ** 2, 0); return ss / Math.max(1, c.length - (pop ? 0 : 1)); }
function median_(c: number[]): number { const s = c.slice().sort((x, y) => x - y); const n = s.length; if (!n) return NaN; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }

// ──────────────────────── grouping-variable helpers (confusionmat / dummyvar) ────────────────────────
/** Extract a label vector as string keys plus a kind tag, from numeric / cellstr / string-array input.
 *  Returns { keys, numeric, sort }: `keys` are per-observation label strings, `numeric` marks numeric
 *  labels (so unique labels sort numerically), and `sort(a,b)` orders two label keys. */
function labelKeys(v: Value): { keys: string[]; numeric: boolean; cmp: (a: string, b: string) => number } {
  if (isCell(v)) {
    const keys = v.items.map((it) => asString(it).trim());
    return { keys, numeric: false, cmp: (a, b) => (a < b ? -1 : a > b ? 1 : 0) };
  }
  if (isStr(v)) {
    return { keys: v.items.map((s) => s.trim()), numeric: false, cmp: (a, b) => (a < b ? -1 : a > b ? 1 : 0) };
  }
  const M = m(v);
  if (M.isChar) {                          // char row(s) → one label per row
    const keys: string[] = [];
    for (let r = 0; r < M.rows; r++) { let s = ''; for (let c = 0; c < M.cols; c++) s += String.fromCharCode(M.data[r + c * M.rows]); keys.push(s.trim()); }
    return { keys, numeric: false, cmp: (a, b) => (a < b ? -1 : a > b ? 1 : 0) };
  }
  const keys = toArray(M).map((x) => String(x));
  return { keys, numeric: true, cmp: (a, b) => Number(a) - Number(b) };
}
/** Sorted unique labels (numeric: numerically; otherwise lexicographically) — matches grp2idx ordering. */
function uniqueLabels(keys: string[], cmp: (a: string, b: string) => number): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const k of keys) if (!seen.has(k)) { seen.add(k); out.push(k); }
  return out.sort(cmp);
}

// ──────────────────────── robust regression weight functions (statrobustwfun) ────────────────────────
const ROBUST_WFUNS: Record<string, { w: (r: number) => number; tune: number }> = {
  andrews: { w: (r) => { const a = Math.max(Math.sqrt(EPS), Math.abs(r)); return Math.abs(a) < Math.PI ? Math.sin(a) / a : 0; }, tune: 1.339 },
  bisquare: { w: (r) => (Math.abs(r) < 1 ? (1 - r * r) ** 2 : 0), tune: 4.685 },
  cauchy: { w: (r) => 1 / (1 + r * r), tune: 2.385 },
  fair: { w: (r) => 1 / (1 + Math.abs(r)), tune: 1.4 },
  huber: { w: (r) => 1 / Math.max(1, Math.abs(r)), tune: 1.345 },
  logistic: { w: (r) => { const a = Math.max(Math.sqrt(EPS), Math.abs(r)); return Math.tanh(a) / a; }, tune: 1.205 },
  ols: { w: () => 1, tune: 1 },
  talwar: { w: (r) => (Math.abs(r) < 1 ? 1 : 0), tune: 2.795 },
  welsch: { w: (r) => Math.exp(-(r * r)), tune: 2.985 },
};

// ──────────────────────────── distance / clustering ────────────────────────────
const METRICS: Record<string, (u: number[], v: number[], p?: number) => number> = {
  euclidean: (u, v) => Math.sqrt(u.reduce((s, x, i) => s + (x - v[i]) ** 2, 0)),
  squaredeuclidean: (u, v) => u.reduce((s, x, i) => s + (x - v[i]) ** 2, 0),
  cityblock: (u, v) => u.reduce((s, x, i) => s + Math.abs(x - v[i]), 0),
  chebychev: (u, v) => u.reduce((s, x, i) => Math.max(s, Math.abs(x - v[i])), 0),
  minkowski: (u, v, p = 2) => u.reduce((s, x, i) => s + Math.abs(x - v[i]) ** p, 0) ** (1 / p),
  hamming: (u, v) => u.reduce((s, x, i) => s + (x !== v[i] ? 1 : 0), 0) / u.length,
  cosine: (u, v) => 1 - dot(u, v) / (Math.hypot(...u) * Math.hypot(...v)),
};
function dot(u: number[], v: number[]): number { return u.reduce((s, x, i) => s + x * v[i], 0); }

// ─────────────────── distribution objects (makedist / pdf / cdf / icdf) ───────────────────
interface DistSpec { display: string; params: string[]; defaults: number[]; pdf: (x: number, ...p: number[]) => number; cdf: (x: number, ...p: number[]) => number; inv: (p: number, ...q: number[]) => number; }
const DISTS: Record<string, DistSpec> = {
  normal: { display: 'Normal', params: ['mu', 'sigma'], defaults: [0, 1], pdf: (x, mu, s) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI)), cdf: (x, mu, s) => 0.5 * erfc(-(x - mu) / (s * Math.SQRT2)), inv: (p, mu, s) => mu + s * norminvStd(p) },
  exponential: { display: 'Exponential', params: ['mu'], defaults: [1], pdf: (x, mu) => x < 0 ? 0 : Math.exp(-x / mu) / mu, cdf: (x, mu) => x < 0 ? 0 : 1 - Math.exp(-x / mu), inv: (p, mu) => -mu * Math.log(1 - p) },
  poisson: { display: 'Poisson', params: ['lambda'], defaults: [1], pdf: (k, lam) => (k !== Math.round(k) || k < 0) ? 0 : Math.exp(k * Math.log(lam) - lam - logGamma(k + 1)), cdf: (k, lam) => { k = Math.floor(k); return k < 0 ? 0 : k === Infinity ? 1 : 1 - gammainc(lam, k + 1); }, inv: (pr, lam) => { let c = 0, k = 0; for (; k < 1e6; k++) { c += Math.exp(k * Math.log(lam) - lam - logGamma(k + 1)); if (c >= pr - 1e-12) return k; } return k; } },
  uniform: { display: 'Uniform', params: ['lower', 'upper'], defaults: [0, 1], pdf: (x, lo, hi) => x >= lo && x <= hi ? 1 / (hi - lo) : 0, cdf: (x, lo, hi) => x < lo ? 0 : x > hi ? 1 : (x - lo) / (hi - lo), inv: (p, lo, hi) => lo + p * (hi - lo) },
  gamma: { display: 'Gamma', params: ['a', 'b'], defaults: [1, 1], pdf: (x, k, th) => x < 0 ? 0 : Math.exp((k - 1) * Math.log(x) - x / th - k * Math.log(th) - logGamma(k)), cdf: (x, k, th) => gammainc(x / th, k), inv: (p, k, th) => invCdf(p, (x) => gammainc(x / th, k), 0, Infinity) },
  lognormal: { display: 'Lognormal', params: ['mu', 'sigma'], defaults: [0, 1], pdf: (x, mu, s) => x <= 0 ? 0 : Math.exp(-0.5 * ((Math.log(x) - mu) / s) ** 2) / (x * s * Math.sqrt(2 * Math.PI)), cdf: (x, mu, s) => x <= 0 ? 0 : 0.5 * erfc(-(Math.log(x) - mu) / (s * Math.SQRT2)), inv: (p, mu, s) => Math.exp(mu + s * norminvStd(p)) },
};
const normDistName = (s: string) => s.toLowerCase().replace(/\s+|distribution$/g, '');
/** Resolve (spec, paramValues) from either a distribution object or a name string + trailing params. */
function resolveDist(a: Value[]): { spec: DistSpec; vals: number[]; rest: Value[] } {
  if (isObject(a[0])) {
    const o = a[0]; const spec = DISTS[normDistName(o.className.replace(/^prob\./, ''))];
    if (!spec) throw new MatError(`unknown distribution object '${o.className}'`);
    const vals = spec.params.map((p, i) => { const v = o.props.get(p); return v ? asScalar(v) : spec.defaults[i]; });
    return { spec, vals, rest: a.slice(1) };
  }
  const spec = DISTS[normDistName(asString(a[0]))];
  if (!spec) throw new MatError(`unknown distribution '${asString(a[0])}'`);
  const vals = spec.defaults.map((d, i) => (a.length > i + 2 && isMat(a[i + 2]) ? asScalar(a[i + 2]) : d));
  return { spec, vals, rest: a.slice(1, 2) };
}

// ── hypothesis-test helpers ──────────────────────────────────────────────────
const normcdfL = (z: number) => 0.5 * erfc(-z / Math.SQRT2);
function tcdfL(x: number, v: number): number { const ib = betainc(v / (v + x * x), v / 2, 0.5); return x >= 0 ? 1 - 0.5 * ib : 0.5 * ib; }
function tinvL(p: number, v: number): number { if (p <= 0) return -Infinity; if (p >= 1) return Infinity; return invCdf(p, (x) => tcdfL(x, v), -1e6, 1e6); }
const sd_ = (c: number[]) => Math.sqrt(var_(c));
/** Exact one-sample two-sided KS CDF P(D_n < d) via Marsaglia–Tsang–Wang (2003).
 *  This is the method MATLAB's `kstest` uses (not the Stephens asymptotic). */
function ksExactCDF(n: number, d: number): number {
  if (d <= 0) return 0; if (d >= 1) return 1;
  const k = Math.ceil(n * d), mm = 2 * k - 1, h = k - n * d;
  let H: number[][] = Array.from({ length: mm }, () => new Array<number>(mm).fill(0));
  for (let i = 0; i < mm; i++) for (let j = 0; j < mm; j++) H[i][j] = (i - j + 1 < 0) ? 0 : 1;
  for (let i = 0; i < mm; i++) { H[i][0] -= Math.pow(h, i + 1); H[mm - 1][i] -= Math.pow(h, mm - i); }
  H[mm - 1][0] += (2 * h - 1 > 0 ? Math.pow(2 * h - 1, mm) : 0);
  for (let i = 0; i < mm; i++) for (let j = 0; j < mm; j++) if (i - j + 1 > 0) for (let g = 1; g <= i - j + 1; g++) H[i][j] /= g;
  // H^n with periodic rescaling to avoid overflow (track the exponent in eQ).
  const mul = (A: number[][], B: number[][]): number[][] => { const C = Array.from({ length: mm }, () => new Array<number>(mm).fill(0)); for (let i = 0; i < mm; i++) for (let l = 0; l < mm; l++) { const a = A[i][l]; if (a === 0) continue; for (let j = 0; j < mm; j++) C[i][j] += a * B[l][j]; } return C; };
  let P: number[][] | null = null, base = H, eQ = 0, e = n;
  while (e > 0) { if (e & 1) { P = P ? mul(P, base) : base.map((r) => r.slice()); if (P[k - 1][k - 1] > 1e140) { P = P.map((r) => r.map((v) => v * 1e-140)); eQ += 140; } } e >>= 1; if (e > 0) { base = mul(base, base); if (base[k - 1][k - 1] > 1e140) { base = base.map((r) => r.map((v) => v * 1e-140)); eQ *= 2; } } }
  let s = P![k - 1][k - 1];
  for (let i = 1; i <= n; i++) { s = s * i / n; if (s < 1e-140) { s *= 1e140; eQ -= 140; } }
  return s * Math.pow(10, eQ);
}
/** Exact one-sided KS tail P(D_n^+ ≥ d) (Birnbaum–Tingey closed form). */
function ksOneSidedSF(n: number, d: number): number {
  if (d <= 0) return 1; if (d >= 1) return 0;
  const logC = (nn: number, kk: number) => { let s = 0; for (let i = 0; i < kk; i++) s += Math.log(nn - i) - Math.log(i + 1); return s; };
  let sum = 0; const jmax = Math.floor(n * (1 - d));
  for (let j = 0; j <= jmax; j++) { const t1 = (d + j / n), t2 = (1 - d - j / n); sum += Math.exp(logC(n, j) + (j - 1) * Math.log(t1) + (n - j) * Math.log(t2)); }
  return Math.min(1, Math.max(0, d * sum));
}
/** First d primes (Halton bases). */
function firstPrimes(d: number): number[] {
  const ps: number[] = []; let n = 2;
  while (ps.length < d) { let prime = true; for (let k = 2; k * k <= n; k++) if (n % k === 0) { prime = false; break; } if (prime) ps.push(n); n++; }
  return ps;
}
/** Build a 1×1 struct from [name, value] pairs (drops undefined entries). */
function mkStruct(pairs: [string, Value | undefined][]): Value {
  const fields = new Map<string, Value[]>(); for (const [k, v] of pairs) if (v !== undefined) fields.set(k, [v]);
  return { kind: 'struct', rows: 1, cols: 1, fields } as Value;
}
/** Parse the trailing 'tail' option → -1 (left) | 0 (both) | 1 (right). */
function tailCode(v: Value | undefined): number {
  if (v === undefined) return 0; if (isMat(v) && !(v as Mat).isChar) { const t = asScalar(v); return t === -1 || t === 0 || t === 1 ? t : 0; }
  const s = asString(v).toLowerCase(); return s.startsWith('l') ? -1 : s.startsWith('r') ? 1 : 0;
}
/** Average ranks with tie handling; tieadj = Σ(t³−t)/2 over tie groups. */
function tiedrank(x: number[]): { ranks: number[]; tieadj: number } {
  const n = x.length, idx = x.map((_, i) => i).sort((i, j) => x[i] - x[j]);
  const ranks = new Array<number>(n); let tieadj = 0;
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && x[idx[j + 1]] === x[idx[i]]) j++; const avg = (i + j) / 2 + 1; const t = j - i + 1; for (let k = i; k <= j; k++) ranks[idx[k]] = avg; tieadj += (t * t * t - t) / 2; i = j + 1; }
  return { ranks, tieadj };
}
/** NaN-aware single-column tiedrank: average ranks for ties, NaN→NaN. Mirrors statslib tr(). */
function tiedrankCol(x: number[]): { ranks: number[]; tieadj: number } {
  const n = x.length;
  const idx = x.map((_, i) => i).sort((i, j) => {
    const a = x[i], b = x[j];
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1; if (Number.isNaN(b)) return -1;
    return a - b;
  });
  const xLen = x.reduce((c, v) => c + (Number.isNaN(v) ? 0 : 1), 0);
  const ranks = new Array<number>(n); let tieadj = 0;
  for (let k = xLen; k < n; k++) ranks[idx[k]] = NaN;
  for (let i = 0; i < xLen;) {
    let j = i; while (j + 1 < xLen && x[idx[j + 1]] === x[idx[i]]) j++;
    const avg = (i + j) / 2 + 1, t = j - i + 1;
    for (let k = i; k <= j; k++) ranks[idx[k]] = avg;
    tieadj += (t * t * t - t) / 2; i = j + 1;
  }
  return { ranks, tieadj };
}
/** tiedrank(X) — ranks adjusting for ties; column-wise for matrices. */
function tiedrankImpl(args: Value[], nargout: number): Value[] {
  const A = m(args[0]);
  const isVec = A.rows === 1 || A.cols === 1;
  if (isVec) {
    const { ranks, tieadj } = tiedrankCol(toArray(A));
    const R = A.rows === 1 ? rowVec(ranks) : colVec(ranks);
    return nargout >= 2 ? [R, scalar(tieadj)] : [R];
  }
  const R = zeros(A.rows, A.cols); const adj: number[] = [];
  for (let c = 0; c < A.cols; c++) {
    const col: number[] = []; for (let r = 0; r < A.rows; r++) col.push(A.data[r + c * A.rows]);
    const { ranks, tieadj } = tiedrankCol(col);
    for (let r = 0; r < A.rows; r++) R.data[r + c * A.rows] = ranks[r];
    adj.push(tieadj);
  }
  return nargout >= 2 ? [R, rowVec(adj)] : [R];
}
/** partialcorr(X) — pairwise partial correlation controlling for all other columns, via the
 *  precision matrix P=inv(cov(X)): rho(i,j) = -P(i,j)/sqrt(P(i,i)·P(j,j)), diagonal 1. */
function partialcorrImpl(args: Value[]): Value {
  const X = m(args[0]); const nr = X.rows, p = X.cols;
  const col = (c: number) => { const v: number[] = []; for (let r = 0; r < nr; r++) v.push(X.data[r + c * nr]); return v; };
  const means = Array.from({ length: p }, (_, c) => col(c).reduce((s, v) => s + v, 0) / nr);
  const S = zeros(p, p);                                   // sample covariance (÷ nr-1)
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
    const ci = col(i), cj = col(j); let s = 0;
    for (let r = 0; r < nr; r++) s += (ci[r] - means[i]) * (cj[r] - means[j]);
    S.data[i + j * p] = s / (nr - 1);
  }
  const P = inv(S);
  const R = zeros(p, p);
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
    R.data[i + j * p] = i === j ? 1 : -P.data[i + j * p] / Math.sqrt(P.data[i + i * p] * P.data[j + j * p]);
  }
  return R;
}

/** Exact signed-rank null distribution: counts[k] = #{sign subsets with positive-rank-sum k},
 *  ranks scaled to integers (×2 if half-integer ties). Returns {counts, scale, total}. */
function signedRankDist(ranks: number[]): { counts: number[]; scale: number; total: number } {
  const scale = ranks.some((r) => r !== Math.floor(r)) ? 2 : 1;
  const r = ranks.map((v) => Math.round(v * scale)); const maxS = r.reduce((s, v) => s + v, 0);
  const counts = new Array<number>(maxS + 1).fill(0); counts[0] = 1;
  for (const ri of r) for (let s = maxS; s >= ri; s--) counts[s] += counts[s - ri];
  return { counts, scale, total: 2 ** ranks.length };
}
/** Exact rank-sum (Mann-Whitney) distribution: ways to choose exactly `ns` of the combined
 *  ranks summing to s. Returns counts indexed by scaled sum, scale, and total C(n,ns). */
function rankSumDist(ranks: number[], ns: number): { counts: number[]; scale: number; total: number } {
  const scale = ranks.some((r) => r !== Math.floor(r)) ? 2 : 1;
  const r = ranks.map((v) => Math.round(v * scale)); const maxS = r.reduce((s, v) => s + v, 0);
  const dp = Array.from({ length: ns + 1 }, () => new Array<number>(maxS + 1).fill(0)); dp[0][0] = 1;
  for (const ri of r) for (let j = ns; j >= 1; j--) for (let s = maxS; s >= ri; s--) dp[j][s] += dp[j - 1][s - ri];
  let total = 0; for (const c of dp[ns]) total += c;
  return { counts: dp[ns], scale, total };
}

// ── Anderson-Darling distribution (Marsaglia 2004) ───────────────────────────
/** Anderson-Darling statistic A²ₙ from sorted CDF values z (length n). */
function computeADStat(z: number[]): number {
  const n = z.length; const s = z.slice().sort((a, b) => a - b);
  let acc = 0;
  for (let i = 0; i < n; i++) acc += (2 * (i + 1) - 1) * (Math.log(s[i]) + Math.log(1 - s[n - 1 - i]));
  return -acc / n - n;
}
/** Quick adinf(z): the simplified A∞ CDF from Marsaglia's paper (~7 digits). */
function adinfShort(ad: number): number {
  if (ad < 2) {
    return ad ** (-0.5) * Math.exp(-1.2337 / ad) * (2.00012 + (0.247105 - (0.0649821 - (0.0347962 - (0.0116720 - 0.00168691 * ad) * ad) * ad) * ad) * ad);
  }
  return Math.exp(-Math.exp(1.0776 - (2.30695 - (0.43424 - (0.082433 - (0.008056 - 0.0003146 * ad) * ad) * ad) * ad) * ad));
}
/** Finite-sample correction errfix(n,x) from Marsaglia's paper. */
function adErrFix(n: number, x: number): number {
  const c = 0.01265 + 0.1757 / n;
  if (x < c) { const xc = x / c; const g1 = Math.sqrt(xc) * (1 - xc) * (49 * xc - 102); return (0.0037 / n ** 3 + 0.00078 / n ** 2 + 0.00006 / n) * g1; }
  if (x < 0.8) { const xc = (x - c) / (0.8 - c); const g2 = -0.00022633 + (6.54034 - (14.6538 - (14.458 - (8.259 - 1.91864 * xc) * xc) * xc) * xc) * xc; return (0.04213 / n + 0.01365 / n ** 2) * g2; }
  const xc = x; return (1 / n) * (-130.2137 + (745.2337 - (1705.091 - (1950.646 - (1116.360 - 255.7844 * xc) * xc) * xc) * xc) * xc) * xc;
}
/** Pr(Aₙ < ad) for finite n (simple-hypothesis p-value path). */
function adn(n: number, ad: number): number { const x = adinfShort(ad); return x + adErrFix(n, x); }
/** Tabulated significance levels for composite-test critical values. */
const AD_ALPHAS = [0.0005, 0.001, 0.0015, 0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.99];
/** Composite-normal critical values: Aₙ = A∞(1 + b₀/n + b₁/n²) per-alpha coefficients. */
function adCVsNorm(n: number): number[] {
  const a0 = [1.5649, 1.4407, 1.3699, 1.3187, 1.1556, 1.0339, 0.8733, 0.7519, 0.6308, 0.5598, 0.5092, 0.4694, 0.4366, 0.4084, 0.3835, 0.3611, 0.3405, 0.3212, 0.3029, 0.2852, 0.2679, 0.2506, 0.2330, 0.2144, 0.1935, 0.1673, 0.1296];
  const a1 = [-0.9362, -0.9029, -0.8906, -0.8865, -0.8375, -0.7835, -0.6746, -0.5835, -0.4775, -0.4094, -0.3679, -0.3327, -0.3099, -0.2969, -0.2795, -0.2623, -0.2464, -0.2325, -0.2164, -0.1994, -0.1784, -0.1569, -0.1377, -0.1201, -0.0989, -0.0800, -0.0598];
  const a2 = [-8.3249, -6.6022, -5.6461, -4.9685, -3.2208, -2.1647, -1.2460, -0.7803, -0.4627, -0.3672, -0.2833, -0.2349, -0.1442, -0.0229, 0.0377, 0.0817, 0.1150, 0.1583, 0.1801, 0.1887, 0.1695, 0.1513, 0.1533, 0.1724, 0.2027, 0.3158, 0.6431];
  return a0.map((v, i) => v + a1[i] / n + a2[i] / (n * n));
}
/** Composite-exponential critical values: Aₙ = A∞(1 + b₀/n) per-alpha coefficients. */
function adCVsExp(n: number): number[] {
  const a0 = [3.2371, 2.9303, 2.7541, 2.6307, 2.2454, 1.9621, 1.5928, 1.3223, 1.0621, 0.9153, 0.8134, 0.7355, 0.6725, 0.6194, 0.5734, 0.5326, 0.4957, 0.4617, 0.4301, 0.4001, 0.3712, 0.3428, 0.3144, 0.2849, 0.2527, 0.2131, 0.1581];
  const a1 = [1.6146, 0.8716, 0.4715, 0.2066, -0.4682, -0.7691, -0.7388, -0.5758, -0.4036, -0.3142, -0.2564, -0.2152, -0.1845, -0.1607, -0.1409, -0.1239, -0.1084, -0.0942, -0.0807, -0.0674, -0.0537, -0.0401, -0.0261, -0.0116, 0.0047, 0.0275, 0.0780];
  return a0.map((v, i) => v + a1[i] / n);
}
/** Piecewise-cubic Hermite (pchip) interpolation, matching MATLAB's monotone slopes. */
function pchip(xs: number[], ys: number[], xq: number): number {
  const n = xs.length;
  if (n === 1) return ys[0];
  const h: number[] = [], del: number[] = [];
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); del.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i])); }
  const d = new Array<number>(n).fill(0);
  for (let k = 1; k < n - 1; k++) {
    if (del[k - 1] * del[k] > 0) { const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1]; d[k] = (w1 + w2) / (w1 / del[k - 1] + w2 / del[k]); }
  }
  // endpoint slopes (non-centered, shape-preserving)
  const endSlope = (hA: number, hB: number, dA: number, dB: number) => {
    let s = ((2 * hA + hB) * dA - hA * dB) / (hA + hB);
    if (Math.sign(s) !== Math.sign(dA)) s = 0; else if (Math.sign(dA) !== Math.sign(dB) && Math.abs(s) > 3 * Math.abs(dA)) s = 3 * dA;
    return s;
  };
  d[0] = n > 2 ? endSlope(h[0], h[1], del[0], del[1]) : del[0];
  d[n - 1] = n > 2 ? endSlope(h[n - 2], h[n - 3], del[n - 2], del[n - 3]) : del[n - 2];
  // locate interval
  let k = 0; while (k < n - 2 && xq > xs[k + 1]) k++;
  const t = xq - xs[k], hk = h[k];
  const c2 = (3 * del[k] - 2 * d[k] - d[k + 1]) / hk;
  const c3 = (d[k] + d[k + 1] - 2 * del[k]) / (hk * hk);
  return ys[k] + t * (d[k] + t * (c2 + t * c3));
}
/** Solve A·y = b for a small dense system (Gaussian elimination, partial pivoting). */
function solveLin(A: number[][], b: number[]): number[] {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col; for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    if (Math.abs(d) < 1e-12) throw new MatError('matrix is singular or rank deficient');   // fail loudly instead of returning bogus zeros
    for (let r = 0; r < n; r++) { if (r === col) continue; const f = M[r][col] / d; for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c]; }
  }
  return M.map((row, i) => row[n] / M[i][i]);
}
/** Upper-tail of the F distribution = fpval(x,df1,df2); df2=Inf → chi²(df1) scaling. */
function fUpperTail(x: number, df1: number, df2: number): number {
  if (!(x > 0)) return 1;
  if (!Number.isFinite(df2)) return 1 - gammainc(df1 * x / 2, df1 / 2);
  return 1 - betainc(df1 * x / (df1 * x + df2), df1 / 2, df2 / 2);
}

// ── generalized linear model (glmfit) via IRLS ──
type GLMSpec = {
  link: (mu: number) => number;          // g(mu) = eta
  dlink: (mu: number) => number;         // dg/dmu
  ilink: (eta: number) => number;        // g⁻¹(eta) = mu
  sqrtvar: (mu: number) => number;       // sqrt(V(mu))  (variance function)
  dev: (mu: number, y: number) => number;// per-observation deviance contribution
  init: (y: number, N: number) => number;// starting mu
  muLim: [number, number];               // (lo,hi) clamp on mu
};
const EPS = Number.EPSILON;
/** Clamp mu into the distribution's valid support (matches MATLAB muLims). */
const clampMu = (mu: number, spec: GLMSpec): number => Math.min(Math.max(mu, spec.muLim[0]), spec.muLim[1]);
/** Distribution / canonical-link specs matching MATLAB glmfit conventions. */
function glmSpec(distr: string): GLMSpec {
  const d = distr.toLowerCase();
  if (d === 'normal' || d === 'gaussian') return {
    link: (mu) => mu, dlink: () => 1, ilink: (e) => e, sqrtvar: () => 1,
    dev: (mu, y) => (y - mu) * (y - mu), init: (y) => y, muLim: [-Infinity, Infinity],
  };
  if (d === 'poisson') {
    const lo = Math.exp(-708);
    return {
      link: (mu) => Math.log(mu), dlink: (mu) => 1 / mu, ilink: (e) => Math.exp(e), sqrtvar: (mu) => Math.sqrt(mu),
      dev: (mu, y) => 2 * (y * (y > 0 ? Math.log(y / mu) : 0) - (y - mu)), init: (y) => y + 0.25, muLim: [lo, Infinity],
    };
  }
  if (d === 'binomial') {
    const eps = Math.pow(EPS, 1 / 3);
    return {
      link: (mu) => Math.log(mu / (1 - mu)), dlink: (mu) => 1 / (mu * (1 - mu)), ilink: (e) => 1 / (1 + Math.exp(-e)),
      sqrtvar: (mu) => Math.sqrt(mu * (1 - mu)),
      dev: (mu, y) => 2 * ((y > 0 ? y * Math.log(y / mu) : 0) + (y < 1 ? (1 - y) * Math.log((1 - y) / (1 - mu)) : 0)),
      init: (y, N) => (N * y + 0.5) / (N + 1), muLim: [eps, 1 - eps],
    };
  }
  if (d === 'gamma') {
    const lo = Math.exp(-708);
    return {
      link: (mu) => 1 / mu, dlink: (mu) => -1 / (mu * mu), ilink: (e) => 1 / e, sqrtvar: (mu) => mu,
      dev: (mu, y) => 2 * (-(y > 0 ? Math.log(y / mu) : 0) + (y - mu) / mu), init: (y) => Math.max(y, EPS), muLim: [lo, Infinity],
    };
  }
  throw new Error(`glmfit: unsupported distribution '${distr}'`);
}

// ── scalar distribution helpers (reused by sampsizepwr / ansaribradley / knntest) ──
const chi2cdfS = (x: number, v: number) => gammainc(x / 2, v / 2);
const chi2invS = (p: number, v: number) => invCdf(p, (x) => gammainc(x / 2, v / 2), 0, Infinity);
const norminvS = (p: number, mu = 0, s = 1) => mu + s * norminvStd(p);
const normcdfS = (x: number, mu = 0, s = 1) => 0.5 * erfc(-(x - mu) / (s * Math.SQRT2));
/** Binomial cdf P(X<=k) and pdf using the incomplete-beta / log-domain forms. */
function binopdfS(k: number, n: number, p: number): number { if (k < 0 || k > n) return 0; return Math.exp(lchoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)); }
function binocdfS(k: number, n: number, p: number): number { k = Math.floor(k); if (k < 0) return 0; if (k >= n) return 1; return betainc(1 - p, n - k, k + 1); }
/** Binomial inverse: smallest k with cdf(k) >= pr. */
function binoinvS(pr: number, n: number, p: number): number { for (let k = 0; k <= n; k++) if (binocdfS(k, n, p) >= pr - 1e-12) return k; return n; }

// ── bivariate/multivariate normal CDF (Genz) ────────────────────────────────
const BVN_W = [
  [0.1713244923791705, 0.3607615730481384, 0.4679139345726904],
  [0.04717533638651177, 0.1069393259953183, 0.1600783285433464, 0.2031674267230659, 0.2334925365383547, 0.2491470458134029],
  [0.01761400713915212, 0.04060142980038694, 0.06267204833410906, 0.08327674157670475, 0.1019301198172404, 0.1181945319615184, 0.1316886384491766, 0.1420961093183821, 0.1491729864726037, 0.1527533871307259],
];
const BVN_X = [
  [-0.9324695142031522, -0.6612093864662647, -0.2386191860831970],
  [-0.9815606342467191, -0.9041172563704750, -0.7699026741943050, -0.5873179542866171, -0.3678314989981802, -0.1252334085114692],
  [-0.9931285991850949, -0.9639719272779138, -0.9122344282513259, -0.8391169718222188, -0.7463319064601508, -0.6360536807265150, -0.5108670019508271, -0.3737060887154196, -0.2277858511416451, -0.07652652113349733],
];
/** Upper-tail bivariate normal P(X>=h, Y>=k), correlation r — Genz BVNU (tvpack). */
function bvnu(h: number, k: number, r: number): number {
  const phi = (z: number) => 0.5 * erfc(-z / Math.SQRT2);
  if (!Number.isFinite(h) && h > 0) return 0;
  if (!Number.isFinite(k) && k > 0) return 0;
  if (!Number.isFinite(h)) return phi(-k);
  if (!Number.isFinite(k)) return phi(-h);
  const ar = Math.abs(r);
  const idx = ar < 0.3 ? 0 : ar < 0.75 ? 1 : 2;
  const w = BVN_W[idx], x = BVN_X[idx], lg = w.length;
  const hk = h * k; let bvn = 0;
  if (ar < 0.925) {
    const hs = (h * h + k * k) / 2, asr = Math.asin(r) / 2;
    for (let i = 0; i < lg; i++) for (const sgn of [-1, 1]) {
      const sn = Math.sin(asr * (sgn * x[i] + 1));
      bvn += w[i] * Math.exp((sn * hk - hs) / (1 - sn * sn));
    }
    bvn = bvn * asr / (2 * Math.PI) + phi(-h) * phi(-k);
  } else {
    let kk = k, hkk = hk;
    if (r < 0) { kk = -k; hkk = -hk; }
    const a = Math.sqrt(1 - r * r), b = Math.abs(h - kk), bs = b * b, c = (4 - hkk) / 8, d = (12 - hkk) / 16;
    let asr = -(bs / (a * a) + hkk) / 2;
    if (asr > -100) bvn = a * Math.exp(asr) * (1 - c * (bs - a * a) * (1 - d * bs / 5) / 3 + c * d * a * a * a * a / 5);
    if (hkk < 100) { const bb = Math.sqrt(bs); bvn -= Math.exp(-hkk / 2) * Math.sqrt(2 * Math.PI) * phi(-bb / a) * bb * (1 - c * bs * (1 - d * bs / 5) / 3); }
    const aHalf = a / 2;
    for (let i = 0; i < lg; i++) for (const sgn of [-1, 1]) {
      const xs = (aHalf * (sgn * x[i] + 1)) ** 2, rs = Math.sqrt(1 - xs);
      const asr2 = -(bs / xs + hkk) / 2;
      if (asr2 > -100) bvn += aHalf * w[i] * Math.exp(asr2) * (Math.exp(-hkk * xs / (2 * (1 + rs) * (1 + rs))) / rs - (1 + c * xs * (1 + d * xs)));
    }
    bvn = -bvn / (2 * Math.PI);
    if (r > 0) bvn += phi(-Math.max(h, kk));
    else { bvn = -bvn; if (kk > h) bvn += phi(kk) - phi(h); }
  }
  return Math.max(0, Math.min(1, bvn));
}
/** Standard bivariate normal CDF P(X<=h, Y<=k), correlation r. */
const bvncdf = (h: number, k: number, r: number): number => bvnu(-h, -k, r);
/** Cholesky lower factor of a symmetric positive-definite matrix (row-major arrays). */
function chol_(S: number[][]): number[][] {
  const d = S.length, L = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) for (let j = 0; j <= i; j++) {
    let s = S[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    L[i][j] = i === j ? Math.sqrt(s) : s / L[j][j];
  }
  return L;
}
/** Correlation matrix + standardized upper limits from covariance Sigma and bounds b (mean 0). */
function toCorr(Sigma: number[][], b: number[]): { R: number[][]; z: number[] } {
  const d = b.length, sd = Sigma.map((row, i) => Math.sqrt(row[i]));
  const R = Sigma.map((row, i) => row.map((v, j) => v / (sd[i] * sd[j])));
  return { R, z: b.map((v, i) => v / sd[i]) };
}
/** P(X<=b) for X~N(0,Sigma), via Genz separation-of-variables (deterministic Gauss-Legendre on
 *  the (d-1)-cube). d=1 → normal cdf; d=2 → exact bvncdf; d>=3 → nested quadrature. */
function mvncdfG(Sigma: number[][], b: number[]): number {
  const d = b.length;
  if (d === 1) return normcdfS(b[0], 0, Math.sqrt(Sigma[0][0]));
  if (d === 2) { const { R, z } = toCorr(Sigma, b); return bvncdf(z[0], z[1], R[0][1]); }
  const C = chol_(Sigma);
  // 64-node Gauss-Legendre on [0,1] per inner dimension (transform e ~ U via Phi)
  const { nodes, wts } = gaussLegendre01(48);
  const Phi = (x: number) => 0.5 * erfc(-x / Math.SQRT2);
  // recursive: integrate over y_1..y_{d-1}, last factor closed-form
  const rec = (level: number, y: number[]): number => {
    // upper bound for component `level`
    let s = b[level]; for (let k = 0; k < level; k++) s -= C[level][k] * y[k];
    const lim = s / C[level][level];
    if (level === d - 1) return Phi(lim);
    let acc = 0; const e = Phi(lim);
    for (let g = 0; g < nodes.length; g++) {
      const u = e * nodes[g]; const yk = norminvStd(u);
      acc += wts[g] * rec(level + 1, [...y, yk]);
    }
    return e * acc;
  };
  return rec(0, []);
}
/** P(T<=b) for T~multivariate t with correlation R and nu dof, via the scale-mixture
 *  T = Z/sqrt(W/nu), Z~N(0,R), W~chi2_nu: P = ∫ Phi_R(b·sqrt(w/nu)) f_chi2(w) dw. */
function mvtcdfG(R: number[][], b: number[], nu: number): number {
  const d = b.length;
  // integrate over s where w = nu*s^2 isn't needed; integrate in w with a change of variable.
  // Use w = nu * exp(t) won't be finite-bounded; instead Gauss-Legendre over a generous w-range.
  const { nodes, wts } = gaussLegendre01(96);
  // map u in (0,1) -> w via inverse-chi2 CDF for good resolution
  let acc = 0;
  for (let g = 0; g < nodes.length; g++) {
    const u = nodes[g];
    const w = chi2invS(u, nu);            // sample point of W by its own quantile
    const s = Math.sqrt(w / nu);
    const bb = b.map((v) => v * s);
    acc += wts[g] * mvncdfG(R, bb);       // E over W (uniform-quantile average = expectation)
  }
  return Math.max(0, Math.min(1, acc));
}
/** One-way ANOVA F-test p-value for values x grouped by integer label g. */
function anova1P(x: number[], g: number[]): number {
  const byLab = new Map<number, number[]>();
  x.forEach((v, i) => { if (!byLab.has(g[i])) byLab.set(g[i], []); byLab.get(g[i])!.push(v); });
  const groups = [...byLab.values()]; const k = groups.length, N = x.length;
  const gm = x.reduce((s, v) => s + v, 0) / N;
  let SSB = 0, SSW = 0;
  for (const grp of groups) { const m0 = mean_(grp); SSB += grp.length * (m0 - gm) ** 2; for (const v of grp) SSW += (v - m0) ** 2; }
  const dfB = k - 1, dfW = N - k, F = (SSB / dfB) / (SSW / dfW);
  return fUpperTail(F, dfB, dfW);
}
/** Solve L·z = x (forward substitution; L lower-triangular). */
function solveLowerT(L: number[][], x: number[]): number[] {
  const d = x.length, z = new Array(d).fill(0);
  for (let i = 0; i < d; i++) { let s = x[i]; for (let k = 0; k < i; k++) s -= L[i][k] * z[k]; z[i] = s / L[i][i]; }
  return z;
}
/** Build a d×d correlation matrix from a scalar (2×2) or a full matrix value. */
function corrMat(v: Value, d: number): number[][] {
  const M = m(v);
  if (numel(M) === 1) { const r = asScalar(M); return [[1, r], [r, 1]]; }
  return matRows(M);
}
/** Rectangle probability P(xl<=X<=xu) for X~N(mu,Sigma) by inclusion-exclusion over corners. */
function mvnRect(xl: number[], xu: number[], mu: number[], S: number[][]): number {
  const d = xu.length; let sum = 0;
  for (let mask = 0; mask < (1 << d); mask++) {
    let sign = 1; const b = new Array(d);
    for (let i = 0; i < d; i++) { if (mask & (1 << i)) { b[i] = xl[i] - mu[i]; sign = -sign; } else b[i] = xu[i] - mu[i]; }
    sum += sign * mvncdfG(S, b);
  }
  return Math.max(0, Math.min(1, sum));
}
/** Rectangle probability for multivariate t (correlation C, nu dof). */
function mvtRect(xl: number[], xu: number[], C: number[][], nu: number): number {
  const d = xu.length; let sum = 0;
  for (let mask = 0; mask < (1 << d); mask++) {
    let sign = 1; const b = new Array(d);
    for (let i = 0; i < d; i++) { if (mask & (1 << i)) { b[i] = xl[i]; sign = -sign; } else b[i] = xu[i]; }
    sum += sign * mvtcdfG(C, b, nu);
  }
  return Math.max(0, Math.min(1, sum));
}
/** Gauss-Legendre nodes/weights mapped to [0,1]. */
function gaussLegendre01(n: number): { nodes: number[]; wts: number[] } {
  // Golub-Welsch via Newton on Legendre polynomials.
  const nodes: number[] = [], wts: number[] = [];
  for (let i = 1; i <= n; i++) {
    let x = Math.cos(Math.PI * (i - 0.25) / (n + 0.5)), dp = 0;
    for (let it = 0; it < 100; it++) {
      let p0 = 1, p1 = x;
      for (let k = 2; k <= n; k++) { const p2 = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p2; }
      dp = n * (x * p1 - p0) / (x * x - 1);
      const dx = p1 / dp; x -= dx; if (Math.abs(dx) < 1e-15) break;
    }
    nodes.push((x + 1) / 2); wts.push(1 / ((1 - x * x) * dp * dp));
  }
  return { nodes, wts };
}

/** Brent's method root-finder on a bracket [a,b] with f(a)·f(b)<0. */
function brent(f: (x: number) => number, a: number, b: number, tol = 1e-9): number {
  let fa = f(a), fb = f(b);
  if (fa === 0) return a; if (fb === 0) return b;
  if (fa * fb > 0) return NaN;
  let c = a, fc = fa, d = b - a, e = d;
  for (let it = 0; it < 200; it++) {
    if (fb * fc > 0) { c = a; fc = fa; d = b - a; e = d; }
    if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
    const tol1 = 2 * Number.EPSILON * Math.abs(b) + 0.5 * tol, xm = 0.5 * (c - b);
    if (Math.abs(xm) <= tol1 || fb === 0) return b;
    if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa; let p: number, q: number;
      if (a === c) { p = 2 * xm * s; q = 1 - s; }
      else { const qq = fa / fc, r = fb / fc; p = s * (2 * xm * qq * (qq - r) - (b - a) * (r - 1)); q = (qq - 1) * (r - 1) * (s - 1); }
      if (p > 0) q = -q; p = Math.abs(p);
      if (2 * p < Math.min(3 * xm * q - Math.abs(tol1 * q), Math.abs(e * q))) { e = d; d = p / q; }
      else { d = xm; e = d; }
    } else { d = xm; e = d; }
    a = b; fa = fb;
    b += Math.abs(d) > tol1 ? d : (xm > 0 ? tol1 : -tol1);
    fb = f(b);
  }
  return b;
}
/** Jacobi eigensolver for a real symmetric matrix; returns eigenvalues d and eigenvectors V (columns). */
function symEig(Ain: number[][]): { d: number[]; V: number[][] } {
  const n = Ain.length; const A = Ain.map((r) => r.slice());
  const V: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0; for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  return { d: A.map((_, i) => A[i][i]), V };
}
const froNorm = (M: number[][]) => Math.sqrt(M.reduce((s, r) => s + r.reduce((t, x) => t + x * x, 0), 0));
/** Project a symmetric matrix onto the PSD cone (clip negative eigenvalues to 0). */
function projPSD(M: number[][]): number[][] {
  const n = M.length; const { d, V } = symEig(M);
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let s = 0; for (let k = 0; k < n; k++) if (d[k] > 0) s += V[i][k] * d[k] * V[j][k]; out[i][j] = s; }
  return out;
}
/** Ansari-Bradley positional scores for a sorted vector z: min(i,N+1−i) averaged over ties. */
function abScores(z: number[]): number[] {
  const N = z.length, raw = z.map((_, i) => Math.min(i + 1, N - i)), out = new Array<number>(N);
  for (let i = 0; i < N;) { let j = i; while (j + 1 < N && z[j + 1] === z[i]) j++; let s = 0; for (let k = i; k <= j; k++) s += raw[k]; const avg = s / (j - i + 1); for (let k = i; k <= j; k++) out[k] = avg; i = j + 1; }
  return out;
}

export const STATS: ToolboxModule = {
  id: 'stats',
  name: 'Statistics and Machine Learning Toolbox',
  docBase: 'https://www.mathworks.com/help/stats/',
  builtins: {
    tiedrank: (a, nargout) => Promise.resolve(tiedrankImpl(a, nargout)),
    partialcorr: (a) => ret(partialcorrImpl(a)),
    // ── pcacov(C): PCA on a covariance matrix → [coeff, latent, explained] ──
    pcacov: (a, nargout) => {
      const C = m(a[0]), d = C.rows; const { U, T } = schur(C);
      const ev = Array.from({ length: d }, (_, i) => ({ val: T.data[i + i * d], vec: Array.from({ length: d }, (_, r) => U.data[r + i * d]) }));
      ev.sort((p, q) => q.val - p.val);
      for (const e of ev) { let mi = 0; for (let r = 1; r < d; r++) if (Math.abs(e.vec[r]) > Math.abs(e.vec[mi])) mi = r; if (e.vec[mi] < 0) e.vec = e.vec.map((v) => -v); }
      const coeff = new Float64Array(d * d); for (let i = 0; i < d; i++) for (let r = 0; r < d; r++) coeff[r + i * d] = ev[i].vec[r];
      const latent = ev.map((e) => e.val), tot = latent.reduce((s, v) => s + v, 0);
      return Promise.resolve([mat(d, d, coeff), colVec(latent), colVec(latent.map((v) => 100 * v / tot))].slice(0, Math.max(1, nargout)));
    },
    // ── tabulate(x): frequency table [value, count, percent]; 1..max for positive integers ──
    tabulate: (a) => {
      const x = toArray(m(a[0])), N = x.length;
      const allPosInt = x.every((v) => v > 0 && Number.isInteger(v));
      const vals = allPosInt ? Array.from({ length: Math.max(...x) }, (_, i) => i + 1) : [...new Set(x)].sort((p, q) => p - q);
      const data = new Float64Array(vals.length * 3);
      for (let i = 0; i < vals.length; i++) { const c = x.filter((v) => v === vals[i]).length; data[i] = vals[i]; data[i + vals.length] = c; data[i + 2 * vals.length] = 100 * c / N; }
      return ret(mat(vals.length, 3, data));
    },
    // ── grp2idx(s): group indices + sorted string labels (numeric input) ──
    grp2idx: (a, nargout) => {
      const x = toArray(m(a[0]));
      const uniq = [...new Set(x)].sort((p, q) => p - q);
      const idx = new Map(uniq.map((v, i) => [v, i + 1]));
      const g = colVec(x.map((v) => idx.get(v)!));
      if (nargout < 2) return ret(g);
      const labels = makeCell(uniq.length, 1, uniq.map((v) => str(String(v))));
      return Promise.resolve(nargout >= 3 ? [g, labels, makeCell(uniq.length, 1, uniq.map((v) => str(String(v))))] : [g, labels]);
    },
    // ── crosstab(v1,v2): cross-tabulation count matrix ──
    crosstab: (a) => {
      const x1 = toArray(m(a[0])), x2 = toArray(m(a[1]));
      const u1 = [...new Set(x1)].sort((p, q) => p - q), u2 = [...new Set(x2)].sort((p, q) => p - q);
      const i1 = new Map(u1.map((v, i) => [v, i])), i2 = new Map(u2.map((v, i) => [v, i]));
      const r = u1.length, c = u2.length, data = new Float64Array(r * c);
      for (let k = 0; k < x1.length; k++) data[i1.get(x1[k])! + i2.get(x2[k])! * r]++;
      return ret(mat(r, c, data));
    },
    // ── x2fx(X[,model]): design matrix. model = linear|interaction|quadratic|purequadratic ──
    x2fx: (a) => {
      const X = m(a[0]), p = X.cols;
      const isText = a.length > 1 && (isStr(a[1]) || (isMat(a[1]) && (a[1] as Mat).isChar));
      const model = isText ? asString(a[1]).toLowerCase() : 'linear';
      const inter = model === 'interaction' || model === 'quadratic';
      const square = model === 'quadratic' || model === 'purequadratic';
      const rows = matRows(X).map((v) => {
        const t = [1, ...v];
        if (inter) for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) t.push(v[i] * v[j]);
        if (square) for (let i = 0; i < p; i++) t.push(v[i] * v[i]);
        return t;
      });
      const nc = rows[0].length, data = new Float64Array(X.rows * nc);
      for (let r = 0; r < X.rows; r++) for (let c = 0; c < nc; c++) data[r + c * X.rows] = rows[r][c];
      return ret(mat(X.rows, nc, data));
    },
    // ── geometric inverse cdf: smallest k with cdf≥p ──
    geoinv: (a) => dist(a, [0.5], (p, P) => {
      if (P <= 0 || P > 1 || p < 0 || p > 1) return NaN;
      if (p <= 0) return 0; if (p >= 1) return Infinity;
      return Math.max(0, Math.ceil(Math.log(1 - p) / Math.log(1 - P) - 1e-12) - 1);
    }),
    // ── multinomial pdf: n!/∏xᵢ! · ∏pᵢ^xᵢ (row-wise for N×k count matrices) ──
    mnpdf: (a) => {
      const X = m(a[0]), P = toArray(m(a[1]));
      const rows = X.rows === 1 ? [toArray(X)] : matRows(X);
      const out = rows.map((x) => {
        const n = x.reduce((s, v) => s + v, 0);
        let lg = logGamma(n + 1); for (let i = 0; i < x.length; i++) lg += x[i] * Math.log(P[i]) - logGamma(x[i] + 1);
        return Math.exp(lg);
      });
      return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
    },
    // ── ff2n(n): full two-level factorial design, 2^n × n (column 1 = MSB) ──
    ff2n: (a) => {
      const n = Math.round(asScalar(a[0])), rows = 2 ** n, data = new Float64Array(rows * n);
      for (let i = 0; i < rows; i++) for (let j = 0; j < n; j++) data[i + j * rows] = (i >> (n - 1 - j)) & 1;
      return ret(mat(rows, n, data));
    },
    // ── fullfact(levels): full factorial design (first factor varies fastest) ──
    fullfact: (a) => {
      const lv = toArray(m(a[0])).map(Math.round), k = lv.length, total = lv.reduce((x, y) => x * y, 1);
      const data = new Float64Array(total * k);
      for (let i = 0; i < total; i++) { let idx = i; for (let j = 0; j < k; j++) { data[i + j * total] = (idx % lv[j]) + 1; idx = Math.floor(idx / lv[j]); } }
      return ret(mat(total, k, data));
    },
    // ── hougen(beta,x): Hougen-Watson reaction-rate model (row-wise for N×3 X) ──
    hougen: (a) => {
      const b = toArray(m(a[0])), X = m(a[1]);
      const rows = X.rows === 1 ? [toArray(X)] : matRows(X);
      const out = rows.map((x) => (b[0] * x[1] - x[2] / b[4]) / (1 + b[1] * x[0] + b[2] * x[1] + b[3] * x[2]));
      return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
    },
    // ── combnk(v,k): all k-combinations of v (MATLAB order = reverse-lexicographic) ──
    combnk: (a) => {
      const v = toArray(m(a[0])), k = Math.round(asScalar(a[1])), combos: number[][] = [];
      const rec = (start: number, cur: number[]) => { if (cur.length === k) { combos.push(cur.map((i) => v[i])); return; } for (let i = start; i < v.length; i++) rec(i + 1, [...cur, i]); };
      rec(0, []); combos.reverse();
      const data = new Float64Array(combos.length * k);
      for (let r = 0; r < combos.length; r++) for (let c = 0; c < k; c++) data[r + c * combos.length] = combos[r][c];
      return ret(mat(combos.length, k, data));
    },
    // ── mvtpdf(X,C,df): multivariate Student-t density (correlation matrix C) ──
    mvtpdf: (a) => {
      const X = m(a[0]), C = m(a[1]), nu = asScalar(a[2]), d = C.rows;
      const Ci = inv(C), detC = det(C);
      const rows = X.rows === 1 && X.cols === d ? [toArray(X)] : matRows(X);
      const coef = logGamma((nu + d) / 2) - logGamma(nu / 2) - (d / 2) * Math.log(nu * Math.PI) - 0.5 * Math.log(detC);
      const out = rows.map((x) => {
        let q = 0; for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) q += x[i] * Ci.data[i + j * d] * x[j];
        return Math.exp(coef - ((nu + d) / 2) * Math.log(1 + q / nu));
      });
      return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
    },
    // ── hypothesis tests ──
    /** [h,p,ci,stats]=ttest(x[,m][,'Alpha',a][,'Tail',t]) — one-sample/paired t-test. */
    ttest: (a, nargout) => {
      let x = toArray(m(a[0])).filter((v) => !Number.isNaN(v)); let mu0 = 0; const opts = a.slice(1);
      // second positional arg: scalar mean, or a paired vector (same length → x-m)
      let oi = 0;
      if (opts.length && isMat(opts[0]) && !(opts[0] as Mat).isChar) { const M = m(opts[0]); if (numel(M) === 1) mu0 = asScalar(M); else { const mm = toArray(M); x = toArray(m(a[0])).map((v, i) => v - mm[i]).filter((v) => !Number.isNaN(v)); } oi = 1; }
      let alpha = 0.05, tail = 0;
      for (let i = oi; i < opts.length; i++) { const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : ''; if (s === 'alpha') alpha = asScalar(opts[++i]); else if (s === 'tail') tail = tailCode(opts[++i]); else if (i === oi && isMat(opts[i]) && !(opts[i] as Mat).isChar) { alpha = asScalar(opts[i]); if (opts[i + 1] !== undefined) tail = tailCode(opts[++i]); } }
      const n = x.length, df = Math.max(n - 1, 0), xbar = mean_(x), sd = sd_(x), ser = sd / Math.sqrt(n), tval = (xbar - mu0) / ser;
      let p: number, ci: [number, number];
      if (tail === 0) { p = 2 * tcdfL(-Math.abs(tval), df); const c = tinvL(1 - alpha / 2, df) * ser; ci = [xbar - c, xbar + c]; }
      else if (tail === 1) { p = tcdfL(-tval, df); ci = [xbar - tinvL(1 - alpha, df) * ser, Infinity]; }
      else { p = tcdfL(tval, df); ci = [-Infinity, xbar + tinvL(1 - alpha, df) * ser]; }
      const h = p <= alpha ? 1 : 0;
      const stats = mkStruct([['tstat', scalar(tval)], ['df', scalar(df)], ['sd', scalar(sd)]]);
      return Promise.resolve([scalar(h), scalar(p), rowVec(ci), stats].slice(0, Math.max(1, nargout)));
    },
    /** [h,p,ci,stats]=ttest2(x,y[,'Alpha',a][,'Tail',t][,'Vartype',v]) — two-sample t-test. */
    ttest2: (a, nargout) => {
      const x = toArray(m(a[0])).filter((v) => !Number.isNaN(v)), y = toArray(m(a[1])).filter((v) => !Number.isNaN(v));
      let alpha = 0.05, tail = 0, vartype = 1; const opts = a.slice(2);
      for (let i = 0; i < opts.length; i++) { const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : ''; if (s === 'alpha') alpha = asScalar(opts[++i]); else if (s === 'tail') tail = tailCode(opts[++i]); else if (s === 'vartype') vartype = asString(opts[++i]).toLowerCase().startsWith('un') ? 2 : 1; else if (i === 0 && isMat(opts[i]) && !(opts[i] as Mat).isChar) { alpha = asScalar(opts[i]); if (opts[i + 1] !== undefined) tail = tailCode(opts[++i]); } }
      const nx = x.length, ny = y.length, s2x = var_(x), s2y = var_(y), diff = mean_(x) - mean_(y);
      let dfe: number, se: number;
      if (vartype === 1) { dfe = nx + ny - 2; const sp = Math.sqrt(((nx - 1) * s2x + (ny - 1) * s2y) / dfe); se = sp * Math.sqrt(1 / nx + 1 / ny); }
      else { const ax = s2x / nx, ay = s2y / ny; dfe = (ax + ay) ** 2 / (ax * ax / (nx - 1) + ay * ay / (ny - 1)); se = Math.sqrt(ax + ay); }
      const ratio = diff / se;
      let p: number, ci: [number, number];
      if (tail === 0) { p = 2 * tcdfL(-Math.abs(ratio), dfe); const c = tinvL(1 - alpha / 2, dfe) * se; ci = [diff - c, diff + c]; }
      else if (tail === 1) { p = tcdfL(-ratio, dfe); ci = [diff - tinvL(1 - alpha, dfe) * se, Infinity]; }
      else { p = tcdfL(ratio, dfe); ci = [-Infinity, diff + tinvL(1 - alpha, dfe) * se]; }
      const h = p <= alpha ? 1 : 0;
      const stats = mkStruct([['tstat', scalar(ratio)], ['df', scalar(dfe)], ['sd', scalar(se)]]);
      return Promise.resolve([scalar(h), scalar(p), rowVec(ci), stats].slice(0, Math.max(1, nargout)));
    },
    /** [p,h,stats]=ranksum(x,y[,'Alpha',a][,'Tail',t][,'Method',m]) — Wilcoxon rank-sum test. */
    ranksum: (a, nargout) => {
      const x = toArray(m(a[0])).filter((v) => !Number.isNaN(v)), y = toArray(m(a[1])).filter((v) => !Number.isNaN(v));
      let alpha = 0.05, tail = 0, method = ''; const opts = a.slice(2);
      for (let i = 0; i < opts.length; i++) { const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : ''; if (s === 'alpha') alpha = asScalar(opts[++i]); else if (s === 'tail') tail = tailCode(opts[++i]); else if (s === 'method') method = asString(opts[++i]).toLowerCase(); else if (i === 0 && isMat(opts[i]) && !(opts[i] as Mat).isChar) alpha = asScalar(opts[i]); }
      const nx = x.length, ny = y.length, ns = Math.min(nx, ny), n = nx + ny;
      const sameOrder = nx <= ny; const sm = sameOrder ? x : y, lg = sameOrder ? y : x;
      const { ranks, tieadj } = tiedrank([...sm, ...lg]); const w = ranks.slice(0, ns).reduce((s, r) => s + r, 0);
      if (!method) method = (ns < 10 && n < 20) ? 'exact' : 'approximate';
      let p: number, z = NaN;
      if (method === 'exact') {
        const { counts, scale, total } = rankSumDist(ranks, ns); const ws = Math.round(w * scale);
        const pLE = counts.slice(0, ws + 1).reduce((s, c) => s + c, 0) / total, pGE = counts.slice(ws).reduce((s, c) => s + c, 0) / total;
        if (tail === 0) p = Math.min(1, 2 * Math.min(pLE, pGE)); else if (tail === 1) p = sameOrder ? pGE : pLE; else p = sameOrder ? pLE : pGE;
      } else {
        const wmean = ns * (n + 1) / 2, tiescor = 2 * tieadj / (n * (n - 1)), wvar = nx * ny * ((n + 1) - tiescor) / 12, wc = w - wmean;
        if (tail === 0) { z = (wc - 0.5 * Math.sign(wc)) / Math.sqrt(wvar); if (!sameOrder) z = -z; p = 2 * normcdfL(-Math.abs(z)); }
        else if (tail === 1) { z = sameOrder ? (wc - 0.5) / Math.sqrt(wvar) : -(wc + 0.5) / Math.sqrt(wvar); p = normcdfL(-z); }
        else { z = sameOrder ? (wc + 0.5) / Math.sqrt(wvar) : -(wc - 0.5) / Math.sqrt(wvar); p = normcdfL(z); }
      }
      const h = p <= alpha ? 1 : 0; const ranksumStat = sameOrder ? w : ranks.slice(ns).reduce((s, r) => s + r, 0);
      const stats = mkStruct([['ranksum', scalar(ranksumStat)], ['zval', Number.isNaN(z) ? undefined : scalar(z)]]);
      return Promise.resolve([scalar(p), scalar(h), stats].slice(0, Math.max(1, nargout)));
    },
    /** [p,h,stats]=signrank(x[,y][,'Alpha',a][,'Tail',t][,'Method',m]) — Wilcoxon signed-rank test. */
    signrank: (a, nargout) => {
      const x = toArray(m(a[0]));
      let yArg: number[] | null = null; const opts: Value[] = [];
      if (a.length >= 2 && isMat(a[1]) && !(a[1] as Mat).isChar) { const M = m(a[1]); yArg = numel(M) === 1 ? x.map(() => asScalar(M)) : toArray(M); for (let i = 2; i < a.length; i++) opts.push(a[i]); }
      else for (let i = 1; i < a.length; i++) opts.push(a[i]);
      const onesample = yArg === null; const yv = yArg ?? x.map(() => 0);
      let diff = x.map((v, i) => v - yv[i]).filter((v) => !Number.isNaN(v));
      const epsd = (v: number) => (onesample ? 0 : 2 * Number.EPSILON * Math.max(1, Math.abs(v)));
      diff = diff.filter((d) => Math.abs(d) > epsd(d));
      let alpha = 0.05, tail = 0, method = '';
      for (let i = 0; i < opts.length; i++) { const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : ''; if (s === 'alpha') alpha = asScalar(opts[++i]); else if (s === 'tail') tail = tailCode(opts[++i]); else if (s === 'method') method = asString(opts[++i]).toLowerCase(); else if (i === 0 && isMat(opts[i]) && !(opts[i] as Mat).isChar) alpha = asScalar(opts[i]); }
      const n = diff.length;
      if (n === 0) return Promise.resolve([scalar(1), scalar(0), mkStruct([['signedrank', scalar(0)]])].slice(0, Math.max(1, nargout)));
      if (!method) method = n <= 15 ? 'exact' : 'approximate';
      const { ranks, tieadj } = tiedrank(diff.map(Math.abs)); const w = ranks.filter((_, i) => diff[i] > 0).reduce((s, r) => s + r, 0);
      let p: number, z = NaN;
      if (method === 'exact') {
        const { counts, scale, total } = signedRankDist(ranks); const ws = Math.round(w * scale);
        const pLE = counts.slice(0, ws + 1).reduce((s, c) => s + c, 0) / total, pGE = counts.slice(ws).reduce((s, c) => s + c, 0) / total;
        if (tail === 0) p = Math.min(1, 2 * Math.min(pLE, pGE)); else if (tail === 1) p = pGE; else p = pLE;
      } else {
        const mu = n * (n + 1) / 4, sig = Math.sqrt((n * (n + 1) * (2 * n + 1) - tieadj) / 24);
        if (tail === 0) { z = (w - mu) / sig; p = 2 * normcdfL(-Math.abs(z)); }
        else if (tail === 1) { z = (w - mu - 0.5) / sig; p = normcdfL(-z); }
        else { z = (w - mu + 0.5) / sig; p = normcdfL(z); }
      }
      const h = p <= alpha ? 1 : 0;
      const stats = mkStruct([['signedrank', scalar(w)], ['zval', Number.isNaN(z) ? undefined : scalar(z)]]);
      return Promise.resolve([scalar(p), scalar(h), stats].slice(0, Math.max(1, nargout)));
    },
    /** [h,p,stats]=ansaribradley(x,y[,'Alpha',a][,'Tail',t][,'Method',m]) — Ansari-Bradley
     *  dispersion test. Exact conditional null distribution (enumerated by DP) when N≤25 or
     *  'exact' requested, otherwise the W* normal approximation. */
    ansaribradley: (a, nargout) => {
      const xv = toArray(m(a[0])).filter((v) => !Number.isNaN(v));
      const yv = toArray(m(a[1])).filter((v) => !Number.isNaN(v));
      let alpha = 0.05, tail = 0, doexact: boolean | null = null; const opts = a.slice(2);
      for (let i = 0; i < opts.length; i++) {
        const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : '';
        if (s === 'alpha') alpha = asScalar(opts[++i]);
        else if (s === 'tail') tail = tailCode(opts[++i]);
        else if (s === 'method') { const mm = asString(opts[++i]).toLowerCase(); doexact = mm.startsWith('on') || mm.startsWith('e'); }
        else if (i === 0 && isMat(opts[i]) && !(opts[i] as Mat).isChar) { alpha = asScalar(opts[i]); if (opts[i + 1] !== undefined) tail = tailCode(opts[++i]); }
      }
      const nxv = xv.length, nyv = yv.length, N = nxv + nyv;
      if (doexact === null) doexact = N <= 25;
      // sort combined sample, track group membership, compute AB scores
      const z = [...xv.map((v) => [v, 1] as [number, number]), ...yv.map((v) => [v, 2] as [number, number])];
      z.sort((p1, p2) => p1[0] - p2[0]);
      const scores = abScores(z.map((p1) => p1[0]));
      const W = z.reduce((s, p1, i) => s + (p1[1] === 1 ? scores[i] : 0), 0);
      // W* normal statistic
      const mm = nxv, nn = nyv, sumsq = scores.reduce((s, r) => s + r * r, 0);
      let meanW: number, stdW: number;
      if (N % 2 === 0) { meanW = mm * (N + 2) / 4; stdW = Math.sqrt(mm * nn * (16 * sumsq - N * (N + 2) ** 2) / (16 * N * (N - 1))); }
      else { meanW = mm * (N + 1) ** 2 / (4 * N); stdW = Math.sqrt(mm * nn * (16 * N * sumsq - (N + 1) ** 4) / (16 * N * N * (N - 1))); }
      const Wstar = stdW > 0 ? (W - meanW) / stdW : (W === meanW ? NaN : Math.sign(W - meanW) * Infinity);
      // conditional p-values [P(W<obs), P(W=obs), P(W>obs)]
      let pl: number, pe: number, pg: number;
      if (mm === 0 || nn === 0) { pl = pe = pg = NaN; }
      else if (doexact) {
        const scale = scores.some((r) => r !== Math.round(r)) ? 2 : 1;
        const r = scores.map((v) => Math.round(v * scale)); const maxS = r.reduce((s, v) => s + v, 0);
        const dp = Array.from({ length: mm + 1 }, () => new Float64Array(maxS + 1)); dp[0][0] = 1;
        for (const ri of r) for (let j = mm; j >= 1; j--) for (let su = maxS; su >= ri; su--) dp[j][su] += dp[j - 1][su - ri];
        let total = 0; for (const c of dp[mm]) total += c;
        const Ws = Math.round(W * scale);
        let less = 0, eq = 0, gr = 0;
        for (let su = 0; su <= maxS; su++) { if (su < Ws) less += dp[mm][su]; else if (su === Ws) eq += dp[mm][su]; else gr += dp[mm][su]; }
        pl = less / total; pe = eq / total; pg = gr / total;
      } else { const pn = normcdfL(-Math.abs(Wstar)); pe = 0; if (Wstar < 0) { pl = pn; pg = 1 - pn; } else { pl = 1 - pn; pg = pn; } }
      let p: number;
      if (tail === 0) p = Math.min(1, 2 * (pe + Math.min(pl, pg)));
      else if (tail === 1) p = pe + pl;
      else p = pe + pg;
      const h = Number.isNaN(p) ? NaN : (p <= alpha ? 1 : 0);
      const stats = mkStruct([['W', scalar(W)], ['Wstar', scalar(Wstar)]]);
      return Promise.resolve([scalar(h), scalar(p), stats].slice(0, Math.max(1, nargout)));
    },
    /** [h,p,ksstat]=kstest2(x1,x2[,'Alpha',a][,'Tail',t]) — two-sample Kolmogorov-Smirnov test. */
    kstest2: (a, nargout) => {
      const x1 = toArray(m(a[0])).filter((v) => !Number.isNaN(v)), x2 = toArray(m(a[1])).filter((v) => !Number.isNaN(v));
      let alpha = 0.05, tail = 0; const opts = a.slice(2);
      for (let i = 0; i < opts.length; i++) { const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : ''; if (s === 'alpha') alpha = asScalar(opts[++i]); else if (s === 'tail') tail = tailCode(opts[++i]); else if (i === 0 && isMat(opts[i]) && !(opts[i] as Mat).isChar) { alpha = asScalar(opts[i]); if (opts[i + 1] !== undefined) tail = tailCode(opts[++i]); } }
      const pts = [...x1, ...x2].slice().sort((p, q) => p - q), n1 = x1.length, n2 = x2.length;
      let ks = 0;
      for (const e of pts) { const f1 = x1.filter((v) => v <= e).length / n1, f2 = x2.filter((v) => v <= e).length / n2; const dlt = tail === 0 ? Math.abs(f1 - f2) : tail === -1 ? f2 - f1 : f1 - f2; if (dlt > ks) ks = dlt; }
      const n = n1 * n2 / (n1 + n2), lambda = Math.max((Math.sqrt(n) + 0.12 + 0.11 / Math.sqrt(n)) * ks, 0);
      let p: number;
      if (tail !== 0) p = Math.exp(-2 * lambda * lambda);
      else { p = 0; for (let j = 1; j <= 101; j++) p += (j % 2 ? 1 : -1) * Math.exp(-2 * lambda * lambda * j * j); p = Math.min(Math.max(2 * p, 0), 1); }
      const h = alpha >= p ? 1 : 0;
      return Promise.resolve([scalar(h), scalar(p), scalar(ks)].slice(0, Math.max(1, nargout)));
    },
    /** [h,p,ksstat,cv]=kstest(x[,'CDF',F][,'Alpha',a][,'Tail',t]) — one-sample KS test.
     *  Default hypothesized CDF is the standard normal. p-value is the exact KS
     *  distribution (Marsaglia–Tsang–Wang for two-sided; Birnbaum–Tingey one-sided). */
    kstest: (a, nargout) => {
      const x = toArray(m(a[0])).filter((v) => !Number.isNaN(v)).slice().sort((p, q) => p - q);
      const n = x.length;
      let alpha = 0.05, tail = 0; let cdfTab: [number[], number[]] | null = null;
      // kstest uses 'unequal'(0)/'larger'(+1, D+)/'smaller'(−1, D−) — not left/right.
      const ksTail = (v: Value): number => { if (isMat(v) && !(v as Mat).isChar) { const t = asScalar(v); return t === 1 || t === -1 ? t : 0; } const s = asString(v).toLowerCase(); return s.startsWith('la') ? 1 : s.startsWith('sm') ? -1 : 0; };
      const opts = a.slice(1);
      for (let i = 0; i < opts.length; i++) {
        const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : '';
        if (s === 'alpha') alpha = asScalar(opts[++i]);
        else if (s === 'tail') tail = ksTail(opts[++i]);
        else if (s === 'cdf') { const M = matRows(m(opts[++i])); cdfTab = [M.map((r) => r[0]), M.map((r) => r[1])]; }
      }
      // Theoretical CDF at the sorted data: standard normal by default, else interp the supplied [x F] table.
      const F = (v: number): number => {
        if (!cdfTab) return normcdfL(v);
        const [xs, fs] = cdfTab; if (v <= xs[0]) return fs[0]; if (v >= xs[xs.length - 1]) return fs[fs.length - 1];
        let k = 0; while (k < xs.length - 1 && xs[k + 1] < v) k++;
        const t = (v - xs[k]) / (xs[k + 1] - xs[k]); return fs[k] + t * (fs[k + 1] - fs[k]);
      };
      let dPlus = 0, dMinus = 0; // D+ = max(i/n − F), D− = max(F − (i−1)/n)
      for (let i = 0; i < n; i++) { const fi = F(x[i]); dPlus = Math.max(dPlus, (i + 1) / n - fi); dMinus = Math.max(dMinus, fi - i / n); }
      const ks = tail === 0 ? Math.max(dPlus, dMinus) : tail === 1 ? dPlus : dMinus;
      const p = Math.min(1, Math.max(0, tail === 0 ? 1 - ksExactCDF(n, ks) : ksOneSidedSF(n, ks)));
      const h = p <= alpha ? 1 : 0;
      // Critical value: invert the exact CDF at 1−alpha.
      const cv = tail === 0 ? invCdf(1 - alpha, (d) => ksExactCDF(n, d), 0, 1) : invCdf(1 - alpha, (d) => 1 - ksOneSidedSF(n, d), 0, 1);
      return Promise.resolve([scalar(h), scalar(p), scalar(ks), scalar(cv)].slice(0, Math.max(1, nargout)));
    },
    /** [h,p,ci,stats]=vartest(x,v) — chi-square test that x is normal with variance v. */
    vartest: (a, nargout) => {
      const x = toArray(m(a[0])).filter((v) => !Number.isNaN(v)); const v0 = asScalar(m(a[1]));
      let alpha = 0.05, tail = 0; const opts = a.slice(2);
      for (let i = 0; i < opts.length; i++) { const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : ''; if (s === 'alpha') alpha = asScalar(opts[++i]); else if (s === 'tail') tail = tailCode(opts[++i]); }
      const n = x.length, df = n - 1, s2 = var_(x), chi = df * s2 / v0, cdf = gammainc(chi / 2, df / 2);
      let p: number;
      if (tail === 0) p = 2 * Math.min(cdf, 1 - cdf); else if (tail === 1) p = 1 - cdf; else p = cdf;
      p = Math.min(1, Math.max(0, p));
      const h = p <= alpha ? 1 : 0;
      const chiInv = (pp: number) => invCdf(pp, (t) => gammainc(t / 2, df / 2), 0, Infinity);
      let ci: [number, number];
      if (tail === 0) ci = [df * s2 / chiInv(1 - alpha / 2), df * s2 / chiInv(alpha / 2)];
      else if (tail === 1) ci = [df * s2 / chiInv(1 - alpha), Infinity];
      else ci = [0, df * s2 / chiInv(alpha)];
      const stats = mkStruct([['chisqstat', scalar(chi)], ['df', scalar(df)]]);
      return Promise.resolve([scalar(h), scalar(p), rowVec(ci), stats].slice(0, Math.max(1, nargout)));
    },
    /** [p,h,stats]=signtest(x[,y][,'Alpha',a][,'Tail',t][,'Method',m]) — sign test. */
    signtest: (a, nargout) => {
      const x = toArray(m(a[0])); let yArg: number[] | null = null; const opts: Value[] = [];
      if (a.length >= 2 && isMat(a[1]) && !(a[1] as Mat).isChar) { const M = m(a[1]); yArg = numel(M) === 1 ? x.map(() => asScalar(M)) : toArray(M); for (let i = 2; i < a.length; i++) opts.push(a[i]); }
      else for (let i = 1; i < a.length; i++) opts.push(a[i]);
      const yv = yArg ?? x.map(() => 0);
      const diff = x.map((v, i) => v - yv[i]).filter((v) => !Number.isNaN(v));
      let alpha = 0.05, tail = 0, method = '';
      for (let i = 0; i < opts.length; i++) { const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : ''; if (s === 'alpha') alpha = asScalar(opts[++i]); else if (s === 'tail') tail = tailCode(opts[++i]); else if (s === 'method') method = asString(opts[++i]).toLowerCase(); else if (i === 0 && isMat(opts[i]) && !(opts[i] as Mat).isChar) alpha = asScalar(opts[i]); }
      const npos = diff.filter((d) => d > 0).length, nneg = diff.filter((d) => d < 0).length, n = npos + nneg;
      if (n === 0) return Promise.resolve([scalar(1), scalar(0), mkStruct([['zval', scalar(NaN)], ['sign', scalar(0)]])].slice(0, Math.max(1, nargout)));
      if (!method) method = n < 100 ? 'exact' : 'approximate';
      let p: number, z = NaN;
      if (method === 'exact') {
        if (tail === 0) p = Math.min(1, 2 * binocdfS(Math.min(nneg, npos), n, 0.5));
        else if (tail === 1) p = binocdfS(nneg, n, 0.5); else p = binocdfS(npos, n, 0.5);
      } else {
        if (tail === 0) { z = (npos - nneg - Math.sign(npos - nneg)) / Math.sqrt(n); p = 2 * normcdfL(-Math.abs(z)); }
        else if (tail === 1) { z = (npos - nneg - 1) / Math.sqrt(n); p = normcdfL(-z); }
        else { z = (npos - nneg + 1) / Math.sqrt(n); p = normcdfL(z); }
      }
      const h = p <= alpha ? 1 : 0;
      const stats = mkStruct([['zval', scalar(z)], ['sign', scalar(npos)]]);
      return Promise.resolve([scalar(p), scalar(h), stats].slice(0, Math.max(1, nargout)));
    },
    /** [p,tbl,stats]=friedman(X,reps[,displayopt]) — Friedman's nonparametric two-way ANOVA. */
    friedman: (a, nargout) => {
      const X = m(a[0]), r0 = X.rows, c = X.cols;
      const reps = a.length > 1 && isMat(a[1]) && numel(m(a[1])) > 0 ? Math.round(asScalar(a[1])) : 1;
      const r = r0 / reps; // number of blocks
      const rk: number[][] = Array.from({ length: r0 }, () => new Array(c).fill(0)); let sumta = 0;
      for (let j = 0; j < r; j++) {
        const block: number[] = []; for (let rr = 0; rr < reps; rr++) for (let cc = 0; cc < c; cc++) block.push(X.data[(j * reps + rr) + cc * r0]);
        const { ranks, tieadj } = tiedrank(block); sumta += 2 * tieadj;
        let idx = 0; for (let rr = 0; rr < reps; rr++) for (let cc = 0; cc < c; cc++) rk[j * reps + rr][cc] = ranks[idx++];
      }
      const grand = rk.flat().reduce((s, v) => s + v, 0) / (r0 * c);
      let sscol = 0; for (let cc = 0; cc < c; cc++) { let cs = 0; for (let rr = 0; rr < r0; rr++) cs += rk[rr][cc]; const cm = cs / r0; sscol += r0 * (cm - grand) ** 2; }
      let sigmasq = c * reps * (reps * c + 1) / 12;
      if (sumta > 0) sigmasq -= sumta / (12 * r * (reps * c - 1));
      const chistat = sscol > 0 ? sscol / sigmasq : 0;
      const p = 1 - chi2cdfS(chistat, c - 1);
      const meanranks: number[] = []; for (let cc = 0; cc < c; cc++) { let cs = 0; for (let rr = 0; rr < r0; rr++) cs += rk[rr][cc]; meanranks.push(cs / r0); }
      const stats = mkStruct([['source', str('friedman')], ['n', scalar(r)], ['meanranks', rowVec(meanranks)], ['sigma', scalar(Math.sqrt(sigmasq))]]);
      return Promise.resolve([scalar(p), makeCell(1, 1, [str('friedman')]), stats].slice(0, Math.max(1, nargout)));
    },
    /** p=vartestn(x,group,'Display','off','TestType',t) — test equal variances across groups. */
    vartestn: (a, nargout) => {
      const x0 = toArray(m(a[0])); let groups: string[]; let testType = 'leveneabsolute';
      const opts: Value[] = [];
      const second = a[1];
      const secondIsOpt = second !== undefined && isMat(second) && (second as Mat).isChar && ['display', 'testtype', 'alpha'].includes(asString(second).toLowerCase());
      if (a.length >= 2 && second !== undefined && !secondIsOpt && !(isMat(second) && numel(m(second)) === 0)) {
        groups = labelKeys(second).keys; for (let i = 2; i < a.length; i++) opts.push(a[i]);
      } else { const M = m(a[0]); groups = []; for (let cc = 0; cc < M.cols; cc++) for (let rr = 0; rr < M.rows; rr++) groups.push(String(cc)); for (let i = 1; i < a.length; i++) opts.push(a[i]); }
      for (let i = 0; i < opts.length; i++) { const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : ''; if (s === 'testtype') testType = asString(opts[++i]).toLowerCase(); else if (s === 'display') i++; else if (s === 'alpha') i++; }
      const map2 = new Map<string, number[]>();
      x0.forEach((v, i) => { if (Number.isNaN(v)) return; const g = groups[i]; if (!map2.has(g)) map2.set(g, []); map2.get(g)!.push(v); });
      const gk = [...map2.keys()]; const gx = gk.map((k) => map2.get(k)!);
      const gcount = gx.map((g) => g.length), gmean = gx.map((g) => mean_(g)), gmedian = gx.map((g) => median_(g));
      const gvar = gx.map((g) => var_(g));
      if (testType === 'bartlett' || testType === 'classical') {
        const df = gcount.map((n) => n - 1), sumdf = df.reduce((s, v) => s + v, 0);
        const vp = df.reduce((s, d, i) => s + d * gvar[i], 0) / sumdf;
        const tpos = df.map((d) => d > 0); const Bdf = Math.max(0, tpos.filter(Boolean).length - 1);
        let B = Math.log(vp) * sumdf - df.reduce((s, d, i) => s + (tpos[i] ? d * Math.log(gvar[i]) : 0), 0);
        const C = 1 + (df.reduce((s, d, i) => s + (tpos[i] ? 1 / d : 0), 0) - 1 / sumdf) / (3 * Bdf);
        B = B / C; const p = 1 - chi2cdfS(B, Bdf);
        return Promise.resolve([scalar(p)].slice(0, Math.max(1, nargout)));
      }
      const transformed: number[] = [], glab: number[] = [];
      gx.forEach((g, gi) => { if (g.length < 2) return; g.forEach((v) => {
        let t: number;
        if (testType === 'brownforsythe') t = Math.abs(v - gmedian[gi]);
        else if (testType === 'levenequadratic' || testType === 'robust' || testType === 'levene') t = (v - gmean[gi]) ** 2;
        else if (testType === 'obrien') { const ni = g.length; const W = 0.5; t = ((W + ni - 2) * ni * (v - gmean[gi]) ** 2 - W * (ni - 1) * gvar[gi]) / ((ni - 1) * (ni - 2)); }
        else t = Math.abs(v - gmean[gi]);
        transformed.push(t); glab.push(gi);
      }); });
      const p = anova1P(transformed, glab);
      return Promise.resolve([scalar(p)].slice(0, Math.max(1, nargout)));
    },
    /** Y=nearcorr(A[,'Method',m][,'Tolerance',t][,'MaxIterations',k][,'Weights',w]) — nearest
     *  correlation matrix by Frobenius distance via Higham's alternating projections (Dykstra
     *  correction). Newton method is not ported; default here uses the projection algorithm. */
    nearcorr: (a) => {
      const A0 = m(a[0]); const N = A0.rows; let A = matRows(A0);
      A = A.map((r, i) => r.map((v, j) => (v + A[j][i]) / 2)); // symmetrize
      let tol = 1e-6, maxIter = 200; let weight: number[] | null = null;
      for (let i = 1; i < a.length; i++) {
        const s = isMat(a[i]) && (a[i] as Mat).isChar ? asString(a[i]).toLowerCase() : '';
        if (s === 'tolerance') tol = asScalar(a[++i]);
        else if (s === 'maxiterations') maxIter = asScalar(a[++i]);
        else if (s === 'weights') { const wM = m(a[++i]); weight = numel(wM) ? toArray(wM) : null; }
        else if (s === 'method') i++; // projection is the only supported method
      }
      // diagonal W-form weighting → element-wise sqrt(w_i*w_j) multiplier
      const wmat: number[][] = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (weight ? Math.sqrt(weight[i] * weight[j]) : 1)));
      let dS: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
      let Yold = A.map((r) => r.slice()), Xold = A.map((r) => r.slice());
      let X = Yold, Y = Yold;
      for (let iter = 0; iter <= maxIter; iter++) {
        const R = Yold.map((r, i) => r.map((v, j) => v - dS[i][j]));
        const WR = R.map((r, i) => r.map((v, j) => v * wmat[i][j]));
        const P = projPSD(WR);
        X = P.map((r, i) => r.map((v, j) => v / wmat[i][j]));
        X = X.map((r, i) => r.map((v, j) => (v + X[j][i]) / 2));
        dS = X.map((r, i) => r.map((v, j) => v - R[i][j]));
        Y = X.map((r) => r.slice());
        for (let i = 0; i < N; i++) Y[i][i] = 1;
        const diff = (M: number[][], Q: number[][]) => froNorm(M.map((r, i) => r.map((v, j) => v - Q[i][j])));
        const normY = froNorm(Y);
        const c1 = diff(Y, Yold) / normY, c2 = diff(X, Xold) / froNorm(X), c3 = diff(Y, X) / normY;
        if (Math.max(c1, c2, c3) <= tol) break;
        Yold = Y.map((r) => r.slice()); Xold = X.map((r) => r.slice());
      }
      // restore unit diagonal by rescaling X
      const sc = X.map((_, i) => Math.sqrt(X[i][i]));
      Y = X.map((r, i) => r.map((v, j) => v / (sc[i] * sc[j])));
      Y = Y.map((r, i) => r.map((v, j) => (v + Y[j][i]) / 2));
      // handle tiny negative eigenvalues from rounding
      let minE = Math.min(...symEig(Y).d);
      if (minE < 0) { Y = Y.map((r) => r.map((v) => v / (1 - minE + Number.EPSILON))); for (let i = 0; i < N; i++) Y[i][i] = 1; let nn = 10; minE = Math.min(...symEig(Y).d); while (minE < 0) { Y = Y.map((r) => r.map((v) => v / (1 + nn * Number.EPSILON))); for (let i = 0; i < N; i++) Y[i][i] = 1; minE = Math.min(...symEig(Y).d); nn *= 10; } }
      return ret(fromRows(Y));
    },
    /** out=sampsizepwr(testtype,params,p1,power[,n][,'Alpha',a][,'Tail',t][,'Ratio',r]) —
     *  sample size, power, or detectable alternative for Z/t/t2/Variance/P tests. Scalar inputs. */
    sampsizepwr: (a, nargout) => {
      const ttRaw = asString(a[0]).toLowerCase();
      const params = toArray(m(a[1]));
      const p0 = params[0]; const sig = params[1];
      const hasP1 = a[2] !== undefined && isMat(a[2]) && numel(m(a[2])) > 0;
      const p1 = hasP1 ? asScalar(a[2]) : NaN;
      const hasPow = a[3] !== undefined && isMat(a[3]) && numel(m(a[3])) > 0;
      let power = hasPow ? asScalar(a[3]) : NaN;
      const hasN = a[4] !== undefined && isMat(a[4]) && numel(m(a[4])) > 0;
      const n = hasN ? asScalar(a[4]) : NaN;
      let alpha = 0.05, tail = 0, ratio = 1;
      for (let i = 5; i < a.length; i++) { const s = asString(a[i]).toLowerCase(); if (s === 'alpha') alpha = asScalar(a[++i]); else if (s === 'tail') tail = tailCode(a[++i]); else if (s === 'ratio') ratio = asScalar(a[++i]); }
      if (a.length === 3) power = 0.9;
      const tt = ttRaw.startsWith('z') ? 'Z' : ttRaw === 't2' ? 't2' : ttRaw.startsWith('t') ? 't' : ttRaw.startsWith('v') ? 'Variance' : 'P';
      // power functions
      const powN = (mu1: number, nn: number) => { const S = sig / Math.sqrt(nn); if (tail === 0) { const cL = norminvS(alpha / 2, p0, S), cU = p0 + (p0 - cL); return normcdfS(cL, mu1, S) + normcdfS(-cU, -mu1, S); } if (tail === 1) { const cr = p0 + (p0 - norminvS(alpha, p0, S)); return normcdfS(-cr, -mu1, S); } const cr = norminvS(alpha, p0, S); return normcdfS(cr, mu1, S); };
      const powT = (mu1: number, nn: number) => { const S = sig / Math.sqrt(nn), ncp = (mu1 - p0) / S; if (tail === 0) { const cL = tinvL(alpha / 2, nn - 1); return nctcdfS(cL, nn - 1, ncp) + nctcdfS(cL, nn - 1, -ncp); } if (tail === 1) { const cr = tinvL(1 - alpha, nn - 1); return nctcdfS(-cr, nn - 1, -ncp); } const cr = tinvL(alpha, nn - 1); return nctcdfS(cr, nn - 1, ncp); };
      const powT2 = (mu1: number, nn: number) => { const df = nn + ratio * nn - 2, ncp = (mu1 - p0) / (sig * Math.sqrt(1 / nn + 1 / (ratio * nn))); if (tail === 0) { const cL = tinvL(alpha / 2, df); return nctcdfS(cL, df, ncp) + nctcdfS(cL, df, -ncp); } if (tail === 1) { const cr = tinvL(1 - alpha, df); return nctcdfS(-cr, df, -ncp); } const cr = tinvL(alpha, df); return nctcdfS(cr, df, ncp); };
      const powV = (v1: number, nn: number) => { if (tail === 0) { const cU = p0 * chi2invS(1 - alpha / 2, nn - 1), cL = p0 * chi2invS(alpha / 2, nn - 1); return chi2cdfS(cL / v1, nn - 1) + (1 - chi2cdfS(cU / v1, nn - 1)); } if (tail === 1) { const cr = p0 * chi2invS(1 - alpha, nn - 1); return 1 - chi2cdfS(cr / v1, nn - 1); } const cr = p0 * chi2invS(alpha, nn - 1); return chi2cdfS(cr / v1, nn - 1); };
      const getcritP = (nn: number): [number, number] => { let Alo = tail === 0 ? alpha / 2 : (tail < 0 ? alpha : 0); let critU = nn, critL = 0; if (tail <= 0) { critL = binoinvS(Alo, nn, p0); Alo = binocdfS(critL, nn, p0); if (critL < nn && Alo <= alpha / 2) { critL += 1; } else { Alo -= binopdfS(critL, nn, p0); } } if (tail >= 0) { const Aup = Math.max(0, alpha - Alo); critU = binoinvS(1 - Aup, nn, p0); } return [critL, critU]; };
      const powP = (pp1: number, nn: number) => { const [cL, cU] = getcritP(nn); if (tail === 0) return binocdfS(cL - 1, nn, pp1) + 1 - binocdfS(cU, nn, pp1); if (tail === 1) return 1 - binocdfS(cU, nn, pp1); return binocdfS(cL - 1, nn, pp1); };
      const powerfun = (mu1: number, nn: number) => tt === 'Z' ? powN(mu1, nn) : tt === 't' ? powT(mu1, nn) : tt === 't2' ? powT2(mu1, nn) : tt === 'Variance' ? powV(mu1, nn) : powP(mu1, nn);
      // ── compute power given n ──
      if (!hasPow) return ret(scalar(powerfun(p1, n)));
      // ── compute n given power ──
      if (!hasN) {
        if (tt === 'Z' || tt === 't') {
          const al = tail === 0 ? alpha / 2 : alpha;
          const z1 = -norminvStd(al), z2 = norminvStd(1 - power), mudiff = Math.abs(p0 - p1) / sig;
          let nv = Math.ceil(((z1 - z2) / mudiff) ** 2);
          if (tt === 't' || tail === 0) { if (tt === 't') nv = Math.max(nv, 2); while (powerfun(p1, nv) < power) nv++; }
          return ret(scalar(nv));
        }
        if (tt === 't2') {
          const al = tail === 0 ? alpha / 2 : alpha; const z1 = -norminvStd(al), z2 = norminvStd(1 - power);
          let n0 = Math.ceil((z1 - z2) ** 2 * (sig / Math.abs(p0 - p1)) ** 2 * 2); if (n0 <= 1) n0 = 2;
          const F = (nn: number) => powT2(p1, nn) - power; // powT2 already sums both tails for tail==0
          const minN = ratio >= 2 ? 1 : 2;
          let nReal: number;
          if (F(minN) > 0) nReal = minN; else { let n0u = n0 === minN ? n0 + 1 : n0; nReal = F(n0u) > 0 ? brent(F, minN, n0u, 1e-6) : (() => { let hi = n0u; while (F(hi) < 0) hi *= 2; return brent(F, n0u, hi, 1e-6); })(); }
          const N1 = Math.ceil(nReal), N2 = Math.ceil(ratio * nReal);
          return Promise.resolve([scalar(N1), scalar(N2)].slice(0, Math.max(1, nargout)));
        }
        // Variance / P: binary search
        const lo0 = tt === 'P' ? 0 : 1; let nlo = lo0, nhi = 100;
        while (powerfun(p1, nhi) < power) nhi *= 2;
        while (nhi > nlo + 1) { const nm = Math.floor((nhi + nlo) / 2); if (powerfun(p1, nm) > power) nhi = nm; else nlo = nm; }
        let nv = nhi;
        if (tt === 'P' && nv <= 200) { for (let kk = 1; kk <= nv; kk++) if (powP(p1, kk) >= power) { nv = kk; break; } }
        return ret(scalar(nv));
      }
      // ── compute detectable p1 given power and n ──
      const a2 = tail === 0 ? alpha / 2 : alpha;
      if (tt === 'Z') {
        const S = sig / Math.sqrt(n); const alZ = tail === 0 ? alpha / 2 : alpha;
        let z1: number, z2: number;
        if (tail === -1) { z1 = norminvStd(alZ); z2 = norminvStd(power); } else { z1 = norminvStd(1 - alZ); z2 = norminvStd(1 - power); }
        let mu1 = p0 + S * (z1 - z2);
        if (tail === 0) { const desiredbeta = 1 - power; let betahi = desiredbeta; for (let it = 0; it < 100; it++) { const betalo = normcdfS(-z1 + (p0 - mu1) / S); if (Math.abs((betahi - betalo) - desiredbeta) <= 1e-6 * desiredbeta) break; betahi = desiredbeta + betalo; mu1 = p0 + S * (z1 - norminvStd(betahi)); } }
        return ret(scalar(mu1));
      }
      if (tt === 't' || tt === 't2') {
        const isT2 = tt === 't2', df = isT2 ? n + ratio * n - 2 : n - 1;
        const seFac = isT2 ? Math.sqrt(1 / n + 1 / (ratio * n)) : 1 / Math.sqrt(n);
        let z1: number, z2: number;
        if (tail === -1) { z1 = norminvStd(alpha); z2 = norminvStd(power); } else { z1 = norminvStd(1 - a2); z2 = norminvStd(1 - power); }
        const pf = isT2 ? powT2 : powT;
        let mu1 = isT2 ? p0 + sig * (tinvL(tail === -1 ? alpha : 1 - a2, df) - tinvL(tail === -1 ? power : 1 - power, df)) * seFac
                       : p0 + sig * (z1 - z2) * seFac;
        const F0 = (mu1arg: number) => (mu1 > p0 ? pf(Math.max(p0, mu1arg), n) - power : power - pf(Math.min(p0, mu1arg), n));
        // refine with a local bracket around the explicit estimate
        const lo = mu1 > p0 ? p0 : p0 - 10 * Math.abs(mu1 - p0) - 1, hi = mu1 > p0 ? p0 + 10 * Math.abs(mu1 - p0) + 1 : p0;
        const r = brent(F0, lo, hi, 1e-9); if (Number.isFinite(r)) mu1 = r;
        return ret(scalar(mu1));
      }
      if (tt === 'Variance') {
        const Finv = (pr: number, p1v: number) => p1v * chi2invS(pr, n - 1) / (n - 1);
        const Fc = (xx: number, p1v: number) => chi2cdfS(xx * (n - 1) / p1v, n - 1);
        const al = tail === 0 ? alpha / 2 : alpha; const desiredbeta = 1 - power;
        let critU = NaN, critL = NaN, p1v = NaN;
        if (tail >= 0) { critU = Finv(1 - al, p0); p1v = 1 / Finv(desiredbeta, 1 / critU); }
        if (tail <= 0) critL = Finv(al, p0);
        if (tail < 0) p1v = 1 / Finv(power, 1 / critL);
        if (tail === 0) { let betahi = desiredbeta; for (let it = 0; it < 100; it++) { const betalo = Fc(critL, p1v); if (Math.abs((betahi - betalo) - desiredbeta) <= 1e-6 * desiredbeta) break; betahi = desiredbeta + betalo; p1v = 1 / Finv(betahi, 1 / critU); } }
        return ret(scalar(p1v));
      }
      // P (binomial): normal-approx start, then refine with brent
      {
        const [cL, cU] = getcritP(n); const sigma = Math.sqrt(p0 * (1 - p0) / n);
        // normal-approx p1
        const S = sigma; let z1: number, z2: number;
        if (tail === -1) { z1 = norminvStd(alpha); z2 = norminvStd(power); } else { z1 = norminvStd(1 - a2); z2 = norminvStd(1 - power); }
        let p1v = p0 + S * (z1 - z2);
        if (p1v <= 0) p1v = p0 / 2; if (p1v >= 1) p1v = 1 - p0 / 2;
        const F0 = (arg: number) => (p1v > p0 ? powP(Math.max(p0, Math.min(1, arg)), n) - power : power - powP(Math.max(0, Math.min(p0, arg)), n));
        void cL; void cU;
        const lo = p1v > p0 ? p0 : 1e-6, hi = p1v > p0 ? 1 - 1e-6 : p0;
        const r = brent(F0, lo, hi, 1e-9); if (Number.isFinite(r)) p1v = r;
        return ret(scalar(p1v));
      }
    },
    /** [nnstat,p,h]=knntest(X,Y[,'NumNeighbors',k][,'Distance',d][,'Alpha',a]) — k-nearest-
     *  neighbor two-sample test (Schilling/Henze). Continuous numeric data; supported metrics:
     *  euclidean, cityblock, chebychev, cosine, minkowski, correlation. */
    knntest: (a, nargout) => {
      const X = matRows(m(a[0])), Y = matRows(m(a[1]));
      let alpha = 0.05, k = 10, distance = 'euclidean';
      for (let i = 2; i < a.length; i++) { const s = asString(a[i]).toLowerCase(); if (s === 'alpha') alpha = asScalar(a[++i]); else if (s === 'numneighbors') k = asScalar(a[++i]); else if (s === 'distance') distance = asString(a[++i]).toLowerCase(); }
      const Nx = X.length, Ny = Y.length, N = Nx + Ny;
      const pooled = [...X, ...Y];
      const correlationDist = (u: number[], v: number[]) => { const mu = u.reduce((s, x) => s + x, 0) / u.length, mv = v.reduce((s, x) => s + x, 0) / v.length; const cu = u.map((x) => x - mu), cv = v.map((x) => x - mv); const den = Math.hypot(...cu) * Math.hypot(...cv); return den === 0 ? 1 : 1 - dot(cu, cv) / den; };
      const metric = distance === 'correlation' ? correlationDist : (METRICS[distance] ?? METRICS.euclidean);
      // for each point, k nearest neighbors excluding self
      let inGroup = 0; const totalEntries = N * k;
      for (let i = 0; i < N; i++) {
        const dists: [number, number][] = [];
        for (let j = 0; j < N; j++) { if (j === i) continue; dists.push([metric(pooled[i], pooled[j]), j]); }
        dists.sort((p1, p2) => p1[0] - p2[0]);
        const iIsX = i < Nx;
        for (let t = 0; t < k && t < dists.length; t++) { const nbX = dists[t][1] < Nx; if (nbX === iIsX) inGroup++; }
      }
      const T = inGroup / totalEntries;
      const mu = (Nx * (Nx - 1) + Ny * (Ny - 1)) / (N * (N - 1));
      const l1 = Nx / N, l2 = Ny / N;
      const variance = (1 / (k * N)) * (l1 * l2 + 4 * l1 * l1 * l2 * l2);
      const sigma = Math.sqrt(variance);
      const p = normcdfL(-(T - mu) / sigma); // upper-tail P(Z > (T-mu)/sigma)
      const h = p <= alpha ? 1 : 0;
      return Promise.resolve([scalar(T), scalar(p), scalar(h)].slice(0, Math.max(1, nargout)));
    },
    /** [h,p,adstat,cv]=adtest(x[,'Distribution',d][,'Alpha',a]) — Anderson-Darling test.
     *  Composite (parameters estimated) for 'normal'/'exponential'; simple test against a
     *  fully-specified makedist object. 'ev'/'weibull'/MonteCarlo/Asymptotic are omitted. */
    adtest: (a, nargout) => {
      let x = toArray(m(a[0])).filter((v) => !Number.isNaN(v));
      let distr: Value | string = 'normal'; let alpha = 0.05;
      for (let i = 1; i < a.length; i++) {
        const s = isMat(a[i]) && (a[i] as Mat).isChar ? asString(a[i]).toLowerCase() : '';
        if (s === 'distribution') { const v = a[++i]; distr = isObject(v) ? v : asString(v).toLowerCase(); }
        else if (s === 'alpha') alpha = asScalar(a[++i]);
        else throw new MatError(`adtest: unsupported option '${asString(a[i])}'`);
      }
      const n = x.length;
      // Simple hypothesis: fully-specified distribution object.
      if (typeof distr !== 'string') {
        const { spec, vals } = resolveDist([distr]);
        const z = x.map((xi) => spec.cdf(xi, ...vals));
        const ad = computeADStat(z);
        let p: number;
        if (n === 1) p = 1 - Math.sqrt(1 - 4 * Math.exp(-1 - ad));
        else p = 1 - adn(n, ad);
        p = Math.min(1, Math.max(0, p));
        const h = p < alpha ? 1 : 0;
        return Promise.resolve([scalar(h), scalar(p), scalar(ad)].slice(0, Math.max(1, nargout)));
      }
      // Composite hypothesis (parameters estimated from data).
      let name = distr;
      if (name.startsWith('exp')) name = 'exponential'; else if (name.startsWith('norm')) name = 'normal';
      if (name !== 'normal' && name !== 'exponential') throw new MatError(`adtest: distribution '${distr}' not supported (only normal, exponential, or a distribution object)`);
      if (n < 4) throw new MatError('adtest: at least 4 non-missing observations are required for a composite test');
      let z: number[];
      if (name === 'normal') { const mu = mean_(x), sd = sd_(x); z = x.map((xi) => 0.5 * erfc(-(xi - mu) / (sd * Math.SQRT2))); }
      else { const mu = mean_(x); z = x.map((xi) => (xi < 0 ? 0 : 1 - Math.exp(-xi / mu))); }
      const ad = computeADStat(z);
      const CVs = name === 'normal' ? adCVsNorm(n) : adCVsExp(n);
      const logAlphas = AD_ALPHAS.map((al) => Math.log(al));
      // critical value by pchip on (log alpha, CV); clamp outside the table.
      let cv: number;
      if (alpha < AD_ALPHAS[0]) cv = CVs[0]; else if (alpha > AD_ALPHAS[AD_ALPHAS.length - 1]) cv = CVs[CVs.length - 1];
      else cv = pchip(logAlphas, CVs, Math.log(alpha));
      // p-value by inverse interpolation of the same pchip in CV.
      let p: number, h: number;
      if (ad > CVs[0]) { p = AD_ALPHAS[0]; }
      else if (ad < CVs[CVs.length - 1]) { p = AD_ALPHAS[AD_ALPHAS.length - 1]; }
      else {
        // CVs are decreasing in alpha; find bracketing interval and bisect on log(alpha).
        let i = 0; while (i < CVs.length - 1 && !(ad > CVs[i + 1])) i++;
        let lo = logAlphas[i], hi = logAlphas[i + 1];
        for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; if (pchip(logAlphas, CVs, mid) > ad) lo = mid; else hi = mid; if (Math.abs(hi - lo) < 1e-14) break; }
        p = Math.exp((lo + hi) / 2);
      }
      if (alpha < AD_ALPHAS[0] || alpha > AD_ALPHAS[AD_ALPHAS.length - 1]) h = p < alpha ? 1 : 0;
      else h = ad > cv ? 1 : 0;
      return Promise.resolve([scalar(h), scalar(p), scalar(ad), scalar(cv)].slice(0, Math.max(1, nargout)));
    },
    /** [TR,EM]=hmmestimate(seq,states[,'Symbols',s][,'Statenames',sn][,'Pseudoemissions',PE][,'Pseudotransitions',PT])
     *  Maximum-likelihood HMM parameter estimate from an observed sequence and its state path. */
    hmmestimate: (a, nargout) => {
      // Resolve a sequence value to integer codes; numeric → as-is, string/cell → unique mapping.
      const toCodes = (v: Value): { codes: number[]; uniq: number; numeric: boolean; labels?: string[] } => {
        if (isMat(v) && !(v as Mat).isChar) { const arr = toArray(m(v)); if (!arr.length || arr.some((x) => !Number.isInteger(x) || x < 1)) throw new MatError('hmmestimate: numeric symbols/states must be positive integers'); return { codes: arr, uniq: Math.max(...arr), numeric: true }; }
        let items: string[];
        if (isCell(v)) items = v.items.map((it) => asString(it));
        else if (isStr(v)) items = v.items.slice();
        else if (isMat(v) && (v as Mat).isChar) items = asString(v).split('');
        else items = [asString(v)];
        const labels = Array.from(new Set(items)).sort();
        const idx = new Map(labels.map((l, i) => [l, i + 1]));
        return { codes: items.map((it) => idx.get(it)!), uniq: labels.length, numeric: false, labels };
      };
      const S = toCodes(a[0]); const St = toCodes(a[1]);
      let seq = S.codes.slice(); let states = St.codes.slice();
      if (seq.length !== states.length) throw new MatError('hmmestimate: seq and states must have the same length');
      let numSymbols = S.numeric ? S.uniq : S.labels!.length;
      let numStates = St.numeric ? St.uniq : St.labels!.length;
      // String items of a value: cell→element strings, string array→items, char row→characters, numeric→string codes.
      const labelsOf = (v: Value): string[] => isCell(v) ? v.items.map((it) => asString(it)) : isStr(v) ? v.items.slice() : (isMat(v) && (v as Mat).isChar ? asString(v).split('') : toArray(m(v)).map(String));
      let pseudoE: number[][] | null = null, pseudoTR: number[][] | null = null;
      for (let i = 2; i < a.length; i++) {
        const s = isMat(a[i]) && (a[i] as Mat).isChar ? asString(a[i]).toLowerCase() : '';
        if (s === 'symbols') { const labels = labelsOf(a[++i]); numSymbols = labels.length; const idx = new Map(labels.map((l, k) => [l, k + 1])); seq = labelsOf(a[0]).map((it) => { const c = idx.get(it); if (!c) throw new MatError('hmmestimate: symbol not in Symbols'); return c; }); }
        else if (s === 'statenames') { const labels = labelsOf(a[++i]); numStates = labels.length; const idx = new Map(labels.map((l, k) => [l, k + 1])); states = labelsOf(a[1]).map((it) => { const c = idx.get(it); if (!c) throw new MatError('hmmestimate: state not in Statenames'); return c; }); }
        else if (s === 'pseudoemissions') { pseudoE = matRows(m(a[++i])); numStates = Math.max(numStates, pseudoE.length); numSymbols = Math.max(numSymbols, pseudoE[0]?.length ?? 0); }
        else if (s === 'pseudotransitions') { pseudoTR = matRows(m(a[++i])); if (pseudoTR.length !== (pseudoTR[0]?.length ?? 0)) throw new MatError('hmmestimate: Pseudotransitions must be square'); numStates = Math.max(numStates, pseudoTR.length); }
        else throw new MatError(`hmmestimate: unsupported option '${asString(a[i])}'`);
      }
      const TR = Array.from({ length: numStates }, () => new Array<number>(numStates).fill(0));
      const EM = Array.from({ length: numStates }, () => new Array<number>(numSymbols).fill(0));
      for (let c = 0; c < seq.length - 1; c++) TR[states[c] - 1][states[c + 1] - 1]++;
      for (let c = 0; c < seq.length; c++) EM[states[c] - 1][seq[c] - 1]++;
      if (pseudoE) for (let r = 0; r < numStates; r++) for (let cc = 0; cc < numSymbols; cc++) EM[r][cc] += pseudoE[r]?.[cc] ?? 0;
      if (pseudoTR) for (let r = 0; r < numStates; r++) for (let cc = 0; cc < numStates; cc++) TR[r][cc] += pseudoTR[r]?.[cc] ?? 0;
      const norm = (M: number[][]) => M.map((row) => { const sum = row.reduce((s, v) => s + v, 0); return sum === 0 ? row.map(() => 0) : row.map((v) => v / sum); });
      return Promise.resolve([fromRows(norm(TR)), fromRows(norm(EM))].slice(0, Math.max(1, nargout)));
    },
    /** [p,t,rankH]=linhyptest(mu,Sigma,C,H,dfe) — linear hypothesis test H*mu = C. */
    linhyptest: (a, nargout) => {
      const mu = toArray(m(a[0])); const k = mu.length;
      const Sigma = a.length > 1 && isMat(a[1]) && numel(m(a[1])) > 0 ? matRows(m(a[1])) : Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)));
      let C = a.length > 2 && isMat(a[2]) && numel(m(a[2])) > 0 ? toArray(m(a[2])) : new Array<number>(k).fill(0);
      let H = a.length > 3 && isMat(a[3]) && numel(m(a[3])) > 0 ? matRows(m(a[3])) : Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)));
      const dfe = a.length > 4 && isMat(a[4]) && numel(m(a[4])) > 0 ? asScalar(a[4]) : Infinity;
      const nC = H.length;
      if (C.length === 1 && nC > 1) C = new Array<number>(nC).fill(C[0]);
      // rank of H via Gaussian elimination with partial pivoting (rows of H).
      const A = H.map((r) => r.slice()); const nrm = Math.sqrt(H.reduce((s, r) => s + r.reduce((t, v) => t + v * v, 0), 0));
      const tol = Math.max(nC, k) * (nrm > 0 ? nrm : 1) * 2.220446049250313e-16;
      const pivotRows: number[] = []; const used = new Array<boolean>(nC).fill(false);
      const work = A.map((r) => r.slice());
      for (let col = 0; col < k; col++) {
        let piv = -1, best = tol;
        for (let r = 0; r < nC; r++) if (!used[r] && Math.abs(work[r][col]) > best) { best = Math.abs(work[r][col]); piv = r; }
        if (piv < 0) continue;
        used[piv] = true; pivotRows.push(piv);
        for (let r = 0; r < nC; r++) if (r !== piv && !used[r]) { const f = work[r][col] / work[piv][col]; for (let cc = 0; cc < k; cc++) work[r][cc] -= f * work[piv][cc]; }
      }
      const rankH = pivotRows.length;
      // Use a full-rank subset of the hypothesis rows.
      const Hs = pivotRows.map((r) => H[r]); const Cs = pivotRows.map((r) => C[r]);
      const c0 = Hs.map((row) => row.reduce((s, v, j) => s + v * mu[j], 0));
      // v0 = Hs * Sigma * Hs'
      const SHt = Hs.map((row) => Sigma.map((srow) => srow.reduce((s, v, j) => s + v * row[j], 0)));
      const v0 = Hs.map((rowI, i) => Hs.map((_rowJ, j) => rowI.reduce((s, v, kk) => s + v * SHt[j][kk], 0)));
      const r = c0.map((v, i) => v - Cs[i]);
      // t = (r' * inv(v0) * r) / rankH ; solve v0 * y = r via Gaussian elimination.
      const sol = solveLin(v0, r);
      const t = r.reduce((s, v, i) => s + v * sol[i], 0) / rankH;
      const p = fUpperTail(t, rankH, dfe);
      return Promise.resolve([scalar(p), scalar(t), scalar(rankH)].slice(0, Math.max(1, nargout)));
    },

    // ── Normal ──
    // normpdf/normcdf are identical to the base builtins (incl. the (x,mu,sigma) form) — removed to
    // avoid duplicate code (base wins). See DUPLICATE_POLICY.
    norminv: (a) => dist(a, [0, 1], (p, mu, s) => s > 0 ? mu + s * norminvStd(p) : NaN),
    // ── Student's t ──
    tpdf: (a) => dist(a, [1], (x, v) => Math.exp(logGamma((v + 1) / 2) - logGamma(v / 2)) / Math.sqrt(v * Math.PI) * (1 + x * x / v) ** (-(v + 1) / 2)),
    tcdf: (a) => dist(a, [1], (x, v) => { const ib = betainc(v / (v + x * x), v / 2, 0.5); return x >= 0 ? 1 - 0.5 * ib : 0.5 * ib; }),
    tinv: (a) => dist(a, [1], (p, v) => invCdf(p, (x) => { const ib = betainc(v / (v + x * x), v / 2, 0.5); return x >= 0 ? 1 - 0.5 * ib : 0.5 * ib; }, -Infinity, Infinity)),
    // ── Chi-square ──
    chi2pdf: (a) => dist(a, [1], (x, k) => x < 0 ? 0 : x === 0 ? (k < 2 ? Infinity : k === 2 ? 0.5 : 0) : x === Infinity ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - logGamma(k / 2))),
    chi2cdf: (a) => dist(a, [1], (x, k) => gammainc(x / 2, k / 2)),
    chi2inv: (a) => dist(a, [1], (p, k) => invCdf(p, (x) => gammainc(x / 2, k / 2), 0, Infinity)),
    // ── Gamma (shape a, scale b) ──
    gampdf: (a) => dist(a, [1, 1], (x, k, th) => k > 0 && th > 0 ? (x < 0 ? 0 : Math.exp((k - 1) * Math.log(x) - x / th - k * Math.log(th) - logGamma(k))) : NaN),
    gamcdf: (a) => dist(a, [1, 1], (x, k, th) => k > 0 && th > 0 ? gammainc(x / th, k) : NaN),
    gaminv: (a) => dist(a, [1, 1], (p, k, th) => k > 0 && th > 0 ? invCdf(p, (x) => gammainc(x / th, k), 0, Infinity) : NaN),
    // ── Exponential (mean mu) ──
    exppdf: (a) => dist(a, [1], (x, mu) => mu > 0 ? (x < 0 ? 0 : Math.exp(-x / mu) / mu) : NaN),
    expcdf: (a) => dist(a, [1], (x, mu) => mu > 0 ? (x < 0 ? 0 : 1 - Math.exp(-x / mu)) : NaN),
    expinv: (a) => dist(a, [1], (p, mu) => mu > 0 ? -mu * Math.log(1 - p) : NaN),
    // ── Beta ──
    betapdf: (a) => dist(a, [1, 1], (x, p, q) => x < 0 || x > 1 ? 0 : Math.exp((p - 1) * Math.log(x) + (q - 1) * Math.log(1 - x) - (logGamma(p) + logGamma(q) - logGamma(p + q)))),
    betacdf: (a) => dist(a, [1, 1], (x, p, q) => betainc(x, p, q)),
    betainv: (a) => dist(a, [1, 1], (pr, p, q) => invCdf(pr, (x) => betainc(x, p, q), 0, 1)),
    // ── F ──
    fpdf: (a) => dist(a, [1, 1], (x, d1, d2) => x < 0 ? 0 : x === 0 ? (d1 < 2 ? Infinity : d1 === 2 ? 1 : 0) : x === Infinity ? 0 : Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - (logGamma(d1 / 2) + logGamma(d2 / 2) - logGamma((d1 + d2) / 2)))),
    fcdf: (a) => dist(a, [1, 1], (x, d1, d2) => x <= 0 ? 0 : x === Infinity ? 1 : betainc(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2)),
    finv: (a) => dist(a, [1, 1], (p, d1, d2) => invCdf(p, (x) => x <= 0 ? 0 : betainc(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2), 0, Infinity)),
    // ── Uniform ──
    unifpdf: (a) => dist(a, [0, 1], (x, lo, hi) => hi > lo ? (x >= lo && x <= hi ? 1 / (hi - lo) : 0) : NaN),
    unifcdf: (a) => dist(a, [0, 1], (x, lo, hi) => hi > lo ? (x < lo ? 0 : x > hi ? 1 : (x - lo) / (hi - lo)) : NaN),
    unifinv: (a) => dist(a, [0, 1], (p, lo, hi) => hi > lo && p >= 0 && p <= 1 ? lo + p * (hi - lo) : NaN),
    // ── Lognormal ──
    lognpdf: (a) => dist(a, [0, 1], (x, mu, s) => s > 0 ? (x <= 0 ? 0 : Math.exp(-0.5 * ((Math.log(x) - mu) / s) ** 2) / (x * s * Math.sqrt(2 * Math.PI))) : NaN),
    logncdf: (a) => dist(a, [0, 1], (x, mu, s) => s > 0 ? (x <= 0 ? 0 : 0.5 * erfc(-(Math.log(x) - mu) / (s * Math.SQRT2))) : NaN),
    logninv: (a) => dist(a, [0, 1], (p, mu, s) => s > 0 ? Math.exp(mu + s * norminvStd(p)) : NaN),
    // ── Binomial ──
    binopdf: (a) => dist(a, [1, 0.5], (k, n, p) => { if (k !== Math.round(k) || k < 0 || k > n) return 0; return nCk(n, k) * p ** k * (1 - p) ** (n - k); }),
    binocdf: (a) => dist(a, [1, 0.5], (k, n, p) => { k = Math.floor(k); if (k < 0) return 0; if (k >= n) return 1; return 1 - betainc(p, k + 1, n - k); }),
    binoinv: (a) => dist(a, [1, 0.5], (pr, n, p) => { let c = 0; for (let k = 0; k <= n; k++) { c += nCk(n, k) * p ** k * (1 - p) ** (n - k); if (c >= pr - 1e-12) return k; } return n; }),
    // ── Poisson ──
    poisspdf: (a) => dist(a, [1], (k, lam) => { if (k !== Math.round(k) || k < 0) return 0; return Math.exp(k * Math.log(lam) - lam - logGamma(k + 1)); }),
    poisscdf: (a) => dist(a, [1], (k, lam) => { k = Math.floor(k); return k < 0 ? 0 : k === Infinity ? 1 : 1 - gammainc(lam, k + 1); }),
    poissinv: (a) => dist(a, [1], (pr, lam) => { if (!(lam >= 0) || pr < 0 || pr > 1) return NaN; if (pr === 1) return Infinity; let c = 0, k = 0; for (; k < 1e6; k++) { c += Math.exp(k * Math.log(lam) - lam - logGamma(k + 1)); if (c >= pr - 1e-12) return k; } return k; }),
    // ── Exponential negative log-likelihood: nlogL + inverse-observed-information avar ──
    explike: (a, nargout) => {
      const mu = asScalar(a[0]); const x = toArray(m(a[1])); const n = x.length;
      const S = x.reduce((s, v) => s + v, 0);
      const nlogL = n * Math.log(mu) + S / mu;
      if (nargout < 2) return ret(scalar(nlogL));
      const avar = 1 / (2 * S / mu ** 3 - n / mu ** 2);     // 1 / d²(nlogL)/dμ²
      return Promise.resolve([scalar(nlogL), scalar(avar)]);
    },
    // ── Discrete uniform on {1..N} (invalid N → NaN) ──
    unidpdf: (a) => dist(a, [1], (x, N) => (N < 1 || N !== Math.floor(N)) ? NaN : (x >= 1 && x <= N && x === Math.floor(x)) ? 1 / N : 0),
    unidcdf: (a) => dist(a, [1], (x, N) => (N < 1 || N !== Math.floor(N)) ? NaN : x < 1 ? 0 : Math.min(Math.floor(x), N) / N),
    unidinv: (a) => dist(a, [1], (p, N) => { if (N < 1 || N !== Math.floor(N) || p < 0 || p > 1) return NaN; const k = Math.ceil(p * N); return k < 1 ? NaN : k; }),
    unidstat: (a, nargout) => {
      const N = m(a[0]);
      const valid = (n: number) => n >= 1 && n === Math.floor(n);
      const M = map(N, (n) => valid(n) ? (n + 1) / 2 : NaN);
      const V = map(N, (n) => valid(n) ? (n * n - 1) / 12 : NaN);
      return Promise.resolve(nargout >= 2 ? [M, V] : [M]);
    },
    // ── Geometric (# failures before first success) ──
    geopdf: (a) => dist(a, [0.5], (k, p) => (k !== Math.round(k) || k < 0) ? 0 : p * (1 - p) ** k),
    geocdf: (a) => dist(a, [0.5], (k, p) => { k = Math.floor(k); return k < 0 ? 0 : 1 - (1 - p) ** (k + 1); }),
    // ── Weibull (scale a, shape b) ──
    wblpdf: (a) => dist(a, [1, 1], (x, A, B) => x < 0 ? 0 : (B / A) * (x / A) ** (B - 1) * Math.exp(-((x / A) ** B))),
    wblcdf: (a) => dist(a, [1, 1], (x, A, B) => x < 0 ? 0 : 1 - Math.exp(-((x / A) ** B))),
    wblinv: (a) => dist(a, [1, 1], (p, A, B) => A * (-Math.log(1 - p)) ** (1 / B)),
    // ── Rayleigh (scale b) ──
    raylpdf: (a) => dist(a, [1], (x, b) => x < 0 ? 0 : (x / (b * b)) * Math.exp(-(x * x) / (2 * b * b))),
    raylcdf: (a) => dist(a, [1], (x, b) => x < 0 ? 0 : 1 - Math.exp(-(x * x) / (2 * b * b))),
    raylinv: (a) => dist(a, [1], (p, b) => b * Math.sqrt(-2 * Math.log(1 - p))),

    // ── distribution statistics [M,V] = *stat(params) ──
    normstat: (a, n) => statRet(n, asScalar(a[0]), (a.length >= 2 ? asScalar(a[1]) : 1) ** 2),
    expstat: (a, n) => { const mu = asScalar(a[0]); return statRet(n, mu, mu * mu); },
    poisstat: (a, n) => { const l = asScalar(a[0]); return statRet(n, l, l); },
    binostat: (a, n) => { const N = asScalar(a[0]), p = asScalar(a[1]); return statRet(n, N * p, N * p * (1 - p)); },
    unifstat: (a, n) => { const lo = asScalar(a[0]), hi = asScalar(a[1]); return statRet(n, (lo + hi) / 2, (hi - lo) ** 2 / 12); },
    gamstat: (a, n) => { const k = asScalar(a[0]), th = a.length >= 2 ? asScalar(a[1]) : 1; return statRet(n, k * th, k * th * th); },
    betastat: (a, n) => { const p = asScalar(a[0]), q = asScalar(a[1]); return statRet(n, p / (p + q), (p * q) / ((p + q) ** 2 * (p + q + 1))); },
    chi2stat: (a, n) => { const k = asScalar(a[0]); return statRet(n, k, 2 * k); },
    tstat: (a, n) => { const v = asScalar(a[0]); return statRet(n, 0, v > 2 ? v / (v - 2) : NaN); },
    fstat: (a, n) => { const d1 = asScalar(a[0]), d2 = asScalar(a[1]); return statRet(n, d2 > 2 ? d2 / (d2 - 2) : NaN, d2 > 4 ? (2 * d2 * d2 * (d1 + d2 - 2)) / (d1 * (d2 - 2) ** 2 * (d2 - 4)) : NaN); },
    lognstat: (a, n) => { const mu = asScalar(a[0]), s = a.length >= 2 ? asScalar(a[1]) : 1; return statRet(n, Math.exp(mu + s * s / 2), (Math.exp(s * s) - 1) * Math.exp(2 * mu + s * s)); },
    geostat: (a, n) => { const p = asScalar(a[0]); return statRet(n, (1 - p) / p, (1 - p) / (p * p)); },
    raylstat: (a, n) => { const b = asScalar(a[0]); return statRet(n, b * Math.sqrt(Math.PI / 2), (4 - Math.PI) / 2 * b * b); },
    wblstat: (a, n) => { const A = asScalar(a[0]), B = asScalar(a[1]); const g1 = Math.exp(logGamma(1 + 1 / B)), g2 = Math.exp(logGamma(1 + 2 / B)); return statRet(n, A * g1, A * A * (g2 - g1 * g1)); },

    // ── Type-1 extreme value (Gumbel, minima): evpdf(x,mu,sigma) — z=(x-mu)/sigma ──
    evpdf: (a) => dist(a, [0, 1], (x, mu, s) => (s <= 0 ? NaN : (() => { const z = (x - mu) / s; return Math.exp(z - Math.exp(z)) / s; })())),
    evcdf: (a) => dist(a, [0, 1], (x, mu, s) => (s <= 0 ? NaN : -Math.expm1(-Math.exp((x - mu) / s)))),
    evinv: (a) => dist(a, [0, 1], (p, mu, s) => mu + s * Math.log(-Math.log(1 - p))),
    evstat: (a, n) => { const mu = asScalar(a[0]), s = asScalar(a[1]); return statRet(n, mu - 0.5772156649015329 * s, (Math.PI * s) ** 2 / 6); },

    // ── generalized extreme value: gevpdf(x,k,sigma,mu) — note param order (k,sigma,mu) ──
    gevpdf: (a) => dist(a, [0, 1, 0], (x, k, s, mu) => {
      if (s <= 0) return NaN; const z = (x - mu) / s;
      if (k === 0) return Math.exp(-Math.exp(-z) - z) / s;
      const t = k * z; if (1 + t <= 0) return 0; const lt = Math.log1p(t);
      return Math.exp(-Math.exp(-(1 / k) * lt) - (1 + 1 / k) * lt) / s;
    }),
    gevcdf: (a) => dist(a, [0, 1, 0], (x, k, s, mu) => {
      if (s <= 0) return NaN; const z = (x - mu) / s;
      if (k === 0) return Math.exp(-Math.exp(-z));
      const t = k * z; if (1 + t <= 0) return k > 0 ? 0 : 1;
      return Math.exp(-Math.exp(-(1 / k) * Math.log1p(t)));
    }),
    gevinv: (a) => dist(a, [0, 1, 0], (p, k, s, mu) => {
      if (s <= 0) return NaN;
      const z = k === 0 ? -Math.log(-Math.log(p)) : Math.expm1(-k * Math.log(-Math.log(p))) / k;
      return mu + s * z;
    }),
    gevstat: (a, n) => {
      const k = asScalar(a[0]), s = asScalar(a[1]), mu = asScalar(a[2]);
      const mm = Math.abs(k) < 1e-8 ? 0.5772156649015329 : (k < 1 ? Math.expm1(logGamma(1 - k)) / k : Infinity);
      const vv = Math.abs(k) < 5e-6 ? Math.PI ** 2 / 6 : (k < 0.5 ? (Math.expm1(logGamma(1 - 2 * k)) - Math.expm1(2 * logGamma(1 - k))) / (k * k) : Infinity);
      return statRet(n, mu + s * mm, s * s * vv);
    },

    // ── generalized Pareto: gppdf(x,k,sigma,theta) — param order (k,sigma,theta) ──
    gppdf: (a) => dist(a, [0, 1, 0], (x, k, s, th) => {
      if (s <= 0) return NaN; const z = (x - th) / s; if (z < 0) return 0;
      if (k === 0) return Math.exp(-z) / s;
      const t = k * z; if (1 + t <= 0) return 0;
      return Math.exp((-1 - 1 / k) * Math.log1p(t)) / s;
    }),
    gpcdf: (a) => dist(a, [0, 1, 0], (x, k, s, th) => {
      if (s <= 0) return NaN; const z = (x - th) / s; if (z < 0) return 0;
      if (k === 0) return -Math.expm1(-z);
      const t = k * z; if (1 + t <= 0) return 1;
      return -Math.expm1((-1 / k) * Math.log1p(t));
    }),
    gpinv: (a) => dist(a, [0, 1, 0], (p, k, s, th) => {
      if (s <= 0) return NaN;
      const z = k === 0 ? -Math.log1p(-p) : Math.expm1(-k * Math.log1p(-p)) / k;
      return th + s * z;
    }),
    gpstat: (a, n) => {
      const k = asScalar(a[0]), s = asScalar(a[1]), th = asScalar(a[2]);
      return statRet(n, th + s * (k < 1 ? 1 / (1 - k) : Infinity), s * s * (k < 0.5 ? 1 / ((1 - k) ** 2 * (1 - 2 * k)) : Infinity));
    },

    // ── negative binomial: nbinpdf(x,r,p) ──
    nbinpdf: (a) => dist(a, [1, 0.5], (x, r, p) => (x < 0 || x !== Math.round(x) ? 0 : Math.exp(logGamma(r + x) - logGamma(r) - logGamma(x + 1) + r * Math.log(p) + x * Math.log1p(-p)))),
    nbincdf: (a) => dist(a, [1, 0.5], (x, r, p) => { x = Math.floor(x); return x < 0 ? 0 : betainc(p, r, x + 1); }),
    nbininv: (a) => dist(a, [1, 0.5], (pr, r, p) => { if (pr <= 0) return 0; if (pr >= 1) return Infinity; let x = 0; while (betainc(p, r, x + 1) < pr - 1e-12 && x < 1e7) x++; return x; }),
    nbinstat: (a, n) => { const r = asScalar(a[0]), p = asScalar(a[1]); return statRet(n, r * (1 - p) / p, r * (1 - p) / (p * p)); },

    // ── hypergeometric: hygepdf(x,M,K,N) — M pop, K successes, N draws ──
    hygepdf: (a) => dist(a, [10, 5, 5], (x, M, K, N) => { if (x !== Math.round(x) || x < Math.max(0, N - (M - K)) || x > Math.min(K, N)) return 0; return Math.exp(lchoose(K, x) + lchoose(M - K, N - x) - lchoose(M, N)); }),
    hygecdf: (a) => dist(a, [10, 5, 5], (x, M, K, N) => { x = Math.floor(x); const lo = Math.max(0, N - (M - K)), hi = Math.min(K, N); if (x < lo) return 0; if (x >= hi) return 1; let s = 0; for (let i = lo; i <= x; i++) s += Math.exp(lchoose(K, i) + lchoose(M - K, N - i) - lchoose(M, N)); return Math.min(1, s); }),
    hygeinv: (a) => dist(a, [10, 5, 5], (pr, M, K, N) => { const lo = Math.max(0, N - (M - K)), hi = Math.min(K, N); if (pr <= 0) return lo; let s = 0; for (let x = lo; x <= hi; x++) { s += Math.exp(lchoose(K, x) + lchoose(M - K, N - x) - lchoose(M, N)); if (s >= pr - 1e-12) return x; } return hi; }),
    hygestat: (a, n) => { const M = asScalar(a[0]), K = asScalar(a[1]), N = asScalar(a[2]); return statRet(n, N * K / M, N * (K / M) * ((M - K) / M) * ((M - N) / (M - 1))); },

    // ── noncentral chi-square: ncx2pdf(x,v,delta) — Poisson(delta/2)-mixture of central chi2 ──
    ncx2pdf: (a) => dist(a, [1, 0], (x, v, d) => {
      if (x < 0) return 0; let s = 0; const lh = d / 2;
      for (let j = 0; j < 500; j++) { const w = Math.exp(poisLogW(j, lh)); const k = v + 2 * j; s += w * Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - logGamma(k / 2)); if (j > lh && w < 1e-15) break; }
      return s;
    }),
    ncx2cdf: (a) => dist(a, [1, 0], (x, v, d) => ncx2cdfS(x, v, d)),
    ncx2inv: (a) => dist(a, [1, 0], (p, v, d) => invCdf(p, (x) => ncx2cdfS(x, v, d), 0, Infinity)),
    ncx2stat: (a, n) => { const v = asScalar(a[0]), d = asScalar(a[1]); return statRet(n, v + d, 2 * (v + 2 * d)); },

    // ── noncentral F: ncfpdf(x,v1,v2,delta) — Poisson(delta/2)-mixture of central F ──
    ncfpdf: (a) => dist(a, [1, 1, 0], (x, v1, v2, d) => {
      if (x <= 0) return 0; let s = 0; const lh = d / 2;
      for (let j = 0; j < 500; j++) { const w = Math.exp(poisLogW(j, lh)); const a1 = v1 + 2 * j, y = x * v1 / a1; s += w * (v1 / a1) * Math.exp((a1 / 2) * Math.log(a1 / v2) + (a1 / 2 - 1) * Math.log(y) - ((a1 + v2) / 2) * Math.log(1 + a1 * y / v2) - logBeta(a1 / 2, v2 / 2)); if (j > lh && w < 1e-15) break; }
      return s;
    }),
    ncfcdf: (a) => dist(a, [1, 1, 0], (x, v1, v2, d) => ncfcdfS(x, v1, v2, d)),
    ncfinv: (a) => dist(a, [1, 1, 0], (p, v1, v2, d) => invCdf(p, (x) => ncfcdfS(x, v1, v2, d), 0, Infinity)),
    ncfstat: (a, n) => {
      const v1 = asScalar(a[0]), v2 = asScalar(a[1]), d = asScalar(a[2]);
      const mean = v2 > 2 ? v2 * (v1 + d) / (v1 * (v2 - 2)) : NaN;
      const varr = v2 > 4 ? 2 * ((v1 + d) ** 2 + (v1 + 2 * d) * (v2 - 2)) / ((v2 - 2) ** 2 * (v2 - 4)) * (v2 / v1) ** 2 : NaN;
      return statRet(n, mean, varr);
    },

    // ── noncentral t: nctpdf(x,v,delta) — Lenth Poisson-series ──
    nctpdf: (a) => dist(a, [1, 0], (x, v, d) => nctpdfS(x, v, d)),
    nctcdf: (a) => dist(a, [1, 0], (x, v, d) => nctcdfS(x, v, d)),
    nctinv: (a) => dist(a, [1, 0], (p, v, d) => invCdf(p, (x) => nctcdfS(x, v, d), -Infinity, Infinity)),
    nctstat: (a, n) => {
      const v = asScalar(a[0]), d = asScalar(a[1]);
      const mean = v > 1 ? d * Math.sqrt(v / 2) * Math.exp(logGamma((v - 1) / 2) - logGamma(v / 2)) : NaN;
      const varr = v > 2 ? v * (1 + d * d) / (v - 2) - mean * mean : NaN;
      return statRet(n, mean, varr);
    },

    // ── MLE distribution fits (closed-form) ──
    expfit: (a) => { const x = toArray(m(a[0])); return ret(scalar(x.reduce((s, v) => s + v, 0) / x.length)); },
    poissfit: (a) => { const x = toArray(m(a[0])); return ret(scalar(x.reduce((s, v) => s + v, 0) / x.length)); },
    raylfit: (a) => { const x = toArray(m(a[0])); return ret(scalar(Math.sqrt(x.reduce((s, v) => s + v * v, 0) / (2 * x.length)))); },
    normfit: (a, n) => { const x = toArray(m(a[0])), N = x.length, mu = x.reduce((s, v) => s + v, 0) / N; const sd = Math.sqrt(x.reduce((s, v) => s + (v - mu) ** 2, 0) / (N - 1)); return n >= 2 ? Promise.resolve([scalar(mu), scalar(sd)]) : ret(scalar(mu)); },
    unifit: (a, n) => { const x = toArray(m(a[0])), lo = Math.min(...x), hi = Math.max(...x); return n >= 2 ? Promise.resolve([scalar(lo), scalar(hi)]) : ret(scalar(lo)); },
    binofit: (a) => { const M = m(a[0]), xa = toArray(M), na = toArray(m(a[1])); const out = xa.map((v, i) => v / (na.length === 1 ? na[0] : na[i])); return ret(out.length === 1 ? scalar(out[0]) : (M.rows === 1 ? rowVec(out) : colVec(out))); },
    wblfit: (a) => {
      const x = toArray(m(a[0])), N = x.length, meanlnx = x.reduce((s, v) => s + Math.log(v), 0) / N;
      let b = 1;
      for (let it = 0; it < 200; it++) {
        let s0 = 0, s1 = 0, s2 = 0; for (const v of x) { const xb = v ** b, lv = Math.log(v); s0 += xb; s1 += xb * lv; s2 += xb * lv * lv; }
        const f = s1 / s0 - 1 / b - meanlnx, df = (s2 * s0 - s1 * s1) / (s0 * s0) + 1 / (b * b), bn = b - f / df;
        if (Math.abs(bn - b) < 1e-12) { b = bn; break; } b = bn;
      }
      const aPar = (x.reduce((s, v) => s + v ** b, 0) / N) ** (1 / b);
      return ret(rowVec([aPar, b]));
    },
    lognfit: (a) => { const lx = toArray(m(a[0])).map(Math.log), N = lx.length, mu = lx.reduce((s, v) => s + v, 0) / N; return ret(rowVec([mu, Math.sqrt(lx.reduce((s, v) => s + (v - mu) ** 2, 0) / (N - 1))])); },
    gamfit: (a) => {
      const x = toArray(m(a[0])), N = x.length, meanx = x.reduce((s, v) => s + v, 0) / N, s = Math.log(meanx) - x.reduce((sm, v) => sm + Math.log(v), 0) / N;
      let ah = (3 - s + Math.sqrt((s - 3) ** 2 + 24 * s)) / (12 * s);
      for (let it = 0; it < 100; it++) { const f = Math.log(ah) - digamma(ah) - s, df = 1 / ah - trigamma(ah), an = ah - f / df; if (Math.abs(an - ah) < 1e-13) { ah = an; break; } ah = an; }
      return ret(rowVec([ah, meanx / ah]));
    },
    // ── multivariate normal pdf via Cholesky: (2π)^(-d/2)|Σ|^(-1/2) exp(-½(x-μ)Σ⁻¹(x-μ)ᵀ) ──
    mvnpdf: (a) => {
      const Xm = m(a[0]), d = Xm.cols, rowsX = matRows(Xm);
      const mu = a.length > 1 && isMat(a[1]) && m(a[1]).rows * m(a[1]).cols > 0 ? toArray(m(a[1])) : new Array(d).fill(0);
      let S: number[][];
      if (a.length > 2 && isMat(a[2]) && m(a[2]).rows * m(a[2]).cols > 0) { const Sm = m(a[2]); if (Sm.rows === 1 || Sm.cols === 1) { const dv = toArray(Sm); S = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? dv[i] : 0))); } else S = matRows(Sm); }
      else S = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? 1 : 0)));
      const L = Array.from({ length: d }, () => new Array(d).fill(0)); let logdet = 0;
      for (let i = 0; i < d; i++) for (let j = 0; j <= i; j++) { let s = S[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]; if (i === j) { L[i][j] = Math.sqrt(s); logdet += 2 * Math.log(L[i][j]); } else L[i][j] = s / L[j][j]; }
      const c = -0.5 * d * Math.log(2 * Math.PI) - 0.5 * logdet;
      const out = rowsX.map((x) => { const dx = x.map((v, i) => v - mu[i]), y = new Array(d); for (let i = 0; i < d; i++) { let s = dx[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; } return Math.exp(c - 0.5 * y.reduce((acc, v) => acc + v * v, 0)); });
      return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
    },
    // ── copulastat: rank correlation of a copula (Kendall default; Spearman via 'type') ──
    copulastat: (a) => {
      const rho = asScalar(a[1]); let type = 'kendall';
      for (let i = 2; i + 1 < a.length; i++) if (isMat(a[i]) && (a[i] as Mat).isChar && asString(a[i]).toLowerCase() === 'type') type = asString(a[i + 1]).toLowerCase();
      return ret(scalar(type === 'spearman' ? (6 / Math.PI) * Math.asin(rho / 2) : (2 / Math.PI) * Math.asin(rho)));
    },
    // ── copulapdf(family,U,params...) — density of the named copula at the rows of U ──
    copulapdf: (a) => {
      const fam = asString(a[0]).toLowerCase(); const U = m(a[1]); const rows = matRows(U); const d = U.cols;
      const inRange = (u: number[]) => u.every((v) => v >= 0 && v <= 1);
      if (fam === 'gaussian' || fam === 't') {
        let Rho = corrMat(a[2], d); const R = chol_(Rho); // R is lower; use as upper via transpose solve
        const logSqrtDet = R.reduce((s, _, i) => s + Math.log(R[i][i]), 0);
        const out = rows.map((u) => {
          if (!inRange(u)) return 0;
          if (fam === 'gaussian') {
            const x = u.map((v) => norminvStd(v)); const z = solveLowerT(R, x);
            return Math.exp(-0.5 * (z.reduce((s, v, i) => s + v * v - x[i] * x[i], 0)) - logSqrtDet);
          }
          const nu = asScalar(a[3]); const t = u.map((v) => tinvL(v, nu)); const z = solveLowerT(R, t);
          const cst = logGamma((nu + d) / 2) + (d - 1) * logGamma(nu / 2) - d * logGamma((nu + 1) / 2) - logSqrtDet;
          const numer = -((nu + d) / 2) * Math.log(1 + z.reduce((s, v) => s + v * v, 0) / nu);
          const denom = t.reduce((s, v) => s + (-((nu + 1) / 2) * Math.log(1 + v * v / nu)), 0);
          return Math.exp(cst + numer - denom);
        });
        return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
      }
      const alpha = asScalar(a[2]);
      const out = rows.map(([u1, u2]) => {
        if (!inRange([u1, u2])) return 0;
        if (fam === 'clayton') { if (alpha === 0) return 1; const logC = (-1 / alpha) * Math.log(u1 ** -alpha + u2 ** -alpha - 1); return (alpha + 1) * Math.exp((2 * alpha + 1) * logC - (alpha + 1) * (Math.log(u1) + Math.log(u2))); }
        if (fam === 'frank') { if (alpha === 0) return 1; return alpha * (1 - Math.exp(-alpha)) / (Math.cosh(alpha * (u2 - u1) / 2) * 2 - Math.exp(alpha * (u1 + u2 - 2) / 2) - Math.exp(-alpha * (u1 + u2) / 2)) ** 2; }
        // gumbel
        if (alpha === 1) return 1; const v1 = -Math.log(u1), v2 = -Math.log(u2); const vmin = Math.min(v1, v2), vmax = Math.max(v1, v2);
        const nlogC = vmax * (1 + (vmin / vmax) ** alpha) ** (1 / alpha);
        return (alpha - 1 + nlogC) * Math.exp(-nlogC + ((alpha - 1) * Math.log(v1) + v1) + ((alpha - 1) * Math.log(v2) + v2) + (1 - 2 * alpha) * Math.log(nlogC));
      });
      return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
    },
    // ── copulacdf(family,U,params...) — CDF of the named copula at the rows of U ──
    copulacdf: (a) => {
      const fam = asString(a[0]).toLowerCase(); const U = m(a[1]); const rows = matRows(U); const d = U.cols;
      if (fam === 'gaussian' || fam === 't') {
        const Rho = corrMat(a[2], d);
        const out = rows.map((u) => {
          if (fam === 'gaussian') { const x = u.map((v) => norminvStd(v)); return mvncdfG(Rho, x); }
          const nu = asScalar(a[3]); const t = u.map((v) => tinvL(v, nu)); return mvtcdfG(Rho, t, nu);
        });
        return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
      }
      const alpha = asScalar(a[2]);
      const out = rows.map(([u1, u2]) => {
        if (fam === 'clayton') { if (alpha === 0) return u1 * u2; return (u1 ** -alpha + u2 ** -alpha - 1) ** (-1 / alpha); }
        if (fam === 'frank') { if (alpha === 0) return u1 * u2; return -Math.log((Math.exp(-alpha) + (Math.exp(-alpha * (u1 + u2)) - (Math.exp(-alpha * u1) + Math.exp(-alpha * u2)))) / Math.expm1(-alpha)) / alpha; }
        if (alpha === 1) return u1 * u2; const v1 = -Math.log(u1), v2 = -Math.log(u2); const vmin = Math.min(v1, v2), vmax = Math.max(v1, v2);
        return Math.exp(-vmax * (1 + (vmin / vmax) ** alpha) ** (1 / alpha));
      });
      return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
    },
    // ── mvncdf: multivariate normal CDF P(X<=x) (Genz). mvncdf(X) | (X,mu,Sigma) | (xl,xu,mu,Sigma) ──
    mvncdf: (a) => {
      // rectangle form: mvncdf(xl, xu, mu, Sigma) — 4 args, first two same-size row/matrix bounds
      if (a.length === 4 && isMat(a[0]) && isMat(a[1])) {
        const XL = m(a[0]), XU = m(a[1]), d = XU.cols, rl = matRows(XL), ru = matRows(XU);
        const mu = toArray(m(a[2])), S = matRows(m(a[3]));
        const out = ru.map((xu, idx) => mvnRect(rl[idx], xu, mu, S));
        return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
      }
      const Xm = m(a[0]), d = Xm.cols, rows = matRows(Xm);
      const mu = a.length > 1 && isMat(a[1]) && numel(m(a[1])) > 0 ? toArray(m(a[1])) : new Array(d).fill(0);
      const S = a.length > 2 && isMat(a[2]) && numel(m(a[2])) > 0 ? matRows(m(a[2])) : Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? 1 : 0)));
      const out = rows.map((x) => mvncdfG(S, x.map((v, i) => v - mu[i])));
      return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
    },
    // ── mvtcdf: multivariate t CDF P(T<=x). mvtcdf(X,C,nu) | (xl,xu,C,nu) ──
    mvtcdf: (a) => {
      if (a.length >= 4 && isMat(a[0]) && isMat(a[1]) && numel(m(a[1])) === numel(m(a[0]))) {
        const XL = m(a[0]), XU = m(a[1]), rl = matRows(XL), ru = matRows(XU);
        const C = matRows(m(a[2])), nu = asScalar(a[3]);
        const out = ru.map((xu, idx) => mvtRect(rl[idx], xu, C, nu));
        return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
      }
      const Xm = m(a[0]), rows = matRows(Xm), C = matRows(m(a[1])), nu = asScalar(a[2]);
      const out = rows.map((x) => mvtcdfG(C, x, nu));
      return ret(out.length === 1 ? scalar(out[0]) : colVec(out));
    },
    // ── ecdf: empirical (Kaplan-Meier) CDF, no censoring. Returns [f,x] with f(1)=0, x(1)=x(2). ──
    ecdf: (a) => {
      const x = toArray(m(a[0])).slice().sort((p, q) => p - q), N = x.length;
      const fv: number[] = [0], xv: number[] = [x[0]];
      for (let i = 0; i < N; i++) { if (i > 0 && x[i] === x[i - 1]) continue; xv.push(x[i]); let cnt = 0; for (let j = 0; j < N; j++) if (x[j] <= x[i]) cnt++; fv.push(cnt / N); }
      return Promise.resolve([colVec(fv), colVec(xv)]);
    },
    // ── betafit: MLE of Beta(a,b). Solve ψ(a)-ψ(a+b)=mean(log x), ψ(b)-ψ(a+b)=mean(log(1-x)). ──
    betafit: (a) => {
      const x = toArray(m(a[0])), N = x.length;
      const L1 = x.reduce((s, v) => s + Math.log(v), 0) / N, L2 = x.reduce((s, v) => s + Math.log(1 - v), 0) / N;
      const mu = x.reduce((s, v) => s + v, 0) / N, vr = x.reduce((s, v) => s + (v - mu) ** 2, 0) / N, t = mu * (1 - mu) / vr - 1;
      let ah = Math.max(mu * t, 1e-3), bh = Math.max((1 - mu) * t, 1e-3);
      for (let it = 0; it < 200; it++) {
        const psiab = digamma(ah + bh), trab = trigamma(ah + bh);
        const g1 = digamma(ah) - psiab - L1, g2 = digamma(bh) - psiab - L2;
        const j11 = trigamma(ah) - trab, j12 = -trab, j22 = trigamma(bh) - trab;
        const det = j11 * j22 - j12 * j12, da = (j22 * g1 - j12 * g2) / det, db = (j11 * g2 - j12 * g1) / det;
        ah = Math.max(ah - da, 1e-6); bh = Math.max(bh - db, 1e-6);
        if (Math.abs(da) + Math.abs(db) < 1e-12) break;
      }
      return ret(rowVec([ah, bh]));
    },
    // ── nbinfit: MLE of negative binomial NB(r,p). Profile p=r/(r+x̄); Newton on dispersion r. ──
    nbinfit: (a) => {
      const x = toArray(m(a[0])), N = x.length, xbar = x.reduce((s, v) => s + v, 0) / N;
      const vr = x.reduce((s, v) => s + (v - xbar) ** 2, 0) / N;
      let r = vr > xbar ? xbar * xbar / (vr - xbar) : 100;
      for (let it = 0; it < 200; it++) {
        let g = N * Math.log(r / (r + xbar)), gp = N * xbar / (r * (r + xbar));
        for (const xi of x) { g += digamma(r + xi) - digamma(r); gp += trigamma(r + xi) - trigamma(r); }
        const rn = r - g / gp; if (!isFinite(rn) || rn <= 0) { r = r / 2; continue; }
        if (Math.abs(rn - r) < 1e-10) { r = rn; break; } r = rn;
      }
      return ret(rowVec([r, r / (r + xbar)]));
    },
    // ── descriptive: skewness/kurtosis (population, flag=1 default; flag=0 bias-corrected) ──
    skewness: (a) => {
      const x = toArray(m(a[0])), flag = a.length > 1 && isMat(a[1]) && m(a[1]).rows * m(a[1]).cols > 0 ? asScalar(a[1]) : 1, N = x.length;
      const mu = x.reduce((s, v) => s + v, 0) / N, m2 = x.reduce((s, v) => s + (v - mu) ** 2, 0) / N, m3 = x.reduce((s, v) => s + (v - mu) ** 3, 0) / N;
      let g = m3 / m2 ** 1.5; if (flag === 0) g = Math.sqrt(N * (N - 1)) / (N - 2) * g;
      return ret(scalar(g));
    },
    kurtosis: (a) => {
      const x = toArray(m(a[0])), flag = a.length > 1 && isMat(a[1]) && m(a[1]).rows * m(a[1]).cols > 0 ? asScalar(a[1]) : 1, N = x.length;
      const mu = x.reduce((s, v) => s + v, 0) / N, m2 = x.reduce((s, v) => s + (v - mu) ** 2, 0) / N, m4 = x.reduce((s, v) => s + (v - mu) ** 4, 0) / N;
      let k = m4 / m2 ** 2; if (flag === 0) k = ((N + 1) * k - 3 * (N - 1)) * (N - 1) / ((N - 2) * (N - 3)) + 3;
      return ret(scalar(k));
    },

    // ── moments ──
    /** moment(X,order) — central moment of the given order (along columns / vector). */
    moment: (a) => ret(colReduceNan(m(a[0]), (c) => { const k = Math.round(asScalar(a[1])); const mu = mean_(c); return c.reduce((s, x) => s + (x - mu) ** k, 0) / c.length; })),
    /** trimmean(X,percent) — mean after trimming percent/2 % from each tail. */
    trimmean: (a) => ret(colReduceNan(m(a[0]), (c) => { const p = asScalar(a[1]) / 100; const s = c.slice().sort((x, y) => x - y); const k = Math.floor((s.length * p) / 2); const t = s.slice(k, s.length - k); return t.reduce((q, x) => q + x, 0) / t.length; })),

    // ── descriptive (NaN-aware + extras) ──
    nanmean: (a) => ret(colReduceNan(m(a[0]), (c) => mean_(noNan(c)))),
    nansum: (a) => ret(colReduceNan(m(a[0]), (c) => noNan(c).reduce((s, x) => s + x, 0))),
    nanstd: (a) => ret(colReduceNan(m(a[0]), (c) => Math.sqrt(var_(noNan(c))))),
    nanvar: (a) => ret(colReduceNan(m(a[0]), (c) => var_(noNan(c)))),
    nanmedian: (a) => ret(colReduceNan(m(a[0]), (c) => median_(noNan(c)))),
    nanmax: (a) => ret(colReduceNan(m(a[0]), (c) => Math.max(...noNan(c)))),
    nanmin: (a) => ret(colReduceNan(m(a[0]), (c) => Math.min(...noNan(c)))),
    // range is identical to the base builtin — removed to avoid duplicate code (base wins). See DUPLICATE_POLICY.
    // ── distances / clustering ──
    // pdist/squareform are identical to the base builtins (base pdist honours the metric arg) —
    // removed to avoid duplicate code (base wins). See DUPLICATE_POLICY.
    /** haltonset(d[,'Skip',s][,'Leap',l]) — deterministic Halton low-discrepancy point set
     *  (base = the first d primes; unscrambled, matching MATLAB's default). */
    haltonset: (a) => {
      const d = Math.round(asScalar(m(a[0]))); let skip = 0, leap = 0;
      for (let i = 1; i + 1 < a.length; i += 2) { const k = asString(a[i]).toLowerCase(); if (k === 'skip') skip = Math.round(asScalar(a[i + 1])); else if (k === 'leap') leap = Math.round(asScalar(a[i + 1])); }
      return ret(makeObject('haltonset', new Map<string, Value>([['Type', str('halton')], ['Dimensions', scalar(d)], ['Skip', scalar(skip)], ['Leap', scalar(leap)]])));
    },
    /** net(p,n) — first n points (n×d) of a quasi-random point set p (Halton). */
    net: (a) => {
      if (!isObject(a[0])) throw new MatError('net: first argument must be a point set');
      const o = a[0]; const d = asScalar(o.props.get('Dimensions') ?? scalar(1)); const skip = asScalar(o.props.get('Skip') ?? scalar(0)); const leap = asScalar(o.props.get('Leap') ?? scalar(0));
      const n = Math.round(asScalar(m(a[1]))); const bases = firstPrimes(d);
      const radinv = (base: number, idx: number): number => { let f = 1 / base, r = 0, k = idx; while (k > 0) { r += f * (k % base); k = Math.floor(k / base); f /= base; } return r; };
      const out = zeros(n, d);
      for (let i = 0; i < n; i++) { const idx = skip + i * (leap + 1); for (let j = 0; j < d; j++) out.data[i + j * n] = radinv(bases[j], idx); }
      return ret(out);
    },
    /** [idx,d]=knnsearch(X,Y[,'K',k][,'Distance',metric][,'P',p]) — k nearest neighbours
     *  in X for each query row of Y (Euclidean by default; ties broken by lowest index). */
    knnsearch: (a, nargout) => {
      const X = matRows(m(a[0])); const Y = matRows(m(a[1]));
      let K = 1, metric = 'euclidean', pexp = 2; const opts = a.slice(2);
      for (let i = 0; i < opts.length; i++) { const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : ''; if (s === 'k') K = Math.round(asScalar(opts[++i])); else if (s === 'distance') metric = asString(opts[++i]).toLowerCase(); else if (s === 'p') pexp = asScalar(opts[++i]); }
      const f = METRICS[metric] ?? METRICS.euclidean;
      const idxRows: number[][] = [], dRows: number[][] = [];
      for (const q of Y) {
        const ds = X.map((row, i) => [f(q, row, pexp), i] as [number, number]).sort((u, v) => u[0] - v[0] || u[1] - v[1]);
        idxRows.push(ds.slice(0, K).map(([, i]) => i + 1));
        dRows.push(ds.slice(0, K).map(([d]) => d));
      }
      const idxMat = idxRows.length ? fromRows(idxRows) : zeros(0, K);
      if (nargout < 2) return ret(idxMat);
      return Promise.resolve([idxMat, dRows.length ? fromRows(dRows) : zeros(0, K)]);
    },
    /** linkage(Y[,method]) → (m-1)×3 agglomerative linkage matrix (single/complete/average). */
    linkage: (a) => {
      const A = m(a[0]); let n: number, D: number[][];
      if (A.rows === 1 || A.cols === 1) { const v = toArray(A); n = Math.round((1 + Math.sqrt(1 + 8 * v.length)) / 2); if (n * (n - 1) / 2 !== v.length) throw new MatError('linkage: input is not a valid condensed distance vector'); D = Array.from({ length: n }, () => new Array(n).fill(0)); let k = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { D[i][j] = v[k]; D[j][i] = v[k]; k++; } }
      else { const X = matRows(A); n = X.length; D = Array.from({ length: n }, () => new Array(n).fill(0)); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = METRICS.euclidean(X[i], X[j]); D[i][j] = d; D[j][i] = d; } }
      const method = a.length >= 2 ? asString(a[1]).toLowerCase() : 'single';
      const id = Array.from({ length: n }, (_, i) => i); const size = new Array(n).fill(1);
      const active = new Set(id); const dist2: Map<string, number> = new Map();
      const key = (i: number, j: number) => i < j ? `${i},${j}` : `${j},${i}`;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) dist2.set(key(i, j), D[i][j]);
      const Z: number[][] = []; let next = n;
      while (active.size > 1) {
        let best = Infinity, bi = -1, bj = -1; const arr = [...active];
        for (let x = 0; x < arr.length; x++) for (let y = x + 1; y < arr.length; y++) { const d = dist2.get(key(arr[x], arr[y]))!; if (d < best) { best = d; bi = arr[x]; bj = arr[y]; } }
        Z.push([Math.min(bi, bj), Math.max(bi, bj), best]);   // 0-based cluster ids (caller +1s for MATLAB)
        active.delete(bi); active.delete(bj);
        for (const k of active) {
          const dik = dist2.get(key(bi, k))!, djk = dist2.get(key(bj, k))!;
          const d = method === 'complete' ? Math.max(dik, djk) : method === 'average' ? (dik * size[bi] + djk * size[bj]) / (size[bi] + size[bj]) : Math.min(dik, djk);
          dist2.set(key(next, k), d);
        }
        size[next] = size[bi] + size[bj]; active.add(next); next++;
      }
      const out = zeros(Z.length, 3); Z.forEach((r, i) => { out.data[i] = r[0] + 1; out.data[i + Z.length] = r[1] + 1; out.data[i + 2 * Z.length] = r[2]; });
      return ret(out);
    },
    /** kmeans(X,k) → [idx, C, sumd]. Lloyd's algorithm, k-means++ init (labels may permute vs MATLAB; sizes match). */
    kmeans: (a, nargout) => {
      const X = matRows(m(a[0])); const k = Math.round(asScalar(a[1])); const n = X.length, dim = X[0]?.length ?? 0;
      if (n === 0) throw new MatError('kmeans: X must contain at least one observation');
      if (!Number.isFinite(k) || k < 1 || k > n) throw new MatError('kmeans: the number of clusters must be a positive integer no greater than the number of observations');
      const cen: number[][] = []; cen.push(X[Math.floor(rand() * n)].slice());
      while (cen.length < k) { const d2 = X.map((p) => Math.min(...cen.map((c) => METRICS.squaredeuclidean(p, c)))); const tot = d2.reduce((s, x) => s + x, 0); let r = rand() * tot, idx = 0; while (idx < n - 1 && (r -= d2[idx]) > 0) idx++; cen.push(X[idx].slice()); }
      const idx = new Array(n).fill(0);
      for (let it = 0; it < 100; it++) {
        let moved = false;
        for (let i = 0; i < n; i++) { let bj = 0, bd = Infinity; for (let j = 0; j < k; j++) { const d = METRICS.squaredeuclidean(X[i], cen[j]); if (d < bd) { bd = d; bj = j; } } if (idx[i] !== bj) { idx[i] = bj; moved = true; } }
        for (let j = 0; j < k; j++) { const pts = X.filter((_, i) => idx[i] === j); if (!pts.length) continue; for (let d = 0; d < dim; d++) cen[j][d] = pts.reduce((s, p) => s + p[d], 0) / pts.length; }
        if (!moved) break;
      }
      const idxOut = colVec(idx.map((j) => j + 1));
      if (nargout < 2) return ret(idxOut);
      const C = zeros(k, dim); for (let j = 0; j < k; j++) for (let d = 0; d < dim; d++) C.data[j + d * k] = cen[j][d];
      if (nargout < 3) return Promise.resolve([idxOut, C]);
      const sumd = colVec(Array.from({ length: k }, (_, j) => X.reduce((s, p, i) => s + (idx[i] === j ? METRICS.squaredeuclidean(p, cen[j]) : 0), 0)));
      return Promise.resolve([idxOut, C, sumd]);
    },
    // ── multivariate / regression ──
    /** [b,bint,r,rint,stats]=regress(y,X[,alpha]) — multiple linear regression by least squares. */
    regress: (a, nargout) => {
      const yv = toArray(m(a[0])); const Xm = matRows(m(a[1]));
      const n = Xm.length, p = Xm[0]?.length ?? 0;
      const alpha = a.length > 2 && isMat(a[2]) && numel(m(a[2])) ? asScalar(a[2]) : 0.05;
      // Normal equations: (X'X) b = X'y, with G = inv(X'X).
      const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
      const Xty = new Array<number>(p).fill(0);
      for (let i = 0; i < p; i++) {
        for (let r = 0; r < n; r++) Xty[i] += Xm[r][i] * yv[r];
        for (let j = 0; j < p; j++) { let s = 0; for (let r = 0; r < n; r++) s += Xm[r][i] * Xm[r][j]; XtX[i][j] = s; }
      }
      const b = solveLin(XtX, Xty);
      // G = inv(X'X) via solving against identity columns.
      const G: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
      for (let c = 0; c < p; c++) { const e = new Array<number>(p).fill(0); e[c] = 1; const col = solveLin(XtX, e); for (let i = 0; i < p; i++) G[i][c] = col[i]; }
      const yhat = Xm.map((row) => row.reduce((s, x, i) => s + x * b[i], 0));
      const r = yv.map((v, i) => v - yhat[i]);
      const nu = Math.max(0, n - p);
      const normr2 = r.reduce((s, x) => s + x * x, 0);
      const s2 = nu !== 0 ? normr2 / nu : NaN;                          // error variance estimate
      const tval = nu !== 0 ? tinvL(1 - alpha / 2, nu) : 0;
      const se = G.map((_, i) => Math.sqrt(s2 * G[i][i]));
      const bMat = colVec(b);
      if (nargout < 2) return ret(bMat);
      const bint = fromRows(b.map((bi, i) => [bi - tval * se[i], bi + tval * se[i]]));
      // rint: studentized residual CI (Belsley): sigmai per residual, hat-diagonal h_ii.
      const hdiag = Xm.map((row) => { let h = 0; for (let i = 0; i < p; i++) { let gi = 0; for (let j = 0; j < p; j++) gi += G[i][j] * row[j]; h += row[i] * gi; } return h; });
      const rint = (() => {
        const lo: number[] = [], hi: number[] = [];
        const tv2 = nu > 1 ? tinvL(1 - alpha / 2, nu - 1) : 0;
        for (let i = 0; i < n; i++) {
          let sigmai: number;
          if (nu > 1) { const denom = (nu - 1) * (1 - hdiag[i]); sigmai = denom > 0 ? Math.sqrt(Math.max(0, (nu * s2 / (nu - 1)) - (r[i] * r[i] / denom))) : 0; }
          else sigmai = 0;
          lo.push(r[i] - tv2 * sigmai); hi.push(r[i] + tv2 * sigmai);
        }
        return fromRows(lo.map((l, i) => [l, hi[i]]));
      })();
      const ybar = yv.reduce((s, v) => s + v, 0) / (n || 1);
      // Detect a constant column for the centered TSS, matching MATLAB.
      const hasIntercept = Array.from({ length: p }, (_, j) => Xm.every((row) => row[j] === Xm[0][j])).some((v) => v);
      const TSS = hasIntercept ? yv.reduce((s, v) => s + (v - ybar) ** 2, 0) : yv.reduce((s, v) => s + v * v, 0);
      const SSE = normr2;
      const r2 = 1 - SSE / TSS;
      const dfReg = hasIntercept ? p - 1 : p;
      const F = (r2 / dfReg) / ((1 - r2) / nu);
      const prob = fUpperTail(F, dfReg, nu);
      const stats = rowVec([r2, F, prob, s2]);
      return Promise.resolve([bMat, bint, colVec(r), rint, stats].slice(0, Math.max(1, nargout)));
    },
    /** [b,dev,stats]=glmfit(X,y,distr[,Name,Value]) — generalized linear model by IRLS.
     *  Supports 'normal'(identity),'binomial'(logit),'poisson'(log),'gamma'(reciprocal).
     *  Adds an intercept column by default ('constant','off' to suppress). For 'binomial',
     *  y may be a 2-column [successes trials] matrix; otherwise trials N=1. */
    glmfit: (a, nargout) => {
      const Xraw = matRows(m(a[0]));
      const distr = a.length > 2 && isStr(a[2]) ? asString(a[2]) : (a.length > 2 && isMat(a[2]) && (a[2] as Mat).isChar ? asString(a[2]) : 'normal');
      const spec = glmSpec(distr);
      // Name/Value options.
      let addConst = true;
      for (let i = 3; i + 1 < a.length; i += 2) {
        const k = asString(a[i]).toLowerCase();
        if (k === 'constant') { const v = asString(a[i + 1]).toLowerCase(); addConst = v !== 'off'; }
      }
      // Response (and binomial trial counts).
      const ymat = m(a[1]); const yrows = matRows(ymat);
      let y: number[]; let N: number[];
      if (distr.toLowerCase() === 'binomial' && ymat.cols === 2) {
        N = yrows.map((r) => r[1]); y = yrows.map((r, i) => (N[i] ? r[0] / N[i] : 0));
      } else { y = toArray(ymat); N = y.map(() => 1); }
      const nobs = Xraw.length;
      // Design matrix: prepend intercept column unless suppressed.
      const X = Xraw.map((row, i) => (addConst ? [1, ...row] : [...row]));
      const p = X[0]?.length ?? 0;
      // IRLS.
      const mu = y.map((yi, i) => clampMu(spec.init(yi, N[i]), spec));
      const eta = mu.map((mi) => spec.link(mi));
      let b = new Array<number>(p).fill(0);
      let dev = Infinity;
      for (let iter = 0; iter < 100; iter++) {
        const deta = mu.map((mi) => spec.dlink(mi));
        // working response z and IRLS weights w (= 1/(deta²·V)).
        const z = eta.map((ei, i) => ei + (y[i] - mu[i]) * deta[i]);
        const w = mu.map((mi, i) => { const sv = spec.sqrtvar(mi); const den = deta[i] * deta[i] * sv * sv; return den > 0 ? N[i] / den : 0; });
        // Weighted normal equations (X'WX) b = X'Wz.
        const XtWX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
        const XtWz = new Array<number>(p).fill(0);
        for (let r = 0; r < nobs; r++) {
          const wr = w[r];
          for (let i = 0; i < p; i++) { XtWz[i] += X[r][i] * wr * z[r]; for (let j = 0; j < p; j++) XtWX[i][j] += X[r][i] * wr * X[r][j]; }
        }
        const bnew = solveLin(XtWX, XtWz);
        for (let r = 0; r < nobs; r++) { let e = 0; for (let i = 0; i < p; i++) e += X[r][i] * bnew[i]; eta[r] = e; mu[r] = clampMu(spec.ilink(e), spec); }
        const devNew = y.reduce((s, yi, i) => s + N[i] * Math.max(0, spec.dev(mu[i], yi)), 0);
        const conv = Math.abs(devNew - dev) <= 1e-8 * (Math.abs(devNew) + 1);
        b = bnew; dev = devNew;
        if (conv && iter > 0) break;
      }
      const bV = colVec(b);
      if (nargout < 2) return ret(bV);
      // stats: build se, t, p, dfe from the final IRLS weights.
      const deta = mu.map((mi) => spec.dlink(mi));
      const w = mu.map((mi, i) => { const sv = spec.sqrtvar(mi); const den = deta[i] * deta[i] * sv * sv; return den > 0 ? N[i] / den : 0; });
      const XtWX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
      for (let r = 0; r < nobs; r++) for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) XtWX[i][j] += X[r][i] * w[r] * X[r][j];
      const dfe = Math.max(0, nobs - p);
      const dpsn = distr.toLowerCase();
      // dispersion: 1 for binomial/poisson, Pearson estimate otherwise.
      let s2 = 1;
      if (dpsn !== 'binomial' && dpsn !== 'poisson') {
        let chi2 = 0; for (let i = 0; i < nobs; i++) { const sv = spec.sqrtvar(mu[i]); const v = sv * sv / (N[i] || 1); chi2 += v > 0 ? (y[i] - mu[i]) * (y[i] - mu[i]) / v : 0; }
        s2 = dfe > 0 ? chi2 / dfe : NaN;
      }
      const Ginv: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
      for (let c = 0; c < p; c++) { const e = new Array<number>(p).fill(0); e[c] = 1; const col = solveLin(XtWX, e); for (let i = 0; i < p; i++) Ginv[i][c] = col[i]; }
      const se = b.map((_, i) => Math.sqrt(Math.max(0, s2 * Ginv[i][i])));
      const tstat = b.map((bi, i) => (se[i] > 0 ? bi / se[i] : NaN));
      const useT = dpsn !== 'binomial' && dpsn !== 'poisson';
      const pval = tstat.map((t) => (useT ? (dfe > 0 ? 2 * (1 - tcdfL(Math.abs(t), dfe)) : NaN) : 2 * normcdfL(-Math.abs(t))));
      const resid = y.map((yi, i) => yi - mu[i]);
      const stats = mkStruct([
        ['beta', colVec(b)], ['dfe', scalar(dfe)], ['sfit', scalar(Math.sqrt(s2))], ['s', scalar(Math.sqrt(s2))],
        ['estdisp', bool(useT)], ['se', colVec(se)], ['t', colVec(tstat)], ['p', colVec(pval)],
        ['resid', colVec(resid)],
      ]);
      return Promise.resolve([bV, scalar(dev), stats].slice(0, Math.max(1, nargout)));
    },
    /** [coeff,score,latent,tsquared,explained,mu]=pca(X) — principal component analysis (SVD on centered X). */
    pca: (a, nargout) => {
      const X = matRows(m(a[0])); const n = X.length, p = X[0]?.length ?? 0;
      const mu = new Array<number>(p).fill(0);
      for (let j = 0; j < p; j++) { for (let i = 0; i < n; i++) mu[j] += X[i][j]; mu[j] /= (n || 1); }
      const Xc = X.map((row) => row.map((v, j) => v - mu[j]));            // centered
      // Eigendecomposition of the (p×p) covariance matrix C = Xc'Xc/(n-1).
      const dof = Math.max(1, n - 1);
      const C: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
      for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) { let s = 0; for (let r = 0; r < n; r++) s += Xc[r][i] * Xc[r][j]; C[i][j] = s / dof; }
      const { d, V } = symEig(C);
      // Sort eigenpairs by descending eigenvalue.
      const order = d.map((_, i) => i).sort((x, y) => d[y] - d[x]);
      const ncomp = Math.min(p, n - 1);                                  // MATLAB keeps min(p, n-1) components
      const latent: number[] = [], coeff: number[][] = Array.from({ length: p }, () => [] as number[]);
      for (let k = 0; k < ncomp; k++) {
        const o = order[k]; let lam = d[o]; if (lam < 0) lam = 0;
        // sign convention: largest-magnitude loading positive
        let mi = 0; for (let i = 1; i < p; i++) if (Math.abs(V[i][o]) > Math.abs(V[mi][o])) mi = i;
        const sgn = V[mi][o] < 0 ? -1 : 1;
        latent.push(lam);
        for (let i = 0; i < p; i++) coeff[i].push(sgn * V[i][o]);
      }
      const coeffMat = fromRows(coeff);
      if (nargout < 2) return ret(coeffMat);
      // score = Xc * coeff
      const score: number[][] = Xc.map((row) => coeff[0].map((_, k) => { let s = 0; for (let i = 0; i < p; i++) s += row[i] * coeff[i][k]; return s; }));
      const scoreMat = score.length ? fromRows(score) : zeros(0, ncomp);
      if (nargout < 3) return Promise.resolve([coeffMat, scoreMat]);
      const latMat = colVec(latent);
      if (nargout < 4) return Promise.resolve([coeffMat, scoreMat, latMat]);
      // Hotelling T²: Σ_k score(i,k)²/latent(k) over components with latent>0.
      const tsq = score.map((row) => row.reduce((s, sc, k) => s + (latent[k] > 1e-12 ? sc * sc / latent[k] : 0), 0));
      const tsqMat = colVec(tsq);
      if (nargout < 5) return Promise.resolve([coeffMat, scoreMat, latMat, tsqMat]);
      const tot = latent.reduce((s, x) => s + x, 0) || 1;
      const explained = colVec(latent.map((x) => 100 * x / tot));
      if (nargout < 6) return Promise.resolve([coeffMat, scoreMat, latMat, tsqMat, explained]);
      return Promise.resolve([coeffMat, scoreMat, latMat, tsqMat, explained, rowVec(mu)]);
    },
    /** [p,tbl,stats]=anova1(X[,group][,displayopt]) — one-way ANOVA (matrix columns = groups). */
    anova1: (a, nargout) => {
      // Build groups: matrix → columns are groups; vector + group labels → by label.
      const groups: number[][] = [];
      const X0 = m(a[0]);
      const grpArg = a.length > 1 && a[1] !== undefined && !(isMat(a[1]) && (a[1] as Mat).isChar) && numel(m(a[1])) ? a[1] : undefined;
      if (grpArg !== undefined && (X0.rows === 1 || X0.cols === 1)) {
        const xv = toArray(X0); const gv = toArray(m(grpArg)).map((v) => v);
        const labels: number[] = []; const byLab = new Map<number, number[]>();
        for (let i = 0; i < xv.length; i++) { const key = gv[i]; if (!byLab.has(key)) { byLab.set(key, []); labels.push(key); } byLab.get(key)!.push(xv[i]); }
        for (const k of labels) groups.push(byLab.get(k)!.filter((v) => !Number.isNaN(v)));
      } else {
        const cols = matRows(X0); const ncol = X0.cols;
        for (let c = 0; c < ncol; c++) groups.push(cols.map((row) => row[c]).filter((v) => !Number.isNaN(v)));
      }
      const k = groups.length;
      const grandN = groups.reduce((s, g) => s + g.length, 0);
      const grandMean = groups.reduce((s, g) => s + g.reduce((t, x) => t + x, 0), 0) / (grandN || 1);
      let SSB = 0, SSW = 0;
      for (const g of groups) { const gm = g.reduce((s, x) => s + x, 0) / (g.length || 1); SSB += g.length * (gm - grandMean) ** 2; for (const x of g) SSW += (x - gm) ** 2; }
      const dfB = k - 1, dfW = grandN - k;
      const MSB = SSB / dfB, MSW = SSW / dfW;
      const F = MSB / MSW;
      const p = fUpperTail(F, dfB, dfW);
      if (nargout < 2) return ret(scalar(p));
      // Minimal cell-array ANOVA table (4×6): header + Groups/Error/Total rows.
      const rowsArr: Value[][] = [
        ['Source', 'SS', 'df', 'MS', 'F', 'Prob>F'].map((s) => str(s)),
        [str('Groups'), scalar(SSB), scalar(dfB), scalar(MSB), scalar(F), scalar(p)],
        [str('Error'), scalar(SSW), scalar(dfW), scalar(MSW), str(''), str('')],
        [str('Total'), scalar(SSB + SSW), scalar(grandN - 1), str(''), str(''), str('')],
      ];
      const tblItems: Value[] = []; for (let c = 0; c < 6; c++) for (let rr = 0; rr < 4; rr++) tblItems.push(rowsArr[rr][c]);
      const tbl: Value = makeCell(4, 6, tblItems) as unknown as Value;
      if (nargout < 3) return Promise.resolve([scalar(p), tbl]);
      const meansArr = groups.map((g) => g.reduce((s, x) => s + x, 0) / (g.length || 1));
      const stats = mkStruct([['gnames', str('')], ['n', rowVec(groups.map((g) => g.length))], ['source', str('anova1')],
        ['means', rowVec(meansArr)], ['df', scalar(dfW)], ['s', scalar(Math.sqrt(MSW))]]);
      return Promise.resolve([scalar(p), tbl, stats]);
    },
    /** [h,p,stats]=chi2gof(x,...) — chi-square goodness-of-fit test.
     *  Fully supports the controlled form ('Ctrs'/'Edges'+'Frequency'+'Expected'+'NParams'):
     *  chi2 = Σ(O−E)²/E over bins (low-expected tail bins pooled at 'Emin', default 5),
     *  df = nbins−1−NParams. The raw-data default (auto-bin + fit normal) is best-effort. */
    chi2gof: (a, nargout) => {
      let freq: number[] | null = null, expected: number[] | null = null;
      let ctrs: number[] | null = null, edges: number[] | null = null;
      let nparams: number | null = null, emin = 5, nbins = 10, alpha = 0.05;
      const opts = a.slice(1);
      for (let i = 0; i < opts.length; i++) {
        const s = isMat(opts[i]) && (opts[i] as Mat).isChar ? asString(opts[i]).toLowerCase() : '';
        if (s === 'frequency') freq = toArray(m(opts[++i]));
        else if (s === 'expected') expected = toArray(m(opts[++i]));
        else if (s === 'ctrs') ctrs = toArray(m(opts[++i]));
        else if (s === 'edges') edges = toArray(m(opts[++i]));
        else if (s === 'nparams') nparams = Math.round(asScalar(opts[++i]));
        else if (s === 'emin') emin = asScalar(opts[++i]);
        else if (s === 'nbins') nbins = Math.round(asScalar(opts[++i]));
        else if (s === 'alpha') alpha = asScalar(opts[++i]);
      }
      const ctrsToEdges = (c: number[]): number[] => { const e = [c[0] - (c[1] - c[0]) / 2]; for (let i = 0; i < c.length - 1; i++) e.push((c[i] + c[i + 1]) / 2); e.push(c[c.length - 1] + (c[c.length - 1] - c[c.length - 2]) / 2); return e; };
      let O: number[]; let ed: number[] | null = edges ? edges.slice() : (ctrs ? ctrsToEdges(ctrs) : null);
      const rawX = toArray(m(a[0])).filter((v) => !Number.isNaN(v));
      if (freq) O = freq.slice();
      else {
        if (!ed) { const lo = Math.min(...rawX), hi = Math.max(...rawX); ed = []; for (let i = 0; i <= nbins; i++) ed.push(lo + (hi - lo) * i / nbins); }
        O = new Array(ed.length - 1).fill(0);
        for (const v of rawX) { let b = 0; while (b < ed.length - 2 && v >= ed[b + 1]) b++; O[b]++; }
      }
      let E: number[]; let np: number;
      if (expected) { E = expected.slice(); np = nparams ?? 0; }
      else {
        const N = rawX.length, mu = mean_(rawX), sg = sd_(rawX); E = [];
        const eUse = ed ?? ctrsToEdges(O.map((_, i) => i + 1));
        for (let i = 0; i < O.length; i++) { const lo = i === 0 ? -Infinity : eUse[i], hi = i === O.length - 1 ? Infinity : eUse[i + 1]; E.push(N * (normcdfL((hi - mu) / sg) - normcdfL((lo - mu) / sg))); }
        np = nparams ?? 2;
      }
      O = O.slice(); E = E.slice();   // pool low-expected bins inward from both tails
      while (E.length > 1 && E[0] < emin) { E[1] += E[0]; O[1] += O[0]; E.shift(); O.shift(); }
      while (E.length > 1 && E[E.length - 1] < emin) { E[E.length - 2] += E[E.length - 1]; O[O.length - 2] += O[O.length - 1]; E.pop(); O.pop(); }
      const chi2 = O.reduce((s, o, i) => s + (E[i] > 0 ? (o - E[i]) ** 2 / E[i] : 0), 0);
      const df = Math.max(0, O.length - 1 - np);
      const p = df > 0 ? Math.min(1, Math.max(0, 1 - gammainc(chi2 / 2, df / 2))) : NaN;
      const h = df > 0 ? (p <= alpha ? 1 : 0) : 0;
      const stats = mkStruct([['chi2stat', scalar(chi2)], ['df', scalar(df)], ['edges', ed ? rowVec(ed) : undefined], ['O', rowVec(O)], ['E', rowVec(E)]]);
      return Promise.resolve([scalar(h), scalar(p), stats].slice(0, Math.max(1, nargout)));
    },
    // ── distribution objects (exercise the generic ClassV object type) ──
    /** makedist('Normal','mu',0,'sigma',1) → a prob.<Name>Distribution object. */
    makedist: (a) => {
      const spec = DISTS[normDistName(asString(a[0]))];
      if (!spec) throw new MatError(`makedist: unsupported distribution '${asString(a[0])}'`);
      const props = new Map<string, Value>([['DistributionName', str(`${spec.display}Distribution`)]]);
      spec.params.forEach((p, i) => props.set(p, scalar(spec.defaults[i])));
      for (let i = 1; i + 1 < a.length; i += 2) { const k = asString(a[i]); if (spec.params.includes(k)) props.set(k, scalar(asScalar(a[i + 1]))); }
      return ret(makeObject(`prob.${spec.display}Distribution`, props));
    },
    /** fitdist(x,'Name') — fit a distribution to data by maximum likelihood → prob.<Name>Distribution. */
    fitdist: (a) => {
      const x = toArray(m(a[0])).filter((v) => !Number.isNaN(v)); const N = x.length;
      const name = normDistName(asString(a[1])); const spec = DISTS[name];
      if (!spec) throw new MatError(`fitdist: unsupported distribution '${asString(a[1])}'`);
      const mean = x.reduce((s, v) => s + v, 0) / (N || 1);
      const props = new Map<string, Value>([['DistributionName', str(`${spec.display}Distribution`)]]);
      const sd1 = () => Math.sqrt(x.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, N - 1));
      if (name === 'normal') { props.set('mu', scalar(mean)); props.set('sigma', scalar(sd1())); }
      else if (name === 'exponential') { props.set('mu', scalar(mean)); }
      else if (name === 'poisson') { props.set('lambda', scalar(mean)); }
      else if (name === 'rayleigh') { props.set('b', scalar(Math.sqrt(x.reduce((s, v) => s + v * v, 0) / (2 * N)))); }
      else if (name === 'lognormal') { const lx = x.map((v) => Math.log(v)); const lm = lx.reduce((s, v) => s + v, 0) / N; props.set('mu', scalar(lm)); props.set('sigma', scalar(Math.sqrt(lx.reduce((s, v) => s + (v - lm) ** 2, 0) / Math.max(1, N - 1)))); }
      else spec.params.forEach((p, i) => props.set(p, scalar(spec.defaults[i])));   // fallback: defaults
      return ret(makeObject(`prob.${spec.display}Distribution`, props));
    },
    /** random('Name',p1,…,pk[,m,n]) or random(pd,…) — draw samples via the inverse CDF.
     *  RNG-based, so values won't bit-match MATLAB, but the distribution & size are correct. */
    random: (a) => {
      let spec: DistSpec, params: number[], szArgs: Value[];
      if (isObject(a[0])) { const o0 = a[0] as { className: string; props: Map<string, Value> }; spec = DISTS[normDistName(o0.className.replace(/^prob\./, '').replace(/Distribution$/, ''))]; params = spec.params.map((p) => asScalar(o0.props.get(p) ?? scalar(0))); szArgs = a.slice(1); }
      else { const nm = normDistName(asString(a[0])); spec = DISTS[nm]; if (!spec) throw new MatError(`random: unsupported distribution '${asString(a[0])}'`); const np = spec.params.length; params = spec.params.map((_, i) => a.length > 1 + i && isMat(a[1 + i]) && !(a[1 + i] as Mat).isChar ? asScalar(a[1 + i]) : spec.defaults[i]); szArgs = a.slice(1 + np); }
      let rows = 1, cols = 1;
      if (szArgs.length === 1) { const sz = toArray(m(szArgs[0])); if (sz.length >= 2) { rows = Math.round(sz[0]); cols = Math.round(sz[1]); } else { rows = cols = Math.round(sz[0]); } }
      else if (szArgs.length >= 2) { rows = Math.round(asScalar(szArgs[0])); cols = Math.round(asScalar(szArgs[1])); }
      const out = zeros(rows, cols);
      for (let i = 0; i < rows * cols; i++) out.data[i] = spec.inv(Math.random(), ...params);
      return ret(out);
    },
    /** pdf(pd,x) or pdf('Name',x,p1,p2) — probability density. */
    pdf: (a) => { const { spec, vals, rest } = resolveDist(a); return ret(map(m(rest[0]), (x) => spec.pdf(x, ...vals))); },
    /** cdf(pd,x) or cdf('Name',x,p1,p2) — cumulative probability. */
    cdf: (a) => { const { spec, vals, rest } = resolveDist(a); return ret(map(m(rest[0]), (x) => spec.cdf(x, ...vals))); },
    /** icdf(pd,p) or icdf('Name',p,p1,p2) — inverse cumulative (quantile). */
    icdf: (a) => { const { spec, vals, rest } = resolveDist(a); return ret(map(m(rest[0]), (p) => spec.inv(p, ...vals))); },

    /** [C,order]=confusionmat(g,ghat[,'Order',order]) — confusion matrix (rows=true, cols=predicted).
     *  Classes appear in sorted order of the unique labels of [g;ghat] (grp2idx convention). */
    confusionmat: (a, nargout) => {
      const lg = labelKeys(a[0]); const lp = labelKeys(a[1]);
      const cmp = lg.cmp;
      // 'Order' name/value pair overrides the class order.
      let order: string[] | null = null;
      for (let i = 2; i + 1 < a.length; i += 2) {
        const isName = isStr(a[i]) || (isMat(a[i]) && (a[i] as Mat).isChar);
        if (isName && asString(a[i]).toLowerCase() === 'order') order = labelKeys(a[i + 1]).keys;
      }
      const classes = order ?? uniqueLabels([...lg.keys, ...lp.keys], cmp);
      const idx = new Map<string, number>(); classes.forEach((c, i) => idx.set(c, i));
      const k = classes.length;
      const C = Array.from({ length: k }, () => new Array<number>(k).fill(0));
      const isMissing = (s: string) => s === 'NaN' || s === '' || s === 'undefined';
      for (let r = 0; r < lg.keys.length; r++) {
        const gi = idx.get(lg.keys[r]); const pi = idx.get(lp.keys[r]);
        if (gi === undefined || pi === undefined || isMissing(lg.keys[r]) || isMissing(lp.keys[r])) continue;
        C[gi][pi]++;
      }
      const Cmat = fromRows(C);
      if (nargout < 2) return ret(Cmat);
      // Order output: same type as the inputs.
      const ord: Value = lg.numeric ? colVec(classes.map(Number))
        : makeCell(classes.length, 1, classes.map((s) => str(s)));
      return Promise.resolve([Cmat, ord]);
    },

    /** D=dummyvar(g) — one-hot/dummy matrix: n×k with D(i,g(i))=1 for integer groups (k=max(g)).
     *  For a categorical-like (cellstr / string) group, k=#unique labels in sorted order. */
    dummyvar: (a) => {
      const lab = labelKeys(a[0]);
      if (lab.numeric) {                                  // integer codes → column = code, k = max code
        const codes = lab.keys.map(Number);
        const k = codes.reduce((mx, x) => Math.max(mx, x), 0);
        const n = codes.length;
        const D = zeros(n, k);
        for (let i = 0; i < n; i++) { const c = codes[i]; if (c >= 1 && c <= k && Number.isInteger(c)) D.data[i + (c - 1) * n] = 1; }
        return ret(D);
      }
      const classes = uniqueLabels(lab.keys, lab.cmp);
      const idx = new Map<string, number>(); classes.forEach((c, i) => idx.set(c, i));
      const n = lab.keys.length; const D = zeros(n, classes.length);
      for (let i = 0; i < n; i++) { const c = idx.get(lab.keys[i]); if (c !== undefined) D.data[i + c * n] = 1; }
      return ret(D);
    },

    /** d=mahal(Y,X) — squared Mahalanobis distance of each row of Y to the distribution of X:
     *  d_i = (y_i-mu)·inv(cov(X))·(y_i-mu)'. */
    mahal: (a) => {
      const Y = matRows(m(a[0])); const X = matRows(m(a[1]));   // d2 = mahal(Y,X): Y query points, X reference sample
      const n = X.length, p = X[0]?.length ?? 0;
      const mu = new Array<number>(p).fill(0);
      for (const row of X) for (let j = 0; j < p; j++) mu[j] += row[j] / n;
      // Sample covariance (divisor n-1).
      const Cov = Array.from({ length: p }, () => new Array<number>(p).fill(0));
      for (const row of X) for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) Cov[i][j] += (row[i] - mu[i]) * (row[j] - mu[j]) / (n - 1);
      const out: number[] = [];
      for (const y of Y) {
        const c = y.map((v, j) => v - mu[j]);
        const z = solveLin(Cov.map((r) => r.slice()), c.slice());   // z = inv(Cov)·c
        out.push(c.reduce((s, ci, j) => s + ci * z[j], 0));
      }
      return ret(colVec(out));
    },

    /** [b,stats]=robustfit(X,y[,wfun][,tune][,const]) — robust regression via IRLS (bisquare default,
     *  tune 4.685). Adds an intercept column by default ('off' to suppress). Mirrors statrobustfit. */
    robustfit: (a, nargout) => {
      const X0 = matRows(m(a[0])); const yv = toArray(m(a[1]));
      const wname = a.length > 2 && (isStr(a[2]) || (isMat(a[2]) && (a[2] as Mat).isChar)) ? asString(a[2]).toLowerCase() : 'bisquare';
      const WFUNS = ROBUST_WFUNS;
      const wspec = WFUNS[wname] ?? WFUNS.bisquare;
      const tune = a.length > 3 && isMat(a[3]) && numel(m(a[3])) ? asScalar(a[3]) : wspec.tune;
      const addConst = !(a.length > 4 && (isStr(a[4]) || (isMat(a[4]) && (a[4] as Mat).isChar)) && asString(a[4]).toLowerCase() === 'off');
      const n = X0.length;
      const X = X0.map((row) => (addConst ? [1, ...row] : [...row]));
      const p = X[0]?.length ?? 0;
      const wfun = wspec.w;

      // OLS solution via normal equations; G = inv(X'X) for leverage + standard errors.
      const olsFit = (Xm: number[][], wts: number[]): number[] => {
        const XtX = Array.from({ length: p }, () => new Array<number>(p).fill(0));
        const Xty = new Array<number>(p).fill(0);
        for (let r = 0; r < n; r++) { const w = wts[r]; for (let i = 0; i < p; i++) { Xty[i] += w * Xm[r][i] * yv[r]; for (let j = 0; j < p; j++) XtX[i][j] += w * Xm[r][i] * Xm[r][j]; } }
        return solveLin(XtX, Xty);
      };
      const ones = new Array<number>(n).fill(1);
      // Leverage h = diag(X·inv(X'X)·X') and adjfactor.
      const XtX0 = Array.from({ length: p }, () => new Array<number>(p).fill(0));
      for (let r = 0; r < n; r++) for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) XtX0[i][j] += X[r][i] * X[r][j];
      const G: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
      for (let c = 0; c < p; c++) { const e = new Array<number>(p).fill(0); e[c] = 1; const col = solveLin(XtX0.map((r) => r.slice()), e); for (let i = 0; i < p; i++) G[i][c] = col[i]; }
      const hLev = X.map((row) => { let h = 0; for (let i = 0; i < p; i++) { let gi = 0; for (let j = 0; j < p; j++) gi += G[i][j] * row[j]; h += row[i] * gi; } return Math.min(0.9999, h); });
      const adj = hLev.map((h) => 1 / Math.sqrt(1 - h));

      const dfe = n - p;
      const predict = (b: number[]) => X.map((row) => row.reduce((s, x, i) => s + x * b[i], 0));
      const olsB = olsFit(X, ones);
      const olsResid = yv.map((v, i) => v - predict(olsB)[i]);
      const ols_s = Math.sqrt(olsResid.reduce((s, x) => s + x * x, 0)) / Math.sqrt(dfe);
      const stdY = Math.sqrt(var_(yv));
      let tiny_s = 1e-6 * stdY; if (tiny_s === 0) tiny_s = 1;
      const madsigma = (r: number[]): number => {
        const rs = r.map(Math.abs).sort((x, y) => x - y);
        return median_(rs.slice(Math.max(0, p - 1))) / 0.6745;   // rs(max(1,p):end) → 0-based slice from p-1
      };

      let b = olsB.slice(); let b0 = new Array<number>(p).fill(0);
      let w = ones.slice();
      const D = Math.sqrt(EPS);
      for (let iter = 0; iter < 50; iter++) {
        const conv = iter > 0 && b.every((bi, i) => Math.abs(bi - b0[i]) <= D * Math.max(Math.abs(bi), Math.abs(b0[i])));
        if (conv) break;
        const yhat = predict(b);
        const radj = yv.map((v, i) => (v - yhat[i]) * adj[i]);
        const s = madsigma(radj);
        w = radj.map((rr) => wfun(rr / (Math.max(s, tiny_s) * tune)));
        b0 = b.slice();
        b = olsFit(X, w);
      }
      const bMat = colVec(b);
      if (nargout < 2) return ret(bMat);

      // stats: robust sigma (DuMouchel & O'Brien shrink toward OLS), SE, t, p.
      const resid = yv.map((v, i) => v - predict(b)[i]);
      const radj = resid.map((rr, i) => rr * adj[i]);
      const mad_s = madsigma(radj);
      const robust_s = mad_s;   // approximate robust scale by MAD estimate
      const sigma = Math.max(robust_s, Math.sqrt((ols_s * ols_s * p * p + robust_s * robust_s * n) / (p * p + n)));
      const se = G.map((_, i) => Math.sqrt(Math.max(EPS, G[i][i] * sigma * sigma)));
      const tstat = b.map((bi, i) => (se[i] > 0 ? bi / se[i] : NaN));
      const pval = tstat.map((t) => 2 * tcdfL(-Math.abs(t), dfe));
      const covb = fromRows(G.map((row) => row.map((g) => g * sigma * sigma)));
      const stats = mkStruct([
        ['ols_s', scalar(ols_s)], ['robust_s', scalar(robust_s)], ['mad_s', scalar(mad_s)], ['s', scalar(sigma)],
        ['resid', colVec(resid)], ['se', colVec(se)], ['covb', covb], ['t', colVec(tstat)], ['p', colVec(pval)],
        ['w', colVec(w)], ['dfe', scalar(dfe)], ['h', colVec(hLev)],
      ]);
      return Promise.resolve([bMat, stats]);
    },

    // ── pcares(X,ndim): PCA residuals and reconstruction ──
    pcares: (a, nargout) => {
      const X = m(a[0]); const ndim = Math.round(asScalar(a[1]));
      const nr = X.rows, nc = X.cols;
      // Center X column-wise
      const mu: number[] = [];
      for (let c = 0; c < nc; c++) { let s = 0; for (let r = 0; r < nr; r++) s += X.data[r + c * nr]; mu.push(s / nr); }
      const Xc = mat(nr, nc, new Float64Array(nr * nc));
      for (let c = 0; c < nc; c++) for (let r = 0; r < nr; r++) Xc.data[r + c * nr] = X.data[r + c * nr] - mu[c];
      // SVD of centered matrix; first ndim PCs are the first ndim right-singular vectors (V columns)
      const { V } = svd(Xc);
      // Reconstruct from ndim PCs: proj = Xc * V_k * V_k'
      const k = Math.min(ndim, V.cols);
      // V_k is the first k columns of V (nc × k)
      const VkData = new Float64Array(nc * k);
      for (let c = 0; c < k; c++) for (let r = 0; r < nc; r++) VkData[r + c * nc] = V.data[r + c * nc];
      const Vk = mat(nc, k, VkData);
      // scores = Xc * Vk (nr × k)
      const scores = matmul(Xc, Vk);
      // recon_centered = scores * Vk' (nr × nc)
      const VkT = transpose(Vk);
      const reconCentered = matmul(scores, VkT);
      // Add back column means to get reconstructed X
      const reconst = mat(nr, nc, new Float64Array(nr * nc));
      for (let c = 0; c < nc; c++) for (let r = 0; r < nr; r++) reconst.data[r + c * nr] = reconCentered.data[r + c * nr] + mu[c];
      // Residuals = X - reconst
      const resid = mat(nr, nc, new Float64Array(nr * nc));
      for (let i = 0; i < nr * nc; i++) resid.data[i] = X.data[i] - reconst.data[i];
      return Promise.resolve([resid, reconst].slice(0, Math.max(1, nargout)));
    },

    // ── ksdensity(x[,xi],...): kernel density estimate ──
    ksdensity: (a, nargout) => {
      const xv = toArray(m(a[0])); const n = xv.length;
      // Parse trailing Name-Value pairs
      let kernelName = 'normal', bwOverride = NaN, fnType = 'pdf';
      let evalPts: number[] | null = null;
      // second positional arg may be evaluation points (numeric, non-string)
      let argIdx = 1;
      if (a.length > 1 && isMat(a[1]) && !(a[1] as Mat).isChar) { evalPts = toArray(m(a[1])); argIdx = 2; }
      for (let i = argIdx; i + 1 < a.length; i += 2) {
        const key = asString(a[i]).toLowerCase();
        if (key === 'kernel') kernelName = asString(a[i + 1]).toLowerCase();
        else if (key === 'bandwidth') bwOverride = asScalar(a[i + 1]);
        else if (key === 'function') fnType = asString(a[i + 1]).toLowerCase();
      }
      // Silverman bandwidth with robust sigma (min(std, iqr/1.349))
      // MATLAB uses Hazen (p/100)*n + 0.5 quantile formula (prctile default)
      const mu0 = xv.reduce((s, v) => s + v, 0) / n;
      const sig = Math.sqrt(xv.reduce((s, v) => s + (v - mu0) ** 2, 0) / (n - 1 || 1));
      const sorted = xv.slice().sort((p, q) => p - q);
      const hazenQ = (pct: number): number => {
        const r = (pct / 100) * n + 0.5;
        const k = Math.max(1, Math.min(n, Math.floor(r)));
        const kp1 = Math.max(1, Math.min(n, k + 1));
        const frac = Math.max(0, Math.min(1, r - k));
        return sorted[k - 1] * (1 - frac) + sorted[kp1 - 1] * frac;
      };
      const iqr = hazenQ(75) - hazenQ(25);
      const robustSig = Math.min(sig, iqr > 0 ? iqr / 1.349 : sig);
      // MATLAB uses (4/(3*n))^(1/5) * robustSig — equivalent to (4/3)^(1/5) * n^(-1/5) * sig
      const h = isNaN(bwOverride) ? Math.pow(4 / (3 * n), 0.2) * robustSig : bwOverride;
      // Evaluation grid: 100 points spanning data ± 3h (if not provided)
      if (evalPts === null) {
        const lo = Math.min(...xv) - 3 * h, hi = Math.max(...xv) + 3 * h;
        evalPts = Array.from({ length: 100 }, (_, i) => lo + (hi - lo) * i / 99);
      }
      // Kernel functions
      const kfn = (u: number) => {
        if (kernelName === 'box' || kernelName === 'uniform') return Math.abs(u) <= 1 ? 0.5 : 0;
        if (kernelName === 'triangle' || kernelName === 'triangular') return Math.abs(u) < 1 ? 1 - Math.abs(u) : 0;
        if (kernelName === 'epanechnikov') return Math.abs(u) < 1 ? 0.75 * (1 - u * u) : 0;
        // default: normal
        return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
      };
      const fArr = evalPts.map((xi) => {
        let s = 0; for (const xj of xv) s += kfn((xi - xj) / h);
        if (fnType === 'pdf') return s / (n * h);
        if (fnType === 'cdf') {
          // integrate numerically via cumulative sum using trapezoidal rule
          // For efficiency compute it inline below; here fallback
          let cdf = 0; for (const xj of xv) cdf += 0.5 * (1 + erf((xi - xj) / (h * Math.SQRT2)));
          return cdf / n;
        }
        if (fnType === 'survivor') {
          let cdf = 0; for (const xj of xv) cdf += 0.5 * (1 + erf((xi - xj) / (h * Math.SQRT2)));
          return 1 - cdf / n;
        }
        return s / (n * h);
      });
      const fMat = rowVec(fArr); const xiMat = rowVec(evalPts);
      return Promise.resolve([fMat, xiMat].slice(0, Math.max(1, nargout)));
    },

    // ── nlinfit(X,y,modelfun,beta0): nonlinear least squares (Levenberg-Marquardt) ──
    nlinfit: (a, nargout) => {
      const X = m(a[0]); const yv = toArray(m(a[1]));
      const fn = a[2]; // function handle
      const beta0 = toArray(m(a[3]));
      const n = yv.length, p = beta0.length;
      // Evaluate model: call function handle with (beta, X)
      const evalModel = async (beta: number[]): Promise<number[]> => {
        if (fn.kind === 'handle') {
          const bMat = colVec(beta);
          const res = await fn.call([bMat, X], 1);
          return toArray(m(res[0]));
        }
        throw new MatError('nlinfit: modelfun must be a function handle');
      };
      return (async () => {
        let beta = beta0.slice();
        const eps = Math.sqrt(Number.EPSILON);
        let lambda = 0.01;
        const maxIter = 400;
        // Finite-difference Jacobian
        const jacFD = async (b: number[], yhat: number[]): Promise<number[][]> => {
          const J: number[][] = Array.from({ length: n }, () => new Array<number>(p).fill(0));
          for (let j = 0; j < p; j++) {
            const db = Math.max(eps, Math.abs(b[j]) * eps);
            const bph = b.slice(); bph[j] += db;
            const yp = await evalModel(bph);
            for (let i = 0; i < n; i++) J[i][j] = (yp[i] - yhat[i]) / db;
          }
          return J;
        };
        let yhat = await evalModel(beta);
        let resid = yv.map((v, i) => v - yhat[i]);
        let sse = resid.reduce((s, v) => s + v * v, 0);
        for (let iter = 0; iter < maxIter; iter++) {
          const J = await jacFD(beta, yhat);
          // JtJ + lambda * diag(JtJ)
          const JtJ = Array.from({ length: p }, () => new Array<number>(p).fill(0));
          const Jtr = new Array<number>(p).fill(0);
          for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) {
            Jtr[j] += J[i][j] * resid[i];
            for (let k = 0; k < p; k++) JtJ[j][k] += J[i][j] * J[i][k];
          }
          const damp = JtJ.map((row, i) => row.map((v, j) => i === j ? v * (1 + lambda) : v));
          const step = solveLin(damp, Jtr);
          const betaNew = beta.map((v, i) => v + step[i]);
          const yNew = await evalModel(betaNew);
          const rNew = yv.map((v, i) => v - yNew[i]);
          const sseNew = rNew.reduce((s, v) => s + v * v, 0);
          if (sseNew < sse) { beta = betaNew; yhat = yNew; resid = rNew; sse = sseNew; lambda *= 0.1; }
          else { lambda *= 10; }
          if (lambda > 1e16 || step.every((s) => Math.abs(s) < 1e-10 * (1 + Math.abs(beta[beta.findIndex((_, ii) => ii === step.indexOf(s))])))) break;
        }
        const betaMat = colVec(beta);
        if (nargout < 2) return [betaMat];
        const residMat = colVec(resid);
        if (nargout < 3) return [betaMat, residMat];
        // Jacobian at final params
        const JFinal = await jacFD(beta, yhat);
        const JMat = fromRows(JFinal);
        if (nargout < 4) return [betaMat, residMat, JMat];
        // CovB = MSE * inv(J'J)
        const MSE = sse / Math.max(1, n - p);
        const JtJ2 = Array.from({ length: p }, () => new Array<number>(p).fill(0));
        for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) for (let k = 0; k < p; k++) JtJ2[j][k] += JFinal[i][j] * JFinal[i][k];
        const JtJMat = fromRows(JtJ2);
        const JtJInv = inv(JtJMat);
        const CovBData = new Float64Array(p * p);
        for (let i = 0; i < p * p; i++) CovBData[i] = JtJInv.data[i] * MSE;
        const CovB = mat(p, p, CovBData);
        return [betaMat, residMat, JMat, CovB, scalar(MSE)];
      })();
    },

    // ── procrustes(X,Y): orthogonal Procrustes analysis ──
    procrustes: (a, nargout) => {
      const X = m(a[0]), Y = m(a[1]);
      const n = X.rows, pX = X.cols, pY = Y.cols;
      const p = pX; // output columns match X
      // Center both matrices
      const muX: number[] = [], muY: number[] = [];
      for (let c = 0; c < p; c++) { let sx = 0; for (let r = 0; r < n; r++) sx += X.data[r + c * n]; muX.push(sx / n); }
      for (let c = 0; c < pY; c++) { let sy = 0; for (let r = 0; r < n; r++) sy += Y.data[r + c * n]; muY.push(sy / n); }
      const X0 = mat(n, p, new Float64Array(n * p));
      for (let c = 0; c < p; c++) for (let r = 0; r < n; r++) X0.data[r + c * n] = X.data[r + c * n] - muX[c];
      // Y0 may have fewer cols than X; pad with zeros to match p
      const Y0 = mat(n, p, new Float64Array(n * p));
      for (let c = 0; c < pY; c++) for (let r = 0; r < n; r++) Y0.data[r + c * n] = Y.data[r + c * n] - muY[c];
      // Frobenius norms
      let normX0sq = 0; for (const v of X0.data) normX0sq += v * v;
      let normY0sq = 0; for (const v of Y0.data) normY0sq += v * v;
      const normX = Math.sqrt(normX0sq), normY = Math.sqrt(normY0sq);
      if (normX === 0 || normY === 0) {
        return Promise.resolve([scalar(normX === 0 ? 0 : 1), mat(n, p, new Float64Array(n * p)), mkStruct([['T', mat(p, p, new Float64Array(p * p))], ['b', scalar(0)], ['c', mat(n, p, new Float64Array(n * p))]])].slice(0, Math.max(1, nargout)));
      }
      // Normalize to unit norm (MATLAB approach)
      const X0n = mat(n, p, new Float64Array(X0.data.map((v) => v / normX)));
      const Y0n = mat(n, p, new Float64Array(Y0.data.map((v) => v / normY)));
      // SVD of A = X0n' * Y0n → L D M': T = M * L'
      const A = matmul(transpose(X0n), Y0n);   // p × p
      const { U: L, s: Ds, V: M } = svd(A);
      const T = matmul(M, transpose(L));        // p × p rotation matrix
      // Trace of D (singular values)
      const traceTA = Ds.reduce((acc, v) => acc + v, 0);
      // Scaling: b = traceTA * normX / normY
      const b = traceTA * normX / normY;
      // Standardized distance: d = 1 - traceTA²
      const d = Math.max(0, 1 - traceTA * traceTA);
      // Z = normX * traceTA * Y0n * T + repmat(muX, n, 1)
      const Y0nT = matmul(Y0n, T);   // n × p
      const Z = mat(n, p, new Float64Array(n * p));
      for (let c = 0; c < p; c++) for (let r = 0; r < n; r++) Z.data[r + c * n] = normX * traceTA * Y0nT.data[r + c * n] + muX[c];
      if (nargout < 2) return Promise.resolve([scalar(d)]);
      if (nargout < 3) return Promise.resolve([scalar(d), Z]);
      // transform struct: T (p×p), b (scalar), c (1×p translation such that Z = b*Y*T + repmat(c,n,1))
      // c = muX - b * muY * T  (1 × p)
      const cRow = new Float64Array(p);
      for (let c = 0; c < p; c++) { cRow[c] = muX[c]; for (let k = 0; k < pY; k++) cRow[c] -= b * muY[k] * T.data[k + c * p]; }
      // MATLAB returns c as n×p (same row repeated)
      const cArr = new Float64Array(n * p);
      for (let r = 0; r < n; r++) for (let c = 0; c < p; c++) cArr[r + c * n] = cRow[c];
      const tr = mkStruct([['T', T], ['b', scalar(b)], ['c', mat(n, p, cArr)]]);
      return Promise.resolve([scalar(d), Z, tr]);
    },

    // ── canoncorr(X,Y): canonical correlation analysis ──
    canoncorr: (a, nargout) => {
      const X = m(a[0]), Y = m(a[1]);
      const n = X.rows, px = X.cols, py = Y.cols;
      // Center X and Y
      const centerMat = (M: Mat): Mat => {
        const nr = M.rows, nc = M.cols;
        const out = mat(nr, nc, new Float64Array(nr * nc));
        for (let c = 0; c < nc; c++) { let s = 0; for (let r = 0; r < nr; r++) s += M.data[r + c * nr]; s /= nr; for (let r = 0; r < nr; r++) out.data[r + c * nr] = M.data[r + c * nr] - s; }
        return out;
      };
      const Xc = centerMat(X), Yc = centerMat(Y);
      // Economy QR decompositions
      const { Q: Qx, R: Rx } = qr(Xc);   // Q: n×n, R: n×px
      const { Q: Qy, R: Ry } = qr(Yc);
      // Extract economy Q (first px and py columns)
      const qxCols = Math.min(px, n), qyCols = Math.min(py, n);
      const extractQ = (Q: Mat, k: number): Mat => {
        const nr = Q.rows, out = mat(nr, k, new Float64Array(nr * k));
        for (let c = 0; c < k; c++) for (let r = 0; r < nr; r++) out.data[r + c * nr] = Q.data[r + c * nr];
        return out;
      };
      const Q1 = extractQ(Qx, qxCols);  // n × px
      const Q2 = extractQ(Qy, qyCols);  // n × py
      // SVD of Q1' * Q2
      const cross = matmul(transpose(Q1), Q2);
      const { U: Ucrs, s: rArr, V: Vcrs } = svd(cross);
      const k = Math.min(qxCols, qyCols);
      const rVec = rArr.slice(0, k).map((v) => Math.min(1, Math.max(0, v)));
      // Canonical coefficients: A = inv(R_x) * U, B = inv(R_y) * V
      const Rx_sq = mat(qxCols, qxCols, new Float64Array(qxCols * qxCols));
      for (let r = 0; r < qxCols; r++) for (let c = 0; c < qxCols; c++) Rx_sq.data[r + c * qxCols] = Rx.data[r + c * Rx.rows];
      const Ry_sq = mat(qyCols, qyCols, new Float64Array(qyCols * qyCols));
      for (let r = 0; r < qyCols; r++) for (let c = 0; c < qyCols; c++) Ry_sq.data[r + c * qyCols] = Ry.data[r + c * Ry.rows];
      const UcrsK = extractQ(Ucrs, k), VcrsK = extractQ(Vcrs, k);
      const A = matmul(inv(Rx_sq), UcrsK);  // px × k
      const B = matmul(inv(Ry_sq), VcrsK);  // py × k
      // Canonical variates: U = Xc * A, V = Yc * B
      const Uvar = matmul(Xc, A);
      const Vvar = matmul(Yc, B);
      const rMat = rowVec(rVec);
      return Promise.resolve([A, B, rMat, Uvar, Vvar].slice(0, Math.max(1, nargout)));
    },

    // ── nnmf(A,k): nonnegative matrix factorization via multiplicative updates ──
    nnmf: (a, nargout) => {
      const A = m(a[0]); const k = Math.round(asScalar(a[1]));
      const n = A.rows, mCols = A.cols;
      // Random init (use local deterministic PRNG for reproducibility)
      const W = mat(n, k, new Float64Array(n * k));
      const H = mat(k, mCols, new Float64Array(k * mCols));
      for (let i = 0; i < n * k; i++) W.data[i] = rand() + 1e-10;
      for (let i = 0; i < k * mCols; i++) H.data[i] = rand() + 1e-10;
      const EPS_NMF = 1e-16;
      // Multiplicative update rules: Lee & Seung (2001)
      for (let iter = 0; iter < 200; iter++) {
        // H ← H * (W'A) / (W'WH)
        const WtA = matmul(transpose(W), A);    // k × mCols
        const WtW = matmul(transpose(W), W);    // k × k
        const WtWH = matmul(WtW, H);            // k × mCols
        for (let i = 0; i < k * mCols; i++) H.data[i] = Math.max(EPS_NMF, H.data[i] * (WtA.data[i] + EPS_NMF) / (WtWH.data[i] + EPS_NMF));
        // W ← W * (AH') / (WHH')
        const AHt = matmul(A, transpose(H));    // n × k
        const HHt = matmul(H, transpose(H));    // k × k
        const WHHt = matmul(W, HHt);            // n × k
        for (let i = 0; i < n * k; i++) W.data[i] = Math.max(EPS_NMF, W.data[i] * (AHt.data[i] + EPS_NMF) / (WHHt.data[i] + EPS_NMF));
      }
      if (nargout < 3) return Promise.resolve([W, H]);
      // D = rms residual
      const WH = matmul(W, H);
      let sse = 0; for (let i = 0; i < n * mCols; i++) { const d = A.data[i] - WH.data[i]; sse += d * d; }
      const D = Math.sqrt(sse / (n * mCols));
      return Promise.resolve([W, H, scalar(D)]);
    },
  },
  help: HELP_STATS,
};

// Deterministic-but-seedable PRNG so kmeans is reproducible within a session (xorshift32).
let _seed = 0x2545f491;
function rand(): number { _seed ^= _seed << 13; _seed ^= _seed >>> 17; _seed ^= _seed << 5; return ((_seed >>> 0) % 1e9) / 1e9; }
