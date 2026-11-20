// Nueva versión, agregar tareas y publicar (T6.3, prototipos "Versiones", "Agregar tareas a una versión" y "Publicar
// versión"). Agregar ofrece las tareas del proyecto que no están en la versión, por defecto solo las terminadas, y se
// filtra por tablero. Publicar pide la fecha y avisa lo que queda sin terminar (sigue en la versión pero no entra en
// el changelog).
import { useEffect, useId, useState } from 'react';
import { mensajeDeError, pedir } from '../../api/cliente';
import {
  igual, pedidoDePaginado, type Pagina, type ProyectoDTO, type TareaDePlanDTO, type TareaDeVersionDTO, type VersionDTO,
} from '../../api/tipos';
import { hoy, nombreDeTablero } from '../../componentes/catalogos';
import { AlertaDeError, Modal } from '../../componentes/Modal';
import { useEnvio } from '../../componentes/useEnvio';

// Pie con Cancelar y la accion principal
function pie(texto: string, deshabilitado: boolean, alConfirmar: () => void, alCerrar: () => void) {
  return <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid" type="button" disabled={deshabilitado} onClick={alConfirmar}>{texto}</button>
  </>;
}

type PropsNueva = { proyecto: ProyectoDTO; alCrear: (version: VersionDTO) => void; alCerrar: () => void };

export function NuevaVersionModal({ proyecto, alCrear, alCerrar }: PropsNueva) {
  const id = useId();
  const [nombre, setNombre] = useState('');
  const { enviando, error, enviar } = useEnvio();
  const crear = () => enviar(async () => alCrear(await pedir<VersionDTO>('POST', '/version/guardar', { proyectoUuid: proyecto.uuid, nombre: nombre.trim() })));
  return (
    <Modal titulo="Nueva versión" alCerrar={alCerrar} ancho={440} pie={pie('Crear versión', !nombre.trim() || enviando, crear, alCerrar)}>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-n`}>Nombre de la versión</label>
        <input id={`${id}-n`} className="ui-input" value={nombre} placeholder="1.1.0" onChange={(e) => setNombre(e.target.value)} />
      </div>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}

type PropsAgregar = {
  proyecto: ProyectoDTO;
  version: VersionDTO;
  enLaVersion: TareaDeVersionDTO[];
  terminados: Set<string>;
  alAgregar: (cantidad: number) => void;
  alCerrar: () => void;
};

export function AgregarTareasModal({ proyecto, version, enLaVersion, terminados, alAgregar, alCerrar }: PropsAgregar) {
  const id = useId();
  const [tareas, setTareas] = useState<TareaDePlanDTO[] | null>(null);
  const [tablero, setTablero] = useState('');
  const [soloTerminadas, setSoloTerminadas] = useState(true);
  const [elegidas, setElegidas] = useState<string[]>([]);
  const { enviando, error, setError, enviar } = useEnvio();

  useEffect(() => {
    let vigente = true;
    pedir<Pagina<TareaDePlanDTO>>('POST', '/tarea/paginar', pedidoDePaginado([igual('proyecto.uuid', proyecto.uuid)], 'numero'))
      .then((pagina) => vigente && setTareas(pagina.contenido))
      .catch((e) => vigente && setError(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [proyecto.uuid, setError]);

  const yaEstan = new Set(enLaVersion.map((t) => t.uuid));
  const ofrecidas = (tareas ?? []).filter((t) => !yaEstan.has(t.uuid) && (!tablero || t.tableroCodigo === tablero)
    && (!soloTerminadas || (t.estadoUuid && terminados.has(t.estadoUuid))));

  const agregar = () => enviar(async () => {
    await pedir('POST', `/version/${version.uuid}/asignar`, { tareas: elegidas });
    alAgregar(elegidas.length);
  });

  return (
    <Modal titulo="Agregar tareas a una versión" alCerrar={alCerrar} ancho={600}
      pie={pie(`Agregar a ${version.nombre}`, elegidas.length === 0 || enviando, agregar, alCerrar)}>
      <h3 className="ui-card-title">{`Agregar tareas a ${version.nombre}`}</h3>
      <div className="sh-grilla-2">
        <div className="ui-field">
          <label className="ui-label" htmlFor={`${id}-t`}>Tablero</label>
          <select id={`${id}-t`} className="ui-select" value={tablero} onChange={(e) => setTablero(e.target.value)}>
            <option value="">Todos</option>
            {proyecto.tableros.map((t) => <option key={t.uuid} value={t.tipoTableroCodigo}>{t.tipoTableroNombre}</option>)}
          </select>
        </div>
        <fieldset className="sh-fieldset">
          <legend className="ui-label">Estado</legend>
          <div className="ui-row">
            <label className="ui-check"><input type="radio" name="estado" checked={soloTerminadas} onChange={() => setSoloTerminadas(true)} />Hecho o Aprobado</label>
            <label className="ui-check"><input type="radio" name="estado" checked={!soloTerminadas} onChange={() => setSoloTerminadas(false)} />Todos</label>
          </div>
        </fieldset>
      </div>
      {tareas === null && !error && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
      {tareas !== null && ofrecidas.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>No hay tareas para agregar con estos filtros.</p>}
      <div className="sh-lista-elegible">
        {ofrecidas.map((t) => (
          <label key={t.uuid} className="ui-check">
            <input type="checkbox" checked={elegidas.includes(t.uuid)}
              onChange={() => setElegidas((actuales) => (actuales.includes(t.uuid) ? actuales.filter((u) => u !== t.uuid) : [...actuales, t.uuid]))} />
            <span><strong>{t.clave}</strong>{` ${t.titulo} · ${nombreDeTablero(proyecto.tableros, t.tableroCodigo)}`}</span>
          </label>
        ))}
      </div>
      <p className="ui-help" style={{ margin: 0 }}>{`Una tarea puede estar en más de una versión: se suma a ${version.nombre} sin salir de las otras. ${elegidas.length} elegidas.`}</p>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}

type PropsPublicar = { version: VersionDTO; tareas: TareaDeVersionDTO[]; alPublicar: () => void; alCerrar: () => void };

export function PublicarVersionModal({ version, tareas, alPublicar, alCerrar }: PropsPublicar) {
  const id = useId();
  const [fechaElegida, setFechaElegida] = useState(hoy());
  const { enviando, error, enviar } = useEnvio();
  const hechas = tareas.filter((t) => t.terminada).length;
  const pendientes = tareas.length - hechas;
  const publicar = () => enviar(async () => {
    await pedir('POST', `/version/${version.uuid}/publicar`, { fecha: fechaElegida });
    alPublicar();
  });
  return (
    <Modal titulo="Publicar versión" alCerrar={alCerrar} ancho={480} pie={pie('Publicar', !fechaElegida || enviando, publicar, alCerrar)}>
      <h3 className="ui-card-title">{`Publicar la versión ${version.nombre}`}</h3>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-f`}>Fecha de publicación</label>
        <input id={`${id}-f`} className="ui-input" type="date" value={fechaElegida} onChange={(e) => setFechaElegida(e.target.value)} />
      </div>
      <div className="ui-row">
        <span className="ui-chip is-success">{`Hechas ${hechas}`}</span>
        <span className="ui-chip">{`Sin terminar ${pendientes}`}</span>
      </div>
      {pendientes > 0 && (
        <p className="ui-help" style={{ margin: 0 }}>
          {pendientes === 1
            ? 'Hay 1 tarea sin terminar. Sigue en la versión pero no entra en el changelog.'
            : `Hay ${pendientes} tareas sin terminar. Siguen en la versión pero no entran en el changelog.`}
        </p>
      )}
      <p className="ui-help" style={{ margin: 0 }}>Una versión publicada no se modifica: sus tareas y su changelog quedan fijos.</p>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
