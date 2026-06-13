// Lidar Toolbox — 5 core functions:
// pointCloud (constructor), pcdownsample (voxel grid),
// pcregistericp (ICP registration), pcsegdist (Euclidean clustering),
// pcfitplane (RANSAC plane fitting).
import {
  type Value, type Mat, scalar, rowVec, colVec, toArray, asScalar, toMat as m, isMat,
  MatError, mat, zeros, makeObject, str, bool, asString,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_LIDAR } from '../help/help-lidar';

function isCharLike(v: Value): boolean {
  return (isMat(v) && !!(v as Mat).isChar) || (v as any).kind === 'str';
}

// ── Point cloud pack / unpack ──────────────────────────────────────────────────────────
interface PC { xyz: Float64Array; n: number } // xyz is [n×3] row-major

// Mat data is COLUMN-MAJOR (element (r,c) at data[r + c*rows]); the internal xyz
// buffer is ROW-MAJOR ([x0 y0 z0 x1 y1 z1 ...]). Convert on both pack and unpack.
function matToRowMajorXYZ(mv: { rows: number; cols: number; data: Float64Array }): Float64Array {
  const n = mv.rows;
  const xyz = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    xyz[i*3+0] = mv.data[i + 0*mv.rows];
    xyz[i*3+1] = mv.data[i + 1*mv.rows];
    xyz[i*3+2] = mv.data[i + 2*mv.rows];
  }
  return xyz;
}

function rowMajorXYZtoMat(xyz: Float64Array, n: number): Value {
  // Produce a column-major [n×3] Mat.
  const data = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    data[i + 0*n] = xyz[i*3+0];
    data[i + 1*n] = xyz[i*3+1];
    data[i + 2*n] = xyz[i*3+2];
  }
  return mat(n, 3, data);
}

function unpackPC(v: Value): PC {
  if ((v as any).kind === 'object') {
    const props = (v as any).props as Map<string, Value>;
    const loc = m(props.get('Location')!);
    return { xyz: matToRowMajorXYZ(loc), n: loc.rows };
  }
  const mv = m(v);
  if (mv.cols < 3) throw new MatError('pointCloud: Location must have at least 3 columns');
  return { xyz: matToRowMajorXYZ(mv), n: mv.rows };
}

function packPC(xyz: Float64Array, n: number): Value {
  const props = new Map<string, Value>();
  props.set('Location', rowMajorXYZtoMat(xyz, n));
  props.set('Count', scalar(n));
  // Bounding limits
  let xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity,zMin=Infinity,zMax=-Infinity;
  for (let i=0;i<n;i++){
    const x=xyz[i*3],y=xyz[i*3+1],z=xyz[i*3+2];
    if(x<xMin)xMin=x;if(x>xMax)xMax=x;
    if(y<yMin)yMin=y;if(y>yMax)yMax=y;
    if(z<zMin)zMin=z;if(z>zMax)zMax=z;
  }
  props.set('XLimits', rowVec([xMin,xMax]));
  props.set('YLimits', rowVec([yMin,yMax]));
  props.set('ZLimits', rowVec([zMin,zMax]));
  return makeObject('pointCloud', props);
}

// ── pointCloud constructor ─────────────────────────────────────────────────────────────
// ptCloud = pointCloud(xyzPoints)  — [N×3] or [N×4] matrix
async function pointCloud(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('pointCloud: requires xyzPoints [N×3]');
  const mv = m(args[0]);
  if (mv.cols < 3) throw new MatError('pointCloud: xyzPoints must have at least 3 columns (X Y Z)');
  const n = mv.rows;
  const xyz = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    xyz[i*3+0] = mv.data[i + 0*mv.rows];
    xyz[i*3+1] = mv.data[i + 1*mv.rows];
    xyz[i*3+2] = mv.data[i + 2*mv.rows];
  }
  return [packPC(xyz, n)];
}

// ── pcdownsample — voxel grid downsampling ─────────────────────────────────────────────
// ptCloudOut = pcdownsample(ptCloudIn, gridStep)
// One representative point per voxel (centroid of all points in that voxel).
async function pcdownsample(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('pcdownsample: requires ptCloud and gridStep');
  const { xyz, n } = unpackPC(args[0]);
  // Accept both pcdownsample(pc,gridStep) and pcdownsample(pc,'gridAverage',gridStep).
  let stepArg: Value;
  if (isCharLike(args[1])) {
    const method = asString(args[1]).toLowerCase();
    if (method !== 'gridaverage') throw new MatError(`pcdownsample: unsupported method '${method}'`);
    if (args.length < 3) throw new MatError("pcdownsample: 'gridAverage' requires a gridStep");
    stepArg = args[2];
  } else {
    stepArg = args[1];
  }
  const step = asScalar(m(stepArg));
  if (step <= 0) throw new MatError('pcdownsample: gridStep must be positive');

  // Bin each point into a voxel key
  const voxels = new Map<string, { sx: number; sy: number; sz: number; cnt: number }>();
  for (let i = 0; i < n; i++) {
    const vx = Math.floor(xyz[i*3+0] / step);
    const vy = Math.floor(xyz[i*3+1] / step);
    const vz = Math.floor(xyz[i*3+2] / step);
    const key = `${vx},${vy},${vz}`;
    const existing = voxels.get(key);
    if (existing) {
      existing.sx += xyz[i*3+0]; existing.sy += xyz[i*3+1]; existing.sz += xyz[i*3+2];
      existing.cnt++;
    } else {
      voxels.set(key, { sx: xyz[i*3+0], sy: xyz[i*3+1], sz: xyz[i*3+2], cnt: 1 });
    }
  }

  const outN = voxels.size;
  const outXyz = new Float64Array(outN * 3);
  let idx = 0;
  for (const { sx, sy, sz, cnt } of voxels.values()) {
    outXyz[idx*3+0] = sx/cnt; outXyz[idx*3+1] = sy/cnt; outXyz[idx*3+2] = sz/cnt; idx++;
  }
  return [packPC(outXyz, outN)];
}

// ── Nearest-neighbour helper (brute-force; grid-accelerated for large clouds) ──────────
// Returns for each point in A the index of its nearest neighbour in B (0-based).
function nearestNeighbors(A: Float64Array, nA: number, B: Float64Array, nB: number): { idx: Int32Array; dist2: Float64Array } {
  const idx = new Int32Array(nA);
  const dist2 = new Float64Array(nA);

  // Build a voxel grid over B for fast lookup when nB is large
  if (nB > 500) {
    // Estimate voxel size from bounding box
    let xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity,zMin=Infinity,zMax=-Infinity;
    for (let i=0;i<nB;i++){
      const x=B[i*3],y=B[i*3+1],z=B[i*3+2];
      if(x<xMin)xMin=x;if(x>xMax)xMax=x;if(y<yMin)yMin=y;if(y>yMax)yMax=y;if(z<zMin)zMin=z;if(z>zMax)zMax=z;
    }
    const range = Math.max(xMax-xMin, yMax-yMin, zMax-zMin, 1e-9);
    const voxStep = range / Math.cbrt(nB);
    const grid = new Map<string, number[]>();
    for (let i=0;i<nB;i++){
      const vx=Math.floor(B[i*3]/voxStep), vy=Math.floor(B[i*3+1]/voxStep), vz=Math.floor(B[i*3+2]/voxStep);
      const key=`${vx},${vy},${vz}`;
      const cell = grid.get(key); if(cell) cell.push(i); else grid.set(key, [i]);
    }
    for (let a=0;a<nA;a++){
      const ax=A[a*3],ay=A[a*3+1],az=A[a*3+2];
      const cvx=Math.floor(ax/voxStep), cvy=Math.floor(ay/voxStep), cvz=Math.floor(az/voxStep);
      let bestD=Infinity, bestI=0;
      // Search 3×3×3 neighbourhood
      for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) for (let dz=-1;dz<=1;dz++){
        const cell = grid.get(`${cvx+dx},${cvy+dy},${cvz+dz}`);
        if (!cell) continue;
        for (const bi of cell){
          const d=(ax-B[bi*3])**2+(ay-B[bi*3+1])**2+(az-B[bi*3+2])**2;
          if(d<bestD){bestD=d;bestI=bi;}
        }
      }
      // Fallback: brute-force if grid miss
      if (bestD === Infinity) for (let b=0;b<nB;b++){
        const d=(ax-B[b*3])**2+(ay-B[b*3+1])**2+(az-B[b*3+2])**2;
        if(d<bestD){bestD=d;bestI=b;}
      }
      idx[a]=bestI; dist2[a]=bestD;
    }
  } else {
    // Brute-force for small clouds
    for (let a=0;a<nA;a++){
      const ax=A[a*3],ay=A[a*3+1],az=A[a*3+2];
      let bestD=Infinity,bestI=0;
      for (let b=0;b<nB;b++){
        const d=(ax-B[b*3])**2+(ay-B[b*3+1])**2+(az-B[b*3+2])**2;
        if(d<bestD){bestD=d;bestI=b;}
      }
      idx[a]=bestI; dist2[a]=bestD;
    }
  }
  return { idx, dist2 };
}

// ── 3×3 symmetric eigendecomposition via cyclic Jacobi ────────────────────────────────
// Returns eigenvalues (ascending) and matching eigenvector columns V[:,k].
function jacobiEig3(Ain: number[][]): { vals: number[]; vecs: number[][] } {
  const A = Ain.map(r => [...r]);
  const V = [[1,0,0],[0,1,0],[0,0,1]];
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < 3; i++) for (let j = i+1; j < 3; j++) off += A[i][j]*A[i][j];
    if (off < 1e-30) break;
    for (let p = 0; p < 3; p++) for (let q = p+1; q < 3; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const theta = (A[q][q]-A[p][p])/(2*A[p][q]);
      const t = Math.sign(theta || 1)/(Math.abs(theta)+Math.sqrt(theta*theta+1));
      const c = 1/Math.sqrt(t*t+1), s = t*c;
      // Apply Givens rotation A = G' A G
      for (let k = 0; k < 3; k++) {
        const akp = A[k][p], akq = A[k][q];
        A[k][p] = c*akp - s*akq;
        A[k][q] = s*akp + c*akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = A[p][k], aqk = A[q][k];
        A[p][k] = c*apk - s*aqk;
        A[q][k] = s*apk + c*aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c*vkp - s*vkq;
        V[k][q] = s*vkp + c*vkq;
      }
    }
  }
  const idx = [0,1,2].sort((a,b) => A[a][a]-A[b][b]);
  const vals = idx.map(k => A[k][k]);
  const vecs = [0,1,2].map(r => idx.map(k => V[r][k]));
  return { vals, vecs };
}

// ── Optimal rigid transform from point correspondences (Kabuti/SVD via eig) ────────────
// Given matched pairs (src[i] → dst[idx[i]]), solve for R, t minimising sum ||R*src_i + t - dst_i||^2.
// H = Σ (src-μs)(dst-μd)' ; SVD H = UΣV' ; R = V*diag([1 1 det(V*U')])*U' ; t = μd - R*μs.
function optimalRigid(src: Float64Array, dst: Float64Array, matchIdx: Int32Array, n: number): { R: number[][]; t: number[] } {
  // Centroids
  let sx=0,sy=0,sz=0,dx=0,dy=0,dz=0;
  for (let i=0;i<n;i++){
    sx+=src[i*3];sy+=src[i*3+1];sz+=src[i*3+2];
    const j=matchIdx[i]; dx+=dst[j*3];dy+=dst[j*3+1];dz+=dst[j*3+2];
  }
  sx/=n;sy/=n;sz/=n; dx/=n;dy/=n;dz/=n;

  // Cross-covariance H = Σ (src_i - μs)(dst_i - μd)'   (3×3)
  const H = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i=0;i<n;i++){
    const j=matchIdx[i];
    const ps=[src[i*3]-sx,src[i*3+1]-sy,src[i*3+2]-sz];
    const pd=[dst[j*3]-dx,dst[j*3+1]-dy,dst[j*3+2]-dz];
    for (let r=0;r<3;r++) for (let c=0;c<3;c++) H[r][c]+=ps[r]*pd[c];
  }

  // SVD of H via symmetric eigendecompositions.
  // V = eigenvectors of H'H, U = eigenvectors of HH', singular values = sqrt(eigvals).
  // Pair the columns so that H = U Σ V' with consistent signs: U[:,k] = H V[:,k]/σ_k.
  const HtH = Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>{let s=0;for(let k=0;k<3;k++)s+=H[k][i]*H[k][j];return s;}));
  // Eigenvectors ascending; reorder to descending singular value.
  const { vals, vecs } = jacobiEig3(HtH);
  // descending order
  const order = [2,1,0];
  const V = Array.from({length:3},(_,r)=>order.map(k=>vecs[r][k]));
  const sigmas = order.map(k => Math.sqrt(Math.max(0, vals[k])));

  // Degenerate: H≈0 (e.g. all correspondences point at one fixed point, or no spread).
  // The optimal rotation is undefined → identity; translation is the centroid offset.
  if (sigmas[0] < 1e-12) {
    const R = [[1,0,0],[0,1,0],[0,0,1]];
    return { R, t: [dx-sx, dy-sy, dz-sz] };
  }

  // U[:,k] = H V[:,k] / σ_k (fall back to orthogonal completion for tiny σ)
  const U = [[0,0,0],[0,0,0],[0,0,0]];
  for (let k=0;k<3;k++){
    const hv=[0,0,0];
    for (let r=0;r<3;r++){let s=0;for(let c=0;c<3;c++)s+=H[r][c]*V[c][k];hv[r]=s;}
    if (sigmas[k] > 1e-12){
      for (let r=0;r<3;r++) U[r][k]=hv[r]/sigmas[k];
    } else {
      // u2 = u0 × u1 to keep U orthonormal/right-handed
      if (k===2){
        U[0][2]=U[1][0]*U[2][1]-U[2][0]*U[1][1];
        U[1][2]=U[2][0]*U[0][1]-U[0][0]*U[2][1];
        U[2][2]=U[0][0]*U[1][1]-U[1][0]*U[0][1];
      } else {
        U[k][k]=1; // degenerate; rare
      }
    }
  }

  // d = det(V U')
  const VUt = Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>{let s=0;for(let k=0;k<3;k++)s+=V[i][k]*U[j][k];return s;}));
  const d = VUt[0][0]*(VUt[1][1]*VUt[2][2]-VUt[1][2]*VUt[2][1])
          - VUt[0][1]*(VUt[1][0]*VUt[2][2]-VUt[1][2]*VUt[2][0])
          + VUt[0][2]*(VUt[1][0]*VUt[2][1]-VUt[1][1]*VUt[2][0]);
  const D = [1, 1, d < 0 ? -1 : 1];

  // R = V diag(D) U'
  const R = Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>{
    let s=0;for(let k=0;k<3;k++)s+=V[i][k]*D[k]*U[j][k];return s;
  }));
  const t=[dx-R[0][0]*sx-R[0][1]*sy-R[0][2]*sz,
           dy-R[1][0]*sx-R[1][1]*sy-R[1][2]*sz,
           dz-R[2][0]*sx-R[2][1]*sy-R[2][2]*sz];
  return { R, t };
}

// Apply rigid transform to point cloud
function applyRigid(xyz: Float64Array, n: number, R: number[][], t: number[]): Float64Array<ArrayBuffer> {
  const out = new Float64Array(n * 3);
  for (let i=0;i<n;i++){
    const x=xyz[i*3],y=xyz[i*3+1],z=xyz[i*3+2];
    out[i*3+0]=R[0][0]*x+R[0][1]*y+R[0][2]*z+t[0];
    out[i*3+1]=R[1][0]*x+R[1][1]*y+R[1][2]*z+t[1];
    out[i*3+2]=R[2][0]*x+R[2][1]*y+R[2][2]*z+t[2];
  }
  return out;
}

// ── pcregistericp ─────────────────────────────────────────────────────────────────────
// [tform, ptCloudAligned, rmse] = pcregistericp(moving, fixed)
async function pcregistericp(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('pcregistericp: requires moving and fixed point clouds');
  const mov = unpackPC(args[0]);
  const fix = unpackPC(args[1]);

  // Options
  let maxIter = 20, tolerance = 1e-6, maxDist = Infinity;
  for (let i = 2; i+1 < args.length; i += 2) {
    const key = (isCharLike(args[i]) ? asString(args[i]) : '').toLowerCase();
    if (key === 'maxiterations') maxIter = Math.round(asScalar(m(args[i+1])));
    if (key === 'tolerance') tolerance = asScalar(m(args[i+1]));
    if (key === 'maxdistance') maxDist = asScalar(m(args[i+1]));
  }

  let curXyz = Float64Array.from(mov.xyz);
  // Accumulate transform
  let Racc = [[1,0,0],[0,1,0],[0,0,1]];
  let tacc = [0,0,0];
  let prevRmse = Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    const { idx, dist2 } = nearestNeighbors(curXyz, mov.n, fix.xyz, fix.n);

    // Filter by maxDist and build valid correspondence list
    const validI: number[] = [];
    for (let i=0;i<mov.n;i++) if (dist2[i] <= maxDist*maxDist) validI.push(i);
    if (validI.length < 3) break;

    // Compute RMSE over valid correspondences
    const rmse = Math.sqrt(validI.reduce((s,i)=>s+dist2[i],0)/validI.length);

    // Build compact correspondence arrays for valid pairs
    const srcValid = new Float64Array(validI.length*3);
    const dstFull = fix.xyz;
    const idxValid = new Int32Array(validI.length);
    for (let vi=0;vi<validI.length;vi++){
      const i=validI[vi];
      srcValid[vi*3]=curXyz[i*3]; srcValid[vi*3+1]=curXyz[i*3+1]; srcValid[vi*3+2]=curXyz[i*3+2];
      idxValid[vi]=idx[i];
    }

    const { R, t } = optimalRigid(srcValid, dstFull, idxValid, validI.length);
    curXyz = applyRigid(curXyz, mov.n, R, t);

    // Accumulate: R_acc = R * R_acc, t_acc = R*t_acc + t
    const Rnew=Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>{
      let s=0;for(let k=0;k<3;k++)s+=R[i][k]*Racc[k][j];return s;
    }));
    const tnew=Array.from({length:3},(_,i)=>R[i][0]*tacc[0]+R[i][1]*tacc[1]+R[i][2]*tacc[2]+t[i]);
    Racc=Rnew; tacc=tnew;

    if (Math.abs(prevRmse - rmse) < tolerance) break;
    prevRmse = rmse;
  }

  const { idx: finalIdx, dist2: finalDist2 } = nearestNeighbors(curXyz, mov.n, fix.xyz, fix.n);
  const rmse = Math.sqrt(finalDist2.reduce((s,d)=>s+d,0)/mov.n);

  // Pack tform as rigid transform object
  const tformProps = new Map<string, Value>();
  const Rdata = new Float64Array(9);
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) Rdata[i*3+j]=Racc[i][j];
  tformProps.set('Rotation', mat(3, 3, Rdata));
  tformProps.set('Translation', rowVec(tacc));

  return [makeObject('rigidtform3d', tformProps), packPC(curXyz, mov.n), scalar(rmse)];
}

// ── pcsegdist — Euclidean distance clustering ─────────────────────────────────────────
// [labels, numClusters] = pcsegdist(ptCloud, minDist)
// Points within minDist of each other belong to the same cluster.
// Uses BFS with voxel-grid spatial acceleration.
async function pcsegdist(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('pcsegdist: requires ptCloud and minDist');
  const { xyz, n } = unpackPC(args[0]);
  const minDist = asScalar(m(args[1]));
  const minDist2 = minDist * minDist;

  // Build spatial grid for fast range queries
  const grid = new Map<string, number[]>();
  for (let i=0;i<n;i++){
    const vx=Math.floor(xyz[i*3]/minDist), vy=Math.floor(xyz[i*3+1]/minDist), vz=Math.floor(xyz[i*3+2]/minDist);
    const key=`${vx},${vy},${vz}`;
    const cell=grid.get(key); if(cell) cell.push(i); else grid.set(key,[i]);
  }

  const labels = new Int32Array(n); // 0 = unvisited
  let numClusters = 0;

  for (let seed=0;seed<n;seed++){
    if (labels[seed] !== 0) continue;
    numClusters++;
    labels[seed] = numClusters;
    const queue: number[] = [seed];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const cx=xyz[cur*3], cy=xyz[cur*3+1], cz=xyz[cur*3+2];
      const cvx=Math.floor(cx/minDist), cvy=Math.floor(cy/minDist), cvz=Math.floor(cz/minDist);
      // Check 3×3×3 neighbouring voxels
      for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) for (let dz=-1;dz<=1;dz++){
        const cell=grid.get(`${cvx+dx},${cvy+dy},${cvz+dz}`);
        if (!cell) continue;
        for (const nb of cell){
          if (labels[nb]!==0) continue;
          const d=(cx-xyz[nb*3])**2+(cy-xyz[nb*3+1])**2+(cz-xyz[nb*3+2])**2;
          if (d<=minDist2){ labels[nb]=numClusters; queue.push(nb); }
        }
      }
    }
  }

  return [colVec(Array.from(labels)), scalar(numClusters)];
}

// ── pcfitplane — RANSAC plane fitting ─────────────────────────────────────────────────
// [model, inlierIndices, outlierIndices] = pcfitplane(ptCloud, maxDistance)
// model: planeModel object with Parameters [a b c d] (ax+by+cz+d=0, unit normal)
async function pcfitplane(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('pcfitplane: requires ptCloud and maxDistance');
  const { xyz, n } = unpackPC(args[0]);
  const maxDist = asScalar(m(args[1]));
  const maxIter = args.length > 2 ? Math.round(asScalar(m(args[2]))) : 1000;

  if (n < 3) throw new MatError('pcfitplane: need at least 3 points');

  let bestInliers: number[] = [];
  let bestPlane = [0, 0, 1, 0]; // default: z=0 plane

  for (let iter = 0; iter < maxIter; iter++) {
    // Sample 3 random points
    const i0 = Math.floor(Math.random() * n);
    let i1 = Math.floor(Math.random() * n); while(i1===i0) i1=Math.floor(Math.random()*n);
    let i2 = Math.floor(Math.random() * n); while(i2===i0||i2===i1) i2=Math.floor(Math.random()*n);

    const p0=[xyz[i0*3],xyz[i0*3+1],xyz[i0*3+2]];
    const p1=[xyz[i1*3],xyz[i1*3+1],xyz[i1*3+2]];
    const p2=[xyz[i2*3],xyz[i2*3+1],xyz[i2*3+2]];

    // Normal = (p1-p0) × (p2-p0)
    const v1=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]];
    const v2=[p2[0]-p0[0],p2[1]-p0[1],p2[2]-p0[2]];
    const nx=v1[1]*v2[2]-v1[2]*v2[1], ny=v1[2]*v2[0]-v1[0]*v2[2], nz=v1[0]*v2[1]-v1[1]*v2[0];
    const nlen=Math.sqrt(nx*nx+ny*ny+nz*nz);
    if (nlen < 1e-10) continue; // degenerate triangle

    const a=nx/nlen, b=ny/nlen, c=nz/nlen;
    const d=-(a*p0[0]+b*p0[1]+c*p0[2]);

    // Count inliers
    const inliers: number[] = [];
    for (let i=0;i<n;i++){
      if (Math.abs(a*xyz[i*3]+b*xyz[i*3+1]+c*xyz[i*3+2]+d) <= maxDist) inliers.push(i);
    }

    if (inliers.length > bestInliers.length) {
      bestInliers = inliers;
      bestPlane = [a, b, c, d];
      // Early termination if 95% inliers
      if (inliers.length >= 0.95 * n) break;
    }
  }

  // Refine plane from all inliers (least-squares fit)
  if (bestInliers.length >= 3) {
    // SVD-based plane fit: min ||Ax||^2 s.t. ||x||=1 where A = [pts 1]
    // Equivalent to finding normal of covariance matrix
    let mx=0,my=0,mz=0;
    for (const i of bestInliers){mx+=xyz[i*3];my+=xyz[i*3+1];mz+=xyz[i*3+2];}
    mx/=bestInliers.length;my/=bestInliers.length;mz/=bestInliers.length;
    // 3×3 covariance
    const C=[[0,0,0],[0,0,0],[0,0,0]];
    for (const i of bestInliers){
      const dx=xyz[i*3]-mx,dy=xyz[i*3+1]-my,dz=xyz[i*3+2]-mz;
      C[0][0]+=dx*dx;C[0][1]+=dx*dy;C[0][2]+=dx*dz;
      C[1][0]+=dy*dx;C[1][1]+=dy*dy;C[1][2]+=dy*dz;
      C[2][0]+=dz*dx;C[2][1]+=dz*dy;C[2][2]+=dz*dz;
    }
    // Smallest eigenvector of C = plane normal (Jacobi)
    let Q=[[1,0,0],[0,1,0],[0,0,1]];
    let Cm=C.map(r=>[...r]);
    for (let sweep=0;sweep<30;sweep++){
      let maxOff=0,p=0,q=1;
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)if(Math.abs(Cm[i][j])>maxOff){maxOff=Math.abs(Cm[i][j]);p=i;q=j;}
      if(maxOff<1e-12)break;
      const th=(Cm[q][q]-Cm[p][p])/(2*Cm[p][q]+1e-30);
      const t2=Math.sign(th)/(Math.abs(th)+Math.sqrt(1+th**2));
      const c2=1/Math.sqrt(1+t2**2),s2=t2*c2;
      const G=[[1,0,0],[0,1,0],[0,0,1]];G[p][p]=c2;G[p][q]=-s2;G[q][p]=s2;G[q][q]=c2;
      const nCm=Cm.map(r=>[...r]);
      for(let i=0;i<3;i++)for(let j=0;j<3;j++){let s=0;for(let k=0;k<3;k++)s+=G[k][i]*Cm[k][j];nCm[i][j]=s;}
      for(let i=0;i<3;i++)for(let j=0;j<3;j++){let s=0;for(let k=0;k<3;k++)s+=nCm[i][k]*G[k][j];Cm[i][j]=s;}
      const nQ=Q.map(r=>[...r]);
      for(let i=0;i<3;i++)for(let j=0;j<3;j++){let s=0;for(let k=0;k<3;k++)s+=Q[i][k]*G[k][j];nQ[i][j]=s;}
      Q=nQ;
    }
    // Eigenvector for smallest eigenvalue
    const eigs=[Cm[0][0],Cm[1][1],Cm[2][2]];
    const minI=eigs.indexOf(Math.min(...eigs));
    const [a,b,c]=[Q[0][minI],Q[1][minI],Q[2][minI]];
    const d=-(a*mx+b*my+c*mz);
    // Recount inliers with refined plane
    bestInliers=[];
    for(let i=0;i<n;i++) if(Math.abs(a*xyz[i*3]+b*xyz[i*3+1]+c*xyz[i*3+2]+d)<=maxDist) bestInliers.push(i);
    bestPlane=[a,b,c,d];
  }

  const inlierSet = new Set(bestInliers);
  const outliers = Array.from({length:n},(_,i)=>i).filter(i=>!inlierSet.has(i));

  const modelProps = new Map<string, Value>();
  modelProps.set('Parameters', rowVec(bestPlane));
  modelProps.set('Normal', rowVec(bestPlane.slice(0,3)));

  return [
    makeObject('planeModel', modelProps),
    rowVec(bestInliers.map(i=>i+1)),   // 1-based MATLAB indices
    rowVec(outliers.map(i=>i+1)),
  ];
}

export const LIDAR: ToolboxModule = {
  id: 'lidar',
  name: 'Lidar Toolbox',
  docBase: 'https://www.mathworks.com/help/lidar/',
  builtins: {
    pointCloud,
    pcdownsample,
    pcregistericp,
    pcsegdist,
    pcfitplane,
  },
  help: HELP_LIDAR,
};
