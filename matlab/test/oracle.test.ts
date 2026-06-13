import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { run } from './harness';
import { CASES } from './oracle/cases';
import { type Value, type Mat, isMat, isStr, isSparse, sparseToDense } from '../values';

// Committed ground truth from real MATLAB (see oracle/generate.mjs).
type Fix = { class: string; size: [number, number]; real?: number | number[]; imag?: number | number[]; value?: string; error?: string };
const FIXTURES: Record<string, Record<string, Fix>> = JSON.parse(
  readFileSync(join(process.cwd(), 'matlab/test/oracle/fixtures.json'), 'utf8'),
);

const DEFAULT_TOL = 1e-6;
const arr = (x: number | number[] | undefined): number[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
// MATLAB struct field names go through makeValidName; our case names only use '-'.
const key = (name: string) => name.replace(/-/g, '_');

/** TS Value → the same shape MATLAB serialized. */
function describeValue(v: Value): { class: string; size: [number, number]; real: number[]; imag: number[] } {
  if (isSparse(v)) v = sparseToDense(v);   // MATLAB side densifies via full(); class(sparse) is 'double'
  if (isMat(v)) {
    const m = v as Mat;
    const cls = m.isChar ? 'char' : m.isBool ? 'logical' : (m.itype ?? 'double');
    return { class: cls, size: [m.rows, m.cols], real: Array.from(m.data), imag: m.idata ? Array.from(m.idata) : [] };
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
        // numeric value (column-major, tolerance)
        if (exp.real !== undefined || d.real.length) {
          const er = arr(exp.real), ei = arr(exp.imag);
          assert.equal(d.real.length, er.length, `${c.name}.${name} numel: ${d.real.length} ≠ ${er.length}`);
          er.forEach((e, i) => assert.ok(Math.abs(d.real[i] - e) <= tol, `${c.name}.${name} real[${i}]: ${d.real[i]} ≠ ${e}`));
          ei.forEach((e, i) => assert.ok(Math.abs((d.imag[i] ?? 0) - e) <= tol, `${c.name}.${name} imag[${i}]: ${d.imag[i]} ≠ ${e}`));
          // TS must not carry imaginary parts MATLAB doesn't have
          if (!ei.length) d.imag.forEach((im, i) => assert.ok(Math.abs(im) <= tol, `${c.name}.${name} unexpected imag[${i}]=${im}`));
        }
        // string value
        if (exp.value !== undefined && isStr(got)) assert.equal(got.items[0], exp.value);
      }
    });
  }
});
