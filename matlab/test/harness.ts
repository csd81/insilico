import assert from 'node:assert/strict';
import { Interpreter } from '../index';
import { createSession } from '../index';
import type { FigureSpec } from '../graphics';
import { type Value, type Mat, isMat } from '../values';

// ── Session-based smoke helper (back-compat for core.test.ts) ────────────────
export interface SnippetResult {
  output: string;
  vars: { name: string; size: string; klass: string; preview: string }[];
  fig: FigureSpec;
  error?: string;
}
export async function runSnippet(src: string): Promise<SnippetResult> {
  let output = '';
  const session = createSession({ onOutput: (t) => { output += t; } });
  const res = await session.run(src);
  return { output, vars: session.workspace(), fig: session.getFigure(), error: res.error };
}

// ── Value-level helper (Interpreter-based: raw workspace access) ──────────────
export interface RunResult {
  output: string;
  error?: string;
  fig: FigureSpec;
  get(name: string): Value | undefined;   // raw workspace value
  interp: Interpreter;
}
export async function run(src: string, files?: Record<string, string>): Promise<RunResult> {
  let output = '';
  let error: string | undefined;
  const interp = new Interpreter({ onOutput: (t) => { output += t; } });
  if (files) for (const [name, text] of Object.entries(files)) interp.writeFileText(name, text);
  try { await interp.run(src); } catch (e) { error = (e as Error)?.message ?? String(e); }
  return { output, error, fig: interp.graphics.fig, get: (n) => interp.base.vars.get(n), interp };
}

// ── Assertions on raw values ─────────────────────────────────────────────────
/** Assert a value is a numeric matrix with the given shape/data (column-major, tolerance-aware). */
export function expectMat(
  v: Value | undefined,
  exp: { rows?: number; cols?: number; data?: number[]; tol?: number },
): void {
  assert.ok(v && isMat(v), 'expected a numeric matrix');
  const m = v as Mat;
  const tol = exp.tol ?? 1e-9;
  if (exp.rows !== undefined) assert.equal(m.rows, exp.rows, `rows: ${m.rows} ≠ ${exp.rows}`);
  if (exp.cols !== undefined) assert.equal(m.cols, exp.cols, `cols: ${m.cols} ≠ ${exp.cols}`);
  if (exp.data) {
    assert.equal(m.data.length, exp.data.length, `numel: ${m.data.length} ≠ ${exp.data.length}`);
    exp.data.forEach((d, i) => assert.ok(Math.abs(m.data[i] - d) <= tol, `[${i}] ${m.data[i]} ≠ ${d} (tol ${tol})`));
  }
}
/** Extract the scalar value of a 1×1 numeric matrix. */
export function num(v: Value | undefined): number {
  assert.ok(v && isMat(v) && (v as Mat).data.length === 1, 'expected a scalar');
  return (v as Mat).data[0];
}
/** Column-major real data of a numeric matrix as a plain array. */
export function dataOf(v: Value | undefined): number[] {
  assert.ok(v && isMat(v), 'expected a numeric matrix');
  return Array.from((v as Mat).data);
}
