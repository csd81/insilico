// Central toolbox registry. Aggregates every ToolboxModule into merged builtin/constant/help
// tables plus a name→toolbox map. Merged into the global BUILTINS in builtins.ts AFTER which
// the base entries are spread, so base MATLAB always wins on a name collision (see plan §3).
// Eager static imports for now (plan §5: lazy code-splitting deferred).
//
// NOTE: only validated, oracle-checked toolbox modules are registered here. A large set of
// breadth-first stub modules exists on disk under tb/ but is intentionally NOT imported until
// each function is actually implemented and validated against live MATLAB (they currently
// return placeholder values and would otherwise ship confidently-wrong results + break the build).
import type { Builtin } from '../builtins';
import type { Value } from '../values';
import type { HelpEntry } from '../help/types';
import type { ToolboxModule } from './types';
import { AEROSPACE } from './aerospace';
import { ANTENNA } from './antenna';
import { AUDIO } from './audio';
import { BIOINFO } from './bioinfo';
import { COMM } from './comm';
import { CONTROL } from './control';
import { CURVEFIT } from './curvefit';
import { ECON } from './econ';
import { FINANCIAL } from './financial';
import { FUZZY } from './fuzzy';
import { IMAGES } from './images';
import { MAPPING } from './mapping';
import { NAV } from './nav';
import { Pde } from './pde';
import { RADAR } from './radar';
import { RL } from './rl';
import { RF } from './rf';
import { SIGNAL } from './signal';
// SIMULINK quarantined: different execution model (block diagram simulation vs language semantics),
// no course content dependency, no test coverage. Source preserved in quarantine/simulink/.
import { STATS } from './stats';
import { SYMBOLIC } from './symbolic';
import { WAVELET } from './wavelet';
import { DSP } from './dsp';
import { LIDAR } from './lidar';
import { GADS } from './gads';
// MPC removed (tb/mpc.ts deleted): every function was a stub — mpcmove hardcoded (ref-ym)/10,
// ignoring the plant/horizons/weights/constraints; the real QP solver was dead code.
import { IDENT } from './ident';
import { FININST } from './fininst';
import { FIXEDPOINT } from './fixedpoint';
import { PARALLEL } from './parallel';
import { FUSION } from './fusion';
import { ROBOTICS } from './robotics';
// OPTIM registered for fgoalattain ONLY (no base equivalent); the other 13 builtins are
// quarantined inside optim.ts (11 duplicate correct base builtins, optimvar/optimproblem stubs).
import { OPTIM } from './optim';
import { NNET } from './nnet';
import { TEXTANALYTICS } from './textanalytics';
import { VISION } from './vision';
import { PHASED } from './phased';
// UAV quarantined: all 5 functions (uavMinTurningRadius/FlightPathAngle/GroundSpeed/BankAngle/CrossTrackError)
// do not exist as standalone MATLAB functions — agent extracted formulas from OOP class internals
// and invented names. Not registerable until real UAV toolbox standalone functions are ported.
import { RISK } from './risk';

/** All registered toolboxes, in precedence order (first wins on inter-toolbox collision). */
export const TOOLBOXES: ToolboxModule[] = [
  AEROSPACE, ANTENNA, AUDIO, BIOINFO, COMM, CONTROL, CURVEFIT, DSP, ECON, FINANCIAL, FININST, FIXEDPOINT,
  LIDAR,
  FUSION, FUZZY, GADS, IDENT, IMAGES, MAPPING, NAV, NNET, OPTIM, PARALLEL, Pde, RADAR, RISK, RL, RF,
  PHASED, ROBOTICS, SIGNAL, STATS, SYMBOLIC, TEXTANALYTICS, VISION, WAVELET,
];

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
  for (const [name, fn] of Object.entries(tb.builtins)) {
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
