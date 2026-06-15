// Parallel Computing Toolbox — stubs for parfor, spmd, gpuArray, parpool, gcp, etc.
// In the web sandbox, true parallelism is unavailable; these execute sequentially or
// pass through data unchanged, preserving script compatibility.
import {
  type Value, scalar, rowVec, toArray, asScalar, toMat as m, isMat, MatError,
  mat, zeros, makeObject, isObject, str, bool,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_PARALLEL } from '../help/help-parallel';

const noop = async (_args: Value[]): Promise<Value[]> => [scalar(0)];

// ── parpool: return a stub parallel pool object ────────────────────────────────────────
async function parpool(args: Value[]): Promise<Value[]> {
  const workers = args.length > 0 && isMat(args[0]) ? asScalar(m(args[0])) : 1;
  const props = new Map<string, Value>();
  props.set('NumWorkers', scalar(workers));
  props.set('SpmdEnabled', bool(false));
  props.set('IdleTimeout', scalar(30));
  props.set('PoolSize', scalar(workers));
  return [makeObject('parallel.Pool', props)];
}

// ── gcp: get current parallel pool (returns empty if none) ────────────────────────────
async function gcp(args: Value[]): Promise<Value[]> {
  const createIfNone = args.length === 0 || asScalar(m(args[0])) !== 0;
  if (!createIfNone) return [makeObject('parallel.Pool', new Map())];
  return parpool([scalar(1)]);
}

// ── gpuarray: pass-through (no GPU in browser) ────────────────────────────────────────
async function gpuArray(args: Value[]): Promise<Value[]> {
  if (args.length === 0) throw new MatError('gpuArray: requires input array');
  return [args[0]]; // return as-is (already a CPU mat)
}

// ── gather: retrieve data from GPU array (no-op) ──────────────────────────────────────
async function gather(args: Value[]): Promise<Value[]> {
  if (args.length === 0) throw new MatError('gather: requires input');
  return [args[0]];
}

// ── isgpuarray: always false in sandbox ──────────────────────────────────────────────
async function isgpuarray(args: Value[]): Promise<Value[]> {
  return [bool(false)];
}

// ── pagefun: apply function to pages of N-D array ────────────────────────────────────
async function pagefun(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('pagefun: requires function and array');
  // No N-D array support yet — return input array unchanged
  return [args[1]];
}

// ── spmd helpers (no-op or pass-through) ─────────────────────────────────────────────
async function spmdindex(_args: Value[]): Promise<Value[]> { return [scalar(1)]; }
async function spmdsize(_args: Value[]): Promise<Value[]> { return [scalar(1)]; }

// ── distributed: pass-through ────────────────────────────────────────────────────────
async function distributed(args: Value[]): Promise<Value[]> {
  if (args.length === 0) throw new MatError('distributed: requires input array');
  return [args[0]];
}

// ── codistributed: pass-through ───────────────────────────────────────────────────────
async function codistributed(args: Value[]): Promise<Value[]> {
  if (args.length === 0) throw new MatError('codistributed: requires input array');
  return [args[0]];
}

// ── batch: submit batch job (returns stub job object) ────────────────────────────────
async function batch(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  props.set('State', str('finished'));
  props.set('NumWorkers', scalar(1));
  return [makeObject('parallel.Job', props)];
}

// ── gputimeit: stub timing ────────────────────────────────────────────────────────────
async function gputimeit(args: Value[]): Promise<Value[]> { return [scalar(0)]; }

// ── validategpu: always throws/warns in sandbox ───────────────────────────────────────
async function validategpu(_args: Value[]): Promise<Value[]> { return [scalar(0)]; }

// ── parfeval: evaluate function asynchronously (sequential in sandbox) ────────────────
// parfeval(pool, fcn, nargout, X1,...,Xn) — runs fcn(X1,...) synchronously and wraps in a
// Future-like object; fetchOutputs(f) retrieves the results.
async function parfeval(args: Value[]): Promise<Value[]> {
  // Accept both parfeval(pool,fcn,nargout,X...) and parfeval(fcn,nargout,X...):
  // if the first arg is itself a function handle, there is no pool argument.
  const noPool = !!args[0] && (args[0] as any).kind === 'handle';
  const fn = noPool ? args[0] : args[1];
  if (!fn || (fn as any).kind !== 'handle') throw new MatError('parfeval: a function handle is required');
  const nArgIdx = noPool ? 1 : 2;
  const nOut = isMat(args[nArgIdx]) ? Math.round(asScalar(m(args[nArgIdx]))) : 1;
  const inputs = args.slice(nArgIdx + 1);
  // Execute synchronously in the sandbox; store results in the future object
  const h = fn as unknown as { call: (a: Value[], nargout: number) => Promise<Value[]> };
  const results = await h.call(inputs, nOut);
  const props = new Map<string, Value>();
  props.set('State', str('finished'));
  props.set('NumOutputArguments', scalar(nOut));
  // Store outputs as a cell-array-like object indexed 1..nOut
  for (let i = 0; i < nOut; i++) props.set(`Output${i + 1}`, results[i] ?? scalar(0));
  return [makeObject('parallel.FevalFuture', props)];
}

// ── fetchOutputs: retrieve the stored results of a completed parfeval future ────────────────
async function fetchOutputs(args: Value[]): Promise<Value[]> {
  const f = args[0];
  if (!isObject(f) || f.className !== 'parallel.FevalFuture') {
    throw new MatError('fetchOutputs: first argument must be a parfeval future (parallel.FevalFuture)');
  }
  const n = Math.round(asScalar(m(f.props.get('NumOutputArguments') ?? scalar(0))));
  const out: Value[] = [];
  for (let i = 0; i < n; i++) out.push(f.props.get(`Output${i + 1}`) ?? scalar(0));
  return out.length ? out : [scalar(0)];
}

export const PARALLEL: ToolboxModule = {
  id: 'parallel-computing',
  name: 'Parallel Computing Toolbox',
  docBase: 'https://www.mathworks.com/help/parallel-computing/',
  builtins: {
    parpool,
    gcp,
    gpuArray,
    gather,
    isgpuarray,
    pagefun,
    spmdindex,
    spmdsize,
    distributed,
    codistributed,
    batch,
    gputimeit,
    validategpu,
    parfeval,
    fetchOutputs,
    spmdbarrier: noop,
    spmdbroadcast: async (args) => args.length > 1 ? [args[1]] : [scalar(0)],
    spmdcat: async (args) => args.length > 0 ? [args[0]] : [scalar(0)],
    spmdplus: noop,
    spmdprobe: noop,
    spmdreduce: async (args) => args.length > 0 ? [args[0]] : [scalar(0)],
    spmdsend: noop,
    spmdsendreceive: async (args) => args.length > 0 ? [args[0]] : [scalar(0)],
  },
  help: HELP_PARALLEL,
};
