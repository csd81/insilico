// Central toolbox registry. Aggregates every ToolboxModule into merged builtin/constant/help
// tables plus a name→toolbox map. Merged into the global BUILTINS in builtins.ts AFTER which
// the base entries are spread, so base MATLAB always wins on a name collision (see plan §3).
//
// NOTE: only validated, oracle-checked toolbox modules are registered here.
// Out-of-scope domain toolboxes have been removed to keep the engine focused on numerical
// analysis and matrix computation: aerospace, antenna/rf, audio, bioinfo, financial/fininst,
// lidar/radar, textanalytics, vision (earlier), and comm-adjacent/industry domains
// fixedpoint, fusion, fuzzy, gads, ident, parallel, phased, risk, robotics, wavelet.
import type { Builtin } from '../builtins';
import type { Value } from '../values';
import type { HelpEntry } from '../help/types';
import type { ToolboxModule } from './types';
import { COMM } from './comm';
import { CONTROL } from './control';
import { CURVEFIT } from './curvefit';
import { DSP } from './dsp';
import { ECON } from './econ';
import { IMAGES } from './images';
import { MAPPING } from './mapping';
import { NAV } from './nav';
import { NNET } from './nnet';
// OPTIM registered for fgoalattain ONLY (no base equivalent); the other 13 builtins are
// quarantined inside optim.ts (11 duplicate correct base builtins, optimvar/optimproblem stubs).
import { OPTIM } from './optim';
import { Pde } from './pde';
import { RL } from './rl';
import { SIGNAL } from './signal';
import { STATS } from './stats';
import { SYMBOLIC } from './symbolic';

/** All registered toolboxes, in precedence order (first wins on inter-toolbox collision). */
export const TOOLBOXES: ToolboxModule[] = [
  COMM, CONTROL, CURVEFIT, DSP, ECON, IMAGES, MAPPING, NAV, NNET, OPTIM, Pde,
  RL, SIGNAL, STATS, SYMBOLIC,
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
