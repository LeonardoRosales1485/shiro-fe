// Modal del design system (ui-modal sobre ui-veil): titulo, cuerpo y pie. Escape y la X cierran.
import { useEffect, useId, type ReactNode } from 'react';
import { Icono } from './Icono';

type Props = { titulo: string; ancho?: number; alCerrar: () => void; pie: ReactNode; children: ReactNode };

export function Modal({ titulo, ancho = 560, alCerrar, pie, children }: Props) {
  const idTitulo = useId();
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => evento.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [alCerrar]);
  return (
    <div className="ui-veil sh-veil">
      <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby={idTitulo} style={{ width: '100%', maxWidth: ancho }}>
        <div className="ui-modal-head">
          <h2 className="ui-modal-title" id={idTitulo}>{titulo}</h2>
          <button className="ui-x" type="button" aria-label="Cerrar" onClick={alCerrar}><Icono nombre="cerrar" /></button>
        </div>
        <div className="ui-modal-body" style={{ display: 'grid', gap: 16 }}>{children}</div>
        <div className="ui-modal-foot">{pie}</div>
      </div>
    </div>
  );
}

// Alerta de error para los formularios (rol alert para lectores de pantalla)
export function AlertaDeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return <div className="ui-alert is-danger" role="alert"><Icono nombre="alerta" /><span>{mensaje}</span></div>;
}
