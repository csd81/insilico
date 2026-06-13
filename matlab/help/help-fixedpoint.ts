// Help entries for the Fixed-Point Designer, extracted from fixedpoint.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_FIXEDPOINT: Record<string, HelpEntry | string> = {
    fi: {
      summary: 'Fixed-point numeric object',
      syntax: [
        'a = fi(v)',
        'a = fi(v,isSigned)',
        'a = fi(v,isSigned,WordLength)',
        'a = fi(v,isSigned,WordLength,FractionLength)',
      ],
      description: [
        'a = fi(v) creates a fixed-point object with the value v quantized to a signed 16-bit 15-fraction-bit format.',
        'a = fi(v,s,wl,fl) specifies signedness, word length, and fraction length explicitly.',
        'The real-world value = stored_integer × 2^(-FractionLength).',
      ],
      seealso: ['numerictype', 'fimath', 'quantizer'],
    },
    numerictype: {
      summary: 'Data type and scaling attributes of fi object',
      syntax: [
        'T = numerictype',
        'T = numerictype(isSigned)',
        'T = numerictype(isSigned,WordLength)',
        'T = numerictype(isSigned,WordLength,FractionLength)',
      ],
      description: [
        'T = numerictype(isSigned,wl,fl) describes a fixed-point format.',
        'Fields: Signedness, WordLength, FractionLength.',
      ],
      seealso: ['fi', 'fimath'],
    },
    fimath: {
      summary: 'Define math properties for fi objects',
      syntax: [
        'F = fimath',
        "F = fimath('RoundingMethod','Nearest','OverflowAction','Saturate')",
      ],
      description: [
        'F = fimath creates a fimath object controlling rounding and overflow behavior for fi arithmetic.',
      ],
      seealso: ['fi', 'numerictype'],
    },
    quantizer: {
      summary: 'Quantizer object',
      syntax: [
        'q = quantizer',
        "q = quantizer('fixed',[wl fl])",
        "q = quantizer('Mode','fixed','Format',[wl fl],'RoundMode','nearest')",
      ],
      description: [
        'q = quantizer creates a quantizer object for fixed-point or floating-point quantization.',
        "Use quantize(q,x) to apply the quantizer to data x.",
      ],
      seealso: ['fi', 'quantize', 'num2bin'],
    },
    quantize: {
      summary: 'Quantize data with quantizer object',
      syntax: ['xq = quantize(q,x)'],
      description: ['xq = quantize(q,x) applies the quantizer q to data x, rounding and saturating as specified.'],
      seealso: ['quantizer', 'fi'],
    },
    num2bin: {
      summary: 'Convert fi or number to binary string',
      syntax: ['b = num2bin(a)'],
      description: ['b = num2bin(a) returns the two\'s-complement binary representation of the fi object a as a character string.'],
      seealso: ['bin2num', 'fi'],
    },
    bin2num: {
      summary: 'Convert binary string to number',
      syntax: ['x = bin2num(b)'],
      description: ['x = bin2num(b) converts the binary string b to an unsigned integer.'],
      seealso: ['num2bin', 'fi'],
    },
    fipref: {
      summary: 'Fixed-point preferences',
      syntax: ['p = fipref', 'p = fipref(Name,Value)'],
      description: ['p = fipref returns the current fixed-point preferences object controlling display format and logging.'],
      seealso: ['fi', 'fimath'],
    },
    fixdt: {
      summary: 'Create Simulink fixed-point data type',
      syntax: ['T = fixdt(isSigned,wl,fl)', 'T = fixdt(isSigned,wl,slope,bias)'],
      description: ['T = fixdt(isSigned,wl,fl) returns a numerictype for use in Simulink block data-type parameters.'],
      seealso: ['numerictype', 'fi'],
    },
    accumneg: {
      summary: 'Subtract two fi objects or values',
      syntax: [
        'c = accumneg(a,b)',
        "c = accumneg(a,b,RoundingMethod)",
        "c = accumneg(a,b,RoundingMethod,OverflowAction)",
      ],
      description: [
        'c = accumneg(a,b) computes a - b and quantizes the result to the fixed-point format of a.',
        'RoundingMethod: "nearest" (default), "floor", "ceil", "zero".',
        'OverflowAction: "saturate" (default), "wrap".',
      ],
      seealso: ['fi', 'fimath', 'quantize'],
    },
  };
