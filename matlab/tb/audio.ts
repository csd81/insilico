import type { Builtin } from '../builtins';
import { type Value, type Mat, toArray, scalar, rowVec, colVec, toMat as m, isMat, asScalar, asString } from '../values';
import type { ToolboxModule } from './types';
import { HELP_AUDIO } from '../help/toolbox-help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

// ---- scalar kernels (transcribed verbatim from MATLAB R2026a .m sources) ----

// hz2bark.m:  bark = 26.81*hz./(1960+hz) - 0.53; then piecewise correction.
function hz2barkScalar(hz: number): number {
  let bark = (26.81 * hz) / (1960 + hz) - 0.53;
  if (bark < 2) bark = 0.85 * bark + 0.3;
  else if (bark > 20.1) bark = 1.22 * bark - 4.422;
  return bark;
}

// bark2hz.m:  inverse piecewise correction, then hz = 1960*(bark+0.53)./(26.28 - bark).
function bark2hzScalar(bark: number): number {
  let b = bark;
  if (b < 2) b = (b - 0.3) / 0.85;
  else if (b > 20.1) b = (b + 0.22 * 20.1) / 1.22;
  return (1960 * (b + 0.53)) / (26.28 - b);
}

// hz2mel.m (default MelStyle "oshaughnessy"):  mel = 2595*log10(1 + hz/700).
function hz2melScalar(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

// mel2hz.m (default "oshaughnessy"):  hz = 700*(10.^(mel/2595) - 1).
function mel2hzScalar(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

// hz2erb.m / erb2hz.m:  A = log(10)*1000/(24.673*4.368).
const ERB_A = (Math.log(10) * 1000) / (24.673 * 4.368);
function hz2erbScalar(hz: number): number {
  return ERB_A * Math.log10(1 + 0.004368 * hz);
}
function erb2hzScalar(erb: number): number {
  return (Math.pow(10, erb / ERB_A) - 1) / 0.004368;
}

// phon2sone.m (default standard "ISO 532-1"):
//   sone = (phon/40).^(1/.35)  for phon < 40;  2.^(phon/10-4) otherwise.
function phon2soneScalar(phon: number): number {
  if (phon < 40) return Math.pow(phon / 40, 1 / 0.35);
  return Math.pow(2, phon / 10 - 4);
}

// sone2phon.m (default standard "ISO 532-1"):
//   phon = 40*sone.^.35  for sone < 1;  40 + 10*log2(sone) otherwise.
function sone2phonScalar(sone: number): number {
  if (sone < 1) return 40 * Math.pow(sone, 0.35);
  return 40 + 10 * Math.log2(sone);
}

// octavebw2bw.m / bw2octavebw.m  (closed form, analog domain).
//   An N-octave band centered at Fc has cutoffs [Fc*2^(-N/2); Fc*2^(N/2)].
//   octavebw2bw returns the analog cutoffs as a 2-by-K matrix (columns = bands).
//   Verified vs MATLAB R2026a: octavebw2bw(1,1000) -> [707.1067811865; 1414.2135623731].
function octavebw2bw(a: Value[]): Promise<Value[]> {
  const N = toArray(m(a[0]));
  const Fc = toArray(m(a[1]));
  const K = Math.max(N.length, Fc.length);
  const out = zeros2(2, K);
  for (let k = 0; k < K; k++) {
    const n = N.length === 1 ? N[0] : N[k];
    const fc = Fc.length === 1 ? Fc[0] : Fc[k];
    out[0 + k * 2] = fc * Math.pow(2, -n / 2);   // low cutoff
    out[1 + k * 2] = fc * Math.pow(2, n / 2);     // high cutoff
  }
  return ret({ kind: 'num', rows: 2, cols: K, data: Float64Array.from(out) } as Mat);
}

// bw2octavebw.m (analog): inverse of octavebw2bw.
//   Given cutoffs [Flo; Fhi]: N = log2(Fhi/Flo), Fc = sqrt(Flo*Fhi).
//   Input is a 1-by-2 row [Flo Fhi] or a 2-by-K matrix of cutoff columns.
//   nargout>=2 also returns the (analog) center frequency as a row vector.
function bw2octavebw(a: Value[], nargout: number): Promise<Value[]> {
  const M = m(a[0]);
  let lo: number[]; let hi: number[];
  if (M.rows === 1 && M.cols === 2) { lo = [M.data[0]]; hi = [M.data[1]]; }
  else { const K = M.cols; lo = []; hi = []; for (let k = 0; k < K; k++) { lo.push(M.data[0 + k * 2]); hi.push(M.data[1 + k * 2]); } }
  const Nrow = lo.map((l, i) => Math.log2(hi[i] / l));
  const Fcrow = lo.map((l, i) => Math.sqrt(l * hi[i]));
  const Nout = Nrow.length === 1 ? scalar(Nrow[0]) : rowVec(Nrow);
  if (nargout >= 2) return Promise.resolve([Nout, Nrow.length === 1 ? scalar(Fcrow[0]) : rowVec(Fcrow)]);
  return ret(Nout);
}

// helper: column-major zero buffer of length rows*cols
function zeros2(rows: number, cols: number): number[] { return new Array(rows * cols).fill(0); }

// elementwise helper: preserve row/col orientation, return scalar for 1x1.
function elementwise(a: Value[], f: (x: number) => number): Promise<Value[]> {
  const M: Mat = m(a[0]);
  const out = toArray(M).map(f);
  if (out.length === 1) return ret(scalar(out[0]));
  return ret(M.rows === 1 ? rowVec(out) : colVec(out));
}

// dBov.m (default ClippingMagnitude=1):
//   Lmean = 10*log10(sum(x.^2,1)./(size(x,1).*1.^2));  -> a 1-by-cols row reduction.
// Optionally also returns Lmax = 20*log10(max(abs(x),[],1)).
function dBov(a: Value[], nargout: number): Promise<Value[]> {
  const M: Mat = m(a[0]);
  const rows = M.rows;
  const cols = M.cols;
  const d = M.data;
  const meanArr: number[] = new Array(cols);
  const maxArr: number[] = new Array(cols);
  for (let c = 0; c < cols; c++) {
    let ss = 0;
    let mx = 0;
    for (let r = 0; r < rows; r++) {
      const v = d[r + c * rows];
      ss += v * v;
      const av = Math.abs(v);
      if (av > mx) mx = av;
    }
    meanArr[c] = 10 * Math.log10(ss / rows);
    maxArr[c] = 20 * Math.log10(mx);
  }
  const mkRow = (arr: number[]): Value => (arr.length === 1 ? scalar(arr[0]) : rowVec(arr));
  if (nargout >= 2) return Promise.resolve([mkRow(meanArr), mkRow(maxArr)]);
  return ret(mkRow(meanArr));
}

// mls.m — maximum length sequence (deterministic ±gain LFSR sequence of length 2^n-1).
//   Ported verbatim from MATLAB R2026a. The only non-obvious part is the *initial*
//   shift-register state: mls() seeds it from a fresh RandStream('mt19937ar') via
//   randi(s,[0 1],1,mlsRegWidth). A freshly-default mt19937ar stream is deterministic,
//   so randi([0 1],1,n) is a fixed prefix of bits — captured here verbatim from
//   `s=RandStream('mt19937ar'); randi(s,[0 1],1,40)` (R2026a). This makes mls fully
//   deterministic and reproducible, matching the live oracle bit-for-bit.
const MLS_REGISTER_PREFIX = '1101100111011010011110111110101000011010'
  .split('').map((c) => Number(c));   // length 40 (orders 2..40)

// primitive binary polynomial coefficients (W. Stahnke 1973), degrees 2..40.
const MLS_PRIMPOLY: Record<number, number[]> = {
  2: [2, 1, 0], 3: [3, 1, 0], 4: [4, 1, 0], 5: [5, 2, 0], 6: [6, 1, 0],
  7: [7, 1, 0], 8: [8, 6, 5, 1, 0], 9: [9, 4, 0], 10: [10, 3, 0], 11: [11, 2, 0],
  12: [12, 7, 4, 3, 0], 13: [13, 4, 3, 1, 0], 14: [14, 12, 11, 1, 0], 15: [15, 1, 0],
  16: [16, 5, 3, 2, 0], 17: [17, 3, 0], 18: [18, 7, 0], 19: [19, 6, 5, 1, 0],
  20: [20, 3, 0], 21: [21, 2, 0], 22: [22, 1, 0], 23: [23, 5, 0], 24: [24, 4, 3, 1, 0],
  25: [25, 3, 0], 26: [26, 8, 7, 1, 0], 27: [27, 8, 7, 1, 0], 28: [28, 3, 0],
  29: [29, 2, 0], 30: [30, 16, 15, 1, 0], 31: [31, 3, 0], 32: [32, 28, 27, 1, 0],
  33: [33, 13, 0], 34: [34, 15, 14, 1, 0], 35: [35, 2, 0], 36: [36, 11, 0],
  37: [37, 12, 10, 2, 0], 38: [38, 6, 5, 1, 0], 39: [39, 4, 0], 40: [40, 21, 19, 2, 0],
};

function mls(a: Value[]): Promise<Value[]> {
  // arguments: mls(mlsLength=2^15-1, 'ExcitationLevel', -6)
  let mlsLength = a.length >= 1 && isMat(a[0]) && !(a[0] as Mat).isChar
    ? Math.round(asScalar(a[0])) : 2 ** 15 - 1;
  let excitationLevel = -6;
  for (let i = 1; i + 1 < a.length; i += 2) {
    const key = asString(a[i]).toLowerCase();
    if ('excitationlevel'.startsWith(key)) excitationLevel = asScalar(a[i + 1]);
  }
  // mlsRegWidth = ceil(log2(mlsLength+1)); resulting length = 2^width - 1.
  const mlsRegWidth = Math.ceil(Math.log2(mlsLength + 1));
  mlsLength = 2 ** mlsRegWidth - 1;
  const register = MLS_REGISTER_PREFIX.slice(0, mlsRegWidth);
  const primPoly = MLS_PRIMPOLY[mlsRegWidth];
  // db2mag(x) = 10^(x/20)
  const dbLevel = Math.pow(10, excitationLevel / 20);
  const exc = new Float64Array(mlsLength);
  let regIdx = 0; // 0-based (MATLAB regIdx-1)
  for (let idx = 0; idx < mlsLength; idx++) {
    let feedbackBit = register[regIdx];
    for (let jdx = primPoly.length - 2; jdx >= 1; jdx--) {
      const tapIdx = mlsRegWidth - primPoly[jdx];
      // MATLAB: regPos = mod(regIdx-tapIdx-1, mlsRegWidth)+1 (1-based);
      // here regIdx is already 0-based, so regPos0 = mod(regIdx-tapIdx, width).
      const regPos = (((regIdx - tapIdx) % mlsRegWidth) + mlsRegWidth) % mlsRegWidth;
      feedbackBit = (feedbackBit + register[regPos]) % 2; // xor
    }
    register[regIdx] = feedbackBit;
    regIdx = regIdx < mlsRegWidth - 1 ? regIdx + 1 : 0;
    exc[idx] = dbLevel * (-2 * feedbackBit + 1);
  }
  return ret({ kind: 'num', rows: mlsLength, cols: 1, data: exc } as Mat);
}

export const AUDIO: ToolboxModule = {
  id: 'audio',
  name: 'Audio Toolbox',
  docBase: 'https://www.mathworks.com/help/audio/ref/',
  builtins: {
    hz2bark: (a) => elementwise(a, hz2barkScalar),
    bark2hz: (a) => elementwise(a, bark2hzScalar),
    hz2mel: (a) => elementwise(a, hz2melScalar),
    mel2hz: (a) => elementwise(a, mel2hzScalar),
    hz2erb: (a) => elementwise(a, hz2erbScalar),
    erb2hz: (a) => elementwise(a, erb2hzScalar),
    dBov: (a, nargout) => dBov(a, nargout),
    phon2sone: (a) => elementwise(a, phon2soneScalar),
    sone2phon: (a) => elementwise(a, sone2phonScalar),
    octavebw2bw: (a) => octavebw2bw(a),
    bw2octavebw: (a, nargout) => bw2octavebw(a, nargout),
    mls: (a) => mls(a),
  },
  help: HELP_AUDIO,
};
