// Special functions — the single source of truth for the scalar math (erf/erfc/gamma/gammaln/
// erfinv) that toolboxes previously re-implemented (8 copies of `erf` alone, at varying accuracy).
// Leaf module: depends on nothing in the sandbox, so any toolbox/builtins file can import it.

/** Error function — full double precision (Maclaurin series for |x|≤2; A&S 7.1.26 beyond, where
 *  erf ≈ ±1 anyway). This is the accurate version; the old per-toolbox A&S-only copies were ~1.5e-7. */
export function erf(x: number): number {
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  if (x === 0) return 0;
  if (x <= 2) {
    let term = x, sum = x;                              // n=0: x^1/0!/1
    for (let n = 1; n < 200; n++) { term *= -(x * x) / n; const t = term / (2 * n + 1); sum += t; if (Math.abs(t) < 1e-17 * Math.abs(sum)) break; }
    return s * (2 / Math.sqrt(Math.PI)) * sum;
  }
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

/** Complementary error function. Tail-accurate: near 0 use 1−erf (full precision); for large |x|
 *  use the Numerical-Recipes erfcc so the tiny tail (Q-function, normcdf for large x) doesn't
 *  underflow to 0 the way 1−erf(±large) does. */
export function erfc(x: number): number {
  if (Math.abs(x) < 2) return 1 - erf(x);
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const ans = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? ans : 2 - ans;
}

/** Gamma function (Lanczos g=7). */
export function gamma(x: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  x -= 1; let a = c[0]; const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

const LGAMMA_C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
/** Log-gamma (Lanczos) — computed directly so it doesn't overflow the way log(gamma(x)) does for x≳171. */
export function gammaln(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x <= 0 && x === Math.floor(x)) return Infinity;              // poles at 0, -1, -2, ...
  if (x < 0.5) return Math.log(Math.abs(Math.PI / Math.sin(Math.PI * x))) - gammaln(1 - x);  // reflection
  x -= 1;
  let a = LGAMMA_C[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LGAMMA_C[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Inverse error function (Winitzki initial guess + one Newton step). */
export function erfinv(y: number): number {
  if (Number.isNaN(y) || y < -1 || y > 1) return NaN;
  if (y === -1) return -Infinity; if (y === 1) return Infinity; if (y === 0) return 0;
  const a = 0.147; const ln = Math.log(1 - y * y); const t1 = 2 / (Math.PI * a) + ln / 2;
  let x = Math.sign(y) * Math.sqrt(Math.sqrt(t1 * t1 - ln / a) - t1);
  x -= (erf(x) - y) / (2 / Math.sqrt(Math.PI) * Math.exp(-x * x)); // Newton refine
  return x;
}
