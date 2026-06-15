/**
 * Registry audit: how much of the registered toolbox surface is actually validated.
 *
 *   pnpm oracle:audit
 *
 * Reports, per registered toolbox:
 *   - registered builtins (after the per-toolbox allow-list in tb/index.ts)
 *   - how many are referenced by at least one oracle case
 *   - the registered-but-unreferenced names (the unvalidated tail)
 *   - the validated ratio
 *
 * "Referenced" = the function name appears as an identifier token in some oracle case
 * source. This is a coverage proxy (a referenced name is exercised by a real MATLAB
 * fixture); an unreferenced name is registered surface with no oracle backing yet.
 *
 * Requires `tsc -p tsconfig.test.json` to have run first (imports compiled modules).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const load = (p) => import(pathToFileURL(join(repo, '.test-dist', p)).href);

const { CASES } = await load('test/oracle/cases.js');
const { TOOLBOXES, TOOLBOX_KEEP } = await load('tb/index.js');

// Identifier tokens used in any oracle case source.
const referenced = new Set();
for (const c of CASES) for (const t of (c.src.match(/[a-zA-Z_]\w*/g) ?? [])) referenced.add(t);

// Effective registered names per toolbox = its builtins, filtered by the allow-list (if any).
const rows = [];
let totReg = 0, totRef = 0;
for (const tb of TOOLBOXES) {
  const keep = TOOLBOX_KEEP[tb.id];
  const names = Object.keys(tb.builtins ?? {}).filter((n) => !keep || keep.has(n));
  const ref = names.filter((n) => referenced.has(n));
  const unref = names.filter((n) => !referenced.has(n)).sort();
  totReg += names.length; totRef += ref.length;
  rows.push({ id: tb.id, reg: names.length, ref: ref.length, curated: !!keep, unref });
}

const pct = (a, b) => (b ? (100 * a / b).toFixed(0) : '—').toString().padStart(3);
console.log(`Registry audit — ${TOOLBOXES.length} toolboxes, ${totReg} registered builtins, `
  + `${totRef} referenced by oracle cases (${pct(totRef, totReg)}%)\n`);
console.log(`toolbox      registered  referenced  ratio  curated`);
for (const r of rows.sort((a, b) => b.reg - a.reg)) {
  console.log(`  ${r.id.padEnd(10)} ${String(r.reg).padStart(9)} ${String(r.ref).padStart(11)} ${pct(r.ref, r.reg)}%   ${r.curated ? 'allow-list' : ''}`);
}
console.log(`  ${'TOTAL'.padEnd(10)} ${String(totReg).padStart(9)} ${String(totRef).padStart(11)} ${pct(totRef, totReg)}%`);

console.log(`\nRegistered but unreferenced (unvalidated tail), per toolbox:`);
for (const r of rows) {
  if (!r.unref.length) { console.log(`  ${r.id}: (none — fully referenced)`); continue; }
  console.log(`  ${r.id} (${r.unref.length}): ${r.unref.join(' ')}`);
}
