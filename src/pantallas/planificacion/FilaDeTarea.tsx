// Fila de una tarea en un sprint, en el backlog o en una version (T6.3): tipo, clave (enlace al detalle), titulo,
// tablero, puntos y responsable, y a la derecha las acciones que reciba.
import type { ReactNode } from 'react';
import type { ProyectoDTO } from '../../api/tipos';
import { iniciales, nombreDeTablero, TIPOS } from '../../componentes/catalogos';
import { Icono } from '../../componentes/Icono';
import { EnlaceATarea } from '../detalle/PanelDeDetalles';

type Props = {
  proyecto: ProyectoDTO;
  tarea: { clave: string; titulo: string; tipoCodigo: string; tableroCodigo: string | null; puntos?: number | null; responsableNombre?: string | null };
  extra?: ReactNode;
  acciones?: ReactNode;
};

export function FilaDeTarea({ proyecto, tarea, extra, acciones }: Props) {
  const tipo = TIPOS[tarea.tipoCodigo] ?? TIPOS.TAREA;
  return (
    <li className="sh-fila-tarea">
      <span className={`sh-type ${tipo.tono}`}><Icono nombre={tipo.icono} clase="" etiqueta={tarea.tipoCodigo} /></span>
      <EnlaceATarea prefijo={proyecto.prefijo} clave={tarea.clave} texto={tarea.clave} />
      <span className="sh-fila-titulo">{tarea.titulo}</span>
      <span className="ui-muted">{nombreDeTablero(proyecto.tableros, tarea.tableroCodigo)}</span>
      {extra}
      {tarea.puntos !== null && tarea.puntos !== undefined && <span className="ui-muted">{`${tarea.puntos} ${tarea.puntos === 1 ? 'punto' : 'puntos'}`}</span>}
      {tarea.responsableNombre && <span className="ui-avatar sm" title={tarea.responsableNombre}>{iniciales(tarea.responsableNombre)}</span>}
      {acciones}
    </li>
  );
}

// Suma de los puntos de las tareas (las sin estimar cuentan 0)
export function puntosDe(tareas: { puntos?: number | null }[]): number {
  return tareas.reduce((total, t) => total + (t.puntos ?? 0), 0);
}

// Cabecera de la tarjeta de un sprint: nombre (titulo de la seccion), chip de estado y, a la derecha, las acciones
export function CabeceraDeSprint({ idTitulo, nombre, estado, tono, children }: { idTitulo: string; nombre: string; estado: string; tono: string; children?: ReactNode }) {
  return (
    <div className="ui-row">
      <h2 className="ui-card-title" id={idTitulo}>{nombre}</h2>
      <span className={`ui-chip ${tono}`}>{estado}</span>
      <span className="ui-spacer" />
      {children}
    </div>
  );
}
