/**
 * Shared oracle cases: MATLAB snippets whose selected variables are compared
 * against ground truth captured from real MATLAB (see generate.mjs → fixtures.json).
 * Keep `src` valid in BOTH real MATLAB and this interpreter.
 */
export interface OracleCase {
  name: string;
  src: string;
  vars: string[];
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
];
