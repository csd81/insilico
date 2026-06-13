# Repository Guidelines

## Project Structure & Module Organization

This repository contains a browser-oriented MATLAB-like sandbox module. The core engine lives in `matlab/`: `lexer.ts`, `parser.ts`, `ast.ts`, `interp.ts`, `values.ts`, `builtins.ts`, `linalg.ts`, `graphics.ts`, `io.ts`, and toolbox modules under `matlab/tb/`. Help data is under `matlab/help/`. Tests live in `matlab/test/`, with shared test utilities in `matlab/test/harness.ts`. React-facing shell files are at the repository root, including `useSandbox.ts`, `CommandWindow.tsx`, `CodeEditor.tsx`, `FigurePane.tsx`, and `PlotlyFigure.tsx`.

Generated output goes to `.test-dist/`; do not edit or commit it.

## Build, Test, and Development Commands

Use pnpm 11, pinned in `package.json`.

```bash
pnpm install
pnpm test
pnpm clean
```

`pnpm test` compiles TypeScript with `tsconfig.test.json`, writes a CommonJS marker into `.test-dist/`, then runs Node’s built-in test runner. `pnpm clean` removes `.test-dist/`.

There is no standalone dev server in this module. The browser UI is expected to be embedded by a parent app.

## Coding Style & Naming Conventions

Use TypeScript throughout. Keep runtime code framework-free inside `matlab/`; React belongs only in root UI adapter files. Prefer discriminated unions and explicit type guards for `Value` handling. Preserve MATLAB semantics: column-major matrices, 1-based indexing, value-copy behavior, and tolerance-aware numeric comparisons.

Use two-space indentation, single quotes, and concise comments only where they clarify non-obvious MATLAB behavior.

## Testing Guidelines

Tests use Node’s `node:test` plus `assert/strict`, not Vitest. Name test files `*.test.ts` under `matlab/test/`. Add focused tests for parser/interpreter behavior, numeric results, figure specs, and VFS effects. Use helper assertions from `matlab/test/harness.ts` when possible; avoid testing numeric behavior through formatted console output.

Run `pnpm test` before committing.

## Commit & Pull Request Guidelines

Use short imperative commit messages, for example `Add parser tests for cell indexing` or `Quarantine unvalidated toolbox module`. Pull requests should describe the behavioral change, list affected modules, and mention test coverage. Include screenshots only for UI or plotting changes.

## Architecture Notes

Keep the supported runtime surface narrow and course-driven. Unvalidated toolbox work should be quarantined rather than registered. Do not expand the core `Value` union unless the new value family is required by supported course examples and covered by tests.
