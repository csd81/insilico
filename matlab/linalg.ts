/** Dense linear algebra: det, inv, `\` (square solve + least squares), norm, diag, eye. */
import { type Mat, type ClassV, MatError, mat, zeros, scalar, isScalar, numel, transpose, matmul, isComplex, cmul, cdiv, finishComplex, ctranspose, cmatmul, ewRDiv, csqrt, clog, colVec, rowVec, str, makeObject } from './values';

export function eye(n: number, m = n): Mat {
  const out = zeros(n, m);
  const d = Math.min(n, m);
  for (let i = 0; i < d; i++) out.data[i + i * n] = 1;
  return out;
}

/** LU with partial pivoting. Returns LU packed, pivot rows, and the sign of det. */
function lu(a: Mat): { lu: Float64Array; piv: number[]; sign: number; n: number } {
  const n = a.rows;
  if (a.cols !== n) throw new MatError('matrix must be square');
  const A = Float64Array.from(a.data); // column-major copy
  const at = (r: number, c: number) => A[r + c * n];
  const set = (r: number, c: number, v: number) => { A[r + c * n] = v; };
  const piv = Array.from({ length: n }, (_, i) => i);
  let sign = 1;
  for (let k = 0; k < n; k++) {
    let p = k, max = Math.abs(at(k, k));
    for (let r = k + 1; r < n; r++) { const v = Math.abs(at(r, k)); if (v > max) { max = v; p = r; } }
    if (p !== k) {
      for (let c = 0; c < n; c++) { const t = at(k, c); set(k, c, at(p, c)); set(p, c, t); }
      const tp = piv[k]; piv[k] = piv[p]; piv[p] = tp;
      sign = -sign;
    }
    const pivot = at(k, k);
    if (pivot === 0) continue; // singular; det → 0
    for (let r = k + 1; r < n; r++) {
      const f = at(r, k) / pivot;
      set(r, k, f);
      for (let c = k + 1; c < n; c++) set(r, c, at(r, c) - f * at(k, c));
    }
  }
  return { lu: A, piv, sign, n };
}

export function det(a: Mat): number {
  if (isScalar(a)) return a.data[0];
  const { lu: A, sign, n } = lu(a);
  let d = sign;
  for (let i = 0; i < n; i++) d *= A[i + i * n];
  return d;
}

/** Solve a square system A x = B (B may have multiple columns) using LU. */
function luSolve(a: Mat, b: Mat): Mat {
  const { lu: A, piv, n } = lu(a);
  const at = (r: number, c: number) => A[r + c * n];
  const m = b.cols;
  const X = zeros(n, m);
  for (let col = 0; col < m; col++) {
    // permuted rhs
    const y = new Float64Array(n);
    for (let r = 0; r < n; r++) y[r] = b.data[piv[r] + col * b.rows];
    // forward (unit lower)
    for (let r = 0; r < n; r++) { let s = y[r]; for (let c = 0; c < r; c++) s -= at(r, c) * y[c]; y[r] = s; }
    // back (upper)
    for (let r = n - 1; r >= 0; r--) {
      let s = y[r];
      for (let c = r + 1; c < n; c++) s -= at(r, c) * y[c];
      const d = at(r, r);
      y[r] = s / d;   // IEEE: singular pivot → ±Inf (s≠0) or NaN (0/0), matching MATLAB
    }
    for (let r = 0; r < n; r++) X.data[r + col * n] = y[r];
  }
  return X;
}

export function bandwidth(A: Mat): { lower: number; upper: number } {
  let lower = 0, upper = 0;
  for (let c = 0; c < A.cols; c++) {
    for (let r = 0; r < A.rows; r++) {
      const i = r + c * A.rows;
      if (A.data[i] !== 0 || (A.idata != null && A.idata[i] !== 0)) {
        if (r > c) lower = Math.max(lower, r - c);
        else if (c > r) upper = Math.max(upper, c - r);
      }
    }
  }
  return { lower, upper };
}

function diagonalSolve(A: Mat, b: Mat): Mat {
  const n = A.rows;
  const X = zeros(n, b.cols);
  for (let col = 0; col < b.cols; col++) {
    for (let r = 0; r < n; r++) X.data[r + col * n] = b.data[r + col * b.rows] / A.data[r + r * n];
  }
  return X;
}

function cDiagonalSolve(A: Mat, b: Mat): Mat {
  const n = A.rows;
  const Ar = A.data, Ai = A.idata ?? new Float64Array(n * n);
  const Br = b.data, Bi = b.idata ?? new Float64Array(b.rows * b.cols);
  const Xr = new Float64Array(n * b.cols), Xi = new Float64Array(n * b.cols);
  for (let col = 0; col < b.cols; col++) {
    for (let r = 0; r < n; r++) {
      const [xr, xi] = cdiv(Br[r + col * b.rows], Bi[r + col * b.rows], Ar[r + r * n], Ai[r + r * n]);
      Xr[r + col * n] = xr; Xi[r + col * n] = xi;
    }
  }
  return finishComplex(n, b.cols, Xr, Xi);
}

/** Solve upper-triangular R x = B for square R. */
function upperTriSolve(R: Mat, b: Mat): Mat {
  const n = R.rows;
  if (R.cols !== n) throw new MatError('upperTriSolve: matrix must be square');
  if (b.rows !== n) throw new MatError(`upperTriSolve: row dimensions must agree (${n} vs ${b.rows})`);
  const X = zeros(n, b.cols);
  for (let col = 0; col < b.cols; col++) {
    for (let r = n - 1; r >= 0; r--) {
      let s = b.data[r + col * b.rows];
      for (let c = r + 1; c < n; c++) s -= R.data[r + c * n] * X.data[c + col * n];
      X.data[r + col * n] = s / R.data[r + r * n];
    }
  }
  return X;
}

/** Solve lower-triangular L x = B for square L. */
function lowerTriSolve(L: Mat, b: Mat): Mat {
  const n = L.rows;
  if (L.cols !== n) throw new MatError('lowerTriSolve: matrix must be square');
  if (b.rows !== n) throw new MatError(`lowerTriSolve: row dimensions must agree (${n} vs ${b.rows})`);
  const X = zeros(n, b.cols);
  for (let col = 0; col < b.cols; col++) {
    for (let r = 0; r < n; r++) {
      let s = b.data[r + col * b.rows];
      for (let c = 0; c < r; c++) s -= L.data[r + c * n] * X.data[c + col * n];
      X.data[r + col * n] = s / L.data[r + r * n];
    }
  }
  return X;
}

function tridiagonalSolve(A: Mat, b: Mat): Mat {
  const n = A.rows;
  if (A.cols !== n) throw new MatError('tridiagonalSolve: matrix must be square');
  if (b.rows !== n) throw new MatError(`tridiagonalSolve: row dimensions must agree (${n} vs ${b.rows})`);
  if (n === 0) return zeros(0, b.cols);
  const diag = new Float64Array(n);
  const sub = new Float64Array(Math.max(0, n - 1));
  const sup = new Float64Array(Math.max(0, n - 1));
  for (let i = 0; i < n; i++) diag[i] = A.data[i + i * n];
  for (let i = 0; i < n - 1; i++) {
    sub[i] = A.data[i + 1 + i * n];
    sup[i] = A.data[i + (i + 1) * n];
  }

  const den = new Float64Array(n);
  const cp = new Float64Array(Math.max(0, n - 1));
  den[0] = diag[0];
  if (n > 1) cp[0] = sup[0] / den[0];
  for (let i = 1; i < n; i++) {
    den[i] = diag[i] - sub[i - 1] * cp[i - 1];
    if (i < n - 1) cp[i] = sup[i] / den[i];
  }

  const X = zeros(n, b.cols);
  const y = new Float64Array(n);
  for (let col = 0; col < b.cols; col++) {
    y[0] = b.data[col * b.rows] / den[0];
    for (let i = 1; i < n; i++) y[i] = (b.data[i + col * b.rows] - sub[i - 1] * y[i - 1]) / den[i];
    X.data[n - 1 + col * n] = y[n - 1];
    for (let i = n - 2; i >= 0; i--) X.data[i + col * n] = y[i] - cp[i] * X.data[i + 1 + col * n];
  }
  return X;
}

function tridiagonalNoPivotSafe(A: Mat): boolean {
  const n = A.rows;
  if (n === 0) return true;
  let den = A.data[0];
  if (den === 0) return false;
  for (let i = 1; i < n; i++) {
    const sub = A.data[i + (i - 1) * n];
    const sup = A.data[(i - 1) + i * n];
    den = A.data[i + i * n] - sub * (sup / den);
    if (den === 0) return false;
  }
  return true;
}

const MAX_BANDED_DISPATCH_WIDTH = 17;

function isNarrowBanded(n: number, bw: { lower: number; upper: number }): boolean {
  const width = bw.lower + bw.upper + 1;
  return width < n && width <= MAX_BANDED_DISPATCH_WIDTH;
}

function isUpperHessenberg(n: number, bw: { lower: number; upper: number }): boolean {
  return n > 2 && bw.lower <= 1;
}

function bandedSolve(A0: Mat, b: Mat, bw: { lower: number; upper: number }): Mat {
  const n = A0.rows;
  if (A0.cols !== n) throw new MatError('bandedSolve: matrix must be square');
  if (b.rows !== n) throw new MatError(`bandedSolve: row dimensions must agree (${n} vs ${b.rows})`);

  const A = Float64Array.from(A0.data);
  const piv = Array.from({ length: n }, (_, i) => i);
  const lower = bw.lower;
  const upperFill = bw.upper + bw.lower;
  const at = (r: number, c: number) => A[r + c * n];
  const set = (r: number, c: number, v: number) => { A[r + c * n] = v; };

  for (let k = 0; k < n; k++) {
    let p = k, max = Math.abs(at(k, k));
    const lastPivotRow = Math.min(n - 1, k + lower);
    for (let r = k + 1; r <= lastPivotRow; r++) {
      const v = Math.abs(at(r, k));
      if (v > max) { max = v; p = r; }
    }
    if (p !== k) {
      for (let c = 0; c < n; c++) {
        const t = at(k, c);
        set(k, c, at(p, c));
        set(p, c, t);
      }
      const tp = piv[k]; piv[k] = piv[p]; piv[p] = tp;
    }

    const pivot = at(k, k);
    if (pivot === 0) continue;
    const lastRow = Math.min(n - 1, k + lower);
    const lastCol = Math.min(n - 1, k + upperFill);
    for (let r = k + 1; r <= lastRow; r++) {
      const f = at(r, k) / pivot;
      set(r, k, f);
      for (let c = k + 1; c <= lastCol; c++) set(r, c, at(r, c) - f * at(k, c));
    }
  }

  const X = zeros(n, b.cols);
  for (let col = 0; col < b.cols; col++) {
    const y = new Float64Array(n);
    for (let r = 0; r < n; r++) y[r] = b.data[piv[r] + col * b.rows];

    for (let r = 0; r < n; r++) {
      let s = y[r];
      const first = Math.max(0, r - lower);
      for (let c = first; c < r; c++) s -= at(r, c) * y[c];
      y[r] = s;
    }
    for (let r = n - 1; r >= 0; r--) {
      let s = y[r];
      const last = Math.min(n - 1, r + upperFill);
      for (let c = r + 1; c <= last; c++) s -= at(r, c) * y[c];
      y[r] = s / at(r, r);
    }

    for (let r = 0; r < n; r++) X.data[r + col * n] = y[r];
  }
  return X;
}

function rowPermute(A: Mat, p: number[]): Mat {
  const out = zeros(A.rows, A.cols);
  for (let c = 0; c < A.cols; c++) {
    for (let r = 0; r < A.rows; r++) out.data[r + c * out.rows] = A.data[p[r] + c * A.rows];
  }
  return out;
}

function colPermute(A: Mat, p: number[]): Mat {
  const out = zeros(A.rows, A.cols);
  for (let c = 0; c < A.cols; c++) {
    for (let r = 0; r < A.rows; r++) out.data[r + c * out.rows] = A.data[r + p[c] * A.rows];
  }
  return out;
}

function findPermutedTriangular(A: Mat): { kind: 'upper' | 'lower'; p: number[] } | null {
  const n = A.rows;
  const rows = Array.from({ length: n }, (_, r) => {
    let first = n, last = -1;
    for (let c = 0; c < n; c++) {
      if (A.data[r + c * n] !== 0) {
        first = Math.min(first, c);
        last = Math.max(last, c);
      }
    }
    return { r, first, last };
  });

  const upper = [...rows].sort((a, b) => a.first - b.first);
  if (upper.every((row, pos) => row.first >= pos)) return { kind: 'upper', p: upper.map((row) => row.r) };

  const lower = [...rows].sort((a, b) => a.last - b.last);
  if (lower.every((row, pos) => row.last <= pos)) return { kind: 'lower', p: lower.map((row) => row.r) };

  return null;
}

function findColPermutedTriangular(A: Mat): { kind: 'upper' | 'lower'; p: number[] } | null {
  const n = A.rows;
  const cols = Array.from({ length: n }, (_, c) => {
    let first = n, last = -1;
    for (let r = 0; r < n; r++) {
      if (A.data[r + c * n] !== 0) {
        first = Math.min(first, r);
        last = Math.max(last, r);
      }
    }
    return { c, first, last };
  });

  const upper = [...cols].sort((a, b) => a.last - b.last);
  if (upper.every((col, pos) => col.last <= pos)) return { kind: 'upper', p: upper.map((col) => col.c) };

  const lower = [...cols].sort((a, b) => a.first - b.first);
  if (lower.every((col, pos) => col.first >= pos)) return { kind: 'lower', p: lower.map((col) => col.c) };

  return null;
}

function permutedTriSolve(A: Mat, b: Mat, info: { kind: 'upper' | 'lower'; p: number[] }): Mat {
  const PA = rowPermute(A, info.p);
  const Pb = rowPermute(b, info.p);
  return info.kind === 'upper' ? upperTriSolve(PA, Pb) : lowerTriSolve(PA, Pb);
}

function colPermutedTriSolve(A: Mat, b: Mat, info: { kind: 'upper' | 'lower'; p: number[] }): Mat {
  const TA = colPermute(A, info.p);
  const y = info.kind === 'upper' ? upperTriSolve(TA, b) : lowerTriSolve(TA, b);
  const x = zeros(A.cols, b.cols);
  for (let c = 0; c < A.cols; c++) {
    const orig = info.p[c];
    for (let col = 0; col < b.cols; col++) x.data[orig + col * x.rows] = y.data[c + col * y.rows];
  }
  return x;
}

function choleskySolve(A: Mat, b: Mat): Mat {
  const R = chol(A);
  const y = lowerTriSolve(transpose(R), b);
  return upperTriSolve(R, y);
}

function symmetricSwap(A: Float64Array, n: number, a: number, b: number): void {
  if (a === b) return;
  for (let c = 0; c < n; c++) {
    const t = A[a + c * n];
    A[a + c * n] = A[b + c * n];
    A[b + c * n] = t;
  }
  for (let r = 0; r < n; r++) {
    const t = A[r + a * n];
    A[r + a * n] = A[r + b * n];
    A[r + b * n] = t;
  }
}

function ldlPivotFactor(A0: Mat): { L: Mat; D: Mat; piv: number[]; blocks: number[] } {
  const n = A0.rows;
  const A = Float64Array.from(A0.data);
  const L = eye(n);
  const D = zeros(n, n);
  const piv = Array.from({ length: n }, (_, i) => i);
  const blocks: number[] = [];
  let maxAbs = 0;
  for (const v of A) maxAbs = Math.max(maxAbs, Math.abs(v));
  const tol = Math.max(n, 1) * 2.220446049250313e-16 * Math.max(maxAbs, 1);

  const swapRowsInL = (a: number, b: number, upto: number) => {
    if (a === b) return;
    for (let c = 0; c < upto; c++) {
      const t = L.data[a + c * n];
      L.data[a + c * n] = L.data[b + c * n];
      L.data[b + c * n] = t;
    }
  };
  const swapPiv = (a: number, b: number) => {
    const t = piv[a]; piv[a] = piv[b]; piv[b] = t;
  };

  let k = 0;
  while (k < n) {
    const akk = A[k + k * n];
    let off = 0, p = -1;
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(A[i + k * n]);
      if (v > off) { off = v; p = i; }
    }

    if (Math.abs(akk) > tol || off <= tol || k === n - 1) {
      if (Math.abs(akk) <= tol) throw new MatError('ldl: matrix is singular to working precision');
      D.data[k + k * n] = akk;
      for (let i = k + 1; i < n; i++) L.data[i + k * n] = A[i + k * n] / akk;
      for (let j = k + 1; j < n; j++) {
        const lj = L.data[j + k * n];
        for (let i = j; i < n; i++) {
          A[i + j * n] -= L.data[i + k * n] * akk * lj;
          A[j + i * n] = A[i + j * n];
        }
      }
      blocks.push(1);
      k++;
      continue;
    }

    if (p !== k + 1) {
      symmetricSwap(A, n, k + 1, p);
      swapRowsInL(k + 1, p, k);
      swapPiv(k + 1, p);
    }
    const a = A[k + k * n], d = A[(k + 1) + (k + 1) * n], e = A[(k + 1) + k * n];
    const det2 = a * d - e * e;
    if (Math.abs(det2) <= tol * Math.max(Math.abs(a), Math.abs(d), Math.abs(e), 1)) throw new MatError('ldl: 2-by-2 pivot is singular to working precision');
    D.data[k + k * n] = a;
    D.data[(k + 1) + k * n] = e;
    D.data[k + (k + 1) * n] = e;
    D.data[(k + 1) + (k + 1) * n] = d;

    const w1 = new Float64Array(n);
    const w2 = new Float64Array(n);
    for (let i = k + 2; i < n; i++) {
      w1[i] = A[i + k * n];
      w2[i] = A[i + (k + 1) * n];
      L.data[i + k * n] = (w1[i] * d - w2[i] * e) / det2;
      L.data[i + (k + 1) * n] = (-w1[i] * e + w2[i] * a) / det2;
    }
    for (let j = k + 2; j < n; j++) {
      for (let i = j; i < n; i++) {
        A[i + j * n] -= L.data[i + k * n] * w1[j] + L.data[i + (k + 1) * n] * w2[j];
        A[j + i * n] = A[i + j * n];
      }
    }
    blocks.push(2);
    k += 2;
  }

  return { L, D, piv, blocks };
}

/** Complex Hermitian LDLᴴ with Bunch-Kaufman-style pivoting — mirrors ldlPivotFactor.
 *  Diagonal of A is taken as real (Hermitian assumption); D has real 1×1 blocks and
 *  Hermitian 2×2 blocks [a, conj(e); e, d]. */
function ldlPivotFactorC(A0: Mat): { L: Mat; D: Mat; piv: number[] } {
  const n = A0.rows;
  const Ar = Float64Array.from(A0.data), Ai = A0.idata ? Float64Array.from(A0.idata) : new Float64Array(n * n);
  const Lr = new Float64Array(n * n), Li = new Float64Array(n * n);
  for (let i = 0; i < n; i++) Lr[i + i * n] = 1;
  const Dr = new Float64Array(n * n), Di = new Float64Array(n * n);
  const piv = Array.from({ length: n }, (_, i) => i);
  let amax = 0;
  for (let i = 0; i < Ar.length; i++) amax = Math.max(amax, Math.hypot(Ar[i], Ai[i]));
  const tol = Math.max(n, 1) * 2.220446049250313e-16 * Math.max(amax, 1);
  const cswap = (M1: Float64Array, M2: Float64Array, x: number, y: number): void => { const t1 = M1[x]; M1[x] = M1[y]; M1[y] = t1; const t2 = M2[x]; M2[x] = M2[y]; M2[y] = t2; };
  const hermSwap = (a: number, b: number): void => {
    if (a === b) return;
    for (let c = 0; c < n; c++) cswap(Ar, Ai, a + c * n, b + c * n);
    for (let r = 0; r < n; r++) cswap(Ar, Ai, r + a * n, r + b * n);
  };
  let k = 0;
  while (k < n) {
    const akk = Ar[k + k * n]; // Hermitian ⇒ real diagonal
    let off = 0, p = -1;
    for (let i = k + 1; i < n; i++) {
      const v = Math.hypot(Ar[i + k * n], Ai[i + k * n]);
      if (v > off) { off = v; p = i; }
    }
    if (Math.abs(akk) > tol || off <= tol || k === n - 1) {
      if (Math.abs(akk) <= tol) throw new MatError('ldl: matrix is singular to working precision');
      Dr[k + k * n] = akk;
      for (let i = k + 1; i < n; i++) { Lr[i + k * n] = Ar[i + k * n] / akk; Li[i + k * n] = Ai[i + k * n] / akk; }
      for (let j = k + 1; j < n; j++) {
        for (let i = j; i < n; i++) {
          // A[i][j] -= L[i][k]·akk·conj(L[j][k])
          const [pr, pi2] = cmul(Lr[i + k * n], Li[i + k * n], Lr[j + k * n], -Li[j + k * n]);
          Ar[i + j * n] -= pr * akk; Ai[i + j * n] -= pi2 * akk;
          Ar[j + i * n] = Ar[i + j * n]; Ai[j + i * n] = -Ai[i + j * n];
        }
      }
      k++;
      continue;
    }
    if (p !== k + 1) {
      hermSwap(k + 1, p);
      for (let c = 0; c < k; c++) cswap(Lr, Li, k + 1 + c * n, p + c * n);
      const t = piv[k + 1]; piv[k + 1] = piv[p]; piv[p] = t;
    }
    const a = Ar[k + k * n], d = Ar[(k + 1) + (k + 1) * n];
    const er = Ar[(k + 1) + k * n], ei = Ai[(k + 1) + k * n];
    const det2 = a * d - (er * er + ei * ei); // real for Hermitian blocks
    if (Math.abs(det2) <= tol * Math.max(Math.abs(a), Math.abs(d), Math.hypot(er, ei), 1)) throw new MatError('ldl: 2-by-2 pivot is singular to working precision');
    Dr[k + k * n] = a; Dr[(k + 1) + (k + 1) * n] = d;
    Dr[(k + 1) + k * n] = er; Di[(k + 1) + k * n] = ei;
    Dr[k + (k + 1) * n] = er; Di[k + (k + 1) * n] = -ei;
    const w1r = new Float64Array(n), w1i = new Float64Array(n), w2r = new Float64Array(n), w2i = new Float64Array(n);
    for (let i = k + 2; i < n; i++) {
      w1r[i] = Ar[i + k * n]; w1i[i] = Ai[i + k * n];
      w2r[i] = Ar[i + (k + 1) * n]; w2i[i] = Ai[i + (k + 1) * n];
      // [L_ik, L_ik1] = [w1, w2]·inv([a, conj(e); e, d]) = ([w1·d − w2·e, −w1·conj(e) + w2·a])/det2
      const [m1r, m1i] = cmul(w2r[i], w2i[i], er, ei);
      Lr[i + k * n] = (w1r[i] * d - m1r) / det2; Li[i + k * n] = (w1i[i] * d - m1i) / det2;
      const [m2r, m2i] = cmul(w1r[i], w1i[i], er, -ei);
      Lr[i + (k + 1) * n] = (-m2r + w2r[i] * a) / det2; Li[i + (k + 1) * n] = (-m2i + w2i[i] * a) / det2;
    }
    for (let j = k + 2; j < n; j++) {
      for (let i = j; i < n; i++) {
        // A[i][j] -= L[i][k]·conj(w1[j]) + L[i][k+1]·conj(w2[j])
        const [p1r, p1i] = cmul(Lr[i + k * n], Li[i + k * n], w1r[j], -w1i[j]);
        const [p2r, p2i] = cmul(Lr[i + (k + 1) * n], Li[i + (k + 1) * n], w2r[j], -w2i[j]);
        Ar[i + j * n] -= p1r + p2r; Ai[i + j * n] -= p1i + p2i;
        Ar[j + i * n] = Ar[i + j * n]; Ai[j + i * n] = -Ai[i + j * n];
      }
    }
    k += 2;
  }
  return { L: finishComplex(n, n, Lr, Li), D: finishComplex(n, n, Dr, Di), piv };
}

function pivotMatrix(piv: number[]): Mat {
  const n = piv.length;
  const P = zeros(n, n);
  for (let r = 0; r < n; r++) P.data[r + piv[r] * n] = 1;
  return P;
}

function ldlSolve(A: Mat, b: Mat): Mat {
  const { L, D, piv, blocks } = ldlPivotFactor(A);
  const n = A.rows;
  const rhs = zeros(n, b.cols);
  for (let col = 0; col < b.cols; col++) for (let r = 0; r < n; r++) rhs.data[r + col * n] = b.data[piv[r] + col * b.rows];
  const z = lowerTriSolve(L, rhs);
  const w = zeros(n, b.cols);

  let k = 0;
  for (const block of blocks) {
    if (block === 1) {
      for (let col = 0; col < b.cols; col++) w.data[k + col * n] = z.data[k + col * n] / D.data[k + k * n];
      k++;
    } else {
      const a = D.data[k + k * n], e = D.data[(k + 1) + k * n], d = D.data[(k + 1) + (k + 1) * n];
      const det2 = a * d - e * e;
      for (let col = 0; col < b.cols; col++) {
        const z1 = z.data[k + col * n], z2 = z.data[k + 1 + col * n];
        w.data[k + col * n] = (d * z1 - e * z2) / det2;
        w.data[k + 1 + col * n] = (-e * z1 + a * z2) / det2;
      }
      k += 2;
    }
  }

  const y = upperTriSolve(transpose(L), w);
  const x = zeros(n, b.cols);
  for (let r = 0; r < n; r++) for (let col = 0; col < b.cols; col++) x.data[piv[r] + col * n] = y.data[r + col * n];
  return x;
}

function squareSolve(a: Mat, b: Mat): Mat {
  const bw = bandwidth(a);
  if (bw.lower === 0 && bw.upper === 0) return diagonalSolve(a, b);
  if (bw.lower === 0) return upperTriSolve(a, b);
  if (bw.upper === 0) return lowerTriSolve(a, b);
  const permutedTri = findPermutedTriangular(a);
  if (permutedTri) return permutedTriSolve(a, b, permutedTri);
  const colPermutedTri = findColPermutedTriangular(a);
  if (colPermutedTri) return colPermutedTriSolve(a, b, colPermutedTri);
  if (bw.lower <= 1 && bw.upper <= 1 && tridiagonalNoPivotSafe(a)) return tridiagonalSolve(a, b);
  if (isNarrowBanded(a.rows, bw)) return bandedSolve(a, b, bw);
  if (isUpperHessenberg(a.rows, bw)) return bandedSolve(a, b, { lower: 1, upper: a.cols - 1 });
  if (isSymmetric(a, 0)) {
    try { return choleskySolve(a, b); } catch {
      // Not SPD; MATLAB continues to a general solver for symmetric indefinite cases.
    }
    try { return ldlSolve(a, b); } catch {
      // Pivoted LDL can still fail on singular cases; LU remains the general fallback.
    }
  }
  return luSolve(a, b);
}

export type MldividePlan =
  | 'scalar'
  | 'complex-diagonal'
  | 'complex-upper-triangular'
  | 'complex-lower-triangular'
  | 'complex-lu'
  | 'complex-qrcp'
  | 'diagonal'
  | 'upper-triangular'
  | 'lower-triangular'
  | 'permuted-upper-triangular'
  | 'permuted-lower-triangular'
  | 'column-permuted-upper-triangular'
  | 'column-permuted-lower-triangular'
  | 'tridiagonal'
  | 'banded'
  | 'hessenberg'
  | 'cholesky'
  | 'ldl'
  | 'lu'
  | 'qrcp';

export function mldividePlan(a: Mat): MldividePlan {
  if (isScalar(a)) return 'scalar';
  if (isComplex(a)) {
    if (a.rows === a.cols) {
      const bw = bandwidth(a);
      if (bw.lower === 0 && bw.upper === 0) return 'complex-diagonal';
      if (bw.lower === 0) return 'complex-upper-triangular';
      if (bw.upper === 0) return 'complex-lower-triangular';
      return 'complex-lu';
    }
    return 'complex-qrcp';
  }
  if (a.rows !== a.cols) {
    return 'qrcp';
  }

  const bw = bandwidth(a);
  if (bw.lower === 0 && bw.upper === 0) return 'diagonal';
  if (bw.lower === 0) return 'upper-triangular';
  if (bw.upper === 0) return 'lower-triangular';
  const permutedTri = findPermutedTriangular(a);
  if (permutedTri) return permutedTri.kind === 'upper' ? 'permuted-upper-triangular' : 'permuted-lower-triangular';
  const colPermutedTri = findColPermutedTriangular(a);
  if (colPermutedTri) return colPermutedTri.kind === 'upper' ? 'column-permuted-upper-triangular' : 'column-permuted-lower-triangular';
  if (bw.lower <= 1 && bw.upper <= 1 && tridiagonalNoPivotSafe(a)) return 'tridiagonal';
  if (isNarrowBanded(a.rows, bw)) return 'banded';
  if (isUpperHessenberg(a.rows, bw)) return 'hessenberg';
  if (isSymmetric(a, 0)) {
    try { chol(a); return 'cholesky'; } catch {
      // Not SPD; try the symmetric-indefinite path next.
    }
    try { ldlPivotFactor(a); return 'ldl'; } catch {
      // Fall through to general LU if symmetric-specific factorization fails.
    }
  }
  return 'lu';
}

function qrPivot(A: Mat): { Q: Mat; R: Mat; piv: number[]; rank: number; tol: number } {
  const m = A.rows, n = A.cols;
  const R = mat(m, n, Float64Array.from(A.data));
  const Q = eye(m);
  const piv = Array.from({ length: n }, (_, i) => i);
  const colNorm = new Float64Array(n);
  let maxColNorm = 0;
  for (let c = 0; c < n; c++) {
    let s = 0;
    for (let r = 0; r < m; r++) s += R.data[r + c * m] ** 2;
    colNorm[c] = Math.sqrt(s);
    maxColNorm = Math.max(maxColNorm, colNorm[c]);
  }
  const at = (M: Mat, r: number, c: number) => M.data[r + c * M.rows];
  const steps = Math.min(m, n);
  for (let k = 0; k < steps; k++) {
    let pc = k, best = -1;
    for (let c = k; c < n; c++) {
      let s = 0;
      for (let r = k; r < m; r++) s += at(R, r, c) ** 2;
      colNorm[c] = Math.sqrt(s);
      if (colNorm[c] > best) { best = colNorm[c]; pc = c; }
    }
    if (pc !== k) {
      for (let r = 0; r < m; r++) {
        const t = R.data[r + k * m];
        R.data[r + k * m] = R.data[r + pc * m];
        R.data[r + pc * m] = t;
      }
      const tp = piv[k]; piv[k] = piv[pc]; piv[pc] = tp;
      const tn = colNorm[k]; colNorm[k] = colNorm[pc]; colNorm[pc] = tn;
    }
    let normx = 0; for (let r = k; r < m; r++) normx += at(R, r, k) ** 2; normx = Math.sqrt(normx);
    if (normx === 0) continue;
    const alpha = at(R, k, k) >= 0 ? -normx : normx;
    const v = new Float64Array(m);
    v[k] = at(R, k, k) - alpha;
    for (let r = k + 1; r < m; r++) v[r] = at(R, r, k);
    let vnorm2 = 0; for (let r = k; r < m; r++) vnorm2 += v[r] ** 2;
    if (vnorm2 === 0) continue;
    for (let c = k; c < n; c++) {
      let d = 0; for (let r = k; r < m; r++) d += v[r] * at(R, r, c);
      d = (2 * d) / vnorm2;
      for (let r = k; r < m; r++) R.data[r + c * m] -= d * v[r];
    }
    for (let r = 0; r < m; r++) {
      let d = 0; for (let i = k; i < m; i++) d += at(Q, r, i) * v[i];
      d = (2 * d) / vnorm2;
      for (let i = k; i < m; i++) Q.data[r + i * m] -= d * v[i];
    }
  }
  const tol = Math.max(m, n) * 2.220446049250313e-16 * maxColNorm;
  let rank = 0;
  for (let k = 0; k < steps; k++) if (Math.abs(R.data[k + k * m]) > tol) rank++;
  return { Q, R, piv, rank, tol };
}

/** Complex Householder QR (LAPACK zlarfg convention: R has a real diagonal, matching MATLAB's
 *  sign/phase choices), with optional column pivoting. Works for real input too but allocates
 *  imaginary parts; callers keep the dedicated real paths for speed. */
function qrComplexHouseholder(A: Mat, pivot: boolean): { Q: Mat; R: Mat; piv: number[] } {
  const m = A.rows, n = A.cols;
  const Rr = Float64Array.from(A.data), Ri = A.idata ? Float64Array.from(A.idata) : new Float64Array(m * n);
  const Qr = new Float64Array(m * m), Qi = new Float64Array(m * m);
  for (let i = 0; i < m; i++) Qr[i + i * m] = 1;
  const piv = Array.from({ length: n }, (_, i) => i);
  const vr = new Float64Array(m), vi = new Float64Array(m);
  for (let k = 0; k < Math.min(m, n); k++) {
    if (pivot) {
      let pc = k, best = -1;
      for (let c = k; c < n; c++) {
        let s = 0; for (let r = k; r < m; r++) s += Rr[r + c * m] ** 2 + Ri[r + c * m] ** 2;
        if (s > best) { best = s; pc = c; }
      }
      if (pc !== k) {
        for (let r = 0; r < m; r++) {
          let t = Rr[r + k * m]; Rr[r + k * m] = Rr[r + pc * m]; Rr[r + pc * m] = t;
          t = Ri[r + k * m]; Ri[r + k * m] = Ri[r + pc * m]; Ri[r + pc * m] = t;
        }
        const tp = piv[k]; piv[k] = piv[pc]; piv[pc] = tp;
      }
    }
    const ar = Rr[k + k * m], ai = Ri[k + k * m];
    let xnorm2 = 0; for (let r = k + 1; r < m; r++) xnorm2 += Rr[r + k * m] ** 2 + Ri[r + k * m] ** 2;
    if (xnorm2 === 0 && ai === 0) continue; // column already reduced with a real pivot
    const beta = (ar >= 0 ? -1 : 1) * Math.sqrt(ar * ar + ai * ai + xnorm2);
    const taur = (beta - ar) / beta, taui = -ai / beta;
    vr[k] = 1; vi[k] = 0;
    for (let r = k + 1; r < m; r++) { const [qr2, qi2] = cdiv(Rr[r + k * m], Ri[r + k * m], ar - beta, ai); vr[r] = qr2; vi[r] = qi2; }
    // zlarfg's H satisfies Hᴴx = βe₁, so columns get Hᴴ = I - conj(τ) v vᴴ and Q accumulates H.
    for (let c = k + 1; c < n; c++) {
      let wr = 0, wi = 0;
      for (let r = k; r < m; r++) { const [pr, pi2] = cmul(vr[r], -vi[r], Rr[r + c * m], Ri[r + c * m]); wr += pr; wi += pi2; }
      const [twr, twi] = cmul(taur, -taui, wr, wi);
      for (let r = k; r < m; r++) { const [pr, pi2] = cmul(twr, twi, vr[r], vi[r]); Rr[r + c * m] -= pr; Ri[r + c * m] -= pi2; }
    }
    // Q := Q (I - τ v vᴴ)
    for (let r = 0; r < m; r++) {
      let wr = 0, wi = 0;
      for (let j = k; j < m; j++) { const [pr, pi2] = cmul(Qr[r + j * m], Qi[r + j * m], vr[j], vi[j]); wr += pr; wi += pi2; }
      const [twr, twi] = cmul(taur, taui, wr, wi);
      for (let j = k; j < m; j++) { const [pr, pi2] = cmul(twr, twi, vr[j], -vi[j]); Qr[r + j * m] -= pr; Qi[r + j * m] -= pi2; }
    }
    Rr[k + k * m] = beta; Ri[k + k * m] = 0;
    for (let r = k + 1; r < m; r++) { Rr[r + k * m] = 0; Ri[r + k * m] = 0; }
  }
  return { Q: finishComplex(m, m, Qr, Qi), R: finishComplex(m, n, Rr, Ri), piv };
}

export function qrPivotOutputs(A: Mat): { Q: Mat; R: Mat; E: Mat; piv: number[] } {
  const buildE = (piv: number[]): Mat => {
    const E = zeros(A.cols, A.cols);
    for (let c = 0; c < A.cols; c++) E.data[piv[c] + c * A.cols] = 1;
    return E;
  };
  if (isComplex(A)) {
    const { Q, R, piv } = qrComplexHouseholder(A, true);
    return { Q, R, E: buildE(piv), piv };
  }
  const { Q, R, piv } = qrPivot(A);
  for (let c = 0; c < R.cols; c++) {
    for (let r = c + 1; r < R.rows; r++) R.data[r + c * R.rows] = 0;
  }
  return { Q, R, E: buildE(piv), piv };
}

export function qrRankWarning(A: Mat): string | null {
  if (A.rows === A.cols || A.rows < 1 || A.cols < 1 || A.isChar) return null;
  const { rank, tol } = svdRankInfo(A);
  if (rank >= Math.min(A.rows, A.cols)) return null;
  return `Rank deficient, rank = ${rank}, tol = ${tol.toExponential(6)}.`;
}

function qrPivotSolve(a: Mat, b: Mat): { x: Mat; rank: number; tol: number } {
  const { Q, R, piv, rank, tol } = qrPivot(a);
  const z = zeros(a.cols, b.cols);
  if (rank > 0) {
    const rhs = zeros(rank, b.cols);
    for (let col = 0; col < b.cols; col++) {
      for (let r = 0; r < rank; r++) {
        let s = 0;
        for (let k = 0; k < a.rows; k++) s += Q.data[k + r * Q.rows] * b.data[k + col * b.rows];
        rhs.data[r + col * rank] = s;
      }
    }
    const R11 = zeros(rank, rank);
    for (let c = 0; c < rank; c++) for (let r = 0; r <= c; r++) R11.data[r + c * rank] = R.data[r + c * R.rows];
    const y = upperTriSolve(R11, rhs);
    for (let col = 0; col < b.cols; col++) for (let r = 0; r < rank; r++) z.data[r + col * z.rows] = y.data[r + col * y.rows];
  }
  const x = zeros(a.cols, b.cols);
  for (let c = 0; c < a.cols; c++) {
    const orig = piv[c];
    for (let col = 0; col < b.cols; col++) x.data[orig + col * x.rows] = z.data[c + col * z.rows];
  }
  return { x, rank, tol };
}

function cUpperTriSolve(R: Mat, b: Mat): Mat {
  const n = R.rows;
  if (R.cols !== n) throw new MatError('cUpperTriSolve: matrix must be square');
  if (b.rows !== n) throw new MatError(`cUpperTriSolve: row dimensions must agree (${n} vs ${b.rows})`);
  const Rr = R.data, Ri = R.idata ?? new Float64Array(n * n);
  const br = b.data, bi = b.idata ?? new Float64Array(b.rows * b.cols);
  const Xr = new Float64Array(n * b.cols), Xi = new Float64Array(n * b.cols);
  for (let col = 0; col < b.cols; col++) {
    for (let r = n - 1; r >= 0; r--) {
      let sr = br[r + col * b.rows], si = bi[r + col * b.rows];
      for (let c = r + 1; c < n; c++) {
        const [pr, pi] = cmul(Rr[r + c * n], Ri[r + c * n], Xr[c + col * n], Xi[c + col * n]);
        sr -= pr; si -= pi;
      }
      const [xr, xi] = cdiv(sr, si, Rr[r + r * n], Ri[r + r * n]);
      Xr[r + col * n] = xr; Xi[r + col * n] = xi;
    }
  }
  return finishComplex(n, b.cols, Xr, Xi);
}

function cLowerTriSolve(L: Mat, b: Mat): Mat {
  const n = L.rows;
  if (L.cols !== n) throw new MatError('cLowerTriSolve: matrix must be square');
  if (b.rows !== n) throw new MatError(`cLowerTriSolve: row dimensions must agree (${n} vs ${b.rows})`);
  const Lr = L.data, Li = L.idata ?? new Float64Array(n * n);
  const br = b.data, bi = b.idata ?? new Float64Array(b.rows * b.cols);
  const Xr = new Float64Array(n * b.cols), Xi = new Float64Array(n * b.cols);
  for (let col = 0; col < b.cols; col++) {
    for (let r = 0; r < n; r++) {
      let sr = br[r + col * b.rows], si = bi[r + col * b.rows];
      for (let c = 0; c < r; c++) {
        const [pr, pi] = cmul(Lr[r + c * n], Li[r + c * n], Xr[c + col * n], Xi[c + col * n]);
        sr -= pr; si -= pi;
      }
      const [xr, xi] = cdiv(sr, si, Lr[r + r * n], Li[r + r * n]);
      Xr[r + col * n] = xr; Xi[r + col * n] = xi;
    }
  }
  return finishComplex(n, b.cols, Xr, Xi);
}

function cSquareSolve(a: Mat, b: Mat): Mat {
  const bw = bandwidth(a);
  if (bw.lower === 0 && bw.upper === 0) return cDiagonalSolve(a, b);
  if (bw.lower === 0) return cUpperTriSolve(a, b);
  if (bw.upper === 0) return cLowerTriSolve(a, b);
  return cLuSolve(a, b);
}

function cQrPivotSolve(a: Mat, b: Mat): { x: Mat; rank: number; tol: number } {
  const m = a.rows, n = a.cols, steps = Math.min(m, n);
  const Vr = Float64Array.from(a.data);
  const Vi = a.idata ? Float64Array.from(a.idata) : new Float64Array(m * n);
  const Qr = new Float64Array(m * steps), Qi = new Float64Array(m * steps);
  const Rr = new Float64Array(steps * n), Ri = new Float64Array(steps * n);
  const piv = Array.from({ length: n }, (_, i) => i);
  let maxColNorm = 0;
  for (let c = 0; c < n; c++) {
    let s = 0;
    for (let r = 0; r < m; r++) s += Vr[r + c * m] ** 2 + Vi[r + c * m] ** 2;
    maxColNorm = Math.max(maxColNorm, Math.sqrt(s));
  }
  const tol = Math.max(m, n) * 2.220446049250313e-16 * maxColNorm;

  let rank = 0;
  for (let k = 0; k < steps; k++) {
    let pc = k, best = -1;
    for (let c = k; c < n; c++) {
      let s = 0;
      for (let r = 0; r < m; r++) s += Vr[r + c * m] ** 2 + Vi[r + c * m] ** 2;
      if (s > best) { best = s; pc = c; }
    }
    if (pc !== k) {
      for (let r = 0; r < m; r++) {
        let t = Vr[r + k * m]; Vr[r + k * m] = Vr[r + pc * m]; Vr[r + pc * m] = t;
        t = Vi[r + k * m]; Vi[r + k * m] = Vi[r + pc * m]; Vi[r + pc * m] = t;
      }
      for (let r = 0; r < k; r++) {
        let t = Rr[r + k * steps]; Rr[r + k * steps] = Rr[r + pc * steps]; Rr[r + pc * steps] = t;
        t = Ri[r + k * steps]; Ri[r + k * steps] = Ri[r + pc * steps]; Ri[r + pc * steps] = t;
      }
      const tp = piv[k]; piv[k] = piv[pc]; piv[pc] = tp;
    }

    const norm = Math.sqrt(Math.max(best, 0));
    if (norm <= tol) break;
    Rr[k + k * steps] = norm;
    for (let r = 0; r < m; r++) {
      Qr[r + k * m] = Vr[r + k * m] / norm;
      Qi[r + k * m] = Vi[r + k * m] / norm;
    }
    for (let c = k + 1; c < n; c++) {
      let rr = 0, ri = 0;
      for (let r = 0; r < m; r++) {
        const qr = Qr[r + k * m], qi = Qi[r + k * m];
        const vr = Vr[r + c * m], vi = Vi[r + c * m];
        rr += qr * vr + qi * vi;
        ri += qr * vi - qi * vr;
      }
      Rr[k + c * steps] = rr; Ri[k + c * steps] = ri;
      for (let r = 0; r < m; r++) {
        const [pr, pi] = cmul(Qr[r + k * m], Qi[r + k * m], rr, ri);
        Vr[r + c * m] -= pr; Vi[r + c * m] -= pi;
      }
    }
    rank++;
  }

  const zr = new Float64Array(n * b.cols), zi = new Float64Array(n * b.cols);
  if (rank > 0) {
    const rhsr = new Float64Array(rank * b.cols), rhsi = new Float64Array(rank * b.cols);
    const br = b.data, bi = b.idata ?? new Float64Array(b.rows * b.cols);
    for (let col = 0; col < b.cols; col++) {
      for (let q = 0; q < rank; q++) {
        let sr = 0, si = 0;
        for (let r = 0; r < m; r++) {
          const qr = Qr[r + q * m], qi = Qi[r + q * m];
          const vr = br[r + col * b.rows], vi = bi[r + col * b.rows];
          sr += qr * vr + qi * vi;
          si += qr * vi - qi * vr;
        }
        rhsr[q + col * rank] = sr; rhsi[q + col * rank] = si;
      }
    }
    const R11r = new Float64Array(rank * rank), R11i = new Float64Array(rank * rank);
    for (let c = 0; c < rank; c++) {
      for (let r = 0; r <= c; r++) {
        R11r[r + c * rank] = Rr[r + c * steps];
        R11i[r + c * rank] = Ri[r + c * steps];
      }
    }
    const y = cUpperTriSolve(finishComplex(rank, rank, R11r, R11i), finishComplex(rank, b.cols, rhsr, rhsi));
    const yr = y.data, yi = y.idata ?? new Float64Array(y.rows * y.cols);
    for (let col = 0; col < b.cols; col++) {
      for (let r = 0; r < rank; r++) {
        zr[r + col * n] = yr[r + col * y.rows];
        zi[r + col * n] = yi[r + col * y.rows];
      }
    }
  }

  const xr = new Float64Array(n * b.cols), xi = new Float64Array(n * b.cols);
  for (let c = 0; c < n; c++) {
    const orig = piv[c];
    for (let col = 0; col < b.cols; col++) {
      xr[orig + col * n] = zr[c + col * n];
      xi[orig + col * n] = zi[c + col * n];
    }
  }
  return { x: finishComplex(n, b.cols, xr, xi), rank, tol };
}

function cPinv(A: Mat, info = svdRankInfo(A)): Mat {
  const { U, s, V, tol } = info;
  const m = A.rows, n = A.cols;
  const k = s.length;
  const Splus = zeros(k, k);
  for (let j = 0; j < k; j++) if (s[j] > tol) Splus.data[j + j * k] = 1 / s[j];
  return cmatmul(cmatmul(V, Splus), ctranspose(U));
}

export function inv(a: Mat): Mat {
  if (isComplex(a)) { if (a.rows !== a.cols) throw new MatError('inverse requires a square matrix'); return cSquareSolve(a, eye(a.rows)); }
  if (isScalar(a)) return scalar(1 / a.data[0]);
  if (a.rows !== a.cols) throw new MatError('inverse requires a square matrix');
  return squareSolve(a, eye(a.rows));
}

/** A \ B (mldivide): square dispatch by structure; rectangular → pivoted-QR basic least-squares solve. */
export function mldivide(a: Mat, b: Mat): Mat {
  if (isComplex(a) || isComplex(b)) {
    if (isScalar(a)) return ewRDiv(b, a);
    if (a.rows !== b.rows) throw new MatError(`\\: row dimensions must agree (${a.rows} vs ${b.rows})`);
    if (a.rows === a.cols) return cSquareSolve(a, b);
    return cQrPivotSolve(a, b).x;
  }
  if (isScalar(a)) return mat(b.rows, b.cols, b.data.map((v) => v / a.data[0]) as Float64Array);
  if (a.rows !== b.rows) throw new MatError(`\\: row dimensions must agree (${a.rows} vs ${b.rows})`);
  if (a.rows === a.cols) return squareSolve(a, b);
  // Rectangular systems use QR with column pivoting. This avoids normal equations
  // for tall least-squares problems and gives MATLAB-like basic solutions for
  // rank-deficient or underdetermined systems.
  return qrPivotSolve(a, b).x;
}

function cloneMat(A: Mat): Mat {
  return { ...A, data: Float64Array.from(A.data), idata: A.idata ? Float64Array.from(A.idata) : undefined };
}

function decompositionPlan(A: Mat, requested?: string): MldividePlan {
  const kind = (requested ?? 'auto').toLowerCase();
  if (kind === 'auto') return mldividePlan(A);
  if (kind === 'lu') return 'lu';
  if (kind === 'qr') return 'qrcp';
  if (kind === 'chol' || kind === 'cholesky') return 'cholesky';
  if (kind === 'ldl') return 'ldl';
  if (kind === 'triangular') {
    const bw = bandwidth(A);
    if (bw.lower === 0 && bw.upper === 0) return isComplex(A) ? 'complex-diagonal' : 'diagonal';
    if (bw.lower === 0) return isComplex(A) ? 'complex-upper-triangular' : 'upper-triangular';
    if (bw.upper === 0) return isComplex(A) ? 'complex-lower-triangular' : 'lower-triangular';
    throw new MatError('decomposition: matrix is not triangular');
  }
  throw new MatError(`decomposition: unknown decomposition type '${requested}'`);
}

export function decomposition(A: Mat, requested?: string): ClassV {
  const plan = decompositionPlan(A, requested);
  const props = new Map<string, Mat | ReturnType<typeof str>>();
  props.set('Type', str(plan));
  props.set('MatrixSize', rowVec([A.rows, A.cols]));
  props.set('A', cloneMat(A));

  if (!isComplex(A)) {
    if (plan === 'cholesky') {
      props.set('R', chol(A));
    } else if (plan === 'ldl') {
      const { L, D, P } = ldl(A);
      props.set('L', L); props.set('D', D); props.set('P', P);
    } else if (plan === 'lu') {
      const { L, U, P } = luOutputs(A);
      props.set('L', L); props.set('U', U); props.set('P', P);
    } else if (plan === 'qrcp') {
      const { Q, R, E } = qrPivotOutputs(A);
      props.set('Q', Q); props.set('R', R); props.set('E', E);
    }
  }

  return makeObject('decomposition', props, 1, 1);
}

function decompMat(D: ClassV, name: string): Mat {
  const v = D.props.get(name);
  if (!v || v.kind !== 'num') throw new MatError(`decomposition: missing ${name} factor`);
  return v;
}

function decompType(D: ClassV): string {
  const v = decompMat(D, 'Type');
  return String.fromCharCode(...Array.from(v.data));
}

function qrcpFactorSolve(Q: Mat, R: Mat, E: Mat, B: Mat): Mat {
  const m = Q.rows, n = R.cols;
  const maxDiag = Math.max(0, ...Array.from({ length: Math.min(R.rows, R.cols) }, (_, i) => Math.abs(R.data[i + i * R.rows])));
  const tol = Math.max(m, n) * 2.220446049250313e-16 * maxDiag;
  let rank = 0;
  for (let i = 0; i < Math.min(R.rows, R.cols); i++) if (Math.abs(R.data[i + i * R.rows]) > tol) rank++;

  const z = zeros(n, B.cols);
  if (rank > 0) {
    const rhs = zeros(rank, B.cols);
    for (let col = 0; col < B.cols; col++) {
      for (let r = 0; r < rank; r++) {
        let s = 0;
        for (let k = 0; k < Q.rows; k++) s += Q.data[k + r * Q.rows] * B.data[k + col * B.rows];
        rhs.data[r + col * rank] = s;
      }
    }
    const R11 = zeros(rank, rank);
    for (let c = 0; c < rank; c++) for (let r = 0; r <= c; r++) R11.data[r + c * rank] = R.data[r + c * R.rows];
    const y = upperTriSolve(R11, rhs);
    for (let col = 0; col < B.cols; col++) for (let r = 0; r < rank; r++) z.data[r + col * z.rows] = y.data[r + col * y.rows];
  }
  return matmul(E, z);
}

export function decompositionSolve(D: ClassV, B: Mat): Mat {
  if (D.className !== 'decomposition') throw new MatError('mldivide: expected decomposition object');
  const type = decompType(D);
  if (type === 'cholesky') {
    const R = decompMat(D, 'R');
    return upperTriSolve(R, lowerTriSolve(ctranspose(R), B));
  }
  if (type === 'ldl') {
    const L = decompMat(D, 'L'), M = decompMat(D, 'D'), P = decompMat(D, 'P');
    const pb = matmul(P, B);
    const y = lowerTriSolve(L, pb);
    const z = mldivide(M, y);
    return matmul(ctranspose(P), upperTriSolve(ctranspose(L), z));
  }
  if (type === 'lu') {
    const L = decompMat(D, 'L'), U = decompMat(D, 'U'), P = decompMat(D, 'P');
    return upperTriSolve(U, lowerTriSolve(L, matmul(P, B)));
  }
  if (type === 'qrcp') return qrcpFactorSolve(decompMat(D, 'Q'), decompMat(D, 'R'), decompMat(D, 'E'), B);
  return mldivide(decompMat(D, 'A'), B);
}

export function decompositionRightSolve(B: Mat, D: ClassV): Mat {
  return ctranspose(decompositionSolve(decomposition(ctranspose(decompMat(D, 'A')), decompType(D)), ctranspose(B)));
}

export interface LinsolveOptions {
  LT?: boolean;
  UT?: boolean;
  UHESS?: boolean;
  SYM?: boolean;
  POSDEF?: boolean;
  RECT?: boolean;
  TRANSA?: boolean;
}

export function linsolveWithOptions(A0: Mat, B: Mat, opts: LinsolveOptions): Mat {
  const A = opts.TRANSA ? ctranspose(A0) : A0;
  if (A.rows !== B.rows) throw new MatError(`linsolve: row dimensions must agree (${A.rows} vs ${B.rows})`);
  if (isComplex(A) || isComplex(B)) {
    if (opts.LT && !opts.UT) return cLowerTriSolve(A, B);
    if (opts.UT && !opts.LT) return cUpperTriSolve(A, B);
    if (opts.LT && opts.UT) return cDiagonalSolve(A, B);
    return mldivide(A, B);
  }
  if (isScalar(A)) return mldivide(A, B);
  if (opts.LT && opts.UT) return diagonalSolve(A, B);
  if (opts.LT) return lowerTriSolve(A, B);
  if (opts.UT) return upperTriSolve(A, B);
  if (opts.POSDEF) return choleskySolve(A, B);
  if (opts.SYM) {
    try { return ldlSolve(A, B); } catch {
      return luSolve(A, B);
    }
  }
  if (opts.UHESS && A.rows === A.cols) return bandedSolve(A, B, { lower: 1, upper: A.cols - 1 });
  return mldivide(A, B);
}

// ── Complex LU (partial pivoting), solve, determinant ──────────────────
function cFactor(a: Mat): { re: Float64Array; im: Float64Array; piv: number[]; sign: number; n: number } {
  const n = a.rows; if (a.cols !== n) throw new MatError('matrix must be square');
  const re = Float64Array.from(a.data); const im = a.idata ? Float64Array.from(a.idata) : new Float64Array(n * n);
  const piv = Array.from({ length: n }, (_, i) => i); let sign = 1;
  const mag = (r: number, c: number) => Math.hypot(re[r + c * n], im[r + c * n]);
  for (let k = 0; k < n; k++) {
    let p = k, mx = mag(k, k); for (let r = k + 1; r < n; r++) { const v = mag(r, k); if (v > mx) { mx = v; p = r; } }
    if (p !== k) { for (let c = 0; c < n; c++) { let t = re[k + c * n]; re[k + c * n] = re[p + c * n]; re[p + c * n] = t; t = im[k + c * n]; im[k + c * n] = im[p + c * n]; im[p + c * n] = t; } const tp = piv[k]; piv[k] = piv[p]; piv[p] = tp; sign = -sign; }
    const dr = re[k + k * n], di = im[k + k * n];
    if (dr === 0 && di === 0) continue;
    for (let r = k + 1; r < n; r++) {
      const [fr, fi] = cdiv(re[r + k * n], im[r + k * n], dr, di);
      re[r + k * n] = fr; im[r + k * n] = fi;
      for (let c = k + 1; c < n; c++) { const [pr, pi] = cmul(fr, fi, re[k + c * n], im[k + c * n]); re[r + c * n] -= pr; im[r + c * n] -= pi; }
    }
  }
  return { re, im, piv, sign, n };
}

export function cLuSolve(a: Mat, b: Mat): Mat {
  const { re, im, piv, n } = cFactor(a);
  const m = b.cols; const Xre = new Float64Array(n * m), Xim = new Float64Array(n * m);
  const bim = (r: number, c: number) => (b.idata ? b.idata[r + c * b.rows] : 0);
  for (let col = 0; col < m; col++) {
    const yr = new Float64Array(n), yi = new Float64Array(n);
    for (let r = 0; r < n; r++) { yr[r] = b.data[piv[r] + col * b.rows]; yi[r] = bim(piv[r], col); }
    for (let r = 0; r < n; r++) { let sr = yr[r], si = yi[r]; for (let c = 0; c < r; c++) { const [pr, pi] = cmul(re[r + c * n], im[r + c * n], yr[c], yi[c]); sr -= pr; si -= pi; } yr[r] = sr; yi[r] = si; }
    for (let r = n - 1; r >= 0; r--) { let sr = yr[r], si = yi[r]; for (let c = r + 1; c < n; c++) { const [pr, pi] = cmul(re[r + c * n], im[r + c * n], yr[c], yi[c]); sr -= pr; si -= pi; } const [zr, zi] = cdiv(sr, si, re[r + r * n], im[r + r * n]); yr[r] = zr; yi[r] = zi; }
    for (let r = 0; r < n; r++) { Xre[r + col * n] = yr[r]; Xim[r + col * n] = yi[r]; }
  }
  return finishComplex(n, m, Xre, Xim);
}

/** Determinant of a complex matrix → [re, im]. */
export function cDet(a: Mat): [number, number] {
  const { re, im, sign, n } = cFactor(a);
  let dr = sign, di = 0;
  for (let k = 0; k < n; k++) { const [zr, zi] = cmul(dr, di, re[k + k * n], im[k + k * n]); dr = zr; di = zi; }
  return [dr, di];
}

// ── Polynomial roots (Durand–Kerner) and general eigenvalues ───────────
/** All roots of a real-coefficient polynomial (high→low), complex-valued. */
export function durandKerner(coefIn: number[]): { re: number[]; im: number[] } {
  let c = coefIn.slice(); while (c.length > 1 && c[0] === 0) c.shift();
  const n = c.length - 1; if (n <= 0) return { re: [], im: [] };
  const mc = c.map((v) => v / c[0]); // monic, high→low
  const zr = new Array<number>(n), zi = new Array<number>(n);
  for (let k = 0; k < n; k++) { let pr = 1, pi = 0; for (let t = 0; t < k; t++) { const [a, b] = cmul(pr, pi, 0.4, 0.9); pr = a; pi = b; } zr[k] = pr; zi[k] = pi; }
  const pev = (x: number, y: number): [number, number] => { let sr = mc[0], si = 0; for (let k = 1; k < mc.length; k++) { const [tr, ti] = cmul(sr, si, x, y); sr = tr + mc[k]; si = ti; } return [sr, si]; };
  for (let iter = 0; iter < 500; iter++) {
    let maxd = 0;
    for (let k = 0; k < n; k++) {
      const [pr, pi] = pev(zr[k], zi[k]);
      let dr = 1, di = 0;
      for (let j = 0; j < n; j++) { if (j === k) continue; const [qr, qi] = cmul(dr, di, zr[k] - zr[j], zi[k] - zi[j]); dr = qr; di = qi; }
      if (dr === 0 && di === 0) continue;
      const [er, ei] = cdiv(pr, pi, dr, di);
      zr[k] -= er; zi[k] -= ei; maxd = Math.max(maxd, Math.hypot(er, ei));
    }
    if (maxd < 1e-14) break;
  }
  for (let k = 0; k < n; k++) if (Math.abs(zi[k]) < 1e-9 * (1 + Math.abs(zr[k]))) zi[k] = 0;
  return { re: zr, im: zi };
}

/** Characteristic polynomial (monic, high→low) via Faddeev–LeVerrier (real A). */
export function charpoly(A: Mat): number[] {
  const n = A.rows; const c = [1]; let M = eye(n);
  for (let k = 1; k <= n; k++) {
    const AM = matmul(A, M);
    let tr = 0; for (let i = 0; i < n; i++) tr += AM.data[i + i * n];
    const ck = -tr / k; c.push(ck);
    M = mat(n, n, Float64Array.from(AM.data)); for (let i = 0; i < n; i++) M.data[i + i * n] += ck;
  }
  return c;
}

/** Eigenvector for eigenvalue (lr,li) by complex inverse iteration. */
function eigVec(A: Mat, lr: number, li: number): { re: number[]; im: number[] } {
  const n = A.rows;
  const Mre = Float64Array.from(A.data); const Mim = A.idata ? Float64Array.from(A.idata) : new Float64Array(n * n);
  const pr = lr + 1e-8 * (Math.abs(lr) + 1), pi = li + 1e-8 * (Math.abs(li) + 1); // perturb off the exact eigenvalue
  for (let i = 0; i < n; i++) { Mre[i + i * n] -= pr; Mim[i + i * n] -= pi; }
  const M: Mat = { kind: 'num', rows: n, cols: n, data: Mre, idata: Mim };
  let vr = new Array<number>(n).fill(1), vi = new Array<number>(n).fill(0);
  for (let it = 0; it < 50; it++) {
    const x = cLuSolve(M, { kind: 'num', rows: n, cols: 1, data: Float64Array.from(vr), idata: Float64Array.from(vi) });
    let nrm = 0; for (let i = 0; i < n; i++) nrm += x.data[i] ** 2 + (x.idata ? x.idata[i] ** 2 : 0); nrm = Math.sqrt(nrm) || 1;
    for (let i = 0; i < n; i++) { vr[i] = x.data[i] / nrm; vi[i] = (x.idata ? x.idata[i] : 0) / nrm; }
  }
  return { re: vr, im: vi };
}

// ── More decompositions / matrix functions ────────────────────────────
/** Upper Hessenberg form via Householder: P' A P = H. */
export function hess(A: Mat): { P: Mat; H: Mat } {
  const n = A.rows; const H = mat(n, n, Float64Array.from(A.data)); const P = eye(n);
  for (let k = 0; k < n - 2; k++) {
    let alpha = 0; for (let i = k + 1; i < n; i++) alpha += H.data[i + k * n] ** 2; alpha = Math.sqrt(alpha) * (H.data[(k + 1) + k * n] >= 0 ? -1 : 1);
    if (alpha === 0) continue;
    const v = new Float64Array(n); v[k + 1] = H.data[(k + 1) + k * n] - alpha; for (let i = k + 2; i < n; i++) v[i] = H.data[i + k * n];
    let vn = 0; for (let i = k + 1; i < n; i++) vn += v[i] ** 2; if (vn === 0) continue;
    for (let c = 0; c < n; c++) { let d = 0; for (let i = k + 1; i < n; i++) d += v[i] * H.data[i + c * n]; d = (2 * d) / vn; for (let i = k + 1; i < n; i++) H.data[i + c * n] -= d * v[i]; }
    for (let r = 0; r < n; r++) { let d = 0; for (let i = k + 1; i < n; i++) d += H.data[r + i * n] * v[i]; d = (2 * d) / vn; for (let i = k + 1; i < n; i++) H.data[r + i * n] -= d * v[i]; }
    for (let r = 0; r < n; r++) { let d = 0; for (let i = k + 1; i < n; i++) d += P.data[r + i * n] * v[i]; d = (2 * d) / vn; for (let i = k + 1; i < n; i++) P.data[r + i * n] -= d * v[i]; }
  }
  return { P, H };
}

/** Similarity rotation in the (i,i+1) plane: T ← Gᵀ T G, U ← U G, with G=[[cs,-sn],[sn,cs]]. */
function planeRot(T: Mat, U: Mat, n: number, i: number, cs: number, sn: number): void {
  for (let j = 0; j < n; j++) { const a = T.data[i + j * n], b = T.data[(i + 1) + j * n]; T.data[i + j * n] = cs * a + sn * b; T.data[(i + 1) + j * n] = -sn * a + cs * b; }
  for (let r = 0; r < n; r++) { const a = T.data[r + i * n], b = T.data[r + (i + 1) * n]; T.data[r + i * n] = cs * a + sn * b; T.data[r + (i + 1) * n] = -sn * a + cs * b; }
  for (let r = 0; r < n; r++) { const a = U.data[r + i * n], b = U.data[r + (i + 1) * n]; U.data[r + i * n] = cs * a + sn * b; U.data[r + (i + 1) * n] = -sn * a + cs * b; }
}

/** Real Schur form via Francis double-shift QR with deflation: U' A U = T (quasi-upper-triangular). */
export function schur(A: Mat): { U: Mat; T: Mat } {
  const n = A.rows;
  const { P, H } = hess(A);
  const T = mat(n, n, Float64Array.from(H.data));
  let U = mat(n, n, Float64Array.from(P.data));
  if (n <= 1) return { U, T };
  const g = (i: number, j: number) => T.data[i + j * n];
  let hi = n - 1, guard = 0;
  while (hi > 0) {
    if (guard++ > 120 * n) break;
    // Find top `l` of the trailing unreduced block, zeroing negligible subdiagonals.
    let l = hi;
    while (l > 0) { const s = Math.abs(g(l - 1, l - 1)) + Math.abs(g(l, l)); if (Math.abs(g(l, l - 1)) <= 1e-14 * (s || 1)) { T.data[l + (l - 1) * n] = 0; break; } l--; }
    if (l === hi) { hi -= 1; continue; }          // 1×1 block converged
    if (l === hi - 1) { hi -= 2; continue; }       // 2×2 block converged (kept for now)
    // Explicit double shift from the trailing 2×2 of the active window [0..hi].
    const a = g(hi - 1, hi - 1), b = g(hi - 1, hi), c = g(hi, hi - 1), d = g(hi, hi);
    const s = a + d, det = a * d - b * c;          // trace & determinant → shifts
    const mwin = hi + 1;
    const Tw = mat(mwin, mwin, new Float64Array(mwin * mwin));
    for (let j = 0; j < mwin; j++) for (let i = 0; i < mwin; i++) Tw.data[i + j * mwin] = g(i, j);
    const Tw2 = matmul(Tw, Tw);
    const M = mat(mwin, mwin, new Float64Array(mwin * mwin));
    for (let j = 0; j < mwin; j++) for (let i = 0; i < mwin; i++) M.data[i + j * mwin] = Tw2.data[i + j * mwin] - s * Tw.data[i + j * mwin] + (i === j ? det : 0);
    const { Q } = qr(M);
    const Qf = eye(n);
    for (let j = 0; j < mwin; j++) for (let i = 0; i < mwin; i++) Qf.data[i + j * n] = Q.data[i + j * mwin];
    const Tn = matmul(matmul(transpose(Qf), T), Qf);
    T.data.set(Tn.data);
    U = matmul(U, Qf);
  }
  // Standardize: triangularize any 2×2 block that actually has real eigenvalues.
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(g(i + 1, i)) < 1e-300) continue;
    const a = g(i, i), b = g(i, i + 1), c = g(i + 1, i), d = g(i + 1, i + 1);
    const disc = (a + d) * (a + d) - 4 * (a * d - b * c);
    if (disc < 0) continue;                        // genuine complex pair → leave as 2×2
    const lam = ((a + d) + Math.sign((a + d) || 1) * Math.sqrt(disc)) / 2;
    let v1 = b, v2 = lam - a; if (Math.abs(v1) + Math.abs(v2) < 1e-300) { v1 = lam - d; v2 = c; }
    const nrm = Math.hypot(v1, v2) || 1;
    planeRot(T, U, n, i, v1 / nrm, v2 / nrm);
    T.data[(i + 1) + i * n] = 0;
  }
  return { U, T };
}

/** Eigenvalues read off a real Schur form T (1×1 and 2×2 diagonal blocks). */
export function schurEig(T: Mat): { re: number[]; im: number[] } {
  const n = T.rows; const re: number[] = [], im: number[] = [];
  for (let i = 0; i < n; ) {
    if (i < n - 1 && Math.abs(T.data[(i + 1) + i * n]) > 1e-300) {
      const a = T.data[i + i * n], b = T.data[i + (i + 1) * n], c = T.data[(i + 1) + i * n], d = T.data[(i + 1) + (i + 1) * n];
      const tr = a + d, disc = tr * tr - 4 * (a * d - b * c);
      if (disc >= 0) { const r = Math.sqrt(disc); re.push((tr + r) / 2, (tr - r) / 2); im.push(0, 0); }   // unreduced 2×2 with real eigenvalues
      else { const s = Math.sqrt(-disc) / 2; re.push(tr / 2, tr / 2); im.push(s, -s); }
      i += 2;
    } else { re.push(T.data[i + i * n]); im.push(0); i += 1; }
  }
  return { re, im };
}

/** Parlett–Reinsch balancing: D⁻¹AD has comparable row/column norms (D diagonal, powers of 2). */
/** Parlett-Reinsch balancing with optional ILO/IHI permutation isolation.
 *  Returns scaling vector D (powers of 2), row/col permutation perm, and balanced B where
 *  diag(D)·P·B·Pᵀ·diag(1/D) = A  (P = permutation matrix from perm). */
export function balanceFull(A: Mat, noperm = false): { D: number[]; perm: number[]; B: Mat } {
  const n = A.rows;
  const Br = Float64Array.from(A.data), Bi = A.idata ? Float64Array.from(A.idata) : null;
  const D = new Array<number>(n).fill(1);
  const perm = Array.from({ length: n }, (_, i) => i);
  const aij = (r: number, c: number) => Math.hypot(Br[r + c * n], Bi ? Bi[r + c * n] : 0);
  const swapRC = (a: number, b: number) => {
    if (a === b) return;
    for (let k = 0; k < n; k++) {
      let t = Br[a + k * n]; Br[a + k * n] = Br[b + k * n]; Br[b + k * n] = t;
      if (Bi) { t = Bi[a + k * n]; Bi[a + k * n] = Bi[b + k * n]; Bi[b + k * n] = t; }
    }
    for (let k = 0; k < n; k++) {
      let t = Br[k + a * n]; Br[k + a * n] = Br[k + b * n]; Br[k + b * n] = t;
      if (Bi) { t = Bi[k + a * n]; Bi[k + a * n] = Bi[k + b * n]; Bi[k + b * n] = t; }
    }
    const tp = perm[a]; perm[a] = perm[b]; perm[b] = tp;
  };
  // ── Phase 1: permute isolated rows/columns to borders (skipped when 'noperm') ──
  let ilo = 0, ihi = n - 1;
  if (!noperm) {
    // rows with zero off-diagonal column norm → move to top
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = ilo; i <= ihi; i++) {
        let colNorm = 0; for (let r = ilo; r <= ihi; r++) if (r !== i) colNorm += aij(r, i);
        if (colNorm === 0) { swapRC(ilo, i); D[ilo] = 1; ilo++; changed = true; break; }
      }
    }
    // cols with zero off-diagonal row norm → move to bottom
    changed = true;
    while (changed) {
      changed = false;
      for (let i = ilo; i <= ihi; i++) {
        let rowNorm = 0; for (let c = ilo; c <= ihi; c++) if (c !== i) rowNorm += aij(i, c);
        if (rowNorm === 0) { swapRC(ihi, i); D[ihi] = 1; ihi--; changed = true; break; }
      }
    }
  }
  // ── Phase 2: diagonal scaling on the [ilo..ihi] subproblem ──
  const RAD = 2, RAD2 = 4;
  let done = false, guard = 0;
  while (!done && guard++ < 1000) {
    done = true;
    for (let i = ilo; i <= ihi; i++) {
      let c = 0, r = 0;
      for (let j = ilo; j <= ihi; j++) if (j !== i) { c += aij(j, i); r += aij(i, j); }
      if (c === 0 || r === 0) continue;
      let f = 1, cc = c; const sBefore = c + r;
      let gg = r / RAD; while (cc < gg) { f *= RAD; cc *= RAD2; }
      gg = r * RAD; while (cc >= gg) { f /= RAD; cc /= RAD2; }
      if ((cc + r) < 0.95 * sBefore) {
        done = false; D[perm[i]] *= f; const gi = 1 / f;
        for (let j = 0; j < n; j++) { Br[i + j * n] *= gi; if (Bi) Bi[i + j * n] *= gi; }
        for (let j = 0; j < n; j++) { Br[j + i * n] *= f; if (Bi) Bi[j + i * n] *= f; }
      }
    }
  }
  const B = Bi ? finishComplex(n, n, Br, Bi) : mat(n, n, Br);
  return { D, perm, B };
}

export function balance(A: Mat): { D: number[]; B: Mat } {
  const { D, B } = balanceFull(A);
  return { D, B };
}

/** Convert a real Schur pair (U,T) to complex Schur form (upper-triangular T). */
export function rsf2csf(U0: Mat, T0: Mat): { U: Mat; T: Mat } {
  const n = T0.rows;
  const Tr = Float64Array.from(T0.data), Ti = new Float64Array(n * n);
  const Ur = Float64Array.from(U0.data), Ui = new Float64Array(n * n);
  const gT = (a: Float64Array, i: number, j: number) => a[i + j * n];
  for (let mm = n - 1; mm >= 1; mm--) {
    if (Math.abs(Tr[mm + (mm - 1) * n]) < 1e-300) continue;
    // Eigenvalue μ of the trailing 2×2 block, minus T(mm,mm).
    const a = gT(Tr, mm - 1, mm - 1), b = gT(Tr, mm - 1, mm), c = gT(Tr, mm, mm - 1), d = gT(Tr, mm, mm);
    const tr = a + d, disc = tr * tr - 4 * (a * d - b * c);
    const [sr, si] = csqrt(disc, 0);
    let mur = (tr + sr) / 2 - d, mui = si / 2; // μ = λ₁ − T(mm,mm)
    const rr = Math.hypot(Math.hypot(mur, mui), Tr[mm + (mm - 1) * n]) || 1;
    // rotation: cR = μ/r (conj used on the (1,1)/(1,2) side), sR = T(mm,mm-1)/r
    let cr = mur / rr, ci = mui / rr; const sn = Tr[mm + (mm - 1) * n] / rr;
    // Apply G = [[conj(c), s], [-s, c]] to rows (mm-1,mm), cols (mm-1..n-1):
    for (let j = mm - 1; j < n; j++) {
      const x0r = Tr[(mm - 1) + j * n], x0i = Ti[(mm - 1) + j * n], x1r = Tr[mm + j * n], x1i = Ti[mm + j * n];
      // row mm-1 = conj(c)*x0 + s*x1 ; row mm = -s*x0 + c*x1
      Tr[(mm - 1) + j * n] = cr * x0r + ci * x0i + sn * x1r; Ti[(mm - 1) + j * n] = cr * x0i - ci * x0r + sn * x1i;
      Tr[mm + j * n] = -sn * x0r + cr * x1r - ci * x1i; Ti[mm + j * n] = -sn * x0i + cr * x1i + ci * x1r;
    }
    // Apply Gᴴ to cols (mm-1,mm): col(mm-1) = c·y0 + s·y1 ; col(mm) = −s·y0 + conj(c)·y1.
    for (let r = 0; r <= mm; r++) {
      const y0r = Tr[r + (mm - 1) * n], y0i = Ti[r + (mm - 1) * n], y1r = Tr[r + mm * n], y1i = Ti[r + mm * n];
      Tr[r + (mm - 1) * n] = cr * y0r - ci * y0i + sn * y1r; Ti[r + (mm - 1) * n] = cr * y0i + ci * y0r + sn * y1i;
      Tr[r + mm * n] = -sn * y0r + cr * y1r + ci * y1i; Ti[r + mm * n] = -sn * y0i + cr * y1i - ci * y1r;
    }
    for (let r = 0; r < n; r++) {
      const y0r = Ur[r + (mm - 1) * n], y0i = Ui[r + (mm - 1) * n], y1r = Ur[r + mm * n], y1i = Ui[r + mm * n];
      Ur[r + (mm - 1) * n] = cr * y0r - ci * y0i + sn * y1r; Ui[r + (mm - 1) * n] = cr * y0i + ci * y0r + sn * y1i;
      Ur[r + mm * n] = -sn * y0r + cr * y1r + ci * y1i; Ui[r + mm * n] = -sn * y0i + cr * y1i - ci * y1r;
    }
    Tr[mm + (mm - 1) * n] = 0; Ti[mm + (mm - 1) * n] = 0;
    void cr; void ci;
  }
  return { U: finishComplex(n, n, Ur, Ui), T: finishComplex(n, n, Tr, Ti) };
}

/** Generalized (QZ) Schur for a regular pair with nonsingular B: Q A Z = AA, Q B Z = BB. */
/** Real QZ: produces quasi-triangular AA (2×2 blocks for complex pairs), upper triangular BB.
 *  Convention: Q·A·Z = AA, Q·B·Z = BB (MATLAB 'real' flag). */
export function qz(A: Mat, B: Mat): { AA: Mat; BB: Mat; Q: Mat; Z: Mat } {
  const M = mldivide(B, A);              // B⁻¹A (B must be nonsingular)
  const { U: Z, T: S } = schur(M);       // Z' M Z = S, Z orthogonal
  const BZ = matmul(B, Z);
  const { Q: Qb } = qr(BZ);             // BZ = Qb R → Qbᵀ B Z = R (upper triangular)
  const Qm = transpose(Qb);             // MATLAB's Q (so Q A Z = AA)
  const AA = matmul(Qm, matmul(A, Z));
  const BB = matmul(Qm, matmul(B, Z));
  return { AA, BB, Q: Qm, Z };
}

/** Complex QZ: both AA and BB upper triangular, eigenvalues on their diagonals.
 *  MATLAB default — uses complex Schur of B⁻¹A. Q·A·Z = AA, Q·B·Z = BB. */
export function qzComplex(A: Mat, B: Mat): { AA: Mat; BB: Mat; Q: Mat; Z: Mat } {
  const M = mldivide(B, A);
  const { Q: Z, T } = cSchur(M);        // complex Schur: Z'·M·Z = T (upper triangular)
  const BZ = isComplex(Z) ? cmatmul(B, Z) : matmul(B, Z);
  const { Q: Qb } = qr(BZ);
  const Qm = ctranspose(Qb);
  const AA = isComplex(Qm) || isComplex(Z) ? cmatmul(cmatmul(Qm, A), Z) : matmul(matmul(Qm, A), Z);
  const BB = isComplex(Qm) || isComplex(Z) ? cmatmul(cmatmul(Qm, B), Z) : matmul(matmul(Qm, B), Z);
  void T;
  return { AA, BB, Q: Qm, Z };
}

/** Back-substitute through upper-triangular (AA − λ·BB) to get right QZ eigenvectors.
 *  Returns matrix whose j-th column is the right eigenvector for eigenvalue diag(AA)[j]/diag(BB)[j],
 *  expressed in the Z basis. Multiply by Z to get vectors in the original space. */
export function qzRightVecs(AA: Mat, BB: Mat): Mat {
  const n = AA.rows;
  const Aar = AA.data, Aai = AA.idata, Bbr = BB.data, Bbai = BB.idata;
  const Yr = new Float64Array(n * n), Yi = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    // eigenvalue lambda_j = AA[j][j] / BB[j][j]
    const ajr = Aar[j + j * n], aji = Aai ? Aai[j + j * n] : 0;
    const bjr = Bbr[j + j * n], bji = Bbai ? Bbai[j + j * n] : 0;
    const [lmr, lmi] = cdiv(ajr, aji, bjr, bji);
    Yr[j + j * n] = 1;
    for (let i = j - 1; i >= 0; i--) {
      let sr = 0, si = 0;
      for (let k = i + 1; k <= j; k++) {
        const aar = Aar[i + k * n], aai2 = Aai ? Aai[i + k * n] : 0;
        const bbr = Bbr[i + k * n], bbi2 = Bbai ? Bbai[i + k * n] : 0;
        const [mr, mi2] = cmul(aar - lmr * bbr + lmi * bbi2, aai2 - lmr * bbi2 - lmi * bbr, Yr[k + j * n], Yi[k + j * n]);
        sr += mr; si += mi2;
      }
      const dr = Aar[i + i * n] - lmr * Bbr[i + i * n] + lmi * (Bbai ? Bbai[i + i * n] : 0);
      const di2 = (Aai ? Aai[i + i * n] : 0) - lmr * (Bbai ? Bbai[i + i * n] : 0) - lmi * Bbr[i + i * n];
      if (Math.hypot(dr, di2) < 1e-14) continue; // near-singular diagonal — leave as 0
      const [xr2, xi2] = cdiv(-sr, -si, dr, di2);
      Yr[i + j * n] = xr2; Yi[i + j * n] = xi2;
    }
    // normalize
    let nrm = 0; for (let r = 0; r <= j; r++) nrm += Yr[r + j * n] ** 2 + Yi[r + j * n] ** 2;
    nrm = Math.sqrt(nrm);
    if (nrm > 0) for (let r = 0; r <= j; r++) { Yr[r + j * n] /= nrm; Yi[r + j * n] /= nrm; }
  }
  return finishComplex(n, n, Yr, Yi);
}

/** Solve the small Sylvester equation B1 X − X B2 = C (block sizes ≤ 2). */
/** Solve small Sylvester equation B1·X − X·B2 = C. Complex-aware via Kronecker vectorisation. */
function sylvSmall(B1: Mat, B2: Mat, C: Mat): Mat {
  const p = B1.rows, q = B2.rows, pq = p * q;
  const cplx = !!(B1.idata || B2.idata || C.idata);
  const Kr = new Float64Array(pq * pq), Ki = cplx ? new Float64Array(pq * pq) : null;
  const rr = new Float64Array(pq), ri = cplx ? new Float64Array(pq) : null;
  for (let k = 0; k < q; k++) for (let i = 0; i < p; i++) {
    const row = i + k * p;
    rr[row] = C.data[i + k * p]; if (ri && C.idata) ri[row] = C.idata[i + k * p];
    for (let ii = 0; ii < p; ii++) { Kr[row + (ii + k * p) * pq] += B1.data[i + ii * p]; if (Ki && B1.idata) Ki[row + (ii + k * p) * pq] += B1.idata[i + ii * p]; }
    for (let kk = 0; kk < q; kk++) { Kr[row + (i + kk * p) * pq] -= B2.data[kk + k * q]; if (Ki && B2.idata) Ki[row + (i + kk * p) * pq] -= B2.idata[kk + k * q]; }
  }
  const K = cplx ? finishComplex(pq, pq, Kr, Ki!) : mat(pq, pq, Kr);
  const rhs = cplx ? finishComplex(pq, 1, rr, ri!) : mat(pq, 1, rr);
  const x = mldivide(K, rhs);
  const Xr = new Float64Array(p * q), Xi = cplx ? new Float64Array(p * q) : null;
  for (let k = 0; k < q; k++) for (let i = 0; i < p; i++) { Xr[i + k * p] = x.data[i + k * p]; if (Xi && x.idata) Xi[i + k * p] = x.idata[i + k * p]; }
  return cplx ? finishComplex(p, q, Xr, Xi!) : mat(p, q, Xr);
}

/** Swap the adjacent diagonal blocks at [j..j+p-1] (size p) and [j+p..] (size q) of a Schur form. */
function swapAdjacent(T: Mat, U: Mat, n: number, j: number, p: number, q: number): void {
  const s = p + q;
  const cplx = !!(T.idata || U.idata);
  const extractBlock = (r0: number, r1: number, c0: number, c1: number): Mat => {
    const rr = r1 - r0, cc = c1 - c0;
    const Br = new Float64Array(rr * cc), Bi = cplx ? new Float64Array(rr * cc) : null;
    for (let c = 0; c < cc; c++) for (let r = 0; r < rr; r++) {
      Br[r + c * rr] = T.data[(r0 + r) + (c0 + c) * n];
      if (Bi && T.idata) Bi[r + c * rr] = T.idata[(r0 + r) + (c0 + c) * n];
    }
    return cplx ? finishComplex(rr, cc, Br, Bi!) : mat(rr, cc, Br);
  };
  const B1 = extractBlock(j, j + p, j, j + p);
  const B2 = extractBlock(j + p, j + p + q, j + p, j + p + q);
  const C = extractBlock(j, j + p, j + p, j + p + q);
  const X = sylvSmall(B1, B2, C);        // B1·X − X·B2 = C  (complex sylvSmall if complex T)
  const Mblk = cplx ? finishComplex(s, q, new Float64Array(s * q), new Float64Array(s * q)) : zeros(s, q);
  for (let b = 0; b < q; b++) {
    for (let a = 0; a < p; a++) {
      Mblk.data[a + b * s] = -X.data[a + b * p];
      if (Mblk.idata && X.idata) Mblk.idata[a + b * s] = -X.idata[a + b * p];
    }
    Mblk.data[(p + b) + b * s] = 1;
  }
  const { Q } = qr(Mblk);               // complex-aware QR from qrComplexHouseholder path
  const QhT = cplx ? ctranspose(Q) : transpose(Q);
  const Qf = eye(n); const QfI = cplx ? new Float64Array(n * n) : null;
  if (QfI) Qf.idata = QfI;
  for (let b = 0; b < s; b++) for (let a = 0; a < s; a++) {
    Qf.data[(j + a) + (j + b) * n] = Q.data[a + b * s];
    if (QfI && Q.idata) QfI[(j + a) + (j + b) * n] = Q.idata[a + b * s];
  }
  // T := QhT · T · Q; U := U · Q
  const QhTf = cplx ? ctranspose(Qf) : transpose(Qf);
  const Tn = cplx ? cmatmul(cmatmul(QhTf, T), Qf) : matmul(matmul(QhTf, T), Qf);
  T.data.set(Tn.data); if (cplx && Tn.idata) { if (!T.idata) T.idata = new Float64Array(n * n); T.idata.set(Tn.idata); }
  const Un = cplx ? cmatmul(U, Qf) : matmul(U, Qf);
  U.data.set(Un.data); if (cplx && Un.idata) { if (!U.idata) U.idata = new Float64Array(n * n); U.idata.set(Un.idata); }
}

/** Reorder a Schur form (real quasi-triangular or complex upper triangular) so that selected
 *  eigenvalues move to the top-left. Works for both real and complex T/U. */
export function ordschur(U0: Mat, T0: Mat, sel: boolean[]): { U: Mat; T: Mat } {
  const n = T0.rows;
  const cplx = !!(T0.idata || U0.idata);
  const Tr = Float64Array.from(T0.data), Ti = cplx ? (T0.idata ? Float64Array.from(T0.idata) : new Float64Array(n * n)) : undefined;
  const T = cplx ? finishComplex(n, n, Tr, Ti!) : mat(n, n, Tr);
  const Ur = Float64Array.from(U0.data), Ui = cplx ? (U0.idata ? Float64Array.from(U0.idata) : new Float64Array(n * n)) : undefined;
  const U = cplx ? finishComplex(n, n, Ur, Ui!) : mat(n, n, Ur);
  const s = sel.slice();
  // For real T: block is 2×2 if non-zero subdiagonal; for complex T: always 1×1.
  const blockAt = (start: number) => (!cplx && start < n - 1 && Math.abs(T.data[(start + 1) + start * n]) > 1e-300 ? 2 : 1);
  // Bubble-sort: repeatedly scan from left, moving any selected block left past unselected blocks.
  for (let pass = 0; pass < n * n; pass++) {
    let swapped = false;
    let pos = 0;
    while (pos < n) {
      const sz = blockAt(pos);
      const next = pos + sz;
      if (next >= n) break;
      const szN = blockAt(next);
      const selHere = s[pos] || (sz === 2 && s[pos + 1]);
      const selNext = s[next] || (szN === 2 && s[next + 1]);
      if (!selHere && selNext) {
        swapAdjacent(T, U, n, pos, sz, szN);
        // track which sel entries moved: next block swapped to pos, pos block shifted right
        const tmp = s.slice(pos, pos + sz);
        for (let k = 0; k < szN; k++) s[pos + k] = s[next + k];
        for (let k = 0; k < sz; k++) s[pos + szN + k] = tmp[k];
        swapped = true;
        // don't advance pos: the newly promoted block might need to bubble further left
      } else pos += sz;
    }
    if (!swapped) break;
  }
  return { U, T };
}

/** Reorder a real generalized Schur form (AA quasi-triangular, BB upper-triangular)
 *  so selected eigenvalues move to the top-left, updating Q,Z (Q·A·Z=AA, Q·B·Z=BB).
 *  Handles adjacent 1×1 blocks (real generalized eigenvalues); 2×2 (complex-pair)
 *  blocks are left in place. `sel[i]` selects generalized eigenvalue i. */
export function ordqz(AA0: Mat, BB0: Mat, Q0: Mat, Z0: Mat, sel: boolean[]): { AA: Mat; BB: Mat; Q: Mat; Z: Mat } {
  const n = AA0.rows;
  const AA = mat(n, n, Float64Array.from(AA0.data)), BB = mat(n, n, Float64Array.from(BB0.data));
  const Q = mat(n, n, Float64Array.from(Q0.data)), Z = mat(n, n, Float64Array.from(Z0.data));
  const A = AA.data, B = BB.data, Qd = Q.data, Zd = Z.data; const s = sel.slice();
  const colRot = (M: Float64Array, j: number, c: number, sn: number) => { for (let i = 0; i < n; i++) { const t = M[i + j * n], u = M[i + (j + 1) * n]; M[i + j * n] = c * t + sn * u; M[i + (j + 1) * n] = -sn * t + c * u; } };
  const rowRot = (M: Float64Array, j: number, c: number, sn: number) => { for (let k = 0; k < n; k++) { const t = M[j + k * n], u = M[(j + 1) + k * n]; M[j + k * n] = c * t + sn * u; M[(j + 1) + k * n] = -sn * t + c * u; } };
  const is2x2 = (j: number) => j < n - 1 && Math.abs(A[(j + 1) + j * n]) > 1e-300;
  // Swap adjacent 1×1 generalized eigenvalues at j, j+1 (move λ_{j+1} to position j).
  const swap = (j: number) => {
    const a11 = A[j + j * n], a12 = A[j + (j + 1) * n], a22 = A[(j + 1) + (j + 1) * n];
    const b11 = B[j + j * n], b12 = B[j + (j + 1) * n], b22 = B[(j + 1) + (j + 1) * n];
    // right rotation aligning the first column with the λ2-eigenvector of the 2×2 pencil
    let v1: number, v2: number;
    if (Math.abs(b22) > 1e-300) { const l2 = a22 / b22; v1 = -(a12 - l2 * b12); v2 = a11 - l2 * b11; }
    else { v1 = -b12; v2 = b11; }                 // λ2 = ∞
    let r = Math.hypot(v1, v2) || 1; const cz = v1 / r, sz = v2 / r;
    colRot(A, j, cz, sz); colRot(B, j, cz, sz); colRot(Zd, j, cz, sz);
    // left rotation restoring upper-triangular BB (zero its (j+1,j) entry)
    const bj = B[j + j * n], bj1 = B[(j + 1) + j * n]; r = Math.hypot(bj, bj1) || 1; const cq = bj / r, sq = bj1 / r;
    rowRot(A, j, cq, sq); rowRot(B, j, cq, sq); rowRot(Qd, j, cq, sq);
    B[(j + 1) + j * n] = 0; A[(j + 1) + j * n] = 0;
  };
  for (let pass = 0; pass < n * n; pass++) {
    let moved = false;
    for (let j = 0; j + 1 < n; j++) {
      if (is2x2(j) || is2x2(j + 1)) continue;      // skip complex-pair blocks
      if (!s[j] && s[j + 1]) { swap(j); const tmp = s[j]; s[j] = s[j + 1]; s[j + 1] = tmp; moved = true; }
    }
    if (!moved) break;
  }
  return { AA, BB, Q, Z };
}

// ── Integer matrix normal forms (Hermite / Smith) ────────────────────────
const idMat = (n: number): number[][] => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
const matToRows = (A: Mat): number[][] => Array.from({ length: A.rows }, (_, i) => Array.from({ length: A.cols }, (_, j) => A.data[i + j * A.rows]));
const rowsToMat = (R: number[][]): Mat => { const m = R.length, n = R[0]?.length ?? 0; const o = zeros(m, n); for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) o.data[i + j * m] = R[i][j]; return o; };
function assertInt(R: number[][], who: string): void { for (const row of R) for (const v of row) if (Math.abs(v - Math.round(v)) > 1e-9) throw new MatError(`${who}: integer matrix required`); }
/** Hermite normal form by column operations: A·V = H, V unimodular, H lower-triangular. */
export function hermiteFormInt(A: Mat): { H: Mat; U: Mat } {
  // Row-style Hermite normal form (MATLAB convention): H = U·A with U unimodular (m×m), H upper
  // triangular, positive pivots, and each entry above a pivot reduced modulo that pivot.
  const R = matToRows(A); assertInt(R, 'hermiteForm'); R.forEach((row) => row.forEach((_, j) => (row[j] = Math.round(row[j]))));
  const m = R.length, n = R[0]?.length ?? 0; const H = R.map((r) => r.slice()); const U = idMat(m);
  const swapRow = (a: number, b: number) => { [H[a], H[b]] = [H[b], H[a]]; [U[a], U[b]] = [U[b], U[a]]; };
  const addRow = (dst: number, src: number, k: number) => { for (let j = 0; j < n; j++) H[dst][j] += k * H[src][j]; for (let j = 0; j < m; j++) U[dst][j] += k * U[src][j]; };
  const negRow = (a: number) => { for (let j = 0; j < n; j++) H[a][j] = -H[a][j]; for (let j = 0; j < m; j++) U[a][j] = -U[a][j]; };
  let pr = 0;
  for (let c = 0; c < n && pr < m; c++) {
    let guard = 0;
    for (; ;) {
      const nz = []; for (let r = pr; r < m; r++) if (H[r][c] !== 0) nz.push(r);
      if (!nz.length) break;
      let piv = nz[0]; for (const r of nz) if (Math.abs(H[r][c]) < Math.abs(H[piv][c])) piv = r;
      if (piv !== pr) swapRow(piv, pr);
      let done = true; for (let r = pr + 1; r < m; r++) if (H[r][c] !== 0) { addRow(r, pr, -Math.round(H[r][c] / H[pr][c])); if (H[r][c] !== 0) done = false; }
      if (done) break; if (++guard > 1000) break;
    }
    if (pr < m && H[pr][c] !== 0) { if (H[pr][c] < 0) negRow(pr); for (let r = 0; r < pr; r++) { const q = Math.round(H[r][c] / H[pr][c]); if (q) addRow(r, pr, -q); } pr++; }
  }
  return { H: rowsToMat(H), U: rowsToMat(U) };
}
/** Smith normal form: U·A·V = S, U,V unimodular, S diagonal with s₁|s₂|… */
export function smithFormInt(A: Mat): { U: Mat; S: Mat; V: Mat } {
  const R = matToRows(A); assertInt(R, 'smithForm'); R.forEach((row) => row.forEach((_, j) => (row[j] = Math.round(row[j]))));
  const m = R.length, n = R[0].length; const S = R.map((r) => r.slice()); const U = idMat(m), V = idMat(n);
  const swapRow = (a: number, b: number) => { [S[a], S[b]] = [S[b], S[a]]; [U[a], U[b]] = [U[b], U[a]]; };
  const addRow = (d: number, s: number, k: number) => { for (let j = 0; j < n; j++) S[d][j] += k * S[s][j]; for (let j = 0; j < m; j++) U[d][j] += k * U[s][j]; };
  const negRow = (a: number) => { for (let j = 0; j < n; j++) S[a][j] = -S[a][j]; for (let j = 0; j < m; j++) U[a][j] = -U[a][j]; };
  const swapCol = (a: number, b: number) => { for (let i = 0; i < m; i++) [S[i][a], S[i][b]] = [S[i][b], S[i][a]]; for (let i = 0; i < n; i++) [V[i][a], V[i][b]] = [V[i][b], V[i][a]]; };
  const addCol = (d: number, s: number, k: number) => { for (let i = 0; i < m; i++) S[i][d] += k * S[i][s]; for (let i = 0; i < n; i++) V[i][d] += k * V[i][s]; };
  const negCol = (a: number) => { for (let i = 0; i < m; i++) S[i][a] = -S[i][a]; for (let i = 0; i < n; i++) V[i][a] = -V[i][a]; };
  for (let t = 0; t < Math.min(m, n); t++) {
    let guard = 0;
    for (; ;) {
      // bring the smallest nonzero |entry| of the trailing submatrix to (t,t)
      let pi = -1, pj = -1, best = Infinity;
      for (let i = t; i < m; i++) for (let j = t; j < n; j++) if (S[i][j] !== 0 && Math.abs(S[i][j]) < best) { best = Math.abs(S[i][j]); pi = i; pj = j; }
      if (pi < 0) break;
      if (pi !== t) swapRow(pi, t); if (pj !== t) swapCol(pj, t);
      let changed = false;
      for (let i = t + 1; i < m; i++) if (S[i][t] !== 0) { addRow(i, t, -Math.round(S[i][t] / S[t][t])); if (S[i][t] !== 0) changed = true; }
      for (let j = t + 1; j < n; j++) if (S[t][j] !== 0) { addCol(j, t, -Math.round(S[t][j] / S[t][t])); if (S[t][j] !== 0) changed = true; }
      if (!changed) {
        // ensure (t,t) divides the rest; if not, fold an offending row into row t
        let bad = false; for (let i = t + 1; i < m && !bad; i++) for (let j = t + 1; j < n; j++) if (S[i][j] % S[t][t] !== 0) { addRow(t, i, 1); bad = true; break; }
        if (!bad) break;
      }
      if (++guard > 2000) break;
    }
    if (S[t][t] < 0) negRow(t);
  }
  return { U: rowsToMat(U), S: rowsToMat(S), V: rowsToMat(V) };
}

function matScale(A: Mat, alpha: number): Mat {
  const out = zeros(A.rows, A.cols);
  for (let i = 0; i < A.data.length; i++) out.data[i] = A.data[i] * alpha;
  return out;
}

function matAddScaled(...terms: Array<[Mat, number]>): Mat {
  const rows = terms[0][0].rows, cols = terms[0][0].cols;
  const out = zeros(rows, cols);
  for (const [A, alpha] of terms) {
    for (let i = 0; i < out.data.length; i++) out.data[i] += alpha * A.data[i];
  }
  return out;
}

function matSub(A: Mat, B: Mat): Mat {
  const out = zeros(A.rows, A.cols);
  for (let i = 0; i < out.data.length; i++) out.data[i] = A.data[i] - B.data[i];
  return out;
}

/** Matrix exponential via Higham scaling-and-squaring with the [13/13] Pade approximant. */
export function expm(A: Mat): Mat {
  if (A.rows !== A.cols) throw new MatError('expm: input must be a square matrix');
  const n = A.rows;
  if (n === 0) return A;
  const theta13 = 5.371920351148152;
  const nrm = norm(A, 1);
  const sgrid = Math.max(0, Math.ceil(Math.log2(nrm / theta13)));
  const B = matScale(A, 1 / Math.pow(2, sgrid));
  const I = eye(n);
  const b = [
    64764752532480000, 32382376266240000, 7771770303897600,
    1187353796428800, 129060195264000, 10559470521600,
    670442572800, 33522128640, 1323241920, 40840800,
    960960, 16380, 182, 1,
  ];

  const A2 = matmul(B, B);
  const A4 = matmul(A2, A2);
  const A6 = matmul(A4, A2);

  const Uinner = matAddScaled(
    [matmul(A6, matAddScaled([A6, b[13]], [A4, b[11]], [A2, b[9]])), 1],
    [A6, b[7]],
    [A4, b[5]],
    [A2, b[3]],
    [I, b[1]],
  );
  const U = matmul(B, Uinner);
  const V = matAddScaled(
    [matmul(A6, matAddScaled([A6, b[12]], [A4, b[10]], [A2, b[8]])), 1],
    [A6, b[6]],
    [A4, b[4]],
    [A2, b[2]],
    [I, b[0]],
  );

  let E = mldivide(matSub(V, U), matAddScaled([V, 1], [U, 1]));
  for (let t = 0; t < sgrid; t++) E = matmul(E, E);
  return E;
}

/** f(A) for diagonalisable A via the eigendecomposition: V·f(D)·V⁻¹. */
/** Matrix function f(A) via Schur–Parlett (complex Schur + Parlett recurrence with
 *  confluent handling for equal/clustered eigenvalues — robust for repeated eigenvalues). */
function funmViaEig(A: Mat, f: (re: number, im: number) => [number, number]): Mat {
  const n = A.rows; if (n === 0) return A;
  // Real symmetric A: use the exact eigendecomposition A = V Λ Vᵀ (V real orthogonal),
  // so f(A) = V diag(f(λ)) Vᵀ. Avoids the Schur–Parlett path, which loses symmetry here.
  if (!isComplex(A) && isSymmetric(A)) {
    const { values, V } = jacobiEigSym(A);
    const fv = values.map((v) => f(v, 0));
    const Fre = new Float64Array(n * n), Fim = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      let sr = 0, si = 0;
      for (let kk = 0; kk < n; kk++) { const w = V.data[i + kk * n] * V.data[j + kk * n]; sr += w * fv[kk][0]; si += w * fv[kk][1]; }
      Fre[i + j * n] = sr; Fim[i + j * n] = si;
    }
    return finishComplex(n, n, Fre, Fim);
  }
  // complex Schur: A = U T Uᴴ, T upper-triangular
  const sc = schur(A); const cs = rsf2csf(sc.U, sc.T);
  const Tre = cs.T.data, Tim = cs.T.idata ?? new Float64Array(n * n);
  const tr = (i: number, j: number) => Tre[i + j * n], ti = (i: number, j: number) => Tim[i + j * n];
  const Fre = new Float64Array(n * n), Fim = new Float64Array(n * n);
  for (let i = 0; i < n; i++) { const [a, b] = f(tr(i, i), ti(i, i)); Fre[i + i * n] = a; Fim[i + i * n] = b; }
  const fprime = (re: number, im: number): [number, number] => { const h = 1e-6; const [pr, pi] = f(re + h, im); const [mr, mi] = f(re - h, im); return [(pr - mr) / (2 * h), (pi - mi) / (2 * h)]; };
  for (let d = 1; d < n; d++) for (let i = 0; i + d < n; i++) {
    const j = i + d;
    // F_ij (T_jj − T_ii) = T_ij (F_jj − F_ii) + Σ_{i<k<j} (T_ik F_kj − F_ik T_kj)   [from FT = TF]
    let nr = 0, ni = 0;
    { const [r, m] = cmul(tr(i, j), ti(i, j), Fre[j + j * n] - Fre[i + i * n], Fim[j + j * n] - Fim[i + i * n]); nr += r; ni += m; }
    for (let k = i + 1; k < j; k++) {
      const [r1, m1] = cmul(Fre[i + k * n], Fim[i + k * n], tr(k, j), ti(k, j));   // F_ik T_kj
      const [r2, m2] = cmul(tr(i, k), ti(i, k), Fre[k + j * n], Fim[k + j * n]);   // T_ik F_kj
      nr += r2 - r1; ni += m2 - m1;   // + (T_ik F_kj − F_ik T_kj)
    }
    const dr = tr(j, j) - tr(i, i), di = ti(j, j) - ti(i, i);
    if (Math.hypot(dr, di) < 1e-11) {   // confluent: f'(λ) on the (near-)equal eigenvalue
      const [pr, pi] = fprime((tr(i, i) + tr(j, j)) / 2, (ti(i, i) + ti(j, j)) / 2);
      const [r, m] = cmul(tr(i, j), ti(i, j), pr, pi); Fre[i + j * n] = r; Fim[i + j * n] = m;
    } else { const [r, m] = cdiv(nr, ni, dr, di); Fre[i + j * n] = r; Fim[i + j * n] = m; }
  }
  const F = finishComplex(n, n, Fre, Fim);
  const Uc = cs.U; return cmatmul(cmatmul(Uc, F), ctranspose(Uc));   // U F Uᴴ
}
export const sqrtm = (A: Mat): Mat => funmViaEig(A, (re, im) => csqrt(re, im));
export const logm = (A: Mat): Mat => funmViaEig(A, (re, im) => clog(re, im));

/** Pivoted block LDL' factorisation: P*A*P' = L*D*L'. */
export function ldl(A: Mat): { L: Mat; D: Mat; P: Mat; piv: number[] } {
  const { L, D, piv } = isComplex(A) ? ldlPivotFactorC(A) : ldlPivotFactor(A);
  return { L, D, P: pivotMatrix(piv), piv };
}

/** Nonnegative least squares (Lawson–Hanson active set): min ‖Cx−d‖, x ≥ 0. */
export function lsqnonnegDetailed(C: Mat, d: Mat): { x: Mat; iterations: number } {
  if (C.rows !== d.rows) throw new MatError('lsqnonneg: row dimensions must agree');
  if (isComplex(C) || isComplex(d)) throw new MatError('lsqnonneg: inputs must be real');
  const mC = C.rows, n = C.cols; const x = new Float64Array(n);
  const P = new Set<number>(); const Z = new Set<number>(); for (let i = 0; i < n; i++) Z.add(i);
  const Ct = transpose(C);
  const colFrom = (a: Float64Array) => mat(n, 1, Float64Array.from(a));
  const subCols = (cols: number[]) => { const o = zeros(mC, cols.length); cols.forEach((c, j) => { for (let r = 0; r < mC; r++) o.data[r + j * mC] = C.data[r + c * mC]; }); return o; };
  let outer = 0;
  while (Z.size && outer++ < 3 * n) {
    const Cx = matmul(C, colFrom(x)); const r = new Float64Array(mC); for (let i = 0; i < mC; i++) r[i] = d.data[i] - Cx.data[i];
    const w = matmul(Ct, mat(mC, 1, r));
    let jmax = -1, wmax = 1e-10; for (const j of Z) if (w.data[j] > wmax) { wmax = w.data[j]; jmax = j; }
    if (jmax < 0) break;
    P.add(jmax); Z.delete(jmax);
    let inner = 0;
    while (inner++ < 3 * n) {
      const cols = [...P].sort((a, b) => a - b); const z = mldivide(subCols(cols), d);
      const zfull = new Float64Array(n); cols.forEach((c, i) => { zfull[c] = z.data[i]; });
      if (cols.every((c) => zfull[c] > 0)) { for (let i = 0; i < n; i++) x[i] = zfull[i]; break; }
      let alpha = Infinity; for (const c of cols) if (zfull[c] <= 0) alpha = Math.min(alpha, x[c] / (x[c] - zfull[c]));
      for (let i = 0; i < n; i++) x[i] += alpha * (zfull[i] - x[i]);
      for (const c of [...P]) if (Math.abs(x[c]) < 1e-12) { P.delete(c); Z.add(c); }
    }
  }
  return { x: colVec(Array.from(x)), iterations: outer };
}

/** Nonnegative least squares (Lawson–Hanson active set): min ‖Cx−d‖, x ≥ 0. */
export function lsqnonneg(C: Mat, d: Mat): Mat {
  return lsqnonnegDetailed(C, d).x;
}

function sortEigenPairs(re: number[], im: number[]): { re: number[]; im: number[] } {
  const order = re.map((_, i) => i).sort((i, j) => re[i] - re[j] || im[i] - im[j]);
  return { re: order.map((i) => re[i]), im: order.map((i) => im[i]) };
}

/** General eigenvalues (+ optional eigenvectors) via balancing + real Schur decomposition. */
export function generalEig(A: Mat, wantVec: boolean): { D: { re: number[]; im: number[] }; V?: Mat } {
  const raw = isComplex(A) ? durandKerner(charpoly(A)) : schurEig(schur(balance(A).B).T);
  const { re: er, im: ei } = sortEigenPairs(raw.re, raw.im);
  if (!wantVec) return { D: { re: er, im: ei } };
  const n = A.rows; const Vre = new Float64Array(n * n), Vim = new Float64Array(n * n);
  for (let c = 0; c < n; c++) { const v = eigVec(A, er[c], ei[c]); for (let r = 0; r < n; r++) { Vre[r + c * n] = v.re[r]; Vim[r + c * n] = v.im[r]; } }
  return { D: { re: er, im: ei }, V: finishComplex(n, n, Vre, Vim) };
}

export function diag(a: Mat): Mat {
  const ai = a.idata;
  if (a.rows === 1 || a.cols === 1) {
    // vector → diagonal matrix
    const n = numel(a);
    const out = zeros(n, n);
    if (ai) out.idata = new Float64Array(n * n);
    for (let i = 0; i < n; i++) { out.data[i + i * n] = a.data[i]; if (ai) out.idata![i + i * n] = ai[i]; }
    return out;
  }
  const n = Math.min(a.rows, a.cols);
  const out = zeros(n, 1);
  if (ai) out.idata = new Float64Array(n);
  for (let i = 0; i < n; i++) { out.data[i] = a.data[i + i * a.rows]; if (ai) out.idata![i] = ai[i + i * a.rows]; }
  return out;
}

/** norm(v) — 2-norm for vectors; matrix norms for p∈{1,2,inf,'fro'}. */
export function norm(a: Mat, p: number | 'inf' | 'fro' = 2): number {
  const ai = a.idata; const mag = (i: number) => (ai ? Math.hypot(a.data[i], ai[i]) : Math.abs(a.data[i]));   // element magnitude (complex-aware)
  const n = a.data.length; const isVec = a.rows === 1 || a.cols === 1;
  if (isVec) {
    if (p === 1) { let s = 0; for (let i = 0; i < n; i++) s += mag(i); return s; }
    if (p === 'inf') { let s = 0; for (let i = 0; i < n; i++) s = Math.max(s, mag(i)); return s; }
    if (p === 'fro' || p === 2) { let s = 0; for (let i = 0; i < n; i++) s += mag(i) ** 2; return Math.sqrt(s); }
    let s = 0; for (let i = 0; i < n; i++) s += Math.pow(mag(i), p as number); return Math.pow(s, 1 / (p as number));
  }
  if (p === 'fro') { let s = 0; for (let i = 0; i < n; i++) s += mag(i) ** 2; return Math.sqrt(s); }
  if (p === 1) { let m = 0; for (let c = 0; c < a.cols; c++) { let s = 0; for (let r = 0; r < a.rows; r++) s += mag(r + c * a.rows); m = Math.max(m, s); } return m; }
  if (p === 'inf') { let m = 0; for (let r = 0; r < a.rows; r++) { let s = 0; for (let c = 0; c < a.cols; c++) s += mag(r + c * a.rows); m = Math.max(m, s); } return m; }
  // p === 2 : largest singular value
  return (ai ? svdC(a) : svd(a)).s[0] ?? 0;
}

// ── QR (Householder), Cholesky, LU outputs ─────────────────────────────
export function qr(A: Mat): { Q: Mat; R: Mat } {
  if (isComplex(A)) { const { Q, R } = qrComplexHouseholder(A, false); return { Q, R }; }
  const m = A.rows, n = A.cols;
  const R = mat(m, n, Float64Array.from(A.data));
  const Q = eye(m);
  const at = (M: Mat, r: number, c: number) => M.data[r + c * M.rows];
  for (let k = 0; k < Math.min(m - 1, n); k++) {
    let normx = 0; for (let i = k; i < m; i++) normx += at(R, i, k) ** 2; normx = Math.sqrt(normx);
    if (normx === 0) continue;
    const alpha = at(R, k, k) >= 0 ? -normx : normx;
    const v = new Float64Array(m);
    v[k] = at(R, k, k) - alpha;
    for (let i = k + 1; i < m; i++) v[i] = at(R, i, k);
    let vnorm2 = 0; for (let i = k; i < m; i++) vnorm2 += v[i] ** 2;
    if (vnorm2 === 0) continue;
    // R := R - 2 v (vᵀR)/vᵀv
    for (let c = 0; c < n; c++) { let d = 0; for (let i = k; i < m; i++) d += v[i] * at(R, i, c); d = (2 * d) / vnorm2; for (let i = k; i < m; i++) R.data[i + c * m] -= d * v[i]; }
    // Q := Q - 2 (Qv) vᵀ/vᵀv
    for (let r = 0; r < m; r++) { let d = 0; for (let i = k; i < m; i++) d += at(Q, r, i) * v[i]; d = (2 * d) / vnorm2; for (let i = k; i < m; i++) Q.data[r + i * m] -= d * v[i]; }
  }
  return { Q, R };
}

/** Hermitian Cholesky, MATLAB semantics: reads ONLY the chosen triangle (upper by default,
 *  lower with `useLower`), supports complex input, never throws — returns the upper factor R
 *  with R'·R = A and the first failing pivot `p` (0 when positive definite). On failure R is
 *  the q×q factor of the leading minor, q = p−1. Callers wanting the lower factor take R'. */
export function cholGeneral(A: Mat, useLower = false): { R: Mat; p: number } {
  const n = A.rows;
  if (A.cols !== n) throw new MatError('chol: matrix must be square');
  const im = A.idata;
  // a(j,i): Hermitian entry at row j, col i (i ≥ j) read from the chosen triangle only.
  const aRe = (j: number, i: number) => (useLower ? A.data[i + j * n] : A.data[j + i * n]);
  const aIm = (j: number, i: number) => (im ? (useLower ? -im[i + j * n] : im[j + i * n]) : 0);
  const Rre = new Float64Array(n * n), Rim = new Float64Array(n * n);
  let p = 0;
  for (let j = 0; j < n && !p; j++) {
    let d = aRe(j, j);
    for (let k = 0; k < j; k++) d -= Rre[k + j * n] ** 2 + Rim[k + j * n] ** 2;
    if (d <= 0 || !isFinite(d)) { p = j + 1; break; }
    const rjj = Math.sqrt(d);
    Rre[j + j * n] = rjj;
    for (let i = j + 1; i < n; i++) {
      let sr = aRe(j, i), si = aIm(j, i);
      for (let k = 0; k < j; k++) {
        // conj(R[k][j]) * R[k][i]
        const [mr, mi] = cmul(Rre[k + j * n], -Rim[k + j * n], Rre[k + i * n], Rim[k + i * n]);
        sr -= mr; si -= mi;
      }
      Rre[j + i * n] = sr / rjj; Rim[j + i * n] = si / rjj;
    }
  }
  if (p) {
    const q = p - 1;
    const Bre = new Float64Array(q * q), Bim = new Float64Array(q * q);
    for (let c = 0; c < q; c++) for (let r = 0; r < q; r++) { Bre[r + c * q] = Rre[r + c * n]; Bim[r + c * q] = Rim[r + c * n]; }
    return { R: finishComplex(q, q, Bre, Bim), p };
  }
  return { R: finishComplex(n, n, Rre, Rim), p };
}

export function chol(A: Mat): Mat {
  const { R, p } = cholGeneral(A);
  if (p) throw new MatError('Matrix must be positive definite.');
  return R; // upper triangular, R'R = A
}

/** General LU with partial pivoting: rectangular and complex inputs. P*A = L*U.
 *  `packed` is MATLAB's single-output form (U upper + L multipliers below the diagonal). */
export function luGeneral(A: Mat): { L: Mat; U: Mat; P: Mat; piv: number[]; packed: Mat } {
  const m = A.rows, n = A.cols, k = Math.min(m, n);
  const re = Float64Array.from(A.data);
  const im = A.idata ? Float64Array.from(A.idata) : null;
  const piv = Array.from({ length: m }, (_, i) => i);
  for (let j = 0; j < k; j++) {
    let p = j, max = Math.hypot(re[j + j * m], im ? im[j + j * m] : 0);
    for (let r = j + 1; r < m; r++) { const v = Math.hypot(re[r + j * m], im ? im[r + j * m] : 0); if (v > max) { max = v; p = r; } }
    if (p !== j) {
      for (let c = 0; c < n; c++) {
        const i1 = j + c * m, i2 = p + c * m;
        const t = re[i1]; re[i1] = re[i2]; re[i2] = t;
        if (im) { const ti = im[i1]; im[i1] = im[i2]; im[i2] = ti; }
      }
      const tp = piv[j]; piv[j] = piv[p]; piv[p] = tp;
    }
    const pr = re[j + j * m], pi = im ? im[j + j * m] : 0;
    if (pr === 0 && pi === 0) continue; // singular column; multipliers stay as-is (MATLAB leaves zeros)
    for (let r = j + 1; r < m; r++) {
      let fr: number, fi = 0;
      if (im) { [fr, fi] = cdiv(re[r + j * m], im[r + j * m], pr, pi); im[r + j * m] = fi; }
      else fr = re[r + j * m] / pr;
      re[r + j * m] = fr;
      for (let c = j + 1; c < n; c++) {
        const ia = r + c * m, ib = j + c * m;
        if (im) { const [mr, mi] = cmul(fr, fi, re[ib], im[ib]); re[ia] -= mr; im[ia] -= mi; }
        else re[ia] -= fr * re[ib];
      }
    }
  }
  const packed = im ? finishComplex(m, n, Float64Array.from(re), Float64Array.from(im)) : mat(m, n, Float64Array.from(re));
  const Lre = new Float64Array(m * k), Lim = new Float64Array(m * k);
  const Ure = new Float64Array(k * n), Uim = new Float64Array(k * n);
  for (let c = 0; c < n; c++) {
    for (let r = 0; r < m; r++) {
      if (r === c && c < k) Lre[r + c * m] = 1;
      else if (r > c && c < k) { Lre[r + c * m] = re[r + c * m]; if (im) Lim[r + c * m] = im[r + c * m]; }
      if (r <= c && r < k) { Ure[r + c * k] = re[r + c * m]; if (im) Uim[r + c * k] = im[r + c * m]; }
    }
  }
  const P = zeros(m, m);
  for (let r = 0; r < m; r++) P.data[r + piv[r] * m] = 1;
  return { L: finishComplex(m, k, Lre, Lim), U: finishComplex(k, n, Ure, Uim), P, piv, packed };
}

export function luOutputs(A: Mat): { L: Mat; U: Mat; P: Mat } {
  const { L, U, P } = luGeneral(A);
  return { L, U, P }; // P*A = L*U
}

// ── Symmetric eigensolver (cyclic Jacobi) + SVD ────────────────────────
export function jacobiEigSym(A0: Mat): { values: number[]; V: Mat } {
  const n = A0.rows;
  const A = Float64Array.from(A0.data);
  const V = eye(n);
  const at = (r: number, c: number) => A[r + c * n];
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0; for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += at(p, q) ** 2;
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const apq = at(p, q); if (Math.abs(apq) < 1e-300) continue;
      const app = at(p, p), aqq = at(q, q);
      const theta = (aqq - app) / (2 * apq);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let i = 0; i < n; i++) {
        const aip = A[i + p * n], aiq = A[i + q * n];
        A[i + p * n] = c * aip - s * aiq; A[i + q * n] = s * aip + c * aiq;
      }
      for (let i = 0; i < n; i++) {
        const api = A[p + i * n], aqi = A[q + i * n];
        A[p + i * n] = c * api - s * aqi; A[q + i * n] = s * api + c * aqi;
      }
      for (let i = 0; i < n; i++) {
        const vip = V.data[i + p * n], viq = V.data[i + q * n];
        V.data[i + p * n] = c * vip - s * viq; V.data[i + q * n] = s * vip + c * viq;
      }
    }
  }
  const values: number[] = []; for (let i = 0; i < n; i++) values.push(A[i + i * n]);
  return { values, V };
}

export function isSymmetric(A: Mat, tol = 1e-10): boolean {
  if (A.rows !== A.cols) return false;
  for (let r = 0; r < A.rows; r++) for (let c = r + 1; c < A.cols; c++) if (Math.abs(A.data[r + c * A.rows] - A.data[c + r * A.rows]) > tol * (1 + Math.abs(A.data[r + c * A.rows]))) return false;
  return true;
}

/** SVD via the symmetric eigendecomposition of AᵀA. Returns descending singular values. */
/** Economy SVD of a complex matrix via one-sided (complex) Jacobi: A = U·diag(s)·Vᴴ,
 *  U is m×k, V is n×k, k=min(m,n); U,V have orthonormal columns and s ≥ 0 descending. */
export function svdC(A: Mat): { U: Mat; s: number[]; V: Mat } {
  const mm = A.rows, nn = A.cols;
  if (mm < nn) { const r = svdC(ctranspose(A)); return { U: r.V, s: r.s, V: r.U }; }   // A = (Aᴴ)ᴴ
  const br = Float64Array.from(A.data), bi = A.idata ? Float64Array.from(A.idata) : new Float64Array(mm * nn);
  const vr = new Float64Array(nn * nn), vi = new Float64Array(nn * nn); for (let i = 0; i < nn; i++) vr[i + i * nn] = 1;
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < nn - 1; p++) for (let q = p + 1; q < nn; q++) {
      let app = 0, aqq = 0, gr = 0, gi = 0;
      for (let r = 0; r < mm; r++) { const pr = br[r + p * mm], pii = bi[r + p * mm], qr = br[r + q * mm], qi = bi[r + q * mm]; app += pr * pr + pii * pii; aqq += qr * qr + qi * qi; gr += pr * qr + pii * qi; gi += pr * qi - pii * qr; }  // γ = colpᴴ·colq
      const gabs = Math.hypot(gr, gi); if (gabs < 1e-300) continue; off += gabs;
      // rotate column q by e^{-iθ} so γ becomes real-positive, then apply a real Jacobi rotation
      const th = Math.atan2(gi, gr), cph = Math.cos(th), sph = Math.sin(th);
      for (let r = 0; r < mm; r++) { const qr = br[r + q * mm], qi = bi[r + q * mm]; br[r + q * mm] = qr * cph + qi * sph; bi[r + q * mm] = -qr * sph + qi * cph; }
      for (let r = 0; r < nn; r++) { const qr = vr[r + q * nn], qi = vi[r + q * nn]; vr[r + q * nn] = qr * cph + qi * sph; vi[r + q * nn] = -qr * sph + qi * cph; }
      const tau = (app - aqq) / (2 * gabs); const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau)); const c = 1 / Math.sqrt(1 + t * t), s2 = c * t;
      for (let r = 0; r < mm; r++) { const pr = br[r + p * mm], pii = bi[r + p * mm], qr = br[r + q * mm], qi = bi[r + q * mm]; br[r + p * mm] = c * pr + s2 * qr; bi[r + p * mm] = c * pii + s2 * qi; br[r + q * mm] = -s2 * pr + c * qr; bi[r + q * mm] = -s2 * pii + c * qi; }
      for (let r = 0; r < nn; r++) { const pr = vr[r + p * nn], pii = vi[r + p * nn], qr = vr[r + q * nn], qi = vi[r + q * nn]; vr[r + p * nn] = c * pr + s2 * qr; vi[r + p * nn] = c * pii + s2 * qi; vr[r + q * nn] = -s2 * pr + c * qr; vi[r + q * nn] = -s2 * pii + c * qi; }
    }
    if (off < 1e-15) break;
  }
  const sv: number[] = []; for (let j = 0; j < nn; j++) { let nr = 0; for (let r = 0; r < mm; r++) nr += br[r + j * mm] ** 2 + bi[r + j * mm] ** 2; sv[j] = Math.sqrt(nr); }
  const order = sv.map((_, j) => j).sort((x, y) => sv[y] - sv[x]);
  const Ur = new Float64Array(mm * nn), Ui = new Float64Array(mm * nn), Vr = new Float64Array(nn * nn), Vi = new Float64Array(nn * nn); const s: number[] = [];
  order.forEach((j, k) => { s[k] = sv[j]; const inv = sv[j] > 1e-300 ? 1 / sv[j] : 0; for (let r = 0; r < mm; r++) { Ur[r + k * mm] = br[r + j * mm] * inv; Ui[r + k * mm] = bi[r + j * mm] * inv; } for (let r = 0; r < nn; r++) { Vr[r + k * nn] = vr[r + j * nn]; Vi[r + k * nn] = vi[r + j * nn]; } });
  return { U: finishComplex(mm, nn, Ur, Ui), s, V: finishComplex(nn, nn, Vr, Vi) };
}
/** In-place complex Hessenberg reduction H := Pᴴ·A·P (zlarfg-style reflectors; see
 *  qrComplexHouseholder), accumulating P into Q. Shared by cSchur and cHessenberg. */
function cHessReduce(Hr: Float64Array, Hi: Float64Array, Qr: Float64Array, Qi: Float64Array, n: number): void {
  const vr = new Float64Array(n), vi = new Float64Array(n);
  for (let k = 0; k + 2 < n; k++) {
    const ar = Hr[k + 1 + k * n], ai = Hi[k + 1 + k * n];
    let xnorm2 = 0; for (let r = k + 2; r < n; r++) xnorm2 += Hr[r + k * n] ** 2 + Hi[r + k * n] ** 2;
    if (xnorm2 === 0 && ai === 0) continue;
    const beta = (ar >= 0 ? -1 : 1) * Math.sqrt(ar * ar + ai * ai + xnorm2);
    const taur = (beta - ar) / beta, taui = -ai / beta;
    vr[k + 1] = 1; vi[k + 1] = 0;
    for (let r = k + 2; r < n; r++) { const [q2r, q2i] = cdiv(Hr[r + k * n], Hi[r + k * n], ar - beta, ai); vr[r] = q2r; vi[r] = q2i; }
    // left: H := (I − conj(τ) v vᴴ) H  (rows k+1.., all columns)
    for (let c = 0; c < n; c++) {
      let wr = 0, wi = 0;
      for (let r = k + 1; r < n; r++) { const [pr, pi2] = cmul(vr[r], -vi[r], Hr[r + c * n], Hi[r + c * n]); wr += pr; wi += pi2; }
      const [twr, twi] = cmul(taur, -taui, wr, wi);
      for (let r = k + 1; r < n; r++) { const [pr, pi2] = cmul(twr, twi, vr[r], vi[r]); Hr[r + c * n] -= pr; Hi[r + c * n] -= pi2; }
    }
    // right: H := H (I − τ v vᴴ)  (all rows, columns k+1..)
    for (let r = 0; r < n; r++) {
      let wr = 0, wi = 0;
      for (let c = k + 1; c < n; c++) { const [pr, pi2] = cmul(Hr[r + c * n], Hi[r + c * n], vr[c], vi[c]); wr += pr; wi += pi2; }
      const [twr, twi] = cmul(taur, taui, wr, wi);
      for (let c = k + 1; c < n; c++) { const [pr, pi2] = cmul(twr, twi, vr[c], -vi[c]); Hr[r + c * n] -= pr; Hi[r + c * n] -= pi2; }
    }
    // Q := Q (I − τ v vᴴ)
    for (let r = 0; r < n; r++) {
      let wr = 0, wi = 0;
      for (let c = k + 1; c < n; c++) { const [pr, pi2] = cmul(Qr[r + c * n], Qi[r + c * n], vr[c], vi[c]); wr += pr; wi += pi2; }
      const [twr, twi] = cmul(taur, taui, wr, wi);
      for (let c = k + 1; c < n; c++) { const [pr, pi2] = cmul(twr, twi, vr[c], -vi[c]); Qr[r + c * n] -= pr; Qi[r + c * n] -= pi2; }
    }
    Hr[k + 1 + k * n] = beta; Hi[k + 1 + k * n] = 0;
    for (let r = k + 2; r < n; r++) { Hr[r + k * n] = 0; Hi[r + k * n] = 0; }
  }
}

/** Complex Hessenberg form: A = P·H·Pᴴ with H upper Hessenberg, P unitary. */
export function cHessenberg(A: Mat): { P: Mat; H: Mat } {
  const n = A.rows;
  if (A.cols !== n) throw new MatError('hess: matrix must be square');
  const Hr = Float64Array.from(A.data), Hi = A.idata ? Float64Array.from(A.idata) : new Float64Array(n * n);
  const Qr = new Float64Array(n * n), Qi = new Float64Array(n * n);
  for (let i = 0; i < n; i++) Qr[i + i * n] = 1;
  cHessReduce(Hr, Hi, Qr, Qi, n);
  return { P: finishComplex(n, n, Qr, Qi), H: finishComplex(n, n, Hr, Hi) };
}

/** Generalized Hessenberg-triangular reduction (real): Q·A·Z = AA (upper Hessenberg),
 *  Q·B·Z = BB (upper triangular), Q/Z orthogonal — MATLAB's [AA,BB,Q,Z] = hess(A,B). */
export function hessGeneral(A0: Mat, B0: Mat): { AA: Mat; BB: Mat; Q: Mat; Z: Mat } {
  const n = A0.rows;
  if (A0.cols !== n || B0.rows !== n || B0.cols !== n) throw new MatError('hess: matrices must be square and the same size');
  if (isComplex(A0) || isComplex(B0)) throw new MatError('hess: complex generalized form is not supported');
  const { Q: Q0, R } = qr(B0);
  const Qm = transpose(Q0);
  const AA = matmul(Qm, A0), BB = R, Z = eye(n);
  const Aa = AA.data, Bb = BB.data, Qd = Qm.data, Zd = Z.data;
  const rotRows = (M: Float64Array, i: number, c: number, s: number, c0: number): void => {
    for (let col = c0; col < n; col++) {
      const x = M[i - 1 + col * n], y = M[i + col * n];
      M[i - 1 + col * n] = c * x + s * y; M[i + col * n] = -s * x + c * y;
    }
  };
  const rotCols = (M: Float64Array, i: number, c: number, s: number, rTop: number): void => {
    for (let r = 0; r <= rTop; r++) {
      const x = M[r + (i - 1) * n], y = M[r + i * n];
      M[r + (i - 1) * n] = c * x + s * y; M[r + i * n] = -s * x + c * y;
    }
  };
  for (let j = 0; j + 2 < n; j++) {
    for (let i = n - 1; i >= j + 2; i--) {
      // left rotation on rows (i-1, i) zeroes AA(i, j) …
      const f = Aa[i - 1 + j * n], g = Aa[i + j * n];
      const d = Math.hypot(f, g);
      if (d > 0 && g !== 0) {
        const c = f / d, s = g / d;
        rotRows(Aa, i, c, s, j); rotRows(Bb, i, c, s, i - 1); rotRows(Qd, i, c, s, 0);
        Aa[i + j * n] = 0;
      }
      // … which fills BB(i, i-1); right rotation on cols (i-1, i) restores triangularity
      const b1 = Bb[i + (i - 1) * n], b2 = Bb[i + i * n];
      const d2 = Math.hypot(b1, b2);
      if (d2 > 0 && b1 !== 0) {
        const c = b2 / d2, s = -b1 / d2;
        rotCols(Aa, i, c, s, n - 1); rotCols(Bb, i, c, s, i); rotCols(Zd, i, c, s, n - 1);
        Bb[i + (i - 1) * n] = 0;
      }
    }
  }
  for (let c = 0; c < n; c++) for (let r = c + 1; r < n; r++) { if (r > c + 1) Aa[r + c * n] = 0; Bb[r + c * n] = 0; }
  return { AA, BB, Q: Qm, Z };
}

/** Complex Schur decomposition A = Q·T·Qᴴ (T upper triangular): Householder Hessenberg
 *  reduction followed by explicit Wilkinson-shifted QR with complex Givens rotations. */
export function cSchur(A: Mat): { T: Mat; Q: Mat } {
  const n = A.rows;
  if (A.cols !== n) throw new MatError('schur: matrix must be square');
  const Hr = Float64Array.from(A.data), Hi = A.idata ? Float64Array.from(A.idata) : new Float64Array(n * n);
  const Qr = new Float64Array(n * n), Qi = new Float64Array(n * n);
  for (let i = 0; i < n; i++) Qr[i + i * n] = 1;
  cHessReduce(Hr, Hi, Qr, Qi, n);
  // ── Shifted QR iteration with deflation ──
  const eps = 2.220446049250313e-16;
  const cs = new Float64Array(n), snr = new Float64Array(n), sni = new Float64Array(n);
  let hi = n - 1, guard = 60 * n * n;
  while (hi > 0 && guard-- > 0) {
    // deflate negligible subdiagonals
    for (let i = hi; i >= 1; i--) {
      const sub = Math.hypot(Hr[i + (i - 1) * n], Hi[i + (i - 1) * n]);
      const sc = Math.hypot(Hr[i - 1 + (i - 1) * n], Hi[i - 1 + (i - 1) * n]) + Math.hypot(Hr[i + i * n], Hi[i + i * n]);
      if (sub <= eps * (sc || 1)) { Hr[i + (i - 1) * n] = 0; Hi[i + (i - 1) * n] = 0; }
    }
    if (Hr[hi + (hi - 1) * n] === 0 && Hi[hi + (hi - 1) * n] === 0) { hi--; continue; }
    let lo = hi;
    while (lo > 0 && (Hr[lo + (lo - 1) * n] !== 0 || Hi[lo + (lo - 1) * n] !== 0)) lo--;
    // Wilkinson shift: eigenvalue of the bottom 2×2 closest to H[hi][hi]
    const a1r = Hr[hi - 1 + (hi - 1) * n], a1i = Hi[hi - 1 + (hi - 1) * n];
    const br = Hr[hi - 1 + hi * n], bi = Hi[hi - 1 + hi * n];
    const cr = Hr[hi + (hi - 1) * n], ci = Hi[hi + (hi - 1) * n];
    const dr = Hr[hi + hi * n], di = Hi[hi + hi * n];
    const trR = a1r + dr, trI = a1i + di;
    const [adr, adi] = cmul(a1r, a1i, dr, di); const [bcr, bci] = cmul(br, bi, cr, ci);
    const detR = adr - bcr, detI = adi - bci;
    const [t2r, t2i] = cmul(trR, trI, trR, trI);
    const [sqr, sqi] = csqrt(t2r - 4 * detR, t2i - 4 * detI);
    const l1r = (trR + sqr) / 2, l1i = (trI + sqi) / 2, l2r = (trR - sqr) / 2, l2i = (trI - sqi) / 2;
    const mu = Math.hypot(l1r - dr, l1i - di) <= Math.hypot(l2r - dr, l2i - di) ? [l1r, l1i] : [l2r, l2i];
    for (let i = lo; i <= hi; i++) { Hr[i + i * n] -= mu[0]; Hi[i + i * n] -= mu[1]; }
    // QR sweep: left Givens zeroing the subdiagonal …
    for (let k = lo; k < hi; k++) {
      const fr = Hr[k + k * n], fi = Hi[k + k * n], gr = Hr[k + 1 + k * n], gi = Hi[k + 1 + k * n];
      const fa = Math.hypot(fr, fi), d2 = Math.hypot(fa, Math.hypot(gr, gi));
      if (d2 === 0) { cs[k] = 1; snr[k] = 0; sni[k] = 0; continue; }
      if (fa === 0) { cs[k] = 0; const ga = Math.hypot(gr, gi); snr[k] = gr / ga; sni[k] = -gi / ga; }
      else {
        cs[k] = fa / d2;
        const phr = fr / fa, phi2 = fi / fa; // f/|f|
        const [sr2, si2] = cmul(phr, phi2, gr, -gi); snr[k] = sr2 / d2; sni[k] = si2 / d2;
      }
      for (let c = k; c < n; c++) {
        const h1r = Hr[k + c * n], h1i = Hi[k + c * n], h2r = Hr[k + 1 + c * n], h2i = Hi[k + 1 + c * n];
        const [s1r, s1i] = cmul(snr[k], sni[k], h2r, h2i);
        Hr[k + c * n] = cs[k] * h1r + s1r; Hi[k + c * n] = cs[k] * h1i + s1i;
        const [s2r, s2i] = cmul(snr[k], -sni[k], h1r, h1i);
        Hr[k + 1 + c * n] = cs[k] * h2r - s2r; Hi[k + 1 + c * n] = cs[k] * h2i - s2i;
      }
    }
    // … then right Gᴴ to finish RQ, and accumulate Q
    for (let k = lo; k < hi; k++) {
      const top = Math.min(k + 2, hi);
      for (let r = 0; r <= top; r++) {
        const h1r = Hr[r + k * n], h1i = Hi[r + k * n], h2r = Hr[r + (k + 1) * n], h2i = Hi[r + (k + 1) * n];
        const [s1r, s1i] = cmul(snr[k], -sni[k], h2r, h2i);
        Hr[r + k * n] = cs[k] * h1r + s1r; Hi[r + k * n] = cs[k] * h1i + s1i;
        const [s2r, s2i] = cmul(snr[k], sni[k], h1r, h1i);
        Hr[r + (k + 1) * n] = cs[k] * h2r - s2r; Hi[r + (k + 1) * n] = cs[k] * h2i - s2i;
      }
      for (let r = 0; r < n; r++) {
        const q1r = Qr[r + k * n], q1i = Qi[r + k * n], q2r = Qr[r + (k + 1) * n], q2i = Qi[r + (k + 1) * n];
        const [s1r, s1i] = cmul(snr[k], -sni[k], q2r, q2i);
        Qr[r + k * n] = cs[k] * q1r + s1r; Qi[r + k * n] = cs[k] * q1i + s1i;
        const [s2r, s2i] = cmul(snr[k], sni[k], q1r, q1i);
        Qr[r + (k + 1) * n] = cs[k] * q2r - s2r; Qi[r + (k + 1) * n] = cs[k] * q2i - s2i;
      }
    }
    for (let i = lo; i <= hi; i++) { Hr[i + i * n] += mu[0]; Hi[i + i * n] += mu[1]; }
  }
  for (let c = 0; c < n; c++) for (let r = c + 1; r < n; r++) { Hr[r + c * n] = 0; Hi[r + c * n] = 0; }
  return { T: finishComplex(n, n, Hr, Hi), Q: finishComplex(n, n, Qr, Qi) };
}

/** Eigenvalues (and optional unit-norm right eigenvectors) of a complex matrix via cSchur. */
export function cEig(A: Mat, wantV: boolean): { re: Float64Array; im: Float64Array; V: Mat | null } {
  const n = A.rows;
  const { T, Q } = cSchur(A);
  const Tr = T.data, Ti = T.idata ?? new Float64Array(n * n);
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) { re[i] = Tr[i + i * n]; im[i] = Ti[i + i * n]; }
  if (!wantV) return { re, im, V: null };
  let tnorm = 0; for (let i = 0; i < Tr.length; i++) tnorm = Math.max(tnorm, Math.hypot(Tr[i], Ti[i]));
  const Vr = new Float64Array(n * n), Vi = new Float64Array(n * n);
  const Qr = Q.data, Qi = Q.idata ?? new Float64Array(n * n);
  const yr = new Float64Array(n), yi = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    yr.fill(0); yi.fill(0); yr[j] = 1;
    for (let i = j - 1; i >= 0; i--) {
      let sr = 0, si = 0;
      for (let k = i + 1; k <= j; k++) { const [pr, pi2] = cmul(Tr[i + k * n], Ti[i + k * n], yr[k], yi[k]); sr += pr; si += pi2; }
      let dr2 = Tr[i + i * n] - re[j], di2 = Ti[i + i * n] - im[j];
      if (Math.hypot(dr2, di2) < 2.220446049250313e-16 * (tnorm || 1)) { dr2 = 2.220446049250313e-16 * (tnorm || 1); di2 = 0; }
      const [xr2, xi2] = cdiv(-sr, -si, dr2, di2);
      yr[i] = xr2; yi[i] = xi2;
    }
    // v = Q·y, normalized
    let nrm = 0;
    for (let r = 0; r < n; r++) {
      let ar2 = 0, ai2 = 0;
      for (let k = 0; k <= j; k++) { const [pr, pi2] = cmul(Qr[r + k * n], Qi[r + k * n], yr[k], yi[k]); ar2 += pr; ai2 += pi2; }
      Vr[r + j * n] = ar2; Vi[r + j * n] = ai2; nrm += ar2 * ar2 + ai2 * ai2;
    }
    nrm = Math.sqrt(nrm);
    if (nrm > 0) for (let r = 0; r < n; r++) { Vr[r + j * n] /= nrm; Vi[r + j * n] /= nrm; }
  }
  return { re, im, V: finishComplex(n, n, Vr, Vi) };
}

/** Extend (or repair) a set of orthonormal columns to a full `total`-column unitary basis via
 *  modified Gram–Schmidt over [existing columns, identity columns]. Zero/dependent input columns
 *  are skipped and back-filled from the identity; since σ's are sorted descending those columns
 *  are trailing (σ = 0), where any orthonormal completion is a valid singular vector. */
export function unitaryCompletion(U0: Mat, total: number): Mat {
  const mm = U0.rows;
  const outRe: Float64Array[] = [], outIm: Float64Array[] = [];
  const pushIfIndependent = (xr: Float64Array, xi: Float64Array): void => {
    for (let pass = 0; pass < 2; pass++) {
      for (let q = 0; q < outRe.length; q++) {
        let dr = 0, di = 0; // qᴴ·x
        for (let r = 0; r < mm; r++) { const [pr, pi2] = cmul(outRe[q][r], -outIm[q][r], xr[r], xi[r]); dr += pr; di += pi2; }
        for (let r = 0; r < mm; r++) { const [pr, pi2] = cmul(dr, di, outRe[q][r], outIm[q][r]); xr[r] -= pr; xi[r] -= pi2; }
      }
    }
    let nrm = 0; for (let r = 0; r < mm; r++) nrm += xr[r] ** 2 + xi[r] ** 2;
    nrm = Math.sqrt(nrm);
    if (nrm < 1e-10) return;
    for (let r = 0; r < mm; r++) { xr[r] /= nrm; xi[r] /= nrm; }
    outRe.push(xr); outIm.push(xi);
  };
  for (let c = 0; c < U0.cols && outRe.length < total; c++) {
    const xr = new Float64Array(mm), xi = new Float64Array(mm);
    for (let r = 0; r < mm; r++) { xr[r] = U0.data[r + c * mm]; if (U0.idata) xi[r] = U0.idata[r + c * mm]; }
    pushIfIndependent(xr, xi);
  }
  for (let c = 0; c < mm && outRe.length < total; c++) {
    const xr = new Float64Array(mm), xi = new Float64Array(mm);
    xr[c] = 1;
    pushIfIndependent(xr, xi);
  }
  const Ur = new Float64Array(mm * total), Ui = new Float64Array(mm * total);
  for (let c = 0; c < outRe.length; c++) for (let r = 0; r < mm; r++) { Ur[r + c * mm] = outRe[c][r]; Ui[r + c * mm] = outIm[c][r]; }
  return finishComplex(mm, total, Ur, Ui);
}

export function svd(A: Mat): { U: Mat; s: number[]; V: Mat } {
  const { U, s, V } = svdC(A);
  return { U: completeUnitaryColumns(U, A.rows), s, V: completeUnitaryColumns(V, A.cols) };
}

function completeUnitaryColumns(A: Mat, targetCols: number): Mat {
  const rows = A.rows;
  const accepted: { re: Float64Array; im: Float64Array }[] = [];
  const Ai = A.idata ?? new Float64Array(A.rows * A.cols);
  const tryAdd = (re: Float64Array, im: Float64Array) => {
    orthogonalize(re, im, accepted);
    const nrm = complexNorm(re, im);
    if (nrm <= 1e-10) return;
    for (let r = 0; r < rows; r++) { re[r] /= nrm; im[r] /= nrm; }
    accepted.push({ re, im });
  };

  for (let c = 0; c < A.cols && accepted.length < targetCols; c++) {
    const re = new Float64Array(rows), im = new Float64Array(rows);
    for (let r = 0; r < rows; r++) { re[r] = A.data[r + c * A.rows]; im[r] = Ai[r + c * A.rows]; }
    tryAdd(re, im);
  }
  for (let e = 0; e < rows && accepted.length < targetCols; e++) {
    const re = new Float64Array(rows), im = new Float64Array(rows);
    re[e] = 1;
    tryAdd(re, im);
  }

  const outR = new Float64Array(rows * targetCols), outI = new Float64Array(rows * targetCols);
  accepted.forEach((col, c) => {
    for (let r = 0; r < rows; r++) {
      outR[r + c * rows] = col.re[r];
      outI[r + c * rows] = col.im[r];
    }
  });
  return finishComplex(rows, targetCols, outR, outI);
}

export function rankOf(A: Mat, tol?: number): number {
  return svdRankInfo(A, tol).rank;
}
export function cond(A: Mat): number {
  const { smax, smin } = svdRankInfo(A);
  return smin === 0 ? Infinity : smax / smin;
}

function svdRankInfo(A: Mat, explicitTol?: number): { U: Mat; s: number[]; V: Mat; rank: number; tol: number; smax: number; smin: number } {
  // one-sided Jacobi (svdC) resolves tiny singular values with high relative accuracy;
  // the AtA-based svd loses half the digits and overcounts rank for singular matrices (e.g. magic(4)).
  const { U, s, V } = svdC(A);
  const smax = s[0] ?? 0;
  const smin = s[s.length - 1] ?? 0;
  const tol = explicitTol ?? (Math.max(A.rows, A.cols) * smax * 2.220446049250313e-16);
  return { U, s, V, rank: s.filter((x) => x > tol).length, tol, smax, smin };
}

/** MATLAB-style "close to singular" message for a square matrix solved via backslash, or null if A is well-conditioned. */
export function illConditionWarning(A: Mat): string | null {
  if (A.rows !== A.cols || A.rows < 1 || A.isChar) return null;
  const { smax, smin } = svdRankInfo(A);
  const rc = smax !== 0 && Number.isFinite(smax) && Number.isFinite(smin) ? smin / smax : 0;
  if (rc >= Number.EPSILON) return null;
  return rc === 0
    ? 'Matrix is singular to working precision.'
    : `Matrix is close to singular or badly scaled. Results may be inaccurate. RCOND = ${rc.toExponential(6)}.`;
}
export function pinv(A: Mat, tol?: number): Mat {
  return cPinv(A, svdRankInfo(A, tol));
}

export function lsqminnormSolve(A: Mat, B: Mat, opts: { tol?: number; regularization?: number } = {}): { x: Mat; rank: number; tol: number } {
  if (A.rows !== B.rows) throw new MatError(`lsqminnorm: row dimensions must agree (${A.rows} vs ${B.rows})`);
  const info = svdRankInfo(A, opts.tol);
  if (opts.regularization !== undefined && opts.regularization !== 0) {
    const alpha = opts.regularization;
    if (!Number.isFinite(alpha) || alpha < 0) throw new MatError('lsqminnorm: RegularizationFactor must be a nonnegative finite scalar');
    const { U, s, V } = info;
    const Sreg = zeros(s.length, s.length);
    for (let j = 0; j < s.length; j++) Sreg.data[j + j * s.length] = s[j] / (s[j] * s[j] + alpha * alpha);
    return { x: cmatmul(cmatmul(cmatmul(V, Sreg), ctranspose(U)), B), rank: info.rank, tol: info.tol };
  }
  return { x: cmatmul(cPinv(A, info), B), rank: info.rank, tol: info.tol };
}

/** Orthonormal basis for the range (columns of U for nonzero singular values). */
export function orth(A: Mat): Mat {
  const { U, s, tol } = svdRankInfo(A); const m = A.rows;
  const cols: number[] = []; for (let j = 0; j < s.length; j++) if (s[j] > tol) cols.push(j);
  const Or = new Float64Array(m * cols.length), Oi = new Float64Array(m * cols.length);
  const Ui = U.idata ?? new Float64Array(U.rows * U.cols);
  cols.forEach((j, dst) => {
    for (let r = 0; r < m; r++) {
      Or[r + dst * m] = U.data[r + j * U.rows];
      Oi[r + dst * m] = Ui[r + j * U.rows];
    }
  });
  return finishComplex(m, cols.length, Or, Oi);
}
/** Orthonormal basis for the null space (V columns for ~zero singular values). */
export function nullspace(A: Mat): Mat {
  return rightNullBasis(svdRankInfo(A), A.cols);
}

function rightNullBasis(info: { s: number[]; V: Mat; rank: number; tol: number }, n: number): Mat {
  const desired = Math.max(0, n - info.rank);
  const cols: { re: Float64Array; im: Float64Array }[] = [];
  const constraints: { re: Float64Array; im: Float64Array }[] = [];
  const Vi = info.V.idata ?? new Float64Array(info.V.rows * info.V.cols);

  const addFromV = (j: number, asNull: boolean) => {
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let r = 0; r < n; r++) {
      re[r] = info.V.data[r + j * info.V.rows];
      im[r] = Vi[r + j * info.V.rows];
    }
    if (asNull) cols.push({ re, im });
    constraints.push({ re, im });
  };

  for (let j = 0; j < info.s.length; j++) addFromV(j, info.s[j] <= info.tol);

  const basis = () => constraints.concat(cols.filter((c) => !constraints.includes(c)));
  for (let e = 0; cols.length < desired && e < n; e++) {
    const re = new Float64Array(n), im = new Float64Array(n);
    re[e] = 1;
    orthogonalize(re, im, basis());
    const nrm = complexNorm(re, im);
    if (nrm <= 1e-10) continue;
    for (let r = 0; r < n; r++) { re[r] /= nrm; im[r] /= nrm; }
    cols.push({ re, im });
  }

  const outR = new Float64Array(n * cols.length), outI = new Float64Array(n * cols.length);
  cols.forEach((col, j) => {
    for (let r = 0; r < n; r++) {
      outR[r + j * n] = col.re[r];
      outI[r + j * n] = col.im[r];
    }
  });
  return finishComplex(n, cols.length, outR, outI);
}

function orthogonalize(re: Float64Array, im: Float64Array, against: { re: Float64Array; im: Float64Array }[]): void {
  for (const q of against) {
    let dotR = 0, dotI = 0;
    for (let i = 0; i < re.length; i++) {
      dotR += q.re[i] * re[i] + q.im[i] * im[i];
      dotI += q.re[i] * im[i] - q.im[i] * re[i];
    }
    for (let i = 0; i < re.length; i++) {
      re[i] -= q.re[i] * dotR - q.im[i] * dotI;
      im[i] -= q.re[i] * dotI + q.im[i] * dotR;
    }
  }
}

function complexNorm(re: Float64Array, im: Float64Array): number {
  let s = 0;
  for (let i = 0; i < re.length; i++) s += re[i] * re[i] + im[i] * im[i];
  return Math.sqrt(s);
}

/** Rational null-space basis (MATLAB `null(A,'rational')`): from rref, one basis
 *  vector per free column with 1 in the free position and -R(pivot,free) elsewhere. */
export function nullspaceRational(A: Mat): Mat {
  const R = rref(A); const m = R.rows, n = R.cols;
  const pivotCol: number[] = []; const isPivot = new Array<boolean>(n).fill(false);
  for (let r = 0; r < m; r++) {
    let lead = -1;
    for (let c = 0; c < n; c++) if (Math.abs(R.data[r + c * m]) > 1e-10) { lead = c; break; }
    if (lead >= 0) { pivotCol.push(lead); isPivot[lead] = true; }
  }
  const free: number[] = []; for (let c = 0; c < n; c++) if (!isPivot[c]) free.push(c);
  const N = zeros(n, free.length);
  free.forEach((f, dst) => {
    N.data[f + dst * n] = 1;
    pivotCol.forEach((p, ri) => { N.data[p + dst * n] = -R.data[ri + f * m]; });
  });
  return N;
}

/** Reduced row echelon form (Gauss-Jordan, partial pivoting). */
export function rref(A0: Mat): Mat {
  const A = mat(A0.rows, A0.cols, Float64Array.from(A0.data));
  const m = A.rows, n = A.cols; let lead = 0;
  const tol = 1e-10 * (1 + Math.max(...Array.from(A.data).map(Math.abs)));
  for (let r = 0; r < m; r++) {
    if (lead >= n) break;
    let i = r; while (Math.abs(A.data[i + lead * m]) < tol) { i++; if (i === m) { i = r; lead++; if (lead === n) return A; } }
    for (let c = 0; c < n; c++) { const t = A.data[r + c * m]; A.data[r + c * m] = A.data[i + c * m]; A.data[i + c * m] = t; }
    const piv = A.data[r + lead * m];
    for (let c = 0; c < n; c++) A.data[r + c * m] /= piv;
    for (let k = 0; k < m; k++) if (k !== r) { const f = A.data[k + lead * m]; for (let c = 0; c < n; c++) A.data[k + c * m] -= f * A.data[r + c * m]; }
    lead++;
  }
  return A;
}

/** Column-wise (dim 1) or row-wise (dim 2) p-norms. */
export function vecnorm(A: Mat, p: number | 'inf' = 2, dim = 1): Mat {
  const pn = (vals: number[]) => p === 'inf' ? Math.max(...vals.map(Math.abs)) : Math.pow(vals.reduce((s, x) => s + Math.pow(Math.abs(x), p), 0), 1 / p);
  if (dim === 1) { const out = zeros(1, A.cols); for (let c = 0; c < A.cols; c++) { const col: number[] = []; for (let r = 0; r < A.rows; r++) col.push(A.data[r + c * A.rows]); out.data[c] = pn(col); } return out; }
  const out = zeros(A.rows, 1); for (let r = 0; r < A.rows; r++) { const row: number[] = []; for (let c = 0; c < A.cols; c++) row.push(A.data[r + c * A.rows]); out.data[r] = pn(row); } return out;
}
