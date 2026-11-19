// T6.4: búsqueda de tareas en todos los proyectos visibles, con texto y filtros (prototipo "Búsqueda").
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pagina, PROYECTO, simularApi, SPRINTS, TIPOS_DE_TABLERO, TIPOS_DE_TAREA, USUARIO, USUARIOS_DEL_PROYECTO, VERSIONES, type Pedido } from '../pruebas/api';
import { Busqueda } from './Busqueda';

const RESULTADOS = [
  { uuid: 'u-SHI-128', clave: 'SHI-128', titulo: 'Importar sprints', proyectoUuid: 'p1', tableroCodigo: 'PRINCIPAL', estadoNombre: 'En curso',
    responsableNombre: 'Lucas Benítez', sprintNombre: 'Sprint 14', tipoCodigo: 'TAREA' },
  { uuid: 'u-SHI-164', clave: 'SHI-164', titulo: 'Reimportar', proyectoUuid: 'p1', tableroCodigo: 'QA', estadoNombre: 'Por probar',
    responsableNombre: null, sprintNombre: null, tipoCodigo: 'BUG' },
];

function api() {
  return simularApi({
    'POST /api/tarea/paginar': { cuerpo: { ...pagina(RESULTADOS), totalDeElementos: 2 } },
    'GET /api/proyecto/p1/usuarios': { cuerpo: USUARIOS_DEL_PROYECTO },
    'POST /api/sprint/paginar': { cuerpo: pagina(SPRINTS) },
    'POST /api/version/paginar': { cuerpo: pagina(VERSIONES) },
  });
}

// Ultimo pedido de busqueda de tareas
const ultimo = (pedidos: Pedido[]) => pedidos.filter((p) => p.ruta === '/api/tarea/paginar').at(-1)?.cuerpo as {
  filtros: { campo: string; valor: string }[][]; parametros?: { nombre: string; valor: string }[]; pagina: number;
};

// Marca una opcion de un filtro de varios valores (si esperar, espera a que el filtro aparezca)
function elegir(filtro: string, opcion: string, esperar = false) {
  const grupo = screen.getAllByRole('group', { name: filtro })[0];
  void esperar;
  fireEvent.click(within(grupo).getByRole('checkbox', { name: opcion }));
}

const mostrar = () => render(<Busqueda proyectos={[PROYECTO]} tiposDeTablero={TIPOS_DE_TABLERO} tiposDeTarea={TIPOS_DE_TAREA} usuario={USUARIO} />);

describe('Busqueda', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('muestra los resultados con su tablero, estado, responsable y sprint', async () => {
    api();
    mostrar();

    const tabla = await screen.findByRole('table', { name: 'Resultados' });
    expect(await within(tabla).findByRole('row', { name: /SHI-128 Importar sprints Shiro · Principal En curso Lucas Benítez Sprint 14/ })).toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /SHI-164 Reimportar Shiro · QA Por probar — —/ })).toBeInTheDocument();
    expect(screen.getByText('2 resultados')).toBeInTheDocument();
    expect(within(tabla).getByRole('link', { name: 'SHI-128' })).toHaveAttribute('href', '/proyecto/SHI/tarea/SHI-128');
  });

  it('el texto y los filtros arman el pedido; varios valores de un filtro se combinan con O', async () => {
    const pedidos = api();
    mostrar();

    fireEvent.change(await screen.findByLabelText('Buscar'), { target: { value: 'importar' } });
    fireEvent.change(screen.getByLabelText('Proyecto'), { target: { value: 'p1' } });
    elegir('Tablero', 'QA');
    elegir('Tipo', 'Bug');
    elegir('Tipo', 'Historia');
    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: 'importador' } });
    elegir('Sprint', 'Sprint 14', true);
    elegir('Sprint', 'Sin sprint (backlog)');
    fireEvent.change(screen.getByLabelText('Versión'), { target: { value: 'v10' } });

    await vi.waitFor(() => {
      const pedido = ultimo(pedidos);
      expect(pedido.filtros).toEqual(expect.arrayContaining([
        [{ campo: 'proyecto.uuid', operacion: '=', valor: 'p1' }],
        [{ campo: 'tablero.tipoTablero.codigo', operacion: '=', valor: 'QA' }],
        [{ campo: 'tipo.codigo', operacion: '=', valor: 'BUG' }, { campo: 'tipo.codigo', operacion: '=', valor: 'HISTORIA' }],
        [{ campo: 'sprint.uuid', operacion: '=', valor: 's14' }, { campo: 'sprint.uuid', operacion: 'is null', valor: '' }],
      ]));
      expect(pedido.parametros).toEqual(expect.arrayContaining([
        { nombre: 'texto', valor: 'importar' }, { nombre: 'etiqueta', valor: 'importador' }, { nombre: 'version', valor: 'v10' },
      ]));
    });
  });

  it('asignadas a mí filtra por el usuario de la sesión y limpiar saca todo', async () => {
    const pedidos = api();
    mostrar();

    fireEvent.click(await screen.findByLabelText('Asignadas a mí'));
    await vi.waitFor(() => expect(ultimo(pedidos).filtros.map((g) => g[0])).toContainEqual({ campo: 'responsable.uuid', operacion: '=', valor: 'us1' }));

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await vi.waitFor(() => expect(ultimo(pedidos).filtros).toEqual([]));
    expect(screen.getByLabelText('Asignadas a mí')).not.toBeChecked();
  });

  it('el responsable se elige entre los usuarios del proyecto elegido', async () => {
    const pedidos = api();
    mostrar();

    expect(screen.queryByRole('group', { name: 'Responsable' })).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Proyecto'), { target: { value: 'p1' } });
    await screen.findByRole('group', { name: 'Responsable' });
    elegir('Responsable', 'Carla Domínguez');

    await vi.waitFor(() => expect(ultimo(pedidos).filtros.map((g) => g[0])).toContainEqual({ campo: 'responsable.uuid', operacion: '=', valor: 'us2' }));
  });

  it('sin resultados lo dice', async () => {
    simularApi({ 'POST /api/tarea/paginar': { cuerpo: { ...pagina([]), totalDeElementos: 0 } } });
    mostrar();

    expect(await screen.findByText('No hay tareas que coincidan con la búsqueda.')).toBeInTheDocument();
  });
});
