// Help entries for the Financial Instruments Toolbox, extracted from fininst.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

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
