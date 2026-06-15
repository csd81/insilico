/**
 * Per-function coverage index for the oracle suite.
 *
 *   pnpm oracle:functions            # full report
 *   pnpm oracle:functions <name>     # drill into one function (cases + aspects + missing)
 *
 * Inverts the oracle cases into a function → {cases, aspects} index and grades each registered
 * function against the canonical checklist (REQUIRED_ASPECTS in function-coverage.ts):
 *
 *   full      — has cases AND covers every required aspect
 *   partial   — has cases but is missing ≥1 required aspect (the gap is named)
 *   tested    — has cases but no checklist declared yet
 *   untested  — registered surface with no owning oracle case
 *
 * Ownership is explicit (`fn` on a case) or inferred (`tags` ∩ registry). Workflow cases
 * (`workflow: [...]`) are a separate integration layer — listed, but never counted as a
 * function's own aspect coverage. Duplicate (fn, aspect) pairs are allowed but flagged so an
 * accidental re-test is visible while an intentional extra-regime case is not blocked.
 *
 * Requires `tsc -p tsconfig.test.json` first (imports compiled modules).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const load = (p) => import(pathToFileURL(join(repo, '.test-dist', p)).href);

const { CASES } = await load('test/oracle/cases.js');
const { REQUIRED_ASPECTS } = await load('test/oracle/function-coverage.js');
const { TOOLBOXES, TOOLBOX_KEEP, RESTORED_TOOLBOX_KEEP, TOOLBOX_BUILTINS } = await load('tb/index.js');
const { BUILTINS } = await load('builtins.js');

const only = process.argv.slice(2).find((a) => !a.startsWith('-'));

// ── Registry universe + toolbox membership ───────────────────────────────────
const registered = new Set(Object.keys(BUILTINS));
const tbOf = new Map();               // fn -> toolbox id (else 'base')
for (const tb of TOOLBOXES) {
  const keep = TOOLBOX_KEEP[tb.id] ?? RESTORED_TOOLBOX_KEEP[tb.id] ?? new Set();
  for (const n of keep) if (registered.has(n)) tbOf.set(n, tb.id);
}
for (const n of registered) if (!tbOf.has(n)) tbOf.set(n, 'base');

// ── Invert cases into the per-function index ─────────────────────────────────
const idx = new Map();                // fn -> { cases:Set, aspects:Set, wf:Set, err:Set }
const get = (fn) => idx.get(fn) ?? idx.set(fn, { cases: new Set(), aspects: new Set(), wf: new Set(), err: new Set() }).get(fn);
const aspectCases = new Map();        // `${fn}::${aspect}` -> [caseName]
const workflows = [];
let unattributed = 0;

const inferOwners = (c) => {
  const tags = (c.tags ?? []).filter((t) => registered.has(t));
  return tags.length ? tags : [];     // precise ownership: explicit fn or function-name tags only
};
const inferAspects = (c) => (c.aspect ? (Array.isArray(c.aspect) ? c.aspect : [c.aspect]) : (c.tags ?? []).filter((t) => !registered.has(t)));

for (const c of CASES) {
  if (c.workflow) {
    const fns = c.workflow.filter((f) => registered.has(f));
    workflows.push({ name: c.name, fns, domain: c.domain });
    for (const f of fns) get(f).wf.add(c.name);
    continue;
  }
  const owners = c.fn ? [c.fn] : inferOwners(c);
  if (!owners.length) { unattributed++; continue; }
  // An expectError case is an input-validation test (errors in BOTH MATLAB and the engine); it
  // proves the function rejects bad input rather than being silently-wrong. Tracked per owner.
  const aspects = c.expectError ? ['error-input'] : inferAspects(c);
  for (const fn of owners) {
    const e = get(fn); e.cases.add(c.name);
    if (c.expectError) e.err.add(c.name);
    for (const a of aspects) {
      e.aspects.add(a);
      const k = `${fn}::${a}`; (aspectCases.get(k) ?? aspectCases.set(k, []).get(k)).push(c.name);
    }
  }
}

// ── Grade each registered function ───────────────────────────────────────────
const status = (fn) => {
  const e = idx.get(fn);
  if (!e || e.cases.size === 0) return { s: 'untested', missing: REQUIRED_ASPECTS[fn] ?? [] };
  const req = REQUIRED_ASPECTS[fn];
  if (!req) return { s: 'tested', missing: [] };
  const missing = req.filter((a) => !e.aspects.has(a));
  return { s: missing.length ? 'partial' : 'full', missing };
};

// ── Drill-down mode ──────────────────────────────────────────────────────────
if (only) {
  const e = idx.get(only); const st = status(only);
  console.log(`Function: ${only}   [${tbOf.get(only) ?? 'unregistered'}]   status: ${st.s}`);
  if (!registered.has(only)) console.log('  (not in the effective registry)');
  console.log(`  cases (${e?.cases.size ?? 0}): ${e ? [...e.cases].join(', ') : '—'}`);
  console.log(`  aspects covered: ${e && e.aspects.size ? [...e.aspects].sort().join(', ') : '—'}`);
  console.log(`  error/input test: ${e?.err.size ? [...e.err].join(', ') : '✗ none'}`);
  if (REQUIRED_ASPECTS[only]) console.log(`  required: ${REQUIRED_ASPECTS[only].join(', ')}`);
  if (st.missing.length) console.log(`  MISSING: ${st.missing.join(', ')}`);
  if (e?.wf.size) console.log(`  in workflows: ${[...e.wf].join(', ')}`);
  process.exit(0);
}

// ── Summary ──────────────────────────────────────────────────────────────────
const all = [...registered];
const tally = { full: 0, partial: 0, tested: 0, untested: 0 };
const partials = [], checklisted = [];
for (const fn of all) {
  const st = status(fn); tally[st.s]++;
  if (REQUIRED_ASPECTS[fn]) checklisted.push({ fn, ...st, e: idx.get(fn) });
  if (st.s === 'partial') partials.push({ fn, missing: st.missing });
}
const ownedFns = all.filter((fn) => idx.get(fn)?.cases.size);
const owned = ownedFns.length;
const errTested = ownedFns.filter((fn) => idx.get(fn).err.size).length;

console.log(`Per-function oracle coverage  (registry: ${all.length} functions)`);
console.log(`  owned by ≥1 case: ${owned}    untested: ${tally.untested}    (${(100 * owned / all.length).toFixed(1)}% have an owning case)`);
console.log(`  error / input-validation tested: ${errTested} of ${owned} owned  (${(100 * errTested / owned).toFixed(1)}%)  — every function should reject bad input`);
const clTally = checklisted.reduce((m, c) => ((m[c.s] = (m[c.s] ?? 0) + 1), m), {});
console.log(`  checklisted: ${checklisted.length}  →  full ${clTally.full ?? 0} · partial ${clTally.partial ?? 0} · untested ${clTally.untested ?? 0}`);
console.log(`  unattributed cases (no fn/function-tag): ${unattributed}\n`);

// Checklisted functions: the curated full/partial board (incl. error-test marker).
console.log('Checklisted functions (canonical regime coverage · err = has input-validation test):');
for (const { fn, s, missing, e } of checklisted.sort((a, b) => a.s.localeCompare(b.s) || a.fn.localeCompare(b.fn))) {
  const mark = s === 'full' ? '✓ full    ' : s === 'untested' ? '· untested' : '✗ partial ';
  const err = e?.err.size ? 'err✓' : 'err✗';
  console.log(`  ${mark} ${err} ${fn.padEnd(14)} cases:${String(e?.cases.size ?? 0).padStart(2)}  covered:[${[...(e?.aspects ?? [])].filter((a) => REQUIRED_ASPECTS[fn].includes(a)).join(',')}]${missing.length ? `  MISSING:[${missing.join(',')}]` : ''}`);
}

// Value-tested functions with NO input-validation test — the error-coverage backlog.
const noErr = ownedFns.filter((fn) => !idx.get(fn).err.size);
console.log(`\nValue-tested but missing an error/input test (${noErr.length}); first 24:`);
console.log('  ' + noErr.slice(0, 24).join(', ') + (noErr.length > 24 ? ' …' : ''));

// Untested registered surface, grouped by toolbox (the gap queue).
const untestedBy = new Map();
for (const fn of all) if (status(fn).s === 'untested') (untestedBy.get(tbOf.get(fn)) ?? untestedBy.set(tbOf.get(fn), []).get(tbOf.get(fn))).push(fn);
console.log(`\nUntested registered surface by toolbox (${tally.untested} total):`);
for (const [tb, fns] of [...untestedBy.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${tb.padEnd(12)} ${String(fns.length).padStart(3)}  ${fns.slice(0, 12).join(', ')}${fns.length > 12 ? ' …' : ''}`);
}

// Duplicate (fn, aspect) pairs — allowed, but flagged.
const dups = [...aspectCases.entries()].filter(([, cs]) => cs.length > 1);
if (dups.length) {
  console.log(`\nDuplicate (fn, aspect) pairs (${dups.length}) — allowed if intentional, else consolidate:`);
  for (const [k, cs] of dups.slice(0, 20)) console.log(`  ${k.padEnd(34)} ${cs.join(', ')}`);
}

// Workflows: the separate integration layer.
console.log(`\nWorkflow / integration cases (${workflows.length}):`);
for (const w of workflows) console.log(`  ${w.name.padEnd(30)} [${w.fns.join(', ')}]`);
