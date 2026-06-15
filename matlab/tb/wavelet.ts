// Wavelet Toolbox — computable subset: DCT-II (orthonormal, MATLAB-compatible) and the discrete
// wavelet transform (Haar + Daubechies db2/db4) with periodic extension, single- and multi-level.
// dct/idct match MATLAB exactly; the DWT pair is orthonormal so perfect reconstruction holds and
// Haar matches hand calculation. See plan §7 and tb/wavelet.VALIDATION.md.
import type { Builtin } from '../builtins';
import {
  type Value, rowVec, colVec, scalar, toArray, asString, asScalar, toMat as m, type Mat, isMat, isCell, makeCell, mat,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_WAVELET } from '../help/toolbox-help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);
const asRow = (src: Mat, xs: number[]) => (src.rows === 1 ? rowVec(xs) : colVec(xs));

// ── DCT-II / III (orthonormal, matches MATLAB dct/idct) ──
function dctII(x: number[]): number[] {
  const N = x.length, y = new Array(N).fill(0);
  for (let k = 0; k < N; k++) { let s = 0; for (let n = 0; n < N; n++) s += x[n] * Math.cos((Math.PI * (2 * n + 1) * k) / (2 * N)); y[k] = (k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N)) * s; }
  return y;
}
function idctII(y: number[]): number[] {
  const N = y.length, x = new Array(N).fill(0);
  for (let n = 0; n < N; n++) { let s = 0; for (let k = 0; k < N; k++) { const w = k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N); s += w * y[k] * Math.cos((Math.PI * (2 * n + 1) * k) / (2 * N)); } x[n] = s; }
  return x;
}

// ── DWT filter banks (orthonormal analysis low-pass; high-pass via QMF) ──
const SQRT2 = Math.SQRT2;
const WAVELETS: Record<string, number[]> = {
  haar: [1 / SQRT2, 1 / SQRT2],
  db1: [1 / SQRT2, 1 / SQRT2],
  db2: [(1 + Math.sqrt(3)) / (4 * SQRT2), (3 + Math.sqrt(3)) / (4 * SQRT2), (3 - Math.sqrt(3)) / (4 * SQRT2), (1 - Math.sqrt(3)) / (4 * SQRT2)],
};
/** QMF high-pass analysis filter from the low-pass: g[k] = (-1)^k · h[L-1-k]. */
function qmf(lo: number[]): number[] { const L = lo.length; return lo.map((_, k) => (k % 2 === 0 ? 1 : -1) * lo[L - 1 - k]); }
const wfilters = (name: string) => { const lo = WAVELETS[name.toLowerCase()]; if (!lo) throw new Error(`unsupported wavelet '${name}'`); return { lo, hi: qmf(lo) }; };

/** Single-level DWT with periodic ('per') extension → {cA, cD}, each length ceil(N/2).
 *  cA[k] = Σ_j lo[j]·x[(2k+j) mod N]; Haar then gives the standard (x₂ₖ,x₂ₖ₊₁) pairing. */
function dwt1(x: number[], lo: number[], hi: number[]): { cA: number[]; cD: number[] } {
  const N = x.length, L = lo.length, half = Math.ceil(N / 2);
  const cA = new Array(half).fill(0), cD = new Array(half).fill(0);
  for (let k = 0; k < half; k++) for (let j = 0; j < L; j++) { const idx = (2 * k + j) % N; cA[k] += lo[j] * x[idx]; cD[k] += hi[j] * x[idx]; }
  return { cA, cD };
}
/** Single-level inverse DWT (periodic) = transpose of the orthonormal analysis → length 2·len(cA). */
function idwt1(cA: number[], cD: number[], lo: number[], hi: number[]): number[] {
  const half = cA.length, N = 2 * half, L = lo.length, x = new Array(N).fill(0);
  for (let k = 0; k < half; k++) for (let j = 0; j < L; j++) { const idx = (2 * k + j) % N; x[idx] += lo[j] * cA[k] + hi[j] * cD[k]; }
  return x;
}
// ── Kingsbury Q-shift filters (qorthwavf) ──
// Base LoDa coefficient vectors keyed by tap-count `num`. Source: MATLAB R2026a `type qorthwavf`.
const QSHIFT_LODA: Record<number, number[]> = {
  6: [0.035163836571495, 0, -0.088329424451073, 0.233890320607236, 0.760272369066126, 0.587518297723560, 0, -0.114301837144249, 0, 0],
  10: [0.051130405283832, -0.013975370246889, -0.109836051665971, 0.263839561058938, 0.766628467793037, 0.563655710127052, 0.000873622695217, -0.100231219507476, -0.001689681272528, -0.006181881892116],
  14: [0.003253142763653, -0.003883211999158, 0.034660346844853, -0.038872801268828, -0.117203887699115, 0.275295384668882, 0.756145643892522, 0.568810420712123, 0.011866092033797, -0.106711804686665, 0.023825384794920, 0.017025223881554, -0.005439475937274, -0.004556895628475],
  16: [-0.004761611938456, -0.000446022789262, -0.000071441973280, 0.034914612306842, -0.037273895799898, -0.115911457427441, 0.276368643133032, 0.756393765199037, 0.567134484100133, 0.014637405964473, -0.112558884257522, 0.022289263266923, 0.018498682724156, -0.007202677878258, -0.000227652205898, 0.002430349945149],
  18: [-0.002284127440271, 0.001209894163073, -0.011834794515431, 0.001283456999344, 0.044365221606617, -0.053276108803047, -0.113305886362143, 0.280902863222186, 0.752816038087856, 0.565808067396459, 0.024550152433667, -0.120188544710795, 0.018156493945546, 0.031526377122085, -0.006628794612430, -0.002576174306601, 0.001277558653807, 0.002411869456666],
};
const flipArr = (v: number[]) => v.slice().reverse();
/** [LoDa..HiRb] = qorthwavf(num). LoDb=flip(LoDa); HiDa=(-1)^na·flip(LoDa), HiDb=(-1)^nb·flip(LoDb)
 *  with na=(0:9)/nb=(1:10) for num==6 else na=(0:num-1)/nb=(1:num). */
function qorthwavfFilters(num: number): number[][] {
  const LoDa = QSHIFT_LODA[num];
  if (!LoDa) throw new Error(`qorthwavf: unsupported Q-shift order ${num} (use 6,10,14,16,18)`);
  const LoDb = flipArr(LoDa);
  // na=(0:len-1), nb=(1:len) in both the num==6 (len=10) and general cases.
  const flipLoDa = flipArr(LoDa), flipLoDb = flipArr(LoDb);
  const HiDa = flipLoDa.map((x, i) => (i % 2 === 0 ? 1 : -1) * x);       // (-1)^i, i from 0
  const HiDb = flipLoDb.map((x, i) => ((i + 1) % 2 === 0 ? 1 : -1) * x); // (-1)^(i+1)
  const LoRa = LoDb, LoRb = LoDa, HiRa = HiDb, HiRb = HiDa;
  return [LoDa, LoDb, HiDa, HiDb, LoRa, LoRb, HiRa, HiRb];
}

// ── Biorthogonal scaling filters (biorwavf) ──
// Returns [Rf, Df] reconstruction/decomposition filters for 'biorNr.Nd'. Source: `type biorwavf`.
function biorwavfRfDf(wname: string): { Rf: number[]; Df: number[] } {
  const dot = wname.indexOf('.');
  if (dot < 0) throw new Error(`biorwavf: invalid name '${wname}'`);
  const Nd = parseInt(wname.slice(dot + 1), 10);
  let i = dot; while (i > 0 && wname.charCodeAt(i - 1) > 47 && wname.charCodeAt(i - 1) < 58) i--;
  const Nr = parseInt(wname.slice(i, dot), 10);
  const sym = (half: number[], center?: number): number[] => center === undefined
    ? half.concat(flipArr(half))
    : half.concat([center], flipArr(half));
  let Rf: number[]; let Df: number[];
  if (Nr === 1) {
    Rf = sym([1 / 2]);
    if (Nd === 1) Df = [1 / 2];
    else if (Nd === 3) Df = [-1 / 16, 1 / 16, 1 / 2];
    else if (Nd === 5) Df = [3 / 256, -3 / 256, -11 / 128, 11 / 128, 1 / 2];
    else throw new Error(`biorwavf: bad order bior1.${Nd}`);
    Df = sym(Df);
  } else if (Nr === 2) {
    Rf = [1 / 4, 1 / 2, 1 / 4];
    if (Nd === 2) Df = sym([-1 / 8, 1 / 4], 3 / 4);
    else if (Nd === 4) Df = sym([3 / 128, -3 / 64, -1 / 8, 19 / 64], 45 / 64);
    else if (Nd === 6) Df = sym([-5 / 1024, 5 / 512, 17 / 512, -39 / 512, -123 / 1024, 81 / 256], 175 / 256);
    else if (Nd === 8) Df = sym([35, -70, -300, 670, 1228, -3126, -3796, 10718], 22050).map((v) => v / 32768);
    else throw new Error(`biorwavf: bad order bior2.${Nd}`);
  } else if (Nr === 3) {
    Rf = sym([1 / 8, 3 / 8]);
    if (Nd === 1) Df = [-1, 3].map((v) => v / 4);
    else if (Nd === 3) Df = [3, -9, -7, 45].map((v) => v / 64);
    else if (Nd === 5) Df = [-5, 15, 19, -97, -26, 350].map((v) => v / 512);
    else if (Nd === 7) Df = [35, -105, -195, 865, 363, -3489, -307, 11025].map((v) => v / 16384);
    else if (Nd === 9) Df = [-63, 189, 469, -1911, -1308, 9188, 1140, -29676, 190, 87318].map((v) => v / 131072);
    else throw new Error(`biorwavf: bad order bior3.${Nd}`);
    Df = sym(Df);
  } else if (Nr === 4 && Nd === 4) {
    Rf = sym([-0.045635881557, -0.028771763114, 0.295635881557], 0.557543526229);
    Df = sym([0.026748757411, -0.016864118443, -0.078223266529, 0.266864118443], 0.602949018236);
  } else if (Nr === 5 && Nd === 5) {
    Rf = sym([0.009515330511, -0.001905629356, -0.096666153049, -0.066117805605, 0.337150822538], 0.636046869922);
    Df = sym([0.028063009296, 0.005620161515, -0.038511714155, 0.244379838485], 0.520897409718);
  } else if (Nr === 6 && Nd === 8) {
    Rf = sym([-0.01020092218704, -0.01023007081937, 0.05566486077996, 0.02854447171515, -0.29546393859292], -0.53662880179157);
    Df = sym([0.00134974786501, -0.00135360470301, -0.01201419666708, 0.00843901203981, 0.03516647330654, -0.05463331368252, -0.06650990062484, 0.29754790634571], 0.58401575224075);
  } else {
    throw new Error(`biorwavf: unsupported wavelet '${wname}'`);
  }
  return { Rf, Df };
}

// ── orthfilt: build the orthogonal 4-filter bank from a scaling vector W ──
const qmfP0 = (lo: number[]): number[] => { const y = flipArr(lo); for (let i = 1; i < y.length; i += 2) y[i] = -y[i]; return y; };
function orthfiltBank(W: number[]): { LoD: number[]; HiD: number[]; LoR: number[]; HiR: number[] } {
  const s = W.reduce((a, b) => a + b, 0);
  const Wn = W.map((v) => v / s);
  const LoR = Wn.map((v) => SQRT2 * v);
  const HiR = qmfP0(LoR);
  const HiD = flipArr(HiR);
  const LoD = flipArr(LoR);
  return { LoD, HiD, LoR, HiR };
}

// ── biorfilt: orthogonal-style filters from a (Df,Rf) biorthogonal pair (nargin==2 form) ──
function biorfiltBank(Df: number[], Rf: number[]): { LoD: number[]; HiD: number[]; LoR: number[]; HiR: number[] } {
  const lr = Rf.length, ld = Df.length;
  let lmax = Math.max(lr, ld);
  if (lmax % 2 === 1) lmax += 1;
  const pad = (v: number[], l: number) => {
    const left = Math.floor((lmax - l) / 2), right = Math.ceil((lmax - l) / 2);
    return new Array(left).fill(0).concat(v, new Array(right).fill(0));
  };
  const Rext = pad(Rf, lr), Dext = pad(Df, ld);
  const o1 = orthfiltBank(Dext); // [Lo_D1,Hi_D1,Lo_R1,Hi_R1]
  const o2 = orthfiltBank(Rext); // [Lo_D2,Hi_D2,Lo_R2,Hi_R2]
  return { LoD: o1.LoD, HiD: o2.HiD, LoR: o2.LoR, HiR: o1.HiR };
}

// ── 2-D Haar inverse lifting (ihaart2 → ihlwt2), ported from MATLAB R2026a ──
// Tiny column-major dense-matrix helpers (MATLAB 2-D, real).
interface M2 { r: number; c: number; d: Float64Array; }
const M = (r: number, c: number, fill = 0): M2 => { const d = new Float64Array(r * c); if (fill) d.fill(fill); return { r, c, d }; };
const G = (a: M2, i: number, j: number) => a.d[i + j * a.r];          // 0-based (row,col)
const S = (a: M2, i: number, j: number, v: number) => { a.d[i + j * a.r] = v; };
const toM2 = (v: Value): M2 => { const x = m(v); return { r: x.rows, c: x.cols, d: Float64Array.from(x.data) }; };
const fromM2 = (a: M2): Mat => mat(a.r, a.c, a.d);
/** Take every-other ROW starting at `start` (0-based step 2). */
const rowsStride = (a: M2, start: number): M2 => { const r = Math.ceil((a.r - start) / 2); const o = M(r, a.c); for (let j = 0; j < a.c; j++) for (let i = 0; i < r; i++) S(o, i, j, G(a, start + 2 * i, j)); return o; };
/** Take every-other COLUMN starting at `start`. */
const colsStride = (a: M2, start: number): M2 => { const c = Math.ceil((a.c - start) / 2); const o = M(a.r, c); for (let j = 0; j < c; j++) for (let i = 0; i < a.r; i++) S(o, i, j, G(a, i, start + 2 * j)); return o; };
/** Vertical concat [top; bottom]. */
const vcat = (top: M2, bot: M2): M2 => { const o = M(top.r + bot.r, top.c); for (let j = 0; j < top.c; j++) { for (let i = 0; i < top.r; i++) S(o, i, j, G(top, i, j)); for (let i = 0; i < bot.r; i++) S(o, top.r + i, j, G(bot, i, j)); } return o; };
const ew = (a: M2, b: M2, f: (x: number, y: number) => number): M2 => { const o = M(a.r, a.c); for (let k = 0; k < o.d.length; k++) o.d[k] = f(a.d[k], b.d[k]); return o; };
const sm = (a: M2, f: (x: number) => number): M2 => { const o = M(a.r, a.c); for (let k = 0; k < o.d.length; k++) o.d[k] = f(a.d[k]); return o; };
const padCol = (a: M2): M2 => { const o = M(a.r, a.c + 1); o.d.set(a.d); return o; };  // append a zero column
const padRow = (a: M2): M2 => { const o = M(a.r + 1, a.c); for (let j = 0; j < a.c; j++) for (let i = 0; i < a.r; i++) S(o, i, j, G(a, i, j)); return o; };
const dropLastCol = (a: M2): M2 => { const o = M(a.r, a.c - 1); for (let j = 0; j < o.c; j++) for (let i = 0; i < a.r; i++) S(o, i, j, G(a, i, j)); return o; };
const dropLastRow = (a: M2): M2 => { const o = M(a.r - 1, a.c); for (let j = 0; j < a.c; j++) for (let i = 0; i < o.r; i++) S(o, i, j, G(a, i, j)); return o; };

/** Single-level inverse Haar lifting reconstruction (ihlwt2). integerflag → integer scheme. */
function ihlwt2(a: M2, hin: M2, vin: M2, din: M2, integerflag: boolean): M2 {
  const oddCol = din.c < a.c;
  let tempd = oddCol ? padCol(din) : din;
  let tempv = oddCol ? padCol(vin) : vin;
  const oddRow = din.r < a.r;
  let temph: M2; let tempd_final: M2;
  if (oddRow) { tempd_final = padRow(tempd); temph = padRow(hin); } else { tempd_final = tempd; temph = hin; }
  let h = temph; let v = tempv; let d = tempd_final; let aa = a;
  const fix = (x: number) => Math.trunc(x);
  // Reverse lifting (rows split L/H).
  if (!integerflag) {
    aa = sm(aa, (x) => x / 2);
    d = sm(d, (x) => 2 * x);
    v = ew(v, d, (vv, dd) => vv - dd / 2);
  } else {
    v = ew(v, d, (vv, dd) => vv - fix(dd / 2));
  }
  d = ew(v, d, (vv, dd) => vv + dd);
  // Merge rows of v (odd) and d (even) → H.
  let H = M(v.r + d.r, v.c);
  for (let j = 0; j < v.c; j++) { for (let i = 0; i < v.r; i++) S(H, 2 * i, j, G(v, i, j)); for (let i = 0; i < d.r; i++) S(H, 2 * i + 1, j, G(d, i, j)); }
  if (!integerflag) aa = ew(aa, h, (av, hv) => av - hv / 2);
  else aa = ew(aa, h, (av, hv) => av - fix(hv / 2));
  h = ew(aa, h, (av, hv) => av + hv);
  let L = M(aa.r + h.r, aa.c);
  for (let j = 0; j < aa.c; j++) { for (let i = 0; i < aa.r; i++) S(L, 2 * i, j, G(aa, i, j)); for (let i = 0; i < h.r; i++) S(L, 2 * i + 1, j, G(h, i, j)); }
  if (!integerflag) L = ew(L, H, (lv, hv) => lv - hv / 2);
  else L = ew(L, H, (lv, hv) => lv - fix(hv / 2));
  H = ew(L, H, (lv, hv) => lv + hv);
  // Merge columns of L (odd) and H (even) → x.
  let x = M(L.r, L.c + H.c);
  for (let j = 0; j < L.c; j++) for (let i = 0; i < L.r; i++) S(x, i, 2 * j, G(L, i, j));
  for (let j = 0; j < H.c; j++) for (let i = 0; i < H.r; i++) S(x, i, 2 * j + 1, G(H, i, j));
  if (oddCol) x = dropLastCol(x);
  if (oddRow) x = dropLastRow(x);
  return x;
}

/** Normalized Haar analysis/synthesis steps (for haart/ihaart). */
function haarStep(x: number[]): { cA: number[]; cD: number[] } { const h = Math.floor(x.length / 2), cA: number[] = [], cD: number[] = []; for (let k = 0; k < h; k++) { cA.push((x[2 * k] + x[2 * k + 1]) / SQRT2); cD.push((x[2 * k] - x[2 * k + 1]) / SQRT2); } return { cA, cD }; }
function invHaarStep(cA: number[], cD: number[]): number[] { const x = new Array(cA.length * 2); for (let k = 0; k < cA.length; k++) { x[2 * k] = (cA[k] + cD[k]) / SQRT2; x[2 * k + 1] = (cA[k] - cD[k]) / SQRT2; } return x; }

export const WAVELET: ToolboxModule = {
  id: 'wavelet',
  name: 'Wavelet Toolbox',
  docBase: 'https://www.mathworks.com/help/wavelet/ref/',
  builtins: {
    dct: (a) => { const x = m(a[0]); return ret(asRow(x, dctII(toArray(x)))); },
    idct: (a) => { const y = m(a[0]); return ret(asRow(y, idctII(toArray(y)))); },
    dwt: (a, nargout) => { const x = m(a[0]); const { lo, hi } = wfilters(a.length >= 2 ? asString(a[1]) : 'haar'); const { cA, cD } = dwt1(toArray(x), lo, hi); return nargout >= 2 ? Promise.resolve([asRow(x, cA), asRow(x, cD)]) : ret(asRow(x, cA.concat(cD))); },
    idwt: (a) => { const cA = toArray(m(a[0])), cD = toArray(m(a[1])); const { lo, hi } = wfilters(a.length >= 3 ? asString(a[2]) : 'haar'); return ret(asRow(m(a[0]), idwt1(cA, cD, lo, hi))); },
    /** [C,L] = wavedec(x,n,wname) — multilevel decomposition (C = [cA_n cD_n … cD_1], L = lengths). */
    wavedec: (a, nargout) => {
      const x = toArray(m(a[0])); const n = Math.round(asScalar(a[1])); const { lo, hi } = wfilters(a.length >= 3 ? asString(a[2]) : 'haar');
      let cur = x; const dets: number[][] = []; const lens: number[] = [];
      for (let i = 0; i < n; i++) { const { cA, cD } = dwt1(cur, lo, hi); dets.unshift(cD); cur = cA; }
      const C = cur.concat(...dets); const L = [cur.length, ...dets.map((d) => d.length), x.length];
      lens.push(...L);
      return nargout >= 2 ? Promise.resolve([rowVec(C), rowVec(lens)]) : ret(rowVec(C));
    },
    /** waverec(C,L,wname) — inverse of wavedec. */
    waverec: (a) => {
      const C = toArray(m(a[0])); const L = toArray(m(a[1])).map((v) => Math.round(v)); const { lo, hi } = wfilters(a.length >= 3 ? asString(a[2]) : 'haar');
      const n = L.length - 2; let off = L[0]; let cur = C.slice(0, off);
      for (let i = 0; i < n; i++) { const dl = L[i + 1]; const cD = C.slice(off, off + dl); off += dl; cur = idwt1(cur, cD, lo, hi); }
      return ret(rowVec(cur));
    },
    /** [a,d] = haart(x[,level]) — Haar wavelet transform. a = approximation; d = detail (cell if multilevel). */
    haart: (a, nargout) => {
      const x = toArray(m(a[0])); const maxL = Math.floor(Math.log2(x.length));
      const level = a.length >= 2 && isMat(a[1]) ? Math.round(asScalar(a[1])) : maxL;
      let cur = x; const dets: number[][] = [];
      for (let i = 0; i < level; i++) { const { cA, cD } = haarStep(cur); dets.push(cD); cur = cA; }
      const aVal = cur.length === 1 ? scalar(cur[0]) : rowVec(cur);
      if (nargout < 2) return ret(aVal);
      const d = dets.length === 1 ? rowVec(dets[0]) : makeCell(1, dets.length, dets.map((dd) => (dd.length === 1 ? scalar(dd[0]) : rowVec(dd))));
      return Promise.resolve([aVal, d]);
    },
    /** ihaart(a,d) — inverse Haar wavelet transform. */
    ihaart: (a) => {
      const aVal = toArray(m(a[0])); const dArg = a[1];
      const dets = isCell(dArg) ? dArg.items.map((it) => toArray(m(it))) : [toArray(m(dArg))];
      let cur = aVal;
      for (let i = dets.length - 1; i >= 0; i--) cur = invHaarStep(cur, dets[i]);
      return ret(rowVec(cur));
    },
    /** xrec = ihaart2(a,h,v,d[,level][,'integer'|'noninteger']) — inverse 2-D Haar transform.
     *  h,v,d are matrices (1 level) or cells ordered finest→coarsest. A trailing 'integer'/'noninteger'
     *  string selects the lifting scheme; a trailing numeric LEVEL is accepted for API compatibility
     *  (MATLAB R2026a reconstructs the full image regardless). */
    ihaart2: (a) => {
      const aMat = toM2(a[0]);
      const hArg = a[1]; const vArg = a[2]; const dArg = a[3];
      let integerflag = false;
      for (let i = 4; i < a.length; i++) {
        const ai = a[i];
        if (isMat(ai) && (ai as Mat).isChar) { const s = asString(ai).toLowerCase(); if (s.startsWith('i')) integerflag = true; }
      }
      const asCells = (x: Value): M2[] => (isCell(x) ? x.items.map(toM2) : [toM2(x)]);
      const hC = asCells(hArg); const vC = asCells(vArg); const dC = asCells(dArg);
      const Nlevels = dC.length;
      let tempa = aMat;
      for (let jj = Nlevels; jj >= 1; jj--) {
        const k = jj - 1;
        tempa = ihlwt2(tempa, hC[k], vC[k], dC[k], integerflag);
      }
      return ret(fromM2(tempa));
    },
    /** detcoef(C,L,n) — extract level-n detail coefficients from a wavedec result. */
    detcoef: (a) => {
      const C = toArray(m(a[0])), L = toArray(m(a[1])).map((v) => Math.round(v)); const n = Math.round(asScalar(a[2]));
      const nlev = L.length - 2, k = nlev - n + 1; let off = L[0]; for (let i = 1; i < k; i++) off += L[i];
      return ret(rowVec(C.slice(off, off + L[k])));
    },
    /** appcoef(C,L,wname[,n]) — level-n approximation (default coarsest), reconstructing if n<nlevels. */
    appcoef: (a) => {
      const C = toArray(m(a[0])), L = toArray(m(a[1])).map((v) => Math.round(v));
      const wname = a.length >= 3 && isMat(a[2]) && (a[2] as Mat).isChar ? asString(a[2]) : 'haar';
      const nlev = L.length - 2; let n = nlev;
      for (let i = 2; i < a.length; i++) if (isMat(a[i]) && !(a[i] as Mat).isChar) n = Math.round(asScalar(a[i]));
      let cur = C.slice(0, L[0]); if (n >= nlev) return ret(rowVec(cur));
      const { lo, hi } = wfilters(wname); let off = L[0];
      for (let lev = nlev; lev > n; lev--) { const dl = L[nlev - lev + 1]; const cD = C.slice(off, off + dl); off += dl; cur = idwt1(cur, cD, lo, hi); }
      return ret(rowVec(cur));
    },
    /** dyaddown(x[,p]) — downsample by 2 (default keeps even-indexed; p odd keeps odd-indexed). */
    dyaddown: (a) => { const x = toArray(m(a[0])); const p = a.length >= 2 ? Math.round(asScalar(a[1])) : 0; const start = p % 2 === 1 ? 0 : 1; const o: number[] = []; for (let i = start; i < x.length; i += 2) o.push(x[i]); return ret(asRow(m(a[0]), o)); },
    /** dyadup(x[,p]) — upsample by 2 inserting zeros (default zero-bracketed; p=0 starts with x). */
    dyadup: (a) => { const x = toArray(m(a[0])); const p = a.length >= 2 ? Math.round(asScalar(a[1])) : 1; const o: number[] = []; if (p % 2 === 0) { for (let i = 0; i < x.length; i++) { o.push(x[i]); if (i < x.length - 1) o.push(0); } } else { o.push(0); for (const v of x) { o.push(v); o.push(0); } } return ret(asRow(m(a[0]), o)); },
    /** wrev(x) — flip (reverse) a vector. */
    wrev: (a) => ret(asRow(m(a[0]), toArray(m(a[0])).reverse())),
    /** [LoDa,LoDb,HiDa,HiDb,LoRa,LoRb,HiRa,HiRb] = qorthwavf(num) — Kingsbury Q-shift filters (column vectors). */
    qorthwavf: (a, nargout) => {
      const filters = qorthwavfFilters(Math.round(asScalar(a[0])));
      const out = filters.map((f) => colVec(f));
      return Promise.resolve(nargout <= 1 ? [out[0]] : out.slice(0, nargout));
    },
    /** [Rf,Df] = biorwavf('biorNr.Nd') — biorthogonal scaling-filter coefficients (row vectors). */
    biorwavf: (a, nargout) => {
      const { Rf, Df } = biorwavfRfDf(asString(a[0]));
      return Promise.resolve(nargout >= 2 ? [rowVec(Rf), rowVec(Df)] : [rowVec(Rf)]);
    },
    /** [Lo_D,Hi_D,Lo_R,Hi_R] = orthfilt(W[,P]) — orthogonal filter bank from a scaling vector. */
    orthfilt: (a, nargout) => {
      const { LoD, HiD, LoR, HiR } = orthfiltBank(toArray(m(a[0])));
      const src = m(a[0]);
      const out = [asRow(src, LoD), asRow(src, HiD), asRow(src, LoR), asRow(src, HiR)];
      return Promise.resolve(nargout <= 1 ? [out[0]] : out.slice(0, nargout));
    },
    /** [Lo_D,Hi_D,Lo_R,Hi_R] = biorfilt(Df,Rf) — orthogonal-style filters from a biorthogonal pair. */
    biorfilt: (a, nargout) => {
      const { LoD, HiD, LoR, HiR } = biorfiltBank(toArray(m(a[0])), toArray(m(a[1])));
      const out = [rowVec(LoD), rowVec(HiD), rowVec(LoR), rowVec(HiR)];
      return Promise.resolve(nargout <= 1 ? [out[0]] : out.slice(0, nargout));
    },
  },
  help: HELP_WAVELET,
};

