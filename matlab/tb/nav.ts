// Navigation Toolbox — ToolboxModule subset
// Functions: lla2ecef, ecef2lla, quatnormalize, lla2ned, lla2enu,
//            eul2quat, quat2eul, eul2rotm, rotm2eul, eul2tform
// All validated against live MATLAB R2026a.

import type { Builtin } from '../builtins';
import { type Value, type Mat, rowVec, toMat as m, isMat, mat, makeND } from '../values';
import type { ToolboxModule } from './types';
import { WGS84_A, WGS84_F } from '../physconst';
import { HELP_NAV } from '../help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

/** cart2hom(C): append a column of ones (N×D → N×(D+1)). */
function cart2homImpl(args: Value[]): Value {
  const C = m(args[0]); const N = C.rows, D = C.cols;
  const out = new Float64Array(N * (D + 1));
  out.set(C.data.subarray(0, N * D));
  for (let r = 0; r < N; r++) out[r + D * N] = 1;
  return mat(N, D + 1, out);
}
/** hom2cart(H): divide by the last column and drop it (N×(D+1) → N×D). */
function hom2cartImpl(args: Value[]): Value {
  const H = m(args[0]); const N = H.rows, D = H.cols - 1;
  const out = new Float64Array(N * D);
  for (let r = 0; r < N; r++) { const w = H.data[r + D * N]; for (let c = 0; c < D; c++) out[r + c * N] = H.data[r + c * N] / w; }
  return mat(N, D, out);
}
/** trvec2tform(t): translation vectors (N×3) → 4×4 (or 4×4×N) homogeneous transforms. */
function trvec2tformImpl(args: Value[]): Value {
  const T = m(args[0]); const N = T.rows;
  const make = (i: number) => { const d = new Float64Array(16); d[0] = d[5] = d[10] = d[15] = 1; d[0 + 3 * 4] = T.data[i + 0 * N]; d[1 + 3 * 4] = T.data[i + 1 * N]; d[2 + 3 * 4] = T.data[i + 2 * N]; return d; };
  if (N === 1) return mat(4, 4, make(0));
  const data = new Float64Array(16 * N);
  for (let i = 0; i < N; i++) data.set(make(i), i * 16);
  return makeND([4, 4, N], data);
}
/** Elementary rotation matrix about an axis, angle in DEGREES (Phased Array convention). */
function elemRot(args: Value[], axis: 'x' | 'y' | 'z'): Value {
  const A = m(args[0]); const angs = Array.from(A.data); const N = angs.length;
  const build = (deg: number) => {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); const d = new Float64Array(9);
    if (axis === 'x') { d[0] = 1; d[4] = c; d[5] = s; d[7] = -s; d[8] = c; }
    else if (axis === 'y') { d[0] = c; d[2] = -s; d[4] = 1; d[6] = s; d[8] = c; }
    else { d[0] = c; d[1] = s; d[3] = -s; d[4] = c; d[8] = 1; }
    return d;
  };
  if (N === 1) return mat(3, 3, build(angs[0]));
  const data = new Float64Array(9 * N); for (let i = 0; i < N; i++) data.set(build(angs[i]), i * 9); return makeND([3, 3, N], data);
}
/** quat2rotm([w x y z]): quaternion → 3×3 rotation matrix (normalized). */
function quat2rotmImpl(args: Value[]): Value {
  const Q = m(args[0]); const N = Q.rows;
  const make = (i: number) => {
    let w = Q.data[i + 0 * N], x = Q.data[i + 1 * N], y = Q.data[i + 2 * N], z = Q.data[i + 3 * N];
    const n = Math.hypot(w, x, y, z) || 1; w /= n; x /= n; y /= n; z /= n; const d = new Float64Array(9);
    d[0] = 1 - 2 * (y * y + z * z); d[1] = 2 * (x * y + w * z); d[2] = 2 * (x * z - w * y);
    d[3] = 2 * (x * y - w * z); d[4] = 1 - 2 * (x * x + z * z); d[5] = 2 * (y * z + w * x);
    d[6] = 2 * (x * z + w * y); d[7] = 2 * (y * z - w * x); d[8] = 1 - 2 * (x * x + y * y); return d;
  };
  if (N === 1) return mat(3, 3, make(0));
  const data = new Float64Array(9 * N); for (let i = 0; i < N; i++) data.set(make(i), i * 9); return makeND([3, 3, N], data);
}
/** rotm2quat(R): 3×3 rotation → quaternion [w x y z] (Shepperd's method, w≥0). */
function rotm2quatImpl(args: Value[]): Value {
  const R = m(args[0]); const N = R.nd && R.nd.length === 3 ? R.nd[2] : 1;
  const make = (off: number) => {
    const g = (r: number, c: number) => R.data[off + r + c * 3];
    const tr = g(0, 0) + g(1, 1) + g(2, 2); let w: number, x: number, y: number, z: number;
    if (tr > 0) { const S = Math.sqrt(tr + 1) * 2; w = 0.25 * S; x = (g(2, 1) - g(1, 2)) / S; y = (g(0, 2) - g(2, 0)) / S; z = (g(1, 0) - g(0, 1)) / S; }
    else if (g(0, 0) > g(1, 1) && g(0, 0) > g(2, 2)) { const S = Math.sqrt(1 + g(0, 0) - g(1, 1) - g(2, 2)) * 2; w = (g(2, 1) - g(1, 2)) / S; x = 0.25 * S; y = (g(0, 1) + g(1, 0)) / S; z = (g(0, 2) + g(2, 0)) / S; }
    else if (g(1, 1) > g(2, 2)) { const S = Math.sqrt(1 + g(1, 1) - g(0, 0) - g(2, 2)) * 2; w = (g(0, 2) - g(2, 0)) / S; x = (g(0, 1) + g(1, 0)) / S; y = 0.25 * S; z = (g(1, 2) + g(2, 1)) / S; }
    else { const S = Math.sqrt(1 + g(2, 2) - g(0, 0) - g(1, 1)) * 2; w = (g(1, 0) - g(0, 1)) / S; x = (g(0, 2) + g(2, 0)) / S; y = (g(1, 2) + g(2, 1)) / S; z = 0.25 * S; }
    if (w < 0) { w = -w; x = -x; y = -y; z = -z; }
    return [w, x, y, z];
  };
  if (N === 1) { const q = make(0); return rowVec(q); }
  const out = new Float64Array(N * 4); for (let i = 0; i < N; i++) { const q = make(i * 9); for (let k = 0; k < 4; k++) out[i + k * N] = q[k]; } return mat(N, 4, out);
}
/** quat2axang([w x y z]): quaternion → axis-angle [x y z θ]. */
function quat2axangImpl(args: Value[]): Value {
  const Q = m(args[0]); const N = Q.rows; const out = new Float64Array(N * 4);
  for (let i = 0; i < N; i++) {
    let w = Q.data[i + 0 * N], x = Q.data[i + 1 * N], y = Q.data[i + 2 * N], z = Q.data[i + 3 * N];
    const n = Math.hypot(w, x, y, z) || 1; w /= n; x /= n; y /= n; z /= n;
    const s = Math.sqrt(Math.max(0, 1 - w * w)); const theta = 2 * Math.acos(Math.min(1, Math.max(-1, w)));
    let ax = 0, ay = 0, az = 1;
    if (s > 1e-12) { ax = x / s; ay = y / s; az = z / s; }
    out[i + 0 * N] = ax; out[i + 1 * N] = ay; out[i + 2 * N] = az; out[i + 3 * N] = theta;
  }
  return N === 1 ? rowVec([out[0], out[1], out[2], out[3]]) : mat(N, 4, out);
}
/** rotm2tform(R): 3×3 (or 3×3×N) rotation → 4×4 homogeneous transform (zero translation). */
function rotm2tformImpl(args: Value[]): Value {
  const R = m(args[0]); const N = R.nd && R.nd.length === 3 ? R.nd[2] : 1;
  const make = (i: number) => { const d = new Float64Array(16); d[15] = 1; const ro = i * 9; for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) d[r + c * 4] = R.data[ro + r + c * 3]; return d; };
  if (N === 1) return mat(4, 4, make(0));
  const data = new Float64Array(16 * N); for (let i = 0; i < N; i++) data.set(make(i), i * 16); return makeND([4, 4, N], data);
}
/** tform2rotm(T): 4×4 (or 4×4×N) → 3×3 rotation block(s). */
function tform2rotmImpl(args: Value[]): Value {
  const T = m(args[0]); const N = T.nd && T.nd.length === 3 ? T.nd[2] : 1;
  const make = (i: number) => { const d = new Float64Array(9); const to = i * 16; for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) d[r + c * 3] = T.data[to + r + c * 4]; return d; };
  if (N === 1) return mat(3, 3, make(0));
  const data = new Float64Array(9 * N); for (let i = 0; i < N; i++) data.set(make(i), i * 9); return makeND([3, 3, N], data);
}
/** axang2rotm([x y z θ]): axis-angle → 3×3 rotation via Rodrigues' formula. */
function axang2rotmImpl(args: Value[]): Value {
  const A = m(args[0]); const N = A.rows;
  const make = (i: number) => {
    const x = A.data[i + 0 * N], y = A.data[i + 1 * N], z = A.data[i + 2 * N], th = A.data[i + 3 * N];
    const n = Math.hypot(x, y, z) || 1, ux = x / n, uy = y / n, uz = z / n;
    const c = Math.cos(th), s = Math.sin(th), t = 1 - c; const d = new Float64Array(9);
    d[0] = t * ux * ux + c; d[1] = t * ux * uy + s * uz; d[2] = t * ux * uz - s * uy;
    d[3] = t * ux * uy - s * uz; d[4] = t * uy * uy + c; d[5] = t * uy * uz + s * ux;
    d[6] = t * ux * uz + s * uy; d[7] = t * uy * uz - s * ux; d[8] = t * uz * uz + c; return d;
  };
  if (N === 1) return mat(3, 3, make(0));
  const data = new Float64Array(9 * N); for (let i = 0; i < N; i++) data.set(make(i), i * 9); return makeND([3, 3, N], data);
}
/** axang2quat([x y z θ]): axis-angle → quaternion [w x y z]. */
function axang2quatImpl(args: Value[]): Value {
  const A = m(args[0]); const N = A.rows; const out = new Float64Array(N * 4);
  for (let i = 0; i < N; i++) {
    const x = A.data[i + 0 * N], y = A.data[i + 1 * N], z = A.data[i + 2 * N], th = A.data[i + 3 * N];
    const n = Math.hypot(x, y, z) || 1, h = th / 2, sh = Math.sin(h);
    out[i + 0 * N] = Math.cos(h); out[i + 1 * N] = sh * x / n; out[i + 2 * N] = sh * y / n; out[i + 3 * N] = sh * z / n;
  }
  return N === 1 ? rowVec([out[0], out[1], out[2], out[3]]) : mat(N, 4, out);
}
/** tform2trvec(T): 4×4 (or 4×4×N) → translation row vectors (N×3). */
function tform2trvecImpl(args: Value[]): Value {
  const T = m(args[0]); const N = T.nd && T.nd.length === 3 ? T.nd[2] : 1;
  const out = new Float64Array(N * 3);
  for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) out[i + k * N] = T.data[i * 16 + k + 3 * 4];
  return N === 1 ? rowVec([out[0], out[1], out[2]]) : mat(N, 3, out);
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// WGS-84 parameters (MATLAB's referenceEllipsoid('wgs84') convention); A/F shared via physconst.
const WGS84_E2 = WGS84_F * (2 - WGS84_F); // first eccentricity squared

// --- core scalar transforms -------------------------------------------------

function llaToEcef(lat: number, lon: number, alt: number): [number, number, number] {
  const latR = lat * DEG2RAD;
  const lonR = lon * DEG2RAD;
  const sLat = Math.sin(latR), cLat = Math.cos(latR);
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sLat * sLat);
  const x = (N + alt) * cLat * Math.cos(lonR);
  const y = (N + alt) * cLat * Math.sin(lonR);
  const z = (N * (1 - WGS84_E2) + alt) * sLat;
  return [x, y, z];
}

function ecefToLla(x: number, y: number, z: number): [number, number, number] {
  const lon = Math.atan2(y, x);
  const p = Math.hypot(x, y);
  // Iterative latitude (Bowring-style fixed point).
  let lat = Math.atan2(z, p * (1 - WGS84_E2));
  for (let i = 0; i < 12; i++) {
    const sLat = Math.sin(lat);
    const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sLat * sLat);
    lat = Math.atan2(z + WGS84_E2 * N * sLat, p);
  }
  const sLat = Math.sin(lat);
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sLat * sLat);
  const cLat = Math.cos(lat);
  // Altitude robust near the poles where cos(lat) → 0.
  const alt = Math.abs(cLat) > 1e-12 ? p / cLat - N : z / sLat - N * (1 - WGS84_E2);
  return [lat * RAD2DEG, lon * RAD2DEG, alt];
}

// Rotate an ECEF difference vector into local ENU at origin (lat0,lon0 in deg).
function ecefDiffToEnu(dx: number, dy: number, dz: number, lat0: number, lon0: number): [number, number, number] {
  const latR = lat0 * DEG2RAD, lonR = lon0 * DEG2RAD;
  const sLat = Math.sin(latR), cLat = Math.cos(latR);
  const sLon = Math.sin(lonR), cLon = Math.cos(lonR);
  const e = -sLon * dx + cLon * dy;
  const n = -sLat * cLon * dx - sLat * sLon * dy + cLat * dz;
  const u = cLat * cLon * dx + cLat * sLon * dy + sLat * dz;
  return [e, n, u];
}

// Flat-earth local NED of `lla` relative to `lla0` (MATLAB 'flat' method).
// Uses the meridian/transverse radii of curvature evaluated at the origin latitude.
function llaToNedFlat(lat: number, lon: number, alt: number, lat0: number, lon0: number, alt0: number): [number, number, number] {
  const latR = lat0 * DEG2RAD;
  const sLat = Math.sin(latR), cLat = Math.cos(latR);
  const denom = 1 - WGS84_E2 * sLat * sLat;
  const Rn = WGS84_A / Math.sqrt(denom);            // transverse (prime vertical) radius
  const Rm = (WGS84_A * (1 - WGS84_E2)) / Math.pow(denom, 1.5); // meridian radius
  const dLat = (lat - lat0) * DEG2RAD;
  const dLon = (lon - lon0) * DEG2RAD;
  const north = dLat * Rm;
  const east = dLon * (Rn * cLat);
  const down = -(alt - alt0);
  return [north, east, down];
}

// --- per-row matrix helpers -------------------------------------------------

/** Apply a 3->3 row transform over a 1x3 row or Nx3 matrix, preserving shape. */
function map3(mat: Mat, fn: (a: number, b: number, c: number) => [number, number, number]): Mat {
  const { rows, cols } = mat;
  if (cols !== 3) throw new Error('expected an N-by-3 matrix (or 3-element row vector)');
  const out = new Float64Array(rows * 3);
  for (let r = 0; r < rows; r++) {
    const a = mat.data[r + 0 * rows];
    const b = mat.data[r + 1 * rows];
    const c = mat.data[r + 2 * rows];
    const [o0, o1, o2] = fn(a, b, c);
    out[r + 0 * rows] = o0;
    out[r + 1 * rows] = o1;
    out[r + 2 * rows] = o2;
  }
  return { kind: 'num', rows, cols: 3, data: out };
}

/** Broadcast a 1x3 origin row or per-row Nx3 origins against the data shape. */
function originRow(mat: Mat, r: number): [number, number, number] {
  const { rows } = mat;
  const idx = mat.rows === 1 ? 0 : r;
  return [
    mat.data[idx + 0 * rows],
    mat.data[idx + 1 * rows],
    mat.data[idx + 2 * rows],
  ];
}

function lla2localImpl(args: Value[], output: 'ned' | 'enu'): Mat {
  const lla = m(args[0], 'lla');
  const lla0 = m(args[1], 'lla0');
  if (lla.cols !== 3 || lla0.cols !== 3) throw new Error('lla and lla0 must be N-by-3');
  let method = 'ellipsoid';
  if (args.length >= 3) {
    const mv = args[2];
    if (isMat(mv) && mv.isChar) method = String.fromCharCode(...Array.from(mv.data)).toLowerCase();
  }
  const rows = lla.rows;
  const out = new Float64Array(rows * 3);
  for (let r = 0; r < rows; r++) {
    const lat = lla.data[r + 0 * rows];
    const lon = lla.data[r + 1 * rows];
    const alt = lla.data[r + 2 * rows];
    const [lat0, lon0, alt0] = originRow(lla0, r);
    let ned: [number, number, number];
    if (method === 'flat') {
      ned = llaToNedFlat(lat, lon, alt, lat0, lon0, alt0);
    } else {
      const [x, y, z] = llaToEcef(lat, lon, alt);
      const [x0, y0, z0] = llaToEcef(lat0, lon0, alt0);
      const [e, n, u] = ecefDiffToEnu(x - x0, y - y0, z - z0, lat0, lon0);
      ned = [n, e, -u];
    }
    let o0: number, o1: number, o2: number;
    if (output === 'ned') { [o0, o1, o2] = ned; }
    else { o0 = ned[1]; o1 = ned[0]; o2 = -ned[2]; } // ENU = (east, north, up)
    out[r + 0 * rows] = o0;
    out[r + 1 * rows] = o1;
    out[r + 2 * rows] = o2;
  }
  return { kind: 'num', rows, cols: 3, data: out };
}

function quatnormalizeImpl(args: Value[]): Mat {
  const q = m(args[0], 'quat');
  if (q.cols !== 4) throw new Error('quatnormalize expects an N-by-4 quaternion array');
  const { rows } = q;
  const out = new Float64Array(rows * 4);
  for (let r = 0; r < rows; r++) {
    const a = q.data[r + 0 * rows];
    const b = q.data[r + 1 * rows];
    const c = q.data[r + 2 * rows];
    const d = q.data[r + 3 * rows];
    const nrm = Math.sqrt(a * a + b * b + c * c + d * d);
    out[r + 0 * rows] = a / nrm;
    out[r + 1 * rows] = b / nrm;
    out[r + 2 * rows] = c / nrm;
    out[r + 3 * rows] = d / nrm;
  }
  return { kind: 'num', rows, cols: 4, data: out };
}

// --- Euler / quaternion / rotation-matrix conversions -----------------------
//
// Ports of MathWorks' shared rotations code (feul2qparts / qparts2feul /
// robotics.internal.eul2rotm / rotm2eul). Angles in radians. Quaternions are
// [w x y z] with w the scalar. Default sequence is body-fixed (intrinsic)
// 'ZYX'. Rotation matrices are 3-by-3-by-N column-major N-D arrays.

const EULER_SEQS = new Set([
  'ZYX', 'ZYZ', 'XYZ', 'ZXY', 'ZXZ', 'YXZ',
  'YXY', 'YZX', 'YZY', 'XYX', 'XZY', 'XZX',
]);

/** Read an optional trailing sequence string argument; default 'ZYX'. */
function readSeq(args: Value[], idx: number): string {
  if (args.length <= idx) return 'ZYX';
  const v = args[idx];
  if (!isMat(v) || !v.isChar) throw new Error('rotation sequence must be a string');
  const seq = String.fromCharCode(...Array.from(v.data)).toUpperCase();
  if (!EULER_SEQS.has(seq)) throw new Error(`unsupported rotation sequence '${seq}'`);
  return seq;
}

// Euler-angle row (a,b,c after halving) -> quaternion parts [qa,qb,qc,qd].
// Mirrors matlabshared.rotations.internal.feul2qparts (inputs already /2).
function eulHalfToQparts(seq: string, a: number, b: number, c: number): [number, number, number, number] {
  const sa = Math.sin(a), ca = Math.cos(a);
  const sb = Math.sin(b), cb = Math.cos(b);
  const sc = Math.sin(c), cc = Math.cos(c);
  switch (seq) {
    case 'YZY': return [cb * Math.cos(a + c), sb * Math.sin(a - c), cb * Math.sin(a + c), sb * Math.cos(a - c)];
    case 'YXY': return [cb * Math.cos(a + c), sb * Math.cos(a - c), cb * Math.sin(a + c), -sb * Math.sin(a - c)];
    case 'ZYZ': return [cb * Math.cos(a + c), -sb * Math.sin(a - c), sb * Math.cos(a - c), cb * Math.sin(a + c)];
    case 'ZXZ': return [cb * Math.cos(a + c), sb * Math.cos(a - c), sb * Math.sin(a - c), cb * Math.sin(a + c)];
    case 'XYX': return [cb * Math.cos(a + c), cb * Math.sin(a + c), sb * Math.cos(a - c), sb * Math.sin(a - c)];
    case 'XZX': return [cb * Math.cos(a + c), cb * Math.sin(a + c), -sb * Math.sin(a - c), sb * Math.cos(a - c)];
    case 'XYZ': return [ca * cb * cc - sa * sb * sc, cb * cc * sa + ca * sb * sc, ca * cc * sb - cb * sa * sc, ca * cb * sc + cc * sa * sb];
    case 'YZX': return [ca * cb * cc - sa * sb * sc, ca * cb * sc + cc * sa * sb, cb * cc * sa + ca * sb * sc, ca * cc * sb - cb * sa * sc];
    case 'ZXY': return [ca * cb * cc - sa * sb * sc, ca * cc * sb - cb * sa * sc, ca * cb * sc + cc * sa * sb, cb * cc * sa + ca * sb * sc];
    case 'XZY': return [ca * cb * cc + sa * sb * sc, cb * cc * sa - ca * sb * sc, ca * cb * sc - cc * sa * sb, ca * cc * sb + cb * sa * sc];
    case 'ZYX': return [ca * cb * cc + sa * sb * sc, ca * cb * sc - cc * sa * sb, ca * cc * sb + cb * sa * sc, cb * cc * sa - ca * sb * sc];
    case 'YXZ': return [ca * cb * cc + sa * sb * sc, ca * cc * sb + cb * sa * sc, cb * cc * sa - ca * sb * sc, ca * cb * sc - cc * sa * sb];
    default: throw new Error(`unsupported rotation sequence '${seq}'`);
  }
}

function eul2quatImpl(args: Value[]): Mat {
  const eul = m(args[0], 'eul');
  if (eul.cols !== 3) throw new Error('eul2quat expects an N-by-3 matrix of Euler angles');
  const seq = readSeq(args, 1);
  const { rows } = eul;
  const out = new Float64Array(rows * 4);
  for (let r = 0; r < rows; r++) {
    const a = eul.data[r + 0 * rows] / 2;
    const b = eul.data[r + 1 * rows] / 2;
    const c = eul.data[r + 2 * rows] / 2;
    const [qa, qb, qc, qd] = eulHalfToQparts(seq, a, b, c);
    out[r + 0 * rows] = qa;
    out[r + 1 * rows] = qb;
    out[r + 2 * rows] = qc;
    out[r + 3 * rows] = qd;
  }
  return { kind: 'num', rows, cols: 4, data: out };
}

const TWO_EPS10 = 10 * Number.EPSILON;
function clampUnit(x: number): number { return x > 1 ? 1 : x < -1 ? -1 : x; }

// Quaternion parts -> Euler-angle row [a,b,c]. Mirrors qparts2feul.
function qparts2eul(seq: string, qa: number, qb: number, qc: number, qd: number): [number, number, number] {
  let a = 0, b = 0, c = 0;
  // Proper (symmetric) sequences use acos; Tait–Bryan use asin.
  switch (seq) {
    case 'YZY': {
      const tmp = clampUnit(2 * qa * qa - 1 + 2 * qc * qc);
      if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = 2 * Math.atan2(qb, qd); c = 0; b = Math.PI; }
      else if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qc, qa); c = 0; b = 0; }
      else { a = Math.atan2(2 * qa * qb + 2 * qc * qd, 2 * qa * qd - 2 * qb * qc); c = -Math.atan2(2 * qa * qb - 2 * qc * qd, 2 * qa * qd + 2 * qb * qc); b = Math.acos(tmp); }
      break;
    }
    case 'YXY': {
      const tmp = clampUnit(2 * qa * qa - 1 + 2 * qc * qc);
      if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = -2 * Math.atan2(qd, qb); c = 0; b = Math.PI; }
      else if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qc, qa); c = 0; b = 0; }
      else { a = -Math.atan2(2 * qa * qd - 2 * qb * qc, 2 * qa * qb + 2 * qc * qd); c = Math.atan2(2 * qa * qd + 2 * qb * qc, 2 * qa * qb - 2 * qc * qd); b = Math.acos(tmp); }
      break;
    }
    case 'ZYZ': {
      const tmp = clampUnit(2 * qa * qa - 1 + 2 * qd * qd);
      if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = -2 * Math.atan2(qb, qc); c = 0; b = Math.PI; }
      else if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qd, qa); c = 0; b = 0; }
      else { a = -Math.atan2(2 * qa * qb - 2 * qc * qd, 2 * qa * qc + 2 * qb * qd); c = Math.atan2(2 * qa * qb + 2 * qc * qd, 2 * qa * qc - 2 * qb * qd); b = Math.acos(tmp); }
      break;
    }
    case 'ZXZ': {
      const tmp = clampUnit(2 * qa * qa - 1 + 2 * qd * qd);
      if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = 2 * Math.atan2(qc, qb); c = 0; b = Math.PI; }
      else if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qd, qa); c = 0; b = 0; }
      else { a = Math.atan2(2 * qa * qc + 2 * qb * qd, 2 * qa * qb - 2 * qc * qd); c = -Math.atan2(2 * qa * qc - 2 * qb * qd, 2 * qa * qb + 2 * qc * qd); b = Math.acos(tmp); }
      break;
    }
    case 'XYX': {
      const tmp = clampUnit(2 * qa * qa - 1 + 2 * qb * qb);
      if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = 2 * Math.atan2(qd, qc); c = 0; b = Math.PI; }
      else if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qb, qa); c = 0; b = 0; }
      else { a = Math.atan2(2 * qa * qd + 2 * qb * qc, 2 * qa * qc - 2 * qb * qd); c = -Math.atan2(2 * qa * qd - 2 * qb * qc, 2 * qa * qc + 2 * qb * qd); b = Math.acos(tmp); }
      break;
    }
    case 'XZX': {
      const tmp = clampUnit(2 * qa * qa - 1 + 2 * qb * qb);
      if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = -2 * Math.atan2(qc, qd); c = 0; b = Math.PI; }
      else if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qb, qa); c = 0; b = 0; }
      else { a = -Math.atan2(2 * qa * qc - 2 * qb * qd, 2 * qa * qd + 2 * qb * qc); c = Math.atan2(2 * qa * qc + 2 * qb * qd, 2 * qa * qd - 2 * qb * qc); b = Math.acos(tmp); }
      break;
    }
    case 'XYZ': {
      const tmp = clampUnit(2 * qa * qc + 2 * qb * qd);
      if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qb, qa); c = 0; b = 0.5 * Math.PI; }
      else if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = 2 * Math.atan2(qb, qa); c = 0; b = -0.5 * Math.PI; }
      else { a = Math.atan2(2 * qa * qb - 2 * qc * qd, 2 * qa * qa - 1 + 2 * qd * qd); c = Math.atan2(2 * qa * qd - 2 * qb * qc, 2 * qa * qa - 1 + 2 * qb * qb); b = Math.asin(tmp); }
      break;
    }
    case 'YZX': {
      const tmp = clampUnit(2 * qa * qd + 2 * qb * qc);
      if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qb, qa); c = 0; b = 0.5 * Math.PI; }
      else if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = -2 * Math.atan2(qb, qa); c = 0; b = -0.5 * Math.PI; }
      else { a = Math.atan2(2 * qa * qc - 2 * qb * qd, 2 * qa * qa - 1 + 2 * qb * qb); c = Math.atan2(2 * qa * qb - 2 * qc * qd, 2 * qa * qa - 1 + 2 * qc * qc); b = Math.asin(tmp); }
      break;
    }
    case 'ZXY': {
      const tmp = clampUnit(2 * qa * qb + 2 * qc * qd);
      if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qc, qa); c = 0; b = 0.5 * Math.PI; }
      else if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = -2 * Math.atan2(qc, qa); c = 0; b = -0.5 * Math.PI; }
      else { a = Math.atan2(2 * qa * qd - 2 * qb * qc, 2 * qa * qa - 1 + 2 * qc * qc); c = Math.atan2(2 * qa * qc - 2 * qb * qd, 2 * qa * qa - 1 + 2 * qd * qd); b = Math.asin(tmp); }
      break;
    }
    case 'XZY': {
      const tmp = clampUnit(2 * qb * qc - 2 * qa * qd);
      if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = 2 * Math.atan2(qb, qa); c = 0; b = 0.5 * Math.PI; }
      else if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qb, qa); c = 0; b = -0.5 * Math.PI; }
      else { a = Math.atan2(2 * qa * qb + 2 * qc * qd, 2 * qa * qa - 1 + 2 * qc * qc); c = Math.atan2(2 * qa * qc + 2 * qb * qd, 2 * qa * qa - 1 + 2 * qb * qb); b = -Math.asin(tmp); }
      break;
    }
    case 'ZYX': {
      const tmp = clampUnit(2 * qb * qd - 2 * qa * qc);
      if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = -2 * Math.atan2(qb, qa); c = 0; b = 0.5 * Math.PI; }
      else if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qb, qa); c = 0; b = -0.5 * Math.PI; }
      else { a = Math.atan2(2 * qa * qd + 2 * qb * qc, 2 * qa * qa - 1 + 2 * qb * qb); c = Math.atan2(2 * qa * qb + 2 * qc * qd, 2 * qa * qa - 1 + 2 * qd * qd); b = -Math.asin(tmp); }
      break;
    }
    case 'YXZ': {
      const tmp = clampUnit(2 * qc * qd - 2 * qa * qb);
      if (tmp < 0 && Math.abs(tmp + 1) < TWO_EPS10) { a = 2 * Math.atan2(qc, qa); c = 0; b = 0.5 * Math.PI; }
      else if (tmp > 0 && Math.abs(tmp - 1) < TWO_EPS10) { a = 2 * Math.atan2(qc, qa); c = 0; b = -0.5 * Math.PI; }
      else { a = Math.atan2(2 * qa * qc + 2 * qb * qd, 2 * qa * qa - 1 + 2 * qd * qd); c = Math.atan2(2 * qa * qd + 2 * qb * qc, 2 * qa * qa - 1 + 2 * qc * qc); b = -Math.asin(tmp); }
      break;
    }
    default: throw new Error(`unsupported rotation sequence '${seq}'`);
  }
  return [a, b, c];
}

function quat2eulImpl(args: Value[]): Mat {
  const q = m(args[0], 'quat');
  if (q.cols !== 4) throw new Error('quat2eul expects an N-by-4 quaternion array');
  const seq = readSeq(args, 1);
  const { rows } = q;
  const out = new Float64Array(rows * 3);
  for (let r = 0; r < rows; r++) {
    let qa = q.data[r + 0 * rows];
    let qb = q.data[r + 1 * rows];
    let qc = q.data[r + 2 * rows];
    let qd = q.data[r + 3 * rows];
    const nrm = Math.sqrt(qa * qa + qb * qb + qc * qc + qd * qd); // normalizeRows
    qa /= nrm; qb /= nrm; qc /= nrm; qd /= nrm;
    const [a, b, c] = qparts2eul(seq, qa, qb, qc, qd);
    out[r + 0 * rows] = a;
    out[r + 1 * rows] = b;
    out[r + 2 * rows] = c;
  }
  return { kind: 'num', rows, cols: 3, data: out };
}

// Euler-angle row [t1 t2 t3] -> 3x3 rotation matrix, returned row-major-by-rows
// as R[i][j]. Mirrors robotics.internal.eul2rotm.
function eulRowToRotm(seq: string, t1: number, t2: number, t3: number): number[][] {
  const c1 = Math.cos(t1), s1 = Math.sin(t1);
  const c2 = Math.cos(t2), s2 = Math.sin(t2);
  const c3 = Math.cos(t3), s3 = Math.sin(t3);
  switch (seq) {
    case 'ZYX': { const cz = c1, sz = s1, cy = c2, sy = s2, cx = c3, sx = s3; return [
      [cy * cz, sy * sx * cz - sz * cx, sy * cx * cz + sz * sx],
      [cy * sz, sy * sx * sz + cz * cx, sy * cx * sz - cz * sx],
      [-sy, cy * sx, cy * cx]]; }
    case 'ZYZ': { const cz = c1, sz = s1, cy = c2, sy = s2, cz2 = c3, sz2 = s3; return [
      [cz2 * cy * cz - sz2 * sz, -sz2 * cy * cz - cz2 * sz, sy * cz],
      [cz2 * cy * sz + sz2 * cz, -sz2 * cy * sz + cz2 * cz, sy * sz],
      [-cz2 * sy, sz2 * sy, cy]]; }
    case 'XYZ': { const cx = c1, sx = s1, cy = c2, sy = s2, cz = c3, sz = s3; return [
      [cy * cz, -cy * sz, sy],
      [cx * sz + cz * sx * sy, cx * cz - sx * sy * sz, -cy * sx],
      [sx * sz - cx * cz * sy, cz * sx + cx * sy * sz, cx * cy]]; }
    case 'ZXY': { const cz = c1, sz = s1, cx = c2, sx = s2, cy = c3, sy = s3; return [
      [cy * cz - sy * sx * sz, -sz * cx, sy * cz + cy * sx * sz],
      [cy * sz + sy * sx * cz, cz * cx, sy * sz - cy * sx * cz],
      [-sy * cx, sx, cy * cx]]; }
    case 'ZXZ': { const cz = c1, sz = s1, cx = c2, sx = s2, cz2 = c3, sz2 = s3; return [
      [cz2 * cz - sz2 * cx * sz, -sz2 * cz - cz2 * cx * sz, sz * sx],
      [cz2 * sz + sz2 * cx * cz, -sz2 * sz + cz2 * cx * cz, -cz * sx],
      [sz2 * sx, cz2 * sx, cx]]; }
    case 'YXZ': { const cy = c1, sy = s1, cx = c2, sx = s2, cz = c3, sz = s3; return [
      [cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx],
      [sz * cx, cz * cx, -sx],
      [-sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx]]; }
    case 'YXY': { const cy = c1, sy = s1, cx = c2, sx = s2, cy2 = c3, sy2 = s3; return [
      [cy2 * cy - sy2 * cx * sy, sy * sx, sy2 * cy + cy2 * cx * sy],
      [sy2 * sx, cx, -cy2 * sx],
      [-cy2 * sy - sy2 * cx * cy, cy * sx, -sy2 * sy + cy2 * cx * cy]]; }
    case 'YZX': { const cy = c1, sy = s1, cz = c2, sz = s2, cx = c3, sx = s3; return [
      [cy * cz, -sz * cx * cy + sy * sx, cy * sx * sz + sy * cx],
      [sz, cz * cx, -cz * sx],
      [-sy * cz, sy * cx * sz + cy * sx, -sy * sx * sz + cy * cx]]; }
    case 'YZY': { const cy = c1, sy = s1, cz = c2, sz = s2, cy2 = c3, sy2 = s3; return [
      [cy2 * cz * cy - sy2 * sy, -cy * sz, sy2 * cz * cy + cy2 * sy],
      [cy2 * sz, cz, sy2 * sz],
      [-cy2 * cz * sy - sy2 * cy, sy * sz, -sy2 * cz * sy + cy2 * cy]]; }
    case 'XYX': { const cx = c1, sx = s1, cy = c2, sy = s2, cx2 = c3, sx2 = s3; return [
      [cy, sx2 * sy, cx2 * sy],
      [sy * sx, cx2 * cx - sx2 * cy * sx, -sx2 * cx - cx2 * cy * sx],
      [-sy * cx, cx2 * sx + sx2 * cy * cx, -sx2 * sx + cx2 * cy * cx]]; }
    case 'XZY': { const cx = c1, sx = s1, cz = c2, sz = s2, cy = c3, sy = s3; return [
      [cy * cz, -sz, sy * cz],
      [sz * cx * cy + sy * sx, cz * cx, sy * cx * sz - cy * sx],
      [cy * sx * sz - sy * cx, cz * sx, sy * sx * sz + cy * cx]]; }
    case 'XZX': { const cx = c1, sx = s1, cz = c2, sz = s2, cx2 = c3, sx2 = s3; return [
      [cz, -cx2 * sz, sx2 * sz],
      [sz * cx, cx2 * cz * cx - sx2 * sx, -sx2 * cz * cx - cx2 * sx],
      [sz * sx, cx2 * cz * sx + sx2 * cx, -sx2 * cz * sx + cx2 * cx]]; }
    default: throw new Error(`unsupported rotation sequence '${seq}'`);
  }
}

// Build a 3-by-3-by-N N-D Mat from per-page 3x3 row-major matrices.
function rotmStack(pages: number[][][]): Mat {
  const n = pages.length;
  const data = new Float64Array(9 * n);
  for (let p = 0; p < n; p++) {
    const R = pages[p];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      data[i + j * 3 + p * 9] = R[i][j];
    }
  }
  if (n === 1) return { kind: 'num', rows: 3, cols: 3, data };
  return { kind: 'num', rows: 3, cols: 3 * n, data, nd: [3, 3, n] };
}

function eul2rotmImpl(args: Value[]): Mat {
  const eul = m(args[0], 'eul');
  if (eul.cols !== 3) throw new Error('eul2rotm expects an N-by-3 matrix of Euler angles');
  const seq = readSeq(args, 1);
  const { rows } = eul;
  const pages: number[][][] = [];
  for (let r = 0; r < rows; r++) {
    pages.push(eulRowToRotm(seq, eul.data[r + 0 * rows], eul.data[r + 1 * rows], eul.data[r + 2 * rows]));
  }
  return rotmStack(pages);
}

function eul2tformImpl(args: Value[]): Mat {
  const eul = m(args[0], 'eul');
  if (eul.cols !== 3) throw new Error('eul2tform expects an N-by-3 matrix of Euler angles');
  const seq = readSeq(args, 1);
  const { rows } = eul;
  const n = rows;
  const data = new Float64Array(16 * n);
  for (let p = 0; p < n; p++) {
    const R = eulRowToRotm(seq, eul.data[p + 0 * rows], eul.data[p + 1 * rows], eul.data[p + 2 * rows]);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) data[i + j * 4 + p * 16] = R[i][j];
    data[3 + 3 * 4 + p * 16] = 1; // homogeneous bottom-right
  }
  if (n === 1) return { kind: 'num', rows: 4, cols: 4, data };
  return { kind: 'num', rows: 4, cols: 4 * n, data, nd: [4, 4, n] };
}

// Decompose a rotation-matrix N-D Mat into per-page 3x3 row-major arrays.
function rotmPages(R: Mat): number[][][] {
  if (R.rows !== 3) throw new Error('rotm2eul expects a 3-by-3-by-N rotation matrix array');
  const nd = R.nd;
  const n = nd ? (nd[2] ?? 1) : R.cols / 3;
  if (!Number.isInteger(n) || (!nd && R.cols !== 3 && R.cols % 3 !== 0)) {
    throw new Error('rotm2eul expects a 3-by-3-by-N rotation matrix array');
  }
  const pages: number[][][] = [];
  for (let p = 0; p < n; p++) {
    const M: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] = R.data[i + j * 3 + p * 9];
    pages.push(M);
  }
  return pages;
}

// Settings per sequence: [firstAxis(1=X,2=Y,3=Z), repetition, parity, movingFrame].
const ROTM2EUL_SETTINGS: Record<string, [number, number, number, number]> = {
  ZYX: [1, 0, 0, 1], ZYZ: [3, 1, 1, 1], XYZ: [3, 0, 1, 1],
  ZXY: [2, 0, 1, 1], ZXZ: [3, 1, 0, 1], YXZ: [3, 0, 0, 1],
  YXY: [2, 1, 1, 1], YZX: [1, 0, 1, 1], YZY: [2, 1, 0, 1],
  XYX: [1, 1, 0, 1], XZY: [2, 0, 0, 1], XZX: [1, 1, 1, 1],
};
const NEXT_AXIS = [2, 3, 1, 2]; // 1-based indexed in MATLAB; here index via (k-1)

function rotmPageToEul(seq: string, R: number[][]): [number, number, number] {
  const setting = ROTM2EUL_SETTINGS[seq];
  if (!setting) throw new Error(`unsupported rotation sequence '${seq}'`);
  const [firstAxis, repetition, parity, movingFrame] = setting;
  const i = firstAxis;
  const j = NEXT_AXIS[(i + parity) - 1];
  const k = NEXT_AXIS[(i - parity + 1) - 1];
  // R is 0-based; MATLAB indices are 1-based, so subtract 1 on access.
  const g = (a: number, b: number) => R[a - 1][b - 1];
  let eul: [number, number, number];
  if (repetition) {
    const sySq = g(i, j) * g(i, j) + g(i, k) * g(i, k);
    const sy = Math.sqrt(sySq);
    eul = [Math.atan2(g(i, j), g(i, k)), Math.atan2(sy, g(i, i)), Math.atan2(g(j, i), -g(k, i))];
    if (sySq < TWO_EPS10) {
      eul = [Math.atan2(-g(j, k), g(j, j)), Math.atan2(sy, g(i, i)), 0];
    }
  } else {
    const cySq = g(i, i) * g(i, i) + g(j, i) * g(j, i);
    const cy = Math.sqrt(cySq);
    eul = [Math.atan2(g(k, j), g(k, k)), Math.atan2(-g(k, i), cy), Math.atan2(g(j, i), g(i, i))];
    if (cySq < TWO_EPS10) {
      eul = [Math.atan2(-g(j, k), g(j, j)), Math.atan2(-g(k, i), cy), 0];
    }
  }
  if (parity) { eul = [-eul[0], -eul[1], -eul[2]]; }
  if (movingFrame) { eul = [eul[2], eul[1], eul[0]]; } // swap X and Z columns
  return eul;
}

function rotm2eulImpl(args: Value[]): Mat {
  const R = m(args[0], 'rotm');
  const seq = readSeq(args, 1);
  const pages = rotmPages(R);
  const n = pages.length;
  const out = new Float64Array(n * 3);
  for (let p = 0; p < n; p++) {
    const [a, b, c] = rotmPageToEul(seq, pages[p]);
    out[p + 0 * n] = a;
    out[p + 1 * n] = b;
    out[p + 2 * n] = c;
  }
  return { kind: 'num', rows: n, cols: 3, data: out };
}

export const NAV: ToolboxModule = {
  id: 'nav',
  name: 'Navigation Toolbox',
  docBase: 'https://www.mathworks.com/help/nav/ref/',
  docPath: (name) => `${name}.html`,
  builtins: {
    lla2ecef: ((args: Value[]) => ret(map3(m(args[0], 'lla'), llaToEcef))) as Builtin,
    ecef2lla: ((args: Value[]) => ret(map3(m(args[0], 'ecef'), ecefToLla))) as Builtin,
    quatnormalize: ((args: Value[]) => ret(quatnormalizeImpl(args))) as Builtin,
    lla2ned: ((args: Value[]) => ret(lla2localImpl(args, 'ned'))) as Builtin,
    lla2enu: ((args: Value[]) => ret(lla2localImpl(args, 'enu'))) as Builtin,
    eul2quat: ((args: Value[]) => ret(eul2quatImpl(args))) as Builtin,
    quat2eul: ((args: Value[]) => ret(quat2eulImpl(args))) as Builtin,
    eul2rotm: ((args: Value[]) => ret(eul2rotmImpl(args))) as Builtin,
    rotm2eul: ((args: Value[]) => ret(rotm2eulImpl(args))) as Builtin,
    eul2tform: ((args: Value[]) => ret(eul2tformImpl(args))) as Builtin,
    cart2hom: ((args: Value[]) => ret(cart2homImpl(args))) as Builtin,
    hom2cart: ((args: Value[]) => ret(hom2cartImpl(args))) as Builtin,
    trvec2tform: ((args: Value[]) => ret(trvec2tformImpl(args))) as Builtin,
    tform2trvec: ((args: Value[]) => ret(tform2trvecImpl(args))) as Builtin,
    rotm2tform: ((args: Value[]) => ret(rotm2tformImpl(args))) as Builtin,
    tform2rotm: ((args: Value[]) => ret(tform2rotmImpl(args))) as Builtin,
    axang2rotm: ((args: Value[]) => ret(axang2rotmImpl(args))) as Builtin,
    axang2quat: ((args: Value[]) => ret(axang2quatImpl(args))) as Builtin,
    rotx: ((args: Value[]) => ret(elemRot(args, 'x'))) as Builtin,
    roty: ((args: Value[]) => ret(elemRot(args, 'y'))) as Builtin,
    rotz: ((args: Value[]) => ret(elemRot(args, 'z'))) as Builtin,
    quat2rotm: ((args: Value[]) => ret(quat2rotmImpl(args))) as Builtin,
    rotm2quat: ((args: Value[]) => ret(rotm2quatImpl(args))) as Builtin,
    quat2axang: ((args: Value[]) => ret(quat2axangImpl(args))) as Builtin,
    quat2tform: ((args: Value[]) => ret(rotm2tformImpl([quat2rotmImpl(args)]))) as Builtin,
    tform2quat: ((args: Value[]) => ret(rotm2quatImpl([tform2rotmImpl(args)]))) as Builtin,
    rotm2axang: ((args: Value[]) => ret(quat2axangImpl([rotm2quatImpl(args)]))) as Builtin,
    rotmat2vec3d: ((args: Value[]) => {
      const a = m(quat2axangImpl([rotm2quatImpl(args)])); const N = a.rows; const out = new Float64Array(N * 3);
      for (let i = 0; i < N; i++) { const th = a.data[i + 3 * N]; for (let k = 0; k < 3; k++) out[i + k * N] = a.data[i + k * N] * th; }
      return ret(N === 1 ? rowVec([out[0], out[1], out[2]]) : mat(N, 3, out));
    }) as Builtin,
  },
  constants: {
    WGS84_A: () => rowVec([WGS84_A]),
    WGS84_F: () => rowVec([WGS84_F]),
  },
  help: HELP_NAV,
};
