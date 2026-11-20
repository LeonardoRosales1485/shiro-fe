// Panel lateral "Detalles" del detalle de tarea (T6.2, prototipo "Detalle"): estado (se cambia desde acá con mover),
// tablero, responsable (con «Asignármela»), informante, prioridad, estimación, etiquetas, sprint, versiones, tarea
// padre, vencimiento y fechas.
import { useId } from 'react';
import type { EstadoDTO, TareaDetalleDTO } from '../../api/tipos';
import { fecha, iniciales, PRIORIDADES } from '../../componentes/catalogos';
import { href, navegar } from '../../navegacion/ruta';

type Props = {
  tarea: TareaDetalleDTO;
  prefijo: string;
  nombreDeTablero: string;
  estados: EstadoDTO[];
  usuarioUuid: string;
  ocupado: boolean;
  alMover: (estadoUuid: string) => void;
  alAsignarme: () => void;
};

export function PanelDeDetalles({ tarea, prefijo, nombreDeTablero, estados, usuarioUuid, ocupado, alMover, alAsignarme }: Props) {
  const idEstado = useId();
  const prioridad = PRIORIDADES[tarea.prioridad] ?? PRIORIDADES.MEDIA;
  return (
    <aside className="ui-card sh-detalles" aria-label="Detalles">
      <h2 className="ui-card-title" style={{ margin: 0 }}>Detalles</h2>
      <div className="ui-field">
        <label className="ui-label" htmlFor={idEstado}>Estado</label>
        <select id={idEstado} className="ui-select" value={tarea.estadoUuid} disabled={ocupado} onChange={(e) => alMover(e.target.value)}>
          {estados.map((estado) => <option key={estado.uuid} value={estado.uuid}>{estado.nombre}</option>)}
        </select>
      </div>
      <dl className="sh-dl">
        <dt>Tablero</dt>
        <dd>{nombreDeTablero}</dd>
        <dt>Responsable</dt>
        <dd>
          {tarea.responsableNombre ? <Persona nombre={tarea.responsableNombre} /> : <span className="ui-muted">Sin asignar</span>}
          {tarea.responsableUuid !== usuarioUuid && (
            <button className="ui-btn ghost sm" type="button" disabled={ocupado} onClick={alAsignarme}>Asignármela</button>
          )}
        </dd>
        <dt>Informante</dt>
        <dd>{tarea.informanteNombre ? <Persona nombre={tarea.informanteNombre} /> : <span className="ui-muted">—</span>}</dd>
        <dt>Prioridad</dt>
        <dd>{prioridad.nombre}</dd>
        <dt>Estimación</dt>
        <dd>{tarea.puntos === null ? <span className="ui-muted">Sin estimar</span> : `${tarea.puntos} ${tarea.puntos === 1 ? 'punto' : 'puntos'}`}</dd>
        <dt>Etiquetas</dt>
        <dd className="sh-chips">
          {tarea.etiquetas?.length ? tarea.etiquetas.map((e) => <span key={e.texto} className="ui-chip">{e.texto}</span>) : <span className="ui-muted">—</span>}
        </dd>
        <dt>Sprint</dt>
        <dd>{tarea.sprintNombre ?? <span className="ui-muted">Backlog</span>}</dd>
        <dt>Versiones</dt>
        <dd className="sh-chips">
          {tarea.versiones?.length ? tarea.versiones.map((v) => <span key={v.versionUuid} className="ui-chip">{v.nombre}</span>) : <span className="ui-muted">—</span>}
        </dd>
        {tarea.padreClave && (
          <>
            <dt>Tarea padre</dt>
            <dd><EnlaceATarea prefijo={prefijo} clave={tarea.padreClave} texto={tarea.padreClave} /></dd>
          </>
        )}
        <dt>Vence</dt>
        <dd>{tarea.vencimiento ? fecha(tarea.vencimiento) : <span className="ui-muted">—</span>}</dd>
      </dl>
      <p className="ui-help" style={{ margin: 0 }}>
        {`Creada ${fecha(tarea.fechaDeCreacion, true)} · Actualizada ${fecha(tarea.fechaDeActualizacion, true)}`}
      </p>
    </aside>
  );
}

// Avatar con iniciales y nombre
function Persona({ nombre }: { nombre: string }) {
  return <span className="ui-row" style={{ gap: 6 }}><span className="ui-avatar sm" aria-hidden="true">{iniciales(nombre)}</span><span>{nombre}</span></span>;
}

// Enlace al detalle de otra tarea del proyecto, con navegacion sin recargar
export function EnlaceATarea({ prefijo, clave, texto }: { prefijo: string; clave: string; texto: string }) {
  const ruta = rutaDeTarea(prefijo, clave);
  return (
    <a href={href(ruta)} onClick={(e) => {
      e.preventDefault();
      navegar(ruta);
    }}>{texto}</a>
  );
}

// Ruta del detalle de una tarea
export function rutaDeTarea(prefijo: string, clave: string): string {
  return `/proyecto/${prefijo}/tarea/${clave}`;
}
