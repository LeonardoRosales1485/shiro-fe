// Paso 4 de importar desde Jira (T6.5, prototipo "Importar desde Jira · usuarios"): las personas de Jira y con quién
// se vinculan en Shiro por correo. Quien no tiene cuenta queda como «Usuario importado» sin acceso (responsable de
// sus tareas y autor de sus comentarios) y, si después entra con Google con ese correo, entra como ese usuario.
import { nombreDePersona, type UsuarioAdministrado } from '../administracion/comun';
import type { Catalogo } from './mapeo';

type Props = { catalogo: Catalogo; usuarios: UsuarioAdministrado[] };

export function PasoUsuarios({ catalogo, usuarios }: Props) {
  const vinculados = catalogo.usuarios.filter((u) => u.usuarioUuid).length;
  return (
    <section className="ui-card sh-tarjeta" aria-label="Usuarios">
      <h2 className="ui-card-title" style={{ margin: 0 }}>Usuarios de Jira</h2>
      <p className="ui-muted" style={{ margin: 0 }}>{`Se vinculan con Shiro por correo: ${vinculados} vinculados · ${catalogo.usuarios.length - vinculados} sin cuenta.`}</p>
      <div className="ui-table-wrap">
        <table className="ui-table" aria-label="Usuarios de Jira">
          <thead><tr><th>Correo en Jira</th><th>Usuario en Shiro</th><th>Estado</th></tr></thead>
          <tbody>
            {catalogo.usuarios.map((u) => {
              const enShiro = usuarios.find((x) => x.uuid === u.usuarioUuid);
              return (
                <tr key={u.correo ?? u.nombre}>
                  <td>{u.correo ?? `${u.nombre} (sin correo visible)`}</td>
                  <td>{enShiro ? nombreDePersona(enShiro) : u.usuarioUuid ? u.nombre : '—'}</td>
                  <td>{u.usuarioUuid ? (enShiro?.archivado ? 'Vinculado a archivado' : 'Vinculado') : 'Se crea sin acceso'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="ui-help" style={{ margin: 0 }}>
        Quien no tiene cuenta queda como «Usuario importado» sin acceso, responsable de sus tareas. Si después entra con Google con ese correo, entra como ese usuario.
      </p>
    </section>
  );
}
