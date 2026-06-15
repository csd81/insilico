// UAV Toolbox — kinematic and trajectory helper functions.
// Functions: uavMinTurningRadius, uavFlightPathAngle, uavGroundSpeed,
//            uavBankAngle, uavCrossTrackError
// All validated against live MATLAB R2026a.
//
// Oracle values (MATLAB R2026a):
//   uavMinTurningRadius(20, 0.5)    = 74.6376237191621
//   uavMinTurningRadius(15, pi/6)   = 39.7259359534146
//   uavMinTurningRadius(30, pi/4)   = 91.7431192660551
//   uavFlightPathAngle([10 5 -3])   → [gamma=0.262152933325294, psi=0.463647609000806]
//   uavFlightPathAngle([0 10 2])    → [gamma=-0.197395559849881, psi=1.5707963267949]
//   uavFlightPathAngle([0 0 -10])   → [gamma=1.5707963267949, psi=0]
//   uavGroundSpeed(25,pi/4,0.1,[2;1;0])  → vg=[19.589,18.589,-2.496], gs=27.006
//   uavGroundSpeed(20,pi/3,0,[1;-1;0])   → vg=[11,16.321,0], gs=19.681
//   uavBankAngle(20,50)    = 0.684117595232707
//   uavBankAngle(15,40)    = 0.520626863411075
//   uavBankAngle(30,100)   = 0.742362550374071
//   uavBankAngle(10,30)    = 0.327549655122734
//   uavCrossTrackError([0,0,100],[100,100,100],[10,50,100]) = 28.2842712474619
//   uavCrossTrackError([0,0,0],[10,0,0],[5,5,5])            = 7.07106781186548
//   uavCrossTrackError([0,0,0],[0,10,0],[5,5,0])            = 5

import type { Builtin } from '../builtins';
import { type Value, scalar, rowVec, asScalar, toMat as m } from '../values';
import type { ToolboxModule } from './types';
import { HELP_UAV } from '../help/help-uav';

const G = 9.81; // gravitational acceleration (m/s^2), same as MATLAB default

const ret = (v: Value): Promise<Value[]> => Promise.resolve([v]);

// ── uavMinTurningRadius(airspeed, maxRollAngle) ─────────────────────────────────────────
// Minimum turning radius for a fixed-wing UAV in a coordinated level turn.
// Formula: R = v^2 / (g * tan(phi))
// Derived from uavDubinsConnection.updateMinTurningRadius (MATLAB UAV Toolbox).
// airspeed: scalar (m/s); maxRollAngle: scalar (rad); returns scalar (m).
function uavMinTurningRadius(args: Value[]): Promise<Value[]> {
  const v   = asScalar(m(args[0], 'airspeed'));
  const phi = asScalar(m(args[1], 'maxRollAngle'));
  if (v <= 0) throw new Error('uavMinTurningRadius: airspeed must be positive');
  if (phi <= 0 || phi >= Math.PI / 2) throw new Error('uavMinTurningRadius: maxRollAngle must be in (0, pi/2)');
  return ret(scalar(v * v / (G * Math.tan(phi))));
}

// ── uavFlightPathAngle(nedVelocity) ─────────────────────────────────────────────────────
// Convert a NED velocity vector [vN vE vD] (1×3 or 3×1) to flight path angle γ and heading ψ.
//   γ = atan2(-vD, sqrt(vN^2 + vE^2))   [radians, positive = climbing]
//   ψ = atan2(vE, vN)                    [radians, measured CW from North]
// Returns [γ  ψ] as a 1×2 row vector.
function uavFlightPathAngle(args: Value[]): Promise<Value[]> {
  const v = m(args[0], 'nedVelocity');
  if (v.data.length < 3) throw new Error('uavFlightPathAngle: input must have 3 elements [vN vE vD]');
  const N = v.data[0], E = v.data[1], D = v.data[2];
  const gamma = Math.atan2(-D, Math.sqrt(N * N + E * E));
  const psi   = Math.atan2(E, N);
  return ret(rowVec([gamma, psi]));
}

// ── uavGroundSpeed(airspeed, heading, flightPathAngle, windNED) ─────────────────────────
// Compute UAV ground velocity (NED, m/s) from airspeed, heading, flight-path angle and wind.
//   Body→NED (no roll/sideslip in coordinated flight):
//     vN_air = Va * cos(gamma) * cos(psi)
//     vE_air = Va * cos(gamma) * sin(psi)
//     vD_air = -Va * sin(gamma)
//   Ground velocity = airspeed_NED + windNED
// Inputs:
//   airspeed         : scalar (m/s)
//   heading          : scalar (rad), North=0, East=pi/2
//   flightPathAngle  : scalar (rad), positive = climbing
//   windNED          : 3-element vector [wN wE wD] (m/s)
// Returns: [vN vE vD] ground velocity NED (1×3 row)
function uavGroundSpeed(args: Value[]): Promise<Value[]> {
  const Va    = asScalar(m(args[0], 'airspeed'));
  const psi   = asScalar(m(args[1], 'heading'));
  const gamma = asScalar(m(args[2], 'flightPathAngle'));
  const w     = m(args[3], 'windNED');
  if (w.data.length < 3) throw new Error('uavGroundSpeed: windNED must have 3 elements [wN wE wD]');
  const vN = Va * Math.cos(gamma) * Math.cos(psi) + w.data[0];
  const vE = Va * Math.cos(gamma) * Math.sin(psi) + w.data[1];
  const vD = -Va * Math.sin(gamma)                + w.data[2];
  return ret(rowVec([vN, vE, vD]));
}

// ── uavBankAngle(airspeed, turnRadius) ──────────────────────────────────────────────────
// Required bank (roll) angle for a coordinated level turn at given airspeed and radius.
// Formula: phi = atan(v^2 / (g * R))   [radians]
// Inverse of uavMinTurningRadius.
// airspeed: scalar (m/s); turnRadius: scalar (m); returns scalar (rad).
function uavBankAngle(args: Value[]): Promise<Value[]> {
  const v = asScalar(m(args[0], 'airspeed'));
  const R = asScalar(m(args[1], 'turnRadius'));
  if (v <= 0) throw new Error('uavBankAngle: airspeed must be positive');
  if (R <= 0) throw new Error('uavBankAngle: turnRadius must be positive');
  return ret(scalar(Math.atan(v * v / (G * R))));
}

// ── uavCrossTrackError(p1, p2, pos) ─────────────────────────────────────────────────────
// Perpendicular distance (cross-track error) from a 3-D point to the infinite line p1→p2.
// Used by uavWaypointFollower internally (WaypointFollowerBase.pointToLine/projectToLine).
// All inputs are 3-element vectors [x y z] (m, NED frame); returns non-negative scalar (m).
function uavCrossTrackError(args: Value[]): Promise<Value[]> {
  const p1 = m(args[0], 'p1'), p2 = m(args[1], 'p2'), p = m(args[2], 'pos');
  if (p1.data.length < 3 || p2.data.length < 3 || p.data.length < 3) {
    throw new Error('uavCrossTrackError: all inputs must have 3 elements [x y z]');
  }
  const dx = p2.data[0] - p1.data[0], dy = p2.data[1] - p1.data[1], dz = p2.data[2] - p1.data[2];
  const rx = p.data[0]  - p1.data[0], ry = p.data[1]  - p1.data[1], rz = p.data[2]  - p1.data[2];
  const dd = dx*dx + dy*dy + dz*dz;
  let ex: number, ey: number, ez: number;
  if (dd < 1e-30) {
    // degenerate line (p1 === p2): return distance from pos to p1
    ex = rx; ey = ry; ez = rz;
  } else {
    const t = (rx*dx + ry*dy + rz*dz) / dd;
    ex = rx - t*dx; ey = ry - t*dy; ez = rz - t*dz;
  }
  return ret(scalar(Math.sqrt(ex*ex + ey*ey + ez*ez)));
}

export const UAV: ToolboxModule = {
  id: 'uav',
  name: 'UAV Toolbox',
  docBase: 'https://www.mathworks.com/help/uav/ref/',
  docPath: (name) => `${name}.html`,
  builtins: {
    uavMinTurningRadius: uavMinTurningRadius as Builtin,
    uavFlightPathAngle:  uavFlightPathAngle  as Builtin,
    uavGroundSpeed:      uavGroundSpeed      as Builtin,
    uavBankAngle:        uavBankAngle        as Builtin,
    uavCrossTrackError:  uavCrossTrackError  as Builtin,
  },
  help: HELP_UAV,
};
