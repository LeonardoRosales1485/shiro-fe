// MJ-16 del plan de mejoras: el backend responde 400 PAGINADO_INVALIDO si un /paginar pide mas de 500 elementos.
// Recorre el codigo del front (sin las pruebas) y falla si algun pedido escribe un tamano mayor al tope.
import { describe, expect, it } from 'vitest';
import { TOPE_DE_PAGINA } from './tipos';

// Codigo de src (sin pruebas ni dobles), como texto
const FUENTES = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../pruebas/**'],
  { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('tope de pagina', () => {
  it('es el del backend', () => {
    expect(TOPE_DE_PAGINA).toBe(500);
  });

  it('ningun pedido del front pide mas elementos que el tope', () => {
    expect(Object.keys(FUENTES).length).toBeGreaterThan(20);
    const excedidos = Object.entries(FUENTES).flatMap(([ruta, texto]) =>
      [...texto.matchAll(/tamano\s*[:=]\s*(\d+)/g)]
        .filter((m) => Number(m[1]) > TOPE_DE_PAGINA)
        .map((m) => `${ruta}: ${m[0]}`));
    expect(excedidos).toEqual([]);
  });
});
