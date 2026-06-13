/**
 * Coverage report for the oracle suite. Tallies cases by declared domain + level
 * (and technique tags) so coverage is measurable, not vibes
 * ("we cover 9/14 graduate-applied domains").
 *
 *   pnpm oracle:coverage
 *
 * Metadata is declared per case in cases.ts (domain / level / tags);
 * the taxonomy lives in docs/coverage-map.md.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const { CASES } = await import(pathToFileURL(join(repo, '.test-dist', 'test', 'oracle', 'cases.js')).href);

const byDomain = new Map();
const byLevel = new Map();
const byTag = new Map();
let classified = 0;
for (const c of CASES) {
  if (c.domain) { byDomain.set(c.domain, (byDomain.get(c.domain) ?? 0) + 1); classified++; }
  if (c.level) byLevel.set(c.level, (byLevel.get(c.level) ?? 0) + 1);
  for (const t of c.tags ?? []) byTag.set(t, (byTag.get(t) ?? 0) + 1);
}

const sortDesc = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);

console.log(`Oracle cases: ${CASES.length}  (domain-classified: ${classified}, unclassified: ${CASES.length - classified})`);
console.log(`\nBy level:`);
for (const [lvl, n] of sortDesc(byLevel)) console.log(`  ${lvl.padEnd(12)} ${n}`);
console.log(`\nBy domain (${byDomain.size} declared):`);
for (const [d, n] of sortDesc(byDomain)) console.log(`  ${d.padEnd(28)} ${n}`);
console.log(`\nTechnique tags: ${byTag.size}`);
