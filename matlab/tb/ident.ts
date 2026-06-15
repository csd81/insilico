// System Identification Toolbox — ARX/ARMAX polynomial model fitting, state-space identification
// (N4SID subspace), and transfer function estimation via least squares (tfest).
import {
  type Value, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat, isStruct, isObject, MatError,
  mat, zeros, makeObject, fromRows,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_IDENT } from '../help/toolbox-help';

// ── Least-squares helpers ──────────────────────────────────────────────────────────────
// Returns (A'A)^{-1} A'b via Gaussian elimination (small matrices only).
function lstsq(A: number[][], b: number[]): number[] {
  const n = A[0].length;
  const AtA: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) =>
    A.reduce((s, r) => s + r[i] * r[j], 0)));
  const Atb: number[] = Array.from({ length: n }, (_, i) => A.reduce((s, r, k) => s + r[i] * b[k], 0));
  // Tikhonov (ridge) regularization: keep AtA positive-definite so a rank-deficient / ill-conditioned
  // design matrix yields the minimum-norm-style solution instead of fabricated coefficients from a
  // skipped zero pivot. The ridge is tiny relative to the problem scale, so well-posed fits are unaffected.
  let tr = 0; for (let i = 0; i < n; i++) tr += AtA[i][i];
  const ridge = (tr > 0 ? tr / n : 1) * 1e-12;
  for (let i = 0; i < n; i++) AtA[i][i] += ridge;
  // augmented matrix
  const M = AtA.map((r, i) => [...r, Atb[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const d = M[col][col];
    if (Math.abs(d) < 1e-15) continue;
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / d;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    x[r] = M[r][n];
    for (let c = r + 1; c < n; c++) x[r] -= M[r][c] * x[c];
    x[r] /= M[r][r] || 1;
  }
  return x;
}

function coerce(v: Value): number[] {
  if (isMat(v)) return toArray(v as any);
  throw new MatError('ident: expected numeric array');
}

// ── ARX: y(t) + a1*y(t-1)+...+ana*y(t-na) = b1*u(t-nk)+...+bnb*u(t-nk-nb+1) + e(t)
// Returns idpoly object with A,B coefficient vectors.
async function arx(args: Value[]): Promise<Value[]> {
  let u: number[], y: number[];
  let na: number, nb: number, nk: number;
  if (args.length >= 3) {
    // arx(data, [na nb nk]) or arx(u, y, [na nb nk])
    if (args.length >= 3 && isMat(args[2])) {
      u = coerce(args[0]); y = coerce(args[1]);
      const ord = coerce(args[2]);
      na = Math.round(ord[0]); nb = Math.round(ord[1]); nk = Math.round(ord[2] ?? 1);
    } else {
      throw new MatError('arx: usage arx(u,y,[na nb nk]) or arx(data,[na nb nk])');
    }
  } else {
    throw new MatError('arx: requires at least 3 arguments');
  }
  const N = y.length;
  // Build regression matrix Phi: rows = [y(t-1)..y(t-na), u(t-nk)..u(t-nk-nb+1)]
  const Phi: number[][] = [];
  const Yv: number[] = [];
  for (let t = Math.max(na, nk + nb - 1); t < N; t++) {
    const row: number[] = [];
    for (let i = 1; i <= na; i++) row.push(t - i >= 0 ? -y[t - i] : 0);
    for (let i = 0; i < nb; i++) { const ti = t - nk - i; row.push(ti >= 0 ? u[ti] : 0); }
    Phi.push(row);
    Yv.push(y[t]);
  }
  const theta = lstsq(Phi, Yv);
  const A = [1, ...theta.slice(0, na)];
  const B = theta.slice(na);
  const props = new Map<string, Value>();
  props.set('A', rowVec(A));
  props.set('B', rowVec(B));
  props.set('C', rowVec([1]));
  props.set('D', rowVec([1]));
  props.set('F', rowVec([1]));
  props.set('na', scalar(na)); props.set('nb', scalar(nb)); props.set('nk', scalar(nk));
  props.set('Ts', scalar(1));
  return [makeObject('idpoly', props)];
}

// ── ARMAX: A(q)y(t) = B(q)u(t) + C(q)e(t)
async function armax(args: Value[]): Promise<Value[]> {
  // Same regression as ARX (C estimation requires iterative ML; use ARX approximation here)
  let u: number[], y: number[], na: number, nb: number, nc: number, nk: number;
  if (args.length >= 3 && isMat(args[2])) {
    u = coerce(args[0]); y = coerce(args[1]);
    const ord = coerce(args[2]);
    [na, nb, nc, nk] = ord.map(Math.round);
    nk = nk ?? 1; nc = nc ?? 1;
  } else {
    throw new MatError('armax: usage armax(u,y,[na nb nc nk])');
  }
  const N = y.length;
  const Phi: number[][] = [];
  const Yv: number[] = [];
  const eps: number[] = Array(N).fill(0); // residuals (zero on first pass)
  for (let t = Math.max(na, nk + nb - 1, nc); t < N; t++) {
    const row: number[] = [];
    for (let i = 1; i <= na; i++) row.push(t - i >= 0 ? -y[t - i] : 0);
    for (let i = 0; i < nb; i++) { const ti = t - nk - i; row.push(ti >= 0 ? u[ti] : 0); }
    for (let i = 1; i <= nc; i++) row.push(t - i >= 0 ? eps[t - i] : 0);
    Phi.push(row);
    Yv.push(y[t]);
  }
  const theta = lstsq(Phi, Yv);
  const A = [1, ...theta.slice(0, na)];
  const B = theta.slice(na, na + nb);
  const C = [1, ...theta.slice(na + nb)];
  const props = new Map<string, Value>();
  props.set('A', rowVec(A)); props.set('B', rowVec(B)); props.set('C', rowVec(C));
  props.set('D', rowVec([1])); props.set('F', rowVec([1]));
  props.set('na', scalar(na)); props.set('nb', scalar(nb)); props.set('nc', scalar(nc)); props.set('nk', scalar(nk));
  props.set('Ts', scalar(1));
  return [makeObject('idpoly', props)];
}

// QUARANTINED: n4sid — returns a DEGENERATE model (A=0, B=0, C=0; only D=mean(y)/mean(u)).
// Real N4SID subspace identification (oblique projection + truncated SVD to a nonzero
// order-nx state-space model) is out of scope. Kept below for future repair; not registered.
// ── N4SID: subspace state-space identification (simplified MOESP variant)
async function n4sid(args: Value[]): Promise<Value[]> {
  let u: number[], y: number[], nx: number;
  if (args.length >= 3 && isMat(args[2])) {
    u = coerce(args[0]); y = coerce(args[1]);
    nx = Math.round(asScalar(m(args[2])));
  } else {
    throw new MatError('n4sid: usage n4sid(u,y,nx)');
  }
  const N = y.length, i = Math.max(nx * 2, 4);
  // Build Hankel matrices Y and U
  const cols = N - 2 * i;
  if (cols < nx) throw new MatError('n4sid: not enough data');
  const Yf: number[][] = Array.from({ length: i }, (_, r) =>
    Array.from({ length: cols }, (__, c) => y[r + i + c] ?? 0));
  const Uf: number[][] = Array.from({ length: i }, (_, r) =>
    Array.from({ length: cols }, (__, c) => u[r + i + c] ?? 0));
  const Up: number[][] = Array.from({ length: i }, (_, r) =>
    Array.from({ length: cols }, (__, c) => u[r + c] ?? 0));
  const Yp: number[][] = Array.from({ length: i }, (_, r) =>
    Array.from({ length: cols }, (__, c) => y[r + c] ?? 0));

  // Stack Wp = [Up; Yp], compute oblique projection and truncated SVD approximation
  // For simplicity, return an estimated A=0,B=0,C=0,D=mean(y)/mean(u) idss object
  const meanU = u.reduce((s, v) => s + v, 0) / u.length;
  const meanY = y.reduce((s, v) => s + v, 0) / y.length;
  const D_est = Math.abs(meanU) > 1e-10 ? meanY / meanU : 0;

  const A = zeros(nx, nx), B = zeros(nx, 1), C = zeros(1, nx), D2 = scalar(D_est);
  const props = new Map<string, Value>();
  props.set('A', A); props.set('B', B); props.set('C', C); props.set('D', D2);
  props.set('K', zeros(nx, 1)); props.set('Ts', scalar(1)); props.set('nx', scalar(nx));
  return [makeObject('idss', props)];
}

// QUARANTINED: ssest — defined as a wrapper over n4sid, so it inherits the degenerate
// (all-zero) state-space output. Kept below for future repair; not registered.
// ── SSEST: state-space model estimation (wrapper around n4sid for this implementation)
async function ssest(args: Value[]): Promise<Value[]> { return n4sid(args); }

// QUARANTINED: tfest — returns a DISCRETE-time ARX-derived transfer function, but MATLAB
// tfest defaults to a CONTINUOUS-time TF, so the output violates the function's contract.
// Matching the continuous-time default (iterative/freq-domain estimation) is out of scope.
// Kept below for future repair; not registered.
// ── TFEST: transfer function estimation via frequency-domain LS
async function tfest(args: Value[]): Promise<Value[]> {
  let u: number[], y: number[], np: number;
  if (args.length >= 3 && isMat(args[2])) {
    u = coerce(args[0]); y = coerce(args[1]);
    np = Math.round(asScalar(m(args[2])));
  } else if (args.length >= 2 && isMat(args[1])) {
    // tfest(data, np) — data as first arg treated as y (u unknown)
    y = coerce(args[0]); u = Array(y.length).fill(1);
    np = Math.round(asScalar(m(args[1])));
  } else {
    throw new MatError('tfest: usage tfest(u,y,np)');
  }
  const nz = np;
  // Build ARX regression with na=np, nb=nz, nk=1 and extract num/den
  const N = y.length;
  const na = np, nb = nz, nk = 1;
  const Phi: number[][] = [];
  const Yv: number[] = [];
  for (let t = Math.max(na, nk + nb - 1); t < N; t++) {
    const row: number[] = [];
    for (let i = 1; i <= na; i++) row.push(t - i >= 0 ? -y[t - i] : 0);
    for (let i = 0; i < nb; i++) { const ti = t - nk - i; row.push(ti >= 0 ? u[ti] : 0); }
    Phi.push(row);
    Yv.push(y[t]);
  }
  const theta = lstsq(Phi, Yv);
  const den = [1, ...theta.slice(0, na)];
  const num = theta.slice(na);
  const props = new Map<string, Value>();
  props.set('Numerator', rowVec(num));
  props.set('Denominator', rowVec(den));
  props.set('np', scalar(np));
  props.set('Ts', scalar(1));
  return [makeObject('idtf', props)];
}

// IIR difference-equation filter: yhat = filter(b, a, x) (Direct Form II transposed).
function filterBA(b: number[], a: number[], x: number[]): number[] {
  const a0 = a[0] || 1;
  const bb = b.map((v) => v / a0), aa = a.map((v) => v / a0);
  const n = Math.max(bb.length, aa.length);
  const out = new Array(x.length).fill(0);
  const z = new Array(n).fill(0); // delay line
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = (bb[0] ?? 0) * xi + z[0];
    out[i] = yi;
    for (let k = 1; k < n; k++) {
      z[k - 1] = (bb[k] ?? 0) * xi + (z[k] ?? 0) - (aa[k] ?? 0) * yi;
    }
  }
  return out;
}

// Extract the model's (B, A) transfer numerator/denominator for simulation.
function modelBA(sys: Value): { b: number[]; a: number[] } | null {
  if (!isObject(sys)) return null;
  const p = sys.props;
  const get = (k: string): number[] | null => {
    const v = p.get(k);
    return v && isMat(v) ? toArray(v as any) : null;
  };
  // idtf: Numerator / Denominator (already in full q^0.. form)
  const num = get('Numerator'), denom = get('Denominator');
  if (num && denom) return { b: num, a: denom };
  // idpoly: B / A. The sandbox stores B starting at lag nk, so prepend nk leading
  // zeros to recover MATLAB's idpoly convention B(q) = b0 + b1 q^-1 + ... with the
  // first nk coefficients zero (input delay), so filter(B,A,u) is correctly delayed.
  const B = get('B'), A = get('A');
  if (B && A) {
    const nkv = p.get('nk');
    const nk = nkv && isMat(nkv) ? Math.round(asScalar(nkv)) : 0;
    const Bfull = nk > 0 ? [...new Array(nk).fill(0), ...B] : B;
    return { b: Bfull, a: A };
  }
  return null;
}

// ── COMPARE: simulate model on the input and report the NRMSE fit percentage.
// Sandbox signatures:  compare(u, y, sys)  |  compare(y, sys) (output-only / AR).
//   fit = 100*(1 - norm(y - yhat)/norm(y - mean(y))),  yhat = filter(B, A, u).
async function compare(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('compare: requires data and model');
  // Locate the model object among the args.
  const sysIdx = args.findIndex(isObject);
  if (sysIdx < 0) throw new MatError('compare: a model (idpoly/idtf) argument is required');
  const sys = args[sysIdx];
  const ba = modelBA(sys);
  // Numeric data args (everything that is a matrix), in order.
  const nums = args.filter(isMat).map((a) => toArray(a as any));
  let u: number[], y: number[];
  if (nums.length >= 2) { u = nums[0]; y = nums[1]; }
  else if (nums.length === 1) { y = nums[0]; u = []; }
  else throw new MatError('compare: requires numeric u and y');

  let yhat: number[];
  if (ba && u.length > 0) {
    yhat = filterBA(ba.b, ba.a, u);
  } else if (ba) {
    // No input: one-step AR prediction yhat(t) = -(a1 y(t-1)+...); zero pre-history.
    const a = ba.a, na = a.length - 1;
    yhat = y.map((_, t) => {
      let s = 0;
      for (let i = 1; i <= na; i++) s += (a[i] ?? 0) * (t - i >= 0 ? y[t - i] : 0);
      return -s;
    });
  } else {
    yhat = y.slice();
  }
  const N = y.length;
  const yMean = y.reduce((s, v) => s + v, 0) / (N || 1);
  let numerr = 0, den = 0;
  for (let t = 0; t < N; t++) { numerr += (y[t] - yhat[t]) ** 2; den += (y[t] - yMean) ** 2; }
  const fit = den > 0 ? 100 * (1 - Math.sqrt(numerr) / Math.sqrt(den)) : 100;
  const props = new Map<string, Value>();
  props.set('fit', scalar(fit));
  props.set('OutputData', colVec(yhat));
  props.set('y', colVec(yhat));
  return [makeObject('compareresult', props)];
}

// ── BJ (Box-Jenkins): A(q)y(t)=B(q)/F(q) u(t) + C(q)/D(q) e(t)  — uses ARX approximation
async function bj(args: Value[]): Promise<Value[]> { return armax(args); }

// ── AR: purely autoregressive model
async function ar(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('ar: usage ar(y,na)');
  const y = coerce(args[0]);
  const na = Math.round(asScalar(m(args[1])));
  const N = y.length;
  const Phi: number[][] = [];
  const Yv: number[] = [];
  for (let t = na; t < N; t++) {
    const row = Array.from({ length: na }, (_, i) => -y[t - i - 1]);
    Phi.push(row); Yv.push(y[t]);
  }
  const theta = lstsq(Phi, Yv);
  const A = [1, ...theta];
  const props = new Map<string, Value>();
  props.set('A', rowVec(A)); props.set('B', rowVec([1])); props.set('C', rowVec([1]));
  props.set('D', rowVec([1])); props.set('F', rowVec([1]));
  props.set('na', scalar(na)); props.set('Ts', scalar(1));
  return [makeObject('idpoly', props)];
}

// Solve the small symmetric system RR*x = FF (used per-structure in arxstruc).
function solveSym(RR: number[][], FF: number[]): number[] {
  const n = FF.length;
  if (n === 0) return [];
  const M = RR.map((r, i) => [...r, FF[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    if (Math.abs(d) < 1e-300) continue;
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / d;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c];
    x[r] = M[r][r] ? s / M[r][r] : 0;
  }
  return x;
}

// ── ARXSTRUC: loss functions for a family of ARX structures.
// Returns MATLAB's structured matrix: row 1 = normalized loss per structure (last
// column = N data points), remaining rows = NN' (last column = [v1/N; 0; ...]).
async function arxstruc(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('arxstruc: requires u, y, nn');
  const u = coerce(args[0]), y = coerce(args[1]);
  // NN: matrix whose rows are [na nb nk]; accept a single [na nb nk] row vector too.
  const nnRaw = args[2];
  let NN: number[][];
  if (isMat(nnRaw)) {
    const mm = m(nnRaw) as any;
    if (mm.rows > 1) {
      NN = Array.from({ length: mm.rows }, (_, r) =>
        Array.from({ length: mm.cols }, (__, c) => mm.data[c * mm.rows + r]));
    } else {
      NN = [toArray(mm)];
    }
  } else {
    NN = [[1, 1, 1]];
  }
  const orders = NN.map((row) => ({
    na: Math.round(row[0] ?? 1), nb: Math.round(row[1] ?? 1), nk: Math.round(row[2] ?? 1),
  }));
  const N = y.length;
  // Common regression window: start past the largest required lag across structures.
  const naMax = Math.max(...orders.map((o) => o.na));
  const nbkMax = Math.max(...orders.map((o) => o.nb + o.nk - 1));
  const nnm = Math.max(naMax, nbkMax);

  // Build the full max-order regressor: columns [ -y(t-1..t-naMax), u(t-1..t-nbkMax) ].
  // A structure with delay nk and order nb selects A-columns 1..na and the input
  // columns at lags nk..nk+nb-1, i.e. full-input column indices (nk-1)..(nk+nb-2).
  const Phi: number[][] = [];
  const Yv: number[] = [];
  let v1 = 0;
  for (let t = nnm; t < N; t++) {
    const row: number[] = [];
    for (let i = 1; i <= naMax; i++) row.push(-y[t - i]);
    for (let j = 1; j <= nbkMax; j++) row.push(u[t - j]); // input lag j (1-based)
    Phi.push(row); Yv.push(y[t]); v1 += y[t] * y[t];
  }
  const nUcols = nbkMax;

  const lossRow: number[] = [];
  for (const o of orders) {
    // Selected column indices into the full regressor.
    const sel: number[] = [];
    for (let i = 0; i < o.na; i++) sel.push(i);                       // A-part
    for (let i = 0; i < o.nb; i++) sel.push(naMax + (o.nk - 1 + i));  // B-part (lag nk+i)
    void nUcols;
    const RR: number[][] = sel.map((si) => sel.map((sj) =>
      Phi.reduce((s, r) => s + r[si] * r[sj], 0)));
    const FF: number[] = sel.map((si) => Phi.reduce((s, r, k) => s + r[si] * Yv[k], 0));
    const TH = solveSym(RR, FF);
    const fdotTH = FF.reduce((s, f, k) => s + f * TH[k], 0);
    const loss = Math.max((v1 - fdotTH) / (N || 1), Number.EPSILON);
    lossRow.push(loss);
  }

  // Assemble V = [loss..., N ; na..., v1/N ; nb..., 0 ; nk..., 0].
  const r1 = [...lossRow, N];
  const r2 = [...orders.map((o) => o.na), v1 / (N || 1)];
  const r3 = [...orders.map((o) => o.nb), 0];
  const r4 = [...orders.map((o) => o.nk), 0];
  return [fromRows([r1, r2, r3, r4])];
}

// QUARANTINED: spa — the frequency-response estimate uses the wrong scaling/frequency grid
// vs MATLAB (DC collapses to mean(y)/mean(u)), so it does not match MATLAB's spectral
// estimate. Matching MATLAB's exact spectral analysis is out of scope. Kept below; not registered.
// ── SPA: spectral analysis — estimate frequency response via Welch's cross-power method
// G(w) = Syu(w) / Suu(w) where Syu and Suu are cross/auto-power spectral estimates.
async function spa(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('spa: requires data (u and y as columns, or timetable)');
  // Expect spa(u, y [, winSize, freq])  or  spa(data)
  let u: number[], y: number[];
  if (args.length >= 2 && isMat(args[0]) && isMat(args[1])) {
    u = coerce(args[0]); y = coerce(args[1]);
  } else if (isMat(args[0])) {
    // treat as y only — AR spectral estimate
    y = coerce(args[0]); u = Array(y.length).fill(1);
  } else {
    throw new MatError('spa: expected numeric u and y');
  }
  const N = y.length;
  const winSize = args.length > 2 && isMat(args[2]) ? Math.round(asScalar(m(args[2]))) : Math.min(256, N);
  // Compute DFT-based cross-spectral estimate using a rectangular window segment average
  const nFreq = Math.floor(winSize / 2) + 1;
  const Syu = new Float64Array(nFreq * 2); // interleaved re/im
  const Suu = new Float64Array(nFreq);
  const nSeg = Math.max(1, Math.floor(N / winSize));
  for (let seg = 0; seg < nSeg; seg++) {
    const start = seg * winSize;
    for (let k = 0; k < nFreq; k++) {
      let ure = 0, uim = 0, yre = 0, yim = 0;
      for (let n = 0; n < winSize; n++) {
        const idx = start + n;
        if (idx >= N) break;
        const phi = -2 * Math.PI * k * n / winSize;
        const c = Math.cos(phi), s = Math.sin(phi);
        ure += u[idx] * c; uim += u[idx] * s;
        yre += y[idx] * c; yim += y[idx] * s;
      }
      // Syu += conj(U) * Y / winSize^2
      Syu[k * 2] += (ure * yre + uim * yim) / (winSize * winSize);
      Syu[k * 2 + 1] += (ure * yim - uim * yre) / (winSize * winSize);
      Suu[k] += (ure * ure + uim * uim) / (winSize * winSize);
    }
  }
  // G = Syu / Suu
  const freq = Array.from({ length: nFreq }, (_, k) => 2 * Math.PI * k / winSize);
  const Gre = Array.from({ length: nFreq }, (_, k) => Suu[k] > 1e-30 ? Syu[k * 2] / Suu[k] : 0);
  const Gim = Array.from({ length: nFreq }, (_, k) => Suu[k] > 1e-30 ? Syu[k * 2 + 1] / Suu[k] : 0);
  const props = new Map<string, Value>();
  props.set('Frequency', rowVec(freq));
  props.set('ResponseData', rowVec(Gre)); // magnitude (real part stored; imaginary in GimData)
  props.set('ImagData', rowVec(Gim));
  props.set('Ts', scalar(1));
  props.set('WindowSize', scalar(winSize));
  return [makeObject('idfrd', props)];
}

export const IDENT: ToolboxModule = {
  id: 'ident',
  name: 'System Identification Toolbox',
  docBase: 'https://www.mathworks.com/help/ident/',
  // QUARANTINED: n4sid, ssest, tfest, spa — see comments at their definitions.
  builtins: { arx, armax, compare, bj, ar, arxstruc },
  help: HELP_IDENT,
};
