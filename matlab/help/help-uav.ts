// Help entries for the UAV Toolbox, extracted from uav.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_UAV: Record<string, HelpEntry | string> = {
    uavMinTurningRadius: {
      summary: 'Minimum turning radius for a fixed-wing UAV in a coordinated level turn',
      syntax:  ['R = uavMinTurningRadius(airspeed, maxRollAngle)'],
      description: [
        'R = uavMinTurningRadius(airspeed, maxRollAngle) returns the minimum turning radius R (m) ' +
        'for a fixed-wing UAV flying at the given airspeed (m/s) with maximum roll (bank) angle maxRollAngle (rad). ' +
        'Formula: R = v^2 / (g * tan(phi)), where g = 9.81 m/s^2. ' +
        'This is the formula used by uavDubinsConnection.MinTurningRadius.',
      ],
      seealso: ['uavBankAngle', 'uavDubinsConnection'],
    },
    uavFlightPathAngle: {
      summary: 'Flight path angle and heading from NED velocity vector',
      syntax:  ['angles = uavFlightPathAngle(nedVelocity)'],
      description: [
        'angles = uavFlightPathAngle(nedVelocity) converts a 1×3 NED velocity [vN vE vD] to ' +
        'a 1×2 output [gamma psi] where gamma is the flight path angle (rad, positive = climbing) ' +
        'and psi is the heading angle (rad, measured clockwise from North). ' +
        'gamma = atan2(-vD, sqrt(vN^2+vE^2)), psi = atan2(vE, vN).',
      ],
      seealso: ['uavGroundSpeed', 'fixedwing'],
    },
    uavGroundSpeed: {
      summary: 'UAV ground velocity (NED) from airspeed, heading, flight-path angle, and wind',
      syntax:  ['vg = uavGroundSpeed(airspeed, heading, flightPathAngle, windNED)'],
      description: [
        'vg = uavGroundSpeed(airspeed, heading, flightPathAngle, windNED) computes the 1×3 NED ' +
        'ground velocity [vN vE vD] (m/s). The airspeed vector is resolved via heading psi (rad CW ' +
        'from North) and flightPathAngle gamma (rad), then the wind vector windNED (3-element, m/s) ' +
        'is added: vN=Va*cos(g)*cos(p)+wN, vE=Va*cos(g)*sin(p)+wE, vD=-Va*sin(g)+wD.',
      ],
      seealso: ['uavFlightPathAngle', 'uavMinTurningRadius'],
    },
    uavBankAngle: {
      summary: 'Required bank angle for a coordinated level turn at given airspeed and radius',
      syntax:  ['phi = uavBankAngle(airspeed, turnRadius)'],
      description: [
        'phi = uavBankAngle(airspeed, turnRadius) returns the bank (roll) angle phi (rad) required ' +
        'for a coordinated level turn at the given airspeed (m/s) and turning radius (m). ' +
        'Formula: phi = atan(v^2 / (g * R)), the inverse of uavMinTurningRadius.',
      ],
      seealso: ['uavMinTurningRadius', 'uavDubinsConnection'],
    },
    uavCrossTrackError: {
      summary: 'Perpendicular distance (cross-track error) from a 3-D point to a path segment',
      syntax:  ['cte = uavCrossTrackError(p1, p2, pos)'],
      description: [
        'cte = uavCrossTrackError(p1, p2, pos) computes the perpendicular (cross-track) distance ' +
        'from the 3-D point pos to the infinite line through p1 and p2 (all in meters, NED frame). ' +
        'This is the algorithm used internally by uavWaypointFollower. All inputs are 3-element ' +
        'vectors [x y z]. Returns a non-negative scalar distance (m).',
      ],
      seealso: ['uavWaypointFollower', 'uavPathManager'],
    },
  };
