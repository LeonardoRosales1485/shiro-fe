// T6.1: el tablero muestra una columna por estado de su tipo, con sus tareas, y el estado vacío del proyecto nuevo.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('el clic y Enter abren el detalle sin iniciar un movimiento', async () => {
    const pedidos = simularApi({
      'POST /api/tarea/paginar': { cuerpo: pagina([tarea('SHI-1', 'Login', 'e1')]) },
      'POST /api/tarea/u-SHI-1/mover': { cuerpo: tarea('SHI-1', 'Login', 'e2') },
    });
    mostrar();

    const enlace = await screen.findByRole('link', { name: /Login/ });
    fireEvent.click(enlace);
    fireEvent.keyDown(enlace, { code: 'Enter', key: 'Enter' });
    expect(pedidos.filter((p) => p.ruta.endsWith('/mover'))).toHaveLength(0);
    window.history.replaceState(null, '', '/');
  });

  it('Space levanta la tarjeta y Escape cancela sin llamar a la API', async () => {
    const pedidos = simularApi({
      'POST /api/tarea/paginar': { cuerpo: pagina([tarea('SHI-1', 'Login', 'e1')]) },
      'POST /api/tarea/u-SHI-1/mover': { cuerpo: tarea('SHI-1', 'Login', 'e2') },
    });
    mostrar();

    const enlace = await screen.findByRole('link', { name: /Login/ });
    fireEvent.keyDown(enlace, { code: 'Space' });
    fireEvent.keyDown(enlace, { code: 'Escape' });
    expect(pedidos.filter((p) => p.ruta.endsWith('/mover'))).toHaveLength(0);
    expect(within(screen.getByRole('region', { name: 'Por hacer' })).getByText('Login')).toBeInTheDocument();
  });

  it('en el teléfono «Mover a…» persiste el estado con el mismo endpoint', async () => {
    simularTelefono();
    const pedidos = simularApi({
      'POST /api/tarea/paginar': { cuerpo: pagina([tarea('SHI-1', 'Login', 'e1')]) },
      'POST /api/tarea/u-SHI-1/mover': { cuerpo: tarea('SHI-1', 'Login', 'e2') },
    });
    mostrar();

    expect(await screen.findByRole('tab', { name: 'Por hacer 1' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mover a…' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Estado destino para SHI-1' }), { target: { value: 'e2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mover' }));

    await waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/tarea/u-SHI-1/mover')).toBe(true));
    expect(pedidos.find((p) => p.ruta === '/api/tarea/u-SHI-1/mover')?.cuerpo).toEqual({ estadoUuid: 'e2' });
    expect(await screen.findByRole('status')).toHaveTextContent('SHI-1 pasó a En curso.');
    expect(await screen.findByRole('tab', { name: 'En curso 1' })).toBeInTheDocument();
  });

  it('si la API rechaza el movimiento muestra el error y conserva la tarjeta', async () => {
    simularTelefono();
    simularApi({
      'POST /api/tarea/paginar': { cuerpo: pagina([tarea('SHI-1', 'Login', 'e1')]) },
      'POST /api/tarea/u-SHI-1/mover': error(400, 'ESTADO_DE_OTRO_TABLERO', 'Ese estado no pertenece al tablero.'),
    });
    mostrar();

    expect(await screen.findByRole('tab', { name: 'Por hacer 1' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mover a…' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Estado destino para SHI-1' }), { target: { value: 'e2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mover' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese estado no pertenece al tablero.');
    expect(screen.getByRole('tab', { name: 'Por hacer 1' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
