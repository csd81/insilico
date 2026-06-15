// Help entries for the System Identification Toolbox, extracted from ident.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

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
