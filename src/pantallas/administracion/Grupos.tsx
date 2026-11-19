// Pestaña Grupos de la administracion (T6.5, prototipos "Administración · grupos" y "Nuevo grupo"): los grupos con
// cuántas personas tienen y, del elegido, sus personas con la fecha desde la que están. Se suman y se sacan personas
// y se archivan los grupos que no son del sistema. El grupo Administradores es del sistema: solo el super admin suma
// o saca personas. Los permisos de cada grupo se ven en la pestaña Permisos.
import { useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import { fecha, iniciales } from '../../componentes/catalogos';
import { ConfirmarModal } from '../../componentes/ConfirmarModal';
import { Icono } from '../../componentes/Icono';
import {
  ADMINISTRADORES, SUPER_ADMIN, asignarGrupos, nombreDeGrupo, nombreDePersona, personas, tieneGrupo, uuidsDeGrupos,
  type Grupo, type PropsDePestana, type UsuarioAdministrado,
} from './comun';
import { NuevoGrupoModal } from './NuevoGrupoModal';

type Props = PropsDePestana & { alVerPermisos: () => void };

export function Grupos({ usuarios, grupos, soySuperAdmin, ejecutar, avisar, alVerPermisos }: Props) {
  const id = useId();
  const visibles = grupos.filter((g) => g.nombre !== SUPER_ADMIN);
  const [elegidoUuid, setElegidoUuid] = useState<string | null>(null);
  const [aSumar, setASumar] = useState('');
  const [modal, setModal] = useState<'nuevo' | 'archivar' | null>(null);
  const vigentes = usuarios.filter((u) => !u.archivado);
  const miembros = (grupo: Grupo) => vigentes.filter((u) => u.grupos.some((g) => g.uuid === grupo.uuid));
  const elegido = visibles.find((g) => g.uuid === elegidoUuid) ?? visibles[0] ?? null;
  const delSistema = elegido?.nombre === ADMINISTRADORES;
  const editable = elegido !== null && (!delSistema || soySuperAdmin);
  const candidatos = elegido ? vigentes.filter((u) => !tieneGrupo(u, SUPER_ADMIN) && !u.grupos.some((g) => g.uuid === elegido.uuid)) : [];

  const sumar = (grupo: Grupo) => {
    const usuario = vigentes.find((u) => u.uuid === aSumar);
    if (!usuario) return;
    setASumar('');
    ejecutar(() => asignarGrupos(usuario.uuid, [...uuidsDeGrupos(usuario), grupo.uuid]), `Se sumó a ${nombreDePersona(usuario)} a ${nombreDeGrupo(grupo.nombre)}.`);
  };
  const sacar = (grupo: Grupo, usuario: UsuarioAdministrado) => ejecutar(
    () => asignarGrupos(usuario.uuid, uuidsDeGrupos(usuario).filter((g) => g !== grupo.uuid)),
    `Se sacó a ${nombreDePersona(usuario)} de ${nombreDeGrupo(grupo.nombre)}.`);

  return (
    <div className="sh-admin-grupos">
      <section className="ui-card sh-tarjeta">
        <div className="ui-row" style={{ justifyContent: 'space-between' }}>
          <h2 className="ui-card-title" style={{ margin: 0 }}>Grupos</h2>
          <button className="ui-btn sm" type="button" onClick={() => setModal('nuevo')}><Icono nombre="mas" />Nuevo grupo</button>
        </div>
        <ul className="sh-vinculos">
          {visibles.map((g) => (
            <li key={g.uuid}>
              <button className={`ui-side-item sh-side-btn ${g.uuid === elegido?.uuid ? 'active' : ''}`} type="button" aria-pressed={g.uuid === elegido?.uuid}
                onClick={() => setElegidoUuid(g.uuid)}>
                <span>{nombreDeGrupo(g.nombre)}</span> <span className="ui-muted">{personas(miembros(g).length)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {elegido && (
        <section className="ui-card sh-tarjeta" aria-label={nombreDeGrupo(elegido.nombre)}>
          <div className="ui-row" style={{ justifyContent: 'space-between' }}>
            <span className="ui-row" style={{ gap: 8 }}>
              <h2 className="ui-card-title" style={{ margin: 0 }}>{nombreDeGrupo(elegido.nombre)}</h2>
              {delSistema && <span className="ui-chip is-info">Grupo del sistema</span>}
            </span>
            <span className="ui-row" style={{ gap: 8 }}>
              <button className="ui-btn ghost sm" type="button" onClick={alVerPermisos}>Ver permisos</button>
              {!delSistema && (
                <button className="ui-btn outline sm is-danger" type="button" aria-label={`Archivar grupo ${elegido.nombre}`} onClick={() => setModal('archivar')}>
                  <Icono nombre="archivo" />Archivar grupo
                </button>
              )}
            </span>
          </div>
          {delSistema && (
            <p className="ui-muted" style={{ margin: 0 }}>Pueden hacer todo, menos administrar a otros administradores o al super admin. Solo el super admin suma o saca personas de este grupo.</p>
          )}
          {editable && (
            <div className="ui-row" style={{ alignItems: 'flex-end' }}>
              <div className="ui-field" style={{ minWidth: 240 }}>
                <label className="ui-label" htmlFor={`${id}-s`}>Sumar persona</label>
                <select id={`${id}-s`} className="ui-select" value={aSumar} onChange={(e) => setASumar(e.target.value)}>
                  <option value="">Elegí una persona…</option>
                  {candidatos.map((u) => <option key={u.uuid} value={u.uuid}>{nombreDePersona(u)}</option>)}
                </select>
              </div>
              <button className="ui-btn" type="button" disabled={!aSumar} onClick={() => sumar(elegido)}>Sumar</button>
            </div>
          )}
          {miembros(elegido).length === 0 && <p className="ui-muted" style={{ margin: 0 }}>Todavía no hay personas en este grupo.</p>}
          <ul className="sh-vinculos">
            {miembros(elegido).map((u) => (
              <li key={u.uuid}>
                <span className="ui-row" style={{ gap: 8 }}>
                  <span className="ui-avatar sm" aria-hidden="true">{iniciales(nombreDePersona(u))}</span>
                  <span>{nombreDePersona(u)}</span>
                  <span className="ui-muted">{`desde ${fecha(u.grupos.find((g) => g.uuid === elegido.uuid)?.desde ?? null)}`}</span>
                </span>
                {editable && (
                  <button className="ui-btn ghost sm" type="button" aria-label={`Sacar a ${nombreDePersona(u)}`} onClick={() => sacar(elegido, u)}>Sacar</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {modal === 'nuevo' && (
        <NuevoGrupoModal usuarios={vigentes.filter((u) => !tieneGrupo(u, SUPER_ADMIN))} alCerrar={() => setModal(null)}
          alCrear={(nombre) => {
            setModal(null);
            avisar(`Se creó el grupo ${nombre}. Asignale permisos en la pestaña Permisos.`);
          }} />
      )}
      {modal === 'archivar' && elegido && (
        <ConfirmarModal titulo="Archivar grupo" pregunta={`¿Archivar el grupo ${elegido.nombre}?`} accion="Archivar" alCerrar={() => setModal(null)}
          alConfirmar={async () => {
            await pedir('POST', `/rol/${elegido.uuid}/archivar`);
            setModal(null);
            setElegidoUuid(null);
            avisar(`Se archivó el grupo ${elegido.nombre}.`);
          }}>
          <p style={{ margin: 0 }}>Sus personas dejan de tener los permisos del grupo.</p>
        </ConfirmarModal>
      )}
    </div>
  );
}
