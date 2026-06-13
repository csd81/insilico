/**
 * Lightweight MATLAB syntax highlighter for the editor overlay.
 *
 * Unlike the interpreter's lexer (which discards comments and whitespace), this
 * emits a segment for *every* character so the highlighted layer lines up
 * exactly behind the textarea. Builtin/keyword names are shared with the
 * interpreter so highlighting matches what actually runs.
 */
import { BUILTINS, CONSTANTS } from './builtins';

export interface Seg { t: 'plain' | 'comment' | 'string' | 'number' | 'keyword' | 'builtin' | 'op'; v: string }

const KEYWORDS = new Set([
  'function', 'end', 'endfunction', 'endif', 'endfor', 'endwhile', 'endswitch',
  'if', 'elseif', 'else', 'for', 'while', 'return', 'break', 'continue',
  'switch', 'case', 'otherwise', 'global', 'do', 'until',
]);
const BUILTIN_NAMES = new Set([...Object.keys(BUILTINS), ...Object.keys(CONSTANTS)]);

const isDigit = (c: string) => c >= '0' && c <= '9';
const isWs = (c: string) => c === ' ' || c === '\t' || c === '\r' || c === '\n';
const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdentPart = (c: string) => /[A-Za-z0-9_]/.test(c);
const TWO_OPS = ['==', '~=', '<=', '>=', '&&', '||', '.^', '.*', './', '.\\', ".'"];
const ONE_OPS = '+-*/\\^<>=&|~:@.,;()[]{}';

export function highlightMatlab(src: string): Seg[] {
  const out: Seg[] = [];
  const push = (t: Seg['t'], v: string) => { if (v) out.push({ t, v }); };
  let i = 0;
  const n = src.length;
  // Whether the previous significant token can be followed by a transpose `'`.
  let prevValue = false;

  while (i < n) {
    const c = src[i];

    if (isWs(c)) { let j = i + 1; while (j < n && isWs(src[j])) j++; push('plain', src.slice(i, j)); i = j; continue; }

    // line comment (covers %{ / %} lines too)
    if (c === '%' || c === '#') { let j = i + 1; while (j < n && src[j] !== '\n') j++; push('comment', src.slice(i, j)); i = j; prevValue = false; continue; }

    // string vs. transpose
    if (c === "'") {
      if (prevValue) { push('op', "'"); i++; prevValue = true; continue; }
      let j = i + 1;
      while (j < n) {
        if (src[j] === "'") { if (src[j + 1] === "'") { j += 2; continue; } j++; break; }
        if (src[j] === '\n') break;
        j++;
      }
      push('string', src.slice(i, j)); i = j; prevValue = true; continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '"') { if (src[j + 1] === '"') { j += 2; continue; } break; } // MATLAB "" escape
        if (src[j] === '\\' && src[j + 1] === '"') { j += 2; continue; }              // Octave \" escape
        if (src[j] === '\n') break;
        j++;
      }
      if (src[j] === '"') j++;
      push('string', src.slice(i, j)); i = j; prevValue = true; continue;
    }

    // number
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1] ?? ''))) {
      let j = i;
      while (j < n && isDigit(src[j])) j++;
      if (src[j] === '.') { j++; while (j < n && isDigit(src[j])) j++; }
      if (src[j] === 'e' || src[j] === 'E') {
        let k = j + 1; if (src[k] === '+' || src[k] === '-') k++;
        if (isDigit(src[k] ?? '')) { k++; while (k < n && isDigit(src[k])) k++; j = k; }
      }
      push('number', src.slice(i, j)); i = j; prevValue = true; continue;
    }

    // identifier / keyword / builtin
    if (isIdentStart(c)) {
      let j = i + 1; while (j < n && isIdentPart(src[j])) j++;
      const w = src.slice(i, j);
      if (KEYWORDS.has(w)) { push('keyword', w); prevValue = false; }
      else if (BUILTIN_NAMES.has(w)) { push('builtin', w); prevValue = true; }
      else { push('plain', w); prevValue = true; }
      i = j; continue;
    }

    // operators / punctuation
    const two = src.slice(i, i + 2);
    if (TWO_OPS.includes(two)) { push('op', two); i += 2; prevValue = two === ".'"; continue; }
    if (ONE_OPS.includes(c)) { push('op', c); i++; prevValue = c === ')' || c === ']' || c === '}'; continue; }

    push('plain', c); i++;
  }
  return out;
}
