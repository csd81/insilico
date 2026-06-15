// Help entries for the Partial Differential Equation Toolbox, extracted from pde.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_PDE: Record<string, HelpEntry | string> = {
    assema: { summary: 'Assemble area integral contributions for PDE FEM', syntax: ['[K,M,F] = assema(p,t,c,a,f)'], seealso: ['pdetrg', 'pdeintrp'] },
    pdetrg: { summary: 'Triangle geometry data (areas and midpoints)', syntax: ['[ar,g] = pdetrg(p,t)'], seealso: ['pdetriq', 'assema'] },
    pdetriq: { summary: 'Triangle mesh quality (circumradius/inradius ratio)', syntax: ['q = pdetriq(p,t)'], seealso: ['pdetrg', 'jigglemesh'] },
    pdeintrp: { summary: 'Interpolate PDE solution in mesh points', syntax: ['up = pdeintrp(p,t,u)'], seealso: ['pdeprtni', 'tri2grid'] },
    pdeprtni: { summary: 'Interpolate PDE triangle solution to nodes', syntax: ['un = pdeprtni(p,t,ut)'], seealso: ['pdeintrp'] },
    pdegrad: { summary: 'Gradient of PDE solution', syntax: ['[ux,uy] = pdegrad(p,t,u)'], seealso: ['pdeintrp', 'pdetrg'] },
    pdesdt: { summary: 'PDE subdomain data for triangles', syntax: ['[cs,t] = pdesdt(c,t,sdl)'], seealso: ['pdesde'] },
    pdesde: { summary: 'PDE subdomain data for edges', syntax: ['[cs,e] = pdesde(c,e,sdl)'], seealso: ['pdesdt'] },
    pdearcl: { summary: 'Returns parameter values for a parametrized curve corresponding to a given set of arc length values.', syntax: ['pp = pdearcl(p,xy,s,s0,s1)'], seealso: ['pdegplot'], description: ['pp = pdearcl(p,xy,s,s0,s1) returns parameter values for a parametrized curve corresponding to a given set of arc length values.'] },
    tri2grid: { summary: 'Interpolate solution from triangle mesh to rectangular grid', syntax: ['ug = tri2grid(p,t,u,x,y)'], seealso: ['pdeintrp', 'initmesh'] },
    jigglemesh: { summary: 'Jiggles the triangular mesh by adjusting the node point positions.', syntax: ['p1 = jigglemesh(p,e,t)', 'p1 = jigglemesh(p,e,t,Name,Value)'], seealso: ['initmesh', 'pdetriq'], description: ['p1 = jigglemesh(p,e,t) jiggles the triangular mesh by adjusting the node point positions. Typically, the quality of the mesh increases after jiggling.'] },
    poiasma: { summary: "Assemble stiffness matrix for Poisson equation on a rectangular grid", syntax: ['A = poiasma(nx,ny)', 'A = poiasma(nx,ny,h1,h2)'], description: ["A = poiasma(nx,ny) assembles the sparse finite-difference stiffness matrix for the 2-D Poisson equation on an nx-by-ny interior grid. Used with poicalc to solve Poisson's equation."], seealso: ['poicalc', 'delsq', 'numgrid'] },
    poicalc: { summary: "Solve Poisson equation on a rectangular grid", syntax: ['u = poicalc(f,hx,hy,nx,ny)'], description: ["u = poicalc(f,hx,hy,nx,ny) solves −Δu = f on a rectangular grid with spacing hx and hy, returning the interior solution vector u. Uses the DST-based fast Poisson solver."], seealso: ['poiasma', 'delsq', 'numgrid', 'dst'] },
    dst: { summary: 'Discrete sine transform', syntax: ['y = dst(x)'], seealso: ['idst', 'dct'] },
    idst: { summary: 'Inverse discrete sine transform', syntax: ['x = idst(y)'], seealso: ['dst', 'idct'] },
    createpde: { summary: 'Create a PDE model object', syntax: ['model = createpde()'], description: ['model = createpde() creates a PDEModel for a stationary scalar problem. This sandbox v1 solves −∇·(c∇u)+a·u=f on the unit disk (circleg) or unit square (squareg) with Dirichlet boundary conditions.'], seealso: ['geometryFromEdges', 'generateMesh', 'specifyCoefficients', 'applyBoundaryCondition', 'solvepde', 'pdeplot'] },
    geometryFromEdges: { summary: 'Attach 2-D geometry to a PDE model', syntax: ['geometryFromEdges(model,@circleg)', 'geometryFromEdges(model,@squareg)'], description: ['Sets the model geometry from a geometry function. v1 supports @circleg (unit disk) and @squareg (unit square).'], seealso: ['createpde', 'generateMesh', 'circleg', 'squareg'] },
    generateMesh: { summary: 'Generate a triangular FEM mesh', syntax: ['generateMesh(model)', 'generateMesh(model,"Hmax",h)'], description: ['Builds a triangular mesh with target element size h, stored in model.Mesh (Nodes 2×Np, Elements 4×Nt).'], seealso: ['createpde', 'geometryFromEdges', 'solvepde'] },
    specifyCoefficients: { summary: 'Set PDE coefficients', syntax: ['specifyCoefficients(model,"m",0,"d",0,"c",c,"a",a,"f",f)'], description: ['Sets the coefficients of −∇·(c∇u)+a·u=f (scalar c, a, f; m and d ignored in v1).'], seealso: ['createpde', 'solvepde'] },
    applyBoundaryCondition: { summary: 'Apply a boundary condition', syntax: ['applyBoundaryCondition(model,"dirichlet","Edge",edges,"u",val)'], description: ['Applies a Dirichlet condition u=val on the boundary (v1: a single uniform value over the whole boundary).'], seealso: ['createpde', 'solvepde'] },
    solvepde: { summary: 'Solve a stationary PDE model', syntax: ['R = solvepde(model)'], description: ['Assembles and solves the P1 finite-element system, returning results with R.NodalSolution.'], seealso: ['createpde', 'generateMesh', 'pdeplot'] },
    pdeplot: { summary: 'Plot PDE mesh/solution', syntax: ['pdeplot(model,"XYData",u)'], description: ['Draws the triangulation filled with colour mapped from the nodal data u.'], seealso: ['solvepde', 'generateMesh'] },
    circleg: { summary: 'Unit-disk geometry function (use with geometryFromEdges)', syntax: ['geometryFromEdges(model,@circleg)'], seealso: ['geometryFromEdges', 'squareg'] },
    squareg: { summary: 'Unit-square geometry function (use with geometryFromEdges)', syntax: ['geometryFromEdges(model,@squareg)'], seealso: ['geometryFromEdges', 'circleg'] },
  };
