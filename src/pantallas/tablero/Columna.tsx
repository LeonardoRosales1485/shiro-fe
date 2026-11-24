// Columna de un estado: zona droppable + lista sortable de sus tareas. Mantiene el aria-label y el contador actuales.
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { EstadoDTO, TareaDTO } from '../../api/tipos';
import { TarjetaArrastrable } from './TarjetaArrastrable';

type Props = {
  estado: EstadoDTO;
  tareas: TareaDTO[];
  prefijo: string;
  cargando: boolean;
  resaltada: boolean;
};

export function Columna({ estado, tareas, prefijo, cargando, resaltada }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: estado.uuid,
    data: { tipo: 'columna', estadoUuid: estado.uuid },
  });
  const clase = resaltada || isOver ? 'sh-col sh-col-destino' : 'sh-col';

  return (
    <section ref={setNodeRef} className={clase} aria-label={estado.nombre}>
      <h2 className="sh-col-head" style={{ margin: 0 }}>{estado.nombre}<span className="sh-count">{tareas.length}</span></h2>
      {cargando && <div className="ui-skel sh-task-skel" />}
      <SortableContext items={tareas.map((t) => t.uuid)} strategy={verticalListSortingStrategy}>
        {tareas.map((t) => <TarjetaArrastrable key={t.uuid} tarea={t} prefijo={prefijo} />)}
      </SortableContext>
    </section>
  );
}
