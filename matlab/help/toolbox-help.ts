// Consolidated toolbox help. All per-toolbox HELP_<TOOLBOX> entry maps live here in one
// file (previously one help-<toolbox>.ts per toolbox). Each export is keyed by function
// name and consumed via the owning tb/<toolbox>.ts module's ToolboxModule.help.
// This module depends only on ./types (no dependency on ../tb), so tb/*.ts can import it
// without creating a cycle (../help/index.ts imports from ../tb).
import type { HelpEntry } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Aerospace Toolbox, extracted from aerospace.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_AEROSPACE: Record<string, HelpEntry | string> = {
    convlength: { summary: 'Convert length units', syntax: ['c = convlength(v,from,to)'], seealso: ['convvel', 'convmass'], description: ['convertedValues = convlength(valuesToConvert,inputLengthUnits,outputLengthUnits) converts valuesToConvert from original units to desired units using computed conversion factor.'] },
    convvel: { summary: 'Convert velocity units', syntax: ['c = convvel(v,from,to)'], description: ["c = convvel(v,'m/s','ft/s') converts velocity values from one unit to another. Supported units include 'm/s', 'ft/s', 'km/h', 'mph', 'kts'."], seealso: ['convlength', 'convforce'] },
    convmass: { summary: 'Convert mass units', syntax: ['c = convmass(v,from,to)'], seealso: ['convvel', 'convforce'], description: ['convertedValues = convmass(valuesToConvert,inputMassUnits,outputMassUnits) computes the conversion factor from specified input mass units to specified output mass units. The function then applies the conversion factor to the input to produce the output in the specified units.'] },
    convforce: { summary: 'Convert force units', syntax: ['c = convforce(v,from,to)'], description: ["c = convforce(v,'N','lbf') converts force values between units such as 'N', 'lbf', 'kgf', and 'kN'."], seealso: ['convmass', 'convpres'] },
    convpres: { summary: 'Convert pressure units', syntax: ['c = convpres(v,from,to)'], seealso: ['convdensity', 'convvel'], description: ['convertedValues = convpres(valuesToConvert,inputPressureUnits,outputPressureUnits) computes the conversion factor from specified input pressure units to specified output pressure units. The function then applies the conversion factor to the input to produce the output in the specified units.'] },
    convdensity: { summary: 'Convert density units', syntax: ['c = convdensity(v,from,to)'], description: ["c = convdensity(v,'kg/m^3','slug/ft^3') converts density values between units such as 'kg/m^3', 'slug/ft^3', and 'lbm/ft^3'."], seealso: ['convpres', 'convmass'] },
    convacc: { summary: 'Convert acceleration units', syntax: ['c = convacc(v,from,to)'], seealso: ['convvel', 'convforce'], description: ['convertedValues = convacc(valuesToConvert,inputAccelUnits,outputAccelUnits) computes the conversion factor from specified input acceleration units to specified output acceleration units. The function then applies the conversion factor to the input to produce the output in the specified units.'] },
    convang: { summary: 'Convert angle units', syntax: ['c = convang(v,from,to)'], description: ["c = convang(v,'deg','rad') converts angle values between units: 'deg', 'rad', and 'rev' (revolutions)."], seealso: ['convangvel', 'convangacc'] },
    convangvel: { summary: 'Convert angular velocity units', syntax: ['c = convangvel(v,from,to)'], seealso: ['convang', 'convangacc'], description: ['convertedValues = convangvel(valuesToConvert,inputAngularVelocityUnits,outputAngularVelocityUnits) computes the conversion factor from specified input angular velocity units to specified output angular velocity units. The function then applies the conversion factor to the input to produce the output in the specified units.'] },
    convangacc: { summary: 'Convert angular acceleration units', syntax: ['c = convangacc(v,from,to)'], description: ["c = convangacc(v,'rad/s^2','deg/s^2') converts angular acceleration between units such as 'rad/s^2', 'deg/s^2', and 'rpm/s'."], seealso: ['convang', 'convangvel'] },
    convtemp: { summary: 'Convert temperature units', syntax: ['c = convtemp(v,from,to)'], seealso: ['convpres', 'convdensity'], description: ['convertedValues = convtemp(valuesToConvert,inputTemperatureUnits,outputTemperatureUnits) computes the conversion factor from specified input temperature units (inputTemperatureUnits) to specified output temperature units (outputTemperatureUnits). The function then applies the conversion factor to the valuesToConvert.'] },
    quatconj: { summary: 'Calculate conjugate of quaternion', syntax: ['qc = quatconj(q)'], seealso: ['quatinv', 'quatnormalize', 'quatmultiply'], description: ['n = quatconj(q) calculates the conjugate n for a given quaternion, q. For more information on the quaternion and quaternion conjugate forms, see Algorithms.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention.'] },
    quatinv: { summary: 'Calculate inverse of quaternion', syntax: ['qi = quatinv(q)'], description: ['qi = quatinv(q) returns the inverse of the normalized quaternion q such that q*qi = [1 0 0 0].', 'For a unit quaternion the inverse equals the conjugate: [q(1) -q(2) -q(3) -q(4)].'], seealso: ['quatconj', 'quatnormalize', 'quatmultiply'] },
    quatnormalize: { summary: 'Normalize quaternion', syntax: ['qn = quatnormalize(q)'], seealso: ['quatmod', 'quatnorm', 'quatmultiply'], description: ['normalized_q = quatnormalize(q) calculates the normalized quaternion, normalized n, for a given quaternion, q. For more information on the quaternion and normalized quaternion forms, see Algorithms.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention.'] },
    quatmod: { summary: 'Calculate modulus (magnitude) of quaternion', syntax: ['m = quatmod(q)'], description: ['m = quatmod(q) returns the magnitude sqrt(q(1)^2+q(2)^2+q(3)^2+q(4)^2) of quaternion q.'], seealso: ['quatnorm', 'quatnormalize', 'quatinv'] },
    quatnorm: { summary: 'Norm (sum of squares) of quaternion', syntax: ['n = quatnorm(q)'], seealso: ['quatmod', 'quatnormalize'], description: ['norm = quatnorm(q) calculates the norm norm for a given quaternion, q. For more information on the quaternion and quaternion norm forms, see Algorithms.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention.'] },
    quatmultiply: { summary: 'Calculate product of two quaternions', syntax: ['r = quatmultiply(q,p)'], description: ['r = quatmultiply(q,p) returns the Hamilton product of quaternions q and p.', 'Quaternion multiplication is not commutative: quatmultiply(q,p) ≠ quatmultiply(p,q) in general.'], seealso: ['quatinv', 'quatconj', 'quatdivide'] },
    quatdivide: { summary: 'Divide quaternion by another', syntax: ['q = quatdivide(q1,q2)'], seealso: ['quatmultiply', 'quatinv'], description: ['n = quatdivide(q,r) calculates the result of quaternion division n for two given quaternions, q and r. For more information on the input and output quaternion forms, see Algorithms.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention.'] },
    quatrotate: { summary: 'Rotate vector by quaternion', syntax: ['vr = quatrotate(q,v)'], seealso: ['quat2dcm', 'dcm2quat', 'quatmultiply'], description: ['n = quatrotate(q,r) calculates the resulting vector following the passive rotation of initial vector r by quaternion q and returns a final vector n. If quaternions are not yet normalized, the function normalizes them.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention. This function normalizes all quaternion inputs.'] },
    quat2dcm: { summary: 'Convert quaternion to direction cosine matrix', syntax: ['dcm = quat2dcm(q)'], description: ['dcm = quat2dcm(q) converts a unit quaternion q (1-by-4 or N-by-4) to a 3-by-3 direction cosine matrix (or 3-by-3-by-N array for multiple quaternions).'], seealso: ['dcm2quat', 'angle2dcm', 'quatrotate'] },
    dcm2quat: { summary: 'Convert direction cosine matrix to quaternion', syntax: ['q = dcm2quat(dcm)'], description: ['q = dcm2quat(dcm) converts a 3-by-3 direction cosine matrix to a 1-by-4 unit quaternion.', 'For a 3-by-3-by-N array, dcm2quat returns an N-by-4 array of quaternions.'], seealso: ['quat2dcm', 'angle2quat', 'dcm2angle'] },
    quat2rod: { summary: 'Convert quaternion to Euler-Rodrigues vector', syntax: ['r = quat2rod(q)'], seealso: ['rod2quat', 'quat2dcm'], description: ['rod=quat2rod(quat) function calculates the Euler-Rodrigues vector, rod, for a given quaternion quat. The quaternion input and resulting Euler-Rodrigues vector represent a right-hand passive transformation from frame A to frame B.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention. This function normalizes all quaternion inputs.'] },
    rod2quat: { summary: 'Convert Euler-Rodrigues vector to quaternion', syntax: ['q = rod2quat(r)'], seealso: ['quat2rod', 'rod2dcm'], description: ['quat=rod2quat(R) function calculates the quaternion, quat, for a given Euler-Rodrigues (also known as Rodrigues) vector, R. The Euler-Rodrigues vector input and resulting quaternion represent a right-hand passive transformation from frame A to frame B.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention.'] },
    quatexp: { summary: 'Exponential of quaternion', syntax: ['qe = quatexp(q)'], seealso: ['quatlog', 'quatpower'], description: ['qe=quatexp(q) calculates the exponential, qe, for the specified quaternion, q.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention.'] },
    quatlog: { summary: 'Natural logarithm of quaternion', syntax: ['ql = quatlog(q)'], seealso: ['quatexp', 'quatpower'], description: ['ql=quatlog(q) calculates the natural logarithm, ql, for a normalized quaternion, q.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention.', 'This function uses the relationships.', 'For q=[cos(θ),sin(θ)v], with log(q)=[0,θv].'] },
    quatpower: { summary: 'Power of quaternion', syntax: ['qp = quatpower(q,p)'], seealso: ['quatexp', 'quatlog', 'quatmultiply'], description: ['qp = quatpower(q,pow) calculates q to the power of pow for a normalized quaternion, q.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention.'] },
    quatinterp: { summary: 'Spherical linear interpolation between two quaternions (SLERP)', syntax: ['qi = quatinterp(q1,q2,f)'], seealso: ['quatmultiply', 'quatnormalize'], description: ['qi=quatinterp(p,q,f,method) calculates the quaternion interpolation between two normalized quaternions p and q by interval fraction f.', 'p and q are the two extremes between which the function calculates the quaternion.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention.'] },
    angle2quat: { summary: 'Convert rotation angles to quaternion', syntax: ['q = angle2quat(r1,r2,r3)', "q = angle2quat(r1,r2,r3,sequence)"], seealso: ['quat2angle', 'angle2dcm', 'quat2dcm'], description: ['quaternion = angle2quat(rotationAng1,rotationAng2,rotationAng3) calculates the quaternion for three rotation angles, using the default rotation sequence of _\'ZYX\'_ (yaw, pitch, roll).. Aerospace Toolbox uses quaternions that are defined using the scalar-first convention. The rotation angles represent a series of right-hand intrinsic passive rotations from frame A to frame B. The resulting quaternion represents a right-hand passive rotation from frame A to frame B.', 'quaternion = angle2quat(rotationAng1,rotationAng2,rotationAng3,rotationSequence) calculates the quaternion using a rotation sequence. The rotation sequence parameter also specifies the order of the three rotation angles.'] },
    quat2angle: { summary: 'Convert quaternion to rotation angles', syntax: ['[r1,r2,r3] = quat2angle(q)', "[r1,r2,r3] = quat2angle(q,sequence)"], seealso: ['angle2quat', 'dcm2angle', 'quat2dcm'], description: ['[rotationAng1 rotationAng2 rotationAng3] = quat2angle(q) calculates the set of rotation angles, rotationAng1, rotationAng2, and rotationAng3, for a given quaternion, q, using the default rotation order of _\'ZYX\'_ (yaw, pitch, roll). The quaternion represents a passive transformation from frame A to frame B. The resulting rotation angles represent a series of right-hand intrinsic passive rotations from frame A to frame B.', '[rotationAng1 rotationAng2 rotationAng3] = quat2angle(q,rotationSequence) calculates the set of rotation angles rotationAng1, rotationAng2, rotationAng3 for a given quaternion, q, and a specified rotation sequence, rotationSequence.', 'Aerospace Toolbox uses quaternions that are defined using the scalar-first convention. This function normalizes all quaternion inputs.'] },
    angle2dcm: { summary: 'Convert rotation angles to direction cosine matrix', syntax: ['dcm = angle2dcm(r1,r2,r3)', "dcm = angle2dcm(r1,r2,r3,sequence)"], seealso: ['dcm2angle', 'angle2quat', 'quat2dcm'], description: ['dcm = angle2dcm(rotationAng1,rotationAng2,rotationAng3) calculates the direction cosine matrix dcm given a set of three rotation angles, rotationAng1, rotationAng2, and rotationAng3, using the default rotation sequence of _\'ZYX\'_ (yaw, pitch, roll). The rotation angles represent a series of right-hand intrinsic passive rotations from frame A to frame B. The resulting direction cosine matrix represents a right-hand passive rotation from frame A to frame B.', 'dcm = angle2dcm(___,rotationSequence) calculates the direction cosine matrix given the rotation sequence, rotationSequence. The rotation sequence parameter also specifies the order of the three rotation angles.'] },
    dcm2angle: { summary: 'Convert direction cosine matrix to rotation angles', syntax: ['[r1,r2,r3] = dcm2angle(dcm)', "[r1,r2,r3] = dcm2angle(dcm,sequence)"], seealso: ['angle2dcm', 'dcm2quat', 'quat2angle'], description: ['### Basic Syntax', '[rotationAng1 rotationAng2 rotationAng3] = dcm2angle(dcm) calculates the rotation angles, rotationAng1, rotationAng2, rotationAng3, for a direction cosine matrix, dcm, using the default rotation sequence of _\'ZYX\'_ (yaw, pitch, roll). The direction cosine matrix represents a passive transformation from frame A to frame B. The resulting rotation angles represent a series of right-hand intrinsic passive rotations from frame A to frame B.', '[rotationAng1 rotationAng2 rotationAng3] = dcm2angle(dcm,rotationSequence) calculates the rotation angles for a specified rotation sequence, rotationSequence. The rotation sequence parameter also specifies the order of the three rotation angles. For example, if rotationSequence has a value of _XYZ_ , the output rotation angles are in the order _x-y-z_ (roll, pitch, yaw).', '### Constraint, Action, and Tolerance Syntax', '[rotationAng1 rotationAng2 rotationAng3] = dcm2angle(dcm,rotationSequence,lim) calculates the rotation angles for a specified angle constraint, lim. Specify lim after all other input arguments.'] },
    angle2rod: { summary: 'Convert rotation angles to Euler-Rodrigues vector', syntax: ['r = angle2rod(r1,r2,r3)'], seealso: ['rod2angle', 'angle2quat', 'angle2dcm'], description: ['rod = angle2rod(rotationAng1,rotationAng2,rotationAng3) function converts the rotation described by the three rotation angles, rotationAng1, rotationAng2, and rotationAng3, into an _M_ -by-3 Euler-Rodrigues (Rodrigues) matrix, rod, using the default rotation sequence of _\'ZYX\'_ (yaw, pitch, roll). The rotation angles represent a series of right-hand intrinsic passive rotations from frame A to frame B. The resulting Euler- Rodrigues vector represents a right-hand passive rotation from frame A to frame B.', 'rod = angle2rod(rotationAng1,rotationAng2, rotationAng3,rotationSequence) function converts the rotation described by the three rotation angles and a rotation sequence, rotationSequence, into an _M_ -by-3 Euler-Rodrigues array, rod, that contains the _M_ Rodrigues vector. The rotation sequence parameter also specifies the order of the three rotation angles.'] },
    rod2angle: { summary: 'Convert Euler-Rodrigues vector to rotation angles', syntax: ['[r1,r2,r3] = rod2angle(r)', "[r1,r2,r3] = rod2angle(r,sequence)"], description: ['[r1,r2,r3] = rod2angle(r) extracts Euler angles from the Rodrigues parameter vector r using the default ZYX sequence.'], seealso: ['angle2rod', 'rod2dcm', 'dcm2angle'] },
    rod2dcm: { summary: 'Convert Euler-Rodrigues vector to direction cosine matrix', syntax: ['dcm = rod2dcm(r)'], description: ['dcm = rod2dcm(r) converts a 3-element Rodrigues parameter vector r to a 3-by-3 direction cosine matrix.'], seealso: ['dcm2rod', 'rod2angle', 'angle2dcm'] },
    dcm2rod: { summary: 'Convert direction cosine matrix to Euler-Rodrigues vector', syntax: ['r = dcm2rod(dcm)'], seealso: ['rod2dcm', 'dcm2quat', 'dcm2angle'], description: ['R = dcm2rod(dcm) function calculates the Euler-Rodrigues vector (R) from the direction cosine matrix. This function applies only to direction cosine matrices that are orthogonal with determinant +1. The direction cosine matrix input and resulting Euler-Rodrigues vector represent a right-hand passive transformation from frame A to frame B.', 'R = dcm2rod(dcm,action) performs action if the direction cosine matrix is invalid (not orthogonal).', 'R = dcm2rod(dcm,action,tolerance) uses a tolerance level to evaluate if the direction cosine matrix, n, is valid (orthogonal).'] },
    atmosisa: { summary: 'International Standard Atmosphere (ISA) model', syntax: ['[T,a,P,rho] = atmosisa(h)'], description: ['[T,a,P,rho] = atmosisa(h) returns temperature T (K), speed of sound a (m/s), pressure P (Pa), and density rho (kg/m^3) at geometric altitude h (m) per the ISA model.', 'Valid for altitudes from -2000 m to 86000 m.'], seealso: ['atmospalt', 'atmoscoesa'] },
    atmoscoesa: { summary: 'COESA 1976 standard atmosphere model', syntax: ['[T,a,P,rho] = atmoscoesa(h)'], seealso: ['atmosisa', 'atmospalt'], description: ['[T,a,P,rho] = atmoscoesa(height) implements the mathematical representation of the 1976 Committee on Extension to the Standard Atmosphere (COESA) United States standard lower atmospheric values. These values are absolute temperature, pressure, density, and speed of sound for the input geopotential altitude, height.', 'Below the geopotential altitude of 0 m (0 feet) and above the geopotential altitude of 84,852 m (approximately 278,386 feet), the atmoscoesa function extrapolates values.', '[T,a,P,rho] = atmoscoesa(height,action) specifies the action for out-of-range input.'] },
    atmospalt: { summary: 'Calculate pressure altitude from ambient pressure', syntax: ['h = atmospalt(P)'], description: ['h = atmospalt(P) returns the pressure altitude h (m) corresponding to the ambient pressure P (Pa) using the ISA model.'], seealso: ['atmosisa', 'atmoscoesa'] },
    airspeed: { summary: 'Compute airspeed from velocity vector', syntax: ['v = airspeed(vel)'], description: ['v = airspeed(vel) computes the scalar airspeed magnitude from a 3-element body-frame velocity vector vel = [u v w].'], seealso: ['alphabeta', 'machnumber'] },
    alphabeta: { summary: 'Compute angle of attack and sideslip from velocity vector', syntax: ['[alpha,beta] = alphabeta(vel)'], description: ['[alpha,beta] = alphabeta(vel) computes the angle of attack alpha and sideslip angle beta (in radians) from the body-frame velocity vector vel = [u v w].'], seealso: ['airspeed', 'dcm2alphabeta', 'dpressure'] },
    dcm2alphabeta: { summary: 'Convert direction cosine matrix to angle of attack and sideslip', syntax: ['[alpha,beta] = dcm2alphabeta(dcm)'], description: ['[alpha,beta] = dcm2alphabeta(dcm) extracts the angle of attack and sideslip angle from a body-to-wind direction cosine matrix.'], seealso: ['alphabeta', 'angle2dcm', 'dcm2angle'] },
    dpressure: { summary: 'Compute dynamic pressure from velocity and density', syntax: ['q = dpressure(v,rho)'], description: ['q = dpressure(v,rho) returns the dynamic pressure q = 0.5*rho*|v|^2 where v is the velocity vector and rho is air density.'], seealso: ['machnumber', 'airspeed', 'atmosisa'] },
    machnumber: { summary: 'Compute Mach number from velocity and speed of sound', syntax: ['M = machnumber(v,a)'], description: ['M = machnumber(v,a) returns the Mach number as |v|/a where v is the velocity vector and a is the speed of sound.'], seealso: ['airspeed', 'dpressure', 'atmosisa'] },
    geocradius: { summary: 'Radius of ellipsoid planet at geocentric latitude', syntax: ['r = geocradius(lat)'], seealso: ['geoc2geod', 'geod2geoc'], description: ['### WGS84 Ellipsoid Planet', 'r = geocradius(lambda) estimates the radius, r, of an ellipsoid planet at a particular geocentric latitude, lambda.', 'r = geocradius(lambda,model) estimates the radius for a specific ellipsoid planet.', '### Custom Ellipsoid Planet', 'r = geocradius(lambda,f,Re) is another alternate method for estimating the radius for a custom ellipsoid planet defined by flattening, f, and the equatorial radius, Re, in meters.'] },
    dcmbody2stability: { summary: 'Body to stability axes direction cosine matrix', syntax: ['dcm = dcmbody2stability(alpha)'], seealso: ['dcmbody2wind'], description: ['dcm = dcmbody2stability(anglesOfAttack) calculates the direction cosine matrix dcm for given set of angles of attack anglesOfAttack.'] },
    flowprandtlmeyer: { summary: 'Prandtl-Meyer expansion flow relations', syntax: ['[M,nu,mu] = flowprandtlmeyer(gamma,x,mtype)'], description: ["flowprandtlmeyer computes Prandtl-Meyer expansion relations for supersonic flow. By default x is Mach number; specify mtype='nu' or 'mu' to use Prandtl-Meyer angle or Mach angle."], seealso: ['flowisentropic', 'flownormalshock'] },
    flownormalshock: { summary: 'Normal shock relations for compressible flow', syntax: ['[M2,T,P,rho,P0,TotalP] = flownormalshock(gamma,M)'], description: ['flownormalshock(gamma,M) returns flow property ratios across a normal shock for upstream Mach number M and specific heat ratio gamma.', 'Outputs: downstream Mach M2, static temperature ratio T2/T1, static pressure ratio P2/P1, density ratio, and total pressure ratio.'], seealso: ['flowisentropic', 'flowrayleigh', 'flowfanno'] },
    flowfanno: { summary: 'Fanno line (adiabatic duct with friction) flow relations', syntax: ['[M,T,P,rho,V,P0,F] = flowfanno(gamma,M)'], description: ['flowfanno(gamma,M) computes Fanno line flow ratios relative to the critical (M=1) state for a given upstream Mach number M.', 'Assumes adiabatic, constant-area duct with friction; returns temperature, pressure, density, velocity, total pressure ratios, and Fanno parameter.'], seealso: ['flownormalshock', 'flowrayleigh', 'flowisentropic'] },
    flowrayleigh: { summary: 'Rayleigh line (frictionless duct with heat addition) flow relations', syntax: ['[M,T,P,rho,V,P0,T0] = flowrayleigh(gamma,M)'], description: ['flowrayleigh(gamma,M) computes Rayleigh line flow property ratios relative to the critical state for Mach number M.', 'Assumes frictionless constant-area duct with heat addition; returns static and total temperature, pressure, density, and velocity ratios.'], seealso: ['flowfanno', 'flownormalshock', 'flowisentropic'] },
    rrdelta: { summary: 'Compute relative pressure ratio (P/P_SL)', syntax: ['delta = rrdelta(P,P0)'], description: ['delta = rrdelta(P,P0) computes the pressure ratio P/P0 where P is the ambient pressure and P0 is sea-level standard pressure.'], seealso: ['rrtheta', 'rrsigma', 'atmosisa'] },
    rrtheta: { summary: 'Compute relative temperature ratio (T/T_SL)', syntax: ['theta = rrtheta(T,T0)'], seealso: ['rrdelta', 'rrsigma'], description: ['th = rrtheta(t0,mach,g) computes temperature relative ratios, th, from static temperatures t0, Mach numbers mach, and specific heat ratios g. t0 must be in kelvin.'] },
    rrsigma: { summary: 'Compute relative density ratio (rho/rho_SL)', syntax: ['sigma = rrsigma(rho,rho0)'], seealso: ['rrdelta', 'rrtheta'], description: ['s = rrsigma(rho,mach,g) computes the relative density ratio s, from the static densities rho, Mach numbers, mach, and specific heat ratios, g.'] },
    flowisentropic: { summary: 'Isentropic flow ratios for compressible flow', syntax: ['[M,T,P,rho,A] = flowisentropic(gamma,x)'], description: ['flowisentropic(gamma,x) returns isentropic flow property ratios T/T0, P/P0, rho/rho0, and area ratio A/A* for given Mach number x and specific heat ratio gamma.'], seealso: ['flownormalshock', 'flowprandtlmeyer'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Antenna / Array Geometry, extracted from antenna.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_ANTENNA: Record<string, HelpEntry | string> = {
    azel2uv: { summary: 'Convert azimuth-elevation to u-v coordinates', syntax: ['uv = azel2uv(az,el)'], seealso: ['uv2azel', 'phitheta2uv'] },
    uv2azel: { summary: 'Convert u-v to azimuth-elevation coordinates', syntax: ['[az,el] = uv2azel(uv)'], seealso: ['azel2uv', 'uv2phitheta'] },
    phitheta2uv: { summary: 'Convert phi-theta to u-v coordinates', syntax: ['uv = phitheta2uv(phi,theta)'], seealso: ['uv2phitheta', 'azel2uv'] },
    uv2phitheta: { summary: 'Convert u-v to phi-theta coordinates', syntax: ['[phi,theta] = uv2phitheta(uv)'], seealso: ['phitheta2uv', 'uv2azel'] },
    azel2phitheta: { summary: 'Convert azimuth-elevation to phi-theta coordinates', syntax: ['[phi,theta] = azel2phitheta(az,el)'], seealso: ['phitheta2azel', 'azel2uv'] },
    phitheta2azel: { summary: 'Convert phi-theta to azimuth-elevation coordinates', syntax: ['[az,el] = phitheta2azel(phi,theta)'], seealso: ['azel2phitheta', 'uv2azel'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Audio Toolbox, extracted from audio.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_AUDIO: Record<string, HelpEntry | string> = {
    hz2bark: { summary: 'Converts values in hertz to values on the Bark frequency scale.', syntax: ['bark = hz2bark(hz)'], seealso: ['bark2hz', 'hz2mel', 'mel2hz', 'hz2erb', 'erb2hz'], description: ['bark = hz2bark(hz) converts values in hertz to values on the Bark frequency scale.'] },
    bark2hz: { summary: 'Converts values on the Bark frequency scale to values in hertz.', syntax: ['hz = bark2hz(bark)'], seealso: ['hz2bark', 'hz2mel', 'mel2hz', 'hz2erb', 'erb2hz'], description: ['hz = bark2hz(bark) converts values on the Bark frequency scale to values in hertz.'] },
    hz2mel: { summary: 'Converts values in hertz to values on the mel frequency scale.', syntax: ['mel = hz2mel(hz)', 'mel = hz2mel(hz,MelStyle=style)'], seealso: ['mel2hz', 'hz2erb', 'erb2hz', 'hz2bark', 'bark2hz'], description: ['mel = hz2mel(hz) converts values in hertz to values on the mel frequency scale.', 'mel = hz2mel(hz,MelStyle=style) specifies whether to use the Slaney- style or O\'Shaughnessy-style mel scale.'] },
    mel2hz: { summary: 'Converts values on the mel frequency scale to values in hertz.', syntax: ['hz = mel2hz(mel)', 'hz = mel2hz(mel,MelStyle=style)'], seealso: ['hz2mel', 'hz2erb', 'erb2hz', 'hz2bark', 'bark2hz'], description: ['hz = mel2hz(mel) converts values on the mel frequency scale to values in hertz.', 'hz = mel2hz(mel,MelStyle=style) specifies whether to use the Slaney- style or O\'Shaughnessy-style mel scale.'] },
    hz2erb: { summary: 'Converts values in hertz to values on the ERB frequency scale.', syntax: ['erb = hz2erb(hz)'], seealso: ['erb2hz', 'hz2mel', 'mel2hz', 'hz2bark', 'bark2hz'], description: ['erb = hz2erb(hz) converts values in hertz to values on the ERB frequency scale.'] },
    erb2hz: { summary: 'Converts values on the ERB frequency scale to values in hertz.', syntax: ['hz = erb2hz(erb)'], seealso: ['hz2erb', 'hz2mel', 'mel2hz', 'hz2bark', 'bark2hz'], description: ['hz = erb2hz(erb) converts values on the ERB frequency scale to values in hertz.'] },
    dBov: { summary: 'Convert linear amplitude to dBov (full-scale decibels)', syntax: ['dBov_val = dBov(x)'], seealso: ['mag2db', 'db2mag'], description: ['Lmean = dBov(audioIn) returns the average Decibel-to-overload signal level (dBov), Lmean, for the input signal, audioIn, according to the algorithms defined in the ITU-T Recommendation G.100.1 standard .', 'Lmean = dBov(audioIn,ClippingMagnitude=Lclip) additionally specifies the clipping (overload) amplitude, Lclip.', '[Lmean,Lpeak] = dBov(___) additionally returns Lpeak, which is the peak decibel to overload signal level.'] },
    phon2sone: { summary: 'Converts phon to sone, according to ISO 532-1:2017(E).', syntax: ['sone = phon2sone(phon)', 'sone = phon2sone(phon,standard)'], seealso: ['sone2phon', 'acousticLoudness'], description: ['sone = phon2sone(phon) converts phon to sone, according to ISO 532-1:2017(E).', 'sone = phon2sone(phon,standard) specifies the standard used to convert phon to sone.'] },
    sone2phon: { summary: 'Converts sone to phon, according to ISO 532-1:2017(E).', syntax: ['phon = sone2phon(sone)', 'phon = sone2phon(sone,standard)'], seealso: ['phon2sone', 'acousticLoudness'], description: ['phon = sone2phon(sone) converts sone to phon, according to ISO 532-1:2017(E).', 'phon = sone2phon(sone,standard) specifies the standard used to convert sone to phon.'] },
    octavebw2bw: { summary: 'Converts octave bandwidths N and band center frequencies fc into linear analog cutoff frequencies cutoffsAnalog.', syntax: ['cutoffsAnalog = octavebw2bw(N,fc)', '[cutoffsAnalog,cutoffsDigital] = octavebw2bw(N,fc,SampleRate=fs)'], seealso: ['q2octavebw', 'octavebw2q', 'bw2octavebw', 'audioBandwidthSpecification'], description: ['cutoffsAnalog = octavebw2bw(N,fc) converts octave bandwidths N and band center frequencies fc into linear analog cutoff frequencies cutoffsAnalog.', '[cutoffsAnalog,cutoffsDigital] = octavebw2bw(N,fc,SampleRate=fs) returns the digital cutoff frequency cutoffsDigital when you specify a sample rate using SampleRate=fs.'] },
    bw2octavebw: { summary: 'Converts cutoff frequencies into octave bandwidths, N.', syntax: ['[N,FcAnalog] = bw2octavebw(CutoffFrequencies)', '[N,FcAnalog,FcDigital] = bw2octavebw(CutoffFrequencies,SampleRate=fs)'], seealso: ['q2octavebw', 'octavebw2q', 'octavebw2bw', 'audioBandwidthSpecification'], description: ['[N,FcAnalog] = bw2octavebw(CutoffFrequencies) converts cutoff frequencies into octave bandwidths, N. FcAnalog are the center frequencies of the octave bands.', '[N,FcAnalog,FcDigital] = bw2octavebw(CutoffFrequencies,SampleRate=fs) returns the analog center frequencies, FcAnalog, and the digital center frequencies, FcDigital, of the octave bands when you specify a sample rate using SampleRate=fs.'] },
    mls: { summary: 'Returns an excitation signal generated using the maximum length sequence (MLS) technique.', syntax: ['excitation = mls', 'excitation = mls(L)', 'excitation = mls(L,ExcitationLevel=level)'], seealso: ['impzest', 'sweeptone'], description: ['excitation = mls returns an excitation signal generated using the maximum length sequence (MLS) technique. This type of sequence is a pseudo-random binary sequence.', 'excitation = mls(L) specifies the output length L of the excitation signal.', 'excitation = mls(L,ExcitationLevel=level) specifies the level of the excitation signal to generate in dB.'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Bioinformatics Toolbox, extracted from bioinfo.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_BIOINFO: Record<string, HelpEntry | string> = {
    nt2int: { summary: 'Convert nucleotide sequence to integer sequence', syntax: ['SeqInt = nt2int(SeqChar)', 'SeqInt = nt2int(SeqChar,Name=Value)'], description: ['SeqInt = nt2int(SeqChar) converts a nucleotide character sequence to a row vector of integers using the standard IUPAC encoding (A=1, C=2, G=3, T=4, etc.).', "Specify 'Unknown' to control the integer value for unknown nucleotides (default 0); 'ACGTOnly',true to restrict to A/C/G/T/U only."], seealso: ['int2nt', 'aa2int', 'baselookup'] },
    int2nt: { summary: 'Convert integer sequence to nucleotide sequence', syntax: ['SeqChar = int2nt(SeqInt)', 'SeqChar = int2nt(SeqInt,Name=Value)'], description: ["SeqChar = int2nt(SeqInt) converts an integer vector to a nucleotide character vector using the standard IUPAC decoding.", "Specify 'Alphabet','DNA' (default) or 'RNA' to choose the nucleotide alphabet."], seealso: ['nt2int', 'int2aa', 'baselookup'] },
    aa2int: { summary: 'Convert amino acid sequence to integer sequence', syntax: ['SeqInt = aa2int(SeqChar)', 'SeqInt = aa2int(SeqChar,Unknown=unknownAA)'], description: ['SeqInt = aa2int(SeqChar) converts a character vector or string of single-letter amino acid codes to a row vector of integers.'], seealso: ['int2aa', 'nt2int', 'aminolookup'] },
    int2aa: { summary: 'Convert integer sequence to amino acid sequence', syntax: ['SeqChar = int2aa(SeqInt)', 'SeqChar = int2aa(SeqInt,Name=Value)'], description: ['SeqChar = int2aa(SeqInt) converts an integer vector to a character vector of single-letter amino acid codes.'], seealso: ['aa2int', 'int2nt', 'aminolookup'] },
    seqreverse: { summary: 'Reverse a nucleotide sequence', syntax: ['SeqR = seqreverse(SeqNT)'], seealso: ['seqcomplement', 'seqrcomplement', 'fliplr'], description: ['_SeqR_ = seqreverse(_SeqNT_) calculates the reverse strand of a DNA or RNA nucleotide sequence. The return sequence, _SeqR_ , reads from 3\' --> 5\' and is in the same format as _SeqNT_. For example, if _SeqNT_ is a vector of integers, then so is _SeqR_.'] },
    seqcomplement: { summary: 'Complementary strand of a DNA/RNA nucleotide sequence', syntax: ['SeqC = seqcomplement(SeqNT)'], seealso: ['seqrcomplement', 'seqreverse', 'palindromes'], description: ['SeqC = seqcomplement(SeqNT) returns the complementary sequence of the DNA or RNA nucleotide sequence contained in SeqNT. The format of SeqC matches SeqNT. For example, if SeqNT is a vector of integers, then so is SeqC. For complementary base pairs, see Complementary DNA and RNA Base Pairs. For complementary ambiguous characters, see Complementary IUPAC Ambiguity Codes.'] },
    seqrcomplement: { summary: 'Reverse complement of a DNA/RNA nucleotide sequence', syntax: ['SeqRC = seqrcomplement(SeqNT)'], seealso: ['seqcomplement', 'seqreverse'], description: ['SeqRC = seqrcomplement(arguSeqNT) calculates the reverse complementary strand of a DNA or RNA nucleotide sequence. The return sequence, SeqRC, reads from 3\' to 5\' and is in the same format as SeqNT. For example, if SeqNT is a vector of integers, then so is SeqRC.'] },
    basecount: { summary: 'Count nucleotide base occurrences in a sequence', syntax: ['NTStruct = basecount(SeqNT)', 'NTStruct = basecount(SeqNT,Name=Value)'], seealso: ['aacount', 'codoncount', 'dimercount', 'baselookup'], description: ['NTStruct = basecount(SeqNT) returns the number of each type of base in SeqNT.', 'NTStruct = basecount(SeqNT,Name=Value) uses additional options specified by one or more name-value arguments.'] },
    aacount: { summary: 'Count amino acid occurrences in a sequence', syntax: ['countStruct = aacount(SeqAA)', 'countStruct = aacount(SeqAA,Name=Value)'], seealso: ['basecount', 'codoncount', 'aminolookup'], description: ['countStruct = aacount(SeqAA) counts the number of each type of amino acid in SeqAA, an amino acid sequence, and returns the counts in countStruct, a 1-by-1 MATLAB® structure containing fields for the standard 20 amino acids (A, R, N, D, C, Q, E, G, H, I, L, K, M, F, P, S, T, W, Y, and V).', 'countStruct = aacount(SeqAA,Name=Value) uses additional options specified by one or more name-value arguments. For example, countStruct = aacount(SeqAA,Chart="pie") creates a pie chart showing relative proportions of the amino acids.'] },
    nt2aa: { summary: 'Convert nucleotide sequence to amino acid sequence', syntax: ['SeqAA = nt2aa(SeqNT)', 'SeqAA = nt2aa(SeqNT,Name=Value)'], description: ['SeqAA = nt2aa(SeqNT) translates a nucleotide sequence to an amino acid sequence using the standard genetic code.'], seealso: ['aa2nt', 'baselookup', 'codonbias'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Communications Toolbox, extracted from comm.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_COMM: Record<string, HelpEntry | string> = {
    zadoffChuSeq: { summary: 'Generate a Zadoff-Chu sequence', syntax: ['seq = zadoffChuSeq(R,N)'], description: ['seq = zadoffChuSeq(R,N) generates the Rth root Zadoff-Chu sequence of length N, as defined in 3GPP TS 36.211.'], seealso: [] },
    gen2par: { summary: 'Convert between parity-check and generator matrices', syntax: ['H = gen2par(G)', 'G = gen2par(H)'], description: ['H = gen2par(G) converts a standard-form binary generator matrix G to the corresponding parity-check matrix H.'], seealso: ['cyclgen', 'hammgen'] },
    gfweight: { summary: 'Minimum distance of a linear block code', syntax: ['wt = gfweight(genmat)', 'wt = gfweight(genmat,\'gen\')'], description: ['wt = gfweight(genmat) returns the minimum distance of the linear block code whose generator matrix is genmat.'], seealso: ['hammgen', 'cyclpoly', 'bchgenpoly'] },
    gfadd: { summary: 'Adds two GF(2) polynomials, a and b.', syntax: ['c = gfadd(a,b)', 'c = gfadd(a,b,p)'], seealso: ['gfsub', 'gfconv', 'gfmul', 'gfdeconv', 'gfdiv'], description: ['c = gfadd(a,b) adds two GF(2) polynomials, a and b.'] },
    gfdiv: { summary: 'Divides b by a in GF(2) element-by-element.', syntax: ['quot = gfdiv(b,a)', 'quot = gfdiv(b,a,p)'], seealso: ['gfmul', 'gfdeconv', 'gfconv', 'gftuple'], description: ['quot = gfdiv(b,a) divides b by a in GF(2) element-by-element. Each entry in a and b represents an element of GF(2).'] },
    cyclpoly: { summary: 'Returns the row vector representing one nontrivial generator polynomial for a cyclic code with codeword length N and message length K.', syntax: ['pol = cyclpoly(N,K)', 'pol = cyclpoly(N,K,opt)'], seealso: ['cyclgen', 'encode', 'gfprimfd'], description: ['pol = cyclpoly(N,K) returns the row vector representing one nontrivial generator polynomial for a cyclic code with codeword length N and message length K.'] },
    oct2poly: { summary: 'Convert octal number to binary polynomial coefficients', syntax: ['p = oct2poly(oct)', 'p = oct2poly(oct,ord)'], seealso: ['poly2trellis', 'oct2dec'], description: ['b = oct2poly(oct) converts an octal number, oct, to a vector of binary coefficients, b.'] },
    fspl: { summary: 'Free space path loss', syntax: ['L = fspl(R,lambda)'], seealso: ['fogpl', 'gaspl', 'rainpl'], description: ['L = fspl(R,lambda) returns the free space path loss in decibels for a waveform with wavelength lambda propagated over a distance of R meters. The minimum value of L is zero, indicating no path loss.'] },
    cyclgen: { summary: 'Produce parity-check and generator matrices for a cyclic code', syntax: ['h = cyclgen(n,p)', 'h = cyclgen(n,p,opt)'], description: ['h = cyclgen(n,p) produces an (n-k)-by-n parity-check matrix for a systematic binary cyclic code of codeword length n with generator polynomial p.'], seealso: ['encode', 'decode', 'bchgenpoly', 'cyclpoly'] },
    qfunc: { summary: 'Q function (Gaussian tail probability)', syntax: ['y = qfunc(x)'], description: ['y = qfunc(x) returns the Q function value for each element of real-valued x.'], seealso: ['qfuncinv', 'erfc'] },
    quantiz: { summary: 'Produce a quantization index and quantized output value', syntax: ['index = quantiz(sig,partition)', '[index,quants] = quantiz(sig,partition,codebook)'], description: ['index = quantiz(sig,partition) returns quantization indices for sig using the scalar quantization boundary vector partition.'], seealso: ['lloyds'] },
    qfuncinv: { summary: 'Inverse Q function', syntax: ['z = qfuncinv(y)'], description: ['z = qfuncinv(y) returns x such that qfunc(x) = y.'], seealso: ['qfunc', 'erfinv'] },
    oct2dec: { summary: 'Convert octal to decimal numbers', syntax: ['dec = oct2dec(oct)'], description: ['dec = oct2dec(oct) converts octal numbers in matrix oct to decimal numbers, element by element.'], seealso: [] },
    vec2mat: { summary: 'Convert vector into matrix (row-major, padded)', syntax: ['mat = vec2mat(vec,matcol)', 'mat = vec2mat(vec,matcol,padding)'], description: ['mat = vec2mat(vec,matcol) reshapes the vector vec into a matrix with matcol columns, filling row-major (left to right, top to bottom).'], seealso: [] },
    compand: { summary: 'Source code mu-law or A-law compressor or expander', syntax: ['out = compand(in,param,v)', 'out = compand(in,param,v,method)'], description: ['out = compand(in,param,v) performs mu-law compression with parameter param on input in, scaled to peak value v.'], seealso: [] },
    de2bi: { summary: 'Convert decimal numbers to binary digits', syntax: ['b = de2bi(d)', 'b = de2bi(d,n)'], description: ['b = de2bi(d) converts nonneg integers d to a binary matrix with LSB in first column.'], seealso: ['bi2de'] },
    bi2de: { summary: 'Convert binary digits to decimal numbers', syntax: ['d = bi2de(b)', 'd = bi2de(b,base)'], description: ['d = bi2de(b) converts each row of binary matrix b to the corresponding decimal integer, with LSB in first column.'], seealso: ['de2bi'] },
    symerr: { summary: 'Count symbol errors and compute symbol error rate', syntax: ['[number,ratio] = symerr(x,y)', '[number,ratio] = symerr(x,y,flg)'], description: ['[number,ratio] = symerr(x,y) counts the number of positions where x and y differ and returns the symbol error rate ratio.'], seealso: ['biterr', 'alignsignals', 'finddelay'] },
    biterr: { summary: 'Count bit errors and compute bit error rate', syntax: ['[number,ratio] = biterr(x,y)', '[number,ratio] = biterr(x,y,k)'], description: ['[number,ratio] = biterr(x,y) compares unsigned binary representations of x and y and counts differing bits.'], seealso: ['symerr', 'alignsignals', 'finddelay'] },
    bin2gray: { summary: 'Convert positive integers to Gray-encoded integers', syntax: ['code = bin2gray(x)'], description: ['code = bin2gray(x) converts each nonneg integer in x to its Gray code equivalent.'], seealso: ['gray2bin'] },
    gray2bin: { summary: 'Convert Gray-encoded integers to positive integers', syntax: ['code = gray2bin(x)'], description: ['code = gray2bin(x) converts each Gray-coded integer in x to the corresponding standard binary integer.'], seealso: ['bin2gray'] },
    qammod: { summary: 'Quadrature amplitude modulation', syntax: ['Y = qammod(X,M)', 'Y = qammod(X,M,symOrder)'], description: ['Y = qammod(X,M) modulates input integers X using M-QAM, returning complex baseband symbols.'], seealso: ['qamdemod', 'pskmod', 'pammod'] },
    qamdemod: { summary: 'Quadrature amplitude demodulation', syntax: ['Z = qamdemod(Y,M)', 'Z = qamdemod(Y,M,symOrder)'], description: ['Z = qamdemod(Y,M) demodulates complex QAM signal Y with modulation order M, returning integer symbol indices.'], seealso: ['qammod', 'pskdemod', 'pamdemod'] },
    pskmod: { summary: 'Phase shift keying modulation', syntax: ['Y = pskmod(X,M)', 'Y = pskmod(X,M,phaseoffset)'], description: ['Y = pskmod(X,M) maps integer symbols X in [0,M-1] to M evenly-spaced points on the unit circle.'], seealso: ['pskdemod', 'qammod', 'dpskmod'] },
    pskdemod: { summary: 'Phase shift keying demodulation', syntax: ['Z = pskdemod(Y,M)', 'Z = pskdemod(Y,M,phaseoffset)'], description: ['Z = pskdemod(Y,M) demodulates complex PSK signal Y to integer symbols in [0,M-1].'], seealso: ['pskmod', 'qamdemod', 'dpskdemod'] },
    marcumq: { summary: 'Generalized Marcum Q-function', syntax: ['Q = marcumq(a,b)', 'Q = marcumq(a,b,m)'], description: ['Q = marcumq(a,b) computes the Marcum Q-function of order 1 for noncentrality parameter a and argument b.'], seealso: ['besseli'] },
    finddelay: { summary: 'Estimate delay between signals', syntax: ['d = finddelay(x,y)', 'd = finddelay(x,y,maxlag)'], description: ['d = finddelay(x,y) returns the estimated delay d between signals x and y using cross-correlation.'], seealso: ['alignsignals', 'xcorr'] },
    dpskmod: { summary: 'Differential phase shift keying modulation', syntax: ['y = dpskmod(x,M)', 'y = dpskmod(x,M,phaserot)'], description: ['y = dpskmod(x,M) modulates integer symbols x using M-DPSK, encoding information in phase differences between successive symbols.'], seealso: ['dpskdemod', 'pskmod', 'pskdemod'] },
    dpskdemod: { summary: 'Differential phase shift keying demodulation', syntax: ['z = dpskdemod(y,M)', 'z = dpskdemod(y,M,phaserot)'], description: ['z = dpskdemod(y,M) demodulates M-DPSK signal y by computing phase differences between successive symbols.'], seealso: ['dpskmod', 'pskdemod', 'pskmod'] },
    poly2trellis: { summary: 'Convert convolutional code polynomials to trellis description', syntax: ['trellis = poly2trellis(ConstraintLength,CodeGenerator)', 'trellis = poly2trellis(ConstraintLength,CodeGenerator,FeedbackConnection)'], description: ['trellis = poly2trellis(ConstraintLength,CodeGenerator) builds the trellis structure for a rate-K/N convolutional encoder specified by constraint lengths and octal generator polynomials.'], seealso: ['convenc', 'istrellis'] },
    convenc: { summary: 'Convolutionally encode binary data', syntax: ['codedout = convenc(msg,trellis)', 'codedout = convenc(msg,trellis,puncpat)'], description: ['codedout = convenc(msg,trellis) encodes the binary vector msg using the convolutional encoder described by the trellis structure.'], seealso: ['poly2trellis', 'vitdec', 'istrellis'] },
    istrellis: { summary: 'Check if input is a valid trellis structure', syntax: ['[isok,status] = istrellis(s)'], description: ['[isok,status] = istrellis(s) checks if s is a valid trellis structure usable by convenc and vitdec.'], seealso: ['poly2trellis', 'convenc'] },
    hammgen: { summary: 'Produce parity-check and generator matrices for Hamming code', syntax: ['h = hammgen(m)', 'h = hammgen(m,poly)'], description: ['h = hammgen(m) returns the m-by-(2^m-1) parity-check matrix for a binary Hamming code with codeword length n = 2^m-1.'], seealso: ['encode', 'decode', 'gen2par'] },
    primpoly: { summary: 'Find primitive polynomials for a Galois field', syntax: ['pr = primpoly(m)', 'pr = primpoly(m,opt)'], description: ['pr = primpoly(m) returns the default primitive polynomial for GF(2^m) as a decimal integer (coefficient bit-mask).'], seealso: ['gf', 'isprimitive'] },
    gfminpol: { summary: 'Find the minimal polynomial of an element of a Galois field', syntax: ['pol = gfminpol(k,m)', 'pol = gfminpol(k,m,p)'], description: ['pol = gfminpol(k,m) returns the minimal polynomial of alpha^k over GF(2), where alpha is a root of the default primitive polynomial for GF(2^m).'], seealso: ['gfprimdf', 'gfcosets', 'gfroots'] },
    gftrunc: { summary: 'Minimize the length of a polynomial representation over GF', syntax: ['c = gftrunc(a)'], description: ['c = gftrunc(a) removes trailing (high-order) zeros from the row-vector representation of a polynomial over a Galois field.'], seealso: ['gfadd', 'gfsub', 'gfconv', 'gfdeconv'] },
    iqimbal2coef: { summary: 'Convert I/Q imbalance to compensator coefficient', syntax: ['c = iqimbal2coef(ampImbalanceDB,phaseImbalanceDeg)'], seealso: ['iqcoef2imbal'], description: ['C = iqimbal2coef(A,P) converts an I/Q amplitude and phase imbalance to its equivalent compensator coefficient.'] },
    rsgenpolycoeffs: { summary: 'Generator polynomial coefficients of a Reed-Solomon code', syntax: ['g = rsgenpolycoeffs(n,k)'], seealso: ['rsgenpoly', 'rsenc'], description: ['x = rsgenpolycoeffs(N,K) returns the coefficients for the generator polynomial of an [N,K] Reed-Solomon code.'] },
    iqcoef2imbal: { summary: 'Convert compensator coefficient to amplitude and phase imbalance', syntax: ['[A,P] = iqcoef2imbal(C)'], description: ['[A,P] = iqcoef2imbal(C) converts a complex IQ imbalance compensator coefficient C to its equivalent amplitude imbalance A (dB) and phase imbalance P (degrees).'], seealso: [] },
    fmmod: { summary: 'Frequency modulation', syntax: ['y = fmmod(x,Fc,Fs,freqdev)', 'y = fmmod(x,Fc,Fs,freqdev,ini_phase)'], description: ['y = fmmod(x,Fc,Fs,freqdev) returns the FM-modulated signal y for message x with carrier frequency Fc (Hz), sample rate Fs (Hz), and frequency deviation freqdev (Hz).'], seealso: ['fmdemod', 'ammod', 'pmmod'] },
    matdeintrlv: { summary: 'Restore ordering of symbols using a matrix interleaver', syntax: ['deintrlvd = matdeintrlv(data,Nrows,Ncols)'], description: ['deintrlvd = matdeintrlv(data,Nrows,Ncols) is the inverse of matintrlv: it fills an Nrows-by-Ncols matrix column-by-column with the elements of data, then reads out the rows sequentially.'], seealso: ['matintrlv', 'algdeintrlv'] },
    algdeintrlv: { summary: 'Restore ordering of symbols using an algebraically derived interleaver', syntax: ['deintrlvd = algdeintrlv(data,N,\'takeshita-costello\',c,a)', 'deintrlvd = algdeintrlv(data,N,\'welch-costas\',a)'], description: ['algdeintrlv undoes the permutation applied by algintrlv, using the same algebraic parameters.'], seealso: ['algintrlv', 'matdeintrlv'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Control System Toolbox, extracted from control.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_CONTROL: Record<string, HelpEntry | string> = {
    tf: { summary: 'Create a transfer-function model', syntax: ['sys = tf(num,den)', 'sys = tf(num,den,Ts)'], seealso: ['zpk', 'ss', 'bode', 'step'], description: ['Use tf to create real-valued or complex-valued transfer function models, or to convert dynamic system models to transfer function form.'] },
    ss: { summary: 'Create a state-space model', syntax: ['sys = ss(A,B,C,D)', 'sys = ss(A,B,C,D,Ts)'], description: ['sys = ss(A,B,C,D) creates a continuous-time state-space model with matrices A (state), B (input), C (output), D (feedthrough).'], seealso: ['tf', 'zpk', 'ssdata', 'pole'] },
    zpk: { summary: 'Create a zero-pole-gain model', syntax: ['sys = zpk(z,p,k)', 'sys = zpk(z,p,k,Ts)'], description: ['sys = zpk(z,p,k) creates a continuous-time zero-pole-gain model where z is a vector of zeros, p is a vector of poles, and k is the scalar gain.'], seealso: ['tf', 'ss', 'pole', 'zero'] },
    pole: { summary: 'Compute poles of a dynamic system', syntax: ['p = pole(sys)'], seealso: ['zero', 'damp', 'eig'] },
    zero: { summary: 'Compute zeros of a dynamic system', syntax: ['z = zero(sys)', '[z,gain] = zero(sys)'], description: ['z = zero(sys) returns the transmission zeros of the dynamic system sys as a column vector.'], seealso: ['pole', 'damp', 'zpk'] },
    dcgain: { summary: 'Compute DC (low-frequency) gain of a dynamic system', syntax: ['k = dcgain(sys)'], description: ['k = dcgain(sys) returns the steady-state gain of sys, i.e. the gain at frequency zero.'], seealso: ['pole', 'bode', 'step'] },
    isstable: { summary: 'Determine if a dynamic system is stable', syntax: ['tf = isstable(sys)'], description: ['isstable(sys) returns true if all poles of sys lie in the left half-plane (continuous) or inside the unit disk (discrete).'], seealso: ['pole', 'damp', 'isproper'] },
    tf2zp: { summary: 'Convert transfer function to zero-pole-gain form', syntax: ['[z,p,k] = tf2zp(num,den)'], description: ['[z,p,k] = tf2zp(num,den) finds the zeros z, poles p, and gain k of a SISO transfer function given as numerator/denominator coefficient vectors.'], seealso: ['zp2tf', 'tf2ss', 'roots'] },
    zp2tf: { summary: 'Convert zero-pole-gain to transfer function', syntax: ['[num,den] = zp2tf(z,p,k)'], description: ['[num,den] = zp2tf(z,p,k) converts zero-pole-gain data to numerator/denominator polynomial coefficient vectors.'], seealso: ['tf2zp', 'zpk', 'tf'] },
    tf2ss: { summary: 'Convert transfer function to state-space', syntax: ['[A,B,C,D] = tf2ss(num,den)'], description: ['[A,B,C,D] = tf2ss(num,den) converts the SISO transfer function polynomial num/den to a state-space realization in controllable canonical form.'], seealso: ['ss2tf', 'tf2zp', 'ss'] },
    ss2tf: { summary: 'Convert state-space to transfer function', syntax: ['[num,den] = ss2tf(A,B,C,D)', '[num,den] = ss2tf(A,B,C,D,iu)'], description: ['[num,den] = ss2tf(A,B,C,D) converts the state-space matrices to transfer function numerator/denominator polynomials.'], seealso: ['tf2ss', 'ss2ss', 'zpk'] },
    damp: { summary: 'Natural frequency and damping of system poles', syntax: ['[wn,zeta] = damp(sys)', '[wn,zeta,p] = damp(sys)'], description: ['[wn,zeta] = damp(sys) returns the natural frequencies wn and damping ratios zeta of the poles of sys.'], seealso: ['pole', 'zero', 'esort'] },
    ctrb: { summary: 'Compute controllability matrix', syntax: ['Co = ctrb(A,B)', 'Co = ctrb(sys)'], seealso: ['obsv', 'rank'] },
    obsv: { summary: 'Compute observability matrix', syntax: ['Ob = obsv(A,C)', 'Ob = obsv(sys)'], description: ['Ob = obsv(A,C) returns the observability matrix [C; C*A; C*A^2; ...] for the pair (A,C).'], seealso: ['ctrb', 'rank', 'ss'] },
    dsort: { summary: 'Sort discrete-time poles by magnitude', syntax: ['[s,ndx] = dsort(p)'], description: ['[s,ndx] = dsort(p) sorts the vector of discrete-time poles p by magnitude, placing unstable poles (|p|>=1) first.'], seealso: ['esort', 'pole', 'damp'] },
    esort: { summary: 'Sort continuous-time poles by real part', syntax: ['[s,ndx] = esort(p)'], description: ['[s,ndx] = esort(p) sorts the vector of continuous-time poles p by real part, placing unstable poles (real(p)>=0) first.'], seealso: ['dsort', 'pole', 'damp'] },
    parallel: { summary: 'Parallel connection of two dynamic systems', syntax: ['sys = parallel(sys1,sys2)'], description: ['sys = parallel(sys1,sys2) connects sys1 and sys2 in parallel: the outputs are summed and inputs are shared.'], seealso: ['series', 'feedback', 'connect'] },
    feedback: { summary: 'Feedback connection of two dynamic systems', syntax: ['sys = feedback(sys1,sys2)', 'sys = feedback(sys1,sys2,sign)'], description: ['sys = feedback(sys1,sys2) forms the negative feedback loop: output of sys2 feeds back to the input of sys1.'], seealso: ['parallel', 'series', 'connect'] },
    order: { summary: 'Model order (number of states)', syntax: ['n = order(sys)'], description: ['n = order(sys) returns the number of states of the dynamic system sys.'], seealso: ['pole', 'minreal', 'ss'] },
    append: { summary: 'Block-diagonal append of dynamic systems', syntax: ['sys = append(sys1,sys2,...)'], description: ['sys = append(sys1,sys2,...) groups the models by appending their inputs and outputs into one block-diagonal MIMO model.'], seealso: ['series', 'parallel', 'feedback'] },
    tfdata: { summary: 'Access transfer-function data', syntax: ["[num,den] = tfdata(sys)", "[num,den] = tfdata(sys,'v')"], description: ['[num,den] = tfdata(sys) returns the numerator/denominator coefficients as cell arrays (one cell per I/O channel).'], seealso: ['ssdata', 'zpkdata', 'tf'] },
    ssdata: { summary: 'Access state-space data matrices', syntax: ['[A,B,C,D] = ssdata(sys)'], description: ['[A,B,C,D] = ssdata(sys) returns the state-space matrices of sys (converting from tf/zpk if needed).'], seealso: ['tfdata', 'zpkdata', 'dssdata', 'ss'] },
    zpkdata: { summary: 'Access zero-pole-gain data', syntax: ["[z,p,k] = zpkdata(sys)", "[z,p,k] = zpkdata(sys,'v')"], description: ['[z,p,k] = zpkdata(sys) returns zeros, poles (cell arrays) and gains (matrix).'], seealso: ['tfdata', 'ssdata', 'zpk'] },
    dssdata: { summary: 'Access descriptor state-space data', syntax: ['[A,B,C,D,E] = dssdata(sys)'], description: ['[A,B,C,D,E] = dssdata(sys) returns the descriptor state-space matrices (E is identity for an explicit ss model).'], seealso: ['ssdata', 'dss'] },
    isct: { summary: 'Determine if a model is continuous-time', syntax: ['tf = isct(sys)'], description: ['isct(sys) returns true if sys is a continuous-time model (sample time Ts == 0).'], seealso: ['isdt', 'isstable'] },
    isdt: { summary: 'Determine if a model is discrete-time', syntax: ['tf = isdt(sys)'], description: ['isdt(sys) returns true if sys is a discrete-time model (sample time Ts ~= 0).'], seealso: ['isct', 'isstable'] },
    sminreal: { summary: 'Structurally minimal realization', syntax: ['msys = sminreal(sys)'], description: ['msys = sminreal(sys) eliminates states that are structurally disconnected from the inputs or outputs, keeping only states reachable from an input and connected to an output.'], seealso: ['minreal', 'balreal', 'ss'] },
    nichols: { summary: 'Nichols frequency response', syntax: ['[mag,phase,w] = nichols(sys)', '[mag,phase,w] = nichols(sys,w)'], description: ['[mag,phase,w] = nichols(sys) returns the magnitude (absolute) and phase (degrees) of the frequency response over the grid w, the data underlying a Nichols chart.'], seealso: ['bode', 'nyquist', 'sigma'] },
    series: { summary: 'Series (cascade) connection of two dynamic systems', syntax: ['sys = series(sys1,sys2)'], description: ['sys = series(sys1,sys2) connects sys1 and sys2 in series: the output of sys1 feeds the input of sys2.'], seealso: ['parallel', 'feedback', 'connect'] },
    ss2ss: { summary: 'State coordinate transformation for state-space models', syntax: ['sys2 = ss2ss(sys,T)'], seealso: ['ss', 'canon', 'balreal'] },
    lqr: { summary: 'Linear-quadratic regulator design (continuous time)', syntax: ['[K,S,e] = lqr(sys,Q,R)', '[K,S,e] = lqr(A,B,Q,R)'], seealso: ['dlqr', 'lqe', 'place'] },
    place: { summary: 'Pole placement design', syntax: ['K = place(A,B,p)'], description: ['K = place(A,B,p) computes a state-feedback gain K such that the eigenvalues of A-B*K are the entries of the vector p (the desired closed-loop poles).'], seealso: ['acker', 'lqr', 'reg', 'estim'] },
    acker: { summary: "Pole placement using Ackermann's formula (single input)", syntax: ['k = acker(A,b,p)'], description: ["k = acker(A,b,p) uses Ackermann's formula to compute the state-feedback gain placing the closed-loop poles of the single-input pair (A,b) at p."], seealso: ['place', 'lqr'] },
    care: { summary: 'Continuous-time algebraic Riccati equation solver', syntax: ['[X,L,G] = care(A,B,Q)', '[X,L,G] = care(A,B,Q,R)'], description: ["[X,L,G] = care(A,B,Q,R) solves A'X + XA - XBR^-1B'X + Q = 0."], seealso: ['dare', 'lqr', 'lyap', 'icare'] },
    dare: { summary: 'Discrete-time algebraic Riccati equation solver', syntax: ['[X,L,G] = dare(A,B,Q)', '[X,L,G] = dare(A,B,Q,R)'], description: ["[X,L,G] = dare(A,B,Q,R) solves X = A'XA - (A'XB)(R+B'XB)^-1(B'XA) + Q."], seealso: ['care', 'dlqr', 'dlyap', 'idare'] },
    lqe: { summary: 'Kalman estimator (observer) gain design', syntax: ['[L,P,E] = lqe(A,G,C,Q,R)'], description: ["[L,P,E] = lqe(A,G,C,Q,R) computes the steady-state Kalman estimator gain L for the plant x'=Ax+Bu+Gw, y=Cx+v with process-noise covariance Q and measurement-noise covariance R."], seealso: ['kalman', 'care', 'place', 'reg'] },
    canon: { summary: 'Canonical state-space realization', syntax: ["csys = canon(sys,'modal')", "csys = canon(sys,'companion')"], description: ["csys = canon(sys,'modal') returns the diagonal (modal) realization with the eigenvalues on the diagonal (real-eigenvalue systems)."], seealso: ['ss2ss', 'ctrbf', 'obsvf', 'ss'] },
    ctrbf: { summary: 'Controllability staircase form', syntax: ['[Abar,Bbar,Cbar,T,k] = ctrbf(A,B,C)'], description: ['[Abar,Bbar,Cbar,T,k] = ctrbf(A,B,C) computes an orthogonal transformation T that separates the controllable part of the system into the lower-right block (Abar = T*A*T\', Bbar = T*B, Cbar = C*T\'). k reports the number of controllable states.'], seealso: ['obsvf', 'ctrb', 'minreal', 'canon'] },
    obsvf: { summary: 'Observability staircase form', syntax: ['[Abar,Bbar,Cbar,T,k] = obsvf(A,B,C)'], description: ['[Abar,Bbar,Cbar,T,k] = obsvf(A,B,C) computes an orthogonal transformation T that separates the observable part of the system (Abar = T*A*T\', Bbar = T*B, Cbar = C*T\'). k reports the number of observable states. Dual of ctrbf.'], seealso: ['ctrbf', 'obsv', 'minreal', 'canon'] },
    kalman: { summary: 'Kalman filter design for state estimation', syntax: ['[kest,L,P] = kalman(sys,Qn,Rn)'], description: ['[kest,L,P] = kalman(sys,Qn,Rn) designs the steady-state Kalman filter for the continuous plant sys with process-noise covariance Qn (entering all states) and measurement-noise covariance Rn.'], seealso: ['lqe', 'estim', 'care', 'lqg'] },
    dlqr: { summary: 'Linear-quadratic regulator design (discrete time)', syntax: ['[K,S,e] = dlqr(A,B,Q,R)', '[K,S,e] = dlqr(A,B,Q,R,N)'], description: ['[K,S,e] = dlqr(A,B,Q,R) computes the optimal discrete-time LQR gain K minimizing sum(x\'Qx + u\'Ru) subject to x(k+1)=Ax(k)+Bu(k).'], seealso: ['lqr', 'place', 'dare'] },
    bode: { summary: 'Bode frequency response of dynamic systems', syntax: ['bode(sys)', '[mag,phase,wout] = bode(sys)'], seealso: ['bodemag', 'nyquist', 'margin'] },
    bodemag: { summary: 'Bode magnitude response of dynamic systems', syntax: ['bodemag(sys)', '[mag,wout] = bodemag(sys)'], description: ['bodemag(sys) plots the magnitude (in dB) of the frequency response of sys without the phase panel.'], seealso: ['bode', 'nyquist', 'margin'] },
    c2d: { summary: 'Convert model from continuous to discrete time', syntax: ['sysd = c2d(sys,Ts)', 'sysd = c2d(sys,Ts,method)'], seealso: ['d2c', 'd2d', 'zoh'] },
    margin: { summary: 'Gain and phase margins and crossover frequencies', syntax: ['[Gm,Pm,Wgm,Wpm] = margin(sys)'], seealso: ['bode', 'allmargin', 'nyquist'] },
    stepinfo: { summary: 'Step-response characteristics (rise time, settling time, etc.)', syntax: ['S = stepinfo(sys)'], seealso: ['step', 'lsim', 'impulse'] },
    minreal: { summary: 'Minimal realization or pole-zero cancellation', syntax: ['msys = minreal(sys)', 'msys = minreal(sys,tol)'], seealso: ['pole', 'zero', 'ss'] },
    lyap: { summary: 'Continuous Lyapunov and Sylvester equation solver', syntax: ['X = lyap(A,Q)', 'X = lyap(A,B,C)'], description: ['X = lyap(A,Q) solves the continuous-time Lyapunov equation A*X + X*A\' + Q = 0.'], seealso: ['dlyap', 'lyapchol', 'sylvester'] },
    dlyap: { summary: 'Discrete-time Lyapunov equation solver', syntax: ['X = dlyap(A,Q)'], description: ['X = dlyap(A,Q) solves the discrete-time Lyapunov equation A*X*A\' - X + Q = 0.'], seealso: ['lyap', 'dlyapchol', 'covar'] },
    lyapchol: { summary: 'Square-root (Cholesky) solver for continuous Lyapunov equations', syntax: ['R = lyapchol(A,B)'], description: ['R = lyapchol(A,B) computes the upper-triangular Cholesky factor R of the solution X = R\'*R of the Lyapunov equation A*X + X*A\' + B*B\' = 0.'], seealso: ['lyap', 'dlyapchol', 'chol'] },
    idare: { summary: 'Discrete-time algebraic Riccati equation solver', syntax: ['[X,K,L] = idare(A,B,Q,R)'], description: ['[X,K,L] = idare(A,B,Q,R) solves A\'*X*A - X - (A\'*X*B)*inv(R+B\'*X*B)*(B\'*X*A) + Q = 0.'], seealso: ['icare', 'dlqr', 'dare'] },
    lqrd: { summary: 'Discrete LQR design from a continuous cost function', syntax: ['[K,S,e] = lqrd(A,B,Q,R,Ts)'], description: ['[K,S,e] = lqrd(A,B,Q,R,Ts) computes the discrete state-feedback gain K that minimizes the continuous-time LQR cost for the plant (A,B) sampled with period Ts.'], seealso: ['lqr', 'dlqr', 'c2d'] },
    gensig: { summary: 'Generate a periodic test input signal', syntax: ['[u,t] = gensig(type,tau)', '[u,t] = gensig(type,tau,Tf,Ts)'], description: ['[u,t] = gensig(type,tau) generates a unit-amplitude periodic signal of period tau. type is \'sin\', \'square\', or \'pulse\'.'], seealso: ['lsim', 'square', 'sawtooth'] },
    lsiminfo: { summary: 'Compute linear-response characteristics', syntax: ['S = lsiminfo(y,t)', 'S = lsiminfo(y,t,yfinal,yinit)'], description: ['S = lsiminfo(y,t) returns a struct with TransientTime, SettlingTime, Peak, PeakTime, Min, MinTime, Max, MaxTime for the response data (t,y).'], seealso: ['stepinfo', 'lsim', 'impulse'] },
    frd: { summary: 'Create a frequency-response data model', syntax: ['sys = frd(response,freq)', 'sys = frd(response,freq,Ts)'], description: ['sys = frd(response,freq) creates a frequency-response-data (frd) model from a vector of complex frequency response values and a corresponding frequency vector in rad/s.'], seealso: ['frdata', 'bode', 'tf', 'ss'] },
    frdata: { summary: 'Extract frequency-response data from an frd model', syntax: ['[resp,freq] = frdata(sys)'], description: ['[resp,freq] = frdata(sys) returns the response data vector resp and the frequency vector freq (rad/s) from an frd model created with frd().'], seealso: ['frd', 'bode'] },
    filt: { summary: 'Create discrete-time filter model (DSP convention, z^-1 ascending powers)', syntax: ['sys = filt(num,den)', 'sys = filt(num,den,Ts)'], description: ['sys = filt(num,den) creates a discrete-time transfer function using DSP convention where coefficients are listed in ascending powers of z^-1.'], seealso: ['tf', 'c2d', 'pole'] },
    dss: { summary: 'Create a descriptor state-space model', syntax: ['sys = dss(A,B,C,D,E)', 'sys = dss(A,B,C,D,E,Ts)'], description: ['sys = dss(A,B,C,D,E) creates a descriptor (generalized) state-space model E*xdot = A*x + B*u, y = C*x + D*u.'], seealso: ['ss', 'tf', 'eig'] },
    rss: { summary: 'Generate a random stable continuous-time state-space model', syntax: ['sys = rss(n)', 'sys = rss(n,p,m)'], description: ['sys = rss(n) generates a random stable single-input single-output (SISO) state-space model of order n with all poles in the open left half-plane.'], seealso: ['drss', 'ss', 'pole'] },
    drss: { summary: 'Generate a random stable discrete-time state-space model', syntax: ['sys = drss(n)', 'sys = drss(n,p,m)'], description: ['sys = drss(n) generates a random stable discrete-time SISO state-space model of order n with all poles strictly inside the unit circle.'], seealso: ['rss', 'ss', 'pole'] },
    gram: { summary: 'Controllability or observability Gramian', syntax: ['W = gram(sys,\'c\')', 'W = gram(sys,\'o\')'], description: ['W = gram(sys,\'c\') computes the controllability Gramian by solving A*W + W*A\' + B*B\' = 0 (continuous) or A*W*A\' - W + B*B\' = 0 (discrete).'], seealso: ['lyap', 'dlyap', 'balreal', 'ctrb', 'obsv'] },
    estim: { summary: 'Form state estimator from plant and gain', syntax: ['kest = estim(sys,L)', 'kest = estim(sys,L,sensors,known)'], description: ['kest = estim(sys,L) forms a state estimator for the plant ss(A,B,C,D) with observer gain L.'], seealso: ['kalman', 'reg', 'lqe', 'lqg'] },
    reg: { summary: 'Form output-feedback regulator from state-feedback and estimator gains', syntax: ['rsys = reg(sys,K,L)', 'rsys = reg(sys,K,L,sensors,known)'], description: ['rsys = reg(sys,K,L) forms the observer-based controller for plant sys with state-feedback gain K and estimator gain L.'], seealso: ['estim', 'lqg', 'lqr', 'lqe', 'place'] },
    lqg: { summary: 'LQG (linear-quadratic-Gaussian) regulator design', syntax: ['rsys = lqg(sys,QXU,QWV)'], description: ['rsys = lqg(sys,QXU,QWV) designs the LQG regulator combining lqr (from QXU=[Q N;N\' R]) and Kalman filter (from QWV=[Qn 0;0 Rn]).'], seealso: ['lqr', 'lqe', 'kalman', 'reg', 'estim'] },
    lqi: { summary: 'LQR design with integral action', syntax: ['[K,S,e] = lqi(sys,Q,R)', '[K,S,e] = lqi(sys,Q,R,N)'], description: ['[K,S,e] = lqi(sys,Q,R) augments plant with ny integrators on the outputs and solves LQR on the augmented system.'], seealso: ['lqr', 'lqg', 'reg', 'place'] },
    lqgreg: { summary: 'Form LQG regulator from Kalman estimator and LQR gain', syntax: ['rsys = lqgreg(kest,K)', 'rsys = lqgreg(kest,K,controls)'], description: ['rsys = lqgreg(kest,K) assembles the LQG regulator by closing the loop u=-K*xhat through the Kalman estimator kest.'], seealso: ['kalman', 'lqr', 'reg', 'lqg'] },
    pid: { summary: 'Create a parallel-form PID controller', syntax: ['C = pid(Kp,Ki,Kd)', 'C = pid(Kp,Ki,Kd,Tf)'], description: ['C = pid(Kp,Ki,Kd) creates a parallel-form PID: C(s) = Kp + Ki/s + Kd*s.'], seealso: ['pidstd', 'pid2', 'piddata', 'pidtune'] },
    pid2: { summary: 'Create a 2-DOF parallel-form PID controller', syntax: ['C = pid2(Kp,Ki,Kd)', 'C = pid2(Kp,Ki,Kd,Tf)'], description: ['C = pid2(Kp,Ki,Kd,Tf,b,c) creates a 2-DOF PID with setpoint weights b (P) and c (D).'], seealso: ['pid', 'pidstd', 'piddata'] },
    pidstd: { summary: 'Create a standard-form PID controller', syntax: ['C = pidstd(Kp,Ti,Td)', 'C = pidstd(Kp,Ti,Td,N)'], description: ['C = pidstd(Kp,Ti,Td,N) creates a standard-form PID: Kp*(1 + 1/(Ti*s) + Td*N*s/(Td*s+N)).'], seealso: ['pid', 'pid2', 'pidstddata', 'pidtune'] },
    piddata: { summary: 'Extract parallel PID parameters', syntax: ['[Kp,Ki,Kd,Tf] = piddata(C)'], description: ['[Kp,Ki,Kd,Tf] = piddata(C) extracts the parallel-form parameters from a pid or pid2 controller C.'], seealso: ['pidstddata', 'pid', 'pid2'] },
    pidstddata: { summary: 'Extract standard PID parameters', syntax: ['[Kp,Ti,Td,N] = pidstddata(C)'], description: ['[Kp,Ti,Td,N] = pidstddata(C) extracts the standard-form parameters from a pidstd controller C.'], seealso: ['piddata', 'pidstd'] },
    pidtune: { summary: 'Automatic PID controller tuning (heuristic approximation)', syntax: ['C = pidtune(sys,type)', '[C,info] = pidtune(sys,type)'], description: ['C = pidtune(sys,type) designs a PID controller for plant sys using a heuristic loop-shaping algorithm.'], seealso: ['pid', 'pidstd', 'margin', 'looptune'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Curve Fitting Toolbox, extracted from curvefit.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

const SPLINE_HELP: Record<string, string> = {
  spmak: 'Put together a spline in B-form',
  spbrk: 'Extract parts of a B-form spline',
  spval: 'Evaluate a spline in B-form',
  sp2pp: 'Convert a spline from B-form to piecewise-polynomial form',
  augknt: 'Augment a knot sequence (end knots of multiplicity k)',
  aveknt: 'Knot averages (Greville sites)',
  brk2knt: 'Knot sequence from breaks and multiplicities',
  knt2brk: 'Breaks and multiplicities from a knot sequence',
  knt2mlt: 'Knot multiplicities',
  aptknt: 'Acceptable knot sequence for interpolation',
  spcol: 'B-spline collocation matrix',
  spapi: 'Spline interpolation, B-form',
  fnval: 'Evaluate a spline (pp-form or B-form) at given points',
  fnder: 'Differentiate a spline',
  fnint: 'Integrate a spline',
  fnbrk: 'Extract parts of a spline (breaks/coefs/order/pieces/interval)',
  csaps: 'Cubic smoothing spline',
};

export const HELP_CURVEFIT: Record<string, HelpEntry | string> = {
    ...SPLINE_HELP,
    franke: { summary: "Franke's bivariate test function", syntax: ['z = franke(x,y)'], seealso: ['peaks'], description: ['z = franke(x,y) returns the value z(i) of Franke\'s function at the site (x(i),y(i)), i=1:numel(x), with z of the same size as x and y (which must be of the same size).'] },
    smooth: { summary: 'Smooths the response data in column vector y using a moving average filter.', syntax: ['yy = smooth(y)', 'yy = smooth(y,span)'], seealso: ['smoothdata', 'fit', 'sort'], description: ['yy = smooth(y) smooths the response data in column vector y using a moving average filter.'] },
    datastats: { summary: 'Returns statistics for the column vector x to the structure xds.', syntax: ['xds = datastats(x) [xds,yds] = datastats(x,y)'], seealso: ['excludedata', 'smooth'], description: ['xds = datastats(x) returns statistics for the column vector x to the structure xds. Fields in xds are listed in the table below.'] },
    polyfit2: { summary: 'Polynomial curve fit (alias for polyfit with curve-fitting syntax)', syntax: ['p = polyfit2(x,y,n)'], seealso: ['polyfit', 'polyval'] },
    polyval2: { summary: 'Evaluate polynomial (alias for polyval)', syntax: ['y = polyval2(p,x)'], seealso: ['polyval', 'polyfit'] },
    rsquared: { summary: 'R-squared (coefficient of determination) of a fit', syntax: ['r2 = rsquared(y,yfit)'], seealso: ['fit', 'smooth'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the DSP System Toolbox, extracted from dsp.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_DSP: Record<string, HelpEntry | string> = {
    firpm: {
      summary: 'Parks-McClellan optimal equiripple FIR filter design',
      syntax: ['b = firpm(n,f,a)', 'b = firpm(n,f,a,w)'],
      description: ["b = firpm(n,f,a) returns the coefficients of an order n FIR filter with the best approximation to the desired frequency response described by f and a."],
      seealso: ['firls', 'fir1', 'fir2', 'firpmord', 'kaiserord'],
    },
    remez: {
      summary: 'Parks-McClellan optimal equiripple FIR filter design (alias for firpm)',
      syntax: ['b = remez(n,f,a)', 'b = remez(n,f,a,w)'],
      seealso: ['firpm', 'firls', 'fir1'],
    },
    firls: {
      summary: 'Least-squares linear-phase FIR filter design',
      syntax: ['b = firls(n,f,a)', 'b = firls(n,f,a,w)'],
      description: ['b = firls(n,f,a) designs an order n linear-phase FIR filter that minimises the weighted integral of the squared error between the desired and actual frequency responses.'],
      seealso: ['firpm', 'fir1', 'fir2'],
    },
    grpdelay: {
      summary: 'Group delay of digital filter',
      syntax: ['[gd,w] = grpdelay(b,a)', '[gd,w] = grpdelay(b,a,n)'],
      description: ['gd = grpdelay(b,a) returns the n-point (default 512) group delay of the digital filter with transfer function H(z) = B(z)/A(z).'],
      seealso: ['freqz', 'phasez', 'impz', 'fvtool'],
    },
    impz: {
      summary: 'Impulse response of digital filter',
      syntax: ['[h,t] = impz(b,a)', '[h,t] = impz(b,a,n)'],
      description: ['h = impz(b,a) computes the first n samples of the impulse response of the digital filter with coefficients b (numerator) and a (denominator).'],
      seealso: ['stepz', 'freqz', 'grpdelay'],
    },
    stepz: {
      summary: 'Step response of digital filter',
      syntax: ['[s,t] = stepz(b,a)', '[s,t] = stepz(b,a,n)'],
      description: ['s = stepz(b,a) computes the step response (cumulative sum of impulse response) of the digital filter.'],
      seealso: ['impz', 'freqz'],
    },
    sosfilt: {
      summary: 'Second-order (biquad) IIR filtering',
      syntax: ['y = sosfilt(sos,x)', 'y = sosfilt(sos,x,zi)'],
      description: ['y = sosfilt(sos,x) filters x using the second-order section matrix sos.'],
      seealso: ['tf2sos', 'zp2sos', 'filter', 'filtfilt'],
    },
    tf2sos: {
      summary: 'Transfer function to second-order sections',
      syntax: ['[sos,g] = tf2sos(b,a)'],
      description: ['Converts numerator/denominator polynomial [b,a] to second-order sections [sos] plus gain g. Pairing is done by sorting poles by proximity to unit circle.'],
      seealso: ['sos2tf', 'zp2sos', 'tf2zp', 'sosfilt'],
    },
    sos2tf: {
      summary: 'Second-order sections to transfer function',
      syntax: ['[b,a] = sos2tf(sos)', '[b,a] = sos2tf(sos,g)'],
      description: ['Converts an L×6 SOS matrix (with optional gain g) to polynomial form [b,a].'],
      seealso: ['tf2sos', 'zp2sos', 'sosfilt'],
    },
    zp2tf: {
      summary: 'Zero-pole-gain to transfer function',
      syntax: ['[b,a] = zp2tf(z,p,k)'],
      description: ['Converts zeros z, poles p, and gain k to polynomial form [b,a].'],
      seealso: ['tf2zp', 'zp2sos', 'zpkdata'],
    },
    tf2zp: {
      summary: 'Transfer function to zero-pole-gain',
      syntax: ['[z,p,k] = tf2zp(b,a)'],
      description: ['Converts polynomial form [b,a] to zeros z, poles p, and gain k by root finding.'],
      seealso: ['zp2tf', 'tf2sos', 'zpkdata'],
    },
    'zp2sos': {
      summary: 'Zero-pole-gain to second-order sections',
      syntax: ['sos = zp2sos(z,p,k)', '[sos,g] = zp2sos(z,p,k)'],
      description: ['Converts zeros, poles, and gain to second-order section matrix. Pairs complex conjugate roots into biquad sections.'],
      seealso: ['sos2tf', 'tf2sos', 'sosfilt'],
    },
    bilinear: {
      summary: 'Bilinear transformation method of IIR filter design',
      syntax: ['[Bz,Az] = bilinear(B,A,Fs)', '[Zd,Pd,Kd] = bilinear(Z,P,K,Fs)'],
      description: ['[Bz,Az] = bilinear(B,A,Fs) converts the analog prototype with transfer function B(s)/A(s) to a digital filter using the bilinear transform s = 2*Fs*(z-1)/(z+1).'],
      seealso: ['butter', 'cheby1', 'cheby2', 'ellip', 'besself'],
    },
    besself: {
      summary: 'Bessel analog lowpass filter design',
      syntax: ['[b,a] = besself(n,Wo)', "[b,a] = besself(n,Wo,'high')"],
      description: ['[b,a] = besself(n,Wo) designs an n-th order analog Bessel lowpass filter with cutoff frequency Wo rad/s.'],
      seealso: ['butter', 'cheby1', 'ellip', 'bilinear'],
    },
    decimate: {
      summary: 'Decimate signal by integer factor',
      syntax: ['y = decimate(x,r)', 'y = decimate(x,r,n)'],
      description: ['y = decimate(x,r) reduces the sample rate of x by the integer factor r.'],
      seealso: ['interp', 'resample', 'upfirdn', 'downsample'],
    },
    // QUARANTINED: interp (see implementation note above)
    resample: {
      summary: 'Resample signal at new sample rate',
      syntax: ['y = resample(x,p,q)', 'y = resample(x,p,q,n)'],
      description: ['y = resample(x,p,q) resamples x at p/q times the original sample rate using polyphase filtering.'],
      seealso: ['decimate', 'interp', 'upfirdn'],
    },
    chebwin: {
      summary: 'Chebyshev window',
      syntax: ['w = chebwin(n)', 'w = chebwin(n,r)'],
      description: ['w = chebwin(n,r) returns an n-point Dolph-Chebyshev window with r dB of sidelobe attenuation (default 100 dB).'],
      seealso: ['gausswin', 'taylorwin', 'tukeywin', 'kaiser'],
    },
    taylorwin: {
      summary: 'Taylor window',
      syntax: ['w = taylorwin(n)', 'w = taylorwin(n,nbar,sll)'],
      description: ['Taylor window with nbar near-sidelobe pairs and sll dB peak sidelobe level (default nbar=4, sll=-30 dB).'],
      seealso: ['chebwin', 'gausswin', 'tukeywin'],
    },
    tukeywin: {
      summary: 'Tukey (cosine-tapered) window',
      syntax: ['w = tukeywin(n)', 'w = tukeywin(n,r)'],
      description: ['Tukey window with taper ratio r (default 0.5). r=0 → rectangular; r=1 → Hann.'],
      seealso: ['chebwin', 'gausswin', 'taylorwin'],
    },
    gausswin: {
      summary: 'Gaussian window',
      syntax: ['w = gausswin(n)', 'w = gausswin(n,alpha)'],
      description: ['Gaussian window: w(n) = exp(-0.5*(alpha*(2n-N)/(N))^2). alpha controls width (default 2.5).'],
      seealso: ['chebwin', 'tukeywin', 'taylorwin'],
    },
    firpmord: {
      summary: 'Parks-McClellan optimal FIR filter order estimation',
      syntax: ['[n,fo,ao,w] = firpmord(f,a,dev)', '[n,fo,ao,w] = firpmord(f,a,dev,fs)'],
      description: ['Estimates the minimum order n for a Parks-McClellan FIR filter meeting the given specifications. Returns order, normalized frequency edges, amplitudes, and weights for firpm.'],
      seealso: ['firpm', 'kaiserord', 'fir1'],
    },
    step: {
      summary: 'Execute DSP System object algorithm',
      syntax: ['y = step(h,x)', 'step(h,x)'],
      description: ['y = step(h,x) processes input x through System object h and returns output y.'],
      seealso: ['release', 'reset'],
    },
    release: {
      summary: 'Release resources and allow changes to System object property values and input characteristics',
      syntax: ['release(h)'],
      description: ['Resets internal state of DSP System object h, allowing property changes.'],
      seealso: ['step', 'reset'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Econometrics Toolbox, extracted from econ.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_ECON: Record<string, HelpEntry | string> = {
    adftest: { summary: 'Returns the rejection decision from conducting an augmented Dickey-Fuller test for a unit root in the input univariate time series.', syntax: ['h = adftest(y)', 'StatTbl = adftest(Tbl)'], seealso: ['kpsstest', 'lmctest', 'pptest', 'vratiotest', 'i10test'], description: ['h = adftest(y) returns the rejection decision from conducting an augmented Dickey-Fuller test for a unit root in the input univariate time series.'] },
    pptest: { summary: 'Returns the rejection decision from conducting the Phillips-Perron test for a unit root in the input univariate time series.', syntax: ['h = pptest(y)', 'StatTbl = pptest(Tbl)'], seealso: ['adftest', 'kpsstest', 'vratiotest', 'lmctest'], description: ['h = pptest(y) returns the rejection decision from conducting the Phillips-Perron test for a unit root in the input univariate time series.'] },
    price2ret: { summary: 'Returns the matrix of numVars continuously compounded return series, and corresponding time intervals, from the input matrix of numVars price series.', syntax: ['[Returns,intervals] = price2ret(Prices)', 'ReturnTbl = price2ret(PriceTbl)'], seealso: ['ret2price', 'tick2ret'], description: ['[Returns,intervals] = price2ret(Prices) returns the matrix of numVars continuously compounded return series, and corresponding time intervals, from the input matrix of numVars price series.'] },
    tick2ret: { summary: 'Convert tick (price) series to return series', syntax: ['ret = tick2ret(price)', 'ret = tick2ret(price,base)'], seealso: ['ret2tick', 'price2ret'] },
    lagmatrix: { summary: 'Shifts the input regular series in time by the input vector of lags (positive) or leads (negative), and returns the matrix of shifted series.', syntax: ['YLag = lagmatrix(Y,lags)', '[YLag,TLag] = lagmatrix(Y,lags)'], description: ['YLag = lagmatrix(Y,lags) shifts the input regular series in time by the input vector of lags (positive) or leads (negative), and returns the matrix of shifted series.'] },
    autocorr: { summary: 'Returns the sample autocorrelation function (ACF) and associated lags of the input univariate time series.', syntax: ['[acf,lags] = autocorr(y)', 'ACFTbl = autocorr(Tbl)'], description: ['[acf,lags] = autocorr(y) returns the sample autocorrelation function (ACF) and associated lags of the input univariate time series.'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the ts2func, extracted from financial.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_FINANCIAL: Record<string, HelpEntry | string> = {
    npv: { summary: 'Net present value of a cash flow stream', syntax: ['npv_val = npv(rate,cashflow)'], description: ['npv_val = npv(rate,cashflow) computes the net present value of cashflow at periodic discount rate rate. cashflow(1) is at t=0 (not discounted); cashflow(k) is discounted by (1+rate)^(k-1).', 'Use a negative initial element to represent an upfront investment.'], seealso: ['irr', 'pvvar', 'fvvar'] },
    pvvar: { summary: 'Present value of varying (irregular) cash flow', syntax: ['PresentVal = pvvar(CashFlow,Rate)'], description: ['PresentVal = pvvar(CashFlow,Rate) computes the present value of an irregular cash flow stream CashFlow at discount rate Rate.', 'CashFlow is a vector where the first element is the initial investment (negative) and subsequent elements are cash inflows.'], seealso: ['fvvar', 'irr', 'pvfix'] },
    fvvar: { summary: 'Future value of varying (irregular) cash flow', syntax: ['FutureVal = fvvar(CashFlow,Rate)'], description: ['FutureVal = fvvar(CashFlow,Rate) computes the future value (at the end of the last period) of an irregular cash flow stream at rate Rate.'], seealso: ['pvvar', 'irr', 'fvfix'] },
    irr: { summary: 'Internal rate of return of a cash flow', syntax: ['Return = irr(CashFlow)', '[Return,AllRates] = irr(CashFlow)'], description: ['Return = irr(CashFlow) calculates the internal rate of return for a series of periodic cash flows. CashFlow(1) is the initial investment (typically negative) and subsequent elements are inflows.', '[Return,AllRates] = irr(CashFlow) also returns all roots of the NPV polynomial, not just the principal root.'], seealso: ['npv', 'pvvar', 'pvfix', 'effrr'] },
    pvfix: { summary: 'Present value of fixed periodic payments', syntax: ['PresentVal = pvfix(Rate,NumPeriods,Payment)', 'PresentVal = pvfix(Rate,NumPeriods,Payment,FutureVal,Due)'], description: ['PresentVal = pvfix(Rate,NumPeriods,Payment) computes the present value of an annuity of fixed periodic payments at discount rate Rate for NumPeriods periods.'], seealso: ['fvfix', 'payper', 'pvvar'] },
    fvfix: { summary: 'Future value of fixed periodic payments', syntax: ['FutureVal = fvfix(Rate,NumPeriods,Payment)', 'FutureVal = fvfix(Rate,NumPeriods,Payment,PresentVal,Due)'], description: ['FutureVal = fvfix(Rate,NumPeriods,Payment) computes the future value of an annuity of fixed periodic payments.'], seealso: ['pvfix', 'payper', 'fvvar'] },
    payper: { summary: 'Periodic payment of a loan or annuity', syntax: ['Payment = payper(Rate,NumPeriods,PresentVal)', 'Payment = payper(Rate,NumPeriods,PresentVal,FutureVal,Due)'], description: ['Payment = payper(Rate,NumPeriods,PresentVal) returns the periodic payment needed to repay a present value PresentVal over NumPeriods periods at interest rate Rate.'], seealso: ['pvfix', 'fvfix', 'annuity'] },
    annuity: { summary: 'Present value annuity factor', syntax: ['f = annuity(rate,nper)'], description: ['f = annuity(rate,nper) returns the present value factor of an ordinary annuity: (1-(1+rate)^(-nper))/rate.', 'Multiply by the periodic payment to get the present value of the annuity stream.'], seealso: ['pvfix', 'fvfix', 'payper'] },
    effrr: { summary: 'Effective annual rate of return from nominal rate', syntax: ['Return = effrr(Rate,NumPeriods)'], description: ['Return = effrr(Rate,NumPeriods) calculates the annual effective rate corresponding to a nominal rate Rate compounded NumPeriods times per year.', 'Uses the formula: Return = (1 + Rate/NumPeriods)^NumPeriods - 1.'], seealso: ['nomrr', 'pvfix'] },
    nomrr: { summary: 'Nominal rate of return from effective rate', syntax: ['nom = nomrr(eff,nper)'], description: ['nom = nomrr(eff,nper) returns the nominal rate corresponding to an effective annual rate eff compounded nper times per year: nom = nper*((1+eff)^(1/nper)-1).'], seealso: ['effrr', 'pvfix'] },
    blsprice: { summary: 'Black-Scholes European option prices (call and put)', syntax: ['[Call,Put] = blsprice(Price,Strike,Rate,Time,Volatility)', '[Call,Put] = blsprice(Price,Strike,Rate,Time,Volatility,Yield)'], description: ['[Call,Put] = blsprice(Price,Strike,Rate,Time,Volatility) computes European put and call option prices using the Black-Scholes model.', 'Price is the current asset price, Strike the exercise price, Rate the continuously compounded risk-free rate, Time the time to expiry in years, Volatility the annualised volatility, and Yield the continuous dividend yield (default 0).'], seealso: ['blsdelta', 'blsgamma', 'blsvega', 'blsrho', 'blsimpv'] },
    blsdelta: { summary: 'Black-Scholes option delta (sensitivity to underlying price)', syntax: ['[callDelta,putDelta] = blsdelta(S,K,r,T,sigma)', '[callDelta,putDelta] = blsdelta(S,K,r,T,sigma,q)'], description: ['[callDelta,putDelta] = blsdelta(S,K,r,T,sigma) computes the delta of European call and put options using the Black-Scholes model.', 'q is the continuous dividend yield (default 0). Delta ranges from 0 to 1 for calls and -1 to 0 for puts.'], seealso: ['blsprice', 'blsvega', 'blsgamma'] },
    days360: { summary: 'Days between dates using 30/360 (SIA) convention', syntax: ['NumDays = days360(StartDate,EndDate)'], description: ['NumDays = days360(StartDate,EndDate) returns the number of days between StartDate and EndDate based on a 360-day year where all months contain 30 days, following the SIA convention.', 'Month-end days of 31 are adjusted to 30; February month-end is extended to 30.'], seealso: ['daysdif', 'daysact', 'days365', 'yearfrac'] },
    daysdif: { summary: 'Days between dates for a given day-count basis', syntax: ['d = daysdif(d1,d2,basis)'], description: ['d = daysdif(d1,d2,basis) computes the number of days between dates d1 and d2 using the specified day-count convention: 0=actual/actual, 1=30/360, 2=actual/360, 3=actual/365, 4=30/360 (European).'], seealso: ['daysact', 'days360', 'days365'] },
    busdate: { summary: 'Next or previous business day', syntax: ['d = busdate(d)', 'd = busdate(d,dir)'], description: ["d = busdate(d) returns the next business day (weekday) on or after d.", "dir = 1 (default) for next business day, -1 for previous."], seealso: ['datewrkdy', 'days252bus', 'busdays'] },
    busdays: { summary: 'Vector of business days between two dates', syntax: ['bdates = busdays(sdate,edate)', 'bdates = busdays(sdate,edate,bdmode,Holiday)'], description: ['bdates = busdays(sdate,edate) generates a column vector of business days (weekdays) from sdate to edate inclusive.', 'bdmode selects the business-day convention; Holiday is an optional vector of additional holiday serial dates to exclude.'], seealso: ['busdate', 'days252bus', 'daysact'] },
    datewrkdy: { summary: 'Date a specified number of work days from a starting date', syntax: ['d = datewrkdy(d0,n)', 'd = datewrkdy(d0,n,hol)'], description: ['d = datewrkdy(d0,n) returns the date that is n working days (Mon–Fri) after date d0.', 'n can be negative to count backwards; hol is an optional vector of holiday serial dates to exclude.'], seealso: ['busdate', 'days252bus', 'datenum'] },
    days252bus: { summary: 'Number of 252 business days between two dates', syntax: ['d = days252bus(d1,d2)'], description: ['d = days252bus(d1,d2) counts business days between d1 and d2 assuming a 252-trading-day year (standard in Brazilian financial markets).'], seealso: ['busdays', 'busdate', 'daysact'] },
    eomdate: { summary: 'Last date of the specified month', syntax: ['d = eomdate(year,month)'], description: ['d = eomdate(year,month) returns the serial date number of the last day of the given month and year.'], seealso: ['busdate', 'datewrkdy', 'datenum'] },
    calendar: { summary: 'Calendar matrix for a specified month (6-by-7)', syntax: ['cal = calendar', 'cal = calendar(d)', 'cal = calendar(year,month)'], description: ['calendar returns a 6-by-7 matrix of dates for the current month, with zeros padding days before/after the month.', 'Columns represent Sunday through Saturday.'], seealso: ['eomdate', 'busdate', 'datestr'] },
    daysact: { summary: 'Actual number of days between two dates', syntax: ['d = daysact(d1,d2)'], description: ['d = daysact(d1,d2) returns the actual (Act/Act) number of days between dates d1 and d2.'], seealso: ['daysdif', 'days360', 'days365'] },
    yearfrac: { summary: 'Fraction of year between two dates for a day-count basis', syntax: ['f = yearfrac(StartDate,EndDate)', 'f = yearfrac(StartDate,EndDate,Basis)'], description: ['f = yearfrac(StartDate,EndDate) returns the fraction of a year between StartDate and EndDate using actual/actual day-count (basis 0).', 'Basis: 0=Act/Act (default), 1=30/360, 2=Act/360, 3=Act/365, 4=30/360 European.'], seealso: ['days360', 'daysact', 'daysdif', 'yeardays'] },
    leapyear: { summary: 'Determine leap years', syntax: ['tf = leapyear(year)'], seealso: ['datenum', 'eomday'] },
    depstln: { summary: 'Straight-line depreciation schedule', syntax: ['d = depstln(cost,salvage,life)'], seealso: ['depsoyd', 'deprdv'], description: ['Depreciation = depstln(Cost,Salvage,Life) computes the straight-line depreciation for an asset.'] },
    deprdv: { summary: 'Remaining depreciable value', syntax: ['rdv = deprdv(cost,salvage,accumdep)'], seealso: ['depstln', 'depsoyd'], description: ['Depreciation = deprdv(Cost,Salvage,Accum) computes the remaining depreciable value for an asset.'] },
    taxedrr: { summary: 'After-tax rate of return', syntax: ['r = taxedrr(pretax,taxrate)'], seealso: ['effrr', 'nomrr'], description: ['Return = taxedrr(PreTaxReturn,TaxRate) calculates the after-tax rate of return.'] },
    depsoyd: { summary: 'Sum of years digits depreciation', syntax: ['d = depsoyd(cost,salvage,life)'], seealso: ['depstln', 'deprdv'], description: ['Sum = depsoyd(Cost,Salvage,Life) computes the depreciation for an asset using the sum of years\' digits method.'] },
    portror: { summary: 'Portfolio expected rate of return', syntax: ['r = portror(returns,weights)'], seealso: ['portstats'], description: ['R = portror(Return,Weight) returns a 1-by-M vector for the expected rate of return.', 'Note', 'An alternative for portfolio optimization is to use the Portfolio object for mean-variance portfolio optimization. This object supports gross or net portfolio returns as the return proxy, the variance of portfolio returns as the risk proxy, and a portfolio set that is any combination of the specified constraints to form a portfolio set. For information on the workflow when using Portfolio objects, see Portfolio Object Workflow.'] },
    todecimal: { summary: 'Fractional to decimal conversion', syntax: ['d = todecimal(quote)', 'd = todecimal(quote,fraction)'], seealso: ['toquoted'], description: ['usddec = todecimal(quote) returns the decimal equivalent, usddec, of a security whose price is normally quoted as a whole number and a fraction (quote).', 'usddec = todecimal(___,fracpart) returns the decimal equivalent, usddec, of a security whose price is normally quoted as a whole number and a fraction (quote). fracpart indicates the fractional base (denominator) with which the security is normally quoted (default = 32).'] },
    toquoted: { summary: 'Decimal to fractional conversion', syntax: ['q = toquoted(decimal)', 'q = toquoted(decimal,fraction)'], seealso: ['todecimal'], description: ['quote = toquoted(usddec,fracpart) returns the fractional equivalent, quote, of the decimal figure, usddec, based on the fractional base (denominator), fracpart. The fractional bases are the ones used for quoting equity prices in the United States (denominator 2, 4, 8, 16, or 32). If fracpart is not entered, the denominator 32 is assumed.'] },
    thirtytwo2dec: { summary: 'Thirty-second quotation to decimal', syntax: ['d = thirtytwo2dec(n,fraction)'], seealso: ['todecimal'], description: ['OutNumber = thirtytwo2dec(InNumber,InFraction) changes the price quotation for a bond or bond future from a fraction with a denominator of 32 to a decimal.'] },
    corr2cov: { summary: 'Convert standard deviation and correlation to covariance', syntax: ['cov = corr2cov(sigma,corr)'], seealso: ['cov2corr', 'corrcoef'], description: ['ExpCovariance = corr2cov(ExpSigma) converts standard deviation and correlation to covariance.', 'ExpCovariance = corr2cov(___,ExpCorrC) specifies options using one or more optional arguments in addition to the input arguments in the previous syntax.'] },
    prmat: { summary: 'Price and accrued interest of a security paying interest at maturity', syntax: ['[price,ai] = prmat(settle,maturity,issue,face,coupon,yield)', '[price,ai] = prmat(...,basis)'], description: ['[price,ai] = prmat(settle,maturity,issue,face,coupon,yield) returns the price per $100 face value and the accrued interest of a security that pays all interest at maturity (no periodic coupons).', 'basis selects the day-count convention (default 0 = actual/actual).'], seealso: ['yldmat', 'prdisc', 'acrudisc'] },
    yldmat: { summary: 'Yield of a security paying interest at maturity', syntax: ['yld = yldmat(settle,maturity,issue,face,price,coupon)', 'yld = yldmat(...,basis)'], description: ['yld = yldmat(settle,maturity,issue,face,price,coupon) returns the yield of a security that pays all interest at maturity (no periodic coupons) given its price.'], seealso: ['prmat', 'ylddisc'] },
    days365: { summary: 'Days between dates on a 365-day year basis', syntax: ['d = days365(d1,d2)'], description: ['d = days365(d1,d2) returns the number of days between d1 and d2 based on an Act/365 convention (ignores leap years).'], seealso: ['daysact', 'days360', 'daysdif'] },
    prtbill: { summary: 'Price of Treasury bill from discount rate', syntax: ['Price = prtbill(Settle,Maturity,Discount)'], description: ['Price = prtbill(Settle,Maturity,Discount) returns the price per $100 face value of a Treasury bill given the settlement date, maturity date, and bank discount rate.'], seealso: ['yldtbill', 'beytbill', 'prdisc'] },
    yldtbill: { summary: 'Yield of Treasury bill from price', syntax: ['Yield = yldtbill(Settle,Maturity,Price)'], description: ['Yield = yldtbill(Settle,Maturity,Price) returns the money-market yield of a Treasury bill given its price per $100 face value.'], seealso: ['prtbill', 'beytbill', 'discrate'] },
    beytbill: { summary: 'Bond-equivalent yield of Treasury bill', syntax: ['BEY = beytbill(Settle,Maturity,Discount)'], description: ['BEY = beytbill(Settle,Maturity,Discount) converts a T-bill bank discount rate to bond-equivalent yield (semi-annual basis, actual/actual).'], seealso: ['prtbill', 'yldtbill', 'discrate'] },
    prdisc: { summary: 'Price of a discounted security', syntax: ['Price = prdisc(Settle,Maturity,Discount,Basis)'], description: ['Price = prdisc(Settle,Maturity,Discount,Basis) returns the price per $100 face value of a discounted (zero-coupon) security.'], seealso: ['fvdisc', 'discrate', 'prtbill'] },
    fvdisc: { summary: 'Future value of a discounted security', syntax: ['FutureVal = fvdisc(Settle,Maturity,Price,Basis)'], description: ['FutureVal = fvdisc(Settle,Maturity,Price,Basis) returns the future (redemption) value of a discounted security given its purchase price.'], seealso: ['prdisc', 'discrate'] },
    discrate: { summary: 'Bank discount rate of a security', syntax: ['Discount = discrate(Settle,Maturity,Price,Basis)'], description: ['Discount = discrate(Settle,Maturity,Price,Basis) returns the bank discount rate corresponding to the given price of a discounted security.'], seealso: ['prdisc', 'fvdisc', 'yldtbill'] },
    yeardays: { summary: 'Number of days in a year for a given day-count basis', syntax: ['Days = yeardays(Year)', 'Days = yeardays(Year,Basis)'], description: ['Days = yeardays(Year) returns 365 for a common year or 366 for a leap year.', 'Days = yeardays(Year,Basis) returns the day-count year length: basis 0 and 3 use actual days; basis 1, 2, 4 use 360.'], seealso: ['daysact', 'days360', 'days365', 'yearfrac'] },
    thirdwednesday: { summary: 'Beginning and end dates for LIBOR contracts (third Wednesdays)', syntax: ['[BeginDates,EndDates] = thirdwednesday(Month,Year)', '[BeginDates,EndDates] = thirdwednesday(Month,Year,outputType)'], description: ['[BeginDates,EndDates] = thirdwednesday(Month,Year) computes the beginning and end period dates for LIBOR contracts — the third Wednesdays of consecutive delivery months.', 'Month and Year can be scalars or vectors for multiple contracts.'], seealso: ['busdate', 'eomdate'] },
    juliandate: { summary: 'Julian date from calendar date', syntax: ['jd = juliandate(year,month,day)', 'jd = juliandate(year,month,day,hour,minute,second)'], description: ['jd = juliandate(year,month,day) returns the Julian date number — a continuous day count from noon on January 1, 4713 BC.', 'Optional hour, minute, second arguments add a fractional day component.'], seealso: ['datenum', 'datestr'] },
    weeknum: { summary: 'Week number of the year for a given date', syntax: ['w = weeknum(d)', 'w = weeknum(d,weekstart)'], description: ['w = weeknum(d) returns the ISO week number (1–53) for serial date d, with weeks starting on Sunday.', 'weekstart sets the starting weekday: 1=Sunday (default), 2=Monday.'], seealso: ['datenum', 'daysdif', 'eomdate'] },
    payadv: { summary: 'Periodic payment given a number of advance payments', syntax: ['Payment = payadv(Rate,NumPeriods,PresentValue,FutureValue,Advance)'], description: ['Payment = payadv(Rate,NumPeriods,PresentValue,FutureValue,Advance) computes the periodic payment when Advance payments are made at the start of the period.', 'Unlike payper (end-of-period), payadv accounts for the reduced effective borrowing period caused by upfront payments.'], seealso: ['payper', 'pvfix', 'fvfix'] },
    tbillyield2disc: { summary: 'Convert T-bill yield to bank discount rate', syntax: ['Discount = tbillyield2disc(Yield,Settle,Maturity)', 'Discount = tbillyield2disc(Yield,Settle,Maturity,Type)'], description: ['Discount = tbillyield2disc(Yield,Settle,Maturity) converts the money-market yield of a Treasury bill to its bank discount rate.', 'Type selects the yield convention: 0=money-market yield (default), 1=bond-equivalent yield.'], seealso: ['prtbill', 'yldtbill', 'beytbill'] },
    acrubond: { summary: 'Accrued interest of a bond with periodic interest payments', syntax: ['AccruInterest = acrubond(IssueDate,Settle,FirstCouponDate,Face,CouponRate)', 'AccruInterest = acrubond(___,Period,Basis)'], description: ['AccruInterest = acrubond(IssueDate,Settle,FirstCouponDate,Face,CouponRate) returns the accrued interest for a coupon bond from issue date to settlement.', 'Period is the number of coupon payments per year (default 2); Basis is the day-count convention (default 0 = actual/actual).'], seealso: ['bndprice', 'bndyield', 'days360', 'cfamounts'] },
    prcroc: { summary: 'Price rate-of-change technical indicator', syntax: ['PriceChangeRate = prcroc(Data)', 'PriceChangeRate = prcroc(Data,Name,Value)'], description: ['PriceChangeRate = prcroc(Data) calculates the price rate-of-change from closing prices, defined as (Price(t) - Price(t-n)) / Price(t-n) * 100.', 'Input Data can be a numeric vector, timetable, or table.'], seealso: ['rsindex', 'macd', 'volroc'] },
    abs2active: { summary: 'Transform absolute constraint matrix to active-weight format', syntax: ['ActiveConSet = abs2active(AbsConSet,Index)'], description: ['ActiveConSet = abs2active(AbsConSet,Index) transforms a constraint matrix expressed in absolute portfolio weights to an equivalent matrix in active weights (relative to benchmark Index).', 'Use this when the optimizer requires active-weight constraints but your constraints are in absolute terms.'], seealso: ['active2abs', 'pcalims', 'pcglims', 'portcons'] },
    active2abs: { summary: 'Transform active-weight constraint matrix to absolute format', syntax: ['AbsConSet = active2abs(ActiveConSet,Index)'], description: ['AbsConSet = active2abs(ActiveConSet,Index) transforms a constraint matrix expressed in active weights (relative to Index) back to absolute portfolio weight format.'], seealso: ['abs2active', 'pcalims', 'pcglims', 'portcons'] },
    bndprice: { summary: 'Price a fixed-income security from yield to maturity', syntax: ['[Price,AccruedInt] = bndprice(Yield,CouponRate,Settle,Maturity)', '[Price,AccruedInt] = bndprice(Yield,CouponRate,Settle,Maturity,Period,Basis)'], description: ['[Price,AccruedInt] = bndprice(Yield,CouponRate,Settle,Maturity) returns the clean price per $100 face value and the accrued interest of a coupon bond, given its yield to maturity.', 'For SIA conventions Price + AccruedInt = sum(CashFlow*(1+Yield/2)^(-Time)); ISMA bases use annual compounding. Period (default 2) is coupons per year, Basis (default 0 = actual/actual) the day-count, and Face (default 100) the face value.'], seealso: ['bndyield', 'bnddurp', 'bndconvp', 'cfamounts'] },
    bndyield: { summary: 'Yield to maturity of a fixed-income security from price', syntax: ['Yield = bndyield(Price,CouponRate,Settle,Maturity)', 'Yield = bndyield(Price,CouponRate,Settle,Maturity,Period,Basis)'], description: ['Yield = bndyield(Price,CouponRate,Settle,Maturity) returns the yield to maturity of a coupon bond given its clean price per $100 face value. The yield is found by inverting the bndprice relationship.'], seealso: ['bndprice', 'bnddury', 'bndconvy'] },
    bnddurp: { summary: 'Bond duration given price', syntax: ['[ModDuration,YearDuration,PerDuration] = bnddurp(Price,CouponRate,Settle,Maturity)', '[...] = bnddurp(Price,CouponRate,Settle,Maturity,Period,Basis)'], description: ['[ModDuration,YearDuration,PerDuration] = bnddurp(Price,CouponRate,Settle,Maturity) returns the modified, annualized (Macaulay) and periodic Macaulay durations of a coupon bond, computing the yield from Price first.'], seealso: ['bnddury', 'bndconvp', 'bndprice'] },
    bnddury: { summary: 'Bond duration given yield', syntax: ['[ModDuration,YearDuration,PerDuration] = bnddury(Yield,CouponRate,Settle,Maturity)', '[...] = bnddury(Yield,CouponRate,Settle,Maturity,Period,Basis)'], description: ['[ModDuration,YearDuration,PerDuration] = bnddury(Yield,CouponRate,Settle,Maturity) returns the modified, annualized (Macaulay) and periodic Macaulay durations of a coupon bond given its yield to maturity.'], seealso: ['bnddurp', 'bndconvy', 'bndyield'] },
    bndconvp: { summary: 'Bond convexity given price', syntax: ['[YearConvexity,PerConvexity] = bndconvp(Price,CouponRate,Settle,Maturity)', '[...] = bndconvp(Price,CouponRate,Settle,Maturity,Period,Basis)'], description: ['[YearConvexity,PerConvexity] = bndconvp(Price,CouponRate,Settle,Maturity) returns the annualized and periodic convexity of a coupon bond, computing the yield from Price first.'], seealso: ['bndconvy', 'bnddurp', 'bndprice'] },
    bndconvy: { summary: 'Bond convexity given yield', syntax: ['[YearConvexity,PerConvexity] = bndconvy(Yield,CouponRate,Settle,Maturity)', '[...] = bndconvy(Yield,CouponRate,Settle,Maturity,Period,Basis)'], description: ['[YearConvexity,PerConvexity] = bndconvy(Yield,CouponRate,Settle,Maturity) returns the annualized and periodic convexity of a coupon bond given its yield to maturity.'], seealso: ['bndconvp', 'bnddury', 'bndyield'] },
    ts2func: { summary: 'Convert a time series array to a function of time', syntax: ['F = ts2func(Array)', "F = ts2func(Array,'Times',TimeVector)"], description: ['F = ts2func(Array) encapsulates a time-series Array within a callable function F(t) suitable for Monte Carlo simulation. Rows of Array correspond to observation times (default 0,1,2,...).', "Calling F(t) performs zero-order-hold interpolation, returning the row at the largest observation time <= t as an NVARS-by-1 column vector. If t precedes the first time, F returns the first observation. Specify custom times with the 'Times' name/value pair."], seealso: ['interp1'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Financial Instruments Toolbox, extracted from fininst.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_FININST: Record<string, HelpEntry | string> = {
    intenvset: {
      summary: 'Set properties of interest-rate structure',
      syntax: [
        "RateSpec = intenvset('Rates',r,'StartDates',sd,'EndDates',ed)",
        "RateSpec = intenvset(___,'Basis',b,'Compounding',c)",
      ],
      description: [
        "intenvset builds a RateSpec structure from name-value pairs.",
        "Key fields: Rates (zero rates), StartDates, EndDates, Basis (day-count convention), Compounding (-1=continuous).",
      ],
      seealso: ['cfbyzero', 'intenvget'],
    },
    cfbyzero: {
      summary: 'Price cash flows from set of zero curves',
      syntax: [
        'Price = cfbyzero(RateSpec,CFlowAmounts,CFlowDates,Settle)',
        'Price = cfbyzero(___,Basis)',
      ],
      description: [
        'Price = cfbyzero(RateSpec,CFlowAmounts,CFlowDates,Settle) discounts cash flows CFlowAmounts at dates CFlowDates using the zero-curve in RateSpec.',
        'Settle is the pricing date as a MATLAB serial date number.',
      ],
      seealso: ['intenvset', 'intenvget'],
    },
    // QUARANTINED: bndfutprice help removed (see builtins comment).
    blsprice: {
      summary: 'Black-Scholes European option pricing',
      syntax: [
        '[Call,Put] = blsprice(S0,K,r,T,sigma)',
        '[Call,Put] = blsprice(S0,K,r,T,sigma,q)',
      ],
      description: [
        '[Call,Put] = blsprice(S0,K,r,T,sigma) computes European call and put prices using the Black-Scholes formula.',
        'S0: current price; K: strike; r: risk-free rate; T: time to expiry; sigma: volatility; q: continuous dividend yield (default 0).',
      ],
      seealso: ['blsdelta', 'blsgamma', 'blstheta', 'blsvega', 'blsimpv'],
    },
    blsdelta: {
      summary: 'Black-Scholes delta of options',
      syntax: ['[CallDelta,PutDelta] = blsdelta(S0,K,r,T,sigma)', '[CallDelta,PutDelta] = blsdelta(S0,K,r,T,sigma,q)'],
      seealso: ['blsprice', 'blsgamma'],
    },
    blsgamma: {
      summary: 'Black-Scholes gamma of options',
      syntax: ['Gamma = blsgamma(S0,K,r,T,sigma)', 'Gamma = blsgamma(S0,K,r,T,sigma,q)'],
      seealso: ['blsprice', 'blsdelta', 'blsvega'],
    },
    blstheta: {
      summary: 'Black-Scholes theta of options',
      syntax: ['[CallTheta,PutTheta] = blstheta(S0,K,r,T,sigma)', '[CallTheta,PutTheta] = blstheta(S0,K,r,T,sigma,q)'],
      seealso: ['blsprice', 'blsdelta'],
    },
    blsvega: {
      summary: 'Black-Scholes vega of options',
      syntax: ['Vega = blsvega(S0,K,r,T,sigma)', 'Vega = blsvega(S0,K,r,T,sigma,q)'],
      seealso: ['blsprice', 'blsgamma'],
    },
    blsimpv: {
      summary: 'Black-Scholes implied volatility',
      syntax: ['sigma = blsimpv(S0,K,r,T,Price)', 'sigma = blsimpv(S0,K,r,T,Price,q)'],
      description: [
        'sigma = blsimpv(S0,K,r,T,Price) finds the implied volatility that makes the Black-Scholes call price equal to the market price.',
        'Uses bisection over the volatility domain [1e-6, 10].',
      ],
      seealso: ['blsprice', 'blsdelta'],
    },
    // QUARANTINED: asianbylevy / barrierbybls / lookbackbyls / intenvprice help removed
    //   (see builtins comment).
    intenvget: {
      summary: 'Properties of interest-rate structure',
      syntax: [
        'ParameterValue = intenvget(RateSpec,ParameterName)',
        "rates = intenvget(RateSpec,'Rates')",
      ],
      description: [
        "intenvget(RateSpec,'Rates') retrieves the zero rates from the RateSpec object built by intenvset.",
        'Field names are case-insensitive. Available fields: Rates, StartDates, EndDates, Basis, Compounding.',
      ],
      seealso: ['intenvset', 'cfbyzero'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Fixed-Point Designer, extracted from fixedpoint.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_FIXEDPOINT: Record<string, HelpEntry | string> = {
    fi: {
      summary: 'Fixed-point numeric object',
      syntax: [
        'a = fi(v)',
        'a = fi(v,isSigned)',
        'a = fi(v,isSigned,WordLength)',
        'a = fi(v,isSigned,WordLength,FractionLength)',
      ],
      description: [
        'a = fi(v) creates a fixed-point object with the value v quantized to a signed 16-bit 15-fraction-bit format.',
        'a = fi(v,s,wl,fl) specifies signedness, word length, and fraction length explicitly.',
        'The real-world value = stored_integer × 2^(-FractionLength).',
      ],
      seealso: ['numerictype', 'fimath', 'quantizer'],
    },
    numerictype: {
      summary: 'Data type and scaling attributes of fi object',
      syntax: [
        'T = numerictype',
        'T = numerictype(isSigned)',
        'T = numerictype(isSigned,WordLength)',
        'T = numerictype(isSigned,WordLength,FractionLength)',
      ],
      description: [
        'T = numerictype(isSigned,wl,fl) describes a fixed-point format.',
        'Fields: Signedness, WordLength, FractionLength.',
      ],
      seealso: ['fi', 'fimath'],
    },
    fimath: {
      summary: 'Define math properties for fi objects',
      syntax: [
        'F = fimath',
        "F = fimath('RoundingMethod','Nearest','OverflowAction','Saturate')",
      ],
      description: [
        'F = fimath creates a fimath object controlling rounding and overflow behavior for fi arithmetic.',
      ],
      seealso: ['fi', 'numerictype'],
    },
    quantizer: {
      summary: 'Quantizer object',
      syntax: [
        'q = quantizer',
        "q = quantizer('fixed',[wl fl])",
        "q = quantizer('Mode','fixed','Format',[wl fl],'RoundMode','nearest')",
      ],
      description: [
        'q = quantizer creates a quantizer object for fixed-point or floating-point quantization.',
        "Use quantize(q,x) to apply the quantizer to data x.",
      ],
      seealso: ['fi', 'quantize', 'num2bin'],
    },
    quantize: {
      summary: 'Quantize data with quantizer object',
      syntax: ['xq = quantize(q,x)'],
      description: ['xq = quantize(q,x) applies the quantizer q to data x, rounding and saturating as specified.'],
      seealso: ['quantizer', 'fi'],
    },
    num2bin: {
      summary: 'Convert fi or number to binary string',
      syntax: ['b = num2bin(a)'],
      description: ['b = num2bin(a) returns the two\'s-complement binary representation of the fi object a as a character string.'],
      seealso: ['bin2num', 'fi'],
    },
    bin2num: {
      summary: 'Convert binary string to number',
      syntax: ['x = bin2num(b)'],
      description: ['x = bin2num(b) converts the binary string b to an unsigned integer.'],
      seealso: ['num2bin', 'fi'],
    },
    fipref: {
      summary: 'Fixed-point preferences',
      syntax: ['p = fipref', 'p = fipref(Name,Value)'],
      description: ['p = fipref returns the current fixed-point preferences object controlling display format and logging.'],
      seealso: ['fi', 'fimath'],
    },
    fixdt: {
      summary: 'Create Simulink fixed-point data type',
      syntax: ['T = fixdt(isSigned,wl,fl)', 'T = fixdt(isSigned,wl,slope,bias)'],
      description: ['T = fixdt(isSigned,wl,fl) returns a numerictype for use in Simulink block data-type parameters.'],
      seealso: ['numerictype', 'fi'],
    },
    accumneg: {
      summary: 'Subtract two fi objects or values',
      syntax: [
        'c = accumneg(a,b)',
        "c = accumneg(a,b,RoundingMethod)",
        "c = accumneg(a,b,RoundingMethod,OverflowAction)",
      ],
      description: [
        'c = accumneg(a,b) computes a - b and quantizes the result to the fixed-point format of a.',
        'RoundingMethod: "nearest" (default), "floor", "ceil", "zero".',
        'OverflowAction: "saturate" (default), "wrap".',
      ],
      seealso: ['fi', 'fimath', 'quantize'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Sensor Fusion and Tracking Toolbox, extracted from fusion.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_FUSION: Record<string, HelpEntry | string> = {
    assignmunkres: {
      summary: 'Munkres global nearest neighbor assignment algorithm',
      syntax: ['[assignments,unassignedrows,unassignedcolumns] = assignmunkres(costmatrix,costofnonassignment)'],
      description: [
        'assignmunkres(C,gate) solves the optimal assignment problem: minimise sum C(i,j) for assigned pairs.',
        'Pairs with cost > gate are left unassigned.',
        'Returns an Nx2 matrix of [rowIdx, colIdx] assignments, plus row and column indices of unassigned detections.',
      ],
      seealso: ['assignauction', 'assignjv', 'assignsd'],
    },
    assignauction: {
      summary: 'Assignment using auction global nearest neighbor algorithm',
      syntax: ['[assignments,unassignedrows,unassignedcolumns] = assignauction(costmatrix,costofnonassignment)'],
      description: ['assignauction solves the same assignment problem as assignmunkres using the auction algorithm (Bertsekas). Same interface.'],
      seealso: ['assignmunkres', 'assignjv'],
    },
    assignjv: {
      summary: 'Jonker-Volgenant global nearest neighbor assignment algorithm',
      syntax: ['[assignments,unassignedrows,unassignedcolumns] = assignjv(costmatrix,costofnonassignment)'],
      description: ['assignjv uses the Jonker-Volgenant method to solve the assignment problem. Typically faster than Munkres for large cost matrices.'],
      seealso: ['assignmunkres', 'assignauction'],
    },
    allanvar: {
      summary: 'Allan variance',
      syntax: ['[avar,tau] = allanvar(Omega)', '[avar,tau] = allanvar(Omega,m)'],
      description: [
        '[avar,tau] = allanvar(Omega) estimates the Allan variance of the time series Omega at multiple averaging intervals.',
        'tau is the vector of averaging times; avar is the corresponding Allan variance estimate.',
      ],
      seealso: ['allandev'],
    },
    constvel: {
      summary: 'State transition function for constant-velocity motion model',
      syntax: ['predictedState = constvel(state)', 'predictedState = constvel(state,dt)'],
      description: [
        'constvel(state) predicts the next state for a constant-velocity model with dt=1.',
        'State format: [x, vx, y, vy] (or extended with z, vz).',
      ],
      seealso: ['constacc', 'constturn', 'constveljac'],
    },
    constacc: {
      summary: 'State transition function for constant-acceleration motion model',
      syntax: ['predictedState = constacc(state)', 'predictedState = constacc(state,dt)'],
      description: [
        'constacc(state) predicts the next state for a constant-acceleration model.',
        'State format: [x, vx, ax, y, vy, ay].',
      ],
      seealso: ['constvel', 'constturn', 'constaccjac'],
    },
    constturn: {
      summary: 'State transition function for constant turn-rate motion model',
      syntax: ['predictedState = constturn(state)', 'predictedState = constturn(state,dt)'],
      description: [
        'constturn(state) predicts the next state for a coordinated-turn model.',
        'State format: [x, vx, y, vy, omega] where omega is the yaw rate (rad/s).',
      ],
      seealso: ['constvel', 'constacc', 'constturnjac'],
    },
    cameas: {
      summary: 'Measurement function for constant-acceleration motion model',
      syntax: ['measurement = cameas(state)', 'measurement = cameas(state,frame)'],
      description: ['cameas(state) returns the [x;y;z] position from the CA state vector [x,vx,ax,y,vy,ay,z,vz,az]; missing axes report 0.'],
      seealso: ['constacc', 'cameasjac'],
    },
    constveljac: { summary: 'Jacobian of constant-velocity state transition',
      syntax: ['dfdx = constveljac(state)', 'dfdx = constveljac(state,dt)'],
      seealso: ['constvel'], description: ['Jx = constveljac(state) returns the Jacobian of the state transition function based on the constant-velocity motion model. The default time step is 1 second. By default, constveljac returns the Jacobian Jx with respect to the input state, state.', 'Jx = constveljac(state,dt) specifies the time step, dt.', '[Jx,Jw] = constveljac(state,w,dt) specifies the state noise, w, and returns the Jacobian, Jw, of the state with respect to the noise.'] },
    constaccjac: { summary: 'Jacobian of constant-acceleration state transition',
      syntax: ['dfdx = constaccjac(state)', 'dfdx = constaccjac(state,dt)'],
      seealso: ['constacc'], description: ['Jx = constaccjac(state) returns the Jacobian of the state transition function based on the constant-acceleration motion model. The default time step is 1 second. By default, constaccjac returns the Jacobian Jx with respect to the input state, state.', 'Jx = constaccjac(state,dt) also specifies the time step, dt.', '[Jx,Jw] = constaccjac(state,w,dt) specifies the state noise, w, and returns the Jacobian, Jw, of the state with respect to the noise.'] },
    constturnjac: { summary: 'Jacobian of constant turn-rate state transition',
      syntax: ['dfdx = constturnjac(state)', 'dfdx = constturnjac(state,dt)'],
      seealso: ['constturn'], description: ['Jx = constturnjac(state) returns the Jacobian of the state transition function based on the constant turn-rate and velocity-magnitude motion model. The default time step is 1 second. By default, constturnjac returns the Jacobian Jx with respect to the input state, state. Constant turn-rate mean that motion in the _xy_ -plane follows a constant angular velocity and motion in the vertical _z_ directions follows a constant velocity model.', 'Note', 'constturnjac represents velocity in the _xy_ -plane with its Cartesian components, Vx and Vy. For the constant turn-rate and velocity-magnitude motion model using velocity magnitude and direction, see ctrvjac.', 'Jx = constturnjac(state,dt) specifies the time step, dt.', '[Jx,Jw] = constturnjac(state,w,dt) also specifies noise, w, and returns the Jacobian, Jw, of the state transition function with respect to the noise.'] },
    cameasjac: { summary: 'Jacobian of constant-acceleration measurement function',
      syntax: ['dhdx = cameasjac(state)'],
      seealso: ['cameas', 'constacc'], description: ['measurementjac = cameasjac(state) the Jacobian of the measurement function, measurementjac, based on the constant-acceleration motion model. The state argument specifies the current state.', 'measurementjac = cameasjac(state,frame) also specifies the measurement coordinate system, frame.', 'measurementjac = cameasjac(state,frame,sensorpos) also specifies the sensor position, sensorpos.', 'measurementjac = cameasjac(state,frame,sensorpos,sensorvel) also specifies the sensor velocity, sensorvel.', 'measurementjac = cameasjac(state,frame,sensorpos,sensorvel,laxes) also specifies the local sensor axes orientation, laxes.'] },
    // QUARANTINED: compassangle, accelcal — help entries removed with their builtins.
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Fuzzy Logic Toolbox, extracted from fuzzy.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_FUZZY: Record<string, HelpEntry | string> = {
    trimf: { summary: 'Triangular membership function', syntax: ['y = trimf(x,params)'], description: ['y = trimf(x,[a b c]) returns the degree of membership of x in a triangular fuzzy set with feet at a and c and peak at b.'], seealso: ['trapmf', 'gaussmf', 'gbellmf'] },
    trapmf: { summary: 'Trapezoidal membership function', syntax: ['y = trapmf(x,params)'], description: ['y = trapmf(x,[a b c d]) returns the degree of membership of x in a trapezoidal fuzzy set defined by parameters a <= b <= c <= d.', 'The membership is 0 for x<a or x>d, rises linearly from a to b, is 1 for b<=x<=c, and falls linearly from c to d.'], seealso: ['trimf', 'gaussmf', 'pimf'] },
    gaussmf: { summary: 'Gaussian membership function', syntax: ['y = gaussmf(x,params)'], description: ['y = gaussmf(x,[sigma c]) returns membership values using a Gaussian curve centered at c with spread sigma.'], seealso: ['gauss2mf', 'gbellmf', 'trimf'] },
    gauss2mf: { summary: 'Two-sided Gaussian membership function', syntax: ['y = gauss2mf(x,params)'], description: ['y = gauss2mf(x,[sig1 c1 sig2 c2]) combines two Gaussian curves: the left side uses sig1 and c1 (for x<=c1), the right side uses sig2 and c2 (for x>=c2).', 'This creates an asymmetric bell shape useful for modeling asymmetric fuzzy sets.'], seealso: ['gaussmf', 'gbellmf', 'sigmf'] },
    gbellmf: { summary: 'Generalized bell-shaped membership function', syntax: ['y = gbellmf(x,params)'], description: ['y = gbellmf(x,[a b c]) computes the generalized bell MF 1/(1+|(x-c)/a|^(2b)).'], seealso: ['gaussmf', 'trimf', 'trapmf'] },
    sigmf: { summary: 'Sigmoidal membership function', syntax: ['y = sigmf(x,params)'], description: ['y = sigmf(x,[a c]) returns 1/(1+exp(-a*(x-c))).', 'The parameter a controls the slope and c sets the crossover point where sigmf equals 0.5.'], seealso: ['dsigmf', 'psigmf', 'smf'] },
    dsigmf: { summary: 'Difference of two sigmoidal membership functions', syntax: ['y = dsigmf(x,params)'], description: ['y = dsigmf(x,[a1 c1 a2 c2]) returns sigmf(x,[a1,c1]) - sigmf(x,[a2,c2]).'], seealso: ['sigmf', 'psigmf', 'smf'] },
    psigmf: { summary: 'Product of two sigmoidal membership functions', syntax: ['y = psigmf(x,params)'], description: ['y = psigmf(x,[a1 c1 a2 c2]) returns sigmf(x,[a1,c1]) .* sigmf(x,[a2,c2]).', 'By choosing a1>0 and a2<0 with c1<c2, the result is a bell-shaped MF.'], seealso: ['sigmf', 'dsigmf', 'gauss2mf'] },
    zmf: { summary: 'Z-shaped membership function', syntax: ['y = zmf(x,params)'], description: ['y = zmf(x,[a b]) returns a spline-based Z-shaped curve with value 1 for x<=a and 0 for x>=b.'], seealso: ['smf', 'pimf', 'trapmf'] },
    smf: { summary: 'S-shaped membership function', syntax: ['y = smf(x,params)'], description: ['y = smf(x,[a b]) returns a spline-based S-shaped curve with value 0 for x<=a and 1 for x>=b.', 'It is the complement of zmf and useful for high-valued membership regions.'], seealso: ['zmf', 'pimf', 'sigmf'] },
    pimf: { summary: 'Pi-shaped membership function', syntax: ['y = pimf(x,params)'], description: ['y = pimf(x,[a b c d]) returns a bell-shaped pi curve: rises as smf on [a,b], is 1 on [b,c], and falls as zmf on [c,d].', 'It is the product smf(x,[a,b]) .* zmf(x,[c,d]).'], seealso: ['smf', 'zmf', 'trapmf'] },
    defuzz: { summary: 'Defuzzify membership function to scalar', syntax: ['out = defuzz(x,mf,type)'], description: ["out = defuzz(x,mf,type) defuzzifies the fuzzy set defined by universe x and membership values mf using method type: 'centroid', 'bisector', 'mom', 'som', or 'lom'."], seealso: ['trimf', 'gaussmf', 'evalfis'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Global Optimization Toolbox, extracted from gads.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_GADS: Record<string, HelpEntry | string> = {
    ga: {
      summary: 'Find minimum of function using genetic algorithm',
      syntax: [
        'x = ga(fun,nvars)',
        'x = ga(fun,nvars,A,b)',
        'x = ga(fun,nvars,A,b,Aeq,beq,lb,ub)',
        '[x,fval,exitflag,output] = ga(___)',
      ],
      description: [
        'x = ga(fun,nvars) minimises fun with nvars decision variables using a real-coded genetic algorithm.',
        'Bounds lb/ub clip the initial population and offspring. Linear constraints A*x<=b and Aeq*x==beq are handled by penalisation in this implementation.',
        'Returns optimal x, objective fval, exitflag (0=iteration limit), and output struct iteration count.',
      ],
      seealso: ['gamultiobj', 'simulannealbnd', 'patternsearch', 'particleswarm'],
    },
    simulannealbnd: {
      summary: 'Find minimum of function using simulated annealing algorithm',
      syntax: [
        'x = simulannealbnd(fun,x0)',
        'x = simulannealbnd(fun,x0,lb,ub)',
        'x = simulannealbnd(fun,x0,lb,ub,options)',
        '[x,fval,exitflag,output] = simulannealbnd(___)',
      ],
      description: [
        'x = simulannealbnd(fun,x0) minimises fun starting from x0 using simulated annealing.',
        'Temperature decreases geometrically; a candidate move is accepted if it reduces f or with Boltzmann probability exp(-Delta/T).',
        'lb and ub bound the search space.',
      ],
      seealso: ['ga', 'patternsearch', 'particleswarm'],
    },
    patternsearch: {
      summary: 'Find minimum of function using pattern search',
      syntax: [
        'x = patternsearch(fun,x0)',
        'x = patternsearch(fun,x0,A,b)',
        'x = patternsearch(fun,x0,A,b,Aeq,beq,lb,ub)',
        '[x,fval,exitflag,output] = patternsearch(___)',
      ],
      description: [
        'x = patternsearch(fun,x0) minimises fun using a poll-and-search pattern approach.',
        'At each iteration, the current mesh is polled along ±ei directions; if no improvement is found the mesh size halves.',
      ],
      seealso: ['ga', 'simulannealbnd', 'particleswarm'],
    },
    particleswarm: {
      summary: 'Particle swarm optimization',
      syntax: [
        'x = particleswarm(fun,nvars)',
        'x = particleswarm(fun,nvars,lb,ub)',
        'x = particleswarm(fun,nvars,lb,ub,options)',
        '[x,fval,exitflag,output] = particleswarm(___)',
      ],
      description: [
        'x = particleswarm(fun,nvars) minimises fun over nvars variables using particle swarm.',
        'Each particle tracks its personal best and the global best; velocity is updated with inertia weight W=0.729 and acceleration coefficients C1=C2=1.494.',
      ],
      seealso: ['ga', 'simulannealbnd', 'patternsearch'],
    },
    gamultiobj: {
      summary: 'Find Pareto front using multiobjective genetic algorithm',
      syntax: [
        'x = gamultiobj(fun,nvars)',
        'x = gamultiobj(fun,nvars,A,b,Aeq,beq,lb,ub)',
        '[x,fval,exitflag] = gamultiobj(___)',
      ],
      description: [
        'x = gamultiobj(fun,nvars) finds the Pareto front of a multiobjective function using an NSGA-II-style genetic algorithm.',
        'fun must return a row vector of objective values.',
        'Returns x (nPareto×nvars) and fval (nPareto×nObj) for all non-dominated solutions.',
      ],
      seealso: ['ga', 'paretosearch', 'particleswarm'],
    },
    paretosearch: { summary: 'Find Pareto front using pattern search',
      syntax: ['x = paretosearch(fun,nvars)', '[x,fval] = paretosearch(fun,nvars,A,b,Aeq,beq,lb,ub)'],
      seealso: ['gamultiobj', 'ga'], description: ['x = paretosearch(fun,nvars) finds nondominated points of the multiobjective function fun. The nvars argument is the dimension of the optimization problem (number of decision variables).', 'x = paretosearch(fun,nvars,A,b) finds nondominated points subject to the linear inequalities A*x ≤ b. See Linear Inequality Constraints.', 'x = paretosearch(fun,nvars,A,b,Aeq,beq) finds nondominated points subject to the linear constraints Aeqx = beq and Ax ≤ b. If no linear inequalities exist, set A = [] and b = [].', 'x = paretosearch(fun,nvars,A,b,Aeq,beq,lb,ub) defines a set of lower and upper bounds on the design variables in x, so that x is always in the range lb ≤ x ≤ ub. If no linear equalities exist, set Aeq = [] and beq = []. If x(i) has no lower bound, set lb(i) = -Inf. If x(i) has no upper bound, set ub(i) = Inf.', 'x = paretosearch(fun,nvars,A,b,Aeq,beq,lb,ub,nonlcon) applies the nonlinear inequalities ineqnonlin(x) defined in nonlcon. The paretosearch function finds nondominated points such that ineqnonlin(x) ≤ 0. If no bounds exist, set lb = [], ub = [], or both.'] },
    surrogateopt: { summary: 'Surrogate optimization for global minimum',
      syntax: ['x = surrogateopt(fun,lb,ub)', '[x,fval,exitflag,output] = surrogateopt(___)'],
      seealso: ['ga', 'patternsearch'], description: ['surrogateopt is a global solver for time-consuming objective functions.', 'surrogateopt attempts to solve problems of the form', 'minxf(x) such that ⎧⎪⎪⎪⎨⎪⎪⎪⎩lb≤x≤ubA·x≤bAeq·x=beqineqnonlin(x)≤0xi integer, i∈intcon.', 'The solver searches for the global minimum of a real-valued objective function in multiple dimensions, subject to bounds, optional linear constraints, optional integer constraints, and optional nonlinear inequality constraints. surrogateopt is best suited to objective functions that take a long time to evaluate. The objective function can be nonsmooth. The solver requires finite bounds on all variables. The solver can optionally maintain a checkpoint file to enable recovery from crashes or partial execution, or optimization continuation after meeting a stopping condition. The objective function _f_(_x_) can be empty ([]), in which case surrogateopt attempts to find a point satisfying all the constraints.', 'x = surrogateopt(objconstr,lb,ub) searches for a global minimum of objconstr(x) in the region lb <= x <= ub. If objconstr(x) returns a structure, then surrogateopt searches for a minimum of objconstr(x).Fval, subject to objconstr(x).Ineq <= 0.'] },
    globalsearch: { summary: 'Find global minimum using GlobalSearch solver',
      syntax: ['gs = GlobalSearch', 'gs = GlobalSearch(Name,Value)', '[x,fval] = run(gs,problem)'],
      seealso: ['MultiStart', 'fmincon'], description: ['A GlobalSearch object contains properties (options) that affect how run repeatedly runs a local solver to generate a GlobalOptimSolution object. When run, the solver attempts to locate a solution that has the lowest objective function value.'] },
    multistart: { summary: 'Find multiple local minima',
      syntax: ['ms = MultiStart', '[x,fval] = run(ms,problem,k)'],
      seealso: ['GlobalSearch', 'fmincon'], description: ['A MultiStart object contains properties (options) that affect how run repeatedly runs a local solver to generate a GlobalOptimSolution object. When run, the solver attempts to find multiple local solutions to a problem by starting from various points.'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the System Identification Toolbox, extracted from ident.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_IDENT: Record<string, HelpEntry | string> = {
    arx: {
      summary: 'Estimate parameters of ARX, ARIX, AR, or ARI model',
      syntax: [
        'sys = arx(tt,[na nb nk])',
        'sys = arx(u,y,[na nb nk])',
        'sys = arx(data,[na nb nk])',
      ],
      description: [
        'sys = arx(u,y,[na nb nk]) fits an ARX model A(q)y(t) = B(q)u(t-nk) + e(t) to the I/O data using least squares.',
        'na, nb are the A and B polynomial orders; nk is the input delay.',
        'Returns an idpoly object with fields A, B, na, nb, nk, Ts.',
      ],
      seealso: ['armax', 'n4sid', 'tfest', 'arxstruc'],
    },
    armax: {
      summary: 'Estimate parameters of ARMAX, ARIMAX, ARMA, or ARIMA model using time-domain data',
      syntax: [
        'sys = armax(tt,[na nb nc nk])',
        'sys = armax(u,y,[na nb nc nk])',
        'sys = armax(data,[na nb nc nk])',
      ],
      description: [
        'sys = armax(u,y,[na nb nc nk]) fits an ARMAX model A(q)y(t) = B(q)u(t-nk) + C(q)e(t).',
        'nc is the order of the moving-average noise polynomial C.',
      ],
      seealso: ['arx', 'bj', 'n4sid', 'tfest'],
    },
    // QUARANTINED help entries (n4sid, ssest, tfest) removed — see function comments.
    compare: {
      summary: 'Compare identified model output with measured output',
      syntax: [
        'compare(data,sys)',
        'compare(data,sys1,...,sysN)',
        '[ysim,fit] = compare(data,sys)',
      ],
      description: [
        'compare(data,sys) simulates sys on the same input as data and computes the fit percentage.',
        'fit = 100*(1 - norm(y-yhat)/norm(y-mean(y)))',
      ],
      seealso: ['predict', 'sim', 'arx', 'tfest'],
    },
    bj: {
      summary: 'Estimate parameters of Box-Jenkins model',
      syntax: ['sys = bj(u,y,[nb nc nd nf nk])'],
      description: [
        'sys = bj(u,y,[nb nc nd nf nk]) fits a Box-Jenkins model B(q)/F(q) u + C(q)/D(q) e.',
        'This implementation uses an ARMAX approximation.',
      ],
      seealso: ['armax', 'arx', 'n4sid'],
    },
    ar: {
      summary: 'Estimate parameters of AR, ARI, or ARX model',
      syntax: ['sys = ar(y,na)', 'sys = ar(y,na,approach)'],
      description: [
        'sys = ar(y,na) fits an autoregressive model A(q)y(t)=e(t) of order na to time series y.',
      ],
      seealso: ['arx', 'armax'],
    },
    arxstruc: {
      summary: 'Loss functions for ARX structure selection',
      syntax: ['v = arxstruc(u,y,nn)', 'v = arxstruc(data,nn)'],
      description: [
        'v = arxstruc(u,y,nn) returns the prediction error loss for the ARX structure nn=[na nb nk].',
      ],
      seealso: ['arx', 'selstruc'],
    },
    // QUARANTINED help entry (spa) removed — see function comment.
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Image Processing Toolbox, extracted from images.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_IMAGES: Record<string, HelpEntry | string> = {
    ind2rgb: { summary: 'Converts the indexed image X and corresponding colormap map to RGB (truecolor) format.', syntax: ['RGB = ind2rgb(X,map)'], seealso: ['image', 'imread', 'rgb2ind'], description: ['RGB = ind2rgb(X,map) converts the indexed image X and corresponding colormap map to RGB (truecolor) format.'] },
    measerr: { summary: 'Approximation quality metrics (PSNR, MSE, max error, L2 ratio)', syntax: ['[psnr,mse,maxerr,L2rat] = measerr(X,Xapp)', '[...] = measerr(X,Xapp,Bps)'], seealso: ['psnr', 'immse'] },
    rgb2ntsc: { summary: 'Converts the red, green, and blue values of an RGB image to luminance (Y) and chrominance (I and Q) values of an NTSC image.', syntax: ['YIQ = rgb2ntsc(RGB)'], seealso: ['ntsc2rgb', 'rgb2ycbcr', 'rgb2lab', 'rgb2xyz', 'rgb2hsv'], description: ['YIQ = rgb2ntsc(RGB) converts the red, green, and blue values of an RGB image to luminance (_Y_) and chrominance (_I_ and _Q_) values of an NTSC image.'] },
    xyz2lab: { summary: 'Converts CIE 1931 XYZ values (2° observer) to CIE 1976 L*a*b* values.', syntax: ['lab = xyz2lab(xyz)', 'lab = xyz2lab(xyz,\'WhitePoint\',whitePoint)'], seealso: ['rgb2lab', 'xyz2rgb', 'lab2xyz'], description: ['lab = xyz2lab(xyz) converts CIE 1931 XYZ values (2° observer) to CIE 1976 Lab* values.'] },
    rgb2xyz: { summary: 'Converts the red, green, and blue values of an sRGB image to CIE 1931 XYZ values (2° observer).', syntax: ['XYZ = rgb2xyz(RGB)', 'XYZ = rgb2xyz(RGB,Name=Value)'], seealso: ['xyz2rgb', 'rgb2lab', 'lab2xyz', 'lin2rgb', 'rgbwide2xyz'], description: ['XYZ = rgb2xyz(RGB) converts the red, green, and blue values of an sRGB image to CIE 1931 XYZ values (2° observer).'] },
    rgb2lab: { summary: 'Converts sRGB values to CIE 1976 L*a*b* values.', syntax: ['lab = rgb2lab(RGB)', 'lab = rgb2lab(RGB,Name=Value)'], seealso: ['rgb2xyz', 'lab2rgb', 'xyz2lab'], description: ['lab = rgb2lab(RGB) converts sRGB values to CIE 1976 Lab* values.'] },
    im2double: { summary: 'Converts the image I to double precision.', syntax: ['I2 = im2double(I)', 'I2 = im2double(I,"indexed")'], seealso: ['double', 'im2single', 'im2int16', 'im2uint8', 'im2uint16'], description: ['I2 = im2double(I) converts the image I to double precision. I can be a grayscale intensity image, a truecolor image, or a binary image. im2double rescales the output from integer data types to the range [0, 1].'] },
    mat2gray: { summary: 'Converts the matrix A to a grayscale image I that contains values in the range 0 (black) to 1 (white).', syntax: ['I = mat2gray(A,[amin amax])', 'I = mat2gray(A)'], seealso: ['rescale', 'gray2ind', 'ind2gray', 'im2gray'], description: ['I = mat2gray(A,[amin amax]) converts the matrix A to a grayscale image I that contains values in the range 0 (black) to 1 (white). amin and amax are the values in A that correspond to 0 and 1 in I. Values less than amin are clipped to 0, and values greater than amax are clipped to 1.'] },
    graythresh: { summary: 'Computes a global threshold T from grayscale image I, using Otsu\'s method [1].', syntax: ['T = graythresh(I)'], seealso: ['imbinarize', 'imquantize', 'multithresh', 'rgb2ind'], description: ['T = graythresh(I) computes a global threshold T from grayscale image I, using Otsu\'s method . Otsu\'s method chooses a threshold that minimizes the intraclass variance of the thresholded black and white pixels. The global threshold T can be used with imbinarize to convert a grayscale image to a binary image.'] },
    rgb2ycbcr: { summary: 'Converts the red, green, and blue values of an RGB image to luminance (Y) and chrominance (Cb and Cr) values of a YCbCr image.', syntax: ['YCBCR = rgb2ycbcr(RGB)'], seealso: ['rgb2lab', 'rgb2xyz', 'rgb2ntsc', 'ycbcr2rgb', 'rgbwide2ycbcr'], description: ['YCBCR = rgb2ycbcr(RGB) converts the red, green, and blue values of an RGB image to luminance (_Y_) and chrominance (_Cb_ and _Cr_) values of a YCbCr image.'] },
    fspecial: { summary: 'Creates a two-dimensional filter h of the specified type.', syntax: ['h = fspecial(type)', 'h = fspecial("average",hsize)'], seealso: ['conv2', 'del2', 'edge', 'imsharpen', 'imfilter'], description: ['h = fspecial(type) creates a two-dimensional filter h of the specified type. Some of the filter types have optional additional parameters, shown in the following syntaxes. fspecial returns h as a correlation kernel, which is the appropriate form to use with imfilter.'] },
    stretchlim: { summary: 'Computes the lower and upper limits that can be used for contrast stretching grayscale or RGB image I.', syntax: ['lowhigh = stretchlim(I)', 'lowhigh = stretchlim(I,Tol)'], seealso: ['brighten', 'decorrstretch', 'histeq', 'imadjust'], description: ['lowhigh = stretchlim(I) computes the lower and upper limits that can be used for contrast stretching grayscale or RGB image I. The limits are returned in lowhigh. By default, the limits specify the bottom 1% and the top 1% of all pixel values.'] },
    im2single: { summary: 'Converts the grayscale, RGB, or binary image I to data type single, rescaling or offsetting the data as necessary.', syntax: ['J = im2single(I)', 'J = im2single(I,"indexed")'], seealso: ['im2double', 'im2int16', 'im2uint8', 'im2uint16', 'single'], description: ['J = im2single(I) converts the grayscale, RGB, or binary image I to data type single, rescaling or offsetting the data as necessary.'] },
    integralImage: { summary: 'Compute 2-D integral image (summed area table)', syntax: ['intImg = integralImage(I)'], seealso: ['integralBoxFilter'], description: ['In an _integral image_ , each pixel represents the cumulative sum of a corresponding input pixel with all pixels above and to the left of the input pixel.'] },
    integralBoxFilter: { summary: 'Box filtering using integral image', syntax: ['J = integralBoxFilter(intImg,[m n])'], seealso: ['integralImage', 'imfilter'], description: ['B = integralBoxFilter(A) filters the integral image A with a 3-by-3 box filter.'] },
    padarray: { summary: 'Pads array A with an amount of padding in each dimension specified by padsize.', syntax: ['B = padarray(A,padsize)', 'B = padarray(A,padsize,padval)'], seealso: ['circshift', 'imfilter', 'paddata'], description: ['B = padarray(A,padsize) pads array A with an amount of padding in each dimension specified by padsize. The padarray function pads numeric or logical images with the value 0 and categorical images with the category <undefined>. By default, paddarray adds padding before the first element and after the last element of each dimension.'] },
    regionprops: { summary: 'The regionprops function measures properties such as area, centroid, and bounding box, for each object (connected component) in an image.', syntax: ['stats = regionprops(BW,properties)', 'stats = regionprops(CC,properties)'], seealso: ['regionprops3', 'bwpropfilt', 'bwconncomp', 'bwferet', 'watershed'], description: ['The regionprops function measures properties such as area, centroid, and bounding box, for each object (connected component) in an image. regionprops supports both contiguous regions and discontiguous regions.'] },
    bwlabel: { summary: 'Returns the label matrix L that contains labels for the 8-connected objects found in BW.', syntax: ['L = bwlabel(BW)', 'L = bwlabel(BW,conn)'], seealso: ['bwconncomp', 'bwlabeln', 'bwselect', 'labelmatrix', 'label2rgb'], description: ['L = bwlabel(BW) returns the label matrix L that contains labels for the 8-connected objects found in BW.'] },
    imerode: { summary: 'Erodes the grayscale, binary, or packed binary image I using the structuring element SE.', syntax: ['J = imerode(I,SE)', 'J = imerode(I,nhood)'], seealso: ['bwpack', 'bwunpack', 'conv2', 'filter2', 'imclose'], description: ['J = imerode(I,SE) erodes the grayscale, binary, or packed binary image I using the structuring element SE.'] },
    imdilate: { summary: 'Dilates the grayscale, binary, or packed binary image I using the structuring element SE.', syntax: ['J = imdilate(I,SE)', 'J = imdilate(I,nhood)'], seealso: ['bwpack', 'bwunpack', 'conv2', 'filter2', 'imclose'], description: ['J = imdilate(I,SE) dilates the grayscale, binary, or packed binary image I using the structuring element SE.'] },
    imopen: { summary: 'Performs morphological opening on the grayscale or binary image I using the structuring element SE.', syntax: ['J = imopen(I,SE)', 'J = imopen(I,nhood)'], seealso: ['imclose', 'imdilate', 'imerode'], description: ['J = imopen(I,SE) performs morphological opening on the grayscale or binary image I using the structuring element SE. The morphological opening operation is an erosion followed by a dilation, using the same structuring element for both operations.'] },
    imclose: { summary: 'Performs morphological closing on the grayscale or binary image I, using the structuring element SE.', syntax: ['J = imclose(I,SE)', 'J = imclose(I,nhood)'], seealso: ['imopen', 'imdilate', 'imerode'], description: ['J = imclose(I,SE) performs morphological closing on the grayscale or binary image I, using the structuring element SE. The morphological close operation is a dilation followed by an erosion, using the same structuring element for both operations.'] },
    imboxfilt: { summary: 'Filters image A with a 2-D box filter of the given size (default 3).', syntax: ['B = imboxfilt(A)', 'B = imboxfilt(A,filterSize)'], seealso: ['imboxfilt3', 'imfilter', 'imgaussfilt', 'integralBoxFilter'], description: ['B = imboxfilt(A) filters image A with a 2-D, 3-by-3 box filter. A box filter is also called a mean filter.'] },
    imboxfilt3: { summary: 'Filters 3-D volumetric image A with a 3-D box filter of the given size (default 3).', syntax: ['B = imboxfilt3(A)', 'B = imboxfilt3(A,filterSize)'], seealso: ['imboxfilt', 'imgaussfilt3', 'integralBoxFilter3'], description: ['B = imboxfilt3(A) filters the 3-D image A with a 3-D box filter, 3-by-3-by-3 voxels in size.'] },
    imgaussfilt3: { summary: 'Filters 3-D volumetric image A with a 3-D Gaussian smoothing kernel with standard deviation sigma.', syntax: ['B = imgaussfilt3(A)', 'B = imgaussfilt3(A,sigma)'], seealso: ['imgaussfilt', 'imboxfilt3', 'imfilter'], description: ['B = imgaussfilt3(A) filters 3-D image A with a 3-D Gaussian smoothing kernel with standard deviation of 0.5, and returns the filtered image in B.'] },
    medfilt3: { summary: 'Performs median filtering of the 3-D image A in three dimensions. Default neighborhood is [3 3 3].', syntax: ['B = medfilt3(A)', 'B = medfilt3(A,[m n p])'], seealso: ['medfilt2', 'modefilt'], description: ['B = medfilt3(A) filters the 3-D image A with a 3-by-3-by-3 filter. By default, medfilt3 pads the image by replicating the values in a mirrored way at the borders.'] },
    modefilt: { summary: 'Performs mode filtering on the 2-D or 3-D image A, returning the most frequent value in each neighborhood.', syntax: ['B = modefilt(A)', 'B = modefilt(A,filtSize)'], seealso: ['medfilt2', 'medfilt3', 'mode'], description: ['B = modefilt(A) performs mode filtering on the 2-D image or 3-D volume A. Each output pixel in B contains the mode (most frequently occurring value) in the neighborhood around the corresponding pixel in A. modefilt pads A by mirroring border elements.'] },
    stdfilt: { summary: 'Returns the array J, where each output pixel contains the standard deviation of the neighborhood around the corresponding pixel in input image I.', syntax: ['J = stdfilt(I)', 'J = stdfilt(I,nhood)'], seealso: ['std2', 'rangefilt', 'entropyfilt'], description: ['J = stdfilt(I) performs standard deviation filtering of image I and returns the filtered image J. The value of each output pixel is the standard deviation of the 3-by-3 neighborhood around the corresponding input pixel. For pixels on the borders of I, stdfilt uses symmetric padding. In symmetric padding, the values of padding pixels are a mirror reflection of the border pixels in I.'] },
    rangefilt: { summary: 'Returns the array J, where each output pixel contains the range (max - min) of the neighborhood around the corresponding pixel in input image I.', syntax: ['J = rangefilt(I)', 'J = rangefilt(I,nhood)'], seealso: ['stdfilt', 'entropyfilt'], description: ['J = rangefilt(I) returns the array J, where each output pixel contains the range value (maximum value − minimum value) of the 3-by-3 neighborhood around the corresponding pixel in the input image I.'] },
    entropyfilt: { summary: 'Returns the array J, where each output pixel contains the entropy value of the neighborhood around the corresponding pixel in input image I.', syntax: ['J = entropyfilt(I)', 'J = entropyfilt(I,nhood)'], seealso: ['entropy', 'rangefilt', 'stdfilt', 'imhist'], description: ['J = entropyfilt(I) returns the array J, where each output pixel contains the entropy value of the 9-by-9 neighborhood around the corresponding pixel in the input image I.'] },
    ssim: { summary: 'Computes the Structural Similarity Index (SSIM) value for image A using ref as the reference image.', syntax: ['ssimval = ssim(A,ref)', '[ssimval,ssimmap] = ssim(A,ref)'], seealso: ['immse', 'psnr', 'multissim'], description: ['ssimval = ssim(A,ref) calculates the structural similarity (SSIM) index for grayscale image or volume A using ref as the reference image or volume. A value closer to 1 indicates better image quality.'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Lidar Toolbox, extracted from lidar.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_LIDAR: Record<string, HelpEntry | string> = {
    pointCloud: {
      summary: 'Create a 3-D point cloud object',
      syntax: ['ptCloud = pointCloud(xyzPoints)', 'ptCloud = pointCloud(xyzPoints,Color=C)'],
      description: [
        'ptCloud = pointCloud(xyzPoints) creates a point cloud object from an [N×3] matrix of XYZ coordinates.',
        'ptCloud.Location is the [N×3] coordinate matrix. ptCloud.Count is the number of points.',
        'ptCloud.XLimits, ptCloud.YLimits, ptCloud.ZLimits give the axis-aligned bounding box.',
        'Pass ptCloud to pcdownsample, pcregistericp, pcsegdist, or pcfitplane.',
      ],
      seealso: ['pcdownsample', 'pcregistericp', 'pcsegdist', 'pcfitplane'],
    },
    pcdownsample: {
      summary: 'Downsample a 3-D point cloud',
      syntax: ['ptCloudOut = pcdownsample(ptCloudIn,gridStep)', "ptCloudOut = pcdownsample(ptCloudIn,'gridAverage',gridStep)"],
      description: [
        'ptCloudOut = pcdownsample(ptCloudIn,gridStep) reduces the point cloud by binning points into axis-aligned voxels of side length gridStep and replacing each voxel\'s points with their centroid.',
        'Smaller gridStep → more points retained (less downsampling).',
        'Typical values: 0.1–1.0 m for outdoor lidar; 0.001–0.01 m for object scans.',
      ],
      seealso: ['pointCloud', 'pcregistericp', 'pcsegdist'],
    },
    pcregistericp: {
      summary: 'Register two point clouds using ICP',
      syntax: ['tform = pcregistericp(moving,fixed)', '[tform,movingReg,rmse] = pcregistericp(moving,fixed,MaxIterations=n,Tolerance=t)'],
      description: [
        'tform = pcregistericp(moving,fixed) finds the rigid transformation (rotation + translation) that best aligns the moving point cloud to the fixed point cloud using Iterative Closest Point.',
        'Each ICP iteration: (1) find nearest neighbours in fixed for each moving point, (2) compute optimal rigid transform via SVD of the cross-covariance matrix, (3) apply transform.',
        'Iterates until MaxIterations (default 20) or RMSE change < Tolerance (default 1e-6).',
        'Returns: tform (rigidtform3d with Rotation [3×3] and Translation [1×3]), registered moving cloud, RMSE.',
      ],
      seealso: ['pointCloud', 'pcdownsample', 'pcsegdist', 'pcfitplane'],
    },
    pcsegdist: {
      summary: 'Segment point cloud into clusters based on Euclidean distance',
      syntax: ['[labels,numClusters] = pcsegdist(ptCloud,minDist)'],
      description: [
        '[labels,numClusters] = pcsegdist(ptCloud,minDist) groups points into clusters where any two points in the same cluster are within minDist of at least one other point in that cluster (connected components at distance threshold).',
        'Uses BFS with a voxel-grid spatial index for O(N log N) performance.',
        'labels is an [N×1] integer vector (1-based cluster indices). numClusters is the total number of clusters found.',
        'Typical use: segment individual objects after ground removal (pcfitplane).',
      ],
      seealso: ['pointCloud', 'pcfitplane', 'pcregistericp'],
    },
    pcfitplane: {
      summary: 'Fit a plane to a 3-D point cloud using RANSAC',
      syntax: ['model = pcfitplane(ptCloud,maxDistance)', '[model,inlierIndices,outlierIndices] = pcfitplane(ptCloud,maxDistance,maxNumTrials)'],
      description: [
        '[model,inlierIndices,outlierIndices] = pcfitplane(ptCloud,maxDistance) fits the dominant plane using RANSAC.',
        'RANSAC: repeatedly samples 3 random points, computes plane normal via cross product, counts inliers within maxDistance of the plane. Keeps the hypothesis with the most inliers (up to 1000 trials).',
        'Refines the final plane via least-squares: smallest eigenvector of the inlier covariance matrix (Jacobi eigendecomposition).',
        'model.Parameters = [a b c d] such that ax+by+cz+d=0 with unit normal [a b c].',
        'inlierIndices and outlierIndices are 1-based index vectors into the original point cloud.',
        'Typical use: remove ground plane before pcsegdist object clustering.',
      ],
      seealso: ['pointCloud', 'pcsegdist', 'pcdownsample', 'pcregistericp'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Mapping Toolbox, extracted from mapping.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_MAPPING: Record<string, HelpEntry | string> = {
    km2rad: { summary: 'Convert distance from kilometers to radians', syntax: ['rad = km2rad(km)', 'rad = km2rad(km,radius)'], seealso: ['rad2km', 'deg2km'], description: ['rad = km2rad(km) converts distances from kilometers to radians, as measured along a great circle on a sphere with a radius of 6371 km, the mean radius of the Earth.'] },
    rad2km: { summary: 'Convert distance from radians to kilometers', syntax: ['km = rad2km(rad)', 'km = rad2km(rad,radius)'], seealso: ['km2rad', 'deg2km'], description: ['km = rad2km(rad) converts distances from radians to kilometers, as measured along a great circle on a sphere with a radius of 6371 km, the mean radius of the Earth.'] },
    deg2km: { summary: 'Convert distance from degrees to kilometers', syntax: ['km = deg2km(deg)'], seealso: ['km2deg', 'deg2nm', 'deg2rad'], description: ['km = deg2km(deg) converts distances from degrees to kilometers, as measured along a great circle on a sphere with a radius of 6371 km, the mean radius of the Earth.'] },
    km2deg: { summary: 'Convert distance from kilometers to degrees', syntax: ['deg = km2deg(km)'], seealso: ['deg2km', 'km2rad'], description: ['deg = km2deg(km) converts distances from kilometers to degrees, as measured along a great circle on a sphere with a radius of 6371 km, the mean radius of the Earth.'] },
    deg2nm: { summary: 'Convert distance from degrees to nautical miles', syntax: ['nm = deg2nm(deg)'], seealso: ['nm2deg', 'deg2km'], description: ['nm = deg2nm(deg) converts distances from degrees to nautical miles, as measured along a great circle on a sphere with a radius of 3440.065 nautical miles, the mean radius of the Earth.'] },
    nm2km: { summary: 'Convert distance from nautical miles to kilometers', syntax: ['km = nm2km(nm)'], seealso: ['km2nm', 'nm2deg'], description: ['km = nm2km(nm) converts distances from nautical miles to kilometers.'] },
    km2nm: { summary: 'Convert distance from kilometers to nautical miles', syntax: ['nm = km2nm(km)'], seealso: ['nm2km', 'km2sm'], description: ['nm = km2nm(km) converts distances from kilometers to nautical miles.'] },
    nm2sm: { summary: 'Convert distance from nautical to statute miles', syntax: ['sm = nm2sm(nm)'], seealso: ['sm2nm', 'nm2deg'], description: ['sm = nm2sm(nm) converts distances from nautical miles to statute miles.'] },
    sm2nm: { summary: 'Convert distance from statute to nautical miles', syntax: ['nm = sm2nm(sm)'], seealso: ['nm2sm', 'sm2km'], description: ['nm = sm2nm(sm) converts distances from statute miles to nautical miles.'] },
    km2sm: { summary: 'Convert distance from kilometers to statute miles', syntax: ['sm = km2sm(km)', 'sm = km2sm(km,radius)'], description: ['sm = km2sm(km) converts a distance from kilometers to statute miles using Earth\'s mean radius.'], seealso: ['sm2km', 'km2nm'] },
    sm2km: { summary: 'Convert distance from statute miles to kilometers', syntax: ['km = sm2km(sm)'], seealso: ['km2sm', 'sm2nm'], description: ['km = sm2km(sm) converts distances from statute miles to kilometers.'] },
    deg2sm: { summary: 'Convert distance from degrees to statute miles', syntax: ['sm = deg2sm(deg)'], seealso: ['sm2deg', 'deg2km'], description: ['sm = deg2sm(deg) converts distances from degrees to statute miles as measured along a great circle on a sphere with a radius of 3958.748 sm, the mean radius of the Earth.'] },
    sm2deg: { summary: 'Convert distance from statute miles to degrees', syntax: ['deg = sm2deg(sm)'], seealso: ['deg2sm', 'sm2km'], description: ['deg = sm2deg(sm) converts distances from statute miles to degrees, as measured along a great circle on a sphere with a radius of 3958.748 sm, the mean radius of the Earth.'] },
    nm2deg: { summary: 'Convert distance from nautical miles to degrees', syntax: ['deg = nm2deg(nm)', 'deg = nm2deg(nm,radius)'], description: ['deg = nm2deg(nm) converts a distance in nautical miles to degrees of arc along a great circle using Earth\'s mean radius.'], seealso: ['deg2nm', 'nm2km'] },
    rad2nm: { summary: 'Convert distance from radians to nautical miles', syntax: ['nm = rad2nm(rad)'], seealso: ['nm2rad', 'rad2km'], description: ['nm = rad2nm(rad) converts distances from radians to nautical miles, as measured along a great circle on a sphere with a radius of 3440.065 nm, the mean radius of the Earth.'] },
    nm2rad: { summary: 'Convert distance from nautical miles to radians', syntax: ['rad = nm2rad(nm)'], seealso: ['rad2nm', 'nm2deg'], description: ['rad = nm2rad(nm) converts distances from nautical miles to radians, as measured along a great circle on a sphere with a radius of 3440.065 nm, the mean radius of the Earth.'] },
    rad2sm: { summary: 'Convert distance from radians to statute miles', syntax: ['sm = rad2sm(rad)'], seealso: ['sm2rad', 'rad2km'], description: ['sm = rad2sm(rad) converts distances from radians to statute miles, as measured along a great circle on a sphere with a radius of 3958.748 sm, the mean radius of the Earth.'] },
    sm2rad: { summary: 'Convert distance from statute miles to radians', syntax: ['rad = sm2rad(sm)'], seealso: ['rad2sm', 'sm2km'], description: ['rad = sm2rad(sm) converts distances from statute miles to radians, as measured along a great circle on a sphere with a radius of 3958.748 sm, the mean radius of the Earth.'] },
    meanm: { summary: 'Mean location of geographic coordinates', syntax: ['[latm,lonm] = meanm(lat,lon)'], seealso: ['distance', 'azimuth'] },
    changem: { summary: 'Substitute values in array', syntax: ['B = changem(A,newval,oldval)'], seealso: ['ismember'], description: ['B = changem(A,new) replaces all occurrences of 0 in array A with the specified scalar new. This function is useful for replacing values in classification grids.'] },
    ingeoquad: { summary: 'True for points inside or on lat-lon quadrangle', syntax: ['tf = ingeoquad(lat,lon,latlim,lonlim)'], seealso: ['inpolygon'], description: ['tf = ingeoquad(lat, lon, latlim, lonlim) returns an array tf that has the same size as lat and lon. tf(k) is true if and only if the point lat(k), lon(k) falls within or on the edge of the geographic quadrangle defined by latlim and lonlim. latlim is a vector of the form [southern- limit northern-limit], and lonlim is a vector of the form [western-limit eastern-limit]. All angles are in units of degrees.'] },
    ecef2enuv: { summary: 'Rotate ECEF vector to local ENU', syntax: ['[uE,vN,wU] = ecef2enuv(U,V,W,lat0,lon0)'], seealso: ['enu2ecefv', 'ecef2enu'], description: ['Note'] },
    enu2ecefv: { summary: 'Rotate local ENU vector to ECEF', syntax: ['[U,V,W] = enu2ecefv(uE,vN,wU,lat0,lon0)'], seealso: ['ecef2enuv', 'enu2ecef'], description: ['Note'] },
    ecef2nedv: { summary: 'Rotate ECEF vector to local NED', syntax: ['[uN,vE,wD] = ecef2nedv(U,V,W,lat0,lon0)'], seealso: ['ned2ecefv', 'ecef2ned'], description: ['Note'] },
    ned2ecefv: { summary: 'Rotate local NED vector to ECEF', syntax: ['[U,V,W] = ned2ecefv(uN,vE,wD,lat0,lon0)'], seealso: ['ecef2nedv', 'ned2ecef'], description: ['Note'] },
    toDegrees: { summary: 'Convert angles to degrees', syntax: ['deg = toDegrees(angleUnits,angles)'], description: ["deg = toDegrees('radians',angles) converts angles from any angular unit ('radians', 'degrees') to degrees."], seealso: ['fromDegrees', 'deg2rad'] },
    fromDegrees: { summary: 'Convert angles from degrees', syntax: ['angles = fromDegrees(angleUnits,deg)'], description: ["angles = fromDegrees('radians',deg) converts angles in degrees to the specified angular unit."], seealso: ['toDegrees', 'deg2rad'] },
    distance: { summary: 'Angular or surface distance between two geographic points', syntax: ['d = distance(pt1,pt2)', 'd = distance(lat1,lon1,lat2,lon2)'], seealso: ['azimuth', 'reckon', 'departure'], description: ['[arclen,az] = distance(lat1,lon1,lat2,lon2) calculates the arc length arclen and azimuth az of the great circle arc from the starting point with coordinates lat1 and lon1 to the ending point with coordinates lat2 and lon2. The function uses the shorter (minor) great circle arc. This syntax references the coordinates to a sphere and returns arclen and az as spherical distances in degrees.'] },
    azimuth: { summary: 'Azimuth between two geographic points', syntax: ['az = azimuth(lat1,lon1,lat2,lon2)', 'az = azimuth(pt1,pt2)'], description: ['az = azimuth(lat1,lon1,lat2,lon2) returns the azimuth angle (clockwise from north, in degrees) from point 1 to point 2 on a sphere.'], seealso: ['distance', 'reckon', 'departure'] },
    reckon: { summary: 'Point at a given azimuth and range from a starting location', syntax: ['[latout,lonout] = reckon(lat,lon,rng,az)'], seealso: ['distance', 'azimuth'], description: ['[lat2,lon2] = reckon(lat1,lon1,arclen,az) finds the coordinates of the point at the spherical distance arclen and azimuth az from the point with coordinates lat1 and lon1. This syntax references the coordinates to a sphere, assumes that all input arguments are in degrees, and assumes a great circle azimuth.'] },
    departure: { summary: 'Longitude distance (departure) between two meridians at given latitudes', syntax: ['d = departure(lon1,lon2,lat)'], description: ['d = departure(lon1,lon2,lat) returns the east-west distance (in degrees of arc) between meridians lon1 and lon2 at latitude lat.'], seealso: ['distance', 'azimuth'] },
    antipode: { summary: 'Point diametrically opposite on the globe', syntax: ['[latout,lonout] = antipode(lat,lon)'], seealso: ['distance', 'azimuth'], description: ['[newlat,newlon] = antipode(lat,lon) returns the geographic coordinates of the points exactly opposite on the globe from the input points given by lat and lon. All angles are in degrees.'] },
    wrapTo180: { summary: 'Wrap angle in degrees to [-180, 180]', syntax: ['lon = wrapTo180(lon)'], description: ['lon = wrapTo180(lon) wraps angles in degrees to the interval [-180, 180] such that -180 maps to -180 and 180 maps to 180.'], seealso: ['wrapTo360', 'wrapToPi'] },
    wrapTo360: { summary: 'Wrap angle in degrees to [0, 360]', syntax: ['lon = wrapTo360(lon)'], seealso: ['wrapTo180', 'wrapToPi'], description: ['lonWrapped = wrapTo360(lon) wraps angles in lon, in degrees, to the interval [0, 360] such that 0 maps to 0 and 360 maps to 360. In general, positive multiples of 360 map to 360 and negative multiples of 360 map to zero.'] },
    wrapToPi: { summary: 'Wrap angle in radians to [-pi, pi]', syntax: ['lon = wrapToPi(lon)'], description: ['lon = wrapToPi(lon) wraps angles in radians to the interval [-pi, pi], analogous to wrapTo180 for degrees.'], seealso: ['wrapTo2Pi', 'wrapTo180'] },
    wrapTo2Pi: { summary: 'Wrap angle in radians to [0, 2*pi]', syntax: ['lon = wrapTo2Pi(lon)'], seealso: ['wrapToPi', 'wrapTo360'], description: ['lambdaWrapped = wrapTo2Pi(lambda) wraps angles in lambda, in radians, to the interval [0, 2pi] such that 0 maps to 0 and 2pi maps to 2pi. In general, positive multiples of 2pi map to 2pi and negative multiples of 2pi map to 0.'] },
    wgs84Ellipsoid: { summary: 'WGS84 reference ellipsoid parameters [semimajor, eccentricity]', syntax: ['e = wgs84Ellipsoid'], seealso: ['earthRadius', 'flat2ecc'], description: ['E = wgs84Ellipsoid creates a referenceEllipsoid object for the World Geodetic System of 1984 (WGS84) reference ellipsoid. By default, the lengths of the semimajor axis and semiminor axis are in meters.'] },
    earthRadius: { summary: 'Mean radius of planet Earth', syntax: ['r = earthRadius', "r = earthRadius(units)"], description: ["r = earthRadius returns Earth's mean radius in meters (6371000 m)."], seealso: ['wgs84Ellipsoid', 'flat2ecc'] },
    ecc2flat: { summary: 'Flattening of an ellipse from eccentricity', syntax: ['f = ecc2flat(ecc)'], seealso: ['flat2ecc', 'ecc2n'], description: ['f = ecc2flat(ecc) computes the flattening f of an ellipse or an ellipsoid of revolution given its eccentricity ecc.'] },
    flat2ecc: { summary: 'Eccentricity of an ellipse from flattening', syntax: ['ecc = flat2ecc(f)'], description: ['ecc = flat2ecc(f) returns the eccentricity e of an ellipse with flattening f, using e = sqrt(2f - f^2).'], seealso: ['ecc2flat', 'n2ecc'] },
    ecc2n: { summary: 'Third flattening from eccentricity', syntax: ['n = ecc2n(ecc)'], seealso: ['n2ecc', 'ecc2flat'], description: ['n = ecc2n(ecc) computes the third flattening n of an ellipse or an ellipsoid of revolution given its eccentricity ecc.'] },
    n2ecc: { summary: 'Eccentricity from third flattening', syntax: ['ecc = n2ecc(n)'], description: ['ecc = n2ecc(n) returns the eccentricity of an ellipse with third flattening n = (a-b)/(a+b).'], seealso: ['ecc2n', 'flat2ecc'] },
    majaxis: { summary: 'Semimajor axis from semiminor axis and eccentricity', syntax: ['a = majaxis(b,ecc)'], seealso: ['minaxis', 'flat2ecc'], description: ['a = majaxis(semiminor,e) computes the semimajor axis length a of an ellipse or an ellipsoid of revolution given the semiminor axis length semiminor and eccentricity e.'] },
    minaxis: { summary: 'Semiminor axis from semimajor axis and eccentricity', syntax: ['b = minaxis(a,ecc)'], description: ['b = minaxis(a,ecc) returns the semiminor axis b = a*sqrt(1-ecc^2) of an ellipse.'], seealso: ['majaxis', 'ecc2flat'] },
    geocentricLatitude: { summary: 'Convert geodetic to geocentric latitude', syntax: ['latc = geocentricLatitude(latd,ecc)'], seealso: ['parametricLatitude', 'geodetic2ecef'], description: ['psi = geocentricLatitude(phi,F) returns the geocentric latitude corresponding to geodetic latitude phi on an ellipsoid with flattening F.'] },
    parametricLatitude: { summary: 'Convert geodetic to parametric (reduced) latitude', syntax: ['latp = parametricLatitude(latd,ecc)'], description: ['latp = parametricLatitude(latd,ecc) returns the parametric (reduced) latitude corresponding to geodetic latitude latd for an ellipse with eccentricity ecc.'], seealso: ['geocentricLatitude', 'geodetic2ecef'] },
    meridianarc: { summary: 'Ellipsoidal distance along a meridian', syntax: ['d = meridianarc(phi1,phi2,ecc)'], seealso: ['distance', 'earthRadius'], description: ['s = meridianarc(phi1,phi2,ellipsoid) calculates the (signed) distance s between latitudes phi1 and phi2 along a meridian on the ellipsoid defined by ellipsoid, which can be a referenceSphere, referenceEllipsoid, or oblateSpheroid object, or a vector of the form [semimajor_axis eccentricity]. Latitudes phi1 and phi2 are in radians. The distance s has the same units as the semimajor axis of the ellipsoid. If phi2 is less than phi1, s is negative.'] },
    geodetic2ecef: { summary: 'Transform geodetic to ECEF coordinates', syntax: ['[X,Y,Z] = geodetic2ecef(lat,lon,h)'], description: ['[X,Y,Z] = geodetic2ecef(lat,lon,h) converts geodetic coordinates (latitude lat in degrees, longitude lon in degrees, height h in meters) to Earth-centered Earth-fixed (ECEF) Cartesian coordinates.'], seealso: ['ecef2geodetic', 'ecef2enu', 'enu2ecef'] },
    ecef2geodetic: { summary: 'Transform ECEF to geodetic coordinates', syntax: ['[lat,lon,h] = ecef2geodetic(X,Y,Z)'], description: ['[lat,lon,h] = ecef2geodetic(X,Y,Z) converts ECEF Cartesian coordinates to geodetic latitude (degrees), longitude (degrees), and height (meters).'], seealso: ['geodetic2ecef', 'ecef2enu'] },
    ecef2enu: { summary: 'Transform ECEF to local east-north-up coordinates', syntax: ['[E,N,U] = ecef2enu(X,Y,Z,lat0,lon0,h0)'], description: ['[E,N,U] = ecef2enu(X,Y,Z,lat0,lon0,h0) transforms ECEF coordinates to a local ENU frame centered at the reference geodetic point (lat0,lon0,h0).'], seealso: ['enu2ecef', 'ecef2ned', 'geodetic2enu'] },
    enu2ecef: { summary: 'Transform local east-north-up to ECEF coordinates', syntax: ['[X,Y,Z] = enu2ecef(E,N,U,lat0,lon0,h0)'], description: ['[X,Y,Z] = enu2ecef(E,N,U,lat0,lon0,h0) converts ENU local coordinates to ECEF, given the reference geodetic origin.'], seealso: ['ecef2enu', 'ned2ecef', 'enu2geodetic'] },
    ecef2ned: { summary: 'Transform ECEF to local north-east-down coordinates', syntax: ['[N,E,D] = ecef2ned(X,Y,Z,lat0,lon0,h0)'], seealso: ['ned2ecef', 'ecef2enu'], description: ['Note'] },
    ned2ecef: { summary: 'Transform local north-east-down to ECEF coordinates', syntax: ['[X,Y,Z] = ned2ecef(N,E,D,lat0,lon0,h0)'], seealso: ['ecef2ned', 'enu2ecef'], description: ['Note'] },
    geodetic2enu: { summary: 'Transform geodetic to local east-north-up', syntax: ['[E,N,U] = geodetic2enu(lat,lon,h,lat0,lon0,h0)'], seealso: ['enu2geodetic', 'geodetic2ecef'], description: ['[xEast,yNorth,zUp] = geodetic2enu(lat,lon,h,lat0,lon0,h0,spheroid) transforms the geodetic coordinates specified by lat, lon, and h to the local east- north-up (ENU) Cartesian coordinates specified by xEast, yNorth, and zUp. Specify the origin of the local ENU system with the geodetic coordinates lat0, lon0, and h0. Each coordinate input argument must match the others in size or be scalar. Specify spheroid as the reference spheroid for the geodetic coordinates.'] },
    enu2geodetic: { summary: 'Transform local east-north-up to geodetic', syntax: ['[lat,lon,h] = enu2geodetic(E,N,U,lat0,lon0,h0)'], seealso: ['geodetic2enu', 'ecef2geodetic'], description: ['[lat,lon,h] = enu2geodetic(xEast,yNorth,zUp,lat0,lon0,h0,spheroid) transforms the local east-north-up (ENU) Cartesian coordinates specified by xEast, yNorth, and zUp to the geodetic coordinates specified by lat, lon, and h. Specify the origin of the local ENU system with the geodetic coordinates lat0, lon0, and h0. Each coordinate input argument must match the others in size or be scalar. Specify spheroid as the reference spheroid for the geodetic coordinates.'] },
    geodetic2ned: { summary: 'Transform geodetic to local north-east-down', syntax: ['[N,E,D] = geodetic2ned(lat,lon,h,lat0,lon0,h0)'], seealso: ['ned2geodetic', 'geodetic2enu'], description: ['[xNorth,yEast,zDown] = geodetic2ned(lat,lon,h,lat0,lon0,h0,spheroid) transforms the geodetic coordinates specified by lat, lon, and h to the local north- east-down (NED) Cartesian coordinates specified by xNorth, yEast, and zDown. Specify the origin of the local NED system with the geodetic coordinates lat0, lon0, and h0. Each coordinate input argument must match the others in size or be scalar. Specify spheroid as the reference spheroid for the geodetic coordinates.'] },
    ned2geodetic: { summary: 'Transform local north-east-down to geodetic', syntax: ['[lat,lon,h] = ned2geodetic(N,E,D,lat0,lon0,h0)'], seealso: ['geodetic2ned', 'ecef2geodetic'], description: ['[lat,lon,h] = ned2geodetic(xNorth,yEast,zDown,lat0,lon0,h0,spheroid) transforms the local north-east-down (NED) Cartesian coordinates specified by xNorth, yEast, and zDown to the geodetic coordinates specified by lat, lon, and h. Specify the origin of the local NED system with the geodetic coordinates lat0, lon0, and h0. Each coordinate input argument must match the others in size or be scalar. Specify spheroid as the reference spheroid for the geodetic coordinates.'] },
    aer2enu: { summary: 'Transform azimuth-elevation-range to east-north-up', syntax: ['[E,N,U] = aer2enu(az,elev,slantRange)'], seealso: ['enu2aer', 'aer2ned'], description: ['[xEast,yNorth,zUp] = aer2enu(az,elev,slantRange) transforms the local azimuth-elevation-range (AER) spherical coordinates specified by az, elev, and slantRange to the local east-north-up (ENU) Cartesian coordinates specified by xEast, yNorth, and zUp. Both coordinate systems use the same local origin. Each input argument must match the others in size or be scalar.'] },
    enu2aer: { summary: 'Transform east-north-up to azimuth-elevation-range', syntax: ['[az,elev,slantRange] = enu2aer(E,N,U)'], seealso: ['aer2enu', 'ned2aer'], description: ['[az,elev,slantRange] = enu2aer(xEast,yNorth,zUp) transforms the local east-north-up (ENU) Cartesian coordinates specified by xEast, yNorth, and zUp to the local azimuth-elevation-range (AER) spherical coordinates specified by az, elev, and slantRange. Both coordinate systems use the same local origin. Each input argument must match the others in size or be scalar.'] },
    aer2ned: { summary: 'Transform azimuth-elevation-range to north-east-down', syntax: ['[N,E,D] = aer2ned(az,elev,slantRange)'], seealso: ['ned2aer', 'aer2enu'], description: ['[xNorth,yEast,zDown] = aer2ned(az,elev,slantRange) transforms the local spherical azimuth-elevation-range (AER) coordinates specified by az, elev, and slantRange to the local north-east-down (NED) coordinates specified by xNorth, yEast, and zDown. Both coordinate systems use the same local origin. Each input argument must match the others in size or be scalar.'] },
    ned2aer: { summary: 'Transform north-east-down to azimuth-elevation-range', syntax: ['[az,elev,slantRange] = ned2aer(N,E,D)'], seealso: ['aer2ned', 'enu2aer'], description: ['[az,elev,slantRange] = ned2aer(xNorth,yEast,zDown) transforms the local north-east-down (NED) Cartesian coordinates specified by xNorth, yEast, and zDown to the local azimuth-elevation-range (AER) spherical coordinates specified by az, elev, and slantRange. Both coordinate systems use the same local origin. Each input argument must match the others in size or be scalar.'] },
    geodetic2aer: { summary: 'Transform geodetic to local azimuth-elevation-range', syntax: ['[az,elev,slantRange] = geodetic2aer(lat,lon,h,lat0,lon0,h0)'], seealso: ['aer2geodetic', 'geodetic2enu'], description: ['[az,elev,slantRange] = geodetic2aer(lat,lon,h,lat0,lon0,h0,spheroid) transforms the geodetic coordinates specified by lat, lon, and h to the local azimuth- elevation-range (AER) spherical coordinates specified by az, elev, and slantRange. Specify the origin of the local AER system with the geodetic coordinates lat0, lon0, and h0. Each coordinate input argument must match the others in size or be scalar. Specify spheroid as the reference spheroid for the geodetic coordinates.'] },
    aer2geodetic: { summary: 'Transform azimuth-elevation-range to geodetic', syntax: ['[lat,lon,h] = aer2geodetic(az,elev,slantRange,lat0,lon0,h0)'], seealso: ['geodetic2aer', 'ecef2geodetic'], description: ['[lat,lon,h] = aer2geodetic(az,elev,slantRange,lat0,lon0,h0,spheroid) transforms the local azimuth-elevation-range (AER) spherical coordinates specified by az, elev, and slantRange to the geodetic coordinates specified by lat, lon, and h. Specify the origin of the local AER system with the geodetic coordinates lat0, lon0, and h0. Each coordinate input argument must match the others in size or be scalar. Specify spheroid as the reference spheroid for the geodetic coordinates.'] },
    ecef2aer: { summary: 'Transform ECEF to local azimuth-elevation-range', syntax: ['[az,elev,slantRange] = ecef2aer(X,Y,Z,lat0,lon0,h0)'], seealso: ['aer2ecef', 'ecef2enu'], description: ['[az,elev,slantRange] = ecef2aer(X,Y,Z,lat0,lon0,h0,spheroid) transforms the geocentric Earth-centered Earth-fixed (ECEF) Cartesian coordinates specified by X, Y, and Z to the local azimuth-elevation-range (AER) spherical coordinates specified by az, elev, and slantRange. Specify the origin of the local AER system with the geodetic coordinates lat0, lon0, and h0. Each coordinate input argument must match the others in size or be scalar. Specify spheroid as the reference spheroid for the geodetic coordinates.'] },
    aer2ecef: { summary: 'Transform azimuth-elevation-range to ECEF', syntax: ['[X,Y,Z] = aer2ecef(az,elev,slantRange,lat0,lon0,h0)'], seealso: ['ecef2aer', 'enu2ecef'], description: ['[X,Y,Z] = aer2ecef(az,elev,slantRange,lat0,lon0,h0,spheroid) transforms the local azimuth-elevation-range (AER) spherical coordinates specified by az, elev, and slantRange to the geocentric Earth-centered Earth-fixed (ECEF) Cartesian coordinates specified by X, Y, and Z. Specify the origin of the local AER system with the geodetic coordinates lat0, lon0, and h0. Each coordinate input argument must match the others in size or be scalar. Specify spheroid as the reference spheroid for the geodetic coordinates.'] },
    degrees2dms: { summary: 'Convert decimal degrees to degrees-minutes-seconds', syntax: ['dms = degrees2dms(deg)'], seealso: ['dms2degrees', 'degrees2dm'], description: ['DMS = degrees2dms(angleInDegrees) converts angles from values in degrees which may include a fractional part (sometimes called “decimal degrees”) to degrees-minutes-seconds representation.'] },
    degrees2dm: { summary: 'Convert decimal degrees to degrees-minutes', syntax: ['dm = degrees2dm(deg)'], seealso: ['dm2degrees', 'degrees2dms'], description: ['DM = degrees2dm(angleInDegrees) converts angles from values in degrees which may include a fractional part (sometimes called “decimal degrees”) to degrees-minutes representation.'] },
    dms2degrees: { summary: 'Convert degrees-minutes-seconds to decimal degrees', syntax: ['deg = dms2degrees(dms)'], seealso: ['degrees2dms', 'dm2degrees'], description: ['angleInDegrees = dms2degrees(DMS) converts angles from degrees-minutes- seconds representation to values in degrees which may include a fractional part (sometimes called “decimal degrees”).'] },
    dm2degrees: { summary: 'Convert degrees-minutes to decimal degrees', syntax: ['deg = dm2degrees(dm)'], seealso: ['degrees2dm', 'dms2degrees'], description: ['angleInDegrees = dm2degrees(DM) converts angles from degrees-minutes representation to values in degrees which may include a fractional part (sometimes called “decimal degrees”).'] },
    interpm: { summary: 'Densify latitude-longitude sampling in lines or polygons', syntax: ['[lati,loni] = interpm(lat,lon,maxdiff)'], seealso: ['distance', 'azimuth'], description: ['[latout,lonout] = interpm(lat,lon,maxdist) densifies the connected vertices in latitude-longitude coordinates by inserting vertices where adjacent latitudes or longitudes are separated by more than the specified maximum spherical distance. By default, the function uses linear interpolation and assumes that the coordinates and distance are in degrees.'] },
    angl2str: { summary: 'Format angle as a string', syntax: ["str = angl2str(ang)", "str = angl2str(ang,'format',units)"], seealso: ['degrees2dms', 'num2str'], description: ['str = angl2str(angles) converts numeric angles in degrees to a character array that represents the angles. This function is useful for displaying angles as text on maps.'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Navigation Toolbox, extracted from nav.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_NAV: Record<string, HelpEntry | string> = {
    lla2ecef: { summary: 'Convert LLA (lat/lon/alt) to ECEF coordinates', syntax: ['ecef = lla2ecef(lla)'], seealso: ['ecef2lla', 'geodetic2ecef'] },
    ecef2lla: { summary: 'Convert ECEF to LLA (lat/lon/alt) coordinates', syntax: ['lla = ecef2lla(ecef)'], seealso: ['lla2ecef', 'ecef2geodetic'] },
    quatnormalize: { summary: 'Normalize quaternion to unit length', syntax: ['qn = quatnormalize(q)'], seealso: ['quatinv', 'quatmultiply'] },
    lla2ned: { summary: 'Transform geodetic coordinates to local north-east-down (NED)', syntax: ['xyzNED = lla2ned(lla,lla0,method)'], description: ["xyzNED = lla2ned(lla,lla0,method) converts geodetic coordinates lla = [lat lon alt] to local NED [north east down] relative to origin lla0. method is 'ellipsoid' (WGS84) or 'flat'."], seealso: ['lla2enu', 'ned2lla', 'lla2ecef', 'ecef2lla'] },
    lla2enu: { summary: 'Transform geodetic coordinates to local east-north-up (ENU)', syntax: ['xyzENU = lla2enu(lla,lla0,method)'], description: ["xyzENU = lla2enu(lla,lla0,method) converts geodetic coordinates to local ENU [east north up] relative to origin lla0. method is 'ellipsoid' or 'flat'."], seealso: ['lla2ned', 'enu2lla', 'lla2ecef'] },
    eul2quat: { summary: 'Convert Euler angles to quaternion', syntax: ['quat = eul2quat(eul)', 'quat = eul2quat(eul,sequence)'], description: ["quat = eul2quat(eul) converts N-by-3 intrinsic Euler angles (radians) to N-by-4 unit quaternions [w x y z] using the default 'ZYX' body-fixed rotation sequence."], seealso: ['quat2eul', 'eul2rotm', 'eul2tform', 'axang2quat'] },
    quat2eul: { summary: 'Convert quaternion to Euler angles', syntax: ['eul = quat2eul(quat)', 'eul = quat2eul(quat,sequence)'], description: ["eul = quat2eul(quat) converts N-by-4 unit quaternions [w x y z] to N-by-3 Euler angles (radians) using the default 'ZYX' sequence."], seealso: ['eul2quat', 'quat2rotm', 'rotm2eul'] },
    eul2rotm: { summary: 'Convert Euler angles to rotation matrix', syntax: ['rotm = eul2rotm(eul)', 'rotm = eul2rotm(eul,sequence)'], description: ["rotm = eul2rotm(eul) converts N-by-3 Euler angles (radians) to a 3-by-3-by-N rotation matrix array using the default 'ZYX' body-fixed intrinsic sequence."], seealso: ['rotm2eul', 'eul2quat', 'eul2tform', 'axang2rotm'] },
    rotm2eul: { summary: 'Convert rotation matrix to Euler angles', syntax: ['eul = rotm2eul(rotm)', 'eul = rotm2eul(rotm,sequence)'], description: ["eul = rotm2eul(rotm) converts a 3-by-3-by-N rotation matrix array to N-by-3 Euler angles (radians) using the default 'ZYX' sequence."], seealso: ['eul2rotm', 'rotm2quat', 'quat2eul'] },
    eul2tform: { summary: 'Convert Euler angles to homogeneous transformation matrix', syntax: ['tform = eul2tform(eul)', 'tform = eul2tform(eul,sequence)'], description: ["tform = eul2tform(eul) converts N-by-3 Euler angles (radians) to a 4-by-4-by-N homogeneous transformation array (rotation only, no translation) using the default 'ZYX' sequence."], seealso: ['eul2rotm', 'eul2quat', 'tform2rotm', 'axang2tform'] },
    cart2hom: { summary: 'Converts a set of points in Cartesian coordinates to homogeneous coordinates.', syntax: ['hom = cart2hom(cart)'], seealso: ['hom2cart'], description: ['hom = cart2hom(cart) converts a set of points in Cartesian coordinates to homogeneous coordinates.'] },
    hom2cart: { summary: 'Converts a set of homogeneous points to Cartesian coordinates.', syntax: ['cart = hom2cart(hom)'], seealso: ['cart2hom'], description: ['cart = hom2cart(hom) converts a set of homogeneous points to Cartesian coordinates.'] },
    trvec2tform: { summary: 'Converts the Cartesian representation of the translation vector trvec to the corresponding homogeneous transformation tform.', syntax: ['tform = trvec2tform(trvec)'], seealso: ['tform2trvec', 'se2', 'se3'], description: ['tform = trvec2tform(trvec) converts the Cartesian representation of the translation vector trvec to the corresponding homogeneous transformation tform. When using the transformation matrix, premultiply it by the coordinates to be transformed (as opposed to postmultiplying).'] },
    tform2trvec: { summary: 'Extracts the Cartesian representation of the translation vector trvec from the homogeneous transformation tform.', syntax: ['trvec = tform2trvec(tform)'], seealso: ['trvec2tform', 'se2', 'se3'], description: ['trvec = tform2trvec(tform) extracts the Cartesian representation of the translation vector trvec from the homogeneous transformation tform. The rotational components of tform are ignored. The input homogeneous transformation must be in the premultiplied form for transformations.'] },
    rotm2tform: { summary: 'Converts the rotation matrix rotm into a homogeneous transformation matrix tform.', syntax: ['tform = rotm2tform(rotm)'], seealso: ['tform2rotm', 'se2', 'se3', 'so2', 'so3'], description: ['tform = rotm2tform(rotm) converts the rotation matrix rotm into a homogeneous transformation matrix tform. The input rotation matrix must be in the premultiply form for rotations. When using the transformation matrix, premultiply it by the coordinates to be transformed (as opposed to postmultiplying).'] },
    tform2rotm: { summary: 'Extracts the rotational component from a homogeneous transformation, tform, and returns it as an orthonormal rotation matrix, rotm.', syntax: ['rotm = tform2rotm(tform)'], seealso: ['rotm2tform', 'se2', 'se3', 'so2', 'so3'], description: ['rotm = tform2rotm(tform) extracts the rotational component from a homogeneous transformation, tform, and returns it as an orthonormal rotation matrix, rotm. The translational components of tform are ignored. The input homogeneous transformation must be in the pre-multiply form for transformations. When using the rotation matrix, premultiply it with the coordinates to be rotated (as opposed to postmultiplying).'] },
    axang2rotm: { summary: 'Converts a rotation given in axis-angle form, axang, to an orthonormal rotation matrix, rotm.', syntax: ['rotm = axang2rotm(axang)'], seealso: ['rotm2axang', 'so2', 'so3'], description: ['rotm = axang2rotm(axang) converts a rotation given in axis-angle form, axang, to an orthonormal rotation matrix, rotm. When using the rotation matrix, premultiply it with the coordinates to be rotated (as opposed to postmultiplying).'] },
    axang2quat: { summary: 'Converts a rotation given in axis-angle form, axang, to quaternion, quat.', syntax: ['quat = axang2quat(axang)'], seealso: ['quat2axang', 'quaternion'], description: ['quat = axang2quat(axang) converts a rotation given in axis-angle form, axang, to quaternion, quat.'] },
    rotx: { summary: 'Rotation matrix around x-axis', syntax: ['R = rotx(ang)'], seealso: ['roty', 'rotz', 'axang2rotm'] },
    roty: { summary: 'Rotation matrix around y-axis', syntax: ['R = roty(ang)'], seealso: ['rotx', 'rotz', 'axang2rotm'] },
    rotz: { summary: 'Rotation matrix around z-axis', syntax: ['R = rotz(ang)'], seealso: ['rotx', 'roty', 'axang2rotm'] },
    quat2rotm: { summary: 'Converts a quaternion quat to an orthonormal rotation matrix, rotm.', syntax: ['rotm = quat2rotm(quat)'], seealso: ['rotm2quat', 'quaternion', 'so2', 'so3'], description: ['rotm = quat2rotm(quat) converts a quaternion quat to an orthonormal rotation matrix, rotm. When using the rotation matrix, premultiply it with the coordinates to be rotated (as opposed to postmultiplying).'] },
    rotm2quat: { summary: 'Converts a rotation matrix, rotm, to the corresponding unit quaternion representation, quat.', syntax: ['quat = rotm2quat(rotm)'], seealso: ['quat2rotm', 'so3', 'quaternion'], description: ['quat = rotm2quat(rotm) converts a rotation matrix, rotm, to the corresponding unit quaternion representation, quat. The input rotation matrix must be in the premultiply form for rotations.'] },
    quat2axang: { summary: 'Converts a quaternion, quat, to the equivalent axis-angle rotation, axang.', syntax: ['axang = quat2axang(quat)'], seealso: ['axang2quat', 'quaternion'], description: ['axang = quat2axang(quat) converts a quaternion, quat, to the equivalent axis-angle rotation, axang.'] },
    quat2tform: { summary: 'Converts a quaternion, quat, to a homogeneous transformation matrix, tform.', syntax: ['tform = quat2tform(quat)'], seealso: ['tform2quat', 'quaternion', 'se2', 'se3'], description: ['tform = quat2tform(quat) converts a quaternion, quat, to a homogeneous transformation matrix, tform. When using the transformation matrix, premultiply it with the coordinates to be transformed (as opposed to postmultiplying).'] },
    tform2quat: { summary: 'Extracts the rotational component from a homogeneous transformation, tform, and returns it as a quaternion, quat.', syntax: ['quat = tform2quat(tform)'], seealso: ['quat2tform', 'se3', 'quaternion'], description: ['quat = tform2quat(tform) extracts the rotational component from a homogeneous transformation, tform, and returns it as a quaternion, quat. The translational components of tform are ignored. The input homogeneous transformation must be in the premultiply form for transformations.'] },
    rotm2axang: { summary: 'Converts a rotation given as an orthonormal rotation matrix, rotm, to the corresponding axis-angle representation, axang.', syntax: ['axang = rotm2axang(rotm)'], seealso: ['axang2rotm', 'so3'], description: ['axang = rotm2axang(rotm) converts a rotation given as an orthonormal rotation matrix, rotm, to the corresponding axis-angle representation, axang. The input rotation matrix must be in the premultiply form for rotations.'] },
    rotmat2vec3d: { summary: 'Rotate 3-D vector using rotation matrix', syntax: ['vr = rotmat2vec3d(R,v)'], seealso: ['rotx', 'roty', 'rotz'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Deep Learning Toolbox, extracted from nnet.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_NNET: Record<string, HelpEntry | string> = {
    trainNetwork: {
      summary: 'Train deep learning neural network',
      syntax: [
        'net = trainNetwork(X,Y,layers,options)',
        'net = trainNetwork(imds,layers,options)',
      ],
      description: ['net = trainNetwork(X,Y,layers,options) trains a network defined by layers on data X with labels Y.'],
      seealso: ['trainingOptions', 'predict', 'classify', 'fullyConnectedLayer', 'reluLayer'],
    },
    trainingOptions: {
      summary: 'Options for training deep learning neural network',
      syntax: ["options = trainingOptions('adam')", "options = trainingOptions('sgdm','MaxEpochs',20,'MiniBatchSize',64)"],
      description: ["options = trainingOptions(solver,Name,Value) creates a training options object."],
      seealso: ['trainNetwork', 'dlnetwork', 'adamupdate'],
    },
    predict: {
      summary: 'Predict responses using trained deep learning network',
      syntax: ['Y = predict(net,X)', 'Y = predict(net,X,MiniBatchSize=n)'],
      description: ['Y = predict(net,X) runs the forward pass of net on X in inference mode (dropout disabled, batch-norm uses running stats).'],
      seealso: ['classify', 'trainNetwork', 'activations'],
    },
    classify: {
      summary: 'Classify data using trained deep learning network',
      syntax: ['labels = classify(net,X)'],
      description: [
        'labels = classify(net,X) predicts class indices (1-based) by taking the argmax of the network output over the class dimension.',
      ],
      seealso: ['predict', 'trainNetwork', 'onehotdecode'],
    },
    fullyConnectedLayer: {
      summary: 'Fully connected layer',
      syntax: ['layer = fullyConnectedLayer(outputSize)'],
      description: ['layer = fullyConnectedLayer(n) creates a fully connected layer with n output neurons.'],
      seealso: ['reluLayer', 'softmaxLayer', 'batchNormalizationLayer', 'trainNetwork'],
    },
    reluLayer: {
      summary: 'Rectified linear unit (ReLU) layer',
      syntax: ['layer = reluLayer'],
      description: ['layer = reluLayer creates a ReLU activation layer: f(x) = max(0,x).'],
      seealso: ['leakyReluLayer', 'geluLayer', 'sigmoidLayer', 'tanhLayer'],
    },
    sigmoidLayer: {
      summary: 'Sigmoid activation layer',
      syntax: ['layer = sigmoidLayer'],
      description: ['f(x) = 1/(1+e^{-x}).'],
      seealso: ['reluLayer', 'tanhLayer', 'softmaxLayer'],
    },
    tanhLayer: {
      summary: 'Hyperbolic tangent activation layer',
      syntax: ['layer = tanhLayer'],
      description: ['f(x) = tanh(x).'],
      seealso: ['reluLayer', 'sigmoidLayer'],
    },
    softmaxLayer: {
      summary: 'Softmax layer',
      syntax: ['layer = softmaxLayer'],
      description: ['Normalises each column to a probability distribution. Typically the penultimate layer before classificationLayer.'],
      seealso: ['classificationLayer', 'fullyConnectedLayer'],
    },
    geluLayer: {
      summary: 'Gaussian error linear unit (GELU) activation layer',
      syntax: ['layer = geluLayer'],
      description: ['f(x) = 0.5*x*(1 + tanh(sqrt(2/pi)*(x + 0.044715*x^3))). Used in transformer architectures.'],
      seealso: ['reluLayer', 'leakyReluLayer'],
    },
    leakyReluLayer: {
      summary: 'Leaky ReLU layer',
      syntax: ['layer = leakyReluLayer', 'layer = leakyReluLayer(scale)'],
      description: ['f(x) = x if x>0, scale*x otherwise (default scale=0.01).'],
      seealso: ['reluLayer', 'geluLayer'],
    },
    batchNormalizationLayer: {
      summary: 'Batch normalisation layer',
      syntax: ['layer = batchNormalizationLayer'],
      description: ['Normalises each feature to zero mean and unit variance over the mini-batch.'],
      seealso: ['reluLayer', 'dropoutLayer', 'fullyConnectedLayer'],
    },
    dropoutLayer: {
      summary: 'Dropout regularisation layer',
      syntax: ['layer = dropoutLayer', 'layer = dropoutLayer(p)'],
      description: ['layer = dropoutLayer(p) randomly sets p fraction of inputs to zero during training (default p=0.5). Inverted dropout: active units are scaled by 1/(1-p).'],
      seealso: ['batchNormalizationLayer', 'reluLayer'],
    },
    imageInputLayer: {
      summary: 'Image input layer',
      syntax: ['layer = imageInputLayer(inputSize)'],
      description: ["layer = imageInputLayer([h w c]) defines the network's image input dimensions."],
      seealso: ['featureInputLayer', 'sequenceInputLayer'],
    },
    featureInputLayer: {
      summary: 'Feature input layer',
      syntax: ['layer = featureInputLayer(numFeatures)'],
      description: ['Defines a 1-D feature vector input of length numFeatures.'],
      seealso: ['imageInputLayer', 'fullyConnectedLayer'],
    },
    classificationLayer: {
      summary: 'Classification output layer',
      syntax: ['layer = classificationLayer'],
      description: ['Computes cross-entropy loss during training. Paired with softmaxLayer.'],
      seealso: ['softmaxLayer', 'regressionLayer'],
    },
    regressionLayer: {
      summary: 'Regression output layer',
      syntax: ['layer = regressionLayer'],
      description: ['Computes half mean squared error (MSE) loss during training.'],
      seealso: ['classificationLayer', 'mse'],
    },
    lstmLayer: {
      summary: 'Long short-term memory (LSTM) layer',
      syntax: ['layer = lstmLayer(numHiddenUnits)', "layer = lstmLayer(n,'OutputMode','last')"],
      description: ['Processes sequential data with gated memory cells. Forward pass only (no backprop through time in this implementation).'],
      seealso: ['gruLayer', 'sequenceInputLayer', 'lstm'],
    },
    gruLayer: {
      summary: 'Gated recurrent unit (GRU) layer',
      syntax: ['layer = gruLayer(numHiddenUnits)'],
      description: ['Two-gate variant of LSTM. Forward pass only.'],
      seealso: ['lstmLayer', 'gru'],
    },
    convolution2dLayer: {
      summary: '2-D convolutional layer',
      syntax: ['layer = convolution2dLayer(filterSize,numFilters)', "layer = convolution2dLayer(3,8,'Padding','same')"],
      description: ['Defines a 2-D conv layer. Layer constructor only — backprop for conv not yet implemented; use with trainNetwork for FC-only networks.'],
      seealso: ['maxPooling2dLayer', 'batchNormalizationLayer', 'reluLayer'],
    },
    maxPooling2dLayer: {
      summary: '2-D max pooling layer',
      syntax: ['layer = maxPooling2dLayer(poolSize)', "layer = maxPooling2dLayer(2,'Stride',2)"],
      seealso: ['convolution2dLayer', 'averagePooling2dLayer'],
    },
    averagePooling2dLayer: {
      summary: '2-D average pooling layer',
      syntax: ['layer = averagePooling2dLayer(poolSize)'],
      seealso: ['maxPooling2dLayer', 'convolution2dLayer'],
    },
    dlnetwork: {
      summary: 'Deep learning neural network for custom training loops',
      syntax: ['net = dlnetwork(layers)', 'net = dlnetwork(lgraph)'],
      description: ['net = dlnetwork(layers) creates a network from a layer array for use in custom training loops.'],
      seealso: ['trainNetwork', 'adamupdate', 'dlarray'],
    },
    dlarray: {
      summary: 'Labelled array for deep learning',
      syntax: ["X = dlarray(data)", "X = dlarray(data,'CB')"],
      description: ["X = dlarray(data,fmt) wraps data with a dimension label string for use with dlarray operations."],
      seealso: ['extractdata', 'fullyconnect', 'relu'],
    },
    extractdata: {
      summary: 'Extract data from dlarray',
      syntax: ['Y = extractdata(X)'],
      description: ['Y = extractdata(X) returns the underlying numeric array from a dlarray object.'],
      seealso: ['dlarray'],
    },
    adamupdate: {
      summary: 'Update parameters using adaptive moment estimation (Adam)',
      syntax: [
        '[netUpdated,avgGrad,avgSqGrad] = adamupdate(net,grad,avgGrad,avgSqGrad,iteration)',
        '[p,m,v] = adamupdate(p,grad,m,v,t,lr)',
      ],
      description: ['Performs one Adam step: m = beta1*m + (1-beta1)*grad; v = beta2*v + (1-beta2)*grad^2;'],
      seealso: ['dlnetwork', 'trainingOptions'],
    },
    dlgradient: { summary: 'Gradients via automatic differentiation', syntax: ['[g1,…] = dlgradient(loss, x1, …)'], description: ['dlgradient(loss, x1, …) returns the gradients of the scalar dlarray loss with respect to each traced dlarray xi, by reverse-mode automatic differentiation. Build loss from dlarray inputs using the supported ops (+, -, .*, ./, *, .^, sum, mean, exp, log, sqrt, sigmoid, tanh, relu, mse). Typically called inside dlfeval.'], seealso: ['dlfeval', 'dlarray', 'adamupdate'] },
    dlfeval: { summary: 'Evaluate a function enabling automatic differentiation', syntax: ['[…] = dlfeval(fcn, x1, …)'], description: ['dlfeval(fcn, x1, …) calls fcn with automatic differentiation enabled and returns its outputs. Use it to wrap a model/loss function that calls dlgradient, e.g. [loss,grad] = dlfeval(@modelLoss, x).'], seealso: ['dlgradient', 'dlarray'] },
    fullyconnect: {
      summary: 'Sum all weighted input data and apply a bias',
      syntax: ['Y = fullyconnect(X,weights,bias)'],
      description: ['Y = fullyconnect(X,W,b) computes W*X + b. X is [inSize × batch], Y is [outSize × batch].'],
      seealso: ['relu', 'softmax', 'crossentropy'],
    },
    relu: {
      summary: 'Apply rectified linear unit activation',
      syntax: ['Y = relu(X)'],
      description: ['Y = relu(X) applies max(0,X) element-wise.'],
      seealso: ['sigmoid', 'softmax', 'leakyrelu', 'gelu'],
    },
    sigmoid: {
      summary: 'Apply sigmoid activation',
      syntax: ['Y = sigmoid(X)'],
      description: ['Y = sigmoid(X) applies 1/(1+exp(-X)) element-wise.'],
      seealso: ['relu', 'softmax', 'tanh'],
    },
    softmax: {
      summary: 'Apply softmax activation to channel dimension',
      syntax: ['Y = softmax(X)'],
      description: ['Y = softmax(X) applies column-wise softmax: exp(x_i)/sum(exp(x)).'],
      seealso: ['crossentropy', 'sigmoid', 'onehotdecode'],
    },
    crossentropy: {
      summary: 'Cross-entropy loss for classification tasks',
      syntax: ['loss = crossentropy(Y,targets)'],
      description: ['loss = crossentropy(Y,T) computes mean cross-entropy over a batch: -mean(sum(T.*log(Y),1)).'],
      seealso: ['mse', 'l2loss', 'softmax'],
    },
    mse: {
      summary: 'Half mean squared error',
      syntax: ['loss = mse(Y,targets)'],
      description: ['loss = mse(Y,T) computes 0.5*mean(||Y-T||^2) over the batch.'],
      seealso: ['crossentropy', 'l2loss'],
    },
    l2loss: {
      summary: 'L2 loss for regression tasks',
      syntax: ['loss = l2loss(Y,targets)', 'loss = l2loss(Y,targets,weights)'],
      description: ['loss = l2loss(Y,T) computes mean(||Y-T||^2) per sample.'],
      seealso: ['mse', 'crossentropy'],
    },
    lstm: {
      summary: 'Long short-term memory forward pass',
      syntax: ['Y = lstm(X,H0,C0,weights,recurrentWeights,bias)', '[Y,H,C] = lstm(___)'],
      description: ['lstm(X,H0,C0,W,R,b) applies the LSTM recurrence over the time dimension of X.'],
      seealso: ['gru', 'lstmLayer', 'fullyconnect'],
    },
    gru: {
      summary: 'Gated recurrent unit forward pass',
      syntax: ['Y = gru(X,H0,weights,recurrentWeights,bias)', '[Y,H] = gru(___)'],
      description: ['gru(X,H0,W,R,b) applies the GRU recurrence over the time dimension of X.'],
      seealso: ['lstm', 'gruLayer'],
    },
    batchnorm: {
      summary: 'Normalize data across all observations for each channel',
      syntax: ['Y = batchnorm(X,offset,scaleFactor)'],
      description: ['Y = batchnorm(X,beta,gamma) normalises X to zero mean and unit variance then scales by gamma and shifts by beta.'],
      seealso: ['batchNormalizationLayer', 'layernorm'],
    },
    maxpool: {
      summary: 'Pool data to maximum value',
      syntax: ['Y = maxpool(X,poolsize)', '[Y,indx,inputSize] = maxpool(X,poolsize)'],
      description: ['Y = maxpool(X,[h w]) applies 2-D max pooling with the given pool size.'],
      seealso: ['maxPooling2dLayer', 'averagePooling2dLayer'],
    },
    gelu: {
      summary: 'Apply Gaussian error linear unit (GELU) activation',
      syntax: ['Y = gelu(X)'],
      description: ['Y = gelu(X) applies the GELU activation: 0.5*x*(1+tanh(sqrt(2/pi)*(x+0.044715*x^3))).'],
      seealso: ['relu', 'leakyrelu', 'geluLayer'],
    },
    leakyrelu: {
      summary: 'Apply leaky rectified linear unit activation',
      syntax: ['Y = leakyrelu(X)', 'Y = leakyrelu(X,scaleFactor)'],
      description: ['Y = leakyrelu(X,a) applies f(x)=x for x>0, f(x)=a*x for x<=0 (default a=0.01).'],
      seealso: ['relu', 'gelu', 'leakyReluLayer'],
    },
    onehotdecode: {
      summary: 'Decode probability vectors into class labels',
      syntax: ['A = onehotdecode(B,classes,featureDim)'],
      description: ['A = onehotdecode(B,classes,1) returns the 1-based index of the maximum probability in each column of B.'],
      seealso: ['classify', 'softmax', 'crossentropy'],
    },
    layerGraph: {
      summary: 'Graph of network layers for deep learning',
      syntax: ['lgraph = layerGraph', 'lgraph = layerGraph(layers)'],
      description: ['lgraph = layerGraph(layers) creates a layer graph from a layer array, for use with trainNetwork or dlnetwork.'],
      seealso: ['dlnetwork', 'trainNetwork', 'analyzenetwork'],
    },
    analyzenetwork: {
      summary: 'Analyze deep learning network architecture',
      syntax: ['analyzenetwork(net)', 'info = analyzenetwork(net)'],
      description: ['analyzenetwork(net) returns a summary with NumLayers and TotalLearnables counts.'],
      seealso: ['trainNetwork', 'dlnetwork', 'layerGraph'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Optimization Toolbox, extracted from optim.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_OPTIM: Record<string, HelpEntry | string> = {
    linprog: {
      summary: 'Linear programming solver',
      syntax: ['x = linprog(f,A,b)', 'x = linprog(f,A,b,Aeq,beq)'],
      description: ['x = linprog(f,A,b) minimises f\'x subject to A*x <= b, using a two-phase revised simplex method.'],
      seealso: ['quadprog', 'intlinprog', 'fmincon', 'optimoptions'],
    },
    quadprog: {
      summary: 'Quadratic programming solver',
      syntax: ['x = quadprog(H,f)', 'x = quadprog(H,f,A,b)'],
      description: ['x = quadprog(H,f) minimises 0.5*x\'*H*x + f\'*x.'],
      seealso: ['linprog', 'fmincon', 'optimoptions'],
    },
    fminunc: {
      summary: 'Solve unconstrained multivariable nonlinear minimization',
      syntax: ['x = fminunc(fun,x0)', '[x,fval,exitflag] = fminunc(fun,x0)'],
      description: ['x = fminunc(fun,x0) finds a local minimum of fun starting from x0.'],
      seealso: ['fmincon', 'fminsearch', 'optimoptions'],
    },
    fmincon: {
      summary: 'Solve constrained nonlinear multivariable minimization',
      syntax: ['x = fmincon(fun,x0,A,b)', 'x = fmincon(fun,x0,A,b,Aeq,beq)'],
      description: ['x = fmincon(fun,x0,A,b,Aeq,beq,lb,ub) minimises fun subject to linear and bound constraints.'],
      seealso: ['fminunc', 'linprog', 'quadprog', 'optimoptions'],
    },
    fsolve: {
      summary: 'Solve system of nonlinear equations',
      syntax: ['x = fsolve(fun,x0)', '[x,fval,exitflag] = fsolve(fun,x0)'],
      description: ['x = fsolve(fun,x0) finds x such that fun(x)=0.'],
      seealso: ['fminunc', 'lsqnonlin', 'optimoptions'],
    },
    lsqnonlin: {
      summary: 'Solve nonlinear least-squares problems',
      syntax: ['x = lsqnonlin(fun,x0)', 'x = lsqnonlin(fun,x0,lb,ub)'],
      description: ['x = lsqnonlin(fun,x0) finds x that minimises sum(fun(x).^2).'],
      seealso: ['lsqcurvefit', 'lsqlin', 'fsolve', 'optimoptions'],
    },
    lsqcurvefit: {
      summary: 'Solve nonlinear curve-fitting (data-fitting) problems',
      syntax: ['x = lsqcurvefit(fun,x0,xdata,ydata)', 'x = lsqcurvefit(fun,x0,xdata,ydata,lb,ub)'],
      description: ['x = lsqcurvefit(fun,x0,xdata,ydata) finds coefficients x minimising ||fun(x,xdata)-ydata||^2.'],
      seealso: ['lsqnonlin', 'lsqlin', 'curve_fitting', 'optimoptions'],
    },
    lsqlin: {
      summary: 'Solve constrained linear least-squares problems',
      syntax: ['x = lsqlin(C,d,A,b)', 'x = lsqlin(C,d,A,b,Aeq,beq)'],
      description: ['x = lsqlin(C,d,A,b) minimises ||C*x-d||^2 subject to A*x<=b.'],
      seealso: ['lsqnonlin', 'quadprog', 'optimoptions'],
    },
    intlinprog: {
      summary: 'Mixed-integer linear programming (MILP)',
      syntax: ['x = intlinprog(f,intcon,A,b)', 'x = intlinprog(f,intcon,A,b,Aeq,beq,lb,ub)'],
      description: ['x = intlinprog(f,intcon,A,b) minimises f\'x subject to A*x<=b with x(intcon) integer-valued.'],
      seealso: ['linprog', 'optimoptions'],
    },
    optimoptions: {
      summary: 'Create optimization options',
      syntax: ["options = optimoptions('fmincon')", "options = optimoptions('fmincon','Algorithm','sqp')"],
      description: ["options = optimoptions('solver',Name,Value) creates an options object for the named solver."],
      seealso: ['optimset', 'fmincon', 'linprog', 'fsolve'],
    },
    optimset: {
      summary: 'Create or modify optimization options structure',
      syntax: [
        'options = optimset(Name,Value)',
        'options = optimset(oldoptions,Name,Value)',
      ],
      description: ['optimset creates an options structure for use with fminbnd, fminsearch, fzero (legacy interface).'],
      seealso: ['optimoptions', 'fminsearch', 'fminbnd', 'fzero'],
    },
    optimvar: {
      summary: 'Create optimization variable for problem-based approach',
      syntax: ['x = optimvar(name)', 'x = optimvar(name,n)'],
      description: ["x = optimvar('x',n) creates an n-element continuous optimization variable named 'x'."],
      seealso: ['optimproblem', 'optimoptions'],
    },
    optimproblem: {
      summary: 'Create optimization problem',
      syntax: ['prob = optimproblem', "prob = optimproblem('Objective',expr)"],
      description: ['prob = optimproblem creates a minimization problem object for the problem-based workflow.'],
      seealso: ['optimvar', 'optimoptions'],
    },
    fgoalattain: {
      summary: 'Solve multiobjective goal attainment problems',
      syntax: [
        'x = fgoalattain(fun,x0,goal,weight)',
        '[x,fval,attainfactor,exitflag] = fgoalattain(fun,x0,goal,weight,A,b,Aeq,beq,lb,ub)',
      ],
      description: ['x = fgoalattain(fun,x0,goal,weight) minimises the attainment factor gamma such that F(x) - weight*gamma <= goal.'],
      seealso: ['fmincon', 'fminimax', 'gamultiobj', 'optimoptions'],
    },
    fminimax: {
      summary: 'Solve minimax constraint problems',
      syntax: [
        'x = fminimax(fun,x0)',
        '[x,fval,maxfval,exitflag] = fminimax(fun,x0,A,b,Aeq,beq,lb,ub,nonlcon)',
      ],
      description: ['x = fminimax(fun,x0) finds x that minimises the worst-case value max_i F_i(x), where F = fun(x).'],
      seealso: ['fmincon', 'fgoalattain', 'fseminf', 'optimoptions'],
    },
    fseminf: {
      summary: 'Solve semi-infinitely constrained minimisation problems',
      syntax: [
        'x = fseminf(fun,x0,ntheta,seminfcon)',
        '[x,fval,exitflag] = fseminf(fun,x0,ntheta,seminfcon,A,b,Aeq,beq,lb,ub)',
      ],
      description: ['Minimises fun(x) subject to ntheta semi-infinite constraints returned by seminfcon, which are sampled on a grid and enforced as ordinary inequalities.'],
      seealso: ['fmincon', 'fminimax', 'optimoptions'],
    },
    coneprog: {
      summary: 'Second-order cone programming solver',
      syntax: [
        'x = coneprog(f,socConstraints)',
        '[x,fval,exitflag] = coneprog(f,socConstraints,A,b,Aeq,beq,lb,ub)',
      ],
      description: ["Minimises f'*x subject to the second-order cone constraints ||Asc*x - bsc|| <= dsc'*x - gamma, plus optional linear constraints and bounds."],
      seealso: ['secondordercone', 'linprog', 'quadprog', 'fmincon'],
    },
    secondordercone: {
      summary: 'Create second-order cone constraint for coneprog',
      syntax: ['socc = secondordercone(A,b,d,gamma)'],
      description: [
        "secondordercone(A,b,d,gamma) defines the cone ||A*x - b|| <= d'*x - gamma for use with coneprog.",
      ],
      seealso: ['coneprog'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Parallel Computing Toolbox, extracted from parallel.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_PARALLEL: Record<string, HelpEntry | string> = {
    parpool: {
      summary: 'Create or access parallel pool',
      syntax: ['p = parpool', 'p = parpool(n)', "p = parpool('local',n)"],
      description: [
        'p = parpool(n) opens a parallel pool with n workers.',
        'In the web sandbox, workers=1 and execution is sequential.',
      ],
      seealso: ['gcp', 'delete', 'parfor'],
    },
    gcp: {
      summary: 'Get current parallel pool',
      syntax: ['p = gcp', "p = gcp('nocreate')"],
      description: ['p = gcp returns the current parallel pool, creating one if needed.'],
      seealso: ['parpool', 'delete'],
    },
    gpuArray: {
      summary: 'Create array on GPU',
      syntax: ['A = gpuArray(X)', 'A = gpuArray(n,classname)'],
      description: [
        'A = gpuArray(X) copies X to the GPU.',
        'In the web sandbox, this is a pass-through — the array remains on the CPU.',
      ],
      seealso: ['gather', 'isgpuarray', 'pagefun'],
    },
    gather: {
      summary: 'Retrieve data from GPU array',
      syntax: ['X = gather(A)'],
      description: ['X = gather(A) transfers A from GPU to CPU memory. Pass-through in the web sandbox.'],
      seealso: ['gpuArray', 'isgpuarray'],
    },
    isgpuarray: {
      summary: 'Determine whether input is gpuArray',
      syntax: ['tf = isgpuarray(A)'],
      description: ['tf = isgpuarray(A) returns false in the web sandbox (no GPU available).'],
      seealso: ['gpuArray', 'gather'],
    },
    pagefun: {
      summary: 'Apply function to each page of N-D array',
      syntax: ['B = pagefun(func,A)', 'B = pagefun(func,A1,A2,...)'],
      description: ['B = pagefun(func,A) applies func to each page (3rd-dimension slice) of A.'],
      seealso: ['gpuArray', 'arrayfun'],
    },
    distributed: {
      summary: 'Create distributed array',
      syntax: ['D = distributed(X)'],
      description: ['D = distributed(X) distributes X across parallel workers. Pass-through in the sandbox.'],
      seealso: ['codistributed', 'gather'],
    },
    codistributed: {
      summary: 'Create codistributed array',
      syntax: ['D = codistributed(X)', 'D = codistributed(X,codist)'],
      description: ['D = codistributed(X) creates a codistributed array. Pass-through in the sandbox.'],
      seealso: ['distributed', 'gather'],
    },
    batch: {
      summary: 'Run MATLAB function or script as batch job',
      syntax: ['j = batch(fcn)', "j = batch(fcn,'Workspace',ws)"],
      description: ['j = batch(fcn) submits fcn as a background batch job. Returns a stub job object in the sandbox.'],
      seealso: ['parpool', 'submit', 'wait'],
    },
    spmdindex: {
      summary: 'Index of current worker in spmd block',
      syntax: ['idx = spmdindex'],
      description: ['spmdindex returns 1 in the sandbox (single-worker execution).'],
      seealso: ['spmdsize', 'spmd'],
    },
    spmdsize: {
      summary: 'Number of workers in spmd block',
      syntax: ['n = spmdsize'],
      description: ['spmdsize returns 1 in the sandbox.'],
      seealso: ['spmdindex', 'spmd'],
    },
    parfeval: {
      summary: 'Evaluate function asynchronously on parallel pool worker',
      syntax: [
        'f = parfeval(pool,fcn,nargout,X1,...,Xn)',
        'f = parfeval(fcn,nargout,X1,...,Xn)',
      ],
      description: [
        'f = parfeval(pool,fcn,nargout,X1,...,Xn) submits fcn(X1,...,Xn) for asynchronous evaluation.',
        'In the web sandbox, execution is synchronous. Use fetchOutputs(f) to retrieve results.',
        'f is a parallel.FevalFuture object with State="finished" immediately.',
      ],
      seealso: ['fetchOutputs', 'parpool', 'parfor'],
    },
    fetchOutputs: {
      summary: 'Retrieve all output arguments from a parfeval future',
      syntax: ['[X1,...,Xn] = fetchOutputs(f)'],
      description: ['Returns the NumOutputArguments results stored in a finished parfeval future f.'],
      seealso: ['parfeval', 'parpool'],
    },
    gputimeit: { summary: 'Time required to run function on GPU',
      syntax: ['t = gputimeit(f)', 't = gputimeit(f,n)'],
      seealso: ['gpuArray', 'timeit'], description: ['t = gputimeit(F) measures the typical time, in seconds, required to run the function specified by the function handle F. The function handle accepts no external input arguments, but you can define it with input arguments to its internal function call.', 't = gputimeit(F,numOutputs) calls F with the desired number of output arguments, numOutputs. By default, gputimeit calls the function F with one output argument, or no output arguments if F does not return any output.'] },
    validategpu: { summary: 'Validate MATLAB GPU support for current system',
      syntax: ['validategpu'],
      seealso: ['gpuArray', 'gpuDeviceCount'], description: ['validateGPU validates the currently selected GPU device. If no GPU device is selected, then the function validates the default device.', 'validateGPU("all") validates all GPU devices detected in your system.', 'validateGPU(ind) validates the GPU devices specified by indices ind.', 'Tip', 'Validating your GPU device is not required. Use the validateGPU function to diagnose problems with your GPU setup.'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Partial Differential Equation Toolbox, extracted from pde.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_PDE: Record<string, HelpEntry | string> = {
    assema: { summary: 'Assemble area integral contributions for PDE FEM', syntax: ['[K,M,F] = assema(p,t,c,a,f)'], seealso: ['pdetrg', 'pdeintrp'] },
    pdetrg: { summary: 'Triangle geometry data (areas and midpoints)', syntax: ['[ar,g] = pdetrg(p,t)'], seealso: ['pdetriq', 'assema'] },
    pdetriq: { summary: 'Triangle mesh quality (circumradius/inradius ratio)', syntax: ['q = pdetriq(p,t)'], seealso: ['pdetrg', 'jigglemesh'] },
    pdeintrp: { summary: 'Interpolate PDE solution in mesh points', syntax: ['up = pdeintrp(p,t,u)'], seealso: ['pdeprtni', 'tri2grid'] },
    pdeprtni: { summary: 'Interpolate PDE triangle solution to nodes', syntax: ['un = pdeprtni(p,t,ut)'], seealso: ['pdeintrp'] },
    pdegrad: { summary: 'Gradient of PDE solution', syntax: ['[ux,uy] = pdegrad(p,t,u)'], seealso: ['pdeintrp', 'pdetrg'] },
    pdesdt: { summary: 'PDE subdomain data for triangles', syntax: ['[cs,t] = pdesdt(c,t,sdl)'], seealso: ['pdesde'] },
    pdesde: { summary: 'PDE subdomain data for edges', syntax: ['[cs,e] = pdesde(c,e,sdl)'], seealso: ['pdesdt'] },
    pdearcl: { summary: 'Returns parameter values for a parametrized curve corresponding to a given set of arc length values.', syntax: ['pp = pdearcl(p,xy,s,s0,s1)'], seealso: ['pdegplot'], description: ['pp = pdearcl(p,xy,s,s0,s1) returns parameter values for a parametrized curve corresponding to a given set of arc length values.'] },
    tri2grid: { summary: 'Interpolate solution from triangle mesh to rectangular grid', syntax: ['ug = tri2grid(p,t,u,x,y)'], seealso: ['pdeintrp', 'initmesh'] },
    jigglemesh: { summary: 'Jiggles the triangular mesh by adjusting the node point positions.', syntax: ['p1 = jigglemesh(p,e,t)', 'p1 = jigglemesh(p,e,t,Name,Value)'], seealso: ['initmesh', 'pdetriq'], description: ['p1 = jigglemesh(p,e,t) jiggles the triangular mesh by adjusting the node point positions. Typically, the quality of the mesh increases after jiggling.'] },
    poiasma: { summary: "Assemble stiffness matrix for Poisson equation on a rectangular grid", syntax: ['A = poiasma(nx,ny)', 'A = poiasma(nx,ny,h1,h2)'], description: ["A = poiasma(nx,ny) assembles the sparse finite-difference stiffness matrix for the 2-D Poisson equation on an nx-by-ny interior grid. Used with poicalc to solve Poisson's equation."], seealso: ['poicalc', 'delsq', 'numgrid'] },
    poicalc: { summary: "Solve Poisson equation on a rectangular grid", syntax: ['u = poicalc(f,hx,hy,nx,ny)'], description: ["u = poicalc(f,hx,hy,nx,ny) solves −Δu = f on a rectangular grid with spacing hx and hy, returning the interior solution vector u. Uses the DST-based fast Poisson solver."], seealso: ['poiasma', 'delsq', 'numgrid', 'dst'] },
    dst: { summary: 'Discrete sine transform', syntax: ['y = dst(x)'], seealso: ['idst', 'dct'] },
    idst: { summary: 'Inverse discrete sine transform', syntax: ['x = idst(y)'], seealso: ['dst', 'idct'] },
    createpde: { summary: 'Create a PDE model object', syntax: ['model = createpde()'], description: ['model = createpde() creates a PDEModel for a stationary scalar problem. This sandbox v1 solves −∇·(c∇u)+a·u=f on the unit disk (circleg) or unit square (squareg) with Dirichlet boundary conditions.'], seealso: ['geometryFromEdges', 'generateMesh', 'specifyCoefficients', 'applyBoundaryCondition', 'solvepde', 'pdeplot'] },
    geometryFromEdges: { summary: 'Attach 2-D geometry to a PDE model', syntax: ['geometryFromEdges(model,@circleg)', 'geometryFromEdges(model,@squareg)'], description: ['Sets the model geometry from a geometry function. v1 supports @circleg (unit disk) and @squareg (unit square).'], seealso: ['createpde', 'generateMesh', 'circleg', 'squareg'] },
    generateMesh: { summary: 'Generate a triangular FEM mesh', syntax: ['generateMesh(model)', 'generateMesh(model,"Hmax",h)'], description: ['Builds a triangular mesh with target element size h, stored in model.Mesh (Nodes 2×Np, Elements 4×Nt).'], seealso: ['createpde', 'geometryFromEdges', 'solvepde'] },
    specifyCoefficients: { summary: 'Set PDE coefficients', syntax: ['specifyCoefficients(model,"m",0,"d",0,"c",c,"a",a,"f",f)'], description: ['Sets the coefficients of −∇·(c∇u)+a·u=f (scalar c, a, f; m and d ignored in v1).'], seealso: ['createpde', 'solvepde'] },
    applyBoundaryCondition: { summary: 'Apply a boundary condition', syntax: ['applyBoundaryCondition(model,"dirichlet","Edge",edges,"u",val)'], description: ['Applies a Dirichlet condition u=val on the boundary (v1: a single uniform value over the whole boundary).'], seealso: ['createpde', 'solvepde'] },
    solvepde: { summary: 'Solve a stationary PDE model', syntax: ['R = solvepde(model)'], description: ['Assembles and solves the P1 finite-element system, returning results with R.NodalSolution.'], seealso: ['createpde', 'generateMesh', 'pdeplot'] },
    pdeplot: { summary: 'Plot PDE mesh/solution', syntax: ['pdeplot(model,"XYData",u)'], description: ['Draws the triangulation filled with colour mapped from the nodal data u.'], seealso: ['solvepde', 'generateMesh'] },
    circleg: { summary: 'Unit-disk geometry function (use with geometryFromEdges)', syntax: ['geometryFromEdges(model,@circleg)'], seealso: ['geometryFromEdges', 'squareg'] },
    squareg: { summary: 'Unit-square geometry function (use with geometryFromEdges)', syntax: ['geometryFromEdges(model,@squareg)'], seealso: ['geometryFromEdges', 'circleg'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Phased Array System Toolbox, extracted from phased.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_PHASED: Record<string, HelpEntry | string> = {
    az2broadside: {
      summary: 'Convert azimuth angle to broadside angle',
      syntax: ['bsang = az2broadside(az)', 'bsang = az2broadside(az,el)'],
      description: [
        'bsang = az2broadside(az,el) converts azimuth AZ and elevation EL (both in degrees) to the broadside angle of a ULA.',
        'Formula: bsang = asind(sind(az).*cosd(el)).',
        'AZ must be in [-180,180]; EL must be in [-90,90]. EL defaults to 0.',
        'Both inputs may be scalars or same-size vectors.',
      ],
      seealso: ['broadside2az', 'steervec', 'cbfweights'],
    },
    broadside2az: {
      summary: 'Convert broadside angle to azimuth angle',
      syntax: ['az = broadside2az(bsang)', 'az = broadside2az(bsang,el)'],
      description: [
        'az = broadside2az(bsang,el) converts broadside angle BSANG and elevation EL (degrees) to azimuth.',
        'Formula: az = asind(sind(bsang)./cosd(el)).',
        'BSANG and EL must satisfy |el| < 90 - |bsang|.',
        'EL defaults to 0.',
      ],
      seealso: ['az2broadside', 'steervec', 'cbfweights'],
    },
    azel2uv: {
      summary: 'Convert azimuth/elevation angles to u/v space',
      syntax: ['uv = azel2uv(azel)'],
      description: [
        'uv = azel2uv(azel) converts a 2×N [azimuth; elevation] matrix (degrees) to the corresponding 2×N [u; v] matrix.',
        'Boresight is the +X axis. Azimuth is from X toward Y; elevation is from the XY plane toward Z.',
        'u = cosd(el).*sind(az),  v = sind(el).',
        'Azimuth must be in [-90,90]; elevation in [-90,90].',
      ],
      seealso: ['uv2azel', 'az2broadside', 'steervec'],
    },
    uv2azel: {
      summary: 'Convert u/v coordinates to azimuth/elevation angles',
      syntax: ['azel = uv2azel(uv)'],
      description: [
        'azel = uv2azel(uv) converts a 2×N [u; v] matrix (u²+v²≤1) to the corresponding 2×N [azimuth; elevation] matrix in degrees.',
        'el = asind(v),  az = asind(u./sqrt(1-v.^2)).',
        'Both u and v must be in [-1,1] and satisfy u²+v² ≤ 1.',
      ],
      seealso: ['azel2uv', 'az2broadside', 'steervec'],
    },
    cbfweights: {
      summary: 'Conventional (delay-and-sum) beamformer weights',
      syntax: ['w = cbfweights(pos,ang)'],
      description: [
        'w = cbfweights(pos,ang) returns the N×M complex weight matrix for a sensor array.',
        'pos: 1×N (y-coords), 2×N ([y;z]), or 3×N ([x;y;z]) element positions in wavelengths.',
        'ang: 1×M azimuth angles or 2×M [azimuth;elevation] in degrees.',
        'Each column of w is the steering vector for the corresponding direction, divided by N.',
        'w = steervec(pos,ang) / N.',
      ],
      seealso: ['steervec', 'mvdrweights', 'az2broadside', 'azel2uv'],
    },
    steervec: {
      summary: 'Steering vector for a sensor array',
      syntax: ['sv = steervec(pos,ang)', 'sv = phased.steervec(pos,ang)'],
      description: [
        'sv = steervec(pos,ang) returns the N×M complex steering-vector matrix for a sensor array.',
        'pos: 1×N (y), 2×N ([y;z]) or 3×N ([x;y;z]) element positions in units of signal wavelength.',
        'ang: 1×M azimuth angles or 2×M [azimuth;elevation] in degrees. cbfweights = steervec/N.',
        'Note: the name is also owned by the radar toolbox (default pick). Use phased.steervec(...)',
        "or useToolbox('phased') to force this implementation.",
      ],
      seealso: ['cbfweights', 'az2broadside', 'azel2uv', 'useToolbox'],
    },
    aperture2gain: {
      summary: 'Convert effective aperture to antenna gain',
      syntax: ['g = aperture2gain(a,lambda)', 'g = phased.aperture2gain(a,lambda)'],
      description: [
        'g = aperture2gain(a,lambda) returns the antenna gain in dBi for effective aperture a (m^2):',
        'g = 10*log10(4*pi*a/lambda^2). Inputs may be vectors (a scalar broadcasts).',
      ],
      seealso: ['gain2aperture', 'freq2wavelen'],
    },
    physconst: {
      summary: 'Physical constants',
      syntax: ["c = physconst('LightSpeed')", "k = physconst('Boltzmann')", "re = physconst('EarthRadius')"],
      description: [
        'physconst(name) returns a physical constant in SI units. Supported names (case/space-insensitive):',
        "'LightSpeed' = 299792458 m/s, 'Boltzmann' = 1.380649e-23 J/K, 'EarthRadius' = 6371000 m.",
      ],
      seealso: ['freq2wavelen'],
    },
    freq2wavelen: {
      summary: 'Convert frequency to wavelength',
      syntax: ['lambda = freq2wavelen(freq)', 'lambda = freq2wavelen(freq,c)'],
      description: [
        'lambda = freq2wavelen(freq) returns the wavelength c/freq, with c the speed of light.',
        'lambda = freq2wavelen(freq,c) uses a custom propagation speed c. freq may be a vector.',
      ],
      seealso: ['wavelen2freq', 'physconst'],
    },
    wavelen2freq: {
      summary: 'Convert wavelength to frequency',
      syntax: ['freq = wavelen2freq(lambda)', 'freq = wavelen2freq(lambda,c)'],
      description: [
        'freq = wavelen2freq(lambda) returns the frequency c/lambda, with c the speed of light.',
        'freq = wavelen2freq(lambda,c) uses a custom propagation speed c. lambda may be a vector.',
      ],
      seealso: ['freq2wavelen', 'physconst'],
    },
    gain2aperture: {
      summary: 'Convert antenna gain to effective aperture',
      syntax: ['a = gain2aperture(g,lambda)'],
      description: [
        'a = gain2aperture(g,lambda) returns the effective aperture (m^2) for an antenna of gain g (dBi)',
        'at wavelength lambda (m): a = lambda^2 * 10^(g/10) / (4*pi). Inputs may be vectors (a scalar broadcasts).',
      ],
      seealso: ['freq2wavelen', 'physconst'],
    },
    albersheim: {
      summary: "Required SNR from Albersheim's equation",
      syntax: ['snr = albersheim(prob_det,prob_fa)', 'snr = albersheim(prob_det,prob_fa,N)'],
      description: [
        'snr = albersheim(Pd,Pfa,N) returns the single-sample SNR (dB) needed to achieve detection',
        'probability Pd at false-alarm probability Pfa, integrating N pulses noncoherently (default N=1),',
        'for a nonfluctuating target in white Gaussian noise (linear detector). Albersheim approximation.',
      ],
      seealso: ['shnidman', 'rocsnr'],
    },
    rocsnr: {
      summary: 'Receiver operating characteristic curves by SNR',
      syntax: ["[Pd,Pfa] = rocsnr(SNRdB)", "[Pd,Pfa] = rocsnr(SNRdB,Name,Value)"],
      description: [
        'Computes the detection probability Pd over a log-spaced grid of false-alarm probabilities Pfa for each',
        'input SNR (dB). Pfa is returned as a column; Pd has one column per SNR value.',
        "Supported signal type: 'NonfluctuatingCoherent' (default). Name-Value: NumPulses, MinPfa, MaxPfa, NumPoints.",
        'NonfluctuatingCoherent model: Pd = Q(Qinv(Pfa) - sqrt(2*NumPulses*SNRlinear)).',
      ],
      seealso: ['rocpfa', 'albersheim', 'shnidman'],
    },
    rocpfa: {
      summary: 'Receiver operating characteristic curves by false-alarm probability',
      syntax: ["[Pd,SNR] = rocpfa(Pfa)", "[Pd,SNR] = rocpfa(Pfa,Name,Value)"],
      description: [
        'Computes the detection probability Pd over a linear grid of SNR (dB) for each input false-alarm',
        'probability Pfa. SNR is returned as a column; Pd has one column per Pfa value.',
        "Supported signal type: 'NonfluctuatingCoherent' (default). Name-Value: NumPulses, MinSNR, MaxSNR, NumPoints.",
      ],
      seealso: ['rocsnr', 'albersheim', 'shnidman'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Radar Toolbox, extracted from radar.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_RADAR: Record<string, HelpEntry | string> = {
    dop2speed: { summary: 'Convert Doppler shift to speed', syntax: ['speed = dop2speed(dop,lambda)'], seealso: ['speed2dop', 'range2time'] },
    speed2dop: { summary: 'Convert speed to Doppler shift', syntax: ['dop = speed2dop(speed,lambda)'], seealso: ['dop2speed', 'radareqsnr'] },
    range2time: { summary: 'Convert range to propagation time', syntax: ['t = range2time(rng)', 't = range2time(rng,propspeed)'], seealso: ['time2range', 'range2bw'] },
    time2range: { summary: 'Convert propagation time to range', syntax: ['rng = time2range(t)', 'rng = time2range(t,propspeed)'], seealso: ['range2time', 'radareqrng'] },
    range2bw: { summary: 'Convert range resolution to bandwidth', syntax: ['bw = range2bw(rangeres)', 'bw = range2bw(rangeres,propspeed)'], seealso: ['range2time', 'radareqrng'] },
    radareqsnr: { summary: 'Estimates the output signal-to-noise ratio, SNR, at the receiver based on the wavelength lambda, the range tgtrng, the peak transmit power Pt, and the pulse width tau.', syntax: ['SNR = radareqsnr(lambda,tgtrng,Pt,tau)', 'SNR = radareqsnr(lambda,tgtrng,Pt,tau,Name,Value)'], seealso: ['phased.Transmitter', 'phased.ReceiverPreamp', 'noisepow', 'radareqpow', 'radareqrng'], description: ['SNR = radareqsnr(lambda,tgtrng,Pt,tau) estimates the output signal-to-noise ratio, SNR, at the receiver based on the wavelength lambda, the range tgtrng, the peak transmit power Pt, and the pulse width tau.', 'SNR = radareqsnr(lambda,tgtrng,Pt,tau,Name,Value) estimates the output SNR at the receiver with additional options specified by one or more Name,Value pair arguments.'] },
    radareqpow: { summary: 'Estimates the peak transmit power, Pt, required for a radar operating at a wavelength of lambda meters to achieve the specified signal-to-noise ratio, SNR, in decibels for a targe', syntax: ['Pt = radareqpow(lambda,tgtrng,SNR,tau)', 'Pt = radareqpow(lambda,tgtrng,SNR,tau,Name,Value)'], seealso: ['phased.Transmitter', 'phased.ReceiverPreamp', 'noisepow', 'radareqrng', 'radareqsnr'], description: ['Pt = radareqpow(lambda,tgtrng,SNR,tau) estimates the peak transmit power, Pt, required for a radar operating at a wavelength of lambda meters to achieve the specified signal-to-noise ratio, SNR, in decibels for a target at a range of tgtrng meters. tau is the pulse width. The target has a nonfluctuating radar cross section (RCS) of 1 square meter.', 'Pt = radareqpow(lambda,tgtrng,SNR,tau,Name,Value) estimates the required peak transmit power with additional options specified by one or more Name,Value pair arguments.'] },
    radareqrng: { summary: 'Estimates the theoretical maximum detectable range maxrng for a radar operating with a wavelength of lambda meters with a pulse duration of Tau seconds.', syntax: ['maxrng = radareqrng(lambda,SNR,Pt,tau)', 'maxrng = radareqrng(lambda,SNR,Pt,tau,Name,Value)'], seealso: ['phased.Transmitter', 'phased.ReceiverPreamp', 'noisepow', 'radareqpow', 'radareqsnr'], description: ['maxrng = radareqrng(lambda,SNR,Pt,tau) estimates the theoretical maximum detectable range maxrng for a radar operating with a wavelength of lambda meters with a pulse duration of Tau seconds. The signal-to-noise ratio is SNR decibels, and the peak transmit power is Pt watts.', 'maxrng = radareqrng(lambda,SNR,Pt,tau,Name,Value) estimates the theoretical maximum detectable range with additional options specified by one or more Name,Value pair arguments.'] },
    aperture2gain: { summary: 'Returns the antenna gain GdB corresponding to an effective aperture A for an incident electromagnetic wave with wavelength lambda.', syntax: ['GdB = aperture2gain(A,lambda)'], seealso: ['gain2aperture'], description: ['GdB = aperture2gain(A,lambda) returns the antenna gain GdB corresponding to an effective aperture A for an incident electromagnetic wave with wavelength lambda.'] },
    grnd2slantrange: { summary: 'Returns the slant range slrng corresponding to the ground range projection grndrng.', syntax: ['slrng = grnd2slantrange(grndrng,grazang)'], seealso: ['rainelres', 'sarazres', 'slant2grndrange'], description: ['slrng = grnd2slantrange(grndrng,grazang) returns the slant range slrng corresponding to the ground range projection grndrng.'] },
    sarnoiserefl: { summary: 'Computes the noise equivalent reflectivity.', syntax: ['neq = sarnoiserefl(freq,freqref,imgsnr,sigmaref)', 'neq = sarnoiserefl(freq,freqref,imgsnr,sigmaref,n)'], seealso: ['radareqsarpow', 'radareqsarrng', 'radareqsarsnr', 'rainscr'], description: ['neq = sarnoiserefl(freq,freqref,imgsnr,sigmaref) computes the noise equivalent reflectivity.', 'neq = sarnoiserefl(freq,freqref,imgsnr,sigmaref,n) specifies a frequency-dependent proportionality factor that depends upon the target characteristics.'] },
    mtifactor: { summary: 'Calculates the MTI improvement factor in dB given the number of pulses in an (M - 1) delay canceler, M, the transmitted frequency, FREQ, and the pulse repetition frequency, PRF.', syntax: ['IM = mtifactor(M,FREQ,PRF)', 'IM = mtifactor(M,FREQ,PRF,Name,Value)'], seealso: ['mtiloss', 'cfarloss'], description: ['IM = mtifactor(M,FREQ,PRF) calculates the MTI improvement factor in dB given the number of pulses in an (M \\- 1) delay canceler, M, the transmitted frequency, FREQ, and the pulse repetition frequency, PRF. This syntax assumes you are using coherent processing, a clutter with mean velocity of 0 m/s, and a standard deviation in clutter spread of 2 m/s.', 'IM = mtifactor(M,FREQ,PRF,Name,Value) specifies additional options using name-value arguments. For example, IM = mtifactor(4,200e9,250,\'IsCoherent\',false) calculates the MTI improvement factor assuming you are using noncoherent MTI processing. You can specify multiple name-value arguments.'] },
    steervec: { summary: 'Compute steering vector for an array', syntax: ['sv = steervec(pos,ang)', 'sv = steervec(pos,ang,freq)'], seealso: ['aperture2gain'] },
    sarbeamcompratio: { summary: 'Computes the beam compression ratio to illuminate a scene.', syntax: ['bcr = sarbeamcompratio(r,lambda,synlen,wa)', 'bcr = sarbeamcompratio(r,lambda,synlen,wa,Name,Value)'], seealso: ['sarbeamwidth', 'sarlen'], description: ['bcr = sarbeamcompratio(r,lambda,synlen,wa) computes the beam compression ratio to illuminate a scene.', 'bcr = sarbeamcompratio(r,lambda,synlen,wa,Name,Value) specifies additional options using name-value arguments.'] },
    bistaticSurfaceReflectivityLand: { summary: 'Bistatic land surface reflectivity', syntax: ['gamma = bistaticSurfaceReflectivityLand(elev_tx,elev_rx,model)'], seealso: ['sarnoiserefl'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the RF Toolbox, extracted from rf.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_RF: Record<string, HelpEntry | string> = {
    abcd2h: { summary: 'Converts the ABCD-parameters to the hybrid parameters.', syntax: ['h_params = abcd2h(abcd_params)'], seealso: ['abcd2s', 'abcd2y', 'abcd2z', 'z2abcd', 'h2abcd'], description: ['h_params = abcd2h(abcd_params) converts the ABCD-parameters to the hybrid parameters. For more information see, RF Network Parameter Objects.'] },
    gammams: { summary: 'Calculates the source reflection coefficient of a two-port network required for simultaneous conjugate match.', syntax: ['coefficient = gammams(s_params)', 'coefficient = gammams(hs)'], description: ['coefficient = gammams(s_params) calculates the source reflection coefficient of a two-port network required for simultaneous conjugate match.', 'coefficient = gammams(hs) calculates the source reflection coefficient of the two-port network represented by the S-parameter object hs.'] },
    powergain: { summary: "Calculate 2-port network power gain", syntax: ["g = powergain(s_params,z0,zs,zl,'Gt')", "g = powergain(s_params,z0,zs,'Ga')", "g = powergain(s_params,z0,zl,'Gp')", "g = powergain(s_params,'Gmag')"], description: ["g = powergain(s_params,z0,zs,zl,type) computes the specified power gain of a 2-port S-parameter network. Types: 'Gt' transducer, 'Ga' available, 'Gp' operating, 'Gmag' maximum available, 'Gmsg' maximum stable."], seealso: ['stabilityk', 'stabilitymu', 'gammams'] },
    s2scc: { summary: 'Functionconverts the 2N-port single-ended S-parameters to N-port common-mode S-parameters.', syntax: ['scc_params = s2scc(s_params)', 'scc_params = s2scc(s_params,option)'], seealso: ['s2abcd', 's2h', 's2s', 's2sdd', 's2smm'], description: ['scc_params = s2scc(s_params)converts the 2 _N_ -port single-ended S-parameters to _N_ -port common-mode S-parameters.', 'scc_params = s2scc(s_params,option) converts S-parameters based on the port-ordering convention specified in option argument.'] },
    stabilityk: { summary: 'Calculates and returns the stability factor, k, and the conditions b1, b2, and delta for the two-port network.', syntax: ['[k,b1,b2,delta] = stabilityk(s_params)', '[k,b1,b2,delta] = stabilityk(hs)'], seealso: ['stabilitymu'], description: ['[k,b1,b2,delta] = stabilityk(s_params) calculates and returns the stability factor, k, and the conditions b1, b2, and delta for the two- port network.', '[k,b1,b2,delta] = stabilityk(hs) calculates and returns the stability factor and stability conditions for the two-port network represented by the S-parameter object hs.'] },
    s2abcd: { summary: 'Functionconverts the scattering parameters to the ABCD-parameters.', syntax: ['abcd_params = s2abcd(s_params,z0)'], seealso: ['abcd2s'], description: ['abcd_params = s2abcd(s_params,z0)converts the scattering parameters to the ABCD-parameters.'] },
    abcd2s: { summary: 'Converts the ABCD-parameters abcd_params into the scattering parameters s_params.', syntax: ['s_params = abcd2s(abcd_params,z0)'], seealso: ['abcd2y', 'abcd2z', 'abcd2h', 's2abcd'], description: ['s_params = abcd2s(abcd_params,z0) converts the ABCD-parameters abcd_params into the scattering parameters s_params. z0 is the reference impedance; its default is 50 ohms.', 's_params is a complex 2 _N_ -by-2 _N_ -by-_M_ array, where _M_ representing number of frequency points of a 2 _N_ -port S-parameters.', 'For more information see, RF Network Parameter Objects.'] },
    s2y: { summary: 'Converts the scattering parameters to the admittance parameters.', syntax: ['y_params = s2y(s_params,z0)'], seealso: ['s2abcd', 's2h', 's2s', 's2sdd', 's2smm'], description: ['y_params = s2y(s_params,z0) converts the scattering parameters to the admittance parameters.'] },
    y2s: { summary: 'Converts Y-parameters to S-parameters.', syntax: ['s_params = y2s(y_params,z0)'], seealso: ['y2abcd', 'y2z', 'y2h', 's2y'], description: ['s_params = y2s(y_params,z0) converts Y-parameters to S-parameters.'] },
    s2z: { summary: 'Converts the scattering parameters to the impedance parameters.', syntax: ['z_params = s2z(s_params,z0)'], seealso: ['s2abcd', 's2h', 's2s', 's2sdd', 's2smm'], description: ['z_params = s2z(s_params,z0) converts the scattering parameters to the impedance parameters.'] },
    z2s: { summary: 'Converts the Z-parameters to the S-parameters.', syntax: ['s_params = z2s(z_params,z0)'], seealso: ['z2abcd', 'z2h', 'z2y', 's2z'], description: ['s_params = z2s(z_params,z0) converts the Z-parameters to the S-parameters.'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Risk Management Toolbox, extracted from risk.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_RISK: Record<string, HelpEntry | string> = {
    valueAtRisk: {
      summary: 'Value at Risk for a parametric distribution',
      syntax: ['VaR = valueAtRisk(distribution, VaRLevel)', 'VaR = valueAtRisk(distribution, VaRLevel, Name, Value)'],
      description: [
        "VaR = valueAtRisk('normal', VaRLevel) computes parametric VaR for the normal distribution.",
        "Normal: VaR = -(Mean + norminv(1-VaRLevel)*StandardDeviation). Defaults: Mean=0, StandardDeviation=1.",
        "t: VaR = -(Location + tinv(1-VaRLevel,nu)*Scale). DegreesOfFreedom (>=3) required.",
        'VaRLevel is in (0,1); positive VaR indicates a loss.',
      ],
      seealso: ['expectedShortfall', 'portvrisk'],
    },
    expectedShortfall: {
      summary: 'Expected Shortfall (CVaR) for a parametric distribution',
      syntax: ['ES = expectedShortfall(distribution, VaRLevel)', 'ES = expectedShortfall(distribution, VaRLevel, Name, Value)'],
      description: [
        "ES = expectedShortfall('normal', VaRLevel) computes parametric Expected Shortfall (CVaR/ES).",
        "Normal: ES = -(Mean - StandardDeviation*normpdf(norminv(VaRLevel))/(1-VaRLevel)).",
        "t: ES = -(Loc - Scale*tpdf(tinv(alpha,nu),nu)*(nu+tinv^2)/((nu-1)*(1-alpha))).",
      ],
      seealso: ['valueAtRisk'],
    },
    concentrationIndices: {
      summary: 'Portfolio concentration indices (Gini, Herfindahl-Hirschman, Theil entropy, etc.)',
      syntax: ['ci = concentrationIndices(portfolioData)', '[ci, Lorenz] = concentrationIndices(portfolioData)'],
      description: [
        'ci = concentrationIndices(data) computes concentration indices for a vector of positive exposures.',
        'Fields: Gini, HH (Herfindahl-Hirschman), HK (Hannah-Kay, alpha=0.5), HT (Hall-Tideman), TE (Theil entropy), CR (concentration ratio, top-1).',
      ],
      seealso: ['asrf'],
    },
    asrf: {
      summary: 'Asymptotic Single Risk Factor (ASRF/Basel II) credit capital model',
      syntax: ['[capital, VaR] = asrf(PD, LGD, R)', '[capital, VaR] = asrf(PD, LGD, R, Name, Value)'],
      description: [
        '[capital, VaR] = asrf(PD, LGD, R) computes Basel II/ASRF regulatory capital.',
        'VaR = EAD*LGD*normcdf((norminv(PD)-sqrt(R)*norminv(1-VaRLevel))/sqrt(1-R)).',
        'capital = VaR - EAD*LGD*PD.',
        "Optional: 'EAD' (default 1), 'VaRLevel' (default 0.999).",
      ],
      seealso: ['concentrationIndices', 'mertonmodel'],
    },
    mertonmodel: {
      summary: "Merton's structural model of default probability",
      syntax: ['[PD,DD,A,Sa] = mertonmodel(Equity,EquityVol,Liability,Rate)', '[PD,DD,A,Sa] = mertonmodel(Equity,EquityVol,Liability,Rate,Name,Value)'],
      description: [
        '[PD,DD,A,Sa] = mertonmodel(E,Se,D,r) solves for implied asset value A and asset volatility Sa.',
        "Optional: 'Maturity' (default 1 year), 'Drift' (default = Rate).",
        'PD = default probability, DD = distance-to-default, A = implied assets, Sa = implied asset vol.',
      ],
      seealso: ['asrf'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Reinforcement Learning Toolbox, extracted from rl.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_RL: Record<string, HelpEntry | string> = {
    rlNumericSpec: {
      summary: 'Create a numeric observation or action specification',
      syntax:  ['spec = rlNumericSpec(dim)'],
      description: ['Creates an rlNumericSpec with the given scalar dimension. LowerLimit=-Inf, UpperLimit=Inf.'],
      seealso: ['rlFiniteSetSpec', 'rlFunctionEnv'],
    },
    rlFiniteSetSpec: {
      summary: 'Create a finite set action specification',
      syntax:  ['spec = rlFiniteSetSpec(elements)'],
      description: ['Creates an rlFiniteSetSpec where elements is a row vector of valid discrete actions.'],
      seealso: ['rlNumericSpec', 'rlQAgent'],
    },
    rlFunctionEnv: {
      summary: 'Create a custom RL environment from step/reset functions',
      syntax:  ['env = rlFunctionEnv(obsInfo, actInfo, stepFn, resetFn)'],
      description: ['stepFn(obs,act) returns [nextObs, reward, isDone]; resetFn() returns initialObs.'],
      seealso: ['train', 'sim'],
    },
    rlTrainingOptions: {
      summary: 'Create training options for RL agent training',
      syntax:  ['opts = rlTrainingOptions(Name,Value,...)'],
      description: ['Name-value pairs: MaxEpisodes (500), MaxStepsPerEpisode (200), Verbose (0),'],
      seealso: ['train', 'rlQAgentOptions', 'rlDQNAgentOptions', 'rlPPOAgentOptions'],
    },
    rlQAgentOptions: {
      summary: 'Create options for Q-learning agent',
      syntax:  ['opts = rlQAgentOptions(Name,Value,...)'],
      description: ['Name-value: DiscountFactor (0.99), LearnRate (0.1), Epsilon (1), EpsilonDecay (0.005), EpsilonMin (0.01).'],
      seealso: ['rlQAgent'],
    },
    rlDQNAgentOptions: {
      summary: 'Create options for DQN agent',
      syntax:  ['opts = rlDQNAgentOptions(Name,Value,...)'],
      description: ['Name-value: DiscountFactor (0.99), LearnRate (1e-3), MiniBatchSize (64), ExperienceBufferLength (10000), TargetUpdateFrequency (100).'],
      seealso: ['rlDQNAgent'],
    },
    rlPPOAgentOptions: {
      summary: 'Create options for PPO agent',
      syntax:  ['opts = rlPPOAgentOptions(Name,Value,...)'],
      description: ['Name-value: DiscountFactor (0.99), GAEFactor (0.95), ClipFactor (0.2), NumEpoch (3), MiniBatchSize (64), LearnRate (3e-4), ExperienceHorizon (128).'],
      seealso: ['rlPPOAgent'],
    },
    rlQAgent: {
      summary: 'Create a Q-learning agent with epsilon-greedy exploration',
      syntax:  ['agent = rlQAgent(obsInfo, actInfo)', 'agent = rlQAgent(obsInfo, actInfo, opts)'],
      description: ['Tabular Q-learning; obsInfo must be rlNumericSpec or rlFiniteSetSpec; actInfo must be rlFiniteSetSpec.'],
      seealso: ['rlDQNAgent', 'train', 'getAction'],
    },
    rlDQNAgent: {
      summary: 'Create a Deep Q-Network (DQN) agent',
      syntax:  ['agent = rlDQNAgent(obsInfo, actInfo)', 'agent = rlDQNAgent(obsInfo, actInfo, opts)'],
      description: ['DQN with 2-layer FC network, experience replay, and target-network soft updates.'],
      seealso: ['rlQAgent', 'rlPPOAgent', 'train'],
    },
    rlPPOAgent: {
      summary: 'Create a Proximal Policy Optimization (PPO) agent',
      syntax:  ['agent = rlPPOAgent(obsInfo, actInfo)', 'agent = rlPPOAgent(obsInfo, actInfo, opts)'],
      description: ['PPO with GAE advantage estimation, clipped surrogate objective, and separate actor/critic networks.'],
      seealso: ['rlDQNAgent', 'train'],
    },
    rlPGAgent: {
      summary: 'Create a REINFORCE policy gradient agent',
      syntax:  ['agent = rlPGAgent(obsInfo, actInfo)'],
      seealso: ['rlACAgent'],
    },
    rlACAgent: {
      summary: 'Create an Actor-Critic (AC) agent',
      syntax:  ['agent = rlACAgent(obsInfo, actInfo)'],
      seealso: ['rlPGAgent', 'rlDDPGAgent'],
    },
    rlDDPGAgent: {
      summary: 'Create a Deep Deterministic Policy Gradient (DDPG) agent',
      syntax:  ['agent = rlDDPGAgent(obsInfo, actInfo)'],
      seealso: ['rlTD3Agent', 'rlACAgent'],
    },
    rlTD3Agent: {
      summary: 'Create a Twin Delayed DDPG (TD3) agent',
      syntax:  ['agent = rlTD3Agent(obsInfo, actInfo)'],
      seealso: ['rlDDPGAgent'],
    },
    rlReplayMemory: {
      summary: 'Create an experience replay buffer',
      syntax:  ['buf = rlReplayMemory(capacity)'],
      seealso: ['rlPrioritizedReplayMemory'],
    },
    rlPrioritizedReplayMemory: {
      summary: 'Create a prioritized experience replay buffer',
      syntax:  ['buf = rlPrioritizedReplayMemory(capacity, alpha)'],
      seealso: ['rlReplayMemory'],
    },
    rlValueFunction: {
      summary: 'Create a value function approximator',
      syntax:  ['vf = rlValueFunction(net, obsInfo)'],
      seealso: ['rlQValueFunction'],
    },
    rlQValueFunction: {
      summary: 'Create a Q-value function approximator',
      syntax:  ['qf = rlQValueFunction(net, obsInfo, actInfo)'],
      seealso: ['rlValueFunction', 'rlDQNAgent'],
    },
    rlContinuousDeterministicActor: {
      summary: 'Create a continuous deterministic actor representation',
      syntax:  ['actor = rlContinuousDeterministicActor(net, obsInfo, actInfo)'],
      seealso: ['rlStochasticActor', 'rlDDPGAgent'],
    },
    rlStochasticActor: {
      summary: 'Create a stochastic actor representation',
      syntax:  ['actor = rlStochasticActor(net, obsInfo, actInfo)'],
      seealso: ['rlContinuousDeterministicActor', 'rlPPOAgent'],
    },
    train: {
      summary: 'Train a reinforcement learning agent',
      syntax:  ['trainStats = train(agent, env, trainingOptions)'],
      description: ['Runs a real training loop. For rlQAgent: tabular Q-learning. For rlDQNAgent: DQN with replay buffer. For rlPPOAgent: PPO with GAE.'],
      seealso: ['sim', 'getAction'],
    },
    sim: {
      summary: 'Simulate a reinforcement learning agent in an environment',
      syntax:  ['simOut = sim(agent, env)'],
      description: ['Runs one episode and returns a SimulationOutput with TotalReward and NumSteps.'],
      seealso: ['train', 'getAction'],
    },
    getAction: {
      summary: 'Get action from agent given an observation',
      syntax:  ['action = getAction(agent, obs)'],
      description: ['Returns the agent\'s chosen action for the given observation. For Q/DQN agents uses epsilon-greedy; for PPO uses stochastic policy.'],
      seealso: ['train', 'sim'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Robotics System Toolbox, extracted from robotics.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_ROBOTICS: Record<string, HelpEntry | string> = {
    angdiff: {
      summary: 'Difference between two angles',
      syntax: ['delta = angdiff(alpha,beta)', 'delta = angdiff(alpha)'],
      description: [
        'delta = angdiff(alpha,beta) returns the angular difference beta-alpha wrapped to (-pi, pi].',
        'delta = angdiff(alpha) returns the differences between consecutive elements of alpha.',
      ],
      seealso: ['wrapToPi', 'wrapTo2Pi'],
    },
    axang2quat: {
      summary: 'Convert axis-angle rotation to quaternion',
      syntax: ['quat = axang2quat(axang)'],
      description: [
        'quat = axang2quat([ax,ay,az,theta]) converts an axis-angle representation to a unit quaternion [w,x,y,z].',
      ],
      seealso: ['axang2rotm', 'quat2rotm', 'eul2quat'],
    },
    axang2rotm: {
      summary: 'Convert axis-angle rotation to rotation matrix',
      syntax: ['rotm = axang2rotm(axang)'],
      description: ['rotm = axang2rotm([ax,ay,az,theta]) returns a 3×3 rotation matrix using Rodrigues formula.'],
      seealso: ['axang2quat', 'rotm2quat', 'eul2rotm'],
    },
    axang2tform: {
      summary: 'Convert axis-angle rotation to homogeneous transformation matrix',
      syntax: ['tform = axang2tform(axang)'],
      description: ['tform = axang2tform([ax,ay,az,theta]) returns a 4×4 homogeneous transformation matrix (rotation only, no translation).'],
      seealso: ['axang2rotm', 'trvec2tform', 'eul2tform'],
    },
    cart2hom: {
      summary: 'Convert Cartesian coordinates to homogeneous coordinates',
      syntax: ['hom = cart2hom(cart)'],
      description: ['hom = cart2hom(cart) appends a column of ones to the matrix cart, converting each row from n-D Cartesian to (n+1)-D homogeneous.'],
      seealso: ['hom2cart', 'trvec2tform'],
    },
    hom2cart: {
      summary: 'Convert homogeneous coordinates to Cartesian coordinates',
      syntax: ['cart = hom2cart(hom)'],
      description: ['cart = hom2cart(hom) divides each row of hom by its last element and drops that column.'],
      seealso: ['cart2hom'],
    },
    quat2rotm: {
      summary: 'Convert quaternion to rotation matrix',
      syntax: ['rotm = quat2rotm(quat)'],
      description: ['rotm = quat2rotm([w,x,y,z]) returns the corresponding 3×3 rotation matrix.'],
      seealso: ['rotm2quat', 'eul2rotm', 'axang2rotm'],
    },
    rotm2quat: { summary: 'Convert rotation matrix to quaternion',
      syntax: ['quat = rotm2quat(rotm)'],
      seealso: ['quat2rotm', 'rotm2eul', 'rotm2axang'], description: ['quat = rotm2quat(rotm) converts a rotation matrix, rotm, to the corresponding unit quaternion representation, quat. The input rotation matrix must be in the premultiply form for rotations.'] },
    rotm2axang: { summary: 'Convert rotation matrix to axis-angle rotation',
      syntax: ['axang = rotm2axang(rotm)'],
      seealso: ['axang2rotm', 'rotm2quat'], description: ['axang = rotm2axang(rotm) converts a rotation given as an orthonormal rotation matrix, rotm, to the corresponding axis-angle representation, axang. The input rotation matrix must be in the premultiply form for rotations.'] },
    eul2rotm: {
      summary: 'Convert Euler angles to rotation matrix',
      syntax: ["rotm = eul2rotm(eul)", "rotm = eul2rotm(eul,'ZYX')"],
      description: [
        "rotm = eul2rotm([r,p,y]) converts ZYX Euler angles to a rotation matrix.",
        "Specify the sequence as a second argument, e.g., 'XYZ', 'ZYX' (default).",
      ],
      seealso: ['rotm2eul', 'eul2quat', 'eul2tform'],
    },
    rotm2eul: { summary: 'Convert rotation matrix to Euler angles',
      syntax: ['eul = rotm2eul(rotm)', "eul = rotm2eul(rotm,'ZYX')"],
      seealso: ['eul2rotm', 'rotm2quat'], description: ['eul = rotm2eul(rotm) converts a rotation matrix, rotm, to the corresponding Euler angles, eul. The input rotation matrix must be in the premultiply form for rotations. The default order for Euler angle rotations is "ZYX".', 'For more details on Euler angle rotations, see Euler Angles.', 'eul = rotm2eul(rotm,sequence) converts a rotation matrix to Euler angles. The Euler angles are specified in the axis rotation sequence, sequence. The default order for Euler angle rotations is "ZYX".', '[eul,eulAlt] = rotm2eul(___) also returns an alternate set of Euler angles that represents the same rotation eulAlt.'] },
    eul2quat: { summary: 'Convert Euler angles to quaternion',
      syntax: ['quat = eul2quat(eul)', "quat = eul2quat(eul,'ZYX')"],
      seealso: ['quat2eul', 'eul2rotm'], description: ['quat = eul2quat(eul) converts a given set of Euler angles, eul, to the corresponding quaternion, quat. The default order for Euler angle rotations is "ZYX".', 'quat = eul2quat(eul,sequence) converts a set of Euler angles into a quaternion. The Euler angles are specified in the axis rotation sequence, sequence. The default order for Euler angle rotations is "ZYX".'] },
    quat2eul: { summary: 'Convert quaternion to Euler angles',
      syntax: ['eul = quat2eul(quat)', "eul = quat2eul(quat,'ZYX')"],
      seealso: ['eul2quat', 'rotm2eul'], description: ['eul = quat2eul(quat) converts a quaternion rotation, quat, to the corresponding Euler angles, eul. The default order for Euler angle rotations is "ZYX".', 'eul = quat2eul(quat,sequence) converts a quaternion into Euler angles. The Euler angles are specified in the axis rotation sequence, sequence. The default order for Euler angle rotations is "ZYX".', '[eul,eulAlt] = quat2eul(___) also returns an alternate set of Euler angles that represents the same rotation eulAlt.'] },
    eul2tform: { summary: 'Convert Euler angles to homogeneous transformation matrix',
      syntax: ['tform = eul2tform(eul)', "tform = eul2tform(eul,'ZYX')"],
      seealso: ['axang2tform', 'trvec2tform', 'rotm2eul'], description: ['tform = eul2tform(eul) converts a set of Euler angles, eul, into a homogeneous transformation matrix, tform. When using the transformation matrix, premultiply it with the coordinates to be transformed (as opposed to postmultiplying). The default order for Euler angle rotations is "ZYX".', 'tform = eul2tform(eul,sequence) converts Euler angles to a homogeneous transformation. The Euler angles are specified in the axis rotation sequence, sequence. The default order for Euler angle rotations is "ZYX".'] },
    tform2eul: { summary: 'Extract Euler angles from homogeneous transformation',
      syntax: ['eul = tform2eul(tform)', "eul = tform2eul(tform,'ZYX')"],
      seealso: ['eul2tform', 'tform2rotm'], description: ['eul = tform2eul(tform) extracts the rotational component from a homogeneous transformation, tform, and returns it as Euler angles, eul. The translational components of tform are ignored. The input homogeneous transformation must be in the premultiply form for transformations. The default order for Euler angle rotations is "ZYX".', 'eul = tform2eul(tform, sequence) extracts the Euler angles, eul, from a homogeneous transformation, tform, using the specified rotation sequence, sequence. The default order for Euler angle rotations is "ZYX".', '[eul,eulAlt] = tform2eul(___) also returns an alternate set of Euler angles that represents the same rotation eulAlt.'] },
    tform2rotm: { summary: 'Extract rotation matrix from homogeneous transformation',
      syntax: ['rotm = tform2rotm(tform)'],
      seealso: ['tform2trvec', 'trvec2tform'], description: ['rotm = tform2rotm(tform) extracts the rotational component from a homogeneous transformation, tform, and returns it as an orthonormal rotation matrix, rotm. The translational components of tform are ignored. The input homogeneous transformation must be in the pre-multiply form for transformations. When using the rotation matrix, premultiply it with the coordinates to be rotated (as opposed to postmultiplying).'] },
    trvec2tform: {
      summary: 'Convert translation vector to homogeneous transformation',
      syntax: ['tform = trvec2tform(trvec)'],
      description: ['tform = trvec2tform([tx,ty,tz]) returns a 4×4 identity rotation + translation transform.'],
      seealso: ['tform2trvec', 'axang2tform', 'eul2tform'],
    },
    tform2trvec: { summary: 'Extract translation vector from homogeneous transformation',
      syntax: ['trvec = tform2trvec(tform)'],
      seealso: ['trvec2tform', 'tform2rotm'], description: ['trvec = tform2trvec(tform) extracts the Cartesian representation of the translation vector trvec from the homogeneous transformation tform. The rotational components of tform are ignored. The input homogeneous transformation must be in the premultiplied form for transformations.'] },
    rigidBodyTree: {
      summary: 'Rigid body tree robot model',
      syntax: ['robot = rigidBodyTree', "robot = rigidBodyTree('DataFormat','column')"],
      description: ['robot = rigidBodyTree creates a kinematic chain model. Use addBody to add rigid bodies and joints.'],
      seealso: ['inverseKinematics', 'forwardKinematics'],
    },
    bsplinepolytraj: {
      summary: 'Polynomial trajectory through waypoints using B-spline',
      syntax: ['[q,qd,qdd] = bsplinepolytraj(waypoints,timePoints,tSamples)'],
      description: ['Computes a smooth B-spline trajectory through waypoints at timePoints, sampled at tSamples.'],
      seealso: ['minjerkpolytraj', 'quinticpolytraj'],
    },
    quatnormalize: {
      summary: 'Normalize quaternion',
      syntax: ['qnorm = quatnormalize(q)'],
      description: [
        'qnorm = quatnormalize(q) normalizes each row of q (a quaternion [w x y z]) to unit length.',
        'If q is N×4, each of the N quaternions is normalized independently.',
      ],
      seealso: ['quat2rotm', 'axang2quat', 'eul2quat'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Signal Processing Toolbox, extracted from signal.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_SIGNAL: Record<string, HelpEntry | string> = {
    cheby2: { summary: 'Designs an order n lowpass digital Chebyshev Type II filter with normalized stopband edge frequency Ws and stopband attenuation Rs dB.', syntax: ['[b,a] = cheby2(n,Rs,Ws)', '[b,a] = cheby2(n,Rs,Ws,ftype)'], seealso: ['cheb2ap', 'cheb2ord', 'butter', 'cheby1', 'ellip'], description: ['[b,a] = cheby2(n,Rs,Ws) designs an nth-order lowpass digital Chebyshev Type II filter with normalized stopband edge frequency Ws and Rs decibels of stopband attenuation down from the peak passband value. The cheby2 function returns the numerator and denominator coefficients of the filter transfer function.'] },
    ellip: { summary: 'Designs an order n lowpass digital elliptic filter with normalized passband edge frequency Wp, Rp dB of passband ripple, and Rs dB of stopband attenuation.', syntax: ['[b,a] = ellip(n,Rp,Rs,Wp)', '[b,a] = ellip(n,Rp,Rs,Wp,ftype)'], seealso: ['ellipap', 'ellipord', 'butter', 'cheby1', 'cheby2'], description: ['[b,a] = ellip(n,Rp,Rs,Wp) designs an nth-order lowpass digital elliptic filter with normalized passband edge frequency Wp. The resulting filter has Rp decibels of peak-to-peak passband ripple and Rs decibels of stopband attenuation relative to the peak passband value. The ellip function returns the numerator and denominator coefficients of the filter transfer function.'] },
    fir2: { summary: 'Returns an order n FIR filter with frequency-magnitude characteristics specified in the vectors f and m, designed by inverse Fourier transform and windowing.', syntax: ['b = fir2(n,f,m)', 'b = fir2(n,f,m,npt)'], seealso: ['fir1', 'firls', 'firpm', 'cfirpm'], description: ['b = fir2(n,f,m) returns an nth-order FIR filter with frequency- magnitude characteristics specified in the vectors f and m. The function linearly interpolates the desired frequency response onto a dense grid and then uses the inverse Fourier transform and a Hamming window to obtain the filter coefficients.'] },
    buttord: { summary: 'Returns the lowest order n of the digital Butterworth filter with normalized passband edge Wp, stopband edge Ws, Rp dB passband ripple, and Rs dB stopband attenuation, plus the Butterworth natural frequency Wn.', syntax: ['[n,Wn] = buttord(Wp,Ws,Rp,Rs)'], seealso: ['butter', 'cheb1ord', 'cheb2ord', 'ellipord'], description: ['[n,Wn] = buttord(Wp,Ws,Rp,Rs) returns the lowest order, n, of the digital Butterworth filter with no more than Rp dB of passband ripple and at least Rs dB of attenuation in the stopband. Wp and Ws are respectively the passband and stopband edge frequencies of the filter, normalized from 0 to 1, where 1 corresponds to _π_ rad/sample. The scalar (or vector) of corresponding cutoff frequencies, Wn, is also returned. To design a Butterworth filter, use the output arguments n and Wn as inputs to butter.'] },
    cheb1ord: { summary: 'Returns the lowest order n of the Chebyshev Type I filter that loses no more than Rp dB in the passband and has at least Rs dB of attenuation in the stopband, with cutoff Wn.', syntax: ['[n,Wn] = cheb1ord(Wp,Ws,Rp,Rs)'], seealso: ['cheby1', 'buttord', 'cheb2ord', 'ellipord'], description: ['[n,Wp] = cheb1ord(Wp,Ws,Rp,Rs) returns the lowest order n of the Chebyshev Type I filter that loses no more than Rp dB in the passband and has at least Rs dB of attenuation in the stopband. The scalar (or vector) of corresponding cutoff frequencies Wp is also returned.'] },
    cheb2ord: { summary: 'Returns the lowest order n of the Chebyshev Type II filter that loses no more than Rp dB in the passband and has at least Rs dB of attenuation in the stopband, with cutoff Wn.', syntax: ['[n,Wn] = cheb2ord(Wp,Ws,Rp,Rs)'], seealso: ['cheby2', 'buttord', 'cheb1ord', 'ellipord'], description: ['[n,Ws] = cheb2ord(Wp,Ws,Rp,Rs) returns the lowest order n of the Chebyshev Type II filter that loses no more than Rp dB in the passband and has at least Rs dB of attenuation in the stopband. The scalar (or vector) of corresponding cutoff frequencies Ws is also returned.'] },
    ellipord: { summary: 'Returns the lowest order n of the elliptic filter that loses no more than Rp dB in the passband and has at least Rs dB of attenuation in the stopband, with cutoff Wn.', syntax: ['[n,Wn] = ellipord(Wp,Ws,Rp,Rs)'], seealso: ['ellip', 'buttord', 'cheb1ord', 'cheb2ord'], description: ['[n,Wn] = ellipord(Wp,Ws,Rp,Rs) returns the lowest order, n, of the digital elliptic filter with no more than Rp dB of passband ripple and at least Rs dB of attenuation in the stopband. Wp and Ws, are respectively, the passband and stopband edge frequencies of the filter, normalized from 0 to 1, where 1 corresponds to _π_ rad/sample. The scalar (or vector) of corresponding cutoff frequencies, Wn, is also returned. To design an elliptic filter, use the output arguments n and Wn as inputs to ellip.'] },
    lin2mu: { summary: 'Convert linear to mu-law compressed values (G.711)', syntax: ['y = lin2mu(x)'], seealso: ['mu2lin'] },
    xcorr2: { summary: '2-D cross-correlation', syntax: ['c = xcorr2(a,b)', 'c = xcorr2(a)'], seealso: ['xcorr', 'conv2'], description: ['c = xcorr2(a,b) returns the cross-correlation of matrices a and b with no scaling. xcorr2 is the two-dimensional version of xcorr.'] },
    qmf: { summary: 'Quadrature mirror filter', syntax: ['y = qmf(x)', 'y = qmf(x,p)'], seealso: ['wfilters'] },
    lar2rc: { summary: 'Returns the reflection coefficients, k, from the log area ratio parameters g.', syntax: ['k = lar2rc(g)'], seealso: ['ac2rc', 'is2rc', 'poly2rc', 'rc2lar'], description: ['k = lar2rc(g) returns the reflection coefficients, k, from the log area ratio parameters g.'] },
    is2rc: { summary: 'Returns the reflection coefficients, k, from the inverse sine parameters isin.', syntax: ['k = is2rc(isin)'], seealso: ['ac2rc', 'lar2rc', 'poly2rc', 'rc2is'], description: ['k = is2rc(isin) returns the reflection coefficients, k, from the inverse sine parameters isin.'] },
    vco: { summary: 'Creates a signal that oscillates at a frequency determined by the real input vector or matrix x with sample rate Fs.', syntax: ['y = vco(x,Fc,Fs)', 'y = vco(x,[Fmin Fmax],Fs)'], seealso: ['demod', 'modulate'], description: ['y = vco(x,Fc,Fs) creates a signal that oscillates at a frequency determined by the real input vector or matrix x with sample rate Fs. If x is a matrix, vco produces a matrix whose columns oscillate according to the columns of x.'] },
    diric: { summary: 'Returns the Dirichlet Function of degree n evaluated at the elements of the input array x.', syntax: ['y = diric(x,n)'], seealso: ['cos', 'gauspuls', 'pulstran', 'rectpuls', 'sawtooth'], description: ['y = diric(x,n) returns the Dirichlet Function of degree n evaluated at the elements of the input array x.'] },
    uencode: { summary: 'Quantizes the entries in a multidimensional array of floating-point numbers x in the range [-1, 1], and encodes them as integers using 2n-level quantization.', syntax: ['y = uencode(x,n)', 'y = uencode(x,n,v)'], seealso: ['udecode'], description: ['y = uencode(x,n) quantizes the entries in a multidimensional array of floating-point numbers x in the range [-1, 1], and encodes them as integers using 2 _n_ -level quantization. The elements of the output y are unsigned integers with magnitudes in the range [0, 2 _n_ – 1].'] },
    rectwin: { summary: 'Returns a rectangular window of length L.', syntax: ['w = rectwin(L)', 'w = rectwin(L,typeName)'], description: ['w = rectwin(L) returns a rectangular window of length L.'] },
    blackman: { summary: 'Returns an L-point symmetric Blackman window.', syntax: ['w = blackman(L)', 'w = blackman(L,sflag)'], description: ['w = blackman(L) returns an L-point symmetric Blackman window.'] },
    flattopwin: { summary: 'Returns an L-point symmetric flat top window', syntax: ['w = flattopwin(L)', 'w = flattopwin(L,sflag)'], description: ['w = flattopwin(L) returns an L-point symmetric flat top window'] },
    gausswin: { summary: 'Returns an L-point Gaussian window.', syntax: ['w = gausswin(L)', 'w = gausswin(L,alpha)'], description: ['w = gausswin(L) returns an L-point Gaussian window.'] },
    parzenwin: { summary: 'Returns the L-point Parzen (de la Vallée Poussin) window.', syntax: ['w = parzenwin(L)', 'w = parzenwin(L,typeName)'], description: ['w = parzenwin(L) returns the L-point Parzen (de la Vallée Poussin) window.'] },
    chebwin: { summary: 'Returns an L-point Chebyshev window.', syntax: ['w = chebwin(L)', 'w = chebwin(L,r)'], description: ['w = chebwin(L) returns an L-point Chebyshev window.'] },
    edr: { summary: 'Returns the Edit Distance on Real Signals between sequences x and y.', syntax: ['dist = edr(x,y,tol)', '[ ___ ] = edr(x,y,maxsamp)'], seealso: ['alignsignals', 'dtw', 'finddelay', 'findsignal', 'xcorr'], description: ['dist = edr(x,y,tol) returns the Edit Distance on Real Signals between sequences x and y. edr returns the minimum number of elements that must be removed from x, y, or both x and y, so that the sum of Euclidean distances between the remaining signal elements lies within the specified tolerance, tol.'] },
    statelevels: { summary: 'Estimates the low and high state levels in the bilevel waveform x using the histogram method.', syntax: ['levels = statelevels(x)', 'levels = statelevels(x,nbins)'], seealso: ['midcross', 'overshoot', 'risetime', 'undershoot'], description: ['levels = statelevels(x) estimates the low and high state levels in the bilevel waveform x using the histogram method. For more information, see Algorithms.'] },
    pulsewidth: { summary: 'Returns the time differences between the mid-reference level instants of the initial and final transitions of each positive-polarity pulse in the input bilevel waveform.', syntax: ['w = pulsewidth(x)', 'w = pulsewidth(x,fs)'], seealso: ['dutycycle', 'pulseperiod', 'pulsesep', 'statelevels'], description: ['w = pulsewidth(x) returns the time differences between the mid-reference level instants of the initial and final transitions of each positive-polarity pulse in the input bilevel waveform.'] },
    risetime: { summary: 'Returns a vector, r, containing the time each transition of the input bilevel waveform, x, takes to cross from the 10% to 90% reference levels.', syntax: ['r = risetime(x)', 'r = risetime(x,fs)'], seealso: ['falltime', 'slewrate', 'statelevels'], description: ['r = risetime(x) returns a vector, r, containing the time each transition of the input bilevel waveform, x, takes to cross from the 10% to 90% reference levels. To determine the transitions, risetime estimates the state levels of the input waveform by a histogram method. risetime identifies all regions that cross the upper-state boundary of the low state and the lower-state boundary of the high state. The low-state and high-state boundaries are expressed as the state level plus or minus a multiple of the difference between the state levels. See State-Level Tolerances. Because risetime uses interpolation, r can contain values that do not correspond to sampling instants of the bilevel waveform, x.'] },
    overshoot: { summary: 'Returns overshoots expressed as a percentage of the difference between the low- and high-state levels in the input bilevel waveform.', syntax: ['os = overshoot(x)', 'os = overshoot(x,fs)'], seealso: ['settlingtime', 'statelevels'], description: ['os = overshoot(x) returns overshoots expressed as a percentage of the difference between the low- and high-state levels in the input bilevel waveform. The values in os correspond to the greatest absolute deviations that are greater than the final state levels of each transition.'] },
    settlingtime: { summary: 'Returns the time from the mid-reference level instant to the time instant each transition enters and remains within a 2% tolerance region of the final state over the duration d.', syntax: ['s = settlingtime(x,d)', 's = settlingtime(x,Fs,d)'], seealso: ['falltime', 'midcross', 'pulsewidth', 'risetime', 'statelevels'], description: ['s = settlingtime(x,d) returns the time from the mid-reference level instant to the time instant each transition enters and remains within a 2% tolerance region of the final state over the duration d. To determine the transitions, the settlingtime function estimates the state levels of the input waveform by a histogram method and identifies all regions that cross the upper-state boundary of the low state and the lower-state boundary of the high state.'] },
    periodogram: { summary: 'Returns the periodogram power spectral density (PSD) estimate of the signal x.', syntax: ['pxx = periodogram(x)', '[pxx,f] = periodogram(x,win,freqSpec)'], description: ['pxx = periodogram(x) returns the periodogram power spectral density (PSD) estimate of the signal x. The function treats the column of x as independent channels.'] },
    stft: { summary: 'Returns the Short-Time Fourier Transform (STFT) of x.', syntax: ['s = stft(x)', 's = stft(x,fs)'], description: ['s = stft(x) returns the Short-Time Fourier Transform (STFT) of x.'] },
    rectpuls: { summary: 'Returns a continuous, aperiodic, unit-height rectangular pulse at the sample times indicated in array t, centered about t = 0.', syntax: ['y = rectpuls(t)', 'y = rectpuls(t,w)'], seealso: ['chirp', 'cos', 'diric', 'gauspuls', 'pulstran'], description: ['y = rectpuls(t) returns a continuous, aperiodic, unit-height rectangular pulse at the sample times indicated in array t, centered about t = 0.'] },
    upsample: { summary: 'Increases the sample rate of x by inserting n – 1 zeros between samples.', syntax: ['y = upsample(x,n)', 'y = upsample(x,n,phase)'], seealso: ['decimate', 'downsample', 'interp', 'interp1', 'resample'], description: ['y = upsample(x,n) increases the sample rate of x by inserting n – 1 zeros between samples. If x is a matrix, the function treats each column as a separate sequence.'] },
    fwht: { summary: 'Returns the coefficients of the discrete Walsh-Hadamard transform of the input x.', syntax: ['y = fwht(x)', 'y = fwht(x,n)'], seealso: ['ifwht', 'dct', 'idct', 'fft', 'ifft'], description: ['y = fwht(x) returns the coefficients of the discrete Walsh-Hadamard transform of the input x.'] },
    rceps: { summary: 'Returns both the real cepstrum y and a minimum phase reconstructed version ym of the input sequence.', syntax: ['[y,ym] = rceps(x)'], seealso: ['cceps', 'fft', 'hilbert', 'icceps', 'unwrap'], description: ['[y,ym] = rceps(x) returns both the real cepstrum y and a minimum phase reconstructed version ym of the input sequence.'] },
    meanfreq: { summary: 'Estimates the mean normalized frequency, freq, of the power spectrum of a time-domain signal, x.', syntax: ['freq = meanfreq(x)', 'freq = meanfreq(x,Fs)'], seealso: ['findpeaks', 'medfreq', 'periodogram', 'plomb', 'pwelch'], description: ['freq = meanfreq(x) estimates the mean normalized frequency, freq, of the power spectrum of a time-domain signal, x. To compute the power spectrum, meanfreq uses the periodogram function with a rectangular window and a number of DFT points equal to the length of x. If x is a matrix, the function computes the mean frequency of each column of x independently.'] },
    powerbw: { summary: 'Returns the 3 dB (half-power) bandwidth bw of the input signal x.', syntax: ['bw = powerbw(x)', 'bw = powerbw(x,Fs)'], seealso: ['bandpower', 'obw', 'periodogram', 'plomb', 'pwelch'], description: ['bw = powerbw(x) returns the 3 dB (half-power) bandwidth bw of the input signal x. The function obtains the 3 dB bandwidth from the periodogram of the signal x.'] },
    mag2db: { summary: 'Expresses in decibels (dB) the magnitude measurements specified in y.', syntax: ['ydb = mag2db(y)'], seealso: ['db', 'db2mag', 'db2pow', 'pow2db'], description: ['ydb = mag2db(y) expresses in decibels (dB) the magnitude measurements specified in y. The relationship between magnitude and decibels is ydb = 20 log10(y).'] },
    sinc: { summary: 'Returns an array, y, whose elements are the sinc of the elements of the input, x.', syntax: ['y = sinc(x)'], seealso: ['chirp', 'diric', 'gauspuls', 'pulstran', 'rectpuls'], description: ['y = sinc(x) returns an array, y, whose elements are the sinc of the elements of the input, x. The output y is the same size as x.'] },
    freqz: { summary: 'Returns the frequency response of the specified digital filter.', syntax: ['[h,w] = freqz(B,A,"ctf",n)', '[h,w] = freqz({B,A,g},"ctf",n)'], description: ['[h,w] = freqz(b,a,n) returns the frequency response of the specified digital filter. Specify a digital filter with numerator coefficients b and denominator coefficients a. The function returns the n-point frequency response vector in h and the corresponding angular frequency vector w.'] },
    goertzel: { summary: 'Returns the discrete-time Fourier transform (DTFT) of the input array data using a second-order Goertzel algorithm.', syntax: ['dft = goertzel(data)', 'dft = goertzel(data,findx)'], seealso: ['czt', 'fft'], description: ['dft = goertzel(data) returns the discrete-time Fourier transform (DTFT) of the input array data using a second-order Goertzel algorithm. If data has more than one dimension, then goertzel operates along the first array dimension with size greater than 1. For more information, see Algorithms.'] },
    levinson: { summary: 'Returns the coefficients of an autoregressive linear process of order n that has r as its autocorrelation sequence.', syntax: ['a = levinson(r,n)', '[a,e,k] = levinson( ___ )'], seealso: ['lpc', 'prony', 'rlevinson', 'schurrc', 'stmcb'], description: ['a = levinson(r,n) returns the coefficients of an autoregressive linear process of order n that has r as its autocorrelation sequence.'] },
    poly2rc: { summary: 'Returns a vector k of lattice-structure reflection coefficients from a vector a of prediction filter coefficients.', syntax: ['k = poly2rc(a)', '[k,r0] = poly2rc(a,eFinal)'], seealso: ['ac2rc', 'latc2tf', 'latcfilt', 'poly2ac', 'rc2poly'], description: ['k = poly2rc(a) returns a vector k of lattice-structure reflection coefficients from a vector a of prediction filter coefficients.'] },
    ac2rc: { summary: 'Returns the reflection coefficients, k, from the autocorrelation sequence r.', syntax: ['[k,r0] = ac2rc(r)'], seealso: ['ac2poly', 'poly2rc', 'rc2ac'], description: ['[k,r0] = ac2rc(r) returns the reflection coefficients, k, from the autocorrelation sequence r. The ac2rc function also returns the zero-lag autocorrelation r0.'] },
    db: { summary: 'Converts the elements of x to decibels (dB).', syntax: ['dbOutput = db(x)', 'dbOutput = db(x,signalType)'], seealso: ['db2mag', 'db2pow', 'mag2db', 'pow2db'], description: ['dbOutput = db(x) converts the elements of x to decibels (dB). This syntax assumes that x contains voltage measurements across a resistance of 1 Ω.'] },
    cell2sos: { summary: 'Generates a matrix sos containing the coefficients of the filter system described by the second-order section cell array cll.', syntax: ['sos = cell2sos(cll)', '[sos,g] = cell2sos(cll)'], seealso: ['sos2cell', 'tf2sos'], description: ['sos = cell2sos(cll) generates a matrix sos containing the coefficients of the filter system described by the second-order section cell array cll.'] },
    kaiserord: { summary: 'Returns a filter order n, normalized frequency band edges Wn, and a shape factor beta that specify a Kaiser window for use with the fir1 function.', syntax: ['[n,Wn,beta,ftype] = kaiserord(f,a,dev)', '[n,Wn,beta,ftype] = kaiserord(f,a,dev,fs)'], seealso: ['fir1', 'kaiser', 'firpmord'], description: ['[n,Wn,beta,ftype] = kaiserord(f,a,dev) returns a filter order n, normalized frequency band edges Wn, and a shape factor beta that specify a Kaiser window for use with the fir1 function. To design an FIR filter b that approximately meets the specifications given by f, a, and dev, use b = fir1(n,Wn,kaiser(n+1,beta),ftype,"noscale").'] },
    sgolay: { summary: 'Designs a Savitzky-Golay FIR smoothing filter with polynomial order m and frame length fl.', syntax: ['b = sgolay(m,fl)', 'b = sgolay(m,fl,w)'], description: ['b = sgolay(m,fl) designs a Savitzky-Golay FIR smoothing filter with polynomial order m and frame length fl.'] },
    buttap: { summary: 'Returns the poles and gain of an order n Butterworth analog lowpass filter prototype.', syntax: ['[z,p,k] = buttap(n)'], seealso: ['besselap', 'butter', 'cheb1ap', 'cheb2ap', 'ellipap'], description: ['[z,p,k] = buttap(n) returns the poles and gain of an order n Butterworth analog lowpass filter prototype.'] },
    filtfilt: { summary: 'Performs zero-phase digital filtering by processing the input data x in both the forward and reverse directions.', syntax: ['y = filtfilt(b,a,x)', 'y = filtfilt(sos,g,x)'], seealso: ['ctffilt', 'designfilt', 'digitalFilter', 'fftfilt', 'filter'], description: ['y = filtfilt(b,a,x) performs zero-phase digital filtering by processing the input data x in both the forward and reverse directions. After filtering the data in the forward direction, the function matches initial conditions to minimize startup and ending transients, reverses the filtered sequence, and runs the reversed sequence back through the filter. The result has these characteristics:'] },
    cconv: { summary: 'Circularly convolves vectors a and b.', syntax: ['c = cconv(a,b)', 'c = cconv(a,b,n)'], seealso: ['conv', 'xcorr'], description: ['c = cconv(a,b) circularly convolves vectors a and b.'] },
    fftfilt: { summary: 'FIR filter b applied to x via overlap-add FFT; result equals filter(b,1,x) to ~1e-10.', syntax: ['y = fftfilt(b,x)', 'y = fftfilt(b,x,nfft)'], seealso: ['filter', 'filtfilt', 'upfirdn'], description: ['y = fftfilt(b,x) filters the data specified in vector x. The function uses the filter described by the coefficient vector b.'] },
    phasez: { summary: 'Unwrapped phase response of digital filter B/A over n points in [0,pi).', syntax: ['[phi,w] = phasez(b,a)', '[phi,w] = phasez(b,a,n)'], seealso: ['freqz', 'phasedelay', 'zerophase'], description: ['[phi,w] = phasez(b,a,n) returns the phase response of the specified digital filter. Specify a digital filter with numerator coefficients b and denominator coefficients a. The function returns the n-point phase response vector in phi and the corresponding angular frequency vector w.'] },
    phasedelay: { summary: 'Phase delay -angle(H(e^jw))/w of digital filter B/A over n points.', syntax: ['[phi,w] = phasedelay(b,a)', '[phi,w] = phasedelay(b,a,n)'], seealso: ['grpdelay', 'phasez', 'freqz'], description: ['[phi,w] = phasedelay(b,a,n) returns the phase delay response of the specified digital filter. Specify a digital filter with numerator coefficients b and denominator coefficients a. The function returns the n-point phase delay response vector in phi and the corresponding angular frequency vector w.'] },
    zerophase: { summary: 'Real zero-phase amplitude response of digital filter B/A over n points.', syntax: ['[Hr,w] = zerophase(b,a)', '[Hr,w] = zerophase(b,a,n)'], seealso: ['freqz', 'phasez', 'filtfilt'], description: ['[Hr,w] = zerophase(b,a) returns the zero-phase response of the specified digital filter. Specify a digital filter with numerator coefficients b and denominator coefficients a. The function evaluates the zero-phase response at 512 equally spaced points on the upper half of the unit circle, and returns the zero-phase response Hr with the corresponding angular frequencies w.'] },
    zplane: { summary: 'Pole-zero plot; with row-vector inputs (b,a) computes roots; with column-vector inputs (z,p) uses them directly. Returns [z,p] in sandbox (no plot).', syntax: ['zplane(b,a)', 'zplane(z,p)'], seealso: ['freqz', 'tf2zp', 'roots'], description: ['zplane(z,p) plots the zeros and poles of discrete-time systems in the current figure window. Specify the zeros in a column vector z and the poles in a column vector p. The symbol \'o\' represents a zero and the symbol \'x\' represents a pole. The plot includes the unit circle for reference.'] },
    impzlength: { summary: 'Effective impulse-response length: length(b) for FIR, or floor(log(5e-5)/log(max_pole_mag)) for IIR.', syntax: ['n = impzlength(b,a)', 'n = impzlength(b,a,tol)'], seealso: ['impz', 'filtord'], description: ['len = impzlength(b,a) returns the impulse response length of the specified filter. Specify a causal discrete-time filter with the rational system function specified by the numerator, b, and denominator, a, polynomials in _z_ –1. For stable IIR filters, len is the effective impulse response sequence length. Terms in the IIR filter’s impulse response after the len-th term are essentially zero.'] },
    filtord: { summary: 'Filter order: max(degree(b), degree(a)) after trimming trailing zeros.', syntax: ['n = filtord(b,a)'], seealso: ['impzlength', 'firtype'], description: ['n = filtord(b,a) returns the filter order, n, for the specified digital filter. Specify a digital filter as a causal rational system function with numerator coefficients, b, and denominator coefficients, a.'] },
    firtype: { summary: 'Linear-phase FIR type (1–4) from symmetry and length of b.', syntax: ['type = firtype(b)'], seealso: ['islinphase', 'filtord'], description: ['t = firtype(b) determines the type, t, of an FIR filter. Specify the filter coefficients with a vector b. t can be 1, 2, 3, or 4. The filter must be real and have linear phase.'] },
    islinphase: { summary: 'True if b/a is a linear-phase FIR (a=[1], b symmetric or antisymmetric).', syntax: ['tf = islinphase(b,a)', 'tf = islinphase(b,a,tol)'], seealso: ['firtype', 'isminphase', 'isallpass'], description: ['flag = islinphase(b,a) returns a logical output equal to 1 if the specified filter is linear phase. Specify a filter with numerator coefficients b and denominator coefficients a.'] },
    isminphase: { summary: 'True if all zeros and poles of B/A are strictly inside the unit circle.', syntax: ['tf = isminphase(b,a)', 'tf = isminphase(b,a,tol)'], seealso: ['islinphase', 'isallpass'], description: ['flag = isminphase(b,a) returns a logical output equal to 1 if the specified filter is minimum phase. Specify a filter with numerator coefficients b and denominator coefficients a.'] },
    isallpass: { summary: 'True if B/A is an allpass filter (b = fliplr(a)/a(1) for real coefficients).', syntax: ['tf = isallpass(b,a)', 'tf = isallpass(b,a,tol)'], seealso: ['islinphase', 'isminphase'], description: ['flag = isallpass(b,a) returns a logical output equal to 1 if the specified filter is allpass. Specify a filter with numerator coefficients b and denominator coefficients a.'] },
    tf2zpk: { summary: 'Transfer-function to zero-pole-gain: same as tf2zp.', syntax: ['[z,p,k] = tf2zpk(b,a)'], seealso: ['tf2zp', 'zpk2tf', 'sos2zp'], description: ['[z,p,k] = tf2zpk(b,a) finds the vector of zeros z, the vector of poles p, and the associated gain k from the transfer function parameters b and a. The function converts a polynomial transfer-function representation'] },
    sos2zp: { summary: 'Second-order-sections matrix to zeros, poles, and gain.', syntax: ['[z,p,k] = sos2zp(sos)', '[z,p,k] = sos2zp(sos,g)'], seealso: ['tf2zpk', 'zp2sos', 'sosfilt'], description: ['[z,p,k] = sos2zp(sos) returns the zeros, poles, and gain of a system whose second-order section representation is given by sos.'] },
    eqtflength: { summary: 'Pad shorter of b or a with trailing zeros so they have equal length.', syntax: ['[b,a] = eqtflength(b,a)'], seealso: ['filtord', 'tf2zpk'], description: ['[b,a] = eqtflength(num,den) modifies the vector num or the vector den so that the resulting output vectors b and a have the same length. b and a represent the same discrete-time transfer function as num and den, but are of equal length.'] },
    residuez: { summary: 'Partial-fraction expansion of z-transform B(z)/A(z): H = k + sum r_i/(1-p_i*z^{-1}).', syntax: ['[r,p,k] = residuez(b,a)'], seealso: ['residue', 'tf2zpk', 'zp2tf'], description: ['Use residuez to convert from polynomial coefficients to residues, poles and direct terms, and vice versa.'] },
    interp: { summary: 'FIR interpolation: upsample x by integer r using a Hamming-windowed sinc lowpass filter.', syntax: ['y = interp(x,r)', 'y = interp(x,r,n)'], seealso: ['decimate', 'resample', 'upsample', 'upfirdn'], description: ['y = interp(x,r) increases the sample rate of input signal x by a factor of r.'] },
    buffer: { summary: 'Partition signal vector x into non-overlapping (or overlapping) frames of length n, with optional overlap p.', syntax: ['y = buffer(x,n)', 'y = buffer(x,n,p)'], seealso: ['reshape', 'spectrogram'], description: ['y = buffer(x,n) partitions a length-L signal x into nonoverlapping data segments (frames) of length n.'] },
    cheb1ap: { summary: 'Returns the poles and gain of an order N Chebyshev Type I analog lowpass filter prototype with Rp dB of passband ripple.', syntax: ['[z,p,k] = cheb1ap(n,Rp)'], seealso: ['besselap', 'buttap', 'cheb2ap', 'ellipap', 'cheby1'], description: ['[z,p,k] = cheb1ap(n,Rp) returns the poles and gain of an order n Chebyshev Type I analog lowpass filter prototype with Rp dB of ripple in the passband.'] },
    cheb2ap: { summary: 'Returns the zeros, poles, and gain of an order N Chebyshev Type II analog lowpass filter prototype with Rs dB of stopband attenuation.', syntax: ['[z,p,k] = cheb2ap(n,Rs)'], seealso: ['besselap', 'buttap', 'cheb1ap', 'ellipap', 'cheby2'], description: ['[z,p,k] = cheb2ap(n,Rs) returns the zeros, poles, and gain of an order n Chebyshev Type II analog lowpass filter prototype with Rs dB of ripple down from the passband peak value in the stopband.'] },
    ellipap: { summary: 'Returns the zeros, poles, and gain of an order N elliptic analog lowpass filter prototype with Rp dB passband ripple and Rs dB stopband attenuation.', syntax: ['[z,p,k] = ellipap(n,Rp,Rs)'], seealso: ['besselap', 'buttap', 'cheb1ap', 'cheb2ap', 'ellip'], description: ['[z,p,k] = ellipap(n,Rp,Rs) returns the zeros, poles, and gain of an nth-order elliptic analog lowpass filter prototype, with Rp dB of ripple in the passband and a stopband Rs dB down from the peak value in the passband.'] },
    besselap: { summary: 'Returns the poles and gain of an order N Bessel analog lowpass filter prototype (maximally flat group delay). Supported orders: 1–10.', syntax: ['[z,p,k] = besselap(n)'], seealso: ['buttap', 'cheb1ap', 'cheb2ap', 'ellipap'], description: ['[z,p,k] = besselap(n) returns the poles p and gain k of an order-n Bessel analog lowpass filter prototype. z is an empty matrix because the prototype has no zeros.'] },
    lp2lp: { summary: 'Transforms a lowpass analog filter prototype with a cutoff frequency of 1 rad/s to a lowpass filter with a cutoff frequency of Wo rad/s.', syntax: ['[bt,at] = lp2lp(b,a,Wo)'], seealso: ['lp2hp', 'lp2bp', 'lp2bs', 'bilinear'], description: ['[bt,at] = lp2lp(b,a,Wo) transforms an analog lowpass filter prototype with unity cutoff frequency (1 rad/s) into a lowpass filter with cutoff angular frequency Wo rad/s. Specify the filter prototype with numerator coefficients b and denominator coefficients a as row vectors. The input system must be an analog filter prototype.'] },
    lp2hp: { summary: 'Transforms a lowpass analog filter prototype with a cutoff frequency of 1 rad/s to a highpass filter with a cutoff frequency of Wo rad/s.', syntax: ['[bt,at] = lp2hp(b,a,Wo)'], seealso: ['lp2lp', 'lp2bp', 'lp2bs', 'bilinear'], description: ['[bt,at] = lp2hp(b,a,Wo) transforms an analog lowpass filter prototype with unity cutoff frequency (1 rad/s) into a highpass analog filter with cutoff angular frequency Wo. Specify the filter prototype with numerator coefficients b and denominator coefficients a as row vectors. The input system must be an analog filter prototype.'] },
    lp2bp: { summary: 'Transforms a lowpass analog filter prototype with a cutoff frequency of 1 rad/s to a bandpass filter with center frequency Wo rad/s and bandwidth Bw.', syntax: ['[bt,at] = lp2bp(b,a,Wo,Bw)'], seealso: ['lp2lp', 'lp2hp', 'lp2bs', 'bilinear'], description: ['[bt,at] = lp2bp(b,a,Wo,Bw) transforms an analog lowpass filter prototype with unity cutoff frequency (1 rad/s) into a bandpass filter with center frequency Wo and bandwidth Bw. Specify the filter prototype with numerator coefficients b and denominator coefficients a as row vectors. The input system must be an analog filter prototype.'] },
    lp2bs: { summary: 'Transforms a lowpass analog filter prototype with a cutoff frequency of 1 rad/s to a bandstop filter with center frequency Wo rad/s and bandwidth Bw.', syntax: ['[bt,at] = lp2bs(b,a,Wo,Bw)'], seealso: ['lp2lp', 'lp2hp', 'lp2bp', 'bilinear'], description: ['[bt,at] = lp2bs(b,a,Wo,Bw) transforms an analog lowpass filter prototype with unity cutoff frequency (1 rad/s) into a bandstop filter with center frequency Wo and bandwidth Bw. Specify the filter prototype with numerator coefficients b and denominator coefficients a as row vectors. The input system must be an analog filter prototype.'] },
    impinvar: { summary: 'Converts the analog filter with transfer function B(s)/A(s) to the digital filter B(z)/A(z) using the impulse invariance method with sample rate Fs (default 1).', syntax: ['[bz,az] = impinvar(b,a,Fs)'], seealso: ['bilinear', 'butter', 'cheby1'], description: ['[bz,az] = impinvar(b,a,fs) creates a digital filter with numerator and denominator coefficients bz and az, respectively, whose impulse response is equal to the impulse response of the analog filter with coefficients b and a, scaled by 1/fs, where fs is the sample rate.'] },
    lpc: { summary: 'Returns the linear prediction filter coefficients a and the prediction error power e for the input signal x using a p-th order forward linear predictor.', syntax: ['a = lpc(x,p)', '[a,e] = lpc(x,p)'], seealso: ['aryule', 'arburg', 'levinson', 'ac2poly'], description: ['[a,g] = lpc(x,p) finds the coefficients of a pth-order linear predictor, an FIR filter that predicts the current value of the real-valued time series x based on past samples. The function also returns g, the variance of the prediction error. If x is a matrix, the function treats each column as an independent channel.'] },
    aryule: { summary: 'Returns the AR model parameters for a given input signal x using the Yule-Walker method (autocorrelation/Levinson-Durbin).', syntax: ['a = aryule(x,p)', '[a,e,k] = aryule(x,p)'], seealso: ['arburg', 'arcov', 'armcov', 'lpc'], description: ['a = aryule(x,p) returns the normalized autoregressive (AR) parameters corresponding to a model of order p for the input array x.'] },
    arburg: { summary: 'Returns the AR model parameters for a given input signal x using the Burg method.', syntax: ['a = arburg(x,p)', '[a,e,k] = arburg(x,p)'], seealso: ['aryule', 'arcov', 'armcov', 'lpc'], description: ['a = arburg(x,p) returns the normalized autoregressive (AR) parameters corresponding to a model of order p for the input array x.'] },
    arcov: { summary: 'Returns the AR model parameters for a given input signal x using the covariance method.', syntax: ['a = arcov(x,p)', '[a,e] = arcov(x,p)'], seealso: ['arburg', 'aryule', 'armcov', 'lpc'], description: ['a = arcov(x,p) returns the normalized autoregressive (AR) parameters corresponding to a model of order p for the input array x, where x is assumed to be the output of an AR system driven by white noise. This method minimizes the forward prediction error in the least-squares sense.'] },
    armcov: { summary: 'Returns the AR model parameters for a given input signal x using the modified covariance method.', syntax: ['a = armcov(x,p)', '[a,e] = armcov(x,p)'], seealso: ['arburg', 'arcov', 'aryule', 'lpc'], description: ['a = armcov(x,p) returns the normalized autoregressive (AR) parameters corresponding to a model of order p for the input array x. x is assumed to be the output of an AR system driven by white noise. This method minimizes the forward and backward prediction errors in the least-squares sense.'] },
    snr: { summary: 'Returns the signal-to-noise ratio (SNR) in decibels of the fundamental signal component relative to all other spectral components.', syntax: ['r = snr(x)', 'r = snr(x,Fs)'], seealso: ['sinad', 'thd', 'sfdr'], description: ['r = snr(xi,y) returns the signal-to-noise ratio (SNR) in decibels of a signal xi by computing the ratio of its summed squared magnitude to that of the noise y:'] },
    sinad: { summary: 'Returns the signal-to-noise-and-distortion ratio (SINAD) in decibels of the fundamental signal component relative to all other spectral components including harmonics.', syntax: ['r = sinad(x)', 'r = sinad(x,Fs)'], seealso: ['snr', 'thd', 'sfdr'], description: ['r = sinad(x) returns the signal to noise and distortion ratio (SINAD) in dBc of the real-valued sinusoidal signal x. The SINAD is determined using a modified periodogram of the same length as the input signal. The modified periodogram uses a Kaiser window with _β_ = 38.'] },
    thd: { summary: 'Returns the total harmonic distortion (THD) in decibels of the first n harmonics relative to the fundamental.', syntax: ['r = thd(x)', 'r = thd(x,Fs)'], seealso: ['snr', 'sinad', 'sfdr'], description: ['r = thd(x) returns the total harmonic distortion (THD) in dBc of the real-valued sinusoidal signal x. The total harmonic distortion is determined from the fundamental frequency and the first five harmonics using a modified periodogram of the same length as the input signal. The modified periodogram uses a Kaiser window with _β_ = 38.'] },
    sfdr: { summary: 'Returns the spurious-free dynamic range (SFDR) in decibels, the ratio of the fundamental component to the largest spurious spectral component.', syntax: ['r = sfdr(x)', 'r = sfdr(x,Fs)'], seealso: ['snr', 'sinad', 'thd'], description: ['r = sfdr(x) returns the spurious free dynamic range (SFDR), r, in dB of the real sinusoidal signal, x. sfdr computes the power spectrum using a modified periodogram and a Kaiser window with _β_ = 38. The mean is subtracted from x before computing the power spectrum. The number of points used in the computation of the discrete Fourier transform (DFT) is the same as the length of the signal, x.'] },
    pburg: { summary: 'Estimates the power spectral density of x using the Burg method, returning the PSD pxx and corresponding frequency vector w (in rad/sample).', syntax: ['[pxx,w] = pburg(x,order)', '[pxx,w] = pburg(x,order,nfft)'], seealso: ['pyulear', 'pcov', 'pmcov', 'pwelch', 'periodogram'], description: ['pxx = pburg(x,order) returns the power spectral density (PSD) estimate, pxx, of a discrete-time signal, x, found using Burg’s method. When x is a vector, it is treated as a single channel. When x is a matrix, the PSD is computed independently for each column and stored in the corresponding column of pxx. pxx is the distribution of power per unit frequency. The frequency is expressed in units of rad/sample. order is the order of the autoregressive (AR) model used to produce the PSD estimate.'] },
    pyulear: { summary: 'Estimates the power spectral density of x using the Yule-Walker (autocorrelation) AR method.', syntax: ['[pxx,w] = pyulear(x,order)', '[pxx,w] = pyulear(x,order,nfft)'], seealso: ['pburg', 'pcov', 'pmcov', 'pwelch'], description: ['pxx = pyulear(x,order) returns the power spectral density estimate, pxx, of a discrete-time signal, x, found using the Yule-Walker method. When x is a vector, it is treated as a single channel. When x is a matrix, the PSD is computed independently for each column and stored in the corresponding column of pxx. pxx is the distribution of power per unit frequency. The frequency is expressed in units of rad/sample. order is the order of the autoregressive (AR) model used to produce the PSD estimate.'] },
    pcov: { summary: 'Estimates the power spectral density of x using the covariance AR method (forward prediction error minimization).', syntax: ['[pxx,w] = pcov(x,order)', '[pxx,w] = pcov(x,order,nfft)'], seealso: ['pburg', 'pyulear', 'pmcov'], description: ['pxx = pcov(x,order) returns the power spectral density (PSD) estimate, pxx, of a discrete-time signal, x, found using the covariance method. When x is a vector, it is treated as a single channel. When x is a matrix, the PSD is computed independently for each column and stored in the corresponding column of pxx. pxx is the distribution of power per unit frequency. The frequency is expressed in units of rad/sample. order is the order of the autoregressive (AR) model used to produce the PSD estimate.'] },
    pmcov: { summary: 'Estimates the power spectral density of x using the modified covariance AR method (average of forward and backward prediction errors).', syntax: ['[pxx,w] = pmcov(x,order)', '[pxx,w] = pmcov(x,order,nfft)'], seealso: ['pburg', 'pyulear', 'pcov'], description: ['pxx = pmcov(x,order) returns the power spectral density estimate, pxx, of a discrete-time signal, x, found using the modified covariance method. When x is a vector, it is treated as a single channel. When x is a matrix, the PSD is computed independently for each column and stored in the corresponding column of pxx. pxx is the distribution of power per unit frequency. The frequency is expressed in units of rad/sample. order is the order of the autoregressive (AR) model used to produce the PSD estimate.'] },
    cpsd: { summary: 'Estimates the cross power spectral density of signals x and y using Welch\'s averaged, modified periodogram method.', syntax: ['[pxy,f] = cpsd(x,y)', '[pxy,f] = cpsd(x,y,window,noverlap,nfft,fs)'], seealso: ['mscohere', 'tfestimate', 'pwelch'], description: ['pxy = cpsd(x,y) estimates the Cross Power Spectral Density (CPSD) of two discrete-time signals, x and y, using Welch’s averaged, modified periodogram method of spectral estimation.'] },
    mscohere: { summary: 'Estimates the magnitude-squared coherence of signals x and y using Welch\'s overlapped averaged periodogram method.', syntax: ['[cxy,f] = mscohere(x,y)', '[cxy,f] = mscohere(x,y,window,noverlap,nfft,fs)'], seealso: ['cpsd', 'tfestimate', 'pwelch'], description: ['cxy = mscohere(x,y) finds the magnitude-squared coherence estimate, cxy, of the input signals, x and y.'] },
    tfestimate: { summary: 'Estimates the transfer function H(f) = Pxy(f)/Pxx(f) between input x and output y using the Welch H1 method.', syntax: ['[txy,f] = tfestimate(x,y)', '[txy,f] = tfestimate(x,y,window,noverlap,nfft,fs)'], seealso: ['cpsd', 'mscohere', 'pwelch'], description: ['txy = tfestimate(x,y) finds a transfer function estimate between the input signal x and the output signal y evaluated at a set of frequencies.'] },
    plomb: { summary: 'Computes the Lomb-Scargle periodogram of signal x sampled at times t (possibly nonuniform).', syntax: ['[pxx,f] = plomb(x,t)', '[pxx,f] = plomb(x,t,fvec)'], seealso: ['periodogram', 'pwelch', 'pburg'], description: ['[pxx,f] = plomb(x,t) returns the Lomb-Scargle power spectral density (PSD) estimate, pxx, of a signal, x, that is sampled at the instants specified in t. t must increase monotonically but need not be uniformly spaced. All elements of t must be nonnegative. pxx is evaluated at the frequencies returned in f.'] },
    rcosdesign: { summary: 'Designs a raised-cosine (normal) or root-raised-cosine (sqrt) FIR pulse-shaping filter of length span*sps+1, normalized to unit energy.', syntax: ['b = rcosdesign(beta,span,sps)', 'b = rcosdesign(beta,span,sps,shape)'], seealso: ['gaussdesign', 'fir1', 'fir2'], description: ['b = rcosdesign(beta,span,sps) returns the coefficients b that correspond to a square-root raised cosine FIR filter with rolloff factor specified by beta. The filter is truncated to span symbols, and each symbol period contains sps samples. The order of the filter, sps*span, must be even. The filter energy is 1.'] },
    gaussdesign: { summary: 'Designs a Gaussian FIR pulse-shaping filter with BT product bt, symbol span span, and sps samples per symbol.', syntax: ['h = gaussdesign(bt,span,sps)'], seealso: ['rcosdesign', 'fir1'], description: ['h = gaussdesign(bt,span,sps) designs a lowpass FIR Gaussian pulse- shaping filter and returns a vector h of filter coefficients. The filter is truncated to span symbols, and each symbol period contains sps samples. The order of the filter, sps*span, must be even.'] },
    invfreqz: { summary: 'Identifies a digital IIR filter [b,a] by least-squares fitting to complex frequency response samples h at angular frequencies w.', syntax: ['[b,a] = invfreqz(h,w,nb,na)'], seealso: ['freqz', 'invfreqs', 'prony', 'stmcb'], description: ['[b,a] = invfreqz(h,w,n,m) returns the real numerator and denominator coefficient vectors b and a of the transfer function h.'] },
    prony: { summary: 'Uses Prony\'s method to fit an IIR transfer function [b,a] of orders nb and na to the impulse response sequence h.', syntax: ['[b,a] = prony(h,nb,na)'], seealso: ['invfreqz', 'stmcb', 'levinson'], description: ['[b,a] = prony(h,bord,aord) returns the numerator and denominator coefficients for a causal rational transfer function with impulse response h, numerator order bord, and denominator order aord.'] },
    stmcb: { summary: 'Uses the iterative Steiglitz-McBride method to fit an IIR transfer function [b,a] of orders nb and na to the impulse response h.', syntax: ['[b,a] = stmcb(h,nb,na)', '[b,a] = stmcb(h,nb,na,niter)'], seealso: ['prony', 'invfreqz', 'levinson'], description: ['[b,a] = stmcb(h,nb,na) finds the coefficients b and a of the system _b_(_z_)/_a_(_z_) with approximate impulse response h, exactly nb zeros, and exactly na poles.'] },
    tf2latc: { summary: 'Converts a digital transfer function [b,a] to lattice or lattice-ladder form, returning reflection coefficients K (and optional ladder coefficients V).', syntax: ['K = tf2latc(b,a)', '[K,V] = tf2latc(b,a)'], seealso: ['latc2tf', 'latcfilt', 'poly2rc', 'rc2poly'], description: ['[k,v] = tf2latc(b,a) returns the lattice coefficients k and the ladder coefficients v for an IIR (ARMA) lattice-ladder filter, normalized by a(1). The function errors if one or more of the lattice coefficients are exactly equal to 1.'] },
    latc2tf: { summary: 'Converts lattice filter coefficients K (and optional ladder coefficients V) back to a transfer function [b,a].', syntax: ['[b,a] = latc2tf(K)', '[b,a] = latc2tf(K,V)'], seealso: ['tf2latc', 'latcfilt', 'rc2poly'], description: ['[b,a] = latc2tf(k,v) returns the transfer function coefficients b and a corresponding to the IIR lattice-ladder filter specified by lattice coefficients k and ladder coefficients v.'] },
    latcfilt: { summary: 'Filters signal x using the lattice structure defined by reflection coefficients K (and optional ladder V for IIR), returning the forward output f and backward output g.', syntax: ['[f,g] = latcfilt(K,x)', '[f,g] = latcfilt(K,V,x)'], seealso: ['tf2latc', 'latc2tf', 'filter'], description: ['[f,g] = latcfilt(k,x) filters input signal x with the FIR lattice coefficients specified by k and returns the forward lattice filter result f and backward filter result g.'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Statistics and Machine Learning Toolbox, extracted from stats.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_STATS: Record<string, HelpEntry | string> = {
    ttest: { summary: 'Returns a test decision for the null hypothesis that the data in x comes from a normal distribution with mean equal to zero and unknown variance, using the one-sample t-test.', syntax: ['h = ttest(x)', 'h = ttest(x,y)'], seealso: ['ztest', 'ttest2', 'sampsizepwr'], description: ['h = ttest(x) returns a test decision for the null hypothesis that the data in x comes from a normal distribution with mean equal to zero and unknown variance, using the one-sample _t_ -test. The alternative hypothesis is that the population distribution does not have a mean equal to zero. The result h is 1 if the test rejects the null hypothesis at the 5% significance level, and 0 otherwise.'] },
    ranksum: { summary: 'Returns the p-value of a two-sided Wilcoxon rank sum test.', syntax: ['p = ranksum(x,y)', '[ ___ ] = ranksum(x,y,Name,Value)'], seealso: ['kruskalwallis', 'signrank', 'signtest', 'ttest2'], description: ['p = ranksum(x,y) returns the _p_ -value of a two-sided Wilcoxon rank sum test. ranksum tests the null hypothesis that data in x and y are samples from continuous distributions with equal medians, against the alternative that they are not. The test assumes that the two samples are independent. x and y can have different lengths.'] },
    adtest: { summary: 'Returns a test decision for the null hypothesis that the data in vector x is from a population with a normal distribution, using the Anderson-Darling test.', syntax: ['h = adtest(x)', 'h = adtest(x,Name,Value)'], seealso: ['kstest', 'jbtest'], description: ['h = adtest(x) returns a test decision for the null hypothesis that the data in vector x is from a population with a normal distribution, using the Anderson-Darling test. The alternative hypothesis is that x is not from a population with a normal distribution. The result h is 1 if the test rejects the null hypothesis at the 5% significance level, or 0 otherwise.'] },
    ansaribradley: { summary: 'Returns a test decision for the null hypothesis that the data in vectors x and y comes from the same distribution, using the Ansari-Bradley test.', syntax: ['h = ansaribradley(x,y)', 'h = ansaribradley(x,y,Name,Value)'], seealso: ['vartest2', 'vartestn', 'ttest2'], description: ['h = ansaribradley(x,y) returns a test decision for the null hypothesis that the data in vectors x and y comes from the same distribution, using the Ansari-Bradley test. The alternative hypothesis is that the data in x and y comes from distributions with the same median and shape but different dispersions (e.g., variances). The result h is 1 if the test rejects the null hypothesis at the 5% significance level, or 0 otherwise.'] },
    kstest2: { summary: 'Returns a test decision for the null hypothesis that the data in vectors x1 and x2 are from the same continuous distribution, using the two-sample Kolmogorov-Smirnov test.', syntax: ['h = kstest2(x1,x2)', '[h,p] = kstest2(x1,x2)'], seealso: ['kstest', 'adtest', 'lillietest'], description: ['h = kstest2(x1,x2) returns a test decision for the null hypothesis that the data in vectors x1 and x2 are from the same continuous distribution, using the two-sample Kolmogorov-Smirnov test. The alternative hypothesis is that x1 and x2 are from different continuous distributions. The result h is 1 if the test rejects the null hypothesis at the 5% significance level, and 0 otherwise.'] },
    signtest: { summary: 'Returns the p-value of a two-sided sign test for the null hypothesis that data in x has zero median (or that x and y have equal medians).', syntax: ['p = signtest(x)', 'p = signtest(x,y)'], seealso: ['signrank', 'ranksum', 'ttest'], description: ['p = signtest(x) returns the _p_ -value for a two-sided sign test.'] },
    friedman: { summary: "Returns the p-value for a balanced two-way ANOVA by ranks (Friedman's test) for the data in matrix x.", syntax: ['p = friedman(x,reps)', '[p,tbl] = friedman(x,reps)'], seealso: ['anova2', 'kruskalwallis', 'multcompare'], description: ['p = friedman(x,reps) returns the _p_ -value for the nonparametric Friedman\'s test to compare column effects in a two-way layout. friedman tests the null hypothesis that the column effects are all the same against the alternative that they are not all the same. Friedman\'s test provides an analysis that is similar to a two-way ANOVA without interactions. For more information, see Friedman’s Test.'] },
    vartestn: { summary: 'Returns the p-value for the test of the null hypothesis that the columns of the data matrix x come from normal distributions with the same variance.', syntax: ['p = vartestn(x)', 'p = vartestn(x,group)'], seealso: ['vartest', 'vartest2', 'ansaribradley'], description: ['vartestn(x) returns a summary table of statistics and a box plot for a Bartlett test of the null hypothesis that the columns of data vector x come from normal distributions with the same variance. The alternative hypothesis is that not all columns of data have the same variance.'] },
    copulapdf: { summary: 'Returns the probability density of the copula family, evaluated at the points in the n-by-d matrix u.', syntax: ['y = copulapdf(family,u,rho)', "y = copulapdf('t',u,rho,nu)"], seealso: ['copulacdf', 'copulastat', 'copulaparam'], description: ['y = copulapdf(\'Gaussian\',u,rho) returns the probability density of the Gaussian copula with linear correlation parameters, rho, evaluated at the points in u.'] },
    copulacdf: { summary: 'Returns the cumulative probability of the copula family, evaluated at the points in the n-by-d matrix u.', syntax: ['p = copulacdf(family,u,rho)', "p = copulacdf('t',u,rho,nu)"], seealso: ['copulapdf', 'copulastat', 'copularnd'], description: ['y = copulacdf(\'Gaussian\',u,rho) returns the cumulative probability of the Gaussian copula, with linear correlation parameters rho evaluated at the points in u.'] },
    mvncdf: { summary: 'Returns the cumulative probability of the multivariate normal distribution with zero mean and identity covariance matrix, evaluated at each row of X.', syntax: ['y = mvncdf(X)', 'y = mvncdf(X,mu,Sigma)'], seealso: ['mvnpdf', 'mvncdf', 'normcdf', 'mvtcdf'], description: ['p = mvncdf(X) returns the cumulative distribution function (cdf) of the multivariate normal distribution with zero mean and identity covariance matrix, evaluated at each row of X. For more information, see Multivariate Normal Distribution.'] },
    mvtcdf: { summary: 'Returns the cumulative probability of the multivariate Student t distribution with correlation matrix C and nu degrees of freedom, evaluated at each row of X.', syntax: ['y = mvtcdf(X,C,nu)', 'y = mvtcdf(xl,xu,C,nu)'], seealso: ['mvncdf', 'mvtpdf', 'tcdf'], description: ['p = mvtcdf(X,C,nu) returns the cumulative distribution function (cdf) of the multivariate _t_ distribution with the correlation parameters C and degrees of freedom nu, evaluated at each row of X.'] },
    sampsizepwr: { summary: 'Sampsizepwr computes the sample size, power, or alternative parameter value for a hypothesis test, given the other two values.', syntax: ['nout = sampsizepwr(testtype,p0,p1)', 'nout = sampsizepwr(testtype,p0,p1,pwr)'], seealso: ['vartest', 'ttest', 'ttest2', 'ztest', 'binocdf'], description: ['sampsizepwr computes the sample size, power, or alternative parameter value for a hypothesis test, given the other two values. For example, you can compute the sample size required to obtain a particular power for a hypothesis test, given the parameter value of the alternative hypothesis.'] },
    normpdf: { summary: 'Returns the probability density function (pdf) of the standard normal distribution, evaluated at the values in x.', syntax: ['y = normpdf(x)', 'y = normpdf(x,mu)'], seealso: ['pdf', 'normcdf', 'norminv', 'normrnd', 'mvnpdf'], description: ['y = normpdf(x) returns the probability density function (pdf) of the standard normal distribution, evaluated at the values in x.'] },
    tpdf: "Student's t probability density function", tcdf: "Student's t cumulative distribution function", tinv: "Student's t inverse cumulative distribution function",
    chi2pdf: { summary: 'Returns the probability density function (pdf) of the chi-square distribution with nu degrees of freedom, evaluated at the values in x.', syntax: ['y = chi2pdf(x,nu)'], seealso: ['pdf', 'chi2cdf', 'chi2inv', 'chi2stat', 'chi2rnd'], description: ['y = chi2pdf(x,nu) returns the probability density function (pdf) of the chi-square distribution with nu degrees of freedom, evaluated at the values in x.'] },
    gampdf: { summary: 'Returns the probability density function (pdf) of the standard gamma distribution with the shape parameter a, evaluated at the values in x.', syntax: ['y = gampdf(x,a)', 'y = gampdf(x,a,b)'], seealso: ['GammaDistribution', 'pdf', 'gamcdf', 'gaminv', 'gamstat'], description: ['y = gampdf(x,a) returns the probability density function (pdf) of the standard gamma distribution with the shape parameter a, evaluated at the values in x.'] },
    exppdf: { summary: 'Returns the probability density function (pdf) of the standard exponential distribution, evaluated at the values in x.', syntax: ['y = exppdf(x)', 'y = exppdf(x,mu)'], seealso: ['ExponentialDistribution', 'pdf', 'expcdf', 'expinv', 'expstat'], description: ['y = exppdf(x) returns the probability density function (pdf) of the standard exponential distribution, evaluated at the values in x.'] },
    betapdf: { summary: 'Returns the probability density function (pdf) of the beta distribution at each of the values in x using the corresponding parameters in a and b.', syntax: ['y = betapdf(x,a,b)'], seealso: ['pdf', 'betafit', 'betainv', 'betastat', 'betalike'], description: ['y = betapdf(x,a,b) returns the probability density function (pdf) of the beta distribution at each of the values in x using the corresponding parameters in a and b. Values in x must be between [0,1].'] },
    fpdf: { summary: 'Returns the probability density function (pdf) of the F distribution with the numerator degrees of freedom nu1 and denominator degrees of freedom nu2, evaluated at the values in x', syntax: ['p = fpdf(x,nu1,nu2)'], seealso: ['pdf', 'fcdf', 'finv', 'fstat', 'frnd'], description: ['p = fpdf(x,nu1,nu2) returns the probability density function (pdf) of the _F_ distribution with the numerator degrees of freedom nu1 and denominator degrees of freedom nu2, evaluated at the values in x.'] },
    unifpdf: { summary: 'Returns the probability density function (pdf) of the standard uniform distribution, evaluated at the values in x.', syntax: ['y = unifpdf(x)', 'y = unifpdf(x,a,b)'], seealso: ['UniformDistribution', 'pdf', 'unifcdf', 'unifinv', 'unifstat'], description: ['y = unifpdf(x) returns the probability density function (pdf) of the standard uniform distribution, evaluated at the values in x.'] },
    lognpdf: { summary: 'Returns the probability density function (pdf) of the standard lognormal distribution, evaluated at the values in x.', syntax: ['y = lognpdf(x)', 'y = lognpdf(x,mu)'], seealso: ['pdf', 'logncdf', 'logninv', 'lognstat', 'lognfit'], description: ['y = lognpdf(x) returns the probability density function (pdf) of the standard lognormal distribution, evaluated at the values in x. In the standard lognormal distribution, the mean and standard deviation of logarithmic values are 0 and 1, respectively.'] },
    binopdf: { summary: 'Computes the binomial probability density function at each of the values in x using the corresponding number of trials in n and probability of success for each trial in p.', syntax: ['y = binopdf(x,n,p)'], seealso: ['pdf', 'binoinv', 'binocdf', 'binofit', 'binostat'], description: ['y = binopdf(x,n,p) computes the binomial probability density function at each of the values in x using the corresponding number of trials in n and probability of success for each trial in p.'] },
    poisspdf: { summary: 'Computes the Poisson probability density function at each of the values in x using the rate parameters in lambda.', syntax: ['y = poisspdf(x,lambda)'], seealso: ['pdf', 'poisscdf', 'poissinv', 'poisstat', 'poissfit'], description: ['y = poisspdf(x,lambda) computes the Poisson probability density function at each of the values in x using the rate parameters in lambda.'] },
    geopdf: { summary: 'Returns the probability density function (pdf) of the geometric distribution, evaluated at each value in x using the corresponding probabilities in p.', syntax: ['y = geopdf(x,p)'], seealso: ['geocdf', 'geoinv', 'geostat', 'geornd', 'pdf'], description: ['y = geopdf(x,p) returns the probability density function (pdf) of the geometric distribution, evaluated at each value in x using the corresponding probabilities in p. The parameter p is the probability of success in any given trial, and x is the number of failures before the first success.'] },
    wblpdf: { summary: 'Returns the probability density function (pdf) of the Weibull distribution with unit parameters, evaluated at the values in x.', syntax: ['y = wblpdf(x)', 'y = wblpdf(x,a)'], seealso: ['WeibullDistribution', 'pdf', 'wblcdf', 'wblstat', 'wblfit'], description: ['y = wblpdf(x) returns the probability density function (pdf) of the Weibull distribution with unit parameters, evaluated at the values in x.'] },
    raylpdf: { summary: 'Returns the Rayleigh probability density function (pdf) with the scale parameter b, evaluated at the values in x.', syntax: ['p = raylpdf(x,b)'], seealso: ['pdf', 'raylcdf', 'raylinv', 'raylstat', 'raylfit'], description: ['p = raylpdf(x,b) returns the Rayleigh probability density function (pdf) with the scale parameter b, evaluated at the values in x.'] },
    normstat: { summary: 'Returns the mean and variance of the normal distribution with mean mu and standard deviation sigma.', syntax: ['[m,v] = normstat(mu,sigma)'], seealso: ['normpdf', 'normcdf', 'normrnd', 'NormalDistribution', 'mean'], description: ['[m,v] = normstat(mu,sigma) returns the mean and variance of the normal distribution with mean mu and standard deviation sigma.'] },
    unifstat: { summary: 'Returns the element-wise mean and variance of the continuous uniform distribution defined by the lower endpoint (minimum) a and upper endpoint (maximum) b.', syntax: ['[m,v] = unifstat(a,b)'], seealso: ['unifpdf', 'unifcdf', 'unifinv', 'unifit', 'unifrnd'], description: ['[m,v] = unifstat(a,b) returns the element-wise mean and variance of the continuous uniform distribution defined by the lower endpoint (minimum) a and upper endpoint (maximum) b. The endpoints a and b can be scalars, vectors, or multidimensional arrays.'] },
    tstat: "Student's t mean and variance", fstat: { summary: 'F mean and variance', syntax: [], description: ['m = fstat(nu1,nu2) returns the mean of the _F_ distribution with nu1 numerator degrees of freedom and nu2 denominator degrees of freedom.'] }, lognstat: { summary: 'Lognormal mean and variance', syntax: [], description: ['[m,v] = lognstat(mu,sigma) returns the mean and variance of the lognormal distribution with the distribution parameters mu (mean of logarithmic values) and sigma (standard deviation of logarithmic values).'] }, geostat: { summary: 'Geometric mean and variance', syntax: [], description: ['[m,v] = geostat(p) returns the mean m and variance v of a geometric distribution with the corresponding probability parameter in p. For more information, see Geometric Distribution Mean and Variance.'] },
    raylstat: { summary: 'Returns the mean for the Rayleigh distribution with the scale parameter b.', syntax: ['m = raylstat(b)', '[m,v] = raylstat(b)'], seealso: ['raylpdf', 'raylcdf', 'raylinv', 'raylfit', 'raylrnd'], description: ['m = raylstat(b) returns the mean for the Rayleigh distribution with the scale parameter b.'] },
    evpdf: { summary: 'Returns the probability density function (pdf) of the type 1 extreme value distribution (also known as the Gumbel distribution) with a location parameter equal to 0 and a scale pa', syntax: ['p = evpdf(x)', 'p = evpdf(x,mu,sigma)'], seealso: ['pdf', 'evcdf', 'evinv', 'evstat', 'evfit'], description: ['p = evpdf(x) returns the probability density function (pdf) of the type 1 extreme value distribution (also known as the Gumbel distribution) with a location parameter equal to 0 and a scale parameter equal to 1, evaluated at the values in x. The software returns the pdf for the minimum case. To model the maximum case, call evpdf using the negative of the original values in x. For more information, see Extreme Value Distribution.'] },
    gevpdf: { summary: 'Returns the probability density function (pdf) of the generalized extreme value (GEV) distribution with a shape parameter equal to 0, scale parameter equal to 1, and location para', syntax: ['p = gevpdf(x)', 'p = gevpdf(x,k,sigma,mu)'], seealso: ['pdf', 'gevcdf', 'gevinv', 'gevstat', 'gevfit'], description: ['p = gevpdf(x) returns the probability density function (pdf) of the generalized extreme value (GEV) distribution with a shape parameter equal to 0, scale parameter equal to 1, and location parameter equal to 0, evaluated at the values in x.'] },
    gppdf: { summary: 'Returns the probability density function (pdf) of the generalized Pareto (GP) distribution with a shape parameter equal to 0, a scale parameter equal to 1, and a threshold (locati', syntax: ['p = gppdf(x)', 'p = gppdf(x,k,sigma,theta)'], seealso: ['pdf', 'gpcdf', 'gpinv', 'gpstat', 'gpfit'], description: ['p = gppdf(x) returns the probability density function (pdf) of the generalized Pareto (GP) distribution with a shape parameter equal to 0, a scale parameter equal to 1, and a threshold (location) parameter equal to 0, evaluated at the values in x. For more information, see Generalized Pareto Distribution.'] },
    nbinpdf: { summary: 'Returns the negative binomial probability density function (pdf), evaluated at the values in x, using the corresponding number of successes r and the probability of success in a s', syntax: ['y = nbinpdf(x,r,p)'], seealso: ['pdf', 'nbincdf', 'nbininv', 'nbinstat', 'nbinfit'], description: ['y = nbinpdf(x,r,p) returns the negative binomial probability density function (pdf), evaluated at the values in x, using the corresponding number of successes r and the probability of success in a single trial p.'] },
    hygepdf: { summary: 'Returns the probability density function (pdf) of the hypergeometric distribution, evaluated at the values in x, using the corresponding size of the population m, the number of it', syntax: ['p = hygepdf(x,m,k,n)'], seealso: ['pdf', 'hygecdf', 'hygeinv', 'hygestat', 'hygernd'], description: ['p = hygepdf(x,m,k,n) returns the probability density function (pdf) of the hypergeometric distribution, evaluated at the values in x, using the corresponding size of the population m, the number of items with the intended characteristic in the population k, and the number of items drawn n.'] },
    ncx2pdf: { summary: 'Returns the noncentral chi-square probability density function (pdf) with nu degrees of freedom and the noncentrality parameter delta, evaluated at the values in x.', syntax: ['p = ncx2pdf(x,nu,delta)'], seealso: ['pdf', 'ncx2cdf', 'ncx2inv', 'ncx2stat', 'ncx2rnd'], description: ['p = ncx2pdf(x,nu,delta) returns the noncentral chi-square probability density function (pdf) with nu degrees of freedom and the noncentrality parameter delta, evaluated at the values in x.'] },
    ncfpdf: { summary: 'Returns the noncentral F probability density function (pdf) with nu1 numerator degrees of freedom, nu2 denominator degrees of freedom, and the noncentrality parameter delta, evalu', syntax: ['p = ncfpdf(x,nu1,nu2,delta)'], seealso: ['pdf', 'ncfcdf', 'ncfinv', 'ncfstat', 'ncfrnd'], description: ['p = ncfpdf(x,nu1,nu2,delta) returns the noncentral _F_ probability density function (pdf) with nu1 numerator degrees of freedom, nu2 denominator degrees of freedom, and the noncentrality parameter delta, evaluated at the values in x.'] },
    nctpdf: { summary: 'Returns the noncentral t probability density function (pdf) with nu degrees of freedom and the noncentrality parameter delta, evaluated at the values in x.', syntax: ['p = nctpdf(x,nu,delta)'], seealso: ['pdf', 'nctcdf', 'nctinv', 'nctstat', 'nctrnd'], description: ['p = nctpdf(x,nu,delta) returns the noncentral _t_ probability density function (pdf) with nu degrees of freedom and the noncentrality parameter delta, evaluated at the values in x.'] },
    expfit: { summary: 'Returns the maximum likelihood estimates (MLEs) of the mean parameter mu of the exponential distribution, given the sample data in x.', syntax: ['pHat = expfit(x)', '[pHat,pCI] = expfit(x)'], seealso: ['mle', 'explike', 'exppdf', 'expcdf', 'expinv'], description: ['pHat = expfit(x) returns the maximum likelihood estimates (MLEs) of the mean parameter mu of the exponential distribution, given the sample data in x.'] },
    binofit: { summary: 'Returns the maximum likelihood estimates (MLEs) of the probability of success in a given binomial trial based on the number of successes r observed in n independent trials.', syntax: ['pHat = binofit(r,n)', '[pHat,pCI] = binofit(r,n)'], seealso: ['mle', 'binopdf', 'binocdf', 'binoinv', 'binostat'], description: ['pHat = binofit(r,n) returns the maximum likelihood estimates (MLEs) of the probability of success in a given binomial trial based on the number of successes r observed in n independent trials.'] },
    lognfit: { summary: 'Returns unbiased estimates of lognormal distribution parameters, given the sample data in x.', syntax: ['pHat = lognfit(x)', '[pHat,pCI] = lognfit(x)'], seealso: ['mle', 'lognlike', 'lognpdf', 'logncdf', 'logninv'], description: ['pHat = lognfit(x) returns unbiased estimates of lognormal distribution parameters, given the sample data in x. pHat(1) and pHat(2) are the mean and standard deviation of logarithmic values, respectively.'] },
    mvnpdf: { summary: 'Returns an n-by-1 vector y containing the probability density function (pdf) values for the d-dimensional multivariate normal distribution with zero mean and identity covariance m', syntax: ['y = mvnpdf(X)', 'y = mvnpdf(X,mu)'], seealso: ['mvncdf', 'mvnrnd', 'normpdf'], description: ['y = mvnpdf(X) returns an _n_ -by-1 vector y containing the probability density function (pdf) values for the _d_ -dimensional multivariate normal distribution with zero mean and identity covariance matrix, evaluated at each row of the _n_ -by-_d_ matrix X. For more information, see Multivariate Normal Distribution.'] },
    ecdf: { summary: 'Returns the empirical cumulative distribution function f, evaluated at x, using the data in y.', syntax: ['ecdf( ___ )', 'ecdf(ax, ___ )'], seealso: ['cdfplot', 'ecdfhist', 'EmpiricalDistribution'], description: ['[f,x] = ecdf(y) returns the empirical cumulative distribution function f, evaluated at x, using the data in y.'] },
    betafit: { summary: 'Returns the maximum likelihood estimates (MLEs) of the beta distribution parameters a and b, given the data in x.', syntax: ['pHat= betafit(x)', '[pHat,pCI] = betafit(x)'], seealso: ['mle', 'betapdf', 'betainv', 'betastat', 'betalike'], description: ['pHat= betafit(x) returns the maximum likelihood estimates (MLEs) of the beta distribution parameters _a_ and _b_ , given the data in x. For more information, see Beta Distribution.'] },
    nanmean: { summary: 'Mean ignoring NaN values', syntax: ['m = nanmean(x)', 'm = nanmean(x,dim)'], seealso: ['mean', 'nanmedian', 'nanstd'] },
    nanmedian: { summary: 'Median ignoring NaN values', syntax: ['m = nanmedian(x)', 'm = nanmedian(x,dim)'], seealso: ['median', 'nanmean'] },
    range: { summary: 'Returns the difference between the maximum and minimum values of sample data in X.', syntax: ['y = range(X)', 'y = range(X,\'all\')'], seealso: ['std', 'iqr', 'mad'], description: ['y = range(X) returns the difference between the maximum and minimum values of sample data in X.'] },
    pdist: { summary: 'Returns the Euclidean distance between pairs of observations in X.', syntax: ['D = pdist(X)', 'D = pdist(X,Distance)'], seealso: ['cluster', 'clusterdata', 'cmdscale', 'cophenet', 'dendrogram'], description: ['D = pdist(X) returns the Euclidean distance between pairs of observations in X.'] },
    tiedrank: { summary: 'Returns the rank of each value in X.', syntax: ['[R,tieadj] = tiedrank(X)', '[R,tieadj] = tiedrank(X,1)'], seealso: ['ansaribradley', 'corr', 'partialcorr', 'ranksum', 'signrank'], description: ['[R,tieadj] = tiedrank(X) returns the rank of each value in X. The function also returns an adjustment for ties between values that is used by the signrank and ranksum functions, and in the computation of the Spearman distance metric (see Distance Metrics). If any values in X are tied, tiedrank returns their average rank.'] },
    tabulate: { summary: 'Displays a frequency table of the data in the vector x.', syntax: ['tabulate(x)', 'tbl = tabulate(x)'], seealso: ['pareto', 'histogram', 'bar', 'grpstats', 'groupcounts'], description: ['tabulate(x) displays a frequency table of the data in the vector x. For each unique value in x, the tabulate function shows the number of instances and percentage of that value in x. See tbl.'] },
    geoinv: { summary: 'Returns the inverse cumulative distribution function (icdf) of the geometric distribution at each value in y using the corresponding probabilities in p.', syntax: ['x = geoinv(y,p)'], seealso: ['geocdf', 'geopdf', 'geostat', 'geornd', 'icdf'], description: ['x = geoinv(y,p) returns the inverse cumulative distribution function (icdf) of the geometric distribution at each value in y using the corresponding probabilities in p.'] },
    ff2n: { summary: 'Returns a 2n-by-n numeric matrix dFF2 containing the treatments of a full factorial design for n two-level factors.', syntax: ['dFF2 = ff2n(n)'], seealso: ['fullfact', 'fracfact', 'fracfactgen', 'hadamard'], description: ['dFF2 = ff2n(n) returns a _2n_-by-n numeric matrix dFF2 containing the treatments of a full factorial design for n two-level factors. Each row of dFF2 corresponds to a single treatment (combination of the factor levels). Each column of dFF2 contains the treatment values for a single factor, with values of 0 and 1 for the two levels.'] },
    combnk: { summary: 'All combinations of n elements taken k at a time', syntax: ['C = combnk(v,k)'], seealso: ['nchoosek', 'perms'] },
    explike: { summary: 'Returns the exponential negative loglikelihood of the parameter mu, given the sample data x.', syntax: ['nlogL = explike(mu,x)', 'nlogL = explike(mu,x,censoring)'], seealso: ['expcdf', 'exppdf', 'expstat', 'expfit', 'expinv'], description: ['nlogL = explike(mu,x) returns the exponential negative loglikelihood of the parameter mu, given the sample data x.'] },
    unidpdf: { summary: 'Returns the probability density function (pdf) of the discrete uniform distribution with the maximum value n, evaluated at the values in x.', syntax: ['p = unidpdf(x,n)'], seealso: ['pdf', 'unidcdf', 'unidinv', 'unidstat', 'unidrnd'], description: ['p = unidpdf(x,n) returns the probability density function (pdf) of the discrete uniform distribution with the maximum value n, evaluated at the values in x.'] },
    unidinv: { summary: 'Returns the inverse cumulative distribution function (icdf) of the discrete uniform distribution with the maximum values in n, evaluated at the probability values in p.', syntax: ['x = unidinv(p,n)'], seealso: ['icdf', 'unidcdf', 'unidpdf', 'unidstat', 'unidrnd'], description: ['x = unidinv(p,n) returns the inverse cumulative distribution function (icdf) of the discrete uniform distribution with the maximum values in n, evaluated at the probability values in p.'] },
    regress: { summary: 'Returns a vector b of coefficient estimates for a multiple linear regression of the responses in vector y on the predictors in matrix X.', syntax: ['b = regress(y,X)', '[b,bint] = regress(y,X)'], seealso: ['LinearModel', 'fitlm', 'stepwiselm', 'mvregress', 'rcoplot'], description: ['b = regress(y,X) returns a vector b of coefficient estimates for a multiple linear regression of the responses in vector y on the predictors in matrix X. To compute coefficient estimates for a model with a constant term (intercept), include a column of ones in the matrix X.'] },
    glmfit: { summary: 'Returns a vector b of coefficient estimates for a generalized linear regression model of the responses in y on the predictors in X, using the distribution distr.', syntax: ['b = glmfit(X,y,distr)', 'b = glmfit(X,y,distr,Name,Value)'], seealso: ['glmval', 'regress', 'regstats', 'GeneralizedLinearModel', 'fitglm'], description: ['b = glmfit(X,y,distr) returns a vector b of coefficient estimates for a generalized linear regression model of the responses in y on the predictors in X, using the distribution distr.'] },
    makedist: { summary: 'Creates a probability distribution object for the distribution distname, using the default parameter values.', syntax: ['pd = makedist(distname)', 'pd = makedist(distname,Name,Value)'], seealso: ['fitdist'], description: ['pd = makedist(distname) creates a probability distribution object for the distribution distname, using the default parameter values.'] },
    confusionmat: { summary: 'Returns the confusion matrix C determined by the known and predicted groups in group and grouphat, respectively.', syntax: ['C = confusionmat(group,grouphat)', 'C = confusionmat(group,grouphat,\'Order\',grouporder)'], seealso: ['categories', 'crosstab', 'confusionchart'], description: ['C = confusionmat(group,grouphat) returns the confusion matrix C determined by the known and predicted groups in group and grouphat, respectively.'] },
    mahal: { summary: 'Returns the squared Mahalanobis distance of each observation in Y to the reference samples in X.', syntax: ['d2 = mahal(Y,X)'], seealso: ['pdist', 'pdist2', 'mahal', 'mahal', 'robustcov'], description: ['d2 = mahal(Y,X) returns the squared Mahalanobis distance of each observation in Y to the reference samples in X.'] },
    pcares: { summary: 'Returns the residuals from a principal components analysis of X using ndim principal components.', syntax: ['residuals = pcares(X,ndim)', '[residuals,reconstructed] = pcares(X,ndim)'], seealso: ['pca', 'pcacov', 'ppca', 'biplot'], description: ['residuals = pcares(X,NumComponents) returns the residuals obtained by retaining NumComponents principal components of the data matrix X.'] },
    ksdensity: { summary: 'Computes a probability density estimate of the sample in data vector x.', syntax: ['[f,xi] = ksdensity(x)', 'f = ksdensity(x,pts)'], seealso: ['histogram', 'ecdf', 'fitdist'], description: ['[f,xi] = ksdensity(x) returns a probability density estimate, f, for the sample data in the vector or two-column matrix x. The estimate is based on a normal kernel function, and is evaluated at equally-spaced points, xi, that cover the range of the data in x. ksdensity estimates the density at 100 points for univariate data, or 900 points for bivariate data.'] },
    nlinfit: { summary: 'Estimates coefficients of a nonlinear regression function using least squares.', syntax: ['beta = nlinfit(X,y,modelfun,beta0)', '[beta,R] = nlinfit(X,y,modelfun,beta0)'], seealso: ['lsqcurvefit', 'nlpredci', 'nlintool', 'regress', 'robustfit'], description: ['beta = nlinfit(X,Y,modelfun,beta0) returns a vector of estimated coefficients for the nonlinear regression of the responses in Y on the predictors in X using the model specified by modelfun. The coefficients are estimated using iterative least squares estimation, with initial values specified by beta0.'] },
    procrustes: { summary: 'Compares two shapes using a Procrustes analysis.', syntax: ['d = procrustes(X,Y)', '[d,Z] = procrustes(X,Y)'], seealso: ['cmdscale'], description: ['d = procrustes(X,Y) returns the squared Procrustes Distance between the shapes of X and Y, which are represented by configurations of landmark points.'] },
    canoncorr: { summary: 'Computes sample canonical correlations between the columns of X and Y.', syntax: ['[A,B,r] = canoncorr(X,Y)', '[A,B,r,U,V] = canoncorr(X,Y)'], seealso: ['corr', 'partialcorr', 'manova1'], description: ['[A,B] = canoncorr(X,Y) computes the sample canonical coefficients for the data matrices X and Y.'] },
    nnmf: { summary: 'Factors matrix A into nonneg matrices W (n-by-k) and H (k-by-m) by alternating least squares.', syntax: ['[W,H] = nnmf(A,k)', '[W,H,D] = nnmf(A,k)'], seealso: ['pca', 'svd', 'factoran'], description: ['[W,H] = nnmf(A,k) factors the _n_ -by-_m_ matrix A into nonnegative factors W (_n_ -by-k) and H (k-by-_m_). The factorization is not exact; WH is a lower-rank approximation to A. The factors W and H minimize the root mean square residual D between A and WH.'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Symbolic Math Toolbox, extracted from symbolic.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_SYMBOLIC: Record<string, HelpEntry | string> = {
    argnames: { summary: 'Return input variables of a symbolic function', syntax: ['args = argnames(f)'], description: ['args = argnames(f) returns the input variables of the symbolic function or matrix function f.'], seealso: ['formula', 'syms', 'symvar', 'symfun'] },
    bernstein: { summary: 'Bernstein polynomial approximation', syntax: ['bernstein(f,n,t)', 'bernstein(g,n,t)'], description: ['bernstein(f,n,t) returns the n-th order Bernstein polynomial approximation of f evaluated at t.'], seealso: ['bernsteinMatrix', 'symsum', 'nchoosek'] },
    cell2sym: { summary: 'Convert cell array to symbolic array', syntax: ['S = cell2sym(C)', 'S = cell2sym(C,flag)'], description: ['S = cell2sym(C) converts a cell array C to a symbolic array S; each element of C must be convertible to a symbolic object.'], seealso: ['sym2cell', 'cell2mat', 'num2cell'] },
    charToFunction: { summary: 'Convert function name string to function handle', syntax: ['f = charToFunction(name)'], description: ['charToFunction creates a function handle from a character vector name, used internally by the Symbolic Toolbox.'], seealso: ['str2sym', 'matlabFunction'] },
    dsolve: { summary: 'Solve ordinary differential equations symbolically', syntax: ['S = dsolve(eqn)', 'S = dsolve(eqn,cond)'], description: ['S = dsolve(eqn) symbolically solves the ODE expressed with diff; cond specifies initial/boundary conditions.'], seealso: ['odeToVectorField', 'simplify', 'solve'] },
    eliminate: { summary: 'Eliminate variables from a system of polynomial equations', syntax: ['expr = eliminate(eqns,vars)'], description: ['expr = eliminate(eqns,vars) eliminates vars from the rational equations eqns, returning expressions equal to zero.'], seealso: ['gbasis', 'solve'] },
    findSymType: { summary: 'Find subexpressions of a given symbolic type', syntax: ['X = findSymType(symObj,type)', 'X = findSymType(symObj,funType,vars)'], description: ['X = findSymType(symObj,type) returns a vector of symbolic subobjects of the given type from symObj.'], seealso: ['hasSymType', 'isSymType', 'symType'] },
    fourier: { summary: 'Symbolic Fourier transform', syntax: ['FT = fourier(f)', 'FT = fourier(f,transVar)'], description: ['FT = fourier(f) returns the Fourier transform of f with default independent variable t and transform variable w.'], seealso: ['ifourier', 'laplace', 'ztrans'] },
    functionalDerivative: { summary: 'Functional derivative of a symbolic functional', syntax: ['G = functionalDerivative(f,y)'], description: ['G = functionalDerivative(f,y) returns the functional derivative δS/δy(x) of S[y]=∫f(x,y,y\',...) dx.'], seealso: ['diff', 'dsolve', 'int'] },
    has: { summary: 'Check if symbolic expression contains a subexpression', syntax: ['has(expr,subexpr)'], description: ['has(expr,subexpr) returns true if expr contains subexpr as a subexpression.'], seealso: ['subs', 'subexpr', 'hasSymType'] },
    hasSymType: { summary: 'Check if expression contains a specific symbolic type', syntax: ['tf = hasSymType(expr,type)'], description: ['Returns true if expr contains any subexpression of the given symbolic type (e.g. "variable", "constant").'], seealso: ['isSymType', 'findSymType', 'symType'] },
    htrans: { summary: 'Symbolic Hilbert transform', syntax: ['F = htrans(f,x)'], description: ['F = htrans(f,x) computes the Hilbert transform of f with respect to x.'], seealso: ['ihtrans', 'fourier'] },
    hypergeom: { summary: 'Generalized hypergeometric function', syntax: ['F = hypergeom(n,d,z)'], description: ['F = hypergeom(n,d,z) computes the generalized hypergeometric function pFq(n;d;z).'], seealso: ['int', 'series'] },
    ifourier: { summary: 'Symbolic inverse Fourier transform', syntax: ['ifourier(F)', 'ifourier(F,transVar)'], description: ['ifourier(F) returns the inverse Fourier transform of F with default variable w and result in x.'], seealso: ['fourier', 'ilaplace', 'iztrans'] },
    ihtrans: { summary: 'Symbolic inverse Hilbert transform', syntax: ['f = ihtrans(H)', 'f = ihtrans(H,transVar)'], description: ['f = ihtrans(H) returns the inverse Hilbert transform of H with default variable x and result in t.'], seealso: ['htrans', 'fourier', 'ifourier'] },
    ilaplace: { summary: 'Symbolic inverse Laplace transform', syntax: ['f = ilaplace(F)', 'f = ilaplace(F,transVar)'], description: ['f = ilaplace(F) returns the inverse Laplace transform of F with default variable s and result in t.'], seealso: ['laplace', 'fourier', 'iztrans', 'ztrans'] },
    isCondition: { summary: 'Check if symbolic expression is a relational condition', syntax: ['tf = isCondition(expr)'], description: ['Returns true if expr is a symbolic relation (==, ~=, <, <=, >, >=) or logical combination thereof.'], seealso: ['isAlways', 'isSymType'] },
    isDistinctVariable: { summary: 'Check if symbolic variables are distinct', syntax: ['tf = isDistinctVariable(x,y)'], description: ['Returns true if x and y are distinct symbolic variables (different symbol objects).'], seealso: ['symvar', 'isVariable'] },
    isSymType: { summary: 'Check if symbolic object is of a given type', syntax: ['TF = isSymType(symObj,type)', 'TF = isSymType(symObj,funType,vars)'], description: ['TF = isSymType(symObj,type) returns true if symObj has type as its topmost operator type.'], seealso: ['hasSymType', 'findSymType', 'symType'] },
    isVariable: { summary: 'Check if symbolic expression is a single variable', syntax: ['tf = isVariable(expr)'], description: ['Returns true if expr is a single symbolic variable (not a compound expression or constant).'], seealso: ['symvar', 'isDistinctVariable', 'isSymType'] },
    iztrans: { summary: 'Symbolic inverse Z-transform', syntax: ['iztrans(F)', 'iztrans(F,transVar)'], description: ['iztrans(F) returns the inverse Z-transform of F with default variable z and result in n.'], seealso: ['ztrans', 'laplace', 'ilaplace'] },
    laplace: { summary: 'Symbolic Laplace transform', syntax: ['F = laplace(f)', 'F = laplace(f,transVar)'], description: ['F = laplace(f) returns the Laplace transform of f with default variable t and transform variable s.'], seealso: ['ilaplace', 'fourier', 'ztrans'] },
    mapSymType: { summary: 'Apply function to subexpressions of a given symbolic type', syntax: ['X = mapSymType(symObj,type,func)', 'X = mapSymType(symObj,funType,vars,func)'], description: ['X = mapSymType(symObj,type,func) applies func to all subobjects of type type in symObj.'], seealso: ['findSymType', 'isSymType', 'symType'] },
    matlabFunction: { summary: 'Convert symbolic expression to MATLAB function handle', syntax: ['ht = matlabFunction(f)', 'ht = matlabFunction(f1,...,fN)'], description: ['ht = matlabFunction(f) converts symbolic expression f to a MATLAB function handle for numerical evaluation.'], seealso: ['ccode', 'fortran', 'daeFunction'] },
    odeToVectorField: { summary: 'Convert higher-order ODE to first-order system', syntax: ['V = odeToVectorField(eqn1,...,eqnN)', '[V,S] = odeToVectorField(eqn1,...,eqnN)'], description: ['V = odeToVectorField(eqn) converts a higher-order ODE to a system of first-order ODEs, returned as a symbolic vector.'], seealso: ['dsolve', 'matlabFunction', 'ode45'] },
    pade: { summary: 'Padé approximant of a symbolic expression', syntax: ['pade(f,var)', 'pade(f,var,a)'], description: ['pade(f,var) returns the third-order Padé approximant of f at var=0.'], seealso: ['series', 'taylor'] },
    partfrac: { summary: 'Partial fraction decomposition', syntax: ['partfrac(expr,var)', 'partfrac(expr,var,Name,Value)'], description: ['partfrac(expr,var) finds the partial fraction decomposition of expr with respect to var.'], seealso: ['children', 'coeffs', 'collect', 'ilaplace'] },
    piecewise: { summary: 'Create symbolic piecewise expression', syntax: ['pw = piecewise(cond1,val1,cond2,val2,...)', 'pw = piecewise(cond1,val1,...,otherwiseVal)'], description: ['pw = piecewise(cond1,val1,...) returns a symbolic expression whose value is val_k when cond_k is true.'], seealso: ['heaviside', 'dirac', 'assume'] },
    poles: { summary: 'Find poles of a symbolic expression', syntax: ['P = poles(f,var)', 'P = poles(f,var,a,b)'], description: ['P = poles(f,var) returns the poles of f with respect to var.'], seealso: ['limit', 'partfrac', 'vpasolve'] },
    polynomialDegree: { summary: 'Degree of a symbolic polynomial', syntax: ['polynomialDegree(p)', 'polynomialDegree(p,vars)'], description: ['polynomialDegree(p) returns the total degree of polynomial p with respect to all its variables.'], seealso: ['coeffs', 'polynomialReduce'] },
    polynomialReduce: { summary: 'Reduce polynomial by a set of divisor polynomials', syntax: ['r = polynomialReduce(p,d)', 'r = polynomialReduce(p,d,vars)'], description: ['r = polynomialReduce(p,d) returns the remainder of dividing polynomial p by the set of polynomials d.'], seealso: ['eliminate', 'gbasis', 'polynomialDegree'] },
    quorem: { summary: 'Quotient and remainder of symbolic polynomial division', syntax: ['[Q,R] = quorem(A,B,var)'], description: ['[Q,R] = quorem(A,B,var) returns quotient Q and remainder R of dividing polynomial A by B in variable var, so that A = Q*B + R.'], seealso: ['deconv', 'mod', 'rem'] },
    rewrite: { summary: 'Rewrite symbolic expression in terms of another function', syntax: ['R = rewrite(expr,target)'], description: ["R = rewrite(expr,target) rewrites expr in terms of target function (e.g. 'exp', 'sin', 'log', 'heaviside')."], seealso: ['simplify', 'combine', 'expand'] },
    series: { summary: 'Puiseux series expansion of a symbolic expression', syntax: ['series(f,var)', 'series(f,var,a)'], description: ['series(f,var) returns the Puiseux series expansion of f up to the fifth order at var=0.'], seealso: ['pade', 'taylor', 'limit'] },
    str2sym: { summary: 'Convert string to symbolic expression', syntax: ['str2sym(symstr)'], description: ["str2sym('sin(x)+cos(x)') parses the string and returns the corresponding symbolic expression."], seealso: ['sym', 'syms', 'subs', 'vpa'] },
    subexpr: { summary: 'Rewrite expression by extracting common subexpression', syntax: ['[r,sigma] = subexpr(expr)', "[r,var] = subexpr(expr,'var')"], description: ["[r,sigma] = subexpr(expr) rewrites expr by substituting a common subexpression with the variable sigma."], seealso: ['simplify', 'subs', 'children'] },
    sym2cell: { summary: 'Convert symbolic array to cell array', syntax: ['C = sym2cell(S)'], description: ['C = sym2cell(S) converts symbolic array S to a cell array C of the same size.'], seealso: ['cell2sym', 'cell2mat', 'num2cell'] },
    symFunType: { summary: 'Return symbolic function type identifier', syntax: ['t = symFunType(f)'], description: ['symFunType returns internal type information for a symbolic function, used by the Symbolic Toolbox type dispatch system.'], seealso: ['symType', 'isSymType', 'findSymType'] },
    symType: { summary: 'Return the symbolic type of an expression', syntax: ['s = symType(symObj)'], description: ["s = symType(symObj) returns a string describing the topmost type of symObj, e.g. 'variable', 'plus', 'sin'."], seealso: ['isSymType', 'hasSymType', 'findSymType'] },
    symfalse: { summary: 'Symbolic logical false constant', syntax: ['symfalse', 'F = symfalse(n)'], description: ['symfalse is the symbolic counterpart of logical false, returned by symbolic comparisons that always evaluate to false.'], seealso: ['symtrue', 'isAlways', 'and', 'or', 'not'] },
    symfun: { summary: 'Create a symbolic function with explicit formula and variables', syntax: ['f = symfun(expr,vars)'], description: ['f = symfun(expr,vars) creates a symbolic function with body expr and input variables vars.'], seealso: ['syms', 'sym', 'argnames', 'formula'] },
    symtrue: { summary: 'Symbolic logical true constant', syntax: ['symtrue', 'T = symtrue(n)'], description: ['symtrue is the symbolic counterpart of logical true, returned by symbolic comparisons that always evaluate to true.'], seealso: ['symfalse', 'isAlways', 'and', 'or', 'not'] },
    texlabel: { summary: 'Convert symbolic expression to TeX string for plot labels', syntax: ['str = texlabel(expr)'], description: ['str = texlabel(expr) converts a symbolic expression to a TeX string suitable for MATLAB plot labels and titles.'], seealso: ['latex', 'title', 'xlabel'] },
    vpaintegral: { summary: 'Numerically integrate using variable-precision arithmetic', syntax: ['vpaintegral(f,a,b)', 'vpaintegral(f,x,a,b)'], description: ['vpaintegral(f,a,b) numerically approximates the integral of f from a to b using vpa arithmetic.'], seealso: ['int', 'integral', 'vpa', 'digits'] },
    vpasum: { summary: 'Sum series using variable-precision arithmetic', syntax: ['S = vpasum(f,x,a,b)'], description: ['vpasum(f,x,a,b) numerically evaluates the sum of f in x from a to b using vpa arithmetic.'], seealso: ['symsum', 'vpa', 'sum'] },
    ztrans: { summary: 'Symbolic Z-transform', syntax: ['fz = ztrans(f)', 'fz = ztrans(f,transVar)'], description: ['fz = ztrans(f) returns the Z-transform of f with default variable n and transform variable z.'], seealso: ['iztrans', 'laplace', 'fourier'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Text Analytics Toolbox, extracted from textanalytics.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_TEXTANALYTICS: Record<string, HelpEntry | string> = {
    tokenizedDocument: {
      summary: 'Array of tokenized documents',
      syntax: ['documents = tokenizedDocument(str)', 'documents = tokenizedDocument(cellstr)'],
      description: [
        'documents = tokenizedDocument(str) splits the string into tokens (words) by whitespace and punctuation, lowercases all tokens, and returns a tokenizedDocument object.',
        'documents = tokenizedDocument(cellstr) tokenizes each string in the cell array and returns an array of tokenized documents.',
        'Access tokens via documents.NumDocuments and documents.NumTokens. Pass to bagOfWords or removeStopWords for further processing.',
      ],
      seealso: ['bagOfWords', 'removeStopWords', 'tfidf', 'fitlda'],
    },
    removeStopWords: {
      summary: 'Remove stop words from tokenized documents',
      syntax: ['documents = removeStopWords(documents)', 'documents = removeStopWords(documents,customWords)'],
      description: [
        'documents = removeStopWords(documents) removes common English stop words (the, a, is, and, …) from each tokenized document.',
        'removeStopWords(documents,customWords) additionally removes the words listed in the cell array customWords.',
        'Built-in list includes ~130 common English stop words.',
      ],
      seealso: ['tokenizedDocument', 'bagOfWords', 'normalizeWords'],
    },
    bagOfWords: {
      summary: 'Bag-of-words model',
      syntax: ['bag = bagOfWords(documents)', 'bag = bagOfWords(documents,customVocab)'],
      description: [
        'bag = bagOfWords(documents) creates a bag-of-words model from a tokenizedDocument array.',
        'bag.Vocabulary lists all unique words in first-appearance order (matching MATLAB).',
        'bag.Counts is an [nDocs × nVocab] matrix of word occurrence counts.',
        'bag.NumDocuments and bag.NumWords give the corpus and vocabulary sizes.',
        'Pass bag to tfidf for TF-IDF weighting or fitlda for topic modelling.',
      ],
      seealso: ['tokenizedDocument', 'tfidf', 'fitlda', 'removeStopWords'],
    },
    tfidf: {
      summary: 'TF-IDF matrix',
      syntax: ['M = tfidf(bag)', 'M = tfidf(bag,documents)'],
      description: [
        'M = tfidf(bag) returns an [nDocs × nVocab] matrix of TF-IDF weights.',
        'TF(d,w) = count(d,w)   (raw term frequency, no per-document normalisation)',
        'IDF(w) = log(N / df(w))   (no smoothing; 0 if the word occurs in every document)',
        'TFIDF(d,w) = TF(d,w) * IDF(w), matching the MATLAB default.',
        'Use for document similarity, clustering, or as feature matrix for classifiers.',
      ],
      seealso: ['bagOfWords', 'fitlda', 'tokenizedDocument'],
    },
    fitlda: {
      summary: 'Fit latent Dirichlet allocation (LDA) topic model',
      syntax: ['mdl = fitlda(bag,numTopics)', "mdl = fitlda(bag,numTopics,'NumIterations',200)"],
      description: [
        'mdl = fitlda(bag,K) fits a K-topic LDA model to the bag-of-words corpus using collapsed Gibbs sampling.',
        'Default priors: α = 50/K (document-topic), β = 0.1 (topic-word). Default 100 Gibbs iterations.',
        'mdl.TopicWordProbabilities is [K × V]: P(word | topic).',
        'mdl.DocumentTopicProbabilities is [nDocs × K]: P(topic | document).',
        'mdl.Perplexity measures model fit (lower = better).',
        "Options: 'NumIterations' (default 100), 'Alpha' (default 50/K), 'Beta' (default 0.1).",
      ],
      seealso: ['bagOfWords', 'tfidf', 'tokenizedDocument'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the UAV Toolbox, extracted from uav.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

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

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Computer Vision Toolbox, extracted from vision.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_VISION: Record<string, HelpEntry | string> = {
    detectHarrisFeatures: {
      summary: 'Detect Harris corners in a grayscale image',
      syntax: ['corners = detectHarrisFeatures(I)', 'corners = detectHarrisFeatures(I,MinQuality,q)', 'corners = detectHarrisFeatures(I,MinQuality,q,FilterSize,f)'],
      description: [
        'corners = detectHarrisFeatures(I) returns a cornerPoints object containing Harris corner locations and response metrics.',
        'Uses Sobel gradients → structure tensor (summed over 5×5 window) → Harris response R = det(M) - k*trace(M)^2, k=0.05.',
        'Non-maximum suppression with 3-pixel radius. Points sorted by descending response.',
        'corners.Location is [N×2] [x,y] (1-based). corners.Metric is [N×1] response values.',
      ],
      seealso: ['detectFASTFeatures', 'extractFeatures', 'matchFeatures', 'corner'],
    },
    detectFASTFeatures: {
      summary: 'Detect FAST corners in a grayscale image',
      syntax: ['corners = detectFASTFeatures(I)', 'corners = detectFASTFeatures(I,MinContrast,t)'],
      description: [
        'corners = detectFASTFeatures(I) returns a cornerPoints object using the FAST-9 detector.',
        'A pixel is a corner if 9 consecutive pixels on a circle of radius 3 are all brighter or darker by at least the threshold t (default 20).',
        'Quick 4-point pre-test rejects non-corners early. Corner strength = sum of absolute differences to circle pixels.',
        'Results are non-maximum suppressed and sorted by descending strength.',
      ],
      seealso: ['detectHarrisFeatures', 'extractFeatures', 'matchFeatures'],
    },
    extractFeatures: {
      summary: 'Extract feature descriptors from an image at keypoint locations',
      syntax: ['[features,validPts] = extractFeatures(I,pts)', '[features,validPts] = extractFeatures(I,pts,Method,m)'],
      description: [
        '[features,validPts] = extractFeatures(I,pts) returns an [N×64] matrix of normalized 8×8 patch descriptors at each valid keypoint.',
        'Each descriptor is the zero-mean unit-variance patch of size 8×8 pixels centered on the keypoint.',
        'Keypoints too close to the image border (within 4 pixels) are excluded from validPts.',
        'pts can be a cornerPoints object or an [N×2] matrix of [x,y] locations.',
      ],
      seealso: ['detectHarrisFeatures', 'detectFASTFeatures', 'matchFeatures'],
    },
    matchFeatures: {
      summary: 'Find putative correspondences between two sets of feature descriptors',
      syntax: ['indexPairs = matchFeatures(features1,features2)', 'indexPairs = matchFeatures(features1,features2,ratio)'],
      description: [
        'indexPairs = matchFeatures(F1,F2) returns an [M×2] matrix where each row [i,j] means the i-th feature in F1 matches the j-th feature in F2.',
        'Uses brute-force L2 distance with Lowe\'s ratio test: match is accepted if best_distance < 0.6 * second_best_distance.',
        'ratio overrides the ratio threshold (default 0.6). Smaller → stricter (fewer but more reliable matches).',
        'Matches are unique (each F2 descriptor can only be matched once).',
      ],
      seealso: ['extractFeatures', 'estimateFundamentalMatrix', 'detectHarrisFeatures'],
    },
    estimateFundamentalMatrix: {
      summary: 'Estimate fundamental matrix from point correspondences',
      syntax: ['F = estimateFundamentalMatrix(pts1,pts2)', '[F,inliers] = estimateFundamentalMatrix(pts1,pts2,Method,m)'],
      description: [
        'F = estimateFundamentalMatrix(pts1,pts2) returns the 3×3 fundamental matrix relating two views.',
        'pts1 and pts2 are [N×2] matrices of matching image coordinates (at least 8 pairs required).',
        'Uses the normalized 8-point algorithm (Hartley 1997):',
        '  1. Normalize points to have zero mean and RMS distance √2.',
        '  2. Build [N×9] matrix A from outer products of homogeneous coordinates.',
        '  3. Smallest singular vector of A (via power iteration on A\'A) gives raw F.',
        '  4. Enforce rank-2 via SVD: zero out smallest singular value.',
        '  5. Denormalize: F ← T2\' * F * T1.',
        'A point x2 matches x1 if x2\' * F * x1 ≈ 0 (epipolar constraint).',
      ],
      seealso: ['matchFeatures', 'extractFeatures', 'estimateEssentialMatrix'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Wavelet Toolbox, extracted from wavelet.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_WAVELET: Record<string, HelpEntry | string> = {
    dct: { summary: 'Discrete cosine transform', syntax: ['y = dct(x)', 'y = dct(x,n)'], seealso: ['idct', 'fft'] },
    dwt: { summary: 'Single-level 1-D discrete wavelet transform', syntax: ['[cA,cD] = dwt(x,wname)', '[cA,cD] = dwt(x,Lo_D,Hi_D)'], seealso: ['idwt', 'wavedec'] },
    wavedec: { summary: 'Multilevel 1-D wavelet decomposition', syntax: ['[c,l] = wavedec(x,n,wname)', '[c,l] = wavedec(x,n,LoD,HiD)', '[c,l] = wavedec(___,Mode=extmode)'], seealso: ['waverec', 'dwt', 'detcoef'], description: ['[c,l] = wavedec(x,n,wname) returns the wavelet decomposition of the 1-D signal x at level n using the wavelet wname. The output decomposition structure consists of the wavelet decomposition vector c and the bookkeeping vector l, which is used to parse c.', '[c,l] = wavedec(x,n,LoD,HiD) returns the wavelet decomposition using the specified lowpass and highpass wavelet decomposition filters LoD and HiD, respectively.', '[c,l] = wavedec(___,Mode=extmode) uses the specified discrete wavelet transform (DWT) extension mode extmode. This syntax can be used with either of the previous syntaxes.'] },
    haart: { summary: '1-D Haar discrete wavelet transform', syntax: ['[a,d] = haart(x)', '[a,d] = haart(x,level)', '[a,d] = haart(x,level,integerflag)'], seealso: ['ihaart', 'ihaart2', 'haart2'], description: ['[a,d] = haart(x) performs the 1-D Haar discrete wavelet transform of the even-length vector, x. The input x can be univariate or multivariate data. If x is a matrix, haart operates on each column of x. If the length of x is a power of 2, the Haar transform is obtained down to level log2(length(x)). Otherwise, the Haar transform is obtained down to level floor(log2(length(x)/2)).', '[a,d] = haart(x,level) obtains the Haar transform down to the specified level.', '[a,d] = haart(___,integerflag) specifies how the Haar transform handles integer-valued data, using any of the previous syntaxes.'] },
    ihaart2: { summary: 'Inverse 2-D Haar discrete wavelet transform', syntax: ['xrec = ihaart2(a,h,v,d)', 'xrec = ihaart2(a,h,v,d,level)', 'xrec = ihaart2(___,integerflag)'], seealso: ['haart', 'ihaart', 'haart2'], description: ['xrec = ihaart2(a,h,v,d) returns the inverse 2-D Haar transform, xrec, for the approximation coefficients, a, and the horizontal, vertical, and diagonal detail coefficients, h, v, and d. All the inputs, a, h, v, and d, are outputs of haart2.', 'xrec = ihaart2(a,h,v,d,level) returns the inverse 2-D Haar transform at the specified level.', 'xrec = ihaart2(___,integerflag) specifies how the inverse 2-D Haar transform handles integer-valued data, using any of the previous syntaxes.'] },
    detcoef: { summary: 'Extract detail coefficients from wavelet decomposition', syntax: ['D = detcoef(C,L)', 'D = detcoef(C,L,N)', 'D = detcoef(C,L,N,"cells")'], seealso: ['appcoef', 'wavedec'], description: ['D = detcoef(C,L) extracts the detail coefficients at the coarsest scale from the wavelet decomposition structure [C, L]. See wavedec for more information on C and L.', 'D = detcoef(C,L,N) extracts the detail coefficients at the level or levels specified by N.', 'D = detcoef(C,L,N,"cells") returns a cell array containing the detail coefficients. A minimum of two levels must be specified. The _i_ th element of D contains the detail coefficients at the _i_ th specified level.', '* If length(N)>1, the D = detcoef(C,L,N) is equivalent to D = detcoef(C,L,N,"cells").', '* D = detcoef(C,L,"cells") is equivalent to D = detcoef(C,L,[1:NMAX]), where NMAX = length(L)-2.'] },
    dyaddown: { summary: 'Dyadic downsampling', syntax: ['Y = dyaddown(X)', 'Y = dyaddown(X,EVENODD)', "Y = dyaddown(___,'type')"], seealso: ['dyadup'], description: ['Y = dyaddown(X) downsamples even-indexed elements of X. Y contains even-index samples of X in this case. Specify X as a vector or matrix. When you specify X as a vector, the function returns a version of X downsampled by 2.', 'Y = dyaddown(X,EVENODD) downsamples even- or odd-indexed elements of X. Y can contain even- or odd-indexed samples of X depends on the value of EVENODD. Specify X as a vector. When you specify X as a vector, the function returns a version of X downsampled by 2.', 'Y = dyaddown(___,\'type\') returns a version of X obtained by suppressing columns or rows, or rows and columns of X using \'type\' argument. Specify X as a matrix.'] },
    qorthwavf: { summary: 'Kingsbury Q-shift filters for complex dual-tree transform', syntax: ['[LoDa,LoDb,HiDa,HiDb,LoRa,LoRb,HiRa,HiRb] = qorthwavf(num)'], seealso: ['qbiorthfilt', 'dualtree'], description: ['[LoDa,LoDb,HiDa,HiDb,LoRa,LoRb,HiRa,HiRb] = qorthwavf(num) returns the Kingsbury Q-shift filters for the Q-shift complex dual-tree transform. The integer num refers to the number of nonzero coefficients (taps) in the filter. Valid options for num are 6, 10, 14, 16, and 18. All filters are of even lengths and the tree B filters are the time reverse of the tree A filters.'] },
    biorwavf: { summary: 'Biorthogonal wavelet filter pair (reconstruction and decomposition)', syntax: ['[RF,DF] = biorwavf(wname)'], seealso: ['biorfilt', 'waveinfo'], description: ['[RF,DF] = biorwavf(wname) returns the reconstruction (synthesis) and decomposition (analysis) scaling filters, RF and DF, respectively, associated with the biorthogonal wavelet specified by wname.'] },
    biorfilt: { summary: 'Biorthogonal wavelet filters (four-filter bank)', syntax: ['[LoD,HiD,LoR,HiR] = biorfilt(DF,RF)', "[LoD1,HiD1,LoR1,HiR1,LoD2,HiD2,LoR2,HiR2] = biorfilt(DF,RF,'8')"], seealso: ['biorwavf', 'orthfilt'], description: ['[LoD,HiD,LoR,HiR] = biorfilt(DF,RF) returns four filters associated with the biorthogonal wavelet specified by decomposition filter DF and reconstruction filter RF. These filters are', '* LoD — Decomposition lowpass filter', '* HiD — Decomposition highpass filter', '* LoR — Reconstruction lowpass filter', '* HiR — Reconstruction highpass filter'] },
  };

