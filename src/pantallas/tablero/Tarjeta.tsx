// Tarjeta visual de una tarea del tablero. La usa la columna, el DragOverlay y el tablero del teléfono.
// Sigue siendo un enlace navegable; el arrastre se activa desde fuera mediante anchorProps.
import type { AnchorHTMLAttributes } from 'react';
import type { TareaDTO } from '../../api/tipos';
import { iniciales, PRIORIDADES, TIPOS } from '../../componentes/catalogos';
import { Icono } from '../../componentes/Icono';
import { href, navegar } from '../../navegacion/ruta';
import { rutaDeTarea } from '../detalle/PanelDeDetalles';

type Props = {
  tarea: TareaDTO;
  prefijo: string;
  anchorRef?: (nodo: HTMLElement | null) => void;
  anchorProps?: AnchorHTMLAttributes<HTMLAnchorElement>;
};

export function Tarjeta({ tarea, prefijo, anchorRef, anchorProps }: Props) {
  const tipo = TIPOS[tarea.tipoCodigo] ?? TIPOS.TAREA;
  const prioridad = PRIORIDADES[tarea.prioridad] ?? PRIORIDADES.MEDIA;
  return (
    <a ref={anchorRef} className="sh-task" href={href(rutaDeTarea(prefijo, tarea.clave))} {...anchorProps}
      onClick={(e) => {
        e.preventDefault();
        navegar(rutaDeTarea(prefijo, tarea.clave));
      }}>
      <p className="sh-task-title">{tarea.titulo}</p>
      <span className="sh-task-meta">
        <span className={`sh-type ${tipo.tono}`}><Icono nombre={tipo.icono} clase="" etiqueta={tarea.tipoCodigo} /></span>
        <span className="sh-key">{tarea.clave}</span>
        <span className="ui-spacer" />
        <span className="sh-prio"><Icono nombre={prioridad.icono} clase="" etiqueta={`Prioridad ${prioridad.nombre}`} color={prioridad.color} /></span>
        {tarea.puntos !== null && <span className="sh-pts" title="Estimación">{tarea.puntos}<span className="sh-sr"> puntos</span></span>}
        {tarea.responsableNombre && (
          <span className="ui-avatar sm" title={tarea.responsableNombre}>{iniciales(tarea.responsableNombre)}<span className="sh-sr">{` ${tarea.responsableNombre}`}</span></span>
        )}
      </span>
    </a>
  );
}
