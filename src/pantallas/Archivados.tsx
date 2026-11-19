// Archivados (T6.4, prototipos "Archivados" y "Restaurar archivado"): lo archivado sobre lo que el usuario puede
// archivar, por tipo (tareas, sprints, versiones, proyectos y, para administradores, usuarios), con fecha y quién lo
// archivó, y un buscador. Restaurar pide confirmación y usa el endpoint de cada tipo; si no se puede (por ejemplo,
// el padre sigue archivado) muestra el motivo.
import { useEffect, useId, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import type { Pagina } from '../api/tipos';
import { fecha } from '../componentes/catalogos';
import { Encabezado } from '../componentes/Encabezado';
import { AlertaDeError, Modal } from '../componentes/Modal';
import { useEnvio } from '../componentes/useEnvio';

type Props = { esAdministrador: boolean };

type Archivado = { uuid: string; tipo: string; nombre: string; proyectoPrefijo: string | null; fechaDeBorrado: string | null; archivadoPorNombre: string | null };

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
  const [aRestaurar, setARestaurar] = useState<Archivado | null>(null);

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
              <thead><tr><th>Nombre</th><th>Proyecto</th><th>Archivado</th><th>Por</th><th><span className="sh-sr">Acciones</span></th></tr></thead>
              <tbody>
                {elementos.map((e) => (
                  <tr key={e.uuid}>
                    <td>{e.nombre}</td>
                    <td>{e.proyectoPrefijo ?? '—'}</td>
                    <td>{fecha(e.fechaDeBorrado)}</td>
                    <td>{e.archivadoPorNombre ?? '—'}</td>
                    <td><button className="ui-btn ghost sm" type="button" aria-label={`Restaurar ${e.nombre}`} onClick={() => {
                      setAviso(null);
                      setARestaurar(e);
                    }}>Restaurar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {aRestaurar && (
        <RestaurarModal elemento={aRestaurar} ruta={TIPOS.find((t) => t.tipo === aRestaurar.tipo)?.ruta ?? 'tarea'} alCerrar={() => setARestaurar(null)}
          alRestaurar={() => {
            setAviso(`Se restauró ${aRestaurar.nombre}.`);
            setARestaurar(null);
            setVuelta((v) => v + 1);
          }} />
      )}
    </>
  );
}

// Confirmacion de restaurar: el elemento vuelve con lo que se archivo junto con el
function RestaurarModal({ elemento, ruta, alRestaurar, alCerrar }: { elemento: Archivado; ruta: string; alRestaurar: () => void; alCerrar: () => void }) {
  const { enviando, error, enviar } = useEnvio();
  const restaurar = () => enviar(async () => {
    await pedir('POST', `/${ruta}/${elemento.uuid}/restaurar`);
    alRestaurar();
  });
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid" type="button" disabled={enviando} onClick={restaurar}>Restaurar</button>
  </>;
  return (
    <Modal titulo="Restaurar archivado" alCerrar={alCerrar} pie={pie} ancho={480}>
      <h3 className="ui-card-title">{`¿Restaurar ${elemento.nombre}?`}</h3>
      <p style={{ margin: 0 }}>Vuelve a su lugar anterior junto con lo que se archivó en la misma operación. Lo que se archivó por separado queda archivado.</p>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
