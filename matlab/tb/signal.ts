// Signal Processing Toolbox — computable subset: window functions, dB conversions, and a few
// filters/generators. Window math validated against Octave core (hamming/hanning/blackman/
// bartlett/sinc) and closed-form definitions. See plan §7 and tb/signal.VALIDATION.md.
import type { Builtin } from '../builtins';
import {
  type Value, type Mat, type Cell, isMat, isStr, isCell, scalar, colVec, rowVec, toArray, map, zeros, mat,
  asString, asScalar, toMat as m, applyClass,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_SIGNAL } from '../help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);
/** Reduce a vector to a scalar, or a matrix column-wise to a row vector (MATLAB dim convention). */
function reduceCols(M: Mat, f: (x: number[]) => number): Value {
  if (M.rows === 1 || M.cols === 1) return scalar(f(toArray(M)));
  const out: number[] = [];
  for (let c = 0; c < M.cols; c++) { const col: number[] = []; for (let r = 0; r < M.rows; r++) col.push(M.data[r + c * M.rows]); out.push(f(col)); }
  return rowVec(out);
}
// ── pulse-metric engine (shared/measure): histogram state levels + mid-reference crossings ──
/** Two-state levels by histogram mode method (signal.internal.getLevelsByHistogram). */
function stateLevelsOf(x: number[]): [number, number] {
  if (x.length === 0) throw new Error('signal must be a nonempty vector');   // empty ⇒ Math.min/max give ±Infinity
  const nbins = 100, ymin = Math.min(...x), ymax = Math.max(...x), dy = (ymax - ymin) / nbins;
  if (!(dy > 0)) return [ymin, ymax];
  const hist = new Array(nbins).fill(0);
  for (const xi of x) { let b = Math.floor((xi - ymin) / dy); if (b < 0) b = 0; if (b >= nbins) b = nbins - 1; hist[b]++; }
  let iLow = hist.findIndex((h) => h > 0), iHigh = nbins - 1; while (iHigh >= 0 && hist[iHigh] === 0) iHigh--;
  if (iLow < 0) return [NaN, NaN];
  const iLow1 = iLow + 1, iHigh1 = iHigh + 1;                       // MATLAB 1-indexed bins
  const lLow = iLow1, lHigh = iLow1 + Math.floor((iHigh1 - iLow1) / 2), uLow = lHigh, uHigh = iHigh1;
  let iMax = 1, mx = -1; for (let i = lLow; i <= lHigh; i++) if (hist[i - 1] > mx) { mx = hist[i - 1]; iMax = i - lLow + 1; }
  let iMin = 1, mn = -1; for (let i = uLow; i <= uHigh; i++) if (hist[i - 1] > mn) { mn = hist[i - 1]; iMin = i - uLow + 1; }
  return [ymin + dy * (lLow + iMax - 1.5), ymin + dy * (uLow + iMin - 1.5)];
}
/** Mid-reference crossings with linear interpolation (signal.internal.getMidCross). */
function midCrossings(x: number[], t: number[]): { tm: number[]; pol: number[] } {
  const [L, U] = stateLevelsOf(x), amp = (U - L) / 100, lwr = L + 2 * amp, upr = L + 98 * amp, midRef = L + 50 * amp;
  const iState: number[] = []; for (let i = 0; i < x.length; i++) if (x[i] < lwr || x[i] > upr) iState.push(i);
  const tm: number[] = [], pol: number[] = [];
  for (let k = 0; k + 1 < iState.length; k++) {
    const iA = iState[k], iB = iState[k + 1];
    if (!((x[iA] < lwr && x[iB] > upr) || (x[iA] > upr && x[iB] < lwr))) continue;
    const p = x[iA] < lwr ? 1 : -1; let iX = -1;
    for (let i = iA; i < iB; i++) if (p > 0 ? (x[i] <= midRef && midRef < x[i + 1]) : (x[i] >= midRef && midRef > x[i + 1])) { iX = i; break; }
    if (iX < 0) continue;
    tm.push(t[iX] + (t[iX + 1] - t[iX]) * (midRef - x[iX]) / (x[iX + 1] - x[iX])); pol.push(p);
  }
  return { tm, pol };
}
/** Per-transition rise/fall metrics (signal.internal.getTransitions): 10%/90% reference crossings. */
function transitions(x: number[], t: number[]): { p: number; dur: number; slew: number }[] {
  const [L, U] = stateLevelsOf(x), amp = (U - L) / 100;
  const lwr = L + 2 * amp, upr = L + 98 * amp, loRef = L + 10 * amp, upRef = L + 90 * amp, mid = L + 50 * amp;
  const iState: number[] = []; for (let i = 0; i < x.length; i++) if (x[i] < lwr || x[i] > upr) iState.push(i);
  const out: { p: number; dur: number; slew: number }[] = [];
  for (let k = 0; k + 1 < iState.length; k++) {
    const iA = iState[k], iB = iState[k + 1];
    if (!((x[iA] < lwr && x[iB] > upr) || (x[iA] > upr && x[iB] < lwr))) continue;
    const p = x[iA] < lwr ? 1 : -1, preRef = p > 0 ? loRef : upRef, postRef = p > 0 ? upRef : loRef;
    let iRMid = -1; for (let i = iA; i < iB; i++) if (p > 0 ? (x[i] <= mid && mid < x[i + 1]) : (x[i] >= mid && mid > x[i + 1])) { iRMid = i; break; }
    if (iRMid < 0) continue;
    let iRPre = -1; for (let i = iA; i <= iRMid; i++) if (p > 0 ? x[i] < preRef : x[i] > preRef) iRPre = i;
    let iRPost = -1; for (let i = iRMid; i < iB; i++) if (p > 0 ? x[i + 1] > postRef : x[i + 1] < postRef) { iRPost = i; break; }
    if (iRPre < 0 || iRPost < 0 || iRPre + 1 >= x.length || iRPost + 1 >= x.length) continue;
    const tPre = t[iRPre] + (t[iRPre + 1] - t[iRPre]) * (preRef - x[iRPre]) / (x[iRPre + 1] - x[iRPre]);
    const tPost = t[iRPost] + (t[iRPost + 1] - t[iRPost]) * (postRef - x[iRPost]) / (x[iRPost + 1] - x[iRPost]);
    const dur = tPost - tPre; out.push({ p, dur, slew: (postRef - preRef) / dur });
  }
  return out;
}
/** Post-transition over/undershoot (signal.internal.getPostshoots): peak/dip in a 3·Duration seek
 *  window after each transition, as % of amplitude relative to the post-transition state level. */
function postShoots(x: number[], t: number[]): { os: number; us: number }[] {
  const [L, U] = stateLevelsOf(x), amp = U - L, a = (U - L) / 100;
  const lwr = L + 2 * a, upr = L + 98 * a, loRef = L + 10 * a, upRef = L + 90 * a, mid = L + 50 * a;
  const iState: number[] = []; for (let i = 0; i < x.length; i++) if (x[i] < lwr || x[i] > upr) iState.push(i);
  const trans: { p: number; iPost: number; tPost: number; dur: number; iA: number }[] = [];
  for (let k = 0; k + 1 < iState.length; k++) {
    const iA = iState[k], iB = iState[k + 1];
    if (!((x[iA] < lwr && x[iB] > upr) || (x[iA] > upr && x[iB] < lwr))) continue;
    const p = x[iA] < lwr ? 1 : -1, preRef = p > 0 ? loRef : upRef, postRef = p > 0 ? upRef : loRef;
    let iRMid = -1; for (let i = iA; i < iB; i++) if (p > 0 ? (x[i] <= mid && mid < x[i + 1]) : (x[i] >= mid && mid > x[i + 1])) { iRMid = i; break; }
    if (iRMid < 0) continue;
    let iRPre = -1; for (let i = iA; i <= iRMid; i++) if (p > 0 ? x[i] < preRef : x[i] > preRef) iRPre = i;
    let iRPost = -1; for (let i = iRMid; i < iB; i++) if (p > 0 ? x[i + 1] > postRef : x[i + 1] < postRef) { iRPost = i; break; }
    if (iRPre < 0 || iRPost < 0) continue;
    const tPre = t[iRPre] + (t[iRPre + 1] - t[iRPre]) * (preRef - x[iRPre]) / (x[iRPre + 1] - x[iRPre]);
    const tPost90 = t[iRPost] + (t[iRPost + 1] - t[iRPost]) * (postRef - x[iRPost]) / (x[iRPost + 1] - x[iRPost]);
    const postBound = p > 0 ? upr : lwr;                          // seek starts at the 98% state-bound entry (iB)
    const tPostB = t[iB - 1] + (t[iB] - t[iB - 1]) * (postBound - x[iB - 1]) / (x[iB] - x[iB - 1]);
    trans.push({ p, iPost: iB, tPost: tPostB, dur: tPost90 - tPre, iA });
  }
  const out: { os: number; us: number }[] = [];
  for (let i = 0; i < trans.length; i++) {
    const tr = trans[i], tSeek = tr.tPost + 3 * tr.dur;
    let iStop = x.length - 1; for (let j = tr.iPost; j < x.length; j++) if (t[j] > tSeek) { iStop = j; break; }
    if (i + 1 < trans.length && iStop > trans[i + 1].iA) iStop = trans[i + 1].iA;
    if (iStop > tr.iPost) iStop -= 1;
    let above = -Infinity, below = Infinity;
    for (let j = tr.iPost; j <= iStop; j++) { if (x[j] > above) above = x[j]; if (x[j] < below) below = x[j]; }
    const postState = tr.p > 0 ? U : L;
    out.push({ os: (above - postState) / amp * 100, us: (postState - below) / amp * 100 });
  }
  return out;
}
/** Settling time per transition (signal.internal.getSettling): time from the 50% crossing until
 *  the signal last exits the ±Tolerance·amplitude band around the final state, within seek dur d. */
function settling(x: number[], t: number[], d: number, tol = 2): number[] {
  const [L, U] = stateLevelsOf(x), amp = U - L, band = amp * tol / 100, a = (U - L) / 100;
  const lwr = L + 2 * a, upr = L + 98 * a, mid = L + 50 * a;
  const iState: number[] = []; for (let i = 0; i < x.length; i++) if (x[i] < lwr || x[i] > upr) iState.push(i);
  const trans: { p: number; iA: number; iB: number; tMid: number }[] = [];
  for (let k = 0; k + 1 < iState.length; k++) {
    const iA = iState[k], iB = iState[k + 1];
    if (!((x[iA] < lwr && x[iB] > upr) || (x[iA] > upr && x[iB] < lwr))) continue;
    const p = x[iA] < lwr ? 1 : -1;
    let iRMid = -1; for (let i = iA; i < iB; i++) if (p > 0 ? (x[i] <= mid && mid < x[i + 1]) : (x[i] >= mid && mid > x[i + 1])) { iRMid = i; break; }
    if (iRMid < 0) continue;
    trans.push({ p, iA, iB, tMid: t[iRMid] + (t[iRMid + 1] - t[iRMid]) * (mid - x[iRMid]) / (x[iRMid + 1] - x[iRMid]) });
  }
  const out: number[] = [];
  for (let ti = 0; ti < trans.length; ti++) {
    const tr = trans[ti], postRef = tr.p > 0 ? U : L, tFinal = tr.tMid + d;
    let iStop = -1; for (let j = tr.iB; j < x.length; j++) if (t[j] > tFinal) { iStop = j; break; }
    if (iStop < 0 || (ti + 1 < trans.length && iStop > trans[ti + 1].iA) || tFinal < t[tr.iB]) { out.push(NaN); continue; }
    let iLast = -1; for (let i = tr.iA; i <= iStop; i++) if (Math.abs(x[i] - postRef) > band) iLast = i;
    if (iLast < 0 || iLast === iStop || iLast + 1 >= x.length) { out.push(NaN); continue; }
    const intercept = Math.sign(x[iLast] - postRef) * band, yp = x[iLast] - postRef, yq = x[iLast + 1] - postRef;
    out.push(t[iLast] + (t[iLast + 1] - t[iLast]) * (intercept - yp) / (yq - yp) - tr.tMid);
  }
  return out;
}
// ── spectral-measure engine (signal.internal.specfreqwidth + nfft=N periodogram) ──
/** Frequency-bin widths (signal.internal.specfreqwidth): uniform one-sided grid → all df. */
function specWidth(F: number[]): number[] {
  const N = F.length, d: number[] = []; for (let i = 1; i < N; i++) d.push(F[i] - F[i - 1]);
  const mw = (F[N - 1] - F[0]) / (N - 1); return F[0] === 0 ? [...d, mw] : [mw, ...d];
}
/** Windowed one-sided periodogram with nfft = N (the measure functions' convention). */
function psdWin(x: number[], w: number[], fs?: number): { Pxx: number[]; f: number[] } {
  const N = x.length, nfft = N, half = Math.floor(nfft / 2), Fs = fs ?? 2 * Math.PI;
  const sw2 = w.reduce((s, v) => s + v * v, 0), Pxx: number[] = [], f: number[] = [];
  for (let k = 0; k <= half; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) { const ang = -2 * Math.PI * k * n / nfft, xw = x[n] * w[n]; re += xw * Math.cos(ang); im += xw * Math.sin(ang); }
    let p = (re * re + im * im) / (Fs * sw2); if (k > 0 && (k < half || nfft % 2 !== 0)) p *= 2; // odd nfft has no Nyquist bin → double the top bin too
    Pxx.push(p); f.push(fs ? k * fs / nfft : k * 2 * Math.PI / nfft);
  }
  return { Pxx, f };
}
const hammingWin = (N: number): number[] => (N === 1 ? [1] : Array.from({ length: N }, (_, n) => 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1))));
/** Natural-order Walsh-Hadamard transform (unnormalized, in-place butterfly). */
function whtNat(v: number[]): number[] {
  const N = v.length, a = v.slice();
  for (let len = 1; len < N; len <<= 1) for (let i = 0; i < N; i += len << 1) for (let j = i; j < i + len; j++) { const x = a[j], y = a[j + len]; a[j] = x + y; a[j + len] = x - y; }
  return a;
}
const bitrev = (x: number, L: number): number => { let r = 0; for (let i = 0; i < L; i++) { r = (r << 1) | (x & 1); x >>= 1; } return r; };
const nextPow2Pad = (x: number[]): number[] => { const N2 = 2 ** Math.ceil(Math.log2(Math.max(1, x.length))); const o = x.slice(); while (o.length < N2) o.push(0); return o; };
// ── short-time Fourier transform helpers (stft / istft / spectrogram) ──
/** Length-N DFT of a complex column (re,im) — Σ x[n]·e^{-2πj kn/N}, k=0..N-1. Naive O(N²); N small. */
function dftCol(re: number[], im: number[], N: number): { re: number[]; im: number[] } {
  // datawrap when the segment is longer than N (computeDFT wraps to nfft)
  let xr = re, xi = im;
  if (re.length > N) { xr = new Array(N).fill(0); xi = new Array(N).fill(0); for (let n = 0; n < re.length; n++) { xr[n % N] += re[n]; xi[n % N] += im[n]; } }
  else if (re.length < N) { xr = re.concat(new Array(N - re.length).fill(0)); xi = im.concat(new Array(N - im.length).fill(0)); }
  const or: number[] = new Array(N), oi: number[] = new Array(N);
  for (let k = 0; k < N; k++) { let sr = 0, si = 0; for (let n = 0; n < N; n++) { const ang = -2 * Math.PI * k * n / N, c = Math.cos(ang), s = Math.sin(ang); sr += xr[n] * c - xi[n] * s; si += xr[n] * s + xi[n] * c; } or[k] = sr; oi[k] = si; }
  return { re: or, im: oi };
}
/** Length-N inverse DFT — (1/N)·Σ X[k]·e^{+2πj kn/N}. */
function idftCol(re: number[], im: number[], N: number): { re: number[]; im: number[] } {
  const or: number[] = new Array(N), oi: number[] = new Array(N);
  for (let n = 0; n < N; n++) { let sr = 0, si = 0; for (let k = 0; k < N; k++) { const ang = 2 * Math.PI * k * n / N, c = Math.cos(ang), s = Math.sin(ang); sr += re[k] * c - im[k] * s; si += re[k] * s + im[k] * c; } or[n] = sr / N; oi[n] = si / N; }
  return { re: or, im: oi };
}
/** psdfreqvec: full two-sided frequency vector of length nfft over [0, Fs). */
function psdfreqvecFull(nfft: number, Fs: number): number[] { const f: number[] = []; for (let k = 0; k < nfft; k++) f.push(k * Fs / nfft); return f; }
/** centerfreq: shift frequency vector so DC is centered. */
function centerFreqVec(f: number[], _Fs: number): number[] { const n = f.length, ref = n % 2 === 0 ? f[n / 2 - 1] : f[(n - 1) / 2]; return f.map((v) => v - ref); }
/** centerest column index permutation: circshift (even) / fftshift (odd). Returns new→old index map. */
function centerPerm(n: number): number[] {
  const idx: number[] = [];
  if (n % 2 === 0) { const sh = n / 2 - 1; for (let i = 0; i < n; i++) idx.push(((i - sh) % n + n) % n); }   // circshift down by sh
  else { const half = (n + 1) / 2; for (let i = 0; i < n; i++) idx.push((i + half) % n); }                    // fftshift
  return idx;
}
/** Build a complex Mat (rows×cols) column-major from per-column [re,im] arrays. */
function complexMat(cols: { re: number[]; im: number[] }[], rows: number): Mat {
  const data = new Float64Array(rows * cols.length), idata = new Float64Array(rows * cols.length);
  let any = false;
  for (let c = 0; c < cols.length; c++) for (let r = 0; r < rows; r++) { data[r + c * rows] = cols[c].re[r]; const iv = cols[c].im[r]; idata[r + c * rows] = iv; if (iv !== 0) any = true; }
  const out = mat(rows, Math.max(0, cols.length), data); if (any) out.idata = idata; return out;
}
/** Resolve the time base: t-vector, scalar Fs, or default sample numbers 1..n. */
function timeBase(a: Value[], n: number): number[] {
  if (a.length > 1 && isMat(a[1])) { const M = m(a[1]); if (M.rows * M.cols === 1) { const Fs = asScalar(a[1]); return Array.from({ length: n }, (_, i) => i / Fs); } return toArray(M); }
  return Array.from({ length: n }, (_, i) => i + 1);
}
/** Σ bₙ·e^{-jnw} (digital, ascending powers) → [re, im]. */
function cpoly(b: number[], w: number): [number, number] { let re = 0, im = 0; for (let n = 0; n < b.length; n++) { re += b[n] * Math.cos(n * w); im -= b[n] * Math.sin(n * w); } return [re, im]; }
/** Σ c[i]·(jw)^(L-1-i) (analog, descending powers) → [re, im]. */
function cpolyS(c: number[], w: number): [number, number] { let re = 0, im = 0; const L = c.length; for (let i = 0; i < L; i++) { const p = L - 1 - i, mag = c[i] * w ** p; switch (((p % 4) + 4) % 4) { case 0: re += mag; break; case 1: im += mag; break; case 2: re -= mag; break; default: im -= mag; } } return [re, im]; }

// ── LPC helpers (Levinson-Durbin + step-down/step-up) ──
/** Levinson-Durbin: autocorrelation r → AR poly a (a[0]=1), final error e, reflection coeffs k. */
function levinsonDurbin(r: number[], p: number): { a: number[]; e: number; k: number[] } {
  const a = [1]; let e = r[0]; const ks: number[] = [];
  for (let i = 1; i <= p; i++) { let acc = r[i]; for (let j = 1; j < i; j++) acc += a[j] * r[i - j]; const k = -acc / e; ks.push(k); const na = a.slice(); for (let j = 1; j < i; j++) na[j] = a[j] + k * a[i - j]; na[i] = k; a.length = 0; a.push(...na); e *= 1 - k * k; }
  return { a, e, k: ks };
}
/** Step-down recursion: AR poly a → reflection coeffs k[] and the order-i polynomials. */
function stepDown(a: number[]): { k: number[]; polys: number[][] } {
  const p = a.length - 1; let cur = a.slice(); const k = new Array(p); const polys: number[][] = new Array(p + 1); polys[p] = a.slice();
  for (let i = p; i >= 1; i--) { const ki = cur[i]; k[i - 1] = ki; const prev = new Array(i); prev[0] = 1; for (let j = 1; j < i; j++) prev[j] = (cur[j] - ki * cur[i - j]) / (1 - ki * ki); polys[i - 1] = prev; cur = prev; }
  return { k, polys };
}
/** Step-up: reflection coeffs k → AR poly a. */
function stepUp(k: number[]): number[] { let a = [1]; for (let i = 0; i < k.length; i++) { const ki = k[i]; const na = a.slice(); na.push(0); for (let j = 1; j <= i; j++) na[j] = a[j] + ki * a[i + 1 - j]; na[i + 1] = ki; a = na; } return a; }
/** AR poly a + final error → autocorrelation sequence. */
function poly2acSeq(a: number[], eFinal: number): number[] {
  const { k, polys } = stepDown(a); const p = a.length - 1; const e = new Array(p + 1); e[p] = eFinal;
  for (let i = p; i >= 1; i--) e[i - 1] = e[i] / (1 - k[i - 1] * k[i - 1]);
  const r = new Array(p + 1); r[0] = e[0];
  for (let i = 1; i <= p; i++) { let s = 0; const ap = polys[i - 1]; for (let j = 1; j < i; j++) s += ap[j] * r[i - j]; r[i] = -k[i - 1] * e[i - 1] - s; }
  return r;
}
/** Invert a small n×n matrix (Gauss-Jordan). */
function matInv(M: number[][]): number[][] {
  const n = M.length; const A = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) { let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r; [A[c], A[piv]] = [A[piv], A[c]]; const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; } }
  return A.map((row) => row.slice(n));
}
/** Savitzky-Golay projection matrix B (F×F); B[mid] is the smoothing weights. */
function sgolayMat(order: number, F: number): number[][] {
  const mid = (F - 1) / 2; const V: number[][] = []; for (let i = 0; i < F; i++) { V[i] = []; for (let j = 0; j <= order; j++) V[i][j] = (i - mid) ** j; }
  const VtV: number[][] = []; for (let a = 0; a <= order; a++) { VtV[a] = []; for (let b = 0; b <= order; b++) { let s = 0; for (let i = 0; i < F; i++) s += V[i][a] * V[i][b]; VtV[a][b] = s; } }
  const G = matInv(VtV); const B: number[][] = [];
  for (let i = 0; i < F; i++) { B[i] = []; for (let l = 0; l < F; l++) { let s = 0; for (let a = 0; a <= order; a++) for (let b = 0; b <= order; b++) s += V[i][a] * G[a][b] * V[l][b]; B[i][l] = s; } }
  return B;
}

/** Modified Bessel function I0(x) (series), for the Kaiser window. */
function besselI0(x: number): number { let s = 1, t = 1; for (let k = 1; k < 60; k++) { t *= (x / (2 * k)) ** 2; s += t; if (t < s * 1e-16) break; } return s; }

/** Build an r×c real Mat (column-major) from an array of equal-length rows. */
function rowsToMat(rows: number[][]): Mat {
  const r = rows.length, c = r ? rows[0].length : 0, d = new Float64Array(r * c);
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) d[i + j * r] = rows[i][j];
  return mat(r, c, d);
}
// ── Tier-3 module-level helpers (all prefixed t3_ to avoid collisions) ──

/** t3_burgCoeffs: Burg method AR(p) coefficients from signal x. Returns {a, e}.
 *  Based on the lattice formulation: minimize forward+backward prediction error. */
function t3_burgCoeffs(x: number[], p: number): { a: number[]; e: number } {
  const N = x.length;
  let f = x.slice(), b = x.slice();
  let e = x.reduce((s, v) => s + v * v, 0) / N;
  const a: number[] = [1];
  for (let mm = 0; mm < p; mm++) {
    let num = 0, den = 0;
    for (let n = mm + 1; n < N; n++) { num += f[n] * b[n - 1]; den += f[n] * f[n] + b[n - 1] * b[n - 1]; }
    const k = (den > 0) ? -2 * num / den : 0;
    const fNew = new Array(N).fill(0), bNew = new Array(N).fill(0);
    for (let n = mm + 1; n < N; n++) { fNew[n] = f[n] + k * b[n - 1]; bNew[n] = b[n - 1] + k * f[n]; }
    f = fNew; b = bNew;
    const aNew = a.slice(); aNew.push(0);
    for (let j = 1; j <= mm; j++) aNew[j] = a[j] + k * a[mm + 1 - j];
    aNew[mm + 1] = k;
    a.length = 0; a.push(...aNew);
    e *= (1 - k * k);
  }
  return { a, e };
}

/** t3_autocorr: biased autocorrelation r[0..p] of x. */
function t3_autocorr(x: number[], p: number): number[] {
  const N = x.length, r: number[] = [];
  for (let lag = 0; lag <= p; lag++) {
    let s = 0; for (let n = lag; n < N; n++) s += x[n] * x[n - lag];
    r.push(s / N);
  }
  return r;
}

/** t3_arPSD: one-sided AR PSD from AR poly a + noise variance e, nfft points. [Pxx, w] where w in rad. */
function t3_arPSD(a: number[], e: number, nfft: number): { Pxx: number[]; w: number[] } {
  const half = Math.floor(nfft / 2);
  const Pxx: number[] = [], w: number[] = [];
  for (let k2 = 0; k2 <= half; k2++) {
    const wk = k2 * Math.PI / half;
    let re = 0, im = 0;
    for (let i = 0; i < a.length; i++) { re += a[i] * Math.cos(i * wk); im -= a[i] * Math.sin(i * wk); }
    const A2 = re * re + im * im;
    let p = e / Math.max(A2, 1e-300) / (2 * Math.PI);
    if (k2 > 0 && (k2 < half || nfft % 2 !== 0)) p *= 2;
    Pxx.push(p); w.push(wk);
  }
  return { Pxx, w };
}

/** t3_welchCross: Welch cross-spectrum and auto-spectra. Returns {Pxy_re, Pxy_im, Pxx, Pyy, f}. */
function t3_welchCross(xv: number[], yv: number[], wlen: number, noverlap: number, nfft: number, fs: number | null): {
  Pxy_re: number[]; Pxy_im: number[]; Pxx: number[]; Pyy: number[]; f: number[];
} {
  const N = xv.length, step = wlen - noverlap, half = Math.floor(nfft / 2);
  const Fs = fs ?? (2 * Math.PI), ww = hammingWin(wlen);
  const sw2 = ww.reduce((s, v) => s + v * v, 0);
  const Pxy_re = new Array(half + 1).fill(0), Pxy_im = new Array(half + 1).fill(0);
  const Pxx = new Array(half + 1).fill(0), Pyy = new Array(half + 1).fill(0);
  let nseg = 0;
  for (let start = 0; start + wlen <= N; start += step) {
    nseg++;
    const Xr: number[] = [], Xi: number[] = [], Yr: number[] = [], Yi: number[] = [];
    for (let n = 0; n < wlen; n++) { Xr.push(xv[start + n] * ww[n]); Xi.push(0); Yr.push(yv[start + n] * ww[n]); Yi.push(0); }
    const dX = dftCol(Xr, Xi, nfft), dY = dftCol(Yr, Yi, nfft);
    const sc = 1 / (Fs * sw2);
    for (let k2 = 0; k2 <= half; k2++) {
      const xr = dX.re[k2], xi = dX.im[k2], yr = dY.re[k2], yi = dY.im[k2];
      const scaling = (k2 > 0 && k2 < half) ? 2 : 1;
      Pxy_re[k2] += (xr * yr + xi * yi) * sc * scaling;
      Pxy_im[k2] += (xr * yi - xi * yr) * sc * scaling;
      Pxx[k2] += (xr * xr + xi * xi) * sc * scaling;
      Pyy[k2] += (yr * yr + yi * yi) * sc * scaling;
    }
  }
  const n = Math.max(1, nseg);
  const f = Array.from({ length: half + 1 }, (_, k2) => (fs ? k2 * fs / nfft : k2 * 2 * Math.PI / nfft));
  return {
    Pxy_re: Pxy_re.map((v) => v / n), Pxy_im: Pxy_im.map((v) => v / n),
    Pxx: Pxx.map((v) => v / n), Pyy: Pyy.map((v) => v / n), f,
  };
}

/** t3_welchParams: extract Welch segment parameters from a Value[] arg list starting at argStart. */
function t3_welchParams(xv: number[], a: Value[], argStart: number): { wlen: number; noverlap: number; nfft: number; fs: number | null } {
  const has = (i: number) => a.length > i && isMat(a[i]) && m(a[i]).rows * m(a[i]).cols > 0;
  const N = xv.length;
  let wlen: number;
  if (has(argStart) && m(a[argStart]).rows * m(a[argStart]).cols > 1) {
    wlen = toArray(m(a[argStart])).length;
  } else if (has(argStart)) {
    wlen = Math.round(asScalar(a[argStart]));
  } else {
    wlen = Math.max(1, Math.floor(N / 4.5));
  }
  const noverlap = has(argStart + 1) ? Math.round(asScalar(a[argStart + 1])) : Math.floor(wlen / 2);
  const nfft = has(argStart + 2) ? Math.round(asScalar(a[argStart + 2])) : Math.max(256, 2 ** Math.ceil(Math.log2(wlen)));
  const fs = has(argStart + 3) ? asScalar(a[argStart + 3]) : null;
  return { wlen, noverlap, nfft, fs };
}

/** t3_rlevinson: compute rlevinson upper-triangular matrix U for AR poly a (length M, a[0]=1).
 *  U[i][j] = i-th coeff of the (j+1)-th order predictor (1-indexed internally). */
function t3_rlevinson(a: number[]): number[][] {
  const M = a.length;
  const U: number[][] = Array.from({ length: M }, () => new Array(M).fill(0));
  // Last column: fliplr(a)
  for (let i = 0; i < M; i++) U[i][M - 1] = a[M - 1 - i];
  // Step down to lower-order polys
  let cur = a.slice();
  for (let col = M - 2; col >= 0; col--) {
    const p = cur.length - 1;
    const kp = cur[p];
    const prev = new Array(p).fill(0); prev[0] = 1;
    for (let j = 1; j < p; j++) prev[j] = (cur[j] - kp * cur[p - j]) / (1 - kp * kp);
    for (let i = 0; i <= col; i++) U[i][col] = prev[col - i];
    cur = prev;
  }
  return U;
}

/** t3_rcosdesignImpl: rcosdesign algorithm from MATLAB rcosdesign.m. */
function t3_rcosdesignImpl(beta: number, span: number, sps: number, shape: 'normal' | 'sqrt'): number[] {
  const filterOrder = sps * span, delay = filterOrder / 2, N = filterOrder + 1;
  const t2 = Array.from({ length: N }, (_, i) => (i - delay) / sps);
  const b = new Array(N), EPS = Math.sqrt(2.220446049250313e-16);
  const be = beta === 0 ? 1e-300 : beta;
  if (shape === 'normal') {
    const constVal = be * Math.sin(Math.PI / (2 * be)) / (2 * sps);
    for (let i = 0; i < N; i++) {
      const ti = t2[i], denom = 1 - (2 * be * ti) * (2 * be * ti);
      if (Math.abs(denom) > EPS) {
        const sc = ti === 0 ? 1 : Math.sin(Math.PI * ti) / (Math.PI * ti);
        b[i] = sc * Math.cos(Math.PI * be * ti) / denom / sps;
      } else { b[i] = constVal; }
    }
  } else {
    const constVal1 = 1 / (2 * Math.PI * sps) * (
      Math.PI * (be + 1) * Math.sin(Math.PI * (be + 1) / (4 * be))
      - 4 * be * Math.sin(Math.PI * (be - 1) / (4 * be))
      + Math.PI * (be - 1) * Math.cos(Math.PI * (be - 1) / (4 * be))
    );
    for (let i = 0; i < N; i++) {
      const ti = t2[i];
      if (ti === 0) {
        b[i] = -1 / (Math.PI * sps) * (Math.PI * (be - 1) - 4 * be);
      } else if (Math.abs(Math.abs(4 * be * ti) - 1) < EPS) {
        b[i] = constVal1;
      } else {
        b[i] = -4 * be / sps * (Math.cos(Math.PI * (1 + be) * ti) + Math.sin(Math.PI * (1 - be) * ti) / (4 * be * ti))
          / (Math.PI * ((4 * be * ti) * (4 * be * ti) - 1));
      }
    }
  }
  const energy = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return energy > 0 ? b.map((v) => v / energy) : b;
}

/** t3_gaussLS: solve real overdetermined LS: A*x = b via normal equations with Gaussian elimination. */
function t3_gaussLS(A: number[][], rhs: number[]): number[] {
  const nr = A.length, nc = A[0].length;
  // Normal equations: (A'A) x = A'b
  const AtA: number[][] = Array.from({ length: nc }, () => new Array(nc).fill(0));
  const Atb: number[] = new Array(nc).fill(0);
  for (let i = 0; i < nc; i++) {
    for (let j = 0; j < nc; j++) { let s = 0; for (let k2 = 0; k2 < nr; k2++) s += A[k2][i] * A[k2][j]; AtA[i][j] = s; }
    let s = 0; for (let k2 = 0; k2 < nr; k2++) s += A[k2][i] * rhs[k2]; Atb[i] = s;
  }
  // Augmented matrix
  const Aug: number[][] = AtA.map((row, r) => [...row, Atb[r]]);
  for (let col = 0; col < nc; col++) {
    let piv = col; for (let r = col + 1; r < nc; r++) if (Math.abs(Aug[r][col]) > Math.abs(Aug[piv][col])) piv = r;
    [Aug[col], Aug[piv]] = [Aug[piv], Aug[col]];
    const d = Aug[col][col]; if (Math.abs(d) < 1e-300) continue;
    for (let r = 0; r < nc; r++) { if (r === col) continue; const f = Aug[r][col] / d; for (let c = col; c <= nc; c++) Aug[r][c] -= f * Aug[col][c]; }
  }
  return Aug.map((row, i) => row[nc] / row[i]);
}

/** t3_latcFIR: FIR lattice filter — standard FIR lattice (k reflection coefficients). Returns {f, g} = forward and backward outputs. */
function t3_latcFIR(k2: number[], x: number[]): { f: number[]; g: number[] } {
  const N = x.length, M = k2.length;
  const fSt: number[][] = [x.slice()], gSt: number[][] = [x.slice()];
  for (let stage = 0; stage < M; stage++) {
    const km = k2[stage];
    const fn = new Array(N), gn = new Array(N);
    for (let n = 0; n < N; n++) {
      const gPrev = n > 0 ? gSt[stage][n - 1] : 0;
      fn[n] = fSt[stage][n] + km * gPrev;
      gn[n] = km * fSt[stage][n] + gPrev;
    }
    fSt.push(fn); gSt.push(gn);
  }
  return { f: fSt[M], g: gSt[M] };
}

/** t3_latcIIR: IIR lattice-ladder filter: latcfilt(k, v, x) via tf conversion and direct filter. */
function t3_latcIIR(k2: number[], v: number[], x: number[]): number[] {
  // a = rc2poly(k) = stepUp(k); b = U * v
  const a = stepUp(k2);
  const M = a.length;
  const U = t3_rlevinson(a);
  const vp = v.slice(); while (vp.length < M) vp.push(0);
  const b: number[] = new Array(M).fill(0);
  for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) b[i] += U[i][j] * vp[j];
  return filterDf2t(b, a, x).y;
}

/** kaiserBeta(atten): Kaiser β for a stopband attenuation atten (dB) — signal.internal.kaiserBeta. */
function kaiserBeta(atten: number): number {
  return 0.1102 * (atten - 8.7) * (atten > 50 ? 1 : 0)
    + (0.5842 * Math.pow(atten - 21, 0.4) + 0.07886 * (atten - 21)) * (atten >= 21 && atten <= 50 ? 1 : 0);
}
/** kaislpord: FIR lowpass length estimate L and Kaiser β from band edges (normalized) + deviations. */
function kaislpord(freq1: number, freq2: number, delta1: number, delta2: number): { L: number; bta: number } {
  const delta = Math.min(delta1, delta2), atten = -20 * Math.log10(delta);
  const D = (atten - 7.95) / (2 * Math.PI * 2.285), df = Math.abs(freq2 - freq1);
  return { L: D / df + 1, bta: kaiserBeta(atten) };
}

// ── IIR filter design helpers (complex arithmetic on [re,im] pairs) ──
type Cx = [number, number];
const cAdd = (a: Cx, b: Cx): Cx => [a[0] + b[0], a[1] + b[1]];
const cSub = (a: Cx, b: Cx): Cx => [a[0] - b[0], a[1] - b[1]];
const cMul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cDiv = (a: Cx, b: Cx): Cx => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
/** poly(roots) → real(-ish) polynomial coefficients (descending powers), complex-aware. */
function polyFromRoots(roots: Cx[]): Cx[] {
  let c: Cx[] = [[1, 0]];
  for (const r of roots) {
    const nc: Cx[] = c.map((v) => [v[0], v[1]]); nc.push([0, 0]);
    for (let j = 0; j < c.length; j++) { const t = cMul(c[j], r); nc[j + 1] = cSub(nc[j + 1], t); }
    c = nc;
  }
  return c;
}
/** N-th order Butterworth analog lowpass prototype zeros/poles/gain (buttap). */
function buttap(n: number): { z: Cx[]; p: Cx[]; k: number } {
  const p: Cx[] = [];
  for (let i = 1; i <= n - 1; i += 2) { const th = (Math.PI * i) / (2 * n) + Math.PI / 2; p.push([Math.cos(th), Math.sin(th)]); p.push([Math.cos(th), -Math.sin(th)]); }
  if (n % 2) p.push([-1, 0]);
  // k = real(prod(-p))
  let k: Cx = [1, 0]; for (const pi of p) k = cMul(k, [-pi[0], -pi[1]]);
  return { z: [], p, k: k[0] };
}
/** N-th order Chebyshev Type I analog lowpass prototype zeros/poles/gain (cheb1ap), Rp dB ripple. */
function cheb1ap(n: number, rp: number): { z: Cx[]; p: Cx[]; k: number } {
  const epsilon = Math.sqrt(10 ** (0.1 * rp) - 1);
  const mu = Math.asinh(1 / epsilon) / n;
  // raw poles on the unit circle: exp(1i*(pi*(1:2:2n-1)/(2n) + pi/2))
  const raw: Cx[] = [];
  for (let i = 1; i <= 2 * n - 1; i += 2) { const th = (Math.PI * i) / (2 * n) + Math.PI / 2; raw.push([Math.cos(th), Math.sin(th)]); }
  // symmetrize real (mean with flip) and imag (half-difference with flip), like the .m source
  const N = raw.length, sh = Math.sinh(mu), ch = Math.cosh(mu);
  const p: Cx[] = [];
  for (let i = 0; i < N; i++) { const re = (raw[i][0] + raw[N - 1 - i][0]) / 2, im = (raw[i][1] - raw[N - 1 - i][1]) / 2; p.push([sh * re, ch * im]); }
  let k: Cx = [1, 0]; for (const pi of p) k = cMul(k, [-pi[0], -pi[1]]);
  let kr = k[0];
  if (n % 2 === 0) kr = kr / Math.sqrt(1 + epsilon * epsilon);   // even-order gain patch
  return { z: [], p, k: kr };
}
/** N-th order Chebyshev Type II analog lowpass prototype zeros/poles/gain (cheb2ap), Rs dB stopband. */
function cheb2ap(n: number, rs: number): { z: Cx[]; p: Cx[]; k: number } {
  const delta = 1 / Math.sqrt(10 ** (0.1 * rs) - 1);
  const mu = Math.asinh(1 / delta) / n;
  // zeros: cos(theta)*pi/(2n) skipping the imaginary-axis center pair when odd
  const idx: number[] = [];
  if (n % 2) { for (let i = 1; i <= n - 2; i += 2) idx.push(i); for (let i = n + 2; i <= 2 * n - 1; i += 2) idx.push(i); }
  else { for (let i = 1; i <= 2 * n - 1; i += 2) idx.push(i); }
  const mval = n % 2 ? n - 1 : n;
  let zr = idx.map((i) => Math.cos((i * Math.PI) / (2 * n)));        // real, length m
  // z = (z - flipud(z))/2  then  z = 1i./z
  const zsym = zr.map((v, i) => (v - zr[zr.length - 1 - i]) / 2);
  let zc: Cx[] = zsym.map((v): Cx => cDiv([0, 1], [v, 0]));
  // reorder into complex pairs: i = [1:m/2; m:-1:m/2+1]; z = z(i(:))
  const zord: Cx[] = []; const half = mval / 2;
  for (let r = 0; r < half; r++) { zord.push(zc[r]); zord.push(zc[mval - 1 - r]); }
  zc = zord;
  // poles: exp(1i*(pi*(1:2:2n-1)/(2n) + pi/2)); symmetrize; p = 1/p
  const raw: Cx[] = [];
  for (let i = 1; i <= 2 * n - 1; i += 2) { const th = (Math.PI * i) / (2 * n) + Math.PI / 2; raw.push([Math.cos(th), Math.sin(th)]); }
  const N = raw.length, sh = Math.sinh(mu), ch = Math.cosh(mu);
  const p: Cx[] = [];
  for (let i = 0; i < N; i++) { const re = (raw[i][0] + raw[N - 1 - i][0]) / 2, im = (raw[i][1] - raw[N - 1 - i][1]) / 2; p.push(cDiv([1, 0], [sh * re, ch * im])); }
  // k = real(prod(-p)/prod(-z))
  let pp: Cx = [1, 0]; for (const pi of p) pp = cMul(pp, [-pi[0], -pi[1]]);
  let pz: Cx = [1, 0]; for (const zi of zc) pz = cMul(pz, [-zi[0], -zi[1]]);
  const k = cDiv(pp, pz)[0];
  return { z: zc, p, k };
}
// ── elliptic-function helpers (Orfanidis), used by ellipap/ellipord ──
/** Landen vector of descending moduli (landen.m), tol=eps. */
function landen(k: number): number[] {
  const tol = 2.220446049250313e-16; const v: number[] = [];
  if (k === 0 || k === 1) return [k];
  while (k > tol) { k = (k / (1 + Math.sqrt(1 - k * k))) ** 2; v.push(k); }
  return v;
}
/** sn elliptic with normalized complex argument (sne.m). */
function sne(u: Cx, k: number): Cx {
  const v = landen(k); let w: Cx = [Math.sin((u[0] * Math.PI) / 2) * Math.cosh((u[1] * Math.PI) / 2), Math.cos((u[0] * Math.PI) / 2) * Math.sinh((u[1] * Math.PI) / 2)];
  for (let n = v.length - 1; n >= 0; n--) { const num = cMul([1 + v[n], 0], w); const den = cAdd([1, 0], cMul([v[n], 0], cMul(w, w))); w = cDiv(num, den); }
  return w;
}
/** cd elliptic with normalized complex argument (cde.m). */
function cde(u: Cx, k: number): Cx {
  const v = landen(k); let w: Cx = [Math.cos((u[0] * Math.PI) / 2) * Math.cosh((u[1] * Math.PI) / 2), -Math.sin((u[0] * Math.PI) / 2) * Math.sinh((u[1] * Math.PI) / 2)];
  for (let n = v.length - 1; n >= 0; n--) { const num = cMul([1 + v[n], 0], w); const den = cAdd([1, 0], cMul([v[n], 0], cMul(w, w))); w = cDiv(num, den); }
  return w;
}
/** Complete elliptic integral K(k) and K'(k) (ellipk.m). */
function ellipkPair(k: number): [number, number] {
  const kmin = 1e-6, kmax = Math.sqrt(1 - kmin * kmin); let K: number, Kp: number;
  if (k === 1) K = Infinity;
  else if (k > kmax) { const kp = Math.sqrt(1 - k * k), L = -Math.log(kp / 4); K = L + ((L - 1) * kp * kp) / 4; }
  else { const v = landen(k); K = v.reduce((a, b) => a * (1 + b), 1) * (Math.PI / 2); }
  if (k === 0) Kp = Infinity;
  else if (k < kmin) { const L = -Math.log(k / 4); Kp = L + ((L - 1) * k * k) / 4; }
  else { const kp = Math.sqrt(1 - k * k), vp = landen(kp); Kp = vp.reduce((a, b) => a * (1 + b), 1) * (Math.PI / 2); }
  return [K, Kp];
}
/** Solve the degree equation N*K'/K = K1'/K1 for k (ellipdeg.m, k1>=1e-6 branch). */
function ellipdeg(N: number, k1: number): number {
  const L = Math.floor(N / 2); const ui: number[] = []; for (let i = 1; i <= L; i++) ui.push((2 * i - 1) / N);
  const kc = Math.sqrt(1 - k1 * k1);
  let prod = 1; for (const u of ui) prod *= sne([u, 0], kc)[0];
  const kp = kc ** N * prod ** 4;
  return Math.sqrt(1 - kp * kp);
}
/** acos for complex argument. */
function cAcos(w: Cx): Cx {
  // acos(w) = -i * log(w + i*sqrt(1-w^2))
  const one: Cx = [1, 0]; const w2 = cMul(w, w); const s = cSqrtCx(cSub(one, w2));
  const inside = cAdd(w, cMul([0, 1], s)); const lg = cLogCx(inside);
  return cMul([0, -1], lg);
}
function cSqrtCx(z: Cx): Cx { const r = Math.hypot(z[0], z[1]); const re = Math.sqrt((r + z[0]) / 2); let im = Math.sqrt((r - z[0]) / 2); if (z[1] < 0) im = -im; return [re, im]; }
function cLogCx(z: Cx): Cx { return [Math.log(Math.hypot(z[0], z[1])), Math.atan2(z[1], z[0])]; }
function cAsin(w: Cx): Cx { const half: Cx = [Math.PI / 2, 0]; return cSub(half, cAcos(w)); }
/** Inverse cd (acde.m). */
function acde(w: Cx, k: number): Cx {
  const v = landen(k);
  for (let n = 0; n < v.length; n++) {
    const v1 = n === 0 ? k : v[n - 1];
    const w2 = cMul(w, w); const inner = cSub([1, 0], cMul([v1 * v1, 0], w2));
    const denom = cAdd([1, 0], cSqrtCx(inner));
    w = cMul(cDiv(w, denom), [2 / (1 + v[n]), 0]);
  }
  let u = cMul([2 / Math.PI, 0], cAcos(w));
  // srem reduction
  const [K, Kp] = ellipkPair(k); const R = Kp / K;
  const srem = (x: number, y: number): number => { const z = x - Math.round(x / y) * y; return z; };
  return [srem(u[0], 4), srem(u[1], 2 * R)];
}
/** Inverse sn (asne.m): u = 1 - acde(w,k). */
function asne(w: Cx, k: number): Cx { const u = acde(w, k); return [1 - u[0], -u[1]]; }
/** cplxpair-style: sort by real then imag, conj pairs together — emulate MATLAB cplxpair on a conj-closed set. */
function cplxpairSort(arr: Cx[]): Cx[] {
  // group conjugate pairs (neg-imag first), append reals sorted ascending
  const reals = arr.filter((z) => Math.abs(z[1]) < 1e-12 * (1 + Math.abs(z[0]))).map((z): Cx => [z[0], 0]);
  const cplx = arr.filter((z) => Math.abs(z[1]) >= 1e-12 * (1 + Math.abs(z[0])));
  cplx.sort((a, b) => (a[0] - b[0]) || (Math.abs(a[1]) - Math.abs(b[1])));
  const used = new Array(cplx.length).fill(false); const out: Cx[] = [];
  for (let i = 0; i < cplx.length; i++) { if (used[i]) continue; used[i] = true; let j = -1; for (let l = i + 1; l < cplx.length; l++) { if (!used[l] && Math.abs(cplx[l][0] - cplx[i][0]) < 1e-9 && Math.abs(cplx[l][1] + cplx[i][1]) < 1e-9) { j = l; break; } } if (j >= 0) { used[j] = true; const lo = cplx[i][1] < 0 ? cplx[i] : cplx[j]; const hi = cplx[i][1] < 0 ? cplx[j] : cplx[i]; out.push(lo, hi); } else out.push(cplx[i]); }
  reals.sort((a, b) => a[0] - b[0]);
  return out.concat(reals);
}
/** N-th order elliptic analog lowpass prototype zeros/poles/gain (ellipap/ellipap2). */
function ellipap(n: number, rp: number, rs: number): { z: Cx[]; p: Cx[]; k: number } {
  const Gp = 10 ** (-rp / 20);
  const ep = Math.sqrt(10 ** (rp / 10) - 1), es = Math.sqrt(10 ** (rs / 10) - 1);
  const k1 = ep / es; const k = ellipdeg(n, k1);
  const L = Math.floor(n / 2), r = n % 2;
  const zr: Cx[] = []; for (let i = 1; i <= L; i++) { const u = (2 * i - 1) / n; const zeta = cde([u, 0], k); zr.push(cDiv([0, 1], cMul([k, 0], zeta))); }
  // v0 = -1i*asne(j/ep,k1)/n
  const as = asne([0, 1 / ep], k1); const v0: Cx = cMul([0, -1 / n], as);
  const p: Cx[] = []; for (let i = 1; i <= L; i++) { const u = (2 * i - 1) / n; const arg: Cx = cSub([u, 0], cMul([0, 1], v0)); p.push(cMul([0, 1], cde(arg, k))); }
  let p0: Cx = [0, 0]; if (r === 1) p0 = cMul([0, 1], sne(cMul([0, 1], v0), k));
  // assemble z and p with conjugates
  const zAll: Cx[] = []; for (const zi of zr) zAll.push(zi); for (const zi of zr) zAll.push([zi[0], -zi[1]]);
  const pAll: Cx[] = []; for (const pi of p) pAll.push(pi); for (const pi of p) pAll.push([pi[0], -pi[1]]);
  let zOut = cplxpairSort(zAll); let pOut = cplxpairSort(pAll);
  if (r === 1) pOut = pOut.concat([[p0[0], 0]]);
  const H0 = Gp ** (1 - r);
  // k_gain = abs(H0*prod(p)/prod(z))
  let prodP: Cx = [1, 0]; for (const pi of pOut) prodP = cMul(prodP, pi);
  let prodZ: Cx = [1, 0]; for (const zi of zOut) prodZ = cMul(prodZ, zi);
  const ratio = zOut.length ? cDiv(cMul([H0, 0], prodP), prodZ) : cMul([H0, 0], prodP);
  const kg = Math.hypot(ratio[0], ratio[1]);
  return { z: zOut, p: pOut, k: kg };
}
/** lp2lp on zpk: s → s/Wo. Scales zeros/poles by Wo and gain by Wo^(np-nz). */
function lp2lpZpk(z: Cx[], p: Cx[], k: number, wo: number): { z: Cx[]; p: Cx[]; k: number } {
  const zn = z.map((v): Cx => [v[0] * wo, v[1] * wo]);
  const pn = p.map((v): Cx => [v[0] * wo, v[1] * wo]);
  return { z: zn, p: pn, k: k * wo ** (p.length - z.length) };
}
/** lp2hp on zpk: s → Wo/s. New zeros Wo./z (+ zeros at origin to match), poles Wo./p,
 *  gain k·real(prod(-z)/prod(-p)). */
function lp2hpZpk(z: Cx[], p: Cx[], k: number, wo: number): { z: Cx[]; p: Cx[]; k: number } {
  let pz: Cx = [1, 0]; for (const zi of z) pz = cMul(pz, [-zi[0], -zi[1]]);
  let pp: Cx = [1, 0]; for (const pi of p) pp = cMul(pp, [-pi[0], -pi[1]]);
  const kgain = k * cDiv(pz, pp)[0];
  const zn = z.map((v): Cx => cDiv([wo, 0], v));
  const pn = p.map((v): Cx => cDiv([wo, 0], v));
  while (zn.length < pn.length) zn.push([0, 0]);   // append zeros at origin
  return { z: zn, p: pn, k: kgain };
}
/** bilinear on zpk (Fs prewarped externally): s-plane → z-plane (signal/bilinear.m zpk branch). */
function bilinearZpk(z: Cx[], p: Cx[], k: number, fs: number): { z: Cx[]; p: Cx[]; k: number } {
  const sf = 2 * fs;
  let prodz: Cx = [1, 0]; const zd: Cx[] = [];
  if (z.length) { for (const zi of z) { prodz = cMul(prodz, cSub([sf, 0], zi)); zd.push(cDiv(cAdd([1, 0], [zi[0] / sf, zi[1] / sf]), cSub([1, 0], [zi[0] / sf, zi[1] / sf]))); } }
  let prodp: Cx = [1, 0]; const pd: Cx[] = [];
  if (p.length) { for (const pi of p) { prodp = cMul(prodp, cSub([sf, 0], pi)); pd.push(cDiv(cAdd([1, 0], [pi[0] / sf, pi[1] / sf]), cSub([1, 0], [pi[0] / sf, pi[1] / sf]))); } }
  const kd = cDiv([k * prodz[0], k * prodz[1]], prodp)[0];
  while (zd.length < pd.length) zd.push([-1, 0]);   // pad with z = -1 (Nyquist)
  return { z: zd, p: pd, k: kd };
}
/** zpk → [b,a] transfer-function (descending powers), taking the real part. */
function zpk2tf(z: Cx[], p: Cx[], k: number): { b: number[]; a: number[] } {
  const a = polyFromRoots(p).map((c) => c[0]);
  const bz = polyFromRoots(z).map((c) => c[0] * k);
  const b = new Array(p.length - z.length).fill(0).concat(bz);   // left-pad to match a
  return { b, a };
}

/** One-dimensional digital filter (Direct Form II Transposed); returns y and final states zf. */
function filterDf2t(b: number[], a: number[], x: number[], zi?: number[]): { y: number[]; zf: number[] } {
  const a0 = a[0];
  const bn = b.map((v) => v / a0), an = a.map((v) => v / a0);
  const nb = bn.length, na = an.length, n = Math.max(nb, na);
  const bb = bn.slice(); while (bb.length < n) bb.push(0);
  const aa = an.slice(); while (aa.length < n) aa.push(0);
  const z = new Array(n - 1).fill(0); if (zi) for (let i = 0; i < z.length && i < zi.length; i++) z[i] = zi[i];
  const y = new Array(x.length);
  for (let m2 = 0; m2 < x.length; m2++) {
    const xm = x[m2];
    const ym = bb[0] * xm + (z[0] ?? 0);
    for (let i = 1; i < n - 1; i++) z[i - 1] = bb[i] * xm + z[i] - aa[i] * ym;
    if (n - 1 >= 1) z[n - 2] = bb[n - 1] * xm - aa[n - 1] * ym;
    y[m2] = ym;
  }
  return { y, zf: z };
}
/** filtfilt initial-state vector zi (steady state) for a single-section b/a (signal/filtfilt.m). */
function filtfiltZi(b: number[], a: number[]): number[] {
  const a0 = a[0]; const B = b.map((v) => v / a0), A = a.map((v) => v / a0);
  const M = Math.max(B.length, A.length);
  while (B.length < M) B.push(0); while (A.length < M) A.push(0);
  if (M <= 1) return [];
  // Solve (eye(M-1) - [-a, [eye(M-2); zeros(1,M-2)]]) zi = B(2:M) - B(1)*A(2:M)
  // a = A(2:M) as a column; the bracketed matrix is (M-1)x(M-1): col0 = -a,
  // cols 1..M-2 = eye(M-2) stacked over a zero row.
  const mm = M - 1;
  const mtx: number[][] = []; const rhs: number[] = [];
  for (let i = 0; i < mm; i++) { mtx.push(new Array(mm).fill(0)); rhs.push(B[i + 1] - B[0] * A[i + 1]); }
  for (let i = 0; i < mm; i++) {
    for (let j = 0; j < mm; j++) {
      const eyeM1 = i === j ? 1 : 0;
      let block = 0;
      if (j === 0) block = -A[i + 1];          // first column = -a
      else if (i === j - 1) block = 1;          // eye(M-2) in rows 0..M-3, cols 1..M-2
      mtx[i][j] = eyeM1 - block;
    }
  }
  // Gaussian elimination
  for (let col = 0; col < mm; col++) {
    let piv = col; for (let r = col + 1; r < mm; r++) if (Math.abs(mtx[r][col]) > Math.abs(mtx[piv][col])) piv = r;
    [mtx[col], mtx[piv]] = [mtx[piv], mtx[col]]; [rhs[col], rhs[piv]] = [rhs[piv], rhs[col]];
    const d = mtx[col][col];
    for (let r = 0; r < mm; r++) { if (r === col) continue; const f = mtx[r][col] / d; for (let c = col; c < mm; c++) mtx[r][c] -= f * mtx[col][c]; rhs[r] -= f * rhs[col]; }
  }
  return rhs.map((v, i) => v / mtx[i][i]);
}
/** Effective filter length: index of last nonzero coefficient (after normalization). */
function effLen(c: number[]): number { const mx = Math.max(...c.map(Math.abs)); if (mx === 0) return 0; let L = 0; for (let i = 0; i < c.length; i++) if (Math.abs(c[i] / mx) !== 0) L = i + 1; return L; }

/** Build a length-L window column from a sample function g(n, N) where N is the symmetric span.
 *  'periodic'/'symmetric' (default) selects N = L (periodic) or L-1 (symmetric). */
function window(a: Value[], optIdx: number, g: (n: number, N: number) => number): Promise<Value[]> {
  const L = Math.round(asScalar(a[0]));
  if (L <= 0) return ret(colVec([]));
  if (L === 1) return ret(colVec([1]));
  const periodic = a.length > optIdx && (isStr(a[optIdx]) || (isMat(a[optIdx]) && (a[optIdx] as Mat).isChar)) && asString(a[optIdx]).toLowerCase().startsWith('p');
  const N = periodic ? L : L - 1;
  const w: number[] = []; for (let n = 0; n < L; n++) w.push(g(n, N));
  return ret(colVec(w));
}

// ── t1_ helpers (TIER 1, prefixed to avoid collisions) ───────────────────────
/** Naive DFT of real+imag input of length nfft. */
function t1_naiveDFT(re: number[], im: number[], nfft: number): { re: number[]; im: number[] } {
  const or: number[] = new Array(nfft).fill(0), oi: number[] = new Array(nfft).fill(0);
  for (let k = 0; k < nfft; k++) for (let n = 0; n < nfft; n++) { const ang = -2 * Math.PI * k * n / nfft, c = Math.cos(ang), s = Math.sin(ang); or[k] += re[n] * c - im[n] * s; oi[k] += re[n] * s + im[n] * c; }
  return { re: or, im: oi };
}
/** Naive IDFT. */
function t1_naiveIDFT(re: number[], im: number[], nfft: number): { re: number[]; im: number[] } {
  const or: number[] = new Array(nfft).fill(0), oi: number[] = new Array(nfft).fill(0);
  for (let n = 0; n < nfft; n++) for (let k = 0; k < nfft; k++) { const ang = 2 * Math.PI * k * n / nfft, c = Math.cos(ang), s = Math.sin(ang); or[n] += re[k] * c - im[k] * s; oi[n] += re[k] * s + im[k] * c; }
  for (let n = 0; n < nfft; n++) { or[n] /= nfft; oi[n] /= nfft; }
  return { re: or, im: oi };
}
/** Companion-matrix eigenvalue roots of polynomial p (descending coefficients). */
function t1_polyRoots(p: number[]): Cx[] {
  // trim leading zeros
  let start = 0; while (start < p.length - 1 && p[start] === 0) start++;
  const q = p.slice(start);
  const n = q.length - 1;  // degree
  if (n <= 0) return [];
  if (n === 1) return [[-q[1] / q[0], 0]];
  if (n === 2) {
    const a = q[0], b = q[1], c2 = q[2], disc = b * b - 4 * a * c2;
    if (disc >= 0) return [[ (-b + Math.sqrt(disc)) / (2 * a), 0], [(-b - Math.sqrt(disc)) / (2 * a), 0]];
    const re = -b / (2 * a), im = Math.sqrt(-disc) / (2 * a);
    return [[re, im], [re, -im]];
  }
  // General: companion matrix power iteration (QR-like via Hessenberg). For small n use naive.
  // Build companion matrix C of size n×n (Frobenius companion)
  const a0 = q[0];
  const C: number[][] = Array.from({ length: n }, (_, i) => new Array(n).fill(0));
  for (let j = 0; j < n - 1; j++) C[j + 1][j] = 1;
  for (let j = 0; j < n; j++) C[0][j] = -q[j + 1] / a0;
  // Francis double-shift QR iteration (simplified: use basic QR for small n)
  // Use basic power deflation for robustness on small matrices
  return t1_qrEigenvalues(C, n);
}
/** QR iteration eigenvalues of an n×n real matrix M (simplified, up to 200 iters). */
function t1_qrEigenvalues(M: number[][], n: number): Cx[] {
  // Reduce to upper Hessenberg via Householder, then QR iterate with shifts
  // For simplicity: use the existing cplxpairSort-compatible method (modified QR)
  // Copy M
  let A = M.map((r) => r.slice());
  // Hessenberg reduction
  for (let k = 0; k < n - 2; k++) {
    // Build Householder reflector for column k, rows k+1..n-1
    const v: number[] = []; for (let i = k + 1; i < n; i++) v.push(A[i][k]);
    const sigma = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) * Math.sign(v[0] || 1);
    if (sigma === 0) continue;
    v[0] += sigma;
    const vn2 = v.reduce((s, x) => s + x * x, 0);
    // Apply H = I - 2vv'/v'v from left (rows k+1..n) and from right (cols k..n)
    for (let j = k; j < n; j++) {
      let dot = 0; for (let i = 0; i < v.length; i++) dot += A[k + 1 + i][j] * v[i];
      dot = 2 * dot / vn2;
      for (let i = 0; i < v.length; i++) A[k + 1 + i][j] -= dot * v[i];
    }
    for (let i = 0; i < n; i++) {
      let dot = 0; for (let j = 0; j < v.length; j++) dot += A[i][k + 1 + j] * v[j];
      dot = 2 * dot / vn2;
      for (let j = 0; j < v.length; j++) A[i][k + 1 + j] -= dot * v[j];
    }
  }
  // QR iteration with double-shift (Francis)
  const roots: Cx[] = [];
  let size = n;
  for (let iters = 0; size > 1 && iters < 300 * n; iters++) {
    // Wilkinson shift
    const a11 = A[size - 2][size - 2], a12 = A[size - 2][size - 1], a21 = A[size - 1][size - 2], a22 = A[size - 1][size - 1];
    const tr = a11 + a22, det = a11 * a22 - a12 * a21;
    // deflation check
    if (Math.abs(a21) < 1e-12 * (Math.abs(a11) + Math.abs(a22))) {
      roots.push([a22, 0]); size--;
      A = A.slice(0, size).map((r) => r.slice(0, size)); continue;
    }
    // double-shift QR: M = A - s1*I; A = Q1'*M; M = A - s2*I; A = Q2'*M
    // Use simplified: single shift with conjugate pair
    const disc = tr * tr / 4 - det;
    let s1r: number, s1i: number;
    if (disc >= 0) { s1r = tr / 2 + Math.sqrt(disc); s1i = 0; }
    else { s1r = tr / 2; s1i = Math.sqrt(-disc); }
    // Apply single-shift QR step
    for (let j = 0; j < size - 1; j++) {
      const cr = A[j][j] - s1r, ci = -s1i;
      const mag = Math.hypot(cr, A[j + 1][j]);
      if (mag === 0) continue;
      const cos = cr / mag, sin = A[j + 1][j] / mag;
      // Apply Givens rotation: G = [cos sin; -sin cos] from left (rows j, j+1)
      for (let col = j; col < size; col++) {
        const t0 = cos * A[j][col] + sin * A[j + 1][col];
        const t1 = -sin * A[j][col] + cos * A[j + 1][col];
        A[j][col] = t0; A[j + 1][col] = t1;
      }
      // Apply G' from right (cols j, j+1)
      for (let row = 0; row <= Math.min(j + 2, size - 1); row++) {
        const t0 = cos * A[row][j] + (-sin) * A[row][j + 1];
        const t1 = sin * A[row][j] + cos * A[row][j + 1];
        A[row][j] = t0; A[row][j + 1] = t1;
      }
    }
  }
  // Remaining 1x1 or 2x2 blocks
  if (size === 2) {
    const a11 = A[0][0], a12 = A[0][1], a21 = A[1][0], a22 = A[1][1];
    const tr2 = a11 + a22, det2 = a11 * a22 - a12 * a21, disc2 = tr2 * tr2 / 4 - det2;
    if (disc2 >= 0) { roots.push([tr2 / 2 + Math.sqrt(disc2), 0]); roots.push([tr2 / 2 - Math.sqrt(disc2), 0]); }
    else { roots.push([tr2 / 2, Math.sqrt(-disc2)]); roots.push([tr2 / 2, -Math.sqrt(-disc2)]); }
  } else if (size === 1) roots.push([A[0][0], 0]);
  return roots;
}
/** Complex z^p (real z). */
function t1_cpow(re: number, im: number, p: number): [number, number] {
  if (p === 0) return [1, 0]; if (p < 0) { const [r, i] = t1_cpow(re, im, -p); const d = r * r + i * i; return d === 0 ? [0, 0] : [r / d, -i / d]; }
  const mag = Math.hypot(re, im), ang = Math.atan2(im, re), magP = mag ** p, angP = ang * p;
  return [magP * Math.cos(angP), magP * Math.sin(angP)];
}
/** Convert Cx[] to a column-vector Mat (complex if needed). */
function t1_cxToMat(cx: Cx[], _colVecForm: boolean): Mat {
  const n = cx.length;
  if (n === 0) return zeros(0, 1);
  const re = new Float64Array(n), im = new Float64Array(n);
  let anyIm = false;
  for (let i = 0; i < n; i++) { re[i] = cx[i][0]; im[i] = cx[i][1]; if (cx[i][1] !== 0) anyIm = true; }
  const out = mat(n, 1, re);
  if (anyIm) out.idata = im;
  return out;
}
/** Convert a Mat to Cx[] (real+imag). */
function t1_matToCx(M: Mat): Cx[] {
  const n = M.rows * M.cols;
  const out: Cx[] = [];
  for (let i = 0; i < n; i++) out.push([M.data[i], M.idata ? M.idata[i] : 0]);
  return out;
}
/** Trim trailing zeros and return degree. */
function t1_trimDeg(c: number[]): number {
  let i = c.length - 1; while (i > 0 && c[i] === 0) i--;
  return i;
}
/** Design FIR interpolation filter equivalent to r * fir1(2*r*n, 2*cutoff/r, 'hamming').
 *  Default cutoff=0.5 → Wn = 1/r (normalized 0..1 Nyquist). Length = 2*r*n+1.
 *  b[k] = 2*cutoff * sinc(2*cutoff*(k-RN)/r) * hamming[k] where RN=r*n.
 *  Center tap ≈ 1; b applied to upsampled (sparse) signal gives correct interpolation. */
function t1_designInterpFilter(r: number, n: number, cutoff: number): number[] {
  const RN = r * n;
  const Wn = 2 * cutoff / r;  // fir1 Wn (0..1 normalized to Nyquist)
  const b: number[] = [];
  for (let k = 0; k <= 2 * RN; k++) {
    const x = Wn * (k - RN);  // = 2*cutoff*(k-RN)/r
    const sincVal = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const w = 0.54 + 0.46 * Math.cos(Math.PI * (k - RN) / RN);
    b.push(r * Wn * sincVal * w);  // r * fir1
  }
  return b;
}
/** Filter a signal with b (FIR/IIR), returning output and final state. */
function t1_filterWithZi(b: number[], x: number[], zi: number[]): { y: number[]; zf: number[] } {
  return filterDf2t(b, [1], x, zi);
}
/** Get filter initial state zi for input x using filterDf2t. */
function t1_filterGetZi(b: number[], x: number[]): number[] {
  // Run filter on x, extract final state
  return filterDf2t(b, [1], x).zf;
}
/** Filter with a known state vector (as final state from previous run). */
function t1_filterWithState(b: number[], x: number[], zi: number[]): number[] {
  return filterDf2t(b, [1], x, zi).y;
}

/** frexp: x = f·2^e with f ∈ [0.5,1). Matches MATLAB [f,e] = log2(x). */
function frexp(x: number): [number, number] {
  if (x === 0) return [0, 0];
  let e = Math.floor(Math.log2(Math.abs(x))) + 1;
  let f = x / 2 ** e;
  if (Math.abs(f) >= 1) { f /= 2; e += 1; }            // guard log2 rounding at powers of two
  else if (Math.abs(f) < 0.5) { f *= 2; e -= 1; }
  return [f, e];
}
// lin2mu — linear (−1..1) → mu-law flint (0..255). Transcribed from lin2mu.m.
function lin2muOne(yv: number): number {
  const SCALE = 32768, BIAS = 132, CLIP = 32635, OFFSET = 335;
  const ys = SCALE * yv;
  const sig = Math.sign(ys) + (ys === 0 ? 1 : 0);
  const y = Math.min(Math.abs(ys), CLIP);
  const [f, e] = frexp(y + BIAS);
  return 64 * sig - 16 * e - Math.trunc(32 * f) + OFFSET;
}
// mu2lin — mu-law flint (0..255) → linear. Transcribed from mu2lin.m.
const MU2LIN_ETAB = [0, 132, 396, 924, 1980, 4092, 8316, 16764];
function mu2linOne(muv: number): number {
  const SCALE = 1 / 32768;
  const mu = 255 - muv;
  const sig = mu > 127 ? 1 : 0;
  const e = Math.trunc(mu / 16) - 8 * sig + 1;
  const f = ((mu % 16) + 16) % 16;
  const y = f * 2 ** (e + 2);
  return SCALE * (1 - 2 * sig) * (MU2LIN_ETAB[e - 1] + y);
}

// diric(x,N) — Dirichlet (periodic sinc). Mirrors diric.m.
function diricOne(x: number, N: number): number {
  const tol = 2.220446049250313e-16 * 1e4;
  const s = Math.sin(0.5 * x);
  return Math.abs(s) > tol ? Math.sin(N * 0.5 * x) / (N * s) : Math.sign(Math.cos(x * (N + 1) * 0.5));
}
// square(t,duty) — square wave. Mirrors square.m.
function squareOne(t: number, w0: number): number {
  const tmp = ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return tmp < w0 ? 1 : -1;
}
// gmonopuls(t,fc) — Gaussian monopulse. Mirrors gmonopuls.m.
const TWO_SQRT_E = 2 * Math.exp(0.5);
function gmonopulsOne(t: number, fc: number): number {
  const u = Math.PI * t * fc; return TWO_SQRT_E * u * Math.exp(-2 * u * u);
}
/** Integer class name for a given bit width and signedness. */
const intClass = (nbits: number, signed: boolean) => (signed ? 'int' : 'uint') + (nbits <= 8 ? '8' : nbits <= 16 ? '16' : '32');

export const SIGNAL: ToolboxModule = {
  id: 'signal',
  name: 'Signal Processing Toolbox',
  docBase: 'https://www.mathworks.com/help/signal/ref/',
  builtins: {
    lin2mu: (a) => ret(map(m(a[0]), lin2muOne)),
    // qmf(x[,p]): quadrature mirror filter — reverse, then negate alternate taps.
    qmf: (a) => { const X = m(a[0]), y = toArray(X).reverse(), p = a.length > 1 ? asScalar(a[1]) : 0; for (let i = 1 - (((p % 2) + 2) % 2); i < y.length; i += 2) y[i] = -y[i]; return ret(X.cols === 1 && X.rows > 1 ? colVec(y) : rowVec(y)); },
    // xcorr2(a[,b]): 2-D cross-correlation = conv2(a, rot180(b)), full (ar+br-1)×(ac+bc-1).
    xcorr2: (a) => {
      const A = m(a[0]), B = a.length > 1 ? m(a[1]) : A;
      const ar = A.rows, ac = A.cols, br = B.rows, bc = B.cols, cr = ar + br - 1, cc = ac + bc - 1;
      const out = new Float64Array(cr * cc);
      for (let i = 0; i < cr; i++) for (let j = 0; j < cc; j++) {
        let s = 0;
        for (let mm = 0; mm < ar; mm++) { const bi = i - mm; if (bi < 0 || bi >= br) continue; for (let nn = 0; nn < ac; nn++) { const bj = j - nn; if (bj < 0 || bj >= bc) continue; s += A.data[mm + nn * ar] * B.data[(br - 1 - bi) + (bc - 1 - bj) * br]; } }
        out[i + j * cr] = s;
      }
      return ret(mat(cr, cc, out));
    },
    mu2lin: (a) => ret(map(m(a[0]), mu2linOne)),
    // ── LPC parameter conversions (element-wise closed forms) ──
    lar2rc: (a) => ret(map(m(a[0]), (g) => Math.tanh(g / 2))),
    rc2lar: (a) => ret(map(m(a[0]), (k) => Math.log((1 + k) / (1 - k)))),
    is2rc: (a) => ret(map(m(a[0]), (s) => Math.sin(s * Math.PI / 2))),
    // ── convmtx(h,n): convolution (Toeplitz) matrix; row h → n×(n+L−1), column h → (n+L−1)×n ──
    convmtx: (a) => {
      const H = m(a[0]), h = toArray(H), L = h.length, n = Math.round(asScalar(a[1])), isRow = H.rows === 1;
      if (isRow) { const cols = n + L - 1, data = new Float64Array(n * cols); for (let i = 0; i < n; i++) for (let j = 0; j < L; j++) data[i + (i + j) * n] = h[j]; return ret(mat(n, cols, data)); }
      const rows = n + L - 1, data = new Float64Array(rows * n); for (let i = 0; i < n; i++) for (let j = 0; j < L; j++) data[(i + j) + i * rows] = h[j]; return ret(mat(rows, n, data));
    },
    // ── rc2ac(rc,R0): reflection coefficients + zero-lag → autocorrelation (inverse Levinson) ──
    rc2ac: (a) => {
      const rc = toArray(m(a[0])), R0 = asScalar(a[1]); let a1 = [1], E = R0; const R = [R0];
      for (let i = 0; i < rc.length; i++) {
        const k = rc[i]; let acc = 0; for (let j = 1; j <= i; j++) acc += a1[j] * R[i + 1 - j];
        R.push(-k * E - acc);
        const anew = new Array(i + 2).fill(0); anew[0] = 1; for (let j = 1; j <= i; j++) anew[j] = a1[j] + k * a1[i + 1 - j]; anew[i + 1] = k;
        a1 = anew; E *= (1 - k * k);
      }
      return ret(colVec(R));
    },
    // pulstran(t,d,func,...args): pulse train y(t)=Σ ampᵢ·func(t−delayᵢ). d vector→delays (amp 1),
    // d N×2→[delay amp]. Supported func: rectpuls, tripuls, sinc, gauspuls.
    pulstran: (a) => {
      const T = m(a[0]), t = toArray(T), D = m(a[1]);
      const isVec = D.rows === 1 || D.cols === 1;
      const delays: number[] = [], amps: number[] = [];
      if (isVec) { for (const d of toArray(D)) { delays.push(d); amps.push(1); } }
      else { for (let i = 0; i < D.rows; i++) { delays.push(D.data[i]); amps.push(D.data[i + D.rows]); } }
      const fn = asString(a[2]).toLowerCase(); const args = a.slice(3).map((x) => asScalar(x));
      const proto = (x: number): number => {
        if (fn === 'rectpuls') { const w = args[0] ?? 1; return (x >= -w / 2 && x < w / 2) ? 1 : 0; }
        if (fn === 'tripuls') { const w = args[0] ?? 1; return Math.abs(x) < w / 2 ? 1 - 2 * Math.abs(x) / w : 0; }
        if (fn === 'sinc') { return x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x); }
        if (fn === 'gauspuls') { const fc = args[0] ?? 1000, bw = args[1] ?? 0.5; const r = ((Math.PI * fc * bw) ** 2) / (4 * Math.log(10 ** (-6 / 20))); return Math.exp(r * x * x) * Math.cos(2 * Math.PI * fc * x); }
        throw new Error(`pulstran: unsupported function '${fn}'`);
      };
      const out = t.map((ti) => { let s = 0; for (let k = 0; k < delays.length; k++) s += amps[k] * proto(ti - delays[k]); return s; });
      return ret(T.cols === 1 && T.rows > 1 ? colVec(out) : rowVec(out));
    },
    // vco(x,fc,fs): VCO — instantaneous freq from x∈[-1,1]; y=cos(phase). fc scalar→[0,2fc].
    vco: (a) => {
      const X = m(a[0]), x = toArray(X), fc = toArray(m(a[1])), fs = asScalar(a[2]);
      const f = x.map((xi) => (fc.length >= 2 ? fc[0] + (fc[1] - fc[0]) * (xi + 1) / 2 : fc[0] * (xi + 1)));
      const f0 = f.length ? f[0] : 0; const out: number[] = []; let c = 0;
      for (let i = 0; i < f.length; i++) { c += f[i]; out.push(Math.cos(2 * Math.PI / fs * (c - f0))); }
      return ret(X.cols === 1 && X.rows > 1 ? colVec(out) : rowVec(out));
    },
    diric: (a) => { const N = asScalar(a[1]); return ret(map(m(a[0]), (x) => diricOne(x, N))); },
    square: (a) => { const duty = a.length > 1 ? asScalar(a[1]) : 50; const w0 = 2 * Math.PI * duty / 100; return ret(map(m(a[0]), (t) => squareOne(t, w0))); },
    gmonopuls: (a) => {
      const fc = a.length > 1 && !isStr(a[1]) && !(isMat(a[1]) && (a[1] as Mat).isChar) ? asScalar(a[1]) : 1e3;
      if (isStr(a[0]) || (isMat(a[0]) && (a[0] as Mat).isChar)) return ret(scalar(1 / (Math.PI * fc)));  // 'cutoff'
      return ret(map(m(a[0]), (t) => gmonopulsOne(t, fc)));
    },
    uencode: (a) => {
      const nbits = asScalar(a[1]); const V = a.length > 2 && isMat(a[2]) && (a[2] as Mat).rows ? asScalar(a[2]) : 1;
      const signed = a.length > 3 && asString(a[3]).toLowerCase().startsWith('s');
      const Q = 2 ** nbits - 1, T = (Q + 1) / (2 * V), sMax = 2 ** (nbits - 1) - 1, sMin = -(sMax + 1);
      const out = map(m(a[0]), (u) => {
        let v = Math.floor((u + V) * T);
        if (signed) { v -= sMax + 1; v = Math.min(Math.max(v, sMin), sMax); } else { v = Math.min(Math.max(v, 0), Q); }
        return v;
      });
      return ret(applyClass(out, intClass(nbits, signed)));
    },
    udecode: (a) => {
      const U = m(a[0]); const N = asScalar(a[1]); const V = a.length > 2 && isMat(a[2]) && (a[2] as Mat).rows ? asScalar(a[2]) : 1;
      const sat = !(a.length > 3 && asString(a[3]).toLowerCase().startsWith('w'));     // default 'saturate'
      const signed = !!U.itype && U.itype.startsWith('int') && !U.itype.startsWith('uint');
      const W = signed ? 2 ** (N - 1) : 0, T = V * 2 ** (1 - N);
      const upper = signed ? 2 ** (N - 1) - 1 : 2 ** N - 1, lower = signed ? -(2 ** (N - 1)) : 0, P = 2 ** N;
      return ret(map(U, (u) => {
        let uu = u;
        if (sat) uu = Math.min(Math.max(uu, lower), upper);
        else uu = signed ? (((uu - lower) % P) + P) % P + lower : ((uu % P) + P) % P;
        return (uu + W) * T - V;
      }));
    },
    // ── window functions (return L×1 columns, MATLAB convention) ──
    rectwin: (a) => ret(colVec(new Array(Math.max(0, Math.round(asScalar(a[0])))).fill(1))),
    // hann/hamming/blackman/bartlett/hanning are all provided by the base builtins, which match
    // MATLAB exactly — removed here to avoid duplicate code. (The old signal.hanning was wrong: it
    // returned the hann window [0 .5 1 .5 0]; MATLAB's hanning(5) is [.25 .75 1 .75 .25], as base does.)
    blackmanharris: (a) => window(a, 1, (n, N) => { const x = (2 * Math.PI * n) / N; return 0.35875 - 0.48829 * Math.cos(x) + 0.14128 * Math.cos(2 * x) - 0.01168 * Math.cos(3 * x); }),
    nuttallwin: (a) => window(a, 1, (n, N) => { const x = (2 * Math.PI * n) / N; return 0.3635819 - 0.4891775 * Math.cos(x) + 0.1365995 * Math.cos(2 * x) - 0.0106411 * Math.cos(3 * x); }),
    flattopwin: (a) => window(a, 1, (n, N) => { const x = (2 * Math.PI * n) / N; return 0.21557895 - 0.41663158 * Math.cos(x) + 0.277263158 * Math.cos(2 * x) - 0.083578947 * Math.cos(3 * x) + 0.006947368 * Math.cos(4 * x); }),
    triang: (a) => { const L = Math.round(asScalar(a[0])); const w: number[] = []; for (let n = 1; n <= L; n++) w.push(L % 2 ? 1 - Math.abs((2 * n - L - 1) / (L + 1)) : 1 - Math.abs((2 * n - L - 1) / L)); return ret(colVec(w)); },
    // ── windows ported from the pure .m sources (parzen/bohman/taylor) ──
    parzenwin: (a) => {
      const L = Math.round(asScalar(a[0])); if (L <= 0) return ret(zeros(0, 1)); if (L === 1) return ret(colVec([1]));
      const w: number[] = [], h = (L - 1) / 2, q = (L - 1) / 4;
      for (let k = 0; k < L; k++) { const t = Math.abs(k - h) / L; w.push(Math.abs(k - h) <= q ? 1 - 24 * t * t + 48 * t * t * t : 2 * (1 - 2 * t) ** 3); }
      return ret(colVec(w));
    },
    bohmanwin: (a) => {
      const L = Math.round(asScalar(a[0])); if (L <= 0) return ret(zeros(0, 1)); if (L === 1) return ret(colVec([1]));
      const w: number[] = [];
      for (let k = 0; k < L; k++) { if (k === 0 || k === L - 1) { w.push(0); continue; } const ax = Math.abs(-1 + (2 * k) / (L - 1)); w.push((1 - ax) * Math.cos(Math.PI * ax) + Math.sin(Math.PI * ax) / Math.PI); }
      return ret(colVec(w));
    },
    taylorwin: (a) => {
      const L = Math.round(asScalar(a[0])); if (L <= 0) return ret(zeros(0, 1)); if (L === 1) return ret(colVec([1]));
      const nbar = a.length > 1 && isMat(a[1]) ? Math.round(asScalar(a[1])) : 4;
      const sll = a.length > 2 && isMat(a[2]) ? asScalar(a[2]) : -30;
      const A = Math.acosh(Math.pow(10, -sll / 20)) / Math.PI, A2 = A * A;
      const sp2 = (nbar * nbar) / (A2 + (nbar - 0.5) ** 2);
      const Fm: number[] = [0];
      for (let mm = 1; mm <= nbar - 1; mm++) {
        let num = 1; for (let i = 1; i <= nbar - 1; i++) num *= 1 - (mm * mm / sp2) / (A2 + (i - 0.5) ** 2);
        let den = 1; for (let j = 1; j <= nbar - 1; j++) if (j !== mm) den *= 1 - (mm * mm) / (j * j);
        Fm[mm] = ((mm % 2 === 1 ? 1 : -1) * num) / den;
      }
      const w: number[] = [];
      for (let k = 0; k < L; k++) { const twoX = (2 * k - L + 1) / L; let s = 1; for (let mm = 1; mm <= nbar - 1; mm++) s += Fm[mm] * Math.cos(Math.PI * mm * twoX); w.push(s); }
      return ret(colVec(w));
    },
    // ── Dolph-Chebyshev window (MEX chebwinx → documented algorithm; at = sidelobe dB, default 100) ──
    chebwin: (a) => {
      const N = Math.round(asScalar(a[0])); if (N <= 0) return ret(zeros(0, 1)); if (N === 1) return ret(colVec([1]));
      const at = a.length > 1 && isMat(a[1]) ? Math.abs(asScalar(a[1])) : 100;
      const order = N - 1, beta = Math.cosh(Math.acosh(Math.pow(10, at / 20)) / order);
      const pre: number[] = [], pim: number[] = [];
      for (let k = 0; k < N; k++) { const x = beta * Math.cos((Math.PI * k) / N); pim.push(0); pre.push(x > 1 ? Math.cosh(order * Math.acosh(x)) : x < -1 ? (2 * (N % 2) - 1) * Math.cosh(order * Math.acosh(-x)) : Math.cos(order * Math.acos(x))); }
      const reFft = (re: number[], im: number[]) => { const out: number[] = []; for (let n = 0; n < N; n++) { let s = 0; for (let k = 0; k < N; k++) { const ang = (2 * Math.PI * k * n) / N; s += re[k] * Math.cos(ang) + im[k] * Math.sin(ang); } out.push(s); } return out; };
      let w: number[];
      if (N % 2 === 1) { const fr = reFft(pre, pim), n = (N + 1) >> 1, half = fr.slice(0, n); w = [...half.slice(1, n).reverse(), ...half]; }
      else { const re: number[] = [], im: number[] = []; for (let k = 0; k < N; k++) { const ph = (Math.PI / N) * k; re.push(pre[k] * Math.cos(ph)); im.push(pre[k] * Math.sin(ph)); } const fr = reFft(re, im), n = (N >> 1) + 1; w = [...fr.slice(1, n).reverse(), ...fr.slice(1, n)]; }
      const mx = Math.max(...w); return ret(colVec(w.map((v) => v / mx)));
    },
    // ── distances (MEX dtwmex/edrmex → documented dynamic-programming algorithms) ──
    dtw: (a) => {
      const x = toArray(m(a[0])), y = toArray(m(a[1])), nx = x.length, ny = y.length;
      const D = Array.from({ length: nx + 1 }, () => new Array(ny + 1).fill(Infinity)); D[0][0] = 0;
      for (let i = 1; i <= nx; i++) for (let j = 1; j <= ny; j++) D[i][j] = Math.abs(x[i - 1] - y[j - 1]) + Math.min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1]);
      return ret(scalar(D[nx][ny]));
    },
    edr: (a) => {
      const x = toArray(m(a[0])), y = toArray(m(a[1])), tol = a.length > 2 ? asScalar(a[2]) : 0, nx = x.length, ny = y.length;
      const D = Array.from({ length: nx + 1 }, () => new Array(ny + 1).fill(0));
      for (let i = 0; i <= nx; i++) D[i][0] = i; for (let j = 0; j <= ny; j++) D[0][j] = j;
      for (let i = 1; i <= nx; i++) for (let j = 1; j <= ny; j++) { const sub = Math.abs(x[i - 1] - y[j - 1]) <= tol ? 0 : 1; D[i][j] = Math.min(D[i - 1][j - 1] + sub, D[i - 1][j] + 1, D[i][j - 1] + 1); }
      return ret(scalar(D[nx][ny]));
    },
    // ── signal measures (pure .m), column-wise like MATLAB ──
    peak2peak: (a) => ret(reduceCols(m(a[0]), (x) => Math.max(...x) - Math.min(...x))),
    peak2rms: (a) => ret(reduceCols(m(a[0]), (x) => Math.max(...x.map(Math.abs)) / Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length))),
    rssq: (a) => ret(reduceCols(m(a[0]), (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0)))),
    // ── periodogram PSD: periodogram(x[,window][,nfft][,fs]) → [Pxx,f], one-sided for real x ──
    periodogram: (a, nargout) => {
      const x = toArray(m(a[0])), N = x.length;
      const hasArg = (i: number) => a.length > i && isMat(a[i]) && m(a[i]).rows * m(a[i]).cols > 0;
      const w = hasArg(1) ? toArray(m(a[1])) : new Array(N).fill(1);
      if (w.length !== N) throw new Error('periodogram: the window length must equal the signal length');   // mismatched window ⇒ undefined w[n] → NaN PSD
      const nfft = hasArg(2) ? Math.round(asScalar(a[2])) : Math.max(256, 2 ** Math.ceil(Math.log2(N)));
      const fs = hasArg(3) ? asScalar(a[3]) : null, Fs = fs ?? 2 * Math.PI;
      const half = Math.floor(nfft / 2), sumw2 = w.reduce((s, v) => s + v * v, 0);
      const Pxx: number[] = [], f: number[] = [];
      for (let k = 0; k <= half; k++) {
        let re = 0, im = 0;
        for (let n = 0; n < N; n++) { const ang = -2 * Math.PI * k * n / nfft, xw = x[n] * w[n]; re += xw * Math.cos(ang); im += xw * Math.sin(ang); }
        let p = (re * re + im * im) / (Fs * sumw2); if (k > 0 && (k < half || nfft % 2 !== 0)) p *= 2; // odd nfft has no Nyquist bin
        Pxx.push(p); f.push(fs ? k * fs / nfft : k * 2 * Math.PI / nfft);
      }
      return Promise.resolve(nargout >= 2 ? [colVec(Pxx), colVec(f)] : [colVec(Pxx)]);
    },
    // ── short-time Fourier transform: stft(x[,fs],Name,Value) → [S,F,T] ──
    stft: (a, nargout) => {
      const x = toArray(m(a[0])), xIm0 = m(a[0]).idata, xIm = xIm0 ? Array.from(xIm0) : null, nx = x.length;
      // optional positional fs (numeric scalar before any Name/Value pair)
      let argStart = 1, fs: number | null = null;
      if (a.length > 1 && isMat(a[1]) && !(a[1] as Mat).isChar && m(a[1]).rows * m(a[1]).cols === 1) { fs = asScalar(a[1]); argStart = 2; }
      const opt = (name: string): Value | undefined => { for (let i = argStart; i + 1 < a.length; i += 2) if ((isStr(a[i]) || (isMat(a[i]) && (a[i] as Mat).isChar)) && asString(a[i]).toLowerCase() === name) return a[i + 1]; return undefined; };
      const winArg = opt('window');
      const win = winArg !== undefined ? toArray(m(winArg)) : Array.from({ length: 128 }, (_, n) => 0.5 - 0.5 * Math.cos(2 * Math.PI * n / 128));  // hann(128,'periodic')
      const nwin = win.length;
      const ovArg = opt('overlaplength'), noverlap = ovArg !== undefined ? Math.round(asScalar(ovArg)) : Math.floor(nwin * 0.75);
      const nfArg = opt('fftlength'), nfft = nfArg !== undefined ? Math.round(asScalar(nfArg)) : nwin;
      const isNorm = fs === null; const Fs = isNorm ? 2 : fs!;
      const frArg = opt('frequencyrange'), centeredArg = opt('centered');
      let range = 'centered';
      if (frArg !== undefined) range = asString(frArg).toLowerCase();
      else if (centeredArg !== undefined) range = asScalar(centeredArg) ? 'centered' : 'twosided';
      if (noverlap < 0 || noverlap >= nwin) throw new Error('stft: OverlapLength must be nonnegative and less than the window length');   // hop>0 ⇒ no infinite/invalid frame loop
      if (nfft < nwin) throw new Error('stft: FFTLength must be at least the window length');
      if (nx < nwin) throw new Error('stft: signal length must be at least the window length');
      const hop = nwin - noverlap, nCol = Math.floor((nx - noverlap) / hop);
      const cols: { re: number[]; im: number[] }[] = [], offs: number[] = [];
      for (let c = 0; c < nCol; c++) { const off = c * hop; offs.push(off); const re: number[] = [], im: number[] = []; for (let i = 0; i < nwin; i++) { re.push(x[off + i] * win[i]); im.push((xIm ? xIm[off + i] : 0) * win[i]); } cols.push(dftCol(re, im, nfft)); }
      let full = psdfreqvecFull(nfft, Fs), fOut = full, nFreq = nfft;
      let outCols = cols;
      if (range === 'onesided') { nFreq = nfft % 2 === 0 ? nfft / 2 + 1 : (nfft + 1) / 2; fOut = full.slice(0, nFreq); outCols = cols.map((c) => ({ re: c.re.slice(0, nFreq), im: c.im.slice(0, nFreq) })); }
      else if (range === 'centered') { const perm = centerPerm(nfft); fOut = centerFreqVec(full, Fs); outCols = cols.map((c) => ({ re: perm.map((p) => c.re[p]), im: perm.map((p) => c.im[p]) })); }
      const S = complexMat(outCols, nFreq);
      if (nargout < 2) return ret(S);
      const Fcol = isNorm ? colVec(fOut.map((v) => v * Math.PI)) : colVec(fOut);   // rad/sample when normalized
      if (nargout < 3) return Promise.resolve([S, Fcol]);
      const tVals = offs.map((o) => (o + nwin / 2) / Fs * (isNorm ? Fs : 1));      // samples when normalized, else seconds
      return Promise.resolve([S, Fcol, colVec(tVals)]);
    },
    // ── inverse STFT (WOLA / OLA) → reconstructed signal ──
    istft: (a, nargout) => {
      const S = m(a[0]), nFreqRows = S.rows, nseg = S.cols;
      const Sre = toArray(S), Sim = S.idata ? Array.from(S.idata) : new Array(Sre.length).fill(0);
      let argStart = 1, fs: number | null = null;
      if (a.length > 1 && isMat(a[1]) && !(a[1] as Mat).isChar && m(a[1]).rows * m(a[1]).cols === 1) { fs = asScalar(a[1]); argStart = 2; }
      const opt = (name: string): Value | undefined => { for (let i = argStart; i + 1 < a.length; i += 2) if ((isStr(a[i]) || (isMat(a[i]) && (a[i] as Mat).isChar)) && asString(a[i]).toLowerCase() === name) return a[i + 1]; return undefined; };
      const winArg = opt('window');
      const win = winArg !== undefined ? toArray(m(winArg)) : Array.from({ length: 128 }, (_, n) => 0.5 - 0.5 * Math.cos(2 * Math.PI * n / 128));
      const nwin = win.length;
      const ovArg = opt('overlaplength'), noverlap = ovArg !== undefined ? Math.round(asScalar(ovArg)) : Math.floor(nwin * 0.75);
      const nfArg = opt('fftlength'), nfft = nfArg !== undefined ? Math.round(asScalar(nfArg)) : nwin;
      const isNorm = fs === null; const Fs = isNorm ? 2 : fs!;
      const frArg = opt('frequencyrange'), centeredArg = opt('centered');
      let range = 'centered';
      if (frArg !== undefined) range = asString(frArg).toLowerCase();
      else if (centeredArg !== undefined) range = asScalar(centeredArg) ? 'centered' : 'twosided';
      const conjSym = (() => { const c = opt('conjugatesymmetric'); return c !== undefined ? !!asScalar(c) : false; })();
      const methodArg = opt('method'), method = methodArg !== undefined ? asString(methodArg).toLowerCase() : 'wola';
      const numFreqSamples = nfft % 2 === 0 ? nfft / 2 + 1 : (nfft + 1) / 2;
      // formatISTFTInput → reconstruct full two-sided spectra (per segment)
      const segs: { re: number[]; im: number[] }[] = [];
      for (let c = 0; c < nseg; c++) {
        const cr: number[] = [], ci: number[] = [];
        for (let r = 0; r < nFreqRows; r++) { cr.push(Sre[r + c * nFreqRows]); ci.push(Sim[r + c * nFreqRows]); }
        let fr: number[], fi: number[];
        if (range === 'twosided') { fr = cr; fi = ci; }
        else if (range === 'centered') {
          fr = new Array(nfft); fi = new Array(nfft);
          // even: circshift(s,-(n/2-1)) ⇒ fr[i]=cr[(i+n/2-1) mod n]; odd: ifftshift ⇒ fr[i]=cr[(i+(n-1)/2) mod n]
          const sh = nfft % 2 === 0 ? nfft / 2 - 1 : (nfft - 1) / 2;
          for (let i = 0; i < nfft; i++) { const src = (i + sh) % nfft; fr[i] = cr[src]; fi[i] = ci[src]; }
        } else { // onesided → mirror conjugate
          fr = new Array(nfft).fill(0); fi = new Array(nfft).fill(0);
          for (let r = 0; r < numFreqSamples; r++) { fr[r] = cr[r]; fi[r] = ci[r]; }
          const lastMirror = nfft % 2 === 0 ? numFreqSamples - 1 : numFreqSamples;
          for (let r = 2; r <= lastMirror; r++) { fr[nfft - r + 1] = cr[r - 1]; fi[nfft - r + 1] = -ci[r - 1]; }
        }
        let inv = idftCol(fr, fi, nfft);
        if (conjSym) inv = { re: inv.re, im: inv.re.map(() => 0) };  // 'symmetric' → real output
        segs.push({ re: inv.re.slice(0, Math.min(nwin, nfft)), im: inv.im.slice(0, Math.min(nwin, nfft)) });
      }
      const hop = nwin - noverlap, xlen = nwin + (nseg - 1) * hop, aPow = method === 'ola' ? 0 : 1;
      const xr = new Array(xlen).fill(0), xi = new Array(xlen).fill(0), normVal = new Array(xlen).fill(0);
      const wNum = win.map((w) => Math.pow(w, aPow)), wDen = win.map((w) => Math.pow(w, aPow + 1));
      for (let ii = 0; ii < nseg; ii++) for (let i = 0; i < nwin; i++) { const idx = ii * hop + i; xr[idx] += segs[ii].re[i] * wNum[i]; xi[idx] += segs[ii].im[i] * wNum[i]; normVal[idx] += wDen[i]; }
      const EPS = 2.220446049250313e-16;
      for (let i = 0; i < xlen; i++) if (normVal[i] < nseg * EPS) normVal[i] = 1;
      const reOut = xr.map((v, i) => v / normVal[i]), imOut = xi.map((v, i) => v / normVal[i]);
      const anyImag = imOut.some((v) => v !== 0);
      const X = colVec(reOut); if (anyImag) X.idata = Float64Array.from(imOut);
      if (nargout < 2) return ret(X);
      const T = colVec(Array.from({ length: xlen }, (_, i) => i / Fs * (isNorm ? Fs : 1)));
      return Promise.resolve([X, T]);
    },
    // ── legacy spectrogram(x,window,noverlap,nfft[,fs]) → [S,F,T,P] (one-sided for real x) ──
    spectrogram: (a, nargout) => {
      const x = toArray(m(a[0])), xIm0 = m(a[0]).idata, xIm = xIm0 ? Array.from(xIm0) : null, nx = x.length;
      const isRealX = !xIm0;
      const winIsVec = a.length > 1 && isMat(a[1]) && !(a[1] as Mat).isChar && m(a[1]).rows * m(a[1]).cols > 1;
      const winArg = winIsVec ? a[1] : undefined;
      // A scalar 2nd arg is the window *length* (→ Hamming window of that length), matching MATLAB.
      const winLen = !winIsVec && a.length > 1 && isMat(a[1]) && !(a[1] as Mat).isChar && m(a[1]).rows * m(a[1]).cols === 1 ? Math.round(asScalar(a[1])) : undefined;
      const nwinDefault = Math.max(2, Math.floor(nx / 4.5));
      const win = winArg !== undefined ? toArray(m(winArg)) : hammingWin(winLen ?? nwinDefault);
      const nwin = win.length;
      const ovGiven = a.length > 2 && isMat(a[2]) && m(a[2]).rows * m(a[2]).cols >= 1;
      const noverlap = ovGiven ? Math.round(asScalar(a[2])) : Math.round(nwin / 2);
      const nfGiven = a.length > 3 && isMat(a[3]) && m(a[3]).rows * m(a[3]).cols >= 1;
      const nfft = nfGiven ? Math.round(asScalar(a[3])) : Math.max(256, 2 ** Math.ceil(Math.log2(nwin)));
      const fs = a.length > 4 && isMat(a[4]) ? asScalar(a[4]) : null;
      const Fs = fs ?? 2 * Math.PI;
      const range = isRealX ? 'onesided' : 'twosided';
      if (noverlap < 0 || noverlap >= nwin) throw new Error('spectrogram: noverlap must be nonnegative and less than the window length');   // hop>0 ⇒ no infinite/invalid frame loop
      if (nfft < nwin) throw new Error('spectrogram: nfft must be at least the window length');   // avoid DFT time-domain wrapping
      if (nx < nwin) throw new Error('spectrogram: signal length must be at least the window length');
      const hop = nwin - noverlap, nCol = Math.floor((nx - noverlap) / hop);
      const cols: { re: number[]; im: number[] }[] = [], offs: number[] = [];
      for (let c = 0; c < nCol; c++) { const off = c * hop; offs.push(off); const re: number[] = [], im: number[] = []; for (let i = 0; i < nwin; i++) { re.push(x[off + i] * win[i]); im.push((xIm ? xIm[off + i] : 0) * win[i]); } cols.push(dftCol(re, im, nfft)); }
      const full = psdfreqvecFull(nfft, Fs);
      let nFreq = nfft, fOut = full, outCols = cols;
      if (range === 'onesided') { nFreq = nfft % 2 === 0 ? nfft / 2 + 1 : (nfft + 1) / 2; fOut = full.slice(0, nFreq); outCols = cols.map((c) => ({ re: c.re.slice(0, nFreq), im: c.im.slice(0, nFreq) })); }
      const S = complexMat(outCols, nFreq);
      const Fcol = colVec(fOut), Tcol = colVec(offs.map((o) => (o + nwin / 2) / Fs));
      if (nargout < 4) {
        if (nargout < 2) return ret(S);
        if (nargout < 3) return Promise.resolve([S, Fcol]);
        return Promise.resolve([S, Fcol, Tcol]);
      }
      // P (PSD): Sxx = |y|^2/U, onesided doubling (not DC/Nyquist), Pxx = Sxx/Fs
      const U = win.reduce((s, w) => s + w * w, 0);
      const pCols: number[][] = [];
      for (let c = 0; c < nCol; c++) {
        const yr = cols[c].re, yi = cols[c].im, sxx = full.map((_, k) => (yr[k] * yr[k] + yi[k] * yi[k]) / U);
        let pcol: number[];
        if (range === 'onesided') {
          const sel = sxx.slice(0, nFreq);
          if (nfft % 2 === 0) { for (let r = 1; r < nFreq - 1; r++) sel[r] *= 2; } else { for (let r = 1; r < nFreq; r++) sel[r] *= 2; }
          pcol = sel.map((v) => v / Fs);
        } else pcol = sxx.map((v) => v / Fs);
        pCols.push(pcol);
      }
      const Pdata = new Float64Array(nFreq * nCol);
      for (let c = 0; c < nCol; c++) for (let r = 0; r < nFreq; r++) Pdata[r + c * nFreq] = pCols[c][r];
      return Promise.resolve([S, Fcol, Tcol, mat(nFreq, nCol, Pdata)]);
    },
    // ── spectral measures (rectangular/kaiser0 window, nfft=N, specfreqwidth width-method) ──
    meanfreq: (a) => {
      const x = toArray(m(a[0])), fs = a.length > 1 && isMat(a[1]) ? asScalar(a[1]) : undefined;
      const { Pxx, f } = psdWin(x, new Array(x.length).fill(1), fs), w = specWidth(f);
      let num = 0, den = 0; for (let k = 0; k < f.length; k++) { num += w[k] * f[k] * Pxx[k]; den += w[k] * Pxx[k]; }
      return ret(scalar(num / den));
    },
    medfreq: (a) => {
      const x = toArray(m(a[0])), fs = a.length > 1 && isMat(a[1]) ? asScalar(a[1]) : undefined;
      const { Pxx, f } = psdWin(x, new Array(x.length).fill(1), fs), w = specWidth(f);
      let tot = 0; for (let k = 0; k < f.length; k++) tot += w[k] * Pxx[k];
      let c = 0; for (let k = 0; k < f.length; k++) { const seg = w[k] * Pxx[k]; if (c + seg >= tot / 2) return ret(scalar(f[k] - w[k] / 2 + (tot / 2 - c) / seg * w[k])); c += seg; }
      return ret(scalar(f[f.length - 1]));
    },
    // bandpower(x): mean square; bandpower(x,fs,[f1 f2]): hamming-window nfft=N PSD over the band
    bandpower: (a) => {
      const x = toArray(m(a[0]));
      if (!(a.length > 2 && isMat(a[2]))) return ret(scalar(x.reduce((s, v) => s + v * v, 0) / x.length));
      const fs = isMat(a[1]) ? asScalar(a[1]) : undefined, range = toArray(m(a[2]));
      const { Pxx, f } = psdWin(x, hammingWin(x.length), fs), w = specWidth(f), lo = range[0], hi = range[1];
      let i1 = 0; for (let k = 0; k < f.length; k++) if (f[k] <= lo) i1 = k;
      let i2 = f.length - 1; for (let k = 0; k < f.length; k++) if (f[k] >= hi) { i2 = k; break; }
      let s = 0; for (let k = i1; k <= i2; k++) s += w[k] * Pxx[k]; return ret(scalar(s));
    },
    // powerbw: half-power (-3 dB) bandwidth around the spectral peak, log-power-interpolated edges
    powerbw: (a) => {
      const x = toArray(m(a[0])), fs = a.length > 1 && isMat(a[1]) ? asScalar(a[1]) : undefined;
      const { Pxx, f } = psdWin(x, new Array(x.length).fill(1), fs);
      const peak = Math.max(...Pxx), iC = Pxx.indexOf(peak), ref = peak * 0.5;
      const L10 = (v: number) => Math.log10(Math.max(v, Number.MIN_VALUE));
      const lint = (yp: number, yq: number, xp: number, xq: number, xx: number) => yp + (yq - yp) * (xx - xp) / (xq - xp);
      let iL = -1; for (let k = 0; k <= iC; k++) if (Pxx[k] <= ref) iL = k;
      let iR = -1; for (let k = iC; k < f.length; k++) if (Pxx[k] <= ref) { iR = k; break; }
      const fLo = iL < 0 ? f[0] : lint(f[iL], f[iL + 1], L10(Pxx[iL]), L10(Pxx[iL + 1]), L10(ref));
      const fHi = iR < 0 ? f[f.length - 1] : lint(f[iR], f[iR - 1], L10(Pxx[iR]), L10(Pxx[iR - 1]), L10(ref));
      return ret(scalar(fHi - fLo));
    },
    // obw: 99%-occupied bandwidth via cumulative power (0.5% excluded each side), freq-interpolated
    obw: (a) => {
      const x = toArray(m(a[0])), fs = a.length > 1 && isMat(a[1]) ? asScalar(a[1]) : undefined;
      const { Pxx, f } = psdWin(x, new Array(x.length).fill(1), fs), wd = specWidth(f), N = f.length;
      const cumPwr = [0]; for (let k = 0; k < N; k++) cumPwr.push(cumPwr[k] + Pxx[k] * wd[k]);
      const cumF = [f[0]]; for (let k = 1; k < N; k++) cumF.push((f[k - 1] + f[k]) / 2); cumF.push(f[N - 1]);
      const tot = cumPwr[N], ploLim = tot / 200, phiLim = 199 * tot / 200;
      const interpFreq = (thr: number) => { let i1 = cumPwr.findIndex((c) => c >= thr); if (i1 <= 0) i1 = 1; return cumF[i1 - 1] + (cumF[i1] - cumF[i1 - 1]) * (thr - cumPwr[i1 - 1]) / (cumPwr[i1] - cumPwr[i1 - 1]); };
      return ret(scalar(interpFreq(phiLim) - interpFreq(ploLim)));
    },
    // ── DCT-II matrix: dctmtx(n) — row 0 = sqrt(1/n); row i>0 = sqrt(2/n)·cos(π(2j+1)i/2n) ──
    dctmtx: (a) => {
      const n = Math.round(asScalar(a[0])), d = new Float64Array(n * n);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) d[i + j * n] = i === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n) * Math.cos(Math.PI * (2 * j + 1) * i / (2 * n));
      return ret(mat(n, n, d));
    },
    // ── Welch PSD: pwelch(x[,window][,noverlap][,nfft][,fs]) — default 8 segments, 50% overlap, hamming ──
    pwelch: (a, nargout) => {
      const x = toArray(m(a[0])), N = x.length;
      const wa = a.length > 1 && isMat(a[1]) && m(a[1]).rows * m(a[1]).cols > 0 ? m(a[1]) : null;
      let L: number, w: number[];
      if (wa && wa.rows * wa.cols > 1) { w = toArray(wa); L = w.length; }
      else if (wa) { L = Math.round(asScalar(a[1])); w = hammingWin(L); }
      else { L = Math.floor(N / 4.5); w = hammingWin(L); }
      const has = (i: number) => a.length > i && isMat(a[i]) && m(a[i]).rows * m(a[i]).cols > 0;
      const nov = has(2) ? Math.round(asScalar(a[2])) : Math.floor(L / 2);
      const nfft = has(3) ? Math.round(asScalar(a[3])) : Math.max(256, 2 ** Math.ceil(Math.log2(L)));
      const fs = has(4) ? asScalar(a[4]) : null, Fs = fs ?? 2 * Math.PI, half = Math.floor(nfft / 2);
      const sw2 = w.reduce((s, v) => s + v * v, 0), step = L - nov, Pxx = new Array(half + 1).fill(0);
      let nseg = 0;
      for (let start = 0; start + L <= N; start += step) {
        nseg++;
        for (let k = 0; k <= half; k++) {
          let re = 0, im = 0;
          for (let nn = 0; nn < L; nn++) { const ang = -2 * Math.PI * k * nn / nfft, xv = x[start + nn] * w[nn]; re += xv * Math.cos(ang); im += xv * Math.sin(ang); }
          let p = (re * re + im * im) / (Fs * sw2); if (k > 0 && k < half) p *= 2; Pxx[k] += p;
        }
      }
      const P = Pxx.map((v) => v / Math.max(1, nseg)), f = P.map((_, k) => (fs ? k * fs / nfft : k * 2 * Math.PI / nfft));
      return Promise.resolve(nargout >= 2 ? [colVec(P), colVec(f)] : [colVec(P)]);
    },
    // ── pulse/waveform generators ──
    rectpuls: (a) => { const w = a.length > 1 ? asScalar(a[1]) : 1; return ret(map(m(a[0]), (t) => (t >= -w / 2 && t < w / 2 ? 1 : 0))); },
    tripuls: (a) => {
      const w = a.length > 1 && isMat(a[1]) ? asScalar(a[1]) : 1, s = a.length > 2 ? asScalar(a[2]) : 0, tp = w * s / 2;
      return ret(map(m(a[0]), (t) => { if (t < -w / 2 || t > w / 2) return 0; return t <= tp ? (tp + w / 2 === 0 ? 0 : (t + w / 2) / (tp + w / 2)) : (w / 2 - tp === 0 ? 0 : (w / 2 - t) / (w / 2 - tp)); }));
    },
    sawtooth: (a) => { const width = a.length > 1 ? asScalar(a[1]) : 1; return ret(map(m(a[0]), (t) => { const ph = (((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI); return ph < width ? 2 * ph / width - 1 : 2 * (1 - ph) / (1 - width) - 1; })); },
    gauspuls: (a) => {
      const fc = a.length > 1 ? asScalar(a[1]) : 1000, bw = a.length > 2 ? asScalar(a[2]) : 0.5;
      const lr = Math.log(10 ** (-6 / 20)), av = -((Math.PI * fc * bw) ** 2) / (4 * lr);   // bwr = -6 dB
      return ret(map(m(a[0]), (t) => Math.exp(-av * t * t) * Math.cos(2 * Math.PI * fc * t)));
    },
    // ── Walsh-Hadamard transform: fwht/ifwht (sequency default; also hadamard/dyadic ordering) ──
    fwht: (a) => {
      const M = m(a[0]), x = nextPow2Pad(toArray(M)), N = x.length, L = Math.round(Math.log2(N));
      const order = a.length > 2 ? asString(a[2]).toLowerCase() : 'sequency', t = whtNat(x).map((v) => v / N);
      const out = new Array(N);
      for (let i = 0; i < N; i++) out[i] = order === 'hadamard' ? t[i] : order === 'dyadic' ? t[bitrev(i, L)] : t[bitrev(i ^ (i >> 1), L)];
      return ret(M.rows === 1 ? rowVec(out) : colVec(out));
    },
    ifwht: (a) => {
      const M = m(a[0]), y = nextPow2Pad(toArray(M)), N = y.length, L = Math.round(Math.log2(N));
      const order = a.length > 2 ? asString(a[2]).toLowerCase() : 'sequency', ynat = new Array(N);
      for (let i = 0; i < N; i++) ynat[order === 'hadamard' ? i : order === 'dyadic' ? bitrev(i, L) : bitrev(i ^ (i >> 1), L)] = y[i];
      const out = whtNat(ynat);
      return ret(M.rows === 1 ? rowVec(out) : colVec(out));
    },
    // ── hilbert(x): analytic signal x + i·H{x} via the one-sided spectrum ──
    hilbert: (a) => {
      const M = m(a[0]), x = toArray(M), N = x.length, Hr = new Array(N), Hi = new Array(N);
      for (let k = 0; k < N; k++) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const ang = -2 * Math.PI * k * n / N; re += x[n] * Math.cos(ang); im += x[n] * Math.sin(ang); } const mult = k === 0 || (N % 2 === 0 && k === N / 2) ? 1 : k < N / 2 ? 2 : 0; Hr[k] = re * mult; Hi[k] = im * mult; }
      const yr = new Float64Array(N), yi = new Float64Array(N);
      for (let n = 0; n < N; n++) { let re = 0, im = 0; for (let k = 0; k < N; k++) { const ang = 2 * Math.PI * k * n / N, c = Math.cos(ang), s = Math.sin(ang); re += Hr[k] * c - Hi[k] * s; im += Hr[k] * s + Hi[k] * c; } yr[n] = re / N; yi[n] = im / N; }
      const col = M.rows !== 1;
      return ret({ kind: 'num', rows: col ? N : 1, cols: col ? 1 : N, data: yr, idata: yi } as Mat);
    },
    // ── real cepstrum: rceps(x) = real(ifft(log|fft(x)|)) ──
    rceps: (a) => {
      const M = m(a[0]), x = toArray(M), N = x.length, logmag = new Array(N);
      for (let k = 0; k < N; k++) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const ang = -2 * Math.PI * k * n / N; re += x[n] * Math.cos(ang); im += x[n] * Math.sin(ang); } logmag[k] = Math.log(Math.hypot(re, im)); }
      const c = new Array(N); for (let n = 0; n < N; n++) { let re = 0; for (let k = 0; k < N; k++) re += logmag[k] * Math.cos(2 * Math.PI * k * n / N); c[n] = re / N; }
      return ret(M.rows === 1 ? rowVec(c) : colVec(c));
    },
    // ── complex cepstrum: cceps(x) = real(ifft(log|H| + i·rcunwrap(angle(H)))) ──
    cceps: (a) => {
      const M = m(a[0]), x = toArray(M), N = x.length, Hr = new Array(N), Hi = new Array(N);
      for (let k = 0; k < N; k++) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const ang = -2 * Math.PI * k * n / N; re += x[n] * Math.cos(ang); im += x[n] * Math.sin(ang); } Hr[k] = re; Hi[k] = im; }
      const ph = new Array(N); ph[0] = Math.atan2(Hi[0], Hr[0]);
      for (let k = 1; k < N; k++) { let d = Math.atan2(Hi[k], Hr[k]) - Math.atan2(Hi[k - 1], Hr[k - 1]); d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); ph[k] = ph[k - 1] + d; }
      const nh = Math.floor((N + 1) / 2), nd = Math.round(ph[nh] / Math.PI);
      for (let k = 0; k < N; k++) ph[k] -= Math.PI * nd * k / nh;
      const c = new Array(N); for (let n = 0; n < N; n++) { let re = 0; for (let k = 0; k < N; k++) { const ang = 2 * Math.PI * k * n / N; re += Math.log(Math.hypot(Hr[k], Hi[k])) * Math.cos(ang) - ph[k] * Math.sin(ang); } c[n] = re / N; }
      return ret(M.rows === 1 ? rowVec(c) : colVec(c));
    },
    // ── DFT matrix: dftmtx(n)[j][k] = exp(-2πi·jk/n) ──
    dftmtx: (a) => {
      const n = Math.round(asScalar(a[0])), re = new Float64Array(n * n), im = new Float64Array(n * n);
      for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) { const ang = -2 * Math.PI * j * k / n; re[j + k * n] = Math.cos(ang); im[j + k * n] = Math.sin(ang); }
      return ret({ kind: 'num', rows: n, cols: n, data: re, idata: im } as Mat);
    },
    // ── multirate: upsample/downsample/intdump/upfirdn ──
    upsample: (a) => {
      const M = m(a[0]), x = toArray(M), n = Math.round(asScalar(a[1])), ph = a.length > 2 ? Math.round(asScalar(a[2])) : 0;
      const out = new Array(n * x.length).fill(0); for (let i = 0; i < x.length; i++) out[i * n + ph] = x[i];
      return ret(M.rows === 1 ? rowVec(out) : colVec(out));
    },
    downsample: (a) => {
      const M = m(a[0]), x = toArray(M), n = Math.round(asScalar(a[1])), ph = a.length > 2 ? Math.round(asScalar(a[2])) : 0;
      const out: number[] = []; for (let j = ph; j < x.length; j += n) out.push(x[j]);
      return ret(M.rows === 1 ? rowVec(out) : colVec(out));
    },
    intdump: (a) => {
      const M = m(a[0]), x = toArray(M), ns = Math.round(asScalar(a[1])), out: number[] = [];
      for (let i = 0; i + ns <= x.length; i += ns) { let s = 0; for (let j = 0; j < ns; j++) s += x[i + j]; out.push(s / ns); }
      return ret(M.rows === 1 ? rowVec(out) : colVec(out));
    },
    upfirdn: (a) => {
      const M = m(a[0]), x = toArray(M), h = toArray(m(a[1])), p = a.length > 2 ? Math.round(asScalar(a[2])) : 1, q = a.length > 3 ? Math.round(asScalar(a[3])) : 1;
      const upLen = (x.length - 1) * p + 1, up = new Array(upLen).fill(0); for (let i = 0; i < x.length; i++) up[i * p] = x[i];
      const y = new Array(upLen + h.length - 1).fill(0); for (let i = 0; i < upLen; i++) for (let k = 0; k < h.length; k++) y[i + k] += up[i] * h[k];
      const out: number[] = []; for (let j = 0; j < y.length; j += q) out.push(y[j]);
      return ret(M.rows === 1 ? rowVec(out) : colVec(out));
    },
    // ── equivalent noise bandwidth of a window: enbw(w)=N*Σw²/(Σw)²; enbw(w,fs)=fs*Σw²/(Σw)² ──
    enbw: (a) => {
      const w = toArray(m(a[0])), sw = w.reduce((s, v) => s + v, 0), sw2 = w.reduce((s, v) => s + v * v, 0);
      const scale = a.length > 1 && isMat(a[1]) ? asScalar(a[1]) : w.length;
      return ret(scalar(scale * sw2 / (sw * sw)));
    },
    // ── pulse metrics (shared/measure engine: histogram state levels + 50% crossings) ──
    statelevels: (a) => { const [L, U] = stateLevelsOf(toArray(m(a[0]))); return ret(rowVec([L, U])); },
    midcross: (a) => { const x = toArray(m(a[0])); const { tm } = midCrossings(x, timeBase(a, x.length)); return ret(colVec(tm)); },
    pulsewidth: (a) => {
      const x = toArray(m(a[0])); const { tm, pol } = midCrossings(x, timeBase(a, x.length));
      const w: number[] = []; for (let i = 0; i + 1 < pol.length; i++) if (pol[i] > 0 && pol[i + 1] < 0) w.push(tm[i + 1] - tm[i]);
      return ret(colVec(w));
    },
    pulseperiod: (a) => {
      const x = toArray(m(a[0])); const { tm, pol } = midCrossings(x, timeBase(a, x.length));
      const pos = tm.filter((_, i) => pol[i] > 0); const p: number[] = []; for (let i = 1; i < pos.length; i++) p.push(pos[i] - pos[i - 1]);
      return ret(colVec(p));
    },
    dutycycle: (a) => {
      const x = toArray(m(a[0])); const { tm, pol } = midCrossings(x, timeBase(a, x.length));
      const w: number[] = [], pos: number[] = [];
      for (let i = 0; i < pol.length; i++) { if (pol[i] > 0) pos.push(tm[i]); if (i + 1 < pol.length && pol[i] > 0 && pol[i + 1] < 0) w.push(tm[i + 1] - tm[i]); }
      const d: number[] = []; for (let i = 0; i < w.length && i + 1 < pos.length; i++) d.push(w[i] / (pos[i + 1] - pos[i]));
      return ret(colVec(d));
    },
    // ── transition metrics (signal.internal.getTransitions: 10%→90% reference crossings) ──
    risetime: (a) => { const x = toArray(m(a[0])); return ret(colVec(transitions(x, timeBase(a, x.length)).filter((d) => d.p > 0).map((d) => d.dur))); },
    falltime: (a) => { const x = toArray(m(a[0])); return ret(colVec(transitions(x, timeBase(a, x.length)).filter((d) => d.p < 0).map((d) => d.dur))); },
    slewrate: (a) => { const x = toArray(m(a[0])); return ret(colVec(transitions(x, timeBase(a, x.length)).map((d) => d.slew))); },
    overshoot: (a) => { const x = toArray(m(a[0])); return ret(colVec(postShoots(x, timeBase(a, x.length)).map((s) => s.os))); },
    undershoot: (a) => { const x = toArray(m(a[0])); return ret(colVec(postShoots(x, timeBase(a, x.length)).map((s) => s.us))); },
    settlingtime: (a) => {
      const x = toArray(m(a[0]));
      const t = a.length >= 3 ? timeBase(a, x.length) : Array.from({ length: x.length }, (_, i) => i + 1);
      const d = asScalar(a[a.length >= 3 ? 2 : 1]);
      return ret(colVec(settling(x, t, d)));
    },
    barthannwin: (a) => window(a, 1, (n, N) => { const r = n / N - 0.5; return 0.62 - 0.48 * Math.abs(r) + 0.38 * Math.cos(2 * Math.PI * r); }),
    gausswin: (a) => { const L = Math.round(asScalar(a[0])); const alpha = a.length >= 2 ? asScalar(a[1]) : 2.5; const N = L - 1; const w: number[] = []; for (let n = 0; n < L; n++) { const x = (n - N / 2) / (N / 2); w.push(Math.exp(-0.5 * (alpha * x) ** 2)); } return ret(colVec(L === 1 ? [1] : w)); },
    kaiser: (a) => { const L = Math.round(asScalar(a[0])); const beta = a.length >= 2 ? asScalar(a[1]) : 0.5; const N = L - 1; const i0b = besselI0(beta); const w: number[] = []; for (let n = 0; n < L; n++) { const r = (2 * n) / N - 1; w.push(besselI0(beta * Math.sqrt(1 - r * r)) / i0b); } return ret(colVec(L === 1 ? [1] : w)); },
    tukeywin: (a) => { const L = Math.round(asScalar(a[0])); const r = a.length >= 2 ? asScalar(a[1]) : 0.5; const N = L - 1; const w: number[] = []; for (let n = 0; n < L; n++) { const x = n / N; if (x < r / 2) w.push(0.5 * (1 + Math.cos(Math.PI * (2 * x / r - 1)))); else if (x <= 1 - r / 2) w.push(1); else w.push(0.5 * (1 + Math.cos(Math.PI * (2 * x / r - 2 / r + 1)))); } return ret(colVec(L === 1 ? [1] : r <= 0 ? new Array(L).fill(1) : w)); },

    // ── dB / magnitude / power conversions ──
    db: (a) => ret(map(m(a[0]), (x) => 20 * Math.log10(Math.abs(x)))),
    mag2db: (a) => ret(map(m(a[0]), (x) => 20 * Math.log10(x))),
    db2mag: (a) => ret(map(m(a[0]), (x) => 10 ** (x / 20))),
    pow2db: (a) => ret(map(m(a[0]), (x) => 10 * Math.log10(x))),
    db2pow: (a) => ret(map(m(a[0]), (x) => 10 ** (x / 10))),

    // ── generators / misc ──
    sinc: (a) => ret(map(m(a[0]), (x) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)))),
    /** chirp(t,f0,t1,f1) — linear swept-frequency cosine, phase 0. */
    chirp: (a) => { const t = m(a[0]); const f0 = a.length >= 2 ? asScalar(a[1]) : 0; const t1 = a.length >= 3 ? asScalar(a[2]) : 1; const f1 = a.length >= 4 ? asScalar(a[3]) : 100; const beta = (f1 - f0) / t1; return ret(map(t, (x) => Math.cos(2 * Math.PI * (f0 * x + 0.5 * beta * x * x)))); },
    /** medfilt1(x[,n]) — 1-D order-n median filter (zero-padded, centered). */
    medfilt1: (a) => {
      const x = toArray(m(a[0])); const n = a.length >= 2 ? Math.round(asScalar(a[1])) : 3; const half = Math.floor(n / 2);
      const out = x.map((_, i) => { const w: number[] = []; for (let k = -half; k <= n - 1 - half; k++) { const j = i + k; w.push(j >= 0 && j < x.length ? x[j] : 0); } w.sort((p, q) => p - q); const mid = w.length / 2; return w.length % 2 ? w[(w.length - 1) / 2] : (w[mid - 1] + w[mid]) / 2; });
      return ret(m(a[0]).rows === 1 ? rowVec(out) : colVec(out));
    },

    // ── filter design & analysis ──
    /** [h,w] = freqz(b[,a][,n]) — digital filter frequency response over w∈[0,π), n points (def 512). */
    freqz: (a, nargout) => {
      const b = toArray(m(a[0])); const den = a.length >= 2 && isMat(a[1]) && (a[1] as Mat).rows * (a[1] as Mat).cols ? toArray(m(a[1])) : [1];
      // 3rd arg: scalar N (num freq pts) or vector w (freq points in rad)
      let wVec: number[] | null = null;
      let N = 512;
      if (a.length >= 3 && isMat(a[2])) {
        const M3 = m(a[2]), sz = M3.rows * M3.cols;
        if (sz === 1) { N = Math.round(asScalar(a[2])); }
        else if (sz > 1) { wVec = toArray(M3); N = sz; }
      }
      const hre = new Float64Array(N), him = new Float64Array(N), w = wVec ?? Array.from({ length: N }, (_, k) => (k * Math.PI) / N);
      for (let k = 0; k < N; k++) { const wk = w[k]; const nz = cpoly(b, wk), dz = cpoly(den, wk); const dn = dz[0] * dz[0] + dz[1] * dz[1]; hre[k] = (nz[0] * dz[0] + nz[1] * dz[1]) / dn; him[k] = (nz[1] * dz[0] - nz[0] * dz[1]) / dn; }
      const h = colVec(Array.from(hre)); h.idata = him;
      return nargout >= 2 ? Promise.resolve([h, colVec(w)]) : ret(h);
    },
    /** h = freqs(b,a,w) — analog filter frequency response H(jw) (b,a in descending powers). */
    freqs: (a) => {
      const b = toArray(m(a[0])), den = toArray(m(a[1])), w = toArray(m(a[2]));
      const hre = new Float64Array(w.length), him = new Float64Array(w.length);
      w.forEach((wk, k) => { const nz = cpolyS(b, wk), dz = cpolyS(den, wk); const dn = dz[0] * dz[0] + dz[1] * dz[1]; hre[k] = (nz[0] * dz[0] + nz[1] * dz[1]) / dn; him[k] = (nz[1] * dz[0] - nz[0] * dz[1]) / dn; });
      const h = (m(a[2]).rows === 1 ? rowVec(Array.from(hre)) : colVec(Array.from(hre))); h.idata = him; return ret(h);
    },
    /** goertzel(x[,freqIndices][,dim]) — DFT of x at 1-based bin indices (default all → fft(x)). */
    goertzel: (a) => {
      const X = m(a[0]); const isCol = X.cols === 1 && X.rows !== 1;
      const xre = toArray(X), xim = X.idata ? Array.from(X.idata) : new Array(xre.length).fill(0);
      const N = xre.length;
      let idx: number[];
      if (a.length >= 2 && isMat(a[1]) && (a[1] as Mat).rows * (a[1] as Mat).cols > 0) idx = toArray(m(a[1])).map((v) => Math.round(v));
      else { idx = []; for (let k = 1; k <= N; k++) idx.push(k); }
      const re = new Float64Array(idx.length), im = new Float64Array(idx.length);
      idx.forEach((ix, j) => { const k = ix - 1; let sr = 0, si = 0; for (let n = 0; n < N; n++) { const th = (-2 * Math.PI * k * n) / N, c = Math.cos(th), s = Math.sin(th); sr += xre[n] * c - xim[n] * s; si += xre[n] * s + xim[n] * c; } re[j] = sr; im[j] = si; });
      const out = (isCol ? colVec(Array.from(re)) : rowVec(Array.from(re))); out.idata = im; return ret(out);
    },
    /** czt(x[,m][,w][,a]) — chirp-Z transform; defaults m=N, w=exp(-2πi/m), a=1 → fft(x). */
    czt: (a) => {
      const X = m(a[0]); const isCol = X.cols === 1 && X.rows !== 1;
      const xre = toArray(X), xim = X.idata ? Array.from(X.idata) : new Array(xre.length).fill(0);
      const N = xre.length;
      const M = a.length >= 2 && isMat(a[1]) && (a[1] as Mat).rows * (a[1] as Mat).cols > 0 ? Math.round(asScalar(a[1])) : N;
      const cs = (v: Value): [number, number] => { const W = m(v); return [W.data[0], W.idata ? W.idata[0] : 0]; };
      const [wr, wi] = a.length >= 3 && isMat(a[2]) ? cs(a[2]) : [Math.cos(-2 * Math.PI / M), Math.sin(-2 * Math.PI / M)];
      const [ar, ai] = a.length >= 4 && isMat(a[3]) ? cs(a[3]) : [1, 0];
      const cpow = (re: number, ie: number, p: number): [number, number] => { const r = Math.hypot(re, ie), ph = Math.atan2(ie, re); const rp = r ** p, pp = ph * p; return [rp * Math.cos(pp), rp * Math.sin(pp)]; };
      const re = new Float64Array(M), im = new Float64Array(M);
      for (let k = 0; k < M; k++) {
        let sr = 0, si = 0;
        for (let n = 0; n < N; n++) {
          const [anr, ani] = cpow(ar, ai, -n);        // a^(-n)
          const [wnr, wni] = cpow(wr, wi, n * k);      // w^(n*k)
          let tr = xre[n] * anr - xim[n] * ani, ti = xre[n] * ani + xim[n] * anr;
          const ntr = tr * wnr - ti * wni, nti = tr * wni + ti * wnr; tr = ntr; ti = nti;
          sr += tr; si += ti;
        }
        re[k] = sr; im[k] = si;
      }
      const out = (isCol ? colVec(Array.from(re)) : rowVec(Array.from(re))); out.idata = im; return ret(out);
    },
    /** fir1(n,Wn) — windowed-sinc lowpass FIR (length n+1, Hamming window, unity DC gain). */
    fir1: (a) => {
      const n = Math.round(asScalar(a[0])); const Wn = asScalar(a[1]); const M = n / 2;
      const h = new Array(n + 1); for (let k = 0; k <= n; k++) { const x = k - M; h[k] = (x === 0 ? Wn : Math.sin(Wn * Math.PI * x) / (Math.PI * x)) * (0.54 - 0.46 * Math.cos((2 * Math.PI * k) / n)); }
      const s = h.reduce((p, q) => p + q, 0); return ret(rowVec(h.map((v) => v / s)));
    },
    /** filternorm(b,a[,pnorm]) — Lp norm of a digital filter (FIR/stable IIR). pnorm = 2 (def) or Inf. */
    filternorm: (a) => {
      const b = toArray(m(a[0])), den = a.length >= 2 && isMat(a[1]) && m(a[1]).rows * m(a[1]).cols ? toArray(m(a[1])) : [1];
      const pnorm = a.length >= 3 && isMat(a[2]) ? asScalar(a[2]) : 2;
      const tol = a.length >= 4 && isMat(a[3]) ? asScalar(a[3]) : 1e-8;
      const isFIR = den.length === 1 || den.slice(1).every((v) => v === 0);
      if (!isFinite(pnorm)) {
        // inf-norm = max magnitude of freqz over 1024 points on [0,π)
        const N = 1024; let mx = 0;
        for (let k = 0; k < N; k++) { const w = k * Math.PI / N, nz = cpoly(b, w), dz = cpoly(den, w); const dn = dz[0] * dz[0] + dz[1] * dz[1]; const hr = (nz[0] * dz[0] + nz[1] * dz[1]) / dn, hi = (nz[1] * dz[0] - nz[0] * dz[1]) / dn; const mag = Math.hypot(hr, hi); if (mag > mx) mx = mag; }
        return ret(scalar(mx));
      }
      // pnorm = 2
      if (isFIR) return ret(scalar(Math.sqrt(b.reduce((s, v) => s + v * v, 0))));
      // IIR: sum-of-squares of a finite impulse-response approximation (impz, length via tol)
      const a0 = den[0], bn = b.map((v) => v / a0), an = den.map((v) => v / a0);
      // impulse response via direct-form recursion; run until tail energy negligible
      let acc = 0, maxLen = 200000, h: number[] = [], stableTail = 0;
      for (let nIdx = 0; nIdx < maxLen; nIdx++) {
        let y = nIdx < bn.length ? bn[nIdx] : 0;
        for (let i = 1; i < an.length; i++) if (nIdx - i >= 0) y -= an[i] * h[nIdx - i];
        h.push(y); acc += y * y;
        if (nIdx > bn.length && Math.abs(y) < tol * Math.sqrt(Math.max(acc, 1e-300))) { stableTail++; if (stableTail > an.length + 5) break; } else stableTail = 0;
      }
      return ret(scalar(Math.sqrt(acc)));
    },
    /** [s,g] = cell2sos(c) — cell array of {b,a} sections → L×6 second-order-section matrix. */
    cell2sos: (a, nargout) => {
      const C = a[0]; if (!isCell(C)) return ret(zeros(0, 6));
      let items = (C as Cell).items.slice(); let g = 1;
      if (nargout >= 2) {
        const c1 = items[0]; if (isCell(c1)) { const inner = (c1 as Cell).items; const bb = m(inner[0]), aa = m(inner[1]); if (bb.rows * bb.cols === 1 && aa.rows * aa.cols === 1) { g = asScalar(inner[0]) / asScalar(inner[1]); items = items.slice(1); } }
      }
      const rows: number[][] = [];
      for (const it of items) { if (!isCell(it)) continue; const inner = (it as Cell).items; const b = toArray(m(inner[0])).slice(0, 3), av = toArray(m(inner[1])).slice(0, 3); while (b.length < 3) b.push(0); while (av.length < 3) av.push(0); rows.push([...b, ...av]); }
      const s = rowsToMat(rows);
      return Promise.resolve(nargout >= 2 ? [s, scalar(g)] : [s]);
    },
    /** [b,a] = sos2ctf(sos[,g]) — second-order sections → cascaded transfer-function numerators/denominators. */
    sos2ctf: (a, nargout) => {
      const S = m(a[0]), K = S.rows;
      const bU: number[][] = [], aRows: number[][] = [];
      for (let i = 0; i < K; i++) { bU.push([S.data[i], S.data[i + K], S.data[i + 2 * K]]); aRows.push([S.data[i + 3 * K], S.data[i + 4 * K], S.data[i + 5 * K]]); }
      let b = bU;
      if (a.length >= 2 && isMat(a[1])) {
        const sv = toArray(m(a[1]));
        if (!sv.every((v) => v === 1)) {
          const p = K;
          if (sv.length === 1) {
            const s0 = sv[0], f = Math.pow(Math.abs(s0), 1 / p);
            b = bU.map((row) => row.map((v) => v * f));
            const sgn = Math.sign(s0); b[K - 1] = b[K - 1].map((v) => v * sgn);
          } else {
            const last = sv[K], fl = Math.pow(Math.abs(last), 1 / p);
            b = bU.map((row, i) => row.map((v) => fl * sv[i] * v));
            const sgn = Math.sign(last); b[K - 1] = b[K - 1].map((v) => v * sgn);
          }
        }
      }
      return Promise.resolve(nargout >= 2 ? [rowsToMat(b), rowsToMat(aRows)] : [rowsToMat(b)]);
    },
    /** [N,Wn,beta,ftype] = kaiserord(fcuts,mags,devs[,fs]) — Kaiser-window FIR order estimate. */
    kaiserord: (a, nargout) => {
      const fcuts = toArray(m(a[0])), mags = toArray(m(a[1])), devs0 = toArray(m(a[2]));
      const fsamp = a.length >= 4 && isMat(a[3]) ? asScalar(a[3]) : 2;
      const fc = fcuts.map((v) => v / fsamp);                 // normalize
      const mf = fc.length, nbands = mags.length;
      const stop = mags.map((v) => (v === 0 ? 1 : 0));
      const devs = devs0.map((d, i) => d / (stop[i] + mags[i]));
      const f1: number[] = [], f2: number[] = [];
      for (let i = 0; i < mf - 1; i += 2) f1.push(fc[i]);
      for (let i = 1; i < mf; i += 2) f2.push(fc[i]);
      let L = 0, bta = 0;
      if (nbands === 2) { const r = kaislpord(f1[0], f2[0], devs[0], devs[1]); L = r.L; bta = r.bta; }
      else {
        for (let i = 1; i < nbands - 1; i++) {
          const r1 = kaislpord(f1[i - 1], f2[i - 1], devs[i], devs[i - 1]);
          const r2 = kaislpord(f1[i], f2[i], devs[i], devs[i + 1]);
          if (r1.L > L) { bta = r1.bta; L = r1.L; }
          if (r2.L > L) { bta = r2.bta; L = r2.L; }
        }
      }
      let N = Math.ceil(L) - 1;
      const Wn = f1.map((v, i) => 2 * (v + f2[i]) / 2);
      let ftype = 'low';
      if (nbands === 2 && mags[0] === 0) ftype = 'high';
      else if (nbands === 3 && mags[1] === 0) ftype = 'stop';
      else if (nbands >= 3 && mags[0] === 0) ftype = 'DC-0';
      else if (nbands >= 3 && mags[0] === 1) ftype = 'DC-1';
      if (N % 2 === 1 && mags[mags.length - 1] !== 0) N += 1;
      const WnV = Wn.length === 1 ? scalar(Wn[0]) : rowVec(Wn);
      const ft: Value = { kind: 'num', rows: 1, cols: ftype.length, data: Float64Array.from([...ftype].map((c) => c.charCodeAt(0))), isChar: true };
      return Promise.resolve(nargout >= 4 ? [scalar(N), WnV, scalar(bta), ft] : nargout >= 3 ? [scalar(N), WnV, scalar(bta)] : nargout >= 2 ? [scalar(N), WnV] : [scalar(N)]);
    },

    // ── linear prediction (LPC) ──
    /** [a,e,k] = levinson(r[,p]) — Levinson-Durbin solution of the normal equations. */
    levinson: (a, nargout) => { const r = toArray(m(a[0])); const p = a.length >= 2 && isMat(a[1]) ? Math.round(asScalar(a[1])) : r.length - 1; const res = levinsonDurbin(r, p); return nargout >= 3 ? Promise.resolve([rowVec(res.a), scalar(res.e), colVec(res.k)]) : nargout >= 2 ? Promise.resolve([rowVec(res.a), scalar(res.e)]) : ret(rowVec(res.a)); },
    /** [a,efinal] = ac2poly(r) — autocorrelation → prediction polynomial. */
    ac2poly: (a, nargout) => { const r = toArray(m(a[0])); const res = levinsonDurbin(r, r.length - 1); return nargout >= 2 ? Promise.resolve([rowVec(res.a), scalar(res.e)]) : ret(rowVec(res.a)); },
    /** r = poly2ac(a,efinal) — prediction polynomial + final error → autocorrelation. */
    poly2ac: (a) => ret(colVec(poly2acSeq(toArray(m(a[0])), a.length >= 2 && isMat(a[1]) ? asScalar(a[1]) : 1))),
    /** k = poly2rc(a) — prediction polynomial → reflection coefficients (step-down). */
    poly2rc: (a) => ret(colVec(stepDown(toArray(m(a[0]))).k)),
    /** a = rc2poly(k) — reflection coefficients → prediction polynomial (step-up). */
    rc2poly: (a) => ret(rowVec(stepUp(toArray(m(a[0]))))),
    /** [k,R0] = ac2rc(R) — autocorrelation → reflection coefficients (via levinson) and R0. */
    ac2rc: (a, nargout) => { const R = toArray(m(a[0])); const { k } = levinsonDurbin(R, R.length - 1); return Promise.resolve(nargout >= 2 ? [colVec(k), scalar(R[0])] : [colVec(k)]); },
    /** rc2is(k) — reflection coefficients → inverse sine parameters: (2/π)·asin(k). */
    rc2is: (a) => ret(map(m(a[0]), (k) => (2 / Math.PI) * Math.asin(k))),

    // ── IIR design / zero-phase filtering / peak finding ──
    /** [z,p,k] = buttap(n) — Butterworth analog lowpass prototype. */
    buttap: (a, nargout) => {
      const n = Math.round(asScalar(a[0])); const { z, p, k } = buttap(n);
      const pCol = colVec(p.map((c) => c[0])); pCol.idata = Float64Array.from(p.map((c) => c[1]));
      return Promise.resolve(nargout >= 3 ? [zeros(0, 1), pCol, scalar(k)] : nargout >= 2 ? [zeros(0, 1), pCol] : [zeros(0, 1)]);
    },
    /** [b,a] = butter(n,Wn[,ftype]) — Butterworth IIR filter design (lowpass/highpass, digital). */
    butter: (a, nargout) => {
      const n = Math.round(asScalar(a[0])); const Wn = asScalar(a[1]);
      const ftype = a.length >= 3 && (isStr(a[2]) || (isMat(a[2]) && (a[2] as Mat).isChar)) ? asString(a[2]).toLowerCase() : '';
      const high = ftype.startsWith('high');
      // step 1: prewarp (fs = 2)
      const fs = 2; const u = 2 * fs * Math.tan((Math.PI * Wn) / fs);
      // step 2: analog prototype
      let { z, p, k } = buttap(n);
      // step 3: transform to lowpass/highpass of cutoff u
      ({ z, p, k } = high ? lp2hpZpk(z, p, k, u) : lp2lpZpk(z, p, k, u));
      // step 4: bilinear → digital
      ({ z, p, k } = bilinearZpk(z, p, k, fs));
      const { b, a: den } = zpk2tf(z, p, k);
      return Promise.resolve(nargout >= 2 ? [rowVec(b), rowVec(den)] : [rowVec(b)]);
    },
    /** y = filtfilt(b,a,x) — zero-phase forward-reverse IIR filtering (edge-reflection + steady-state zi). */
    filtfilt: (a) => {
      const b = toArray(m(a[0])), den = toArray(m(a[1])); const X = m(a[2]); const isRow = X.rows === 1;
      const x = toArray(X);
      const ord = Math.max(effLen(b), effLen(den)) - 1;
      const nfact = Math.max(1, 3 * ord);
      if (x.length <= nfact) return ret(isRow ? rowVec(x.slice()) : colVec(x.slice()));
      const zi = filtfiltZi(b, den);
      // reflect: 2*x(1)-x(nfact+1:-1:2) ... x ... 2*x(end)-x(end-1:-1:end-nfact)
      const ext: number[] = [];
      for (let i = nfact; i >= 1; i--) ext.push(2 * x[0] - x[i]);
      for (const v of x) ext.push(v);
      for (let i = 1; i <= nfact; i++) ext.push(2 * x[x.length - 1] - x[x.length - 1 - i]);
      // forward
      const ziF = zi.map((v) => v * ext[0]);
      let yt = filterDf2t(b, den, ext, ziF).y;
      // reverse
      yt.reverse();
      const ziR = zi.map((v) => v * yt[0]);
      yt = filterDf2t(b, den, yt, ziR).y;
      yt.reverse();
      const y = yt.slice(nfact, nfact + x.length);
      return ret(isRow ? rowVec(y) : colVec(y));
    },
    /** [pks,locs] = findpeaks(y[,x]) — local maxima with MinPeakHeight/Prominence/Distance, NPeaks, SortStr. */
    findpeaks: (a, nargout) => {
      const Y = m(a[0]); const yIsRow = Y.rows === 1; const y = toArray(Y);
      // optional x / Fs as the first positional arg (numeric, non-string)
      let argStart = 1; let x: number[] = y.map((_, i) => i + 1);
      if (a.length >= 2 && isMat(a[1]) && !(a[1] as Mat).isChar) {
        const xv = toArray(m(a[1]));
        x = xv.length === 1 ? y.map((_, i) => i / xv[0]) : xv;   // scalar ⇒ Fs
        argStart = 2;
      }
      // name/value options
      let minH = -Infinity, minP = 0, minD = 0, maxN = Infinity, sortStr = 'none';
      for (let i = argStart; i + 1 < a.length; i += 2) {
        const name = asString(a[i]).toLowerCase(); const val = a[i + 1];
        if (name === 'minpeakheight') minH = asScalar(val);
        else if (name === 'minpeakprominence') minP = asScalar(val);
        else if (name === 'minpeakdistance') minD = asScalar(val);
        else if (name === 'npeaks') maxN = Math.round(asScalar(val));
        else if (name === 'sortstr') sortStr = asString(val).toLowerCase();
      }
      // all local maxima (first index of plateaus); bookend by NaN (signal/findpeaks.m findLocalMaxima)
      let iPk: number[] = [];
      const yb = [NaN, ...y, NaN];                       // 1..length(yb) map to iTemp
      // keep first of any adjacent-equal pair (including NaN==NaN) where at least one is finite
      const iTemp: number[] = [0];
      for (let i = 1; i < yb.length; i++) {
        const fin = !Number.isNaN(yb[i - 1]) || !Number.isNaN(yb[i]);
        if (yb[i - 1] !== yb[i] && fin) iTemp.push(i);
      }
      // s = sign(diff(yTemp(iTemp))); NaN stays NaN so transitions to NaN are not falling
      const s = iTemp.slice(1).map((idx, k) => Math.sign(yb[idx] - yb[iTemp[k]]));
      // iMax: positions where diff(s) < 0 (NaN comparisons are false)
      for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] < 0) iPk.push(iTemp[i] - 1);   // -1 removes NaN bookend
      // MinPeakHeight: strictly greater than threshold
      iPk = iPk.filter((j) => y[j] > minH);
      // MinPeakProminence
      if (minP > 0) {
        iPk = iPk.filter((j) => {
          let leftMin = y[j]; for (let i = j - 1; i >= 0; i--) { if (y[i] > y[j]) break; if (y[i] < leftMin) leftMin = y[i]; }
          let rightMin = y[j]; for (let i = j + 1; i < y.length; i++) { if (y[i] > y[j]) break; if (y[i] < rightMin) rightMin = y[i]; }
          return y[j] - Math.max(leftMin, rightMin) >= minP;
        });
      }
      // MinPeakDistance: greedily keep larger peaks, suppress neighbors within Pd (in x-units)
      if (minD > 0 && iPk.length) {
        const order = iPk.map((p2, i) => i).sort((p2, q) => y[iPk[q]] - y[iPk[p2]]);  // descending by height
        const locs = iPk.map((p2) => x[p2]);
        const del = new Array(iPk.length).fill(false);
        for (const i of order) {
          if (del[i]) continue;
          for (let jj = 0; jj < iPk.length; jj++) if (jj !== i && locs[jj] >= locs[i] - minD && locs[jj] <= locs[i] + minD) del[jj] = true;
        }
        iPk = iPk.filter((_, i) => !del[i]);
      }
      // SortStr
      if (sortStr.startsWith('a')) iPk.sort((p2, q) => y[p2] - y[q]);
      else if (sortStr.startsWith('d')) iPk.sort((p2, q) => y[q] - y[p2]);
      // NPeaks (after sort; for default 'none', take first maxN in index order)
      if (iPk.length > maxN) iPk = iPk.slice(0, maxN);
      const pks = iPk.map((j) => y[j]); const locs = iPk.map((j) => x[j]);
      const mk = (v: number[]) => (yIsRow ? rowVec(v) : colVec(v));
      return Promise.resolve(nargout >= 2 ? [mk(pks), mk(locs)] : [mk(pks)]);
    },

    // ── Savitzky-Golay ──
    /** B = sgolay(order,framelen) — Savitzky-Golay FIR projection matrix. */
    sgolay: (a) => { const order = Math.round(asScalar(a[0])), F = Math.round(asScalar(a[1])); const B = sgolayMat(order, F); const o = { kind: 'num' as const, rows: F, cols: F, data: new Float64Array(F * F) } as Mat; for (let i = 0; i < F; i++) for (let j = 0; j < F; j++) o.data[i + j * F] = B[i][j]; return ret(o); },
    /** sgolayfilt(x,order,framelen) — Savitzky-Golay smoothing (steady-state center row + edge rows). */
    sgolayfilt: (a) => {
      const x = toArray(m(a[0])); const order = Math.round(asScalar(a[1])), F = Math.round(asScalar(a[2])); const mid = (F - 1) / 2; const B = sgolayMat(order, F); const n = x.length; const y = new Array(n).fill(0);
      for (let i = mid; i < n - mid; i++) { let s = 0; for (let j = 0; j < F; j++) s += B[mid][j] * x[i - mid + j]; y[i] = s; }
      for (let i = 0; i < mid; i++) { let s = 0; for (let j = 0; j < F; j++) s += B[i][j] * x[j]; y[i] = s; }
      for (let i = n - mid; i < n; i++) { const rrow = i - n + F; let s = 0; for (let j = 0; j < F; j++) s += B[rrow][j] * x[n - F + j]; y[i] = s; }
      return ret(m(a[0]).rows === 1 ? rowVec(y) : colVec(y));
    },

    // ── cconv(a,b[,n]) — modulo-n circular convolution (n defaults to la+lb-1, i.e. linear conv) ──
    cconv: (a) => {
      const A = m(a[0]), B = m(a[1]), av = toArray(A), bv = toArray(B);
      const la = av.length, lb = bv.length;
      const n = a.length >= 3 && isMat(a[2]) ? Math.round(asScalar(a[2])) : la + lb - 1;
      const out = new Array(Math.max(0, n)).fill(0);
      for (let i = 0; i < la; i++) for (let j = 0; j < lb; j++) out[(i + j) % n] += av[i] * bv[j];
      // orientation: row unless either operand is a (non-scalar) column vector
      const col = (A.cols === 1 && A.rows > 1) || (B.cols === 1 && B.rows > 1);
      return ret(col ? colVec(out) : rowVec(out));
    },

    // ── envelope(x) analytic: [yupper,ylower] = mean(x) ± |hilbert(x-mean(x))| ──
    envelope: (a, nargout) => {
      const X = m(a[0]), x = toArray(X), N = x.length, isRow = X.rows === 1;
      // method string (last char arg); only 'analytic' single-arg path is validated here
      const method = a.length >= 3 && (isStr(a[2]) || (isMat(a[2]) && (a[2] as Mat).isChar)) ? asString(a[2]).toLowerCase() : 'analytic';
      if (!method.startsWith('a')) throw new Error("cconv/envelope: only the analytic (single-argument) envelope method is supported");
      if (a.length >= 2 && isMat(a[1])) throw new Error("envelope: the FIR-length analytic envelope (envelope(x,n)) is not supported");
      const xmean = x.reduce((s, v) => s + v, 0) / N;
      const xc = x.map((v) => v - xmean);
      // analytic signal via the one-sided spectrum (same scheme as the hilbert builtin)
      const Hr = new Array(N), Hi = new Array(N);
      for (let k = 0; k < N; k++) { let re = 0, im = 0; for (let nn = 0; nn < N; nn++) { const ang = -2 * Math.PI * k * nn / N; re += xc[nn] * Math.cos(ang); im += xc[nn] * Math.sin(ang); } const mult = k === 0 || (N % 2 === 0 && k === N / 2) ? 1 : k < N / 2 ? 2 : 0; Hr[k] = re * mult; Hi[k] = im * mult; }
      const amp = new Array(N);
      for (let nn = 0; nn < N; nn++) { let re = 0, im = 0; for (let k = 0; k < N; k++) { const ang = 2 * Math.PI * k * nn / N, c = Math.cos(ang), s = Math.sin(ang); re += Hr[k] * c - Hi[k] * s; im += Hr[k] * s + Hi[k] * c; } amp[nn] = Math.hypot(re / N, im / N); }
      const yu = amp.map((v) => xmean + v), yl = amp.map((v) => xmean - v);
      const mk = (v: number[]): Value => (isRow ? rowVec(v) : colVec(v));
      return Promise.resolve(nargout >= 2 ? [mk(yu), mk(yl)] : [mk(yu)]);
    },

    // ── [b,a] = cheby1(n,Rp,Wp[,ftype]) — Chebyshev Type I IIR (lowpass/highpass, digital) ──
    cheby1: (a, nargout) => {
      const n = Math.round(asScalar(a[0])); const Rp = asScalar(a[1]); const Wp = asScalar(a[2]);
      const ftype = a.length >= 4 && (isStr(a[3]) || (isMat(a[3]) && (a[3] as Mat).isChar)) ? asString(a[3]).toLowerCase() : '';
      const high = ftype.startsWith('high');
      const fs = 2; const u = 2 * fs * Math.tan((Math.PI * Wp) / fs);   // prewarp
      let { z, p, k } = cheb1ap(n, Rp);                                  // analog prototype
      ({ z, p, k } = high ? lp2hpZpk(z, p, k, u) : lp2lpZpk(z, p, k, u));
      ({ z, p, k } = bilinearZpk(z, p, k, fs));                          // → digital
      const { b, a: den } = zpk2tf(z, p, k);
      return Promise.resolve(nargout >= 2 ? [rowVec(b), rowVec(den)] : [rowVec(b)]);
    },
    // ── [b,a] = cheby2(n,Rs,Ws[,ftype]) — Chebyshev Type II IIR (lowpass/highpass, digital) ──
    cheby2: (a, nargout) => {
      const n = Math.round(asScalar(a[0])); const Rs = asScalar(a[1]); const Ws = asScalar(a[2]);
      const ftype = a.length >= 4 && (isStr(a[3]) || (isMat(a[3]) && (a[3] as Mat).isChar)) ? asString(a[3]).toLowerCase() : '';
      const high = ftype.startsWith('high');
      const fs = 2; const u = 2 * fs * Math.tan((Math.PI * Ws) / fs);    // prewarp
      let { z, p, k } = cheb2ap(n, Rs);                                  // analog prototype
      ({ z, p, k } = high ? lp2hpZpk(z, p, k, u) : lp2lpZpk(z, p, k, u));
      ({ z, p, k } = bilinearZpk(z, p, k, fs));                          // → digital
      const { b, a: den } = zpk2tf(z, p, k);
      return Promise.resolve(nargout >= 2 ? [rowVec(b), rowVec(den)] : [rowVec(b)]);
    },
    // ── [b,a] = ellip(n,Rp,Rs,Wp[,ftype]) — elliptic IIR (lowpass/highpass, digital) ──
    ellip: (a, nargout) => {
      const n = Math.round(asScalar(a[0])); const Rp = asScalar(a[1]); const Rs = asScalar(a[2]); const Wp = asScalar(a[3]);
      const ftype = a.length >= 5 && (isStr(a[4]) || (isMat(a[4]) && (a[4] as Mat).isChar)) ? asString(a[4]).toLowerCase() : '';
      const high = ftype.startsWith('high');
      const fs = 2; const u = 2 * fs * Math.tan((Math.PI * Wp) / fs);    // prewarp
      let { z, p, k } = ellipap(n, Rp, Rs);                             // analog prototype
      ({ z, p, k } = high ? lp2hpZpk(z, p, k, u) : lp2lpZpk(z, p, k, u));
      ({ z, p, k } = bilinearZpk(z, p, k, fs));                          // → digital
      const { b, a: den } = zpk2tf(z, p, k);
      return Promise.resolve(nargout >= 2 ? [rowVec(b), rowVec(den)] : [rowVec(b)]);
    },
    // ── b = fir2(n,f,m[,npt][,lap][,window]) — frequency-sampled FIR via inverse FFT + window ──
    fir2: (a) => {
      let nn = Math.round(asScalar(a[0])); const ff = toArray(m(a[1])).slice(); const aa = toArray(m(a[2])).slice();
      nn = nn + 1;                                       // filter length
      let npt = nn < 1024 ? 512 : 2 ** Math.ceil(Math.log(nn) / Math.log(2));
      const lap = Math.trunc(npt / 25);
      const wind = a.length >= 6 && isMat(a[5]) ? toArray(m(a[5])) : hammingWin(nn);
      const nbrk = aa.length; ff[0] = 0; ff[nbrk - 1] = 1;
      const df: number[] = []; for (let i = 0; i + 1 < nbrk; i++) df.push(ff[i + 1] - ff[i]);
      const nint = nbrk - 1; const nptp = npt + 1;       // length of [dc..nyquist]
      const H = new Array(nptp).fill(0); let nb = 1; H[0] = aa[0];        // 1-indexed conceptually
      for (let i = 0; i < nint; i++) {
        let ne: number;
        if (df[i] === 0) { nb = Math.ceil(nb - lap / 2); ne = nb + lap; }
        else ne = Math.trunc(ff[i + 1] * nptp);
        for (let j = nb; j <= ne; j++) { const inc = nb === ne ? 0 : (j - nb) / (ne - nb); H[j - 1] = inc * aa[i + 1] + (1 - inc) * aa[i]; }
        nb = ne + 1;
      }
      // apply linear phase delay dt = 0.5*(nn-1)
      const dt = 0.5 * (nn - 1); const Hr = new Array(nptp), Hi = new Array(nptp);
      for (let kk = 0; kk < nptp; kk++) { const ang = -dt * Math.PI * kk / (nptp - 1); Hr[kk] = H[kk] * Math.cos(ang); Hi[kk] = H[kk] * Math.sin(ang); }
      // mirror to full spectrum (conj of H(npt-1:-1:2) in 1-index → indices nptp-2..1)
      const fullR = Hr.slice(), fullI = Hi.slice();
      for (let kk = nptp - 2; kk >= 1; kk--) { fullR.push(Hr[kk]); fullI.push(-Hi[kk]); }
      const Nf = fullR.length; const ht = idftCol(fullR, fullI, Nf).re;
      const b = new Array(nn); for (let i = 0; i < nn; i++) b[i] = ht[i] * wind[i];
      return ret(rowVec(b));
    },
    // ── [n,Wn] = buttord(Wp,Ws,Rp,Rs) — Butterworth order estimate (lowpass/highpass digital) ──
    buttord: (a, nargout) => {
      const wp = asScalar(a[0]), ws = asScalar(a[1]), rp = asScalar(a[2]), rs = asScalar(a[3]);
      const high = wp >= ws;
      const WP = Math.tan((Math.PI * wp) / 2), WS = Math.tan((Math.PI * ws) / 2);
      const WA = Math.abs(high ? WP / WS : WS / WP);
      const order = Math.ceil(Math.log10((10 ** (0.1 * Math.abs(rs)) - 1) / (10 ** (0.1 * Math.abs(rp)) - 1)) / (2 * Math.log10(WA)));
      const W0 = WA / (10 ** (0.1 * Math.abs(rs)) - 1) ** (1 / (2 * Math.abs(order)));
      const WN = high ? WP / W0 : W0 * WP;
      const wn = (2 / Math.PI) * Math.atan(WN);
      return Promise.resolve(nargout >= 2 ? [scalar(order), scalar(wn)] : [scalar(order)]);
    },
    // ── [n,Wn] = cheb1ord(Wp,Ws,Rp,Rs) — Chebyshev I order estimate (lowpass/highpass digital) ──
    cheb1ord: (a, nargout) => {
      const wp = asScalar(a[0]), ws = asScalar(a[1]), rp = asScalar(a[2]), rs = asScalar(a[3]);
      const high = wp >= ws;
      const WPA = Math.tan((Math.PI * wp) / 2), WSA = Math.tan((Math.PI * ws) / 2);
      const WA = Math.abs(high ? WPA / WSA : WSA / WPA);
      const order = Math.ceil(Math.acosh(Math.sqrt((10 ** (0.1 * Math.abs(rs)) - 1) / (10 ** (0.1 * Math.abs(rp)) - 1))) / Math.acosh(WA));
      return Promise.resolve(nargout >= 2 ? [scalar(order), scalar(wp)] : [scalar(order)]);
    },
    // ── [n,Wn] = cheb2ord(Wp,Ws,Rp,Rs) — Chebyshev II order estimate (lowpass/highpass digital) ──
    cheb2ord: (a, nargout) => {
      const wp = asScalar(a[0]), ws = asScalar(a[1]), rp = asScalar(a[2]), rs = asScalar(a[3]);
      const high = wp >= ws;
      const WPA = Math.tan((Math.PI * wp) / 2), WSA = Math.tan((Math.PI * ws) / 2);
      const WA = Math.abs(high ? WPA / WSA : WSA / WPA);
      const order = Math.ceil(Math.acosh(Math.sqrt((10 ** (0.1 * Math.abs(rs)) - 1) / (10 ** (0.1 * Math.abs(rp)) - 1))) / Math.acosh(WA));
      // wn = ws (the digital stopband edge) per cheb2ord.m
      return Promise.resolve(nargout >= 2 ? [scalar(order), scalar(ws)] : [scalar(order)]);
    },
    // ── [n,Wn] = ellipord(Wp,Ws,Rp,Rs) — elliptic order estimate (lowpass/highpass digital) ──
    ellipord: (a, nargout) => {
      const wp = asScalar(a[0]), ws = asScalar(a[1]), rp = asScalar(a[2]), rs = asScalar(a[3]);
      const high = wp >= ws;
      const WP = Math.tan((Math.PI * wp) / 2), WS = Math.tan((Math.PI * ws) / 2);
      const WA = Math.abs(high ? WP / WS : WS / WP);
      const epsilon = Math.sqrt(10 ** (0.1 * rp) - 1);
      const k1 = epsilon / Math.sqrt(10 ** (0.1 * rs) - 1);
      const kk = 1 / WA;
      const [capk, capkp] = ellipkPair(kk);              // ellipke([k^2 1-k^2]) -> K(k),K(k')
      const [capk1, capk1p] = ellipkPair(k1);
      const order = Math.ceil((capk * capk1p) / (capkp * capk1));
      return Promise.resolve(nargout >= 2 ? [scalar(order), scalar(wp)] : [scalar(order)]);
    },

    // ── TIER 1 additions ─────────────────────────────────────────────────────

    // fftfilt(b,x[,nfft]): FIR filtering via overlap-add FFT.
    fftfilt: (a) => {
      const b = toArray(m(a[0])), X = m(a[1]), x = toArray(X), Lb = b.length, Lx = x.length;
      // choose nfft: next power of 2 covering Lb, with block size heuristic
      const nfft = a.length >= 3 ? Math.max(Math.round(asScalar(a[2])), 2 ** Math.ceil(Math.log2(Lb))) : (() => {
        const blk = Math.max(1, 8 * Lb);
        return 2 ** Math.ceil(Math.log2(Lb + blk - 1));
      })();
      // DFT of zero-padded b
      const Br: number[] = new Array(nfft).fill(0);
      for (let i = 0; i < Lb; i++) Br[i] = b[i];
      const Bfft = t1_naiveDFT(Br, new Array(nfft).fill(0), nfft);
      const step = nfft - Lb + 1;
      const out: number[] = new Array(Lx).fill(0);
      for (let pos = 0; pos < Lx; pos += step) {
        const end = Math.min(pos + step, Lx);
        const xr: number[] = new Array(nfft).fill(0);
        for (let i = pos; i < end; i++) xr[i - pos] = x[i];
        const Xfft = t1_naiveDFT(xr, new Array(nfft).fill(0), nfft);
        const Yr: number[] = new Array(nfft), Yi: number[] = new Array(nfft);
        for (let k = 0; k < nfft; k++) { Yr[k] = Bfft.re[k] * Xfft.re[k] - Bfft.im[k] * Xfft.im[k]; Yi[k] = Bfft.re[k] * Xfft.im[k] + Bfft.im[k] * Xfft.re[k]; }
        const y = t1_naiveIDFT(Yr, Yi, nfft).re;
        for (let i = 0; i < nfft && pos + i < Lx; i++) out[pos + i] += y[i];
      }
      return ret(X.rows === 1 ? rowVec(out) : colVec(out));
    },

    // phasez(b,a[,n]): unwrapped phase response [phi,w] over n points in [0,pi).
    phasez: (a, nargout) => {
      const b = toArray(m(a[0]));
      const den = a.length >= 2 && isMat(a[1]) ? toArray(m(a[1])) : [1];
      const N = a.length >= 3 ? Math.round(asScalar(a[2])) : 512;
      const phi: number[] = [], w: number[] = [];
      for (let k = 0; k < N; k++) {
        const wk = (k * Math.PI) / N; w.push(wk);
        const nz = cpoly(b, wk), dz = cpoly(den, wk);
        const dn = dz[0] * dz[0] + dz[1] * dz[1];
        const hr = (nz[0] * dz[0] + nz[1] * dz[1]) / dn, hi = (nz[1] * dz[0] - nz[0] * dz[1]) / dn;
        phi.push(Math.atan2(hi, hr));
      }
      // unwrap
      const phiU = phi.slice();
      for (let k = 1; k < N; k++) { let d = phiU[k] - phiU[k - 1]; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); phiU[k] = phiU[k - 1] + d; }
      return nargout >= 2 ? Promise.resolve([colVec(phiU), colVec(w)]) : ret(colVec(phiU));
    },

    // phasedelay(b,a[,n]): -unwrapped_phase(H(e^jw))/w; NaN at w=0.
    // Uses unwrapped phase (same as phasez) then divides by w, matching MATLAB's implementation.
    phasedelay: (a, nargout) => {
      const b = toArray(m(a[0]));
      const den = a.length >= 2 && isMat(a[1]) ? toArray(m(a[1])) : [1];
      const N = a.length >= 3 ? Math.round(asScalar(a[2])) : 512;
      const phiRaw: number[] = [], w: number[] = [];
      for (let k = 0; k < N; k++) {
        const wk = (k * Math.PI) / N; w.push(wk);
        const nz = cpoly(b, wk), dz = cpoly(den, wk);
        const dn = dz[0] * dz[0] + dz[1] * dz[1];
        const hr = (nz[0] * dz[0] + nz[1] * dz[1]) / dn, hi = (nz[1] * dz[0] - nz[0] * dz[1]) / dn;
        phiRaw.push(Math.atan2(hi, hr));
      }
      // Unwrap phase (same as phasez)
      const phiU = phiRaw.slice();
      for (let k = 1; k < N; k++) { let d = phiU[k] - phiU[k - 1]; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); phiU[k] = phiU[k - 1] + d; }
      // Phase delay = -phi/w; NaN at w=0
      const pd = phiU.map((phi, k) => w[k] === 0 ? NaN : -phi / w[k]);
      return nargout >= 2 ? Promise.resolve([colVec(pd), colVec(w)]) : ret(colVec(pd));
    },

    // zerophase(b,a[,n]): real zero-phase amplitude response Hr(w).
    // FIR (a=1): use exact formula from zerophase.m: Hz = real(H * exp(-j*phi)) where
    //   phi = P - w*(N+nzeros)/2, P=0 for sym (type1/2), P=pi/2 for antisym (type3/4).
    // IIR: compute |H| and determine sign from phase sign changes (simplified approach).
    zerophase: (a, nargout) => {
      const b = toArray(m(a[0]));
      const den = a.length >= 2 && isMat(a[1]) ? toArray(m(a[1])) : [1];
      const N = a.length >= 3 ? Math.round(asScalar(a[2])) : 512;
      const isFIR = den.length === 1 || (Math.abs(den[0]) > 0 && den.slice(1).every((v) => v === 0));
      const Hr: number[] = [], w: number[] = [];
      if (isFIR) {
        // Exact FIR zerophase: Hz = real(H * exp(-j*phi))
        // Remove trailing zeros and count leading zeros (nzeros)
        let lastNonZero = b.length - 1; while (lastNonZero > 0 && b[lastNonZero] === 0) lastNonZero--;
        const bTrim = b.slice(0, lastNonZero + 1);
        const nzeros = bTrim.findIndex((v) => v !== 0); // leading zeros
        const bNonZ = bTrim.slice(nzeros);
        const M = bNonZ.length - 1;  // filter order after trimming
        // Check symmetry
        let isSym = true, isAntisym = true;
        for (let i = 0; i < Math.floor((M + 1) / 2); i++) {
          if (Math.abs(bNonZ[i] - bNonZ[M - i]) > 1e-10 * Math.max(1, Math.abs(bNonZ[i]))) isSym = false;
          if (Math.abs(bNonZ[i] + bNonZ[M - i]) > 1e-10 * Math.max(1, Math.abs(bNonZ[i]))) isAntisym = false;
        }
        const P = isAntisym ? Math.PI / 2 : 0;
        const delay = (M + nzeros) / 2;
        for (let k = 0; k < N; k++) {
          const wk = (k * Math.PI) / N; w.push(wk);
          const nz = cpoly(b, wk), dz = cpoly(den, wk);
          const dn = dz[0] * dz[0] + dz[1] * dz[1];
          const hr = (nz[0] * dz[0] + nz[1] * dz[1]) / dn, hi = (nz[1] * dz[0] - nz[0] * dz[1]) / dn;
          const phi = P - wk * delay;
          const cr = Math.cos(-phi), sr = Math.sin(-phi);
          Hr.push(hr * cr - hi * sr);
        }
      } else {
        // IIR: compute |H| and determine sign from phase discontinuities
        const hRe: number[] = [], hIm: number[] = [], wArr: number[] = [];
        for (let k = 0; k < N; k++) {
          const wk = (k * Math.PI) / N; wArr.push(wk);
          const nz = cpoly(b, wk), dz = cpoly(den, wk);
          const dn = dz[0] * dz[0] + dz[1] * dz[1];
          hRe.push((nz[0] * dz[0] + nz[1] * dz[1]) / dn);
          hIm.push((nz[1] * dz[0] - nz[0] * dz[1]) / dn);
          w.push(wk);
        }
        // Compute unwrapped phase
        const phi: number[] = [Math.atan2(hIm[0], hRe[0])];
        for (let k = 1; k < N; k++) { let d = Math.atan2(hIm[k], hRe[k]) - phi[k - 1]; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); phi.push(phi[k - 1] + d); }
        // Determine sign: sum(b)/sum(a) gives sign at w=0
        const sumB = b.reduce((s, v) => s + v, 0), sumA = den.reduce((s, v) => s + v, 0);
        let sign = (sumA !== 0 && sumB / sumA < 0) ? -1 : 1;
        for (let k = 0; k < N; k++) Hr.push(sign * Math.hypot(hRe[k], hIm[k]));
        // flip sign at phase jumps (discontinuities of pi)
        for (let k = 1; k < N; k++) {
          const jump = phi[k] - phi[k - 1];
          if (Math.abs(Math.abs(jump) - Math.PI) < 0.5) sign = -sign;
          if (sign !== Math.sign(Hr[k] || 1)) Hr[k] = -Math.abs(Hr[k]);
        }
      }
      return nargout >= 2 ? Promise.resolve([colVec(Hr), colVec(w)]) : ret(colVec(Hr));
    },

    // zplane(z,p) or zplane(b,a): return [z,p] (no plotting in sandbox).
    // Row vectors → treat as b,a → compute roots; column vectors → treat as z,p directly.
    zplane: (a, nargout) => {
      const A = m(a[0]); const B = a.length >= 2 ? m(a[1]) : mat(0, 1, new Float64Array(0));
      const isRowA = A.rows === 1 && A.cols > 1;
      const isRowB = B.rows === 1 && B.cols > 1;
      let zout: Cx[], pout: Cx[];
      if (isRowA || isRowB) {
        // b,a → roots
        zout = t1_polyRoots(toArray(A));
        pout = t1_polyRoots(toArray(B));
      } else {
        zout = t1_matToCx(A); pout = t1_matToCx(B);
      }
      const zMat = t1_cxToMat(zout, true); const pMat = t1_cxToMat(pout, true);
      return nargout >= 2 ? Promise.resolve([zMat, pMat]) : ret(zMat);
    },

    // impzlength(b,a): effective impulse-response length.
    // FIR (a=[1]): length(b). IIR: floor(log(5e-5)/log(max_abs_pole)) + length(b) - deg(a).
    impzlength: (a) => {
      const b = toArray(m(a[0]));
      const den = a.length >= 2 && isMat(a[1]) ? toArray(m(a[1])) : [1];
      const isFIR = den.length === 1 || (Math.abs(den[0]) > 0 && den.slice(1).every((v) => v === 0));
      if (isFIR) return ret(scalar(b.length));
      const poles = t1_polyRoots(den);
      const maxAbsPole = poles.reduce((mx, p) => Math.max(mx, Math.hypot(p[0], p[1])), 0);
      if (maxAbsPole === 0 || maxAbsPole >= 1) return ret(scalar(b.length));
      const tol = 5e-5;
      const n = Math.floor(Math.log(tol) / Math.log(maxAbsPole));
      return ret(scalar(Math.max(n, b.length)));
    },

    // filtord(b,a): filter order = max(degree(b), degree(a)) after trimming trailing zeros.
    filtord: (a) => {
      const b = toArray(m(a[0]));
      const den = a.length >= 2 && isMat(a[1]) ? toArray(m(a[1])) : [1];
      return ret(scalar(Math.max(t1_trimDeg(b), t1_trimDeg(den))));
    },

    // firtype(b): linear-phase FIR type 1..4.
    // Type 1: symmetric, odd length. Type 2: symmetric, even length.
    // Type 3: antisymmetric, odd length. Type 4: antisymmetric, even length.
    firtype: (a) => {
      const b = toArray(m(a[0])), N = b.length;
      if (N === 0) throw new Error('firtype: filter must be non-empty');
      let isSym = true, isAntisym = true;
      for (let i = 0; i < Math.floor(N / 2); i++) {
        if (Math.abs(b[i] - b[N - 1 - i]) > 1e-10 * Math.max(1, Math.abs(b[i]))) isSym = false;
        if (Math.abs(b[i] + b[N - 1 - i]) > 1e-10 * Math.max(1, Math.abs(b[i]))) isAntisym = false;
      }
      if (N % 2 === 1 && isAntisym && Math.abs(b[Math.floor(N / 2)]) > 1e-10) isAntisym = false;
      if (!isSym && !isAntisym) throw new Error('firtype: filter is not linear phase (not symmetric or antisymmetric)');
      if (isSym) return ret(scalar(N % 2 === 1 ? 1 : 2));
      return ret(scalar(N % 2 === 1 ? 3 : 4));
    },

    // islinphase(b,a[,tol]): true if FIR with symmetric or antisymmetric b.
    islinphase: (a) => {
      const b = toArray(m(a[0]));
      const den = a.length >= 2 && isMat(a[1]) ? toArray(m(a[1])) : [1];
      const tol = a.length >= 3 && isMat(a[2]) ? asScalar(a[2]) : 1e-10;
      const isFIR = den.length === 1 || den.slice(1).every((v) => Math.abs(v) < tol);
      if (!isFIR) return ret(scalar(0));
      const N = b.length;
      let isSym = true, isAntisym = true;
      for (let i = 0; i < Math.floor(N / 2); i++) {
        const scale = Math.max(1, Math.abs(b[i]));
        if (Math.abs(b[i] - b[N - 1 - i]) > tol * scale) isSym = false;
        if (Math.abs(b[i] + b[N - 1 - i]) > tol * scale) isAntisym = false;
      }
      if (N % 2 === 1 && isAntisym && Math.abs(b[Math.floor(N / 2)]) > tol) isAntisym = false;
      return ret(scalar(isSym || isAntisym ? 1 : 0));
    },

    // isminphase(b,a[,tol]): true if all zeros AND poles are inside or on the unit circle
    // within tolerance. MATLAB uses eps^(2/3) as default tol and checks |r| <= 1+tol.
    isminphase: (a) => {
      const b = toArray(m(a[0]));
      const den = a.length >= 2 && isMat(a[1]) ? toArray(m(a[1])) : [1];
      const tol = a.length >= 3 && isMat(a[2]) ? asScalar(a[2]) : Math.pow(2.220446049250313e-16, 2 / 3);
      const inside = (roots: Cx[]) => roots.every((r) => Math.hypot(r[0], r[1]) <= 1 + tol);
      return ret(scalar(inside(t1_polyRoots(b)) && inside(t1_polyRoots(den)) ? 1 : 0));
    },

    // isallpass(b,a[,tol]): |H(e^jw)|==const.
    // Condition (for real): b/b[0] ≈ fliplr(a)/a[end], i.e. b * a[end] ≈ fliplr(a) * b[0].
    isallpass: (a) => {
      const b = toArray(m(a[0]));
      const den = a.length >= 2 && isMat(a[1]) ? toArray(m(a[1])) : [1];
      const tol = a.length >= 3 && isMat(a[2]) ? asScalar(a[2]) : 1e-10;
      if (b.length !== den.length) return ret(scalar(0));
      const N = b.length, b0 = b[0], aEnd = den[N - 1];
      if (b0 === 0 || aEnd === 0) return ret(scalar(0));
      // Check: b/b[0] ≈ fliplr(a)/a[end]  i.e.  b[k]*a[end] ≈ a[N-1-k]*b[0]
      for (let k = 0; k < N; k++) {
        if (Math.abs(b[k] * aEnd - den[N - 1 - k] * b0) > tol * Math.max(1, Math.abs(b[k] * aEnd))) return ret(scalar(0));
      }
      return ret(scalar(1));
    },

    // tf2zpk(b,a): alias for tf2zp → [z,p,k].
    tf2zpk: (a, nargout) => {
      const b = toArray(m(a[0])), den = toArray(m(a[1]));
      const z = t1_polyRoots(b), p = t1_polyRoots(den);
      const k = (den[0] !== 0) ? b[0] / den[0] : NaN;
      const zMat = t1_cxToMat(z, false); const pMat = t1_cxToMat(p, false);
      if (nargout >= 3) return Promise.resolve([zMat, pMat, scalar(k)]);
      if (nargout >= 2) return Promise.resolve([zMat, pMat]);
      return ret(zMat);
    },

    // sos2zp(sos[,g]): L×6 SOS matrix → [z,p,k].
    sos2zp: (a, nargout) => {
      const S = m(a[0]); const K = S.rows;
      const g = a.length >= 2 && isMat(a[1]) ? asScalar(a[1]) : 1;
      const allZ: Cx[] = [], allP: Cx[] = [];
      let kGain = g;
      for (let i = 0; i < K; i++) {
        const b0 = S.data[i], b1 = S.data[i + K], b2 = S.data[i + 2 * K];
        const a0 = S.data[i + 3 * K], a1 = S.data[i + 4 * K], a2 = S.data[i + 5 * K];
        allZ.push(...t1_polyRoots([b0, b1, b2]));
        allP.push(...t1_polyRoots([a0, a1, a2]));
        kGain *= (a0 !== 0 ? b0 / a0 : 1);
      }
      const zMat = t1_cxToMat(allZ, false); const pMat = t1_cxToMat(allP, false);
      if (nargout >= 3) return Promise.resolve([zMat, pMat, scalar(kGain)]);
      if (nargout >= 2) return Promise.resolve([zMat, pMat]);
      return ret(zMat);
    },

    // eqtflength(b,a): pad shorter of b,a with trailing zeros to equal length → [b,a].
    eqtflength: (a, nargout) => {
      const b = toArray(m(a[0])), den = toArray(m(a[1]));
      const L = Math.max(b.length, den.length);
      const bOut = b.slice(); while (bOut.length < L) bOut.push(0);
      const aOut = den.slice(); while (aOut.length < L) aOut.push(0);
      if (nargout >= 2) return Promise.resolve([rowVec(bOut), rowVec(aOut)]);
      return ret(rowVec(bOut));
    },

    // residuez(b,a): z-transform partial-fraction expansion → [r,p,k].
    // H(z) = B(z)/A(z) = k[0] + k[1]z^{-1} + ... + sum_i r_i / (1 - p_i * z^{-1}).
    // Uses MATLAB's algorithm: deconv(fliplr(b),fliplr(a)) for direct terms,
    // then filter-based least-squares for residues.
    residuez: (a, nargout) => {
      let b = toArray(m(a[0])), den = toArray(m(a[1]));
      if (!den.length || den[0] === 0) throw new Error('residuez: a(1) must be nonzero');
      const a0 = den[0];
      b = b.map((v) => v / a0); den = den.map((v) => v / a0);
      const LB = b.length, LA = den.length;
      if (LA === 1) {
        // No poles: k = b
        if (nargout >= 3) return Promise.resolve([zeros(0, 1), zeros(0, 1), rowVec(b)]);
        if (nargout >= 2) return Promise.resolve([zeros(0, 1), zeros(0, 1)]);
        return ret(zeros(0, 1));
      }
      const Nres = LA - 1;
      const LK = Math.max(0, LB - Nres);
      let kCoeffs: number[] = [];
      let rem = b.slice();
      if (LK > 0) {
        // deconv(fliplr(b), fliplr(a)) → k, remainder
        // Polynomial long division in z domain (flip coefficients)
        const bf = b.slice().reverse();
        const af = den.slice().reverse();
        const kf: number[] = [];
        const remf = bf.slice();
        for (let i = 0; i <= LB - LA; i++) {
          const c = remf[i] / af[0]; kf.push(c);
          for (let j = 0; j < LA; j++) remf[i + j] -= c * af[j];
        }
        kCoeffs = kf.slice().reverse();  // fliplr(k)
        // remainder: remf[LK..LB-1] = the non-zero tail; then flip
        const remPart = remf.slice(LK);
        rem = remPart.slice().reverse();
      }
      // Pad rem to length Nres
      while (rem.length < Nres) rem.push(0);
      rem = rem.slice(0, Nres);
      // Compute poles
      const poles = t1_polyRoots(den);
      const np = poles.length;
      if (np === 0) {
        const kOut = kCoeffs.length > 0 ? rowVec(kCoeffs) : zeros(0, 0);
        if (nargout >= 3) return Promise.resolve([zeros(0, 1), zeros(0, 1), kOut]);
        if (nargout >= 2) return Promise.resolve([zeros(0, 1), zeros(0, 1)]);
        return ret(zeros(0, 1));
      }
      // Residues via impulse response matching (MATLAB's filter-based approach):
      // h = filter(rem, den, imp) → column vector of length np+1
      // S[:,j] = filter(1, [1 -pj], imp) → Vandermonde columns
      // Solve S*r = h via least-squares (direct for distinct poles)
      const impLen = np + 1;
      // Compute h = filter(rem, den, [1, zeros(np)])
      const imp = new Array(impLen).fill(0); imp[0] = 1;
      const h = filterDf2t(rem, den, imp).y;
      // Build S: S[:,j] = filter(1, [1 -p_j], imp)
      const S: number[][] = [];
      for (let j = 0; j < np; j++) {
        // For complex pole: S_j(n) = p_j^n (each column is powers of p_j)
        const col: number[] = [];
        const pj = poles[j];
        for (let n = 0; n < impLen; n++) {
          const [cr, ci] = t1_cpow(pj[0], pj[1], n);
          col.push(cr);
        }
        S.push(col);
      }
      // Solve for residues: r_j = [h - sum_{k!=j} S[:,k]*r_k] / S[:,j]
      // For distinct poles: use direct Vandermonde solve
      // r_j = h(j+1) / (p_j^0 * prod_{k!=j} (1 - p_k/p_j)) or directly via MATLAB approach
      // Simpler: use partial fraction formula r_j = limit_{z->p_j} (1-p_j*z^{-1})*H(z)
      // = num(1/p_j) / den'(1/p_j) * (something) — complex to get right
      // Use MATLAB approach: evaluate H at Nres points near poles
      const rRe: number[] = new Array(np).fill(0), rIm: number[] = new Array(np).fill(0);
      // For distinct poles: r_j = h_hat where h_hat is from impulse response matching
      // Use the Vandermonde approach: P matrix (np x np), solve P*r = h[0..np-1]
      if (np <= 20) {
        // Build Vandermonde: P[n][j] = p_j^n (complex)
        const Pr: number[][] = [], Pi: number[][] = [];
        for (let n = 0; n < np; n++) {
          Pr.push([]); Pi.push([]);
          for (let j = 0; j < np; j++) {
            const [cr, ci] = t1_cpow(poles[j][0], poles[j][1], n);
            Pr[n].push(cr); Pi[n].push(ci);
          }
        }
        // Solve complex linear system Pr*r_re - Pi*r_im = h[0..np-1]
        // Use direct formula for residues: r_j = h[j] for poles at unique positions
        // Actually use: evaluate h_j = num(p_j) / prod_{k!=j}(p_j - p_k) * (1/p_j)
        // (from partial fraction theory in z^{-1} domain)
        for (let j = 0; j < np; j++) {
          const pj = poles[j];
          // Evaluate numerator polynomial (rem in z^{-1} powers) at z^{-1} = 1/pj:
          // rem = [r0, r1, ..., r_{np-1}] where H_rem(z) = sum rem[k] z^{-k}
          // Evaluate at z=pj: sum rem[k] / pj^k
          let nr = 0, ni_val = 0;
          for (let kk = 0; kk < rem.length; kk++) {
            if (rem[kk] === 0) continue;
            const [cr2, ci2] = t1_cpow(pj[0], pj[1], -kk);
            nr += rem[kk] * cr2; ni_val += rem[kk] * ci2;
          }
          // Divide by A'(z)|z=pj * (-z^{-2}) * (-pj^2) ... actually use:
          // r_j = lim_{z->pj} (z - pj) * H(z) / z^{-1}  (in z domain)
          // = lim_{z->pj} (z - pj) * Brem(z)/A(z)
          // = Brem(pj) / A'(pj) where A'(z) = dA/dz
          // But we're in z^{-1} domain... Use product formula:
          // r_j = Rem(1/pj) / A'(1/pj) * (-1/pj^2) ... complex
          // Simpler: divide nr+j*ni_val by prod(pj - pk for k!=j) in z domain
          // But z and z^{-1} domain poles are reciprocals? No, poles are same.
          let dr = 1, di = 0;
          for (let kk = 0; kk < np; kk++) {
            if (kk === j) continue;
            const drf = pj[0] - poles[kk][0], dif = pj[1] - poles[kk][1];
            const tmpr = dr * drf - di * dif; const tmpi = dr * dif + di * drf;
            dr = tmpr; di = tmpi;
          }
          const dd = dr * dr + di * di;
          if (dd === 0) { rRe[j] = NaN; rIm[j] = NaN; }
          else { rRe[j] = (nr * dr + ni_val * di) / dd; rIm[j] = (ni_val * dr - nr * di) / dd; }
        }
      }
      const rMat = colVec(rRe); if (rIm.some((v) => v !== 0)) rMat.idata = Float64Array.from(rIm);
      const pMat = t1_cxToMat(poles, false);
      const kOut = kCoeffs.length > 0 ? rowVec(kCoeffs) : zeros(0, 0);
      if (nargout >= 3) return Promise.resolve([rMat, pMat, kOut]);
      if (nargout >= 2) return Promise.resolve([rMat, pMat]);
      return ret(rMat);
    },

    // interp(x,r[,n[,cutoff]]): FIR interpolation, upsample by integer r.
    // Uses signal/interp.m algorithm: Hamming sinc filter + edge-reflection initial conditions.
    interp: (a) => {
      const X = m(a[0]); const x = toArray(X); const r = Math.round(asScalar(a[1]));
      const n = a.length >= 3 ? Math.round(asScalar(a[2])) : 4;
      const cutoff = a.length >= 4 ? asScalar(a[3]) : 0.5;
      if (2 * n + 1 > x.length) throw new Error('interp: Length of data sequence must be at least ' + (2 * n + 1));
      const Lx = x.length, RL = r * Lx, RN = r * n;
      // Design filter: Hamming-windowed sinc, length 2*r*n+1
      const b = t1_designInterpFilter(r, n, cutoff);
      // Upsample: insert r-1 zeros between samples
      const yCol: number[] = new Array(RL).fill(0);
      for (let i = 0; i < Lx; i++) yCol[i * r] = x[i];
      // Initial conditions: reflect start (MATLAB: od(1:r:2RN,1)=2*x[0]-x[(2n+1):-1:2])
      const od: number[] = new Array(2 * RN).fill(0);
      for (let i = 0; i < 2 * n; i++) {
        const srcIdx = 2 * n - i;  // x[(2n+1):-1:2] (1-indexed) = x[2n], x[2n-1], ..., x[1]
        od[i * r] = 2 * x[0] - (srcIdx < Lx ? x[srcIdx] : x[0]);
      }
      const zi = t1_filterGetZi(b, od);
      const { y: yFilt, zf } = t1_filterWithZi(b, yCol, zi);
      // Shift: take from RN for (Lx-n)*r samples
      for (let i = 0; i < (Lx - n) * r; i++) yCol[i] = yFilt[RN + i];
      // Right edge: reflect end (MATLAB: od(1:r:2RN,1)=2*x[Lx-1]-x[(Lx-1):-1:(Lx-2n)])
      const od2: number[] = new Array(2 * RN).fill(0);
      for (let i = 0; i < 2 * n; i++) {
        const srcIdx = Lx - 1 - i;  // x[(Lx-1):-1:(Lx-2n)] 0-indexed
        od2[i * r] = 2 * x[Lx - 1] - (srcIdx >= 0 ? x[srcIdx] : x[0]);
      }
      const od2Filt = t1_filterWithState(b, od2, zf);
      for (let i = 0; i < RN; i++) yCol[RL - RN + i] = od2Filt[i];
      return ret(X.rows === 1 ? rowVec(yCol) : colVec(yCol));
    },

    // buffer(x,n[,p]): frame signal into n×nframes matrix (overlap p, default 0).
    // Zero-pads last frame if needed. Overlap p < n; zero initial overlap when p > 0.
    buffer: (a) => {
      const X = m(a[0]); const x = toArray(X), L = x.length;
      const n = Math.round(asScalar(a[1]));
      const p = a.length >= 3 ? Math.round(asScalar(a[2])) : 0;
      if (n <= 0) throw new Error('buffer: n must be positive');
      const hop = n - p;
      if (hop <= 0) throw new Error('buffer: overlap p must be less than frame length n');
      // Number of frames to cover all input
      // When p > 0: initial frame starts with p zeros then first hop samples
      // Position of sample i: it appears in frame col = ceil((i+p+1-n)/hop) for col >= 0
      // nframes = ceil((L + p) / hop) when p > 0, else ceil(L / hop)
      const nframes = p > 0 ? Math.ceil((L + p) / hop) : Math.ceil(L / hop);
      const data = new Float64Array(n * nframes);
      for (let col = 0; col < nframes; col++) {
        const frameStart = col * hop - p;  // 0-indexed position of first sample in frame
        for (let row = 0; row < n; row++) {
          const xi = frameStart + row;
          data[row + col * n] = (xi >= 0 && xi < L) ? x[xi] : 0;
        }
      }
      return ret(mat(n, nframes, data));
    },

    // ── [z,p,k] = cheb1ap(n,Rp) — Chebyshev Type I analog lowpass prototype ──
    cheb1ap: (a, nargout) => {
      const n = Math.round(asScalar(a[0])), rp = asScalar(a[1]);
      const { z, p, k } = cheb1ap(n, rp);
      const pCol = colVec(p.map((c) => c[0])); pCol.idata = Float64Array.from(p.map((c) => c[1]));
      return Promise.resolve(nargout >= 3 ? [zeros(0, 1), pCol, scalar(k)] : nargout >= 2 ? [zeros(0, 1), pCol] : [zeros(0, 1)]);
    },

    // ── [z,p,k] = cheb2ap(n,Rs) — Chebyshev Type II analog lowpass prototype ──
    cheb2ap: (a, nargout) => {
      const n = Math.round(asScalar(a[0])), rs = asScalar(a[1]);
      const { z, p, k } = cheb2ap(n, rs);
      const zCol = colVec(z.map((c) => c[0])); zCol.idata = Float64Array.from(z.map((c) => c[1]));
      const pCol = colVec(p.map((c) => c[0])); pCol.idata = Float64Array.from(p.map((c) => c[1]));
      return Promise.resolve(nargout >= 3 ? [zCol, pCol, scalar(k)] : nargout >= 2 ? [zCol, pCol] : [zCol]);
    },

    // ── [z,p,k] = ellipap(n,Rp,Rs) — elliptic analog lowpass prototype ──
    ellipap: (a, nargout) => {
      const n = Math.round(asScalar(a[0])), rp = asScalar(a[1]), rs = asScalar(a[2]);
      const { z, p, k } = ellipap(n, rp, rs);
      const zCol = colVec(z.map((c) => c[0])); zCol.idata = Float64Array.from(z.map((c) => c[1]));
      const pCol = colVec(p.map((c) => c[0])); pCol.idata = Float64Array.from(p.map((c) => c[1]));
      return Promise.resolve(nargout >= 3 ? [zCol, pCol, scalar(k)] : nargout >= 2 ? [zCol, pCol] : [zCol]);
    },

    // ── [z,p,k] = besselap(n) — Bessel analog lowpass prototype (table n=1..10) ──
    besselap: (a, nargout) => {
      const n = Math.round(asScalar(a[0]));
      const BESSEL_POLES: { [key: number]: Cx[] } = {
        1: [[-1, 0]],
        2: [[-0.8660254037844386467637229, 0.4999999999999999999999996], [-0.8660254037844386467637229, -0.4999999999999999999999996]],
        3: [[-0.9416000265332067855971980, 0], [-0.7456403858480766441810907, -0.7113666249728352680992154], [-0.7456403858480766441810907, 0.7113666249728352680992154]],
        4: [[-0.6572111716718829545787781, -0.8301614350048733772399715], [-0.6572111716718829545787788, 0.8301614350048733772399715], [-0.9047587967882449459642637, -0.2709187330038746636700923], [-0.9047587967882449459642624, 0.2709187330038746636700926]],
        5: [[-0.9264420773877602247196260, 0], [-0.8515536193688395541722677, -0.4427174639443327209850002], [-0.8515536193688395541722677, 0.4427174639443327209850002], [-0.5905759446119191779319432, -0.9072067564574549539291747], [-0.5905759446119191779319432, 0.9072067564574549539291747]],
        6: [[-0.9093906830472271808050953, -0.1856964396793046769246397], [-0.9093906830472271808050953, 0.1856964396793046769246397], [-0.7996541858328288520243325, -0.5621717346937317988594118], [-0.7996541858328288520243325, 0.5621717346937317988594118], [-0.5385526816693109683073792, -0.9616876881954277199245657], [-0.5385526816693109683073792, 0.9616876881954277199245657]],
        7: [[-0.9194871556490290014311619, 0], [-0.8800029341523374639772340, -0.3216652762307739398381830], [-0.8800029341523374639772340, 0.3216652762307739398381830], [-0.7527355434093214462291616, -0.6504696305522550699212995], [-0.7527355434093214462291616, 0.6504696305522550699212995], [-0.4966917256672316755024763, -1.002508508454420401230220], [-0.4966917256672316755024763, 1.002508508454420401230220]],
        8: [[-0.9096831546652910216327629, -0.1412437976671422927888150], [-0.9096831546652910216327629, 0.1412437976671422927888150], [-0.8473250802359334320103023, -0.4259017538272934994996429], [-0.8473250802359334320103023, 0.4259017538272934994996429], [-0.7111381808485399250796172, -0.7186517314108401705762571], [-0.7111381808485399250796172, 0.7186517314108401705762571], [-0.4621740412532122027072175, -1.034388681126901058116589], [-0.4621740412532122027072175, 1.034388681126901058116589]],
        9: [[-0.9154957797499037686769223, 0], [-0.8911217017079759323183848, -0.2526580934582164192308115], [-0.8911217017079759323183848, 0.2526580934582164192308115], [-0.8148021112269012975514135, -0.5085815689631499483745341], [-0.8148021112269012975514135, 0.5085815689631499483745341], [-0.6743622686854761980403401, -0.7730546212691183706919682], [-0.6743622686854761980403401, 0.7730546212691183706919682], [-0.4331415561553618854685942, -1.060073670135929666774323], [-0.4331415561553618854685942, 1.060073670135929666774323]],
        10: [[-0.9091347320900502436826431, -0.1139583137335511169927714], [-0.9091347320900502436826431, 0.1139583137335511169927714], [-0.8688459641284764527921864, -0.3430008233766309973110589], [-0.8688459641284764527921864, 0.3430008233766309973110589], [-0.7837694413101441082655890, -0.5759147538499947070009852], [-0.7837694413101441082655890, 0.5759147538499947070009852], [-0.6417513866988316136190854, -0.8175836167191017226233947], [-0.6417513866988316136190854, 0.8175836167191017226233947], [-0.4083220732868861566219785, -1.081274842819124562037210], [-0.4083220732868861566219785, 1.081274842819124562037210]],
      };
      if (n < 1 || n > 10) throw new Error(`besselap: order must be 1..10 (got ${n})`);
      const p = BESSEL_POLES[n];
      const pCol = colVec(p.map((c) => c[0])); pCol.idata = Float64Array.from(p.map((c) => c[1]));
      return Promise.resolve(nargout >= 3 ? [zeros(0, 1), pCol, scalar(1)] : nargout >= 2 ? [zeros(0, 1), pCol] : [zeros(0, 1)]);
    },

    // ── [bt,at] = lp2lp(b,a,Wo) — analog LP→LP via frequency scaling s→s/Wo ──
    lp2lp: (a, nargout) => {
      const b = toArray(m(a[0])), den = toArray(m(a[1])), wo = asScalar(a[2]);
      const nb = b.length, na = den.length;
      // H(s/Wo): B(s/Wo)/A(s/Wo). Standard LP→LP transformation:
      //   at[i] = a[i] * Wo^i  (multiply every a-coeff by ascending power of Wo)
      //   bt[i] = b[i] * Wo^i * Wo^(na-nb)   (extra Wo^(na-nb) gain for order mismatch)
      // Verify: a=[1,1],Wo=3,na=2: at=[1*1,1*3]=[1,3] ✓  b=[1],nb=1: bt=[1*1*3^1]=[3] ✓
      const at: number[] = den.map((v, i) => v * wo ** i);
      const kFactor = wo ** (na - nb);
      const bt: number[] = b.map((v, i) => v * wo ** i * kFactor);
      const sc = den[0] / at[0]; // at[0]=den[0]*Wo^0=den[0], so sc=1 when den[0]=1
      return Promise.resolve(nargout >= 2 ? [rowVec(bt.map((v) => v * sc)), rowVec(at.map((v) => v * sc))] : [rowVec(bt.map((v) => v * sc))]);
    },

    // ── [bt,at] = lp2hp(b,a,Wo) — analog LP→HP via s→Wo/s substitution ──
    lp2hp: (a, nargout) => {
      const b = toArray(m(a[0])), den = toArray(m(a[1])), wo = asScalar(a[2]);
      const nb = b.length, na = den.length;
      // H_hp(s) = H_lp(Wo/s). Clear denominators by multiplying by s^(na-1):
      // A(Wo/s)*s^(na-1) = sum_k a[k]*Wo^(na-1-k)*s^k  → coeff of s^k = a[k]*Wo^(na-1-k)
      // In descending order (index i = na-1-k): at[i] = a[na-1-i]*Wo^i
      // Verify: a=[1,1],Wo=2,na=2: at[0]=a[1]*1=1, at[1]=a[0]*2=2 → [1,2] ✓
      const at: number[] = Array.from({ length: na }, (_, i) => den[na - 1 - i] * wo ** i);
      // B(Wo/s)*s^(na-1) = sum_k b[k]*Wo^(nb-1-k)*s^(na-nb+k)
      //   coeff of s^(na-nb+k) = b[k]*Wo^(nb-1-k), at descending index nb-1-k
      // bt[nb-1-k] = b[k]*Wo^(nb-1-k), trailing na-nb zeros
      // Verify: b=[1],nb=1,na=2: bt[0]=b[0]*Wo^0=1, bt[1]=0 → [1,0] ✓
      const bt_part: number[] = Array.from({ length: nb }, (_, k) => b[k] * wo ** (nb - 1 - k));
      const bt: number[] = [...bt_part, ...new Array(na - nb).fill(0)];
      const scaleHP = den[0] / at[0];
      return Promise.resolve(nargout >= 2 ? [rowVec(bt.map((v) => v * scaleHP)), rowVec(at.map((v) => v * scaleHP))] : [rowVec(bt.map((v) => v * scaleHP))]);
    },

    // ── [bt,at] = lp2bp(b,a,Wo,Bw) — analog LP→BP: s → (s^2+Wo^2)/(Bw*s) ──
    lp2bp: (a, nargout) => {
      const b = toArray(m(a[0])), den = toArray(m(a[1])), wo = asScalar(a[2]), bw = asScalar(a[3]);
      const nb = b.length, na = den.length, n = na - 1;
      const wo2 = wo * wo;
      const t2_pMul = (p1: number[], p2: number[]): number[] => { const out = new Array(p1.length + p2.length - 1).fill(0); for (let i = 0; i < p1.length; i++) for (let j = 0; j < p2.length; j++) out[i + j] += p1[i] * p2[j]; return out; };
      const t2_pAdd = (p1: number[], p2: number[]): number[] => { const L = Math.max(p1.length, p2.length), out = new Array(L).fill(0); for (let i = 0; i < p1.length; i++) out[i + L - p1.length] += p1[i]; for (let i = 0; i < p2.length; i++) out[i + L - p2.length] += p2[i]; return out; };
      const t2_pPow = (p: number[], exp: number): number[] => { let r = [1]; for (let i = 0; i < exp; i++) r = t2_pMul(r, p); return r; };
      // at = sum_k a[na-1-k] * (s^2+wo^2)^k * (Bw*s)^(n-k)
      let at_full = [0];
      for (let k = 0; k <= n; k++) {
        const aK = den[na - 1 - k], p2: number[] = [bw ** (n - k), ...new Array(n - k).fill(0)];
        at_full = t2_pAdd(at_full, t2_pMul(t2_pPow([1, 0, wo2], k), p2).map((v) => v * aK));
      }
      const nB = nb - 1; let bt_full = [0];
      for (let k = 0; k <= nB; k++) {
        const bK = b[nB - k], p2: number[] = [bw ** (n - k), ...new Array(n - k).fill(0)];
        bt_full = t2_pAdd(bt_full, t2_pMul(t2_pPow([1, 0, wo2], k), p2).map((v) => v * bK));
      }
      while (bt_full.length > 1 && bt_full[0] === 0) bt_full.shift();
      while (at_full.length > 1 && at_full[0] === 0) at_full.shift();
      const sc = at_full[0];
      return Promise.resolve(nargout >= 2 ? [rowVec(bt_full.map((v) => v / sc)), rowVec(at_full.map((v) => v / sc))] : [rowVec(bt_full.map((v) => v / sc))]);
    },

    // ── [bt,at] = lp2bs(b,a,Wo,Bw) — analog LP→BS: s → Bw*s/(s^2+Wo^2) ──
    lp2bs: (a, nargout) => {
      const b = toArray(m(a[0])), den = toArray(m(a[1])), wo = asScalar(a[2]), bw = asScalar(a[3]);
      const nb = b.length, na = den.length, n = na - 1;
      const wo2 = wo * wo;
      const t2_pMulBS = (p1: number[], p2: number[]): number[] => { const out = new Array(p1.length + p2.length - 1).fill(0); for (let i = 0; i < p1.length; i++) for (let j = 0; j < p2.length; j++) out[i + j] += p1[i] * p2[j]; return out; };
      const t2_pAddBS = (p1: number[], p2: number[]): number[] => { const L = Math.max(p1.length, p2.length), out = new Array(L).fill(0); for (let i = 0; i < p1.length; i++) out[i + L - p1.length] += p1[i]; for (let i = 0; i < p2.length; i++) out[i + L - p2.length] += p2[i]; return out; };
      const t2_pPowBS = (p: number[], exp: number): number[] => { let r = [1]; for (let i = 0; i < exp; i++) r = t2_pMulBS(r, p); return r; };
      // at = sum_k a[na-1-k] * (Bw*s)^k * (s^2+wo^2)^(n-k)
      let at_full = [0];
      for (let k = 0; k <= n; k++) {
        const aK = den[na - 1 - k], p2: number[] = [bw ** k, ...new Array(k).fill(0)];
        at_full = t2_pAddBS(at_full, t2_pMulBS(t2_pPowBS([1, 0, wo2], n - k), p2).map((v) => v * aK));
      }
      const nB = nb - 1; let bt_full = [0];
      for (let k = 0; k <= nB; k++) {
        const bK = b[nB - k], p2: number[] = [bw ** k, ...new Array(k).fill(0)];
        bt_full = t2_pAddBS(bt_full, t2_pMulBS(t2_pPowBS([1, 0, wo2], n - k), p2).map((v) => v * bK));
      }
      while (bt_full.length > 1 && bt_full[0] === 0) bt_full.shift();
      while (at_full.length > 1 && at_full[0] === 0) at_full.shift();
      const sc = at_full[0];
      return Promise.resolve(nargout >= 2 ? [rowVec(bt_full.map((v) => v / sc)), rowVec(at_full.map((v) => v / sc))] : [rowVec(bt_full.map((v) => v / sc))]);
    },

    // ── [bz,az] = impinvar(b,a,Fs) — impulse-invariance method: analog → digital ──
    impinvar: (a, nargout) => {
      const b = toArray(m(a[0])), den = toArray(m(a[1]));
      const Fs = a.length >= 3 && isMat(a[2]) ? asScalar(a[2]) : 1;
      const apoly = den.map((v) => v / den[0]);
      const n_order = apoly.length - 1;
      if (n_order === 0) {
        const gain = b[0] / den[0] / Fs;
        return Promise.resolve(nargout >= 2 ? [rowVec([gain]), rowVec([1])] : [rowVec([gain])]);
      }
      // Complex polynomial evaluation via Horner
      const t2_pValCx = (c: number[], s: Cx): Cx => { let val: Cx = [0, 0]; for (let i = 0; i < c.length; i++) val = cAdd(cMul(val, s), [c[i], 0]); return val; };
      const t2_pDeriv = (c: number[]): number[] => c.slice(0, -1).map((v, i) => v * (c.length - 1 - i));
      // Find roots of denominator via companion matrix + QR
      const t2_qrEig = (A0: number[][], sz: number): Cx[] => {
        const H: number[][] = A0.map((r) => r.slice());
        const evals: Cx[] = [];
        let n2 = sz;
        while (n2 > 0) {
          if (n2 === 1) { evals.push([H[0][0], 0]); break; }
          if (n2 === 2) { const tr = H[0][0] + H[1][1], det = H[0][0] * H[1][1] - H[0][1] * H[1][0], disc = tr * tr - 4 * det; if (disc >= 0) { evals.push([(tr + Math.sqrt(disc)) / 2, 0], [(tr - Math.sqrt(disc)) / 2, 0]); } else { evals.push([tr / 2, Math.sqrt(-disc) / 2], [tr / 2, -Math.sqrt(-disc) / 2]); } break; }
          let iter = 0, deflated = false;
          while (iter++ < 3000 && !deflated) {
            let small = -1; for (let i = n2 - 2; i >= 0; i--) if (Math.abs(H[i + 1][i]) < 1e-12 * (Math.abs(H[i][i]) + Math.abs(H[i + 1][i + 1]))) { small = i; break; }
            if (small >= 0) {
              H[small + 1][small] = 0;
              const up = H.slice(0, small + 1).map((r) => r.slice(0, small + 1));
              const lo = H.slice(small + 1, n2).map((r) => r.slice(small + 1, n2));
              evals.push(...t2_qrEig(up, small + 1), ...t2_qrEig(lo, n2 - small - 1));
              n2 = 0; deflated = true; break;
            }
            const n1 = n2 - 1, s22 = H[n1 - 1][n1 - 1] + H[n1][n1], t22 = H[n1 - 1][n1 - 1] * H[n1][n1] - H[n1 - 1][n1] * H[n1][n1 - 1];
            let x0 = H[0][0] * H[0][0] + H[0][1] * H[1][0] - s22 * H[0][0] + t22, x1 = H[1][0] * (H[0][0] + H[1][1] - s22), x2 = n2 > 2 ? H[2][1] * H[1][0] : 0;
            for (let k = 0; k < n2 - 1; k++) {
              const m3 = Math.min(k + 2, n2 - 1), cols3 = m3 - k + 1;
              const v: number[] = k === 0 ? [x0, x1, ...(n2 > 2 ? [x2] : [])].slice(0, cols3) : Array.from({ length: cols3 }, (_, j) => j === 0 ? H[k][k - 1] : H[k + j][k - 1]);
              const vn = Math.hypot(...v); if (vn < 1e-15) continue;
              v[0] += Math.sign(v[0] || 1) * vn;
              const vn2sq = v.reduce((s, vv) => s + vv * vv, 0); if (vn2sq < 1e-28) continue;
              for (let col = k > 0 ? k - 1 : 0; col < n2; col++) { let dot = 0; for (let r = 0; r < cols3; r++) dot += v[r] * H[k + r][col]; const fac = 2 * dot / vn2sq; for (let r = 0; r < cols3; r++) H[k + r][col] -= fac * v[r]; }
              for (let row = 0; row <= Math.min(k + 3, n2 - 1); row++) { let dot = 0; for (let r = 0; r < cols3; r++) dot += H[row][k + r] * v[r]; const fac = 2 * dot / vn2sq; for (let r = 0; r < cols3; r++) H[row][k + r] -= fac * v[r]; }
            }
          }
          if (!deflated && n2 > 0) { evals.push([H[n2 - 1][n2 - 1], 0]); n2--; }
        }
        return evals;
      };
      const t2_compEig = (coeffs: number[]): Cx[] => {
        const nn = coeffs.length - 1;
        if (nn === 0) return []; if (nn === 1) return [[-coeffs[1], 0]];
        if (nn === 2) { const disc = coeffs[1] * coeffs[1] - 4 * coeffs[2]; if (disc >= 0) return [[(-coeffs[1] + Math.sqrt(disc)) / 2, 0], [(-coeffs[1] - Math.sqrt(disc)) / 2, 0]]; const rd = Math.sqrt(-disc) / 2; return [[(-coeffs[1]) / 2, rd], [(-coeffs[1]) / 2, -rd]]; }
        const nn2 = nn;
        const C: number[][] = Array.from({ length: nn2 }, (_, i) => { const row = new Array(nn2).fill(0); if (i < nn2 - 1) row[i + 1] = 1; else for (let j = 0; j < nn2; j++) row[j] = -coeffs[nn2 - j]; return row; });
        return t2_qrEig(C, nn2);
      };
      const poles_cx = t2_compEig(apoly);
      const Np = poles_cx.length;
      const aprime = t2_pDeriv(apoly);
      const res: Cx[] = [];
      for (let i = 0; i < Np; i++) {
        const pole = poles_cx[i];
        const bval = t2_pValCx(b.map((v) => v / den[0]), pole);
        const apval = t2_pValCx(aprime, pole);
        res.push(cDiv(bval, apval));
      }
      const dpoles = poles_cx.map((pp): Cx => { const mag = Math.exp(pp[0] / Fs), ang = pp[1] / Fs; return [mag * Math.cos(ang), mag * Math.sin(ang)]; });
      const az_cx = polyFromRoots(dpoles);
      const az = az_cx.map((c) => c[0]);
      const hlen = Np + 1;
      const h = new Array(hlen).fill(0);
      for (let nn = 0; nn < hlen; nn++) {
        let val = 0;
        for (let i = 0; i < Np; i++) {
          const logMag = nn * (poles_cx[i][0] / Fs), ang2 = nn * (poles_cx[i][1] / Fs);
          val += Math.exp(logMag) * (res[i][0] * Math.cos(ang2) - res[i][1] * Math.sin(ang2));
        }
        h[nn] = val;
      }
      const bz_full = filterDf2t(az, [1], h).y;
      const bz = bz_full.slice(0, Np).map((v) => v / Fs);
      return Promise.resolve(nargout >= 2 ? [rowVec(bz), rowVec(az)] : [rowVec(bz)]);
    },

    // ── [a,e] = lpc(x,p) — LP coefficients via autocorrelation + Levinson-Durbin ──
    lpc: (a, nargout) => {
      const x = toArray(m(a[0])), p = Math.round(asScalar(a[1])), N = x.length;
      // lpc uses biased autocorrelation normalized by N (same as aryule)
      const r = new Array(p + 1).fill(0);
      for (let lag = 0; lag <= p; lag++) { for (let i = 0; i < N - lag; i++) r[lag] += x[i] * x[i + lag]; r[lag] /= N; }
      const { a: aCoeffs, e } = levinsonDurbin(r, p);
      return Promise.resolve(nargout >= 2 ? [rowVec(aCoeffs), scalar(e)] : [rowVec(aCoeffs)]);
    },

    // ── [a,e,k] = aryule(x,p) — Yule-Walker AR estimation (autocorrelation, biased) ──
    aryule: (a, nargout) => {
      const x = toArray(m(a[0])), p = Math.round(asScalar(a[1])), N = x.length;
      const r = new Array(p + 1).fill(0);
      for (let lag = 0; lag <= p; lag++) { for (let i = 0; i < N - lag; i++) r[lag] += x[i] * x[i + lag]; r[lag] /= N; }
      const { a: aCoeffs, e, k: ks } = levinsonDurbin(r, p);
      return Promise.resolve(nargout >= 3 ? [rowVec(aCoeffs), scalar(e), colVec(ks)] : nargout >= 2 ? [rowVec(aCoeffs), scalar(e)] : [rowVec(aCoeffs)]);
    },

    // ── [a,e,k] = arburg(x,p) — Burg method AR estimation ──
    arburg: (a, nargout) => {
      const x = toArray(m(a[0])), p = Math.round(asScalar(a[1])), N = x.length;
      let efp = x.slice(1), ebp = x.slice(0, N - 1);
      let E = x.reduce((s, v) => s + v * v, 0) / N;
      let aCoeffs = [1];
      const ks: number[] = [];
      for (let mm = 1; mm <= p; mm++) {
        const len = N - mm;
        let num = 0, den1 = 0, den2 = 0;
        for (let i = 0; i < len; i++) { num -= 2 * ebp[i] * efp[i]; den1 += efp[i] * efp[i]; den2 += ebp[i] * ebp[i]; }
        const k = num / (den1 + den2);
        ks.push(k);
        const ef = new Array(len - 1);
        for (let i = 0; i < len - 1; i++) { ef[i] = efp[i + 1] + k * ebp[i + 1]; ebp[i] = ebp[i] + k * efp[i]; }
        for (let i = 0; i < len - 1; i++) efp[i] = ef[i];
        const newA = aCoeffs.slice(); newA.push(0);
        for (let j = 1; j <= mm; j++) newA[j] = aCoeffs[j] + k * (j <= mm - 1 ? aCoeffs[mm - j] : 0);
        newA[mm] = k; aCoeffs = newA;
        E = (1 - k * k) * E;
      }
      return Promise.resolve(nargout >= 3 ? [rowVec(aCoeffs), scalar(E), colVec(ks)] : nargout >= 2 ? [rowVec(aCoeffs), scalar(E)] : [rowVec(aCoeffs)]);
    },

    // ── [a,e] = arcov(x,p) — covariance method AR estimation ──
    arcov: (a, nargout) => {
      const x = toArray(m(a[0])), p = Math.round(asScalar(a[1])), N = x.length;
      const M = N - p;
      if (M <= 0) throw new Error('arcov: signal too short for model order');
      const X1 = x.slice(p);   // length M: x[p], x[p+1], ..., x[N-1]
      const Xc: number[][] = Array.from({ length: M }, (_, i) => Array.from({ length: p }, (__, j) => x[p + i - j - 1]));
      const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
      const XtY: number[] = new Array(p).fill(0);
      for (let i = 0; i < M; i++) { for (let j = 0; j < p; j++) { XtY[j] -= Xc[i][j] * X1[i]; for (let k = 0; k < p; k++) XtX[j][k] += Xc[i][j] * Xc[i][k]; } }
      const alpha = matInv(XtX).map((row) => row.reduce((s, v, k) => s + v * XtY[k], 0));
      const aCoeffs = [1, ...alpha];
      let e = X1.reduce((s, v) => s + v * v, 0);
      for (let j = 0; j < p; j++) { let cz = 0; for (let i = 0; i < M; i++) cz += X1[i] * Xc[i][j]; e += cz * alpha[j]; }
      return Promise.resolve(nargout >= 2 ? [rowVec(aCoeffs), scalar(Math.abs(e))] : [rowVec(aCoeffs)]);
    },

    // ── [a,e] = armcov(x,p) — modified covariance method AR estimation ──
    armcov: (a, nargout) => {
      const x = toArray(m(a[0])), p = Math.round(asScalar(a[1])), N = x.length;
      const M = N - p; // number of covariance rows
      if (M <= 0) throw new Error('armcov: signal too short for model order');
      // Modified covariance: stack [X_fwd; X_bwd]/sqrt(2) then solve LS.
      // X_fwd[i, j] (j=0..p): x[p+i-j], i=0..M-1   → col 0 is y_fwd=x[p+i], cols 1..p are lag-1..lag-p
      // X_bwd is col-reversed X_fwd: X_bwd[i,j] = X_fwd[i, p-j] = x[p+i-(p-j)] = x[i+j]
      //   → col 0 is y_bwd=x[i], cols 1..p are x[i+1]..x[i+p]
      // Normal equations for -a[1..p]: (Xc' Xc) a = -Xc' y
      // where Xc has cols 1..p and y = col 0 (halved factor cancels)
      const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
      const XtY: number[] = new Array(p).fill(0);
      for (let i = 0; i < M; i++) {
        // Forward part: y_f = x[p+i], X_f[i,j] = x[p+i-j-1] for j=1..p (predictor cols)
        const yf = x[p + i];
        for (let j = 0; j < p; j++) {
          const xfj = x[p + i - j - 1];
          XtY[j] -= xfj * yf;
          for (let k = 0; k < p; k++) XtX[j][k] += xfj * x[p + i - k - 1];
        }
        // Backward part: y_b = x[i], X_b[i,j] = x[i+j+1] for j=1..p (predictor cols)
        const yb = x[i];
        for (let j = 0; j < p; j++) {
          const xbj = x[i + j + 1];
          XtY[j] -= xbj * yb;
          for (let k = 0; k < p; k++) XtX[j][k] += xbj * x[i + k + 1];
        }
      }
      const alpha = matInv(XtX).map((row) => row.reduce((s, v, k) => s + v * XtY[k], 0));
      const aCoeffs = [1, ...alpha];
      // Error: mean of squared forward+backward residuals
      let eF = 0, eB = 0;
      for (let i = 0; i < M; i++) {
        let vF = x[p + i]; for (let j = 0; j < p; j++) vF += alpha[j] * x[p + i - j - 1]; eF += vF * vF;
        let vB = x[i]; for (let j = 0; j < p; j++) vB += alpha[j] * x[i + j + 1]; eB += vB * vB;
      }
      const e = (eF + eB) / (2 * M);
      return Promise.resolve(nargout >= 2 ? [rowVec(aCoeffs), scalar(Math.abs(e))] : [rowVec(aCoeffs)]);
    },

    // ── snr(x[,Fs]) — SNR in dB: fundamental / noise (harmonics excluded from noise) ──
    snr: (a) => {
      // MATLAB snr: finds fundamental peak, excludes all harmonics AND their neighbors from noise.
      // SNR = P_fundamental / P_noise   where P_noise = P_total - P_fundamental - P_harmonics - P_DC
      const x = toArray(m(a[0])), N = x.length, half = Math.floor(N / 2);
      const Pxx: number[] = [];
      for (let k = 0; k <= half; k++) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const ang = -2 * Math.PI * k * n / N; re += x[n] * Math.cos(ang); im += x[n] * Math.sin(ang); } let p = (re * re + im * im) / N; if (k > 0 && (k < half || N % 2 !== 0)) p *= 2; Pxx.push(p); }
      // Find fundamental (highest power bin, excluding DC)
      let iMax = 1; for (let k = 2; k <= half; k++) if (Pxx[k] > Pxx[iMax]) iMax = k;
      // Collect all bins to exclude: DC (k=0), fundamental ±1, and all harmonics ±1
      const excl = new Set<number>(); excl.add(0);
      for (let h = 1; h <= 6; h++) { const ib = iMax * h; if (ib > half) break; for (let dk = -1; dk <= 1; dk++) { const kk = ib + dk; if (kk >= 0 && kk <= half) excl.add(kk); } }
      // Fundamental power: sum of fundamental ±1
      let pFund = 0; for (let dk = -1; dk <= 1; dk++) { const kk = iMax + dk; if (kk >= 0 && kk <= half) pFund += Pxx[kk]; }
      // Noise power: total - all excluded
      let pTot = 0; for (let k = 0; k <= half; k++) pTot += Pxx[k];
      let pExcl = 0; for (const k of excl) pExcl += Pxx[k];
      const pNoise = pTot - pExcl;
      return ret(scalar(10 * Math.log10(Math.max(pFund, 1e-300) / Math.max(pNoise, 1e-300))));
    },

    // ── sinad(x) — SINAD in dB: fundamental / (noise + distortion, i.e. all non-fundamental) ──
    sinad: (a) => {
      // SINAD = fundamental / (everything else including harmonics)
      const x = toArray(m(a[0])), N = x.length, half = Math.floor(N / 2);
      const Pxx: number[] = [];
      for (let k = 0; k <= half; k++) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const ang = -2 * Math.PI * k * n / N; re += x[n] * Math.cos(ang); im += x[n] * Math.sin(ang); } let p = (re * re + im * im) / N; if (k > 0 && (k < half || N % 2 !== 0)) p *= 2; Pxx.push(p); }
      let iMax = 1; for (let k = 2; k <= half; k++) if (Pxx[k] > Pxx[iMax]) iMax = k;
      let pSig = 0; for (let k = Math.max(0, iMax - 1); k <= Math.min(half, iMax + 1); k++) pSig += Pxx[k];
      let pTot = 0; for (let k = 0; k <= half; k++) pTot += Pxx[k];
      return ret(scalar(10 * Math.log10(Math.max(pSig, 1e-300) / Math.max(pTot - pSig, 1e-300))));
    },

    // ── thd(x[,Fs][,n]) — THD in dB: ratio of harmonic power to fundamental ──
    thd: (a) => {
      const x = toArray(m(a[0])), N = x.length, half = Math.floor(N / 2);
      const nHarmonics = a.length >= 3 && isMat(a[2]) ? Math.round(asScalar(a[2])) : 6;
      const Pxx: number[] = [];
      for (let k = 0; k <= half; k++) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const ang = -2 * Math.PI * k * n / N; re += x[n] * Math.cos(ang); im += x[n] * Math.sin(ang); } let p = (re * re + im * im) / N; if (k > 0 && (k < half || N % 2 !== 0)) p *= 2; Pxx.push(p); }
      let iMax = 1; for (let k = 2; k <= half; k++) if (Pxx[k] > Pxx[iMax]) iMax = k;
      const pFund = Pxx[iMax];
      let pHarm = 0;
      for (let h = 2; h <= nHarmonics; h++) {
        const iBin = iMax * h; if (iBin > half) break;
        let iPeak = iBin; for (let k = Math.max(1, iBin - 2); k <= Math.min(half, iBin + 2); k++) if (Pxx[k] > Pxx[iPeak]) iPeak = k;
        pHarm += Pxx[iPeak];
      }
      return ret(scalar(10 * Math.log10(Math.max(pHarm, 1e-300) / Math.max(pFund, 1e-300))));
    },

    // ── sfdr(x) — SFDR in dB: fundamental power / highest spur power ──
    sfdr: (a) => {
      const x = toArray(m(a[0])), N = x.length, half = Math.floor(N / 2);
      const Pxx: number[] = [];
      for (let k = 0; k <= half; k++) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const ang = -2 * Math.PI * k * n / N; re += x[n] * Math.cos(ang); im += x[n] * Math.sin(ang); } let p = (re * re + im * im) / N; if (k > 0 && (k < half || N % 2 !== 0)) p *= 2; Pxx.push(p); }
      let iMax = 1; for (let k = 2; k <= half; k++) if (Pxx[k] > Pxx[iMax]) iMax = k;
      const pFund = Pxx[iMax];
      const excl = Math.max(2, Math.floor(half / 50));
      let pSpur = 0;
      for (let k = 1; k <= half; k++) {
        if (Math.abs(k - iMax) <= excl) continue;
        if (k > 1 && k < half && Pxx[k] > Pxx[k - 1] && Pxx[k] >= Pxx[k + 1]) pSpur = Math.max(pSpur, Pxx[k]);
      }
      if (pSpur === 0) pSpur = 1e-300;
      return ret(scalar(10 * Math.log10(Math.max(pFund, 1e-300) / pSpur)));
    },

    // ── Tier-3: Parametric PSD estimators ──
    // pburg(x,order[,nfft]) — Burg AR PSD; [pxx,w] one-sided, w in rad/sample.
    pburg: (a, nargout) => {
      const x = toArray(m(a[0])), p = Math.round(asScalar(a[1]));
      const nfft = a.length >= 3 && isMat(a[2]) && m(a[2]).rows * m(a[2]).cols > 0 ? Math.round(asScalar(a[2])) : Math.max(256, 2 ** Math.ceil(Math.log2(x.length)));
      const { a: ar, e } = t3_burgCoeffs(x, p);
      const { Pxx, w } = t3_arPSD(ar, e, nfft);
      return Promise.resolve(nargout >= 2 ? [colVec(Pxx), colVec(w)] : [colVec(Pxx)]);
    },
    // pyulear(x,order[,nfft]) — Yule-Walker AR PSD (autocorrelation method).
    pyulear: (a, nargout) => {
      const x = toArray(m(a[0])), p = Math.round(asScalar(a[1]));
      const nfft = a.length >= 3 && isMat(a[2]) && m(a[2]).rows * m(a[2]).cols > 0 ? Math.round(asScalar(a[2])) : Math.max(256, 2 ** Math.ceil(Math.log2(x.length)));
      const r = t3_autocorr(x, p);
      const { a: ar, e } = levinsonDurbin(r, p);
      const { Pxx, w } = t3_arPSD(ar, e, nfft);
      return Promise.resolve(nargout >= 2 ? [colVec(Pxx), colVec(w)] : [colVec(Pxx)]);
    },
    // pcov(x,order[,nfft]) — covariance AR PSD (forward prediction error, modified autocorrelation).
    // Uses the forward covariance method: minimize Σ|x[n] + a1*x[n-1]+...|^2 over n=p..N-1.
    pcov: (a, nargout) => {
      const x = toArray(m(a[0])), p = Math.round(asScalar(a[1]));
      const nfft = a.length >= 3 && isMat(a[2]) && m(a[2]).rows * m(a[2]).cols > 0 ? Math.round(asScalar(a[2])) : Math.max(256, 2 ** Math.ceil(Math.log2(x.length)));
      const N = x.length;
      // Build covariance matrix: C[i][j] = (1/(N-p)) * sum_{n=p}^{N-1} x[n-i]*x[n-j]
      const C: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
      const cv: number[] = new Array(p).fill(0);
      const sc = 1 / (N - p);
      for (let n = p; n < N; n++) {
        for (let i = 0; i < p; i++) { for (let j = 0; j < p; j++) C[i][j] += x[n - 1 - i] * x[n - 1 - j] * sc; cv[i] += x[n] * x[n - 1 - i] * sc; }
      }
      // Solve C * a1 = -cv (Levinson or Gaussian elim)
      const aug: number[][] = C.map((row, r) => [...row, -cv[r]]);
      for (let col = 0; col < p; col++) {
        let piv = col; for (let r = col + 1; r < p; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[piv][col])) piv = r;
        [aug[col], aug[piv]] = [aug[piv], aug[col]];
        const d = aug[col][col]; if (Math.abs(d) < 1e-300) continue;
        for (let r = 0; r < p; r++) { if (r === col) continue; const f = aug[r][col] / d; for (let c = col; c <= p; c++) aug[r][c] -= f * aug[col][c]; }
      }
      const aCoeffs = aug.map((row, i) => row[p] / row[i]);
      const ar = [1, ...aCoeffs];
      let e = 0; for (let n = p; n < N; n++) { let pred = x[n]; for (let i = 0; i < p; i++) pred += aCoeffs[i] * x[n - 1 - i]; e += pred * pred; }
      e /= (N - p);
      const { Pxx, w } = t3_arPSD(ar, e, nfft);
      return Promise.resolve(nargout >= 2 ? [colVec(Pxx), colVec(w)] : [colVec(Pxx)]);
    },
    // pmcov(x,order[,nfft]) — modified covariance AR PSD (forward+backward prediction error average).
    pmcov: (a, nargout) => {
      const x = toArray(m(a[0])), p = Math.round(asScalar(a[1]));
      const nfft = a.length >= 3 && isMat(a[2]) && m(a[2]).rows * m(a[2]).cols > 0 ? Math.round(asScalar(a[2])) : Math.max(256, 2 ** Math.ceil(Math.log2(x.length)));
      const N = x.length;
      // Modified covariance: average of forward and backward covariance matrices
      const C: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
      const cv: number[] = new Array(p).fill(0);
      const sc = 1 / (2 * (N - p));
      for (let n = p; n < N; n++) {
        // Forward part
        for (let i = 0; i < p; i++) { for (let j = 0; j < p; j++) C[i][j] += x[n - 1 - i] * x[n - 1 - j] * sc; cv[i] += x[n] * x[n - 1 - i] * sc; }
        // Backward part (predict x[n-p] from x[n-p+1]...x[n])
        for (let i = 0; i < p; i++) { for (let j = 0; j < p; j++) C[i][j] += x[n - p + i] * x[n - p + j] * sc; cv[i] += x[n - p] * x[n - p + 1 + i] * sc; }
      }
      const aug: number[][] = C.map((row, r) => [...row, -cv[r]]);
      for (let col = 0; col < p; col++) {
        let piv = col; for (let r = col + 1; r < p; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[piv][col])) piv = r;
        [aug[col], aug[piv]] = [aug[piv], aug[col]];
        const d = aug[col][col]; if (Math.abs(d) < 1e-300) continue;
        for (let r = 0; r < p; r++) { if (r === col) continue; const f = aug[r][col] / d; for (let c = col; c <= p; c++) aug[r][c] -= f * aug[col][c]; }
      }
      const aCoeffs = aug.map((row, i) => row[p] / row[i]);
      const ar = [1, ...aCoeffs];
      let e = 0; for (let n = p; n < N; n++) { let pred = x[n]; for (let i = 0; i < p; i++) pred += aCoeffs[i] * x[n - 1 - i]; e += pred * pred; }
      e /= (N - p);
      const { Pxx, w } = t3_arPSD(ar, e, nfft);
      return Promise.resolve(nargout >= 2 ? [colVec(Pxx), colVec(w)] : [colVec(Pxx)]);
    },

    // ── Tier-3: Cross-spectral functions (Welch method) ──
    // cpsd(x,y[,window,noverlap,nfft,fs]) — cross power spectral density (complex). [Pxy, f].
    cpsd: (a, nargout) => {
      const x = toArray(m(a[0])), y = toArray(m(a[1]));
      if (x.length !== y.length) throw new Error('cpsd: x and y must have the same length');
      const p = t3_welchParams(x, a, 2);
      const { Pxy_re, Pxy_im, f } = t3_welchCross(x, y, p.wlen, p.noverlap, p.nfft, p.fs);
      const Pxy = colVec(Pxy_re); Pxy.idata = Float64Array.from(Pxy_im);
      return Promise.resolve(nargout >= 2 ? [Pxy, colVec(f)] : [Pxy]);
    },
    // mscohere(x,y[,...]) — magnitude-squared coherence = |Pxy|^2 / (Pxx * Pyy). [Cxy, f].
    mscohere: (a, nargout) => {
      const x = toArray(m(a[0])), y = toArray(m(a[1]));
      if (x.length !== y.length) throw new Error('mscohere: x and y must have the same length');
      const p = t3_welchParams(x, a, 2);
      const { Pxy_re, Pxy_im, Pxx, Pyy, f } = t3_welchCross(x, y, p.wlen, p.noverlap, p.nfft, p.fs);
      const Cxy = Pxy_re.map((re, k2) => {
        const num = re * re + Pxy_im[k2] * Pxy_im[k2];
        const den = Pxx[k2] * Pyy[k2];
        return den > 0 ? num / den : 0;
      });
      return Promise.resolve(nargout >= 2 ? [colVec(Cxy), colVec(f)] : [colVec(Cxy)]);
    },
    // tfestimate(x,y[,...]) — H1 transfer function estimate = Pxy / Pxx. Complex. [Txy, f].
    tfestimate: (a, nargout) => {
      const x = toArray(m(a[0])), y = toArray(m(a[1]));
      if (x.length !== y.length) throw new Error('tfestimate: x and y must have the same length');
      const p = t3_welchParams(x, a, 2);
      const { Pxy_re, Pxy_im, Pxx, f } = t3_welchCross(x, y, p.wlen, p.noverlap, p.nfft, p.fs);
      const Tre = Pxy_re.map((re, k2) => Pxx[k2] > 0 ? re / Pxx[k2] : 0);
      const Tim = Pxy_im.map((im, k2) => Pxx[k2] > 0 ? im / Pxx[k2] : 0);
      const Txy = colVec(Tre); Txy.idata = Float64Array.from(Tim);
      return Promise.resolve(nargout >= 2 ? [Txy, colVec(f)] : [Txy]);
    },

    // ── Tier-3: Lomb-Scargle periodogram ──
    // plomb(x,t[,f]) — Lomb-Scargle PSD for nonuniform samples. [pxx, f] or [pxx, f, pth].
    plomb: (a, nargout) => {
      const x = toArray(m(a[0])), t2 = toArray(m(a[1]));
      const N = x.length;
      if (t2.length !== N) throw new Error('plomb: x and t must have the same length');
      const xmean = x.reduce((s, v) => s + v, 0) / N;
      const xc = x.map((v) => v - xmean);
      const xvar = xc.reduce((s, v) => s + v * v, 0) / N;
      // Frequency vector: default ofac=4 oversampling, or user-supplied
      let fvec: number[];
      if (a.length >= 3 && isMat(a[2]) && m(a[2]).rows * m(a[2]).cols > 0) {
        fvec = toArray(m(a[2]));
      } else {
        // Default: [1/T_span, ..., f_Nyquist*ofac] with ofac=4
        const tspan = Math.max(...t2) - Math.min(...t2);
        const fmin = tspan > 0 ? 1 / tspan : 1;
        const dt_avg = tspan / Math.max(N - 1, 1);
        const fmax = dt_avg > 0 ? 0.5 / dt_avg : N / 2;
        const nf = Math.round(4 * (fmax - fmin) / fmin);
        const nf2 = Math.max(nf, N);
        fvec = Array.from({ length: nf2 }, (_, i) => fmin + i * (fmax - fmin) / Math.max(nf2 - 1, 1));
      }
      const Pxx: number[] = fvec.map((ff) => {
        const w2pi = 2 * Math.PI * ff;
        // tau: offset to orthogonalize sin/cos terms
        let s2wt = 0, c2wt = 0;
        for (let n = 0; n < N; n++) { s2wt += Math.sin(2 * w2pi * t2[n]); c2wt += Math.cos(2 * w2pi * t2[n]); }
        const tau = ff > 0 ? Math.atan2(s2wt, c2wt) / (2 * w2pi) : 0;
        let cc = 0, ss = 0, cs = 0;
        let xcc = 0, xss = 0;
        for (let n = 0; n < N; n++) {
          const ph = w2pi * (t2[n] - tau);
          const co = Math.cos(ph), si = Math.sin(ph);
          cc += co * co; ss += si * si;
          xcc += xc[n] * co; xss += xc[n] * si;
        }
        const p1 = cc > 0 ? xcc * xcc / cc : 0;
        const p2 = ss > 0 ? xss * xss / ss : 0;
        return xvar > 0 ? (p1 + p2) / (2 * xvar) : 0;
      });
      return Promise.resolve(nargout >= 2 ? [colVec(Pxx), colVec(fvec)] : [colVec(Pxx)]);
    },

    // ── Tier-3: Pulse shaping filters ──
    // rcosdesign(beta,span,sps[,shape]) — raised-cosine or root-raised-cosine FIR.
    rcosdesign: (a) => {
      const beta = asScalar(a[0]), span = Math.round(asScalar(a[1])), sps = Math.round(asScalar(a[2]));
      const shape = a.length >= 4 && (isStr(a[3]) || (isMat(a[3]) && (a[3] as Mat).isChar))
        ? (asString(a[3]).toLowerCase().startsWith('n') ? 'normal' : 'sqrt') : 'sqrt';
      if (beta < 0 || beta > 1) throw new Error('rcosdesign: BETA must be in [0, 1]');
      if ((sps * span) % 2 !== 0) throw new Error('rcosdesign: filter order (sps*span) must be even');
      return ret(rowVec(t3_rcosdesignImpl(beta, span, sps, shape)));
    },
    // gaussdesign(bt,span,sps) — Gaussian pulse-shaping FIR (BT product, span, samples/symbol).
    gaussdesign: (a) => {
      const bt = asScalar(a[0]);
      const span = a.length >= 2 && isMat(a[1]) ? Math.round(asScalar(a[1])) : 3;
      const sps = a.length >= 3 && isMat(a[2]) ? Math.round(asScalar(a[2])) : 2;
      if ((sps * span) % 2 !== 0) throw new Error('gaussdesign: filter order (sps*span) must be even');
      const filtLen = sps * span + 1;
      const t2 = Array.from({ length: filtLen }, (_, i) => -span / 2 + i * span / (filtLen - 1));
      const alpha = Math.sqrt(Math.log(2) / 2) / bt;
      const h = t2.map((ti) => { const x2 = ti * Math.PI / alpha; return Math.sqrt(Math.PI) / alpha * Math.exp(-(x2 * x2)); });
      const sum = h.reduce((s, v) => s + v, 0);
      return ret(rowVec(sum > 0 ? h.map((v) => v / sum) : h));
    },

    // ── Tier-3: Frequency-domain system ID ──
    // invfreqz(h,w,nb,na) — LS fit [b,a] from complex H(e^jw) samples.
    invfreqz: (a, nargout) => {
      const M = m(a[0]);
      const Hr = toArray(M), Hi = M.idata ? Array.from(M.idata) : new Array(Hr.length).fill(0);
      const w2 = toArray(m(a[1])), nb = Math.round(asScalar(a[2])), na = Math.round(asScalar(a[3]));
      const nw = Hr.length, nk = 0, T = 1;
      const nm = Math.max(na, nb + nk);
      // Build OM matrix: rows are freq points, cols are powers e^{-jwk}
      // D = [Dva, Dvb] where Dva[i,m] = OM[m+1, i] * g[i], Dvb[i,m] = -OM[m, i]
      // OM[m, i] = e^{-j*m*w[i]*T}
      const Dva_re: number[][] = [], Dva_im: number[][] = [], Dvb_re: number[][] = [], Dvb_im: number[][] = [];
      for (let i = 0; i < nw; i++) {
        const gr = Hr[i], gi = Hi[i];
        const rDva: number[] = [], iDva: number[] = [], rDvb: number[] = [], iDvb: number[] = [];
        for (let mn = 1; mn <= na; mn++) {
          const ang = -mn * w2[i] * T;
          const cr = Math.cos(ang), si = Math.sin(ang);
          // Dva[i,m] = OM[m+1,i] * g[i]
          rDva.push(cr * gr - si * gi); iDva.push(cr * gi + si * gr);
        }
        for (let mn = nk; mn <= nk + nb; mn++) {
          const ang = -mn * w2[i] * T;
          const cr = Math.cos(ang), si = Math.sin(ang);
          rDvb.push(-cr); iDvb.push(-si);
        }
        Dva_re.push(rDva); Dva_im.push(iDva); Dvb_re.push(rDvb); Dvb_im.push(iDvb);
      }
      // D_real = [real(Dva) real(Dvb); imag(Dva) imag(Dvb)]
      // Vd_real = [real(-g); imag(-g)]  (RHS)
      const nc = na + nb + 1;
      const D_re: number[][] = [];
      const Vd_re: number[] = [];
      for (let i = 0; i < nw; i++) {
        D_re.push([...Dva_re[i], ...Dvb_re[i]]);
        D_re.push([...Dva_im[i], ...Dvb_im[i]]);
        Vd_re.push(-Hr[i]); Vd_re.push(-Hi[i]);
      }
      const th = t3_gaussLS(D_re, Vd_re);
      const a1 = [1, ...th.slice(0, na)];
      const b1 = th.slice(na, na + nb + 1);
      return Promise.resolve(nargout >= 2 ? [rowVec(b1), rowVec(a1)] : [rowVec(b1)]);
    },

    // ── Tier-3: Prony and Steiglitz-McBride system ID ──
    // prony(h,nb,na) — Prony's method: [b,a] from impulse response h (length ≥ nb+na+1).
    prony: (a, nargout) => {
      // Prony's method: fit H(z)=B(z)/A(z) of orders nb/na to impulse response h.
      // 1. Pad h to length >= na+nb+1.
      // 2. Build LS system: h[i] + a1*h[i-1] + ... + a_na*h[i-na] = 0, i = na..K-1.
      // 3. Solve for a[1..na].
      // 4. b = first nb+1 samples of conv(a, h).
      const h = toArray(m(a[0])), nb = Math.round(asScalar(a[1])), na = Math.round(asScalar(a[2]));
      const hPad = h.slice();
      while (hPad.length < na + nb + 1) hPad.push(0);
      const K = hPad.length;
      // Step 2-3: solve for denominator coefficients
      let aCoeffs: number[] = [];
      if (na > 0) {
        const A2: number[][] = [], rhs2: number[] = [];
        for (let i = na; i < K; i++) {
          const row: number[] = [];
          for (let j = 1; j <= na; j++) row.push(i - j >= 0 ? hPad[i - j] : 0);
          A2.push(row); rhs2.push(-hPad[i]);
        }
        if (A2.length > 0) aCoeffs = t3_gaussLS(A2, rhs2);
      }
      const aFull = [1, ...aCoeffs];
      // Step 4: b = conv(aFull, hPad)[0..nb]
      const bFull: number[] = new Array(nb + 1).fill(0);
      for (let j = 0; j <= nb; j++) {
        let s = 0;
        for (let l = 0; l < aFull.length && l <= j; l++) s += aFull[l] * hPad[j - l];
        bFull[j] = s;
      }
      return Promise.resolve(nargout >= 2 ? [rowVec(bFull), rowVec(aFull)] : [rowVec(bFull)]);
    },
    // stmcb(h[,u],nb,na[,niter,aInit]) — Steiglitz-McBride iteration.
    // stmcb(h,nb,na) — impulse-response form: u = delta.
    stmcb: (a, nargout) => {
      // Parse args: stmcb(h,nb,na) or stmcb(h,u,nb,na)
      let h: number[], u0: number[], nb: number, na: number, niter: number;
      // Distinguish: if a[1] is scalar-compatible → stmcb(h,nb,na)
      const a1 = m(a[1]), a1sz = a1.rows * a1.cols;
      if (a1sz === 1) {
        // stmcb(h, nb, na)
        h = toArray(m(a[0])); nb = Math.round(asScalar(a[1])); na = Math.round(asScalar(a[2]));
        niter = a.length >= 4 && isMat(a[3]) ? Math.round(asScalar(a[3])) : 5;
        u0 = new Array(h.length).fill(0); if (u0.length > 0) u0[0] = 1;
      } else {
        // stmcb(h, u, nb, na)
        h = toArray(m(a[0])); u0 = toArray(m(a[1])); nb = Math.round(asScalar(a[2])); na = Math.round(asScalar(a[3]));
        niter = a.length >= 5 && isMat(a[4]) ? Math.round(asScalar(a[4])) : 5;
      }
      const N2 = h.length;
      // Initialize aFull from Prony (denominator-only LS on h)
      const hP = h.slice(); while (hP.length < na + nb + 1) hP.push(0);
      let aCoeffs: number[] = [];
      if (na > 0) {
        const A2: number[][] = [], rhs2: number[] = [];
        for (let i = na; i < hP.length; i++) {
          const row: number[] = [];
          for (let j = 1; j <= na; j++) row.push(i - j >= 0 ? hP[i - j] : 0);
          A2.push(row); rhs2.push(-hP[i]);
        }
        if (A2.length > 0) aCoeffs = t3_gaussLS(A2, rhs2);
      }
      let aFull: number[] = [1, ...aCoeffs];
      // Steiglitz-McBride iterations: build [Ub | -Hb_lag] * [b; a_coeff]' = hFilt
      // where Ub[n,k] = uFilt[n-k] for k=0..nb, Hb_lag[n,k] = hFilt[n-k] for k=1..na
      // Column for a_coeff[k] stores -hFilt[n-k], so c[nb+1+k-1] = a_coeff[k] (positive, not negated).
      for (let iter = 0; iter < niter; iter++) {
        const hFilt = filterDf2t([1], aFull, h).y;
        const uFilt = filterDf2t([1], aFull, u0.slice(0, N2)).y;
        const T: number[][] = [];
        for (let n = 0; n < N2; n++) {
          const row: number[] = [];
          for (let mm = 0; mm <= nb; mm++) row.push(n >= mm ? uFilt[n - mm] : 0);   // b cols
          for (let mm = 1; mm <= na; mm++) row.push(-(n >= mm ? hFilt[n - mm] : 0)); // -a cols
          T.push(row);
        }
        const c = t3_gaussLS(T, hFilt);  // RHS = hFilt (filtered h)
        // c = [b0..bnb, a1..ana] where a cols stored as negatives → a_coeff direct
        aFull = [1, ...c.slice(nb + 1, nb + 1 + na)];
      }
      // Final b: b = filter(a, 1, h)(0..nb) = conv(a, h)(0..nb)
      const bFull: number[] = new Array(nb + 1).fill(0);
      for (let j = 0; j <= nb; j++) {
        let s = 0;
        for (let l = 0; l < aFull.length && l <= j; l++) s += aFull[l] * h[j - l];
        bFull[j] = s;
      }
      return Promise.resolve(nargout >= 2 ? [rowVec(bFull), rowVec(aFull)] : [rowVec(bFull)]);
    },

    // ── Tier-3: Lattice filters ──
    // tf2latc(b[,a]) — TF to lattice. For IIR: K=poly2rc(a), V from rlevinson recursion.
    tf2latc: (a, nargout) => {
      const b = toArray(m(a[0]));
      const isFIR = a.length < 2 || !isMat(a[1]) || m(a[1]).rows * m(a[1]).cols === 0 || toArray(m(a[1])).every((v) => v === 0);
      if (isFIR) {
        // FIR case: K = poly2rc(b), V = b (if nargout>=2, V=b, K=zeros)
        if (nargout >= 2) {
          const K = rowVec(new Array(b.length - 1).fill(0));
          return Promise.resolve([K, colVec(b)]);
        }
        // nargout=1: k = poly2rc(b) (step-down)
        const k = stepDown(b).k;
        return Promise.resolve([colVec(k)]);
      }
      const den = toArray(m(a[1]));
      // Normalize
      const d0 = den[0];
      const bn = b.map((v) => v / d0), dn = den.map((v) => v / d0);
      if (bn.length === 1) {
        // All-pole: K = poly2rc(dn), V = [bn[0]; zeros(M-1)]
        const k = stepDown(dn).k;
        const V = [bn[0], ...new Array(k.length).fill(0)];
        return Promise.resolve(nargout >= 2 ? [colVec(k), colVec(V)] : [colVec(k)]);
      }
      // IIR case: K = poly2rc(dn), V from rlevinson recursion
      const k = stepDown(dn).k;
      // Equalize lengths
      while (bn.length < dn.length) bn.push(0);
      const M = dn.length;
      // Compute V: V[m] = bn[m] - sum(V[j] * U[m][j]) for j=m+1..M-1
      // where U = rlevinson matrix of dn (M×M)
      const U = t3_rlevinson(dn);
      const V = new Array(M).fill(0);
      for (let idx = M - 1; idx >= 0; idx--) {
        let subterm = 0;
        for (let j = idx + 1; j < M; j++) subterm += U[idx][j] * V[j];
        V[idx] = bn[idx] - subterm;
      }
      return Promise.resolve(nargout >= 2 ? [colVec(k), colVec(V)] : [colVec(k)]);
    },
    // latc2tf(k[,v]) — Lattice to TF. FIR if no v (or v='fir'); IIR if v is numeric.
    latc2tf: (a, nargout) => {
      const k = toArray(m(a[0]));
      const hasDen = a.length >= 2 && isMat(a[1]) && m(a[1]).rows * m(a[1]).cols > 0;
      if (!hasDen) {
        // FIR: num = rc2poly(k), den = 1
        const num = stepUp(k);   // rc2poly
        return Promise.resolve(nargout >= 2 ? [rowVec(num), rowVec([1])] : [rowVec(num)]);
      }
      // IIR: den = rc2poly(k), num = U * V
      const den = stepUp(k);  // rc2poly
      const M = den.length;
      const U = t3_rlevinson(den);
      const v = toArray(m(a[1]));
      const vp = v.slice(); while (vp.length < M) vp.push(0);
      const num: number[] = new Array(M).fill(0);
      for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) num[i] += U[i][j] * vp[j];
      return Promise.resolve(nargout >= 2 ? [rowVec(num), rowVec(den)] : [rowVec(num)]);
    },
    // latcfilt(k[,v],x) — Lattice filter: FIR if k only, IIR if v also supplied.
    latcfilt: (a, nargout) => {
      // Detect args: latcfilt(k, x) or latcfilt(k, v, x)
      const k = toArray(m(a[0]));
      let v: number[] | null = null, xIn: number[], xMat: Mat;
      if (a.length >= 3) {
        // latcfilt(k, v, x)
        v = toArray(m(a[1])); xMat = m(a[2]); xIn = toArray(xMat);
      } else {
        // latcfilt(k, x)
        xMat = m(a[1]); xIn = toArray(xMat);
      }
      const isCol = xMat.cols === 1 && xMat.rows > 1;
      if (v === null) {
        // FIR lattice
        const { f, g } = t3_latcFIR(k, xIn);
        const fOut = isCol ? colVec(f) : rowVec(f);
        const gOut = isCol ? colVec(g) : rowVec(g);
        return Promise.resolve(nargout >= 2 ? [fOut, gOut] : [fOut]);
      } else {
        // IIR lattice-ladder
        const y = t3_latcIIR(k, v, xIn);
        // Second output (g) would be the all-pole output; compute it as filter(1, rc2poly(k), x)
        if (nargout >= 2) {
          const den = stepUp(k);
          const g = filterDf2t([1], den, xIn).y;
          return Promise.resolve([isCol ? colVec(y) : rowVec(y), isCol ? colVec(g) : rowVec(g)]);
        }
        return ret(isCol ? colVec(y) : rowVec(y));
      }
    },
  },
  help: HELP_SIGNAL,
};
