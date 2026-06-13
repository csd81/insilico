// Help entries for the Risk Management Toolbox, extracted from risk.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

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
