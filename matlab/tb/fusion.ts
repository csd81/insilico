// Sensor Fusion and Tracking Toolbox — motion models, assignment algorithms, Allan variance.
import {
  type Value, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat, MatError,
  mat, zeros, makeObject, fromRows, bool, makeCell,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_FUSION } from '../help';

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

// ── Murty's k-best assignment ───────────────────────────────────────────────────────────
// Enumerates the K lowest-cost assignments by recursively partitioning the solution space:
// solve the best assignment, then for each of its free pairs spawn a subproblem that excludes
// that pair (and forces the earlier ones), re-solve, and keep a cost-ordered frontier.
async function assignkbest(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('assignkbest: requires costmatrix and costofnonassignment');
  const costM = m(args[0]); if (!isMat(costM)) throw new MatError('assignkbest: costmatrix must be numeric');
  const nR = costM.rows, nC = costM.cols;
  const cost: number[][] = Array.from({ length: nR }, (_, i) => Array.from({ length: nC }, (__, j) => costM.data[i + j * nR]));
  const cNa = asScalar(m(args[1]));
  const K = args.length >= 3 ? Math.max(1, Math.round(asScalar(m(args[2])))) : 1;

  type Node = { forced: [number, number][]; excluded: [number, number][]; assign: [number, number][]; cost: number };
  // Solve one constrained subproblem: excluded pairs → Inf; forced pair (r,c) → blank its row r and
  // col c elsewhere so the matching must keep it. Returns null when forced pairs can't all be kept.
  const solveNode = (forced: [number, number][], excluded: [number, number][]): { assign: [number, number][]; cost: number } | null => {
    const c = cost.map((r) => r.slice());
    for (const [r, col] of excluded) c[r][col] = Infinity;
    for (const [r, col] of forced) { for (let j = 0; j < nC; j++) if (j !== col) c[r][j] = Infinity; for (let i = 0; i < nR; i++) if (i !== r) c[i][col] = Infinity; }
    const { assign } = hungarianAssign(c, cNa);
    for (const [r, col] of forced) if (!assign.some((a) => a[0] === r + 1 && a[1] === col + 1)) return null;
    let tot = 0; for (const [r, col] of assign) { if (!Number.isFinite(cost[r - 1][col - 1])) return null; tot += cost[r - 1][col - 1]; }
    tot += ((nR - assign.length) + (nC - assign.length)) * cNa;   // unassigned rows + cols pay cNa
    return { assign, cost: tot };
  };

  const init = solveNode([], []);
  const out: Node[] = [];
  if (init) {
    const pq: Node[] = [{ forced: [], excluded: [], assign: init.assign, cost: init.cost }];
    while (pq.length && out.length < K) {
      let bi = 0; for (let i = 1; i < pq.length; i++) if (pq[i].cost < pq[bi].cost) bi = i;
      const node = pq.splice(bi, 1)[0]; out.push(node);
      const forcedSet = new Set(node.forced.map(([r, c]) => `${r},${c}`));
      const free = node.assign.filter(([r, c]) => !forcedSet.has(`${r - 1},${c - 1}`));   // assign is 1-based
      let forced = node.forced.slice();
      for (const [r1, c1] of free) {
        const r = r1 - 1, col = c1 - 1;
        const child = solveNode(forced, [...node.excluded, [r, col]]);
        if (child) pq.push({ forced: forced.slice(), excluded: [...node.excluded, [r, col]], assign: child.assign, cost: child.cost });
        forced = [...forced, [r, col]];
      }
    }
  }
  // Outputs mirror MATLAB: assignments (K×1 cell of P×2), unassigned rows/cols (K×1 cells), costs (K×1).
  const asg = out.map((n) => (n.assign.length ? fromRows(n.assign.map((a) => [a[0], a[1]])) : zeros(0, 2)) as Value);
  const unR = out.map((n) => { const a = new Set(n.assign.map((p) => p[0])); return rowVec(Array.from({ length: nR }, (_, i) => i + 1).filter((i) => !a.has(i))) as Value; });
  const unC = out.map((n) => { const a = new Set(n.assign.map((p) => p[1])); return rowVec(Array.from({ length: nC }, (_, j) => j + 1).filter((j) => !a.has(j))) as Value; });
  return [makeCell(out.length, 1, asg), makeCell(out.length, 1, unR), makeCell(out.length, 1, unC), colVec(out.map((n) => n.cost))];
}

// ── Covariance intersection (small dense N×N helpers) ───────────────────────────────────
function detRC(A: number[][]): number {
  const n = A.length, M = A.map((r) => r.slice()); let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (p !== c) { [M[c], M[p]] = [M[p], M[c]]; d = -d; }
    const piv = M[c][c]; if (piv === 0) return 0; d *= piv;
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / piv; for (let k = c; k < n; k++) M[r][k] -= f * M[c][k]; }
  }
  return d;
}
function invRC(A: number[][]): number[][] {
  const n = A.length, M = A.map((r, i) => [...r.slice(), ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c]; for (let k = 0; k < 2 * n; k++) M[c][k] /= piv;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r) => r.slice(n));
}
/** [fused,Pf] = fusecovint(states,covs): covariance-intersection fusion of M tracks. states is N×M
 *  (columns = tracks), covs is N×N×M. MATLAB weights each track by 1/det(P_i) (normalized), then
 *  Pf⁻¹ = Σ w_i P_i⁻¹ and fused = Pf · Σ w_i P_i⁻¹ x_i (verified exact against R2026a). */
async function fusecovint(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('fusecovint: requires trackState and trackCov');
  const S = m(args[0]), Cv = m(args[1]); const N = S.rows, M = S.cols;
  const page = (k: number): number[][] => Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => Cv.data[r + c * N + k * N * N]));
  const xcol = (k: number): number[] => Array.from({ length: N }, (_, r) => S.data[r + k * N]);
  const invdet = Array.from({ length: M }, (_, k) => 1 / detRC(page(k)));
  const W = invdet.reduce((a, b) => a + b, 0);
  const Pinv = Array.from({ length: N }, () => new Array<number>(N).fill(0)); const b = new Array<number>(N).fill(0);
  for (let k = 0; k < M; k++) {
    const w = invdet[k] / W, Pi = invRC(page(k)), x = xcol(k);
    for (let i = 0; i < N; i++) { for (let j = 0; j < N; j++) Pinv[i][j] += w * Pi[i][j]; let s = 0; for (let j = 0; j < N; j++) s += Pi[i][j] * x[j]; b[i] += w * s; }
  }
  const Pf = invRC(Pinv);
  const xf = Array.from({ length: N }, (_, i) => { let s = 0; for (let j = 0; j < N; j++) s += Pf[i][j] * b[j]; return s; });
  return [colVec(xf), fromRows(Pf)];
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
    assignkbest,
    fusecovint,
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
