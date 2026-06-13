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
  { name: 'colon-range', src: 'v = 1:2:9;', vars: ['v'], level: 'undergrad', domain: 'core-language' },
  { name: 'end-index', src: 'v = [5 6 7 8]; a = v(end); b = v(end-1);', vars: ['a', 'b'], level: 'undergrad', domain: 'core-language' },
  { name: 'submatrix', src: 'A = magic(4); S = A(2:3, 2:3);', vars: ['S'], level: 'undergrad', domain: 'core-language' },
  { name: 'logical-mask', src: 'v = [3 1 4 1 5 9 2 6]; m = v(v > 3);', vars: ['m'], level: 'undergrad', domain: 'core-language' },
  { name: 'linear-index-col', src: 'A = [1 2; 3 4]; x = A(:);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'reshape', src: 'A = reshape(1:6, 2, 3);', vars: ['A'], level: 'undergrad', domain: 'core-language' },

  // ── arithmetic / broadcasting ──
  { name: 'broadcast-add', src: 'A = [1;2;3] + [10 20];', vars: ['A'], level: 'undergrad', domain: 'core-language' },
  { name: 'matmul', src: 'A = [1 2; 3 4]; B = A * A;', vars: ['B'], level: 'undergrad', domain: 'core-language' },
  { name: 'elementwise-pow', src: 'v = [1 2 3 4] .^ 2;', vars: ['v'], level: 'undergrad', domain: 'core-language' },
  { name: 'kron', src: 'K = kron([1 0; 0 1], [1 2; 3 4]);', vars: ['K'], level: 'undergrad', domain: 'core-language' },

  // ── complex ──
  { name: 'complex-mul', src: 'z = (1+2i) * (3-1i);', vars: ['z'], level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'complex-conj-transpose', src: "A = [1+2i 3-1i]; c = A';", vars: ['c'], level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'complex-abs', src: 'm = abs(3 + 4i);', vars: ['m'], level: 'undergrad', domain: 'complex-arithmetic' },

  // ── linear algebra ──
  { name: 'mldivide', src: 'A = [2 1 -1; -3 -1 2; -2 1 2]; b = [8; -11; -3]; x = A\\b;', vars: ['x'], level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'det', src: 'd = det([1 2 3; 4 5 6; 7 8 10]);', vars: ['d'], level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'inv', src: 'B = inv([4 3; 6 3]);', vars: ['B'], level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'eig-symmetric', src: 'e = sort(eig([2 1; 1 2]));', vars: ['e'], level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'norm-vec', src: 'n = norm([3 4 12]);', vars: ['n'], level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'trace-rank', src: 'A = magic(4); t = trace(A); r = rank(A);', vars: ['t', 'r'], level: 'undergrad', domain: 'numerical-linear-algebra' },

  // ── reductions ──
  { name: 'sum-dim', src: 'A = [1 2; 3 4]; c = sum(A, 1); rr = sum(A, 2);', vars: ['c', 'rr'], level: 'undergrad', domain: 'core-language' },
  { name: 'cumsum', src: 'c = cumsum([1 2 3 4]);', vars: ['c'], level: 'undergrad', domain: 'core-language' },
  { name: 'minmax-idx', src: '[mn, i] = min([5 2 8 1 9]); [mx, j] = max([5 2 8 1 9]);', vars: ['mn', 'i', 'mx', 'j'], level: 'undergrad', domain: 'core-language' },
  { name: 'mean-std', src: 'm = mean([2 4 6 8]); s = std([2 4 6 8]);', vars: ['m', 's'], level: 'undergrad', domain: 'core-language' },

  // ── elementary functions ──
  { name: 'trig', src: 'y = sin(pi/6);', vars: ['y'], level: 'undergrad', domain: 'core-language' },
  { name: 'round-floor-ceil', src: 'a = round(2.5); b = floor(-2.5); c = ceil(2.1); d = fix(-2.7);', vars: ['a', 'b', 'c', 'd'], level: 'undergrad', domain: 'core-language' },
  { name: 'mod-rem', src: 'a = mod(-7, 3); b = rem(-7, 3);', vars: ['a', 'b'], level: 'undergrad', domain: 'core-language' },

  // ── polynomials / fitting ──
  { name: 'polyfit-line', src: 'x = [0 1 2 3 4]; y = 2*x + 1; p = polyfit(x, y, 1);', vars: ['p'], level: 'undergrad', domain: 'approximation' },
  { name: 'polyval', src: 'v = polyval([1 -3 2], 5);', vars: ['v'], level: 'undergrad', domain: 'approximation' },
  { name: 'roots', src: 'r = sort(roots([1 -3 2]));', vars: ['r'], level: 'undergrad', domain: 'approximation' },

  // ── nargout-dependent ──
  { name: 'sort-with-idx', src: '[s, idx] = sort([3 1 2]);', vars: ['s', 'idx'], level: 'undergrad', domain: 'core-language' },
  { name: 'unique', src: '[u, ia, ic] = unique([3 1 1 2 3]);', vars: ['u'], level: 'undergrad', domain: 'core-language' },

  // ── numerical methods (course) ──
  { name: 'newton-sqrt2', src: 'x = 1; for k = 1:20, x = x - (x^2 - 2)/(2*x); end', vars: ['x'], level: 'undergrad', domain: 'numerical-methods' },
  { name: 'trapz', src: 'x = linspace(0,1,1001); y = x.^2; I = trapz(x, y);', vars: ['I'], level: 'undergrad', domain: 'numerical-methods' },
  { name: 'lu-solve', src: 'A = [4 3; 6 3]; b = [10; 12]; [L,U,P] = lu(A); y = L\\(P*b); x = U\\y;', vars: ['x'], level: 'undergrad', domain: 'numerical-methods' },

  // ── indexing & orientation edge cases ──
  { name: 'colmajor-flatten', src: 'A = [1 2 3; 4 5 6]; x = A(:);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'linear-index-2d', src: 'A = magic(3); v = A([1 5 9]);', vars: ['v'], level: 'undergrad', domain: 'core-language' },
  { name: 'mask-row-orient', src: 'v = [10 20 30 40]; m = v(v > 15);', vars: ['m'], level: 'undergrad', domain: 'core-language' },
  { name: 'mask-col-orient', src: 'c = [1; 2; 3; 4]; m = c(c > 2);', vars: ['m'], level: 'undergrad', domain: 'core-language' },
  { name: 'mask-matrix-colmajor', src: 'A = [1 2; 3 4]; m = A(A > 1);', vars: ['m'], level: 'undergrad', domain: 'core-language' },
  { name: 'end-2d', src: 'A = magic(4); a = A(end, end); r = A(end, :); c = A(:, end);', vars: ['a', 'r', 'c'], level: 'undergrad', domain: 'core-language' },
  { name: 'end-arith', src: 'v = 1:10; w = v(end-2:end);', vars: ['w'], level: 'undergrad', domain: 'core-language' },
  { name: 'orient-row-slice', src: 'A = magic(3); r = A(2, :);', vars: ['r'], level: 'undergrad', domain: 'core-language' },
  { name: 'orient-col-slice', src: 'A = magic(3); c = A(:, 2);', vars: ['c'], level: 'undergrad', domain: 'core-language' },
  { name: 'reverse-range', src: 'v = 10:-2:0;', vars: ['v'], level: 'undergrad', domain: 'core-language' },

  // ── deletion & growth ──
  { name: 'delete-column', src: 'A = magic(4); A(:, 2) = [];', vars: ['A'], level: 'undergrad', domain: 'core-language' },
  { name: 'delete-elements', src: 'v = 1:6; v([2 4]) = [];', vars: ['v'], level: 'undergrad', domain: 'core-language' },
  { name: 'grow-2d', src: 'A = zeros(2, 2); A(3, 3) = 9;', vars: ['A'], level: 'undergrad', domain: 'core-language' },
  { name: 'grow-from-empty', src: 'v = []; v(3) = 5;', vars: ['v'], level: 'undergrad', domain: 'core-language' },
  { name: 'scalar-expand-colon', src: 'A = zeros(2, 3); A(:) = 7;', vars: ['A'], level: 'undergrad', domain: 'core-language' },

  // ── N-D arrays ──
  { name: 'nd-page-slice', src: 'A = reshape(1:24, 2, 3, 4); s = A(:, :, 2);', vars: ['s'], level: 'undergrad', domain: 'core-language' },
  { name: 'nd-size', src: 'A = reshape(1:24, 2, 3, 4); sz = size(A);', vars: ['sz'], level: 'undergrad', domain: 'core-language' },
  { name: 'nd-element', src: 'A = reshape(1:24, 2, 3, 4); x = A(1, 2, 3);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'nd-permute', src: 'A = reshape(1:6, 2, 3); B = permute(A, [2 1]);', vars: ['B'], level: 'undergrad', domain: 'core-language' },

  // ── value-copy semantics (eval-safe; no function defs) ──
  { name: 'copy-matrix', src: 'A = [1 2 3]; B = A; B(1) = 9;', vars: ['A', 'B'], level: 'undergrad', domain: 'core-language' },
  { name: 'copy-struct-field', src: 's.a = 1; t = s; t.a = 2; x = s.a;', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'copy-cell-element', src: 'c = {5, 6}; d = c; d{1} = 9; x = c{1};', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'map-handle-semantics', src: "m = containers.Map('KeyType','char','ValueType','double'); m('a') = 1; n = m; n('a') = 2; x = m('a');", vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'dict-value-semantics', src: 'd = dictionary("a", 1); e = d; e("a") = 2; x = d("a");', vars: ['x'], level: 'undergrad', domain: 'core-language' },

  // ── empty-matrix algebra ──
  { name: 'empty-sum', src: 's = sum([]);', vars: ['s'], level: 'undergrad', domain: 'core-language' },
  { name: 'empty-prod', src: 'p = prod([]);', vars: ['p'], level: 'undergrad', domain: 'core-language' },
  { name: 'empty-size', src: 'sz = size([]);', vars: ['sz'], level: 'undergrad', domain: 'core-language' },
  { name: 'empty-concat-drop-row', src: 'A = [1 2 3]; B = [A, []];', vars: ['B'], level: 'undergrad', domain: 'core-language' },
  { name: 'empty-concat-drop-col', src: 'A = [1; 2]; B = [A; []];', vars: ['B'], level: 'undergrad', domain: 'core-language' },
  { name: 'empty-length', src: 'n = length([]); m = numel([]);', vars: ['n', 'm'], level: 'undergrad', domain: 'core-language' },
  { name: 'empty-max', src: 'M = max([]);', vars: ['M'], level: 'undergrad', domain: 'core-language' },

  // ── complex elementary functions (domain transitions) ──
  { name: 'sqrt-negative', src: 'z = sqrt(-1);', vars: ['z'], level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'sqrt-negative-real', src: 'z = sqrt(-4);', vars: ['z'], level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'log-negative', src: 'z = log(-1);', vars: ['z'], tol: 1e-9, level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'asin-gt1', src: 'z = asin(2);', vars: ['z'], tol: 1e-9, level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'acos-gt1', src: 'z = acos(2);', vars: ['z'], tol: 1e-9, level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'cube-root-negative', src: 'z = (-8)^(1/3);', vars: ['z'], tol: 1e-9, level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'complex-matvec', src: 'y = [1+2i 3-4i] * [2; 5i];', vars: ['y'], level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'complex-exp', src: 'z = exp(1i*pi);', vars: ['z'], tol: 1e-9, level: 'undergrad', domain: 'complex-arithmetic' },

  // ── mldivide polymorphism (results, not algorithm choice) ──
  { name: 'mldivide-triangular', src: 'A = [2 1 1; 0 3 2; 0 0 4]; b = [5; 6; 8]; x = A\\b;', vars: ['x'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'mldivide-spd', src: 'A = [4 2; 2 3]; b = [6; 5]; x = A\\b;', vars: ['x'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'mldivide-overdetermined', src: 'A = [1 1; 1 2; 1 3]; b = [6; 0; 0]; x = A\\b;', vars: ['x'], tol: 1e-6, level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'mldivide-multi-rhs', src: 'A = [2 1; 1 3]; B = [1 0; 0 1]; X = A\\B;', vars: ['X'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra' },

  // ── decomposition invariants (convention-independent) ──
  { name: 'chol-factor', src: 'A = [4 2; 2 3]; R = chol(A);', vars: ['R'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra' },
  { name: 'svd-values', src: 's = svd([1 2; 3 4; 5 6]);', vars: ['s'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra' },
  { name: 'eig-values-sorted', src: 'e = sort(eig([2 -1 0; -1 2 -1; 0 -1 2]));', vars: ['e'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra' },

  // ── implicit expansion (broadcasting) ──
  { name: 'broadcast-sub-colvec', src: 'A = [1 2 3; 4 5 6; 7 8 9] - [10; 20; 30];', vars: ['A'], level: 'undergrad', domain: 'core-language' },
  { name: 'broadcast-mul-rowcol', src: 'P = [1; 2; 3] .* [10 20];', vars: ['P'], level: 'undergrad', domain: 'core-language' },
  { name: 'broadcast-compare', src: 'B = [1 2 3] > [2; 2; 2];', vars: ['B'], level: 'undergrad', domain: 'core-language' },

  // ── sparse basics (compared against the dense full() equivalent) ──
  { name: 'sparse-construct', src: 'S = sparse([1 2 3], [1 2 3], [10 20 30]);', vars: ['S'], level: 'graduate', domain: 'numerical-linear-algebra' },
  { name: 'sparse-nnz', src: 'n = nnz(sparse([0 1 0; 2 0 0]));', vars: ['n'], level: 'graduate', domain: 'numerical-linear-algebra' },
  { name: 'sparse-speye', src: 'F = full(speye(3));', vars: ['F'], level: 'graduate', domain: 'numerical-linear-algebra' },
  { name: 'sparse-matvec', src: 'S = sparse([1 0; 0 2]); y = S * [3; 4];', vars: ['y'], level: 'graduate', domain: 'numerical-linear-algebra' },
  { name: 'sparse-solve', src: 'S = sparse([2 1; 1 3]); x = S \\ [3; 5];', vars: ['x'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra' },
  { name: 'sparse-spdiags', src: 'D = spdiags([1; 2; 3], 0, 3, 3);', vars: ['D'], level: 'graduate', domain: 'numerical-linear-algebra' },

  // ── course golden scripts (end-to-end; MATLAB is the ground truth) ──
  { name: 'bisection-sqrt2', src: 'f = @(x) x.^2 - 2; a = 1; b = 2; for k = 1:60, m = (a+b)/2; if f(a)*f(m) <= 0, b = m; else, a = m; end, end; root = (a+b)/2;', vars: ['root'], tol: 1e-9, level: 'undergrad', domain: 'numerical-methods' },
  { name: 'gaussian-elimination', src: 'A = [2 1 -1; -3 -1 2; -2 1 2]; b = [8; -11; -3]; x = A\\b;', vars: ['x'], tol: 1e-9, level: 'undergrad', domain: 'numerical-methods' },
  { name: 'simpson-sin', src: 'n = 100; a = 0; b = pi; h = (b-a)/n; x = a:h:b; y = sin(x); S = y(1) + y(end) + 4*sum(y(2:2:end-1)) + 2*sum(y(3:2:end-2)); I = S*h/3;', vars: ['I'], tol: 1e-6, level: 'undergrad', domain: 'numerical-methods' },
  { name: 'euler-exp', src: 'n = 100000; h = 1/n; y = 1; for k = 1:n, y = y + h*y; end', vars: ['y'], tol: 1e-3, level: 'undergrad', domain: 'numerical-methods' },
  { name: 'secant-sqrt2', src: 'f = @(x) x.^2 - 2; x0 = 1; x1 = 2; for k = 1:30, fx0 = f(x0); fx1 = f(x1); if fx1 == fx0, break; end, x2 = x1 - fx1*(x1-x0)/(fx1-fx0); x0 = x1; x1 = x2; end; root = x1;', vars: ['root'], tol: 1e-9, level: 'undergrad', domain: 'numerical-methods' },
  { name: 'cholesky-solve', src: "A = [4 2; 2 3]; b = [6; 5]; R = chol(A); y = R.'\\b; x = R\\y;", vars: ['x'], tol: 1e-9, level: 'undergrad', domain: 'numerical-methods' },
  { name: 'newton-interp', src: 'x = [1 2 4]; y = [1 4 16]; n = numel(x); c = y; for j = 2:n, for i = n:-1:j, c(i) = (c(i)-c(i-1))/(x(i)-x(i-j+1)); end, end; t = 3; p = c(n); for i = n-1:-1:1, p = p*(t-x(i)) + c(i); end', vars: ['p'], tol: 1e-9, level: 'undergrad', domain: 'numerical-methods' },
  { name: 'rk4-exp', src: 'f = @(t, y) y; h = 0.01; y = 1; t = 0; for k = 1:100, k1 = f(t,y); k2 = f(t+h/2, y+h/2*k1); k3 = f(t+h/2, y+h/2*k2); k4 = f(t+h, y+h*k3); y = y + h/6*(k1+2*k2+2*k3+k4); t = t + h; end', vars: ['y'], tol: 1e-6, level: 'undergrad', domain: 'numerical-methods' },

  // ── quadrature & interpolation (curriculum algorithms; independently authored) ──
  { name: 'gauss2pt-quadrature', src: 'f = @(x) x.^3 + 2*x.^2 + 1; nodes = [-1/sqrt(3), 1/sqrt(3)]; I = f(nodes(1)) + f(nodes(2));', vars: ['I'], tol: 1e-9, level: 'undergrad', domain: 'approximation' },
  { name: 'interp1-linear-scalar', src: 'x = [0 1 2 3]; y = [0 1 4 9]; q = interp1(x, y, 1.5);', vars: ['q'], tol: 1e-9, level: 'undergrad', domain: 'approximation' },
  { name: 'interp1-linear-vector', src: 'x = [0 1 2 3]; y = [0 1 4 9]; q = interp1(x, y, [0.5 2.5]);', vars: ['q'], tol: 1e-9, level: 'undergrad', domain: 'approximation' },
  { name: 'pchip-interp', src: 'x = [0 1 2 3]; y = [0 1 4 9]; q = pchip(x, y, 1.5);', vars: ['q'], tol: 1e-6, level: 'undergrad', domain: 'approximation' },
  { name: 'spline-interp', src: 'x = [0 1 2 3]; y = [0 1 4 9]; q = spline(x, y, 1.5);', vars: ['q'], tol: 1e-6, level: 'undergrad', domain: 'approximation' },
  { name: 'polyint-definite', src: 'p = polyint([3 0 0]); v = polyval(p, 2) - polyval(p, 0);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'approximation' },

  // ── fundamentals: string / char operations (char-row & string outputs) ──
  { name: 'sprintf-int', src: "s = sprintf('%d/%d', 3, 4);", vars: ['s'], level: 'undergrad', domain: 'core-language' },
  { name: 'sprintf-float', src: "s = sprintf('%.2f', pi);", vars: ['s'], level: 'undergrad', domain: 'core-language' },
  { name: 'num2str-int', src: 's = num2str(42);', vars: ['s'], level: 'undergrad', domain: 'core-language' },
  { name: 'strcat-char', src: "s = strcat('foo', 'bar');", vars: ['s'], level: 'undergrad', domain: 'core-language' },
  { name: 'strrep', src: "s = strrep('a-b-c', '-', '+');", vars: ['s'], level: 'undergrad', domain: 'core-language' },
  { name: 'upper-lower', src: "a = upper('abc'); b = lower('XYZ');", vars: ['a', 'b'], level: 'undergrad', domain: 'core-language' },
  { name: 'regexprep-digits', src: "s = regexprep('a1b2c3', '\\d', '#');", vars: ['s'], level: 'undergrad', domain: 'core-language' },
  { name: 'strtrim', src: "s = strtrim('  hi  ');", vars: ['s'], level: 'undergrad', domain: 'core-language' },
  { name: 'fliplr-char', src: "s = fliplr('abcd');", vars: ['s'], level: 'undergrad', domain: 'core-language' },

  // ── fundamentals: logical & data-wrangling ──
  { name: 'find-nonzero', src: 'idx = find([0 3 0 5 0 7]);', vars: ['idx'], level: 'undergrad', domain: 'core-language' },
  { name: 'any-all', src: 'a = any([0 0 1]); b = all([1 1 0]);', vars: ['a', 'b'], level: 'undergrad', domain: 'core-language' },
  { name: 'masked-assign', src: 'A = [-1 2 -3 4]; A(A < 0) = 0;', vars: ['A'], level: 'undergrad', domain: 'core-language' },
  { name: 'sort-descend', src: "[s, i] = sort([3 1 2], 'descend');", vars: ['s', 'i'], level: 'undergrad', domain: 'core-language' },
  { name: 'sortrows-2col', src: 'B = sortrows([3 1; 1 2; 2 0]);', vars: ['B'], level: 'undergrad', domain: 'core-language' },
  { name: 'unique-values', src: 'u = unique([3 1 4 1 5 9 2 6]);', vars: ['u'], level: 'undergrad', domain: 'core-language' },
  { name: 'histcounts', src: 'nc = histcounts([1 2 2 3 3 3], 1:4);', vars: ['nc'], level: 'undergrad', domain: 'core-language' },
  { name: 'cumprod', src: 'c = cumprod([1 2 3 4]);', vars: ['c'], level: 'undergrad', domain: 'core-language' },
  { name: 'accumarray', src: 'v = accumarray([1; 2; 1; 3], [10; 20; 30; 40]);', vars: ['v'], level: 'undergrad', domain: 'core-language' },

  // ── fundamentals: reshape / colon tricks ──
  { name: 'repmat-tile', src: 'A = repmat([1 2], 2, 3);', vars: ['A'], level: 'undergrad', domain: 'core-language' },
  { name: 'circshift', src: 'v = circshift([1 2 3 4 5], 2);', vars: ['v'], level: 'undergrad', domain: 'core-language' },
  { name: 'flipud', src: 'A = flipud([1 2; 3 4]);', vars: ['A'], level: 'undergrad', domain: 'core-language' },
  { name: 'cat-3d', src: 'C = cat(3, [1 2; 3 4], [5 6; 7 8]);', vars: ['C'], level: 'undergrad', domain: 'core-language' },

  // ── fundamentals: elementary-function domains ──
  { name: 'atan2', src: 'a = atan2(1, 1);', vars: ['a'], tol: 1e-9, level: 'undergrad', domain: 'core-language' },
  { name: 'hypot', src: 'h = hypot(3, 4);', vars: ['h'], level: 'undergrad', domain: 'core-language' },

  // ── structs ──
  { name: 'struct-nested-assign', src: 'S.a.b = 7; x = S.a.b;', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'struct-array-rw', src: 'S(1).x = 1; S(2).x = 5; n = numel(S); y = S(2).x;', vars: ['n', 'y'], level: 'undergrad', domain: 'core-language' },
  { name: 'struct-array-default-empty', src: 'S(3).x = 9; e = isempty(S(1).x);', vars: ['e'], level: 'undergrad', domain: 'core-language' },
  { name: 'struct-field-extract', src: 'S(1).v = 10; S(2).v = 20; w = [S.v];', vars: ['w'], level: 'undergrad', domain: 'core-language' },

  // ── short-circuit operators (RHS must not be evaluated) ──
  { name: 'shortcircuit-and', src: 'a = false && nosuchfn();', vars: ['a'], level: 'undergrad', domain: 'core-language' },
  { name: 'shortcircuit-or', src: 'b = true || nosuchfn();', vars: ['b'], level: 'undergrad', domain: 'core-language' },
  { name: 'shortcircuit-combined', src: 'c = (3 > 2) && (1 < 2);', vars: ['c'], level: 'undergrad', domain: 'core-language' },

  // ── ignored outputs (~) ──
  { name: 'ignored-output-max', src: '[~, idx] = max([3 9 1]);', vars: ['idx'], level: 'undergrad', domain: 'core-language' },
  { name: 'ignored-output-size', src: '[~, nc] = size([1 2 3; 4 5 6]);', vars: ['nc'], level: 'undergrad', domain: 'core-language' },

  // ── switch with cell-array cases ──
  { name: 'switch-cell-hit', src: 'x = 2; switch x, case {1, 2, 3}, y = 10; otherwise, y = 0; end', vars: ['y'], level: 'undergrad', domain: 'core-language' },
  { name: 'switch-cell-miss', src: 'x = 7; switch x, case {1, 2, 3}, y = 10; otherwise, y = 0; end', vars: ['y'], level: 'undergrad', domain: 'core-language' },

  // ── string class ──
  { name: 'string-concat-plus', src: 's = "foo" + "bar";', vars: ['s'], level: 'undergrad', domain: 'core-language' },
  { name: 'string-equality', src: 'e = ("abc" == "abc");', vars: ['e'], level: 'undergrad', domain: 'core-language' },

  // ── empty-reduction shapes along a dimension ──
  { name: 'sum-empty-dim1', src: 'x = sum([], 1);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'sum-empty-dim2', src: 'x = sum([], 2);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'prod-empty-dim1', src: 'x = prod([], 1);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'prod-empty-dim2', src: 'x = prod([], 2);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'max-empty-dim1', src: 'x = max([], [], 1);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'max-empty-dim2', src: 'x = max([], [], 2);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'grow-empty-linear', src: 'A = []; A(1) = 5;', vars: ['A'], level: 'undergrad', domain: 'core-language' },
  { name: 'flatten-2x2', src: 'A = [1 2; 3 4]; x = A(:);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'logical-linear-mask', src: 'A = [1 2; 3 4]; m = A([true false true false]);', vars: ['m'], level: 'undergrad', domain: 'core-language' },
  { name: 'matrix-gt2-mask', src: 'A = [1 2; 3 4]; m = A(A > 2);', vars: ['m'], level: 'undergrad', domain: 'core-language' },

  // ── NaN / 'omitnan' ──
  { name: 'sum-nan', src: 'x = sum([1 NaN]);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'sum-omitnan', src: "x = sum([1 NaN], 'omitnan');", vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'mean-nan', src: 'x = mean([1 NaN]);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'mean-omitnan', src: "x = mean([1 NaN], 'omitnan');", vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'max-nan', src: 'x = max([NaN 1]);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'min-nan', src: 'x = min([NaN 1]);', vars: ['x'], level: 'undergrad', domain: 'core-language' },
  { name: 'max-omitnan', src: "x = max([NaN 1], [], 'omitnan');", vars: ['x'], level: 'undergrad', domain: 'core-language' },

  // ── complex relational / ordering (MATLAB compares real parts for </>, magnitude for sort/max) ──
  { name: 'complex-lt', src: 'x = (1+1i) < 2;', vars: ['x'], level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'complex-sort', src: 'x = sort([1+1i 2]);', vars: ['x'], level: 'undergrad', domain: 'complex-arithmetic' },
  { name: 'complex-max-mag', src: 'x = max([1+1i 2]);', vars: ['x'], level: 'undergrad', domain: 'complex-arithmetic' },

  // ── vector arithmetic (magnitude, dot/cross/norm, angles, normalization) ──
  { name: 'vec-mag-2d', src: 'v = [2 2]; mag = sqrt(v(1)^2 + v(2)^2);', vars: ['mag'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra' },
  { name: 'vec-mag-3d', src: 'v = [4 5 5]; mag = sqrt(v(1)^2 + v(2)^2 + v(3)^2);', vars: ['mag'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra' },
  { name: 'atand-neg', src: 't = atand(-3/2);', vars: ['t'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra' },
  { name: 'vec-add', src: 'u = [0 2]; v = [2 2]; w = u + v;', vars: ['w'], level: 'undergrad', domain: 'linear-algebra' },
  { name: 'vec-sub', src: 'a = [-0.1 0.2 9.53]; b = [5.095 -0.04 9.5]; c = b - a;', vars: ['c'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra' },
  { name: 'scalar-vec-mul', src: 'u = [0.5 2 -2]; au = 0.5 * u;', vars: ['au'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra' },
  { name: 'dot-product', src: 'd = dot([2 4 -1], [-1 3 2]);', vars: ['d'], level: 'undergrad', domain: 'linear-algebra' },
  { name: 'angle-between', src: 'u = [2 4 -1]; v = [-1 3 2]; t = acosd(dot(u,v) / (norm(u)*norm(v)));', vars: ['t'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra' },
  { name: 'cross-product', src: 'c = cross([1 3 6], [1 0 2]);', vars: ['c'], level: 'undergrad', domain: 'linear-algebra' },
  { name: 'normalize-vector', src: 'a = [-0.077 0.038 9.538]; an = a / norm(a);', vars: ['an'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra' },
  { name: 'vector-frame-chain', src: 'a = [-0.077 0.038 9.538]; m = [-15.188 12.563 -49.625]; an = a/norm(a); mn = m/norm(m); d = -an; dxm = cross(d, mn); e = dxm/norm(dxm); n = cross(e, d); psi = acosd(dot([0 1 0], n) / (norm([0 1 0])*norm(n)));', vars: ['e', 'psi'], tol: 1e-6, level: 'undergrad', domain: 'linear-algebra' },

  // ── linear algebra: core matrix operations ──
  { name: 'la-add-mul', src: 'A = [1 2 3; 4 5 6; 7 8 10]; B = [2 0 1; 1 3 4; 5 6 0]; C = A + B; D = A * B;', vars: ['C', 'D'], level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'la-transpose', src: "A = [1 2 3; 4 5 6; 7 8 10]; E = A.'; F = A';", vars: ['E', 'F'], level: 'undergrad', domain: 'numerical-linear-algebra' },

  // ── linear algebra: determinant / inverse / rank ──
  { name: 'la-det-inv-rank', src: 'A = [2 1 3; 1 0 2; 4 1 8]; detA = det(A); invA = inv(A); r = rank(A);', vars: ['detA', 'invA', 'r'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'la-inv-check', src: 'A = [2 1 3; 1 0 2; 4 1 8]; check = A * inv(A);', vars: ['check'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra' },

  // ── linear algebra: solving systems ──
  { name: 'la-solve-backslash', src: 'A = [3 -1 2; 1 4 -2; 2 -3 5]; b = [10; -1; 7]; x1 = A\\b; residual = norm(A*x1 - b);', vars: ['x1', 'residual'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra' },
  { name: 'la-solve-inv', src: 'A = [3 -1 2; 1 4 -2; 2 -3 5]; b = [10; -1; 7]; x2 = inv(A) * b;', vars: ['x2'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra' },

  // ── linear algebra: rank-deficient / null space (invariants, not the basis) ──
  { name: 'la-null-space', src: 'A = [1 2 3; 2 4 6; 1 1 1]; r = rank(A); N = null(A); nc = norm(A*N); dn = size(N, 2);', vars: ['r', 'nc', 'dn'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra' },

  // ── linear algebra: eigenanalysis (sorted values + reconstruction residual, not raw V) ──
  { name: 'la-eig-invariants', src: 'A = [4 1; 2 3]; [V, D] = eig(A); ev = sort(diag(D)); rr = norm(V*D*inv(V) - A);', vars: ['ev', 'rr'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra' },

  // ── linear algebra: Markov chains ──
  { name: 'markov-p10', src: 'P = [0.8 0.2 0; 0.1 0.7 0.2; 0 0.3 0.7]; r = [1 0 0]; r10 = r * P^10;', vars: ['r10'], tol: 1e-6, level: 'graduate', domain: 'statistics' },
  { name: 'markov-eig', src: 'P = [0.8 0.2 0; 0.1 0.7 0.2; 0 0.3 0.7]; ev = sort(real(eig(P)));', vars: ['ev'], tol: 1e-6, level: 'graduate', domain: 'statistics' },

  // ── vector mechanics (resultant force + moment about origin) ──
  { name: 'mechanics-resultant', src: 'A = [0 0 6]; B = [0 2.5 0]; C = [2 -3 0]; uAC = (C-A)/norm(C-A); uAB = (B-A)/norm(B-A); FR = uAC*462 + uAB*858;', vars: ['FR'], tol: 1e-6, level: 'undergrad', domain: 'linear-algebra' },
  { name: 'mechanics-moment', src: 'A = [0 0 6]; B = [0 2.5 0]; C = [2 -3 0]; FR = (C-A)/norm(C-A)*462 + (B-A)/norm(B-A)*858; MR = cross(A, FR); Mx = dot(MR, [1 0 0]); My = dot(MR, [0 1 0]);', vars: ['Mx', 'My'], tol: 1e-6, level: 'undergrad', domain: 'linear-algebra' },

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
  { name: 'stat-entropy-kl', src: 'p = [0.5 0.25 0.25]; q = [0.25 0.25 0.5]; H = -sum(p.*log2(p)); KL = sum(p.*log2(p./q));', vars: ['H', 'KL'], tol: 1e-9, level: 'graduate', domain: 'statistics', tags: ['information-theory', 'entropy', 'kl-divergence'] },

  // ══════════ optimization ══════════
  { name: 'opt-golden-section', src: 'f = @(x)(x-2).^2; a = 0; b = 5; g = (sqrt(5)-1)/2; c = b-g*(b-a); d = a+g*(b-a); for k = 1:60, if f(c) < f(d), b = d; else, a = c; end, c = b-g*(b-a); d = a+g*(b-a); end; xmin = (a+b)/2;', vars: ['xmin'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['line-search', 'golden-section'] },
  { name: 'opt-gradient-descent', src: 'Q = [3 0; 0 1]; x = [5; 5]; for k = 1:200, x = x - 0.1*(Q*x); end', vars: ['x'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['gradient-descent', 'quadratic'] },
  { name: 'opt-newton-min', src: 'x = 3; for k = 1:20, x = x - (2*(x-2))/2; end', vars: ['x'], tol: 1e-9, level: 'graduate', domain: 'optimization', tags: ['newton', 'minimization'] },

  // ══════════ numerical PDEs ══════════
  { name: 'pde-poisson-1d', src: 'n = 5; h = 1/(n+1); A = 2*eye(n) - diag(ones(n-1,1),1) - diag(ones(n-1,1),-1); f = ones(n,1)*h^2; u = A\\f;', vars: ['u'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['finite-difference', 'poisson', 'dirichlet'] },
  { name: 'pde-heat-1d-step', src: "u = [0 1 2 3 2 1 0]'; r = 0.4; n = numel(u); un = u; for i = 2:n-1, un(i) = u(i) + r*(u(i+1) - 2*u(i) + u(i-1)); end; un(1) = 0; un(end) = 0;", vars: ['un'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['finite-difference', 'heat-equation', 'explicit'] },
  { name: 'pde-fem-1d-stiffness', src: 'n = 4; K = zeros(n+1); for e = 1:n, K(e,e) = K(e,e)+1; K(e,e+1) = K(e,e+1)-1; K(e+1,e) = K(e+1,e)-1; K(e+1,e+1) = K(e+1,e+1)+1; end', vars: ['K'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['finite-element', 'stiffness-assembly'] },

  // ── PDE / CFD extraction batch (own implementations of standard schemes; topics from MW teaching resources) ──
  { name: 'pde-heat-ftcs-multistep', src: 'n = 5; u = [0; 1; 1; 1; 0]; r = 0.4; for k = 1:10, un = u; for i = 2:n-1, un(i) = u(i) + r*(u(i+1) - 2*u(i) + u(i-1)); end, un(1) = 0; un(n) = 0; u = un; end', vars: ['u'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['finite-difference', 'heat-equation', 'ftcs', 'time-stepping'] },
  { name: 'pde-heat-backward-euler', src: 'n = 5; h = 1/(n+1); dt = 0.01; r = dt/h^2; A = (1+2*r)*eye(n) - r*diag(ones(n-1,1),1) - r*diag(ones(n-1,1),-1); u = ones(n,1); for k = 1:5, u = A\\u; end', vars: ['u'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['finite-difference', 'heat-equation', 'backward-euler', 'implicit'] },
  { name: 'pde-heat-crank-nicolson', src: 'n = 5; h = 1/(n+1); dt = 0.01; r = dt/(2*h^2); L = diag(ones(n-1,1),1) - 2*eye(n) + diag(ones(n-1,1),-1); A = eye(n) - r*L; B = eye(n) + r*L; u = ones(n,1); for k = 1:5, u = A\\(B*u); end', vars: ['u'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['finite-difference', 'heat-equation', 'crank-nicolson'] },
  { name: 'pde-laplace-2d-stencil', src: 'n = 3; e = ones(n,1); T = spdiags([e -2*e e], [-1 0 1], n, n); I = speye(n); L = kron(I, T) + kron(T, I); v = full(L(5,:));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['sparse-assembly', 'spdiags', 'kron', 'laplacian-2d'] },
  { name: 'pde-poisson-2d-residual', src: 'n = 3; e = ones(n,1); T = spdiags([e -2*e e], [-1 0 1], n, n); I = speye(n); L = kron(I, T) + kron(T, I); b = ones(n^2, 1); u = L\\b; res = norm(L*u - b);', vars: ['res'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['sparse-solve', 'poisson-2d', 'residual-invariant'] },
  { name: 'pde-reaction-diffusion-step', src: 'n = 5; u = [0.1; 0.2; 0.3; 0.2; 0.1]; r = 0.3; un = u; for i = 2:n-1, un(i) = u(i) + r*(u(i+1) - 2*u(i) + u(i-1)) + u(i)*(1 - u(i)); end; un(1) = u(1); un(n) = u(n);', vars: ['un'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['reaction-diffusion', 'fisher-kpp', 'finite-difference'] },
  { name: 'pde-advection-upwind', src: 'n = 8; u = zeros(n,1); u(3:5) = 1; cfl = 1; for k = 1:2, un = u; for i = 2:n, un(i) = u(i) - cfl*(u(i) - u(i-1)); end, un(1) = 0; u = un; end', vars: ['u'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['advection', 'upwind', 'method-of-characteristics'] },
  { name: 'pde-parabolic-stability', src: 'n = 5; r = 0.4; A = (1-2*r)*eye(n) + r*diag(ones(n-1,1),1) + r*diag(ones(n-1,1),-1); rho = max(abs(eig(A)));', vars: ['rho'], tol: 1e-6, level: 'graduate', domain: 'numerical-pde', tags: ['stability', 'spectral-radius', 'von-neumann'] },
  { name: 'pde-distributed-consensus', src: 'A = [0 1 0 1; 1 0 1 0; 0 1 0 1; 1 0 1 0]; D = diag(sum(A, 2)); L = D - A; W = eye(4) - 0.2*L; x = [1; 2; 3; 4]; for k = 1:200, x = W*x; end', vars: ['x'], tol: 1e-6, level: 'graduate', domain: 'graph', tags: ['distributed-optimization', 'consensus', 'graph-laplacian'] },
  { name: 'pde-fd-hamiltonian-eig', src: 'n = 20; h = 1/(n+1); D2 = (diag(ones(n-1,1),1) - 2*eye(n) + diag(ones(n-1,1),-1))/h^2; H = -0.5*D2; E = sort(eig(H)); v = E(1:3);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-pde', tags: ['finite-difference', 'eigenproblem', 'schrodinger', 'particle-in-box'] },

  // ── Applied-PDEs: nonlinear conservation laws, shocks, wave equation, classification ──
  { name: 'pde-burgers-godunov', src: "n = 11; x = linspace(0,1,n)'; u = 1.0*(x<0.5) + 0.2*(x>=0.5); dx = 1/(n-1); dt = 0.04; for k = 1:5, f = u.^2/2; un = u; for i = 2:n, un(i) = u(i) - (dt/dx)*(f(i) - f(i-1)); end, un(1) = u(1); u = un; end", vars: ['u'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['burgers', 'conservation-law', 'godunov', 'nonlinear-hyperbolic'] },
  { name: 'pde-traffic-shock-speed', src: 'fl = @(u) u.*(1 - u); uL = 0.1; uR = 0.6; s = (fl(uR) - fl(uL))/(uR - uL);', vars: ['s'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['lwr-traffic', 'rankine-hugoniot', 'shock-speed'] },
  { name: 'pde-wave-leapfrog', src: "n = 11; c = 1; dx = 0.1; dt = 0.05; lam = (c*dt/dx)^2; x = linspace(0,1,n)'; u0 = sin(pi*x); un = u0; for i = 2:n-1, un(i) = u0(i) + 0.5*lam*(u0(i+1) - 2*u0(i) + u0(i-1)); end; un(1) = 0; un(n) = 0; up = u0; u = un; for k = 1:5, un = u; for i = 2:n-1, un(i) = 2*u(i) - up(i) + lam*(u(i+1) - 2*u(i) + u(i-1)); end, un(1) = 0; un(n) = 0; up = u; u = un; end", vars: ['u'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['wave-equation', 'leapfrog', 'ctcs', 'hyperbolic'] },
  { name: 'pde-classification-discriminant', src: 'P = [1 0 1; 1 0 0; 1 0 -1]; v = P(:,2).^2 - 4.*P(:,1).*P(:,3);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['classification', 'discriminant', 'elliptic-parabolic-hyperbolic'] },
  { name: 'pde-separation-of-variables', src: 'x = 0.5; t = 0.05; u = 0; for nn = 1:2:11, bn = 4/(nn*pi); u = u + bn*sin(nn*pi*x)*exp(-(nn*pi)^2*t); end;', vars: ['u'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['separation-of-variables', 'fourier-series', 'heat-equation'] },
  { name: 'pde-steady-heat-2d', src: 'n = 3; e = ones(n,1); T = spdiags([e -2*e e], [-1 0 1], n, n); I = speye(n); L = kron(I, T) + kron(T, I); b = zeros(n^2, 1); b(n^2-n+1:n^2) = -1; u = L\\b; uc = u(5);', vars: ['uc'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['laplace-2d', 'steady-heat', 'dirichlet', 'sparse-solve'] },

  // ── advection (periodic BC via circshift) + sparse Crank-Nicolson + larger 2-D Poisson ──
  { name: 'pde-advection-upwind-periodic', src: 'N = 50; x = linspace(0,1,N+1); x(end) = []; dx = 1/N; c = 1; dt = 0.5*dx; nt = round(1/dt); u = exp(-100*(x-0.3).^2); for n = 1:nt, u = u - c*dt/dx*(u - circshift(u,1)); end; mass = sum(u)*dx; peak = max(u);', vars: ['mass', 'peak'], tol: 1e-6, level: 'graduate', domain: 'numerical-pde', tags: ['advection', 'upwind', 'periodic', 'cfl'] },
  { name: 'pde-advection-lax-friedrichs', src: 'N = 60; x = linspace(0,1,N+1); x(end) = []; dx = 1/N; dt = 0.8*dx; u = double(x>0.25 & x<0.5); for n = 1:20, u = 0.5*(circshift(u,-1)+circshift(u,1)) - dt/(2*dx)*(circshift(u,-1)-circshift(u,1)); end; mass = sum(u)*dx; tv = sum(abs(diff([u u(1)])));', vars: ['mass', 'tv'], tol: 1e-6, level: 'graduate', domain: 'numerical-pde', tags: ['advection', 'lax-friedrichs', 'total-variation'] },
  { name: 'pde-advection-lax-wendroff', src: "N = 50; x = linspace(0,1,N+1); x(end) = []; dx = 1/N; c = 1; dt = 0.5*dx; nu = c*dt/dx; u = exp(-100*(x-0.3).^2); for n = 1:round(0.5/dt), ip = circshift(u,-1); im = circshift(u,1); u = u - nu/2*(ip - im) + nu^2/2*(ip - 2*u + im); end; mass = sum(u)*dx; peak = max(u);", vars: ['mass', 'peak'], tol: 1e-6, level: 'graduate', domain: 'numerical-pde', tags: ['advection', 'lax-wendroff', 'second-order', 'low-diffusion'] },
  { name: 'pde-heat-cn-spdiags', src: "n = 8; h = 1/(n+1); r = 0.4; e = ones(n,1); T = spdiags([e -2*e e], -1:1, n, n); A = speye(n) - r/2*T; B = speye(n) + r/2*T; u = sin(pi*(1:n)'*h); for k = 1:5, u = A\\(B*u); end; energy = norm(u);", vars: ['energy'], tol: 1e-6, level: 'graduate', domain: 'numerical-pde', tags: ['heat-equation', 'crank-nicolson', 'spdiags', 'sparse'] },
  { name: 'pde-poisson-2d-kron', src: 'n = 5; e = ones(n,1); T = spdiags([e -2*e e], -1:1, n, n); A = kron(speye(n), T) + kron(T, speye(n)); b = ones(n*n, 1); u = A\\b; resid = norm(A*u - b);', vars: ['resid'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['poisson', 'finite-difference', 'kron', 'sparse'] },
  // ── finite-volume conservation, spectral (FFT) differentiation, PDE eigenproblem ──
  { name: 'pde-finite-volume-advection', src: "N = 40; dx = 1/N; x = ((1:N)' - 0.5)*dx; c = 1; dt = 0.5*dx; u = double(x>0.3 & x<0.6); m0 = sum(u)*dx; for n = 1:30, u = u - c*dt/dx*(u - circshift(u,1)); end; mass = sum(u)*dx; dm = mass - m0;", vars: ['mass', 'dm'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['finite-volume', 'upwind-flux', 'conservation'] },
  { name: 'pde-spectral-fft-derivative', src: 'N = 16; x = 2*pi*(0:N-1)/N; u = sin(x); k = [0:N/2-1 0 -N/2+1:-1]; du = real(ifft(1i*k.*fft(u))); err = max(abs(du - cos(x)));', vars: ['err'], tol: 1e-8, level: 'graduate', domain: 'numerical-pde', tags: ['spectral', 'pseudospectral', 'fft-differentiation'] },
  { name: 'pde-laplacian-eig-2d', src: 'n = 4; e = ones(n,1); T = spdiags([e -2*e e], -1:1, n, n); I = speye(n); L = kron(I, T) + kron(T, I); ev = sort(eig(full(-L))); v = ev(1);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-pde', tags: ['pde-eigenvalue', 'laplacian-modes', 'finite-difference'] },
  { name: 'pde-cfl-monotonicity', src: "N = 40; dx = 1/N; x = ((1:N)' - 0.5)*dx; cfl = 1; u = double(x>0.3 & x<0.6); pk0 = max(u); for n = 1:25, u = u - cfl*(u - circshift(u,1)); end; pk = max(u); over = pk - pk0;", vars: ['pk', 'over'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['advection', 'cfl', 'monotonicity', 'no-overshoot', 'robustness'] },

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
  { name: 'val-bvp4c-sine', src: "solinit = bvpinit(linspace(0,1,5), [0 1]); sol = bvp4c(@(x,y)[y(2); -y(1)], @(ya,yb)[ya(1); yb(1)-1], solinit); yy = deval(sol, 0.5); v = yy(1);", vars: ['v'], tol: 1e-3, level: 'graduate', domain: 'numerical-ode', tags: ['bvp4c', 'boundary-value-problem', 'deval', 'oracle-validation'] },
  { name: 'val-dde23', src: 'sol = dde23(@(t,y,Z) -Z, 1, 1, [0 5]); v = deval(sol, 5);', vars: ['v'], tol: 1e-2, level: 'graduate', domain: 'numerical-ode', tags: ['dde23', 'delay-differential-equation', 'oracle-validation'] },
  { name: 'sde-euler-maruyama-gbm', src: 'mu = 0.1; sigma = 0.2; X = 1; dt = 0.25; dW = [0.1 -0.2 0.15 0.05]; for k = 1:4, X = X + mu*X*dt + sigma*X*dW(k); end; v = X;', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-ode', tags: ['sde', 'euler-maruyama', 'geometric-brownian-motion', 'prescribed-path'] },
  // ── stiff stability: A-stability, stability functions, implicit vs explicit amplification ──
  { name: 'ode-stiff-backward-euler', src: 'y = 1; dt = 0.1; lam = -50; for k = 1:20, y = y/(1 - lam*dt); end; v = y;', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-ode', tags: ['stiff', 'backward-euler', 'a-stable', 'bounded'] },
  { name: 'ode-stability-functions', src: 'z = -10; v = [abs(1/(1 - z)); abs((1 + z/2)/(1 - z/2))];', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-ode', tags: ['stiff', 'stability-function', 'backward-euler', 'trapezoidal'] },
  { name: 'ode-astability-trapezoidal', src: 'w = [1 2 5 10]; R = (1 + 1i*w/2)./(1 - 1i*w/2); v = abs(R);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-ode', tags: ['a-stable', 'trapezoidal', 'imaginary-axis', 'energy-preserving'] },
  { name: 'ode-stiff-explicit-unstable', src: 'y = 1; dt = 0.1; lam = -50; for k = 1:10, y = y + lam*dt*y; end; v = abs(y);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-ode', tags: ['stiff', 'explicit-euler', 'instability', 'amplification'] },
  { name: 'ode-stiff-amplification-ratio', src: 'dt = 0.1; lam = -50; Rimp = 1/(1 - lam*dt); Rexp = 1 + lam*dt; v = [abs(Rimp); abs(Rexp)];', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-ode', tags: ['stiff', 'implicit-vs-explicit', 'stability-region'] },

  // ── validation: optimization (unique minimizers; iterative tol) ──
  { name: 'val-fminbnd', src: 'x = fminbnd(@(x)(x-2).^2, 0, 5);', vars: ['x'], tol: 1e-4, level: 'graduate', domain: 'optimization', tags: ['fminbnd', 'oracle-validation'] },
  { name: 'val-fminsearch', src: 'x = fminsearch(@(v)(v(1)-1)^2 + (v(2)-2)^2, [0 0]);', vars: ['x'], tol: 1e-4, level: 'graduate', domain: 'optimization', tags: ['fminsearch', 'nelder-mead', 'oracle-validation'] },
  { name: 'val-fsolve', src: 'x = fsolve(@(x) x^2 - 2, 1);', vars: ['x'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['fsolve', 'oracle-validation'] },
  { name: 'val-quadprog', src: 'x = quadprog([2 0; 0 2], [-2; -4]);', vars: ['x'], tol: 1e-5, level: 'graduate', domain: 'optimization', tags: ['quadprog', 'oracle-validation'] },
  { name: 'val-lsqlin', src: 'x = lsqlin([1 1; 1 2; 1 3], [1; 2; 2]);', vars: ['x'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['lsqlin', 'least-squares', 'oracle-validation'] },
  { name: 'val-fminunc', src: 'x = fminunc(@(z)(z(1)-2)^2 + (z(2)-3)^2, [0; 0]);', vars: ['x'], tol: 1e-4, level: 'graduate', domain: 'optimization', tags: ['fminunc', 'unconstrained', 'oracle-validation'] },
  { name: 'val-fmincon-bounds', src: 'x = fmincon(@(z)(z(1)-2)^2 + (z(2)-3)^2, [0; 0], [], [], [], [], [0; 0], [1; 1]);', vars: ['x'], tol: 1e-4, level: 'graduate', domain: 'optimization', tags: ['fmincon', 'bound-constrained', 'oracle-validation'] },
  { name: 'val-lsqnonlin', src: 'x = lsqnonlin(@(z)[z(1)-1; z(2)-2], [0; 0]);', vars: ['x'], tol: 1e-5, level: 'graduate', domain: 'optimization', tags: ['lsqnonlin', 'least-squares', 'oracle-validation'] },
  { name: 'val-lsqcurvefit', src: 'c = lsqcurvefit(@(c, xd) c*xd, 1, [1 2 3], [2 4 6]);', vars: ['c'], tol: 1e-5, level: 'graduate', domain: 'optimization', tags: ['lsqcurvefit', 'least-squares', 'oracle-validation'] },
  { name: 'val-fminunc-quadratic', src: 'x = fminunc(@(v)(v(1)-2)^2 + 3*(v(2)+1)^2, [0 0]);', vars: ['x'], tol: 1e-4, level: 'graduate', domain: 'optimization', tags: ['fminunc', 'anisotropic', 'oracle-validation'] },
  { name: 'val-lsqnonlin-circle', src: 'x = lsqnonlin(@(v)[v(1)^2+v(2)^2-1; v(1)-v(2)], [1 0]);', vars: ['x'], tol: 1e-4, level: 'graduate', domain: 'optimization', tags: ['lsqnonlin', 'nonlinear-least-squares', 'oracle-validation'] },
  { name: 'val-fmincon-nonlcon', src: "nl = @(x) deal(x(1)^2 + x(2)^2 - 1, []); x = fmincon(@(x) -x(1) - x(2), [0.1; 0.1], [], [], [], [], [], [], nl); v = x;", vars: ['v'], tol: 1e-4, level: 'graduate', domain: 'optimization', tags: ['fmincon', 'nonlinear-constraint', 'kkt', 'oracle-validation'] },
  { name: 'opt-ista-lasso', src: "A = [1 0.5; 0.5 1]; b = [1; 2]; lam = 0.1; x = [0; 0]; Lc = norm(A)^2; for k = 1:500, z = x - (A'*(A*x - b))/Lc; x = sign(z).*max(abs(z) - lam/Lc, 0); end; v = x;", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['proximal-gradient', 'ista', 'lasso', 'soft-threshold'] },
  { name: 'opt-admm-lasso-small', src: "A = [1 0.5; 0.5 1]; b = [1; 2]; lam = 0.1; rho = 1; x = [0; 0]; z = [0; 0]; u = [0; 0]; M = A'*A + rho*eye(2); Atb = A'*b; for k = 1:200, x = M\\(Atb + rho*(z - u)); w = x + u; z = sign(w).*max(abs(w) - lam/rho, 0); u = u + x - z; end; v = z;", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['admm', 'lasso', 'splitting', 'convex'] },
  { name: 'opt-projected-gradient-simplex', src: "Q = [2 0; 0 1]; c = [1; 3]; x = [0.5; 0.5]; alpha = 0.2; for k = 1:300, y = x - alpha*(Q*x - c); u = sort(y, 'descend'); cs = cumsum(u); idx = (1:numel(u))'; rho = find(u - (cs - 1)./idx > 0, 1, 'last'); theta = (cs(rho) - 1)/rho; x = max(y - theta, 0); end; v = x; s = sum(x);", vars: ['v', 's'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['projected-gradient', 'simplex-projection', 'convex', 'feasibility'] },
  { name: 'val-fmincon-bounds-nonlcon', src: "nl = @(x) deal(x(1)^2 + x(2)^2 - 1, []); x = fmincon(@(x) -x(1) - x(2), [0.1; 0.1], [], [], [], [], [0; 0], [0.5; 1], nl); v = x;", vars: ['v'], tol: 1e-4, level: 'graduate', domain: 'optimization', tags: ['fmincon', 'bounds', 'nonlinear-constraint', 'combined', 'robustness'] },
  { name: 'opt-lsqnonlin-inverse', src: 't = [0 1 2 3]; y = 2*exp(-0.5*t); x = lsqnonlin(@(p) p(1)*exp(p(2)*t) - y, [1 -1]); rfit = norm(x - [2 -0.5]);', vars: ['rfit'], tol: 1e-5, level: 'graduate', domain: 'optimization', tags: ['lsqnonlin', 'parameter-estimation', 'inverse-problem', 'robustness'] },

  // ── validation: interpolation / polynomials ──
  { name: 'val-interp2', src: '[X, Y] = meshgrid(1:3, 1:3); Z = X + Y; q = interp2(X, Y, Z, 1.5, 2.5);', vars: ['q'], tol: 1e-9, level: 'undergrad', domain: 'approximation', tags: ['interp2', 'oracle-validation'] },
  { name: 'val-ppval', src: 'pp = spline([0 1 2 3], [0 1 4 9]); q = ppval(pp, 1.5);', vars: ['q'], tol: 1e-6, level: 'undergrad', domain: 'approximation', tags: ['ppval', 'spline', 'oracle-validation'] },
  { name: 'val-gridded-interpolant', src: 'F = griddedInterpolant([1 2 3], [2 4 6]); q = F(2.5);', vars: ['q'], tol: 1e-9, level: 'undergrad', domain: 'approximation', tags: ['griddedInterpolant', 'oracle-validation'] },
  { name: 'val-interp3', src: 'q = interp3(reshape(1:8, 2, 2, 2), 1.5, 1.5, 1.5);', vars: ['q'], tol: 1e-9, level: 'undergrad', domain: 'approximation', tags: ['interp3', 'oracle-validation'] },
  // scattered interpolation on a PLANAR field z=x+2y → exact regardless of triangulation (convention-independent)
  { name: 'val-scattered-interpolant', src: 'F = scatteredInterpolant([0; 1; 0; 1], [0; 0; 1; 1], [0; 1; 2; 3]); q = F(0.5, 0.5);', vars: ['q'], tol: 1e-6, level: 'graduate', domain: 'approximation', tags: ['scatteredInterpolant', 'planar-invariant', 'oracle-validation'] },
  { name: 'val-griddata', src: 'q = griddata([0 1 0 1], [0 0 1 1], [0 1 2 3], 0.5, 0.5);', vars: ['q'], tol: 1e-6, level: 'graduate', domain: 'approximation', tags: ['griddata', 'planar-invariant', 'oracle-validation'] },
  { name: 'val-griddedInterpolant-1d', src: 'F = griddedInterpolant(0:3, [0 1 4 9]); q = F(1.5);', vars: ['q'], tol: 1e-9, level: 'graduate', domain: 'approximation', tags: ['griddedInterpolant', 'oracle-validation'] },
  { name: 'val-polyvalm', src: 'M = polyvalm([1 0 -1], [2 0; 0 3]);', vars: ['M'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['polyvalm', 'oracle-validation'] },

  // ── validation: Fourier / signal ──
  { name: 'val-fft2', src: 'Y = fft2([1 2; 3 4]);', vars: ['Y'], tol: 1e-9, level: 'graduate', domain: 'fourier', tags: ['fft2', 'oracle-validation'] },
  { name: 'val-fftshift', src: 'y = fftshift([1 2 3 4]);', vars: ['y'], tol: 1e-9, level: 'undergrad', domain: 'fourier', tags: ['fftshift', 'oracle-validation'] },
  { name: 'val-hilbert-abs', src: 'a = abs(hilbert([1 2 3 4]));', vars: ['a'], tol: 1e-6, level: 'graduate', domain: 'fourier', tags: ['hilbert', 'oracle-validation'] },
  { name: 'val-findpeaks', src: 'pks = findpeaks([0 2 0 3 1 4 0]);', vars: ['pks'], tol: 1e-9, level: 'undergrad', domain: 'fourier', tags: ['findpeaks', 'oracle-validation'] },

  // ── validation: sparse / iterative solvers + decompositions ──
  { name: 'val-lsqr', src: 'A = [4 1; 1 3]; b = [1; 2]; x = lsqr(A, b); rr = norm(A*x - b);', vars: ['rr'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['lsqr', 'iterative-solver', 'oracle-validation'] },
  { name: 'val-bicgstab', src: 'A = [4 1; 1 3]; b = [1; 2]; x = bicgstab(A, b); rr = norm(A*x - b);', vars: ['rr'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['bicgstab', 'iterative-solver', 'oracle-validation'] },
  { name: 'val-pcg', src: 'A = [4 1; 1 3]; b = [1; 2]; x = pcg(A, b, 1e-10, 50); rr = norm(A*x - b);', vars: ['rr'], tol: 1e-7, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['pcg', 'iterative-solver', 'oracle-validation'] },
  { name: 'val-cgs', src: 'A = [4 1; 1 3]; b = [1; 2]; x = cgs(A, b, 1e-10, 50); rr = norm(A*x - b);', vars: ['rr'], tol: 1e-7, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['cgs', 'iterative-solver', 'oracle-validation'] },
  // preconditioners / factorizations validated by reconstruction norm, not raw factors
  { name: 'val-ilu', src: 'A = sparse([4 1; 1 3]); [L, U] = ilu(A); rr = norm(full(L*U) - full(A));', vars: ['rr'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['ilu', 'preconditioner', 'reconstruction', 'oracle-validation'] },
  { name: 'val-ichol', src: 'A = sparse([4 1; 1 3]); L = ichol(A); rr = norm(full(L*L.\x27) - full(A));', vars: ['rr'], tol: 1e-7, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['ichol', 'preconditioner', 'reconstruction', 'oracle-validation'] },
  { name: 'val-ldl', src: 'A = [4 1; 1 3]; [L, D] = ldl(A); rr = norm(L*D*L.\x27 - A);', vars: ['rr'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['ldl', 'factorization', 'reconstruction', 'oracle-validation'] },
  { name: 'sparse-pcg-ichol-residual', src: "n = 5; e = ones(n,1); T = spdiags([e -2*e e], -1:1, n, n); A = -(kron(speye(n), T) + kron(T, speye(n))); b = ones(n*n, 1); L = ichol(A); x = pcg(A, b, 1e-8, 200, L, L'); rr = norm(A*x - b);", vars: ['rr'], tol: 1e-5, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['pcg', 'ichol', 'preconditioner', 'sparse', 'oracle-validation'] },
  { name: 'sparse-gmres-ilu-residual', src: "n = 5; e = ones(n,1); T = spdiags([e -2*e e], -1:1, n, n); A = -(kron(speye(n), T) + kron(T, speye(n))); b = ones(n*n, 1); [L, U] = ilu(A); x = gmres(A, b, 10, 1e-8, 50, L, U); rr = norm(A*x - b);", vars: ['rr'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['gmres', 'ilu', 'preconditioner', 'sparse', 'oracle-validation'] },
  // ── multigrid (two-grid V-cycle) + domain decomposition (Schwarz) ──
  { name: 'mg-multigrid-vcycle', src: "nf = 7; h = 1/(nf+1); Af = (2*eye(nf) - diag(ones(nf-1,1),1) - diag(ones(nf-1,1),-1))/h^2; f = ones(nf,1); u = zeros(nf,1); w = 2/3; D = diag(diag(Af)); r0 = norm(f - Af*u); for s = 1:2, u = u + w*(D\\(f - Af*u)); end; r = f - Af*u; nc = 3; R = zeros(nc,nf); for i = 1:nc, j = 2*i; R(i,j-1) = 0.25; R(i,j) = 0.5; R(i,j+1) = 0.25; end; hc = 1/(nc+1); Ac = (2*eye(nc) - diag(ones(nc-1,1),1) - diag(ones(nc-1,1),-1))/hc^2; ec = Ac\\(R*r); u = u + 2*R'*ec; for s = 1:2, u = u + w*(D\\(f - Af*u)); end; ratio = norm(f - Af*u)/r0;", vars: ['ratio'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['multigrid', 'v-cycle', 'smoother', 'restriction-prolongation'] },
  { name: 'dd-schwarz-1d', src: 'n = 9; h = 1/(n+1); A = (2*eye(n) - diag(ones(n-1,1),1) - diag(ones(n-1,1),-1))/h^2; f = ones(n,1); ud = A\\f; u = zeros(n,1); for sw = 1:10, u(1:5) = A(1:5,1:5)\\(f(1:5) - A(1:5,6:9)*u(6:9)); u(5:9) = A(5:9,5:9)\\(f(5:9) - A(5:9,1:4)*u(1:4)); end; err = norm(u - ud);', vars: ['err'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['domain-decomposition', 'multiplicative-schwarz', 'overlap'] },
  // ── robustness: ill-conditioned / rank-deficient solves validated by residual & min-norm invariants ──
  { name: 'robust-rankdef-sparse-lsqr', src: 'A = sparse([1 2; 2 4; 3 6]); b = [1; 2; 3]; x = lsqr(A, b, 1e-12, 100); r = norm(A*x - b);', vars: ['r'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['rank-deficient', 'lsqr', 'residual-invariant', 'robustness'] },
  { name: 'robust-illcond-sparse-solve', src: 'A = spdiags([1; 1e-6; 1], 0, 3, 3); b = [1; 1; 1]; x = A\\b; r = norm(A*x - b);', vars: ['r'], tol: 1e-7, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['ill-conditioned', 'sparse', 'residual-invariant', 'robustness'] },
  { name: 'robust-hilbert-residual', src: 'H = hilb(6); b = ones(6,1); x = H\\b; r = norm(H*x - b);', vars: ['r'], tol: 1e-7, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['ill-conditioned', 'hilbert', 'backward-stable', 'robustness'] },
  { name: 'robust-rankdef-pinv-minnorm', src: 'A = [1 2; 2 4]; b = [1; 2]; x = pinv(A)*b;', vars: ['x'], tol: 1e-7, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['rank-deficient', 'pinv', 'minimum-norm', 'robustness'] },
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
  { name: 'val-sym-solve-quadratic', src: 'syms a b c x; r = solve(a*x^2 + b*x + c == 0, x); v = sort(double(subs(r, [a b c], [1 -5 6])));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['solve', 'quadratic-formula', 'oracle-validation'] },
  { name: 'val-sym-solve-quadratic-monic', src: 'syms b c x; r = solve(x^2 + b*x + c == 0, x); v = sort(double(subs(r, [b c], [-3 2])));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['solve', 'quadratic-formula', 'oracle-validation'] },
  { name: 'val-sym-solve-quadratic-nob', src: 'syms a c x; r = solve(a*x^2 + c == 0, x); v = sort(double(subs(r, [a c], [1 -4])));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['solve', 'quadratic-formula', 'oracle-validation'] },

  // ── symbolic edge-case batch: defect regressions + previously-untested working functions ──
  // one-sided & infinite limits (defect fix: 'left'/'right' direction was ignored → NaN)
  { name: 'cal-limit-oneside-right', src: "syms x; v = sign(double(limit(1/x, x, 0, 'right')));", vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['limit', 'one-sided', 'oracle-validation'] },
  { name: 'cal-limit-oneside-left', src: "syms x; v = sign(double(limit(1/x, x, 0, 'left')));", vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['limit', 'one-sided', 'oracle-validation'] },
  { name: 'cal-limit-removable-oneside', src: "syms x; v = double(limit((x^2-1)/(x-1), x, 1, 'left'));", vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['limit', 'one-sided', 'oracle-validation'] },
  { name: 'cal-limit-at-infinity', src: 'syms x; v = double(limit((2*x+1)/(x-3), x, inf));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['limit', 'at-infinity', 'oracle-validation'] },
  // symsum / symprod default-variable (3-arg) form (defect fix: 3-arg threw "expected a string")
  { name: 'cal-symsum-default-var', src: 'syms k n; s = symsum(k, 1, n); v = double(subs(s, n, 10));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['symsum', 'oracle-validation'] },
  { name: 'cal-symsum-square', src: 'syms k; v = double(symsum(k^2, 1, 4));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['symsum', 'oracle-validation'] },
  { name: 'cal-symprod-default', src: 'syms k; v = double(symprod(k, 1, 5));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['symprod', 'oracle-validation'] },
  // previously-untested but working symbolic functions
  { name: 'cal-expand-cube', src: 'syms x; e = expand((x+1)^3); v = double(subs(e, x, 2));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['expand', 'oracle-validation'] },
  { name: 'cal-collect', src: 'syms x; e = collect(x*(x+1) + x, x); v = double(subs(e, x, 3));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['collect', 'oracle-validation'] },
  { name: 'cal-ilaplace', src: 'syms s t; f = ilaplace(1/(s+2)); v = double(subs(f, t, 1));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['ilaplace', 'oracle-validation'] },
  { name: 'cal-taylor-order', src: "syms x; e = taylor(exp(x), x, 0, 'Order', 4); v = double(subs(e, x, 1));", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['taylor', 'oracle-validation'] },
  { name: 'cal-sym-curl', src: 'syms x y z; c = curl([y; -x; 0], [x y z]); v = double(c);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['curl', 'vector-calculus', 'oracle-validation'] },
  { name: 'cal-sym-divergence', src: 'syms x y z; d = divergence([x; y; z], [x y z]); v = double(d);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['divergence', 'vector-calculus', 'oracle-validation'] },
  { name: 'cal-sym-gradient', src: 'syms x y; g = gradient(x^2*y, [x y]); v = double(subs(subs(g, x, 2), y, 3));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['gradient', 'vector-calculus', 'oracle-validation'] },
  { name: 'cal-coeffs', src: 'syms x; c = coeffs(3*x^2 + 2*x + 1, x); v = double(c);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['coeffs', 'oracle-validation'] },
  { name: 'cal-numden', src: 'syms x; [n, d] = numden((x+1)/(x-1)); v = [double(subs(n, x, 2)); double(subs(d, x, 2))];', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['numden', 'oracle-validation'] },
  { name: 'cal-finverse', src: 'syms x; g = finverse(2*x + 1); v = double(subs(g, x, 5));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['finverse', 'oracle-validation'] },
  { name: 'cal-equations-to-matrix', src: 'syms x y; [A, b] = equationsToMatrix([x + y == 3, x - y == 1], [x y]); v = double(A\\b);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['equationsToMatrix', 'oracle-validation'] },
  { name: 'cal-assume-simplify', src: 'syms x; assume(x > 0); e = simplify(sqrt(x^2)); v = double(subs(e, x, 5)); assume(x, "clear");', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['assume', 'simplify', 'oracle-validation'] },
  { name: 'cal-fourier', src: 'syms t w; F = fourier(exp(-abs(t)), t, w); v = double(subs(F, w, 0));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['fourier', 'oracle-validation'] },
  { name: 'cal-ztrans', src: 'syms n z; Z = ztrans(2^n, n, z); v = double(subs(Z, z, 4));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['ztrans', 'oracle-validation'] },

  // ══════════ Matrix Methods — end-to-end workflows (chain validated primitives) ══════════
  { name: 'mm-diagonalization-power', src: 'A = [2 1; 1 2]; [V, D] = eig(A); A5 = A^5; err = norm(A^5 - V*D^5/V);', vars: ['A5', 'err'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['diagonalization', 'matrix-power', 'end-to-end'] },
  { name: 'mm-markov-power', src: 'P = [0.9 0.1 0; 0.05 0.9 0.05; 0 0.2 0.8]; pic = [1 0 0]*P^300; resid = norm(pic*P - pic);', vars: ['pic', 'resid'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['markov-chain', 'steady-state', 'end-to-end'] },
  { name: 'mm-markov-null', src: "P = [0.9 0.1 0; 0.05 0.9 0.05; 0 0.2 0.8]; w = null(P' - eye(3)); pin = (w/sum(w))';", vars: ['pin'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['markov-chain', 'null-space', 'end-to-end'] },
  { name: 'mm-eig-identities', src: 'A = [4 1 0; 1 4 1; 0 1 4]; ev = sort(eig(A)); c1 = abs(sum(ev) - trace(A)); c2 = abs(prod(ev) - det(A));', vars: ['ev', 'c1', 'c2'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['eigenanalysis', 'trace-det-identity', 'end-to-end'] },
  { name: 'mm-matrix-chain', src: "A = [1 2; 3 4]; B = [5 6; 7 8]; C = (A*B + B*A)'; D = inv(A)*B - B*inv(A); s = trace(C) + norm(D, 'fro');", vars: ['s'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['matrix-operations', 'end-to-end'] },
  { name: 'mm-lsq-twoways', src: "t = [0 1 2 3 4]'; y = [1 3 2 5 4]'; A = [ones(5,1) t]; c = A\\y; cn = (A'*A)\\(A'*y); err = norm(c - cn);", vars: ['c', 'err'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['least-squares', 'normal-equations', 'end-to-end'] },
  { name: 'mm-diag-recon', src: 'A = [2 1; 0 3]; [V, D] = eig(A); rr = norm(V*D/V - A); ev = sort(diag(D));', vars: ['rr', 'ev'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['diagonalization', 'reconstruction', 'end-to-end'] },

  // ══════════ stress / edge — adversarial (invariants where outputs are non-unique) ══════════

  // nearly singular / ill-conditioned solves (residual is backward-stable; solution may not be)
  { name: 'stress-hilbert-resid', src: 'A = hilb(8); b = A*ones(8,1); x = A\\b; resid = norm(A*x - b);', vars: ['resid'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['ill-conditioned', 'hilbert', 'backward-stability', 'stress'] },
  { name: 'stress-hilbert-solve', src: 'A = hilb(6); b = A*ones(6,1); x = A\\b;', vars: ['x'], tol: 1e-4, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['ill-conditioned', 'hilbert', 'stress'] },

  // rank-deficient systems (tall — clean least-squares basic solution; residual invariant)
  { name: 'stress-rankdef-consistent', src: 'A = [1 2; 2 4; 3 6]; b = [3; 6; 9]; x = A\\b; resid = norm(A*x - b); r = rank(A);', vars: ['resid', 'r'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['rank-deficient', 'consistent', 'stress'] },
  { name: 'stress-rankdef-inconsistent', src: 'A = [1; 2; 3]; b = [1; 1; 1]; x = A\\b; resid = norm(A*x - b);', vars: ['resid'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['rank-deficient', 'least-squares-residual', 'stress'] },

  // ill-conditioned least squares (Vandermonde; residual + backslash-vs-pinv agreement)
  { name: 'stress-vandermonde-resid', src: "x = linspace(0,1,6)'; A = vander(x); A = A(:,3:6); b = cos(x); xa = A\\b; rn = norm(A*xa - b);", vars: ['rn'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['ill-conditioned', 'vandermonde', 'least-squares', 'stress'] },
  { name: 'stress-backslash-vs-pinv', src: "x = linspace(0,1,6)'; A = vander(x); A = A(:,3:6); b = cos(x); err = norm(A\\b - pinv(A)*b);", vars: ['err'], tol: 1e-4, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['least-squares', 'pinv', 'stress'] },

  // repeated / defective eigenvalues (eigenvalues only — vectors are degenerate)
  { name: 'stress-jordan-eig', src: 'ev = sort(eig([1 1; 0 1]));', vars: ['ev'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['defective', 'jordan-block', 'repeated-eigenvalues', 'stress'] },
  { name: 'stress-repeated-eig', src: 'ev = sort(eig(diag([2 2 5])));', vars: ['ev'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['repeated-eigenvalues', 'stress'] },
  { name: 'stress-near-defective-eig', src: 'ev = sort(eig([1 1000; 0 1.0001]));', vars: ['ev'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['near-defective', 'stress'] },

  // ══════════ calculus — differentiation, Taylor, integration, Riemann ══════════
  // (symbolic finals via double(subs(...)); see supported-subset.md for int by-parts/limit limits)
  { name: 'cal-power-rule', src: 'syms x; d = diff(x^5); v = double(subs(d, x, 2));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['differentiation', 'power-rule'] },
  { name: 'cal-product-rule', src: 'syms x; d = diff(x^2*sin(x)); v = double(subs(d, x, 1));', vars: ['v'], tol: 1e-6, level: 'undergrad', domain: 'calculus', tags: ['differentiation', 'product-rule'] },
  { name: 'cal-quotient-rule', src: 'syms x; d = diff(sin(x)/x); v = double(subs(d, x, 1));', vars: ['v'], tol: 1e-6, level: 'undergrad', domain: 'calculus', tags: ['differentiation', 'quotient-rule'] },
  { name: 'cal-chain-rule', src: 'syms x; d = diff(sin(x^2)); v = double(subs(d, x, 1));', vars: ['v'], tol: 1e-6, level: 'undergrad', domain: 'calculus', tags: ['differentiation', 'chain-rule'] },
  { name: 'cal-transcendental', src: 'syms x; d = diff(exp(x)*log(x)); v = double(subs(d, x, 2));', vars: ['v'], tol: 1e-6, level: 'undergrad', domain: 'calculus', tags: ['differentiation', 'transcendental'] },
  { name: 'cal-second-derivative', src: 'syms x; d2 = diff(x^4, 2); v = double(subs(d2, x, 3));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['differentiation', 'higher-order'] },
  { name: 'cal-taylor-cos', src: "syms x; T = taylor(cos(x), x, 'Order', 6); v = double(subs(T, x, 1));", vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['taylor-series'] },
  { name: 'cal-antiderivative-poly', src: 'syms x; F = int(x^3); v = double(subs(F, x, 2));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'antiderivative'] },
  { name: 'cal-definite-integral', src: 'syms x; v = double(int(x^2, 0, 3));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'definite'] },
  { name: 'cal-fundamental-theorem', src: 'syms x; F = int(x^2); v = double(subs(F, x, 3) - subs(F, x, 1));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'fundamental-theorem'] },
  { name: 'cal-riemann-midpoint', src: 'n = 1000; a = 0; b = 1; h = (b-a)/n; xm = (a+h/2):h:b; S = sum(xm.^2)*h;', vars: ['S'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'riemann-sum'] },

  // ══════════ adversarial numerical robustness (deterministic — no RNG) ══════════
  // LA pathologies validated by robust invariants (residuals), not unstable solutions
  { name: 'adv-wilkinson-eig', src: "W = wilkinson(21); [V, D] = eig(W); rr = norm(W*V - V*D);", vars: ['rr'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['adversarial', 'wilkinson', 'clustered-eigenvalues'] },
  // near-collinear (cond ~1e10): the residual diverges between TS (exact 0) and MATLAB
  // LAPACK (~7e-6) — both valid; the tol reflects the conditioning bound, not a defect.
  { name: 'adv-collinear-leastsq', src: 'A = [1 1; 1 1+1e-10; 1 1+2e-10]; b = [1; 2; 3]; x = A\\b; rr = norm(A*x - b);', vars: ['rr'], tol: 1e-5, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['adversarial', 'near-collinear', 'least-squares', 'conditioning-divergent'] },
  { name: 'adv-vander-cond', src: 'c = cond(vander(linspace(0, 1, 8)));', vars: ['c'], tol: 1, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['adversarial', 'conditioning', 'vandermonde'] },
  { name: 'adv-empty-decomp', src: 'szs = size(svd([])); r = rank([]); szc = size(chol([]));', vars: ['szs', 'r', 'szc'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['adversarial', 'empty', 'decomposition'] },

  // IEEE-754 edge cases (flags/finite values — Inf/NaN serialize as JSON null, so test via predicates)
  { name: 'adv-catastrophic-cancellation', src: 'q = (1e16 + 1) - 1e16; e1 = exp(1e-10) - 1; e2 = expm1(1e-10);', vars: ['q', 'e1', 'e2'], tol: 1e-12, level: 'graduate', domain: 'core-language', tags: ['adversarial', 'floating-point', 'cancellation'] },
  { name: 'adv-eps-rounding', src: 'a = (1 + eps) - 1; b = (1 + eps/2) - 1;', vars: ['a', 'b'], tol: 1e-20, level: 'graduate', domain: 'core-language', tags: ['adversarial', 'floating-point', 'machine-epsilon'] },
  { name: 'adv-ieee-flags', src: 'f = [isnan(Inf-Inf) isinf(1/0) isnan(0*Inf) isinf(-1/0) isnan(Inf/Inf)];', vars: ['f'], tol: 1e-9, level: 'graduate', domain: 'core-language', tags: ['adversarial', 'floating-point', 'ieee754'] },
  { name: 'adv-nan-propagation', src: 'M = [1 NaN; 0 1]; iv = inv(M); F = fft([1 NaN 2 3]); s = sum([1 NaN 3]); flags = [any(isnan(iv(:))) all(isnan(F)) isnan(s)];', vars: ['flags'], tol: 1e-9, level: 'graduate', domain: 'core-language', tags: ['adversarial', 'floating-point', 'nan-propagation'] },

  // interpolation pathology (Runge phenomenon on equidistant nodes)
  { name: 'adv-runge-spline', src: 'x = linspace(-1, 1, 15); y = 1./(1 + 25*x.^2); yq = spline(x, y, 0.95);', vars: ['yq'], tol: 1e-6, level: 'graduate', domain: 'approximation', tags: ['adversarial', 'runge-phenomenon', 'spline'] },
  { name: 'adv-runge-pchip', src: 'x = linspace(-1, 1, 15); y = 1./(1 + 25*x.^2); yq = pchip(x, y, 0.95);', vars: ['yq'], tol: 1e-6, level: 'graduate', domain: 'approximation', tags: ['adversarial', 'runge-phenomenon', 'pchip'] },

  // ══════════ Applied Linear Algebra — application workflows ══════════
  { name: 'apla-chemical-balance', src: 'M = [3 0 -1 0; 8 0 0 -2; 0 2 -2 -1]; n = null(M); coeffs = n/n(1);', vars: ['coeffs'], tol: 1e-6, level: 'undergrad', domain: 'linear-algebra', tags: ['applied', 'chemical-balancing', 'null-space'] },
  { name: 'apla-static-forces', src: 'A = [cosd(30) -cosd(45); sind(30) sind(45)]; b = [0; 100]; T = A\\b;', vars: ['T'], tol: 1e-6, level: 'undergrad', domain: 'linear-algebra', tags: ['applied', 'statics', 'linear-system'] },
  { name: 'apla-moments', src: 'r1 = [2 0 0]; F1 = [0 100 0]; r2 = [0 3 0]; F2 = [50 0 0]; M = cross(r1, F1) + cross(r2, F2);', vars: ['M'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra', tags: ['applied', 'moments', 'cross-product'] },
  { name: 'apla-markov-weather', src: 'P = [0.8 0.2; 0.4 0.6]; s0 = [1 0]; s7 = s0*P^7;', vars: ['s7'], tol: 1e-6, level: 'undergrad', domain: 'linear-algebra', tags: ['applied', 'markov-chain'] },
  { name: 'apla-robotics-rotation', src: 'R = @(t) [cosd(t) -sind(t); sind(t) cosd(t)]; R90 = R(30)*R(60);', vars: ['R90'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra', tags: ['applied', 'robotics', 'rotation-matrix'] },
  { name: 'apla-svd-lowrank', src: "A = magic(4); [U, S, V] = svd(A); A1 = U(:,1)*S(1,1)*V(:,1)'; err = norm(A - A1); s = svd(A);", vars: ['err'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['applied', 'svd', 'low-rank'] },

  // ══════════ calculus — extended symbolic integration + limits (engine improvements) ══════════
  { name: 'cal-int-sqrt', src: 'syms x; v = double(int(sqrt(x), 0, 4));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'power-rule', 'sqrt'] },
  { name: 'cal-int-linear-sub', src: 'syms x; v = double(int(sin(2*x), 0, pi/2));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'linear-substitution'] },
  { name: 'cal-int-linear-base', src: 'syms x; v = double(int((2*x+1)^3, 0, 1));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'linear-substitution'] },
  { name: 'cal-int-byparts-exp', src: 'syms x; v = double(int(x*exp(x), 0, 1));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'by-parts'] },
  { name: 'cal-int-byparts-sin', src: 'syms x; v = double(int(x*sin(x), 0, pi));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'by-parts'] },
  { name: 'cal-int-byparts-poly-exp', src: 'syms x; v = double(int(x^2*exp(x), 0, 1));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'by-parts', 'recursive'] },
  { name: 'cal-int-byparts-log', src: 'syms x; v = double(int(x*log(x), 1, 2));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'by-parts', 'logarithm'] },
  { name: 'cal-int-arctan', src: 'syms x; v = double(int(1/(1+x^2), 0, 1));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'arctan-form'] },
  { name: 'cal-limit-lhopital', src: 'syms x; v = double(limit((1-cos(x))/x^2, x, 0));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['limit', 'lhopital'] },

  // ── partial fractions (rational integrands via the existing decomposition engine) ──
  { name: 'cal-int-partfrac', src: 'syms x; v = double(int(1/((x-1)*(x-2)), 3, 4));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'partial-fractions'] },
  { name: 'cal-int-partfrac-num', src: 'syms x; v = double(int((3*x+5)/((x-1)*(x-2)), 3, 4));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'partial-fractions'] },
  { name: 'cal-int-partfrac-diffsq', src: 'syms x; v = double(int(1/(x^2-1), 2, 3));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'partial-fractions'] },

  // ── symbolic limits (difference quotient → derivative, evaluated at a point) ──
  { name: 'cal-limit-derivative', src: 'syms x h; D = limit((sin(x+h)-sin(x))/h, h, 0); v = double(subs(D, x, 1));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['limit', 'derivative-definition', 'symbolic'] },

  // ── symbolic equation solving (literal/parametric — diff/solve variable-selection fix) ──
  { name: 'cal-solve-linear', src: 'syms a b x; s = solve(a*x + b == 0, x); v = double(subs(subs(s, a, 2), b, 6));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['solve', 'symbolic-linear'] },
  { name: 'cal-solve-kinematics', src: 'syms u a t v0; s = solve(v0 == u + a*t, t); val = double(subs(subs(subs(s, v0, 10), u, 2), a, 4));', vars: ['val'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['solve', 'literal-equation'] },
  { name: 'cal-diff-partial', src: 'syms a b x; d = diff(a*x + b, x); v = double(subs(d, a, 5));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['diff', 'variable-selection'] },

  // ── symbolic linear algebra: Cramer-rule solve + symbolic matrix product ──
  { name: 'cal-symbolic-solve-cramer', src: 'syms a b; A = [a 1; 1 b]; x = A\\[1; 0]; v = double(subs(subs(x(1), a, 2), b, 3));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['linear-solve', 'cramer', 'symbolic-matrix'] },
  { name: 'cal-symbolic-solve-verify', src: 'syms a b; A = [a 1; 1 b]; x = A\\[1; 0]; r = A*x; v = double(subs(subs(r(1), a, 2), b, 3));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['linear-solve', 'matrix-product', 'symbolic-matrix'] },
  { name: 'cal-symbolic-matmul', src: 'syms a; M = [a 1; 0 a]*[1; 1]; v = double(subs(M(1), a, 4));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['matrix-product', 'symbolic-matrix'] },

  // ── improper integrals (bounds at infinity) ──
  { name: 'cal-improper-exp', src: 'syms x; v = double(int(exp(-x), 0, inf));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'improper'] },
  { name: 'cal-improper-power', src: 'syms x; v = double(int(1/x^2, 1, inf));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'improper'] },
  { name: 'cal-improper-decay', src: 'syms x; v = double(int(exp(-2*x), 0, inf));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'improper'] },

  // ── trig simplification & symbolic algebra (already present; locked against MATLAB) ──
  { name: 'cal-trig-pythagorean', src: 'syms x; v = double(simplify(sin(x)^2 + cos(x)^2));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['simplify', 'trig-identity'] },
  { name: 'cal-simplify-rational-cancel', src: 'syms x; e = simplify((x^2 - 1)/(x - 1)); v = double(subs(e, x, 5));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['simplify', 'rational-cancellation', 'robustness'] },
  { name: 'cal-trig-double-angle', src: 'syms x; s = simplify(diff(sin(x)*cos(x))); v = double(subs(s, x, 0.3));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['simplify', 'trig-identity'] },
  { name: 'cal-factor', src: 'syms x; v = sort(double(subs(factor(x^2 - 5*x + 6), x, 5)));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['factor', 'polynomial'] },
  { name: 'cal-symbolic-inv', src: 'syms a b; I = inv([a 0; 0 b]); v = double(subs(subs(I(1,1), a, 2), b, 3));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['inverse', 'symbolic-matrix'] },

  // ── symbolic matrix algebra batch: charpoly / eig (2x2 + triangular) / generic rank ──
  { name: 'cal-charpoly-sym', src: 'syms a; p = charpoly([a 1; 0 a]); v = double(subs(p, a, 5));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['charpoly', 'symbolic-matrix', 'oracle-validation'] },
  { name: 'cal-charpoly-symvar', src: 'syms x; A = [2 1; 1 2]; p = charpoly(A, x); v = double(subs(p, x, 0));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['charpoly', 'symbolic-matrix', 'oracle-validation'] },
  { name: 'cal-charpoly-det-lambda', src: 'syms l; A = [2 1; 1 2]; p = det(l*eye(2) - A); v = double(subs(p, l, 3));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['charpoly', 'symbolic-det', 'symbolic-matrix', 'oracle-validation'] },
  { name: 'cal-eig-sym-2x2', src: 'v = sort(double(eig(sym([2 1; 1 2]))));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['eig', 'symbolic-matrix', 'oracle-validation'] },
  { name: 'cal-eig-sym-triangular', src: 'syms a; e = eig([a 1; 0 a]); v = double(subs(e, a, 5));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['eig', 'symbolic-matrix', 'oracle-validation'] },
  { name: 'cal-eig-sym-param', src: 'syms a; v = sort(double(subs(eig([a 1; 1 a]), a, 3)));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['eig', 'symbolic-matrix', 'oracle-validation'] },
  { name: 'cal-eig-sym-diag3', src: 'v = sort(double(eig(sym([2 0 0; 0 3 0; 0 0 6]))));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['eig', 'symbolic-matrix', 'oracle-validation'] },
  { name: 'cal-rank-sym-deficient', src: 'syms a; v = rank([1 a; a a^2]);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['rank', 'symbolic-matrix', 'oracle-validation'] },
  { name: 'cal-rank-sym-full', src: 'syms a b; v = rank([a 1; 1 b]);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['rank', 'symbolic-matrix', 'oracle-validation'] },
  { name: 'cal-rank-sym-numeric', src: 'v = rank(sym([1 2; 2 4]));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'symbolic', tags: ['rank', 'symbolic-matrix', 'oracle-validation'] },

  // ── derivative-divides substitution (bounded nonlinear u-substitution) ──
  { name: 'cal-subst-gaussian', src: 'syms x; v = double(int(2*x*exp(x^2), 0, 1));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'substitution', 'derivative-divides'] },
  { name: 'cal-subst-sincos', src: 'syms x; v = double(int(sin(x)*cos(x), 0, pi/2));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'substitution', 'derivative-divides'] },
  { name: 'cal-subst-rational-log', src: 'syms x; v = double(int(x/(1+x^2), 0, 1));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'substitution', 'derivative-divides'] },
  { name: 'cal-subst-tan', src: 'syms x; v = double(int(tan(x), 0, pi/4));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'substitution', 'derivative-divides'] },
  { name: 'cal-subst-power', src: 'syms x; v = double(int(x^2*(x^3+1)^4, 0, 1));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'substitution', 'derivative-divides'] },
  { name: 'cal-subst-nested', src: 'syms x; v = double(int(cos(x)*exp(sin(x)), 0, pi/2));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['integration', 'substitution', 'derivative-divides'] },

  // ══════════ computational geometry (convention-independent invariants: areas/volumes/counts) ══════════
  { name: 'geom-convhull-area', src: 'x = [0 1 1 0 0.5]; y = [0 0 1 1 0.5]; [k, a] = convhull(x, y); v = a;', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'geometry', tags: ['convex-hull', 'area', 'oracle-validation'] },
  { name: 'geom-convhull-perimeter', src: 'x = [0 1 1 0]; y = [0 0 1 1]; k = convhull(x, y); per = sum(sqrt(diff(x(k)).^2 + diff(y(k)).^2));', vars: ['per'], tol: 1e-9, level: 'graduate', domain: 'geometry', tags: ['convex-hull', 'perimeter', 'oracle-validation'] },
  { name: 'geom-convhulln-volume-3d', src: 'P = [0 0 0;1 0 0;0 1 0;0 0 1;1 1 1;1 1 0;1 0 1;0 1 1]; [k, vol] = convhulln(P); v = vol;', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'geometry', tags: ['convex-hull', 'volume', 'convhulln', 'oracle-validation'] },
  { name: 'geom-delaunay-triangles', src: 'x = [0 1 1 0 0.5]; y = [0 0 1 1 0.5]; DT = delaunay(x, y); nt = size(DT, 1);', vars: ['nt'], tol: 1e-9, level: 'graduate', domain: 'geometry', tags: ['delaunay', 'triangulation', 'oracle-validation'] },
  { name: 'geom-delaunay-triangulation-obj', src: 'DT = delaunayTriangulation([0 0;1 0;0 1;1 1]); nt = size(DT.ConnectivityList, 1);', vars: ['nt'], tol: 1e-9, level: 'graduate', domain: 'geometry', tags: ['delaunay', 'triangulation-object', 'oracle-validation'] },
  { name: 'geom-voronoi-cells', src: 'P = [0 0;1 0;0 1;1 1;0.5 0.5]; [V, C] = voronoin(P); nc = numel(C);', vars: ['nc'], tol: 1e-9, level: 'graduate', domain: 'geometry', tags: ['voronoi', 'voronoin', 'oracle-validation'] },
  { name: 'geom-polyarea', src: 'v = [polyarea([0 1 1 0], [0 0 1 1]); polyarea([0 1 0.5], [0 0 1])];', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'geometry', tags: ['polygon', 'area', 'polyarea', 'oracle-validation'] },
  { name: 'geom-inpolygon', src: 'v = [inpolygon(0.5, 0.5, [0 1 1 0], [0 0 1 1]), inpolygon(2, 2, [0 1 1 0], [0 0 1 1])];', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'geometry', tags: ['point-in-polygon', 'inpolygon', 'oracle-validation'] },
  { name: 'geom-pdist', src: 'v = pdist([0 0; 3 4]);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'geometry', tags: ['pairwise-distance', 'pdist', 'oracle-validation'] },
];
