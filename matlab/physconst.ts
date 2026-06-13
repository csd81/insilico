// Shared physical constants — single source of truth for values that were duplicated across
// several toolbox modules (verified identical before hoisting). Only constants used by ≥2
// toolboxes live here; single-toolbox constants (ISA sea-level, g0) stay module-local to avoid
// premature shared state. Follows the flat-module convention (cf. linalg.ts, specfun.ts).

/** Speed of light in vacuum (m/s) — MATLAB physconst('LightSpeed'). Used by phased + radar. */
export const LIGHTSPEED = 299792458;

/** WGS-84 reference-ellipsoid semi-major axis (m). Used by aerospace + nav + mapping. */
export const WGS84_A = 6378137.0;
/** WGS-84 reference-ellipsoid flattening. Used by aerospace + nav + mapping. */
export const WGS84_F = 1 / 298.257223563;
