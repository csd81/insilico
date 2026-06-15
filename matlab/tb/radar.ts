// Radar Toolbox — computable, exactly-validatable subset.
//
// Range/time/Doppler converters and the radar-range-equation family (closed-form, validated to
// 1e-6 against live MATLAB R2026a), plus the ULA/array steering vector `steervec` (complex).
//
// Validated oracle values (MATLAB R2026a):
//   dop2speed(1000,0.03)        = 30
//   speed2dop(15,0.03)          = 500
//   range2time(1000)            = 6.67128190396304e-06
//   time2range(1e-5)            = 1498.96229
//   range2bw(1)                 = 149896229          (== rangeres2bw(1))
//   radareqsnr(0.03,1000,1000,1e-6) = 30.5413163679585
//   radareqpow(0.03,1000,10,1e-6)   = 8.82812275113955
//   radareqrng(0.03,10,1000,1e-6)   = 3262.36770450521
//   steervec([0 .5 1 1.5],[30;20]) imag = [0; .995516410229549; .188329782854213; -.959888562465857]
//   aperture2gain(3,0.1)              = 35.7633111874176
//   grnd2slantrange(1000,30)          = 1154.70053837925
//   mtifactor(4,300e6,200)            = 55.398613519649
//   mtifactor(2,300e6,200)            = 21.0372493339378
//   mtifactor(3,1e9,1000)             = 46.0735336863138  (small-sigmaz branch)
//   sarnoiserefl(16e9,16.7e9,30,db2pow(-25)) = -55.1859648849166
//
// Discarded (hallucinated, do not exist in MATLAB): range2tof, dopplerFreq, radarEquation, cfar1d,
// phased_steeringVector. The radareq* functions accept name/value options (RCS, Ts, Gain, Loss,
// CustomFactor, ...) — here we implement the basic positional form with MATLAB's documented
// defaults (RCS=1, Ts=290 K, Gain=20 dB, Loss=0, CustomFactor=0, AtmosphericLoss=0,
// PropagationFactor=0) since those are the only ones we can validate exactly closed-form.

import { type Value, type Mat, scalar, asScalar, asString, isObject, makeObject, str, toMat as m } from '../values';
import { LIGHTSPEED } from '../physconst';
import type { ToolboxModule } from './types';
import { HELP_RADAR } from '../help/toolbox-help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

const C = LIGHTSPEED;        // physconst('lightspeed'), m/s
const K_BOLTZ = 1.380649e-23; // physconst('Boltzmann'), J/K
const db2pow = (x: number) => 10 ** (x / 10);
const pow2db = (x: number) => 10 * Math.log10(x);
const FOURPI3 = (4 * Math.PI) ** 3;

const num = (v: Value, ctx: string) => asScalar(m(v, ctx), ctx);
const optC = (args: Value[], i: number) => (args[i] != null ? num(args[i], 'C') : C);

// ── range/time/Doppler converters (all scalar closed-form; element-wise on the first arg) ──
function elementwise(v: Value, f: (x: number) => number): Mat {
  const M = m(v, 'arg');
  const out = Float64Array.from(M.data, f);
  return { kind: 'num', rows: M.rows, cols: M.cols, data: out };
}

// dop2speed(dp,lambda) = dp*lambda
const dop2speed = (a: Value[]) => { const lam = num(a[1], 'LAMBDA'); return ret(elementwise(a[0], (x) => x * lam)); };
// speed2dop(sp,lambda) = sp/lambda
const speed2dop = (a: Value[]) => { const lam = num(a[1], 'LAMBDA'); return ret(elementwise(a[0], (x) => x / lam)); };
// range2time(r,c) = 2*r/c
const range2time = (a: Value[]) => { const c = optC(a, 1); return ret(elementwise(a[0], (r) => (2 * r) / c)); };
// time2range(t,c) = t*c/2
const time2range = (a: Value[]) => { const c = optC(a, 1); return ret(elementwise(a[0], (t) => (t * c) / 2)); };
// range2bw(r,c) == rangeres2bw(r,c) = c/(2*r)  (RangeBroadening default 1)
const range2bw = (a: Value[]) => { const c = optC(a, 1); return ret(elementwise(a[0], (r) => c / (2 * r))); };

// ── radar range equation (basic positional form, MATLAB defaults) ──
// Scalar RNG ⇒ transmit==receive range, so (RNG1*RNG2)^2 = R^4. Gain scalar ⇒ Gain(1)=Gain(2)=20.
const DEF = { RCS: 1, Ts: 290, GAIN: 20, LOSS: 0, FC: 0 } as const;

// radareqsnr(lambda,RNG,Pt,tau) → SNR in dB
function radareqsnr(a: Value[]): Promise<Value[]> {
  const lambda = num(a[0], 'lambda'), RNG = num(a[1], 'RNG'), Pt = num(a[2], 'Pt'), tau = num(a[3], 'tau');
  const snr = (Pt * tau * DEF.RCS * lambda ** 2) / (FOURPI3 * K_BOLTZ * DEF.Ts * (RNG * RNG) ** 2);
  const SNRdb = pow2db(snr) + DEF.GAIN + DEF.GAIN + DEF.FC - DEF.LOSS;
  return ret(scalar(SNRdb));
}

// radareqpow(lambda,RNG,SNR,tau) → transmit power Pt in Watts
function radareqpow(a: Value[]): Promise<Value[]> {
  const lambda = num(a[0], 'lambda'), RNG = num(a[1], 'RNG'), SNR = num(a[2], 'SNR'), tau = num(a[3], 'tau');
  const dBTerms = db2pow(SNR - DEF.GAIN - DEF.GAIN + DEF.LOSS - DEF.FC);
  const Pt = (FOURPI3 * K_BOLTZ * DEF.Ts * dBTerms * (RNG * RNG) ** 2) / (tau * DEF.RCS * lambda ** 2);
  return ret(scalar(Pt));
}

// radareqrng(lambda,SNR,Pt,tau) → maximum range in meters
function radareqrng(a: Value[]): Promise<Value[]> {
  const lambda = num(a[0], 'lambda'), SNR = num(a[1], 'SNR'), Pt = num(a[2], 'Pt'), tau = num(a[3], 'tau');
  const dBTerms = db2pow(SNR - DEF.GAIN - DEF.GAIN + DEF.LOSS - DEF.FC);
  const rng = ((Pt * tau * DEF.RCS * lambda ** 2) / (FOURPI3 * K_BOLTZ * DEF.Ts * dBTerms)) ** (1 / 4);
  return ret(scalar(rng));
}

// ── steervec(pos,ang) : array steering vector ──
// ── aperture/gain, SAR & MTI converters (closed-form, MATLAB defaults) ──

// aperture2gain(A,lambda) = pow2db(4*pi*A/lambda^2)  → gain in dBi (A vector, lambda scalar).
const aperture2gain = (a: Value[]) => {
  const lam = num(a[1], 'LAMBDA');
  return ret(elementwise(a[0], (Ae) => pow2db((4 * Math.PI * Ae) / (lam * lam))));
};

// grnd2slantrange(grndrng,grazang) = grndrng./cosd(grazang)  (grazang scalar deg, in [0,90)).
const grnd2slantrange = (a: Value[]) => {
  const grazDeg = num(a[1], 'GRAZANG');
  const cg = Math.cos((grazDeg * Math.PI) / 180);
  return ret(elementwise(a[0], (g) => g / cg));
};

// sarnoiserefl(freq,freqref,imgsnr,sigmaref[,n]) → noise-equiv reflectivity (dB).
// neq = pow2db(sigmaref*(freq/freqref).^n / db2pow(imgsnr)). freq (J×1) × imgsnr (1×K) → J×K.
function sarnoiserefl(a: Value[]): Promise<Value[]> {
  const freqM = m(a[0], 'FREQ');
  const freqref = num(a[1], 'FREQREF');
  const snrM = m(a[2], 'IMGSNR');
  const sigmaref = num(a[3], 'SIGMAREF');
  const n = a[4] != null ? num(a[4], 'N') : 1;
  const freq = Array.from(freqM.data);          // J entries (vector, any orientation)
  const snr = Array.from(snrM.data);            // K entries
  const J = freq.length, K = snr.length;
  const out = new Float64Array(J * K);          // J×K, column-major
  for (let k = 0; k < K; k++) {
    const snrInv = 1 / db2pow(snr[k]);
    for (let j = 0; j < J; j++) {
      const ratio = (freq[j] / freqref) ** n;
      out[j + k * J] = pow2db(sigmaref * ratio * snrInv);
    }
  }
  return ret({ kind: 'num', rows: J, cols: K, data: out });
}

// mtifactor(M,FREQ,PRF[,name/value]) → MTI improvement factor (dB), 1×K.
// Basic positional form: coherent, ClutterStandardDeviation=2, NullVelocity=0, ClutterVelocity=0.
function mtifactor(a: Value[]): Promise<Value[]> {
  const mM = Math.round(num(a[0], 'M'));        // 2..4
  const freqM = m(a[1], 'FREQ'), prfM = m(a[2], 'PRF');
  const freq = Array.from(freqM.data), prf = Array.from(prfM.data);
  const sigmaV = 2, v0f = 0, v0 = 0;            // defaults (coherent)
  const K = Math.max(freq.length, prf.length);
  const fAt = (i: number) => (freq.length === 1 ? freq[0] : freq[i]);
  const pAt = (i: number) => (prf.length === 1 ? prf[0] : prf[i]);
  const sigmazSmall = 0.1;
  const out = new Float64Array(K);
  for (let i = 0; i < K; i++) {
    const vb = (C * pAt(i)) / (2 * fAt(i));      // blind speed (monostatic)
    const vzf = (2 * Math.PI * v0f) / vb;
    const vz = (2 * Math.PI * v0) / vb;
    const sigmaz = (2 * Math.PI * sigmaV) / vb;
    const aboutEqual = Math.abs(vz - vzf) <= Math.sqrt(Number.EPSILON);
    const d = vz - vzf;
    let Im: number;
    if (mM === 4) {
      Im = 1 / (1 - (3 / 2) * Math.exp(-(sigmaz ** 2) / 2) * Math.cos(d)
        + (3 / 5) * Math.exp(-2 * sigmaz ** 2) * Math.cos(2 * d)
        - (1 / 10) * Math.exp(-(9 / 2) * sigmaz ** 2) * Math.cos(3 * d));
      if (sigmaz < sigmazSmall && aboutEqual) Im = 4 / (3 * sigmaz ** 6);
    } else if (mM === 3) {
      Im = 1 / (1 - (4 / 3) * Math.exp(-(sigmaz ** 2) / 2) * Math.cos(d)
        + (1 / 3) * Math.exp(-2 * sigmaz ** 2) * Math.cos(2 * d));
      if (sigmaz < sigmazSmall && aboutEqual) Im = 2 / sigmaz ** 4;
    } else { // m = 2 (single delay canceler)
      Im = 1 / (1 - Math.exp(-(sigmaz ** 2) / 2) * Math.cos(d));
      if (sigmaz < sigmazSmall) Im = 2 / sigmaz ** 2;
    }
    if (Im <= 0) Im = 1e30;
    out[i] = pow2db(Im);
  }
  return ret({ kind: 'num', rows: 1, cols: K, data: out });
}

// ── steervec(pos,ang) : array steering vector ──
// pos: 1×N (y-coords), 2×N (x,y) or 3×N (x,y,z) sensor positions in wavelengths.
// ang: 1×M azimuth (el=0) or 2×M [az;el] in degrees.
// sv(n,m) = exp(1i*2*pi * pos(:,n) · u(:,m)),  u = [cos(el)cos(az); cos(el)sin(az); sin(el)].
function colVecToXYZ(M: Mat): number[][] {
  // returns N triples [x,y,z], column-major source.
  const N = M.cols, rows = M.rows;
  const out: number[][] = [];
  for (let c = 0; c < N; c++) {
    let x = 0, y = 0, z = 0;
    if (rows === 1) { y = M.data[c]; }                 // 1×N ⇒ y only
    else if (rows === 2) { y = M.data[0 + c * 2]; z = M.data[1 + c * 2]; }  // 2×N ⇒ [y;z]
    else { x = M.data[0 + c * 3]; y = M.data[1 + c * 3]; z = M.data[2 + c * 3]; }
    out.push([x, y, z]);
  }
  return out;
}
function angToAzEl(M: Mat): [number, number][] {
  const Mn = M.cols, rows = M.rows;
  const out: [number, number][] = [];
  for (let c = 0; c < Mn; c++) {
    const az = M.data[0 + c * rows];
    const el = rows >= 2 ? M.data[1 + c * rows] : 0;
    out.push([az, el]);
  }
  return out;
}
function steervec(args: Value[]): Promise<Value[]> {
  const posM = m(args[0], 'POS'), angM = m(args[1], 'ANG');
  const pts = colVecToXYZ(posM);
  const angs = angToAzEl(angM);
  const N = pts.length, Mn = angs.length;
  const re = new Float64Array(N * Mn), im = new Float64Array(N * Mn);
  const d2r = Math.PI / 180;
  for (let mi = 0; mi < Mn; mi++) {
    const [azDeg, elDeg] = angs[mi];
    const az = azDeg * d2r, el = elDeg * d2r;
    const ux = Math.cos(el) * Math.cos(az), uy = Math.cos(el) * Math.sin(az), uz = Math.sin(el);
    for (let n = 0; n < N; n++) {
      const [px, py, pz] = pts[n];
      const phase = 2 * Math.PI * (px * ux + py * uy + pz * uz);
      const idx = n + mi * N; // column-major (N rows, M cols)
      re[idx] = Math.cos(phase);
      im[idx] = Math.sin(phase);
    }
  }
  const out: Mat = { kind: 'num', rows: N, cols: Mn, data: re, idata: im };
  return ret(out);
}

// ── sarbeamcompratio(r,lambda,synlen,wa[,'AzimuthBroadening',azb][,'ConeAngle',dcang]) ──
// SAR beam compression ratio. r is J×1 (column), lambda 1×K (row) ⇒ output J×K:
//   bcr = (wa*2*synlen*sind(dcang)) ./ ((r*lambda)*azb)
// Defaults: AzimuthBroadening azb=1, ConeAngle dcang=90 (sind(90)=1).
function sarbeamcompratio(a: Value[]): Promise<Value[]> {
  const rM = m(a[0], 'R'), lamM = m(a[1], 'LAMBDA');
  const synlen = num(a[2], 'SYNLEN'), wa = num(a[3], 'WA');
  let azb = 1, dcang = 90;
  for (let i = 4; i + 1 < a.length; i += 2) {
    const key = asString(a[i]).toLowerCase();
    if (key === 'azimuthbroadening') azb = num(a[i + 1], 'AzimuthBroadening');
    else if (key === 'coneangle') dcang = num(a[i + 1], 'ConeAngle');
  }
  const r = Array.from(rM.data);             // J entries (vector, any orientation → column)
  const lambda = Array.from(lamM.data);      // K entries (→ row)
  const J = r.length, K = lambda.length;
  const sind = Math.sin((dcang * Math.PI) / 180);
  const numer = wa * 2 * synlen * sind;
  const out = new Float64Array(J * K);       // J×K, column-major
  for (let k = 0; k < K; k++) {
    for (let j = 0; j < J; j++) {
      out[j + k * J] = numer / (r[j] * lambda[k] * azb);
    }
  }
  return ret({ kind: 'num', rows: J, cols: K, data: out });
}

// ── bistaticSurfaceReflectivityLand — normalized bistatic land reflectivity (NRCS) ──
// Documented default model: in-plane = Domville (Rural/Forest/Urban), out-of-plane =
// 'RuralInterpolation' (outOfPlaneRural, the experimentally verified Leonardo model).
// Faithful port of MATLAB R2026a +radar/+internal/+clutter/+bistaticLandReflectivity.
//
// Constructor returns a ClassV; calling step(h,angIn,angScat,angAz,freq) computes a Q×R matrix.
// angIn,angScat: grazing angles 0..90 (deg); angAz: -180..180 (deg); freq: 1×R (only sets R).

// griddedInterpolant(x,v,'linear','nearest'): linear interpolation, nearest-value extrapolation.
function gridInterp(x: number[], v: number[], q: number): number {
  const n = x.length;
  if (q <= x[0]) return v[0];
  if (q >= x[n - 1]) return v[n - 1];
  let i = 1;
  while (i < n && x[i] < q) i++;
  const x0 = x[i - 1], x1 = x[i], v0 = v[i - 1], v1 = v[i];
  return v0 + ((v1 - v0) * (q - x0)) / (x1 - x0);
}

const D2P = (x: number) => 10 ** (x / 10);
const seq = (lo: number, step: number, hi: number) => {
  const out: number[] = [];
  for (let x = lo; x <= hi + 1e-9; x += step) out.push(x);
  return out;
};

// Domville in-plane NRCS (linear m^2/m^2). angIn 0..90; theta (in-plane scatter) 0..180.
function domvilleRural(angIn: number, theta: number): number {
  const xL = [0, 10, 20, 30, 40, 50, 60, 65, 75, 82, 90, 110];
  const vL = [-6, -7, -8, -10, -13, -17, -17.5, -18, -18.5, -19, -20, -28].map(D2P);
  const xR = [0, 10, 20, 30, 40, 50, 60, 70, 85].map((x) => x / Math.SQRT2);
  const vR = [-6, -7, -8, -10, -13, -17, -18, -18.5, -19].map(D2P);
  let nrcs: number;
  if (theta < 90) nrcs = gridInterp(xL, vL, Math.hypot(90 - angIn, 90 - theta));
  else nrcs = gridInterp(xR, vR, Math.abs(angIn + theta - 180) / Math.SQRT2);
  // Forward-scattering triangular overrides (quantized constant-NRCS regions).
  if (theta > 143 && angIn > -1.7391 * theta + 286.95 && angIn < -0.5263 * theta + 114.66) nrcs = D2P(-6);
  if (theta > 150 && angIn > -1.5 * theta + 255 && angIn < -0.7 * theta + 135) nrcs = 2;
  if (theta > 160 && angIn > -1.67 * theta + 286.67 && angIn < -0.6 * theta + 116) nrcs = 3;
  if (theta > 168 && angIn < -0.96 * theta + 175 && angIn > -1.555 * theta + 275.333) nrcs = 4;
  return nrcs;
}
function domvilleUrban(angIn: number, theta: number): number {
  const xL = [0, 10, 18, 29, 38, 62, 82, 103, 119];
  const vL = [3.1623e-8, 3.1623e-8, 0.5, 0.25, 0.1, 0.05, 0.025, 0.175, 0.015];
  const xR = [0, 10, 18, 29, 38, 62, 82].map((x) => x / Math.SQRT2);
  const vR = [3.1623e-8, 3.1623e-8, 0.5, 0.25, 0.1, 0.05, 0.025];
  let nrcs: number;
  if (theta < 90) nrcs = gridInterp(xL, vL, Math.hypot(90 - angIn, 90 - theta));
  else nrcs = gridInterp(xR, vR, Math.abs(angIn + theta - 180) / Math.SQRT2);
  if (theta > 143 && angIn > -1.379 * theta + 233.103 && angIn < -0.775 * theta + 148.5) nrcs = 1;
  if (theta > 150 && angIn > -1.909 * theta + 326.455 && angIn < -0.7 * theta + 133) nrcs = 5;
  return nrcs;
}
// 2D bilinear interpolant (nearest-value extrapolation) on grid g1×g2, values vt[i][j]=f(g1[i],g2[j]).
function gridInterp2(g1: number[], g2: number[], vt: number[][], q1: number, q2: number): number {
  const clamp = (x: number, ax: number[]) => Math.min(Math.max(x, ax[0]), ax[ax.length - 1]);
  q1 = clamp(q1, g1); q2 = clamp(q2, g2);
  let i = 1; while (i < g1.length && g1[i] < q1) i++;
  let j = 1; while (j < g2.length && g2[j] < q2) j++;
  const x0 = g1[i - 1], x1 = g1[i], y0 = g2[j - 1], y1 = g2[j];
  const tx = x1 === x0 ? 0 : (q1 - x0) / (x1 - x0);
  const ty = y1 === y0 ? 0 : (q2 - y0) / (y1 - y0);
  const f00 = vt[i - 1][j - 1], f10 = vt[i][j - 1], f01 = vt[i - 1][j], f11 = vt[i][j];
  return f00 * (1 - tx) * (1 - ty) + f10 * tx * (1 - ty) + f01 * (1 - tx) * ty + f11 * tx * ty;
}
function domvilleForest(angIn: number, theta: number): number {
  const av = [-13, -13, -14, -15, -16, -17, -18, -19, -20, -21, -22, -23, -24, -25, -26].map(D2P);
  // x = [0:10:90, 90+cumsum([7.5 6.25 5 7.5 6.25])]
  const cum = [7.5, 6.25, 5, 7.5, 6.25].reduce<number[]>((acc, d) => { acc.push((acc.length ? acc[acc.length - 1] : 0) + d); return acc; }, []);
  const ax = [...seq(0, 10, 90), ...cum.map((c) => 90 + c)];
  const fwdIdx = theta > 152 && angIn < 28;
  if (!fwdIdx) return gridInterp(ax, av, Math.hypot(90 - angIn, 90 - theta));
  // TopCorner: griddedInterpolant({150:5:180, 0:5:30}, V'); call (theta, angIn).
  const V = [
    [-22.5, -22, -19, -14, -10, -10, -10],
    [-22, -21, -19, -14, -10, -10, -10],
    [-22, -20, -19, -14, -11, -11, -11],
    [-21.5, -20, -19, -16, -16, -16, -16],
    [-21.5, -21, -20, -20, -20, -20, -20],
    [-20, -20, -20.5, -21, -21, -22, -21],
    [-20.5, -20, -21.5, -22, -22, -22.5, -22.5],
  ].map((row) => row.map(D2P));      // V is 7×7 (rows=angAz-grid? indexes [angScat-row][angIn-col])
  const g1 = seq(150, 5, 180), g2 = seq(0, 5, 30);   // axes of V' : g1=theta, g2=angIn
  // V' transposes: Vt[i][j] = V[j][i], with i over g1 (theta), j over g2 (angIn).
  const Vt: number[][] = g1.map((_, i) => g2.map((__, j) => V[j][i]));
  return gridInterp2(g1, g2, Vt, theta, angIn);
}

// outOfPlaneRural: combine forward/back in-plane NRCS, azimuth weighting + gain (Leonardo, X-band).
function outOfPlaneRural(inPlane: (ai: number, th: number) => number, angIn: number, angScat: number, angAz: number): number {
  const az = Math.abs(angAz);
  const nf = inPlane(angIn, 180 - angScat);    // forward scattering
  const nb = inPlane(angIn, angScat);          // back scattering
  const fVal = Math.exp(-((az / 20) ** 2));    // fInterp, dPhi=20 (rural, Leonardo)
  const a = nf * fVal + nb * (1 - fVal);
  // gFunc(angAz) in dB: gamma0=-5, gammaf=gammab=5, wf=15, wb=45.
  const g = -5 + (5 * 15 * 15) / (az * az + 15 * 15) + (5 * 45 * 45) / ((az - 180) ** 2 + 45 * 45);
  return D2P(g) * a;
}

function bistaticLandCtor(a: Value[]): Promise<Value[]> {
  let inPlaneModel = 'Domville', outOfPlaneModel = 'RuralInterpolation', landType = 'Rural';
  for (let i = 0; i + 1 < a.length; i += 2) {
    const key = asString(a[i]).toLowerCase();
    if (key === 'inplanemodel') inPlaneModel = asString(a[i + 1]);
    else if (key === 'outofplanemodel') outOfPlaneModel = asString(a[i + 1]);
    else if (key === 'inplanelandtype') landType = asString(a[i + 1]);
  }
  return ret(makeObject('bistaticSurfaceReflectivityLand', {
    InPlaneModel: str(inPlaneModel),
    OutOfPlaneModel: str(outOfPlaneModel),
    InPlaneLandType: str(landType),
  }));
}

function bistaticLandStep(a: Value[]): Promise<Value[]> {
  const obj = a[0];
  if (!isObject(obj)) throw new Error('step: expected a bistaticSurfaceReflectivityLand object.');
  const landType = asString(obj.props.get('InPlaneLandType') ?? str('Rural')).toLowerCase();
  const inPlane = landType === 'urban' ? domvilleUrban : landType === 'forest' ? domvilleForest : domvilleRural;
  const angInM = m(a[1], 'ANGIN'), angScatM = m(a[2], 'ANGSCAT'), angAzM = m(a[3], 'ANGAZ');
  const freqM = a[4] != null ? m(a[4], 'FREQ') : scalar(1);
  const ai = Array.from(angInM.data), asc = Array.from(angScatM.data), aaz = Array.from(angAzM.data);
  const Q = Math.max(ai.length, asc.length, aaz.length);
  const R = freqM.data.length;
  const at = (arr: number[], q: number) => (arr.length === 1 ? arr[0] : arr[q]);
  const col = new Float64Array(Q);
  for (let q = 0; q < Q; q++) col[q] = outOfPlaneRural(inPlane, at(ai, q), at(asc, q), at(aaz, q));
  const out = new Float64Array(Q * R);          // Q×R, column-major (replicated across freq columns)
  for (let r = 0; r < R; r++) for (let q = 0; q < Q; q++) out[q + r * Q] = col[q];
  return ret({ kind: 'num', rows: Q, cols: R, data: out });
}

export const RADAR: ToolboxModule = {
  id: 'radar',
  name: 'Radar Toolbox',
  docBase: 'https://www.mathworks.com/help/radar/ref/',
  docPath: (name) => `${name}.html`,
  builtins: {
    dop2speed,
    speed2dop,
    range2time,
    time2range,
    range2bw,
    radareqsnr,
    radareqpow,
    radareqrng,
    aperture2gain,
    grnd2slantrange,
    sarnoiserefl,
    mtifactor,
    steervec,
    sarbeamcompratio,
    bistaticSurfaceReflectivityLand: bistaticLandCtor,
  },
  methods: {
    bistaticSurfaceReflectivityLand: { step: bistaticLandStep },
  },
  help: HELP_RADAR,
};
