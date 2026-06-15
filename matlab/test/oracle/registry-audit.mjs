/**
 * Registry audit: how much of the *whole runtime registry* is actually validated.
 *
 *   pnpm oracle:audit
 *
 * Reports the effective registry the interpreter dispatches to — base/core builtins
 * plus the toolbox builtins that survive the per-toolbox allow-list in tb/index.ts:
 *   - the two layers (base/core vs toolboxes) and the grand total
 *   - per toolbox: registered, oracle-referenced, the registered-but-unreferenced tail, ratio
 *
 * "Referenced" = the function name appears as an identifier token in some oracle case
 * source. This is a coverage proxy (a referenced name is exercised by a real MATLAB
 * fixture); an unreferenced name is registered surface with no oracle backing yet.
 *
 * CAVEAT: the name scan only catches the *headline* function token in a case. Base/core
 * primitives (size, zeros, colon, indexing, +, *, sum, sqrt, ...) run in nearly every
 * case but are rarely named, so the base ratio is a large undercount. Toolbox functions
 * are called by name and don't have this problem — the toolbox ratio is the meaningful
 * curation metric. Base/core is a *triage* target (validate / move out genuine breadth),
 * not a *quarantine* target: core primitives can't be de-registered.
 *
 * Source vs registry: this audits the effective REGISTRY (post allow-list = what is
 * callable). A raw `Object.keys(tb.builtins)` count over the module source is larger
 * (it includes quarantined functions that error at runtime) — do not use it.
 *
 * Requires `tsc -p tsconfig.test.json` to have run first (imports compiled modules).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const load = (p) => import(pathToFileURL(join(repo, '.test-dist', p)).href);

const { CASES } = await load('test/oracle/cases.js');
const { TOOLBOXES, TOOLBOX_KEEP, TOOLBOX_BUILTINS } = await load('tb/index.js');
const { BUILTINS } = await load('builtins.js');

// Identifier tokens used in any oracle case source.
const referenced = new Set();
for (const c of CASES) for (const t of (c.src.match(/[a-zA-Z_]\w*/g) ?? [])) referenced.add(t);
const refCount = (names) => names.filter((n) => referenced.has(n)).length;
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '—').toString();
const padpct = (a, b) => `${pct(a, b)}%`.padStart(6);

// The effective runtime registry = everything in the global BUILTINS table.
// Base/core = BUILTINS minus the (already allow-list-filtered) toolbox builtins.
const tbRegistered = new Set(Object.keys(TOOLBOX_BUILTINS));
const allNames = Object.keys(BUILTINS);
const baseNames = allNames.filter((n) => !tbRegistered.has(n));

// Per-toolbox rows (registered = builtins surviving the allow-list).
const rows = [];
for (const tb of TOOLBOXES) {
  const keep = TOOLBOX_KEEP[tb.id];
  const names = Object.keys(tb.builtins ?? {}).filter((n) => !keep || keep.has(n));
  const unref = names.filter((n) => !referenced.has(n)).sort();
  rows.push({ id: tb.id, reg: names.length, ref: refCount(names), curated: !!keep, unref });
}
const tbReg = rows.reduce((s, r) => s + r.reg, 0);
const tbRef = rows.reduce((s, r) => s + r.ref, 0);
const baseRef = refCount(baseNames);

console.log(`Registry audit — whole runtime registry: ${allNames.length} registered, `
  + `${refCount(allNames)} referenced by oracle cases (${pct(refCount(allNames), allNames.length)}%)\n`);

console.log(`layer                 registered  referenced   ratio`);
console.log(`  base/core           ${String(baseNames.length).padStart(10)} ${String(baseRef).padStart(11)}  ${padpct(baseRef, baseNames.length)}   (undercount — see caveat)`);
console.log(`  toolboxes (${TOOLBOXES.length})        ${String(tbReg).padStart(10)} ${String(tbRef).padStart(11)}  ${padpct(tbRef, tbReg)}`);
console.log(`  TOTAL               ${String(allNames.length).padStart(10)} ${String(refCount(allNames)).padStart(11)}  ${padpct(refCount(allNames), allNames.length)}`);

console.log(`\nper toolbox           registered  referenced   ratio  curated`);
for (const r of rows.sort((a, b) => b.reg - a.reg)) {
  console.log(`  ${r.id.padEnd(18)} ${String(r.reg).padStart(10)} ${String(r.ref).padStart(11)}  ${padpct(r.ref, r.reg)}   ${r.curated ? 'allow-list' : ''}`);
}

console.log(`\nRegistered but unreferenced (unvalidated tail):`);
for (const r of rows) {
  if (!r.unref.length) { console.log(`  ${r.id}: (none — fully referenced)`); continue; }
  console.log(`  ${r.id} (${r.unref.length}): ${r.unref.join(' ')}`);
}
const baseUnref = baseNames.length - baseRef;
console.log(`  base/core (${baseUnref}): not listed — mostly core primitives exercised indirectly`);
console.log(`            (name scan can't see them); triage target, not quarantine target.`);

console.log(`\nCAVEAT: "referenced" = headline function-name token in a case source. Base/core`);
console.log(`primitives run in nearly every case but are rarely named, so the base ratio is a`);
console.log(`large undercount. The toolbox ratio is the meaningful curation metric.`);
