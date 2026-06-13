/**
 * Coverage report for the oracle suite. Tallies tagged cases by topic and level
 * so coverage is measurable, not vibes ("we cover 9/14 graduate-applied areas").
 *
 *   pnpm exec tsc -p tsconfig.test.json && node matlab/test/oracle/coverage.mjs
 *
 * Tags are declared per case in cases.ts; the taxonomy lives in docs/coverage-map.md.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const { CASES } = await import(pathToFileURL(join(repo, '.test-dist', 'test', 'oracle', 'cases.js')).href);

const byTag = new Map();
let tagged = 0;
for (const c of CASES) {
  if (c.tags?.length) tagged++;
  for (const t of c.tags ?? []) byTag.set(t, (byTag.get(t) ?? 0) + 1);
}

const LEVELS = new Set(['undergrad', 'graduate']);
const topics = [...byTag.entries()].filter(([t]) => !LEVELS.has(t)).sort((a, b) => b[1] - a[1]);

console.log(`Oracle cases: ${CASES.length}  (tagged: ${tagged}, untagged: ${CASES.length - tagged})`);
console.log(`\nBy level:`);
for (const lvl of LEVELS) console.log(`  ${lvl.padEnd(12)} ${byTag.get(lvl) ?? 0}`);
console.log(`\nBy topic (${topics.length} areas tagged):`);
for (const [t, n] of topics) console.log(`  ${t.padEnd(28)} ${n}`);
