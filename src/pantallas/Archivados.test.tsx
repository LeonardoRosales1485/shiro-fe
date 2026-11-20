// T6.4: archivados por tipo, con quién y cuándo, y restaurar (prototipos "Archivados" y "Restaurar archivado").
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { error, pagina, simularApi, type Respuesta } from '../pruebas/api';
import { Archivados } from './Archivados';

const TAREAS = [
  { uuid: 'u-SHI-087', tipo: 'TAREA', nombre: 'SHI-087 Exportar tablero a CSV', proyectoPrefijo: 'SHI', fechaDeBorrado: '2026-11-14T10:00:00.000-03:00',
    archivadoPorNombre: 'Martina Ferreyra', incluidos: 2 },
];

const VISTA_PREVIA = {
  uuid: 'u-SHI-087', tipo: 'TAREA', nombre: 'SHI-087 Exportar tablero a CSV', ubicacion: 'Principal · Por hacer', descripcion: '**CSV** del tablero',
  padreArchivado: false, cantidadQueSeRestaura: 2,
  seRestauran: [{ uuid: 'u-SHI-088', nombre: 'SHI-088 Armar el CSV', fechaDeBorrado: '2026-11-14T10:00:00.000-03:00' },
    { uuid: 'u-SHI-089', nombre: 'SHI-089 Botón de descarga', fechaDeBorrado: '2026-11-14T10:00:00.000-03:00' }],
  quedanArchivadas: [{ uuid: 'u-SHI-086', nombre: 'SHI-086 Exportar a Excel', fechaDeBorrado: '2026-11-10T10:00:00.000-03:00' }],
};

function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}) {
  return simularApi({
    'POST /api/archivo/paginar': (cuerpo) => ({ cuerpo: { ...pagina((cuerpo as { tipo: string }).tipo === 'TAREA' ? TAREAS : []), totalDeElementos: 1 } }),
    'GET /api/archivo/TAREA/u-SHI-087/vista-previa': { cuerpo: VISTA_PREVIA },
    ...extra,
  });
}

describe('Archivados', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra las tareas archivadas con fecha y quién, y busca por texto', async () => {
    const pedidos = api();
    render(<Archivados esAdministrador={false} />);

    const tabla = await screen.findByRole('table', { name: 'Archivados' });
    expect(await within(tabla).findByRole('row', { name: /SHI-087 Exportar tablero a CSV SHI 14\/11\/2026 Martina Ferreyra 2 tareas/ })).toBeInTheDocument();
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
    expect(await within(dialogo).findByText('Vuelve a Principal · Por hacer, como estaba al archivarse.')).toBeInTheDocument();
    const seRestauran = within(dialogo).getByRole('list', { name: 'Se restauran (2)' });
    expect(within(seRestauran).getByText('SHI-088 Armar el CSV')).toBeInTheDocument();
    const quedan = within(dialogo).getByRole('list', { name: 'Quedan archivadas (1)' });
    expect(within(quedan).getByText('SHI-086 Exportar a Excel · archivada por separado el 10/11/2026')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Restaurar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Se restauró SHI-087 Exportar tablero a CSV.');
    expect(pedidos.some((p) => p.ruta === '/api/tarea/u-SHI-087/restaurar')).toBe(true);
  });

  it('ver muestra el archivado con su descripción', async () => {
    api();
    render(<Archivados esAdministrador={false} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Ver SHI-087 Exportar tablero a CSV' }));

    const dialogo = screen.getByRole('dialog', { name: 'SHI-087 Exportar tablero a CSV' });
    expect((await within(dialogo).findByText('CSV')).tagName).toBe('STRONG');
  });

  it('si el padre sigue archivado avisa y no deja restaurar', async () => {
    api({ 'GET /api/archivo/TAREA/u-SHI-087/vista-previa': { cuerpo: { ...VISTA_PREVIA, padreArchivado: true } } });
    render(<Archivados esAdministrador={false} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar SHI-087 Exportar tablero a CSV' }));
    const dialogo = screen.getByRole('dialog', { name: 'Restaurar archivado' });

    expect(await within(dialogo).findByText('Su tarea padre sigue archivada: restaurala primero.')).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'Restaurar' })).toBeDisabled();
  });

  it('si no se puede restaurar muestra el motivo', async () => {
    api({ 'POST /api/tarea/u-SHI-087/restaurar': error(400, 'PADRE_ARCHIVADO', 'Restaurá primero la tarea padre.') });
    render(<Archivados esAdministrador={false} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar SHI-087 Exportar tablero a CSV' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Restaurar archivado' })).getByRole('button', { name: 'Restaurar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Restaurá primero la tarea padre.');
  });
});
