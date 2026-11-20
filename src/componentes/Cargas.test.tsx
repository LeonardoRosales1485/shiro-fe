// T6.6: loaders del prototipo "Loaders": el gato que busca las letras para esperas de pantalla completa (aparece
// recién después de medio segundo), el 白 que se escribe con el avance, y el error con «Reintentar».
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CargaConAvance, CargaDeShiro, ErrorConReintento } from './Cargas';

describe('Cargas', () => {
  afterEach(() => vi.useRealTimers());

  it('el gato aparece recién después de medio segundo', () => {
    vi.useFakeTimers();
    render(<CargaDeShiro />);

    expect(screen.queryByRole('status', { name: 'Cargando' })).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
  });

  it('el 白 muestra el avance', () => {
    render(<CargaConAvance porcentaje={63} etiqueta="Avance de la importación" />);

    const barra = screen.getByRole('progressbar', { name: 'Avance de la importación' });
    expect(barra).toHaveAttribute('aria-valuenow', '63');
    expect(barra).toHaveTextContent('63');
  });

  it('el error ofrece reintentar', () => {
    const reintentar = vi.fn();
    render(<ErrorConReintento mensaje="No se pudieron cargar las tareas." alReintentar={reintentar} />);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las tareas.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reintentar).toHaveBeenCalled();
  });
});
