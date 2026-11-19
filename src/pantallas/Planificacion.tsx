// Backlog y sprints de un proyecto (T6.3, prototipos "Backlog", "Crear sprint", "Cerrar sprint" y "Sprint cerrado"):
// los sprints abiertos (el activo con su avance y los planificados), el backlog en su orden único y, a pedido, los
// sprints cerrados con sus tareas. Desde acá se crean, inician, cierran y archivan sprints y se mueven tareas.
import { useEffect, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import {
  igual, pedidoDePaginado, type Pagina, type ProyectoDTO, type SprintDTO, type TareaDePlanDTO, type TipoTableroDTO,
} from '../api/tipos';
import { estadosTerminados } from '../componentes/catalogos';
import { Encabezado } from '../componentes/Encabezado';
import { Icono } from '../componentes/Icono';
import { AlertaDeError } from '../componentes/Modal';
import { useAccion } from '../componentes/useAccion';
import { ListaDeBacklog } from './planificacion/ListaDeBacklog';
import { CerrarSprintModal, CrearSprintModal } from './planificacion/ModalesDeSprint';
import { TarjetaDeSprint } from './planificacion/TarjetaDeSprint';

type Props = { proyecto: ProyectoDTO; tiposDeTablero: TipoTableroDTO[] };

type Datos = { sprints: SprintDTO[]; tareas: Record<string, TareaDePlanDTO[]>; backlog: TareaDePlanDTO[] };

type Modal = { tipo: 'crear' } | { tipo: 'cerrar'; sprint: SprintDTO } | null;

const ORDEN_DE_ESTADOS = { ACTIVO: 0, PLANIFICADO: 1, CERRADO: 2 };

// Tareas de un sprint (filtro sprint.uuid del paginado de tareas)
async function tareasDe(sprint: string): Promise<TareaDePlanDTO[]> {
  return (await pedir<Pagina<TareaDePlanDTO>>('POST', '/tarea/paginar', pedidoDePaginado([igual('sprint.uuid', sprint)], 'numero'))).contenido;
}

// Sprints del proyecto, tareas de los abiertos (uno por pedido: hay pocos abiertos) y backlog
async function leer(proyecto: string): Promise<Datos> {
  const [sprints, backlog] = await Promise.all([
    pedir<Pagina<SprintDTO>>('POST', '/sprint/paginar', pedidoDePaginado([igual('proyecto.uuid', proyecto)], 'inicio', 200)),
    pedir<TareaDePlanDTO[]>('GET', `/proyecto/${proyecto}/backlog`),
  ]);
  const abiertos = sprints.contenido.filter((s) => s.estado !== 'CERRADO');
  const listas = await Promise.all(abiertos.map((s) => tareasDe(s.uuid)));
  return { sprints: sprints.contenido, tareas: Object.fromEntries(abiertos.map((s, i) => [s.uuid, listas[i]])), backlog };
}

export function Planificacion({ proyecto, tiposDeTablero }: Props) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const [verCerrados, setVerCerrados] = useState(false);
  const [cerradoElegido, setCerradoElegido] = useState<string | null>(null);
  const [tareasDelCerrado, setTareasDelCerrado] = useState<{ sprint: string; tareas: TareaDePlanDTO[] } | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const { ocupado, aviso, setAviso, error, setError, ejecutar } = useAccion(() => setVuelta((v) => v + 1));
  const terminados = estadosTerminados(tiposDeTablero);

  useEffect(() => {
    let vigente = true;
    leer(proyecto.uuid)
      .then((leidos) => vigente && setDatos(leidos))
      .catch((e) => vigente && setErrorDeCarga(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [proyecto.uuid, vuelta]);

  const cerrados = (datos?.sprints ?? []).filter((s) => s.estado === 'CERRADO').sort((a, b) => b.inicio.localeCompare(a.inicio));
  const cerrado = verCerrados ? cerrados.find((s) => s.uuid === cerradoElegido) ?? cerrados[0] ?? null : null;

  // Las tareas del sprint cerrado que se esta viendo se piden al elegirlo
  useEffect(() => {
    if (!cerrado) return;
    let vigente = true;
    tareasDe(cerrado.uuid)
      .then((tareas) => vigente && setTareasDelCerrado({ sprint: cerrado.uuid, tareas }))
      .catch((e) => vigente && setError(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [cerrado, setError]);

  if (errorDeCarga) return <AlertaDeError mensaje={`No se pudo cargar la planificación. ${errorDeCarga}`} />;
  if (!datos) return <div className="ui-row ui-muted" role="status"><span className="ui-spinner" aria-hidden="true" />Cargando la planificación...</div>;

  const abiertos = datos.sprints.filter((s) => s.estado !== 'CERRADO').sort((a, b) => ORDEN_DE_ESTADOS[a.estado] - ORDEN_DE_ESTADOS[b.estado]);
  const activo = abiertos.find((s) => s.estado === 'ACTIVO') ?? null;

  const tarjeta = (sprint: SprintDTO, tareas: TareaDePlanDTO[] | null) => (
    <TarjetaDeSprint key={sprint.uuid} proyecto={proyecto} sprint={sprint} tareas={tareas} terminados={terminados} activo={activo} ocupado={ocupado}
      alCerrar={() => setModal({ tipo: 'cerrar', sprint })}
      alIniciar={() => ejecutar(() => pedir('POST', `/sprint/${sprint.uuid}/iniciar`), `Empezó ${sprint.nombre}.`)}
      alArchivar={() => ejecutar(async () => {
        await pedir('POST', `/sprint/${sprint.uuid}/archivar`);
        setCerradoElegido(null);
      }, `Se archivó ${sprint.nombre}.`)}
      alSacar={(tarea) => ejecutar(() => pedir('POST', `/sprint/${sprint.uuid}/quitar`, { tareas: [tarea.uuid] }), `${tarea.clave} volvió al backlog.`)} />
  );

  return (
    <>
      <Encabezado migas={[proyecto.nombre, 'Backlog y sprints']} titulo="Backlog y sprints">
        <button className="ui-btn" type="button" aria-pressed={verCerrados} onClick={() => setVerCerrados(!verCerrados)}>{`Sprints cerrados (${cerrados.length})`}</button>
        <button className="ui-btn solid" type="button" onClick={() => setModal({ tipo: 'crear' })}><Icono nombre="mas" />Crear sprint</button>
      </Encabezado>
      {aviso && <div className="ui-alert is-success" role="status"><span>{aviso}</span></div>}
      <AlertaDeError mensaje={error} />
      <div className="sh-detalle-principal">
        {cerrado && (
          <>
            {cerrados.length > 1 && (
              <label className="ui-field" style={{ maxWidth: 320 }}>
                <span className="ui-label">Ver otro sprint cerrado</span>
                <select className="ui-select" value={cerrado.uuid} onChange={(e) => setCerradoElegido(e.target.value)}>
                  {cerrados.map((s) => <option key={s.uuid} value={s.uuid}>{s.nombre}</option>)}
                </select>
              </label>
            )}
            {tarjeta(cerrado, tareasDelCerrado?.sprint === cerrado.uuid ? tareasDelCerrado.tareas : null)}
          </>
        )}
        {abiertos.length === 0 && !cerrado && <p className="ui-muted" style={{ margin: 0 }}>No hay sprints abiertos. Creá uno para empezar a planificar.</p>}
        {abiertos.map((s) => tarjeta(s, datos.tareas[s.uuid] ?? []))}
        <ListaDeBacklog proyecto={proyecto} tareas={datos.backlog} abiertos={abiertos} ocupado={ocupado}
          alMover={(tarea, sprint) => ejecutar(() => pedir('POST', `/sprint/${sprint.uuid}/asignar`, { tareas: [tarea.uuid] }), `${tarea.clave} pasó a ${sprint.nombre}.`)}
          alOrdenar={(uuids) => ejecutar(() => pedir('POST', `/proyecto/${proyecto.uuid}/ordenar-backlog`, { tareas: uuids }), 'Backlog ordenado.')} />
      </div>
      {modal?.tipo === 'crear' && (
        <CrearSprintModal proyecto={proyecto} backlog={datos.backlog} alCerrar={() => setModal(null)} alCrear={(nombre) => {
          setModal(null);
          setAviso(`Se creó ${nombre}.`);
          setVuelta((v) => v + 1);
        }} />
      )}
      {modal?.tipo === 'cerrar' && (
        <CerrarSprintModal sprint={modal.sprint} tareas={datos.tareas[modal.sprint.uuid] ?? []} terminados={terminados}
          planificados={abiertos.filter((s) => s.estado === 'PLANIFICADO')} alCerrar={() => setModal(null)}
          alCerrarSprint={() => {
            setModal(null);
            setAviso(`Se cerró ${modal.sprint.nombre}.`);
            setVuelta((v) => v + 1);
          }} />
      )}
    </>
  );
}
