/**
 * Tokeniser for the MATLAB/Octave subset.
 *
 * Notable MATLAB quirks handled here:
 *  - `'` is transpose when it follows a value (ident, number, `)`, `]`, `'`),
 *    otherwise it opens a single-quoted char string (with `''` escape).
 *  - Whitespace is significant inside `[ ]` matrix literals, so every token
 *    records whether a space preceded it (`spaceBefore`); the parser uses this
 *    to tell `[1 -2]` (two elements) from `[1 - 2]` (one).
 *  - `...` continues a line; `%` starts a line comment; `%{`/`%}` on their own
 *    lines bracket a block comment.
 */

export type TokKind = 'num' | 'str' | 'ident' | 'kw' | 'op' | 'punct' | 'nl' | 'eof';

export interface Token {
  kind: TokKind;
  value: string;
  num?: number;
  imag?: boolean;   // numeric literal with an `i`/`j` suffix (e.g. 2i)
  dq?: boolean;     // string token came from double quotes ("…") ⇒ string class, not char
  spaceBefore: boolean;
  pos: number;
  line: number;
}

const KEYWORDS = new Set([
  'function', 'end', 'endfunction', 'endif', 'endfor', 'endwhile',
  'if', 'elseif', 'else', 'for', 'while', 'return', 'break', 'continue',
  'switch', 'case', 'otherwise', 'global',
  'try', 'catch', 'end_try_catch',
]);

// Multi-char operators, longest first.
const MULTI_OPS = ['...', '.^', '.*', './', '.\\', ".'", '==', '~=', '<=', '>=', '&&', '||'];
const SINGLE_OPS = '+-*/\\^<>=&|~:\'@.';
const PUNCT = '()[]{},;';

export function tokenize(src: string): Token[] {
  const toks: Token[] = [];
  let i = 0;
  let line = 1;
  const n = src.length;
  let spaceBefore = false;

  const prevSignificant = (): Token | undefined => toks[toks.length - 1];
  // Does a `'` here mean transpose (vs. opening a string)?
  const isTranspose = (): boolean => {
    const p = prevSignificant();
    if (!p) return false;
    if (p.kind === 'str') return !spaceBefore; // `'a' 'b'` (space) ⇒ second is a new string, not transpose
    if (p.kind === 'num' || p.kind === 'ident') return !spaceBefore; // `A'` transpose, but `disp 'hi'` / `[3 'ab']` (space) ⇒ string
    // `A(:)'`/`x{1}'`/`M]'` (no space) ⇒ transpose; but `[f(x) 'ab']` / `[c{1} 'ab']` (space inside a
    // matrix/cell) ⇒ the `'` opens a new char element, exactly as for the num/ident/str cases above.
    if (p.kind === 'punct' && (p.value === ')' || p.value === ']' || p.value === '}')) return !spaceBefore;
    if (p.kind === 'op' && (p.value === "'" || p.value === ".'")) return true;
    return false;
  };

  while (i < n) {
    const c = src[i];

    // Whitespace (not newline).
    if (c === ' ' || c === '\t' || c === '\r') { spaceBefore = true; i++; continue; }

    // Newline.
    if (c === '\n') {
      toks.push({ kind: 'nl', value: '\n', spaceBefore, pos: i, line });
      i++; line++; spaceBefore = false; continue;
    }

    // Block comment: a line whose trimmed content is exactly `%{` ... up to `%}`.
    if ((c === '%' || c === '#') && atLineStartBlock(src, i, '{')) {
      const blockStart = i;
      i = skipBlockComment(src, i);
      for (let k = blockStart; k < i; k++) if (src[k] === '\n') line++; // keep line counter in sync
      continue;
    }
    // Line comment.
    if (c === '%' || (c === '#' && src[i + 1] !== '{')) {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }

    // Line continuation `...` — swallow to end of line (and the newline).
    if (c === '.' && src[i + 1] === '.' && src[i + 2] === '.') {
      i += 3;
      while (i < n && src[i] !== '\n') i++;
      if (i < n) { i++; line++; }
      spaceBefore = true;
      continue;
    }

    // Hexadecimal (0x1F) and binary (0b1011) literals, with an optional u8/u16/u32/u64/
    // s8/s16/s32/s64 type suffix (which we accept but treat as plain doubles).
    if (c === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X' || src[i + 1] === 'b' || src[i + 1] === 'B')) {
      const hex = src[i + 1] === 'x' || src[i + 1] === 'X';
      let j = i + 2;
      const isDig = hex ? (ch: string) => /[0-9a-fA-F]/.test(ch) : (ch: string) => ch === '0' || ch === '1';
      while (j < n && isDig(src[j])) j++;
      if (j > i + 2) {
        const val = parseInt(src.slice(i + 2, j), hex ? 16 : 2);
        if (src[j] === 'u' || src[j] === 's') { j++; while (j < n && isDigit(src[j])) j++; }   // type suffix
        toks.push({ kind: 'num', value: String(val), num: val, imag: false, spaceBefore, pos: i, line });
        i = j; spaceBefore = false; continue;
      }
    }

    // Number (including .5, 1e-4, 3.2E+10).
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      let j = i;
      while (j < n && isDigit(src[j])) j++;
      // A `.` here is a decimal point — unless it begins a dotted operator (`.^ .* ./ .\ .'`),
      // so `2.^x` lexes as `2 .^ x` and `a^2./b` as `a^2 ./ b` (element-wise), matching MATLAB.
      if (src[j] === '.' && !'^*/\\\''.includes(src[j + 1] ?? '')) { j++; while (j < n && isDigit(src[j])) j++; }
      if (src[j] === 'e' || src[j] === 'E') {
        let k = j + 1;
        if (src[k] === '+' || src[k] === '-') k++;
        if (isDigit(src[k])) { k++; while (k < n && isDigit(src[k])) k++; j = k; }
      }
      const text = src.slice(i, j);
      // imaginary suffix: 2i / 1j / 3.5i (not part of an identifier)
      let imag = false;
      if ((src[j] === 'i' || src[j] === 'j') && !isIdentPart(src[j + 1] ?? '')) { imag = true; j++; }
      toks.push({ kind: 'num', value: text, num: parseFloat(text), imag, spaceBefore, pos: i, line });
      i = j; spaceBefore = false; continue;
    }

    // Identifier / keyword.
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < n && isIdentPart(src[j])) j++;
      const text = src.slice(i, j);
      toks.push({ kind: KEYWORDS.has(text) ? 'kw' : 'ident', value: text, spaceBefore, pos: i, line });
      i = j; spaceBefore = false; continue;
    }

    // String literal (single quote, not transpose).
    if (c === "'" && !isTranspose()) {
      let j = i + 1; let out = '';
      while (j < n) {
        if (src[j] === "'") {
          if (src[j + 1] === "'") { out += "'"; j += 2; continue; }
          break;
        }
        if (src[j] === '\n') break;
        out += src[j]; j++;
      }
      toks.push({ kind: 'str', value: out, spaceBefore, pos: i, line });
      // On an unterminated string we stopped *at* the newline — leave it for the nl
      // handler (which emits the token and bumps `line`); only skip the closing quote.
      i = (j < n && src[j] === '\n') ? j : j + 1; spaceBefore = false; continue;
    }
    // Double-quoted string (Octave/newer MATLAB).
    if (c === '"') {
      let j = i + 1; let out = '';
      while (j < n) {
        if (src[j] === '"') { if (src[j + 1] === '"') { out += '"'; j += 2; continue; } break; } // MATLAB "" → "
        if (src[j] === '\\' && src[j + 1] === '"') { out += '"'; j += 2; continue; }            // Octave \" → "
        if (src[j] === '\n') line++;   // keep the line counter correct if the string spans lines
        out += src[j]; j++;
      }
      toks.push({ kind: 'str', value: out, dq: true, spaceBefore, pos: i, line });
      i = j + 1; spaceBefore = false; continue;
    }

    // Multi-char operators.
    let matched = false;
    for (const op of MULTI_OPS) {
      if (src.startsWith(op, i)) {
        if (op === '...') break; // handled above; defensive
        toks.push({ kind: 'op', value: op, spaceBefore, pos: i, line });
        i += op.length; spaceBefore = false; matched = true; break;
      }
    }
    if (matched) continue;

    // Single-char operator.
    if (SINGLE_OPS.includes(c)) {
      toks.push({ kind: 'op', value: c, spaceBefore, pos: i, line });
      i++; spaceBefore = false; continue;
    }

    // Punctuation.
    if (PUNCT.includes(c)) {
      toks.push({ kind: 'punct', value: c, spaceBefore, pos: i, line });
      i++; spaceBefore = false; continue;
    }

    throw new SyntaxError(`Unexpected character '${c}' at line ${line}`);
  }

  toks.push({ kind: 'eof', value: '', spaceBefore, pos: n, line });
  return toks;
}

function isDigit(c: string | undefined): boolean { return !!c && c >= '0' && c <= '9'; }
function isIdentStart(c: string): boolean { return /[A-Za-z_]/.test(c); }
function isIdentPart(c: string): boolean { return /[A-Za-z0-9_]/.test(c); }

/** Is position `i` (a `%`/`#`) the start of a `%{` block-comment opener line? */
function atLineStartBlock(src: string, i: number, brace: string): boolean {
  if (src[i + 1] !== brace) return false;
  // everything before i on this line must be whitespace
  let k = i - 1;
  while (k >= 0 && src[k] !== '\n') { if (src[k] !== ' ' && src[k] !== '\t' && src[k] !== '\r') return false; k--; }
  // everything after %{ to EOL must be whitespace
  let m = i + 2;
  while (m < src.length && src[m] !== '\n') { if (src[m] !== ' ' && src[m] !== '\t' && src[m] !== '\r') return false; m++; }
  return true;
}

function skipBlockComment(src: string, i: number): number {
  // i points at `%{`; advance to after the matching `%}` line.
  let k = i + 2;
  while (k < src.length) {
    if (src[k] === '\n') {
      // check next line for `%}` / `#}`
      let m = k + 1;
      while (m < src.length && (src[m] === ' ' || src[m] === '\t' || src[m] === '\r')) m++;
      if ((src[m] === '%' || src[m] === '#') && src[m + 1] === '}') {
        let e = m + 2;
        while (e < src.length && src[e] !== '\n') e++;
        return e;
      }
    }
    k++;
  }
  return src.length;
}
