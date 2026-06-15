# Validation Strategy

How this project decides a function is correct, and how to add to that body of
evidence. The deliverable is the **trustworthiness of the "validated subset"
claim**, not raw function count — so every test must either pin behavior to real
MATLAB or honestly carve the function out of scope.

`docs/coverage-map.md` is the single source of truth for status and counts. This
file is the *method*; the coverage map is the *result*.

## The three validation modes

Every function falls into exactly one mode. The mode is recorded as metadata in
`matlab/test/oracle/base-buckets.ts` (`validation: direct | indirect | invariant |
ts-only | none`).

### 1. Oracle (direct / indirect)

Compare the engine's output to **real MATLAB R2026a**, captured once as a committed
fixture. Use this whenever MATLAB's output is **unique and deterministic**.

- The case lives in `matlab/test/oracle/cases.ts`; `pnpm oracle:generate` runs it
  through `/usr/bin/matlab` and writes the answer into `fixtures.json`. `pnpm test`
  then compares the engine to that committed fixture — **no MATLAB at test time**.
- `direct` = the function is named in a case. `indirect` = it is exercised through
  an operator or workflow but rarely named (e.g. `mldivide` via `\`). Indirect is
  legitimate coverage, but verify it really runs.
- A diff in `fixtures.json` during review is a **deliberate change to what MATLAB
  says is correct** — treat it as such.

### 2. Invariant

When the output is **not unique** — factor signs, eigenvector phase, simplex/vertex
ordering, permutation choice, basis rotation — do **not** lock the raw values. Lock
a **convention-independent projection** that any correct implementation must satisfy:

- residuals / reconstruction norms (`norm(A*x - b)`, `norm(U*S*V' - A)`)
- constraint satisfaction (`all(x >= 0)`, KKT, objective value)
- spectra compared **sorted** (`sort(eig(A))`)
- geometric invariants (hull area/volume, simplex count, barycentric round-trip,
  circumcenter equidistance, nearest-neighbor identity, Euler/connectivity counts)
- symbolic identities via `double(subs(...))`
- for adaptive integrators / iterative solvers, an **accuracy bar both engines
  clear** (the per-step state differs by method, the final error does not)

The rule of thumb: *if MATLAB and the engine could each be correct yet print
different numbers, you are testing the wrong thing.* Find the quantity they must
agree on.

### 3. TS-only

The MATLAB oracle is the **wrong validator** for browser/runtime behavior MATLAB has
no opinion on. These tests live in `matlab/test/ts-only/` and never touch MATLAB:

- graphics / `FigureSpec` structure (assert the spec, never pixels)
- VFS / file round-trips, error plumbing and messages
- argument-validation guards, quarantined-function behavior
- RNG — random streams are not reproducible against MATLAB

## When to decline

Declining is a first-class outcome, not a failure. **Decline rather than ship an
unverified approximation.** A function is a decline candidate when:

- it is **not a real MATLAB R2026a function** (`exist(name) == 0`) — the engine's
  "undefined function" already matches MATLAB; do not invent it (`khatriRao`,
  `wronskian`, `gammapdf` as a wrong name);
- matching it requires **proprietary tables or stream details** that aren't a clean
  oracle target (`sobolset`'s Joe–Kuo direction numbers — `haltonset` covers QMC);
- it is **out of declared scope** (`classdef`/`arguments`, host/network/binary I/O,
  large model-object APIs, GUI/App Designer, proof-based pure math);
- it is **not implemented** and pulls in no in-scope workflow (`trimmean`,
  `griddatan` for the probed inputs).

Every decline is recorded — with its one-line rationale — in the
`docs/coverage-map.md` backlog. A documented decline is honest scope; an
undocumented gap is a liability.

## How to add a case

1. **Probe first.** Run the function in the engine (a scratch test in
   `matlab/test/ts-only/`) *and* in MATLAB (`matlab -batch`). Most "missing"
   functions are already-implemented-but-unvalidated; confirm before claiming a gap.
2. **Pick the mode.** Unique output → oracle. Non-unique → invariant (choose the
   projection). MATLAB-has-no-opinion → TS-only. Can't be cleanly validated →
   decline and document.
3. **Write the case** in `cases.ts`: `{ name, src, vars, tol?, domain, tags? }`.
   Wrap symbolic/typed results in `double([...])` so they serialize cleanly. Keep a
   per-case `tol` for numerical results.
   - Avoid MATLAB gotchas inside a single test vector: **mixed integer classes** in
     one `[...]` cast/saturate to the first class, and inside `[]` a space before
     `(` (`f (x)`) is a column separator, not a call. Use commas / temporaries.
4. **Update the section header count** in `cases.ts` (`// ═ <domain> (<n>) ═`) and
   classify the function in `base-buckets.ts`.
5. **Regenerate + verify:** `pnpm oracle:generate`, then `pnpm test`.
6. **Leak-check:** `pnpm oracle:base-audit` must show `uncategorized` directly-ref =
   0 and needs-oracle untested = 0, with no stale/`⚠` metadata lines.
7. **Sync counts** (coverage-map / README / supported-subset) and **commit + push**
   with a scoped message.

## Avoiding raw comparison for non-unique outputs — examples

| Function(s) | Don't lock | Lock instead |
|---|---|---|
| `eig`/`svd`/`qr`/`schur` | raw factors / vector signs | sorted spectrum, `norm(reconstruction - A)` |
| `lu`/`chol`/`ldl` | raw factors | `norm(P*A*Q - L*U)`, `R'*R - A` |
| `lsqnonneg`/`lsqlin`/`linprog` | the iterate path | `all(x>=0)`, residual, objective value |
| triangulation / hull | vertex/simplex order, chosen diagonal | area/volume, simplex count, barycentric round-trip, connectivity counts |
| `spline`/`pchip` | pp internal pieces/breaks (not-a-knot edge differs) | `ppval` values at query points |
| `ode23s`/`ode78`/`ode89` | step-by-step state | final-state error under a bar both clear |
| `gsvd`/`residue` | raw decomposition | reconstruction identity |

See `docs/coverage-map.md` for the per-area status and the Pass 2A–2O campaign
record, and `docs/symbolic-boundary.md` for the symbolic/CAS scope line.
