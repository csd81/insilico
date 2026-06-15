/**
 * Base/core builtin triage audit.
 *
 *   pnpm oracle:base-audit
 *
 * Buckets the base/core builtins (the global registry minus the curated toolboxes) using the
 * EXPLICIT metadata in base-buckets.ts — not a raw reference percentage. The base ratio is a
 * poor metric (primitives like size/zeros/colon/+/* run in nearly every case but are never
 * named), so this reports by bucket + validation mode and flags the work queue:
 *   - per-bucket counts (incl. `uncategorized` = the triage backlog)
 *   - contract-core: directly referenced vs relying on indirect exercise (verify those)
 *   - needs-oracle: the priority queue for new oracle/invariant cases
 *   - metadata hygiene: stale entries (not in base) and `validation:direct` that isn't referenced
 *
 * Requires `tsc -p tsconfig.test.json` to have run first.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const load = (p) => import(pathToFileURL(join(repo, '.test-dist', p)).href);

const { CASES } = await load('test/oracle/cases.js');
const { BASE_BUCKETS } = await load('test/oracle/base-buckets.js');
const { TOOLBOX_BUILTINS } = await load('tb/index.js');
const { BUILTINS } = await load('builtins.js');

const referenced = new Set();
for (const c of CASES) for (const t of (c.src.match(/[a-zA-Z_]\w*/g) ?? [])) referenced.add(t);

const tb = new Set(Object.keys(TOOLBOX_BUILTINS));
const base = Object.keys(BUILTINS).filter((n) => !tb.has(n));
const baseSet = new Set(base);

const BUCKETS = ['contract-core', 'needs-oracle', 'ts-only-ok', 'defer', 'out-of-scope', 'alias-helper', 'uncategorized'];
const byBucket = Object.fromEntries(BUCKETS.map((b) => [b, []]));
for (const n of base) (byBucket[BASE_BUCKETS[n]?.bucket ?? 'uncategorized']).push(n);

const refd = (arr) => arr.filter((n) => referenced.has(n)).length;
const pad = (s, w) => String(s).padStart(w);

console.log(`Base/core triage audit — ${base.length} base builtins (global registry minus ${tb.size} toolbox builtins)\n`);
console.log(`bucket            count  directly-ref   note`);
for (const b of BUCKETS) {
  const arr = byBucket[b];
  if (!arr.length) continue;
  const note = b === 'uncategorized' ? '← triage backlog'
    : b === 'contract-core' ? 'must stay covered (direct or indirect)'
    : b === 'needs-oracle' ? 'oracle-validatable math (untested subset = the queue, below)'
    : b === 'out-of-scope' ? 'candidate to move/quarantine/delete' : '';
  console.log(`  ${b.padEnd(16)} ${pad(arr.length, 5)}  ${pad(refd(arr), 12)}   ${note}`);
}
console.log(`  ${'TOTAL'.padEnd(16)} ${pad(base.length, 5)}  ${pad(refd(base), 12)}`);

// contract-core: which rely on indirect exercise (not directly referenced) — verify or add a case.
const ccIndirect = byBucket['contract-core'].filter((n) => !referenced.has(n));
console.log(`\ncontract-core: ${byBucket['contract-core'].length} total, `
  + `${refd(byBucket['contract-core'])} directly referenced, ${ccIndirect.length} rely on indirect exercise:`);
console.log(`  ${ccIndirect.map((n) => `${n} (${BASE_BUCKETS[n].validation})`).join(', ') || '(none — all directly referenced)'}`);

// needs-oracle: some are already validated (validation:direct, referenced); the rest is the queue.
const noRef = byBucket['needs-oracle'].filter((n) => referenced.has(n));
const noQueue = byBucket['needs-oracle'].filter((n) => !referenced.has(n));
if (byBucket['needs-oracle'].length)
  console.log(`\nneeds-oracle: ${byBucket['needs-oracle'].length} total — ${noRef.length} already validated (direct), ${noQueue.length} untested`);
if (noQueue.length) console.log(`  needs-oracle untested (queue): ${noQueue.join(' ')}`);

// The real pass-2 queue = anything not yet oracle-referenced and not parked in ts-only/defer/alias/out.
const queue = [...byBucket['needs-oracle'], ...byBucket['uncategorized']].filter((n) => !referenced.has(n));
console.log(`\nPass-2 queue (untested, oracle/invariant candidates): ${queue.length}`
  + ` = needs-oracle-untested (${noQueue.length}) + uncategorized-unreferenced (${queue.length - noQueue.length})`);

// metadata hygiene
const stale = Object.keys(BASE_BUCKETS).filter((n) => !baseSet.has(n));
const directNotRef = Object.keys(BASE_BUCKETS).filter((n) => baseSet.has(n) && BASE_BUCKETS[n].validation === 'direct' && !referenced.has(n));
if (stale.length) console.log(`\n⚠ stale metadata (not in base — moved/removed/in a toolbox): ${stale.join(' ')}`);
if (directNotRef.length) console.log(`\n⚠ marked validation:direct but NOT referenced (fix metadata or add a case): ${directNotRef.join(' ')}`);

console.log(`\nStop criteria: every contract-core builtin categorized (done: ${byBucket['contract-core'].length}); `
  + `needs-oracle queue emptied; uncategorized (${byBucket['uncategorized'].length}) triaged into buckets.`);
console.log(`NOTE: judge base/core by these buckets, not by a reference %. Primitives are exercised`);
console.log(`indirectly and rarely named; the % undercounts and is not a coverage target.`);
