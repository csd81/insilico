// Phased Array System Toolbox — angle-space conversions and conventional beamformer weights.
//
// Validated oracle values (MATLAB R2026a):
//   az2broadside(30,0)         = 30
//   az2broadside(30,20)        = 28.0243206736047
//   az2broadside(45,0)         = 45
//   az2broadside(-60,30)       = -48.5903778907291
//   broadside2az(30,0)         = 30
//   broadside2az(30,20)        = 32.1467014004801
//   broadside2az(-20,45)       = -28.9266492997599
//   azel2uv([30;0])            = [0.5; 0]
//   azel2uv([0;45])            = [0; 0.707106781186547]
//   azel2uv([-30;20])          = [-0.469846310392954; 0.342020143325669]
//   uv2azel([0.5;0])           = [30; 0]
//   uv2azel([-0.3;0.4])        = [-19.1066053508691; 23.5781784782018]
//   cbfweights((0:4)*0.5,30)   → w = [0.2; 0.2i; -0.2; -0.2i; 0.2]  (to 1e-12)
//   cbfweights((0:3)*0.5,[30 45]) col2 w(2) = -0.151424966769703+0.19892330039187i

import { type Value, type Mat, scalar, toMat as m, asScalar, asString, MatError } from '../values';
import { LIGHTSPEED } from '../physconst';
import type { ToolboxModule } from './types';
import { HELP_PHASED } from '../help/help-phased';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

const D2R = Math.PI / 180;
const sind  = (x: number) => Math.sin(x * D2R);
const cosd  = (x: number) => Math.cos(x * D2R);
const asind = (x: number) => Math.asin(Math.max(-1, Math.min(1, x))) / D2R;

// element-wise map over a real Mat (scalar or row/col vector)
function ew(v: Value, f: (x: number) => number): Mat {
  const M = m(v, 'arg');
  return { kind: 'num', rows: M.rows, cols: M.cols, data: Float64Array.from(M.data, f) };
}

// element-wise over two Mats, broadcasting a scalar against a vector/matrix
function ew2(a: Value, b: Value, f: (x: number, y: number) => number): Mat {
  const A = m(a, 'arg'), B = m(b, 'arg');
  const big = A.data.length >= B.data.length ? A : B;
  const d = new Float64Array(big.data.length);
  for (let i = 0; i < d.length; i++) d[i] = f(A.data[A.data.length === 1 ? 0 : i], B.data[B.data.length === 1 ? 0 : i]);
  return { kind: 'num', rows: big.rows, cols: big.cols, data: d };
}


// ── physconst(name): physical constants (MATLAB R2026a values) ──────────────────────────
function physconst(args: Value[]): Promise<Value[]> {
  const raw = asString(args[0]);
  const key = raw.toLowerCase().replace(/\s+/g, '');
  const table: Record<string, number> = {
    lightspeed: LIGHTSPEED,        // m/s (exact)
    boltzmann: 1.380649e-23,       // J/K (2019 SI exact)
    earthradius: 6371000,          // m (mean)
  };
  const v = table[key];
  if (v === undefined) throw new MatError(`physconst: unknown constant '${raw}'`);
  return ret(scalar(v));
}

// ── freq2wavelen(freq[,c]): wavelength = c/freq (element-wise) ───────────────────────────
function freq2wavelen(args: Value[]): Promise<Value[]> {
  const c = args[1] != null ? asScalar(m(args[1], 'c')) : LIGHTSPEED;
  return ret(ew(args[0], (f) => c / f));
}

// ── wavelen2freq(lambda[,c]): freq = c/lambda (element-wise) ─────────────────────────────
function wavelen2freq(args: Value[]): Promise<Value[]> {
  const c = args[1] != null ? asScalar(m(args[1], 'c')) : LIGHTSPEED;
  return ret(ew(args[0], (lambda) => c / lambda));
}

// ── gain2aperture(G,lambda): A = lambda^2 * 10^(G/10) / (4*pi) (G in dBi) ─────────────────
function gain2aperture(args: Value[]): Promise<Value[]> {
  return ret(ew2(args[0], args[1], (G, lambda) => (lambda * lambda * 10 ** (G / 10)) / (4 * Math.PI)));
}

// ── albersheim(Pd,Pfa[,N]): single-sample SNR (dB) to detect in white Gaussian noise ─────
// SNRdB = -5*log10(N) + (6.2 + 4.54/sqrt(N+0.44))*log10(A + 0.12*A*B + 1.7*B),
// with A = ln(0.62/Pfa), B = ln(Pd/(1-Pd)). N defaults to 1.
function albersheim(args: Value[]): Promise<Value[]> {
  const pd = asScalar(m(args[0], 'Pd')), pfa = asScalar(m(args[1], 'Pfa'));
  const N = args[2] != null ? asScalar(m(args[2], 'N')) : 1;
  const A = Math.log(0.62 / pfa);
  const B = Math.log(pd / (1 - pd));
  const snr = -5 * Math.log10(N) + (6.2 + 4.54 / Math.sqrt(N + 0.44)) * Math.log10(A + 0.12 * A * B + 1.7 * B);
  return ret(scalar(snr));
}

// ── ROC curves (rocsnr / rocpfa) — Gaussian Q-function helpers ────────────────────────────
// Numerical-Recipes erfc (|err| < 1.2e-7) → Q(x) = 0.5*erfc(x/√2) = P(N(0,1) > x).
function erfcApprox(x: number): number {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const ans = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? ans : 2 - ans;
}
const qfn = (x: number): number => 0.5 * erfcApprox(x / Math.SQRT2);
// Acklam inverse normal CDF (|err| ~1.15e-9). qinv(p) solves Q(qinv(p)) = p.
function norminvAcklam(p: number): number {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425, ph = 1 - pl; let q: number, r: number;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= ph) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}
const qinv = (p: number): number => norminvAcklam(1 - p);
// NonfluctuatingCoherent detection probability for N coherently integrated pulses.
const pdCoherent = (snrLin: number, pfa: number, N: number): number => qfn(qinv(pfa) - Math.sqrt(2 * N * snrLin));
function rocOpts(args: Value[], start: number): Map<string, Value> {
  const o = new Map<string, Value>();
  for (let i = start; i + 1 < args.length; i += 2) o.set(asString(args[i]).toLowerCase(), args[i + 1]);
  return o;
}
const optNum = (o: Map<string, Value>, k: string, dflt: number): number => (o.has(k) ? asScalar(m(o.get(k)!, k)) : dflt);

// rocsnr(SNRdB, ...): [Pd,Pfa] ROC over a log-spaced Pfa grid (rows) for each input SNR (cols).
function rocsnr(args: Value[]): Promise<Value[]> {
  const snrDb = Array.from(m(args[0], 'SNR').data);
  const o = rocOpts(args, 1);
  const sig = o.has('signaltype') ? asString(o.get('signaltype')!).toLowerCase() : 'nonfluctuatingcoherent';
  if (sig !== 'nonfluctuatingcoherent') throw new MatError('rocsnr: only SignalType "NonfluctuatingCoherent" is supported');
  const N = optNum(o, 'numpulses', 1), npts = Math.round(optNum(o, 'numpoints', 101));
  const lo = Math.log10(optNum(o, 'minpfa', 1e-10)), hi = Math.log10(optNum(o, 'maxpfa', 1));
  const pfa = Array.from({ length: npts }, (_, i) => (npts === 1 ? 10 ** lo : 10 ** (lo + ((hi - lo) * i) / (npts - 1))));
  const cols = snrDb.length, pd = new Float64Array(npts * cols);
  for (let j = 0; j < cols; j++) { const lin = 10 ** (snrDb[j] / 10); for (let i = 0; i < npts; i++) pd[i + j * npts] = pdCoherent(lin, pfa[i], N); }
  return Promise.resolve([{ kind: 'num', rows: npts, cols, data: pd } as Mat, { kind: 'num', rows: npts, cols: 1, data: Float64Array.from(pfa) } as Mat]);
}
// rocpfa(Pfa, ...): [Pd,SNR] ROC over a linear SNR(dB) grid (rows) for each input Pfa (cols).
function rocpfa(args: Value[]): Promise<Value[]> {
  const pfa = Array.from(m(args[0], 'Pfa').data);
  const o = rocOpts(args, 1);
  const sig = o.has('signaltype') ? asString(o.get('signaltype')!).toLowerCase() : 'nonfluctuatingcoherent';
  if (sig !== 'nonfluctuatingcoherent') throw new MatError('rocpfa: only SignalType "NonfluctuatingCoherent" is supported');
  const N = optNum(o, 'numpulses', 1), npts = Math.round(optNum(o, 'numpoints', 101));
  const mn = optNum(o, 'minsnr', -10), mx = optNum(o, 'maxsnr', 10);
  const snrDb = Array.from({ length: npts }, (_, i) => (npts === 1 ? mn : mn + ((mx - mn) * i) / (npts - 1)));
  const cols = pfa.length, pd = new Float64Array(npts * cols);
  for (let j = 0; j < cols; j++) for (let i = 0; i < npts; i++) pd[i + j * npts] = pdCoherent(10 ** (snrDb[i] / 10), pfa[j], N);
  return Promise.resolve([{ kind: 'num', rows: npts, cols, data: pd } as Mat, { kind: 'num', rows: npts, cols: 1, data: Float64Array.from(snrDb) } as Mat]);
}

// ── aperture2gain(A,lambda): G(dBi) = 10*log10(4*pi*A/lambda^2) ──────────────────────────
// (Also owned by radar, which wins the default pick; reach this one via phased.aperture2gain
//  or useToolbox('phased').)
function aperture2gain(args: Value[]): Promise<Value[]> {
  return ret(ew2(args[0], args[1], (A, lambda) => 10 * Math.log10((4 * Math.PI * A) / (lambda * lambda))));
}

// ── steervec(pos,ang): N×M complex steering vectors, exp(+i*2*pi*(p·u)) ──────────────────
// pos: 1×N (y), 2×N ([y;z]) or 3×N ([x;y;z]) element positions in wavelengths.
// ang: 1×M azimuth or 2×M [az;el] in degrees. (cbfweights = steervec/N.) Correct for all
// position shapes — radar.steervec had a 2×N axis bug; this one is reachable via phased.steervec.
function steervec(args: Value[]): Promise<Value[]> {
  const posM = m(args[0], 'POS'), angM = m(args[1], 'ANG');
  const N = posM.cols, posRows = posM.rows;
  const xyz: [number, number, number][] = [];
  for (let c = 0; c < N; c++) {
    let x = 0, y = 0, z = 0;
    if (posRows === 1)      { y = posM.data[c]; }
    else if (posRows === 2) { y = posM.data[0 + c * 2]; z = posM.data[1 + c * 2]; }
    else                    { x = posM.data[0 + c * 3]; y = posM.data[1 + c * 3]; z = posM.data[2 + c * 3]; }
    xyz.push([x, y, z]);
  }
  const M2 = angM.cols, angRows = angM.rows;
  const re = new Float64Array(N * M2), im = new Float64Array(N * M2);
  for (let mi = 0; mi < M2; mi++) {
    const az = angM.data[0 + mi * angRows] * D2R;
    const el = (angRows >= 2 ? angM.data[1 + mi * angRows] : 0) * D2R;
    const ux = Math.cos(el) * Math.cos(az), uy = Math.cos(el) * Math.sin(az), uz = Math.sin(el);
    for (let n = 0; n < N; n++) {
      const [px, py, pz] = xyz[n];
      const phase = 2 * Math.PI * (px * ux + py * uy + pz * uz);
      const idx = n + mi * N;
      re[idx] = Math.cos(phase); im[idx] = Math.sin(phase);
    }
  }
  return ret({ kind: 'num', rows: N, cols: M2, data: re, idata: im });
}

// ── az2broadside(az, el=0) ─────────────────────────────────────────────────────────────
// BSANG = asind(sind(AZ) .* cosd(EL))
// AZ and EL can be scalars or same-size vectors. EL defaults to 0.
function az2broadside(args: Value[]): Promise<Value[]> {
  const azM = m(args[0], 'AZ');
  if (args[1] == null) {
    return ret(ew(azM, az => asind(sind(az))));
  }
  const elM = m(args[1], 'EL');
  if (azM.rows === elM.rows && azM.cols === elM.cols) {
    const out = new Float64Array(azM.data.length);
    for (let i = 0; i < azM.data.length; i++)
      out[i] = asind(sind(azM.data[i]) * cosd(elM.data[i]));
    return ret({ kind: 'num', rows: azM.rows, cols: azM.cols, data: out });
  }
  // scalar el broadcast over az vector
  const elVal = elM.data[0];
  return ret(ew(azM, az => asind(sind(az) * cosd(elVal))));
}

// ── broadside2az(bsd, el=0) ────────────────────────────────────────────────────────────
// AZ = asind(sind(BSANG) ./ cosd(EL))   (clamp to ±1 before asin)
function broadside2az(args: Value[]): Promise<Value[]> {
  const bsdM = m(args[0], 'BSANG');
  if (args[1] == null) {
    return ret(ew(bsdM, b => asind(sind(b))));
  }
  const elM = m(args[1], 'EL');
  if (bsdM.rows === elM.rows && bsdM.cols === elM.cols) {
    const out = new Float64Array(bsdM.data.length);
    for (let i = 0; i < bsdM.data.length; i++)
      out[i] = asind(sind(bsdM.data[i]) / cosd(elM.data[i]));
    return ret({ kind: 'num', rows: bsdM.rows, cols: bsdM.cols, data: out });
  }
  const elVal = elM.data[0];
  return ret(ew(bsdM, b => asind(sind(b) / cosd(elVal))));
}

// ── azel2uv(azel) ─────────────────────────────────────────────────────────────────────
// Input: 2×N matrix [az; el] in degrees. Output: 2×N [u; v].
// u = cosd(el)*sind(az),  v = sind(el).
// Boresight = +X axis; az ∈ [-90,90], el ∈ [-90,90].
function azel2uv(args: Value[]): Promise<Value[]> {
  const M = m(args[0], 'AzEl');
  if (M.rows !== 2) throw new MatError('azel2uv: input must be a 2×N matrix [az; el]');
  const N = M.cols;
  const out = new Float64Array(2 * N);   // 2×N column-major
  for (let c = 0; c < N; c++) {
    const az = M.data[0 + c * 2];
    const el = M.data[1 + c * 2];
    out[0 + c * 2] = cosd(el) * sind(az);   // u
    out[1 + c * 2] = sind(el);              // v
  }
  return ret({ kind: 'num', rows: 2, cols: N, data: out });
}

// ── uv2azel(uv) ───────────────────────────────────────────────────────────────────────
// Input: 2×N [u; v] with u²+v² ≤ 1. Output: 2×N [az; el] in degrees.
// el = asind(v),  az = asind(u / sqrt(1 - v²)).
function uv2azel(args: Value[]): Promise<Value[]> {
  const M = m(args[0], 'UV');
  if (M.rows !== 2) throw new MatError('uv2azel: input must be a 2×N matrix [u; v]');
  const N = M.cols;
  const out = new Float64Array(2 * N);   // 2×N column-major
  for (let c = 0; c < N; c++) {
    const u = M.data[0 + c * 2];
    const v = M.data[1 + c * 2];
    const el = asind(v);
    const cosEl = Math.sqrt(Math.max(0, 1 - v * v));
    const az = cosEl < 1e-12 ? 0 : asind(u / cosEl);
    out[0 + c * 2] = az;
    out[1 + c * 2] = el;
  }
  return ret({ kind: 'num', rows: 2, cols: N, data: out });
}

// ── cbfweights(pos, ang) ───────────────────────────────────────────────────────────────
// Conventional (delay-and-sum) beamformer weights: w = steervec(pos,ang) / N_ele.
// pos: 1×N y-coords, 2×N [y;z], or 3×N [x;y;z] in wavelengths.
// ang: 1×M azimuth (el=0) or 2×M [az;el] in degrees.
// Output: complex N×M matrix.
function cbfweights(args: Value[]): Promise<Value[]> {
  const posM = m(args[0], 'POS');
  const angM = m(args[1], 'ANG');

  // Expand pos to 3×N_ele
  const N = posM.cols;
  const posRows = posM.rows;
  const xyz: [number, number, number][] = [];
  for (let c = 0; c < N; c++) {
    let x = 0, y = 0, z = 0;
    if (posRows === 1)      { y = posM.data[c]; }
    else if (posRows === 2) { y = posM.data[0 + c * 2]; z = posM.data[1 + c * 2]; }
    else                    { x = posM.data[0 + c * 3]; y = posM.data[1 + c * 3]; z = posM.data[2 + c * 3]; }
    xyz.push([x, y, z]);
  }

  // Parse angles to [az, el] pairs
  const M2 = angM.cols;
  const angRows = angM.rows;
  const angs: [number, number][] = [];
  for (let c = 0; c < M2; c++) {
    const az = angM.data[0 + c * angRows];
    const el = angRows >= 2 ? angM.data[1 + c * angRows] : 0;
    angs.push([az, el]);
  }

  const re = new Float64Array(N * M2);
  const im = new Float64Array(N * M2);
  for (let mi = 0; mi < M2; mi++) {
    const [azDeg, elDeg] = angs[mi];
    const az = azDeg * D2R, el = elDeg * D2R;
    const ux = Math.cos(el) * Math.cos(az);
    const uy = Math.cos(el) * Math.sin(az);
    const uz = Math.sin(el);
    for (let n = 0; n < N; n++) {
      const [px, py, pz] = xyz[n];
      const phase = 2 * Math.PI * (px * ux + py * uy + pz * uz);
      const idx = n + mi * N;
      re[idx] = Math.cos(phase) / N;
      im[idx] = Math.sin(phase) / N;
    }
  }
  return ret({ kind: 'num', rows: N, cols: M2, data: re, idata: im });
}

export const PHASED: ToolboxModule = {
  id: 'phased',
  name: 'Phased Array System Toolbox',
  docBase: 'https://www.mathworks.com/help/phased/',
  builtins: {
    az2broadside,
    broadside2az,
    azel2uv,
    uv2azel,
    cbfweights,
    steervec,
    aperture2gain,
    physconst,
    freq2wavelen,
    wavelen2freq,
    gain2aperture,
    albersheim,
    rocsnr,
    rocpfa,
  },
  help: HELP_PHASED,
};
