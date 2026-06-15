// Central toolbox registry. Aggregates every ToolboxModule into merged builtin/constant/help
// tables plus a name→toolbox map. Merged into the global BUILTINS in builtins.ts AFTER which
// the base entries are spread, so base MATLAB always wins on a name collision (see plan §3).
//
// Registration is limited to in-scope numerical/matrix-computation domains. Out-of-scope
// domain toolboxes are NOT registered (source kept under matlab/tb/ but not exposed at
// runtime): antenna/rf, audio, bioinfo, financial/fininst, lidar/radar,
// textanalytics, vision (earlier); fuzzy, gads, ident, parallel, phased,
// risk, robotics;
// (wavelet + aerospace + econ + fusion + nav + fixedpoint are now RESTORED + selectively
// registered via RESTORED_TOOLBOX_KEEP — wavelet: DCT + DWT; aerospace: rotation/quaternion
// algebra; econ: time-series diagnostics; fusion: optimal assignment + covariance-intersection
// fusion; nav: WGS84 geodetic↔ECEF transforms; fixedpoint: CORDIC sqrt/rotate/QR);
// (wavelet + aerospace + econ + fusion are now RESTORED + selectively registered via
// RESTORED_TOOLBOX_KEEP — wavelet: DCT + DWT; aerospace: rotation/quaternion algebra;
// econ: time-series diagnostics; fusion: optimal assignment + covariance-intersection fusion;
// nav: WGS84 geodetic↔ECEF transforms; curvefit: Franke test surface + single-B-spline ppform +
// spmak B-form constructor + B-form-aware fnval/fnder/fnint);
// textanalytics, vision (earlier); fixedpoint, gads, ident, parallel, phased,
// risk, robotics;
// (wavelet + aerospace + econ + fusion + nav + fuzzy are now RESTORED + selectively registered via
// RESTORED_TOOLBOX_KEEP — wavelet: DCT + DWT; aerospace: rotation/quaternion algebra;
// econ: time-series diagnostics; fusion: optimal assignment + covariance-intersection fusion;
// nav: WGS84 geodetic↔ECEF transforms; fuzzy: deterministic membership functions);
// images (image processing), mapping (geodesy), nnet
// (deep-learning layers/training), rl (reinforcement learning), pde (PDE-Toolbox object/mesh
// machinery — PDEs are covered by the numerical-pde domain's inline finite-difference cases). None
// (wavelet + aerospace + econ + fusion + nav + pde are now RESTORED + selectively registered via
// RESTORED_TOOLBOX_KEEP — wavelet: DCT + DWT; aerospace: rotation/quaternion algebra;
// econ: time-series diagnostics; fusion: optimal assignment + covariance-intersection fusion;
// nav: WGS84 geodetic↔ECEF transforms; pde: linear-triangle FEM area-integral assembly assema);
// images (image processing), mapping (geodesy), nnet
// (deep-learning layers/training), rl (reinforcement learning); pde's [p,e,t]-mesh FEM
// area-integral assembly (assema) is now registered, but the PDEModel object/mesh-generation/
// boundary surface (incl. assemb — needs the legacy text-expression boundary matrix) stays
// unregistered; curvefit (B-spline object subsystem — base spline/polyfit/interp cover it). None
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
import { AEROSPACE } from './aerospace';
import { ECON } from './econ';
import { FUSION } from './fusion';
import { NAV } from './nav';
import { FIXEDPOINT } from './fixedpoint';
import { CURVEFIT } from './curvefit';
import { FUZZY } from './fuzzy';
import { Pde } from './pde';

/** All registered toolboxes, in precedence order (first wins on inter-toolbox collision). */
export const TOOLBOXES: ToolboxModule[] = [
  COMM, CONTROL, DSP, OPTIM, SIGNAL, STATS, SYMBOLIC,
  WAVELET,     // restored — registered via RESTORED_TOOLBOX_KEEP (validated subset only)
  AEROSPACE,   // restored — only the deterministic rotation/quaternion math (allow-list below)
  ECON,        // restored — unit-root + deterministic time-series diagnostics (allow-list below)
  FUSION,      // restored — optimal assignment + covariance-intersection fusion (allow-list below)
  NAV,         // restored — WGS84 geodetic↔ECEF coordinate transforms (allow-list below)
  FIXEDPOINT,  // restored — only the CORDIC elementary-function math (allow-list below)
  CURVEFIT,    // restored — Franke surface + single-B-spline ppform + spmak/B-form fnval/fnder/fnint
  FUZZY,       // restored — deterministic fuzzy membership functions (allow-list below)
  Pde,         // restored — linear-triangle FEM area-integral assembly assema (allow-list below)
];

/** Per-toolbox allow-lists: when a toolbox id appears here, ONLY the named builtins are
 *  registered (the rest of its source is kept but not exposed at runtime). This curates the
 *  large signal/stats tails down to validated + core graduate functions, and reduces dsp to
 *  its one oracle-validated overlap (`resample`). Toolboxes not listed register everything.
 *  See `pnpm oracle:audit` for the per-toolbox registered/validated breakdown. */
export const TOOLBOX_KEEP: Record<string, Set<string>> = {
  // dsp overlaps signal and is otherwise toolbox-object breadth; keep only the validated overlap.
  dsp: new Set(['resample', 'besself']),
  // comm: keep coding theory, GF(p) finite-field arithmetic, base conversions and error metrics;
  // de-register the modulation/telecom/RF tail (psk/qam/dpsk/fm, qfunc/marcumq/fspl, interleavers).
  comm: new Set([
    'convenc', 'poly2trellis', 'istrellis', 'cyclgen', 'cyclpoly', 'gen2par', 'hammgen',
    'primpoly', 'gfminpol', 'rsgenpolycoeffs', 'gftrunc', 'gfweight', 'gfdeconv',
    'gfadd', 'gfsub', 'gfmul', 'gfdiv', 'gfconv', 'gfrank',
    'gf', 'bchgenpoly', 'bchenc', 'bchdec', 'rsgenpoly',
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
    'lft', 'ltitr', 'h2norm', 'hinfnorm',
  ]),
  // signal: validated/core filter design + response + filtering, spectral estimation (validate-next),
  // common windows used by filters; the peripheral tail (pulse/radar generators, telecom helpers,
  // exotic windows, niche parametric/AR utilities) is de-registered.
  signal: new Set([
    'hilbert', 'findpeaks', 'butter', 'freqz', 'filtfilt', 'fir1',
    'periodogram', 'pwelch', 'spectrogram', 'stft', 'czt', 'dct',
    'kaiser', 'rectwin', 'triang', 'gausswin',   // hamming/hann/hanning/blackman/bartlett removed (base is MATLAB-correct)
    'dftmtx', 'interp', 'levinson', 'overshoot', 'square',
    'cconv', 'besselap',   // circular convolution; Bessel analog LP prototype [z,p,k]
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
    'ecdf', 'dummyvar', 'canoncorr', 'adtest', 'cholcov',   // descriptive stats + PSD covariance factor
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
  wavelet: new Set(['dct', 'idct', 'dwt', 'idwt', 'wavedec', 'waverec', 'haart', 'ihaart', 'wfilters', 'centfrq']),
  // aerospace (id 'aero'): only the deterministic rotation/quaternion algebra — direction-cosine
  // matrices and scalar-first quaternions (Hamilton product, rotation, inverse). Pure math, exact
  // MATLAB parity; the toolbox's model/environment/UI surface stays unregistered.
  aero: new Set(['angle2dcm', 'dcm2angle', 'angle2quat', 'quatmultiply', 'quatrotate', 'quatinv']),
  // econ: deterministic time-series diagnostics (sample ACF/PACF/XCF, ADF unit-root, Engle ARCH LM).
  // The product's model-object/estimation surface (arima/garch/egarch …) stays unregistered.
  econ: new Set(['autocorr', 'crosscorr', 'parcorr', 'adftest', 'archtest']),
  // fusion: discrete-optimization assignment (Munkres/auction, optimal min-cost) + covariance-
  // intersection track fusion. The Sensor-Fusion product's tracker/object surface stays unregistered.
  fusion: new Set(['assignmunkres', 'assignauction', 'fusecovint']),
  // nav: deterministic WGS84 geodetic ↔ ECEF transforms. (lookangles deferred — its satPos
  // convention couldn't be pinned cleanly against MATLAB; lla2ned/lla2enu pending verification.)
  nav: new Set(['lla2ecef', 'ecef2lla']),
  // fixedpoint: only the deterministic CORDIC elementary-function math — square root (hyperbolic
  // CORDIC), complex rotation (x·exp(iθ)), and QR via CORDIC Givens rotations. Software double-
  // precision emulation matching MATLAB to ~1e-8; the fi/numerictype/quantizer object surface
  // stays unregistered.
  fixedpoint: new Set(['cordicsqrt', 'cordicrotate', 'cordicqr']),
  // curvefit: Franke's 2-D test surface, the lone B-spline B_{1,k} in ppform (bspline), the B-form
  // constructor (spmak), and B-form-aware fnval/fnder/fnint (extend base's pp-only versions to the
  // 'B-' form; base still wins on the shared names — see DUPLICATE_POLICY). The fit/fittype/smooth
  // surface and the rest of the spline object subsystem (spapi/csaps/aptknt/…) stay unregistered.
  curvefit: new Set(['franke', 'bspline', 'spmak', 'fnval', 'fnder', 'fnint']),
  // fuzzy: only the deterministic closed-form membership functions (triangular/trapezoidal/Gaussian/
  // generalized-bell/sigmoidal) + discrete defuzzification + the legacy named-MF evaluator. The full
  // FIS/ANFIS rule-base/inference object system stays unregistered.
  fuzzy: new Set(['trimf', 'trapmf', 'gaussmf', 'gbellmf', 'defuzz', 'sigmf', 'evalmf']),
  // pde: ONLY assema — legacy [p,t]-mesh linear-triangle FEM area-integral assembly of the
  // stiffness K, mass M and load F for a scalar 2-D PDE (-div(c·grad u)+a·u=f). Exact MATLAB
  // R2026a parity on a fixed mesh across all numeric coefficient forms (c isotropic/diagonal/
  // symmetric/full-tensor, scalar a,f). assemb is DECLINED: it consumes the legacy boundary
  // matrix b, a packed-column encoding whose q/g/h/r entries are ASCII text expressions requiring
  // a MATLAB expression evaluator the sandbox deliberately lacks — cannot be cleanly oracle-
  // validated. The PDEModel-object/mesh-generation/assempde/adaptmesh surface stays unregistered.
  pde: new Set(['assema']),
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
  //
  // curvefit fnval/fnder/fnint: base owns the pp-form versions (used by the oracle cases); the
  // curvefit copies additionally handle the B-form struct produced by spmak (form 'B-'), which the
  // base versions reject. Base wins on the bare name (so pp-form callers are unchanged); the B-form
  // behavior is reachable via the qualified `curvefit.fnval(...)` call. On pp-form input the two
  // agree exactly, so this is a strict superset, not a contradiction.
  fnval: { defaultOwner: 'base', sameBehavior: false, differs: 'curvefit.fnval also evaluates spmak B-form (form "B-"); base handles pp-form only. Identical on pp-form.' },
  fnder: { defaultOwner: 'base', sameBehavior: false, differs: 'curvefit.fnder also differentiates the B-form; base handles pp-form only. Identical on pp-form.' },
  fnint: { defaultOwner: 'base', sameBehavior: false, differs: 'curvefit.fnint also integrates the B-form; base handles pp-form only. Identical on pp-form.' },
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
