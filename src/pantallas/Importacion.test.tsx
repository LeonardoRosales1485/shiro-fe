// T6.5: importar desde Jira (prototipos "Importar desde Jira": conexión, tableros, estados, usuarios, importación en
// curso y resumen). Se conecta con un proyecto de Jira, se mapean tableros, estados y tipos, se ejecuta en segundo
// plano y se muestra el resumen. El token se manda una sola vez y nunca se vuelve a mostrar.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TIPOS_DE_TABLERO, TIPOS_DE_TAREA, error, simularApi, type Respuesta } from '../pruebas/api';
import { USUARIOS } from './administracion/datosDePrueba';
import { Importacion } from './Importacion';

const CATALOGO = {
  importacionUuid: 'i1',
  nombreProyectoJira: 'Portal de Trámites',
  tableros: [{ idJira: '10', nombre: 'PTR Desarrollo' }, { idJira: '11', nombre: 'PTR Testing' }, { idJira: '12', nombre: 'PTR Viejo' }],
  estados: [
    { idJira: '1', nombre: 'To Do', terminado: false },
    { idJira: '2', nombre: 'En curso', terminado: false },
    { idJira: '3', nombre: 'Done', terminado: true },
  ],
  tipos: [{ idJira: '100', nombre: 'Epic', nivel: 1 }, { idJira: '101', nombre: 'Story', nivel: 2 }, { idJira: '102', nombre: 'Spike', nivel: 2 }],
  usuarios: [
    { correo: 'lucas.benitez@blueopendata.com', nombre: 'Lucas Benítez', usuarioUuid: 'u2' },
    { correo: 'ext.consultora@proveedor.com', nombre: 'Consultora', usuarioUuid: null },
  ],
};

const RESUMEN = {
  tareasCreadas: 40, tareasActualizadas: 2, tareasPorTipo: { HISTORIA: 30, EPICA: 12 }, comentarios: 120, sprints: 5, versiones: 2,
  fallas: [{ claveJira: 'PTR-201', motivo: 'Tipo «Spike» sin mapear' }], advertencias: [], usuariosImportados: ['Usuario importado Consultora'],
};

function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}) {
  return simularApi({
    'POST /api/importacion/paginar': { cuerpo: { contenido: [] } },
    'GET /api/usuario/administracion': { cuerpo: USUARIOS },
    ...extra,
  });
}

function mostrar(alIrAlTablero = vi.fn()) {
  render(<Importacion tiposDeTablero={TIPOS_DE_TABLERO} tiposDeTarea={TIPOS_DE_TAREA} intervaloDeConsulta={5} alIrAlTablero={alIrAlTablero} />);
}

describe('Importacion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('conecta, mapea tableros, estados, tipos y usuarios, importa y muestra el resumen', async () => {
    let consultas = 0;
    const alIrAlTablero = vi.fn();
    const pedidos = api({
      'POST /api/importacion/conectar': { cuerpo: CATALOGO },
      'POST /api/importacion/i1/mapeo': { cuerpo: { uuid: 'i1', estado: 'MAPEADA', prefijo: 'PTR' } },
      'POST /api/importacion/i1/ejecutar': { cuerpo: { uuid: 'i1', estado: 'EN_CURSO', prefijo: 'PTR' } },
      'GET /api/importacion/uuid/i1': () => {
        consultas += 1;
        return { cuerpo: consultas < 2
          ? { uuid: 'i1', estado: 'EN_CURSO', prefijo: 'PTR', resumen: null }
          : { uuid: 'i1', estado: 'TERMINADA', prefijo: 'PTR', nombreProyectoJira: 'Portal de Trámites', resumen: JSON.stringify(RESUMEN) } };
      },
    });
    mostrar(alIrAlTablero);

    fireEvent.change(await screen.findByLabelText('URL de Jira'), { target: { value: 'https://empresa.atlassian.net' } });
    fireEvent.change(screen.getByLabelText('Correo de la cuenta'), { target: { value: 'admin@empresa.com' } });
    fireEvent.change(screen.getByLabelText('Token de la API'), { target: { value: 'secreto-de-prueba' } });
    fireEvent.change(screen.getByLabelText('Clave del proyecto en Jira'), { target: { value: 'PTR' } });
    fireEvent.change(screen.getByLabelText('Prefijo en Shiro'), { target: { value: 'ptr' } });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    expect(await screen.findByText('Conectado con «Portal de Trámites»: 3 tableros, 3 tipos y 2 usuarios.')).toBeInTheDocument();
    expect(pedidos.find((p) => p.ruta === '/api/importacion/conectar')?.cuerpo).toEqual({
      url: 'https://empresa.atlassian.net', correo: 'admin@empresa.com', token: 'secreto-de-prueba', claveProyecto: 'PTR', prefijo: 'PTR',
    });
    expect(screen.queryByDisplayValue('secreto-de-prueba')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: tableros' }));

    const tableros = screen.getByRole('table', { name: 'Tableros de Jira' });
    expect(within(tableros).getByLabelText('Tablero en Shiro de PTR Desarrollo')).toHaveValue('tt1');
    fireEvent.change(within(tableros).getByLabelText('Tablero en Shiro de PTR Testing'), { target: { value: 'tt2' } });
    expect(within(tableros).getByLabelText('Tablero en Shiro de PTR Viejo')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: estados' }));

    const principal = screen.getByRole('table', { name: 'Estados de PTR Desarrollo' });
    expect(within(principal).getByLabelText('Estado en Shiro de To Do')).toHaveValue('e1');
    expect(within(principal).getByLabelText('Estado en Shiro de En curso')).toHaveValue('e2');
    expect(within(principal).getByLabelText('Estado en Shiro de Done')).toHaveValue('e5');
    const tipos = screen.getByRole('table', { name: 'Tipos de Jira' });
    expect(within(tipos).getByLabelText('Tipo en Shiro de Epic')).toHaveValue('y1');
    expect(within(tipos).getByLabelText('Tipo en Shiro de Story')).toHaveValue('y2');
    fireEvent.change(within(tipos).getByLabelText('Tipo en Shiro de Spike'), { target: { value: 'crear' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: usuarios' }));

    const usuarios = screen.getByRole('table', { name: 'Usuarios de Jira' });
    expect(within(usuarios).getByRole('row', { name: /lucas.benitez@blueopendata.com Lucas Benítez Vinculado/ })).toBeInTheDocument();
    expect(within(usuarios).getByRole('row', { name: /ext.consultora@proveedor.com — Se crea sin acceso/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }));

    expect(await screen.findByText(/Importación terminada/)).toBeInTheDocument();
    const mapeo = pedidos.find((p) => p.ruta === '/api/importacion/i1/mapeo')?.cuerpo as { tableros: unknown[]; tipos: unknown[]; duracionDeSprintEnDias: number };
    expect(mapeo.duracionDeSprintEnDias).toBe(14);
    expect(mapeo.tableros).toEqual([
      { idJira: '10', tipoTableroUuid: 'tt1', estados: [
        { idJira: '1', estadoUuid: 'e1', crear: false }, { idJira: '2', estadoUuid: 'e2', crear: false }, { idJira: '3', estadoUuid: 'e5', crear: false },
      ] },
      { idJira: '11', tipoTableroUuid: 'tt2', estados: [
        { idJira: '1', estadoUuid: 'q1', crear: false }, { idJira: '2', estadoUuid: 'q1', crear: false }, { idJira: '3', estadoUuid: 'q1', crear: false },
      ] },
    ]);
    expect(mapeo.tipos).toContainEqual({ idJira: '102', tipoTareaUuid: null, crear: true });
    const resumen = screen.getByRole('region', { name: 'Resumen de la importación' });
    expect(within(resumen).getByText('42')).toBeInTheDocument();
    expect(within(resumen).getByText(/PTR-201: Tipo «Spike» sin mapear/)).toBeInTheDocument();
    expect(within(resumen).getByText(/Usuario importado Consultora/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ir al tablero' }));
    expect(alIrAlTablero).toHaveBeenCalledWith('PTR');
  });

  it('muestra el error de conexión', async () => {
    api({ 'POST /api/importacion/conectar': error(400, 'JIRA_URL_NO_PERMITIDA', 'La URL tiene que ser un sitio de Jira Cloud.') });
    mostrar();

    fireEvent.change(await screen.findByLabelText('URL de Jira'), { target: { value: 'https://otro.com' } });
    fireEvent.change(screen.getByLabelText('Correo de la cuenta'), { target: { value: 'admin@empresa.com' } });
    fireEvent.change(screen.getByLabelText('Token de la API'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Clave del proyecto en Jira'), { target: { value: 'PTR' } });
    fireEvent.change(screen.getByLabelText('Prefijo en Shiro'), { target: { value: 'PTR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La URL tiene que ser un sitio de Jira Cloud.');
  });

  it('lista las importaciones anteriores y abre su resumen para volver a importar', async () => {
    const pedidos = api({
      'POST /api/importacion/paginar': { cuerpo: { contenido: [
        { uuid: 'i0', prefijo: 'MDA', claveProyectoJira: 'MDA', nombreProyectoJira: 'Mesa de Ayuda', estado: 'TERMINADA', fechaDeActualizacion: '2026-11-18T16:12:00.000-03:00' },
      ] } },
      'GET /api/importacion/uuid/i0': { cuerpo: { uuid: 'i0', estado: 'TERMINADA', prefijo: 'MDA', nombreProyectoJira: 'Mesa de Ayuda', resumen: JSON.stringify(RESUMEN) } },
      'POST /api/importacion/i0/ejecutar': { cuerpo: { uuid: 'i0', estado: 'EN_CURSO', prefijo: 'MDA' } },
    });
    mostrar();

    const anteriores = await screen.findByRole('table', { name: 'Importaciones anteriores' });
    expect(within(anteriores).getByRole('row', { name: /MDA Mesa de Ayuda Terminada 18\/11\/2026/ })).toBeInTheDocument();
    fireEvent.click(within(anteriores).getByRole('button', { name: 'Ver resumen de MDA' }));
    expect(await screen.findByRole('region', { name: 'Resumen de la importación' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a importar' }));
    await waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/importacion/i0/ejecutar')).toBe(true));
  });
});
