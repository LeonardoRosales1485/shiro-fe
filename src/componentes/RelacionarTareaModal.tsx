// Relacionar tareas (T6.2, prototipo "Relacionar tareas"): el tipo se elige desde esta tarea y la otra se busca por
// texto entre las tareas del proyecto. El backend guarda BLOQUEA, RELACIONA o DUPLICA de origen a destino; «está
// bloqueada por» y «está duplicada por» se mandan invertidas. «Clonada de / clonada en» la crea clonar.
import { useEffect, useId, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import { igual, pedidoDePaginado, type Pagina, type TareaDetalleDTO, type TareaDTO } from '../api/tipos';
import { AlertaDeError, Modal } from './Modal';

type Props = { tarea: TareaDetalleDTO; alRelacionar: () => void; alCerrar: () => void };

type Elegible = 'BLOQUEA' | 'BLOQUEADA_POR' | 'RELACIONA' | 'DUPLICA' | 'DUPLICADA_POR';

// Por cada vinculo elegible: texto, tipo guardado, si se invierte y como lo ve la otra tarea
const OPCIONES: Record<Elegible, { nombre: string; tipo: string; invertida: boolean; verbo: string; delOtroLado: string }> = {
  BLOQUEA: { nombre: 'Bloquea', tipo: 'BLOQUEA', invertida: false, verbo: 'bloquea a', delOtroLado: 'está bloqueada por' },
  BLOQUEADA_POR: { nombre: 'Está bloqueada por', tipo: 'BLOQUEA', invertida: true, verbo: 'bloquea a', delOtroLado: 'bloquea a' },
  RELACIONA: { nombre: 'Se relaciona con', tipo: 'RELACIONA', invertida: false, verbo: 'se relaciona con', delOtroLado: 'se relaciona con' },
  DUPLICA: { nombre: 'Duplica', tipo: 'DUPLICA', invertida: false, verbo: 'duplica a', delOtroLado: 'está duplicada por' },
  DUPLICADA_POR: { nombre: 'Está duplicada por', tipo: 'DUPLICA', invertida: true, verbo: 'duplica a', delOtroLado: 'duplica a' },
};

export function RelacionarTareaModal({ tarea, alRelacionar, alCerrar }: Props) {
  const [vinculo, setVinculo] = useState<Elegible>('BLOQUEA');
  const [texto, setTexto] = useState('');
  const [encontradas, setEncontradas] = useState<TareaDTO[]>([]);
  const [otra, setOtra] = useState<TareaDTO | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opcion = OPCIONES[vinculo];
  const idTipo = useId();

  useEffect(() => {
    const buscado = texto.trim();
    if (!buscado) return;
    let vigente = true;
    const pedido = { ...pedidoDePaginado([igual('proyecto.uuid', tarea.proyectoUuid ?? '')], 'numero', 10), parametros: [{ nombre: 'texto', valor: buscado }] };
    const espera = setTimeout(() => {
      pedir<Pagina<TareaDTO>>('POST', '/tarea/paginar', pedido)
        .then((pagina) => vigente && setEncontradas(pagina.contenido.filter((t) => t.uuid !== tarea.uuid)))
        .catch((e) => vigente && setError(mensajeDeError(e)));
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [texto, tarea.uuid, tarea.proyectoUuid]);

  const relacionar = async () => {
    if (!otra) return;
    setEnviando(true);
    setError(null);
    try {
      const [origen, destino] = opcion.invertida ? [otra.uuid, tarea.uuid] : [tarea.uuid, otra.uuid];
      await pedir('POST', '/relacion/crear', { origenUuid: origen, destinoUuid: destino, tipo: opcion.tipo });
      alRelacionar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  // Explicacion de como queda la relacion vista desde las dos tareas
  const explicacion = otra && (() => {
    const [primera, segunda] = opcion.invertida ? [otra.clave, tarea.clave] : [tarea.clave, otra.clave];
    return `${primera} ${opcion.verbo} ${segunda}. En ${otra.clave} se va a ver como «${opcion.delOtroLado} ${tarea.clave}».`;
  })();

  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid" type="button" disabled={!otra || enviando} onClick={relacionar}>Relacionar</button>
  </>;

  return (
    <Modal titulo="Relacionar tareas" alCerrar={alCerrar} pie={pie}>
      <h3 className="ui-card-title" style={{ margin: 0 }}>{`Relacionar ${tarea.clave}`}</h3>
      <div className="ui-field">
        <label className="ui-label" htmlFor={idTipo}>Tipo de relación</label>
        <select id={idTipo} className="ui-select" value={vinculo} onChange={(e) => setVinculo(e.target.value as Elegible)}>
          {(Object.keys(OPCIONES) as Elegible[]).map((clave) => <option key={clave} value={clave}>{OPCIONES[clave].nombre}</option>)}
        </select>
        <span className="ui-help">«Clonada de / clonada en» se crea sola al clonar.</span>
      </div>
      <label className="ui-field">
        <span className="ui-label">Buscar tarea</span>
        <input className="ui-input" type="search" value={texto} placeholder="Clave o palabras del título" onChange={(e) => setTexto(e.target.value)} />
      </label>
      {texto.trim() !== '' && encontradas.length > 0 && (
        <fieldset className="sh-fieldset">
          <legend className="sh-sr">Tarea</legend>
          {encontradas.map((t) => (
            <label key={t.uuid} className="ui-check sh-opcion-tarea">
              <input type="radio" name="otra" checked={otra?.uuid === t.uuid} onChange={() => setOtra(t)} />
              <span><strong>{t.clave}</strong>{` ${t.titulo}`}</span>
            </label>
          ))}
        </fieldset>
      )}
      {explicacion && <p className="ui-help" style={{ margin: 0 }}>{explicacion}</p>}
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
