# Repository Guidelines

## Project Goals

A browser-only MATLAB-language interpreter that **mechanically proves** it correctly executes a graduate-level computational-mathematics subset — the parts MATLAB is good at *executing* — by validating against real MATLAB R2026a. It is **not** a MATLAB clone. The deliverable is the **trustworthiness of the "validated subset" claim**, not raw function count. Optimize for:

1. **Correctness parity** — match MATLAB to tolerance, or by convention-independent invariants (residuals, reconstruction norms, constraint satisfaction, sorted spectra) when outputs are not unique.
2. **No silently-wrong functions** — the engine is correct or it errors honestly; never plausible-but-wrong. Probe behavior before claiming a gap: most "missing" functions turn out already-implemented-but-unvalidated.
3. **Honest scope** — decline what cannot be cleanly oracle-validated rather than ship an unverified approximation, and record every decline as deliberate in the `docs/coverage-map.md` backlog. Breadth is not the goal; a credible validated core is.
4. **Coverage hygiene** — docs, counts, and scope stay in agreement. `docs/coverage-map.md` is the single source of truth for status and counts; do not duplicate counts elsewhere.

## Project Structure & Module Organization

This repository is a standalone React/Vite MATLAB-like sandbox. UI code lives in `src/`: components in `src/components/`, hooks in `src/hooks/`, providers in `src/providers/`, and shared styling in `src/style.css`. The interpreter/runtime lives in `matlab/`, with parser, values, builtins, linear algebra, graphics, I/O, symbolic helpers, and curated toolbox modules under `matlab/tb/`. Tests live in `matlab/test/`, split by kind: `matlab/test/oracle.test.ts` runs the MATLAB-oracle suite (one test per committed fixture in `matlab/test/oracle/`), and `matlab/test/ts-only/` holds the fixture-free TS-only tests (parser/semantics, FigureSpec, VFS I/O, error plumbing). So total tests = oracle fixtures + TS-only tests.

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

Every semantic change needs tests. Prefer MATLAB oracle cases for deterministic MATLAB behavior. Use TS-only tests (in `matlab/test/ts-only/`) for worker/UI behavior, graphics specs, error plumbing, and intentionally unsupported features. Add per-case tolerances for numerical results and avoid raw comparison when MATLAB permits multiple valid outputs.

`docs/validation-strategy.md` is the method reference: the three validation modes (oracle / invariant / TS-only), when to decline, the probe-first → regenerate → leak-check → sync-counts workflow for adding a case, and the table of what *not* to lock for non-unique outputs. Read it before adding tests.

The systematic base/core triage campaign (**Pass 2A–2O**, recorded in `docs/coverage-map.md`) is **complete**: the bug-prone math-core and MATLAB-semantics surface has been swept by oracle/invariant tests, fixing 4 real silently-wrong/crashing bugs and documenting every divergence and decline. Further base/core validation is now **example/course-driven** — add a case when a specific workflow needs a function, not to drive down the uncategorized count. The remaining unclassified surface is the lower-priority display/UI/table/VFS/alias tail.

## Commit & Pull Request Guidelines

Keep commits focused and descriptive. PRs should state the runtime surface changed, tests added, oracle fixtures updated, and any unsupported behavior intentionally left out. Link screenshots only for UI changes.
