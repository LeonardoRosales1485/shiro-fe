/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api se reenvia al backend local (puerto provisorio 7090). En un servidor, infra-nginx publica el
// backend bajo el mismo dominio. VITE_BASE_PATH lo pasa la plantilla de despliegue como --base.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 7091,
    proxy: {
      '/api': 'http://localhost:7090',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/preparacion.ts'],
    globals: false,
  },
});
