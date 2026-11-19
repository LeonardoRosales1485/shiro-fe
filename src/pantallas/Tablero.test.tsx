// T6.1: el tablero muestra una columna por estado de su tipo, con sus tareas, y el estado vacío del proyecto nuevo.
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pagina, PROYECTO, simularApi, tarea, TIPOS_DE_TABLERO } from '../pruebas/api';
import { Tablero } from './Tablero';

describe('Tablero', () => {
  afterEach(() => vi.unstubAllGlobals());

  const mostrar = () => render(<Tablero proyecto={PROYECTO} tablero={PROYECTO.tableros[0]}
    tipoDeTablero={TIPOS_DE_TABLERO[0]} version={0} alNuevaTarea={vi.fn()} />);

  it('muestra cada tarea en la columna de su estado', async () => {
    const pedidos = simularApi({ 'POST /api/tarea/paginar': { cuerpo: pagina([
      tarea('SHI-1', 'Login', 'e1'), tarea('SHI-2', 'Tablero', 'e2', { puntos: 3, prioridad: 'ALTA' }), tarea('SHI-3', 'Base', 'e5'),
    ]) } });
    mostrar();

    const enCurso = await screen.findByRole('region', { name: 'En curso' });
    expect(within(enCurso).getByText('Tablero')).toBeInTheDocument();
    expect(within(enCurso).getByText('SHI-2')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Por hacer' })).getByText('Login')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Hecho' })).getByText('1')).toBeInTheDocument();
    const filtro = (pedidos[0].cuerpo as { filtros: unknown[][] }).filtros[0][0];
    expect(filtro).toEqual({ campo: 'tablero.uuid', operacion: '=', valor: 't1' });
  });

  it('un proyecto sin tareas muestra cómo empezar', async () => {
    simularApi({ 'POST /api/tarea/paginar': { cuerpo: pagina([]) } });
    mostrar();

    expect(await screen.findByText('Shiro está listo')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nueva tarea' }).length).toBeGreaterThan(0);
  });

  it('avisa si no se pudieron cargar las tareas', async () => {
    simularApi({});
    mostrar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las tareas.');
  });
});
