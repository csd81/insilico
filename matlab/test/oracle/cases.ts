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
];
