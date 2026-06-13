/** Figure pane: SVG renderer (no external dependency). */
import { useState } from 'react';
import { useTheme } from '../shared/providers/ThemeProvider';
import type { FigureSpec } from './matlab/graphics';
import SvgFigure, { type ScaleOverride } from './SvgFigure';

export default function FigurePane({ fig }: { fig: FigureSpec }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  // GUI axis-scale override: cycles auto → log → linear → auto. 'auto' respects whatever the
  // code set (e.g. semilogx); 'linear' can force a log plot back to linear (and vice versa).
  const [xScale, setXScale] = useState<ScaleOverride>('auto');
  const [yScale, setYScale] = useState<ScaleOverride>('auto');
  const nextScale = (s: ScaleOverride): ScaleOverride => (s === 'auto' ? 'log' : s === 'log' ? 'linear' : 'auto');
  const label = (s: ScaleOverride) => (s === 'auto' ? 'auto' : s === 'log' ? 'log' : 'lin');

  const panels = fig.panels ?? [];
  const hasContent = panels.some((p) => p && (p.series?.length || p.surfaces?.length || p.reflines?.length || p.meshes?.length || p.heatmap || p.parcoords));
  if (!hasContent) {
    return <div className="mlab__fig-empty">No figure yet — call <code>plot</code>, <code>surf</code>, <code>fplot</code>…</div>;
  }
  // Log scaling only applies to 2-D Cartesian axes — hide the toggles for 3-D/polar/heatmap/parcoords.
  const is2D = !panels.some((p) => p && (p.polar || p.heatmap || p.parcoords || p.meshes?.length || p.surfaces?.some((s) => s.kind !== 'contour') || p.series?.some((s) => s.z)));

  const btn = (active: boolean): React.CSSProperties => ({
    cursor: 'pointer', fontSize: '0.72rem', lineHeight: 1, padding: '3px 7px', borderRadius: 5,
    border: `1px solid ${active ? '#2f6fed' : (dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)')}`,
    background: active ? '#2f6fed' : 'transparent', color: active ? '#fff' : (dark ? '#d8dee9' : '#1f2733'),
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {is2D && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px 4px', flex: '0 0 auto' }}>
          <span style={{ fontSize: '0.7rem', opacity: 0.7, marginRight: 2 }}>Scale</span>
          <button type="button" style={btn(xScale !== 'auto')} onClick={() => setXScale(nextScale)} title="Cycle X-axis scale: auto → log → linear">X: {label(xScale)}</button>
          <button type="button" style={btn(yScale !== 'auto')} onClick={() => setYScale(nextScale)} title="Cycle Y-axis scale: auto → log → linear">Y: {label(yScale)}</button>
        </div>
      )}
      <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative' }}>
        <SvgFigure fig={fig} dark={dark} xScale={xScale} yScale={yScale} />
      </div>
    </div>
  );
}
