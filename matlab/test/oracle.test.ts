import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { run } from './harness';
import { CASES } from './oracle/cases';
import { type Value, type Mat, isMat, isStr, isSparse, sparseToDense } from '../values';

// Committed ground truth from real MATLAB (see oracle/generate.mjs).
// MATLAB jsonencode serializes NaN (and Inf) as null; we map null → NaN below.
type Num = number | null;
type Fix = { class: string; size: number[]; real?: Num | Num[]; imag?: Num | Num[]; value?: string; error?: string };
const FIXTURES: Record<string, Record<string, Fix>> = JSON.parse(
  readFileSync(join(process.cwd(), 'matlab/test/oracle/fixtures.json'), 'utf8'),
);

const DEFAULT_TOL = 1e-6;
// Flatten to number[], mapping JSON null (MATLAB NaN/Inf) → NaN.
const arr = (x: Num | Num[] | undefined): number[] =>
  (x === undefined ? [] : Array.isArray(x) ? x : [x]).map((z) => (z === null ? NaN : z));
// MATLAB struct field names go through makeValidName; our case names only use '-'.
const key = (name: string) => name.replace(/-/g, '_');

/** Char-row / string-scalar text content (matches MATLAB's `string(v)`). */
function textOf(v: Value): string {
  if (isStr(v)) return v.rows * v.cols === 1 ? v.items[0] : v.items.join('');
  if (isMat(v) && (v as Mat).isChar) { let s = ''; for (const c of (v as Mat).data) s += String.fromCharCode(c); return s; }
  return '';
}

/** TS Value → the same shape MATLAB serialized (size is the full N-D dim vector). */
function describeValue(v: Value): { class: string; size: number[]; real: number[]; imag: number[] } {
  if (isSparse(v)) v = sparseToDense(v);   // MATLAB side densifies via full(); class(sparse) is 'double'
  if (isMat(v)) {
    const m = v as Mat;
    const cls = m.isChar ? 'char' : m.isBool ? 'logical' : (m.itype ?? 'double');
    return { class: cls, size: m.nd ? m.nd.slice() : [m.rows, m.cols], real: Array.from(m.data), imag: m.idata ? Array.from(m.idata) : [] };
  }
  if (isStr(v)) return { class: 'string', size: [v.rows, v.cols], real: [], imag: [] };
  throw new Error(`unhandled value kind: ${v.kind}`);
}

describe('MATLAB oracle (committed fixtures)', () => {
  for (const c of CASES) {
    it(c.name, async () => {
      const tol = c.tol ?? DEFAULT_TOL;
      const fix = FIXTURES[key(c.name)];
      assert.ok(fix, `no fixture for ${c.name} — run pnpm oracle:generate`);
      assert.ok(!fix.error, `MATLAB errored on this case: ${fix.error}`);

      const r = await run(c.src);
      assert.equal(r.error, undefined, `TS interpreter errored: ${r.error}`);

      for (const name of c.vars) {
        const exp = fix[name];
        assert.ok(exp, `fixture missing var ${name}`);
        const got = r.get(name);
        assert.ok(got, `TS workspace missing var ${name}`);
        const d = describeValue(got);

        // class
        assert.equal(d.class, exp.class, `${c.name}.${name} class: ${d.class} ≠ ${exp.class}`);
        // size
        assert.deepEqual(d.size, exp.size, `${c.name}.${name} size: ${JSON.stringify(d.size)} ≠ ${JSON.stringify(exp.size)}`);

        if (exp.class === 'char' || exp.class === 'string') {
          // textual value
          assert.equal(textOf(got), exp.value, `${c.name}.${name} text: "${textOf(got)}" ≠ "${exp.value}"`);
        } else if (exp.real !== undefined || d.real.length) {
          // numeric value (column-major, tolerance)
          const er = arr(exp.real), ei = arr(exp.imag);
          assert.equal(d.real.length, er.length, `${c.name}.${name} numel: ${d.real.length} ≠ ${er.length}`);
          const close = (got: number, e: number, where: string) =>
            Number.isNaN(e) ? assert.ok(Number.isNaN(got), `${where} expected NaN, got ${got}`)
                            : assert.ok(Math.abs(got - e) <= tol, `${where}: ${got} ≠ ${e}`);
          er.forEach((e, i) => close(d.real[i], e, `${c.name}.${name} real[${i}]`));
          ei.forEach((e, i) => close(d.imag[i] ?? 0, e, `${c.name}.${name} imag[${i}]`));
          // TS must not carry imaginary parts MATLAB doesn't have
          if (!ei.length) d.imag.forEach((im, i) => assert.ok(Math.abs(im) <= tol, `${c.name}.${name} unexpected imag[${i}]=${im}`));
        }
      }
    });
  }
});
