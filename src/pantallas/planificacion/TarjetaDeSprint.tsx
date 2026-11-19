// Tarjeta de un sprint (T6.3, prototipos "Backlog" y "Sprint cerrado"): nombre, estado, fechas, tareas y puntos.
// El activo muestra el avance en puntos y cuántas tareas tiene por tablero, y se cierra; el planificado se inicia
// (si no hay otro activo); el cerrado se archiva. Las tareas de un sprint abierto se pueden sacar al backlog.
import { useId } from 'react';
import type { ProyectoDTO, SprintDTO, TareaDePlanDTO } from '../../api/tipos';
import { fecha } from '../../componentes/catalogos';
import { Icono } from '../../componentes/Icono';
import { FilaDeTarea, puntosDe } from './FilaDeTarea';

type Props = {
  proyecto: ProyectoDTO;
  sprint: SprintDTO;
  tareas: TareaDePlanDTO[] | null;
  terminados: Set<string>;
  activo: SprintDTO | null;
  ocupado: boolean;
  alCerrar: () => void;
  alIniciar: () => void;
  alArchivar: () => void;
  alSacar: (tarea: TareaDePlanDTO) => void;
};

const ESTADOS = { ACTIVO: { nombre: 'Activo', tono: 'is-success' }, PLANIFICADO: { nombre: 'Planificado', tono: 'is-info' }, CERRADO: { nombre: 'Cerrado', tono: '' } };

export function TarjetaDeSprint({ proyecto, sprint, tareas, terminados, activo, ocupado, alCerrar, alIniciar, alArchivar, alSacar }: Props) {
  const id = useId();
  const lista = tareas ?? [];
  const total = puntosDe(lista);
  const hechos = puntosDe(lista.filter((t) => t.estadoUuid && terminados.has(t.estadoUuid)));
  const estado = ESTADOS[sprint.estado];
  const otroActivo = sprint.estado === 'PLANIFICADO' && activo !== null;
  return (
    <section className="ui-card sh-tarjeta" aria-labelledby={`${id}-t`}>
      <div className="ui-row">
        <h2 className="ui-card-title" id={`${id}-t`}>{sprint.nombre}</h2>
        <span className={`ui-chip ${estado.tono}`}>{estado.nombre}</span>
        <span className="ui-spacer" />
        {sprint.estado === 'ACTIVO' && <button className="ui-btn" type="button" disabled={ocupado} onClick={alCerrar}>Cerrar sprint</button>}
        {sprint.estado === 'PLANIFICADO' && <button className="ui-btn" type="button" disabled={ocupado || otroActivo} onClick={alIniciar}>Iniciar sprint</button>}
        {sprint.estado === 'CERRADO' && <button className="ui-btn outline is-danger" type="button" disabled={ocupado} onClick={alArchivar}><Icono nombre="archivo" />Archivar sprint</button>}
      </div>
      <p className="ui-muted" style={{ margin: 0 }}>
        {`${fecha(sprint.inicio)} – ${fecha(sprint.fin)} · ${lista.length} ${lista.length === 1 ? 'tarea' : 'tareas'} · ${total} puntos`}
      </p>
      {otroActivo && <p className="ui-help" style={{ margin: 0 }}>{`Solo puede haber un sprint activo por proyecto. Cerrá el ${activo.nombre} para iniciar este.`}</p>}
      {sprint.estado === 'ACTIVO' && (
        <div className="sh-avance">
          <span>{`${hechos} de ${total} puntos hechos`}</span>
          <div className="sh-barra" role="progressbar" aria-label="Avance" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hechos}>
            <span style={{ width: total ? `${Math.round((hechos * 100) / total)}%` : 0 }} />
          </div>
          <div className="sh-chips">
            {proyecto.tableros.map((t) => (
              <span key={t.uuid} className="ui-chip">{`${t.tipoTableroNombre} ${lista.filter((x) => x.tableroCodigo === t.tipoTableroCodigo).length}`}</span>
            ))}
          </div>
        </div>
      )}
      {tareas === null && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
      {lista.length > 0 && (
        <ul className="sh-vinculos">
          {lista.map((t) => (
            <FilaDeTarea key={t.uuid} proyecto={proyecto} tarea={t} extra={<span className="ui-chip">{t.estadoNombre}</span>}
              acciones={sprint.estado !== 'CERRADO' && (
                <button className="ui-x" type="button" disabled={ocupado} aria-label={`Sacar ${t.clave} del sprint`} title="Volver al backlog" onClick={() => alSacar(t)}>
                  <Icono nombre="cerrar" />
                </button>
              )} />
          ))}
        </ul>
      )}
    </section>
  );
}
