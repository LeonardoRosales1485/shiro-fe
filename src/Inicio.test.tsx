// T0.4: la pagina inicial muestra el nombre del producto y si el backend responde (y con que version).
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Inicio } from './Inicio';

describe('Inicio', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra el nombre del producto', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<Inicio />);
    expect(screen.getByRole('heading', { name: 'Shiro' })).toBeInTheDocument();
  });

  it('muestra la versión del backend cuando responde', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ version: '1.0.2', coreVersion: '4.0.0' }))));
    render(<Inicio />);
    expect(await screen.findByText('Backend conectado: versión 1.0.2')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/actuator/info');
  });

  it('avisa qué hacer cuando el backend no responde', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    render(<Inicio />);
    expect(await screen.findByText('No se pudo conectar con el backend. Revisá que esté levantado en el puerto 7090.')).toBeInTheDocument();
  });
});
