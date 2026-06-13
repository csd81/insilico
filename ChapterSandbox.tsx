/** Compact MATLAB runner embedded at the bottom of a chapter page. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../shared/providers/LanguageProvider';
import { FOLDERS, type MFile } from './library';
import { useSandbox } from './useSandbox';
import CodeEditor from './CodeEditor';
import CommandWindow from './CommandWindow';
import FigurePane from './FigurePane';
import '../pages/sandbox.css';

export default function ChapterSandbox({ slug }: { slug: string }) {
  const { lang } = useLang();
  const folderId = 'chapter/' + slug;
  const folder = FOLDERS.find((f) => f.id === folderId);
  const [open, setOpen] = useState(false);

  if (!folder || folder.files.length === 0) return null;
  return (
    <details className="mlab-embed" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="mlab-embed__summary">
        🧮 {lang === 'hu' ? 'Próbáld ki: MATLAB futtató (ez a fejezet)' : 'Try it: MATLAB runner (this chapter)'}
      </summary>
      {open && <ChapterRunner folderId={folderId} files={folder.files} />}
    </details>
  );
}

function ChapterRunner({ folderId, files }: { folderId: string; files: MFile[] }) {
  const { lang } = useLang();
  const lf = (s: string) => s.replace(/\r\n?/g, '\n');
  const [openId, setOpenId] = useState(files[0].id);
  const [editor, setEditor] = useState(lf(files[0].source));
  const { lines, fig, busy, prompt, completions, runSource, submit, clearConsole } = useSandbox(folderId);
  // Fall back to the first file if openId is stale (e.g. navigating to a chapter whose files
  // don't contain the previously-open id) so the editor never gets stuck on the old chapter.
  useEffect(() => { const f = files.find((x) => x.id === openId) ?? files[0]; if (f.id !== openId) setOpenId(f.id); setEditor(lf(f.source)); }, [openId, files]);
  const t = (en: string, hu: string) => (lang === 'hu' ? hu : en);

  return (
    <div className="mlab-embed__body">
      <div className="mlab-embed__bar">
        <select className="mlab-embed__select" value={openId} onChange={(e) => setOpenId(e.target.value)}>
          {files.map((f) => <option key={f.id} value={f.id}>{f.file}</option>)}
        </select>
        <button className="mlab__run" disabled={busy} onClick={() => runSource(editor)}>▶ {t('Run', 'Futtatás')}</button>
        <span className="mlab__spacer" />
        <Link className="mlab-embed__full" to="/sandbox">{t('Open full sandbox →', 'Teljes homokozó →')}</Link>
      </div>
      <div className="mlab-embed__cols">
        <CodeEditor value={editor} wrapClassName="mlab-embed__code" onChange={(e) => setEditor(e.target.value)} />
        <div className="mlab-embed__fig"><FigurePane fig={fig} /></div>
      </div>
      <CommandWindow lines={lines} busy={busy} prompt={prompt} completions={completions} onSubmit={submit} onClear={clearConsole} />
    </div>
  );
}
