// Fixed-Point Designer Toolbox — fi (fixed-point number), numerictype, fimath, quantizer.
// Implements fixed-point quantization, bit-accurate arithmetic, and code-generation metadata.
import {
  type Value, type Mat, scalar, rowVec, colVec, toArray, asScalar, asString, toMat as m, isMat, isStr, isObject, isStruct, truthy, MatError,
  mat, zeros, makeObject, str, bool, cscalar, finishComplex,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_FIXEDPOINT } from '../help';

// ── numerictype: describe a fixed-point format ─────────────────────────────────────────
async function numerictype(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  if (args.length === 0) {
    props.set('Signedness', str('Signed')); props.set('WordLength', scalar(16)); props.set('FractionLength', scalar(15));
  } else if (args.length === 1) {
    // numerictype(T) copy
    if ((args[0] as any).kind === 'object') return [args[0]];
    // numerictype(isSigned)
    const sg = asScalar(m(args[0]));
    props.set('Signedness', str(sg ? 'Signed' : 'Unsigned'));
    props.set('WordLength', scalar(16)); props.set('FractionLength', scalar(sg ? 15 : 16));
  } else if (args.length === 2) {
    // numerictype(isSigned, wl)
    const sg = asScalar(m(args[0])), wl = asScalar(m(args[1]));
    props.set('Signedness', str(sg ? 'Signed' : 'Unsigned'));
    props.set('WordLength', scalar(wl)); props.set('FractionLength', scalar(wl - (sg ? 1 : 0)));
  } else {
    // numerictype(isSigned, wl, fl)
    const sg = asScalar(m(args[0])), wl = asScalar(m(args[1])), fl = asScalar(m(args[2]));
    props.set('Signedness', str(sg ? 'Signed' : 'Unsigned'));
    props.set('WordLength', scalar(wl)); props.set('FractionLength', scalar(fl));
  }
  return [makeObject('numerictype', props)];
}

// ── fimath: fixed-point math settings ─────────────────────────────────────────────────
async function fimath(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  props.set('RoundingMethod', str('Nearest'));
  props.set('OverflowAction', str('Saturate'));
  props.set('ProductMode', str('FullPrecision'));
  props.set('SumMode', str('FullPrecision'));
  // Apply name-value pairs
  for (let i = 0; i + 1 < args.length; i += 2) {
    if (isMat(args[i]) && (args[i] as any).isChar) {
      const key = String.fromCharCode(...(Array.from((args[i] as any).data) as number[]));
      props.set(key, args[i + 1]);
    }
  }
  return [makeObject('fimath', props)];
}

// ── fi: fixed-point number ─────────────────────────────────────────────────────────────
// fi(v) or fi(v, isSigned) or fi(v, isSigned, wl) or fi(v, isSigned, wl, fl) or fi(v, T)
// The internal value is quantized and stored as a rounded integer * 2^(-fl).
function quantize(v: number, wl: number, fl: number, signed: boolean, round: string, overflow: string): number {
  const scale = Math.pow(2, fl);
  let q = round === 'floor' ? Math.floor(v * scale) : Math.round(v * scale);
  // Use floating-point powers (exact to 2^53), not 32-bit shifts: 1<<32 wraps to 1.
  const maxInt = signed ? Math.pow(2, wl - 1) - 1 : Math.pow(2, wl) - 1;
  const minInt = signed ? -Math.pow(2, wl - 1) : 0;
  if (overflow === 'wrap') {
    const range = Math.pow(2, wl);
    q = ((q - minInt) % range + range) % range + minInt;
  } else {
    q = Math.max(minInt, Math.min(maxInt, q));
  }
  return q / scale;
}

async function fi(args: Value[]): Promise<Value[]> {
  if (args.length === 0) {
    const props = new Map<string, Value>();
    props.set('data', scalar(0)); props.set('WordLength', scalar(16)); props.set('FractionLength', scalar(15));
    props.set('Signed', bool(true));
    return [makeObject('fi', props)];
  }
  const v = isMat(args[0]) ? toArray(args[0] as any) : [asScalar(m(args[0]))];
  let signed = true, wl = 16, fl = 15;
  if (args.length >= 2) signed = asScalar(m(args[1])) !== 0;
  if (args.length >= 3) wl = Math.round(asScalar(m(args[2])));
  if (args.length >= 4) fl = Math.round(asScalar(m(args[3])));
  else fl = wl - (signed ? 1 : 0);
  const qv = v.map(x => quantize(x, wl, fl, signed, 'nearest', 'saturate'));
  const props = new Map<string, Value>();
  props.set('data', qv.length === 1 ? scalar(qv[0]) : rowVec(qv));
  props.set('WordLength', scalar(wl));
  props.set('FractionLength', scalar(fl));
  props.set('Signed', bool(signed));
  return [makeObject('fi', props)];
}

// ── quantizer: quantizer object ────────────────────────────────────────────────────────
async function quantizer(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  // Default: fixed-point signed 16-bit 15-fraction
  props.set('Mode', str('fixed'));
  props.set('Format', rowVec([16, 15]));
  props.set('RoundMode', str('nearest'));
  props.set('OverflowMode', str('saturate'));
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (isMat(a)) {
      if ((a as any).isChar) {
        const s = String.fromCharCode(...(Array.from((a as any).data) as number[]));
        props.set('Mode', str(s));
      } else {
        props.set('Format', a);
      }
    }
  }
  return [makeObject('quantizer', props)];
}

// ── quantize: apply quantizer to data ─────────────────────────────────────────────────
async function quantize_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('quantize: requires quantizer and data');
  const qObj = args[0];
  const data = isMat(args[1]) ? toArray(args[1] as any) : [asScalar(m(args[1]))];
  let wl = 16, fl = 15, signed = true;
  if ((qObj as any).kind === 'object') {
    const p = (qObj as any).props as Map<string, Value>;
    const fmt = p.get('Format');
    if (fmt && isMat(fmt)) {
      const arr = toArray(fmt as any);
      wl = arr[0] ?? 16; fl = arr[1] ?? 15;
    }
  }
  const result = data.map(x => quantize(x, wl, fl, signed, 'nearest', 'saturate'));
  const src = args[1] as any;
  return [result.length === 1 ? scalar(result[0]) : mat(src.rows ?? 1, src.cols ?? result.length, new Float64Array(result))];
}

// ── num2bin: convert number to binary fixed-point string ───────────────────────────────
async function num2bin(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('num2bin: requires input');
  // If fi object
  if ((args[0] as any).kind === 'object') {
    const p = (args[0] as any).props as Map<string, Value>;
    const data = p.get('data');
    const wl = isMat(p.get('WordLength')!) ? asScalar(p.get('WordLength') as any) : 16;
    const fl = isMat(p.get('FractionLength')!) ? asScalar(p.get('FractionLength') as any) : 15;
    if (data && isMat(data)) {
      const v = asScalar(data as any);
      const total = Math.pow(2, wl);
      let iv = Math.round(v * Math.pow(2, fl));
      iv = ((iv % total) + total) % total;          // two's-complement, wl-bit (BigInt mask, not 32-bit)
      const bits = BigInt(iv).toString(2).padStart(wl, '0');
      return [str(bits)];
    }
  }
  const v = asScalar(m(args[0]));
  return [str((v >>> 0).toString(2))];
}

// ── bin2num: convert binary fixed-point string to number ──────────────────────────────
// MATLAB form is a quantizer/fi method: bin2num(q, b). Reconstruct using q's word length,
// fraction length and sign (two's complement), not a bare unsigned parseInt.
async function bin2num(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('bin2num: requires input');
  const asStr = (v: Value): string => (isMat(v) && (v as any).isChar) || isStr(v) ? asString(v) : asScalar(m(v)).toString();
  let wl = 0, fl = 0, signed = true, scaled = false, s: string;
  if (isObject(args[0])) {
    const p = (args[0] as any).props as Map<string, Value>;
    if (p.has('Format')) { const fmt = toArray(p.get('Format') as any); wl = Math.round(fmt[0]); fl = Math.round(fmt[1] ?? 0); signed = !p.has('Mode') || asString(p.get('Mode')!).toLowerCase() !== 'ufixed'; }
    else { wl = Math.round(asScalar(p.get('WordLength') as any)); fl = Math.round(asScalar(p.get('FractionLength') as any)); signed = !p.has('Signed') || truthy(p.get('Signed')!); }
    scaled = true;
    s = asStr(args[1]);
  } else {
    s = asStr(args[0]);
  }
  let raw = parseInt(s, 2);
  if (scaled && signed && s.length >= wl && s[0] === '1') raw -= Math.pow(2, wl);   // two's complement
  return [scalar(scaled ? raw / Math.pow(2, fl) : raw)];
}

// ── fipref: fixed-point preferences ────────────────────────────────────────────────────
async function fipref(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  props.set('NumberDisplay', str('RealWorldValue'));
  props.set('FimathDisplay', str('full'));
  props.set('LoggingMode', str('off'));
  return [makeObject('fipref', props)];
}

// ── fixdt: return numerictype for Simulink fixed-point ─────────────────────────────────
async function fixdt(args: Value[]): Promise<Value[]> { return numerictype(args); }

// ── accumneg: subtract two fi values with fixed-point rounding/overflow control ────────
// c = accumneg(a, b) returns a - b quantized to the format of a.
async function accumneg(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('accumneg: requires two operands');
  const getVal = (v: Value): number => {
    if ((v as any).kind === 'object') {
      const data = (v as any).props?.get('data');
      return data && isMat(data) ? asScalar(data as any) : 0;
    }
    return asScalar(m(v));
  };
  const getFormat = (v: Value): [number, number, boolean] => {
    if ((v as any).kind === 'object') {
      const p = (v as any).props as Map<string, Value>;
      const wl = p.get('WordLength') && isMat(p.get('WordLength')!) ? asScalar(p.get('WordLength') as any) : 16;
      const fl = p.get('FractionLength') && isMat(p.get('FractionLength')!) ? asScalar(p.get('FractionLength') as any) : 15;
      const sg = p.get('Signed') && isMat(p.get('Signed')!) ? asScalar(p.get('Signed') as any) !== 0 : true;
      return [wl, fl, sg];
    }
    return [16, 15, true];
  };
  const a = getVal(args[0]), b = getVal(args[1]);
  const [wl, fl, signed] = getFormat(args[0]);
  const roundMode = args.length > 2 && isMat(args[2]) && (args[2] as any).isChar
    ? String.fromCharCode(...(Array.from((args[2] as any).data) as number[])).toLowerCase()
    : 'nearest';
  const ovMode = args.length > 3 && isMat(args[3]) && (args[3] as any).isChar
    ? String.fromCharCode(...(Array.from((args[3] as any).data) as number[])).toLowerCase()
    : 'saturate';
  const result = quantize(a - b, wl, fl, signed, roundMode, ovMode);
  const props = new Map<string, Value>();
  props.set('data', scalar(result));
  props.set('WordLength', scalar(wl));
  props.set('FractionLength', scalar(fl));
  props.set('Signed', bool(signed));
  return [makeObject('fi', props)];
}

// ── CORDIC algorithms ──────────────────────────────────────────────────────────────────
// Software (double-precision) emulation of MATLAB's CORDIC builtins. CORDIC computes
// elementary functions with shift-and-add iterations; here we run enough iterations that the
// result is accurate to double precision, matching MATLAB's default behavior for double inputs.
// Default iteration counts mirror MATLAB's full-precision defaults (sqrt: 52, rotate: 52). An
// explicit `niter` argument reproduces the partial-convergence intermediate result exactly.

const DEFAULT_NITER = 52;

/** Hyperbolic CORDIC vectoring constant K_h = prod sqrt(1 - 2^(-2i)) over the executed iterations,
 *  including the repeated indices (4,13,40,...) required for hyperbolic convergence. */
function hyperbolicGain(niter: number): { gain: number; idx: number[] } {
  // Build the iteration index sequence: 1,2,3,4,4,5,...,13,13,14,... (repeat 4,13,40,121,...).
  const idx: number[] = [];
  let i = 1, nextRepeat = 4;
  while (idx.length < niter) {
    idx.push(i);
    if (i === nextRepeat && idx.length < niter) { idx.push(i); nextRepeat = 3 * nextRepeat + 1; }
    i++;
  }
  let gain = 1;
  for (const k of idx) gain *= Math.sqrt(1 - Math.pow(2, -2 * k));
  return { gain, idx };
}

/** cordicsqrt(x[,niter]) — square root via hyperbolic CORDIC.
 *  Uses the identity sqrt(w) = sqrt((w+0.25)^2 - (w-0.25)^2) with the hyperbolic vectoring mode,
 *  which converges for w in [0.25, ~2). The input is range-reduced by powers of 4 into that band
 *  (sqrt(4^k · w) = 2^k · sqrt(w)) so the whole positive line is covered. */
function cordicSqrtScalar(x0: number, niter: number): number {
  if (!(x0 > 0)) return 0;             // MATLAB returns 0 for x<=0 (non-positive out of domain)
  // Range-reduce x into [0.5, 2) by powers of 4 → sqrt scales by powers of 2.
  let x = x0, scale = 1;
  while (x >= 2) { x /= 4; scale *= 2; }
  while (x < 0.5) { x *= 4; scale /= 2; }
  // Hyperbolic vectoring: rotate (x_h, y_h) toward y_h=0; result magnitude = sqrt(xh^2 - yh^2).
  let xh = x + 0.25, yh = x - 0.25;
  const { gain, idx } = hyperbolicGain(niter);
  for (const k of idx) {
    const d = yh < 0 ? 1 : -1;          // drive yh toward 0
    const f = d * Math.pow(2, -k);
    const xn = xh + f * yh;
    const yn = yh + f * xh;
    xh = xn; yh = yn;
  }
  return (xh / gain) * scale;
}

async function cordicsqrt(args: Value[]): Promise<Value[]> {
  const X = m(args[0]);
  const niter = args.length > 1 ? Math.max(1, Math.round(asScalar(m(args[1])))) : DEFAULT_NITER;
  const out = zeros(X.rows, X.cols);
  for (let i = 0; i < X.data.length; i++) out.data[i] = cordicSqrtScalar(X.data[i], niter);
  return [out];
}

/** Circular CORDIC rotation of (xr,xi) by angle theta (theta reduced into [-pi/2, pi/2]).
 *  Returns the rotated complex pair (already gain-corrected). */
function cordicRotateScalar(theta: number, xr: number, xi: number, niter: number, gain: number): [number, number] {
  // Quadrant pre-reduction: fold theta into [-pi/2, pi/2] by 180° pre-rotation (negate vector).
  let t = theta, sr = xr, si = xi;
  // wrap into (-pi, pi]
  t = t - 2 * Math.PI * Math.round(t / (2 * Math.PI));
  if (t > Math.PI / 2) { t -= Math.PI; sr = -sr; si = -si; }
  else if (t < -Math.PI / 2) { t += Math.PI; sr = -sr; si = -si; }
  let z = t;
  for (let k = 0; k < niter; k++) {
    const d = z < 0 ? -1 : 1;
    const f = d * Math.pow(2, -k);
    const xn = sr - f * si;
    const yn = si + f * sr;
    sr = xn; si = yn;
    z -= d * Math.atan(Math.pow(2, -k));
  }
  return [sr * gain, si * gain];
}

/** Circular CORDIC gain K = prod sqrt(1 + 2^(-2k)) for k=0..niter-1. */
function circularGain(niter: number): number {
  let g = 1;
  for (let k = 0; k < niter; k++) g *= Math.sqrt(1 + Math.pow(2, -2 * k));
  return 1 / g;
}

/** cordicrotate(theta, x[,niter]) — rotate complex x by theta, i.e. x·exp(i·theta). */
async function cordicrotate(args: Value[]): Promise<Value[]> {
  const theta = asScalar(m(args[0]));
  const X = m(args[1]);
  const niter = args.length > 2 ? Math.max(1, Math.round(asScalar(m(args[2])))) : DEFAULT_NITER;
  const gain = circularGain(niter);
  const re = new Float64Array(X.data.length), im = new Float64Array(X.data.length);
  for (let i = 0; i < X.data.length; i++) {
    const [zr, zi] = cordicRotateScalar(theta, X.data[i], X.idata ? X.idata[i] : 0, niter, gain);
    re[i] = zr; im[i] = zi;
  }
  if (X.data.length === 1) return [cscalar(re[0], im[0])];
  return [finishComplex(X.rows, X.cols, re, im)];
}

/** cordicqr(A[,niter]) — QR factorization via CORDIC Givens rotations. Returns [Q, R] with full
 *  (non-economy) Q (m×m) and R (m×n). Each Givens rotation that zeros a sub-diagonal entry is
 *  applied via circular CORDIC vectoring (angle accumulated, gain-corrected), mirroring MATLAB. */
async function cordicqr(args: Value[]): Promise<Value[]> {
  const A = m(args[0]);
  const mm = A.rows, nn = A.cols;
  const niter = args.length > 1 ? Math.max(1, Math.round(asScalar(m(args[1])))) : DEFAULT_NITER;
  const gain = circularGain(niter);
  // R starts as a copy of A; Q^T accumulates the inverse rotations (start as identity).
  const R: number[][] = []; for (let r = 0; r < mm; r++) { R.push([]); for (let c = 0; c < nn; c++) R[r][c] = A.data[r + c * mm]; }
  const Qt: number[][] = []; for (let r = 0; r < mm; r++) { Qt.push([]); for (let c = 0; c < mm; c++) Qt[r][c] = r === c ? 1 : 0; }

  // Vectoring: rotate the 2-vector (a,b) so b→0, returning the accumulated angle z.
  const vectorAngle = (a: number, b: number): number => {
    let x = a, y = b, z = 0;
    for (let k = 0; k < niter; k++) {
      const d = y >= 0 ? -1 : 1;           // drive y toward 0
      const f = d * Math.pow(2, -k);
      const xn = x - f * y, yn = y + f * x;
      x = xn; y = yn;
      z -= d * Math.atan(Math.pow(2, -k));
    }
    return z;
  };
  // Rotate a pair of row-vectors (rowP, rowQ) by angle (circular, gain-corrected) in place.
  const applyRotation = (rows: number[][], p: number, q: number, len: number, z: number): void => {
    for (let c = 0; c < len; c++) {
      let x = rows[p][c], y = rows[q][c]; let zz = z;
      for (let k = 0; k < niter; k++) {
        const d = zz < 0 ? -1 : 1;
        const f = d * Math.pow(2, -k);
        const xn = x - f * y, yn = y + f * x;
        x = xn; y = yn;
        zz -= d * Math.atan(Math.pow(2, -k));
      }
      rows[p][c] = x * gain; rows[q][c] = y * gain;
    }
  };

  for (let c = 0; c < Math.min(mm, nn); c++) {
    for (let r = mm - 1; r > c; r--) {
      // Zero R[r][c] against the pivot R[c][c] via a Givens rotation of rows c and r.
      const z = vectorAngle(R[c][c], R[r][c]);
      applyRotation(R, c, r, nn, z);
      applyRotation(Qt, c, r, mm, z);
    }
  }
  // Q = (Q^T)^T.
  const Qd = new Float64Array(mm * mm);
  for (let r = 0; r < mm; r++) for (let cc = 0; cc < mm; cc++) Qd[cc + r * mm] = Qt[r][cc]; // transpose
  const Rd = new Float64Array(mm * nn);
  for (let r = 0; r < mm; r++) for (let c = 0; c < nn; c++) Rd[r + c * mm] = R[r][c];
  return [mat(mm, mm, Qd), mat(mm, nn, Rd)];
}

/** Circular CORDIC rotation mode for trig: rotate the vector (x0,y0) by the angle z0.
 *  z0 must already be reduced into the convergence range [-pi/2, pi/2]. Returns the
 *  gain-corrected (x, y) ≈ (x0·cos z0 - y0·sin z0, x0·sin z0 + y0·cos z0). */
function cordicRotMode(x0: number, y0: number, z0: number, niter: number, gain: number): [number, number] {
  let x = x0, y = y0, z = z0;
  for (let k = 0; k < niter; k++) {
    const d = z < 0 ? -1 : 1;
    const f = d * Math.pow(2, -k);
    const xn = x - f * y, yn = y + f * x;
    x = xn; y = yn;
    z -= d * Math.atan(Math.pow(2, -k));
  }
  return [x * gain, y * gain];
}

/** cos/sin of theta via circular CORDIC. Pre-reduces theta into [-pi/2, pi/2] by 180° folding
 *  (cos/sin flip sign across a half-turn), so the full real line is covered. Returns [sin, cos]. */
function cordicSinCosScalar(theta: number, niter: number, gain: number): [number, number] {
  // Wrap into (-pi, pi].
  let t = theta - 2 * Math.PI * Math.round(theta / (2 * Math.PI));
  let sign = 1;
  if (t > Math.PI / 2) { t -= Math.PI; sign = -1; }
  else if (t < -Math.PI / 2) { t += Math.PI; sign = -1; }
  // Rotate (1,0) by t → (cos t, sin t).
  const [c, s] = cordicRotMode(1, 0, t, niter, gain);
  return [sign * s, sign * c];
}

/** cordiccos(theta[,niter]) — cosine via circular CORDIC. */
async function cordiccos(args: Value[]): Promise<Value[]> {
  const T = m(args[0]);
  const niter = args.length > 1 ? Math.max(1, Math.round(asScalar(m(args[1])))) : DEFAULT_NITER;
  const gain = circularGain(niter);
  const out = zeros(T.rows, T.cols);
  for (let i = 0; i < T.data.length; i++) out.data[i] = cordicSinCosScalar(T.data[i], niter, gain)[1];
  return [out];
}

/** cordicsin(theta[,niter]) — sine via circular CORDIC. */
async function cordicsin(args: Value[]): Promise<Value[]> {
  const T = m(args[0]);
  const niter = args.length > 1 ? Math.max(1, Math.round(asScalar(m(args[1])))) : DEFAULT_NITER;
  const gain = circularGain(niter);
  const out = zeros(T.rows, T.cols);
  for (let i = 0; i < T.data.length; i++) out.data[i] = cordicSinCosScalar(T.data[i], niter, gain)[0];
  return [out];
}

/** cordicsincos(theta[,niter]) → [sin, cos] computed together. */
async function cordicsincos(args: Value[]): Promise<Value[]> {
  const T = m(args[0]);
  const niter = args.length > 1 ? Math.max(1, Math.round(asScalar(m(args[1])))) : DEFAULT_NITER;
  const gain = circularGain(niter);
  const S = zeros(T.rows, T.cols), C = zeros(T.rows, T.cols);
  for (let i = 0; i < T.data.length; i++) {
    const [s, c] = cordicSinCosScalar(T.data[i], niter, gain);
    S.data[i] = s; C.data[i] = c;
  }
  return [S, C];
}

/** cordiccart2pol(x, y[,niter]) → [theta, r]. Circular CORDIC vectoring drives y→0; the
 *  accumulated angle is the phase and the residual magnitude (gain-corrected) is the radius.
 *  Full-plane coverage via a pre-rotation by ±π when x<0 (atan2 quadrant fold). */
function cordicCart2PolScalar(x0: number, y0: number, niter: number, gain: number): [number, number] {
  let x = x0, y = y0, off = 0;
  if (x < 0) {
    // Pre-rotate by ±pi so the vector lands in the right half-plane (convergence range).
    if (y >= 0) { x = -x; y = -y; off = Math.PI; }
    else { x = -x; y = -y; off = -Math.PI; }
  }
  let z = 0;
  for (let k = 0; k < niter; k++) {
    const d = y >= 0 ? -1 : 1;             // drive y toward 0
    const f = d * Math.pow(2, -k);
    const xn = x - f * y, yn = y + f * x;
    x = xn; y = yn;
    z -= d * Math.atan(Math.pow(2, -k));
  }
  // z accumulates the original phase (vectoring drives y→0); add the quadrant offset.
  return [z + off, x * gain];
}

async function cordiccart2pol(args: Value[]): Promise<Value[]> {
  const X = m(args[0]), Y = m(args[1]);
  const niter = args.length > 2 ? Math.max(1, Math.round(asScalar(m(args[2])))) : DEFAULT_NITER;
  const gain = circularGain(niter);
  const big = X.data.length >= Y.data.length ? X : Y;
  const n = big.data.length;
  const TH = zeros(big.rows, big.cols), R = zeros(big.rows, big.cols);
  for (let i = 0; i < n; i++) {
    const xv = X.data.length === 1 ? X.data[0] : X.data[i];
    const yv = Y.data.length === 1 ? Y.data[0] : Y.data[i];
    const [th, r] = cordicCart2PolScalar(xv, yv, niter, gain);
    TH.data[i] = th; R.data[i] = r;
  }
  return [TH, R];
}

/** cordicpol2cart(theta, r[,niter]) → [x, y] = (r·cos theta, r·sin theta) via circular CORDIC
 *  rotation of the vector (r, 0) by theta (reduced into [-pi/2, pi/2] with 180° sign-folding). */
async function cordicpol2cart(args: Value[]): Promise<Value[]> {
  const TH = m(args[0]), R = m(args[1]);
  const niter = args.length > 2 ? Math.max(1, Math.round(asScalar(m(args[2])))) : DEFAULT_NITER;
  const gain = circularGain(niter);
  const big = TH.data.length >= R.data.length ? TH : R;
  const n = big.data.length;
  const X = zeros(big.rows, big.cols), Y = zeros(big.rows, big.cols);
  for (let i = 0; i < n; i++) {
    const tv = TH.data.length === 1 ? TH.data[0] : TH.data[i];
    const rv = R.data.length === 1 ? R.data[0] : R.data[i];
    // Fold theta into [-pi/2, pi/2]; sign flips both components.
    let t = tv - 2 * Math.PI * Math.round(tv / (2 * Math.PI)), sign = 1;
    if (t > Math.PI / 2) { t -= Math.PI; sign = -1; }
    else if (t < -Math.PI / 2) { t += Math.PI; sign = -1; }
    const [x, y] = cordicRotMode(rv, 0, t, niter, gain);
    X.data[i] = sign * x; Y.data[i] = sign * y;
  }
  return [X, Y];
}

export const FIXEDPOINT: ToolboxModule = {
  id: 'fixedpoint',
  name: 'Fixed-Point Designer',
  docBase: 'https://www.mathworks.com/help/fixedpoint/',
  builtins: {
    fi,
    numerictype,
    fimath,
    quantizer,
    quantize: quantize_fn,
    num2bin,
    bin2num,
    fipref,
    fixdt,
    accumneg,
    cordicsqrt,
    cordicrotate,
    cordicqr,
    cordiccos,
    cordicsin,
    cordicsincos,
    cordiccart2pol,
    cordicpol2cart,
  },
  help: HELP_FIXEDPOINT,
};
