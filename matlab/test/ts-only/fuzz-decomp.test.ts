import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../harness';

/**
 * Property-based (fuzz) testing of the decomposition / solver core, MATLAB-FREE.
 *
 * The oracle suite pins curated cases against real MATLAB; this complements it by asserting
 * backward-stable RECONSTRUCTION INVARIANTS over hundreds of randomly-generated and adversarial
 * matrices. The reconstruction residuals (‖P·A−L·U‖, ‖Q·R−A‖, ‖U·S·Vᵀ−A‖, ‖A·V−V·D‖, …) are
 * backward stable — they stay ~eps·‖A‖ regardless of conditioning — so a fixed-seed battery is
 * reproducible and non-flaky, yet exercises code paths (pivot patterns, rank structure, complex
 * spectra, sizes) the hand-written cases never reach. This is the systematic version of the
 * by-hand probing that has been surfacing silently-wrong factorizations.
 *
 * NOTE: invariants test the engine's SELF-CONSISTENCY, not MATLAB parity — they are a robustness
 * net (catching crashes / NaN / wrong reconstructions), not a correctness oracle. MATLAB-parity
 * stays the job of the committed fixtures.
 */

// ── deterministic PRNG (mulberry32) so any failure reproduces ────────────────
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const randn = (r: () => number) => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// ── tiny matrix helpers (number[][], row-major) ──────────────────────────────
type M = number[][];
const zeros = (m: number, n: number): M => Array.from({ length: m }, () => new Array(n).fill(0));
const gen = (m: number, n: number, f: () => number): M => Array.from({ length: m }, () => Array.from({ length: n }, f));
const transpose = (A: M): M => A[0].map((_, j) => A.map((row) => row[j]));
const matmul = (A: M, B: M): M => { const o = zeros(A.length, B[0].length); for (let i = 0; i < A.length; i++) for (let j = 0; j < B[0].length; j++) { let s = 0; for (let k = 0; k < B.length; k++) s += A[i][k] * B[k][j]; o[i][j] = s; } return o; };
const add = (A: M, B: M): M => A.map((row, i) => row.map((x, j) => x + B[i][j]));

// generators
const gRand = (r: () => number) => (m: number, n: number): M => gen(m, n, () => randn(r));
const gSym = (r: () => number) => (n: number): M => { const A = gRand(r)(n, n); return add(A, transpose(A)).map((row) => row.map((x) => x / 2)); };
const gSPD = (r: () => number) => (n: number): M => { const A = gRand(r)(n, n); const G = matmul(transpose(A), A); for (let i = 0; i < n; i++) G[i][i] += n; return G; };           // B'B + nI ≻ 0
const gRankDef = (r: () => number) => (m: number, n: number, rank: number): M => { let A = zeros(m, n); for (let k = 0; k < rank; k++) { const u = gen(m, 1, () => randn(r)), v = gen(1, n, () => randn(r)); A = add(A, matmul(u, v)); } return A; };
const hilbert = (n: number): M => gen(n, n, () => 0).map((row, i) => row.map((_, j) => 1 / (i + j + 1)));

// MATLAB literal (full-precision round-trip; handles NaN/Inf)
const lit = (A: M): string => '[' + A.map((row) => row.map((x) => (Number.isNaN(x) ? 'NaN' : x === Infinity ? 'Inf' : x === -Infinity ? '-Inf' : String(x))).join(' ')).join('; ') + ']';

// run a snippet that ends by assigning scalar `r`; return its value (NaN on error/missing)
async function residual(src: string): Promise<{ r: number; error?: string }> {
  const res = await run(src);
  if (res.error) return { r: NaN, error: res.error };
  const v = res.get('r') as { data?: ArrayLike<number> } | undefined;
  return { r: v && v.data ? v.data[0] : NaN };
}

const TOL = 1e-7;   // relative; reconstruction residuals are ~1e-13, so this only fires on real bugs

describe('fuzz: decomposition reconstruction invariants (MATLAB-free)', () => {
  it('lu: ‖P·A − L·U‖ ≈ 0 over random / rank-deficient / ill-conditioned matrices', async () => {
    const r = rng(0x1111);
    const bad: string[] = [];
    for (let i = 0; i < 60; i++) {
      const m = 1 + (i % 6), n = 1 + ((i * 3) % 6);
      const A = i % 5 === 0 ? gRankDef(r)(m, n, Math.max(1, Math.min(m, n) - 1)) : gRand(r)(m, n);
      const { r: res, error } = await residual(`A = ${lit(A)}; [L,U,P] = lu(A); r = norm(P*A - L*U, 'fro') / max(1, norm(A,'fro'));`);
      if (error) { bad.push(`lu ${m}x${n}: ${error}`); continue; }
      if (!(res < TOL)) bad.push(`lu ${m}x${n}: residual=${res}`);
    }
    for (const n of [3, 5, 7]) { const { r: res, error } = await residual(`A = ${lit(hilbert(n))}; [L,U,P] = lu(A); r = norm(P*A - L*U,'fro')/max(1,norm(A,'fro'));`); if (error || !(res < TOL)) bad.push(`lu hilbert(${n}): ${error ?? res}`); }
    assert.equal(bad.length, 0, `LU reconstruction failures:\n  ${bad.join('\n  ')}`);
  });

  it('qr: ‖Q·R − A‖ ≈ 0 and Qᵀ·Q = I over random tall/wide matrices', async () => {
    const r = rng(0x2222); const bad: string[] = [];
    for (let i = 0; i < 60; i++) {
      const m = 1 + (i % 6), n = 1 + ((i * 2 + 1) % 6);
      const A = gRand(r)(m, n);
      const { r: res, error } = await residual(`A = ${lit(A)}; [Q,R] = qr(A); r = norm(Q*R - A,'fro')/max(1,norm(A,'fro')) + norm(Q'*Q - eye(size(Q,1)),'fro');`);
      if (error) bad.push(`qr ${m}x${n}: ${error}`); else if (!(res < TOL)) bad.push(`qr ${m}x${n}: residual=${res}`);
    }
    assert.equal(bad.length, 0, `QR failures:\n  ${bad.join('\n  ')}`);
  });

  it('svd: ‖U·S·Vᵀ − A‖ ≈ 0, σ ≥ 0 sorted, over random / rank-deficient', async () => {
    const r = rng(0x3333); const bad: string[] = [];
    for (let i = 0; i < 60; i++) {
      const m = 1 + (i % 6), n = 1 + ((i * 5) % 6);
      const A = i % 4 === 0 ? gRankDef(r)(m, n, Math.max(1, Math.min(m, n) - 1)) : gRand(r)(m, n);
      const { r: res, error } = await residual(`A = ${lit(A)}; [U,S,V] = svd(A); s = diag(S); r = norm(U*S*V' - A,'fro')/max(1,norm(A,'fro')) + (any(s < -1e-12) || any(diff(s) > 1e-9));`);
      if (error) bad.push(`svd ${m}x${n}: ${error}`); else if (!(res < TOL)) bad.push(`svd ${m}x${n}: residual=${res}`);
    }
    assert.equal(bad.length, 0, `SVD failures:\n  ${bad.join('\n  ')}`);
  });

  it('chol: ‖Rᵀ·R − A‖ ≈ 0 over random SPD matrices', async () => {
    const r = rng(0x4444); const bad: string[] = [];
    for (let i = 0; i < 50; i++) {
      const n = 1 + (i % 6);
      const { r: res, error } = await residual(`A = ${lit(gSPD(r)(n))}; R = chol(A); r = norm(R'*R - A,'fro')/max(1,norm(A,'fro'));`);
      if (error) bad.push(`chol ${n}: ${error}`); else if (!(res < TOL)) bad.push(`chol ${n}: residual=${res}`);
    }
    assert.equal(bad.length, 0, `Cholesky failures:\n  ${bad.join('\n  ')}`);
  });

  it('eig: ‖A·V − V·D‖ ≈ 0 (symmetric: real spectrum; general: complex ok)', async () => {
    const r = rng(0x5555); const bad: string[] = [];
    for (let i = 0; i < 40; i++) {
      const n = 2 + (i % 5);
      const sym = i % 2 === 0;
      const A = sym ? gSym(r)(n) : gRand(r)(n, n);
      const tol = sym ? TOL : 1e-6;                                   // non-normal residual is looser but still tiny
      const extra = sym ? ` + (norm(imag(eig(A)),'fro') > 1e-9)` : '';
      const { r: res, error } = await residual(`A = ${lit(A)}; [V,D] = eig(A); r = norm(A*V - V*D,'fro')/max(1,norm(A,'fro'))${extra};`);
      if (error) bad.push(`eig ${sym ? 'sym' : 'gen'} ${n}: ${error}`); else if (!(res < tol)) bad.push(`eig ${sym ? 'sym' : 'gen'} ${n}: residual=${res}`);
    }
    assert.equal(bad.length, 0, `eig failures:\n  ${bad.join('\n  ')}`);
  });
});

// ── adversarial structural battery: inputs MATLAB handles must not crash the engine ──
describe('fuzz: adversarial inputs are handled, not crashed', () => {
  const handled: Array<[string, string]> = [
    ['empty', '[]'], ['scalar', '[3]'], ['zeros', 'zeros(3)'], ['ones-col', 'ones(4,1)'],
    ['rank1', '[1 2 3]'+"'"+'*[4 5 6]'], ['tiny', '[1e-300 0; 0 1e-300]'], ['huge', '[1e300 0; 0 1e300]'],
  ];
  for (const fn of ['lu', 'qr', 'svd']) {
    it(`${fn}: no unhandled crash on degenerate finite inputs`, async () => {
      const bad: string[] = [];
      for (const [name, expr] of handled) {
        const res = await run(`A = ${expr}; X = ${fn}(A);`);
        // tolerated outcome: a result OR a clean MatError string — never an undefined/JS-shaped throw
        if (res.error && /undefined|cannot read|not a function|NaN\b.*length|reduce of/i.test(res.error)) bad.push(`${fn}(${name}): JS-shaped error → ${res.error}`);
      }
      assert.equal(bad.length, 0, `engine crashed (not a clean error):\n  ${bad.join('\n  ')}`);
    });
  }
});
