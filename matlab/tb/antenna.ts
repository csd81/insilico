// Antenna / Phased-Array — computable, exactly-validatable subset.
//
// The headline `arrayFactor` is a System-object method (its signature is
// `arrayFactor(obj, frequency, ...)` — it needs an antenna/array object), so it is OMITTED
// here: it is not a standalone closed-form numeric function.
//
// What IS implemented: the six phased-array angular-coordinate converters, which are real
// standalone functions with deterministic closed-form numeric output. Each takes a 2×N matrix
// (one [pair] per column) and returns a 2×N matrix. All angles are in degrees.
//
// Closed forms (derived from the standard phased-array definitions, all validated to <1e-6
// against live MATLAB R2026a):
//   azel2uv:      u = cos(el)·sin(az),  v = sin(el)
//   uv2azel:      az = atan2(u, sqrt(1−u²−v²)),  el = asin(v)
//   phitheta2uv:  u = sin(theta)·cos(phi),  v = sin(theta)·sin(phi)
//   uv2phitheta:  phi = atan2(v,u),  theta = asin(hypot(u,v))
//   azel2phitheta: theta = acos(cos(el)·cos(az)),  phi = atan2(tan(el), sin(az))
//   phitheta2azel: el = asin(sin(phi)·sin(theta)),  az = atan2(cos(phi)·sin(theta), cos(theta))
//
// Validated oracle values (MATLAB R2026a, format long g):
//   azel2uv([30;10])        = [0.492403876506104 ; 0.17364817766693]
//   uv2azel([0.3;0.2])      = [17.8295438480694  ; 11.5369590328155]
//   phitheta2uv([30;10])    = [0.150383733180435 ; 0.0868240888334652]
//   uv2phitheta([0.3;0.2])  = [33.6900675259798  ; 21.1342922147862]
//   azel2phitheta([30;10])  = [19.4254001406828  ; 31.4749488891855]
//   phitheta2azel([30;10])  = [8.68220390104617  ; 4.98092532192887]

import { type Value, type Mat, toMat as m } from '../values';
import type { ToolboxModule } from './types';
import { HELP_ANTENNA } from '../help/help-antenna';

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// Map a 2×N input matrix column-wise through f(a,b) -> [c,d]; return a 2×N matrix.
// Column j of a column-major 2×N matrix lives at data[2*j] (row 0) and data[2*j+1] (row 1).
function convert2(v: Value, ctx: string, f: (a: number, b: number) => [number, number]): Mat {
  const M = m(v, ctx);
  if (M.rows !== 2) throw new Error(`${ctx}: expected a 2-by-N matrix (got ${M.rows}-by-${M.cols})`);
  const n = M.cols;
  const out = new Float64Array(2 * n);
  for (let j = 0; j < n; j++) {
    const [c, d] = f(M.data[2 * j], M.data[2 * j + 1]);
    out[2 * j] = c;
    out[2 * j + 1] = d;
  }
  return { kind: 'num', rows: 2, cols: n, data: out };
}

// azel2uv:  u = cos(el)·sin(az),  v = sin(el)   (az, el in degrees)
const azel2uv = (a: Value[]) =>
  ret(convert2(a[0], 'azel2uv', (az, el) => [
    Math.cos(el * D2R) * Math.sin(az * D2R),
    Math.sin(el * D2R),
  ]));

// uv2azel:  az = atan2(u, sqrt(1−u²−v²)),  el = asin(v)   (result in degrees)
const uv2azel = (a: Value[]) =>
  ret(convert2(a[0], 'uv2azel', (u, v) => [
    Math.atan2(u, Math.sqrt(1 - u * u - v * v)) * R2D,
    Math.asin(v) * R2D,
  ]));

// phitheta2uv:  u = sin(theta)·cos(phi),  v = sin(theta)·sin(phi)   (phi, theta in degrees)
const phitheta2uv = (a: Value[]) =>
  ret(convert2(a[0], 'phitheta2uv', (phi, theta) => [
    Math.sin(theta * D2R) * Math.cos(phi * D2R),
    Math.sin(theta * D2R) * Math.sin(phi * D2R),
  ]));

// uv2phitheta:  phi = atan2(v,u),  theta = asin(hypot(u,v))   (result in degrees)
const uv2phitheta = (a: Value[]) =>
  ret(convert2(a[0], 'uv2phitheta', (u, v) => [
    Math.atan2(v, u) * R2D,
    Math.asin(Math.hypot(u, v)) * R2D,
  ]));

// azel2phitheta:  theta = acos(cos(el)·cos(az)),  phi = atan2(tan(el), sin(az))   (degrees)
const azel2phitheta = (a: Value[]) =>
  ret(convert2(a[0], 'azel2phitheta', (az, el) => [
    Math.atan2(Math.tan(el * D2R), Math.sin(az * D2R)) * R2D,
    Math.acos(Math.cos(el * D2R) * Math.cos(az * D2R)) * R2D,
  ]));

// phitheta2azel:  el = asin(sin(phi)·sin(theta)),  az = atan2(cos(phi)·sin(theta), cos(theta))
const phitheta2azel = (a: Value[]) =>
  ret(convert2(a[0], 'phitheta2azel', (phi, theta) => [
    Math.atan2(Math.cos(phi * D2R) * Math.sin(theta * D2R), Math.cos(theta * D2R)) * R2D,
    Math.asin(Math.sin(phi * D2R) * Math.sin(theta * D2R)) * R2D,
  ]));

export const ANTENNA: ToolboxModule = {
  id: 'antenna',
  name: 'Antenna / Array Geometry',
  docBase: 'https://www.mathworks.com/help/antenna/ref/',
  builtins: {
    azel2uv,
    uv2azel,
    phitheta2uv,
    uv2phitheta,
    azel2phitheta,
    phitheta2azel,
  },
  help: HELP_ANTENNA,
};
