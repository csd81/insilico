/**
 * Feature tests that the MATLAB oracle can't cover: function-definition control
 * flow (eval can't define functions), sandbox-specific error structs and graphics
 * handle mutation, and symbolic results (asserted via double() of a substitution).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run, num } from './harness';

describe('function control flow', () => {
  it('early return takes the first branch', async () => {
    const r = await run(`
      a = clamp(-5);
      b = clamp(3);
      function y = clamp(x)
        if x < 0, y = 0; return; end
        y = x;
      end
    `);
    assert.equal(num(r.get('a')), 0);
    assert.equal(num(r.get('b')), 3);
  });
});

describe('try/catch error struct (basic MException contract)', () => {
  it('catch ME exposes a non-empty message string', async () => {
    const r = await run(`
      msg = '';
      try
        x = undefinedThing + 1;
      catch ME
        msg = ME.message;
      end
    `);
    assert.equal(r.error, undefined);
    const msg = r.get('msg');
    assert.ok(msg && msg.kind === 'num' && msg.isChar, 'msg is a char row');
    assert.ok((msg as { cols: number }).cols > 0, 'message is non-empty');
  });

  it('catch ME has an identifier field (string)', async () => {
    const r = await run(`
      id = '';
      try
        error('myPkg:myErr', 'boom');
      catch ME
        id = ME.identifier;
      end
    `);
    assert.equal(r.error, undefined);
    const id = r.get('id');
    const txt = id && id.kind === 'num' && id.isChar
      ? Array.from(id.data).map((c) => String.fromCharCode(c)).join('') : '';
    assert.equal(txt, 'myPkg:myErr');
  });
});

describe('symbolic (asserted through double of a substitution)', () => {
  it('subs evaluates a polynomial', async () => {
    const r = await run('syms x; y = double(subs(x^2 + 1, x, 3));');
    assert.equal(num(r.get('y')), 10);
  });

  it('diff then substitute', async () => {
    const r = await run('syms x; y = double(subs(diff(x^3), x, 2));');
    assert.equal(num(r.get('y')), 12);   // d/dx x^3 = 3x^2, at 2 → 12
  });

  it('definite integral', async () => {
    const r = await run('syms x; y = double(int(x, 0, 2));');
    assert.ok(Math.abs(num(r.get('y')) - 2) < 1e-9);   // ∫₀² x dx = 2
  });

  it('symbolic sum simplifies (x + x → 2x, checked at a point)', async () => {
    const r = await run('syms x; y = double(subs(x + x, x, 5));');
    assert.equal(num(r.get('y')), 10);
  });

  it('calculus smoke: f, diff, int evaluated at points', async () => {
    const r = await run(`
      syms x
      f = x^3 - 2*x + 1;
      df = diff(f, x);
      F = int(f, x);
      fv = double(subs(f, x, 2));
      dfv = double(subs(df, x, 2));
      Fv = double(subs(F, x, 2));
    `);
    assert.equal(num(r.get('fv')), 5);    // 8 - 4 + 1
    assert.equal(num(r.get('dfv')), 10);  // 3x^2 - 2 at 2 → 10
    assert.ok(Math.abs(num(r.get('Fv')) - 2) < 1e-9);  // x^4/4 - x^2 + x at 2 → 4-4+2 = 2
  });
});

describe('graphics handle smoke (FigureSpec is sandbox-specific)', () => {
  it('plot returns a handle without error and records a series', async () => {
    const r = await run('h = plot(1:3, [2 4 6]);');
    assert.equal(r.error, undefined);
    const p = (r.fig.panels?.[0] ?? {}) as { series?: unknown[] };
    assert.ok((p.series?.length ?? 0) >= 1);
  });

  it('setting a handle property does not error', async () => {
    const r = await run('h = plot(1:3); h.LineWidth = 2; h.Color = [1 0 0];');
    assert.equal(r.error, undefined);
  });
});
