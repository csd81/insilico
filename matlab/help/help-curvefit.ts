// Help entries for the Curve Fitting Toolbox, extracted from curvefit.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

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
