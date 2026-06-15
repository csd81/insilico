// Help entries for the Global Optimization Toolbox, extracted from gads.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_GADS: Record<string, HelpEntry | string> = {
    ga: {
      summary: 'Find minimum of function using genetic algorithm',
      syntax: [
        'x = ga(fun,nvars)',
        'x = ga(fun,nvars,A,b)',
        'x = ga(fun,nvars,A,b,Aeq,beq,lb,ub)',
        '[x,fval,exitflag,output] = ga(___)',
      ],
      description: [
        'x = ga(fun,nvars) minimises fun with nvars decision variables using a real-coded genetic algorithm.',
        'Bounds lb/ub clip the initial population and offspring. Linear constraints A*x<=b and Aeq*x==beq are handled by penalisation in this implementation.',
        'Returns optimal x, objective fval, exitflag (0=iteration limit), and output struct iteration count.',
      ],
      seealso: ['gamultiobj', 'simulannealbnd', 'patternsearch', 'particleswarm'],
    },
    simulannealbnd: {
      summary: 'Find minimum of function using simulated annealing algorithm',
      syntax: [
        'x = simulannealbnd(fun,x0)',
        'x = simulannealbnd(fun,x0,lb,ub)',
        'x = simulannealbnd(fun,x0,lb,ub,options)',
        '[x,fval,exitflag,output] = simulannealbnd(___)',
      ],
      description: [
        'x = simulannealbnd(fun,x0) minimises fun starting from x0 using simulated annealing.',
        'Temperature decreases geometrically; a candidate move is accepted if it reduces f or with Boltzmann probability exp(-Delta/T).',
        'lb and ub bound the search space.',
      ],
      seealso: ['ga', 'patternsearch', 'particleswarm'],
    },
    patternsearch: {
      summary: 'Find minimum of function using pattern search',
      syntax: [
        'x = patternsearch(fun,x0)',
        'x = patternsearch(fun,x0,A,b)',
        'x = patternsearch(fun,x0,A,b,Aeq,beq,lb,ub)',
        '[x,fval,exitflag,output] = patternsearch(___)',
      ],
      description: [
        'x = patternsearch(fun,x0) minimises fun using a poll-and-search pattern approach.',
        'At each iteration, the current mesh is polled along ±ei directions; if no improvement is found the mesh size halves.',
      ],
      seealso: ['ga', 'simulannealbnd', 'particleswarm'],
    },
    particleswarm: {
      summary: 'Particle swarm optimization',
      syntax: [
        'x = particleswarm(fun,nvars)',
        'x = particleswarm(fun,nvars,lb,ub)',
        'x = particleswarm(fun,nvars,lb,ub,options)',
        '[x,fval,exitflag,output] = particleswarm(___)',
      ],
      description: [
        'x = particleswarm(fun,nvars) minimises fun over nvars variables using particle swarm.',
        'Each particle tracks its personal best and the global best; velocity is updated with inertia weight W=0.729 and acceleration coefficients C1=C2=1.494.',
      ],
      seealso: ['ga', 'simulannealbnd', 'patternsearch'],
    },
    gamultiobj: {
      summary: 'Find Pareto front using multiobjective genetic algorithm',
      syntax: [
        'x = gamultiobj(fun,nvars)',
        'x = gamultiobj(fun,nvars,A,b,Aeq,beq,lb,ub)',
        '[x,fval,exitflag] = gamultiobj(___)',
      ],
      description: [
        'x = gamultiobj(fun,nvars) finds the Pareto front of a multiobjective function using an NSGA-II-style genetic algorithm.',
        'fun must return a row vector of objective values.',
        'Returns x (nPareto×nvars) and fval (nPareto×nObj) for all non-dominated solutions.',
      ],
      seealso: ['ga', 'paretosearch', 'particleswarm'],
    },
    paretosearch: { summary: 'Find Pareto front using pattern search',
      syntax: ['x = paretosearch(fun,nvars)', '[x,fval] = paretosearch(fun,nvars,A,b,Aeq,beq,lb,ub)'],
      seealso: ['gamultiobj', 'ga'], description: ['x = paretosearch(fun,nvars) finds nondominated points of the multiobjective function fun. The nvars argument is the dimension of the optimization problem (number of decision variables).', 'x = paretosearch(fun,nvars,A,b) finds nondominated points subject to the linear inequalities A*x ≤ b. See Linear Inequality Constraints.', 'x = paretosearch(fun,nvars,A,b,Aeq,beq) finds nondominated points subject to the linear constraints Aeqx = beq and Ax ≤ b. If no linear inequalities exist, set A = [] and b = [].', 'x = paretosearch(fun,nvars,A,b,Aeq,beq,lb,ub) defines a set of lower and upper bounds on the design variables in x, so that x is always in the range lb ≤ x ≤ ub. If no linear equalities exist, set Aeq = [] and beq = []. If x(i) has no lower bound, set lb(i) = -Inf. If x(i) has no upper bound, set ub(i) = Inf.', 'x = paretosearch(fun,nvars,A,b,Aeq,beq,lb,ub,nonlcon) applies the nonlinear inequalities ineqnonlin(x) defined in nonlcon. The paretosearch function finds nondominated points such that ineqnonlin(x) ≤ 0. If no bounds exist, set lb = [], ub = [], or both.'] },
    surrogateopt: { summary: 'Surrogate optimization for global minimum',
      syntax: ['x = surrogateopt(fun,lb,ub)', '[x,fval,exitflag,output] = surrogateopt(___)'],
      seealso: ['ga', 'patternsearch'], description: ['surrogateopt is a global solver for time-consuming objective functions.', 'surrogateopt attempts to solve problems of the form', 'minxf(x) such that ⎧⎪⎪⎪⎨⎪⎪⎪⎩lb≤x≤ubA·x≤bAeq·x=beqineqnonlin(x)≤0xi integer, i∈intcon.', 'The solver searches for the global minimum of a real-valued objective function in multiple dimensions, subject to bounds, optional linear constraints, optional integer constraints, and optional nonlinear inequality constraints. surrogateopt is best suited to objective functions that take a long time to evaluate. The objective function can be nonsmooth. The solver requires finite bounds on all variables. The solver can optionally maintain a checkpoint file to enable recovery from crashes or partial execution, or optimization continuation after meeting a stopping condition. The objective function _f_(_x_) can be empty ([]), in which case surrogateopt attempts to find a point satisfying all the constraints.', 'x = surrogateopt(objconstr,lb,ub) searches for a global minimum of objconstr(x) in the region lb <= x <= ub. If objconstr(x) returns a structure, then surrogateopt searches for a minimum of objconstr(x).Fval, subject to objconstr(x).Ineq <= 0.'] },
    globalsearch: { summary: 'Find global minimum using GlobalSearch solver',
      syntax: ['gs = GlobalSearch', 'gs = GlobalSearch(Name,Value)', '[x,fval] = run(gs,problem)'],
      seealso: ['MultiStart', 'fmincon'], description: ['A GlobalSearch object contains properties (options) that affect how run repeatedly runs a local solver to generate a GlobalOptimSolution object. When run, the solver attempts to locate a solution that has the lowest objective function value.'] },
    multistart: { summary: 'Find multiple local minima',
      syntax: ['ms = MultiStart', '[x,fval] = run(ms,problem,k)'],
      seealso: ['GlobalSearch', 'fmincon'], description: ['A MultiStart object contains properties (options) that affect how run repeatedly runs a local solver to generate a GlobalOptimSolution object. When run, the solver attempts to find multiple local solutions to a problem by starting from various points.'] },
  };
