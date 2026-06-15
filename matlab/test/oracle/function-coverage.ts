/**
 * Canonical per-function aspect checklist.
 *
 * For each listed function, REQUIRED_ASPECTS declares the regimes it must be oracle-validated
 * across before it counts as FULLY covered (vs partially). This is the function-level discipline
 * layer on top of the workflow/integration cases: `pnpm oracle:functions` inverts the oracle suite
 * into a per-function index and checks each function's covered aspects against this list.
 *
 * Aspects are matched against each case's explicit `aspect` field AND its technique `tags`, so the
 * existing tagged cases already count (e.g. an `eig` case tagged 'symmetric' covers that aspect).
 *
 * This list is CURATED and REVIEWABLE — expand it deliberately. A function absent from this map is
 * still reported (status 'tested' / 'untested'); it just has no required-regime checklist yet. The
 * goal is honest gap-tracking: a function with cases but a missing aspect is 'partial', and the
 * report names exactly which regime is missing — that is the work queue.
 */
export const REQUIRED_ASPECTS: Record<string, string[]> = {
  // ── numerical linear algebra (regimes that genuinely change the code path) ──
  eig: ['symmetric', 'complex', 'generalized-eigenvalue', 'reconstruction-invariant'],
  svd: ['reconstruction-invariant', 'rank-deficient'],
  qr: ['reconstruction-invariant', 'rank-deficient'],
  chol: ['symmetric', 'sparse'],
  expm: ['matrix-functions'],
  // rectangular HNF is intentionally NOT required: MATLAB's residue convention for non-pivot
  // columns of a wide/tall matrix diverges from ours (documented divergence) — validated claim is
  // square only.
  hermiteForm: ['square'],
  minpoly: ['diagonalizable', 'defective'],

  // ── special functions (the regime that broke them historically) ──
  kummerU: ['integer-b', 'noninteger-b'],
  whittakerW: ['positive-a', 'nonpositive-a'],
};

/** Aspect inference for cases lacking an explicit `aspect`: which technique tags are treated as
 *  regime aspects. We treat every tag that is NOT a registered function name as a candidate aspect;
 *  this set is the curated vocabulary used to keep the report's aspect axis meaningful (it is not a
 *  hard filter — any non-function tag still contributes, but these are the recognised regimes). */
export const ASPECT_VOCAB = new Set<string>([
  'symmetric', 'complex', 'real', 'generalized-eigenvalue', 'reconstruction-invariant',
  'residual-invariant', 'roundtrip-invariant', 'rank-deficient', 'sparse', 'pagewise', 'n-d',
  'least-squares', 'defective', 'diagonalizable', 'square', 'rectangular', 'matrix-functions',
  'integer-b', 'noninteger-b', 'positive-a', 'nonpositive-a', 'edge-empty', 'edge-scalar',
]);
