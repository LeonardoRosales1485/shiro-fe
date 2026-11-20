// Archivados (T6.4, prototipos "Archivados" y "Restaurar archivado"): lo archivado sobre lo que el usuario puede
// archivar, por tipo (tareas, sprints, versiones, proyectos y, para administradores, usuarios), con fecha y quién lo
// archivó, cuántas tareas se archivaron con cada uno, y un buscador. «Ver» y «Restaurar» muestran la vista previa
// (propuesta 49): dónde vuelve, qué se restaura con él y qué queda archivado. Restaurar usa el endpoint de cada tipo;
// si el padre sigue archivado no se ofrece, y si el backend no lo deja muestra el motivo.
import { useEffect, useId, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import type { Pagina } from '../api/tipos';
import { fecha } from '../componentes/catalogos';
import { Encabezado } from '../componentes/Encabezado';
import { Markdown } from '../componentes/Markdown';
import { AlertaDeError, Modal } from '../componentes/Modal';
import { useEnvio } from '../componentes/useEnvio';
import { BotonDeAccion } from '../componentes/BotonDeAccion';

type Props = { esAdministrador: boolean };

type Archivado = {
  uuid: string;
  tipo: string;
  nombre: string;
  proyectoPrefijo: string | null;
  fechaDeBorrado: string | null;
  archivadoPorNombre: string | null;
  incluidos: number | null;
};

type ElementoDeArchivo = { uuid: string; nombre: string; fechaDeBorrado: string | null };

type VistaPrevia = {
  ubicacion: string | null;
  descripcion: string | null;
  padreArchivado: boolean;
  cantidadQueSeRestaura: number;
  seRestauran: ElementoDeArchivo[];
  quedanArchivadas: ElementoDeArchivo[];
};

// Pestañas: tipo de la busqueda, ruta del endpoint de restaurar y textos
const TIPOS = [
  { tipo: 'TAREA', ruta: 'tarea', nombre: 'Tareas', vacio: 'No hay tareas archivadas.' },
  { tipo: 'SPRINT', ruta: 'sprint', nombre: 'Sprints', vacio: 'No hay sprints archivados.' },
  { tipo: 'VERSION', ruta: 'version', nombre: 'Versiones', vacio: 'No hay versiones archivadas.' },
  { tipo: 'PROYECTO', ruta: 'proyecto', nombre: 'Proyectos', vacio: 'No hay proyectos archivados.' },
  { tipo: 'USUARIO', ruta: 'usuario', nombre: 'Usuarios', vacio: 'No hay usuarios archivados.' },
];

export function Archivados({ esAdministrador }: Props) {
  const id = useId();
  const tipos = TIPOS.filter((t) => esAdministrador || t.tipo !== 'USUARIO');
  const [tipo, setTipo] = useState(tipos[0]);
  const [texto, setTexto] = useState('');
  const [vuelta, setVuelta] = useState(0);
  const [lista, setLista] = useState<{ tipo: string; elementos: Archivado[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<{ elemento: Archivado; restaurar: boolean } | null>(null);

  useEffect(() => {
    let vigente = true;
    const pedido: Record<string, unknown> = { pagina: 1, tamano: 50, tipo: tipo.tipo };
    if (texto.trim()) pedido.texto = texto.trim();
    const espera = setTimeout(() => {
      pedir<Pagina<Archivado>>('POST', '/archivo/paginar', pedido)
        .then((pagina) => vigente && setLista({ tipo: tipo.tipo, elementos: pagina.contenido }))
        .catch((e) => vigente && setError(mensajeDeError(e)));
    }, texto ? 250 : 0);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [tipo, texto, vuelta]);

  const elementos = lista && lista.tipo === tipo.tipo ? lista.elementos : null;

  return (
    <>
      <Encabezado migas={['Archivados']} titulo="Archivados" />
      <p className="ui-muted" style={{ marginTop: 0 }}>Nada se borra en Shiro. Lo archivado sale de tableros y listados, y al restaurarlo vuelve a su lugar anterior.</p>
      {aviso && <div className="ui-alert is-success" role="status"><span>{aviso}</span></div>}
      <AlertaDeError mensaje={error} />
      <section className="ui-card sh-tarjeta">
        <div className="ui-tabs" role="tablist" aria-label="Tipo de archivado">
          {tipos.map((t) => (
            <button key={t.tipo} type="button" role="tab" className="ui-tab" aria-selected={t.tipo === tipo.tipo} onClick={() => setTipo(t)}>{t.nombre}</button>
          ))}
        </div>
        <div className="ui-field" style={{ maxWidth: 360 }}>
          <label className="ui-label" htmlFor={`${id}-b`}>Buscar en archivados</label>
          <input id={`${id}-b`} className="ui-input" type="search" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        {!elementos && !error && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
        {elementos && elementos.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>{tipo.vacio}</p>}
        {elementos && elementos.length > 0 && (
          <div className="ui-table-wrap">
            <table className="ui-table" aria-label="Archivados">
              <thead><tr><th>Nombre</th><th>Proyecto</th><th>Archivado</th><th>Por</th><th>Incluye</th><th><span className="sh-sr">Acciones</span></th></tr></thead>
              <tbody>
                {elementos.map((e) => (
                  <tr key={e.uuid}>
                    <td>{e.nombre}</td>
                    <td>{e.proyectoPrefijo ?? '—'}</td>
                    <td>{fecha(e.fechaDeBorrado)}</td>
                    <td>{e.archivadoPorNombre ?? '—'}</td>
                    <td>{e.incluidos ? `${e.incluidos} ${e.incluidos === 1 ? 'tarea' : 'tareas'}` : '—'}</td>
                    <td className="sh-acciones-fila">
                      <button className="ui-btn ghost sm" type="button" aria-label={`Ver ${e.nombre}`} onClick={() => setAbierto({ elemento: e, restaurar: false })}>Ver</button>
                      <button className="ui-btn ghost sm" type="button" aria-label={`Restaurar ${e.nombre}`} onClick={() => {
                        setAviso(null);
                        setAbierto({ elemento: e, restaurar: true });
                      }}>Restaurar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {abierto && (
        <VistaPreviaModal elemento={abierto.elemento} paraRestaurar={abierto.restaurar} ruta={TIPOS.find((t) => t.tipo === abierto.elemento.tipo)?.ruta ?? 'tarea'}
          alCerrar={() => setAbierto(null)}
          alRestaurar={() => {
            setAviso(`Se restauró ${abierto.elemento.nombre}.`);
            setAbierto(null);
            setVuelta((v) => v + 1);
          }} />
      )}
    </>
  );
}

// Vista previa de un archivado (CU-ARC-02): donde vuelve, su descripcion, que se restaura con el y que queda
// archivado. Desde «Restaurar» pregunta y restaura; desde «Ver» muestra y ofrece restaurar
function VistaPreviaModal({ elemento, paraRestaurar, ruta, alRestaurar, alCerrar }: {
  elemento: Archivado; paraRestaurar: boolean; ruta: string; alRestaurar: () => void; alCerrar: () => void;
}) {
  const [vista, setVista] = useState<VistaPrevia | null>(null);
  const { enviando, error, setError, enviar } = useEnvio();

  useEffect(() => {
    let vigente = true;
    pedir<VistaPrevia>('GET', `/archivo/${elemento.tipo}/${elemento.uuid}/vista-previa`)
      .then((leida) => vigente && setVista(leida))
      .catch((e) => vigente && setError(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [elemento, setError]);

  const restaurar = () => enviar(async () => {
    await pedir('POST', `/${ruta}/${elemento.uuid}/restaurar`);
    alRestaurar();
  });
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>{paraRestaurar ? 'Cancelar' : 'Cerrar'}</button>
    <BotonDeAccion clase="ui-btn solid" texto="Restaurar" enviando={enviando} deshabilitado={vista?.padreArchivado === true} alHacerClic={restaurar} />
  </>;
  return (
    <Modal titulo={paraRestaurar ? 'Restaurar archivado' : elemento.nombre} alCerrar={alCerrar} pie={pie} ancho={560}>
      {paraRestaurar && <h3 className="ui-card-title">{`¿Restaurar ${elemento.nombre}?`}</h3>}
      {!vista && !error && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
      {vista && (
        <>
          <p style={{ margin: 0 }}>{vista.ubicacion ? `Vuelve a ${vista.ubicacion}, como estaba al archivarse.` : 'Vuelve a su lugar anterior.'}</p>
          {vista.padreArchivado && <div className="ui-alert is-warning"><span>Su tarea padre sigue archivada: restaurala primero.</span></div>}
          {!paraRestaurar && vista.descripcion && <Markdown texto={vista.descripcion} />}
          <ListaDeArchivo titulo={`Se restauran (${vista.cantidadQueSeRestaura})`} elementos={vista.seRestauran} />
          <ListaDeArchivo titulo={`Quedan archivadas (${vista.quedanArchivadas.length})`} elementos={vista.quedanArchivadas}
            detalle={(e) => `archivada por separado el ${fecha(e.fechaDeBorrado)}`} />
        </>
      )}
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}

// Lista de tareas de la vista previa (no se muestra si esta vacia)
function ListaDeArchivo({ titulo, elementos, detalle }: { titulo: string; elementos: ElementoDeArchivo[]; detalle?: (e: ElementoDeArchivo) => string }) {
  if (elementos.length === 0) return null;
  return (
    <div>
      <p className="ui-label" style={{ margin: '0 0 6px' }}>{titulo}</p>
      <ul className="sh-vinculos" aria-label={titulo}>
        {elementos.map((e) => <li key={e.uuid}><span>{detalle ? `${e.nombre} · ${detalle(e)}` : e.nombre}</span></li>)}
      </ul>
    </div>
  );
}
