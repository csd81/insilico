# Symbolic Engine — Domain of Validity

The symbolic (`sym`) engine is a **small, exact rule-based CAS** — not a general
computer-algebra system. This document states its precise domain of validity:
what it computes **exactly**, and what it returns **unevaluated** (as a symbolic
atom like `int(...)`, `limit(...)`, `solve(...)`).

The guiding principle: *a tool that says exactly where it stops is more
trustworthy than one that guesses and silently fails.* Every "exact" claim below
is locked against real-MATLAB oracle fixtures (`matlab/test/oracle/`).

There is **no Risch algorithm and no Gruntz algorithm**. The engine never
attempts a general decision procedure; it applies a finite, terminating ruleset
and otherwise returns the expression unevaluated.

---

## Differentiation — complete

`diff` is **algorithmically complete** for elementary functions: power, product,
quotient, and chain rules, all elementary functions, and higher orders. This is
tractable because differentiation *is* a finite, total ruleset.

```
diff(x^2*sin(x), x)        % exact
diff(exp(x)*log(x), x, 2)  % exact (any order)
```

`jacobian`, `hessian`, `taylor` build directly on `diff` and are likewise exact.

---

## Integration — exact subset, else unevaluated

`int` is an **antiderivative-rule table**, applied with linearity and
constant-factor extraction. It is exact for:

| Form | Example |
|---|---|
| Polynomials, `sqrt` | `int(x^3)`, `int(sqrt(x))` |
| Linear substitution `a·x+b` | `int(sin(2*x))`, `int(exp(3*x-1))`, `int((2*x+1)^3)` |
| By-parts `x^n·{exp,sin,cos}(a·x+b)` | `int(x*exp(x))`, `int(x^2*exp(x))`, `int(x*sin(x))` |
| By-parts `x^n·log(x)` | `int(x*log(x))` |
| Arctangent form `1/(x^2+a^2)` | `int(1/(1+x^2))` → `atan(x)` |
| Rational functions, **real poles** | `int((3*x+5)/((x-1)*(x-2)))` (partial fractions) |
| Definite integrals, incl. **improper bounds** | `int(exp(-x), 0, inf)` → `1` |

**Returned unevaluated** (by design — these need techniques outside the table):

- **Nonlinear substitution:** `int(exp(x^2))`, `int(x*exp(x^2))`, `int(sin(x^2))`
- **Products needing general by-parts** beyond the `x^n·f` patterns above
- **Irreducible-quadratic partial fractions** (complex poles → `(Mx+N)/(x^2+bx+c)`)
- **Outside the table:** `int(tan(x))`, `int(sec(x))`, special functions (`erf`, `Si`, …)
- Anything with **no elementary antiderivative** (e.g. `int(exp(-x^2))`)

> *Why not more?* General elementary integration is the Risch algorithm — a large,
> slow procedure that still hits provably unsolvable cases. Out of scope.

---

## Limits — substitution + L'Hôpital, else unevaluated

`limit` resolves:

- **Direct substitution** when finite: `limit(sin(x)/x, x, 0)` → `1`
- **Symbolic L'Hôpital** — results that are *expressions in another free variable*:
  the derivative definition `limit((sin(x+h)-sin(x))/h, h, 0)` → `cos(x)`
- **Multi-round numeric L'Hôpital** for `0/0` and `∞/∞`: `limit((1-cos(x))/x^2, x, 0)` → `1/2`
- A **cancellation-safe numeric fallback** (moderate `eps`, cross-scale agreement)

**Unevaluated:** competing symbolic infinities and other forms needing a
generalized series expansion (the Gruntz algorithm) — out of scope.

---

## Equation solving

- **Polynomial roots** via Durand–Kerner: `solve(x^2-4==0, x)` → `[-2, 2]`
- **Linear symbolic / literal equations:** `solve(a*x+b==0, x)` → `-b/a`,
  `solve(v==u+a*t, t)` → `(v-u)/a`
- `vpasolve`, `isolate`, `finverse` build on the same root finder.

---

## Symbolic linear algebra

- `det` (Laplace ≤ 8×8, Bareiss fraction-free beyond), `inv` (adjugate),
  `*` (matrix product), `\` (**Cramer's rule** `x_i = det(A_i)/det(A)`)

```
syms a b;  A = [a 1; 1 b];  x = A\[1; 0]   % exact: x1 = b/(a*b-1)
```

---

## Also exact / present

`subs`, `simplify` (incl. trig identities — `sin(x)^2+cos(x)^2` → `1`), `expand`
(incl. angle-sum `sin(a+b)`), `collect`, `factor`, `partfrac`, `coeffs`/`degree`,
`laplace`/`ilaplace`/`fourier`, `dsolve` (common linear/separable cases),
`matlabFunction` (compiles a `SymExpr` to a fast numeric handle), assumptions.

---

## Contract

> The symbolic engine **exactly** computes differentiation, the integration
> subset above, substitution-and-L'Hôpital limits, polynomial/linear-symbolic
> solving, and symbolic linear algebra — all verified against MATLAB. Anything
> outside this subset is returned **unevaluated**, never guessed. It is a robust,
> predictable symbolic backend for a computational-mathematics course, not a
> full Symbolic Math Toolbox.
