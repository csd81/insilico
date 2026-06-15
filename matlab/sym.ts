/**
 * Minimal computer-algebra core for the Symbolic Math Toolbox overloads.
 * Expressions are n-ary trees; `simplifyExpr` is the normaliser that constant-folds,
 * flattens, and combines like terms. `diffExpr` is exact symbolic differentiation.
 */
export type SymExpr =
  | { t: 'n'; v: number }
  | { t: 'v'; name: string }
  | { t: 'add'; args: SymExpr[] }
  | { t: 'mul'; args: SymExpr[] }
  | { t: 'pow'; base: SymExpr; exp: SymExpr }
  | { t: 'fn'; name: string; args: SymExpr[] };

export const sN = (v: number): SymExpr => ({ t: 'n', v });
export const sV = (name: string): SymExpr => ({ t: 'v', name });
export const sAdd = (...args: SymExpr[]): SymExpr => ({ t: 'add', args });
export const sMul = (...args: SymExpr[]): SymExpr => ({ t: 'mul', args });
export const sPow = (base: SymExpr, exp: SymExpr): SymExpr => ({ t: 'pow', base, exp });
export const sFn = (name: string, ...args: SymExpr[]): SymExpr => ({ t: 'fn', name, args });
export const sNeg = (a: SymExpr): SymExpr => sMul(sN(-1), a);
export const sSub = (a: SymExpr, b: SymExpr): SymExpr => sAdd(a, sNeg(b));
export const sDiv = (a: SymExpr, b: SymExpr): SymExpr => sMul(a, sPow(b, sN(-1)));

const isN = (e: SymExpr, v?: number): boolean => e.t === 'n' && (v === undefined || (e as { v: number }).v === v);

/** Free variables of an expression (sorted, alphabetical). */
export function symVars(e: SymExpr, into = new Set<string>()): string[] {
  if (e.t === 'v') into.add(e.name);
  else if (e.t === 'add' || e.t === 'mul' || e.t === 'fn') e.args.forEach((a) => symVars(a, into));
  else if (e.t === 'pow') { symVars(e.base, into); symVars(e.exp, into); }
  return [...into].sort();
}

/** A stable canonical key for combining like terms. */
function key(e: SymExpr): string {
  switch (e.t) {
    case 'n': return `n:${e.v}`;
    case 'v': return `v:${e.name}`;
    case 'add': return `+(${e.args.map(key).sort().join(',')})`;
    case 'mul': return `*(${e.args.map(key).sort().join(',')})`;
    case 'pow': return `^(${key(e.base)},${key(e.exp)})`;
    case 'fn': return `${e.name}(${e.args.map(key).join(',')})`;
  }
}

/** Normalise: constant-fold, flatten, combine like terms, drop identities. */
export function simplifyExpr(e: SymExpr): SymExpr {
  switch (e.t) {
    case 'n': case 'v': return e;
    case 'fn': {
      const args = e.args.map(simplifyExpr);
      if (args.every(isNum)) { const val = evalFn(e.name, args.map((a) => (a as { v: number }).v)); if (val !== null && Number.isFinite(val)) return sN(val); }
      return { t: 'fn', name: e.name, args };
    }
    case 'pow': {
      const base = simplifyExpr(e.base), exp = simplifyExpr(e.exp);
      if (isN(exp, 0)) return sN(1);
      if (isN(exp, 1)) return base;
      // 0^p = 0 only for a positive numeric exponent (0^0 handled above; 0^(−n) → Inf
      // falls through to constant folding below; 0^x with symbolic x stays unevaluated).
      if (isN(base, 0) && exp.t === 'n' && (exp as { v: number }).v > 0) return sN(0);
      if (isN(base, 1)) return sN(1);
      if (base.t === 'n' && exp.t === 'n') return sN(Math.pow(base.v, exp.v));
      if (base.t === 'fn' && base.name === 'exp') return simplifyExpr(sFn('exp', sMul(base.args[0], exp)));   // exp(u)^k = e^{k·u}
      // (a^b)^c → a^(b·c) is only valid when the outer exponent c is an integer, or the
      // inner base a is a positive real (else e.g. (x^2)^(1/2) ≠ x — it is |x|).
      if (base.t === 'pow' && ((exp.t === 'n' && Number.isInteger(exp.v)) || (base.base.t === 'n' && base.base.v > 0)))
        return simplifyExpr(sPow(base.base, sMul(base.exp, exp)));
      return sPow(base, exp);
    }
    case 'add': {
      const flat: SymExpr[] = []; const push = (x: SymExpr) => { const s = simplifyExpr(x); if (s.t === 'add') s.args.forEach(push); else flat.push(s); };
      e.args.forEach(push);
      let constSum = 0; const terms = new Map<string, { coef: number; base: SymExpr }>();
      for (const term of flat) {
        if (isNum(term)) { constSum += term.v; continue; }
        const { coef, base } = splitCoef(term); const k = key(base); const ex = terms.get(k);
        if (ex) ex.coef += coef; else terms.set(k, { coef, base });
      }
      // Pythagorean identity: c·sin(u)² + c·cos(u)² → c (collapse matched pairs).
      const trigPow = (b: SymExpr, fn: string): SymExpr | null => (b.t === 'pow' && b.exp.t === 'n' && b.exp.v === 2 && b.base.t === 'fn' && b.base.name === fn ? b.base.args[0] : null);
      for (const [ks, es] of [...terms]) { const u = trigPow(es.base, 'sin'); if (!u) continue; for (const [kc, ec] of [...terms]) { const v = trigPow(ec.base, 'cos'); if (v && ec.coef === es.coef && key(u) === key(v)) { constSum += es.coef; terms.delete(ks); terms.delete(kc); break; } } }
      const out: SymExpr[] = [];
      for (const { coef, base } of terms.values()) { if (coef === 0) continue; out.push(coef === 1 ? base : sMul(sN(coef), base)); }
      if (constSum !== 0 || out.length === 0) out.push(sN(constSum));
      return out.length === 1 ? out[0] : { t: 'add', args: out.sort((a, b) => key(a).localeCompare(key(b))) };
    }
    case 'mul': {
      const flat: SymExpr[] = []; const push = (x: SymExpr) => { const s = simplifyExpr(x); if (s.t === 'mul') s.args.forEach(push); else flat.push(s); };
      e.args.forEach(push);
      let constProd = 1; const factors = new Map<string, { exp: SymExpr; base: SymExpr }>();
      for (const f of flat) {
        if (isNum(f)) { constProd *= f.v; continue; }
        const base = f.t === 'pow' ? f.base : f; const exp = f.t === 'pow' ? f.exp : sN(1); const k = key(base); const ex = factors.get(k);
        if (ex) ex.exp = simplifyExpr(sAdd(ex.exp, exp)); else factors.set(k, { exp, base });
      }
      if (constProd === 0) return sN(0);
      const out: SymExpr[] = [];
      for (const { exp, base } of factors.values()) { if (isN(exp, 0)) continue; out.push(isN(exp, 1) ? base : sPow(base, exp)); }
      if (constProd !== 1 || out.length === 0) out.unshift(sN(constProd));
      return out.length === 1 ? out[0] : { t: 'mul', args: out };
    }
  }
}
const isNum = (e: SymExpr): e is { t: 'n'; v: number } => e.t === 'n';
/** Pull a leading numeric coefficient out of a product term. */
function splitCoef(e: SymExpr): { coef: number; base: SymExpr } {
  if (e.t === 'mul') { let c = 1; const rest: SymExpr[] = []; for (const f of e.args) { if (isNum(f)) c *= f.v; else rest.push(f); } return { coef: c, base: rest.length === 1 ? rest[0] : { t: 'mul', args: rest } }; }
  return { coef: 1, base: e };
}

/** Exact derivative of e with respect to variable `x`. */
export function diffExpr(e: SymExpr, x: string): SymExpr {
  switch (e.t) {
    case 'n': return sN(0);
    case 'v': return sN(e.name === x ? 1 : 0);
    case 'add': return sAdd(...e.args.map((a) => diffExpr(a, x)));
    case 'mul': return sAdd(...e.args.map((_, i) => sMul(diffExpr(e.args[i], x), ...e.args.filter((_, j) => j !== i))));
    case 'pow': {
      const { base, exp } = e;
      if (isNum(exp)) return sMul(exp, sPow(base, sN(exp.v - 1)), diffExpr(base, x));   // c·b^(c-1)·b'
      // d(b^e) = b^e (e'·ln b + e·b'/b)
      return sMul(sPow(base, exp), sAdd(sMul(diffExpr(exp, x), sFn('log', base)), sMul(exp, sDiv(diffExpr(base, x), base))));
    }
    case 'fn': {
      if (e.name === 'piecewise') return sFn('piecewise', ...e.args.map((a, i) => (i % 2 === 0 ? a : diffExpr(a, x))));   // differentiate value branches, keep conditions
      const u = e.args[0]; const du = diffExpr(u, x); const dd = fnDeriv(e.name, u);
      return dd ? sMul(dd, du) : sFn(`diff_${e.name}`, u);
    }
  }
}
/** Outer derivative f'(u) for a named function. */
function fnDeriv(name: string, u: SymExpr): SymExpr | null {
  switch (name) {
    case 'sin': return sFn('cos', u);
    case 'cos': return sNeg(sFn('sin', u));
    case 'tan': return sPow(sFn('sec', u), sN(2));
    case 'exp': return sFn('exp', u);
    case 'log': return sPow(u, sN(-1));
    case 'log10': return sDiv(sN(1), sMul(u, sFn('log', sN(10))));
    case 'log2': return sDiv(sN(1), sMul(u, sFn('log', sN(2))));
    case 'sqrt': return sDiv(sN(1), sMul(sN(2), sFn('sqrt', u)));
    case 'sinh': return sFn('cosh', u);
    case 'cosh': return sFn('sinh', u);
    case 'tanh': return sPow(sFn('sech', u), sN(2));
    case 'asin': return sPow(sSub(sN(1), sPow(u, sN(2))), sN(-0.5));
    case 'acos': return sNeg(sPow(sSub(sN(1), sPow(u, sN(2))), sN(-0.5)));
    case 'atan': return sDiv(sN(1), sAdd(sN(1), sPow(u, sN(2))));
    case 'cot': return sNeg(sPow(sFn('csc', u), sN(2)));
    case 'sec': return sMul(sFn('sec', u), sFn('tan', u));
    case 'csc': return sNeg(sMul(sFn('csc', u), sFn('cot', u)));
    case 'abs': return sFn('sign', u);
    case 'sign': return sN(0);
    default: return null;
  }
}
/** Numeric kernels for named functions, injected by builtins.ts at load time so the symbolic
 *  path (subs → double, fplot, constant-folding) reuses the SAME numeric implementations as the
 *  base builtins — one source of truth, not a second hand-rolled copy that drifts. sym.ts keeps a
 *  minimal built-in set (below) so it still evaluates the common functions when used standalone. */
const EXTERNAL_FN: Record<string, (...args: number[]) => number> = {};
export function registerNumericFns(fns: Record<string, (...args: number[]) => number>): void {
  Object.assign(EXTERNAL_FN, fns);
}
/** Numeric value of a named function (for constant folding). */
function evalFn(name: string, a: number[]): number | null {
  // relational / piecewise (multi-arg)
  switch (name) {
    case 'lt': return a[0] < a[1] ? 1 : 0;
    case 'gt': return a[0] > a[1] ? 1 : 0;
    case 'le': return a[0] <= a[1] ? 1 : 0;
    case 'ge': return a[0] >= a[1] ? 1 : 0;
    case 'not': return a[0] === 0 ? 1 : 0;
    case 'piecewise': { for (let i = 0; i + 1 < a.length; i += 2) if (a[i] !== 0) return a[i + 1]; return a.length % 2 ? a[a.length - 1] : NaN; }
  }
  const gammaFn = (x: number): number => { const g = 7; const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x)); x -= 1; let aa = c[0]; const t = x + g + 0.5; for (let i = 1; i < g + 2; i++) aa += c[i] / (x + i); return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * aa; };
  const erfFn = (x: number): number => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const f: Record<string, (...a: number[]) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, log: Math.log, log10: Math.log10, log2: Math.log2, sqrt: Math.sqrt, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asin: Math.asin, acos: Math.acos, atan: Math.atan, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh, abs: Math.abs, sign: Math.sign, cbrt: Math.cbrt, sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x), sech: (x) => 1 / Math.cosh(x), csch: (x) => 1 / Math.sinh(x), coth: (x) => 1 / Math.tanh(x), gamma: gammaFn, gammaln: (x) => Math.log(Math.abs(gammaFn(x))), factorial: (x) => gammaFn(x + 1), erf: erfFn, erfc: (x) => 1 - erfFn(x), real: (x) => x, conj: (x) => x, sinc: (x) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)), heaviside: (x) => (x > 0 ? 1 : x < 0 ? 0 : 0.5), imag: () => 0 };
  const fn = f[name] ?? EXTERNAL_FN[name];
  return fn ? fn(...a) : null;
}

/** Substitute every occurrence of variable `name` with expression `repl`. */
export function subsExpr(e: SymExpr, name: string, repl: SymExpr): SymExpr {
  switch (e.t) {
    case 'n': return e;
    case 'v': return e.name === name ? repl : e;
    case 'add': return { t: 'add', args: e.args.map((a) => subsExpr(a, name, repl)) };
    case 'mul': return { t: 'mul', args: e.args.map((a) => subsExpr(a, name, repl)) };
    case 'pow': return sPow(subsExpr(e.base, name, repl), subsExpr(e.exp, name, repl));
    case 'fn': return { t: 'fn', name: e.name, args: e.args.map((a) => subsExpr(a, name, repl)) };
  }
}
/** Numerically evaluate (throws via returning NaN-bearing tree if free vars remain). */
export function evalExpr(e: SymExpr, env: Map<string, number>): number {
  switch (e.t) {
    case 'n': return e.v;
    case 'v': { const v = env.get(e.name); return v === undefined ? NaN : v; }
    case 'add': return e.args.reduce((s, a) => s + evalExpr(a, env), 0);
    case 'mul': return e.args.reduce((s, a) => s * evalExpr(a, env), 1);
    case 'pow': return Math.pow(evalExpr(e.base, env), evalExpr(e.exp, env));
    case 'fn': { const v = evalFn(e.name, e.args.map((a) => evalExpr(a, env))); return v === null ? NaN : v; }
  }
}

/** Render an expression as MATLAB-ish text. */
export function exprToStr(e: SymExpr): string { return render(simplifyExpr(e), 0); }
function render(e: SymExpr, prec: number): string {
  switch (e.t) {
    case 'n': return e.v < 0 ? `(${trim(e.v)})` : trim(e.v);
    case 'v': return e.name;
    case 'fn': {
      const REL: Record<string, string> = { lt: '<', gt: '>', le: '<=', ge: '>=' };
      if (REL[e.name]) return `${render(e.args[0], 0)} ${REL[e.name]} ${render(e.args[1], 0)}`;
      if (e.name === 'list') return e.args.length === 1 ? render(e.args[0], 0) : `[${e.args.map((a) => render(a, 0)).join(', ')}]`;
      if (e.name === 'piecewise') { const rows: string[] = []; for (let i = 0; i + 1 < e.args.length; i += 2) rows.push(`${render(e.args[i + 1], 0)} if ${render(e.args[i], 0)}`); if (e.args.length % 2) rows.push(`${render(e.args[e.args.length - 1], 0)} otherwise`); return `piecewise(${rows.join(', ')})`; }
      const dm = e.name.match(/^((?:diff_)+)(.+)$/); const args = e.args.map((a) => render(a, 0)).join(', '); if (dm) return `${dm[2]}${"'".repeat(dm[1].length / 5)}(${args})`; return `${e.name}(${args})`;
    }
    case 'pow': { const s = `${render(e.base, 3)}^${render(e.exp, 3)}`; return prec > 2 ? `(${s})` : s; }
    case 'add': { const s = e.args.map((a, i) => { const r = render(a, 1); return i > 0 && !r.startsWith('-') ? `+ ${r}` : i > 0 ? `- ${r.slice(1)}` : r; }).join(' '); return prec > 1 ? `(${s})` : s; }
    case 'mul': {
      const { coef, base } = splitCoef(e); const parts = base.t === 'mul' ? base.args : [base];
      const inv = parts.filter((p) => p.t === 'pow' && isNum(p.exp) && (p.exp as { v: number }).v < 0);
      const num = parts.filter((p) => !(p.t === 'pow' && isNum(p.exp) && (p.exp as { v: number }).v < 0));
      const numStr = (coef === 1 && num.length ? num : [sN(coef) as SymExpr, ...num]).filter((p, i) => !(i === 0 && isN(p, 1) && num.length)).map((p) => render(p, 3)).join('*') || '1';
      let s = numStr;
      if (inv.length) s += '/' + inv.map((p) => render(sPow((p as { base: SymExpr }).base, sNeg((p as { exp: SymExpr }).exp)), 3)).join('/');
      return prec > 2 ? `(${s})` : s;
    }
  }
}
const trim = (x: number): string => (Number.isInteger(x) ? String(x) : parseFloat(x.toPrecision(6)).toString());

// ── LaTeX rendering (for KaTeX display in the command window / fplot titles) ──
const GREEK = new Set(['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma', 'tau', 'phi', 'chi', 'psi', 'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Omega']);
const TEXFN: Record<string, string> = {
  sin: '\\sin', cos: '\\cos', tan: '\\tan', cot: '\\cot', sec: '\\sec', csc: '\\csc',
  sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh', coth: '\\coth', exp: '\\exp', log: '\\ln',
  log10: '\\log_{10}', log2: '\\log_{2}', gamma: '\\Gamma',
};
const isNegPow = (p: SymExpr): p is { t: 'pow'; base: SymExpr; exp: { t: 'n'; v: number } } =>
  p.t === 'pow' && p.exp.t === 'n' && (p.exp as { v: number }).v < 0;
/** Best small-denominator rational p/q for x (so 0.5 → ½), else [x,1]. */
function ratOf(x: number): [number, number] {
  if (Number.isInteger(x)) return [x, 1];
  const neg = x < 0; let b = Math.abs(x); let h1 = 1, h0 = 0, k1 = 0, k0 = 1;
  for (let i = 0; i < 24; i++) { const a = Math.floor(b); [h0, h1] = [h1, a * h1 + h0]; [k0, k1] = [k1, a * k1 + k0]; const f = b - a; if (f < 1e-9 || k1 > 100000) break; b = 1 / f; }
  void h0; void k0;
  return k1 <= 100000 && Math.abs(h1 / k1 - Math.abs(x)) < 1e-9 ? [neg ? -h1 : h1, k1] : [x, 1];
}

/** Render an expression as a KaTeX-ready LaTeX string. */
export function exprToLatex(e: SymExpr): string { return tex(simplifyExpr(e), 0); }
function tex(e: SymExpr, prec: number): string {
  switch (e.t) {
    case 'n': { const s = trim(e.v); return e.v < 0 && prec > 0 ? `\\left(${s}\\right)` : s; }
    case 'v': return GREEK.has(e.name) ? `\\${e.name}` : e.name.length > 1 ? `\\mathrm{${e.name}}` : e.name;
    case 'fn': {
      if (e.name === 'sqrt') return `\\sqrt{${tex(e.args[0], 0)}}`;
      if (e.name === 'abs') return `\\left|${tex(e.args[0], 0)}\\right|`;
      const REL: Record<string, string> = { lt: '<', gt: '>', le: '\\le', ge: '\\ge' };
      if (REL[e.name]) return `${tex(e.args[0], 0)} ${REL[e.name]} ${tex(e.args[1], 0)}`;
      if (e.name === 'list') return e.args.length === 1 ? tex(e.args[0], 0) : `\\left[${e.args.map((a) => tex(a, 0)).join(', ')}\\right]`;
      if (e.name === 'piecewise') { const rows: string[] = []; for (let i = 0; i + 1 < e.args.length; i += 2) rows.push(`${tex(e.args[i + 1], 0)} & \\text{if } ${tex(e.args[i], 0)}`); if (e.args.length % 2) rows.push(`${tex(e.args[e.args.length - 1], 0)} & \\text{otherwise}`); return `\\begin{cases}${rows.join(' \\\\ ')}\\end{cases}`; }
      const args = e.args.map((a) => tex(a, 0)).join(', ');
      const dm = e.name.match(/^((?:diff_)+)(.+)$/);
      if (dm) return `${dm[2]}${"'".repeat(dm[1].length / 5)}\\!\\left(${args}\\right)`;
      const f = TEXFN[e.name];
      return f ? `${f}\\!\\left(${args}\\right)` : `\\operatorname{${e.name}}\\!\\left(${args}\\right)`;
    }
    case 'pow': {
      const { base, exp } = e;
      if (exp.t === 'n') {
        const ev = (exp as { v: number }).v;
        if (ev === 1) return tex(base, prec);
        if (ev === 0) return '1';
        if (ev === 0.5) return `\\sqrt{${tex(base, 0)}}`;
        if (ev < 0) return `\\frac{1}{${ev === -1 ? tex(base, 2) : `${tex(base, 3)}^{${trim(-ev)}}`}}`;
      }
      return `${tex(base, 3)}^{${tex(exp, 0)}}`;
    }
    case 'add': {
      let s = '';
      e.args.forEach((a, i) => {
        const neg = a.t === 'n' ? a.v < 0 : splitCoef(a).coef < 0;
        const r = tex(neg ? simplifyExpr(negate(a)) : a, 1);
        s += i === 0 ? (neg ? `-${r}` : r) : (neg ? ` - ${r}` : ` + ${r}`);
      });
      return prec > 1 ? `\\left(${s}\\right)` : s;
    }
    case 'mul': {
      const { coef, base } = splitCoef(e);
      const parts = base.t === 'mul' ? base.args : [base];
      const num: string[] = [], den: string[] = [];
      for (const p of parts) { if (isNegPow(p)) den.push(tex(sPow(p.base, sN(-p.exp.v)), 2)); else num.push(tex(p, 2)); }
      const [cp0, cq] = ratOf(coef); const neg = cp0 < 0; const cp = Math.abs(cp0);
      if (cq !== 1) den.unshift(String(cq));
      const numTok = cp === 1 && num.length ? num : [trim(cp), ...num];
      const numStr = numTok.join(' '); const denStr = den.join(' ');
      let body = denStr ? `\\frac{${numStr}}{${denStr}}` : numStr;
      if (neg) body = `-${body}`;
      return prec > 2 && /[ +\-]|\\frac/.test(body) ? `\\left(${body}\\right)` : body;
    }
  }
}
/** Negate a term (number or coef·base), for signed display in sums. */
function negate(e: SymExpr): SymExpr {
  if (e.t === 'n') return sN(-e.v);
  const { coef, base } = splitCoef(e);
  return coef === -1 ? base : sMul(sN(-coef), base);
}
