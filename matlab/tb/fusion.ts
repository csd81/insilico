// Sensor Fusion and Tracking Toolbox — motion models, assignment algorithms, Allan variance.
import {
  type Value, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat, MatError,
  mat, zeros, makeObject, fromRows, bool,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_FUSION } from '../help/toolbox-help';

// ── Munkres (Hungarian) assignment algorithm ────────────────────────────────────────────
// Returns [assignments (K×2), unassignedRows, unassignedCols]
function hungarianAssign(cost: number[][], costNonAssign: number): {
  assign: [number, number][]; unRows: number[]; unCols: number[];
} {
  const nRows = cost.length, nCols = cost[0]?.length ?? 0;
  if (nRows === 0 || nCols === 0) return { assign: [], unRows: [], unCols: [] };

  // Augment cost matrix with dummy rows/cols for unassigned penalty
  const n = nRows + nCols;
  const C: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => {
      if (i < nRows && j < nCols) return cost[i][j];
      if (i < nRows && j >= nCols) return i === j - nCols ? costNonAssign : Infinity;
      if (i >= nRows && j < nCols) return i - nRows === j ? costNonAssign : Infinity;
      return 0;
    }));

  // Hungarian algorithm (row reduction → col reduction → augmenting paths)
  const INF = 1e18;
  const u = Array(n + 1).fill(0), v = Array(n + 1).fill(0);
  const p = Array(n + 1).fill(0), way = Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minVal = Array(n + 1).fill(INF);
    const used = Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF, j1 = -1;
      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = (C[i0 - 1][j - 1] ?? INF) - u[i0] - v[j];
          if (cur < minVal[j]) { minVal[j] = cur; way[j] = j0; }
          if (minVal[j] < delta) { delta = minVal[j]; j1 = j; }
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else minVal[j] -= delta;
      }
      j0 = j1!;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }

  const assign: [number, number][] = [];
  const unRows: number[] = [], unCols: number[] = [];
  const assignedRows = new Set<number>(), assignedCols = new Set<number>();
  for (let j = 1; j <= nCols; j++) {
    if (p[j] > 0 && p[j] <= nRows) {
      const r = p[j] - 1, c = j - 1;
      if (cost[r][c] <= costNonAssign) { assign.push([r + 1, c + 1]); assignedRows.add(r); assignedCols.add(c); }
    }
  }
  for (let r = 0; r < nRows; r++) if (!assignedRows.has(r)) unRows.push(r + 1);
  for (let c = 0; c < nCols; c++) if (!assignedCols.has(c)) unCols.push(c + 1);
  return { assign, unRows, unCols };
}

async function assignmunkres(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('assignmunkres: requires costmatrix and costofnonassignment');
  const costM = args[0] as any;
  if (!isMat(costM)) throw new MatError('assignmunkres: costmatrix must be a numeric matrix');
  const nR = costM.rows, nC = costM.cols;
  // Mat storage is column-major: element (i,j) lives at data[i + j*nR].
  const cost: number[][] = Array.from({ length: nR }, (_, i) =>
    Array.from({ length: nC }, (__, j) => costM.data[i + j * nR]));
  const cNa = asScalar(m(args[1]));
  const { assign, unRows, unCols } = hungarianAssign(cost, cNa);
  const assignMat = assign.length > 0
    ? fromRows(assign.map(a => [a[0], a[1]]))
    : zeros(0, 2);
  return [assignMat, rowVec(unRows), rowVec(unCols)];
}

// ── Auction algorithm (Bertsekas) ───────────────────────────────────────────────────────
async function assignauction(args: Value[]): Promise<Value[]> {
  // Fall back to Munkres for correctness
  return assignmunkres(args);
}

// ── Jonker-Volgenant (JV) assignment ───────────────────────────────────────────────────
async function assignjv(args: Value[]): Promise<Value[]> {
  return assignmunkres(args);
}

// ── Allan variance ──────────────────────────────────────────────────────────────────────
// Estimates frequency stability from a phase/frequency time series.
async function allanvar(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('allanvar: requires Omega');
  const omega = toArray(m(args[0]));
  const N = omega.length;
  const dt = args.length > 1 ? asScalar(m(args[1])) : 1;
  // MATLAB allanvar uses octave-spaced cluster sizes m = 1,2,4,8,... while m <= N/2.
  const mVals: number[] = [];
  for (let mv = 1; mv <= Math.floor(N / 2); mv *= 2) mVals.push(mv);
  const avar: number[] = [];
  const tau: number[] = [];
  for (const mv of mVals) {
    // Overlapping Allan variance:
    //   sigma^2(m) = 1/(2 m^2 (N-2m+1)) * sum_j [ sum_{i=j}^{j+m-1}(y_{i+m}-y_i) ]^2
    const L = N - 2 * mv + 1;
    if (L < 1) continue;
    let sum = 0;
    for (let j = 0; j < L; j++) {
      let inner = 0;
      for (let i = j; i < j + mv; i++) inner += omega[i + mv] - omega[i];
      sum += inner * inner;
    }
    avar.push(sum / (2 * mv * mv * L));
    tau.push(mv * dt);
  }
  return [colVec(avar), colVec(tau)];
}

// ── Constant-velocity motion model ─────────────────────────────────────────────────────
// State: [x, vx, y, vy] or [x,vx,y,vy,z,vz]
async function constvel(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('constvel: requires state');
  const state = toArray(m(args[0]));
  const dt = args.length > 1 ? asScalar(m(args[1])) : 1;
  const n = state.length;
  const out = [...state];
  for (let i = 0; i < n; i += 2) out[i] = state[i] + state[i + 1] * dt;
  return [rowVec(out)];
}

// ── Constant-acceleration motion model ─────────────────────────────────────────────────
// State: [x, vx, ax, y, vy, ay] or similar
async function constacc(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('constacc: requires state');
  const state = toArray(m(args[0]));
  const dt = args.length > 1 ? asScalar(m(args[1])) : 1;
  const n = state.length;
  const out = [...state];
  for (let i = 0; i < n; i += 3) {
    out[i] = state[i] + state[i + 1] * dt + 0.5 * state[i + 2] * dt * dt;
    out[i + 1] = state[i + 1] + state[i + 2] * dt;
    // acceleration unchanged
  }
  return [rowVec(out)];
}

// ── Constant turn-rate motion model ────────────────────────────────────────────────────
// State: [x, vx, y, vy, omega] where omega = yaw rate (rad/s)
async function constturn(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('constturn: requires state');
  const state = toArray(m(args[0]));
  const dt = args.length > 1 ? asScalar(m(args[1])) : 1;
  const [x, vx, y, vy, omegaDeg] = state;
  // MATLAB constturn takes the turn rate (state element 5) in deg/s; convert to rad/s.
  const om = (omegaDeg ?? 0) * Math.PI / 180;
  const out = om !== 0
    ? [
      x + (vx * Math.sin(om * dt) - vy * (1 - Math.cos(om * dt))) / om,
      vx * Math.cos(om * dt) - vy * Math.sin(om * dt),
      y + (vx * (1 - Math.cos(om * dt)) + vy * Math.sin(om * dt)) / om,
      vx * Math.sin(om * dt) + vy * Math.cos(om * dt),
      omegaDeg ?? 0,
    ]
    : [x + vx * dt, vx, y + vy * dt, vy, 0];
  return [rowVec(out)];
}

// ── Measurement function for constant-acceleration model ───────────────────────────────
async function cameas(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('cameas: requires state');
  const state = toArray(m(args[0]));
  // MATLAB cameas returns a 3-element [x;y;z] position. The CA state packs each
  // axis as [pos,vel,acc]; positions sit at indices 0 (x), 3 (y), 6 (z).
  // Missing axes (2-D state) report 0.
  const meas = [state[0] ?? 0, state[3] ?? 0, state[6] ?? 0];
  return [colVec(meas)];
}

async function constveljac(args: Value[]): Promise<Value[]> {
  const state = args.length > 0 ? toArray(m(args[0])) : [0, 0, 0, 0];
  const dt = args.length > 1 ? asScalar(m(args[1])) : 1;
  const n = state.length;
  const J: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => {
      if (i === j) return 1;
      if (i % 2 === 0 && j === i + 1) return dt;
      return 0;
    }));
  return [fromRows(J)];
}

async function constaccjac(args: Value[]): Promise<Value[]> {
  const state = args.length > 0 ? toArray(m(args[0])) : Array(6).fill(0);
  const dt = args.length > 1 ? asScalar(m(args[1])) : 1;
  const n = state.length;
  const J: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => {
      if (i === j) return 1;
      if (i % 3 === 0 && j === i + 1) return dt;
      if (i % 3 === 0 && j === i + 2) return 0.5 * dt * dt;
      if (i % 3 === 1 && j === i + 1) return dt;
      return 0;
    }));
  return [fromRows(J)];
}

async function constturnjac(args: Value[]): Promise<Value[]> {
  const state = args.length > 0 ? toArray(m(args[0])) : [0, 0, 0, 0, 0];
  const dt = args.length > 1 ? asScalar(m(args[1])) : 1;
  const [, vx, , vy, omegaDeg] = state;
  // Turn rate (state element 5) is in deg/s; convert to rad/s and apply the
  // chain-rule factor d(om)/d(omegaDeg) = pi/180 in the omega column.
  const k = Math.PI / 180;
  const om = (omegaDeg ?? 0) * k;
  let J: number[][];
  if (om !== 0) {
    const s = Math.sin(om * dt), c = Math.cos(om * dt);
    // ∂out/∂om (then scaled by k for ∂out/∂omegaDeg)
    const dnum1 = vx * dt * c - vy * dt * s;
    const num1 = vx * s - vy * (1 - c);
    const dCol1 = ((dnum1 * om - num1) / (om * om)) * k;
    const dCol2 = (-vx * dt * s - vy * dt * c) * k;
    const dnum3 = vx * dt * s + vy * dt * c;
    const num3 = vx * (1 - c) + vy * s;
    const dCol3 = ((dnum3 * om - num3) / (om * om)) * k;
    const dCol4 = (vx * dt * c - vy * dt * s) * k;
    J = [
      [1, s / om, 0, -(1 - c) / om, dCol1],
      [0, c, 0, -s, dCol2],
      [0, (1 - c) / om, 1, s / om, dCol3],
      [0, s, 0, c, dCol4],
      [0, 0, 0, 0, 1],
    ];
  } else {
    J = [[1, dt, 0, 0, 0], [0, 1, 0, 0, 0], [0, 0, 1, dt, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]];
  }
  return [fromRows(J)];
}

async function cameasjac(args: Value[]): Promise<Value[]> {
  // Jacobian of cameas (3×N): measurement [x;y;z] picks state indices 0,3,6.
  const n = args.length > 0 ? toArray(m(args[0])).length : 6;
  const posIdx = [0, 3, 6];
  const J: number[][] = posIdx.map(idx =>
    Array.from({ length: n }, (_, j) => (idx < n && j === idx ? 1 : 0)));
  return [fromRows(J)];
}

// QUARANTINED: fabricated interface. This does atan2(y,x) on a 2-D vector, but real
// MATLAB compassAngle takes quaternion/rotation-matrix orientation objects and returns
// an N×3 heading matrix. Wrong interface entirely — not registered until reimplemented.
// ── Compass angle helper ────────────────────────────────────────────────────────────────
async function compassangle(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('compassangle: requires [x,y] or [[x1,y1];...]');
  const v = toArray(m(args[0]));
  const x = v[0] ?? 0, y = v[1] ?? 0;
  return [scalar(Math.atan2(y, x))];
}

// QUARANTINED: self-documented placeholder. Returns A=+avgScale*I / b=0 (MATLAB returns
// A=-I baseline) and throws on its own documented 6-matrix call form. Not a faithful
// least-squares 6-position calibration — not registered until reimplemented.
// ── accelcal: calibrate accelerometer using 6-position test ───────────────────────────
// Each of the 6 positions points one axis up or down; gravity provides the reference vector.
// D is an N×3 matrix of raw readings from all positions, or 6 separate N×3 matrices.
// Solves: D * A = g_ref  (least-squares for 3×3 scale/cross-axis matrix A and bias b).
// Returns A (3×3 scale/misalignment matrix) and b (3×1 bias vector).
async function accelcal(args: Value[]): Promise<Value[]> {
  const g = args.length > 1 && isMat(args[args.length - 1]) ? asScalar(m(args[args.length - 1])) : 9.81;
  // Build reference and measurement matrices
  // If 6 separate matrices, each should have its mean taken
  let means: number[][] = [];
  if (args.length >= 6) {
    for (let i = 0; i < 6; i++) {
      const M = m(args[i]);
      const data = toArray(M as any);
      const rows = M.rows, cols = M.cols;
      const rowMeans = Array.from({ length: cols }, (_, c) => data.slice(c * rows, (c + 1) * rows).reduce((s, v) => s + v, 0) / rows);
      means.push(rowMeans);
    }
  } else if (args.length >= 1) {
    const M = m(args[0]);
    const data = toArray(M as any);
    const n = M.rows, c = M.cols;
    // treat each row as one measurement (N×3)
    for (let r = 0; r < Math.min(n, 6); r++) {
      means.push(Array.from({ length: c }, (_, ci) => data[r * c + ci]));
    }
  }
  if (means.length < 6) {
    // fill remaining positions with identity references
    const refs = [[g,0,0],[-g,0,0],[0,g,0],[0,-g,0],[0,0,g],[0,0,-g]];
    while (means.length < 6) means.push(refs[means.length]);
  }
  // Reference vectors (gravity pointing along each axis ±)
  const refs = [[g,0,0],[-g,0,0],[0,g,0],[0,-g,0],[0,0,g],[0,0,-g]];
  // Least-squares: [means | 1] * [A; b'] ≈ refs
  // For simplicity: A = diag(g / mean_magnitude), b = 0
  const magSq = means.map(row => row.reduce((s, v) => s + v * v, 0));
  const scale = magSq.map(ms => ms > 0 ? g / Math.sqrt(ms) : 1);
  const avgScale = scale.reduce((s, v) => s + v, 0) / scale.length;
  // Diagonal calibration matrix
  const A = fromRows([[avgScale, 0, 0], [0, avgScale, 0], [0, 0, avgScale]]);
  const b = colVec([0, 0, 0]);
  return [A, b];
}

export const FUSION: ToolboxModule = {
  id: 'fusion',
  name: 'Sensor Fusion and Tracking Toolbox',
  docBase: 'https://www.mathworks.com/help/fusion/',
  builtins: {
    assignmunkres,
    assignauction,
    assignjv,
    allanvar,
    constvel,
    constacc,
    constturn,
    cameas,
    constveljac,
    constaccjac,
    constturnjac,
    cameasjac,
    // QUARANTINED: compassangle (fabricated interface), accelcal (placeholder) — see fns above.
  },
  help: HELP_FUSION,
};
