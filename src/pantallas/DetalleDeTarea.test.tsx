// T6.2: detalle de una tarea con sus datos, subtareas, relaciones, comentarios e historial; editar, mover de estado,
// comentar, agregar subtareas y archivar.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COMENTARIOS, error, HISTORIAL, pagina, PROYECTO, RELACIONES, simularApi, tarea, tareaDetalle, TIPOS_DE_TABLERO, TIPOS_DE_TAREA,
  USUARIO, type Respuesta,
} from '../pruebas/api';
import { DetalleDeTarea } from './DetalleDeTarea';

// Respuestas de la API para la tarea SHI-149, con las que se pisen en cada prueba
function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}) {
  return simularApi({
    'POST /api/tarea/paginar': { cuerpo: pagina([tarea('SHI-149', 'Clave duplicada al crear dos tareas a la vez', 'e2')]) },
    'GET /api/tarea/uuid/u-SHI-149': { cuerpo: tareaDetalle() },
    'GET /api/tarea/u-SHI-149/relaciones': { cuerpo: RELACIONES },
    'POST /api/comentario/paginar': { cuerpo: pagina(COMENTARIOS) },
    'GET /api/tarea/u-SHI-149/historial': { cuerpo: HISTORIAL },
    ...extra,
  });
}

function mostrar() {
  return render(<DetalleDeTarea proyecto={PROYECTO} clave="SHI-149" tiposDeTablero={TIPOS_DE_TABLERO} tiposDeTarea={TIPOS_DE_TAREA}
    usuario={USUARIO} esAdministrador={false} />);
}

describe('DetalleDeTarea', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('muestra la tarea con sus detalles, subtareas, relaciones y comentarios', async () => {
    const pedidos = api();
    mostrar();

    expect(await screen.findByRole('heading', { name: 'Clave duplicada al crear dos tareas a la vez' })).toBeInTheDocument();
    expect(screen.getByText('SHI-149')).toBeInTheDocument();
    expect(screen.getByText('Si dos personas crean una tarea a la vez, reciben la misma clave.')).toBeInTheDocument();
    const detalles = screen.getByRole('complementary', { name: 'Detalles' });
    expect(within(detalles).getByLabelText('Estado')).toHaveValue('e2');
    expect(within(detalles).getByText('Lucas Benítez')).toBeInTheDocument();
    expect(within(detalles).getByText('Más alta')).toBeInTheDocument();
    expect(within(detalles).getByText('3 puntos')).toBeInTheDocument();
    expect(within(detalles).getByText('concurrencia')).toBeInTheDocument();
    expect(within(detalles).getByText('Sprint 14')).toBeInTheDocument();
    expect(within(detalles).getByText('1.0.0')).toBeInTheDocument();
    expect(within(detalles).getByText('20/11/2026')).toBeInTheDocument();

    const subtareas = screen.getByRole('region', { name: 'Subtareas' });
    expect(within(subtareas).getByText('1 de 2 hechas')).toBeInTheDocument();
    expect(within(subtareas).getByText('SHI-153 · Prueba de concurrencia')).toBeInTheDocument();

    const relaciones = screen.getByRole('region', { name: 'Relaciones' });
    expect(within(relaciones).getByText('Clonada de')).toBeInTheDocument();
    expect(within(relaciones).getByText('Bloquea')).toBeInTheDocument();
    expect(within(relaciones).getByText('SHI-128 · Importar sprints')).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'Comentarios (2)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Se reproduce 3 de cada 10 veces.')).toBeInTheDocument();
    expect(screen.getByText('Lucas Benítez (vía MCP)')).toBeInTheDocument();

    const buscada = (pedidos[0].cuerpo as { filtros: unknown[][] }).filtros[0][0];
    expect(buscada).toEqual({ campo: 'clave', operacion: '=', valor: 'SHI-149' });
    const comentarios = pedidos.find((p) => p.ruta === '/api/comentario/paginar')?.cuerpo as { filtros: unknown[][] };
    expect(comentarios.filtros[0][0]).toEqual({ campo: 'tareaUuid', operacion: '=', valor: 'u-SHI-149' });
  });

  it('avisa si la tarea no existe o no se puede ver', async () => {
    api({ 'POST /api/tarea/paginar': { cuerpo: pagina([]) } });
    mostrar();

    expect(await screen.findByText('No encontramos la tarea SHI-149')).toBeInTheDocument();
  });

  it('mover a otro estado usa el endpoint de mover', async () => {
    const pedidos = api({ 'POST /api/tarea/u-SHI-149/mover': { cuerpo: tareaDetalle({ estadoUuid: 'e5', estadoNombre: 'Hecho' }) } });
    mostrar();

    fireEvent.change(await screen.findByLabelText('Estado'), { target: { value: 'e5' } });

    expect(await screen.findByRole('status')).toHaveTextContent('SHI-149 pasó a Hecho.');
    expect(pedidos.find((p) => p.ruta === '/api/tarea/u-SHI-149/mover')?.cuerpo).toEqual({ estadoUuid: 'e5' });
  });

  it('editar manda la fecha leída y muestra lo guardado', async () => {
    const pedidos = api({ 'POST /api/tarea/guardar': (cuerpo) => ({ cuerpo: { ...tareaDetalle(), ...(cuerpo as object) } }) });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Claves repetidas' } });
    fireEvent.change(screen.getByLabelText('Estimación (puntos)'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('heading', { name: 'Claves repetidas' })).toBeInTheDocument();
    const guardado = pedidos.find((p) => p.ruta === '/api/tarea/guardar')?.cuerpo as Record<string, unknown>;
    expect(guardado).toMatchObject({
      uuid: 'u-SHI-149', tableroUuid: 't1', tipoCodigo: 'BUG', titulo: 'Claves repetidas', puntos: 5, prioridad: 'MAS_ALTA',
      responsableUuid: 'us1', fechaDeActualizacion: '2026-11-18T15:42:00.000-03:00', etiquetas: [{ texto: 'claves' }, { texto: 'concurrencia' }],
    });
  });

  it('si otro la cambió mientras se editaba, avisa y no pierde lo escrito', async () => {
    api({ 'POST /api/tarea/guardar': error(409, 'TAREA_MODIFICADA', 'La tarea cambió mientras la editabas. Recargá y volvé a intentar.') });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Claves repetidas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La tarea cambió mientras la editabas.');
    expect(screen.getByLabelText('Título')).toHaveValue('Claves repetidas');
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
  });

  it('asignármela pone como responsable al usuario de la sesión', async () => {
    const pedidos = api({
      'GET /api/tarea/uuid/u-SHI-149': { cuerpo: tareaDetalle({ responsableUuid: null, responsableNombre: null }) },
      'POST /api/tarea/guardar': (cuerpo) => ({ cuerpo: { ...tareaDetalle(), ...(cuerpo as object), responsableNombre: 'lucas' } }),
    });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Asignármela' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Te asignaste SHI-149.');
    expect(pedidos.find((p) => p.ruta === '/api/tarea/guardar')?.cuerpo).toMatchObject({ responsableUuid: 'us1' });
  });

  it('comentar agrega el comentario a la lista', async () => {
    const pedidos = api({
      'POST /api/comentario/guardar': (cuerpo) => ({ cuerpo: { uuid: 'c3', ...(cuerpo as object), autorNombre: 'lucas', canal: 'WEB',
        fecha: '2026-11-19T10:00:00.000-03:00' } }),
    });
    mostrar();

    fireEvent.change(await screen.findByLabelText('Nuevo comentario'), { target: { value: 'Listo el arreglo.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Comentar' }));

    expect(await screen.findByText('Listo el arreglo.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Comentarios (3)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nuevo comentario')).toHaveValue('');
    expect(pedidos.find((p) => p.ruta === '/api/comentario/guardar')?.cuerpo).toEqual({ tareaUuid: 'u-SHI-149', cuerpo: 'Listo el arreglo.' });
  });

  it('el historial muestra cada cambio y se puede filtrar por MCP', async () => {
    api();
    mostrar();

    fireEvent.click(await screen.findByRole('tab', { name: 'Historial' }));

    const panel = await screen.findByRole('tabpanel', { name: 'Historial' });
    expect(await within(panel).findByText('Lucas Benítez cambió el estado')).toBeInTheDocument();
    expect(within(panel).getByText('Por hacer → En curso')).toBeInTheDocument();
    expect(within(panel).getByText('Lucas Benítez (vía MCP) cambió la estimación')).toBeInTheDocument();
    expect(within(panel).getByText('— → 3')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Historial (2)' })).toBeInTheDocument();

    fireEvent.click(within(panel).getByLabelText('Solo cambios vía MCP'));

    expect(within(panel).queryByText('Lucas Benítez cambió el estado')).not.toBeInTheDocument();
    expect(within(panel).getByText('Lucas Benítez (vía MCP) cambió la estimación')).toBeInTheDocument();
  });

  it('agregar una subtarea la crea con la tarea como padre', async () => {
    const pedidos = api({ 'POST /api/tarea/guardar': (cuerpo) => ({ cuerpo: { ...(cuerpo as object), uuid: 'u-SHI-160', clave: 'SHI-160' } }) });
    mostrar();

    fireEvent.change(await screen.findByLabelText('Título de la nueva subtarea'), { target: { value: 'Migrar claves viejas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(await screen.findByText('SHI-160 · Migrar claves viejas')).toBeInTheDocument();
    expect(pedidos.find((p) => p.ruta === '/api/tarea/guardar')?.cuerpo).toEqual({
      tableroUuid: 't1', tipoCodigo: 'SUBTAREA', titulo: 'Migrar claves viejas', padreUuid: 'u-SHI-149',
    });
  });

  it('una subtarea no ofrece agregar subtareas', async () => {
    api({ 'GET /api/tarea/uuid/u-SHI-149': { cuerpo: tareaDetalle({ tipoCodigo: 'SUBTAREA', hijas: [], padreUuid: 'u-SHI-100', padreClave: 'SHI-100' }) } });
    mostrar();

    expect(await screen.findByText('SHI-100')).toBeInTheDocument();
    expect(screen.queryByLabelText('Título de la nueva subtarea')).not.toBeInTheDocument();
  });

  it('quitar una relación la archiva', async () => {
    const pedidos = api({ 'POST /api/relacion/r2/archivar': { cuerpo: {} } });
    mostrar();

    const relaciones = await screen.findByRole('region', { name: 'Relaciones' });
    fireEvent.click(within(relaciones).getByRole('button', { name: 'Quitar la relación con SHI-128' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Se quitó la relación con SHI-128.');
    expect(within(relaciones).queryByText('SHI-128 · Importar sprints')).not.toBeInTheDocument();
    expect(pedidos.some((p) => p.ruta === '/api/relacion/r2/archivar')).toBe(true);
    expect(within(relaciones).queryByRole('button', { name: 'Quitar la relación con SHI-147' })).not.toBeInTheDocument();
  });

  it('archivar pide confirmación, archiva y vuelve al tablero', async () => {
    const pedidos = api({ 'POST /api/tarea/u-SHI-149/archivar': { cuerpo: tareaDetalle({ status: -1 }) } });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Archivar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Archivar tarea' });
    expect(within(dialogo).getByText('También se archivan sus 2 subtareas')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Archivar' }));

    await vi.waitFor(() => expect(window.location.pathname).toBe('/proyecto/SHI/PRINCIPAL'));
    expect(pedidos.some((p) => p.ruta === '/api/tarea/u-SHI-149/archivar')).toBe(true);
  });
});
