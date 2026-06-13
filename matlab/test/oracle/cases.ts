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
  /** Negative test: assert BOTH real MATLAB and the TS interpreter error on this src
   *  (validates the engine fails where MATLAB fails). When set, `vars` is ignored. */
  expectError?: boolean;
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

  // ══════════ graduate gaps: matrix equations, generalized eig, FEM, symplectic, spectral, splitting ══════════
  { name: 'mateq-sylvester', src: "A = [1 2; 0 3]; B = [2 0; 1 4]; C = [1 0; 0 1]; X = sylvester(A, B, C); r = norm(A*X + X*B - C);", vars: ['r'], tol: 1e-7, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['matrix-equation', 'sylvester', 'residual-invariant'] },
  { name: 'mateq-lyapunov', src: "A = [-1 0; 0 -2]; Q = eye(2); X = lyap(A, Q); r = norm(A*X + X*A' + Q);", vars: ['r'], tol: 1e-7, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['matrix-equation', 'lyapunov', 'residual-invariant'] },
  { name: 'mateq-riccati-care', src: "A = [0 1; 0 0]; B = [0; 1]; Q = eye(2); R = 1; X = care(A, B, Q, R); r = norm(A'*X + X*A - X*B*(R\\(B'*X)) + Q);", vars: ['r'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['matrix-equation', 'riccati', 'care', 'residual-invariant'] },
  { name: 'geig-pencil', src: 'A = [2 0; 0 1]; B = [1 0; 0 2]; v = sort(real(eig(A, B)));', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['generalized-eigenvalue', 'pencil'] },
  { name: 'geig-sturm-liouville', src: 'n = 5; h = 1/(n+1); K = (2*eye(n) - diag(ones(n-1,1),1) - diag(ones(n-1,1),-1))/h^2; M = eye(n); ev = sort(real(eig(K, M))); v = ev(1);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['generalized-eigenvalue', 'sturm-liouville', 'vibration-mode'] },
  { name: 'fem-1d-galerkin-solve', src: 'n = 10; h = 1/n; K = (1/h)*(2*eye(n-1) - diag(ones(n-2,1),1) - diag(ones(n-2,1),-1)); f = h*ones(n-1,1); u = K\\f; v = u(5);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-pde', tags: ['finite-element', 'galerkin', 'weak-form'] },
  { name: 'ode-symplectic-verlet', src: 'x = 1; v = 0; dt = 0.05; for k = 1:100, v = v - dt/2*x; x = x + dt*v; v = v - dt/2*x; end; E = 0.5*(v^2 + x^2);', vars: ['E'], tol: 1e-9, level: 'graduate', domain: 'numerical-ode', tags: ['symplectic', 'stormer-verlet', 'energy-conservation', 'hamiltonian'] },
  { name: 'spectral-chebyshev-diff', src: "N = 8; x = cos(pi*(0:N)/N)'; c = [2; ones(N-1,1); 2].*(-1).^((0:N)'); X = repmat(x, 1, N+1); dX = X - X'; D = (c*(1./c)')./(dX + eye(N+1)); D = D - diag(sum(D, 2)); err = max(abs(D*exp(x) - exp(x)));", vars: ['err'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['spectral', 'chebyshev', 'collocation', 'differentiation-matrix'] },
  { name: 'pde-strang-splitting', src: 'A = [0 1; -1 0]; B = [0 0; 0 -0.5]; dt = 0.1; u = [1; 0]; for k = 1:10, u = expm(B*dt/2)*expm(A*dt)*expm(B*dt/2)*u; end; v = u;', vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['operator-splitting', 'strang', 'matrix-exponential'] },
  { name: 'pde-varcoef-diffusion', src: 'n = 8; h = 1/n; A = zeros(n-1); for i = 1:n-1, al = 1 + ((i-0.5)*h)^2; ar = 1 + ((i+0.5)*h)^2; A(i,i) = (al+ar)/h^2; if i > 1, A(i,i-1) = -al/h^2; end; if i < n-1, A(i,i+1) = -ar/h^2; end; end; f = ones(n-1,1); u = A\\f; v = u(4);', vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['variable-coefficient', 'heterogeneous', 'finite-difference'] },
  { name: 'qmc-van-der-corput', src: 'N = 256; s = zeros(N,1); for i = 1:N, b = 2; f = 1/b; r = 0; ii = i; while ii > 0, r = r + f*mod(ii,b); ii = floor(ii/b); f = f/b; end; s(i) = r; end; I = mean(s.^2);', vars: ['I'], tol: 1e-6, level: 'graduate', domain: 'statistics', tags: ['quasi-monte-carlo', 'low-discrepancy', 'van-der-corput', 'deterministic'] },

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

  // ══════════ control systems (LTI models; transfer functions / responses / margins) ══════════
  // grid-independent invariants (dcgain, poles, integrals); responses use loose tol for horizon differences
  { name: 'ctrl-tf-dcgain', src: 'v = dcgain(tf(4, [1 3 2]));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'control', tags: ['tf', 'dcgain', 'oracle-validation'] },
  { name: 'ctrl-zpk-dcgain', src: 'v = dcgain(zpk([], [-1 -1], 3));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'control', tags: ['zpk', 'dcgain', 'oracle-validation'] },
  { name: 'ctrl-ss-dcgain', src: 'v = dcgain(ss([0 1; -1 -2], [0; 1], [1 0], 0));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'control', tags: ['ss', 'state-space', 'dcgain', 'oracle-validation'] },
  { name: 'ctrl-pole-sorted', src: 'v = sort(pole(tf(1, [1 3 2])));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'control', tags: ['pole', 'oracle-validation'] },
  { name: 'ctrl-feedback-dcgain', src: 'v = dcgain(feedback(tf(1, [1 0]), 1));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'control', tags: ['feedback', 'dcgain', 'oracle-validation'] },
  { name: 'ctrl-step-final', src: '[y, t] = step(tf(1, [1 2 1])); v = y(end);', vars: ['v'], tol: 2e-2, level: 'graduate', domain: 'control', tags: ['step', 'step-response', 'settling', 'oracle-validation'] },
  { name: 'ctrl-impulse-integral', src: 'sys = tf(1, [1 2]); [y, t] = impulse(sys); v = trapz(t, y);', vars: ['v'], tol: 1e-2, level: 'graduate', domain: 'control', tags: ['impulse', 'integral-invariant', 'oracle-validation'] },
  { name: 'ctrl-lsim-steady', src: 'sys = tf(2, [1 1]); t = 0:0.05:10; u = 3*ones(size(t)); y = lsim(sys, u, t); v = y(end);', vars: ['v'], tol: 2e-2, level: 'graduate', domain: 'control', tags: ['lsim', 'forced-response', 'oracle-validation'] },
  { name: 'ctrl-lqr-gain', src: 'K = lqr([0 1; 0 0], [0; 1], eye(2), 1); v = K;', vars: ['v'], tol: 1e-4, level: 'graduate', domain: 'control', tags: ['lqr', 'optimal-control', 'oracle-validation'] },
  { name: 'ctrl-bode-magnitude', src: '[mag, ph] = bode(tf(1, [1 1]), 1); v = mag;', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'control', tags: ['bode', 'frequency-response', 'oracle-validation'] },
  { name: 'ctrl-margin-phase', src: '[Gm, Pm] = margin(tf(5, [1 3 2])); v = Pm;', vars: ['v'], tol: 1e-3, level: 'graduate', domain: 'control', tags: ['margin', 'phase-margin', 'stability', 'oracle-validation'] },

  // ══════════ classic numerical-analysis methods (textbook schemes; own implementations) ══════════
  { name: 'pde-maccormack', src: "N = 50; dx = 1/N; x = (0:N-1)'*dx; c = 1; dt = 0.5*dx; nu = c*dt/dx; u = exp(-100*(x-0.3).^2); for n = 1:round(0.5/dt), us = u - nu*(circshift(u,-1) - u); u = 0.5*(u + us - nu*(us - circshift(us,1))); end; mass = sum(u)*dx; peak = max(u);", vars: ['mass', 'peak'], tol: 1e-6, level: 'graduate', domain: 'numerical-pde', tags: ['advection', 'maccormack', 'predictor-corrector', 'second-order'] },
  { name: 'pde-method-of-lines', src: "n = 9; h = 1/(n+1); A = (diag(ones(n-1,1),1) - 2*eye(n) + diag(ones(n-1,1),-1))/h^2; u = sin(pi*(1:n)'*h); dt = 0.0005; for k = 1:200, k1 = A*u; k2 = A*(u+dt/2*k1); k3 = A*(u+dt/2*k2); k4 = A*(u+dt*k3); u = u + dt/6*(k1+2*k2+2*k3+k4); end; v = max(u);", vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'numerical-pde', tags: ['method-of-lines', 'semi-discretization', 'rk4'] },
  { name: 'na-richardson-extrapolation', src: 'f = @(x) sin(x); x0 = 1; h = 0.1; D = @(hh) (f(x0+hh) - f(x0-hh))/(2*hh); R = (4*D(h/2) - D(h))/3; err = abs(R - cos(1));', vars: ['err'], tol: 1e-7, level: 'graduate', domain: 'numerical-methods', tags: ['richardson-extrapolation', 'order-of-accuracy'] },
  { name: 'na-romberg-integration', src: 'f = @(x) exp(x); a = 0; b = 1; J = 5; R = zeros(J,J); for i = 1:J, n = 2^(i-1); hh = (b-a)/n; xs = a:hh:b; R(i,1) = hh*(sum(f(xs)) - 0.5*(f(a)+f(b))); for k = 2:i, R(i,k) = R(i,k-1) + (R(i,k-1) - R(i-1,k-1))/(4^(k-1) - 1); end; end; err = abs(R(J,J) - (exp(1) - 1));', vars: ['err'], tol: 1e-7, level: 'graduate', domain: 'numerical-methods', tags: ['romberg', 'quadrature', 'richardson'] },
  { name: 'na-aitken-acceleration', src: 'x = 0.5; xs = zeros(20,1); for k = 1:20, x = cos(x); xs(k) = x; end; nn = 10; v = xs(nn) - (xs(nn+1) - xs(nn))^2/(xs(nn+2) - 2*xs(nn+1) + xs(nn));', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-methods', tags: ['aitken', 'series-acceleration', 'fixed-point'] },
  { name: 'na-power-iteration', src: "A = [2 1; 1 3]; v = [1; 0]; for k = 1:200, w = A*v; v = w/norm(w); end; lam = v'*A*v;", vars: ['lam'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['power-iteration', 'dominant-eigenvalue'] },
  { name: 'na-gauss-seidel', src: 'A = [4 1; 1 3]; b = [1; 2]; x = [0; 0]; for k = 1:50, x(1) = (b(1) - A(1,2)*x(2))/A(1,1); x(2) = (b(2) - A(2,1)*x(1))/A(2,2); end; r = norm(A*x - b);', vars: ['r'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['gauss-seidel', 'stationary-iteration', 'residual-invariant'] },
  { name: 'na-sor', src: 'A = [4 1; 1 3]; b = [1; 2]; x = [0; 0]; w = 1.1; for k = 1:50, x(1) = (1-w)*x(1) + w*(b(1) - A(1,2)*x(2))/A(1,1); x(2) = (1-w)*x(2) + w*(b(2) - A(2,1)*x(1))/A(2,2); end; r = norm(A*x - b);', vars: ['r'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['sor', 'over-relaxation', 'residual-invariant'] },
  { name: 'na-halley-method', src: 'f = @(x) x^2 - 2; fp = @(x) 2*x; fpp = @(x) 2; x = 1.5; for k = 1:5, x = x - 2*f(x)*fp(x)/(2*fp(x)^2 - f(x)*fpp(x)); end; err = abs(x - sqrt(2));', vars: ['err'], tol: 1e-9, level: 'graduate', domain: 'nonlinear-systems', tags: ['halley', 'cubic-convergence', 'root-finding'] },
  { name: 'na-numerov-method', src: 'h = 0.05; N = round(pi/2/h); y = zeros(N+1,1); y(1) = 0; y(2) = sin(h); c = 1 + h^2/12; for n = 2:N, y(n+1) = (2*(1 - 5*h^2/12)*y(n) - c*y(n-1))/c; end; v = y(end);', vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'numerical-ode', tags: ['numerov', 'fourth-order', 'boundary-value'] },
  { name: 'na-gauss-newton', src: "t = [0 1 2 3]'; y = 2*exp(0.5*t); p = [1; 1]; for k = 1:15, r = p(1)*exp(p(2)*t) - y; J = [exp(p(2)*t), p(1)*t.*exp(p(2)*t)]; p = p - (J'*J)\\(J'*r); end; v = p;", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['gauss-newton', 'nonlinear-least-squares', 'parameter-estimation'] },

  // ══════════ advanced NA: specialized solvers, explicit eigen algorithms, advanced quadrature, optimization ══════════
  { name: 'na-thomas-tridiagonal', src: 'n = 6; a = -ones(n,1); b = 2*ones(n,1); c = -ones(n,1); d = ones(n,1); for i = 2:n, mm = a(i)/b(i-1); b(i) = b(i) - mm*c(i-1); d(i) = d(i) - mm*d(i-1); end; x = zeros(n,1); x(n) = d(n)/b(n); for i = n-1:-1:1, x(i) = (d(i) - c(i)*x(i+1))/b(i); end; A = 2*eye(n) - diag(ones(n-1,1),1) - diag(ones(n-1,1),-1); r = norm(A*x - ones(n,1));', vars: ['r'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['thomas-algorithm', 'tridiagonal', 'residual-invariant'] },
  { name: 'na-circulant-fft-solve', src: "c = [4 1 0 1]'; b = [1 2 3 4]'; x = real(ifft(fft(b)./fft(c))); n = 4; C = zeros(n); for i = 1:n, C(:,i) = circshift(c, i-1); end; r = norm(C*x - b);", vars: ['r'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['circulant', 'fft-solve', 'structured-matrix'] },
  { name: 'na-inverse-iteration', src: "A = [2 1; 1 3]; mu = 1.5; v = [1; 0]; for k = 1:50, w = (A - mu*eye(2))\\v; v = w/norm(w); end; lam = v'*A*v;", vars: ['lam'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['inverse-iteration', 'eigenvalue', 'shift'] },
  { name: 'na-rayleigh-quotient-iteration', src: "A = [2 1; 1 3]; v = [1; 0]; lam = v'*A*v; for k = 1:6, w = (A - lam*eye(2))\\v; v = w/norm(w); lam = v'*A*v; end; e = min(abs(lam - (5+sqrt(5))/2), abs(lam - (5-sqrt(5))/2));", vars: ['e'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['rayleigh-quotient-iteration', 'cubic-convergence', 'eigenvalue'] },
  { name: 'na-jacobi-eigenvalue', src: "A = [2 1 0; 1 3 1; 0 1 4]; for sw = 1:40, for q = 2:3, for pp = 1:q-1, if abs(A(pp,q)) > 1e-15, th = 0.5*atan2(2*A(pp,q), A(pp,pp) - A(q,q)); cc = cos(th); ss = sin(th); G = eye(3); G(pp,pp) = cc; G(q,q) = cc; G(pp,q) = -ss; G(q,pp) = ss; A = G'*A*G; end; end; end; end; ev = sort(diag(A));", vars: ['ev'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['jacobi-eigenvalue', 'symmetric', 'rotation'] },
  { name: 'na-gauss-hermite-golub-welsch', src: "n = 10; i = (1:n-1)'; be = sqrt(i/2); T = diag(be,1) + diag(be,-1); [V, D] = eig(T); w = sqrt(pi)*(V(1,:)').^2; I = sum(w); err = abs(I - sqrt(pi));", vars: ['err'], tol: 1e-7, level: 'graduate', domain: 'numerical-methods', tags: ['gauss-hermite', 'golub-welsch', 'weighted-quadrature'] },
  { name: 'na-adaptive-integral', src: 'v = integral(@(x) exp(-x.^2), -5, 5); err = abs(v - sqrt(pi));', vars: ['err'], tol: 1e-7, level: 'graduate', domain: 'numerical-methods', tags: ['adaptive-quadrature', 'gauss-kronrod', 'integral'] },
  { name: 'na-total-least-squares', src: 'X = [1 1; 1 2; 1 3; 1 4]; y = [1.1; 1.9; 3.2; 3.8]; A = [X y]; [U, S, V] = svd(A); nv = V(:,end); v = -nv(1:2)/nv(3);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['total-least-squares', 'svd', 'errors-in-variables'] },
  { name: 'na-frank-wolfe', src: 'Q = [2 0; 0 1]; c = [1; 3]; x = [0.5; 0.5]; for k = 1:200, g = Q*x - c; [~, idx] = min(g); s = [0; 0]; s(idx) = 1; ga = 2/(k+2); x = x + ga*(s - x); end; v = x;', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['frank-wolfe', 'conditional-gradient', 'simplex'] },
  { name: 'na-broyden-root', src: "F = @(x) [x(1)^2 + x(2)^2 - 1; x(1) - x(2)]; x = [1; 0.5]; B = eye(2); for k = 1:30, Fx = F(x); s = -B\\Fx; xn = x + s; yv = F(xn) - Fx; B = B + ((yv - B*s)*s')/(s'*s); x = xn; end; v = x;", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'nonlinear-systems', tags: ['broyden', 'quasi-newton', 'root-finding'] },
  { name: 'na-adams-predictor-corrector', src: 'f = @(y) -y; h = 0.1; Y = [1; 1 + 0.1*(-1)]; for k = 2:20, yp = Y(k) + h/2*(3*f(Y(k)) - f(Y(k-1))); yc = Y(k) + h/2*(f(yp) + f(Y(k))); Y(k+1) = yc; end; v = Y(end);', vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'numerical-ode', tags: ['predictor-corrector', 'adams-bashforth-moulton', 'multistep'] },
  { name: 'na-milstein-sde', src: 'a = 0.1; b = 0.2; X = 1; dt = 0.25; dW = [0.1 -0.2 0.15 0.05]; for k = 1:4, X = X + a*X*dt + b*X*dW(k) + 0.5*b^2*X*(dW(k)^2 - dt); end; v = X;', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-ode', tags: ['sde', 'milstein', 'higher-order', 'prescribed-path'] },

  // ══════════ weak-row fill: computational statistics, combinatorial opt, DAE, Krylov eigen, coding ══════════
  { name: 'stat-linreg-normal-qr', src: "X = [1 1; 1 2; 1 3; 1 4]; y = [1; 3; 2; 5]; b1 = (X'*X)\\(X'*y); [Q, R] = qr(X, 0); b2 = R\\(Q'*y); v = [b1; norm(b1 - b2)];", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'statistics', tags: ['linear-regression', 'normal-equations', 'qr', 'least-squares'] },
  { name: 'stat-logistic-irls', src: "X = [1 0; 1 1; 1 2; 1 3; 1 4]; y = [0; 1; 0; 1; 1]; b = [0; 0]; for k = 1:25, pr = 1./(1 + exp(-X*b)); W = diag(pr.*(1 - pr)); b = b + (X'*W*X)\\(X'*(y - pr)); end; v = b;", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'statistics', tags: ['logistic-regression', 'irls', 'newton'] },
  { name: 'stat-pca-svd', src: "X = [2 0; 0 1; -2 0; 0 -1]; Xc = X - mean(X); [U, S, V] = svd(Xc, 0); n = size(X, 1); v = [S(1,1)^2/(n-1); S(2,2)^2/(n-1)];", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'statistics', tags: ['pca', 'svd', 'explained-variance'] },
  { name: 'opt-intlinprog-knapsack', src: 'vals = [60 100 120]; w = [10 20 30]; x = intlinprog(-vals, 1:3, w, 50, [], [], zeros(3,1), ones(3,1)); v = vals*round(x);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['intlinprog', 'knapsack', 'binary', 'combinatorial'] },
  { name: 'ode-mass-matrix-rk4', src: "M = [2 0; 0 1]; A = [0 1; -1 0]; y = [1; 0]; dt = 0.01; for k = 1:100, f = @(z) M\\(A*z); k1 = f(y); k2 = f(y+dt/2*k1); k3 = f(y+dt/2*k2); k4 = f(y+dt*k3); y = y + dt/6*(k1+2*k2+2*k3+k4); end; v = y;", vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'numerical-ode', tags: ['mass-matrix', 'dae', 'rk4'] },
  { name: 'ode-ode15s-mass', src: "M = [2 0; 0 1]; opts = odeset('Mass', M); [t, Y] = ode15s(@(t, z) [0 1; -1 0]*z, [0 1], [1; 0], opts); v = Y(end, :)';", vars: ['v'], tol: 1e-2, level: 'graduate', domain: 'numerical-ode', tags: ['ode15s', 'mass-matrix', 'dae', 'oracle-validation'] },
  { name: 'na-arnoldi-ritz', src: "A = [4 1 0 0; 1 3 1 0; 0 1 2 1; 0 0 1 1]; q = [1; 0; 0; 0]; m = 3; Q = q; H = zeros(m+1, m); for j = 1:m, w = A*Q(:,j); for i = 1:j, H(i,j) = Q(:,i)'*w; w = w - H(i,j)*Q(:,i); end; H(j+1,j) = norm(w); Q(:,j+1) = w/H(j+1,j); end; v = max(real(eig(H(1:m, 1:m))));", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['arnoldi', 'krylov', 'ritz-values'] },
  { name: 'na-lanczos-ritz', src: "A = [4 1 0; 1 3 1; 0 1 2]; q = [1; 0; 0]; q = q/norm(q); m = 3; Q = zeros(3, m); Q(:,1) = q; al = zeros(m,1); be = zeros(m,1); for j = 1:m, w = A*Q(:,j); al(j) = Q(:,j)'*w; if j > 1, w = w - be(j-1)*Q(:,j-1); end; w = w - al(j)*Q(:,j); if j < m, be(j) = norm(w); Q(:,j+1) = w/be(j); end; end; T = diag(al) + diag(be(1:m-1), 1) + diag(be(1:m-1), -1); v = sort(real(eig(T)));", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['lanczos', 'krylov', 'symmetric', 'ritz-values'] },
  { name: 'na-clenshaw-curtis', src: "N = 16; th = pi*(0:N)'/N; x = cos(th); f = exp(x); w = zeros(N+1, 1); for k = 0:N, s = 0; for j = 1:floor(N/2), s = s + cos(2*j*th(k+1))/(4*j^2 - 1); end; w(k+1) = (2/N)*(1 - 2*s); end; w(1) = w(1)/2; w(N+1) = w(N+1)/2; err = abs(w'*f - (exp(1) - exp(-1)));", vars: ['err'], tol: 1e-7, level: 'graduate', domain: 'numerical-methods', tags: ['clenshaw-curtis', 'chebyshev-quadrature'] },
  { name: 'coding-gf2-polymul', src: 'a = [1 0 1]; b = [1 1]; v = mod(conv(a, b), 2);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'coding', tags: ['finite-field', 'gf2', 'polynomial'] },
  { name: 'coding-hammgen', src: '[H, G, n, k] = hammgen(3); v = [n k size(H, 1)];', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'coding', tags: ['hamming-code', 'parity-check', 'error-correction'] },
  { name: 'coding-biterr', src: '[num, rate] = biterr([1 0 1 1], [1 1 1 0]); v = [num rate];', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'coding', tags: ['bit-error-rate', 'biterr'] },

  // ══════════ hypothesis tests, ML math, matching, info theory, resultants ══════════
  { name: 'stat-ttest-onesample', src: '[h, pv] = ttest([5.1 4.9 5.2 5.0 4.8], 5); v = [h pv];', vars: ['v'], tol: 1e-4, level: 'graduate', domain: 'statistics', tags: ['hypothesis-test', 'ttest', 't-test'] },
  { name: 'stat-ttest2-twosample', src: '[h, pv] = ttest2([1 2 3 4], [3 4 5 6]); v = [h pv];', vars: ['v'], tol: 1e-4, level: 'graduate', domain: 'statistics', tags: ['hypothesis-test', 'ttest2', 'two-sample'] },
  { name: 'stat-bootstrap-fixed', src: "x = [2 4 6 8 10]; idx = [1 2 2 3; 3 4 5 5; 1 1 5 5]'; v = mean(x(idx))';", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'statistics', tags: ['bootstrap', 'resampling', 'deterministic-indices'] },
  { name: 'ml-kmeans-lloyd', src: "X = [1 1; 1.5 2; 3 4; 5 7; 3.5 5; 4.5 5; 3.5 4.5]; C = [1 1; 5 7]; for it = 1:10, d1 = sum((X - C(1,:)).^2, 2); d2 = sum((X - C(2,:)).^2, 2); a = d2 < d1; C(1,:) = mean(X(~a,:)); C(2,:) = mean(X(a,:)); end; v = sort(C(:,1));", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'machine-learning', tags: ['k-means', 'lloyd', 'clustering', 'fixed-init'] },
  { name: 'ml-rbf-kernel', src: "X = [0; 1; 2]; g = 0.5; D = (X - X').^2; K = exp(-g*D); v = K(:,2);", vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'machine-learning', tags: ['rbf-kernel', 'gaussian-kernel', 'kernel-matrix'] },
  { name: 'ml-kernel-ridge', src: "X = [0; 1; 2; 3]; y = [0; 1; 4; 9]; g = 0.5; D = (X - X').^2; K = exp(-g*D); lam = 0.1; al = (K + lam*eye(4))\\y; v = norm(K*al - y);", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'machine-learning', tags: ['kernel-ridge-regression', 'regularization'] },
  { name: 'ml-nn-forward', src: 'x = [1; 2]; W1 = [0.1 0.2; 0.3 0.4]; b1 = [0.1; 0.1]; h = max(W1*x + b1, 0); W2 = [0.5 0.6]; b2 = 0.2; v = W2*h + b2;', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'machine-learning', tags: ['neural-network', 'forward-pass', 'relu'] },
  { name: 'opt-matchpairs-assignment', src: 'C = [1 5 4; 3 2 6; 5 4 3]; M = matchpairs(C, 100); v = sortrows(M);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'graph', tags: ['assignment-problem', 'bipartite-matching', 'matchpairs'] },
  { name: 'coding-binary-entropy', src: 'p = 0.25; v = -p*log2(p) - (1-p)*log2(1-p);', vars: ['v'], tol: 1e-7, level: 'undergrad', domain: 'coding', tags: ['binary-entropy', 'information-theory'] },
  { name: 'coding-mutual-information', src: 'P = [0.3 0.2; 0.1 0.4]; px = sum(P,2); py = sum(P,1); I = 0; for i = 1:2, for j = 1:2, if P(i,j) > 0, I = I + P(i,j)*log2(P(i,j)/(px(i)*py(j))); end; end; end; v = I;', vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'coding', tags: ['mutual-information', 'joint-distribution'] },
  { name: 'coding-gf2-divide', src: '[q, r] = gfdeconv([1 0 0 1], [1 1]); v = [q r];', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'coding', tags: ['gf2', 'polynomial-division', 'gfdeconv'] },
  { name: 'coding-hamming-syndrome', src: "[H, G] = hammgen(3); c = mod(G(1,:), 2); e = zeros(1,7); e(3) = 1; r = mod(c + e, 2); v = mod(H*r', 2)';", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'coding', tags: ['hamming-code', 'syndrome', 'error-detection'] },
  { name: 'cal-resultant', src: 'syms x; r = resultant(x^2 - 1, x - 2, x); v = double(r);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'symbolic', tags: ['resultant', 'elimination', 'symbolic'] },
  { name: 'cal-discriminant-resultant', src: 'syms x; p = x^3 - 6*x^2 + 11*x - 6; v = double(resultant(p, diff(p, x), x));', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'symbolic', tags: ['discriminant', 'resultant', 'symbolic'] },

  // ══════════ number theory, computational topology, differential geometry, bifurcation ══════════
  { name: 'nt-gcd-lcm', src: 'v = [gcd(252, 198) lcm(4, 6)];', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'number-theory', tags: ['gcd', 'lcm', 'euclidean'] },
  { name: 'nt-modular-exponentiation', src: 'v = powermod(3, 100, 7);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'number-theory', tags: ['modular-exponentiation', 'powermod'] },
  { name: 'nt-modular-inverse', src: 'a = 3; n = 7; t = 0; nt = 1; rr = n; nr = a; while nr ~= 0, q = floor(rr/nr); tmp = t - q*nt; t = nt; nt = tmp; tmp = rr - q*nr; rr = nr; nr = tmp; end; if t < 0, t = t + n; end; v = t;', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'number-theory', tags: ['modular-inverse', 'extended-euclid'] },
  { name: 'nt-primality', src: 'v = [isprime(97) isprime(100)];', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'number-theory', tags: ['primality', 'isprime'] },
  { name: 'nt-integer-factorization', src: 'v = factor(360);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'number-theory', tags: ['integer-factorization', 'factor'] },
  { name: 'topo-betti-hollow-triangle', src: 'B1 = [-1 0 1; 1 -1 0; 0 1 -1]; r1 = rank(B1); v = [3 - r1; 3 - r1];', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'topology', tags: ['betti-numbers', 'simplicial-complex', 'boundary-matrix', 'homology'] },
  { name: 'topo-betti-filled-triangle', src: 'B1 = [-1 0 1; 1 -1 0; 0 1 -1]; B2 = [1; -1; 1]; r1 = rank(B1); r2 = rank(B2); v = [3 - r1; 3 - r1 - r2];', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'topology', tags: ['betti-numbers', 'contractible', 'homology'] },
  { name: 'topo-euler-characteristic', src: 'V = 3; E = 3; F = 1; v = V - E + F;', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'topology', tags: ['euler-characteristic', 'simplicial-complex'] },
  { name: 'dg-curve-curvature', src: 'syms t; x = 2*cos(t); y = 2*sin(t); xp = diff(x,t); yp = diff(y,t); xpp = diff(xp,t); ypp = diff(yp,t); k = abs(xp*ypp - yp*xpp)/(xp^2 + yp^2)^(3/2); v = double(subs(k, t, 0.5));', vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'symbolic', tags: ['differential-geometry', 'curvature', 'parametric-curve'] },
  { name: 'dg-jacobian-polar-det', src: 'syms r th; J = jacobian([r*cos(th); r*sin(th)], [r th]); d = simplify(det(J)); v = double(subs(d, [r th], [3 0.5]));', vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'symbolic', tags: ['differential-geometry', 'jacobian', 'coordinate-transform'] },
  { name: 'dg-arc-length', src: 'f = @(t) sqrt((-2*sin(t)).^2 + (2*cos(t)).^2); v = integral(f, 0, pi);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-methods', tags: ['differential-geometry', 'arc-length', 'numerical-integration'] },
  { name: 'dyn-newton-fixed-point', src: 'r = 3.5; x = 0.7; for k = 1:20, fx = r*x*(1-x) - x; fp = r*(1-2*x) - 1; x = x - fx/fp; end; v = x;', vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'dynamical-systems', tags: ['newton', 'fixed-point', 'continuation'] },
  { name: 'dyn-stable-cycle-period4', src: 'r = 3.5; x = 0.5; for k = 1:1000, x = r*x*(1-x); end; c = zeros(4,1); for k = 1:4, x = r*x*(1-x); c(k) = x; end; v = sort(c);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'dynamical-systems', tags: ['logistic-map', 'period-doubling', 'stable-cycle', 'bifurcation'] },
  { name: 'coding-generator-paritycheck', src: "[H, G] = hammgen(3); v = sum(sum(mod(G*H', 2)));", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'coding', tags: ['generator-matrix', 'parity-check', 'orthogonality'] },

  // ══════════ curriculum fill: root finders, quadrature, approximation, NLA/ODE/PDE/opt algorithms ══════════
  { name: 'na-false-position', src: "f = @(x) x^2 - 2; a = 1; b = 2; for k = 1:60, c = (a*f(b) - b*f(a))/(f(b) - f(a)); if f(a)*f(c) < 0, b = c; else, a = c; end; end; err = abs(c - sqrt(2));", vars: ['err'], tol: 1e-7, level: 'undergrad', domain: 'nonlinear-systems', tags: ['regula-falsi', 'false-position', 'root-finding'] },
  { name: 'na-brent-fzero', src: 'v = fzero(@(x) x^3 - 2*x - 5, 2);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'nonlinear-systems', tags: ['brent', 'fzero', 'root-finding'] },
  { name: 'na-adaptive-simpson', src: 'v = quad(@(x) exp(x), 0, 1); err = abs(v - (exp(1) - 1));', vars: ['err'], tol: 1e-7, level: 'graduate', domain: 'numerical-methods', tags: ['adaptive-simpson', 'quad', 'quadrature'] },
  { name: 'na-pade-exp', src: "syms x; pp = pade(exp(x), 'Order', [2 2]); v = double(subs(pp, x, 0.5));", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'approximation', tags: ['pade-approximant', 'rational-approximation'] },
  { name: 'na-bezier-decasteljau', src: 'P = [0 1 3 2]; t = 0.5; while numel(P) > 1, P = (1-t)*P(1:end-1) + t*P(2:end); end; v = P;', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'approximation', tags: ['bezier', 'de-casteljau'] },
  { name: 'na-bspline-deboor', src: "kn = [0 0 0 0 1 2 3 3 3 3]; P = [0 1 3 2 4 5]; pdeg = 3; t = 1.5; k = find(kn <= t, 1, 'last'); k = min(k, numel(P)); d = P(k-pdeg:k); for r = 1:pdeg, for j = pdeg:-1:r, i = k-pdeg+j; al = (t - kn(i))/(kn(i+pdeg-r+1) - kn(i)); d(j+1) = (1-al)*d(j) + al*d(j+1); end; end; v = d(pdeg+1);", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'approximation', tags: ['b-spline', 'de-boor'] },
  { name: 'na-kaczmarz', src: "A = [4 1; 1 3]; b = [1; 2]; x = [0; 0]; for k = 1:300, i = mod(k-1, 2) + 1; ai = A(i,:); x = x + ((b(i) - ai*x)/(ai*ai'))*ai'; end; r = norm(A*x - b);", vars: ['r'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['kaczmarz', 'row-projection', 'iterative'] },
  { name: 'na-qr-algorithm-eigen', src: 'A = [2 1; 1 3]; for k = 1:300, [Q, R] = qr(A); A = R*Q; end; v = sort(diag(A));', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['qr-algorithm', 'eigenvalue', 'iteration'] },
  { name: 'ode-shooting-bvp', src: "A = [0 1; -1 0]; h = 0.01; N = 100; y = [0; 0]; for k = 1:N, k1 = A*y; k2 = A*(y+h/2*k1); k3 = A*(y+h/2*k2); k4 = A*(y+h*k3); y = y + h/6*(k1+2*k2+2*k3+k4); end; ya = y(1); y = [0; 1]; for k = 1:N, k1 = A*y; k2 = A*(y+h/2*k1); k3 = A*(y+h/2*k2); k4 = A*(y+h*k3); y = y + h/6*(k1+2*k2+2*k3+k4); end; yb = y(1); v = (1 - ya)/(yb - ya);", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-ode', tags: ['shooting-method', 'bvp', 'linear'] },
  { name: 'ode-exponential-integrator', src: "A = [-2 1; 0 -3]; b = [1; 1]; y = [1; 0]; h = 0.1; E = expm(A*h); Pp = (E - eye(2))*(A\\b); for k = 1:10, y = E*y + Pp; end; v = y;", vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'numerical-ode', tags: ['exponential-integrator', 'matrix-exponential', 'exact-linear'] },
  { name: 'pde-adi-heat-2d', src: "n = 5; h = 1/(n+1); dt = 0.01; r = dt/(2*h^2); e = ones(n,1); T = full(spdiags([e -2*e e], -1:1, n, n)); I = eye(n); u = ones(n,n); for st = 1:10, us = (I - r*T)\\(u + r*(u*T)); u = (us + r*(T*us))/(I - r*T); end; v = u(3,3);", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-pde', tags: ['adi', 'peaceman-rachford', 'operator-splitting', 'heat-2d'] },
  { name: 'opt-trust-region-dogleg', src: "H = [2 0; 0 1]; g0 = [1; 3]; x = [0; 0]; D = 1; for k = 1:30, gr = H*x - g0; pN = -(H\\gr); if norm(pN) <= D, pp = pN; else, pC = -(gr'*gr)/(gr'*H*gr)*gr; if norm(pC) >= D, pp = D*pC/norm(pC); else, dd = pN - pC; aa = dd'*dd; bb = 2*pC'*dd; cc = pC'*pC - D^2; ta = (-bb + sqrt(bb^2 - 4*aa*cc))/(2*aa); pp = pC + ta*dd; end; end; x = x + pp; end; v = x;", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['trust-region', 'dogleg', 'newton'] },
  { name: 'opt-barrier-method', src: 'x = 0.5; for mu = [1 0.1 0.01 0.001 1e-4], for it = 1:30, g = 2*(x-2) - mu*(1/x - 1/(1-x)); Hh = 2 + mu*(1/x^2 + 1/(1-x)^2); dx = -g/Hh; al = 1; while x + al*dx <= 0 || x + al*dx >= 1, al = al/2; end; x = x + al*dx; end; end; v = x;', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'optimization', tags: ['barrier-method', 'interior-point', 'log-barrier'] },
  { name: 'na-kahan-summation', src: 'x = [1, ones(1,1000)*1e-16]; s = 0; c = 0; for i = 1:numel(x), y = x(i) - c; t = s + y; c = (t - s) - y; s = t; end; v = s;', vars: ['v'], tol: 1e-12, level: 'graduate', domain: 'numerical-methods', tags: ['kahan-summation', 'compensated', 'robustness'] },

  // ══════════ coverage gap: useful implemented-but-untested builtins (verified working) ══════════
  { name: 'lang-cellfun', src: 'v = cellfun(@numel, {[1 2], [3 4 5], 7});', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'core-language', tags: ['cellfun', 'functional', 'oracle-validation'] },
  { name: 'lang-arrayfun', src: 'v = arrayfun(@(x) x^2, [1 2 3 4]);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'core-language', tags: ['arrayfun', 'functional', 'oracle-validation'] },
  { name: 'lang-set-operations', src: 'ia = intersect([1 2 3 4], [2 4 6]); sd = setdiff([1 2 3 4], [2 4]); im = double(ismember([1 2 3], [2 3 4]));', vars: ['ia', 'sd', 'im'], tol: 1e-9, level: 'undergrad', domain: 'core-language', tags: ['set-operations', 'intersect', 'setdiff', 'ismember'] },
  { name: 'lang-flip-rot90-triu', src: 'fl = flip([1 2 3 4]); rt = rot90([1 2; 3 4]); tu = triu([1 2 3; 4 5 6; 7 8 9]);', vars: ['fl', 'rt', 'tu'], tol: 1e-9, level: 'undergrad', domain: 'core-language', tags: ['flip', 'rot90', 'triu', 'array-manipulation'] },
  { name: 'lang-nchoosek-factorial', src: 'v = [nchoosek(6, 2) factorial(5)];', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'core-language', tags: ['nchoosek', 'factorial', 'combinatorics'] },
  { name: 'lang-fillmissing', src: "v = fillmissing([1 NaN 3 NaN 5], 'linear');", vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'core-language', tags: ['fillmissing', 'interpolation', 'missing-data'] },
  { name: 'lang-discretize', src: 'v = discretize([0.2 1.5 2.7], [0 1 2 3]);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'core-language', tags: ['discretize', 'binning'] },
  { name: 'cal-cumtrapz', src: 'v = cumtrapz([1 2 3 4]);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'calculus', tags: ['cumtrapz', 'cumulative-integral'] },
  { name: 'poly-polyder-polyint', src: 'd = polyder([1 0 -1]); i = polyint([3 2 1]);', vars: ['d', 'i'], tol: 1e-9, level: 'undergrad', domain: 'numerical-methods', tags: ['polyder', 'polyint', 'polynomial'] },
  { name: 'poly-deconv', src: 'v = deconv([1 3 3 1], [1 1]);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'numerical-methods', tags: ['deconv', 'polynomial-division'] },
  { name: 'la-toeplitz-hankel', src: "tp = toeplitz([1 2 3]); hk = hankel([1 2 3]);", vars: ['tp', 'hk'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra', tags: ['toeplitz', 'hankel', 'structured-matrix'] },
  { name: 'la-blkdiag', src: 'v = blkdiag([1 2], 3, [4; 5]);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra', tags: ['blkdiag', 'block-matrix'] },
  { name: 'stat-movmean-movmedian', src: 'mm = movmean([1 2 3 4 5], 3); md = movmedian([1 5 2 8 3], 3);', vars: ['mm', 'md'], tol: 1e-9, level: 'undergrad', domain: 'statistics', tags: ['movmean', 'movmedian', 'moving-window'] },
  { name: 'sig-filter', src: 'v = filter([1 1], 1, [1 2 3 4]);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'fourier', tags: ['filter', 'fir', 'difference-equation'] },
  { name: 'sig-xcorr', src: 'v = xcorr([1 2 3]);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'fourier', tags: ['xcorr', 'cross-correlation'] },
  { name: 'la-balance-eig-invariant', src: 'A = [1 100; 0.01 2]; v = sort(real(eig(balance(A))));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['balance', 'scaling', 'eigenvalue-invariant'] },
  { name: 'la-qz-generalized-eig', src: 'A = [6 0; 0 6]; B = [2 0; 0 3]; [AA, BB] = qz(A, B); v = sort(real(diag(AA)./diag(BB)));', vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['qz', 'generalized-eigenvalue', 'invariant'] },
  // multiobjective optimization solvers — well-posed (competing objectives), validated after a silently-wrong hunt
  { name: 'opt-fgoalattain', src: 'x = fgoalattain(@(z) [z(1)^2 + z(2)^2; (z(1)-2)^2 + z(2)^2], [1; 1], [1; 1], [1; 1]); v = x;', vars: ['v'], tol: 1e-2, level: 'graduate', domain: 'optimization', tags: ['fgoalattain', 'multiobjective', 'goal-attainment', 'oracle-validation'] },
  { name: 'opt-fminimax', src: 'x = fminimax(@(z) [z^2; (z-2)^2], 1); v = x;', vars: ['v'], tol: 1e-2, level: 'graduate', domain: 'optimization', tags: ['fminimax', 'minimax', 'oracle-validation'] },

  // ══════════ negative tests (expectError): the engine must fail where MATLAB fails ══════════
  { name: 'err-dim-mismatch', src: 'A = [1 2] * [3 4 5];', vars: [], expectError: true, level: 'undergrad', domain: 'core-language', tags: ['error', 'dimension-mismatch'] },
  { name: 'err-oob-index', src: 'v = [1 2]; x = v(5);', vars: [], expectError: true, level: 'undergrad', domain: 'core-language', tags: ['error', 'out-of-bounds'] },
  { name: 'err-undefined-variable', src: 'y = undefined_xyz_var + 1;', vars: [], expectError: true, level: 'undergrad', domain: 'core-language', tags: ['error', 'undefined'] },
  { name: 'err-noninteger-index', src: 'A = [1 2 3]; x = A(1.5);', vars: [], expectError: true, level: 'undergrad', domain: 'core-language', tags: ['error', 'index-type'] },
  { name: 'err-bad-concat', src: 'A = [1 2; 3];', vars: [], expectError: true, level: 'undergrad', domain: 'core-language', tags: ['error', 'concatenation'] },

  // ══════════ hardening coverage: special functions, stats, 2-D, sparse utils, closures, control flow ══════════
  { name: 'specfun-besselj', src: 'v = besselj(0, 2.4048);', vars: ['v'], tol: 1e-4, level: 'undergrad', domain: 'numerical-methods', tags: ['bessel', 'special-functions'] },
  { name: 'specfun-legendre', src: 'P = legendre(2, 0.5); v = P(1);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-methods', tags: ['legendre', 'special-functions'] },
  { name: 'specfun-gamma-half', src: 'v = gamma(5.5);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-methods', tags: ['gamma-function', 'special-functions'] },
  { name: 'stat-cov-matrix', src: 'X = [1 2; 3 5; 4 6]; C = cov(X); v = C(1,2);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'statistics', tags: ['covariance', 'cov'] },
  { name: 'stat-cov-vectors', src: 'x = [1; 3; 4]; y = [2; 5; 6]; C = cov(x, y); v = C(1,2);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'statistics', tags: ['covariance', 'two-vectors'] },
  { name: 'dsp-conv2-valid', src: "A = [1 2 3; 4 5 6; 7 8 9]; K = [1 1; 1 1]; C = conv2(A, K, 'valid'); v = C(1,1);", vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'fourier', tags: ['conv2', '2d-convolution'] },
  { name: 'dsp-interpft', src: 'y = [0 1 0 -1]; yq = interpft(y, 8); v = yq(2);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'fourier', tags: ['interpft', 'spectral-interpolation'] },
  { name: 'num-integral2', src: 'v = integral2(@(x,y) x.*y, 0, 1, 0, 2);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-methods', tags: ['integral2', 'cubature'] },
  { name: 'num-gradient-2d', src: '[X, Y] = meshgrid(1:3, 1:3); Z = X.^2 + Y.^2; [FX, FY] = gradient(Z); v = [FX(2,2) FY(2,2)];', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'numerical-methods', tags: ['gradient', 'finite-difference'] },
  { name: 'num-del2', src: '[X, Y] = meshgrid(1:4, 1:4); Z = X.^2 - Y.^2; L = del2(Z); v = L(2,2);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-methods', tags: ['del2', 'discrete-laplacian'] },
  { name: 'sparse-condest', src: 'e = ones(10,1); S = spdiags([e -2*e e], -1:1, 10, 10); v = condest(S);', vars: ['v'], tol: 1e-1, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['condest', '1-norm-estimate'] },
  { name: 'sparse-find-triplet', src: 'S = sparse([1 0; 0 2]); [r, c, vv] = find(S); v = [r c vv];', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra', tags: ['sparse', 'find', 'coordinate-format'] },
  { name: 'sparse-nonzeros', src: 'S = sparse([0 3 0; 4 0 5]); v = nonzeros(S);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra', tags: ['sparse', 'nonzeros'] },
  { name: 'nla-cholupdate', src: "A = [4 1; 1 3]; R = chol(A); x = [1; 1]; R1 = cholupdate(R, x, '+'); v = norm(R1'*R1 - (A + x*x'));", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['cholupdate', 'rank-1-update'] },
  { name: 'ode-analytic-jacobian', src: "opts = odeset('Jacobian', @(t,y) [-1000 1; 0 -1]); [t, y] = ode15s(@(t,y) [-1000*y(1) + y(2); -y(2)], [0 1], [1; 1], opts); v = y(end,2);", vars: ['v'], tol: 1e-3, level: 'graduate', domain: 'numerical-ode', tags: ['ode15s', 'analytic-jacobian', 'stiff'] },
  { name: 'ode-tolerances', src: "opts = odeset('RelTol', 1e-8, 'AbsTol', 1e-10); [t, y] = ode45(@(t,y) -y, [0 1], 1, opts); v = y(end);", vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'numerical-ode', tags: ['ode45', 'tolerances'] },
  { name: 'lang-setxor', src: 'v = setxor([1 2 3], [2 3 4]);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'core-language', tags: ['setxor', 'symmetric-difference'] },
  { name: 'lang-strsplit-contains', src: "n = numel(strsplit('a,b,c', ',')); tf = double(contains('fminsearch', 'search'));", vars: ['n', 'tf'], tol: 1e-9, level: 'undergrad', domain: 'core-language', tags: ['strsplit', 'contains', 'text'] },
  { name: 'lang-closure-capture-by-value', src: 'a = 1; f = @(x) x + a; a = 2; v = f(5);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'core-language', tags: ['anonymous-function', 'lexical-scoping', 'snapshot-closure'] },
  { name: 'lang-nested-function-handle', src: 'f = @(a) @(x) a*x.^2; g = f(3); v = g(2);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'core-language', tags: ['anonymous-function', 'currying'] },
  { name: 'lang-break-continue', src: 's = 0; for k = 1:10, if k == 3, continue; end; if k == 6, break; end; s = s + k; end; v = s;', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'core-language', tags: ['break', 'continue', 'control-flow'] },
  { name: 'lang-rng-reproducibility', src: 'rng(42); a = rand(1, 5); rng(42); b = rand(1, 5); v = norm(a - b);', vars: ['v'], tol: 1e-15, level: 'undergrad', domain: 'statistics', tags: ['rng', 'seed', 'reproducibility-invariant'] },

  // ══════════ classic linear-algebra theorems & identities (validated as norm-zero invariants) ══════════
  { name: 'la-cayley-hamilton', src: 'A = [2 1; 1 3]; v = norm(polyvalm(charpoly(A), A));', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'linear-algebra', tags: ['cayley-hamilton', 'characteristic-polynomial', 'identity'] },
  { name: 'la-cramer-numeric', src: 'A = [2 1; 1 3]; b = [1; 2]; x1 = det([b A(:,2)])/det(A); x2 = det([A(:,1) b])/det(A); v = norm(A*[x1; x2] - b);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra', tags: ['cramers-rule', 'determinant'] },
  { name: 'la-rank-nullity', src: 'A = [1 2 3; 2 4 6]; v = rank(A) + size(null(A), 2);', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra', tags: ['rank-nullity', 'null-space', 'theorem'] },
  { name: 'la-schur-complement', src: 'M = [4 2; 1 3]; A = M(1,1); B = M(1,2); C = M(2,1); D = M(2,2); v = D - C/A*B;', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'linear-algebra', tags: ['schur-complement', 'block-matrix'] },
  { name: 'la-householder', src: "x = [3; 4]; w = x; w(1) = w(1) + norm(x); H = eye(2) - 2*(w*w')/(w'*w); r = H*x; v = r(2);", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['householder', 'reflection', 'orthogonal'] },
  { name: 'la-woodbury-identity', src: 'A = 2*eye(3); U = [1; 0; 1]; V = [1 0 1]; lhs = inv(A + U*V); rhs = inv(A) - inv(A)*U/(1 + V*inv(A)*U)*V*inv(A); v = norm(lhs - rhs);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['woodbury', 'sherman-morrison', 'matrix-inversion-lemma'] },
  { name: 'la-outer-product-rank1', src: "x = [1; 2; 3]; y = [4; 5]; M = x*y'; v = [rank(M) M(2,2)];", vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra', tags: ['outer-product', 'rank-one'] },
  { name: 'la-adjugate', src: 'v = adjoint([1 2; 3 4]); v = v(:)\x27;', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra', tags: ['adjugate', 'adjoint', 'cofactor'] },
  { name: 'la-polar-decomposition', src: "A = [2 1; 0 3]; [U, S, V] = svd(A); Up = U*V'; P = V*S*V'; v = norm(Up*P - A) + norm(Up'*Up - eye(2));", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['polar-decomposition', 'svd', 'orthogonal-factor'] },
  { name: 'la-pfaffian', src: 'A = [0 2; -2 0]; pf = 2; v = pf^2 - det(A);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'linear-algebra', tags: ['pfaffian', 'skew-symmetric', 'determinant'] },
  { name: 'la-minor-cofactor', src: 'A = [1 2 3; 4 5 6; 7 8 10]; v = det(A([2 3], [2 3]));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'linear-algebra', tags: ['minor', 'cofactor', 'submatrix'] },
  { name: 'la-cauchy-binet', src: 'A = [1 2 3; 4 5 6]; B = [1 0; 0 1; 1 1]; v = det(A*B);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'linear-algebra', tags: ['cauchy-binet', 'determinant', 'product'] },
  { name: 'la-spectral-theorem', src: "A = [2 1; 1 2]; [V, D] = eig(A); v = norm(V'*V - eye(2)) + norm(V*D*V' - A);", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['spectral-theorem', 'symmetric', 'orthogonal-eigenvectors'] },
  { name: 'la-positive-definite-chol', src: 'A = [2 1; 1 2]; [R, flag] = chol(A); v = flag;', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra', tags: ['positive-definite', 'cholesky', 'flag'] },

  // ══════════ numerical linear algebra category: iterative solvers, orthogonalization, structured matrices ══════════
  { name: 'nla-givens-rotation', src: "a = 3; b = 4; rr = hypot(a, b); c = a/rr; s = b/rr; G = [c s; -s c]; y = G*[a; b]; v = y(2);", vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['givens-rotation', 'orthogonalization'] },
  { name: 'nla-jacobi-iteration', src: 'A = [4 1; 1 3]; b = [1; 2]; x = [0; 0]; D = diag(diag(A)); R = A - D; for k = 1:100, x = D\\(b - R*x); end; v = norm(A*x - b);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['jacobi-method', 'stationary-iteration', 'residual-invariant'] },
  { name: 'nla-iterative-refinement', src: 'A = [4 1; 1 3]; b = [1; 2]; x = A\\b; res = b - A*x; dx = A\\res; x = x + dx; v = norm(A*x - b);', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['iterative-refinement', 'residual-invariant'] },
  { name: 'nla-modified-richardson', src: 'A = [4 1; 1 3]; b = [1; 2]; x = [0; 0]; w = 0.3; for k = 1:300, x = x + w*(b - A*x); end; v = norm(A*x - b);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['richardson-iteration', 'stationary'] },
  { name: 'nla-ssor', src: 'A = [4 1; 1 3]; b = [1; 2]; n = 2; x = [0; 0]; w = 1.2; for k = 1:50, for i = 1:n, idx = [1:i-1 i+1:n]; x(i) = (1-w)*x(i) + w*(b(i) - A(i,idx)*x(idx))/A(i,i); end; for i = n:-1:1, idx = [1:i-1 i+1:n]; x(i) = (1-w)*x(i) + w*(b(i) - A(i,idx)*x(idx))/A(i,i); end; end; v = norm(A*x - b);', vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['ssor', 'symmetric-sor', 'forward-backward-sweep'] },
  { name: 'nla-chebyshev-iteration', src: "A = [4 1; 1 3]; b = [1; 2]; lmin = 2; lmax = 5; d = (lmax+lmin)/2; c = (lmax-lmin)/2; x = [0; 0]; r = b - A*x; for k = 1:30, if k == 1, p1 = r; al = 1/d; elseif k == 2, be = (c/2)^2*al; al = 1/(d - be/al); p1 = r + be*p1; else, be = (c/2*al)^2; al = 1/(d - be/al); p1 = r + be*p1; end; x = x + al*p1; r = b - A*x; end; v = norm(A*x - b);", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['chebyshev-iteration', 'spectral-bounds'] },
  { name: 'nla-conjugate-residual', src: "A = [4 1; 1 3]; b = [1; 2]; x = [0; 0]; r = b - A*x; pp = r; Ap = A*pp; Ar = A*r; for k = 1:10, al = (r'*Ar)/(Ap'*Ap); x = x + al*pp; rn = r - al*Ap; Arn = A*rn; be = (rn'*Arn)/(r'*Ar); pp = rn + be*pp; Ap = Arn + be*Ap; r = rn; Ar = Arn; end; v = norm(A*x - b);", vars: ['v'], tol: 1e-6, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['conjugate-residual', 'krylov', 'symmetric'] },
  { name: 'nla-qr-pivoting', src: 'A = [1 2 3; 4 5 6; 7 8 9]; [Q, R, E] = qr(A); v = norm(A*E - Q*R);', vars: ['v'], tol: 1e-7, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['rrqr', 'column-pivoting', 'rank-revealing'] },
  { name: 'nla-wilkinson-matrix', src: 'W = wilkinson(5); v = [trace(W) W(3,3)];', vars: ['v'], tol: 1e-9, level: 'graduate', domain: 'numerical-linear-algebra', tags: ['wilkinson-matrix', 'eigenvalue-test'] },
  { name: 'nla-diagonally-dominant', src: 'A = [4 1; 1 3]; v = double(all(2*abs(diag(A)) > sum(abs(A), 2)));', vars: ['v'], tol: 1e-9, level: 'undergrad', domain: 'numerical-linear-algebra', tags: ['diagonally-dominant', 'convergence-criterion'] },
];
