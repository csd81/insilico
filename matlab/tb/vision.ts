// Computer Vision Toolbox — 5 core functions:
// detectHarrisFeatures, detectFASTFeatures, extractFeatures,
// matchFeatures, estimateFundamentalMatrix (8-point algorithm).
import {
  type Value, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat,
  MatError, mat, zeros, makeObject, fromRows, str, bool, isStr, asString,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_VISION } from '../help/toolbox-help';

// ── Image helpers ──────────────────────────────────────────────────────────────────────
function getImg(v: Value): { data: Float64Array; rows: number; cols: number } {
  const mv = m(v);
  return { data: Float64Array.from(mv.data), rows: mv.rows, cols: mv.cols };
}

function px(data: Float64Array, rows: number, cols: number, r: number, c: number): number {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return 0;
  return data[r * cols + c];
}

// Box-filter sum over [r0..r1] × [c0..c1] using integral image
function makeIntegral(data: Float64Array, rows: number, cols: number): Float64Array {
  const I = new Float64Array((rows + 1) * (cols + 1));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    I[(r+1)*(cols+1)+(c+1)] = data[r*cols+c]
      + I[r*(cols+1)+(c+1)] + I[(r+1)*(cols+1)+c] - I[r*(cols+1)+c];
  }
  return I;
}

function boxSum(I: Float64Array, cols1: number, r0: number, c0: number, r1: number, c1: number): number {
  // Inclusive [r0,r1] × [c0,c1]
  return I[(r1+1)*cols1+(c1+1)] - I[r0*cols1+(c1+1)] - I[(r1+1)*cols1+c0] + I[r0*cols1+c0];
}

// ── Non-maximum suppression ────────────────────────────────────────────────────────────
function nms(response: Float64Array, rows: number, cols: number, radius: number, threshold: number): Array<{r:number;c:number;val:number}> {
  const peaks: Array<{r:number;c:number;val:number}> = [];
  for (let r = radius; r < rows-radius; r++) for (let c = radius; c < cols-radius; c++) {
    const v = response[r*cols+c];
    if (v < threshold) continue;
    let isMax = true;
    outer: for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (response[(r+dr)*cols+(c+dc)] >= v) { isMax = false; break outer; }
    }
    if (isMax) peaks.push({ r, c, val: v });
  }
  peaks.sort((a, b) => b.val - a.val);
  return peaks;
}

// ── makePoints — pack corner/keypoint results into a ClassV ───────────────────────────
function makePoints(peaks: Array<{r:number;c:number;val:number}>, maxN: number): Value {
  const n = Math.min(peaks.length, maxN);
  const loc = new Float64Array(n * 2); // [x(col), y(row)] per row
  const met = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    loc[i*2+0] = peaks[i].c + 1; // 1-based x = col
    loc[i*2+1] = peaks[i].r + 1; // 1-based y = row
    met[i] = peaks[i].val;
  }
  const props = new Map<string, Value>();
  props.set('Location', mat(n, 2, loc));
  props.set('Metric', colVec(Array.from(met)));
  props.set('Count', scalar(n));
  return makeObject('cornerPoints', props);
}

function unpackPoints(v: Value): Array<{x:number;y:number}> {
  if ((v as any).kind === 'object') {
    const props = (v as any).props as Map<string, Value>;
    if (props.has('Location')) {
      const loc = m(props.get('Location')!);
      const n = loc.rows;
      return Array.from({length: n}, (_, i) => ({ x: loc.data[i*2], y: loc.data[i*2+1] }));
    }
  }
  if (isMat(v)) {
    const mv = m(v);
    if (mv.cols === 2) return Array.from({length: mv.rows}, (_, i) => ({ x: mv.data[i*2], y: mv.data[i*2+1] }));
  }
  return [];
}

// ── detectHarrisFeatures ───────────────────────────────────────────────────────────────
// corners = detectHarrisFeatures(I)
// Harris corner detector: R = det(M) - k*trace(M)^2, k=0.05
async function detectHarrisFeatures(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('detectHarrisFeatures: requires image I');
  const { data, rows, cols } = getImg(args[0]);
  const k = args.length > 1 && isMat(args[1]) ? asScalar(m(args[1])) : 0.05;
  const minQ = args.length > 2 && isMat(args[2]) ? asScalar(m(args[2])) : 1e-6;
  const maxN = args.length > 3 && isMat(args[3]) ? Math.round(asScalar(m(args[3]))) : 500;
  const winR = 2; // half-window for structure tensor summation

  // Image gradients (Sobel)
  const Ix = new Float64Array(rows * cols);
  const Iy = new Float64Array(rows * cols);
  for (let r = 1; r < rows-1; r++) for (let c = 1; c < cols-1; c++) {
    Ix[r*cols+c] = (-px(data,rows,cols,r-1,c-1) + px(data,rows,cols,r-1,c+1)
                   -2*px(data,rows,cols,r,c-1) + 2*px(data,rows,cols,r,c+1)
                   -px(data,rows,cols,r+1,c-1) + px(data,rows,cols,r+1,c+1)) / 8;
    Iy[r*cols+c] = (-px(data,rows,cols,r-1,c-1) - 2*px(data,rows,cols,r-1,c)
                   -px(data,rows,cols,r-1,c+1) + px(data,rows,cols,r+1,c-1)
                   +2*px(data,rows,cols,r+1,c) + px(data,rows,cols,r+1,c+1)) / 8;
  }

  // Structure tensor elements
  const Ixx = Ix.map((v, i) => v * v);
  const Iyy = Iy.map((v, i) => v * v);
  const Ixy = Ix.map((v, i) => v * Iy[i]);

  // Box-filter structure tensor over (2*winR+1)^2 window using integral images
  const Ixx_I = makeIntegral(Ixx, rows, cols);
  const Iyy_I = makeIntegral(Iyy, rows, cols);
  const Ixy_I = makeIntegral(Ixy, rows, cols);

  const response = new Float64Array(rows * cols);
  let maxR = 0;
  for (let r = winR; r < rows-winR; r++) for (let c = winR; c < cols-winR; c++) {
    const sxx = boxSum(Ixx_I, cols+1, r-winR, c-winR, r+winR, c+winR);
    const syy = boxSum(Iyy_I, cols+1, r-winR, c-winR, r+winR, c+winR);
    const sxy = boxSum(Ixy_I, cols+1, r-winR, c-winR, r+winR, c+winR);
    const det = sxx*syy - sxy*sxy;
    const tr = sxx + syy;
    const R = det - k * tr * tr;
    response[r*cols+c] = R > 0 ? R : 0;
    if (R > maxR) maxR = R;
  }

  const threshold = Math.max(minQ, maxR * 1e-4);
  const peaks = nms(response, rows, cols, 3, threshold);
  return [makePoints(peaks, maxN)];
}

// ── detectFASTFeatures ─────────────────────────────────────────────────────────────────
// corners = detectFASTFeatures(I)
// FAST-9: a pixel is a corner if 9 consecutive pixels on a circle of radius 3
// are all brighter or all darker by more than threshold.
const FAST_CIRCLE: [number, number][] = [
  [0,-3],[1,-3],[2,-2],[3,-1],[3,0],[3,1],[2,2],[1,3],
  [0,3],[-1,3],[-2,2],[-3,1],[-3,0],[-3,-1],[-2,-2],[-1,-3],
];

async function detectFASTFeatures(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('detectFASTFeatures: requires image I');
  const { data, rows, cols } = getImg(args[0]);
  const threshold = args.length > 1 && isMat(args[1]) ? asScalar(m(args[1])) : 20;
  const maxN = args.length > 2 && isMat(args[2]) ? Math.round(asScalar(m(args[2]))) : 500;

  const response = new Float64Array(rows * cols);
  const N = 9; // consecutive pixels needed

  for (let r = 3; r < rows-3; r++) for (let c = 3; c < cols-3; c++) {
    const p = px(data, rows, cols, r, c);
    const lo = p - threshold, hi = p + threshold;
    // Quick reject: check 4 compass points first
    const pts4 = [[0,-3],[3,0],[0,3],[-3,0]] as [number,number][];
    let nBright4 = 0, nDark4 = 0;
    for (const [dr, dc] of pts4) {
      const v = px(data, rows, cols, r+dr, c+dc);
      if (v > hi) nBright4++; else if (v < lo) nDark4++;
    }
    if (nBright4 < 2 && nDark4 < 2) continue;

    // Full FAST-9 test
    const flags = FAST_CIRCLE.map(([dr, dc]) => {
      const v = px(data, rows, cols, r+dr, c+dc);
      return v > hi ? 1 : v < lo ? -1 : 0;
    });
    let maxRun = 0;
    for (let start = 0; start < 16; start++) {
      let run = 0;
      const sign = flags[start];
      if (sign === 0) continue;
      for (let j = 0; j < 16; j++) {
        if (flags[(start + j) % 16] === sign) run++; else break;
      }
      if (run > maxRun) maxRun = run;
    }
    if (maxRun >= N) {
      // Corner strength: max over all directions of sum of |diff| for consecutive 9
      let strength = 0;
      for (const [dr, dc] of FAST_CIRCLE) strength += Math.abs(px(data,rows,cols,r+dr,c+dc) - p);
      response[r*cols+c] = strength;
    }
  }

  const peaks = nms(response, rows, cols, 3, 1);
  return [makePoints(peaks, maxN)];
}

// ── extractFeatures ────────────────────────────────────────────────────────────────────
// [features, validPts] = extractFeatures(I, points)
// Extracts a normalized 8×8 patch descriptor at each keypoint location.
async function extractFeatures(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('extractFeatures: requires I and points');
  const { data, rows, cols } = getImg(args[0]);
  const pts = unpackPoints(args[1]);
  const patchR = 4; // half-patch size → 8×8 = 64-dim descriptor

  const valid: Array<{x:number;y:number;idx:number}> = [];
  const descs: number[][] = [];

  for (let i = 0; i < pts.length; i++) {
    const cx = Math.round(pts[i].x) - 1; // convert to 0-based
    const cy = Math.round(pts[i].y) - 1;
    if (cx < patchR || cx >= cols-patchR || cy < patchR || cy >= rows-patchR) continue;

    const patch = new Float64Array(patchR*2 * patchR*2);
    let mu = 0;
    for (let dr = -patchR; dr < patchR; dr++) for (let dc = -patchR; dc < patchR; dc++) {
      const v = px(data, rows, cols, cy+dr, cx+dc);
      patch[(dr+patchR)*(patchR*2)+(dc+patchR)] = v;
      mu += v;
    }
    mu /= patch.length;
    let sigma = 0;
    for (let j = 0; j < patch.length; j++) { const d = patch[j]-mu; sigma += d*d; }
    sigma = Math.sqrt(sigma / patch.length + 1e-10);
    const desc = Array.from(patch, v => (v - mu) / sigma);
    descs.push(desc);
    valid.push({ x: pts[i].x, y: pts[i].y, idx: i });
  }

  const n = descs.length, dim = patchR*2*patchR*2;
  const featData = new Float64Array(n * dim);
  for (let i = 0; i < n; i++) for (let j = 0; j < dim; j++) featData[i*dim+j] = descs[i][j] ?? 0;

  // Re-pack valid points
  const validLoc = new Float64Array(valid.length * 2);
  for (let i = 0; i < valid.length; i++) { validLoc[i*2] = valid[i].x; validLoc[i*2+1] = valid[i].y; }
  const validProps = new Map<string, Value>();
  validProps.set('Location', mat(valid.length, 2, validLoc));
  validProps.set('Count', scalar(valid.length));

  return [mat(n, dim, featData), makeObject('cornerPoints', validProps)];
}

// ── matchFeatures ──────────────────────────────────────────────────────────────────────
// indexPairs = matchFeatures(features1, features2)
// Brute-force L2 nearest-neighbor matching with Lowe's ratio test (0.6).
async function matchFeatures(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('matchFeatures: requires features1 and features2');
  const F1 = m(args[0]), F2 = m(args[1]);

  // Defaults match MATLAB R2026a: Metric=ssd, MatchThreshold=1 (percent),
  // Method=exhaustive, MaxRatio=0.6, Prenormalized=false, Unique=false.
  let maxRatio = 0.6;
  let unique = false;
  let metric = 'ssd';            // 'ssd' or 'sad'
  let matchThreshold = 1.0;      // percent of feature space
  let prenormalized = false;
  const truthy = (val: Value): boolean => {
    if (isStr(val)) return asString(val).toLowerCase() === 'true';
    if (isMat(val) && (val as any).isChar) return asString(val).toLowerCase() === 'true';
    return isMat(val) && asScalar(m(val)) !== 0;
  };
  for (let a = 2; a < args.length; a++) {
    const v = args[a];
    const name = (isStr(v) ? asString(v) : (isMat(v) && (v as any).isChar ? asString(v) : '')).toLowerCase();
    if (name === '') {
      // legacy positional ratio: matchFeatures(F1,F2,ratio)
      if (isMat(v)) maxRatio = asScalar(m(v));
      continue;
    }
    const val = args[++a];
    if (val === undefined) throw new MatError(`matchFeatures: missing value for '${name}'`);
    switch (name) {
      case 'maxratio': maxRatio = asScalar(m(val)); break;
      case 'matchthreshold': matchThreshold = asScalar(m(val)); break;
      case 'metric': metric = (isStr(val) || (isMat(val) && (val as any).isChar) ? asString(val) : '').toLowerCase(); break;
      case 'prenormalized': prenormalized = truthy(val); break;
      case 'unique': unique = truthy(val); break;
      case 'method': break; // 'Exhaustive' / 'Approximate' — both exhaustive here
      default: break;       // ignore unknown options gracefully
    }
  }

  // Column-major access: element (r,c) of an n×dim feature matrix is at data[r + c*n].
  const n1 = F1.rows, n2 = F2.rows, dim = F1.cols;

  // MATLAB L2-normalizes each descriptor to a unit vector before matching
  // (unless Prenormalized). Zero vectors are left as-is.
  const norm1 = new Float64Array(n1 * dim);
  const norm2 = new Float64Array(n2 * dim);
  const fill = (src: Float64Array, dst: Float64Array, n: number) => {
    for (let i = 0; i < n; i++) {
      let nrm = 0;
      for (let k = 0; k < dim; k++) { const x = src[i + k * n]; nrm += x * x; }
      nrm = Math.sqrt(nrm);
      const inv = prenormalized || nrm === 0 ? 1 : 1 / nrm;
      for (let k = 0; k < dim; k++) dst[i + k * n] = src[i + k * n] * inv;
    }
  };
  fill(F1.data, norm1, n1);
  fill(F2.data, norm2, n2);

  const dist = (i: number, j: number): number => {
    let d = 0;
    for (let k = 0; k < dim; k++) {
      const diff = norm1[i + k * n1] - norm2[j + k * n2];
      d += metric === 'sad' ? Math.abs(diff) : diff * diff;
    }
    return d;
  };

  // percentToLevel: for ssd max_val=4, for sad max_val=2*sqrt(dim) (on unit vectors).
  const maxVal = metric === 'sad' ? 2 * Math.sqrt(dim) : 4;
  const absThreshold = matchThreshold * 0.01 * maxVal;

  // For each feature1, find nearest (and second-nearest) feature2.
  const performRatioTest = maxRatio !== 1;
  const pairs: { i: number; j: number; d: number }[] = [];
  for (let i = 0; i < n1; i++) {
    let best1 = Infinity, best2 = Infinity, bestJ = -1;
    for (let j = 0; j < n2; j++) {
      const d = dist(i, j);
      if (d < best1) { best2 = best1; best1 = d; bestJ = j; }
      else if (d < best2) best2 = d;
    }
    if (bestJ < 0) continue;
    // removeWeakMatches: drop matches whose best distance exceeds the threshold.
    if (best1 > absThreshold) continue;
    // Ratio test (only when MaxRatio != 1 and there are ≥2 candidates).
    if (performRatioTest && n2 > 1) {
      let d1 = best1, d2 = best2;
      if (d2 < 1e-6) { d1 = 1; d2 = 1; } // division-by-zero guard (matches MATLAB)
      if (d1 / d2 > maxRatio) continue;
    }
    pairs.push({ i, j: bestJ, d: best1 });
  }

  // Unique: bidirectional check — keep a pair only if, among all feature1's, the
  // matched feature2 column's minimum-distance row is exactly this feature1.
  let kept = pairs;
  if (unique) {
    kept = pairs.filter((p) => {
      let minRow = -1, minD = Infinity;
      for (let r = 0; r < n1; r++) {
        const d = dist(r, p.j);
        if (d < minD) { minD = d; minRow = r; }
      }
      return minRow === p.i;
    });
  }

  // Output is column-major: column 1 = indices into F1, column 2 = indices into F2.
  const M = kept.length;
  const pairData = new Float64Array(M * 2);
  for (let r = 0; r < M; r++) { pairData[r] = kept[r].i + 1; pairData[r + M] = kept[r].j + 1; }
  return [mat(M, 2, pairData)];
}

// ── estimateFundamentalMatrix ─────────────────────────────────────────────────────────
// F = estimateFundamentalMatrix(pts1, pts2)
// Normalized 8-point algorithm (Hartley 1997).
// pts1, pts2 are [N×2] matrices of corresponding (x,y) image coordinates.
async function estimateFundamentalMatrix(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('estimateFundamentalMatrix: requires pts1 and pts2');
  const P1 = m(args[0]), P2 = m(args[1]);
  const n = P1.rows;
  if (n < 8) throw new MatError('estimateFundamentalMatrix: need at least 8 point correspondences');

  // ── Normalize points ───────────────────────────────────────────────────────────
  // P is an n×2 column-major matrix: x = data[i], y = data[i+n].
  function normPts(P: typeof P1): { pts: number[][]; T: number[][] } {
    const X = (i: number) => P.data[i];
    const Y = (i: number) => P.data[i + n];
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += X(i); my += Y(i); }
    mx /= n; my /= n;
    let meanDist = 0;
    for (let i = 0; i < n; i++) meanDist += Math.sqrt((X(i)-mx)**2 + (Y(i)-my)**2);
    meanDist /= n;
    const s = Math.SQRT2 / (meanDist || 1);
    const pts = Array.from({length: n}, (_, i) => [(X(i)-mx)*s, (Y(i)-my)*s]);
    const T = [[s,0,-s*mx],[0,s,-s*my],[0,0,1]];
    return { pts, T };
  }

  const { pts: p1, T: T1 } = normPts(P1);
  const { pts: p2, T: T2 } = normPts(P2);

  // ── Build 9-column matrix A ────────────────────────────────────────────────────
  // Each row: [x2*x1, x2*y1, x2, y2*x1, y2*y1, y2, x1, y1, 1]
  const A: number[][] = p1.map((q1, i) => {
    const [x1, y1] = q1, [x2, y2] = p2[i];
    return [x2*x1, x2*y1, x2, y2*x1, y2*y1, y2, x1, y1, 1];
  });

  // ── SVD of A via power-iteration-based approach ────────────────────────────────
  // For the 9-vector null space we use the smallest singular vector of A.
  // Build A'A (9×9), find its smallest eigenvector via inverse power iteration.
  const AtA = Array.from({length:9}, (_,i) => Array.from({length:9}, (_,j) => {
    let s = 0;
    for (let r=0; r<A.length; r++) s += A[r][i]*A[r][j];
    return s;
  }));

  // Smallest right-singular vector of A = eigenvector of A'A for the smallest
  // eigenvalue. Compute the full symmetric eigendecomposition of the 9×9 A'A with
  // the classical cyclic Jacobi method, then pick the eigenvector whose eigenvalue
  // is minimal. (A shifted power iteration converges to the WRONG eigenvector here.)
  function jacobiEig(Min: number[][]): { vals: number[]; vecs: number[][] } {
    const dim = Min.length;
    const Aj = Min.map((r) => [...r]);
    // Q holds eigenvectors as columns.
    const Q: number[][] = Array.from({ length: dim }, (_, i) =>
      Array.from({ length: dim }, (_, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 100; sweep++) {
      // off-diagonal Frobenius norm
      let off = 0;
      for (let i = 0; i < dim; i++) for (let j = i + 1; j < dim; j++) off += Aj[i][j] * Aj[i][j];
      if (off < 1e-30) break;
      for (let p = 0; p < dim; p++) {
        for (let q = p + 1; q < dim; q++) {
          const apq = Aj[p][q];
          if (Math.abs(apq) < 1e-300) continue;
          const theta = (Aj[q][q] - Aj[p][p]) / (2 * apq);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1);
          const s = t * c;
          // Apply rotation J' A J (rows/cols p,q)
          for (let k = 0; k < dim; k++) {
            const akp = Aj[k][p], akq = Aj[k][q];
            Aj[k][p] = c * akp - s * akq;
            Aj[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < dim; k++) {
            const apk = Aj[p][k], aqk = Aj[q][k];
            Aj[p][k] = c * apk - s * aqk;
            Aj[q][k] = s * apk + c * aqk;
          }
          // Accumulate eigenvectors: Q ← Q J
          for (let k = 0; k < dim; k++) {
            const qkp = Q[k][p], qkq = Q[k][q];
            Q[k][p] = c * qkp - s * qkq;
            Q[k][q] = s * qkp + c * qkq;
          }
        }
      }
    }
    const vals = Aj.map((_, i) => Aj[i][i]);
    const vecs = Q;
    return { vals, vecs };
  }

  const { vals, vecs } = jacobiEig(AtA);
  // Index of smallest eigenvalue.
  let minIdx = 0;
  for (let i = 1; i < vals.length; i++) if (vals[i] < vals[minIdx]) minIdx = i;
  // Eigenvector is column minIdx of vecs.
  const fVec = vecs.map((row) => row[minIdx]);
  // Reshape to 3×3 F matrix
  let F: number[][] = Array.from({length:3}, (_,i) => Array.from({length:3}, (_,j) => fVec[i*3+j]));

  // ── Enforce rank-2 constraint: F ← U * diag(s1,s2,0) * V' ────────────────────
  // SVD of 3×3 F using power iteration for each singular value
  function svd3x3(M: number[][]): { U: number[][]; S: number[]; V: number[][] } {
    // Right singular vectors = eigenvectors of M'M. Reuse the robust cyclic-Jacobi
    // eigensolver above (the prior single-rotation 3×3 sweep failed to converge,
    // producing wildly wrong singular values and breaking the rank-2 step).
    const MtM = Array.from({length:3}, (_,i) => Array.from({length:3}, (_,j) => {
      let s = 0; for (let k=0; k<3; k++) s += M[k][i]*M[k][j]; return s;
    }));
    const { vals, vecs } = jacobiEig(MtM);          // vecs: eigenvectors as columns
    const S = vals.map(v => Math.sqrt(Math.max(0, v)));
    // Sort descending by singular value.
    const idx = [0,1,2].sort((a,b)=>S[b]-S[a]);
    const Vs = idx.map(i => vecs.map(r => r[i]));    // Vs[c] = c-th right singular vector
    const Ss = idx.map(i => S[i]);
    // U = M V / sigma
    const V: number[][] = [[Vs[0][0],Vs[1][0],Vs[2][0]],[Vs[0][1],Vs[1][1],Vs[2][1]],[Vs[0][2],Vs[1][2],Vs[2][2]]];
    const U: number[][] = Array.from({length:3}, (_,i) => Array.from({length:3}, (_,j) => {
      let s=0; for(let k=0;k<3;k++) s+=M[i][k]*V[k][j]; return Ss[j]>1e-14?s/Ss[j]:0;
    }));
    return { U, S: Ss, V };
  }

  const { U, S, V } = svd3x3(F);
  // Zero out smallest singular value
  const Fnew: number[][] = Array.from({length:3}, (_,i) => Array.from({length:3}, (_,j) => {
    let s=0;
    for (let k=0;k<2;k++) s += U[i][k]*S[k]*(V[j][k]);
    return s;
  }));

  // ── Denormalize: F ← T2' * Fnew * T1 ──────────────────────────────────────────
  function mat3mul(A: number[][], B: number[][]): number[][] {
    return Array.from({length:3}, (_,i) => Array.from({length:3}, (_,j) => {
      let s=0; for (let k=0;k<3;k++) s+=A[i][k]*B[k][j]; return s;
    }));
  }
  const T2t: number[][] = [[T2[0][0],T2[1][0],T2[2][0]],[T2[0][1],T2[1][1],T2[2][1]],[T2[0][2],T2[1][2],T2[2][2]]];
  const Ffinal = mat3mul(mat3mul(T2t, Fnew), T1);

  // Return as 3×3 matrix. Mat storage is column-major: element (i,j) → data[i + j*3].
  const Fdata = new Float64Array(9);
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) Fdata[i + j*3] = Ffinal[i][j];
  return [mat(3, 3, Fdata)];
}

export const VISION: ToolboxModule = {
  id: 'vision',
  name: 'Computer Vision Toolbox',
  docBase: 'https://www.mathworks.com/help/vision/',
  builtins: {
    detectHarrisFeatures,
    detectFASTFeatures,
    extractFeatures,
    matchFeatures,
    estimateFundamentalMatrix,
  },
  help: HELP_VISION,
};
