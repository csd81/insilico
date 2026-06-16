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

  it('schur: ‖U·T·Uᵀ − A‖ ≈ 0 and Uᵀ·U = I over random / symmetric matrices', async () => {
    const r = rng(0x6666); const bad: string[] = [];
    for (let i = 0; i < 50; i++) {
      const n = 2 + (i % 5);
      const sym = i % 3 === 0;
      const A = sym ? gSym(r)(n) : gRand(r)(n, n);
      const { r: res, error } = await residual(`A = ${lit(A)}; [U,T] = schur(A); r = norm(U*T*U' - A,'fro')/max(1,norm(A,'fro')) + norm(U'*U - eye(${n}),'fro');`);
      if (error) bad.push(`schur ${sym ? 'sym' : 'gen'} ${n}: ${error}`); else if (!(res < TOL)) bad.push(`schur ${sym ? 'sym' : 'gen'} ${n}: residual=${res}`);
    }
    assert.equal(bad.length, 0, `schur failures:\n  ${bad.join('\n  ')}`);
  });

  it('pinv: the four Moore–Penrose conditions hold over random / rank-deficient', async () => {
    const r = rng(0x7777); const bad: string[] = [];
    for (let i = 0; i < 60; i++) {
      const m = 1 + (i % 6), n = 1 + ((i * 3 + 2) % 6);
      const A = i % 3 === 0 ? gRankDef(r)(m, n, Math.max(1, Math.min(m, n) - 1)) : gRand(r)(m, n);
      // X=A⁺ ⇔  A·X·A=A,  X·A·X=X,  (A·X)ᵀ=A·X,  (X·A)ᵀ=X·A
      const { r: res, error } = await residual(`A = ${lit(A)}; X = pinv(A); s = max(1,norm(A,'fro')); r = (norm(A*X*A - A,'fro') + norm(X*A*X - X,'fro')*s + norm((A*X)'-A*X,'fro') + norm((X*A)'-X*A,'fro'))/s;`);
      if (error) bad.push(`pinv ${m}x${n}: ${error}`); else if (!(res < TOL)) bad.push(`pinv ${m}x${n}: residual=${res}`);
    }
    assert.equal(bad.length, 0, `pinv failures:\n  ${bad.join('\n  ')}`);
  });

  it('mldivide: square ‖A·x−b‖≈0, overdetermined ‖Aᵀ(A·x−b)‖≈0 (normal eqs)', async () => {
    const r = rng(0x8888); const bad: string[] = [];
    for (let i = 0; i < 60; i++) {
      const square = i % 2 === 0;
      const n = 2 + (i % 5), m = square ? n : n + 1 + (i % 4);
      const A = gRand(r)(m, n);
      const b = gen(m, 1, () => randn(r));
      const inv = square
        ? `norm(A*x - b,'fro')/max(1,norm(b,'fro'))`                       // consistent square system
        : `norm(A'*(A*x - b),'fro')/max(1,norm(A,'fro')*norm(b,'fro'))`;   // least-squares ⇒ residual ⟂ range(A)
      const { r: res, error } = await residual(`A = ${lit(A)}; b = ${lit(b)}; x = A\\b; r = ${inv};`);
      if (error) bad.push(`mldivide ${square ? 'sq' : 'ls'} ${m}x${n}: ${error}`); else if (!(res < TOL)) bad.push(`mldivide ${square ? 'sq' : 'ls'} ${m}x${n}: residual=${res}`);
    }
    assert.equal(bad.length, 0, `mldivide failures:\n  ${bad.join('\n  ')}`);
  });

  it('expm: expm(A)·expm(−A) = I; symmetric eig(expm A)=exp(eig A)', async () => {
    const r = rng(0x9999); const bad: string[] = [];
    for (let i = 0; i < 50; i++) {
      const n = 2 + (i % 5);
      const sym = i % 2 === 0;
      // scale down so the scaling-and-squaring stays well-conditioned (large ‖A‖ ⇒ catastrophic cancellation in the identity)
      const raw = sym ? gSym(r)(n) : gRand(r)(n, n);
      const A = raw.map((row) => row.map((x) => x * 0.4));
      const extra = sym ? ` + norm(sort(eig(expm(A))) - sort(exp(eig(A))),'fro')/max(1,norm(expm(A),'fro'))` : '';
      const { r: res, error } = await residual(`A = ${lit(A)}; E = expm(A); r = norm(E*expm(-A) - eye(${n}),'fro')${extra};`);
      if (error) bad.push(`expm ${sym ? 'sym' : 'gen'} ${n}: ${error}`); else if (!(res < 1e-6)) bad.push(`expm ${sym ? 'sym' : 'gen'} ${n}: residual=${res}`);
    }
    assert.equal(bad.length, 0, `expm failures:\n  ${bad.join('\n  ')}`);
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
