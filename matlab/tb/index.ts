// Central toolbox registry. Aggregates every ToolboxModule into merged builtin/constant/help
// tables plus a name→toolbox map. Merged into the global BUILTINS in builtins.ts AFTER which
// the base entries are spread, so base MATLAB always wins on a name collision (see plan §3).
//
// Registration is limited to in-scope numerical/matrix-computation domains. Out-of-scope
// domain toolboxes are NOT registered (source kept under matlab/tb/ but not exposed at
// runtime): aerospace, antenna/rf, audio, bioinfo, financial/fininst, lidar/radar,
// textanalytics, vision (earlier); fixedpoint, fusion, fuzzy, gads, ident, parallel, phased,
// risk, robotics; and — de-registered as low-value breadth — econ (econometrics),
// (wavelet is now RESTORED + selectively registered via RESTORED_TOOLBOX_KEEP — DCT + DWT);
// images (image processing), mapping (geodesy), nav (navigation/coord frames), nnet
// (deep-learning layers/training), rl (reinforcement learning), pde (PDE-Toolbox object/mesh
// machinery — PDEs are covered by the numerical-pde domain's inline finite-difference cases),
// curvefit (B-spline object subsystem — base spline/polyfit/interp cover the workflows). None
// of these were used by any oracle case. Within the registered toolboxes individual functions
// may still be unvalidated; oracle coverage is per case (see docs/coverage-map.md), not per
// toolbox.
import type { Builtin } from '../builtins';
import type { Value } from '../values';
import type { HelpEntry } from '../help';
import { setToolboxHelpRefs } from '../help';
import type { ToolboxModule } from './types';
import { COMM } from './comm';
import { CONTROL } from './control';
import { DSP } from './dsp';
// OPTIM registered for fgoalattain ONLY (no base equivalent); the other 13 builtins are
// quarantined inside optim.ts (11 duplicate correct base builtins, optimvar/optimproblem stubs).
import { OPTIM } from './optim';
import { SIGNAL } from './signal';
import { STATS } from './stats';
import { SYMBOLIC } from './symbolic';
// Restored toolboxes (source brought back, registered selectively + validated). See RESTORED_TOOLBOX_KEEP.
import { WAVELET } from './wavelet';

/** All registered toolboxes, in precedence order (first wins on inter-toolbox collision). */
export const TOOLBOXES: ToolboxModule[] = [
  COMM, CONTROL, DSP, OPTIM, SIGNAL, STATS, SYMBOLIC,
  WAVELET,   // restored — registered via RESTORED_TOOLBOX_KEEP (validated subset only)
];

/** Per-toolbox allow-lists: when a toolbox id appears here, ONLY the named builtins are
 *  registered (the rest of its source is kept but not exposed at runtime). This curates the
 *  large signal/stats tails down to validated + core graduate functions, and reduces dsp to
 *  its one oracle-validated overlap (`resample`). Toolboxes not listed register everything.
 *  See `pnpm oracle:audit` for the per-toolbox registered/validated breakdown. */
export const TOOLBOX_KEEP: Record<string, Set<string>> = {
  // dsp overlaps signal and is otherwise toolbox-object breadth; keep only the validated overlap.
  dsp: new Set(['resample']),
  // comm: keep coding theory, GF(p) finite-field arithmetic, base conversions and error metrics;
  // de-register the modulation/telecom/RF tail (psk/qam/dpsk/fm, qfunc/marcumq/fspl, interleavers).
  comm: new Set([
    'convenc', 'poly2trellis', 'istrellis', 'cyclgen', 'cyclpoly', 'gen2par', 'hammgen',
    'primpoly', 'gfminpol', 'rsgenpolycoeffs', 'gftrunc', 'gfweight', 'gfdeconv',
    'gfadd', 'gfsub', 'gfmul', 'gfdiv', 'gfconv', 'gfrank',
    'de2bi', 'bi2de', 'oct2dec', 'oct2poly', 'vec2mat',
    'biterr', 'symerr', 'finddelay',
  ]),
  // control: keep model objects/data/conversions, analysis, realizations, Riccati/Lyapunov,
  // responses, controllability/observability and placement; de-register the peripheral tail
  // (PID family, LQG/lqi/lqrd, random-model gen, frd/dss objects, gensig/filt/nichols/dsort).
  control: new Set([
    'tf', 'ss', 'zpk', 'tfdata', 'ssdata', 'zpkdata',
    'tf2ss', 'tf2zp', 'zp2tf', 'ss2ss',   // ss2tf removed (identical to base)
    'pole', 'zero', 'damp', 'dcgain', 'order', 'isstable', 'isct', 'isdt',
    'minreal', 'sminreal', 'canon', 'ctrbf', 'obsvf', 'ctrb', 'obsv', 'gram',
    'care', 'dare', 'idare', 'lyapchol', 'lqr', 'dlqr', 'lqe', 'kalman',   // lyap/dlyap removed (identical to base)
    'acker', 'place', 'c2d',
    'step', 'impulse', 'lsim', 'lsiminfo', 'bode', 'bodemag', 'margin', 'stepinfo', 'feedback',
  ]),
  // signal: validated/core filter design + response + filtering, spectral estimation (validate-next),
  // common windows used by filters; the peripheral tail (pulse/radar generators, telecom helpers,
  // exotic windows, niche parametric/AR utilities) is de-registered.
  signal: new Set([
    'hilbert', 'findpeaks', 'butter', 'freqz', 'filtfilt', 'fir1',
    'periodogram', 'pwelch', 'spectrogram', 'stft', 'czt', 'dct',
    'kaiser', 'rectwin', 'triang', 'gausswin',   // hamming/hann/hanning/blackman/bartlett removed (base is MATLAB-correct)
    'dftmtx', 'interp', 'levinson', 'overshoot', 'square',
  ]),
  // stats: the 8 core distribution families (cdf/pdf/inv/fit/stat), the validated inference suite,
  // and statistical-algebra core (pca/knnsearch/pdist/robustfit/glmfit/ksdensity/QMC). Peripheral
  // distributions (extreme-value, noncentral, multivariate, copulas), nan*-helpers and niche
  // modeling utilities are de-registered.
  stats: new Set([
    'norminv', 'normfit', 'normstat',   // normcdf/normpdf removed (identical to base)
    'tcdf', 'tpdf', 'tinv', 'tstat',
    'chi2cdf', 'chi2pdf', 'chi2inv', 'chi2stat',
    'fcdf', 'fpdf', 'finv', 'fstat',
    'betacdf', 'betapdf', 'betainv', 'betafit', 'betastat',
    'gamcdf', 'gampdf', 'gaminv', 'gamfit', 'gamstat',
    'poisscdf', 'poisspdf', 'poissinv', 'poissfit', 'poisstat',
    'binocdf', 'binopdf', 'binoinv', 'binofit', 'binostat',
    'cdf', 'pdf', 'icdf', 'random', 'makedist', 'fitdist',
    'ttest', 'ttest2', 'kstest', 'kstest2', 'vartest', 'chi2gof', 'anova1', 'ranksum', 'signrank',
    'pca', 'knnsearch', 'robustfit', 'glmfit', 'ksdensity', 'kmeans',   // pdist/squareform removed (identical to base)
    'haltonset', 'net', 'moment',   // range removed (identical to base)
  ]),
};

/** Restored-toolbox allow-lists. The deleted toolbox source files were brought back as a
 *  curated pool (source-only by default); a restored toolbox is registered ONLY when it appears
 *  here, and ONLY the named functions are exposed — each must be math/computation-adjacent,
 *  deterministic, MATLAB R2026a-present, and oracle/invariant-validated. Source presence is not a
 *  correctness promise; this allow-list is. Grow it as functions are validated. */
export const RESTORED_TOOLBOX_KEEP: Record<string, Set<string>> = {
  // wavelet: orthonormal DCT-II (matches MATLAB) + Haar/Daubechies DWT (orthonormal → perfect
  // reconstruction), single/multi-level. Validated by exact values + reconstruction invariants.
  wavelet: new Set(['dct', 'idct', 'dwt', 'idwt', 'wavedec', 'waverec', 'haart', 'ihaart']),
};

/** Intentional-duplicate policy. A name implemented in BOTH base and a toolbox is a cross-layer
 *  duplicate; base wins by default (it is spread last in BUILTINS). Every such duplicate must have
 *  an entry here saying who owns the default and whether the behaviors agree — `pnpm registry:audit`
 *  fails on any undocumented duplicate. `sameBehavior:true` ⇒ the toolbox copy is dead/redundant
 *  (delete candidate). `sameBehavior:false` ⇒ keep both; the alternative is reachable via the
 *  qualified `toolbox.name(...)` call, and `differs` explains the divergence. */
export interface DuplicatePolicy { defaultOwner: 'base' | string; sameBehavior: boolean; differs?: string; note?: string; }
export const DUPLICATE_POLICY: Record<string, DuplicatePolicy> = {
  // No cross-layer duplicates remain. Every former duplicate was resolved by probing MATLAB and
  // keeping the SINGLE implementation that matches it (the other copy was either byte-identical or
  // outright wrong), so there is nothing to choose between:
  //   • bartlett/blackman/hamming/hann, dlyap/lyap/ss2tf, normcdf/normpdf/pdist/range/squareform —
  //     toolbox copies were byte-identical to base → deleted; base is the single impl.
  //   • hanning — the signal copy was WRONG (it returned the hann window); MATLAB's hanning(5) is
  //     [.25 .75 1 .75 .25], which base produces → signal copy deleted.
  //   • hypergeom — MATLAB has ONE hypergeom (Symbolic Math Toolbox: hypergeom.m + @sym/hypergeom.m),
  //     polymorphic over numeric/symbolic args. The symbolic impl already has a numeric fast-path,
  //     so the redundant base copy was deleted; symbolic.hypergeom is the single owner.
  // This table (and `pnpm registry:audit`) stays in place to catch any NEW duplicate that creeps in.
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
  const keep = TOOLBOX_KEEP[tb.id] ?? RESTORED_TOOLBOX_KEEP[tb.id];
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

// Inject the toolbox registry into the help renderer. help/ owns the HELP_<TOOLBOX> maps (which the
// toolbox modules import), so it must not import ../tb at load time — instead we push the registry
// to it here, once it is fully built. This keeps the dependency one-directional (tb → help).
setToolboxHelpRefs(FUNC_TOOLBOX, TOOLBOX_HELP);
