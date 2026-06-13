/**
 * Shared oracle cases: MATLAB snippets whose selected variables are compared
 * against ground truth captured from real MATLAB (see generate.mjs → fixtures.json).
 * Keep `src` valid in BOTH real MATLAB and this interpreter.
 */
export interface OracleCase {
  name: string;
  src: string;
  vars: string[];
  /** Absolute tolerance for numeric comparison (default 1e-6). Tighten for exact
   *  arithmetic, loosen for least-squares / decomposition / ill-conditioned cases. */
  tol?: number;
  /** Coverage taxonomy tags (specific techniques), e.g. ['conditioning','mldivide'].
   *  See coverage.mjs for the report and docs/coverage-map.md for the declared areas. */
  tags?: string[];
  /** Declared curriculum level. */
  level?: 'undergrad' | 'graduate';
  /** Declared domain area (e.g. 'numerical-linear-algebra', 'optimization', 'numerical-pde'). */
  domain?: string;
}

export const CASES: OracleCase[] = [
  // ── indexing / orientation / end ──
  { name: 'colon-range', src: 'v = 1:2:9;', vars: ['v'] },
  { name: 'end-index', src: 'v = [5 6 7 8]; a = v(end); b = v(end-1);', vars: ['a', 'b'] },
  { name: 'submatrix', src: 'A = magic(4); S = A(2:3, 2:3);', vars: ['S'] },
  { name: 'logical-mask', src: 'v = [3 1 4 1 5 9 2 6]; m = v(v > 3);', vars: ['m'] },
  { name: 'linear-index-col', src: 'A = [1 2; 3 4]; x = A(:);', vars: ['x'] },
  { name: 'reshape', src: 'A = reshape(1:6, 2, 3);', vars: ['A'] },

  // ── arithmetic / broadcasting ──
  { name: 'broadcast-add', src: 'A = [1;2;3] + [10 20];', vars: ['A'] },
  { name: 'matmul', src: 'A = [1 2; 3 4]; B = A * A;', vars: ['B'] },
  { name: 'elementwise-pow', src: 'v = [1 2 3 4] .^ 2;', vars: ['v'] },
  { name: 'kron', src: 'K = kron([1 0; 0 1], [1 2; 3 4]);', vars: ['K'] },

  // ── complex ──
  { name: 'complex-mul', src: 'z = (1+2i) * (3-1i);', vars: ['z'] },
  { name: 'complex-conj-transpose', src: "A = [1+2i 3-1i]; c = A';", vars: ['c'] },
  { name: 'complex-abs', src: 'm = abs(3 + 4i);', vars: ['m'] },

  // ── linear algebra ──
  { name: 'mldivide', src: 'A = [2 1 -1; -3 -1 2; -2 1 2]; b = [8; -11; -3]; x = A\\b;', vars: ['x'] },
  { name: 'det', src: 'd = det([1 2 3; 4 5 6; 7 8 10]);', vars: ['d'] },
  { name: 'inv', src: 'B = inv([4 3; 6 3]);', vars: ['B'] },
  { name: 'eig-symmetric', src: 'e = sort(eig([2 1; 1 2]));', vars: ['e'] },
  { name: 'norm-vec', src: 'n = norm([3 4 12]);', vars: ['n'] },
  { name: 'trace-rank', src: 'A = magic(4); t = trace(A); r = rank(A);', vars: ['t', 'r'] },

  // ── reductions ──
  { name: 'sum-dim', src: 'A = [1 2; 3 4]; c = sum(A, 1); rr = sum(A, 2);', vars: ['c', 'rr'] },
  { name: 'cumsum', src: 'c = cumsum([1 2 3 4]);', vars: ['c'] },
  { name: 'minmax-idx', src: '[mn, i] = min([5 2 8 1 9]); [mx, j] = max([5 2 8 1 9]);', vars: ['mn', 'i', 'mx', 'j'] },
  { name: 'mean-std', src: 'm = mean([2 4 6 8]); s = std([2 4 6 8]);', vars: ['m', 's'] },

  // ── elementary functions ──
  { name: 'trig', src: 'y = sin(pi/6);', vars: ['y'] },
  { name: 'round-floor-ceil', src: 'a = round(2.5); b = floor(-2.5); c = ceil(2.1); d = fix(-2.7);', vars: ['a', 'b', 'c', 'd'] },
  { name: 'mod-rem', src: 'a = mod(-7, 3); b = rem(-7, 3);', vars: ['a', 'b'] },

  // ── polynomials / fitting ──
  { name: 'polyfit-line', src: 'x = [0 1 2 3 4]; y = 2*x + 1; p = polyfit(x, y, 1);', vars: ['p'] },
  { name: 'polyval', src: 'v = polyval([1 -3 2], 5);', vars: ['v'] },
  { name: 'roots', src: 'r = sort(roots([1 -3 2]));', vars: ['r'] },

  // ── nargout-dependent ──
  { name: 'sort-with-idx', src: '[s, idx] = sort([3 1 2]);', vars: ['s', 'idx'] },
  { name: 'unique', src: '[u, ia, ic] = unique([3 1 1 2 3]);', vars: ['u'] },

  // ── numerical methods (course) ──
  { name: 'newton-sqrt2', src: 'x = 1; for k = 1:20, x = x - (x^2 - 2)/(2*x); end', vars: ['x'] },
  { name: 'trapz', src: 'x = linspace(0,1,1001); y = x.^2; I = trapz(x, y);', vars: ['I'] },
  { name: 'lu-solve', src: 'A = [4 3; 6 3]; b = [10; 12]; [L,U,P] = lu(A); y = L\\(P*b); x = U\\y;', vars: ['x'] },

  // ── indexing & orientation edge cases ──
  { name: 'colmajor-flatten', src: 'A = [1 2 3; 4 5 6]; x = A(:);', vars: ['x'] },
  { name: 'linear-index-2d', src: 'A = magic(3); v = A([1 5 9]);', vars: ['v'] },
  { name: 'mask-row-orient', src: 'v = [10 20 30 40]; m = v(v > 15);', vars: ['m'] },
  { name: 'mask-col-orient', src: 'c = [1; 2; 3; 4]; m = c(c > 2);', vars: ['m'] },
  { name: 'mask-matrix-colmajor', src: 'A = [1 2; 3 4]; m = A(A > 1);', vars: ['m'] },
  { name: 'end-2d', src: 'A = magic(4); a = A(end, end); r = A(end, :); c = A(:, end);', vars: ['a', 'r', 'c'] },
  { name: 'end-arith', src: 'v = 1:10; w = v(end-2:end);', vars: ['w'] },
  { name: 'orient-row-slice', src: 'A = magic(3); r = A(2, :);', vars: ['r'] },
  { name: 'orient-col-slice', src: 'A = magic(3); c = A(:, 2);', vars: ['c'] },
  { name: 'reverse-range', src: 'v = 10:-2:0;', vars: ['v'] },

  // ── deletion & growth ──
  { name: 'delete-column', src: 'A = magic(4); A(:, 2) = [];', vars: ['A'] },
  { name: 'delete-elements', src: 'v = 1:6; v([2 4]) = [];', vars: ['v'] },
  { name: 'grow-2d', src: 'A = zeros(2, 2); A(3, 3) = 9;', vars: ['A'] },
  { name: 'grow-from-empty', src: 'v = []; v(3) = 5;', vars: ['v'] },
  { name: 'scalar-expand-colon', src: 'A = zeros(2, 3); A(:) = 7;', vars: ['A'] },

  // ── N-D arrays ──
  { name: 'nd-page-slice', src: 'A = reshape(1:24, 2, 3, 4); s = A(:, :, 2);', vars: ['s'] },
  { name: 'nd-size', src: 'A = reshape(1:24, 2, 3, 4); sz = size(A);', vars: ['sz'] },
  { name: 'nd-element', src: 'A = reshape(1:24, 2, 3, 4); x = A(1, 2, 3);', vars: ['x'] },
  { name: 'nd-permute', src: 'A = reshape(1:6, 2, 3); B = permute(A, [2 1]);', vars: ['B'] },

  // ── value-copy semantics (eval-safe; no function defs) ──
  { name: 'copy-matrix', src: 'A = [1 2 3]; B = A; B(1) = 9;', vars: ['A', 'B'] },
  { name: 'copy-struct-field', src: 's.a = 1; t = s; t.a = 2; x = s.a;', vars: ['x'] },
  { name: 'copy-cell-element', src: 'c = {5, 6}; d = c; d{1} = 9; x = c{1};', vars: ['x'] },
  { name: 'map-handle-semantics', src: "m = containers.Map('KeyType','char','ValueType','double'); m('a') = 1; n = m; n('a') = 2; x = m('a');", vars: ['x'] },
  { name: 'dict-value-semantics', src: 'd = dictionary("a", 1); e = d; e("a") = 2; x = d("a");', vars: ['x'] },

  // ── empty-matrix algebra ──
  { name: 'empty-sum', src: 's = sum([]);', vars: ['s'] },
  { name: 'empty-prod', src: 'p = prod([]);', vars: ['p'] },
  { name: 'empty-size', src: 'sz = size([]);', vars: ['sz'] },
  { name: 'empty-concat-drop-row', src: 'A = [1 2 3]; B = [A, []];', vars: ['B'] },
  { name: 'empty-concat-drop-col', src: 'A = [1; 2]; B = [A; []];', vars: ['B'] },
  { name: 'empty-length', src: 'n = length([]); m = numel([]);', vars: ['n', 'm'] },
  { name: 'empty-max', src: 'M = max([]);', vars: ['M'] },

  // ── complex elementary functions (domain transitions) ──
  { name: 'sqrt-negative', src: 'z = sqrt(-1);', vars: ['z'] },
  { name: 'sqrt-negative-real', src: 'z = sqrt(-4);', vars: ['z'] },
  { name: 'log-negative', src: 'z = log(-1);', vars: ['z'], tol: 1e-9 },
  { name: 'asin-gt1', src: 'z = asin(2);', vars: ['z'], tol: 1e-9 },
  { name: 'acos-gt1', src: 'z = acos(2);', vars: ['z'], tol: 1e-9 },
  { name: 'cube-root-negative', src: 'z = (-8)^(1/3);', vars: ['z'], tol: 1e-9 },
  { name: 'complex-matvec', src: 'y = [1+2i 3-4i] * [2; 5i];', vars: ['y'] },
  { name: 'complex-exp', src: 'z = exp(1i*pi);', vars: ['z'], tol: 1e-9 },

  // ── mldivide polymorphism (results, not algorithm choice) ──
  { name: 'mldivide-triangular', src: 'A = [2 1 1; 0 3 2; 0 0 4]; b = [5; 6; 8]; x = A\\b;', vars: ['x'], tol: 1e-9 },
  { name: 'mldivide-spd', src: 'A = [4 2; 2 3]; b = [6; 5]; x = A\\b;', vars: ['x'], tol: 1e-9 },
  { name: 'mldivide-overdetermined', src: 'A = [1 1; 1 2; 1 3]; b = [6; 0; 0]; x = A\\b;', vars: ['x'], tol: 1e-6 },
  { name: 'mldivide-multi-rhs', src: 'A = [2 1; 1 3]; B = [1 0; 0 1]; X = A\\B;', vars: ['X'], tol: 1e-9 },

  // ── decomposition invariants (convention-independent) ──
  { name: 'chol-factor', src: 'A = [4 2; 2 3]; R = chol(A);', vars: ['R'], tol: 1e-9 },
  { name: 'svd-values', src: 's = svd([1 2; 3 4; 5 6]);', vars: ['s'], tol: 1e-6 },
  { name: 'eig-values-sorted', src: 'e = sort(eig([2 -1 0; -1 2 -1; 0 -1 2]));', vars: ['e'], tol: 1e-6 },

  // ── implicit expansion (broadcasting) ──
  { name: 'broadcast-sub-colvec', src: 'A = [1 2 3; 4 5 6; 7 8 9] - [10; 20; 30];', vars: ['A'] },
  { name: 'broadcast-mul-rowcol', src: 'P = [1; 2; 3] .* [10 20];', vars: ['P'] },
  { name: 'broadcast-compare', src: 'B = [1 2 3] > [2; 2; 2];', vars: ['B'] },

  // ── sparse basics (compared against the dense full() equivalent) ──
  { name: 'sparse-construct', src: 'S = sparse([1 2 3], [1 2 3], [10 20 30]);', vars: ['S'] },
  { name: 'sparse-nnz', src: 'n = nnz(sparse([0 1 0; 2 0 0]));', vars: ['n'] },
  { name: 'sparse-speye', src: 'F = full(speye(3));', vars: ['F'] },
  { name: 'sparse-matvec', src: 'S = sparse([1 0; 0 2]); y = S * [3; 4];', vars: ['y'] },
  { name: 'sparse-solve', src: 'S = sparse([2 1; 1 3]); x = S \\ [3; 5];', vars: ['x'], tol: 1e-9 },
  { name: 'sparse-spdiags', src: 'D = spdiags([1; 2; 3], 0, 3, 3);', vars: ['D'] },

  // ── course golden scripts (end-to-end; MATLAB is the ground truth) ──
  { name: 'bisection-sqrt2', src: 'f = @(x) x.^2 - 2; a = 1; b = 2; for k = 1:60, m = (a+b)/2; if f(a)*f(m) <= 0, b = m; else, a = m; end, end; root = (a+b)/2;', vars: ['root'], tol: 1e-9 },
  { name: 'gaussian-elimination', src: 'A = [2 1 -1; -3 -1 2; -2 1 2]; b = [8; -11; -3]; x = A\\b;', vars: ['x'], tol: 1e-9 },
  { name: 'simpson-sin', src: 'n = 100; a = 0; b = pi; h = (b-a)/n; x = a:h:b; y = sin(x); S = y(1) + y(end) + 4*sum(y(2:2:end-1)) + 2*sum(y(3:2:end-2)); I = S*h/3;', vars: ['I'], tol: 1e-6 },
  { name: 'euler-exp', src: 'n = 100000; h = 1/n; y = 1; for k = 1:n, y = y + h*y; end', vars: ['y'], tol: 1e-3 },
  { name: 'secant-sqrt2', src: 'f = @(x) x.^2 - 2; x0 = 1; x1 = 2; for k = 1:30, fx0 = f(x0); fx1 = f(x1); if fx1 == fx0, break; end, x2 = x1 - fx1*(x1-x0)/(fx1-fx0); x0 = x1; x1 = x2; end; root = x1;', vars: ['root'], tol: 1e-9 },
  { name: 'cholesky-solve', src: "A = [4 2; 2 3]; b = [6; 5]; R = chol(A); y = R.'\\b; x = R\\y;", vars: ['x'], tol: 1e-9 },
  { name: 'newton-interp', src: 'x = [1 2 4]; y = [1 4 16]; n = numel(x); c = y; for j = 2:n, for i = n:-1:j, c(i) = (c(i)-c(i-1))/(x(i)-x(i-j+1)); end, end; t = 3; p = c(n); for i = n-1:-1:1, p = p*(t-x(i)) + c(i); end', vars: ['p'], tol: 1e-9 },
  { name: 'rk4-exp', src: 'f = @(t, y) y; h = 0.01; y = 1; t = 0; for k = 1:100, k1 = f(t,y); k2 = f(t+h/2, y+h/2*k1); k3 = f(t+h/2, y+h/2*k2); k4 = f(t+h, y+h*k3); y = y + h/6*(k1+2*k2+2*k3+k4); t = t + h; end', vars: ['y'], tol: 1e-6 },

  // ── quadrature & interpolation (curriculum algorithms; independently authored) ──
  { name: 'gauss2pt-quadrature', src: 'f = @(x) x.^3 + 2*x.^2 + 1; nodes = [-1/sqrt(3), 1/sqrt(3)]; I = f(nodes(1)) + f(nodes(2));', vars: ['I'], tol: 1e-9 },
  { name: 'interp1-linear-scalar', src: 'x = [0 1 2 3]; y = [0 1 4 9]; q = interp1(x, y, 1.5);', vars: ['q'], tol: 1e-9 },
  { name: 'interp1-linear-vector', src: 'x = [0 1 2 3]; y = [0 1 4 9]; q = interp1(x, y, [0.5 2.5]);', vars: ['q'], tol: 1e-9 },
  { name: 'pchip-interp', src: 'x = [0 1 2 3]; y = [0 1 4 9]; q = pchip(x, y, 1.5);', vars: ['q'], tol: 1e-6 },
  { name: 'spline-interp', src: 'x = [0 1 2 3]; y = [0 1 4 9]; q = spline(x, y, 1.5);', vars: ['q'], tol: 1e-6 },
  { name: 'polyint-definite', src: 'p = polyint([3 0 0]); v = polyval(p, 2) - polyval(p, 0);', vars: ['v'], tol: 1e-9 },

  // ── fundamentals: string / char operations (char-row & string outputs) ──
  { name: 'sprintf-int', src: "s = sprintf('%d/%d', 3, 4);", vars: ['s'] },
  { name: 'sprintf-float', src: "s = sprintf('%.2f', pi);", vars: ['s'] },
  { name: 'num2str-int', src: 's = num2str(42);', vars: ['s'] },
  { name: 'strcat-char', src: "s = strcat('foo', 'bar');", vars: ['s'] },
  { name: 'strrep', src: "s = strrep('a-b-c', '-', '+');", vars: ['s'] },
  { name: 'upper-lower', src: "a = upper('abc'); b = lower('XYZ');", vars: ['a', 'b'] },
  { name: 'regexprep-digits', src: "s = regexprep('a1b2c3', '\\d', '#');", vars: ['s'] },
  { name: 'strtrim', src: "s = strtrim('  hi  ');", vars: ['s'] },
  { name: 'fliplr-char', src: "s = fliplr('abcd');", vars: ['s'] },

  // ── fundamentals: logical & data-wrangling ──
  { name: 'find-nonzero', src: 'idx = find([0 3 0 5 0 7]);', vars: ['idx'] },
  { name: 'any-all', src: 'a = any([0 0 1]); b = all([1 1 0]);', vars: ['a', 'b'] },
  { name: 'masked-assign', src: 'A = [-1 2 -3 4]; A(A < 0) = 0;', vars: ['A'] },
  { name: 'sort-descend', src: "[s, i] = sort([3 1 2], 'descend');", vars: ['s', 'i'] },
  { name: 'sortrows-2col', src: 'B = sortrows([3 1; 1 2; 2 0]);', vars: ['B'] },
  { name: 'unique-values', src: 'u = unique([3 1 4 1 5 9 2 6]);', vars: ['u'] },
  { name: 'histcounts', src: 'nc = histcounts([1 2 2 3 3 3], 1:4);', vars: ['nc'] },
  { name: 'cumprod', src: 'c = cumprod([1 2 3 4]);', vars: ['c'] },
  { name: 'accumarray', src: 'v = accumarray([1; 2; 1; 3], [10; 20; 30; 40]);', vars: ['v'] },

  // ── fundamentals: reshape / colon tricks ──
  { name: 'repmat-tile', src: 'A = repmat([1 2], 2, 3);', vars: ['A'] },
  { name: 'circshift', src: 'v = circshift([1 2 3 4 5], 2);', vars: ['v'] },
  { name: 'flipud', src: 'A = flipud([1 2; 3 4]);', vars: ['A'] },
  { name: 'cat-3d', src: 'C = cat(3, [1 2; 3 4], [5 6; 7 8]);', vars: ['C'] },

  // ── fundamentals: elementary-function domains ──
  { name: 'atan2', src: 'a = atan2(1, 1);', vars: ['a'], tol: 1e-9 },
  { name: 'hypot', src: 'h = hypot(3, 4);', vars: ['h'] },

  // ── structs ──
  { name: 'struct-nested-assign', src: 'S.a.b = 7; x = S.a.b;', vars: ['x'] },
  { name: 'struct-array-rw', src: 'S(1).x = 1; S(2).x = 5; n = numel(S); y = S(2).x;', vars: ['n', 'y'] },
  { name: 'struct-array-default-empty', src: 'S(3).x = 9; e = isempty(S(1).x);', vars: ['e'] },
  { name: 'struct-field-extract', src: 'S(1).v = 10; S(2).v = 20; w = [S.v];', vars: ['w'] },

  // ── short-circuit operators (RHS must not be evaluated) ──
  { name: 'shortcircuit-and', src: 'a = false && nosuchfn();', vars: ['a'] },
  { name: 'shortcircuit-or', src: 'b = true || nosuchfn();', vars: ['b'] },
  { name: 'shortcircuit-combined', src: 'c = (3 > 2) && (1 < 2);', vars: ['c'] },

  // ── ignored outputs (~) ──
  { name: 'ignored-output-max', src: '[~, idx] = max([3 9 1]);', vars: ['idx'] },
  { name: 'ignored-output-size', src: '[~, nc] = size([1 2 3; 4 5 6]);', vars: ['nc'] },

  // ── switch with cell-array cases ──
  { name: 'switch-cell-hit', src: 'x = 2; switch x, case {1, 2, 3}, y = 10; otherwise, y = 0; end', vars: ['y'] },
  { name: 'switch-cell-miss', src: 'x = 7; switch x, case {1, 2, 3}, y = 10; otherwise, y = 0; end', vars: ['y'] },

  // ── string class ──
  { name: 'string-concat-plus', src: 's = "foo" + "bar";', vars: ['s'] },
  { name: 'string-equality', src: 'e = ("abc" == "abc");', vars: ['e'] },

  // ── empty-reduction shapes along a dimension ──
  { name: 'sum-empty-dim1', src: 'x = sum([], 1);', vars: ['x'] },
  { name: 'sum-empty-dim2', src: 'x = sum([], 2);', vars: ['x'] },
  { name: 'prod-empty-dim1', src: 'x = prod([], 1);', vars: ['x'] },
  { name: 'prod-empty-dim2', src: 'x = prod([], 2);', vars: ['x'] },
  { name: 'max-empty-dim1', src: 'x = max([], [], 1);', vars: ['x'] },
  { name: 'max-empty-dim2', src: 'x = max([], [], 2);', vars: ['x'] },
  { name: 'grow-empty-linear', src: 'A = []; A(1) = 5;', vars: ['A'] },
  { name: 'flatten-2x2', src: 'A = [1 2; 3 4]; x = A(:);', vars: ['x'] },
  { name: 'logical-linear-mask', src: 'A = [1 2; 3 4]; m = A([true false true false]);', vars: ['m'] },
  { name: 'matrix-gt2-mask', src: 'A = [1 2; 3 4]; m = A(A > 2);', vars: ['m'] },

  // ── NaN / 'omitnan' ──
  { name: 'sum-nan', src: 'x = sum([1 NaN]);', vars: ['x'] },
  { name: 'sum-omitnan', src: "x = sum([1 NaN], 'omitnan');", vars: ['x'] },
  { name: 'mean-nan', src: 'x = mean([1 NaN]);', vars: ['x'] },
  { name: 'mean-omitnan', src: "x = mean([1 NaN], 'omitnan');", vars: ['x'] },
  { name: 'max-nan', src: 'x = max([NaN 1]);', vars: ['x'] },
  { name: 'min-nan', src: 'x = min([NaN 1]);', vars: ['x'] },
  { name: 'max-omitnan', src: "x = max([NaN 1], [], 'omitnan');", vars: ['x'] },

  // ── complex relational / ordering (MATLAB compares real parts for </>, magnitude for sort/max) ──
  { name: 'complex-lt', src: 'x = (1+1i) < 2;', vars: ['x'] },
  { name: 'complex-sort', src: 'x = sort([1+1i 2]);', vars: ['x'] },
  { name: 'complex-max-mag', src: 'x = max([1+1i 2]);', vars: ['x'] },

  // ── vector arithmetic (magnitude, dot/cross/norm, angles, normalization) ──
  { name: 'vec-mag-2d', src: 'v = [2 2]; mag = sqrt(v(1)^2 + v(2)^2);', vars: ['mag'], tol: 1e-9 },
  { name: 'vec-mag-3d', src: 'v = [4 5 5]; mag = sqrt(v(1)^2 + v(2)^2 + v(3)^2);', vars: ['mag'], tol: 1e-9 },
  { name: 'atand-neg', src: 't = atand(-3/2);', vars: ['t'], tol: 1e-9 },
  { name: 'vec-add', src: 'u = [0 2]; v = [2 2]; w = u + v;', vars: ['w'] },
  { name: 'vec-sub', src: 'a = [-0.1 0.2 9.53]; b = [5.095 -0.04 9.5]; c = b - a;', vars: ['c'], tol: 1e-9 },
  { name: 'scalar-vec-mul', src: 'u = [0.5 2 -2]; au = 0.5 * u;', vars: ['au'], tol: 1e-9 },
  { name: 'dot-product', src: 'd = dot([2 4 -1], [-1 3 2]);', vars: ['d'] },
  { name: 'angle-between', src: 'u = [2 4 -1]; v = [-1 3 2]; t = acosd(dot(u,v) / (norm(u)*norm(v)));', vars: ['t'], tol: 1e-9 },
  { name: 'cross-product', src: 'c = cross([1 3 6], [1 0 2]);', vars: ['c'] },
  { name: 'normalize-vector', src: 'a = [-0.077 0.038 9.538]; an = a / norm(a);', vars: ['an'], tol: 1e-9 },
  { name: 'vector-frame-chain', src: 'a = [-0.077 0.038 9.538]; m = [-15.188 12.563 -49.625]; an = a/norm(a); mn = m/norm(m); d = -an; dxm = cross(d, mn); e = dxm/norm(dxm); n = cross(e, d); psi = acosd(dot([0 1 0], n) / (norm([0 1 0])*norm(n)));', vars: ['e', 'psi'], tol: 1e-6 },

  // ── linear algebra: core matrix operations ──
  { name: 'la-add-mul', src: 'A = [1 2 3; 4 5 6; 7 8 10]; B = [2 0 1; 1 3 4; 5 6 0]; C = A + B; D = A * B;', vars: ['C', 'D'] },
  { name: 'la-transpose', src: "A = [1 2 3; 4 5 6; 7 8 10]; E = A.'; F = A';", vars: ['E', 'F'] },

  // ── linear algebra: determinant / inverse / rank ──
  { name: 'la-det-inv-rank', src: 'A = [2 1 3; 1 0 2; 4 1 8]; detA = det(A); invA = inv(A); r = rank(A);', vars: ['detA', 'invA', 'r'], tol: 1e-9 },
  { name: 'la-inv-check', src: 'A = [2 1 3; 1 0 2; 4 1 8]; check = A * inv(A);', vars: ['check'], tol: 1e-9 },

  // ── linear algebra: solving systems ──
  { name: 'la-solve-backslash', src: 'A = [3 -1 2; 1 4 -2; 2 -3 5]; b = [10; -1; 7]; x1 = A\\b; residual = norm(A*x1 - b);', vars: ['x1', 'residual'], tol: 1e-9 },
  { name: 'la-solve-inv', src: 'A = [3 -1 2; 1 4 -2; 2 -3 5]; b = [10; -1; 7]; x2 = inv(A) * b;', vars: ['x2'], tol: 1e-9 },

  // ── linear algebra: rank-deficient / null space (invariants, not the basis) ──
  { name: 'la-null-space', src: 'A = [1 2 3; 2 4 6; 1 1 1]; r = rank(A); N = null(A); nc = norm(A*N); dn = size(N, 2);', vars: ['r', 'nc', 'dn'], tol: 1e-9 },

  // ── linear algebra: eigenanalysis (sorted values + reconstruction residual, not raw V) ──
  { name: 'la-eig-invariants', src: 'A = [4 1; 2 3]; [V, D] = eig(A); ev = sort(diag(D)); rr = norm(V*D*inv(V) - A);', vars: ['ev', 'rr'], tol: 1e-9 },

  // ── linear algebra: Markov chains ──
  { name: 'markov-p10', src: 'P = [0.8 0.2 0; 0.1 0.7 0.2; 0 0.3 0.7]; r = [1 0 0]; r10 = r * P^10;', vars: ['r10'], tol: 1e-6 },
  { name: 'markov-eig', src: 'P = [0.8 0.2 0; 0.1 0.7 0.2; 0 0.3 0.7]; ev = sort(real(eig(P)));', vars: ['ev'], tol: 1e-6 },

  // ── vector mechanics (resultant force + moment about origin) ──
  { name: 'mechanics-resultant', src: 'A = [0 0 6]; B = [0 2.5 0]; C = [2 -3 0]; uAC = (C-A)/norm(C-A); uAB = (B-A)/norm(B-A); FR = uAC*462 + uAB*858;', vars: ['FR'], tol: 1e-6 },
  { name: 'mechanics-moment', src: 'A = [0 0 6]; B = [0 2.5 0]; C = [2 -3 0]; FR = (C-A)/norm(C-A)*462 + (B-A)/norm(B-A)*858; MR = cross(A, FR); Mx = dot(MR, [1 0 0]); My = dot(MR, [0 1 0]);', vars: ['Mx', 'My'], tol: 1e-6 },

  // ══════════ graduate-applied computational math ══════════

  // conditioning & stability
  { name: 'grad-cond-hilbert', src: 'c = cond(hilb(5));', vars: ['c'], tol: 1, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['conditioning', 'cond'] },
  { name: 'grad-rref', src: 'R = rref([1 2 3; 2 4 6; 1 1 1]);', vars: ['R'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra', tags: ['rref'] },

  // orthogonal projection & orthonormalization
  { name: 'grad-projection', src: "A = [1 0; 1 1; 1 2]; b = [1; 2; 2]; proj = A*((A'*A)\\(A'*b));", vars: ['proj'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra', tags: ['projection', 'least-squares'] },
  { name: 'grad-qr-orthonormal', src: "[Q, R] = qr([1 1; 1 0; 0 1], 0); orth = Q'*Q;", vars: ['orth'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['orthogonalization', 'qr'] },

  // SVD / low-rank
  { name: 'grad-svd-values-3x3', src: 's = svd([2 0 0; 0 3 0; 0 0 6]);', vars: ['s'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['svd'] },

  // iterative linear solvers
  { name: 'grad-jacobi', src: 'A = [4 1; 1 3]; b = [1; 2]; d = diag(A); R = A - diag(d); x = [0; 0]; for k = 1:100, x = (b - R*x) ./ d; end', vars: ['x'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['iterative-solver', 'jacobi'] },
  { name: 'grad-gauss-seidel', src: 'A = [4 1; 1 3]; b = [1; 2]; x = [0; 0]; for k = 1:50, x(1) = (b(1) - A(1,2)*x(2))/A(1,1); x(2) = (b(2) - A(2,1)*x(1))/A(2,2); end', vars: ['x'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['iterative-solver', 'gauss-seidel'] },
  { name: 'grad-conjugate-gradient', src: "A = [4 1; 1 3]; b = [1; 2]; x = [0; 0]; r = b - A*x; p = r; for k = 1:2, Ap = A*p; alpha = (r'*r)/(p'*Ap); x = x + alpha*p; rn = r - alpha*Ap; beta = (rn'*rn)/(r'*r); p = rn + beta*p; r = rn; end", vars: ['x'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['krylov', 'conjugate-gradient'] },

  // nonlinear systems (Newton with Jacobian)
  { name: 'grad-newton-system', src: 'F = @(x) [x(1)^2 + x(2)^2 - 1; x(1) - x(2)]; J = @(x) [2*x(1) 2*x(2); 1 -1]; x = [1; 1]; for k = 1:10, x = x - J(x)\\F(x); end', vars: ['x'], tol: 1e-9, level: 'graduate', domain: 'nonlinear-systems', tags: ['newton', 'jacobian'] },

  // regularization / inverse problems
  { name: 'grad-ridge', src: "A = [1 1; 1 2; 1 3]; b = [1; 2; 2]; lam = 0.1; x = (A'*A + lam*eye(2)) \\ (A'*b);", vars: ['x'], tol: 1e-9, level: 'graduate', domain: 'statistics', tags: ['regularization', 'ridge', 'inverse-problems'] },

  // matrix functions
  { name: 'grad-expm', src: 'E = expm([0 1; 0 0]);', vars: ['E'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['matrix-functions', 'expm'] },

  // spectral graph theory
  { name: 'grad-graph-laplacian', src: 'A = [0 1 0; 1 0 1; 0 1 0]; D = diag(sum(A, 2)); L = D - A; ev = sort(eig(L));', vars: ['ev'], tol: 1e-9, level: 'graduate', domain: 'graph', tags: ['spectral-graph', 'laplacian'] },

  // Fourier analysis & signals
  { name: 'grad-fft', src: 'Y = fft([1 2 3 4]);', vars: ['Y'], tol: 1e-9, level: 'undergrad', domain: 'fourier', tags: ['fft'] },
  { name: 'grad-conv', src: 'c = conv([1 2 1], [1 1]);', vars: ['c'], tol: 1e-9, level: 'undergrad', domain: 'fourier', tags: ['convolution'] },

  // computational statistics
  { name: 'grad-var-std', src: 'v = var([2 4 6 8]); s = std([2 4 6 8]);', vars: ['v', 's'], tol: 1e-9, level: 'undergrad', domain: 'statistics', tags: ['variance'] },
  { name: 'grad-corrcoef', src: 'R = corrcoef([1 2 3 4], [1 2 3 5]);', vars: ['R'], tol: 1e-6, level: 'undergrad', domain: 'statistics', tags: ['correlation'] },

  // ══════════ optimization ══════════
  { name: 'opt-golden-section', src: 'f = @(x)(x-2).^2; a = 0; b = 5; g = (sqrt(5)-1)/2; c = b-g*(b-a); d = a+g*(b-a); for k = 1:60, if f(c) < f(d), b = d; else, a = c; end, c = b-g*(b-a); d = a+g*(b-a); end; xmin = (a+b)/2;', vars: ['xmin'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['line-search', 'golden-section'] },
  { name: 'opt-gradient-descent', src: 'Q = [3 0; 0 1]; x = [5; 5]; for k = 1:200, x = x - 0.1*(Q*x); end', vars: ['x'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['gradient-descent', 'quadratic'] },
  { name: 'opt-newton-min', src: 'x = 3; for k = 1:20, x = x - (2*(x-2))/2; end', vars: ['x'], tol: 1e-9, level: 'graduate', domain: 'optimization', tags: ['newton', 'minimization'] },

  // ══════════ numerical PDEs ══════════
  { name: 'pde-poisson-1d', src: 'n = 5; h = 1/(n+1); A = 2*eye(n) - diag(ones(n-1,1),1) - diag(ones(n-1,1),-1); f = ones(n,1)*h^2; u = A\\f;', vars: ['u'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['finite-difference', 'poisson', 'dirichlet'] },
  { name: 'pde-heat-1d-step', src: "u = [0 1 2 3 2 1 0]'; r = 0.4; n = numel(u); un = u; for i = 2:n-1, un(i) = u(i) + r*(u(i+1) - 2*u(i) + u(i-1)); end; un(1) = 0; un(end) = 0;", vars: ['un'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['finite-difference', 'heat-equation', 'explicit'] },
  { name: 'pde-fem-1d-stiffness', src: 'n = 4; K = zeros(n+1); for e = 1:n, K(e,e) = K(e,e)+1; K(e,e+1) = K(e,e+1)-1; K(e+1,e) = K(e+1,e)-1; K(e+1,e+1) = K(e+1,e+1)+1; end', vars: ['K'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['finite-element', 'stiffness-assembly'] },

  // ══════════ dynamical systems ══════════
  { name: 'dyn-fixed-point', src: 'x = 1; for k = 1:100, x = cos(x); end', vars: ['x'], tol: 1e-9, level: 'undergrad', domain: 'dynamical-systems', tags: ['fixed-point-iteration'] },
  { name: 'dyn-logistic-map', src: 'x = 0.5; r = 3.2; for k = 1:200, x = r*x*(1-x); end', vars: ['x'], tol: 1e-6, level: 'graduate', domain: 'dynamical-systems', tags: ['logistic-map', 'period-2'] },
  { name: 'dyn-stability-eig', src: 'A = [-2 1; 0 -3]; ev = sort(real(eig(A)));', vars: ['ev'], tol: 1e-9, level: 'graduate', domain: 'dynamical-systems', tags: ['stability', 'eigenvalues'] },

  // ══════════ numerical ODEs (extensions) ══════════
  { name: 'ode-heun', src: 'h = 0.1; y = 1; for k = 1:10, yp = y + h*y; y = y + h/2*(y + yp); end', vars: ['y'], tol: 1e-9, level: 'undergrad', domain: 'numerical-ode', tags: ['improved-euler', 'heun'] },
  { name: 'ode-harmonic-rk4', src: 'h = 0.01; y = [1; 0]; A = [0 1; -1 0]; for k = 1:628, k1 = A*y; k2 = A*(y+h/2*k1); k3 = A*(y+h/2*k2); k4 = A*(y+h*k3); y = y + h/6*(k1+2*k2+2*k3+k4); end', vars: ['y'], tol: 1e-6, level: 'graduate', domain: 'numerical-ode', tags: ['rk4', 'harmonic-oscillator', 'system'] },

  // ══════════ approximation theory (extensions) ══════════
  { name: 'approx-lagrange', src: 'xn = [1 2 4]; yn = [1 4 16]; t = 3; L = 0; for i = 1:3, li = 1; for j = 1:3, if j ~= i, li = li*(t-xn(j))/(xn(i)-xn(j)); end, end, L = L + yn(i)*li; end', vars: ['L'], tol: 1e-9, level: 'undergrad', domain: 'approximation', tags: ['lagrange-interpolation'] },
  { name: 'approx-chebyshev-nodes', src: 'n = 5; k = 0:n; xc = cos((2*k+1)*pi/(2*(n+1)));', vars: ['xc'], tol: 1e-9, level: 'graduate', domain: 'approximation', tags: ['chebyshev-nodes'] },

  // ══════════ Fourier / spectral (extensions) ══════════
  { name: 'fft-ifft-roundtrip', src: 'x = [1 2 3 4]; y = real(ifft(fft(x)));', vars: ['y'], tol: 1e-9, level: 'undergrad', domain: 'fourier', tags: ['fft', 'ifft', 'roundtrip'] },
  { name: 'fft-freq-detect', src: 'N = 16; t = (0:N-1)/N; s = sin(2*pi*3*t); Y = abs(fft(s)); [~, idx] = max(Y(1:N/2)); freq = idx - 1;', vars: ['freq'], tol: 1e-9, level: 'graduate', domain: 'fourier', tags: ['fft', 'frequency-detection'] },

  // ══════════ graph / network ══════════
  { name: 'graph-adjacency-powers', src: 'A = [0 1 1; 1 0 1; 1 1 0]; W = A^3;', vars: ['W'], tol: 1e-9, level: 'undergrad', domain: 'graph', tags: ['adjacency', 'walk-counts'] },
  { name: 'graph-pagerank', src: 'A = [0 0 1; 1 0 0; 1 1 0]; M = A ./ sum(A, 1); r = ones(3,1)/3; for k = 1:100, r = M*r; end', vars: ['r'], tol: 1e-6, level: 'graduate', domain: 'graph', tags: ['pagerank', 'power-iteration'] },

  // ══════════ validation of already-implemented advanced functions ══════════

  // advanced decompositions (reconstruction + orthonormality invariants)
  { name: 'val-schur', src: "A = [4 1 2; 1 3 0; 2 0 5]; [U, T] = schur(A); rr = norm(U*T*U' - A); orth = norm(U'*U - eye(3)); ev = sort(diag(T));", vars: ['rr', 'orth', 'ev'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['schur', 'oracle-validation'] },
  { name: 'val-hess', src: "A = [4 1 2; 1 3 0; 2 0 5]; [P, H] = hess(A); rr = norm(P*H*P' - A);", vars: ['rr'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['hessenberg', 'oracle-validation'] },
  { name: 'val-polyeig', src: 'ev = sort(polyeig([1 0; 0 1], [0 0; 0 0], [-1 0; 0 -4]));', vars: ['ev'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['polyeig', 'oracle-validation'] },

  // matrix functions (defining-identity residuals)
  { name: 'val-sqrtm', src: 'A = [4 1; 1 3]; S = sqrtm(A); rr = norm(S*S - A);', vars: ['rr'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['sqrtm', 'matrix-functions', 'oracle-validation'] },
  { name: 'val-logm', src: 'A = [2 0; 0 3]; L = logm(A); rr = norm(expm(L) - A);', vars: ['rr'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['logm', 'matrix-functions', 'oracle-validation'] },
  { name: 'val-kron', src: 'K = kron([1 0; 0 1], [1 2; 3 4]);', vars: ['K'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra', tags: ['kron', 'oracle-validation'] },

  // sparse / iterative solvers (residual norm ≈ 0)
  { name: 'val-gmres', src: 'A = [4 1; 1 3]; b = [1; 2]; x = gmres(A, b); rr = norm(A*x - b);', vars: ['rr'], tol: 1e-8, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['gmres', 'iterative-solver', 'oracle-validation'] },
  { name: 'val-minres', src: 'A = [4 1; 1 3]; b = [1; 2]; x = minres(A, b); rr = norm(A*x - b);', vars: ['rr'], tol: 1e-8, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['minres', 'iterative-solver', 'oracle-validation'] },
  { name: 'val-bicg', src: 'A = [4 1; 1 3]; b = [1; 2]; x = bicg(A, b); rr = norm(A*x - b);', vars: ['rr'], tol: 1e-8, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['bicg', 'iterative-solver', 'oracle-validation'] },

  // distribution functions
  { name: 'val-normpdf-cdf', src: 'p1 = normpdf(0); p2 = normcdf(1.96);', vars: ['p1', 'p2'], tol: 1e-6, level: 'undergrad', domain: 'statistics', tags: ['normal-distribution', 'oracle-validation'] },
  { name: 'val-binopdf', src: 'p = binopdf(2, 5, 0.5);', vars: ['p'], tol: 1e-9, level: 'undergrad', domain: 'statistics', tags: ['binomial-distribution', 'oracle-validation'] },
  { name: 'val-poisspdf', src: 'p = poisspdf(2, 3);', vars: ['p'], tol: 1e-9, level: 'undergrad', domain: 'statistics', tags: ['poisson-distribution', 'oracle-validation'] },
  { name: 'val-icdf-normal', src: "x = icdf('Normal', 0.975, 0, 1);", vars: ['x'], tol: 1e-6, level: 'undergrad', domain: 'statistics', tags: ['inverse-cdf', 'oracle-validation'] },
  // gamma PDF — MATLAB's function is `gampdf` (there is no `gammapdf`); already implemented.
  { name: 'val-gampdf', src: 'p = gampdf(2, 3, 1);', vars: ['p'], tol: 1e-9, level: 'undergrad', domain: 'statistics', tags: ['gamma-distribution', 'oracle-validation'] },

  // ── validation: ODE solvers (adaptive — loose tol absorbs step-control differences) ──
  { name: 'val-ode45', src: '[t, y] = ode45(@(t, y) y, [0 1], 1); yf = y(end);', vars: ['yf'], tol: 1e-2, level: 'graduate', domain: 'numerical-ode', tags: ['ode45', 'oracle-validation'] },

  // ── validation: optimization (unique minimizers; iterative tol) ──
  { name: 'val-fminbnd', src: 'x = fminbnd(@(x)(x-2).^2, 0, 5);', vars: ['x'], tol: 1e-4, level: 'graduate', domain: 'optimization', tags: ['fminbnd', 'oracle-validation'] },
  { name: 'val-fminsearch', src: 'x = fminsearch(@(v)(v(1)-1)^2 + (v(2)-2)^2, [0 0]);', vars: ['x'], tol: 1e-4, level: 'graduate', domain: 'optimization', tags: ['fminsearch', 'nelder-mead', 'oracle-validation'] },
  { name: 'val-fsolve', src: 'x = fsolve(@(x) x^2 - 2, 1);', vars: ['x'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['fsolve', 'oracle-validation'] },
  { name: 'val-quadprog', src: 'x = quadprog([2 0; 0 2], [-2; -4]);', vars: ['x'], tol: 1e-5, level: 'graduate', domain: 'optimization', tags: ['quadprog', 'oracle-validation'] },
  { name: 'val-lsqlin', src: 'x = lsqlin([1 1; 1 2; 1 3], [1; 2; 2]);', vars: ['x'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['lsqlin', 'least-squares', 'oracle-validation'] },

  // ── validation: interpolation / polynomials ──
  { name: 'val-interp2', src: '[X, Y] = meshgrid(1:3, 1:3); Z = X + Y; q = interp2(X, Y, Z, 1.5, 2.5);', vars: ['q'], tol: 1e-9, level: 'undergrad', domain: 'approximation', tags: ['interp2', 'oracle-validation'] },
  { name: 'val-ppval', src: 'pp = spline([0 1 2 3], [0 1 4 9]); q = ppval(pp, 1.5);', vars: ['q'], tol: 1e-6, level: 'undergrad', domain: 'approximation', tags: ['ppval', 'spline', 'oracle-validation'] },
  { name: 'val-polyvalm', src: 'M = polyvalm([1 0 -1], [2 0; 0 3]);', vars: ['M'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['polyvalm', 'oracle-validation'] },

  // ── validation: Fourier / signal ──
  { name: 'val-fft2', src: 'Y = fft2([1 2; 3 4]);', vars: ['Y'], tol: 1e-9, level: 'graduate', domain: 'fourier', tags: ['fft2', 'oracle-validation'] },
  { name: 'val-fftshift', src: 'y = fftshift([1 2 3 4]);', vars: ['y'], tol: 1e-9, level: 'undergrad', domain: 'fourier', tags: ['fftshift', 'oracle-validation'] },
  { name: 'val-hilbert-abs', src: 'a = abs(hilbert([1 2 3 4]));', vars: ['a'], tol: 1e-6, level: 'graduate', domain: 'fourier', tags: ['hilbert', 'oracle-validation'] },
  { name: 'val-findpeaks', src: 'pks = findpeaks([0 2 0 3 1 4 0]);', vars: ['pks'], tol: 1e-9, level: 'undergrad', domain: 'fourier', tags: ['findpeaks', 'oracle-validation'] },

  // ── validation: sparse / iterative solvers + decompositions ──
  { name: 'val-lsqr', src: 'A = [4 1; 1 3]; b = [1; 2]; x = lsqr(A, b); rr = norm(A*x - b);', vars: ['rr'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['lsqr', 'iterative-solver', 'oracle-validation'] },
  { name: 'val-bicgstab', src: 'A = [4 1; 1 3]; b = [1; 2]; x = bicgstab(A, b); rr = norm(A*x - b);', vars: ['rr'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['bicgstab', 'iterative-solver', 'oracle-validation'] },
  { name: 'val-eigs', src: 'ev = sort(eigs([2 0 0; 0 3 0; 0 0 6], 3));', vars: ['ev'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['eigs', 'oracle-validation'] },
  { name: 'val-svds', src: 's = sort(svds([2 0; 0 3], 2));', vars: ['s'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['svds', 'oracle-validation'] },
  { name: 'val-orth', src: "Q = orth([1 0; 1 0; 0 1]); rr = norm(Q'*Q - eye(size(Q,2)));", vars: ['rr'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['orth', 'oracle-validation'] },

  // ── validation: graph / network ──
  { name: 'val-graph-shortestpath', src: 'G = graph([1 2 3], [2 3 4]); p = shortestpath(G, 1, 4);', vars: ['p'], tol: 1e-9, level: 'graduate', domain: 'graph', tags: ['shortestpath', 'oracle-validation'] },
  { name: 'val-graph-conncomp', src: 'G = graph([1 3], [2 4]); c = conncomp(G);', vars: ['c'], tol: 1e-9, level: 'graduate', domain: 'graph', tags: ['conncomp', 'oracle-validation'] },
  { name: 'val-graph-distances', src: 'G = graph([1 2 3], [2 3 4]); D = distances(G);', vars: ['D'], tol: 1e-9, level: 'graduate', domain: 'graph', tags: ['distances', 'oracle-validation'] },
  { name: 'val-graph-toposort', src: 'G = digraph([1 2 1], [2 3 3]); o = toposort(G);', vars: ['o'], tol: 1e-9, level: 'graduate', domain: 'graph', tags: ['toposort', 'oracle-validation'] },

  // ── validation: remaining ODE solvers + deval (adaptive — loose tol) ──
  { name: 'val-ode23', src: '[t, y] = ode23(@(t, y) y, [0 1], 1); yf = y(end);', vars: ['yf'], tol: 1e-2, level: 'graduate', domain: 'numerical-ode', tags: ['ode23', 'oracle-validation'] },
  { name: 'val-ode113', src: '[t, y] = ode113(@(t, y) y, [0 1], 1); yf = y(end);', vars: ['yf'], tol: 1e-2, level: 'graduate', domain: 'numerical-ode', tags: ['ode113', 'oracle-validation'] },
  { name: 'val-ode15s', src: '[t, y] = ode15s(@(t, y) -y, [0 1], 1); yf = y(end);', vars: ['yf'], tol: 1e-2, level: 'graduate', domain: 'numerical-ode', tags: ['ode15s', 'stiff', 'oracle-validation'] },
  { name: 'val-deval', src: 'sol = ode45(@(t, y) y, [0 1], 1); yf = deval(sol, 0.5);', vars: ['yf'], tol: 1e-2, level: 'graduate', domain: 'numerical-ode', tags: ['deval', 'oracle-validation'] },

  // ── validation: linprog (objective value — non-unique vertex) ──
  { name: 'val-linprog-fval', src: '[x, fval] = linprog([-1; -1], [1 1], 1, [], [], [0; 0]);', vars: ['fval'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['linprog', 'objective-invariant', 'oracle-validation'] },

  // ── validation: residue (sorted poles + residues — order convention) ──
  { name: 'val-residue', src: '[r, p, k] = residue([1 0], [1 -3 2]); ps = sort(p); rs = sort(r);', vars: ['ps', 'rs'], tol: 1e-9, level: 'graduate', domain: 'approximation', tags: ['residue', 'partial-fractions', 'oracle-validation'] },

  // ── validation: graph metrics ──
  { name: 'val-centrality', src: "G = graph([1 2 3 1], [2 3 1 3]); c = centrality(G, 'degree');", vars: ['c'], tol: 1e-9, level: 'graduate', domain: 'graph', tags: ['centrality', 'oracle-validation'] },
  { name: 'val-maxflow', src: 'G = digraph([1 1 2 3], [2 3 4 4], [2 3 2 3]); f = maxflow(G, 1, 4);', vars: ['f'], tol: 1e-9, level: 'graduate', domain: 'graph', tags: ['maxflow', 'oracle-validation'] },
  { name: 'val-minspantree', src: 'G = graph([1 1 2 3], [2 3 3 4], [1 4 2 3]); T = minspantree(G); w = sum(T.Edges.Weight);', vars: ['w'], tol: 1e-9, level: 'graduate', domain: 'graph', tags: ['minspantree', 'oracle-validation'] },

  // ── validation: N-D interpolation ──
  { name: 'val-interpn', src: '[X, Y] = ndgrid(1:3, 1:3); V = X + Y; q = interpn(X, Y, V, 1.5, 2.5);', vars: ['q'], tol: 1e-9, level: 'graduate', domain: 'approximation', tags: ['interpn', 'oracle-validation'] },
  { name: 'val-makima', src: 'q = makima([0 1 2 3], [0 1 4 9], 1.5);', vars: ['q'], tol: 1e-6, level: 'graduate', domain: 'approximation', tags: ['makima', 'oracle-validation'] },

  // ── validation: symbolic CAS (numeric finals via double(subs(...))) ──
  { name: 'val-sym-jacobian', src: 'syms x y; J = jacobian([x^2*y; x + y], [x y]); v = double(subs(J, [x y], [2 3]));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['jacobian', 'oracle-validation'] },
  { name: 'val-sym-hessian', src: 'syms x y; H = hessian(x^2*y, [x y]); v = double(subs(H, [x y], [2 3]));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['hessian', 'oracle-validation'] },
  { name: 'val-sym-taylor', src: "syms x; T = taylor(exp(x), x, 'Order', 4); c = double(subs(T, x, 1));", vars: ['c'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['taylor', 'oracle-validation'] },
  { name: 'val-sym-laplace', src: 'syms t s; L = laplace(exp(-2*t)); v = double(subs(L, s, 3));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['laplace', 'oracle-validation'] },
  { name: 'val-sym-dsolve', src: 'syms y(t); S = dsolve(diff(y, t) == y, y(0) == 1); v = double(subs(S, t, 1));', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'symbolic', tags: ['dsolve', 'oracle-validation'] },
  { name: 'val-sym-vpasolve', src: 'syms x; v = sort(double(vpasolve(x^2 - 2 == 0, x)));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['vpasolve', 'oracle-validation'] },
];
