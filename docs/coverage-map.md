# Coverage Map

The declared scope and the oracle-verified status of each area. The target is
**MATLAB-executable undergraduate and graduate *applied/computational* mathematics**
— not proof-based pure math (see "Out of scope" below). Coverage is measured by
tagged oracle cases (`matlab/test/oracle/cases.ts`); run the report with:

```bash
pnpm oracle:coverage
```

**Status (as of this revision):** 857 tests green · 722 MATLAB oracle fixtures ·
722/722 cases classified across 22 domains.

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
| Low-rank / SVD subspaces (`svds`, truncated-SVD / Eckart–Young) | ✓ |
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
| Preconditioned Krylov (`pcg`+`ichol`, `gmres`+`ilu`) | ✓ |
| Stiff ODE / stability regions (`ode15s`, A-stability functions, stability regions) | ✓ |
| Crank–Nicolson / implicit PDE (CN, backward-Euler, ADI heat) | ✓ |
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

The qualifier is *as theorem-proving*. The **computational** face of these fields
is in scope and is covered: e.g. the `topology` domain computes homology
numerically (Betti numbers via boundary-matrix rank, connected components across a
filtration) — that is "run a script, compare output," not proving homeomorphisms.
Likewise `number-theory` and `coding` cover algorithmic/finite-field computation,
not abstract-algebra theorem-proving.

**Scope statement:** *100% coverage of declared graduate computational-math
workflows — not 100% of all graduate mathematics.*

---

## Backlog status

The backlog is bucketed so it does not accidentally reintroduce MATLAB-clone
ambitions. The computational contract is the target; runtime/IO breadth is not.

### Required

None currently.

The previous proposed gaps were rechecked against MATLAB R2026a and the sandbox
registry. They were either already implemented, intentionally out of scope, not
MATLAB function names, or real functions deliberately declined on parity grounds.
This is the canonical list of declined/non-existent functions.

- `khatriRao`: not a MATLAB R2026a function (`exist("khatriRao") == 0`). Do not
  implement as part of MATLAB-compatible coverage.
- `gammapdf`: incorrect name. MATLAB uses `gampdf`, which is already implemented
  and oracle-validated.
- `wronskian`: not a MATLAB R2026a function (`exist("wronskian") == 0`; calling it
  errors). The engine's "undefined function" already matches MATLAB — do not
  implement it as MATLAB-compatible coverage.
- `sobolset`: a **real** MATLAB function, but **deliberately declined** — matching
  its Sobol points requires MATLAB's specific Joe–Kuo direction-number tables,
  which is not a cheap/clean oracle-parity target. `haltonset`+`net` already give
  deterministic quasi-Monte-Carlo coverage. A scope decision, not a TODO.

Recently closed (multi-output forms now implemented + oracle-validated):
`[p,S,mu] = polyfit` (centered/scaled), `[L,U,P,Q] = lu` (sparse, `P*A*Q = L*U`),
`diag` of a symbolic matrix (extract + construct), symbolic polynomial `gcd`.

**Registered toolboxes (7):** comm, control, dsp, optim, signal, stats, symbolic —
the in-scope numerical/matrix domains. Out-of-scope / low-value domain toolboxes are
**de-registered** (source kept under `matlab/tb/`, not exposed at runtime) so the
"oracle-checked toolbox" claim isn't overstated: images (image processing), mapping
(geodesy), nav (navigation/coordinate frames), nnet (deep-learning layers/training),
rl (reinforcement learning), econ (econometrics), pde (PDE-Toolbox object/mesh
machinery — PDEs are covered by the `numerical-pde` domain's inline finite-difference
cases), curvefit (B-spline object subsystem — base `spline`/`polyfit`/`interp` cover
the workflows). None were used by any oracle case. Calling them now returns
"undefined function", matching MATLAB without those toolboxes.

`signal`, `stats`, `dsp`, `control`, and `comm` are additionally **curated per
function** via the `TOOLBOX_KEEP` allow-list in `tb/index.ts`: `signal` 167→25
(filter design/response, filtering, spectral estimation, common windows), `stats`
181→64 (the 8 core distribution families + the validated inference suite +
statistical-algebra core), `dsp` 24→1 (only the validated overlap `resample`),
`control` 74→49 (model objects/data/conversions, analysis, realizations,
Riccati/Lyapunov, responses — PID/LQG/frd/random-gen tail de-registered), `comm`
47→29 (coding theory + GF(p) finite-field arithmetic + conversions — modulation/
telecom/RF tail de-registered). The peripheral tails are de-registered, source
preserved. Registry total: 855→256 registered builtins.

Note: registered ≠ validated. `pnpm oracle:audit` reports the **whole runtime
registry** in two layers: the curated **toolboxes** (256 registered, ~55%
oracle-referenced, up from 12% before curation) and the **base/core builtins**
(~1318 registered, ~20% referenced). The toolbox ratio is the meaningful curation
metric; the base/core ratio is a large *undercount* because the name scan only sees
the headline function in each case, while base primitives (`size`/`zeros`/`colon`/
indexing/`sum`/`sqrt`/…) run in nearly every case unnamed. Base/core is a triage
target (validate / move out genuine breadth), not a quarantine target — core
primitives can't be de-registered. Always read the audit output, not a raw
`Object.keys(tb.builtins)` source count (that includes quarantined functions which
error at runtime — the source-vs-registry gap). Kept-but-unreferenced toolbox
functions are core-math candidates scheduled for validation; `symbolic` is the
largest remaining toolbox tail.

### Validate existing (implemented + oracle-validated)
All oracle-validated — no validation backlog remains:
- **Decompositions / matrix functions:** `eig`/`svd`/`qr`/`lu`/`chol`,
  `schur`/`hess`/`polyeig`, `expm`/`sqrtm`/`logm`, `pinv`/`rank`/`null`/`orth`/`rref`/`cond`
- **Iterative / sparse solvers:** `gmres`/`minres`/`bicg`/`bicgstab`/`lsqr`, `eigs`/`svds`
  — validated by residual norm + convergence flag on sparse/ill-conditioned systems
  (incl. `ilu`/`ichol`-preconditioned and a preconditioned-vs-unpreconditioned
  invariant). The Krylov backend solves directly, so iteration counts and exact
  `relres` are **not** oracle-locked (only the result: solution residual + `flag==0`).
- **ODE / DAE:** `ode45`/`ode23`/`ode113`/`ode15s`/`deval`; implicit DAE workflow
  `ode15i` (residual form `F(t,y,y')=0`, index-1 algebraic constraint) + `decic`
  (consistent initial conditions)
- **Optimization:** `fminbnd`/`fminsearch`/`fsolve`/`quadprog`/`lsqlin`/`linprog`
- **Approximation:** `interp2`/`interpn`/`ppval`/`makima`/`polyvalm`/`residue`
- **Fourier / signal:** `fft2`/`fftshift`/`hilbert`/`findpeaks`; filter design +
  response `butter`/`fir1`/`freqz`/`filtfilt`/`resample`
- **Control:** `tf`/`ss`/`zpk`, `step`/`impulse`/`lsim`/`margin`/`bode`, `lqr`,
  `care`/`dare`, `ctrb`/`obsv`, `acker`/`place` (placed-pole invariant), `lqe` and
  `kalman` (estimator gain + Riccati residual; `kalman` maps the noise inputs through
  `G*Q*G'`), `c2d` (ZOH, pole-mapping invariant), `stepinfo` (grid-approximate),
  `tfdata`/`ssdata` (Markov-parameter invariant).
- **Graph:** `shortestpath`/`conncomp`/`distances`/`toposort`/`centrality`/`maxflow`/`minspantree`
- **Statistics:** distribution `*pdf`/`*cdf`/`icdf`, `var`/`std`/`corrcoef`/`cov`
- **Symbolic CAS:** `jacobian`/`hessian`/`taylor`/`laplace`/`dsolve`/`vpasolve`

Functions with non-unique outputs are validated by invariants rather than raw
value equality (e.g. `linprog` objective value, `residue` sorted poles, `eig`
reconstruction residual, `svd`/`qr` sign conventions, graph path length).

### Inferential statistics / unsupervised ML (implemented + oracle-validated)
Hypothesis tests: `ttest`/`ttest2`, `kstest` (one-sample, exact Marsaglia–Tsang–Wang
+ Birnbaum–Tingey one-sided), `kstest2`, `vartest`, `chi2gof` (controlled
`Ctrs`/`Edges`+`Frequency`+`Expected`+`NParams` form; auto-binning default is
best-effort), `anova1`, `signrank`, `ranksum`. Clustering / projection:
`kmeans` (deterministic via `'Start'`), `pca` (validated on `latent`), `knnsearch`,
`pdist`. `chi2gof`'s raw-data auto-binning is **not** locked (MATLAB's default
binning is version-sensitive). Quasi-Monte-Carlo: `haltonset`+`net` (deterministic
low-discrepancy points — base = first *d* primes, unscrambled; validated by point
grid and QMC integral estimates). Robust regression: `robustfit` (IRLS, bisquare +
huber), inline Theil–Sen median slope. Structured linear algebra: `toeplitz` solve
(residual invariant), `levinson` (Yule–Walker, validated by the Toeplitz
normal-equations residual). `sobolset` is deliberately **not** implemented — see
the declined-functions list under **Required** above.

### Deferred (real, but only if course-driven)
Large model-object families (`fitlm`/`fitglm`/`fitcsvm`/`fitctree`/`fitrgp`),
full table/timetable ecosystem (`retime`/`synchronize`/`stack`/`unstack`),
`anova2`/`kruskalwallis`/`multcompare`.

### Out of scope (clone ambitions — explicitly not requirements)
- Language runtime: `classdef`, `arguments`, real `global`/`persistent`,
  `evalin`/`assignin`, path model (`addpath`/`rmpath`/`path`/`genpath`).
- I/O needing host APIs: `webread`/`webwrite`, `imread`/`imwrite`,
  `audioread`/`audiowrite`, `matfile`, `savefig`/`openfig`, `xmlread`.
- RNG output parity: `mvnrnd`/`bootstrp`/`datasample` and any exact
  random-output oracle comparison (`rng`-fixing won't reproduce MATLAB's stream).
- Proof-based pure mathematics (see above).

**Claim:** *validated graduate computational subset* — not MATLAB parity.
