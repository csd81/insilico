/**
 * Pure symbolic-math builtins (Symbolic Math Toolbox). Kept separate from the
 * numeric builtins in `builtins.ts` because the symbolic and numeric worlds do
 * different things under names that MATLAB overloads. Polymorphic functions that
 * dispatch on numeric-vs-symbolic input (diff, det, inv, gradient, solve,
 * simplify, logical, curl, divergence, laplacian, compose) stay in `builtins.ts`.
 */
import type { Builtin, Env } from './builtins';
import {
  type Value, type Mat, type Sym, type Handle, type Cell, isSym, isStr, isMat, isHandle, isCell, bool,
  makeSym, makeCell, str, scalar, zeros, rowVec, colVec, toArray, elementwise,
  asString, asScalar, toMat as m, MatError,
} from './values';
import {
  type SymExpr, sN, sV, sAdd, sNeg, sSub, sMul, sPow, sFn,
  simplifyExpr, diffExpr, subsExpr, evalExpr as symEval, exprToStr, exprToLatex, symVars,
} from './sym';
import { symTexLines } from './format';
import {
  symArg, symToExpr, symVarsOf, symNames, transformVars, integrate, limitAt,
  solveExpr, expandExpr, polyCoeffs, numDen, parseSym, dsolveSolve, padeApprox, functionalDerivativeExpr, resultantSym, odeToVectorFieldExpr,
  symTypeName, hasSub, findByType, partfracExpr, polesOf, hilbertExpr, rewriteExpr,
  assumeVar, clearAssumptions,
  laplaceExpr, ilaplaceExpr, ztransExpr, iztransExpr, fourierExpr, ifourierExpr,
} from './sym-ops';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

/** Module-level VPA precision state (MATLAB `digits`); default 32 significant digits. */
let VPA_DIGITS = 32;

/** Binomial coefficient C(n,k) for non-negative integer n,k. */
function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

/** Faulhaber power sum P_j(m) = Σ_{k=1}^{m} k^j as a symbolic polynomial in m (j ≤ 5). */
function powerSum(j: number, m: SymExpr): SymExpr | null {
  const m1 = sAdd(m, sN(1)), m2 = sPow(m, sN(2)), m1sq = sPow(m1, sN(2)), twoM1 = sAdd(sMul(sN(2), m), sN(1));
  switch (j) {
    case 0: return m;
    case 1: return sMul(sN(1 / 2), m, m1);
    case 2: return sMul(sN(1 / 6), m, m1, twoM1);
    case 3: return sMul(sN(1 / 4), m2, m1sq);
    case 4: return sMul(sN(1 / 30), m, m1, twoM1, sSub(sAdd(sMul(sN(3), m2), sMul(sN(3), m)), sN(1)));
    case 5: return sMul(sN(1 / 12), m2, m1sq, sSub(sAdd(sMul(sN(2), m2), sMul(sN(2), m)), sN(1)));
    default: return null;
  }
}
/** Numeric value of a SymExpr if it has no free variables, else null. */
function constVal(e: SymExpr): number | null { const v = symEval(e, new Map()); return symVars(e).length === 0 && Number.isFinite(v) ? v : null; }

/** Apply a function handle to every subexpression of a given symType (for mapSymType). */
async function mapType(e: SymExpr, type: string, h: Handle, env: Env): Promise<SymExpr> {
  let cur = e;
  if (symTypeName(cur) === type) { const r = await env.callHandle(h, [makeSym(1, 1, [cur])], 1); const rs = r[0]; cur = isSym(rs) ? rs.exprs[0] : symToExpr(rs); }
  if (cur.t === 'add' || cur.t === 'mul' || cur.t === 'fn') { const args: SymExpr[] = []; for (const x of cur.args) args.push(await mapType(x, type, h, env)); return cur.t === 'fn' ? sFn(cur.name, ...args) : cur.t === 'add' ? sAdd(...args) : sMul(...args); }
  if (cur.t === 'pow') return sPow(await mapType(cur.base, type, h, env), await mapType(cur.exp, type, h, env));
  return cur;
}

export const SYM_BUILTINS: Record<string, Builtin> = {
  polynomialDegree: async (a) => { const s = symArg(a[0]); const v = a.length >= 2 ? (isSym(a[1]) ? symVarsOf(a[1])[0] : asString(a[1])) : (symVarsOf(s)[0] ?? 'x'); const c = polyCoeffs(s.exprs[0], v); let d = 0; for (let i = 0; i < c.length; i++) if (Math.abs(c[i]) > 1e-12) d = i; return ret(scalar(d)); },
  quorem: async (a, n) => { const A = m(a[0]), B = m(a[1]); const Q = elementwise(A, B, (x, y) => Math.floor(x / y)); const R = elementwise(A, B, (x, y) => x - Math.floor(x / y) * y); return n >= 2 ? [Q, R] : [Q]; },
  sym: async (a) => {
    if (isSym(a[0])) return ret(a[0]);
    if (isStr(a[0]) || (isMat(a[0]) && (a[0] as Mat).isChar)) { const t = asString(a[0]).trim(); const num = Number(t); if (Number.isFinite(num) && /^[-\d.]+$/.test(t)) return ret(makeSym(1, 1, [sN(num)])); try { return ret(parseSym(t)); } catch { return ret(makeSym(1, 1, [sV(t)])); } }
    const M = m(a[0]); return ret(makeSym(M.rows, M.cols, Array.from(M.data, (x) => sN(x))));
  },
  str2sym: async (a) => ret(parseSym(asString(a[0]))),
  syms: async () => [],   // handled specially in interp (assigns symbolic variables)
  int: async (a) => {
    const s = symArg(a[0]); const varGiven = a.length >= 2 && (isStr(a[1]) || (isMat(a[1]) && (a[1] as Mat).isChar) || (isSym(a[1]) && symVars(a[1].exprs[0]).length));
    const v = varGiven ? (isSym(a[1]) ? symVarsOf(a[1])[0] : asString(a[1])) : (symVarsOf(s)[0] ?? 'x');
    const F = s.exprs.map((e) => integrate(e, v));
    // limits: int(f,x,a,b) (4-arg) or int(f,a,b) (3-arg, default var)
    let lim: [Value, Value] | null = null;
    if (a.length >= 4 && varGiven) lim = [a[2], a[3]]; else if (a.length >= 3 && !varGiven) lim = [a[1], a[2]];
    if (lim) { const lo = symToExpr(lim[0]), hi = symToExpr(lim[1]); return ret(makeSym(s.rows, s.cols, F.map((Fe) => { const d = simplifyExpr(sAdd(subsExpr(Fe, v, hi), sNeg(subsExpr(Fe, v, lo)))); const num = symEval(d, new Map()); return Number.isFinite(num) ? sN(num) : d; }))); }
    return ret(makeSym(s.rows, s.cols, F.map(simplifyExpr)));
  },
  limit: async (a) => {
    const s = symArg(a[0]);
    // optional trailing direction string: limit(f, x, p, 'left'|'right'|'-'|'+')
    let args = a; let dir: 'left' | 'right' | undefined;
    const last = a[a.length - 1];
    const ls = (isStr(last) || (isMat(last) && (last as Mat).isChar)) ? asString(last).toLowerCase() : '';
    if (ls === 'left' || ls === '-' || ls === 'right' || ls === '+') { dir = (ls === 'left' || ls === '-') ? 'left' : 'right'; args = a.slice(0, -1); }
    const v = args.length >= 3 ? (isSym(args[1]) ? symNames(args[1])[0] : asString(args[1])) : (symVarsOf(s)[0] ?? 'x');
    const pt = symToExpr(args[args.length - 1]);
    const exprs = s.exprs.map((e) => limitAt(e, v, pt, dir));
    return ret(makeSym(s.rows, s.cols, exprs));
  },
  jacobian: async (a) => { const s = symArg(a[0]); const vars = a.length >= 2 ? symNames(a[1]) : symVarsOf(s); const J: SymExpr[] = []; const nf = s.exprs.length; for (let c = 0; c < vars.length; c++) for (let r = 0; r < nf; r++) J[r + c * nf] = simplifyExpr(diffExpr(s.exprs[r], vars[c])); return ret(makeSym(nf, vars.length, J)); },
  hessian: async (a) => { const s = symArg(a[0]); const vars = a.length >= 2 ? symNames(a[1]) : symVarsOf(s); const nv = vars.length; const H: SymExpr[] = []; for (let i = 0; i < nv; i++) for (let j = 0; j < nv; j++) H[i + j * nv] = simplifyExpr(diffExpr(diffExpr(s.exprs[0], vars[i]), vars[j])); return ret(makeSym(nv, nv, H)); },
  taylor: async (a) => {
    const s = symArg(a[0]);
    const isText = (x: Value | undefined): boolean => !!x && (isStr(x) || (isMat(x) && (x as Mat).isChar === true));
    let v = symVarsOf(s)[0] ?? 'x'; let a0 = 0; let ord = 6; let idx = 1;
    // optional positional variable (a sym/char that isn't an option keyword)
    if (a.length > 1 && (isSym(a[1]) || (isText(a[1]) && !['order', 'expansionpoint'].includes(asString(a[1]).toLowerCase())))) {
      v = isSym(a[1]) ? (symVarsOf(a[1] as Sym)[0] ?? v) : asString(a[1]); idx = 2;
    }
    // optional positional expansion point (a number)
    if (a.length > idx && isMat(a[idx]) && !(a[idx] as Mat).isChar) { a0 = asScalar(a[idx]); idx++; }
    // 'Order'/'ExpansionPoint' name-value pairs
    for (let i = idx; i + 1 < a.length; i += 2) {
      if (!isText(a[i])) continue; const key = asString(a[i]).toLowerCase();
      if (key === 'order') ord = Math.round(asScalar(a[i + 1])); else if (key === 'expansionpoint') a0 = asScalar(a[i + 1]);
    }
    let term = s.exprs[0]; let acc: SymExpr = sN(0); let fact = 1;
    for (let k = 0; k < ord; k++) { const c = symEval(term, new Map([[v, a0]])); if (Number.isFinite(c)) acc = sAdd(acc, sMul(sN(c / fact), sPow(sAdd(sV(v), sN(-a0)), sN(k)))); term = diffExpr(term, v); fact *= (k + 1); }
    return ret(makeSym(1, 1, [simplifyExpr(acc)]));
  },
  expand: async (a) => { const s = symArg(a[0]); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => simplifyExpr(expandExpr(e))))); },
  subs: async (a) => {
    const s = symArg(a[0]);
    let vars: string[]; let repls: SymExpr[];
    if (a.length >= 3) {
      vars = symNames(a[1]); const vv = a[2];
      if (isSym(vv)) repls = (vv as Sym).exprs;
      else if (isCell(vv)) repls = (vv as Cell).items.map((it) => symToExpr(it));
      else repls = toArray(m(vv)).map((x) => sN(x));
    } else { vars = [symVarsOf(s)[0] ?? 'x']; repls = [symToExpr(a[1])]; }
    let exprs = s.exprs;
    for (let k = 0; k < vars.length; k++) { const r = repls[Math.min(k, repls.length - 1)]; exprs = exprs.map((e) => subsExpr(e, vars[k], r)); }
    exprs = exprs.map(simplifyExpr);
    const out = makeSym(s.rows, s.cols, exprs);
    if (out.exprs.every((e) => symVars(e).length === 0)) { const M = zeros(s.rows, s.cols); out.exprs.forEach((e, i) => { M.data[i] = symEval(e, new Map()); }); return ret(M); }
    return ret(out);
  },
  vpa: async (a) => { const s = symArg(a[0]); const d = a.length >= 2 ? Math.round(asScalar(a[1])) : VPA_DIGITS; const M = zeros(s.rows, s.cols); let allNum = true; s.exprs.forEach((e, i) => { const v = symEval(e, new Map()); M.data[i] = v !== 0 && Number.isFinite(v) ? Number(v.toPrecision(Math.max(1, Math.min(100, d)))) : v; if (!Number.isFinite(v)) allNum = false; }); return ret(allNum ? M : a[0]); },
  latex: async (a) => ret(str(symArg(a[0]).exprs.map(exprToLatex).join(', '))),
  texlabel: async (a) => {
    const s = (isStr(a[0]) || (isMat(a[0]) && (a[0] as Mat).isChar)) ? parseSym(asString(a[0])) : symArg(a[0]);
    let tx = s.exprs.map(exprToLatex).join(', ');
    // MATLAB texlabel splits a greek-name prefix from trailing chars and subscripts the rest:
    // an identifier like `lambda12` → `\lambda_{12}` (the sym parser keeps it as one token → \mathrm{…}).
    const greek = 'alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega';
    tx = tx.replace(new RegExp('\\\\mathrm\\{(' + greek + ')([0-9A-Za-z]*)\\}', 'g'), (_m, g, rest) => '\\' + g + (rest ? '_{' + rest + '}' : ''));
    return ret(str('{' + tx + '}'));
  },
  cell2sym: async (a) => { const C = a[0] as Cell; const exprs = C.items.map((it) => ((isStr(it) || (isMat(it) && (it as Mat).isChar)) ? parseSym(asString(it)).exprs[0] : symToExpr(it))); return ret(makeSym(C.rows, C.cols, exprs)); },
  sym2cell: async (a) => { const s = symArg(a[0]); return ret(makeCell(s.rows, s.cols, s.exprs.map((e) => makeSym(1, 1, [e]) as Value))); },
  series: async (a, n, env) => SYM_BUILTINS.taylor(a, n, env),
  dsolve: async (a) => { const ode = symArg(a[0]).exprs; const conds = a.slice(1).filter((c) => isSym(c) || isMat(c)).map((c) => symArg(c).exprs[0]); return ret(makeSym(1, 1, [dsolveSolve(ode, conds)])); },
  piecewise: async (a) => ret(makeSym(1, 1, [simplifyExpr(sFn('piecewise', ...a.map((x) => symArg(x).exprs[0])))])),
  symfun: async (a) => { const body = symArg(a[0]); const out = makeSym(body.rows, body.cols, body.exprs); out.fnArgs = symNames(a[1]); return ret(out); },
  odeToVectorField: async (a, n) => { const r = odeToVectorFieldExpr(symArg(a[0]).exprs[0]); const V = makeSym(r.n, 1, r.V); return n >= 2 ? [V, makeSym(r.n, 1, r.S)] : ret(V); },
  symtrue: async () => ret(makeSym(1, 1, [sN(1)])),
  symfalse: async () => ret(makeSym(1, 1, [sN(0)])),
  vpasum: async (a) => { const s = symArg(a[0]); const k = isSym(a[1]) ? symVarsOf(a[1])[0] : asString(a[1]); const lo = Math.round(asScalar(a[2])), hi = Math.round(asScalar(a[3])); let acc = 0; for (let i = lo; i <= hi; i++) acc += symEval(s.exprs[0], new Map([[k, i]])); return ret(scalar(acc)); },
  vpaintegral: async (a) => {
    const s = symArg(a[0]); let idx = 1; let v = symVarsOf(s)[0] ?? 'x';
    if (a.length > 1 && (isSym(a[1]) || (isMat(a[1]) && (a[1] as Mat).isChar) || isStr(a[1]))) { v = isSym(a[1]) ? (symVarsOf(a[1])[0] ?? v) : asString(a[1]); idx = 2; }
    let lo: number, hi: number;
    if (isMat(a[idx]) && a[idx].kind === 'num' && (a[idx] as Mat).rows * (a[idx] as Mat).cols >= 2) { const r = toArray(a[idx] as Mat); lo = r[0]; hi = r[1]; } else { lo = asScalar(a[idx]); hi = asScalar(a[idx + 1]); }
    const f = (t: number) => symEval(s.exprs[0], new Map([[v, t]]));   // composite Simpson
    const N = 2000; const h = (hi - lo) / N; let acc = f(lo) + f(hi);
    for (let i = 1; i < N; i++) acc += (i % 2 ? 4 : 2) * f(lo + i * h);
    return ret(scalar(acc * h / 3));
  },
  matlabFunction: async (a, _n, env) => {
    const s = symArg(a[0]); let vars: string[] | null = null;
    for (let i = 1; i + 1 < a.length; i++) { if ((isStr(a[i]) || (isMat(a[i]) && (a[i] as Mat).isChar)) && asString(a[i]).toLowerCase() === 'vars') { const vv = a[i + 1]; vars = isCell(vv) ? (vv as Cell).items.map((x) => (isSym(x) ? (symVarsOf(x)[0] ?? asString(x)) : asString(x))) : isSym(vv) ? symNames(vv) : [asString(vv)]; } }
    if (!vars) { const set = new Set<string>(); s.exprs.forEach((e) => symVars(e).forEach((v) => set.add(v))); vars = [...set].sort(); }
    const bodyOf = (e: SymExpr) => exprToStr(e).replace(/\^/g, '.^').replace(/\*/g, '.*').replace(/\//g, './');
    const body = s.exprs.length === 1 ? bodyOf(s.exprs[0]) : '[' + s.exprs.map(bodyOf).join(', ') + ']';
    return ret(await env.evalInput(`@(${(vars.length ? vars : ['x']).join(',')}) ${body}`));
  },
  functionalDerivative: async (a) => {
    const L = symArg(a[0]); const yarg = a[1];
    const ye = isSym(yarg) ? (yarg as Sym).exprs[0] : sFn(symNames(yarg)[0], sV('x'));
    const f = ye.t === 'fn' ? ye.name : (symVars(ye)[0] ?? 'y');
    const x = ye.t === 'fn' && ye.args[0]?.t === 'v' ? (ye.args[0] as { name: string }).name : (symVarsOf(L).find((v) => v !== f) ?? 'x');
    return ret(makeSym(L.rows, L.cols, L.exprs.map((e) => functionalDerivativeExpr(e, f, x))));
  },
  eliminate: async (a) => {
    const eqs = symArg(a[0]); const vars = symNames(a[1]);
    if (eqs.exprs.length === 2 && vars.length === 1) return ret(makeSym(1, 1, [resultantSym(eqs.exprs[0], eqs.exprs[1], vars[0])]));
    throw new MatError('eliminate: only 2 equations in 1 eliminated variable are supported');
  },
  pade: async (a) => {
    const s = symArg(a[0]); let v = symVarsOf(s)[0] ?? 'x'; let mm = 3, nn = 3, a0 = 0; let i = 1;
    if (a.length > 1 && (isSym(a[1]) || ((isStr(a[1]) || (isMat(a[1]) && (a[1] as Mat).isChar)) && !['order', 'expansionpoint'].includes(asString(a[1]).toLowerCase())))) { v = isSym(a[1]) ? (symVarsOf(a[1])[0] ?? v) : asString(a[1]); i = 2; }
    for (; i + 1 < a.length; i += 2) { const key = asString(a[i]).toLowerCase(); if (key === 'order') { const o = toArray(m(a[i + 1])); if (o.length >= 2) { mm = Math.round(o[0]); nn = Math.round(o[1]); } else { mm = nn = Math.round(o[0]); } } else if (key === 'expansionpoint') a0 = asScalar(a[i + 1]); }
    return ret(makeSym(1, 1, [padeApprox(s.exprs[0], v, mm, nn, a0)]));
  },
  pretty: async (a, _n, env) => { env.output(symTexLines(symArg(a[0])).join('\n') + '\n'); return []; },
  isAlways: async (a) => { const s = symArg(a[0]); const o = zeros(s.rows, s.cols); o.isBool = true; s.exprs.forEach((e, i) => { o.data[i] = Math.abs(symEval(e, new Map())) < 1e-12 ? 1 : 0; }); return ret(o); },
  potential: async (a) => { const F = symArg(a[0]).exprs; const v = symNames(a[1]); return ret(makeSym(1, 1, [simplifyExpr(integrate(F[0], v[0]))])); },
  coeffs: async (a, n) => { const s = symArg(a[0]); const v = a.length >= 2 && (isStr(a[1]) || (isMat(a[1]) && (a[1] as Mat).isChar) || isSym(a[1])) ? (isSym(a[1]) ? symVarsOf(a[1])[0] : asString(a[1])) : (symVarsOf(s)[0] ?? 'x'); const c = polyCoeffs(s.exprs[0], v); const nz = c.map((cc, i) => [cc, i] as [number, number]).filter(([cc]) => Math.abs(cc) > 1e-12); return n >= 2 ? [makeSym(1, nz.length, nz.map(([cc]) => sN(cc))), makeSym(1, nz.length, nz.map(([, i]) => i === 0 ? sN(1) : sPow(sV(v), sN(i))))] : [makeSym(1, nz.length, nz.map(([cc]) => sN(cc)))]; },
  sym2poly: async (a) => { const s = symArg(a[0]); const v = symVarsOf(s)[0] ?? 'x'; return ret(rowVec(polyCoeffs(s.exprs[0], v).slice().reverse())); },
  poly2sym: async (a) => { const c = toArray(m(a[0])); const v = a.length >= 2 ? (isSym(a[1]) ? symVarsOf(a[1])[0] : asString(a[1])) : 'x'; let e: SymExpr = sN(0); const d = c.length - 1; c.forEach((ci, i) => { e = sAdd(e, sMul(sN(ci), sPow(sV(v), sN(d - i)))); }); return ret(makeSym(1, 1, [simplifyExpr(e)])); },
  numden: async (a, n) => { const s = symArg(a[0]); const { num, den } = numDen(s.exprs[0]); return n >= 2 ? [makeSym(1, 1, [simplifyExpr(num)]), makeSym(1, 1, [simplifyExpr(den)])] : [makeSym(1, 1, [simplifyExpr(num)])]; },
  collect: async (a) => { const s = symArg(a[0]); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => simplifyExpr(expandExpr(e))))); },
  laplace: async (a) => { const { s, indep, trans } = transformVars(a, 't', 's'); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => laplaceExpr(e, indep, trans)))); },
  ilaplace: async (a) => { const { s, indep, trans } = transformVars(a, 's', 't'); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => ilaplaceExpr(e, indep, trans)))); },
  ztrans: async (a) => { const { s, indep, trans } = transformVars(a, 'n', 'z'); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => ztransExpr(e, indep, trans)))); },
  iztrans: async (a) => { const { s, indep, trans } = transformVars(a, 'z', 'n'); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => iztransExpr(e, indep, trans)))); },
  fourier: async (a) => { const { s, indep, trans } = transformVars(a, 't', 'w'); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => fourierExpr(e, indep, trans)))); },
  ifourier: async (a) => { const { s, indep, trans } = transformVars(a, 'w', 't'); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => ifourierExpr(e, indep, trans)))); },
  combine: async (a) => { const s = symArg(a[0]); return ret(makeSym(s.rows, s.cols, s.exprs.map(simplifyExpr))); },
  simplifyFraction: async (a) => { const s = symArg(a[0]); return ret(makeSym(s.rows, s.cols, s.exprs.map(simplifyExpr))); },
  horner: async (a) => ret(symArg(a[0])),
  children: async (a) => { const e = symArg(a[0]).exprs[0]; const kids = e.t === 'add' || e.t === 'mul' || e.t === 'fn' ? e.args : e.t === 'pow' ? [e.base, e.exp] : [e]; return ret(makeCell(1, kids.length, kids.map((k) => makeSym(1, 1, [k])))); },
  lhs: async (a) => ret(symArg(a[0])),
  rhs: async () => ret(makeSym(1, 1, [sN(0)])),
  // ── introspection ──
  has: async (a) => ret(bool(hasSub(symArg(a[0]).exprs[0], symToExpr(a[1])))),
  symType: async (a) => ret(str(symTypeName(symArg(a[0]).exprs[0]))),
  isSymType: async (a) => ret(bool(symTypeName(symArg(a[0]).exprs[0]) === asString(a[1]))),
  hasSymType: async (a) => ret(bool(findByType(symArg(a[0]).exprs[0], asString(a[1])).length > 0)),
  findSymType: async (a) => { const found = findByType(symArg(a[0]).exprs[0], asString(a[1])); return ret(makeSym(1, found.length, found)); },
  argnames: async (a) => { const v = symVarsOf(symArg(a[0])); return ret(makeSym(1, v.length, v.map((x) => sV(x)))); },
  formula: async (a) => ret(symArg(a[0])),
  mapSymType: async (a, _n, env) => {
    const s = symArg(a[0]); const type = asString(a[1]); const h = a[2] as Handle;
    const out: SymExpr[] = [];
    for (const e of s.exprs) out.push(simplifyExpr(await mapType(e, type, h, env)));
    return ret(makeSym(s.rows, s.cols, out));
  },
  // ── rational/poly algebra ──
  partfrac: async (a) => { const s = symArg(a[0]); const v = a.length >= 2 ? (isSym(a[1]) ? symVarsOf(a[1])[0] : asString(a[1])) : (symVarsOf(s)[0] ?? 'x'); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => partfracExpr(e, v)))); },
  poles: async (a) => { const s = symArg(a[0]); const v = a.length >= 2 ? (isSym(a[1]) ? symVarsOf(a[1])[0] : asString(a[1])) : (symVarsOf(s)[0] ?? 'x'); const ps = polesOf(s.exprs[0], v); return ret(makeSym(ps.length, 1, ps)); },
  rewrite: async (a) => { const s = symArg(a[0]); const target = asString(a[1]); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => simplifyExpr(rewriteExpr(e, target))))); },
  // ── Hilbert transform ──
  htrans: async (a) => { const { s, indep } = transformVars(a, 't', 't'); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => hilbertExpr(e, indep)))); },
  ihtrans: async (a) => { const { s, indep } = transformVars(a, 't', 't'); return ret(makeSym(s.rows, s.cols, s.exprs.map((e) => sNeg(hilbertExpr(e, indep))))); },
  vpasolve: async (a) => { const s = symArg(a[0]); const v = a.length >= 2 && (isStr(a[1]) || (isMat(a[1]) && (a[1] as Mat).isChar) || isSym(a[1])) ? (isSym(a[1]) ? symVarsOf(a[1])[0] : asString(a[1])) : (symVarsOf(s)[0] ?? 'x'); const re = solveExpr(s.exprs[0], v).map((r) => symEval(r, new Map())); return ret(colVec(re.filter(Number.isFinite))); },
  finverse: async (a) => { const s = symArg(a[0]); const v = symVarsOf(s)[0] ?? 'x'; const roots = solveExpr(sAdd(s.exprs[0], sNeg(sV('y'))), v); return ret(makeSym(1, 1, [roots[0] ? simplifyExpr(subsExpr(roots[0], 'y', sV(v))) : sFn('finverse', s.exprs[0])])); },
  isolate: async (a) => { const s = symArg(a[0]); const v = a.length >= 2 ? (isSym(a[1]) ? symVarsOf(a[1])[0] : asString(a[1])) : (symVarsOf(s)[0] ?? 'x'); const roots = solveExpr(s.exprs[0], v); return ret(makeSym(1, 1, [roots[0] ?? s.exprs[0]])); },
  equationsToMatrix: async (a, n) => {
    const eqs = symArg(a[0]); const vars = symNames(a[1]); const ne = eqs.exprs.length, nv = vars.length;
    const A = zeros(ne, nv), b = zeros(ne, 1);
    for (let i = 0; i < ne; i++) { const e = eqs.exprs[i]; const env0 = new Map(vars.map((vn) => [vn, 0])); const c0 = symEval(e, env0); b.data[i] = -c0; for (let j = 0; j < nv; j++) { const env1 = new Map(env0); env1.set(vars[j], 1); A.data[i + j * ne] = symEval(e, env1) - c0; } }
    return n >= 2 ? [A, b] : [A];
  },
  symsum: async (a) => {
    const s = symArg(a[0]);
    // accept both symsum(f, k, lo, hi) and the default-variable form symsum(f, lo, hi)
    const fourArg = a.length >= 4;
    const k = fourArg ? (isSym(a[1]) ? symVarsOf(a[1] as Sym)[0] : asString(a[1])) : (symVarsOf(s)[0] ?? 'k');
    const loA = fourArg ? a[2] : a[1]; const hiA = fourArg ? a[3] : a[2];
    const loE = isSym(loA) ? (loA as Sym).exprs[0] : sN(asScalar(loA));
    const hiE = isSym(hiA) ? (hiA as Sym).exprs[0] : sN(asScalar(hiA));
    const loN = constVal(loE), hiN = constVal(hiE); const f = s.exprs[0];
    if (loN !== null && hiN !== null) { let acc: SymExpr = sN(0); for (let i = Math.round(loN); i <= Math.round(hiN); i++) acc = sAdd(acc, subsExpr(f, k, sN(i))); return ret(makeSym(1, 1, [simplifyExpr(acc)])); }
    const isZero = (e: SymExpr) => e.t === 'n' && Math.abs(e.v) < 1e-12;
    // (1) Geometric: if the term ratio s(k+1)/s(k) is independent of k, use the closed form.
    const ratio = simplifyExpr(sMul(subsExpr(f, k, sAdd(sV(k), sN(1))), sPow(f, sN(-1))));
    if (!symVars(ratio).includes(k)) {
      const sLo = subsExpr(f, k, loE), sHi = subsExpr(f, k, hiE);
      if (ratio.t === 'n' && Math.abs(ratio.v - 1) < 1e-12) return ret(makeSym(1, 1, [simplifyExpr(sMul(f, sAdd(sSub(hiE, loE), sN(1))))]));   // constant in k
      const sum = sMul(sSub(sLo, sMul(ratio, sHi)), sPow(sSub(sN(1), ratio), sN(-1)));   // (s(lo) − r·s(hi))/(1 − r)
      return ret(makeSym(1, 1, [simplifyExpr(sum)]));
    }
    // (2) Polynomial in k with (possibly symbolic) coefficients → Faulhaber, via symbolic
    //     Taylor coefficients  c_j = (∂ₖʲ f)|_{k=0} / j!.
    const coefs: SymExpr[] = []; let dterm = f; let fact = 1; let ok = false;
    for (let j = 0; j <= 6; j++) {
      coefs[j] = simplifyExpr(sMul(sN(1 / fact), subsExpr(dterm, k, sN(0))));
      dterm = simplifyExpr(diffExpr(dterm, k)); fact *= (j + 1);
      if (isZero(dterm)) { ok = true; break; }
    }
    if (!ok) throw new MatError('symsum: only polynomial (deg ≤5) or geometric summands are supported for symbolic limits');
    let acc: SymExpr = sN(0);
    for (let j = 0; j < coefs.length; j++) { if (isZero(coefs[j])) continue; const up = powerSum(j, hiE)!, dn = powerSum(j, sSub(loE, sN(1)))!; acc = sAdd(acc, sMul(coefs[j], sSub(up, dn))); }
    return ret(makeSym(1, 1, [simplifyExpr(acc)]));
  },
  symprod: async (a) => {
    const s = symArg(a[0]);
    const fourArg = a.length >= 4;
    const k = fourArg ? (isSym(a[1]) ? symVarsOf(a[1] as Sym)[0] : asString(a[1])) : (symVarsOf(s)[0] ?? 'k');
    const loA = fourArg ? a[2] : a[1]; const hiA = fourArg ? a[3] : a[2];
    const loE = isSym(loA) ? (loA as Sym).exprs[0] : sN(asScalar(loA));
    const hiE = isSym(hiA) ? (hiA as Sym).exprs[0] : sN(asScalar(hiA));
    const loN = constVal(loE), hiN = constVal(hiE);
    if (loN !== null && hiN !== null) { let acc: SymExpr = sN(1); for (let i = Math.round(loN); i <= Math.round(hiN); i++) acc = sMul(acc, subsExpr(s.exprs[0], k, sN(i))); return ret(makeSym(1, 1, [simplifyExpr(acc)])); }
    // Symbolic limit: ∏ k = hi!/(lo-1)! when the summand is the index variable itself.
    if (exprToStr(s.exprs[0]) === k) { const r = sMul(sFn('factorial', hiE), sPow(sFn('factorial', sSub(loE, sN(1))), sN(-1))); return ret(makeSym(1, 1, [simplifyExpr(r)])); }
    throw new MatError('symprod: symbolic products are supported only for the index variable (→ factorial)');
  },
  assume: async (a) => { if (a.length >= 2) { const name = isSym(a[0]) ? (symVarsOf(a[0])[0] ?? asString(a[0])) : asString(a[0]); assumeVar(name, asString(a[1])); } else if (a.length === 1 && isSym(a[0])) { clearAssumptions(symVarsOf(a[0])[0]); } return []; },
  assumeAlso: async (a) => { if (a.length >= 2) { const name = isSym(a[0]) ? (symVarsOf(a[0])[0] ?? asString(a[0])) : asString(a[0]); assumeVar(name, asString(a[1])); } return []; },
  assumptions: async () => ret(makeSym(0, 0, [])), sympref: async () => [],
  digits: async (a) => { if (a.length >= 1) { VPA_DIGITS = Math.round(asScalar(a[0])); return []; } return ret(scalar(VPA_DIGITS)); },

  // nth Bernstein polynomial: B = Σ_{k=0}^n f(k/n)·C(n,k)·t^k·(1-t)^(n-k).
  bernstein: async (a) => {
    const f = symArg(a[0]); const n = Math.round(asScalar(a[1]));
    const tSym = symArg(a[2]); const tName = symVarsOf(tSym)[0] ?? 'x';
    const fVar = symVarsOf(f)[0] ?? 'x';
    const t = sV(tName); const oneMinusT = sSub(sN(1), t);
    const terms: SymExpr[] = [];
    for (let k = 0; k <= n; k++) {
      const fk = subsExpr(f.exprs[0], fVar, sN(n === 0 ? 0 : k / n));
      terms.push(sMul(fk, sN(binom(n, k)), sPow(t, sN(k)), sPow(oneMinusT, sN(n - k))));
    }
    return ret(makeSym(1, 1, [simplifyExpr(sAdd(...terms))]));
  },

  // Rewrite an expression replacing its most common nontrivial repeated subexpression with sigma.
  subexpr: async (a, n) => {
    const s = symArg(a[0]); const sigmaName = a.length >= 2 ? asString(a[1]) : 'sigma';
    const counts = new Map<string, { e: SymExpr; c: number }>();
    const visit = (x: SymExpr) => {
      if (x.t === 'add' || x.t === 'mul' || x.t === 'fn' || x.t === 'pow') {
        const key = exprToStr(x); const prev = counts.get(key);
        if (prev) prev.c++; else counts.set(key, { e: x, c: 1 });
      }
      if (x.t === 'add' || x.t === 'mul' || x.t === 'fn') x.args.forEach(visit);
      else if (x.t === 'pow') { visit(x.base); visit(x.exp); }
    };
    s.exprs.forEach((e) => visit(e));
    // Choose the repeated subexpression (count>=2) with the smallest string form (MATLAB favours the atomic one, e.g. a^2).
    let best: { e: SymExpr; key: string } | null = null;
    for (const { e, c } of counts.values()) {
      if (c < 2) continue;
      const key = exprToStr(e);
      if (!best || key.length < best.key.length) best = { e, key };
    }
    if (!best) { const r = makeSym(s.rows, s.cols, s.exprs.slice()); return n >= 2 ? [r, makeSym(0, 0, [])] : [r]; }
    const target = best.key;
    const replace = (x: SymExpr): SymExpr => {
      if (exprToStr(x) === target) return sV(sigmaName);
      if (x.t === 'add') return sAdd(...x.args.map(replace));
      if (x.t === 'mul') return sMul(...x.args.map(replace));
      if (x.t === 'fn') return sFn(x.name, ...x.args.map(replace));
      if (x.t === 'pow') return sPow(replace(x.base), replace(x.exp));
      return x;
    };
    const shorter = makeSym(s.rows, s.cols, s.exprs.map((e) => simplifyExpr(replace(e))));
    const sigma = makeSym(1, 1, [best.e]);
    return n >= 2 ? [shorter, sigma] : [shorter];
  },

  // Univariate polynomial reduction: [remainder, quotient] of p divided by a single divisor.
  polynomialReduce: async (a, n) => {
    const p = symArg(a[0]); const dv = symArg(a[1]);
    if (dv.rows * dv.cols !== 1) throw new MatError('polynomialReduce: only a single scalar divisor is supported (divisor vectors are not implemented)');
    const varNames = a.length >= 3
      ? (isSym(a[2]) ? symVarsOf(a[2]) : [asString(a[2])])
      : [...new Set([...symVarsOf(p), ...symVarsOf(dv)])];
    if (varNames.length !== 1) throw new MatError('polynomialReduce: only univariate (single-variable) reduction is supported');
    const v = varNames[0];
    const cP = polyCoeffs(p.exprs[0], v).slice().reverse();   // high→low
    const cD = polyCoeffs(dv.exprs[0], v).slice().reverse();
    while (cD.length && Math.abs(cD[0]) < 1e-12) cD.shift();
    if (!cD.length) throw new MatError('polynomialReduce: divisor is zero');
    const q: number[] = []; const rem = cP.slice();
    while (rem.length >= cD.length) {
      const c = rem[0] / cD[0]; q.push(c);
      for (let i = 0; i < cD.length; i++) rem[i] -= c * cD[i];
      rem.shift();
    }
    while (rem.length && Math.abs(rem[0]) < 1e-12) rem.shift();
    // Rebuild syms from high→low coefficient arrays.
    const build = (coeffs: number[]): SymExpr => {
      const deg = coeffs.length - 1; const terms: SymExpr[] = [];
      coeffs.forEach((c, i) => { if (Math.abs(c) < 1e-12) return; const power = deg - i; const cn = Number(c.toPrecision(12)); terms.push(power === 0 ? sN(cn) : power === 1 ? sMul(sN(cn), sV(v)) : sMul(sN(cn), sPow(sV(v), sN(power)))); });
      return terms.length ? simplifyExpr(sAdd(...terms)) : sN(0);
    };
    const rSym = makeSym(1, 1, [build(rem.length ? rem : [0])]);
    const qSym = makeSym(1, 1, [build(q.length ? q : [0])]);
    return n >= 2 ? [rSym, qSym] : [rSym];
  },

  // Generalized hypergeometric function pFq([a...],[b...],z) via its defining
  // power series  Σ_{k≥0} (∏ rf(a_i,k) / ∏ rf(b_j,k)) · z^k/k!,  where the
  // rising factorial rf(x,k)=x(x+1)…(x+k-1) (Pochhammer symbol). The ratio of
  // consecutive terms is  t_{k+1}/t_k = z·∏(a_i+k)/(∏(b_j+k)·(k+1)),  so we
  // accumulate term-by-term and stop once the running term is negligible.
  // For a NUMERIC z (and numeric a,b parameters) the result is returned numeric.
  hypergeom: async (a) => {
    const toNumList = (v: Value): number[] => {
      if (isSym(v)) { const s = v as Sym; return s.exprs.map((e) => symEval(e, new Map())); }
      const M = m(v); return Array.from(M.data);
    };
    const A = toNumList(a[0]);
    const B = toNumList(a[1]);
    const zArg = a[2];

    // Evaluate the pFq series at a single numeric point z.
    const series = (z: number): number => {
      // A non-positive-integer numerator parameter terminates the series early.
      let termCount = Infinity;
      for (const ai of A) { if (Number.isInteger(ai) && ai <= 0) termCount = Math.min(termCount, -ai); }
      let term = 1;          // t_0 = 1
      let sum = 1;
      const maxK = Number.isFinite(termCount) ? termCount : 10000;
      for (let k = 0; k < maxK; k++) {
        let num = 1, den = 1;
        for (const ai of A) num *= (ai + k);
        for (const bj of B) den *= (bj + k);
        den *= (k + 1);
        if (den === 0) break;     // b_j hit a non-positive integer pole
        term *= (z * num) / den;
        if (!Number.isFinite(term)) break;
        sum += term;
        if (Math.abs(term) <= 1e-16 * Math.abs(sum) && k > Math.max(...A.map(Math.abs), ...B.map(Math.abs), 1)) break;
      }
      return sum;
    };

    // Numeric z (scalar or array) and numeric parameters → numeric result.
    const paramsNumeric = A.every(Number.isFinite) && B.every(Number.isFinite);
    if (paramsNumeric && (isMat(zArg) && !(zArg as Mat).isChar)) {
      const Z = zArg as Mat;
      const out = zeros(Z.rows, Z.cols);
      for (let i = 0; i < Z.data.length; i++) out.data[i] = series(Z.data[i]);
      return ret(out);
    }
    // Symbolic z but numeric parameters: if z evaluates to a constant, go numeric;
    // otherwise leave the call unevaluated (sandbox CAS has no closed forms here).
    if (paramsNumeric && isSym(zArg)) {
      const s = zArg as Sym;
      const out = zeros(s.rows, s.cols); let allNum = true;
      s.exprs.forEach((e, i) => { const zv = symEval(e, new Map()); if (symVars(e).length === 0 && Number.isFinite(zv)) out.data[i] = series(zv); else allNum = false; });
      if (allNum) return ret(out);
    }
    // Fallback: unevaluated symbolic hypergeom(a,b,z).
    const aSym = isSym(a[0]) ? (a[0] as Sym).exprs : A.map(sN);
    const bSym = isSym(a[1]) ? (a[1] as Sym).exprs : B.map(sN);
    const zSym = symToExpr(zArg);
    return ret(makeSym(1, 1, [sFn('hypergeom', sFn('list', ...aSym), sFn('list', ...bSym), zSym)]));
  },

  isVariable: async (a) => ret(bool(symArg(a[0]).exprs[0].t === 'v')),
  isCondition: async (a) => { const e = symArg(a[0]).exprs[0]; return ret(bool(e.t === 'fn' && ['lt', 'le', 'gt', 'ge', 'eq', 'ne'].includes(e.name))); },
  isDistinctVariable: async (a) => { const s = symArg(a[0]); const allV = s.exprs.every((e) => e.t === 'v'); const names = s.exprs.map((e) => (e as { name?: string }).name ?? ''); return ret(bool(allV && new Set(names).size === names.length)); },
  symFunType: async (a) => ret(str(symTypeName(symArg(a[0]).exprs[0]))),
  charToFunction: async (a) => { const name = asString(a[0]); return ret(makeSym(1, 1, [sV(name)])); },
};
