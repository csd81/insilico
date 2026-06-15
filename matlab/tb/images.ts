// Image Processing Toolbox — computable, validatable subset: type conversion (im2double/
// im2uint8/im2uint16/mat2gray), point ops (imcomplement/imadjust), thresholding (graythresh
// Otsu, imbinarize), and YCbCr conversion. (rgb2gray/im2gray are already base.) See plan §7.
import type { Builtin } from '../builtins';
import {
  type Value, type Mat, type StructV, isMat, isStr, scalar, colVec, zeros, toArray, asScalar, asString, toMat as m, applyClass,
  ndSize, makeND, mat, fromRows,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_IMAGES } from '../help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
// NTSC/YIQ base matrix T (rows) and its transpose, from rgb2ntsc.m / ntsc2rgb.m.
const NTSC_T = [[1.0, 0.956, 0.621], [1.0, -0.272, -0.647], [1.0, -1.106, 1.703]];
const NTSC_Tt = [[1.0, 1.0, 1.0], [0.956, -0.272, -1.106], [0.621, -0.647, 1.703]];
// sRGB↔XYZ (D65) 3×3 matrix (from MATLAB rgb2xyz primaries) and gamma companding.
const SRGB_M = [[0.412456439089692, 0.357576077643909, 0.180437483266399],
  [0.212672851405623, 0.715152155287818, 0.0721749933065596],
  [0.0193338955823293, 0.119192025881303, 0.950304078536368]];
const srgbDecode = (c: number) => (c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92);
const srgbEncode = (l: number) => (l > 0.0031308 ? 1.055 * l ** (1 / 2.4) - 0.055 : 12.92 * l);
const mul3 = (M: number[][], v: number[]) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
// CIELAB: D65 white point and the nonlinear f / f⁻¹ used by xyz2lab / lab2xyz.
const D65 = [0.95047, 1, 1.08883];
const labF = (t: number) => (t > 0.008856451679035631 ? Math.cbrt(t) : 7.787037037037035 * t + 0.13793103448275862);
const labFinv = (t: number) => (t > 0.20689655172413793 ? t * t * t : (t - 0.13793103448275862) / 7.787037037037035);
/** Inverse of a 3×3 matrix (row-major). */
function mat3inv(M: number[][]): number[][] {
  const [a, b, c] = M[0], [d, e, f] = M[1], [g, h, i] = M[2];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
}
/** Scale of an integer image type (max representable value). */
const typeMax = (t?: string) => (t === 'uint8' ? 255 : t === 'uint16' ? 65535 : t === 'int16' ? 32767 : 1);
/** Read an image Mat to double-in-[0,1] (honoring its integer class), for internal computation. */
function toUnit(M: Mat): number[] {
  const d = toArray(M);
  if (M.itype === 'uint8') return d.map((x) => x / 255);
  if (M.itype === 'uint16') return d.map((x) => x / 65535);
  if (M.itype === 'int16') return d.map((x) => (x + 32768) / 65535);
  if (M.isBool) return d.map((x) => (x ? 1 : 0));
  return d;   // already double in [0,1]
}
function likeShape(M: Mat, data: number[]): Mat { const o = zeros(M.rows, M.cols); o.data.set(data); return o; }

/** Otsu's threshold on a unit-scaled grayscale image (returns level in [0,1]).
 *  Matches MATLAB graythresh's tie-break: average the bin indices of all maxima. */
function otsu(unit: number[]): number {
  const nb = 256; const hist = new Array(nb).fill(0);
  for (const v of unit) hist[Math.min(nb - 1, Math.max(0, Math.round(v * (nb - 1))))]++;
  const total = unit.length; let sum = 0; for (let i = 0; i < nb; i++) sum += i * hist[i];
  const between = new Array(nb).fill(-1); let sumB = 0, wB = 0;
  for (let i = 0; i < nb; i++) {
    wB += hist[i]; const wF = total - wB; if (wB === 0 || wF === 0) continue;
    sumB += i * hist[i]; const mB = sumB / wB, mF = (sum - sumB) / wF; between[i] = wB * wF * (mB - mF) ** 2;
  }
  const mx = Math.max(...between); if (mx <= 0) return 0;
  const idxs: number[] = []; for (let i = 0; i < nb; i++) if (between[i] >= mx * (1 - 1e-9)) idxs.push(i);
  return (idxs.reduce((s, x) => s + x, 0) / idxs.length) / (nb - 1);
}

export const IMAGES: ToolboxModule = {
  id: 'images',
  name: 'Image Processing Toolbox',
  docBase: 'https://www.mathworks.com/help/images/ref/',
  builtins: {
    /** rgb2ntsc(A) — RGB → NTSC/YIQ via yiq = rgb·inv(T'). Mirrors rgb2ntsc.m (N×3 colormap). */
    rgb2ntsc: (a) => {
      const A = m(a[0]), N = A.rows;
      const Minv = mat3inv(NTSC_Tt);                                   // inv(T')
      const out = new Float64Array(N * 3);
      for (let r = 0; r < N; r++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += A.data[r + k * N] * Minv[k][j]; out[r + j * N] = s; }
      return ret(mat(N, 3, out));
    },
    /** ntsc2rgb(A) — NTSC/YIQ → RGB via rgb = yiq·T', clamped to [0,1] with >1 row-normalize. */
    ntsc2rgb: (a) => {
      const A = m(a[0]), N = A.rows; const out = new Float64Array(N * 3);
      for (let r = 0; r < N; r++) {
        const row = [0, 0, 0];
        for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += A.data[r + k * N] * NTSC_T[j][k]; row[j] = Math.max(0, s); }
        const mx = Math.max(row[0], row[1], row[2]);
        if (mx > 1) for (let j = 0; j < 3; j++) row[j] /= mx;
        for (let j = 0; j < 3; j++) out[r + j * N] = row[j];
      }
      return ret(mat(N, 3, out));
    },
    /** rgb2xyz(RGB) — sRGB → CIE 1931 XYZ (D65). N×3 rows. */
    rgb2xyz: (a) => {
      const A = m(a[0]), N = A.rows, SR = SRGB_M; const out = new Float64Array(N * 3);
      for (let r = 0; r < N; r++) { const xyz = mul3(SR, [srgbDecode(A.data[r]), srgbDecode(A.data[r + N]), srgbDecode(A.data[r + 2 * N])]); out[r] = xyz[0]; out[r + N] = xyz[1]; out[r + 2 * N] = xyz[2]; }
      return ret(mat(N, 3, out));
    },
    /** xyz2rgb(XYZ) — CIE 1931 XYZ → sRGB (D65), clamped to [0,1]. N×3 rows. */
    xyz2rgb: (a) => {
      const A = m(a[0]), N = A.rows, Minv = mat3inv(SRGB_M); const out = new Float64Array(N * 3);
      for (let r = 0; r < N; r++) { const lin = mul3(Minv, [A.data[r], A.data[r + N], A.data[r + 2 * N]]); out[r] = clamp01(srgbEncode(lin[0])); out[r + N] = clamp01(srgbEncode(lin[1])); out[r + 2 * N] = clamp01(srgbEncode(lin[2])); }
      return ret(mat(N, 3, out));
    },
    /** rgb2lab(RGB) — sRGB → CIELAB (D65). N×3 rows. */
    rgb2lab: (a) => {
      const A = m(a[0]), N = A.rows, SR = SRGB_M; const out = new Float64Array(N * 3);
      for (let r = 0; r < N; r++) {
        const xyz = mul3(SR, [srgbDecode(A.data[r]), srgbDecode(A.data[r + N]), srgbDecode(A.data[r + 2 * N])]);
        const fx = labF(xyz[0] / D65[0]), fy = labF(xyz[1] / D65[1]), fz = labF(xyz[2] / D65[2]);
        out[r] = 116 * fy - 16; out[r + N] = 500 * (fx - fy); out[r + 2 * N] = 200 * (fy - fz);
      }
      return ret(mat(N, 3, out));
    },
    /** lab2rgb(LAB) — CIELAB → sRGB (D65), clamped to [0,1]. N×3 rows. */
    lab2rgb: (a) => {
      const A = m(a[0]), N = A.rows, Minv = mat3inv(SRGB_M); const out = new Float64Array(N * 3);
      for (let r = 0; r < N; r++) {
        const fy = (A.data[r] + 16) / 116, fx = fy + A.data[r + N] / 500, fz = fy - A.data[r + 2 * N] / 200;
        const lin = mul3(Minv, [D65[0] * labFinv(fx), D65[1] * labFinv(fy), D65[2] * labFinv(fz)]);
        out[r] = clamp01(srgbEncode(lin[0])); out[r + N] = clamp01(srgbEncode(lin[1])); out[r + 2 * N] = clamp01(srgbEncode(lin[2]));
      }
      return ret(mat(N, 3, out));
    },
    /** xyz2lab(XYZ) — CIE 1931 XYZ → CIELAB (D65 white point). N×3 rows. */
    xyz2lab: (a) => {
      const A = m(a[0]), N = A.rows; const out = new Float64Array(N * 3);
      for (let r = 0; r < N; r++) {
        const fx = labF(A.data[r] / D65[0]), fy = labF(A.data[r + N] / D65[1]), fz = labF(A.data[r + 2 * N] / D65[2]);
        out[r] = 116 * fy - 16; out[r + N] = 500 * (fx - fy); out[r + 2 * N] = 200 * (fy - fz);
      }
      return ret(mat(N, 3, out));
    },
    /** lab2xyz(LAB) — CIELAB → CIE 1931 XYZ (D65 white point). N×3 rows. */
    lab2xyz: (a) => {
      const A = m(a[0]), N = A.rows; const out = new Float64Array(N * 3);
      for (let r = 0; r < N; r++) {
        const fy = (A.data[r] + 16) / 116, fx = fy + A.data[r + N] / 500, fz = fy - A.data[r + 2 * N] / 200;
        out[r] = D65[0] * labFinv(fx); out[r + N] = D65[1] * labFinv(fy); out[r + 2 * N] = D65[2] * labFinv(fz);
      }
      return ret(mat(N, 3, out));
    },
    /** measerr(X,Xapp[,Bps]) → [psnr, mse, maxerr, L2rat] approximation-quality metrics. */
    measerr: (a, nargout) => {
      const X = toArray(m(a[0])), Y = toArray(m(a[1])), bps = a.length > 2 ? asScalar(a[2]) : 8;
      let mse = 0, maxerr = 0, sa = 0, sb = 0;
      for (let i = 0; i < X.length; i++) { const d = Math.abs(X[i] - Y[i]); mse += d * d; if (d > maxerr) maxerr = d; sa += X[i] * X[i]; sb += Y[i] * Y[i]; }
      mse /= X.length;
      const psnr = 20 * Math.log10((2 ** bps - 1) / Math.sqrt(mse));
      return Promise.resolve([scalar(psnr), scalar(mse), scalar(maxerr), scalar(sb / sa)].slice(0, Math.max(1, nargout)));
    },
    /** ind2rgb(X,MAP) — indexed image + colormap → M×N×3 double RGB. Mirrors ind2rgb.m. */
    ind2rgb: (a) => {
      const A = m(a[0]), cm = m(a[1]);
      const isInt = !!A.itype && A.itype !== 'single';      // integer classes are 0-based indices
      const idx = toArray(A).map((v) => (isInt ? v + 1 : v));
      const ncol = cm.rows, R = A.rows, C = A.cols, total = R * C;
      const out = new Float64Array(total * 3);
      for (let p = 0; p < total; p++) {
        let i = Math.round(idx[p]);
        if (i < 1) i = 1; else if (i > ncol) i = ncol;      // clamp to [1, size(MAP,1)]
        for (let ch = 0; ch < 3; ch++) out[p + ch * total] = cm.data[(i - 1) + ch * ncol];
      }
      return ret(makeND([R, C, 3], out));
    },
    /** im2double(I) — convert image to double in [0,1] (scales integer classes). */
    im2double: (a) => ret(likeShape(m(a[0]), toUnit(m(a[0])))),
    /** im2uint8(I) — convert to uint8 [0,255]. */
    im2uint8: (a) => ret(applyClass(likeShape(m(a[0]), toUnit(m(a[0])).map((x) => Math.round(clamp01(x) * 255))), 'uint8')),
    /** im2single(I) — convert image to single precision (scales integer classes to [0,1]). */
    im2single: (a) => { const A = m(a[0]); const d = A.itype === 'single' ? toArray(A) : toUnit(A); return ret(applyClass(likeShape(A, d), 'single')); },
    /** im2uint16(I) — convert to uint16 [0,65535]. */
    im2uint16: (a) => ret(applyClass(likeShape(m(a[0]), toUnit(m(a[0])).map((x) => Math.round(clamp01(x) * 65535))), 'uint16')),
    /** mat2gray(A[,[lo hi]]) — linearly scale to [0,1] (default lo/hi = min/max). */
    mat2gray: (a) => {
      const A = m(a[0]); const d = toArray(A);
      let lo: number, hi: number;
      if (a.length >= 2 && isMat(a[1])) { const lim = toArray(m(a[1])); lo = lim[0]; hi = lim[1]; } else { lo = Math.min(...d); hi = Math.max(...d); }
      const den = hi - lo || 1;
      return ret(likeShape(A, d.map((x) => clamp01((x - lo) / den))));
    },
    /** imcomplement(I) — negative image (class-aware). */
    imcomplement: (a) => { const A = m(a[0]); const mx = A.isBool ? 1 : typeMax(A.itype); const o = likeShape(A, toArray(A).map((x) => mx - x)); if (A.isBool) o.isBool = true; return ret(A.itype ? applyClass(o, A.itype) : o); },
    /** imadjust(I,[lin hin],[lout hout],gamma) — intensity remap (defaults [0 1],[0 1],1). */
    imadjust: (a) => {
      const A = m(a[0]); const u = toUnit(A);
      const li = a.length >= 2 && isMat(a[1]) && (m(a[1]).rows * m(a[1]).cols) >= 2 ? toArray(m(a[1])) : [0, 1];
      const lo = a.length >= 3 && isMat(a[2]) && (m(a[2]).rows * m(a[2]).cols) >= 2 ? toArray(m(a[2])) : [0, 1];
      const g = a.length >= 4 && isMat(a[3]) ? asScalar(a[3]) : 1;
      const [lin, hin] = li, [lout, hout] = lo; const den = hin - lin || 1;
      return ret(likeShape(A, u.map((x) => lout + (hout - lout) * clamp01((x - lin) / den) ** g)));
    },
    /** graythresh(I) — Otsu global threshold level in [0,1]. */
    graythresh: (a) => ret(scalar(otsu(toUnit(m(a[0]))))),
    /** imbinarize(I[,level]) — threshold to logical (default Otsu). */
    imbinarize: (a) => { const A = m(a[0]); const u = toUnit(A); const lvl = a.length >= 2 && isMat(a[1]) ? asScalar(a[1]) : otsu(u); const o = likeShape(A, u.map((x) => (x > lvl ? 1 : 0))); o.isBool = true; return ret(o); },
    /** rgb2ycbcr / ycbcr2rgb on an N×3 colormap-style matrix (BT.601, double in [0,1]). */
    rgb2ycbcr: (a) => ret(mapRows3(m(a[0]), (r, gg, b) => [16 / 255 + (65.481 * r + 128.553 * gg + 24.966 * b) / 255, 128 / 255 + (-37.797 * r - 74.203 * gg + 112.0 * b) / 255, 128 / 255 + (112.0 * r - 93.786 * gg - 18.214 * b) / 255])),
    ycbcr2rgb: (a) => ret(mapRows3(m(a[0]), (y, cb, cr) => { const Y = y * 255 - 16, Cb = cb * 255 - 128, Cr = cr * 255 - 128; return [(1.164 * Y + 1.596 * Cr) / 255, (1.164 * Y - 0.392 * Cb - 0.813 * Cr) / 255, (1.164 * Y + 2.017 * Cb) / 255]; })),

    // ── spatial filtering ──
    /** fspecial(type,…) — predefined 2-D filter kernels. */
    fspecial: (a) => ret(fromRows(fspecial(asString(a[0]).toLowerCase(), a.slice(1)))),
    /** imfilter(A,h[,boundary][,'conv'|'corr'][,'same'|'full']) — 2-D filtering (default corr, 0-pad, same). */
    imfilter: (a) => {
      const A = matToRows(m(a[0])), h = matToRows(m(a[1]));
      let conv = false; let boundary: number | string = 0; let shape: 'same' | 'full' = 'same';
      for (const arg of a.slice(2)) { if (isStr(arg) || (isMat(arg) && (arg as Mat).isChar)) { const o = asString(arg).toLowerCase(); if (o === 'conv') conv = true; else if (o === 'corr') { /* default */ } else if (o === 'same' || o === 'full') shape = o; else boundary = o; } else if (isMat(arg)) boundary = asScalar(arg); }
      return ret(fromRows(filter2d(A, h, conv, boundary, shape)));
    },
    /** imgaussfilt(A[,sigma]) — Gaussian smoothing (default sigma 0.5), replicate padding. */
    imgaussfilt: (a) => { const sigma = a.length >= 2 && isMat(a[1]) ? asScalar(a[1]) : 0.5; const sz = 2 * Math.ceil(2 * sigma) + 1; return ret(fromRows(filter2d(matToRows(m(a[0])), fspecial('gaussian', [{ kind: 'num', rows: 1, cols: 2, data: Float64Array.of(sz, sz) } as Mat, scalar(sigma)]), false, 'replicate'))); },
    /** adaptthresh(I[,sensitivity][,Name,Value]) — locally adaptive threshold (Bradley's method).
     *  Statistic: 'mean'(default)|'median'|'gaussian'; ForegroundPolarity: 'bright'(default)|'dark';
     *  NeighborhoodSize default 2*floor(size/16)+1. Returns a double threshold image in [0,1]. */
    adaptthresh: (a) => ret(adaptthresh(a)),
    /** stretchlim(I[,tol]) — [low;high] contrast-stretch limits (256-bin CDF, default 1% saturation). */
    stretchlim: (a) => {
      const u = toUnit(m(a[0])); let lo = 0.01, hi = 0.99;
      if (a.length >= 2 && isMat(a[1])) { const t = toArray(m(a[1])); if (t.length >= 2) { lo = t[0]; hi = t[1]; } else { lo = t[0]; hi = 1 - t[0]; } }
      const nb = 256, hist = new Array(nb).fill(0); for (const v of u) hist[Math.min(nb - 1, Math.max(0, Math.round(v * (nb - 1))))]++;
      const total = u.length; let cum = 0, loB = 0, hiB = nb - 1;
      cum = 0; for (let i = 0; i < nb; i++) { cum += hist[i]; if (cum / total > lo) { loB = i; break; } }
      cum = 0; for (let i = 0; i < nb; i++) { cum += hist[i]; if (cum / total >= hi) { hiB = i; break; } }
      if (loB >= hiB) { loB = 0; hiB = nb - 1; }
      return ret(colVec([loB / (nb - 1), hiB / (nb - 1)]));
    },
    /** rgb2lin(rgb) / lin2rgb(rgb) — sRGB EOTF / inverse-EOTF (gamma decode/encode), double in [0,1]. */
    rgb2lin: (a) => ret(likeShape(m(a[0]), toArray(m(a[0])).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)))),
    lin2rgb: (a) => ret(likeShape(m(a[0]), toArray(m(a[0])).map((c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)))),
    /** imresize(A,scale|[r c][,method]) — resize via u=i/scale+0.5(1−1/scale); 'nearest' or 'bilinear' (no antialiasing). */
    imresize: (a) => {
      const A = matToRows(m(a[0])); const R = A.length, C = A[0]?.length ?? 0;
      let method = 'bilinear', szArg: Mat | null = null;
      for (const arg of a.slice(1)) { if (isMat(arg) && (arg as Mat).isChar) method = asString(arg).toLowerCase(); else if (isMat(arg) && !szArg) szArg = arg as Mat; }
      let outR = R, outC = C; if (szArg) { const s = toArray(szArg); if (s.length >= 2) { outR = Math.round(s[0]); outC = Math.round(s[1]); } else { outR = Math.round(R * s[0]); outC = Math.round(C * s[0]); } }
      const sr = outR / R, sc = outC / C; const out: number[][] = [];
      const samp = (ur: number, uc: number) => {
        ur = Math.max(1, Math.min(R, ur)); uc = Math.max(1, Math.min(C, uc));
        if (method === 'nearest') return A[Math.round(ur) - 1][Math.round(uc) - 1];
        const ri = Math.max(0, Math.min(R - 2, Math.floor(ur) - 1)), ci = Math.max(0, Math.min(C - 2, Math.floor(uc) - 1));
        const ri1 = Math.min(ri + 1, R - 1), ci1 = Math.min(ci + 1, C - 1); // clamp neighbor for 1-D images (R==1 or C==1)
        const fr = ur - 1 - ri, fc = uc - 1 - ci;
        return (1 - fr) * (1 - fc) * A[ri][ci] + (1 - fr) * fc * A[ri][ci1] + fr * (1 - fc) * A[ri1][ci] + fr * fc * A[ri1][ci1];
      };
      for (let i = 0; i < outR; i++) { out[i] = []; const ur = (i + 1) / sr + 0.5 * (1 - 1 / sr); for (let j = 0; j < outC; j++) out[i][j] = samp(ur, (j + 1) / sc + 0.5 * (1 - 1 / sc)); }
      return ret(fromRows(out));
    },
    /** padarray(A,padsize[,padval|method][,direction]) — pad a 2-D array (constant/circular/replicate/symmetric). */
    padarray: (a) => ret(padarray(a)),
    integralImage: (a) => integralImage(a),
    integralImage3: (a) => integralImage3(a),
    integralBoxFilter: (a) => integralBoxFilter(a),
    integralBoxFilter3: (a) => integralBoxFilter3(a),
    /** regionprops(BW[,props...]) — measure properties of connected components (8-conn). */
    regionprops: (a) => ret(regionprops(a)),
    /** bwlabel(BW[,conn]) — label connected components; [L,num]. conn=8 (default) or 4. */
    bwlabel: (a, nargout) => {
      const BWm = m(a[0]); const R = BWm.rows, C = BWm.cols; const d = toArray(BWm);
      const BW: number[][] = [];
      for (let r = 0; r < R; r++) { BW[r] = []; for (let c = 0; c < C; c++) BW[r][c] = d[r + c * R] ? 1 : 0; }
      const conn = a.length >= 2 && isMat(a[1]) ? Math.round(asScalar(a[1])) : 8;
      const regions = bwLabelConn(BW, R, C, conn === 4 ? 4 : 8);
      const o = zeros(R, C);
      for (let lab = 0; lab < regions.length; lab++) for (const li of regions[lab]) o.data[li] = lab + 1;
      return Promise.resolve(nargout >= 2 ? [o, scalar(regions.length)] : [o]);
    },
    /** imerode(BW,SE) — binary erosion (out-of-border treated as foreground → 1-padding). */
    /** watershed(A) — watershed transform (Meyer flooding); basins 1..k, ridge pixels 0. */
    watershed: (a) => ret(fromRows(watershedTransform(matToRows(m(a[0]))))),
    imerode: (a) => ret(morph(m(a[0]), seNeighborhood(a[1]), 'erode')),
    /** imdilate(BW,SE) — binary dilation (out-of-border treated as background → 0-padding). */
    imdilate: (a) => ret(morph(m(a[0]), seNeighborhood(a[1]), 'dilate')),
    /** imopen(BW,SE) — erosion followed by dilation. */
    imopen: (a) => ret(openClose(m(a[0]), seNeighborhood(a[1]), 'open')),
    /** imclose(BW,SE) — dilation followed by erosion. */
    imclose: (a) => ret(openClose(m(a[0]), seNeighborhood(a[1]), 'close')),

    // ── spatial-statistics filters & quality metrics (verified vs MATLAB R2026a) ──
    /** imboxfilt(A[,filterSize][,'Padding',p][,'NormalizationFactor',f]) — 2-D box filter. */
    imboxfilt: (a) => ret(imboxfiltFn(a)),
    /** imboxfilt3(A[,filterSize][,'Padding',p][,'NormalizationFactor',f]) — 3-D box filter. */
    imboxfilt3: (a) => ret(imboxfilt3Fn(a)),
    /** imgaussfilt3(A[,sigma][,'FilterSize',sz][,'Padding',p]) — 3-D Gaussian smoothing. */
    imgaussfilt3: (a) => ret(imgaussfilt3Fn(a)),
    /** medfilt3(A[,filterSize][,padopt]) — 3-D median filter (default [3 3 3], symmetric). */
    medfilt3: (a) => ret(medfilt3Fn(a)),
    /** modefilt(A[,filterSize][,padopt]) — 2-D/3-D mode filter (default symmetric). */
    modefilt: (a) => ret(modefiltFn(a)),
    /** stdfilt(I[,nhood]) — local standard deviation (3x3 default, symmetric padding, double). */
    stdfilt: (a) => ret(stdfiltFn(a)),
    /** rangefilt(I[,nhood]) — local range = local max - local min (3x3 default). */
    rangefilt: (a) => ret(rangefiltFn(a)),
    /** entropyfilt(I[,nhood]) — local Shannon entropy (im2uint8, 256 bins, true(9) default). */
    entropyfilt: (a) => ret(entropyfiltFn(a)),
    /** ssim(A,ref[,Name,Value]) — Structural Similarity Index. [ssimval,ssimmap]. */
    ssim: (a, nargout) => Promise.resolve(ssimFn(a, nargout ?? 1)),
  },
  help: HELP_IMAGES,
};

/** Connected-component labeling with 4- or 8-connectivity, in MATLAB column-major
 *  scan order (increasing linear index). Returns per region the sorted 0-based
 *  column-major linear pixel indices. */
function bwLabelConn(BW: number[][], R: number, C: number, conn: 4 | 8): number[][] {
  const label = new Int32Array(R * C).fill(0);
  const regions: number[][] = [];
  const idx = (r: number, c: number) => r + c * R;
  const offs4: Array<[number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const offs8: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) offs8.push([dr, dc]);
  const offs = conn === 4 ? offs4 : offs8;
  for (let c = 0; c < C; c++) {
    for (let r = 0; r < R; r++) {
      if (!BW[r][c] || label[idx(r, c)] !== 0) continue;
      const lab = regions.length + 1; const pix: number[] = [];
      const stack: Array<[number, number]> = [[r, c]]; label[idx(r, c)] = lab;
      while (stack.length) {
        const [pr, pc] = stack.pop()!; pix.push(idx(pr, pc));
        for (const [dr, dc] of offs) {
          const nr = pr + dr, nc = pc + dc;
          if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
          if (BW[nr][nc] && label[idx(nr, nc)] === 0) { label[idx(nr, nc)] = lab; stack.push([nr, nc]); }
        }
      }
      pix.sort((x, y) => x - y); regions.push(pix);
    }
  }
  return regions;
}

/** Offsets (row,col) of a structuring element's set elements relative to its
 *  origin (center = floor(size/2)). Accepts a numeric/logical neighborhood
 *  matrix (nonzeros are the SE) or a strel-style object exposing a Neighborhood. */
function seNeighborhood(v: Value): Array<[number, number]> {
  let M: Mat | null = null;
  if (isMat(v)) M = m(v);
  else if (v && typeof v === 'object' && (v as StructV).kind === 'struct') {
    const f = (v as StructV).fields;
    const nb = f.get('Neighborhood')?.[0] ?? f.get('neighborhood')?.[0];
    if (nb && isMat(nb)) M = m(nb);
  }
  if (!M) M = scalar(1);
  const R = M.rows, C = M.cols; const cy = Math.floor(R / 2), cx = Math.floor(C / 2);
  const off: Array<[number, number]> = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (M.data[r + c * R]) off.push([r - cy, c - cx]);
  return off;
}

/** Binary erosion/dilation with a structuring element given as origin-relative
 *  offsets. Erosion treats out-of-border pixels as foreground (value-1 padding,
 *  matching MATLAB); dilation treats them as background. Returns a logical Mat. */
function morph(BWm: Mat, off: Array<[number, number]>, op: 'erode' | 'dilate'): Mat {
  const R = BWm.rows, C = BWm.cols; const d = toArray(BWm);
  const get = (r: number, c: number) => (d[r + c * R] ? 1 : 0);
  const o = zeros(R, C);
  for (let c = 0; c < C; c++) {
    for (let r = 0; r < R; r++) {
      let val: number;
      if (op === 'erode') {
        val = 1;
        for (const [dr, dc] of off) {
          const nr = r + dr, nc = c + dc;
          const px = (nr < 0 || nr >= R || nc < 0 || nc >= C) ? 1 : get(nr, nc); // 1-pad
          if (!px) { val = 0; break; }
        }
      } else {
        // dilation: reflect SE about origin; out-of-border = 0.
        val = 0;
        for (const [dr, dc] of off) {
          const nr = r - dr, nc = c - dc;
          if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue; // 0-pad
          if (get(nr, nc)) { val = 1; break; }
        }
      }
      o.data[r + c * R] = val;
    }
  }
  o.isBool = true;
  return o;
}

/** imopen/imclose. MATLAB pads the image (with 0) by the SE's reach before the
 *  two morphology passes and crops back, so the border does not artificially
 *  preserve foreground during the internal erosion. Validated vs MATLAB R2026a. */
function openClose(BWm: Mat, off: Array<[number, number]>, op: 'open' | 'close'): Mat {
  const R = BWm.rows, C = BWm.cols; const d = toArray(BWm);
  // SE reach in each direction.
  let up = 0, down = 0, left = 0, right = 0;
  for (const [dr, dc] of off) { up = Math.max(up, -dr); down = Math.max(down, dr); left = Math.max(left, -dc); right = Math.max(right, dc); }
  const pT = up, pB = down, pL = left, pR = right;
  const pR_ = R + pT + pB, pC_ = C + pL + pR;
  const padded = zeros(pR_, pC_);
  for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) padded.data[(r + pT) + (c + pL) * pR_] = d[r + c * R] ? 1 : 0;
  const seq: Array<'erode' | 'dilate'> = op === 'open' ? ['erode', 'dilate'] : ['dilate', 'erode'];
  let cur = padded;
  for (const step of seq) cur = morph(cur, off, step);
  const o = zeros(R, C);
  for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) o.data[r + c * R] = cur.data[(r + pT) + (c + pL) * pR_];
  o.isBool = true;
  return o;
}

/** Apply a per-row 3→3 map to an N×3 matrix (rows of [c1 c2 c3]). */
function mapRows3(M: Mat, f: (a: number, b: number, c: number) => number[]): Mat {
  const N = M.rows; const o = zeros(N, 3);
  for (let r = 0; r < N; r++) { const out = f(M.data[r], M.data[r + N], M.data[r + 2 * N]); for (let c = 0; c < 3; c++) o.data[r + c * N] = out[c]; }
  return o;
}
/** Rows of a column-major Mat as number[][]. */
function matToRows(M: Mat): number[][] { const o: number[][] = []; for (let r = 0; r < M.rows; r++) { const row: number[] = []; for (let c = 0; c < M.cols; c++) row.push(M.data[r + c * M.rows]); o.push(row); } return o; }
/** Watershed transform (Meyer flooding, 8-connectivity): label catchment basins 1..k with
 *  ridge (watershed) pixels = 0. Label numbering may differ from MATLAB up to permutation. */
function watershedTransform(A: number[][]): number[][] {
  const R = A.length, C = A[0]?.length ?? 0;
  const lab: number[][] = Array.from({ length: R }, () => new Array(C).fill(-1)); // -1 unlabeled, 0 ridge, ≥1 basin
  const inq: boolean[][] = Array.from({ length: R }, () => new Array(C).fill(false));
  const nbrs = (r: number, c: number): [number, number][] => { const o: [number, number][] = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < R && nc >= 0 && nc < C) o.push([nr, nc]); } return o; };
  // 1. Regional minima → unique basin labels (flood equal-value plateaus with no lower neighbour).
  const visited: boolean[][] = Array.from({ length: R }, () => new Array(C).fill(false));
  let nlab = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (visited[r][c]) continue;
    const v = A[r][c]; const stack: [number, number][] = [[r, c]]; const plateau: [number, number][] = []; visited[r][c] = true; let isMin = true;
    while (stack.length) { const [pr, pc] = stack.pop()!; plateau.push([pr, pc]); for (const [nr, nc] of nbrs(pr, pc)) { const av = A[nr][nc]; if (av === v) { if (!visited[nr][nc]) { visited[nr][nc] = true; stack.push([nr, nc]); } } else if (av < v) isMin = false; } }
    if (isMin) { nlab++; for (const [pr, pc] of plateau) lab[pr][pc] = nlab; }
  }
  // 2. Flood from the markers using a value-ordered priority queue (FIFO tiebreak).
  type Q = { v: number; o: number; r: number; c: number };
  const heap: Q[] = []; let ord = 0;
  const less = (a: Q, b: Q) => a.v < b.v || (a.v === b.v && a.o < b.o);
  const push = (r: number, c: number) => { heap.push({ v: A[r][c], o: ord++, r, c }); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!less(heap[i], heap[p])) break;[heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = (): Q => { const top = heap[0]; const last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, rr = 2 * i + 2; let m2 = i; if (l < heap.length && less(heap[l], heap[m2])) m2 = l; if (rr < heap.length && less(heap[rr], heap[m2])) m2 = rr; if (m2 === i) break;[heap[m2], heap[i]] = [heap[i], heap[m2]]; i = m2; } } return top; };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (lab[r][c] > 0) for (const [nr, nc] of nbrs(r, c)) if (lab[nr][nc] === -1 && !inq[nr][nc]) { inq[nr][nc] = true; push(nr, nc); }
  while (heap.length) {
    const { r, c } = pop(); if (lab[r][c] !== -1) continue;
    let basin = -1, ridge = false;
    for (const [nr, nc] of nbrs(r, c)) { const L = lab[nr][nc]; if (L > 0) { if (basin === -1) basin = L; else if (basin !== L) ridge = true; } }
    if (ridge) lab[r][c] = 0;
    else if (basin > 0) { lab[r][c] = basin; for (const [nr, nc] of nbrs(r, c)) if (lab[nr][nc] === -1 && !inq[nr][nc]) { inq[nr][nc] = true; push(nr, nc); } }
  }
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (lab[r][c] === -1) lab[r][c] = 0;
  return lab;
}

/** Map a padded index `i` (range −pre … n−1+post) back into 0…n−1 per padding method. */
function padIndex(i: number, n: number, method: string): number {
  if (i >= 0 && i < n) return i;
  if (method === 'circular') return ((i % n) + n) % n;
  if (method === 'replicate') return i < 0 ? 0 : n - 1;
  if (method === 'symmetric') {
    // reflect with the border element repeated (period 2n)
    const p = ((i % (2 * n)) + 2 * n) % (2 * n);
    return p < n ? p : 2 * n - 1 - p;
  }
  return -1; // constant padding sentinel
}
/** padarray(A,padsize[,padval|method][,direction]). 2-D. Preserves class/logical. */
function padarray(args: Value[]): Mat {
  const A = m(args[0]);
  const ps = toArray(m(args[1]));
  // scalar padsize pads dim-1 only (padSize(ndims)=0); [r c] pads both dims.
  const pr = ps.length >= 1 ? Math.round(ps[0]) : 0;
  const pc = ps.length >= 2 ? Math.round(ps[1]) : 0;
  let method = 'constant';
  let padVal = 0;
  let direction = 'both';
  // args 3 and 4 are METHOD/DIRECTION/PADVAL, interchangeable for 3-4 (PADVAL only as 3rd, numeric).
  let first = 2;
  if (args.length > 2 && isMat(args[2]) && !(args[2] as Mat).isChar) { padVal = asScalar(args[2]); first = 3; }
  for (let k = first; k < args.length; k++) {
    const s = isMat(args[k]) ? asString(args[k]).toLowerCase() : '';
    if (s === 'circular' || s === 'replicate' || s === 'symmetric') method = s;
    else if (s === 'pre' || s === 'post' || s === 'both') direction = s;
  }
  const rPre = direction === 'post' ? 0 : pr, rPost = direction === 'pre' ? 0 : pr;
  const cPre = direction === 'post' ? 0 : pc, cPost = direction === 'pre' ? 0 : pc;
  const R = A.rows, C = A.cols;
  const outR = R + rPre + rPost, outC = C + cPre + cPost;
  const out = matToRows(A);
  const res: number[][] = [];
  for (let i = 0; i < outR; i++) {
    res[i] = [];
    const si = padIndex(i - rPre, R, method);
    for (let j = 0; j < outC; j++) {
      const sj = padIndex(j - cPre, C, method);
      res[i][j] = (si < 0 || sj < 0) ? padVal : out[si][sj];
    }
  }
  const o = fromRows(res);
  if (A.isBool) o.isBool = true;
  return A.itype ? applyClass(o, A.itype) : o;
}
/** Build a column-major Mat from number[][]. */

/** adaptthresh(I[,sensitivity][,'Name',Value,...]) — locally adaptive threshold (Bradley).
 *  Mirrors MATLAB's adaptthresh: convert image to double in [0,1], compute a local
 *  first-order statistic over a neighborhood, scale by a sensitivity-derived factor,
 *  and saturate to [0,1]. Verified vs MATLAB R2026a for mean/median/gaussian & both polarities. */
function adaptthresh(a: Value[]): Mat {
  const A = m(a[0]);
  const R = A.rows, C = A.cols;
  // ---- parse options ----
  let sensitivity = 0.5;
  let statistic = 'mean';
  let polarityBright = true;
  // default NeighborhoodSize = 2*floor(size/16)+1 (per dimension)
  let nhr = 2 * Math.floor(R / 16) + 1;
  let nhc = 2 * Math.floor(C / 16) + 1;
  const rest = a.slice(1);
  let i = 0;
  if (rest.length && isMat(rest[0]) && !(rest[0] as Mat).isChar) { sensitivity = asScalar(rest[0]); i = 1; }
  for (; i + 1 < rest.length; i += 2) {
    const name = asString(rest[i]).toLowerCase();
    const val = rest[i + 1];
    if ('statistic'.startsWith(name)) statistic = asString(val).toLowerCase();
    else if ('foregroundpolarity'.startsWith(name)) polarityBright = asString(val).toLowerCase() === 'bright';
    else if ('neighborhoodsize'.startsWith(name)) {
      const sz = toArray(m(val));
      if (sz.length >= 2) { nhr = Math.round(sz[0]); nhc = Math.round(sz[1]); } else { nhr = nhc = Math.round(sz[0]); }
    }
  }
  // sensitivity -> scale factor
  const scaleFactor = polarityBright ? 0.6 + (1 - sensitivity) : 0.4 + sensitivity;
  // image to double in [0,1]
  const unit = toUnit(A);
  const I: number[][] = [];
  for (let r = 0; r < R; r++) { I[r] = []; for (let c = 0; c < C; c++) I[r][c] = unit[r + c * R]; }

  let T: number[][];
  if (statistic === 'mean') {
    // local mean over nhr×nhc with 'replicate' padding, then × scaleFactor.
    const kr = nhr, kc = nhc; const ker = Array.from({ length: kr }, () => new Array(kc).fill(1 / (kr * kc)));
    T = filter2d(I, ker, false, 'replicate').map((row) => row.map((v) => v * scaleFactor));
  } else if (statistic === 'median') {
    // local median over nhr×nhc with 'symmetric' padding, then × scaleFactor.
    T = localMedian(I, nhr, nhc).map((row) => row.map((v) => v * scaleFactor));
  } else { // gaussian: imgaussfilt(I, nhoodSize) — nhood used as sigma, replicate padding.
    const sigma = nhr; const sz = 2 * Math.ceil(2 * sigma) + 1;
    const ker = fspecial('gaussian', [{ kind: 'num', rows: 1, cols: 2, data: Float64Array.of(sz, sz) } as Mat, scalar(sigma)]);
    T = filter2d(I, ker, false, 'replicate').map((row) => row.map((v) => v * scaleFactor));
  }
  // saturate to [0,1]
  return fromRows(T.map((row) => row.map((v) => (v < 0 ? 0 : v > 1 ? 1 : v))));
}

/** Local median filter over an nhr×nhc neighborhood with 'symmetric' boundary (medfilt2). */
function localMedian(A: number[][], nhr: number, nhc: number): number[][] {
  const R = A.length, C = A[0]?.length ?? 0; const cy = Math.floor(nhr / 2), cx = Math.floor(nhc / 2);
  const rf = (k: number, n: number) => { k = ((k % (2 * n)) + 2 * n) % (2 * n); return k < n ? k : 2 * n - 1 - k; };
  const out: number[][] = [];
  for (let r = 0; r < R; r++) {
    out[r] = [];
    for (let c = 0; c < C; c++) {
      const win: number[] = [];
      for (let di = 0; di < nhr; di++) for (let dj = 0; dj < nhc; dj++) win.push(A[rf(r + di - cy, R)][rf(c + dj - cx, C)]);
      win.sort((x, y) => x - y);
      const n = win.length; out[r][c] = n % 2 ? win[(n - 1) / 2] : (win[n / 2 - 1] + win[n / 2]) / 2;
    }
  }
  return out;
}

/** Predefined 2-D filter kernels (subset of MATLAB fspecial). */
function fspecial(type: string, args: Value[]): number[][] {
  const a0 = args[0] && isMat(args[0]) ? toArray(m(args[0])) : null;
  switch (type) {
    case 'sobel': return [[1, 2, 1], [0, 0, 0], [-1, -2, -1]];
    case 'prewitt': return [[1, 1, 1], [0, 0, 0], [-1, -1, -1]];
    case 'average': { let r = 3, c = 3; if (a0) { if (a0.length >= 2) { r = a0[0]; c = a0[1]; } else r = c = Math.round(a0[0]); } const v = 1 / (r * c); return Array.from({ length: r }, () => new Array(c).fill(v)); }
    case 'laplacian': { const al = a0 ? a0[0] : 0.2; const h1 = al / (al + 1), h2 = (1 - al) / (al + 1), h3 = -4 / (al + 1); return [[h1, h2, h1], [h2, h3, h2], [h1, h2, h1]]; }
    case 'gaussian': { let r = 3, c = 3; if (a0) { if (a0.length >= 2) { r = a0[0]; c = a0[1]; } else r = c = Math.round(a0[0]); } const sig = args[1] && isMat(args[1]) ? asScalar(args[1]) : 0.5; const cy = (r - 1) / 2, cx = (c - 1) / 2; const g: number[][] = []; let sum = 0; for (let i = 0; i < r; i++) { g[i] = []; for (let j = 0; j < c; j++) { const v = Math.exp(-(((i - cy) ** 2) + ((j - cx) ** 2)) / (2 * sig * sig)); g[i][j] = v; sum += v; } } return g.map((row) => row.map((v) => v / sum)); }
    case 'disk': { const rad = a0 ? Math.round(a0[0]) : 5; const n = 2 * rad + 1; const k: number[][] = []; let sum = 0; for (let i = 0; i < n; i++) { k[i] = []; for (let j = 0; j < n; j++) { const inside = (i - rad) ** 2 + (j - rad) ** 2 <= rad * rad ? 1 : 0; k[i][j] = inside; sum += inside; } } return k.map((row) => row.map((v) => v / sum)); }
    default: throw new Error(`fspecial: type '${type}' not supported`);
  }
}
/** 2-D correlation/convolution; boundary 0 (default), 'replicate', 'circular', or 'symmetric'. */
function filter2d(A: number[][], h: number[][], conv: boolean, boundary: number | string, shape: 'same' | 'full' = 'same'): number[][] {
  const R = A.length, C = A[0]?.length ?? 0, hr = h.length, hc = h[0]?.length ?? 0;
  const cy = Math.floor((hr - 1) / 2), cx = Math.floor((hc - 1) / 2);   // MATLAB kernel anchor (matches odd; correct for even)
  const ker = conv ? h.map((row) => [...row].reverse()).reverse() : h;
  const get = (i: number, j: number): number => {
    if (i >= 0 && i < R && j >= 0 && j < C) return A[i][j];
    if (typeof boundary === 'number') return boundary;
    if (boundary === 'replicate') return A[Math.max(0, Math.min(R - 1, i))][Math.max(0, Math.min(C - 1, j))];
    if (boundary === 'circular') return A[((i % R) + R) % R][((j % C) + C) % C];
    const rf = (k: number, n: number) => { k = ((k % (2 * n)) + 2 * n) % (2 * n); return k < n ? k : 2 * n - 1 - k; };
    return A[rf(i, R)][rf(j, C)];   // symmetric
  };
  const out: number[][] = [];
  if (shape === 'full') {
    // 'same' is the central crop of 'full'; shift the anchor by (hr-1, hc-1).
    const oR = R + hr - 1, oC = C + hc - 1;
    for (let p = 0; p < oR; p++) { out[p] = []; for (let q = 0; q < oC; q++) { let s = 0; for (let di = 0; di < hr; di++) for (let dj = 0; dj < hc; dj++) s += ker[di][dj] * get(p - (hr - 1) + di, q - (hc - 1) + dj); out[p][q] = s; } }
    return out;
  }
  for (let i = 0; i < R; i++) { out[i] = []; for (let j = 0; j < C; j++) { let s = 0; for (let di = 0; di < hr; di++) for (let dj = 0; dj < hc; dj++) s += ker[di][dj] * get(i + di - cy, j + dj - cx); out[i][j] = s; } }
  return out;
}

// ---- integral images (Image Processing Toolbox) ----
// Ported from integralImage.m / integralImage3.m / integralBoxFilter.m /
// integralBoxFilter3.m (R2026a). The actual filtering builtin is compiled, but
// the semantics are the standard summed-area-table inclusion-exclusion.

/** integralImage(I[,'upright']) — upright summed-area table, zero-padded top & left.
 *  size(J) = size(I)+1; J(r,c) = sum of I(1:r-1, 1:c-1). Output class is double. */
function integralImage(a: Value[]): Promise<Value[]> {
  const I = m(a[0]);
  const R = I.rows, C = I.cols;
  const src = toArray(I);                       // honor integer/logical class numerically
  const oR = R + 1, oC = C + 1;
  const out = new Float64Array(oR * oC);
  for (let c = 1; c <= C; c++) {
    for (let r = 1; r <= R; r++) {
      // J(r+1,c+1) = I(r,c) + J(r,c+1) + J(r+1,c) - J(r,c)
      out[r + c * oR] = src[(r - 1) + (c - 1) * R]
        + out[(r - 1) + c * oR] + out[r + (c - 1) * oR] - out[(r - 1) + (c - 1) * oR];
    }
  }
  return ret({ kind: 'num', rows: oR, cols: oC, data: out } as Mat);
}

/** integralImage3(I) — 3-D integral image: size(J)=size(I)+1, zero-padded on the
 *  low side of every dimension; J = cumulative sum of I over all three dims. */
function integralImage3(a: Value[]): Promise<Value[]> {
  const I = m(a[0]);
  const dims = ndSize(I);
  const R = dims[0] ?? 0, C = dims[1] ?? 1, P = dims[2] ?? 1;
  const src = toArray(I);
  const oR = R + 1, oC = C + 1, oP = P + 1;
  const out = new Float64Array(oR * oC * oP);
  const sP = oR * oC;                            // page stride of the output
  for (let k = 1; k <= P; k++) {
    for (let c = 1; c <= C; c++) {
      for (let r = 1; r <= R; r++) {
        const v = src[(r - 1) + (c - 1) * R + (k - 1) * R * C];
        // 3-D inclusion-exclusion recurrence on the zero-padded table.
        const i = (i0: number, c0: number, k0: number) => out[i0 + c0 * oR + k0 * sP];
        out[r + c * oR + k * sP] = v
          + i(r - 1, c, k) + i(r, c - 1, k) + i(r, c, k - 1)
          - i(r - 1, c - 1, k) - i(r - 1, c, k - 1) - i(r, c - 1, k - 1)
          + i(r - 1, c - 1, k - 1);
      }
    }
  }
  return ret(makeND([oR, oC, oP], out));
}

/** Parse a 2- or 3-element filter size (scalar => isotropic). */
function parseFilterSize(v: Value | undefined, ndim: number, def: number): number[] {
  if (v === undefined || !isMat(v)) return new Array(ndim).fill(def);
  const d = toArray(m(v));
  if (d.length === 1) return new Array(ndim).fill(Math.round(d[0]));
  return d.slice(0, ndim).map((x) => Math.round(x));
}

/** Read the optional NormalizationFactor name/value (default: 1/prod(filterSize)). */
function normFactorFrom(a: Value[], start: number, def: number): number {
  for (let i = start; i + 1 < a.length; i++) {
    if (isMat(a[i]) && (a[i] as Mat).isChar) {
      const name = asString(a[i]).toLowerCase();
      if ('normalizationfactor'.startsWith(name)) return asScalar(a[i + 1]);
    }
  }
  return def;
}

/** integralBoxFilter(intA[,filterSize][,'NormalizationFactor',v]) — 2-D box filter
 *  via a summed-area table. Output size = size(intA) - filterSize. */
function integralBoxFilter(a: Value[]): Promise<Value[]> {
  const J = m(a[0]);
  const oR = J.rows, oC = J.cols;
  const jd = J.data;
  const fsArg = a.length >= 2 && isMat(a[1]) && !(a[1] as Mat).isChar ? a[1] : undefined;
  const fs = parseFilterSize(fsArg, 2, 3);
  const fm = fs[0], fn = fs[1];
  const norm = normFactorFrom(a, fsArg ? 2 : 1, 1 / (fm * fn));
  const bR = oR - fm, bC = oC - fn;
  const out = new Float64Array(bR * bC);
  for (let c = 0; c < bC; c++) {
    for (let r = 0; r < bR; r++) {
      // sum over intA[r..r+fm, c..c+fn] (the SAT corners), then normalize.
      const s = jd[(r + fm) + (c + fn) * oR] - jd[(r + fm) + c * oR]
        - jd[r + (c + fn) * oR] + jd[r + c * oR];
      out[r + c * bR] = s * norm;
    }
  }
  return ret({ kind: 'num', rows: bR, cols: bC, data: out } as Mat);
}

/** integralBoxFilter3(intA[,filterSize][,'NormalizationFactor',v]) — 3-D box filter
 *  via a 3-D summed-area table (8-corner inclusion-exclusion). Output size =
 *  size(intA) - filterSize. Default filterSize=[3 3 3], normFactor=1/prod(fs). */
function integralBoxFilter3(a: Value[]): Promise<Value[]> {
  const J = m(a[0]);
  const dims = ndSize(J);
  const oR = dims[0] ?? 0, oC = dims[1] ?? 1, oP = dims[2] ?? 1;
  const jd = J.data;
  const sP = oR * oC;
  const fsArg = a.length >= 2 && isMat(a[1]) && !(a[1] as Mat).isChar ? a[1] : undefined;
  const fs = parseFilterSize(fsArg, 3, 3);
  const fm = fs[0], fn = fs[1], fp = fs[2];
  const norm = normFactorFrom(a, fsArg ? 2 : 1, 1 / (fm * fn * fp));
  const bR = oR - fm, bC = oC - fn, bP = oP - fp;
  const out = new Float64Array(bR * bC * bP);
  const obP = bR * bC;
  const J3 = (r: number, c: number, k: number) => jd[r + c * oR + k * sP];
  for (let k = 0; k < bP; k++) {
    for (let c = 0; c < bC; c++) {
      for (let r = 0; r < bR; r++) {
        const r1 = r + fm, c1 = c + fn, k1 = k + fp;
        const s = J3(r1, c1, k1) - J3(r, c1, k1) - J3(r1, c, k1) - J3(r1, c1, k)
          + J3(r, c, k1) + J3(r, c1, k) + J3(r1, c, k) - J3(r, c, k);
        out[r + c * bR + k * obP] = s * norm;
      }
    }
  }
  return ret(makeND([bR, bC, bP], out));
}

// ---- regionprops (Image Processing Toolbox) ----
// Ported from regionprops.m (R2026a). 2-D, 8-connectivity (the bwconncomp
// default). Regions are labeled in MATLAB column-major scan order (increasing
// linear pixel index). Coordinates are 1-based with the MATLAB pixel-center
// convention: pixel (row r, col c) has center (x=c, y=r). Validated vs live
// MATLAB R2026a (Area, Centroid, BoundingBox, Extent, FilledArea, Perimeter,
// MajorAxisLength, MinorAxisLength, Orientation, Eccentricity, EquivDiameter).

/** All deterministic shape properties this implementation supports. */
const RP_PROPS = [
  'Area', 'Centroid', 'BoundingBox', 'PixelIdxList', 'PixelList', 'Extent',
  'FilledArea', 'Perimeter', 'MajorAxisLength', 'MinorAxisLength',
  'Orientation', 'Eccentricity', 'EquivDiameter',
] as const;
type RPProp = typeof RP_PROPS[number];

/** Label connected components of a binary image with 8-connectivity, in
 *  MATLAB column-major (increasing linear index) labeling order. Returns, per
 *  region, the sorted list of linear (column-major, 0-based) pixel indices. */
function bwLabel8(BW: number[][], R: number, C: number): number[][] {
  const label = new Int32Array(R * C).fill(0);
  const regions: number[][] = [];
  const idx = (r: number, c: number) => r + c * R;        // 0-based column-major
  // Scan in column-major order so region labels follow MATLAB convention.
  for (let c = 0; c < C; c++) {
    for (let r = 0; r < R; r++) {
      if (!BW[r][c] || label[idx(r, c)] !== 0) continue;
      const lab = regions.length + 1;
      const pix: number[] = [];
      const stack: Array<[number, number]> = [[r, c]];
      label[idx(r, c)] = lab;
      while (stack.length) {
        const [pr, pc] = stack.pop()!;
        pix.push(idx(pr, pc));
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = pr + dr, nc = pc + dc;
            if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
            if (BW[nr][nc] && label[idx(nr, nc)] === 0) { label[idx(nr, nc)] = lab; stack.push([nr, nc]); }
          }
        }
      }
      pix.sort((x, y) => x - y);                            // sorted linear indices
      regions.push(pix);
    }
  }
  return regions;
}

/** Moore-neighbor boundary trace (8-connected, clockwise) of a single region's
 *  cropped binary image `im` (1-based pixel grid), matching MATLAB
 *  bwboundaries/regionboundaries: start at the first foreground pixel in
 *  column-major order, return an N×2 closed list of [row,col] (start repeated). */
function traceBoundary(im: boolean[][], R: number, C: number): Array<[number, number]> {
  // Find start: first foreground pixel in column-major order.
  let sr = -1, sc = -1;
  outer: for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) if (im[r][c]) { sr = r; sc = c; break outer; }
  if (sr < 0) return [];
  // single pixel
  let count = 0; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (im[r][c]) count++;
  if (count === 1) return [[sr + 1, sc + 1]];
  // 8-neighborhood offsets, clockwise starting from West (matches MATLAB trace order).
  const d8: Array<[number, number]> = [
    [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1],
  ];
  const inb = (r: number, c: number) => r >= 0 && r < R && c >= 0 && c < C && im[r][c];
  const boundary: Array<[number, number]> = [];
  // backtrack direction: came into start from the left (West neighbor is empty here by scan).
  let cr = sr, cc = sc, bdir = 0;                          // previous-explore direction index
  // Initial backtrack points to where we "came from": west of start.
  let prevR = sr, prevC = sc - 1;
  let first = true;
  const maxSteps = 8 * R * C + 16;
  let steps = 0;
  while (steps++ < maxSteps) {
    boundary.push([cr + 1, cc + 1]);
    // direction from current pixel back to the backtrack (previous) pixel
    let start = -1;
    for (let i = 0; i < 8; i++) if (cr + d8[i][0] === prevR && cc + d8[i][1] === prevC) { start = i; break; }
    if (start < 0) start = 0;
    let found = false;
    for (let k = 1; k <= 8; k++) {
      const i = (start + k) % 8;
      const nr = cr + d8[i][0], nc = cc + d8[i][1];
      if (inb(nr, nc)) {
        prevR = cr; prevC = cc; cr = nr; cc = nc; bdir = i; found = true; break;
      }
    }
    if (!found) break;                                     // isolated pixel (shouldn't happen here)
    // Stop when we return to the start pixel arriving from the same first step.
    if (!first && cr === sr && cc === sc) {
      // Reached start again; the Jacob stopping criterion: re-enter start. Close it.
      boundary.push([sr + 1, sc + 1]);
      break;
    }
    first = false;
    void bdir;
  }
  return boundary;
}

/** Perimeter from a closed boundary list (computePerimeterFromBoundary). */
function perimeterFromBoundary(B: Array<[number, number]>): number {
  if (B.length <= 2) return 0;
  const delta: Array<[number, number]> = [];
  for (let i = 1; i < B.length; i++) delta.push([(B[i][0] - B[i - 1][0]) ** 2, (B[i][1] - B[i - 1][1]) ** 2]);
  if (delta.length <= 1) return 0;
  const ext = [...delta, delta[0]];
  let nCorner = 0, nEven = 0, nOdd = 0;
  for (let i = 1; i < ext.length; i++) if (ext[i][0] - ext[i - 1][0] !== 0 || ext[i][1] - ext[i - 1][1] !== 0) nCorner++;
  for (const d of delta) { const even = d[0] === 0 || d[1] === 0; if (even) nEven++; else nOdd++; }
  return nEven * 0.980 + nOdd * 1.406 - nCorner * 0.091;
}

/** regionprops(BW[,props...]) — N×1 struct array, one element per region. */
function regionprops(args: Value[]): StructV {
  const BWm = m(args[0]);
  const R = BWm.rows, C = BWm.cols;
  const bwData = toArray(BWm);
  const BW: number[][] = [];
  for (let r = 0; r < R; r++) { BW[r] = []; for (let c = 0; c < C; c++) BW[r][c] = bwData[r + c * R] ? 1 : 0; }

  // ---- parse requested properties ----
  let req: RPProp[] = [];
  let listed = false;
  for (const arg of args.slice(1)) {
    if (!isMat(arg) || !(arg as Mat).isChar) continue;     // ignore label matrices / grayscale image / 'struct'
    const s = asString(arg);
    const sl = s.toLowerCase();
    if (sl === 'struct' || sl === 'table') continue;
    listed = true;
    if (sl === 'basic') { req.push('Area', 'Centroid', 'BoundingBox'); continue; }
    const match = RP_PROPS.find((p) => p.toLowerCase() === sl);
    if (match) req.push(match);
    else throw new Error(`regionprops: property '${s}' is not supported`);
  }
  if (!listed) req = ['Area', 'Centroid', 'BoundingBox'];

  // A logical/binary image is labeled by 8-connectivity; a numeric LABEL matrix L groups pixels by
  // label value (region k = all pixels equal to k, 1..max(L), keeping empty labels — MATLAB behavior).
  let regions: number[][];
  if ((BWm as Mat).isBool !== true && bwData.some((v) => v !== 0 && v !== 1)) {
    let maxL = 0; for (const v of bwData) if (Number.isInteger(v) && v > maxL) maxL = v;
    regions = Array.from({ length: maxL }, () => [] as number[]);
    for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) { const v = bwData[r + c * R]; if (Number.isInteger(v) && v >= 1) regions[v - 1].push(r + c * R); }
  } else {
    regions = bwLabel8(BW, R, C);
  }
  const N = regions.length;

  // Build each field as a per-region Value[].
  const fields = new Map<string, Value[]>();
  const ensure = (name: string) => { if (!fields.has(name)) fields.set(name, []); return fields.get(name)!; };

  for (let k = 0; k < N; k++) {
    const pix = regions[k];                                // 0-based column-major linear indices
    const area = pix.length;
    // Per-pixel rows/cols (1-based) and bounding box.
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    let sumR = 0, sumC = 0;
    const rows: number[] = [], cols: number[] = [];
    for (const li of pix) {
      const r = li % R, c = Math.floor(li / R);            // 0-based
      rows.push(r); cols.push(c);
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (c < minC) minC = c; if (c > maxC) maxC = c;
      sumR += r; sumC += c;
    }
    const bh = maxR - minR + 1, bw = maxC - minC + 1;

    for (const p of req) {
      switch (p) {
        case 'Area': ensure('Area').push(scalar(area)); break;
        case 'Centroid': {
          // [x y], 1-based: x = mean(col)+1, y = mean(row)+1 (0-based means +1 → 1-based center)
          const cx = sumC / area + 1, cy = sumR / area + 1;
          ensure('Centroid').push(rowVec2(cx, cy));
          break;
        }
        case 'BoundingBox': {
          // [x y w h]; x,y are the top-left corner: (minCol+1)-0.5, (minRow+1)-0.5.
          ensure('BoundingBox').push(rowVec4(minC + 0.5, minR + 0.5, bw, bh));
          break;
        }
        case 'PixelIdxList': {
          // 1-based linear indices, column n.
          ensure('PixelIdxList').push(colVec(pix.map((li) => li + 1)));
          break;
        }
        case 'PixelList': {
          // N×2 [x y] = [col+1 row+1]; ordered by increasing linear index.
          const M = zeros(area, 2);
          for (let i = 0; i < area; i++) { M.data[i] = cols[i] + 1; M.data[i + area] = rows[i] + 1; }
          ensure('PixelList').push(M);
          break;
        }
        case 'Extent': ensure('Extent').push(scalar(area / (bw * bh))); break;
        case 'FilledArea':
          // No holes are filled for an 8-connected foreground region without
          // explicit hole computation; for solid regions FilledArea == Area.
          ensure('FilledArea').push(scalar(filledArea(rows, cols, minR, minC, bh, bw)));
          break;
        case 'Perimeter': {
          const im = cropImage(rows, cols, minR, minC, bh, bw);
          ensure('Perimeter').push(scalar(perimeterFromBoundary(traceBoundary(im, bh, bw))));
          break;
        }
        case 'MajorAxisLength': case 'MinorAxisLength': case 'Orientation': case 'Eccentricity': {
          const e = ellipseParams(rows, cols, sumR / area, sumC / area, area);
          if (p === 'MajorAxisLength') ensure('MajorAxisLength').push(scalar(e.major));
          else if (p === 'MinorAxisLength') ensure('MinorAxisLength').push(scalar(e.minor));
          else if (p === 'Orientation') ensure('Orientation').push(scalar(e.orient));
          else ensure('Eccentricity').push(scalar(e.ecc));
          break;
        }
        case 'EquivDiameter': ensure('EquivDiameter').push(scalar((2 / Math.sqrt(Math.PI)) * Math.sqrt(area))); break;
      }
    }
  }
  // Preserve requested-property order in the field map (already insertion-ordered).
  // Ensure each requested field exists even when N === 0.
  for (const p of req) ensure(p);
  return { kind: 'struct', rows: N, cols: N ? 1 : 0, fields } as StructV;
}

/** 1×2 row vector [a b]. */
function rowVec2(a: number, b: number): Mat { const o = zeros(1, 2); o.data[0] = a; o.data[1] = b; return o; }
/** 1×4 row vector [a b c d]. */
function rowVec4(a: number, b: number, c: number, d: number): Mat { const o = zeros(1, 4); o.data[0] = a; o.data[1] = b; o.data[2] = c; o.data[3] = d; return o; }

/** Cropped boolean image of a region (bh×bw), rows/cols are 0-based pixel coords. */
function cropImage(rows: number[], cols: number[], minR: number, minC: number, bh: number, bw: number): boolean[][] {
  const im: boolean[][] = Array.from({ length: bh }, () => new Array(bw).fill(false));
  for (let i = 0; i < rows.length; i++) im[rows[i] - minR][cols[i] - minC] = true;
  return im;
}

/** FilledArea = area + number of background holes inside the cropped region
 *  (4-connected background not reachable from the crop border). */
function filledArea(rows: number[], cols: number[], minR: number, minC: number, bh: number, bw: number): number {
  const im = cropImage(rows, cols, minR, minC, bh, bw);
  // Flood-fill background (4-connected) from the border; anything not reached is a hole.
  const seen: boolean[][] = Array.from({ length: bh }, () => new Array(bw).fill(false));
  const stack: Array<[number, number]> = [];
  const push = (r: number, c: number) => { if (r >= 0 && r < bh && c >= 0 && c < bw && !im[r][c] && !seen[r][c]) { seen[r][c] = true; stack.push([r, c]); } };
  for (let c = 0; c < bw; c++) { push(0, c); push(bh - 1, c); }
  for (let r = 0; r < bh; r++) { push(r, 0); push(r, bw - 1); }
  while (stack.length) { const [r, c] = stack.pop()!; push(r - 1, c); push(r + 1, c); push(r, c - 1); push(r, c + 1); }
  let holes = 0;
  for (let r = 0; r < bh; r++) for (let c = 0; c < bw; c++) if (!im[r][c] && !seen[r][c]) holes++;
  return rows.length + holes;
}

/** Second-moment ellipse parameters (Haralick & Shapiro). rows/cols are 0-based;
 *  meanR/meanC are 0-based pixel-coordinate means. Lengths/angle match MATLAB. */
function ellipseParams(rows: number[], cols: number[], meanR: number, meanC: number, N: number): { major: number; minor: number; orient: number; ecc: number } {
  if (N === 0) return { major: 0, minor: 0, orient: 0, ecc: 0 };
  // x = col - xbar (1-based equivalent cancels), y = -(row - ybar).
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < N; i++) {
    const x = cols[i] - meanC;
    const y = -(rows[i] - meanR);
    sxx += x * x; syy += y * y; sxy += x * y;
  }
  const uxx = sxx / N + 1 / 12;
  const uyy = syy / N + 1 / 12;
  const uxy = sxy / N;
  const common = Math.sqrt((uxx - uyy) ** 2 + 4 * uxy ** 2);
  const major = 2 * Math.SQRT2 * Math.sqrt(uxx + uyy + common);
  const minor = 2 * Math.SQRT2 * Math.sqrt(uxx + uyy - common);
  const ecc = major === 0 ? 0 : 2 * Math.sqrt((major / 2) ** 2 - (minor / 2) ** 2) / major;
  let num: number, den: number;
  if (uyy > uxx) { num = uyy - uxx + Math.sqrt((uyy - uxx) ** 2 + 4 * uxy ** 2); den = 2 * uxy; }
  else { num = 2 * uxy; den = uxx - uyy + Math.sqrt((uxx - uyy) ** 2 + 4 * uxy ** 2); }
  const orient = (num === 0 && den === 0) ? 0 : (180 / Math.PI) * Math.atan(num / den);
  return { major, minor, orient, ecc };
}

// ─────────────────────────────────────────────────────────────────────────────
// Spatial-statistics filters & quality metrics (verified vs MATLAB R2026a).
// ND data are kept column-major in plain number[] with a size vector dims[].
// ─────────────────────────────────────────────────────────────────────────────

/** Read a Mat to {data: number[] (column-major, double), dims: number[]}. */
function ndData(M: Mat): { data: number[]; dims: number[] } {
  return { data: Array.from(toArray(M)), dims: ndSize(M) };
}
/** Build a Mat (2-D or N-D) from column-major data + dims. */
function ndMat(data: number[], dims: number[]): Mat {
  return makeND(dims, Float64Array.from(data));
}
const prodN = (a: number[]) => a.reduce((p, x) => p * x, 1);
/** Strides for a column-major array of the given dims. */
function ndStrides(dims: number[]): number[] {
  const s = [1]; for (let i = 1; i < dims.length; i++) s[i] = s[i - 1] * dims[i - 1]; return s;
}
/** Map a (possibly out-of-range) per-dim index to a source index per padding method. */
function padIdx(i: number, n: number, method: string): number {
  if (i >= 0 && i < n) return i;
  if (method === 'circular') return ((i % n) + n) % n;
  if (method === 'replicate') return i < 0 ? 0 : n - 1;
  if (method === 'symmetric') { const p = ((i % (2 * n)) + 2 * n) % (2 * n); return p < n ? p : 2 * n - 1 - p; }
  return -1; // 'zeros'/numeric sentinel
}
/** Parse Name/Value 'Padding' (string method or numeric scalar) from arg list. */
function parsePadding(args: Value[], dflt: string | number): { method: string; padVal: number } {
  let method: string = typeof dflt === 'string' ? dflt : 'zeros';
  let padVal = typeof dflt === 'number' ? dflt : 0;
  for (let k = 0; k < args.length - 1; k++) {
    if (isMat(args[k]) && (args[k] as Mat).isChar && asString(args[k]).toLowerCase() === 'padding') {
      const v = args[k + 1];
      if (isMat(v) && (v as Mat).isChar) { method = asString(v).toLowerCase(); }
      else { method = 'zeros'; padVal = asScalar(v); }
    }
  }
  return { method, padVal };
}
/** General ND box filter (mean / sum) with the given padding & normalization. */
function boxFilterND(data: number[], dims: number[], fsz: number[], method: string, padVal: number, norm: number): number[] {
  const ndim = dims.length;
  const fs = fsz.slice(); while (fs.length < ndim) fs.push(1);
  const rad = fs.map((s) => Math.floor(s / 2));
  const str = ndStrides(dims);
  const total = prodN(dims);
  const out = new Array(total).fill(0);
  const sub = new Array(ndim).fill(0);
  for (let lin = 0; lin < total; lin++) {
    // decode column-major subscript
    let rem = lin; for (let d = 0; d < ndim; d++) { sub[d] = rem % dims[d]; rem = Math.floor(rem / dims[d]); }
    let s = 0;
    // iterate over the neighborhood window
    const off = new Array(ndim).fill(0);
    const wtot = prodN(fs);
    for (let w = 0; w < wtot; w++) {
      let wr = w, srcLin = 0, oob = false;
      for (let d = 0; d < ndim; d++) {
        const k = wr % fs[d]; wr = Math.floor(wr / fs[d]);
        const idx = padIdx(sub[d] + k - rad[d], dims[d], method);
        if (idx < 0) { oob = true; break; }
        srcLin += idx * str[d];
      }
      void off;
      s += oob ? padVal : data[srcLin];
    }
    out[lin] = s * norm;
  }
  return out;
}
function imboxfiltFn(a: Value[]): Mat {
  const { data, dims } = ndData(m(a[0]));
  // filterSize: first non-string arg after image
  let fsz = [3, 3];
  const rest = a.slice(1);
  let nv = 0;
  if (rest.length && isMat(rest[0]) && !(rest[0] as Mat).isChar) {
    const s = toArray(m(rest[0])); fsz = s.length >= 2 ? [Math.round(s[0]), Math.round(s[1])] : [Math.round(s[0]), Math.round(s[0])]; nv = 1;
  }
  const { method, padVal } = parsePadding(rest.slice(nv), 'replicate');
  let norm = 1 / (fsz[0] * fsz[1]);
  for (let k = nv; k < rest.length - 1; k++) if (isMat(rest[k]) && (rest[k] as Mat).isChar && asString(rest[k]).toLowerCase() === 'normalizationfactor') norm = asScalar(rest[k + 1]);
  const out = boxFilterND(data, dims.slice(0, 2), fsz, method, padVal, norm);
  return ndMat(out, dims.slice(0, 2));
}
function imboxfilt3Fn(a: Value[]): Mat {
  const { data, dims } = ndData(m(a[0]));
  let fsz = [3, 3, 3];
  const rest = a.slice(1);
  let nv = 0;
  if (rest.length && isMat(rest[0]) && !(rest[0] as Mat).isChar) {
    const s = toArray(m(rest[0])); fsz = s.length >= 3 ? [Math.round(s[0]), Math.round(s[1]), Math.round(s[2])] : [Math.round(s[0]), Math.round(s[0]), Math.round(s[0])]; nv = 1;
  }
  const { method, padVal } = parsePadding(rest.slice(nv), 'replicate');
  let norm = 1 / (fsz[0] * fsz[1] * fsz[2]);
  for (let k = nv; k < rest.length - 1; k++) if (isMat(rest[k]) && (rest[k] as Mat).isChar && asString(rest[k]).toLowerCase() === 'normalizationfactor') norm = asScalar(rest[k + 1]);
  const D = dims.length >= 3 ? dims.slice(0, 3) : [dims[0], dims[1], 1];
  const out = boxFilterND(data, D, fsz, method, padVal, norm);
  return ndMat(out, D);
}

/** 1-D Gaussian kernel matching images.internal.createGaussianKernel (eps suppression). */
function gauss1D(sigma: number, hsize: number): number[] {
  const r = (hsize - 1) / 2; const h: number[] = [];
  for (let x = -r; x <= r; x++) h.push(Math.exp(-(x * x) / (sigma * sigma) / 2));
  const mx = Math.max(...h); const EPS = 2.220446049250313e-16;
  for (let i = 0; i < h.length; i++) if (h[i] < EPS * mx) h[i] = 0;
  const sum = h.reduce((p, x) => p + x, 0);
  return sum !== 0 ? h.map((v) => v / sum) : h;
}
/** Separable 1-D correlation along dimension `dim` (column-major), with padding. */
function corr1D(data: number[], dims: number[], dim: number, ker: number[], method: string, padVal: number): number[] {
  const ndim = dims.length; const str = ndStrides(dims); const total = prodN(dims);
  const rad = Math.floor(ker.length / 2);
  const n = dims[dim];
  const out = new Array(total).fill(0);
  const sub = new Array(ndim).fill(0);
  for (let lin = 0; lin < total; lin++) {
    let rem = lin; for (let d = 0; d < ndim; d++) { sub[d] = rem % dims[d]; rem = Math.floor(rem / dims[d]); }
    let s = 0;
    for (let t = 0; t < ker.length; t++) {
      const idx = padIdx(sub[dim] + t - rad, n, method);
      const v = idx < 0 ? padVal : data[lin + (idx - sub[dim]) * str[dim]];
      s += ker[t] * v;
    }
    out[lin] = s;
  }
  return out;
}
function imgaussfilt3Fn(a: Value[]): Mat {
  const { data, dims } = ndData(m(a[0]));
  let sigma = 0.5;
  const rest = a.slice(1);
  let nv = 0;
  if (rest.length && isMat(rest[0]) && !(rest[0] as Mat).isChar) { sigma = asScalar(rest[0]); nv = 1; }
  const sig3 = [sigma, sigma, sigma];
  let hsize = sig3.map((s) => 2 * Math.ceil(2 * s) + 1);
  for (let k = nv; k < rest.length - 1; k++) {
    if (!isMat(rest[k]) || !(rest[k] as Mat).isChar) continue;
    const name = asString(rest[k]).toLowerCase();
    if (name === 'filtersize') { const s = toArray(m(rest[k + 1])); hsize = s.length >= 3 ? [Math.round(s[0]), Math.round(s[1]), Math.round(s[2])] : [Math.round(s[0]), Math.round(s[0]), Math.round(s[0])]; }
  }
  const { method, padVal } = parsePadding(rest.slice(nv), 'replicate');
  const D = dims.length >= 3 ? dims.slice(0, 3) : [dims[0], dims[1], 1];
  let cur = data;
  for (let d = 0; d < 3; d++) cur = corr1D(cur, D, d, gauss1D(sig3[d], hsize[d]), method, padVal);
  return ndMat(cur, D);
}

/** Generic ND sliding-window reducer with the given neighborhood (column-major). */
function windowReduce(data: number[], dims: number[], fs: number[], method: string, padVal: number, reduce: (win: number[], center: number) => number): number[] {
  const ndim = dims.length; const str = ndStrides(dims); const total = prodN(dims);
  const rad = fs.map((s) => Math.floor(s / 2)); const wtot = prodN(fs);
  const out = new Array(total).fill(0); const sub = new Array(ndim).fill(0);
  for (let lin = 0; lin < total; lin++) {
    let rem = lin; for (let d = 0; d < ndim; d++) { sub[d] = rem % dims[d]; rem = Math.floor(rem / dims[d]); }
    const win: number[] = [];
    for (let w = 0; w < wtot; w++) {
      let wr = w, srcLin = 0, oob = false;
      for (let d = 0; d < ndim; d++) {
        const k = wr % fs[d]; wr = Math.floor(wr / fs[d]);
        const idx = padIdx(sub[d] + k - rad[d], dims[d], method);
        if (idx < 0) { oob = true; break; }
        srcLin += idx * str[d];
      }
      win.push(oob ? padVal : data[srcLin]);
    }
    // center of the (odd-sized) window is at the middle flattened index
    const cw = Math.floor(wtot / 2);
    out[lin] = reduce(win, win[cw]);
  }
  return out;
}
function parseSizePadopt(rest: Value[], ndim: number, dfltSize: number[]): { fs: number[]; method: string; padVal: number } {
  let fs = dfltSize.slice(); let method = 'symmetric'; let padVal = 0;
  for (const arg of rest) {
    if (isMat(arg) && (arg as Mat).isChar) { const s = asString(arg).toLowerCase(); if (s === 'replicate' || s === 'symmetric' || s === 'circular') method = s; else if (s === 'zeros') { method = 'zeros'; padVal = 0; } }
    else if (isMat(arg)) { const s = toArray(m(arg)); if (s.length >= ndim) fs = s.slice(0, ndim).map((x) => Math.round(x)); else fs = new Array(ndim).fill(Math.round(s[0])); }
  }
  return { fs, method, padVal };
}
function medfilt3Fn(a: Value[]): Mat {
  const { data, dims } = ndData(m(a[0]));
  const D = dims.length >= 3 ? dims.slice(0, 3) : [dims[0], dims[1], 1];
  const { fs, method, padVal } = parseSizePadopt(a.slice(1), 3, [3, 3, 3]);
  const out = windowReduce(data, D, fs, method, padVal, (win) => {
    const w = win.slice().sort((x, y) => x - y); const n = w.length;
    return n % 2 ? w[(n - 1) / 2] : (w[n / 2 - 1] + w[n / 2]) / 2;
  });
  return ndMat(out, D);
}
/** modefilt window reducer: the most-frequent value; on a tie, the center value if it
 *  is among the max-count values, otherwise the smallest such value (matches R2026a). */
function modeOf(win: number[], center: number): number {
  const counts = new Map<number, number>();
  for (const v of win) counts.set(v, (counts.get(v) ?? 0) + 1);
  let maxCount = 0; for (const c of counts.values()) if (c > maxCount) maxCount = c;
  if ((counts.get(center) ?? 0) === maxCount) return center;
  let best = Infinity;
  for (const [v, c] of counts) if (c === maxCount && v < best) best = v;
  return best;
}
function modefiltFn(a: Value[]): Mat {
  const Mt = m(a[0]); const { data, dims } = ndData(Mt);
  const ndim = (dims.length >= 3 && dims[2] > 1) ? 3 : 2;
  const D = ndim === 3 ? dims.slice(0, 3) : [dims[0], dims[1]];
  const { fs, method, padVal } = parseSizePadopt(a.slice(1), ndim, new Array(ndim).fill(3));
  const out = windowReduce(data, D, fs, method, padVal, modeOf);
  const o = ndMat(out, D);
  if (Mt.itype) return applyClass(o, Mt.itype); if (Mt.isBool) o.isBool = true;
  return o;
}

/** stdfilt — per algstdfilt: conv1 = imfilter(I.^2, h/n1, 'symmetric');
 *  conv2 = imfilter(I, h/sqrt(n*n1),'symmetric').^2; J = sqrt(max(conv1-conv2,0)). */
function stdfiltFn(a: Value[]): Mat {
  const Mt = m(a[0]); const { data, dims } = ndData(Mt);
  let h: number[]; let hdims: number[];
  if (a.length >= 2 && isMat(a[1])) { const hm = m(a[1]); h = Array.from(toArray(hm)); hdims = ndSize(hm); }
  else { h = new Array(9).fill(1); hdims = [3, 3]; }
  const n = h.reduce((p, x) => p + x, 0);
  if (n === 1) return ndMat(new Array(prodN(dims)).fill(0), dims);
  const n1 = n - 1;
  const D = dims.slice();
  const Hd = hdims.slice(); while (Hd.length < D.length) Hd.push(1);
  const sq = data.map((x) => x * x);
  const conv1 = corrNDmask(sq, D, h.map((x) => x / n1), Hd, 'symmetric', 0);
  const c2 = corrNDmask(data, D, h.map((x) => x / Math.sqrt(n * n1)), Hd, 'symmetric', 0);
  const out = conv1.map((v, i) => Math.sqrt(Math.max(v - c2[i] * c2[i], 0)));
  return ndMat(out, D);
}
/** ND correlation with an explicit mask (kernel) array (column-major), symmetric/etc padding. */
function corrNDmask(data: number[], dims: number[], ker: number[], kdims: number[], method: string, padVal: number): number[] {
  const ndim = dims.length; const str = ndStrides(dims); const total = prodN(dims);
  const kd = kdims.slice(); while (kd.length < ndim) kd.push(1);
  const rad = kd.map((s) => Math.floor(s / 2)); const wtot = prodN(kd);
  const out = new Array(total).fill(0); const sub = new Array(ndim).fill(0);
  for (let lin = 0; lin < total; lin++) {
    let rem = lin; for (let d = 0; d < ndim; d++) { sub[d] = rem % dims[d]; rem = Math.floor(rem / dims[d]); }
    let s = 0;
    for (let w = 0; w < wtot; w++) {
      let wr = w, srcLin = 0, oob = false;
      for (let d = 0; d < ndim; d++) {
        const k = wr % kd[d]; wr = Math.floor(wr / kd[d]);
        const idx = padIdx(sub[d] + k - rad[d], dims[d], method);
        if (idx < 0) { oob = true; break; }
        srcLin += idx * str[d];
      }
      s += ker[w] * (oob ? padVal : data[srcLin]);
    }
    out[lin] = s;
  }
  return out;
}
/** rangefilt — local max - local min over the neighborhood (zeros outside excluded). */
function rangefiltFn(a: Value[]): Mat {
  const Mt = m(a[0]); const { data, dims } = ndData(Mt);
  let fs: number[]; let nhood: number[] | null = null; let hdims: number[];
  if (a.length >= 2 && isMat(a[1])) { const hm = m(a[1]); nhood = Array.from(toArray(hm)); hdims = ndSize(hm); fs = hdims.slice(); }
  else { fs = [3, 3]; hdims = [3, 3]; }
  while (fs.length < dims.length) fs.push(1);
  // imdilate/imerode use infinite padding so out-of-image neighbors don't affect max/min.
  const D = dims.slice();
  const ndim = D.length; const str = ndStrides(D); const total = prodN(D);
  const Hd = hdims.slice(); while (Hd.length < ndim) Hd.push(1);
  const rad = Hd.map((s) => Math.floor(s / 2)); const wtot = prodN(Hd);
  const out = new Array(total).fill(0); const sub = new Array(ndim).fill(0);
  for (let lin = 0; lin < total; lin++) {
    let rem = lin; for (let d = 0; d < ndim; d++) { sub[d] = rem % D[d]; rem = Math.floor(rem / D[d]); }
    let mx = -Infinity, mn = Infinity;
    for (let w = 0; w < wtot; w++) {
      if (nhood && !nhood[w]) continue;
      let wr = w, srcLin = 0, oob = false;
      for (let d = 0; d < ndim; d++) {
        const k = wr % Hd[d]; wr = Math.floor(wr / Hd[d]);
        const idx = sub[d] + k - rad[d]; if (idx < 0 || idx >= D[d]) { oob = true; break; }
        srcLin += idx * str[d];
      }
      if (oob) continue;
      const v = data[srcLin]; if (v > mx) mx = v; if (v < mn) mn = v;
    }
    out[lin] = mx - mn;
  }
  const o = ndMat(out, D);
  // output class: same as input except signed int -> unsigned; logical -> logical
  if (Mt.itype === 'int16') return applyClass(o, 'uint16');
  if (Mt.itype) return applyClass(o, Mt.itype);
  return o;
}
/** entropyfilt — im2uint8 then local Shannon entropy over the (true(9) default) neighborhood. */
function entropyfiltFn(a: Value[]): Mat {
  const Mt = m(a[0]); const dims = ndSize(Mt);
  // im2uint8 of input (honor class)
  const unit = toUnit(Mt); // double in [0,1] honoring class
  const isBool = !!Mt.isBool;
  const u8 = unit.map((x) => isBool ? (x ? 1 : 0) : Math.round(clamp01(x) * 255));
  const nbins = isBool ? 2 : 256;
  let fs: number[]; let nhood: number[] | null = null; let hdims: number[];
  if (a.length >= 2 && isMat(a[1])) { const hm = m(a[1]); nhood = Array.from(toArray(hm)); hdims = ndSize(hm); fs = hdims.slice(); }
  else { fs = [9, 9]; hdims = [9, 9]; nhood = new Array(81).fill(1); }
  const D = dims.slice();
  const ndim = D.length; const str = ndStrides(D); const total = prodN(D);
  const Hd = hdims.slice(); while (Hd.length < ndim) Hd.push(1);
  const rad = Hd.map((s) => Math.floor(s / 2)); const wtot = prodN(Hd);
  const out = new Array(total).fill(0); const sub = new Array(ndim).fill(0);
  for (let lin = 0; lin < total; lin++) {
    let rem = lin; for (let d = 0; d < ndim; d++) { sub[d] = rem % D[d]; rem = Math.floor(rem / D[d]); }
    const hist = new Map<number, number>(); let cnt = 0;
    for (let w = 0; w < wtot; w++) {
      if (nhood && !nhood[w]) continue;
      let wr = w, srcLin = 0;
      for (let d = 0; d < ndim; d++) {
        const k = wr % Hd[d]; wr = Math.floor(wr / Hd[d]);
        const idx = padIdx(sub[d] + k - rad[d], D[d], 'symmetric'); // entropyfilt pads symmetric
        srcLin += idx * str[d];
      }
      const val = u8[srcLin]; hist.set(val, (hist.get(val) ?? 0) + 1); cnt++;
    }
    let e = 0; for (const c of hist.values()) { const p = c / cnt; if (p > 0) e -= p * Math.log2(p); }
    out[lin] = e; void nbins;
  }
  return ndMat(out, D);
}

/** ssim(A,ref[,Name,Value]) — SSIM index and map. Verified vs MATLAB R2026a default path. */
function ssimFn(a: Value[], nargout: number): Value[] {
  const Am = m(a[0]), Rm = m(a[1]);
  const dims = ndSize(Am), dimsR = ndSize(Rm);
  if (dims.length !== dimsR.length || dims.some((d, i) => d !== dimsR[i])) throw new Error('ssim: A and ref must be of the same size');
  const numSpatial = (dims.length >= 3 && dims[2] > 1) ? 3 : 2;
  // class-derived dynamic range
  const itype = Am.itype;
  const dynRange = itype === 'uint8' ? 255 : itype === 'uint16' ? 65535 : itype === 'int16' ? 65535 : 1;
  let radius = 1.5; let exponents = [1, 1, 1]; let C: number[] | null = null; let dynamicRange = dynRange;
  const rest = a.slice(2);
  for (let k = 0; k + 1 < rest.length; k += 2) {
    if (!isMat(rest[k]) || !(rest[k] as Mat).isChar) continue;
    const name = asString(rest[k]).toLowerCase();
    if (name === 'radius') radius = asScalar(rest[k + 1]);
    else if (name === 'exponents') exponents = Array.from(toArray(m(rest[k + 1])));
    else if (name === 'dynamicrange') dynamicRange = asScalar(rest[k + 1]);
    else if (name === 'regularizationconstants') C = Array.from(toArray(m(rest[k + 1])));
  }
  if (!C) C = [(0.01 * dynamicRange) ** 2, (0.03 * dynamicRange) ** 2, ((0.03 * dynamicRange) ** 2) / 2];
  const filtRadius = Math.ceil(radius * 3); const filtSize = 2 * filtRadius + 1;
  // signed-int offset
  let A: number[], REF: number[];
  if (itype === 'int16') { A = Array.from(toArray(Am)).map((x) => x + 32768); REF = Array.from(toArray(Rm)).map((x) => x + 32768); }
  else { A = Array.from(toArray(Am)); REF = Array.from(toArray(Rm)); }
  const D = numSpatial === 3 ? (dims.length >= 3 ? dims.slice(0, 3) : [dims[0], dims[1], 1]) : [dims[0], dims[1]];
  const ker = gauss1D(radius, filtSize);
  const gfilt = (x: number[]): number[] => { let cur = x; for (let d = 0; d < numSpatial; d++) cur = corr1D(cur, D, d, ker, 'replicate', 0); return cur; };
  let mux = gfilt(A), muy = gfilt(REF);
  const muxy = mux.map((v, i) => v * muy[i]);
  const mux2 = mux.map((v) => v * v), muy2 = muy.map((v) => v * v);
  const A2 = A.map((v) => v * v), R2 = REF.map((v) => v * v), AR = A.map((v, i) => v * REF[i]);
  const gA2 = gfilt(A2), gR2 = gfilt(R2), gAR = gfilt(AR);
  const sigmax2 = gA2.map((v, i) => Math.max(v - mux2[i], 0));
  const sigmay2 = gR2.map((v, i) => Math.max(v - muy2[i], 0));
  const sigmaxy = gAR.map((v, i) => v - muxy[i]);
  const total = prodN(D);
  const map = new Array(total);
  const expOnes = exponents[0] === 1 && exponents[1] === 1 && exponents[2] === 1;
  if (C[2] === C[1] / 2 && expOnes) {
    for (let i = 0; i < total; i++) {
      const num = (2 * muxy[i] + C[0]) * (2 * sigmaxy[i] + C[1]);
      const den = (mux2[i] + muy2[i] + C[0]) * (sigmax2[i] + sigmay2[i] + C[1]);
      map[i] = (C[0] > 0 && C[1] > 0) ? num / den : (den !== 0 ? num / den : 1);
    }
  } else {
    for (let i = 0; i < total; i++) {
      let v = 1;
      if (exponents[0] > 0) { const num = 2 * muxy[i] + C[0], den = mux2[i] + muy2[i] + C[0]; let c = C[0] > 0 ? num / den : (den !== 0 ? num / den : 1); if (exponents[0] !== Math.floor(exponents[0])) c = Math.max(c, 0); v *= c ** exponents[0]; }
      const ss = Math.sqrt(sigmax2[i] * sigmay2[i]);
      if (exponents[1] > 0) { const num = 2 * ss + C[1], den = sigmax2[i] + sigmay2[i] + C[1]; let c = C[1] > 0 ? num / den : (den !== 0 ? num / den : 1); if (exponents[1] !== Math.floor(exponents[1])) c = Math.max(c, 0); v *= c ** exponents[1]; }
      if (exponents[2] > 0) { const num = sigmaxy[i] + C[2], den = ss + C[2]; let c = C[2] > 0 ? num / den : (den !== 0 ? num / den : 1); if (exponents[2] !== Math.floor(exponents[2])) c = Math.max(c, 0); v *= c ** exponents[2]; }
      map[i] = v;
    }
  }
  const ssimval = map.reduce((p, x) => p + x, 0) / total;
  void mux; void muy;
  if (nargout >= 2) return [scalar(ssimval), ndMat(map, D)];
  return [scalar(ssimval)];
}
