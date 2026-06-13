import { useState } from 'react';
import { useSandbox } from './hooks/useSandbox';
import { useTheme } from './providers/ThemeProvider';
import CodeEditor from './components/CodeEditor';
import CommandWindow from './components/CommandWindow';
import FigurePane from './components/FigurePane';

const STARTER = `x = linspace(0, 2*pi, 100);
plot(x, sin(x), x, cos(x));
legend('sin', 'cos');
title('Trigonometric functions');`;

export default function App() {
  const [code, setCode] = useState(STARTER);
  const { theme, toggle } = useTheme();
  const { lines, fig, busy, prompt, completions, runSource, submit, clearConsole, resetSession, abort } = useSandbox('standalone');

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">insilico</span>
        <span className="app-sub">MATLAB sandbox</span>
        <div className="app-toolbar">
          <button className="app-btn" disabled={busy} onClick={() => runSource(code)}>▶ Run</button>
          {busy && <button className="app-btn app-btn--abort" onClick={abort}>■ Stop</button>}
          <button className="app-btn app-btn--ghost" onClick={resetSession}>Reset</button>
          <button className="app-btn app-btn--ghost" onClick={toggle}>{theme === 'dark' ? '☀' : '☾'}</button>
        </div>
      </header>
      <main className="app-main">
        <section className="app-editor">
          <CodeEditor value={code} onChange={(e) => setCode(e.target.value)} />
        </section>
        <section className="app-figure">
          <FigurePane fig={fig} />
        </section>
      </main>
      <section className="app-console">
        <CommandWindow lines={lines} busy={busy} prompt={prompt} completions={completions} onSubmit={submit} onClear={clearConsole} />
      </section>
    </div>
  );
}
