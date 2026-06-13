/**
 * Recursive-descent parser for the MATLAB subset → AST (see ast.ts).
 *
 * Precedence (low → high), matching MATLAB:
 *   ||  &&  |  &  (== ~= < <= > >=)  :  (+ -)  (* / \ .* ./ .\)  unary(+ - ~)
 *   (^ .^)  postfix(' .' () {} .field)  primary
 */
import { tokenize, type Token } from './lexer';
import type { Expr, LValue, Stmt, FuncDef, Program } from './ast';

const COMMAND_FNS = new Set(['hold', 'format', 'grid', 'box', 'axis', 'clc', 'close', 'clear', 'warning', 'shg', 'drawnow', 'colormap', 'shading', 'colorbar', 'view', 'help', 'doc', 'who', 'whos', 'lookfor', 'syms', 'save', 'load', 'lighting', 'camlight', 'material', 'geobasemap', 'xlabel', 'ylabel', 'zlabel', 'title', 'legend', 'subtitle', 'disp', 'type', 'edit', 'open', 'echo', 'diary', 'rng']);
const BLOCK_END = new Set(['end', 'endfunction', 'endif', 'endfor', 'endwhile', 'endswitch']);

export function parse(src: string): Program {
  return new Parser(tokenize(src), src).parseProgram();
}

class Parser {
  private toks: Token[];
  private i = 0;
  private inMatrix = false;
  private src: string;

  constructor(toks: Token[], src = '') { this.toks = toks; this.src = src; }

  private peek(o = 0): Token { return this.toks[Math.min(this.i + o, this.toks.length - 1)]; }
  private next(): Token { return this.toks[this.i++]; }
  private isEof(): boolean { return this.peek().kind === 'eof'; }
  private atOp(v: string): boolean { const t = this.peek(); return t.kind === 'op' && t.value === v; }
  private atPunct(v: string): boolean { const t = this.peek(); return t.kind === 'punct' && t.value === v; }
  private atKw(v: string): boolean { const t = this.peek(); return t.kind === 'kw' && t.value === v; }
  private eatOp(v: string): boolean { if (this.atOp(v)) { this.i++; return true; } return false; }
  private eatPunct(v: string): boolean { if (this.atPunct(v)) { this.i++; return true; } return false; }
  private expectPunct(v: string) { if (!this.eatPunct(v)) this.err(`expected '${v}'`); }
  private err(msg: string): never { const t = this.peek(); throw new SyntaxError(`Parse error at line ${t.line}: ${msg} (got '${t.value || t.kind}')`); }

  private skipSeparators() {
    while (this.peek().kind === 'nl' || this.atPunct(';') || this.atPunct(',')) this.i++;
  }
  private skipNL() { while (this.peek().kind === 'nl') this.i++; }

  // ── Program / functions ──────────────────────────────────────────────
  parseProgram(): Program {
    const stmts: Stmt[] = [];
    const functions: FuncDef[] = [];
    this.skipSeparators();
    while (!this.isEof()) {
      if (this.atKw('function')) functions.push(this.parseFunction());
      else stmts.push(this.parseStatement());
      this.skipSeparators();
    }
    return { stmts, functions };
  }

  private parseFunction(): FuncDef {
    this.next(); // 'function'
    let outputs: string[] = [];
    // Possible forms: `function name(...)`, `function out = name(...)`,
    // `function [a,b] = name(...)`.
    if (this.atPunct('[')) {
      this.next();
      while (!this.atPunct(']')) {
        if (this.peek().kind === 'ident') outputs.push(this.next().value);
        else if (this.atOp('~')) { this.next(); outputs.push('~'); }
        else break;                  // unexpected token → let expectPunct(']') report it
        this.eatPunct(',');          // separator is optional: `[a b]` and `[a,b]` both valid
      }
      this.expectPunct(']');
      if (!this.eatOp('=')) this.err('expected = in function signature');
    } else if (this.peek().kind === 'ident' && this.peek(1).kind === 'op' && this.peek(1).value === '=') {
      outputs = [this.next().value];
      this.next(); // '='
    }
    if (this.peek().kind !== 'ident') this.err('expected function name');
    const name = this.next().value;
    const params: string[] = [];
    if (this.eatPunct('(')) {
      while (!this.atPunct(')')) {
        if (this.peek().kind === 'ident') params.push(this.next().value);
        else if (this.atOp('~')) { this.next(); params.push('~'); }
        else break;
        if (!this.eatPunct(',')) break;
      }
      this.expectPunct(')');
    }
    const body = this.parseBlock(new Set(['end', 'endfunction', 'function']));
    if (this.atKw('end') || this.atKw('endfunction')) this.next();
    return { name, params, outputs, body };
  }

  /** Parse statements until a stop keyword (peeked, not consumed) or EOF. */
  private parseBlock(stop: Set<string>): Stmt[] {
    const out: Stmt[] = [];
    this.skipSeparators();
    while (!this.isEof()) {
      const t = this.peek();
      if (t.kind === 'kw' && stop.has(t.value)) break;
      out.push(this.parseStatement());
      this.skipSeparators();
    }
    return out;
  }

  // ── Statements ───────────────────────────────────────────────────────
  private parseStatement(): Stmt {
    const t = this.peek();
    if (t.kind === 'kw') {
      switch (t.value) {
        case 'if': return this.parseIf();
        case 'for': return this.parseFor();
        case 'while': return this.parseWhile();
        case 'return': this.next(); return { t: 'return' };
        case 'break': this.next(); return { t: 'break' };
        case 'continue': this.next(); return { t: 'continue' };
        case 'global': return this.parseGlobal();
        case 'switch': return this.parseSwitch();
        case 'try': return this.parseTry();
      }
    }
    return this.parseSimpleStatement();
  }

  private parseIf(): Stmt {
    this.next(); // if
    const clauses: { cond: Expr; body: Stmt[] }[] = [];
    let cond = this.parseExpr();
    this.eatPunct(',');
    let body = this.parseBlock(new Set(['elseif', 'else', 'end', 'endif']));
    clauses.push({ cond, body });
    while (this.atKw('elseif')) {
      this.next();
      cond = this.parseExpr();
      this.eatPunct(',');
      body = this.parseBlock(new Set(['elseif', 'else', 'end', 'endif']));
      clauses.push({ cond, body });
    }
    let elseBody: Stmt[] | undefined;
    if (this.atKw('else')) { this.next(); elseBody = this.parseBlock(new Set(['end', 'endif'])); }
    if (this.atKw('end') || this.atKw('endif')) this.next(); else this.err("expected 'end'");
    return { t: 'if', clauses, elseBody };
  }

  private parseFor(): Stmt {
    this.next(); // for
    const hadParen = this.eatPunct('(');
    if (this.peek().kind !== 'ident') this.err('expected loop variable');
    const varName = this.next().value;
    if (!this.eatOp('=')) this.err("expected '=' in for");
    const range = this.parseExpr();
    if (hadParen) this.expectPunct(')');
    this.eatPunct(',');
    const body = this.parseBlock(new Set(['end', 'endfor']));
    if (this.atKw('end') || this.atKw('endfor')) this.next(); else this.err("expected 'end'");
    return { t: 'for', varName, range, body };
  }

  private parseWhile(): Stmt {
    this.next(); // while
    const cond = this.parseExpr();
    this.eatPunct(',');
    const body = this.parseBlock(new Set(['end', 'endwhile']));
    if (this.atKw('end') || this.atKw('endwhile')) this.next(); else this.err("expected 'end'");
    return { t: 'while', cond, body };
  }

  private parseGlobal(): Stmt {
    this.next();
    const names: string[] = [];
    while (this.peek().kind === 'ident') { names.push(this.next().value); this.eatPunct(','); }
    return { t: 'global', names };
  }

  private parseSwitch(): Stmt {
    this.next();
    const subject = this.parseExpr();
    this.skipSeparators();
    const clauses: { vals: Expr[]; body: Stmt[] }[] = [];
    let elseBody: Stmt[] | undefined;
    while (this.atKw('case')) {
      this.next();
      const valE = this.parseExpr();
      this.eatPunct(',');
      // `case {a,b,c}` matches any listed value; a bare value matches just itself.
      const vals = valE.t === 'celllit' ? valE.rows.reduce<Expr[]>((acc, row) => acc.concat(row), []) : [valE];
      const body = this.parseBlock(new Set(['case', 'otherwise', 'end', 'endswitch']));
      clauses.push({ vals, body });
    }
    if (this.atKw('otherwise')) { this.next(); elseBody = this.parseBlock(new Set(['end', 'endswitch'])); }
    if (this.atKw('end') || this.atKw('endswitch')) this.next(); else this.err("expected 'end'");   // match if/for/while
    return { t: 'switch', subject, clauses, elseBody };
  }

  private parseTry(): Stmt {
    this.next(); // try
    this.eatPunct(',');
    const body = this.parseBlock(new Set(['catch', 'end', 'end_try_catch']));
    let catchVar: string | undefined; let catchBody: Stmt[] = [];
    if (this.atKw('catch')) {
      this.next();
      // `catch err` — a lone identifier on the catch line is the error variable.
      const p1 = this.peek(1);
      if (this.peek().kind === 'ident' && (p1.kind === 'nl' || (p1.kind === 'punct' && (p1.value === ';' || p1.value === ',')))) catchVar = this.next().value;
      catchBody = this.parseBlock(new Set(['end', 'end_try_catch']));
    }
    if (this.atKw('end') || this.atKw('end_try_catch')) this.next(); else this.err("expected 'end'");
    return { t: 'try', body, catchVar, catchBody };
  }

  private terminatorSuppresses(): boolean {
    // Reads the statement terminator; returns true if it was ';'.
    if (this.atPunct(';')) { this.next(); return true; }
    if (this.atPunct(',')) { this.next(); return false; }
    if (this.peek().kind === 'nl' || this.isEof()) return false;
    // Allow a following block-end keyword without a separator.
    if (this.peek().kind === 'kw' && (BLOCK_END.has(this.peek().value) || ['else', 'elseif', 'case', 'otherwise'].includes(this.peek().value))) return false;
    return false;
  }

  private parseSimpleStatement(): Stmt {
    // Command syntax: `hold on`, `format short`, `axis equal`, ...
    const cmd = this.tryCommandSyntax();
    if (cmd) { const suppressed = this.terminatorSuppresses(); return { t: 'expr', e: cmd, suppressed }; }

    // Multi-assign: `[a, b] = expr`
    const multi = this.tryMultiAssign();
    if (multi) return multi;

    const e = this.parseExpr();
    if (this.atOp('=')) {
      this.next();
      const rhs = this.parseExpr();
      const suppressed = this.terminatorSuppresses();
      return { t: 'assign', lhs: this.toLValue(e), e: rhs, suppressed };
    }
    const suppressed = this.terminatorSuppresses();
    return { t: 'expr', e, suppressed };
  }

  private tryCommandSyntax(): Expr | null {
    const t = this.peek();
    if (t.kind !== 'ident' || !COMMAND_FNS.has(t.value)) return null;
    const a1 = this.peek(1);
    // Must look like `name word` — next is a bareword/number/keyword on same line, not `(` / `=` / operator.
    // Keywords count as barewords here so `help function`, `help if`, `help end` work (MATLAB treats the
    // word following a command-syntax call as a literal string, even reserved words).
    if (a1.kind !== 'ident' && a1.kind !== 'str' && a1.kind !== 'num' && a1.kind !== 'kw') return null;
    if (a1.kind === 'ident' && this.peek(2).kind === 'op' && this.peek(2).value === '=') return null;
    const name = this.next().value;
    const args: Expr[] = [];
    while (this.peek().kind === 'ident' || this.peek().kind === 'str' || this.peek().kind === 'num' || this.peek().kind === 'kw') {
      const w = this.next();
      let word = w.value;
      // capture a symbolic-function signature like `y(t)` as one word (e.g. `syms y(t)`)
      if (this.atPunct('(')) { let depth = 0; do { const tk = this.next(); word += tk.value; if (tk.value === '(') depth++; else if (tk.value === ')') depth--; } while (depth > 0 && this.peek().kind !== 'eof'); }
      // merge contiguous (no-whitespace) filename pieces: `datafile.mat`, `my-file`, `dir/sub.mat`
      while (!this.peek().spaceBefore && (this.peek().kind === 'ident' || this.peek().kind === 'num' || ((this.peek().kind === 'op' || this.peek().kind === 'punct') && ['.', '-', '/', '\\'].includes(this.peek().value)))) word += this.next().value;
      args.push({ t: 'str', v: word });
    }
    return { t: 'index', target: { t: 'ident', name }, args };
  }

  private tryMultiAssign(): Stmt | null {
    if (!this.atPunct('[')) return null;
    const save = this.i;
    this.next(); // [
    const lhs: (LValue | null)[] = [];
    try {
      while (!this.atPunct(']')) {
        if (this.atOp('~')) { this.next(); lhs.push(null); }
        else {
          const e = this.parsePostfix();
          lhs.push(this.toLValue(e));
        }
        this.eatPunct(',');   // separator optional: `[m n] = size(A)` and `[m,n] = …` both valid
      }
      if (!this.eatPunct(']')) { this.i = save; return null; }
      if (!this.atOp('=')) { this.i = save; return null; }
      // Reject if any element wasn't a clean lvalue (toLValue throws otherwise).
    } catch {
      this.i = save; return null;
    }
    this.next(); // =
    const rhs = this.parseExpr();
    const suppressed = this.terminatorSuppresses();
    return { t: 'multiassign', lhs, e: rhs, suppressed };
  }

  private toLValue(e: Expr): LValue {
    switch (e.t) {
      case 'ident': return { t: 'ident', name: e.name };
      case 'index': return { t: 'index', target: this.toLValue(e.target), args: e.args };
      case 'cell': return { t: 'cell', target: this.toLValue(e.target), args: e.args };
      case 'field': return { t: 'field', target: this.toLValue(e.target), name: e.name };
      default: throw new SyntaxError('invalid assignment target');
    }
  }

  // ── Expressions ──────────────────────────────────────────────────────
  parseExpr(): Expr { return this.parseOrShort(); }

  private parseOrShort(): Expr {
    let a = this.parseAndShort();
    while (this.atOp('||')) { this.next(); a = { t: 'binary', op: '||', a, b: this.parseAndShort() }; }
    return a;
  }
  private parseAndShort(): Expr {
    let a = this.parseElemOr();
    while (this.atOp('&&')) { this.next(); a = { t: 'binary', op: '&&', a, b: this.parseElemOr() }; }
    return a;
  }
  private parseElemOr(): Expr {
    let a = this.parseElemAnd();
    while (this.atOp('|')) { this.next(); a = { t: 'binary', op: '|', a, b: this.parseElemAnd() }; }
    return a;
  }
  private parseElemAnd(): Expr {
    let a = this.parseCompare();
    while (this.atOp('&')) { this.next(); a = { t: 'binary', op: '&', a, b: this.parseCompare() }; }
    return a;
  }
  private parseCompare(): Expr {
    let a = this.parseColon();
    while (['==', '~=', '<', '>', '<=', '>='].some((o) => this.atOp(o))) {
      const op = this.next().value;
      a = { t: 'binary', op, a, b: this.parseColon() };
    }
    return a;
  }
  private parseColon(): Expr {
    const a = this.parseAdd();
    if (!this.atOp(':')) return a;
    this.next();
    const b = this.parseAdd();
    if (this.atOp(':')) { this.next(); const c = this.parseAdd(); return { t: 'range', from: a, step: b, to: c }; }
    return { t: 'range', from: a, to: b };
  }
  private parseAdd(): Expr {
    let a = this.parseMul();
    while (this.atOp('+') || this.atOp('-')) {
      // Matrix whitespace rule: ` -x` with no following space starts a new element.
      if (this.inMatrix) {
        const opTok = this.peek();
        const after = this.peek(1);
        if (opTok.spaceBefore && !after.spaceBefore) break;
      }
      const op = this.next().value;
      a = { t: 'binary', op, a, b: this.parseMul() };
    }
    return a;
  }
  private parseMul(): Expr {
    let a = this.parseUnary();
    while (['*', '/', '\\', '.*', './', '.\\'].some((o) => this.atOp(o))) {
      const op = this.next().value;
      a = { t: 'binary', op, a, b: this.parseUnary() };
    }
    return a;
  }
  private parseUnary(): Expr {
    if (this.atOp('-') || this.atOp('+') || this.atOp('~')) {
      const op = this.next().value;
      return { t: 'unary', op, e: this.parseUnary() };
    }
    return this.parsePower();
  }
  private parsePower(): Expr {
    let base = this.parsePostfix();
    while (this.atOp('^') || this.atOp('.^')) {
      const op = this.next().value;
      const rhs = this.parsePowerRhs();
      base = { t: 'binary', op, a: base, b: rhs };
    }
    return base;
  }
  private parsePowerRhs(): Expr {
    if (this.atOp('-') || this.atOp('+') || this.atOp('~')) {
      const op = this.next().value;
      return { t: 'unary', op, e: this.parsePowerRhs() };
    }
    return this.parsePostfix();
  }
  private parsePostfix(): Expr {
    let e = this.parsePrimary();
    for (;;) {
      if (this.atOp("'") || this.atOp(".'")) { const op = this.next().value as "'" | ".'"; e = { t: 'postfix', op, e }; continue; }
      if (this.atPunct('(')) { e = { t: 'index', target: e, args: this.parseArgList('(', ')') }; continue; }
      if (this.atPunct('{')) { e = { t: 'cell', target: e, args: this.parseArgList('{', '}') }; continue; }
      if (this.atOp('.') && (this.peek(1).kind === 'ident' || this.peek(1).kind === 'kw')) { this.next(); const name = this.next().value; e = { t: 'field', target: e, name }; continue; }   // reserved words (e.g. s.function) are valid field names
      break;
    }
    return e;
  }

  private parseArgList(open: string, close: string): Expr[] {
    this.expectPunct(open);
    this.skipNL();
    const args: Expr[] = [];
    const wasMatrix = this.inMatrix;
    this.inMatrix = false;
    while (!this.atPunct(close)) {
      // Bare colon as a whole-dimension subscript.
      if (this.atOp(':') && (this.peek(1).kind === 'punct' && (this.peek(1).value === ',' || this.peek(1).value === close))) {
        this.next(); args.push({ t: 'colon' });
      } else if (open === '(' && this.peek().kind === 'ident' && this.peek(1).value === '=') {
        // name=value argument (R2021a+) → emit the name as a string, then the value
        const name = this.peek().value; this.next(); this.next();
        args.push({ t: 'str', v: name }); args.push(this.parseExpr());
      } else {
        args.push(this.parseExpr());
      }
      this.skipNL();
      if (!this.eatPunct(',')) break;
      this.skipNL();
    }
    this.inMatrix = wasMatrix;
    this.expectPunct(close);
    return args;
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    if (t.kind === 'num') { this.next(); return { t: 'num', v: t.num!, imag: t.imag }; }
    if (t.kind === 'str') { this.next(); return t.dq ? { t: 'string', v: t.value } : { t: 'str', v: t.value }; }
    if (t.kind === 'kw' && t.value === 'end') { this.next(); return { t: 'end' }; }
    if (t.kind === 'ident') { this.next(); return { t: 'ident', name: t.value }; }
    if (this.atOp('@')) return this.parseHandle();
    if (this.atPunct('(')) { this.next(); const wasM = this.inMatrix; this.inMatrix = false; this.skipNL(); const e = this.parseExpr(); this.skipNL(); this.expectPunct(')'); this.inMatrix = wasM; return e; }
    if (this.atPunct('[')) return this.parseMatrix();
    if (this.atPunct('{')) return this.parseCellLiteral();
    this.err('unexpected token in expression');
  }

  private parseHandle(): Expr {
    const atPos = this.peek().pos;   // position of '@' for capturing the anon source text
    this.next(); // @
    if (this.atPunct('(')) {
      this.next();
      const params: string[] = [];
      while (!this.atPunct(')')) {
        if (this.peek().kind === 'ident') params.push(this.next().value);
        else if (this.atOp('~')) { this.next(); params.push('~'); }
        if (!this.eatPunct(',')) break;
      }
      this.expectPunct(')');
      const body = this.parseExpr();
      const endPos = this.peek().pos;
      const src = this.src ? this.src.slice(atPos, endPos).replace(/\s+$/, '') : undefined;
      return { t: 'anon', params, body, src };
    }
    if (this.peek().kind !== 'ident') this.err('expected function name after @');
    let name = this.next().value;
    // package-qualified names like pkg.fn — fold the dots into the name
    while (this.atOp('.') && this.peek(1).kind === 'ident') { this.next(); name += '.' + this.next().value; }
    return { t: 'handle', name };
  }

  private parseMatrix(): Expr {
    this.next(); // [
    const wasMatrix = this.inMatrix;
    this.inMatrix = true;
    const rows: Expr[][] = [];
    let row: Expr[] = [];
    const pushRow = () => { rows.push(row); row = []; };
    // skip leading newlines
    while (this.peek().kind === 'nl') this.i++;
    while (!this.atPunct(']')) {
      if (this.peek().kind === 'nl' || this.atPunct(';')) {
        this.next();
        if (row.length) pushRow();
        while (this.peek().kind === 'nl' || this.atPunct(';')) this.i++;
        continue;
      }
      if (this.atPunct(',')) { this.next(); continue; }
      if (this.isEof()) this.err("expected ']'");
      row.push(this.parseExpr());
    }
    if (row.length) pushRow();
    this.expectPunct(']');
    this.inMatrix = wasMatrix;
    return { t: 'matrix', rows };
  }

  private parseCellLiteral(): Expr {
    // {a, b; c} cell literal.
    this.next(); // {
    const wasMatrix = this.inMatrix;
    this.inMatrix = true;
    const rows: Expr[][] = [];
    let row: Expr[] = [];
    while (this.peek().kind === 'nl') this.i++;
    while (!this.atPunct('}')) {
      if (this.peek().kind === 'nl' || this.atPunct(';')) { this.next(); if (row.length) { rows.push(row); row = []; } continue; }
      if (this.atPunct(',')) { this.next(); continue; }
      if (this.isEof()) this.err("expected '}'");
      row.push(this.parseExpr());
    }
    if (row.length) rows.push(row);
    this.expectPunct('}');
    this.inMatrix = wasMatrix;
    return { t: 'celllit', rows };
  }
}
