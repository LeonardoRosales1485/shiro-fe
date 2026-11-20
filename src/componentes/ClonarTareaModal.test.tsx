// T6.2: clonar una tarea a otro tablero del proyecto eligiendo qué datos se copian; el clon de una subtarea pide su
// destino (tarea propia con su tipo, o subtarea de otra tarea).
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { error, pagina, PROYECTO, simularApi, tarea, tareaDetalle, TIPOS_DE_TABLERO, TIPOS_DE_TAREA } from '../pruebas/api';
import { ClonarTareaModal } from './ClonarTareaModal';

describe('ClonarTareaModal', () => {
  afterEach(() => vi.unstubAllGlobals());

  const mostrar = (extra: Record<string, unknown> = {}, alClonar = vi.fn()) => render(
    <ClonarTareaModal proyecto={PROYECTO} tarea={tareaDetalle(extra)} tiposDeTablero={TIPOS_DE_TABLERO} tiposDeTarea={TIPOS_DE_TAREA}
      alClonar={alClonar} alCerrar={vi.fn()} />);

  it('ofrece los otros tableros con su estado inicial y copia lo habitual', async () => {
    const alClonar = vi.fn();
    const pedidos = simularApi({ 'POST /api/tarea/u-SHI-149/clonar': { cuerpo: tareaDetalle({ uuid: 'u-SHI-170', clave: 'SHI-170' }) } });
    mostrar({}, alClonar);

    expect(screen.getByRole('heading', { name: 'Clonar SHI-149 a otro tablero' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'QA · queda en «Por probar»' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Principal/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Descripción' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Prioridad' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Etiquetas' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Comentarios' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Subtareas (2)' })).not.toBeChecked();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Estimación' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clonar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Se creó SHI-170 en QA.');
    expect(pedidos[0].cuerpo).toEqual({ tableroUuid: 't2', copiar: ['DESCRIPCION', 'PRIORIDAD', 'ETIQUETAS', 'PUNTOS'] });
    expect(alClonar).toHaveBeenCalledWith(expect.objectContaining({ clave: 'SHI-170' }));
  });

  it('marcar todo y volver a lo habitual', () => {
    simularApi({});
    mostrar();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar todo' }));
    expect(screen.getByRole('checkbox', { name: 'Comentarios' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Versiones' })).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Volver a lo habitual' }));
    expect(screen.getByRole('checkbox', { name: 'Comentarios' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Descripción' })).toBeChecked();
  });

  it('una tarea sin subtareas no ofrece copiarlas', () => {
    simularApi({});
    mostrar({ hijas: [] });

    expect(screen.queryByRole('checkbox', { name: /Subtareas/ })).not.toBeInTheDocument();
  });

  it('el clon de una subtarea como tarea propia lleva su tipo', async () => {
    const pedidos = simularApi({ 'POST /api/tarea/u-SHI-149/clonar': { cuerpo: tareaDetalle({ clave: 'SHI-171' }) } });
    mostrar({ tipoCodigo: 'SUBTAREA', hijas: [], padreUuid: 'u-SHI-100', padreClave: 'SHI-100' });

    expect(screen.getByRole('radio', { name: 'Como tarea propia' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Bug' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clonar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Se creó SHI-171');
    expect(pedidos[0].cuerpo).toEqual({ tableroUuid: 't2', copiar: ['DESCRIPCION', 'PRIORIDAD', 'ETIQUETAS'], tipoCodigo: 'BUG' });
  });

  it('el clon de una subtarea como subtarea de otra tarea busca esa tarea por su clave', async () => {
    const pedidos = simularApi({
      'POST /api/tarea/paginar': { cuerpo: pagina([tarea('SHI-120', 'Importador', 'e1')]) },
      'POST /api/tarea/u-SHI-149/clonar': { cuerpo: tareaDetalle({ clave: 'SHI-172' }) },
    });
    mostrar({ tipoCodigo: 'SUBTAREA', hijas: [], padreUuid: 'u-SHI-100', padreClave: 'SHI-100' });

    fireEvent.click(screen.getByRole('radio', { name: 'Como subtarea de otra tarea' }));
    fireEvent.change(screen.getByLabelText('Clave de la tarea padre'), { target: { value: 'shi-120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clonar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Se creó SHI-172');
    expect((pedidos[0].cuerpo as { filtros: unknown[][] }).filtros[0][0]).toEqual({ campo: 'clave', operacion: '=', valor: 'SHI-120' });
    expect(pedidos[1].cuerpo).toEqual({ tableroUuid: 't2', copiar: ['DESCRIPCION', 'PRIORIDAD', 'ETIQUETAS'], padreUuid: 'u-SHI-120' });
  });

  it('si la tarea padre no existe no clona', async () => {
    const pedidos = simularApi({ 'POST /api/tarea/paginar': { cuerpo: pagina([]) } });
    mostrar({ tipoCodigo: 'SUBTAREA', hijas: [], padreUuid: 'u-SHI-100', padreClave: 'SHI-100' });

    fireEvent.click(screen.getByRole('radio', { name: 'Como subtarea de otra tarea' }));
    fireEvent.change(screen.getByLabelText('Clave de la tarea padre'), { target: { value: 'SHI-999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clonar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No existe la tarea SHI-999 en Shiro.');
    expect(pedidos).toHaveLength(1);
  });

  it('muestra el error del backend', async () => {
    simularApi({ 'POST /api/tarea/u-SHI-149/clonar': error(403, 'SIN_PERMISO', 'No tenés permiso para editar en ese tablero.') });
    mostrar();

    fireEvent.click(screen.getByRole('button', { name: 'Clonar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No tenés permiso para editar en ese tablero.');
  });
});
