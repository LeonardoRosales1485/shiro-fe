// T6.5: proyectos en la administración (prototipos "Administración · proyectos" y "Editar proyecto"): tableros,
// sprint activo, cantidad de tareas y estado; editar el nombre (el prefijo no cambia), archivar y restaurar.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROYECTO, simularApi, type Respuesta } from '../../pruebas/api';
import { ProyectosAdministrados } from './ProyectosAdministrados';

function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}) {
  return simularApi({
    'POST /api/proyecto/paginar': { cuerpo: { contenido: [{ ...PROYECTO, cantidadDeTareas: 176 }] } },
    'POST /api/sprint/paginar': { cuerpo: { contenido: [{ uuid: 's1', nombre: 'Sprint 14', estado: 'ACTIVO', proyectoUuid: 'p1' }] } },
    'POST /api/archivo/paginar': { cuerpo: { contenido: [{ uuid: 'p9', tipo: 'PROYECTO', nombre: 'Intranet 2024', proyectoPrefijo: 'INT' }] } },
    ...extra,
  });
}

describe('ProyectosAdministrados', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lista los proyectos con sus tableros, sprint activo y tareas, y los archivados a pedido', async () => {
    const pedidos = api();
    render(<ProyectosAdministrados alCambiar={vi.fn()} />);

    const tabla = await screen.findByRole('table', { name: 'Proyectos' });
    expect(within(tabla).getByRole('row', { name: /Shiro SHI Principal, QA Sprint 14 176 Activo/ })).toBeInTheDocument();
    expect(within(tabla).queryByText('Intranet 2024')).not.toBeInTheDocument();
    expect(pedidos.find((p) => p.ruta === '/api/sprint/paginar')?.cuerpo).toMatchObject({ filtros: [[{ campo: 'estado', operacion: '=', valor: 'ACTIVO' }]] });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar archivados' }));
    expect(within(tabla).getByRole('row', { name: /Intranet 2024 INT .* Archivado/ })).toBeInTheDocument();
  });

  it('edita el nombre sin cambiar el prefijo, archiva y restaura', async () => {
    const alCambiar = vi.fn();
    const pedidos = api({
      'POST /api/proyecto/guardar': (cuerpo) => ({ cuerpo }),
      'POST /api/proyecto/p1/archivar': { cuerpo: {} },
      'POST /api/proyecto/p9/restaurar': { cuerpo: {} },
    });
    render(<ProyectosAdministrados alCambiar={alCambiar} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar Shiro' }));
    const modal = screen.getByRole('dialog', { name: 'Editar proyecto' });
    expect(within(modal).getByLabelText('Prefijo de clave')).toBeDisabled();
    fireEvent.change(within(modal).getByLabelText('Nombre'), { target: { value: 'Shiro 2' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/proyecto/guardar')?.cuerpo).toEqual({
      uuid: 'p1', nombre: 'Shiro 2', prefijo: 'SHI', descripcion: null,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Archivar Shiro' }));
    const confirmar = screen.getByRole('dialog', { name: 'Archivar proyecto' });
    expect(within(confirmar).getByText(/Se archivan sus tableros y sus 176 tareas/)).toBeInTheDocument();
    fireEvent.click(within(confirmar).getByRole('button', { name: 'Archivar' }));
    await waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/proyecto/p1/archivar')).toBe(true));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar archivados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar Intranet 2024' }));
    await waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/proyecto/p9/restaurar')).toBe(true));
    expect(alCambiar).toHaveBeenCalled();
  });
});
