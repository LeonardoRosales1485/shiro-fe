// Tablero (T6.1, prototipos "Main", "Proyecto recién creado" y sub-tableros): una columna por estado del tipo de
// tablero, con sus tareas (tipo, clave, prioridad, puntos y responsable). Sin tareas muestra como empezar. Se recarga
// cuando cambia version (por ejemplo, despues de crear una tarea). Cada tarjeta lleva al detalle de su tarea (T6.2).
import { useEffect, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import { pedidoDePaginado, type Pagina, type ProyectoDTO, type TableroDTO, type TareaDTO, type TipoTableroDTO } from '../api/tipos';
import { iniciales, PRIORIDADES, TIPOS, tituloDeTablero } from '../componentes/catalogos';
import { Icono } from '../componentes/Icono';
import { href, navegar } from '../navegacion/ruta';
import { rutaDeTarea } from './detalle/PanelDeDetalles';

type Props = { proyecto: ProyectoDTO; tablero: TableroDTO; tipoDeTablero: TipoTableroDTO; version: number; alNuevaTarea: () => void };

// Resultado de una carga, con la clave (tablero y version) que se pidio: si no es la actual, se esta cargando
type Resultado = { clave: string } & ({ estado: 'listo'; tareas: TareaDTO[] } | { estado: 'error'; mensaje: string });

type Carga = { estado: 'cargando' } | Resultado;

export function Tablero({ proyecto, tablero, tipoDeTablero, version, alNuevaTarea }: Props) {
  const clave = `${tablero.uuid}:${version}`;
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const carga: Carga = resultado && resultado.clave === clave ? resultado : { estado: 'cargando' };

  useEffect(() => {
    let vigente = true;
    const pedida = `${tablero.uuid}:${version}`;
    pedir<Pagina<TareaDTO>>('POST', '/tarea/paginar', pedidoDePaginado([{ campo: 'tablero.uuid', operacion: '=', valor: tablero.uuid }], 'numero'))
      .then((pagina) => vigente && setResultado({ clave: pedida, estado: 'listo', tareas: pagina.contenido }))
      .catch((e) => vigente && setResultado({ clave: pedida, estado: 'error', mensaje: mensajeDeError(e) }));
    return () => {
      vigente = false;
    };
  }, [tablero.uuid, version]);

  const estados = [...tipoDeTablero.estados].sort((a, b) => a.orden - b.orden);
  const tareas = carga.estado === 'listo' ? carga.tareas : [];

  return (
    <>
      <div className="ui-page-head">
        <ol className="ui-crumbs" aria-label="Ubicación">
          <li><span>{proyecto.nombre}</span></li>
          <li><span aria-current="page">{tituloDeTablero(tablero.tipoTableroCodigo, tablero.tipoTableroNombre)}</span></li>
        </ol>
      </div>
      <div className="ui-page-head">
        <h1 className="ui-page-title">{tituloDeTablero(tablero.tipoTableroCodigo, tablero.tipoTableroNombre)}</h1>
        <span className="ui-spacer" />
        <button className="ui-btn solid" type="button" onClick={alNuevaTarea}><Icono nombre="mas" />Nueva tarea</button>
      </div>
      {carga.estado === 'error' && (
        <div className="ui-alert is-danger" role="alert"><Icono nombre="alerta" /><span>{`No se pudieron cargar las tareas. ${carga.mensaje}`}</span></div>
      )}
      {carga.estado === 'listo' && tareas.length === 0 && (
        <section className="ui-card">
          <div className="ui-empty">
            <span className="ui-empty-icon"><Icono nombre="columnas" /></span>
            <p className="ui-empty-title">{`${proyecto.nombre} está listo`}</p>
            <p className="ui-empty-text">Todavía no hay tareas en este tablero. Creá la primera o traé el proyecto desde Jira.</p>
            <div className="ui-row" style={{ justifyContent: 'center' }}>
              <button className="ui-btn solid" type="button" onClick={alNuevaTarea}><Icono nombre="mas" />Nueva tarea</button>
            </div>
          </div>
        </section>
      )}
      <div className="sh-columnas-scroll" aria-busy={carga.estado === 'cargando'}>
        <div className="sh-columnas" style={{ gridTemplateColumns: `repeat(${estados.length}, minmax(220px, 1fr))` }}>
          {estados.map((estado) => {
            const enEstado = tareas.filter((t) => t.estadoUuid === estado.uuid);
            return (
              <section key={estado.uuid} className="sh-col" aria-label={estado.nombre}>
                <h2 className="sh-col-head" style={{ margin: 0 }}>{estado.nombre}<span className="sh-count">{enEstado.length}</span></h2>
                {carga.estado === 'cargando' && <div className="ui-skel sh-task-skel" />}
                {enEstado.map((t) => <Tarjeta key={t.uuid} tarea={t} prefijo={proyecto.prefijo} />)}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Tarjeta de una tarea en su columna; lleva al detalle de la tarea
function Tarjeta({ tarea, prefijo }: { tarea: TareaDTO; prefijo: string }) {
  const tipo = TIPOS[tarea.tipoCodigo] ?? TIPOS.TAREA;
  const prioridad = PRIORIDADES[tarea.prioridad] ?? PRIORIDADES.MEDIA;
  return (
    <a className="sh-task" href={href(rutaDeTarea(prefijo, tarea.clave))} onClick={(e) => {
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
