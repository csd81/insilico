# Graduate Computational Math Coverage Plan

## Goal

Define the implementation and validation work required to honestly claim that the sandbox covers graduate-level computational mathematics suitable for MATLAB-style execution.

This does not mean all graduate mathematics. It means graduate computational workflows across numerical linear algebra, optimization, ODE/PDE methods, approximation, Fourier/signal methods, statistics, graph computation, and symbolic calculus.

## Must Implement

### Core Runtime

- `arguments ... end` blocks, at least basic validation or no-op parsing.
- `persistent` variables.
- Better path model: `addpath`, `rmpath`, `path`, `genpath`.
- Simple `save` and `load` workflows.
- `imread` and `imwrite` for image/matrix workflows.
- `audioread` and `audiowrite` if signal processing remains in scope.

### Numerical Linear Algebra

- `khatriRao`.
- Stronger `eigs` and `svds` behavior if current implementations are simplified.
- Robust sparse workflows around `spdiags`, `ichol`, `ilu`, `pcg`, `gmres`, `bicgstab`, and `lsqr`.
- Graduate examples for conditioning, Krylov methods, low-rank approximation, and regularization.

### Optimization

- `optimvar`.
- `optimproblem`.
- `solve` for simple problem-based optimization.
- `fminunc`.
- `fmincon`.
- `lsqnonlin`.
- `lsqcurvefit`.
- `lsqlin`.
- Stronger oracle validation for `linprog`, `quadprog`, and `intlinprog`.

### Statistics And Machine Learning

- `fitlm`.
- `fitglm`.
- `glmval`.
- `anova`.
- `kstest`.
- `chi2gof`.
- `bootstrp`.
- `datasample`.
- `mvnrnd`.
- `gammapdf`.
- `pca`.
- `kmeans`.
- `knnsearch`.
- `rangesearch`.
- Optional: `fitcsvm`, `fitctree`, `fitcknn`, and `fitrgp`.

### ODE And PDE

- `odeset`.
- `odeget`.
- `deval`.
- `ode23`.
- `ode113`.
- `ode15s`.
- `bvp4c`.
- `pdepe`.
- Finite-difference PDE examples: heat, wave, and Poisson equations.
- Small finite-element assembly helpers or examples.

### Approximation And Interpolation

- `interp2`.
- `interp3`.
- `interpn`.
- `griddedInterpolant`.
- `scatteredInterpolant`.
- `pchip`.
- `makima`.
- `ppval`.
- `mkpp`.
- `unmkpp`.
- `polyvalm`.
- `residue`.

### Fourier And Signal Methods

- `fft2`.
- `ifft2`.
- `fftn`.
- `ifftn`.
- `fftshift`.
- `ifftshift`.
- `spectrogram`.
- `stft`.
- `istft`.
- `hilbert`.
- `findpeaks`.
- `resample`.
- `periodogram`.
- `pwelch`.

### Graph And Network Math

- `shortestpath`.
- `distances`.
- `centrality`.
- `conncomp`.
- `bfsearch`.
- `dfsearch`.
- `minspantree`.
- `maxflow`.
- `toposort`.

### Symbolic And CAS

- Stronger `assume`, `assumeAlso`, and `assumptions`.
- Stronger `solve`.
- Stronger `vpasolve`.
- Stronger `dsolve`.
- `symmatrix`.
- Reliable `jacobian`, `hessian`, `taylor`, `laplace`, `ilaplace`, `fourier`, and `ifourier`.

## Must Validate

Even when already implemented, these functions need MATLAB-oracle coverage before they count toward graduate readiness:

- `eig`, `svd`, `qr`, `lu`, `chol`, `ldl`.
- `pinv`, `rank`, `null`, `orth`, `rref`, `cond`.
- `expm`, `sqrtm`, `logm`.
- `pcg`, `gmres`, `lsqr`.
- `linprog`, `quadprog`, `fsolve`.
- `ode45`.
- `fft`, `ifft`, convolution, and filtering.
- Sparse matrix construction and sparse solving.
- Symbolic `diff`, `int`, `subs`, and `solve`.

## Coverage Definition

A domain is covered only when:

- The supported functions are implemented.
- MATLAB-oracle fixtures cover representative, edge, and failure cases.
- Known unsupported behavior is documented explicitly.
- Numerically sensitive results use per-case tolerances.
- Non-deterministic tests fix `rng`.

## Acceptable Claim

After the implementation and validation work above, the honest claim is:

> This sandbox covers graduate-level computational mathematics across numerical linear algebra, optimization, ODE/PDE methods, approximation, Fourier/signal methods, statistics, graph computation, and symbolic calculus, with MATLAB-oracle tests for supported workflows.

Do not claim complete coverage of all graduate mathematics.
