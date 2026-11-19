// Versiones de un proyecto (T6.3, prototipos "Versiones" y "Versión publicada"): la lista con su estado y fecha de
// publicación y cantidad de tareas, y el detalle de la elegida (con quién la publicó) (por defecto la primera sin publicar): cuántas tareas tiene por tipo y
// cuántas están hechas, su changelog en Markdown (para copiar) y sus tareas. Una sin publicar recibe y suelta tareas
// y se publica; una publicada no se modifica. Las dos se archivan.
import { useEffect, useId, useState } from 'react';
import { mensajeDeError, pedir, pedirTexto } from '../api/cliente';
import {
  igual, pedidoDePaginado, type Pagina, type ProyectoDTO, type TareaDeVersionDTO, type TipoTableroDTO, type VersionDTO,
} from '../api/tipos';
import { estadosTerminados, fecha } from '../componentes/catalogos';
import { Encabezado } from '../componentes/Encabezado';
import { Icono } from '../componentes/Icono';
import { AlertaDeError } from '../componentes/Modal';
import { useAccion } from '../componentes/useAccion';
import { FilaDeTarea } from './planificacion/FilaDeTarea';
import { AgregarTareasModal, NuevaVersionModal, PublicarVersionModal } from './versiones/ModalesDeVersion';

type Props = { proyecto: ProyectoDTO; tiposDeTablero: TipoTableroDTO[] };

type Detalle = { version: string; tareas: TareaDeVersionDTO[]; changelog: string };

type Modal = 'nueva' | 'agregar' | 'publicar' | null;

// Cantidades por tipo que muestra el detalle (el resto de los tipos no se cuenta aparte)
const CONTADOS = [{ codigo: 'HISTORIA', nombre: 'Historias' }, { codigo: 'TAREA', nombre: 'Tareas' }, { codigo: 'BUG', nombre: 'Bugs' }];

export function Versiones({ proyecto, tiposDeTablero }: Props) {
  const id = useId();
  const [versiones, setVersiones] = useState<VersionDTO[] | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const [elegida, setElegida] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const { ocupado, aviso, setAviso, error, setError, ejecutar } = useAccion(() => setVuelta((v) => v + 1));

  useEffect(() => {
    let vigente = true;
    pedir<Pagina<VersionDTO>>('POST', '/version/paginar', pedidoDePaginado([igual('proyecto.uuid', proyecto.uuid)], 'nombre', 200))
      .then((pagina) => vigente && setVersiones([...pagina.contenido].sort((a, b) => b.nombre.localeCompare(a.nombre, undefined, { numeric: true }))))
      .catch((e) => vigente && setErrorDeCarga(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [proyecto.uuid, vuelta]);

  const version = versiones?.find((v) => v.uuid === elegida) ?? versiones?.find((v) => v.estado === 'SIN_PUBLICAR') ?? versiones?.[0] ?? null;
  const uuidElegido = version?.uuid ?? null;

  useEffect(() => {
    if (!uuidElegido) return;
    let vigente = true;
    Promise.all([pedir<TareaDeVersionDTO[]>('GET', `/version/${uuidElegido}/tareas`), pedirTexto(`/version/${uuidElegido}/changelog`)])
      .then(([tareas, changelog]) => vigente && setDetalle({ version: uuidElegido, tareas, changelog }))
      .catch((e) => vigente && setError(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [uuidElegido, vuelta, setError]);

  if (errorDeCarga) return <AlertaDeError mensaje={`No se pudieron cargar las versiones. ${errorDeCarga}`} />;
  if (!versiones) return <div className="ui-row ui-muted" role="status"><span className="ui-spinner" aria-hidden="true" />Cargando las versiones...</div>;

  const delElegido = detalle && detalle.version === uuidElegido ? detalle : null;
  const sinPublicar = version?.estado === 'SIN_PUBLICAR';

  const copiar = async () => {
    if (!delElegido) return;
    try {
      await navigator.clipboard.writeText(delElegido.changelog);
      setAviso('Changelog copiado.');
    } catch {
      setError('No se pudo copiar. Seleccioná el texto y copialo a mano.');
    }
  };

  const terminar = (mensaje: string) => {
    setModal(null);
    setAviso(mensaje);
    setVuelta((v) => v + 1);
  };

  return (
    <>
      <Encabezado migas={[proyecto.nombre, 'Versiones']} titulo="Versiones">
        <button className="ui-btn solid" type="button" onClick={() => setModal('nueva')}><Icono nombre="mas" />Nueva versión</button>
      </Encabezado>
      {aviso && <div className="ui-alert is-success" role="status"><span>{aviso}</span></div>}
      <AlertaDeError mensaje={error} />
      {versiones.length === 0 && <p className="ui-muted">Todavía no hay versiones. Creá la primera.</p>}
      <div className="sh-detalle-principal">
        {versiones.length > 0 && (
          <div className="ui-card ui-table-wrap">
            <table className="ui-table" aria-label="Versiones">
              <thead><tr><th>Versión</th><th>Estado</th><th>Publicación</th><th>Tareas</th></tr></thead>
              <tbody>
                {versiones.map((v) => (
                  <tr key={v.uuid} aria-selected={v.uuid === uuidElegido}>
                    <td><button className="sh-boton-enlace" type="button" onClick={() => setElegida(v.uuid)}>{v.nombre}</button></td>
                    <td>{v.estado === 'PUBLICADA' ? 'Publicada' : 'Sin publicar'}</td>
                    <td>{v.fechaDePublicacion ? fecha(v.fechaDePublicacion) : '—'}</td>
                    <td>{v.cantidadDeTareas ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {version && (
          <section className="ui-card sh-tarjeta" aria-labelledby={`${id}-v`}>
            <div className="ui-row">
              <h2 className="ui-card-title" id={`${id}-v`}>{version.nombre}</h2>
              <span className={`ui-chip ${sinPublicar ? 'is-info' : 'is-success'}`}>
                {sinPublicar ? 'Sin publicar' : 'Publicada'}
              </span>
              <span className="ui-spacer" />
              {sinPublicar && delElegido && <button className="ui-btn" type="button" onClick={() => setModal('agregar')}>{`Agregar tareas a ${version.nombre}`}</button>}
              {sinPublicar && delElegido && <button className="ui-btn solid" type="button" onClick={() => setModal('publicar')}>Publicar versión</button>}
              <button className="ui-btn outline is-danger" type="button" disabled={ocupado} onClick={() => ejecutar(async () => {
                await pedir('POST', `/version/${version.uuid}/archivar`);
                setElegida(null);
              }, `Se archivó ${version.nombre}.`)}><Icono nombre="archivo" />Archivar</button>
            </div>
            {!sinPublicar && (
              <p className="ui-muted" style={{ margin: 0 }}>
                {`Publicada el ${fecha(version.fechaDePublicacion)}${version.publicadaPorNombre ? ` por ${version.publicadaPorNombre}` : ''}`}
              </p>
            )}
            {!sinPublicar && <p className="ui-help" style={{ margin: 0 }}>Una versión publicada no se modifica: sus tareas y su changelog quedan como estaban al publicarla.</p>}
            {!delElegido && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
            {delElegido && (
              <>
                <div className="sh-chips">
                  {CONTADOS.map((c) => <span key={c.codigo} className="ui-chip">{`${c.nombre} ${delElegido.tareas.filter((t) => t.tipoCodigo === c.codigo).length}`}</span>)}
                  <span className="ui-chip is-success">{`Hechas ${delElegido.tareas.filter((t) => t.terminada).length} / ${delElegido.tareas.length}`}</span>
                </div>
                <div className="ui-row">
                  <h3 className="ui-card-title" style={{ fontSize: 14 }}>Changelog en Markdown</h3>
                  <span className="ui-spacer" />
                  <button className="ui-btn ghost sm" type="button" onClick={copiar}>Copiar Markdown</button>
                </div>
                <pre className="sh-md">{delElegido.changelog}</pre>
                <p className="ui-help" style={{ margin: 0 }}>Agrupado por tipo. Incluye solo tareas terminadas (Hecho o Aprobado).</p>
                <h3 className="ui-card-title" style={{ fontSize: 14 }}>{`${delElegido.tareas.length} ${delElegido.tareas.length === 1 ? 'tarea' : 'tareas'}`}</h3>
                <ul className="sh-vinculos">
                  {delElegido.tareas.map((t) => (
                    <FilaDeTarea key={t.uuid} proyecto={proyecto} tarea={t} extra={<span className={`ui-chip ${t.terminada ? 'is-success' : ''}`}>{t.estadoNombre}</span>}
                      acciones={sinPublicar && (
                        <button className="ui-x" type="button" disabled={ocupado} aria-label={`Quitar ${t.clave} de la versión`}
                          onClick={() => ejecutar(() => pedir('POST', `/version/${version.uuid}/quitar`, { tareas: [t.uuid] }), `${t.clave} salió de ${version.nombre}.`)}>
                          <Icono nombre="cerrar" />
                        </button>
                      )} />
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </div>
      {modal === 'nueva' && (
        <NuevaVersionModal proyecto={proyecto} alCerrar={() => setModal(null)} alCrear={(nueva) => {
          setElegida(nueva.uuid);
          terminar(`Se creó la versión ${nueva.nombre}.`);
        }} />
      )}
      {modal === 'agregar' && version && delElegido && (
        <AgregarTareasModal proyecto={proyecto} version={version} enLaVersion={delElegido.tareas} terminados={estadosTerminados(tiposDeTablero)}
          alCerrar={() => setModal(null)} alAgregar={(cantidad) => terminar(`Se ${cantidad === 1 ? 'agregó 1 tarea' : `agregaron ${cantidad} tareas`} a ${version.nombre}.`)} />
      )}
      {modal === 'publicar' && version && delElegido && (
        <PublicarVersionModal version={version} tareas={delElegido.tareas} alCerrar={() => setModal(null)}
          alPublicar={() => terminar(`Se publicó ${version.nombre}.`)} />
      )}
    </>
  );
}
