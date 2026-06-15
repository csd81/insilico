// Help entries for the Computer Vision Toolbox, extracted from vision.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_VISION: Record<string, HelpEntry | string> = {
    detectHarrisFeatures: {
      summary: 'Detect Harris corners in a grayscale image',
      syntax: ['corners = detectHarrisFeatures(I)', 'corners = detectHarrisFeatures(I,MinQuality,q)', 'corners = detectHarrisFeatures(I,MinQuality,q,FilterSize,f)'],
      description: [
        'corners = detectHarrisFeatures(I) returns a cornerPoints object containing Harris corner locations and response metrics.',
        'Uses Sobel gradients → structure tensor (summed over 5×5 window) → Harris response R = det(M) - k*trace(M)^2, k=0.05.',
        'Non-maximum suppression with 3-pixel radius. Points sorted by descending response.',
        'corners.Location is [N×2] [x,y] (1-based). corners.Metric is [N×1] response values.',
      ],
      seealso: ['detectFASTFeatures', 'extractFeatures', 'matchFeatures', 'corner'],
    },
    detectFASTFeatures: {
      summary: 'Detect FAST corners in a grayscale image',
      syntax: ['corners = detectFASTFeatures(I)', 'corners = detectFASTFeatures(I,MinContrast,t)'],
      description: [
        'corners = detectFASTFeatures(I) returns a cornerPoints object using the FAST-9 detector.',
        'A pixel is a corner if 9 consecutive pixels on a circle of radius 3 are all brighter or darker by at least the threshold t (default 20).',
        'Quick 4-point pre-test rejects non-corners early. Corner strength = sum of absolute differences to circle pixels.',
        'Results are non-maximum suppressed and sorted by descending strength.',
      ],
      seealso: ['detectHarrisFeatures', 'extractFeatures', 'matchFeatures'],
    },
    extractFeatures: {
      summary: 'Extract feature descriptors from an image at keypoint locations',
      syntax: ['[features,validPts] = extractFeatures(I,pts)', '[features,validPts] = extractFeatures(I,pts,Method,m)'],
      description: [
        '[features,validPts] = extractFeatures(I,pts) returns an [N×64] matrix of normalized 8×8 patch descriptors at each valid keypoint.',
        'Each descriptor is the zero-mean unit-variance patch of size 8×8 pixels centered on the keypoint.',
        'Keypoints too close to the image border (within 4 pixels) are excluded from validPts.',
        'pts can be a cornerPoints object or an [N×2] matrix of [x,y] locations.',
      ],
      seealso: ['detectHarrisFeatures', 'detectFASTFeatures', 'matchFeatures'],
    },
    matchFeatures: {
      summary: 'Find putative correspondences between two sets of feature descriptors',
      syntax: ['indexPairs = matchFeatures(features1,features2)', 'indexPairs = matchFeatures(features1,features2,ratio)'],
      description: [
        'indexPairs = matchFeatures(F1,F2) returns an [M×2] matrix where each row [i,j] means the i-th feature in F1 matches the j-th feature in F2.',
        'Uses brute-force L2 distance with Lowe\'s ratio test: match is accepted if best_distance < 0.6 * second_best_distance.',
        'ratio overrides the ratio threshold (default 0.6). Smaller → stricter (fewer but more reliable matches).',
        'Matches are unique (each F2 descriptor can only be matched once).',
      ],
      seealso: ['extractFeatures', 'estimateFundamentalMatrix', 'detectHarrisFeatures'],
    },
    estimateFundamentalMatrix: {
      summary: 'Estimate fundamental matrix from point correspondences',
      syntax: ['F = estimateFundamentalMatrix(pts1,pts2)', '[F,inliers] = estimateFundamentalMatrix(pts1,pts2,Method,m)'],
      description: [
        'F = estimateFundamentalMatrix(pts1,pts2) returns the 3×3 fundamental matrix relating two views.',
        'pts1 and pts2 are [N×2] matrices of matching image coordinates (at least 8 pairs required).',
        'Uses the normalized 8-point algorithm (Hartley 1997):',
        '  1. Normalize points to have zero mean and RMS distance √2.',
        '  2. Build [N×9] matrix A from outer products of homogeneous coordinates.',
        '  3. Smallest singular vector of A (via power iteration on A\'A) gives raw F.',
        '  4. Enforce rank-2 via SVD: zero out smallest singular value.',
        '  5. Denormalize: F ← T2\' * F * T1.',
        'A point x2 matches x1 if x2\' * F * x1 ≈ 0 (epipolar constraint).',
      ],
      seealso: ['matchFeatures', 'extractFeatures', 'estimateEssentialMatrix'],
    },
  };
