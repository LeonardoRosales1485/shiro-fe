// Helpers puros del drag & drop del tablero: resuelven el estado destino y mueven tareas sin tocar la API.
import type { EstadoDTO, TareaDTO } from '../../api/tipos';

// dnd-kit identifica tanto columnas (uuid de estado) como tarjetas (uuid de tarea). Devuelve el estado al que
// pertenece el destino, o null si el id no corresponde a este tablero.
export function estadoDeDestino(id: string, estados: EstadoDTO[], tareas: TareaDTO[]): string | null {
  if (estados.some((e) => e.uuid === id)) return id;
  return tareas.find((t) => t.uuid === id)?.estadoUuid ?? null;
}

// Mueve una tarea al estado destino, insertándola antes de "sobreUuid" (si se soltó sobre otra tarjeta) o al final.
// No muta el array original: el front conserva un snapshot para poder rollback si la API rechaza el movimiento.
export function moverTarea(tareas: TareaDTO[], uuid: string, estadoUuid: string, sobreUuid: string | null = null): TareaDTO[] {
  const indice = tareas.findIndex((t) => t.uuid === uuid);
  if (indice < 0) return tareas;

  const copia = [...tareas];
  const [original] = copia.splice(indice, 1);
  const movida: TareaDTO = { ...original, estadoUuid };
  const destino = sobreUuid ? copia.findIndex((t) => t.uuid === sobreUuid) : -1;

  if (destino >= 0) copia.splice(destino, 0, movida);
  else copia.push(movida);
  return copia;
}
