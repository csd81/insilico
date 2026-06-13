/** The interactive command window (REPL scrollback + input line with history). */
import { Fragment, useEffect, useRef, useState } from 'react';
import type { ConsoleLine } from '../hooks/useSandbox';
import { TEX_OPEN, TEX_CLOSE, HELP_OPEN, HELP_CLOSE } from '../../matlab/format';
import { highlightMatlab } from '../../matlab/highlight';
import { Math as Tex } from '../ui/Math';

/** Turn http(s) URLs in console text into clickable links. */
function linkify(text: string, key: number) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p)
      ? <a key={`${key}.${i}`} className="mlab__link" href={p} target="_blank" rel="noreferrer noopener">{p}</a>
      : <Fragment key={`${key}.${i}`}>{p}</Fragment>,
  );
}

/** Syntax-highlight a line of .m code (used for Syntax/Examples in help pages). */
function highlightCode(code: string, key: number) {
  return highlightMatlab(code).map((s, i) => (
    <span key={`${key}.${i}`} className={s.t === 'plain' ? undefined : 'tok-' + s.t}>{s.v}</span>
  ));
}

/**
 * Render a `help` page (text between the HELP sentinels) richly: coloured section
 * headers, syntax-highlighted .m examples, and clickable "See also" links that
 * open the help for that function. Parses the regular layout emitted by
 * `Interp.help`/`builtinHelp` (see help.ts).
 */
function HelpBlock({ text, onSubmit }: { text: string; onSubmit: (t: string) => void }) {
  const lines = text.replace(/\n+$/, '').split('\n');
  const out: React.ReactNode[] = [];
  let section = ''; // current section: Syntax | Examples | Description | Documentation | ''

  lines.forEach((ln, i) => {
    // Title line: " name - summary"
    if (i === 0) {
      const m = ln.match(/^ (\S[^\n]*?) - ([\s\S]+)$/);
      if (m) {
        out.push(
          <div key={i} className="mlab__help-title">
            <span className="mlab__help-name">{m[1]}</span> — {m[2]}
          </div>,
        );
      } else {
        out.push(<div key={i} className="mlab__help-title"><span className="mlab__help-name">{ln.trim()}</span></div>);
      }
      return;
    }
    if (ln.trim() === '') { out.push(<div key={i} className="mlab__help-gap" />); return; }

    // Section headers (4-space indent).
    let m = ln.match(/^ {4}(Syntax|Examples|Description)\s*$/);
    if (m) { section = m[1]; out.push(<div key={i} className="mlab__help-head">{m[1]}</div>); return; }
    m = ln.match(/^ {4}Documentation for (.+)$/);
    if (m) { section = 'Documentation'; out.push(<div key={i} className="mlab__help-head">Documentation for {m[1]}</div>); return; }
    m = ln.match(/^ {4}Toolbox: (.+)$/);
    if (m) { section = ''; out.push(<div key={i} className="mlab__help-tag">Toolbox: <span className="mlab__help-tbname">{m[1]}</span></div>); return; }
    m = ln.match(/^ {4}See also (.+)$/);
    if (m) {
      const names = m[1].replace(/\.$/, '').split(/,\s*/).filter(Boolean);
      section = '';
      out.push(
        <div key={i} className="mlab__help-seealso">
          <span className="mlab__help-head mlab__help-head--inline">See also</span>{' '}
          {names.map((nm, j) => (
            <Fragment key={j}>
              {j > 0 && ', '}
              <button type="button" className="mlab__help-link" onClick={() => onSubmit('help ' + nm)}>{nm}</button>
            </Fragment>
          ))}
        </div>,
      );
      return;
    }

    // Content line (6-space indent, but be lenient).
    const body = ln.replace(/^ {1,6}/, '');
    if (section === 'Syntax' || section === 'Examples') {
      out.push(<div key={i} className="mlab__help-code">{highlightCode(body, i)}</div>);
    } else {
      out.push(<div key={i} className="mlab__help-text">{linkify(body, i)}</div>);
    }
  });

  return <div className="mlab__help">{out}</div>;
}

// Symbolic output is wrapped in a sentinel pair carrying a LaTeX fragment; render
// those with KaTeX inline and leave the surrounding monospace text untouched.
// Help pages are wrapped in their own sentinel pair and rendered as a rich block.
const TEX_RE = new RegExp(`${TEX_OPEN}([\\s\\S]*?)${TEX_CLOSE}`, 'g');
const HELP_RE = new RegExp(`${HELP_OPEN}([\\s\\S]*?)${HELP_CLOSE}`, 'g');
function renderLine(text: string, onSubmit: (t: string) => void) {
  // Split off any help blocks first (even indices = other text, odd = help page).
  const hParts = text.split(HELP_RE);
  return hParts.map((part, hi) => {
    if (hi % 2 === 1) return <HelpBlock key={`h${hi}`} text={part} onSubmit={onSubmit} />;
    const segs = part.split(TEX_RE); // even indices = plain text, odd = LaTeX
    return segs.map((s, i) =>
      i % 2 === 1
        ? <Tex key={`${hi}.${i}`} className="mlab__tex" tex={s} />
        : <Fragment key={`${hi}.${i}`}>{linkify(s, i)}</Fragment>,
    );
  });
}

/** The identifier fragment immediately left of the cursor (letters/digits/_, MATLAB-style). */
function wordBeforeCursor(text: string, caret: number): { word: string; start: number } {
  const left = text.slice(0, caret);
  const m = left.match(/[A-Za-z_]\w*$/);
  return m ? { word: m[0], start: caret - m[0].length } : { word: '', start: caret };
}

const MAX_COMPLETIONS = 50; // cap the dropdown so a bare prefix doesn't list thousands

export default function CommandWindow({
  lines, busy, prompt, completions = [], onSubmit, onClear,
}: {
  lines: ConsoleLine[];
  busy: boolean;
  prompt: string | null;
  completions?: string[];
  onSubmit: (text: string) => void;
  onClear: () => void;
}) {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const draftRef = useRef('');   // stashes the unsubmitted input while navigating history
  const [menu, setMenu] = useState<{ items: string[]; sel: number; word: string; start: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [lines, prompt]);
  useEffect(() => { if (prompt !== null) inputRef.current?.focus(); }, [prompt]);
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }, [value]);

  // Replace the word under the cursor with `name`, append "(" for functions if not present.
  const applyCompletion = (name: string, start: number, word: string) => {
    const input = inputRef.current;
    const caret = start + word.length;
    const next = value.slice(0, start) + name + value.slice(caret);
    setValue(next);
    setMenu(null);
    requestAnimationFrame(() => { if (input) { const pos = start + name.length; input.selectionStart = input.selectionEnd = pos; input.focus(); } });
  };

  // Tab: complete the word under the cursor. Single match → fill; many → open a menu.
  const tryComplete = () => {
    const input = inputRef.current; if (!input) return;
    const caret = input.selectionStart ?? value.length;
    const { word, start } = wordBeforeCursor(value, caret);
    if (!word) return;
    const lc = word.toLowerCase();
    // Prefix matches first (case-insensitive), exact-case prefixes ranked ahead.
    const matches = completions.filter((n) => n.toLowerCase().startsWith(lc));
    if (matches.length === 0) return;
    if (matches.length === 1) { applyCompletion(matches[0], start, word); return; }
    // Extend to the longest common prefix before showing the menu.
    const lcp = matches.reduce((p, s) => { let i = 0; while (i < p.length && i < s.length && p[i].toLowerCase() === s[i].toLowerCase()) i++; return p.slice(0, i); });
    let currentWord = word;
    if (lcp.length > word.length) {
      currentWord = lcp;
      setValue(value.slice(0, start) + lcp + value.slice(start + word.length));
      requestAnimationFrame(() => { if (input) { const pos = start + lcp.length; input.selectionStart = input.selectionEnd = pos; } });
    }
    setMenu({ items: matches.slice(0, MAX_COMPLETIONS), sel: 0, word: currentWord, start });
  };

  const submit = () => {
    const v = value;
    if (prompt === null && v.trim() === '') return;
    if (prompt === null && v.trim()) { setHistory((h) => [...h, v]); }
    setHIdx(-1);
    setValue('');
    setMenu(null);
    onSubmit(v);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab autocompletion (disabled while answering an input() prompt).
    if (e.key === 'Tab' && prompt === null) { e.preventDefault(); tryComplete(); return; }
    if (e.key === 'Enter' && e.shiftKey) { setMenu(null); return; }
    // When the completion menu is open, arrows/Enter/Tab navigate & accept it.
    if (menu) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenu({ ...menu, sel: (menu.sel + 1) % menu.items.length }); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenu({ ...menu, sel: (menu.sel - 1 + menu.items.length) % menu.items.length }); return; }
      if (e.key === 'Enter') { e.preventDefault(); applyCompletion(menu.items[menu.sel], menu.start, menu.word); return; }
      if (e.key === 'Escape') { e.preventDefault(); setMenu(null); return; }
    }
    if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
    if (prompt !== null) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      if (hIdx < 0) draftRef.current = value;   // entering history: stash the unsubmitted draft
      const ni = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(ni); setValue(history[ni]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIdx < 0) return;
      const ni = hIdx + 1;
      if (ni >= history.length) { setHIdx(-1); setValue(draftRef.current); } else { setHIdx(ni); setValue(history[ni]); }  // restore the stashed draft past the newest entry
    }
  };

  return (
    <div className="mlab__term">
      <div className="mlab__pane-head">
        <span>Command Window</span>
        <button className="mlab__mini" onClick={onClear} title="Clear">clear</button>
      </div>
      <div
        className="mlab__scroll"
        ref={scrollRef}
        onMouseUp={() => { if (!window.getSelection()?.toString()) inputRef.current?.focus(); }}
      >
        {lines.map((l, i) => (
          <pre key={i} className={`mlab__line mlab__line--${l.kind}`}>{renderLine(l.kind === 'cmd' ? '>> ' + l.text : l.text, onSubmit)}</pre>
        ))}
        <div className="mlab__prompt-row">
          <span className="mlab__caret">{prompt !== null ? '' : '>>'}</span>
          <div className="mlab__input-wrap">
          {menu && (
            <ul className="mlab__ac" role="listbox">
              {menu.items.map((it, j) => (
                <li
                  key={it}
                  role="option"
                  aria-selected={j === menu.sel}
                  className={'mlab__ac-item' + (j === menu.sel ? ' mlab__ac-item--sel' : '')}
                  onMouseDown={(e) => { e.preventDefault(); applyCompletion(it, menu.start, menu.word); }}
                  onMouseEnter={() => setMenu({ ...menu, sel: j })}
                >{it}</li>
              ))}
            </ul>
          )}
          <textarea
            ref={inputRef}
            className="mlab__input"
            value={value}
            rows={1}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={busy ? 'running…' : prompt !== null ? 'enter a value…' : ''}
            onChange={(e) => { setValue(e.target.value); setMenu(null); }}
            onBlur={() => setMenu(null)}
            onKeyDown={onKey}
          />
          </div>
        </div>
      </div>
    </div>
  );
}
