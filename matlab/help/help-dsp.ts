// Help entries for the DSP System Toolbox, extracted from dsp.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_DSP: Record<string, HelpEntry | string> = {
    firpm: {
      summary: 'Parks-McClellan optimal equiripple FIR filter design',
      syntax: ['b = firpm(n,f,a)', 'b = firpm(n,f,a,w)', "b = firpm(n,f,a,'ftype')"],
      description: [
        "b = firpm(n,f,a) returns the coefficients of an order n FIR filter with the best approximation to the desired frequency response described by f and a.",
        'f is a vector of frequency band edges in [0,1] (Nyquist=1). a specifies the desired amplitude at each band edge (piecewise-linear).',
        'Uses the Parks-McClellan Remez exchange algorithm to find the Chebyshev equiripple solution.',
        'w optionally specifies per-band weights (default 1). Higher weight → smaller error in that band.',
      ],
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
      description: [
        'b = firls(n,f,a) designs an order n linear-phase FIR filter that minimises the weighted integral of the squared error between the desired and actual frequency responses.',
        'f and a specify band edges and desired amplitudes in [0,1]. w is per-band weight vector.',
        'Unlike firpm (equiripple), firls minimises total energy of the error — smoother but potentially larger peak error.',
      ],
      seealso: ['firpm', 'fir1', 'fir2'],
    },
    grpdelay: {
      summary: 'Group delay of digital filter',
      syntax: ['[gd,w] = grpdelay(b,a)', '[gd,w] = grpdelay(b,a,n)', '[gd,w] = grpdelay(b,a,n,whole)'],
      description: [
        'gd = grpdelay(b,a) returns the n-point (default 512) group delay of the digital filter with transfer function H(z) = B(z)/A(z).',
        'Group delay is the negative derivative of phase: gd(ω) = -dφ(ω)/dω.',
        'For a linear-phase FIR filter the group delay is constant (= (n-1)/2).',
      ],
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
      description: [
        'y = sosfilt(sos,x) filters x using the second-order section matrix sos.',
        'sos is an L×6 matrix where each row [b0 b1 b2 a0 a1 a2] defines one biquad section.',
        'More numerically stable than using single [b,a] form for high-order filters.',
      ],
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
      description: [
        '[Bz,Az] = bilinear(B,A,Fs) converts the analog prototype with transfer function B(s)/A(s) to a digital filter using the bilinear transform s = 2*Fs*(z-1)/(z+1).',
        'Fs is the sampling frequency in Hz. Use prewarped analog prototype for exact cutoff mapping.',
      ],
      seealso: ['butter', 'cheby1', 'cheby2', 'ellip', 'besself'],
    },
    besself: {
      summary: 'Bessel analog lowpass filter design',
      syntax: ['[b,a] = besself(n,Wo)', "[b,a] = besself(n,Wo,'high')"],
      description: [
        '[b,a] = besself(n,Wo) designs an n-th order analog Bessel lowpass filter with cutoff frequency Wo rad/s.',
        'Bessel filters have maximally flat group delay (linear phase) in the passband. Stopband attenuation is less steep than Butterworth/Chebyshev for the same order.',
        'Use bilinear() to convert to digital.',
      ],
      seealso: ['butter', 'cheby1', 'ellip', 'bilinear'],
    },
    decimate: {
      summary: 'Decimate signal by integer factor',
      syntax: ['y = decimate(x,r)', 'y = decimate(x,r,n)'],
      description: [
        'y = decimate(x,r) reduces the sample rate of x by the integer factor r.',
        'Applies a 30th-order anti-aliasing FIR lowpass filter with cutoff 1/r (Hamming window) before downsampling.',
        'n overrides the filter order.',
      ],
      seealso: ['interp', 'resample', 'upfirdn', 'downsample'],
    },
    // QUARANTINED: interp (see implementation note above)
    resample: {
      summary: 'Resample signal at new sample rate',
      syntax: ['y = resample(x,p,q)', 'y = resample(x,p,q,n)'],
      description: [
        'y = resample(x,p,q) resamples x at p/q times the original sample rate using polyphase filtering.',
        'Equivalent to upsampling by p, anti-alias filtering, then downsampling by q.',
      ],
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
      description: [
        'y = step(h,x) processes input x through System object h and returns output y.',
        'Works with: dsp.FIRFilter, dsp.BiquadFilter, dsp.FIRDecimator, dsp.FIRInterpolator.',
        'System objects maintain internal state between calls.',
      ],
      seealso: ['release', 'reset'],
    },
    release: {
      summary: 'Release resources and allow changes to System object property values and input characteristics',
      syntax: ['release(h)'],
      description: ['Resets internal state of DSP System object h, allowing property changes.'],
      seealso: ['step', 'reset'],
    },
  };
