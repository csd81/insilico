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
    convlength: { summary: 'Convert length units', syntax: ['c = convlength(v,from,to)'], seealso: ['convvel', 'convmass'] },
    convvel: { summary: 'Convert velocity units', syntax: ['c = convvel(v,from,to)'], seealso: ['convlength', 'convforce'] },
    convmass: { summary: 'Convert mass units', syntax: ['c = convmass(v,from,to)'], seealso: ['convvel', 'convforce'] },
    convforce: { summary: 'Convert force units', syntax: ['c = convforce(v,from,to)'], seealso: ['convmass', 'convpres'] },
    convpres: { summary: 'Convert pressure units', syntax: ['c = convpres(v,from,to)'], seealso: ['convdensity', 'convvel'] },
    convdensity: { summary: 'Convert density units', syntax: ['c = convdensity(v,from,to)'], seealso: ['convpres', 'convmass'] },
    convacc: { summary: 'Convert acceleration units', syntax: ['c = convacc(v,from,to)'], seealso: ['convvel', 'convforce'] },
    convang: { summary: 'Convert angle units', syntax: ['c = convang(v,from,to)'], seealso: ['convangvel', 'convangacc'] },
    convangvel: { summary: 'Convert angular velocity units', syntax: ['c = convangvel(v,from,to)'], seealso: ['convang', 'convangacc'] },
    convangacc: { summary: 'Convert angular acceleration units', syntax: ['c = convangacc(v,from,to)'], seealso: ['convang', 'convangvel'] },
    convtemp: { summary: 'Convert temperature units', syntax: ['c = convtemp(v,from,to)'], seealso: ['convpres', 'convdensity'] },
    quatconj: { summary: 'Calculate conjugate of quaternion', syntax: ['qc = quatconj(q)'], seealso: ['quatinv', 'quatnormalize', 'quatmultiply'] },
    quatinv: { summary: 'Calculate inverse of quaternion', syntax: ['qi = quatinv(q)'], seealso: ['quatconj', 'quatnormalize', 'quatmultiply'] },
    quatnormalize: { summary: 'Normalize quaternion', syntax: ['qn = quatnormalize(q)'], seealso: ['quatmod', 'quatnorm', 'quatmultiply'] },
    quatmod: { summary: 'Calculate modulus (magnitude) of quaternion', syntax: ['m = quatmod(q)'], seealso: ['quatnorm', 'quatnormalize', 'quatinv'] },
    quatnorm: { summary: 'Norm (sum of squares) of quaternion', syntax: ['n = quatnorm(q)'], seealso: ['quatmod', 'quatnormalize'] },
    quatmultiply: { summary: 'Calculate product of two quaternions', syntax: ['r = quatmultiply(q,p)'], seealso: ['quatinv', 'quatconj', 'quatdivide'] },
    quatdivide: { summary: 'Divide quaternion by another', syntax: ['q = quatdivide(q1,q2)'], seealso: ['quatmultiply', 'quatinv'] },
    quatrotate: { summary: 'Rotate vector by quaternion', syntax: ['vr = quatrotate(q,v)'], seealso: ['quat2dcm', 'dcm2quat', 'quatmultiply'] },
    quat2dcm: { summary: 'Convert quaternion to direction cosine matrix', syntax: ['dcm = quat2dcm(q)'], seealso: ['dcm2quat', 'angle2dcm', 'quatrotate'] },
    dcm2quat: { summary: 'Convert direction cosine matrix to quaternion', syntax: ['q = dcm2quat(dcm)'], seealso: ['quat2dcm', 'angle2quat', 'dcm2angle'] },
    quat2rod: { summary: 'Convert quaternion to Euler-Rodrigues vector', syntax: ['r = quat2rod(q)'], seealso: ['rod2quat', 'quat2dcm'] },
    rod2quat: { summary: 'Convert Euler-Rodrigues vector to quaternion', syntax: ['q = rod2quat(r)'], seealso: ['quat2rod', 'rod2dcm'] },
    quatexp: { summary: 'Exponential of quaternion', syntax: ['qe = quatexp(q)'], seealso: ['quatlog', 'quatpower'] },
    quatlog: { summary: 'Natural logarithm of quaternion', syntax: ['ql = quatlog(q)'], seealso: ['quatexp', 'quatpower'] },
    quatpower: { summary: 'Power of quaternion', syntax: ['qp = quatpower(q,p)'], seealso: ['quatexp', 'quatlog', 'quatmultiply'] },
    quatinterp: { summary: 'Spherical linear interpolation between two quaternions (SLERP)', syntax: ['qi = quatinterp(q1,q2,f)'], seealso: ['quatmultiply', 'quatnormalize'] },
    angle2quat: { summary: 'Convert rotation angles to quaternion', syntax: ['q = angle2quat(r1,r2,r3)'], seealso: ['quat2angle', 'angle2dcm', 'quat2dcm'] },
    quat2angle: { summary: 'Convert quaternion to rotation angles', syntax: ['[r1,r2,r3] = quat2angle(q)'], seealso: ['angle2quat', 'dcm2angle', 'quat2dcm'] },
    angle2dcm: { summary: 'Convert rotation angles to direction cosine matrix', syntax: ['dcm = angle2dcm(r1,r2,r3)'], seealso: ['dcm2angle', 'angle2quat', 'quat2dcm'] },
    dcm2angle: { summary: 'Convert direction cosine matrix to rotation angles', syntax: ['[r1,r2,r3] = dcm2angle(dcm)'], seealso: ['angle2dcm', 'dcm2quat', 'quat2angle'] },
    angle2rod: { summary: 'Convert rotation angles to Euler-Rodrigues vector', syntax: ['r = angle2rod(r1,r2,r3)'], seealso: ['rod2angle', 'angle2quat', 'angle2dcm'] },
    rod2angle: { summary: 'Convert Euler-Rodrigues vector to rotation angles', syntax: ['[r1,r2,r3] = rod2angle(r)'], seealso: ['angle2rod', 'rod2dcm', 'dcm2angle'] },
    rod2dcm: { summary: 'Convert Euler-Rodrigues vector to direction cosine matrix', syntax: ['dcm = rod2dcm(r)'], seealso: ['dcm2rod', 'rod2angle', 'angle2dcm'] },
    dcm2rod: { summary: 'Convert direction cosine matrix to Euler-Rodrigues vector', syntax: ['r = dcm2rod(dcm)'], seealso: ['rod2dcm', 'dcm2quat', 'dcm2angle'] },
    atmosisa: { summary: 'International Standard Atmosphere (ISA) model', syntax: ['[T,a,P,rho] = atmosisa(h)'], seealso: ['atmospalt', 'atmoscoesa'] },
    atmoscoesa: { summary: 'COESA 1976 standard atmosphere model', syntax: ['[T,a,P,rho] = atmoscoesa(h)'], seealso: ['atmosisa', 'atmospalt'] },
    atmospalt: { summary: 'Calculate pressure altitude from ambient pressure', syntax: ['h = atmospalt(P)'], seealso: ['atmosisa', 'atmoscoesa'] },
    airspeed: { summary: 'Compute airspeed from velocity vector', syntax: ['v = airspeed(vel)'], seealso: ['alphabeta', 'machnumber'] },
    alphabeta: { summary: 'Compute angle of attack and sideslip from velocity vector', syntax: ['[alpha,beta] = alphabeta(vel)'], seealso: ['airspeed', 'dcm2alphabeta', 'dpressure'] },
    dcm2alphabeta: { summary: 'Convert direction cosine matrix to angle of attack and sideslip', syntax: ['[alpha,beta] = dcm2alphabeta(dcm)'], seealso: ['alphabeta', 'angle2dcm', 'dcm2angle'] },
    dpressure: { summary: 'Compute dynamic pressure from velocity and density', syntax: ['q = dpressure(v,rho)'], seealso: ['machnumber', 'airspeed', 'atmosisa'] },
    machnumber: { summary: 'Compute Mach number from velocity and speed of sound', syntax: ['M = machnumber(v,a)'], seealso: ['airspeed', 'dpressure', 'atmosisa'] },
    geocradius: { summary: 'Radius of ellipsoid planet at geocentric latitude', syntax: ['r = geocradius(lat)'], seealso: ['geoc2geod', 'geod2geoc'] },
    dcmbody2stability: { summary: 'Body to stability axes direction cosine matrix', syntax: ['dcm = dcmbody2stability(alpha)'], seealso: ['dcmbody2wind'] },
    flowprandtlmeyer: { summary: 'Prandtl-Meyer expansion flow relations', syntax: ['[M,nu,mu] = flowprandtlmeyer(gamma,x,mtype)'], seealso: ['flowisentropic', 'flownormalshock'] },
    flownormalshock: { summary: 'Normal shock relations for compressible flow', syntax: ['[M2,T,P,rho,P0,TotalP] = flownormalshock(gamma,M)'], seealso: ['flowisentropic', 'flowrayleigh', 'flowfanno'] },
    flowfanno: { summary: 'Fanno line (adiabatic duct with friction) flow relations', syntax: ['[M,T,P,rho,V,P0,F] = flowfanno(gamma,M)'], seealso: ['flownormalshock', 'flowrayleigh', 'flowisentropic'] },
    flowrayleigh: { summary: 'Rayleigh line (frictionless duct with heat addition) flow relations', syntax: ['[M,T,P,rho,V,P0,T0] = flowrayleigh(gamma,M)'], seealso: ['flowfanno', 'flownormalshock', 'flowisentropic'] },
    rrdelta: { summary: 'Compute relative pressure ratio (P/P_SL)', syntax: ['delta = rrdelta(P,P0)'], seealso: ['rrtheta', 'rrsigma', 'atmosisa'] },
    rrtheta: { summary: 'Compute relative temperature ratio (T/T_SL)', syntax: ['theta = rrtheta(T,T0)'], seealso: ['rrdelta', 'rrsigma'] },
    rrsigma: { summary: 'Compute relative density ratio (rho/rho_SL)', syntax: ['sigma = rrsigma(rho,rho0)'], seealso: ['rrdelta', 'rrtheta'] },
    flowisentropic: { summary: 'Isentropic flow ratios for compressible flow', syntax: ['[M,T,P,rho,A] = flowisentropic(gamma,x)'], seealso: ['flownormalshock', 'flowprandtlmeyer'] },
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
    hz2bark: { summary: 'Converts values in hertz to values on the Bark frequency scale.', syntax: ['bark = hz2bark(hz)'], seealso: ['bark2hz', 'hz2mel', 'mel2hz', 'hz2erb'] },
    bark2hz: { summary: 'Converts values on the Bark frequency scale to values in hertz.', syntax: ['hz = bark2hz(bark)'], seealso: ['hz2bark', 'hz2mel', 'mel2hz', 'hz2erb'] },
    hz2mel: { summary: 'Converts values in hertz to values on the mel frequency scale.', syntax: ['mel = hz2mel(hz)'], seealso: ['mel2hz', 'hz2erb', 'erb2hz', 'hz2bark'] },
    mel2hz: { summary: 'Converts values on the mel frequency scale to values in hertz.', syntax: ['hz = mel2hz(mel)'], seealso: ['hz2mel', 'hz2erb', 'erb2hz', 'hz2bark'] },
    hz2erb: { summary: 'Converts values in hertz to values on the ERB frequency scale.', syntax: ['erb = hz2erb(hz)'], seealso: ['erb2hz', 'hz2mel', 'mel2hz', 'hz2bark'] },
    erb2hz: { summary: 'Converts values on the ERB frequency scale to values in hertz.', syntax: ['hz = erb2hz(erb)'], seealso: ['hz2erb', 'hz2mel', 'mel2hz', 'hz2bark'] },
    dBov: { summary: 'Convert linear amplitude to dBov (full-scale decibels)', syntax: ['dBov_val = dBov(x)'], seealso: ['mag2db', 'db2mag'] },
    phon2sone: { summary: 'Converts phon to sone, according to ISO 532-1:2017(E).', syntax: ['sone = phon2sone(phon)'], seealso: ['sone2phon', 'acousticLoudness'] },
    sone2phon: { summary: 'Converts sone to phon, according to ISO 532-1:2017(E).', syntax: ['phon = sone2phon(sone)'], seealso: ['phon2sone', 'acousticLoudness'] },
    octavebw2bw: { summary: 'Converts octave bandwidths N and band center frequencies fc into linear analog cutoff frequencies cutoffsAnalog.', syntax: ['cutoffsAnalog = octavebw2bw(N,fc)'], seealso: ['q2octavebw', 'octavebw2q', 'bw2octavebw', 'audioBandwidthSpecification'] },
    bw2octavebw: { summary: 'Converts cutoff frequencies into octave bandwidths, N.', syntax: ['[N,FcAnalog] = bw2octavebw(CutoffFrequencies)'], seealso: ['q2octavebw', 'octavebw2q', 'octavebw2bw', 'audioBandwidthSpecification'] },
    mls: { summary: 'Returns an excitation signal generated using the maximum length sequence (MLS) technique.', syntax: ['excitation = mls'], seealso: ['impzest', 'sweeptone'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Bioinformatics Toolbox, extracted from bioinfo.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_BIOINFO: Record<string, HelpEntry | string> = {
    nt2int: { summary: 'Convert nucleotide sequence to integer sequence', syntax: ['SeqInt = nt2int(SeqChar)'], seealso: ['int2nt', 'aa2int', 'baselookup'] },
    int2nt: { summary: 'Convert integer sequence to nucleotide sequence', syntax: ['SeqChar = int2nt(SeqInt)'], seealso: ['nt2int', 'int2aa', 'baselookup'] },
    aa2int: { summary: 'Convert amino acid sequence to integer sequence', syntax: ['SeqInt = aa2int(SeqChar)'], seealso: ['int2aa', 'nt2int', 'aminolookup'] },
    int2aa: { summary: 'Convert integer sequence to amino acid sequence', syntax: ['SeqChar = int2aa(SeqInt)'], seealso: ['aa2int', 'int2nt', 'aminolookup'] },
    seqreverse: { summary: 'Reverse a nucleotide sequence', syntax: ['SeqR = seqreverse(SeqNT)'], seealso: ['seqcomplement', 'seqrcomplement', 'fliplr'] },
    seqcomplement: { summary: 'Complementary strand of a DNA/RNA nucleotide sequence', syntax: ['SeqC = seqcomplement(SeqNT)'], seealso: ['seqrcomplement', 'seqreverse', 'palindromes'] },
    seqrcomplement: { summary: 'Reverse complement of a DNA/RNA nucleotide sequence', syntax: ['SeqRC = seqrcomplement(SeqNT)'], seealso: ['seqcomplement', 'seqreverse'] },
    basecount: { summary: 'Count nucleotide base occurrences in a sequence', syntax: ['NTStruct = basecount(SeqNT)'], seealso: ['aacount', 'codoncount', 'dimercount', 'baselookup'] },
    aacount: { summary: 'Count amino acid occurrences in a sequence', syntax: ['countStruct = aacount(SeqAA)'], seealso: ['basecount', 'codoncount', 'aminolookup'] },
    nt2aa: { summary: 'Convert nucleotide sequence to amino acid sequence', syntax: ['SeqAA = nt2aa(SeqNT)'], seealso: ['aa2nt', 'baselookup', 'codonbias'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Communications Toolbox, extracted from comm.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_COMM: Record<string, HelpEntry | string> = {
    zadoffChuSeq: { summary: 'Generate a Zadoff-Chu sequence', syntax: ['seq = zadoffChuSeq(R,N)'], seealso: [] },
    gen2par: { summary: 'Convert between parity-check and generator matrices', syntax: ['H = gen2par(G)'], seealso: ['cyclgen', 'hammgen'] },
    gfweight: { summary: 'Minimum distance of a linear block code', syntax: ['wt = gfweight(genmat)'], seealso: ['hammgen', 'cyclpoly', 'bchgenpoly'] },
    gfadd: { summary: 'Adds two GF(2) polynomials, a and b.', syntax: ['c = gfadd(a,b)'], seealso: ['gfsub', 'gfconv', 'gfmul', 'gfdeconv'] },
    gfdiv: { summary: 'Divides b by a in GF(2) element-by-element.', syntax: ['quot = gfdiv(b,a)'], seealso: ['gfmul', 'gfdeconv', 'gfconv', 'gftuple'] },
    cyclpoly: { summary: 'Returns the row vector representing one nontrivial generator polynomial for a cyclic code with codeword length N and message length K.', syntax: ['pol = cyclpoly(N,K)'], seealso: ['cyclgen', 'encode', 'gfprimfd'] },
    oct2poly: { summary: 'Convert octal number to binary polynomial coefficients', syntax: ['p = oct2poly(oct)'], seealso: ['poly2trellis', 'oct2dec'] },
    fspl: { summary: 'Free space path loss', syntax: ['L = fspl(R,lambda)'], seealso: ['fogpl', 'gaspl', 'rainpl'] },
    cyclgen: { summary: 'Produce parity-check and generator matrices for a cyclic code', syntax: ['h = cyclgen(n,p)'], seealso: ['encode', 'decode', 'bchgenpoly', 'cyclpoly'] },
    qfunc: { summary: 'Q function (Gaussian tail probability)', syntax: ['y = qfunc(x)'], seealso: ['qfuncinv', 'erfc'] },
    quantiz: { summary: 'Produce a quantization index and quantized output value', syntax: ['index = quantiz(sig,partition)'], seealso: ['lloyds'] },
    qfuncinv: { summary: 'Inverse Q function', syntax: ['z = qfuncinv(y)'], seealso: ['qfunc', 'erfinv'] },
    oct2dec: { summary: 'Convert octal to decimal numbers', syntax: ['dec = oct2dec(oct)'], seealso: [] },
    vec2mat: { summary: 'Convert vector into matrix (row-major, padded)', syntax: ['mat = vec2mat(vec,matcol)'], seealso: [] },
    compand: { summary: 'Source code mu-law or A-law compressor or expander', syntax: ['out = compand(in,param,v)'], seealso: [] },
    de2bi: { summary: 'Convert decimal numbers to binary digits', syntax: ['b = de2bi(d)'], seealso: ['bi2de'] },
    bi2de: { summary: 'Convert binary digits to decimal numbers', syntax: ['d = bi2de(b)'], seealso: ['de2bi'] },
    symerr: { summary: 'Count symbol errors and compute symbol error rate', syntax: ['[number,ratio] = symerr(x,y)'], seealso: ['biterr', 'alignsignals', 'finddelay'] },
    biterr: { summary: 'Count bit errors and compute bit error rate', syntax: ['[number,ratio] = biterr(x,y)'], seealso: ['symerr', 'alignsignals', 'finddelay'] },
    bin2gray: { summary: 'Convert positive integers to Gray-encoded integers', syntax: ['code = bin2gray(x)'], seealso: ['gray2bin'] },
    gray2bin: { summary: 'Convert Gray-encoded integers to positive integers', syntax: ['code = gray2bin(x)'], seealso: ['bin2gray'] },
    qammod: { summary: 'Quadrature amplitude modulation', syntax: ['Y = qammod(X,M)'], seealso: ['qamdemod', 'pskmod', 'pammod'] },
    qamdemod: { summary: 'Quadrature amplitude demodulation', syntax: ['Z = qamdemod(Y,M)'], seealso: ['qammod', 'pskdemod', 'pamdemod'] },
    pskmod: { summary: 'Phase shift keying modulation', syntax: ['Y = pskmod(X,M)'], seealso: ['pskdemod', 'qammod', 'dpskmod'] },
    pskdemod: { summary: 'Phase shift keying demodulation', syntax: ['Z = pskdemod(Y,M)'], seealso: ['pskmod', 'qamdemod', 'dpskdemod'] },
    marcumq: { summary: 'Generalized Marcum Q-function', syntax: ['Q = marcumq(a,b)'], seealso: ['besseli'] },
    finddelay: { summary: 'Estimate delay between signals', syntax: ['d = finddelay(x,y)'], seealso: ['alignsignals', 'xcorr'] },
    dpskmod: { summary: 'Differential phase shift keying modulation', syntax: ['y = dpskmod(x,M)'], seealso: ['dpskdemod', 'pskmod', 'pskdemod'] },
    dpskdemod: { summary: 'Differential phase shift keying demodulation', syntax: ['z = dpskdemod(y,M)'], seealso: ['dpskmod', 'pskdemod', 'pskmod'] },
    poly2trellis: { summary: 'Convert convolutional code polynomials to trellis description', syntax: ['trellis = poly2trellis(ConstraintLength,CodeGenerator)'], seealso: ['convenc', 'istrellis'] },
    convenc: { summary: 'Convolutionally encode binary data', syntax: ['codedout = convenc(msg,trellis)'], seealso: ['poly2trellis', 'vitdec', 'istrellis'] },
    istrellis: { summary: 'Check if input is a valid trellis structure', syntax: ['[isok,status] = istrellis(s)'], seealso: ['poly2trellis', 'convenc'] },
    hammgen: { summary: 'Produce parity-check and generator matrices for Hamming code', syntax: ['h = hammgen(m)'], seealso: ['encode', 'decode', 'gen2par'] },
    primpoly: { summary: 'Find primitive polynomials for a Galois field', syntax: ['pr = primpoly(m)'], seealso: ['gf', 'isprimitive'] },
    gfminpol: { summary: 'Find the minimal polynomial of an element of a Galois field', syntax: ['pol = gfminpol(k,m)'], seealso: ['gfprimdf', 'gfcosets', 'gfroots'] },
    gftrunc: { summary: 'Minimize the length of a polynomial representation over GF', syntax: ['c = gftrunc(a)'], seealso: ['gfadd', 'gfsub', 'gfconv', 'gfdeconv'] },
    iqimbal2coef: { summary: 'Convert I/Q imbalance to compensator coefficient', syntax: ['c = iqimbal2coef(ampImbalanceDB,phaseImbalanceDeg)'], seealso: ['iqcoef2imbal'] },
    rsgenpolycoeffs: { summary: 'Generator polynomial coefficients of a Reed-Solomon code', syntax: ['g = rsgenpolycoeffs(n,k)'], seealso: ['rsgenpoly', 'rsenc'] },
    iqcoef2imbal: { summary: 'Convert compensator coefficient to amplitude and phase imbalance', syntax: ['[A,P] = iqcoef2imbal(C)'], seealso: [] },
    fmmod: { summary: 'Frequency modulation', syntax: ['y = fmmod(x,Fc,Fs,freqdev)'], seealso: ['fmdemod', 'ammod', 'pmmod'] },
    matdeintrlv: { summary: 'Restore ordering of symbols using a matrix interleaver', syntax: ['deintrlvd = matdeintrlv(data,Nrows,Ncols)'], seealso: ['matintrlv', 'algdeintrlv'] },
    algdeintrlv: { summary: 'Restore ordering of symbols using an algebraically derived interleaver', syntax: ['deintrlvd = algdeintrlv(data,N,\'takeshita-costello\',c,a)'], seealso: ['algintrlv', 'matdeintrlv'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Control System Toolbox, extracted from control.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_CONTROL: Record<string, HelpEntry | string> = {
    tf: { summary: 'Create a transfer-function model', syntax: ['sys = tf(num,den)'], seealso: ['zpk', 'ss', 'bode', 'step'] },
    ss: { summary: 'Create a state-space model', syntax: ['sys = ss(A,B,C,D)'], seealso: ['tf', 'zpk', 'ssdata', 'pole'] },
    zpk: { summary: 'Create a zero-pole-gain model', syntax: ['sys = zpk(z,p,k)'], seealso: ['tf', 'ss', 'pole', 'zero'] },
    pole: { summary: 'Compute poles of a dynamic system', syntax: ['p = pole(sys)'], seealso: ['zero', 'damp', 'eig'] },
    zero: { summary: 'Compute zeros of a dynamic system', syntax: ['z = zero(sys)'], seealso: ['pole', 'damp', 'zpk'] },
    dcgain: { summary: 'Compute DC (low-frequency) gain of a dynamic system', syntax: ['k = dcgain(sys)'], seealso: ['pole', 'bode', 'step'] },
    isstable: { summary: 'Determine if a dynamic system is stable', syntax: ['tf = isstable(sys)'], seealso: ['pole', 'damp', 'isproper'] },
    tf2zp: { summary: 'Convert transfer function to zero-pole-gain form', syntax: ['[z,p,k] = tf2zp(num,den)'], seealso: ['zp2tf', 'tf2ss', 'roots'] },
    zp2tf: { summary: 'Convert zero-pole-gain to transfer function', syntax: ['[num,den] = zp2tf(z,p,k)'], seealso: ['tf2zp', 'zpk', 'tf'] },
    tf2ss: { summary: 'Convert transfer function to state-space', syntax: ['[A,B,C,D] = tf2ss(num,den)'], seealso: ['ss2tf', 'tf2zp', 'ss'] },
    ss2tf: { summary: 'Convert state-space to transfer function', syntax: ['[num,den] = ss2tf(A,B,C,D)'], seealso: ['tf2ss', 'ss2ss', 'zpk'] },
    damp: { summary: 'Natural frequency and damping of system poles', syntax: ['[wn,zeta] = damp(sys)'], seealso: ['pole', 'zero', 'esort'] },
    ctrb: { summary: 'Compute controllability matrix', syntax: ['Co = ctrb(A,B)'], seealso: ['obsv', 'rank'] },
    obsv: { summary: 'Compute observability matrix', syntax: ['Ob = obsv(A,C)'], seealso: ['ctrb', 'rank', 'ss'] },
    dsort: { summary: 'Sort discrete-time poles by magnitude', syntax: ['[s,ndx] = dsort(p)'], seealso: ['esort', 'pole', 'damp'] },
    esort: { summary: 'Sort continuous-time poles by real part', syntax: ['[s,ndx] = esort(p)'], seealso: ['dsort', 'pole', 'damp'] },
    parallel: { summary: 'Parallel connection of two dynamic systems', syntax: ['sys = parallel(sys1,sys2)'], seealso: ['series', 'feedback', 'connect'] },
    feedback: { summary: 'Feedback connection of two dynamic systems', syntax: ['sys = feedback(sys1,sys2)'], seealso: ['parallel', 'series', 'connect'] },
    order: { summary: 'Model order (number of states)', syntax: ['n = order(sys)'], seealso: ['pole', 'minreal', 'ss'] },
    append: { summary: 'Block-diagonal append of dynamic systems', syntax: ['sys = append(sys1,sys2,...)'], seealso: ['series', 'parallel', 'feedback'] },
    tfdata: { summary: 'Access transfer-function data', syntax: ["[num,den] = tfdata(sys)"], seealso: ['ssdata', 'zpkdata', 'tf'] },
    ssdata: { summary: 'Access state-space data matrices', syntax: ['[A,B,C,D] = ssdata(sys)'], seealso: ['tfdata', 'zpkdata', 'dssdata', 'ss'] },
    zpkdata: { summary: 'Access zero-pole-gain data', syntax: ["[z,p,k] = zpkdata(sys)"], seealso: ['tfdata', 'ssdata', 'zpk'] },
    dssdata: { summary: 'Access descriptor state-space data', syntax: ['[A,B,C,D,E] = dssdata(sys)'], seealso: ['ssdata', 'dss'] },
    isct: { summary: 'Determine if a model is continuous-time', syntax: ['tf = isct(sys)'], seealso: ['isdt', 'isstable'] },
    isdt: { summary: 'Determine if a model is discrete-time', syntax: ['tf = isdt(sys)'], seealso: ['isct', 'isstable'] },
    sminreal: { summary: 'Structurally minimal realization', syntax: ['msys = sminreal(sys)'], seealso: ['minreal', 'balreal', 'ss'] },
    nichols: { summary: 'Nichols frequency response', syntax: ['[mag,phase,w] = nichols(sys)'], seealso: ['bode', 'nyquist', 'sigma'] },
    series: { summary: 'Series (cascade) connection of two dynamic systems', syntax: ['sys = series(sys1,sys2)'], seealso: ['parallel', 'feedback', 'connect'] },
    ss2ss: { summary: 'State coordinate transformation for state-space models', syntax: ['sys2 = ss2ss(sys,T)'], seealso: ['ss', 'canon', 'balreal'] },
    lqr: { summary: 'Linear-quadratic regulator design (continuous time)', syntax: ['[K,S,e] = lqr(sys,Q,R)'], seealso: ['dlqr', 'lqe', 'place'] },
    place: { summary: 'Pole placement design', syntax: ['K = place(A,B,p)'], seealso: ['acker', 'lqr', 'reg', 'estim'] },
    acker: { summary: "Pole placement using Ackermann's formula (single input)", syntax: ['k = acker(A,b,p)'], seealso: ['place', 'lqr'] },
    care: { summary: 'Continuous-time algebraic Riccati equation solver', syntax: ['[X,L,G] = care(A,B,Q)'], seealso: ['dare', 'lqr', 'lyap', 'icare'] },
    dare: { summary: 'Discrete-time algebraic Riccati equation solver', syntax: ['[X,L,G] = dare(A,B,Q)'], seealso: ['care', 'dlqr', 'dlyap', 'idare'] },
    lqe: { summary: 'Kalman estimator (observer) gain design', syntax: ['[L,P,E] = lqe(A,G,C,Q,R)'], seealso: ['kalman', 'care', 'place', 'reg'] },
    canon: { summary: 'Canonical state-space realization', syntax: ["csys = canon(sys,'modal')"], seealso: ['ss2ss', 'ctrbf', 'obsvf', 'ss'] },
    ctrbf: { summary: 'Controllability staircase form', syntax: ['[Abar,Bbar,Cbar,T,k] = ctrbf(A,B,C)'], seealso: ['obsvf', 'ctrb', 'minreal', 'canon'] },
    obsvf: { summary: 'Observability staircase form', syntax: ['[Abar,Bbar,Cbar,T,k] = obsvf(A,B,C)'], seealso: ['ctrbf', 'obsv', 'minreal', 'canon'] },
    kalman: { summary: 'Kalman filter design for state estimation', syntax: ['[kest,L,P] = kalman(sys,Qn,Rn)'], seealso: ['lqe', 'estim', 'care', 'lqg'] },
    dlqr: { summary: 'Linear-quadratic regulator design (discrete time)', syntax: ['[K,S,e] = dlqr(A,B,Q,R)'], seealso: ['lqr', 'place', 'dare'] },
    bode: { summary: 'Bode frequency response of dynamic systems', syntax: ['bode(sys)'], seealso: ['bodemag', 'nyquist', 'margin'] },
    bodemag: { summary: 'Bode magnitude response of dynamic systems', syntax: ['bodemag(sys)'], seealso: ['bode', 'nyquist', 'margin'] },
    c2d: { summary: 'Convert model from continuous to discrete time', syntax: ['sysd = c2d(sys,Ts)'], seealso: ['d2c', 'd2d', 'zoh'] },
    margin: { summary: 'Gain and phase margins and crossover frequencies', syntax: ['[Gm,Pm,Wgm,Wpm] = margin(sys)'], seealso: ['bode', 'allmargin', 'nyquist'] },
    stepinfo: { summary: 'Step-response characteristics (rise time, settling time, etc.)', syntax: ['S = stepinfo(sys)'], seealso: ['step', 'lsim', 'impulse'] },
    minreal: { summary: 'Minimal realization or pole-zero cancellation', syntax: ['msys = minreal(sys)'], seealso: ['pole', 'zero', 'ss'] },
    lyap: { summary: 'Continuous Lyapunov and Sylvester equation solver', syntax: ['X = lyap(A,Q)'], seealso: ['dlyap', 'lyapchol', 'sylvester'] },
    dlyap: { summary: 'Discrete-time Lyapunov equation solver', syntax: ['X = dlyap(A,Q)'], seealso: ['lyap', 'dlyapchol', 'covar'] },
    lyapchol: { summary: 'Square-root (Cholesky) solver for continuous Lyapunov equations', syntax: ['R = lyapchol(A,B)'], seealso: ['lyap', 'dlyapchol', 'chol'] },
    idare: { summary: 'Discrete-time algebraic Riccati equation solver', syntax: ['[X,K,L] = idare(A,B,Q,R)'], seealso: ['icare', 'dlqr', 'dare'] },
    lqrd: { summary: 'Discrete LQR design from a continuous cost function', syntax: ['[K,S,e] = lqrd(A,B,Q,R,Ts)'], seealso: ['lqr', 'dlqr', 'c2d'] },
    gensig: { summary: 'Generate a periodic test input signal', syntax: ['[u,t] = gensig(type,tau)'], seealso: ['lsim', 'square', 'sawtooth'] },
    lsiminfo: { summary: 'Compute linear-response characteristics', syntax: ['S = lsiminfo(y,t)'], seealso: ['stepinfo', 'lsim', 'impulse'] },
    frd: { summary: 'Create a frequency-response data model', syntax: ['sys = frd(response,freq)'], seealso: ['frdata', 'bode', 'tf', 'ss'] },
    frdata: { summary: 'Extract frequency-response data from an frd model', syntax: ['[resp,freq] = frdata(sys)'], seealso: ['frd', 'bode'] },
    filt: { summary: 'Create discrete-time filter model (DSP convention, z^-1 ascending powers)', syntax: ['sys = filt(num,den)'], seealso: ['tf', 'c2d', 'pole'] },
    dss: { summary: 'Create a descriptor state-space model', syntax: ['sys = dss(A,B,C,D,E)'], seealso: ['ss', 'tf', 'eig'] },
    rss: { summary: 'Generate a random stable continuous-time state-space model', syntax: ['sys = rss(n)'], seealso: ['drss', 'ss', 'pole'] },
    drss: { summary: 'Generate a random stable discrete-time state-space model', syntax: ['sys = drss(n)'], seealso: ['rss', 'ss', 'pole'] },
    gram: { summary: 'Controllability or observability Gramian', syntax: ['W = gram(sys,\'c\')'], seealso: ['lyap', 'dlyap', 'balreal', 'ctrb'] },
    estim: { summary: 'Form state estimator from plant and gain', syntax: ['kest = estim(sys,L)'], seealso: ['kalman', 'reg', 'lqe', 'lqg'] },
    reg: { summary: 'Form output-feedback regulator from state-feedback and estimator gains', syntax: ['rsys = reg(sys,K,L)'], seealso: ['estim', 'lqg', 'lqr', 'lqe'] },
    lqg: { summary: 'LQG (linear-quadratic-Gaussian) regulator design', syntax: ['rsys = lqg(sys,QXU,QWV)'], seealso: ['lqr', 'lqe', 'kalman', 'reg'] },
    lqi: { summary: 'LQR design with integral action', syntax: ['[K,S,e] = lqi(sys,Q,R)'], seealso: ['lqr', 'lqg', 'reg', 'place'] },
    lqgreg: { summary: 'Form LQG regulator from Kalman estimator and LQR gain', syntax: ['rsys = lqgreg(kest,K)'], seealso: ['kalman', 'lqr', 'reg', 'lqg'] },
    pid: { summary: 'Create a parallel-form PID controller', syntax: ['C = pid(Kp,Ki,Kd)'], seealso: ['pidstd', 'pid2', 'piddata', 'pidtune'] },
    pid2: { summary: 'Create a 2-DOF parallel-form PID controller', syntax: ['C = pid2(Kp,Ki,Kd)'], seealso: ['pid', 'pidstd', 'piddata'] },
    pidstd: { summary: 'Create a standard-form PID controller', syntax: ['C = pidstd(Kp,Ti,Td)'], seealso: ['pid', 'pid2', 'pidstddata', 'pidtune'] },
    piddata: { summary: 'Extract parallel PID parameters', syntax: ['[Kp,Ki,Kd,Tf] = piddata(C)'], seealso: ['pidstddata', 'pid', 'pid2'] },
    pidstddata: { summary: 'Extract standard PID parameters', syntax: ['[Kp,Ti,Td,N] = pidstddata(C)'], seealso: ['piddata', 'pidstd'] },
    pidtune: { summary: 'Automatic PID controller tuning (heuristic approximation)', syntax: ['C = pidtune(sys,type)'], seealso: ['pid', 'pidstd', 'margin', 'looptune'] },
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
    franke: { summary: "Franke's bivariate test function", syntax: ['z = franke(x,y)'], seealso: ['peaks'] },
    smooth: { summary: 'Smooths the response data in column vector y using a moving average filter.', syntax: ['yy = smooth(y)'], seealso: ['smoothdata', 'fit', 'sort'] },
    datastats: { summary: 'Returns statistics for the column vector x to the structure xds.', syntax: ['xds = datastats(x) [xds,yds] = datastats(x,y)'], seealso: ['excludedata', 'smooth'] },
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
      syntax: ['b = firpm(n,f,a)'],
      seealso: ['firls', 'fir1', 'fir2', 'firpmord'],
    },
    remez: {
      summary: 'Parks-McClellan optimal equiripple FIR filter design (alias for firpm)',
      syntax: ['b = remez(n,f,a)'],
      seealso: ['firpm', 'firls', 'fir1'],
    },
    firls: {
      summary: 'Least-squares linear-phase FIR filter design',
      syntax: ['b = firls(n,f,a)'],
      seealso: ['firpm', 'fir1', 'fir2'],
    },
    grpdelay: {
      summary: 'Group delay of digital filter',
      syntax: ['[gd,w] = grpdelay(b,a)'],
      seealso: ['freqz', 'phasez', 'impz', 'fvtool'],
    },
    impz: {
      summary: 'Impulse response of digital filter',
      syntax: ['[h,t] = impz(b,a)'],
      seealso: ['stepz', 'freqz', 'grpdelay'],
    },
    stepz: {
      summary: 'Step response of digital filter',
      syntax: ['[s,t] = stepz(b,a)'],
      seealso: ['impz', 'freqz'],
    },
    sosfilt: {
      summary: 'Second-order (biquad) IIR filtering',
      syntax: ['y = sosfilt(sos,x)'],
      seealso: ['tf2sos', 'zp2sos', 'filter', 'filtfilt'],
    },
    tf2sos: {
      summary: 'Transfer function to second-order sections',
      syntax: ['[sos,g] = tf2sos(b,a)'],
      seealso: ['sos2tf', 'zp2sos', 'tf2zp', 'sosfilt'],
    },
    sos2tf: {
      summary: 'Second-order sections to transfer function',
      syntax: ['[b,a] = sos2tf(sos)'],
      seealso: ['tf2sos', 'zp2sos', 'sosfilt'],
    },
    zp2tf: {
      summary: 'Zero-pole-gain to transfer function',
      syntax: ['[b,a] = zp2tf(z,p,k)'],
      seealso: ['tf2zp', 'zp2sos', 'zpkdata'],
    },
    tf2zp: {
      summary: 'Transfer function to zero-pole-gain',
      syntax: ['[z,p,k] = tf2zp(b,a)'],
      seealso: ['zp2tf', 'tf2sos', 'zpkdata'],
    },
    'zp2sos': {
      summary: 'Zero-pole-gain to second-order sections',
      syntax: ['sos = zp2sos(z,p,k)'],
      seealso: ['sos2tf', 'tf2sos', 'sosfilt'],
    },
    bilinear: {
      summary: 'Bilinear transformation method of IIR filter design',
      syntax: ['[Bz,Az] = bilinear(B,A,Fs)'],
      seealso: ['butter', 'cheby1', 'cheby2', 'ellip'],
    },
    besself: {
      summary: 'Bessel analog lowpass filter design',
      syntax: ['[b,a] = besself(n,Wo)'],
      seealso: ['butter', 'cheby1', 'ellip', 'bilinear'],
    },
    decimate: {
      summary: 'Decimate signal by integer factor',
      syntax: ['y = decimate(x,r)'],
      seealso: ['interp', 'resample', 'upfirdn', 'downsample'],
    },
    // QUARANTINED: interp (see implementation note above)
    resample: {
      summary: 'Resample signal at new sample rate',
      syntax: ['y = resample(x,p,q)'],
      seealso: ['decimate', 'interp', 'upfirdn'],
    },
    chebwin: {
      summary: 'Chebyshev window',
      syntax: ['w = chebwin(n)'],
      seealso: ['gausswin', 'taylorwin', 'tukeywin', 'kaiser'],
    },
    taylorwin: {
      summary: 'Taylor window',
      syntax: ['w = taylorwin(n)'],
      seealso: ['chebwin', 'gausswin', 'tukeywin'],
    },
    tukeywin: {
      summary: 'Tukey (cosine-tapered) window',
      syntax: ['w = tukeywin(n)'],
      seealso: ['chebwin', 'gausswin', 'taylorwin'],
    },
    gausswin: {
      summary: 'Gaussian window',
      syntax: ['w = gausswin(n)'],
      seealso: ['chebwin', 'tukeywin', 'taylorwin'],
    },
    firpmord: {
      summary: 'Parks-McClellan optimal FIR filter order estimation',
      syntax: ['[n,fo,ao,w] = firpmord(f,a,dev)'],
      seealso: ['firpm', 'kaiserord', 'fir1'],
    },
    step: {
      summary: 'Execute DSP System object algorithm',
      syntax: ['y = step(h,x)'],
      seealso: ['release', 'reset'],
    },
    release: {
      summary: 'Release resources and allow changes to System object property values and input characteristics',
      syntax: ['release(h)'],
      seealso: ['step', 'reset'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Econometrics Toolbox, extracted from econ.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_ECON: Record<string, HelpEntry | string> = {
    adftest: { summary: 'Returns the rejection decision from conducting an augmented Dickey-Fuller test for a unit root in the input univariate time series.', syntax: ['h = adftest(y)'], seealso: ['kpsstest', 'lmctest', 'pptest', 'vratiotest'] },
    pptest: { summary: 'Returns the rejection decision from conducting the Phillips-Perron test for a unit root in the input univariate time series.', syntax: ['h = pptest(y)'], seealso: ['adftest', 'kpsstest', 'vratiotest', 'lmctest'] },
    price2ret: { summary: 'Returns the matrix of numVars continuously compounded return series, and corresponding time intervals, from the input matrix of numVars price series.', syntax: ['[Returns,intervals] = price2ret(Prices)'], seealso: ['ret2price', 'tick2ret'] },
    tick2ret: { summary: 'Convert tick (price) series to return series', syntax: ['ret = tick2ret(price)'], seealso: ['ret2tick', 'price2ret'] },
    lagmatrix: { summary: 'Shifts the input regular series in time by the input vector of lags (positive) or leads (negative), and returns the matrix of shifted series.', syntax: ['YLag = lagmatrix(Y,lags)'] },
    autocorr: { summary: 'Returns the sample autocorrelation function (ACF) and associated lags of the input univariate time series.', syntax: ['[acf,lags] = autocorr(y)'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the ts2func, extracted from financial.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_FINANCIAL: Record<string, HelpEntry | string> = {
    npv: { summary: 'Net present value of a cash flow stream', syntax: ['npv_val = npv(rate,cashflow)'], seealso: ['irr', 'pvvar', 'fvvar'] },
    pvvar: { summary: 'Present value of varying (irregular) cash flow', syntax: ['PresentVal = pvvar(CashFlow,Rate)'], seealso: ['fvvar', 'irr', 'pvfix'] },
    fvvar: { summary: 'Future value of varying (irregular) cash flow', syntax: ['FutureVal = fvvar(CashFlow,Rate)'], seealso: ['pvvar', 'irr', 'fvfix'] },
    irr: { summary: 'Internal rate of return of a cash flow', syntax: ['Return = irr(CashFlow)'], seealso: ['npv', 'pvvar', 'pvfix', 'effrr'] },
    pvfix: { summary: 'Present value of fixed periodic payments', syntax: ['PresentVal = pvfix(Rate,NumPeriods,Payment)'], seealso: ['fvfix', 'payper', 'pvvar'] },
    fvfix: { summary: 'Future value of fixed periodic payments', syntax: ['FutureVal = fvfix(Rate,NumPeriods,Payment)'], seealso: ['pvfix', 'payper', 'fvvar'] },
    payper: { summary: 'Periodic payment of a loan or annuity', syntax: ['Payment = payper(Rate,NumPeriods,PresentVal)'], seealso: ['pvfix', 'fvfix', 'annuity'] },
    annuity: { summary: 'Present value annuity factor', syntax: ['f = annuity(rate,nper)'], seealso: ['pvfix', 'fvfix', 'payper'] },
    effrr: { summary: 'Effective annual rate of return from nominal rate', syntax: ['Return = effrr(Rate,NumPeriods)'], seealso: ['nomrr', 'pvfix'] },
    nomrr: { summary: 'Nominal rate of return from effective rate', syntax: ['nom = nomrr(eff,nper)'], seealso: ['effrr', 'pvfix'] },
    blsprice: { summary: 'Black-Scholes European option prices (call and put)', syntax: ['[Call,Put] = blsprice(Price,Strike,Rate,Time,Volatility)'], seealso: ['blsdelta', 'blsgamma', 'blsvega', 'blsrho'] },
    blsdelta: { summary: 'Black-Scholes option delta (sensitivity to underlying price)', syntax: ['[callDelta,putDelta] = blsdelta(S,K,r,T,sigma)'], seealso: ['blsprice', 'blsvega', 'blsgamma'] },
    days360: { summary: 'Days between dates using 30/360 (SIA) convention', syntax: ['NumDays = days360(StartDate,EndDate)'], seealso: ['daysdif', 'daysact', 'days365', 'yearfrac'] },
    daysdif: { summary: 'Days between dates for a given day-count basis', syntax: ['d = daysdif(d1,d2,basis)'], seealso: ['daysact', 'days360', 'days365'] },
    busdate: { summary: 'Next or previous business day', syntax: ['d = busdate(d)'], seealso: ['datewrkdy', 'days252bus', 'busdays'] },
    busdays: { summary: 'Vector of business days between two dates', syntax: ['bdates = busdays(sdate,edate)'], seealso: ['busdate', 'days252bus', 'daysact'] },
    datewrkdy: { summary: 'Date a specified number of work days from a starting date', syntax: ['d = datewrkdy(d0,n)'], seealso: ['busdate', 'days252bus', 'datenum'] },
    days252bus: { summary: 'Number of 252 business days between two dates', syntax: ['d = days252bus(d1,d2)'], seealso: ['busdays', 'busdate', 'daysact'] },
    eomdate: { summary: 'Last date of the specified month', syntax: ['d = eomdate(year,month)'], seealso: ['busdate', 'datewrkdy', 'datenum'] },
    calendar: { summary: 'Calendar matrix for a specified month (6-by-7)', syntax: ['cal = calendar'], seealso: ['eomdate', 'busdate', 'datestr'] },
    daysact: { summary: 'Actual number of days between two dates', syntax: ['d = daysact(d1,d2)'], seealso: ['daysdif', 'days360', 'days365'] },
    yearfrac: { summary: 'Fraction of year between two dates for a day-count basis', syntax: ['f = yearfrac(StartDate,EndDate)'], seealso: ['days360', 'daysact', 'daysdif', 'yeardays'] },
    leapyear: { summary: 'Determine leap years', syntax: ['tf = leapyear(year)'], seealso: ['datenum', 'eomday'] },
    depstln: { summary: 'Straight-line depreciation schedule', syntax: ['d = depstln(cost,salvage,life)'], seealso: ['depsoyd', 'deprdv'] },
    deprdv: { summary: 'Remaining depreciable value', syntax: ['rdv = deprdv(cost,salvage,accumdep)'], seealso: ['depstln', 'depsoyd'] },
    taxedrr: { summary: 'After-tax rate of return', syntax: ['r = taxedrr(pretax,taxrate)'], seealso: ['effrr', 'nomrr'] },
    depsoyd: { summary: 'Sum of years digits depreciation', syntax: ['d = depsoyd(cost,salvage,life)'], seealso: ['depstln', 'deprdv'] },
    portror: { summary: 'Portfolio expected rate of return', syntax: ['r = portror(returns,weights)'], seealso: ['portstats'] },
    todecimal: { summary: 'Fractional to decimal conversion', syntax: ['d = todecimal(quote)'], seealso: ['toquoted'] },
    toquoted: { summary: 'Decimal to fractional conversion', syntax: ['q = toquoted(decimal)'], seealso: ['todecimal'] },
    thirtytwo2dec: { summary: 'Thirty-second quotation to decimal', syntax: ['d = thirtytwo2dec(n,fraction)'], seealso: ['todecimal'] },
    corr2cov: { summary: 'Convert standard deviation and correlation to covariance', syntax: ['cov = corr2cov(sigma,corr)'], seealso: ['cov2corr', 'corrcoef'] },
    prmat: { summary: 'Price and accrued interest of a security paying interest at maturity', syntax: ['[price,ai] = prmat(settle,maturity,issue,face,coupon,yield)'], seealso: ['yldmat', 'prdisc', 'acrudisc'] },
    yldmat: { summary: 'Yield of a security paying interest at maturity', syntax: ['yld = yldmat(settle,maturity,issue,face,price,coupon)'], seealso: ['prmat', 'ylddisc'] },
    days365: { summary: 'Days between dates on a 365-day year basis', syntax: ['d = days365(d1,d2)'], seealso: ['daysact', 'days360', 'daysdif'] },
    prtbill: { summary: 'Price of Treasury bill from discount rate', syntax: ['Price = prtbill(Settle,Maturity,Discount)'], seealso: ['yldtbill', 'beytbill', 'prdisc'] },
    yldtbill: { summary: 'Yield of Treasury bill from price', syntax: ['Yield = yldtbill(Settle,Maturity,Price)'], seealso: ['prtbill', 'beytbill', 'discrate'] },
    beytbill: { summary: 'Bond-equivalent yield of Treasury bill', syntax: ['BEY = beytbill(Settle,Maturity,Discount)'], seealso: ['prtbill', 'yldtbill', 'discrate'] },
    prdisc: { summary: 'Price of a discounted security', syntax: ['Price = prdisc(Settle,Maturity,Discount,Basis)'], seealso: ['fvdisc', 'discrate', 'prtbill'] },
    fvdisc: { summary: 'Future value of a discounted security', syntax: ['FutureVal = fvdisc(Settle,Maturity,Price,Basis)'], seealso: ['prdisc', 'discrate'] },
    discrate: { summary: 'Bank discount rate of a security', syntax: ['Discount = discrate(Settle,Maturity,Price,Basis)'], seealso: ['prdisc', 'fvdisc', 'yldtbill'] },
    yeardays: { summary: 'Number of days in a year for a given day-count basis', syntax: ['Days = yeardays(Year)'], seealso: ['daysact', 'days360', 'days365', 'yearfrac'] },
    thirdwednesday: { summary: 'Beginning and end dates for LIBOR contracts (third Wednesdays)', syntax: ['[BeginDates,EndDates] = thirdwednesday(Month,Year)'], seealso: ['busdate', 'eomdate'] },
    juliandate: { summary: 'Julian date from calendar date', syntax: ['jd = juliandate(year,month,day)'], seealso: ['datenum', 'datestr'] },
    weeknum: { summary: 'Week number of the year for a given date', syntax: ['w = weeknum(d)'], seealso: ['datenum', 'daysdif', 'eomdate'] },
    payadv: { summary: 'Periodic payment given a number of advance payments', syntax: ['Payment = payadv(Rate,NumPeriods,PresentValue,FutureValue,Advance)'], seealso: ['payper', 'pvfix', 'fvfix'] },
    tbillyield2disc: { summary: 'Convert T-bill yield to bank discount rate', syntax: ['Discount = tbillyield2disc(Yield,Settle,Maturity)'], seealso: ['prtbill', 'yldtbill', 'beytbill'] },
    acrubond: { summary: 'Accrued interest of a bond with periodic interest payments', syntax: ['AccruInterest = acrubond(IssueDate,Settle,FirstCouponDate,Face,CouponRate)'], seealso: ['bndprice', 'bndyield', 'days360', 'cfamounts'] },
    prcroc: { summary: 'Price rate-of-change technical indicator', syntax: ['PriceChangeRate = prcroc(Data)'], seealso: ['rsindex', 'macd', 'volroc'] },
    abs2active: { summary: 'Transform absolute constraint matrix to active-weight format', syntax: ['ActiveConSet = abs2active(AbsConSet,Index)'], seealso: ['active2abs', 'pcalims', 'pcglims', 'portcons'] },
    active2abs: { summary: 'Transform active-weight constraint matrix to absolute format', syntax: ['AbsConSet = active2abs(ActiveConSet,Index)'], seealso: ['abs2active', 'pcalims', 'pcglims', 'portcons'] },
    bndprice: { summary: 'Price a fixed-income security from yield to maturity', syntax: ['[Price,AccruedInt] = bndprice(Yield,CouponRate,Settle,Maturity)'], seealso: ['bndyield', 'bnddurp', 'bndconvp', 'cfamounts'] },
    bndyield: { summary: 'Yield to maturity of a fixed-income security from price', syntax: ['Yield = bndyield(Price,CouponRate,Settle,Maturity)'], seealso: ['bndprice', 'bnddury', 'bndconvy'] },
    bnddurp: { summary: 'Bond duration given price', syntax: ['[ModDuration,YearDuration,PerDuration] = bnddurp(Price,CouponRate,Settle,Maturity)'], seealso: ['bnddury', 'bndconvp', 'bndprice'] },
    bnddury: { summary: 'Bond duration given yield', syntax: ['[ModDuration,YearDuration,PerDuration] = bnddury(Yield,CouponRate,Settle,Maturity)'], seealso: ['bnddurp', 'bndconvy', 'bndyield'] },
    bndconvp: { summary: 'Bond convexity given price', syntax: ['[YearConvexity,PerConvexity] = bndconvp(Price,CouponRate,Settle,Maturity)'], seealso: ['bndconvy', 'bnddurp', 'bndprice'] },
    bndconvy: { summary: 'Bond convexity given yield', syntax: ['[YearConvexity,PerConvexity] = bndconvy(Yield,CouponRate,Settle,Maturity)'], seealso: ['bndconvp', 'bnddury', 'bndyield'] },
    ts2func: { summary: 'Convert a time series array to a function of time', syntax: ['F = ts2func(Array)'], seealso: ['interp1'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Financial Instruments Toolbox, extracted from fininst.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_FININST: Record<string, HelpEntry | string> = {
    intenvset: {
      summary: 'Set properties of interest-rate structure',
      syntax: ["RateSpec = intenvset('Rates',r,'StartDates',sd,'EndDates',ed)"],
      seealso: ['cfbyzero', 'intenvget'],
    },
    cfbyzero: {
      summary: 'Price cash flows from set of zero curves',
      syntax: ['Price = cfbyzero(RateSpec,CFlowAmounts,CFlowDates,Settle)'],
      seealso: ['intenvset', 'intenvget'],
    },
    // QUARANTINED: bndfutprice help removed (see builtins comment).
    blsprice: {
      summary: 'Black-Scholes European option pricing',
      syntax: ['[Call,Put] = blsprice(S0,K,r,T,sigma)'],
      seealso: ['blsdelta', 'blsgamma', 'blstheta', 'blsvega'],
    },
    blsdelta: {
      summary: 'Black-Scholes delta of options',
      syntax: ['[CallDelta,PutDelta] = blsdelta(S0,K,r,T,sigma)'],
      seealso: ['blsprice', 'blsgamma'],
    },
    blsgamma: {
      summary: 'Black-Scholes gamma of options',
      syntax: ['Gamma = blsgamma(S0,K,r,T,sigma)'],
      seealso: ['blsprice', 'blsdelta', 'blsvega'],
    },
    blstheta: {
      summary: 'Black-Scholes theta of options',
      syntax: ['[CallTheta,PutTheta] = blstheta(S0,K,r,T,sigma)'],
      seealso: ['blsprice', 'blsdelta'],
    },
    blsvega: {
      summary: 'Black-Scholes vega of options',
      syntax: ['Vega = blsvega(S0,K,r,T,sigma)'],
      seealso: ['blsprice', 'blsgamma'],
    },
    blsimpv: {
      summary: 'Black-Scholes implied volatility',
      syntax: ['sigma = blsimpv(S0,K,r,T,Price)'],
      seealso: ['blsprice', 'blsdelta'],
    },
    // QUARANTINED: asianbylevy / barrierbybls / lookbackbyls / intenvprice help removed
    //   (see builtins comment).
    intenvget: {
      summary: 'Properties of interest-rate structure',
      syntax: ['ParameterValue = intenvget(RateSpec,ParameterName)'],
      seealso: ['intenvset', 'cfbyzero'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Fixed-Point Designer, extracted from fixedpoint.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_FIXEDPOINT: Record<string, HelpEntry | string> = {
    fi: {
      summary: 'Fixed-point numeric object',
      syntax: ['a = fi(v)'],
      seealso: ['numerictype', 'fimath', 'quantizer'],
    },
    numerictype: {
      summary: 'Data type and scaling attributes of fi object',
      syntax: ['T = numerictype'],
      seealso: ['fi', 'fimath'],
    },
    fimath: {
      summary: 'Define math properties for fi objects',
      syntax: ['F = fimath'],
      seealso: ['fi', 'numerictype'],
    },
    quantizer: {
      summary: 'Quantizer object',
      syntax: ['q = quantizer'],
      seealso: ['fi', 'quantize', 'num2bin'],
    },
    quantize: {
      summary: 'Quantize data with quantizer object',
      syntax: ['xq = quantize(q,x)'],
      seealso: ['quantizer', 'fi'],
    },
    num2bin: {
      summary: 'Convert fi or number to binary string',
      syntax: ['b = num2bin(a)'],
      seealso: ['bin2num', 'fi'],
    },
    bin2num: {
      summary: 'Convert binary string to number',
      syntax: ['x = bin2num(b)'],
      seealso: ['num2bin', 'fi'],
    },
    fipref: {
      summary: 'Fixed-point preferences',
      syntax: ['p = fipref'],
      seealso: ['fi', 'fimath'],
    },
    fixdt: {
      summary: 'Create Simulink fixed-point data type',
      syntax: ['T = fixdt(isSigned,wl,fl)'],
      seealso: ['numerictype', 'fi'],
    },
    accumneg: {
      summary: 'Subtract two fi objects or values',
      syntax: ['c = accumneg(a,b)'],
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
      seealso: ['assignauction', 'assignjv', 'assignsd'],
    },
    assignauction: {
      summary: 'Assignment using auction global nearest neighbor algorithm',
      syntax: ['[assignments,unassignedrows,unassignedcolumns] = assignauction(costmatrix,costofnonassignment)'],
      seealso: ['assignmunkres', 'assignjv'],
    },
    assignjv: {
      summary: 'Jonker-Volgenant global nearest neighbor assignment algorithm',
      syntax: ['[assignments,unassignedrows,unassignedcolumns] = assignjv(costmatrix,costofnonassignment)'],
      seealso: ['assignmunkres', 'assignauction'],
    },
    allanvar: {
      summary: 'Allan variance',
      syntax: ['[avar,tau] = allanvar(Omega)'],
      seealso: ['allandev'],
    },
    constvel: {
      summary: 'State transition function for constant-velocity motion model',
      syntax: ['predictedState = constvel(state)'],
      seealso: ['constacc', 'constturn', 'constveljac'],
    },
    constacc: {
      summary: 'State transition function for constant-acceleration motion model',
      syntax: ['predictedState = constacc(state)'],
      seealso: ['constvel', 'constturn', 'constaccjac'],
    },
    constturn: {
      summary: 'State transition function for constant turn-rate motion model',
      syntax: ['predictedState = constturn(state)'],
      seealso: ['constvel', 'constacc', 'constturnjac'],
    },
    cameas: {
      summary: 'Measurement function for constant-acceleration motion model',
      syntax: ['measurement = cameas(state)'],
      seealso: ['constacc', 'cameasjac'],
    },
    constveljac: { summary: 'Jacobian of constant-velocity state transition',
      syntax: ['dfdx = constveljac(state)'],
      seealso: ['constvel'] },
    constaccjac: { summary: 'Jacobian of constant-acceleration state transition',
      syntax: ['dfdx = constaccjac(state)'],
      seealso: ['constacc'] },
    constturnjac: { summary: 'Jacobian of constant turn-rate state transition',
      syntax: ['dfdx = constturnjac(state)'],
      seealso: ['constturn'] },
    cameasjac: { summary: 'Jacobian of constant-acceleration measurement function',
      syntax: ['dhdx = cameasjac(state)'],
      seealso: ['cameas', 'constacc'] },
    // QUARANTINED: compassangle, accelcal — help entries removed with their builtins.
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Fuzzy Logic Toolbox, extracted from fuzzy.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_FUZZY: Record<string, HelpEntry | string> = {
    trimf: { summary: 'Triangular membership function', syntax: ['y = trimf(x,params)'], seealso: ['trapmf', 'gaussmf', 'gbellmf'] },
    trapmf: { summary: 'Trapezoidal membership function', syntax: ['y = trapmf(x,params)'], seealso: ['trimf', 'gaussmf', 'pimf'] },
    gaussmf: { summary: 'Gaussian membership function', syntax: ['y = gaussmf(x,params)'], seealso: ['gauss2mf', 'gbellmf', 'trimf'] },
    gauss2mf: { summary: 'Two-sided Gaussian membership function', syntax: ['y = gauss2mf(x,params)'], seealso: ['gaussmf', 'gbellmf', 'sigmf'] },
    gbellmf: { summary: 'Generalized bell-shaped membership function', syntax: ['y = gbellmf(x,params)'], seealso: ['gaussmf', 'trimf', 'trapmf'] },
    sigmf: { summary: 'Sigmoidal membership function', syntax: ['y = sigmf(x,params)'], seealso: ['dsigmf', 'psigmf', 'smf'] },
    dsigmf: { summary: 'Difference of two sigmoidal membership functions', syntax: ['y = dsigmf(x,params)'], seealso: ['sigmf', 'psigmf', 'smf'] },
    psigmf: { summary: 'Product of two sigmoidal membership functions', syntax: ['y = psigmf(x,params)'], seealso: ['sigmf', 'dsigmf', 'gauss2mf'] },
    zmf: { summary: 'Z-shaped membership function', syntax: ['y = zmf(x,params)'], seealso: ['smf', 'pimf', 'trapmf'] },
    smf: { summary: 'S-shaped membership function', syntax: ['y = smf(x,params)'], seealso: ['zmf', 'pimf', 'sigmf'] },
    pimf: { summary: 'Pi-shaped membership function', syntax: ['y = pimf(x,params)'], seealso: ['smf', 'zmf', 'trapmf'] },
    defuzz: { summary: 'Defuzzify membership function to scalar', syntax: ['out = defuzz(x,mf,type)'], seealso: ['trimf', 'gaussmf', 'evalfis'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Global Optimization Toolbox, extracted from gads.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_GADS: Record<string, HelpEntry | string> = {
    ga: {
      summary: 'Find minimum of function using genetic algorithm',
      syntax: ['x = ga(fun,nvars)'],
      seealso: ['gamultiobj', 'simulannealbnd', 'patternsearch', 'particleswarm'],
    },
    simulannealbnd: {
      summary: 'Find minimum of function using simulated annealing algorithm',
      syntax: ['x = simulannealbnd(fun,x0)'],
      seealso: ['ga', 'patternsearch', 'particleswarm'],
    },
    patternsearch: {
      summary: 'Find minimum of function using pattern search',
      syntax: ['x = patternsearch(fun,x0)'],
      seealso: ['ga', 'simulannealbnd', 'particleswarm'],
    },
    particleswarm: {
      summary: 'Particle swarm optimization',
      syntax: ['x = particleswarm(fun,nvars)'],
      seealso: ['ga', 'simulannealbnd', 'patternsearch'],
    },
    gamultiobj: {
      summary: 'Find Pareto front using multiobjective genetic algorithm',
      syntax: ['x = gamultiobj(fun,nvars)'],
      seealso: ['ga', 'paretosearch', 'particleswarm'],
    },
    paretosearch: { summary: 'Find Pareto front using pattern search',
      syntax: ['x = paretosearch(fun,nvars)'],
      seealso: ['gamultiobj', 'ga'] },
    surrogateopt: { summary: 'Surrogate optimization for global minimum',
      syntax: ['x = surrogateopt(fun,lb,ub)'],
      seealso: ['ga', 'patternsearch'] },
    globalsearch: { summary: 'Find global minimum using GlobalSearch solver',
      syntax: ['gs = GlobalSearch'],
      seealso: ['MultiStart', 'fmincon'] },
    multistart: { summary: 'Find multiple local minima',
      syntax: ['ms = MultiStart'],
      seealso: ['GlobalSearch', 'fmincon'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the System Identification Toolbox, extracted from ident.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_IDENT: Record<string, HelpEntry | string> = {
    arx: {
      summary: 'Estimate parameters of ARX, ARIX, AR, or ARI model',
      syntax: ['sys = arx(tt,[na nb nk])'],
      seealso: ['armax', 'n4sid', 'tfest', 'arxstruc'],
    },
    armax: {
      summary: 'Estimate parameters of ARMAX, ARIMAX, ARMA, or ARIMA model using time-domain data',
      syntax: ['sys = armax(tt,[na nb nc nk])'],
      seealso: ['arx', 'bj', 'n4sid', 'tfest'],
    },
    // QUARANTINED help entries (n4sid, ssest, tfest) removed — see function comments.
    compare: {
      summary: 'Compare identified model output with measured output',
      syntax: ['compare(data,sys)'],
      seealso: ['predict', 'sim', 'arx', 'tfest'],
    },
    bj: {
      summary: 'Estimate parameters of Box-Jenkins model',
      syntax: ['sys = bj(u,y,[nb nc nd nf nk])'],
      seealso: ['armax', 'arx', 'n4sid'],
    },
    ar: {
      summary: 'Estimate parameters of AR, ARI, or ARX model',
      syntax: ['sys = ar(y,na)'],
      seealso: ['arx', 'armax'],
    },
    arxstruc: {
      summary: 'Loss functions for ARX structure selection',
      syntax: ['v = arxstruc(u,y,nn)'],
      seealso: ['arx', 'selstruc'],
    },
    // QUARANTINED help entry (spa) removed — see function comment.
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Image Processing Toolbox, extracted from images.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_IMAGES: Record<string, HelpEntry | string> = {
    ind2rgb: { summary: 'Converts the indexed image X and corresponding colormap map to RGB (truecolor) format.', syntax: ['RGB = ind2rgb(X,map)'], seealso: ['image', 'imread', 'rgb2ind'] },
    measerr: { summary: 'Approximation quality metrics (PSNR, MSE, max error, L2 ratio)', syntax: ['[psnr,mse,maxerr,L2rat] = measerr(X,Xapp)'], seealso: ['psnr', 'immse'] },
    rgb2ntsc: { summary: 'Converts the red, green, and blue values of an RGB image to luminance (Y) and chrominance (I and Q) values of an NTSC image.', syntax: ['YIQ = rgb2ntsc(RGB)'], seealso: ['ntsc2rgb', 'rgb2ycbcr', 'rgb2lab', 'rgb2xyz'] },
    xyz2lab: { summary: 'Converts CIE 1931 XYZ values (2° observer) to CIE 1976 L*a*b* values.', syntax: ['lab = xyz2lab(xyz)'], seealso: ['rgb2lab', 'xyz2rgb', 'lab2xyz'] },
    rgb2xyz: { summary: 'Converts the red, green, and blue values of an sRGB image to CIE 1931 XYZ values (2° observer).', syntax: ['XYZ = rgb2xyz(RGB)'], seealso: ['xyz2rgb', 'rgb2lab', 'lab2xyz', 'lin2rgb'] },
    rgb2lab: { summary: 'Converts sRGB values to CIE 1976 L*a*b* values.', syntax: ['lab = rgb2lab(RGB)'], seealso: ['rgb2xyz', 'lab2rgb', 'xyz2lab'] },
    im2double: { summary: 'Converts the image I to double precision.', syntax: ['I2 = im2double(I)'], seealso: ['double', 'im2single', 'im2int16', 'im2uint8'] },
    mat2gray: { summary: 'Converts the matrix A to a grayscale image I that contains values in the range 0 (black) to 1 (white).', syntax: ['I = mat2gray(A,[amin amax])'], seealso: ['rescale', 'gray2ind', 'ind2gray', 'im2gray'] },
    graythresh: { summary: 'Computes a global threshold T from grayscale image I, using Otsu\'s method [1].', syntax: ['T = graythresh(I)'], seealso: ['imbinarize', 'imquantize', 'multithresh', 'rgb2ind'] },
    rgb2ycbcr: { summary: 'Converts the red, green, and blue values of an RGB image to luminance (Y) and chrominance (Cb and Cr) values of a YCbCr image.', syntax: ['YCBCR = rgb2ycbcr(RGB)'], seealso: ['rgb2lab', 'rgb2xyz', 'rgb2ntsc', 'ycbcr2rgb'] },
    fspecial: { summary: 'Creates a two-dimensional filter h of the specified type.', syntax: ['h = fspecial(type)'], seealso: ['conv2', 'del2', 'edge', 'imsharpen'] },
    stretchlim: { summary: 'Computes the lower and upper limits that can be used for contrast stretching grayscale or RGB image I.', syntax: ['lowhigh = stretchlim(I)'], seealso: ['brighten', 'decorrstretch', 'histeq', 'imadjust'] },
    im2single: { summary: 'Converts the grayscale, RGB, or binary image I to data type single, rescaling or offsetting the data as necessary.', syntax: ['J = im2single(I)'], seealso: ['im2double', 'im2int16', 'im2uint8', 'im2uint16'] },
    integralImage: { summary: 'Compute 2-D integral image (summed area table)', syntax: ['intImg = integralImage(I)'], seealso: ['integralBoxFilter'] },
    integralBoxFilter: { summary: 'Box filtering using integral image', syntax: ['J = integralBoxFilter(intImg,[m n])'], seealso: ['integralImage', 'imfilter'] },
    padarray: { summary: 'Pads array A with an amount of padding in each dimension specified by padsize.', syntax: ['B = padarray(A,padsize)'], seealso: ['circshift', 'imfilter', 'paddata'] },
    regionprops: { summary: 'The regionprops function measures properties such as area, centroid, and bounding box, for each object (connected component) in an image.', syntax: ['stats = regionprops(BW,properties)'], seealso: ['regionprops3', 'bwpropfilt', 'bwconncomp', 'bwferet'] },
    bwlabel: { summary: 'Returns the label matrix L that contains labels for the 8-connected objects found in BW.', syntax: ['L = bwlabel(BW)'], seealso: ['bwconncomp', 'bwlabeln', 'bwselect', 'labelmatrix'] },
    imerode: { summary: 'Erodes the grayscale, binary, or packed binary image I using the structuring element SE.', syntax: ['J = imerode(I,SE)'], seealso: ['bwpack', 'bwunpack', 'conv2', 'filter2'] },
    imdilate: { summary: 'Dilates the grayscale, binary, or packed binary image I using the structuring element SE.', syntax: ['J = imdilate(I,SE)'], seealso: ['bwpack', 'bwunpack', 'conv2', 'filter2'] },
    imopen: { summary: 'Performs morphological opening on the grayscale or binary image I using the structuring element SE.', syntax: ['J = imopen(I,SE)'], seealso: ['imclose', 'imdilate', 'imerode'] },
    imclose: { summary: 'Performs morphological closing on the grayscale or binary image I, using the structuring element SE.', syntax: ['J = imclose(I,SE)'], seealso: ['imopen', 'imdilate', 'imerode'] },
    imboxfilt: { summary: 'Filters image A with a 2-D box filter of the given size (default 3).', syntax: ['B = imboxfilt(A)'], seealso: ['imboxfilt3', 'imfilter', 'imgaussfilt', 'integralBoxFilter'] },
    imboxfilt3: { summary: 'Filters 3-D volumetric image A with a 3-D box filter of the given size (default 3).', syntax: ['B = imboxfilt3(A)'], seealso: ['imboxfilt', 'imgaussfilt3', 'integralBoxFilter3'] },
    imgaussfilt3: { summary: 'Filters 3-D volumetric image A with a 3-D Gaussian smoothing kernel with standard deviation sigma.', syntax: ['B = imgaussfilt3(A)'], seealso: ['imgaussfilt', 'imboxfilt3', 'imfilter'] },
    medfilt3: { summary: 'Performs median filtering of the 3-D image A in three dimensions. Default neighborhood is [3 3 3].', syntax: ['B = medfilt3(A)'], seealso: ['medfilt2', 'modefilt'] },
    modefilt: { summary: 'Performs mode filtering on the 2-D or 3-D image A, returning the most frequent value in each neighborhood.', syntax: ['B = modefilt(A)'], seealso: ['medfilt2', 'medfilt3', 'mode'] },
    stdfilt: { summary: 'Returns the array J, where each output pixel contains the standard deviation of the neighborhood around the corresponding pixel in input image I.', syntax: ['J = stdfilt(I)'], seealso: ['std2', 'rangefilt', 'entropyfilt'] },
    rangefilt: { summary: 'Returns the array J, where each output pixel contains the range (max - min) of the neighborhood around the corresponding pixel in input image I.', syntax: ['J = rangefilt(I)'], seealso: ['stdfilt', 'entropyfilt'] },
    entropyfilt: { summary: 'Returns the array J, where each output pixel contains the entropy value of the neighborhood around the corresponding pixel in input image I.', syntax: ['J = entropyfilt(I)'], seealso: ['entropy', 'rangefilt', 'stdfilt', 'imhist'] },
    ssim: { summary: 'Computes the Structural Similarity Index (SSIM) value for image A using ref as the reference image.', syntax: ['ssimval = ssim(A,ref)'], seealso: ['immse', 'psnr', 'multissim'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Lidar Toolbox, extracted from lidar.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_LIDAR: Record<string, HelpEntry | string> = {
    pointCloud: {
      summary: 'Create a 3-D point cloud object',
      syntax: ['ptCloud = pointCloud(xyzPoints)'],
      seealso: ['pcdownsample', 'pcregistericp', 'pcsegdist', 'pcfitplane'],
    },
    pcdownsample: {
      summary: 'Downsample a 3-D point cloud',
      syntax: ['ptCloudOut = pcdownsample(ptCloudIn,gridStep)'],
      seealso: ['pointCloud', 'pcregistericp', 'pcsegdist'],
    },
    pcregistericp: {
      summary: 'Register two point clouds using ICP',
      syntax: ['tform = pcregistericp(moving,fixed)'],
      seealso: ['pointCloud', 'pcdownsample', 'pcsegdist', 'pcfitplane'],
    },
    pcsegdist: {
      summary: 'Segment point cloud into clusters based on Euclidean distance',
      syntax: ['[labels,numClusters] = pcsegdist(ptCloud,minDist)'],
      seealso: ['pointCloud', 'pcfitplane', 'pcregistericp'],
    },
    pcfitplane: {
      summary: 'Fit a plane to a 3-D point cloud using RANSAC',
      syntax: ['model = pcfitplane(ptCloud,maxDistance)'],
      seealso: ['pointCloud', 'pcsegdist', 'pcdownsample', 'pcregistericp'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Mapping Toolbox, extracted from mapping.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_MAPPING: Record<string, HelpEntry | string> = {
    km2rad: { summary: 'Convert distance from kilometers to radians', syntax: ['rad = km2rad(km)'], seealso: ['rad2km', 'deg2km'] },
    rad2km: { summary: 'Convert distance from radians to kilometers', syntax: ['km = rad2km(rad)'], seealso: ['km2rad', 'deg2km'] },
    deg2km: { summary: 'Convert distance from degrees to kilometers', syntax: ['km = deg2km(deg)'], seealso: ['km2deg', 'deg2nm', 'deg2rad'] },
    km2deg: { summary: 'Convert distance from kilometers to degrees', syntax: ['deg = km2deg(km)'], seealso: ['deg2km', 'km2rad'] },
    deg2nm: { summary: 'Convert distance from degrees to nautical miles', syntax: ['nm = deg2nm(deg)'], seealso: ['nm2deg', 'deg2km'] },
    nm2km: { summary: 'Convert distance from nautical miles to kilometers', syntax: ['km = nm2km(nm)'], seealso: ['km2nm', 'nm2deg'] },
    km2nm: { summary: 'Convert distance from kilometers to nautical miles', syntax: ['nm = km2nm(km)'], seealso: ['nm2km', 'km2sm'] },
    nm2sm: { summary: 'Convert distance from nautical to statute miles', syntax: ['sm = nm2sm(nm)'], seealso: ['sm2nm', 'nm2deg'] },
    sm2nm: { summary: 'Convert distance from statute to nautical miles', syntax: ['nm = sm2nm(sm)'], seealso: ['nm2sm', 'sm2km'] },
    km2sm: { summary: 'Convert distance from kilometers to statute miles', syntax: ['sm = km2sm(km)'], seealso: ['sm2km', 'km2nm'] },
    sm2km: { summary: 'Convert distance from statute miles to kilometers', syntax: ['km = sm2km(sm)'], seealso: ['km2sm', 'sm2nm'] },
    deg2sm: { summary: 'Convert distance from degrees to statute miles', syntax: ['sm = deg2sm(deg)'], seealso: ['sm2deg', 'deg2km'] },
    sm2deg: { summary: 'Convert distance from statute miles to degrees', syntax: ['deg = sm2deg(sm)'], seealso: ['deg2sm', 'sm2km'] },
    nm2deg: { summary: 'Convert distance from nautical miles to degrees', syntax: ['deg = nm2deg(nm)'], seealso: ['deg2nm', 'nm2km'] },
    rad2nm: { summary: 'Convert distance from radians to nautical miles', syntax: ['nm = rad2nm(rad)'], seealso: ['nm2rad', 'rad2km'] },
    nm2rad: { summary: 'Convert distance from nautical miles to radians', syntax: ['rad = nm2rad(nm)'], seealso: ['rad2nm', 'nm2deg'] },
    rad2sm: { summary: 'Convert distance from radians to statute miles', syntax: ['sm = rad2sm(rad)'], seealso: ['sm2rad', 'rad2km'] },
    sm2rad: { summary: 'Convert distance from statute miles to radians', syntax: ['rad = sm2rad(sm)'], seealso: ['rad2sm', 'sm2km'] },
    meanm: { summary: 'Mean location of geographic coordinates', syntax: ['[latm,lonm] = meanm(lat,lon)'], seealso: ['distance', 'azimuth'] },
    changem: { summary: 'Substitute values in array', syntax: ['B = changem(A,newval,oldval)'], seealso: ['ismember'] },
    ingeoquad: { summary: 'True for points inside or on lat-lon quadrangle', syntax: ['tf = ingeoquad(lat,lon,latlim,lonlim)'], seealso: ['inpolygon'] },
    ecef2enuv: { summary: 'Rotate ECEF vector to local ENU', syntax: ['[uE,vN,wU] = ecef2enuv(U,V,W,lat0,lon0)'], seealso: ['enu2ecefv', 'ecef2enu'] },
    enu2ecefv: { summary: 'Rotate local ENU vector to ECEF', syntax: ['[U,V,W] = enu2ecefv(uE,vN,wU,lat0,lon0)'], seealso: ['ecef2enuv', 'enu2ecef'] },
    ecef2nedv: { summary: 'Rotate ECEF vector to local NED', syntax: ['[uN,vE,wD] = ecef2nedv(U,V,W,lat0,lon0)'], seealso: ['ned2ecefv', 'ecef2ned'] },
    ned2ecefv: { summary: 'Rotate local NED vector to ECEF', syntax: ['[U,V,W] = ned2ecefv(uN,vE,wD,lat0,lon0)'], seealso: ['ecef2nedv', 'ned2ecef'] },
    toDegrees: { summary: 'Convert angles to degrees', syntax: ['deg = toDegrees(angleUnits,angles)'], seealso: ['fromDegrees', 'deg2rad'] },
    fromDegrees: { summary: 'Convert angles from degrees', syntax: ['angles = fromDegrees(angleUnits,deg)'], seealso: ['toDegrees', 'deg2rad'] },
    distance: { summary: 'Angular or surface distance between two geographic points', syntax: ['d = distance(pt1,pt2)'], seealso: ['azimuth', 'reckon', 'departure'] },
    azimuth: { summary: 'Azimuth between two geographic points', syntax: ['az = azimuth(lat1,lon1,lat2,lon2)'], seealso: ['distance', 'reckon', 'departure'] },
    reckon: { summary: 'Point at a given azimuth and range from a starting location', syntax: ['[latout,lonout] = reckon(lat,lon,rng,az)'], seealso: ['distance', 'azimuth'] },
    departure: { summary: 'Longitude distance (departure) between two meridians at given latitudes', syntax: ['d = departure(lon1,lon2,lat)'], seealso: ['distance', 'azimuth'] },
    antipode: { summary: 'Point diametrically opposite on the globe', syntax: ['[latout,lonout] = antipode(lat,lon)'], seealso: ['distance', 'azimuth'] },
    wrapTo180: { summary: 'Wrap angle in degrees to [-180, 180]', syntax: ['lon = wrapTo180(lon)'], seealso: ['wrapTo360', 'wrapToPi'] },
    wrapTo360: { summary: 'Wrap angle in degrees to [0, 360]', syntax: ['lon = wrapTo360(lon)'], seealso: ['wrapTo180', 'wrapToPi'] },
    wrapToPi: { summary: 'Wrap angle in radians to [-pi, pi]', syntax: ['lon = wrapToPi(lon)'], seealso: ['wrapTo2Pi', 'wrapTo180'] },
    wrapTo2Pi: { summary: 'Wrap angle in radians to [0, 2*pi]', syntax: ['lon = wrapTo2Pi(lon)'], seealso: ['wrapToPi', 'wrapTo360'] },
    wgs84Ellipsoid: { summary: 'WGS84 reference ellipsoid parameters [semimajor, eccentricity]', syntax: ['e = wgs84Ellipsoid'], seealso: ['earthRadius', 'flat2ecc'] },
    earthRadius: { summary: 'Mean radius of planet Earth', syntax: ['r = earthRadius'], seealso: ['wgs84Ellipsoid', 'flat2ecc'] },
    ecc2flat: { summary: 'Flattening of an ellipse from eccentricity', syntax: ['f = ecc2flat(ecc)'], seealso: ['flat2ecc', 'ecc2n'] },
    flat2ecc: { summary: 'Eccentricity of an ellipse from flattening', syntax: ['ecc = flat2ecc(f)'], seealso: ['ecc2flat', 'n2ecc'] },
    ecc2n: { summary: 'Third flattening from eccentricity', syntax: ['n = ecc2n(ecc)'], seealso: ['n2ecc', 'ecc2flat'] },
    n2ecc: { summary: 'Eccentricity from third flattening', syntax: ['ecc = n2ecc(n)'], seealso: ['ecc2n', 'flat2ecc'] },
    majaxis: { summary: 'Semimajor axis from semiminor axis and eccentricity', syntax: ['a = majaxis(b,ecc)'], seealso: ['minaxis', 'flat2ecc'] },
    minaxis: { summary: 'Semiminor axis from semimajor axis and eccentricity', syntax: ['b = minaxis(a,ecc)'], seealso: ['majaxis', 'ecc2flat'] },
    geocentricLatitude: { summary: 'Convert geodetic to geocentric latitude', syntax: ['latc = geocentricLatitude(latd,ecc)'], seealso: ['parametricLatitude', 'geodetic2ecef'] },
    parametricLatitude: { summary: 'Convert geodetic to parametric (reduced) latitude', syntax: ['latp = parametricLatitude(latd,ecc)'], seealso: ['geocentricLatitude', 'geodetic2ecef'] },
    meridianarc: { summary: 'Ellipsoidal distance along a meridian', syntax: ['d = meridianarc(phi1,phi2,ecc)'], seealso: ['distance', 'earthRadius'] },
    geodetic2ecef: { summary: 'Transform geodetic to ECEF coordinates', syntax: ['[X,Y,Z] = geodetic2ecef(lat,lon,h)'], seealso: ['ecef2geodetic', 'ecef2enu', 'enu2ecef'] },
    ecef2geodetic: { summary: 'Transform ECEF to geodetic coordinates', syntax: ['[lat,lon,h] = ecef2geodetic(X,Y,Z)'], seealso: ['geodetic2ecef', 'ecef2enu'] },
    ecef2enu: { summary: 'Transform ECEF to local east-north-up coordinates', syntax: ['[E,N,U] = ecef2enu(X,Y,Z,lat0,lon0,h0)'], seealso: ['enu2ecef', 'ecef2ned', 'geodetic2enu'] },
    enu2ecef: { summary: 'Transform local east-north-up to ECEF coordinates', syntax: ['[X,Y,Z] = enu2ecef(E,N,U,lat0,lon0,h0)'], seealso: ['ecef2enu', 'ned2ecef', 'enu2geodetic'] },
    ecef2ned: { summary: 'Transform ECEF to local north-east-down coordinates', syntax: ['[N,E,D] = ecef2ned(X,Y,Z,lat0,lon0,h0)'], seealso: ['ned2ecef', 'ecef2enu'] },
    ned2ecef: { summary: 'Transform local north-east-down to ECEF coordinates', syntax: ['[X,Y,Z] = ned2ecef(N,E,D,lat0,lon0,h0)'], seealso: ['ecef2ned', 'enu2ecef'] },
    geodetic2enu: { summary: 'Transform geodetic to local east-north-up', syntax: ['[E,N,U] = geodetic2enu(lat,lon,h,lat0,lon0,h0)'], seealso: ['enu2geodetic', 'geodetic2ecef'] },
    enu2geodetic: { summary: 'Transform local east-north-up to geodetic', syntax: ['[lat,lon,h] = enu2geodetic(E,N,U,lat0,lon0,h0)'], seealso: ['geodetic2enu', 'ecef2geodetic'] },
    geodetic2ned: { summary: 'Transform geodetic to local north-east-down', syntax: ['[N,E,D] = geodetic2ned(lat,lon,h,lat0,lon0,h0)'], seealso: ['ned2geodetic', 'geodetic2enu'] },
    ned2geodetic: { summary: 'Transform local north-east-down to geodetic', syntax: ['[lat,lon,h] = ned2geodetic(N,E,D,lat0,lon0,h0)'], seealso: ['geodetic2ned', 'ecef2geodetic'] },
    aer2enu: { summary: 'Transform azimuth-elevation-range to east-north-up', syntax: ['[E,N,U] = aer2enu(az,elev,slantRange)'], seealso: ['enu2aer', 'aer2ned'] },
    enu2aer: { summary: 'Transform east-north-up to azimuth-elevation-range', syntax: ['[az,elev,slantRange] = enu2aer(E,N,U)'], seealso: ['aer2enu', 'ned2aer'] },
    aer2ned: { summary: 'Transform azimuth-elevation-range to north-east-down', syntax: ['[N,E,D] = aer2ned(az,elev,slantRange)'], seealso: ['ned2aer', 'aer2enu'] },
    ned2aer: { summary: 'Transform north-east-down to azimuth-elevation-range', syntax: ['[az,elev,slantRange] = ned2aer(N,E,D)'], seealso: ['aer2ned', 'enu2aer'] },
    geodetic2aer: { summary: 'Transform geodetic to local azimuth-elevation-range', syntax: ['[az,elev,slantRange] = geodetic2aer(lat,lon,h,lat0,lon0,h0)'], seealso: ['aer2geodetic', 'geodetic2enu'] },
    aer2geodetic: { summary: 'Transform azimuth-elevation-range to geodetic', syntax: ['[lat,lon,h] = aer2geodetic(az,elev,slantRange,lat0,lon0,h0)'], seealso: ['geodetic2aer', 'ecef2geodetic'] },
    ecef2aer: { summary: 'Transform ECEF to local azimuth-elevation-range', syntax: ['[az,elev,slantRange] = ecef2aer(X,Y,Z,lat0,lon0,h0)'], seealso: ['aer2ecef', 'ecef2enu'] },
    aer2ecef: { summary: 'Transform azimuth-elevation-range to ECEF', syntax: ['[X,Y,Z] = aer2ecef(az,elev,slantRange,lat0,lon0,h0)'], seealso: ['ecef2aer', 'enu2ecef'] },
    degrees2dms: { summary: 'Convert decimal degrees to degrees-minutes-seconds', syntax: ['dms = degrees2dms(deg)'], seealso: ['dms2degrees', 'degrees2dm'] },
    degrees2dm: { summary: 'Convert decimal degrees to degrees-minutes', syntax: ['dm = degrees2dm(deg)'], seealso: ['dm2degrees', 'degrees2dms'] },
    dms2degrees: { summary: 'Convert degrees-minutes-seconds to decimal degrees', syntax: ['deg = dms2degrees(dms)'], seealso: ['degrees2dms', 'dm2degrees'] },
    dm2degrees: { summary: 'Convert degrees-minutes to decimal degrees', syntax: ['deg = dm2degrees(dm)'], seealso: ['degrees2dm', 'dms2degrees'] },
    interpm: { summary: 'Densify latitude-longitude sampling in lines or polygons', syntax: ['[lati,loni] = interpm(lat,lon,maxdiff)'], seealso: ['distance', 'azimuth'] },
    angl2str: { summary: 'Format angle as a string', syntax: ["str = angl2str(ang)"], seealso: ['degrees2dms', 'num2str'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Navigation Toolbox, extracted from nav.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_NAV: Record<string, HelpEntry | string> = {
    lla2ecef: { summary: 'Convert LLA (lat/lon/alt) to ECEF coordinates', syntax: ['ecef = lla2ecef(lla)'], seealso: ['ecef2lla', 'geodetic2ecef'] },
    ecef2lla: { summary: 'Convert ECEF to LLA (lat/lon/alt) coordinates', syntax: ['lla = ecef2lla(ecef)'], seealso: ['lla2ecef', 'ecef2geodetic'] },
    quatnormalize: { summary: 'Normalize quaternion to unit length', syntax: ['qn = quatnormalize(q)'], seealso: ['quatinv', 'quatmultiply'] },
    lla2ned: { summary: 'Transform geodetic coordinates to local north-east-down (NED)', syntax: ['xyzNED = lla2ned(lla,lla0,method)'], seealso: ['lla2enu', 'ned2lla', 'lla2ecef', 'ecef2lla'] },
    lla2enu: { summary: 'Transform geodetic coordinates to local east-north-up (ENU)', syntax: ['xyzENU = lla2enu(lla,lla0,method)'], seealso: ['lla2ned', 'enu2lla', 'lla2ecef'] },
    eul2quat: { summary: 'Convert Euler angles to quaternion', syntax: ['quat = eul2quat(eul)'], seealso: ['quat2eul', 'eul2rotm', 'eul2tform', 'axang2quat'] },
    quat2eul: { summary: 'Convert quaternion to Euler angles', syntax: ['eul = quat2eul(quat)'], seealso: ['eul2quat', 'quat2rotm', 'rotm2eul'] },
    eul2rotm: { summary: 'Convert Euler angles to rotation matrix', syntax: ['rotm = eul2rotm(eul)'], seealso: ['rotm2eul', 'eul2quat', 'eul2tform', 'axang2rotm'] },
    rotm2eul: { summary: 'Convert rotation matrix to Euler angles', syntax: ['eul = rotm2eul(rotm)'], seealso: ['eul2rotm', 'rotm2quat', 'quat2eul'] },
    eul2tform: { summary: 'Convert Euler angles to homogeneous transformation matrix', syntax: ['tform = eul2tform(eul)'], seealso: ['eul2rotm', 'eul2quat', 'tform2rotm', 'axang2tform'] },
    cart2hom: { summary: 'Converts a set of points in Cartesian coordinates to homogeneous coordinates.', syntax: ['hom = cart2hom(cart)'], seealso: ['hom2cart'] },
    hom2cart: { summary: 'Converts a set of homogeneous points to Cartesian coordinates.', syntax: ['cart = hom2cart(hom)'], seealso: ['cart2hom'] },
    trvec2tform: { summary: 'Converts the Cartesian representation of the translation vector trvec to the corresponding homogeneous transformation tform.', syntax: ['tform = trvec2tform(trvec)'], seealso: ['tform2trvec', 'se2', 'se3'] },
    tform2trvec: { summary: 'Extracts the Cartesian representation of the translation vector trvec from the homogeneous transformation tform.', syntax: ['trvec = tform2trvec(tform)'], seealso: ['trvec2tform', 'se2', 'se3'] },
    rotm2tform: { summary: 'Converts the rotation matrix rotm into a homogeneous transformation matrix tform.', syntax: ['tform = rotm2tform(rotm)'], seealso: ['tform2rotm', 'se2', 'se3', 'so2'] },
    tform2rotm: { summary: 'Extracts the rotational component from a homogeneous transformation, tform, and returns it as an orthonormal rotation matrix, rotm.', syntax: ['rotm = tform2rotm(tform)'], seealso: ['rotm2tform', 'se2', 'se3', 'so2'] },
    axang2rotm: { summary: 'Converts a rotation given in axis-angle form, axang, to an orthonormal rotation matrix, rotm.', syntax: ['rotm = axang2rotm(axang)'], seealso: ['rotm2axang', 'so2', 'so3'] },
    axang2quat: { summary: 'Converts a rotation given in axis-angle form, axang, to quaternion, quat.', syntax: ['quat = axang2quat(axang)'], seealso: ['quat2axang', 'quaternion'] },
    rotx: { summary: 'Rotation matrix around x-axis', syntax: ['R = rotx(ang)'], seealso: ['roty', 'rotz', 'axang2rotm'] },
    roty: { summary: 'Rotation matrix around y-axis', syntax: ['R = roty(ang)'], seealso: ['rotx', 'rotz', 'axang2rotm'] },
    rotz: { summary: 'Rotation matrix around z-axis', syntax: ['R = rotz(ang)'], seealso: ['rotx', 'roty', 'axang2rotm'] },
    quat2rotm: { summary: 'Converts a quaternion quat to an orthonormal rotation matrix, rotm.', syntax: ['rotm = quat2rotm(quat)'], seealso: ['rotm2quat', 'quaternion', 'so2', 'so3'] },
    rotm2quat: { summary: 'Converts a rotation matrix, rotm, to the corresponding unit quaternion representation, quat.', syntax: ['quat = rotm2quat(rotm)'], seealso: ['quat2rotm', 'so3', 'quaternion'] },
    quat2axang: { summary: 'Converts a quaternion, quat, to the equivalent axis-angle rotation, axang.', syntax: ['axang = quat2axang(quat)'], seealso: ['axang2quat', 'quaternion'] },
    quat2tform: { summary: 'Converts a quaternion, quat, to a homogeneous transformation matrix, tform.', syntax: ['tform = quat2tform(quat)'], seealso: ['tform2quat', 'quaternion', 'se2', 'se3'] },
    tform2quat: { summary: 'Extracts the rotational component from a homogeneous transformation, tform, and returns it as a quaternion, quat.', syntax: ['quat = tform2quat(tform)'], seealso: ['quat2tform', 'se3', 'quaternion'] },
    rotm2axang: { summary: 'Converts a rotation given as an orthonormal rotation matrix, rotm, to the corresponding axis-angle representation, axang.', syntax: ['axang = rotm2axang(rotm)'], seealso: ['axang2rotm', 'so3'] },
    rotmat2vec3d: { summary: 'Rotate 3-D vector using rotation matrix', syntax: ['vr = rotmat2vec3d(R,v)'], seealso: ['rotx', 'roty', 'rotz'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Deep Learning Toolbox, extracted from nnet.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_NNET: Record<string, HelpEntry | string> = {
    trainNetwork: {
      summary: 'Train deep learning neural network',
      syntax: ['net = trainNetwork(X,Y,layers,options)'],
      seealso: ['trainingOptions', 'predict', 'classify', 'fullyConnectedLayer'],
    },
    trainingOptions: {
      summary: 'Options for training deep learning neural network',
      syntax: ["options = trainingOptions('adam')"],
      seealso: ['trainNetwork', 'dlnetwork', 'adamupdate'],
    },
    predict: {
      summary: 'Predict responses using trained deep learning network',
      syntax: ['Y = predict(net,X)'],
      seealso: ['classify', 'trainNetwork', 'activations'],
    },
    classify: {
      summary: 'Classify data using trained deep learning network',
      syntax: ['labels = classify(net,X)'],
      seealso: ['predict', 'trainNetwork', 'onehotdecode'],
    },
    fullyConnectedLayer: {
      summary: 'Fully connected layer',
      syntax: ['layer = fullyConnectedLayer(outputSize)'],
      seealso: ['reluLayer', 'softmaxLayer', 'batchNormalizationLayer', 'trainNetwork'],
    },
    reluLayer: {
      summary: 'Rectified linear unit (ReLU) layer',
      syntax: ['layer = reluLayer'],
      seealso: ['leakyReluLayer', 'geluLayer', 'sigmoidLayer', 'tanhLayer'],
    },
    sigmoidLayer: {
      summary: 'Sigmoid activation layer',
      syntax: ['layer = sigmoidLayer'],
      seealso: ['reluLayer', 'tanhLayer', 'softmaxLayer'],
    },
    tanhLayer: {
      summary: 'Hyperbolic tangent activation layer',
      syntax: ['layer = tanhLayer'],
      seealso: ['reluLayer', 'sigmoidLayer'],
    },
    softmaxLayer: {
      summary: 'Softmax layer',
      syntax: ['layer = softmaxLayer'],
      seealso: ['classificationLayer', 'fullyConnectedLayer'],
    },
    geluLayer: {
      summary: 'Gaussian error linear unit (GELU) activation layer',
      syntax: ['layer = geluLayer'],
      seealso: ['reluLayer', 'leakyReluLayer'],
    },
    leakyReluLayer: {
      summary: 'Leaky ReLU layer',
      syntax: ['layer = leakyReluLayer'],
      seealso: ['reluLayer', 'geluLayer'],
    },
    batchNormalizationLayer: {
      summary: 'Batch normalisation layer',
      syntax: ['layer = batchNormalizationLayer'],
      seealso: ['reluLayer', 'dropoutLayer', 'fullyConnectedLayer'],
    },
    dropoutLayer: {
      summary: 'Dropout regularisation layer',
      syntax: ['layer = dropoutLayer'],
      seealso: ['batchNormalizationLayer', 'reluLayer'],
    },
    imageInputLayer: {
      summary: 'Image input layer',
      syntax: ['layer = imageInputLayer(inputSize)'],
      seealso: ['featureInputLayer', 'sequenceInputLayer'],
    },
    featureInputLayer: {
      summary: 'Feature input layer',
      syntax: ['layer = featureInputLayer(numFeatures)'],
      seealso: ['imageInputLayer', 'fullyConnectedLayer'],
    },
    classificationLayer: {
      summary: 'Classification output layer',
      syntax: ['layer = classificationLayer'],
      seealso: ['softmaxLayer', 'regressionLayer'],
    },
    regressionLayer: {
      summary: 'Regression output layer',
      syntax: ['layer = regressionLayer'],
      seealso: ['classificationLayer', 'mse'],
    },
    lstmLayer: {
      summary: 'Long short-term memory (LSTM) layer',
      syntax: ['layer = lstmLayer(numHiddenUnits)'],
      seealso: ['gruLayer', 'sequenceInputLayer', 'lstm'],
    },
    gruLayer: {
      summary: 'Gated recurrent unit (GRU) layer',
      syntax: ['layer = gruLayer(numHiddenUnits)'],
      seealso: ['lstmLayer', 'gru'],
    },
    convolution2dLayer: {
      summary: '2-D convolutional layer',
      syntax: ['layer = convolution2dLayer(filterSize,numFilters)'],
      seealso: ['maxPooling2dLayer', 'batchNormalizationLayer', 'reluLayer'],
    },
    maxPooling2dLayer: {
      summary: '2-D max pooling layer',
      syntax: ['layer = maxPooling2dLayer(poolSize)'],
      seealso: ['convolution2dLayer', 'averagePooling2dLayer'],
    },
    averagePooling2dLayer: {
      summary: '2-D average pooling layer',
      syntax: ['layer = averagePooling2dLayer(poolSize)'],
      seealso: ['maxPooling2dLayer', 'convolution2dLayer'],
    },
    dlnetwork: {
      summary: 'Deep learning neural network for custom training loops',
      syntax: ['net = dlnetwork(layers)'],
      seealso: ['trainNetwork', 'adamupdate', 'dlarray'],
    },
    dlarray: {
      summary: 'Labelled array for deep learning',
      syntax: ["X = dlarray(data)"],
      seealso: ['extractdata', 'fullyconnect', 'relu'],
    },
    extractdata: {
      summary: 'Extract data from dlarray',
      syntax: ['Y = extractdata(X)'],
      seealso: ['dlarray'],
    },
    adamupdate: {
      summary: 'Update parameters using adaptive moment estimation (Adam)',
      syntax: ['[netUpdated,avgGrad,avgSqGrad] = adamupdate(net,grad,avgGrad,avgSqGrad,iteration)'],
      seealso: ['dlnetwork', 'trainingOptions'],
    },
    dlgradient: { summary: 'Gradients via automatic differentiation', syntax: ['[g1,…] = dlgradient(loss, x1, …)'], seealso: ['dlfeval', 'dlarray', 'adamupdate'] },
    dlfeval: { summary: 'Evaluate a function enabling automatic differentiation', syntax: ['[…] = dlfeval(fcn, x1, …)'], seealso: ['dlgradient', 'dlarray'] },
    fullyconnect: {
      summary: 'Sum all weighted input data and apply a bias',
      syntax: ['Y = fullyconnect(X,weights,bias)'],
      seealso: ['relu', 'softmax', 'crossentropy'],
    },
    relu: {
      summary: 'Apply rectified linear unit activation',
      syntax: ['Y = relu(X)'],
      seealso: ['sigmoid', 'softmax', 'leakyrelu', 'gelu'],
    },
    sigmoid: {
      summary: 'Apply sigmoid activation',
      syntax: ['Y = sigmoid(X)'],
      seealso: ['relu', 'softmax', 'tanh'],
    },
    softmax: {
      summary: 'Apply softmax activation to channel dimension',
      syntax: ['Y = softmax(X)'],
      seealso: ['crossentropy', 'sigmoid', 'onehotdecode'],
    },
    crossentropy: {
      summary: 'Cross-entropy loss for classification tasks',
      syntax: ['loss = crossentropy(Y,targets)'],
      seealso: ['mse', 'l2loss', 'softmax'],
    },
    mse: {
      summary: 'Half mean squared error',
      syntax: ['loss = mse(Y,targets)'],
      seealso: ['crossentropy', 'l2loss'],
    },
    l2loss: {
      summary: 'L2 loss for regression tasks',
      syntax: ['loss = l2loss(Y,targets)'],
      seealso: ['mse', 'crossentropy'],
    },
    lstm: {
      summary: 'Long short-term memory forward pass',
      syntax: ['Y = lstm(X,H0,C0,weights,recurrentWeights,bias)'],
      seealso: ['gru', 'lstmLayer', 'fullyconnect'],
    },
    gru: {
      summary: 'Gated recurrent unit forward pass',
      syntax: ['Y = gru(X,H0,weights,recurrentWeights,bias)'],
      seealso: ['lstm', 'gruLayer'],
    },
    batchnorm: {
      summary: 'Normalize data across all observations for each channel',
      syntax: ['Y = batchnorm(X,offset,scaleFactor)'],
      seealso: ['batchNormalizationLayer', 'layernorm'],
    },
    maxpool: {
      summary: 'Pool data to maximum value',
      syntax: ['Y = maxpool(X,poolsize)'],
      seealso: ['maxPooling2dLayer', 'averagePooling2dLayer'],
    },
    gelu: {
      summary: 'Apply Gaussian error linear unit (GELU) activation',
      syntax: ['Y = gelu(X)'],
      seealso: ['relu', 'leakyrelu', 'geluLayer'],
    },
    leakyrelu: {
      summary: 'Apply leaky rectified linear unit activation',
      syntax: ['Y = leakyrelu(X)'],
      seealso: ['relu', 'gelu', 'leakyReluLayer'],
    },
    onehotdecode: {
      summary: 'Decode probability vectors into class labels',
      syntax: ['A = onehotdecode(B,classes,featureDim)'],
      seealso: ['classify', 'softmax', 'crossentropy'],
    },
    layerGraph: {
      summary: 'Graph of network layers for deep learning',
      syntax: ['lgraph = layerGraph'],
      seealso: ['dlnetwork', 'trainNetwork', 'analyzenetwork'],
    },
    analyzenetwork: {
      summary: 'Analyze deep learning network architecture',
      syntax: ['analyzenetwork(net)'],
      seealso: ['trainNetwork', 'dlnetwork', 'layerGraph'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Optimization Toolbox, extracted from optim.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_OPTIM: Record<string, HelpEntry | string> = {
    linprog: {
      summary: 'Linear programming solver',
      syntax: ['x = linprog(f,A,b)'],
      seealso: ['quadprog', 'intlinprog', 'fmincon', 'optimoptions'],
    },
    quadprog: {
      summary: 'Quadratic programming solver',
      syntax: ['x = quadprog(H,f)'],
      seealso: ['linprog', 'fmincon', 'optimoptions'],
    },
    fminunc: {
      summary: 'Solve unconstrained multivariable nonlinear minimization',
      syntax: ['x = fminunc(fun,x0)'],
      seealso: ['fmincon', 'fminsearch', 'optimoptions'],
    },
    fmincon: {
      summary: 'Solve constrained nonlinear multivariable minimization',
      syntax: ['x = fmincon(fun,x0,A,b)'],
      seealso: ['fminunc', 'linprog', 'quadprog', 'optimoptions'],
    },
    fsolve: {
      summary: 'Solve system of nonlinear equations',
      syntax: ['x = fsolve(fun,x0)'],
      seealso: ['fminunc', 'lsqnonlin', 'optimoptions'],
    },
    lsqnonlin: {
      summary: 'Solve nonlinear least-squares problems',
      syntax: ['x = lsqnonlin(fun,x0)'],
      seealso: ['lsqcurvefit', 'lsqlin', 'fsolve', 'optimoptions'],
    },
    lsqcurvefit: {
      summary: 'Solve nonlinear curve-fitting (data-fitting) problems',
      syntax: ['x = lsqcurvefit(fun,x0,xdata,ydata)'],
      seealso: ['lsqnonlin', 'lsqlin', 'curve_fitting', 'optimoptions'],
    },
    lsqlin: {
      summary: 'Solve constrained linear least-squares problems',
      syntax: ['x = lsqlin(C,d,A,b)'],
      seealso: ['lsqnonlin', 'quadprog', 'optimoptions'],
    },
    intlinprog: {
      summary: 'Mixed-integer linear programming (MILP)',
      syntax: ['x = intlinprog(f,intcon,A,b)'],
      seealso: ['linprog', 'optimoptions'],
    },
    optimoptions: {
      summary: 'Create optimization options',
      syntax: ["options = optimoptions('fmincon')"],
      seealso: ['optimset', 'fmincon', 'linprog', 'fsolve'],
    },
    optimset: {
      summary: 'Create or modify optimization options structure',
      syntax: ['options = optimset(Name,Value)'],
      seealso: ['optimoptions', 'fminsearch', 'fminbnd', 'fzero'],
    },
    optimvar: {
      summary: 'Create optimization variable for problem-based approach',
      syntax: ['x = optimvar(name)'],
      seealso: ['optimproblem', 'optimoptions'],
    },
    optimproblem: {
      summary: 'Create optimization problem',
      syntax: ['prob = optimproblem'],
      seealso: ['optimvar', 'optimoptions'],
    },
    fgoalattain: {
      summary: 'Solve multiobjective goal attainment problems',
      syntax: ['x = fgoalattain(fun,x0,goal,weight)'],
      seealso: ['fmincon', 'fminimax', 'gamultiobj', 'optimoptions'],
    },
    fminimax: {
      summary: 'Solve minimax constraint problems',
      syntax: ['x = fminimax(fun,x0)'],
      seealso: ['fmincon', 'fgoalattain', 'fseminf', 'optimoptions'],
    },
    fseminf: {
      summary: 'Solve semi-infinitely constrained minimisation problems',
      syntax: ['x = fseminf(fun,x0,ntheta,seminfcon)'],
      seealso: ['fmincon', 'fminimax', 'optimoptions'],
    },
    coneprog: {
      summary: 'Second-order cone programming solver',
      syntax: ['x = coneprog(f,socConstraints)'],
      seealso: ['secondordercone', 'linprog', 'quadprog', 'fmincon'],
    },
    secondordercone: {
      summary: 'Create second-order cone constraint for coneprog',
      syntax: ['socc = secondordercone(A,b,d,gamma)'],
      seealso: ['coneprog'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Parallel Computing Toolbox, extracted from parallel.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_PARALLEL: Record<string, HelpEntry | string> = {
    parpool: {
      summary: 'Create or access parallel pool',
      syntax: ['p = parpool'],
      seealso: ['gcp', 'delete', 'parfor'],
    },
    gcp: {
      summary: 'Get current parallel pool',
      syntax: ['p = gcp'],
      seealso: ['parpool', 'delete'],
    },
    gpuArray: {
      summary: 'Create array on GPU',
      syntax: ['A = gpuArray(X)'],
      seealso: ['gather', 'isgpuarray', 'pagefun'],
    },
    gather: {
      summary: 'Retrieve data from GPU array',
      syntax: ['X = gather(A)'],
      seealso: ['gpuArray', 'isgpuarray'],
    },
    isgpuarray: {
      summary: 'Determine whether input is gpuArray',
      syntax: ['tf = isgpuarray(A)'],
      seealso: ['gpuArray', 'gather'],
    },
    pagefun: {
      summary: 'Apply function to each page of N-D array',
      syntax: ['B = pagefun(func,A)'],
      seealso: ['gpuArray', 'arrayfun'],
    },
    distributed: {
      summary: 'Create distributed array',
      syntax: ['D = distributed(X)'],
      seealso: ['codistributed', 'gather'],
    },
    codistributed: {
      summary: 'Create codistributed array',
      syntax: ['D = codistributed(X)'],
      seealso: ['distributed', 'gather'],
    },
    batch: {
      summary: 'Run MATLAB function or script as batch job',
      syntax: ['j = batch(fcn)'],
      seealso: ['parpool', 'submit', 'wait'],
    },
    spmdindex: {
      summary: 'Index of current worker in spmd block',
      syntax: ['idx = spmdindex'],
      seealso: ['spmdsize', 'spmd'],
    },
    spmdsize: {
      summary: 'Number of workers in spmd block',
      syntax: ['n = spmdsize'],
      seealso: ['spmdindex', 'spmd'],
    },
    parfeval: {
      summary: 'Evaluate function asynchronously on parallel pool worker',
      syntax: ['f = parfeval(pool,fcn,nargout,X1,...,Xn)'],
      seealso: ['fetchOutputs', 'parpool', 'parfor'],
    },
    fetchOutputs: {
      summary: 'Retrieve all output arguments from a parfeval future',
      syntax: ['[X1,...,Xn] = fetchOutputs(f)'],
      seealso: ['parfeval', 'parpool'],
    },
    gputimeit: { summary: 'Time required to run function on GPU',
      syntax: ['t = gputimeit(f)'],
      seealso: ['gpuArray', 'timeit'] },
    validategpu: { summary: 'Validate MATLAB GPU support for current system',
      syntax: ['validategpu'],
      seealso: ['gpuArray', 'gpuDeviceCount'] },
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
    pdearcl: { summary: 'Returns parameter values for a parametrized curve corresponding to a given set of arc length values.', syntax: ['pp = pdearcl(p,xy,s,s0,s1)'], seealso: ['pdegplot'] },
    tri2grid: { summary: 'Interpolate solution from triangle mesh to rectangular grid', syntax: ['ug = tri2grid(p,t,u,x,y)'], seealso: ['pdeintrp', 'initmesh'] },
    jigglemesh: { summary: 'Jiggles the triangular mesh by adjusting the node point positions.', syntax: ['p1 = jigglemesh(p,e,t)'], seealso: ['initmesh', 'pdetriq'] },
    poiasma: { summary: "Assemble stiffness matrix for Poisson equation on a rectangular grid", syntax: ['A = poiasma(nx,ny)'], seealso: ['poicalc', 'delsq', 'numgrid'] },
    poicalc: { summary: "Solve Poisson equation on a rectangular grid", syntax: ['u = poicalc(f,hx,hy,nx,ny)'], seealso: ['poiasma', 'delsq', 'numgrid', 'dst'] },
    dst: { summary: 'Discrete sine transform', syntax: ['y = dst(x)'], seealso: ['idst', 'dct'] },
    idst: { summary: 'Inverse discrete sine transform', syntax: ['x = idst(y)'], seealso: ['dst', 'idct'] },
    createpde: { summary: 'Create a PDE model object', syntax: ['model = createpde()'], seealso: ['geometryFromEdges', 'generateMesh', 'specifyCoefficients', 'applyBoundaryCondition'] },
    geometryFromEdges: { summary: 'Attach 2-D geometry to a PDE model', syntax: ['geometryFromEdges(model,@circleg)'], seealso: ['createpde', 'generateMesh', 'circleg', 'squareg'] },
    generateMesh: { summary: 'Generate a triangular FEM mesh', syntax: ['generateMesh(model)'], seealso: ['createpde', 'geometryFromEdges', 'solvepde'] },
    specifyCoefficients: { summary: 'Set PDE coefficients', syntax: ['specifyCoefficients(model,"m",0,"d",0,"c",c,"a",a,"f",f)'], seealso: ['createpde', 'solvepde'] },
    applyBoundaryCondition: { summary: 'Apply a boundary condition', syntax: ['applyBoundaryCondition(model,"dirichlet","Edge",edges,"u",val)'], seealso: ['createpde', 'solvepde'] },
    solvepde: { summary: 'Solve a stationary PDE model', syntax: ['R = solvepde(model)'], seealso: ['createpde', 'generateMesh', 'pdeplot'] },
    pdeplot: { summary: 'Plot PDE mesh/solution', syntax: ['pdeplot(model,"XYData",u)'], seealso: ['solvepde', 'generateMesh'] },
    circleg: { summary: 'Unit-disk geometry function (use with geometryFromEdges)', syntax: ['geometryFromEdges(model,@circleg)'], seealso: ['geometryFromEdges', 'squareg'] },
    squareg: { summary: 'Unit-square geometry function (use with geometryFromEdges)', syntax: ['geometryFromEdges(model,@squareg)'], seealso: ['geometryFromEdges', 'circleg'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Phased Array System Toolbox, extracted from phased.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_PHASED: Record<string, HelpEntry | string> = {
    az2broadside: {
      summary: 'Convert azimuth angle to broadside angle',
      syntax: ['bsang = az2broadside(az)'],
      seealso: ['broadside2az', 'steervec', 'cbfweights'],
    },
    broadside2az: {
      summary: 'Convert broadside angle to azimuth angle',
      syntax: ['az = broadside2az(bsang)'],
      seealso: ['az2broadside', 'steervec', 'cbfweights'],
    },
    azel2uv: {
      summary: 'Convert azimuth/elevation angles to u/v space',
      syntax: ['uv = azel2uv(azel)'],
      seealso: ['uv2azel', 'az2broadside', 'steervec'],
    },
    uv2azel: {
      summary: 'Convert u/v coordinates to azimuth/elevation angles',
      syntax: ['azel = uv2azel(uv)'],
      seealso: ['azel2uv', 'az2broadside', 'steervec'],
    },
    cbfweights: {
      summary: 'Conventional (delay-and-sum) beamformer weights',
      syntax: ['w = cbfweights(pos,ang)'],
      seealso: ['steervec', 'mvdrweights', 'az2broadside', 'azel2uv'],
    },
    steervec: {
      summary: 'Steering vector for a sensor array',
      syntax: ['sv = steervec(pos,ang)'],
      seealso: ['cbfweights', 'az2broadside', 'azel2uv', 'useToolbox'],
    },
    aperture2gain: {
      summary: 'Convert effective aperture to antenna gain',
      syntax: ['g = aperture2gain(a,lambda)'],
      seealso: ['gain2aperture', 'freq2wavelen'],
    },
    physconst: {
      summary: 'Physical constants',
      syntax: ["c = physconst('LightSpeed')"],
      seealso: ['freq2wavelen'],
    },
    freq2wavelen: {
      summary: 'Convert frequency to wavelength',
      syntax: ['lambda = freq2wavelen(freq)'],
      seealso: ['wavelen2freq', 'physconst'],
    },
    wavelen2freq: {
      summary: 'Convert wavelength to frequency',
      syntax: ['freq = wavelen2freq(lambda)'],
      seealso: ['freq2wavelen', 'physconst'],
    },
    gain2aperture: {
      summary: 'Convert antenna gain to effective aperture',
      syntax: ['a = gain2aperture(g,lambda)'],
      seealso: ['freq2wavelen', 'physconst'],
    },
    albersheim: {
      summary: "Required SNR from Albersheim's equation",
      syntax: ['snr = albersheim(prob_det,prob_fa)'],
      seealso: ['shnidman', 'rocsnr'],
    },
    rocsnr: {
      summary: 'Receiver operating characteristic curves by SNR',
      syntax: ["[Pd,Pfa] = rocsnr(SNRdB)"],
      seealso: ['rocpfa', 'albersheim', 'shnidman'],
    },
    rocpfa: {
      summary: 'Receiver operating characteristic curves by false-alarm probability',
      syntax: ["[Pd,SNR] = rocpfa(Pfa)"],
      seealso: ['rocsnr', 'albersheim', 'shnidman'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Radar Toolbox, extracted from radar.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_RADAR: Record<string, HelpEntry | string> = {
    dop2speed: { summary: 'Convert Doppler shift to speed', syntax: ['speed = dop2speed(dop,lambda)'], seealso: ['speed2dop', 'range2time'] },
    speed2dop: { summary: 'Convert speed to Doppler shift', syntax: ['dop = speed2dop(speed,lambda)'], seealso: ['dop2speed', 'radareqsnr'] },
    range2time: { summary: 'Convert range to propagation time', syntax: ['t = range2time(rng)'], seealso: ['time2range', 'range2bw'] },
    time2range: { summary: 'Convert propagation time to range', syntax: ['rng = time2range(t)'], seealso: ['range2time', 'radareqrng'] },
    range2bw: { summary: 'Convert range resolution to bandwidth', syntax: ['bw = range2bw(rangeres)'], seealso: ['range2time', 'radareqrng'] },
    radareqsnr: { summary: 'Estimates the output signal-to-noise ratio, SNR, at the receiver based on the wavelength lambda, the range tgtrng, the peak transmit power Pt, and the pulse width tau.', syntax: ['SNR = radareqsnr(lambda,tgtrng,Pt,tau)'], seealso: ['phased.Transmitter', 'phased.ReceiverPreamp', 'noisepow', 'radareqpow'] },
    radareqpow: { summary: 'Estimates the peak transmit power, Pt, required for a radar operating at a wavelength of lambda meters to achieve the specified signal-to-noise ratio, SNR, in decibels for a targe', syntax: ['Pt = radareqpow(lambda,tgtrng,SNR,tau)'], seealso: ['phased.Transmitter', 'phased.ReceiverPreamp', 'noisepow', 'radareqrng'] },
    radareqrng: { summary: 'Estimates the theoretical maximum detectable range maxrng for a radar operating with a wavelength of lambda meters with a pulse duration of Tau seconds.', syntax: ['maxrng = radareqrng(lambda,SNR,Pt,tau)'], seealso: ['phased.Transmitter', 'phased.ReceiverPreamp', 'noisepow', 'radareqpow'] },
    aperture2gain: { summary: 'Returns the antenna gain GdB corresponding to an effective aperture A for an incident electromagnetic wave with wavelength lambda.', syntax: ['GdB = aperture2gain(A,lambda)'], seealso: ['gain2aperture'] },
    grnd2slantrange: { summary: 'Returns the slant range slrng corresponding to the ground range projection grndrng.', syntax: ['slrng = grnd2slantrange(grndrng,grazang)'], seealso: ['rainelres', 'sarazres', 'slant2grndrange'] },
    sarnoiserefl: { summary: 'Computes the noise equivalent reflectivity.', syntax: ['neq = sarnoiserefl(freq,freqref,imgsnr,sigmaref)'], seealso: ['radareqsarpow', 'radareqsarrng', 'radareqsarsnr', 'rainscr'] },
    mtifactor: { summary: 'Calculates the MTI improvement factor in dB given the number of pulses in an (M - 1) delay canceler, M, the transmitted frequency, FREQ, and the pulse repetition frequency, PRF.', syntax: ['IM = mtifactor(M,FREQ,PRF)'], seealso: ['mtiloss', 'cfarloss'] },
    steervec: { summary: 'Compute steering vector for an array', syntax: ['sv = steervec(pos,ang)'], seealso: ['aperture2gain'] },
    sarbeamcompratio: { summary: 'Computes the beam compression ratio to illuminate a scene.', syntax: ['bcr = sarbeamcompratio(r,lambda,synlen,wa)'], seealso: ['sarbeamwidth', 'sarlen'] },
    bistaticSurfaceReflectivityLand: { summary: 'Bistatic land surface reflectivity', syntax: ['gamma = bistaticSurfaceReflectivityLand(elev_tx,elev_rx,model)'], seealso: ['sarnoiserefl'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the RF Toolbox, extracted from rf.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_RF: Record<string, HelpEntry | string> = {
    abcd2h: { summary: 'Converts the ABCD-parameters to the hybrid parameters.', syntax: ['h_params = abcd2h(abcd_params)'], seealso: ['abcd2s', 'abcd2y', 'abcd2z', 'z2abcd'] },
    gammams: { summary: 'Calculates the source reflection coefficient of a two-port network required for simultaneous conjugate match.', syntax: ['coefficient = gammams(s_params)'] },
    powergain: { summary: "Calculate 2-port network power gain", syntax: ["g = powergain(s_params,z0,zs,zl,'Gt')"], seealso: ['stabilityk', 'stabilitymu', 'gammams'] },
    s2scc: { summary: 'Functionconverts the 2N-port single-ended S-parameters to N-port common-mode S-parameters.', syntax: ['scc_params = s2scc(s_params)'], seealso: ['s2abcd', 's2h', 's2s', 's2sdd'] },
    stabilityk: { summary: 'Calculates and returns the stability factor, k, and the conditions b1, b2, and delta for the two-port network.', syntax: ['[k,b1,b2,delta] = stabilityk(s_params)'], seealso: ['stabilitymu'] },
    s2abcd: { summary: 'Functionconverts the scattering parameters to the ABCD-parameters.', syntax: ['abcd_params = s2abcd(s_params,z0)'], seealso: ['abcd2s'] },
    abcd2s: { summary: 'Converts the ABCD-parameters abcd_params into the scattering parameters s_params.', syntax: ['s_params = abcd2s(abcd_params,z0)'], seealso: ['abcd2y', 'abcd2z', 'abcd2h', 's2abcd'] },
    s2y: { summary: 'Converts the scattering parameters to the admittance parameters.', syntax: ['y_params = s2y(s_params,z0)'], seealso: ['s2abcd', 's2h', 's2s', 's2sdd'] },
    y2s: { summary: 'Converts Y-parameters to S-parameters.', syntax: ['s_params = y2s(y_params,z0)'], seealso: ['y2abcd', 'y2z', 'y2h', 's2y'] },
    s2z: { summary: 'Converts the scattering parameters to the impedance parameters.', syntax: ['z_params = s2z(s_params,z0)'], seealso: ['s2abcd', 's2h', 's2s', 's2sdd'] },
    z2s: { summary: 'Converts the Z-parameters to the S-parameters.', syntax: ['s_params = z2s(z_params,z0)'], seealso: ['z2abcd', 'z2h', 'z2y', 's2z'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Risk Management Toolbox, extracted from risk.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_RISK: Record<string, HelpEntry | string> = {
    valueAtRisk: {
      summary: 'Value at Risk for a parametric distribution',
      syntax: ['VaR = valueAtRisk(distribution, VaRLevel)'],
      seealso: ['expectedShortfall', 'portvrisk'],
    },
    expectedShortfall: {
      summary: 'Expected Shortfall (CVaR) for a parametric distribution',
      syntax: ['ES = expectedShortfall(distribution, VaRLevel)'],
      seealso: ['valueAtRisk'],
    },
    concentrationIndices: {
      summary: 'Portfolio concentration indices (Gini, Herfindahl-Hirschman, Theil entropy, etc.)',
      syntax: ['ci = concentrationIndices(portfolioData)'],
      seealso: ['asrf'],
    },
    asrf: {
      summary: 'Asymptotic Single Risk Factor (ASRF/Basel II) credit capital model',
      syntax: ['[capital, VaR] = asrf(PD, LGD, R)'],
      seealso: ['concentrationIndices', 'mertonmodel'],
    },
    mertonmodel: {
      summary: "Merton's structural model of default probability",
      syntax: ['[PD,DD,A,Sa] = mertonmodel(Equity,EquityVol,Liability,Rate)'],
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
      seealso: ['rlFiniteSetSpec', 'rlFunctionEnv'],
    },
    rlFiniteSetSpec: {
      summary: 'Create a finite set action specification',
      syntax:  ['spec = rlFiniteSetSpec(elements)'],
      seealso: ['rlNumericSpec', 'rlQAgent'],
    },
    rlFunctionEnv: {
      summary: 'Create a custom RL environment from step/reset functions',
      syntax:  ['env = rlFunctionEnv(obsInfo, actInfo, stepFn, resetFn)'],
      seealso: ['train', 'sim'],
    },
    rlTrainingOptions: {
      summary: 'Create training options for RL agent training',
      syntax:  ['opts = rlTrainingOptions(Name,Value,...)'],
      seealso: ['train', 'rlQAgentOptions', 'rlDQNAgentOptions', 'rlPPOAgentOptions'],
    },
    rlQAgentOptions: {
      summary: 'Create options for Q-learning agent',
      syntax:  ['opts = rlQAgentOptions(Name,Value,...)'],
      seealso: ['rlQAgent'],
    },
    rlDQNAgentOptions: {
      summary: 'Create options for DQN agent',
      syntax:  ['opts = rlDQNAgentOptions(Name,Value,...)'],
      seealso: ['rlDQNAgent'],
    },
    rlPPOAgentOptions: {
      summary: 'Create options for PPO agent',
      syntax:  ['opts = rlPPOAgentOptions(Name,Value,...)'],
      seealso: ['rlPPOAgent'],
    },
    rlQAgent: {
      summary: 'Create a Q-learning agent with epsilon-greedy exploration',
      syntax:  ['agent = rlQAgent(obsInfo, actInfo)'],
      seealso: ['rlDQNAgent', 'train', 'getAction'],
    },
    rlDQNAgent: {
      summary: 'Create a Deep Q-Network (DQN) agent',
      syntax:  ['agent = rlDQNAgent(obsInfo, actInfo)'],
      seealso: ['rlQAgent', 'rlPPOAgent', 'train'],
    },
    rlPPOAgent: {
      summary: 'Create a Proximal Policy Optimization (PPO) agent',
      syntax:  ['agent = rlPPOAgent(obsInfo, actInfo)'],
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
      seealso: ['sim', 'getAction'],
    },
    sim: {
      summary: 'Simulate a reinforcement learning agent in an environment',
      syntax:  ['simOut = sim(agent, env)'],
      seealso: ['train', 'getAction'],
    },
    getAction: {
      summary: 'Get action from agent given an observation',
      syntax:  ['action = getAction(agent, obs)'],
      seealso: ['train', 'sim'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Robotics System Toolbox, extracted from robotics.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_ROBOTICS: Record<string, HelpEntry | string> = {
    angdiff: {
      summary: 'Difference between two angles',
      syntax: ['delta = angdiff(alpha,beta)'],
      seealso: ['wrapToPi', 'wrapTo2Pi'],
    },
    axang2quat: {
      summary: 'Convert axis-angle rotation to quaternion',
      syntax: ['quat = axang2quat(axang)'],
      seealso: ['axang2rotm', 'quat2rotm', 'eul2quat'],
    },
    axang2rotm: {
      summary: 'Convert axis-angle rotation to rotation matrix',
      syntax: ['rotm = axang2rotm(axang)'],
      seealso: ['axang2quat', 'rotm2quat', 'eul2rotm'],
    },
    axang2tform: {
      summary: 'Convert axis-angle rotation to homogeneous transformation matrix',
      syntax: ['tform = axang2tform(axang)'],
      seealso: ['axang2rotm', 'trvec2tform', 'eul2tform'],
    },
    cart2hom: {
      summary: 'Convert Cartesian coordinates to homogeneous coordinates',
      syntax: ['hom = cart2hom(cart)'],
      seealso: ['hom2cart', 'trvec2tform'],
    },
    hom2cart: {
      summary: 'Convert homogeneous coordinates to Cartesian coordinates',
      syntax: ['cart = hom2cart(hom)'],
      seealso: ['cart2hom'],
    },
    quat2rotm: {
      summary: 'Convert quaternion to rotation matrix',
      syntax: ['rotm = quat2rotm(quat)'],
      seealso: ['rotm2quat', 'eul2rotm', 'axang2rotm'],
    },
    rotm2quat: { summary: 'Convert rotation matrix to quaternion',
      syntax: ['quat = rotm2quat(rotm)'],
      seealso: ['quat2rotm', 'rotm2eul', 'rotm2axang'] },
    rotm2axang: { summary: 'Convert rotation matrix to axis-angle rotation',
      syntax: ['axang = rotm2axang(rotm)'],
      seealso: ['axang2rotm', 'rotm2quat'] },
    eul2rotm: {
      summary: 'Convert Euler angles to rotation matrix',
      syntax: ["rotm = eul2rotm(eul)"],
      seealso: ['rotm2eul', 'eul2quat', 'eul2tform'],
    },
    rotm2eul: { summary: 'Convert rotation matrix to Euler angles',
      syntax: ['eul = rotm2eul(rotm)'],
      seealso: ['eul2rotm', 'rotm2quat'] },
    eul2quat: { summary: 'Convert Euler angles to quaternion',
      syntax: ['quat = eul2quat(eul)'],
      seealso: ['quat2eul', 'eul2rotm'] },
    quat2eul: { summary: 'Convert quaternion to Euler angles',
      syntax: ['eul = quat2eul(quat)'],
      seealso: ['eul2quat', 'rotm2eul'] },
    eul2tform: { summary: 'Convert Euler angles to homogeneous transformation matrix',
      syntax: ['tform = eul2tform(eul)'],
      seealso: ['axang2tform', 'trvec2tform', 'rotm2eul'] },
    tform2eul: { summary: 'Extract Euler angles from homogeneous transformation',
      syntax: ['eul = tform2eul(tform)'],
      seealso: ['eul2tform', 'tform2rotm'] },
    tform2rotm: { summary: 'Extract rotation matrix from homogeneous transformation',
      syntax: ['rotm = tform2rotm(tform)'],
      seealso: ['tform2trvec', 'trvec2tform'] },
    trvec2tform: {
      summary: 'Convert translation vector to homogeneous transformation',
      syntax: ['tform = trvec2tform(trvec)'],
      seealso: ['tform2trvec', 'axang2tform', 'eul2tform'],
    },
    tform2trvec: { summary: 'Extract translation vector from homogeneous transformation',
      syntax: ['trvec = tform2trvec(tform)'],
      seealso: ['trvec2tform', 'tform2rotm'] },
    rigidBodyTree: {
      summary: 'Rigid body tree robot model',
      syntax: ['robot = rigidBodyTree'],
      seealso: ['inverseKinematics', 'forwardKinematics'],
    },
    bsplinepolytraj: {
      summary: 'Polynomial trajectory through waypoints using B-spline',
      syntax: ['[q,qd,qdd] = bsplinepolytraj(waypoints,timePoints,tSamples)'],
      seealso: ['minjerkpolytraj', 'quinticpolytraj'],
    },
    quatnormalize: {
      summary: 'Normalize quaternion',
      syntax: ['qnorm = quatnormalize(q)'],
      seealso: ['quat2rotm', 'axang2quat', 'eul2quat'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Signal Processing Toolbox, extracted from signal.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_SIGNAL: Record<string, HelpEntry | string> = {
    cheby2: { summary: 'Designs an order n lowpass digital Chebyshev Type II filter with normalized stopband edge frequency Ws and stopband attenuation Rs dB.', syntax: ['[b,a] = cheby2(n,Rs,Ws)'], seealso: ['cheb2ap', 'cheb2ord', 'butter', 'cheby1'] },
    ellip: { summary: 'Designs an order n lowpass digital elliptic filter with normalized passband edge frequency Wp, Rp dB of passband ripple, and Rs dB of stopband attenuation.', syntax: ['[b,a] = ellip(n,Rp,Rs,Wp)'], seealso: ['ellipap', 'ellipord', 'butter', 'cheby1'] },
    fir2: { summary: 'Returns an order n FIR filter with frequency-magnitude characteristics specified in the vectors f and m, designed by inverse Fourier transform and windowing.', syntax: ['b = fir2(n,f,m)'], seealso: ['fir1', 'firls', 'firpm', 'cfirpm'] },
    buttord: { summary: 'Returns the lowest order n of the digital Butterworth filter with normalized passband edge Wp, stopband edge Ws, Rp dB passband ripple, and Rs dB stopband attenuation, plus the Butterworth natural frequency Wn.', syntax: ['[n,Wn] = buttord(Wp,Ws,Rp,Rs)'], seealso: ['butter', 'cheb1ord', 'cheb2ord', 'ellipord'] },
    cheb1ord: { summary: 'Returns the lowest order n of the Chebyshev Type I filter that loses no more than Rp dB in the passband and has at least Rs dB of attenuation in the stopband, with cutoff Wn.', syntax: ['[n,Wn] = cheb1ord(Wp,Ws,Rp,Rs)'], seealso: ['cheby1', 'buttord', 'cheb2ord', 'ellipord'] },
    cheb2ord: { summary: 'Returns the lowest order n of the Chebyshev Type II filter that loses no more than Rp dB in the passband and has at least Rs dB of attenuation in the stopband, with cutoff Wn.', syntax: ['[n,Wn] = cheb2ord(Wp,Ws,Rp,Rs)'], seealso: ['cheby2', 'buttord', 'cheb1ord', 'ellipord'] },
    ellipord: { summary: 'Returns the lowest order n of the elliptic filter that loses no more than Rp dB in the passband and has at least Rs dB of attenuation in the stopband, with cutoff Wn.', syntax: ['[n,Wn] = ellipord(Wp,Ws,Rp,Rs)'], seealso: ['ellip', 'buttord', 'cheb1ord', 'cheb2ord'] },
    lin2mu: { summary: 'Convert linear to mu-law compressed values (G.711)', syntax: ['y = lin2mu(x)'], seealso: ['mu2lin'] },
    xcorr2: { summary: '2-D cross-correlation', syntax: ['c = xcorr2(a,b)'], seealso: ['xcorr', 'conv2'] },
    qmf: { summary: 'Quadrature mirror filter', syntax: ['y = qmf(x)'], seealso: ['wfilters'] },
    lar2rc: { summary: 'Returns the reflection coefficients, k, from the log area ratio parameters g.', syntax: ['k = lar2rc(g)'], seealso: ['ac2rc', 'is2rc', 'poly2rc', 'rc2lar'] },
    is2rc: { summary: 'Returns the reflection coefficients, k, from the inverse sine parameters isin.', syntax: ['k = is2rc(isin)'], seealso: ['ac2rc', 'lar2rc', 'poly2rc', 'rc2is'] },
    vco: { summary: 'Creates a signal that oscillates at a frequency determined by the real input vector or matrix x with sample rate Fs.', syntax: ['y = vco(x,Fc,Fs)'], seealso: ['demod', 'modulate'] },
    diric: { summary: 'Returns the Dirichlet Function of degree n evaluated at the elements of the input array x.', syntax: ['y = diric(x,n)'], seealso: ['cos', 'gauspuls', 'pulstran', 'rectpuls'] },
    uencode: { summary: 'Quantizes the entries in a multidimensional array of floating-point numbers x in the range [-1, 1], and encodes them as integers using 2n-level quantization.', syntax: ['y = uencode(x,n)'], seealso: ['udecode'] },
    rectwin: { summary: 'Returns a rectangular window of length L.', syntax: ['w = rectwin(L)'] },
    blackman: { summary: 'Returns an L-point symmetric Blackman window.', syntax: ['w = blackman(L)'] },
    flattopwin: { summary: 'Returns an L-point symmetric flat top window', syntax: ['w = flattopwin(L)'] },
    gausswin: { summary: 'Returns an L-point Gaussian window.', syntax: ['w = gausswin(L)'] },
    parzenwin: { summary: 'Returns the L-point Parzen (de la Vallée Poussin) window.', syntax: ['w = parzenwin(L)'] },
    chebwin: { summary: 'Returns an L-point Chebyshev window.', syntax: ['w = chebwin(L)'] },
    edr: { summary: 'Returns the Edit Distance on Real Signals between sequences x and y.', syntax: ['dist = edr(x,y,tol)'], seealso: ['alignsignals', 'dtw', 'finddelay', 'findsignal'] },
    statelevels: { summary: 'Estimates the low and high state levels in the bilevel waveform x using the histogram method.', syntax: ['levels = statelevels(x)'], seealso: ['midcross', 'overshoot', 'risetime', 'undershoot'] },
    pulsewidth: { summary: 'Returns the time differences between the mid-reference level instants of the initial and final transitions of each positive-polarity pulse in the input bilevel waveform.', syntax: ['w = pulsewidth(x)'], seealso: ['dutycycle', 'pulseperiod', 'pulsesep', 'statelevels'] },
    risetime: { summary: 'Returns a vector, r, containing the time each transition of the input bilevel waveform, x, takes to cross from the 10% to 90% reference levels.', syntax: ['r = risetime(x)'], seealso: ['falltime', 'slewrate', 'statelevels'] },
    overshoot: { summary: 'Returns overshoots expressed as a percentage of the difference between the low- and high-state levels in the input bilevel waveform.', syntax: ['os = overshoot(x)'], seealso: ['settlingtime', 'statelevels'] },
    settlingtime: { summary: 'Returns the time from the mid-reference level instant to the time instant each transition enters and remains within a 2% tolerance region of the final state over the duration d.', syntax: ['s = settlingtime(x,d)'], seealso: ['falltime', 'midcross', 'pulsewidth', 'risetime'] },
    periodogram: { summary: 'Returns the periodogram power spectral density (PSD) estimate of the signal x.', syntax: ['pxx = periodogram(x)'] },
    stft: { summary: 'Returns the Short-Time Fourier Transform (STFT) of x.', syntax: ['s = stft(x)'] },
    rectpuls: { summary: 'Returns a continuous, aperiodic, unit-height rectangular pulse at the sample times indicated in array t, centered about t = 0.', syntax: ['y = rectpuls(t)'], seealso: ['chirp', 'cos', 'diric', 'gauspuls'] },
    upsample: { summary: 'Increases the sample rate of x by inserting n – 1 zeros between samples.', syntax: ['y = upsample(x,n)'], seealso: ['decimate', 'downsample', 'interp', 'interp1'] },
    fwht: { summary: 'Returns the coefficients of the discrete Walsh-Hadamard transform of the input x.', syntax: ['y = fwht(x)'], seealso: ['ifwht', 'dct', 'idct', 'fft'] },
    rceps: { summary: 'Returns both the real cepstrum y and a minimum phase reconstructed version ym of the input sequence.', syntax: ['[y,ym] = rceps(x)'], seealso: ['cceps', 'fft', 'hilbert', 'icceps'] },
    meanfreq: { summary: 'Estimates the mean normalized frequency, freq, of the power spectrum of a time-domain signal, x.', syntax: ['freq = meanfreq(x)'], seealso: ['findpeaks', 'medfreq', 'periodogram', 'plomb'] },
    powerbw: { summary: 'Returns the 3 dB (half-power) bandwidth bw of the input signal x.', syntax: ['bw = powerbw(x)'], seealso: ['bandpower', 'obw', 'periodogram', 'plomb'] },
    mag2db: { summary: 'Expresses in decibels (dB) the magnitude measurements specified in y.', syntax: ['ydb = mag2db(y)'], seealso: ['db', 'db2mag', 'db2pow', 'pow2db'] },
    sinc: { summary: 'Returns an array, y, whose elements are the sinc of the elements of the input, x.', syntax: ['y = sinc(x)'], seealso: ['chirp', 'diric', 'gauspuls', 'pulstran'] },
    freqz: { summary: 'Returns the frequency response of the specified digital filter.', syntax: ['[h,w] = freqz(B,A,"ctf",n)'] },
    goertzel: { summary: 'Returns the discrete-time Fourier transform (DTFT) of the input array data using a second-order Goertzel algorithm.', syntax: ['dft = goertzel(data)'], seealso: ['czt', 'fft'] },
    levinson: { summary: 'Returns the coefficients of an autoregressive linear process of order n that has r as its autocorrelation sequence.', syntax: ['a = levinson(r,n)'], seealso: ['lpc', 'prony', 'rlevinson', 'schurrc'] },
    poly2rc: { summary: 'Returns a vector k of lattice-structure reflection coefficients from a vector a of prediction filter coefficients.', syntax: ['k = poly2rc(a)'], seealso: ['ac2rc', 'latc2tf', 'latcfilt', 'poly2ac'] },
    ac2rc: { summary: 'Returns the reflection coefficients, k, from the autocorrelation sequence r.', syntax: ['[k,r0] = ac2rc(r)'], seealso: ['ac2poly', 'poly2rc', 'rc2ac'] },
    db: { summary: 'Converts the elements of x to decibels (dB).', syntax: ['dbOutput = db(x)'], seealso: ['db2mag', 'db2pow', 'mag2db', 'pow2db'] },
    cell2sos: { summary: 'Generates a matrix sos containing the coefficients of the filter system described by the second-order section cell array cll.', syntax: ['sos = cell2sos(cll)'], seealso: ['sos2cell', 'tf2sos'] },
    kaiserord: { summary: 'Returns a filter order n, normalized frequency band edges Wn, and a shape factor beta that specify a Kaiser window for use with the fir1 function.', syntax: ['[n,Wn,beta,ftype] = kaiserord(f,a,dev)'], seealso: ['fir1', 'kaiser', 'firpmord'] },
    sgolay: { summary: 'Designs a Savitzky-Golay FIR smoothing filter with polynomial order m and frame length fl.', syntax: ['b = sgolay(m,fl)'] },
    buttap: { summary: 'Returns the poles and gain of an order n Butterworth analog lowpass filter prototype.', syntax: ['[z,p,k] = buttap(n)'], seealso: ['besselap', 'butter', 'cheb1ap', 'cheb2ap'] },
    filtfilt: { summary: 'Performs zero-phase digital filtering by processing the input data x in both the forward and reverse directions.', syntax: ['y = filtfilt(b,a,x)'], seealso: ['ctffilt', 'designfilt', 'digitalFilter', 'fftfilt'] },
    cconv: { summary: 'Circularly convolves vectors a and b.', syntax: ['c = cconv(a,b)'], seealso: ['conv', 'xcorr'] },
    fftfilt: { summary: 'FIR filter b applied to x via overlap-add FFT; result equals filter(b,1,x) to ~1e-10.', syntax: ['y = fftfilt(b,x)'], seealso: ['filter', 'filtfilt', 'upfirdn'] },
    phasez: { summary: 'Unwrapped phase response of digital filter B/A over n points in [0,pi).', syntax: ['[phi,w] = phasez(b,a)'], seealso: ['freqz', 'phasedelay', 'zerophase'] },
    phasedelay: { summary: 'Phase delay -angle(H(e^jw))/w of digital filter B/A over n points.', syntax: ['[phi,w] = phasedelay(b,a)'], seealso: ['grpdelay', 'phasez', 'freqz'] },
    zerophase: { summary: 'Real zero-phase amplitude response of digital filter B/A over n points.', syntax: ['[Hr,w] = zerophase(b,a)'], seealso: ['freqz', 'phasez', 'filtfilt'] },
    zplane: { summary: 'Pole-zero plot; with row-vector inputs (b,a) computes roots; with column-vector inputs (z,p) uses them directly. Returns [z,p] in sandbox (no plot).', syntax: ['zplane(b,a)'], seealso: ['freqz', 'tf2zp', 'roots'] },
    impzlength: { summary: 'Effective impulse-response length: length(b) for FIR, or floor(log(5e-5)/log(max_pole_mag)) for IIR.', syntax: ['n = impzlength(b,a)'], seealso: ['impz', 'filtord'] },
    filtord: { summary: 'Filter order: max(degree(b), degree(a)) after trimming trailing zeros.', syntax: ['n = filtord(b,a)'], seealso: ['impzlength', 'firtype'] },
    firtype: { summary: 'Linear-phase FIR type (1–4) from symmetry and length of b.', syntax: ['type = firtype(b)'], seealso: ['islinphase', 'filtord'] },
    islinphase: { summary: 'True if b/a is a linear-phase FIR (a=[1], b symmetric or antisymmetric).', syntax: ['tf = islinphase(b,a)'], seealso: ['firtype', 'isminphase', 'isallpass'] },
    isminphase: { summary: 'True if all zeros and poles of B/A are strictly inside the unit circle.', syntax: ['tf = isminphase(b,a)'], seealso: ['islinphase', 'isallpass'] },
    isallpass: { summary: 'True if B/A is an allpass filter (b = fliplr(a)/a(1) for real coefficients).', syntax: ['tf = isallpass(b,a)'], seealso: ['islinphase', 'isminphase'] },
    tf2zpk: { summary: 'Transfer-function to zero-pole-gain: same as tf2zp.', syntax: ['[z,p,k] = tf2zpk(b,a)'], seealso: ['tf2zp', 'zpk2tf', 'sos2zp'] },
    sos2zp: { summary: 'Second-order-sections matrix to zeros, poles, and gain.', syntax: ['[z,p,k] = sos2zp(sos)'], seealso: ['tf2zpk', 'zp2sos', 'sosfilt'] },
    eqtflength: { summary: 'Pad shorter of b or a with trailing zeros so they have equal length.', syntax: ['[b,a] = eqtflength(b,a)'], seealso: ['filtord', 'tf2zpk'] },
    residuez: { summary: 'Partial-fraction expansion of z-transform B(z)/A(z): H = k + sum r_i/(1-p_i*z^{-1}).', syntax: ['[r,p,k] = residuez(b,a)'], seealso: ['residue', 'tf2zpk', 'zp2tf'] },
    interp: { summary: 'FIR interpolation: upsample x by integer r using a Hamming-windowed sinc lowpass filter.', syntax: ['y = interp(x,r)'], seealso: ['decimate', 'resample', 'upsample', 'upfirdn'] },
    buffer: { summary: 'Partition signal vector x into non-overlapping (or overlapping) frames of length n, with optional overlap p.', syntax: ['y = buffer(x,n)'], seealso: ['reshape', 'spectrogram'] },
    cheb1ap: { summary: 'Returns the poles and gain of an order N Chebyshev Type I analog lowpass filter prototype with Rp dB of passband ripple.', syntax: ['[z,p,k] = cheb1ap(n,Rp)'], seealso: ['besselap', 'buttap', 'cheb2ap', 'ellipap'] },
    cheb2ap: { summary: 'Returns the zeros, poles, and gain of an order N Chebyshev Type II analog lowpass filter prototype with Rs dB of stopband attenuation.', syntax: ['[z,p,k] = cheb2ap(n,Rs)'], seealso: ['besselap', 'buttap', 'cheb1ap', 'ellipap'] },
    ellipap: { summary: 'Returns the zeros, poles, and gain of an order N elliptic analog lowpass filter prototype with Rp dB passband ripple and Rs dB stopband attenuation.', syntax: ['[z,p,k] = ellipap(n,Rp,Rs)'], seealso: ['besselap', 'buttap', 'cheb1ap', 'cheb2ap'] },
    besselap: { summary: 'Returns the poles and gain of an order N Bessel analog lowpass filter prototype (maximally flat group delay). Supported orders: 1–10.', syntax: ['[z,p,k] = besselap(n)'], seealso: ['buttap', 'cheb1ap', 'cheb2ap', 'ellipap'] },
    lp2lp: { summary: 'Transforms a lowpass analog filter prototype with a cutoff frequency of 1 rad/s to a lowpass filter with a cutoff frequency of Wo rad/s.', syntax: ['[bt,at] = lp2lp(b,a,Wo)'], seealso: ['lp2hp', 'lp2bp', 'lp2bs', 'bilinear'] },
    lp2hp: { summary: 'Transforms a lowpass analog filter prototype with a cutoff frequency of 1 rad/s to a highpass filter with a cutoff frequency of Wo rad/s.', syntax: ['[bt,at] = lp2hp(b,a,Wo)'], seealso: ['lp2lp', 'lp2bp', 'lp2bs', 'bilinear'] },
    lp2bp: { summary: 'Transforms a lowpass analog filter prototype with a cutoff frequency of 1 rad/s to a bandpass filter with center frequency Wo rad/s and bandwidth Bw.', syntax: ['[bt,at] = lp2bp(b,a,Wo,Bw)'], seealso: ['lp2lp', 'lp2hp', 'lp2bs', 'bilinear'] },
    lp2bs: { summary: 'Transforms a lowpass analog filter prototype with a cutoff frequency of 1 rad/s to a bandstop filter with center frequency Wo rad/s and bandwidth Bw.', syntax: ['[bt,at] = lp2bs(b,a,Wo,Bw)'], seealso: ['lp2lp', 'lp2hp', 'lp2bp', 'bilinear'] },
    impinvar: { summary: 'Converts the analog filter with transfer function B(s)/A(s) to the digital filter B(z)/A(z) using the impulse invariance method with sample rate Fs (default 1).', syntax: ['[bz,az] = impinvar(b,a,Fs)'], seealso: ['bilinear', 'butter', 'cheby1'] },
    lpc: { summary: 'Returns the linear prediction filter coefficients a and the prediction error power e for the input signal x using a p-th order forward linear predictor.', syntax: ['a = lpc(x,p)'], seealso: ['aryule', 'arburg', 'levinson', 'ac2poly'] },
    aryule: { summary: 'Returns the AR model parameters for a given input signal x using the Yule-Walker method (autocorrelation/Levinson-Durbin).', syntax: ['a = aryule(x,p)'], seealso: ['arburg', 'arcov', 'armcov', 'lpc'] },
    arburg: { summary: 'Returns the AR model parameters for a given input signal x using the Burg method.', syntax: ['a = arburg(x,p)'], seealso: ['aryule', 'arcov', 'armcov', 'lpc'] },
    arcov: { summary: 'Returns the AR model parameters for a given input signal x using the covariance method.', syntax: ['a = arcov(x,p)'], seealso: ['arburg', 'aryule', 'armcov', 'lpc'] },
    armcov: { summary: 'Returns the AR model parameters for a given input signal x using the modified covariance method.', syntax: ['a = armcov(x,p)'], seealso: ['arburg', 'arcov', 'aryule', 'lpc'] },
    snr: { summary: 'Returns the signal-to-noise ratio (SNR) in decibels of the fundamental signal component relative to all other spectral components.', syntax: ['r = snr(x)'], seealso: ['sinad', 'thd', 'sfdr'] },
    sinad: { summary: 'Returns the signal-to-noise-and-distortion ratio (SINAD) in decibels of the fundamental signal component relative to all other spectral components including harmonics.', syntax: ['r = sinad(x)'], seealso: ['snr', 'thd', 'sfdr'] },
    thd: { summary: 'Returns the total harmonic distortion (THD) in decibels of the first n harmonics relative to the fundamental.', syntax: ['r = thd(x)'], seealso: ['snr', 'sinad', 'sfdr'] },
    sfdr: { summary: 'Returns the spurious-free dynamic range (SFDR) in decibels, the ratio of the fundamental component to the largest spurious spectral component.', syntax: ['r = sfdr(x)'], seealso: ['snr', 'sinad', 'thd'] },
    pburg: { summary: 'Estimates the power spectral density of x using the Burg method, returning the PSD pxx and corresponding frequency vector w (in rad/sample).', syntax: ['[pxx,w] = pburg(x,order)'], seealso: ['pyulear', 'pcov', 'pmcov', 'pwelch'] },
    pyulear: { summary: 'Estimates the power spectral density of x using the Yule-Walker (autocorrelation) AR method.', syntax: ['[pxx,w] = pyulear(x,order)'], seealso: ['pburg', 'pcov', 'pmcov', 'pwelch'] },
    pcov: { summary: 'Estimates the power spectral density of x using the covariance AR method (forward prediction error minimization).', syntax: ['[pxx,w] = pcov(x,order)'], seealso: ['pburg', 'pyulear', 'pmcov'] },
    pmcov: { summary: 'Estimates the power spectral density of x using the modified covariance AR method (average of forward and backward prediction errors).', syntax: ['[pxx,w] = pmcov(x,order)'], seealso: ['pburg', 'pyulear', 'pcov'] },
    cpsd: { summary: 'Estimates the cross power spectral density of signals x and y using Welch\'s averaged, modified periodogram method.', syntax: ['[pxy,f] = cpsd(x,y)'], seealso: ['mscohere', 'tfestimate', 'pwelch'] },
    mscohere: { summary: 'Estimates the magnitude-squared coherence of signals x and y using Welch\'s overlapped averaged periodogram method.', syntax: ['[cxy,f] = mscohere(x,y)'], seealso: ['cpsd', 'tfestimate', 'pwelch'] },
    tfestimate: { summary: 'Estimates the transfer function H(f) = Pxy(f)/Pxx(f) between input x and output y using the Welch H1 method.', syntax: ['[txy,f] = tfestimate(x,y)'], seealso: ['cpsd', 'mscohere', 'pwelch'] },
    plomb: { summary: 'Computes the Lomb-Scargle periodogram of signal x sampled at times t (possibly nonuniform).', syntax: ['[pxx,f] = plomb(x,t)'], seealso: ['periodogram', 'pwelch', 'pburg'] },
    rcosdesign: { summary: 'Designs a raised-cosine (normal) or root-raised-cosine (sqrt) FIR pulse-shaping filter of length span*sps+1, normalized to unit energy.', syntax: ['b = rcosdesign(beta,span,sps)'], seealso: ['gaussdesign', 'fir1', 'fir2'] },
    gaussdesign: { summary: 'Designs a Gaussian FIR pulse-shaping filter with BT product bt, symbol span span, and sps samples per symbol.', syntax: ['h = gaussdesign(bt,span,sps)'], seealso: ['rcosdesign', 'fir1'] },
    invfreqz: { summary: 'Identifies a digital IIR filter [b,a] by least-squares fitting to complex frequency response samples h at angular frequencies w.', syntax: ['[b,a] = invfreqz(h,w,nb,na)'], seealso: ['freqz', 'invfreqs', 'prony', 'stmcb'] },
    prony: { summary: 'Uses Prony\'s method to fit an IIR transfer function [b,a] of orders nb and na to the impulse response sequence h.', syntax: ['[b,a] = prony(h,nb,na)'], seealso: ['invfreqz', 'stmcb', 'levinson'] },
    stmcb: { summary: 'Uses the iterative Steiglitz-McBride method to fit an IIR transfer function [b,a] of orders nb and na to the impulse response h.', syntax: ['[b,a] = stmcb(h,nb,na)'], seealso: ['prony', 'invfreqz', 'levinson'] },
    tf2latc: { summary: 'Converts a digital transfer function [b,a] to lattice or lattice-ladder form, returning reflection coefficients K (and optional ladder coefficients V).', syntax: ['K = tf2latc(b,a)'], seealso: ['latc2tf', 'latcfilt', 'poly2rc', 'rc2poly'] },
    latc2tf: { summary: 'Converts lattice filter coefficients K (and optional ladder coefficients V) back to a transfer function [b,a].', syntax: ['[b,a] = latc2tf(K)'], seealso: ['tf2latc', 'latcfilt', 'rc2poly'] },
    latcfilt: { summary: 'Filters signal x using the lattice structure defined by reflection coefficients K (and optional ladder V for IIR), returning the forward output f and backward output g.', syntax: ['[f,g] = latcfilt(K,x)'], seealso: ['tf2latc', 'latc2tf', 'filter'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Statistics and Machine Learning Toolbox, extracted from stats.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_STATS: Record<string, HelpEntry | string> = {
    ttest: { summary: 'Returns a test decision for the null hypothesis that the data in x comes from a normal distribution with mean equal to zero and unknown variance, using the one-sample t-test.', syntax: ['h = ttest(x)'], seealso: ['ztest', 'ttest2', 'sampsizepwr'] },
    ranksum: { summary: 'Returns the p-value of a two-sided Wilcoxon rank sum test.', syntax: ['p = ranksum(x,y)'], seealso: ['kruskalwallis', 'signrank', 'signtest', 'ttest2'] },
    adtest: { summary: 'Returns a test decision for the null hypothesis that the data in vector x is from a population with a normal distribution, using the Anderson-Darling test.', syntax: ['h = adtest(x)'], seealso: ['kstest', 'jbtest'] },
    ansaribradley: { summary: 'Returns a test decision for the null hypothesis that the data in vectors x and y comes from the same distribution, using the Ansari-Bradley test.', syntax: ['h = ansaribradley(x,y)'], seealso: ['vartest2', 'vartestn', 'ttest2'] },
    kstest2: { summary: 'Returns a test decision for the null hypothesis that the data in vectors x1 and x2 are from the same continuous distribution, using the two-sample Kolmogorov-Smirnov test.', syntax: ['h = kstest2(x1,x2)'], seealso: ['kstest', 'adtest', 'lillietest'] },
    signtest: { summary: 'Returns the p-value of a two-sided sign test for the null hypothesis that data in x has zero median (or that x and y have equal medians).', syntax: ['p = signtest(x)'], seealso: ['signrank', 'ranksum', 'ttest'] },
    friedman: { summary: "Returns the p-value for a balanced two-way ANOVA by ranks (Friedman's test) for the data in matrix x.", syntax: ['p = friedman(x,reps)'], seealso: ['anova2', 'kruskalwallis', 'multcompare'] },
    vartestn: { summary: 'Returns the p-value for the test of the null hypothesis that the columns of the data matrix x come from normal distributions with the same variance.', syntax: ['p = vartestn(x)'], seealso: ['vartest', 'vartest2', 'ansaribradley'] },
    copulapdf: { summary: 'Returns the probability density of the copula family, evaluated at the points in the n-by-d matrix u.', syntax: ['y = copulapdf(family,u,rho)'], seealso: ['copulacdf', 'copulastat', 'copulaparam'] },
    copulacdf: { summary: 'Returns the cumulative probability of the copula family, evaluated at the points in the n-by-d matrix u.', syntax: ['p = copulacdf(family,u,rho)'], seealso: ['copulapdf', 'copulastat', 'copularnd'] },
    mvncdf: { summary: 'Returns the cumulative probability of the multivariate normal distribution with zero mean and identity covariance matrix, evaluated at each row of X.', syntax: ['y = mvncdf(X)'], seealso: ['mvnpdf', 'mvncdf', 'normcdf', 'mvtcdf'] },
    mvtcdf: { summary: 'Returns the cumulative probability of the multivariate Student t distribution with correlation matrix C and nu degrees of freedom, evaluated at each row of X.', syntax: ['y = mvtcdf(X,C,nu)'], seealso: ['mvncdf', 'mvtpdf', 'tcdf'] },
    sampsizepwr: { summary: 'Sampsizepwr computes the sample size, power, or alternative parameter value for a hypothesis test, given the other two values.', syntax: ['nout = sampsizepwr(testtype,p0,p1)'], seealso: ['vartest', 'ttest', 'ttest2', 'ztest'] },
    normpdf: { summary: 'Returns the probability density function (pdf) of the standard normal distribution, evaluated at the values in x.', syntax: ['y = normpdf(x)'], seealso: ['pdf', 'normcdf', 'norminv', 'normrnd'] },
    tpdf: "Student's t probability density function", tcdf: "Student's t cumulative distribution function", tinv: "Student's t inverse cumulative distribution function",
    chi2pdf: { summary: 'Returns the probability density function (pdf) of the chi-square distribution with nu degrees of freedom, evaluated at the values in x.', syntax: ['y = chi2pdf(x,nu)'], seealso: ['pdf', 'chi2cdf', 'chi2inv', 'chi2stat'] },
    gampdf: { summary: 'Returns the probability density function (pdf) of the standard gamma distribution with the shape parameter a, evaluated at the values in x.', syntax: ['y = gampdf(x,a)'], seealso: ['GammaDistribution', 'pdf', 'gamcdf', 'gaminv'] },
    exppdf: { summary: 'Returns the probability density function (pdf) of the standard exponential distribution, evaluated at the values in x.', syntax: ['y = exppdf(x)'], seealso: ['ExponentialDistribution', 'pdf', 'expcdf', 'expinv'] },
    betapdf: { summary: 'Returns the probability density function (pdf) of the beta distribution at each of the values in x using the corresponding parameters in a and b.', syntax: ['y = betapdf(x,a,b)'], seealso: ['pdf', 'betafit', 'betainv', 'betastat'] },
    fpdf: { summary: 'Returns the probability density function (pdf) of the F distribution with the numerator degrees of freedom nu1 and denominator degrees of freedom nu2, evaluated at the values in x', syntax: ['p = fpdf(x,nu1,nu2)'], seealso: ['pdf', 'fcdf', 'finv', 'fstat'] },
    unifpdf: { summary: 'Returns the probability density function (pdf) of the standard uniform distribution, evaluated at the values in x.', syntax: ['y = unifpdf(x)'], seealso: ['UniformDistribution', 'pdf', 'unifcdf', 'unifinv'] },
    lognpdf: { summary: 'Returns the probability density function (pdf) of the standard lognormal distribution, evaluated at the values in x.', syntax: ['y = lognpdf(x)'], seealso: ['pdf', 'logncdf', 'logninv', 'lognstat'] },
    binopdf: { summary: 'Computes the binomial probability density function at each of the values in x using the corresponding number of trials in n and probability of success for each trial in p.', syntax: ['y = binopdf(x,n,p)'], seealso: ['pdf', 'binoinv', 'binocdf', 'binofit'] },
    poisspdf: { summary: 'Computes the Poisson probability density function at each of the values in x using the rate parameters in lambda.', syntax: ['y = poisspdf(x,lambda)'], seealso: ['pdf', 'poisscdf', 'poissinv', 'poisstat'] },
    geopdf: { summary: 'Returns the probability density function (pdf) of the geometric distribution, evaluated at each value in x using the corresponding probabilities in p.', syntax: ['y = geopdf(x,p)'], seealso: ['geocdf', 'geoinv', 'geostat', 'geornd'] },
    wblpdf: { summary: 'Returns the probability density function (pdf) of the Weibull distribution with unit parameters, evaluated at the values in x.', syntax: ['y = wblpdf(x)'], seealso: ['WeibullDistribution', 'pdf', 'wblcdf', 'wblstat'] },
    raylpdf: { summary: 'Returns the Rayleigh probability density function (pdf) with the scale parameter b, evaluated at the values in x.', syntax: ['p = raylpdf(x,b)'], seealso: ['pdf', 'raylcdf', 'raylinv', 'raylstat'] },
    normstat: { summary: 'Returns the mean and variance of the normal distribution with mean mu and standard deviation sigma.', syntax: ['[m,v] = normstat(mu,sigma)'], seealso: ['normpdf', 'normcdf', 'normrnd', 'NormalDistribution'] },
    unifstat: { summary: 'Returns the element-wise mean and variance of the continuous uniform distribution defined by the lower endpoint (minimum) a and upper endpoint (maximum) b.', syntax: ['[m,v] = unifstat(a,b)'], seealso: ['unifpdf', 'unifcdf', 'unifinv', 'unifit'] },
    tstat: "Student's t mean and variance", fstat: { summary: 'F mean and variance', syntax: [] }, lognstat: { summary: 'Lognormal mean and variance', syntax: [] }, geostat: { summary: 'Geometric mean and variance', syntax: [] },
    raylstat: { summary: 'Returns the mean for the Rayleigh distribution with the scale parameter b.', syntax: ['m = raylstat(b)'], seealso: ['raylpdf', 'raylcdf', 'raylinv', 'raylfit'] },
    evpdf: { summary: 'Returns the probability density function (pdf) of the type 1 extreme value distribution (also known as the Gumbel distribution) with a location parameter equal to 0 and a scale pa', syntax: ['p = evpdf(x)'], seealso: ['pdf', 'evcdf', 'evinv', 'evstat'] },
    gevpdf: { summary: 'Returns the probability density function (pdf) of the generalized extreme value (GEV) distribution with a shape parameter equal to 0, scale parameter equal to 1, and location para', syntax: ['p = gevpdf(x)'], seealso: ['pdf', 'gevcdf', 'gevinv', 'gevstat'] },
    gppdf: { summary: 'Returns the probability density function (pdf) of the generalized Pareto (GP) distribution with a shape parameter equal to 0, a scale parameter equal to 1, and a threshold (locati', syntax: ['p = gppdf(x)'], seealso: ['pdf', 'gpcdf', 'gpinv', 'gpstat'] },
    nbinpdf: { summary: 'Returns the negative binomial probability density function (pdf), evaluated at the values in x, using the corresponding number of successes r and the probability of success in a s', syntax: ['y = nbinpdf(x,r,p)'], seealso: ['pdf', 'nbincdf', 'nbininv', 'nbinstat'] },
    hygepdf: { summary: 'Returns the probability density function (pdf) of the hypergeometric distribution, evaluated at the values in x, using the corresponding size of the population m, the number of it', syntax: ['p = hygepdf(x,m,k,n)'], seealso: ['pdf', 'hygecdf', 'hygeinv', 'hygestat'] },
    ncx2pdf: { summary: 'Returns the noncentral chi-square probability density function (pdf) with nu degrees of freedom and the noncentrality parameter delta, evaluated at the values in x.', syntax: ['p = ncx2pdf(x,nu,delta)'], seealso: ['pdf', 'ncx2cdf', 'ncx2inv', 'ncx2stat'] },
    ncfpdf: { summary: 'Returns the noncentral F probability density function (pdf) with nu1 numerator degrees of freedom, nu2 denominator degrees of freedom, and the noncentrality parameter delta, evalu', syntax: ['p = ncfpdf(x,nu1,nu2,delta)'], seealso: ['pdf', 'ncfcdf', 'ncfinv', 'ncfstat'] },
    nctpdf: { summary: 'Returns the noncentral t probability density function (pdf) with nu degrees of freedom and the noncentrality parameter delta, evaluated at the values in x.', syntax: ['p = nctpdf(x,nu,delta)'], seealso: ['pdf', 'nctcdf', 'nctinv', 'nctstat'] },
    expfit: { summary: 'Returns the maximum likelihood estimates (MLEs) of the mean parameter mu of the exponential distribution, given the sample data in x.', syntax: ['pHat = expfit(x)'], seealso: ['mle', 'explike', 'exppdf', 'expcdf'] },
    binofit: { summary: 'Returns the maximum likelihood estimates (MLEs) of the probability of success in a given binomial trial based on the number of successes r observed in n independent trials.', syntax: ['pHat = binofit(r,n)'], seealso: ['mle', 'binopdf', 'binocdf', 'binoinv'] },
    lognfit: { summary: 'Returns unbiased estimates of lognormal distribution parameters, given the sample data in x.', syntax: ['pHat = lognfit(x)'], seealso: ['mle', 'lognlike', 'lognpdf', 'logncdf'] },
    mvnpdf: { summary: 'Returns an n-by-1 vector y containing the probability density function (pdf) values for the d-dimensional multivariate normal distribution with zero mean and identity covariance m', syntax: ['y = mvnpdf(X)'], seealso: ['mvncdf', 'mvnrnd', 'normpdf'] },
    ecdf: { summary: 'Returns the empirical cumulative distribution function f, evaluated at x, using the data in y.', syntax: ['ecdf( ___ )'], seealso: ['cdfplot', 'ecdfhist', 'EmpiricalDistribution'] },
    betafit: { summary: 'Returns the maximum likelihood estimates (MLEs) of the beta distribution parameters a and b, given the data in x.', syntax: ['pHat= betafit(x)'], seealso: ['mle', 'betapdf', 'betainv', 'betastat'] },
    nanmean: { summary: 'Mean ignoring NaN values', syntax: ['m = nanmean(x)'], seealso: ['mean', 'nanmedian', 'nanstd'] },
    nanmedian: { summary: 'Median ignoring NaN values', syntax: ['m = nanmedian(x)'], seealso: ['median', 'nanmean'] },
    range: { summary: 'Returns the difference between the maximum and minimum values of sample data in X.', syntax: ['y = range(X)'], seealso: ['std', 'iqr', 'mad'] },
    pdist: { summary: 'Returns the Euclidean distance between pairs of observations in X.', syntax: ['D = pdist(X)'], seealso: ['cluster', 'clusterdata', 'cmdscale', 'cophenet'] },
    tiedrank: { summary: 'Returns the rank of each value in X.', syntax: ['[R,tieadj] = tiedrank(X)'], seealso: ['ansaribradley', 'corr', 'partialcorr', 'ranksum'] },
    tabulate: { summary: 'Displays a frequency table of the data in the vector x.', syntax: ['tabulate(x)'], seealso: ['pareto', 'histogram', 'bar', 'grpstats'] },
    geoinv: { summary: 'Returns the inverse cumulative distribution function (icdf) of the geometric distribution at each value in y using the corresponding probabilities in p.', syntax: ['x = geoinv(y,p)'], seealso: ['geocdf', 'geopdf', 'geostat', 'geornd'] },
    ff2n: { summary: 'Returns a 2n-by-n numeric matrix dFF2 containing the treatments of a full factorial design for n two-level factors.', syntax: ['dFF2 = ff2n(n)'], seealso: ['fullfact', 'fracfact', 'fracfactgen', 'hadamard'] },
    combnk: { summary: 'All combinations of n elements taken k at a time', syntax: ['C = combnk(v,k)'], seealso: ['nchoosek', 'perms'] },
    explike: { summary: 'Returns the exponential negative loglikelihood of the parameter mu, given the sample data x.', syntax: ['nlogL = explike(mu,x)'], seealso: ['expcdf', 'exppdf', 'expstat', 'expfit'] },
    unidpdf: { summary: 'Returns the probability density function (pdf) of the discrete uniform distribution with the maximum value n, evaluated at the values in x.', syntax: ['p = unidpdf(x,n)'], seealso: ['pdf', 'unidcdf', 'unidinv', 'unidstat'] },
    unidinv: { summary: 'Returns the inverse cumulative distribution function (icdf) of the discrete uniform distribution with the maximum values in n, evaluated at the probability values in p.', syntax: ['x = unidinv(p,n)'], seealso: ['icdf', 'unidcdf', 'unidpdf', 'unidstat'] },
    regress: { summary: 'Returns a vector b of coefficient estimates for a multiple linear regression of the responses in vector y on the predictors in matrix X.', syntax: ['b = regress(y,X)'], seealso: ['LinearModel', 'fitlm', 'stepwiselm', 'mvregress'] },
    glmfit: { summary: 'Returns a vector b of coefficient estimates for a generalized linear regression model of the responses in y on the predictors in X, using the distribution distr.', syntax: ['b = glmfit(X,y,distr)'], seealso: ['glmval', 'regress', 'regstats', 'GeneralizedLinearModel'] },
    makedist: { summary: 'Creates a probability distribution object for the distribution distname, using the default parameter values.', syntax: ['pd = makedist(distname)'], seealso: ['fitdist'] },
    confusionmat: { summary: 'Returns the confusion matrix C determined by the known and predicted groups in group and grouphat, respectively.', syntax: ['C = confusionmat(group,grouphat)'], seealso: ['categories', 'crosstab', 'confusionchart'] },
    mahal: { summary: 'Returns the squared Mahalanobis distance of each observation in Y to the reference samples in X.', syntax: ['d2 = mahal(Y,X)'], seealso: ['pdist', 'pdist2', 'mahal', 'mahal'] },
    pcares: { summary: 'Returns the residuals from a principal components analysis of X using ndim principal components.', syntax: ['residuals = pcares(X,ndim)'], seealso: ['pca', 'pcacov', 'ppca', 'biplot'] },
    ksdensity: { summary: 'Computes a probability density estimate of the sample in data vector x.', syntax: ['[f,xi] = ksdensity(x)'], seealso: ['histogram', 'ecdf', 'fitdist'] },
    nlinfit: { summary: 'Estimates coefficients of a nonlinear regression function using least squares.', syntax: ['beta = nlinfit(X,y,modelfun,beta0)'], seealso: ['lsqcurvefit', 'nlpredci', 'nlintool', 'regress'] },
    procrustes: { summary: 'Compares two shapes using a Procrustes analysis.', syntax: ['d = procrustes(X,Y)'], seealso: ['cmdscale'] },
    canoncorr: { summary: 'Computes sample canonical correlations between the columns of X and Y.', syntax: ['[A,B,r] = canoncorr(X,Y)'], seealso: ['corr', 'partialcorr', 'manova1'] },
    nnmf: { summary: 'Factors matrix A into nonneg matrices W (n-by-k) and H (k-by-m) by alternating least squares.', syntax: ['[W,H] = nnmf(A,k)'], seealso: ['pca', 'svd', 'factoran'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Symbolic Math Toolbox, extracted from symbolic.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_SYMBOLIC: Record<string, HelpEntry | string> = {
    argnames: { summary: 'Return input variables of a symbolic function', syntax: ['args = argnames(f)'], seealso: ['formula', 'syms', 'symvar', 'symfun'] },
    bernstein: { summary: 'Bernstein polynomial approximation', syntax: ['bernstein(f,n,t)'], seealso: ['bernsteinMatrix', 'symsum', 'nchoosek'] },
    cell2sym: { summary: 'Convert cell array to symbolic array', syntax: ['S = cell2sym(C)'], seealso: ['sym2cell', 'cell2mat', 'num2cell'] },
    charToFunction: { summary: 'Convert function name string to function handle', syntax: ['f = charToFunction(name)'], seealso: ['str2sym', 'matlabFunction'] },
    dsolve: { summary: 'Solve ordinary differential equations symbolically', syntax: ['S = dsolve(eqn)'], seealso: ['odeToVectorField', 'simplify', 'solve'] },
    eliminate: { summary: 'Eliminate variables from a system of polynomial equations', syntax: ['expr = eliminate(eqns,vars)'], seealso: ['gbasis', 'solve'] },
    findSymType: { summary: 'Find subexpressions of a given symbolic type', syntax: ['X = findSymType(symObj,type)'], seealso: ['hasSymType', 'isSymType', 'symType'] },
    fourier: { summary: 'Symbolic Fourier transform', syntax: ['FT = fourier(f)'], seealso: ['ifourier', 'laplace', 'ztrans'] },
    functionalDerivative: { summary: 'Functional derivative of a symbolic functional', syntax: ['G = functionalDerivative(f,y)'], seealso: ['diff', 'dsolve', 'int'] },
    has: { summary: 'Check if symbolic expression contains a subexpression', syntax: ['has(expr,subexpr)'], seealso: ['subs', 'subexpr', 'hasSymType'] },
    hasSymType: { summary: 'Check if expression contains a specific symbolic type', syntax: ['tf = hasSymType(expr,type)'], seealso: ['isSymType', 'findSymType', 'symType'] },
    htrans: { summary: 'Symbolic Hilbert transform', syntax: ['F = htrans(f,x)'], seealso: ['ihtrans', 'fourier'] },
    hypergeom: { summary: 'Generalized hypergeometric function', syntax: ['F = hypergeom(n,d,z)'], seealso: ['int', 'series'] },
    ifourier: { summary: 'Symbolic inverse Fourier transform', syntax: ['ifourier(F)'], seealso: ['fourier', 'ilaplace', 'iztrans'] },
    ihtrans: { summary: 'Symbolic inverse Hilbert transform', syntax: ['f = ihtrans(H)'], seealso: ['htrans', 'fourier', 'ifourier'] },
    ilaplace: { summary: 'Symbolic inverse Laplace transform', syntax: ['f = ilaplace(F)'], seealso: ['laplace', 'fourier', 'iztrans', 'ztrans'] },
    isCondition: { summary: 'Check if symbolic expression is a relational condition', syntax: ['tf = isCondition(expr)'], seealso: ['isAlways', 'isSymType'] },
    isDistinctVariable: { summary: 'Check if symbolic variables are distinct', syntax: ['tf = isDistinctVariable(x,y)'], seealso: ['symvar', 'isVariable'] },
    isSymType: { summary: 'Check if symbolic object is of a given type', syntax: ['TF = isSymType(symObj,type)'], seealso: ['hasSymType', 'findSymType', 'symType'] },
    isVariable: { summary: 'Check if symbolic expression is a single variable', syntax: ['tf = isVariable(expr)'], seealso: ['symvar', 'isDistinctVariable', 'isSymType'] },
    iztrans: { summary: 'Symbolic inverse Z-transform', syntax: ['iztrans(F)'], seealso: ['ztrans', 'laplace', 'ilaplace'] },
    laplace: { summary: 'Symbolic Laplace transform', syntax: ['F = laplace(f)'], seealso: ['ilaplace', 'fourier', 'ztrans'] },
    mapSymType: { summary: 'Apply function to subexpressions of a given symbolic type', syntax: ['X = mapSymType(symObj,type,func)'], seealso: ['findSymType', 'isSymType', 'symType'] },
    matlabFunction: { summary: 'Convert symbolic expression to MATLAB function handle', syntax: ['ht = matlabFunction(f)'], seealso: ['ccode', 'fortran', 'daeFunction'] },
    odeToVectorField: { summary: 'Convert higher-order ODE to first-order system', syntax: ['V = odeToVectorField(eqn1,...,eqnN)'], seealso: ['dsolve', 'matlabFunction', 'ode45'] },
    pade: { summary: 'Padé approximant of a symbolic expression', syntax: ['pade(f,var)'], seealso: ['series', 'taylor'] },
    partfrac: { summary: 'Partial fraction decomposition', syntax: ['partfrac(expr,var)'], seealso: ['children', 'coeffs', 'collect', 'ilaplace'] },
    piecewise: { summary: 'Create symbolic piecewise expression', syntax: ['pw = piecewise(cond1,val1,cond2,val2,...)'], seealso: ['heaviside', 'dirac', 'assume'] },
    poles: { summary: 'Find poles of a symbolic expression', syntax: ['P = poles(f,var)'], seealso: ['limit', 'partfrac', 'vpasolve'] },
    polynomialDegree: { summary: 'Degree of a symbolic polynomial', syntax: ['polynomialDegree(p)'], seealso: ['coeffs', 'polynomialReduce'] },
    polynomialReduce: { summary: 'Reduce polynomial by a set of divisor polynomials', syntax: ['r = polynomialReduce(p,d)'], seealso: ['eliminate', 'gbasis', 'polynomialDegree'] },
    quorem: { summary: 'Quotient and remainder of symbolic polynomial division', syntax: ['[Q,R] = quorem(A,B,var)'], seealso: ['deconv', 'mod', 'rem'] },
    rewrite: { summary: 'Rewrite symbolic expression in terms of another function', syntax: ['R = rewrite(expr,target)'], seealso: ['simplify', 'combine', 'expand'] },
    series: { summary: 'Puiseux series expansion of a symbolic expression', syntax: ['series(f,var)'], seealso: ['pade', 'taylor', 'limit'] },
    str2sym: { summary: 'Convert string to symbolic expression', syntax: ['str2sym(symstr)'], seealso: ['sym', 'syms', 'subs', 'vpa'] },
    subexpr: { summary: 'Rewrite expression by extracting common subexpression', syntax: ['[r,sigma] = subexpr(expr)'], seealso: ['simplify', 'subs', 'children'] },
    sym2cell: { summary: 'Convert symbolic array to cell array', syntax: ['C = sym2cell(S)'], seealso: ['cell2sym', 'cell2mat', 'num2cell'] },
    symFunType: { summary: 'Return symbolic function type identifier', syntax: ['t = symFunType(f)'], seealso: ['symType', 'isSymType', 'findSymType'] },
    symType: { summary: 'Return the symbolic type of an expression', syntax: ['s = symType(symObj)'], seealso: ['isSymType', 'hasSymType', 'findSymType'] },
    symfalse: { summary: 'Symbolic logical false constant', syntax: ['symfalse'], seealso: ['symtrue', 'isAlways', 'and', 'or'] },
    symfun: { summary: 'Create a symbolic function with explicit formula and variables', syntax: ['f = symfun(expr,vars)'], seealso: ['syms', 'sym', 'argnames', 'formula'] },
    symtrue: { summary: 'Symbolic logical true constant', syntax: ['symtrue'], seealso: ['symfalse', 'isAlways', 'and', 'or'] },
    texlabel: { summary: 'Convert symbolic expression to TeX string for plot labels', syntax: ['str = texlabel(expr)'], seealso: ['latex', 'title', 'xlabel'] },
    vpaintegral: { summary: 'Numerically integrate using variable-precision arithmetic', syntax: ['vpaintegral(f,a,b)'], seealso: ['int', 'integral', 'vpa', 'digits'] },
    vpasum: { summary: 'Sum series using variable-precision arithmetic', syntax: ['S = vpasum(f,x,a,b)'], seealso: ['symsum', 'vpa', 'sum'] },
    ztrans: { summary: 'Symbolic Z-transform', syntax: ['fz = ztrans(f)'], seealso: ['iztrans', 'laplace', 'fourier'] },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Text Analytics Toolbox, extracted from textanalytics.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_TEXTANALYTICS: Record<string, HelpEntry | string> = {
    tokenizedDocument: {
      summary: 'Array of tokenized documents',
      syntax: ['documents = tokenizedDocument(str)'],
      seealso: ['bagOfWords', 'removeStopWords', 'tfidf', 'fitlda'],
    },
    removeStopWords: {
      summary: 'Remove stop words from tokenized documents',
      syntax: ['documents = removeStopWords(documents)'],
      seealso: ['tokenizedDocument', 'bagOfWords', 'normalizeWords'],
    },
    bagOfWords: {
      summary: 'Bag-of-words model',
      syntax: ['bag = bagOfWords(documents)'],
      seealso: ['tokenizedDocument', 'tfidf', 'fitlda', 'removeStopWords'],
    },
    tfidf: {
      summary: 'TF-IDF matrix',
      syntax: ['M = tfidf(bag)'],
      seealso: ['bagOfWords', 'fitlda', 'tokenizedDocument'],
    },
    fitlda: {
      summary: 'Fit latent Dirichlet allocation (LDA) topic model',
      syntax: ['mdl = fitlda(bag,numTopics)'],
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
      seealso: ['uavBankAngle', 'uavDubinsConnection'],
    },
    uavFlightPathAngle: {
      summary: 'Flight path angle and heading from NED velocity vector',
      syntax:  ['angles = uavFlightPathAngle(nedVelocity)'],
      seealso: ['uavGroundSpeed', 'fixedwing'],
    },
    uavGroundSpeed: {
      summary: 'UAV ground velocity (NED) from airspeed, heading, flight-path angle, and wind',
      syntax:  ['vg = uavGroundSpeed(airspeed, heading, flightPathAngle, windNED)'],
      seealso: ['uavFlightPathAngle', 'uavMinTurningRadius'],
    },
    uavBankAngle: {
      summary: 'Required bank angle for a coordinated level turn at given airspeed and radius',
      syntax:  ['phi = uavBankAngle(airspeed, turnRadius)'],
      seealso: ['uavMinTurningRadius', 'uavDubinsConnection'],
    },
    uavCrossTrackError: {
      summary: 'Perpendicular distance (cross-track error) from a 3-D point to a path segment',
      syntax:  ['cte = uavCrossTrackError(p1, p2, pos)'],
      seealso: ['uavWaypointFollower', 'uavPathManager'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Computer Vision Toolbox, extracted from vision.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_VISION: Record<string, HelpEntry | string> = {
    detectHarrisFeatures: {
      summary: 'Detect Harris corners in a grayscale image',
      syntax: ['corners = detectHarrisFeatures(I)'],
      seealso: ['detectFASTFeatures', 'extractFeatures', 'matchFeatures', 'corner'],
    },
    detectFASTFeatures: {
      summary: 'Detect FAST corners in a grayscale image',
      syntax: ['corners = detectFASTFeatures(I)'],
      seealso: ['detectHarrisFeatures', 'extractFeatures', 'matchFeatures'],
    },
    extractFeatures: {
      summary: 'Extract feature descriptors from an image at keypoint locations',
      syntax: ['[features,validPts] = extractFeatures(I,pts)'],
      seealso: ['detectHarrisFeatures', 'detectFASTFeatures', 'matchFeatures'],
    },
    matchFeatures: {
      summary: 'Find putative correspondences between two sets of feature descriptors',
      syntax: ['indexPairs = matchFeatures(features1,features2)'],
      seealso: ['extractFeatures', 'estimateFundamentalMatrix', 'detectHarrisFeatures'],
    },
    estimateFundamentalMatrix: {
      summary: 'Estimate fundamental matrix from point correspondences',
      syntax: ['F = estimateFundamentalMatrix(pts1,pts2)'],
      seealso: ['matchFeatures', 'extractFeatures', 'estimateEssentialMatrix'],
    },
  };

// ─────────────────────────────────────────────────────────────────────────────
// Help entries for the Wavelet Toolbox, extracted from wavelet.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).

export const HELP_WAVELET: Record<string, HelpEntry | string> = {
    dct: { summary: 'Discrete cosine transform', syntax: ['y = dct(x)'], seealso: ['idct', 'fft'] },
    dwt: { summary: 'Single-level 1-D discrete wavelet transform', syntax: ['[cA,cD] = dwt(x,wname)'], seealso: ['idwt', 'wavedec'] },
    wavedec: { summary: 'Multilevel 1-D wavelet decomposition', syntax: ['[c,l] = wavedec(x,n,wname)'], seealso: ['waverec', 'dwt', 'detcoef'] },
    haart: { summary: '1-D Haar discrete wavelet transform', syntax: ['[a,d] = haart(x)'], seealso: ['ihaart', 'ihaart2', 'haart2'] },
    ihaart2: { summary: 'Inverse 2-D Haar discrete wavelet transform', syntax: ['xrec = ihaart2(a,h,v,d)'], seealso: ['haart', 'ihaart', 'haart2'] },
    detcoef: { summary: 'Extract detail coefficients from wavelet decomposition', syntax: ['D = detcoef(C,L)'], seealso: ['appcoef', 'wavedec'] },
    dyaddown: { summary: 'Dyadic downsampling', syntax: ['Y = dyaddown(X)'], seealso: ['dyadup'] },
    qorthwavf: { summary: 'Kingsbury Q-shift filters for complex dual-tree transform', syntax: ['[LoDa,LoDb,HiDa,HiDb,LoRa,LoRb,HiRa,HiRb] = qorthwavf(num)'], seealso: ['qbiorthfilt', 'dualtree'] },
    biorwavf: { summary: 'Biorthogonal wavelet filter pair (reconstruction and decomposition)', syntax: ['[RF,DF] = biorwavf(wname)'], seealso: ['biorfilt', 'waveinfo'] },
    biorfilt: { summary: 'Biorthogonal wavelet filters (four-filter bank)', syntax: ['[LoD,HiD,LoR,HiR] = biorfilt(DF,RF)'], seealso: ['biorwavf', 'orthfilt'] },
  };

