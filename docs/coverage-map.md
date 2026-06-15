# Coverage Map

This document records the declared scope and oracle-verified coverage of the
MATLAB-like sandbox. The target is **MATLAB-executable undergraduate and graduate
applied/computational mathematics**, not MATLAB parity and not proof-based pure
math.

Coverage is measured by tagged oracle cases in `matlab/test/oracle/cases.ts`.

```bash
pnpm oracle:coverage
pnpm oracle:base-audit
pnpm oracle:audit
```

**Status (as of this revision):** 1058 tests green · 918 MATLAB oracle fixtures ·
918/918 oracle cases classified across 22 domains.

`✓` = oracle-verified against real MATLAB · `~` = partial / bounded subset ·
`n/a` = deliberately not oracle-comparable.

## Validation Contract

The project validates a **declared computational subset**. New runtime behavior
should be added only when it is:

- validated against real MATLAB,
- needed by a course/example workflow, or
- clearly math-adjacent and scheduled for validation.

Non-unique outputs are checked by invariants rather than raw equality. Examples:
eigenspace reconstruction, SVD/QR sign conventions, sparse ordering
permutations, graph path length, `linprog` objective/constraints, and `residue`
reconstruction.

The runtime is intentionally not a full MATLAB clone. Explicit non-goals include
`classdef`, `arguments`, full path semantics, host/network/binary I/O, exact RNG
stream parity, GUI/App Designer, and proof-based pure math.

## Core Language And Array Semantics

| Area | Status | Notes |
|---|---:|---|
| Matrix construction, indexing, colon, `end`, deletion, growth | ✓ | Includes column-major linear indexing and growth from `[]`. |
| Broadcasting / implicit expansion | ✓ | Scalar, row/column, comparison, zero-size edge cases. |
| Empty matrix algebra | ✓ | `sum`/`prod`/`max` with dimension arguments and shape preservation. |
| N-D shape semantics | ✓ | `permute`/`ipermute`, `shiftdim`, `squeeze`, `ndims`, `repelem`, `tensorprod`. |
| Struct and cell semantics | ✓ | Struct arrays, comma-list extraction, nested structs, `cell2mat`/`mat2cell`/field helpers. |
| Integer and bit semantics | ✓ | Saturating casts, `typecast`, `swapbytes`, `idivide`, typed bit ops. |
| Strings/text basics | ~ | Common `str*`, `contains`, split/trim/replace covered; broader text tail is demand-driven. |
| Type and matrix predicates | ✓ | `isscalar`/`isvector`/`isrow`/`iscolumn`/`ismatrix`/`islogical`/`isfinite`/`isreal` and `issymmetric`/`ishermitian`/`isdiag`/`istriu`/`istril`/`isbanded`/`issparse`; plus set/sort helpers `issorted`/`issortedrows`/`ismembertol`/`allunique`/`numunique`. |
| Named operator functions | ✓ | `plus`/`minus`/`times`/`mtimes`/`uplus`/`uminus`/`rdivide`/`ldivide`/`mpower` called directly. |
| Graphics, VFS, display, validators, RNG plumbing | n/a | TS-only or browser-runtime behavior; MATLAB oracle is the wrong validator. |

Known fixed bugs from this category: `tensorprod` N-D result shape, typed bit-op
width/class preservation, `pagenorm(A,'fro')` char-argument parsing, `corr(x,y)`
scalar cross-correlation, and `spectrogram` scalar window length.

**Removed to match MATLAB R2026a** (all `exist == 0` — the engine previously implemented
them, overstating compatibility): `isposdef`, `sumsq`, `meansq`, `iscomplex` (use
`~isreal`) are now deleted from `builtins.ts` so the engine errors "undefined function"
exactly like MATLAB. Likewise `bin2gray`/`gray2bin` were **unregistered** from the `comm`
allow-list. (Probed directly: each errors in MATLAB R2026a; `normest`/`mink`/`maxk` are
real and validated.)

## Numerical Linear Algebra

| Area | Status | Notes |
|---|---:|---|
| Dense linear systems and decompositions | ✓ | `\`, `inv`, `det`, `rank`, `null`, `orth`, `rref`, `eig`, `svd`, `qr`, `lu`, `chol`. |
| Advanced decompositions | ✓ | `schur`, `hess`, `polyeig`, `qz`, `ordqz`, `ordschur`, `cdf2rdf`, `rsf2csf`. |
| Matrix functions | ✓ | `expm`, `sqrtm`, `logm`, matrix powers. |
| Sparse basics and structure | ✓ | `sparse`, `full`, `spdiags`, `speye`, `spalloc`, `spconvert`, `spfun`, `spones`. |
| Sparse orderings | ✓ | `symrcm`, `colamd`, `amd`, `dmperm`, `etree`, `symamd`, `colperm`, validated by invariants. |
| Iterative and preconditioned solvers | ✓ | `pcg`, `gmres`, `minres`, `bicg`, `bicgstab`, `cgs`, `lsqr`, `ilu`, `ichol`. |
| Pagewise N-D linear algebra | ✓ | `pagemtimes`, `pageinv`, `pagemldivide`, `pagepinv`, `pageeig`, `pagesvd`, etc. |
| Structured LA | ✓ | `toeplitz`, `levinson`, `hankel`, `compan`, `vander`, `hilb`, `pascal`, `wilkinson`. |
| Test matrices | ✓ | `invhilb`, `rosser`, `peaks`, `bucky`, `membrane`, `magic`, `gallery` (validated by exact entries + structural invariants). |
| Generalized SVD | ✓ | `gsvd` one-output values **and** the full 5-output `[U,V,X,C,S]` for the real full-column-rank case (validated by factorization invariants `A=U·C·X'`, `B=V·S·X'`, `U/V` orthonormal, `C'C+S'S=I` + MATLAB shapes). Honest errors for complex / rank-deficient / degenerate / mismatched-column inputs. |

## Approximation, Interpolation, And Numerical Methods

| Area | Status | Notes |
|---|---:|---|
| Polynomial workflows | ✓ | `polyfit`, centered/scaled `[p,S,mu]`, `polyval`, `roots`, `polyint`, `polyder`, `polyvalm`. |
| 1-D and N-D interpolation | ✓ | `interp1`, `interp2`, `interp3`, `interpn`, `pchip`, `makima`, `spline`. |
| Piecewise-polynomial helpers | ✓ | `mkpp`, `unmkpp`, `ppval`, `csape`, `csapi`, `fnval`, `fnder`, `fnint`, `fnbrk`. |
| Scattered/grid interpolation objects | ✓ | `griddedInterpolant`, `scatteredInterpolant`, `griddata`, `dsearchn`. |
| Quadrature and course methods | ✓ | Trapezoid, Simpson, Gauss, `integral`, `integral2`, textbook Euler/RK4 workflows. |
| Known divergence | ~ | 3-point not-a-knot spline representation differs, but evaluated values match. |
| Declined | n/a | `griddatan` is not a clean oracle target for the probed inputs. |

## ODE, DAE, PDE, And FEM-Adjacent Workflows

| Area | Status | Notes |
|---|---:|---|
| Explicit ODE basics | ✓ | Euler, Heun, RK4, systems, `ode45`, `ode23`, `ode113`. |
| Stiff and implicit ODE/DAE | ✓ | `ode15s`, `ode15i`, `decic`, `ode23s`, `ode23t`, `ode23tb`, `deval`. |
| Higher-order ODE variants | ✓ | `ode78`, `ode89`, validated by accuracy invariants. |
| BVP and DDE smoke | ✓ | `bvp4c`, `bvp5c`, `dde23`; option/evaluation helpers are partially covered. |
| PDE finite differences | ✓ | Poisson, explicit/implicit heat, Crank-Nicolson, ADI heat, 1-D/2-D wave. |
| `pdepe` workflows | ✓ | Known-solution / reaction-diffusion style cases. |
| FEM weak-form workflows | ✓ | 1-D stiffness assembly + 2-D triangular-mesh Poisson (assemble linear-element stiffness/load, apply Dirichlet BCs, solve), validated by center value + symmetric-PSD stiffness + zero residual. Adaptive meshing remains out of scope. |
| Out of runtime scope | n/a | PDE Toolbox object/mesh app machinery is de-registered; numerical PDE scripts stay in scope. |

## Optimization And Discrete Algorithms

| Area | Status | Notes |
|---|---:|---|
| Smooth unconstrained / nonlinear solve | ✓ | `fminbnd`, `fminsearch`, `fminunc`, `fsolve`. |
| Constrained / least-squares | ✓ | `linprog`, `quadprog`, `lsqlin`, `lsqnonlin`, `lsqcurvefit`, `lsqnonneg`, `lsqminnorm`. |
| Integer programming workflows | ✓ | `intlinprog` knapsack, assignment, set cover style cases. |
| Graph optimization | ✓ | `maxflow` plus min-cut invariant, `minspantree`, shortest paths. |
| Global optimizers | n/a | RNG-driven solvers are not exact-oracle comparable. |
| Conic (SOCP) | ✓ | `coneprog`/`secondordercone` validated on a tiny SOCP by objective + cone-constraint satisfaction. Fixed: `fmincon` now uses penalty continuation (best-feasible tracking + divergence guard), so the cone constraint is enforced. `fseminf` deferred (niche). |
| Problem-based optimization objects | deferred | `optimvar`/`optimproblem` style APIs are model-object surface, not required for the computational subset. |

## Fourier, Signal, And DSP Math

| Area | Status | Notes |
|---|---:|---|
| FFT family | ✓ | `fft`, `ifft`, `fft2`, `ifft2`, `fftn`, `ifftn`, shifts, roundtrip invariants. |
| Convolution/correlation | ✓ | `conv`, `conv2`, `convn`, `xcorr`, `xcov`. |
| Filter design/response | ✓ | `butter`, `fir1`, `freqz`, `filtfilt`, `filter`, `resample`. |
| Spectral estimation | ✓ | `pwelch`, `spectrogram`, `stft` validated with explicit parameters / invariants. |
| Signal features | ✓ | `hilbert`, `findpeaks`, windows, square waves, overshoot. |
| Remaining tail | ✓ | `nufft` (magnitude), `xcov`, `filter2` validated; `nufftn` and display/plot-oriented signal helpers remain demand-driven. |

Known fixed bug: `spectrogram` ignored scalar window-length input.

## Statistics, Probability, And ML Math

| Area | Status | Notes |
|---|---:|---|
| Descriptive statistics | ✓ | `mean`, `median`, `var`, `std`, `cov`, `corrcoef`, `corr`, `mode`, percentiles, `zscore`. |
| Distributions | ✓ | Core `*pdf`/`*cdf`/`icdf`, distribution objects, fitted distribution smoke. |
| Hypothesis tests | ✓ | `ttest`, `ttest2`, `kstest`, `kstest2`, `vartest`, `chi2gof`, `anova1`, `signrank`, `ranksum`. |
| Diagnostics / density | ✓ | `isoutlier`, `islocalmax`, `islocalmin`, `lscov`, `ksdensity` (fixed bandwidth). |
| Robust / smoothing / missing-data | ✓ | `robustfit`, Theil-Sen workflow, `smoothdata`, `fillmissing`, `rmmissing`, `standardizeMissing`. |
| ML math smoke | ✓ | PCA/SVD, k-means with deterministic start, `knnsearch`, kernel ridge workflow, k-NN workflow. |
| Advanced tests / nonlinear fit | deferred | `anova2`/`kruskalwallis`/`multcompare`/`nlinfit` exist in MATLAB but not in the curated sandbox; add only if a course needs them (not object-heavy, but Stats-toolbox surface). |
| QMC / deterministic resampling | ✓ | `haltonset`+`net`, van der Corput, fixed-index bootstrap. |
| RNG-output workflows | n/a | Exact MATLAB stream parity is not a target. Validate stochastic methods by invariants only. |
| Large model objects | deferred | `fitlm`/`fitglm`/`fitcsvm`/`fitctree`/`fitrgp` are course-driven only. |

Known fixed bug: `corr(x,y)` returned a 2x2 matrix instead of scalar
cross-correlation.

## Graph, Geometry, Topology, And Mesh Math

| Area | Status | Notes |
|---|---:|---|
| Graph basics | ✓ | `graph`, `digraph`, `shortestpath`, `distances`, `conncomp`, `toposort`, degree/centrality. |
| Graph algorithms | ✓ | `maxflow`, `minspantree`, `matchpairs`, `allpaths`, `allcycles`, traversals, cycle basis, `isdag`, `findnode`, `isisomorphic`. |
| Computational geometry | ✓ | `convhull`, `convhulln`, `delaunay`, `delaunayn`, `voronoin`, `polyarea`, `inpolygon`, `volume`/`area` (alphaShape), coordinate transforms. |
| Triangulation objects | ✓ | `delaunayTriangulation`, `triangulation`, barycentric conversions, nearest/circumcenter/incenter/free boundary. |
| Topology smoke | ✓ | Betti numbers via boundary-matrix rank, Euler characteristic, filtration connected components. |
| Deeper topology | not targeted | Persistent homology libraries, simplicial-complex APIs, and proof-level topology are out of scope. |
| Mesh generation quality | ~ | Geometry primitives are covered; adaptive/high-quality mesh generation is not a declared target. |

Known fixed bugs: `neighbors(DT)` crashed for all-simplices form; `delaunayn`
returned no simplex for exactly d+1 points, collapsing 3-D `alphaShape` volume to 0.
Known parser quirk: whitespace before `(` inside `[]` can be parsed as indexing
where MATLAB treats it as element separation.

## Symbolic / CAS Boundary

| Area | Status | Notes |
|---|---:|---|
| Core calculus | ✓ | `diff`, `int`, `limit`, `subs`, `double(subs(...))`. |
| Symbolic linear algebra | ✓ | Symbolic matrices, `det`, `inv`, `\`, `eig`, `rank`, `charpoly`. |
| Polynomial algebra | ✓ | `factor`, `expand`, `collect`, `coeffs`, `numden`, `resultant`, discriminant workflow, `gcd`. |
| Transforms and ODE smoke | ✓ | `laplace`, `ilaplace`, `fourier`, `ztrans`, `dsolve`, `vpasolve`. |
| Vector calculus | ✓ | `gradient`, `curl`, `divergence`, vector-calculus identities by numeric substitution. |
| Symbolic convenience | ✓ | `vpa`, `matlabFunction`, `partfrac`, `pade`, `poly2sym`, `str2sym`, `horner`, `rewrite`, `polynomialDegree`. |
| Symbolic special functions | ✓ | `ellipticK`/`ellipticE`, `whittakerM`, `kummerU` at numeric points (`whittakerW` excluded — engine value ~0.1% off). |
| Piecewise / poles / vpa bridge | ✓ | `piecewise` (branch eval), `polynomialReduce` (univariate), `poles` (sorted), `vpaintegral` (finite **and improper** bounds), `vpasum`. |
| Symbolic assertions / division | ✓ | `isAlways` (fixed — relational/identity semantics), `quorem` (fixed — symbolic polynomial long division `p=q·d+r`). |
| Assumptions/display/introspection tail | ~ | Much of `assume*`, `symType`, `latex`, `pretty`, etc. is low-value for computational coverage. |
| Symbolic-tail (still deferred) | ~ | `combine`/`isolate` error on symbolic input (CAS-depth); validated where correct. |
| Serious CAS completeness | not targeted | Groebner bases, quantifier elimination, full assumption logic, and Risch-style integration are out of scope unless a course workflow demands a MATLAB-present subset. |

See `docs/symbolic-boundary.md` for the precise supported symbolic subset.

## Coding, Information Theory, And Number Theory

| Area | Status | Notes |
|---|---:|---|
| Information theory formulas | ✓ | Entropy, KL divergence, mutual information, BSC capacity. |
| Finite-field arithmetic | ✓ | GF add/mul/sub/div, polynomial multiply/divide, primitive/minimal polynomials. |
| Coding theory smoke | ✓ | Hamming, cyclic, convolutional coding, generator/parity checks, syndrome decode workflow. |
| Base conversions | ✓ | `bi2de`, `de2bi`, `oct2dec`, `oct2poly`, related helpers. |
| Number theory basics | ✓ | `gcd`, `lcm`, `factor`, `isprime`, `primes`, `powermod`, CRT/extended-Euclid style workflows. |
| Crypto-grade number theory | not targeted | Elliptic curves, serious factoring/primality, finite-field crypto systems are outside MATLAB's natural core. |
| Coding tail | ✓ | Resolved: `bin2gray`/`gray2bin` are undefined in MATLAB R2026a, so they were **unregistered** from the `comm` allow-list (the engine now errors to match). |

## Registered Runtime Surface

Registered toolboxes are limited to in-scope numerical/matrix domains:

- `comm`
- `control`
- `dsp`
- `optim`
- `signal`
- `stats`
- `symbolic`

Out-of-scope domain toolboxes are de-registered but source is retained under
`matlab/tb/`: images, mapping, nav, nnet, rl, econ, pde, curvefit, plus previously
quarantined domain breadth. Calling those functions now returns "undefined
function", matching MATLAB without the corresponding toolbox.

Toolboxes are curated by allow-list. Run `pnpm oracle:audit` for the current
registered/referenced breakdown. Registered does **not** mean every function is
validated; coverage is per oracle case.

Base/core builtins are judged by `pnpm oracle:base-audit`, not by raw reference
percentage. Many core primitives are exercised indirectly and rarely appear as
named tokens.

## Remaining Backlog By Category

This is a demand-driven triage pool, not a promise to implement all MATLAB
breadth.

| Category | Status / Decision |
|---|---|
| Core predicates | ✓ validated: `isscalar`, `isvector`, `isrow`, `iscolumn`, `ismatrix`, `isfinite`, `isreal`, `issparse`. (`iscomplex` removed — not a MATLAB function; use `~isreal`.) |
| Matrix predicates | ✓ validated: `issymmetric`, `ishermitian`, `isdiag`, `istriu`, `istril`, `isbanded`. (`isposdef` removed — not a MATLAB function; use `chol`/`eig`.) |
| Named operator forms | ✓ validated: `plus`, `minus`, `times`, `mtimes`, `rdivide`, `ldivide`, `mpower`, `uplus`, `uminus`. |
| Norm / reduction helpers | ✓ validated: `vecnorm`, `normest`, `mink`, `maxk`. (`sumsq`/`meansq` removed — not MATLAB functions.) |
| Remaining string/text helpers | Lower priority unless course examples require them. |
| Symbolic display/introspection | Mostly unregister/defer candidates unless needed: `pretty`, `latex`, `sympref`, `argnames`, `children`, `assumptions`, `symType`, etc. |
| Plot-only helpers | Prefer numeric APIs; plot-object helpers like `bodemag` are low priority. |
| RNG functions | Invariant/smoke only; exact oracle parity is not valid. |
| Table/timetable/categorical/datetime | Deferred unless course-driven. |
| Large model-object APIs | Deferred unless course-driven. |

## Function Inventory By Domain

This appendix is intentionally compact. It lists the main MATLAB/runtime
functions represented by oracle cases or documented invariant workflows; it is
not a raw registry dump.

### Core Language / Array Semantics

`zeros`, `ones`, `eye`, `diag`, `cat`, `reshape`, `repmat`, `size`, `numel`,
`length`, `ndims`, `squeeze`, `permute`, `ipermute`, `shiftdim`, `repelem`,
`tensorprod`, `sum`, `prod`, `min`, `max`, `cumsum`, `cumprod`, `cummax`,
`cummin`, `find`, `sort`, `sortrows`, `unique`, `uniquetol`, `intersect`,
`setdiff`, `setxor`, `ismember`, `sub2ind`, `ind2sub`, `accumarray`,
`arrayfun`, `cellfun`, `cell2mat`, `mat2cell`, `num2cell`, `struct2cell`,
`cell2struct`, `fieldnames`, `rmfield`, `orderfields`, `setfield`, `getfield`,
`structfun`, `isfield`, `int8`, `int16`, `int32`, `int64`, `uint8`, `uint16`,
`uint32`, `uint64`, `single`, `double`, `cast`, `typecast`, `swapbytes`,
`idivide`, `intmin`, `intmax`, `flintmax`, `bitand`, `bitor`, `bitxor`,
`bitshift`, `bitget`, `bitset`, `bitcmp`, `sprintf`, `num2str`, `strcat`,
`strrep`, `strsplit`, `strtrim`, `contains`, `regexprep`, `upper`, `lower`,
`reverse`.

### Numerical Linear Algebra

`mldivide`, `inv`, `det`, `rank`, `null`, `orth`, `rref`, `cond`, `condest`,
`norm`, `pinv`, `trace`, `eig`, `eigs`, `svd`, `svds`, `qr`, `lu`, `chol`,
`ldl`, `schur`, `hess`, `qz`, `ordqz`, `ordschur`, `cdf2rdf`, `rsf2csf`,
`gsvd`, `polyeig`, `expm`, `sqrtm`, `logm`, `sylvester`, `balance`, `sparse`,
`full`, `speye`, `spdiags`, `nnz`, `nonzeros`, `spalloc`, `spconvert`,
`spfun`, `spones`, `spaugment`, `bandwidth`, `symrcm`, `colamd`, `amd`,
`dmperm`, `etree`, `symamd`, `colperm`, `sprank`, `pcg`, `gmres`, `minres`,
`bicg`, `bicgstab`, `cgs`, `lsqr`, `ilu`, `ichol`, `pagemtimes`, `pageinv`,
`pagemldivide`, `pagemrdivide`, `pagepinv`, `pageeig`, `pagesvd`, `pagenorm`,
`pagelsqminnorm`, `pagetranspose`, `pagectranspose`, `toeplitz`, `levinson`,
`hankel`, `compan`, `vander`, `hilb`, `pascal`, `wilkinson`, `hadamard`,
`gallery`, `qrupdate`, `qrinsert`, `qrdelete`, `cholupdate`.

### Approximation / Interpolation / Numerical Methods

`polyfit`, `polyval`, `roots`, `polyint`, `polyder`, `residue`, `polyvalm`,
`interp1`, `interp1q`, `interp2`, `interp3`, `interpn`, `interpft`, `griddata`,
`griddedInterpolant`, `scatteredInterpolant`, `dsearchn`, `spline`, `pchip`,
`makima`, `mkpp`, `unmkpp`, `ppval`, `csape`, `csapi`, `fnval`, `fnder`,
`fnint`, `fnbrk`, `integral`, `integral2`, `trapz`, `cumtrapz`, `gradient`,
`del2`, `deconv`.

### ODE / DAE / PDE

`ode45`, `ode23`, `ode113`, `ode15s`, `ode15i`, `ode23s`, `ode23t`,
`ode23tb`, `ode78`, `ode89`, `odeset`, `deval`, `decic`, `bvp4c`, `bvp5c`,
`bvpinit`, `dde23`, `pdepe`. Course/workflow cases also cover explicit Euler,
Heun, RK4, finite-difference Poisson, heat, Crank-Nicolson, ADI heat, wave
equations, upwind advection, and simple FEM stiffness assembly.

### Optimization / Discrete Algorithms

`fminbnd`, `fminsearch`, `fminunc`, `fmincon`, `fsolve`, `linprog`,
`quadprog`, `intlinprog`, `lsqlin`, `lsqnonlin`, `lsqcurvefit`, `lsqnonneg`,
`lsqminnorm`, `fminimax`, `fgoalattain`, `ga`. Validated workflows include
knapsack, assignment, set cover, least-squares residual checks, and
max-flow/min-cut invariants.

### Fourier / Signal / DSP

`fft`, `ifft`, `fft2`, `ifft2`, `fftn`, `ifftn`, `fftshift`, `ifftshift`,
`conv`, `conv2`, `convn`, `filter`, `filter2`, `xcorr`, `xcov`, `czt`,
`hilbert`, `findpeaks`, `periodogram`, `pwelch`, `spectrogram`, `stft`,
`butter`, `fir1`, `freqz`, `filtfilt`, `resample`, `hamming`, `hann`,
`hanning`, `kaiser`, `blackman`, `bartlett`, `triang`, `gausswin`, `rectwin`,
`square`, `overshoot`.

### Statistics / Probability / ML Math

`mean`, `median`, `var`, `std`, `cov`, `corrcoef`, `corr`, `corrcov`, `mode`,
`moment`, `range`, `iqr`, `mad`, `geomean`, `harmmean`, `prctile`, `quantile`,
`zscore`, `rms`, `rmse`, `normalize`, `rescale`, `detrend`, `smoothdata`,
`fillmissing`, `rmmissing`, `standardizeMissing`, `anynan`, `histcounts`,
`histcounts2`, `histc`, `discretize`, `squareform`, `pdist`, `pdist2`,
`ksdensity`, `ttest`, `ttest2`, `kstest`, `kstest2`, `vartest`, `chi2gof`,
`anova1`, `signrank`, `ranksum`, `robustfit`, `glmfit`, `pca`, `kmeans`,
`knnsearch`, `haltonset`, `net`, `makedist`, `fitdist`, `pdf`, `cdf`, `icdf`,
`normpdf`, `normcdf`, `norminv`, `normfit`, `betapdf`, `betacdf`, `betainv`,
`betafit`, `binopdf`, `binocdf`, `binoinv`, `poisspdf`, `poisscdf`,
`poissinv`, `gampdf`, `gamcdf`, `gaminv`, `gamfit`, `chi2pdf`, `chi2cdf`,
`chi2inv`, `tpdf`, `tcdf`, `tinv`, `fpdf`, `fcdf`, `finv`.

### Graph / Geometry / Topology

`graph`, `digraph`, `adjacency`, `degree`, `distances`, `shortestpath`,
`shortestpathtree`, `conncomp`, `centrality`, `maxflow`, `minspantree`,
`toposort`, `allpaths`, `allcycles`, `bfsearch`, `dfsearch`, `successors`,
`transclosure`, `transreduction`, `hascycles`, `cyclebasis`, `subgraph`,
`matchpairs`, `numedges`, `numnodes`, `convhull`, `convhulln`, `delaunay`,
`delaunayn`, `delaunayTriangulation`, `triangulation`, `pointLocation`,
`cartesianToBarycentric`, `barycentricToCartesian`, `nearestNeighbor`,
`circumcenter`, `incenter`, `freeBoundary`, `edges`, `neighbors`, `boundary`,
`alphaShape`, `voronoin`, `inpolygon`, `rectint`, `polyarea`, `cart2pol`,
`pol2cart`, `cart2sph`, `sph2cart`, `deg2rad`, `rad2deg`.

### Symbolic / CAS

`sym`, `syms`, `subs`, `double`, `diff`, `int`, `limit`, `solve`, `vpasolve`,
`dsolve`, `simplify`, `expand`, `collect`, `factor`, `coeffs`, `numden`,
`gcd`, `resultant`, `jacobian`, `hessian`, `gradient`, `curl`, `divergence`,
`laplace`, `ilaplace`, `fourier`, `ztrans`, `taylor`, `vpa`,
`matlabFunction`, `partfrac`, `poly2sym`, `str2sym`, `sym2poly`, `horner`,
`rewrite`, `polynomialDegree`, `simplifyFraction`, `equationsToMatrix`,
`finverse`, `charpoly`, `det`, `inv`, `eig`, `rank`.

### Special Functions

`besselj`, `bessely`, `besseli`, `besselk`, `besselh`, `airy`, `erf`, `erfc`,
`erfinv`, `erfcinv`, `erfcx`, `erfi`, `dawson`, `gamma`, `gammaln`,
`gammainc`, `gammaincinv`, `beta`, `betaln`, `betainc`, `betaincinv`,
`ellipke`, `ellipj`, `expint`, `sinint`, `cosint`, `fresnels`, `fresnelc`,
`zeta`, `hurwitzZeta`, `polylog`, `dilog`, `psi`, `legendre`, `legendreP`,
`chebyshevT`, `chebyshevU`, `hermiteH`, `laguerreL`, `jacobiP`,
`gegenbauerC`, `hypergeom`, `heaviside`, `dirac`, `lambertw`, `wrightOmega`,
`ei`, `logint`, `sinhint`, `coshint`, `ellipticK`, `ellipticE`, `whittakerM`,
`kummerU`. Reciprocal/hyperbolic trig: `sec`/`csc`/`cot`/`sech`/`csch`/`coth`/
`tanh` (+ `secd`/`cscd`/`cotd`). (`whittakerW` present but ~0.1% imprecise — not
locked.)

### Coding / Information Theory / Number Theory

`hammgen`, `cyclgen`, `cyclpoly`, `poly2trellis`, `convenc`, `istrellis`,
`biterr`, `symerr`, `finddelay`, `gfadd`, `gfsub`, `gfmul`, `gfdiv`,
`gfconv`, `gfdeconv`, `gfminpol`, `gfrank`, `gftrunc`, `gfweight`,
`gen2par`, `primpoly`, `rsgenpolycoeffs`, `bi2de`, `de2bi`, `oct2dec`,
`oct2poly`, `vec2mat`, `factor`, `factorial`, `gcd`, `lcm`, `isprime`,
`primes`, `powermod`, `nchoosek`.

## Declined Or Non-Targets

- `khatriRao`: not a MATLAB R2026a function in the available install; do not add
  as MATLAB-compatible surface.
- `gammapdf`: wrong name; MATLAB uses `gampdf`, already validated.
- `wronskian`: not present in the available MATLAB install; undefined-function
  behavior is correct.
- `sobolset`: real MATLAB function, deliberately declined because parity requires
  MATLAB's specific Joe-Kuo direction-number tables.
- `griddatan`, `trimmean`, `meansq`: declined for the probed/current environment
  rather than shipping questionable parity.
- Exact random-output parity: not a valid oracle target.

## Out Of Scope

Proof-based pure mathematics is not "run a script, compare output." Theorem
proving, formal verification, SMT/SAT solvers, full abstract algebra systems,
category theory, and proof-level topology are outside this project.

The computational face of those areas can still be in scope when it is executable
and MATLAB-like: finite-field arithmetic, numerical homology smoke, graph
algorithms, symbolic polynomial examples, and deterministic optimization
workflows.

**Claim:** validated graduate computational subset, not MATLAB parity.
