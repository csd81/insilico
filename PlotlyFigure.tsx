/** Renders a MATLAB FigureSpec (one or more axes panels) via Plotly. Lazy-loaded. */
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';
import type { FigureSpec, Panel } from './matlab/graphics';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = createPlotlyComponent(Plotly as any);

const CMAP: Record<string, string> = {
  parula: 'Viridis', jet: 'Jet', hsv: 'HSV', hot: 'Hot', cool: 'Bluered',
  gray: 'Greys', bone: 'Greys', autumn: 'YlOrRd', winter: 'Blues', spring: 'Pinkjet', summer: 'YlGn', copper: 'Hot', turbo: 'Turbo', viridis: 'Viridis',
};

/** Convert a #rgb/#rrggbb (or already-rgb()) colour to an rgba() string for translucent fills. */
function fillRgba(color: string | undefined, alpha: number): string {
  const c = color ?? '#2f6fed';
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const h = hex.length === 3 ? hex.split('').map((d) => d + d).join('') : hex;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const rgb = c.match(/^rgb\(([^)]+)\)$/i)?.[1];
  if (rgb) return `rgba(${rgb},${alpha})`;
  return c;   // named colour — Plotly handles it (opaque)
}

export type ScaleOverride = 'auto' | 'linear' | 'log';

export default function PlotlyFigure({ fig, dark, xScale = 'auto', yScale = 'auto' }: { fig: FigureSpec; dark: boolean; xScale?: ScaleOverride; yScale?: ScaleOverride }) {
  // GUI override wins over the figure spec; 'auto' keeps whatever the code set (xScale/semilogx/…).
  const effScale = (override: ScaleOverride, specScale?: string) => (override === 'auto' ? specScale : override);
  const fg = dark ? '#d8dee9' : '#1f2733';
  const grid = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
  const zero = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const panels = fig.panels ?? [];
  const single = panels.length <= 1 && fig.rows === 1 && fig.cols === 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const axisStyle = (range?: [number, number], origin?: boolean, title?: string, scale?: string, ticks?: number[], ticklabels?: string[]): any => ({
    // Plotly log axes expect range in log10 units; data-unit limits (xlim/ylim) convert here.
    range: range && scale === 'log' ? [Math.log10(Math.max(range[0], 1e-12)), Math.log10(Math.max(range[1], 1e-12))] : range,
    title: title ? { text: title } : undefined,
    gridcolor: grid, zeroline: true, zerolinecolor: origin ? fg : zero, zerolinewidth: origin ? 2 : 1,
    showline: !origin, linecolor: grid, color: fg, automargin: true, ...(scale === 'log' ? { type: 'log' } : {}),
    // Explicit tick locations/labels from xticks/yticks/ax.XTick (Plotly tickmode 'array').
    ...(ticks ? { tickmode: 'array', tickvals: ticks, ...(ticklabels ? { ticktext: ticklabels } : {}) } : {}),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layout: any = {
    autosize: true, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: fg, size: 12 }, showlegend: false,
    legend: { orientation: 'h', y: -0.18, font: { color: fg } },
    margin: { l: 48, r: 16, t: 28, b: 36 },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const annotations: any[] = [];

  panels.forEach((p, idx) => {
    if (!p || (!p.series?.length && !p.surfaces?.length && !p.reflines?.length && !p.meshes?.length && !p.annotations?.length && !p.heatmap && !p.parcoords)) return;
    const colorscale = CMAP[(p.colormap ?? 'parula').toLowerCase()] ?? 'Viridis';
    const has3D = !!p.surfaces?.some((s) => s.kind !== 'contour') || (p.series ?? []).some((s) => s.z) || !!p.meshes?.length;
    const N = idx + 1; const suf = N === 1 ? '' : String(N);
    const r = Math.floor(idx / (fig.cols || 1)), c = idx % (fig.cols || 1);
    // Cell domain (top row first), with padding for axis labels.
    const padx = single ? 0 : 0.06 / (fig.cols || 1), pady = single ? 0 : 0.10 / (fig.rows || 1);
    const xdom: [number, number] = single ? [0, 1] : [c / fig.cols + padx, (c + 1) / fig.cols - padx];
    const ydom: [number, number] = single ? [0, 1] : [1 - (r + 1) / fig.rows + pady, 1 - r / fig.rows - pady];
    const xa = 'x' + suf, ya = 'y' + suf;

    if (p.polar) {
      const pk = 'polar' + suf; const deg = (t: number[]) => t.map((v) => (v * 180) / Math.PI);
      for (const s of p.series ?? []) {
        if (s.polarType === 'bar') data.push({ type: 'barpolar', subplot: pk, theta: deg(s.theta ?? []), r: s.r ?? [], marker: { color: s.color } });
        else data.push({ type: 'scatterpolar', subplot: pk, theta: deg(s.theta ?? []), r: s.r ?? [], mode: s.mode, line: { color: s.color, width: 2 }, marker: { color: s.color, symbol: s.symbol ?? 'circle', size: s.sizes ?? 7 } });
      }
      layout[pk] = {
        domain: { x: xdom, y: ydom },
        radialaxis: { range: p.rRange, tickvals: p.rticks, color: fg, gridcolor: grid },
        angularaxis: { rotation: 0, direction: 'counterclockwise', tickvals: p.thetaticks ? p.thetaticks.map((t) => (t * 180) / Math.PI) : undefined, color: fg, gridcolor: grid },
        bgcolor: 'rgba(0,0,0,0)',
      };
      const ttl0 = p.title ?? '';
      if (ttl0) annotations.push({ text: ttl0, showarrow: false, xref: 'paper', yref: 'paper', x: (xdom[0] + xdom[1]) / 2, y: Math.min(1, ydom[1] + 0.02), xanchor: 'center', yanchor: 'bottom', font: { color: fg, size: single ? 14 : 12 } });
      return;
    }

    // Title annotation shared by the heatmap/parcoords branches below.
    const panelTitle = () => { const t = p.subtitle && p.title ? `${p.title} — ${p.subtitle}` : (p.title ?? ''); if (t) annotations.push({ text: t, showarrow: false, xref: 'paper', yref: 'paper', x: (xdom[0] + xdom[1]) / 2, y: Math.min(1, ydom[1] + 0.02), xanchor: 'center', yanchor: 'bottom', font: { color: fg, size: single ? 14 : 12 } }); };

    if (p.heatmap) {
      data.push({ type: 'heatmap', xaxis: xa, yaxis: ya, z: p.heatmap.z, x: p.heatmap.x, y: p.heatmap.y, colorscale, showscale: p.colorbar !== false });
      layout['xaxis' + suf] = { ...axisStyle(p.xRange, false, p.xlabel, undefined), anchor: ya, ...(single ? {} : { domain: xdom }) };
      layout['yaxis' + suf] = { ...axisStyle(p.yRange, false, p.ylabel, undefined), anchor: xa, ...(single ? {} : { domain: ydom }) };
      panelTitle();
      return;
    }
    if (p.parcoords) {
      data.push({ type: 'parcoords', domain: { x: xdom, y: ydom }, line: { color: '#2f6fed' }, dimensions: p.parcoords.map((d) => ({ label: d.label, values: d.values })), labelfont: { color: fg }, tickfont: { color: fg }, rangefont: { color: fg } });
      panelTitle();
      return;
    }

    if (has3D) {
      const sceneKey = 'scene' + suf;
      for (const s of p.surfaces ?? []) {
        if (s.kind === 'contour') continue; // contour handled in the 2-D branch below
        data.push({ type: 'surface', scene: sceneKey, x: s.xm ?? s.x, y: s.ym ?? s.y, z: s.z, surfacecolor: s.cdata, colorscale, showscale: !!p.colorbar, opacity: s.kind === 'mesh' ? 0.55 : 1, contours: s.kind === 'contour3' ? { z: { show: true, usecolormap: true, width: 2 } } : s.shading === 'faceted' ? { x: { show: true, color: zero, width: 1 }, y: { show: true, color: zero, width: 1 } } : undefined });
      }
      for (const mesh of p.meshes ?? []) {
        if (mesh.wire) {
          const lx: number[] = [], ly: number[] = [], lz: number[] = [];
          for (let t = 0; t < mesh.i.length; t++) { const a = mesh.i[t], b = mesh.j[t], cc = mesh.k[t]; lx.push(mesh.x[a], mesh.x[b], mesh.x[cc], mesh.x[a], NaN); ly.push(mesh.y[a], mesh.y[b], mesh.y[cc], mesh.y[a], NaN); lz.push(mesh.z[a], mesh.z[b], mesh.z[cc], mesh.z[a], NaN); }
          data.push({ type: 'scatter3d', scene: sceneKey, x: lx, y: ly, z: lz, mode: 'lines', line: { color: p.series?.[0]?.color ?? '#2f6fed', width: 2 } });
        } else {
          data.push({ type: 'mesh3d', scene: sceneKey, x: mesh.x, y: mesh.y, z: mesh.z, i: mesh.i, j: mesh.j, k: mesh.k, intensity: mesh.intensity ?? mesh.z, colorscale, showscale: !!p.colorbar, opacity: 1, flatshading: true });
        }
      }
      for (const s of p.series ?? []) if (s.z) data.push({ type: 'scatter3d', scene: sceneKey, x: s.x, y: s.y, z: s.z, mode: s.mode, line: { color: s.color, width: 4 }, marker: { color: s.color, size: s.sizes ?? 4 } });
      // A flat (pdeplot) mesh is viewed straight down so it reads as a 2-D filled-patch plot.
      const flat = p.meshes?.some((mh) => mh.flat);
      layout[sceneKey] = { domain: { x: xdom, y: ydom }, aspectmode: flat ? 'data' : 'auto',
        xaxis: { title: { text: p.xlabel ?? 'x' }, gridcolor: grid, color: fg }, yaxis: { title: { text: p.ylabel ?? 'y' }, gridcolor: grid, color: fg },
        zaxis: { title: { text: flat ? '' : (p.zlabel ?? 'z') }, gridcolor: grid, color: fg, ...(flat ? { showticklabels: false, showgrid: false, zeroline: false } : {}) },
        ...(flat ? { camera: { eye: { x: 0, y: 0, z: 2.2 }, up: { x: 0, y: 1, z: 0 } } } : {}) };
    } else {
      (p.series ?? []).forEach((s, i) => {
        const name = s.name ?? p.legend?.[i] ?? `data${i + 1}`;
        const line = { color: s.color, dash: s.dash, width: s.width ?? 2 };
        const marker = {
          color: s.markerFaceColor ?? s.color, symbol: s.symbol ?? 'circle',
          ...(s.sizes ? { size: s.sizes } : { size: s.markerSize ?? 7 }),
          ...(s.markerEdgeColor ? { line: { color: s.markerEdgeColor } } : {}),
        };
        if (s.type === 'pie') { data.push({ type: 'pie', values: s.y, labels: s.y.map((_, j) => `${j + 1}`), domain: { x: xdom, y: ydom } }); return; }
        const ax = { xaxis: xa, yaxis: ya };
        if (s.type === 'bar') { data.push({ type: 'bar', ...ax, x: s.x, y: s.y, marker: { color: s.color }, name }); return; }
        if (s.type === 'barh') { data.push({ type: 'bar', ...ax, orientation: 'h', x: s.y, y: s.x, marker: { color: s.color }, name }); return; }
        if (s.type === 'stem') {
          const sx: number[] = [], sy: number[] = []; for (let j = 0; j < s.x.length; j++) { sx.push(s.x[j], s.x[j], NaN); sy.push(0, s.y[j], NaN); }
          data.push({ type: 'scatter', ...ax, x: sx, y: sy, mode: 'lines', line, showlegend: false });
          data.push({ type: 'scatter', ...ax, x: s.x, y: s.y, mode: 'markers', marker: { color: s.color, symbol: 'circle', size: 7 }, name });
          return;
        }
        if (s.type === 'box') { data.push({ type: 'box', ...ax, y: s.y, ...(s.x.length ? { x: s.x } : {}), name, marker: { color: s.color }, line: { color: s.color }, boxpoints: 'outliers' }); return; }
        if (s.type === 'violin') { data.push({ type: 'violin', ...ax, y: s.y, ...(s.x.length ? { x: s.x } : {}), name, line: { color: s.color }, fillcolor: fillRgba(s.color, 0.35), meanline: { visible: true }, points: false }); return; }
        data.push({ type: 'scatter', ...ax, x: s.x, y: s.y, mode: s.mode, line: { ...line, shape: s.type === 'stairs' ? 'hv' : 'linear' }, marker, name, ...(s.type === 'area' ? { fill: 'tozeroy' } : {}), ...(s.fillMode ? { fill: s.fillMode, fillcolor: fillRgba(s.color, 0.35) } : {}), ...(s.error ? { error_y: { type: 'data', array: s.error, visible: true } } : {}) });
      });
      for (const s of p.surfaces ?? []) if (s.kind === 'contour') data.push({ type: 'contour', xaxis: xa, yaxis: ya, x: s.x, y: s.y, z: s.z, colorscale, showscale: !!p.colorbar, contours: { coloring: 'fill' } });
      layout['xaxis' + suf] = { ...axisStyle(p.xRange, p.xOrigin, p.xlabel, effScale(xScale, p.xScale), p.xticks, p.xticklabels), anchor: ya, ...(single ? {} : { domain: xdom }) };
      layout['yaxis' + suf] = { ...axisStyle(p.yRange, p.yOrigin, p.ylabel, effScale(yScale, p.yScale), p.yticks, p.yticklabels), anchor: xa, ...(single ? {} : { domain: ydom }) };
      if (p.reflines?.length) {
        layout.shapes = (layout.shapes ?? []).concat(p.reflines.map((rf) => (rf.axis === 'x'
          ? { type: 'line', xref: xa, x0: rf.value, x1: rf.value, yref: ya + ' domain', y0: 0, y1: 1, line: { color: rf.color ?? fg, dash: rf.dash, width: 1.5 } }
          : { type: 'line', yref: ya, y0: rf.value, y1: rf.value, xref: xa + ' domain', x0: 0, x1: 1, line: { color: rf.color ?? fg, dash: rf.dash, width: 1.5 } })));
      }
      if (p.legend?.length || (p.series?.length ?? 0) > 1) layout.showlegend = single ? true : layout.showlegend;
      for (const an of p.annotations ?? []) annotations.push({ x: an.x, y: an.y, text: an.text, xref: xa, yref: ya, showarrow: false, xanchor: 'left', yanchor: 'middle', font: { color: an.color ?? fg, size: single ? 12 : 10 } });
    }
    // Per-panel title (subplot title) as an annotation above the cell.
    const ttl = p.subtitle && p.title ? `${p.title} — ${p.subtitle}` : (p.title ?? '');
    if (ttl) annotations.push({ text: ttl, showarrow: false, xref: 'paper', yref: 'paper', x: (xdom[0] + xdom[1]) / 2, y: Math.min(1, ydom[1] + 0.02), xanchor: 'center', yanchor: 'bottom', font: { color: fg, size: single ? 14 : 12 } });
  });

  if (fig.sgtitle) { layout.title = { text: fig.sgtitle, font: { color: fg, size: 15 } }; layout.margin.t = 40; }
  if (annotations.length) layout.annotations = annotations;
  if (!single) layout.margin = { l: 40, r: 16, t: fig.sgtitle ? 44 : 24, b: 30 };

  return (
    <Plot
      data={data}
      layout={layout}
      config={{ displaylogo: false, responsive: true, displayModeBar: false }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler
    />
  );
}
