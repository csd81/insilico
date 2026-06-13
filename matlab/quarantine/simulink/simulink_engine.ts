// Simulink headless execution engine (consolidated single-file module).
// Merged from the former simulink_engine/{blocks,model,solver,subsystem,api}.ts in dependency
// order; internal sibling imports were stripped since all symbols now share this file.
// Public surface (used by tb/simulink.ts): new_system/add_block/add_line/set_param/get_param/sim.

// ════════════════════════════════════════════════════════════════════════════════════
// blocks.ts
// ════════════════════════════════════════════════════════════════════════════════════
export abstract class Block {
    public name: string;
    public parameters: Record<string, any> = {};
    
    // Topology and dimensionality
    public numInputs: number = 1;
    public numOutputs: number = 1;
    public numContinuousStates: number = 0;
    public numDiscreteStates: number = 0;
    public hasDirectFeedthrough: boolean = true;
    
    constructor(name: string) {
        this.name = name;
    }

    public setParam(name: string, value: any) {
        this.parameters[name] = value;
    }

    public getParam(name: string): any {
        return this.parameters[name];
    }

    // Lifecycle methods
    public setup(): void {
        // Initialize based on parameters
    }

    public getInitialContinuousStates(): number[] {
        return new Array(this.numContinuousStates).fill(0);
    }

    public getInitialDiscreteStates(): number[] {
        return new Array(this.numDiscreteStates).fill(0);
    }

    // Core execution methods
    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        return new Array(this.numOutputs).fill(0);
    }

    public computeDerivatives(t: number, x: number[], u: number[]): number[] {
        return [];
    }

    public updateDiscrete(t: number, xd: number[], u: number[]): number[] {
        return [];
    }
}

// ---- Standard Block Library ----

export class Integrator extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.numContinuousStates = 1;
        this.hasDirectFeedthrough = false;
        this.parameters['InitialCondition'] = 0;
    }

    public getInitialContinuousStates(): number[] {
        return [Number(this.parameters['InitialCondition']) || 0];
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        return [x[0]];
    }

    public computeDerivatives(t: number, x: number[], u: number[]): number[] {
        return [u[0]]; // dx/dt = u
    }
}

export class Gain extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Gain'] = 1;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const k = this.parameters['Gain'] !== undefined ? Number(this.parameters['Gain']) : 1;
        return [u[0] * k];
    }
}

export class Sum extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 2; // Default to 2
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Inputs'] = '++';
    }

    // Normalize the Inputs spec: a number N → N '+' ports; otherwise drop layout spacers
    // like '|' so '+|-' is two ports (+,-), matching Simulink.
    private signSpec(): string {
        const raw = String(this.parameters['Inputs'] ?? '++').trim();
        if (/^\d+$/.test(raw)) return '+'.repeat(Math.max(1, parseInt(raw, 10)));
        const s = raw.replace(/[^+-]/g, '');
        return s.length ? s : '++';
    }

    public setup() {
        this.numInputs = this.signSpec().length;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const signs = this.signSpec();
        let sum = 0;
        for (let i = 0; i < signs.length; i++) {
            sum += (u[i] || 0) * (signs[i] === '-' ? -1 : 1);
        }
        return [sum];
    }
}

export class Constant extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 0;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = false; // Doesn't depend on inputs
        this.parameters['Value'] = 1;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        return [this.parameters['Value'] !== undefined ? Number(this.parameters['Value']) : 1];
    }
}

export class SineWave extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 0;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = false;
        this.parameters['Amplitude'] = 1;
        this.parameters['Frequency'] = 1; // rad/s
        this.parameters['Phase'] = 0;
        this.parameters['Bias'] = 0;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const A = Number(this.parameters['Amplitude']) || 1;
        const w = Number(this.parameters['Frequency']) || 1;
        const phi = Number(this.parameters['Phase']) || 0;
        const bias = Number(this.parameters['Bias']) || 0;
        return [A * Math.sin(w * t + phi) + bias];
    }
}

export class Outport extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 0; // An outport of the model doesn't output to another block
        this.hasDirectFeedthrough = true;
    }
    
    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        return [];
    }
}

export class Inport extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 0;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = false;
    }
    
    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        return []; // Inports will be fed explicitly by the model environment during sim
    }
}

export class Product extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 2; // Default to 2
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Inputs'] = '**';
    }

    public setup() {
        const signs = String(this.parameters['Inputs'] || '**');
        this.numInputs = signs.length;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const signs = String(this.parameters['Inputs'] || '**');
        let prod = 1;
        for (let i = 0; i < this.numInputs; i++) {
            const val = u[i] || 0;
            if (signs[i] === '*') {
                prod *= val;
            } else if (signs[i] === '/') {
                prod /= val;
            }
        }
        return [prod];
    }
}

export class MathFunction extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Operator'] = 'exp';
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const op = String(this.parameters['Operator']).toLowerCase();
        const val = u[0] || 0;
        switch (op) {
            case 'exp': return [Math.exp(val)];
            case 'log': return [Math.log(val)];
            case 'log10': return [Math.log10(val)];
            case 'magnitude': return [Math.abs(val)];
            case 'square': return [val * val];
            case 'sqrt': return [Math.sqrt(val)];
            case 'pow': return [Math.pow(val, u[1] ?? 1)]; // exponent 0 is valid (|| would turn it into 1)
            default: return [val];
        }
    }
    
    public setup() {
        const op = String(this.parameters['Operator']).toLowerCase();
        if (op === 'pow') {
            this.numInputs = 2;
        }
    }
}

export class TrigonometricFunction extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Operator'] = 'sin';
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const op = String(this.parameters['Operator']).toLowerCase();
        const val = u[0] || 0;
        switch (op) {
            case 'sin': return [Math.sin(val)];
            case 'cos': return [Math.cos(val)];
            case 'tan': return [Math.tan(val)];
            case 'asin': return [Math.asin(val)];
            case 'acos': return [Math.acos(val)];
            case 'atan': return [Math.atan(val)];
            case 'atan2': return [Math.atan2(val, u[1] || 0)];
            default: return [Math.sin(val)];
        }
    }

    public setup() {
        const op = String(this.parameters['Operator']).toLowerCase();
        if (op === 'atan2') {
            this.numInputs = 2;
        }
    }
}

export class RelationalOperator extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 2;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Operator'] = '<=';
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const op = String(this.parameters['Operator']);
        const v1 = u[0] || 0;
        const v2 = u[1] || 0;
        let res = false;
        switch (op) {
            case '==': res = v1 === v2; break;
            case '~=': res = v1 !== v2; break;
            case '<': res = v1 < v2; break;
            case '<=': res = v1 <= v2; break;
            case '>': res = v1 > v2; break;
            case '>=': res = v1 >= v2; break;
        }
        return [res ? 1 : 0];
    }
}

export class LogicalOperator extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 2;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Operator'] = 'AND';
    }

    public setup() {
        const op = String(this.parameters['Operator']).toUpperCase();
        if (op === 'NOT') {
            this.numInputs = 1;
        } else {
            this.numInputs = Number(this.parameters['Inputs'] || 2);
        }
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const op = String(this.parameters['Operator']).toUpperCase();
        const bools = u.map(v => v !== 0);
        let res = bools[0];
        
        if (op === 'NOT') {
            return [!res ? 1 : 0];
        }

        // Reduce across ALL inputs first, then negate for NAND/NOR (negating per step
        // is wrong: !(!(A&&B)&&C) ≠ !(A&&B&&C)).
        const reduce = (combine: (a: boolean, b: boolean) => boolean) => { let r = bools[0]; for (let i = 1; i < this.numInputs; i++) r = combine(r, bools[i]); return r; };
        switch (op) {
            case 'AND': res = reduce((a, b) => a && b); break;
            case 'OR': res = reduce((a, b) => a || b); break;
            case 'XOR': res = reduce((a, b) => a !== b); break;
            case 'NAND': res = !reduce((a, b) => a && b); break;
            case 'NOR': res = !reduce((a, b) => a || b); break;
        }
        return [res ? 1 : 0];
    }
}

export class Switch extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 3;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Criteria'] = 'u2 >= Threshold';
        this.parameters['Threshold'] = 0;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const criteria = String(this.parameters['Criteria']);
        const threshold = Number(this.parameters['Threshold']) || 0;
        
        const u1 = u[0] || 0;
        const u2 = u[1] || 0;
        const u3 = u[2] || 0;

        let condition = false;
        if (criteria === 'u2 >= Threshold') condition = u2 >= threshold;
        else if (criteria === 'u2 > Threshold') condition = u2 > threshold;
        else if (criteria === 'u2 ~= 0') condition = u2 !== 0;

        return [condition ? u1 : u3];
    }
}

export class Step extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 0;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = false;
        this.parameters['Time'] = 1;
        this.parameters['Before'] = 0;
        this.parameters['After'] = 1;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const stepTime = this.parameters['Time'] !== undefined ? Number(this.parameters['Time']) : 1;
        const initialValue = this.parameters['Before'] !== undefined ? Number(this.parameters['Before']) : 0;
        const finalValue = this.parameters['After'] !== undefined ? Number(this.parameters['After']) : 1;
        return [t >= stepTime ? finalValue : initialValue];
    }
}

export class Clock extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 0;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = false;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        return [t];
    }
}

export class ToWorkspace extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 0;
        this.hasDirectFeedthrough = true;
        this.parameters['VariableName'] = 'simout';
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        // In a full implementation, this pushes values directly to the interp.ts scope.
        // For our headless test, we just do nothing as the Solver handles output logging.
        return [];
    }
}

export class StopSimulation extends Block {
    // This requires a minor callback hook to the solver, but we'll mock it for now
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 0;
        this.hasDirectFeedthrough = true;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        if (u[0] && u[0] !== 0) {
            // Signal solver to stop
            (this as any)._stopRequested = true;
        }
        return [];
    }
}

// ---- Phase 3: Continuous & Discrete ----

export class StateSpace extends Block {
    private A: number[][] = [[0]];
    private B: number[][] = [[0]];
    private C: number[][] = [[0]];
    private D: number[][] = [[0]];

    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.numContinuousStates = 1;
        this.hasDirectFeedthrough = false; // D is zero by default
        this.parameters['A'] = [[0]];
        this.parameters['B'] = [[0]];
        this.parameters['C'] = [[0]];
        this.parameters['D'] = [[0]];
        this.parameters['InitialCondition'] = [0];
    }

    public setup() {
        this.A = this.parameters['A'];
        this.B = this.parameters['B'];
        this.C = this.parameters['C'];
        this.D = this.parameters['D'];
        this.numContinuousStates = this.A.length;
        this.numInputs = this.B[0].length;
        this.numOutputs = this.C.length;
        
        // If D is strictly zero, no direct feedthrough
        let hasD = false;
        for (let r = 0; r < this.D.length; r++) {
            for (let c = 0; c < this.D[0].length; c++) {
                if (this.D[r][c] !== 0) hasD = true;
            }
        }
        this.hasDirectFeedthrough = hasD;
    }

    public getInitialContinuousStates(): number[] {
        const ic = this.parameters['InitialCondition'];
        if (Array.isArray(ic)) return [...ic];
        return new Array(this.numContinuousStates).fill(Number(ic) || 0);
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const y = new Array(this.numOutputs).fill(0);
        for (let i = 0; i < this.numOutputs; i++) {
            let sum = 0;
            for (let j = 0; j < this.numContinuousStates; j++) sum += this.C[i][j] * x[j];
            for (let j = 0; j < this.numInputs; j++) sum += this.D[i][j] * u[j];
            y[i] = sum;
        }
        return y;
    }

    public computeDerivatives(t: number, x: number[], u: number[]): number[] {
        const dx = new Array(this.numContinuousStates).fill(0);
        for (let i = 0; i < this.numContinuousStates; i++) {
            let sum = 0;
            for (let j = 0; j < this.numContinuousStates; j++) sum += this.A[i][j] * x[j];
            for (let j = 0; j < this.numInputs; j++) sum += this.B[i][j] * u[j];
            dx[i] = sum;
        }
        return dx;
    }
}

export class Derivative extends Block {
    private lastU: number = 0;
    private lastT: number = -1;

    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
    }

    public setup() {
        this.lastT = -1;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        if (this.lastT < 0 || t === this.lastT) {
            this.lastU = u[0] || 0;
            this.lastT = t;
            return [0];
        }
        const dt = t - this.lastT;
        const du = (u[0] || 0) - this.lastU;
        
        // Only update on step, assuming outputs are called once per step per solver design
        this.lastU = u[0] || 0;
        this.lastT = t;
        
        return [du / dt];
    }
}

export class UnitDelay extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.numDiscreteStates = 1;
        this.hasDirectFeedthrough = false;
        this.parameters['InitialCondition'] = 0;
    }

    public getInitialDiscreteStates(): number[] {
        return [Number(this.parameters['InitialCondition']) || 0];
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        return [xd[0]];
    }

    public updateDiscrete(t: number, xd: number[], u: number[]): number[] {
        return [u[0]];
    }
}

export class DiscreteIntegrator extends Block {
    private lastT: number = -1;

    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.numDiscreteStates = 1;
        this.hasDirectFeedthrough = false;
        this.parameters['InitialCondition'] = 0;
    }

    public getInitialDiscreteStates(): number[] {
        return [Number(this.parameters['InitialCondition']) || 0];
    }

    public setup() {
        this.lastT = -1;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        return [xd[0]];
    }

    public updateDiscrete(t: number, xd: number[], u: number[]): number[] {
        if (this.lastT < 0) {
            this.lastT = t;
            return [xd[0]];
        }
        const dt = t - this.lastT;
        this.lastT = t;
        return [xd[0] + u[0] * dt]; // Forward Euler
    }
}

export class ZeroOrderHold extends Block {
    private nextSampleTime: number = 0;

    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.numDiscreteStates = 1;
        this.hasDirectFeedthrough = false;
        this.parameters['SampleTime'] = 1;
    }

    public setup() {
        this.nextSampleTime = 0;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        return [xd[0]];
    }

    public updateDiscrete(t: number, xd: number[], u: number[]): number[] {
        const Ts = this.parameters['SampleTime'] !== undefined ? Number(this.parameters['SampleTime']) : 1;
        if (t >= this.nextSampleTime - 1e-9) {
            this.nextSampleTime += Ts;
            return [u[0]];
        }
        return [xd[0]];
    }
}

export class Mux extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 2; // Default
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Inputs'] = 2;
    }

    public setup() {
        this.numInputs = Number(this.parameters['Inputs']) || 2;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        // Single output port carrying ALL inputs as one vector (bus) signal. Flattens any
        // already-vector inputs so a Mux of muxes still yields a flat bus.
        const bus: number[] = [];
        for (const v of u) { if (Array.isArray(v)) bus.push(...(v as number[])); else bus.push(v); }
        return [bus as unknown as number];   // port value is the vector (see Demux / Outport logging)
    }
}

export class Demux extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 2; // Default
        this.hasDirectFeedthrough = true;
        this.parameters['Outputs'] = 2;
    }

    public setup() {
        this.numOutputs = Number(this.parameters['Outputs']) || 2;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        // Split the incoming bus (a vector on a single port) into scalar outputs.
        // Falls back to treating the input ports themselves as the elements (scalar wiring).
        const bus = (Array.isArray(u[0]) ? u[0] : u) as unknown as number[];
        // A genuine bus whose width doesn't match the Demux is a dimension error (Simulink would error),
        // not a silent zero-pad.
        if (Array.isArray(u[0]) && bus.length !== this.numOutputs) throw new Error(`Demux '${this.name}': input width ${bus.length} does not match the ${this.numOutputs} outputs`);
        const y = new Array(this.numOutputs).fill(0);
        for (let i = 0; i < this.numOutputs; i++) if (i < bus.length) y[i] = bus[i];
        return y;
    }
}

// ---- Phase 5: Non-linear & Sources ----

export class Saturation extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['UpperLimit'] = 1;
        this.parameters['LowerLimit'] = -1;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const up = Number(this.parameters['UpperLimit']);
        const low = Number(this.parameters['LowerLimit']);
        let val = u[0] || 0;
        if (val > up) val = up;
        if (val < low) val = low;
        return [val];
    }
}

export class DeadZone extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['UpperValue'] = 1;
        this.parameters['LowerValue'] = -1;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const up = Number(this.parameters['UpperValue']);
        const low = Number(this.parameters['LowerValue']);
        let val = u[0] || 0;
        if (val > up) return [val - up];
        if (val < low) return [val - low];
        return [0];
    }
}

export class RateLimiter extends Block {
    private lastT: number = -1;
    private lastOut: number = 0;

    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['RisingSlewLimit'] = 1;
        this.parameters['FallingSlewLimit'] = -1;
    }

    public setup() {
        this.lastT = -1;
        this.lastOut = 0;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const val = u[0] || 0;
        if (this.lastT < 0 || t === this.lastT) {
            this.lastT = t;
            this.lastOut = val;
            return [val];
        }
        
        const dt = t - this.lastT;
        const riseLimit = Number(this.parameters['RisingSlewLimit']);
        const fallLimit = Number(this.parameters['FallingSlewLimit']);
        
        let rate = (val - this.lastOut) / dt;
        if (rate > riseLimit) rate = riseLimit;
        if (rate < fallLimit) rate = fallLimit;
        
        const out = this.lastOut + rate * dt;
        this.lastOut = out;
        this.lastT = t;
        
        return [out];
    }
}

export class LookupTable1D extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Breakpoints'] = [0, 1];
        this.parameters['TableData'] = [0, 1];
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const bp: number[] = this.parameters['Breakpoints'];
        const tb: number[] = this.parameters['TableData'];
        const val = u[0] || 0;

        if (!Array.isArray(bp) || !Array.isArray(tb) || bp.length !== tb.length || bp.length < 2) return [0]; // Invalid

        if (val <= bp[0]) return [tb[0]];
        if (val >= bp[bp.length - 1]) return [tb[tb.length - 1]];

        // Linear interpolation
        for (let i = 0; i < bp.length - 1; i++) {
            if (val >= bp[i] && val <= bp[i+1]) {
                const fraction = (val - bp[i]) / (bp[i+1] - bp[i]);
                return [tb[i] + fraction * (tb[i+1] - tb[i])];
            }
        }
        return [0];
    }
}

export class PulseGenerator extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 0;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = false;
        this.parameters['Amplitude'] = 1;
        this.parameters['Period'] = 2; // seconds
        this.parameters['PulseWidth'] = 50; // % of period
        this.parameters['PhaseDelay'] = 0; // seconds
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const A = Number(this.parameters['Amplitude']);
        const P = Number(this.parameters['Period']);
        const W = Number(this.parameters['PulseWidth']) / 100.0;
        const D = Number(this.parameters['PhaseDelay']);

        const modT = (t - D) % P;
        if (modT < 0) {
            // Before phase delay starts
            return [0];
        }

        if (modT < P * W) return [A];
        return [0];
    }
}

export class Ramp extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 0;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = false;
        this.parameters['Slope'] = 1;
        this.parameters['StartTime'] = 0;
        this.parameters['InitialOutput'] = 0;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const slope = Number(this.parameters['Slope']);
        const start = Number(this.parameters['StartTime']);
        const init = Number(this.parameters['InitialOutput']);

        if (t < start) return [init];
        return [init + slope * (t - start)];
    }
}

// ---- Phase 6: Controls & Advanced Math ----

export class Abs extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        return [Math.abs(u[0] || 0)];
    }
}

export class Sign extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const val = u[0] || 0;
        if (val > 0) return [1];
        if (val < 0) return [-1];
        return [0];
    }
}

export class MinMax extends Block {
    constructor(name: string) {
        super(name);
        this.numInputs = 2; // configurable
        this.numOutputs = 1;
        this.hasDirectFeedthrough = true;
        this.parameters['Function'] = 'min';
        this.parameters['Inputs'] = 2;
    }

    public setup() {
        this.numInputs = Number(this.parameters['Inputs']) || 2;
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const func = String(this.parameters['Function']).toLowerCase();
        let res = u[0] || 0;
        for (let i = 1; i < this.numInputs; i++) {
            const val = u[i] || 0;
            if (func === 'min') {
                if (val < res) res = val;
            } else if (func === 'max') {
                if (val > res) res = val;
            }
        }
        return [res];
    }
}

export class Scope extends Block {
    public data: { t: number, val: number[] }[] = [];

    constructor(name: string) {
        super(name);
        this.numInputs = 1; // Can be configured
        this.numOutputs = 0;
        this.hasDirectFeedthrough = true;
        this.parameters['Inputs'] = 1;
    }

    public setup() {
        this.numInputs = Number(this.parameters['Inputs']) || 1;
        this.data = [];
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        this.data.push({ t, val: [...u] });
        return [];
    }
}

export class PIDController extends Block {
    private lastU: number = 0;
    private lastT: number = -1;

    constructor(name: string) {
        super(name);
        this.numInputs = 1;
        this.numOutputs = 1;
        this.numContinuousStates = 1; // Integrator state
        this.hasDirectFeedthrough = true;
        this.parameters['P'] = 1;
        this.parameters['I'] = 1;
        this.parameters['D'] = 0;
    }

    public setup() {
        this.lastT = -1;
        this.lastU = 0;
    }

    public getInitialContinuousStates(): number[] {
        return [0];
    }

    public computeDerivatives(t: number, x: number[], u: number[]): number[] {
        const I = Number(this.parameters['I']) || 0;
        return [I * (u[0] || 0)];
    }

    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        const P = Number(this.parameters['P']) || 0;
        const D = Number(this.parameters['D']) || 0;
        const val = u[0] || 0;

        let deriv = 0;
        if (this.lastT >= 0 && t > this.lastT) {
            deriv = (val - this.lastU) / (t - this.lastT);
        }

        // Only update memory on actual timestep progression (approximation for explicit solver)
        if (this.lastT < 0 || t > this.lastT) {
            this.lastU = val;
            this.lastT = t;
        }

        const out = P * val + x[0] + D * deriv;
        return [out];
    }
}

export class TransferFcn extends StateSpace {
    constructor(name: string) {
        super(name);
        this.parameters['Numerator'] = [1];
        this.parameters['Denominator'] = [1, 1];
    }

    public setup() {
        let num: number[] = this.parameters['Numerator'];
        let den: number[] = this.parameters['Denominator'];

        if (!Array.isArray(num)) num = [Number(num) || 0];
        if (!Array.isArray(den)) den = [Number(den) || 1];

        // Normalize denominator so a0 = 1
        const a0 = den[0] || 1;
        den = den.map(v => v / a0);
        num = num.map(v => v / a0);

        const n = den.length - 1; // Order of denominator

        // Pad numerator to match length of den
        const b = new Array(n + 1).fill(0);
        for (let i = 0; i < num.length; i++) {
            b[n - num.length + 1 + i] = num[i];
        }

        if (n === 0) {
            // 0th order TF: y = b0 * u
            this.parameters['A'] = [[0]];
            this.parameters['B'] = [[0]];
            this.parameters['C'] = [[0]];
            this.parameters['D'] = [[b[0]]];
        } else {
            // Controllable Canonical Form
            const A = Array.from({length: n}, () => new Array(n).fill(0));
            const B = Array.from({length: n}, () => [0]);
            const C = [new Array(n).fill(0)];
            const D = [[b[0]]];

            // Top row of A: -a1, -a2, ...
            for (let i = 0; i < n; i++) {
                A[0][i] = -den[i + 1];
            }
            // Subdiagonal of 1s
            for (let i = 1; i < n; i++) {
                A[i][i - 1] = 1;
            }

            B[0][0] = 1;

            for (let i = 0; i < n; i++) {
                C[0][i] = b[i + 1] - b[0] * den[i + 1];
            }

            this.parameters['A'] = A;
            this.parameters['B'] = B;
            this.parameters['C'] = C;
            this.parameters['D'] = D;
            this.parameters['InitialCondition'] = new Array(n).fill(0);
        }

        super.setup();
    }
}

// ════════════════════════════════════════════════════════════════════════════════════
// model.ts
// ════════════════════════════════════════════════════════════════════════════════════
export interface Line {
    srcBlock: string;
    srcPort: number; // 0-indexed
    destBlock: string;
    destPort: number; // 0-indexed
}

export class Model {
    public name: string;
    public blocks: Map<string, Block> = new Map();
    public lines: Line[] = [];

    constructor(name: string) {
        this.name = name;
    }

    public addBlock(block: Block): void {
        this.blocks.set(block.name, block);
    }

    public addLine(srcBlock: string, srcPort: number, destBlock: string, destPort: number): void {
        this.lines.push({ srcBlock, srcPort, destBlock, destPort });
    }

    public getBlock(name: string): Block | undefined {
        return this.blocks.get(name);
    }

    /**
     * Initializes all blocks.
     */
    public setup(): void {
        for (const block of this.blocks.values()) {
            block.setup();
        }
    }

    /**
     * Topologically sorts blocks based on direct feedthrough dependencies.
     * Blocks without direct feedthrough break algebraic loops.
     */
    public getExecutionOrder(): Block[] {
        const order: Block[] = [];
        const visited = new Set<string>();
        const tempMark = new Set<string>();

        // Build dependency graph
        // A depends on B if A has direct feedthrough and there is a line B -> A.
        const dependencies = new Map<string, string[]>();
        for (const block of this.blocks.values()) {
            dependencies.set(block.name, []);
        }

        for (const line of this.lines) {
            const destBlock = this.blocks.get(line.destBlock);
            if (destBlock && destBlock.hasDirectFeedthrough) {
                dependencies.get(line.destBlock)?.push(line.srcBlock);
            }
        }

        const visit = (nodeName: string) => {
            if (visited.has(nodeName)) return;
            if (tempMark.has(nodeName)) {
                throw new Error(`Algebraic loop detected involving block: ${nodeName}`);
            }

            tempMark.add(nodeName);
            const deps = dependencies.get(nodeName) || [];
            for (const dep of deps) {
                visit(dep);
            }
            tempMark.delete(nodeName);
            visited.add(nodeName);
            const b = this.blocks.get(nodeName);
            if (b) order.push(b);
        };

        for (const block of this.blocks.values()) {
            if (!visited.has(block.name)) {
                visit(block.name);
            }
        }

        return order;
    }
}

// ════════════════════════════════════════════════════════════════════════════════════
// solver.ts
// ════════════════════════════════════════════════════════════════════════════════════
export interface SimOptions {
    t0?: number;
    tf?: number;
    stepSize?: number;
}

export interface SimResult {
    tout: number[];
    yout: number[][]; // N_steps x N_outports (if Outports are collected)
}

export class Solver {
    private model: Model;
    private options: SimOptions;

    constructor(model: Model, options: SimOptions = {}) {
        this.model = model;
        this.options = {
            t0: options.t0 !== undefined ? options.t0 : 0.0,
            tf: options.tf !== undefined ? options.tf : 10.0,
            stepSize: options.stepSize !== undefined ? options.stepSize : 0.1,
        };
    }

    public simulate(): SimResult {
        this.model.setup();
        const execOrder = this.model.getExecutionOrder();

        let t = this.options.t0!;
        const tf = this.options.tf!;
        const dt = this.options.stepSize!;

        const tout: number[] = [];
        const yout: number[][] = []; // For simplicity, we can log blocks named "Outport" or just block outputs
        const outportBlocks = Array.from(this.model.blocks.values()).filter(b => b.constructor.name === 'Outport' || b.name.startsWith('Out'));

        // Initialize states
        const contStates = new Map<string, number[]>();
        const discStates = new Map<string, number[]>();
        
        for (const block of this.model.blocks.values()) {
            contStates.set(block.name, block.getInitialContinuousStates());
            discStates.set(block.name, block.getInitialDiscreteStates());
        }

        // Output buffer
        const blockOutputs = new Map<string, number[]>();

        while (t <= tf + 1e-9) {
            tout.push(t);

            // Step 1: Compute outputs in execution order
            for (const block of execOrder) {
                // Gather inputs
                const u = new Array(block.numInputs).fill(0);
                
                for (const line of this.model.lines) {
                    if (line.destBlock === block.name) {
                        const srcOuts = blockOutputs.get(line.srcBlock);
                        if (srcOuts && line.srcPort < srcOuts.length) {
                            u[line.destPort] = srcOuts[line.srcPort];
                        }
                    }
                }

                const x = contStates.get(block.name)!;
                const xd = discStates.get(block.name)!;
                // Vector (bus) propagation: a STATELESS block fed an array on any input is applied
                // element-wise (scalars broadcast), so Gain/Sum/Product/Math/… work on buses.
                // Mux/Demux handle buses themselves; stateful blocks keep scalar semantics.
                const busW = u.reduce((w: number, v: unknown) => Array.isArray(v) ? Math.max(w, v.length) : w, 0);
                let y: number[];
                if (busW > 0 && x.length === 0 && xd.length === 0 && !(block instanceof Mux) && !(block instanceof Demux)) {
                    const perElem: number[][] = [];
                    for (let e = 0; e < busW; e++) { const ue = u.map((v) => Array.isArray(v) ? (v[e] ?? 0) : v); perElem.push(block.computeOutputs(t, x, xd, ue as number[])); }
                    const nOut = perElem[0]?.length ?? 0;
                    y = []; for (let p = 0; p < nOut; p++) (y as unknown as unknown[])[p] = perElem.map((o) => o[p]);
                } else {
                    y = block.computeOutputs(t, x, xd, u);
                }
                blockOutputs.set(block.name, y);
            }

            // Log outputs if Outports exist
            // If no Outports, we could log states, but let's log the first output of Outport blocks
            const currentY: number[] = [];
            for (const outBlock of outportBlocks) {
                 // The Outport itself doesn't output anything, but its input is what we want to log
                 // Let's find what is connected to its input port 0
                 for (const line of this.model.lines) {
                     if (line.destBlock === outBlock.name && line.destPort === 0) {
                         const srcOuts = blockOutputs.get(line.srcBlock);
                         if (srcOuts && line.srcPort < srcOuts.length) {
                             const val = srcOuts[line.srcPort] as unknown;   // a bus value is an array → log each element
                             if (Array.isArray(val)) for (const e of val) currentY.push(e as number); else currentY.push(val as number);
                         }
                     }
                 }
            }
            yout.push(currentY);

            // Honour a StopSimulation block: stop after logging the triggering step.
            let stop = false;
            for (const b of this.model.blocks.values()) if ((b as unknown as { _stopRequested?: boolean })._stopRequested) { stop = true; break; }
            if (stop) break;

            // Step 2: Compute derivatives and discrete updates
            const derivatives = new Map<string, number[]>();
            const nextDiscStates = new Map<string, number[]>();

            for (const block of this.model.blocks.values()) {
                const u = new Array(block.numInputs).fill(0);
                for (const line of this.model.lines) {
                    if (line.destBlock === block.name) {
                        const srcOuts = blockOutputs.get(line.srcBlock);
                        if (srcOuts && line.srcPort < srcOuts.length) {
                            u[line.destPort] = srcOuts[line.srcPort];
                        }
                    }
                }

                const x = contStates.get(block.name)!;
                const xd = discStates.get(block.name)!;

                derivatives.set(block.name, block.computeDerivatives(t, x, u));
                nextDiscStates.set(block.name, block.updateDiscrete(t, xd, u));
            }

            // Step 3: Advance states (Euler Integration)
            for (const block of this.model.blocks.values()) {
                const x = contStates.get(block.name)!;
                const dx = derivatives.get(block.name)!;
                for (let i = 0; i < x.length; i++) {
                    x[i] = x[i] + dt * dx[i];
                }
                
                const xd = nextDiscStates.get(block.name)!;
                if (xd.length > 0) {
                    discStates.set(block.name, xd);
                }
            }

            t += dt;
        }

        return { tout, yout };
    }
}

// ════════════════════════════════════════════════════════════════════════════════════
// subsystem.ts
// ════════════════════════════════════════════════════════════════════════════════════
export class Subsystem extends Block {
    public internalModel: Model;
    private execOrder: Block[] = [];
    private contStates: Map<string, number[]> = new Map();
    private discStates: Map<string, number[]> = new Map();
    private blockOutputs: Map<string, number[]> = new Map();

    constructor(name: string, internalModel: Model) {
        super(name);
        this.internalModel = internalModel;
        this.hasDirectFeedthrough = true; // Conservative assumption
        
        // Count inputs and outputs based on Inport/Outport blocks
        let inports = 0;
        let outports = 0;
        for (const b of this.internalModel.blocks.values()) {
            if (b.constructor.name === 'Inport') inports++;
            if (b.constructor.name === 'Outport') outports++;
        }
        this.numInputs = inports;
        this.numOutputs = outports;
    }

    public setup() {
        this.internalModel.setup();
        this.execOrder = this.internalModel.getExecutionOrder();

        // Calculate total states
        this.numContinuousStates = 0;
        this.numDiscreteStates = 0;
        for (const b of this.internalModel.blocks.values()) {
            this.numContinuousStates += b.numContinuousStates;
            this.numDiscreteStates += b.numDiscreteStates;
        }

        // We don't map internal states to parent states in this simplified version.
        // Instead, the Subsystem block keeps its own Map of states, and we just 
        // return an empty array to the parent solver so it doesn't try to integrate them directly.
        // Wait! If the parent solver doesn't integrate them, they won't change.
        // So we must flatten the state arrays.
    }

    // A full non-virtual subsystem implementation requires mapping the flat state array
    // back to the internal blocks, then calling their computeDerivatives, and mapping back.
    // Given the complexity for a headless prototype, we will just stub this for now.
    public computeOutputs(t: number, x: number[], xd: number[], u: number[]): number[] {
        // Evaluate the internal model using the inputs
        // ... omitted for brevity ...
        return new Array(this.numOutputs).fill(0);
    }
}

// ════════════════════════════════════════════════════════════════════════════════════
// api.ts
// ════════════════════════════════════════════════════════════════════════════════════
// Global store of models in memory
const systems = new Map<string, Model>();

export function new_system(name: string): void {
    if (systems.has(name)) {
        throw new Error(`A system named '${name}' already exists.`);
    }
    systems.set(name, new Model(name));
}

// Simulink usually takes path 'model/blockname'
function parsePath(path: string): { sysName: string, blockName: string } {
    const parts = path.split('/');
    if (parts.length < 2) throw new Error(`Invalid block path: ${path}`);
    const sysName = parts[0];
    const blockName = parts.slice(1).join('/');
    return { sysName, blockName };
}

export function add_block(type: string, destPath: string): void {
    const { sysName, blockName } = parsePath(destPath);
    const sys = systems.get(sysName);
    if (!sys) throw new Error(`System '${sysName}' not found.`);

    let block: Block;
    // For now we map some hardcoded strings to classes. In a full system this is a registry.
    const lowerType = type.toLowerCase();
    if (lowerType.includes('discreteintegrator')) block = new DiscreteIntegrator(blockName);
    else if (lowerType.includes('integrator')) block = new Integrator(blockName);
    else if (lowerType.includes('gain')) block = new Gain(blockName);
    else if (lowerType.includes('sum')) block = new Sum(blockName);
    else if (lowerType.includes('constant')) block = new Constant(blockName);
    else if (lowerType.includes('sinewave') || lowerType === 'sin') block = new SineWave(blockName);
    else if (lowerType.includes('outport')) block = new Outport(blockName);
    else if (lowerType.includes('inport')) block = new Inport(blockName);
    else if (lowerType.includes('product')) block = new Product(blockName);
    else if (lowerType.includes('mathfunction')) block = new MathFunction(blockName);
    else if (lowerType.includes('trigonometricfunction')) block = new TrigonometricFunction(blockName);
    else if (lowerType.includes('relationaloperator')) block = new RelationalOperator(blockName);
    else if (lowerType.includes('logicaloperator')) block = new LogicalOperator(blockName);
    else if (lowerType.includes('switch')) block = new Switch(blockName);
    else if (lowerType.includes('step')) block = new Step(blockName);
    else if (lowerType.includes('clock')) block = new Clock(blockName);
    else if (lowerType.includes('toworkspace')) block = new ToWorkspace(blockName);
    else if (lowerType.includes('stopsimulation')) block = new StopSimulation(blockName);
    else if (lowerType.includes('statespace')) block = new StateSpace(blockName);
    else if (lowerType.includes('derivative')) block = new Derivative(blockName);
    else if (lowerType.includes('unitdelay')) block = new UnitDelay(blockName);
    else if (lowerType.includes('zeroorderhold')) block = new ZeroOrderHold(blockName);
    else if (lowerType.includes('mux')) block = new Mux(blockName);
    else if (lowerType.includes('demux')) block = new Demux(blockName);
    else if (lowerType.includes('saturation')) block = new Saturation(blockName);
    else if (lowerType.includes('deadzone')) block = new DeadZone(blockName);
    else if (lowerType.includes('ratelimiter')) block = new RateLimiter(blockName);
    else if (lowerType.includes('lookuptable1d')) block = new LookupTable1D(blockName);
    else if (lowerType.includes('pulsegenerator')) block = new PulseGenerator(blockName);
    else if (lowerType.includes('ramp')) block = new Ramp(blockName);
    else if (lowerType.includes('abs')) block = new Abs(blockName);
    else if (lowerType.includes('sign')) block = new Sign(blockName);
    else if (lowerType.includes('minmax')) block = new MinMax(blockName);
    else if (lowerType.includes('scope')) block = new Scope(blockName);
    else if (lowerType.includes('pidcontroller')) block = new PIDController(blockName);
    else if (lowerType.includes('transferfcn')) block = new TransferFcn(blockName);
    else throw new Error(`Unknown block type: ${type}`);

    sys.addBlock(block);
}

// add_line('model', 'srcBlock/1', 'destBlock/1')
export function add_line(sysName: string, srcPortStr: string, destPortStr: string): void {
    const sys = systems.get(sysName);
    if (!sys) throw new Error(`System '${sysName}' not found.`);

    const srcParts = srcPortStr.split('/');
    const destParts = destPortStr.split('/');
    
    const srcBlock = srcParts.slice(0, -1).join('/');
    const srcPort = parseInt(srcParts[srcParts.length - 1], 10) - 1; // 1-indexed in MATLAB to 0-indexed internally

    const destBlock = destParts.slice(0, -1).join('/');
    const destPort = parseInt(destParts[destParts.length - 1], 10) - 1;

    sys.addLine(srcBlock, srcPort, destBlock, destPort);
}

export function set_param(path: string, param: string, value: any): void {
    const { sysName, blockName } = parsePath(path);
    const sys = systems.get(sysName);
    if (!sys) throw new Error(`System '${sysName}' not found.`);

    const block = sys.getBlock(blockName);
    if (!block) throw new Error(`Block '${blockName}' not found in system '${sysName}'.`);

    block.setParam(param, value);
}

export function get_param(path: string, param: string): any {
    const { sysName, blockName } = parsePath(path);
    const sys = systems.get(sysName);
    if (!sys) throw new Error(`System '${sysName}' not found.`);

    const block = sys.getBlock(blockName);
    if (!block) throw new Error(`Block '${blockName}' not found in system '${sysName}'.`);

    return block.getParam(param);
}

export function sim(sysName: string, options: SimOptions = {}): SimResult {
    const sys = systems.get(sysName);
    if (!sys) throw new Error(`System '${sysName}' not found.`);

    const solver = new Solver(sys, options);
    return solver.simulate();
}

