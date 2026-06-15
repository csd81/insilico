# insilico — browser MATLAB sandbox

A MATLAB-language interpreter that runs entirely in the browser (no server), with
a React UI and an SVG figure renderer. It targets a **validated graduate-level
computational-mathematics subset** — the parts MATLAB is good at *executing* —
not a full MATLAB clone.

**Live:** https://csd81.github.io/insilico/

## Status

- **988 tests green** · **853 MATLAB oracle fixtures** · 853/853 cases classified
- 853 oracle cases across **22 domains**
- Behavior is mechanically verified against **real MATLAB** (see Testing)

> The sandbox implements and MATLAB-oracle-validates a graduate-level
> computational-mathematics subset across the declared domains — not all of
> graduate mathematics, and not MATLAB parity.

The base/core triage campaign (**Pass 2A–2O**) systematically swept the bug-prone
math-core and MATLAB-semantics surface — pagewise N-D linear algebra, sparse
structure/reordering, N-D FFT, dense decompositions, special functions, moving-window
reductions, integer/cast semantics, computational geometry/triangulation, N-D/shape,
interpolation/spline internals, struct/cell semantics, bit/integer operators, solver
variants, and stats/data utilities. It fixed **4 real silently-wrong/crashing bugs** and
documented every convention divergence and decline rather than papering over them. With
that core swept, **further validation is example/course-driven**: add a case when a
specific workflow needs a function, not to chase a percentage. See
[docs/validation-strategy.md](docs/validation-strategy.md) for how cases are chosen and
[docs/coverage-map.md](docs/coverage-map.md) for the authoritative per-area status.

## Goals

The aim is a browser-only MATLAB-language interpreter that **mechanically proves**
it correctly executes a graduate-level computational-mathematics subset — the parts
MATLAB is good at *executing* — by validating against real MATLAB. The deliverable
is the **trustworthiness of that "validated subset" claim**, not raw function count.
We optimize for:

1. **Correctness parity** — match MATLAB to tolerance, or by convention-independent
   invariants (residuals, reconstruction norms, constraint satisfaction, sorted
   spectra) when outputs are not unique.
2. **No silently-wrong functions** — the engine is correct or it errors honestly;
   never plausible-but-wrong.
3. **Honest scope** — decline what cannot be cleanly validated rather than ship an
   unverified approximation, and document every decline as deliberate. A credible
   validated core beats breadth.
4. **Coverage hygiene** — docs, counts, and scope stay in agreement
   (`docs/coverage-map.md` is the authoritative status + count source).

**Non-goals (deliberately out of scope):** `classdef`/`arguments`/path model,
host/network/binary I/O, exact RNG-stream parity, large model-object APIs,
GUI/App Designer, and proof-based pure math.

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
contract), **[docs/coverage-map.md](docs/coverage-map.md)** (domain coverage +
backlog), and **[docs/symbolic-boundary.md](docs/symbolic-boundary.md)** (the CAS
domain of validity — exactly what `int`/`limit`/`solve` compute vs. return
unevaluated). Proof-based pure math, host-API I/O, RNG-output parity, and full
language-runtime features (`classdef`, `arguments`, path model) are explicitly
out of scope.
