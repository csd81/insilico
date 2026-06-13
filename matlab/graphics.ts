/**
 * Collects `plot`/`fplot`/`hold`/`gca`/axis-property calls into a serialisable
 * figure spec that the React Plotly pane renders.
 */
import { type Value, type Mat, isMat, isHandle, toArray, asString, asScalar, numel, MatError, str } from './values';

export interface Series {
  x: number[];
  y: number[];
  mode: 'lines' | 'markers' | 'lines+markers';
  symbol?: string;
  dash?: string;
  color?: string;
  name?: string;
  width?: number;            // LineWidth
  markerSize?: number;       // MarkerSize
  markerFaceColor?: string;  // MarkerFaceColor
  markerEdgeColor?: string;  // MarkerEdgeColor
  type?: 'line' | 'bar' | 'barh' | 'area' | 'stem' | 'stairs' | 'pie' | 'box' | 'violin';
  fillMode?: 'toself' | 'tonexty';   // filled polygon (fill/patch) or filled area
  z?: number[];        // present → 3-D line/scatter
  error?: number[];    // symmetric y error-bar half-widths
  sizes?: number[];    // per-point marker areas (scatter)
  theta?: number[];    // polar angle (radians) — present → polar series
  r?: number[];        // polar radius
  polarType?: 'line' | 'markers' | 'bar';
}
/** A 3-D triangulated mesh (trisurf/trimesh/tetramesh): node coords + 0-based triangle indices. */
export interface Mesh3D {
  x: number[];
  y: number[];
  z: number[];
  i: number[];
  j: number[];
  k: number[];
  wire?: boolean;        // trimesh → wireframe (edges only)
  intensity?: number[];  // per-node scalar for colour mapping (pdeplot)
  flat?: boolean;        // render flat, top-down (2-D filled-patch look)
}
/** A 3-D gridded surface (surf/mesh/contour). z[r][c] sits at (x[c], y[r]). */
export interface Surface {
  x: number[];
  y: number[];
  z: number[][];
  kind: 'surf' | 'mesh' | 'contour' | 'contour3';
  shading: 'faceted' | 'flat' | 'interp';
  xm?: number[][];     // optional full 2-D x/y coordinate matrices (slice planes)
  ym?: number[][];
  cdata?: number[][];  // optional surface-colour override (slice value field)
}
/** An in-chart text annotation at data coordinates (text/annotation). */
export interface Annotation {
  x: number;
  y: number;
  text: string;
  color?: string;
}
/** A constant reference line drawn across the axes (xline/yline). */
export interface RefLine {
  axis: 'x' | 'y';
  value: number;
  color?: string;
  dash?: string;
  label?: string;
}
/** One axes panel (the drawable content of a single subplot/tile). */
export interface Panel {
  series: Series[];
  surfaces?: Surface[];
  meshes?: Mesh3D[];
  reflines?: RefLine[];
  polar?: boolean;
  rRange?: [number, number];
  thetaRange?: [number, number];
  rticks?: number[];
  thetaticks?: number[];
  title?: string;
  xlabel?: string;
  ylabel?: string;
  zlabel?: string;
  xRange?: [number, number];
  yRange?: [number, number];
  xOrigin?: boolean;
  yOrigin?: boolean;
  grid?: boolean;
  legend?: string[];
  colorbar?: boolean;
  colormap?: string;
  xScale?: 'linear' | 'log';
  yScale?: 'linear' | 'log';
  xticks?: number[];
  yticks?: number[];
  xticklabels?: string[];
  yticklabels?: string[];
  annotations?: Annotation[];
  heatmap?: { z: number[][]; x?: (string | number)[]; y?: (string | number)[] };   // heatmap/imagesc/binscatter
  parcoords?: { label: string; values: number[] }[];                                // parallelplot
  subtitle?: string;
}
export interface FigureSpec {
  version: number;
  rows: number;          // tile-layout rows
  cols: number;          // tile-layout cols
  current: number;       // active panel index (row-major: r*cols + c)
  panels: Panel[];
  sgtitle?: string;      // overall title across all tiles
}

const COLOR_MAP: Record<string, string> = {
  r: '#e2483d', g: '#2e9e4f', b: '#2f6fed', c: '#16a0c0', m: '#c542b5',
  y: '#d6b800', k: '#222222', w: '#ffffff',
};
const MARKERS: Record<string, string> = {
  '*': 'star', o: 'circle', '+': 'cross', '.': 'circle', x: 'x',
  s: 'square', d: 'diamond', '^': 'triangle-up', v: 'triangle-down', p: 'pentagon',
  '>': 'triangle-right', '<': 'triangle-left', h: 'hexagram', '_': 'line-ew', '|': 'line-ns',
  square: 'square', diamond: 'diamond', pentagram: 'star', hexagram: 'hexagram',
};

function parseLineSpec(spec: string): Partial<Series> {
  const out: Partial<Series> = {};
  let s = spec;
  // line style (longest first)
  const styles: [string, string][] = [['--', 'dash'], ['-.', 'dashdot'], [':', 'dot'], ['-', 'solid']];
  let hasLine = false;
  for (const [tok, dash] of styles) { if (s.includes(tok)) { out.dash = dash; hasLine = true; s = s.replace(tok, ''); break; } }
  let hasMarker = false;
  for (const ch of s) {
    if (MARKERS[ch]) { out.symbol = MARKERS[ch]; hasMarker = true; }
    else if (COLOR_MAP[ch]) out.color = COLOR_MAP[ch];
  }
  out.mode = hasMarker && hasLine ? 'lines+markers' : hasMarker ? 'markers' : 'lines';
  return out;
}

/** Treat a double-quoted string scalar (Str) the same as a single-quoted char row,
 *  so `plot(x,y,"r--o")` parses its LineSpec just like `plot(x,y,'r--o')`. */
function normSpec(args: Value[]): Value[] {
  return args.map((a) => (a.kind === 'str' && a.rows * a.cols === 1 ? str(a.items[0]) : a));
}

const COLOR_NAMES: Record<string, string> = {
  red: '#e2483d', green: '#2e9e4f', blue: '#2f6fed', cyan: '#16a0c0', magenta: '#c542b5',
  yellow: '#d6b800', black: '#222222', white: '#ffffff', none: 'none',
};
const LINESTYLE_DASH: Record<string, string | undefined> = { '-': 'solid', '--': 'dash', ':': 'dot', '-.': 'dashdot', none: undefined };

/** Resolve a Color/MarkerFaceColor value: short letter, long name, "#rrggbb", or an RGB triplet. */
function resolveColor(v: Value): string | undefined {
  if (isMat(v) && (v as Mat).isChar) return resolveColorStr(asString(v));
  if (isMat(v) && !(v as Mat).isChar && numel(v) >= 3) {
    const d = (v as Mat).data; const ch = (x: number) => Math.round((x <= 1 ? x * 255 : x));
    return `rgb(${ch(d[0])},${ch(d[1])},${ch(d[2])})`;
  }
  return undefined;
}
function resolveColorStr(s: string): string | undefined {
  const t = s.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return t;
  if (COLOR_NAMES[t.toLowerCase()]) return COLOR_NAMES[t.toLowerCase()];
  if (t.length === 1 && COLOR_MAP[t]) return COLOR_MAP[t];
  return undefined;
}

/** Apply trailing Name=Value / 'Name',value pairs (R2021a+) to a Series. */
function applyLineProps(s: Partial<Series>, name: string, val: Value): void {
  switch (name.toLowerCase()) {
    case 'color': { const c = resolveColor(val); if (c) s.color = c; break; }
    case 'linewidth': s.width = asNum(val); break;
    case 'linestyle': { const ls = asString(val).trim(); s.dash = LINESTYLE_DASH[ls]; if (ls === 'none') s.mode = s.symbol || s.markerSize ? 'markers' : 'lines'; break; }
    case 'marker': { const mk = asString(val).trim(); s.symbol = mk === 'none' ? undefined : (MARKERS[mk] ?? mk); break; }
    case 'markersize': s.markerSize = asNum(val); break;
    case 'markerfacecolor': s.markerFaceColor = resolveColor(val); break;
    case 'markeredgecolor': s.markerEdgeColor = resolveColor(val); break;
    case 'displayname': s.name = asString(val); break;
  }
}
function asNum(v: Value): number | undefined { return isMat(v) ? (v as Mat).data[0] : undefined; }

/** A char/string arg that names a line property (vs. a LineSpec like "r--o"). */
function isPropName(v: Value): boolean {
  if (!isMat(v) || !(v as Mat).isChar) return false;
  return ['color', 'linewidth', 'linestyle', 'marker', 'markersize', 'markerfacecolor', 'markeredgecolor', 'displayname',
    'markerindices', 'durationtickformat', 'datetimetickformat', 'meshdensity', 'seriesindex', 'linejoin'].includes(asString(v).toLowerCase());
}

/** Coerce a tick-label argument (cell of char, string array, or char row) into a string list.
 *  Returns undefined to restore automatic labels (e.g. xticklabels('auto')). */
function tickLabelList(value: Value): string[] | undefined {
  const v = value as { kind?: string; items?: unknown[] };
  if (v.kind === 'cell') return (v.items as Value[]).map((it) => (isMat(it) && it.isChar ? asString(it) : asString(it as Mat)));
  if (v.kind === 'str') return [...(v.items as string[])];
  if (isMat(value) && value.isChar) { const s = asString(value); return s.toLowerCase() === 'auto' || s.toLowerCase() === 'manual' ? undefined : [s]; }
  return undefined;
}

const emptyPanel = (): Panel => ({ series: [] });

export class Graphics {
  fig: FigureSpec = { version: 0, rows: 1, cols: 1, current: 0, panels: [emptyPanel()] };
  private holding = false;
  private colorIdx = 0;
  private palette = ['#2f6fed', '#e2483d', '#2e9e4f', '#c542b5', '#d6b800', '#16a0c0'];

  /** The active axes panel — every drawing command targets it. */
  private cur(): Panel { return this.fig.panels[this.fig.current] ?? (this.fig.panels[this.fig.current] = emptyPanel()); }

  reset() { this.fig = { version: this.fig.version + 1, rows: 1, cols: 1, current: 0, panels: [emptyPanel()] }; this.colorIdx = 0; this.holding = false; }
  private touch() { this.fig = { ...this.fig, version: this.fig.version + 1 }; }
  private nextColor() { return this.palette[this.colorIdx++ % this.palette.length]; }

  hold(on?: boolean) { this.holding = on === undefined ? !this.holding : on; }

  /** subplot(m,n,p): m×n grid, activate panel p (row-major, 1-based). */
  subplot(m: number, n: number, p: number) {
    if (this.fig.rows !== m || this.fig.cols !== n) { this.fig.rows = m; this.fig.cols = n; this.fig.panels = Array.from({ length: m * n }, () => emptyPanel()); }
    this.fig.current = Math.max(0, Math.min(m * n - 1, p - 1)); this.colorIdx = 0; this.touch();
  }
  /** tiledlayout(m,n): set up the grid; nexttile selects panels in turn. */
  tiledlayout(m: number, n: number) { this.fig.rows = m; this.fig.cols = n; this.fig.panels = Array.from({ length: m * n }, () => emptyPanel()); this.fig.current = -1; this.touch(); }
  nexttile(p?: number) { this.fig.current = p !== undefined ? p - 1 : this.fig.current + 1; if (this.fig.current >= this.fig.panels.length) this.fig.panels.push(emptyPanel()); if (this.fig.current < 0) this.fig.current = 0; this.colorIdx = 0; this.touch(); }
  sgtitle(s: string) { this.fig.sgtitle = s; this.touch(); }

  /** Reset every drawable field of the current panel — used by all non-hold plot commands so a
   *  new plot can't leave a previous heatmap/parcoords/mesh/reflines/annotations shadowing it. */
  private clearContent() {
    const c = this.cur();
    c.series = []; c.surfaces = undefined; c.meshes = undefined; c.reflines = undefined;
    c.heatmap = undefined; c.parcoords = undefined; c.annotations = undefined;
    c.xScale = undefined; c.yScale = undefined;
    this.colorIdx = 0;
  }
  private startPlot() { if (!this.holding) this.clearContent(); }
  /** Parse a single (x,y) or (y) chart argument list into plain arrays. */
  private xyVec(args: Value[]): { x: number[]; y: number[] } {
    const mats = args.filter((a): a is Mat => isMat(a) && !(a as Mat).isChar);
    if (mats.length >= 2) return { x: toArray(mats[0]), y: toArray(mats[1]) };
    const y = mats.length ? toArray(mats[0]) : []; return { x: y.map((_, i) => i + 1), y };
  }
  setScale(which: 'x' | 'y', scale: 'linear' | 'log') { if (which === 'x') this.cur().xScale = scale; else this.cur().yScale = scale; this.touch(); }

  /** bar/barh/area/stem/stairs — single-series 2-D charts. */
  chart2d(args: Value[], type: NonNullable<Series['type']>) {
    args = normSpec(args);
    this.startPlot(); const { x, y } = this.xyVec(args);
    const mode = type === 'stem' ? 'markers' : 'lines';
    this.cur().series.push({ x, y, mode, type, color: this.nextColor() });
    this.touch();
  }
  scatter(args: Value[]) {
    this.startPlot(); const mats = args.filter((a): a is Mat => isMat(a) && !(a as Mat).isChar);
    const x = toArray(mats[0]), y = toArray(mats[1]);
    // scatter(x,y,sz): a vector sz sets per-point sizes; a scalar sz sets a uniform marker size.
    const sizes = mats.length >= 3 && numel(mats[2]) > 1 ? toArray(mats[2]) : undefined;
    const markerSize = mats.length >= 3 && numel(mats[2]) === 1 ? asScalar(mats[2]) : undefined;
    this.cur().series.push({ x, y, mode: 'markers', symbol: 'circle', sizes, markerSize, color: this.nextColor() });
    this.touch();
  }
  errorbar(args: Value[]) {
    this.startPlot(); const mats = args.filter((a): a is Mat => isMat(a) && !(a as Mat).isChar);
    let x: number[], y: number[], e: number[];
    if (mats.length >= 3) { x = toArray(mats[0]); y = toArray(mats[1]); e = toArray(mats[2]); }
    else { y = toArray(mats[0]); e = toArray(mats[1]); x = y.map((_, i) => i + 1); }
    this.cur().series.push({ x, y, error: e, mode: 'lines+markers', symbol: 'circle', color: this.nextColor() });
    this.touch();
  }
  pie(args: Value[]) { this.startPlot(); const v = toArray((args.find((a) => isMat(a)) as Mat)); this.cur().series.push({ x: [], y: v, type: 'pie', mode: 'markers', color: this.nextColor() }); this.touch(); }
  /** fill(X,Y,C) / patch(X,Y,C) — a filled polygon (Plotly fill:'toself'). */
  fill(args: Value[]) {
    args = normSpec(args);
    this.startPlot();
    const { x, y } = this.xyVec(args);
    const spec = args.find((a) => isMat(a) && (a as Mat).isChar) as Mat | undefined;
    const color = (spec ? resolveColorStr(asString(spec)) : undefined) ?? this.nextColor();
    this.cur().series.push({ x, y, mode: 'lines', fillMode: 'toself', color });
    this.touch();
  }
  /** boxplot(Y)/boxchart(Y) — one box per column; boxchart(g,y) groups y by the values in g. */
  boxchart(args: Value[]) {
    this.startPlot();
    const mats = args.filter((a): a is Mat => isMat(a) && !(a as Mat).isChar);
    if (!mats.length) { this.touch(); return; }
    if (mats.length >= 2) {
      // (group, data): split data into one box per distinct group value.
      const g = toArray(mats[0]), yv = toArray(mats[1]);
      const groups = new Map<number, number[]>();
      for (let i = 0; i < yv.length; i++) { const k = g[i]; (groups.get(k) ?? groups.set(k, []).get(k)!).push(yv[i]); }
      for (const [k, vals] of [...groups.entries()].sort((p, q) => p[0] - q[0])) this.cur().series.push({ x: vals.map(() => k), y: vals, type: 'box', mode: 'markers', name: String(k), color: this.nextColor() });
    } else {
      const M = mats[0];
      if (M.cols > 1 && M.rows > 1) { // matrix → one box per column
        for (let cIdx = 0; cIdx < M.cols; cIdx++) { const col: number[] = []; for (let r = 0; r < M.rows; r++) col.push(M.data[r + cIdx * M.rows]); this.cur().series.push({ x: col.map(() => cIdx + 1), y: col, type: 'box', mode: 'markers', name: String(cIdx + 1), color: this.nextColor() }); }
      } else { // vector → a single box
        this.cur().series.push({ x: [], y: toArray(M), type: 'box', mode: 'markers', name: '1', color: this.nextColor() });
      }
    }
    this.touch();
  }
  /** text(x,y,'str') — in-chart annotations at data coordinates (vectorized). */
  text(xs: number[], ys: number[], txts: string[], color?: string) {
    const cp = this.cur(); cp.annotations = cp.annotations ?? [];
    const n = Math.max(xs.length, ys.length, txts.length);
    for (let i = 0; i < n; i++) cp.annotations.push({ x: xs[i] ?? xs[0] ?? 0, y: ys[i] ?? ys[0] ?? 0, text: txts[i] ?? txts[txts.length - 1] ?? '', color });
    this.touch();
  }
  /** plot3/scatter3 — a 3-D line or scatter. */
  line3(args: Value[], mode: 'lines' | 'markers') {
    args = normSpec(args);
    this.startPlot(); const mats = args.filter((a): a is Mat => isMat(a) && !(a as Mat).isChar);
    const spec = args.find((a) => isMat(a) && (a as Mat).isChar);
    const s = spec ? parseLineSpec(asString(spec as Mat)) : {};
    // scatter3/bubblechart3(x,y,z,sz): a 4th vector sets per-point sizes; a scalar sets uniform size.
    const sizes = mode === 'markers' && mats.length >= 4 && numel(mats[3]) > 1 ? toArray(mats[3]) : undefined;
    const markerSize = mode === 'markers' && mats.length >= 4 && numel(mats[3]) === 1 ? asScalar(mats[3]) : undefined;
    this.cur().series.push({ x: toArray(mats[0]), y: toArray(mats[1]), z: toArray(mats[2]), sizes, markerSize, mode: spec ? (s.mode ?? mode) : mode, symbol: s.symbol, dash: s.dash, color: s.color ?? this.nextColor() });
    this.touch();
  }
  /** swarmchart(x,y[,sz]) / swarmchart3(x,y,z[,sz]) — scatter with points spread along x to avoid overlap. */
  swarm(args: Value[], threeD: boolean) {
    this.startPlot();
    const mats = args.filter((a): a is Mat => isMat(a) && !(a as Mat).isChar);
    const xv = toArray(mats[0]).slice(), yv = toArray(mats[1]);
    const zv = threeD ? toArray(mats[2]) : undefined;
    const szIdx = threeD ? 3 : 2;
    const sizes = mats.length > szIdx && numel(mats[szIdx]) > 1 ? toArray(mats[szIdx]) : undefined;
    // Beeswarm jitter: spread each group of equal-x points symmetrically across a small width.
    const groups = new Map<number, number[]>();
    xv.forEach((x, i) => { const g = groups.get(x); if (g) g.push(i); else groups.set(x, [i]); });
    for (const idxs of groups.values()) { const k = idxs.length; const w = Math.min(0.4, 0.045 * k); idxs.forEach((idx, j) => { xv[idx] = xv[idx] + (k > 1 ? (j / (k - 1) - 0.5) * 2 * w : 0); }); }
    this.cur().series.push({ x: xv, y: yv, z: zv, sizes, mode: 'markers', symbol: 'circle', color: this.nextColor() });
    this.touch();
  }
  /** heatmap(C) / heatmap(xvals,yvals,C) — a coloured matrix grid (also used by imagesc/binscatter). */
  heatmap(z: number[][], x?: (string | number)[], y?: (string | number)[]) {
    this.startPlot(); this.cur().heatmap = { z, x, y }; this.cur().colorbar = true; this.touch();
  }
  /** violinplot(Y) — one violin per column; violinplot(g,y) groups y by g (kernel density via Plotly). */
  violin(args: Value[]) {
    this.startPlot();
    const mats = args.filter((a): a is Mat => isMat(a) && !(a as Mat).isChar);
    if (!mats.length) { this.touch(); return; }
    if (mats.length >= 2) {
      const g = toArray(mats[0]), yv = toArray(mats[1]); const groups = new Map<number, number[]>();
      for (let i = 0; i < yv.length; i++) { const k = g[i]; const arr = groups.get(k); if (arr) arr.push(yv[i]); else groups.set(k, [yv[i]]); }
      for (const [k, vals] of [...groups.entries()].sort((p, q) => p[0] - q[0])) this.cur().series.push({ x: vals.map(() => k), y: vals, type: 'violin', mode: 'markers', name: String(k), color: this.nextColor() });
    } else {
      const M = mats[0];
      if (M.cols > 1 && M.rows > 1) for (let c = 0; c < M.cols; c++) { const col: number[] = []; for (let r = 0; r < M.rows; r++) col.push(M.data[r + c * M.rows]); this.cur().series.push({ x: col.map(() => c + 1), y: col, type: 'violin', mode: 'markers', name: String(c + 1), color: this.nextColor() }); }
      else this.cur().series.push({ x: [], y: toArray(M), type: 'violin', mode: 'markers', name: '1', color: this.nextColor() });
    }
    this.touch();
  }
  /** parallelplot(M) — parallel-coordinates: one axis per column, one polyline per row. */
  parallelcoords(M: Mat, labels?: string[]) {
    this.startPlot();
    const dims: { label: string; values: number[] }[] = [];
    for (let c = 0; c < M.cols; c++) { const v: number[] = []; for (let r = 0; r < M.rows; r++) v.push(M.data[r + c * M.rows]); dims.push({ label: labels?.[c] ?? `Var${c + 1}`, values: v }); }
    this.cur().parcoords = dims; this.touch();
  }
  /** stackedplot(cols, x) — one line per variable in its own stacked panel, sharing the x-axis. */
  stackedplot(cols: { label: string; y: number[] }[], x: number[]) {
    const k = Math.max(1, cols.length);
    this.fig = { version: this.fig.version + 1, rows: k, cols: 1, current: 0, panels: Array.from({ length: k }, () => emptyPanel()) };
    cols.forEach((col, c) => {
      this.fig.current = c;
      const p = this.cur();
      p.series = [{ x: x.slice(0, col.y.length), y: col.y, mode: 'lines', color: this.palette[c % this.palette.length] }];
      p.ylabel = col.label;
    });
    this.fig.current = 0; this.holding = false; this.touch();
  }
  /** binscatter(x,y) — 2-D density: bin points into a grid and render as a heatmap. */
  binscatter(xs: number[], ys: number[], nb = 20) {
    const fin = (v: number) => Number.isFinite(v);
    const xf = xs.filter((_, i) => fin(xs[i]) && fin(ys[i])), yf = ys.filter((_, i) => fin(xs[i]) && fin(ys[i]));
    if (!xf.length) { this.startPlot(); this.touch(); return; }
    const xlo = Math.min(...xf), xhi = Math.max(...xf), ylo = Math.min(...yf), yhi = Math.max(...yf);
    const z: number[][] = Array.from({ length: nb }, () => new Array(nb).fill(0));
    const bin = (v: number, lo: number, hi: number) => (hi > lo ? Math.min(nb - 1, Math.floor((v - lo) / (hi - lo) * nb)) : 0);
    for (let i = 0; i < xf.length; i++) z[bin(yf[i], ylo, yhi)][bin(xf[i], xlo, xhi)]++;
    const xc = Array.from({ length: nb }, (_, i) => xlo + (xhi - xlo) * (i + 0.5) / nb);
    const yc = Array.from({ length: nb }, (_, i) => ylo + (yhi - ylo) * (i + 0.5) / nb);
    this.heatmap(z, xc, yc);
  }

  /** plot(x, y, x2, y2, 'spec', ...) — also plot(y) and plot(x, Ymatrix). */
  plot(args: Value[]) {
    args = normSpec(args);
    if (!this.holding) this.clearContent();
    let i = 0;
    const nums = args.map((a) => (isMat(a) ? a : null));
    const made: Series[] = [];
    while (i < args.length) {
      // A property name (Color/LineWidth/…) ends the data list — the rest are Name-Value pairs.
      if (isPropName(args[i])) break;
      const a = nums[i];
      if (!a) { i++; continue; }
      let xs: number[];
      let ymat: Mat;
      const b = nums[i + 1];
      if (b && isMat(args[i + 1]) && !(args[i + 1] as Mat).isChar) {
        xs = toArray(a as Mat);
        ymat = b as Mat;
        i += 2;
      } else {
        ymat = a as Mat;
        xs = Array.from({ length: ymat.rows === 1 ? ymat.cols : ymat.rows }, (_, k) => k + 1);
        i += 1;
      }
      // A LineSpec (e.g. "r--o") may follow the data — but not a property name.
      let spec: Partial<Series> = {};
      if (i < args.length && isMat(args[i]) && (args[i] as Mat).isChar && !isPropName(args[i])) { spec = parseLineSpec(asString(args[i])); i++; }
      // Treat a row/column vector as a single series; a true matrix → one series per column.
      const asColumns = ymat.rows > 1 && ymat.cols > 1;
      const ncols = asColumns ? ymat.cols : 1;
      const colLen = asColumns ? ymat.rows : Math.max(ymat.rows, ymat.cols);
      for (let c = 0; c < ncols; c++) {
        const ys: number[] = [];
        for (let r = 0; r < colLen; r++) ys.push(asColumns ? ymat.data[r + c * ymat.rows] : ymat.data[r]);
        const ser: Series = {
          x: xs.slice(0, ys.length),
          y: ys,
          mode: spec.mode ?? 'lines',
          symbol: spec.symbol, dash: spec.dash,
          color: spec.color ?? this.nextColor(),
        };
        this.cur().series.push(ser); made.push(ser);
      }
    }
    // Trailing Name-Value pairs apply to every line created by this command.
    for (; i + 1 < args.length; i += 2) { const nm = asString(args[i]); for (const s of made) applyLineProps(s, nm, args[i + 1]); }
    this.touch();
  }

  /** surf/mesh/contour(X,Y,Z) — also surf(Z). X/Y may be meshgrid matrices or vectors. */
  surface(args: Value[], kind: Surface['kind']) {
    if (!this.holding) this.clearContent();
    const mats = args.filter((a): a is Mat => isMat(a) && !(a as Mat).isChar);
    let X: Mat | null, Y: Mat | null, Z: Mat;
    if (mats.length >= 3) { X = mats[0]; Y = mats[1]; Z = mats[2]; }
    else { Z = mats[0]; X = null; Y = null; }
    const nr = Z.rows, nc = Z.cols;
    const vecFrom = (M: Mat | null, len: number, dim: 'row' | 'col'): number[] => {
      if (!M) return Array.from({ length: len }, (_, i) => i + 1);
      if (M.rows > 1 && M.cols > 1) return dim === 'row'
        ? Array.from({ length: M.cols }, (_, c) => M.data[0 + c * M.rows])   // meshgrid X: first row
        : Array.from({ length: M.rows }, (_, r) => M.data[r]);              // meshgrid Y: first col
      return toArray(M);
    };
    const xv = vecFrom(X, nc, 'row'), yv = vecFrom(Y, nr, 'col');
    const z: number[][] = [];
    for (let r = 0; r < nr; r++) { const row: number[] = []; for (let c = 0; c < nc; c++) row.push(Z.data[r + c * nr]); z.push(row); }
    const cp = this.cur(); cp.surfaces = cp.surfaces ?? []; cp.surfaces.push({ x: xv, y: yv, z, kind, shading: 'faceted' });
    this.touch();
  }

  /** quiver(x,y,u,v): a 2-D vector field drawn as line segments (NaN-separated). */
  quiver(xs: number[], ys: number[], us: number[], vs: number[], scale = 0.9) {
    if (!this.holding) this.clearContent();
    const X: number[] = [], Y: number[] = [];
    for (let i = 0; i < xs.length; i++) { X.push(xs[i], xs[i] + scale * us[i], NaN); Y.push(ys[i], ys[i] + scale * vs[i], NaN); }
    this.cur().series.push({ x: X, y: Y, mode: 'lines', color: this.nextColor() });
    this.touch();
  }

  /** polarplot/polarscatter(theta,r) and polarhistogram/compass — a polar-axes series. */
  polar(args: Value[], mode: 'lines' | 'markers' | 'bar') {
    if (!this.holding) this.clearContent();
    const c = this.cur(); c.polar = true;
    const mats = args.filter((a): a is Mat => isMat(a) && !(a as Mat).isChar);
    let theta: number[], r: number[];
    if (mode === 'bar') {                                  // polarhistogram(theta[, nbins])
      const data = toArray(mats[0]); const nb = mats.length >= 2 && numel(mats[1]) === 1 ? toArray(mats[1])[0] : 20;
      const counts = new Array(nb).fill(0); for (const t of data) { let a = t % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; counts[Math.min(nb - 1, Math.floor(a / (2 * Math.PI) * nb))]++; }
      theta = counts.map((_, i) => (i + 0.5) * 2 * Math.PI / nb); r = counts;
    } else if (mats.length >= 2) { theta = toArray(mats[0]); r = toArray(mats[1]); }
    else { r = toArray(mats[0]); theta = r.map((_, i) => 2 * Math.PI * i / r.length); }
    // polarscatter/polarbubblechart(theta,r,sz): a 3rd numeric vector sets per-point marker sizes.
    const sizes = mode === 'markers' && mats.length >= 3 && numel(mats[2]) > 1 ? toArray(mats[2]) : undefined;
    c.series.push({ x: [], y: [], theta, r, sizes, polarType: mode === 'bar' ? 'bar' : undefined, mode: mode === 'bar' ? 'lines' : mode, symbol: mode === 'markers' ? 'circle' : undefined, color: this.nextColor() });
    this.touch();
  }
  /** compass(u,v): arrows from the origin in polar axes. */
  compass(us: number[], vs: number[]) {
    if (!this.holding) this.clearContent();
    const c = this.cur(); c.polar = true; const theta: number[] = [], r: number[] = [];
    for (let i = 0; i < us.length; i++) { theta.push(Math.atan2(vs[i], us[i]), Math.atan2(vs[i], us[i]), NaN); r.push(0, Math.hypot(us[i], vs[i]), NaN); }
    c.series.push({ x: [], y: [], theta, r, mode: 'lines', color: this.nextColor() });
    this.touch();
  }
  /** trisurf/trimesh(T,x,y,z): a triangulated 3-D surface. */
  trimesh(tri: number[][], x: number[], y: number[], z: number[], wire: boolean) {
    if (!this.holding) this.clearContent();
    const cp = this.cur(); cp.meshes = cp.meshes ?? [];
    cp.meshes.push({ x, y, z, i: tri.map((t) => t[0]), j: tri.map((t) => t[1]), k: tri.map((t) => t[2]), wire });
    this.touch();
  }
  /** pdeplot: a flat triangulation coloured by a per-node scalar (filled-patch look). */
  pdeColorMesh(tri: number[][], x: number[], y: number[], u: number[]) {
    if (!this.holding) this.clearContent();
    const cp = this.cur(); cp.meshes = cp.meshes ?? [];
    cp.meshes.push({ x, y, z: new Array(x.length).fill(0), i: tri.map((t) => t[0]), j: tri.map((t) => t[1]), k: tri.map((t) => t[2]), intensity: u, flat: true });
    cp.colorbar = true; this.touch();
  }
  /** quiver3(x,y,z,u,v,w): 3-D vector field as NaN-separated line segments. */
  quiver3(xs: number[], ys: number[], zs: number[], us: number[], vs: number[], ws: number[], scale = 0.9) {
    if (!this.holding) this.clearContent();
    const X: number[] = [], Y: number[] = [], Z: number[] = [];
    for (let i = 0; i < xs.length; i++) { X.push(xs[i], xs[i] + scale * us[i], NaN); Y.push(ys[i], ys[i] + scale * vs[i], NaN); Z.push(zs[i], zs[i] + scale * ws[i], NaN); }
    this.cur().series.push({ x: X, y: Y, z: Z, mode: 'lines', color: this.nextColor() });
    this.touch();
  }
  /** bar3(Z)/bar3h(Z): 3-D bars rendered as box meshes. horiz → value runs along x. */
  bar3(Z: number[][], horiz: boolean) {
    if (!this.holding) this.clearContent();
    const x: number[] = [], y: number[] = [], z: number[] = []; const ti: number[] = [], tj: number[] = [], tk: number[] = [];
    const hw = 0.4;
    const box = (cx: number, cy: number, h: number) => {
      const base = x.length;
      // 8 corners: (cx±hw, cy±hw, {0,h})
      const xs = horiz ? [0, 0, 0, 0, h, h, h, h] : [cx - hw, cx + hw, cx + hw, cx - hw, cx - hw, cx + hw, cx + hw, cx - hw];
      const ys = [cy - hw, cy - hw, cy + hw, cy + hw, cy - hw, cy - hw, cy + hw, cy + hw];
      const zs = horiz ? [cx - hw, cx + hw, cx + hw, cx - hw, cx - hw, cx + hw, cx + hw, cx - hw] : [0, 0, 0, 0, h, h, h, h];
      for (let v = 0; v < 8; v++) { x.push(xs[v]); y.push(ys[v]); z.push(zs[v]); }
      const faces = [[0, 1, 2], [0, 2, 3], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
      for (const [a, b, c] of faces) { ti.push(base + a); tj.push(base + b); tk.push(base + c); }
    };
    for (let r = 0; r < Z.length; r++) for (let c = 0; c < Z[r].length; c++) box(c + 1, r + 1, Z[r][c]);
    const cp = this.cur(); cp.meshes = cp.meshes ?? []; cp.meshes.push({ x, y, z, i: ti, j: tj, k: tk });
    this.touch();
  }
  /** slice plane: a parametric coloured surface (x,y,z all 2-D + colour field). */
  slicePlane(xm: number[][], ym: number[][], zm: number[][], cdata: number[][]) {
    if (!this.holding) this.clearContent();
    const cp = this.cur(); cp.surfaces = cp.surfaces ?? []; cp.surfaces.push({ x: [], y: [], z: zm, xm, ym, cdata, kind: 'surf', shading: 'interp' }); cp.colorbar = true;
    this.touch();
  }
  /** histogram2(x,y): bivariate histogram rendered as a filled-contour (heatmap) of bin counts. */
  histogram2(xs: number[], ys: number[], nbx = 10, nby = 10) {
    if (!this.holding) this.clearContent();
    const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
    const dx = (xmax - xmin) / nbx || 1, dy = (ymax - ymin) / nby || 1;
    const z: number[][] = Array.from({ length: nby }, () => new Array(nbx).fill(0));
    for (let k = 0; k < xs.length; k++) { const bi = Math.min(nbx - 1, Math.floor((xs[k] - xmin) / dx)), bj = Math.min(nby - 1, Math.floor((ys[k] - ymin) / dy)); z[bj][bi]++; }
    const xv = Array.from({ length: nbx }, (_, i) => xmin + (i + 0.5) * dx), yv = Array.from({ length: nby }, (_, i) => ymin + (i + 0.5) * dy);
    const cp = this.cur(); cp.surfaces = cp.surfaces ?? []; cp.surfaces.push({ x: xv, y: yv, z, kind: 'contour', shading: 'flat' }); cp.colorbar = true;
    this.touch();
  }
  setPolarProp(name: 'rlim' | 'thetalim' | 'rticks' | 'thetaticks', v: number[]) {
    const c = this.cur(); c.polar = true;
    if (name === 'rlim') c.rRange = [v[0], v[1]];
    else if (name === 'thetalim') c.thetaRange = [v[0], v[1]];
    else if (name === 'rticks') c.rticks = v;
    else c.thetaticks = v;
    this.touch();
  }

  /** xline/yline: a constant reference line (overlays without clearing the plot). */
  refline(axis: 'x' | 'y', values: number[], spec?: string, label?: string) {
    const s = spec ? parseLineSpec(spec) : {};
    const cp = this.cur(); cp.reflines = cp.reflines ?? [];
    for (const v of values) cp.reflines.push({ axis, value: v, color: s.color, dash: s.dash, label });
    this.touch();
  }

  /** fplot adds a sampled series; the caller supplies already-sampled points. */
  addSeries(x: number[], y: number[], spec?: string) {
    if (!this.holding) this.clearContent();
    const s = spec ? parseLineSpec(spec) : {};
    this.cur().series.push({ x, y, mode: s.mode ?? 'lines', symbol: s.symbol, dash: s.dash, color: s.color ?? this.nextColor() });
    this.touch();
  }

  /** animatedline / addpoints / clearpoints — a growing line the caller extends point-by-point. */
  private animLine: Series | null = null;
  animatedline() { const s: Series = { x: [], y: [], mode: 'lines', color: this.nextColor() }; this.cur().series.push(s); this.animLine = s; this.touch(); }
  addpoints(x: number[], y: number[]) { if (!this.animLine) this.animatedline(); for (let i = 0; i < x.length; i++) { this.animLine!.x.push(x[i]); this.animLine!.y.push(y[i]); } this.touch(); }
  clearpoints() { if (this.animLine) { this.animLine.x = []; this.animLine.y = []; this.touch(); } }

  setAxesProp(name: string, value: Value) {
    if (value.kind === 'str' && value.rows * value.cols === 1) value = str(value.items[0]);
    const lower = name.toLowerCase();
    const range = (): [number, number] => {
      if (!isMat(value)) throw new MatError(`${name} expects a 2-element vector`);
      const a = toArray(value); return [a[0], a[1]];
    };
    switch (lower) {
      case 'xlim': this.cur().xRange = range(); break;
      case 'ylim': this.cur().yRange = range(); break;
      case 'xaxislocation': this.cur().xOrigin = isMat(value) && value.isChar ? asString(value) === 'origin' : false; break;
      case 'yaxislocation': this.cur().yOrigin = isMat(value) && value.isChar ? asString(value) === 'origin' : false; break;
      case 'xtick': this.setTicks('x', isMat(value) ? toArray(value) : undefined); break;
      case 'ytick': this.setTicks('y', isMat(value) ? toArray(value) : undefined); break;
      case 'xticklabel': this.setTickLabels('x', tickLabelList(value)); break;
      case 'yticklabel': this.setTickLabels('y', tickLabelList(value)); break;
      case 'xscale': this.setScale('x', isMat(value) && value.isChar && asString(value) === 'log' ? 'log' : 'linear'); break;
      case 'yscale': this.setScale('y', isMat(value) && value.isChar && asString(value) === 'log' ? 'log' : 'linear'); break;
      case 'title': if (isMat(value) && value.isChar) this.cur().title = asString(value); break;
      default: break; // ignore unknown axes properties
    }
    this.touch();
  }

  // ── Axis limits (used by xlim/ylim/axis) ──
  /** Data extent of the current series along one axis (fallback when no limit is set). */
  private dataRange(which: 'x' | 'y'): [number, number] {
    let lo = Infinity, hi = -Infinity;
    for (const s of this.cur().series) for (const v of which === 'x' ? s.x : s.y) { if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
    if (!Number.isFinite(lo)) return [0, 1];
    if (lo === hi) return [lo - 1, hi + 1];
    return [lo, hi];
  }
  getXLim(): [number, number] { return this.cur().xRange ?? this.dataRange('x'); }
  getYLim(): [number, number] { return this.cur().yRange ?? this.dataRange('y'); }
  setXLim(r?: [number, number]) { this.cur().xRange = r; this.touch(); }
  setYLim(r?: [number, number]) { this.cur().yRange = r; this.touch(); }

  // ── Tick marks (xticks/yticks/xticklabels/yticklabels and ax.XTick/YTick) ──
  /** Set explicit tick locations; undefined restores Plotly's automatic ticking. */
  setTicks(which: 'x' | 'y', vals?: number[]) { if (which === 'x') this.cur().xticks = vals; else this.cur().yticks = vals; this.touch(); }
  getTicks(which: 'x' | 'y'): number[] | undefined { return which === 'x' ? this.cur().xticks : this.cur().yticks; }
  setTickLabels(which: 'x' | 'y', labels?: string[]) { if (which === 'x') this.cur().xticklabels = labels; else this.cur().yticklabels = labels; this.touch(); }
  getTickLabels(which: 'x' | 'y'): string[] | undefined { return which === 'x' ? this.cur().xticklabels : this.cur().yticklabels; }

  command(name: string, args: Value[]) {
    args = normSpec(args);
    const arg0 = args[0] && isMat(args[0]) && (args[0] as Mat).isChar ? asString(args[0]) : '';
    switch (name) {
      case 'hold': this.hold(arg0 === '' ? undefined : arg0 === 'on'); break;
      case 'grid': this.cur().grid = arg0 !== 'off'; this.touch(); break;
      case 'title': if (arg0) { this.cur().title = arg0; this.touch(); } break;
      case 'xlabel': if (arg0) { this.cur().xlabel = arg0; this.touch(); } break;
      case 'ylabel': if (arg0) { this.cur().ylabel = arg0; this.touch(); } break;
      case 'legend': this.cur().legend = args.filter((a) => isMat(a) && (a as Mat).isChar).map((a) => asString(a as Mat)); this.touch(); break;
      case 'axis': {
        // axis([xmin xmax ymin ymax]) | axis auto | axis (equal/tight/… ignored visually)
        if (args[0] && isMat(args[0]) && !(args[0] as Mat).isChar) {
          const v = toArray(args[0] as Mat);
          if (v.length >= 2) this.cur().xRange = [v[0], v[1]];
          if (v.length >= 4) this.cur().yRange = [v[2], v[3]];
          this.touch();
        } else if (arg0.toLowerCase() === 'auto') { this.cur().xRange = undefined; this.cur().yRange = undefined; this.touch(); }
        break;
      }
      case 'zlabel': if (arg0) { this.cur().zlabel = arg0; this.touch(); } break;
      case 'subtitle': if (arg0) { this.cur().subtitle = arg0; this.touch(); } break;
      case 'shading': { const sf = this.cur().surfaces; if (arg0 && sf) { for (const s of sf) s.shading = (arg0 as Surface['shading']); this.touch(); } break; }
      case 'colorbar': this.cur().colorbar = arg0 !== 'off'; this.touch(); break;
      case 'colormap': if (arg0) { this.cur().colormap = arg0; this.touch(); } break;
      case 'xscale': if (arg0 === 'log' || arg0 === 'linear') this.setScale('x', arg0); break;
      case 'yscale': if (arg0 === 'log' || arg0 === 'linear') this.setScale('y', arg0); break;
      case 'box': /* box on/off — outline is always drawn; accepted as a no-op toggle */ break;
      case 'view': /* camera angle — Plotly default; ignored */ break;
      case 'clf': case 'cla': case 'close': this.reset(); break;
      case 'figure': this.reset(); break;
      default: break;
    }
  }
}
