// Robotics System Toolbox — rigid-body kinematics utilities, rotation conversions, and
// occupancy-map helpers. Complex object-oriented classes (rigidBodyTree, inverseKinematics)
// are stubbed as ClassV objects to preserve script compatibility.
import {
  type Value, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat, MatError,
  mat, zeros, makeObject, fromRows, bool,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_ROBOTICS } from '../help';

const TWO_PI = 2 * Math.PI;

// ── angdiff: angular difference wrapped to (-pi, pi] ──────────────────────────────────
async function angdiff(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('angdiff: requires at least one angle argument');
  const wrap = (a: number) => { let r = ((a % TWO_PI) + TWO_PI) % TWO_PI; return r > Math.PI ? r - TWO_PI : r; };
  if (args.length === 1) {
    const a = toArray(m(args[0]));
    const diff = a.slice(0, -1).map((ai, i) => wrap(a[i + 1] - ai));
    return [rowVec(diff)];
  }
  const alpha = toArray(m(args[0])), beta = toArray(m(args[1]));
  const n = Math.max(alpha.length, beta.length);
  const result = Array.from({ length: n }, (_, i) => wrap((beta[i % beta.length] ?? 0) - (alpha[i % alpha.length] ?? 0)));
  return [result.length === 1 ? scalar(result[0]) : rowVec(result)];
}

// ── axang2quat: axis-angle [ax,ay,az,theta] → quaternion [w,x,y,z] ──────────────────
async function axang2quat(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('axang2quat: requires axis-angle [ax ay az theta]');
  const aa = toArray(m(args[0]));
  const ax = aa[0] ?? 0, ay = aa[1] ?? 0, az = aa[2] ?? 0, theta = aa[3] ?? 0;
  const s = Math.sin(theta / 2);
  const quat = [Math.cos(theta / 2), ax * s, ay * s, az * s];
  return [rowVec(quat)];
}

// ── axang2rotm: axis-angle → 3×3 rotation matrix ─────────────────────────────────────
async function axang2rotm(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('axang2rotm: requires axis-angle [ax ay az theta]');
  const aa = toArray(m(args[0]));
  const ax = aa[0] ?? 0, ay = aa[1] ?? 0, az = aa[2] ?? 0, theta = aa[3] ?? 0;
  const c = Math.cos(theta), s = Math.sin(theta), t = 1 - c;
  const R = [
    [t * ax * ax + c, t * ax * ay - s * az, t * ax * az + s * ay],
    [t * ax * ay + s * az, t * ay * ay + c, t * ay * az - s * ax],
    [t * ax * az - s * ay, t * ay * az + s * ax, t * az * az + c],
  ];
  return [fromRows(R)];
}

// ── axang2tform: axis-angle → 4×4 homogeneous transform (rotation only) ──────────────
async function axang2tform(args: Value[]): Promise<Value[]> {
  const [R] = await axang2rotm(args);
  const Rm = R as any;
  // Column-major 3×3: R(i,j) = data[i + 3*j]. Pack as rows into the 4×4.
  const T = fromRows([
    [Rm.data[0], Rm.data[3], Rm.data[6], 0],
    [Rm.data[1], Rm.data[4], Rm.data[7], 0],
    [Rm.data[2], Rm.data[5], Rm.data[8], 0],
    [0, 0, 0, 1],
  ]);
  return [T];
}

// ── cart2hom: Cartesian → homogeneous coordinates ────────────────────────────────────
async function cart2hom(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('cart2hom: requires Cartesian coordinates');
  const c = args[0] as any;
  if (!isMat(c)) throw new MatError('cart2hom: expected numeric matrix');
  const rows = c.rows, cols = c.cols;
  const out = zeros(rows, cols + 1);
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) out.data[r + col * rows] = c.data[r + col * rows];   // column-major
    out.data[r + cols * rows] = 1;
  }
  return [out];
}

// ── hom2cart: homogeneous → Cartesian coordinates ────────────────────────────────────
async function hom2cart(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('hom2cart: requires homogeneous matrix');
  const c = args[0] as any;
  if (!isMat(c)) throw new MatError('hom2cart: expected numeric matrix');
  const rows = c.rows, cols = c.cols - 1;
  const out = zeros(rows, cols);
  for (let r = 0; r < rows; r++) {
    const w = c.data[r + cols * rows];   // last (homogeneous) column, column-major (w=0 ⇒ point at infinity)
    for (let col = 0; col < cols; col++) out.data[r + col * rows] = c.data[r + col * rows] / w;
  }
  return [out];
}

// ── quat2rotm: quaternion [w x y z] → 3×3 rotation matrix ────────────────────────────
async function quat2rotm(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('quat2rotm: requires quaternion [w x y z]');
  const q = toArray(m(args[0]));
  const [w0, x0, y0, z0] = q;
  const nrm = Math.hypot(w0, x0, y0, z0);   // normalize so a non-unit quaternion still yields an orthonormal R
  if (nrm === 0) throw new MatError('quat2rotm: quaternion must be nonzero');
  const w = w0 / nrm, x = x0 / nrm, y = y0 / nrm, z = z0 / nrm;
  const R = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
  return [fromRows(R)];
}

// ── rotm2quat: 3×3 rotation matrix → quaternion [w x y z] ────────────────────────────
async function rotm2quat(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('rotm2quat: requires 3×3 rotation matrix');
  const R = args[0] as any;
  if (!isMat(R) || R.rows !== 3 || R.cols !== 3) throw new MatError('rotm2quat: expected 3×3 matrix');
  const d = R.data;
  const trace = d[0] + d[4] + d[8];
  let w: number, x: number, y: number, z: number;
  // Column-major d: (r,c) at d[r + 3c]. q antisymmetric parts use (Rij−Rji): x∝R21−R12=d[5]−d[7],
  // y∝R02−R20=d[6]−d[2], z∝R10−R01=d[1]−d[3] (the previous code had these negated).
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s; x = (d[5] - d[7]) * s; y = (d[6] - d[2]) * s; z = (d[1] - d[3]) * s;
  } else if (d[0] > d[4] && d[0] > d[8]) {
    const s = 2 * Math.sqrt(1 + d[0] - d[4] - d[8]);
    w = (d[5] - d[7]) / s; x = 0.25 * s; y = (d[1] + d[3]) / s; z = (d[2] + d[6]) / s;
  } else if (d[4] > d[8]) {
    const s = 2 * Math.sqrt(1 + d[4] - d[0] - d[8]);
    w = (d[6] - d[2]) / s; x = (d[1] + d[3]) / s; y = 0.25 * s; z = (d[5] + d[7]) / s;
  } else {
    const s = 2 * Math.sqrt(1 + d[8] - d[0] - d[4]);
    w = (d[1] - d[3]) / s; x = (d[2] + d[6]) / s; y = (d[5] + d[7]) / s; z = 0.25 * s;
  }
  return [rowVec([w, x, y, z])];
}

// ── rotm2axang: rotation matrix → axis-angle ────────────────────────────────────────
async function rotm2axang(args: Value[]): Promise<Value[]> {
  const [q] = await rotm2quat(args);
  const qv = toArray(q as any);
  const theta = 2 * Math.acos(Math.min(1, Math.max(-1, qv[0])));
  const s = Math.sin(theta / 2);
  if (Math.abs(s) < 1e-10) return [rowVec([0, 0, 1, 0])];
  return [rowVec([qv[1] / s, qv[2] / s, qv[3] / s, theta])];
}

// ── eul2rotm: Euler angles → rotation matrix ────────────────────────────────────────
// sequence: 'XYZ', 'ZYX', 'ZYZ', ... default 'ZYX'
async function eul2rotm(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('eul2rotm: requires Euler angles [r p y]');
  const eul = toArray(m(args[0]));
  const seq = args.length > 1 && isMat(args[1]) && (args[1] as any).isChar
    ? String.fromCharCode(...(Array.from((args[1] as any).data) as number[])).toUpperCase()
    : 'ZYX';
  const Rx = (a: number) => fromRows([[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]]);
  const Ry = (a: number) => fromRows([[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]]);
  const Rz = (a: number) => fromRows([[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]]);
  const matMul3 = (A: any, B: any): any => {
    const C = zeros(3, 3);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++)
      C.data[i + j * 3] += A.data[i + k * 3] * B.data[k + j * 3];   // column-major (data[r + c*rows])
    return C;
  };
  const rotFn = { X: Rx, Y: Ry, Z: Rz } as Record<string, (a: number) => any>;
  let R = rotFn[seq[0] ?? 'Z'](eul[0] ?? 0);
  for (let i = 1; i < seq.length; i++) R = matMul3(R, rotFn[seq[i]](eul[i] ?? 0));
  return [R];
}

// ── rotm2eul: rotation matrix → Euler angles ────────────────────────────────────────
async function rotm2eul(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('rotm2eul: requires 3×3 rotation matrix');
  const R = args[0] as any;
  if (!isMat(R)) throw new MatError('rotm2eul: expected matrix');
  const d = R.data;
  // ZYX convention. Column-major 3×3: R(i,j) = d[i + 3*j].
  // roll=atan2(R(3,2),R(3,3))=atan2(d[5],d[8]); pitch=atan2(-R(3,1),√(R32²+R33²))=atan2(-d[2],…);
  // yaw=atan2(R(2,1),R(1,1))=atan2(d[1],d[0]).
  const roll = Math.atan2(d[5], d[8]);
  const pitch = Math.atan2(-d[2], Math.sqrt(d[5] * d[5] + d[8] * d[8]));
  const yaw = Math.atan2(d[1], d[0]);
  return [rowVec([yaw, pitch, roll])];
}

// ── eul2quat, quat2eul: Euler ↔ quaternion via rotation matrix ──────────────────────
async function eul2quat(args: Value[]): Promise<Value[]> {
  const [R] = await eul2rotm(args);
  return rotm2quat([R]);
}

async function quat2eul(args: Value[]): Promise<Value[]> {
  const [R] = await quat2rotm(args);
  return rotm2eul([R]);
}

// ── eul2tform: Euler angles → 4×4 homogeneous transform ────────────────────────────
const _eul2tform = async (args: Value[]): Promise<Value[]> => {
  const [R] = await eul2rotm(args);
  const Rm = R as any;
  // Column-major 3×3: R(i,j) = data[i + 3*j]. Pack as rows into the 4×4.
  return [fromRows([
    [Rm.data[0], Rm.data[3], Rm.data[6], 0],
    [Rm.data[1], Rm.data[4], Rm.data[7], 0],
    [Rm.data[2], Rm.data[5], Rm.data[8], 0],
    [0, 0, 0, 1],
  ])];
};

// ── tform2eul: 4×4 → Euler angles ────────────────────────────────────────────────────
async function tform2eul(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('tform2eul: requires 4×4 matrix');
  const T = args[0] as any;
  if (!isMat(T)) throw new MatError('tform2eul: expected matrix');
  const d = T.data;
  // Column-major 4×4: R(i,j) = d[i + 4*j]. Extract upper-left 3×3 as rows.
  const R = fromRows([[d[0], d[4], d[8]], [d[1], d[5], d[9]], [d[2], d[6], d[10]]]);
  return rotm2eul([R]);
}

// ── tform2rotm: extract rotation from 4×4 ───────────────────────────────────────────
async function tform2rotm(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('tform2rotm: requires 4×4 matrix');
  const T = args[0] as any;
  if (!isMat(T)) throw new MatError('tform2rotm: expected matrix');
  const d = T.data;
  // Column-major 4×4: R(i,j) = d[i + 4*j]. Extract upper-left 3×3 as rows.
  return [fromRows([[d[0], d[4], d[8]], [d[1], d[5], d[9]], [d[2], d[6], d[10]]])];
}

// ── trvec2tform: translation vector → 4×4 transform ─────────────────────────────────
async function trvec2tform(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('trvec2tform: requires translation vector');
  const t = toArray(m(args[0]));
  return [fromRows([
    [1, 0, 0, t[0] ?? 0],
    [0, 1, 0, t[1] ?? 0],
    [0, 0, 1, t[2] ?? 0],
    [0, 0, 0, 1],
  ])];
}

// ── tform2trvec: extract translation from 4×4 ───────────────────────────────────────
async function tform2trvec(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('tform2trvec: requires 4×4 matrix');
  const T = args[0] as any;
  if (!isMat(T)) throw new MatError('tform2trvec: expected matrix');
  const d = T.data;
  // Translation = first 3 entries of last column of 4×4 (column-major): d[12],d[13],d[14].
  return [rowVec([d[12], d[13], d[14]])];
}

// ── rigidBodyTree: stub object ────────────────────────────────────────────────────────
async function rigidBodyTree(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  props.set('NumBodies', scalar(0));
  props.set('DataFormat', fromRows([])); // empty placeholder
  props.set('Gravity', rowVec([0, 0, -9.81]));
  return [makeObject('rigidBodyTree', props)];
}

// ── bsplinepolytraj ───────────────────────────────────────────────────────────────────
async function bsplinepolytraj(args: Value[]): Promise<Value[]> {
  if (args.length < 3) throw new MatError('bsplinepolytraj: requires waypoints, timePoints, tSamples');
  const wp = args[0] as any;
  if (!isMat(wp)) throw new MatError('bsplinepolytraj: waypoints must be numeric');
  const tPts = toArray(m(args[1]));
  const tSam = toArray(m(args[2]));
  // Linear interpolation fallback
  const nDim = wp.rows, nWP = wp.cols;
  const pos = zeros(nDim, tSam.length);
  const tStart = tPts[0] ?? 0, tEnd = tPts[tPts.length - 1] ?? 1;
  for (let k = 0; k < tSam.length; k++) {
    const alpha = (tSam[k] - tStart) / (tEnd - tStart || 1);
    const col = Math.min(nWP - 2, Math.floor(alpha * (nWP - 1)));
    const t = alpha * (nWP - 1) - col;
    for (let d = 0; d < nDim; d++) {
      // Column-major: pos(d,k) at d + k*nDim; wp(d,col) at d + col*nDim.
      pos.data[d + k * nDim] = (1 - t) * wp.data[d + col * nDim] + t * wp.data[d + (col + 1) * nDim];
    }
  }
  return [pos];
}

// ── quatnormalize: normalize quaternion(s) to unit length ─────────────────────────────
async function quatnormalize(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('quatnormalize: requires quaternion input');
  const q = args[0] as any;
  if (!isMat(q)) throw new MatError('quatnormalize: expected numeric matrix');
  const data = toArray(q);
  const rows = q.rows, cols = q.cols;
  const out = new Float64Array(data.length);
  // Each row is one quaternion [w x y z]. Column-major: (r,c) at r + c*rows.
  for (let r = 0; r < rows; r++) {
    let norm = 0;
    for (let c = 0; c < cols; c++) norm += data[r + c * rows] ** 2;
    norm = Math.sqrt(norm) || 1;
    for (let c = 0; c < cols; c++) out[r + c * rows] = data[r + c * rows] / norm;
  }
  return [mat(rows, cols, out)];
}

export const ROBOTICS: ToolboxModule = {
  id: 'robotics',
  name: 'Robotics System Toolbox',
  docBase: 'https://www.mathworks.com/help/robotics/',
  builtins: {
    angdiff,
    axang2quat,
    axang2rotm,
    axang2tform,
    cart2hom,
    hom2cart,
    quat2rotm,
    rotm2quat,
    rotm2axang,
    eul2rotm,
    rotm2eul,
    eul2quat,
    quat2eul,
    eul2tform: _eul2tform,
    tform2eul,
    tform2rotm,
    trvec2tform,
    tform2trvec,
    rigidBodyTree,
    bsplinepolytraj,
    quatnormalize,
  },
  help: HELP_ROBOTICS,
};
