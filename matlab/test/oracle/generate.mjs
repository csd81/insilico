/**
 * Oracle fixture generator (LOCAL ONLY — requires a `matlab` binary on PATH).
 *
 *   pnpm oracle:generate                 # FULL: every case → rewrite fixtures.json (ground truth)
 *   pnpm oracle:generate -- --new        # INCREMENTAL: only cases missing from fixtures.json
 *   pnpm oracle:generate -- gap- econ-   # INCREMENTAL: only cases whose name matches a pattern
 *
 * Full mode runs every case through ONE real-MATLAB process and writes ground-truth values to
 * fixtures.json (committed); the test suite then compares the TS interpreter against that JSON with
 * no MATLAB at test time. Incremental mode runs MATLAB on only the selected cases and MERGES them
 * into the existing fixtures.json (every other fixture is preserved verbatim) — fast for iterative
 * batch work and keeps the diff strictly additive. Run a full regen before relying on the committed
 * ground truth (it is the canonical, reproducible-from-scratch artifact).
 *
 * Requires `tsc -p tsconfig.test.json` to have run first (imports compiled cases).
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');

// Cases are authored in TypeScript; import the compiled copy.
const compiled = join(repo, '.test-dist', 'test', 'oracle', 'cases.js');
const { CASES } = await import(pathToFileURL(compiled).href).catch(() => {
  console.error('Could not load compiled cases. Run `pnpm exec tsc -p tsconfig.test.json` first.');
  process.exit(1);
});

// ── Select cases: full (default) or incremental (--new / name patterns) ──────
const dest = join(here, 'fixtures.json');
const argv = process.argv.slice(2);
const onlyNew = argv.includes('--new');
const patterns = argv.filter((a) => !a.startsWith('--'));
const incremental = onlyNew || patterns.length > 0;
// matlab.lang.makeValidName turns each case name into its fixtures.json key (non-[A-Za-z0-9_] → _).
const keyOf = (name) => name.replace(/[^A-Za-z0-9_]/g, '_');
let existing = {};
if (incremental) { try { existing = JSON.parse(readFileSync(dest, 'utf8')); } catch { existing = {}; } }
let selected = CASES;
if (patterns.length) selected = selected.filter((c) => patterns.some((p) => c.name.includes(p)));
if (onlyNew) selected = selected.filter((c) => !(keyOf(c.name) in existing));
if (selected.length === 0) { console.log('No cases selected; nothing to regenerate.'); process.exit(0); }

// ── Build a single .m driver (function file: everything is scoped) ───────────
const tmp = mkdtempSync(join(tmpdir(), 'oracle-'));
const outPath = join(tmp, 'fixtures.json');
const mPath = join(tmp, 'oracle_run.m');

// MATLAB cell array literal of {name, src, {vars...}} rows.
const esc = (s) => s.replace(/'/g, "''");
const rows = selected.map((c) =>
  `  '${esc(c.name)}', '${esc(c.src)}', {${c.vars.map((v) => `'${esc(v)}'`).join(', ')}}`,
).join(';\n');

const m = `function oracle_run()
  cases = {
${rows}
  };
  results = struct();
  for o__i = 1:size(cases, 1)
    o__key = matlab.lang.makeValidName(cases{o__i, 1});
    results.(o__key) = capture(cases{o__i, 2}, cases{o__i, 3});
  end
  o__fid = fopen('${outPath.replace(/\\/g, '/')}', 'w');
  fwrite(o__fid, jsonencode(results));
  fclose(o__fid);
end

function out = capture(src, vs)
  try
    eval(src);
    o__vals = cell(1, numel(vs));
    for o__k = 1:numel(vs), o__vals{o__k} = eval(vs{o__k}); end
    out = struct();
    for o__k = 1:numel(vs)
      o__v = o__vals{o__k};
      if issparse(o__v), o__v = full(o__v); end   % compare against the dense equivalent
      o__s = struct();
      o__s.class = class(o__v);
      o__s.size = size(o__v);
      if isnumeric(o__v) || islogical(o__v)
        o__s.real = real(o__v(:))';   % column-major flatten (matches TS Mat.data)
        if ~isreal(o__v), o__s.imag = imag(o__v(:))'; end
      elseif ischar(o__v) || isstring(o__v)
        o__s.value = string(o__v);
      end
      out.(vs{o__k}) = o__s;
    end
  catch o__ME
    out = struct('error', o__ME.message);
  end
end
`;

writeFileSync(mPath, m);
console.log(`Running ${selected.length}${incremental ? ` of ${CASES.length}` : ''} cases through MATLAB…`);
execFileSync('matlab', ['-batch', `run('${mPath.replace(/\\/g, '/')}')`], { stdio: 'inherit' });

const produced = JSON.parse(readFileSync(outPath, 'utf8'));
// Incremental: merge into existing (updates matched keys in place, appends new ones — additive diff).
// Full: the produced set IS the whole fixtures file.
const fixtures = incremental ? { ...existing, ...produced } : produced;
writeFileSync(dest, JSON.stringify(fixtures, null, 2) + '\n');
console.log(incremental
  ? `Merged ${Object.keys(produced).length} fixture(s) into ${Object.keys(fixtures).length} total → ${dest}`
  : `Wrote ${Object.keys(fixtures).length} fixtures → ${dest}`);
