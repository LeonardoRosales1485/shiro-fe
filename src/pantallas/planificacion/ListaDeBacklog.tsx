// Backlog del proyecto (T6.3, prototipo "Backlog"): las tareas sin sprint en su orden único, el mismo para todos.
// Cada tarea tiene un menú para pasarla a un sprint abierto, subirla al principio o bajarla al final.
import { useEffect, useId, useState } from 'react';
import type { ProyectoDTO, SprintDTO, TareaDePlanDTO } from '../../api/tipos';
import { FilaDeTarea } from './FilaDeTarea';

type Props = {
  proyecto: ProyectoDTO;
  tareas: TareaDePlanDTO[];
  abiertos: SprintDTO[];
  ocupado: boolean;
  alMover: (tarea: TareaDePlanDTO, sprint: SprintDTO) => void;
  alOrdenar: (uuids: string[]) => void;
};

export function ListaDeBacklog({ proyecto, tareas, abiertos, ocupado, alMover, alOrdenar }: Props) {
  const id = useId();
  const [menu, setMenu] = useState<string | null>(null);

  // Escape cierra el menu abierto
  useEffect(() => {
    if (!menu) return;
    const alPresionar = (evento: KeyboardEvent) => evento.key === 'Escape' && setMenu(null);
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [menu]);

  const elegir = (accion: () => void) => () => {
    setMenu(null);
    accion();
  };

  return (
    <section className="ui-card sh-tarjeta" aria-labelledby={`${id}-t`}>
      <div>
        <h2 className="ui-card-title" id={`${id}-t`}>Backlog</h2>
        <p className="ui-muted" style={{ margin: 0 }}>{`${tareas.length} ${tareas.length === 1 ? 'tarea' : 'tareas'} sin sprint · el orden es el mismo para todos`}</p>
      </div>
      {tareas.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>No hay tareas sin sprint.</p>}
      <ul className="sh-vinculos">
        {tareas.map((t) => (
          <FilaDeTarea key={t.uuid} proyecto={proyecto} tarea={t} acciones={
            <span className="sh-menu-ancla">
              <button className="ui-btn ghost sm" type="button" aria-haspopup="menu" aria-expanded={menu === t.uuid} disabled={ocupado}
                aria-label={`Acciones de ${t.clave}`} onClick={() => setMenu(menu === t.uuid ? null : t.uuid)}>···</button>
              {menu === t.uuid && (
                <span className="ui-menu sh-menu" role="menu" aria-label={`Acciones de ${t.clave}`}>
                  {abiertos.map((s) => (
                    <button key={s.uuid} className="ui-menu-item" type="button" role="menuitem" onClick={elegir(() => alMover(t, s))}>
                      {`Mover a ${s.nombre}${s.estado === 'ACTIVO' ? ' (activo)' : ''}`}
                    </button>
                  ))}
                  <button className="ui-menu-item" type="button" role="menuitem" onClick={elegir(() => alOrdenar([t.uuid]))}>Subir al principio</button>
                  <button className="ui-menu-item" type="button" role="menuitem"
                    onClick={elegir(() => alOrdenar(tareas.filter((x) => x.uuid !== t.uuid).map((x) => x.uuid)))}>Bajar al final</button>
                </span>
              )}
            </span>
          } />
        ))}
      </ul>
    </section>
  );
}
