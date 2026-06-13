import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run } from './harness';

const fails = (e?: string) => assert.ok(e && e.length > 0, 'expected an error');

describe('reference errors', () => {
  it('undefined variable', async () => {
    const r = await run('y = notDefinedVar + 1;');
    fails(r.error);
  });

  it('undefined function', async () => {
    const r = await run('y = totallyMadeUpFn(3);');
    fails(r.error);
    assert.match(r.error!, /totallyMadeUpFn|undefined|not defined|recognized/i);
  });
});

describe('dimension errors', () => {
  it('matmul inner-dimension mismatch', async () => {
    const r = await run('A = [1 2 3]; B = [1 2 3]; C = A * B;');
    fails(r.error);
  });

  it('elementwise size mismatch', async () => {
    const r = await run('a = [1 2 3] + [1 2];');
    fails(r.error);
  });
});

describe('indexing errors', () => {
  it('index out of bounds', async () => {
    const r = await run('v = [1 2 3]; x = v(10);');
    fails(r.error);
  });

  it('zero / negative index', async () => {
    const r = await run('v = [1 2 3]; x = v(0);');
    fails(r.error);
  });
});

describe('assignment errors', () => {
  it('left/right element count mismatch', async () => {
    const r = await run('v = [1 2 3]; v(1:2) = [1 2 3];');
    fails(r.error);
  });
});

describe('parse errors', () => {
  it('unbalanced bracket surfaces as error, not a crash', async () => {
    const r = await run('x = [1 2 3;');
    fails(r.error);
  });
});

describe('quarantine guards', () => {
  it('sim (Simulink) is undefined', async () => {
    const r = await run("sim('model');");
    fails(r.error);
  });
  it('hGate (quantum) is undefined', async () => {
    const r = await run('g = hGate(1);');
    fails(r.error);
  });
  it('quantumCircuit is undefined', async () => {
    const r = await run('c = quantumCircuit(2);');
    fails(r.error);
  });
});
