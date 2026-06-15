import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run, expectMat, num } from '../harness';
import { type Mat } from '../../values';

describe('elementwise vs matrix operators', () => {
  it('* (matmul) vs .* (elementwise)', async () => {
    const r = await run('A = [1 2; 3 4]; M = A * A; E = A .* A;');
    expectMat(r.get('M'), { rows: 2, cols: 2, data: [7, 15, 10, 22] });   // matrix product
    expectMat(r.get('E'), { rows: 2, cols: 2, data: [1, 9, 4, 16] });     // elementwise
  });

  it('./ elementwise division', async () => {
    const r = await run('v = [10 20 30] ./ [2 4 5];');
    expectMat(r.get('v'), { rows: 1, cols: 3, data: [5, 5, 6] });
  });

  it('.^ vs ^', async () => {
    const r = await run('e = [1 2 3] .^ 2; s = 2 ^ 10;');
    expectMat(r.get('e'), { rows: 1, cols: 3, data: [1, 4, 9] });
    assert.equal(num(r.get('s')), 1024);
  });
});

describe('transpose', () => {
  it(".' transpose vs ' conjugate transpose on complex", async () => {
    const r = await run("A = [1+2i, 3-1i]; t = A.';");
    const r2 = await run("A = [1+2i, 3-1i]; c = A';");
    const t = r.get('t') as Mat;
    const c = r2.get('c') as Mat;
    // .' keeps sign of imaginary part; ' negates it
    assert.equal(t.rows, 2); assert.equal(t.cols, 1);
    assert.ok(t.idata && Math.abs(t.idata[0] - 2) < 1e-9, ".' preserves +2i");
    assert.ok(c.idata && Math.abs(c.idata[0] + 2) < 1e-9, "' conjugates to -2i");
  });
});

describe('complex arithmetic', () => {
  it('multiplication', async () => {
    const r = await run('z = (1+2i) * (3-1i);');   // = 3 - i + 6i - 2i^2 = 5 + 5i
    const z = r.get('z') as Mat;
    assert.ok(Math.abs(z.data[0] - 5) < 1e-9);
    assert.ok(z.idata && Math.abs(z.idata[0] - 5) < 1e-9);
  });

  it('abs / real / imag', async () => {
    const r = await run('z = 3 + 4i; m = abs(z); re = real(z); im = imag(z);');
    assert.equal(num(r.get('m')), 5);
    assert.equal(num(r.get('re')), 3);
    assert.equal(num(r.get('im')), 4);
  });
});

describe('logical operations', () => {
  it('comparison returns logical class', async () => {
    const r = await run('b = [1 2 3] > 2;');
    const b = r.get('b') as Mat;
    assert.ok(b.isBool, 'comparison yields logical');
    expectMat(r.get('b'), { rows: 1, cols: 3, data: [0, 0, 1] });
  });

  it('& | ~', async () => {
    const r = await run('a = [1 0 1] & [1 1 0]; b = [1 0 0] | [0 0 1]; c = ~[1 0 1];');
    expectMat(r.get('a'), { data: [1, 0, 0] });
    expectMat(r.get('b'), { data: [1, 0, 1] });
    expectMat(r.get('c'), { data: [0, 1, 0] });
  });
});

describe('reductions', () => {
  it('sum / prod', async () => {
    const r = await run('s = sum([1 2 3 4]); p = prod([1 2 3 4]);');
    assert.equal(num(r.get('s')), 10);
    assert.equal(num(r.get('p')), 24);
  });

  it('mean / min / max', async () => {
    const r = await run('m = mean([2 4 6]); lo = min([5 1 3]); hi = max([5 1 3]);');
    assert.equal(num(r.get('m')), 4);
    assert.equal(num(r.get('lo')), 1);
    assert.equal(num(r.get('hi')), 5);
  });

  it('sum along dimension', async () => {
    const r = await run('A = [1 2; 3 4]; c = sum(A, 1); rr = sum(A, 2);');
    expectMat(r.get('c'), { rows: 1, cols: 2, data: [4, 6] });    // column sums
    expectMat(r.get('rr'), { rows: 2, cols: 1, data: [3, 7] });   // row sums
  });
});

describe('constructors', () => {
  it('zeros / ones / eye', async () => {
    const r = await run('Z = zeros(2,3); O = ones(2,2); I = eye(3);');
    expectMat(r.get('Z'), { rows: 2, cols: 3, data: [0, 0, 0, 0, 0, 0] });
    expectMat(r.get('O'), { rows: 2, cols: 2, data: [1, 1, 1, 1] });
    expectMat(r.get('I'), { rows: 3, cols: 3, data: [1, 0, 0, 0, 1, 0, 0, 0, 1] });
  });

  it('linspace', async () => {
    const r = await run('x = linspace(0, 1, 5);');
    expectMat(r.get('x'), { rows: 1, cols: 5, data: [0, 0.25, 0.5, 0.75, 1] });
  });
});
