import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runSnippet } from '../harness';

// ── Scalar arithmetic ────────────────────────────────────────────────────────
describe('scalar arithmetic', () => {
  it('adds two numbers', async () => {
    const r = await runSnippet('x = 2 + 3;');
    const x = r.vars.find((v) => v.name === 'x');
    assert.ok(x, 'x should be defined');
    assert.equal(x.klass, 'double');
    assert.equal(x.size, '1x1');
    assert.equal(x.preview, '5');
  });

  it('computes power', async () => {
    const r = await runSnippet('y = 2^10;');
    assert.equal(r.vars.find((v) => v.name === 'y')?.preview, '1024');
  });

  it('displays ans for bare expression', async () => {
    const r = await runSnippet('3 * 7');
    assert.ok(r.output.includes('21'));
  });

  it('pi constant', async () => {
    const r = await runSnippet('x = pi;');
    const preview = r.vars.find((v) => v.name === 'x')?.preview ?? '';
    assert.ok(Math.abs(parseFloat(preview) - Math.PI) < 1e-3);
  });
});

// ── Matrix operations ────────────────────────────────────────────────────────
describe('matrix operations', () => {
  it('creates a row vector', async () => {
    const r = await runSnippet('v = [1 2 3];');
    assert.equal(r.vars.find((x) => x.name === 'v')?.size, '1x3');
  });

  it('creates a column vector', async () => {
    const r = await runSnippet('v = [1; 2; 3];');
    assert.equal(r.vars.find((x) => x.name === 'v')?.size, '3x1');
  });

  it('multiplies matrices', async () => {
    const r = await runSnippet('A = [1 0; 0 2]; b = [3; 4]; c = A * b;');
    assert.equal(r.vars.find((x) => x.name === 'c')?.size, '2x1');
  });

  it('linspace produces correct length', async () => {
    const r = await runSnippet('x = linspace(0, 1, 5);');
    assert.equal(r.vars.find((v) => v.name === 'x')?.size, '1x5');
  });

  it('zeros and ones', async () => {
    const r = await runSnippet('A = zeros(3,2); B = ones(2,3);');
    assert.equal(r.vars.find((v) => v.name === 'A')?.size, '3x2');
    assert.equal(r.vars.find((v) => v.name === 'B')?.size, '2x3');
  });
});

// ── Indexing ─────────────────────────────────────────────────────────────────
describe('indexing', () => {
  it('reads element (1-based)', async () => {
    const r = await runSnippet('v = [10 20 30]; x = v(2);');
    assert.equal(r.vars.find((v) => v.name === 'x')?.preview, '20');
  });

  it('assigns into a vector', async () => {
    const r = await runSnippet('v = [1 2 3]; v(2) = 99;');
    assert.ok(r.vars.find((v) => v.name === 'v')?.preview.includes('99'));
  });

  it('colon selects a subvector', async () => {
    const r = await runSnippet('v = 1:5; s = v(2:4);');
    assert.equal(r.vars.find((v) => v.name === 's')?.size, '1x3');
  });
});

// ── Control flow ─────────────────────────────────────────────────────────────
describe('control flow', () => {
  it('for loop accumulates a sum', async () => {
    const r = await runSnippet('s = 0; for i = 1:10; s = s + i; end');
    assert.equal(r.vars.find((v) => v.name === 's')?.preview, '55');
  });

  it('while loop', async () => {
    const r = await runSnippet('n = 1; while n < 8; n = n * 2; end');
    assert.equal(r.vars.find((v) => v.name === 'n')?.preview, '8');
  });

  it('if/else', async () => {
    const r = await runSnippet('x = 3; if x > 2; y = 1; else; y = 0; end');
    assert.equal(r.vars.find((v) => v.name === 'y')?.preview, '1');
  });
});

// ── Function handles ─────────────────────────────────────────────────────────
describe('function handles', () => {
  it('anonymous function', async () => {
    const r = await runSnippet('f = @(x) x.^2; y = f(3);');
    assert.equal(r.vars.find((v) => v.name === 'y')?.preview, '9');
  });

  it('arrayfun with handle', async () => {
    const r = await runSnippet('f = @(x) x + 1; v = arrayfun(f, [1 2 3]);');
    assert.equal(r.vars.find((v) => v.name === 'v')?.size, '1x3');
  });
});

// ── Quarantine guards ────────────────────────────────────────────────────────
describe('quarantine', () => {
  it('sim is not registered (Simulink quarantined)', async () => {
    const r = await runSnippet("sim('model');");
    assert.ok(r.error && /undefined function|not defined|sim/i.test(r.error));
  });

  it('hGate is not registered (quantum quarantined)', async () => {
    const r = await runSnippet('g = hGate(1);');
    assert.ok(r.error && /undefined function|not defined|hGate/i.test(r.error));
  });

  it('quantumCircuit is not registered (quantum quarantined)', async () => {
    const r = await runSnippet('c = quantumCircuit(2);');
    assert.ok(r.error && /undefined function|not defined|quantumCircuit/i.test(r.error));
  });
});

// ── Errors ───────────────────────────────────────────────────────────────────
describe('errors', () => {
  it('undefined variable', async () => {
    const r = await runSnippet('x = notDefined + 1;');
    assert.ok(r.error);
  });

  it('dimension mismatch', async () => {
    const r = await runSnippet('A = [1 2]; B = [1; 2; 3]; C = A * B;');
    assert.ok(r.error);
  });
});

// ── Plotting ─────────────────────────────────────────────────────────────────
describe('plotting', () => {
  it('plot creates a series', async () => {
    const r = await runSnippet('x = 0:0.1:1; plot(x, x.^2);');
    assert.ok((r.fig.panels ?? []).some((p) => p?.series?.length));
  });
});
