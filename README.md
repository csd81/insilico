# insilico — browser MATLAB sandbox

A MATLAB-language interpreter that runs entirely in the browser (no server), with
a React UI and an SVG figure renderer. It targets a **validated graduate-level
computational-mathematics subset** — the parts MATLAB is good at *executing* —
not a full MATLAB clone.

**Live:** https://csd81.github.io/insilico/

## Status

- **447 tests green** · **312 MATLAB oracle fixtures** · 312/312 cases classified
- 207 undergrad / 105 graduate cases across **16 domains**
- Behavior is mechanically verified against **real MATLAB** (see Testing)

> The sandbox implements and MATLAB-oracle-validates a graduate-level
> computational-mathematics subset across the declared domains — not all of
> graduate mathematics, and not MATLAB parity.

## Architecture

- `matlab/` — framework-free engine: `lexer` → `parser` → `interp`, `values`,
  `builtins`, `linalg`, `graphics`, toolboxes under `matlab/tb/`, help under `matlab/help/`
- `src/` — Vite + React UI: `components/`, `hooks/useSandbox.ts` (drives a Web Worker),
  `providers/`, `ui/`
- The engine runs off the main thread in a Web Worker with cooperative abort

## Develop

```bash
pnpm install
pnpm dev       # Vite dev server
pnpm build     # production build → dist/
pnpm test      # tsc + Node built-in test runner (no MATLAB needed)
```

## Testing & the MATLAB oracle

`pnpm test` compiles with `tsconfig.test.json` and runs Node's `node:test` —
**no MATLAB required**. The oracle layer compares the interpreter against
*committed* ground-truth fixtures generated from real MATLAB:

```bash
pnpm oracle:generate   # regenerate fixtures (local, requires `matlab` on PATH)
pnpm oracle:coverage   # coverage report by domain / level
```

Numbers are compared column-major with per-case tolerances; non-unique outputs
(eigenvectors, LU/QR factors, LP vertices) are checked by **invariants**, not raw
value equality.

## Scope

See **[docs/supported-subset.md](docs/supported-subset.md)** (the language/feature
contract) and **[docs/coverage-map.md](docs/coverage-map.md)** (domain coverage +
backlog). Proof-based pure math, host-API I/O, RNG-output parity, and full
language-runtime features (`classdef`, `arguments`, path model) are explicitly
out of scope.
