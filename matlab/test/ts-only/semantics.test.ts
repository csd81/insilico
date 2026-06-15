/**
 * Value-copy semantics that the MATLAB oracle can't cover (its eval-based driver
 * can't define functions). The oracle suite covers B=A, struct/cell copy, and the
 * Map(handle)/dictionary(value) exceptions; here we pin function-argument passing.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run, expectMat, num } from '../harness';
import { type Mat } from '../../values';

describe('function-argument value semantics', () => {
  it('mutating a parameter does not affect the caller', async () => {
    const r = await run(`
      A = [1 2 3];
      B = bump(A);
      function y = bump(x)
        x(1) = 99;
        y = x;
      end
    `);
    expectMat(r.get('A'), { rows: 1, cols: 3, data: [1, 2, 3] });   // caller untouched
    expectMat(r.get('B'), { rows: 1, cols: 3, data: [99, 2, 3] });  // local copy mutated
  });

  it('mutating a struct parameter does not affect the caller', async () => {
    const r = await run(`
      s.v = 10;
      t = setv(s);
      function out = setv(p)
        p.v = 20;
        out = p;
      end
      a = s.v; b = t.v;
    `);
    assert.equal(num(r.get('a')), 10);
    assert.equal(num(r.get('b')), 20);
  });

  it('mutating a cell parameter does not affect the caller', async () => {
    const r = await run(`
      c = {1, 2, 3};
      d = setfirst(c);
      function out = setfirst(p)
        p{1} = 99;
        out = p;
      end
      a = c{1}; b = d{1};
    `);
    assert.equal(num(r.get('a')), 1);
    assert.equal(num(r.get('b')), 99);
  });

  it('nested-field mutation through a copy is isolated', async () => {
    const r = await run(`
      s.inner.x = 1;
      t = s;
      t.inner.x = 5;
      a = s.inner.x; b = t.inner.x;
    `);
    assert.equal(num(r.get('a')), 1);
    assert.equal(num(r.get('b')), 5);
  });

  it('containers.Map passed to a function is shared (handle semantics)', async () => {
    const r = await run(`
      m = containers.Map('KeyType','char','ValueType','double');
      m('k') = 1;
      touch(m);
      x = m('k');
      function touch(p)
        p('k') = 42;
      end
    `);
    assert.equal(num(r.get('x')), 42);   // handle: caller sees the change
  });

  it('in-place column-major write reads back column-major', async () => {
    const r = await run('A = zeros(2,2); A(3) = 7;');   // linear index 3 → (1,2)
    const A = r.get('A') as Mat;
    expectMat(A, { rows: 2, cols: 2, data: [0, 0, 7, 0] });
  });
});
