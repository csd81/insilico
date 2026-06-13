# Function Coverage

This document summarises what is implemented, what is quarantined, and what is
intentionally out of scope. It replaces the legacy generated candidate lists
(`all_functions.md`, `candidates.md`, `implementable_1000.md`,
`portable_candidates_100.md`, `unimplemented_functions.md`) which were 4.2 MB
of generated content with no runtime value.

---

## Implemented

### Base MATLAB (`matlab/builtins.ts`)
~1 300 async builtin entries covering:
- Arithmetic, relational, logical operators
- Matrix construction: `zeros`, `ones`, `eye`, `rand`, `randn`, `linspace`, `meshgrid`, …
- Linear algebra: `det`, `inv`, `mldivide` (`\`), `eig`, `svd`, `qr`, `lu`, `chol`, `norm`, …
- Array ops: `size`, `numel`, `reshape`, `repmat`, `sort`, `find`, `unique`, `sum`, `cumsum`, …
- String/char: `sprintf`, `num2str`, `str2num`, `strsplit`, `strtrim`, `regexp`, …
- Control flow support: `error`, `warning`, `nargin`, `nargout`, `exist`, `isfield`, …
- I/O: `disp`, `fprintf`, `input`, `csvread`/`csvwrite`, `readmatrix`/`writematrix`, …
- Symbolic math subset: `sym`, `syms`, `diff`, `int`, `solve`, `simplify`, `subs`, …
- Datetime/duration, table/timetable, categorical, cell, struct operations

### Registered Toolboxes (`matlab/tb/index.ts`) — 36 modules
| Module | Key functions |
|---|---|
| CONTROL | `tf`, `ss`, `bode`, `nyquist`, `rlocus`, `lsim`, `step`, `pole`, `zero` |
| SIGNAL | `fft`, `ifft`, `filter`, `butter`, `freqz`, `spectrogram`, `findpeaks` |
| STATS | `mean`, `std`, `var`, `histfit`, `normfit`, `ttest`, `chi2test`, `kruskalwallis` |
| OPTIM | `fgoalattain` (only; others duplicate base or are stubs) |
| SYMBOLIC | `solve`, `vpa`, `taylor`, `fourier`, `laplace`, `ode2sym` |
| CURVEFIT | `fit`, `cfit`, `coeffvalues`, `predint`, `confint` |
| NNET | Neural network layer constructors, `trainNetwork` stub |
| DSP | `dsp.FIRFilter`, `dsp.FFT`, `dsp.IIRFilter` |
| IMAGES | `imresize`, `imfilter`, `fspecial`, `edge`, `imadjust` |
| PDE | `solvepde`, `createpde`, basic FEM setup |
| FUZZY | `fis`, `addMF`, `evalfis` |
| RL | `rlDDPGAgent`, `rlTrainingOptions`, `train` stubs |
| GADS | `ga`, `particleswarm`, `simulannealbnd` |
| IDENT | `tfest`, `ssest`, `arx` |
| MAPPING | `deg2rad`, `rad2deg`, geodetic helpers |
| NAV | Navigation filter utilities |
| PARALLEL | `parfor` stub, `parfeval` |
| FUSION | Sensor fusion / tracking object stubs |
| COMM | Modulation, channel, coding utilities |
| ECON | Time series / econometrics |
| FINANCIAL | Option pricing, cash flow utilities |
| FININST | Additional financial instruments |
| FIXEDPOINT | `fi`, `fimath` |
| WAVELET | `wavedec`, `waverec`, `cwt` |
| BIOINFO | Sequence / alignment utilities |
| LIDAR | Point cloud primitives |
| RADAR | Radar equation, clutter models |
| RF | S-parameters, network analysis |
| ANTENNA | Array factor, element patterns |
| AUDIO | `audioread`/`audiowrite` stubs, spectrogram |
| PHASED | Phased array signal processing |
| ROBOTICS | Rigid body tree, joint, transformations |
| TEXTANALYTICS | `tokenizedDocument`, `bagOfWords` |
| VISION | `detectSURFFeatures`, basic CV stubs |
| RISK | Credit risk utility stubs |

---

## Quarantined / Removed

| Module | Reason |
|---|---|
| **Simulink** | Different execution model (block diagram). No course dependency. Removed from runtime; source deleted. |
| **UAV Toolbox** | Functions (`uavMinTurningRadius`, `CrossTrackError`, …) do not exist as standalone MATLAB functions. AI-invented names derived from internal OOP class methods. Deleted. |
| **MPC Toolbox** | Entirely stubs. `mpcmove` ignored constraints; real QP solver was dead code. Deleted previously. |
| **Quantum / QUBO** | Not a MATLAB toolbox. Baked into base builtins; now removed from BUILTINS registry and help index. Implementation remains in `builtins.ts` but is unreachable. |
| **OPTIM (partial)** | 11 of 14 builtins duplicate base MATLAB. `optimvar`/`optimproblem` are stubs. Only `fgoalattain` is registered. |

---

## Out of Scope (Intentionally)

- GUI components (`uifigure`, `App Designer`, `uitab`, …)
- File format parsers beyond CSV/MAT/MLX (HDF5, netCDF, …)
- Hardware interface toolboxes (Instrument Control, Data Acquisition, …)
- Deep learning training on real models (no GPU, no ONNX)
- Geospatial (requires large map tiles)
- Compiler / code generation toolboxes

---

## Adding a New Function

1. Implement in `matlab/builtins.ts` (base) or `matlab/tb/<name>.ts` (toolbox).
2. If toolbox: import and add to `TOOLBOXES` array in `matlab/tb/index.ts`.
3. Add help entry in `matlab/help/index.ts` or the relevant `help/help-<name>.ts`.
4. Add at least one test in `matlab/test/core.test.ts` or a new test file.
5. Only register after the output is validated against MATLAB or Octave ground truth.
