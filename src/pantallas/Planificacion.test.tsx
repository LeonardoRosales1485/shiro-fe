// T6.3: backlog y sprints del proyecto (prototipos "Backlog", "Crear sprint", "Cerrar sprint" y "Sprint cerrado").
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pagina, PROYECTO, simularApi, SPRINTS, tareaDePlan, TIPOS_DE_TABLERO, type Respuesta } from '../pruebas/api';
import { Planificacion } from './Planificacion';

// Tareas de cada sprint por su uuid (el filtro sprint.uuid del paginado)
const DEL_SPRINT: Record<string, unknown[]> = {
  s13: [tareaDePlan('SHI-104', 'Ingreso con Google', { estadoUuid: 'e5', estadoNombre: 'Hecho', puntos: 5 })],
  s14: [
    tareaDePlan('SHI-140', 'Login', { estadoUuid: 'e5', estadoNombre: 'Hecho', puntos: 3 }),
    tareaDePlan('SHI-141', 'Tablero', { puntos: 5 }),
    tareaDePlan('SHI-142', 'Pruebas', { tableroCodigo: 'QA', tableroUuid: 't2', estadoUuid: 'q1', estadoNombre: 'Por probar' }),
  ],
  s15: [tareaDePlan('SHI-150', 'Diseño del flujo', { puntos: 3 })],
};

const BACKLOG = [tareaDePlan('SHI-163', 'Búsqueda por MCP', { puntos: 5 }), tareaDePlan('SHI-164', 'Reimportar', { puntos: 8 }),
  tareaDePlan('SHI-165', 'Relevar grupos')];

function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}, sprints: unknown[] = SPRINTS) {
  return simularApi({
    'POST /api/sprint/paginar': { cuerpo: pagina(sprints) },
    'POST /api/tarea/paginar': (cuerpo) => {
      const filtro = (cuerpo as { filtros: { valor: string }[][] }).filtros[0][0];
      return { cuerpo: pagina(DEL_SPRINT[filtro.valor] ?? []) };
    },
    'GET /api/proyecto/p1/backlog': { cuerpo: BACKLOG },
    ...extra,
  });
}

const mostrar = () => render(<Planificacion proyecto={PROYECTO} tiposDeTablero={TIPOS_DE_TABLERO} />);

describe('Planificacion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra el sprint activo con su avance, el planificado y el backlog', async () => {
    const pedidos = api();
    mostrar();

    const activo = await screen.findByRole('region', { name: 'Sprint 14' });
    expect(within(activo).getByText('Activo')).toBeInTheDocument();
    expect(within(activo).getByText('09/11/2026 – 20/11/2026 · 3 tareas · 8 puntos')).toBeInTheDocument();
    expect(within(activo).getByText('3 de 8 puntos hechos')).toBeInTheDocument();
    expect(within(activo).getByText('Principal 2')).toBeInTheDocument();
    expect(within(activo).getByText('QA 1')).toBeInTheDocument();
    expect(within(activo).getByText('SHI-141')).toBeInTheDocument();

    const planificado = screen.getByRole('region', { name: 'Sprint 15' });
    expect(within(planificado).getByRole('button', { name: 'Iniciar sprint' })).toBeDisabled();
    expect(within(planificado).getByText('Solo puede haber un sprint activo por proyecto. Cerrá el Sprint 14 para iniciar este.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sprint 13' })).not.toBeInTheDocument();

    const backlog = screen.getByRole('region', { name: 'Backlog' });
    expect(within(backlog).getByText('3 tareas sin sprint · el orden es el mismo para todos')).toBeInTheDocument();
    expect(within(backlog).getByText('Búsqueda por MCP')).toBeInTheDocument();
    expect((pedidos[0].cuerpo as { filtros: unknown[][] }).filtros[0][0]).toEqual({ campo: 'proyecto.uuid', operacion: '=', valor: 'p1' });
  });

  it('crear un sprint con tareas del backlog', async () => {
    const pedidos = api({
      'POST /api/sprint/guardar': (cuerpo) => ({ cuerpo: { ...(cuerpo as object), uuid: 's16', estado: 'PLANIFICADO' } }),
      'POST /api/sprint/s16/asignar': { cuerpo: {} },
    });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Crear sprint' }));
    const dialogo = screen.getByRole('dialog', { name: 'Crear sprint' });
    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: 'Sprint 16' } });
    fireEvent.change(within(dialogo).getByLabelText('Inicio'), { target: { value: '2026-12-07' } });
    fireEvent.change(within(dialogo).getByLabelText('Fin'), { target: { value: '2026-12-18' } });
    fireEvent.click(within(dialogo).getByRole('checkbox', { name: /SHI-164/ }));
    expect(within(dialogo).getByText('1 elegidas · 8 puntos')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Crear sprint' }));

    await vi.waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/sprint/s16/asignar')).toBe(true));
    expect(pedidos.find((p) => p.ruta === '/api/sprint/guardar')?.cuerpo).toEqual({ proyectoUuid: 'p1', nombre: 'Sprint 16', inicio: '2026-12-07', fin: '2026-12-18' });
    expect(pedidos.find((p) => p.ruta === '/api/sprint/s16/asignar')?.cuerpo).toEqual({ tareas: ['u-SHI-164'] });
    expect(await screen.findByRole('status')).toHaveTextContent('Se creó Sprint 16.');
  });

  it('cerrar el sprint activo pasando lo pendiente al planificado', async () => {
    const pedidos = api({ 'POST /api/sprint/s14/cerrar': { cuerpo: {} } });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sprint' }));
    const dialogo = screen.getByRole('dialog', { name: 'Cerrar sprint' });
    expect(within(dialogo).getByText('¿Qué pasa con las 2 tareas sin terminar?')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Pasan al Sprint 15' }));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar sprint' }));

    await vi.waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/sprint/s14/cerrar')?.cuerpo)
      .toEqual({ destino: 'SPRINT', sprintDestinoUuid: 's15' }));
  });

  it('cerrar sin otro sprint devuelve lo pendiente al backlog', async () => {
    const pedidos = api({ 'POST /api/sprint/s14/cerrar': { cuerpo: {} } }, SPRINTS.slice(0, 2));
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sprint' }));
    const dialogo = screen.getByRole('dialog', { name: 'Cerrar sprint' });
    expect(within(dialogo).getByRole('radio', { name: 'Vuelven al backlog' })).toBeChecked();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar sprint' }));

    await vi.waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/sprint/s14/cerrar')?.cuerpo).toEqual({ destino: 'BACKLOG' }));
  });

  it('iniciar un sprint planificado cuando no hay uno activo', async () => {
    const pedidos = api({ 'POST /api/sprint/s15/iniciar': { cuerpo: {} } }, [SPRINTS[0], SPRINTS[2]]);
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar sprint' }));

    await vi.waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/sprint/s15/iniciar')).toBe(true));
  });

  it('desde el backlog una tarea pasa a un sprint, sube al principio o baja al final', async () => {
    const pedidos = api({ 'POST /api/sprint/s14/asignar': { cuerpo: {} }, 'POST /api/proyecto/p1/ordenar-backlog': { cuerpo: BACKLOG } });
    mostrar();

    const backlog = await screen.findByRole('region', { name: 'Backlog' });
    fireEvent.click(await within(backlog).findByRole('button', { name: 'Acciones de SHI-164' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mover a Sprint 14 (activo)' }));
    await vi.waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/sprint/s14/asignar')?.cuerpo).toEqual({ tareas: ['u-SHI-164'] }));

    fireEvent.click(await within(backlog).findByRole('button', { name: 'Acciones de SHI-165' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Subir al principio' }));
    await vi.waitFor(() => expect(pedidos.filter((p) => p.ruta === '/api/proyecto/p1/ordenar-backlog')[0]?.cuerpo).toEqual({ tareas: ['u-SHI-165'] }));

    fireEvent.click(await within(backlog).findByRole('button', { name: 'Acciones de SHI-163' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Bajar al final' }));
    await vi.waitFor(() => expect(pedidos.filter((p) => p.ruta === '/api/proyecto/p1/ordenar-backlog')[1]?.cuerpo)
      .toEqual({ tareas: ['u-SHI-164', 'u-SHI-165'] }));
  });

  it('una tarea sale del sprint y vuelve al backlog', async () => {
    const pedidos = api({ 'POST /api/sprint/s15/quitar': { cuerpo: {} } });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Sacar SHI-150 del sprint' }));

    await vi.waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/sprint/s15/quitar')?.cuerpo).toEqual({ tareas: ['u-SHI-150'] }));
  });

  it('los sprints cerrados se consultan y se archivan', async () => {
    const pedidos = api({ 'POST /api/sprint/s13/archivar': { cuerpo: {} } });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Sprints cerrados (1)' }));
    const cerrado = await screen.findByRole('region', { name: 'Sprint 13' });
    expect(within(cerrado).getByText('Cerrado')).toBeInTheDocument();
    expect(await within(cerrado).findByText('Ingreso con Google')).toBeInTheDocument();
    fireEvent.click(within(cerrado).getByRole('button', { name: 'Archivar sprint' }));

    await vi.waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/sprint/s13/archivar')).toBe(true));
  });

  it('avisa si no se pudo cargar', async () => {
    simularApi({});
    mostrar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la planificación.');
  });
});
