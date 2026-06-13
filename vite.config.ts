import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: '/insilico/',
  plugins: [react()],
  worker: { format: 'es' },
  resolve: {
    alias: [
      // Components reference '../shared/' relative to the project root; redirect to './shared/'
      { find: /^\.\.\/shared\//, replacement: resolve(__dirname, 'shared') + '/' },
      // ChapterSandbox imports '../pages/sandbox.css' — redirect to our single stylesheet
      { find: /^\.\.\/pages\/sandbox\.css$/, replacement: resolve(__dirname, 'src/style.css') },
    ],
  },
});
