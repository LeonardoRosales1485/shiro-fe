// Loaders del prototipo "Loaders" (T6.6). Si la respuesta tarda menos de medio segundo no se muestra nada; después:
// - CargaDeShiro: el gato que busca las letras de Shiro, para esperas de pantalla completa sin avance medible (abrir
//   Shiro, cambiar de proyecto). No va dentro de una tarjeta o una lista: ahí va un skeleton.
// - CargaConAvance: el 白 que se escribe con el avance y a 100 se convierte en el gato (importar desde Jira).
// - ErrorConReintento: el error de una carga con «Reintentar».
import { useEffect, useState, type CSSProperties } from 'react';
import { Icono } from './Icono';

// true recién cuando pasaron ms milisegundos (para no mostrar un loader en esperas cortas)
export function useDemora(ms = 500): boolean {
  const [paso, setPaso] = useState(false);
  useEffect(() => {
    const espera = setTimeout(() => setPaso(true), ms);
    return () => clearTimeout(espera);
  }, [ms]);
  return paso;
}

// Letras de Shiro: posicion y ancho en el lienzo de 1200 x 720 del prototipo
const LETRAS = [
  { letra: 'o', clase: 'o', x: 746, ancho: 82 },
  { letra: 'r', clase: 'r', x: 688, ancho: 58 },
  { letra: 'i', clase: 'i', x: 648, ancho: 40 },
  { letra: 'h', clase: 'h', x: 564, ancho: 84 },
  { letra: 'S', clase: 'S', x: 480, ancho: 84 },
];

const TRAZO = { stroke: 'var(--primary)', strokeWidth: 8, strokeLinejoin: 'round', strokeLinecap: 'round', fill: 'none' } as const;

export function CargaDeShiro() {
  const visible = useDemora();
  if (!visible) return null;
  const letra: CSSProperties = { position: 'absolute', top: 300, textAlign: 'center', fontSize: 120, lineHeight: 1, fontWeight: 800, color: 'var(--text)' };
  return (
    <div className="sh-carga-gato" role="status" aria-label="Cargando">
      <div className="sh-carga-gato-lienzo">
        <div className="ld cat" style={{ position: 'absolute', left: 320, top: 290, width: 140, height: 140 }}>
          <div className="ld catb" style={{ width: 140, height: 140 }}>
            <svg viewBox="0 0 120 120" width="140" height="140" aria-hidden="true">
              <path d="M24 50 L24 18 L46 36 L74 36 L96 18 L96 104 Q96 112 88 112 L32 112 Q24 112 24 104 Z" fill="var(--surface)" stroke="none" />
              <path d="M46 36 L74 36 L96 18 L96 104 Q96 112 88 112 L32 112 Q24 112 24 104 L24 40" {...TRAZO} />
              <path d="M24 42 L24 18 L46 36" {...TRAZO} />
              <path d="M8 76 H112" {...TRAZO} strokeWidth={7} />
              <g className="ld eyes">
                <rect className="eye" x="42" y="54" width="8" height="12" rx="4" fill="var(--text)" />
                <rect className="eye" x="70" y="54" width="8" height="12" rx="4" fill="var(--text)" />
              </g>
            </svg>
          </div>
        </div>
        {LETRAS.map((l) => (
          <span key={l.clase} className={`ld m-${l.clase}`} aria-hidden="true" style={{ ...letra, left: l.x, width: l.ancho }}>
            <span className={`ld b-${l.clase}`}>{l.letra}</span>
          </span>
        ))}
      </div>
      <span className="sh-sr">Cargando…</span>
    </div>
  );
}

// Trazos del 白 (los ocho primeros) y del gato (orejas y bigotes, al final), con su largo
const TRAZOS = [
  { d: 'M60 10 L50 26', largo: 19 }, { d: 'M24 36 V112', largo: 76 }, { d: 'M24 36 H46', largo: 22 }, { d: 'M46 36 H74', largo: 28 },
  { d: 'M74 36 H96', largo: 22 }, { d: 'M96 36 V112', largo: 76 }, { d: 'M24 76 H96', largo: 72 }, { d: 'M24 112 H96', largo: 72 },
  { d: 'M24 42 L24 18 L46 36', largo: 51 }, { d: 'M74 36 L96 18 L96 42', largo: 51 }, { d: 'M24 76 H8', largo: 16 }, { d: 'M96 76 H112', largo: 16 },
];

const LARGO_DEL_KANJI = TRAZOS.slice(0, 8).reduce((total, t) => total + t.largo, 0);

const LARGO_DEL_GATO = TRAZOS.slice(8).reduce((total, t) => total + t.largo, 0);

// Cuanto de cada trazo esta dibujado: el 白 se escribe hasta el 90 % y el gato aparece del 90 al 100 %
function dibujado(porcentaje: number): number[] {
  let kanji = (Math.min(porcentaje, 90) / 90) * LARGO_DEL_KANJI;
  let gato = (Math.max(porcentaje - 90, 0) / 10) * LARGO_DEL_GATO;
  return TRAZOS.map((t, i) => {
    const disponible = i < 8 ? kanji : gato;
    const hecho = Math.min(t.largo, Math.max(disponible, 0));
    if (i < 8) kanji -= t.largo;
    else gato -= t.largo;
    return hecho;
  });
}

export function CargaConAvance({ porcentaje, etiqueta }: { porcentaje: number; etiqueta: string }) {
  const valor = Math.max(0, Math.min(100, Math.round(porcentaje)));
  const hechos = dibujado(valor);
  return (
    <div className="sh-carga-avance" role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={valor}>
      <svg viewBox="0 0 120 120" width="88" height="88" aria-hidden="true">
        {TRAZOS.map((t, i) => (
          <path key={t.d} d={t.d} {...TRAZO} strokeDasharray={`${t.largo} 999`} strokeDashoffset={hechos[i] >= t.largo ? 0 : t.largo + 8 - hechos[i]} />
        ))}
      </svg>
      <span className="sh-carga-avance-valor">{valor}<span className="ui-muted">%</span></span>
    </div>
  );
}

export function ErrorConReintento({ mensaje, alReintentar }: { mensaje: string; alReintentar: () => void }) {
  return (
    <div className="ui-alert is-danger" role="alert">
      <Icono nombre="alerta" /><span>{mensaje}</span>
      <span className="ui-spacer" />
      <button className="ui-btn sm" type="button" onClick={alReintentar}>Reintentar</button>
    </div>
  );
}
