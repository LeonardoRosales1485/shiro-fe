// @vitest-environment node
// MJ-07 del plan de mejoras: cabeceras de seguridad del front. La CSP no permite scripts ni estilos en linea, solo
// los del propio sitio y los de Google Identity Services (ingreso con Google); vite preview sirve las mismas
// cabeceras que se le proponen a infra-nginx (docs/cabeceras-de-seguridad.md).
import { describe, expect, it } from 'vitest';
import configuracion from '../../vite.config';
import { CABECERAS_DE_SEGURIDAD, POLITICA_DE_CONTENIDO } from './cabecerasDeSeguridad';

// Directivas de la CSP, por nombre
function directivas(politica: string): Map<string, string[]> {
  return new Map(politica.split(';').map((parte) => parte.trim()).filter(Boolean)
    .map((parte) => { const [nombre, ...valores] = parte.split(/\s+/); return [nombre, valores]; }));
}

describe('cabeceras de seguridad', () => {
  it('la CSP solo permite lo propio y Google Identity Services, sin nada en linea', () => {
    const csp = directivas(POLITICA_DE_CONTENIDO);
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('script-src')).toEqual(["'self'", 'https://accounts.google.com/gsi/client']);
    expect(csp.get('style-src')).toEqual(["'self'", 'https://accounts.google.com/gsi/style']);
    expect(csp.get('img-src')).toEqual(["'self'", 'data:']);
    expect(csp.get('connect-src')).toEqual(["'self'", 'https://accounts.google.com/gsi/']);
    expect(csp.get('frame-src')).toEqual(['https://accounts.google.com/gsi/']);
    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(POLITICA_DE_CONTENIDO).not.toContain('unsafe-inline');
    expect(POLITICA_DE_CONTENIDO).not.toContain('unsafe-eval');
  });

  it('declara las cabeceras de endurecimiento', () => {
    expect(CABECERAS_DE_SEGURIDAD).toEqual({
      'Content-Security-Policy': POLITICA_DE_CONTENIDO,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    });
  });

  it('vite preview sirve las mismas cabeceras', () => {
    expect(configuracion.preview?.headers).toEqual(CABECERAS_DE_SEGURIDAD);
  });
});
