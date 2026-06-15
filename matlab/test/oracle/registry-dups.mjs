/**
 * Cross-layer duplicate audit — the single source of truth for "is this function implemented
 * more than once, and which copy is the default?".
 *
 *   pnpm registry:audit
 *
 * A name implemented in BOTH base (`builtins.ts`) and a registered toolbox is a duplicate. Base
 * wins by default (it is spread last in BUILTINS), so the toolbox copy is shadowed. Every such
 * duplicate must be documented in DUPLICATE_POLICY (tb/index.ts) with the default owner and whether
 * the behaviors agree. This audit lists them and FAILS (exit 1) when:
 *   - a duplicate has no DUPLICATE_POLICY entry (accidental duplicate), or
 *   - a DUPLICATE_POLICY entry names a function that is not actually a duplicate (stale policy).
 *
 * Requires `tsc -p tsconfig.test.json` to have run first.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const load = (p) => import(pathToFileURL(join(repo, '.test-dist', p)).href);

const { BUILTINS } = await load('builtins.js');
const { TOOLBOX_BUILTINS, FUNC_TOOLBOX, NAME_OWNERS, DUPLICATE_POLICY } = await load('tb/index.js');
const { CASES } = await load('test/oracle/cases.js');

const referenced = new Set();
for (const c of CASES) for (const t of (c.src.match(/[a-zA-Z_]\w*/g) ?? [])) referenced.add(t);

// A duplicate = a toolbox builtin whose name resolves to a DIFFERENT impl in BUILTINS (base won).
const duplicates = [];
for (const name of Object.keys(TOOLBOX_BUILTINS)) {
  if (BUILTINS[name] !== TOOLBOX_BUILTINS[name]) {
    const tb = FUNC_TOOLBOX.get(name)?.id ?? '?';
    duplicates.push({ name, toolbox: tb });
  }
}
duplicates.sort((a, b) => a.name.localeCompare(b.name));

console.log(`Cross-layer duplicate audit — ${duplicates.length} name(s) implemented in both base and a toolbox`);
console.log(`(base wins by default; the toolbox copy is reachable via the qualified \`toolbox.name(...)\` call)\n`);
console.log(`name              default  also-in    behavior   validated  policy`);

let fails = 0;
for (const { name, toolbox } of duplicates) {
  const pol = DUPLICATE_POLICY[name];
  const owners = NAME_OWNERS.get(name) ?? [];
  const behavior = !pol ? '???' : pol.sameBehavior ? 'same' : 'DIFFERS';
  const validated = referenced.has(name) ? 'oracle' : '—';
  const policy = pol ? 'documented' : '⚠ MISSING';
  if (!pol) fails++;
  console.log(`  ${name.padEnd(16)} ${(pol?.defaultOwner ?? 'base').padEnd(8)} ${toolbox.padEnd(10)} ${behavior.padEnd(10)} ${validated.padEnd(10)} ${policy}`);
  if (pol && !pol.sameBehavior) console.log(`      ↳ differs: ${pol.differs}`);
}

// Stale policy: an entry that isn't actually a duplicate any more.
const dupNames = new Set(duplicates.map((d) => d.name));
const stale = Object.keys(DUPLICATE_POLICY).filter((n) => !dupNames.has(n));
if (stale.length) { console.log(`\n⚠ stale DUPLICATE_POLICY entries (no longer a base/toolbox duplicate): ${stale.join(', ')}`); fails += stale.length; }

const sameCount = duplicates.filter((d) => DUPLICATE_POLICY[d.name]?.sameBehavior).length;
console.log(`\nSummary: ${duplicates.length} duplicates — ${sameCount} same-behavior (toolbox copy is a delete candidate), `
  + `${duplicates.length - sameCount} genuinely differ (keep both; use \`toolbox.name(...)\` for the alternative).`);
console.log(`Default-owner policy: base/core always wins; toolboxes never silently overwrite base.`);

if (fails) { console.error(`\nFAIL: ${fails} undocumented or stale duplicate(s). Add a DUPLICATE_POLICY entry (or remove the duplicate).`); process.exit(1); }
console.log(`\nOK: every duplicate is documented.`);
