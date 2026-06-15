// Mapping Toolbox — computable geographic unit conversions and spherical great-circle geometry.
// Distances on a sphere of mean Earth radius 6371 km; nautical mile = 1852 m, statute mile =
// 1609.3472186944 m (US survey). distance/azimuth/reckon operate in degrees. Validated against
// the live Mapping Toolbox (see mapping.VALIDATION.md). Note deg2nm (=60, definitional) is NOT the
// inverse of nm2deg (=1852/R·180/π) — matching MATLAB's asymmetric arcminute vs. radius behaviour.
import type { Builtin } from '../builtins';
import { type Value, type Mat, map, toMat as m, asScalar, asString, toArray, colVec, rowVec, scalar, str, mat, fromRows, isStr } from '../values';
import type { ToolboxModule } from './types';
import { WGS84_A, WGS84_F } from '../physconst';
import { HELP_MAPPING } from '../help';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);
const R = 6371;                 // mean Earth radius, km (MATLAB default sphere)
const NM = 1.852;               // km per nautical mile
const SM = 1.6093472186944;     // km per statute (US survey) mile
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const conv = (f: number): Builtin => (a) => ret(map(m(a[0]), (x) => x * f));

// great-circle helpers (degrees in/out)
function gcDistAz(lat1: number, lon1: number, lat2: number, lon2: number): [number, number] {
  const p1 = lat1 * D2R, p2 = lat2 * D2R, dl = (lon2 - lon1) * D2R;
  const dp = p2 - p1;
  const hav = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const arc = 2 * Math.asin(Math.min(1, Math.sqrt(hav))) * R2D;
  let az = Math.atan2(Math.cos(p2) * Math.sin(dl), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * R2D;
  az = ((az % 360) + 360) % 360;
  return [arc, az];
}
function reckon(lat: number, lon: number, arc: number, az: number): [number, number] {
  const p1 = lat * D2R, d = arc * D2R, t = az * D2R;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
  const l2 = lon * D2R + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  let lon2 = l2 * R2D; lon2 = ((lon2 + 180) % 360 + 360) % 360 - 180;
  return [p2 * R2D, lon2];
}
// angle wrapping (period P): map to [-P/2,P/2] (signed) or [0,P) (positive), keeping the boundary
function wrapSigned(P: number): Builtin {
  return (a) => ret(map(m(a[0]), (x) => { let y = ((x + P / 2) % P + P) % P - P / 2; if (y === -P / 2 && x > 0) y = P / 2; return y; }));
}
function wrapPositive(P: number): Builtin {
  return (a) => ret(map(m(a[0]), (x) => { let y = ((x % P) + P) % P; if (y === 0 && x > 0) y = P; return y; }));
}

// ════════════════════════════════════════════════════════════════════════════
//  Geodesy — coordinate-frame transforms and spheroid math
//  (ported from R2026a shared/geodesy + map/mapgeodesy). Scalar inputs.
//  The spheroid argument is a [semimajorAxis, eccentricity] 2-vector (e.g.
//  wgs84Ellipsoid). angleUnit is an optional trailing 'degrees'/'radians' arg.
// ════════════════════════════════════════════════════════════════════════════
/** true unless an explicit 'radian…' angleUnit is given (degrees is the default). */
function inDeg(v: Value | undefined): boolean { if (v === undefined) return true; try { return !/^r/i.test(asString(v).trim()); } catch { return true; } }
const SIN = (x: number, d: boolean) => (d ? Math.sin(x * D2R) : Math.sin(x));
const COS = (x: number, d: boolean) => (d ? Math.cos(x * D2R) : Math.cos(x));
const ATAN2 = (y: number, x: number, d: boolean) => (d ? Math.atan2(y, x) * R2D : Math.atan2(y, x));
/** Parse a [semimajor, eccentricity] spheroid vector into {a, f} (flattening). */
function ellipAF(v: Value): { a: number; f: number } {
  const arr = toArray(m(v));
  if (arr.length < 2) throw new Error('spheroid must be a [semimajorAxis, eccentricity] vector (e.g. wgs84Ellipsoid)');
  const a = arr[0], e2 = arr[1] * arr[1];
  return { a, f: e2 / (1 + Math.sqrt(1 - e2)) };
}
/** geodetic (lat,lon,h) → geocentric ECEF (x,y,z). */
function g2e(a: number, f: number, phi: number, lam: number, h: number, d: boolean): [number, number, number] {
  const e2 = f * (2 - f), sp = SIN(phi, d), cp = COS(phi, d);
  const N = a / Math.sqrt(1 - e2 * sp * sp), rho = (N + h) * cp, z = (N * (1 - e2) + h) * sp;
  return [rho * COS(lam, d), rho * SIN(lam, d), z];
}
/** ECEF (x,y,z) → geodetic (lat,lon,h) via the iterative Bowring/MATLAB cylindrical2geodetic. */
function e2g(a: number, f: number, x: number, y: number, z: number, d: boolean): [number, number, number] {
  const rho = Math.hypot(x, y), lam = ATAN2(y, x, d);
  if (f === 0) { const phi = ATAN2(z, rho, d); return [phi, lam, Math.hypot(z, rho) - a]; }
  const b = (1 - f) * a, e2 = f * (2 - f), ae2 = a * e2, bep2 = b * e2 / (1 - e2), r = Math.hypot(rho, z);
  let u = a * rho, v = b * z * (1 + bep2 / r);
  let cosb = Math.sign(u) / Math.hypot(1, v / u), sinb = Math.sign(v) / Math.hypot(1, u / v);
  for (let c = 0; c < 5; c++) {
    const cp = cosb, sp = sinb;
    u = rho - ae2 * cosb ** 3; v = z + bep2 * sinb ** 3; const au = a * u, bv = b * v;
    cosb = Math.sign(au) / Math.hypot(1, bv / au); sinb = Math.sign(bv) / Math.hypot(1, au / bv);
    if (Math.hypot(cosb - cp, sinb - sp) <= Number.EPSILON) break;
  }
  const phiR = Math.atan2(v, u), sphi = Math.sin(phiR), cphi = Math.cos(phiR);
  const N = a / Math.sqrt(1 - e2 * sphi * sphi);
  const h = rho * cphi + (z + e2 * N * sphi) * sphi - N;
  return [d ? phiR * R2D : phiR, lam, h];
}
/** ECEF vector → local ENU (east, north, up) at origin (lat0,lon0). */
function ecef2enuv(u: number, v: number, w: number, lat0: number, lon0: number, d: boolean): [number, number, number] {
  const cp = COS(lat0, d), sp = SIN(lat0, d), cl = COS(lon0, d), sl = SIN(lon0, d);
  const t = cl * u + sl * v, e = -sl * u + cl * v, up = cp * t + sp * w, n = -sp * t + cp * w;
  return [e, n, up];
}
/** Local ENU vector → ECEF vector at origin (lat0,lon0). */
function enu2ecefv(e: number, n: number, up: number, lat0: number, lon0: number, d: boolean): [number, number, number] {
  const cp = COS(lat0, d), sp = SIN(lat0, d), cl = COS(lon0, d), sl = SIN(lon0, d);
  const t = cp * up - sp * n, w = sp * up + cp * n, u = cl * t - sl * e, v = sl * t + cl * e;
  return [u, v, w];
}
function aer2enu(az: number, el: number, slant: number, d: boolean): [number, number, number] {
  const up = slant * SIN(el, d), rr = slant * COS(el, d);
  return [rr * SIN(az, d), rr * COS(az, d), up];
}
function enu2aer(e: number, n: number, up: number, d: boolean): [number, number, number] {
  const r = Math.hypot(e, n), slant = Math.hypot(r, up), el = ATAN2(up, r, d);
  const period = d ? 360 : 2 * Math.PI; let az = ATAN2(e, n, d) % period; if (az < 0) az += period;
  return [az, el, slant];
}
const out3 = (vals: [number, number, number], nargout: number): Promise<Value[]> => Promise.resolve([scalar(vals[0]), scalar(vals[1]), scalar(vals[2])].slice(0, Math.max(1, nargout)));

// ════════════════════════════════════════════════════════════════════════════
//  Angle unit conversion + formatting (map/mapgeodesy)
//  degrees2dms / degrees2dm / dms2degrees / dm2degrees: closed-form sexagesimal
//  conversions. interpm: densify lat/lon vertices (default 'lin' = independent
//  linear spacing). angl2str: format angles as character matrices.
// ════════════════════════════════════════════════════════════════════════════

// MATLAB fix (truncate toward zero) and rem (sign of dividend).
const fix = (x: number) => (x < 0 ? Math.ceil(x) : Math.floor(x));
const rem = (x: number, y: number) => x - fix(x / y) * y;
// MATLAB round(x,n): round half away from zero at 10^-n.
function roundN(x: number, n: number): number {
  if (!isFinite(x)) return x;
  const f = Math.pow(10, n), t = x * f;
  return Math.sign(t) * Math.round(Math.abs(t)) / f;
}

// degrees2dms(angle) → [fix(d) fix(m) s] with consistent sign per row.
function deg2dmsRow(x: number): [number, number, number] {
  const minutes = 60 * rem(x, 1);
  let d = fix(x), mn = fix(minutes), s = 60 * rem(minutes, 1);
  if (d < 0 || mn < 0) s = -s;   // flip seconds sign if degrees or minutes negative
  if (d < 0) mn = -mn;           // flip minutes sign if degrees negative
  return [d, mn, s];
}
function deg2dmRow(x: number): [number, number] {
  let d = fix(x), mn = 60 * rem(x, 1);
  if (d < 0) mn = -mn;
  return [d, mn];
}

// roundedDMS / roundedDM: decompose |X| into D, M, (S) with seconds/minutes
// rounded to N digits (N >= -2). Returns nonneg D,M,S and sign.
function roundedDMS(X: number, N: number): { D: number; M: number; S: number; sgn: number } {
  let D: number, M: number, S: number;
  if (N >= -1) {
    let t = roundN(Math.abs(3600 * X), N);
    S = rem(t, 60);
    t = Math.round(t - S) / 60;
    M = rem(t, 60);
    D = Math.floor(t / 60);
  } else { // N === -2
    S = 0;
    const t = Math.round(Math.abs(60 * X));
    M = rem(t, 60);
    D = Math.floor(t / 60);
    if (!isFinite(X)) { D = NaN; S = NaN; }
  }
  let sgn = Math.sign(X);
  if (D + (M + S / 60) / 60 === 0) sgn = 0;
  return { D, M, S, sgn };
}
function roundedDM(X: number, N: number): { D: number; M: number; sgn: number } {
  let D: number, M: number;
  if (N >= -1) {
    let t = roundN(Math.abs(60 * X), N);
    if (!isFinite(X)) t = NaN;
    M = rem(t, 60);
    D = Math.floor(t / 60);
  } else { // N === -2
    M = 0;
    D = Math.round(Math.abs(X));
    if (!isFinite(X)) { D = NaN; M = NaN; }
  }
  let sgn = Math.sign(X);
  if (D + M / 60 === 0) sgn = 0;
  return { D, M, sgn };
}

const DEGSYM = '^{\\circ}';
// num2str(x,'%0W.Rf')-style fixed-point with zero padding to total width W.
function padFixed(x: number, R: number): string {
  const W = R > 0 ? 3 + R : 2 + R;            // formatstr(): totaldigits
  let s = x.toFixed(R);
  while (s.length < W) s = '0' + s;
  return s;
}
// formatstr digits → rightdigits used by seconds/minutes formatting.
const rightDigits = (digits: number) => Math.abs(Math.min(-digits, 0));

// Build the "middle" string for one angle value given units + (round-style) digits.
function angleMiddle(x: number, units: string, digits: number): string {
  if (units === 'degrees2dms') {
    const { D, M, S } = roundedDMS(x, Math.max(digits, -2));
    const dStr = `${D}`;                          // num2str(d,'%4g') then strtrim
    const mStr = M < 10 ? `0${M}` : `${M}`;        // '%02g'
    const sStr = padFixed(S, rightDigits(digits)); // formatstr
    return `${dStr}${DEGSYM}*${mStr}'*${sStr}"`;
  }
  if (units === 'degrees2dm') {
    const { D, M } = roundedDM(x, Math.max(digits, -2));
    const dStr = `${D}`;
    const mStr = padFixed(M, rightDigits(digits));
    return `${dStr}${DEGSYM}*${mStr}'`;
  }
  if (units === 'radians') {
    const r = rightDigits(digits);
    return `${Math.abs(roundN(x, digits)).toFixed(r)}*R`;
  }
  // 'degrees'
  const r = rightDigits(digits);
  return `${Math.abs(roundN(x, digits)).toFixed(r)}${DEGSYM}`;
}

// True for a char value (a 'str' value or an isChar numeric Mat).
const isCharVal = (v: Value | undefined): boolean => v !== undefined && (isStr(v) || (v.kind === 'num' && v.isChar === true));

// Resolve angl2str UNITS: exact 'degrees2dm(s)' or a (partial) match to degrees/radians.
function checkUnits(u: string): string {
  const s = u.toLowerCase();
  if (s === 'dms' || s === 'dm') throw new Error('Obsolete UNITS string; use degrees2dms/degrees2dm.');
  if (s === 'degrees2dms' || s === 'degrees2dm') return s;
  if ('degrees'.startsWith(s) && s.length > 0) return 'degrees';
  if ('radians'.startsWith(s) && s.length > 0) return 'radians';
  throw new Error(`Unrecognized UNITS string: ${u}`);
}

export const MAPPING: ToolboxModule = {
  id: 'map',
  name: 'Mapping Toolbox',
  docBase: 'https://www.mathworks.com/help/map/ref/',
  builtins: {
    // distance/radius unit conversions
    km2rad: conv(1 / R), rad2km: conv(R), deg2km: conv(D2R * R), km2deg: conv(R2D / R),
    deg2nm: conv(60), nm2km: conv(NM), km2nm: conv(1 / NM), nm2sm: conv(NM / SM), sm2nm: conv(SM / NM),
    km2sm: conv(1 / SM), sm2km: conv(SM), deg2sm: conv(D2R * R / SM), sm2deg: conv(SM / R * R2D),
    nm2deg: conv(NM / R * R2D), rad2nm: conv(R / NM), nm2rad: conv(NM / R), rad2sm: conv(R / SM), sm2rad: conv(SM / R),
    // ingeoquad(lat,lon,latlim,lonlim): true for points inside/on a lat-lon quadrangle.
    ingeoquad: (a) => {
      const lat = toArray(m(a[0])), lon = toArray(m(a[1])), latlim = toArray(m(a[2])), lonlim = toArray(m(a[3]));
      const w360 = (x: number) => { const r = ((x % 360) + 360) % 360; return r === 0 && x > 0 ? 360 : r; };
      const londiff = w360(lonlim[1] - lonlim[0]);
      const out = Float64Array.from(lat.map((la, i) => (latlim[0] <= la && la <= latlim[1] && w360(lon[i] - lonlim[0]) <= londiff) ? 1 : 0));
      const r = mat(m(a[0]).rows, m(a[0]).cols, out) as Mat; r.isBool = true; return ret(r);
    },
    // changem(A,newval,oldval): substitute oldval(k)→newval(k) element-wise in A.
    changem: (a) => {
      const A = m(a[0]), nv = toArray(m(a[1])), ov = toArray(m(a[2])), out = Float64Array.from(A.data);
      for (let i = 0; i < out.length; i++) for (let k = 0; k < nv.length; k++) if (A.data[i] === ov[k]) { out[i] = nv[k]; break; }
      return ret(mat(A.rows, A.cols, out));
    },
    // toDegrees/fromDegrees(units,x): convert angles to/from degrees ('radians' scales, else identity).
    toDegrees: (a) => { const rad = asString(a[0]).toLowerCase().startsWith('rad'); return ret(map(m(a[1]), (v) => (rad ? v * R2D : v))); },
    fromDegrees: (a) => { const rad = asString(a[0]).toLowerCase().startsWith('rad'); return ret(map(m(a[1]), (v) => (rad ? v * D2R : v))); },
    // meanm(lat,lon[,units]) — geographic mean (unit-vector sum on a sphere). Mirrors meanm.m.
    meanm: (a, nargout) => {
      const latArr = toArray(m(a[0])), lonArr = toArray(m(a[1]));
      const rad = a.length > 2 && isStr(a[2]) && asString(a[2]).toLowerCase().startsWith('rad');
      const toR = (x: number) => (rad ? x : x * D2R), fromR = (x: number) => (rad ? x : x * R2D);
      let X = 0, Y = 0, Z = 0;
      for (let i = 0; i < latArr.length; i++) { const la = toR(latArr[i]), lo = toR(lonArr[i]); X += Math.cos(la) * Math.cos(lo); Y += Math.cos(la) * Math.sin(lo); Z += Math.sin(la); }
      const latbar = fromR(Math.atan2(Z, Math.hypot(X, Y))), lonbar = fromR(Math.atan2(Y, X));
      return nargout >= 2 ? Promise.resolve([scalar(latbar), scalar(lonbar)]) : ret(rowVec([latbar, lonbar]));
    },
    // spherical geometry
    distance: (a, nargout) => {
      const lat1 = asScalar(a[0]), lon1 = asScalar(a[1]), lat2 = asScalar(a[2]), lon2 = asScalar(a[3]);
      const [arc, az] = gcDistAz(lat1, lon1, lat2, lon2);
      return Promise.resolve(nargout >= 2 ? [scalar(arc), scalar(az)] : [scalar(arc)]);
    },
    azimuth: (a) => ret(scalar(gcDistAz(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), asScalar(a[3]))[1])),
    reckon: (a, nargout) => {
      const [lat2, lon2] = reckon(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), asScalar(a[3]));
      return Promise.resolve(nargout >= 2 ? [scalar(lat2), scalar(lon2)] : [scalar(lat2)]);
    },
    departure: (a) => {
      const lon1 = asScalar(a[0]), lon2 = asScalar(a[1]), lat = asScalar(a[2]);
      let dl = ((lon2 - lon1 + 180) % 360 + 360) % 360 - 180;
      return ret(scalar(Math.abs(dl) * Math.cos(lat * D2R)));
    },
    antipode: (a, nargout) => {
      const lat = asScalar(a[0]), lon = asScalar(a[1]);
      let alon = ((lon + 180 + 180) % 360 + 360) % 360 - 180;
      const alat = -lat;
      return Promise.resolve(nargout >= 2 ? [scalar(alat), scalar(alon)] : [colVec([alat, alon])]);
    },
    // angle wrapping
    wrapTo180: wrapSigned(360), wrapTo360: wrapPositive(360),
    wrapToPi: wrapSigned(2 * Math.PI), wrapTo2Pi: wrapPositive(2 * Math.PI),

    // ── reference spheroids ──
    /** wgs84Ellipsoid([lengthUnit]) — [semimajorAxis, eccentricity] of WGS84 (default metres). */
    wgs84Ellipsoid: (a) => {
      const f = WGS84_F, ecc = Math.sqrt(f * (2 - f)); let aMeters = WGS84_A;
      if (a.length >= 1) { const u = asString(a[0]).toLowerCase(); const s: Record<string, number> = { meter: 1, meters: 1, metre: 1, m: 1, kilometer: 1e-3, kilometers: 1e-3, km: 1e-3, 'nautical mile': 1 / 1852, 'kilometre': 1e-3 }; aMeters *= (s[u] ?? 1); }
      return ret(rowVec([aMeters, ecc]));
    },
    /** earthRadius([lengthUnit]) — mean Earth radius (default 6371000 metres). */
    earthRadius: (a) => { let r = 6371000; if (a.length >= 1) { const u = asString(a[0]).toLowerCase(); const s: Record<string, number> = { meter: 1, m: 1, kilometer: 1e-3, km: 1e-3, 'nautical mile': 1 / 1852, nm: 1 / 1852 }; r *= (s[u] ?? 1); } return ret(scalar(r)); },

    // ── spheroid scalar parameter conversions (elementwise) ──
    ecc2flat: (a) => ret(map(m(a[0]), (e) => { const e2 = e * e; return e2 / (1 + Math.sqrt(1 - e2)); })),
    flat2ecc: (a) => ret(map(m(a[0]), (f) => Math.sqrt(f * (2 - f)))),
    ecc2n: (a) => ret(map(m(a[0]), (e) => { const e2 = e * e; return e2 / (1 + Math.sqrt(1 - e2)) ** 2; })),
    n2ecc: (a) => ret(map(m(a[0]), (n) => Math.sqrt(4 * n / (1 + n) ** 2))),
    /** majaxis(semiminor,ecc) | majaxis([semiminor ecc]) — semimajor axis. */
    majaxis: (a) => { const v = a.length >= 2 ? [asScalar(a[0]), asScalar(a[1])] : toArray(m(a[0])); return ret(scalar(v[0] / Math.sqrt(1 - v[1] * v[1]))); },
    /** minaxis(semimajor,ecc) | minaxis([semimajor ecc]) — semiminor axis. */
    minaxis: (a) => { const v = a.length >= 2 ? [asScalar(a[0]), asScalar(a[1])] : toArray(m(a[0])); return ret(scalar(v[0] * Math.sqrt(1 - v[1] * v[1]))); },

    // ── auxiliary latitudes (phi, f[, angleUnit]) ──
    geocentricLatitude: (a) => { const phi = asScalar(a[0]), f = asScalar(a[1]), d = inDeg(a[2]); if (f === 0) return ret(scalar(phi)); const t = (1 - f) ** 2; return ret(scalar(ATAN2(t * SIN(phi, d), COS(phi, d), d))); },
    parametricLatitude: (a) => { const phi = asScalar(a[0]), f = asScalar(a[1]), d = inDeg(a[2]); if (f === 0) return ret(scalar(phi)); return ret(scalar(ATAN2((1 - f) * SIN(phi, d), COS(phi, d), d))); },

    /** meridianarc(phi1,phi2,ellipsoid) — meridian arc length (phi in RADIANS). */
    meridianarc: (a) => {
      const phi1 = asScalar(a[0]), phi2 = asScalar(a[1]), el = toArray(m(a[2]));
      const ecc = el[1], e2 = ecc * ecc, n = e2 / (1 + Math.sqrt(1 - e2)) ** 2, n2 = n * n, aa = el[0];
      const r = aa * (1 - n) * (1 - n2) * (1 + ((9 / 4) + (225 / 64) * n2) * n2);
      const f1 = (3 / 2 - (9 / 16) * n2) * n, f2 = (15 / 16 - (15 / 32) * n2) * n2, f3 = (35 / 48) * n * n2, f4 = (315 / 512) * n2 * n2;
      const mu = (p: number) => p - f1 * Math.sin(2 * p) + f2 * Math.sin(4 * p) - f3 * Math.sin(6 * p) + f4 * Math.sin(8 * p);
      return ret(scalar(r * (mu(phi2) - mu(phi1))));
    },

    // ── ECEF ↔ geodetic ──
    geodetic2ecef: (a, n) => { const { a: A, f } = ellipAF(a[0]); return out3(g2e(A, f, asScalar(a[1]), asScalar(a[2]), asScalar(a[3]), inDeg(a[4])), n); },
    ecef2geodetic: (a, n) => { const { a: A, f } = ellipAF(a[0]); return out3(e2g(A, f, asScalar(a[1]), asScalar(a[2]), asScalar(a[3]), inDeg(a[4])), n); },

    // ── ECEF ↔ ENU / NED (origin lat0,lon0,h0; spheroid at arg 6) ──
    ecef2enu: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const [x0, y0, z0] = g2e(A, f, asScalar(a[3]), asScalar(a[4]), asScalar(a[5]), d); return out3(ecef2enuv(asScalar(a[0]) - x0, asScalar(a[1]) - y0, asScalar(a[2]) - z0, asScalar(a[3]), asScalar(a[4]), d), n); },
    enu2ecef: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const lat0 = asScalar(a[3]), lon0 = asScalar(a[4]); const [x0, y0, z0] = g2e(A, f, lat0, lon0, asScalar(a[5]), d); const [dx, dy, dz] = enu2ecefv(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), lat0, lon0, d); return out3([x0 + dx, y0 + dy, z0 + dz], n); },
    ecef2ned: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const [x0, y0, z0] = g2e(A, f, asScalar(a[3]), asScalar(a[4]), asScalar(a[5]), d); const [e, no, up] = ecef2enuv(asScalar(a[0]) - x0, asScalar(a[1]) - y0, asScalar(a[2]) - z0, asScalar(a[3]), asScalar(a[4]), d); return out3([no, e, -up], n); },
    ned2ecef: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const lat0 = asScalar(a[3]), lon0 = asScalar(a[4]); const [x0, y0, z0] = g2e(A, f, lat0, lon0, asScalar(a[5]), d); const [dx, dy, dz] = enu2ecefv(asScalar(a[1]), asScalar(a[0]), -asScalar(a[2]), lat0, lon0, d); return out3([x0 + dx, y0 + dy, z0 + dz], n); },
    // pure vector rotations (no origin translation), angle in degrees by default
    ecef2enuv: (a, n) => out3(ecef2enuv(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), asScalar(a[3]), asScalar(a[4]), inDeg(a[5])), n),
    enu2ecefv: (a, n) => out3(enu2ecefv(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), asScalar(a[3]), asScalar(a[4]), inDeg(a[5])), n),
    ecef2nedv: (a, n) => { const [e, no, up] = ecef2enuv(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), asScalar(a[3]), asScalar(a[4]), inDeg(a[5])); return out3([no, e, -up], n); },
    ned2ecefv: (a, n) => out3(enu2ecefv(asScalar(a[1]), asScalar(a[0]), -asScalar(a[2]), asScalar(a[3]), asScalar(a[4]), inDeg(a[5])), n),

    // ── geodetic ↔ ENU / NED ──
    geodetic2enu: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const lat0 = asScalar(a[3]), lon0 = asScalar(a[4]); const [x, y, z] = g2e(A, f, asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), d); const [x0, y0, z0] = g2e(A, f, lat0, lon0, asScalar(a[5]), d); return out3(ecef2enuv(x - x0, y - y0, z - z0, lat0, lon0, d), n); },
    enu2geodetic: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const lat0 = asScalar(a[3]), lon0 = asScalar(a[4]); const [x0, y0, z0] = g2e(A, f, lat0, lon0, asScalar(a[5]), d); const [dx, dy, dz] = enu2ecefv(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), lat0, lon0, d); return out3(e2g(A, f, x0 + dx, y0 + dy, z0 + dz, d), n); },
    geodetic2ned: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const lat0 = asScalar(a[3]), lon0 = asScalar(a[4]); const [x, y, z] = g2e(A, f, asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), d); const [x0, y0, z0] = g2e(A, f, lat0, lon0, asScalar(a[5]), d); const [e, no, up] = ecef2enuv(x - x0, y - y0, z - z0, lat0, lon0, d); return out3([no, e, -up], n); },
    ned2geodetic: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const lat0 = asScalar(a[3]), lon0 = asScalar(a[4]); const [x0, y0, z0] = g2e(A, f, lat0, lon0, asScalar(a[5]), d); const [dx, dy, dz] = enu2ecefv(asScalar(a[1]), asScalar(a[0]), -asScalar(a[2]), lat0, lon0, d); return out3(e2g(A, f, x0 + dx, y0 + dy, z0 + dz, d), n); },

    // ── AER (azimuth/elevation/range) local spherical frame ──
    aer2enu: (a, n) => out3(aer2enu(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), inDeg(a[3])), n),
    enu2aer: (a, n) => out3(enu2aer(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), inDeg(a[3])), n),
    aer2ned: (a, n) => { const [e, no, up] = aer2enu(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), inDeg(a[3])); return out3([no, e, -up], n); },
    ned2aer: (a, n) => out3(enu2aer(asScalar(a[1]), asScalar(a[0]), -asScalar(a[2]), inDeg(a[3])), n),

    // ── geodetic/ECEF ↔ AER (origin lat0,lon0,h0; spheroid at arg 6) ──
    geodetic2aer: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const lat0 = asScalar(a[3]), lon0 = asScalar(a[4]); const [x, y, z] = g2e(A, f, asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), d); const [x0, y0, z0] = g2e(A, f, lat0, lon0, asScalar(a[5]), d); const [e, no, up] = ecef2enuv(x - x0, y - y0, z - z0, lat0, lon0, d); return out3(enu2aer(e, no, up, d), n); },
    aer2geodetic: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const lat0 = asScalar(a[3]), lon0 = asScalar(a[4]); const [e, no, up] = aer2enu(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), d); const [dx, dy, dz] = enu2ecefv(e, no, up, lat0, lon0, d); const [x0, y0, z0] = g2e(A, f, lat0, lon0, asScalar(a[5]), d); return out3(e2g(A, f, x0 + dx, y0 + dy, z0 + dz, d), n); },
    ecef2aer: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const lat0 = asScalar(a[3]), lon0 = asScalar(a[4]); const [x0, y0, z0] = g2e(A, f, lat0, lon0, asScalar(a[5]), d); const [e, no, up] = ecef2enuv(asScalar(a[0]) - x0, asScalar(a[1]) - y0, asScalar(a[2]) - z0, lat0, lon0, d); return out3(enu2aer(e, no, up, d), n); },
    aer2ecef: (a, n) => { const { a: A, f } = ellipAF(a[6]); const d = inDeg(a[7]); const lat0 = asScalar(a[3]), lon0 = asScalar(a[4]); const [e, no, up] = aer2enu(asScalar(a[0]), asScalar(a[1]), asScalar(a[2]), d); const [dx, dy, dz] = enu2ecefv(e, no, up, lat0, lon0, d); const [x0, y0, z0] = g2e(A, f, lat0, lon0, asScalar(a[5]), d); return out3([x0 + dx, y0 + dy, z0 + dz], n); },

    // ── degrees ↔ degrees-minutes-seconds ──
    /** degrees2dms(angleInDegrees) — N-by-1 column → N-by-3 [deg min sec]. */
    degrees2dms: (a) => { const x = toArray(m(a[0])); return ret(fromRows(x.map(deg2dmsRow))); },
    /** degrees2dm(angleInDegrees) — N-by-1 column → N-by-2 [deg min]. */
    degrees2dm: (a) => { const x = toArray(m(a[0])); return ret(fromRows(x.map(deg2dmRow))); },
    /** dms2degrees(DMS) — N-by-3 [deg min sec] → N-by-1 decimal degrees. */
    dms2degrees: (a) => {
      const M = m(a[0]), N = M.rows;
      if (M.cols !== 3) throw new Error('DMS input array must be N-by-3.');
      const out: number[] = [];
      for (let r = 0; r < N; r++) {
        const D = M.data[r], Mi = M.data[r + N], S = M.data[r + 2 * N];
        const sgn = (D < 0 || Mi < 0 || S < 0) ? -1 : 1;
        out.push(sgn * (Math.abs(D) + (Math.abs(Mi) + Math.abs(S) / 60) / 60));
      }
      return ret(colVec(out));
    },
    /** dm2degrees(DM) — N-by-2 [deg min] → N-by-1 decimal degrees. */
    dm2degrees: (a) => {
      const M = m(a[0]), N = M.rows;
      if (M.cols !== 2) throw new Error('DM input array must be N-by-2.');
      const out: number[] = [];
      for (let r = 0; r < N; r++) {
        const D = M.data[r], Mi = M.data[r + N];
        const sgn = (D < 0 || Mi < 0) ? -1 : 1;
        out.push(sgn * (Math.abs(D) + Math.abs(Mi) / 60));
      }
      return ret(colVec(out));
    },

    // ── densify lat/lon sampling (default 'lin': independent linear spacing) ──
    /** interpm(lat,lon,maxsep[,method[,angleunit]]) — insert vertices where adjacent
     *  separation exceeds maxsep. Only 'lin' method supported (linear in lat & lon). */
    interpm: (a, nargout) => {
      const lat = toArray(m(a[0])), lon = toArray(m(a[1])), maxsep = asScalar(a[2]);
      if (lat.length !== lon.length) throw new Error('interpm: LAT and LON must have the same size.');
      const method = isCharVal(a[3]) ? asString(a[3]).toLowerCase() : 'lin';
      if (method !== 'lin') throw new Error("interpm: only the default 'lin' method is supported in this sandbox.");
      const olat: number[] = [], olon: number[] = [];
      for (let k = 0; k < lat.length; k++) {
        olat.push(lat[k]); olon.push(lon[k]);
        if (k < lat.length - 1) {
          const sep = Math.max(Math.abs(lat[k + 1] - lat[k]), Math.abs(lon[k + 1] - lon[k]));
          if (sep > maxsep) {
            const steps = Math.ceil(sep / maxsep);
            for (let i = 1; i < steps; i++) {
              olat.push((lat[k + 1] - lat[k]) / steps * i + lat[k]);
              olon.push((lon[k + 1] - lon[k]) / steps * i + lon[k]);
            }
          }
        }
      }
      return Promise.resolve(nargout >= 2 ? [colVec(olat), colVec(olon)] : [colVec(olat)]);
    },

    // ── format angles as character matrices ──
    /** angl2str(angle[,signcode[,units[,N]]]) — format angles (degrees by default). */
    angl2str: (a) => {
      const ang = toArray(m(a[0]));
      let signcode = 'none', units = 'degrees', digits = -2;
      if (a.length >= 2) signcode = asString(a[1]).toLowerCase();
      if (a.length === 3) {
        // third arg is UNITS (char) or N (numeric)
        if (isCharVal(a[2])) units = checkUnits(asString(a[2]));
        else digits = asScalar(a[2]);
      } else if (a.length >= 4) {
        units = checkUnits(asString(a[2]));
        digits = asScalar(a[3]);
      }
      digits = -digits;  // switch to round()'s right-of-decimal convention
      const rows = ang.map((x) => {
        const middle = angleMiddle(x, units, digits);
        let prefix = '', suffix = '';
        switch (signcode) {
          case 'ns': suffix = x > 0 ? '*N' : x < 0 ? '*S' : '**'; break;
          case 'ew': suffix = x > 0 ? '*E' : x < 0 ? '*W' : '**'; break;
          case 'pm': prefix = x > 0 ? '+' : x < 0 ? '-' : ' '; break;
          case 'none': prefix = x < 0 ? '-' : ' '; break;
          default: throw new Error('Unrecognized SIGNCODE string');
        }
        return prefix + middle + suffix;
      });
      // Right-justify the matrix (strjust), strip all-space border columns (strtrim),
      // replace hold chars, and pad with a leading/trailing space.
      const W = Math.max(0, ...rows.map((r) => r.length));
      const just = rows.map((r) => ' '.repeat(W - r.length) + r);
      // strtrim on the matrix: trim leading/trailing columns that are blank in every row.
      const blankCol = (c: number) => just.every((r) => r[c] === ' ');
      let lo = 0, hi = W;
      while (lo < hi && blankCol(lo)) lo++;
      while (hi > lo && blankCol(hi - 1)) hi--;
      const trimmed = just.map((r) => r.slice(lo, hi).replace(/\*/g, ' '));
      const finalW = hi - lo;
      const items = trimmed.map((r) => ' ' + r + ' ');
      if (items.length === 1) return ret(str(items[0]));
      // N-by-(finalW+2) char matrix.
      const cols = finalW + 2, M = mat(items.length, cols, new Float64Array(items.length * cols));
      M.isChar = true;
      for (let r = 0; r < items.length; r++) for (let c = 0; c < cols; c++) M.data[r + c * items.length] = items[r].charCodeAt(c);
      return ret(M);
    },
  },
  help: HELP_MAPPING,
};
