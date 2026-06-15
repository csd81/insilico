/**
 * Base/core builtin triage metadata — explicit classification, NOT inferred from name scans.
 *
 * The `base-audit` tool reads this to bucket the ~1300 base builtins so coverage is judged by
 * risk + contract relevance, not by a raw reference percentage (most primitives are exercised
 * indirectly and never appear as a named token). Functions absent here are reported as
 * `uncategorized` — the triage backlog. Grow this file as functions are triaged.
 *
 * bucket:
 *   contract-core        part of the declared computational contract; must have direct or
 *                        strong-workflow (indirect) coverage.
 *   needs-oracle         unvalidated and risk-relevant (shape/N-D/sparse/complex/multi-output/
 *                        non-unique/edge behavior) — should get an oracle/invariant case.
 *   ts-only-ok           browser/graphics/VFS/error behavior MATLAB has no opinion on — TS-only.
 *   defer                real but low priority; revisit if course-driven.
 *   out-of-scope         low-value breadth: candidate to move to a toolbox, quarantine, or delete.
 *   alias-helper         compatibility alias or thin wrapper of another (covered) builtin.
 *
 * validation (how it is/should be checked): direct | indirect | invariant | ts-only | none.
 * The audit derives whether a function is *currently* directly referenced; `validation` here is
 * the intended/declared mode (e.g. mldivide is `indirect` — exercised by `\`, never named).
 */
export type Bucket = 'contract-core' | 'needs-oracle' | 'ts-only-ok' | 'defer' | 'out-of-scope' | 'alias-helper';
export type Validation = 'direct' | 'indirect' | 'invariant' | 'ts-only' | 'none';
export interface BaseMeta { bucket: Bucket; validation: Validation; domain?: string; note?: string; }

const cc = (validation: Validation, domain: string): BaseMeta => ({ bucket: 'contract-core', validation, domain });

const CONTRACT_CORE: Record<string, BaseMeta> = {
  // ── contract-core: array construction ──
  zeros: cc('direct', 'core-language'), ones: cc('direct', 'core-language'),
  eye: cc('direct', 'core-language'), diag: cc('direct', 'core-language'),
  repmat: cc('direct', 'core-language'), reshape: cc('direct', 'core-language'),
  cat: cc('direct', 'core-language'),
  // ── contract-core: indexing / shape ──
  size: cc('direct', 'core-language'), numel: cc('direct', 'core-language'),
  length: cc('direct', 'core-language'), squeeze: cc('direct', 'core-language'),
  permute: cc('direct', 'core-language'),
  // ── contract-core: reductions ──
  sum: cc('direct', 'core-language'), prod: cc('direct', 'core-language'),
  min: cc('direct', 'core-language'), max: cc('direct', 'core-language'),
  mean: cc('direct', 'statistics'), std: cc('direct', 'statistics'), var: cc('direct', 'statistics'),
  // ── contract-core: linear algebra ──
  mldivide: cc('indirect', 'linear-algebra'),   // exercised by the `\` operator, never named
  inv: cc('direct', 'linear-algebra'), det: cc('direct', 'linear-algebra'),
  rank: cc('direct', 'linear-algebra'), null: cc('direct', 'linear-algebra'),
  orth: cc('direct', 'linear-algebra'), eig: cc('invariant', 'linear-algebra'),
  svd: cc('invariant', 'linear-algebra'), qr: cc('invariant', 'linear-algebra'),
  lu: cc('invariant', 'numerical-linear-algebra'), chol: cc('direct', 'linear-algebra'),
  // ── contract-core: sparse ──
  sparse: cc('direct', 'numerical-linear-algebra'), full: cc('direct', 'numerical-linear-algebra'),
  speye: cc('direct', 'numerical-linear-algebra'), spdiags: cc('direct', 'numerical-linear-algebra'),
  nnz: cc('direct', 'numerical-linear-algebra'),
  // ── contract-core: complex / elementary math ──
  sqrt: cc('direct', 'complex-arithmetic'), log: cc('direct', 'complex-arithmetic'),
  exp: cc('direct', 'complex-arithmetic'), sin: cc('direct', 'core-language'),
  cos: cc('direct', 'core-language'), tan: cc('direct', 'core-language'),
  abs: cc('direct', 'complex-arithmetic'), angle: cc('direct', 'complex-arithmetic'),
  real: cc('direct', 'complex-arithmetic'), imag: cc('direct', 'complex-arithmetic'),
  conj: cc('direct', 'complex-arithmetic'),
  // ── contract-core: polynomial / numerical ──
  polyfit: cc('direct', 'approximation'), polyval: cc('direct', 'approximation'),
  roots: cc('direct', 'approximation'), interp1: cc('direct', 'approximation'),
  integral: cc('direct', 'numerical-methods'), fzero: cc('direct', 'nonlinear-systems'),
  ode45: cc('direct', 'numerical-ode'),
};

// ── Pass 1 (classification only, no runtime change): assign obvious low-risk buckets. ──
// Risky/unclear functions (shape/N-D/sparse/complex/multi-output/non-unique/special functions)
// are intentionally left out → they surface as `uncategorized` (the needs-oracle pass-2 queue).
const names = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);
const bulk = (bucket: Bucket, validation: Validation, list: string): Record<string, BaseMeta> =>
  Object.fromEntries(names(list).map((n) => [n, { bucket, validation }]));
const bulkD = (bucket: Bucket, validation: Validation, domain: string, list: string): Record<string, BaseMeta> =>
  Object.fromEntries(names(list).map((n) => [n, { bucket, validation, domain }]));

// ts-only-ok: MATLAB oracle is the wrong validator (graphics/FigureSpec, VFS/file, display/format,
// argument-validation guards, UI, and RNG — random streams aren't reproducible against MATLAB).
const TS_ONLY = `
GraphPlot RandStream abyss addpoints alpha alphamap animatedline annotation area assert autumn
axis bar bar3 bar3h barh beep binscatter blanks bone box boxchart boxplot brighten bubblechart
bubblechart3 camlight caxis celldisp cla clc clearpoints clf clim close cmap2gray colorbar
colormap colororder comet comet3 compass compassplot coneplot contour contour3 contourc contourf
contourslice cool copper csvread csvwrite cylinder daspect delete dir disp display dlmread dlmwrite
doc donutchart drawnow edit error errorbar etreeplot eval evalc exist ezcontour ezcontourf ezmesh
ezmeshc ezplot ezplot3 ezpolar ezsurf ezsurfc fclose fcontour feather feof fgetl fgets figure
fileparts filesep fill fill3 fimplicit fimplicit3 flag fmesh fontname fontsize fopen format fplot
fplot3 fpolarplot fprintf fread frewind fscanf fseek fsurf ftell fullfile fwrite gca gcf geobasemap
geobubble geolimits geoplot geoscatter gray grid gtext heatmap help hex2rgb highlight hist histogram
histogram2 hold hot hsv hsv2rgb im2gray image imagesc importdata input inputname int2str jet
jsondecode jsonencode lasterr lasterror legend lighting line lines linkaxes load loglog lookfor ls
mat2str material mesh meshc meshz mustBeColumn mustBeFinite mustBeFloat mustBeGreaterThan
mustBeGreaterThanOrEqual mustBeInRange mustBeInteger mustBeLessThan mustBeLessThanOrEqual mustBeMatrix
mustBeMember mustBeNegative mustBeNonNan mustBeNonempty mustBeNonnegative mustBeNonpositive
mustBeNonzero mustBeNonzeroLengthText mustBeNumeric mustBeNumericOrLogical mustBePositive mustBeReal
mustBeRow mustBeScalarOrEmpty mustBeSorted mustBeText mustBeTextScalar mustBeVector nargchk narginchk
nargoutchk nebula nexttile num2str orderedcolors parallelplot pareto parula patch pathsep pause
pbaspect pcolor pie pie3 piechart pink plot plot3 plotmatrix polaraxes polarbubblechart
polarhistogram polarplot polarscatter prism quiver quiver3 rand randi randn randperm randsample rat
rats readcell readmatrix readtable readtimetable readvars rectangle rethrow rgb2gray rgb2hex rgb2hsv
rgbplot ribbon rlim rng rtickangle rticklabels rticks save scatter scatter3 semilogx semilogy set
sgtitle shading sky slice sphere sprand sprandn sprandsym spring sscanf stackedplot stairs stem stem3
stream2 stream3 streamline subplot subtitle summer surf surface surfc surfl surfnorm swarmchart
swarmchart3 tetramesh text textscan thetalim thetaticklabels thetaticks throw tiledlayout title
treelayout treeplot trimesh triplot trisurf turbo type useToolbox validateattributes ver view
violinplot voronoi warning waterfall which who whos winter writecell writematrix writetable xlabel
xlim xline xlsread xscale xtickangle xtickformat xticklabels xticks ylabel ylim yline yscale
ytickangle ytickformat yticklabels yticks yyaxis zlabel zlim zscale ztickangle ztickformat
zticklabels zticks`;

// alias-helper: compatibility wrappers / deprecated names that delegate to a covered primitive.
const ALIAS = `cholinc colmmd dblquad dsearch findstr flipdim luinc qmr quad quad2d quadgk quadl
quadv reallog realpow realsqrt strvcat symmmd triplequad`;

// defer: real MATLAB-ish but not current priority (table/timetable, categorical, datetime/duration,
// graph-object mutation, triangulation/polyshape geometry ecosystem, timing).
const DEFER = `NaT addboundary addcats addedge addnode addtodate addvars alphaShape alphaSpectrum
alphaTriangulation array2table barycentricToCartesian boundaryFacets boundingbox cartesianToBarycentric
categorical categories cell2table centroid circumcenter clock convexHull countcats cputime
criticalAlpha date datenum datestr datetime datevec day days delaunayTriangulation digraph duration
edgeAttachments edges entries eomday etime faceNormal featureEdges findgroups flipedge freeBoundary
graph groupcounts groupsummary head holes hour hours inShape incenter innerjoin isInterior isbetween
iscategorical iscategory isdatetime isduration isinterior isnat istable istabular istimetable join
labeledge labelnode mergecats mergevars milliseconds minute minutes month movevars nearestNeighbor now
nsidedpoly numEntries numRegions numboundaries numsides outerjoin overlaps perimeter pointLocation
polybuffer polyshape regions removecats removevars renamecats renamevars reordercats reordernodes
rmboundary rmedge rmholes rmnode rmslivers rotate rowfun second seconds sortboundaries sortregions
struct2table subtract summary surfaceArea table table2array table2cell table2struct tail tic timeit
timetable toc today translate triangulation varfun vertexAttachments vertexNormal voronoiDiagram
weekday year years ymd`;

// out-of-scope-candidate: NOT removed — flagged for review. Non-MATLAB / pseudo-MATLAB / internal.
const OUT_OF_SCOPE = `abort inline printf size_equal`;

export const BASE_BUCKETS: Record<string, BaseMeta> = {
  ...CONTRACT_CORE,
  ...bulk('ts-only-ok', 'ts-only', TS_ONLY),
  ...bulk('alias-helper', 'none', ALIAS),
  ...bulk('defer', 'none', DEFER),
  ...bulk('out-of-scope', 'none', OUT_OF_SCOPE),

  // ── Pass 1.5: backfill the 203 already-oracle-referenced base builtins (validation:direct). ──
  // No tests/runtime change — just records that these are already covered, so they leave the
  // `uncategorized` pool and stop polluting the needs-oracle (pass-2) queue.
  ...bulkD('contract-core', 'direct', 'complex-arithmetic', 'acos acosd asin atan2 atand cosd expm1 hypot log2 sind'),
  ...bulkD('contract-core', 'direct', 'core-language', 'Inf NaN all any blkdiag ceil char circshift conv conv2 cross cumprod cumsum cumtrapz deconv diff dot double eps false fix flip fliplr flipud floor gradient inf intersect isempty isinf ismember isnan kron linspace meshgrid mod ndgrid polyder polyint rem rot90 round setdiff setxor sign sort sortrows trapz triu true unique'),
  ...bulkD('contract-core', 'direct', 'fourier', 'fft fft2 fftshift ifft'),
  ...bulkD('contract-core', 'direct', 'linear-algebra', 'cond norm pinv rref trace'),
  ...bulkD('contract-core', 'direct', 'statistics', 'median'),
  ...bulkD('defer', 'direct', 'core-language', 'dictionary'),
  ...bulkD('needs-oracle', 'direct', 'approximation', 'griddata griddedInterpolant interp2 interp3 interpft interpn makima pchip ppval scatteredInterpolant spline'),
  ...bulkD('needs-oracle', 'direct', 'calculus', 'besselj beta curl del2 divergence gamma legendre psi'),
  ...bulkD('needs-oracle', 'direct', 'core-language', 'accumarray arrayfun cellfun contains deal filter find lower matchpairs regexprep strcat strrep strsplit strtrim upper'),
  ...bulkD('needs-oracle', 'direct', 'fourier', 'xcorr'),
  ...bulkD('needs-oracle', 'direct', 'geometry', 'convhull convhulln delaunay inpolygon polyarea voronoin'),
  ...bulkD('needs-oracle', 'direct', 'graph', 'centrality conncomp degree distances maxflow minspantree shortestpath toposort'),
  ...bulkD('needs-oracle', 'direct', 'linear-algebra', 'adjoint balance charpoly cholupdate compan condest eigs expm gallery hadamard hankel hess hilb jordan ldl logm magic pascal polyeig polyvalm qz schur sqrtm svds sylvester toeplitz vander wilkinson'),
  ...bulkD('needs-oracle', 'direct', 'number-theory', 'factor factorial gcd isprime lcm nchoosek powermod primes'),
  ...bulkD('needs-oracle', 'direct', 'numerical-linear-algebra', 'bicg bicgstab cgs gmres ichol ilu lsqr minres nonzeros pcg'),
  ...bulkD('needs-oracle', 'direct', 'numerical-methods', 'integral2 residue'),
  ...bulkD('needs-oracle', 'direct', 'numerical-ode', 'bvp4c bvpinit dde23 decic deval ode113 ode15i ode15s ode23 odeset'),
  ...bulkD('needs-oracle', 'direct', 'optimization', 'fminbnd fmincon fminsearch fminunc fsolve ga intlinprog linprog lsqcurvefit lsqlin lsqnonlin quadprog'),
  ...bulkD('needs-oracle', 'direct', 'statistics', 'corrcoef cov discretize fillmissing histcounts movmean movmedian'),
  ...bulkD('needs-oracle', 'direct', 'symbolic', 'resultant simplify solve'),
  ...bulkD('ts-only-ok', 'ts-only', 'core-language', 'clear sprintf'),

  // ── Pass 2A: pagewise N-D linear algebra (validated; pagenorm 'fro' bug fixed). ──
  ...bulkD('needs-oracle', 'direct', 'numerical-linear-algebra', 'pagemtimes pagetranspose pagectranspose pagenorm'),
  ...bulkD('needs-oracle', 'invariant', 'numerical-linear-algebra', 'pageinv pagemldivide pagepinv pageeig pagesvd'),

  // ── Pass 2B: sparse structure + reordering (orderings validated by permutation invariants). ──
  ...bulkD('needs-oracle', 'direct', 'numerical-linear-algebra', 'spones spfun spalloc spconvert etree spaugment bandwidth'),
  ...bulkD('needs-oracle', 'invariant', 'numerical-linear-algebra', 'symrcm colamd amd dmperm'),

  // ── Pass 2C: N-D FFT (forward values + ifftn/ifft2 roundtrip invariants). ──
  ...bulkD('needs-oracle', 'direct', 'fourier', 'fftn ifftn ifft2 ifftshift'),

  // ── Pass 2D: dense decompositions / generalized eigenvalue edge functions (invariants). ──
  // (qz/cholupdate already bucketed in the 1.5 backfill.) gsvd is the 1-output generalized
  // singular values; the 5-output [U,V,X,C,S] CS-decomposition form is a deferred gap.
  ...bulkD('needs-oracle', 'invariant', 'numerical-linear-algebra', 'gsvd ordqz ordschur cdf2rdf rsf2csf qrupdate qrinsert qrdelete'),

  // ── Pass 2E: special functions (deterministic values). besselj/beta/gamma/legendre/psi
  // were bucketed in the 1.5 backfill; these are the rest. legendreP is Symbolic-only (absent). ──
  ...bulkD('needs-oracle', 'direct', 'calculus', 'bessely besseli besselk erf erfc erfinv erfcinv gammaln gammainc betainc betaln ellipke ellipj airy'),

  // ── Pass 2F: moving-window / cumulative reductions + binning (endpoint/dim conventions).
  // movmean/movmedian/accumarray/discretize/histcounts already bucketed in the 1.5 backfill.
  // NOTE: histcounts is validated with EXPLICIT edges only — its auto-bin-edge 'nice number'
  // rule diverges from MATLAB (counts can match but edges differ); auto-binning is not locked. ──
  ...bulkD('needs-oracle', 'direct', 'statistics', 'movsum movprod movstd movvar movmad'),
  ...bulkD('needs-oracle', 'direct', 'core-language', 'cummax cummin reverse'),

  // ── Pass 2G: integer types, casts, binary reinterpretation (MATLAB-specific semantics:
  // saturation, round-half-away, idivide modes, little-endian typecast). All match exactly. ──
  ...bulkD('needs-oracle', 'direct', 'core-language', 'int8 int16 int32 int64 uint8 uint16 uint32 uint64 single cast typecast swapbytes idivide intmin intmax flintmax isfloat isinteger isnumeric isa class'),
};
