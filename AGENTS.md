# Repository Guidelines

## Project Structure & Module Organization

This repository is a standalone browser MATLAB-like sandbox (Vite + React). The framework-free engine lives in `matlab/`: `lexer.ts`, `parser.ts`, `ast.ts`, `interp.ts`, `values.ts`, `builtins.ts`, `linalg.ts`, `graphics.ts`, `io.ts`, `worker.ts`, plus toolbox modules under `matlab/tb/` and help data under `matlab/help/`. Tests live in `matlab/test/`, with shared utilities in `matlab/test/harness.ts`.

The React app lives under `src/`: `main.tsx` (entry), `App.tsx`, `style.css`, `library.ts` (`.m` preload sources), plus `src/components/` (`CodeEditor`, `CommandWindow`, `FigurePane`, `SvgFigure`), `src/hooks/useSandbox.ts` (drives the Web Worker), `src/providers/ThemeProvider.tsx`, and `src/ui/Math.tsx`. The HTML entry is `index.html`.

Generated output goes to `.test-dist/` and `dist/`; do not edit or commit them.

## Build, Test, and Development Commands

Use pnpm 11, pinned in `package.json`.

```bash
pnpm install
pnpm dev      # Vite dev server
pnpm build    # production build to dist/ (deployed to GitHub Pages)
pnpm preview  # serve the built app locally
pnpm test
pnpm clean
```

`pnpm test` compiles TypeScript with `tsconfig.test.json`, writes a CommonJS marker into `.test-dist/`, then runs Node’s built-in test runner. `pnpm clean` removes `.test-dist/` and `dist/`.

## Coding Style & Naming Conventions

Use TypeScript throughout. Keep runtime code framework-free inside `matlab/`; React belongs only under `src/`. Prefer discriminated unions and explicit type guards for `Value` handling. Preserve MATLAB semantics: column-major matrices, 1-based indexing, value-copy behavior, and tolerance-aware numeric comparisons.

Use two-space indentation, single quotes, and concise comments only where they clarify non-obvious MATLAB behavior.

## Testing Guidelines

Tests use Node’s `node:test` plus `assert/strict`, not Vitest. Name test files `*.test.ts` under `matlab/test/`. The suite is split by domain: `language`, `numeric`, `linalg`, `plotting`, `fileio`, `errors`, `examples` (inline numerical-methods scripts), plus `core` (smoke) and `oracle`.

Use `matlab/test/harness.ts`: `run(src, files?)` returns `{ output, error, fig, get(name), interp }` with **raw** workspace `Value` access via `get()`. Assert math with `expectMat(get('x'), { rows, cols, data, tol })` and `num()`/`dataOf()` — do **not** assert on formatted console output or workspace previews. Assert plots against `fig` (the FigureSpec), never pixels.

**MATLAB oracle (`matlab/test/oracle/`).** `cases.ts` lists snippets; `pnpm oracle:generate` runs them through real MATLAB (`/usr/bin/matlab`, local only) and writes the committed `fixtures.json` ground truth. `oracle.test.ts` compares the interpreter against that JSON — so `pnpm test` needs **no** MATLAB. Numbers are serialized column-major (`real(v(:))'`) to match `Mat.data`. Treat a `fixtures.json` diff as a deliberate change to “what MATLAB says is correct”; regenerate only when adding/altering cases.

Run `pnpm test` before committing.

## Commit & Pull Request Guidelines

Use short imperative commit messages, for example `Add parser tests for cell indexing` or `Quarantine unvalidated toolbox module`. Pull requests should describe the behavioral change, list affected modules, and mention test coverage. Include screenshots only for UI or plotting changes.

## Architecture Notes

Keep the supported runtime surface narrow and course-driven. Unvalidated toolbox work should be quarantined rather than registered. Do not expand the core `Value` union unless the new value family is required by supported course examples and covered by tests.
