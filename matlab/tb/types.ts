// Toolbox-module framework: each MATLAB toolbox is one module exporting its builtins, help,
// and documentation metadata. Modules are aggregated by ./index.ts and merged into the global
// BUILTINS/help registries (base MATLAB always takes precedence). See plan §2.
import type { Builtin } from '../builtins';
import type { Value } from '../values';
import type { HelpEntry } from '../help/types';

export interface ToolboxModule {
  /** Short id matching the reference-data dir, e.g. 'stats'. */
  id: string;
  /** Display name, e.g. 'Statistics and Machine Learning Toolbox'. */
  name: string;
  /** Base documentation URL; docUrl appends `<lowername>.html` unless `docPath` is given. */
  docBase: string;
  /** Optional custom doc path within docBase for families like sym (`sym.<name>.html`). */
  docPath?: (name: string) => string;
  /** Function implementations — same signature as base builtins. */
  builtins: Record<string, Builtin>;
  /** Optional zero-arg constants/values (e.g. toolbox-specific named values). */
  constants?: Record<string, () => Value>;
  /** Help entries (structured HelpEntry or a one-line summary string) keyed by function name. */
  help: Record<string, HelpEntry | string>;
  /** Class-method overloads for OOP-style type dispatch: className → (fnName → impl). When a
   *  function name is owned by multiple toolboxes (e.g. Control `series` vs Symbolic `series`),
   *  a call whose first argument is of `className` routes here instead of the global builtin —
   *  matching MATLAB's method dispatch. See tb/index.ts (TOOLBOX_METHODS) + interp.ts. */
  methods?: Record<string, Record<string, Builtin>>;
  /** Class inheritance: childClassName → parentClassName. Method dispatch walks this chain
   *  (child → parent → …), so shared behaviour is declared once on a base class (e.g. tf/ss/zpk
   *  → 'lti'; Normal/Poisson → 'distribution') instead of repeated per subclass. See CLASS_PARENTS
   *  + lookupMethod in tb/index.ts. */
  parents?: Record<string, string>;
}
