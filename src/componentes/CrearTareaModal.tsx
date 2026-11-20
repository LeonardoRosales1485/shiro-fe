// Crear tarea (T6.1, prototipo "Crear tarea"): modo rapido con tipo y titulo en el tablero actual; «Más datos»
// abre descripcion, prioridad, estimacion, etiquetas y vencimiento. El boton de tipos propios queda deshabilitado
// («Próximamente»). Al crear muestra la clave asignada.
import { useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import type { Prioridad, ProyectoDTO, TipoTareaDTO } from '../api/tipos';
import { ORDEN_DE_PRIORIDADES, PRIORIDADES, TIPOS } from './catalogos';
import { Icono } from './Icono';
import { AlertaDeError, Modal } from './Modal';
import { BotonDeAccion } from './BotonDeAccion';

type Creada = { uuid: string; clave: string };

type Props = { proyecto: ProyectoDTO; tableroUuid: string; tipos: TipoTareaDTO[]; alCrear: (tarea: Creada) => void; alCerrar: () => void };

// Orden de los tipos en el selector, como el prototipo
const ORDEN_DE_TIPOS = ['HISTORIA', 'TAREA', 'BUG', 'EPICA'];

export function CrearTareaModal({ proyecto, tableroUuid, tipos, alCrear, alCerrar }: Props) {
  const elegibles = ORDEN_DE_TIPOS.map((codigo) => tipos.find((tipo) => tipo.codigo === codigo)).filter((tipo) => tipo !== undefined);
  const [tipo, setTipo] = useState('TAREA');
  const [titulo, setTitulo] = useState('');
  const [masDatos, setMasDatos] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('MEDIA');
  const [puntos, setPuntos] = useState('');
  const [etiquetas, setEtiquetas] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<Creada | null>(null);
  const tablero = proyecto.tableros.find((t) => t.uuid === tableroUuid);

  const crear = async () => {
    setEnviando(true);
    setError(null);
    try {
      const tarea = await pedir<Creada>('POST', '/tarea/guardar', cuerpo());
      setCreada(tarea);
      alCrear(tarea);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  // Cuerpo de /tarea/guardar: lo rapido y, si se abrio «Más datos», solo lo que se completo
  const cuerpo = () => {
    const datos: Record<string, unknown> = { tableroUuid, tipoCodigo: tipo, titulo: titulo.trim() };
    if (!masDatos) return datos;
    if (descripcion.trim()) datos.descripcion = descripcion.trim();
    if (prioridad !== 'MEDIA') datos.prioridad = prioridad;
    if (puntos.trim()) datos.puntos = Number(puntos);
    const textos = etiquetas.split(',').map((texto) => texto.trim()).filter(Boolean);
    if (textos.length) datos.etiquetas = textos.map((texto) => ({ texto }));
    if (vencimiento) datos.vencimiento = vencimiento;
    return datos;
  };

  const pie = creada
    ? <button className="ui-btn solid" type="button" onClick={alCerrar}>Listo</button>
    : <>
      <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
      <BotonDeAccion clase="ui-btn solid" texto="Crear tarea" enviando={enviando} deshabilitado={!titulo.trim()} alHacerClic={crear} />
    </>;

  return (
    <Modal titulo="Nueva tarea" alCerrar={alCerrar} pie={pie}>
      {creada ? (
        <div className="ui-alert is-success" role="status"><span>{`Se creó ${creada.clave}.`}</span></div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="ui-label" id="l-tipo">Tipo <span className="req">*</span></span>
            <div className="ui-segment" role="group" aria-labelledby="l-tipo" style={{ justifySelf: 'start', flexWrap: 'wrap' }}>
              {elegibles.map((t) => (
                <button key={t.codigo} type="button" aria-pressed={tipo === t.codigo} onClick={() => setTipo(t.codigo)} className="sh-opcion">
                  <Icono nombre={TIPOS[t.codigo]?.icono ?? 'tarea'} clase="ui-icon sm" />{t.nombre}
                </button>
              ))}
              <button type="button" disabled aria-label="Otros tipos de tarea: próximamente" title="Otros tipos de tarea: próximamente" className="sh-opcion sh-opcion-deshabilitada">
                <Icono nombre="mas" clase="ui-icon sm" />Próximamente
              </button>
            </div>
          </div>
          <label className="ui-field"><span className="ui-label">Título <span className="req">*</span></span>
            <input className="ui-input" value={titulo} maxLength={255} onChange={(e) => setTitulo(e.target.value)} autoFocus /></label>
          <p className="ui-help" style={{ margin: 0 }}>
            Se crea en el tablero <b>{tablero?.tipoTableroNombre ?? 'Principal'}</b>, en su primer estado. La clave se asigna al crearla. El resto lo completás después.
          </p>
          <button className="ui-btn ghost" type="button" aria-expanded={masDatos} aria-controls="mas-datos" onClick={() => setMasDatos(!masDatos)}
            style={{ justifySelf: 'start', paddingLeft: 8 }}>
            <Icono nombre={masDatos ? 'arriba' : 'abajo'} />{masDatos ? 'Menos datos' : 'Más datos'}
          </button>
          {masDatos && (
            <div id="mas-datos" className="sh-mas-datos">
              <label className="ui-field"><span className="ui-label">Descripción</span>
                <textarea className="ui-textarea" placeholder="Acepta Markdown" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></label>
              <div className="ui-grid-2">
                <label className="ui-field"><span className="ui-label">Prioridad</span>
                  <select className="ui-select" value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)}>
                    {ORDEN_DE_PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDADES[p].nombre}</option>)}
                  </select></label>
                <label className="ui-field"><span className="ui-label">Estimación (puntos)</span>
                  <input className="ui-input" inputMode="numeric" placeholder="Ej.: 3" value={puntos} onChange={(e) => setPuntos(e.target.value.replace(/\D/g, ''))} /></label>
                <label className="ui-field"><span className="ui-label">Etiquetas</span>
                  <input className="ui-input" placeholder="Separadas por coma" value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} /></label>
                <label className="ui-field"><span className="ui-label">Vence</span>
                  <input className="ui-input" type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} /></label>
              </div>
            </div>
          )}
          <AlertaDeError mensaje={error} />
        </>
      )}
    </Modal>
  );
}
