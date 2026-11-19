// Subtareas y relaciones del detalle de tarea (T6.2, prototipo "Detalle"). Las subtareas muestran cuántas están
// hechas y se agregan con solo el título; las relaciones muestran el vínculo visto desde esta tarea y el estado de la
// otra, y se quitan (salvo las de clon, que crea y mantiene clonar).
import { useId, useState } from 'react';
import type { RelacionDeTareaDTO, TareaHijaDTO } from '../../api/tipos';
import { VINCULOS } from '../../componentes/catalogos';
import { Icono } from '../../componentes/Icono';
import { EnlaceATarea } from './PanelDeDetalles';

type PropsSubtareas = {
  prefijo: string;
  hijas: TareaHijaDTO[];
  terminados: string[];
  titulo: string;
  permiteAgregar: boolean;
  agregando: boolean;
  alAgregar: (titulo: string) => Promise<boolean>;
};

export function Subtareas({ prefijo, hijas, terminados, titulo, permiteAgregar, agregando, alAgregar }: PropsSubtareas) {
  const [nueva, setNueva] = useState('');
  const id = useId();
  const hechas = hijas.filter((h) => h.estadoNombre && terminados.includes(h.estadoNombre)).length;
  const agregar = async () => {
    if (await alAgregar(nueva.trim())) setNueva('');
  };
  return (
    <section className="ui-card sh-tarjeta" aria-labelledby={`${id}-t`}>
      <div className="ui-row">
        <h2 className="ui-card-title" id={`${id}-t`} style={{ margin: 0 }}>{titulo}</h2>
        <span className="ui-spacer" />
        {hijas.length > 0 && <span className="ui-muted">{`${hechas} de ${hijas.length} hechas`}</span>}
      </div>
      <ul className="sh-vinculos">
        {hijas.map((h) => (
          <li key={h.uuid}>
            <EnlaceATarea prefijo={prefijo} clave={h.clave} texto={`${h.clave} · ${h.titulo}`} />
            <span className="ui-chip">{h.estadoNombre}</span>
          </li>
        ))}
      </ul>
      {permiteAgregar && (
        <form className="sh-agregar" onSubmit={(e) => {
          e.preventDefault();
          agregar();
        }}>
          <label className="sh-sr" htmlFor={`${id}-n`}>Título de la nueva subtarea</label>
          <input id={`${id}-n`} className="ui-input" placeholder="Título de la nueva subtarea" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          <button className="ui-btn" type="submit" disabled={!nueva.trim() || agregando}>Agregar</button>
        </form>
      )}
    </section>
  );
}

type PropsRelaciones = {
  prefijo: string;
  relaciones: RelacionDeTareaDTO[];
  ocupado: boolean;
  alRelacionar: () => void;
  alQuitar: (relacion: RelacionDeTareaDTO) => void;
};

export function Relaciones({ prefijo, relaciones, ocupado, alRelacionar, alQuitar }: PropsRelaciones) {
  const id = useId();
  return (
    <section className="ui-card sh-tarjeta" aria-labelledby={`${id}-t`}>
      <div className="ui-row">
        <h2 className="ui-card-title" id={`${id}-t`} style={{ margin: 0 }}>Relaciones</h2>
        <span className="ui-spacer" />
        <button className="ui-btn ghost sm" type="button" onClick={alRelacionar}><Icono nombre="mas" />Relacionar</button>
      </div>
      {relaciones.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>Sin relaciones.</p>}
      <ul className="sh-vinculos">
        {relaciones.map((r) => (
          <li key={r.uuid}>
            <EnlaceATarea prefijo={prefijo} clave={r.tareaClave} texto={`${r.tareaClave} · ${r.tareaTitulo}`} />
            <span className="ui-muted">{VINCULOS[r.vinculo] ?? r.vinculo}</span>
            {r.tareaArchivada && <span className="ui-chip">Archivada</span>}
            <span className="ui-spacer" />
            <span className="ui-chip">{r.tareaEstadoNombre}</span>
            {!r.vinculo.startsWith('CLONADA') && (
              <button className="ui-x" type="button" disabled={ocupado} aria-label={`Quitar la relación con ${r.tareaClave}`} onClick={() => alQuitar(r)}>
                <Icono nombre="cerrar" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
