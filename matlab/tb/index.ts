// Central toolbox registry. Aggregates every ToolboxModule into merged builtin/constant/help
// tables plus a name→toolbox map. Merged into the global BUILTINS in builtins.ts AFTER which
// the base entries are spread, so base MATLAB always wins on a name collision (see plan §3).
//
// Registration is limited to in-scope numerical/matrix-computation domains. Out-of-scope
// domain toolboxes are NOT registered (source kept under matlab/tb/ but not exposed at
// runtime): aerospace, antenna/rf, audio, bioinfo, financial/fininst, lidar/radar,
// textanalytics, vision (earlier); fixedpoint, fusion, fuzzy, gads, ident, parallel, phased,
// risk, robotics, wavelet; and — de-registered as low-value breadth — econ (econometrics),
// images (image processing), mapping (geodesy), nav (navigation/coord frames), nnet
// (deep-learning layers/training), rl (reinforcement learning). None of these were used by
// any oracle case. Within the registered toolboxes individual functions may still be
// unvalidated; oracle coverage is per case (see docs/coverage-map.md), not per toolbox.
import type { Builtin } from '../builtins';
import type { Value } from '../values';
import type { HelpEntry } from '../help/types';
import type { ToolboxModule } from './types';
import { COMM } from './comm';
import { CONTROL } from './control';
import { CURVEFIT } from './curvefit';
import { DSP } from './dsp';
// OPTIM registered for fgoalattain ONLY (no base equivalent); the other 13 builtins are
// quarantined inside optim.ts (11 duplicate correct base builtins, optimvar/optimproblem stubs).
import { OPTIM } from './optim';
import { Pde } from './pde';
import { SIGNAL } from './signal';
import { STATS } from './stats';
import { SYMBOLIC } from './symbolic';

/** All registered toolboxes, in precedence order (first wins on inter-toolbox collision). */
export const TOOLBOXES: ToolboxModule[] = [
  COMM, CONTROL, CURVEFIT, DSP, OPTIM, Pde, SIGNAL, STATS, SYMBOLIC,
];

/** Per-toolbox allow-lists: when a toolbox id appears here, ONLY the named builtins are
 *  registered (the rest of its source is kept but not exposed at runtime). This curates the
 *  large signal/stats tails down to validated + core graduate functions, and reduces dsp to
 *  its one oracle-validated overlap (`resample`). Toolboxes not listed register everything.
 *  See `pnpm oracle:audit` for the per-toolbox registered/validated breakdown. */
export const TOOLBOX_KEEP: Record<string, Set<string>> = {
  // dsp overlaps signal and is otherwise toolbox-object breadth; keep only the validated overlap.
  dsp: new Set(['resample']),
  // signal: validated/core filter design + response + filtering, spectral estimation (validate-next),
  // common windows used by filters; the peripheral tail (pulse/radar generators, telecom helpers,
  // exotic windows, niche parametric/AR utilities) is de-registered.
  signal: new Set([
    'hilbert', 'findpeaks', 'butter', 'freqz', 'filtfilt', 'fir1',
    'periodogram', 'pwelch', 'spectrogram', 'stft', 'czt', 'dct',
    'hamming', 'hann', 'hanning', 'kaiser', 'blackman', 'bartlett', 'rectwin', 'triang', 'gausswin',
    'dftmtx', 'interp', 'levinson', 'overshoot', 'square',
  ]),
  // stats: the 8 core distribution families (cdf/pdf/inv/fit/stat), the validated inference suite,
  // and statistical-algebra core (pca/knnsearch/pdist/robustfit/glmfit/ksdensity/QMC). Peripheral
  // distributions (extreme-value, noncentral, multivariate, copulas), nan*-helpers and niche
  // modeling utilities are de-registered.
  stats: new Set([
    'normcdf', 'normpdf', 'norminv', 'normfit', 'normstat',
    'tcdf', 'tpdf', 'tinv', 'tstat',
    'chi2cdf', 'chi2pdf', 'chi2inv', 'chi2stat',
    'fcdf', 'fpdf', 'finv', 'fstat',
    'betacdf', 'betapdf', 'betainv', 'betafit', 'betastat',
    'gamcdf', 'gampdf', 'gaminv', 'gamfit', 'gamstat',
    'poisscdf', 'poisspdf', 'poissinv', 'poissfit', 'poisstat',
    'binocdf', 'binopdf', 'binoinv', 'binofit', 'binostat',
    'cdf', 'pdf', 'icdf', 'random', 'makedist', 'fitdist',
    'ttest', 'ttest2', 'kstest', 'kstest2', 'vartest', 'chi2gof', 'anova1', 'ranksum', 'signrank',
    'pca', 'knnsearch', 'pdist', 'squareform', 'robustfit', 'glmfit', 'ksdensity', 'kmeans',
    'haltonset', 'net', 'moment', 'range',
  ]),
};

export const TOOLBOX_BUILTINS: Record<string, Builtin> = {};
export const TOOLBOX_CONSTANTS: Record<string, () => Value> = {};
export const TOOLBOX_HELP: Record<string, HelpEntry | string> = {};
/** Function name → owning toolbox (recorded even when a base builtin later shadows the name). */
export const FUNC_TOOLBOX = new Map<string, ToolboxModule>();
/** Class-method dispatch table: className → (fnName → impl). Lets a typed first argument route
 *  to a toolbox-specific overload (OOP dispatch) instead of the globally-registered builtin. */
export const TOOLBOX_METHODS = new Map<string, Record<string, Builtin>>();
/** Set of all method names — a fast guard so the interpreter only type-checks args when relevant. */
export const METHOD_NAMES = new Set<string>();
/** Class inheritance chain: childClassName → parentClassName (e.g. 'tf' → 'lti'). */
export const CLASS_PARENTS = new Map<string, string>();
/** Resolve a method for a class, walking the inheritance chain (child → parent → …). This is the
 *  single dispatch entry point used by the interpreter so subclasses inherit base-class methods. */
export function lookupMethod(className: string, fn: string): Builtin | undefined {
  let cls: string | undefined = className; const seen = new Set<string>();
  while (cls && !seen.has(cls)) { seen.add(cls); const table = TOOLBOX_METHODS.get(cls); if (table && fn in table) return table[fn]; cls = CLASS_PARENTS.get(cls); }
  return undefined;
}
/** Toolbox id → module, so a fully-qualified call (e.g. phased.steervec) or useToolbox(id)
 *  can address a specific owner — nothing is discarded on a name collision. */
export const TOOLBOX_BY_ID = new Map<string, ToolboxModule>();
/** Builtin name → list of owning toolbox ids, in registry (precedence) order. Mirrors
 *  MATLAB's `which -all`: every owner is retained, not just the first-wins default pick. */
export const NAME_OWNERS = new Map<string, string[]>();

for (const tb of TOOLBOXES) {
  TOOLBOX_BY_ID.set(tb.id, tb);
  const keep = TOOLBOX_KEEP[tb.id];
  for (const [name, fn] of Object.entries(tb.builtins)) {
    if (keep && !keep.has(name)) continue;   // curated allow-list: skip de-registered breadth
    const owners = NAME_OWNERS.get(name); if (owners) owners.push(tb.id); else NAME_OWNERS.set(name, [tb.id]);
    if (!(name in TOOLBOX_BUILTINS)) TOOLBOX_BUILTINS[name] = fn;
    if (!FUNC_TOOLBOX.has(name)) FUNC_TOOLBOX.set(name, tb);
  }
  if (tb.methods) for (const [cls, table] of Object.entries(tb.methods)) {
    const existing = TOOLBOX_METHODS.get(cls) ?? {};
    for (const [fn, impl] of Object.entries(table)) { if (!(fn in existing)) existing[fn] = impl; METHOD_NAMES.add(fn); if (!FUNC_TOOLBOX.has(fn)) FUNC_TOOLBOX.set(fn, tb); }
    TOOLBOX_METHODS.set(cls, existing);
  }
  if (tb.parents) for (const [cls, parent] of Object.entries(tb.parents)) if (!CLASS_PARENTS.has(cls)) CLASS_PARENTS.set(cls, parent);
  if (tb.constants) for (const [k, v] of Object.entries(tb.constants)) if (!(k in TOOLBOX_CONSTANTS)) TOOLBOX_CONSTANTS[k] = v;
  for (const [k, h] of Object.entries(tb.help)) if (!(k in TOOLBOX_HELP)) TOOLBOX_HELP[k] = h;
}
