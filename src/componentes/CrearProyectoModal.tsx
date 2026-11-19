// Crear proyecto (T6.1, prototipo "Crear proyecto"): nombre y prefijo de clave (2 a 6 letras, en mayusculas). Se
// crean con el proyecto su tablero principal y los sub-tableros. El prefijo en uso se muestra junto al campo.
import { useState } from 'react';
import { ErrorDeApi, mensajeDeError, pedir } from '../api/cliente';
import type { ProyectoDTO } from '../api/tipos';
import { AlertaDeError, Modal } from './Modal';

type Props = { alCrear: (proyecto: ProyectoDTO) => void; alCerrar: () => void };

export function CrearProyectoModal({ alCrear, alCerrar }: Props) {
  const [nombre, setNombre] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorDePrefijo, setErrorDePrefijo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const valido = nombre.trim().length > 0 && /^[A-Z]{2,6}$/.test(prefijo);

  const crear = async () => {
    setEnviando(true);
    setError(null);
    setErrorDePrefijo(null);
    try {
      alCrear(await pedir<ProyectoDTO>('POST', '/proyecto/guardar', { nombre: nombre.trim(), prefijo }));
    } catch (e) {
      if (e instanceof ErrorDeApi && e.codigo === 'PREFIJO_DE_PROYECTO_EN_USO') setErrorDePrefijo(e.message);
      else setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid" type="button" disabled={!valido || enviando} onClick={crear}>Crear proyecto</button>
  </>;

  return (
    <Modal titulo="Crear proyecto" ancho={520} alCerrar={alCerrar} pie={pie}>
      <label className="ui-field"><span className="ui-label">Nombre <span className="req">*</span></span>
        <input className="ui-input" value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} autoFocus /></label>
      <label className="ui-field"><span className="ui-label">Prefijo de clave <span className="req">*</span></span>
        <input className="ui-input" value={prefijo} aria-invalid={errorDePrefijo ? true : undefined} maxLength={6}
          onChange={(e) => setPrefijo(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} style={{ maxWidth: 160 }} />
        {errorDePrefijo && <span className="ui-error">{errorDePrefijo}</span>}
        <span className="ui-help">{`De 2 a 6 letras. Las tareas se numeran así: ${prefijo || 'ABC'}-1, ${prefijo || 'ABC'}-2...`}</span></label>
      <div style={{ display: 'grid', gap: 8 }}>
        <span className="ui-label">Se crean con el proyecto</span>
        <div className="ui-row" style={{ gap: 6 }}>
          <span className="ui-chip is-primary">Tablero principal</span><span className="ui-chip">QA</span>
          <span className="ui-chip">Análisis</span><span className="ui-chip">Diseño</span>
        </div>
      </div>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
