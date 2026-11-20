// Nuevo grupo (T6.5, prototipo "Nuevo grupo"): nombre y personas. Se crea sin permisos (se asignan en la pestaña
// Permisos) y a cada persona elegida se le suma el grupo a los que ya tiene.
import { useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import { AlertaDeError, Modal } from '../../componentes/Modal';
import { useEnvio } from '../../componentes/useEnvio';
import { asignarGrupos, nombreDePersona, uuidsDeGrupos, type Grupo, type UsuarioAdministrado } from './comun';
import { BotonDeAccion } from '../../componentes/BotonDeAccion';

type Props = { usuarios: UsuarioAdministrado[]; alCrear: (nombre: string) => void; alCerrar: () => void };

export function NuevoGrupoModal({ usuarios, alCrear, alCerrar }: Props) {
  const id = useId();
  const [nombre, setNombre] = useState('');
  const [elegidos, setElegidos] = useState<UsuarioAdministrado[]>([]);
  const { enviando, error, enviar } = useEnvio();
  const crear = () => enviar(async () => {
    const grupo = await pedir<Grupo>('POST', '/rol/guardar', { nombre: nombre.trim(), permisos: [] });
    for (const usuario of elegidos) await asignarGrupos(usuario.uuid, [...uuidsDeGrupos(usuario), grupo.uuid]);
    alCrear(grupo.nombre);
  });
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <BotonDeAccion clase="ui-btn solid" texto="Crear grupo" enviando={enviando} deshabilitado={!nombre.trim()} alHacerClic={crear} />
  </>;
  return (
    <Modal titulo="Nuevo grupo" alCerrar={alCerrar} pie={pie} ancho={480}>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-n`}>Nombre</label>
        <input id={`${id}-n`} className="ui-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-p`}>Sumar persona</label>
        <select id={`${id}-p`} className="ui-select" value="" onChange={(e) => {
          const usuario = usuarios.find((u) => u.uuid === e.target.value);
          if (usuario) setElegidos((antes) => [...antes, usuario]);
        }}>
          <option value="">Sumar persona…</option>
          {usuarios.filter((u) => !elegidos.includes(u)).map((u) => <option key={u.uuid} value={u.uuid}>{nombreDePersona(u)}</option>)}
        </select>
      </div>
      {elegidos.length > 0 && (
        <div className="sh-chips" aria-label="Personas del grupo">
          {elegidos.map((u) => (
            <span key={u.uuid} className="ui-chip"><span>{nombreDePersona(u)}</span>
              <button className="ui-x" type="button" aria-label={`Quitar a ${nombreDePersona(u)}`}
                onClick={() => setElegidos((antes) => antes.filter((x) => x !== u))}>×</button>
            </span>
          ))}
        </div>
      )}
      <p className="ui-help" style={{ margin: 0 }}>El grupo se crea sin permisos. Asignalos después en la pestaña Permisos.</p>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
