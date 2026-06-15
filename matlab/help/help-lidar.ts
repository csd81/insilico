// Help entries for the Lidar Toolbox, extracted from lidar.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_LIDAR: Record<string, HelpEntry | string> = {
    pointCloud: {
      summary: 'Create a 3-D point cloud object',
      syntax: ['ptCloud = pointCloud(xyzPoints)', 'ptCloud = pointCloud(xyzPoints,Color=C)'],
      description: [
        'ptCloud = pointCloud(xyzPoints) creates a point cloud object from an [N×3] matrix of XYZ coordinates.',
        'ptCloud.Location is the [N×3] coordinate matrix. ptCloud.Count is the number of points.',
        'ptCloud.XLimits, ptCloud.YLimits, ptCloud.ZLimits give the axis-aligned bounding box.',
        'Pass ptCloud to pcdownsample, pcregistericp, pcsegdist, or pcfitplane.',
      ],
      seealso: ['pcdownsample', 'pcregistericp', 'pcsegdist', 'pcfitplane'],
    },
    pcdownsample: {
      summary: 'Downsample a 3-D point cloud',
      syntax: ['ptCloudOut = pcdownsample(ptCloudIn,gridStep)', "ptCloudOut = pcdownsample(ptCloudIn,'gridAverage',gridStep)"],
      description: [
        'ptCloudOut = pcdownsample(ptCloudIn,gridStep) reduces the point cloud by binning points into axis-aligned voxels of side length gridStep and replacing each voxel\'s points with their centroid.',
        'Smaller gridStep → more points retained (less downsampling).',
        'Typical values: 0.1–1.0 m for outdoor lidar; 0.001–0.01 m for object scans.',
      ],
      seealso: ['pointCloud', 'pcregistericp', 'pcsegdist'],
    },
    pcregistericp: {
      summary: 'Register two point clouds using ICP',
      syntax: ['tform = pcregistericp(moving,fixed)', '[tform,movingReg,rmse] = pcregistericp(moving,fixed,MaxIterations=n,Tolerance=t)'],
      description: [
        'tform = pcregistericp(moving,fixed) finds the rigid transformation (rotation + translation) that best aligns the moving point cloud to the fixed point cloud using Iterative Closest Point.',
        'Each ICP iteration: (1) find nearest neighbours in fixed for each moving point, (2) compute optimal rigid transform via SVD of the cross-covariance matrix, (3) apply transform.',
        'Iterates until MaxIterations (default 20) or RMSE change < Tolerance (default 1e-6).',
        'Returns: tform (rigidtform3d with Rotation [3×3] and Translation [1×3]), registered moving cloud, RMSE.',
      ],
      seealso: ['pointCloud', 'pcdownsample', 'pcsegdist', 'pcfitplane'],
    },
    pcsegdist: {
      summary: 'Segment point cloud into clusters based on Euclidean distance',
      syntax: ['[labels,numClusters] = pcsegdist(ptCloud,minDist)'],
      description: [
        '[labels,numClusters] = pcsegdist(ptCloud,minDist) groups points into clusters where any two points in the same cluster are within minDist of at least one other point in that cluster (connected components at distance threshold).',
        'Uses BFS with a voxel-grid spatial index for O(N log N) performance.',
        'labels is an [N×1] integer vector (1-based cluster indices). numClusters is the total number of clusters found.',
        'Typical use: segment individual objects after ground removal (pcfitplane).',
      ],
      seealso: ['pointCloud', 'pcfitplane', 'pcregistericp'],
    },
    pcfitplane: {
      summary: 'Fit a plane to a 3-D point cloud using RANSAC',
      syntax: ['model = pcfitplane(ptCloud,maxDistance)', '[model,inlierIndices,outlierIndices] = pcfitplane(ptCloud,maxDistance,maxNumTrials)'],
      description: [
        '[model,inlierIndices,outlierIndices] = pcfitplane(ptCloud,maxDistance) fits the dominant plane using RANSAC.',
        'RANSAC: repeatedly samples 3 random points, computes plane normal via cross product, counts inliers within maxDistance of the plane. Keeps the hypothesis with the most inliers (up to 1000 trials).',
        'Refines the final plane via least-squares: smallest eigenvector of the inlier covariance matrix (Jacobi eigendecomposition).',
        'model.Parameters = [a b c d] such that ax+by+cz+d=0 with unit normal [a b c].',
        'inlierIndices and outlierIndices are 1-based index vectors into the original point cloud.',
        'Typical use: remove ground plane before pcsegdist object clustering.',
      ],
      seealso: ['pointCloud', 'pcsegdist', 'pcdownsample', 'pcregistericp'],
    },
  };
