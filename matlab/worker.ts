/**
 * Web Worker host for the MATLAB interpreter. Runs the whole `Session` off the
 * main thread so the browser UI never freezes, and supports cooperative Abort:
 * a long-running loop periodically yields via `onTick`, letting the worker
 * process an "abort" message and throw to stop the run (workspace is preserved).
 */
import { createSession, type Session } from './index';

type ToWorker =
  | { type: 'reset'; preload: string[] }
  | { type: 'run'; id: number; src: string }
  | { type: 'inputReply'; value: string }
  | { type: 'abort' }
  | { type: 'putFile'; name: string; bytes: Uint8Array }
  | { type: 'getFile'; id: number; name: string }
  | { type: 'deleteFile'; name: string };

type FromWorker =
  | { type: 'output'; text: string }
  | { type: 'clear' }
  | { type: 'input'; prompt: string }
  | { type: 'figure'; fig: unknown }
  | { type: 'workspace'; vars: unknown }
  | { type: 'files'; names: string[] }
  | { type: 'completions'; names: string[] }
  | { type: 'fileData'; id: number; name: string; bytes: Uint8Array | null }
  | { type: 'done'; id: number; error?: string };

const post = (m: FromWorker) => (self as unknown as Worker).postMessage(m);

// Reusable macrotask yield: posting on a MessageChannel returns control to the
// worker event loop, so a queued "abort" message gets a chance to run. Use a FIFO
// queue of resolvers so overlapping yields (e.g. a reset arriving mid-run) can't
// clobber each other and leak a pending promise.
const yieldResolves: (() => void)[] = [];
const tickChannel = new MessageChannel();
tickChannel.port1.onmessage = () => { yieldResolves.shift()?.(); };
const macrotaskYield = () => new Promise<void>((res) => { yieldResolves.push(res); tickChannel.port2.postMessage(0); });

let aborted = false;
let inputResolve: ((v: string) => void) | null = null;
let preload: string[] = [];
let session: Session | null = null;
// Bumped on every reset/run so a run that resumes after being superseded (e.g. a reset
// arrived mid-run and rebuilt `session`) can detect it and not post stale figure/done.
let runToken = 0;

function makeSession() {
  session = createSession({
    onOutput: (text) => post({ type: 'output', text }),
    onClearConsole: () => post({ type: 'clear' }),
    requestInput: (prompt) => new Promise<string>((resolve) => { inputResolve = resolve; post({ type: 'input', prompt }); }),
    onTick: async () => {
      await macrotaskYield();
      if (aborted) throw new Error('Operation terminated by user.');
    },
    preload,
  });
}

self.onmessage = async (ev: MessageEvent<ToWorker>) => {
  const msg = ev.data;
  switch (msg.type) {
    case 'reset':
      // Stop any in-flight run and unblock a pending input() before rebuilding.
      runToken++;        // supersede any in-flight run so it won't post against the new session
      aborted = true;
      if (inputResolve) { const r = inputResolve; inputResolve = null; r(''); }
      preload = msg.preload;
      makeSession();
      post({ type: 'completions', names: session!.completions() });
      return;   // `aborted` stays set until the next 'run' clears it (so a stale run can't continue)
    case 'inputReply':
      { const r = inputResolve; inputResolve = null; r?.(msg.value); }
      return;
    case 'abort':
      aborted = true;
      // Wake an interpreter parked on input() so it can observe the abort and throw.
      if (inputResolve) { const r = inputResolve; inputResolve = null; r(''); }
      return;
    case 'putFile':
      if (!session) makeSession();
      session!.putFile(msg.name, msg.bytes);
      post({ type: 'files', names: session!.listFiles() });
      return;
    case 'getFile':
      if (!session) makeSession();
      post({ type: 'fileData', id: msg.id, name: msg.name, bytes: session!.getFile(msg.name) });
      return;
    case 'deleteFile':
      if (!session) makeSession();
      session!.deleteFile(msg.name);
      post({ type: 'files', names: session!.listFiles() });
      return;
    case 'run': {
      const token = ++runToken;
      if (!session) makeSession();
      const runSession = session!;     // capture: a mid-run reset may replace `session`
      aborted = false;
      const res = await runSession.run(msg.src);
      // If a reset or newer run superseded us while awaiting, don't post stale state.
      if (token !== runToken || session !== runSession) return;
      // Stream the resulting figure + workspace + file list back, then signal completion.
      post({ type: 'figure', fig: runSession.getFigure() });
      post({ type: 'workspace', vars: runSession.workspace() });
      post({ type: 'files', names: runSession.listFiles() });
      post({ type: 'completions', names: runSession.completions() });
      post({ type: 'done', id: msg.id, error: res.error });
      return;
    }
  }
};
