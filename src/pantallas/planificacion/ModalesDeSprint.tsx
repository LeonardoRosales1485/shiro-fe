// Crear y cerrar un sprint (T6.3, prototipos "Crear sprint" y "Cerrar sprint"). Crear pide nombre y fechas y deja
// elegir tareas del backlog de todos los tableros; cerrar muestra lo terminado y lo pendiente y pregunta adónde va lo
// pendiente: a un sprint planificado o al backlog.
import { useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import type { ProyectoDTO, SprintDTO, TareaDePlanDTO } from '../../api/tipos';
import { nombreDeTablero } from '../../componentes/catalogos';
import { AlertaDeError, Modal } from '../../componentes/Modal';
import { useEnvio } from '../../componentes/useEnvio';
import { puntosDe } from './FilaDeTarea';

type PropsCrear = { proyecto: ProyectoDTO; backlog: TareaDePlanDTO[]; alCrear: (nombre: string) => void; alCerrar: () => void };

export function CrearSprintModal({ proyecto, backlog, alCrear, alCerrar }: PropsCrear) {
  const id = useId();
  const [nombre, setNombre] = useState('');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [elegidas, setElegidas] = useState<string[]>([]);
  const { enviando, error, enviar } = useEnvio();
  const puntos = puntosDe(backlog.filter((t) => elegidas.includes(t.uuid)));

  const crear = () => enviar(async () => {
    const sprint = await pedir<SprintDTO>('POST', '/sprint/guardar', { proyectoUuid: proyecto.uuid, nombre: nombre.trim(), inicio, fin });
    if (elegidas.length) await pedir('POST', `/sprint/${sprint.uuid}/asignar`, { tareas: elegidas });
    alCrear(sprint.nombre);
  });

  const campo = (clave: string, etiqueta: string, tipo: string, valor: string, poner: (v: string) => void) => (
    <div className="ui-field">
      <label className="ui-label" htmlFor={`${id}-${clave}`}>{etiqueta}</label>
      <input id={`${id}-${clave}`} className="ui-input" type={tipo} value={valor} onChange={(e) => poner(e.target.value)} />
    </div>
  );

  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid" type="button" disabled={!nombre.trim() || !inicio || !fin || enviando} onClick={crear}>Crear sprint</button>
  </>;

  return (
    <Modal titulo="Crear sprint" alCerrar={alCerrar} pie={pie} ancho={600}>
      {campo('nombre', 'Nombre', 'text', nombre, setNombre)}
      <div className="sh-grilla-2">
        {campo('inicio', 'Inicio', 'date', inicio, setInicio)}
        {campo('fin', 'Fin', 'date', fin, setFin)}
      </div>
      <fieldset className="sh-fieldset">
        <legend className="ui-label">Tareas del backlog</legend>
        <p className="ui-muted" style={{ margin: 0 }}>{`${elegidas.length} elegidas · ${puntos} puntos`}</p>
        <div className="sh-lista-elegible">
          {backlog.map((t) => (
            <label key={t.uuid} className="ui-check">
              <input type="checkbox" checked={elegidas.includes(t.uuid)}
                onChange={() => setElegidas((actuales) => (actuales.includes(t.uuid) ? actuales.filter((u) => u !== t.uuid) : [...actuales, t.uuid]))} />
              <span><strong>{t.clave}</strong>{` ${t.titulo} · ${nombreDeTablero(proyecto.tableros, t.tableroCodigo)}${t.puntos ? ` · ${t.puntos} puntos` : ''}`}</span>
            </label>
          ))}
        </div>
        <p className="ui-help" style={{ margin: 0 }}>Incluye tareas de todos los tableros del proyecto. También podés pasarlas después desde el backlog.</p>
      </fieldset>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}

type PropsCerrar = {
  sprint: SprintDTO;
  tareas: TareaDePlanDTO[];
  terminados: Set<string>;
  planificados: SprintDTO[];
  alCerrarSprint: () => void;
  alCerrar: () => void;
};

export function CerrarSprintModal({ sprint, tareas, terminados, planificados, alCerrarSprint, alCerrar }: PropsCerrar) {
  const hechas = tareas.filter((t) => t.estadoUuid && terminados.has(t.estadoUuid)).length;
  const pendientes = tareas.length - hechas;
  const [destino, setDestino] = useState<string>(planificados[0]?.uuid ?? 'BACKLOG');
  const { enviando, error, enviar } = useEnvio();

  const cerrar = () => enviar(async () => {
    await pedir('POST', `/sprint/${sprint.uuid}/cerrar`, destino === 'BACKLOG' ? { destino: 'BACKLOG' } : { destino: 'SPRINT', sprintDestinoUuid: destino });
    alCerrarSprint();
  });

  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid" type="button" disabled={enviando} onClick={cerrar}>Cerrar sprint</button>
  </>;

  return (
    <Modal titulo="Cerrar sprint" alCerrar={alCerrar} pie={pie} ancho={520}>
      <h3 className="ui-card-title">{`Cerrar ${sprint.nombre}`}</h3>
      <div className="ui-row">
        <span className="ui-chip is-success">{`Terminadas ${hechas}`}</span>
        <span className="ui-chip">{`Sin terminar ${pendientes}`}</span>
      </div>
      <fieldset className="sh-fieldset">
        <legend className="ui-label">{`¿Qué pasa con las ${pendientes} tareas sin terminar?`}</legend>
        {planificados.map((s) => (
          <label key={s.uuid} className="ui-check">
            <input type="radio" name="destino" checked={destino === s.uuid} onChange={() => setDestino(s.uuid)} />{`Pasan al ${s.nombre}`}
          </label>
        ))}
        <label className="ui-check">
          <input type="radio" name="destino" checked={destino === 'BACKLOG'} onChange={() => setDestino('BACKLOG')} />Vuelven al backlog
        </label>
      </fieldset>
      <p className="ui-help" style={{ margin: 0 }}>El sprint cerrado se puede seguir consultando desde Backlog y sprints.</p>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
