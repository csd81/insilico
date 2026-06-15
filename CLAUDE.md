# CLAUDE.md

Working notes for Claude Code in this repo. Full contributor guidelines are in
[AGENTS.md](AGENTS.md); the authoritative scope, status, and counts are in
[docs/coverage-map.md](docs/coverage-map.md).

## What this project is

A MATLAB-language interpreter that runs entirely in the browser (no server, React
UI, SVG figure renderer) and **mechanically proves** it correctly executes a
graduate-level computational-mathematics subset — the parts MATLAB is good at
*executing* — by validating against real MATLAB R2026a. Not a MATLAB clone.

## Goals — what we want to achieve

The deliverable is the **trustworthiness of the "validated subset" claim**, not raw
function count. Optimize for:

1. **Correctness parity** — match MATLAB to tolerance, or by convention-independent
   invariants (residuals, reconstruction norms, constraint satisfaction, sorted
   spectra) when outputs are not unique.
2. **No silently-wrong functions** — the engine is correct or it errors honestly;
   never plausible-but-wrong.
3. **Honest scope** — decline what cannot be cleanly oracle-validated rather than
   ship an unverified approximation, and document every decline as deliberate (see
   the coverage-map declined-functions list). A credible validated core beats breadth.
4. **Coverage hygiene** — docs, counts, and scope stay in agreement; coverage-map is
   the single source of truth for counts (don't duplicate them elsewhere).

**Non-goals (deliberately out of scope):** `classdef`/`arguments`/path model,
host/network/binary I/O, exact RNG-stream parity, large model-object APIs,
GUI/App Designer, and proof-based pure math.

## How I work here

- **MATLAB is the oracle.** Real MATLAB R2026a is at `/usr/bin/matlab`. Use it to
  generate committed fixtures (`pnpm oracle:generate`); `pnpm test` then runs
  MATLAB-free against those fixtures. **Probe behavior before claiming a gap** — most
  "missing" functions turn out already-implemented-but-unvalidated.
- **Validate by invariant** when outputs aren't unique; lock the deterministic
  projection (`double(subs(...))`, residuals, sorted spectra), never a convention.
- **Commit each finished, green batch locally** with a scoped message; **hold
  `git push` until asked.**
- Match the surrounding code's style; preserve MATLAB column-major, 1-based,
  value-copy semantics. Keep edits scoped.
