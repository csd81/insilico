/**
 * Oracle fixture generator (LOCAL ONLY — requires a `matlab` binary on PATH).
 *
 *   pnpm oracle:generate
 *
 * Runs every case in matlab/test/oracle/cases.ts through ONE real-MATLAB process
 * and writes ground-truth values to fixtures.json (committed). The normal test
 * suite compares the TS interpreter against that JSON — no MATLAB at test time.
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

// ── Build a single .m driver (function file: everything is scoped) ───────────
const tmp = mkdtempSync(join(tmpdir(), 'oracle-'));
const outPath = join(tmp, 'fixtures.json');
const mPath = join(tmp, 'oracle_run.m');

// MATLAB cell array literal of {name, src, {vars...}} rows.
const esc = (s) => s.replace(/'/g, "''");
const rows = CASES.map((c) =>
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
console.log(`Running ${CASES.length} cases through MATLAB…`);
execFileSync('matlab', ['-batch', `run('${mPath.replace(/\\/g, '/')}')`], { stdio: 'inherit' });

const fixtures = JSON.parse(readFileSync(outPath, 'utf8'));
const dest = join(here, 'fixtures.json');
writeFileSync(dest, JSON.stringify(fixtures, null, 2) + '\n');
console.log(`Wrote ${Object.keys(fixtures).length} fixtures → ${dest}`);
