// Edicion de una tarea (T6.2, prototipo "Detalle · edición"): tipo (entre los de su mismo nivel), título,
// descripción (con vista previa del Markdown), prioridad, estimación, etiquetas, vencimiento y responsable, que
// cualquier usuario elige entre los que acceden al proyecto (decision 42 del 19/11). La clave, el tablero y las
// fechas no se editan. Si el guardado falla (por ejemplo, 409 porque otro la cambió) lo escrito se
// conserva y se ofrece recargar.
import { useEffect, useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import type { Prioridad, TareaDetalleDTO, TipoTareaDTO, UsuarioDelProyectoDTO } from '../../api/tipos';
import { ORDEN_DE_PRIORIDADES, PRIORIDADES } from '../../componentes/catalogos';
import { Markdown } from '../../componentes/Markdown';
import { AlertaDeError } from '../../componentes/Modal';

// Lo que se edita en el formulario
export type Cambios = {
  tipoCodigo: string;
  titulo: string;
  descripcion: string;
  prioridad: Prioridad;
  puntos: string;
  etiquetas: string;
  vencimiento: string;
  responsableUuid: string;
};

type Props = {
  tarea: TareaDetalleDTO;
  tiposDeTarea: TipoTareaDTO[];
  guardando: boolean;
  error: string | null;
  conflicto: boolean;
  alGuardar: (cambios: Cambios) => void;
  alCancelar: () => void;
  alRecargar: () => void;
};

// Valores iniciales del formulario desde la tarea
function inicial(tarea: TareaDetalleDTO): Cambios {
  return {
    tipoCodigo: tarea.tipoCodigo,
    titulo: tarea.titulo,
    descripcion: tarea.descripcion ?? '',
    prioridad: tarea.prioridad,
    puntos: tarea.puntos === null ? '' : String(tarea.puntos),
    etiquetas: (tarea.etiquetas ?? []).map((e) => e.texto).join(', '),
    vencimiento: tarea.vencimiento ?? '',
    responsableUuid: tarea.responsableUuid ?? '',
  };
}

export function EdicionDeTarea({ tarea, tiposDeTarea, guardando, error, conflicto, alGuardar, alCancelar, alRecargar }: Props) {
  const [cambios, setCambios] = useState<Cambios>(() => inicial(tarea));
  const [usuarios, setUsuarios] = useState<UsuarioDelProyectoDTO[]>([]);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const id = useId();
  const nivel = tiposDeTarea.find((t) => t.codigo === tarea.tipoCodigo)?.nivel;
  const tiposDelNivel = tiposDeTarea.filter((t) => t.nivel === nivel);
  const poner = (campo: keyof Cambios) => (valor: string) => setCambios((actuales) => ({ ...actuales, [campo]: valor }));

  // Usuarios que acceden al proyecto, para elegir el responsable. Si no se pueden leer queda el responsable actual
  useEffect(() => {
    if (!tarea.proyectoUuid) return;
    let vigente = true;
    pedir<UsuarioDelProyectoDTO[]>('GET', `/proyecto/${tarea.proyectoUuid}/usuarios`)
      .then((leidos) => vigente && setUsuarios(leidos))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [tarea.proyectoUuid]);

  // El responsable actual queda entre las opciones aunque ya no acceda al proyecto (por ejemplo, uno importado)
  const opciones = tarea.responsableUuid && !usuarios.some((u) => u.uuid === tarea.responsableUuid)
    ? [{ uuid: tarea.responsableUuid, nombreDeUsuario: tarea.responsableNombre ?? '', nombre: tarea.responsableNombre }, ...usuarios]
    : usuarios;

  const campo = (nombre: keyof Cambios, etiqueta: string, tipo = 'text') => (
    <div className="ui-field">
      <label className="ui-label" htmlFor={`${id}-${nombre}`}>{etiqueta}</label>
      <input id={`${id}-${nombre}`} className="ui-input" type={tipo} value={cambios[nombre]} onChange={(e) => poner(nombre)(e.target.value)} />
    </div>
  );

  return (
    <form className="ui-card sh-edicion" onSubmit={(e) => {
      e.preventDefault();
      alGuardar(cambios);
    }}>
      <p className="ui-help" style={{ margin: 0 }}>La clave, el tablero y las fechas de creación y actualización no se editan. Para llevarla a otro tablero, clonala.</p>
      {tiposDelNivel.length > 1 && (
        <div className="ui-field">
          <label className="ui-label" htmlFor={`${id}-tipo`}>Tipo</label>
          <select id={`${id}-tipo`} className="ui-select" value={cambios.tipoCodigo} onChange={(e) => poner('tipoCodigo')(e.target.value)}>
            {tiposDelNivel.map((t) => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
          </select>
        </div>
      )}
      {campo('titulo', 'Título')}
      <div className="ui-field">
        <div className="ui-row">
          <label className="ui-label" htmlFor={`${id}-descripcion`}>Descripción</label>
          <span className="ui-spacer" />
          <div className="ui-tabs" role="tablist" aria-label="Modo de la descripción">
            <button type="button" role="tab" className="ui-tab" aria-selected={!vistaPrevia} onClick={() => setVistaPrevia(false)}>Escribir</button>
            <button type="button" role="tab" className="ui-tab" aria-selected={vistaPrevia} onClick={() => setVistaPrevia(true)}>Vista previa</button>
          </div>
        </div>
        {vistaPrevia
          ? <div className="sh-vista-previa">{cambios.descripcion.trim() ? <Markdown texto={cambios.descripcion} /> : <p className="ui-muted">Nada para mostrar.</p>}</div>
          : <textarea id={`${id}-descripcion`} className="ui-textarea" rows={6} value={cambios.descripcion} onChange={(e) => poner('descripcion')(e.target.value)} />}
        <span className="ui-help">Acepta Markdown.</span>
      </div>
      <div className="sh-grilla-2">
        <div className="ui-field">
          <label className="ui-label" htmlFor={`${id}-prioridad`}>Prioridad</label>
          <select id={`${id}-prioridad`} className="ui-select" value={cambios.prioridad} onChange={(e) => poner('prioridad')(e.target.value)}>
            {ORDEN_DE_PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDADES[p].nombre}</option>)}
          </select>
        </div>
        {campo('puntos', 'Estimación (puntos)', 'number')}
        {campo('etiquetas', 'Etiquetas (separadas por coma)')}
        {campo('vencimiento', 'Vence', 'date')}
        {opciones.length > 0 && (
          <div className="ui-field">
            <label className="ui-label" htmlFor={`${id}-responsable`}>Responsable</label>
            <select id={`${id}-responsable`} className="ui-select" value={cambios.responsableUuid} onChange={(e) => poner('responsableUuid')(e.target.value)}>
              <option value="">Sin asignar</option>
              {opciones.map((u) => <option key={u.uuid} value={u.uuid}>{u.nombre || u.nombreDeUsuario}</option>)}
            </select>
          </div>
        )}
      </div>
      <AlertaDeError mensaje={error} />
      <div className="ui-row" style={{ justifyContent: 'flex-end' }}>
        {conflicto && <button className="ui-btn ghost" type="button" onClick={alRecargar}>Recargar</button>}
        <button className="ui-btn ghost" type="button" onClick={alCancelar}>Cancelar</button>
        <button className="ui-btn solid" type="submit" disabled={!cambios.titulo.trim() || guardando}>Guardar cambios</button>
      </div>
    </form>
  );
}
