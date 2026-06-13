import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run, num, expectMat } from './harness';

const SQRT2 = Math.SQRT2;

describe('root finding', () => {
  it('bisection converges to sqrt(2)', async () => {
    const r = await run(`
      f = @(x) x.^2 - 2;
      a = 1; b = 2;
      for k = 1:60
        m = (a + b) / 2;
        if f(a) * f(m) <= 0
          b = m;
        else
          a = m;
        end
      end
      root = (a + b) / 2;
    `);
    assert.ok(Math.abs(num(r.get('root')) - SQRT2) < 1e-9);
  });

  it('Newton converges to sqrt(2)', async () => {
    const r = await run(`
      x = 1;
      for k = 1:20
        x = x - (x^2 - 2) / (2*x);
      end
    `);
    assert.ok(Math.abs(num(r.get('x')) - SQRT2) < 1e-12);
  });
});

describe('linear systems', () => {
  it('Gaussian elimination via backslash matches known solution', async () => {
    // 2x + y - z = 8 ; -3x - y + 2z = -11 ; -2x + y + 2z = -3  -> [2; 3; -1]
    const r = await run('A = [2 1 -1; -3 -1 2; -2 1 2]; b = [8; -11; -3]; x = A\\b;');
    expectMat(r.get('x'), { rows: 3, cols: 1, data: [2, 3, -1], tol: 1e-9 });
  });

  it('LU-based solve matches backslash', async () => {
    const r = await run(`
      A = [4 3; 6 3]; b = [10; 12];
      [L, U, P] = lu(A);
      y = L \\ (P*b);
      x = U \\ y;
      xref = A \\ b;
      d = x - xref;
    `);
    expectMat(r.get('d'), { rows: 2, cols: 1, data: [0, 0], tol: 1e-9 });
  });
});

describe('numerical integration', () => {
  it('trapezoid rule approximates integral of x^2 on [0,1] ~ 1/3', async () => {
    const r = await run(`
      x = linspace(0, 1, 1001);
      y = x.^2;
      I = trapz(x, y);
    `);
    assert.ok(Math.abs(num(r.get('I')) - 1 / 3) < 1e-5);
  });

  it("Simpson's rule approximates integral of sin on [0,pi] ~ 2", async () => {
    const r = await run(`
      n = 100; a = 0; b = pi; h = (b - a) / n;
      x = a:h:b; y = sin(x);
      S = y(1) + y(end) + 4*sum(y(2:2:end-1)) + 2*sum(y(3:2:end-2));
      I = S * h / 3;
    `);
    assert.ok(Math.abs(num(r.get('I')) - 2) < 1e-6);
  });
});

describe('ODE & fitting', () => {
  it('explicit Euler integrates dy/dt = y to ~e over [0,1]', async () => {
    const r = await run(`
      n = 100000; h = 1 / n; y = 1;
      for k = 1:n
        y = y + h * y;
      end
    `);
    assert.ok(Math.abs(num(r.get('y')) - Math.E) < 1e-3);
  });

  it('polyfit/polyval recover a line through exact points', async () => {
    const r = await run(`
      x = [0 1 2 3 4];
      y = 2*x + 1;
      p = polyfit(x, y, 1);
      yhat = polyval(p, 10);
    `);
    expectMat(r.get('p'), { rows: 1, cols: 2, data: [2, 1], tol: 1e-9 });
    assert.ok(Math.abs(num(r.get('yhat')) - 21) < 1e-9);
  });
});
