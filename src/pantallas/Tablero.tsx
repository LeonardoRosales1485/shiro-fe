// Tablero (T6.1, prototipos "Main", "Proyecto recién creado" y sub-tableros): una columna por estado del tipo de
// tablero, con sus tareas (tipo, clave, prioridad, puntos y responsable). Sin tareas muestra como empezar. Se recarga
// cuando cambia version (por ejemplo, despues de crear una tarea). Cada tarjeta lleva al detalle de su tarea (T6.2).
import { useEffect, useState, type ReactNode } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import { pedidoDePaginado, type EstadoDTO, type Pagina, type ProyectoDTO, type TableroDTO, type TareaDTO, type TipoTableroDTO } from '../api/tipos';
import { ErrorConReintento } from '../componentes/Cargas';
import { iniciales, PRIORIDADES, TIPOS, tituloDeTablero } from '../componentes/catalogos';
import { Encabezado } from '../componentes/Encabezado';
import { Icono } from '../componentes/Icono';
import { useEsTelefono } from '../componentes/useEsTelefono';
import { href, navegar } from '../navegacion/ruta';
import { rutaDeTarea } from './detalle/PanelDeDetalles';

type Props = { proyecto: ProyectoDTO; tablero: TableroDTO; tipoDeTablero: TipoTableroDTO; version: number; alNuevaTarea: () => void };

// Resultado de una carga, con la clave (tablero y version) que se pidio: si no es la actual, se esta cargando
type Resultado = { clave: string } & ({ estado: 'listo'; tareas: TareaDTO[] } | { estado: 'error'; mensaje: string });

type Carga = { estado: 'cargando' } | Resultado;

export function Tablero({ proyecto, tablero, tipoDeTablero, version, alNuevaTarea }: Props) {
  const [reintento, setReintento] = useState(0);
  const clave = `${tablero.uuid}:${version}:${reintento}`;
  const esTelefono = useEsTelefono();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const carga: Carga = resultado && resultado.clave === clave ? resultado : { estado: 'cargando' };

  useEffect(() => {
    let vigente = true;
    const pedida = `${tablero.uuid}:${version}:${reintento}`;
    pedir<Pagina<TareaDTO>>('POST', '/tarea/paginar', pedidoDePaginado([{ campo: 'tablero.uuid', operacion: '=', valor: tablero.uuid }], 'numero'))
      .then((pagina) => vigente && setResultado({ clave: pedida, estado: 'listo', tareas: pagina.contenido }))
      .catch((e) => vigente && setResultado({ clave: pedida, estado: 'error', mensaje: mensajeDeError(e) }));
    return () => {
      vigente = false;
    };
  }, [tablero.uuid, version, reintento]);

  const estados = [...tipoDeTablero.estados].sort((a, b) => a.orden - b.orden);
  const tareas = carga.estado === 'listo' ? carga.tareas : [];
  const titulo = tituloDeTablero(tablero.tipoTableroCodigo, tablero.tipoTableroNombre);

  const errorDeCarga = carga.estado === 'error' && (
    <ErrorConReintento mensaje={`No se pudieron cargar las tareas. ${carga.mensaje}`} alReintentar={() => setReintento((r) => r + 1)} />
  );
  if (esTelefono) {
    return <TableroMovil proyecto={proyecto} estados={estados} tareas={tareas} cargando={carga.estado === 'cargando'} error={errorDeCarga}
      alNuevaTarea={alNuevaTarea} />;
  }

  return (
    <>
      <Encabezado migas={[proyecto.nombre, titulo]} titulo={titulo}>
        <button className="ui-btn solid" type="button" onClick={alNuevaTarea}><Icono nombre="mas" />Nueva tarea</button>
      </Encabezado>
      {errorDeCarga}
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

// Tablero en el telefono (prototipo "Tablero en teléfono"): buscador, una pestaña por estado con su cantidad, las
// tareas del estado elegido y «Nueva tarea» fijo abajo. Sin arrastrar: el estado se cambia desde el detalle
function TableroMovil({ proyecto, estados, tareas, cargando, error, alNuevaTarea }: {
  proyecto: ProyectoDTO; estados: EstadoDTO[]; tareas: TareaDTO[]; cargando: boolean; error: ReactNode; alNuevaTarea: () => void;
}) {
  const [elegido, setElegido] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const actual = estados.find((e) => e.uuid === elegido) ?? estados[0];
  const buscado = texto.trim().toLowerCase();
  const visibles = tareas.filter((t) => t.estadoUuid === actual?.uuid
    && (!buscado || t.titulo.toLowerCase().includes(buscado) || t.clave.toLowerCase().includes(buscado)));
  return (
    <div className="sh-tablero-movil">
      <input className="ui-input" type="search" aria-label="Buscar tarea o clave" placeholder="Buscar tarea o clave" value={texto}
        onChange={(e) => setTexto(e.target.value)} />
      <div className="ui-tabs sh-pestanas-movil" role="tablist" aria-label="Estados">
        {estados.map((e) => (
          <button key={e.uuid} type="button" role="tab" className="ui-tab" aria-selected={e.uuid === actual?.uuid} onClick={() => setElegido(e.uuid)}>
            {`${e.nombre} ${tareas.filter((t) => t.estadoUuid === e.uuid).length}`}
          </button>
        ))}
      </div>
      {error}
      {cargando && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
      {!cargando && visibles.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>{buscado ? 'Sin resultados.' : 'No hay tareas en este estado.'}</p>}
      <div className="sh-lista-movil">{visibles.map((t) => <Tarjeta key={t.uuid} tarea={t} prefijo={proyecto.prefijo} />)}</div>
      <div className="sh-accion-fija">
        <button className="ui-btn solid" type="button" onClick={alNuevaTarea}><Icono nombre="mas" />Nueva tarea</button>
      </div>
    </div>
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
