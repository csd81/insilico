/** AST node types for the MATLAB subset. */

export type Expr =
  | { t: 'num'; v: number; imag?: boolean }
  | { t: 'str'; v: string }
  | { t: 'string'; v: string }                    // double-quoted "…" → string scalar
  | { t: 'ident'; name: string }
  | { t: 'end' }                                  // `end` used as an index bound
  | { t: 'colon' }                                // bare `:` as an index (whole dim)
  | { t: 'range'; from: Expr; step?: Expr; to: Expr }
  | { t: 'unary'; op: string; e: Expr }
  | { t: 'postfix'; op: "'" | ".'"; e: Expr }     // transpose
  | { t: 'binary'; op: string; a: Expr; b: Expr }
  | { t: 'matrix'; rows: Expr[][] }               // [a b; c d]
  | { t: 'celllit'; rows: Expr[][] }              // {a b; c d}
  | { t: 'index'; target: Expr; args: Expr[] }    // f(...) — call OR subscript
  | { t: 'cell'; target: Expr; args: Expr[] }     // c{...}
  | { t: 'field'; target: Expr; name?: string; nameExpr?: Expr }    // s.name or s.(expr)
  | { t: 'anon'; params: string[]; body: Expr; src?: string }   // @(x) expr
  | { t: 'handle'; name: string };                // @name

export type LValue =
  | { t: 'ident'; name: string }
  | { t: 'index'; target: LValue; args: Expr[] }
  | { t: 'cell'; target: LValue; args: Expr[] }
  | { t: 'field'; target: LValue; name?: string; nameExpr?: Expr };

export type Stmt =
  | { t: 'expr'; e: Expr; suppressed: boolean }
  | { t: 'assign'; lhs: LValue; e: Expr; suppressed: boolean }
  | { t: 'multiassign'; lhs: (LValue | null)[]; e: Expr; suppressed: boolean }
  | { t: 'if'; clauses: { cond: Expr; body: Stmt[] }[]; elseBody?: Stmt[] }
  | { t: 'for'; varName: string; range: Expr; body: Stmt[] }
  | { t: 'while'; cond: Expr; body: Stmt[] }
  | { t: 'switch'; subject: Expr; clauses: { vals: Expr[]; body: Stmt[] }[]; elseBody?: Stmt[] }
  | { t: 'try'; body: Stmt[]; catchVar?: string; catchBody: Stmt[] }
  | { t: 'return' }
  | { t: 'break' }
  | { t: 'continue' }
  | { t: 'global'; names: string[] }
  | { t: 'func'; def: FuncDef };

export interface FuncDef {
  name: string;
  params: string[];
  outputs: string[];
  body: Stmt[];
}

export interface Program {
  stmts: Stmt[];          // top-level script statements
  functions: FuncDef[];   // functions defined in the file
}
