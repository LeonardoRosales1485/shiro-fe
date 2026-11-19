// Clonar tarea (T6.2, prototipo "Clonar tarea"): elige el tablero de destino entre los otros tableros del proyecto
// (el clon nace en su estado inicial) y qué datos se copian además del título y el tipo. Por defecto se copia lo
// habitual: descripción, prioridad y etiquetas. El clon de una Subtarea pide su destino: tarea propia con su tipo o
// subtarea de otra tarea, que se busca por su clave.
import { useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import {
  igual, pedidoDePaginado, type DatoAClonar, type Pagina, type ProyectoDTO, type TareaDetalleDTO, type TareaDTO, type TipoTableroDTO,
  type TipoTareaDTO,
} from '../api/tipos';
import { TIPOS } from './catalogos';
import { Icono } from './Icono';
import { AlertaDeError, Modal } from './Modal';

type Props = {
  proyecto: ProyectoDTO;
  tarea: TareaDetalleDTO;
  tiposDeTablero: TipoTableroDTO[];
  tiposDeTarea: TipoTareaDTO[];
  alClonar: (clon: TareaDetalleDTO) => void;
  alCerrar: () => void;
};

const HABITUAL: DatoAClonar[] = ['DESCRIPCION', 'PRIORIDAD', 'ETIQUETAS'];

const DATOS: { dato: DatoAClonar; nombre: string }[] = [
  { dato: 'DESCRIPCION', nombre: 'Descripción' },
  { dato: 'PRIORIDAD', nombre: 'Prioridad' },
  { dato: 'ETIQUETAS', nombre: 'Etiquetas' },
  { dato: 'PUNTOS', nombre: 'Estimación' },
  { dato: 'RESPONSABLE', nombre: 'Responsable' },
  { dato: 'VERSIONES', nombre: 'Versiones' },
  { dato: 'COMENTARIOS', nombre: 'Comentarios' },
  { dato: 'SUBTAREAS', nombre: 'Subtareas' },
];

// Tipos que puede tomar el clon de una Subtarea como tarea propia (nivel 2)
const TIPOS_PROPIOS = ['HISTORIA', 'TAREA', 'BUG'];

export function ClonarTareaModal({ proyecto, tarea, tiposDeTablero, tiposDeTarea, alClonar, alCerrar }: Props) {
  const destinos = proyecto.tableros.filter((t) => t.uuid !== tarea.tableroUuid);
  const subtareas = tarea.hijas?.length ?? 0;
  const esSubtarea = tarea.tipoCodigo === 'SUBTAREA';
  const [tableroUuid, setTableroUuid] = useState(destinos[0]?.uuid ?? '');
  const [copiar, setCopiar] = useState<DatoAClonar[]>(HABITUAL);
  const [comoSubtarea, setComoSubtarea] = useState(false);
  const [tipoPropio, setTipoPropio] = useState('TAREA');
  const [clavePadre, setClavePadre] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clon, setClon] = useState<TareaDetalleDTO | null>(null);
  const ofrecidos = DATOS.filter((d) => d.dato !== 'SUBTAREAS' || subtareas > 0);
  const destino = destinos.find((t) => t.uuid === tableroUuid);

  const alternar = (dato: DatoAClonar) =>
    setCopiar((actuales) => (actuales.includes(dato) ? actuales.filter((d) => d !== dato) : [...actuales, dato]));

  const clonar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const cuerpo: Record<string, unknown> = { tableroUuid, copiar: DATOS.map((d) => d.dato).filter((d) => copiar.includes(d)) };
      if (esSubtarea && comoSubtarea) {
        const padre = await buscarPadre(clavePadre.trim().toUpperCase());
        if (!padre) return;
        cuerpo.padreUuid = padre;
      } else if (esSubtarea) {
        cuerpo.tipoCodigo = tipoPropio;
      }
      const creado = await pedir<TareaDetalleDTO>('POST', `/tarea/${tarea.uuid}/clonar`, cuerpo);
      setClon(creado);
      alClonar(creado);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  // Uuid de la tarea padre por su clave, o null (con el aviso) si no existe
  const buscarPadre = async (clave: string): Promise<string | null> => {
    const pagina = await pedir<Pagina<TareaDTO>>('POST', '/tarea/paginar', pedidoDePaginado([igual('clave', clave)], 'numero', 1));
    if (pagina.contenido.length === 0) {
      setError(`No existe la tarea ${clave} en Shiro.`);
      return null;
    }
    return pagina.contenido[0].uuid;
  };

  const pie = clon
    ? <button className="ui-btn solid" type="button" onClick={alCerrar}>Listo</button>
    : <>
      <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
      <button className="ui-btn solid" type="button" disabled={!tableroUuid || enviando || (esSubtarea && comoSubtarea && !clavePadre.trim())}
        onClick={clonar}>Clonar</button>
    </>;

  return (
    <Modal titulo="Clonar tarea" alCerrar={alCerrar} pie={pie} ancho={600}>
      {clon ? (
        <div className="ui-alert is-success" role="status">
          <span>{`Se creó ${clon.clave} en ${destino?.tipoTableroNombre ?? 'el tablero elegido'}.`}</span>
        </div>
      ) : (
        <>
          <div>
            <h3 className="ui-card-title" style={{ margin: 0 }}>{`Clonar ${tarea.clave} a otro tablero`}</h3>
            <p className="ui-muted" style={{ margin: '4px 0 0' }}>{tarea.titulo}</p>
          </div>
          <fieldset className="sh-fieldset">
            <legend className="ui-label">Tablero de destino</legend>
            {destinos.map((t) => {
              const inicial = tiposDeTablero.find((tipo) => tipo.uuid === t.tipoTableroUuid)?.estados.find((e) => e.inicial);
              return (
                <label key={t.uuid} className="ui-check">
                  <input type="radio" name="destino" checked={tableroUuid === t.uuid} onChange={() => setTableroUuid(t.uuid)} />
                  {`${t.tipoTableroNombre}${inicial ? ` · queda en «${inicial.nombre}»` : ''}`}
                </label>
              );
            })}
          </fieldset>
          {esSubtarea && (
            <fieldset className="sh-fieldset">
              <legend className="ui-label">El clon de una subtarea queda</legend>
              <label className="ui-check">
                <input type="radio" name="comoQueda" checked={!comoSubtarea} onChange={() => setComoSubtarea(false)} />Como tarea propia
              </label>
              {!comoSubtarea && (
                <div className="ui-row" role="radiogroup" aria-label="Tipo del clon">
                  {TIPOS_PROPIOS.map((codigo) => (
                    <label key={codigo} className="ui-check">
                      <input type="radio" name="tipoPropio" checked={tipoPropio === codigo} onChange={() => setTipoPropio(codigo)} />
                      <Icono nombre={TIPOS[codigo].icono} clase="ui-icon sm" />
                      {tiposDeTarea.find((t) => t.codigo === codigo)?.nombre ?? codigo}
                    </label>
                  ))}
                </div>
              )}
              <label className="ui-check">
                <input type="radio" name="comoQueda" checked={comoSubtarea} onChange={() => setComoSubtarea(true)} />Como subtarea de otra tarea
              </label>
              {comoSubtarea && (
                <label className="ui-field">
                  <span className="ui-label">Clave de la tarea padre</span>
                  <input className="ui-input" value={clavePadre} placeholder={`${proyecto.prefijo}-120`} onChange={(e) => setClavePadre(e.target.value)} />
                </label>
              )}
            </fieldset>
          )}
          <fieldset className="sh-fieldset">
            <legend className="ui-label">Qué se copia</legend>
            <p className="ui-muted" style={{ margin: 0 }}>Título y tipo, siempre.</p>
            <div className="sh-checks">
              {ofrecidos.map((d) => (
                <label key={d.dato} className="ui-check">
                  <input type="checkbox" checked={copiar.includes(d.dato)} onChange={() => alternar(d.dato)} />
                  {d.dato === 'SUBTAREAS' ? `${d.nombre} (${subtareas})` : d.nombre}
                </label>
              ))}
            </div>
            <div className="ui-row">
              <button className="ui-btn ghost sm" type="button" onClick={() => setCopiar(ofrecidos.map((d) => d.dato))}>Marcar todo</button>
              <button className="ui-btn ghost sm" type="button" onClick={() => setCopiar(HABITUAL)}>Volver a lo habitual</button>
            </div>
            <p className="ui-help" style={{ margin: 0 }}>
              Los comentarios se copian con su autor y fecha originales. Las subtareas se crean como subtareas del clon, en el tablero de destino.
            </p>
          </fieldset>
          <p className="ui-help" style={{ margin: 0 }}>El original y el clon quedan vinculados («clonada de / clonada en») y cada uno muestra el estado del otro.</p>
          <AlertaDeError mensaje={error} />
        </>
      )}
    </Modal>
  );
}
