// RF Toolbox — network-parameter conversions and 2-port amplifier figures of merit.
//
// Exact closed-form ports of the real MATLAB .m algorithms (faithful to `type <fn>`), validated to
// 1e-6 against live MATLAB R2026a with the 2-port S-matrix
//   S = [0.5+0.1i, 0.05-0.02i; 2.0+0.3i, 0.6-0.1i]  (Z0 = 50 ohm).
//
// Validated oracle values (MATLAB R2026a):
//   stabilityk(S)       k    = 1.89536201526
//                       b1   = 0.847159, b2 = 1.067159
//                       delta= 0.204 + 0.035i
//   gammams(S)          = 0.636299510932 - 0.0978408589362i
//   powergain(S,50,50,50)        Gt   = 4.09
//   powergain(S,50,50,'Ga')      Ga   = 6.49206349206
//   powergain(S,50,50,'Gp')      Gp   = 5.52702702703
//   powergain(S,'Gmag')          Gmag = 10.7131786033
//   powergain(S,'Gmsg')          Gmsg = 37.5545580135
//   s2abcd(S,50)  = [0.176222493888+0.0148166259169i, 28.2304400978-3.79706601467i;
//                    0.000534229828851+9.48655256724e-05i, 0.210452322738-0.0903178484108i]
//   abcd2h(A)     = [119.817060024+33.3783583768i, 0.115379101931-0.0143815971498i;
//                    -4.01262876716-1.72206223246i, 0.0019803016406+0.00130063714904i]
//   s2y(S,50)     = [0.00774500196906-0.00215758466533i, -0.000862581858171+0.000360325679269i;
//                    -0.0347933127682-0.00467978908555i, 0.00606202566238+0.00134020360322i]
//   s2z(S,50)     = [324.553608504-29.8978490159i, 37.3723112698-31.8079893697i;
//                    1814.6333361-322.232372727i, 352.790465908-231.708329873i]
//   abcd2s, y2s, z2s are exact round-trip inverses (max err < 1e-15).
//   s2scc(S4) of a 4-port (RFFLAG=1) common-mode block = [0.36, 0.56; 0.32+0.05i, 0.52-0.05i].
//
// Notes: S-parameters are complex; complex Mats carry an `idata` Float64Array (column-major).
// All conversions below handle the single-frequency 2-port (2x2) case used for validation; s2scc
// handles a general 2N-port single-ended input (RFFLAG selects the port ordering).

import type { Builtin } from '../builtins';
import { type Value, type Mat, scalar, toMat as m, isMat } from '../values';
import type { ToolboxModule } from './types';
import { HELP_RF } from '../help/toolbox-help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

// ── tiny complex-scalar helpers ──
type C = { re: number; im: number };
const c = (re: number, im = 0): C => ({ re, im });
const cadd = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im });
const csub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im });
const cmul = (a: C, b: C): C => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const cscale = (a: C, k: number): C => ({ re: a.re * k, im: a.im * k });
const cconj = (a: C): C => ({ re: a.re, im: -a.im });
const cabs2 = (a: C): number => a.re * a.re + a.im * a.im;
const cabs = (a: C): number => Math.hypot(a.re, a.im);
const cdiv = (a: C, b: C): C => {
  const d = cabs2(b);
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};
const csqrt = (a: C): C => {
  // principal square root of a complex number
  const r = cabs(a);
  const re = Math.sqrt((r + a.re) / 2);
  let im = Math.sqrt((r - a.re) / 2);
  if (a.im < 0) im = -im;
  return { re, im };
};

// ── Mat <-> 2x2 complex matrix bridge (column-major) ──
function elem(M: Mat, r: number, col: number): C {
  const idx = r + col * M.rows;
  return { re: M.data[idx], im: M.idata ? M.idata[idx] : 0 };
}
// Read a 2x2 (single-frequency) complex matrix from a Mat.
function get2x2(v: Value, ctx: string): [[C, C], [C, C]] {
  const M = m(v, ctx);
  if (M.rows !== 2 || M.cols !== 2)
    throw new Error(`${ctx} must be a 2x2 matrix of 2-port parameters`);
  return [
    [elem(M, 0, 0), elem(M, 0, 1)],
    [elem(M, 1, 0), elem(M, 1, 1)],
  ];
}
// Build a complex Mat from a row-major array of complex elements.
function mkMat(rows: number, cols: number, rowMajor: C[][]): Mat {
  const re = new Float64Array(rows * cols);
  const im = new Float64Array(rows * cols);
  let anyIm = false;
  for (let r = 0; r < rows; r++)
    for (let col = 0; col < cols; col++) {
      const e = rowMajor[r][col];
      re[r + col * rows] = e.re;
      im[r + col * rows] = e.im;
      if (e.im !== 0) anyIm = true;
    }
  const out: Mat = { kind: 'num', rows, cols, data: re };
  if (anyIm) out.idata = im;
  return out;
}
const mk2x2 = (a: C, b: C, cc: C, d: C): Mat => mkMat(2, 2, [[a, b], [cc, d]]);

// Reference impedance Z0 (scalar, real, default 50): K = sqrt(z0)*I, Kinv = (1/sqrt(z0))*I.
function z0Of(args: Value[], i: number): number {
  if (args[i] == null) return 50;
  const M = m(args[i], 'Z0');
  return M.data[0];
}

// ───────────────────────────── 2-port conversions ─────────────────────────────

// abcd2h: h = [b, a*d-b*c; -1, c] ./ d
function abcd2h(args: Value[]): Promise<Value[]> {
  const [[a, b], [cc, d]] = get2x2(args[0], 'ABCD_PARAMS');
  const det = csub(cmul(a, d), cmul(b, cc));
  return ret(mk2x2(cdiv(b, d), cdiv(det, d), cdiv(c(-1), d), cdiv(cc, d)));
}

// stabilityk: returns [k,b1,b2,delta]
function stabilityFactors(S: [[C, C], [C, C]]): { k: number; b1: number; b2: number; delta: C } {
  const s11 = S[0][0], s12 = S[0][1], s21 = S[1][0], s22 = S[1][1];
  const a11 = cabs2(s11);          // |s11|^2  (== abs(s11*s11))
  const a22 = cabs2(s22);
  const a1221 = cabs(cmul(s12, s21));
  const delta = csub(cmul(s11, s22), cmul(s12, s21));
  const ad = cabs2(delta);
  const k = (1 - a11 - a22 + ad) / a1221 / 2;
  const b1 = 1 + a11 - a22 - ad;
  const b2 = 1 - a11 + a22 - ad;
  return { k, b1, b2, delta };
}
function stabilityk(args: Value[], nargout: number): Promise<Value[]> {
  const S = get2x2(args[0], 'S_PARAMS');
  const { k, b1, b2, delta } = stabilityFactors(S);
  const out: Value[] = [scalar(k)];
  if (nargout >= 2) out.push(scalar(b1));
  if (nargout >= 3) out.push(scalar(b2));
  if (nargout >= 4) out.push(mkMat(1, 1, [[delta]]));
  return Promise.resolve(out);
}

// gammams: simultaneous-conjugate-match source reflection coefficient (scalar).
function gammams(args: Value[]): Promise<Value[]> {
  const S = get2x2(args[0], 'S_PARAMS');
  const { b1, delta } = stabilityFactors(S);
  const s11 = S[0][0], s22 = S[1][1];
  const C1 = csub(s11, cmul(delta, cconj(s22)));     // C1 = S11 - DELTA*conj(S22)
  // idx selection: |B1/C1/2| > 1
  const c1abs = cabs(C1);
  const test = Math.abs(b1 / c1abs / 2);
  let result: C = { re: NaN, im: NaN };
  if (test > 1) {
    const root = Math.sqrt(b1 * b1 - 4 * c1abs * c1abs); // real (B1^2 - 4|C1|^2 >= 0 when test>1)
    const sign = b1 > 0 ? -1 : b1 < 0 ? 1 : 0;
    if (sign !== 0) {
      // (B1 + sign*root) / C1 / 2
      const numr = c(b1 + sign * root);
      result = cscale(cdiv(numr, C1), 0.5);
    }
  }
  return ret(mkMat(1, 1, [[result]]));
}

// powergain: Gt / Ga / Gp / Gmag / Gmsg
const GAINTYPES = ['Gt', 'Ga', 'Gp', 'Gmag', 'Gmsg'];
function z2gamma(zl: number, z0: number): C {
  // (ZL - Z0)/(ZL + Z0), real impedances
  return c((zl - z0) / (zl + z0));
}
function powergain(args: Value[]): Promise<Value[]> {
  // Determine gaintype from the last string arg (default 'Gt').
  let gaintype = 'Gt';
  const rest: Value[] = [];
  const last = args[args.length - 1];
  let typeArgGiven = false;
  if (last && isMat(last) && last.isChar) {
    const s = String.fromCharCode(...(Array.from(last.data) as number[]));
    const found = GAINTYPES.find((g) => g.toLowerCase() === s.toLowerCase());
    if (found) { gaintype = found; typeArgGiven = true; }
  }
  // positional numeric args after S (skip the trailing type flag if present)
  const endIdx = typeArgGiven ? args.length - 1 : args.length;
  for (let i = 1; i < endIdx; i++) rest.push(args[i]);

  const S = get2x2(args[0], 'S_PARAMS');
  const s11 = S[0][0], s12 = S[0][1], s21 = S[1][0], s22 = S[1][1];
  const numAt = (i: number, def: number) => (rest[i] != null ? m(rest[i], 'Z').data[0] : def);

  let g: number;
  switch (gaintype) {
    case 'Gt': {
      const z0 = numAt(0, 50), zs = numAt(1, 50), zl = numAt(2, 50);
      const gammaL = z2gamma(zl, z0), gammaS = z2gamma(zs, z0);
      const denomC = csub(
        cmul(csub(c(1), cmul(s11, gammaS)), csub(c(1), cmul(s22, gammaL))),
        cmul(cmul(cmul(s12, s21), gammaS), gammaL),
      );
      g = (1 - cabs2(gammaS)) * cabs2(s21) * (1 - cabs2(gammaL)) / cabs2(denomC);
      break;
    }
    case 'Ga': {
      const z0 = numAt(0, 50), zs = numAt(1, 50);
      const gammaS = z2gamma(zs, z0);
      // gammaOut = S22 + (S12*S21*gammaS)/(1 - S11*gammaS)
      const gammaOut = cadd(s22, cdiv(cmul(cmul(s12, s21), gammaS), csub(c(1), cmul(s11, gammaS))));
      g = (1 - cabs2(gammaS)) * cabs2(s21) /
        (cabs2(csub(c(1), cmul(s11, gammaS))) * (1 - cabs2(gammaOut)));
      break;
    }
    case 'Gp': {
      const z0 = numAt(0, 50), zl = numAt(1, 50);
      const gammaL = z2gamma(zl, z0);
      // gammaIn = S11 + (S12*S21*gammaL)/(1 - S22*gammaL)
      const gammaIn = cadd(s11, cdiv(cmul(cmul(s12, s21), gammaL), csub(c(1), cmul(s22, gammaL))));
      g = cabs2(s21) * (1 - cabs2(gammaL)) /
        ((1 - cabs2(gammaIn)) * cabs2(csub(c(1), cmul(s22, gammaL))));
      break;
    }
    case 'Gmag': {
      const { k } = stabilityFactors(S);
      g = (cabs(s21) / cabs(s12)) * (k - Math.sqrt(k * k - 1));
      if (Math.abs(k) < 1) g = NaN;
      break;
    }
    case 'Gmsg':
      g = cabs(s21) / cabs(s12);
      break;
    default:
      g = NaN;
  }
  if (g < 0) g = NaN;
  return ret(scalar(g));
}

// s2abcd (n=1 closed form): M = I - S, P = I + S
function s2abcd(args: Value[]): Promise<Value[]> {
  const S = get2x2(args[0], 'S_PARAMS');
  const z0 = z0Of(args, 1);
  const K = Math.sqrt(z0);              // K11 = K22 = sqrt(z0)
  // P = I + S, M = I - S
  const P = [
    [cadd(c(1), S[0][0]), S[0][1]],
    [S[1][0], cadd(c(1), S[1][1])],
  ];
  const M = [
    [csub(c(1), S[0][0]), cscale(S[0][1], -1)],
    [cscale(S[1][0], -1), csub(c(1), S[1][1])],
  ];
  const a = csub(cmul(M[1][1], P[0][0]), cmul(M[0][1], P[1][0]));
  const b = csub(cmul(P[0][0], P[1][1]), cmul(P[0][1], P[1][0]));
  const cc = csub(cmul(M[0][0], M[1][1]), cmul(M[0][1], M[1][0]));
  const d = csub(cmul(M[0][0], P[1][1]), cmul(M[1][0], P[0][1]));
  const denom = csub(cmul(M[0][0], P[1][0]), cmul(M[1][0], P[0][0]));
  // abcd = [K*a/K, K*K*b; c/(K*K), K*d/K] / denom  (K11==K22==K ⇒ a, K^2*b, c/K^2, d)
  const A11 = cdiv(a, denom);
  const A12 = cdiv(cscale(b, K * K), denom);
  const A21 = cdiv(cscale(cc, 1 / (K * K)), denom);
  const A22 = cdiv(d, denom);
  return ret(mk2x2(A11, A12, A21, A22));
}

// abcd2s (n=1 closed form)
function abcd2s(args: Value[]): Promise<Value[]> {
  const [[a, b], [cc, d]] = get2x2(args[0], 'ABCD_PARAMS');
  const z0 = z0Of(args, 1);
  const K = Math.sqrt(z0);
  const K2 = K * K;                    // K11^2 == K22^2 == z0
  const aK2 = cscale(a, K2);           // a*K22^2
  const cK2K2 = cscale(cc, K2);        // c*K22^2 (then *K11^2 below)
  const K2cK2 = cscale(cc, K2 * K2);   // K11^2*(c*K22^2)
  const K2d = cscale(d, K2);           // K11^2*d
  // common denom: b + a*K22^2 + K11^2*(c*K22^2 + d)
  const denom = cadd(cadd(b, aK2), cadd(K2cK2, K2d));
  const adbc = csub(cmul(a, d), cmul(b, cc));
  // s11 = b + a*K22^2 - K11^2*(c*K22^2 + d)
  const s11 = csub(cadd(b, aK2), cadd(K2cK2, K2d));
  const s12 = cscale(adbc, 2 * K * K); // 2*K11*K22*(a*d-b*c)
  const s21 = c(2 * K * K, 0);         // 2*K11*K22
  // s22 = b - a*K22^2 + K11^2*(d - c*K22^2)
  const s22 = cadd(csub(b, aK2), csub(K2d, K2cK2));
  return ret(mk2x2(cdiv(s11, denom), cdiv(s12, denom), cdiv(s21, denom), cdiv(s22, denom)));
}

// ── 2x2 complex matrix algebra for s2y/y2s/s2z/z2s (general N=2 via explicit inverse) ──
type M2 = [[C, C], [C, C]];
const mInv2 = (A: M2): M2 => {
  const det = csub(cmul(A[0][0], A[1][1]), cmul(A[0][1], A[1][0]));
  return [
    [cdiv(A[1][1], det), cdiv(cscale(A[0][1], -1), det)],
    [cdiv(cscale(A[1][0], -1), det), cdiv(A[0][0], det)],
  ];
};
const mMul2 = (A: M2, B: M2): M2 => [
  [cadd(cmul(A[0][0], B[0][0]), cmul(A[0][1], B[1][0])), cadd(cmul(A[0][0], B[0][1]), cmul(A[0][1], B[1][1]))],
  [cadd(cmul(A[1][0], B[0][0]), cmul(A[1][1], B[1][0])), cadd(cmul(A[1][0], B[0][1]), cmul(A[1][1], B[1][1]))],
];
const mScale2 = (A: M2, k: number): M2 => [
  [cscale(A[0][0], k), cscale(A[0][1], k)],
  [cscale(A[1][0], k), cscale(A[1][1], k)],
];
const I2: M2 = [[c(1), c(0)], [c(0), c(1)]];
const mAddI = (A: M2): M2 => [[cadd(A[0][0], c(1)), A[0][1]], [A[1][0], cadd(A[1][1], c(1))]];
const mIminus = (A: M2): M2 => [[csub(c(1), A[0][0]), cscale(A[0][1], -1)], [cscale(A[1][0], -1), csub(c(1), A[1][1])]];
const toM2 = (v: Value, ctx: string): M2 => get2x2(v, ctx) as M2;
const fromM2 = (A: M2): Mat => mk2x2(A[0][0], A[0][1], A[1][0], A[1][1]);

// s2y: Y = Kinv*(I-S)*inv(I+S)*Kinv,  Kinv = (1/sqrt(z0))*I
function s2y(args: Value[]): Promise<Value[]> {
  const S = toM2(args[0], 'S_PARAMS');
  const ki = 1 / Math.sqrt(z0Of(args, 1));
  const Y = mScale2(mMul2(mIminus(S), mInv2(mAddI(S))), ki * ki);
  return ret(fromM2(Y));
}
// y2s: S = (Kinv + Y*K) \ (Kinv - Y*K),  K = sqrt(z0)*I, Kinv = (1/sqrt(z0))*I
function y2s(args: Value[]): Promise<Value[]> {
  const Y = toM2(args[0], 'Y_PARAMS');
  const z0 = z0Of(args, 1);
  const K = Math.sqrt(z0), ki = 1 / K;
  const yK = mScale2(Y, K);
  const KinvI: M2 = mScale2(I2, ki);
  const lhs: M2 = [[cadd(KinvI[0][0], yK[0][0]), cadd(KinvI[0][1], yK[0][1])], [cadd(KinvI[1][0], yK[1][0]), cadd(KinvI[1][1], yK[1][1])]];
  const rhs: M2 = [[csub(KinvI[0][0], yK[0][0]), csub(KinvI[0][1], yK[0][1])], [csub(KinvI[1][0], yK[1][0]), csub(KinvI[1][1], yK[1][1])]];
  const S = mMul2(mInv2(lhs), rhs);
  return ret(fromM2(S));
}
// s2z: Z = K*(I+S)*inv(I-S)*K
function s2z(args: Value[]): Promise<Value[]> {
  const S = toM2(args[0], 'S_PARAMS');
  const K = Math.sqrt(z0Of(args, 1));
  const Z = mScale2(mMul2(mAddI(S), mInv2(mIminus(S))), K * K);
  return ret(fromM2(Z));
}
// z2s: S = (Z*Kinv + K) \ (Z*Kinv - K)
function z2s(args: Value[]): Promise<Value[]> {
  const Z = toM2(args[0], 'Z_PARAMS');
  const z0 = z0Of(args, 1);
  const K = Math.sqrt(z0), ki = 1 / K;
  const zKinv = mScale2(Z, ki);
  const KI: M2 = mScale2(I2, K);
  const lhs: M2 = [[cadd(zKinv[0][0], KI[0][0]), cadd(zKinv[0][1], KI[0][1])], [cadd(zKinv[1][0], KI[1][0]), cadd(zKinv[1][1], KI[1][1])]];
  const rhs: M2 = [[csub(zKinv[0][0], KI[0][0]), csub(zKinv[0][1], KI[0][1])], [csub(zKinv[1][0], KI[1][0]), csub(zKinv[1][1], KI[1][1])]];
  const S = mMul2(mInv2(lhs), rhs);
  return ret(fromM2(S));
}

// ─────────────────────────── s2scc (2N-port → common-mode N-port) ───────────────────────────
// smm = M*S*M'/2 with M = blkdiag([1 -1],...; [1 1],...), then Scc = smm(N/2+1:N, N/2+1:N).
function s2scc(args: Value[]): Promise<Value[]> {
  const M = m(args[0], 'S_PARAMS');
  const N = M.rows;
  if (M.cols !== N || N < 2 || N % 2 !== 0)
    throw new Error('S2SCC requires a 2Nx2N single-ended S-parameter matrix');
  const rfflag = args[1] != null ? m(args[1], 'RFFLAG').data[0] : 1;

  // Port reordering (1-based MATLAB → 0-based here)
  let ports: number[];
  if (rfflag === 1) {
    const odd: number[] = [], even: number[] = [];
    for (let i = 1; i <= N; i++) (i % 2 ? odd : even).push(i - 1);
    ports = [...odd, ...even];
  } else if (rfflag === 2) {
    ports = Array.from({ length: N }, (_, i) => i);
  } else if (rfflag === 3) {
    const first: number[] = [], secondRev: number[] = [];
    for (let i = 1; i <= N / 2; i++) first.push(i - 1);
    for (let i = N; i >= N / 2 + 1; i--) secondRev.push(i - 1);
    ports = [...first, ...secondRev];
  } else {
    throw new Error('S2SCC: RFFLAG must be 1, 2, or 3');
  }

  // reordered S as complex 2D array
  const S: C[][] = [];
  for (let r = 0; r < N; r++) {
    S[r] = [];
    for (let col = 0; col < N; col++) S[r][col] = elem(M, ports[r], ports[col]);
  }
  // Transformation matrix M (N x N): rows 1..N/2 = differential ([1 -1] blocks),
  // rows N/2+1..N = common ([1 1] blocks). invM = M'.
  const half = N / 2;
  const Tm: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let k = 0; k < half; k++) {
    Tm[k][2 * k] = 1; Tm[k][2 * k + 1] = -1;          // differential rows
    Tm[half + k][2 * k] = 1; Tm[half + k][2 * k + 1] = 1; // common rows
  }
  // smm = Tm * S * Tm' / 2
  // tmp = Tm * S
  const tmp: C[][] = Array.from({ length: N }, () => new Array<C>(N).fill(c(0)));
  for (let r = 0; r < N; r++)
    for (let col = 0; col < N; col++) {
      let acc = c(0);
      for (let kk = 0; kk < N; kk++) if (Tm[r][kk] !== 0) acc = cadd(acc, cscale(S[kk][col], Tm[r][kk]));
      tmp[r][col] = acc;
    }
  // smm = tmp * Tm' / 2  (Tm'[k][col] = Tm[col][k])
  const smm: C[][] = Array.from({ length: N }, () => new Array<C>(N).fill(c(0)));
  for (let r = 0; r < N; r++)
    for (let col = 0; col < N; col++) {
      let acc = c(0);
      for (let kk = 0; kk < N; kk++) if (Tm[col][kk] !== 0) acc = cadd(acc, cscale(tmp[r][kk], Tm[col][kk]));
      smm[r][col] = cscale(acc, 0.5);
    }
  // Scc = smm(half+1:N, half+1:N)  (common-common block)
  const scc: C[][] = [];
  for (let r = 0; r < half; r++) {
    scc[r] = [];
    for (let col = 0; col < half; col++) scc[r][col] = smm[half + r][half + col];
  }
  return ret(mkMat(half, half, scc));
}

const B: Record<string, Builtin> = {
  abcd2h: (a) => abcd2h(a),
  gammams: (a) => gammams(a),
  powergain: (a) => powergain(a),
  s2scc: (a) => s2scc(a),
  stabilityk: (a, n) => stabilityk(a, n),
  s2abcd: (a) => s2abcd(a),
  abcd2s: (a) => abcd2s(a),
  s2y: (a) => s2y(a),
  y2s: (a) => y2s(a),
  s2z: (a) => s2z(a),
  z2s: (a) => z2s(a),
};

export const RF: ToolboxModule = {
  id: 'rf',
  name: 'RF Toolbox',
  docBase: 'https://www.mathworks.com/help/rf/ref/',
  builtins: B,
  help: HELP_RF,
};
