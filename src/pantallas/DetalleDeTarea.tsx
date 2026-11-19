// Detalle de tarea (T6.2, prototipos "Detalle", "Detalle · edición" y "Detalle · historial"): busca la tarea por su
// clave y muestra su descripción, subtareas, relaciones, comentarios, historial y detalles. Desde acá se edita, se
// mueve de estado, se asigna, se comenta, se agregan subtareas, se relaciona, se clona y se archiva.
import { useCallback, useEffect, useState } from 'react';
import { ErrorDeApi, mensajeDeError, pedir } from '../api/cliente';
import {
  igual, pedidoDePaginado, type ComentarioDTO, type HistorialDTO, type Pagina, type ProyectoDTO, type RelacionDeTareaDTO,
  type TareaDetalleDTO, type TareaDTO, type TipoTableroDTO, type TipoTareaDTO, type UsuarioDTO,
} from '../api/tipos';
import { ClonarTareaModal } from '../componentes/ClonarTareaModal';
import { tituloDeTablero, TIPOS } from '../componentes/catalogos';
import { Icono } from '../componentes/Icono';
import { rutaDeTablero } from '../componentes/MenuLateral';
import { AlertaDeError, Modal } from '../componentes/Modal';
import { RelacionarTareaModal } from '../componentes/RelacionarTareaModal';
import { navegar } from '../navegacion/ruta';
import { Actividad } from './detalle/Actividad';
import { EdicionDeTarea, type Cambios } from './detalle/EdicionDeTarea';
import { PanelDeDetalles } from './detalle/PanelDeDetalles';
import { Relaciones, Subtareas } from './detalle/Vinculos';

type Props = {
  proyecto: ProyectoDTO;
  clave: string;
  tiposDeTablero: TipoTableroDTO[];
  tiposDeTarea: TipoTareaDTO[];
  usuario: UsuarioDTO;
  esAdministrador: boolean;
};

type Cargada = { tarea: TareaDetalleDTO; relaciones: RelacionDeTareaDTO[]; comentarios: ComentarioDTO[] };

type Carga = { estado: 'cargando' } | { estado: 'no-existe' } | { estado: 'error'; mensaje: string } | ({ estado: 'lista' } & Cargada);

type Modal = 'clonar' | 'relacionar' | 'archivar' | null;

// Tipos cuyas hijas se agregan desde el detalle como Subtarea (nivel 2)
const CON_SUBTAREAS = ['HISTORIA', 'TAREA', 'BUG'];

// Busca la tarea por clave y trae su detalle, sus relaciones y sus comentarios. null si no existe o no se ve
async function leer(clave: string): Promise<Cargada | null> {
  const encontradas = await pedir<Pagina<TareaDTO>>('POST', '/tarea/paginar', pedidoDePaginado([igual('clave', clave)], 'numero', 1));
  if (encontradas.contenido.length === 0) return null;
  const uuid = encontradas.contenido[0].uuid;
  const [tarea, relaciones, comentarios] = await Promise.all([
    pedir<TareaDetalleDTO>('GET', `/tarea/uuid/${uuid}`),
    pedir<RelacionDeTareaDTO[]>('GET', `/tarea/${uuid}/relaciones`),
    leerComentarios(uuid),
  ]);
  return { tarea, relaciones, comentarios };
}

async function leerComentarios(uuid: string): Promise<ComentarioDTO[]> {
  const pagina = await pedir<Pagina<ComentarioDTO>>('POST', '/comentario/paginar', pedidoDePaginado([igual('tareaUuid', uuid)], 'fecha', 200));
  return pagina.contenido;
}

// Cuerpo de /tarea/guardar para editar: todos los datos editables, con la fecha leida para el control de concurrencia
function cuerpoDeEdicion(tarea: TareaDetalleDTO, cambios: Partial<Cambios>) {
  const etiquetas = cambios.etiquetas === undefined
    ? (tarea.etiquetas ?? []).map((e) => e.texto)
    : cambios.etiquetas.split(',').map((t) => t.trim()).filter(Boolean);
  const puntos = cambios.puntos === undefined ? tarea.puntos : (cambios.puntos.trim() ? Number(cambios.puntos) : null);
  const vacioANull = (valor: string | undefined, actual: string | null) => (valor === undefined ? actual : valor.trim() || null);
  return {
    uuid: tarea.uuid,
    tableroUuid: tarea.tableroUuid,
    tipoCodigo: cambios.tipoCodigo ?? tarea.tipoCodigo,
    titulo: cambios.titulo?.trim() ?? tarea.titulo,
    descripcion: vacioANull(cambios.descripcion, tarea.descripcion),
    prioridad: cambios.prioridad ?? tarea.prioridad,
    puntos,
    etiquetas: etiquetas.map((texto) => ({ texto })),
    vencimiento: vacioANull(cambios.vencimiento, tarea.vencimiento),
    responsableUuid: vacioANull(cambios.responsableUuid, tarea.responsableUuid),
    informanteUuid: tarea.informanteUuid,
    padreUuid: tarea.padreUuid,
    estadoUuid: tarea.estadoUuid,
    fechaDeActualizacion: tarea.fechaDeActualizacion,
  };
}

export function DetalleDeTarea({ proyecto, clave, tiposDeTablero, tiposDeTarea, usuario, esAdministrador }: Props) {
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [vuelta, setVuelta] = useState(0);
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [historial, setHistorial] = useState<HistorialDTO[] | null>(null);
  const [errorDelHistorial, setErrorDelHistorial] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  useEffect(() => {
    let vigente = true;
    leer(clave)
      .then((leida) => vigente && setCarga(leida ? { estado: 'lista', ...leida } : { estado: 'no-existe' }))
      .catch((e) => vigente && setCarga({ estado: 'error', mensaje: mensajeDeError(e) }));
    return () => {
      vigente = false;
    };
  }, [clave, vuelta]);

  const lista = carga.estado === 'lista' ? carga : null;
  const tarea = lista?.tarea ?? null;

  // Reemplaza datos de la tarea cargada; el historial se vuelve a pedir la proxima vez que se abra
  const actualizar = useCallback((cambio: Partial<Cargada>) => {
    setCarga((actual) => (actual.estado === 'lista' ? { ...actual, ...cambio } : actual));
    setHistorial(null);
  }, []);

  // Corre una accion mostrando el aviso o el error; responde si salio bien
  const ejecutar = async (accion: () => Promise<string | null>): Promise<boolean> => {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      const mensaje = await accion();
      if (mensaje) setAviso(mensaje);
      return true;
    } catch (e) {
      setError(mensajeDeError(e));
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const abrirHistorial = () => {
    if (!tarea || historial) return;
    setErrorDelHistorial(null);
    pedir<HistorialDTO[]>('GET', `/tarea/${tarea.uuid}/historial`)
      .then(setHistorial)
      .catch((e) => setErrorDelHistorial(mensajeDeError(e)));
  };

  if (carga.estado === 'cargando') {
    return <div className="ui-row ui-muted" role="status"><span className="ui-spinner" aria-hidden="true" />{`Cargando ${clave}...`}</div>;
  }
  if (carga.estado === 'no-existe') {
    return (
      <section className="ui-card">
        <div className="ui-empty">
          <span className="ui-empty-icon"><Icono nombre="lupa" /></span>
          <p className="ui-empty-title">{`No encontramos la tarea ${clave}`}</p>
          <p className="ui-empty-text">Puede que no exista, que esté archivada o que no tengas permiso para verla.</p>
        </div>
      </section>
    );
  }
  if (carga.estado === 'error' || !lista || !tarea) {
    return <AlertaDeError mensaje={carga.estado === 'error' ? `No se pudo cargar la tarea. ${carga.mensaje}` : null} />;
  }

  const tablero = proyecto.tableros.find((t) => t.uuid === tarea.tableroUuid);
  const estados = [...(tiposDeTablero.find((t) => t.uuid === tablero?.tipoTableroUuid)?.estados ?? [])].sort((a, b) => a.orden - b.orden);
  const terminados = estados.filter((e) => e.terminado).map((e) => e.nombre);
  const nombreDeTablero = tablero ? tituloDeTablero(tablero.tipoTableroCodigo, tablero.tipoTableroNombre) : '';
  const tipo = TIPOS[tarea.tipoCodigo] ?? TIPOS.TAREA;

  const guardar = (cambios: Partial<Cambios>, mensaje: string | null) => ejecutar(async () => {
    try {
      const guardada = await pedir<TareaDetalleDTO>('POST', '/tarea/guardar', cuerpoDeEdicion(tarea, cambios));
      actualizar({ tarea: guardada });
      setEditando(false);
      setConflicto(false);
      return mensaje;
    } catch (e) {
      setConflicto(e instanceof ErrorDeApi && e.codigo === 'TAREA_MODIFICADA');
      throw e;
    }
  });

  const mover = (estadoUuid: string) => ejecutar(async () => {
    const movida = await pedir<TareaDetalleDTO>('POST', `/tarea/${tarea.uuid}/mover`, { estadoUuid });
    actualizar({ tarea: { ...tarea, ...movida } });
    return `${tarea.clave} pasó a ${movida.estadoNombre ?? 'otro estado'}.`;
  });

  const comentar = (cuerpo: string) => ejecutar(async () => {
    const comentario = await pedir<ComentarioDTO>('POST', '/comentario/guardar', { tareaUuid: tarea.uuid, cuerpo });
    actualizar({ comentarios: [...lista.comentarios, comentario] });
    return null;
  });

  const agregarSubtarea = (titulo: string) => ejecutar(async () => {
    const creada = await pedir<TareaDetalleDTO>('POST', '/tarea/guardar',
      { tableroUuid: tarea.tableroUuid, tipoCodigo: 'SUBTAREA', titulo, padreUuid: tarea.uuid });
    const hija = { uuid: creada.uuid, clave: creada.clave, titulo, tipoCodigo: 'SUBTAREA',
      estadoNombre: creada.estadoNombre ?? estados.find((e) => e.inicial)?.nombre ?? null };
    actualizar({ tarea: { ...tarea, hijas: [...(tarea.hijas ?? []), hija] } });
    return `Se creó ${creada.clave}.`;
  });

  const quitarRelacion = (relacion: RelacionDeTareaDTO) => ejecutar(async () => {
    await pedir('POST', `/relacion/${relacion.uuid}/archivar`);
    actualizar({ relaciones: lista.relaciones.filter((r) => r.uuid !== relacion.uuid) });
    return `Se quitó la relación con ${relacion.tareaClave}.`;
  });

  const recargarRelaciones = () => ejecutar(async () => {
    actualizar({ relaciones: await pedir<RelacionDeTareaDTO[]>('GET', `/tarea/${tarea.uuid}/relaciones`) });
    return null;
  });

  return (
    <>
      <div className="ui-page-head">
        <ol className="ui-crumbs" aria-label="Ubicación">
          <li><span>{proyecto.nombre}</span></li>
          <li><a href="#" onClick={(e) => {
            e.preventDefault();
            navegar(rutaDeTablero(proyecto.prefijo, tablero?.tipoTableroCodigo ?? 'PRINCIPAL'));
          }}>{nombreDeTablero}</a></li>
          <li><span aria-current="page">{tarea.clave}</span></li>
        </ol>
      </div>
      {!editando && (
        <div className="ui-page-head">
          <span className={`sh-type ${tipo.tono}`}><Icono nombre={tipo.icono} clase="" etiqueta={tarea.tipoNombre ?? tarea.tipoCodigo} /></span>
          <h1 className="ui-page-title">{tarea.titulo}</h1>
          <span className="ui-spacer" />
          <button className="ui-btn" type="button" onClick={() => setEditando(true)}><Icono nombre="lapiz" />Editar</button>
          <button className="ui-btn" type="button" onClick={() => setModal('clonar')}>Clonar</button>
          <button className="ui-btn outline is-danger" type="button" onClick={() => setModal('archivar')}><Icono nombre="archivo" />Archivar</button>
        </div>
      )}
      {aviso && <div className="ui-alert is-success" role="status"><span>{aviso}</span></div>}
      {!editando && <AlertaDeError mensaje={error} />}
      <div className="sh-detalle">
        <div className="sh-detalle-principal">
          {editando ? (
            <EdicionDeTarea tarea={tarea} tiposDeTarea={tiposDeTarea} esAdministrador={esAdministrador} guardando={ocupado} error={error}
              conflicto={conflicto} alGuardar={(cambios) => guardar(cambios, null)}
              alCancelar={() => {
                setEditando(false);
                setError(null);
                setConflicto(false);
              }}
              alRecargar={() => {
                setEditando(false);
                setError(null);
                setConflicto(false);
                setVuelta((v) => v + 1);
              }} />
          ) : (
            <section className="ui-card sh-tarjeta">
              <h2 className="ui-card-title">Descripción</h2>
              {tarea.descripcion ? <p className="sh-texto" style={{ margin: 0 }}>{tarea.descripcion}</p> : <p className="ui-muted" style={{ margin: 0 }}>Sin descripción.</p>}
            </section>
          )}
          {tarea.tipoCodigo !== 'SUBTAREA' && (
            <Subtareas prefijo={proyecto.prefijo} hijas={tarea.hijas ?? []} terminados={terminados}
              titulo={tarea.tipoCodigo === 'EPICA' ? 'Tareas de la épica' : 'Subtareas'} permiteAgregar={CON_SUBTAREAS.includes(tarea.tipoCodigo)}
              agregando={ocupado} alAgregar={agregarSubtarea} />
          )}
          <Relaciones prefijo={proyecto.prefijo} relaciones={lista.relaciones} ocupado={ocupado}
            alRelacionar={() => setModal('relacionar')} alQuitar={quitarRelacion} />
          <Actividad comentarios={lista.comentarios} historial={historial} errorDelHistorial={errorDelHistorial} comentando={ocupado}
            alAbrirHistorial={abrirHistorial} alComentar={comentar} />
        </div>
        <PanelDeDetalles tarea={tarea} prefijo={proyecto.prefijo} nombreDeTablero={tablero?.tipoTableroNombre ?? ''} estados={estados}
          usuarioUuid={usuario.uuid} ocupado={ocupado} alMover={mover}
          alAsignarme={() => guardar({ responsableUuid: usuario.uuid }, `Te asignaste ${tarea.clave}.`)} />
      </div>
      {modal === 'clonar' && (
        <ClonarTareaModal proyecto={proyecto} tarea={tarea} tiposDeTablero={tiposDeTablero} tiposDeTarea={tiposDeTarea}
          alClonar={() => recargarRelaciones()} alCerrar={() => setModal(null)} />
      )}
      {modal === 'relacionar' && (
        <RelacionarTareaModal tarea={tarea} alCerrar={() => setModal(null)} alRelacionar={() => {
          setModal(null);
          recargarRelaciones().then((ok) => ok && setAviso('Se agregó la relación.'));
        }} />
      )}
      {modal === 'archivar' && (
        <ArchivarTareaModal tarea={tarea} relaciones={lista.relaciones} alCerrar={() => setModal(null)}
          alArchivar={() => navegar(rutaDeTablero(proyecto.prefijo, tablero?.tipoTableroCodigo ?? 'PRINCIPAL'))} />
      )}
    </>
  );
}

// Confirmacion de archivar (prototipo "Archivar tarea"): avisa que arrastra a sus subtareas y que se puede restaurar
function ArchivarTareaModal({ tarea, relaciones, alArchivar, alCerrar }: {
  tarea: TareaDetalleDTO; relaciones: RelacionDeTareaDTO[]; alArchivar: () => void; alCerrar: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hijas = tarea.hijas ?? [];
  const clones = relaciones.filter((r) => r.vinculo.startsWith('CLONADA'));

  const archivar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await pedir('POST', `/tarea/${tarea.uuid}/archivar`);
      alArchivar();
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid is-danger" type="button" disabled={enviando} onClick={archivar}>Archivar</button>
  </>;

  return (
    <Modal titulo="Archivar tarea" alCerrar={alCerrar} pie={pie} ancho={520}>
      <h3 className="ui-card-title" style={{ margin: 0 }}>{`¿Archivar ${tarea.clave}?`}</h3>
      <p style={{ margin: 0 }}>{`${tarea.titulo} sale del tablero, del sprint y de los listados. No se borra: la podés buscar y restaurar desde Archivados.`}</p>
      {hijas.length > 0 && (
        <div>
          <p className="ui-label" style={{ margin: 0 }}>{`También se archivan sus ${hijas.length} subtareas`}</p>
          <ul className="sh-vinculos">
            {hijas.map((h) => <li key={h.uuid}><span>{`${h.clave} · ${h.titulo}`}</span><span className="ui-chip">{h.estadoNombre}</span></li>)}
          </ul>
        </div>
      )}
      {clones.map((r) => (
        <p key={r.uuid} className="ui-help" style={{ margin: 0 }}>{`Está vinculada a ${r.tareaClave}. El clon queda archivado y el original sigue activo.`}</p>
      ))}
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
