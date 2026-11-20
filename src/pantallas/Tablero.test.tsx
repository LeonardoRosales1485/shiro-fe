// T6.1: el tablero muestra una columna por estado de su tipo, con sus tareas, y el estado vacío del proyecto nuevo.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { error, pagina, PROYECTO, simularApi, simularTelefono, tarea, TIPOS_DE_TABLERO } from '../pruebas/api';
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

  it('cada tarjeta lleva al detalle de su tarea', async () => {
    simularApi({ 'POST /api/tarea/paginar': { cuerpo: pagina([tarea('SHI-1', 'Login', 'e1')]) } });
    mostrar();

    const enlace = await screen.findByRole('link', { name: /Login/ });
    expect(enlace).toHaveAttribute('href', '/proyecto/SHI/tarea/SHI-1');
    fireEvent.click(enlace);
    expect(window.location.pathname).toBe('/proyecto/SHI/tarea/SHI-1');
    window.history.replaceState(null, '', '/');
  });

  it('un proyecto sin tareas muestra cómo empezar', async () => {
    simularApi({ 'POST /api/tarea/paginar': { cuerpo: pagina([]) } });
    mostrar();

    expect(await screen.findByText('Shiro está listo')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nueva tarea' }).length).toBeGreaterThan(0);
  });

  it('a un administrador el proyecto vacío le ofrece importar desde Jira', async () => {
    simularApi({ 'POST /api/tarea/paginar': { cuerpo: pagina([]) } });
    const alImportar = vi.fn();
    render(<Tablero proyecto={PROYECTO} tablero={PROYECTO.tableros[0]} tipoDeTablero={TIPOS_DE_TABLERO[0]} version={0} alNuevaTarea={vi.fn()}
      alImportar={alImportar} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Importar desde Jira' }));
    expect(alImportar).toHaveBeenCalled();
  });

  it('avisa si no se pudieron cargar las tareas', async () => {
    simularApi({});
    mostrar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las tareas.');
  });

  it('si falla la carga permite reintentar', async () => {
    let intentos = 0;
    simularApi({ 'POST /api/tarea/paginar': () => {
      intentos += 1;
      return intentos === 1 ? error(503, 'NO_DISPONIBLE', 'El servidor no responde.') : { cuerpo: pagina([tarea('SHI-1', 'Login', 'e1')]) };
    } });
    mostrar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las tareas. El servidor no responde.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Login')).toBeInTheDocument();
  });

  it('en el teléfono muestra un estado por pestaña, con buscador', async () => {
    simularTelefono();
    simularApi({ 'POST /api/tarea/paginar': { cuerpo: pagina([
      tarea('SHI-1', 'Login', 'e1'), tarea('SHI-2', 'Tablero', 'e2'), tarea('SHI-3', 'Base', 'e2'),
    ]) } });
    mostrar();

    expect(await screen.findByRole('tab', { name: 'Por hacer 1' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Tablero')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'En curso' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'En curso 2' }));
    expect(screen.getByText('Tablero')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar tarea o clave' }), { target: { value: 'shi-3' } });
    expect(screen.queryByText('Tablero')).not.toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva tarea' })).toBeInTheDocument();
  });
});
