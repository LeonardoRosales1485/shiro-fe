// T6.1: crear tarea en modo rápido (tipo y título), con «Más datos» para el resto y el botón de tipos propios
// deshabilitado con «Próximamente».
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { error, PROYECTO, simularApi, TIPOS_DE_TAREA } from '../pruebas/api';
import { CrearTareaModal } from './CrearTareaModal';

describe('CrearTareaModal', () => {
  afterEach(() => vi.unstubAllGlobals());

  const abrir = (alCrear = vi.fn()) => render(<CrearTareaModal proyecto={PROYECTO} tableroUuid="t1"
    tipos={TIPOS_DE_TAREA} alCrear={alCrear} alCerrar={vi.fn()} />);

  it('crea en modo rápido con tipo, título y el tablero actual', async () => {
    const pedidos = simularApi({ 'POST /api/tarea/guardar': { cuerpo: { uuid: 'n1', clave: 'SHI-9' } } });
    const alCrear = vi.fn();
    abrir(alCrear);

    fireEvent.click(screen.getByRole('button', { name: /Bug/ }));
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Se rompe el login' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(await screen.findByText(/SHI-9/)).toBeInTheDocument();
    expect(pedidos[0].cuerpo).toEqual({ tableroUuid: 't1', tipoCodigo: 'BUG', titulo: 'Se rompe el login' });
    expect(alCrear).toHaveBeenCalledWith(expect.objectContaining({ clave: 'SHI-9' }));
  });

  it('muestra los tipos de la jerarquía sin subtarea y el botón de tipos propios deshabilitado', () => {
    abrir();

    expect(screen.queryByRole('button', { name: /Subtarea/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /próximamente/i })).toBeDisabled();
  });

  it('«Más datos» muestra los campos opcionales y los manda', async () => {
    const pedidos = simularApi({ 'POST /api/tarea/guardar': { cuerpo: { uuid: 'n1', clave: 'SHI-10' } } });
    abrir();

    expect(screen.queryByLabelText('Descripción')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Más datos' }));
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Con datos' } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Detalle' } });
    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: 'ALTA' } });
    fireEvent.change(screen.getByLabelText('Estimación (puntos)'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Etiquetas'), { target: { value: 'login, urgente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

    await screen.findByText(/SHI-10/);
    expect(pedidos[0].cuerpo).toEqual({ tableroUuid: 't1', tipoCodigo: 'TAREA', titulo: 'Con datos', descripcion: 'Detalle',
      prioridad: 'ALTA', puntos: 3, etiquetas: ['login', 'urgente'] });
  });

  it('muestra el error del backend', async () => {
    simularApi({ 'POST /api/tarea/guardar': error(403, 'SIN_PERMISO', 'No tenés permiso para esta acción.') });
    abrir();

    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Sin permiso' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No tenés permiso para esta acción.');
  });

  it('no deja crear sin título', () => {
    abrir();

    expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeDisabled();
  });
});
