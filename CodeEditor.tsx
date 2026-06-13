/** Code editor with MATLAB syntax highlighting (highlighted <pre> behind a transparent <textarea>). */
import { useMemo, useRef } from 'react';
import { highlightMatlab } from './matlab/highlight';

export default function CodeEditor({
  value, textareaRef, onChange, onKeyDown, onKeyUp, onClick, wrapClassName,
}: {
  value: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onClick?: React.MouseEventHandler<HTMLTextAreaElement>;
  wrapClassName?: string;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const segs = useMemo(() => highlightMatlab(value), [value]);

  return (
    <div className={'mlab__editarea' + (wrapClassName ? ' ' + wrapClassName : '')}>
      <pre className="mlab__hl" aria-hidden="true" ref={preRef}>
        <code>
          {segs.map((s, i) => (
            <span key={i} className={s.t === 'plain' ? undefined : 'tok-' + s.t}>{s.v}</span>
          ))}
        </code>
      </pre>
      <textarea
        ref={textareaRef}
        className="mlab__code"
        value={value}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onClick={onClick}
        onScroll={(e) => {
          const ta = e.currentTarget;
          if (preRef.current) { preRef.current.scrollTop = ta.scrollTop; preRef.current.scrollLeft = ta.scrollLeft; }
        }}
      />
    </div>
  );
}
