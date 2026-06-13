import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run, expectMat } from './harness';
import { parseMlx } from '../io';

describe('matrix VFS round-trips', () => {
  it('writematrix then readmatrix round-trips', async () => {
    const r = await run("A = [1 2 3; 4 5 6]; writematrix(A, 'm.csv'); B = readmatrix('m.csv');");
    assert.equal(r.error, undefined);
    expectMat(r.get('B'), { rows: 2, cols: 3, data: [1, 4, 2, 5, 3, 6] });
  });

  it('readmatrix on an injected CSV', async () => {
    const r = await run("M = readmatrix('data.csv');", { 'data.csv': '1,2\n3,4\n5,6\n' });
    expectMat(r.get('M'), { rows: 3, cols: 2, data: [1, 3, 5, 2, 4, 6] });
  });
});

describe('table CSV', () => {
  it('readtable reads variables and rows', async () => {
    const r = await run("T = readtable('t.csv');", { 't.csv': 'a,b\n1,2\n3,4\n5,6\n' });
    const t = r.get('T');
    assert.ok(t && t.kind === 'table');
    const tbl = t as { vars: string[]; nrows: number };
    assert.deepEqual(tbl.vars, ['a', 'b']);
    assert.equal(tbl.nrows, 3);
  });
});

describe('low-level file I/O', () => {
  it('fopen / fgetl / fclose reads lines', async () => {
    const r = await run(
      "fid = fopen('lines.txt','r'); l1 = fgetl(fid); l2 = fgetl(fid); fclose(fid);",
      { 'lines.txt': 'alpha\nbeta\n' },
    );
    assert.equal(r.error, undefined);
    const l1 = r.get('l1'), l2 = r.get('l2');
    const txt = (v: typeof l1) => (v && v.kind === 'num' && v.isChar
      ? Array.from(v.data).map((c) => String.fromCharCode(c)).join('') : '');
    assert.equal(txt(l1), 'alpha');
    assert.equal(txt(l2), 'beta');
  });

  it('fopen on a missing file returns -1', async () => {
    const r = await run("fid = fopen('nope.txt','r');");
    assert.equal(r.error, undefined);
    assert.equal((r.get('fid') as { data: Float64Array }).data[0], -1);
  });
});

describe('.mlx parsing', () => {
  it('parseMlx rejects non-zip bytes (a .mlx is an OPC zip container)', () => {
    assert.throws(() => parseMlx(new Uint8Array([0, 1, 2, 3])), /zip/i);
  });
});
