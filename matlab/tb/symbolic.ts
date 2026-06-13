// Symbolic Math Toolbox — wraps the existing SYM_BUILTINS as the first ToolboxModule.
// Help entries cover the 46 SYM_BUILTINS functions not already in the base help table.
// docPath produces sym.<name>.html URLs; SYM_REF in help/ handles the URL generation.
import type { ToolboxModule } from './types';
import { HELP_SYMBOLIC } from '../help/help-symbolic';
import { SYM_BUILTINS } from '../sym-builtins';

export const SYMBOLIC: ToolboxModule = {
  id: 'symbolic',
  name: 'Symbolic Math Toolbox',
  docBase: 'https://www.mathworks.com/help/symbolic/',
  docPath: (name) => (name === 'sym' ? 'sym.html' : `sym.${name.toLowerCase()}.html`),
  builtins: SYM_BUILTINS,
  help: HELP_SYMBOLIC,
};
