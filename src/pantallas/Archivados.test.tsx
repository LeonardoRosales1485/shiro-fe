// T6.4: archivados por tipo, con quién y cuándo, y restaurar (prototipos "Archivados" y "Restaurar archivado").
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { error, pagina, simularApi, type Respuesta } from '../pruebas/api';
import { Archivados } from './Archivados';

const TAREAS = [
  { uuid: 'u-SHI-087', tipo: 'TAREA', nombre: 'SHI-087 Exportar tablero a CSV', proyectoPrefijo: 'SHI', fechaDeBorrado: '2026-11-14T10:00:00.000-03:00',
    archivadoPorNombre: 'Martina Ferreyra' },
];

function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}) {
  return simularApi({
    'POST /api/archivo/paginar': (cuerpo) => ({ cuerpo: { ...pagina((cuerpo as { tipo: string }).tipo === 'TAREA' ? TAREAS : []), totalDeElementos: 1 } }),
    ...extra,
  });
}

describe('Archivados', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra las tareas archivadas con fecha y quién, y busca por texto', async () => {
    const pedidos = api();
    render(<Archivados esAdministrador={false} />);

    const tabla = await screen.findByRole('table', { name: 'Archivados' });
    expect(await within(tabla).findByRole('row', { name: /SHI-087 Exportar tablero a CSV SHI 14\/11\/2026 Martina Ferreyra/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Usuarios' })).not.toBeInTheDocument();
    expect(screen.getByText('Nada se borra en Shiro. Lo archivado sale de tableros y listados, y al restaurarlo vuelve a su lugar anterior.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar en archivados'), { target: { value: 'csv' } });
    await vi.waitFor(() => expect(pedidos.at(-1)?.cuerpo).toEqual({ pagina: 1, tamano: 50, tipo: 'TAREA', texto: 'csv' }));
  });

  it('cambia de tipo con las pestañas; los usuarios solo para administradores', async () => {
    const pedidos = api();
    render(<Archivados esAdministrador />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Versiones' }));

    await vi.waitFor(() => expect((pedidos.at(-1)?.cuerpo as { tipo: string }).tipo).toBe('VERSION'));
    expect(await screen.findByText('No hay versiones archivadas.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Usuarios' })).toBeInTheDocument();
  });

  it('restaurar pide confirmación y usa el endpoint de su tipo', async () => {
    const pedidos = api({ 'POST /api/tarea/u-SHI-087/restaurar': { cuerpo: {} } });
    render(<Archivados esAdministrador={false} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar SHI-087 Exportar tablero a CSV' }));
    const dialogo = screen.getByRole('dialog', { name: 'Restaurar archivado' });
    expect(within(dialogo).getByText('¿Restaurar SHI-087 Exportar tablero a CSV?')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Restaurar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Se restauró SHI-087 Exportar tablero a CSV.');
    expect(pedidos.some((p) => p.ruta === '/api/tarea/u-SHI-087/restaurar')).toBe(true);
  });

  it('si no se puede restaurar muestra el motivo', async () => {
    api({ 'POST /api/tarea/u-SHI-087/restaurar': error(400, 'PADRE_ARCHIVADO', 'Restaurá primero la tarea padre.') });
    render(<Archivados esAdministrador={false} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar SHI-087 Exportar tablero a CSV' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Restaurar archivado' })).getByRole('button', { name: 'Restaurar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Restaurá primero la tarea padre.');
  });
});
