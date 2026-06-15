// Help entries for the Phased Array System Toolbox, extracted from phased.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

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
