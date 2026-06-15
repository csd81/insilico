import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { run, expectMat, num } from '../harness';

// ── Syntax ───────────────────────────────────────────────────────────────────
describe('syntax', () => {
  it('line comment', async () => {
    const r = await run('x = 5; % this is a comment\n');
    assert.equal(num(r.get('x')), 5);
  });

  it('block comment', async () => {
    const r = await run('x = 1;\n%{\nignored = 99;\n%}\ny = 2;');
    assert.equal(num(r.get('x')), 1);
    assert.equal(num(r.get('y')), 2);
    assert.equal(r.get('ignored'), undefined);
  });

  it('line continuation', async () => {
    const r = await run('x = 1 + ...\n2 + ...\n3;');
    assert.equal(num(r.get('x')), 6);
  });

  it('semicolon suppresses output, bare expr prints', async () => {
    const r1 = await run('x = 7;');
    assert.equal(r1.output.trim(), '');
    const r2 = await run('3 + 4');
    assert.ok(r2.output.includes('7'));
  });

  it('matrix literal is row-major rows, column-major storage', async () => {
    const r = await run('A = [1 2; 3 4];');
    expectMat(r.get('A'), { rows: 2, cols: 2, data: [1, 3, 2, 4] });
  });

  it('cell literal', async () => {
    const r = await run("c = {1, 'two', [3 4]};");
    const c = r.get('c');
    assert.ok(c && c.kind === 'cell');
    assert.equal((c as { cols: number }).cols, 3);
  });

  it('char vs string class', async () => {
    const r = await run("a = 'hi'; b = \"hi\";");
    const a = r.get('a'), b = r.get('b');
    assert.ok(a && a.kind === 'num' && a.isChar, 'single quotes → char');
    assert.ok(b && b.kind === 'str', 'double quotes → string');
  });

  it('anonymous function', async () => {
    const r = await run('f = @(x) x.^2 + 1; y = f(3);');
    assert.equal(num(r.get('y')), 10);
  });

  it('local function definition', async () => {
    const r = await run('y = sq(4);\nfunction r = sq(x)\nr = x*x;\nend');
    assert.equal(num(r.get('y')), 16);
  });
});

// ── Core semantics ───────────────────────────────────────────────────────────
describe('semantics', () => {
  it('1-based indexing', async () => {
    const r = await run('v = [10 20 30]; a = v(1); c = v(3);');
    assert.equal(num(r.get('a')), 10);
    assert.equal(num(r.get('c')), 30);
  });

  it('end in subscript', async () => {
    const r = await run('v = [5 6 7 8]; a = v(end); b = v(end-1);');
    assert.equal(num(r.get('a')), 8);
    assert.equal(num(r.get('b')), 7);
  });

  it('colon range subvector', async () => {
    const r = await run('v = 1:10; s = v(3:5);');
    expectMat(r.get('s'), { rows: 1, cols: 3, data: [3, 4, 5] });
  });

  it('row vs column orientation', async () => {
    const r = await run('row = [1 2 3]; col = [1; 2; 3];');
    expectMat(r.get('row'), { rows: 1, cols: 3 });
    expectMat(r.get('col'), { rows: 3, cols: 1 });
  });

  it('scalar expansion in assignment', async () => {
    const r = await run('A = zeros(2,2); A(:) = 5;');
    expectMat(r.get('A'), { rows: 2, cols: 2, data: [5, 5, 5, 5] });
  });

  it('implicit expansion (broadcasting)', async () => {
    const r = await run('A = [1;2;3] + [10 20];');
    expectMat(r.get('A'), { rows: 3, cols: 2, data: [11, 12, 13, 21, 22, 23] });
  });

  it('assignment growth', async () => {
    const r = await run('v = [1 2 3]; v(5) = 9;');
    expectMat(r.get('v'), { rows: 1, cols: 5, data: [1, 2, 3, 0, 9] });
  });

  it('row deletion with []', async () => {
    const r = await run('A = [1 2; 3 4; 5 6]; A(2,:) = [];');
    expectMat(r.get('A'), { rows: 2, cols: 2, data: [1, 5, 2, 6] });
  });

  it('value-copy semantics (no aliasing)', async () => {
    const r = await run('A = [1 2 3]; B = A; B(1) = 99;');
    expectMat(r.get('A'), { rows: 1, cols: 3, data: [1, 2, 3] });
    expectMat(r.get('B'), { rows: 1, cols: 3, data: [99, 2, 3] });
  });
});

// ── Control flow ─────────────────────────────────────────────────────────────
describe('control flow', () => {
  it('if/elseif/else', async () => {
    const r = await run('x = 5; if x>10\ny=1;\nelseif x>3\ny=2;\nelse\ny=3;\nend');
    assert.equal(num(r.get('y')), 2);
  });

  it('for loop', async () => {
    const r = await run('s = 0; for i = 1:100\ns = s + i;\nend');
    assert.equal(num(r.get('s')), 5050);
  });

  it('while loop', async () => {
    const r = await run('n = 1; while n < 1000\nn = n * 2;\nend');
    assert.equal(num(r.get('n')), 1024);
  });

  it('break', async () => {
    const r = await run('s = 0; for i = 1:100\nif i > 5\nbreak;\nend\ns = s + i;\nend');
    assert.equal(num(r.get('s')), 15);
  });

  it('continue', async () => {
    const r = await run('s = 0; for i = 1:10\nif mod(i,2)==0\ncontinue;\nend\ns = s + i;\nend');
    assert.equal(num(r.get('s')), 25);
  });

  it('switch/case/otherwise', async () => {
    const r = await run("k = 2; switch k\ncase 1\ny=10;\ncase 2\ny=20;\notherwise\ny=0;\nend");
    assert.equal(num(r.get('y')), 20);
  });

  it('try/catch', async () => {
    const r = await run('caught = 0; try\nerror("boom");\ncatch\ncaught = 1;\nend');
    assert.equal(num(r.get('caught')), 1);
  });
});

// ── Functions ────────────────────────────────────────────────────────────────
describe('functions', () => {
  it('multiple outputs', async () => {
    const r = await run('[mn, idx] = min([5 2 8 1 9]);');
    assert.equal(num(r.get('mn')), 1);
    assert.equal(num(r.get('idx')), 4);
  });

  it('nargin / nargout', async () => {
    const r = await run('y = f(1, 2);\nfunction r = f(a, b, c)\nr = nargin;\nend');
    assert.equal(num(r.get('y')), 2);
  });

  // varargin/varargout — verified against MATLAB R2026a (the oracle generator can't eval
  // function definitions, so these are TS-only with MATLAB-confirmed expected values).
  it('varargin collects surplus args into a cell', async () => {
    const r = await run('s = mysum(1, 2, 3, 4, 5);\nfunction s = mysum(varargin)\ns = 0;\nfor i = 1:numel(varargin), s = s + varargin{i}; end\nend');
    assert.equal(num(r.get('s')), 15);   // MATLAB: 15
  });

  it('varargin after fixed params; empty when no surplus', async () => {
    const r = await run('a = f(10, 2, 3, 4);\nb = f(10);\nfunction r = f(x, varargin)\nr = x + numel(varargin);\nend');
    assert.equal(num(r.get('a')), 13);   // 10 + 3
    assert.equal(num(r.get('b')), 10);   // 10 + 0
  });

  it('varargout expands a cell into multiple outputs', async () => {
    const r = await run('[a, b, c] = g(3);\nfunction varargout = g(n)\nfor i = 1:n, varargout{i} = i*10; end\nend');
    assert.equal(num(r.get('a')), 10);
    assert.equal(num(r.get('b')), 20);
    assert.equal(num(r.get('c')), 30);
  });

  it('fixed output then varargout', async () => {
    const r = await run('[x, y, z] = h();\nfunction [x, varargout] = h()\nx = 1; varargout{1} = 2; varargout{2} = 3;\nend');
    assert.deepEqual([num(r.get('x')), num(r.get('y')), num(r.get('z'))], [1, 2, 3]);
  });

  it('varargin{:} comma-list pass-through to another function', async () => {
    const r = await run('r = outer(1, 2, 3);\nfunction r = outer(varargin)\nr = inner(varargin{:});\nend\nfunction s = inner(a, b, c)\ns = a*100 + b*10 + c;\nend');
    assert.equal(num(r.get('r')), 123);
  });

  it('anonymous closure captures variable', async () => {
    const r = await run('a = 10; f = @(x) x + a; a = 999; y = f(5);');
    assert.equal(num(r.get('y')), 15);   // captures a=10 at definition
  });

  it('feval', async () => {
    const r = await run("y = feval(@(x) x*3, 4);");
    assert.equal(num(r.get('y')), 12);
  });

  it('arrayfun', async () => {
    const r = await run('v = arrayfun(@(x) x^2, [1 2 3 4]);');
    expectMat(r.get('v'), { rows: 1, cols: 4, data: [1, 4, 9, 16] });
  });

  it('cellfun', async () => {
    const r = await run("v = cellfun(@numel, {[1 2], [3 4 5], 6});");
    expectMat(r.get('v'), { rows: 1, cols: 3, data: [2, 3, 1] });
  });
});
