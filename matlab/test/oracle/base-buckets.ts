/**
 * Base/core builtin triage metadata — explicit classification, NOT inferred from name scans.
 *
 * The `base-audit` tool reads this to bucket the ~1300 base builtins so coverage is judged by
 * risk + contract relevance, not by a raw reference percentage (most primitives are exercised
 * indirectly and never appear as a named token). Functions absent here are reported as
 * `uncategorized` — the triage backlog. Grow this file as functions are triaged.
 *
 * bucket:
 *   contract-core        part of the declared computational contract; must have direct or
 *                        strong-workflow (indirect) coverage.
 *   needs-oracle         unvalidated and risk-relevant (shape/N-D/sparse/complex/multi-output/
 *                        non-unique/edge behavior) — should get an oracle/invariant case.
 *   ts-only-ok           browser/graphics/VFS/error behavior MATLAB has no opinion on — TS-only.
 *   defer                real but low priority; revisit if course-driven.
 *   out-of-scope         low-value breadth: candidate to move to a toolbox, quarantine, or delete.
 *   alias-helper         compatibility alias or thin wrapper of another (covered) builtin.
 *
 * validation (how it is/should be checked): direct | indirect | invariant | ts-only | none.
 * The audit derives whether a function is *currently* directly referenced; `validation` here is
 * the intended/declared mode (e.g. mldivide is `indirect` — exercised by `\`, never named).
 */
export type Bucket = 'contract-core' | 'needs-oracle' | 'ts-only-ok' | 'defer' | 'out-of-scope' | 'alias-helper';
export type Validation = 'direct' | 'indirect' | 'invariant' | 'ts-only' | 'none';
export interface BaseMeta { bucket: Bucket; validation: Validation; domain?: string; note?: string; }

const cc = (validation: Validation, domain: string): BaseMeta => ({ bucket: 'contract-core', validation, domain });

export const BASE_BUCKETS: Record<string, BaseMeta> = {
  // ── contract-core: array construction ──
  zeros: cc('direct', 'core-language'), ones: cc('direct', 'core-language'),
  eye: cc('direct', 'core-language'), diag: cc('direct', 'core-language'),
  repmat: cc('direct', 'core-language'), reshape: cc('direct', 'core-language'),
  cat: cc('direct', 'core-language'),
  // ── contract-core: indexing / shape ──
  size: cc('direct', 'core-language'), numel: cc('direct', 'core-language'),
  length: cc('direct', 'core-language'), squeeze: cc('direct', 'core-language'),
  permute: cc('direct', 'core-language'),
  // ── contract-core: reductions ──
  sum: cc('direct', 'core-language'), prod: cc('direct', 'core-language'),
  min: cc('direct', 'core-language'), max: cc('direct', 'core-language'),
  mean: cc('direct', 'statistics'), std: cc('direct', 'statistics'), var: cc('direct', 'statistics'),
  // ── contract-core: linear algebra ──
  mldivide: cc('indirect', 'linear-algebra'),   // exercised by the `\` operator, never named
  inv: cc('direct', 'linear-algebra'), det: cc('direct', 'linear-algebra'),
  rank: cc('direct', 'linear-algebra'), null: cc('direct', 'linear-algebra'),
  orth: cc('direct', 'linear-algebra'), eig: cc('invariant', 'linear-algebra'),
  svd: cc('invariant', 'linear-algebra'), qr: cc('invariant', 'linear-algebra'),
  lu: cc('invariant', 'numerical-linear-algebra'), chol: cc('direct', 'linear-algebra'),
  // ── contract-core: sparse ──
  sparse: cc('direct', 'numerical-linear-algebra'), full: cc('direct', 'numerical-linear-algebra'),
  speye: cc('direct', 'numerical-linear-algebra'), spdiags: cc('direct', 'numerical-linear-algebra'),
  nnz: cc('direct', 'numerical-linear-algebra'),
  // ── contract-core: complex / elementary math ──
  sqrt: cc('direct', 'complex-arithmetic'), log: cc('direct', 'complex-arithmetic'),
  exp: cc('direct', 'complex-arithmetic'), sin: cc('direct', 'core-language'),
  cos: cc('direct', 'core-language'), tan: cc('direct', 'core-language'),
  abs: cc('direct', 'complex-arithmetic'), angle: cc('direct', 'complex-arithmetic'),
  real: cc('direct', 'complex-arithmetic'), imag: cc('direct', 'complex-arithmetic'),
  conj: cc('direct', 'complex-arithmetic'),
  // ── contract-core: polynomial / numerical ──
  polyfit: cc('direct', 'approximation'), polyval: cc('direct', 'approximation'),
  roots: cc('direct', 'approximation'), interp1: cc('direct', 'approximation'),
  integral: cc('direct', 'numerical-methods'), fzero: cc('direct', 'nonlinear-systems'),
  ode45: cc('direct', 'numerical-ode'),
};
