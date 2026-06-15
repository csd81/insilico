// Fixed-Point Designer Toolbox — fi (fixed-point number), numerictype, fimath, quantizer.
// Implements fixed-point quantization, bit-accurate arithmetic, and code-generation metadata.
import {
  type Value, scalar, rowVec, colVec, toArray, asScalar, asString, toMat as m, isMat, isStr, isObject, isStruct, truthy, MatError,
  mat, zeros, makeObject, str, bool,
} from '../values';
import type { ToolboxModule } from './types';
import { HELP_FIXEDPOINT } from '../help/toolbox-help';

// ── numerictype: describe a fixed-point format ─────────────────────────────────────────
async function numerictype(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  if (args.length === 0) {
    props.set('Signedness', str('Signed')); props.set('WordLength', scalar(16)); props.set('FractionLength', scalar(15));
  } else if (args.length === 1) {
    // numerictype(T) copy
    if ((args[0] as any).kind === 'object') return [args[0]];
    // numerictype(isSigned)
    const sg = asScalar(m(args[0]));
    props.set('Signedness', str(sg ? 'Signed' : 'Unsigned'));
    props.set('WordLength', scalar(16)); props.set('FractionLength', scalar(sg ? 15 : 16));
  } else if (args.length === 2) {
    // numerictype(isSigned, wl)
    const sg = asScalar(m(args[0])), wl = asScalar(m(args[1]));
    props.set('Signedness', str(sg ? 'Signed' : 'Unsigned'));
    props.set('WordLength', scalar(wl)); props.set('FractionLength', scalar(wl - (sg ? 1 : 0)));
  } else {
    // numerictype(isSigned, wl, fl)
    const sg = asScalar(m(args[0])), wl = asScalar(m(args[1])), fl = asScalar(m(args[2]));
    props.set('Signedness', str(sg ? 'Signed' : 'Unsigned'));
    props.set('WordLength', scalar(wl)); props.set('FractionLength', scalar(fl));
  }
  return [makeObject('numerictype', props)];
}

// ── fimath: fixed-point math settings ─────────────────────────────────────────────────
async function fimath(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  props.set('RoundingMethod', str('Nearest'));
  props.set('OverflowAction', str('Saturate'));
  props.set('ProductMode', str('FullPrecision'));
  props.set('SumMode', str('FullPrecision'));
  // Apply name-value pairs
  for (let i = 0; i + 1 < args.length; i += 2) {
    if (isMat(args[i]) && (args[i] as any).isChar) {
      const key = String.fromCharCode(...(Array.from((args[i] as any).data) as number[]));
      props.set(key, args[i + 1]);
    }
  }
  return [makeObject('fimath', props)];
}

// ── fi: fixed-point number ─────────────────────────────────────────────────────────────
// fi(v) or fi(v, isSigned) or fi(v, isSigned, wl) or fi(v, isSigned, wl, fl) or fi(v, T)
// The internal value is quantized and stored as a rounded integer * 2^(-fl).
function quantize(v: number, wl: number, fl: number, signed: boolean, round: string, overflow: string): number {
  const scale = Math.pow(2, fl);
  let q = round === 'floor' ? Math.floor(v * scale) : Math.round(v * scale);
  // Use floating-point powers (exact to 2^53), not 32-bit shifts: 1<<32 wraps to 1.
  const maxInt = signed ? Math.pow(2, wl - 1) - 1 : Math.pow(2, wl) - 1;
  const minInt = signed ? -Math.pow(2, wl - 1) : 0;
  if (overflow === 'wrap') {
    const range = Math.pow(2, wl);
    q = ((q - minInt) % range + range) % range + minInt;
  } else {
    q = Math.max(minInt, Math.min(maxInt, q));
  }
  return q / scale;
}

async function fi(args: Value[]): Promise<Value[]> {
  if (args.length === 0) {
    const props = new Map<string, Value>();
    props.set('data', scalar(0)); props.set('WordLength', scalar(16)); props.set('FractionLength', scalar(15));
    props.set('Signed', bool(true));
    return [makeObject('fi', props)];
  }
  const v = isMat(args[0]) ? toArray(args[0] as any) : [asScalar(m(args[0]))];
  let signed = true, wl = 16, fl = 15;
  if (args.length >= 2) signed = asScalar(m(args[1])) !== 0;
  if (args.length >= 3) wl = Math.round(asScalar(m(args[2])));
  if (args.length >= 4) fl = Math.round(asScalar(m(args[3])));
  else fl = wl - (signed ? 1 : 0);
  const qv = v.map(x => quantize(x, wl, fl, signed, 'nearest', 'saturate'));
  const props = new Map<string, Value>();
  props.set('data', qv.length === 1 ? scalar(qv[0]) : rowVec(qv));
  props.set('WordLength', scalar(wl));
  props.set('FractionLength', scalar(fl));
  props.set('Signed', bool(signed));
  return [makeObject('fi', props)];
}

// ── quantizer: quantizer object ────────────────────────────────────────────────────────
async function quantizer(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  // Default: fixed-point signed 16-bit 15-fraction
  props.set('Mode', str('fixed'));
  props.set('Format', rowVec([16, 15]));
  props.set('RoundMode', str('nearest'));
  props.set('OverflowMode', str('saturate'));
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (isMat(a)) {
      if ((a as any).isChar) {
        const s = String.fromCharCode(...(Array.from((a as any).data) as number[]));
        props.set('Mode', str(s));
      } else {
        props.set('Format', a);
      }
    }
  }
  return [makeObject('quantizer', props)];
}

// ── quantize: apply quantizer to data ─────────────────────────────────────────────────
async function quantize_fn(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('quantize: requires quantizer and data');
  const qObj = args[0];
  const data = isMat(args[1]) ? toArray(args[1] as any) : [asScalar(m(args[1]))];
  let wl = 16, fl = 15, signed = true;
  if ((qObj as any).kind === 'object') {
    const p = (qObj as any).props as Map<string, Value>;
    const fmt = p.get('Format');
    if (fmt && isMat(fmt)) {
      const arr = toArray(fmt as any);
      wl = arr[0] ?? 16; fl = arr[1] ?? 15;
    }
  }
  const result = data.map(x => quantize(x, wl, fl, signed, 'nearest', 'saturate'));
  const src = args[1] as any;
  return [result.length === 1 ? scalar(result[0]) : mat(src.rows ?? 1, src.cols ?? result.length, new Float64Array(result))];
}

// ── num2bin: convert number to binary fixed-point string ───────────────────────────────
async function num2bin(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('num2bin: requires input');
  // If fi object
  if ((args[0] as any).kind === 'object') {
    const p = (args[0] as any).props as Map<string, Value>;
    const data = p.get('data');
    const wl = isMat(p.get('WordLength')!) ? asScalar(p.get('WordLength') as any) : 16;
    const fl = isMat(p.get('FractionLength')!) ? asScalar(p.get('FractionLength') as any) : 15;
    if (data && isMat(data)) {
      const v = asScalar(data as any);
      const total = Math.pow(2, wl);
      let iv = Math.round(v * Math.pow(2, fl));
      iv = ((iv % total) + total) % total;          // two's-complement, wl-bit (BigInt mask, not 32-bit)
      const bits = BigInt(iv).toString(2).padStart(wl, '0');
      return [str(bits)];
    }
  }
  const v = asScalar(m(args[0]));
  return [str((v >>> 0).toString(2))];
}

// ── bin2num: convert binary fixed-point string to number ──────────────────────────────
// MATLAB form is a quantizer/fi method: bin2num(q, b). Reconstruct using q's word length,
// fraction length and sign (two's complement), not a bare unsigned parseInt.
async function bin2num(args: Value[]): Promise<Value[]> {
  if (args.length < 1) throw new MatError('bin2num: requires input');
  const asStr = (v: Value): string => (isMat(v) && (v as any).isChar) || isStr(v) ? asString(v) : asScalar(m(v)).toString();
  let wl = 0, fl = 0, signed = true, scaled = false, s: string;
  if (isObject(args[0])) {
    const p = (args[0] as any).props as Map<string, Value>;
    if (p.has('Format')) { const fmt = toArray(p.get('Format') as any); wl = Math.round(fmt[0]); fl = Math.round(fmt[1] ?? 0); signed = !p.has('Mode') || asString(p.get('Mode')!).toLowerCase() !== 'ufixed'; }
    else { wl = Math.round(asScalar(p.get('WordLength') as any)); fl = Math.round(asScalar(p.get('FractionLength') as any)); signed = !p.has('Signed') || truthy(p.get('Signed')!); }
    scaled = true;
    s = asStr(args[1]);
  } else {
    s = asStr(args[0]);
  }
  let raw = parseInt(s, 2);
  if (scaled && signed && s.length >= wl && s[0] === '1') raw -= Math.pow(2, wl);   // two's complement
  return [scalar(scaled ? raw / Math.pow(2, fl) : raw)];
}

// ── fipref: fixed-point preferences ────────────────────────────────────────────────────
async function fipref(args: Value[]): Promise<Value[]> {
  const props = new Map<string, Value>();
  props.set('NumberDisplay', str('RealWorldValue'));
  props.set('FimathDisplay', str('full'));
  props.set('LoggingMode', str('off'));
  return [makeObject('fipref', props)];
}

// ── fixdt: return numerictype for Simulink fixed-point ─────────────────────────────────
async function fixdt(args: Value[]): Promise<Value[]> { return numerictype(args); }

// ── accumneg: subtract two fi values with fixed-point rounding/overflow control ────────
// c = accumneg(a, b) returns a - b quantized to the format of a.
async function accumneg(args: Value[]): Promise<Value[]> {
  if (args.length < 2) throw new MatError('accumneg: requires two operands');
  const getVal = (v: Value): number => {
    if ((v as any).kind === 'object') {
      const data = (v as any).props?.get('data');
      return data && isMat(data) ? asScalar(data as any) : 0;
    }
    return asScalar(m(v));
  };
  const getFormat = (v: Value): [number, number, boolean] => {
    if ((v as any).kind === 'object') {
      const p = (v as any).props as Map<string, Value>;
      const wl = p.get('WordLength') && isMat(p.get('WordLength')!) ? asScalar(p.get('WordLength') as any) : 16;
      const fl = p.get('FractionLength') && isMat(p.get('FractionLength')!) ? asScalar(p.get('FractionLength') as any) : 15;
      const sg = p.get('Signed') && isMat(p.get('Signed')!) ? asScalar(p.get('Signed') as any) !== 0 : true;
      return [wl, fl, sg];
    }
    return [16, 15, true];
  };
  const a = getVal(args[0]), b = getVal(args[1]);
  const [wl, fl, signed] = getFormat(args[0]);
  const roundMode = args.length > 2 && isMat(args[2]) && (args[2] as any).isChar
    ? String.fromCharCode(...(Array.from((args[2] as any).data) as number[])).toLowerCase()
    : 'nearest';
  const ovMode = args.length > 3 && isMat(args[3]) && (args[3] as any).isChar
    ? String.fromCharCode(...(Array.from((args[3] as any).data) as number[])).toLowerCase()
    : 'saturate';
  const result = quantize(a - b, wl, fl, signed, roundMode, ovMode);
  const props = new Map<string, Value>();
  props.set('data', scalar(result));
  props.set('WordLength', scalar(wl));
  props.set('FractionLength', scalar(fl));
  props.set('Signed', bool(signed));
  return [makeObject('fi', props)];
}

export const FIXEDPOINT: ToolboxModule = {
  id: 'fixedpoint',
  name: 'Fixed-Point Designer',
  docBase: 'https://www.mathworks.com/help/fixedpoint/',
  builtins: {
    fi,
    numerictype,
    fimath,
    quantizer,
    quantize: quantize_fn,
    num2bin,
    bin2num,
    fipref,
    fixdt,
    accumneg,
  },
  help: HELP_FIXEDPOINT,
};
