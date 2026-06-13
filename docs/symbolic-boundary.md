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

**Known limitation — symbolic functions `y(x)` are not differentiable.** Declaring
`syms y(x)` and then taking `diff(y, x)` is **not** supported (it errors); the engine
has no first-class symbolic-function-derivative representation. Consequently
`functionalDerivative` (and thus Euler–Lagrange / calculus-of-variations workflows)
does not work. `dsolve` handles its own `syms y(t)` forms internally, but general
`symfun` differentiation is out of scope.

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
| **Derivative-divides** substitution `∫c·g'·F(g)` | `int(2*x*exp(x^2))`, `int(sin(x)*cos(x))`, `int(x/(1+x^2))`, `int(tan(x))`, `int(x^2*(x^3+1)^4)` |
| Definite integrals, incl. **improper bounds** | `int(exp(-x), 0, inf)` → `1` |

The derivative-divides rule recognises (by a bounded, terminating check — *not*
general substitution) integrands of the form `c·g'(x)·F(g(x))` where `F ∈ {exp,
sin, cos, (·)^n, 1/(·)}` and the remaining factors are a constant multiple of `g'`.

**Returned unevaluated** (by design — these need techniques outside the table):

- **No elementary antiderivative:** `int(exp(x^2))`, `int(sin(x^2))`, `int(exp(-x^2))`
  (provably impossible — the Risch result), and substitutions where the integrand
  is *not* `c·g'·F(g)` (the inner derivative isn't present as a factor)
- **Products needing general by-parts** beyond the `x^n·f` patterns above
- **Irreducible-quadratic partial fractions** (complex poles → `(Mx+N)/(x^2+bx+c)`)
- **Outside the table:** `int(sec(x))`, special functions (`erf`, `Si`, …)

> *Why not more?* General elementary integration is the Risch algorithm — a large,
> slow procedure that still hits provably unsolvable cases. Out of scope.

---

## Limits — substitution + L'Hôpital, else unevaluated

`limit` resolves:

- **Direct substitution** when finite: `limit(sin(x)/x, x, 0)` → `1`
- **Symbolic L'Hôpital** — results that are *expressions in another free variable*:
  the derivative definition `limit((sin(x+h)-sin(x))/h, h, 0)` → `cos(x)`
- **Multi-round numeric L'Hôpital** for `0/0` and `∞/∞`: `limit((1-cos(x))/x^2, x, 0)` → `1/2`
- **Limits at infinity:** `limit((2*x+1)/(x-3), x, inf)` → `2`
- **One-sided limits:** `limit(1/x, x, 0, 'right')` → `+Inf`, `limit(1/x, x, 0, 'left')` → `-Inf`
  (the `'left'`/`'right'` direction approaches the point from one side; resolves finite
  one-sided values or ±Inf divergence)
- A **cancellation-safe numeric fallback** (moderate `eps`, cross-scale agreement)

**Unevaluated:** competing symbolic infinities and other forms needing a
generalized series expansion (the Gruntz algorithm) — out of scope.

---

## Equation solving

- **Polynomial roots** (numeric coefficients) via Durand–Kerner: `solve(x^2-4==0, x)` → `[-2, 2]`
- **Linear symbolic / literal equations:** `solve(a*x+b==0, x)` → `-b/a`,
  `solve(v==u+a*t, t)` → `(v-u)/a`
- **Quadratic formula with symbolic coefficients:** `solve(a*x^2+b*x+c==0, x)` →
  `(-b ± sqrt(b^2-4ac))/(2a)` — engaged only when a coefficient is itself symbolic
  (numeric quadratics keep clean Durand–Kerner roots). Degree ≥ 3 with symbolic
  coefficients is **not** attempted (cubic/quartic radical forms balloon; quintic+
  has no radical solution — Abel–Ruffini): returned unevaluated.
- `vpasolve`, `isolate`, `finverse` build on the same root finder.

---

## Symbolic linear algebra

- `det` (Laplace ≤ 8×8, Bareiss fraction-free beyond), `inv` (adjugate),
  `*` (matrix product), `\` (**Cramer's rule** `x_i = det(A_i)/det(A)`)
- `charpoly` — exact symbolic coefficients (`charpoly([a 1;0 a])` → `[1, -2a, a²]`);
  `charpoly(A, x)` returns the polynomial in `x`
- `eig` — **bounded** to the cases that stay clean: triangular/diagonal matrices of any
  size (eigenvalues = the diagonal) and the **2×2 closed form** `λ = (tr ± √(tr²−4·det))/2`.
  Non-triangular symbolic matrices ≥ 3×3 are returned as an explicit error (cubic+ radical
  forms balloon — same boundary as the symbolic quadratic solver)
- `rank` — generic (symbolic) rank for small matrices via non-degenerate sampling
  (`rank([1 a; a a²])` → `1`, `rank([a 1; 1 b])` → `2`)

```
syms a b;  A = [a 1; 1 b];  x = A\[1; 0]   % exact: x1 = b/(a*b-1)
```

---

## Also exact / present

`subs`, `simplify` (incl. trig identities — `sin(x)^2+cos(x)^2` → `1`), `expand`
(incl. angle-sum `sin(a+b)`), `collect`, `factor`, `partfrac`, `coeffs`/`degree`,
`numden`, `laplace`/`ilaplace`/`fourier`/`ztrans`, `dsolve` (common linear/separable
cases), `symsum`/`symprod` (polynomial-Faulhaber & geometric closed forms; both the
explicit `(f,k,lo,hi)` and default-variable `(f,lo,hi)` forms), `finverse`,
`equationsToMatrix`, symbolic vector calculus (`gradient`/`divergence`/`curl`/`laplacian`),
`matlabFunction` (compiles a `SymExpr` to a fast numeric handle), assumptions
(`assume(x>0)` drives `simplify`, e.g. `sqrt(x^2)` → `x`).

---

## Contract

> The symbolic engine **exactly** computes differentiation, the integration
> subset above, substitution-and-L'Hôpital limits, polynomial/linear-symbolic
> solving, and symbolic linear algebra — all verified against MATLAB. Anything
> outside this subset is returned **unevaluated**, never guessed. It is a robust,
> predictable symbolic backend for a computational-mathematics course, not a
> full Symbolic Math Toolbox.
