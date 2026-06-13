import { createSession } from '../index';
import type { FigureSpec } from '../graphics';

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
