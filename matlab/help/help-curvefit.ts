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
    franke: { summary: "Franke's bivariate test function", syntax: ['z = franke(x,y)'], seealso: ['peaks'], description: ['z = franke(x,y) returns the value z(i) of Franke\'s function at the site (x(i),y(i)), i=1:numel(x), with z of the same size as x and y (which must be of the same size).', 'Franke\'s function is the following weighted sum of four exponentials:', '34e−((9x−2)2+(9y−2)2)/4+34e−((9x+1)2/49+(9y+1)/10) +12e−((9x−7)2+(9y−3)2)/4−15e−((9x−4)2+(9y−7)2)'] },
    smooth: { summary: 'Smooths the response data in column vector y using a moving average filter.', syntax: ['yy = smooth(y)', 'yy = smooth(y,span)', 'yy = smooth(y,method)', 'yy = smooth(y,span,method)'], seealso: ['smoothdata', 'fit', 'sort'], description: ['yy = smooth(y) smooths the response data in column vector y using a moving average filter.', 'The first few elements of yy follow.', 'yy(1) = y(1) yy(2) = (y(1) + y(2) + y(3))/3 yy(3) = (y(1) + y(2) + y(3) + y(4) + y(5))/5 yy(4) = (y(2) + y(3) + y(4) + y(5) + y(6))/5 ...', 'Because of the way smooth handles endpoints, the result differs from the result returned by the filter function.', 'yy = smooth(y,span) sets the span of the moving average to span.'] },
    datastats: { summary: 'Returns statistics for the column vector x to the structure xds.', syntax: ['xds = datastats(x) [xds,yds] = datastats(x,y)'], seealso: ['excludedata', 'smooth'], description: ['xds = datastats(x) returns statistics for the column vector x to the structure xds. Fields in xds are listed in the table below.', 'Field| Description ---|--- num| The number of data values max| The maximum data value min| The minimum data value mean| The mean value of the data median| The median value of the data range| The range of the data std| The standard deviation of the data [xds,yds] = datastats(x,y) returns statistics for the column vectors x and y to the structures xds and yds, respectively. xds and yds contain the fields listed in the table above. x and y must be of the same size.'] },
    polyfit2: { summary: 'Polynomial curve fit (alias for polyfit with curve-fitting syntax)', syntax: ['p = polyfit2(x,y,n)'], seealso: ['polyfit', 'polyval'] },
    polyval2: { summary: 'Evaluate polynomial (alias for polyval)', syntax: ['y = polyval2(p,x)'], seealso: ['polyval', 'polyfit'] },
    rsquared: { summary: 'R-squared (coefficient of determination) of a fit', syntax: ['r2 = rsquared(y,yfit)'], seealso: ['fit', 'smooth'] },
  };
