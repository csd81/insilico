import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run } from './harness';

const panel0 = (fig: { panels?: unknown[] }) => (fig.panels?.[0] ?? {}) as Record<string, unknown>;

describe('plot → FigureSpec series', () => {
  it('plot(x,y) creates one series with matching lengths', async () => {
    const r = await run('x = 0:0.1:1; plot(x, x.^2);');
    const p = panel0(r.fig);
    const series = p.series as { x: number[]; y: number[] }[];
    assert.equal(series.length, 1);
    assert.equal(series[0].x.length, 11);
    assert.equal(series[0].y.length, 11);
  });

  it('plot(x,y1,x,y2) creates two series', async () => {
    const r = await run('x = 1:5; plot(x, x, x, x.^2);');
    assert.equal((panel0(r.fig).series as unknown[]).length, 2);
  });

  it('hold on preserves prior series', async () => {
    const r = await run('x = 1:5; plot(x, x); hold on; plot(x, x.^2);');
    assert.equal((panel0(r.fig).series as unknown[]).length, 2);
  });
});

describe('labels & legend', () => {
  it('title / xlabel / ylabel populate panel', async () => {
    const r = await run("plot(1:3, 1:3); title('T'); xlabel('X'); ylabel('Y');");
    const p = panel0(r.fig);
    assert.equal(p.title, 'T');
    assert.equal(p.xlabel, 'X');
    assert.equal(p.ylabel, 'Y');
  });

  it('legend sets panel.legend array', async () => {
    const r = await run("x=1:3; plot(x,x,x,2*x); legend('a','b');");
    assert.deepEqual(panel0(r.fig).legend, ['a', 'b']);
  });
});

describe('layout', () => {
  it('subplot creates a multi-panel grid', async () => {
    const r = await run('subplot(2,1,1); plot(1:3,1:3); subplot(2,1,2); plot(1:3,3:-1:1);');
    assert.equal(r.fig.rows, 2);
    assert.equal(r.fig.cols, 1);
    assert.ok((r.fig.panels?.length ?? 0) >= 2);
  });

  it('tiledlayout + nexttile', async () => {
    const r = await run('tiledlayout(1,2); nexttile; plot(1:3,1:3); nexttile; plot(1:3,1:3);');
    assert.ok((r.fig.panels?.length ?? 0) >= 2);
  });
});

describe('reference lines & chart types', () => {
  it('xline / yline create reflines', async () => {
    const r = await run('plot(1:5,1:5); xline(3); yline(2);');
    const refs = panel0(r.fig).reflines as { axis: string; value: number }[];
    assert.ok(refs.some((l) => l.axis === 'x' && l.value === 3));
    assert.ok(refs.some((l) => l.axis === 'y' && l.value === 2));
  });

  it('bar sets series.type', async () => {
    const r = await run('bar([1 2 3]);');
    const s = (panel0(r.fig).series as { type?: string }[])[0];
    assert.equal(s.type, 'bar');
  });

  it('stem sets series.type', async () => {
    const r = await run('stem([1 2 3]);');
    const s = (panel0(r.fig).series as { type?: string }[])[0];
    assert.equal(s.type, 'stem');
  });
});

describe('axis scale', () => {
  it('semilogy sets yScale log', async () => {
    const r = await run('semilogy(1:10, exp(1:10));');
    assert.equal(panel0(r.fig).yScale, 'log');
  });

  it('semilogx sets xScale log', async () => {
    const r = await run('semilogx(1:10, 1:10);');
    assert.equal(panel0(r.fig).xScale, 'log');
  });
});

describe('3-D still yields a valid spec (renderer placeholder is UI-only)', () => {
  it('surf produces a surface in the spec without error', async () => {
    const r = await run('[X,Y] = meshgrid(1:3,1:3); Z = X+Y; surf(X,Y,Z);');
    assert.equal(r.error, undefined);
    const p = panel0(r.fig);
    assert.ok((p.surfaces as unknown[] | undefined)?.length, 'surface recorded in spec');
  });
});
