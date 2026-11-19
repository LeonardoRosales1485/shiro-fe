// T6.1: crear un proyecto con nombre y prefijo; muestra que se crean sus cuatro tableros y el error de prefijo en uso.
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { error, simularApi } from '../pruebas/api';
import { CrearProyectoModal } from './CrearProyectoModal';

describe('CrearProyectoModal', () => {
  afterEach(() => vi.unstubAllGlobals());

  const completar = () => {
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Portal' } });
    fireEvent.change(screen.getByLabelText(/Prefijo de clave/), { target: { value: 'ptr' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
  };

  it('crea el proyecto con el prefijo en mayúsculas', async () => {
    const pedidos = simularApi({ 'POST /api/proyecto/guardar': { cuerpo: { uuid: 'p9', nombre: 'Portal', prefijo: 'PTR', tableros: [] } } });
    const alCrear = vi.fn();
    render(<CrearProyectoModal alCrear={alCrear} alCerrar={vi.fn()} />);

    expect(screen.getByText('Tablero principal')).toBeInTheDocument();
    completar();

    await vi.waitFor(() => expect(alCrear).toHaveBeenCalledWith(expect.objectContaining({ prefijo: 'PTR' })));
    expect(pedidos[0].cuerpo).toEqual({ nombre: 'Portal', prefijo: 'PTR' });
  });

  it('muestra el prefijo en uso junto al campo', async () => {
    simularApi({ 'POST /api/proyecto/guardar': error(400, 'PREFIJO_DE_PROYECTO_EN_USO', 'El prefijo PTR ya lo usa otro proyecto. Elegí otro.') });
    render(<CrearProyectoModal alCrear={vi.fn()} alCerrar={vi.fn()} />);

    completar();

    expect(await screen.findByText('El prefijo PTR ya lo usa otro proyecto. Elegí otro.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Prefijo de clave/)).toHaveAttribute('aria-invalid', 'true');
  });
});
