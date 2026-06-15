// Control System Toolbox — LTI models as generic ClassV objects (tf/ss/zpk) plus algebraic
// analysis (pole/zero/dcgain/isstable) and model conversions (tf2zp/zp2tf). Validated against
// the live Control System Toolbox. See plan §1 (ClassV) / §7.
import type { Builtin } from '../builtins';
import {
  type Value, type Mat, type StructV, type Cell, type ClassV, isObject, isCell, makeObject, makeCell, scalar, bool, colVec, rowVec, toArray, asScalar, asString, toMat as m, makeStr, matRows, fromRows,
} from '../values';
import { schur, schurEig, expm } from '../linalg';   // shared robust LA core (Francis QR / scaling-squaring), not a local reimpl
import type { ToolboxModule } from './types';
import { HELP_CONTROL } from '../help/toolbox-help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

/** Roots of a real-coefficient polynomial (descending coeffs) via Durand-Kerner. */
function polyRoots(coeffs: number[]): { re: number[]; im: number[] } {
  let c = coeffs.slice(); while (c.length > 1 && Math.abs(c[0]) < 1e-300) c.shift();
  let trail = 0; while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-300) { c.pop(); trail++; }
  const n = c.length - 1; const re: number[] = [], im: number[] = [];
  if (n >= 1) {
    const a = c.map((v) => v / c[0]); const pr = new Array(n), pi = new Array(n);
    for (let k = 0; k < n; k++) { const ang = (2 * Math.PI * k) / n + 0.4; pr[k] = 1.2 * Math.cos(ang); pi[k] = 1.2 * Math.sin(ang); }
    for (let it = 0; it < 600; it++) {
      let maxd = 0;
      for (let k = 0; k < n; k++) {
        let vr = a[0], vi = 0; for (let j = 1; j <= n; j++) { const nr = vr * pr[k] - vi * pi[k] + a[j]; vi = vr * pi[k] + vi * pr[k]; vr = nr; }
        let dr = 1, di = 0; for (let j = 0; j < n; j++) if (j !== k) { const er = pr[k] - pr[j], ei = pi[k] - pi[j]; const nr = dr * er - di * ei; di = dr * ei + di * er; dr = nr; }
        const dd = dr * dr + di * di || 1e-300; const qr = (vr * dr + vi * di) / dd, qi = (vi * dr - vr * di) / dd;
        pr[k] -= qr; pi[k] -= qi; maxd = Math.max(maxd, Math.hypot(qr, qi));
      }
      if (maxd < 1e-14) break;
    }
    for (let k = 0; k < n; k++) { re.push(Math.abs(pr[k]) < 1e-9 ? 0 : pr[k]); im.push(Math.abs(pi[k]) < 1e-9 ? 0 : pi[k]); }
  }
  for (let z = 0; z < trail; z++) { re.push(0); im.push(0); }
  return { re, im };
}
/** Expand Π(s − rₖ) → real polynomial coefficients (descending). */
function polyFromRoots(rr: number[], ri: number[]): number[] {
  let cr = [1], ci = [0];
  for (let k = 0; k < rr.length; k++) { const nr = new Array(cr.length + 1).fill(0), ni = new Array(cr.length + 1).fill(0); for (let j = 0; j < cr.length; j++) { nr[j] += cr[j]; ni[j] += ci[j]; nr[j + 1] -= cr[j] * rr[k] - ci[j] * ri[k]; ni[j + 1] -= cr[j] * ri[k] + ci[j] * rr[k]; } cr = nr; ci = ni; }
  return cr.map((v) => (Math.abs(v) < 1e-12 ? 0 : v));
}
/** Sort roots ascending by real part then imaginary (MATLAB pole/zero order). */
function sortRoots(r: { re: number[]; im: number[] }): { re: number[]; im: number[] } {
  const idx = r.re.map((_, i) => i).sort((a, b) => r.re[a] - r.re[b] || r.im[a] - r.im[b]);
  return { re: idx.map((i) => r.re[i]), im: idx.map((i) => r.im[i]) };
}
const getNumDen = (v: Value): { num: number[]; den: number[] } => {
  if (isObject(v) && v.className === 'tf') return { num: toArray(v.props.get('num') as Mat), den: toArray(v.props.get('den') as Mat) };
  throw new Error('expected a tf model');
};
function rootsValue(r: { re: number[]; im: number[] }): Value { const c = colVec(r.re); if (r.im.some((x) => x !== 0)) c.idata = Float64Array.from(r.im); return c; }

// ── small dense-matrix + polynomial helpers (matRows/fromRows are the shared adapters from values) ──
const mmul = (A: number[][], B: number[][]): number[][] => { const n = A.length, p = B.length, m = B[0]?.length ?? 0; const C: number[][] = []; for (let i = 0; i < n; i++) { C[i] = []; for (let j = 0; j < m; j++) { let s = 0; for (let k = 0; k < p; k++) s += A[i][k] * B[k][j]; C[i][j] = s; } } return C; };
const eye = (n: number): number[][] => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
/** Dense matrix inverse via Gauss-Jordan with partial pivoting. */
function matInv(A: number[][]): number[][] {
  const n = A.length; const M = A.map((r, i) => [...r, ...eye(n)[i]]);
  // singularity tolerance relative to the matrix ∞-norm — a pivot of ~eps·‖A‖ is numerical noise,
  // not a usable pivot (a hardcoded 1e-300 would divide by noise and produce a garbage inverse).
  let normInf = 0; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += Math.abs(A[i][j]); normInf = Math.max(normInf, s); }
  const tol = Math.max(n * normInf * 2.220446049250313e-16, 1e-300);
  for (let col = 0; col < n; col++) {
    let piv = col; for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < tol) throw new Error('matrix is singular to working precision');
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col]; for (let j = 0; j < 2 * n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) if (r !== col) { const f = M[r][col]; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j]; }
  }
  return M.map((row) => row.slice(n));
}
const traceM = (A: number[][]) => A.reduce((s, row, i) => s + row[i], 0);
function polyConv(a: number[], b: number[]): number[] { const o = new Array(a.length + b.length - 1).fill(0); for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) o[i + j] += a[i] * b[j]; return o; }
function polyAdd(a: number[], b: number[]): number[] { const n = Math.max(a.length, b.length); const o = new Array(n).fill(0); for (let i = 0; i < a.length; i++) o[n - a.length + i] += a[i]; for (let i = 0; i < b.length; i++) o[n - b.length + i] += b[i]; return o; }
const tfModel = (num: number[], den: number[]): Value => makeObject('tf', { num: rowVec(num), den: rowVec(den) });

// ── frequency response (bode) helpers ──
/** Evaluate a real polynomial (descending coeffs) at s=jω → complex (re,im). */
function polyValJw(coeffs: number[], w: number): { re: number; im: number } {
  // Horner in s=jω: powers of (jω) cycle 1, jω, −ω², −jω³, …
  let re = 0, im = 0;
  for (let k = 0; k < coeffs.length; k++) { const nr = re * 0 - im * w + coeffs[k]; im = re * w + im * 0; re = nr; }
  return { re, im };
}
/** Get (num,den) for tf, or convert an ss model to (num,den) via Faddeev-LeVerrier (SISO). */
function getNumDenAny(v: Value): { num: number[]; den: number[] } {
  if (isObject(v) && v.className === 'tf') return getNumDen(v);
  if (isObject(v) && v.className === 'ss') {
    const Bmat = m(v.props.get('B') as Mat), Cmat = m(v.props.get('C') as Mat);
    if (Bmat.cols !== 1 || Cmat.rows !== 1) throw new Error('this operation requires a SISO state-space model (use tfdata/ssdata to select a channel)');
    const A = matRows(m(v.props.get('A') as Mat)), B = matRows(Bmat), C = matRows(Cmat);
    const D = v.props.has('D') ? asScalar(v.props.get('D') as Value) : 0; const N = A.length;
    if (N === 0) return { num: [D], den: [1] };
    const p = [1]; let M = eye(N); const Ms = [eye(N)];
    for (let k = 1; k <= N; k++) { const AM = mmul(A, M); p[k] = -traceM(AM) / k; M = AM.map((row, i) => row.map((vv, j) => vv + (i === j ? p[k] : 0))); if (k < N) Ms.push(M); }
    const den = p; const numAdj = new Array(N).fill(0);
    for (let k = 0; k < N; k++) { const CMk = mmul(mmul(C, Ms[k]), B); numAdj[k] = CMk[0][0]; }
    const num = polyAdd(numAdj, den.map((vv) => vv * D));
    return { num, den };
  }
  throw new Error('bode: expected a tf or ss model');
}
/** Default log-spaced frequency grid (rad/s) when w is omitted. */
function autoFreqGrid(num: number[], den: number[]): number[] {
  const feats: number[] = [];
  for (const r of [polyRoots(num), polyRoots(den)]) for (let i = 0; i < r.re.length; i++) { const mag = Math.hypot(r.re[i], r.im[i]); if (mag > 0) feats.push(mag); }
  let lo = -1, hi = 2;
  if (feats.length) { const mn = Math.min(...feats), mx = Math.max(...feats); lo = Math.floor(Math.log10(mn)) - 1; hi = Math.ceil(Math.log10(mx)) + 1; }
  const npts = 200; const grid: number[] = [];
  for (let i = 0; i < npts; i++) grid.push(10 ** (lo + ((hi - lo) * i) / (npts - 1)));
  return grid;
}
/** [mag,phase,wout] frequency response of a SISO tf/ss over grid w. phase in degrees (unwrapped). */
function bodeData(sys: Value, wArg: Value | undefined): { mag: number[]; phase: number[]; w: number[] } {
  const { num, den } = getNumDenAny(sys);
  const w = wArg && isMatLike(wArg) ? toArray(m(wArg)) : autoFreqGrid(num, den);
  const mag: number[] = [], phaseRaw: number[] = [];
  for (const wi of w) {
    const n = polyValJw(num, wi), d = polyValJw(den, wi);
    const dd = d.re * d.re + d.im * d.im || 1e-300;
    const hr = (n.re * d.re + n.im * d.im) / dd, hi = (n.im * d.re - n.re * d.im) / dd;
    mag.push(Math.hypot(hr, hi)); phaseRaw.push((Math.atan2(hi, hr) * 180) / Math.PI);
  }
  // Unwrap phase (degrees): remove ±360° jumps.
  const phase = phaseRaw.slice();
  for (let i = 1; i < phase.length; i++) { let d = phase[i] - phase[i - 1]; while (d > 180) { phase[i] -= 360; d -= 360; } while (d < -180) { phase[i] += 360; d += 360; } }
  return { mag, phase, w };
}
const isMatLike = (v: Value): boolean => !!v && !isObject(v);

// ── LQR / Riccati helpers ──
const matT = (A: number[][]): number[][] => (A.length === 0 ? [] : A[0].map((_, j) => A.map((r) => r[j])));
const matSub = (A: number[][], B: number[][]): number[][] => A.map((r, i) => r.map((v, j) => v - B[i][j]));
const matAdd2 = (A: number[][], B: number[][]): number[][] => A.map((r, i) => r.map((v, j) => v + B[i][j]));
const symmetrize = (A: number[][]): number[][] => A.map((r, i) => r.map((v, j) => (v + A[j][i]) / 2));
/** Reduce LQR with cross term N to standard form: A←A−B R⁻¹ N', Q←Q−N R⁻¹ N'. K←K+R⁻¹N'. */
function reduceCross(A: number[][], B: number[][], Q: number[][], Ri: number[][], N: number[][] | null): { A: number[][]; Q: number[][]; corr: number[][] | null } {
  if (!N) return { A, Q, corr: null };
  const Nt = matT(N); const RiNt = mmul(Ri, Nt);      // R⁻¹ N'
  return { A: matSub(A, mmul(B, RiNt)), Q: matSub(Q, mmul(N, RiNt)), corr: RiNt };
}
const matScale = (A: number[][], s: number): number[][] => A.map((r) => r.map((v) => v * s));
const eyeN = (n: number): number[][] => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
/** Least-squares solve of a (rows×n) overdetermined system M·X = R via the normal equations
 *  (MᵀM)X = MᵀR (M is well-conditioned here, spanning an invariant subspace). */
function lstsq(M: number[][], R: number[][]): number[][] {
  const Mt = matT(M); return mmul(matInv(mmul(Mt, M)), mmul(Mt, R));
}
/** Determinant of a dense matrix via LU with partial pivoting (used for sign-function scaling). */
function matDet(A: number[][]): number {
  const n = A.length; const M = A.map((r) => r.slice()); let d = 1;
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (piv !== c) { [M[c], M[piv]] = [M[piv], M[c]]; d = -d; }
    if (M[c][c] === 0) return 0;
    d *= M[c][c];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let j = c; j < n; j++) M[r][j] -= f * M[c][j]; }
  }
  return d;
}
/** Solve the continuous-time algebraic Riccati equation A'X+XA−XBR⁻¹B'X+Q=0 via the matrix-sign
 *  function (Roberts' method). H=[A,−G;−Q,−A'] (G=BR⁻¹B'); the determinant-scaled Newton iteration
 *  Z←½(c·Z + c⁻¹·Z⁻¹) with c=|det Z|^{−1/N} converges quadratically to W=sign(H). The optimal
 *  determinantal scaling keeps every iterate well-conditioned, so the iteration converges even for
 *  *unstable* A (the earlier norm-ratio scaling collapsed c→0 and blew the iterate up to NaN).
 *  With W partitioned into n×n blocks, the stabilizing X solves the overdetermined system
 *  [W12; W22+I]·X = −[W11+I; W21] (least squares — the leading n columns of I−W span the stable
 *  invariant subspace). */
function care(A: number[][], B: number[][], Q: number[][], Ri: number[][]): number[][] {
  const n = A.length; const N = 2 * n; const G = mmul(mmul(B, Ri), matT(B)); const At = matT(A);
  let Z: number[][] = [];
  for (let i = 0; i < N; i++) {
    Z[i] = [];
    for (let j = 0; j < N; j++) {
      if (i < n && j < n) Z[i][j] = A[i][j];
      else if (i < n) Z[i][j] = -G[i][j - n];
      else if (j < n) Z[i][j] = -Q[i - n][j];
      else Z[i][j] = -At[i - n][j - n];
    }
  }
  for (let it = 0; it < 200; it++) {
    const Zi = matInv(Z);
    const c = Math.pow(Math.abs(matDet(Z)), -1 / N) || 1;   // optimal determinantal scaling
    const Zn = matScale(matAdd2(matScale(Z, c), matScale(Zi, 1 / c)), 0.5);
    let d = 0; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) d = Math.max(d, Math.abs(Zn[i][j] - Z[i][j]));
    Z = Zn; if (d < 1e-13) break;
  }
  // Z = sign(H). Stabilizing X solves [W12; W22+I] X = −[W11+I; W21].
  const Mlhs: number[][] = [], Rrhs: number[][] = [];
  for (let i = 0; i < n; i++) { Mlhs[i] = []; Rrhs[i] = []; for (let j = 0; j < n; j++) { Mlhs[i][j] = Z[i][n + j]; Rrhs[i][j] = -(Z[i][j] + (i === j ? 1 : 0)); } }
  for (let i = 0; i < n; i++) { Mlhs[n + i] = []; Rrhs[n + i] = []; for (let j = 0; j < n; j++) { Mlhs[n + i][j] = Z[n + i][n + j] + (i === j ? 1 : 0); Rrhs[n + i][j] = -Z[n + i][j]; } }
  return symmetrize(lstsq(Mlhs, Rrhs));
}
/** Solve the discrete-time algebraic Riccati equation A'XA−X−A'XB(R+B'XB)⁻¹B'XA+Q=0
 *  by the fixed-point Riccati iteration (converges for stabilizable/detectable systems). */
function dare(A: number[][], B: number[][], Q: number[][], Rm: number[][]): number[][] {
  const n = A.length; const At = matT(A), Bt = matT(B);
  let X = Q.map((r) => r.slice());
  for (let it = 0; it < 10000; it++) {
    const AtX = mmul(At, X);
    const BtXB = matAdd2(Rm, mmul(mmul(Bt, X), B));      // R + B'XB
    const BtXA = mmul(mmul(Bt, X), A);                   // B'XA
    const Xn = symmetrize(matAdd2(matSub(mmul(AtX, A), mmul(mmul(matT(BtXA), matInv(BtXB)), BtXA)), Q));
    let d = 0, s = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { d = Math.max(d, Math.abs(Xn[i][j] - X[i][j])); s = Math.max(s, Math.abs(Xn[i][j])); }
    X = Xn;
    if (d <= 1e-15 * (s + 1)) break;
  }
  return X;
}
/** Discrete Riccati with cross term N (cost x'Qx+u'Ru+2x'Nu): solve via reduction
 *  Ā=A−B R⁻¹ N', Q̄=Q−N R⁻¹ N', X=dare(Ā,B,Q̄,R); gain K=(R+B'XB)⁻¹(B'XA+N'). Returns {X,K}. */
function dareN(A: number[][], B: number[][], Q: number[][], Rm: number[][], N: number[][]): { X: number[][]; K: number[][] } {
  const Ri = matInv(Rm); const Nt = matT(N); const RiNt = mmul(Ri, Nt);
  const Abar = matSub(A, mmul(B, RiNt)); const Qbar = matSub(Q, mmul(N, RiNt));
  const X = dare(Abar, B, Qbar, Rm); const Bt = matT(B);
  const K = mmul(matInv(matAdd2(Rm, mmul(mmul(Bt, X), B))), matAdd2(mmul(mmul(Bt, X), A), Nt));
  return { X, K };
}
/** Closed-loop eigenvalues of A−BK as a column Value (complex when needed). The characteristic
 *  polynomial is formed via Faddeev–LeVerrier and its roots found with polyRoots (Durand–Kerner);
 *  this is more reliable than reading them off the real-Schur diagonal blocks, which can converge
 *  to a spurious quasi-triangular clustering for some closely-spaced real spectra. */
function eigClosed(Acl: number[][]): Value {
  const N = Acl.length;
  if (N === 0) return colVec([]);
  // Faddeev–LeVerrier: characteristic poly p (descending coeffs, leading 1).
  const p = [1]; let Mk = eye(N);
  for (let k = 1; k <= N; k++) { const AM = mmul(Acl, Mk); p[k] = -traceM(AM) / k; Mk = AM.map((row, i) => row.map((vv, j) => vv + (i === j ? p[k] : 0))); }
  const e = sortRoots(polyRoots(p));
  const c = colVec(e.re); if (e.im.some((x) => x !== 0)) c.idata = Float64Array.from(e.im);
  return c;
}
/** Common (A,B,Q,R[,N]) parsing for lqr/dlqr → matrices. */
function lqrArgs(a: Value[]): { A: number[][]; B: number[][]; Q: number[][]; Ri: number[][]; Rm: number[][]; N: number[][] | null } {
  const A = matRows(m(a[0])), B = matRows(m(a[1])), Q = matRows(m(a[2]));
  const Rm = matRows(m(a[3])); const Ri = matInv(Rm);
  const N = a.length >= 5 ? matRows(m(a[4])) : null;
  return { A, B, Q, Ri, Rm, N };
}
/** Build [K,S,e] outputs for nargout. */
function lqrResult(K: number[][], S: number[][], Acl: number[][], n: number): Promise<Value[]> {
  const out: Value[] = [fromRows(K)];
  if (n >= 2) out.push(fromRows(S));
  if (n >= 3) out.push(eigClosed(Acl));
  return Promise.resolve(out);
}

// ── matrix exponential (scaling & squaring with [6/6] Padé) ──
// Matrix exponential via the shared linalg core (scaling-and-squaring + Padé). Keeps the
// non-finite guard so Inf/NaN entries short-circuit to NaN instead of looping.
function matExp(A: number[][]): number[][] {
  const n = A.length; if (n === 0) return [];
  let normInf = 0; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += Math.abs(A[i][j]); normInf = Math.max(normInf, s); }
  if (!Number.isFinite(normInf)) return A.map((row) => row.map(() => NaN));
  return matRows(expm(fromRows(A)));
}

// ── Lyapunov / Sylvester (Kronecker linear-solve) helpers ──
/** Solve a dense linear system M x = b (column vectors) via Gauss-Jordan (matInv). */
function linSolve(M: number[][], b: number[]): number[] {
  const Mi = matInv(M); return Mi.map((row) => row.reduce((s, v, j) => s + v * b[j], 0));
}
/** Kronecker product A ⊗ B (both dense). */
function kron(A: number[][], B: number[][]): number[][] {
  const ar = A.length, ac = A[0].length, br = B.length, bc = B[0].length;
  const O: number[][] = Array.from({ length: ar * br }, () => new Array(ac * bc).fill(0));
  for (let i = 0; i < ar; i++) for (let j = 0; j < ac; j++) for (let p = 0; p < br; p++) for (let q = 0; q < bc; q++) O[i * br + p][j * bc + q] = A[i][j] * B[p][q];
  return O;
}
/** Column-major vec of a matrix → flat array. */
function vecCM(X: number[][]): number[] { const r = X.length, c = X[0].length; const o: number[] = []; for (let j = 0; j < c; j++) for (let i = 0; i < r; i++) o.push(X[i][j]); return o; }
/** Inverse of vecCM into an r×c matrix. */
function unvecCM(v: number[], r: number, c: number): number[][] { const O: number[][] = Array.from({ length: r }, () => new Array(c).fill(0)); let k = 0; for (let j = 0; j < c; j++) for (let i = 0; i < r; i++) O[i][j] = v[k++]; return O; }
/** Solve continuous Sylvester A X + X B + C = 0 for X (vec: (I⊗A + Bᵀ⊗I) vecX = −vecC). */
function sylvSolve(A: number[][], B: number[][], C: number[][]): number[][] {
  const n = A.length, m2 = B.length; const In = eyeN(n), Im = eyeN(m2);
  const M = matAdd2(kron(Im, A), kron(matT(B), In));
  const x = linSolve(M, vecCM(C).map((v) => -v));
  return unvecCM(x, n, m2);
}
/** Solve continuous Lyapunov A X + X Aᵀ + Q = 0 for X. */
function lyapSolve(A: number[][], Q: number[][]): number[][] { return symmetrize(sylvSolve(A, matT(A), Q)); }
/** Solve discrete Lyapunov A X Aᵀ − X + Q = 0 (vec: (A⊗A − I) vecX = −vecQ). */
function dlyapSolve(A: number[][], Q: number[][]): number[][] {
  const n = A.length; const I = eyeN(n * n);
  const M = matSub(kron(A, A), I);
  const x = linSolve(M, vecCM(Q).map((v) => -v));
  return symmetrize(unvecCM(x, n, n));
}
/** Upper-triangular Cholesky R (R'·R = X) of a symmetric positive-definite matrix. */
function cholUpper(X: number[][]): number[][] {
  const n = X.length; const R: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    let s = X[j][j]; for (let k = 0; k < j; k++) s -= R[k][j] * R[k][j];
    if (s <= 0) throw new Error('lyapchol: solution is not positive definite');
    R[j][j] = Math.sqrt(s);
    for (let i = j + 1; i < n; i++) { let t = X[j][i]; for (let k = 0; k < j; k++) t -= R[k][j] * R[k][i]; R[j][i] = t / R[j][j]; }
  }
  return R;
}

/** c2d via ZOH: discretise (A,B) of the tf's controllable-canonical realisation using
 *  expm([[A,B];[0,0]])=[[Ad,Bd];[0,I]], then convert (Ad,Bd,C,D) back to tf. */
function c2dZoh(numIn: number[], denIn: number[], Ts: number): { num: number[]; den: number[] } {
  let den = denIn.slice(); while (den.length > 1 && den[0] === 0) den.shift();
  let num = numIn.slice(); while (num.length > 1 && num[0] === 0) num.shift();
  if (num.length > den.length) throw new Error('c2d: improper transfer function');
  // controllable-canonical realization (matches tf2ss above)
  const g = den[0] || 1; const d = den.map((v) => v / g); let nm = num.map((v) => v / g);
  while (nm.length < d.length) nm.unshift(0);
  const no = d.length - 1; const D = nm[0];
  if (no === 0) return { num: [D], den: [1] };
  const A: number[][] = []; for (let i = 0; i < no; i++) { A[i] = []; for (let j = 0; j < no; j++) A[i][j] = i === 0 ? -d[j + 1] : (i - 1 === j ? 1 : 0); }
  const B = Array.from({ length: no }, (_, i) => [i === 0 ? 1 : 0]);
  const C = [Array.from({ length: no }, (_, j) => nm[j + 1] - D * d[j + 1])];
  // augmented [[A B];[0 0]]
  const M: number[][] = [];
  for (let i = 0; i < no + 1; i++) { M[i] = []; for (let j = 0; j < no + 1; j++) M[i][j] = i < no && j < no ? A[i][j] * Ts : (i < no && j === no ? B[i][0] * Ts : 0); }
  const E = matExp(M);
  const Ad: number[][] = [], Bd: number[][] = [];
  for (let i = 0; i < no; i++) { Ad[i] = []; for (let j = 0; j < no; j++) Ad[i][j] = E[i][j]; Bd[i] = [E[i][no]]; }
  // (Ad,Bd,C,D) → tf via Faddeev-LeVerrier
  return ss2tfFL(Ad, Bd, C, D);
}
/** SISO ss→tf (Faddeev-LeVerrier), shared by c2d. */
function ss2tfFL(A: number[][], B: number[][], C: number[][], D: number): { num: number[]; den: number[] } {
  const N = A.length; const p = [1]; let M = eye(N); const Ms = [eye(N)];
  for (let k = 1; k <= N; k++) { const AM = mmul(A, M); p[k] = -traceM(AM) / k; M = AM.map((row, i) => row.map((v, j) => v + (i === j ? p[k] : 0))); if (k < N) Ms.push(M); }
  const den = p; const numAdj = new Array(N).fill(0);
  for (let k = 0; k < N; k++) { const CMk = mmul(mmul(C, Ms[k]), B); numAdj[k] = CMk[0][0]; }
  const num = polyAdd(numAdj, den.map((v) => v * D));
  return { num: num.map((v) => (Math.abs(v) < 1e-12 ? 0 : v)), den: den.map((v) => (Math.abs(v) < 1e-12 ? 0 : v)) };
}
/** c2d via Tustin (bilinear): s = (2/Ts)(z-1)/(z+1). Substitute into num(s)/den(s). */
function c2dTustin(numIn: number[], denIn: number[], Ts: number): { num: number[]; den: number[] } {
  let den = denIn.slice(); while (den.length > 1 && den[0] === 0) den.shift();
  let num = numIn.slice(); while (num.length > 1 && num[0] === 0) num.shift();
  if (num.length > den.length) throw new Error('c2d: improper transfer function');
  // Pad numerator to denominator length so both are degree n.
  const nn = num.slice(), dd = den.slice();
  while (nn.length < dd.length) nn.unshift(0);
  const n = dd.length - 1; const a = 2 / Ts;
  // For a polynomial p(s)=Σ p_k s^{n-k}, substitute s=a(z-1)/(z+1):
  //   p(s)·(z+1)^n = Σ p_k · [a(z-1)]^{n-k} · (z+1)^k   (polynomials in z, descending)
  const accum = (coeffs: number[]): number[] => {
    let res = new Array(n + 1).fill(0);
    for (let k = 0; k <= n; k++) {
      // term = coeffs[k] * (a(z-1))^{n-k} * (z+1)^k
      let term = [coeffs[k] * a ** (n - k)];
      const zm1 = [1, -1], zp1 = [1, 1];
      for (let i = 0; i < n - k; i++) term = polyConv(term, zm1);
      for (let i = 0; i < k; i++) term = polyConv(term, zp1);
      res = polyAdd(res, term);
    }
    return res;
  };
  let bn = accum(nn), an = accum(dd);
  const lead = an[0] || 1; bn = bn.map((v) => v / lead); an = an.map((v) => v / lead);
  return { num: bn.map((v) => (Math.abs(v) < 1e-12 ? 0 : v)), den: an.map((v) => (Math.abs(v) < 1e-12 ? 0 : v)) };
}

/** Refine a frequency crossing by bisection on f(w). */
function bisect(f: (w: number) => number, lo: number, hi: number): number {
  let flo = f(lo);
  if (flo === 0) return lo;   // exact root at the lower bound — don't walk away from it
  for (let it = 0; it < 200; it++) {
    const mid = 0.5 * (lo + hi); const fm = f(mid);
    if (fm === 0 || (hi - lo) < 1e-13 * Math.max(1, mid)) return mid;
    if ((flo < 0) === (fm < 0)) { lo = mid; flo = fm; } else hi = mid;
  }
  return 0.5 * (lo + hi);
}
/** L(jw) of a tf → complex value. */
function evalLjw(num: number[], den: number[], w: number): { re: number; im: number; mag: number; phaseDeg: number } {
  const nv = polyValJw(num, w), dv = polyValJw(den, w);
  const dd = dv.re * dv.re + dv.im * dv.im || 1e-300;
  const re = (nv.re * dv.re + nv.im * dv.im) / dd, im = (nv.im * dv.re - nv.re * dv.im) / dd;
  return { re, im, mag: Math.hypot(re, im), phaseDeg: (Math.atan2(im, re) * 180) / Math.PI };
}
/** margin: find phase (−180°) and gain (0 dB) crossovers; return [Gm,Pm,Wcg,Wcp]. */
function marginData(num: number[], den: number[]): { Gm: number; Pm: number; Wcg: number; Wcp: number } {
  // Log grid spanning the pole/zero frequencies (±3 decades), so margins of fast (RF/MEMS) or slow
  // systems aren't missed by a hardcoded 1e-4…1e4 window.
  const feats: number[] = [];
  for (const r of [polyRoots(num), polyRoots(den)]) for (let i = 0; i < r.re.length; i++) { const mg = Math.hypot(r.re[i], r.im[i]); if (mg > 1e-12) feats.push(mg); }
  let lo = -4, hi = 4;
  if (feats.length) { lo = Math.floor(Math.log10(Math.min(...feats))) - 3; hi = Math.ceil(Math.log10(Math.max(...feats))) + 3; }
  const N = 8000, grid: number[] = []; for (let i = 0; i <= N; i++) grid.push(10 ** (lo + ((hi - lo) * i) / N));
  const L = grid.map((w) => evalLjw(num, den, w));
  // --- phase crossover: L(jw) real & negative ⇔ Im[L]=0 with Re[L]<0 (phase = ±180°) ---
  let Wcg = NaN, Gm = Infinity;
  for (let i = 1; i < grid.length; i++) {
    const a = L[i - 1].im, b = L[i].im;
    if (a === 0 || (a < 0) !== (b < 0)) {
      const wc = bisect((w) => evalLjw(num, den, w).im, grid[i - 1], grid[i]);
      const lc = evalLjw(num, den, wc);
      if (lc.re < 0) { const gm = 1 / lc.mag; if (gm > 0 && gm < Gm) { Gm = gm; Wcg = wc; } }
    }
  }
  const gainDb = grid.map((_, i) => L[i].mag);
  // --- gain crossover: mag passes through 1 ---
  let Wcp = NaN, Pm = Infinity;
  for (let i = 1; i < grid.length; i++) {
    const a = gainDb[i - 1] - 1, b = gainDb[i] - 1;
    if (a === 0 || (a < 0) !== (b < 0)) {
      const wc = bisect((w) => evalLjw(num, den, w).mag - 1, grid[i - 1], grid[i]);
      const L = evalLjw(num, den, wc);
      let pm = L.phaseDeg + 180; // 180 + phase
      while (pm > 180) pm -= 360; while (pm < -180) pm += 360;
      if (Math.abs(pm) < Math.abs(Pm) || !isFinite(Pm)) { Pm = pm; Wcp = wc; }
    }
  }
  if (!isFinite(Pm)) { Pm = Infinity; Wcp = NaN; }
  return { Gm, Pm, Wcg, Wcp };
}

/** stepinfo from a (t,y) response: linear-interpolated rise/settle, parabolic-refined peak. */
function stepInfoFromResp(t: number[], y: number[], yfinal: number, yinit: number): Map<string, number> {
  const st = 0.02, rtLo = 0.1, rtHi = 0.9;
  const dev = yfinal - yinit;
  const interpCross = (lvl: number): number => {
    for (let i = 1; i < y.length; i++) {
      const a = y[i - 1] - lvl, b = y[i] - lvl;
      if (a === 0) return t[i - 1];
      if ((a < 0) !== (b < 0)) return t[i - 1] + (t[i] - t[i - 1]) * (lvl - y[i - 1]) / (y[i] - y[i - 1]);
    }
    return NaN;
  };
  const yLo = yinit + rtLo * dev, yHi = yinit + rtHi * dev;
  const tLo = interpCross(yLo), tHi = interpCross(yHi);
  const RiseTime = tHi - tLo;
  // SettlingMin/Max: extrema once response first reaches the rtHi level (direction-aware).
  let iHi = 0; while (iHi < y.length && (dev >= 0 ? y[iHi] < yHi : y[iHi] > yHi)) iHi++;
  if (iHi >= y.length) iHi = 0;   // never reached the rtHi threshold ⇒ scan the whole response, not none
  let sMin = Infinity, sMax = -Infinity;
  for (let i = iHi; i < y.length; i++) { sMin = Math.min(sMin, y[i]); sMax = Math.max(sMax, y[i]); }
  // SettlingTime: last time |y-yfinal| exits the ±st·|dev| band
  const band = st * Math.abs(dev);
  let SettlingTime = 0;
  for (let i = 1; i < y.length; i++) {
    const a = Math.abs(y[i - 1] - yfinal) - band, b = Math.abs(y[i] - yfinal) - band;
    if (a === 0) SettlingTime = t[i - 1];
    else if ((a < 0) !== (b < 0)) SettlingTime = t[i - 1] + (t[i] - t[i - 1]) * (0 - a) / (b - a);
  }
  // Peak deviation |y-yinit|, parabolic refine.
  let pk = -Infinity, ipk = 0;
  for (let i = 0; i < y.length; i++) { const d = Math.abs(y[i] - yinit); if (d > pk) { pk = d; ipk = i; } }
  let Peak = pk, PeakTime = t[ipk];
  if (ipk > 0 && ipk < y.length - 1) {
    const x0 = t[ipk - 1], x1 = t[ipk], x2 = t[ipk + 1];
    const f0 = Math.abs(y[ipk - 1] - yinit), f1 = Math.abs(y[ipk] - yinit), f2 = Math.abs(y[ipk + 1] - yinit);
    const denom = (x0 - x1) * (x0 - x2) * (x1 - x2);
    if (Math.abs(denom) > 1e-300) {
      const A2 = (x2 * (f1 - f0) + x1 * (f0 - f2) + x0 * (f2 - f1)) / denom;
      const B2 = (x2 * x2 * (f0 - f1) + x1 * x1 * (f2 - f0) + x0 * x0 * (f1 - f2)) / denom;
      if (A2 < 0) { const xv = -B2 / (2 * A2); if (xv > x0 && xv < x2) { PeakTime = xv; Peak = f1 - A2 * (x1 - xv) * (x1 - xv); } }
    }
  }
  // Overshoot = excursion past the final value in the step direction; Undershoot = excursion
  // opposite to the step direction past the initial value. Direction-aware for negative steps.
  const Overshoot = dev !== 0 ? Math.max(0, (dev > 0 ? sMax - yfinal : yfinal - sMin) / Math.abs(dev)) * 100 : 0;
  const Undershoot = dev !== 0 ? Math.max(0, (dev > 0 ? yinit - sMin : sMax - yinit) / Math.abs(dev)) * 100 : 0;
  return new Map<string, number>([
    ['RiseTime', RiseTime], ['SettlingTime', SettlingTime], ['SettlingMin', sMin], ['SettlingMax', sMax],
    ['Overshoot', Overshoot], ['Undershoot', Undershoot], ['Peak', Peak], ['PeakTime', PeakTime],
  ]);
}
/** Dense step response of a SISO tf on a fine uniform grid via its ss realization + expm steps. */
function stepResponse(numIn: number[], denIn: number[]): { t: number[]; y: number[]; yfinal: number } {
  let den = denIn.slice(); while (den.length > 1 && den[0] === 0) den.shift();
  let num = numIn.slice(); while (num.length > 1 && num[0] === 0) num.shift();
  if (num.length > den.length) throw new Error('step: improper transfer function');
  const g = den[0] || 1; const d = den.map((v) => v / g); let nm = num.map((v) => v / g);
  while (nm.length < d.length) nm.unshift(0);
  const no = d.length - 1; const D = nm[0];
  const yfinal = num[num.length - 1] / den[den.length - 1];
  if (no === 0) return { t: [0, 1], y: [D, D], yfinal: D };
  const A: number[][] = []; for (let i = 0; i < no; i++) { A[i] = []; for (let j = 0; j < no; j++) A[i][j] = i === 0 ? -d[j + 1] : (i - 1 === j ? 1 : 0); }
  const B = Array.from({ length: no }, (_, i) => [i === 0 ? 1 : 0]);
  const C = [Array.from({ length: no }, (_, j) => nm[j + 1] - D * d[j + 1])];
  // settle horizon from slowest pole
  const poles = polyRoots(den); let maxReal = -Infinity, minDecay = Infinity;
  for (let i = 0; i < poles.re.length; i++) { if (poles.re[i] < 0) minDecay = Math.min(minDecay, -poles.re[i]); maxReal = Math.max(maxReal, poles.re[i]); }
  // horizon ~ 8 time-constants of the slowest stable pole; generic fallback only for purely
  // oscillatory / origin poles (no decay). No magic clamp — works across µs and multi-hour scales.
  const Tfinal = isFinite(minDecay) && minDecay > 0 ? 8 / minDecay : 40;
  const Nsteps = 40000; const h = Tfinal / Nsteps;
  // discretize for fixed-step propagation: x_{k+1}=Ad x_k + Bd u, u=1 step
  const Maug: number[][] = [];
  for (let i = 0; i < no + 1; i++) { Maug[i] = []; for (let j = 0; j < no + 1; j++) Maug[i][j] = i < no && j < no ? A[i][j] * h : (i < no && j === no ? B[i][0] * h : 0); }
  const E = matExp(Maug);
  const Ad: number[][] = [], Bd: number[][] = [];
  for (let i = 0; i < no; i++) { Ad[i] = []; for (let j = 0; j < no; j++) Ad[i][j] = E[i][j]; Bd[i] = [E[i][no]]; }
  const t: number[] = [], y: number[] = []; let x = new Array(no).fill(0);
  for (let k = 0; k <= Nsteps; k++) {
    let out = D; for (let j = 0; j < no; j++) out += C[0][j] * x[j];
    t.push(k * h); y.push(out);
    const xn = new Array(no).fill(0);
    for (let i = 0; i < no; i++) { let s = Bd[i][0]; for (let j = 0; j < no; j++) s += Ad[i][j] * x[j]; xn[i] = s; }
    x = xn;
  }
  return { t, y, yfinal };
}

/** Impulse response of a SISO tf: y(t)=C·e^{At}·B on the controllable-canonical realization. */
function impulseResponse(numIn: number[], denIn: number[]): { t: number[]; y: number[] } {
  let den = denIn.slice(); while (den.length > 1 && den[0] === 0) den.shift();
  let num = numIn.slice(); while (num.length > 1 && num[0] === 0) num.shift();
  if (num.length > den.length) throw new Error('impulse: improper transfer function');
  const g = den[0] || 1; const d = den.map((v) => v / g); const nm = num.map((v) => v / g);
  while (nm.length < d.length) nm.unshift(0);
  const no = d.length - 1; const D = nm[0];
  if (no === 0) return { t: [0, 1], y: [0, 0] };
  const A: number[][] = []; for (let i = 0; i < no; i++) { A[i] = []; for (let j = 0; j < no; j++) A[i][j] = i === 0 ? -d[j + 1] : (i - 1 === j ? 1 : 0); }
  const C = Array.from({ length: no }, (_, j) => nm[j + 1] - D * d[j + 1]);
  const poles = polyRoots(den); let minDecay = Infinity;
  for (let i = 0; i < poles.re.length; i++) if (poles.re[i] < 0) minDecay = Math.min(minDecay, -poles.re[i]);
  const Tfinal = isFinite(minDecay) && minDecay > 0 ? 8 / minDecay : 40;
  const Nsteps = 40000; const h = Tfinal / Nsteps;
  const Ad = matExp(A.map((row) => row.map((v) => v * h)));
  let x = Array.from({ length: no }, (_, i) => (i === 0 ? 1 : 0));   // x0 = B (impulse injects B)
  const t: number[] = [], y: number[] = [];
  for (let k = 0; k <= Nsteps; k++) {
    let out = 0; for (let j = 0; j < no; j++) out += C[j] * x[j];
    t.push(k * h); y.push(out);
    const xn = new Array(no).fill(0);
    for (let i = 0; i < no; i++) { let s = 0; for (let j = 0; j < no; j++) s += Ad[i][j] * x[j]; xn[i] = s; }
    x = xn;
  }
  return { t, y };
}

/** lsim: response of a SISO tf to input samples u at (uniform) times t, via ZOH discretization. */
function lsimResponse(numIn: number[], denIn: number[], u: number[], tIn: number[]): { t: number[]; y: number[] } {
  let den = denIn.slice(); while (den.length > 1 && den[0] === 0) den.shift();
  let num = numIn.slice(); while (num.length > 1 && num[0] === 0) num.shift();
  if (num.length > den.length) throw new Error('lsim: improper transfer function');
  const g = den[0] || 1; const d = den.map((v) => v / g); const nm = num.map((v) => v / g);
  while (nm.length < d.length) nm.unshift(0);
  const no = d.length - 1; const D = nm[0]; const t = tIn.slice();
  if (no === 0) return { t, y: u.map((uk) => D * uk) };
  const h = t.length > 1 ? t[1] - t[0] : 0.01;
  const A: number[][] = []; for (let i = 0; i < no; i++) { A[i] = []; for (let j = 0; j < no; j++) A[i][j] = i === 0 ? -d[j + 1] : (i - 1 === j ? 1 : 0); }
  const C = Array.from({ length: no }, (_, j) => nm[j + 1] - D * d[j + 1]);
  // ZOH: [Ad Bd; 0 1] = expm([A B; 0 0]·h), B = e1
  const Maug: number[][] = [];
  for (let i = 0; i < no + 1; i++) { Maug[i] = []; for (let j = 0; j < no + 1; j++) Maug[i][j] = i < no && j < no ? A[i][j] * h : (i < no && j === no ? (i === 0 ? h : 0) : 0); }
  const E = matExp(Maug);
  const Ad: number[][] = [], Bd: number[] = [];
  for (let i = 0; i < no; i++) { Ad[i] = []; for (let j = 0; j < no; j++) Ad[i][j] = E[i][j]; Bd[i] = E[i][no]; }
  let x = new Array(no).fill(0); const y: number[] = [];
  for (let k = 0; k < t.length; k++) {
    const uk = u[k] ?? u[u.length - 1];
    let out = D * uk; for (let j = 0; j < no; j++) out += C[j] * x[j]; y.push(out);
    const xn = new Array(no).fill(0);
    for (let i = 0; i < no; i++) { let s = Bd[i] * uk; for (let j = 0; j < no; j++) s += Ad[i][j] * x[j]; xn[i] = s; }
    x = xn;
  }
  return { t, y };
}

/** minreal: cancel coincident num/den roots within tol; rebuild tf. */
function minrealTf(num: number[], den: number[], tol: number): { num: number[]; den: number[] } {
  const z = polyRoots(num), p = polyRoots(den);
  // leading gains
  let i0 = 0; while (i0 < num.length && Math.abs(num[i0]) < 1e-300) i0++;
  let j0 = 0; while (j0 < den.length && Math.abs(den[j0]) < 1e-300) j0++;
  const kn = num[i0] ?? 0, kd = den[j0] ?? 1;
  const zr = z.re.slice(), zi = z.im.slice(), pr = p.re.slice(), pi = p.im.slice();
  const usedP = new Array(pr.length).fill(false);
  const zKeepR: number[] = [], zKeepI: number[] = [], pKeepR: number[] = [], pKeepI: number[] = [];
  for (let a = 0; a < zr.length; a++) {
    let best = -1, bd = tol;
    for (let b = 0; b < pr.length; b++) if (!usedP[b]) { const dist = Math.hypot(zr[a] - pr[b], zi[a] - pi[b]); if (dist <= bd) { bd = dist; best = b; } }
    if (best >= 0) usedP[best] = true; else { zKeepR.push(zr[a]); zKeepI.push(zi[a]); }
  }
  for (let b = 0; b < pr.length; b++) if (!usedP[b]) { pKeepR.push(pr[b]); pKeepI.push(pi[b]); }
  const k = kn / kd;
  let n2 = polyFromRoots(zKeepR, zKeepI).map((v) => v * k);
  let d2 = polyFromRoots(pKeepR, pKeepI);
  // normalize so leading den coeff = 1 (MATLAB minreal returns monic-den scaling implicitly via tf)
  const lead = d2[0] || 1; n2 = n2.map((v) => v / lead); d2 = d2.map((v) => v / lead);
  return { num: n2.map((v) => (Math.abs(v) < 1e-10 ? 0 : v)), den: d2.map((v) => (Math.abs(v) < 1e-10 ? 0 : v)) };
}

// ════════════════════════════ Unified MIMO LTI core ════════════════════════════
// Canonical computational form = state-space. Every tf/zpk/ss/static-gain converts to an `SS`
// struct via toSS(); the result of an operation converts back to the primary operand's class via
// fromSS(). Operators (*, +, -, /, \, ^, ', unary -) and interconnections (series/parallel/
// feedback/append/lft) are all implemented once on SS, so they work uniformly and MIMO.
interface SS { A: number[][]; B: number[][]; C: number[][]; D: number[][]; Ts: number }
const zeros2 = (r: number, c: number): number[][] => Array.from({ length: r }, () => new Array(c).fill(0));
// Dimension-safe dense multiply (returns a correctly-shaped zero block when an inner/outer dim is 0).
function smul(A: number[][], B: number[][]): number[][] {
  const n = A.length, inner = A[0]?.length ?? 0, c = B[0]?.length ?? 0;
  const out = zeros2(n, c); if (!n || !c || !inner) return out;
  for (let i = 0; i < n; i++) for (let j = 0; j < c; j++) { let s = 0; for (let k = 0; k < inner; k++) s += A[i][k] * B[k][j]; out[i][j] = s; } return out;
}
const blk = (X: number[][], Y: number[][]): number[][] => {
  const r1 = X.length, c1 = X[0]?.length ?? 0, r2 = Y.length, c2 = Y[0]?.length ?? 0, M = zeros2(r1 + r2, c1 + c2);
  for (let i = 0; i < r1; i++) for (let j = 0; j < c1; j++) M[i][j] = X[i][j];
  for (let i = 0; i < r2; i++) for (let j = 0; j < c2; j++) M[r1 + i][c1 + j] = Y[i][j];
  return M;
};
const getTsV = (sys: Value): number => (isObject(sys) && sys.props.has('Ts') ? asScalar(sys.props.get('Ts') as Value) : 0);
const clsOf = (v: Value): string => (isObject(v) ? v.className : 'tf');
const rcls = (a: Value, b: Value): string => (isObject(a) ? a.className : isObject(b) ? b.className : 'tf');
// Expand a possibly-scalar D Value to a ny×nu dense matrix.
function expandD(Dv: Value | undefined, ny: number, nu: number): number[][] {
  if (Dv === undefined) return zeros2(ny, nu);
  const Dm = m(Dv);
  if (Dm.rows === ny && Dm.cols === nu) return matRows(Dm);
  const o = zeros2(ny, nu); if (Dm.rows * Dm.cols === 1) { const v = Dm.data[0]; for (let i = 0; i < ny; i++) for (let j = 0; j < nu; j++) o[i][j] = v; }
  return o;
}
// One SISO transfer function → controllable-canonical SS (matches tf2ss).
function siso2ss(numIn: number[], denIn: number[]): SS {
  let den0 = denIn.slice(); while (den0.length > 1 && den0[0] === 0) den0.shift();   // drop leading-zero den coeffs
  let num0 = numIn.slice(); while (num0.length > 1 && num0[0] === 0) num0.shift();
  if (num0.length > den0.length) throw new Error('improper transfer function (numerator degree exceeds denominator) cannot be realized in state space');
  const g = den0[0] || 1; const den = den0.map((v) => v / g); let num = num0.map((v) => v / g);
  while (num.length < den.length) num.unshift(0);
  const no = den.length - 1, Dval = num[0];
  if (no <= 0) return { A: [], B: zeros2(0, 1), C: zeros2(1, 0), D: [[Dval]], Ts: 0 };
  const A = zeros2(no, no); for (let j = 0; j < no; j++) A[0][j] = -den[j + 1]; for (let i = 1; i < no; i++) A[i][i - 1] = 1;
  const B = zeros2(no, 1); B[0][0] = 1;
  const C = [Array.from({ length: no }, (_, j) => num[j + 1] - Dval * den[j + 1])];
  return { A, B, C, D: [[Dval]], Ts: 0 };
}
// Assemble a MIMO SS from per-channel (num,den) by block-diagonal stacking of SISO realizations.
function channelsToSS(num: number[][][], den: number[][][], ny: number, nu: number, Ts: number): SS {
  const subs: { s: SS; i: number; j: number }[] = []; let ntot = 0;
  for (let i = 0; i < ny; i++) for (let j = 0; j < nu; j++) { const s = siso2ss(num[i][j], den[i][j]); subs.push({ s, i, j }); ntot += s.A.length; }
  const A = zeros2(ntot, ntot), B = zeros2(ntot, nu), C = zeros2(ny, ntot), D = zeros2(ny, nu); let off = 0;
  for (const { s, i, j } of subs) { const n = s.A.length;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) A[off + a][off + b] = s.A[a][b];
    for (let a = 0; a < n; a++) B[off + a][j] = s.B[a][0];
    for (let b = 0; b < n; b++) C[i][off + b] = s.C[0][b];
    D[i][j] = s.D[0][0]; off += n;
  }
  return { A, B, C, D, Ts };
}
// tf object → per-channel num/den (handles SISO rowVec and MIMO cell storage).
function tfChannels(v: ClassV): { ny: number; nu: number; num: number[][][]; den: number[][][] } {
  const numP = v.props.get('num')!, denP = v.props.get('den')!;
  if (isCell(numP)) {
    const ny = numP.rows, nu = numP.cols, num: number[][][] = [], den: number[][][] = [];
    for (let i = 0; i < ny; i++) { num.push([]); den.push([]); for (let j = 0; j < nu; j++) { num[i].push(toArray(m((numP as Cell).items[i + j * ny]))); den[i].push(toArray(m((denP as Cell).items[i + j * ny]))); } }
    return { ny, nu, num, den };
  }
  return { ny: 1, nu: 1, num: [[toArray(m(numP))]], den: [[toArray(m(denP))]] };
}
// zpk object → per-channel num/den (expand each (z,p,k); handles SISO and MIMO cell storage).
function zpkChannels(v: ClassV): { ny: number; nu: number; num: number[][][]; den: number[][][] } {
  // expand from roots, preserving complex zero/pole imaginary parts (idata).
  const reim = (M: Mat): { re: number[]; im: number[] } => ({ re: Array.from(M.data), im: M.idata ? Array.from(M.idata) : Array.from(M.data, () => 0) });
  const conv = (zM: Mat, pM: Mat, k: number) => { const z = reim(zM), p = reim(pM); let num = polyFromRoots(z.re, z.im).map((x) => x * k); const den = polyFromRoots(p.re, p.im); while (num.length < den.length) num.unshift(0); return { num, den }; };
  const zP = v.props.get('z')!, pP = v.props.get('p')!, kP = v.props.get('k')!;
  if (isCell(zP)) {
    const ny = zP.rows, nu = zP.cols, km = m(kP), num: number[][][] = [], den: number[][][] = [];
    for (let i = 0; i < ny; i++) { num.push([]); den.push([]); for (let j = 0; j < nu; j++) { const c = conv(m((zP as Cell).items[i + j * ny]), m((pP as Cell).items[i + j * ny]), km.data[i + j * km.rows]); num[i].push(c.num); den[i].push(c.den); } }
    return { ny, nu, num, den };
  }
  const c = conv(m(zP), m(pP), asScalar(kP));
  return { ny: 1, nu: 1, num: [[c.num]], den: [[c.den]] };
}
function toSS(v: Value): SS {
  if (isObject(v)) {
    const Ts = getTsV(v);
    if (v.className === 'ss' || v.className === 'dss') {
      const Bmat = m(v.props.get('B') as Mat), Cmat = m(v.props.get('C') as Mat);
      return { A: matRows(m(v.props.get('A') as Mat)), B: matRows(Bmat), C: matRows(Cmat), D: expandD(v.props.get('D'), Cmat.rows, Bmat.cols), Ts };
    }
    if (v.className === 'tf') { const { ny, nu, num, den } = tfChannels(v); return channelsToSS(num, den, ny, nu, Ts); }
    if (v.className === 'zpk') { const { ny, nu, num, den } = zpkChannels(v); return channelsToSS(num, den, ny, nu, Ts); }
    // ── PID object types → transfer-function SS realization ──
    if (v.className === 'pid' || v.className === 'pid2') {
      // Parallel form: C(s) = Kp + Ki/s + Kd*s/(Tf*s+1)
      // tf = [(Kp*Tf+Kd)*s^2 + (Kp+Ki*Tf)*s + Ki] / [Tf*s^2 + s]  (Tf>0)
      // tf = [Kd*s^2 + Kp*s + Ki] / [s^2]  → wait for Tf=0:
      //    = [Kd, Kp, Ki] / [0, 1, 0]  i.e. (Kd*s^2+Kp*s+Ki)/s
      const Kp = asScalar(v.props.get('Kp') as Value ?? scalar(0));
      const Ki = asScalar(v.props.get('Ki') as Value ?? scalar(0));
      const Kd = asScalar(v.props.get('Kd') as Value ?? scalar(0));
      const Tf = asScalar(v.props.get('Tf') as Value ?? scalar(0));
      if (v.className === 'pid') {
        // SISO 1x1 controller
        let num: number[], den: number[];
        if (Tf > 0) {
          num = [(Kp * Tf + Kd), (Kp + Ki * Tf), Ki];
          den = [Tf, 1, 0];
        } else {
          num = [Kd, Kp, Ki];
          den = [1, 0];
        }
        return channelsToSS([[num]], [[den]], 1, 1, Ts);
      } else {
        // pid2: 2-DOF, 1×2 system [C_r(s), C_y(s)]
        // C_r(s): acts on reference r  = Kp*b + Ki/s + Kd*c*s/(Tf*s+1)
        // C_y(s): acts on output y (negated) = Kp + Ki/s + Kd*s/(Tf*s+1) (same as 1-DOF)
        // tf(pid2) = [C_r(s), -C_y(s)] matching MATLAB (first col: r, second: -y)
        const b = asScalar(v.props.get('b') as Value ?? scalar(1));
        const c = asScalar(v.props.get('c') as Value ?? scalar(1));
        let numR: number[], numY: number[], den: number[];
        if (Tf > 0) {
          numR = [(Kp * b * Tf + Kd * c), (Kp * b + Ki * Tf), Ki];
          numY = [-(Kp * Tf + Kd), -(Kp + Ki * Tf), -Ki];
          den = [Tf, 1, 0];
        } else {
          numR = [Kd * c, Kp * b, Ki];
          numY = [-Kd, -Kp, -Ki];
          den = [1, 0];
        }
        // 1×2 MIMO tf (1 output u, 2 inputs [r, y])
        return channelsToSS([[numR, numY]], [[den, den]], 1, 2, Ts);
      }
    }
    if (v.className === 'pidstd') {
      // Standard form: Kp*(1 + 1/(Ti*s) + Td*N*s/(Td*s+N))
      // With N=Inf (ideal): Kp*(1 + 1/(Ti*s) + Td*s) = pid(Kp, Kp/Ti, Kp*Td, 0)
      // With finite N: Tf = Td/N, Ki = Kp/Ti, Kd = Kp*Td  → pid(Kp, Ki, Kd, Tf)
      const Kp = asScalar(v.props.get('Kp') as Value ?? scalar(1));
      const Ti = asScalar(v.props.get('Ti') as Value ?? scalar(Infinity));
      const Td = asScalar(v.props.get('Td') as Value ?? scalar(0));
      const N  = asScalar(v.props.get('N')  as Value ?? scalar(Infinity));
      const Ki = isFinite(Ti) ? Kp / Ti : 0;
      const Kd = Kp * Td;
      const Tf = isFinite(N) && N > 0 ? Td / N : 0;
      let num: number[], den: number[];
      if (Tf > 0) {
        num = [(Kp * Tf + Kd), (Kp + Ki * Tf), Ki];
        den = [Tf, 1, 0];
      } else {
        num = [Kd, Kp, Ki];
        den = [1, 0];
      }
      return channelsToSS([[num]], [[den]], 1, 1, Ts);
    }
  }
  const M = m(v); return { A: [], B: zeros2(0, M.cols), C: zeros2(M.rows, 0), D: matRows(M), Ts: 0 };
}
const ssDims = (s: SS): { ny: number; nu: number } => ({ ny: s.D.length, nu: s.D[0]?.length ?? 0 });
// SISO sub-system (output i, input j) of an SS → (num,den).
function ssSub(s: SS, i: number, j: number): { num: number[]; den: number[] } {
  const Dij = s.D[i]?.[j] ?? 0;
  if (s.A.length === 0) return { num: [Dij], den: [1] };
  return ss2tfFL(s.A, s.B.map((r) => [r[j]]), [s.C[i].slice()], Dij);
}
function mkSS(s: SS): Value {
  const props: Record<string, Value> = { A: fromRows(s.A), B: fromRows(s.B), C: fromRows(s.C), D: fromRows(s.D) };
  if (s.Ts) props.Ts = scalar(s.Ts); return makeObject('ss', props);
}
const kFromPoly = (num: number[], den: number[]): number => { let i = 0; while (i < num.length && num[i] === 0) i++; let j = 0; while (j < den.length && den[j] === 0) j++; return (num[i] ?? 0) / (den[j] ?? 1); };
function fromSS(s: SS, cls: string): Value {
  if (cls === 'ss' || cls === 'dss' || cls === 'frd') return mkSS(s);
  const { ny, nu } = ssDims(s);
  // MIMO results stay in state-space: per-channel tf/zpk cells lose the shared-state structure
  // (each channel would carry the full characteristic polynomial), so keep the minimal SS form.
  if (ny > 1 || nu > 1) return mkSS(s);
  if (cls === 'zpk') {
    if (ny === 1 && nu === 1) { const { num, den } = ssSub(s, 0, 0); const props: Record<string, Value> = { z: rootsValue(sortRoots(polyRoots(num))), p: rootsValue(sortRoots(polyRoots(den))), k: scalar(kFromPoly(num, den)) }; if (s.Ts) props.Ts = scalar(s.Ts); return makeObject('zpk', props); }
    const zit: Value[] = new Array(ny * nu), pit: Value[] = new Array(ny * nu), kk = zeros2(ny, nu);
    for (let i = 0; i < ny; i++) for (let j = 0; j < nu; j++) { const { num, den } = ssSub(s, i, j); zit[i + j * ny] = rootsValue(sortRoots(polyRoots(num))); pit[i + j * ny] = rootsValue(sortRoots(polyRoots(den))); kk[i][j] = kFromPoly(num, den); }
    const props: Record<string, Value> = { z: makeCell(ny, nu, zit), p: makeCell(ny, nu, pit), k: fromRows(kk) }; if (s.Ts) props.Ts = scalar(s.Ts); return makeObject('zpk', props);
  }
  // tf (default)
  if (ny === 1 && nu === 1) { const { num, den } = ssSub(s, 0, 0); const props: Record<string, Value> = { num: rowVec(num), den: rowVec(den) }; if (s.Ts) props.Ts = scalar(s.Ts); return makeObject('tf', props); }
  const nit: Value[] = new Array(ny * nu), dit: Value[] = new Array(ny * nu);
  for (let i = 0; i < ny; i++) for (let j = 0; j < nu; j++) { const { num, den } = ssSub(s, i, j); nit[i + j * ny] = rowVec(num); dit[i + j * ny] = rowVec(den); }
  const props: Record<string, Value> = { num: makeCell(ny, nu, nit), den: makeCell(ny, nu, dit) }; if (s.Ts) props.Ts = scalar(s.Ts); return makeObject('tf', props);
}

// ── SS algebra ──
const combTs = (a: SS, b: SS): number => a.Ts || b.Ts;
const ssNeg = (s: SS): SS => ({ A: s.A, B: s.B, C: s.C.map((r) => r.map((x) => -x)), D: s.D.map((r) => r.map((x) => -x)), Ts: s.Ts });
const ssTranspose = (s: SS): SS => ({ A: matT(s.A), B: matT(s.C), C: matT(s.B), D: matT(s.D), Ts: s.Ts });
// Cascade: signal u → P → Q → y (so series(P,Q); mtimes(a,b)=a*b uses cascade(b,a)).
function ssCascade(P: SS, Q: SS): SS {
  const nP = P.A.length, nQ = Q.A.length, mP = P.D[0]?.length ?? 0, pQ = Q.D.length;
  const A = blk(P.A, Q.A); const BQCP = smul(Q.B, P.C); for (let i = 0; i < nQ; i++) for (let j = 0; j < nP; j++) A[nP + i][j] = BQCP[i][j];
  const B = zeros2(nP + nQ, mP); for (let i = 0; i < nP; i++) for (let j = 0; j < mP; j++) B[i][j] = P.B[i][j];
  const BQDP = smul(Q.B, P.D); for (let i = 0; i < nQ; i++) for (let j = 0; j < mP; j++) B[nP + i][j] = BQDP[i][j];
  const C = zeros2(pQ, nP + nQ); const DQCP = smul(Q.D, P.C); for (let i = 0; i < pQ; i++) for (let j = 0; j < nP; j++) C[i][j] = DQCP[i][j];
  for (let i = 0; i < pQ; i++) for (let j = 0; j < nQ; j++) C[i][nP + j] = Q.C[i][j];
  return { A, B, C, D: smul(Q.D, P.D), Ts: combTs(P, Q) };
}
function ssParallel(s1: SS, s2: SS): SS {
  const n1 = s1.A.length, n2 = s2.A.length, m1 = s1.D[0]?.length ?? 0, p1 = s1.D.length, A = blk(s1.A, s2.A);
  const B = zeros2(n1 + n2, m1); for (let i = 0; i < n1; i++) for (let j = 0; j < m1; j++) B[i][j] = s1.B[i][j]; for (let i = 0; i < n2; i++) for (let j = 0; j < m1; j++) B[n1 + i][j] = s2.B[i][j];
  const C = zeros2(p1, n1 + n2); for (let i = 0; i < p1; i++) for (let j = 0; j < n1; j++) C[i][j] = s1.C[i][j]; for (let i = 0; i < p1; i++) for (let j = 0; j < n2; j++) C[i][n1 + j] = s2.C[i][j];
  // D addition with scalar broadcast: a 1×1 static gain (e.g. sys + 2) applies to every channel.
  const d2 = (i: number, j: number): number => (s2.D.length === 1 && s2.D[0].length === 1 ? s2.D[0][0] : (s2.D[i]?.[j] ?? 0));
  return { A, B, C, D: s1.D.map((r, i) => r.map((x, j) => x + d2(i, j))), Ts: combTs(s1, s2) };
}
function ssInv(s: SS): SS {
  const p = s.D.length, mm = s.D[0]?.length ?? 0; if (p !== mm) throw new Error('inv: system must be square');
  const Di = matInv(s.D), n = s.A.length;
  return { A: n ? matSub(s.A, smul(smul(s.B, Di), s.C)) : [], B: n ? smul(s.B, Di) : zeros2(0, mm), C: n ? smul(Di, s.C).map((r) => r.map((x) => -x)) : zeros2(p, 0), D: Di, Ts: s.Ts };
}
// Integer matrix power: sys^k (k>0 cascade, k=0 identity gain, k<0 inverse then power).
function ssPow(s: SS, k: number): SS {
  const p = s.D.length; if (k === 0) { const I = zeros2(p, p); for (let i = 0; i < p; i++) I[i][i] = 1; return { A: [], B: zeros2(0, p), C: zeros2(p, 0), D: I, Ts: s.Ts }; }
  const base = k < 0 ? ssInv(s) : s; let r = base; for (let i = 1; i < Math.abs(k); i++) r = ssCascade(r, base); return r;
}
// feedback(G,H,sign): closed loop r→y with e = r + sign*(H*y), default sign=-1 (negative).
function ssFeedback(G: SS, H: SS, sign: number): SS {
  const nG = G.A.length, nH = H.A.length, pG = G.D.length, mG = G.D[0]?.length ?? 0;
  const I = zeros2(pG, pG); for (let i = 0; i < pG; i++) I[i][i] = 1;
  const Ei = matInv(matSub(I, smul(G.D, H.D).map((r) => r.map((x) => sign * x))));   // (I - sign*DG*DH)^-1
  const Cy1 = smul(Ei, G.C);                                   // pG×nG
  const Cy2 = smul(Ei, smul(G.D, H.C).map((r) => r.map((x) => sign * x)));   // pG×nH
  const Dyr = smul(Ei, G.D);                                   // pG×mG
  const sBGDH = smul(G.B, H.D).map((r) => r.map((x) => sign * x));   // nG×pG
  const A11 = matAddT(G.A, smul(sBGDH, Cy1));
  const sBGCH = smul(G.B, H.C).map((r) => r.map((x) => sign * x));   // nG×nH
  const A12 = matAddT(sBGCH, smul(sBGDH, Cy2));
  const A21 = smul(H.B, Cy1);                                  // nH×nG
  const A22 = matAddT(H.A, smul(H.B, Cy2));
  const A = zeros2(nG + nH, nG + nH);
  for (let i = 0; i < nG; i++) { for (let j = 0; j < nG; j++) A[i][j] = A11[i]?.[j] ?? 0; for (let j = 0; j < nH; j++) A[i][nG + j] = A12[i]?.[j] ?? 0; }
  for (let i = 0; i < nH; i++) { for (let j = 0; j < nG; j++) A[nG + i][j] = A21[i]?.[j] ?? 0; for (let j = 0; j < nH; j++) A[nG + i][nG + j] = A22[i]?.[j] ?? 0; }
  const B = zeros2(nG + nH, mG); const B1 = matAddT(G.B, smul(sBGDH, Dyr)), B2 = smul(H.B, Dyr);
  for (let i = 0; i < nG; i++) for (let j = 0; j < mG; j++) B[i][j] = B1[i]?.[j] ?? 0;
  for (let i = 0; i < nH; i++) for (let j = 0; j < mG; j++) B[nG + i][j] = B2[i]?.[j] ?? 0;
  const C = zeros2(pG, nG + nH); for (let i = 0; i < pG; i++) { for (let j = 0; j < nG; j++) C[i][j] = Cy1[i]?.[j] ?? 0; for (let j = 0; j < nH; j++) C[i][nG + j] = Cy2[i]?.[j] ?? 0; }
  return { A, B, C, D: Dyr, Ts: combTs(G, H) };
}
// add two same-shape matrices, tolerating empty operands
const matAddT = (A: number[][], B: number[][]): number[][] => A.map((r, i) => r.map((x, j) => x + (B[i]?.[j] ?? 0)));

// SISO (num,den) view of an operand, or null if MIMO. Lets tf/zpk arithmetic stay polynomial
// (exact, and able to represent improper results that a proper state-space cannot).
// PID controller → SISO (num,den). Improper-safe: for Tf=0 the numerator degree exceeds the
// denominator's (ideal derivative), which a state-space realization cannot represent — so PID
// arithmetic must stay polynomial.
function pidNumDen(v: ClassV): { num: number[]; den: number[] } {
  let Kp: number, Ki: number, Kd: number, Tf: number;
  if (v.className === 'pidstd') {
    Kp = asScalar(v.props.get('Kp') as Value);
    const Ti = asScalar(v.props.get('Ti') as Value), Td = asScalar(v.props.get('Td') as Value), N = asScalar(v.props.get('N') as Value);
    Ki = isFinite(Ti) ? Kp / Ti : 0; Kd = Kp * Td; Tf = isFinite(N) && N > 0 ? Td / N : 0;
  } else {
    Kp = asScalar(v.props.get('Kp') as Value); Ki = asScalar(v.props.get('Ki') as Value);
    Kd = asScalar(v.props.get('Kd') as Value); Tf = asScalar(v.props.get('Tf') as Value);
  }
  return Tf > 0 ? { num: [Kp * Tf + Kd, Kp + Ki * Tf, Ki], den: [Tf, 1, 0] } : { num: [Kd, Kp, Ki], den: [1, 0] };
}
function sisoNDof(v: Value): { num: number[]; den: number[] } | null {
  if (isObject(v)) {
    if (v.className === 'tf') { const numP = v.props.get('num')!; if (isCell(numP)) { if (numP.rows !== 1 || numP.cols !== 1) return null; return { num: toArray(m((numP as Cell).items[0])), den: toArray(m((v.props.get('den') as Cell).items[0])) }; } return { num: toArray(m(numP)), den: toArray(m(v.props.get('den')!)) }; }
    if (v.className === 'zpk') { const { ny, nu, num, den } = zpkChannels(v); return ny === 1 && nu === 1 ? { num: num[0][0], den: den[0][0] } : null; }
    if (v.className === 'ss' || v.className === 'dss') { const s = toSS(v); const { ny, nu } = ssDims(s); return ny === 1 && nu === 1 ? ssSub(s, 0, 0) : null; }
    if (v.className === 'pid' || v.className === 'pidstd') return pidNumDen(v);   // SISO PID, improper-safe
    return null;
  }
  const M = m(v); return M.rows * M.cols === 1 ? { num: [M.data[0]], den: [1] } : null;
}
function fromTfND(num: number[], den: number[], Ts: number, cls: string): Value {
  const n2 = num.map((v) => (Math.abs(v) < 1e-12 ? 0 : v)), d2 = den.map((v) => (Math.abs(v) < 1e-12 ? 0 : v));
  if (cls === 'zpk') { const props: Record<string, Value> = { z: rootsValue(sortRoots(polyRoots(n2))), p: rootsValue(sortRoots(polyRoots(d2))), k: scalar(kFromPoly(n2, d2)) }; if (Ts) props.Ts = scalar(Ts); return makeObject('zpk', props); }
  if (cls === 'ss' || cls === 'dss') return mkSS(channelsToSS([[n2]], [[d2]], 1, 1, Ts));
  const props: Record<string, Value> = { num: rowVec(n2), den: rowVec(d2) }; if (Ts) props.Ts = scalar(Ts); return makeObject('tf', props);
}
// LTI operator-method table shared by tf/ss/zpk registration. Each receives [a,b] (the operands).
// SISO tf/zpk/scalar operands use polynomial arithmetic; anything MIMO routes through state-space.
const tsOf2 = (a: Value, b: Value): number => getTsV(a) || getTsV(b);
const LTI_OPS: Record<string, Builtin> = {
  mtimes: (a) => { const A = sisoNDof(a[0]), B = sisoNDof(a[1]); return A && B ? ret(fromTfND(polyConv(A.num, B.num), polyConv(A.den, B.den), tsOf2(a[0], a[1]), rcls(a[0], a[1]))) : ret(fromSS(ssCascade(toSS(a[1]), toSS(a[0])), rcls(a[0], a[1]))); },
  plus: (a) => { const A = sisoNDof(a[0]), B = sisoNDof(a[1]); return A && B ? ret(fromTfND(polyAdd(polyConv(A.num, B.den), polyConv(B.num, A.den)), polyConv(A.den, B.den), tsOf2(a[0], a[1]), rcls(a[0], a[1]))) : ret(fromSS(ssParallel(toSS(a[0]), toSS(a[1])), rcls(a[0], a[1]))); },
  minus: (a) => { const A = sisoNDof(a[0]), B = sisoNDof(a[1]); return A && B ? ret(fromTfND(polyAdd(polyConv(A.num, B.den), polyConv(B.num.map((x) => -x), A.den)), polyConv(A.den, B.den), tsOf2(a[0], a[1]), rcls(a[0], a[1]))) : ret(fromSS(ssParallel(toSS(a[0]), ssNeg(toSS(a[1]))), rcls(a[0], a[1]))); },
  uminus: (a) => { const A = sisoNDof(a[0]); return A ? ret(fromTfND(A.num.map((x) => -x), A.den, getTsV(a[0]), clsOf(a[0]))) : ret(fromSS(ssNeg(toSS(a[0])), clsOf(a[0]))); },
  inv: (a) => { const A = sisoNDof(a[0]); return A ? ret(fromTfND(A.den, A.num, getTsV(a[0]), clsOf(a[0]))) : ret(fromSS(ssInv(toSS(a[0])), clsOf(a[0]))); },
  mrdivide: (a) => { const A = sisoNDof(a[0]), B = sisoNDof(a[1]); return A && B ? ret(fromTfND(polyConv(A.num, B.den), polyConv(A.den, B.num), tsOf2(a[0], a[1]), rcls(a[0], a[1]))) : ret(fromSS(ssCascade(ssInv(toSS(a[1])), toSS(a[0])), rcls(a[0], a[1]))); },
  mldivide: (a) => { const A = sisoNDof(a[0]), B = sisoNDof(a[1]); return A && B ? ret(fromTfND(polyConv(B.num, A.den), polyConv(B.den, A.num), tsOf2(a[0], a[1]), rcls(a[0], a[1]))) : ret(fromSS(ssCascade(toSS(a[1]), ssInv(toSS(a[0]))), rcls(a[0], a[1]))); },
  mpower: (a) => { const k = Math.round(asScalar(a[1])); const A = sisoNDof(a[0]); if (A) { let num = [1], den = [1]; const base = k < 0 ? { num: A.den, den: A.num } : A; for (let i = 0; i < Math.abs(k); i++) { num = polyConv(num, base.num); den = polyConv(den, base.den); } return ret(fromTfND(num, den, getTsV(a[0]), clsOf(a[0]))); } return ret(fromSS(ssPow(toSS(a[0]), k), clsOf(a[0]))); },
  ctranspose: (a) => ret(fromSS(ssTranspose(toSS(a[0])), clsOf(a[0]))),
  transpose: (a) => ret(fromSS(ssTranspose(toSS(a[0])), clsOf(a[0]))),
  series: (a) => { const A = sisoNDof(a[0]), B = sisoNDof(a[1]); return A && B ? ret(fromTfND(polyConv(A.num, B.num), polyConv(A.den, B.den), tsOf2(a[0], a[1]), rcls(a[0], a[1]))) : ret(fromSS(ssCascade(toSS(a[0]), toSS(a[1])), rcls(a[0], a[1]))); },
  append: (a) => ltiAppend(a),   // registered as a method so it isn't shadowed by the base string `append`
};
// Interconnection builtins (global; MIMO via SS). H defaults to identity for feedback(G).
const ltiParallel = (a: Value[]): Promise<Value[]> => ret(fromSS(ssParallel(toSS(a[0]), toSS(a[1])), rcls(a[0], a[1])));
const ltiFeedback = (a: Value[]): Promise<Value[]> => {
  const sign = a.length >= 3 ? Math.sign(asScalar(a[2])) || -1 : -1;
  // SISO polynomial fast-path: cl = Gn·Hd / (Gd·Hd − sign·Gn·Hn). Handles an improper G (e.g. a
  // PID controller) whose closed loop is nonetheless proper — avoids an improper state-space realize.
  const Gnd = sisoNDof(a[0]); const Hnd = a.length >= 2 ? sisoNDof(a[1]) : { num: [1], den: [1] };
  if (Gnd && Hnd) {
    const clNum = polyConv(Gnd.num, Hnd.den);
    const clDen = polyAdd(polyConv(Gnd.den, Hnd.den), polyConv(Gnd.num, Hnd.num).map((x) => -sign * x));
    while (clNum.length < clDen.length) clNum.unshift(0);
    return ret(fromTfND(clNum, clDen, getTsV(a[0]) || (a.length >= 2 ? getTsV(a[1]) : 0), rcls(a[0], a.length >= 2 ? a[1] : a[0])));
  }
  const G = toSS(a[0]); const H = a.length >= 2 ? toSS(a[1]) : toSS(scalar(1));
  return ret(fromSS(ssFeedback(G, H, sign), rcls(a[0], a.length >= 2 ? a[1] : a[0])));
};
const ltiAppend = (a: Value[]): Promise<Value[]> => { let s = toSS(a[0]); for (let i = 1; i < a.length; i++) { const t = toSS(a[i]); s = { A: blk(s.A, t.A), B: blk(s.B, t.B), C: blk(s.C, t.C), D: blk(s.D, t.D), Ts: combTs(s, t) }; } return ret(fromSS(s, clsOf(a[0]))); };

// Analysis helpers that work on any LTI class (tf/zpk/ss) via the SS core.
const sisoND = (sys: Value): { num: number[]; den: number[] } => ssSub(toSS(sys), 0, 0);
// (num,den) for any SISO model: exact for a tf, else via the state-space core (handles ss/zpk).
const numDenAny = (sys: Value): { num: number[]; den: number[] } => (isObject(sys) && sys.className === 'tf' ? getNumDen(sys) : sisoND(sys));
function polesOf(sys: Value): { re: number[]; im: number[] } {
  return eigOfMat(toSS(sys).A);   // shared Schur-based eigenvalues
}
function tfChannelsAny(sys: Value): { ny: number; nu: number; num: number[][][]; den: number[][][] } {
  if (isObject(sys) && sys.className === 'tf') return tfChannels(sys);
  const s = toSS(sys), { ny, nu } = ssDims(s), num: number[][][] = [], den: number[][][] = [];
  for (let i = 0; i < ny; i++) { num.push([]); den.push([]); for (let j = 0; j < nu; j++) { const c = ssSub(s, i, j); num[i].push(c.num); den[i].push(c.den); } }
  return { ny, nu, num, den };
}
const isVflag = (v: Value | undefined): boolean => { if (!v) return false; try { return asString(v).toLowerCase() === 'v'; } catch { return false; } };

// ── pole placement / Riccati-based design (place/acker/care/dare/lqe) ──
function ctrbMat(A: number[][], B: number[][]): number[][] {
  const n = A.length; const cols: number[][] = B.map((r) => r.slice()); let cur = B;
  for (let i = 1; i < n; i++) { cur = smul(A, cur); for (let r = 0; r < n; r++) cols[r].push(...cur[r]); }
  return cols;
}
// Eigenvalues of a raw matrix via the shared linalg core (real Schur / Francis double-shift QR) —
// replaces the local Faddeev-LeVerrier char-poly + Durand-Kerner, which lost accuracy on repeated/
// clustered eigenvalues (e.g. pole() showed -1 ± 6e-9i for a double pole).
function eigOfMat(A: number[][]): { re: number[]; im: number[] } {
  const N = A.length; if (N === 0) return { re: [], im: [] };
  return schurEig(schur(fromRows(A)).T);
}
const polesArg = (v: Value): { re: number[]; im: number[] } => { const M = m(v); return { re: Array.from(M.data), im: M.idata ? Array.from(M.idata) : Array.from(M.data, () => 0) }; };
// Ackermann single-input pole placement: K = e_n' · inv(ctrb(A,B)) · φ(A), φ = desired char poly.
function ackerK(A: number[][], B: number[][], poles: { re: number[]; im: number[] }): number[][] {
  const n = A.length; const Cm = ctrbMat(A, B); if (Cm[0].length !== n) throw new Error('acker: requires a single-input system');
  const Cinv = matInv(Cm); const phi = polyFromRoots(poles.re, poles.im);
  const pows = [eye(n)]; for (let i = 1; i <= n; i++) pows.push(smul(A, pows[i - 1]));
  let phiA = zeros2(n, n); for (let k = 0; k <= n; k++) phiA = matAddT(phiA, pows[n - k].map((row) => row.map((x) => x * phi[k])));
  const lastRow = Cinv[n - 1];
  return [phiA[0].map((_, j) => lastRow.reduce((s, _u, i) => s + lastRow[i] * phiA[i][j], 0))];
}
// Pole placement. Single input → Ackermann. Multi-input → reduce along an input direction v with
// (A,Bv) controllable, place with Ackermann, return K = v·k (a valid placement: eig(A−BK)=poles).
function placeK(A: number[][], B: number[][], poles: { re: number[]; im: number[] }): number[][] {
  const mIn = B[0]?.length ?? 0;
  if (mIn === 1) return ackerK(A, B, poles);
  for (let attempt = 0; attempt < 60; attempt++) {
    const v = new Array(mIn).fill(0); if (attempt === 0) v[0] = 1; else for (let i = 0; i < mIn; i++) v[i] = Math.random() * 2 - 1;
    const Bv = A.map((_, i) => [B[i].reduce((s, bij, j) => s + bij * v[j], 0)]);
    try { const k = ackerK(A, Bv, poles); return v.map((vi) => k[0].map((kj) => vi * kj)); } catch { /* singular ⇒ try another v */ }
  }
  throw new Error('place: (A,B) is not controllable');
}
const dotv = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + x * b[i], 0);
const vecTimesMat = (v: number[], A: number[][]): number[] => A[0].map((_, j) => v.reduce((s, vi, i) => s + vi * A[i][j], 0));
const colsOf = (M: number[][]): number[][] => { const cN = M[0]?.length ?? 0, out: number[][] = []; for (let j = 0; j < cN; j++) out.push(M.map((r) => r[j])); return out; };
// Orthonormal set (modified Gram-Schmidt) spanning the given vectors; vectors have length n.
function orthBasis(vecs: number[][], n: number): number[][] {
  const basis: number[][] = [];
  for (const c of vecs) { const v = c.slice(); for (const b of basis) { const d = dotv(v, b); for (let i = 0; i < n; i++) v[i] -= d * b[i]; } const nrm = Math.sqrt(dotv(v, v)); if (nrm > 1e-9) { for (let i = 0; i < n; i++) v[i] /= nrm; basis.push(v); } }
  return basis;
}
// Extend an orthonormal partial basis to a full orthonormal basis of R^n (appends complement).
function completeBasis(part: number[][], n: number): number[][] {
  const full = part.map((r) => r.slice());
  for (let i = 0; i < n && full.length < n; i++) { const v = new Array(n).fill(0); v[i] = 1; for (const b of full) { const d = dotv(v, b); for (let k = 0; k < n; k++) v[k] -= d * b[k]; } const nrm = Math.sqrt(dotv(v, v)); if (nrm > 1e-9) { for (let k = 0; k < n; k++) v[k] /= nrm; full.push(v); } }
  return full;
}
// A null-space vector of M (one solution of M x = 0), normalized. Assumes a nontrivial kernel.
function nullVec(M: number[][]): number[] {
  const n = M.length, A = M.map((r) => r.slice()), piv: number[] = []; let row = 0;
  for (let col = 0; col < n && row < n; col++) {
    let p = row; for (let r = row + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[p][col])) p = r;
    if (Math.abs(A[p][col]) < 1e-8) continue;
    [A[row], A[p]] = [A[p], A[row]]; const d = A[row][col]; for (let j = 0; j < n; j++) A[row][j] /= d;
    for (let r = 0; r < n; r++) if (r !== row) { const f = A[r][col]; for (let j = 0; j < n; j++) A[r][j] -= f * A[row][j]; }
    piv.push(col); row++;
  }
  const free = [...Array(n).keys()].find((c) => !piv.includes(c)) ?? n - 1;
  const v = new Array(n).fill(0); v[free] = 1; for (let i = 0; i < piv.length; i++) v[piv[i]] = -A[i][free];
  const nrm = Math.sqrt(dotv(v, v)) || 1; return v.map((x) => x / nrm);
}
// Kalman controllability/observability decomposition: orthogonal T with the (un)controllable or
// (un)observable part separated into the upper-left block. Returns [Abar,Bbar,Cbar,T,r].
function staircase(A: number[][], B: number[][], C: number[][], obs: boolean): { Abar: number[][]; Bbar: number[][]; Cbar: number[][]; T: number[][]; r: number } {
  const N = A.length;
  const span = obs ? obsvRows(A, C) : colsOf(ctrbMat(A, B));   // observable row-space vs controllable col-space
  const good = orthBasis(span, N), r = good.length;
  const comp = completeBasis(good, N).slice(r);                // (un)controllable / (un)observable complement first
  const T = [...comp, ...good]; const Tp = matT(T);
  return { Abar: smul(smul(T, A), Tp), Bbar: smul(T, B), Cbar: smul(C, Tp), T, r };
}
function obsvRows(A: number[][], C: number[][]): number[][] {
  const N = A.length, rows: number[][] = C.map((r) => r.slice()); let cur = C;
  for (let i = 1; i < N; i++) { cur = smul(cur, A); for (const rr of cur) rows.push(rr.slice()); }
  return rows;
}

export const CONTROL: ToolboxModule = {
  id: 'control',
  name: 'Control System Toolbox',
  docBase: 'https://www.mathworks.com/help/control/ref/',
  builtins: {
    /** tf(num,den) or tf(sys) — transfer-function model or conversion from any LTI/PID object. */
    tf: (a) => {
      // tf(sys) conversion for pid/pid2/pidstd → tf (direct polynomial form, handles improper systems)
      if (a.length === 1 && isObject(a[0])) {
        const cls = a[0].className;
        // Helper: build normalized pid tf coefficients (den leading coeff = 1 when Tf>0)
        const pidTfCoeffs = (Kp: number, Ki: number, Kd: number, Tf: number): { num: number[]; den: number[] } => {
          if (Tf > 0) {
            // C(s) = [(Kp*Tf+Kd)s^2 + (Kp+Ki*Tf)s + Ki] / [Tf*s^2 + s]
            // Normalize by Tf so den leading coeff = 1: num → /Tf, den → /Tf
            return {
              num: [(Kp + Kd / Tf), (Kp / Tf + Ki), Ki / Tf],
              den: [1, 1 / Tf, 0],
            };
          } else {
            // improper: C(s) = [Kd*s^2 + Kp*s + Ki] / s, stored as [Kd,Kp,Ki]/[0,1,0]
            return { num: [Kd, Kp, Ki], den: [0, 1, 0] };
          }
        };
        if (cls === 'pid') {
          const Kp = asScalar(a[0].props.get('Kp') as Value ?? scalar(0));
          const Ki = asScalar(a[0].props.get('Ki') as Value ?? scalar(0));
          const Kd = asScalar(a[0].props.get('Kd') as Value ?? scalar(0));
          const Tf = asScalar(a[0].props.get('Tf') as Value ?? scalar(0));
          const { num, den } = pidTfCoeffs(Kp, Ki, Kd, Tf);
          return ret(makeObject('tf', { num: rowVec(num), den: rowVec(den) }));
        }
        if (cls === 'pid2') {
          // 2-DOF: returns 1×2 tf: [C_r(s), C_y(s)]
          const Kp = asScalar(a[0].props.get('Kp') as Value ?? scalar(0));
          const Ki = asScalar(a[0].props.get('Ki') as Value ?? scalar(0));
          const Kd = asScalar(a[0].props.get('Kd') as Value ?? scalar(0));
          const Tf = asScalar(a[0].props.get('Tf') as Value ?? scalar(0));
          const b  = asScalar(a[0].props.get('b')  as Value ?? scalar(1));
          const c  = asScalar(a[0].props.get('c')  as Value ?? scalar(1));
          // C_r(s): Kp*b + Ki/s + Kd*c*s/(Tf*s+1)  (using b,c weights on r)
          // C_y(s): Kp + Ki/s + Kd*s/(Tf*s+1)      (standard, negative for feedback)
          const { num: numR, den } = pidTfCoeffs(Kp * b, Ki, Kd * c, Tf);
          const { num: numY } = pidTfCoeffs(Kp, Ki, Kd, Tf);
          const numYneg = numY.map((x) => -x);
          const nit: Value[] = [rowVec(numR), rowVec(numYneg)];
          const dit: Value[] = [rowVec(den), rowVec(den)];
          return ret(makeObject('tf', { num: makeCell(1, 2, nit), den: makeCell(1, 2, dit) }));
        }
        if (cls === 'pidstd') {
          const Kp = asScalar(a[0].props.get('Kp') as Value ?? scalar(1));
          const Ti = asScalar(a[0].props.get('Ti') as Value ?? scalar(Infinity));
          const Td = asScalar(a[0].props.get('Td') as Value ?? scalar(0));
          const N  = asScalar(a[0].props.get('N')  as Value ?? scalar(Infinity));
          const Ki = isFinite(Ti) ? Kp / Ti : 0;
          const Kd = Kp * Td;
          const Tf = isFinite(N) && N > 0 ? Td / N : 0;
          const { num, den } = pidTfCoeffs(Kp, Ki, Kd, Tf);
          return ret(makeObject('tf', { num: rowVec(num), den: rowVec(den) }));
        }
        if (cls === 'ss' || cls === 'zpk') {
          return ret(fromSS(toSS(a[0]), 'tf'));
        }
      }
      return ret(makeObject('tf', a.length >= 3 && isMatLike(a[2]) ? { num: rowVec(toArray(m(a[0]))), den: rowVec(toArray(m(a[1]))), Ts: scalar(asScalar(a[2])) } : { num: rowVec(toArray(m(a[0]))), den: rowVec(toArray(m(a[1]))) }));
    },
    /** ss(A,B,C,D) or ss(sys) — state-space model or conversion from any LTI/PID object. */
    ss: (a) => {
      // ss(sys) conversion: tf/zpk/pid/pid2/pidstd → ss
      if (a.length === 1 && isObject(a[0]) && (a[0].className === 'tf' || a[0].className === 'zpk' || a[0].className === 'pid' || a[0].className === 'pid2' || a[0].className === 'pidstd')) {
        return ret(fromSS(toSS(a[0]), 'ss'));
      }
      const props: Record<string, Value> = { A: m(a[0]), B: m(a[1]), C: m(a[2]), D: a.length >= 4 ? m(a[3]) : scalar(0) };
      if (a.length >= 5) props.Ts = scalar(asScalar(a[4]));   // ss(A,B,C,D,Ts) → discrete model
      return ret(makeObject('ss', props));
    },
    /** zpk(z,p,k[,Ts]) — zero-pole-gain model. */
    zpk: (a) => {
      // complex-preserving column vector (toArray drops idata, losing complex zeros/poles)
      const cvec = (v: Value): Value => { const M = m(v); const c = colVec(Array.from(M.data)); if (M.idata && Array.from(M.idata).some((x) => x !== 0)) c.idata = Float64Array.from(M.idata); return c; };
      const props: Record<string, Value> = { z: cvec(a[0]), p: cvec(a[1]), k: scalar(asScalar(a[2])) };
      if (a.length >= 4) props.Ts = scalar(asScalar(a[3]));   // zpk(z,p,k,Ts) → discrete model
      return ret(makeObject('zpk', props));
    },
    /** pole(sys) — system poles (eigenvalues of the A matrix of any tf/zpk/ss realization). */
    pole: (a) => ret(rootsValue(sortRoots(polesOf(a[0])))),
    /** zero(sys) — system (transmission) zeros (SISO: roots of the numerator). */
    zero: (a) => ret(rootsValue(sortRoots(polyRoots(sisoND(a[0]).num)))),
    /** dcgain(sys) — steady-state gain. Continuous: D−C·A⁻¹·B; discrete: D+C·(I−A)⁻¹·B (MIMO). */
    dcgain: (a) => {
      const s = toSS(a[0]); const { ny, nu } = ssDims(s); const n = s.A.length;
      let G: number[][];
      if (n === 0) G = s.D;
      else if (s.Ts) { const I = eye(n); G = matAddT(s.D, smul(smul(s.C, matInv(matSub(I, s.A))), s.B)); }
      else G = matSub(s.D, smul(smul(s.C, matInv(s.A)), s.B));
      return ret(ny === 1 && nu === 1 ? scalar(G[0]?.[0] ?? 0) : fromRows(G));
    },
    /** isstable(sys) — poles in the open LHP (continuous) or inside the unit disk (discrete). */
    isstable: (a) => {
      const sys = a[0]; const r = polesOf(sys); const Ts = getTsV(sys);
      const stable = Ts !== 0 ? r.re.every((re, i) => Math.hypot(re, r.im[i]) < 1) : r.re.every((x) => x < 0);
      return ret(bool(stable));
    },
    /** [num,den]=tfdata(sys[,'v']) — transfer-function data (cells, or row vectors with 'v'). */
    tfdata: (a) => {
      const { ny, nu, num, den } = tfChannelsAny(a[0]);
      if (isVflag(a[1]) && ny === 1 && nu === 1) return Promise.resolve([rowVec(num[0][0]), rowVec(den[0][0])]);
      const nit: Value[] = new Array(ny * nu), dit: Value[] = new Array(ny * nu);
      for (let i = 0; i < ny; i++) for (let j = 0; j < nu; j++) { nit[i + j * ny] = rowVec(num[i][j]); dit[i + j * ny] = rowVec(den[i][j]); }
      return Promise.resolve([makeCell(ny, nu, nit), makeCell(ny, nu, dit)]);
    },
    /** [A,B,C,D]=ssdata(sys) — state-space data matrices. */
    ssdata: (a) => { const s = toSS(a[0]); return Promise.resolve([fromRows(s.A), fromRows(s.B), fromRows(s.C), fromRows(s.D)]); },
    /** [z,p,k]=zpkdata(sys[,'v']) — zero-pole-gain data. */
    zpkdata: (a) => {
      const { ny, nu, num, den } = tfChannelsAny(a[0]);
      if (isVflag(a[1]) && ny === 1 && nu === 1) return Promise.resolve([rootsValue(sortRoots(polyRoots(num[0][0]))), rootsValue(sortRoots(polyRoots(den[0][0]))), scalar(kFromPoly(num[0][0], den[0][0]))]);
      const zit: Value[] = new Array(ny * nu), pit: Value[] = new Array(ny * nu), kk = zeros2(ny, nu);
      for (let i = 0; i < ny; i++) for (let j = 0; j < nu; j++) { zit[i + j * ny] = rootsValue(sortRoots(polyRoots(num[i][j]))); pit[i + j * ny] = rootsValue(sortRoots(polyRoots(den[i][j]))); kk[i][j] = kFromPoly(num[i][j], den[i][j]); }
      return Promise.resolve([makeCell(ny, nu, zit), makeCell(ny, nu, pit), fromRows(kk)]);
    },
    /** [A,B,C,D,E]=dssdata(sys) — descriptor state-space data. */
    dssdata: (a) => {
      const sys = a[0];
      if (isObject(sys) && sys.className === 'dss') return Promise.resolve([m(sys.props.get('A') as Mat), m(sys.props.get('B') as Mat), m(sys.props.get('C') as Mat), m(sys.props.get('D') as Mat), m(sys.props.get('E') as Mat)]);
      const s = toSS(sys); return Promise.resolve([fromRows(s.A), fromRows(s.B), fromRows(s.C), fromRows(s.D), fromRows(eye(s.A.length))]);
    },
    /** [z,p,k] = tf2zp(num,den) — transfer function to zero-pole-gain. */
    tf2zp: (a, n) => {
      const num = toArray(m(a[0])), den = toArray(m(a[1])); const z = sortRoots(polyRoots(num)), p = sortRoots(polyRoots(den));
      let i0 = 0; while (i0 < num.length && num[i0] === 0) i0++; let j0 = 0; while (j0 < den.length && den[j0] === 0) j0++;
      const k = (num[i0] ?? 0) / (den[j0] ?? 1);
      return n >= 3 ? Promise.resolve([rootsValue(z), rootsValue(p), scalar(k)]) : n >= 2 ? Promise.resolve([rootsValue(z), rootsValue(p)]) : ret(rootsValue(z));
    },
    /** [num,den] = zp2tf(z,p,k) — zero-pole-gain to transfer function. */
    zp2tf: (a, n) => {
      const zM = m(a[0]), pM = m(a[1]), k = asScalar(a[2]);
      const zr = Array.from(zM.data), zi = zM.idata ? Array.from(zM.idata) : zr.map(() => 0);   // preserve complex roots
      const pr = Array.from(pM.data), pi = pM.idata ? Array.from(pM.idata) : pr.map(() => 0);
      const num = polyFromRoots(zr, zi).map((v) => v * k); const den = polyFromRoots(pr, pi);
      while (num.length < den.length) num.unshift(0);   // pad numerator to denominator length
      return n >= 2 ? Promise.resolve([rowVec(num), rowVec(den)]) : ret(rowVec(num));
    },
    /** [A,B,C,D] = tf2ss(num,den) — controllable canonical state-space realization. */
    tf2ss: (a, n) => {
      let num = toArray(m(a[0])); let den = toArray(m(a[1]));
      while (den.length > 1 && den[0] === 0) den.shift();
      while (num.length > 1 && num[0] === 0) num.shift();
      if (num.length > den.length) throw new Error('tf2ss: improper transfer function');
      const g = den[0] || 1; den = den.map((v) => v / g); num = num.map((v) => v / g);
      while (num.length < den.length) num.unshift(0); const no = den.length - 1;
      const A: number[][] = []; for (let i = 0; i < no; i++) { A[i] = []; for (let j = 0; j < no; j++) A[i][j] = i === 0 ? -den[j + 1] : (i - 1 === j ? 1 : 0); }
      const B = Array.from({ length: no }, (_, i) => [i === 0 ? 1 : 0]); const D = num[0];
      const C = [Array.from({ length: no }, (_, j) => num[j + 1] - D * den[j + 1])];
      if (n < 2) return ret(fromRows(A)); // 0-state (static gain) → 0x0 A, matching MATLAB
      return Promise.resolve([fromRows(A), fromRows(B), fromRows(C), scalar(D)]);
    },
    /** [num,den] = ss2tf(A,B,C,D) — state-space to transfer function (Faddeev-LeVerrier). */
    // ss2tf is identical to the base builtin — removed to avoid duplicate code (base wins). See DUPLICATE_POLICY.
    /** [wn,zeta] = damp(sys) — natural frequencies and damping ratios of the poles. */
    damp: (a, n) => {
      const r = polesOf(a[0]); const wn = r.re.map((re, i) => Math.hypot(re, r.im[i])); const zeta = r.re.map((re, i) => (wn[i] > 0 ? -re / wn[i] : 0));
      const order = wn.map((_, i) => i).sort((x, y) => wn[x] - wn[y]);
      if (n >= 3) {   // third output: the poles themselves (complex), in the same (ascending-wn) order
        const pim = order.map((i) => r.im[i]); const pVal = colVec(order.map((i) => r.re[i])); if (pim.some((x) => x !== 0)) pVal.idata = Float64Array.from(pim);
        return Promise.resolve([colVec(order.map((i) => wn[i])), colVec(order.map((i) => zeta[i])), pVal]);
      }
      return n >= 2 ? Promise.resolve([colVec(order.map((i) => wn[i])), colVec(order.map((i) => zeta[i]))]) : ret(colVec(order.map((i) => wn[i])));
    },
    /** ctrb(A,B) — controllability matrix [B AB A²B …]. */
    ctrb: (a) => { const A = matRows(m(a[0])), B = matRows(m(a[1])); const N = A.length; const cols: number[][] = B.map((r) => r.slice()); let cur = B; for (let i = 1; i < N; i++) { cur = mmul(A, cur); for (let r = 0; r < N; r++) cols[r].push(...cur[r]); } return ret(fromRows(cols)); },
    /** obsv(A,C) — observability matrix [C; CA; CA²; …]. */
    obsv: (a) => { const A = matRows(m(a[0])), C = matRows(m(a[1])); const N = A.length; const rows: number[][] = C.map((r) => r.slice()); let cur = C; for (let i = 1; i < N; i++) { cur = mmul(cur, A); rows.push(...cur.map((r) => r.slice())); } return ret(fromRows(rows)); },
    /** dsort(p) — sort discrete-time poles by descending magnitude. */
    dsort: (a) => ret(colVec(toArray(m(a[0])).slice().sort((x, y) => Math.abs(y) - Math.abs(x)))),
    /** esort(p) — sort continuous-time poles by descending real part. */
    esort: (a) => ret(colVec(toArray(m(a[0])).slice().sort((x, y) => y - x))),
    // `series` is registered as a CLASS METHOD (below) rather than a global builtin, because the
    // name collides with Symbolic's `series`. OOP dispatch routes series(tf,…) here, series(sym,…)
    // to Symbolic — matching MATLAB.
    /** parallel(sys1,sys2) — parallel connection sys1+sys2 (MIMO via state-space). */
    parallel: ltiParallel,
    /** feedback(sys1,sys2[,sign]) — feedback loop r→y, e=r+sign·(sys2·y); sign default −1 (MIMO via ss). */
    feedback: ltiFeedback,
    /** append(sys1,sys2,…) — block-diagonal append (stack inputs and outputs). */
    append: ltiAppend,
    /** order(sys) — number of states (denominator degree). */
    order: (a) => ret(scalar(toSS(a[0]).A.length)),
    /** isct(sys) — true if sys is continuous-time (Ts==0). */
    isct: (a) => ret(bool(getTsV(a[0]) === 0)),
    /** isdt(sys) — true if sys is discrete-time (Ts~=0). */
    isdt: (a) => ret(bool(getTsV(a[0]) !== 0)),
    /** sminreal(sys) — structural minimal realization: keep only states that are structurally
     *  reachable from an input AND structurally connected to an output. */
    sminreal: (a) => {
      const s = toSS(a[0]); const n = s.A.length; if (n === 0) return ret(a[0]);
      const reach = new Array(n).fill(false); let st: number[] = [];
      for (let i = 0; i < n; i++) if (s.B[i].some((x) => Math.abs(x) > 1e-12)) { reach[i] = true; st.push(i); }
      while (st.length) { const i = st.pop() as number; for (let j = 0; j < n; j++) if (!reach[j] && Math.abs(s.A[j][i]) > 1e-12) { reach[j] = true; st.push(j); } }
      const obs = new Array(n).fill(false); st = [];
      for (let j = 0; j < n; j++) if (s.C.some((row) => Math.abs(row[j]) > 1e-12)) { obs[j] = true; st.push(j); }
      while (st.length) { const j = st.pop() as number; for (let i = 0; i < n; i++) if (!obs[i] && Math.abs(s.A[j][i]) > 1e-12) { obs[i] = true; st.push(i); } }
      const keep: number[] = []; for (let i = 0; i < n; i++) if (reach[i] && obs[i]) keep.push(i);
      const A2 = keep.map((i) => keep.map((j) => s.A[i][j])), B2 = keep.map((i) => s.B[i].slice()), C2 = s.C.map((row) => keep.map((j) => row[j]));
      return ret(fromSS({ A: A2, B: B2, C: C2, D: s.D, Ts: s.Ts }, clsOf(a[0])));
    },
    /** [mag,phase,w] = nichols(sys[,w]) — Nichols frequency response data (magnitude, phase deg). */
    nichols: (a, n) => {
      const { mag, phase, w } = bodeData(a[0], a[1]); const magV = colVec(mag);
      return n >= 3 ? Promise.resolve([magV, colVec(phase), colVec(w)]) : n >= 2 ? Promise.resolve([magV, colVec(phase)]) : ret(magV);
    },
    /** [K,S,e] = lqr(A,B,Q,R[,N]) — continuous LQR. Solves CARE A'S+SA−SBR⁻¹B'S+Q=0,
     *  K=R⁻¹(B'S+N'), e=eig(A−BK). */
    lqr: (a, n) => {
      const { A, B, Q, Ri, N } = lqrArgs(a);
      const { A: Ar, Q: Qr, corr } = reduceCross(A, B, Q, Ri, N);   // fold cross term N
      const S = care(Ar, B, Qr, Ri);
      let K = mmul(Ri, mmul(matT(B), S));                            // R⁻¹ B'S
      if (corr) K = matAdd2(K, corr);                                // + R⁻¹ N'
      const Acl = matSub(A, mmul(B, K));
      return lqrResult(K, S, Acl, n);
    },
    /** [K,S,e] = dlqr(A,B,Q,R[,N]) — discrete LQR. Solves DARE, K=(R+B'SB)⁻¹(B'SA+N'),
     *  e=eig(A−BK). */
    dlqr: (a, n) => {
      const { A, B, Q, Ri, Rm, N } = lqrArgs(a);
      const { A: Ar, Q: Qr } = reduceCross(A, B, Q, Ri, N);          // fold cross term N
      const S = dare(Ar, B, Qr, Rm);
      const Bt = matT(B);
      const RBSB = matInv(matAdd2(Rm, mmul(mmul(Bt, S), B)));        // (R+B'SB)⁻¹
      let BSA = mmul(mmul(Bt, S), A);                                // B'SA  (original A)
      if (N) BSA = matAdd2(BSA, matT(N));                            // + N'
      const K = mmul(RBSB, BSA);
      const Acl = matSub(A, mmul(B, K));
      return lqrResult(K, S, Acl, n);
    },
    /** K = place(A,B,p) — state-feedback gain so that eig(A−B·K) = p (pole placement). */
    place: (a) => ret(fromRows(placeK(matRows(m(a[0])), matRows(m(a[1])), polesArg(a[2])))),
    /** k = acker(A,b,p) — single-input pole placement via Ackermann's formula. */
    acker: (a) => ret(rowVec(ackerK(matRows(m(a[0])), matRows(m(a[1])), polesArg(a[2]))[0])),
    /** [X,L,G] = care(A,B,Q[,R]) — continuous algebraic Riccati: A'X+XA−XBR⁻¹B'X+Q=0,
     *  G=R⁻¹B'X, L=eig(A−BG). */
    care: (a, n) => {
      const A = matRows(m(a[0])), B = matRows(m(a[1])), Q = matRows(m(a[2])); const R = a.length >= 4 ? matRows(m(a[3])) : eye(B[0]?.length ?? 1); const Ri = matInv(R);   // MIMO: default R = I_m, not 1×1
      const X = care(A, B, Q, Ri); const G = smul(Ri, smul(matT(B), X)); const E = sortRoots(eigOfMat(matSub(A, smul(B, G))));
      return n >= 3 ? Promise.resolve([fromRows(X), rootsValue(E), fromRows(G)]) : n >= 2 ? Promise.resolve([fromRows(X), rootsValue(E)]) : ret(fromRows(X));
    },
    /** [X,L,G] = dare(A,B,Q[,R]) — discrete algebraic Riccati: X=A'XA−(A'XB)(R+B'XB)⁻¹(B'XA)+Q,
     *  G=(R+B'XB)⁻¹B'XA, L=eig(A−BG). */
    dare: (a, n) => {
      const A = matRows(m(a[0])), B = matRows(m(a[1])), Q = matRows(m(a[2])); const R = a.length >= 4 ? matRows(m(a[3])) : eye(B[0]?.length ?? 1);   // MIMO: default R = I_m
      const { X, K } = dareN(A, B, Q, R, zeros2(A.length, B[0]?.length ?? 0)); const E = sortRoots(eigOfMat(matSub(A, smul(B, K))));
      return n >= 3 ? Promise.resolve([fromRows(X), rootsValue(E), fromRows(K)]) : n >= 2 ? Promise.resolve([fromRows(X), rootsValue(E)]) : ret(fromRows(X));
    },
    /** [L,P,E] = lqe(A,G,C,Q[,R]) — Kalman estimator gain. Solves the filter Riccati on the dual
     *  pair (A',C'); L=P·C'·R⁻¹, E=eig(A−L·C). */
    lqe: (a, n) => {
      const A = matRows(m(a[0])), Gm = matRows(m(a[1])), C = matRows(m(a[2])), Q = matRows(m(a[3])); const R = a.length >= 5 ? matRows(m(a[4])) : eye(C.length);
      const Ri = matInv(R); const P = care(matT(A), matT(C), smul(smul(Gm, Q), matT(Gm)), Ri); const L = smul(smul(P, matT(C)), Ri); const E = sortRoots(eigOfMat(matSub(A, smul(L, C))));
      return n >= 3 ? Promise.resolve([fromRows(L), fromRows(P), rootsValue(E)]) : n >= 2 ? Promise.resolve([fromRows(L), fromRows(P)]) : ret(fromRows(L));
    },
    /** [csys,T] = canon(sys,type) — modal (diagonal) or companion (controllable canonical) form. */
    canon: (a, n) => {
      const s = toSS(a[0]); const N = s.A.length; const type = a.length >= 2 ? asString(a[1]).toLowerCase() : 'modal';
      if (type.startsWith('comp')) {
        if ((s.B[0]?.length ?? 0) !== 1) throw new Error('canon: companion form requires a single-input system');
        let Mi: number[][]; try { Mi = matInv(ctrbMat(s.A, s.B)); } catch { throw new Error('canon: system is not controllable'); }
        const q = Mi[N - 1]; const T: number[][] = []; let qa = q.slice(); for (let i = 0; i < N; i++) { T.push(qa.slice()); qa = vecTimesMat(qa, s.A); }
        const Ti = matInv(T); const sys = mkSS({ A: smul(smul(T, s.A), Ti), B: smul(T, s.B), C: smul(s.C, Ti), D: s.D, Ts: s.Ts });
        return n >= 2 ? Promise.resolve([sys, fromRows(T)]) : ret(sys);
      }
      const ev = eigOfMat(s.A); if (ev.im.some((x) => Math.abs(x) > 1e-9)) throw new Error("canon: 'modal' form requires real eigenvalues here; use 'companion'");
      // Repeated eigenvalues ⇒ nullVec would return the same eigenvector twice → singular modal
      // matrix. Detect and direct the user to 'companion' rather than crashing in matInv.
      for (let i = 0; i < ev.re.length; i++) for (let j = i + 1; j < ev.re.length; j++) if (Math.abs(ev.re[i] - ev.re[j]) < 1e-9 * (1 + Math.abs(ev.re[i]))) throw new Error("canon: 'modal' form requires distinct eigenvalues; use 'companion' for repeated poles");
      const V = ev.re.map((lam) => nullVec(s.A.map((row, i) => row.map((x, j) => x - (i === j ? lam : 0)))));
      const Vm = Array.from({ length: N }, (_, i) => V.map((vec) => vec[i])); const Vi = matInv(Vm);
      const sys = mkSS({ A: smul(smul(Vi, s.A), Vm), B: smul(Vi, s.B), C: smul(s.C, Vm), D: s.D, Ts: s.Ts });
      return n >= 2 ? Promise.resolve([sys, fromRows(Vi)]) : ret(sys);
    },
    /** [Abar,Bbar,Cbar,T,k] = ctrbf(A,B,C) — controllability staircase (Kalman) decomposition. */
    ctrbf: (a, n) => {
      const A = matRows(m(a[0])), B = matRows(m(a[1])), C = a.length >= 3 ? matRows(m(a[2])) : [new Array(A.length).fill(0)];
      const { Abar, Bbar, Cbar, T, r } = staircase(A, B, C, false);
      const out = [fromRows(Abar), fromRows(Bbar), fromRows(Cbar), fromRows(T), rowVec([r])];
      return n >= 5 ? Promise.resolve(out) : n >= 1 ? Promise.resolve(out.slice(0, Math.max(1, n))) : ret(out[0]);
    },
    /** [Abar,Bbar,Cbar,T,k] = obsvf(A,B,C) — observability staircase (Kalman) decomposition. */
    obsvf: (a, n) => {
      const A = matRows(m(a[0])), B = matRows(m(a[1])), C = matRows(m(a[2]));
      const { Abar, Bbar, Cbar, T, r } = staircase(A, B, C, true);
      const out = [fromRows(Abar), fromRows(Bbar), fromRows(Cbar), fromRows(T), rowVec([r])];
      return n >= 5 ? Promise.resolve(out) : n >= 1 ? Promise.resolve(out.slice(0, Math.max(1, n))) : ret(out[0]);
    },
    /** [kest,L,P] = kalman(sys,Qn,Rn) — steady-state Kalman filter (process noise on all states). */
    kalman: (a, n) => {
      const s = toSS(a[0]); const A = s.A, C = s.C, nx = A.length, nu = s.B[0]?.length ?? 0, ny = C.length;
      const Qn = matRows(m(a[1])), Rn = matRows(m(a[2])); const Ri = matInv(Rn);
      // SYS = ss(A,[B G],C,[D H]): the last size(Q) inputs are process noise, so the
      // noise-input matrix G is those columns of B. The estimator Riccati uses the
      // state-space process-noise covariance G*Q*G' (n×n), not the raw Q (nw×nw).
      const nw = Qn.length; const G = s.B.map((row) => row.slice(Math.max(0, nu - nw)));
      const Qbar = smul(smul(G, Qn), matT(G));
      const P = care(matT(A), matT(C), Qbar, Ri); const L = smul(smul(P, matT(C)), Ri);
      const Ae = matSub(A, smul(L, C)); const Be = A.map((_, i) => [...s.B[i], ...L[i]]);
      const Ce = [...C.map((r) => r.slice()), ...eye(nx)];
      const De = [...s.D.map((r, i) => [...r, ...new Array(ny).fill(0)]), ...Array.from({ length: nx }, () => new Array(nu + ny).fill(0))];
      const kest = mkSS({ A: Ae, B: Be, C: Ce, D: De, Ts: s.Ts });
      return n >= 3 ? Promise.resolve([kest, fromRows(L), fromRows(P)]) : n >= 2 ? Promise.resolve([kest, fromRows(L)]) : ret(kest);
    },
    /** [mag,phase,wout] = bode(sys[,w]) — Bode frequency response data. mag in absolute units,
     *  phase in degrees (unwrapped). With no output args, returns mag only (no plotting here). */
    bode: (a, n) => {
      const { mag, phase, w } = bodeData(a[0], a[1]);
      const magV = colVec(mag);
      if (n >= 3) return Promise.resolve([magV, colVec(phase), colVec(w)]);
      if (n >= 2) return Promise.resolve([magV, colVec(phase)]);
      return ret(magV);
    },
    /** [mag,wout] = bodemag(sys[,w]) — Bode magnitude response (absolute units). */
    bodemag: (a, n) => {
      const { mag, w } = bodeData(a[0], a[1]);
      const magV = colVec(mag);
      return n >= 2 ? Promise.resolve([magV, colVec(w)]) : ret(magV);
    },
    /** ss2ss(sys,T) — state-coordinate transform z=Tx: A→TAT⁻¹, B→TB, C→CT⁻¹, D→D. */
    ss2ss: (a) => {
      const sys = a[0];
      if (!isObject(sys) || sys.className !== 'ss') throw new Error('ss2ss: first argument must be a state-space (ss) model');
      const A = matRows(m(sys.props.get('A') as Mat)), B = matRows(m(sys.props.get('B') as Mat)), C = matRows(m(sys.props.get('C') as Mat));
      const D = sys.props.get('D') as Value; const T = matRows(m(a[1]));
      if (T.length === 0 || T.length !== T[0].length) throw new Error('ss2ss: T must be a square matrix');
      const Ti = matInv(T);
      const An = mmul(mmul(T, A), Ti); const Bn = mmul(T, B); const Cn = mmul(C, Ti);
      const props: Record<string, Value> = { A: fromRows(An), B: fromRows(Bn), C: fromRows(Cn), D };
      if (sys.props.has('Ts')) props.Ts = sys.props.get('Ts') as Value;   // preserve sample time (discrete models)
      return ret(makeObject('ss', props));
    },
    /** c2d(sys,Ts[,method]) — continuous→discrete. method: 'zoh' (default) | 'tustin'/'bilinear'. */
    c2d: (a) => {
      const { num, den } = numDenAny(a[0]); const Ts = asScalar(a[1]);
      const meth = (a.length >= 3 ? asString(a[2]) : 'zoh').toLowerCase();
      let r: { num: number[]; den: number[] };
      if (meth === 'tustin' || meth === 'bilinear') r = c2dTustin(num, den, Ts);
      else r = c2dZoh(num, den, Ts);
      return ret(makeObject('tf', { num: rowVec(r.num), den: rowVec(r.den), Ts: scalar(Ts) }));
    },
    /** [Gm,Pm,Wcg,Wcp] = margin(sys) — gain margin (abs), phase margin (deg), crossover freqs. */
    margin: (a, n) => {
      const { num, den } = getNumDenAny(a[0]);
      const { Gm, Pm, Wcg, Wcp } = marginData(num, den);
      if (n >= 4) return Promise.resolve([scalar(Gm), scalar(Pm), scalar(Wcg), scalar(Wcp)]);
      if (n >= 3) return Promise.resolve([scalar(Gm), scalar(Pm), scalar(Wcg)]);
      if (n >= 2) return Promise.resolve([scalar(Gm), scalar(Pm)]);
      return ret(scalar(Gm));
    },
    /** y=step(sys) or [y,t]=step(sys) — unit step response of an LTI model (SISO). */
    step: (a, n) => {
      const { num, den } = getNumDenAny(a[0]);
      const r = stepResponse(num, den);
      if (n >= 2) return Promise.resolve([colVec(r.y), colVec(r.t)]);
      return ret(colVec(r.y));
    },
    /** y=impulse(sys) or [y,t]=impulse(sys) — impulse response of an LTI model (SISO). */
    impulse: (a, n) => {
      const { num, den } = getNumDenAny(a[0]);
      const r = impulseResponse(num, den);
      if (n >= 2) return Promise.resolve([colVec(r.y), colVec(r.t)]);
      return ret(colVec(r.y));
    },
    /** y=lsim(sys,u,t) — response of an LTI model to input u sampled at times t (ZOH). */
    lsim: (a, n) => {
      const { num, den } = getNumDenAny(a[0]);
      const u = toArray(m(a[1])); const t = toArray(m(a[2]));
      const r = lsimResponse(num, den, u, t);
      if (n >= 2) return Promise.resolve([colVec(r.y), colVec(r.t)]);
      return ret(colVec(r.y));
    },
    /** stepinfo(sys) or stepinfo(y,t[,yfinal[,yinit]]) — step-response characteristics struct. */
    stepinfo: (a) => {
      let t: number[], y: number[], yfinal: number, yinit = 0;
      if (isObject(a[0])) {
        const { num, den } = getNumDenAny(a[0]);
        const resp = stepResponse(num, den); t = resp.t; y = resp.y; yfinal = resp.yfinal;
        if (a.length >= 2 && isMatLike(a[1])) yfinal = asScalar(a[1]);
      } else {
        y = toArray(m(a[0])); t = a.length >= 2 ? toArray(m(a[1])) : y.map((_, i) => i + 1);
        yfinal = a.length >= 3 ? asScalar(a[2]) : y[y.length - 1];
        yinit = a.length >= 4 ? asScalar(a[3]) : 0;
      }
      const info = stepInfoFromResp(t, y, yfinal, yinit);
      const fields = new Map<string, Value[]>();
      for (const key of ['RiseTime', 'SettlingTime', 'SettlingMin', 'SettlingMax', 'Overshoot', 'Undershoot', 'Peak', 'PeakTime'])
        fields.set(key, [scalar(info.get(key) ?? NaN)]);
      return ret({ kind: 'struct', rows: 1, cols: 1, fields } as StructV);
    },
    // lyap/dlyap are identical to the base builtins — removed to avoid duplicate code (base wins). See DUPLICATE_POLICY.
    /** R = lyapchol(A,B) returns the Cholesky factor R (R'*R = X) of lyap(A,B*B'). */
    lyapchol: (a) => {
      const A = matRows(m(a[0])), B = matRows(m(a[1]));
      const X = lyapSolve(A, mmul(B, matT(B)));
      return ret(fromRows(cholUpper(X)));
    },
    /** [X,K,L] = idare(A,B,Q,R) solves the discrete-time algebraic Riccati equation. */
    idare: (a, n) => {
      const A = matRows(m(a[0])), B = matRows(m(a[1])), Q = matRows(m(a[2]));
      const Rm = matRows(m(a[3]));
      const X = dare(A, B, Q, Rm);
      const Bt = matT(B);
      const Kgain = () => mmul(matInv(matAdd2(Rm, mmul(mmul(Bt, X), B))), mmul(mmul(Bt, X), A)); // (R+B'XB)^-1 B'XA
      const out: Value[] = [fromRows(X)];
      if (n >= 2) out.push(fromRows(Kgain()));
      if (n >= 3) out.push(eigClosed(matSub(A, mmul(B, Kgain()))));
      return Promise.resolve(out);
    },
    /** [K,S,e] = lqrd(A,B,Q,R,Ts) / lqrd(A,B,Q,R,N,Ts) designs a discrete LQR equivalent to the
     *  continuous cost J=∫(x'Qx+u'Ru+2x'Nu)dt for the plant (A,B) sampled at Ts. */
    lqrd: (a, nout) => {
      const A = matRows(m(a[0])), B = matRows(m(a[1])), Q = matRows(m(a[2])); const Rm = matRows(m(a[3]));
      const ns = A.length, ni = B[0].length;
      const hasN = a.length >= 6;                          // lqrd(A,B,Q,R,N,Ts)
      const Nc = hasN ? matRows(m(a[4])) : Array.from({ length: ns }, () => new Array(ni).fill(0));
      const Ts = asScalar(a[hasN ? 5 : 4]);
      // Van Loan augmented matrix (Franklin/Powell/Workman): exact cost discretisation.
      const nn = ns + ni; const dim = 2 * nn; const At = matT(A), Bt = matT(B), Nt = matT(Nc);
      const M: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
      const set = (r0: number, c0: number, blk: number[][]) => { for (let i = 0; i < blk.length; i++) for (let j = 0; j < blk[0].length; j++) M[r0 + i][c0 + j] = blk[i][j] * Ts; };
      // rows 0..ns-1: [-A', 0, Q, N]; rows ns..nn-1: [-B', 0, N', R]; rows nn..nn+ns-1: [0,0,A,B]
      set(0, 0, matScale(At, -1)); set(0, nn, Q); set(0, nn + ns, Nc);
      set(ns, 0, matScale(Bt, -1)); set(ns, nn, Nt); set(ns, nn + ns, Rm);
      set(nn, nn, A); set(nn, nn + ns, B);
      const phi = matExp(M);
      const phi12: number[][] = [], phi22: number[][] = [];
      for (let i = 0; i < nn; i++) { phi12[i] = []; phi22[i] = []; for (let j = 0; j < nn; j++) { phi12[i][j] = phi[i][nn + j]; phi22[i][j] = phi[nn + i][nn + j]; } }
      const QQ = symmetrize(mmul(matT(phi22), phi12));      // [Qd Nd; Nd' Rd]
      const Qd: number[][] = [], Rd: number[][] = [], Nd: number[][] = [];
      for (let i = 0; i < ns; i++) { Qd[i] = []; Nd[i] = []; for (let j = 0; j < ns; j++) Qd[i][j] = QQ[i][j]; for (let j = 0; j < ni; j++) Nd[i][j] = QQ[i][ns + j]; }
      for (let i = 0; i < ni; i++) { Rd[i] = []; for (let j = 0; j < ni; j++) Rd[i][j] = QQ[ns + i][ns + j]; }
      const Ad: number[][] = [], Bd: number[][] = [];
      for (let i = 0; i < ns; i++) { Ad[i] = []; Bd[i] = []; for (let j = 0; j < ns; j++) Ad[i][j] = phi22[i][j]; for (let j = 0; j < ni; j++) Bd[i][j] = phi22[i][ns + j]; }
      const { X, K } = dareN(Ad, Bd, Qd, Rd, Nd);
      const out: Value[] = [fromRows(K)];
      if (nout >= 2) out.push(fromRows(X));
      if (nout >= 3) out.push(eigClosed(matSub(Ad, mmul(Bd, K))));
      return Promise.resolve(out);
    },
    /** [u,t] = gensig(type,tau[,Tf,Ts]) generates a periodic unit-amplitude test signal. */
    gensig: (a, nout) => {
      const type = asString(a[0]).toLowerCase().slice(0, 2);
      const tau = asScalar(a[1]);
      const Tf = a.length >= 3 && a[2] && !(isMatLike(a[2]) && m(a[2]).data.length === 0) ? asScalar(a[2]) : 5 * tau;
      const Ts = a.length >= 4 ? asScalar(a[3]) : tau / 64;
      const nT = Math.floor(Tf / Ts + 1e-9) + 1;
      const t: number[] = []; for (let i = 0; i < nT; i++) t.push(i * Ts);   // index×Ts: no accumulated float drift
      const eps = 2.220446049250313e-16;
      const u = t.map((tv) => {
        let r = tv - Math.floor(tv / tau + 1e-9) * tau;   // rem(t,tau) with snap to avoid r≈tau drift
        if (r > tau - 1e-9 * tau) r = 0;
        if (type === 'si') return Math.sin((2 * Math.PI / tau) * tv);
        if (type === 'sq') return r >= tau / 2 ? 1 : 0;
        if (type === 'pu') return r < (1 - 1000 * eps) * Ts ? 1 : 0;
        throw new Error('gensig: unknown signal type');
      });
      const U = colVec(u), T = colVec(t);
      return nout >= 2 ? Promise.resolve([U, T]) : ret(U);
    },
    /** S = lsiminfo(y,t[,yfinal[,yinit]]) returns linear-response characteristics. */
    lsiminfo: (a) => {
      const y = toArray(m(a[0]));
      const t = a.length >= 2 && isMatLike(a[1]) ? toArray(m(a[1])) : y.map((_, i) => i + 1);
      const yf = a.length >= 3 ? asScalar(a[2]) : y[y.length - 1];
      const yi = a.length >= 4 ? asScalar(a[3]) : 0;
      const ST = 0.02; const ns = t.length;
      // Peak of |y-yi|
      let peak = -Infinity, ipeak = 0; for (let i = 0; i < ns; i++) { const d = Math.abs(y[i] - yi); if (d > peak) { peak = d; ipeak = i; } }
      // Min / Max
      let mn = Infinity, imn = 0, mx = -Infinity, imx = 0;
      for (let i = 0; i < ns; i++) { if (y[i] < mn) { mn = y[i]; imn = i; } if (y[i] > mx) { mx = y[i]; imx = i; } }
      const err = y.map((v) => Math.abs(v - yf));
      const settle = (tol: number): number => {
        let iS = -1; for (let i = ns - 1; i >= 0; i--) if (err[i] > tol) { iS = i; break; }
        if (iS < 0) return 0;
        if (iS === ns - 1) return NaN;
        // Ts==0 (continuous): interpolate
        const aa = y[iS] - y[iS + 1], bb = y[iS + 1] - yf;
        const tau = Math.abs(aa) < 1e-12 ? 0 : Math.max((-tol - bb) / aa, (tol - bb) / aa);   // flat segment (ZOH/quantized) ⇒ no slope to interpolate
        return t[iS + 1] + tau * (t[iS] - t[iS + 1]);
      };
      let transient: number, settling: number;
      if (Number.isFinite(yf)) {
        transient = settle(ST * Math.max(...err));
        settling = settle(ST * Math.abs(yf - yi));
      } else { transient = NaN; settling = NaN; }
      const fields = new Map<string, Value[]>([
        ['TransientTime', [scalar(transient)]], ['SettlingTime', [scalar(settling)]],
        ['Peak', [scalar(peak)]], ['PeakTime', [scalar(t[ipeak])]],
        ['Min', [scalar(mn)]], ['MinTime', [scalar(t[imn])]],
        ['Max', [scalar(mx)]], ['MaxTime', [scalar(t[imx])]],
      ]);
      return ret({ kind: 'struct', rows: 1, cols: 1, fields } as StructV);
    },
    /** minreal(sys[,tol]) — minimal realization via pole/zero cancellation. */
    minreal: (a) => {
      const { num, den } = numDenAny(a[0]);
      const tol = a.length >= 2 ? asScalar(a[1]) : Math.sqrt(2.220446049250313e-16);
      const r = minrealTf(num, den, Math.max(tol, 1e-9));
      return ret(makeObject('tf', { num: rowVec(r.num), den: rowVec(r.den) }));
    },

    /** frd(response,freq[,Ts]) — frequency-response-data model. */
    frd: (a) => {
      const Ts = a.length >= 3 ? asScalar(a[2]) : 0;
      return ret(makeObject('frd', {
        ResponseData: m(a[0]),
        Frequency: colVec(toArray(m(a[1]))),
        Ts: scalar(Ts),
      }));
    },

    /** [resp,freq] = frdata(sys) — extract frequency-response data from an frd model. */
    frdata: (a, n) => {
      const sys = a[0];
      if (!isObject(sys) || sys.className !== 'frd') throw new Error('frdata: expected an frd model');
      const resp = sys.props.get('ResponseData') as Mat;
      const freq = sys.props.get('Frequency') as Mat;
      if (n >= 2) return Promise.resolve([resp, freq]);
      return ret(resp);
    },

    /** filt(num,den[,Ts]) — DSP-convention filter (z^-1 ascending powers). Stored as tf with Variable='z^-1'. */
    filt: (a) => {
      // MATLAB filt pads num/den to equal length (ascending z^-1 powers → stored as descending z coeffs)
      const numIn = toArray(m(a[0])), denIn = toArray(m(a[1]));
      const Ts = a.length >= 3 ? asScalar(a[2]) : -1;
      const len = Math.max(numIn.length, denIn.length);
      const numPad = new Array(len).fill(0), denPad = new Array(len).fill(0);
      // Pad with trailing zeros (ascending powers → just pad to same length)
      for (let i = 0; i < numIn.length; i++) numPad[i] = numIn[i];
      for (let i = 0; i < denIn.length; i++) denPad[i] = denIn[i];
      return ret(makeObject('tf', {
        num: rowVec(numPad),
        den: rowVec(denPad),
        Ts: scalar(Ts),
        Variable: makeStr('z^-1'),
      }));
    },

    /** dss(A,B,C,D,E[,Ts]) — descriptor state-space model E*xdot = A*x + B*u. */
    dss: (a) => {
      const Ts = a.length >= 6 ? asScalar(a[5]) : 0;
      return ret(makeObject('dss', {
        A: m(a[0]), B: m(a[1]), C: m(a[2]), D: m(a[3]), E: m(a[4]), Ts: scalar(Ts),
      }));
    },

    /** rss(n[,p,m]) — random CONTINUOUS stable state-space of order n (p outputs, m inputs). */
    rss: (a) => {
      const n = Math.max(1, Math.round(asScalar(a[0])));
      const p = a.length >= 2 ? Math.max(1, Math.round(asScalar(a[1]))) : 1;
      const mIn = a.length >= 3 ? Math.max(1, Math.round(asScalar(a[2]))) : 1;
      // Build a stable random A: use diagonal of negative values, then add random perturbation
      // Strategy: random eigenvalues with negative real part, build via real random matrix then shift
      const A: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => (Math.random() * 2 - 1)));
      // Shift eigenvalues to ensure stability: compute trace and shift diagonal down
      // Compute Gershgorin-based shift: for each row, row_sum = sum of |off-diag|
      // Ensure A[i][i] - sum_offdiag < 0 → set A[i][i] = -(sum + rand)
      for (let i = 0; i < n; i++) {
        let offSum = 0; for (let j = 0; j < n; j++) if (j !== i) offSum += Math.abs(A[i][j]);
        A[i][i] = -(offSum + Math.random() + 0.1);
      }
      const B: number[][] = Array.from({ length: n }, () => Array.from({ length: mIn }, () => Math.random() * 2 - 1));
      const C: number[][] = Array.from({ length: p }, () => Array.from({ length: n }, () => Math.random() * 2 - 1));
      const D: number[][] = Array.from({ length: p }, () => Array.from({ length: mIn }, () => 0));
      return ret(makeObject('ss', { A: fromRows(A), B: fromRows(B), C: fromRows(C), D: fromRows(D) }));
    },

    /** drss(n[,p,m]) — random DISCRETE stable state-space of order n, all poles inside unit circle. */
    drss: (a) => {
      const n = Math.max(1, Math.round(asScalar(a[0])));
      const p = a.length >= 2 ? Math.max(1, Math.round(asScalar(a[1]))) : 1;
      const mIn = a.length >= 3 ? Math.max(1, Math.round(asScalar(a[2]))) : 1;
      // Build stable A: random matrix scaled so spectral radius < 1
      // Use random matrix and normalize by (spectral_radius + epsilon)
      const A: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => (Math.random() * 2 - 1)));
      // Scale A so all eigenvalues lie strictly inside unit circle:
      // Simple approach: scale by 0.5/(norm_inf + 1) then won't exceed 0.5
      let normInfA = 0;
      for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += Math.abs(A[i][j]); normInfA = Math.max(normInfA, s); }
      const scale = 0.6 / (normInfA + 1e-10);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i][j] *= scale;
      const B: number[][] = Array.from({ length: n }, () => Array.from({ length: mIn }, () => Math.random() * 2 - 1));
      const C: number[][] = Array.from({ length: p }, () => Array.from({ length: n }, () => Math.random() * 2 - 1));
      const D: number[][] = Array.from({ length: p }, () => Array.from({ length: mIn }, () => 0));
      return ret(makeObject('ss', { A: fromRows(A), B: fromRows(B), C: fromRows(C), D: fromRows(D), Ts: scalar(-1) }));
    },

    // ── Group A: Estimator / Regulator / LQG ──────────────────────────────────

    /** estim(sys,L[,sensors,known]) — state estimator from plant sys=ss(A,B,C,D) and gain L.
     *  Implements the standard observer: xhat_dot = A*xhat + B*u + L*(y - C*xhat - D*u)
     *  But MATLAB estim with default sensors/known treats ALL inputs as noise (no u feedforward),
     *  so the estimator input is only y:  xhat_dot = (A-L*C)*xhat + L*y
     *  Outputs: [yhat; xhat] = [C; eye(n)] * xhat + [0; 0] * y.
     *  Matches: estim(ss(A,B,C,D), L) in MATLAB. */
    estim: (a) => {
      const sys = a[0];
      if (!isObject(sys) || sys.className !== 'ss') throw new Error('estim: sys must be an ss model');
      const A = matRows(m(sys.props.get('A') as Mat));
      const C = matRows(m(sys.props.get('C') as Mat));
      const n = A.length, ny = C.length;
      const L = matRows(m(a[1]));
      // Ae = A - L*C
      const Ae = matSub(A, smul(L, C));
      // Be = L  (input is y, dimension ny)
      const Be = L;
      // Ce = [C; eye(n)]  (outputs: yhat then all xhat)
      const Ce: number[][] = [...C.map((r) => r.slice()), ...eye(n)];
      // De = zeros(ny+n, ny)
      const De = zeros2(ny + n, ny);
      return ret(mkSS({ A: Ae, B: Be, C: Ce, D: De, Ts: 0 }));
    },

    /** reg(sys,K,L[,sensors,known]) — observer-based regulator (output-feedback controller).
     *  For plant ss(A,B,C,D) with state-feedback gain K and estimator gain L:
     *    Controller: A_c = A - B*K - L*C, B_c = L, C_c = -K, D_c = 0.
     *  Input: y (measured output), Output: u (control).
     *  Matches MATLAB reg(ss(A,B,C,D), K, L). */
    reg: (a) => {
      const sys = a[0];
      if (!isObject(sys) || sys.className !== 'ss') throw new Error('reg: sys must be an ss model');
      const A = matRows(m(sys.props.get('A') as Mat));
      const B = matRows(m(sys.props.get('B') as Mat));
      const C = matRows(m(sys.props.get('C') as Mat));
      const K = matRows(m(a[1]));
      const L = matRows(m(a[2]));
      // Ac = A - B*K - L*C
      const Ac = matSub(matSub(A, smul(B, K)), smul(L, C));
      // Bc = L
      const Bc = L;
      // Cc = -K
      const Cc = K.map((r) => r.map((x) => -x));
      const ny = C.length, nu = K.length;
      const Dc = zeros2(nu, ny);
      return ret(mkSS({ A: Ac, B: Bc, C: Cc, D: Dc, Ts: 0 }));
    },

    /** lqg(sys,QXU,QWV) — LQG regulator: lqr design from QXU + Kalman filter from QWV combined via reg.
     *  QXU = [Q N; N' R] (n+nu block): state/input weights for lqr.
     *  QWV = [Qn 0; 0 Rn] (n+ny block): process/measurement noise covariances.
     *  Returns the observer-based LQG regulator (same as reg(sys, K_lqr, L_lqe)). */
    lqg: (a) => {
      const sys = a[0];
      if (!isObject(sys) || sys.className !== 'ss') throw new Error('lqg: sys must be an ss model');
      const A = matRows(m(sys.props.get('A') as Mat));
      const B = matRows(m(sys.props.get('B') as Mat));
      const C = matRows(m(sys.props.get('C') as Mat));
      const n = A.length, nu = B[0]?.length ?? 0, ny = C.length;
      const QXU = matRows(m(a[1]));
      const QWV = matRows(m(a[2]));
      // Extract Q, R, N from QXU = [Q N; N' R]
      const Q_lqr = QXU.slice(0, n).map((r) => r.slice(0, n));
      const R_lqr = QXU.slice(n).map((r) => r.slice(n));
      // Extract Qn, Rn from QWV
      const Qn = QWV.slice(0, n).map((r) => r.slice(0, n));
      const Rn = QWV.slice(n).map((r) => r.slice(n));
      // LQR gain
      const Ri_lqr = matInv(R_lqr);
      const S_lqr = care(A, B, Q_lqr, Ri_lqr);
      const K = smul(smul(Ri_lqr, matT(B)), S_lqr);
      // Kalman gain (lqe dual: solve CARE on (A', C') with Qn as process noise on all states)
      const Ri_kf = matInv(Rn);
      const P = care(matT(A), matT(C), Qn, Ri_kf);
      const L = smul(smul(P, matT(C)), Ri_kf);
      // Assemble observer-based controller: Ac=A-BK-LC, Bc=L, Cc=-K, Dc=0
      const Ac = matSub(matSub(A, smul(B, K)), smul(L, C));
      const Cc = K.map((r) => r.map((x) => -x));
      const Dc = zeros2(nu, ny);
      return ret(mkSS({ A: Ac, B: L, C: Cc, D: Dc, Ts: 0 }));
    },

    /** [K,S,e] = lqi(sys,Q,R[,N]) — LQ regulator with integral action.
     *  Augments plant with ny integrators on the outputs, then calls lqr on the augmented system.
     *  Augmented state: [x; e] where e_dot = -C*x (integrator of output error).
     *  A_aug = [A 0; -C 0], B_aug = [B; 0], cost = [x;e]'*Q*[x;e] + u'*R*u.
     *  Returns [K, S, e] matching MATLAB lqi(ss(A,B,C,D), Q, R). */
    lqi: (a, nout) => {
      const sys = a[0];
      if (!isObject(sys) || sys.className !== 'ss') throw new Error('lqi: sys must be an ss model');
      const A = matRows(m(sys.props.get('A') as Mat));
      const B = matRows(m(sys.props.get('B') as Mat));
      const C = matRows(m(sys.props.get('C') as Mat));
      const n = A.length, nu = B[0]?.length ?? 0, ny = C.length;
      const Q = matRows(m(a[1]));
      const Rm = matRows(m(a[2]));
      const Ri = matInv(Rm);
      // Augmented matrices: [x; e]
      const A_aug = zeros2(n + ny, n + ny);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A_aug[i][j] = A[i][j];
      for (let i = 0; i < ny; i++) for (let j = 0; j < n; j++) A_aug[n + i][j] = -C[i][j];
      const B_aug = zeros2(n + ny, nu);
      for (let i = 0; i < n; i++) for (let j = 0; j < nu; j++) B_aug[i][j] = B[i][j];
      // Solve CARE on augmented system
      const S = care(A_aug, B_aug, Q, Ri);
      const K = smul(Ri, smul(matT(B_aug), S));
      const Acl = matSub(A_aug, smul(B_aug, K));
      const out: Value[] = [fromRows(K)];
      if (nout >= 2) out.push(fromRows(S));
      if (nout >= 3) out.push(eigClosed(Acl));
      return Promise.resolve(out);
    },

    /** lqgreg(kest,K[,controls]) — assemble LQG regulator from Kalman estimator and LQR gain.
     *  kest is the estimator produced by kalman(sys,Qn,Rn,N,sensors,known) where the 'known'
     *  inputs are the control channels; K is the state-feedback gain from lqr/dlqr.
     *  The regulator closes the loop: u = -K*xhat, xhat driven by kest's u-input channel.
     *  kest input structure: [u_known; y_sensors]. lqgreg selects the u channel, closes with -K. */
    lqgreg: (a) => {
      const kest = a[0];
      if (!isObject(kest) || kest.className !== 'ss') throw new Error('lqgreg: kest must be an ss model');
      const K = matRows(m(a[1]));
      const Ae = matRows(m(kest.props.get('A') as Mat));
      const Be = matRows(m(kest.props.get('B') as Mat));
      const Ce = matRows(m(kest.props.get('C') as Mat));
      const De = expandD(kest.props.get('D'), Ce.length, Be[0]?.length ?? 0);
      const nx = Ae.length;
      const nu_ctrl = K.length;   // number of control inputs (rows of K)
      const n_kest_in = Be[0]?.length ?? 0;  // total inputs to kest: [u_ctrl; y_meas]
      const n_kest_out = Ce.length;           // total outputs: [yhat; xhat] typically
      // The xhat outputs are the last nx rows of Ce (first rows are yhat)
      const ny_hat = n_kest_out - nx;  // number of yhat outputs = number of measured outputs
      // Extract xhat rows of Ce (rows ny_hat..n_kest_out-1)
      const C_xhat = Ce.slice(ny_hat);   // nx × nx matrix (=eye(n) in standard kalman)
      // The control inputs occupy the first nu_ctrl columns of Be
      // The measurement inputs occupy the remaining columns of Be
      const n_y_in = n_kest_in - nu_ctrl;  // measurement inputs to kest
      if (n_y_in < 0) throw new Error(`lqgreg: the feedback gain K has ${nu_ctrl} control inputs but the estimator kest only accepts ${n_kest_in} inputs — dimensions are incompatible`);
      // Standard case: kest has [u_ctrl; y_meas] inputs
      // Extract B_u (control input columns) and B_y (measurement input columns)
      const B_u = Be.map((r) => r.slice(0, nu_ctrl));
      const B_y = Be.map((r) => r.slice(nu_ctrl));
      // Close the loop u = -K*xhat:
      // xhat_dot = Ae*xhat + B_u*u + B_y*y = Ae*xhat + B_u*(-K*C_xhat*xhat) + B_y*y
      //           = (Ae - B_u*K*C_xhat)*xhat + B_y*y
      const Ac = matSub(Ae, smul(B_u, smul(K, C_xhat)));
      const Cc = smul(K.map((r) => r.map((x) => -x)), C_xhat);
      return ret(mkSS({ A: Ac, B: B_y, C: Cc, D: zeros2(nu_ctrl, n_y_in), Ts: 0 }));
    },

    // ── Group B: PID controllers ──────────────────────────────────────────────

    /** pid(Kp,Ki,Kd[,Tf]) — parallel-form PID controller (ClassV with className='pid').
     *  Transfer function: C(s) = Kp + Ki/s + Kd*s/(Tf*s+1)  (Tf=0 → ideal derivative Kd*s).
     *  Equivalent to tf numerator [(Kp*Tf+Kd)*s^2 + (Kp+Ki*Tf)*s + Ki] / [Tf*s^2 + s].
     *  class(pid(Kp,Ki,Kd)) returns 'pid'. Verified against MATLAB. */
    pid: (a) => {
      const Kp = a.length >= 1 ? asScalar(a[0]) : 0;
      const Ki = a.length >= 2 ? asScalar(a[1]) : 0;
      const Kd = a.length >= 3 ? asScalar(a[2]) : 0;
      const Tf = a.length >= 4 ? asScalar(a[3]) : 0;
      return ret(makeObject('pid', { Kp: scalar(Kp), Ki: scalar(Ki), Kd: scalar(Kd), Tf: scalar(Tf), Ts: scalar(0) }));
    },

    /** pid2(Kp,Ki,Kd[,Tf,b,c]) — 2-DOF PID with setpoint weights b (proportional) and c (derivative).
     *  C(s) = [Kp*(b*r-y) + Ki*(r-y)/s + Kd*s*(c*r-y)/(Tf*s+1)]
     *  Returns a ClassV with className='pid2'. tf(pid2(...)) returns a 1x2 system. */
    pid2: (a) => {
      const Kp = a.length >= 1 ? asScalar(a[0]) : 0;
      const Ki = a.length >= 2 ? asScalar(a[1]) : 0;
      const Kd = a.length >= 3 ? asScalar(a[2]) : 0;
      const Tf = a.length >= 4 ? asScalar(a[3]) : 0;
      const b  = a.length >= 5 ? asScalar(a[4]) : 1;
      const c  = a.length >= 6 ? asScalar(a[5]) : 1;
      return ret(makeObject('pid2', { Kp: scalar(Kp), Ki: scalar(Ki), Kd: scalar(Kd), Tf: scalar(Tf), b: scalar(b), c: scalar(c), Ts: scalar(0) }));
    },

    /** pidstd(Kp,Ti,Td[,N]) — standard-form PID: Kp*(1 + 1/(Ti*s) + Td*N*s/(Td*s+N)).
     *  N=Inf means ideal derivative: Kp*(1 + 1/(Ti*s) + Td*s).
     *  Stored as ClassV 'pidstd' with fields Kp,Ti,Td,N. */
    pidstd: (a) => {
      const Kp = a.length >= 1 ? asScalar(a[0]) : 1;
      const Ti = a.length >= 2 ? asScalar(a[1]) : Infinity;
      const Td = a.length >= 3 ? asScalar(a[2]) : 0;
      const N  = a.length >= 4 ? asScalar(a[3]) : Infinity;
      return ret(makeObject('pidstd', { Kp: scalar(Kp), Ti: scalar(Ti), Td: scalar(Td), N: scalar(N), Ts: scalar(0) }));
    },

    /** [Kp,Ki,Kd,Tf] = piddata(C) — extract parallel PID parameters from a pid object. */
    piddata: (a, nout) => {
      const C = a[0];
      if (!isObject(C) || (C.className !== 'pid' && C.className !== 'pid2'))
        throw new Error('piddata: argument must be a pid or pid2 object');
      const Kp = asScalar(C.props.get('Kp') as Value ?? scalar(0));
      const Ki = asScalar(C.props.get('Ki') as Value ?? scalar(0));
      const Kd = asScalar(C.props.get('Kd') as Value ?? scalar(0));
      const Tf = asScalar(C.props.get('Tf') as Value ?? scalar(0));
      const out: Value[] = [scalar(Kp), scalar(Ki), scalar(Kd), scalar(Tf)];
      if (nout >= 4) return Promise.resolve(out);
      if (nout >= 3) return Promise.resolve(out.slice(0, 3));
      if (nout >= 2) return Promise.resolve(out.slice(0, 2));
      return ret(scalar(Kp));
    },

    /** [Kp,Ti,Td,N] = pidstddata(C) — extract standard PID parameters from a pidstd object. */
    pidstddata: (a, nout) => {
      const C = a[0];
      if (!isObject(C) || C.className !== 'pidstd')
        throw new Error('pidstddata: argument must be a pidstd object');
      const Kp = asScalar(C.props.get('Kp') as Value ?? scalar(1));
      const Ti = asScalar(C.props.get('Ti') as Value ?? scalar(Infinity));
      const Td = asScalar(C.props.get('Td') as Value ?? scalar(0));
      const N  = asScalar(C.props.get('N')  as Value ?? scalar(Infinity));
      const out: Value[] = [scalar(Kp), scalar(Ti), scalar(Td), scalar(N)];
      if (nout >= 4) return Promise.resolve(out);
      if (nout >= 3) return Promise.resolve(out.slice(0, 3));
      if (nout >= 2) return Promise.resolve(out.slice(0, 2));
      return ret(scalar(Kp));
    },

    /** [C,info] = pidtune(sys,type[,wc]) — automatic PID tuning via heuristic loop-shaping.
     *  NOTE: MATLAB's pidtune uses a proprietary algorithm; this implementation is a documented
     *  HEURISTIC that DOES NOT match MATLAB's output. It aims for ~60° phase margin at a
     *  target crossover frequency, using a Ziegler-Nichols-inspired gain selection.
     *  Verify only: the closed loop feedback(sys*C, 1) is stable with positive phase margin. */
    pidtune: (a, nout) => {
      const sys = a[0];
      const typeStr = a.length >= 2 ? asString(a[1]).toLowerCase() : 'pid';
      // Optional target crossover frequency
      const wc_target = a.length >= 3 ? asScalar(a[2]) : NaN;
      // Get frequency response data to estimate gain crossover and phase margin
      const { num, den } = getNumDenAny(sys);
      // Estimate bandwidth of plant: find frequency where |G(jw)| = 1
      // Use a log-spaced grid
      const grid: number[] = [];
      for (let i = 0; i <= 300; i++) grid.push(10 ** (-3 + (6 * i) / 300));
      const mags = grid.map((w) => evalLjw(num, den, w).mag);
      // Find phase crossover (where |G|=1) to estimate desired crossover freq wc
      let wc = isFinite(wc_target) ? wc_target : NaN;
      if (!isFinite(wc)) {
        // Pick crossover at the frequency where gain ~ 1 (or fallback to geometric mean of features)
        for (let i = 1; i < grid.length; i++) {
          if ((mags[i - 1] - 1) * (mags[i] - 1) <= 0) {
            wc = bisect((w) => evalLjw(num, den, w).mag - 1, grid[i - 1], grid[i]);
            break;
          }
        }
        if (!isFinite(wc)) wc = grid[Math.floor(grid.length / 2)]; // fallback
      }
      // Compute plant gain and phase at wc
      const lc = evalLjw(num, den, wc);
      const plant_phase = lc.phaseDeg;
      const plant_mag = lc.mag;
      // Target phase margin = 60°: need controller to add (60 - (180 + plant_phase)) = -(120 + plant_phase) degrees
      // For a P controller: C(jwc) = 1/plant_mag, PM = 180 + plant_phase (open-loop phase)
      // PID: add phase lead to achieve ~60° PM
      const targetPM = 60;
      let currentPM = 180 + plant_phase;
      while (currentPM > 180) currentPM -= 360; while (currentPM < -180) currentPM += 360;   // wrap (atan2 ±180 ambiguity, e.g. 1/s^2)
      const phaseNeeded = targetPM - currentPM; // phase lead needed from controller
      // Simple heuristic: choose Ti and Td for phase lead, Kp for gain
      // Kp = 1/(plant_mag) to set unity gain at wc
      let Kp = 1.0 / (plant_mag || 1e-10);
      let Kd = 0, Ki = 0, Tf = 0;
      if (typeStr.startsWith('pi')) {
        // PI: add integral, sacrifice some PM
        Ki = Kp * wc / 10;  // Ti = 10/wc
      }
      if (typeStr === 'pid') {
        // PID: add derivative for phase lead, integral for steady-state
        const phase_lead = Math.min(Math.max(phaseNeeded, 0), 70);
        const alpha = (1 + Math.sin(phase_lead * Math.PI / 180)) / (1 - Math.sin(phase_lead * Math.PI / 180) + 1e-12);
        const wm = wc;  // place peak phase at wc
        const Td_val = 1 / (wm * Math.sqrt(alpha));
        const Ti_val = alpha * Td_val;
        Ki = Kp / Ti_val;
        Kd = Kp * Td_val;
        Tf = Td_val / Math.sqrt(alpha);  // filter time constant
        if (!isFinite(Ki) || Ki < 0) Ki = Kp * wc / 10;
        if (!isFinite(Kd) || Kd < 0) Kd = 0;
        if (!isFinite(Tf) || Tf < 0) Tf = 0;
      }
      // Clamp to reasonable values
      if (!isFinite(Kp) || Kp <= 0) Kp = 1;
      // Build the pid object
      const C_pid = makeObject('pid', { Kp: scalar(Kp), Ki: scalar(Ki), Kd: scalar(Kd), Tf: scalar(Tf), Ts: scalar(0) });
      if (nout >= 2) {
        // Return info struct with PhaseMargin and Stable fields
        // Compute closed-loop stability check
        let pm = NaN;
        try {
          // Controller tf numerator/denominator
          const pidNum = Tf > 0
            ? [(Kp * Tf + Kd), (Kp + Ki * Tf), Ki]
            : [Kd, Kp, Ki];
          const pidDen = Tf > 0 ? [Tf, 1, 0] : [1, 0];
          const olNum = polyConv(num, pidNum);
          const olDen = polyConv(den, pidDen);
          const { Pm } = marginData(olNum, olDen);
          pm = Pm;
        } catch { pm = NaN; }
        const fields = new Map<string, Value[]>([
          ['PhaseMargin', [scalar(pm)]],
          ['Stable', [bool(isFinite(pm) && pm > 0)]],
          ['CrossoverFrequency', [scalar(wc)]],
        ]);
        return Promise.resolve([C_pid, { kind: 'struct', rows: 1, cols: 1, fields } as StructV]);
      }
      return ret(C_pid);
    },

    /** W = gram(sys,type) — controllability ('c') or observability ('o') Gramian via Lyapunov eqn. */
    gram: (a) => {
      const sys = a[0]; const type = asString(a[1]).toLowerCase()[0];
      if (!isObject(sys) || sys.className !== 'ss') throw new Error('gram: sys must be an ss model');
      const A = matRows(m(sys.props.get('A') as Mat));
      const B = matRows(m(sys.props.get('B') as Mat));
      const C = matRows(m(sys.props.get('C') as Mat));
      const Ts = sys.props.has('Ts') ? asScalar(sys.props.get('Ts') as Value) : 0;
      const isDisc = Ts !== 0;
      if (type === 'c') {
        // Controllability Gramian: A*Wc + Wc*A' + B*B' = 0 (continuous)
        //                          A*Wc*A' - Wc + B*B' = 0 (discrete)
        const BB = mmul(B, matT(B));
        const W = isDisc ? dlyapSolve(A, BB) : lyapSolve(A, BB);
        return ret(fromRows(W));
      } else {
        // Observability Gramian: A'*Wo + Wo*A + C'*C = 0 (continuous)
        //                        A'*Wo*A - Wo + C'*C = 0 (discrete)
        const CC = mmul(matT(C), C);
        const At = matT(A);
        const W = isDisc ? dlyapSolve(At, CC) : lyapSolve(At, CC);
        return ret(fromRows(W));
      }
    },
  },
  help: HELP_CONTROL,
  // OOP method dispatch (see tb/types.ts): series(tf,…) routes here; series(sym,…) → Symbolic.
  // Operator + interconnection overloads (mtimes/plus/minus/inv/series/…) declared ONCE on the
  // base 'lti' class; every LTI subclass inherits them via `parents` + the dispatch parent-chain.
  // All implemented on state-space (LTI_OPS), so tf/ss/zpk/frd/pid behave uniformly and MIMO.
  methods: {
    lti: { ...LTI_OPS },
  },
  parents: {
    tf: 'lti', ss: 'lti', zpk: 'lti', dss: 'lti',   // all handled by toSS()
    pid: 'lti', pid2: 'lti', pidstd: 'lti',          // PID objects route through toSS(), so they inherit too
  },
};

