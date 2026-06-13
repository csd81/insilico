/**
 * Symbolic Math helpers — the CAS-level operations that back the symbolic builtins
 * (`sym-builtins.ts`) and the symbolic branch of the polymorphic builtins in
 * `builtins.ts`. Pure functions over `SymExpr`/`Sym`; no dependency on the builtin
 * registry, so numeric and symbolic worlds stay decoupled.
 */
import {
  type Value, type Mat, type Sym, MatError, isSym, isStr, isMat, isCell,
  makeSym, asString, asScalar, toMat as m, factorialN,
} from './values';
import {
  type SymExpr, sN, sV, sAdd, sSub, sMul, sPow, sFn, sNeg, sDiv,
  simplifyExpr, diffExpr, subsExpr, evalExpr as symEval, exprToStr, symVars,
} from './sym';
import { durandKerner } from './linalg';
import { parse } from './parser';
import type { Expr } from './ast';

/** Convert a parsed expression AST node to a symbolic expression. */
export function astToSym(e: Expr): SymExpr {
  switch (e.t) {
    case 'num': return sN(e.v);
    case 'ident': return sV(e.name);
    case 'str': case 'string': return sV(e.v);
    case 'unary': return e.op === '-' ? sNeg(astToSym(e.e)) : astToSym(e.e);
    case 'postfix': return astToSym(e.e);   // transpose of a scalar expression
    case 'binary': {
      const a = astToSym(e.a), b = astToSym(e.b);
      switch (e.op) {
        case '+': return sAdd(a, b);
        case '-': return sSub(a, b);
        case '*': case '.*': return sMul(a, b);
        case '/': case './': return sDiv(a, b);
        case '\\': case '.\\': return sDiv(b, a);
        case '^': case '.^': return sPow(a, b);
        case '==': return sSub(a, b);        // equation f(x)=g(x) → f−g (matches solve)
        default: return sFn(e.op, a, b);
      }
    }
    case 'index':
      if (e.target.t === 'ident') return sFn(e.target.name, ...e.args.map(astToSym));
      throw new MatError('str2sym: unsupported indexing in expression');
    default:
      throw new MatError(`str2sym: unsupported expression element '${e.t}'`);
  }
}
/** Parse a string into a symbolic value (scalar or matrix). Used by `str2sym`/`sym('…')`. */
export function parseSym(src: string): Sym {
  const prog = parse(src.trim());
  const st = prog.stmts[0];
  if (!st || st.t !== 'expr') throw new MatError('str2sym: could not parse a symbolic expression');
  const e = st.e;
  if (e.t === 'matrix') {
    const rows = e.rows; const nr = rows.length, nc = rows[0]?.length ?? 0; const exprs: SymExpr[] = [];
    for (let c = 0; c < nc; c++) for (let r = 0; r < nr; r++) exprs.push(simplifyExpr(astToSym(rows[r][c])));
    return makeSym(nr, nc, exprs);
  }
  return makeSym(1, 1, [simplifyExpr(astToSym(e))]);
}

export function polyCoeffs(e: SymExpr, v: string): number[] {
  const c: number[] = []; let term = e; let fact = 1; let deg = 0;
  for (let k = 0; k <= 12; k++) { const cv = symEval(term, new Map([[v, 0]])); c[k] = cv / fact; if (Math.abs(c[k]) > 1e-12) deg = k; term = simplifyExpr(diffExpr(term, v)); fact *= (k + 1); }
  return c.slice(0, deg + 1);
}
/** MATLAB `symType`-style classification of the top node of an expression. */
export function symTypeName(e: SymExpr): string {
  switch (e.t) {
    case 'n': return Number.isInteger(e.v) ? 'integer' : 'real';
    case 'v': return 'variable';
    case 'add': return 'plus';
    case 'mul': return 'times';
    case 'pow': return 'power';
    case 'fn': return e.name;
  }
}
/** True if `target` occurs as a subexpression of `e` (canonical-string match). */
export function hasSub(e: SymExpr, target: SymExpr): boolean {
  const tk = exprToStr(simplifyExpr(target));
  const walk = (x: SymExpr): boolean => {
    if (exprToStr(simplifyExpr(x)) === tk) return true;
    if (x.t === 'add' || x.t === 'mul' || x.t === 'fn') return x.args.some(walk);
    if (x.t === 'pow') return walk(x.base) || walk(x.exp);
    return false;
  };
  return walk(e);
}
/** Collect all subexpressions whose top node matches `type` (symType name). */
export function findByType(e: SymExpr, type: string, into: SymExpr[] = []): SymExpr[] {
  if (symTypeName(e) === type) into.push(e);
  if (e.t === 'add' || e.t === 'mul' || e.t === 'fn') e.args.forEach((a) => findByType(a, type, into));
  else if (e.t === 'pow') { findByType(e.base, type, into); findByType(e.exp, type, into); }
  return into;
}

/** Split an expression into numerator / denominator (denominator = product of negative powers). */
export function numDen(e: SymExpr): { num: SymExpr; den: SymExpr } {
  const s = simplifyExpr(e);
  if (s.t === 'mul') { const num: SymExpr[] = [], den: SymExpr[] = []; for (const f of s.args) { if (f.t === 'pow' && f.exp.t === 'n' && f.exp.v < 0) den.push(sPow(f.base, sN(-f.exp.v))); else num.push(f); } return { num: num.length ? sMul(...num) : sN(1), den: den.length ? sMul(...den) : sN(1) }; }
  if (s.t === 'pow' && s.exp.t === 'n' && s.exp.v < 0) return { num: sN(1), den: sPow(s.base, sN(-s.exp.v)) };
  return { num: s, den: sN(1) };
}

/** Polynomial long division of numeric coeff arrays (highest-first): N = q·D + r. */
function polyDivHi(N: number[], D: number[]): { q: number[]; r: number[] } {
  while (D.length > 1 && Math.abs(D[0]) < 1e-12) D = D.slice(1); // trim leading-zero divisor coeffs (avoid /0)
  if (D.length === 1 && Math.abs(D[0]) < 1e-12) throw new MatError('division by a zero polynomial'); // would otherwise produce Inf/NaN
  const q: number[] = []; const rem = N.slice();
  while (rem.length >= D.length) { const c = rem[0] / D[0]; q.push(c); for (let i = 0; i < D.length; i++) rem[i] -= c * D[i]; rem.shift(); }
  while (rem.length && Math.abs(rem[0]) < 1e-12) rem.shift();
  return { q: q.length ? q : [0], r: rem.length ? rem : [0] };
}
/** Partial-fraction decomposition of a rational expression in `v` (numeric coeffs only). */
export function partfracExpr(e: SymExpr, v: string): SymExpr {
  const s = simplifyExpr(e);
  const { num, den } = numDen(s);
  if (symVars(num).some((x) => x !== v) || symVars(den).some((x) => x !== v)) return s;
  let N = polyCoeffs(num, v).slice().reverse();          // high→low
  const D = polyCoeffs(den, v).slice().reverse();
  if (D.length < 2) return s;
  const terms: SymExpr[] = [];
  if (N.length >= D.length) {                            // improper → split off polynomial part
    const { q, r } = polyDivHi(N, D); const qd = q.length - 1;
    q.forEach((c, i) => { if (Math.abs(c) > 1e-12) terms.push(i === qd ? sN(round0(c)) : sMul(sN(round0(c)), sPow(sV(v), sN(qd - i)))); });
    N = r;
  }
  while (N.length && Math.abs(N[0]) < 1e-14) N.shift();
  if (!N.length) N = [0];
  const lead = D[0];
  const roots = durandKerner(D); const used = new Array(roots.re.length).fill(false);
  const groups: { re: number; im: number; mult: number }[] = [];
  for (let i = 0; i < roots.re.length; i++) { if (used[i]) continue; const g = { re: roots.re[i], im: roots.im[i], mult: 1 }; used[i] = true; for (let j = i + 1; j < roots.re.length; j++) if (!used[j] && Math.hypot(roots.re[j] - g.re, roots.im[j] - g.im) < 1e-4) { used[j] = true; g.mult++; } groups.push(g); }
  if (groups.every((g) => g.mult === 1)) {
    const Dp = polyDerivHi(D);
    for (const g of groups) {
      const [nr, ni] = cPolyval(N, g.re, g.im); const [dr, di] = cPolyval(Dp, g.re, g.im); const dd = dr * dr + di * di;
      const p = (nr * dr + ni * di) / dd, q = (ni * dr - nr * di) / dd;
      if (Math.abs(g.im) < 1e-7) terms.push(sDiv(sN(round0(p)), sSub(sV(v), sN(round0(g.re)))));
      else if (g.im > 0) { const al = round0(g.re), be = g.im; const numer = sSub(sMul(sN(round0(2 * p)), sSub(sV(v), sN(al))), sN(round0(2 * q * be))); const denom = sAdd(sPow(sSub(sV(v), sN(al)), sN(2)), sN(round0(be * be))); terms.push(sDiv(numer, denom)); }
    }
  } else if (groups.length === 1 && Math.abs(groups[0].im) < 1e-7) {
    const r = groups[0].re, mlt = groups[0].mult, b = taylorAtReal(N, r);
    for (let j = 0; j < mlt; j++) { const A = (b[j] ?? 0) / lead; const pow = mlt - j; if (Math.abs(A) > 1e-12) terms.push(sDiv(sN(round0(A)), pow > 1 ? sPow(sSub(sV(v), sN(round0(r))), sN(pow)) : sSub(sV(v), sN(round0(r))))); }
  } else return s;                                       // mixed repeated+distinct → leave as is
  return terms.length ? simplifyExpr(sAdd(...terms)) : sN(0);
}
/** Poles of a rational expression in `v` (denominator roots). */
export function polesOf(e: SymExpr, v: string): SymExpr[] {
  const { den } = numDen(simplifyExpr(e));
  if (symVars(den).some((x) => x !== v)) return [];
  const D = polyCoeffs(den, v).slice().reverse();
  if (D.length < 2) return [];
  const r = durandKerner(D);
  return r.re.map((re, i) => (Math.abs(r.im[i]) < 1e-9 ? sN(round0(re)) : sFn('complex', sN(round0(re)), sN(round0(r.im[i])))));
}
/** Hilbert transform (linearity + a small trig table). H{cos at}=sin at, H{sin at}=−cos at. */
export function hilbertExpr(e: SymExpr, t: string): SymExpr {
  e = simplifyExpr(expandExpr(e));
  if (e.t === 'add') return simplifyExpr(sAdd(...e.args.map((a) => hilbertExpr(a, t))));
  if (e.t === 'mul') { const consts = e.args.filter((f) => !symHasVar(f, t)); const rest = e.args.filter((f) => symHasVar(f, t)); if (consts.length) return simplifyExpr(sMul(sMul(...consts), hilbertExpr(rest.length ? simplifyExpr(sMul(...rest)) : sN(1), t))); }
  if (!symHasVar(e, t)) return sN(0);
  if (e.t === 'fn' && e.args.length === 1) { const lin = linearInT(e.args[0], t); if (lin && isZeroE(lin.b)) { if (e.name === 'cos') return sFn('sin', e.args[0]); if (e.name === 'sin') return sNeg(sFn('cos', e.args[0])); } }
  return sFn('htrans', e, sV(t));
}
/** Rewrite an expression in terms of another function family (`sincos`, `exp`). */
export function rewriteExpr(e: SymExpr, target: string): SymExpr {
  const walk = (x: SymExpr): SymExpr => {
    if (x.t === 'fn' && x.args.length === 1) {
      const u = walk(x.args[0]);
      if (target === 'sincos') {
        if (x.name === 'tan') return sDiv(sFn('sin', u), sFn('cos', u));
        if (x.name === 'cot') return sDiv(sFn('cos', u), sFn('sin', u));
        if (x.name === 'sec') return sDiv(sN(1), sFn('cos', u));
        if (x.name === 'csc') return sDiv(sN(1), sFn('sin', u));
      }
      if (target === 'exp') {
        if (x.name === 'sinh') return sDiv(sSub(sFn('exp', u), sFn('exp', sNeg(u))), sN(2));
        if (x.name === 'cosh') return sDiv(sAdd(sFn('exp', u), sFn('exp', sNeg(u))), sN(2));
        if (x.name === 'tanh') return sDiv(sSub(sFn('exp', u), sFn('exp', sNeg(u))), sAdd(sFn('exp', u), sFn('exp', sNeg(u))));
      }
      return sFn(x.name, u);
    }
    if (x.t === 'add') return sAdd(...x.args.map(walk));
    if (x.t === 'mul') return sMul(...x.args.map(walk));
    if (x.t === 'pow') return sPow(walk(x.base), walk(x.exp));
    return x;
  };
  return walk(e);
}

// ── Assumptions (partial: sign/realness, used by simplify & isAlways) ──
const ASSUMPTIONS = new Map<string, { sign?: 'pos' | 'neg' | 'nonneg'; real?: boolean; integer?: boolean }>();
export function assumeVar(name: string, kind: string): void {
  if (kind === 'clear') { ASSUMPTIONS.delete(name); return; }
  const cur = ASSUMPTIONS.get(name) ?? {};
  if (kind === 'positive') cur.sign = 'pos';
  else if (kind === 'negative') cur.sign = 'neg';
  else if (kind === 'nonnegative') cur.sign = 'nonneg';
  else if (kind === 'real') cur.real = true;
  else if (kind === 'integer') cur.integer = true;
  ASSUMPTIONS.set(name, cur);
}
export function clearAssumptions(name?: string): void { if (name) ASSUMPTIONS.delete(name); else ASSUMPTIONS.clear(); }
/** Apply assumption-driven simplifications: abs/sign of signed vars, sqrt(x²)→x for x≥0. */
export function simplifyAssume(e: SymExpr): SymExpr {
  const walk = (x: SymExpr): SymExpr => {
    if (x.t === 'fn') {
      const args = x.args.map(walk);
      if (x.name === 'abs' && args[0].t === 'v') { const as = ASSUMPTIONS.get(args[0].name); if (as?.sign === 'pos' || as?.sign === 'nonneg') return args[0]; if (as?.sign === 'neg') return sNeg(args[0]); }
      if (x.name === 'sign' && args[0].t === 'v') { const as = ASSUMPTIONS.get(args[0].name); if (as?.sign === 'pos') return sN(1); if (as?.sign === 'neg') return sN(-1); }
      // sqrt(x²) → x for x ≥ 0 (sqrt stored as a function node, not a ½-power)
      if (x.name === 'sqrt' && args[0].t === 'pow' && args[0].exp.t === 'n' && args[0].exp.v === 2 && args[0].base.t === 'v') { const as = ASSUMPTIONS.get(args[0].base.name); if (as?.sign === 'pos' || as?.sign === 'nonneg') return args[0].base; }
      return sFn(x.name, ...args);
    }
    if (x.t === 'add') return sAdd(...x.args.map(walk));
    if (x.t === 'mul') return sMul(...x.args.map(walk));
    if (x.t === 'pow') {
      const base = walk(x.base), exp = walk(x.exp);
      if (base.t === 'pow' && base.exp.t === 'n' && base.exp.v === 2 && exp.t === 'n' && Math.abs(exp.v - 0.5) < 1e-12 && base.base.t === 'v') { const as = ASSUMPTIONS.get(base.base.name); if (as?.sign === 'pos' || as?.sign === 'nonneg') return base.base; }
      return sPow(base, exp);
    }
    return x;
  };
  return simplifyExpr(walk(e));
}

export function symDet(e: SymExpr[], n: number): SymExpr {
  if (n === 1) return e[0];
  if (n === 2) return sSub(sMul(e[0], e[3]), sMul(e[2], e[1]));
  // Laplace expansion (O(n!)) keeps the most-simplified output and is fine through 8×8; beyond
  // that it explodes (a 9×9/10×10 would hang), so switch to Bareiss fraction-free elimination
  // (O(n³) operations — exact and clean for numeric matrices; unsimplified but non-hanging for
  // matrices with free variables, which Laplace couldn't finish anyway).
  if (n > 8) return bareissDet(e, n);
  let acc: SymExpr = sN(0);
  for (let j = 0; j < n; j++) {
    const minor: SymExpr[] = new Array((n - 1) * (n - 1)); let nc = 0;
    for (let c = 0; c < n; c++) { if (c === j) continue; for (let r = 1; r < n; r++) minor[(r - 1) + nc * (n - 1)] = e[r + c * n]; nc++; }
    acc = sAdd(acc, sMul(sN(j % 2 === 0 ? 1 : -1), e[0 + j * n], symDet(minor, n - 1)));
  }
  return acc;
}
/** Bareiss fraction-free Gaussian elimination — every intermediate division is exact, so the
 *  determinant is obtained in O(n³) symbolic operations instead of O(n!) Laplace recursions. */
function bareissDet(e: SymExpr[], n: number): SymExpr {
  const zero = (x: SymExpr): boolean => { const s = simplifyExpr(x); return s.t === 'n' && Math.abs(s.v) < 1e-12; };
  const M: SymExpr[][] = []; for (let r = 0; r < n; r++) { M[r] = []; for (let c = 0; c < n; c++) M[r][c] = e[r + c * n]; }
  let sign = 1; let prev: SymExpr = sN(1);
  for (let k = 0; k < n - 1; k++) {
    if (zero(M[k][k])) {                       // pivot is identically zero → swap a nonzero row up
      let sw = -1; for (let i = k + 1; i < n; i++) if (!zero(M[i][k])) { sw = i; break; }
      if (sw === -1) return sN(0);             // whole column below pivot is zero → singular
      [M[k], M[sw]] = [M[sw], M[k]]; sign = -sign;
    }
    for (let i = k + 1; i < n; i++) for (let j = k + 1; j < n; j++) {
      const num = sSub(sMul(M[i][j], M[k][k]), sMul(M[i][k], M[k][j]));
      M[i][j] = simplifyExpr(sDiv(num, prev));  // exact (Bareiss guarantees no remainder)
    }
    prev = M[k][k];
  }
  return sign === 1 ? M[n - 1][n - 1] : simplifyExpr(sNeg(M[n - 1][n - 1]));
}
/** Symbolic matrix inverse via adjugate / determinant. */
export function symInv(s: Sym): Sym {
  const n = s.rows; const d = symDet(s.exprs, n); const out: SymExpr[] = new Array(n * n);
  const minorDet = (ri: number, ci: number): SymExpr => { const minor: SymExpr[] = new Array((n - 1) * (n - 1)); let nc = 0; for (let c = 0; c < n; c++) { if (c === ci) continue; let nr = 0; for (let r = 0; r < n; r++) { if (r === ri) continue; minor[nr + nc * (n - 1)] = s.exprs[r + c * n]; nr++; } nc++; } return symDet(minor, n - 1); };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[i + j * n] = simplifyExpr(sMul(sN((i + j) % 2 === 0 ? 1 : -1), minorDet(j, i), sPow(d, sN(-1))));   // adjugate transpose / det
  return makeSym(n, n, out);
}
/** Characteristic-polynomial coefficients (highest power first, monic) of a symbolic matrix.
 *  Coefficients are extracted SYMBOLICALLY (c_k = (1/k!)·∂λᵏ det(λI−A)|λ=0), so the result is
 *  exact for symbolic entries too — e.g. charpoly([a 1;0 a]) → [1, -2a, a²]. */
export function symCharpolyCoeffs(e: SymExpr[], n: number): SymExpr[] {
  const L = '__l'; const M: SymExpr[] = e.map((x, i) => { const r = i % n, c = Math.floor(i / n); return r === c ? sSub(sV(L), x) : sNeg(x); });
  const detL = simplifyExpr(symDet(M, n));
  const asc: SymExpr[] = []; let term = detL; let fact = 1;
  for (let k = 0; k <= n; k++) { asc[k] = simplifyExpr(sMul(sN(1 / fact), subsExpr(term, L, sN(0)))); term = simplifyExpr(diffExpr(term, L)); fact *= (k + 1); }
  return asc.reverse();   // [1, c_{n-1}, …, c_0]
}
/** Characteristic polynomial as an expression in `xvar` from descending-coefficient list. */
export function symCharpolyExpr(coeffsDesc: SymExpr[], xvar: string): SymExpr {
  const deg = coeffsDesc.length - 1; let acc: SymExpr = sN(0);
  for (let k = 0; k < coeffsDesc.length; k++) acc = sAdd(acc, sMul(coeffsDesc[k], sPow(sV(xvar), sN(deg - k))));
  return simplifyExpr(acc);
}
/** Symbolic eigenvalues — bounded to the cases that stay clean: triangular/diagonal matrices
 *  (eigenvalues = diagonal) of any size, and the 2×2 closed form λ = (tr ± √(tr²−4·det))/2.
 *  Larger non-triangular symbolic matrices are out of scope (cubic+ radical forms explode). */
export function symEig(s: Sym): SymExpr[] {
  const n = s.rows; const e = s.exprs;
  if (s.rows !== s.cols) throw new MatError('eig: matrix must be square');
  const isZ = (x: SymExpr): boolean => { const t = simplifyExpr(x); return t.t === 'n' && Math.abs(t.v) < 1e-12; };
  let upper = true, lower = true;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { if (r > c && !isZ(e[r + c * n])) upper = false; if (r < c && !isZ(e[r + c * n])) lower = false; }
  if (upper || lower) { const out: SymExpr[] = []; for (let i = 0; i < n; i++) out.push(simplifyExpr(e[i + i * n])); return out; }
  if (n === 2) {
    const tr = sAdd(e[0], e[3]); const det = sSub(sMul(e[0], e[3]), sMul(e[1], e[2]));
    const disc = simplifyExpr(sSub(sPow(tr, sN(2)), sMul(sN(4), det))); const root = sFn('sqrt', disc);
    return [simplifyExpr(sDiv(sSub(tr, root), sN(2))), simplifyExpr(sDiv(sAdd(tr, root), sN(2)))];
  }
  throw new MatError('eig: symbolic eigenvalues are supported only for 2x2 or triangular matrices');
}
export function symArg(v: Value): Sym { if (isSym(v)) return v; const M = m(v); return makeSym(M.rows, M.cols, Array.from(M.data, (x) => sN(x))); }
export function symToExpr(v: Value): SymExpr { if (isSym(v)) return v.exprs[0]; if (isStr(v) || (isMat(v) && (v as Mat).isChar)) { const t = asString(v).trim(); const num = Number(t); return Number.isFinite(num) && /^[-\d.]+$/.test(t) ? sN(num) : sV(t); } return sN(asScalar(v)); }
export function symVarsOf(s: Sym): string[] { const set = new Set<string>(); for (const e of s.exprs) symVars(e).forEach((x) => set.add(x)); return [...set].sort(); }
/** Resolve (independent, transform) variables for an integral-transform call.
 *  f(a)→default vars; f(a,trans); f(a,indep,trans). */
export function transformVars(a: Value[], defIndep: string, defTrans: string): { s: Sym; indep: string; trans: string } {
  const s = symArg(a[0]); const vars = symVarsOf(s);
  const nameOf = (v: Value): string => isSym(v) ? (symVarsOf(v)[0] ?? defIndep) : asString(v);
  let indep = vars.includes(defIndep) ? defIndep : (vars[0] ?? defIndep);
  let trans = defTrans;
  if (a.length === 2) trans = nameOf(a[1]);
  else if (a.length >= 3) { indep = nameOf(a[1]); trans = nameOf(a[2]); }
  return { s, indep, trans };
}
export function symNames(v: Value): string[] { if (isSym(v)) return v.exprs.map((e) => (e.t === 'v' ? e.name : symVars(e)[0] ?? 'x')); if (isCell(v)) return v.items.map((x) => asString(x)); if (isStr(v)) return v.items.slice(); return [asString(v)]; }
/** Basic symbolic integration: linearity + xⁿ, 1/x, sin/cos/exp of the variable. */
/** Rewrite sqrt(u) → u^(1/2) so the power rule covers square roots (Step 2). */
function normSqrt(e: SymExpr): SymExpr {
  if (e.t === 'fn' && e.name === 'sqrt') return sPow(normSqrt(e.args[0]), sN(0.5));
  if (e.t === 'fn') return sFn(e.name, ...e.args.map(normSqrt));
  if (e.t === 'add') return sAdd(...e.args.map(normSqrt));
  if (e.t === 'mul') return sMul(...e.args.map(normSqrt));
  if (e.t === 'pow') return sPow(normSqrt(e.base), normSqrt(e.exp));
  return e;
}
/** If `arg` is a*x+b with constant a≠0, b, return {a, b}; else null (linear substitution). */
function linearArg(arg: SymExpr, x: string): { a: number; b: number } | null {
  if (symVars(arg).indexOf(x) < 0) return null;
  const c = polyCoeffs(arg, x);
  if (c.length >= 2 && Math.abs(c[1]) > 1e-12 && c.slice(2).every((v) => Math.abs(v) < 1e-12)) return { a: c[1], b: c[0] };
  return null;
}
/** Antiderivative of a bare elementary function (the 1/a linear-arg scaling is the caller's). */
function elemAntideriv(name: string, arg: SymExpr): SymExpr | null {
  if (name === 'sin') return sNeg(sFn('cos', arg));
  if (name === 'cos') return sFn('sin', arg);
  if (name === 'exp') return sFn('exp', arg);
  return null;
}
/** Tabular by-parts reduction for ∫ x^n · f(a·x+b) dx (f ∈ {exp,sin,cos}); terminates at n=0. */
function reduceByParts(n: number, fname: string, a: number, arg: SymExpr, x: string): SymExpr {
  if (n === 0) return sMul(sN(1 / a), elemAntideriv(fname, arg)!);
  const xn = sPow(sV(x), sN(n));
  if (fname === 'exp') return sSub(sMul(sN(1 / a), xn, sFn('exp', arg)), sMul(sN(n / a), reduceByParts(n - 1, 'exp', a, arg, x)));
  if (fname === 'sin') return sAdd(sMul(sN(-1 / a), xn, sFn('cos', arg)), sMul(sN(n / a), reduceByParts(n - 1, 'cos', a, arg, x)));
  return sSub(sMul(sN(1 / a), xn, sFn('sin', arg)), sMul(sN(n / a), reduceByParts(n - 1, 'sin', a, arg, x)));   // cos
}
/** ∫ x^n·exp/sin/cos(a·x+b) and ∫ x^n·log(x) via explicit by-parts patterns (Step 4). */
function integrateByParts(e: SymExpr, x: string): SymExpr | null {
  if (e.t !== 'mul') return null;
  let n = 0; let fn: SymExpr | null = null;
  for (const f of e.args) {
    if (f.t === 'v' && f.name === x) n += 1;
    else if (f.t === 'pow' && f.base.t === 'v' && f.base.name === x && f.exp.t === 'n') n += f.exp.v;
    else if (f.t === 'fn' && !fn) fn = f;
    else return null;
  }
  if (!fn || !Number.isInteger(n) || n < 1) return null;
  if (fn.name === 'log' && fn.args[0].t === 'v' && fn.args[0].name === x) {
    const np1 = n + 1;   // ∫x^n log(x) = x^(n+1)/(n+1)·(log(x) − 1/(n+1))
    return sMul(sN(1 / np1), sPow(sV(x), sN(np1)), sSub(sFn('log', sV(x)), sN(1 / np1)));
  }
  if (fn.name === 'exp' || fn.name === 'sin' || fn.name === 'cos') {
    const lin = linearArg(fn.args[0], x);
    if (lin) return reduceByParts(n, fn.name, lin.a, fn.args[0], x);
  }
  return null;
}
/** ∫ k/(x^2 + a^2) dx = (k/a)·atan(x/a). */
function arctanPattern(e: SymExpr, x: string): SymExpr | null {
  const { num, den } = numDen(e);
  if (symVars(num).indexOf(x) >= 0) return null;
  const k = symEval(num, new Map()); if (!Number.isFinite(k)) return null;
  const c = polyCoeffs(den, x);
  if (c.length >= 3 && Math.abs(c[2] - 1) < 1e-12 && Math.abs(c[1]) < 1e-12 && c[0] > 1e-12 && c.slice(3).every((v) => Math.abs(v) < 1e-12)) {
    const a = Math.sqrt(c[0]);
    return sMul(sN(k / a), sFn('atan', sMul(sN(1 / a), sV(x))));
  }
  return null;
}

/** Derivative-divides substitution (bounded — not general substitution): recognises
 *  ∫ c·g'·F(g) dx where F ∈ {exp, sin, cos, (·)^n, 1/(·)} and the remaining factors are a
 *  constant multiple of g'. Covers ∫2x·e^(x²), ∫sin·cos, ∫x/(1+x²), ∫tan(x) (via sin/cos). */
function integrateSubst(e: SymExpr, x: string): SymExpr | null {
  const isZ = (z: SymExpr) => z.t === 'n' && Math.abs(z.v) < 1e-12;
  const factors = e.t === 'mul' ? e.args : [e];
  for (let fi = 0; fi < factors.length; fi++) {
    const f = factors[fi];
    if (symVars(f).indexOf(x) < 0) continue;
    const others = factors.filter((_, j) => j !== fi);
    const rest = others.length ? (others.length === 1 ? others[0] : sMul(...others)) : sN(1);
    const cands: { u: SymExpr; anti: (u: SymExpr) => SymExpr }[] = [];
    if (!linearArg(f, x)) cands.push({ u: f, anti: (u) => sMul(sN(0.5), sPow(u, sN(2))) });                 // ∫u·u' = u²/2
    if (f.t === 'fn' && elemAntideriv(f.name, f.args[0]) && symVars(f.args[0]).indexOf(x) >= 0 && !linearArg(f.args[0], x))
      cands.push({ u: f.args[0], anti: (u) => elemAntideriv(f.name, u)! });                                  // ∫g'·F(g)
    if (f.t === 'pow' && f.exp.t === 'n' && symVars(f.base).indexOf(x) >= 0 && !linearArg(f.base, x)) {
      const n = f.exp.v; cands.push({ u: f.base, anti: (u) => (n === -1 ? sFn('log', u) : sMul(sN(1 / (n + 1)), sPow(u, sN(n + 1)))) });   // ∫g'·g^n
    }
    for (const { u, anti } of cands) {
      const up = simplifyExpr(diffExpr(u, x));
      if (isZ(up)) continue;
      const ratio = simplifyExpr(sDiv(rest, up));
      if (symVars(ratio).indexOf(x) < 0) return simplifyExpr(sMul(ratio, anti(u)));   // rest = const·u' (symbolically)
      // numeric constancy: simplify won't cancel x/(2x), so sample — if rest/u' is the same
      // at several x, it's a constant in x and the substitution applies.
      const samp = [0.713, 1.371, 2.119].map((p) => symEval(ratio, new Map([[x, p]])));
      if (samp.every(Number.isFinite) && Math.abs(samp[0] - samp[1]) < 1e-9 * (1 + Math.abs(samp[0])) && Math.abs(samp[0] - samp[2]) < 1e-9 * (1 + Math.abs(samp[0]))) {
        const cv = Math.abs(samp[0] - Math.round(samp[0])) < 1e-9 ? Math.round(samp[0]) : samp[0];
        return simplifyExpr(sMul(sN(cv), anti(u)));
      }
    }
  }
  return null;
}

export function integrate(e: SymExpr, x: string): SymExpr {
  e = simplifyExpr(normSqrt(e));
  if (e.t === 'fn' && e.name === 'piecewise') return sFn('piecewise', ...e.args.map((a, i) => (i % 2 === 0 ? a : integrate(a, x))));
  if (e.t === 'add') return sAdd(...e.args.map((a) => integrate(a, x)));
  if (e.t === 'mul') {
    const consts = e.args.filter((a) => symVars(a).indexOf(x) < 0);
    const rest = e.args.filter((a) => symVars(a).indexOf(x) >= 0);
    if (consts.length && rest.length) return sMul(sMul(...consts), integrate(rest.length === 1 ? rest[0] : sMul(...rest), x));
    const bp = integrateByParts(e, x); if (bp) return simplifyExpr(bp);   // Step 4
  }
  // rational function → partial fractions, then integrate the (simpler) terms. Real-pole
  // terms A/(x-r)^k integrate via the linear-base power/log rule; irreducible quadratics
  // fall through to the arctan handler.
  { const { num: rn, den: rd } = numDen(e);
    if (rd.t !== 'n' && symVars(rd).indexOf(x) >= 0 && symVars(rn).every((s) => s === x) && symVars(rd).every((s) => s === x)) {
      const pf = partfracExpr(e, x);
      if (exprToStr(simplifyExpr(pf)) !== exprToStr(e)) return integrate(pf, x);
    } }
  const at = arctanPattern(e, x); if (at) return simplifyExpr(at);          // Step 4 (1/(x²+a²))
  if (symVars(e).indexOf(x) < 0) return sMul(e, sV(x));                                  // constant → c·x
  if (e.t === 'v' && e.name === x) return sMul(sN(0.5), sPow(sV(x), sN(2)));
  if (e.t === 'pow' && e.exp.t === 'n') {
    const lin = linearArg(e.base, x);
    if (lin) { const n = e.exp.v; return n === -1 ? sMul(sN(1 / lin.a), sFn('log', e.base)) : sMul(sN(1 / (lin.a * (n + 1))), sPow(e.base, sN(n + 1))); }   // power rule incl. linear base (Step 3)
  }
  if (e.t === 'fn') {                                                       // elementary fn of a linear argument (Step 3)
    const lin = linearArg(e.args[0], x);
    const base = lin && elemAntideriv(e.name, e.args[0]);
    if (base) return sMul(sN(1 / lin!.a), base);
  }
  const sub = integrateSubst(e, x); if (sub) return sub;                    // derivative-divides substitution
  const rw = simplifyExpr(rewriteExpr(e, 'sincos'));                        // tan/cot/sec/csc → sin/cos, then retry
  if (exprToStr(rw) !== exprToStr(e)) { const r2 = integrateSubst(rw, x); if (r2) return r2; }
  return sFn('int', e);   // unevaluated
}
/** Limit by substitution; multi-round L'Hôpital for 0/0 and ∞/∞, then a cancellation-safe
 *  numeric fallback. Returns an unevaluated `limit(...)` when the result isn't a number. */
export function limitAt(e: SymExpr, x: string, pt: SymExpr, dir?: 'left' | 'right'): SymExpr {
  const p = symEval(pt, new Map());
  const snap = (val: number) => (Math.abs(val - Math.round(val)) < 1e-7 ? Math.round(val) : val);
  const at = (xv: number) => symEval(e, new Map([[x, xv]]));

  // one-sided limit at a finite point: approach p from the requested side only. Resolves a
  // finite one-sided value, or ±Inf when the function blows up monotonically (e.g. 1/x at 0).
  if (Number.isFinite(p) && dir) {
    const sgn = dir === 'left' ? -1 : 1;
    let prev = NaN, conv = NaN, finite = false; const samples: number[] = [];
    for (const eps of [1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6]) {
      const sv = at(p + sgn * eps); samples.push(sv);
      if (Number.isFinite(sv)) { if (Number.isFinite(prev) && Math.abs(sv - prev) < 1e-7 * (1 + Math.abs(sv))) { conv = sv; finite = true; } prev = sv; }
    }
    if (finite) return sN(snap(conv));
    const fin = samples.filter(Number.isFinite);
    if (fin.length >= 2 && Math.abs(fin[fin.length - 1]) > Math.abs(fin[0]) * 10 && fin[fin.length - 1] !== 0) {
      return sN(fin[fin.length - 1] > 0 ? Infinity : -Infinity);
    }
  }

  // direct substitution
  const v = symEval(e, new Map([[x, p]]));
  if (Number.isFinite(v)) return sN(v);

  // symbolic L'Hôpital: handles 0/0 whose limit is an EXPRESSION in another free variable
  // (e.g. the derivative-definition difference quotient (sin(x+h)-sin(x))/h → cos(x)).
  // Substitute the limit point symbolically; while 0/0, differentiate numerator & denominator.
  {
    let f = numDen(e).num, g = numDen(e).den;
    const subPt = (z: SymExpr) => simplifyExpr(subsExpr(z, x, pt));
    const isZ = (z: SymExpr) => z.t === 'n' && Math.abs((z as { v: number }).v) < 1e-12;
    for (let round = 0; round < 4; round++) {
      const fz = subPt(f), gz = subPt(g);
      if (!(isZ(fz) && isZ(gz))) {
        if (!isZ(gz)) {
          const ratio = simplifyExpr(sDiv(fz, gz)); const vars = symVars(ratio);
          if (vars.length === 0) { const nv = symEval(ratio, new Map()); if (Number.isFinite(nv)) return sN(snap(nv)); }
          else if (vars.indexOf(x) < 0) return ratio;
        }
        break;
      }
      f = simplifyExpr(diffExpr(f, x));
      g = simplifyExpr(diffExpr(g, x));
    }
  }

  // multi-round L'Hôpital: differentiate f/g until the ratio at p is determinate (e.g.
  // (1-cos x)/x^2 needs two rounds → cos(x)/2 → 1/2). numDen splits the denominator correctly.
  if (Number.isFinite(p)) {
    let { num: f, den: g } = numDen(e);
    for (let round = 0; round < 5; round++) {
      const fp = symEval(f, new Map([[x, p]])), gp = symEval(g, new Map([[x, p]]));
      const zeroZero = Math.abs(fp) < 1e-9 && Math.abs(gp) < 1e-9;
      const infInf = !Number.isFinite(fp) && !Number.isFinite(gp);
      if (!zeroZero && !infInf) break;
      f = simplifyExpr(diffExpr(f, x));
      g = simplifyExpr(diffExpr(g, x));
      const lv = symEval(sDiv(f, g), new Map([[x, p]]));
      if (Number.isFinite(lv)) return sN(snap(lv));
    }
  }

  // numeric fallback. For finite p, stay at MODERATE eps (≥1e-4) — sampling closer triggers
  // catastrophic cancellation (e.g. 1-cos(1e-6)) and yields wrong limits — and require the
  // two-sided estimate to agree across two scales before trusting it.
  if (!Number.isFinite(p)) {
    const sgn = p > 0 ? 1 : -1; let prev = NaN, conv = NaN, ok = false;
    for (const mag of [1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8]) { const sv = at(sgn * mag); if (!Number.isFinite(sv)) { ok = false; break; } if (Number.isFinite(prev) && Math.abs(sv - prev) < 1e-6 * (1 + Math.abs(sv))) { conv = sv; ok = true; } prev = sv; }
    if (ok) return sN(snap(conv));
  } else {
    const ests: number[] = [];
    for (const eps of [1e-2, 1e-3, 1e-4]) { const lv = at(p - eps), rv = at(p + eps); if (Number.isFinite(lv) && Number.isFinite(rv) && Math.abs(lv - rv) < 1e-3 * (1 + Math.abs(lv))) ests.push((lv + rv) / 2); }
    if (ests.length >= 2 && Math.abs(ests[ests.length - 1] - ests[0]) < 1e-3 * (1 + Math.abs(ests[0]))) return sN(snap(ests[ests.length - 1]));
  }
  return sFn('limit', e);
}
/** Solve p(x)=0 for polynomials up to degree 4 (numeric roots → symbolic numbers). */
export function solveExpr(e: SymExpr, x: string): SymExpr[] {
  // symbolic linear solve: A·x + B = 0 with A,B free of x  →  -B/A. Used when the
  // coefficients are themselves symbolic (e.g. solve(a*x+b==0, x) → -b/a); numeric
  // polynomials fall through to the Durand–Kerner root finder below.
  {
    const A = simplifyExpr(diffExpr(e, x));               // dE/dx = A (constant in x ⇔ linear)
    if (symVars(A).indexOf(x) < 0) {
      const B = simplifyExpr(subsExpr(e, x, sN(0)));       // E(0) = B
      const symbolic = symVars(A).length > 0 || symVars(B).length > 0;
      const Anum = symVars(A).length === 0 ? symEval(A, new Map()) : NaN;
      if (symbolic && (symVars(A).length > 0 || (Number.isFinite(Anum) && Math.abs(Anum) > 1e-12))) {
        return [simplifyExpr(sDiv(sNeg(B), A))];
      }
    }
  }
  // symbolic quadratic: a·x² + b·x + c = 0 with one or more *symbolic* coefficients
  // → the exact quadratic formula. Engaged only when a coefficient is itself symbolic;
  // numeric polynomials fall through to Durand–Kerner below (which keeps clean integer roots).
  {
    const d1 = simplifyExpr(diffExpr(e, x));                  // E'  = 2a·x + b
    const d2 = simplifyExpr(diffExpr(d1, x));                 // E'' = 2a
    const d3 = simplifyExpr(diffExpr(d2, x));                 // E''' = 0 ⇔ degree ≤ 2
    if (d3.t === 'n' && Math.abs(d3.v) < 1e-12 && symVars(d2).indexOf(x) < 0) {
      const a = simplifyExpr(sDiv(d2, sN(2)));                // ½·E''  = a
      const b = simplifyExpr(subsExpr(d1, x, sN(0)));         // E'(0)  = b
      const c = simplifyExpr(subsExpr(e, x, sN(0)));          // E(0)   = c
      const anySym = symVars(a).length > 0 || symVars(b).length > 0 || symVars(c).length > 0;
      const aZero = a.t === 'n' && Math.abs(a.v) < 1e-12;
      if (anySym && !aZero) {
        const disc = simplifyExpr(sSub(sPow(b, sN(2)), sMul(sN(4), a, c)));   // b² − 4ac
        const root = sFn('sqrt', disc);
        const den = sMul(sN(2), a);
        return [simplifyExpr(sDiv(sSub(sNeg(b), root), den)),                 // (−b − √Δ)/2a
                simplifyExpr(sDiv(sAdd(sNeg(b), root), den))];                // (−b + √Δ)/2a
      }
    }
  }
  // extract polynomial coefficients via Taylor at 0: c_k = p^(k)(0)/k!
  const coeffs: number[] = []; let term = e; let fact = 1; let deg = -1;
  for (let k = 0; k <= 8; k++) { const c = symEval(term, new Map([[x, 0]])); if (!Number.isFinite(c)) return [sFn('solve', e)]; coeffs[k] = c / fact; if (Math.abs(coeffs[k]) > 1e-12) deg = k; term = simplifyExpr(diffExpr(term, x)); fact *= (k + 1); }
  if (deg < 0) return [];
  const p = coeffs.slice(0, deg + 1).reverse();   // highest power first
  const { re, im } = durandKerner(p);
  return re.map((r, i) => (Math.abs(im[i]) < 1e-9 ? sN(Math.abs(r - Math.round(r)) < 1e-9 ? Math.round(r) : r) : sFn('complex', sN(r), sN(im[i]))));
}
// ── Symbolic ODE solver (dsolve) ─────────────────────────────────────────
const dsnap = (x: number): number => (Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : x);
const dConst = (e: SymExpr): number => { const s = simplifyExpr(e); return symVars(s).length === 0 ? symEval(s, new Map()) : NaN; };
const dIsZero = (e: SymExpr): boolean => { const s = simplifyExpr(e); return s.t === 'n' && Math.abs(s.v) < 1e-12; };
/** Replace every fn node named `name` (whole subtree) with `repl`. */
function dReplaceFn(e: SymExpr, name: string, repl: SymExpr): SymExpr {
  switch (e.t) {
    case 'fn': return e.name === name ? repl : sFn(e.name, ...e.args.map((a) => dReplaceFn(a, name, repl)));
    case 'add': return sAdd(...e.args.map((a) => dReplaceFn(a, name, repl)));
    case 'mul': return sMul(...e.args.map((a) => dReplaceFn(a, name, repl)));
    case 'pow': return sPow(dReplaceFn(e.base, name, repl), dReplaceFn(e.exp, name, repl));
    default: return e;
  }
}
function dCollectFns(e: SymExpr, into: Set<string>): void {
  if (e.t === 'fn') { into.add(e.name); e.args.forEach((a) => dCollectFns(a, into)); }
  else if (e.t === 'add' || e.t === 'mul') e.args.forEach((a) => dCollectFns(a, into));
  else if (e.t === 'pow') { dCollectFns(e.base, into); dCollectFns(e.exp, into); }
}
function dFindArg(e: SymExpr, name: string): SymExpr | null {
  if (e.t === 'fn') { if (e.name === name) return e.args[0]; for (const a of e.args) { const r = dFindArg(a, name); if (r) return r; } return null; }
  if (e.t === 'add' || e.t === 'mul') { for (const a of e.args) { const r = dFindArg(a, name); if (r) return r; } return null; }
  if (e.t === 'pow') return dFindArg(e.base, name) ?? dFindArg(e.exp, name);
  return null;
}
/** Solve a small dense linear system M·x = b (Gaussian elimination). */
function dLinSolve(M: number[][], b: number[]): number[] | null {
  const n = b.length; const A = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null; [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map((r, i) => r[n] / r[i]);
}
const dCoefBase = (e: SymExpr): SymExpr => { if (e.t === 'n') return sN(1); if (e.t === 'mul') { const rest = e.args.filter((a) => a.t !== 'n'); return rest.length === 1 ? rest[0] : sMul(...rest); } return e; };
/** Particular solution of a2 y''+a1 y'+a0 y = g via undetermined coefficients
 *  (basis = closure of g under differentiation; coefficients by sampling). */
function dParticular(a2: number, a1: number, a0: number, g: SymExpr, t: string): SymExpr | null {
  if (dIsZero(g)) return sN(0);
  if (symVars(g).some((v) => v !== t)) return null;             // parametric forcing → unsupported
  const seen = new Map<string, SymExpr>(); let frontier = [simplifyExpr(g)];
  for (let it = 0; it < 12 && frontier.length; it++) {
    const next: SymExpr[] = [];
    for (const e of frontier) { const terms = e.t === 'add' ? e.args : [e]; for (const term of terms) { const base = dCoefBase(simplifyExpr(term)); const k = exprToStr(base); if (!seen.has(k) && k !== '0') { seen.set(k, base); next.push(simplifyExpr(diffExpr(base, t))); } } }
    frontier = next;
  }
  let basis = [...seen.values()]; if (!basis.length || basis.length > 8) return null;
  const L = (y: SymExpr): SymExpr => simplifyExpr(sAdd(sMul(sN(a2), diffExpr(diffExpr(y, t), t)), sMul(sN(a1), diffExpr(y, t)), sMul(sN(a0), y)));
  const samplePts = Array.from({ length: basis.length + 2 }, (_, i) => 0.37 + 0.53 * i);
  // resonance: if L[b] ≈ 0 at the samples, bump b by t (up to twice)
  basis = basis.map((b) => { let bb = b; for (let r = 0; r < 2; r++) { if (samplePts.every((tp) => Math.abs(symEval(L(bb), new Map([[t, tp]]))) < 1e-9)) bb = simplifyExpr(sMul(sV(t), bb)); else break; } return bb; });
  const Lb = basis.map((b) => L(b));
  const M = samplePts.map((tp) => Lb.map((lb) => symEval(lb, new Map([[t, tp]]))));
  const rhs = samplePts.map((tp) => symEval(g, new Map([[t, tp]])));
  // least-squares normal equations (overdetermined): (MᵀM) c = Mᵀ rhs
  const n = basis.length; const N: number[][] = Array.from({ length: n }, () => new Array(n).fill(0)); const r2: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) for (let s = 0; s < M.length; s++) N[i][j] += M[s][i] * M[s][j]; for (let s = 0; s < M.length; s++) r2[i] += M[s][i] * rhs[s]; }
  const c = dLinSolve(N, r2); if (!c) return null;
  return simplifyExpr(sAdd(...basis.map((b, i) => sMul(sN(dsnap(c[i])), b))));
}
/** Apply initial/boundary conditions (each `cond` is an expr = 0) to fix C1,C2. */
function dApplyConds(gen: SymExpr, conds: SymExpr[], f: string, t: string): SymExpr {
  const unknowns = ['C1', 'C2'].filter((c) => symVars(gen).includes(c));
  if (!unknowns.length || !conds.length) return gen;
  const rows: number[][] = []; const rhs: number[] = [];
  for (const cond of conds) {
    const names = new Set<string>(); dCollectFns(cond, names);
    let ord = -1, pt = NaN;
    for (const nm of names) { const dm = nm.match(/^((?:diff_)+)?(\w+)$/); if (dm && dm[2] === f) { const arg = dFindArg(cond, nm); if (arg) { ord = dm[1] ? dm[1].length / 5 : 0; pt = dConst(arg); } } }
    if (!Number.isFinite(pt) || ord < 0) continue;
    let base = cond; for (const nm of names) { const dm = nm.match(/^((?:diff_)+)?(\w+)$/); if (dm && dm[2] === f) base = dReplaceFn(base, nm, sN(0)); }
    const val = -symEval(simplifyExpr(base), new Map());        // condition RHS value
    let expr = gen; for (let k = 0; k < ord; k++) expr = diffExpr(expr, t);
    expr = subsExpr(expr, t, sN(pt));
    const row = unknowns.map((u) => symEval(simplifyExpr(diffExpr(expr, u)), new Map()));
    let con = expr; for (const u of unknowns) con = subsExpr(con, u, sN(0));
    rows.push(row); rhs.push(val - symEval(simplifyExpr(con), new Map()));
  }
  if (rows.length < unknowns.length) return gen;
  const sol = dLinSolve(rows.slice(0, unknowns.length), rhs.slice(0, unknowns.length));
  if (!sol) return gen;
  let out = gen; unknowns.forEach((u, i) => { out = subsExpr(out, u, sN(dsnap(sol[i]))); });
  return simplifyExpr(out);
}
/** dsolve: 1st-order linear (integrating factor) & 2nd-order linear constant-coefficient. */
export function dsolveSolve(odeExprs: SymExpr[], conds: SymExpr[]): SymExpr {
  const ode = simplifyExpr(odeExprs[0]);
  const names = new Set<string>(); dCollectFns(ode, names);
  let f = '', maxOrd = -1;
  for (const nm of names) { const dm = nm.match(/^((?:diff_)+)(\w+)$/); if (dm) { const o = dm[1].length / 5; if (o > maxOrd) { maxOrd = o; f = dm[2]; } } }
  if (!f) throw new MatError('dsolve: no derivative of the dependent function found');
  const order = maxOrd;
  const indepArg = dFindArg(ode, 'diff_'.repeat(order) + f); const t = indepArg && indepArg.t === 'v' ? indepArg.name : 'x';
  let lin = ode; for (let k = order; k >= 0; k--) lin = dReplaceFn(lin, 'diff_'.repeat(k) + f, sV('__d' + k)); lin = simplifyExpr(lin);
  const coef: SymExpr[] = []; for (let k = 0; k <= order; k++) coef[k] = simplifyExpr(diffExpr(lin, '__d' + k));
  let c0: SymExpr = lin; for (let k = 0; k <= order; k++) c0 = subsExpr(c0, '__d' + k, sN(0)); c0 = simplifyExpr(c0);
  // linear ⇔ every partial ∂lin/∂__dk is free of the __d markers (any nonlinearity leaves one)
  const linOK = coef.every((a) => ![0, 1, 2].some((k) => symVars(a).includes('__d' + k)));
  const g = simplifyExpr(sNeg(c0));                               // forcing: Σ a_k y^(k) = g
  const C1 = sV('C1'), C2 = sV('C2');
  let gen: SymExpr;
  if (linOK && order === 1) {
    const p = simplifyExpr(sDiv(coef[0], coef[1])), q = simplifyExpr(sDiv(g, coef[1]));
    const mu = simplifyExpr(sFn('exp', integrate(p, t)));
    gen = simplifyExpr(sMul(sPow(mu, sN(-1)), sAdd(integrate(simplifyExpr(sMul(mu, q)), t), C1)));
  } else if (linOK && order === 2 && coef.every((a) => Number.isFinite(dConst(a)))) {
    const a2 = dConst(coef[2]), a1 = dConst(coef[1]), a0 = dConst(coef[0]); const disc = a1 * a1 - 4 * a0 * a2;
    let yh: SymExpr;
    if (disc > 1e-12) { const r1 = dsnap((-a1 + Math.sqrt(disc)) / (2 * a2)), r2 = dsnap((-a1 - Math.sqrt(disc)) / (2 * a2)); yh = sAdd(sMul(C1, sFn('exp', sMul(sN(r1), sV(t)))), sMul(C2, sFn('exp', sMul(sN(r2), sV(t))))); }
    else if (disc < -1e-12) { const al = dsnap(-a1 / (2 * a2)), be = dsnap(Math.sqrt(-disc) / (2 * a2)); const eat = sFn('exp', sMul(sN(al), sV(t))); yh = sMul(eat, sAdd(sMul(C1, sFn('cos', sMul(sN(be), sV(t)))), sMul(C2, sFn('sin', sMul(sN(be), sV(t)))))); }
    else { const r = dsnap(-a1 / (2 * a2)); const ert = sFn('exp', sMul(sN(r), sV(t))); yh = sMul(sAdd(C1, sMul(C2, sV(t))), ert); }
    const yp = dParticular(a2, a1, a0, g, t); if (yp === null) throw new MatError('dsolve: unsupported forcing term');
    gen = simplifyExpr(sAdd(yh, yp));
  } else {
    throw new MatError('dsolve: unsupported equation (supported: 1st-order linear, 2nd-order constant-coefficient linear)');
  }
  return dApplyConds(gen, conds, f, t);
}

/** Reduce a higher-order ODE to a first-order system: returns the vector field V
 *  (in state vars Y1..Yn) and the substitution S = [y, y', …, y^(n-1)]. */
export function odeToVectorFieldExpr(odeExpr: SymExpr): { V: SymExpr[]; S: SymExpr[]; n: number } {
  const ode = simplifyExpr(odeExpr);
  const names = new Set<string>(); dCollectFns(ode, names);
  let f = '', maxOrd = -1;
  for (const nm of names) { const dm = nm.match(/^((?:diff_)+)(\w+)$/); if (dm) { const o = dm[1].length / 5; if (o > maxOrd) { maxOrd = o; f = dm[2]; } } }
  if (!f) throw new MatError('odeToVectorField: no derivative of the dependent function found');
  const n = maxOrd;
  const indep = dFindArg(ode, 'diff_'.repeat(n) + f); const t = indep && indep.t === 'v' ? indep.name : 'x';
  let lin = dReplaceFn(ode, 'diff_'.repeat(n) + f, sV('__dn'));
  for (let k = n - 1; k >= 0; k--) lin = dReplaceFn(lin, 'diff_'.repeat(k) + f, sV('Y' + (k + 1)));
  lin = simplifyExpr(lin);
  const coef = simplifyExpr(diffExpr(lin, '__dn'));               // ODE is solvable (linear) in the top derivative
  const rest = simplifyExpr(subsExpr(lin, '__dn', sN(0)));
  const top = simplifyExpr(sMul(sN(-1), sDiv(rest, coef)));        // y^(n) = −rest / coef
  const V: SymExpr[] = []; for (let i = 2; i <= n; i++) V.push(sV('Y' + i)); V.push(top);
  const S: SymExpr[] = []; for (let k = 0; k < n; k++) S.push(sFn('diff_'.repeat(k) + f, sV(t)));
  return { V, S, n };
}
/** Functional (variational) derivative: Euler–Lagrange  ∂L/∂y − d/dx(∂L/∂y'). */
export function functionalDerivativeExpr(L: SymExpr, f: string, x: string): SymExpr {
  let lin = dReplaceFn(L, 'diff_' + f, sV('__y1')); lin = dReplaceFn(lin, f, sV('__y0'));
  const back = (e: SymExpr) => subsExpr(subsExpr(e, '__y0', sFn(f, sV(x))), '__y1', sFn('diff_' + f, sV(x)));
  const dLdy = back(simplifyExpr(diffExpr(lin, '__y0')));
  const dLdyp = back(simplifyExpr(diffExpr(lin, '__y1')));
  return simplifyExpr(sSub(dLdy, diffExpr(dLdyp, x)));
}
/** Symbolic polynomial coefficients of e in x (ascending), coefficients may involve other vars. */
function symPolyCoeffs(e: SymExpr, x: string): SymExpr[] {
  const c: SymExpr[] = []; let term = e; let fact = 1; let deg = -1;
  for (let k = 0; k <= 8; k++) { const ck = simplifyExpr(sMul(sN(1 / fact), subsExpr(term, x, sN(0)))); c[k] = ck; if (!dIsZero(ck)) deg = k; term = simplifyExpr(diffExpr(term, x)); fact *= (k + 1); }
  return c.slice(0, deg + 1);
}
/** Symbolic resultant of e1,e2 w.r.t. x (Sylvester determinant) — eliminates x. */
export function resultantSym(e1: SymExpr, e2: SymExpr, x: string): SymExpr {
  const pc = symPolyCoeffs(e1, x).reverse(), qc = symPolyCoeffs(e2, x).reverse();   // high→low
  const dp = pc.length - 1, dq = qc.length - 1; const sz = dp + dq; if (sz <= 0) return sN(1);
  const S: SymExpr[] = new Array(sz * sz).fill(sN(0));
  for (let r = 0; r < dq; r++) for (let i = 0; i < pc.length; i++) S[r + (r + i) * sz] = pc[i];
  for (let r = 0; r < dp; r++) for (let i = 0; i < qc.length; i++) S[(dq + r) + (r + i) * sz] = qc[i];
  return simplifyExpr(symDet(S, sz));
}
/** Padé approximant [m/n] of e about a0 (numerator deg m, denominator deg n). */
export function padeApprox(e: SymExpr, x: string, m: number, n: number, a0: number): SymExpr {
  const N = m + n; const c: number[] = []; let term = e; let fact = 1;
  for (let k = 0; k <= N; k++) { const v = symEval(term, new Map([[x, a0]])); if (!Number.isFinite(v)) throw new MatError('pade: function is not analytic at the expansion point'); c[k] = v / fact; term = simplifyExpr(diffExpr(term, x)); fact *= (k + 1); }
  const cc = (i: number) => (i >= 0 && i <= N ? c[i] : 0);
  let b = [1];
  if (n > 0) {
    const M: number[][] = [], rhs: number[] = [];
    for (let i = 1; i <= n; i++) { const row: number[] = []; for (let j = 1; j <= n; j++) row.push(cc(m + i - j)); M.push(row); rhs.push(-cc(m + i)); }
    const sol = dLinSolve(M, rhs); if (!sol) throw new MatError('pade: singular Padé system'); b = [1, ...sol];
  }
  const aN: number[] = []; for (let k = 0; k <= m; k++) { let s = 0; for (let j = 0; j <= Math.min(k, n); j++) s += b[j] * cc(k - j); aN[k] = s; }
  const xv = a0 === 0 ? sV(x) : sSub(sV(x), sN(a0));
  const P = sAdd(...aN.map((ak, k) => sMul(sN(dsnap(ak)), sPow(xv, sN(k)))));
  const Q = sAdd(sN(1), ...b.slice(1).map((bj, idx) => sMul(sN(dsnap(bj)), sPow(xv, sN(idx + 1)))));
  return simplifyExpr(sDiv(P, Q));
}

/** Distribute products over sums (expand). */
export function expandExpr(e: SymExpr): SymExpr {
  if (e.t === 'n' || e.t === 'v') return e;
  if (e.t === 'fn') return sFn(e.name, ...e.args.map(expandExpr));
  if (e.t === 'add') return sAdd(...e.args.map(expandExpr));
  if (e.t === 'pow') { const base = expandExpr(e.base); if (e.exp.t === 'n' && Number.isInteger(e.exp.v) && e.exp.v > 1 && e.exp.v <= 8) { let acc: SymExpr = base; for (let k = 1; k < e.exp.v; k++) acc = expandExpr(sMul(acc, base)); return acc; } return sPow(base, e.exp); }
  // mul: distribute
  const factors = e.args.map(expandExpr); let terms: SymExpr[] = [sN(1)];
  for (const f of factors) { const fterms = f.t === 'add' ? f.args : [f]; const next: SymExpr[] = []; for (const t of terms) for (const ft of fterms) next.push(sMul(t, ft)); terms = next; }
  return sAdd(...terms);
}

// ── Integral transforms (table-based symbolic Laplace / Fourier / Z) ──────────
const symHasVar = (e: SymExpr, t: string): boolean => symVars(e).includes(t);
const isZeroE = (e: SymExpr): boolean => { const s = simplifyExpr(e); return s.t === 'n' && Math.abs(s.v) < 1e-12; };
const round0 = (x: number): number => (Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : x);
/** If e is linear in t (e = a·t + b, a,b free of t) return {a,b}; else null. */
function linearInT(e: SymExpr, t: string): { a: SymExpr; b: SymExpr } | null {
  const a = simplifyExpr(diffExpr(e, t));
  if (symHasVar(a, t)) return null;
  return { a, b: simplifyExpr(subsExpr(e, t, sN(0))) };
}

/** Laplace transform of a single product term (no top-level sum). */
function laplaceTerm(e: SymExpr, t: string, s: string): SymExpr {
  e = simplifyExpr(e);
  const factors = e.t === 'mul' ? e.args : [e];
  const coef: SymExpr[] = []; let tpow = 0; let expA: SymExpr | null = null; const core: SymExpr[] = [];
  for (const f of factors) {
    if (!symHasVar(f, t)) { coef.push(f); continue; }
    if (f.t === 'v' && f.name === t) { tpow += 1; continue; }
    if (f.t === 'pow' && f.base.t === 'v' && f.base.name === t && f.exp.t === 'n' && Number.isInteger(f.exp.v) && f.exp.v > 0) { tpow += f.exp.v; continue; }
    if (f.t === 'fn' && f.name === 'exp' && f.args.length === 1) { const lin = linearInT(f.args[0], t); if (lin) { expA = expA ? simplifyExpr(sAdd(expA, lin.a)) : lin.a; if (!isZeroE(lin.b)) coef.push(sFn('exp', lin.b)); continue; } }
    core.push(f);
  }
  let F = laplaceCore(core.length ? simplifyExpr(sMul(...core)) : sN(1), t, s);
  if (expA && !isZeroE(expA)) F = subsExpr(F, s, sSub(sV(s), expA));
  for (let i = 0; i < tpow; i++) F = sNeg(diffExpr(F, s));
  F = simplifyExpr(F);
  return coef.length ? simplifyExpr(sMul(sMul(...coef), F)) : F;
}
/** Laplace transform table for a "core" factor (1, trig, hyperbolic, dirac, heaviside). */
function laplaceCore(core: SymExpr, t: string, s: string): SymExpr {
  const S = sV(s); core = simplifyExpr(core);
  if (!symHasVar(core, t)) return sMul(core, sPow(S, sN(-1)));   // L{c} = c/s
  if (core.t === 'fn' && core.args.length === 1) {
    const lin = linearInT(core.args[0], t); const s2 = sMul(S, S);
    if (lin && isZeroE(lin.b)) { const a = lin.a, a2 = sMul(a, a);
      if (core.name === 'sin') return sDiv(a, sAdd(s2, a2));
      if (core.name === 'cos') return sDiv(S, sAdd(s2, a2));
      if (core.name === 'sinh') return sDiv(a, sSub(s2, a2));
      if (core.name === 'cosh') return sDiv(S, sSub(s2, a2));
    }
    if (core.name === 'dirac' && lin && isZeroE(lin.b)) return sN(1);
    if (core.name === 'heaviside' && lin && isZeroE(lin.b)) return sPow(S, sN(-1));
  }
  return sFn('laplace', core, sV(t), S);   // unevaluated
}
export function laplaceExpr(e: SymExpr, t: string, s: string): SymExpr {
  e = simplifyExpr(expandExpr(e));
  if (e.t === 'add') return simplifyExpr(sAdd(...e.args.map((a) => laplaceTerm(a, t, s))));
  return laplaceTerm(e, t, s);
}

/** Z-transform of a single product term. */
function ztransTerm(e: SymExpr, n: string, z: string): SymExpr {
  e = simplifyExpr(e);
  const factors = e.t === 'mul' ? e.args : [e];
  const coef: SymExpr[] = []; let npow = 0; let aBase: SymExpr | null = null; const core: SymExpr[] = [];
  for (const f of factors) {
    if (!symHasVar(f, n)) { coef.push(f); continue; }
    if (f.t === 'v' && f.name === n) { npow += 1; continue; }
    if (f.t === 'pow' && f.base.t === 'v' && f.base.name === n && f.exp.t === 'n' && Number.isInteger(f.exp.v) && f.exp.v > 0) { npow += f.exp.v; continue; }
    if (f.t === 'pow' && !symHasVar(f.base, n)) { const lin = linearInT(f.exp, n); if (lin) { aBase = aBase ? simplifyExpr(sMul(aBase, sPow(f.base, lin.a))) : sPow(f.base, lin.a); if (!isZeroE(lin.b)) coef.push(sPow(f.base, lin.b)); continue; } }
    if (f.t === 'fn' && f.name === 'exp' && f.args.length === 1) { const lin = linearInT(f.args[0], n); if (lin) { aBase = aBase ? simplifyExpr(sMul(aBase, sFn('exp', lin.a))) : sFn('exp', lin.a); if (!isZeroE(lin.b)) coef.push(sFn('exp', lin.b)); continue; } }
    core.push(f);
  }
  let F = ztransCore(core.length ? simplifyExpr(sMul(...core)) : sN(1), n, z);
  if (aBase && !isZeroE(sSub(aBase, sN(1)))) F = subsExpr(F, z, sDiv(sV(z), aBase));   // Z{aⁿf} = F(z/a)
  for (let i = 0; i < npow; i++) F = sNeg(sMul(sV(z), diffExpr(F, z)));                 // Z{n·f} = -z F'(z)
  F = simplifyExpr(F);
  return coef.length ? simplifyExpr(sMul(sMul(...coef), F)) : F;
}
function ztransCore(core: SymExpr, n: string, z: string): SymExpr {
  const Z = sV(z); core = simplifyExpr(core);
  if (!symHasVar(core, n)) return sMul(core, sDiv(Z, sSub(Z, sN(1))));   // Z{c} = c·z/(z-1)
  if (core.t === 'fn' && core.args.length === 1) {
    const lin = linearInT(core.args[0], n);
    if (lin && isZeroE(lin.b)) { const a = lin.a; const den = sAdd(sMul(Z, Z), sMul(sN(-2), Z, sFn('cos', a)), sN(1));
      if (core.name === 'sin') return sDiv(sMul(Z, sFn('sin', a)), den);
      if (core.name === 'cos') return sDiv(sMul(Z, sSub(Z, sFn('cos', a))), den);
    }
    if (core.name === 'kroneckerDelta' && lin && isZeroE(lin.b)) return sN(1);
  }
  return sFn('ztrans', core, sV(n), Z);
}
export function ztransExpr(e: SymExpr, n: string, z: string): SymExpr {
  e = simplifyExpr(expandExpr(e));
  if (e.t === 'add') return simplifyExpr(sAdd(...e.args.map((a) => ztransTerm(a, n, z))));
  return ztransTerm(e, n, z);
}

/** Complex Horner evaluation (coefficients highest-first). */
function cPolyval(c: number[], xr: number, xi: number): [number, number] { let r = 0, i = 0; for (const cc of c) { const nr = r * xr - i * xi + cc, ni = r * xi + i * xr; r = nr; i = ni; } return [r, i]; }
function polyDerivHi(c: number[]): number[] { const n = c.length - 1, d: number[] = []; for (let i = 0; i < n; i++) d.push(c[i] * (n - i)); return d.length ? d : [0]; }
/** Taylor coefficients b_k = N^{(k)}(r)/k! by repeated synthetic division (coeffs highest-first). */
function taylorAtReal(c: number[], r: number): number[] {
  let work = c.slice(); const b: number[] = [];
  while (work.length) { const out = [work[0]]; for (let i = 1; i < work.length; i++) out.push(work[i] + out[i - 1] * r); b.push(out[out.length - 1]); work = out.slice(0, out.length - 1); }
  return b;
}
/** Partial-fraction inverse of a proper rational F(v)=num/den (numeric coeffs only). */
function pfeInverse(F: SymExpr, v: string, mapReal: (A: number, r: number) => SymExpr, mapComplex: (p: number, q: number, ar: number, ai: number) => SymExpr, mapRepeated: ((A: number, r: number, pow: number) => SymExpr) | null): SymExpr | null {
  const { num, den } = numDen(simplifyExpr(F));
  if (symVars(num).some((x) => x !== v) || symVars(den).some((x) => x !== v)) return null;
  const N = polyCoeffs(num, v).slice().reverse(), D = polyCoeffs(den, v).slice().reverse();   // highest-first
  if (D.length < 2 || N.length >= D.length) return null;                                        // need proper rational
  const roots = durandKerner(D); const used = new Array(roots.re.length).fill(false);
  const groups: { re: number; im: number; mult: number }[] = [];
  for (let i = 0; i < roots.re.length; i++) { if (used[i]) continue; const g = { re: roots.re[i], im: roots.im[i], mult: 1 }; used[i] = true; for (let j = i + 1; j < roots.re.length; j++) if (!used[j] && Math.hypot(roots.re[j] - g.re, roots.im[j] - g.im) < 1e-4) { used[j] = true; g.mult++; } groups.push(g); }
  const lead = D[0]; const terms: SymExpr[] = [];
  if (groups.every((g) => g.mult === 1)) {
    const Dp = polyDerivHi(D);
    for (const g of groups) {
      const [nr, ni] = cPolyval(N, g.re, g.im); const [dr, di] = cPolyval(Dp, g.re, g.im); const dd = dr * dr + di * di;
      const pr = (nr * dr + ni * di) / dd, pi = (ni * dr - nr * di) / dd;   // residue N/D'
      if (Math.abs(g.im) < 1e-7) terms.push(mapReal(round0(pr), round0(g.re)));
      else if (g.im > 0) terms.push(mapComplex(pr, pi, g.re, g.im));
    }
  } else if (groups.length === 1 && Math.abs(groups[0].im) < 1e-7 && mapRepeated) {
    const r = groups[0].re, mlt = groups[0].mult, b = taylorAtReal(N, r);
    for (let j = 0; j < mlt; j++) { const A = (b[j] ?? 0) / lead; if (Math.abs(A) > 1e-12) terms.push(mapRepeated(round0(A), round0(r), mlt - j)); }
  } else return null;
  return terms.length ? simplifyExpr(sAdd(...terms)) : sN(0);
}
export function ilaplaceExpr(F: SymExpr, s: string, t: string): SymExpr {
  const T = sV(t);
  const expRT = (r: number): SymExpr => r === 0 ? sN(1) : sFn('exp', sMul(sN(r), T));
  const res = pfeInverse(F, s,
    (A, r) => sMul(sN(A), expRT(r)),
    (p, q, ar, ai) => sMul(expRT(ar), sAdd(sMul(sN(2 * p), sFn('cos', sMul(sN(ai), T))), sMul(sN(-2 * q), sFn('sin', sMul(sN(ai), T))))),
    (A, r, pow) => sMul(sN(A / factorialN(pow - 1)), pow > 1 ? sPow(T, sN(pow - 1)) : sN(1), expRT(r)));
  return res ? simplifyExpr(res) : sFn('ilaplace', F, sV(s), T);
}
export function iztransExpr(F: SymExpr, z: string, n: string): SymExpr {
  const Nn = sV(n); const G = simplifyExpr(sMul(F, sPow(sV(z), sN(-1))));   // residues of F/z
  const res = pfeInverse(G, z,
    (A, r) => r === 0 ? sMul(sN(A), sFn('kroneckerDelta', Nn)) : sMul(sN(A), sPow(sN(r), Nn)),
    (p, q, ar, ai) => { const rho = Math.hypot(ar, ai), th = Math.atan2(ai, ar); return sMul(sPow(sN(round0(rho)), Nn), sAdd(sMul(sN(2 * p), sFn('cos', sMul(sN(round0(th)), Nn))), sMul(sN(-2 * q), sFn('sin', sMul(sN(round0(th)), Nn))))); },
    null);
  return res ? simplifyExpr(res) : sFn('iztrans', F, sV(z), Nn);
}

/** Fourier transform F(w)=∫f(t)e^{-iwt}dt — small table; uses symbolic pi, 1i, dirac. */
export function fourierExpr(e: SymExpr, t: string, w: string): SymExpr {
  e = simplifyExpr(expandExpr(e));
  if (e.t === 'add') return simplifyExpr(sAdd(...e.args.map((a) => fourierTerm(a, t, w))));
  return fourierTerm(e, t, w);
}
function fourierTerm(e: SymExpr, t: string, w: string): SymExpr {
  const W = sV(w), PI = sV('pi'), I = sV('1i');
  e = simplifyExpr(e);
  if (!symHasVar(e, t)) return simplifyExpr(sMul(e, sN(2), PI, sFn('dirac', W)));   // c → 2πc·δ(w)
  const factors = e.t === 'mul' ? e.args : [e];
  const coef: SymExpr[] = []; let tpow = 0; const core: SymExpr[] = [];
  for (const f of factors) {
    if (!symHasVar(f, t)) { coef.push(f); continue; }
    if (f.t === 'v' && f.name === t) { tpow += 1; continue; }
    if (f.t === 'pow' && f.base.t === 'v' && f.base.name === t && f.exp.t === 'n' && Number.isInteger(f.exp.v) && f.exp.v > 0) { tpow += f.exp.v; continue; }
    core.push(f);
  }
  let F = fourierCore(core.length ? simplifyExpr(sMul(...core)) : sN(1), t, w, W, PI, I);
  for (let i = 0; i < tpow; i++) F = sMul(I, diffExpr(F, w));   // F{t·f} = i F'(w)
  F = simplifyExpr(F);
  return coef.length ? simplifyExpr(sMul(sMul(...coef), F)) : F;
}
function fourierCore(core: SymExpr, t: string, w: string, W: SymExpr, PI: SymExpr, I: SymExpr): SymExpr {
  core = simplifyExpr(core);
  if (!symHasVar(core, t)) return sMul(core, sN(2), PI, sFn('dirac', W));
  if (core.t === 'fn' && core.args.length === 1) {
    const lin = linearInT(core.args[0], t);
    if (core.name === 'dirac' && lin && isZeroE(lin.b)) return sN(1);   // F{δ(t)} = 1
    if (lin && isZeroE(lin.b)) { const a = lin.a; const dm = sFn('dirac', sSub(W, a)), dp = sFn('dirac', sAdd(W, a));
      if (core.name === 'cos') return sMul(PI, sAdd(dm, dp));
      if (core.name === 'sin') return sMul(sN(-1), I, PI, sSub(dm, dp));
    }
    if (core.name === 'exp') { const arg = simplifyExpr(core.args[0]);
      // Gaussian exp(-a t²): coefficient of t² must be negative
      const c2 = simplifyExpr(subsExpr(diffExpr(diffExpr(arg, t), t), t, sN(0)));   // 2·(t² coeff)
      if (!symHasVar(c2, t) && c2.t === 'n' && c2.v < 0 && isZeroE(simplifyExpr(subsExpr(arg, t, sN(0)))) && isZeroE(simplifyExpr(subsExpr(diffExpr(arg, t), t, sN(0))))) {
        const a = sN(-c2.v / 2);   // arg = -a t²
        return sMul(sPow(sDiv(PI, a), sN(0.5)), sFn('exp', sDiv(sNeg(sMul(W, W)), sMul(sN(4), a))));
      }
    }
  }
  // exp(-a|t|) → 2a/(a²+w²)
  if (core.t === 'mul' || (core.t === 'fn' && core.name === 'exp')) {
    const ex = core.t === 'fn' ? core : null;
    if (ex && ex.name === 'exp' && ex.args[0].t === 'mul') { const ab = ex.args[0].args; const absF = ab.find((x) => x.t === 'fn' && x.name === 'abs' && x.args[0].t === 'v' && x.args[0].name === t); if (absF) { const rest = ab.filter((x) => x !== absF); const aNeg = simplifyExpr(rest.length ? sMul(...rest) : sN(1)); const a = simplifyExpr(sNeg(aNeg)); if (!symHasVar(a, t)) return sDiv(sMul(sN(2), a), sAdd(sMul(a, a), sMul(W, W))); } }
  }
  return sFn('fourier', core, sV(t), W);
}
export function ifourierExpr(F: SymExpr, w: string, t: string): SymExpr {
  F = simplifyExpr(expandExpr(F));
  if (F.t === 'add') return simplifyExpr(sAdd(...F.args.map((a) => ifourierTerm(a, w, t))));
  return ifourierTerm(F, w, t);
}
function ifourierTerm(F: SymExpr, w: string, t: string): SymExpr {
  const T = sV(t), PI = sV('pi');
  F = simplifyExpr(F);
  if (!symHasVar(F, w)) return simplifyExpr(sMul(F, sFn('dirac', T)));   // c → c·δ(t)
  const factors = F.t === 'mul' ? F.args : [F];
  const coef: SymExpr[] = []; const core: SymExpr[] = [];
  for (const f of factors) { if (!symHasVar(f, w)) coef.push(f); else core.push(f); }
  const c = core.length ? simplifyExpr(sMul(...core)) : sN(1);
  let R: SymExpr | null = null;
  if (c.t === 'fn' && c.name === 'dirac') { const lin = linearInT(c.args[0], w); if (lin && isZeroE(lin.b)) R = sDiv(sN(1), sMul(sN(2), PI)); }   // δ(w) → 1/(2π)
  // 1/(w²+a²) → (π/a)·e^{-a|t|}
  if (!R) { const { num, den } = numDen(c); if (!symHasVar(num, w)) { const dc = polyCoeffs(den, w); if (dc.length === 3 && Math.abs(dc[2] - 1) < 1e-12 && Math.abs(dc[1]) < 1e-12 && dc[0] > 0) { const a = Math.sqrt(dc[0]); R = sMul(sDiv(PI, sN(a)), sFn('exp', sMul(sN(-a), sFn('abs', T))), sPow(num as SymExpr, sN(1))); } } }
  if (!R) return sFn('ifourier', F, sV(w), T);
  return coef.length ? simplifyExpr(sMul(sMul(...coef), R)) : simplifyExpr(R);
}
