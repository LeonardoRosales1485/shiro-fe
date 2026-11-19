// T6.3: versiones del proyecto con su changelog (prototipos "Versiones", "Agregar tareas a una versión",
// "Publicar versión" y "Versión publicada").
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pagina, PROYECTO, simularApi, TAREAS_DE_VERSION, tareaDePlan, TIPOS_DE_TABLERO, VERSIONES, type Respuesta } from '../pruebas/api';
import { Versiones } from './Versiones';

const CHANGELOG = '# 1.0.0\n\nSin publicar.\n\n## Historia\n\n- SHI-104 Ingreso con Google\n';

function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}) {
  return simularApi({
    'POST /api/version/paginar': { cuerpo: pagina(VERSIONES) },
    'GET /api/version/v10/tareas': { cuerpo: TAREAS_DE_VERSION },
    'GET /api/version/v10/changelog': { texto: CHANGELOG },
    'GET /api/version/v09/tareas': { cuerpo: [TAREAS_DE_VERSION[0]] },
    'GET /api/version/v09/changelog': { texto: '# 0.9.0\n' },
    ...extra,
  });
}

const mostrar = () => render(<Versiones proyecto={PROYECTO} tiposDeTablero={TIPOS_DE_TABLERO} />);

describe('Versiones', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lista las versiones y muestra la sin publicar con sus números y su changelog', async () => {
    const pedidos = api();
    mostrar();

    const tabla = await screen.findByRole('table', { name: 'Versiones' });
    expect(within(tabla).getByRole('row', { name: /1\.0\.0 Sin publicar — 3/ })).toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /0\.9\.0 Publicada 30\/10\/2026 27/ })).toBeInTheDocument();
    const detalle = await screen.findByRole('region', { name: '1.0.0' });
    expect(await within(detalle).findByText('Hechas 2 / 3')).toBeInTheDocument();
    expect(within(detalle).getByText('Historias 1')).toBeInTheDocument();
    expect(within(detalle).getByText('Bugs 1')).toBeInTheDocument();
    expect(within(detalle).getByText(/SHI-104 Ingreso con Google/, { selector: 'pre' })).toBeInTheDocument();
    expect((pedidos[0].cuerpo as { filtros: unknown[][] }).filtros[0][0]).toEqual({ campo: 'proyecto.uuid', operacion: '=', valor: 'p1' });
  });

  it('crear una versión', async () => {
    const pedidos = api({ 'POST /api/version/guardar': (cuerpo) => ({ cuerpo: { ...(cuerpo as object), uuid: 'v11', estado: 'SIN_PUBLICAR' } }) });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva versión' }));
    fireEvent.change(screen.getByLabelText('Nombre de la versión'), { target: { value: '1.1.0' } });
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Nueva versión' })).getByRole('button', { name: 'Crear versión' }));

    await vi.waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/version/guardar')?.cuerpo).toEqual({ proyectoUuid: 'p1', nombre: '1.1.0' }));
  });

  it('agregar tareas a la versión, por defecto las terminadas', async () => {
    const pedidos = api({
      'POST /api/tarea/paginar': { cuerpo: pagina([
        tareaDePlan('SHI-133', 'Tokens personales', { estadoUuid: 'e5' }),
        tareaDePlan('SHI-136', 'Estados fijos', { estadoUuid: 'e1' }),
        tareaDePlan('SHI-104', 'Ingreso con Google', { estadoUuid: 'e5' }),
      ]) },
      'POST /api/version/v10/asignar': { cuerpo: {} },
    });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Agregar tareas a 1.0.0' }));
    const dialogo = screen.getByRole('dialog', { name: 'Agregar tareas a una versión' });
    expect(await within(dialogo).findByRole('checkbox', { name: /SHI-133/ })).toBeInTheDocument();
    expect(within(dialogo).queryByRole('checkbox', { name: /SHI-136/ })).not.toBeInTheDocument();
    expect(within(dialogo).queryByRole('checkbox', { name: /SHI-104/ })).not.toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Todos' }));
    fireEvent.click(within(dialogo).getByRole('checkbox', { name: /SHI-136/ }));
    fireEvent.click(within(dialogo).getByRole('checkbox', { name: /SHI-133/ }));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Agregar a 1.0.0' }));

    await vi.waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/version/v10/asignar')?.cuerpo).toEqual({ tareas: ['u-SHI-136', 'u-SHI-133'] }));
  });

  it('publicar avisa lo que queda sin terminar y manda la fecha elegida', async () => {
    const pedidos = api({ 'POST /api/version/v10/publicar': { cuerpo: { ...VERSIONES[0], estado: 'PUBLICADA', fechaDePublicacion: '2026-11-30' } } });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Publicar versión' }));
    const dialogo = screen.getByRole('dialog', { name: 'Publicar versión' });
    expect(await within(dialogo).findByText('Hay 1 tarea sin terminar. Sigue en la versión pero no entra en el changelog.')).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Fecha de publicación'), { target: { value: '2026-11-30' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Publicar' }));

    await vi.waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/version/v10/publicar')?.cuerpo).toEqual({ fecha: '2026-11-30' }));
  });

  it('una versión publicada no se modifica', async () => {
    api();
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: '0.9.0' }));

    const detalle = await screen.findByRole('region', { name: '0.9.0' });
    expect(within(detalle).getByText('Publicada el 30/10/2026 por Martina Ferreyra')).toBeInTheDocument();
    expect(within(detalle).getByText('Una versión publicada no se modifica: sus tareas y su changelog quedan como estaban al publicarla.')).toBeInTheDocument();
    expect(within(detalle).queryByRole('button', { name: /Agregar tareas/ })).not.toBeInTheDocument();
    expect(within(detalle).queryByRole('button', { name: 'Publicar versión' })).not.toBeInTheDocument();
    expect(within(detalle).queryByRole('button', { name: /^Quitar/ })).not.toBeInTheDocument();
  });

  it('quitar una tarea de la versión sin publicar', async () => {
    const pedidos = api({ 'POST /api/version/v10/quitar': { cuerpo: {} } });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Quitar SHI-118 de la versión' }));

    await vi.waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/version/v10/quitar')?.cuerpo).toEqual({ tareas: ['u-SHI-118'] }));
  });

  it('copiar el changelog', async () => {
    api();
    const escribir = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: escribir } });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Copiar Markdown' }));

    await vi.waitFor(() => expect(escribir).toHaveBeenCalledWith(CHANGELOG));
    expect(await screen.findByRole('status')).toHaveTextContent('Changelog copiado.');
  });

  it('archivar una versión', async () => {
    const pedidos = api({ 'POST /api/version/v10/archivar': { cuerpo: {} } });
    mostrar();

    const detalle = await screen.findByRole('region', { name: '1.0.0' });
    fireEvent.click(within(detalle).getByRole('button', { name: 'Archivar' }));

    await vi.waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/version/v10/archivar')).toBe(true));
  });
});
