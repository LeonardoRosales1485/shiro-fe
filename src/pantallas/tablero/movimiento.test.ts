import { describe, expect, it } from 'vitest';
import type { TareaDTO } from '../../api/tipos';
import { tarea, TIPOS_DE_TABLERO } from '../../pruebas/api';
import { estadoDeDestino, moverTarea } from './movimiento';

describe('movimiento del tablero', () => {
  const estados = TIPOS_DE_TABLERO[0].estados;
  const tareas: TareaDTO[] = [tarea('SHI-1', 'Login', 'e1') as TareaDTO, tarea('SHI-2', 'Tablero', 'e2') as TareaDTO];

  it('resuelve un id de columna y un id de tarjeta al mismo estado', () => {
    expect(estadoDeDestino('e2', estados, tareas)).toBe('e2');
    expect(estadoDeDestino('u-SHI-2', estados, tareas)).toBe('e2');
    expect(estadoDeDestino('otro', estados, tareas)).toBeNull();
  });

  it('mueve a otra columna sin mutar el array original', () => {
    const resultado = moverTarea(tareas, 'u-SHI-1', 'e2');
    expect(resultado.find((t) => t.uuid === 'u-SHI-1')?.estadoUuid).toBe('e2');
    expect(tareas[0].estadoUuid).toBe('e1');
    expect(resultado).not.toBe(tareas);
  });

  it('inserta antes de la tarjeta indicada al soltar sobre ella', () => {
    const resultado = moverTarea(tareas, 'u-SHI-1', 'e2', 'u-SHI-2');
    expect(resultado.map((t) => t.uuid)).toEqual(['u-SHI-1', 'u-SHI-2']);
  });

  it('no hace nada si la tarea no existe', () => {
    expect(moverTarea(tareas, 'u-NO', 'e5')).toBe(tareas);
  });
});
