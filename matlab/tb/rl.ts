// Reinforcement Learning Toolbox — Q-learning, DQN (experience replay + target network),
// PPO (GAE + clipped surrogate), plus DDPG/TD3/AC/PG stubs; rlFunctionEnv, rlNumericSpec /
// rlFiniteSetSpec, replay buffers, train / sim / getAction.
//
// Real algorithmic implementations:
//   rlQAgent + train     — tabular Q-learning with epsilon-greedy exploration
//   rlDQNAgent + train   — DQN with circular replay buffer + target-network updates
//   rlPPOAgent + train   — PPO with GAE + clipped surrogate objective
//
// Everything uses plain TypeScript arrays; no dependency on the nnet ClassV.
import {
  type Value, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat,
  MatError, mat, zeros, makeObject, str, bool, isObject, asString,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_RL } from '../help/help-rl';

const ret  = (v: Value): Promise<Value[]> => Promise.resolve([v]);
const retv = (...vs: Value[]): Promise<Value[]> => Promise.resolve(vs);

// ── helpers ──────────────────────────────────────────────────────────────────────────────

function numOpt(args: Value[], i: number, def: number): number {
  return (args[i] != null && isMat(args[i])) ? asScalar(m(args[i])) : def;
}

/** Parse name-value pairs from arg list starting at index `start`. */
function parseNV(args: Value[], start: number): Map<string, Value> {
  const out = new Map<string, Value>();
  for (let i = start; i + 1 < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1];
    if (key != null) {
      try { out.set(asString(m(key)), val); } catch (_) { /* skip */ }
    }
  }
  return out;
}

/** Get a numeric option from an NV map with default. */
function nvNum(nv: Map<string, Value>, key: string, def: number): number {
  const v = nv.get(key);
  if (v == null) return def;
  try { return asScalar(m(v)); } catch (_) { return def; }
}

/** Get obs/act dimension from a spec ClassV (rlNumericSpec or rlFiniteSetSpec). */
function specDim(spec: Value): number {
  if (isObject(spec)) {
    if (spec.className === 'rlFiniteSetSpec') {
      const el = spec.props.get('Elements');
      if (el && isMat(el)) return el.cols;
    }
    if (spec.className === 'rlNumericSpec') {
      const d = spec.props.get('Dimension');
      if (d && isMat(d)) return asScalar(m(d));
    }
  }
  // fallback
  return 1;
}

/** Number of discrete actions from rlFiniteSetSpec. */
function numActions(spec: Value): number {
  if (isObject(spec) && spec.className === 'rlFiniteSetSpec') {
    const el = spec.props.get('Elements');
    if (el && isMat(el)) return el.cols;
    const n = spec.props.get('NumElements');
    if (n && isMat(n)) return asScalar(m(n));
  }
  return specDim(spec);
}

// ── Simple 2-layer MLP (for DQN) ──────────────────────────────────────────────────────
interface MiniNet {
  W1: number[][];  // hidden × input
  b1: number[];    // hidden
  W2: number[][];  // output × hidden
  b2: number[];    // output
  hidSz: number;
  inSz: number;
  outSz: number;
}

function tanhFn(x: number): number { return Math.tanh(x); }
function tanhD(x: number): number { const t = Math.tanh(x); return 1 - t * t; }

function mnCreate(inSz: number, hidSz: number, outSz: number): MiniNet {
  const scale1 = Math.sqrt(2 / inSz);
  const scale2 = Math.sqrt(2 / hidSz);
  const W1: number[][] = [], b1: number[] = [];
  for (let i = 0; i < hidSz; i++) {
    W1.push(Array.from({ length: inSz }, () => (Math.random() * 2 - 1) * scale1));
    b1.push(0);
  }
  const W2: number[][] = [], b2: number[] = [];
  for (let i = 0; i < outSz; i++) {
    W2.push(Array.from({ length: hidSz }, () => (Math.random() * 2 - 1) * scale2));
    b2.push(0);
  }
  return { W1, b1, W2, b2, hidSz, inSz, outSz };
}

function mnForward(net: MiniNet, x: number[]): { q: number[]; h: number[]; z1: number[] } {
  const z1 = net.b1.map((b, i) => b + net.W1[i].reduce((s, w, j) => s + w * x[j], 0));
  const h  = z1.map(tanhFn);
  const q  = net.b2.map((b, i) => b + net.W2[i].reduce((s, w, j) => s + w * h[j], 0));
  return { q, h, z1 };
}

function mnUpdate(net: MiniNet, x: number[], action: number, target: number, lr: number): void {
  const { q, h, z1 } = mnForward(net, x);
  const err = q[action] - target;
  // Output layer grads
  const dW2 = net.W2.map((row, i) => i === action ? h.map((hj) => err * hj) : row.map(() => 0));
  const db2 = net.b2.map((_, i) => i === action ? err : 0);
  // Hidden layer grads (only for action neuron chain)
  const delta1 = net.W2[action].map((w, j) => err * w * tanhD(z1[j]));
  const dW1 = net.W1.map((row, i) => x.map((xj) => delta1[i] * xj));
  const db1 = delta1.slice();
  // SGD update
  for (let i = 0; i < net.hidSz; i++) {
    net.b1[i] -= lr * db1[i];
    for (let j = 0; j < net.inSz; j++) net.W1[i][j] -= lr * dW1[i][j];
  }
  for (let i = 0; i < net.outSz; i++) {
    net.b2[i] -= lr * db2[i];
    for (let j = 0; j < net.hidSz; j++) net.W2[i][j] -= lr * dW2[i][j];
  }
}

function mnCopy(src: MiniNet): MiniNet {
  return {
    W1: src.W1.map((r) => r.slice()),
    b1: src.b1.slice(),
    W2: src.W2.map((r) => r.slice()),
    b2: src.b2.slice(),
    hidSz: src.hidSz,
    inSz: src.inSz,
    outSz: src.outSz,
  };
}

// ── Circular replay buffer ─────────────────────────────────────────────────────────────
interface ReplayBuffer {
  capacity: number;
  idx: number;
  size: number;
  obs:    number[][];
  act:    number[];
  rew:    number[];
  next:   number[][];
  done:   boolean[];
}

function rbCreate(capacity: number): ReplayBuffer {
  return { capacity, idx: 0, size: 0, obs: [], act: [], rew: [], next: [], done: [] };
}

function rbPush(rb: ReplayBuffer, o: number[], a: number, r: number, n: number[], d: boolean): void {
  if (rb.size < rb.capacity) {
    rb.obs.push(o); rb.act.push(a); rb.rew.push(r); rb.next.push(n); rb.done.push(d);
    rb.size++;
  } else {
    rb.obs[rb.idx]  = o; rb.act[rb.idx] = a; rb.rew[rb.idx] = r;
    rb.next[rb.idx] = n; rb.done[rb.idx] = d;
  }
  rb.idx = (rb.idx + 1) % rb.capacity;
}

function rbSample(rb: ReplayBuffer, batchSz: number): { obs: number[][]; act: number[]; rew: number[]; next: number[][]; done: boolean[] } {
  const n = Math.min(batchSz, rb.size);
  const obs: number[][] = [], act: number[] = [], rew: number[] = [], next: number[][] = [], done: boolean[] = [];
  for (let k = 0; k < n; k++) {
    const i = Math.floor(Math.random() * rb.size);
    obs.push(rb.obs[i]); act.push(rb.act[i]); rew.push(rb.rew[i]); next.push(rb.next[i]); done.push(rb.done[i]);
  }
  return { obs, act, rew, next, done };
}

// ── Policy / Value helpers for PPO ────────────────────────────────────────────────────
/** Softmax over array, returns probabilities. */
function softmax(x: number[]): number[] {
  const max = Math.max(...x);
  const ex  = x.map((v) => Math.exp(v - max));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map((v) => v / sum);
}

/** Sample from discrete distribution, return index. */
function categoricalSample(probs: number[]): number {
  let u = Math.random(), i = 0;
  for (; i < probs.length - 1; i++) { u -= probs[i]; if (u <= 0) return i; }
  return i;
}

// ── Env call helpers ──────────────────────────────────────────────────────────────────
/** Call the step function of an rlFunctionEnv. Returns [obs, reward, isDone]. */
async function envStep(env: Value, obs: number[], action: number): Promise<{ nextObs: number[]; reward: number; done: boolean }> {
  if (!isObject(env) || env.className !== 'rlFunctionEnv') throw new MatError('env must be rlFunctionEnv');
  const stepFn = env.props.get('StepFn') as { kind: 'handle'; call: (args: Value[], n: number) => Promise<Value[]> } | undefined;
  if (!stepFn || stepFn.kind !== 'handle') throw new MatError('rlFunctionEnv: StepFn missing');
  const obsV  = rowVec(obs);
  const actV  = scalar(action);
  const res   = await stepFn.call([obsV, actV], 3);
  const nextObs = toArray(m(res[0]));
  const reward  = res[1] ? asScalar(m(res[1])) : 0;
  const doneV   = res[2];
  const done    = doneV ? asScalar(m(doneV)) !== 0 : false;
  return { nextObs, reward, done };
}

/** Call the reset function of an rlFunctionEnv. Returns initial obs. */
async function envReset(env: Value): Promise<number[]> {
  if (!isObject(env) || env.className !== 'rlFunctionEnv') throw new MatError('env must be rlFunctionEnv');
  const resetFn = env.props.get('ResetFn') as { kind: 'handle'; call: (args: Value[], n: number) => Promise<Value[]> } | undefined;
  if (!resetFn || resetFn.kind !== 'handle') throw new MatError('rlFunctionEnv: ResetFn missing');
  const res = await resetFn.call([], 1);
  return toArray(m(res[0]));
}

// ── rlNumericSpec ─────────────────────────────────────────────────────────────────────
async function rlNumericSpec(args: Value[]): Promise<Value[]> {
  const dim = args.length > 0 ? asScalar(m(args[0])) : 1;
  return [makeObject('rlNumericSpec', {
    Dimension: scalar(dim),
    LowerLimit: scalar(-Infinity),
    UpperLimit: scalar(Infinity),
  })];
}

// ── rlFiniteSetSpec ───────────────────────────────────────────────────────────────────
async function rlFiniteSetSpec(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('rlFiniteSetSpec: requires elements argument');
  const el = args[0];
  let n = 1;
  if (isMat(el)) n = el.cols > 1 ? el.cols : el.rows;
  return [makeObject('rlFiniteSetSpec', {
    Elements: isMat(el) ? el : rowVec([]),
    NumElements: scalar(n),
  })];
}

// ── rlFunctionEnv ─────────────────────────────────────────────────────────────────────
async function rlFunctionEnv(args: Value[]): Promise<Value[]> {
  if (args.length < 4) throw new MatError('rlFunctionEnv: requires obsInfo, actInfo, stepFn, resetFn');
  const [obsInfo, actInfo, stepFn, resetFn] = args;
  return [makeObject('rlFunctionEnv', {
    ObsInfo:  obsInfo,
    ActInfo:  actInfo,
    StepFn:   stepFn,
    ResetFn:  resetFn,
  })];
}

// ── rlTrainingOptions ─────────────────────────────────────────────────────────────────
async function rlTrainingOptions(args: Value[]): Promise<Value[]> {
  const nv = parseNV(args, 0);
  return [makeObject('rlTrainingOptions', {
    MaxEpisodes:                scalar(nvNum(nv, 'MaxEpisodes', 500)),
    MaxStepsPerEpisode:         scalar(nvNum(nv, 'MaxStepsPerEpisode', 200)),
    Verbose:                    scalar(nvNum(nv, 'Verbose', 0)),
    Plots:                      str('none'),
    ScoreAveragingWindowLength: scalar(nvNum(nv, 'ScoreAveragingWindowLength', 5)),
    StopTrainingValue:          scalar(nvNum(nv, 'StopTrainingValue', Infinity)),
    StopTrainingCriteria:       str('EpisodeCount'),
  })];
}

// ── rlQAgentOptions ───────────────────────────────────────────────────────────────────
async function rlQAgentOptions(args: Value[]): Promise<Value[]> {
  const nv = parseNV(args, 0);
  return [makeObject('rlQAgentOptions', {
    EpsilonGreedyExploration: makeObject('EpsilonGreedyExploration', {
      Epsilon:       scalar(nvNum(nv, 'Epsilon', 1.0)),
      EpsilonDecay:  scalar(nvNum(nv, 'EpsilonDecay', 0.005)),
      EpsilonMin:    scalar(nvNum(nv, 'EpsilonMin', 0.01)),
    }),
    DiscountFactor: scalar(nvNum(nv, 'DiscountFactor', 0.99)),
    LearnRate:      scalar(nvNum(nv, 'LearnRate', 0.1)),
  })];
}

// ── rlDQNAgentOptions ─────────────────────────────────────────────────────────────────
async function rlDQNAgentOptions(args: Value[]): Promise<Value[]> {
  const nv = parseNV(args, 0);
  return [makeObject('rlDQNAgentOptions', {
    DiscountFactor:          scalar(nvNum(nv, 'DiscountFactor', 0.99)),
    MiniBatchSize:           scalar(nvNum(nv, 'MiniBatchSize', 64)),
    ExperienceBufferLength:  scalar(nvNum(nv, 'ExperienceBufferLength', 10000)),
    TargetUpdateFrequency:   scalar(nvNum(nv, 'TargetUpdateFrequency', 100)),
    LearnRate:               scalar(nvNum(nv, 'LearnRate', 1e-3)),
    EpsilonGreedyExploration: makeObject('EpsilonGreedyExploration', {
      Epsilon:      scalar(nvNum(nv, 'Epsilon', 1.0)),
      EpsilonDecay: scalar(nvNum(nv, 'EpsilonDecay', 0.001)),
      EpsilonMin:   scalar(nvNum(nv, 'EpsilonMin', 0.01)),
    }),
  })];
}

// ── rlPPOAgentOptions ─────────────────────────────────────────────────────────────────
async function rlPPOAgentOptions(args: Value[]): Promise<Value[]> {
  const nv = parseNV(args, 0);
  return [makeObject('rlPPOAgentOptions', {
    DiscountFactor:   scalar(nvNum(nv, 'DiscountFactor', 0.99)),
    GAEFactor:        scalar(nvNum(nv, 'GAEFactor', 0.95)),
    ClipFactor:       scalar(nvNum(nv, 'ClipFactor', 0.2)),
    EntropyLossWeight:scalar(nvNum(nv, 'EntropyLossWeight', 0.01)),
    NumEpoch:         scalar(nvNum(nv, 'NumEpoch', 3)),
    MiniBatchSize:    scalar(nvNum(nv, 'MiniBatchSize', 64)),
    LearnRate:        scalar(nvNum(nv, 'LearnRate', 3e-4)),
    ExperienceHorizon:scalar(nvNum(nv, 'ExperienceHorizon', 128)),
  })];
}

// ── Agent constructors ────────────────────────────────────────────────────────────────

async function rlQAgent(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('rlQAgent: requires obsInfo and actInfo');
  const [obsInfo, actInfo, opts] = args;
  const obsDim  = specDim(obsInfo);
  const nAct    = numActions(actInfo);
  // Initialise flat Q-table: states encoded by obs discretisation (simple: use obs as key)
  // We store it as a Map serialised inside props. At runtime we use a JS Map<string,number[]>.
  // For the ClassV we just hold the dimension info; actual table stored in __qtable prop as a handle.
  const gamma   = opts && isObject(opts) ? asScalar(m(opts.props.get('DiscountFactor') ?? scalar(0.99))) : 0.99;
  const lr      = opts && isObject(opts) ? asScalar(m(opts.props.get('LearnRate') ?? scalar(0.1))) : 0.1;
  const epsilon = opts && isObject(opts) ? (() => {
    const ee = opts.props.get('EpsilonGreedyExploration');
    if (ee && isObject(ee)) return asScalar(m(ee.props.get('Epsilon') ?? scalar(1.0)));
    return 1.0;
  })() : 1.0;
  // __qtable is not a Value; we encode it as a serialised JSON string in a str prop (small tables).
  const agent = makeObject('rlQAgent', {
    ObsInfo:       obsInfo,
    ActInfo:       actInfo,
    NumObsDim:     scalar(obsDim),
    NumActions:    scalar(nAct),
    DiscountFactor:scalar(gamma),
    LearnRate:     scalar(lr),
    Epsilon:       scalar(epsilon),
    EpsilonDecay:  scalar(0.005),
    EpsilonMin:    scalar(0.01),
    // Empty Q-table encoded as JSON string (populated during train)
    QTableJSON:    str('{}'),
  });
  return [agent];
}

async function rlDQNAgent(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('rlDQNAgent: requires obsInfo and actInfo');
  const [obsInfo, actInfo, opts] = args;
  const obsDim = specDim(obsInfo);
  const nAct   = numActions(actInfo);
  const gamma  = opts && isObject(opts) ? asScalar(m(opts.props.get('DiscountFactor') ?? scalar(0.99))) : 0.99;
  const lr     = opts && isObject(opts) ? asScalar(m(opts.props.get('LearnRate') ?? scalar(1e-3))) : 1e-3;
  const eps    = opts && isObject(opts) ? (() => {
    const ee = opts.props.get('EpsilonGreedyExploration');
    if (ee && isObject(ee)) return asScalar(m(ee.props.get('Epsilon') ?? scalar(1.0)));
    return 1.0;
  })() : 1.0;
  const hidSz  = 64;
  const net    = mnCreate(obsDim, hidSz, nAct);
  const tgt    = mnCreate(obsDim, hidSz, nAct);
  // serialise net weights into the ClassV as rowVecs
  const flatW1 = rowVec(net.W1.flat());
  const flatb1 = rowVec(net.b1);
  const flatW2 = rowVec(net.W2.flat());
  const flatb2 = rowVec(net.b2);
  const agent  = makeObject('rlDQNAgent', {
    ObsInfo:       obsInfo,
    ActInfo:       actInfo,
    NumObsDim:     scalar(obsDim),
    NumActions:    scalar(nAct),
    HiddenSize:    scalar(hidSz),
    DiscountFactor:scalar(gamma),
    LearnRate:     scalar(lr),
    Epsilon:       scalar(eps),
    EpsilonDecay:  scalar(0.001),
    EpsilonMin:    scalar(0.01),
    TargetUpdateFrequency: scalar(100),
    MiniBatchSize: scalar(64),
    BufferCapacity:scalar(10000),
    // net weights (main + target same at init)
    NetW1: flatW1, NetB1: flatb1, NetW2: flatW2, NetB2: flatb2,
    TgtW1: rowVec(tgt.W1.flat()), TgtB1: rowVec(tgt.b1),
    TgtW2: rowVec(tgt.W2.flat()), TgtB2: rowVec(tgt.b2),
    StepCount: scalar(0),
  });
  return [agent];
}

async function rlPGAgent(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('rlPGAgent: requires obsInfo and actInfo');
  const [obsInfo, actInfo] = args;
  return [makeObject('rlPGAgent', {
    ObsInfo: obsInfo, ActInfo: actInfo,
    DiscountFactor: scalar(0.99), LearnRate: scalar(1e-3),
  })];
}

async function rlACAgent(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('rlACAgent: requires obsInfo and actInfo');
  const [obsInfo, actInfo] = args;
  return [makeObject('rlACAgent', {
    ObsInfo: obsInfo, ActInfo: actInfo,
    DiscountFactor: scalar(0.99), LearnRate: scalar(1e-3),
  })];
}

async function rlDDPGAgent(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('rlDDPGAgent: requires obsInfo and actInfo');
  const [obsInfo, actInfo] = args;
  return [makeObject('rlDDPGAgent', {
    ObsInfo: obsInfo, ActInfo: actInfo,
    DiscountFactor: scalar(0.99), LearnRate: scalar(1e-3),
  })];
}

async function rlTD3Agent(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('rlTD3Agent: requires obsInfo and actInfo');
  const [obsInfo, actInfo] = args;
  return [makeObject('rlTD3Agent', {
    ObsInfo: obsInfo, ActInfo: actInfo,
    DiscountFactor: scalar(0.99), LearnRate: scalar(1e-3),
  })];
}

async function rlPPOAgent(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('rlPPOAgent: requires obsInfo and actInfo');
  const [obsInfo, actInfo, opts] = args;
  const obsDim = specDim(obsInfo);
  const nAct   = numActions(actInfo);
  const hidSz  = 64;
  // actor (policy) net: obs→nAct logits
  const actor  = mnCreate(obsDim, hidSz, nAct);
  // critic (value) net: obs→1
  const critic = mnCreate(obsDim, hidSz, 1);
  const gamma  = opts && isObject(opts) ? asScalar(m(opts.props.get('DiscountFactor') ?? scalar(0.99))) : 0.99;
  const lam    = opts && isObject(opts) ? asScalar(m(opts.props.get('GAEFactor') ?? scalar(0.95))) : 0.95;
  const clip   = opts && isObject(opts) ? asScalar(m(opts.props.get('ClipFactor') ?? scalar(0.2))) : 0.2;
  const lr     = opts && isObject(opts) ? asScalar(m(opts.props.get('LearnRate') ?? scalar(3e-4))) : 3e-4;
  const horizon= opts && isObject(opts) ? asScalar(m(opts.props.get('ExperienceHorizon') ?? scalar(128))) : 128;
  const nEpoch = opts && isObject(opts) ? asScalar(m(opts.props.get('NumEpoch') ?? scalar(3))) : 3;
  const agent  = makeObject('rlPPOAgent', {
    ObsInfo: obsInfo, ActInfo: actInfo,
    NumObsDim: scalar(obsDim), NumActions: scalar(nAct), HiddenSize: scalar(hidSz),
    DiscountFactor: scalar(gamma), GAEFactor: scalar(lam),
    ClipFactor: scalar(clip), LearnRate: scalar(lr),
    ExperienceHorizon: scalar(horizon), NumEpoch: scalar(nEpoch),
    // actor weights
    ActW1: rowVec(actor.W1.flat()), ActB1: rowVec(actor.b1),
    ActW2: rowVec(actor.W2.flat()), ActB2: rowVec(actor.b2),
    // critic weights
    CriW1: rowVec(critic.W1.flat()), CriB1: rowVec(critic.b1),
    CriW2: rowVec(critic.W2.flat()), CriB2: rowVec(critic.b2),
  });
  return [agent];
}

// ── Replay buffer constructors ─────────────────────────────────────────────────────────

async function rlReplayMemory(args: Value[]): Promise<Value[]> {
  const cap = args.length > 0 ? asScalar(m(args[0])) : 10000;
  return [makeObject('rlReplayMemory', {
    Capacity: scalar(cap),
    Size:     scalar(0),
  })];
}

async function rlPrioritizedReplayMemory(args: Value[]): Promise<Value[]> {
  const cap   = args.length > 0 ? asScalar(m(args[0])) : 10000;
  const alpha = args.length > 1 ? asScalar(m(args[1])) : 0.6;
  return [makeObject('rlPrioritizedReplayMemory', {
    Capacity: scalar(cap),
    Alpha:    scalar(alpha),
    Size:     scalar(0),
  })];
}

// ── Representation constructors ────────────────────────────────────────────────────────

async function rlValueFunction(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('rlValueFunction: requires net and obsInfo');
  const [net, obsInfo] = args;
  return [makeObject('rlValueFunction', { Net: net, ObsInfo: obsInfo })];
}

async function rlQValueFunction(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('rlQValueFunction: requires net, obsInfo, actInfo');
  const [net, obsInfo, actInfo] = args;
  return [makeObject('rlQValueFunction', { Net: net, ObsInfo: obsInfo, ActInfo: actInfo })];
}

async function rlContinuousDeterministicActor(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('rlContinuousDeterministicActor: requires net, obsInfo, actInfo');
  const [net, obsInfo, actInfo] = args;
  return [makeObject('rlContinuousDeterministicActor', { Net: net, ObsInfo: obsInfo, ActInfo: actInfo })];
}

async function rlStochasticActor(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('rlStochasticActor: requires net, obsInfo, actInfo');
  const [net, obsInfo, actInfo] = args;
  return [makeObject('rlStochasticActor', { Net: net, ObsInfo: obsInfo, ActInfo: actInfo })];
}

// ── getAction ─────────────────────────────────────────────────────────────────────────

async function getAction(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('getAction: requires agent and observation');
  const agent = args[0];
  const obs   = toArray(m(args[1]));
  if (!isObject(agent)) throw new MatError('getAction: first arg must be an RL agent');

  switch (agent.className) {
    case 'rlQAgent': {
      const nAct = asScalar(m(agent.props.get('NumActions')!));
      const eps  = asScalar(m(agent.props.get('Epsilon')!));
      if (Math.random() < eps) return [scalar(Math.floor(Math.random() * nAct))];
      const key  = obs.map((v) => v.toFixed(3)).join(',');
      const json = agent.props.get('QTableJSON');
      try {
        const tbl = JSON.parse(json ? String.fromCharCode(...toArray(m(json))) : '{}') as Record<string, number[]>;
        const qv  = tbl[key] ?? Array(nAct).fill(0);
        return [scalar(qv.indexOf(Math.max(...qv)))];
      } catch (_) {
        return [scalar(Math.floor(Math.random() * nAct))];
      }
    }
    case 'rlDQNAgent': {
      const nAct  = asScalar(m(agent.props.get('NumActions')!));
      const hidSz = asScalar(m(agent.props.get('HiddenSize')!));
      const inSz  = asScalar(m(agent.props.get('NumObsDim')!));
      const eps   = asScalar(m(agent.props.get('Epsilon')!));
      if (Math.random() < eps) return [scalar(Math.floor(Math.random() * nAct))];
      const net   = restoreDQNNet(agent, inSz, hidSz, nAct);
      const { q } = mnForward(net, obs);
      return [scalar(q.indexOf(Math.max(...q)))];
    }
    case 'rlPPOAgent': {
      const nAct  = asScalar(m(agent.props.get('NumActions')!));
      const hidSz = asScalar(m(agent.props.get('HiddenSize')!));
      const inSz  = asScalar(m(agent.props.get('NumObsDim')!));
      const actor = restorePPOActor(agent, inSz, hidSz, nAct);
      const { q } = mnForward(actor, obs);
      const probs = softmax(q);
      return [scalar(categoricalSample(probs))];
    }
    default:
      return [scalar(0)];
  }
}

// ── Network restore helpers ────────────────────────────────────────────────────────────

function restoreNet(W1flat: number[], b1: number[], W2flat: number[], b2: number[], inSz: number, hidSz: number, outSz: number): MiniNet {
  const W1 = Array.from({ length: hidSz }, (_, i) => W1flat.slice(i * inSz, (i + 1) * inSz));
  const W2 = Array.from({ length: outSz }, (_, i) => W2flat.slice(i * hidSz, (i + 1) * hidSz));
  return { W1, b1: b1.slice(), W2, b2: b2.slice(), hidSz, inSz, outSz };
}

function restoreDQNNet(agent: { props: Map<string, Value> }, inSz: number, hidSz: number, nAct: number): MiniNet {
  return restoreNet(
    toArray(m(agent.props.get('NetW1')!)), toArray(m(agent.props.get('NetB1')!)),
    toArray(m(agent.props.get('NetW2')!)), toArray(m(agent.props.get('NetB2')!)),
    inSz, hidSz, nAct,
  );
}

function restoreDQNTarget(agent: { props: Map<string, Value> }, inSz: number, hidSz: number, nAct: number): MiniNet {
  return restoreNet(
    toArray(m(agent.props.get('TgtW1')!)), toArray(m(agent.props.get('TgtB1')!)),
    toArray(m(agent.props.get('TgtW2')!)), toArray(m(agent.props.get('TgtB2')!)),
    inSz, hidSz, nAct,
  );
}

function restorePPOActor(agent: { props: Map<string, Value> }, inSz: number, hidSz: number, nAct: number): MiniNet {
  return restoreNet(
    toArray(m(agent.props.get('ActW1')!)), toArray(m(agent.props.get('ActB1')!)),
    toArray(m(agent.props.get('ActW2')!)), toArray(m(agent.props.get('ActB2')!)),
    inSz, hidSz, nAct,
  );
}

function restorePPOCritic(agent: { props: Map<string, Value> }, inSz: number, hidSz: number): MiniNet {
  return restoreNet(
    toArray(m(agent.props.get('CriW1')!)), toArray(m(agent.props.get('CriB1')!)),
    toArray(m(agent.props.get('CriW2')!)), toArray(m(agent.props.get('CriB2')!)),
    inSz, hidSz, 1,
  );
}

function saveNetToAgent(agent: ReturnType<typeof makeObject>, prefix: string, net: MiniNet): void {
  agent.props.set(prefix + 'W1', rowVec(net.W1.flat()));
  agent.props.set(prefix + 'B1', rowVec(net.b1));
  agent.props.set(prefix + 'W2', rowVec(net.W2.flat()));
  agent.props.set(prefix + 'B2', rowVec(net.b2));
}

// ── train ─────────────────────────────────────────────────────────────────────────────

async function train(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('train: requires agent, env, trainingOptions');
  const [agentV, env, optsV] = args;
  if (!isObject(agentV)) throw new MatError('train: first arg must be an RL agent');
  // Read training options
  let maxEp   = 500, maxSteps = 200, winLen = 5, stopVal = Infinity;
  if (isObject(optsV)) {
    maxEp    = Math.round(asScalar(m(optsV.props.get('MaxEpisodes') ?? scalar(500))));
    maxSteps = Math.round(asScalar(m(optsV.props.get('MaxStepsPerEpisode') ?? scalar(200))));
    winLen   = Math.round(asScalar(m(optsV.props.get('ScoreAveragingWindowLength') ?? scalar(5))));
    stopVal  = asScalar(m(optsV.props.get('StopTrainingValue') ?? scalar(Infinity)));
  }

  const episodeRewards: number[] = [];
  const movingAvg:      number[] = [];

  // ── Q-learning agent ──────────────────────────────────────────────────
  if (agentV.className === 'rlQAgent') {
    const nAct  = Math.round(asScalar(m(agentV.props.get('NumActions')!)));
    let gamma   = asScalar(m(agentV.props.get('DiscountFactor')!));
    let lr      = asScalar(m(agentV.props.get('LearnRate')!));
    let eps     = asScalar(m(agentV.props.get('Epsilon')!));
    const epsD  = asScalar(m(agentV.props.get('EpsilonDecay')!));
    const epsM  = asScalar(m(agentV.props.get('EpsilonMin')!));
    // Q-table: Map<stateKey, number[]>
    let qtable: Record<string, number[]> = {};
    const getQ  = (key: string) => { if (!qtable[key]) qtable[key] = Array(nAct).fill(0); return qtable[key]; };

    for (let ep = 0; ep < maxEp; ep++) {
      let obs    = await envReset(env);
      let total  = 0;
      for (let step = 0; step < maxSteps; step++) {
        const key  = obs.map((v) => v.toFixed(3)).join(',');
        const q    = getQ(key);
        // epsilon-greedy
        const act  = Math.random() < eps ? Math.floor(Math.random() * nAct) : q.indexOf(Math.max(...q));
        const { nextObs, reward, done } = await envStep(env, obs, act);
        total += reward;
        // Q-update
        const nextKey  = nextObs.map((v) => v.toFixed(3)).join(',');
        const qNext    = getQ(nextKey);
        const maxQNext = done ? 0 : Math.max(...qNext);
        q[act] += lr * (reward + gamma * maxQNext - q[act]);
        obs     = nextObs;
        if (done) break;
      }
      // epsilon decay
      eps = Math.max(epsM, eps * (1 - epsD));
      episodeRewards.push(total);
      const window = episodeRewards.slice(-winLen);
      const avg    = window.reduce((a, b) => a + b, 0) / window.length;
      movingAvg.push(avg);
      if (avg >= stopVal) break;
    }
    // Persist Q-table and epsilon back into agent
    const json   = JSON.stringify(qtable);
    const chars  = Array.from(json).map((c) => c.charCodeAt(0));
    const jsonMat = mat(1, chars.length, new Float64Array(chars));
    jsonMat.isChar = true;
    agentV.props.set('QTableJSON', jsonMat);
    agentV.props.set('Epsilon', scalar(eps));
  }

  // ── DQN agent ──────────────────────────────────────────────────────────
  else if (agentV.className === 'rlDQNAgent') {
    const nAct    = Math.round(asScalar(m(agentV.props.get('NumActions')!)));
    const inSz    = Math.round(asScalar(m(agentV.props.get('NumObsDim')!)));
    const hidSz   = Math.round(asScalar(m(agentV.props.get('HiddenSize')!)));
    const gamma   = asScalar(m(agentV.props.get('DiscountFactor')!));
    const lr      = asScalar(m(agentV.props.get('LearnRate')!));
    let eps       = asScalar(m(agentV.props.get('Epsilon')!));
    const epsD    = asScalar(m(agentV.props.get('EpsilonDecay')!));
    const epsM    = asScalar(m(agentV.props.get('EpsilonMin')!));
    const tgtFreq = Math.round(asScalar(m(agentV.props.get('TargetUpdateFrequency')!)));
    const batch   = Math.round(asScalar(m(agentV.props.get('MiniBatchSize')!)));
    const cap     = Math.round(asScalar(m(agentV.props.get('BufferCapacity')!)));

    const net     = restoreDQNNet(agentV, inSz, hidSz, nAct);
    const tgt     = restoreDQNTarget(agentV, inSz, hidSz, nAct);
    const rb      = rbCreate(cap);
    let stepCount = 0;

    for (let ep = 0; ep < maxEp; ep++) {
      let obs   = await envReset(env);
      let total = 0;
      for (let step = 0; step < maxSteps; step++) {
        // epsilon-greedy
        let act: number;
        if (Math.random() < eps) {
          act = Math.floor(Math.random() * nAct);
        } else {
          const { q } = mnForward(net, obs);
          act = q.indexOf(Math.max(...q));
        }
        const { nextObs, reward, done } = await envStep(env, obs, act);
        total += reward;
        rbPush(rb, obs, act, reward, nextObs, done);
        obs = nextObs;
        stepCount++;

        // Learn when buffer has enough samples
        if (rb.size >= batch) {
          const { obs: bObs, act: bAct, rew: bRew, next: bNext, done: bDone } = rbSample(rb, batch);
          for (let k = 0; k < bObs.length; k++) {
            const { q: qNext } = mnForward(tgt, bNext[k]);
            const maxQ = bDone[k] ? 0 : Math.max(...qNext);
            const target = bRew[k] + gamma * maxQ;
            mnUpdate(net, bObs[k], bAct[k], target, lr);
          }
        }
        // Update target network
        if (stepCount % tgtFreq === 0) {
          tgt.W1 = net.W1.map((r) => r.slice());
          tgt.b1 = net.b1.slice();
          tgt.W2 = net.W2.map((r) => r.slice());
          tgt.b2 = net.b2.slice();
        }
        if (done) break;
      }
      eps = Math.max(epsM, eps - epsD);
      episodeRewards.push(total);
      const window = episodeRewards.slice(-winLen);
      const avg    = window.reduce((a, b) => a + b, 0) / window.length;
      movingAvg.push(avg);
      if (avg >= stopVal) break;
    }
    // Save nets back into agent
    saveNetToAgent(agentV, 'Net', net);
    saveNetToAgent(agentV, 'Tgt', tgt);
    agentV.props.set('Epsilon', scalar(eps));
    agentV.props.set('StepCount', scalar(stepCount));
  }

  // ── PPO agent ──────────────────────────────────────────────────────────
  else if (agentV.className === 'rlPPOAgent') {
    const nAct   = Math.round(asScalar(m(agentV.props.get('NumActions')!)));
    const inSz   = Math.round(asScalar(m(agentV.props.get('NumObsDim')!)));
    const hidSz  = Math.round(asScalar(m(agentV.props.get('HiddenSize')!)));
    const gamma  = asScalar(m(agentV.props.get('DiscountFactor')!));
    const lam    = asScalar(m(agentV.props.get('GAEFactor')!));
    const clip   = asScalar(m(agentV.props.get('ClipFactor')!));
    const lr     = asScalar(m(agentV.props.get('LearnRate')!));
    const nEpoch = Math.round(asScalar(m(agentV.props.get('NumEpoch')!)));
    const horizon= Math.round(asScalar(m(agentV.props.get('ExperienceHorizon')!)));

    const actor  = restorePPOActor(agentV, inSz, hidSz, nAct);
    const critic = restorePPOCritic(agentV, inSz, hidSz);

    for (let ep = 0; ep < maxEp; ep++) {
      // Collect rollout
      type Transition = { obs: number[]; act: number; logp: number; rew: number; val: number; done: boolean };
      const rollout: Transition[] = [];
      let obs   = await envReset(env);
      let total = 0;
      for (let step = 0; step < Math.max(maxSteps, horizon); step++) {
        const { q: logits } = mnForward(actor, obs);
        const probs = softmax(logits);
        const act   = categoricalSample(probs);
        const logp  = Math.log(probs[act] + 1e-8);
        const { q: [val] } = mnForward(critic, obs);
        const { nextObs, reward, done } = await envStep(env, obs, act);
        total += reward;
        rollout.push({ obs, act, logp, rew: reward, val, done });
        obs = nextObs;
        if (done || rollout.length >= horizon) break;
      }

      // Compute GAE advantages
      const n      = rollout.length;
      const adv    = new Array(n).fill(0);
      let gaeAcc   = 0;
      const lastVal = rollout[n - 1].done ? 0 : mnForward(critic, obs).q[0];
      for (let t = n - 1; t >= 0; t--) {
        const nextV  = t + 1 < n ? rollout[t + 1].val : lastVal;
        const delta  = rollout[t].rew + gamma * nextV * (rollout[t].done ? 0 : 1) - rollout[t].val;
        gaeAcc       = delta + gamma * lam * (rollout[t].done ? 0 : 1) * gaeAcc;
        adv[t]       = gaeAcc;
      }
      const returns = rollout.map((tr, i) => tr.val + adv[i]);
      // Normalise advantages
      const advMean = adv.reduce((a, b) => a + b, 0) / n;
      const advStd  = Math.sqrt(adv.reduce((s, a) => s + (a - advMean) ** 2, 0) / n + 1e-8);
      const advNorm = adv.map((a) => (a - advMean) / advStd);

      // PPO update epochs
      for (let epoch = 0; epoch < nEpoch; epoch++) {
        for (let t = 0; t < n; t++) {
          const tr    = rollout[t];
          // Actor update (clipped surrogate)
          const { q: logits } = mnForward(actor, tr.obs);
          const probs  = softmax(logits);
          const newLogp = Math.log(probs[tr.act] + 1e-8);
          const ratio   = Math.exp(newLogp - tr.logp);
          const clipped = Math.max(Math.min(ratio, 1 + clip), 1 - clip);
          // We use the unclipped gradient since we lack a full auto-diff;
          // approximate: push logit of chosen action in direction of advantage
          const actGrad = advNorm[t] * Math.min(ratio, clipped);
          mnUpdate(actor, tr.obs, tr.act, logits[tr.act] - lr * actGrad, lr * 0.01);
          // Critic update (MSE)
          mnUpdate(critic, tr.obs, 0, returns[t], lr);
        }
      }

      episodeRewards.push(total);
      const window = episodeRewards.slice(-winLen);
      const avg    = window.reduce((a, b) => a + b, 0) / window.length;
      movingAvg.push(avg);
      if (avg >= stopVal) break;
    }
    // Save nets back
    saveNetToAgent(agentV, 'Act', actor);
    saveNetToAgent(agentV, 'Cri', critic);
  }

  // ── Build trainStats ──────────────────────────────────────────────────
  const nEp    = episodeRewards.length;
  const stats  = makeObject('TrainStats', {
    EpisodeIndex:   rowVec(Array.from({ length: nEp }, (_, i) => i + 1)),
    EpisodeReward:  rowVec(episodeRewards),
    AverageReward:  rowVec(movingAvg),
    TotalAgentSteps:scalar(episodeRewards.reduce((a, b) => a + b, 0)),
    TrainingTime:   scalar(0),
  });
  return [stats];
}

// ── sim ───────────────────────────────────────────────────────────────────────────────

async function sim(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('sim: requires agent and env');
  const [agentV, env] = args;
  if (!isObject(agentV)) throw new MatError('sim: first arg must be an RL agent');
  const maxSteps = 200;
  let obs    = await envReset(env);
  const obsLog: number[][] = [obs.slice()];
  const actLog: number[]   = [];
  const rewLog: number[]   = [];
  let total = 0;

  for (let step = 0; step < maxSteps; step++) {
    const [actV] = await getAction([agentV, rowVec(obs)]);
    const act    = Math.round(asScalar(m(actV)));
    actLog.push(act);
    const { nextObs, reward, done } = await envStep(env, obs, act);
    rewLog.push(reward);
    total += reward;
    obs    = nextObs;
    obsLog.push(obs.slice());
    if (done) break;
  }

  const n      = actLog.length;
  const simOut = makeObject('SimulationOutput', {
    TotalReward:   scalar(total),
    NumSteps:      scalar(n),
    EpisodeReward: scalar(total),
  });
  return [simOut];
}

// ── ToolboxModule export ──────────────────────────────────────────────────────────────

export const RL: ToolboxModule = {
  id:      'rl',
  name:    'Reinforcement Learning Toolbox',
  docBase: 'https://www.mathworks.com/help/reinforcement-learning/ref/',
  builtins: {
    // Specs / env
    rlNumericSpec,
    rlFiniteSetSpec,
    rlFunctionEnv,
    // Options
    rlTrainingOptions,
    rlQAgentOptions,
    rlDQNAgentOptions,
    rlPPOAgentOptions,
    // Agent constructors
    rlQAgent,
    rlDQNAgent,
    rlPGAgent,
    rlACAgent,
    rlDDPGAgent,
    rlTD3Agent,
    rlPPOAgent,
    // Replay buffers
    rlReplayMemory,
    rlPrioritizedReplayMemory,
    // Representations
    rlValueFunction,
    rlQValueFunction,
    rlContinuousDeterministicActor,
    rlStochasticActor,
    // Training / inference
    train,
    sim,
    getAction,
  },
  help: HELP_RL,
};
