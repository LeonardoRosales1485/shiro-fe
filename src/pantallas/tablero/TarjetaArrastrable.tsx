// Tarjeta arrastrable: envuelve el enlace de siempre con useSortable. El clic y Enter siguen abriendo el detalle
// porque el sensor de teclado se configura con Space en el DndContext del tablero.
import type { AnchorHTMLAttributes } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TareaDTO } from '../../api/tipos';
import { Tarjeta } from './Tarjeta';

export function TarjetaArrastrable({ tarea, prefijo }: { tarea: TareaDTO; prefijo: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: tarea.uuid,
    data: { tipo: 'tarea', estadoUuid: tarea.estadoUuid },
  });

  // role="link" va después de attributes para no perder la semántica del <a> original.
  const anchorProps = { ...attributes, role: 'link', ...listeners } as AnchorHTMLAttributes<HTMLAnchorElement>;

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'sh-task-origen' : undefined}>
      <Tarjeta tarea={tarea} prefijo={prefijo} anchorRef={setActivatorNodeRef} anchorProps={anchorProps} />
    </div>
  );
}
