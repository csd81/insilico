# 100 Cheaply-Portable, Useful MATLAB Functions

Discovery over unimplemented_functions.md. Each is a plain readable `.m` file (R2026a `exist==2`),
**≤~70 source lines**, **no heavy deps** (`.internal.`/classdef/inputParser/file-IO/datetime-obj/`feval`/`persistent`).
Excluded: GUI, ML-model objects, RNG (`*rnd`, not deterministically oracle-checkable), and
interest-rate-tree / finite-difference / instrument-framework pricers. `loc`=non-comment source lines.

| # | function | loc | description |
|---:|:---|---:|:---|
| 1 | `arcov` | 3 | Autoregressive all-pole model parameters — covariance method |
| 2 | `armcov` | 3 | Autoregressive all-pole model parameters — modified covariance method |
| 3 | `rooteig` | 3 | Frequency and power content using eigenvector method |
| 4 | `rsgenpolycoeffs` | 3 | Generator polynomial coefficients of Reed-Solomon code |
| 5 | `balreal` | 4 | Balanced state-space realization |
| 6 | `capbynormal` | 4 | Price caps using Normal or Bachelier pricing model |
| 7 | `floorbynormal` | 4 | Price floors using Normal or Bachelier pricing model |
| 8 | `pulsesep` | 4 | Separation between bilevel waveform pulses |
| 9 | `rpmfreqmap` | 4 | Frequency-RPM map for order analysis |
| 10 | `rpmordermap` | 4 | Order-RPM map for order analysis |
| 11 | `capbyblk` | 5 | Price caps using Black option pricing model |
| 12 | `dblbarrierbybls` | 5 | Price European double barrier options using Black-Scholes option pricing model |
| 13 | `depstln` | 5 | Straight-line depreciation schedule |
| 14 | `floorbyblk` | 5 | Price floors using Black option pricing model |
| 15 | `franke` | 5 | Franke's bivariate test function |
| 16 | `gram` | 5 | Controllability and observability Gramians |
| 17 | `maxassetbystulz` | 5 | Determine European rainbow option price on maximum of two risky assets using Stulz option prici |
| 18 | `minassetbystulz` | 5 | Determine European rainbow option prices on minimum of two risky assets using Stulz option pric |
| 19 | `optstockbybaw` | 5 | Calculate American options prices using Barone-Adesi and Whaley option pricing model |
| 20 | `taxedrr` | 5 | After-tax rate of return |
| 21 | `xcorr2` | 5 | 2-D cross-correlation |
| 22 | `assetbybls` | 6 | Determine price of asset-or-nothing digital options using Black-Scholes model |
| 23 | `cashbybls` | 6 | Determine price of cash-or-nothing digital options using Black-Scholes model |
| 24 | `dcmbody2stability` | 6 | Convert body frame to stability frame transformation matrix (Since R2022a) |
| 25 | `gapbybls` | 6 | Determine price of gap digital options using Black-Scholes model |
| 26 | `kruskalwallis` | 6 | Kruskal-Wallis test |
| 27 | `leapyear` | 6 | Determine leap year |
| 28 | `optstockbybjs` | 6 | Price American options using Bjerksund-Stensland 2002 option pricing model |
| 29 | `optstockbyblk` | 6 | Price options on futures and forwards using Black option pricing model |
| 30 | `optstockbybls` | 6 | Price options using Black-Scholes option pricing model |
| 31 | `optstockbyrgw` | 6 | Determine American call option prices using Roll-Geske-Whaley option pricing model |
| 32 | `supersharebybls` | 6 | Determine price of supershare digital options using Black-Scholes model |
| 33 | `tf2sos` | 6 | Convert digital filter transfer function data to second-order sections form |
| 34 | `unshiftdata` | 6 | Inverse of shiftdata |
| 35 | `ingeoquad` | 7 | True for points inside or on lat-lon quadrangle |
| 36 | `obsvf` | 7 | Compute observability staircase form |
| 37 | `peig` | 7 | Pseudospectrum using eigenvector method |
| 38 | `wenergy` | 7 | Energy for 1-D wavelet or wavelet packet decomposition |
| 39 | `dbltouchbybls` | 8 | Price double one-touch and double no-touch binary options using Black-Scholes option pricing mo |
| 40 | `geoclip` | 8 | Clip geographic shape to latitude-longitude limits or polygon (Since R2022a) |
| 41 | `lqry` | 8 | Form linear-quadratic (LQ) state-feedback regulator with output weighting |
| 42 | `mapclip` | 8 | Clip planar shape to xy-limits or polygon (Since R2022a) |
| 43 | `todecimal` | 8 | Fractional to decimal conversion |
| 44 | `toquoted` | 8 | Decimal to fractional conversion |
| 45 | `bkput` | 9 | Price European put option on bonds using Black model |
| 46 | `cftimes` | 9 | Time factors corresponding to bond cash flow dates |
| 47 | `deprdv` | 9 | Remaining depreciable value |
| 48 | `depsoyd` | 9 | Sum of years' digits depreciation |
| 49 | `geocradius` | 9 | Convert from geocentric latitude to radius of ellipsoid planet (Since R2021b) |
| 50 | `touchbybls` | 9 | Price one-touch and no-touch binary options using Black-Scholes option pricing model |
| 51 | `covar` | 10 | Output and state covariance of system driven by white noise |
| 52 | `ecef2enuv` | 10 | Rotate geocentric Earth-centered Earth-fixed vector to local east-north-up |
| 53 | `enu2ecefv` | 10 | Rotate local east-north-up vector to geocentric Earth-centered Earth-fixed |
| 54 | `flatearthpoly` | 10 | Clip polygon to world limits |
| 55 | `ned2ecefv` | 10 | Rotate local north-east-down vector to geocentric Earth-centered Earth-fixed |
| 56 | `optstocksensbybaw` | 10 | Calculate American options prices and sensitivities using Barone-Adesi and Whaley option pricin |
| 57 | `portror` | 10 | Portfolio expected rate of return |
| 58 | `qmf` | 10 | Scaling and wavelet filter |
| 59 | `thiran` | 10 | Generate fractional delay filter based on Thiran approximation |
| 60 | `thirtytwo2dec` | 10 | Thirty-second quotation to decimal |
| 61 | `augstate` | 11 | Append state vector to output vector |
| 62 | `ecef2nedv` | 11 | Rotate geocentric Earth-centered Earth-fixed vector to local north-east-down |
| 63 | `mbsconvp` | 11 | Convexity of mortgage pool given price |
| 64 | `mbswal` | 11 | Weighted average life of mortgage pool |
| 65 | `optstocksensbybls` | 11 | Determine option prices or sensitivities using Black-Scholes option pricing model |
| 66 | `pcares` | 11 | Residuals from principal component analysis |
| 67 | `changem` | 12 | Replace values in array |
| 68 | `cpndaysn` | 12 | Number of days to next coupon date |
| 69 | `cpndaysp` | 12 | Number of days since previous coupon date |
| 70 | `fnrfn` | 12 | Refine partition of form |
| 71 | `mbsdurp` | 12 | Duration of mortgage pool given price |
| 72 | `cfdates` | 13 | Cash flow dates for fixed-income security |
| 73 | `cpndaten` | 13 | Next coupon date for fixed-income security |
| 74 | `cpnpersz` | 13 | Number of days in coupon period |
| 75 | `fspl` | 13 | Free space path loss |
| 76 | `measerr` | 13 | Quality metrics of signal or image approximation |
| 77 | `oct2poly` | 13 | Convert octal number to binary coefficients |
| 78 | `pcacov` | 13 | Principal component analysis on covariance matrix |
| 79 | `sos2ss` | 13 | Convert digital filter second-order section parameters to state-space form |
| 80 | `corr2cov` | 14 | Convert standard deviation and correlation to covariance |
| 81 | `cpndatenq` | 14 | Next quasi-coupon date for fixed-income security |
| 82 | `cpndatep` | 14 | Previous coupon date for fixed-income security |
| 83 | `cpndatepq` | 14 | Previous quasi-coupon date for fixed-income security |
| 84 | `optstocksensbybjs` | 14 | Determine American option prices or sensitivities using Bjerksund-Stensland 2002 option pricing |
| 85 | `polystab` | 14 | Stabilize polynomial |
| 86 | `geoshow` | 15 | Display map latitude and longitude data |
| 87 | `initial` | 15 | System response to initial states of state-space model |
| 88 | `mapshow` | 15 | Display map data without projection |
| 89 | `rangesearch` | 15 | Find all neighbors within specified distance using input data |
| 90 | `refresh` | 15 | Resynchronize slLinearizer or slTuner interface with current model state |
| 91 | `rpmak` | 15 | Put together rational spline |
| 92 | `treeshape` | 15 | Shape of recombining binomial tree |
| 93 | `wenergy2` | 15 | Energy for 2-D wavelet decomposition |
| 94 | `berconfint` | 16 | Error probability estimate and confidence interval of Monte Carlo simulation |
| 95 | `cheb1ap` | 16 | Chebyshev Type I analog lowpass filter prototype |
| 96 | `dpcmdeco` | 16 | Decode using differential pulse code modulation |
| 97 | `ellipap` | 16 | Elliptic analog lowpass filter prototype |
| 98 | `icceps` | 16 | Inverse complex cepstrum |
| 99 | `isafin` | 16 | True if input argument is financial structure type or financial object class |
| 100 | `tf2zpk` | 16 | Convert transfer function filter parameters to zero-pole-gain form |
