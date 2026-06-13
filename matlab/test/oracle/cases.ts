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
];
