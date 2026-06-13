# Coverage Map

The declared scope and the oracle-verified status of each area. The target is
**MATLAB-executable undergraduate and graduate *applied/computational* mathematics**
— not proof-based pure math (see "Out of scope" below). Coverage is measured by
tagged oracle cases (`matlab/test/oracle/cases.ts`); run the report with:

```bash
pnpm exec tsc -p tsconfig.test.json && node matlab/test/oracle/coverage.mjs
```

`✓` = oracle-verified against real MATLAB · `~` = partial · (blank) = not yet.

## Tier 1 — Core undergraduate

| Area | Status |
|---|---|
| Matrix arithmetic, indexing, broadcasting | ✓ |
| Sparse basics | ✓ |
| Linear systems (`\`, `inv`, `det`, `rank`, `null`, `rref`) | ✓ |
| Eigenvalues, SVD, QR, Cholesky | ✓ |
| Polynomial fit / eval (`polyfit`, `polyval`, `roots`, `polyint`) | ✓ |
| Numerical integration (trapezoid, Simpson, Gauss) | ✓ |
| Interpolation (Newton, linear, pchip, spline) | ✓ |
| ODE basics (Euler, RK4) | ✓ |
| Probability / statistics basics (`mean`, `var`, `std`, `corrcoef`, `cov`) | ✓ |
| Least squares / projection | ✓ |
| Vector geometry (dot, cross, norm, angles) | ✓ |
| Fourier / signals (`fft`, `conv`) | ✓ |

## Tier 2 / 3 — Advanced undergraduate & graduate applied

| Area | Status |
|---|---|
| Conditioning & stability (Hilbert, `cond`) | ✓ |
| Orthogonalization (QR orthonormality, Gram–Schmidt) | ✓ |
| Iterative solvers (Jacobi, Gauss–Seidel) | ✓ |
| Krylov methods (Conjugate Gradient) | ✓ |
| Nonlinear systems (Newton + Jacobian) | ✓ |
| Regularization / inverse problems (ridge / Tikhonov) | ✓ |
| Matrix functions (`expm`, `A^n`) | ✓ |
| Spectral graph theory (Laplacian, Fiedler value) | ✓ |
| Markov chains / steady state | ✓ |
| Low-rank / SVD subspaces | ~ |
| PDE finite-difference stencils | |
| Finite-element toy assembly (1-D) | |
| GMRES / preconditioned Krylov | |
| Stiff ODE / stability regions | |
| Monte Carlo (RNG — not deterministically oracle-checkable) | n/a |

## Tier 4 — Symbolic / CAS smoke

| Area | Status |
|---|---|
| Symbolic diff / int / subs | ✓ (TS-only via `double(subs(...))`) |
| Taylor series, transforms | ~ |
| Small algebraic system solve | ~ |

## Out of scope (wrong abstraction for a MATLAB sandbox)

Proof-based pure mathematics is **not** "run a script, compare output" and is a
non-target: abstract algebra, topology, measure theory, functional analysis as
theorem-proving, category theory, logic/model theory, algebraic geometry beyond
symbolic polynomial examples. These need theorem statements and proof checking,
not numeric/CAS execution parity.

**Scope statement:** *100% coverage of declared graduate computational-math
workflows — not 100% of all graduate mathematics.*
