import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  esbuild: {
    legalComments: 'none',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@vercel/speed-insights/next': '@vercel/speed-insights/react',
      '@vercel/analytics/next': '@vercel/analytics/react',
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
