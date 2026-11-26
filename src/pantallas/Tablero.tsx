// Tablero (T6.1, prototipos "Main", "Proyecto recién creado" y sub-tableros): una columna por estado del tipo de
// tablero, con sus tareas (tipo, clave, prioridad, puntos y responsable). Sin tareas muestra como empezar. Se recarga
// cuando cambia version (por ejemplo, despues de crear una tarea). Cada tarjeta lleva al detalle de su tarea (T6.2)
// y se puede arrastrar a otra columna; el cambio se persiste con POST /tarea/{uuid}/mover.
import { useEffect, useState, type ReactNode } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, closestCorners,
  useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { mensajeDeError, pedir } from '../api/cliente';
import { pedidoDePaginado, type EstadoDTO, type Pagina, type ProyectoDTO, type TableroDTO, type TareaDTO, type TipoTableroDTO } from '../api/tipos';
import { ErrorConReintento } from '../componentes/Cargas';
import { tituloDeTablero } from '../componentes/catalogos';
import { Encabezado } from '../componentes/Encabezado';
import { Icono } from '../componentes/Icono';
import { useEsTelefono } from '../componentes/useEsTelefono';
import { Columna } from './tablero/Columna';
import { estadoDeDestino, moverTarea } from './tablero/movimiento';
import { Tarjeta } from './tablero/Tarjeta';

type Props = {
  proyecto: ProyectoDTO; tablero: TableroDTO; tipoDeTablero: TipoTableroDTO; version: number; alNuevaTarea: () => void;
  // Solo para administradores en la computadora: lleva a importar desde Jira desde el proyecto vacio
  alImportar?: () => void;
};

// Resultado de una carga, con la clave (tablero y version) que se pidio: si no es la actual, se esta cargando
type Resultado = { clave: string } & ({ estado: 'listo'; tareas: TareaDTO[] } | { estado: 'error'; mensaje: string });

type Carga = { estado: 'cargando' } | Resultado;

export function Tablero({ proyecto, tablero, tipoDeTablero, version, alNuevaTarea, alImportar }: Props) {
  const [reintento, setReintento] = useState(0);
  const clave = `${tablero.uuid}:${version}:${reintento}`;
  const esTelefono = useEsTelefono();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const carga: Carga = resultado && resultado.clave === clave ? resultado : { estado: 'cargando' };

  // Override local del arrastre: sólo aplica a la clave actual. Así una recarga nueva vuelve a mostrar lo que
  // devuelve la API, sin esperar un efecto adicional (las tarjetas están presentes en el primer render útil).
  const [override, setOverride] = useState<{ clave: string; tareas: TareaDTO[] } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TareaDTO[] | null>(null);
  const [destinoResaltado, setDestinoResaltado] = useState<string | null>(null);
  const [errorDeMovimiento, setErrorDeMovimiento] = useState<string | null>(null);
  const [avisoDeMovimiento, setAvisoDeMovimiento] = useState<string | null>(null);
  const [moviendo, setMoviendo] = useState(false);

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

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Space levanta/suelta; Enter queda libre para abrir el detalle del enlace.
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  const estados = [...tipoDeTablero.estados].sort((a, b) => a.orden - b.orden);
  const tareasDeCarga = carga.estado === 'listo' ? carga.tareas : [];
  const tareas = override?.clave === clave ? override.tareas : tareasDeCarga;
  const tareasVisibles = () => override?.clave === clave ? override.tareas : tareasDeCarga;
  const ponerTareas = (nuevas: TareaDTO[]) => setOverride({ clave, tareas: nuevas });
  const titulo = tituloDeTablero(tablero.tipoTableroCodigo, tablero.tipoTableroNombre);
  const tareaActiva = tareas.find((t) => t.uuid === activeId) ?? null;

  const errorDeCarga = carga.estado === 'error' && (
    <ErrorConReintento mensaje={`No se pudieron cargar las tareas. ${carga.mensaje}`} alReintentar={() => setReintento((r) => r + 1)} />
  );
  const avisos = (
    <>
      {errorDeMovimiento && <div className="ui-alert is-danger" role="alert"><span>{errorDeMovimiento}</span></div>}
      {avisoDeMovimiento && <div className="ui-alert is-success" role="status"><span>{avisoDeMovimiento}</span></div>}
    </>
  );

  const limpiarArrastre = () => {
    setActiveId(null);
    setSnapshot(null);
    setDestinoResaltado(null);
  };

  // Persiste el estado destino. "previo" es el snapshot para rollback; "optimista" es lo que ve el usuario al soltar.
  const persistir = async (tarea: TareaDTO, estadoUuid: string, previo: TareaDTO[], optimista: TareaDTO[]) => {
    setMoviendo(true);
    setErrorDeMovimiento(null);
    setAvisoDeMovimiento(null);
    try {
      const movida = await pedir<TareaDTO>('POST', `/tarea/${tarea.uuid}/mover`, { estadoUuid });
      ponerTareas(optimista.map((t) => t.uuid === movida.uuid ? { ...t, ...movida } : t));
      setAvisoDeMovimiento(`${tarea.clave} pasó a ${estados.find((e) => e.uuid === estadoUuid)?.nombre ?? 'otro estado'}.`);
    } catch (e) {
      ponerTareas(previo);
      setErrorDeMovimiento(mensajeDeError(e));
    } finally {
      setMoviendo(false);
    }
  };

  const alEmpezar = ({ active }: DragStartEvent) => {
    if (moviendo) return;
    const uuid = String(active.id);
    if (!tareas.some((t) => t.uuid === uuid)) return;
    setSnapshot(tareas);
    setActiveId(uuid);
    setErrorDeMovimiento(null);
    setAvisoDeMovimiento(null);
  };

  const alPasarPor = ({ active, over }: DragOverEvent) => {
    if (!over || !snapshot) return;
    const id = String(active.id);
    const destino = estadoDeDestino(String(over.id), estados, tareasVisibles());
    if (!destino) return;
    setDestinoResaltado(destino);
    const sobreUuid = String(over.id) === destino ? null : String(over.id);
    setOverride((actual) => ({
      clave,
      tareas: moverTarea(actual?.clave === clave ? actual.tareas : tareasDeCarga, id, destino, sobreUuid),
    }));
  };

  const alTerminar = ({ active, over }: DragEndEvent) => {
    const previo = snapshot ?? tareasVisibles();
    const optimista = tareasVisibles();
    const uuid = String(active.id);
    const destino = over ? estadoDeDestino(String(over.id), estados, optimista) : null;
    limpiarArrastre();
    const original = previo.find((t) => t.uuid === uuid);
    if (!original || !destino || destino === original.estadoUuid) {
      ponerTareas(previo);
      return;
    }
    void persistir(original, destino, previo, optimista);
  };

  const alCancelar = () => {
    ponerTareas(snapshot ?? tareasVisibles());
    limpiarArrastre();
  };

  // En el telefono no hay columnas destino visibles: el boton «Mover a…» usa el mismo endpoint.
  const moverDesdeMovil = async (tarea: TareaDTO, estadoUuid: string) => {
    const previo = tareasVisibles();
    if (tarea.estadoUuid === estadoUuid) return;
    await persistir(tarea, estadoUuid, previo, previo);
  };

  if (esTelefono) {
    return <TableroMovil proyecto={proyecto} estados={estados} tareas={tareas} cargando={carga.estado === 'cargando'} error={errorDeCarga}
      avisos={avisos} alNuevaTarea={alNuevaTarea} alMover={moverDesdeMovil} moviendo={moviendo} />;
  }

  return (
    <DndContext sensors={sensores} collisionDetection={closestCorners}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Levantaste la tarea ${active.id}.`,
          onDragOver: ({ active, over }) => over ? `${active.id} está sobre ${over.id}.` : `${active.id} sin destino.`,
          onDragEnd: ({ active, over }) => over ? `${active.id} se movió a ${over.id}.` : `${active.id} volvió a su lugar.`,
          onDragCancel: ({ active }) => `Cancelaste el movimiento de ${active.id}.`,
        },
        screenReaderInstructions: {
          draggable: 'Para mover una tarea, presioná Space para levantarla, usá las flechas para elegir la columna y presioná Space para soltarla. Escape cancela y Enter abre el detalle.',
        },
      }}
      onDragStart={alEmpezar} onDragOver={alPasarPor} onDragEnd={alTerminar} onDragCancel={alCancelar}>
      <Encabezado migas={[proyecto.nombre, titulo]} titulo={titulo}>
        <button className="ui-btn solid" type="button" onClick={alNuevaTarea}><Icono nombre="mas" />Nueva tarea</button>
      </Encabezado>
      {errorDeCarga}
      {avisos}
      {carga.estado === 'listo' && tareas.length === 0 && (
        <section className="ui-card">
          <div className="ui-empty">
            <span className="ui-empty-icon"><Icono nombre="columnas" /></span>
            <p className="ui-empty-title">{`${proyecto.nombre} está listo`}</p>
            <p className="ui-empty-text">Todavía no hay tareas en este tablero. Creá la primera o traé el proyecto desde Jira.</p>
            <div className="ui-row" style={{ justifyContent: 'center' }}>
              <button className="ui-btn solid" type="button" onClick={alNuevaTarea}><Icono nombre="mas" />Nueva tarea</button>
              {alImportar && <button className="ui-btn" type="button" onClick={alImportar}><Icono nombre="descargar" />Importar desde Jira</button>}
            </div>
          </div>
        </section>
      )}
      <div className="sh-columnas-scroll" aria-busy={carga.estado === 'cargando' || moviendo}>
        <div className="sh-columnas" style={{ gridTemplateColumns: `repeat(${estados.length}, minmax(220px, 1fr))` }}>
          {estados.map((estado) => <Columna key={estado.uuid} estado={estado} tareas={tareas.filter((t) => t.estadoUuid === estado.uuid)}
            prefijo={proyecto.prefijo} cargando={carga.estado === 'cargando'} resaltada={destinoResaltado === estado.uuid} />)}
        </div>
      </div>
      <DragOverlay>
        {tareaActiva && <div className="sh-drag-overlay"><Tarjeta tarea={tareaActiva} prefijo={proyecto.prefijo} anchorProps={{ tabIndex: -1 }} /></div>}
      </DragOverlay>
    </DndContext>
  );
}

// Tarjeta del telefono con la alternativa táctil al arrastre (las pestañas no muestran todas las columnas a la vez).
function TarjetaConMover({ tarea, prefijo, estados, alMover, moviendo }: {
  tarea: TareaDTO; prefijo: string; estados: EstadoDTO[]; moviendo: boolean;
  alMover: (tarea: TareaDTO, estadoUuid: string) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [destino, setDestino] = useState('');
  const seleccion = estados.filter((e) => e.uuid !== tarea.estadoUuid);
  return (
    <div className="sh-mover-movil">
      <Tarjeta tarea={tarea} prefijo={prefijo} />
      <div className="ui-row">
        <button className="ui-btn sm" type="button" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>Mover a…</button>
        {abierto && <>
          <select className="ui-select" aria-label={`Estado destino para ${tarea.clave}`} value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Elegí un estado</option>
            {seleccion.map((e) => <option key={e.uuid} value={e.uuid}>{e.nombre}</option>)}
          </select>
          <button className="ui-btn sm solid" type="button" disabled={!destino || moviendo}
            onClick={() => { void alMover(tarea, destino).finally(() => { setAbierto(false); setDestino(''); }); }}>Mover</button>
        </>}
      </div>
    </div>
  );
}

// Tablero en el telefono (prototipo "Tablero en teléfono"): buscador, una pestaña por estado con su cantidad, las
// tareas del estado elegido y «Nueva tarea» fijo abajo. El estado se cambia con «Mover a…», sin arrastrar pestañas.
function TableroMovil({ proyecto, estados, tareas, cargando, error, avisos, alNuevaTarea, alMover, moviendo }: {
  proyecto: ProyectoDTO; estados: EstadoDTO[]; tareas: TareaDTO[]; cargando: boolean; error: ReactNode; avisos: ReactNode;
  alNuevaTarea: () => void; moviendo: boolean;
  alMover: (tarea: TareaDTO, estadoUuid: string) => Promise<void>;
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
      {avisos}
      {cargando && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
      {!cargando && visibles.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>{buscado ? 'Sin resultados.' : 'No hay tareas en este estado.'}</p>}
      <div className="sh-lista-movil">{visibles.map((t) => <TarjetaConMover key={t.uuid} tarea={t} prefijo={proyecto.prefijo} estados={estados}
        alMover={alMover} moviendo={moviendo} />)}</div>
      <div className="sh-accion-fija">
        <button className="ui-btn solid" type="button" onClick={alNuevaTarea}><Icono nombre="mas" />Nueva tarea</button>
      </div>
    </div>
  );
}
