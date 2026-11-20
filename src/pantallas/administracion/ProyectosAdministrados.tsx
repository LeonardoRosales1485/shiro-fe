// Pestaña Proyectos de la administracion (T6.5, prototipos "Administración · proyectos" y "Editar proyecto"): cada
// proyecto con su prefijo, sus tableros, el sprint activo, cuántas tareas tiene y su estado; los archivados a pedido.
// Se edita el nombre (el prefijo no cambia: lo usan las claves), se archiva (con todo lo que tiene) y se restaura.
import { useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import { igual, pedidoDePaginado, type Pagina, type ProyectoDTO, type SprintDTO } from '../../api/tipos';
import { ConfirmarModal } from '../../componentes/ConfirmarModal';
import { AlertaDeError, Modal } from '../../componentes/Modal';
import { useAccion } from '../../componentes/useAccion';
import { useEnvio } from '../../componentes/useEnvio';
import { useLectura } from '../../componentes/useLectura';
import { BotonDeAccion } from '../../componentes/BotonDeAccion';

type Props = { alCambiar: () => void };

type ProyectoConTareas = ProyectoDTO & { cantidadDeTareas?: number | null };

type Archivado = { uuid: string; nombre: string; proyectoPrefijo: string | null };

type Datos = { vigentes: ProyectoConTareas[]; archivados: Archivado[]; sprints: SprintDTO[] };

export function ProyectosAdministrados({ alCambiar }: Props) {
  const [conArchivados, setConArchivados] = useState(false);
  const [vuelta, setVuelta] = useState(0);
  const [editando, setEditando] = useState<ProyectoConTareas | null>(null);
  const [aArchivar, setAArchivar] = useState<ProyectoConTareas | null>(null);
  const recargar = () => {
    setVuelta((v) => v + 1);
    alCambiar();
  };
  const { ocupado, aviso, setAviso, error, ejecutar } = useAccion(recargar);

  const { datos, error: errorDeCarga } = useLectura<Datos>(async () => {
    const [vigentes, sprints, archivados] = await Promise.all([
      pedir<Pagina<ProyectoConTareas>>('POST', '/proyecto/paginar', pedidoDePaginado([], 'nombre')),
      pedir<Pagina<SprintDTO>>('POST', '/sprint/paginar', pedidoDePaginado([igual('estado', 'ACTIVO')], 'nombre')),
      pedir<Pagina<Archivado>>('POST', '/archivo/paginar', { pagina: 1, tamano: 200, tipo: 'PROYECTO' }),
    ]);
    return { vigentes: vigentes.contenido, sprints: sprints.contenido, archivados: archivados.contenido };
  }, vuelta);

  const avisar = (mensaje: string) => {
    setAviso(mensaje);
    recargar();
  };

  return (
    <>
      <label className="ui-check"><input type="checkbox" checked={conArchivados} onChange={(e) => setConArchivados(e.target.checked)} />Mostrar archivados</label>
      {aviso && <div className="ui-alert is-success" role="status"><span>{aviso}</span></div>}
      <AlertaDeError mensaje={errorDeCarga ?? error} />
      {!datos && !errorDeCarga && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
      {datos && (
        <div className="ui-table-wrap">
          <table className="ui-table" aria-label="Proyectos">
            <thead><tr><th>Proyecto</th><th>Prefijo</th><th>Tableros</th><th>Sprint activo</th><th>Tareas</th><th>Estado</th><th><span className="sh-sr">Acciones</span></th></tr></thead>
            <tbody>
              {datos.vigentes.map((p) => (
                <tr key={p.uuid}>
                  <td>{p.nombre}</td>
                  <td className="sh-mono">{p.prefijo}</td>
                  <td>{p.tableros.map((t) => t.tipoTableroNombre).join(', ')}</td>
                  <td>{datos.sprints.find((s) => s.proyectoUuid === p.uuid)?.nombre ?? '—'}</td>
                  <td>{(p.cantidadDeTareas ?? 0).toLocaleString('es-AR')}</td>
                  <td>Activo</td>
                  <td className="sh-acciones-fila">
                    <button className="ui-btn ghost sm" type="button" aria-label={`Editar ${p.nombre}`} onClick={() => setEditando(p)}>Editar</button>
                    <button className="ui-btn ghost sm" type="button" aria-label={`Archivar ${p.nombre}`} onClick={() => setAArchivar(p)}>Archivar</button>
                  </td>
                </tr>
              ))}
              {conArchivados && datos.archivados.map((p) => (
                <tr key={p.uuid}>
                  <td>{p.nombre}</td>
                  <td className="sh-mono">{p.proyectoPrefijo ?? '—'}</td>
                  <td>—</td><td>—</td><td>—</td>
                  <td>Archivado</td>
                  <td className="sh-acciones-fila">
                    <button className="ui-btn ghost sm" type="button" aria-label={`Restaurar ${p.nombre}`} disabled={ocupado}
                      onClick={() => ejecutar(() => pedir('POST', `/proyecto/${p.uuid}/restaurar`), `Se restauró ${p.nombre}.`)}>Restaurar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="ui-help" style={{ margin: 0 }}>
        El prefijo no se puede repetir entre proyectos, tampoco con uno archivado. Solo el super admin y el grupo Administradores crean proyectos.
      </p>
      {editando && <EditarProyectoModal proyecto={editando} alCerrar={() => setEditando(null)} alGuardar={() => {
        setEditando(null);
        avisar('Se guardó el proyecto.');
      }} />}
      {aArchivar && (
        <ConfirmarModal titulo="Archivar proyecto" pregunta={`¿Archivar ${aArchivar.nombre}?`} accion="Archivar" alCerrar={() => setAArchivar(null)}
          alConfirmar={async () => {
            await pedir('POST', `/proyecto/${aArchivar.uuid}/archivar`);
            setAArchivar(null);
            avisar(`Se archivó ${aArchivar.nombre}.`);
          }}>
          <p style={{ margin: 0 }}>{`Se archivan sus tableros y sus ${(aArchivar.cantidadDeTareas ?? 0).toLocaleString('es-AR')} tareas, con sus comentarios y relaciones. Se puede restaurar desde Archivados.`}</p>
        </ConfirmarModal>
      )}
    </>
  );
}

// Editar un proyecto: el nombre; el prefijo se muestra pero no se cambia
function EditarProyectoModal({ proyecto, alGuardar, alCerrar }: { proyecto: ProyectoDTO; alGuardar: () => void; alCerrar: () => void }) {
  const id = useId();
  const [nombre, setNombre] = useState(proyecto.nombre);
  const { enviando, error, enviar } = useEnvio();
  const guardar = () => enviar(async () => {
    await pedir('POST', '/proyecto/guardar', { uuid: proyecto.uuid, nombre: nombre.trim(), prefijo: proyecto.prefijo, descripcion: proyecto.descripcion });
    alGuardar();
  });
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <BotonDeAccion clase="ui-btn solid" texto="Guardar" enviando={enviando} deshabilitado={!nombre.trim()} alHacerClic={guardar} />
  </>;
  return (
    <Modal titulo="Editar proyecto" alCerrar={alCerrar} pie={pie} ancho={440}>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-n`}>Nombre</label>
        <input id={`${id}-n`} className="ui-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-p`}>Prefijo de clave</label>
        <input id={`${id}-p`} className="ui-input sh-mono" value={proyecto.prefijo} disabled />
        <span className="ui-help">El prefijo no se cambia: lo usan las claves de las tareas existentes.</span>
      </div>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
