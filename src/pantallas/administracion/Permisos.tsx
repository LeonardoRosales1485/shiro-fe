// Pestaña Permisos de la administracion (T6.5, prototipos "Permisos", "Cambiar permisos de un grupo" y "Excepción por
// usuario"): por proyecto, qué permite o niega cada grupo sobre el proyecto y cada tablero, y las excepciones por
// usuario, que prevalecen sobre lo que heredan de sus grupos. Cada nivel (Ver, Editar, Archivar) se permite o se
// niega por separado; Editar y Archivar permitidos incluyen Ver. Los Administradores pueden todo.
import { useEffect, useId, useState } from 'react';
import { mensajeDeError, pedir } from '../../api/cliente';
import { TOPE_DE_PAGINA, type Pagina, type ProyectoDTO } from '../../api/tipos';
import { iniciales } from '../../componentes/catalogos';
import { Icono } from '../../componentes/Icono';
import { AlertaDeError } from '../../componentes/Modal';
import { useAccion } from '../../componentes/useAccion';
import { ADMINISTRADORES, SUPER_ADMIN, nombreDeGrupo, nombreDePersona, type Grupo, type UsuarioAdministrado } from './comun';
import { CambiarPermisosModal, ExcepcionModal } from './ModalesDePermisos';
import { NOMBRES_DE_NIVEL, esDelAlcance, resumen, type Alcance, type ReglaDTO } from './reglas';

type Props = { proyectos: ProyectoDTO[]; grupos: Grupo[]; usuarios: UsuarioAdministrado[] };

// Alcances de un proyecto: el proyecto entero y cada tablero
export function alcancesDe(proyecto: ProyectoDTO): Alcance[] {
  return [{ tablero: null, nombre: 'Proyecto' }, ...proyecto.tableros.map((t) => ({ tablero: t.uuid, nombre: t.tipoTableroNombre }))];
}

export function Permisos({ proyectos, grupos, usuarios }: Props) {
  const id = useId();
  const [proyectoUuid, setProyectoUuid] = useState(proyectos[0]?.uuid ?? '');
  const [reglas, setReglas] = useState<{ proyecto: string; lista: ReglaDTO[] } | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const [cambiando, setCambiando] = useState<Grupo | null>(null);
  const [agregando, setAgregando] = useState(false);
  const { ocupado, aviso, setAviso, error, ejecutar } = useAccion(() => setVuelta((v) => v + 1));
  const proyecto = proyectos.find((p) => p.uuid === proyectoUuid) ?? null;

  useEffect(() => {
    if (!proyectoUuid) return undefined;
    let vigente = true;
    const filtros = [[
      { campo: 'proyecto.uuid', operacion: '=', valor: proyectoUuid }, { campo: 'tablero.proyecto.uuid', operacion: '=', valor: proyectoUuid },
    ]];
    pedir<Pagina<ReglaDTO>>('POST', '/regla-permiso/paginar', { pagina: 1, tamano: TOPE_DE_PAGINA, filtros, ordenes: [] })
      .then((pagina) => vigente && setReglas({ proyecto: proyectoUuid, lista: pagina.contenido }))
      .catch((e) => vigente && setErrorDeCarga(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [proyectoUuid, vuelta]);

  const lista = reglas?.proyecto === proyectoUuid ? reglas.lista : null;
  const alcances = proyecto ? alcancesDe(proyecto) : [];
  const deGrupo = (grupo: Grupo, alcance: Alcance) => (lista ?? []).filter((r) => r.rolUuid === grupo.uuid && esDelAlcance(r, alcance));
  const excepciones = (lista ?? []).filter((r) => r.tipoSujeto === 'USUARIO');
  const persona = (uuid: string | null) => {
    const usuario = usuarios.find((u) => u.uuid === uuid);
    return usuario ? nombreDePersona(usuario) : 'Persona';
  };
  const grupoDe = (uuid: string | null) => usuarios.find((u) => u.uuid === uuid)?.grupos.filter((g) => g.nombre !== SUPER_ADMIN)
    .map((g) => nombreDeGrupo(g.nombre)).join(', ');
  const nombreDelAlcance = (regla: ReglaDTO) => alcances.find((a) => esDelAlcance(regla, a))?.nombre ?? '';
  const avisar = (mensaje: string) => {
    setAviso(mensaje);
    setVuelta((v) => v + 1);
  };

  if (proyectos.length === 0) return <p className="ui-muted" style={{ margin: 0 }}>Todavía no hay proyectos.</p>;
  return (
    <>
      {proyectos.length > 1 && (
        <div className="ui-field" style={{ maxWidth: 320 }}>
          <label className="ui-label" htmlFor={`${id}-p`}>Proyecto</label>
          <select id={`${id}-p`} className="ui-select" value={proyectoUuid} onChange={(e) => setProyectoUuid(e.target.value)}>
            {proyectos.map((p) => <option key={p.uuid} value={p.uuid}>{`${p.nombre} · ${p.prefijo}`}</option>)}
          </select>
        </div>
      )}
      {aviso && <div className="ui-alert is-success" role="status"><span>{aviso}</span></div>}
      <AlertaDeError mensaje={errorDeCarga ?? error} />
      {!lista && !errorDeCarga && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
      {lista && (
        <>
          <section className="ui-card sh-tarjeta">
            <h2 className="ui-card-title" style={{ margin: 0 }}>Permisos por grupo</h2>
            <p className="ui-help" style={{ margin: 0 }}>Cada nivel se permite o se niega por separado. Editar y Archivar permitidos incluyen Ver.</p>
            <div className="ui-table-wrap">
              <table className="ui-table" aria-label="Permisos por grupo">
                <thead><tr><th>Grupo</th>{alcances.map((a) => <th key={a.nombre}>{a.nombre}</th>)}<th><span className="sh-sr">Acciones</span></th></tr></thead>
                <tbody>
                  {grupos.filter((g) => g.nombre !== SUPER_ADMIN).map((g) => (
                    <tr key={g.uuid}>
                      <td>{nombreDeGrupo(g.nombre)}</td>
                      {alcances.map((a) => <td key={a.nombre}>{g.nombre === ADMINISTRADORES ? 'Todo' : resumen(deGrupo(g, a))}</td>)}
                      <td>{g.nombre !== ADMINISTRADORES && (
                        <button className="ui-btn ghost sm" type="button" aria-label={`Cambiar permisos de ${nombreDeGrupo(g.nombre)}`} disabled={ocupado}
                          onClick={() => setCambiando(g)}>Cambiar</button>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="ui-card sh-tarjeta">
            <div className="ui-row" style={{ justifyContent: 'space-between' }}>
              <span>
                <h2 className="ui-card-title" style={{ margin: 0 }}>Excepciones por usuario</h2>
                <span className="ui-help">Prevalecen sobre lo heredado del grupo</span>
              </span>
              <button className="ui-btn sm" type="button" onClick={() => setAgregando(true)}><Icono nombre="mas" />Agregar excepción</button>
            </div>
            {excepciones.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>No hay excepciones en este proyecto.</p>}
            <ul className="sh-vinculos" aria-label="Excepciones por usuario">
              {excepciones.map((r) => (
                <li key={r.uuid}>
                  <span className="ui-row" style={{ gap: 8 }}>
                    <span className="ui-avatar sm" aria-hidden="true">{iniciales(persona(r.usuarioUuid))}</span>
                    <span>{`${persona(r.usuarioUuid)} · ${nombreDelAlcance(r)}: ${NOMBRES_DE_NIVEL[r.nivel]}`}</span>
                    {grupoDe(r.usuarioUuid) && <span className="ui-muted">{`grupo ${grupoDe(r.usuarioUuid)}`}</span>}
                    <span className={`ui-chip ${r.efecto === 'PERMITIR' ? 'is-success' : 'is-danger'}`}>{r.efecto === 'PERMITIR' ? 'Da permiso' : 'Quita permiso'}</span>
                  </span>
                  <button className="ui-btn ghost sm" type="button" aria-label={`Quitar la excepción de ${persona(r.usuarioUuid)}`} disabled={ocupado}
                    onClick={() => ejecutar(() => pedir('POST', `/regla-permiso/${r.uuid}/archivar`), 'Se quitó la excepción.')}>Quitar</button>
                </li>
              ))}
            </ul>
          </section>
          <p className="ui-help" style={{ margin: 0 }}>El grupo Administradores puede hacer todo, menos administrar a otros administradores o al super admin.</p>
        </>
      )}
      {cambiando && proyecto && lista && (
        <CambiarPermisosModal grupo={cambiando} proyecto={proyecto} alcances={alcances} reglas={lista.filter((r) => r.rolUuid === cambiando.uuid)}
          alCerrar={() => setCambiando(null)} alGuardar={() => {
            avisar(`Se guardaron los permisos de ${nombreDeGrupo(cambiando.nombre)}.`);
            setCambiando(null);
          }} />
      )}
      {agregando && proyecto && lista && (
        <ExcepcionModal proyecto={proyecto} alcances={alcances} reglas={lista} grupos={grupos}
          usuarios={usuarios.filter((u) => !u.archivado && !u.grupos.some((g) => g.nombre === SUPER_ADMIN || g.nombre === ADMINISTRADORES))}
          alCerrar={() => setAgregando(false)} alGuardar={() => {
            setAgregando(false);
            avisar('Se agregó la excepción.');
          }} />
      )}
    </>
  );
}
