# Repository Guidelines

## Project Structure & Module Organization

This repository is a standalone React/Vite MATLAB-like sandbox. UI code lives in `src/`: components in `src/components/`, hooks in `src/hooks/`, providers in `src/providers/`, and shared styling in `src/style.css`. The interpreter/runtime lives in `matlab/`, with parser, values, builtins, linear algebra, graphics, I/O, symbolic helpers, and curated toolbox modules under `matlab/tb/`. Tests live in `matlab/test/`; MATLAB oracle cases are in `matlab/test/oracle/`.

## Build, Test, And Development Commands

- `pnpm install` installs dependencies using the pinned pnpm version.
- `pnpm dev` starts the Vite development server.
- `pnpm build` type-checks and builds the app.
- `pnpm test` compiles the test target and runs Node tests.
- `pnpm oracle:generate` regenerates MATLAB oracle fixtures using the local MATLAB install.
- `pnpm exec tsc -p tsconfig.test.json && node matlab/test/oracle/coverage.mjs` prints coverage by tagged oracle cases.

## Coverage Contract

The project targets a **validated graduate computational mathematics subset**, not MATLAB parity. Covered domains are numerical linear algebra (incl. structured solves like Toeplitz/Levinson), optimization, ODE/DAE and PDE methods, approximation/interpolation, Fourier/signal methods, statistics/probability (incl. inferential hypothesis tests and robust regression), quasi-Monte-Carlo, unsupervised machine learning (clustering, PCA, nearest-neighbour), graph computation, and symbolic calculus smoke coverage. `docs/coverage-map.md` is the authoritative per-area status and case count; do not duplicate counts here (they drift).

Do not add features merely because MATLAB has them. New behavior must fit the declared computational contract in `docs/coverage-map.md` and `docs/supported-subset.md`. Explicit non-goals include `classdef`, `arguments`, full path semantics, host/network/binary I/O, exact RNG stream parity, large model-object APIs, GUI/App Designer, and proof-based pure math. Some real MATLAB functions are also **deliberately declined** when matching them is not a cheap/clean oracle-parity target — e.g. `sobolset` (Sobol QMC) needs MATLAB's specific Joe–Kuo direction-number tables, so it is intentionally not implemented; `haltonset` already provides deterministic QMC coverage. The canonical list of declined/non-existent functions (with rationale) lives in the `docs/coverage-map.md` backlog.

Functions with non-unique outputs should be tested by invariants, not raw equality: examples include `linprog` objective/constraints, `residue` reconstruction, eigenspace reconstruction, SVD/QR sign conventions, and graph path length.

## Coding Style & Naming Conventions

Use TypeScript with strict types. Prefer existing value helpers and runtime patterns over new abstractions. Keep edits scoped. Use ASCII unless the edited file already uses non-ASCII. Runtime functions should preserve MATLAB column-major, 1-based, value-copy semantics.

## Testing Guidelines

Every semantic change needs tests. Prefer MATLAB oracle cases for deterministic MATLAB behavior. Use TS-only tests for worker/UI behavior, graphics specs, error plumbing, and intentionally unsupported features. Add per-case tolerances for numerical results and avoid raw comparison when MATLAB permits multiple valid outputs.

## Commit & Pull Request Guidelines

Keep commits focused and descriptive. PRs should state the runtime surface changed, tests added, oracle fixtures updated, and any unsupported behavior intentionally left out. Link screenshots only for UI changes.
