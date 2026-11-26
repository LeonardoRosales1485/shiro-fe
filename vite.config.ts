/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { CABECERAS_DE_SEGURIDAD } from './src/configuracion/cabecerasDeSeguridad';

// En desarrollo, /api se reenvia al backend local (puerto provisorio 7090). En un servidor, infra-nginx publica el
// backend bajo el mismo dominio. VITE_BASE_PATH lo pasa la plantilla de despliegue como --base.
// vite preview sirve el build con las cabeceras de seguridad (MJ-07); el servidor de desarrollo no, porque Vite
// inyecta scripts en linea para recargar en caliente y la CSP los bloquearia.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 7091,
    proxy: {
      '/api': 'http://localhost:7090',
    },
  },
  preview: {
    port: 7092,
    headers: CABECERAS_DE_SEGURIDAD,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/preparacion.ts'],
    globals: false,
  },
});
