// T6.5: permisos por grupo y excepciones por usuario de un proyecto (prototipos "Permisos", "Cambiar permisos de un
// grupo" y "Excepción por usuario"). Cada regla permite o niega un nivel (Ver, Editar o Archivar) sobre el proyecto
// o un tablero; Editar y Archivar permitidos incluyen Ver.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROYECTO, simularApi, type Respuesta } from '../../pruebas/api';
import { GRUPOS, USUARIOS } from './datosDePrueba';
import { Permisos } from './Permisos';

function regla(uuid: string, sujeto: { rol?: string; usuario?: string }, recurso: { proyecto?: string; tablero?: string }, nivel: string, efecto: string) {
  const grupo = GRUPOS.find((g) => g.uuid === sujeto.rol);
  const usuario = USUARIOS.find((u) => u.uuid === sujeto.usuario);
  const tablero = PROYECTO.tableros.find((t) => t.uuid === recurso.tablero);
  return {
    uuid, tipoSujeto: sujeto.rol ? 'ROL' : 'USUARIO', rolUuid: sujeto.rol ?? null, rolNombre: grupo?.nombre ?? null,
    usuarioUuid: sujeto.usuario ?? null, usuarioNombreDeUsuario: usuario?.nombreDeUsuario ?? null,
    tipoRecurso: recurso.proyecto ? 'PROYECTO' : 'TABLERO', proyectoUuid: recurso.proyecto ?? null, proyectoPrefijo: recurso.proyecto ? 'SHI' : null,
    tableroUuid: recurso.tablero ?? null, tableroCodigo: tablero?.tipoTableroCodigo ?? null, tableroProyectoPrefijo: recurso.tablero ? 'SHI' : null,
    nivel, efecto,
  };
}

const REGLAS = [
  regla('r1', { rol: 'gP' }, { proyecto: 'p1' }, 'EDITAR', 'PERMITIR'),
  regla('r2', { rol: 'gQ' }, { tablero: 't2' }, 'ARCHIVAR', 'PERMITIR'),
  regla('r3', { rol: 'gQ' }, { tablero: 't1' }, 'VER', 'NEGAR'),
  regla('r4', { usuario: 'u3' }, { tablero: 't1' }, 'VER', 'PERMITIR'),
];

function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}) {
  return simularApi({ 'POST /api/regla-permiso/paginar': { cuerpo: { contenido: REGLAS } }, ...extra });
}

function mostrar() {
  render(<Permisos proyectos={[PROYECTO]} grupos={GRUPOS} usuarios={USUARIOS} />);
}

describe('Permisos', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra los permisos de cada grupo por proyecto y tablero, y las excepciones por usuario', async () => {
    const pedidos = api();
    mostrar();

    const tabla = await screen.findByRole('table', { name: 'Permisos por grupo' });
    expect(within(tabla).getByRole('row', { name: /Administradores Todo Todo Todo/ })).toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /Programadores Editar — —/ })).toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /QA — Niega Ver Archivar/ })).toBeInTheDocument();
    expect(pedidos[0].cuerpo).toMatchObject({ filtros: [[
      { campo: 'proyecto.uuid', operacion: '=', valor: 'p1' }, { campo: 'tablero.proyecto.uuid', operacion: '=', valor: 'p1' },
    ]] });
    const excepciones = screen.getByRole('list', { name: 'Excepciones por usuario' });
    expect(within(excepciones).getByText('Rocío Villalba · Principal: Ver')).toBeInTheDocument();
    expect(within(excepciones).getByText('Da permiso')).toBeInTheDocument();
  });

  it('cambia los permisos de un grupo: crea, cambia el efecto y archiva reglas', async () => {
    const pedidos = api({
      'POST /api/regla-permiso/guardar': (cuerpo) => ({ cuerpo: { uuid: 'rN', ...(cuerpo as object) } }),
      'POST /api/regla-permiso/r3/archivar': { cuerpo: {} },
    });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar permisos de QA' }));
    const modal = screen.getByRole('dialog', { name: 'Cambiar permisos de un grupo' });
    expect(within(modal).getByLabelText('Principal · Ver')).toHaveValue('NEGAR');
    fireEvent.change(within(modal).getByLabelText('Principal · Ver'), { target: { value: '' } });
    fireEvent.change(within(modal).getByLabelText('QA · Archivar'), { target: { value: 'NEGAR' } });
    fireEvent.change(within(modal).getByLabelText('Proyecto · Ver'), { target: { value: 'PERMITIR' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Guardar permisos' }));

    await waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/regla-permiso/r3/archivar')).toBe(true));
    const guardados = pedidos.filter((p) => p.ruta === '/api/regla-permiso/guardar').map((p) => p.cuerpo);
    expect(guardados).toContainEqual(expect.objectContaining({ uuid: 'r2', efecto: 'NEGAR', nivel: 'ARCHIVAR', tableroUuid: 't2', rolUuid: 'gQ' }));
    expect(guardados).toContainEqual({ tipoSujeto: 'ROL', rolUuid: 'gQ', tipoRecurso: 'PROYECTO', proyectoUuid: 'p1', nivel: 'VER', efecto: 'PERMITIR' });
    expect(guardados).toHaveLength(2);
  });

  it('agrega una excepción mostrando lo que hoy hereda de sus grupos, y quita otra', async () => {
    const pedidos = api({
      'POST /api/regla-permiso/guardar': (cuerpo) => ({ cuerpo: { uuid: 'rN', ...(cuerpo as object) } }),
      'POST /api/regla-permiso/r4/archivar': { cuerpo: {} },
    });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Agregar excepción' }));
    const modal = screen.getByRole('dialog', { name: 'Excepción por usuario' });
    fireEvent.change(within(modal).getByLabelText('Persona'), { target: { value: 'u2' } });
    fireEvent.change(within(modal).getByLabelText('Alcance'), { target: { value: 't2' } });
    fireEvent.change(within(modal).getByLabelText('Nivel'), { target: { value: 'VER' } });
    expect(within(modal).getByText('Por sus grupos hoy puede ver en el tablero QA. La excepción prevalece aunque cambien sus grupos.')).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('radio', { name: 'Quita permiso' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Guardar excepción' }));

    await waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/regla-permiso/guardar')?.cuerpo).toEqual({
      tipoSujeto: 'USUARIO', usuarioUuid: 'u2', tipoRecurso: 'TABLERO', tableroUuid: 't2', nivel: 'VER', efecto: 'NEGAR',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Quitar la excepción de Rocío Villalba' }));
    await waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/regla-permiso/r4/archivar')).toBe(true));
  });
});
