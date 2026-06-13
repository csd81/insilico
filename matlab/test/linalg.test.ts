import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run, expectMat, num, dataOf } from './harness';

describe('solve & inverse', () => {
  it('A\\b solves a linear system', async () => {
    // [2 1; 1 3] x = [3; 5]  ->  x = [4/5; 7/5]
    const r = await run('A = [2 1; 1 3]; b = [3; 5]; x = A\\b;');
    expectMat(r.get('x'), { rows: 2, cols: 1, data: [0.8, 1.4], tol: 1e-9 });
  });

  it('A\\b residual is ~zero on a 3x3', async () => {
    const r = await run('A = [2 1 1; 1 3 2; 1 0 0]; b = [4; 5; 6]; x = A\\b; res = A*x - b;');
    dataOf(r.get('res')).forEach((v) => assert.ok(Math.abs(v) < 1e-9));
  });

  it('inv times A is identity', async () => {
    const r = await run('A = [4 3; 6 3]; P = inv(A) * A;');
    expectMat(r.get('P'), { rows: 2, cols: 2, data: [1, 0, 0, 1], tol: 1e-9 });
  });

  it('det of known matrices', async () => {
    const r = await run('d1 = det([1 2; 3 4]); d2 = det(eye(3));');
    assert.ok(Math.abs(num(r.get('d1')) - (-2)) < 1e-9);
    assert.ok(Math.abs(num(r.get('d2')) - 1) < 1e-9);
  });
});

describe('decompositions (reconstruction smoke)', () => {
  it('lu: L*U reconstructs P*A', async () => {
    const r = await run('A = [4 3; 6 3]; [L, U, P] = lu(A); R = L*U - P*A;');
    dataOf(r.get('R')).forEach((v) => assert.ok(Math.abs(v) < 1e-9));
  });

  it('qr: Q*R reconstructs A and Q is orthonormal', async () => {
    const r = await run("A = [12 -51; 6 167; -4 24]; [Q, R] = qr(A); rec = Q*R - A; orth = Q'*Q;");
    dataOf(r.get('rec')).forEach((v) => assert.ok(Math.abs(v) < 1e-8));
    // Q'*Q ~ I (3x3)
    const o = dataOf(r.get('orth'));
    const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    o.forEach((v, i) => assert.ok(Math.abs(v - I[i]) < 1e-8, `orth[${i}]=${v}`));
  });

  it("chol: R'*R reconstructs SPD A", async () => {
    const r = await run("A = [4 2; 2 3]; R = chol(A); rec = R'*R - A;");
    dataOf(r.get('rec')).forEach((v) => assert.ok(Math.abs(v) < 1e-9));
  });
});

describe('eigen & norms', () => {
  it('eig of a diagonal matrix', async () => {
    const r = await run('A = [2 0 0; 0 5 0; 0 0 -1]; e = sort(eig(A));');
    expectMat(r.get('e'), { rows: 3, cols: 1, data: [-1, 2, 5], tol: 1e-9 });
  });

  it('eig of symmetric 2x2', async () => {
    // [2 1; 1 2] eigenvalues 1 and 3
    const r = await run('A = [2 1; 1 2]; e = sort(eig(A));');
    expectMat(r.get('e'), { rows: 2, cols: 1, data: [1, 3], tol: 1e-9 });
  });

  it('vector 2-norm and matrix norm', async () => {
    const r = await run('n2 = norm([3 4]); nf = norm([3; 4]);');
    assert.equal(num(r.get('n2')), 5);
    assert.equal(num(r.get('nf')), 5);
  });
});

describe('singular / ill-conditioned', () => {
  it('inv of a singular matrix does not crash', async () => {
    const r = await run('A = [1 2; 2 4]; B = inv(A);');
    // MATLAB returns Inf entries + a warning; we only require no throw and right shape.
    assert.equal(r.error, undefined);
    expectMat(r.get('B'), { rows: 2, cols: 2 });
  });
});
