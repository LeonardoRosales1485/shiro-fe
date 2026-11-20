// T6.2: relacionar la tarea con otra del proyecto. El tipo se elige desde esta tarea (bloquea, está bloqueada por,
// se relaciona con, duplica, está duplicada por) y el front arma el origen y el destino.
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { error, pagina, simularApi, tarea, tareaDetalle } from '../pruebas/api';
import { RelacionarTareaModal } from './RelacionarTareaModal';

describe('RelacionarTareaModal', () => {
  afterEach(() => vi.unstubAllGlobals());

  const BUSQUEDA = { cuerpo: pagina([tarea('SHI-128', 'Importar sprints', 'e2'), tarea('SHI-149', 'Esta misma', 'e2')]) };

  const mostrar = (alRelacionar = vi.fn()) => render(
    <RelacionarTareaModal tarea={tareaDetalle()} alRelacionar={alRelacionar} alCerrar={vi.fn()} />);

  it('busca la otra tarea por texto y explica cómo queda la relación', async () => {
    const alRelacionar = vi.fn();
    const pedidos = simularApi({ 'POST /api/tarea/paginar': BUSQUEDA, 'POST /api/relacion/crear': { cuerpo: { uuid: 'r9' } } });
    mostrar(alRelacionar);

    fireEvent.change(screen.getByLabelText('Buscar tarea'), { target: { value: 'sprints' } });
    fireEvent.click(await screen.findByRole('radio', { name: /SHI-128/ }));

    expect(screen.queryByRole('radio', { name: /SHI-149/ })).not.toBeInTheDocument();
    expect(screen.getByText('SHI-149 bloquea a SHI-128. En SHI-128 se va a ver como «está bloqueada por SHI-149».')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Relacionar' }));

    await vi.waitFor(() => expect(alRelacionar).toHaveBeenCalled());
    const busqueda = pedidos[0].cuerpo as { parametros: unknown[]; filtros: unknown[][] };
    expect(busqueda.parametros).toEqual([{ nombre: 'texto', valor: 'sprints' }]);
    expect(busqueda.filtros[0][0]).toEqual({ campo: 'proyecto.uuid', operacion: '=', valor: 'p1' });
    expect(pedidos.find((p) => p.ruta === '/api/relacion/crear')?.cuerpo).toEqual({ origenUuid: 'u-SHI-149', destinoUuid: 'u-SHI-128', tipo: 'BLOQUEA' });
  });

  it('«está bloqueada por» invierte origen y destino', async () => {
    const pedidos = simularApi({ 'POST /api/tarea/paginar': BUSQUEDA, 'POST /api/relacion/crear': { cuerpo: { uuid: 'r9' } } });
    mostrar();

    fireEvent.change(screen.getByLabelText('Tipo de relación'), { target: { value: 'BLOQUEADA_POR' } });
    fireEvent.change(screen.getByLabelText('Buscar tarea'), { target: { value: 'sprints' } });
    fireEvent.click(await screen.findByRole('radio', { name: /SHI-128/ }));

    expect(screen.getByText('SHI-128 bloquea a SHI-149. En SHI-128 se va a ver como «bloquea a SHI-149».')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Relacionar' }));

    await vi.waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/relacion/crear')?.cuerpo)
      .toEqual({ origenUuid: 'u-SHI-128', destinoUuid: 'u-SHI-149', tipo: 'BLOQUEA' }));
  });

  it('no deja relacionar sin elegir la otra tarea', () => {
    simularApi({});
    mostrar();

    expect(screen.getByRole('button', { name: 'Relacionar' })).toBeDisabled();
    expect(screen.getByText('«Clonada de / clonada en» se crea sola al clonar.')).toBeInTheDocument();
  });

  it('muestra el error del backend', async () => {
    simularApi({
      'POST /api/tarea/paginar': BUSQUEDA,
      'POST /api/relacion/crear': error(400, 'RELACION_REPETIDA', 'Esas tareas ya tienen esa relación.'),
    });
    mostrar();

    fireEvent.change(screen.getByLabelText('Buscar tarea'), { target: { value: 'sprints' } });
    fireEvent.click(await screen.findByRole('radio', { name: /SHI-128/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Relacionar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Esas tareas ya tienen esa relación.');
  });
});
