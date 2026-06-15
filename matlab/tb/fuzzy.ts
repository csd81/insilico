// Fuzzy Logic Toolbox — membership functions. These are MEX-backed in MATLAB (apply*/evaluate*
// cores), so the closed-form definitions are authored from the documented algorithm (type trimf …)
// and validated exactly against the live oracle. See fuzzy.VALIDATION.md.
import { type Value, map, toMat as m, toArray, scalar, asString, MatError } from '../values';
import type { ToolboxModule } from './types';
import { HELP_FUZZY } from '../help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

/** Defuzzify a sampled membership function `mf` over universe `x` (centroid/bisector/mom/som/lom).
 *  Mirrors MATLAB's defuzz.m exactly (discrete sums; som/lom break ties by |x|). */
function defuzzScalar(x: number[], mf: number[], type: string): number {
  if (x.length !== mf.length) throw new MatError('Sizes mismatch in defuzzification.', 'fuzzy:general:errDefuzz_SizeMismatch');
  const n = x.length;
  if (type === 'centroid') {
    let area = 0, mom = 0;
    for (let k = 0; k < n; k++) { area += mf[k]; mom += mf[k] * x[k]; }
    if (area === 0) throw new MatError('Total area is zero in centroid defuzzification.', 'fuzzy:general:errDefuzz_ZeroAreaInCentroidMethod');
    return mom / area;
  }
  if (type === 'bisector') {
    let area = 0;
    for (let k = 0; k < n; k++) area += mf[k];
    if (area === 0) throw new MatError('Total area is zero in bisector defuzzification.', 'fuzzy:general:errDefuzz_ZeroAreaInBisectorMethod');
    let tmp = 0, k = 0;
    for (; k < n; k++) { tmp += mf[k]; if (tmp >= area / 2) break; }
    return x[k < n ? k : n - 1];
  }
  // max-based methods
  let mx = -Infinity;
  for (let k = 0; k < n; k++) if (mf[k] > mx) mx = mf[k];
  const atMax: number[] = [];
  for (let k = 0; k < n; k++) if (mf[k] === mx) atMax.push(x[k]);
  if (type === 'mom') return atMax.reduce((s, v) => s + v, 0) / atMax.length;
  if (type === 'som') { let best = atMax[0]; for (const v of atMax) if (Math.abs(v) < Math.abs(best)) best = v; return best; }
  if (type === 'lom') { let best = atMax[0]; for (const v of atMax) if (Math.abs(v) > Math.abs(best)) best = v; return best; }
  throw new MatError(`Unknown defuzzification method '${type}'.`, 'fuzzy:general:errDefuzz');
}
const sigScalar = (x: number, a: number, c: number) => 1 / (1 + Math.exp(-a * (x - c)));
const gaussScalar = (x: number, sig: number, c: number) => Math.exp(-((x - c) ** 2) / (2 * sig * sig));
/** S-shaped spline membership on [a,b]. */
function smfScalar(x: number, a: number, b: number): number {
  if (a >= b) return x >= (a + b) / 2 ? 1 : 0;       // degenerate → step at the midpoint
  if (x <= a) return 0;
  const mid = (a + b) / 2;
  if (x <= mid) return 2 * ((x - a) / (b - a)) ** 2;
  if (x < b) return 1 - 2 * ((x - b) / (b - a)) ** 2;
  return 1;
}
/** Z-shaped spline membership on [a,b] (independent of smf at the degenerate midpoint). */
function zmfScalar(x: number, a: number, b: number): number {
  if (a >= b) return x <= (a + b) / 2 ? 1 : 0;       // degenerate → step at the midpoint
  if (x <= a) return 1;
  const mid = (a + b) / 2;
  if (x <= mid) return 1 - 2 * ((x - a) / (b - a)) ** 2;
  if (x < b) return 2 * ((x - b) / (b - a)) ** 2;
  return 0;
}

export const FUZZY: ToolboxModule = {
  id: 'fuzzy',
  name: 'Fuzzy Logic Toolbox',
  docBase: 'https://www.mathworks.com/help/fuzzy/',
  builtins: {
    trimf: (a) => { const [p, q, r] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => { if (x === q) return 1; if (p < x && x < q) return (x - p) / (q - p); if (q < x && x < r) return (r - x) / (r - q); return 0; })); },
    trapmf: (a) => { const [p, q, r, s] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => { const y1 = x >= q ? 1 : x < p ? 0 : (x - p) / (q - p); const y2 = x <= r ? 1 : x > s ? 0 : (s - x) / (s - r); return Math.max(Math.min(y1, y2), 0); })); },
    gaussmf: (a) => { const [sig, c] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => gaussScalar(x, sig, c))); },
    gauss2mf: (a) => { const [s1, c1, s2, c2] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => (x < c1 ? gaussScalar(x, s1, c1) : x > c2 ? gaussScalar(x, s2, c2) : 1))); },
    gbellmf: (a) => { const [p, q, c] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => { if (x === c) return q === 0 ? 0.5 : q < 0 ? 0 : 1; return 1 / (1 + Math.abs((x - c) / p) ** (2 * q)); })); },
    sigmf: (a) => { const [p, c] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => sigScalar(x, p, c))); },
    dsigmf: (a) => { const [a1, c1, a2, c2] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => sigScalar(x, a1, c1) - sigScalar(x, a2, c2))); },
    psigmf: (a) => { const [a1, c1, a2, c2] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => sigScalar(x, a1, c1) * sigScalar(x, a2, c2))); },
    zmf: (a) => { const [p, q] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => zmfScalar(x, p, q))); },
    smf: (a) => { const [p, q] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => smfScalar(x, p, q))); },
    pimf: (a) => { const [p, q, r, s] = toArray(m(a[1])); return ret(map(m(a[0]), (x) => smfScalar(x, p, q) * zmfScalar(x, r, s))); },
    defuzz: (a) => ret(scalar(defuzzScalar(toArray(m(a[0])), toArray(m(a[1])), asString(a[2]).toLowerCase()))),
    // Legacy syntax y = evalmf(x, params, type): evaluate a named membership function by dispatching
    // to the matching MF builtin. (MATLAB's newer evalmf(mf, x) takes an MF object; not in scope.)
    evalmf: (a) => {
      const type = asString(a[2]).toLowerCase();
      const mf = (FUZZY.builtins as Record<string, (args: Value[]) => Promise<Value[]>>)[type];
      if (!mf || type === 'evalmf' || type === 'defuzz') throw new MatError(`Unknown membership function type '${type}'.`, 'fuzzy:general:errEvalmf_BadType');
      return mf([a[0], a[1]]);
    },
  },
  help: HELP_FUZZY,
};
