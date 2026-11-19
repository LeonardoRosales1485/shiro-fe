// T6.1: sin sesión se ve el ingreso; con sesión, el menú con los proyectos y el tablero principal del primero, y se
// cambia de tablero desde el menú.
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { error, pagina, PROYECTO, simularApi, tarea, TIPOS_DE_TABLERO, TIPOS_DE_TAREA } from './pruebas/api';
import { App } from './App';

const CON_SESION = {
  'GET /api/usuario/sesion': { cuerpo: { uuid: 'u1', nombreDeUsuario: 'demo', email: 'demo@example.local' } },
  'GET /api/usuario/u1/grupos': { cuerpo: [{ uuid: 'g1', nombre: 'ADMIN' }] },
  'POST /api/proyecto/paginar': { cuerpo: pagina([PROYECTO]) },
  'GET /api/tipo-tablero/listar': { cuerpo: TIPOS_DE_TABLERO },
  'GET /api/tipo-tarea/listar': { cuerpo: TIPOS_DE_TAREA },
  'POST /api/tarea/paginar': (cuerpo: unknown) => ({ cuerpo: pagina(
    JSON.stringify(cuerpo).includes('"t2"') ? [tarea('SHI-5', 'Probar login', 'q1')] : [tarea('SHI-1', 'Login', 'e1')]) }),
};

describe('App', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));
  afterEach(() => vi.unstubAllGlobals());

  it('sin sesión muestra el ingreso', async () => {
    simularApi({ 'GET /api/usuario/sesion': error(401, 'NO_AUTENTICADO', 'Iniciá sesión'),
      'POST /api/usuario/refresh-token': error(401, 'REFRESH_TOKEN_INVALIDO', 'Iniciá sesión') });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu espacio' })).toBeInTheDocument();
  });

  it('con sesión muestra el tablero principal del primer proyecto y cambia de tablero', async () => {
    simularApi(CON_SESION);
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Tablero principal' })).toBeInTheDocument();
    expect(await screen.findByText('Login')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/proyecto/SHI/PRINCIPAL');

    fireEvent.click(screen.getByRole('link', { name: 'QA' }));

    expect(await screen.findByText('Probar login')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/proyecto/SHI/QA');
  });

  it('un administrador ve la sección de administración', async () => {
    simularApi(CON_SESION);
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Crear proyecto' })).toBeInTheDocument();
  });

  it('salir cierra la sesión y vuelve al ingreso', async () => {
    const pedidos = simularApi({ ...CON_SESION, 'POST /api/usuario/cerrar-sesion': { status: 200 } });
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Salir' }));

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu espacio' })).toBeInTheDocument();
    expect(pedidos.some((p) => p.ruta === '/api/usuario/cerrar-sesion')).toBe(true);
  });
});
