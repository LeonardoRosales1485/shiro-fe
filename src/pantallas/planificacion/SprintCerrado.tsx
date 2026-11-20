// Sprint cerrado (T6.3, prototipo "Sprint cerrado", propuesta 46 resuelta el 19/11): quién lo cerró y cuándo, cuántas
// tareas y puntos se terminaron, cuántas pasaron a otro sprint o volvieron al backlog, y la tabla de tareas con su
// estado al cerrar y su destino (todas o solo las sin terminar). Se archiva.
import { useEffect, useId, useState } from 'react';
import { mensajeDeError, pedir } from '../../api/cliente';
import type { ProyectoDTO, SprintCierreDTO, SprintDTO } from '../../api/tipos';
import { fecha, nombreDeTablero } from '../../componentes/catalogos';
import { Icono } from '../../componentes/Icono';
import { AlertaDeError } from '../../componentes/Modal';
import { EnlaceATarea } from '../detalle/PanelDeDetalles';
import { CabeceraDeSprint, puntosDe } from './FilaDeTarea';

type Props = { proyecto: ProyectoDTO; sprint: SprintDTO; ocupado: boolean; alArchivar: () => void };

export function SprintCerrado({ proyecto, sprint, ocupado, alArchivar }: Props) {
  const id = useId();
  const [cierre, setCierre] = useState<SprintCierreDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soloSinTerminar, setSoloSinTerminar] = useState(false);

  useEffect(() => {
    let vigente = true;
    pedir<SprintCierreDTO>('GET', `/sprint/${sprint.uuid}/cierre`)
      .then((leido) => vigente && setCierre(leido))
      .catch((e) => vigente && setError(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [sprint.uuid]);

  const tareas = cierre?.tareas ?? [];
  const terminadas = tareas.filter((t) => t.terminada);
  const destinos = [...new Set(tareas.filter((t) => t.destino === 'SPRINT').map((t) => t.sprintDestinoNombre ?? ''))];
  const visibles = soloSinTerminar ? tareas.filter((t) => !t.terminada) : tareas;
  const quien = cierre?.fechaDeCierre ? ` · cerrado el ${fecha(cierre.fechaDeCierre)}${cierre.cerradoPorNombre ? ` por ${cierre.cerradoPorNombre}` : ''}` : '';

  return (
    <section className="ui-card sh-tarjeta" aria-labelledby={`${id}-t`}>
      <CabeceraDeSprint idTitulo={`${id}-t`} nombre={sprint.nombre} estado="Cerrado" tono="">
        <button className="ui-btn outline is-danger" type="button" disabled={ocupado} onClick={alArchivar}><Icono nombre="archivo" />Archivar sprint</button>
      </CabeceraDeSprint>
      <p className="ui-muted" style={{ margin: 0 }}>{`${fecha(sprint.inicio)} – ${fecha(sprint.fin)}${quien}`}</p>
      <AlertaDeError mensaje={error} />
      {!cierre && !error && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
      {cierre && (
        <>
          <div className="sh-chips">
            <span className="ui-chip is-success">{`Terminadas ${terminadas.length} de ${tareas.length}`}</span>
            <span className="ui-chip">{`Puntos hechos ${puntosDe(terminadas)} de ${puntosDe(tareas)}`}</span>
            {destinos.map((nombre) => (
              <span key={nombre} className="ui-chip">{`Pasaron al ${nombre}: ${tareas.filter((t) => t.sprintDestinoNombre === nombre).length}`}</span>
            ))}
            <span className="ui-chip">{`Volvieron al backlog: ${tareas.filter((t) => t.destino === 'BACKLOG').length}`}</span>
          </div>
          <div className="ui-row" role="radiogroup" aria-label="Qué tareas mostrar">
            <label className="ui-check"><input type="radio" name={`${id}-f`} checked={!soloSinTerminar} onChange={() => setSoloSinTerminar(false)} />Todas</label>
            <label className="ui-check"><input type="radio" name={`${id}-f`} checked={soloSinTerminar} onChange={() => setSoloSinTerminar(true)} />Sin terminar</label>
          </div>
          <div className="ui-table-wrap">
            <table className="ui-table" aria-label="Tareas del sprint">
              <thead><tr><th>Clave</th><th>Título</th><th>Tablero</th><th>Estado al cerrar</th><th>Destino</th></tr></thead>
              <tbody>
                {visibles.map((t) => (
                  <tr key={t.uuid}>
                    <td><EnlaceATarea prefijo={proyecto.prefijo} clave={t.clave} texto={t.clave} /></td>
                    <td>{t.titulo}</td>
                    <td>{nombreDeTablero(proyecto.tableros, t.tableroCodigo)}</td>
                    <td>{t.estadoAlCerrar}</td>
                    <td>{t.destino === 'TERMINADA' ? '—' : t.destino === 'BACKLOG' ? 'Backlog' : t.sprintDestinoNombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
