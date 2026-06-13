/**
 * Lightweight SVG figure renderer — drop-in replacement for the Plotly-based one.
 *
 * Supported:  line, markers, bar, barh, area, stem, stairs, errorbar,
 *             heatmap/imagesc, xline/yline, text annotations,
 *             log scale, custom ticks/labels, legend, subplots, sgtitle.
 * Placeholder: 3-D (surf/mesh/trisurf), polar, pie, box, violin, parcoords.
 */
import type { FigureSpec, Panel, Series } from '../../matlab/graphics';

export type ScaleOverride = 'auto' | 'linear' | 'log';

// ── palette (MATLAB default color order) ────────────────────────────────────
const PAL = ['#0072bd','#d95319','#edb120','#7e2f8e','#77ac30','#4dbeee','#a2142f'];
const sc = (s: Series, i: number) => s.color ?? PAL[i % PAL.length];

// ── axis math ────────────────────────────────────────────────────────────────
function niceTicks(lo: number, hi: number, n = 5): number[] {
  if (!isFinite(lo) || !isFinite(hi) || lo >= hi) return [isFinite(lo) ? lo : 0];
  const raw = (hi - lo) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  let t = Math.ceil(lo / step) * step;
  while (t <= hi + step * 1e-9) { ticks.push(+t.toPrecision(10)); t = +(t + step).toPrecision(10); }
  return ticks;
}
function logTicks(lo: number, hi: number): number[] {
  if (lo <= 0 || hi <= 0 || lo >= hi) return [];
  const e0 = Math.ceil(Math.log10(lo)), e1 = Math.floor(Math.log10(hi));
  return Array.from({ length: Math.max(0, e1 - e0 + 1) }, (_, i) => 10 ** (e0 + i));
}
function fmtTick(v: number, log: boolean): string {
  if (log) { const e = Math.round(Math.log10(v)); return e === 0 ? '1' : e === 1 ? '10' : `10^${e}`; }
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || (a > 0 && a < 5e-4)) {
    const e = Math.floor(Math.log10(a));
    return `${+(v / 10 ** e).toPrecision(2)}e${e}`;
  }
  return v.toFixed(Math.max(0, Math.min(4, 1 - Math.floor(Math.log10(a)))));
}

// ── ranges ───────────────────────────────────────────────────────────────────
function dataExt(vals: number[], log: boolean): [number, number] | null {
  const fs = vals.filter(v => isFinite(v) && (!log || v > 0));
  if (!fs.length) return null;
  return [Math.min(...fs), Math.max(...fs)];
}
function padRange(lo: number, hi: number, log: boolean): [number, number] {
  if (lo === hi) return log ? [lo * 0.5, lo * 2] : [lo - 1, lo + 1];
  const p = (hi - lo) * 0.05;
  return log ? [lo, hi] : [lo - p, hi + p];
}

// ── coordinate transforms ────────────────────────────────────────────────────
function mkT(lo: number, hi: number, pLo: number, pHi: number, log: boolean) {
  if (log && lo > 0 && hi > lo) {
    const l0 = Math.log10(lo), span = Math.log10(hi) - l0;
    return (v: number) => pLo + (Math.log10(Math.max(v, 1e-300)) - l0) / span * (pHi - pLo);
  }
  const span = hi - lo;
  return (v: number) => span === 0 ? (pLo + pHi) / 2 : pLo + (v - lo) / span * (pHi - pLo);
}

// ── SVG path helpers ──────────────────────────────────────────────────────────
function polyline(xs: number[], ys: number[], tx: (v: number) => number, ty: (v: number) => number): string {
  const d: string[] = [];
  let gap = true;
  for (let i = 0; i < xs.length; i++) {
    if (!isFinite(xs[i]) || !isFinite(ys[i])) { gap = true; continue; }
    const px = tx(xs[i]).toFixed(1), py = ty(ys[i]).toFixed(1);
    d.push(gap ? `M${px},${py}` : `L${px},${py}`); gap = false;
  }
  return d.join('');
}
function stairLine(xs: number[], ys: number[], tx: (v: number) => number, ty: (v: number) => number): string {
  if (!xs.length) return '';
  const d = [`M${tx(xs[0]).toFixed(1)},${ty(ys[0]).toFixed(1)}`];
  for (let i = 1; i < xs.length; i++) d.push(`H${tx(xs[i]).toFixed(1)}`, `V${ty(ys[i]).toFixed(1)}`);
  return d.join('');
}

// ── jet colormap (for heatmaps) ───────────────────────────────────────────────
function jet(t: number): string {
  t = Math.max(0, Math.min(1, t));
  const r = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3)));
  const g = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2)));
  const b = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1)));
  return `rgb(${Math.round(255*r)},${Math.round(255*g)},${Math.round(255*b)})`;
}

// ── layout ────────────────────────────────────────────────────────────────────
const ML = 54, MR = 12, MT = 30, MB = 44; // margins per cell
const CW = 460, CH = 300;                  // virtual cell size

// ── single panel ──────────────────────────────────────────────────────────────
function SvgPanel({ p, dark, cid, cx, cy, xOvr, yOvr }: {
  p: Panel; dark: boolean; cid: string;
  cx: number; cy: number;
  xOvr: ScaleOverride; yOvr: ScaleOverride;
}) {
  const fg  = dark ? '#d8dee9' : '#1f2733';
  const fg2 = dark ? '#8892a4' : '#6c7a89';
  const bg  = dark ? '#252a3a' : '#fafbfc';
  const gc  = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)';
  const ac  = dark ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.18)';

  const px = cx + ML, py = cy + MT, pw = CW - ML - MR, ph = CH - MT - MB;

  // unsupported kinds → placeholder
  const has3d  = (p.surfaces?.length ?? 0) > 0 || (p.meshes?.length ?? 0) > 0 || p.series.some(s => s.z !== undefined);
  const hasPol = p.polar || p.series.some(s => s.theta !== undefined);
  const unsup  = has3d ? '3-D plot — not supported in lightweight renderer'
               : hasPol ? 'Polar plot — not supported in lightweight renderer'
               : p.parcoords ? 'Parallel coordinates — not supported'
               : p.series.some(s => s.type === 'pie') ? 'Pie chart — not supported'
               : null;

  if (unsup) return (
    <g>
      {p.title && <text x={px+pw/2} y={cy+MT-10} textAnchor="middle" fontSize={11} fontWeight={600} fill={fg}>{p.title}</text>}
      <rect x={px} y={py} width={pw} height={ph} fill={bg} stroke={ac} strokeWidth={.8} rx={2}/>
      <text x={px+pw/2} y={py+ph/2} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill={fg2}>{unsup}</text>
    </g>
  );

  // axis log flags
  const xlog = xOvr === 'log' || (xOvr === 'auto' && p.xScale === 'log');
  const ylog = yOvr === 'log' || (yOvr === 'auto' && p.yScale === 'log');

  // collect all x/y data for auto-range
  const isBars  = p.series.some(s => s.type === 'bar');
  const isHBars = p.series.some(s => s.type === 'barh');

  let [xlo, xhi]: [number, number] = [Infinity, -Infinity];
  let [ylo, yhi]: [number, number] = [Infinity, -Infinity];

  if (p.heatmap) {
    xlo = 0; xhi = (p.heatmap.z[0]?.length ?? 1) - 1;
    ylo = 0; yhi = (p.heatmap.z.length) - 1;
  } else {
    const xext = dataExt(p.series.flatMap(s => s.x), xlog);
    const yext = dataExt(p.series.flatMap(s => s.y), ylog);
    if (xext) [xlo, xhi] = padRange(...xext, xlog);
    else { xlo = 0; xhi = 1; }
    if (yext) [ylo, yhi] = padRange(...yext, ylog);
    else { ylo = 0; yhi = 1; }
    if (isBars) {
      const bxs = p.series.find(s => s.type === 'bar')!.x;
      const bw = bxs.length > 1 ? (bxs[bxs.length-1] - bxs[0]) / (bxs.length-1) * 0.5 : 0.5;
      if (!p.xRange) { xlo -= bw; xhi += bw; }
      if (!p.yRange) ylo = Math.min(0, ylo);
    }
    if (isHBars) {
      const bys = p.series.find(s => s.type === 'barh')!.y;
      const bh = bys.length > 1 ? (bys[bys.length-1] - bys[0]) / (bys.length-1) * 0.5 : 0.5;
      if (!p.yRange) { ylo -= bh; yhi += bh; }
      if (!p.xRange) xlo = Math.min(0, xlo);
    }
  }

  if (p.xRange) { [xlo, xhi] = p.xRange; }
  if (p.yRange) { [ylo, yhi] = p.yRange; }
  if (xlo >= xhi) xhi = xlo + 1;
  if (ylo >= yhi) yhi = ylo + 1;
  if (xlog && xlo <= 0) xlo = 1e-6;
  if (ylog && ylo <= 0) ylo = 1e-6;

  const tx = mkT(xlo, xhi, px, px+pw, xlog);
  const ty = mkT(yhi, ylo, py, py+ph, ylog); // note: yhi→py (top), ylo→py+ph (bottom)

  const xTicks = p.xticks ?? (xlog ? logTicks(xlo, xhi) : niceTicks(xlo, xhi));
  const yTicks = p.yticks ?? (ylog ? logTicks(ylo, yhi) : niceTicks(ylo, yhi));

  // legend labels: panel.legend array maps 1:1 to series by position
  const legendLabels: (string | undefined)[] = p.legend?.length
    ? p.series.map((_, i) => p.legend![i])
    : p.series.map(s => s.name);
  const hasLegend = legendLabels.some(Boolean);

  // bar helpers
  const barSeriesCount = p.series.filter(s => s.type === 'bar').length || 1;

  return (
    <g>
      {/* background */}
      <rect x={px} y={py} width={pw} height={ph} fill={bg}/>

      {/* grid */}
      {p.grid !== false && (
        <g stroke={gc} strokeWidth={.8}>
          {xTicks.map((v, i) => { const x=tx(v).toFixed(1); return +x>=px-1&&+x<=px+pw+1?<line key={i} x1={x} y1={py} x2={x} y2={py+ph}/>:null; })}
          {yTicks.map((v, i) => { const y=ty(v).toFixed(1); return +y>=py-1&&+y<=py+ph+1?<line key={i} x1={px} y1={y} x2={px+pw} y2={y}/>:null; })}
        </g>
      )}

      {/* clip */}
      <defs><clipPath id={cid}><rect x={px} y={py} width={pw} height={ph}/></clipPath></defs>
      <g clipPath={`url(#${cid})`}>

        {/* heatmap */}
        {p.heatmap && (() => {
          const { z } = p.heatmap;
          const nr = z.length, nc = z[0]?.length ?? 0;
          if (!nr || !nc) return null;
          const flat = z.flat(), zlo = Math.min(...flat), zhi = Math.max(...flat), dz = zhi-zlo || 1;
          const cw = pw/nc, ch = ph/nr;
          return z.flatMap((row, ri) => row.map((v, ci) => (
            <rect key={`${ri}_${ci}`} x={px+ci*cw} y={py+ri*ch} width={cw} height={ch} fill={jet((v-zlo)/dz)}/>
          )));
        })()}

        {/* ref lines (xline / yline) */}
        {p.reflines?.map((rl, i) => (
          <line key={i}
            x1={rl.axis==='x' ? tx(rl.value) : px}   x2={rl.axis==='x' ? tx(rl.value) : px+pw}
            y1={rl.axis==='y' ? ty(rl.value) : py}   y2={rl.axis==='y' ? ty(rl.value) : py+ph}
            stroke={rl.color ?? '#e74c3c'} strokeWidth={1.5} strokeDasharray={rl.dash==='--'?'7,4':rl.dash===':'?'2,3':undefined}/>
        ))}

        {/* series */}
        {p.series.map((s, si) => {
          const c   = sc(s, si);
          const lw  = s.width ?? 1.5;
          const mr  = (s.markerSize ?? 6) / 2;
          const mfc = s.markerFaceColor ?? c;
          const mec = s.markerEdgeColor ?? c;
          const sdash = s.dash==='dash'?'7,4':s.dash==='dot'?'2,3':s.dash==='dashdot'?'7,3,2,3':undefined;

          // ── bar (vertical) ──
          if (s.type === 'bar') {
            const bidx = p.series.filter((t,j)=>j<si&&t.type==='bar').length;
            const bwTotal = s.x.length>1 ? Math.abs(tx(s.x[1])-tx(s.x[0]))*0.8 : pw/4;
            const bwEach  = bwTotal / barSeriesCount;
            const y0 = Math.min(Math.max(ty(0), py), py+ph);
            return <g key={si}>{s.x.map((xv,i)=>{
              const bx = tx(xv)-bwTotal/2+bidx*bwEach;
              const yv = ty(s.y[i]??0);
              return <rect key={i} x={bx.toFixed(1)} y={Math.min(yv,y0).toFixed(1)}
                width={Math.max(0,bwEach-1).toFixed(1)} height={Math.abs(yv-y0).toFixed(1)} fill={c} opacity={.85}/>;
            })}</g>;
          }

          // ── barh (horizontal) ──
          if (s.type === 'barh') {
            const bhs = s.y.length>1 ? Math.abs(ty(s.y[0])-ty(s.y[1]))*0.7 : ph/4;
            const x0  = Math.max(Math.min(tx(0), px+pw), px);
            return <g key={si}>{s.y.map((yv,i)=>{
              const bby = ty(yv)-bhs/2;
              const xv  = tx(s.x[i]??0);
              return <rect key={i} x={Math.min(xv,x0).toFixed(1)} y={bby.toFixed(1)}
                width={Math.abs(xv-x0).toFixed(1)} height={Math.max(0,bhs).toFixed(1)} fill={c} opacity={.85}/>;
            })}</g>;
          }

          // ── stem ──
          if (s.type === 'stem') {
            const y0 = Math.min(Math.max(ty(0), py), py+ph);
            return <g key={si}>
              <line x1={px} y1={y0} x2={px+pw} y2={y0} stroke={c} strokeWidth={.8} strokeDasharray="2,2" opacity={.4}/>
              {s.x.map((xv,i)=>{ const sx=tx(xv),sy=ty(s.y[i]); return <g key={i}><line x1={sx} y1={y0} x2={sx} y2={sy} stroke={c} strokeWidth={lw}/><circle cx={sx} cy={sy} r={mr} fill={mfc} stroke={mec} strokeWidth={.5}/></g>; })}
            </g>;
          }

          // ── stairs ──
          if (s.type === 'stairs') return <path key={si} d={stairLine(s.x,s.y,tx,ty)} fill="none" stroke={c} strokeWidth={lw} strokeDasharray={sdash}/>;

          // ── area ──
          if (s.type === 'area' || s.fillMode === 'toself') {
            const d = polyline(s.x,s.y,tx,ty);
            const bx0=tx(s.x[0]).toFixed(1), bxN=tx(s.x[s.x.length-1]).toFixed(1), by0=(py+ph).toFixed(1);
            return <g key={si}>
              <path d={d+`L${bxN},${by0}L${bx0},${by0}Z`} fill={c} fillOpacity={.22} stroke="none"/>
              <path d={d} fill="none" stroke={c} strokeWidth={lw}/>
            </g>;
          }

          // ── line / markers / error bars ──
          const d = polyline(s.x,s.y,tx,ty);
          const showLine = s.mode !== 'markers';
          const showDots = s.mode !== 'lines';
          return <g key={si}>
            {s.error && s.x.map((xv,i)=>{ const ey=s.error![i]; if(!isFinite(ey))return null;
              const sx=tx(xv).toFixed(1);
              return <g key={i} stroke={c} strokeWidth={1}>
                <line x1={sx} y1={ty(s.y[i]-ey)} x2={sx} y2={ty(s.y[i]+ey)}/>
                <line x1={+sx-3} y1={ty(s.y[i]-ey)} x2={+sx+3} y2={ty(s.y[i]-ey)}/>
                <line x1={+sx-3} y1={ty(s.y[i]+ey)} x2={+sx+3} y2={ty(s.y[i]+ey)}/>
              </g>; })}
            {showLine && <path d={d} fill="none" stroke={c} strokeWidth={lw} strokeDasharray={sdash}/>}
            {showDots && s.x.map((xv,i)=>{
              const sx=tx(xv),sy=ty(s.y[i]);
              if(!isFinite(sx)||!isFinite(sy))return null;
              const r = s.sizes ? Math.sqrt((s.sizes[i]??1)/Math.PI) : mr;
              return <circle key={i} cx={sx.toFixed(1)} cy={sy.toFixed(1)} r={r} fill={mfc} stroke={mec} strokeWidth={.8}/>;
            })}
          </g>;
        })}

        {/* annotations */}
        {p.annotations?.map((a,i)=>(
          <text key={i} x={tx(a.x).toFixed(1)} y={ty(a.y).toFixed(1)} fontSize={10} fill={a.color??fg} textAnchor="middle">{a.text}</text>
        ))}
      </g>

      {/* axes border */}
      <rect x={px} y={py} width={pw} height={ph} fill="none" stroke={ac} strokeWidth={.8}/>

      {/* x ticks */}
      {xTicks.map((v,i)=>{ const x=tx(v).toFixed(1); if(+x<px-1||+x>px+pw+1)return null;
        const lbl = p.xticklabels?.[xTicks.indexOf(v)] ?? fmtTick(v,xlog);
        return <g key={i}><line x1={x} y1={py+ph} x2={x} y2={py+ph+4} stroke={ac} strokeWidth={.8}/>
          <text x={x} y={py+ph+14} textAnchor="middle" fontSize={9} fill={fg}>{lbl}</text></g>; })}

      {/* y ticks */}
      {yTicks.map((v,i)=>{ const y=ty(v).toFixed(1); if(+y<py-1||+y>py+ph+1)return null;
        const lbl = p.yticklabels?.[yTicks.indexOf(v)] ?? fmtTick(v,ylog);
        return <g key={i}><line x1={px-4} y1={y} x2={px} y2={y} stroke={ac} strokeWidth={.8}/>
          <text x={px-7} y={y} textAnchor="end" dominantBaseline="middle" fontSize={9} fill={fg}>{lbl}</text></g>; })}

      {/* axis labels */}
      {p.xlabel && <text x={px+pw/2} y={cy+CH-6} textAnchor="middle" fontSize={10} fill={fg}>{p.xlabel}</text>}
      {p.ylabel && <text x={cx+13} y={py+ph/2} textAnchor="middle" fontSize={10} fill={fg} transform={`rotate(-90,${cx+13},${py+ph/2})`}>{p.ylabel}</text>}
      {p.title  && <text x={px+pw/2} y={cy+MT-10} textAnchor="middle" fontSize={11} fontWeight={600} fill={fg}>{p.title}</text>}
      {p.subtitle && <text x={px+pw/2} y={cy+MT-1} textAnchor="middle" fontSize={9} fill={fg2}>{p.subtitle}</text>}

      {/* legend */}
      {hasLegend && (() => {
        const items = legendLabels.map((lbl,i)=>({lbl,i})).filter(x=>x.lbl);
        const maxW  = Math.max(...items.map(x=>x.lbl!.length)) * 5.5 + 22;
        const lx = px+pw-maxW-4, ly = py+4;
        return <g>
          <rect x={lx-2} y={ly} width={maxW+4} height={items.length*14+4}
            fill={dark?'rgba(37,42,58,.92)':'rgba(255,255,255,.92)'} stroke={ac} strokeWidth={.5} rx={2}/>
          {items.map(({lbl,i},li)=>{
            const c=sc(p.series[i],i), iy=ly+li*14+9;
            return <g key={i}><line x1={lx} y1={iy} x2={lx+12} y2={iy} stroke={c} strokeWidth={2}/>
              <text x={lx+15} y={iy} dominantBaseline="middle" fontSize={9} fill={fg}>{lbl}</text></g>;
          })}
        </g>;
      })()}
    </g>
  );
}

// ── top-level ─────────────────────────────────────────────────────────────────
export default function SvgFigure({ fig, dark, xScale='auto', yScale='auto' }: {
  fig: FigureSpec; dark: boolean; xScale?: ScaleOverride; yScale?: ScaleOverride;
}) {
  const panels = (fig.panels ?? []).filter(Boolean);
  const rows   = Math.max(1, fig.rows ?? 1);
  const cols   = Math.max(1, fig.cols ?? 1);
  const VW = CW * cols, VH = CH * rows;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display:'block', fontFamily:'system-ui,sans-serif' }}>
      {fig.sgtitle && <text x={VW/2} y={10} textAnchor="middle" fontSize={12} fontWeight={700}
        fill={dark?'#d8dee9':'#1f2733'}>{fig.sgtitle}</text>}
      {panels.map((panel, i) => (
        <SvgPanel key={i} p={panel} dark={dark} cid={`c${i}`}
          cx={(i % cols) * CW} cy={Math.floor(i / cols) * CH}
          xOvr={xScale} yOvr={yScale} />
      ))}
    </svg>
  );
}
