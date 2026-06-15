// Risk Management Toolbox — 5 validated standalone functions:
//   valueAtRisk, expectedShortfall, concentrationIndices, asrf, mertonmodel.
// All validated against MATLAB R2026a oracle values (see tests in _riskt.ts).
//
// Oracle values (MATLAB R2026a):
//   valueAtRisk('normal', 0.95)                                          = 1.64485362695147
//   valueAtRisk('normal', 0.99, 'Mean',0.001,'StandardDeviation',0.02)   = 0.0455269574808168
//   valueAtRisk('normal', [0.95 0.99])  = [1.64485362695147, 2.32634787404084]
//   expectedShortfall('normal', 0.95)                                    = 2.06271280750743
//   expectedShortfall('normal', 0.99, 'Mean',0.001,'StandardDeviation',0.02) = 0.0523042844069161
//   expectedShortfall('normal', [0.95 0.99]) = [2.06271280750743, 2.66521422034581]
//   concentrationIndices([100 200 300 400]): Gini=0.25, HH=0.3, HT=0.333333.., TE=0.106440.., CR=0.4
//   concentrationIndices([1 1 1 1]):         Gini=0, HH=0.25, HT=0.25, TE=0, CR=0.25
//   asrf(0.05,0.45,0.12,'VaRLevel',0.999): capital=0.0990799194840083 VaR=0.121579919484008
//   asrf(0.01,0.4,0.2):                    capital=0.0542101064524285 VaR=0.0582101064524285
//   mertonmodel(3,0.2,10,0.05): PD=6.25554097410941e-09 DD=5.69261153127145 A=12.512294244892 Sa=0.0479528365463614
//   mertonmodel(5,0.3,8,0.05,'Maturity',2): PD=0.00164160027635107 DD=2.93989823894028

import type { Builtin } from '../builtins';
import {
  type Value, type StructV, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat, isStr, MatError, mat,
} from '../values';
import { erf } from '../specfun';
import type { ToolboxModule } from './types';
import { HELP_RISK } from '../help/help-risk';

const ret = (...vs: Value[]): Promise<Value[]> => Promise.resolve(vs);

// ── Normal distribution helpers (erf from shared specfun) ────────────────────────────────
const normcdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
const normpdf = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/** norminv: Beasley-Springer-Moro initial approximation refined by Newton iterations
 *  using the high-precision erf-based normcdf. Accuracy ~1e-15. */
function norminv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pLow = 0.02425; const pHigh = 1 - pLow;
  let q: number, r: number, x: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    x = (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  // Newton refinement using high-precision normcdf
  for (let i = 0; i < 8; i++) {
    const fx = normcdf(x) - p;
    const fpx = normpdf(x);
    if (Math.abs(fpx) < 1e-300) break;
    x -= fx / fpx;
  }
  return x;
}

// ── Log-gamma via Lanczos (g=7, n=9 coefficients, |error| < 1.5e-12) ──────────────────
function lgamma(z: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
             -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// ── Regularized incomplete beta function (Lentz continued fraction) ─────────────────────
function incompleteBetaReg(x: number, a: number, b: number): number {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  if (x > (a + 1) / (a + b + 2)) return 1 - incompleteBetaReg(1 - x, b, a);
  const EPS = 1e-14, FPMIN = 1e-300;
  let h = FPMIN; let c = h; let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; h = d;
  for (let m = 1; m <= 200; m++) {
    for (let step = 0; step <= 1; step++) {
      let num: number;
      if (step === 0) { num = m * (b - m) * x / ((a + 2*m - 1) * (a + 2*m)); }
      else            { num = -(a + m) * (a + b + m) * x / ((a + 2*m) * (a + 2*m + 1)); }
      d = 1 + num * d; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d;
      c = 1 + num / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      const delta = c * d; h *= delta;
      if (Math.abs(delta - 1) < EPS) return front * h;
    }
  }
  return front * h;
}

// ── Student-t distribution ────────────────────────────────────────────────────────────────
function tpdf(x: number, nu: number): number {
  return Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2)) /
         (Math.sqrt(nu * Math.PI) * Math.pow(1 + x * x / nu, (nu + 1) / 2));
}

function tcdf(x: number, nu: number): number {
  const ib = incompleteBetaReg(nu / (nu + x * x), nu / 2, 0.5);
  const tail = 0.5 * ib;
  return x >= 0 ? 1 - tail : tail;
}

function tinv(p: number, nu: number): number {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const sign = p < 0.5 ? -1 : 1;
  const pp = p < 0.5 ? p : 1 - p;
  let x = Math.abs(norminv(1 - pp)); // initial guess
  for (let iter = 0; iter < 100; iter++) {
    const fx = tcdf(x, nu) - (1 - pp);
    const fpx = tpdf(x, nu);
    if (Math.abs(fpx) < 1e-300) break;
    const dx = fx / fpx;
    x -= dx;
    if (Math.abs(dx) < 1e-12) break;
  }
  return sign * x;
}

// ── Parse name-value pairs from args beyond a fixed offset ────────────────────────────────
function getMatStr(v: Value): string {
  if (isMat(v) && (v as any).isChar) {
    return Array.from((v as any).data as Float64Array).map((c: number) => String.fromCharCode(c)).join('').toLowerCase();
  }
  return '';
}

function parseNV(args: Value[], offset: number): Map<string, Value> {
  const result = new Map<string, Value>();
  for (let i = offset; i + 1 < args.length; i += 2) {
    const k = isStr(args[i]) ? (args[i] as any).items[0].toLowerCase() : getMatStr(args[i]);
    if (k) result.set(k, args[i + 1]);
  }
  return result;
}

function nvScalar(nv: Map<string, Value>, key: string): number | undefined {
  const v = nv.get(key);
  if (v === undefined) return undefined;
  return asScalar(m(v));
}

function getDistStr(v: Value): string {
  if (isStr(v)) return (v as any).items[0].toLowerCase();
  if (isMat(v) && (v as any).isChar) {
    return Array.from((v as any).data as Float64Array).map((c: number) => String.fromCharCode(c)).join('').toLowerCase();
  }
  throw new MatError('valueAtRisk/expectedShortfall: first argument must be a distribution name string');
}

// ── valueAtRisk(distribution, VaRLevel, Name, Value...) ──────────────────────────────────
// Normal: VaR = -(mu + norminv(1-VaRLevel)*sigma)
// t:      VaR = -(loc + tinv(1-VaRLevel, nu)*scale)
function valueAtRiskFn(args: Value[]): Promise<Value[]> {
  const dist = getDistStr(args[0]);
  const levels = toArray(m(args[1]));
  const nv = parseNV(args, 2);

  const results = levels.map(alpha => {
    const returnThreshold = 1 - alpha;
    if (dist === 'normal') {
      const mu = nvScalar(nv, 'mean') ?? 0;
      const sigma = nvScalar(nv, 'standarddeviation') ?? 1;
      return -(mu + norminv(returnThreshold) * sigma);
    } else if (dist === 't') {
      const nu = nvScalar(nv, 'degreesoffreedom');
      if (nu === undefined) throw new MatError('valueAtRisk: DegreesOfFreedom required for t distribution');
      const loc = nvScalar(nv, 'location') ?? 0;
      const scale = nvScalar(nv, 'scale') ?? 1;
      return -(loc + tinv(returnThreshold, nu) * scale);
    } else {
      throw new MatError(`valueAtRisk: unsupported distribution '${dist}' (supported: 'normal', 't')`);
    }
  });

  if (results.length === 1) return ret(scalar(results[0]));
  return ret(rowVec(results));
}

// ── expectedShortfall(distribution, VaRLevel, Name, Value...) ────────────────────────────
// Normal: ES = -(mu - sigma*normpdf(norminv(alpha))/(1-alpha))
// t:      ES = -(loc - scale * tpdf(tinv(alpha,nu),nu) * (nu+tinv^2) / ((nu-1)*(1-alpha)))
function expectedShortfallFn(args: Value[]): Promise<Value[]> {
  const dist = getDistStr(args[0]);
  const levels = toArray(m(args[1]));
  const nv = parseNV(args, 2);

  const results = levels.map(alpha => {
    if (dist === 'normal') {
      const mu = nvScalar(nv, 'mean') ?? 0;
      const sigma = nvScalar(nv, 'standarddeviation') ?? 1;
      const z = norminv(alpha);
      return -(mu - sigma * normpdf(z) / (1 - alpha));
    } else if (dist === 't') {
      const nu = nvScalar(nv, 'degreesoffreedom');
      if (nu === undefined) throw new MatError('expectedShortfall: DegreesOfFreedom required for t distribution');
      const loc = nvScalar(nv, 'location') ?? 0;
      const scale = nvScalar(nv, 'scale') ?? 1;
      const q = tinv(alpha, nu);
      const pdf_q = tpdf(q, nu);
      return -(loc - scale * pdf_q * (nu + q * q) / ((nu - 1) * (1 - alpha)));
    } else {
      throw new MatError(`expectedShortfall: unsupported distribution '${dist}' (supported: 'normal', 't')`);
    }
  });

  if (results.length === 1) return ret(scalar(results[0]));
  return ret(rowVec(results));
}

// ── concentrationIndices(portfolioData) ──────────────────────────────────────────────────
// Faithful port of concentrationIndices.m. Returns struct with Gini, HH, HK, HT, TE, CR.
function concentrationIndicesFn(args: Value[]): Promise<Value[]> {
  const data = toArray(m(args[0])).filter(x => !Number.isNaN(x) && x >= 0);
  if (data.length === 0) throw new MatError('concentrationIndices: all data missing or invalid');
  const total = data.reduce((s, x) => s + x, 0);
  if (total < 1e-8) throw new MatError('concentrationIndices: portfolio value is zero');

  const N = data.length;
  const weights = data.map(x => x / total);
  const sorted = [...weights].sort((a, b) => a - b); // ascending

  // Cumulative proportion of value (Lorenz curve)
  const propValue = new Array<number>(N + 1).fill(0);
  for (let i = 0; i < N; i++) propValue[i + 1] = propValue[i] + sorted[i];

  // Gini: 1 - sum of trapezoids / N
  let trapSum = 0;
  for (let i = 0; i < N; i++) trapSum += propValue[i] + propValue[i + 1];
  const Gini = 1 - trapSum / N;

  // Herfindahl-Hirschman
  const HH = weights.reduce((s, w) => s + w * w, 0);

  // Hannah-Kay (alpha=0.5 default)
  const HKAlpha = 0.5;
  const HK = Math.pow(weights.reduce((s, w) => s + Math.pow(w, HKAlpha), 0), 1 / (HKAlpha - 1));

  // Hall-Tideman: HT = 1 / (2*sum((N-i+1)*sorted[i]) - 1)  (sorted ascending, i=1..N)
  let htSum = 0;
  for (let i = 0; i < N; i++) htSum += (N - i) * sorted[i]; // N-i = N-i+1 for 1-indexed
  const HT = 1 / (2 * htSum - 1);

  // Theil entropy: sum(w*log(w)) + log(N)
  let TE = Math.log(N);
  for (const w of weights) { if (w > 0) TE += w * Math.log(w); }

  // CR: concentration ratio = share of top-1 borrower (default CRIndex=1)
  const CR = sorted[N - 1]; // largest weight

  // Return as struct (StructV: fields Map<string, Value[]>, each wrapped in array for 1×1 scalar struct)
  const fields = new Map<string, Value[]>([
    ['Gini', [scalar(Gini)]],
    ['HH',   [scalar(HH)]],
    ['HK',   [scalar(HK)]],
    ['HT',   [scalar(HT)]],
    ['TE',   [scalar(TE)]],
    ['CR',   [scalar(CR)]],
  ]);
  const result: StructV = { kind: 'struct', rows: 1, cols: 1, fields };
  return ret(result);
}

// ── asrf(PD, LGD, R, Name, Value...) ─────────────────────────────────────────────────────
// Asymptotic Single Risk Factor (Basel II) model.
// VaR_i = EAD * LGD * normcdf((norminv(PD) - sqrt(R)*norminv(1-VaRLevel)) / sqrt(1-R))
// capital = VaR - EAD * LGD * PD
function asrfFn(args: Value[]): Promise<Value[]> {
  const PDarr = toArray(m(args[0]));
  const LGDarr = toArray(m(args[1]));
  const Rarr = toArray(m(args[2]));
  const nv = parseNV(args, 3);
  const EAD_ = nvScalar(nv, 'ead') ?? 1;
  const VaRLevel = nvScalar(nv, 'varlevel') ?? 0.999;

  const n = Math.max(PDarr.length, LGDarr.length, Rarr.length);
  const pd = (i: number) => PDarr.length === 1 ? PDarr[0] : PDarr[i];
  const lgd = (i: number) => LGDarr.length === 1 ? LGDarr[0] : LGDarr[i];
  const r = (i: number) => Rarr.length === 1 ? Rarr[0] : Rarr[i];

  const capArr = new Float64Array(n);
  const varArr = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const varVal = EAD_ * lgd(i) * normcdf(
      (norminv(pd(i)) - Math.sqrt(r(i)) * norminv(1 - VaRLevel)) / Math.sqrt(1 - r(i))
    );
    capArr[i] = varVal - EAD_ * lgd(i) * pd(i);
    varArr[i] = varVal;
  }

  if (n === 1) return ret(scalar(capArr[0]), scalar(varArr[0]));
  return ret(colVec(Array.from(capArr)), colVec(Array.from(varArr)));
}

// ── mertonmodel(Equity, EquityVol, Liability, Rate, Name, Value...) ──────────────────────
// Merton (1974) structural model of default.
// Iteratively solves for implied asset value A and volatility Sa, then computes:
//   DD = (log(A/D) + (muA + 0.5*Sa^2)*T) / (Sa*sqrt(T)) - Sa*sqrt(T)
//   PD = 1 - normcdf(DD)
function mertonmodelFn(args: Value[]): Promise<Value[]> {
  const E_raw = asScalar(m(args[0]));
  const Se    = asScalar(m(args[1]));
  const D_raw = asScalar(m(args[2]));
  const r     = asScalar(m(args[3]));
  const nv = parseNV(args, 4);
  const T  = nvScalar(nv, 'maturity') ?? 1;

  // Scale by E to improve numerics (faithful to mertonmodelSolver in mertonmodel.m)
  const sf  = E_raw;
  const E   = E_raw / sf;   // = 1
  const D   = D_raw / sf;

  // Initial guesses
  let A  = E + D * Math.exp(-r * T);
  let Sa = 0.1;

  const TOL = 1e-7;

  function getNormcdfs(A_: number, Sa_: number): [number, number, number] {
    const d1 = (Math.log(A_ / D) + (r + 0.5 * Sa_ * Sa_) * T) / (Sa_ * Math.sqrt(T));
    const d2 = d1 - Sa_ * Math.sqrt(T);
    const N1 = normcdf(d1);
    const N2 = normcdf(d2);
    const disc = Math.exp(-r * T);
    return [N1, N2, disc];
  }

  for (let iter = 0; iter < 500; iter++) {
    const [N1old, N2old, disc] = getNormcdfs(A, Sa);

    // Update asset volatility
    const SaNew = Se * (E / A) / N1old;

    // Re-evaluate N1 with new Sa
    const N1new = normcdf((Math.log(A / D) + (r + 0.5 * SaNew * SaNew) * T) / (SaNew * Math.sqrt(T)));

    // Update asset value: aNew = E + D_term, D_term = A*(1-N1) + D*disc*N2
    const Dterm = A * (1 - N1new) + D * disc * N2old;
    const ANew = E + Dterm;

    const err1 = Math.abs(ANew - A);
    const err2 = Math.abs(SaNew - Sa);
    A = ANew; Sa = SaNew;
    if (err1 < TOL && err2 < TOL) break;
  }

  // Rescale
  const A_final = A * sf;
  const Sa_final = Sa;

  // Use muA = drift (default = r if not specified)
  const muA = nvScalar(nv, 'drift') ?? r;

  const d1_f = (Math.log(A_final / D_raw) + (muA + 0.5 * Sa_final * Sa_final) * T) / (Sa_final * Math.sqrt(T));
  const DD   = d1_f - Sa_final * Math.sqrt(T);
  const PD   = 1 - normcdf(DD);

  return ret(scalar(PD), scalar(DD), scalar(A_final), scalar(Sa_final));
}

// ── Module export ────────────────────────────────────────────────────────────────────────
export const RISK: ToolboxModule = {
  id: 'risk',
  name: 'Risk Management Toolbox',
  docBase: 'https://www.mathworks.com/help/risk/',
  builtins: {
    valueAtRisk: valueAtRiskFn,
    expectedShortfall: expectedShortfallFn,
    concentrationIndices: concentrationIndicesFn,
    asrf: asrfFn,
    mertonmodel: mertonmodelFn,
  },
  help: HELP_RISK,
};
