// Partial Differential Equation Toolbox — computable subset.
//
// Ported function-for-function from the MATLAB R2026a PDE Toolbox `.m` sources
// (obtained via `matlab -batch "type <fn>"`). This module covers the mesh/FEM
// helpers that are self-contained — i.e. that operate purely on the [P,E,T]
// mesh arrays and solution vectors, without needing a decomposed-geometry (g)
// object or the full FEM assembly stack (assema/assemb/pdeigeom). The 1-D
// solver `pdepe`/`pdeval` already live in base MATLAB (builtins.ts).
//
// Mesh-data conventions (see INITMESH):
//   p : 2×np   node coordinates [x; y]
//   e : 7×ne   edges (rows 1-2: start/end node, 3-4: params, 5: segment, 6-7: subdomains)
//   t : 4×nt   triangles (rows 1-3: 1-based corner indices CCW, row 4: subdomain)
// All MATLAB indices are 1-based; the wrappers translate to/from 0-based here.
import type { Builtin } from '../builtins';
import {
  type Value, type Mat, type StructV, isMat, isObject, isHandle, makeObject, scalar, str, rowVec, colVec, MatError,
  zeros, mat, toArray, asString, asScalar, toMat as m, sparseFromTriplets, matRows as rowsOf,
} from '../values';
import { mldivide } from '../linalg';
import type { ToolboxModule } from './types';
import { HELP_PDE } from '../help/help-pde';

// ── small Mat<->rows helpers (rowsOf = canonical matRows from values.ts) ─────
/** Build a Mat from an array of rows. */
function matFromRows(rws: number[][]): Mat {
  const R = rws.length, C = R ? rws[0].length : 0, data = new Float64Array(R * C);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) data[r + c * R] = rws[r][c];
  return mat(R, C, data);
}
const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

// ════════════════════════════════════════════════════════════════════════════
//  Triangle geometry primitives
// ════════════════════════════════════════════════════════════════════════════

export interface TrgGrad { ar: number[]; g1x: number[]; g1y: number[]; g2x: number[]; g2y: number[]; g3x: number[]; g3y: number[]; }
export interface TrgCot { ar: number[]; a1: number[]; a2: number[]; a3: number[]; }

/** pdetrg core — triangle areas plus either base-function gradients or half-neg-cotangents.
 *  p,t use MATLAB 1-based corner indices. */
function pdetrgCore(p: number[][], t: number[][]): TrgGrad & { cot: TrgCot } {
  const nt = t[0].length;
  const ar = new Array<number>(nt);
  const g1x = new Array<number>(nt), g1y = new Array<number>(nt);
  const g2x = new Array<number>(nt), g2y = new Array<number>(nt);
  const g3x = new Array<number>(nt), g3y = new Array<number>(nt);
  const a1 = new Array<number>(nt), a2 = new Array<number>(nt), a3 = new Array<number>(nt);
  for (let i = 0; i < nt; i++) {
    const i1 = t[0][i] - 1, i2 = t[1][i] - 1, i3 = t[2][i] - 1;
    const x1 = p[0][i1], y1 = p[1][i1], x2 = p[0][i2], y2 = p[1][i2], x3 = p[0][i3], y3 = p[1][i3];
    const r23x = x3 - x2, r23y = y3 - y2, r31x = x1 - x3, r31y = y1 - y3, r12x = x2 - x1, r12y = y2 - y1;
    const area = Math.abs(r31x * r23y - r31y * r23x) / 2;
    ar[i] = area;
    // gradient form
    g1x[i] = -0.5 * r23y / area; g1y[i] = 0.5 * r23x / area;
    g2x[i] = -0.5 * r31y / area; g2y[i] = 0.5 * r31x / area;
    g3x[i] = -0.5 * r12y / area; g3y[i] = 0.5 * r12x / area;
    // cotangent form (nargout==4)
    a1[i] = 0.25 * (r12x * r31x + r12y * r31y) / area;
    a2[i] = 0.25 * (r23x * r12x + r23y * r12y) / area;
    a3[i] = 0.25 * (r31x * r23x + r31y * r23y) / area;
  }
  return { ar, g1x, g1y, g2x, g2y, g3x, g3y, cot: { ar, a1, a2, a3 } };
}

/** pdetriq core — triangle shape-quality q = 4√3·area / (h1²+h2²+h3²) ∈ (0,1]. */
function pdetriqCore(p: number[][], t: number[][]): number[] {
  const { ar } = pdetrgCore(p, t);
  const nt = t[0].length, q = new Array<number>(nt);
  for (let i = 0; i < nt; i++) {
    const i1 = t[0][i] - 1, i2 = t[1][i] - 1, i3 = t[2][i] - 1;
    const x1 = p[0][i1], y1 = p[1][i1], x2 = p[0][i2], y2 = p[1][i2], x3 = p[0][i3], y3 = p[1][i3];
    const h3 = (x1 - x2) ** 2 + (y1 - y2) ** 2, h1 = (x2 - x3) ** 2 + (y2 - y3) ** 2, h2 = (x3 - x1) ** 2 + (y3 - y1) ** 2;
    q[i] = 4 * Math.sqrt(3) * ar[i] / (h1 + h2 + h3);
  }
  return q;
}

/** pdesdt core — 1-based indices of triangles whose subdomain (t row 4) is in sdl. */
function pdesdtCore(t: number[][], sdl?: number[]): number[] {
  const sd = t[3], set = sdl ? new Set(sdl) : null, out: number[] = [];
  for (let i = 0; i < sd.length; i++) if (!set || set.has(sd[i])) out.push(i + 1);
  return out;
}

/** Expand a PDE coefficient row (constant scalar, or per-triangle 1×nt) to length nt.
 *  Throws on the text-expression form, which would need a MATLAB expression evaluator. */
function coefRow(M: Mat, rowIdx: number, nrows: number, nt: number): number[] {
  if (M.isChar) throw new MatError('pde: text-expression coefficients are not supported in the sandbox — pass numeric (constant or 1×nt) coefficients');
  const cols = M.cols;
  if (cols === 1) return new Array<number>(nt).fill(M.data[rowIdx]);
  if (cols === nt) { const out = new Array<number>(nt); for (let j = 0; j < nt; j++) out[j] = M.data[rowIdx + j * nrows]; return out; }
  throw new MatError(`pde: coefficient must be a scalar or have ${nt} columns (one per triangle), got ${nrows}×${cols}`);
}

// ════════════════════════════════════════════════════════════════════════════
//  1-D discrete sine transform (DST-I) — backing poicalc
// ════════════════════════════════════════════════════════════════════════════

/** DST-I of a single column: b(k)=Σ_{j=1}^n a(j)·sin(πjk/(n+1)), k=1..n. */
function dstColumn(a: number[]): number[] {
  const n = a.length, b = new Array<number>(n);
  for (let k = 1; k <= n; k++) { let s = 0; for (let j = 1; j <= n; j++) s += a[j - 1] * Math.sin(Math.PI * j * k / (n + 1)); b[k - 1] = s; }
  return b;
}
/** IDST-I: inverse of dstColumn, idst = (2/(n+1))·dst. */
function idstColumn(a: number[]): number[] { const n = a.length, s = 2 / (n + 1); return dstColumn(a).map((v) => v * s); }

/** Thomas algorithm: solve a symmetric tridiagonal system (diag d, off-diag e) for rhs. */
function tridiagSolve(d: number[], e: number[], rhs: number[]): number[] {
  const n = d.length, cp = new Array<number>(n), dp = new Array<number>(n);
  cp[0] = e[0] / d[0]; dp[0] = rhs[0] / d[0];
  for (let i = 1; i < n; i++) { const mden = d[i] - e[i - 1] * cp[i - 1]; cp[i] = (i < n - 1 ? e[i] : 0) / mden; dp[i] = (rhs[i] - e[i - 1] * dp[i - 1]) / mden; }
  const x = new Array<number>(n); x[n - 1] = dp[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
  return x;
}

// ════════════════════════════════════════════════════════════════════════════
//  MATLAB-callable builtins
// ════════════════════════════════════════════════════════════════════════════

const builtins: Record<string, Builtin> = {
  /** [K,M,F]=assema(p,t,c,a,f) — assemble FEM stiffness K, mass M and load F for a scalar
   *  2-D PDE -div(c·grad u)+a·u=f. c may have 1-4 rows (isotropic, diagonal, symmetric, or
   *  full 2×2 tensor); a and f are scalar. Coefficients are numeric (constant or 1×nt). */
  assema: async (a) => {
    const p = rowsOf(m(a[0])), t = rowsOf(m(a[1])); const cM = m(a[2]), aM = m(a[3]), fM = m(a[4]);
    const np = p[0].length, nt = t[0].length;
    const g = pdetrgCore(p, t);
    const it1 = t[0], it2 = t[1], it3 = t[2];
    // ── stiffness K (pdeasmc) ──
    const nrc = cM.rows; const cc = Array.from({ length: nrc }, (_, k) => coefRow(cM, k, nrc, nt));
    const ki: number[] = [], kj: number[] = [], kv: number[] = [];
    const kadd = (i: number[], j: number[], v: number[]) => { for (let e = 0; e < nt; e++) { ki.push(i[e]); kj.push(j[e]); kv.push(v[e]); } };
    const dot = (ax: number[], ay: number[], bx: number[], by: number[], e: number) => ax[e] * bx[e] + ay[e] * by[e];
    if (nrc >= 1 && nrc <= 3) {
      const c1 = new Array<number>(nt), c2 = new Array<number>(nt), c3 = new Array<number>(nt);
      for (let e = 0; e < nt; e++) {
        const ar = g.ar[e];
        if (nrc === 1) { const c = cc[0][e]; c3[e] = c * dot(g.g1x, g.g1y, g.g2x, g.g2y, e) * ar; c1[e] = c * dot(g.g2x, g.g2y, g.g3x, g.g3y, e) * ar; c2[e] = c * dot(g.g3x, g.g3y, g.g1x, g.g1y, e) * ar; }
        else if (nrc === 2) { const a1 = cc[0][e], a2 = cc[1][e]; c3[e] = (a1 * g.g1x[e] * g.g2x[e] + a2 * g.g1y[e] * g.g2y[e]) * ar; c1[e] = (a1 * g.g2x[e] * g.g3x[e] + a2 * g.g2y[e] * g.g3y[e]) * ar; c2[e] = (a1 * g.g3x[e] * g.g1x[e] + a2 * g.g3y[e] * g.g1y[e]) * ar; }
        else { const a1 = cc[0][e], a2 = cc[1][e], a3 = cc[2][e]; c3[e] = (a1 * g.g1x[e] * g.g2x[e] + a2 * (g.g1x[e] * g.g2y[e] + g.g1y[e] * g.g2x[e]) + a3 * g.g1y[e] * g.g2y[e]) * ar; c1[e] = (a1 * g.g2x[e] * g.g3x[e] + a2 * (g.g2x[e] * g.g3y[e] + g.g2y[e] * g.g3x[e]) + a3 * g.g2y[e] * g.g3y[e]) * ar; c2[e] = (a1 * g.g3x[e] * g.g1x[e] + a2 * (g.g3x[e] * g.g1y[e] + g.g3y[e] * g.g1x[e]) + a3 * g.g3y[e] * g.g1y[e]) * ar; }
      }
      kadd(it1, it2, c3); kadd(it2, it1, c3);    // K + K.' (symmetric)
      kadd(it2, it3, c1); kadd(it3, it2, c1);
      kadd(it3, it1, c2); kadd(it1, it3, c2);
      kadd(it1, it1, c2.map((v, e) => -v - c3[e])); kadd(it2, it2, c3.map((v, e) => -v - c1[e])); kadd(it3, it3, c1.map((v, e) => -v - c2[e]));
    } else if (nrc === 4) {
      const c12 = new Array<number>(nt), c23 = new Array<number>(nt), c31 = new Array<number>(nt), c21 = new Array<number>(nt), c32 = new Array<number>(nt), c13 = new Array<number>(nt);
      const ten = (gax: number, gay: number, gbx: number, gby: number, e: number) => cc[0][e] * gax * gbx + cc[1][e] * gay * gbx + cc[2][e] * gax * gby + cc[3][e] * gay * gby;
      for (let e = 0; e < nt; e++) {
        const ar = g.ar[e];
        c12[e] = ten(g.g1x[e], g.g1y[e], g.g2x[e], g.g2y[e], e) * ar; c23[e] = ten(g.g2x[e], g.g2y[e], g.g3x[e], g.g3y[e], e) * ar; c31[e] = ten(g.g3x[e], g.g3y[e], g.g1x[e], g.g1y[e], e) * ar;
        c21[e] = ten(g.g2x[e], g.g2y[e], g.g1x[e], g.g1y[e], e) * ar; c32[e] = ten(g.g3x[e], g.g3y[e], g.g2x[e], g.g2y[e], e) * ar; c13[e] = ten(g.g1x[e], g.g1y[e], g.g3x[e], g.g3y[e], e) * ar;
      }
      kadd(it1, it2, c12); kadd(it2, it3, c23); kadd(it3, it1, c31); kadd(it2, it1, c21); kadd(it3, it2, c32); kadd(it1, it3, c13);
      kadd(it1, it1, c12.map((v, e) => -v - c13[e])); kadd(it2, it2, c23.map((v, e) => -v - c21[e])); kadd(it3, it3, c31.map((v, e) => -v - c32[e]));
    } else throw new MatError(`pde: assema expects c with 1-4 rows for a scalar PDE, got ${nrc}`);
    const K = sparseFromTriplets(np, np, ki, kj, kv);
    // ── mass M (pdeasma): aod=a·ar/12, ad=2·aod ──
    const av = coefRow(aM, 0, aM.rows, nt);
    const mi: number[] = [], mj: number[] = [], mv: number[] = [];
    for (let e = 0; e < nt; e++) {
      const aod = av[e] * g.ar[e] / 12, ad = 2 * aod;
      mi.push(it1[e], it2[e], it2[e], it3[e], it3[e], it1[e], it1[e], it2[e], it3[e]);
      mj.push(it2[e], it1[e], it3[e], it2[e], it1[e], it3[e], it1[e], it2[e], it3[e]);
      mv.push(aod, aod, aod, aod, aod, aod, ad, ad, ad);
    }
    const Mmat = sparseFromTriplets(np, np, mi, mj, mv);
    // ── load F (pdeasmf): f·ar/3 lumped to the 3 corners ──
    const fv = coefRow(fM, 0, fM.rows, nt); const F = zeros(np, 1);
    for (let e = 0; e < nt; e++) { const fe = fv[e] * g.ar[e] / 3; F.data[it1[e] - 1] += fe; F.data[it2[e] - 1] += fe; F.data[it3[e] - 1] += fe; }
    return [K, Mmat, F];
  },

  /** [ar,g1x,g1y,g2x,g2y,g3x,g3y]=pdetrg(p,t) | [ar,a1,a2,a3]=pdetrg(p,t) (nargout==4). */
  pdetrg: async (a, nargout) => {
    const p = rowsOf(m(a[0])), t = rowsOf(m(a[1])); const g = pdetrgCore(p, t);
    if (nargout === 4) return [rowVec(g.cot.ar), rowVec(g.cot.a1), rowVec(g.cot.a2), rowVec(g.cot.a3)];
    return [rowVec(g.ar), rowVec(g.g1x), rowVec(g.g1y), rowVec(g.g2x), rowVec(g.g2y), rowVec(g.g3x), rowVec(g.g3y)];
  },

  /** q=pdetriq(p,t) — triangle quality measure (row vector). */
  pdetriq: async (a) => ret(rowVec(pdetriqCore(rowsOf(m(a[0])), rowsOf(m(a[1]))))),

  /** ut=pdeintrp(p,t,un) — node data → triangle-midpoint data (averages the 3 corners). */
  pdeintrp: async (a) => {
    const p = m(a[0]), t = rowsOf(m(a[1])); const np = p.cols, nt = t[0].length;
    let un = m(a[2]); let N = un.cols;
    // accept an ordinary solution vector (np*N × 1) as well as np × N
    if (un.cols === 1 && un.rows !== np) { N = un.rows / np; un = mat(np, N, un.data); }
    const out = zeros(N, nt);
    for (let j = 0; j < nt; j++) {
      const c0 = t[0][j] - 1, c1 = t[1][j] - 1, c2 = t[2][j] - 1;
      for (let k = 0; k < N; k++) out.data[k + j * N] = (un.data[c0 + k * np] + un.data[c1 + k * np] + un.data[c2 + k * np]) / 3;
    }
    return ret(out);
  },

  /** un=pdeprtni(p,t,ut) — triangle-midpoint data → node data (area-count weighted average). */
  pdeprtni: async (a) => {
    const p = m(a[0]), t = rowsOf(m(a[1])), ut = m(a[2]); const np = p.cols, nt = t[0].length, N = ut.rows;
    const acc = new Float64Array(np * N), cnt = new Float64Array(np);
    for (let j = 0; j < nt; j++) for (let cc = 0; cc < 3; cc++) {
      const node = t[cc][j] - 1; cnt[node] += 1;
      for (let k = 0; k < N; k++) acc[node + k * np] += ut.data[k + j * N];
    }
    const out = zeros(np, N);
    for (let node = 0; node < np; node++) { const w = cnt[node] || 1; for (let k = 0; k < N; k++) out.data[node + k * np] = acc[node + k * np] / w; }
    return ret(out);
  },

  /** [ux,uy]=pdegrad(p,t,u[,sdl]) — grad(u) at each triangle centroid (N×nt each). */
  pdegrad: async (a, nargout) => {
    const p = rowsOf(m(a[0])); let t = rowsOf(m(a[1])); const u = m(a[2]);
    if (a.length >= 4) { const sdl = toArray(m(a[3])); const keep = pdesdtCore(t, sdl).map((i) => i - 1); t = t.map((row) => keep.map((i) => row[i])); }
    const np = p[0].length, nt = t[0].length, N = u.rows * u.cols / np;
    const g = pdetrgCore(p, t);
    const ux = zeros(N, nt), uy = zeros(N, nt);
    for (let j = 0; j < nt; j++) {
      const c0 = t[0][j] - 1, c1 = t[1][j] - 1, c2 = t[2][j] - 1;
      for (let k = 0; k < N; k++) {
        const u1 = u.data[c0 + k * np], u2 = u.data[c1 + k * np], u3 = u.data[c2 + k * np];
        ux.data[k + j * N] = u1 * g.g1x[j] + u2 * g.g2x[j] + u3 * g.g3x[j];
        uy.data[k + j * N] = u1 * g.g1y[j] + u2 * g.g2y[j] + u3 * g.g3y[j];
      }
    }
    return nargout >= 2 ? [ux, uy] : [ux];
  },

  /** it=pdesdt(t[,sdl]) — 1-based indices of triangles inside the listed subdomains. */
  pdesdt: async (a) => ret(rowVec(pdesdtCore(rowsOf(m(a[0])), a.length >= 2 ? toArray(m(a[1])) : undefined))),

  /** ie=pdesde(e[,sdl]) — exterior boundary edges adjacent to a set of subdomains. */
  pdesde: async (a) => {
    const e = rowsOf(m(a[0])); const ne = e[0].length;
    const s6 = e[5], s7 = e[6]; let nsd = 0; for (let i = 0; i < ne; i++) nsd = Math.max(nsd, s6[i], s7[i]);
    const set = a.length >= 2 ? new Set(toArray(m(a[1]))) : null;
    // bsd: 1 if subdomain selected, else 2 (all selected → 1); index 0 = exterior → 0
    const bsd = (sd: number) => (sd === 0 ? 0 : set ? (set.has(sd) ? 1 : 2) : 1);
    const out: number[] = [];
    for (let i = 0; i < ne; i++) if (bsd(s6[i]) + bsd(s7[i]) === 1) out.push(i + 1);
    return ret(rowVec(out));
  },

  /** pp=pdearcl(p,xy,s,s0,s1) — map arc-length values s∈[s0,s1] back to curve parameters. */
  pdearcl: async (a) => {
    const par = toArray(m(a[0])), xy = rowsOf(m(a[1])), s = toArray(m(a[2])), s0 = asScalar(a[3]), s1 = asScalar(a[4]);
    const np = par.length, al = new Array<number>(np); al[0] = 0;
    for (let i = 1; i < np; i++) al[i] = al[i - 1] + Math.hypot(xy[0][i] - xy[0][i - 1], xy[1][i] - xy[1][i - 1]);
    const tl = al[np - 1];
    // linear interpolation of par over al, with linear extrapolation outside
    const interp = (sv: number) => {
      let i = 0; while (i < np - 2 && al[i + 1] < sv) i++;
      const denom = al[i + 1] - al[i] || 1; const f = (sv - al[i]) / denom; return par[i] + f * (par[i + 1] - par[i]);
    };
    const isRow = m(a[2]).rows === 1;
    const pp = s.map((sv) => interp(tl * (sv - s0) / (s1 - s0)));
    return ret(isRow ? rowVec(pp) : colVec(pp));
  },

  /** [uxy,tn,a2,a3]=tri2grid(p,t,u,x,y) — interpolate FEM solution onto a rectangular grid. */
  tri2grid: async (a, nargout) => {
    const p = rowsOf(m(a[0])), t = rowsOf(m(a[1])), u = toArray(m(a[2])), x = toArray(m(a[3])), y = toArray(m(a[4]));
    const nt = t[0].length, nx = x.length, ny = y.length, small = 10000 * Number.EPSILON;
    const tn = new Array<number>(ny * nx).fill(NaN), al2 = new Array<number>(ny * nx).fill(NaN), al3 = new Array<number>(ny * nx).fill(NaN);
    const idx = (k: number, j: number) => k + j * ny;       // ny×nx, column-major
    for (let i = 0; i < nt; i++) {
      const c0 = t[0][i] - 1, c1 = t[1][i] - 1, c2 = t[2][i] - 1;
      const p0x = p[0][c0], p0y = p[1][c0];
      const a2x = p[0][c1] - p0x, a2y = p[1][c1] - p0y, a3x = p[0][c2] - p0x, a3y = p[1][c2] - p0y;
      // barycentric basis: b2·a2=1, b2·a3=0 etc.
      let b2x = a3y, b2y = -a3x; const d2 = b2x * a2x + b2y * a2y; b2x /= d2; b2y /= d2;
      let b3x = a2y, b3y = -a2x; const d3 = b3x * a3x + b3y * a3y; b3x /= d3; b3y /= d3;
      // bounding box in grid index space
      const xmin = Math.min(p0x, p[0][c1], p[0][c2]), xmax = Math.max(p0x, p[0][c1], p[0][c2]);
      const ymin = Math.min(p0y, p[1][c1], p[1][c2]), ymax = Math.max(p0y, p[1][c1], p[1][c2]);
      for (let j = 0; j < nx; j++) {
        if (x[j] < xmin - small || x[j] > xmax + small) continue;
        for (let k = 0; k < ny; k++) {
          if (y[k] < ymin - small || y[k] > ymax + small) continue;
          if (!Number.isNaN(tn[idx(k, j)])) continue;
          const r1x = x[j] - p0x, r1y = y[k] - p0y;
          const dd2 = b2x * r1x + b2y * r1y;
          if (dd2 < -small || dd2 > 1 + small) continue;
          const dd3 = b3x * r1x + b3y * r1y;
          if (dd3 < -small || dd2 + dd3 > 1 + small) continue;
          tn[idx(k, j)] = i + 1; al2[idx(k, j)] = dd2; al3[idx(k, j)] = dd3;
        }
      }
    }
    const uxy = new Array<number>(ny * nx).fill(NaN);
    for (let g = 0; g < ny * nx; g++) if (!Number.isNaN(tn[g])) { const tri = tn[g] - 1; uxy[g] = (1 - al2[g] - al3[g]) * u[t[0][tri] - 1] + al2[g] * u[t[1][tri] - 1] + al3[g] * u[t[2][tri] - 1]; }
    const toGrid = (arr: number[]) => { const M = zeros(ny, nx); M.data.set(arr); return M; };
    const outs: Value[] = [toGrid(uxy)];
    if (nargout >= 2) outs.push(toGrid(tn));
    if (nargout >= 3) outs.push(toGrid(al2));
    if (nargout >= 4) outs.push(toGrid(al3));
    return outs;
  },

  /** p1=jigglemesh(p,e,t[,'Opt',v,'Iter',v]) — relax interior nodes toward neighbour centroids. */
  jigglemesh: async (a) => {
    const P = m(a[0]); const p = rowsOf(P).map((r) => r.slice()); const e = rowsOf(m(a[1])), t = rowsOf(m(a[2]));
    let opt = 'off', iterArg: number | undefined;
    for (let i = 3; i + 1 < a.length; i += 2) { const key = asString(a[i]).toLowerCase(); if (key === 'opt') opt = asString(a[i + 1]).toLowerCase(); else if (key === 'iter') iterArg = Math.round(asScalar(a[i + 1])); }
    const iter = iterArg ?? (opt === 'off' ? 1 : 20);
    const np = p[0].length;
    // boundary nodes = endpoints of all edges
    const isBnd = new Uint8Array(np); for (let c = 0; c < e[0].length; c++) { isBnd[e[0][c] - 1] = 1; isBnd[e[1][c] - 1] = 1; }
    const qmeasure = () => { const q = pdetriqCore(p, t); return opt === 'minimum' ? Math.min(...q) : q.reduce((s, v) => s + v, 0) / q.length; };
    let q = opt !== 'off' ? qmeasure() : 0;
    for (let k = 0; k < iter; k++) {
      const sumx = new Float64Array(np), sumy = new Float64Array(np), cnt = new Float64Array(np);
      // accumulate neighbour coords over the directed edges (i->j) of each triangle's 1-2-3-1 cycle
      for (let j = 0; j < t[0].length; j++) { const v = [t[0][j] - 1, t[1][j] - 1, t[2][j] - 1]; for (let s = 0; s < 3; s++) { const from = v[s], to = v[(s + 1) % 3]; sumx[from] += p[0][to]; sumy[from] += p[1][to]; cnt[from] += 1; } }
      const prev = [p[0].slice(), p[1].slice()];
      for (let i = 0; i < np; i++) if (!isBnd[i] && cnt[i] > 0) { p[0][i] = sumx[i] / cnt[i]; p[1][i] = sumy[i] / cnt[i]; }
      if (opt !== 'off') { const q1 = q; q = qmeasure(); if (q < q1) { p[0] = prev[0]; p[1] = prev[1]; break; } if (q < q1 + 1e-4) break; }
    }
    return ret(matFromRows(p));
  },

  /** K=poiasma(n1,n2[,h1,h2]) — boundary stiffness contributions for the Poisson 5-point grid. */
  poiasma: async (a) => {
    const n1 = Math.round(asScalar(a[0])); const n2 = a.length >= 2 && isMat(a[1]) ? Math.round(asScalar(a[1])) : n1;
    const h1 = a.length >= 3 ? asScalar(a[2]) : 1, h2 = a.length >= 4 ? asScalar(a[3]) : 1;
    const alpha = h2 / h1, beta = h1 / h2, n = n1 * n2;
    const ii: number[] = [], jj: number[] = [], vv: number[] = [];
    const add = (i: number, j: number, v: number) => { ii.push(i); jj.push(j); vv.push(v); };           // 1-based
    // ── lower-triangle couplings (mirrored below via add(j,i,..)) ──
    for (let r = 2; r <= n1; r++) { add(r, r - 1, -0.5 * alpha); add(r - 1, r, -0.5 * alpha); }
    for (let r = n - n1 + 2; r <= n; r++) { add(r, r - 1, -0.5 * alpha); add(r - 1, r, -0.5 * alpha); }
    for (let r = n1 + 1; r <= n - n1 + 1; r += n1) { add(r, r - n1, -0.5 * beta); add(r - n1, r, -0.5 * beta); }
    for (let r = 2 * n1; r <= n; r += n1) { add(r, r - n1, -0.5 * beta); add(r - n1, r, -0.5 * beta); }
    for (let r = n1 + 2; r <= 2 * n1 - 1; r++) { add(r, r - n1, -beta); add(r - n1, r, -beta); }
    for (let r = n - n1 + 2; r <= n - 1; r++) { add(r, r - n1, -beta); add(r - n1, r, -beta); }
    for (let r = n1 + 2; r <= n - 2 * n1 + 2; r += n1) { add(r, r - 1, -alpha); add(r - 1, r, -alpha); }
    for (let r = 2 * n1 - 1; r <= n - n1 - 1; r += n1) { add(r, r + 1, -alpha); add(r + 1, r, -alpha); }
    // ── diagonal (edge points = α+β; the 4 corners = ½(α+β)) ──
    for (let r = 2; r <= n1 - 1; r++) add(r, r, alpha + beta);
    for (let r = n - n1 + 2; r <= n - 1; r++) add(r, r, alpha + beta);
    for (let r = n1 + 1; r <= n - 2 * n1 + 1; r += n1) add(r, r, alpha + beta);
    for (let r = 2 * n1; r <= n - n1; r += n1) add(r, r, alpha + beta);
    add(1, 1, 0.5 * (alpha + beta)); add(n1, n1, 0.5 * (alpha + beta));
    add(n - n1 + 1, n - n1 + 1, 0.5 * (alpha + beta)); add(n, n, 0.5 * (alpha + beta));
    return ret(sparseFromTriplets(n, n, ii, jj, vv));
  },

  /** x=poicalc(f,h1,h2,n1,n2) — fast Poisson interior solve (DST in x, tridiagonal in y). */
  poicalc: async (a) => {
    const F = m(a[0]); const nf = F.rows, mcol = F.cols;
    const h1 = a.length >= 2 ? asScalar(a[1]) : 1, h2 = a.length >= 3 ? asScalar(a[2]) : 1;
    const n1 = a.length >= 4 ? Math.round(asScalar(a[3])) : Math.trunc(Math.sqrt(nf));
    const n2 = a.length >= 5 ? Math.round(asScalar(a[4])) : n1;
    const alpha = h2 / h1, beta = h1 / h2;
    const fAt = (row: number, col: number) => F.data[row + col * nf];          // row,col 0-based
    // forward DST in the first (n1) direction, per (rhs-column, n2-block)
    const c: number[][] = Array.from({ length: n1 }, () => new Array<number>(mcol * n2));
    for (let blk = 0; blk < n2; blk++) for (let col = 0; col < mcol; col++) {
      const colvec = new Array<number>(n1); for (let r = 0; r < n1; r++) colvec[r] = fAt(blk * n1 + r, col);
      const tc = idstColumn(colvec); for (let r = 0; r < n1; r++) c[r][blk * mcol + col] = tc[r];
    }
    // tridiagonal solve in the second (n2) direction for each transformed frequency i
    const l = new Array<number>(n1); for (let i = 1; i <= n1; i++) l[i - 1] = 2 * (alpha + beta) - 2 * alpha * Math.cos(Math.PI * i / (n1 + 1));
    const offdiag = new Array<number>(Math.max(n2 - 1, 0)).fill(-beta);
    const v: number[][] = Array.from({ length: n1 }, () => new Array<number>(mcol * n2));
    for (let i = 0; i < n1; i++) {
      const diag = new Array<number>(n2).fill(l[i]);
      for (let col = 0; col < mcol; col++) {
        const rhs = new Array<number>(n2); for (let blk = 0; blk < n2; blk++) rhs[blk] = c[i][blk * mcol + col];
        const sol = tridiagSolve(diag, offdiag, rhs);
        for (let blk = 0; blk < n2; blk++) v[i][blk * mcol + col] = sol[blk];
      }
    }
    // inverse DST back in the first direction
    const out = zeros(nf, mcol);
    for (let blk = 0; blk < n2; blk++) for (let col = 0; col < mcol; col++) {
      const colvec = new Array<number>(n1); for (let i = 0; i < n1; i++) colvec[i] = v[i][blk * mcol + col];
      const xc = dstColumn(colvec); for (let r = 0; r < n1; r++) out.data[(blk * n1 + r) + col * nf] = xc[r];
    }
    return ret(out);
  },

  /** Y=dst(X[,n]) — discrete sine transform (DST-I), column-wise. */
  dst: async (a) => dstBuiltin(a, false),
  /** X=idst(Y[,n]) — inverse discrete sine transform, column-wise. */
  idst: async (a) => dstBuiltin(a, true),
};

/** Shared dst/idst dispatch: column-wise DST-I (optionally length-n padded/truncated).
 *  A row vector is transformed as a row (MATLAB transposes it in and back out). */
function dstBuiltin(a: Value[], inverse: boolean): Promise<Value[]> {
  const A = m(a[0]); const isVec = A.rows === 1 || A.cols === 1; const isRowVec = A.rows === 1 && A.cols > 1;
  const srcCols = isRowVec ? [toArray(A)] : matColumns(A);
  const n = a.length >= 2 && isMat(a[1]) ? Math.round(asScalar(a[1])) : (isRowVec ? A.cols : A.rows);
  const xf = (cv: number[]) => { const v = cv.slice(0, n); while (v.length < n) v.push(0); return inverse ? idstColumn(v) : dstColumn(v); };
  const outCols = srcCols.map(xf);
  if (isRowVec) return ret(rowVec(outCols[0]));
  if (isVec) return ret(colVec(outCols[0]));
  const M = zeros(n, outCols.length); for (let c = 0; c < outCols.length; c++) for (let r = 0; r < n; r++) M.data[r + c * n] = outCols[c][r];
  return ret(M);
}
function matColumns(M: Mat): number[][] { const out: number[][] = []; for (let c = 0; c < M.cols; c++) { const col = new Array<number>(M.rows); for (let r = 0; r < M.rows; r++) col[r] = M.data[r + c * M.rows]; out.push(col); } return out; }

// ════════════════════════════════════════════════════════════════════════════
//  High-level PDEModel workflow (createpde → solvepde) — v1: stationary scalar
//  Poisson  −∇·(c∇u) + a·u = f  on the unit disk / unit square, Dirichlet BC.
//  PDEModel is a ClassV (by-reference), so the helper functions mutate it in place,
//  matching MATLAB's handle-object semantics.
// ════════════════════════════════════════════════════════════════════════════

interface Mesh2D { px: number[]; py: number[]; tri: number[][]; bnd: number[] }   // tri rows are 0-based [i1,i2,i3]

/** Structured polar mesh of the unit disk: centre + concentric rings (m points each). */
function diskMesh(hmax: number): Mesh2D {
  const nr = Math.max(2, Math.round(1 / Math.max(hmax, 1e-3)));
  const mm = Math.max(8, Math.round((2 * Math.PI) / Math.max(hmax, 1e-3)));
  const px: number[] = [0], py: number[] = [0];
  for (let k = 1; k <= nr; k++) { const r = k / nr; for (let j = 0; j < mm; j++) { const th = (2 * Math.PI * j) / mm; px.push(r * Math.cos(th)); py.push(r * Math.sin(th)); } }
  const idx = (k: number, j: number) => (k === 0 ? 0 : 1 + (k - 1) * mm + ((j % mm) + mm) % mm);
  const tri: number[][] = [];
  for (let j = 0; j < mm; j++) tri.push([0, idx(1, j), idx(1, j + 1)]);                         // centre fan
  for (let k = 2; k <= nr; k++) for (let j = 0; j < mm; j++) {                                   // annular quads → 2 triangles
    const a = idx(k - 1, j), b = idx(k - 1, j + 1), c = idx(k, j + 1), d = idx(k, j);
    tri.push([a, b, c]); tri.push([a, c, d]);
  }
  const bnd: number[] = []; for (let j = 0; j < mm; j++) bnd.push(idx(nr, j));
  return { px, py, tri, bnd };
}

/** Structured grid mesh of the unit square [0,1]², each cell split into two triangles. */
function rectMesh(hmax: number): Mesh2D {
  const n = Math.max(2, Math.round(1 / Math.max(hmax, 1e-3)));
  const px: number[] = [], py: number[] = [];
  const node = (i: number, j: number) => j * (n + 1) + i;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { px.push(i / n); py.push(j / n); }
  const tri: number[][] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = node(i, j), b = node(i + 1, j), c = node(i + 1, j + 1), d = node(i, j + 1); tri.push([a, b, c]); tri.push([a, c, d]); }
  const bnd: number[] = []; for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) if (i === 0 || i === n || j === 0 || j === n) bnd.push(node(i, j));
  return { px, py, tri, bnd };
}

/** P1 finite-element solve of −∇·(c∇u) + a·u = f with u = g on the boundary nodes. */
function femPoisson(msh: Mesh2D, c: number, a: number, f: number, g: number): number[] {
  const np = msh.px.length;
  const A = zeros(np, np); const F = new Float64Array(np);
  for (const [i1, i2, i3] of msh.tri) {
    const x1 = msh.px[i1], y1 = msh.py[i1], x2 = msh.px[i2], y2 = msh.py[i2], x3 = msh.px[i3], y3 = msh.py[i3];
    const det = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1); const area = Math.abs(det) / 2;
    if (area === 0) continue;
    const b = [y2 - y3, y3 - y1, y1 - y2], cc = [x3 - x2, x1 - x3, x2 - x1];   // 2A·∇φ components
    const nodes = [i1, i2, i3];
    for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) {
      const ke = c * (b[p] * b[q] + cc[p] * cc[q]) / (4 * area);   // stiffness
      const me = a * area * (p === q ? 2 : 1) / 12;                // consistent mass
      A.data[nodes[p] + nodes[q] * np] += ke + me;
    }
    for (let p = 0; p < 3; p++) F[nodes[p]] += (f * area) / 3;     // consistent load (constant f)
  }
  // Dirichlet: u = g on boundary nodes — move known terms to RHS, then zero rows+cols and pin the diagonal.
  const isB = new Array<boolean>(np).fill(false); for (const nb of msh.bnd) isB[nb] = true;
  for (let i = 0; i < np; i++) if (!isB[i]) for (const nb of msh.bnd) F[i] -= A.data[i + nb * np] * g;
  for (const nb of msh.bnd) { for (let j = 0; j < np; j++) { A.data[nb + j * np] = 0; A.data[j + nb * np] = 0; } A.data[nb + nb * np] = 1; F[nb] = g; }
  const u = mldivide(A, mat(np, 1, F));
  return Array.from(u.data);
}

// ── model helpers ──
function structOf(fields: Record<string, Value>): StructV { return { kind: 'struct', rows: 1, cols: 1, fields: new Map(Object.entries(fields).map(([k, v]) => [k, [v]])) }; }
function getMesh(model: Value): Mesh2D { if (!isObject(model)) throw new MatError('expected a PDEModel'); const mh = model.props.get('Mesh'); if (!mh || !isObject(mh)) throw new MatError('generateMesh has not been called on this model.'); return (mh.props.get('__mesh') as unknown as { value: Mesh2D }).value; }
/** Wrap a Mesh2D so it survives in props as an opaque object. */
function meshObject(msh: Mesh2D): Value {
  const P = mat(2, msh.px.length, Float64Array.from([...msh.px, ...msh.py]));
  const T = zeros(4, msh.tri.length); msh.tri.forEach((tr, e) => { T.data[0 + e * 4] = tr[0] + 1; T.data[1 + e * 4] = tr[1] + 1; T.data[2 + e * 4] = tr[2] + 1; });
  const o = makeObject('pde.FEMesh', { Nodes: P, Elements: T, NumNodes: scalar(msh.px.length) });
  (o.props as Map<string, unknown>).set('__mesh', { value: msh } as unknown as Value);   // keep the raw mesh for solve/plot
  return o;
}
/** Parse name/value option pairs from `start`, skipping positional/non-string args robustly. */
function nvOpts(args: Value[], start: number): Map<string, Value> {
  const o = new Map<string, Value>();
  for (let i = start; i < args.length; i++) { const k = args[i]; if ((isMat(k) && (k as Mat).isChar) || k.kind === 'str') { if (i + 1 < args.length) { o.set(asString(k).toLowerCase(), args[i + 1]); i++; } } }
  return o;
}

const pdeWorkflow: Record<string, Builtin> = {
  // model = createpde() / createpde("thermal") — v1 ignores the analysis type (scalar Poisson).
  createpde: async () => [makeObject('pde.PDEModel', { Geometry: structOf({ NumEdges: scalar(0) }), c: scalar(1), a: scalar(0), f: scalar(0), bcVal: scalar(0) })],

  // Geometry functions: return a small descriptor; v1 supports the unit disk and unit square.
  circleg: async () => [makeObject('pde.geom', { kind: str('disk'), NumEdges: scalar(4) })],
  squareg: async () => [makeObject('pde.geom', { kind: str('rect'), NumEdges: scalar(4) })],

  geometryFromEdges: async (a, _n, env) => {
    const model = a[0];
    // accept @circleg / @squareg (by handle name) or a descriptor object
    let kind = 'disk';
    if (isHandle(a[1])) { const nm = (a[1].name ?? '').toLowerCase(); kind = nm.includes('square') || nm.includes('rect') ? 'rect' : 'disk'; const d = await env.callHandle(a[1], [], 1); if (isObject(d[0]) && d[0].props.get('kind')) kind = asString(d[0].props.get('kind')!); }
    else if (isObject(a[1]) && a[1].props.get('kind')) kind = asString(a[1].props.get('kind')!);
    if (isObject(model)) { model.props.set('GeometryKind', str(kind)); model.props.set('Geometry', structOf({ NumEdges: scalar(4) })); }
    return [model];
  },

  generateMesh: async (a) => {
    const model = a[0]; const opts = nvOpts(a, 1);
    const hmax = opts.has('hmax') ? asScalar(opts.get('hmax')!) : 0.1;
    const kind = isObject(model) ? asString(model.props.get('GeometryKind') ?? str('disk')) : 'disk';
    const msh = kind === 'rect' ? rectMesh(hmax) : diskMesh(hmax);
    if (isObject(model)) model.props.set('Mesh', meshObject(msh));
    return [model];
  },

  specifyCoefficients: async (a) => {
    const model = a[0]; const o = nvOpts(a, 1);
    if (isObject(model)) { if (o.has('c')) model.props.set('c', o.get('c')!); if (o.has('a')) model.props.set('a', o.get('a')!); if (o.has('f')) model.props.set('f', o.get('f')!); }
    return [model];
  },

  // applyBoundaryCondition(model,"dirichlet","Edge",edges,"u",val) — v1 applies a uniform Dirichlet value on the whole boundary.
  applyBoundaryCondition: async (a) => {
    const model = a[0]; const o = nvOpts(a, 1);
    if (isObject(model) && o.has('u')) model.props.set('bcVal', o.get('u')!);
    return [model];
  },

  solvepde: async (a) => {
    const model = a[0]; const msh = getMesh(model);
    const c = isObject(model) ? asScalar(model.props.get('c') ?? scalar(1)) : 1;
    const aC = isObject(model) ? asScalar(model.props.get('a') ?? scalar(0)) : 0;
    const f = isObject(model) ? asScalar(model.props.get('f') ?? scalar(0)) : 0;
    const g = isObject(model) ? asScalar(model.props.get('bcVal') ?? scalar(0)) : 0;
    const u = femPoisson(msh, c, aC, f, g);
    return [makeObject('pde.StationaryResults', { NodalSolution: colVec(u), Mesh: (model as { props: Map<string, Value> }).props.get('Mesh')! })];
  },

  // pdeplot(model,"XYData",u) — filled colour patches over the triangulation.
  pdeplot: async (a, _n, env) => {
    const model = a[0]; const o = nvOpts(a, 1);
    const msh = getMesh(model);
    const u = o.has('xydata') ? toArray(m(o.get('xydata')!)) : new Array(msh.px.length).fill(0);
    env.graphics.pdeColorMesh(msh.tri, msh.px, msh.py, u);
    return [];
  },
};
Object.assign(builtins, pdeWorkflow);

export const Pde: ToolboxModule = {
  id: 'pde',
  name: 'Partial Differential Equation Toolbox',
  docBase: 'https://www.mathworks.com/help/pde/ref/',
  builtins,
  help: HELP_PDE,
};
