# Supported MATLAB Subset

This engine is **not** a full MATLAB language clone. It is a *computational MATLAB
subset* with strong numeric/matrix semantics, scoped for a numerical-methods course.
This document is the contract: what is supported, partially supported, and
intentionally out of scope. It is a contract, not a bug list — items under
"Intentionally unsupported" are deliberate scope decisions, not defects.

Behavior is mechanically verified against **real MATLAB** via the oracle suite
(`matlab/test/oracle/`, 728 committed fixtures) plus TS-only tests — 863 total,
all green. See `pnpm test`.

---

## Supported (oracle-verified core)

**Numeric arrays**
- Column-major storage, 1-based indexing, real + complex (`idata`), N-D arrays
- Integer/single classes (`int8`…`uint64`, `single`) with saturating casts
- Empty-matrix algebra: `sum([])→0`, `prod([])→1`, `size([])→[0 0]`, concat drops empties

**Operators**
- Elementwise (`+ - .* ./ .^`) and matrix (`* / \ ^`) operations
- Implicit expansion / broadcasting on elementwise ops and comparisons
- Transpose `.'` (swap) vs conjugate transpose `'` (negate imaginary)
- Complex domain transitions: `sqrt(-1)`, `log(-1)`, `asin(2)`, `(-8)^(1/3)`, …

**Indexing**
- Linear, 2-D, and N-D subscripts; logical masks (with MATLAB orientation rules)
- `end` (incl. arithmetic), colon ranges, reverse ranges
- Deletion `A(:,2)=[]`, growth-on-assignment `v(5)=x`, scalar colon-expand `A(:)=c`

**Linear algebra**
- `\` (polymorphic `mldivide`: triangular / square LU / least-squares), multiple RHS
- `inv`, `det`, `lu`, `qr`, `chol`, `eig`, `svd`, `norm`, `rank`, `trace`, `null`
- Matrix power `A^n`, `dot`, `cross`; eigenanalysis and Markov-chain workflows

**Control flow**
- `if/elseif/else`, `for`, `while`, `break`, `continue`, early `return`
- `switch/case/otherwise`, including cell-array cases (`case {1,2,3}`)
- `try/catch`; `catch ME` exposes `ME.message` and `ME.identifier`
- Short-circuit `&&` / `||` (the right operand is not evaluated when skipped)

**Functions**
- Function files, multiple outputs `[a,b]=f(...)`, ignored outputs `[~,b]=f(...)`
- `nargin`/`nargout`
- Anonymous functions with **snapshot** closures (capture-by-value at definition)
- Function handles, `feval`, `arrayfun`, `cellfun`
- Comma-separated-list expansion: `foo(C{:})`, `[a,b]=deal(...)`

**Value semantics**
- Strict value-copy: assignment and function arguments never alias
- Exceptions match MATLAB: `containers.Map` is a handle (shared); `dictionary` is a value (copied)

**Cells & structs**
- Construction, indexing, static field access (`s.f`), nested assignment (`S.a.b=1`)
- Struct arrays (`S(2).x=5`) with auto-filled empty fields; field extraction `[S.field]`; `fieldnames`

**Strings**
- Char arrays and the `string` class; `sprintf`, `num2str`, `strcat`, `strrep`,
  `upper`/`lower`, `regexprep`, `strtrim`, …

**Sparse**
- CSC storage; `sparse(i,j,v)`, `nnz`, `full`, `speye`, `spdiags`, sparse `\` and `*`

**Plotting** (as a serialisable `FigureSpec`, rendered by an SVG component)
- `plot`, `bar`, `stem`, `area`, `stairs`, `errorbar`, `scatter`, `hold`
- `subplot`, `tiledlayout`/`nexttile`, `title`/`xlabel`/`ylabel`, `legend`
- `xline`/`yline`, log scales (`semilogx`/`semilogy`), heatmap/`imagesc`
- `surf`/`mesh`/`trisurf` produce a valid spec (the lightweight renderer shows a
  placeholder for 3-D/polar — a UI limit, not an engine one)

**File I/O** (browser VFS)
- `readmatrix`/`writematrix`, `readtable`, `fopen`/`fgetl`/`fclose`, CSV, `.mlx` parse

**Numerical-methods backbone** (end-to-end course scripts, oracle-verified vs MATLAB)
- Root finding: bisection, secant, Newton
- Linear systems: Gaussian elimination (`\`), LU solve, Cholesky solve
- Interpolation: Newton divided-difference, linear (`interp1`), `pchip`, `spline`
- Quadrature: trapezoid, Simpson, 2-point Gauss, polynomial (`polyint`)
- ODE integration: explicit Euler, classical RK4

---

## Partially supported

| Area | Status |
|---|---|
| Toolboxes | **7 registered** (`matlab/tb/`): comm, control, dsp, optim, signal, stats, symbolic — the in-scope numerical/matrix domains. Out-of-scope domain toolboxes (images, mapping, nav, nnet, rl, econ, pde, curvefit) are **de-registered** (source kept, not exposed at runtime). `signal`, `stats`, and `dsp` are further **curated by per-toolbox allow-lists** (`TOOLBOX_KEEP` in `tb/index.ts`) to validated + core graduate functions; the peripheral tail (pulse/radar/telecom helpers, exotic windows, niche distributions) is de-registered, and `dsp` keeps only its one validated function (`resample`). Within registered toolboxes only a subset is oracle-validated — coverage is per case (`docs/coverage-map.md`), not per toolbox. Run **`pnpm oracle:audit`** for the per-toolbox registered/referenced breakdown. |
| Symbolic math (`sym`) | A small exact rule-based CAS — see **[symbolic-boundary.md](symbolic-boundary.md)** for the precise domain of validity. In brief: `diff` is complete; `int` is exact for polynomials/`sqrt`/linear-substitution/by-parts-forms/`1/(x^2+a^2)`/real-pole rational functions/improper bounds, and derivative-divides substitution `int(2x·exp(x^2))` (else unevaluated — no Risch); `limit` does substitution + symbolic & numeric L'Hôpital (else unevaluated — no Gruntz); `solve` does numeric polynomial roots + linear symbolic/literal equations + the quadratic formula with symbolic coefficients; symbolic matrices support `det`/`inv`/`*`/`\` (Cramer). `simplify`/`expand`/`collect`/`factor`/`taylor`/`jacobian`/`hessian`/`matlabFunction`/`laplace` present. Not full Symbolic Toolbox. |
| Tables / timetables | Construction, variable access, CSV import. Not the full join/groupby surface. |
| `datetime` / `duration` | Present; not exhaustively covered. |
| `categorical` | Present; basic operations. |
| N-D arrays | Numeric N-D is solid; N-D **cells/structs** are limited. |
| Dynamic struct fields | `s.(name)` is **not** parsed; use static `s.field`. `fieldnames` is supported. |
| `global` | Parsed but treated as a no-op (corpora don't rely on globals). |

---

## Intentionally unsupported

These are large language/runtime projects that don't serve a numerical-methods
course enough to justify the maintenance cost. Out of scope by design:

- **`classdef`** and OOP authoring — `properties`, `methods`, `events`,
  user-defined inheritance. (The internal `ClassV` exists only to back
  toolbox-style objects like `tf`/`ss`; it is not a user-facing class system.)
- **`varargin` / `varargout`** — variadic argument packing.
- **`persistent`** variables.
- **`arguments`** validation blocks.
- **Nested functions** and shared-scope (live) closures — anonymous snapshot
  closures are the supported model.
- **`parfor` / `spmd`** and parallel constructs.
- **Full `MException`** hierarchy — basic `try/catch` only; no identifier-based
  rethrow/cause chains.
- **GUI** — `uifigure`, App Designer, `uicontrol`, etc.
- **File formats** beyond CSV / MAT / MLX (no HDF5, netCDF, Excel-formula models).

---

## Design notes

- **Anonymous closures snapshot** their captured variables at definition time, so
  `a=10; f=@()a; a=99; f()` returns `10`. This matches MATLAB and is the only
  closure model supported.
- **`mldivide` parity is by result, not algorithm.** The engine routes by matrix
  shape/structure but does not replicate LAPACK's exact pivoting; results match
  MATLAB to tolerance for course-scale problems, with looser tolerances on
  least-squares and ill-conditioned systems.
- **Decomposition factors are not directly oracle-compared** (LU/QR sign and pivot
  conventions differ from LAPACK); the oracle compares convention-independent
  invariants (Cholesky `R`, singular values, sorted eigenvalues, solve results),
  and factor *reconstruction* is checked in TS-only tests.
