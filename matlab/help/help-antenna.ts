// Help entries for the Antenna / Array Geometry, extracted from antenna.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_ANTENNA: Record<string, HelpEntry | string> = {
    azel2uv: { summary: 'Convert azimuth-elevation to u-v coordinates', syntax: ['uv = azel2uv(az,el)'], seealso: ['uv2azel', 'phitheta2uv'] },
    uv2azel: { summary: 'Convert u-v to azimuth-elevation coordinates', syntax: ['[az,el] = uv2azel(uv)'], seealso: ['azel2uv', 'uv2phitheta'] },
    phitheta2uv: { summary: 'Convert phi-theta to u-v coordinates', syntax: ['uv = phitheta2uv(phi,theta)'], seealso: ['uv2phitheta', 'azel2uv'] },
    uv2phitheta: { summary: 'Convert u-v to phi-theta coordinates', syntax: ['[phi,theta] = uv2phitheta(uv)'], seealso: ['phitheta2uv', 'uv2azel'] },
    azel2phitheta: { summary: 'Convert azimuth-elevation to phi-theta coordinates', syntax: ['[phi,theta] = azel2phitheta(az,el)'], seealso: ['phitheta2azel', 'azel2uv'] },
    phitheta2azel: { summary: 'Convert phi-theta to azimuth-elevation coordinates', syntax: ['[az,el] = phitheta2azel(phi,theta)'], seealso: ['azel2phitheta', 'uv2azel'] },
  };
