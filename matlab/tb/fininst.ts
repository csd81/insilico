// Financial Instruments Toolbox — interest-rate environments, cash-flow pricing,
// bond futures, Black model, and option pricing wrappers.
import {
  type Value, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat, isStruct, isStr, MatError,
  mat, zeros, makeObject, str,
} from '../values';
import { erf } from '../specfun';
import type { ToolboxModule } from './types';
import { HELP_FININST } from '../help/toolbox-help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

// ── Standard-normal helpers (erf from shared specfun) ────────────────────────────────────
const N = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));

// ── Date utilities ──────────────────────────────────────────────────────────────────────
const DAY_MS = 86400000, EPOCH = 719529;
function fromSerial(s: number): Date {
  return new Date(((s - EPOCH) * DAY_MS));
}
function toSerial(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS + EPOCH;
}
function asSerial(v: Value): number {
  if (isMat(v)) return asScalar(m(v));
  throw new MatError('fininst: expected date serial number');
}
function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
function yearFrac(t1: number, t2: number, basis = 0): number {
  const days = (t2 - t1);
  // 0 = actual/actual (ISDA): sum fractional years per calendar year.
  if (basis === 0) {
    if (t2 < t1) return -yearFrac(t2, t1, 0);
    if (t2 === t1) return 0;
    const d1 = fromSerial(t1), d2 = fromSerial(t2);
    const y1 = d1.getUTCFullYear(), y2 = d2.getUTCFullYear();
    if (y1 === y2) return days / (isLeap(y1) ? 366 : 365);
    let frac = 0;
    // first partial year
    const endY1 = toSerial(new Date(Date.UTC(y1 + 1, 0, 1)));
    frac += (endY1 - t1) / (isLeap(y1) ? 366 : 365);
    // whole middle years
    for (let y = y1 + 1; y < y2; y++) frac += 1;
    // last partial year
    const startY2 = toSerial(new Date(Date.UTC(y2, 0, 1)));
    frac += (t2 - startY2) / (isLeap(y2) ? 366 : 365);
    return frac;
  }
  if (basis === 1) return days / 365;        // 30/360 SIA (approx)
  if (basis === 2) return days / 360;        // actual/360
  if (basis === 3) return days / 365;        // actual/365
  if (basis === 4) return days / 360;        // 30/360 PSA (approx)
  return days / 365;
}
// Discount factor for a continuously/periodically compounded zero rate.
function discFactor(rate: number, t: number, compounding: number): number {
  if (compounding === -1 || compounding === 0) return Math.exp(-rate * t); // continuous
  const f = compounding; // periods per year (1,2,4,12,...)
  return Math.pow(1 + rate / f, -f * t);
}

// ── intenvset ───────────────────────────────────────────────────────────────────────────
async function intenvset(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  for (let i = 0; i + 1 < args.length; i += 2) {
    if (isMat(args[i]) && (args[i] as any).isChar) {
      const key = String.fromCharCode(...(Array.from((args[i] as any).data) as number[])).toLowerCase();
      props.set(key, args[i + 1]);
    }
  }
  props.set('Compounding', props.has('compounding') ? props.get('compounding')! : scalar(-1));
  props.set('Basis', props.has('basis') ? props.get('basis')! : scalar(0));
  return [makeObject('ratespec', props)];
}

// ── cfbyzero: price cash flows from a zero curve ────────────────────────────────────────
function rsField(rs: any, name: string): Value | undefined {
  if (!rs || rs.kind !== 'object' || !rs.props) return undefined;
  const lower = name.toLowerCase();
  for (const [k, v] of rs.props as Map<string, Value>) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}
function rsNums(rs: any, name: string): number[] | undefined {
  const v = rsField(rs, name);
  return v && isMat(v) ? toArray(v as any) : undefined;
}
async function cfbyzero(args: Value[]): Promise<Value[]> {
  if (args.length < 4) throw new MatError('cfbyzero: requires RateSpec,CFlowAmounts,CFlowDates,Settle');
  const rs = args[0] as any;
  const cfAmts = isMat(args[1]) ? toArray(args[1] as any) : [asScalar(m(args[1]))];
  const cfDates = isMat(args[2]) ? toArray(args[2] as any) : [asScalar(m(args[2]))];
  const settle = asSerial(args[3]);

  // Pull the zero curve and its conventions from the RateSpec built by intenvset.
  const rates = rsNums(rs, 'Rates') ?? [0.05];
  const startDates = rsNums(rs, 'StartDates');
  const endDates = rsNums(rs, 'EndDates');
  const compArr = rsNums(rs, 'Compounding');
  const basisArr = rsNums(rs, 'Basis');
  const compounding = compArr && compArr.length ? compArr[0] : -1;
  const basis = basisArr && basisArr.length ? basisArr[0] : 0;
  // Curve valuation (start) date: the first StartDate, else the Settle.
  const curveStart = startDates && startDates.length ? startDates[0] : settle;

  // Linear interpolation of the zero rate to an arbitrary date along the curve.
  const rateAt = (d: number): number => {
    if (!endDates || endDates.length === 0) return rates[0];
    if (endDates.length === 1) return rates[0];
    if (d <= endDates[0]) return rates[0];
    if (d >= endDates[endDates.length - 1]) return rates[endDates.length - 1];
    for (let k = 1; k < endDates.length; k++) {
      if (d <= endDates[k]) {
        const w = (d - endDates[k - 1]) / (endDates[k] - endDates[k - 1]);
        return rates[k - 1] + w * (rates[k] - rates[k - 1]);
      }
    }
    return rates[rates.length - 1];
  };

  let price = 0;
  for (let i = 0; i < cfAmts.length; i++) {
    const cf = cfAmts[i];
    const d = cfDates[i] ?? curveStart;
    const t = yearFrac(curveStart, d, basis);
    const r = rateAt(d);
    price += cf * discFactor(r, t, compounding);
  }
  return [scalar(price)];
}

// ── intenvprice: price instruments from rate environment ────────────────────────────────
async function intenvprice(args: Value[]): Promise<Value[]> {
  return cfbyzero(args);
}

// ── bndfutprice: bond futures price given repo rates ────────────────────────────────────
async function bndfutprice(args: Value[]): Promise<Value[]> {
  if (args.length < 6) throw new MatError('bndfutprice: requires RepoRate,Price,FutSettle,Delivery,ConvFactor,CouponRate,Maturity');
  const repoRate = asScalar(m(args[0]));
  const bondPrice = asScalar(m(args[1]));
  const futSettle = asSerial(args[2]);
  const delivery = asSerial(args[3]);
  const convFactor = asScalar(m(args[4]));
  const couponRate = asScalar(m(args[5]));
  const T = yearFrac(futSettle, delivery);
  const accruedInt = couponRate * T / 2; // simplified semi-annual
  const futPrice = (bondPrice * (1 + repoRate * T) - accruedInt) / convFactor;
  return [scalar(futPrice), scalar(accruedInt)];
}

// ── Black-Scholes option pricing (European options on non-dividend paying assets) ────────
async function blsprice(args: Value[]): Promise<Value[]> {
  if (args.length < 5) throw new MatError('blsprice: requires S0,K,r,T,sigma');
  const S = asScalar(m(args[0])), K = asScalar(m(args[1]));
  const r = asScalar(m(args[2])), T = asScalar(m(args[3])), sigma = asScalar(m(args[4]));
  const q = args.length > 5 ? asScalar(m(args[5])) : 0;
  if (T <= 0 || sigma <= 0) return [scalar(Math.max(0, S - K)), scalar(Math.max(0, K - S))];
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const call = S * Math.exp(-q * T) * N(d1) - K * Math.exp(-r * T) * N(d2);
  const put = K * Math.exp(-r * T) * N(-d2) - S * Math.exp(-q * T) * N(-d1);
  return [scalar(call), scalar(put)];
}

async function blsdelta(args: Value[]): Promise<Value[]> {
  if (args.length < 5) throw new MatError('blsdelta: requires S0,K,r,T,sigma');
  const S = asScalar(m(args[0])), K = asScalar(m(args[1]));
  const r = asScalar(m(args[2])), T = asScalar(m(args[3])), sigma = asScalar(m(args[4]));
  const q = args.length > 5 ? asScalar(m(args[5])) : 0;
  if (T <= 0 || sigma <= 0) return [scalar(S > K ? 1 : 0), scalar(S > K ? 0 : -1)];
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  return [scalar(Math.exp(-q * T) * N(d1)), scalar(Math.exp(-q * T) * (N(d1) - 1))];
}

async function blsgamma(args: Value[]): Promise<Value[]> {
  if (args.length < 5) throw new MatError('blsgamma: requires S0,K,r,T,sigma');
  const S = asScalar(m(args[0])), K = asScalar(m(args[1]));
  const r = asScalar(m(args[2])), T = asScalar(m(args[3])), sigma = asScalar(m(args[4]));
  const q = args.length > 5 ? asScalar(m(args[5])) : 0;
  if (T <= 0 || sigma <= 0) return [scalar(0)];
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const phi = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  return [scalar(Math.exp(-q * T) * phi / (S * sigma * Math.sqrt(T)))];
}

async function blstheta(args: Value[]): Promise<Value[]> {
  if (args.length < 5) throw new MatError('blstheta: requires S0,K,r,T,sigma');
  const S = asScalar(m(args[0])), K = asScalar(m(args[1]));
  const r = asScalar(m(args[2])), T = asScalar(m(args[3])), sigma = asScalar(m(args[4]));
  const q = args.length > 5 ? asScalar(m(args[5])) : 0;
  if (T <= 0 || sigma <= 0) return [scalar(0), scalar(0)];
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const phi = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  const callTheta = -S * Math.exp(-q * T) * phi * sigma / (2 * Math.sqrt(T))
    - r * K * Math.exp(-r * T) * N(d2) + q * S * Math.exp(-q * T) * N(d1);
  const putTheta = -S * Math.exp(-q * T) * phi * sigma / (2 * Math.sqrt(T))
    + r * K * Math.exp(-r * T) * N(-d2) - q * S * Math.exp(-q * T) * N(-d1);
  return [scalar(callTheta), scalar(putTheta)];
}

async function blsvega(args: Value[]): Promise<Value[]> {
  if (args.length < 5) throw new MatError('blsvega: requires S0,K,r,T,sigma');
  const S = asScalar(m(args[0])), K = asScalar(m(args[1]));
  const r = asScalar(m(args[2])), T = asScalar(m(args[3])), sigma = asScalar(m(args[4]));
  const q = args.length > 5 ? asScalar(m(args[5])) : 0;
  if (T <= 0) return [scalar(0)];
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const phi = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  return [scalar(S * Math.exp(-q * T) * phi * Math.sqrt(T))];
}

async function blsimpv(args: Value[]): Promise<Value[]> {
  if (args.length < 5) throw new MatError('blsimpv: requires S0,K,r,T,price');
  const S = asScalar(m(args[0])), K = asScalar(m(args[1]));
  const r = asScalar(m(args[2])), T = asScalar(m(args[3]));
  const mktPrice = asScalar(m(args[4]));
  const q = args.length > 5 ? asScalar(m(args[5])) : 0;
  // Bisection on Black-Scholes call price
  let lo = 1e-6, hi = 10.0;
  for (let it = 0; it < 100; it++) {
    const mid = (lo + hi) / 2;
    const d1 = (Math.log(S / K) + (r - q + 0.5 * mid * mid) * T) / (mid * Math.sqrt(T));
    const d2 = d1 - mid * Math.sqrt(T);
    const call = S * Math.exp(-q * T) * N(d1) - K * Math.exp(-r * T) * N(d2);
    if (call < mktPrice) lo = mid; else hi = mid;
    if (hi - lo < 1e-7) break;
  }
  return [scalar((lo + hi) / 2)];
}

// ── Asian option (geometric approximation, Levy 1992) ──────────────────────────────────
async function asianbylevy(args: Value[]): Promise<Value[]> {
  if (args.length < 7) throw new MatError('asianbylevy: requires S,K,r,T,sigma,m,optType');
  const S = asScalar(m(args[0])), K = asScalar(m(args[1]));
  const r = asScalar(m(args[2])), T = asScalar(m(args[3])), sigma = asScalar(m(args[4]));
  const numObs = asScalar(m(args[5]));
  const isCall = args.length <= 6 || asScalar(m(args[6])) >= 0;
  const h = T / numObs;
  const sumE = (Math.exp(r * h * (numObs + 1) / 2) - 1) / (Math.exp(r * h) - 1) * Math.exp(-r * T);
  const M1 = S * sumE;
  // Variance approximation: M2
  const M2 = 2 * S * S * Math.exp((2 * r + sigma * sigma) * h) / ((Math.exp((r + sigma * sigma) * h) - 1) * (Math.exp(r * h) - 1)) *
    Math.exp(-(r + sigma * sigma) * T) * (Math.exp((r + sigma * sigma) * h * numObs) - 1) / 2;
  const varA = Math.max(0, M2 - M1 * M1);
  const sigmaA = varA > 0 ? Math.sqrt(Math.log(1 + varA / (M1 * M1)) / T) : sigma * 0.7;
  const d1 = (Math.log(M1 / K) + 0.5 * sigmaA * sigmaA * T) / (sigmaA * Math.sqrt(T) || 1e-10);
  const d2 = d1 - sigmaA * Math.sqrt(T);
  const call = Math.exp(-r * T) * (M1 * N(d1) - K * N(d2));
  const put = Math.exp(-r * T) * (K * N(-d2) - M1 * N(-d1));
  return [scalar(isCall ? call : put)];
}

// ── Barrier options (Black-Scholes closed form, Haug 1997) ─────────────────────────────
async function barrierbybls(args: Value[]): Promise<Value[]> {
  if (args.length < 7) throw new MatError('barrierbybls: requires S,K,H,r,T,sigma,optSpec,barrierSpec');
  const S = asScalar(m(args[0])), K = asScalar(m(args[1])), H = asScalar(m(args[2]));
  const r = asScalar(m(args[3])), T = asScalar(m(args[4])), sigma = asScalar(m(args[5]));
  const q = 0;
  const x1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const x2 = (Math.log(S / H) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const y1 = (Math.log(H * H / (S * K)) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const y2 = (Math.log(H / S) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const mu = (r - q - 0.5 * sigma * sigma) / (sigma * sigma);
  const lam = Math.sqrt(mu * mu + 2 * r / (sigma * sigma));
  const price = S > H
    ? Math.exp(-r * T) * (S * N(x1) - K * N(x1 - sigma * Math.sqrt(T))
      - (H / S) ** (2 * (mu + 1)) * (H * H / S * N(y1) - K * N(y1 - sigma * Math.sqrt(T))))
    : 0;
  return [scalar(Math.max(0, price))];
}

// ── Lookback option (Goldman-Sosin-Gatto closed form) ──────────────────────────────────
async function lookbackbyls(args: Value[]): Promise<Value[]> {
  if (args.length < 5) throw new MatError('lookbackbyls: requires S,r,T,sigma,optType');
  const S = asScalar(m(args[0])), r = asScalar(m(args[1])), T = asScalar(m(args[2])), sigma = asScalar(m(args[3]));
  const isCall = args.length <= 4 || asScalar(m(args[4])) >= 0;
  const d1 = (Math.log(1) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const price = isCall
    ? S * N(d1) - S * Math.exp(-r * T) * N(d2) + S * Math.exp(-r * T) * sigma * sigma / (2 * r) * (N(-d1) - Math.exp(r * T) * N(-d1 + sigma * Math.sqrt(T)))
    : S * Math.exp(-r * T) * N(d2) - S * N(d1) + S * sigma * sigma / (2 * r) * (Math.exp(-r * T) * N(d1 - sigma * Math.sqrt(T)) - N(-d1));
  return [scalar(Math.max(0, price))];
}

// ── intenvget: retrieve a named property from a RateSpec structure ─────────────────────
async function intenvget(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('intenvget: requires RateSpec and ParameterName');
  const rateSpec = args[0];
  if ((rateSpec as any).kind !== 'object') throw new MatError('intenvget: first argument must be a RateSpec object');
  const props = (rateSpec as any).props as Map<string, Value>;
  const rawKey = isMat(args[1]) && (args[1] as any).isChar
    ? String.fromCharCode(...(Array.from((args[1] as any).data) as number[]))
    : isStr(args[1]) ? (args[1] as any).items?.[0] ?? '' : '';
  // Case-insensitive lookup
  const lower = rawKey.toLowerCase();
  for (const [k, v] of props) {
    if (k.toLowerCase() === lower) return [v];
  }
  throw new MatError(`intenvget: property '${rawKey}' not found in RateSpec`);
}

export const FININST: ToolboxModule = {
  id: 'fininst',
  name: 'Financial Instruments Toolbox',
  docBase: 'https://www.mathworks.com/help/fininst/',
  builtins: {
    intenvset,
    intenvget,
    cfbyzero,
    blsprice,
    blsdelta,
    blsgamma,
    blstheta,
    blsvega,
    blsimpv,
    // QUARANTINED: intenvprice — only delegates to cfbyzero; real intenvprice takes
    //   (RateSpec, InstSet portfolio object), which is not implemented.
    // QUARANTINED: bndfutprice — FutPrice and AccrInt both wrong; accrued-interest
    //   formula (couponRate*T/2) is unrelated to MATLAB's bond accrual. Needs the
    //   bond/RateSpec object framework + correct accrual.
    // QUARANTINED: asianbylevy — ~140x off (broken M2 variance) and wrong signature
    //   (scalars vs RateSpec/StockSpec/OptSpec/Strike/Settle/ExerciseDates objects).
    // QUARANTINED: barrierbybls — ~9x off, only the S>H up branch, no knock-in/out
    //   logic, wrong (object) signature.
    // QUARANTINED: lookbackbyls — ~3x off, degenerate log(1) (assumes running-min=spot),
    //   wrong model + wrong (object) signature.
  },
  help: HELP_FININST,
};
