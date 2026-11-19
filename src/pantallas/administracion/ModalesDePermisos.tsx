// Modales de la pestaña Permisos (T6.5): cambiar los permisos de un grupo (prototipo "Cambiar permisos de un grupo")
// y agregar una excepción por usuario (prototipo "Excepción por usuario"), que muestra lo que hoy hereda la persona.
import { useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import type { ProyectoDTO } from '../../api/tipos';
import { AlertaDeError, Modal } from '../../componentes/Modal';
import { useEnvio } from '../../componentes/useEnvio';
import { nombreDeGrupo, nombreDePersona, type Grupo, type UsuarioAdministrado } from './comun';
import { NIVELES, NOMBRES_DE_NIVEL, VERBOS_DE_NIVEL, esDelAlcance, puede, type Alcance, type Efecto, type Nivel, type ReglaDTO } from './reglas';

// Recurso de una regla nueva: el proyecto o un tablero
function recurso(proyecto: ProyectoDTO, alcance: Alcance) {
  return alcance.tablero === null ? { tipoRecurso: 'PROYECTO', proyectoUuid: proyecto.uuid } : { tipoRecurso: 'TABLERO', tableroUuid: alcance.tablero };
}

// Clave de una celda del modal de un grupo
const celda = (alcance: Alcance, nivel: Nivel) => `${alcance.tablero ?? 'proyecto'}:${nivel}`;

type PropsGrupo = {
  grupo: Grupo; proyecto: ProyectoDTO; alcances: Alcance[]; reglas: ReglaDTO[]; alGuardar: () => void; alCerrar: () => void;
};

// Permisos de un grupo en el proyecto: por alcance y nivel, sin regla, permite o niega. Guarda solo lo que cambió:
// crea las reglas nuevas, cambia el efecto de las existentes y archiva las que se sacan
export function CambiarPermisosModal({ grupo, proyecto, alcances, reglas, alGuardar, alCerrar }: PropsGrupo) {
  const existente = (alcance: Alcance, nivel: Nivel) => reglas.find((r) => r.nivel === nivel && esDelAlcance(r, alcance));
  const [elegidos, setElegidos] = useState<Record<string, Efecto | ''>>(() => Object.fromEntries(
    alcances.flatMap((a) => NIVELES.map((n) => [celda(a, n), existente(a, n)?.efecto ?? '']))));
  const { enviando, error, enviar } = useEnvio();

  const guardar = () => enviar(async () => {
    for (const alcance of alcances) {
      for (const nivel of NIVELES) {
        const anterior = existente(alcance, nivel);
        const nuevo = elegidos[celda(alcance, nivel)];
        if (anterior && !nuevo) await pedir('POST', `/regla-permiso/${anterior.uuid}/archivar`);
        else if (anterior && nuevo !== anterior.efecto) await pedir('POST', '/regla-permiso/guardar', { ...anterior, efecto: nuevo });
        else if (!anterior && nuevo) {
          await pedir('POST', '/regla-permiso/guardar', { tipoSujeto: 'ROL', rolUuid: grupo.uuid, ...recurso(proyecto, alcance), nivel, efecto: nuevo });
        }
      }
    }
    alGuardar();
  });
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid" type="button" disabled={enviando} onClick={guardar}>Guardar permisos</button>
  </>;
  return (
    <Modal titulo="Cambiar permisos de un grupo" alCerrar={alCerrar} pie={pie} ancho={640}>
      <p className="ui-muted" style={{ margin: 0 }}>{`Permisos del grupo ${nombreDeGrupo(grupo.nombre)} en ${proyecto.nombre}`}</p>
      <div className="ui-table-wrap">
        <table className="ui-table" aria-label="Permisos del grupo">
          <thead><tr><th>Alcance</th>{NIVELES.map((n) => <th key={n}>{NOMBRES_DE_NIVEL[n]}</th>)}</tr></thead>
          <tbody>
            {alcances.map((a) => (
              <tr key={a.nombre}>
                <td>{a.nombre}</td>
                {NIVELES.map((n) => (
                  <td key={n}>
                    <select className="ui-select" aria-label={`${a.nombre} · ${NOMBRES_DE_NIVEL[n]}`} value={elegidos[celda(a, n)]}
                      onChange={(e) => setElegidos((antes) => ({ ...antes, [celda(a, n)]: e.target.value as Efecto | '' }))}>
                      <option value="">—</option><option value="PERMITIR">Permite</option><option value="NEGAR">Niega</option>
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ui-help" style={{ margin: 0 }}>
        Sin regla en un tablero, vale lo del proyecto. Editar y Archivar permitidos incluyen Ver. Las excepciones por usuario siguen valiendo.
      </p>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}

type PropsExcepcion = {
  proyecto: ProyectoDTO; alcances: Alcance[]; reglas: ReglaDTO[]; grupos: Grupo[]; usuarios: UsuarioAdministrado[];
  alGuardar: () => void; alCerrar: () => void;
};

// Excepcion de una persona sobre el proyecto o un tablero: da o quita un nivel, y prevalece sobre sus grupos
export function ExcepcionModal({ proyecto, alcances, reglas, usuarios, alGuardar, alCerrar }: PropsExcepcion) {
  const id = useId();
  const [usuarioUuid, setUsuarioUuid] = useState('');
  const [alcanceElegido, setAlcanceElegido] = useState(proyecto.uuid);
  const [nivel, setNivel] = useState<Nivel>('VER');
  const [efecto, setEfecto] = useState<Efecto>('PERMITIR');
  const { enviando, error, enviar } = useEnvio();
  const usuario = usuarios.find((u) => u.uuid === usuarioUuid) ?? null;
  const alcance = alcances.find((a) => a.tablero === alcanceElegido) ?? alcances[0];
  const enElAlcance = alcance.tablero === null ? `en el proyecto ${proyecto.nombre}` : `en el tablero ${alcance.nombre}`;
  const heredado = usuario && puede(reglas.filter((r) => r.tipoSujeto === 'ROL' && usuario.grupos.some((g) => g.uuid === r.rolUuid)), nivel, alcance.tablero);

  const guardar = () => enviar(async () => {
    await pedir('POST', '/regla-permiso/guardar', { tipoSujeto: 'USUARIO', usuarioUuid, ...recurso(proyecto, alcance), nivel, efecto });
    alGuardar();
  });
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid" type="button" disabled={!usuario || enviando} onClick={guardar}>Guardar excepción</button>
  </>;
  return (
    <Modal titulo="Excepción por usuario" alCerrar={alCerrar} pie={pie} ancho={520}>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-u`}>Persona</label>
        <select id={`${id}-u`} className="ui-select" value={usuarioUuid} onChange={(e) => setUsuarioUuid(e.target.value)}>
          <option value="">Elegí una persona…</option>
          {usuarios.map((u) => <option key={u.uuid} value={u.uuid}>{nombreDePersona(u)}</option>)}
        </select>
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-a`}>Alcance</label>
        <select id={`${id}-a`} className="ui-select" value={alcanceElegido} onChange={(e) => setAlcanceElegido(e.target.value)}>
          {alcances.map((a) => <option key={a.nombre} value={a.tablero ?? proyecto.uuid}>{a.tablero === null ? 'Todo el proyecto' : a.nombre}</option>)}
        </select>
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-n`}>Nivel</label>
        <select id={`${id}-n`} className="ui-select" value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)}>
          {NIVELES.map((n) => <option key={n} value={n}>{NOMBRES_DE_NIVEL[n]}</option>)}
        </select>
      </div>
      <div className="ui-row" role="radiogroup" aria-label="Efecto">
        <label className="ui-check"><input type="radio" name={`${id}-e`} checked={efecto === 'PERMITIR'} onChange={() => setEfecto('PERMITIR')} />Da permiso</label>
        <label className="ui-check"><input type="radio" name={`${id}-e`} checked={efecto === 'NEGAR'} onChange={() => setEfecto('NEGAR')} />Quita permiso</label>
      </div>
      {usuario && (
        <p className="ui-help" style={{ margin: 0 }}>
          {`Por sus grupos hoy ${heredado ? 'puede' : 'no puede'} ${VERBOS_DE_NIVEL[nivel]} ${enElAlcance}. La excepción prevalece aunque cambien sus grupos.`}
        </p>
      )}
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
