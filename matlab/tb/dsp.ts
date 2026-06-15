// DSP System Toolbox — fills gaps not covered by the Signal Processing Toolbox:
// firpm/remez (Parks-McClellan Remez exchange), firls (least-squares FIR),
// sosfilt, tf2sos/sos2tf/zp2tf/tf2zp/zp2sos, grpdelay, impz/stepz,
// bilinear (standalone), besself, decimate/interp/resample,
// dsp.FIRFilter/BiquadFilter/FIRDecimator/FIRInterpolator/RMS/Mean/Variance System objects.
import {
  type Value, type Mat, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat,
  MatError, mat, zeros, makeObject, fromRows, str, bool,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_DSP } from '../help/help-dsp';

// ── Complex arithmetic ─────────────────────────────────────────────────────────────────
type C = [number, number];
const cAdd = (a: C, b: C): C => [a[0]+b[0], a[1]+b[1]];
const cSub = (a: C, b: C): C => [a[0]-b[0], a[1]-b[1]];
const cMul = (a: C, b: C): C => [a[0]*b[0]-a[1]*b[1], a[0]*b[1]+a[1]*b[0]];
const cDiv = (a: C, b: C): C => { const d=b[0]**2+b[1]**2; return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d]; };
const cAbs = (a: C) => Math.sqrt(a[0]**2+a[1]**2);
const cConj = (a: C): C => [a[0], -a[1]];
const cSc = (a: C, s: number): C => [a[0]*s, a[1]*s];
const cSqrt = (a: C): C => { const r=Math.sqrt(cAbs(a)); const th=Math.atan2(a[1],a[0])/2; return [r*Math.cos(th), r*Math.sin(th)]; };
const cFromPolar = (r: number, th: number): C => [r*Math.cos(th), r*Math.sin(th)];
const cPow = (a: C, n: number): C => cFromPolar(cAbs(a)**n, Math.atan2(a[1],a[0])*n);

// ── Polynomial utilities (complex coefficients, descending powers) ─────────────────────
function polyMul(a: C[], b: C[]): C[] {
  const c: C[] = Array.from({length: a.length+b.length-1}, () => [0,0] as C);
  for (let i=0;i<a.length;i++) for (let j=0;j<b.length;j++) {
    c[i+j][0] += a[i][0]*b[j][0] - a[i][1]*b[j][1];
    c[i+j][1] += a[i][0]*b[j][1] + a[i][1]*b[j][0];
  }
  return c;
}

// Convert roots to monic polynomial: prod(z - r_k)
function roots2poly(roots: C[]): C[] {
  let p: C[] = [[1,0]];
  for (const r of roots) p = polyMul(p, [[1,0],[-r[0],-r[1]]]);
  return p;
}

// Evaluate polynomial at a complex point (Horner)
function polyEval(p: C[], z: C): C {
  let val: C = [0,0];
  for (const c of p) val = cAdd(cMul(val, z), c);
  return val;
}

// Durand-Kerner root finder — finds all roots of polynomial p (real or complex coefficients)
function polyRoots(coeffs: number[]): C[] {
  const n = coeffs.length - 1;
  if (n <= 0) return [];
  const a = coeffs.map(v => v / coeffs[0]);
  // Initial guesses on a circle of radius ~1
  let roots: C[] = Array.from({length: n}, (_, k) => cFromPolar(0.7*n, 2*Math.PI*k/n + 0.3));
  for (let iter = 0; iter < 200; iter++) {
    let maxMove = 0;
    for (let i = 0; i < n; i++) {
      // Evaluate polynomial at current root
      let pval: C = [a[0],0];
      for (let j = 1; j <= n; j++) pval = cAdd(cMul(pval, roots[i]), [a[j],0]);
      // Product of (root_i - root_j) for j != i
      let denom: C = [1,0];
      for (let j = 0; j < n; j++) if (j !== i) denom = cMul(denom, cSub(roots[i], roots[j]));
      if (cAbs(denom) < 1e-300) continue;
      const delta = cDiv(pval, denom);
      roots[i] = cSub(roots[i], delta);
      maxMove = Math.max(maxMove, cAbs(delta));
    }
    if (maxMove < 1e-12) break;
  }
  return roots;
}

// ZPK → [b, a] real polynomial coefficients
function zpk2ba(zeros: C[], poles: C[], k: number): [Float64Array, Float64Array] {
  const B = roots2poly(zeros).map(c => c[0] * k);
  const A = roots2poly(poles).map(c => c[0]);
  return [Float64Array.from(B), Float64Array.from(A)];
}

// ── Gaussian elimination (real, in-place, returns solution x) ─────────────────────────
function gaussElim(mat: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const A = mat.map(r => [...r]);
  const b = [...rhs];
  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col; let maxVal = Math.abs(A[col][col]);
    for (let row = col+1; row < n; row++) if (Math.abs(A[row][col]) > maxVal) { maxVal = Math.abs(A[row][col]); maxRow = row; }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    [b[col], b[maxRow]] = [b[maxRow], b[col]];
    const piv = A[col][col];
    if (Math.abs(piv) < 1e-14) continue;
    for (let row = col+1; row < n; row++) {
      const f = A[row][col] / piv;
      for (let c = col; c < n; c++) A[row][c] -= f * A[col][c];
      b[row] -= f * b[col];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n-1; i >= 0; i--) {
    x[i] = b[i];
    for (let j = i+1; j < n; j++) x[i] -= A[i][j] * x[j];
    x[i] /= A[i][i] || 1;
  }
  return x;
}

// ── Bessel polynomial computation ─────────────────────────────────────────────────────
// Reverse Bessel polynomials θ_n(s) via recurrence: θ_n(s) = (2n-1)*θ_{n-1}(s) + s^2*θ_{n-2}(s)
function besselPoly(n: number): number[] {
  if (n === 0) return [1];
  if (n === 1) return [1, 1];
  let prev2 = [1], prev1 = [1,1];
  for (let k = 2; k <= n; k++) {
    // (2k-1)*prev1 + s^2*prev2
    const cur: number[] = Array(k+1).fill(0);
    for (let i = 0; i < prev1.length; i++) cur[i] += (2*k-1) * prev1[i];
    for (let i = 0; i < prev2.length; i++) cur[i+2] += prev2[i];
    prev2 = prev1; prev1 = cur;
  }
  return prev1;
}

// ── besself — analog Bessel lowpass prototype ─────────────────────────────────────────
// Returns zeros, poles, gain for Bessel analog LP prototype (cutoff at ~1 rad/s, max-flat group delay)
function besselpap(n: number): { z: C[]; p: C[]; k: number } {
  if (n === 0) return { z: [], p: [], k: 1 };
  const polyAsc = besselPoly(n);              // reverse Bessel poly θ_n in ASCENDING powers
  const polyDesc = [...polyAsc].reverse();    // descending for the root finder
  const rawPoles = polyRoots(polyDesc);
  // MATLAB besselap normalizes so the magnitude cutoff is at ω=1: divide poles by
  // (constant term)^(1/n), and the (analog) gain is prod(-p_k) so that H(0)=1.
  const c0 = polyAsc[0];                      // θ_n(0) = constant term
  const scale = Math.pow(c0, 1 / n);
  const poles = rawPoles.map(r => [r[0] / scale, r[1] / scale] as C);
  const k = poles.reduce<C>((acc, pk) => cMul(acc, [-pk[0], -pk[1]]), [1, 0])[0];
  return { z: [], p: poles, k };
}

// ── Analog LP → LP/HP/BP/BS frequency transformation ─────────────────────────────────
// Takes LP prototype ZPK and transforms to target type with given prewarped cutoffs.
function analogTransform(
  z_in: C[], p_in: C[], k_in: number,
  btype: 'lowpass'|'highpass'|'bandpass'|'bandstop',
  Omega: number[] // [Omega] for LP/HP, [OmegaL, OmegaU] for BP/BS
): { z: C[]; p: C[]; k: number } {
  const n = p_in.length, m = z_in.length;

  if (btype === 'lowpass') {
    const Wc = Omega[0];
    return { z: z_in.map(z0 => cSc(z0, Wc)), p: p_in.map(pk => cSc(pk, Wc)), k: k_in * Wc**(n-m) };
  }

  if (btype === 'highpass') {
    const Wc = Omega[0];
    const newP = p_in.map(pk => cDiv([Wc,0], pk));
    const newZ = [...z_in.map(zk => cDiv([Wc,0], zk)), ...Array(n-m).fill(null).map(() => [0,0] as C)];
    // Gain: k * prod(-pk)/prod(-zk) * Wc^(m-n)
    const prodP = p_in.reduce<C>((acc, pk) => cMul(acc, [-pk[0],-pk[1]]), [1,0]);
    const prodZ = z_in.length > 0 ? z_in.reduce<C>((acc, zk) => cMul(acc, [-zk[0],-zk[1]]), [1,0]) : [1,0] as C;
    const newK = k_in * prodP[0] / prodZ[0] * Wc**(m-n);
    return { z: newZ, p: newP, k: newK };
  }

  if (btype === 'bandpass') {
    const [OmL, OmU] = Omega;
    const BW = OmU - OmL, Omega0Sq = OmL * OmU;
    const newP: C[] = [];
    for (const pk of p_in) {
      // s_lp = pk → solve: (s^2 + Omega0^2)/(s*BW) = pk
      // s^2 - pk*BW*s + Omega0^2 = 0
      const alpha = cSc(pk, BW/2);
      const disc = cSqrt(cSub(cMul(alpha, alpha), [Omega0Sq, 0]));
      newP.push(cAdd(alpha, disc), cSub(alpha, disc));
    }
    // LP zeros at infinity → zeros at s=0 (n of them) + zeros at infinity (n, become z=-1 after bilinear)
    const newZ = [...z_in.flatMap(zk => {
      const alpha = cSc(zk, BW/2);
      const disc = cSqrt(cSub(cMul(alpha, alpha), [Omega0Sq, 0]));
      return [cAdd(alpha, disc), cSub(alpha, disc)];
    }), ...Array(n-m).fill(null).map(() => [0,0] as C)];
    const newK = k_in * BW**(n-m);
    return { z: newZ, p: newP, k: newK };
  }

  // bandstop
  const [OmL, OmU] = Omega;
  const BW = OmU - OmL, Omega0Sq = OmL * OmU;
  const newP: C[] = [];
  for (const pk of p_in) {
    // s*BW/(s^2+Omega0^2) = pk → p_k*s^2 - BW*s + p_k*Omega0^2 = 0
    const alpha = cDiv([BW/2, 0], pk);
    const disc = cSqrt(cSub(cMul(alpha, alpha), [Omega0Sq, 0]));
    newP.push(cAdd(alpha, disc), cSub(alpha, disc));
  }
  // n LP zeros at ∞ → n pairs at ±j*Omega0 = imaginary axis zeros
  const jOm0: C = [0, Math.sqrt(Omega0Sq)];
  const newZ = [...z_in.flatMap(zk => {
    const alpha = cDiv([BW/2, 0], zk);
    const disc = cSqrt(cSub(cMul(alpha, alpha), [Omega0Sq, 0]));
    return [cAdd(alpha, disc), cSub(alpha, disc)];
  }), ...Array(n-m).fill(null).flatMap(() => [jOm0, cConj(jOm0)] as C[])];
  const prodPk = p_in.reduce<C>((acc, pk) => cMul(acc, [-pk[0],-pk[1]]), [1,0]);
  const newK = k_in * prodPk[0];
  return { z: newZ, p: newP, k: newK };
}

// ── Bilinear transform ZPK: analog → digital ─────────────────────────────────────────
// Maps s-plane poles/zeros to z-plane using s = 2*Fs*(z-1)/(z+1) with Fs=1 (prewarped).
function bilinearZpk(z_in: C[], p_in: C[], k_in: number): { z: C[]; p: C[]; k: number } {
  const fs2 = 2; // 2*Fs with Fs=1
  const digitize = (s: C): C => cDiv(cAdd([fs2,0], s), cSub([fs2,0], s));
  const newZ = z_in.map(digitize);
  const newP = p_in.map(digitize);
  // Add zeros at z=-1 for each LP zero at infinity (n_poles - n_zeros extra)
  const nExtra = p_in.length - z_in.length;
  for (let i=0;i<nExtra;i++) newZ.push([-1,0]);
  // Gain: normalize so H(z=1) has desired DC/Nyquist gain
  const prodNum = newZ.reduce<C>((acc,z0)=>cMul(acc,cSub([1,0],z0)),[1,0]);
  const prodDen = newP.reduce<C>((acc,p0)=>cMul(acc,cSub([1,0],p0)),[1,0]);
  const gain = k_in * prodDen[0] / prodNum[0];
  return { z: newZ, p: newP, k: gain };
}

// ── Design helper: parse btype string ─────────────────────────────────────────────────
type BType = 'lowpass'|'highpass'|'bandpass'|'bandstop';
function parseBtype(arg: Value | undefined, Wn: number[]): BType {
  if (!arg || !isMat(arg) || !(arg as any).isChar) {
    return Wn.length > 1 ? 'bandpass' : 'lowpass';
  }
  const s = String.fromCharCode(...(Array.from((arg as any).data) as number[])).toLowerCase();
  if (s.startsWith('h') || s === 'high') return 'highpass';
  if (s.includes('stop') || s.includes('notch')) return 'bandstop';
  if (s.includes('band') || s === 'bandpass') return 'bandpass';
  return Wn.length > 1 ? 'bandpass' : 'lowpass';
}

// ── besself ───────────────────────────────────────────────────────────────────────────
async function besself(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('besself: requires n and Wo');
  const n = Math.round(asScalar(m(args[0])));
  const Wo = asScalar(m(args[1]));
  const btype = parseBtype(args[2], [Wo]);
  const { z, p, k } = besselpap(n);
  // Scale to analog cutoff Wo (LP only; besself is analog, no bilinear here)
  const { z: za, p: pa, k: ka } = analogTransform(z, p, k, btype === 'highpass' ? 'highpass' : 'lowpass', [Wo]);
  const [bRaw, a] = zpk2ba(za, pa, ka);
  // MATLAB returns b padded (with leading zeros) to the length of a.
  const b = Array.from(bRaw);
  while (b.length < a.length) b.unshift(0);
  return [rowVec(b), rowVec(Array.from(a))];
}

// ── bilinear (standalone) ─────────────────────────────────────────────────────────────
// [Bz,Az] = bilinear(B,A,Fs) — bilinear transform of analog [B,A] with sample rate Fs
async function bilinear(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('bilinear: requires B, A, Fs');
  let B = toArray(m(args[0])), A = toArray(m(args[1]));
  const Fs = asScalar(m(args[2]));
  const k = 2 * Fs;
  // Direct polynomial bilinear transform via substitution s = k*(z-1)/(z+1).
  // Pad both numerator and denominator (descending powers) to the same length N+1,
  // where N = max(deg(B),deg(A)); the common (z+1)^N denominator cancels.
  const N = Math.max(B.length, A.length) - 1;
  // pad on the LEFT (high powers of s) with zeros so both are length N+1
  const padLeft = (p: number[]) => { const q = p.slice(); while (q.length < N + 1) q.unshift(0); return q; };
  B = padLeft(B); A = padLeft(A);
  // Transform a polynomial in s (descending, length N+1) into a polynomial in z (descending, length N+1).
  // p(s) = sum_{i=0}^{N} c[i] s^{N-i}; s = k*(z-1)/(z+1).
  // result(z) = sum_i c[i] * k^{N-i} * (z-1)^{N-i} * (z+1)^{i}   [common (z+1)^N cancels]
  const binomPow = (a: number, b: number, deg: number): number[] => {
    // expand (z*a + b)^deg as descending poly of length deg+1
    let r = [1];
    const base = [a, b]; // a*z + b
    for (let t = 0; t < deg; t++) {
      const nr = Array(r.length + 1).fill(0);
      for (let i = 0; i < r.length; i++) { nr[i] += r[i] * base[0]; nr[i + 1] += r[i] * base[1]; }
      r = nr;
    }
    return r;
  };
  const transform = (c: number[]): number[] => {
    const out = Array(N + 1).fill(0);
    for (let i = 0; i <= N; i++) {
      const ci = c[i];
      if (ci === 0) continue;
      const pe = N - i; // power of (z-1)
      const qe = i;     // power of (z+1)
      const scale = ci * Math.pow(k, pe);
      const term = polyMulReal(binomPow(1, -1, pe), binomPow(1, 1, qe)); // (z-1)^pe (z+1)^qe, length N+1
      for (let j = 0; j < term.length; j++) out[j] += scale * term[j];
    }
    return out;
  };
  let Bz = transform(B), Az = transform(A);
  // Normalize so Az[0] = 1
  const a0 = Az[0] || 1;
  Bz = Bz.map(v => v / a0);
  Az = Az.map(v => v / a0);
  return [rowVec(Bz), rowVec(Az)];
}

// real polynomial multiply (descending powers)
function polyMulReal(p: number[], q: number[]): number[] {
  const r = Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) r[i + j] += p[i] * q[j];
  return r;
}

// ── grpdelay ──────────────────────────────────────────────────────────────────────────
// [gd, w] = grpdelay(b, a, n) — group delay of digital filter
async function grpdelay(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('grpdelay: requires b');
  const b = toArray(m(args[0]));
  const a = args.length > 1 && isMat(args[1]) ? toArray(m(args[1])) : [1];
  const nfft = args.length > 2 && isMat(args[2]) ? Math.round(asScalar(m(args[2]))) : 512;
  // Robust formula (matches MATLAB): with c = conv(b, reverse(a)),
  //   gd(w) = Re{ sum_n n*c[n] e^{-jnw} / sum_n c[n] e^{-jnw} } - (length(a)-1)
  const arev = [...a].reverse();
  const c: number[] = Array(b.length + arev.length - 1).fill(0);
  for (let i = 0; i < b.length; i++) for (let j = 0; j < arev.length; j++) c[i + j] += b[i] * arev[j];
  const oa = a.length - 1;
  const gd = new Float64Array(nfft);
  const w = new Float64Array(nfft);
  for (let idx = 0; idx < nfft; idx++) {
    const omega = Math.PI * idx / nfft;
    w[idx] = omega;
    let Nre = 0, Nim = 0, Dre = 0, Dim = 0;
    for (let k = 0; k < c.length; k++) {
      const cs = Math.cos(-k * omega), sn = Math.sin(-k * omega);
      Dre += c[k] * cs; Dim += c[k] * sn;
      Nre += k * c[k] * cs; Nim += k * c[k] * sn;
    }
    const d2 = Dre * Dre + Dim * Dim;
    // Re{ N / D } = (Nre*Dre + Nim*Dim)/|D|^2
    gd[idx] = d2 > 1e-30 ? (Nre * Dre + Nim * Dim) / d2 - oa : 0;
  }
  return [rowVec(Array.from(gd)), rowVec(Array.from(w))];
}

// ── impz ──────────────────────────────────────────────────────────────────────────────
// [h, t] = impz(b, a, n) — impulse response
async function impz(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('impz: requires b');
  const b = toArray(m(args[0]));
  const a = args.length > 1 && isMat(args[1]) ? toArray(m(args[1])) : [1];
  const n = args.length > 2 && isMat(args[2]) ? Math.round(asScalar(m(args[2]))) : Math.max(100, 3*b.length + 3*a.length);
  const h = new Float64Array(n);
  const state = new Float64Array(Math.max(b.length, a.length));
  for (let i = 0; i < n; i++) {
    const x = i === 0 ? 1 : 0;
    let y = b[0] * x + (state[0] ?? 0);
    // Filter state update
    for (let k = 0; k < state.length-1; k++) {
      state[k] = (b[k+1] ?? 0)*x - (a[k+1] ?? 0)*y + (state[k+1] ?? 0);
    }
    state[state.length-1] = (b[state.length] ?? 0)*x - (a[state.length] ?? 0)*y;
    if (a[0] !== 1 && a[0] !== 0) y /= a[0];
    h[i] = y;
  }
  const t = Float64Array.from({length: n}, (_, i) => i);
  return [colVec(Array.from(h)), colVec(Array.from(t))];
}

// ── stepz ─────────────────────────────────────────────────────────────────────────────
async function stepz(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('stepz: requires b');
  const b = toArray(m(args[0]));
  const a = args.length > 1 && isMat(args[1]) ? toArray(m(args[1])) : [1];
  const n = args.length > 2 ? Math.round(asScalar(m(args[2]))) : Math.max(100, 3*(b.length+a.length));
  const [hVal] = await impz(args);
  const h = toArray(m(hVal));
  // Step response = cumulative sum of impulse response
  const step = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += h[i] ?? 0; step[i] = acc; }
  const t = Float64Array.from({length: n}, (_, i) => i);
  return [colVec(Array.from(step)), colVec(Array.from(t))];
}

// ── sosfilt ───────────────────────────────────────────────────────────────────────────
// y = sosfilt(sos, x) — filter with second-order sections matrix [B0 B1 B2 A0 A1 A2]
async function sosfilt(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('sosfilt: requires sos and x');
  const sosM = m(args[0]);
  const xArr = toArray(m(args[1]));
  const nSecs = sosM.rows;
  const R = sosM.rows;
  const sos: [number, number, number, number, number, number][] = [];
  for (let i = 0; i < nSecs; i++) {
    sos.push([
      sosM.data[i+0*R], sosM.data[i+1*R], sosM.data[i+2*R],
      sosM.data[i+3*R], sosM.data[i+4*R], sosM.data[i+5*R],
    ]);
  }
  let y = Float64Array.from(xArr);
  for (const [b0, b1, b2, a0, a1, a2] of sos) {
    const s = a0 || 1;
    const b = [b0/s, b1/s, b2/s], a = [1, a1/s, a2/s];
    const yn = new Float64Array(y.length);
    let w1=0, w2=0;
    for (let n=0; n<y.length; n++) {
      const w0 = y[n] - a[1]*w1 - a[2]*w2;
      yn[n] = b[0]*w0 + b[1]*w1 + b[2]*w2;
      w2=w1; w1=w0;
    }
    y = yn;
  }
  return [colVec(Array.from(y))];
}

// ── tf2sos / sos2tf / zp2tf / tf2zp / zp2sos ──────────────────────────────────────────

// Pair complex conjugate poles/zeros into second-order sections
function pairRoots(roots: C[]): C[][] {
  const used = new Uint8Array(roots.length);
  const pairs: C[][] = [];
  for (let i = 0; i < roots.length; i++) {
    if (used[i]) continue;
    if (Math.abs(roots[i][1]) < 1e-8) {
      // Real root: pair with another real root if available
      let paired = -1;
      for (let j = i+1; j < roots.length; j++) {
        if (!used[j] && Math.abs(roots[j][1]) < 1e-8) { paired = j; break; }
      }
      if (paired >= 0) { pairs.push([roots[i], roots[paired]]); used[i]=1; used[paired]=1; }
      else { pairs.push([roots[i]]); used[i]=1; }
    } else {
      // Complex: find conjugate
      let paired = -1;
      for (let j = i+1; j < roots.length; j++) {
        if (!used[j] && Math.abs(roots[j][0]-roots[i][0]) < 1e-8 && Math.abs(roots[j][1]+roots[i][1]) < 1e-8) { paired=j; break; }
      }
      if (paired >= 0) { pairs.push([roots[i], roots[paired]]); used[i]=1; used[paired]=1; }
      else { pairs.push([roots[i]]); used[i]=1; }
    }
  }
  return pairs;
}

async function tf2sos(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('tf2sos: requires b and a');
  const b = toArray(m(args[0])), a = toArray(m(args[1]));
  const Z = polyRoots(b), P = polyRoots(a);
  const gain = b[0] / a[0];
  const [Bz, kg] = await zp2sos_impl(Z, P, gain);
  return [Bz, kg];
}

async function sos2tf(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('sos2tf: requires sos');
  const sosM = m(args[0]);
  const g = args.length > 1 ? asScalar(m(args[1])) : 1;
  let b: number[] = [g], a: number[] = [1];
  const R = sosM.rows;
  for (let i = 0; i < sosM.rows; i++) {
    const bi = [sosM.data[i+0*R], sosM.data[i+1*R], sosM.data[i+2*R]];
    const ai = [sosM.data[i+3*R], sosM.data[i+4*R], sosM.data[i+5*R]];
    const mul_poly = (p: number[], q: number[]): number[] => {
      const r = Array(p.length+q.length-1).fill(0);
      for (let ii=0; ii<p.length; ii++) for (let jj=0; jj<q.length; jj++) r[ii+jj]+=p[ii]*q[jj];
      return r;
    };
    b = mul_poly(b, bi); a = mul_poly(a, ai);
  }
  return [rowVec(b), rowVec(a)];
}

// Read a (possibly complex) root vector as C[] pairs, preserving imaginary parts (idata).
const mReim = (M: Mat): C[] => Array.from(M.data).map<C>((re, i) => [re, M.idata ? M.idata[i] : 0]);

async function zp2tf(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('zp2tf: requires z, p, k');
  const Zarr = mReim(m(args[0])), Parr = mReim(m(args[1]));   // preserve complex conjugate roots
  const k = asScalar(m(args[2]));
  const [b, a] = zpk2ba(Zarr, Parr, k);
  return [rowVec(Array.from(b)), rowVec(Array.from(a))];
}

async function tf2zp(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('tf2zp: requires b and a');
  const b = toArray(m(args[0])), a = toArray(m(args[1]));
  const Z = polyRoots(b), P = polyRoots(a);
  const k = b[0] / a[0];
  // preserve complex zeros/poles: attach idata when any imaginary part is non-negligible
  const cv = (R: C[]): Value => { const re = R.map((c) => c[0]), im = R.map((c) => c[1]); const v = colVec(re); if (im.some((x) => Math.abs(x) > 1e-9)) v.idata = Float64Array.from(im); return v; };
  return [cv(Z), cv(P), scalar(k)];
}

async function zp2sos_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('zp2sos: requires z, p, k');
  const Z = mReim(m(args[0])), P = mReim(m(args[1]));   // preserve complex conjugate roots
  const k = asScalar(m(args[2]));
  const [sos, kg] = await zp2sos_impl(Z, P, k);
  return [sos, kg];
}

async function zp2sos_impl(Z: C[], P: C[], k: number): Promise<[Value, Value]> {
  const zPairs = pairRoots(Z), pPairs = pairRoots(P);
  const nSecs = Math.max(zPairs.length, pPairs.length);
  while (zPairs.length < nSecs) zPairs.push([]);
  while (pPairs.length < nSecs) pPairs.push([]);

  const sosData = new Float64Array(nSecs * 6);
  for (let i = 0; i < nSecs; i++) {
    const zp = zPairs[i], pp = pPairs[i];
    let b: number[], a: number[];
    if (zp.length === 2) b = Array.from(roots2poly(zp).map(c=>c[0]));
    else if (zp.length === 1) b = [1, -zp[0][0], 0];
    else b = [1, 0, 0];
    if (pp.length === 2) a = Array.from(roots2poly(pp).map(c=>c[0]));
    else if (pp.length === 1) a = [1, -pp[0][0], 0];
    else a = [1, 0, 0];
    // Pad to length 3
    while (b.length < 3) b.push(0);
    while (a.length < 3) a.push(0);
    // Column-major write: element (i, col) at index i + col*nSecs.
    const row = [b[0], b[1], b[2], a[0], a[1], a[2]];
    for (let col = 0; col < 6; col++) sosData[i + col * nSecs] = row[col];
  }
  // Apply overall gain to the first section's numerator (b0,b1,b2 of row 0).
  sosData[0 + 0 * nSecs] *= k; sosData[0 + 1 * nSecs] *= k; sosData[0 + 2 * nSecs] *= k;
  return [mat(nSecs, 6, sosData), scalar(k)];
}

// ── firls — least-squares FIR filter design ───────────────────────────────────────────
// b = firls(n, f, a) — least-squares FIR, linear-phase (Type I/II)
async function firls(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('firls: requires n, f, a');
  const N = Math.round(asScalar(m(args[0]))); // filter order
  const f = toArray(m(args[1])); // frequency edges [0..1]
  const a = toArray(m(args[2])); // desired amplitudes at each edge
  const w = args.length > 3 ? toArray(m(args[3])) : Array(f.length/2).fill(1);

  const M = N + 1; // filter length
  const L = Math.floor(N / 2); // number of unique coefficients (including center for Type I)
  const typeI = N % 2 === 0;
  const nCoef = typeI ? L + 1 : L + 1;

  // Build the least-squares matrix Q and vector b using cosine basis
  // Q[k][l] = integral over bands of W(f)*cos(k*pi*f)*cos(l*pi*f) df
  // b[k] = integral over bands of W(f)*D(f)*cos(k*pi*f) df
  // Approximate with dense quadrature over each band
  const NQUAD = 1024;
  const Q = Array.from({length: nCoef}, () => Array(nCoef).fill(0));
  const b_rhs = Array(nCoef).fill(0);

  for (let band = 0; band < f.length/2; band++) {
    const fl = f[2*band], fh = f[2*band+1];
    const wb = w[band] ?? 1;
    const dlo = a[2*band], dhi = a[2*band+1];
    const npts = Math.max(8, Math.round(NQUAD * (fh - fl)));
    const df = (fh - fl) / npts;
    for (let i = 0; i <= npts; i++) {
      const freq = fl + i * (fh - fl) / npts;
      const desired = dlo + i * (dhi - dlo) / npts;
      const wt = wb * df * (i === 0 || i === npts ? 0.5 : 1);
      const omega = Math.PI * freq;
      const basis = Array.from({length: nCoef}, (_, k) =>
        typeI ? Math.cos(k * omega) : Math.cos((k + 0.5) * omega)
      );
      for (let k = 0; k < nCoef; k++) {
        b_rhs[k] += wt * desired * basis[k];
        for (let l = 0; l < nCoef; l++) Q[k][l] += wt * basis[k] * basis[l];
      }
    }
  }

  const c = gaussElim(Q, b_rhs);
  const h = new Float64Array(M);
  if (typeI) {
    h[L] = c[0];
    for (let k = 1; k <= L; k++) { h[L-k] = c[k]/2; h[L+k] = c[k]/2; }
  } else {
    for (let k = 0; k < nCoef; k++) { h[L-k] = c[k]/2; if (L-k !== L+k+1) h[L+k+1] = c[k]/2; }
  }
  return [rowVec(Array.from(h))];
}

// ── firpm / remez — Parks-McClellan equiripple FIR ────────────────────────────────────
async function firpm(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('firpm: requires n, f, a');
  let N = Math.round(asScalar(m(args[0])));
  const f = toArray(m(args[1])); // band edges [0..1]
  const a = toArray(m(args[2])); // desired amplitudes
  const w = args.length > 3 && isMat(args[3]) ? toArray(m(args[3])) : Array(f.length/2).fill(1);

  // Ensure even order for Type I (better numerical properties)
  if (N % 2 !== 0) N++;

  const L = N / 2; // highest cosine index
  const nRef = L + 2; // number of reference points

  // Build dense grid over approximation bands
  const NGRID = Math.max(512, 16 * nRef);
  const gridF: number[] = [], gridD: number[] = [], gridW: number[] = [];
  for (let band = 0; band < f.length/2; band++) {
    const fl = f[2*band], fh = f[2*band+1];
    const dl = a[2*band], dh = a[2*band+1];
    const wb = w[band] ?? 1;
    const npts = Math.max(10, Math.round(NGRID * (fh-fl)));
    for (let i = 0; i <= npts; i++) {
      const t = i/npts;
      gridF.push(fl + t*(fh-fl));
      gridD.push(dl + t*(dh-dl));
      gridW.push(wb);
    }
  }
  const NG = gridF.length;

  // Initialize reference indices uniformly
  let refIdx: number[] = Array.from({length: nRef}, (_,i) => Math.round(i*(NG-1)/(nRef-1)));
  let prevDelta = Infinity;

  for (let iter = 0; iter < 50; iter++) {
    // Build system matrix: [cos(k*pi*f_i), (-1)^i/w_i] × [c; delta] = [d_i]
    const mat_: number[][] = Array.from({length: nRef}, () => Array(nRef).fill(0));
    const rhs: number[] = Array(nRef).fill(0);
    for (let i = 0; i < nRef; i++) {
      const fi = gridF[refIdx[i]], di = gridD[refIdx[i]], wi = gridW[refIdx[i]];
      const omega = Math.PI * fi;
      for (let k = 0; k <= L; k++) mat_[i][k] = Math.cos(k * omega);
      mat_[i][L+1] = ((-1)**i) / wi;
      rhs[i] = di;
    }
    const sol = gaussElim(mat_, rhs);
    const c = sol.slice(0, L+1);
    const delta = Math.abs(sol[L+1]);

    // Evaluate weighted error E(f) = W(f)*[P(f) - D(f)] on full grid
    const E = gridF.map((fi, idx) => {
      const omega = Math.PI * fi;
      const P = c.reduce((s, ck, k) => s + ck * Math.cos(k*omega), 0);
      return gridW[idx] * (P - gridD[idx]);
    });

    // Find extrema (local maxima of |E|), including band boundaries
    const extrema: number[] = [];
    const bandBounds = new Set<number>();
    // Add band boundary indices (first and last of each band)
    let pos = 0;
    for (let band = 0; band < f.length/2; band++) {
      const npts = Math.max(10, Math.round(NGRID * (f[2*band+1]-f[2*band])));
      bandBounds.add(pos); bandBounds.add(pos+npts);
      pos += npts+1;
    }
    for (let i = 0; i < NG; i++) {
      const isExtremum = bandBounds.has(i) ||
        (i > 0 && i < NG-1 && ((E[i] >= E[i-1] && E[i] >= E[i+1]) || (E[i] <= E[i-1] && E[i] <= E[i+1])));
      if (isExtremum && Math.abs(E[i]) > delta * 0.05) extrema.push(i);
    }

    // Deduplicate and select nRef alternating extrema with largest |E|
    const newRefs = selectRemezRefs(extrema, E, nRef);
    refIdx = newRefs.length >= nRef ? newRefs : refIdx;

    if (Math.abs(delta - prevDelta) / (delta || 1) < 1e-6 && iter > 5) break;
    prevDelta = delta;
  }

  // Compute final filter coefficients from last cosine polynomial
  const mat_f: number[][] = Array.from({length: nRef}, () => Array(nRef).fill(0));
  const rhs_f: number[] = Array(nRef).fill(0);
  for (let i = 0; i < nRef; i++) {
    const fi = gridF[refIdx[i]], di = gridD[refIdx[i]], wi = gridW[refIdx[i]];
    const omega = Math.PI * fi;
    for (let k = 0; k <= L; k++) mat_f[i][k] = Math.cos(k * omega);
    mat_f[i][L+1] = ((-1)**i) / wi;
    rhs_f[i] = di;
  }
  const sol = gaussElim(mat_f, rhs_f);
  const c = sol.slice(0, L+1);

  const M = N + 1;
  const h = new Float64Array(M);
  h[L] = c[0];
  for (let k = 1; k <= L; k++) { h[L-k] = c[k]/2; h[L+k] = c[k]/2; }
  return [rowVec(Array.from(h))];
}

function selectRemezRefs(extrema: number[], E: number[], nRef: number): number[] {
  if (extrema.length === 0) return [];
  // Reduce to alternating-sign extrema (keep max |E| within each same-sign run)
  const sorted = [...extrema].sort((a, b) => a - b);
  const alt: number[] = [];
  for (const idx of sorted) {
    if (alt.length === 0) { alt.push(idx); continue; }
    const lastSign = Math.sign(E[alt[alt.length-1]]);
    const thisSign = Math.sign(E[idx]);
    if (thisSign !== lastSign) {
      alt.push(idx);
    } else if (Math.abs(E[idx]) > Math.abs(E[alt[alt.length-1]])) {
      alt[alt.length-1] = idx;
    }
  }
  // Remove smallest-magnitude until nRef remain
  while (alt.length > nRef) {
    let minI = 0, minV = Infinity;
    for (let i = 0; i < alt.length; i++) {
      if (Math.abs(E[alt[i]]) < minV) { minV = Math.abs(E[alt[i]]); minI = i; }
    }
    alt.splice(minI, 1);
  }
  return alt;
}

// Alias: remez = firpm
const remez = firpm;

// ── Chebyshev Type I analog lowpass prototype (cheb1ap), digitized via bilinear ─────────
// Returns digital [b,a] for an order-n Chebyshev-I lowpass with Rp dB passband ripple
// and normalized cutoff Wp in (0,1) (Nyquist = 1). Mirrors MATLAB's cheby1(n,Rp,Wp).
function cheby1LP(n: number, Rp: number, Wp: number): { b: number[]; a: number[] } {
  const fs = 2;
  const u = 2 * fs * Math.tan((Math.PI * Wp) / fs);   // prewarped analog cutoff
  // Analog Chebyshev-I prototype poles/zeros/gain (cutoff 1 rad/s).
  const eps = Math.sqrt(10 ** (Rp / 10) - 1);
  const mu = Math.asinh(1 / eps) / n;
  const poles: C[] = [];
  for (let k = 1; k <= n; k++) {
    const theta = (Math.PI * (2 * k - 1)) / (2 * n);
    poles.push([-Math.sinh(mu) * Math.sin(theta), Math.cosh(mu) * Math.cos(theta)]);
  }
  // gain so |H(0)| = 1 (n odd) or = 1/sqrt(1+eps^2) (n even), matching MATLAB
  let k0 = poles.reduce<C>((acc, p) => cMul(acc, [-p[0], -p[1]]), [1, 0])[0];
  if (n % 2 === 0) k0 /= Math.sqrt(1 + eps * eps);
  // LP→LP scale to cutoff u
  const pa = poles.map(p => cSc(p, u));
  // Analog DC gain (invariant under LP→LP): H(0) = k0 / prod(-poles).
  const desiredDC = k0 / poles.reduce<C>((acc, p) => cMul(acc, [-p[0], -p[1]]), [1, 0])[0];
  // bilinear (Fs=fs): s = 2*fs*(z-1)/(z+1)
  const fs2 = 2 * fs;
  const digitize = (s: C): C => cDiv(cAdd([fs2, 0], s), cSub([fs2, 0], s));
  const dz: C[] = []; const dp = pa.map(digitize);
  for (let i = 0; i < pa.length; i++) dz.push([-1, 0]); // analog zeros at infinity → z=-1
  // Choose gain so digital DC gain (z=1) equals the analog DC gain.
  const prodNum = dz.reduce<C>((acc, z0) => cMul(acc, cSub([1, 0], z0)), [1, 0]);
  const prodDen = dp.reduce<C>((acc, p0) => cMul(acc, cSub([1, 0], p0)), [1, 0]);
  const kg = desiredDC * prodDen[0] / prodNum[0];
  const [bF, aF] = zpk2ba(dz, dp, kg);
  return { b: Array.from(bF), a: Array.from(aF) };
}

// ── filtfilt — zero-phase forward/reverse IIR filtering (edge reflection + steady-state zi) ──
function filtfiltZiDsp(b: number[], a: number[]): number[] {
  const a0 = a[0]; const B = b.map(v => v / a0), A = a.map(v => v / a0);
  const M = Math.max(B.length, A.length);
  while (B.length < M) B.push(0); while (A.length < M) A.push(0);
  if (M <= 1) return [];
  const mm = M - 1;
  const mtx: number[][] = []; const rhs: number[] = [];
  for (let i = 0; i < mm; i++) { mtx.push(new Array(mm).fill(0)); rhs.push(B[i + 1] - B[0] * A[i + 1]); }
  for (let i = 0; i < mm; i++) for (let j = 0; j < mm; j++) {
    const eyeM1 = i === j ? 1 : 0;
    let block = 0;
    if (j === 0) block = -A[i + 1];
    else if (i === j - 1) block = 1;
    mtx[i][j] = eyeM1 - block;
  }
  return gaussElim(mtx, rhs);
}

// Direct-form II transposed IIR filter with initial state zi.
function filterDf2tDsp(b: number[], a: number[], x: number[], zi: number[]): number[] {
  const a0 = a[0]; const B = b.map(v => v / a0), A = a.map(v => v / a0);
  const n = Math.max(B.length, A.length);
  while (B.length < n) B.push(0); while (A.length < n) A.push(0);
  const z = new Array(n - 1).fill(0);
  for (let i = 0; i < zi.length && i < z.length; i++) z[i] = zi[i];
  const y = new Array(x.length).fill(0);
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = B[0] * xi + (z[0] ?? 0);
    for (let k = 0; k < n - 2; k++) z[k] = B[k + 1] * xi + (z[k + 1] ?? 0) - A[k + 1] * yi;
    if (n - 2 >= 0) z[n - 2] = B[n - 1] * xi - A[n - 1] * yi;
    y[i] = yi;
  }
  return y;
}

function filtfiltDsp(b: number[], a: number[], x: number[]): number[] {
  const ord = Math.max(b.length, a.length) - 1;
  const nfact = Math.max(1, 3 * ord);
  if (x.length <= nfact) return x.slice();
  const zi = filtfiltZiDsp(b, a);
  const ext: number[] = [];
  for (let i = nfact; i >= 1; i--) ext.push(2 * x[0] - x[i]);
  for (const v of x) ext.push(v);
  for (let i = 1; i <= nfact; i++) ext.push(2 * x[x.length - 1] - x[x.length - 1 - i]);
  let yt = filterDf2tDsp(b, a, ext, zi.map(v => v * ext[0]));
  yt.reverse();
  yt = filterDf2tDsp(b, a, yt, zi.map(v => v * yt[0]));
  yt.reverse();
  return yt.slice(nfact, nfact + x.length);
}

// ── decimate ─────────────────────────────────────────────────────────────────────────
// y = decimate(x, r) — lowpass anti-alias filter then downsample by r.
// Default: order-8 Chebyshev Type I (0.05 dB ripple, cutoff 0.8/r) applied with filtfilt
// (zero-phase), then y = odata(nbeg:r:nd) — matching MATLAB's decimate.
async function decimate_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('decimate: requires x and r');
  const x = toArray(m(args[0]));
  const r = Math.round(asScalar(m(args[1])));
  const nfilt = args.length > 2 && isMat(args[2]) ? Math.round(asScalar(m(args[2]))) : 8;
  const nd = x.length;
  const nout = Math.ceil(nd / r);
  const { b, a } = cheby1LP(nfilt, 0.05, 0.8 / r);
  const odata = filtfiltDsp(b, a, x);
  const nbeg = r - (r * nout - nd); // 1-based start index in MATLAB
  const y: number[] = [];
  for (let i = nbeg - 1; i < nd; i += r) y.push(odata[i]);
  return [colVec(y)];
}

// QUARANTINED: interp — MATLAB's double-precision interp uses a polyphase
// least-squares (sinc-subspace, Cholesky) filter design that is too large to
// replicate to 1e-4 here; the previous windowed-sinc version produced wrong
// interpolated samples. Removed from builtins until a correct port is feasible.

// ── kaiser window (modified Bessel I0) ─────────────────────────────────────────────────
function besselI0(x: number): number {
  let sum = 1, term = 1;
  const x2 = (x / 2) ** 2;
  for (let k = 1; k < 60; k++) { term *= x2 / (k * k); sum += term; if (term < 1e-12 * sum) break; }
  return sum;
}
function kaiserWin(L: number, beta: number): number[] {
  const w = new Array(L);
  const denom = besselI0(beta);
  const N = L - 1;
  for (let i = 0; i < L; i++) {
    const r = (2 * i - N) / N;
    w[i] = besselI0(beta * Math.sqrt(1 - r * r)) / denom;
  }
  return w;
}
// fir1 lowpass: h[k] = win[k]*sinc(Wn*(k-N/2))*Wn, normalized so the DC gain is 1.
function fir1LP(order: number, Wn: number, win: number[]): number[] {
  const N = order;
  const h = new Array(N + 1);
  const c = N / 2;
  for (let k = 0; k <= N; k++) {
    const x = k - c;
    const sinc = x === 0 ? Wn : Math.sin(Math.PI * Wn * x) / (Math.PI * x);
    h[k] = sinc * win[k];
  }
  const s = h.reduce((a, b) => a + b, 0);
  return h.map(v => v / s);
}
// upfirdn: upsample x by p, FIR filter h, downsample by q.
function upfirdn(x: number[], h: number[], p: number, q: number): number[] {
  const xu = new Array(x.length * p).fill(0);
  for (let i = 0; i < x.length; i++) xu[i * p] = x[i];
  const conv = new Array(xu.length + h.length - 1).fill(0);
  for (let i = 0; i < xu.length; i++) { const xi = xu[i]; if (xi === 0) continue; for (let k = 0; k < h.length; k++) conv[i + k] += xi * h[k]; }
  const out: number[] = [];
  for (let i = 0; i < conv.length; i += q) out.push(conv[i]);
  return out;
}

// ── resample ──────────────────────────────────────────────────────────────────────────
// y = resample(x, p, q) — rational resampling via a kaiser-windowed FIR (matches MATLAB).
//   h = p*fir1(2*N*max(p,q), 1/max(p,q), kaiser(2*N*max(p,q)+1, beta)); y = upfirdn(x,h,p,q),
//   trimmed by the filter group delay floor(((L-1)/2)/q).
async function resample_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('resample: requires x, p, q');
  const X0 = m(args[0]); const x = toArray(X0); const isRow = X0.rows === 1; // preserve input orientation
  let p = Math.round(asScalar(m(args[1])));
  let q = Math.round(asScalar(m(args[2])));
  // reduce by gcd as MATLAB does
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const g = gcd(p, q); p /= g; q /= g;
  const N = 10, beta = 5;
  const pqmax = Math.max(p, q);
  const fc = 1 / (2 * pqmax);
  const L = 2 * N * pqmax + 1;
  const win = kaiserWin(L, beta);
  const h = fir1LP(L - 1, 2 * fc, win).map(v => v * p);
  const y = upfirdn(x, h, p, q);
  const Lhalf = (L - 1) / 2;
  const nz = Math.floor(Lhalf / q);
  const Ly = Math.ceil((x.length * p) / q);
  const out = y.slice(nz, nz + Ly);
  while (out.length < Ly) out.push(0);
  return [isRow ? rowVec(out) : colVec(out)];
}

// ── DSP System objects ─────────────────────────────────────────────────────────────────
// System objects are stateful filter processors. We store state in ClassV props.

function makeSysObj(className: string, extra: Record<string, Value> = {}): Value {
  const props = new Map<string, Value>(Object.entries(extra).map(([k,v]) => [k,v]));
  return makeObject(className, props);
}

async function dspFIRFilter(args: Value[]): Promise<Value[]> {
  const h = args.length > 0 && isMat(args[0]) ? toArray(m(args[0])) : [1];
  const state = new Float64Array(h.length - 1);
  const props = new Map<string, Value>();
  props.set('Numerator', rowVec(h));
  props.set('_state', rowVec(Array.from(state)));
  props.set('Structure', str('Direct form II transposed'));
  return [makeObject('dsp.FIRFilter', props)];
}

async function dspBiquadFilter(args: Value[]): Promise<Value[]> {
  const sos = args.length > 0 && isMat(args[0]) ? args[0] : zeros(1, 6);
  const props = new Map<string, Value>();
  props.set('SOSMatrix', sos);
  props.set('ScaleValues', scalar(1));
  return [makeObject('dsp.BiquadFilter', props)];
}

async function dspFIRDecimator(args: Value[]): Promise<Value[]> {
  const r = args.length > 0 ? asScalar(m(args[0])) : 2;
  const h = args.length > 1 && isMat(args[1]) ? toArray(m(args[1])) : (() => {
    // Default: LP FIR with cutoff 1/r
    const M = 30, L2 = M/2, Wn = 1/r;
    return Array.from({length: M+1}, (_, k) => {
      const kc = k-L2;
      return (kc === 0 ? Wn : Wn*Math.sin(Math.PI*Wn*kc)/(Math.PI*Wn*kc)) * (0.54-0.46*Math.cos(2*Math.PI*k/M));
    });
  })();
  const props = new Map<string, Value>();
  props.set('DecimationFactor', scalar(r));
  props.set('Numerator', rowVec(h));
  return [makeObject('dsp.FIRDecimator', props)];
}

async function dspFIRInterpolator(args: Value[]): Promise<Value[]> {
  const r = args.length > 0 ? asScalar(m(args[0])) : 2;
  const h = args.length > 1 && isMat(args[1]) ? toArray(m(args[1])) : [1];
  const props = new Map<string, Value>();
  props.set('InterpolationFactor', scalar(r));
  props.set('Numerator', rowVec(h));
  return [makeObject('dsp.FIRInterpolator', props)];
}

// QUARANTINED: dsp.RMS / dsp.Mean / dsp.Variance — these System objects were
// REMOVED in MATLAB R2026a ('dsp.RMS' has been removed; use 'rms'/'mean'/'var').
// Unverifiable against the live release, so they are not registered.
// QUARANTINED: dsp.SpectrumAnalyzer — a visual scope; a step() pass-through is
// meaningless and cannot be validated numerically. Not registered.

// step() method — process a block of samples through a System object
async function dspStep(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('step: requires system object and input');
  const obj = args[0] as any;
  if (obj.kind !== 'object') throw new MatError('step: requires a System object');
  const className: string = obj.className ?? '';
  const props: Map<string, Value> = obj.props;
  const x = toArray(m(args[1]));

  if (className === 'dsp.FIRFilter') {
    const h = toArray(m(props.get('Numerator')!));
    const stateArr = props.has('_state') ? toArray(m(props.get('_state')!)) : Array(h.length-1).fill(0);
    const state = [...stateArr];
    const y = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) {
      let acc = h[0] * x[i];
      for (let k = 0; k < state.length; k++) acc += h[k+1] * (state[k] ?? 0);
      y[i] = acc;
      // Update state (shift register)
      for (let k = state.length-1; k > 0; k--) state[k] = state[k-1];
      if (state.length > 0) state[0] = x[i];
    }
    props.set('_state', rowVec(state));
    return [colVec(Array.from(y))];
  }

  if (className === 'dsp.FIRDecimator') {
    // Full FIR filtering with carried state, then keep every r-th sample (phase 0).
    const r = Math.round(asScalar(m(props.get('DecimationFactor')!)));
    const h = toArray(m(props.get('Numerator')!));
    const stateArr = props.has('_state') ? toArray(m(props.get('_state')!)) : Array(h.length - 1).fill(0);
    const state = [...stateArr];        // most-recent samples, state[0] = x[n-1]
    const phaseV = props.has('_phase') ? Math.round(asScalar(m(props.get('_phase')!))) : 0;
    let phase = phaseV;
    const yn: number[] = [];
    for (let i = 0; i < x.length; i++) {
      let acc = h[0] * x[i];
      for (let k = 0; k < state.length; k++) acc += h[k + 1] * (state[k] ?? 0);
      if (phase === 0) yn.push(acc);
      phase = (phase + 1) % r;
      for (let k = state.length - 1; k > 0; k--) state[k] = state[k - 1];
      if (state.length > 0) state[0] = x[i];
    }
    props.set('_state', rowVec(state));
    props.set('_phase', scalar(phase));
    return [colVec(yn)];
  }

  if (className === 'dsp.FIRInterpolator') {
    // Polyphase upsample-by-L FIR interpolation with carried state.
    const L = Math.round(asScalar(m(props.get('InterpolationFactor')!)));
    const h = toArray(m(props.get('Numerator')!));
    const stateArr = props.has('_state') ? toArray(m(props.get('_state')!)) : Array(Math.ceil(h.length / L)).fill(0);
    const state = [...stateArr];        // state[0] = x[n-1]
    const yn: number[] = [];
    for (let i = 0; i < x.length; i++) {
      // shift in current sample
      for (let k = state.length - 1; k > 0; k--) state[k] = state[k - 1];
      if (state.length > 0) state[0] = x[i];
      for (let phase = 0; phase < L; phase++) {
        let acc = 0;
        for (let k = 0; ; k++) {
          const hi = phase + k * L;
          if (hi >= h.length) break;
          acc += h[hi] * (state[k] ?? 0);
        }
        yn.push(acc);
      }
    }
    props.set('_state', rowVec(state));
    return [colVec(yn)];
  }

  // Unknown system object: pass through
  return [args[1]];
}

// release() stub — reset a System object's state
async function dspRelease(args: Value[]): Promise<Value[]> {
  if (args.length > 0 && (args[0] as any).kind === 'object') {
    const props: Map<string, Value> = (args[0] as any).props;
    if (props.has('_state')) props.set('_state', rowVec([]));
  }
  return [];
}

// reset() stub — same as release for our purposes
const dspReset = dspRelease;

// ── Additional utilities ───────────────────────────────────────────────────────────────
async function firpmord(args: Value[]): Promise<Value[]> {
  // Estimate order for firpm: [n,fo,ao,w] = firpmord(f,a,dev[,fs])
  if (args.length < 3) throw new MatError('firpmord: requires f, a, dev');
  const f = toArray(m(args[0])), a = toArray(m(args[1])), dev = toArray(m(args[2]));
  const fs = args.length > 3 ? asScalar(m(args[3])) : 2; // edges are in [0,fs/2]; default fs=2 → [0,1]
  // Normalise band edges to [0, 0.5] (cycles/sample).
  const fn = f.map(v => v / fs);
  // Herrmann/Rabiner equiripple FIR order estimate (the formula MATLAB's firpmord uses).
  const dinf = (d1: number, d2: number): number => {
    const L1 = Math.log10(d1), L2 = Math.log10(d2);
    const a1 = 0.005309, a2 = 0.07114, a3 = -0.4761;
    const a4 = 0.00266, a5 = 0.5941, a6 = 0.4278;
    return (a1 * L1 * L1 + a2 * L1 + a3) * L2 - (a4 * L1 * L1 + a5 * L1 + a6);
  };
  const fFun = (d1: number, d2: number): number => 11.01217 + 0.51244 * (Math.log10(d1) - Math.log10(d2));
  // For each transition band, estimate order; take the maximum.
  let nmax = 0;
  const nBands = a.length;
  for (let i = 0; i < nBands - 1; i++) {
    const df = Math.abs(fn[2 * i + 1] - fn[2 * i]); // transition width (normalised)
    if (df <= 0) continue;
    const d1 = dev[i], d2 = dev[i + 1];
    const D = dinf(d1, d2);
    const F = fFun(d1, d2);
    const n = (D - F * df * df) / df - df * (nBands - 2);
    nmax = Math.max(nmax, n);
  }
  const nOrder = Math.ceil(nmax);
  // Build output spec for firpm: edges normalised to [0,1] (Nyquist=1).
  const fo: number[] = [0];
  for (let i = 0; i < f.length; i++) fo.push(f[i] / (fs / 2));
  fo.push(1);
  const ao: number[] = [];
  for (let i = 0; i < a.length; i++) { ao.push(a[i]); ao.push(a[i]); }
  const dmax = Math.max(...dev);
  const w = dev.map(d => dmax / d);
  return [scalar(nOrder), rowVec(fo), rowVec(ao), rowVec(w)];
}

async function chebwin(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('chebwin: requires n');
  const n = Math.round(asScalar(m(args[0])));
  const rs = args.length > 1 ? asScalar(m(args[1])) : 100;
  if (n === 1) return [colVec([1])];
  // Dolph-Chebyshev window via inverse-DFT of the Chebyshev frequency response.
  // Chebyshev polynomial of order m, T_m(x), valid for all real x.
  const cheb = (m: number, x: number): number => {
    if (Math.abs(x) <= 1) return Math.cos(m * Math.acos(x));
    if (x > 1) return Math.cosh(m * Math.acosh(x));
    return (m % 2 === 0 ? 1 : -1) * Math.cosh(m * Math.acosh(-x));
  };
  const order = n - 1;
  const r = 10 ** (rs / 20);          // ripple ratio
  const beta = Math.cosh(Math.acosh(r) / order);
  const even = n % 2 === 0;
  // Frequency-domain samples W[k] = T_order(beta*cos(pi*k/n)); for even n apply a
  // half-sample phase shift exp(j*pi*k/n). Window = fftshift(real(ifft(W))).
  const Wre = new Float64Array(n), Wim = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const Wk = cheb(order, beta * Math.cos(Math.PI * k / n));
    if (even) { const ph = Math.PI * k / n; Wre[k] = Wk * Math.cos(ph); Wim[k] = Wk * Math.sin(ph); }
    else { Wre[k] = Wk; Wim[k] = 0; }
  }
  // ifft (real part) then fftshift
  const raw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) {
      const ang = 2 * Math.PI * k * i / n;
      s += Wre[k] * Math.cos(ang) - Wim[k] * Math.sin(ang);
    }
    raw[i] = s / n;
  }
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = raw[(i + Math.ceil(n / 2)) % n];
  const wmax = Math.max(...w);
  for (let i = 0; i < n; i++) w[i] /= wmax;
  return [colVec(Array.from(w))];
}

async function taylorwin(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('taylorwin: requires n');
  const n = Math.round(asScalar(m(args[0])));
  const nbar = args.length > 1 ? Math.round(asScalar(m(args[1]))) : 4;
  const sll = args.length > 2 ? asScalar(m(args[2])) : -30;
  // MATLAB taylorwin convention (no [0,1] normalization).
  // A = acosh(10^(-sll/20))/pi  (sll is a negative dB value)
  const A = Math.acosh(10 ** (-sll / 20)) / Math.PI;
  const sigma2 = (nbar * nbar) / (A * A + (nbar - 0.5) ** 2);
  // Coefficients Fm for m = 1..nbar-1
  const Fm = new Float64Array(nbar); // index m
  for (let mm = 1; mm <= nbar - 1; mm++) {
    let num = 1, den = 1;
    for (let i = 1; i <= nbar - 1; i++) {
      num *= (1 - (mm * mm) / (sigma2 * (A * A + (i - 0.5) ** 2)));
      if (i !== mm) den *= (1 - (mm * mm) / (i * i));
    }
    Fm[mm] = ((mm % 2 === 0 ? -1 : 1) * num) / (2 * den);
  }
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const xi = (i - (n - 1) / 2) / n;
    for (let mm = 1; mm <= nbar - 1; mm++) s += Fm[mm] * Math.cos(2 * Math.PI * mm * xi);
    w[i] = 1 + 2 * s;
  }
  return [colVec(Array.from(w))];
}

async function tukeywin(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('tukeywin: requires n');
  const n = Math.round(asScalar(m(args[0])));
  const r = args.length > 1 ? asScalar(m(args[1])) : 0.5;
  const w = new Float64Array(n);
  if (n === 1) { w[0] = 1; return [colVec([1])]; }
  if (r <= 0) { w.fill(1); return [colVec(Array.from(w))]; }
  const rc = Math.min(r, 1);
  const per = rc / 2;
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1); // 0..1
    if (x < per) w[i] = 0.5 * (1 + Math.cos(Math.PI * (x / per - 1)));
    else if (x <= 1 - per) w[i] = 1;
    else w[i] = 0.5 * (1 + Math.cos(Math.PI * (x / per - 2 / rc + 1)));
  }
  return [colVec(Array.from(w))];
}

async function gausswin(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('gausswin: requires n');
  const n = Math.round(asScalar(m(args[0])));
  const alpha = args.length > 1 ? asScalar(m(args[1])) : 2.5;
  const L = n - 1;
  const w = Float64Array.from({length:n}, (_,i) => Math.exp(-0.5*(alpha*(2*i-L)/L)**2));
  return [rowVec(Array.from(w))];
}

export const DSP: ToolboxModule = {
  id: 'dsp',
  name: 'DSP System Toolbox',
  docBase: 'https://www.mathworks.com/help/dsp/',
  builtins: {
    // Filter analysis
    grpdelay,
    impz,
    stepz,
    // Standalone bilinear transform
    bilinear,
    // Bessel filter
    besself,
    // FIR design
    firpm,
    remez,
    firls,
    firpmord,
    // SOS operations
    sosfilt,
    tf2sos,
    sos2tf,
    zp2tf,
    tf2zp,
    zp2sos: zp2sos_fn,
    // Multirate
    decimate: decimate_fn,
    // QUARANTINED: interp — needs MATLAB's polyphase least-squares filter design (too large to port to 1e-4)
    resample: resample_fn,
    // Windows (additional, not in signal.ts)
    chebwin,
    taylorwin,
    tukeywin,
    gausswin,
    // System object step/release
    step: dspStep,
    release: dspRelease,
    reset: dspReset,
  },
  // DSP System objects exposed via dsp.* namespace (handled by dot-notation in builtins)
  methods: {
    'dsp.FIRFilter': { create: dspFIRFilter, step: dspStep, release: dspRelease },
    'dsp.BiquadFilter': { create: dspBiquadFilter, step: dspStep, release: dspRelease },
    'dsp.FIRDecimator': { create: dspFIRDecimator, step: dspStep, release: dspRelease },
    'dsp.FIRInterpolator': { create: dspFIRInterpolator, step: dspStep, release: dspRelease },
    // QUARANTINED: dsp.RMS/dsp.Mean/dsp.Variance removed in R2026a; dsp.SpectrumAnalyzer is a non-numeric scope
  },
  constants: {
    'dsp.FIRFilter': dspFIRFilter as any,
    'dsp.BiquadFilter': dspBiquadFilter as any,
    'dsp.FIRDecimator': dspFIRDecimator as any,
    'dsp.FIRInterpolator': dspFIRInterpolator as any,
    // QUARANTINED: dsp.RMS/dsp.Mean/dsp.Variance/dsp.SpectrumAnalyzer (see methods)
  },
  help: HELP_DSP,
};
