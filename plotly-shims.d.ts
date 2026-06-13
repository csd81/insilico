// Minimal ambient declarations — these packages ship no bundled TypeScript types.
declare module 'react-plotly.js/factory' {
  import type { ComponentType } from 'react';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createPlotlyComponent: (plotly: any) => ComponentType<any>;
  export default createPlotlyComponent;
}
declare module 'plotly.js-dist-min' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Plotly: any;
  export default Plotly;
}
