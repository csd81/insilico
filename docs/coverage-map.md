# Coverage Map

The declared scope and the oracle-verified status of each area. The target is
**MATLAB-executable undergraduate and graduate *applied/computational* mathematics**
— not proof-based pure math (see "Out of scope" below). Coverage is measured by
tagged oracle cases (`matlab/test/oracle/cases.ts`); run the report with:

```bash
pnpm oracle:coverage
```

**Status (as of this revision):** 463 tests green · 328 MATLAB oracle fixtures ·
328/328 cases classified · 223 undergrad / 105 graduate across 16 domains.

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
| Stress / adversarial (ill-conditioned `\`, rank-deficient, defective eigenvalues) | ✓ |
| Adversarial robustness (Wilkinson, IEEE NaN/Inf, cancellation, Runge) | ✓ |
| Orthogonalization (QR orthonormality, Gram–Schmidt) | ✓ |
| Iterative solvers (Jacobi, Gauss–Seidel) | ✓ |
| Krylov methods (Conjugate Gradient) | ✓ |
| Nonlinear systems (Newton + Jacobian) | ✓ |
| Regularization / inverse problems (ridge / Tikhonov) | ✓ |
| Matrix functions (`expm`, `A^n`) | ✓ |
| Spectral graph theory (Laplacian, Fiedler value) | ✓ |
| Markov chains / steady state | ✓ |
| Low-rank / SVD subspaces | ~ |
| Optimization (golden-section, GD, Newton min; `fminbnd`/`fminsearch`/`fsolve`/`quadprog`/`lsqlin`) | ✓ |
| Nonlinear systems (Newton + Jacobian) | ✓ |
| Numerical ODEs (Euler, Heun, RK4, systems; `ode45` adaptive) | ✓ |
| PDE finite-difference (Poisson 1-D, heat 1-D) | ✓ |
| Graph algorithms (`shortestpath`, `conncomp`, `distances`, `toposort`) | ✓ |
| Finite-element toy assembly (1-D stiffness) | ✓ |
| Dynamical systems (fixed-point, logistic map, stability) | ✓ |
| Spectral methods / Fourier (`fft`/`ifft`, convolution, freq detect) | ✓ |
| Graph computation (adjacency powers, Laplacian, PageRank) | ✓ |
| Approximation (Lagrange, Chebyshev nodes) | ✓ |
| Advanced decompositions (`schur`, `hess`, `polyeig`) | ✓ |
| Matrix functions (`sqrtm`, `logm`, `expm`) | ✓ |
| Krylov solvers (`gmres`, `minres`, `bicg`) | ✓ |
| Distribution functions (`normpdf/cdf`, `binopdf`, `poisspdf`, `icdf`) | ✓ |
| Preconditioned Krylov | ~ |
| Stiff ODE / stability regions | |
| Crank–Nicolson / implicit PDE | |
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

---

## Backlog status

The backlog is bucketed so it does not accidentally reintroduce MATLAB-clone
ambitions. The computational contract is the target; runtime/IO breadth is not.

### Required

None currently.

The previous proposed gaps were rechecked against MATLAB R2026a and the sandbox
registry. They were either already implemented, intentionally out of scope, or
not MATLAB function names.

- `khatriRao`: not a MATLAB R2026a function (`exist("khatriRao") == 0`). Do not
  implement as part of MATLAB-compatible coverage.
- `gammapdf`: incorrect name. MATLAB uses `gampdf`, which is already implemented
  and oracle-validated.

### Validate existing (implemented + oracle-validated)
All oracle-validated — no validation backlog remains:
- **Decompositions / matrix functions:** `eig`/`svd`/`qr`/`lu`/`chol`,
  `schur`/`hess`/`polyeig`, `expm`/`sqrtm`/`logm`, `pinv`/`rank`/`null`/`orth`/`rref`/`cond`
- **Iterative / sparse solvers:** `gmres`/`minres`/`bicg`/`bicgstab`/`lsqr`, `eigs`/`svds`
- **ODE:** `ode45`/`ode23`/`ode113`/`ode15s`/`deval`
- **Optimization:** `fminbnd`/`fminsearch`/`fsolve`/`quadprog`/`lsqlin`/`linprog`
- **Approximation:** `interp2`/`interpn`/`ppval`/`makima`/`polyvalm`/`residue`
- **Fourier / signal:** `fft2`/`fftshift`/`hilbert`/`findpeaks`
- **Graph:** `shortestpath`/`conncomp`/`distances`/`toposort`/`centrality`/`maxflow`/`minspantree`
- **Statistics:** distribution `*pdf`/`*cdf`/`icdf`, `var`/`std`/`corrcoef`/`cov`
- **Symbolic CAS:** `jacobian`/`hessian`/`taylor`/`laplace`/`dsolve`/`vpasolve`

Functions with non-unique outputs are validated by invariants rather than raw
value equality (e.g. `linprog` objective value, `residue` sorted poles, `eig`
reconstruction residual, `svd`/`qr` sign conventions, graph path length).

### Deferred (real, but only if course-driven)
Large model-object families (`fitlm`/`fitglm`/`fitcsvm`/`fitctree`/`fitrgp`),
full table/timetable ecosystem (`retime`/`synchronize`/`stack`/`unstack`),
hypothesis tests (`kstest`/`chi2gof`/`anova`), `pca`/`kmeans`/`knnsearch`,
missing sparse helpers (`pcg`/`ldl`/`ilu`/`cgs`).

### Out of scope (clone ambitions — explicitly not requirements)
- Language runtime: `classdef`, `arguments`, real `global`/`persistent`,
  `evalin`/`assignin`, path model (`addpath`/`rmpath`/`path`/`genpath`).
- I/O needing host APIs: `webread`/`webwrite`, `imread`/`imwrite`,
  `audioread`/`audiowrite`, `matfile`, `savefig`/`openfig`, `xmlread`.
- RNG output parity: `mvnrnd`/`bootstrp`/`datasample` and any exact
  random-output oracle comparison (`rng`-fixing won't reproduce MATLAB's stream).
- Proof-based pure mathematics (see above).

**Claim:** *validated graduate computational subset* — not MATLAB parity.
