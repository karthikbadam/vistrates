import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `VITE_BASE` lets the GH Pages workflow inject `/Vistrates/` so static
// assets resolve under https://<owner>.github.io/Vistrates/. Local dev
// uses `/`.
const base = process.env['VITE_BASE'] ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 2_000,
  },
});
