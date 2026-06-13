// Help entries for the Parallel Computing Toolbox, extracted from parallel.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_PARALLEL: Record<string, HelpEntry | string> = {
    parpool: {
      summary: 'Create or access parallel pool',
      syntax: ['p = parpool', 'p = parpool(n)', "p = parpool('local',n)"],
      description: [
        'p = parpool(n) opens a parallel pool with n workers.',
        'In the web sandbox, workers=1 and execution is sequential.',
      ],
      seealso: ['gcp', 'delete', 'parfor'],
    },
    gcp: {
      summary: 'Get current parallel pool',
      syntax: ['p = gcp', "p = gcp('nocreate')"],
      description: ['p = gcp returns the current parallel pool, creating one if needed.'],
      seealso: ['parpool', 'delete'],
    },
    gpuArray: {
      summary: 'Create array on GPU',
      syntax: ['A = gpuArray(X)', 'A = gpuArray(n,classname)'],
      description: [
        'A = gpuArray(X) copies X to the GPU.',
        'In the web sandbox, this is a pass-through — the array remains on the CPU.',
      ],
      seealso: ['gather', 'isgpuarray', 'pagefun'],
    },
    gather: {
      summary: 'Retrieve data from GPU array',
      syntax: ['X = gather(A)'],
      description: ['X = gather(A) transfers A from GPU to CPU memory. Pass-through in the web sandbox.'],
      seealso: ['gpuArray', 'isgpuarray'],
    },
    isgpuarray: {
      summary: 'Determine whether input is gpuArray',
      syntax: ['tf = isgpuarray(A)'],
      description: ['tf = isgpuarray(A) returns false in the web sandbox (no GPU available).'],
      seealso: ['gpuArray', 'gather'],
    },
    pagefun: {
      summary: 'Apply function to each page of N-D array',
      syntax: ['B = pagefun(func,A)', 'B = pagefun(func,A1,A2,...)'],
      description: ['B = pagefun(func,A) applies func to each page (3rd-dimension slice) of A.'],
      seealso: ['gpuArray', 'arrayfun'],
    },
    distributed: {
      summary: 'Create distributed array',
      syntax: ['D = distributed(X)'],
      description: ['D = distributed(X) distributes X across parallel workers. Pass-through in the sandbox.'],
      seealso: ['codistributed', 'gather'],
    },
    codistributed: {
      summary: 'Create codistributed array',
      syntax: ['D = codistributed(X)', 'D = codistributed(X,codist)'],
      description: ['D = codistributed(X) creates a codistributed array. Pass-through in the sandbox.'],
      seealso: ['distributed', 'gather'],
    },
    batch: {
      summary: 'Run MATLAB function or script as batch job',
      syntax: ['j = batch(fcn)', "j = batch(fcn,'Workspace',ws)"],
      description: ['j = batch(fcn) submits fcn as a background batch job. Returns a stub job object in the sandbox.'],
      seealso: ['parpool', 'submit', 'wait'],
    },
    spmdindex: {
      summary: 'Index of current worker in spmd block',
      syntax: ['idx = spmdindex'],
      description: ['spmdindex returns 1 in the sandbox (single-worker execution).'],
      seealso: ['spmdsize', 'spmd'],
    },
    spmdsize: {
      summary: 'Number of workers in spmd block',
      syntax: ['n = spmdsize'],
      description: ['spmdsize returns 1 in the sandbox.'],
      seealso: ['spmdindex', 'spmd'],
    },
    parfeval: {
      summary: 'Evaluate function asynchronously on parallel pool worker',
      syntax: [
        'f = parfeval(pool,fcn,nargout,X1,...,Xn)',
        'f = parfeval(fcn,nargout,X1,...,Xn)',
      ],
      description: [
        'f = parfeval(pool,fcn,nargout,X1,...,Xn) submits fcn(X1,...,Xn) for asynchronous evaluation.',
        'In the web sandbox, execution is synchronous. Use fetchOutputs(f) to retrieve results.',
        'f is a parallel.FevalFuture object with State="finished" immediately.',
      ],
      seealso: ['fetchOutputs', 'parpool', 'parfor'],
    },
    fetchOutputs: {
      summary: 'Retrieve all output arguments from a parfeval future',
      syntax: ['[X1,...,Xn] = fetchOutputs(f)'],
      description: ['Returns the NumOutputArguments results stored in a finished parfeval future f.'],
      seealso: ['parfeval', 'parpool'],
    },
    gputimeit: { summary: 'Time required to run function on GPU',
      syntax: ['t = gputimeit(f)', 't = gputimeit(f,n)'],
      seealso: ['gpuArray', 'timeit'], description: ['t = gputimeit(F) measures the typical time, in seconds, required to run the function specified by the function handle F. The function handle accepts no external input arguments, but you can define it with input arguments to its internal function call.', 't = gputimeit(F,numOutputs) calls F with the desired number of output arguments, numOutputs. By default, gputimeit calls the function F with one output argument, or no output arguments if F does not return any output.'] },
    validategpu: { summary: 'Validate MATLAB GPU support for current system',
      syntax: ['validategpu'],
      seealso: ['gpuArray', 'gpuDeviceCount'], description: ['validateGPU validates the currently selected GPU device. If no GPU device is selected, then the function validates the default device.', 'validateGPU("all") validates all GPU devices detected in your system.', 'validateGPU(ind) validates the GPU devices specified by indices ind.', 'Tip', 'Validating your GPU device is not required. Use the validateGPU function to diagnose problems with your GPU setup.'] },
  };
