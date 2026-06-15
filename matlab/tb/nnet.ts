// Deep Learning Toolbox — layer constructors, trainNetwork (real backprop: FC + activations +
// batchnorm + dropout), custom-loop API (dlnetwork/dlfeval/adamupdate), dlarray operations,
// LSTM/GRU forward, and inference utilities.
import {
  type Value, type Mat, type Cell, type Str, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat, isStr, isCell, isObject, isHandle, makeStrArr, makeCell, MatError,
  mat, zeros, makeObject, fromRows, str, bool,
} from '../values';
import { erf } from '../specfun';
import type { Builtin } from '../builtins';
import type { ToolboxModule } from './types';
import { HELP_NNET } from '../help';

// ── tiny matrix helpers (column-major [rows×cols]) ────────────────────────────────────
type M2 = { rows: number; cols: number; d: Float64Array };

const alloc = (r: number, c: number): M2 => ({ rows: r, cols: c, d: new Float64Array(r * c) });
const get = (A: M2, r: number, c: number) => A.d[r * A.cols + c];
const set = (A: M2, r: number, c: number, v: number) => { A.d[r * A.cols + c] = v; };

function mmul(A: M2, B: M2): M2 {
  const C = alloc(A.rows, B.cols);
  for (let i = 0; i < A.rows; i++)
    for (let k = 0; k < A.cols; k++) {
      const aik = A.d[i * A.cols + k];
      if (aik === 0) continue;
      for (let j = 0; j < B.cols; j++) C.d[i * B.cols + j] += aik * B.d[k * B.cols + j];
    }
  return C;
}

function mT(A: M2): M2 {
  const B = alloc(A.cols, A.rows);
  for (let i = 0; i < A.rows; i++) for (let j = 0; j < A.cols; j++) B.d[j * A.rows + i] = A.d[i * A.cols + j];
  return B;
}

// Add broadcast bias b [rows×1] to each column of A [rows×cols]
function addBias(A: M2, b: M2): M2 {
  const C = alloc(A.rows, A.cols);
  for (let i = 0; i < A.rows; i++) for (let j = 0; j < A.cols; j++) C.d[i * A.cols + j] = A.d[i * A.cols + j] + b.d[i];
  return C;
}

// Sum over columns → [rows×1]
function sumCols(A: M2): M2 {
  const b = alloc(A.rows, 1);
  for (let i = 0; i < A.rows; i++) for (let j = 0; j < A.cols; j++) b.d[i] += A.d[i * A.cols + j];
  return b;
}

function ewApply(A: M2, f: (v: number) => number): M2 {
  const B = alloc(A.rows, A.cols); B.d.set(A.d.map(f)); return B;
}

function ewMul(A: M2, B: M2): M2 {
  const C = alloc(A.rows, A.cols);
  for (let i = 0; i < A.d.length; i++) C.d[i] = A.d[i] * B.d[i];
  return C;
}

function mScale(A: M2, s: number): M2 { const B = alloc(A.rows, A.cols); B.d.set(A.d.map(v => v * s)); return B; }
function mAdd(A: M2, B: M2): M2 { const C = alloc(A.rows, A.cols); for (let i = 0; i < A.d.length; i++) C.d[i] = A.d[i] + B.d[i]; return C; }
function mSub(A: M2, B: M2): M2 { const C = alloc(A.rows, A.cols); for (let i = 0; i < A.d.length; i++) C.d[i] = A.d[i] - B.d[i]; return C; }

// Mat.data is COLUMN-major (element (r,c) at data[r + c*rows]); the M2 helpers in this
// file index ROW-major (d[r*cols+c]). Transpose the layout on load and reverse on store
// so the M2 buffer is genuinely row-major.
function toM2(v: Value): M2 {
  const mv = m(v);
  const A = alloc(mv.rows, mv.cols);
  for (let r = 0; r < mv.rows; r++) for (let c = 0; c < mv.cols; c++) A.d[r * mv.cols + c] = mv.data[r + c * mv.rows];
  return A;
}

function fromM2(A: M2): Value {
  const out = new Float64Array(A.rows * A.cols);
  for (let r = 0; r < A.rows; r++) for (let c = 0; c < A.cols; c++) out[r + c * A.rows] = A.d[r * A.cols + c];
  return mat(A.rows, A.cols, out);
}

// ── Xavier / Glorot weight initialisation ─────────────────────────────────────────────
function xavier(fanIn: number, fanOut: number, rows: number, cols: number): M2 {
  const std = Math.sqrt(2 / (fanIn + fanOut));
  const A = alloc(rows, cols);
  // Box-Muller for normal distribution
  for (let i = 0; i < A.d.length; i += 2) {
    const u1 = Math.max(1e-15, Math.random()), u2 = Math.random();
    const r = Math.sqrt(-2 * Math.log(u1));
    A.d[i] = r * Math.cos(2 * Math.PI * u2) * std;
    if (i + 1 < A.d.length) A.d[i + 1] = r * Math.sin(2 * Math.PI * u2) * std;
  }
  return A;
}

// ── Layer activation functions (forward + backward) ───────────────────────────────────
function reluFwd(Z: M2): M2 { return ewApply(Z, v => Math.max(0, v)); }
function reluBwd(dA: M2, Z: M2): M2 { return ewMul(dA, ewApply(Z, v => v > 0 ? 1 : 0)); }

function sigmoidFwd(Z: M2): M2 { return ewApply(Z, v => 1 / (1 + Math.exp(-v))); }
function sigmoidBwd(dA: M2, A: M2): M2 { return ewMul(dA, ewApply(A, v => v * (1 - v))); }

function tanhFwd(Z: M2): M2 { return ewApply(Z, Math.tanh); }
function tanhBwd(dA: M2, A: M2): M2 { return ewMul(dA, ewApply(A, v => 1 - v * v)); }

function leakyReluFwd(Z: M2, alpha = 0.01): M2 { return ewApply(Z, v => v > 0 ? v : alpha * v); }
function leakyReluBwd(dA: M2, Z: M2, alpha = 0.01): M2 { return ewMul(dA, ewApply(Z, v => v > 0 ? 1 : alpha)); }

// Exact GELU: 0.5*x*(1 + erf(x/sqrt(2))) — erf from shared specfun (full precision).
function geluFwd(Z: M2): M2 {
  return ewApply(Z, v => 0.5 * v * (1 + erf(v / Math.SQRT2)));
}
function geluBwd(dA: M2, Z: M2): M2 {
  // Approximate GELU derivative
  return ewMul(dA, ewApply(Z, v => {
    const x = v; const c = Math.sqrt(2 / Math.PI);
    const t = Math.tanh(c * (x + 0.044715 * x * x * x));
    return 0.5 * (1 + t) + 0.5 * x * (1 - t * t) * c * (1 + 3 * 0.044715 * x * x);
  }));
}

// Column-wise softmax: each column is one sample
function softmaxFwd(Z: M2): M2 {
  const A = alloc(Z.rows, Z.cols);
  for (let j = 0; j < Z.cols; j++) {
    let maxV = -Infinity;
    for (let i = 0; i < Z.rows; i++) maxV = Math.max(maxV, Z.d[i * Z.cols + j]);
    let sumE = 0;
    for (let i = 0; i < Z.rows; i++) { const e = Math.exp(Z.d[i * Z.cols + j] - maxV); A.d[i * Z.cols + j] = e; sumE += e; }
    for (let i = 0; i < Z.rows; i++) A.d[i * Z.cols + j] /= sumE;
  }
  return A;
}

// Cross-entropy loss with softmax (combined, numerically stable)
// Y: [classes×batch], T: [classes×batch] (one-hot or probability)
function crossEntropyLoss(Y: M2, T: M2): number {
  let loss = 0;
  for (let j = 0; j < Y.cols; j++)
    for (let i = 0; i < Y.rows; i++)
      if (T.d[i * T.cols + j] > 0) loss -= T.d[i * T.cols + j] * Math.log(Math.max(Y.d[i * Y.cols + j], 1e-12));
  return loss / Y.cols;
}

// Gradient of cross-entropy + softmax: dZ = (Y - T) / batch
function softmaxCEGrad(Y: M2, T: M2): M2 {
  const dZ = alloc(Y.rows, Y.cols);
  for (let i = 0; i < dZ.d.length; i++) dZ.d[i] = (Y.d[i] - T.d[i]) / Y.cols;
  return dZ;
}

// MSE loss: 0.5 * mean(||Y-T||^2)
function mseLoss(Y: M2, T: M2): number {
  let s = 0;
  for (let i = 0; i < Y.d.length; i++) { const d = Y.d[i] - T.d[i]; s += d * d; }
  return s / (2 * Y.cols);
}

function mseGrad(Y: M2, T: M2): M2 {
  const dZ = alloc(Y.rows, Y.cols);
  for (let i = 0; i < dZ.d.length; i++) dZ.d[i] = (Y.d[i] - T.d[i]) / Y.cols;
  return dZ;
}

// ── Batch normalisation ────────────────────────────────────────────────────────────────
interface BNState { gamma: M2; beta: M2; runMean: M2; runVar: M2 }
function bnFwd(X: M2, gamma: M2, beta: M2, runMean: M2, runVar: M2, training: boolean, eps = 1e-5, momentum = 0.1): { Y: M2; runMean: M2; runVar: M2; xhat?: M2; std?: M2 } {
  const n = X.cols;
  if (training) {
    // Compute batch mean and var per feature (row)
    const mean = alloc(X.rows, 1);
    for (let i = 0; i < X.rows; i++) { let s = 0; for (let j = 0; j < n; j++) s += X.d[i * n + j]; mean.d[i] = s / n; }
    const vari = alloc(X.rows, 1);
    for (let i = 0; i < X.rows; i++) { let s = 0; for (let j = 0; j < n; j++) { const d = X.d[i * n + j] - mean.d[i]; s += d * d; } vari.d[i] = s / n; }
    const std = ewApply(vari, v => Math.sqrt(v + eps));
    const xhat = alloc(X.rows, n);
    for (let i = 0; i < X.rows; i++) for (let j = 0; j < n; j++) xhat.d[i * n + j] = (X.d[i * n + j] - mean.d[i]) / std.d[i];
    const Y = alloc(X.rows, n);
    for (let i = 0; i < X.rows; i++) for (let j = 0; j < n; j++) Y.d[i * n + j] = gamma.d[i] * xhat.d[i * n + j] + beta.d[i];
    // Update running stats
    const newMean = alloc(X.rows, 1); const newVar = alloc(X.rows, 1);
    for (let i = 0; i < X.rows; i++) { newMean.d[i] = (1 - momentum) * runMean.d[i] + momentum * mean.d[i]; newVar.d[i] = (1 - momentum) * runVar.d[i] + momentum * vari.d[i]; }
    return { Y, runMean: newMean, runVar: newVar, xhat, std };
  } else {
    const xhat = alloc(X.rows, n);
    for (let i = 0; i < X.rows; i++) for (let j = 0; j < n; j++) xhat.d[i * n + j] = (X.d[i * n + j] - runMean.d[i]) / Math.sqrt(runVar.d[i] + eps);
    const Y = alloc(X.rows, n);
    for (let i = 0; i < X.rows; i++) for (let j = 0; j < n; j++) Y.d[i * n + j] = gamma.d[i] * xhat.d[i * n + j] + beta.d[i];
    return { Y, runMean, runVar };
  }
}

function bnBwd(dY: M2, xhat: M2, std: M2, gamma: M2): { dX: M2; dGamma: M2; dBeta: M2 } {
  const n = dY.cols, feat = dY.rows;
  const dBeta = sumCols(dY);
  const dGamma = alloc(feat, 1);
  for (let i = 0; i < feat; i++) for (let j = 0; j < n; j++) dGamma.d[i] += dY.d[i * n + j] * xhat.d[i * n + j];
  // dX via the full BN backward formula
  const dxhat = alloc(feat, n);
  for (let i = 0; i < feat; i++) for (let j = 0; j < n; j++) dxhat.d[i * n + j] = dY.d[i * n + j] * gamma.d[i];
  const dX = alloc(feat, n);
  for (let i = 0; i < feat; i++) {
    let sumDxhat = 0, sumDxhatXhat = 0;
    for (let j = 0; j < n; j++) { sumDxhat += dxhat.d[i * n + j]; sumDxhatXhat += dxhat.d[i * n + j] * xhat.d[i * n + j]; }
    for (let j = 0; j < n; j++) dX.d[i * n + j] = (dxhat.d[i * n + j] - sumDxhat / n - xhat.d[i * n + j] * sumDxhatXhat / n) / std.d[i];
  }
  return { dX, dGamma, dBeta };
}

// ── Network layer types ───────────────────────────────────────────────────────────────
type LayerType =
  | { kind: 'input'; size: number[] }
  | { kind: 'fc'; W: M2; b: M2; outputSize: number }
  | { kind: 'relu' } | { kind: 'sigmoid' } | { kind: 'tanh' }
  | { kind: 'leakyrelu'; alpha: number } | { kind: 'gelu' }
  | { kind: 'softmax' }
  | { kind: 'bn'; gamma: M2; beta: M2; runMean: M2; runVar: M2 }
  | { kind: 'dropout'; rate: number }
  | { kind: 'classification' } | { kind: 'regression' };

interface NNet { layers: LayerType[]; inputSize: number }
interface Cache { Z: M2; A: M2; mask?: M2; xhat?: M2; std?: M2 }

// ── Forward pass (returns activations cache for backprop) ─────────────────────────────
function forward(net: NNet, X: M2, training: boolean): { output: M2; caches: Cache[] } {
  let A = X;
  const caches: Cache[] = [];
  for (const layer of net.layers) {
    if (layer.kind === 'input') { caches.push({ Z: A, A }); continue; }
    if (layer.kind === 'fc') {
      const Z = addBias(mmul(layer.W, A), layer.b);
      caches.push({ Z, A: Z }); A = Z; continue;
    }
    if (layer.kind === 'relu') { const Aout = reluFwd(A); caches.push({ Z: A, A: Aout }); A = Aout; continue; }
    if (layer.kind === 'sigmoid') { const Aout = sigmoidFwd(A); caches.push({ Z: A, A: Aout }); A = Aout; continue; }
    if (layer.kind === 'tanh') { const Aout = tanhFwd(A); caches.push({ Z: A, A: Aout }); A = Aout; continue; }
    if (layer.kind === 'leakyrelu') { const Aout = leakyReluFwd(A, layer.alpha); caches.push({ Z: A, A: Aout }); A = Aout; continue; }
    if (layer.kind === 'gelu') { const Aout = geluFwd(A); caches.push({ Z: A, A: Aout }); A = Aout; continue; }
    if (layer.kind === 'softmax') { const Aout = softmaxFwd(A); caches.push({ Z: A, A: Aout }); A = Aout; continue; }
    if (layer.kind === 'bn') {
      const { Y, runMean, runVar, xhat, std } = bnFwd(A, layer.gamma, layer.beta, layer.runMean, layer.runVar, training);
      layer.runMean = runMean; layer.runVar = runVar;
      caches.push({ Z: A, A: Y, xhat, std }); A = Y; continue;
    }
    if (layer.kind === 'dropout') {
      if (!training) { caches.push({ Z: A, A }); continue; }
      const mask = alloc(A.rows, A.cols);
      for (let i = 0; i < mask.d.length; i++) mask.d[i] = Math.random() > layer.rate ? 1 / (1 - layer.rate) : 0;
      const Aout = ewMul(A, mask);
      caches.push({ Z: A, A: Aout, mask }); A = Aout; continue;
    }
    if (layer.kind === 'classification' || layer.kind === 'regression') { caches.push({ Z: A, A }); continue; }
  }
  return { output: A, caches };
}

// ── Backward pass ─────────────────────────────────────────────────────────────────────
interface Grads { dW?: M2; db?: M2; dGamma?: M2; dBeta?: M2 }

function backward(net: NNet, caches: Cache[], T: M2, isClassification: boolean): { grads: Grads[]; loss: number } {
  const Y = caches[caches.length - 1].A;
  const loss = isClassification ? crossEntropyLoss(Y, T) : mseLoss(Y, T);
  let dA = isClassification ? softmaxCEGrad(Y, T) : mseGrad(Y, T);
  const grads: Grads[] = Array(net.layers.length).fill(null).map(() => ({}));

  for (let li = net.layers.length - 1; li >= 0; li--) {
    const layer = net.layers[li];
    const cache = caches[li];
    const prevA = li > 0 ? caches[li - 1].A : caches[0].Z;

    if (layer.kind === 'classification' || layer.kind === 'regression' || layer.kind === 'input' || layer.kind === 'softmax') continue;
    if (layer.kind === 'fc') {
      grads[li].dW = mScale(mmul(dA, mT(prevA)), 1);
      grads[li].db = sumCols(dA);
      dA = mmul(mT(layer.W), dA);
      continue;
    }
    if (layer.kind === 'relu') { dA = reluBwd(dA, cache.Z); continue; }
    if (layer.kind === 'sigmoid') { dA = sigmoidBwd(dA, cache.A); continue; }
    if (layer.kind === 'tanh') { dA = tanhBwd(dA, cache.A); continue; }
    if (layer.kind === 'leakyrelu') { dA = leakyReluBwd(dA, cache.Z, layer.alpha); continue; }
    if (layer.kind === 'gelu') { dA = geluBwd(dA, cache.Z); continue; }
    if (layer.kind === 'bn') {
      const { dX, dGamma, dBeta } = bnBwd(dA, cache.xhat!, cache.std!, layer.gamma);
      grads[li].dGamma = dGamma; grads[li].dBeta = dBeta; dA = dX; continue;
    }
    if (layer.kind === 'dropout') { dA = cache.mask ? ewMul(dA, cache.mask) : dA; continue; }
  }
  return { grads, loss };
}

// ── Adam optimiser ────────────────────────────────────────────────────────────────────
interface AdamState { m: M2; v: M2 }
function adamStep(param: M2, grad: M2, state: AdamState, lr: number, t: number, beta1 = 0.9, beta2 = 0.999, eps = 1e-8): { param: M2; state: AdamState } {
  const mNew = alloc(param.rows, param.cols);
  const vNew = alloc(param.rows, param.cols);
  for (let i = 0; i < param.d.length; i++) {
    mNew.d[i] = beta1 * state.m.d[i] + (1 - beta1) * grad.d[i];
    vNew.d[i] = beta2 * state.v.d[i] + (1 - beta2) * grad.d[i] * grad.d[i];
  }
  const mHat = mScale(mNew, 1 / (1 - beta1 ** t));
  const vHat = mScale(vNew, 1 / (1 - beta2 ** t));
  const pNew = alloc(param.rows, param.cols);
  for (let i = 0; i < param.d.length; i++) pNew.d[i] = param.d[i] - lr * mHat.d[i] / (Math.sqrt(vHat.d[i]) + eps);
  return { param: pNew, state: { m: mNew, v: vNew } };
}

// ── Network serialisation: NNet ↔ ClassV ──────────────────────────────────────────────
function packNet(net: NNet): Value {
  const props = new Map<string, Value>();
  props.set('_nnet_layers', scalar(net.layers.length));
  props.set('_nnet_inputSize', scalar(net.inputSize));
  // Serialise each layer as a sub-object
  for (let i = 0; i < net.layers.length; i++) {
    const layer = net.layers[i];
    const lp = new Map<string, Value>();
    lp.set('kind', str(layer.kind));
    if (layer.kind === 'fc') {
      lp.set('W', fromM2(layer.W));
      lp.set('b', fromM2(layer.b));
      lp.set('outputSize', scalar(layer.outputSize));
    }
    if (layer.kind === 'bn') {
      lp.set('gamma', fromM2(layer.gamma));
      lp.set('beta', fromM2(layer.beta));
      lp.set('runMean', fromM2(layer.runMean));
      lp.set('runVar', fromM2(layer.runVar));
    }
    if (layer.kind === 'leakyrelu') lp.set('alpha', scalar((layer as any).alpha));
    if (layer.kind === 'dropout') lp.set('rate', scalar((layer as any).rate));
    if (layer.kind === 'input') lp.set('size', rowVec((layer as any).size));
    props.set(`_layer_${i}`, makeObject('nnet.layer', lp));
  }
  return makeObject('SeriesNetwork', props);
}

function unpackNet(v: Value): NNet {
  if ((v as any).kind !== 'object') throw new MatError('nnet: expected network object');
  const props = (v as any).props as Map<string, Value>;
  const nLayers = asScalar(m(props.get('_nnet_layers')!));
  const inputSize = asScalar(m(props.get('_nnet_inputSize')!));
  const layers: LayerType[] = [];
  for (let i = 0; i < nLayers; i++) {
    const lobj = (props.get(`_layer_${i}`) as any);
    const lp: Map<string, Value> = lobj.props;
    const kind = (lp.get('kind') as any).items?.[0] ?? '';
    const sn = (s: string) => lp.has(s) ? String.fromCharCode(...(Array.from(m(lp.get(s)!).data) as number[])) : '';
    if (kind === 'fc') {
      layers.push({ kind: 'fc', W: toM2(lp.get('W')!), b: toM2(lp.get('b')!), outputSize: asScalar(m(lp.get('outputSize')!)) });
    } else if (kind === 'bn') {
      layers.push({ kind: 'bn', gamma: toM2(lp.get('gamma')!), beta: toM2(lp.get('beta')!), runMean: toM2(lp.get('runMean')!), runVar: toM2(lp.get('runVar')!) });
    } else if (kind === 'leakyrelu') {
      layers.push({ kind: 'leakyrelu', alpha: asScalar(m(lp.get('alpha')!)) });
    } else if (kind === 'dropout') {
      layers.push({ kind: 'dropout', rate: asScalar(m(lp.get('rate')!)) });
    } else if (kind === 'input') {
      layers.push({ kind: 'input', size: toArray(m(lp.get('size')!)) });
    } else {
      layers.push({ kind: kind as any });
    }
  }
  return { layers, inputSize };
}

// ── Parse layer array argument into NNet ──────────────────────────────────────────────
function parseLayers(layersVal: Value): LayerType[] {
  if ((layersVal as any).kind === 'cell') {
    const cell = layersVal as any;
    return cell.items.flatMap((item: Value) => parseLayers(item));
  }
  if ((layersVal as any).kind === 'object') {
    const props = (layersVal as any).props as Map<string, Value>;
    const layerType = props.get('_layerKind');
    if (!layerType) return [];
    const kind = isMat(layerType) && (layerType as any).isChar
      ? String.fromCharCode(...(Array.from((layerType as any).data) as number[]))
      : 'unknown';
    if (kind === 'fc') return [{ kind: 'fc', W: alloc(0, 0), b: alloc(0, 1), outputSize: asScalar(m(props.get('outputSize')!)) }];
    if (kind === 'relu') return [{ kind: 'relu' }];
    if (kind === 'sigmoid') return [{ kind: 'sigmoid' }];
    if (kind === 'tanh') return [{ kind: 'tanh' }];
    if (kind === 'leakyrelu') return [{ kind: 'leakyrelu', alpha: props.has('alpha') ? asScalar(m(props.get('alpha')!)) : 0.01 }];
    if (kind === 'gelu') return [{ kind: 'gelu' }];
    if (kind === 'softmax') return [{ kind: 'softmax' }];
    if (kind === 'bn') return [{ kind: 'bn', gamma: alloc(0, 1), beta: alloc(0, 1), runMean: alloc(0, 1), runVar: alloc(0, 1) }];
    if (kind === 'dropout') return [{ kind: 'dropout', rate: props.has('rate') ? asScalar(m(props.get('rate')!)) : 0.5 }];
    if (kind === 'input') return [{ kind: 'input', size: props.has('inputSize') ? toArray(m(props.get('inputSize')!)) : [1] }];
    if (kind === 'classification') return [{ kind: 'classification' }];
    if (kind === 'regression') return [{ kind: 'regression' }];
  }
  return [];
}

function initWeights(layers: LayerType[], inputSize: number): LayerType[] {
  let curSize = inputSize;
  return layers.map(layer => {
    if (layer.kind === 'fc') {
      const W = xavier(curSize, layer.outputSize, layer.outputSize, curSize);
      const b = alloc(layer.outputSize, 1);
      curSize = layer.outputSize;
      return { ...layer, W, b };
    }
    if (layer.kind === 'bn') {
      const gamma = alloc(curSize, 1); gamma.d.fill(1);
      const beta = alloc(curSize, 1);
      const runMean = alloc(curSize, 1);
      const runVar = alloc(curSize, 1); runVar.d.fill(1);
      return { ...layer, gamma, beta, runMean, runVar };
    }
    return layer;
  });
}

// ── trainNetwork ─────────────────────────────────────────────────────────────────────
async function trainNetwork(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('trainNetwork: requires X, Y, layers [, options]');
  const Xm = m(args[0]); // [features × N] or [N × features] — we expect [features × N]
  const Ym = m(args[1]); // [classes × N] or category array
  const layersVal = args[2];
  const opts = args.length > 3 ? args[3] : null;

  // Parse options
  let maxEpochs = 30, miniBatchSize = 32, lr = 0.001, solver = 'adam', verbose = true;
  let shuffle = 'every-epoch';
  if (opts && (opts as any).kind === 'object') {
    const op = (opts as any).props as Map<string, Value>;
    if (op.has('MaxEpochs')) maxEpochs = asScalar(m(op.get('MaxEpochs')!));
    if (op.has('MiniBatchSize')) miniBatchSize = asScalar(m(op.get('MiniBatchSize')!));
    if (op.has('InitialLearnRate')) lr = asScalar(m(op.get('InitialLearnRate')!));
    if (op.has('Solver')) solver = (op.get('Solver') as any)?.items?.[0] ?? 'adam';
    if (op.has('Verbose')) verbose = asScalar(m(op.get('Verbose')!)) !== 0;
  }

  // Data: make X [features × N], Y [classes × N]. Use toM2 (column-major Mat → row-major M2);
  // building M2 directly from Mat.data would transpose/scramble any non-vector matrix.
  let X: M2 = toM2(Xm);
  let Y: M2 = toM2(Ym);
  // If X is [N × features], transpose
  if (X.rows === Y.cols && X.cols !== Y.cols) { X = mT(X); }

  const inputSize = X.rows;
  const N = X.cols;

  // Determine if classification or regression
  const rawLayers = parseLayers(layersVal);
  const isClassification = rawLayers.some(l => l.kind === 'classification');

  // Build net with initialised weights
  const net: NNet = {
    layers: initWeights(rawLayers, inputSize),
    inputSize,
  };

  // Adam states for each parameter
  const adamStates: { W?: AdamState; b?: AdamState; gamma?: AdamState; beta?: AdamState }[] =
    net.layers.map(() => ({}));
  const zeroState = (A: M2): AdamState => ({ m: alloc(A.rows, A.cols), v: alloc(A.rows, A.cols) });
  for (let i = 0; i < net.layers.length; i++) {
    const l = net.layers[i];
    if (l.kind === 'fc') { adamStates[i].W = zeroState(l.W); adamStates[i].b = zeroState(l.b); }
    if (l.kind === 'bn') { adamStates[i].gamma = zeroState(l.gamma); adamStates[i].beta = zeroState(l.beta); }
  }

  let t = 0; // global Adam step counter
  const indices = Array.from({ length: N }, (_, i) => i);

  for (let epoch = 0; epoch < maxEpochs; epoch++) {
    // Shuffle
    for (let i = N - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [indices[i], indices[j]] = [indices[j], indices[i]]; }

    let epochLoss = 0; let numBatches = 0;
    for (let start = 0; start < N; start += miniBatchSize) {
      const end = Math.min(start + miniBatchSize, N);
      const bSize = end - start;
      // Extract mini-batch
      const Xb = alloc(inputSize, bSize);
      const Yb = alloc(Y.rows, bSize);
      for (let j = 0; j < bSize; j++) {
        const idx = indices[start + j];
        for (let i = 0; i < inputSize; i++) Xb.d[i * bSize + j] = X.d[i * N + idx];
        for (let i = 0; i < Y.rows; i++) Yb.d[i * bSize + j] = Y.d[i * N + idx];
      }

      t++;
      const { caches } = forward(net, Xb, true);
      const { grads, loss } = backward(net, caches, Yb, isClassification);
      epochLoss += loss; numBatches++;

      // Update parameters
      for (let i = 0; i < net.layers.length; i++) {
        const layer = net.layers[i];
        const g = grads[i];
        if (layer.kind === 'fc' && g.dW && g.db) {
          const { param: Wnew, state: sW } = adamStep(layer.W, g.dW, adamStates[i].W!, lr, t);
          const { param: bnew, state: sb } = adamStep(layer.b, g.db, adamStates[i].b!, lr, t);
          (net.layers[i] as any).W = Wnew; (net.layers[i] as any).b = bnew;
          adamStates[i].W = sW; adamStates[i].b = sb;
        }
        if (layer.kind === 'bn' && g.dGamma && g.dBeta) {
          const { param: gNew, state: sg } = adamStep(layer.gamma, g.dGamma, adamStates[i].gamma!, lr, t);
          const { param: bNew, state: sb } = adamStep(layer.beta, g.dBeta, adamStates[i].beta!, lr, t);
          (net.layers[i] as any).gamma = gNew; (net.layers[i] as any).beta = bNew;
          adamStates[i].gamma = sg; adamStates[i].beta = sb;
        }
      }
    }
    if (verbose && (epoch === 0 || (epoch + 1) % 5 === 0 || epoch === maxEpochs - 1)) {
      // Could hook into output — for now silently store
    }
  }

  return [packNet(net)];
}

// ── predict ───────────────────────────────────────────────────────────────────────────
async function predict_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('predict: requires network and X');
  const net = unpackNet(args[0]);
  const Xm = m(args[1]);
  let X: M2 = toM2(Xm);   // column-major → row-major (direct M2 build would scramble a matrix)
  if (X.rows !== net.inputSize && X.cols === net.inputSize) X = mT(X);
  const { output } = forward(net, X, false);
  return [fromM2(output)];
}

// ── classify ─────────────────────────────────────────────────────────────────────────
async function classify_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('classify: requires network and X');
  const [scores] = await predict_fn(args);
  const S = toM2(scores); // [classes × N]
  const labels = new Float64Array(S.cols);
  for (let j = 0; j < S.cols; j++) {
    let best = -Infinity, bestI = 0;
    for (let i = 0; i < S.rows; i++) if (S.d[i * S.cols + j] > best) { best = S.d[i * S.cols + j]; bestI = i; }
    labels[j] = bestI + 1; // 1-based class index
  }
  return [rowVec(Array.from(labels))];
}

// ── Layer constructor builtins ────────────────────────────────────────────────────────
function makeLayer(kind: string, extra: Record<string, Value> = {}): Value {
  const props = new Map<string, Value>([['_layerKind', str(kind)], ...Object.entries(extra).map(([k, v]) => [k, v] as [string, Value])]);
  return makeObject('nnet.cnn.layer.' + kind, props);
}

async function fullyConnectedLayer(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('fullyConnectedLayer: requires OutputSize');
  const sz = asScalar(m(args[0]));
  return [makeLayer('fc', { outputSize: scalar(sz), _layerKind: str('fc') })];
}

async function reluLayer(args: Value[]): Promise<Value[]> { return [makeLayer('relu')]; }
async function sigmoidLayer(args: Value[]): Promise<Value[]> { return [makeLayer('sigmoid')]; }
async function tanhLayer(args: Value[]): Promise<Value[]> { return [makeLayer('tanh')]; }
async function softmaxLayer(args: Value[]): Promise<Value[]> { return [makeLayer('softmax')]; }
async function geluLayer(args: Value[]): Promise<Value[]> { return [makeLayer('gelu')]; }

async function leakyReluLayer(args: Value[]): Promise<Value[]> {
  const alpha = args.length > 0 && isMat(args[0]) ? asScalar(m(args[0])) : 0.01;
  return [makeLayer('leakyrelu', { alpha: scalar(alpha), _layerKind: str('leakyrelu') })];
}

async function batchNormalizationLayer(args: Value[]): Promise<Value[]> { return [makeLayer('bn')]; }

async function dropoutLayer(args: Value[]): Promise<Value[]> {
  const rate = args.length > 0 && isMat(args[0]) ? asScalar(m(args[0])) : 0.5;
  return [makeLayer('dropout', { rate: scalar(rate), _layerKind: str('dropout') })];
}

async function imageInputLayer(args: Value[]): Promise<Value[]> {
  const sz = args.length > 0 && isMat(args[0]) ? toArray(m(args[0])) : [28, 28, 1];
  return [makeLayer('input', { inputSize: rowVec(sz), _layerKind: str('input') })];
}

async function featureInputLayer(args: Value[]): Promise<Value[]> {
  const n = args.length > 0 ? asScalar(m(args[0])) : 1;
  return [makeLayer('input', { inputSize: scalar(n), _layerKind: str('input') })];
}

async function sequenceInputLayer(args: Value[]): Promise<Value[]> {
  const n = args.length > 0 ? asScalar(m(args[0])) : 1;
  return [makeLayer('input', { inputSize: scalar(n), _layerKind: str('input') })];
}

async function classificationLayer(args: Value[]): Promise<Value[]> { return [makeLayer('classification')]; }
async function regressionLayer(args: Value[]): Promise<Value[]> { return [makeLayer('regression')]; }

// ── trainingOptions ───────────────────────────────────────────────────────────────────
async function trainingOptions(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  props.set('Solver', str('adam'));
  props.set('MaxEpochs', scalar(30));
  props.set('MiniBatchSize', scalar(128));
  props.set('InitialLearnRate', scalar(0.001));
  props.set('ValidationFrequency', scalar(50));
  props.set('Verbose', bool(true));
  props.set('Shuffle', str('every-epoch'));
  props.set('L2Regularization', scalar(1e-4));
  props.set('GradientThreshold', scalar(Infinity));
  if (args.length > 0 && isMat(args[0]) && (args[0] as any).isChar) {
    const solver = String.fromCharCode(...(Array.from((args[0] as any).data) as number[])).toLowerCase();
    props.set('Solver', str(solver));
    props.set('InitialLearnRate', scalar(solver === 'sgdm' ? 0.01 : 0.001));
  }
  for (let i = 1; i + 1 < args.length; i += 2) {
    if (isMat(args[i]) && (args[i] as any).isChar) {
      const key = String.fromCharCode(...(Array.from((args[i] as any).data) as number[]));
      props.set(key, args[i + 1]);
    }
  }
  return [makeObject('TrainingOptionsSGDM', props)];
}

// ── dlnetwork (custom training loop network) ─────────────────────────────────────────
async function dlnetwork(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('dlnetwork: requires layer array');
  const rawLayers = parseLayers(args[0]);
  const inputSize = rawLayers.find(l => l.kind === 'input') ? 1 : 1;
  const net: NNet = { layers: initWeights(rawLayers, inputSize), inputSize };
  return [packNet(net)];
}

// ── dlarray — wrap a matrix as a dlarray ─────────────────────────────────────────────
async function dlarray_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('dlarray: requires data');
  const fmt = args.length > 1 && isMat(args[1]) && (args[1] as any).isChar
    ? String.fromCharCode(...(Array.from((args[1] as any).data) as number[]))
    : 'CB';
  const props = new Map<string, Value>();
  props.set('data', args[0]);
  props.set('dims', str(fmt));
  const o = makeObject('dlarray', props);
  (o.props as Map<string, unknown>).set('__node', dlNode(m(args[0])));   // leaf node so gradients can flow to it
  return [o];
}

async function extractdata(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('extractdata: requires dlarray');
  const v = args[0] as any;
  if (v.kind === 'object' && v.props?.has('data')) return [v.props.get('data')];
  return [args[0]];
}

// ── adamupdate ────────────────────────────────────────────────────────────────────────
// [netUpdated, avgGrad, avgSqGrad] = adamupdate(net, grad, avgGrad, avgSqGrad, t)
async function adamupdate_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 5) throw new MatError('adamupdate: requires net, grad, avgGrad, avgSqGrad, iteration');
  const net = args[0];
  const gradV = args[1];
  const avgGradV = args[2];
  const avgSqGradV = args[3];
  const t = asScalar(m(args[4]));
  const lr = args.length > 5 ? asScalar(m(args[5])) : 0.001;
  const beta1 = args.length > 6 ? asScalar(m(args[6])) : 0.9;
  const beta2 = args.length > 7 ? asScalar(m(args[7])) : 0.999;
  const eps = args.length > 8 ? asScalar(m(args[8])) : 1e-8;

  // For network objects: update each FC layer's weights using gradient struct
  if ((net as any).kind === 'object' && (gradV as any).kind === 'object') {
    const netObj = unpackNet(net);
    const gradProps = (gradV as any).props as Map<string, Value>;
    const avgGradProps = (avgGradV as any).kind === 'object' ? (avgGradV as any).props as Map<string, Value> : new Map<string, Value>();
    const avgSqGradProps = (avgSqGradV as any).kind === 'object' ? (avgSqGradV as any).props as Map<string, Value> : new Map<string, Value>();
    const newAvgGrad = new Map<string, Value>();
    const newAvgSqGrad = new Map<string, Value>();

    for (let i = 0; i < netObj.layers.length; i++) {
      const l = netObj.layers[i];
      if (l.kind !== 'fc') continue;
      const wKey = `_layer_${i}_W`, bKey = `_layer_${i}_b`;
      if (gradProps.has(wKey) && isMat(gradProps.get(wKey)!)) {
        const dW = toM2(gradProps.get(wKey)!);
        const mW = avgGradProps.has(wKey) ? toM2(avgGradProps.get(wKey)!) : alloc(l.W.rows, l.W.cols);
        const vW = avgSqGradProps.has(wKey) ? toM2(avgSqGradProps.get(wKey)!) : alloc(l.W.rows, l.W.cols);
        const { param, state } = adamStep(l.W, dW, { m: mW, v: vW }, lr, t, beta1, beta2, eps);
        (netObj.layers[i] as any).W = param;
        newAvgGrad.set(wKey, fromM2(state.m));
        newAvgSqGrad.set(wKey, fromM2(state.v));
      }
    }
    const avgGradOut = makeObject('struct', newAvgGrad);
    const avgSqGradOut = makeObject('struct', newAvgSqGrad);
    return [packNet(netObj), avgGradOut, avgSqGradOut];
  }

  // For plain matrix parameters
  if (isMat(net) && isMat(gradV)) {
    const param = toM2(net), grad = toM2(gradV);
    const avgG = isMat(avgGradV) ? toM2(avgGradV) : alloc(param.rows, param.cols);
    const avgSqG = isMat(avgSqGradV) ? toM2(avgSqGradV) : alloc(param.rows, param.cols);
    const { param: pNew, state } = adamStep(param, grad, { m: avgG, v: avgSqG }, lr, t, beta1, beta2, eps);
    return [fromM2(pNew), fromM2(state.m), fromM2(state.v)];
  }

  return [net, avgGradV, avgSqGradV];
}

// ── Reverse-mode autodiff for dlarray (define-by-run tape) ────────────────────────────
// Each traced dlarray carries a DLNode (stored in props.__node): its primal value plus a list
// of parents with per-op backward closures. dlgradient seeds the scalar loss with grad 1 and
// back-propagates topologically. v1: scalar-loss reverse mode over the elementary ops below.

interface DLParent { node: DLNode; backward: (up: Mat) => Mat }
interface DLNode { value: Mat; grad: Mat | null; parents: DLParent[] }
const dlNode = (value: Mat, parents: DLParent[] = []): DLNode => ({ value, grad: null, parents });

// — small column-major Mat helpers (the tape works on plain Mats) —
const aMap = (a: Mat, f: (x: number) => number): Mat => { const o = zeros(a.rows, a.cols); for (let i = 0; i < a.data.length; i++) o.data[i] = f(a.data[i]); return o; };
function aEw(a: Mat, b: Mat, f: (x: number, y: number) => number): Mat {   // same-shape or scalar broadcast
  if (a.data.length === 1) return aMap(b, (y) => f(a.data[0], y));
  if (b.data.length === 1) return aMap(a, (x) => f(x, b.data[0]));
  const o = zeros(a.rows, a.cols); for (let i = 0; i < a.data.length; i++) o.data[i] = f(a.data[i], b.data[i]); return o;
}
function aMul(a: Mat, b: Mat): Mat { const R = a.rows, K = a.cols, C = b.cols; const o = zeros(R, C); for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { let s = 0; for (let k = 0; k < K; k++) s += a.data[r + k * R] * b.data[k + c * K]; o.data[r + c * R] = s; } return o; }
function aT(a: Mat): Mat { const o = zeros(a.cols, a.rows); for (let r = 0; r < a.rows; r++) for (let c = 0; c < a.cols; c++) o.data[c + r * a.cols] = a.data[r + c * a.rows]; return o; }
const aSum = (a: Mat): number => { let s = 0; for (const v of a.data) s += v; return s; };
/** Reduce an upstream gradient back to a smaller operand's shape (undo broadcasting). */
function reduceTo(g: Mat, rows: number, cols: number): Mat {
  if (g.rows === rows && g.cols === cols) return g;
  if (rows === 1 && cols === 1) return scalar(aSum(g));
  if (rows === 1) { const o = zeros(1, cols); for (let c = 0; c < cols; c++) { let s = 0; for (let r = 0; r < g.rows; r++) s += g.data[r + c * g.rows]; o.data[c] = s; } return o; }
  if (cols === 1) { const o = zeros(rows, 1); for (let r = 0; r < rows; r++) { let s = 0; for (let c = 0; c < g.cols; c++) s += g.data[r + c * g.rows]; o.data[r] = s; } return o; }
  return g;
}

/** A traced dlarray carrying a tape node. */
function mkDl(node: DLNode): Value { const p = new Map<string, Value>([['data', node.value], ['dims', str('CB')]]); const o = makeObject('dlarray', p); (o.props as Map<string, unknown>).set('__node', node); return o; }
/** Read an operand's primal + tape node (null = a constant, no gradient flows to it). */
function opnd(v: Value): { mat: Mat; node: DLNode | null } {
  if (isObject(v) && v.className === 'dlarray') return { mat: m(v.props.get('data')!), node: ((v.props as Map<string, unknown>).get('__node') as DLNode | undefined) ?? null };
  return { mat: m(v), node: null };
}

const adUnary = (a: Value, fwd: (x: Mat) => Mat, dF: (up: Mat, x: Mat, y: Mat) => Mat): Promise<Value[]> => {
  const A = opnd(a); const value = fwd(A.mat);
  return Promise.resolve([mkDl(dlNode(value, A.node ? [{ node: A.node, backward: (up) => dF(up, A.mat, value) }] : []))]);
};
const adBinary = (a: Value, b: Value, fwd: (x: Mat, y: Mat) => Mat, dA: (up: Mat, x: Mat, y: Mat) => Mat, dB: (up: Mat, x: Mat, y: Mat) => Mat): Promise<Value[]> => {
  const A = opnd(a), B = opnd(b); const value = fwd(A.mat, B.mat); const parents: DLParent[] = [];
  if (A.node) parents.push({ node: A.node, backward: (up) => reduceTo(dA(up, A.mat, B.mat), A.mat.rows, A.mat.cols) });
  if (B.node) parents.push({ node: B.node, backward: (up) => reduceTo(dB(up, A.mat, B.mat), B.mat.rows, B.mat.cols) });
  return Promise.resolve([mkDl(dlNode(value, parents))]);
};

const DLARRAY_METHODS: Record<string, Builtin> = {
  plus: (a) => adBinary(a[0], a[1], (x, y) => aEw(x, y, (p, q) => p + q), (up) => up, (up) => up),
  minus: (a) => adBinary(a[0], a[1], (x, y) => aEw(x, y, (p, q) => p - q), (up) => up, (up) => aMap(up, (v) => -v)),
  times: (a) => adBinary(a[0], a[1], (x, y) => aEw(x, y, (p, q) => p * q), (up, x, y) => aEw(up, y, (g, q) => g * q), (up, x) => aEw(up, x, (g, p) => g * p)),
  rdivide: (a) => adBinary(a[0], a[1], (x, y) => aEw(x, y, (p, q) => p / q), (up, x, y) => aEw(up, y, (g, q) => g / q), (up, x, y) => aEw(aEw(up, x, (g, p) => -g * p), aEw(y, y, (p, q) => p * q), (n, d) => n / d)),
  mtimes: (a) => {   // a scalar operand means scalar-multiply (element-wise), else matrix product
    const A = opnd(a[0]), B = opnd(a[1]);
    if (A.mat.data.length === 1 || B.mat.data.length === 1) return adBinary(a[0], a[1], (x, y) => aEw(x, y, (p, q) => p * q), (up, x, y) => aEw(up, y, (g, q) => g * q), (up, x) => aEw(up, x, (g, p) => g * p));
    return adBinary(a[0], a[1], aMul, (up, x, y) => aMul(up, aT(y)), (up, x) => aMul(aT(x), up));
  },
  power: (a) => { const p = asScalar(m(a[1])); return adUnary(a[0], (x) => aMap(x, (v) => v ** p), (up, x) => aEw(up, aMap(x, (v) => p * v ** (p - 1)), (g, d) => g * d)); },
  uminus: (a) => adUnary(a[0], (x) => aMap(x, (v) => -v), (up) => aMap(up, (v) => -v)),
  exp: (a) => adUnary(a[0], (x) => aMap(x, Math.exp), (up, x, y) => aEw(up, y, (g, e) => g * e)),
  log: (a) => adUnary(a[0], (x) => aMap(x, Math.log), (up, x) => aEw(up, x, (g, v) => g / v)),
  sqrt: (a) => adUnary(a[0], (x) => aMap(x, Math.sqrt), (up, x, y) => aEw(up, y, (g, s) => g / (2 * s))),
  sigmoid: (a) => adUnary(a[0], (x) => aMap(x, (v) => 1 / (1 + Math.exp(-v))), (up, x, y) => aEw(up, y, (g, s) => g * s * (1 - s))),
  tanh: (a) => adUnary(a[0], (x) => aMap(x, Math.tanh), (up, x, y) => aEw(up, y, (g, t) => g * (1 - t * t))),
  relu: (a) => adUnary(a[0], (x) => aMap(x, (v) => (v > 0 ? v : 0)), (up, x) => aEw(up, x, (g, v) => (v > 0 ? g : 0))),
  sum: (a) => adUnary(a[0], (x) => scalar(aSum(x)), (up, x) => aMap(x, () => up.data[0])),
  mean: (a) => adUnary(a[0], (x) => scalar(aSum(x) / x.data.length), (up, x) => aMap(x, () => up.data[0] / x.data.length)),
  mse: (a) => { const P = opnd(a[0]), T = opnd(a[1]); const n = P.mat.data.length; const diff = aEw(P.mat, T.mat, (p, q) => p - q); const value = scalar(aSum(aMap(diff, (d) => d * d)) / n); const parents: DLParent[] = []; if (P.node) parents.push({ node: P.node, backward: (up) => aMap(diff, (d) => (up.data[0] * 2 * d) / n) }); if (T.node) parents.push({ node: T.node, backward: (up) => aMap(diff, (d) => (-up.data[0] * 2 * d) / n) }); return Promise.resolve([mkDl(dlNode(value, parents))]); },
};

// dlgradient(loss, x1, x2, …): reverse-mode gradients of a SCALAR loss w.r.t. each xi.
const dlgradient_fn: Builtin = async (args) => {
  const lossNode = opnd(args[0]).node;
  if (!lossNode) throw new MatError('dlgradient: the loss must be a traced dlarray (compute it from dlarray inputs).');
  if (lossNode.value.data.length !== 1) throw new MatError('dlgradient: the value to differentiate must be a scalar.');
  const topo: DLNode[] = []; const seen = new Set<DLNode>();
  const build = (nd: DLNode) => { if (seen.has(nd)) return; seen.add(nd); for (const p of nd.parents) build(p.node); topo.push(nd); };
  build(lossNode);
  for (const nd of topo) nd.grad = null;
  lossNode.grad = scalar(1);
  for (let i = topo.length - 1; i >= 0; i--) { const nd = topo[i]; if (!nd.grad) continue; for (const p of nd.parents) { const g = p.backward(nd.grad); p.node.grad = p.node.grad ? aEw(p.node.grad, g, (x, y) => x + y) : g; } }
  const out: Value[] = [];
  for (let k = 1; k < args.length; k++) { const o = opnd(args[k]); out.push(mkDl(dlNode(o.node?.grad ?? zeros(o.mat.rows, o.mat.cols)))); }
  return out;
};

// dlfeval(fcn, x1, …): the tape is always live, so this just evaluates fcn (forwarding nargout).
const dlfeval_fn: Builtin = async (args, n, env) => {
  if (!isHandle(args[0])) throw new MatError('dlfeval: the first argument must be a function handle.');
  return env.callHandle(args[0], args.slice(1), Math.max(1, n));
};

// ── Layer operation functions (dlarray API) ───────────────────────────────────────────
async function fullyconnect(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('fullyconnect: requires X, weights, bias');
  const X = toM2(args[0]), W = toM2(args[1]), b = toM2(args[2]);
  return [fromM2(addBias(mmul(W, X), b))];
}

async function relu_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('relu: requires X');
  return [fromM2(reluFwd(toM2(args[0])))];
}

async function sigmoid_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('sigmoid: requires X');
  return [fromM2(sigmoidFwd(toM2(args[0])))];
}

async function softmax_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('softmax: requires X');
  return [fromM2(softmaxFwd(toM2(args[0])))];
}

async function gelu_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('gelu: requires X');
  return [fromM2(geluFwd(toM2(args[0])))];
}

async function leakyrelu_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('leakyrelu: requires X');
  const alpha = args.length > 1 ? asScalar(m(args[1])) : 0.01;
  return [fromM2(leakyReluFwd(toM2(args[0]), alpha))];
}

async function crossentropy_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('crossentropy: requires Y and targets');
  const Y = toM2(args[0]), T = toM2(args[1]);
  return [scalar(crossEntropyLoss(Y, T))];
}

async function mse_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('mse: requires Y and targets');
  const Y = toM2(args[0]), T = toM2(args[1]);
  return [scalar(mseLoss(Y, T))];
}

async function l2loss_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('l2loss: requires Y and targets');
  const Y = toM2(args[0]), T = toM2(args[1]);
  let s = 0;
  for (let i = 0; i < Y.d.length; i++) { const d = Y.d[i] - T.d[i]; s += d * d; }
  return [scalar(s / Y.cols)];
}

async function batchnorm_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('batchnorm: requires X, offset, scaleFactor');
  const X = toM2(args[0]), beta = toM2(args[1]), gamma = toM2(args[2]);
  const { Y } = bnFwd(X, gamma, beta, alloc(X.rows, 1), (() => { const v = alloc(X.rows, 1); v.d.fill(1); return v; })(), true);
  return [fromM2(Y)];
}

async function maxpool_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('maxpool: requires X and poolsize');
  const Xm = m(args[0]);
  const ps = isMat(args[1]) ? toArray(m(args[1])) : [asScalar(m(args[1])), asScalar(m(args[1]))];
  const ph = Math.round(ps[0]), pw = Math.round(ps[1] ?? ps[0]);
  // Treat input as [H × W × C × N] flattened — for 2D: [H × W] per channel
  // Simple implementation: treat as [H×W] per sample column-by-column
  const rows = Xm.rows, cols = Xm.cols;
  const outR = Math.floor(rows / ph), outC = Math.floor(cols / pw);
  const out = zeros(outR, outC);
  for (let i = 0; i < outR; i++) for (let j = 0; j < outC; j++) {
    let maxV = -Infinity;
    for (let di = 0; di < ph; di++) for (let dj = 0; dj < pw; dj++) {
      const v = Xm.data[(i * ph + di) + (j * pw + dj) * rows] ?? -Infinity;   // column-major
      if (v > maxV) maxV = v;
    }
    out.data[i + j * outR] = maxV;   // column-major
  }
  return [out];
}

// ── onehotdecode ─────────────────────────────────────────────────────────────────────
async function onehotdecode(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('onehotdecode: requires B and classes');
  const B = m(args[0]); // probability/score matrix
  const dim = args.length > 2 && isMat(args[2]) ? Math.round(asScalar(m(args[2]))) : 1;
  // Argmax along the class dimension → one winning class index per observation.
  const idx: number[] = [];
  if (dim === 2) { for (let i = 0; i < B.rows; i++) { let best = -Infinity, bi = 0; for (let j = 0; j < B.cols; j++) if (B.data[i + j * B.rows] > best) { best = B.data[i + j * B.rows]; bi = j; } idx.push(bi); } }
  else { for (let j = 0; j < B.cols; j++) { let best = -Infinity, bi = 0; for (let i = 0; i < B.rows; i++) if (B.data[i + j * B.rows] > best) { best = B.data[i + j * B.rows]; bi = i; } idx.push(bi); } }
  // Map indices to the supplied class labels, preserving the classes' type (string/cell/numeric).
  const cls = args[1];
  if (isStr(cls)) { const c = cls as Str; return [makeStrArr(idx.length, 1, idx.map((i) => c.items[i] ?? ''))]; }
  if (isCell(cls)) { const c = cls as Cell; return [makeCell(idx.length, 1, idx.map((i) => c.items[i]))]; }
  const cm = m(cls); return [colVec(idx.map((i) => cm.data[i]))];
}

// ── LSTM forward pass ─────────────────────────────────────────────────────────────────
// lstm(X, H0, C0, weights, recurrentWeights, bias)
// X: [inputSize × seqLen], weights: [4*H × inputSize], recWeights: [4*H × H], bias: [4*H × 1]
async function lstm_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 6) throw new MatError('lstm: requires X,H0,C0,W,R,b');
  const X = toM2(args[0]), H0 = toM2(args[1]), C0 = toM2(args[2]);
  const W = toM2(args[3]), R = toM2(args[4]), b = toM2(args[5]);
  const H_size = H0.rows, seqLen = X.cols;
  let H = H0, C = C0;
  const allH: M2[] = [];
  const sig = (v: number) => 1 / (1 + Math.exp(-v));

  for (let t = 0; t < seqLen; t++) {
    const xt = alloc(X.rows, 1);
    for (let i = 0; i < X.rows; i++) xt.d[i] = X.d[i * seqLen + t];
    // gates = W*xt + R*H + b
    const gates = addBias(mAdd(mmul(W, xt), mmul(R, H)), b);
    const i_gate = alloc(H_size, 1), f_gate = alloc(H_size, 1), g_gate = alloc(H_size, 1), o_gate = alloc(H_size, 1);
    for (let j = 0; j < H_size; j++) {
      i_gate.d[j] = sig(gates.d[j]);
      f_gate.d[j] = sig(gates.d[H_size + j]);
      g_gate.d[j] = Math.tanh(gates.d[2 * H_size + j]);
      o_gate.d[j] = sig(gates.d[3 * H_size + j]);
    }
    const Cnew = alloc(H_size, 1);
    for (let j = 0; j < H_size; j++) Cnew.d[j] = f_gate.d[j] * C.d[j] + i_gate.d[j] * g_gate.d[j];
    const Hnew = alloc(H_size, 1);
    for (let j = 0; j < H_size; j++) Hnew.d[j] = o_gate.d[j] * Math.tanh(Cnew.d[j]);
    H = Hnew; C = Cnew; allH.push(Hnew);
  }
  // Output Y: [H_size × seqLen], final H and C
  const Y = alloc(H_size, seqLen);
  for (let t = 0; t < seqLen; t++) for (let j = 0; j < H_size; j++) Y.d[j * seqLen + t] = allH[t].d[j];
  return [fromM2(Y), fromM2(H), fromM2(C)];
}

// ── GRU forward pass ──────────────────────────────────────────────────────────────────
// gru(X, H0, weights, recurrentWeights, bias)
async function gru_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 5) throw new MatError('gru: requires X,H0,W,R,b');
  const X = toM2(args[0]), H0 = toM2(args[1]);
  const W = toM2(args[2]), R = toM2(args[3]), b = toM2(args[4]);
  const H_size = H0.rows, seqLen = X.cols;
  let H = H0;
  const allH: M2[] = [];
  const sig = (v: number) => 1 / (1 + Math.exp(-v));

  for (let t = 0; t < seqLen; t++) {
    const xt = alloc(X.rows, 1);
    for (let i = 0; i < X.rows; i++) xt.d[i] = X.d[i * seqLen + t];
    const gateWx = addBias(mmul(W, xt), b);
    const gateRh = mmul(R, H);
    // MATLAB GRU gate order is [reset; update; candidate] (reset block first).
    const r = alloc(H_size, 1), z = alloc(H_size, 1);
    for (let j = 0; j < H_size; j++) {
      r.d[j] = sig(gateWx.d[j] + gateRh.d[j]);
      z.d[j] = sig(gateWx.d[H_size + j] + gateRh.d[H_size + j]);
    }
    // Default ResetGateMode = "after-multiplication": reset multiplies the recurrent term R*h.
    const hCand = alloc(H_size, 1);
    for (let j = 0; j < H_size; j++) hCand.d[j] = Math.tanh(gateWx.d[2 * H_size + j] + r.d[j] * gateRh.d[2 * H_size + j]);
    const Hnew = alloc(H_size, 1);
    for (let j = 0; j < H_size; j++) Hnew.d[j] = (1 - z.d[j]) * hCand.d[j] + z.d[j] * H.d[j];
    H = Hnew; allH.push(Hnew);
  }
  const Y = alloc(H_size, seqLen);
  for (let t = 0; t < seqLen; t++) for (let j = 0; j < H_size; j++) Y.d[j * seqLen + t] = allH[t].d[j];
  return [fromM2(Y), fromM2(H)];
}

// ── layerGraph ────────────────────────────────────────────────────────────────────────
async function layerGraph(args: Value[]): Promise<Value[]> {
  if (args.length < 1) return [makeObject('LayerGraph', new Map())];
  const props = new Map<string, Value>();
  props.set('Layers', args[0]);
  return [makeObject('LayerGraph', props)];
}

// ── analyzenetwork ────────────────────────────────────────────────────────────────────
async function analyzenetwork(args: Value[]): Promise<Value[]> {
  if (args.length < 1) return [scalar(0)];
  try {
    const net = unpackNet(args[0]);
    const props = new Map<string, Value>();
    props.set('NumLayers', scalar(net.layers.length));
    props.set('TotalLearnables', scalar(
      net.layers.reduce((s, l) => l.kind === 'fc' ? s + l.W.d.length + l.b.d.length : s, 0)
    ));
    return [makeObject('NetworkAnalysisResult', props)];
  } catch { return [scalar(0)]; }
}

// ── lstmLayer / gruLayer layer constructors ──────────────────────────────────────────
async function lstmLayer(args: Value[]): Promise<Value[]> {
  const units = args.length > 0 ? asScalar(m(args[0])) : 100;
  const props = new Map<string, Value>([
    ['_layerKind', str('lstm')], ['NumHiddenUnits', scalar(units)],
    ['OutputMode', str('sequence')],
  ]);
  return [makeObject('nnet.cnn.layer.lstmlayer', props)];
}

async function gruLayer(args: Value[]): Promise<Value[]> {
  const units = args.length > 0 ? asScalar(m(args[0])) : 100;
  const props = new Map<string, Value>([
    ['_layerKind', str('gru')], ['NumHiddenUnits', scalar(units)],
    ['OutputMode', str('sequence')],
  ]);
  return [makeObject('nnet.cnn.layer.grulayer', props)];
}

async function convolution2dLayer(args: Value[]): Promise<Value[]> {
  const filterSize = args.length > 0 ? asScalar(m(args[0])) : 3;
  const numFilters = args.length > 1 ? asScalar(m(args[1])) : 8;
  const props = new Map<string, Value>([
    ['_layerKind', str('conv2d')], ['FilterSize', scalar(filterSize)], ['NumFilters', scalar(numFilters)],
  ]);
  return [makeObject('nnet.cnn.layer.convolution2dlayer', props)];
}

async function maxPooling2dLayer(args: Value[]): Promise<Value[]> {
  const poolSize = args.length > 0 ? asScalar(m(args[0])) : 2;
  const props = new Map<string, Value>([
    ['_layerKind', str('maxpool2d')], ['PoolSize', scalar(poolSize)],
  ]);
  return [makeObject('nnet.cnn.layer.maxpooling2dlayer', props)];
}

async function averagePooling2dLayer(args: Value[]): Promise<Value[]> {
  const poolSize = args.length > 0 ? asScalar(m(args[0])) : 2;
  const props = new Map<string, Value>([
    ['_layerKind', str('avgpool2d')], ['PoolSize', scalar(poolSize)],
  ]);
  return [makeObject('nnet.cnn.layer.averagepooling2dlayer', props)];
}

export const NNET: ToolboxModule = {
  id: 'nnet',
  name: 'Deep Learning Toolbox',
  docBase: 'https://www.mathworks.com/help/deeplearning/',
  builtins: {
    // Layer constructors
    fullyConnectedLayer,
    reluLayer,
    sigmoidLayer,
    tanhLayer,
    softmaxLayer,
    geluLayer,
    leakyReluLayer,
    batchNormalizationLayer,
    dropoutLayer,
    imageInputLayer,
    featureInputLayer,
    sequenceInputLayer,
    classificationLayer,
    regressionLayer,
    lstmLayer,
    gruLayer,
    convolution2dLayer,
    maxPooling2dLayer,
    averagePooling2dLayer,
    // Network
    trainNetwork,
    trainingOptions,
    predict: predict_fn,
    classify: classify_fn,
    layerGraph,
    dlnetwork,
    analyzenetwork,
    // Custom training loop
    dlarray: dlarray_fn,
    extractdata,
    adamupdate: adamupdate_fn,
    dlfeval: dlfeval_fn,
    dlgradient: dlgradient_fn,   // now backed by the reverse-mode tape above
    // dlarray operation functions
    fullyconnect,
    relu: relu_fn,
    sigmoid: sigmoid_fn,
    softmax: softmax_fn,
    gelu: gelu_fn,
    leakyrelu: leakyrelu_fn,
    crossentropy: crossentropy_fn,
    mse: mse_fn,
    l2loss: l2loss_fn,
    batchnorm: batchnorm_fn,
    maxpool: maxpool_fn,
    lstm: lstm_fn,
    gru: gru_fn,
    onehotdecode,
  },
  // Tape-aware overloads so operators (x.^2, x+y, 2*x) and functions (sigmoid/sum/mse/…) on a
  // traced dlarray build the autodiff graph instead of hitting the base numeric builtins.
  methods: { dlarray: DLARRAY_METHODS },
  help: HELP_NNET,
};
