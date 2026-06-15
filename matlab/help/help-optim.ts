// Help entries for the Optimization Toolbox, extracted from optim.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_OPTIM: Record<string, HelpEntry | string> = {
    linprog: {
      summary: 'Linear programming solver',
      syntax: ['x = linprog(f,A,b)', 'x = linprog(f,A,b,Aeq,beq)'],
      description: ['x = linprog(f,A,b) minimises f\'x subject to A*x <= b, using a two-phase revised simplex method.'],
      seealso: ['quadprog', 'intlinprog', 'fmincon', 'optimoptions'],
    },
    quadprog: {
      summary: 'Quadratic programming solver',
      syntax: ['x = quadprog(H,f)', 'x = quadprog(H,f,A,b)'],
      description: ['x = quadprog(H,f) minimises 0.5*x\'*H*x + f\'*x.'],
      seealso: ['linprog', 'fmincon', 'optimoptions'],
    },
    fminunc: {
      summary: 'Solve unconstrained multivariable nonlinear minimization',
      syntax: ['x = fminunc(fun,x0)', '[x,fval,exitflag] = fminunc(fun,x0)'],
      description: ['x = fminunc(fun,x0) finds a local minimum of fun starting from x0.'],
      seealso: ['fmincon', 'fminsearch', 'optimoptions'],
    },
    fmincon: {
      summary: 'Solve constrained nonlinear multivariable minimization',
      syntax: ['x = fmincon(fun,x0,A,b)', 'x = fmincon(fun,x0,A,b,Aeq,beq)'],
      description: ['x = fmincon(fun,x0,A,b,Aeq,beq,lb,ub) minimises fun subject to linear and bound constraints.'],
      seealso: ['fminunc', 'linprog', 'quadprog', 'optimoptions'],
    },
    fsolve: {
      summary: 'Solve system of nonlinear equations',
      syntax: ['x = fsolve(fun,x0)', '[x,fval,exitflag] = fsolve(fun,x0)'],
      description: ['x = fsolve(fun,x0) finds x such that fun(x)=0.'],
      seealso: ['fminunc', 'lsqnonlin', 'optimoptions'],
    },
    lsqnonlin: {
      summary: 'Solve nonlinear least-squares problems',
      syntax: ['x = lsqnonlin(fun,x0)', 'x = lsqnonlin(fun,x0,lb,ub)'],
      description: ['x = lsqnonlin(fun,x0) finds x that minimises sum(fun(x).^2).'],
      seealso: ['lsqcurvefit', 'lsqlin', 'fsolve', 'optimoptions'],
    },
    lsqcurvefit: {
      summary: 'Solve nonlinear curve-fitting (data-fitting) problems',
      syntax: ['x = lsqcurvefit(fun,x0,xdata,ydata)', 'x = lsqcurvefit(fun,x0,xdata,ydata,lb,ub)'],
      description: ['x = lsqcurvefit(fun,x0,xdata,ydata) finds coefficients x minimising ||fun(x,xdata)-ydata||^2.'],
      seealso: ['lsqnonlin', 'lsqlin', 'curve_fitting', 'optimoptions'],
    },
    lsqlin: {
      summary: 'Solve constrained linear least-squares problems',
      syntax: ['x = lsqlin(C,d,A,b)', 'x = lsqlin(C,d,A,b,Aeq,beq)'],
      description: ['x = lsqlin(C,d,A,b) minimises ||C*x-d||^2 subject to A*x<=b.'],
      seealso: ['lsqnonlin', 'quadprog', 'optimoptions'],
    },
    intlinprog: {
      summary: 'Mixed-integer linear programming (MILP)',
      syntax: ['x = intlinprog(f,intcon,A,b)', 'x = intlinprog(f,intcon,A,b,Aeq,beq,lb,ub)'],
      description: ['x = intlinprog(f,intcon,A,b) minimises f\'x subject to A*x<=b with x(intcon) integer-valued.'],
      seealso: ['linprog', 'optimoptions'],
    },
    optimoptions: {
      summary: 'Create optimization options',
      syntax: ["options = optimoptions('fmincon')", "options = optimoptions('fmincon','Algorithm','sqp')"],
      description: ["options = optimoptions('solver',Name,Value) creates an options object for the named solver."],
      seealso: ['optimset', 'fmincon', 'linprog', 'fsolve'],
    },
    optimset: {
      summary: 'Create or modify optimization options structure',
      syntax: [
        'options = optimset(Name,Value)',
        'options = optimset(oldoptions,Name,Value)',
      ],
      description: ['optimset creates an options structure for use with fminbnd, fminsearch, fzero (legacy interface).'],
      seealso: ['optimoptions', 'fminsearch', 'fminbnd', 'fzero'],
    },
    optimvar: {
      summary: 'Create optimization variable for problem-based approach',
      syntax: ['x = optimvar(name)', 'x = optimvar(name,n)'],
      description: ["x = optimvar('x',n) creates an n-element continuous optimization variable named 'x'."],
      seealso: ['optimproblem', 'optimoptions'],
    },
    optimproblem: {
      summary: 'Create optimization problem',
      syntax: ['prob = optimproblem', "prob = optimproblem('Objective',expr)"],
      description: ['prob = optimproblem creates a minimization problem object for the problem-based workflow.'],
      seealso: ['optimvar', 'optimoptions'],
    },
    fgoalattain: {
      summary: 'Solve multiobjective goal attainment problems',
      syntax: [
        'x = fgoalattain(fun,x0,goal,weight)',
        '[x,fval,attainfactor,exitflag] = fgoalattain(fun,x0,goal,weight,A,b,Aeq,beq,lb,ub)',
      ],
      description: ['x = fgoalattain(fun,x0,goal,weight) minimises the attainment factor gamma such that F(x) - weight*gamma <= goal.'],
      seealso: ['fmincon', 'fminimax', 'gamultiobj', 'optimoptions'],
    },
    fminimax: {
      summary: 'Solve minimax constraint problems',
      syntax: [
        'x = fminimax(fun,x0)',
        '[x,fval,maxfval,exitflag] = fminimax(fun,x0,A,b,Aeq,beq,lb,ub,nonlcon)',
      ],
      description: ['x = fminimax(fun,x0) finds x that minimises the worst-case value max_i F_i(x), where F = fun(x).'],
      seealso: ['fmincon', 'fgoalattain', 'fseminf', 'optimoptions'],
    },
    fseminf: {
      summary: 'Solve semi-infinitely constrained minimisation problems',
      syntax: [
        'x = fseminf(fun,x0,ntheta,seminfcon)',
        '[x,fval,exitflag] = fseminf(fun,x0,ntheta,seminfcon,A,b,Aeq,beq,lb,ub)',
      ],
      description: ['Minimises fun(x) subject to ntheta semi-infinite constraints returned by seminfcon, which are sampled on a grid and enforced as ordinary inequalities.'],
      seealso: ['fmincon', 'fminimax', 'optimoptions'],
    },
    coneprog: {
      summary: 'Second-order cone programming solver',
      syntax: [
        'x = coneprog(f,socConstraints)',
        '[x,fval,exitflag] = coneprog(f,socConstraints,A,b,Aeq,beq,lb,ub)',
      ],
      description: ["Minimises f'*x subject to the second-order cone constraints ||Asc*x - bsc|| <= dsc'*x - gamma, plus optional linear constraints and bounds."],
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
