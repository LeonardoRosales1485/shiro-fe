// Comentarios e historial del detalle de tarea (T6.2, prototipos "Detalle" y "Detalle · historial"), en pestañas.
// El historial se pide al abrir su pestaña, no se edita y se puede filtrar para ver solo lo hecho por MCP.
import { useId, useState } from 'react';
import type { ComentarioDTO, HistorialDTO } from '../../api/tipos';
import { ACCIONES_CON_CAMBIO, autor, fecha, fraseDeHistorial, iniciales } from '../../componentes/catalogos';
import { AlertaDeError } from '../../componentes/Modal';

type Props = {
  comentarios: ComentarioDTO[];
  historial: HistorialDTO[] | null;
  errorDelHistorial: string | null;
  comentando: boolean;
  alAbrirHistorial: () => void;
  alComentar: (cuerpo: string) => Promise<boolean>;
};

export function Actividad({ comentarios, historial, errorDelHistorial, comentando, alAbrirHistorial, alComentar }: Props) {
  const [pestana, setPestana] = useState<'comentarios' | 'historial'>('comentarios');
  const [nuevo, setNuevo] = useState('');
  const [soloMcp, setSoloMcp] = useState(false);
  const id = useId();
  const visibles = (historial ?? []).filter((fila) => !soloMcp || fila.canal === 'MCP');

  const abrir = (cual: 'comentarios' | 'historial') => {
    setPestana(cual);
    if (cual === 'historial') alAbrirHistorial();
  };

  const comentar = async () => {
    if (await alComentar(nuevo.trim())) setNuevo('');
  };

  return (
    <section className="ui-card sh-actividad">
      <div className="ui-tabs" role="tablist" aria-label="Actividad">
        <button id={`${id}-tc`} role="tab" type="button" aria-selected={pestana === 'comentarios'} aria-controls={`${id}-pc`}
          className="ui-tab" onClick={() => abrir('comentarios')}>{`Comentarios (${comentarios.length})`}</button>
        <button id={`${id}-th`} role="tab" type="button" aria-selected={pestana === 'historial'} aria-controls={`${id}-ph`}
          className="ui-tab" onClick={() => abrir('historial')}>{historial ? `Historial (${historial.length})` : 'Historial'}</button>
      </div>
      {pestana === 'comentarios' ? (
        <div id={`${id}-pc`} role="tabpanel" aria-labelledby={`${id}-tc`} className="sh-lista-actividad">
          {comentarios.map((c) => (
            <article key={c.uuid} className="sh-comentario">
              <span className="ui-avatar sm" aria-hidden="true">{iniciales(c.autorNombre ?? '?')}</span>
              <div>
                <p className="sh-comentario-autor">
                  <strong>{autor(c.autorNombre, c.canal)}</strong>
                  {c.canal === 'MCP' && <span className="ui-chip is-violet">Agente</span>}
                  <span className="ui-muted">{` · ${fecha(c.fecha, true)}`}</span>
                </p>
                <p className="sh-texto">{c.cuerpo}</p>
              </div>
            </article>
          ))}
          <div className="ui-field">
            <label className="ui-label" htmlFor={`${id}-nuevo`}>Nuevo comentario</label>
            <textarea id={`${id}-nuevo`} className="ui-textarea" rows={3} value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
          </div>
          <div className="ui-row" style={{ justifyContent: 'flex-end' }}>
            <button className="ui-btn solid" type="button" disabled={!nuevo.trim() || comentando} onClick={comentar}>Comentar</button>
          </div>
        </div>
      ) : (
        <div id={`${id}-ph`} role="tabpanel" aria-labelledby={`${id}-th`} className="sh-lista-actividad">
          <div className="ui-row">
            <label className="ui-check"><input type="checkbox" checked={soloMcp} onChange={(e) => setSoloMcp(e.target.checked)} />Solo cambios vía MCP</label>
            <span className="ui-spacer" />
            <span className="ui-help">El historial no se puede editar.</span>
          </div>
          <AlertaDeError mensaje={errorDelHistorial} />
          {!historial && !errorDelHistorial && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
          {visibles.map((fila) => (
            <article key={fila.uuid} className="sh-comentario">
              <span className="ui-avatar sm" aria-hidden="true">{iniciales(fila.usuarioNombre ?? '?')}</span>
              <div>
                <p className="sh-comentario-autor">
                  <span>{`${autor(fila.usuarioNombre, fila.canal)} ${fraseDeHistorial(fila.accion, fila.campo, fila.valorNuevo)}`}</span>
                  {fila.canal === 'MCP' && <span className="ui-chip is-violet">MCP</span>}
                  <span className="ui-muted">{fecha(fila.fechaDeCreacion, true)}</span>
                </p>
                {ACCIONES_CON_CAMBIO.includes(fila.accion) && (
                  <p className="sh-texto ui-muted">{`${fila.valorAnterior ?? '—'} → ${fila.valorNuevo ?? '—'}`}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
