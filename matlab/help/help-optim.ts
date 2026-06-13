// Help entries for the Optimization Toolbox, extracted from optim.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_OPTIM: Record<string, HelpEntry | string> = {
    linprog: {
      summary: 'Linear programming solver',
      syntax: [
        'x = linprog(f,A,b)',
        'x = linprog(f,A,b,Aeq,beq)',
        'x = linprog(f,A,b,Aeq,beq,lb,ub)',
        '[x,fval,exitflag] = linprog(___)',
      ],
      description: [
        'x = linprog(f,A,b) minimises f\'x subject to A*x <= b, using a two-phase revised simplex method.',
        'x = linprog(f,A,b,Aeq,beq,lb,ub) adds equality constraints and variable bounds.',
        'exitflag: 1=optimal, -2=infeasible, -3=unbounded.',
      ],
      seealso: ['quadprog', 'intlinprog', 'fmincon', 'optimoptions'],
    },
    quadprog: {
      summary: 'Quadratic programming solver',
      syntax: [
        'x = quadprog(H,f)',
        'x = quadprog(H,f,A,b)',
        'x = quadprog(H,f,A,b,Aeq,beq,lb,ub)',
        '[x,fval,exitflag] = quadprog(___)',
      ],
      description: [
        'x = quadprog(H,f) minimises 0.5*x\'*H*x + f\'*x.',
        'H must be positive semi-definite. Inequality (A*x<=b) and equality (Aeq*x=beq) linear constraints are supported.',
        'Uses a projected-gradient active-set method.',
      ],
      seealso: ['linprog', 'fmincon', 'optimoptions'],
    },
    fminunc: {
      summary: 'Solve unconstrained multivariable nonlinear minimization',
      syntax: [
        'x = fminunc(fun,x0)',
        '[x,fval,exitflag] = fminunc(fun,x0)',
        '[x,fval,exitflag,output] = fminunc(fun,x0,options)',
      ],
      description: [
        'x = fminunc(fun,x0) finds a local minimum of fun starting from x0.',
        'Uses L-BFGS with Armijo backtracking line search.',
        'fun must accept a row vector and return a scalar.',
      ],
      seealso: ['fmincon', 'fminsearch', 'optimoptions'],
    },
    fmincon: {
      summary: 'Solve constrained nonlinear multivariable minimization',
      syntax: [
        'x = fmincon(fun,x0,A,b)',
        'x = fmincon(fun,x0,A,b,Aeq,beq)',
        'x = fmincon(fun,x0,A,b,Aeq,beq,lb,ub)',
        'x = fmincon(fun,x0,A,b,Aeq,beq,lb,ub,nonlcon)',
        '[x,fval,exitflag] = fmincon(___)',
      ],
      description: [
        'x = fmincon(fun,x0,A,b,Aeq,beq,lb,ub) minimises fun subject to linear and bound constraints.',
        'Pass [] for unused arguments. nonlcon returns [c,ceq] for nonlinear inequalities (c<=0) and equalities.',
        'Uses an augmented-Lagrangian / projected-gradient approach.',
      ],
      seealso: ['fminunc', 'linprog', 'quadprog', 'optimoptions'],
    },
    fsolve: {
      summary: 'Solve system of nonlinear equations',
      syntax: [
        'x = fsolve(fun,x0)',
        '[x,fval,exitflag] = fsolve(fun,x0)',
        '[x,fval,exitflag] = fsolve(fun,x0,options)',
      ],
      description: [
        'x = fsolve(fun,x0) finds x such that fun(x)=0.',
        'Uses the Levenberg-Marquardt algorithm with finite-difference Jacobian.',
      ],
      seealso: ['fminunc', 'lsqnonlin', 'optimoptions'],
    },
    lsqnonlin: {
      summary: 'Solve nonlinear least-squares problems',
      syntax: [
        'x = lsqnonlin(fun,x0)',
        'x = lsqnonlin(fun,x0,lb,ub)',
        '[x,resnorm,residual,exitflag] = lsqnonlin(___)',
      ],
      description: [
        'x = lsqnonlin(fun,x0) finds x that minimises sum(fun(x).^2).',
        'fun returns a vector of residuals.',
        'Uses the Levenberg-Marquardt algorithm.',
      ],
      seealso: ['lsqcurvefit', 'lsqlin', 'fsolve', 'optimoptions'],
    },
    lsqcurvefit: {
      summary: 'Solve nonlinear curve-fitting (data-fitting) problems',
      syntax: [
        'x = lsqcurvefit(fun,x0,xdata,ydata)',
        'x = lsqcurvefit(fun,x0,xdata,ydata,lb,ub)',
        '[x,resnorm,residual,exitflag] = lsqcurvefit(___)',
      ],
      description: [
        'x = lsqcurvefit(fun,x0,xdata,ydata) finds coefficients x minimising ||fun(x,xdata)-ydata||^2.',
        'fun(x,xdata) must return a vector the same length as ydata.',
      ],
      seealso: ['lsqnonlin', 'lsqlin', 'curve_fitting', 'optimoptions'],
    },
    lsqlin: {
      summary: 'Solve constrained linear least-squares problems',
      syntax: [
        'x = lsqlin(C,d,A,b)',
        'x = lsqlin(C,d,A,b,Aeq,beq)',
        'x = lsqlin(C,d,A,b,Aeq,beq,lb,ub)',
        '[x,resnorm,residual,exitflag] = lsqlin(___)',
      ],
      description: [
        'x = lsqlin(C,d,A,b) minimises ||C*x-d||^2 subject to A*x<=b.',
        'Solved via quadprog normal equations: minimise 0.5*x\'*C\'C*x - d\'C*x.',
      ],
      seealso: ['lsqnonlin', 'quadprog', 'optimoptions'],
    },
    intlinprog: {
      summary: 'Mixed-integer linear programming (MILP)',
      syntax: [
        'x = intlinprog(f,intcon,A,b)',
        'x = intlinprog(f,intcon,A,b,Aeq,beq,lb,ub)',
        '[x,fval,exitflag] = intlinprog(___)',
      ],
      description: [
        'x = intlinprog(f,intcon,A,b) minimises f\'x subject to A*x<=b with x(intcon) integer-valued.',
        'Uses branch-and-bound with LP relaxations at each node.',
        'intcon is a vector of integer-variable indices (1-based).',
      ],
      seealso: ['linprog', 'optimoptions'],
    },
    optimoptions: {
      summary: 'Create optimization options',
      syntax: [
        "options = optimoptions('fmincon')",
        "options = optimoptions('fmincon','Algorithm','sqp')",
        "options = optimoptions(options,'Display','iter')",
      ],
      description: [
        "options = optimoptions('solver',Name,Value) creates an options object for the named solver.",
        'Common fields: Algorithm, Display, MaxIterations, FunctionTolerance, StepTolerance, OptimalityTolerance.',
      ],
      seealso: ['optimset', 'fmincon', 'linprog', 'fsolve'],
    },
    optimset: {
      summary: 'Create or modify optimization options structure',
      syntax: [
        'options = optimset(Name,Value)',
        'options = optimset(oldoptions,Name,Value)',
      ],
      description: [
        'optimset creates an options structure for use with fminbnd, fminsearch, fzero (legacy interface).',
        'Prefer optimoptions for Optimization Toolbox solvers.',
      ],
      seealso: ['optimoptions', 'fminsearch', 'fminbnd', 'fzero'],
    },
    optimvar: {
      summary: 'Create optimization variable for problem-based approach',
      syntax: ['x = optimvar(name)', 'x = optimvar(name,n)', "x = optimvar(name,n,'Type','integer')"],
      description: [
        "x = optimvar('x',n) creates an n-element continuous optimization variable named 'x'.",
        'Use in expressions passed to optimproblem for the problem-based optimization workflow.',
      ],
      seealso: ['optimproblem', 'optimoptions'],
    },
    optimproblem: {
      summary: 'Create optimization problem',
      syntax: [
        'prob = optimproblem',
        "prob = optimproblem('Objective',expr)",
        "prob = optimproblem('Objective',expr,'Constraints',constr)",
      ],
      description: [
        'prob = optimproblem creates a minimization problem object for the problem-based workflow.',
        'Set prob.Objective and prob.Constraints, then call solve(prob).',
      ],
      seealso: ['optimvar', 'optimoptions'],
    },
    fgoalattain: {
      summary: 'Solve multiobjective goal attainment problems',
      syntax: [
        'x = fgoalattain(fun,x0,goal,weight)',
        '[x,fval,attainfactor,exitflag] = fgoalattain(fun,x0,goal,weight,A,b,Aeq,beq,lb,ub)',
      ],
      description: [
        'x = fgoalattain(fun,x0,goal,weight) minimises the attainment factor gamma such that F(x) - weight*gamma <= goal.',
        'Internally reduces to a fmincon problem with gamma as an extra variable.',
      ],
      seealso: ['fmincon', 'fminimax', 'gamultiobj', 'optimoptions'],
    },
    fminimax: {
      summary: 'Solve minimax constraint problems',
      syntax: [
        'x = fminimax(fun,x0)',
        '[x,fval,maxfval,exitflag] = fminimax(fun,x0,A,b,Aeq,beq,lb,ub,nonlcon)',
      ],
      description: [
        'x = fminimax(fun,x0) finds x that minimises the worst-case value max_i F_i(x), where F = fun(x).',
        'Reduces to a fmincon problem with an extra variable gamma and constraints F_i(x) <= gamma.',
      ],
      seealso: ['fmincon', 'fgoalattain', 'fseminf', 'optimoptions'],
    },
    fseminf: {
      summary: 'Solve semi-infinitely constrained minimisation problems',
      syntax: [
        'x = fseminf(fun,x0,ntheta,seminfcon)',
        '[x,fval,exitflag] = fseminf(fun,x0,ntheta,seminfcon,A,b,Aeq,beq,lb,ub)',
      ],
      description: [
        'Minimises fun(x) subject to ntheta semi-infinite constraints returned by seminfcon, which are sampled on a grid and enforced as ordinary inequalities.',
        'seminfcon has the form [c,ceq,K1,...,Kntheta,S] = seminfcon(x,S).',
      ],
      seealso: ['fmincon', 'fminimax', 'optimoptions'],
    },
    coneprog: {
      summary: 'Second-order cone programming solver',
      syntax: [
        'x = coneprog(f,socConstraints)',
        '[x,fval,exitflag] = coneprog(f,socConstraints,A,b,Aeq,beq,lb,ub)',
      ],
      description: [
        "Minimises f'*x subject to the second-order cone constraints ||Asc*x - bsc|| <= dsc'*x - gamma, plus optional linear constraints and bounds.",
        'Build cone constraints with secondordercone. Solved here by reformulating the cones as nonlinear constraints for fmincon.',
      ],
      seealso: ['secondordercone', 'linprog', 'quadprog', 'fmincon'],
    },
    secondordercone: {
      summary: 'Create second-order cone constraint for coneprog',
      syntax: ['socc = secondordercone(A,b,d,gamma)'],
      description: [
        "secondordercone(A,b,d,gamma) defines the cone ||A*x - b|| <= d'*x - gamma for use with coneprog.",
      ],
      seealso: ['coneprog'],
    },
  };
