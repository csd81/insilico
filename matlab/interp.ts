/** Tree-walking evaluator for the MATLAB subset. */
import { parse } from './parser';
import type { Expr, LValue, Stmt, FuncDef } from './ast';
import {
  type Value, type Mat, type Handle, MatError,
  isMat, isHandle, mat, zeros, scalar, cscalar, bool, str, empty,
  numel, asScalar, asString, truthy, map, elementwise, matmul, transpose, ctranspose,
  horzcat, vertcat, range as makeRange, indexGet, indexSet, indexDelete, isEmpty, toArray, type Sub, type IdxList,
  isComplex, cmap, ewAdd, ewSub, ewMul, ewRDiv, ewLDiv, ewPow, ewEq, cmatmul,
  type Cell, type StructV, type Categorical, isCell, isStruct, makeCell, makeCategorical, sparseToDense,
  type Str, isStr, makeStr, makeStrArr,
  type Graph, type Geom, type Quantum,
  type Temporal, isTemporal, makeTemporal, numelOf,
  type Sym, isSym, makeSym, applyClass, pickClass, isMap, mapNormKey, isDict, cloneDict,
} from './values';
import { type SymExpr, sN, sV, sAdd, sSub, sMul, sDiv, sPow, sFn, simplifyExpr, subsExpr, evalExpr } from './sym';

/** Elementary functions that overload to symbolic when given a sym argument. */
const SYM_ELEMENTARY = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'asin', 'acos', 'atan', 'acot', 'asec', 'acsc', 'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch', 'asinh', 'acosh', 'atanh', 'exp', 'log', 'log10', 'log2', 'sqrt', 'abs', 'sign', 'cbrt', 'gamma', 'gammaln', 'erf', 'erfc', 'factorial', 'conj', 'real', 'imag', 'zeta', 'psi', 'sinc', 'erfi', 'dawson', 'fresnelc', 'fresnels', 'ei', 'logint', 'sinhint', 'coshint', 'ssinint', 'dilog', 'wrightOmega']);
import { det, inv, mldivide, illConditionWarning, qrRankWarning, decompositionSolve, decompositionRightSolve } from './linalg';
import { BUILTINS, CONSTANTS, builtinHelp, docUrl, type Env } from './builtins';
import { METHOD_NAMES, TOOLBOX_BY_ID, NAME_OWNERS, TOOLBOX_BUILTINS, lookupMethod } from './tb';
import { displayValue, dispValue } from './format';
import { Graphics } from './graphics';

/** Binary-operator → MATLAB method name, for class-object operator overloading (e.g. LTI models). */
const OBJ_BINOP: Record<string, string> = {
  '*': 'mtimes', '+': 'plus', '-': 'minus', '/': 'mrdivide', '\\': 'mldivide', '^': 'mpower',
  '.*': 'times', './': 'rdivide', '.^': 'power',
};

/** Snapshot a value for save() so later in-place edits don't mutate the stored copy. */
function cloneForSave(v: Value): Value {
  if (isMat(v)) return { ...v, data: v.data.slice(), idata: v.idata ? v.idata.slice() : undefined };
  return v;
}

/** Pragmatic HG2 property read on a graphics handle — returns a benign value of the right
 *  shape so chained dot/index/assign (`ax.Children(1).FontSize = 14`, `c = p.Color`) don't error. */
function gobjProperty(name: string): Value {
  const rv = (arr: number[]): Mat => { const z = zeros(1, arr.length); arr.forEach((v, i) => { z.data[i] = v; }); return z; };
  const n = name.toLowerCase();
  if (n === 'children' || n === 'parent') return { kind: 'gobj', gtype: 'line' };
  if (/color$/.test(n)) return rv([0, 0.447, 0.741]);
  if (n === 'linewidth') return scalar(0.5);
  if (n === 'markersize') return scalar(6);
  if (n === 'fontsize') return scalar(10);
  if (n === 'limits' || n === 'xlim' || n === 'ylim' || n === 'zlim' || n === 'clim') return rv([0, 1]);
  if (n === 'ticks' || n === 'xtick' || n === 'ytick' || n === 'ztick' || n === 'xdata' || n === 'ydata' || n === 'zdata' || n === 'cdata') return zeros(0, 0);
  if (n === 'string' || n === 'type' || n === 'tag' || n === 'linestyle' || n === 'marker' || n === 'visible' || n === 'displayname') return str('');
  return { kind: 'gobj', gtype: 'line' };   // unknown → another handle (keeps dot-chains alive)
}

class ReturnSignal {}
class BreakSignal {}
class ContinueSignal {}

class Scope {
  vars = new Map<string, Value>();
  nargin = 0;
  nargout = 0;
}

export interface InterpOptions {
  onOutput: (text: string) => void;
  requestInput?: (prompt: string) => Promise<string>;
  onClearConsole?: () => void;
  /**
   * Cooperative-yield hook, called periodically from inside loops. When the
   * interpreter runs in a Web Worker this returns to the event loop (so the
   * worker can process an incoming "abort" message) and throws to abort the run.
   */
  onTick?: () => void | Promise<void>;
}

export class Interpreter implements Env {
  private funcs = new Map<string, FuncDef>();
  private helpDocs = new Map<string, string>();
  graphics = new Graphics();
  private endStack: number[] = [];
  /** Scope of the currently executing user function (null at base/script level). */
  private funcScope: Scope | null = null;
  private onOutputCb: (text: string) => void;
  private requestInputCb: (prompt: string) => Promise<string>;
  private clearConsoleCb: () => void;
  private onTickCb: () => void | Promise<void>;
  private ticks = 0;
  base = new Scope();
  /** Toolbox ids bumped to the front of the resolution order by useToolbox(...), most-recent
   *  first. Arbitrates toolbox-vs-toolbox name collisions; base builtins are never overridden. */
  activeToolboxPriority: string[] = [];

  constructor(opts: InterpOptions) {
    this.onOutputCb = opts.onOutput;
    this.requestInputCb = opts.requestInput ?? (async () => '');
    this.clearConsoleCb = opts.onClearConsole ?? (() => {});
    this.onTickCb = opts.onTick ?? (() => {});
  }

  /** Periodic cooperative yield from loop bodies (no-op unless an onTick hook is set). */
  private maybeTick(): void | Promise<void> {
    if ((++this.ticks & 0x7ff) === 0) return this.onTickCb();
  }

  output(text: string) { this.onOutputCb(text); }
  requestInput(prompt: string) { return this.requestInputCb(prompt); }
  clearConsole() { this.clearConsoleCb(); }
  /** useToolbox(id): bump a toolbox to the front of the resolution order (path reordering). */
  useToolbox(id: string) {
    if (!TOOLBOX_BY_ID.has(id)) throw new MatError(`useToolbox: unknown toolbox '${id}'`);
    this.activeToolboxPriority = [id, ...this.activeToolboxPriority.filter((x) => x !== id)];
  }
  /** Owning toolbox ids for a name, active-priority first, then default registry order. */
  toolboxOwners(name: string): string[] {
    const owners = NAME_OWNERS.get(name); if (!owners) return [];
    const active = this.activeToolboxPriority.filter((id) => owners.includes(id));
    return [...active, ...owners.filter((id) => !active.includes(id))];
  }
  toolboxPriority(): string[] { return this.activeToolboxPriority.slice(); }
  currentNargin() { return this.funcScope ? this.funcScope.nargin : null; }
  currentNargout() { return this.funcScope ? this.funcScope.nargout : null; }
  callHandle(h: Handle, args: Value[], nargout: number) { return h.call(args, nargout); }
  help(name: string): string {
    const def = this.funcs.get(name);
    const doc = this.helpDocs.get(name);
    // User-defined .m function: show its comment block + a synthesized Syntax.
    if (def || doc) {
      const parts: string[] = [];
      parts.push(doc ?? ` ${name}`);
      if (def) {
        const outs = def.outputs.length ? (def.outputs.length === 1 ? def.outputs[0] : `[${def.outputs.join(', ')}]`) + ' = ' : '';
        parts.push(`    Syntax\n      ${outs}${name}(${def.params.join(', ')})`);
      }
      return parts.join('\n\n');
    }
    const b = builtinHelp(name);
    if (b) return b;
    if (name in BUILTINS) return ` ${name} - built-in function\n\n    Documentation for ${name}\n      ${docUrl(name)}`;
    if (name in CONSTANTS) return ` ${name} - built-in constant`;
    return `'${name}' not found. Type 'help' for an overview.`;
  }
  clearWorkspace(names: string[]) {
    if (!names.length || names.includes('all')) { this.base.vars.clear(); return; }
    for (const n of names) this.base.vars.delete(n);
  }
  workspaceVars() { return this.workspaceSnapshot().map(({ name, size, klass }) => ({ name, size, klass })); }
  /** Sorted, de-duplicated identifiers for command-window tab-completion:
   *  workspace variables, user-defined functions, every base/toolbox builtin,
   *  and constants. */
  completionNames(): string[] {
    const set = new Set<string>();
    for (const n of this.base.vars.keys()) set.add(n);
    for (const n of this.funcs.keys()) set.add(n);
    for (const n of NAME_OWNERS.keys()) set.add(n);
    for (const n of Object.keys(BUILTINS)) set.add(n);
    for (const n of Object.keys(CONSTANTS)) set.add(n);
    return [...set].sort((a, b) => a.localeCompare(b));
  }
  /** In-memory MAT-file store (no real filesystem in the browser sandbox). */
  private matFiles = new Map<string, Map<string, Value>>();
  private matKey(f: string) { return f.replace(/\.mat$/i, '').trim() + '.mat'; }
  saveMat(filename: string, names: string[]) {
    const store = new Map<string, Value>();
    const pick = names.length ? names : [...this.base.vars.keys()];
    for (const n of pick) {
      const v = this.base.vars.get(n);
      if (v === undefined) { if (names.length) throw new MatError(`Variable '${n}' not found.`); continue; }
      store.set(n, cloneForSave(v));
    }
    this.matFiles.set(this.matKey(filename), store);
  }
  private matPairs(filename: string, names: string[]): [string, Value][] {
    const store = this.matFiles.get(this.matKey(filename));
    if (!store) throw new MatError(`Unable to read file '${filename}'. No such file or directory.`);
    const pick = names.length ? names : [...store.keys()];
    const out: [string, Value][] = [];
    for (const n of pick) {
      const v = store.get(n);
      if (v === undefined) { if (names.length) throw new MatError(`Variable '${n}' not found in file '${filename}'.`); continue; }
      out.push([n, cloneForSave(v)]);
    }
    return out;
  }
  loadMat(filename: string, names: string[]) { for (const [n, v] of this.matPairs(filename, names)) this.base.vars.set(n, v); }
  readMatFile(filename: string, names: string[]): [string, Value][] { return this.matPairs(filename, names); }
  assignVars(pairs: [string, Value][]) { for (const [n, v] of pairs) this.base.vars.set(n, v); }

  /** Virtual file system: raw bytes keyed by (normalized) filename. Fed/drained by the worker. */
  private files = new Map<string, Uint8Array>();
  private fileKey(name: string) { return name.trim().replace(/^\.\//, ''); }
  hasFile(name: string): boolean { return this.files.has(this.fileKey(name)); }
  readFileBytes(name: string): Uint8Array | null { return this.files.get(this.fileKey(name)) ?? null; }
  readFileText(name: string): string | null { const b = this.readFileBytes(name); return b ? new TextDecoder().decode(b) : null; }
  writeFileBytes(name: string, bytes: Uint8Array) { this.files.set(this.fileKey(name), bytes); }
  writeFileText(name: string, text: string) { this.files.set(this.fileKey(name), new TextEncoder().encode(text)); }
  listFiles(): string[] { return [...this.files.keys()].sort(); }
  deleteFile(name: string) { this.files.delete(this.fileKey(name)); }

  // ── virtual file descriptors (fopen/fclose/fgetl/fscanf/fread/textscan over the VFS) ──
  private fds = new Map<number, { name: string; data: number[]; pos: number; mode: string }>();
  private nextFd = 3;   // 0/1/2 reserved for stdin/stdout/stderr
  fopenFile(name: string, mode = 'r'): number {
    const m2 = mode.toLowerCase();
    let data: number[];
    if (m2.startsWith('r')) { const b = this.readFileBytes(name); if (!b) return -1; data = Array.from(b); }
    else if (m2.startsWith('a')) { const b = this.readFileBytes(name); data = b ? Array.from(b) : []; }
    else data = [];   // 'w' truncates
    const fid = this.nextFd++;
    this.fds.set(fid, { name, data, pos: m2.startsWith('a') ? data.length : 0, mode: m2 });
    return fid;
  }
  fcloseFile(fid: number): number {
    if (fid === -1) { let n = 0; for (const id of [...this.fds.keys()]) { this.fcloseFile(id); n++; } return 0; }   // fclose('all')
    const fd = this.fds.get(fid); if (!fd) return -1;
    if (fd.mode.startsWith('w') || fd.mode.startsWith('a') || fd.mode.includes('+')) this.writeFileBytes(fd.name, Uint8Array.from(fd.data));
    this.fds.delete(fid); return 0;
  }
  fdInfo(fid: number) { return this.fds.get(fid); }
  async evalInput(text: string, wantValue = true): Promise<Value> {
    const prog = parse(text);
    for (const f of prog.functions) this.funcs.set(f.name, f);
    // A single bare expression returns its value (for `v = eval('expr')`, str2num, anon handles).
    if (wantValue && prog.stmts.length === 1 && prog.stmts[0].t === 'expr') return this.evalExpr(prog.stmts[0].e, this.base);
    // Otherwise execute the statements in the base workspace so assignments persist and
    // value-less commands (disp, plot, …) run and display as if typed.
    await this.runStmts(prog.stmts, this.base);
    return empty();
  }

  /** Register the function definitions in `src` without running its statements. */
  loadFunctions(src: string) {
    const prog = parse(src);
    for (const f of prog.functions) this.funcs.set(f.name, f);
    this.extractHelp(src);
  }

  /** Capture the help comment block immediately following each `function` line. */
  private extractHelp(src: string) {
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*function\b/.test(lines[i])) continue;
      const line = lines[i];
      const name =
        /=\s*([A-Za-z_]\w*)\s*\(/.exec(line)?.[1] ??
        /function\s+([A-Za-z_]\w*)\s*\(/.exec(line)?.[1] ??
        /=\s*([A-Za-z_]\w*)\s*$/.exec(line)?.[1] ??
        /function\s+([A-Za-z_]\w*)/.exec(line)?.[1];
      if (!name) continue;
      const doc: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\s*%/.test(lines[j])) doc.push(lines[j].replace(/^\s*%+ ?/, ''));
        else break;
      }
      if (doc.length) this.helpDocs.set(name, `${name}:\n  ` + doc.join('\n  '));
    }
  }
  defineFunction(def: FuncDef) { this.funcs.set(def.name, def); }
  hasCallable(name: string): boolean { return this.funcs.has(name) || name in BUILTINS || name in CONSTANTS; }
  listFunctions(): string[] { return [...this.funcs.keys()]; }

  /** Run a script: register its functions, then execute its statements. */
  async run(src: string): Promise<void> {
    const prog = parse(src);
    for (const f of prog.functions) this.funcs.set(f.name, f);
    this.extractHelp(src);
    try {
      await this.runStmts(prog.stmts, this.base);
    } catch (e) {
      if (e instanceof ReturnSignal) return;
      throw e;
    }
  }

  /** Workspace snapshot for the UI. */
  workspaceSnapshot(): { name: string; size: string; klass: string; preview: string }[] {
    const out: { name: string; size: string; klass: string; preview: string }[] = [];
    for (const [name, v] of this.base.vars) {
      if (name === 'ans' && this.base.vars.size > 1) { /* still include ans */ }
      if (isHandle(v)) { out.push({ name, size: '1x1', klass: 'function_handle', preview: '@' + (v.name ?? 'fn') }); continue; }
      if (v.kind === 'gobj') { out.push({ name, size: '1x1', klass: v.gtype, preview: `<${v.gtype}>` }); continue; }
      if (v.kind === 'cell') { out.push({ name, size: `${v.rows}x${v.cols}`, klass: 'cell', preview: dispValue(v).replace(/\s+/g, ' ').trim().slice(0, 40) }); continue; }
      if (v.kind === 'struct') { out.push({ name, size: `${v.rows}x${v.cols}`, klass: 'struct', preview: dispValue(v).replace(/\s+/g, ' ').trim().slice(0, 40) }); continue; }
      if (v.kind === 'sparse') { out.push({ name, size: `${v.rows}x${v.cols}`, klass: 'sparse double', preview: `${v.values.length} nonzeros` }); continue; }
      if (v.kind === 'str') { out.push({ name, size: `${v.rows}x${v.cols}`, klass: 'string', preview: dispValue(v).replace(/\s+/g, ' ').trim().slice(0, 40) }); continue; }
      if (v.kind === 'graph') { out.push({ name, size: '1x1', klass: v.directed ? 'digraph' : 'graph', preview: `${v.n} nodes, ${v.edges.length} edges` }); continue; }
      if (v.kind === 'geom') { out.push({ name, size: '1x1', klass: v.gkind, preview: `${v.points.length} pts${v.conn ? `, ${v.conn.length} simplices` : ''}` }); continue; }
      if (v.kind === 'quantum') { out.push({ name, size: '1x1', klass: `quantum.${v.qkind}`, preview: v.qkind === 'gate' ? `${v.gate}Gate` : v.qkind === 'circuit' ? `${v.numQubits} qubits, ${v.gates?.length ?? 0} gates` : `${v.numQubits} qubits` }); continue; }
      if (v.kind === 'object') { out.push({ name, size: `${v.rows ?? 1}x${v.cols ?? 1}`, klass: v.className, preview: [...v.props.keys()].slice(0, 4).join(', ') }); continue; }
      if (v.kind === 'temporal') { out.push({ name, size: `${v.rows}x${v.cols}`, klass: v.tkind, preview: dispValue(v).replace(/\s+/g, ' ').trim().slice(0, 40) }); continue; }
      if (v.kind === 'table') { out.push({ name, size: `${v.nrows}x${v.vars.length}`, klass: v.isTimetable ? 'timetable' : 'table', preview: v.vars.join(', ').slice(0, 40) }); continue; }
      if (v.kind === 'sym') { out.push({ name, size: `${v.rows}x${v.cols}`, klass: 'sym', preview: dispValue(v).replace(/\s+/g, ' ').trim().slice(0, 40) }); continue; }
      if (v.kind === 'categorical') { out.push({ name, size: `${v.rows}x${v.cols}`, klass: 'categorical', preview: dispValue(v).replace(/\s+/g, ' ').trim().slice(0, 40) }); continue; }
      if (v.kind === 'map') { out.push({ name, size: '1x1', klass: 'containers.Map', preview: `${v.store.size} entries (${v.keyKind} keys)` }); continue; }
      if (v.kind === 'dict') { out.push({ name, size: `${v.store.size}x1`, klass: 'dictionary', preview: `${v.store.size} entries (${v.keyKind} keys)` }); continue; }
      const klass = v.isChar ? 'char' : (v.itype ?? 'double');
      const preview = numel(v) <= 12 ? dispValue(v).replace(/\s+/g, ' ').trim().slice(0, 40) : '…';
      out.push({ name, size: `${v.rows}x${v.cols}`, klass, preview });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ── Statements ─────────────────────────────────────────────────────
  private async runStmts(stmts: Stmt[], scope: Scope) {
    for (const s of stmts) await this.execStmt(s, scope);
  }

  private async execStmt(stmt: Stmt, scope: Scope): Promise<void> {
    switch (stmt.t) {
      case 'expr': {
        const vals = await this.evalValues(stmt.e, scope, 0);
        if (vals.length) {
          scope.vars.set('ans', vals[0]);
          if (!stmt.suppressed) this.output(displayValue('ans', vals[0]) + '\n');
        }
        return;
      }
      case 'assign': {
        const raw = await this.evalExpr(stmt.e, scope);
        // Value semantics: a plain `B = A` must copy, so a later `B(i)=…` can't mutate A.
        // Indexed targets (`A(i)=…`) keep their in-place fast path (lhs is not a bare ident).
        const val = stmt.lhs.t === 'ident' ? cloneForSave(raw) : raw;
        await this.assignLValue(stmt.lhs, val, scope);
        if (!stmt.suppressed) this.displayAssigned(stmt.lhs, scope);
        return;
      }
      case 'multiassign': {
        // A cell-content target `C{...}` on the LHS expands to one output per selected cell,
        // so `[C{:}] = deal(a,b,c)` fills C with the three values.
        const targets: { lv: LValue | null; cellName?: string; indices?: number[] }[] = [];
        let total = 0;
        for (const lv of stmt.lhs) {
          if (lv && lv.t === 'cell' && lv.target.t === 'ident') {
            const cur = scope.vars.get(lv.target.name);
            if (cur && isCell(cur)) {
              const subs = await this.evalSubsN(lv.args, cur.rows, cur.cols, cur.items.length, scope);
              const lin = this.cellLinear(subs, cur.rows, cur.cols, cur.items.length);
              targets.push({ lv, cellName: lv.target.name, indices: lin }); total += lin.length; continue;
            }
          }
          targets.push({ lv }); total += 1;
        }
        const vals = await this.evalValues(stmt.e, scope, total);
        let k = 0;
        for (const t of targets) {
          if (t.indices) {
            const cur = scope.vars.get(t.cellName!) as Cell; const items = cur.items.slice();
            for (const idx of t.indices) { if (k >= vals.length) throw new MatError('not enough output arguments'); items[idx - 1] = vals[k++]; }
            scope.vars.set(t.cellName!, makeCell(cur.rows, cur.cols, items));
            if (!stmt.suppressed) this.displayAssigned({ t: 'ident', name: t.cellName! }, scope);
          } else if (t.lv) {
            if (k >= vals.length) throw new MatError('not enough output arguments');
            const v = vals[k++];
            await this.assignLValue(t.lv, t.lv.t === 'ident' ? cloneForSave(v) : v, scope);
            if (!stmt.suppressed) this.displayAssigned(t.lv, scope);
          } else k++;
        }
        return;
      }
      case 'if': {
        for (const cl of stmt.clauses) {
          if (truthy(await this.evalExpr(cl.cond, scope))) { await this.runStmts(cl.body, scope); return; }
        }
        if (stmt.elseBody) await this.runStmts(stmt.elseBody, scope);
        return;
      }
      case 'for': {
        const r = asMat(await this.evalExpr(stmt.range, scope));
        const cols = r.rows === 1 || r.cols === 1 ? numel(r) : r.cols;
        for (let c = 0; c < cols; c++) {
          let v: Value;
          if (r.rows === 1 || r.cols === 1) v = scalar(r.data[c]);
          else { const col = zeros(r.rows, 1); for (let rr = 0; rr < r.rows; rr++) col.data[rr] = r.data[rr + c * r.rows]; v = col; }
          scope.vars.set(stmt.varName, v);
          const t = this.maybeTick(); if (t) await t;
          try { await this.runStmts(stmt.body, scope); }
          catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
        }
        return;
      }
      case 'while': {
        let guard = 0;
        while (truthy(await this.evalExpr(stmt.cond, scope))) {
          if (++guard > 1e8) throw new MatError('while loop exceeded 100,000,000 iterations (aborted)');
          const t = this.maybeTick(); if (t) await t;
          try { await this.runStmts(stmt.body, scope); }
          catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
        }
        return;
      }
      case 'switch': {
        const subj = await this.evalExpr(stmt.subject, scope);
        const eq = (x: Value, y: Value): boolean => {
          if (isMat(x) && isMat(y) && x.isChar && y.isChar) return asString(x) === asString(y);
          if (isMat(x) && isMat(y)) { if (x.rows !== y.rows || x.cols !== y.cols) return false; for (let i = 0; i < x.data.length; i++) if (x.data[i] !== y.data[i]) return false; return true; }
          return false;
        };
        for (const cl of stmt.clauses) {
          for (const ve of cl.vals) {
            if (eq(subj, await this.evalExpr(ve, scope))) { await this.runStmts(cl.body, scope); return; }
          }
        }
        if (stmt.elseBody) await this.runStmts(stmt.elseBody, scope);
        return;
      }
      case 'try': {
        try { await this.runStmts(stmt.body, scope); }
        catch (e) {
          if (e instanceof ReturnSignal || e instanceof BreakSignal || e instanceof ContinueSignal) throw e;
          if (stmt.catchVar) {
            const msg = e instanceof MatError ? e.message : (e as Error)?.message ?? String(e);
            const id = e instanceof MatError ? (e.identifier ?? '') : '';
            const fields = new Map<string, Value[]>([['identifier', [str(id)]], ['message', [str(msg)]], ['stack', [empty()]]]);
            scope.vars.set(stmt.catchVar, { kind: 'struct', rows: 1, cols: 1, fields });
          }
          await this.runStmts(stmt.catchBody, scope);
        }
        return;
      }
      case 'return': throw new ReturnSignal();
      case 'break': throw new BreakSignal();
      case 'continue': throw new ContinueSignal();
      case 'global': return; // minimal: treated as no-op (corpora don't rely on globals)
      case 'func': this.funcs.set(stmt.def.name, stmt.def); return;
    }
  }

  private displayAssigned(lv: LValue, scope: Scope) {
    const name = rootName(lv);
    const v = scope.vars.get(name);
    if (v === undefined) return;
    this.output(displayValue(name, v) + '\n');
  }

  // ── Assignment ─────────────────────────────────────────────────────
  private async assignLValue(lv: LValue, val: Value, scope: Scope): Promise<void> {
    switch (lv.t) {
      case 'ident': scope.vars.set(lv.name, val); return;
      case 'field': {
        if (lv.target.t === 'ident') {
          const cur = scope.vars.get(lv.target.name);
          if (cur && cur.kind === 'gobj') { this.graphics.setAxesProp(lv.name, val); return; }
          // d.Format = "..." / d.TimeZone = "..." on a datetime: display-only, keep it a datetime.
          if (cur && isTemporal(cur) && ['format', 'timezone'].includes(lv.name.toLowerCase())) return;
          const fields = cur && isStruct(cur) ? new Map(cur.fields) : new Map<string, Value[]>();
          fields.set(lv.name, [val]);
          scope.vars.set(lv.target.name, { kind: 'struct', rows: 1, cols: 1, fields });
          return;
        }
        // S(i).field = val : grow/create a struct array, then set the field on element i.
        if (lv.target.t === 'index' && lv.target.target.t === 'ident') {
          const sname = lv.target.target.name;
          const cur = scope.vars.get(sname);
          const st: StructV = cur && isStruct(cur)
            ? { kind: 'struct', rows: cur.rows, cols: cur.cols, fields: new Map([...cur.fields].map(([k, v]) => [k, v.slice()])) }
            : { kind: 'struct', rows: 0, cols: 0, fields: new Map() };
          const total0 = st.rows * st.cols;
          const subs = await this.evalSubsN(lv.target.args, st.rows, st.cols, total0, scope);
          const lin = this.cellLinear(subs, st.rows, st.cols, total0);
          const need = lin.length ? Math.max(...lin) : 0;
          if (need > total0) {
            if (st.rows <= 1) { st.rows = 1; st.cols = need; }       // row (or new) struct array
            else if (st.cols === 1) { st.rows = need; }              // column struct array
            else st.cols = need;
          }
          const total = st.rows * st.cols;
          if (!st.fields.has(lv.name)) st.fields.set(lv.name, []);
          for (const [, arr] of st.fields) { while (arr.length < total) arr.push(empty()); }
          const farr = st.fields.get(lv.name)!;
          for (const idx of lin) farr[idx - 1] = val;
          scope.vars.set(sname, st);
          return;
        }
        // Nested field assignment (S.x.y = val, S.a.b.c = val): read the current container at
        // lv.target (or treat a missing path as a new struct), set the field, write it back.
        let container: Value | undefined;
        try { container = await this.evalExpr(lv.target as unknown as Expr, scope); } catch { container = undefined; }
        if (container && container.kind === 'gobj') { this.graphics.setAxesProp(lv.name, val); return; }
        const nfields = container && isStruct(container) ? new Map(container.fields) : new Map<string, Value[]>();
        nfields.set(lv.name, [val]);
        const nrows = container && isStruct(container) ? container.rows : 1, ncols = container && isStruct(container) ? container.cols : 1;
        await this.assignLValue(lv.target, { kind: 'struct', rows: nrows || 1, cols: ncols || 1, fields: nfields } as StructV, scope);
        return;
      }
      case 'cell': {
        // c{subs} = val : content assignment (grows the cell as needed). Fetch the existing
        // cell via readContainer so nested targets (S.c{1}=…, A{2}{1}=…) don't wipe it.
        const curC = await this.readContainer(lv.target, scope);
        let cell: Cell = curC && isCell(curC) ? makeCell(curC.rows, curC.cols, curC.items.slice()) : makeCell(0, 0, []);
        const subs = await this.evalSubsN(lv.args, cell.rows, cell.cols, cell.items.length, scope);
        const lin = this.cellLinear(subs, cell.rows, cell.cols, cell.items.length);
        const need = lin.length ? Math.max(...lin) : 0;
        if (need > cell.items.length) { const items = cell.items.slice(); while (items.length < need) items.push(empty()); cell = cell.rows > 1 ? makeCell(need, 1, items) : makeCell(1, need, items); }
        for (const idx of lin) cell.items[idx - 1] = val;
        await this.assignLValue(lv.target, cell, scope);
        return;
      }
      case 'index': {
        const cur = lv.target.t === 'ident' ? scope.vars.get(lv.target.name) : undefined;
        if (cur && isMap(cur)) {
          // m(key) = val : in-place insert/update (Map is a reference object)
          const args = await this.evalArgs(lv.args, scope);
          cur.store.set(mapNormKey(cur, args[0]), val);
          return;
        }
        if (cur && isDict(cur)) {
          // d(key) = val : value semantics → rebind a fresh (cloned) dictionary
          const args = await this.evalArgs(lv.args, scope);
          const nd = cloneDict(cur); nd.store.set(mapNormKey(cur, args[0]), val);
          scope.vars.set((lv.target as { name: string }).name, nd);
          return;
        }
        if (cur && isCell(cur)) {
          // c(subs) = rhsCell : sub-cell assignment, growing the cell as needed.
          const subs = await this.evalSubsN(lv.args, cur.rows, cur.cols, cur.items.length, scope);
          const rhsItems = isCell(val) ? val.items : [val];
          const name = (lv.target as { name: string }).name;
          if (subs.length === 2) {
            const rhsR = isCell(val) ? val.rows : 1, rhsC = isCell(val) ? val.cols : 1;
            const rs = subs[0] === 'colon' ? Array.from({ length: Math.max(cur.rows, rhsR) }, (_, i) => i + 1) : (subs[0] as number[]);
            const cs = subs[1] === 'colon' ? Array.from({ length: Math.max(cur.cols, rhsC) }, (_, i) => i + 1) : (subs[1] as number[]);
            const newR = Math.max(cur.rows, rs.length ? Math.max(...rs) : 0);
            const newC = Math.max(cur.cols, cs.length ? Math.max(...cs) : 0);
            const items: Value[] = Array.from({ length: newR * newC }, () => empty());
            for (let c = 0; c < cur.cols; c++) for (let r = 0; r < cur.rows; r++) items[r + c * newR] = cur.items[r + c * cur.rows];
            let k = 0;
            for (const c of cs) for (const r of rs) { items[(r - 1) + (c - 1) * newR] = rhsItems.length === 1 ? rhsItems[0] : rhsItems[k]; k++; }
            scope.vars.set(name, makeCell(newR, newC, items));
            return;
          }
          const lin = this.cellLinear(subs, cur.rows, cur.cols, cur.items.length);
          const need = lin.length ? Math.max(...lin) : 0;
          const items = cur.items.slice(); while (items.length < need) items.push(empty());
          lin.forEach((idx, k) => { items[idx - 1] = rhsItems.length === 1 ? rhsItems[0] : rhsItems[k]; });
          const grew = need > cur.rows * cur.cols;
          scope.vars.set(name, grew ? (cur.rows > 1 ? makeCell(need, 1, items) : makeCell(1, need, items)) : makeCell(cur.rows, cur.cols, items));
          return;
        }
        const container = asMat(await this.readContainer(lv.target, scope));
        const rhs = asMat(val);
        const subs = await this.evalSubs(lv.args, container, scope);
        // `A(...) = []` deletes rows/columns/elements; otherwise it's a write.
        const updated = isEmpty(rhs) ? indexDelete(container, subs) : indexSet(container, subs, rhs);
        await this.assignLValue(lv.target, updated, scope);
        return;
      }
    }
  }

  /** Current value of an assignment target (empty matrix if undefined → grows). */
  private async readContainer(lv: LValue, scope: Scope): Promise<Value> {
    if (lv.t === 'ident') return scope.vars.get(lv.name) ?? empty();
    // Field of a struct (S.a, S.x.y): read the current value, or empty if the path is new.
    if (lv.t === 'field') {
      try { return await this.evalExpr(lv as unknown as Expr, scope); } catch { return empty(); }
    }
    // Cell content (C{i}): return the stored element, not the parent cell.
    if (lv.t === 'cell') {
      const parent = await this.readContainer(lv.target, scope);
      if (isCell(parent)) {
        const subs = await this.evalSubsN(lv.args, parent.rows, parent.cols, parent.items.length, scope);
        const lin = this.cellLinear(subs, parent.rows, parent.cols, parent.items.length);
        return parent.items[lin[0] - 1] ?? empty();
      }
      return empty();
    }
    if (lv.t === 'index') {
      const base = asMat(await this.readContainer(lv.target, scope));
      const subs = await this.evalSubs(lv.args, base, scope);
      return indexGet(base, subs);
    }
    throw new MatError('invalid assignment target');
  }

  // ── Subscripts ─────────────────────────────────────────────────────
  private evalSubs(args: Expr[], container: Mat, scope: Scope): Promise<Sub[]> {
    return this.evalSubsN(args, container.rows, container.cols, numel(container), scope, container.nd);
  }
  private async evalSubsN(args: Expr[], rows: number, cols: number, total: number, scope: Scope, nd?: number[]): Promise<Sub[]> {
    const n = args.length;
    // `end` per dimension: for n subscripts, the last absorbs the product of the remaining dims.
    const dims = nd ?? [rows, cols];
    const endFor = (i: number): number => {
      if (n === 1) return total;
      if (i < n - 1) return dims[i] ?? 1;
      return dims.slice(i).reduce((p, x) => p * x, 1) || 1;
    };
    const subs: Sub[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a.t === 'colon') { subs.push('colon'); continue; }
      const endVal = endFor(i);
      this.endStack.push(endVal);
      let v: Value;
      try { v = await this.evalExpr(a, scope); } finally { this.endStack.pop(); }
      const mv = asMat(v);
      if (mv.isBool) {
        const idx: IdxList = [];
        for (let k = 0; k < mv.data.length; k++) if (mv.data[k] !== 0) idx.push(k + 1);
        idx.srcRows = mv.rows; idx.srcCols = mv.cols; idx.srcLogical = true;
        subs.push(idx);
      } else {
        const idx: IdxList = toArray(mv).map((x) => { if (!Number.isInteger(x) || x < 1) throw new MatError('Array indices must be positive integers or logical values.'); return x; });
        idx.srcRows = mv.rows; idx.srcCols = mv.cols; idx.srcLogical = false;
        subs.push(idx);
      }
    }
    return subs;
  }

  /** Like cellLinear, but for READ paths: rejects indices past the end (MATLAB grows
   *  only on assignment, so this guard must not be used on the write paths). */
  private cellLinearRead(subs: Sub[], rows: number, cols: number, total: number): number[] {
    const lin = this.cellLinear(subs, rows, cols, total);
    for (const i of lin) if (i > total) throw new MatError(`Index exceeds the number of array elements. Index must not exceed ${total}.`);
    return lin;
  }

  /** Linear 1-based indices selected from a cell/struct by subscripts. */
  private cellLinear(subs: Sub[], rows: number, cols: number, total: number): number[] {
    if (subs.length === 1) { const s = subs[0]; return s === 'colon' ? Array.from({ length: total }, (_, i) => i + 1) : s; }
    const rs = subs[0] === 'colon' ? Array.from({ length: rows }, (_, i) => i + 1) : subs[0];
    const cs = subs[1] === 'colon' ? Array.from({ length: cols }, (_, i) => i + 1) : subs[1];
    const out: number[] = []; for (const c of cs) for (const r of rs) out.push((c - 1) * rows + r);
    return out;
  }

  /** Content extraction `c{...}` → the selected values (a comma-separated list). */
  private async evalCellContent(target: Expr, args: Expr[], scope: Scope): Promise<Value[]> {
    const base = target.t === 'ident' && scope.vars.has(target.name) ? scope.vars.get(target.name)! : await this.evalExpr(target, scope);
    if (!isCell(base)) throw new MatError("'{}' indexing requires a cell array");
    const subs = await this.evalSubsN(args, base.rows, base.cols, base.items.length, scope);
    return this.cellLinear(subs, base.rows, base.cols, base.items.length).map((i) => {
      if (i < 1 || i > base.items.length) throw new MatError(`cell index ${i} out of bounds`);
      return base.items[i - 1];
    });
  }

  // ── Expressions ────────────────────────────────────────────────────
  async evalExpr(e: Expr, scope: Scope): Promise<Value> {
    const vs = await this.evalValues(e, scope, 1);
    if (!vs.length) throw new MatError('expression produced no value');
    return vs[0];
  }

  private async evalValues(e: Expr, scope: Scope, nargout: number): Promise<Value[]> {
    switch (e.t) {
      case 'num': return [e.imag ? cscalar(0, e.v) : scalar(e.v)];
      case 'str': return [str(e.v)];
      case 'string': return [makeStr(e.v)];
      case 'end': {
        if (!this.endStack.length) throw new MatError("'end' used outside an index");
        return [scalar(this.endStack[this.endStack.length - 1])];
      }
      case 'colon': throw new MatError("':' used outside an index");
      case 'ident': {
        if (scope.vars.has(e.name)) return [scope.vars.get(e.name)!];
        return this.resolveCall(e.name, [], nargout);
      }
      case 'range': {
        // MATLAB's colon uses the first element of a non-scalar bound (`1:size(A)` → 1:size(A,1));
        // an empty bound makes the range empty.
        const fm = asMat(await this.evalExpr(e.from, scope)), tm = asMat(await this.evalExpr(e.to, scope));
        const sm = e.step ? asMat(await this.evalExpr(e.step, scope)) : null;
        if (numel(fm) === 0 || numel(tm) === 0 || (sm && numel(sm) === 0)) return [zeros(1, 0)];
        return [makeRange(fm.data[0], sm ? sm.data[0] : 1, tm.data[0])];
      }
      case 'unary': {
        const raw = await this.evalExpr(e.e, scope);
        if (isSym(raw)) {   // symbolic unary: keep it symbolic
          if (e.op === '+') return [raw];
          if (e.op === '-') return [makeSym(raw.rows, raw.cols, raw.exprs.map((x) => simplifyExpr(sMul(sN(-1), x))))];
          return [makeSym(raw.rows, raw.cols, raw.exprs.map((x) => simplifyExpr(sFn('not', x))))];
        }
        if (raw.kind === 'object' && (e.op === '-' || e.op === '+')) {   // class uminus/uplus overload (e.g. -sys)
          if (e.op === '+') return [raw];
          const meth = lookupMethod(raw.className, 'uminus');
          if (meth) { const r = await meth([raw], 1, this); return [Array.isArray(r) ? r[0] : r]; }
        }
        const v = asMat(raw);
        if (e.op === '-') { const neg = isComplex(v) ? cmap(v, (re, im) => [-re, -im]) : map(v, (x) => -x); return [v.itype ? applyClass(neg, v.itype) : neg]; }
        if (e.op === '+') return [v];
        return [{ ...map(v, (x) => (x === 0 ? 1 : 0)), isBool: true, idata: undefined }];
      }
      case 'postfix': {
        const raw = await this.evalExpr(e.e, scope);
        // Transpose of a cell or string array rearranges elements (no conjugation).
        if (isCell(raw)) { const R = raw.rows, C = raw.cols, it = new Array(R * C); for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) it[c + r * C] = raw.items[r + c * R]; return [makeCell(C, R, it)]; }
        if (isStr(raw)) { const R = raw.rows, C = raw.cols, it = new Array(R * C); for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) it[c + r * C] = raw.items[r + c * R]; return [makeStrArr(C, R, it)]; }
        if (raw.kind === 'object') {   // class ctranspose/transpose overload (e.g. sys')
          const meth = lookupMethod(raw.className, e.op === "'" ? 'ctranspose' : 'transpose');
          if (meth) { const r = await meth([raw], 1, this); return [Array.isArray(r) ? r[0] : r]; }
        }
        const v = asMat(raw);
        return [e.op === "'" ? ctranspose(v) : transpose(v)];
      }
      case 'binary': return [await this.evalBinary(e.op, e.a, e.b, scope)];
      case 'matrix': return [await this.evalMatrix(e.rows, scope)];
      case 'celllit': return [await this.evalCellLit(e.rows, scope)];
      case 'anon': return [this.makeAnon(e.params, e.body, scope, e.src)];
      case 'handle': return [this.makeHandle(e.name)];
      case 'field': {
        const t = await this.evalExpr(e.target, scope);
        if (t.kind === 'gobj') return [gobjProperty(e.name)];
        if (isStruct(t)) { const vals = t.fields.get(e.name); if (!vals) throw new MatError(`reference to non-existent field '${e.name}'`); return vals.length ? vals : []; }
        if (isMap(t)) { if (e.name === 'Count') return [scalar(t.store.size)]; if (e.name === 'KeyType') return [makeStr(t.keyKind)]; if (e.name === 'ValueType') return [makeStr(t.valType)]; throw new MatError(`No appropriate method, property, or field '${e.name}' for class 'containers.Map'.`); }
        if (t.kind === 'graph') return [graphProperty(t, e.name)];
        if (t.kind === 'geom') return [geomProperty(t, e.name)];
        if (t.kind === 'quantum') return [quantumProperty(t, e.name)];
        if (t.kind === 'object') { const p = t.props.get(e.name); if (p === undefined) throw new MatError(`No appropriate method, property, or field '${e.name}' for class '${t.className}'.`); return [p]; }
        if (t.kind === 'temporal') return [temporalProperty(t, e.name)];
        if (t.kind === 'table') { const i = t.vars.indexOf(e.name); if (i >= 0) return [t.cols[i]]; if (e.name === 'Properties') return [scalar(0)]; if (t.isTimetable && (e.name === 'Time' || e.name === t.rowDimName) && t.rowTimes) return [t.rowTimes]; throw new MatError(`unrecognized table variable '${e.name}'`); }
        throw new MatError(`cannot read field '.${e.name}'`);
      }
      case 'cell': return this.evalCellContent(e.target, e.args, scope);
      case 'index': return this.evalIndexOrCall(e, scope, nargout);
    }
  }

  private async evalIndexOrCall(e: Expr & { t: 'index' }, scope: Scope, nargout: number): Promise<Value[]> {
    const target = e.target;
    if (target.t === 'ident' && !scope.vars.has(target.name)) {
      // function / builtin / constant call
      const args = await this.evalArgs(e.args, scope);
      return this.resolveCall(target.name, args, nargout);
    }
    // fully-qualified toolbox call, e.g. phased.steervec(...) — addresses a specific owner,
    // bypassing the default precedence pick (MATLAB package-namespace form). Always unambiguous.
    if (target.t === 'field' && target.target.t === 'ident' && !scope.vars.has(target.target.name)) {
      const tb = TOOLBOX_BY_ID.get(target.target.name);
      if (tb && target.name in tb.builtins) { const args = await this.evalArgs(e.args, scope); return tb.builtins[target.name](args, nargout, this); }
    }
    // namespaced builtin call, e.g. containers.Map(...)
    if (target.t === 'field' && target.target.t === 'ident' && !scope.vars.has(target.target.name)) {
      const dotted = `${target.target.name}.${target.name}`;
      if (this.hasCallable(dotted)) { const args = await this.evalArgs(e.args, scope); return this.resolveCall(dotted, args, nargout); }
    }
    // subscript a value (variable or sub-expression)
    const base = await this.evalExpr(target, scope);
    if (isMap(base) || isDict(base)) {
      // m(key)/d(key) → stored value
      const args = await this.evalArgs(e.args, scope); const key = mapNormKey(base, args[0]);
      if (!base.store.has(key)) throw new MatError(`The specified key is not present in this container.`);
      return [base.store.get(key)!];
    }
    if (isHandle(base)) {
      const args = await this.evalArgs(e.args, scope);
      return this.callHandle(base, args, nargout);
    }
    if (base.kind === 'gobj') {
      // h(i) on a graphics handle (or handle array) → another handle of the same kind.
      await this.evalArgs(e.args, scope);
      return [{ kind: 'gobj', gtype: base.gtype }];
    }
    if (isCell(base)) {
      // c(...) → a sub-cell
      const subs = await this.evalSubsN(e.args, base.rows, base.cols, base.items.length, scope);
      const lin = this.cellLinearRead(subs, base.rows, base.cols, base.items.length);
      const items = lin.map((i) => base.items[i - 1]);
      const r = subs.length === 2 && subs[0] !== 'colon' ? (subs[0] as number[]).length : (base.cols === 1 ? items.length : 1);
      const c = items.length / (r || 1);
      return [makeCell(r, c, items)];
    }
    if (isStr(base)) {
      // s(...) → a sub-string-array (same column-major linear-index logic as cells)
      const subs = await this.evalSubsN(e.args, base.rows, base.cols, base.items.length, scope);
      const lin = this.cellLinearRead(subs, base.rows, base.cols, base.items.length);
      const items = lin.map((i) => base.items[i - 1]);
      const r = subs.length === 2 && subs[0] !== 'colon' ? (subs[0] as number[]).length : (base.cols === 1 ? items.length : 1);
      return [makeStrArr(r, items.length / (r || 1), items)];
    }
    if (isSym(base) && base.fnArgs && e.args.length === base.fnArgs.length) {
      // symbolic-function application y(expr) → substitute the formal args (e.g. IC y(0))
      const argVals = await this.evalArgs(e.args, scope);
      let exprs = base.exprs;
      base.fnArgs.forEach((fa, i) => { const av = argVals[i]; const repl = isSym(av) ? (av as Sym).exprs[0] : sN(asScalar(asMat(av))); exprs = exprs.map((ex) => subsExpr(ex, fa, repl)); });
      return [makeSym(base.rows, base.cols, exprs.map(simplifyExpr))];
    }
    if (isSym(base)) {
      // S(...) → a sub-sym (column-major linear-index logic, like cells)
      const subs = await this.evalSubsN(e.args, base.rows, base.cols, base.exprs.length, scope);
      const lin = this.cellLinearRead(subs, base.rows, base.cols, base.exprs.length);
      const exprs = lin.map((i) => base.exprs[i - 1]);
      const r = subs.length === 2 && subs[0] !== 'colon' ? (subs[0] as number[]).length : (base.cols === 1 ? exprs.length : 1);
      return [makeSym(r, exprs.length / (r || 1), exprs)];
    }
    if (base.kind === 'categorical') {
      // C(...) → a sub-categorical (same column-major linear-index logic), preserving categories.
      const subs = await this.evalSubsN(e.args, base.rows, base.cols, base.codes.length, scope);
      const lin = this.cellLinearRead(subs, base.rows, base.cols, base.codes.length);
      const codes = Int32Array.from(lin, (i) => base.codes[i - 1]);
      const r = subs.length === 2 && subs[0] !== 'colon' ? (subs[0] as number[]).length : (base.cols === 1 ? codes.length : 1);
      return [makeCategorical(r, codes.length / (r || 1), codes, base.categories, base.ordinal)];
    }
    if (isStruct(base)) {
      // S(...) on a struct array → a sub-struct-array (same column-major linear-index logic as cells)
      const total = base.rows * base.cols;
      const subs = await this.evalSubsN(e.args, base.rows, base.cols, total, scope);
      const lin = this.cellLinearRead(subs, base.rows, base.cols, total);
      const fields = new Map<string, Value[]>();
      for (const [k, vals] of base.fields) fields.set(k, lin.map((i) => vals[i - 1]));
      const r = subs.length === 2 && subs[0] !== 'colon' ? (subs[0] as number[]).length : (base.cols === 1 ? lin.length : 1);
      return [{ kind: 'struct', rows: r, cols: lin.length / (r || 1), fields } as StructV];
    }
    const mbase = asMat(base);
    const subs = await this.evalSubs(e.args, mbase, scope);
    return [indexGet(mbase, subs)];
  }

  private async evalCellLit(rows: Expr[][], scope: Scope): Promise<Cell> {
    if (rows.length === 0) return makeCell(0, 0, []);
    const nr = rows.length, nc = rows[0].length;
    const items: Value[] = new Array(nr * nc);
    for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) items[r + c * nr] = await this.evalExpr(rows[r][c], scope);
    return makeCell(nr, nc, items);
  }

  private async evalArgs(args: Expr[], scope: Scope): Promise<Value[]> {
    const out: Value[] = [];
    for (const a of args) {
      if (a.t === 'colon') throw new MatError("':' is not a valid function argument here");
      // `c{...}` expands to a comma-separated list of arguments.
      if (a.t === 'cell') { out.push(...(await this.evalCellContent(a.target, a.args, scope))); continue; }
      out.push(await this.evalExpr(a, scope));
    }
    return out;
  }

  private async resolveCall(name: string, args: Value[], nargout: number): Promise<Value[]> {
    const def = this.funcs.get(name);
    if (def) return this.callUserFunc(def, args, nargout);
    // syms a b c → create symbolic variables in the base workspace
    if (name === 'syms') {
      for (const arg of args) {
        let nm = ''; try { nm = asString(arg); } catch { nm = ''; }
        const fn = nm.match(/^([A-Za-z]\w*)\(([A-Za-z]\w*(?:,[A-Za-z]\w*)*)\)$/);
        if (fn) { const fa = fn[2].split(','); const s = makeSym(1, 1, [sFn(fn[1], ...fa.map((v) => sV(v)))]); s.fnArgs = fa; this.base.vars.set(fn[1], s); for (const v of fa) if (!this.base.vars.has(v)) this.base.vars.set(v, makeSym(1, 1, [sV(v)])); }   // symfun y(t) also creates t
        else if (/^[A-Za-z]\w*$/.test(nm)) this.base.vars.set(nm, makeSym(1, 1, [sV(nm)]));
      }
      return [];
    }
    // symbolic overload of elementary functions: f(sym) → sFn(f, …)
    if (args.length === 1 && isSym(args[0]) && SYM_ELEMENTARY.has(name)) { const s = args[0]; return [makeSym(s.rows, s.cols, s.exprs.map((e) => simplifyExpr(sFn(name, e))))]; }
    // OOP method dispatch: a call whose first argument is a class instance routes to that class's
    // overload (if any), so e.g. `series(tf,…)` → Control while `series(sym,…)` → Symbolic.
    if (args.length > 0 && METHOD_NAMES.has(name)) {
      const a0 = args[0]; const cls = a0.kind === 'object' ? a0.className : a0.kind === 'sym' ? 'sym' : a0.kind === 'graph' ? (a0.directed ? 'digraph' : 'graph') : a0.kind === 'geom' ? a0.gkind : undefined;
      const meth = cls ? lookupMethod(cls, name) : undefined;
      if (meth) return meth(args, nargout, this);
    }
    // Active-scope toolbox override (useToolbox): only for toolbox-owned names that base did
    // NOT shadow (base builtins stay protected — BUILTINS[name] === TOOLBOX_BUILTINS[name]
    // means the default pick is a toolbox function, so reordering is safe).
    if (this.activeToolboxPriority.length && NAME_OWNERS.has(name) && BUILTINS[name] === TOOLBOX_BUILTINS[name]) {
      const owners = NAME_OWNERS.get(name)!;
      for (const id of this.activeToolboxPriority) {
        if (owners.includes(id)) { const fn = TOOLBOX_BY_ID.get(id)!.builtins[name]; if (fn) return fn(args, nargout, this); }
      }
    }
    if (name in BUILTINS) return BUILTINS[name](args, nargout, this);
    if (args.length === 0 && name in CONSTANTS) return [CONSTANTS[name]()];
    throw new MatError(`undefined function or variable '${name}'`);
  }

  private async callUserFunc(def: FuncDef, args: Value[], nargout: number): Promise<Value[]> {
    const scope = new Scope();
    scope.nargin = args.length;
    scope.nargout = nargout;
    for (let i = 0; i < def.params.length; i++) {
      if (def.params[i] === '~') continue;
      // Pass-by-value: clone so a function that does `v(i)=…` can't mutate the caller's array.
      if (i < args.length) scope.vars.set(def.params[i], cloneForSave(args[i]));
    }
    scope.vars.set('nargin', scalar(args.length));
    scope.vars.set('nargout', scalar(nargout));
    const prevFuncScope = this.funcScope;
    this.funcScope = scope;
    try { await this.runStmts(def.body, scope); }
    catch (err) { if (!(err instanceof ReturnSignal)) throw err; }
    finally { this.funcScope = prevFuncScope; }
    const results: Value[] = [];
    for (const o of def.outputs) {
      if (o === '~') { results.push(scalar(0)); continue; }
      if (scope.vars.has(o)) results.push(scope.vars.get(o)!);
      else break;
    }
    return results;
  }

  makeHandle(name: string): Handle {
    return { kind: 'handle', name, call: (args, nargout) => this.resolveCall(name, args, nargout) };
  }
  private makeAnon(params: string[], body: Expr, scope: Scope, src?: string): Handle {
    const snapshot = new Map(scope.vars);
    return {
      kind: 'handle', name: 'anonymous', src,
      call: async (args, nargout) => {
        const s = new Scope();
        s.vars = new Map(snapshot);
        s.nargin = args.length; s.nargout = nargout;
        for (let i = 0; i < params.length; i++) if (params[i] !== '~' && i < args.length) s.vars.set(params[i], cloneForSave(args[i]));
        // propagate nargout so `@(...) deal(...)` / multi-output calls work
        return nargout > 1 ? this.evalValues(body, s, nargout) : [await this.evalExpr(body, s)];
      },
    };
  }

  private async evalMatrix(rows: Expr[][], scope: Scope): Promise<Value> {
    if (rows.length === 0) return empty();
    const grid: Value[][] = []; let anyStr = false;
    for (const row of rows) {
      const vals: Value[] = [];
      for (const el of row) {
        if (el.t === 'cell') { for (const v of await this.evalCellContent(el.target, el.args, scope)) vals.push(v); continue; }
        vals.push(await this.evalExpr(el, scope));
      }
      for (const v of vals) if (isStr(v)) anyStr = true;
      grid.push(vals);
    }
    // A matrix-literal of quantum gates → a gate list (cell) for quantumCircuit.
    const flat = grid.flat();
    if (flat.length && flat.some((v) => v.kind === 'quantum')) return { kind: 'cell', rows: 1, cols: flat.length, items: flat };
    // A matrix-literal containing symbolic entries → a Sym array.
    if (flat.some(isSym)) {
      const nr = grid.length, nc = grid[0].length; const exprs: SymExpr[] = new Array(nr * nc);
      for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) { const v = grid[r][c]; exprs[r + c * nr] = isSym(v) ? v.exprs[0] : sN(asMat(v).data[0]); }
      return makeSym(nr, nc, exprs);
    }
    if (anyStr) return buildStrMatrix(grid);
    const rowMats: Mat[] = [];
    for (const vals of grid) { const parts = vals.map(asMat); rowMats.push(parts.length === 0 ? empty() : parts.length === 1 ? parts[0] : horzcat(parts)); }
    return rowMats.length === 1 ? rowMats[0] : vertcat(rowMats);
  }

  private async evalBinary(op: string, ae: Expr, be: Expr, scope: Scope): Promise<Value> {
    if (op === '&&') return bool(truthy(await this.evalExpr(ae, scope)) && truthy(await this.evalExpr(be, scope)));
    if (op === '||') return bool(truthy(await this.evalExpr(ae, scope)) || truthy(await this.evalExpr(be, scope)));
    const av = await this.evalExpr(ae, scope), bv = await this.evalExpr(be, scope);
    // Class-object operator overloading (e.g. LTI models: sys1*sys2, sys+sys, sys/sys): route to
    // the class's mtimes/plus/minus/mrdivide/mldivide/mpower/times/rdivide method if registered.
    if (av.kind === 'object' || bv.kind === 'object') {
      if (op === '\\' && av.kind === 'object' && av.className === 'decomposition') return decompositionSolve(av, asMat(bv));
      if (op === '/' && bv.kind === 'object' && bv.className === 'decomposition') return decompositionRightSolve(asMat(av), bv);
      const mname = OBJ_BINOP[op];
      if (mname) {
        const cls = av.kind === 'object' ? av.className : (bv as { className: string }).className;
        const meth = lookupMethod(cls, mname);
        if (meth) { const r = await meth([av, bv], 1, this); return Array.isArray(r) ? r[0] : r; }
      }
    }
    // symbolic arithmetic (build expression trees element-wise).
    if (isSym(av) || isSym(bv)) return symBinary(op, av, bv);
    // datetime/duration arithmetic and comparison.
    if (isTemporal(av) || isTemporal(bv)) return temporalBinary(op, av, bv);
    // String-class operators: `+` concatenates, `==`/`~=` compare element-wise.
    if ((av.kind === 'categorical' || bv.kind === 'categorical') && ['==', '~=', '<', '>', '<=', '>='].includes(op)) return categoricalBinary(op, av, bv);
    if ((op === '+' || op === '==' || op === '~=') && (isStr(av) || isStr(bv))) return strBinary(op, av, bv);
    if (op === '\\' && av.kind === 'sparse') {
      const A = sparseToDense(av);
      const b = asMat(bv);
      const r = mldivide(A, b);
      this.output('Warning: Sparse matrix left division is using a full dense fallback; sparse direct solver routing is not implemented.\n');
      const w = illConditionWarning(A) ?? qrRankWarning(A);
      if (w) this.output('Warning: ' + w + '\n');
      return r;
    }
    const a = asMat(av);
    const b = asMat(bv);
    // integer/single class propagates through arithmetic (saturating); comparisons → logical.
    const cls = (a.itype || b.itype) ? pickClass(a, b) : undefined;
    let r: Mat; let arith = true;
    switch (op) {
      case '+': r = ewAdd(a, b); break;
      case '-': r = ewSub(a, b); break;
      case '.*': r = ewMul(a, b); break;
      case './': r = ewRDiv(a, b); break;
      case '.\\': r = ewLDiv(a, b); break;
      case '.^': r = ewPow(a, b); break;
      case '*': r = cmatmul(a, b); break;
      case '/': r = rdivide(a, b); break;
      case '\\': { r = mldivide(a, b); const w = isMat(a) ? (illConditionWarning(a) ?? qrRankWarning(a)) : null; if (w) this.output('Warning: ' + w + '\n'); break; }
      case '^': {
        if (isMat(a) && isMat(b) && b.rows === 1 && b.cols === 1 && b.data[0] < 0) {
          const w = illConditionWarning(a);
          if (w) this.output('Warning: ' + w + '\n');
        }
        r = mpower(a, b);
        break;
      }
      case '==': r = ewEq(a, b, true); arith = false; break;
      case '~=': r = ewEq(a, b, false); arith = false; break;
      case '<': r = cmp(a, b, (x, y) => x < y); arith = false; break;
      case '>': r = cmp(a, b, (x, y) => x > y); arith = false; break;
      case '<=': r = cmp(a, b, (x, y) => x <= y); arith = false; break;
      case '>=': r = cmp(a, b, (x, y) => x >= y); arith = false; break;
      case '&': r = cmp(a, b, (x, y) => x !== 0 && y !== 0); arith = false; break;
      case '|': r = cmp(a, b, (x, y) => x !== 0 || y !== 0); arith = false; break;
      default: throw new MatError(`unknown operator '${op}'`);
    }
    return cls && arith ? applyClass(r, cls) : r;
  }
}

// ── Operator helpers ─────────────────────────────────────────────────
function cmp(a: Mat, b: Mat, f: (x: number, y: number) => boolean): Mat {
  return { ...elementwise(a, b, (x, y) => (f(x, y) ? 1 : 0)), isBool: true };
}
function rdivide(a: Mat, b: Mat): Mat {
  if (b.rows === 1 && b.cols === 1) return ewRDiv(a, b);
  // A / B = (B' \ A')'
  return ctranspose(mldivide(ctranspose(b), ctranspose(a)));
}
function mpower(a: Mat, b: Mat): Mat {
  if (a.rows === 1 && a.cols === 1 && b.rows === 1 && b.cols === 1) return ewPow(a, b);
  if (b.rows === 1 && b.cols === 1) {
    const praw = b.data[0];
    if (Math.abs(praw - Math.round(praw)) > 1e-9) throw new MatError('^: non-integer matrix powers are not supported (use sqrtm/eig for matrix roots)');
    let p = Math.round(praw);
    if (a.rows !== a.cols) throw new MatError('^: matrix must be square');
    if (p < 0) { return mpower(inv(a), scalar(-p)); }
    let acc = identity(a.rows); let base = a;
    while (p > 0) { if (p & 1) acc = cmatmul(acc, base); base = cmatmul(base, base); p >>= 1; }
    return acc;
  }
  throw new MatError('^: unsupported operands');
}
function identity(n: number): Mat {
  const o = zeros(n, n); for (let i = 0; i < n; i++) o.data[i + i * n] = 1; return o;
}
/** Build a string array from a literal `["a","b"; ...]` (horzcat rows, then vertcat). */
function buildStrMatrix(grid: Value[][]): Str {
  const blocks = grid.map((vals) => {
    const parts = vals.map(toStrArr);
    if (parts.length === 0) return makeStrArr(0, 0, []);
    let items: string[] = [], cols = 0; const r = parts[0].rows;
    for (const p of parts) { items = items.concat(p.items); cols += p.cols; }
    return makeStrArr(r, cols, items);
  });
  if (blocks.length === 1) return blocks[0];
  const cols = blocks[0].cols; let R = 0; for (const b of blocks) R += b.rows;
  const out = new Array<string>(R * cols); let off = 0;
  for (const b of blocks) { for (let c = 0; c < cols; c++) for (let r = 0; r < b.rows; r++) out[(off + r) + c * R] = b.items[r + c * b.rows]; off += b.rows; }
  return makeStrArr(R, cols, out);
}
/** Coerce a value to a string array (char→1×1 text, numeric→element-wise num2str). */
function toStrArr(v: Value): Str {
  if (isStr(v)) return v;
  if (isMat(v) && v.isChar) return makeStr(asString(v));
  if (isMat(v)) { const fmt = (x: number) => (Number.isInteger(x) ? String(x) : String(+x.toPrecision(5))); return makeStrArr(v.rows, v.cols, Array.from(v.data, fmt)); }
  return makeStr(String(v));
}
/** `+` (concat), `==`/`~=` (element-wise compare) for the string class. */
/** Element-wise comparison of a categorical array: == / ~= by label, ordinal </> by category order. */
function categoricalBinary(op: string, av: Value, bv: Value): Value {
  const cat = (av.kind === 'categorical' ? av : bv) as Categorical;
  const other = av === cat ? bv : av;
  const labelsOf = (v: Value): string[] => {
    if (v.kind === 'categorical') return Array.from(v.codes, (c) => (c ? v.categories[c - 1] : '<undefined>'));
    if (isStr(v)) return v.items.slice();
    if (isMat(v) && v.isChar) return [asString(v)];
    return toArray(asMat(v)).map((x) => String(x));
  };
  const ol = labelsOf(other);
  const out = zeros(cat.rows, cat.cols); out.isBool = true;
  const idxOf = new Map(cat.categories.map((c, i) => [c, i + 1]));
  for (let i = 0; i < cat.codes.length; i++) {
    const code = cat.codes[i];
    const myLabel = code ? cat.categories[code - 1] : '<undefined>';
    const o = ol.length === 1 ? ol[0] : ol[i];
    let res: boolean;
    if (op === '==' || op === '~=') { res = myLabel === o; if (op === '~=') res = !res; }
    else { const oi = idxOf.get(o) ?? 0; res = op === '<' ? code < oi : op === '>' ? code > oi : op === '<=' ? code <= oi : code >= oi; }
    out.data[i] = res ? 1 : 0;
  }
  return out;
}
function strBinary(op: string, av: Value, bv: Value): Value {
  const a = toStrArr(av), b = toStrArr(bv);
  const scalarA = a.rows * a.cols === 1, scalarB = b.rows * b.cols === 1;
  const rows = scalarA ? b.rows : a.rows, cols = scalarA ? b.cols : a.cols;
  if (!scalarA && !scalarB && (a.rows !== b.rows || a.cols !== b.cols)) throw new MatError('string operands must match in size');
  const n = rows * cols; const get = (s: Str, i: number) => (s.rows * s.cols === 1 ? s.items[0] : s.items[i]);
  if (op === '+') { const items = new Array<string>(n); for (let i = 0; i < n; i++) items[i] = get(a, i) + get(b, i); return makeStrArr(rows, cols, items); }
  const out: Mat = { kind: 'num', rows, cols, data: new Float64Array(n), isBool: true };
  for (let i = 0; i < n; i++) out.data[i] = (get(a, i) === get(b, i)) === (op === '==') ? 1 : 0;
  return out;
}

function asMat(v: Value): Mat {
  if (isMat(v)) return v;
  if (v.kind === 'sparse') return sparseToDense(v);   // sparse densifies on arithmetic/indexing
  if (v.kind === 'gobj') throw new MatError('expected a numeric value, got a graphics handle');
  if (v.kind === 'graph') throw new MatError('expected a numeric value, got a graph (use adjacency(G) etc.)');
  if (v.kind === 'geom') throw new MatError(`expected a numeric value, got a ${v.gkind}`);
  if (v.kind === 'quantum') throw new MatError(`expected a numeric value, got a quantum ${v.qkind}`);
  if (v.kind === 'temporal') return { kind: 'num', rows: v.rows, cols: v.cols, data: new Float64Array(v.data) };  // datetime→datenum, duration→days
  if (v.kind === 'table') throw new MatError('expected a numeric value, got a table (use table2array)');
  if (v.kind === 'categorical') { const out = new Float64Array(v.codes.length); for (let i = 0; i < v.codes.length; i++) out[i] = v.codes[i] || NaN; return { kind: 'num', rows: v.rows, cols: v.cols, data: out }; }
  if (v.kind === 'sym') { const out = new Float64Array(v.exprs.length); for (let i = 0; i < v.exprs.length; i++) out[i] = symEvalNum(v.exprs[i]); return { kind: 'num', rows: v.rows, cols: v.cols, data: out }; }
  throw new MatError('expected a numeric value, got a function handle');
}
/** Coerce a value to a per-element array of symbolic expressions + its shape. */
function toSymArr(v: Value): { rows: number; cols: number; exprs: SymExpr[] } {
  if (isSym(v)) return { rows: v.rows, cols: v.cols, exprs: v.exprs };
  const M = asMatLoose(v); return { rows: M.rows, cols: M.cols, exprs: Array.from(M.data, (x) => sN(x)) };
}
function asMatLoose(v: Value): Mat { if (isMat(v)) return v; if (v.kind === 'sparse') return sparseToDense(v); throw new MatError('expected a numeric or symbolic value'); }
function symEvalNum(e: SymExpr): number { return evalExpr(e, new Map()); }
/** Element-wise symbolic arithmetic / comparison → a Sym (== builds lhs−rhs for solve). */
function symBinary(op: string, a: Value, b: Value): Value {
  const A = toSymArr(a), B = toSymArr(b);
  const scalarA = A.exprs.length === 1, scalarB = B.exprs.length === 1;
  const rows = scalarA ? B.rows : A.rows, cols = scalarA ? B.cols : A.cols; const nm = Math.max(A.exprs.length, B.exprs.length);
  const combine = (x: SymExpr, y: SymExpr): SymExpr => {
    switch (op) {
      case '+': return sAdd(x, y);
      case '-': return sSub(x, y);
      case '*': case '.*': return sMul(x, y);
      case '/': case './': return sDiv(x, y);
      case '^': case '.^': return sPow(x, y);
      case '==': return sSub(x, y); case '~=': return sSub(x, y);
      case '<': return sFn('lt', x, y); case '>': return sFn('gt', x, y); case '<=': return sFn('le', x, y); case '>=': return sFn('ge', x, y);
      default: throw new MatError(`operator '${op}' is not supported for symbolic operands`);
    }
  };
  // matrix multiply (non-element-wise *) of symbolic matrices
  if (op === '*' && !scalarA && !scalarB) {
    if (A.cols !== B.rows) throw new MatError('symbolic matrix dimensions must agree');
    const out: SymExpr[] = new Array(A.rows * B.cols);
    for (let i = 0; i < A.rows; i++) for (let j = 0; j < B.cols; j++) { let acc: SymExpr = sN(0); for (let k = 0; k < A.cols; k++) acc = sAdd(acc, sMul(A.exprs[i + k * A.rows], B.exprs[k + j * B.rows])); out[i + j * A.rows] = simplifyExpr(acc); }
    return makeSym(A.rows, B.cols, out);
  }
  const exprs: SymExpr[] = new Array(nm);
  for (let i = 0; i < nm; i++) exprs[i] = simplifyExpr(combine(A.exprs[scalarA ? 0 : i], B.exprs[scalarB ? 0 : i]));
  return makeSym(rows, cols, exprs);
}
/** datetime / duration arithmetic and comparison. */
function temporalBinary(op: string, a: Value, b: Value): Value {
  const A = isTemporal(a) ? a : null, B = isTemporal(b) ? b : null;
  const bcast = (xd: Float64Array, yd: Float64Array, fn: (x: number, y: number) => number): Float64Array => {
    const n = Math.max(xd.length, yd.length); const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = fn(xd.length === 1 ? xd[0] : xd[i], yd.length === 1 ? yd[0] : yd[i]);
    return out;
  };
  const dimsT = (X: Temporal, Y: Temporal) => (numelOf(X) >= numelOf(Y) ? X : Y);
  const mk = (kind: 'datetime' | 'duration', X: Temporal, Y: Temporal, fn: (x: number, y: number) => number, fmt?: string): Temporal => { const d = dimsT(X, Y); return makeTemporal(kind, d.rows, d.cols, bcast(X.data, Y.data, fn), fmt ?? (kind === 'datetime' ? X.fmt : undefined)); };
  const cmp = (X: Temporal, Y: Temporal, fn: (x: number, y: number) => boolean): Mat => { const d = dimsT(X, Y); const out = bcast(X.data, Y.data, (x, y) => (fn(x, y) ? 1 : 0)); return { kind: 'num', rows: d.rows, cols: d.cols, data: out, isBool: true }; };
  const cmpFn: Record<string, (x: number, y: number) => boolean> = { '==': (x, y) => x === y, '~=': (x, y) => x !== y, '<': (x, y) => x < y, '>': (x, y) => x > y, '<=': (x, y) => x <= y, '>=': (x, y) => x >= y };
  if (A && B) {
    if (op in cmpFn) return cmp(A, B, cmpFn[op]);
    if (op === '-') {
      if (A.tkind === 'datetime' && B.tkind === 'datetime') return mk('duration', A, B, (x, y) => x - y);
      if (A.tkind === 'duration' && B.tkind === 'duration') return mk('duration', A, B, (x, y) => x - y);
      if (A.tkind === 'datetime' && B.tkind === 'duration') return mk('datetime', A, B, (x, y) => x - y);
    }
    if (op === '+') {
      if (A.tkind === 'duration' && B.tkind === 'duration') return mk('duration', A, B, (x, y) => x + y);
      if (A.tkind === 'datetime' && B.tkind === 'duration') return mk('datetime', A, B, (x, y) => x + y);
      if (A.tkind === 'duration' && B.tkind === 'datetime') return mk('datetime', B, A, (x, y) => x + y);
    }
    if ((op === '/' || op === './') && A.tkind === 'duration' && B.tkind === 'duration') { const d = dimsT(A, B); return { kind: 'num', rows: d.rows, cols: d.cols, data: bcast(A.data, B.data, (x, y) => x / y) }; }
  }
  const scalarMat = (v: Value) => { const mm = asMat(v); return mm.data; };
  if (A && B === null && A.tkind === 'duration') { const s = scalarMat(b); if (op === '*' || op === '.*') return makeTemporal('duration', A.rows, A.cols, bcast(A.data, s, (x, k) => x * k), A.fmt); if (op === '/' || op === './') return makeTemporal('duration', A.rows, A.cols, bcast(A.data, s, (x, k) => x / k), A.fmt); }
  if (B && A === null && B.tkind === 'duration' && (op === '*' || op === '.*')) { const s = scalarMat(a); return makeTemporal('duration', B.rows, B.cols, bcast(B.data, s, (x, k) => x * k), B.fmt); }
  throw new MatError(`operator '${op}' is not supported for ${A ? A.tkind : 'numeric'} and ${B ? B.tkind : 'numeric'} operands`);
}
/** Read a quantum-object property via dot syntax (c.NumQubits, g.Type, …). */
function temporalProperty(t: Temporal, name: string): Value {
  const low = name.toLowerCase();
  const comp = (f: (d: Date) => number): Mat => { const o = zeros(t.rows, t.cols); for (let i = 0; i < t.data.length; i++) { if (Number.isNaN(t.data[i])) { o.data[i] = NaN; continue; } o.data[i] = f(new Date(Math.round((t.data[i] - 719529) * 86400000))); } return o; };
  if (t.tkind === 'datetime') {
    if (low === 'year') return comp((d) => d.getUTCFullYear());
    if (low === 'month') return comp((d) => d.getUTCMonth() + 1);
    if (low === 'day') return comp((d) => d.getUTCDate());
    if (low === 'hour') return comp((d) => d.getUTCHours());
    if (low === 'minute') return comp((d) => d.getUTCMinutes());
    if (low === 'second') return comp((d) => d.getUTCSeconds() + d.getUTCMilliseconds() / 1000);
  }
  if (low === 'format') return makeStr('default');
  if (low === 'timezone') return makeStr('');
  throw new MatError(`unrecognized property '${name}' for a ${t.tkind}`);
}
function quantumProperty(q: Quantum, name: string): Value {
  const low = name.toLowerCase();
  if (low === 'numqubits') return scalar(q.numQubits ?? 0);
  if (low === 'numgates') return scalar(q.gates?.length ?? 0);
  if (low === 'type') return str(q.gate ? q.gate : q.qkind);
  if (low === 'targetqubits') return q.targets ? fromRows2([q.targets]) : empty();
  if (low === 'controlqubits') return q.controls ? fromRows2([q.controls]) : empty();
  throw new MatError(`quantum ${q.qkind} has no property '${name}'`);
}
/** Read a geometry-object property via dot syntax (TR.Points, pgon.Vertices, shp.Alpha, …). */
function geomProperty(g: Geom, name: string): Value {
  const low = name.toLowerCase();
  const rows = (m: number[][]) => fromRows2(m);
  if (low === 'points') return rows(g.points);
  if (low === 'vertices') return rows(g.points);
  if (low === 'connectivitylist') return rows((g.conn ?? []).map((r) => r.map((v) => v + 1)));
  if (low === 'alpha') return scalar(g.alpha ?? 0);
  throw new MatError(`${g.gkind} has no property '${name}'`);
}
function fromRows2(m: number[][]): Mat {
  const r = m.length, c = r ? m[0].length : 0; const out = zeros(r, c);
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) out.data[i + j * r] = m[i][j];
  return out;
}
/** Read a graph "property" via dot syntax (G.Edges, G.Nodes, G.numnodes, …). */
function graphProperty(g: Graph, name: string): Value {
  const low = name.toLowerCase();
  if (low === 'numnodes') return scalar(g.n);
  if (low === 'numedges') return scalar(g.edges.length);
  if (low === 'edges') {
    // a struct with EndNodes (m×2) and Weight (m×1) — our stand-in for the Edges table
    const m = g.edges.length; const en = zeros(m, 2); const w = zeros(m, 1);
    g.edges.forEach((e, i) => { en.data[i] = e.s + 1; en.data[i + m] = e.t + 1; w.data[i] = e.w; });
    return { kind: 'struct', rows: 1, cols: 1, fields: new Map<string, Value[]>([['EndNodes', [en]], ['Weight', [w]]]) };
  }
  if (low === 'nodes') {
    const names = g.names ?? Array.from({ length: g.n }, (_, i) => String(i + 1));
    return { kind: 'struct', rows: 1, cols: 1, fields: new Map<string, Value[]>([['Name', [makeStrArr(g.n, 1, names)]]]) };
  }
  throw new MatError(`graph has no property '${name}'`);
}
function rootName(lv: LValue): string {
  let cur: LValue = lv;
  while (cur.t !== 'ident') cur = cur.target;
  return cur.name;
}

// silence unused import warnings for tree-shaken helpers
void det; void dispValue; void mat; void Graphics;
