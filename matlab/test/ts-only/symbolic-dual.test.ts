import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../harness';

// Numeric/symbolic polymorphism: an elementary function must give the SAME answer whether it is
// called on a number (base builtin) or built symbolically and evaluated back (subs → double). The
// two paths share one set of numeric kernels (builtins.ts registers them into sym.ts via
// registerNumericFns), so they cannot drift. This test pins that — it caught 16 special functions
// (zeta/psi/erfi/dawson/ei/logint/…) that used to return NaN through the symbolic path because
// sym.ts kept a second, partial copy of the kernels.
describe('numeric/symbolic dual consistency (SYM_ELEMENTARY)', () => {
  // domain-safe sample point per function
  const X: Record<string, number> = {
    sin: 0.7, cos: 0.7, tan: 0.7, cot: 0.7, sec: 0.7, csc: 0.7,
    asin: 0.5, acos: 0.5, atan: 0.7, acot: 0.7, asec: 1.5, acsc: 1.5,
    sinh: 0.7, cosh: 0.7, tanh: 0.7, coth: 0.7, sech: 0.7, csch: 0.7,
    asinh: 0.7, acosh: 1.5, atanh: 0.5, exp: 0.7, log: 0.7, log10: 0.7, log2: 0.7,
    sqrt: 0.7, abs: -0.7, sign: -0.7, cbrt: 0.7, gamma: 2.5, gammaln: 2.5,
    erf: 0.7, erfc: 0.7, factorial: 4, conj: 0.7, real: 0.7, imag: 0.7,
    zeta: 2.5, psi: 2.5, sinc: 0.7, erfi: 0.7, dawson: 0.7, fresnelc: 0.7, fresnels: 0.7,
    ei: 0.7, logint: 2.5, sinhint: 0.7, coshint: 0.7, ssinint: 0.7, dilog: 0.7, wrightOmega: 0.7,
  };

  it('f(x0) on a number equals double(subs(f(x), x, x0)) for every elementary function', async () => {
    const bad: string[] = [];
    for (const [f, x0] of Object.entries(X)) {
      const r = await run(`a = ${f}(${x0}); syms x; b = double(subs(${f}(x), x, ${x0})); d = abs(a - b);`);
      if (r.error) { bad.push(`${f}: ${r.error}`); continue; }
      const d = r.get('d') as { data?: ArrayLike<number> } | undefined;
      const dv = d && d.data ? d.data[0] : NaN;
      if (!(Number.isFinite(dv) && dv < 1e-6)) bad.push(`${f}(${x0}) Δ=${dv}`);
    }
    assert.equal(bad.length, 0, `numeric/symbolic divergence:\n  ${bad.join('\n  ')}`);
  });

  // Two-argument overloads (SYM_BINARY): same both-ways contract with x in one argument slot.
  const B: Record<string, [string, number]> = {
    atan2: ['atan2(x, 0.8)', 0.6], hypot: ['hypot(x, 0.8)', 0.6], mod: ['mod(x, 2)', 5.3],
    beta: ['beta(x, 1.5)', 2.5], nchoosek: ['nchoosek(7, x)', 3],
    besselj: ['besselj(1, x)', 0.6], bessely: ['bessely(1, x)', 0.6],
    besseli: ['besseli(1, x)', 0.6], besselk: ['besselk(1, x)', 0.6],
  };

  it('binary f(num) equals double(subs(f(sym), x, x0)) for every two-arg overload', async () => {
    const bad: string[] = [];
    for (const [f, [call, x0]] of Object.entries(B)) {
      const numCall = call.replaceAll('x', `(${x0})`);
      const r = await run(`a = double(${numCall}); syms x; b = double(subs(${call}, x, ${x0})); d = abs(a - b);`);
      if (r.error) { bad.push(`${f}: ${r.error}`); continue; }
      const d = r.get('d') as { data?: ArrayLike<number> } | undefined;
      const dv = d && d.data ? d.data[0] : NaN;
      if (!(Number.isFinite(dv) && dv < 1e-6)) bad.push(`${f} Δ=${dv}`);
    }
    assert.equal(bad.length, 0, `numeric/symbolic divergence (binary):\n  ${bad.join('\n  ')}`);
  });
});
