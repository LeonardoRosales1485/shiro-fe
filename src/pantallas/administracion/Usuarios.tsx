// Pestaña Usuarios de la administracion (T6.5, prototipo "Administración · usuarios"): las personas con su correo,
// cómo ingresan, sus grupos y su estado, con buscador y filtros por grupo, ingreso y archivados. Desde cada fila se
// cambian sus grupos, se archiva o se restaura. Nadie administra al super admin, y solo el super admin administra a
// los Administradores.
import { Fragment, useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import { iniciales } from '../../componentes/catalogos';
import { BotonDeAccion } from '../../componentes/BotonDeAccion';
import { ConfirmarModal } from '../../componentes/ConfirmarModal';
import { AlertaDeError, Modal } from '../../componentes/Modal';
import { useEnvio } from '../../componentes/useEnvio';
import {
  ADMINISTRADORES, SUPER_ADMIN, asignarGrupos, nombreDeGrupo, nombreDePersona, puedeAdministrar, tieneGrupo, uuidsDeGrupos,
  type Grupo, type PropsDePestana, type UsuarioAdministrado,
} from './comun';

type Props = PropsDePestana;

export function Usuarios({ usuarios, grupos, soySuperAdmin, ejecutar, avisar }: Props) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [grupo, setGrupo] = useState('');
  const [ingreso, setIngreso] = useState('');
  const [conArchivados, setConArchivados] = useState(false);
  const [deGrupos, setDeGrupos] = useState<UsuarioAdministrado | null>(null);
  const [aArchivar, setAArchivar] = useState<UsuarioAdministrado | null>(null);

  const buscado = texto.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const visibles = usuarios.filter((u) => (conArchivados || !u.archivado)
    && (!grupo || u.grupos.some((g) => g.uuid === grupo))
    && (!ingreso || (ingreso === 'SHIRO') === u.cuentaDeShiro)
    && (!buscado || `${nombreDePersona(u)} ${u.email ?? ''}`.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(buscado)));

  return (
    <>
      <div className="ui-row sh-filtros">
        <div className="ui-field"><label className="ui-label" htmlFor={`${id}-b`}>Buscar</label>
          <input id={`${id}-b`} className="ui-input" type="search" value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
        <div className="ui-field"><label className="ui-label" htmlFor={`${id}-g`}>Grupo</label>
          <select id={`${id}-g`} className="ui-select" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            <option value="">Todos</option>
            {grupos.filter((g) => g.nombre !== SUPER_ADMIN).map((g) => <option key={g.uuid} value={g.uuid}>{nombreDeGrupo(g.nombre)}</option>)}
          </select></div>
        <div className="ui-field"><label className="ui-label" htmlFor={`${id}-i`}>Ingreso</label>
          <select id={`${id}-i`} className="ui-select" value={ingreso} onChange={(e) => setIngreso(e.target.value)}>
            <option value="">Todos</option><option value="GOOGLE">Google</option><option value="SHIRO">Cuenta de Shiro</option>
          </select></div>
        <label className="ui-check"><input type="checkbox" checked={conArchivados} onChange={(e) => setConArchivados(e.target.checked)} />Mostrar archivados</label>
      </div>
      <div className="ui-table-wrap">
        <table className="ui-table" aria-label="Usuarios">
          <thead><tr><th>Persona</th><th>Correo</th><th>Ingreso</th><th>Grupos</th><th>Estado</th><th><span className="sh-sr">Acciones</span></th></tr></thead>
          <tbody>
            {visibles.map((u) => (
              <tr key={u.uuid}>
                <td><span className="ui-row" style={{ gap: 8, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                  <span className="ui-avatar sm" aria-hidden="true">{iniciales(nombreDePersona(u))}</span>
                  <span>{nombreDePersona(u)}</span>
                  {tieneGrupo(u, SUPER_ADMIN) && <>{' '}<span className="ui-chip is-info">Super admin</span></>}
                </span></td>
                <td>{u.email ?? '—'}</td>
                <td>{u.cuentaDeShiro ? 'Cuenta de Shiro' : 'Google'}</td>
                <td><span className="sh-chips">
                  {u.grupos.filter((g) => g.nombre !== SUPER_ADMIN).map((g) => (
                    <Fragment key={g.uuid}>{' '}<span className="ui-chip">{nombreDeGrupo(g.nombre)}</span></Fragment>
                  ))}
                </span></td>
                <td>{u.archivado ? 'Archivado' : 'Activo'}</td>
                <td className="sh-acciones-fila">{puedeAdministrar(u, soySuperAdmin) && (u.archivado
                  ? <button className="ui-btn ghost sm" type="button" aria-label={`Restaurar ${nombreDePersona(u)}`}
                    onClick={() => ejecutar(() => pedir('POST', `/usuario/${u.uuid}/restaurar`), `Se restauró a ${nombreDePersona(u)}.`)}>Restaurar</button>
                  : <>
                    <button className="ui-btn ghost sm" type="button" aria-label={`Grupos de ${nombreDePersona(u)}`} onClick={() => setDeGrupos(u)}>Grupos</button>
                    <button className="ui-btn ghost sm" type="button" aria-label={`Archivar ${nombreDePersona(u)}`} onClick={() => setAArchivar(u)}>Archivar</button>
                  </>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visibles.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>No hay personas con esos filtros.</p>}
      <p className="ui-help" style={{ margin: 0 }}>Un usuario archivado no puede ingresar, sus tokens se revocan y sus tareas conservan el responsable.</p>
      {deGrupos && (
        <GruposDeUsuarioModal usuario={deGrupos} grupos={grupos} soySuperAdmin={soySuperAdmin} alCerrar={() => setDeGrupos(null)}
          alGuardar={async (elegidos) => {
            await asignarGrupos(deGrupos.uuid, elegidos);
            setDeGrupos(null);
            avisar(`Se actualizaron los grupos de ${nombreDePersona(deGrupos)}.`);
          }} />
      )}
      {aArchivar && (
        <ConfirmarModal titulo="Archivar usuario" pregunta={`¿Archivar a ${nombreDePersona(aArchivar)}?`} accion="Archivar"
          alCerrar={() => setAArchivar(null)}
          alConfirmar={async () => {
            await pedir('POST', `/usuario/${aArchivar.uuid}/archivar`);
            setAArchivar(null);
            avisar(`Se archivó a ${nombreDePersona(aArchivar)}.`);
          }}>
          <p style={{ margin: 0 }}>Un usuario archivado no puede ingresar, sus tokens se revocan y sus tareas conservan el responsable. Se puede restaurar.</p>
        </ConfirmarModal>
      )}
    </>
  );
}

// Grupos de una persona: casillas con los grupos (el de Administradores solo lo cambia el super admin)
function GruposDeUsuarioModal({ usuario, grupos, soySuperAdmin, alGuardar, alCerrar }: {
  usuario: UsuarioAdministrado; grupos: Grupo[]; soySuperAdmin: boolean; alGuardar: (grupos: string[]) => Promise<void>; alCerrar: () => void;
}) {
  const [elegidos, setElegidos] = useState<string[]>(uuidsDeGrupos(usuario));
  const { enviando, error, enviar } = useEnvio();
  const alternar = (uuid: string) => setElegidos((antes) => antes.includes(uuid) ? antes.filter((g) => g !== uuid) : [...antes, uuid]);
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <BotonDeAccion clase="ui-btn solid" texto="Guardar" enviando={enviando} alHacerClic={() => enviar(() => alGuardar(elegidos))} />
  </>;
  return (
    <Modal titulo={`Grupos de ${nombreDePersona(usuario)}`} alCerrar={alCerrar} pie={pie} ancho={440}>
      <div style={{ display: 'grid', gap: 8 }}>
        {grupos.filter((g) => g.nombre !== SUPER_ADMIN).map((g) => (
          <label key={g.uuid} className="ui-check">
            <input type="checkbox" checked={elegidos.includes(g.uuid)} disabled={g.nombre === ADMINISTRADORES && !soySuperAdmin}
              onChange={() => alternar(g.uuid)} />{nombreDeGrupo(g.nombre)}
          </label>
        ))}
      </div>
      {!soySuperAdmin && <p className="ui-help" style={{ margin: 0 }}>Solo el super admin suma o saca personas del grupo Administradores.</p>}
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
