// Iconos de linea del prototipo (24x24, trazo 2). Decorativos salvo que se pase etiqueta.
import type { ReactNode } from 'react';

const TRAZOS: Record<string, ReactNode> = {
  mas: <path d="M12 5v14M5 12h14" />,
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  entrar: <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />,
  salir: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>,
  luna: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />,
  alerta: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>,
  contraer: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 9l-3 3 3 3" /></>,
  historia: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />,
  tarea: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m9 12 2 2 4-4" /></>,
  bug: <><rect x="8" y="6" width="8" height="14" rx="4" /><path d="M12 20v-9M8 13H4M20 13h-4M4 7l4 2M20 7l-4 2M4 19l4-2M20 19l-4-2M9 6l-1-3M15 6l1-3" /></>,
  epica: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  subtarea: <path d="M6 3v12a3 3 0 0 0 3 3h9M15 15l3 3-3 3" />,
  documento: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></>,
  lapiz: <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  lista: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  caja: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" /></>,
  lupa: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  archivo: <><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4" /></>,
  escudo: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  descargar: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  llave: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /></>,
  columnas: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 7v7M12 7v4M16 7v9" /></>,
  abajo: <path d="m6 9 6 6 6-6" />,
  arriba: <path d="m18 15-6-6-6 6" />,
  dobleArriba: <path d="m17 11-5-5-5 5M17 18l-5-5-5 5" />,
  dobleAbajo: <path d="m7 13 5 5 5-5M7 6l5 5 5-5" />,
  igual: <path d="M5 9h14M5 15h14" />,
  huella: <><ellipse cx="6.3" cy="10" rx="1.8" ry="2.3" transform="rotate(-25 6.3 10)" fill="currentColor" stroke="none" /><ellipse cx="9.8" cy="5.6" rx="1.9" ry="2.4" transform="rotate(-8 9.8 5.6)" fill="currentColor" stroke="none" /><ellipse cx="14.2" cy="5.6" rx="1.9" ry="2.4" transform="rotate(8 14.2 5.6)" fill="currentColor" stroke="none" /><ellipse cx="17.7" cy="10" rx="1.8" ry="2.3" transform="rotate(25 17.7 10)" fill="currentColor" stroke="none" /><path d="M12 11.6c-3 0-6 3.1-6 5.6 0 1.8 1.4 2.7 3 2.5 1.2-.15 2-.6 3-.6s1.8.45 3 .6c1.6.2 3-.7 3-2.5 0-2.5-3-5.6-6-5.6z" fill="currentColor" stroke="none" /></>,
};

export type NombreDeIcono = keyof typeof TRAZOS;

type Props = { nombre: NombreDeIcono; clase?: string; etiqueta?: string; color?: string };

export function Icono({ nombre, clase = 'ui-icon', etiqueta, color }: Props) {
  return (
    <svg className={clase} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
      strokeLinejoin="round" role={etiqueta ? 'img' : undefined} aria-label={etiqueta} aria-hidden={etiqueta ? undefined : true}
      style={color ? { color } : undefined}>
      {TRAZOS[nombre]}
    </svg>
  );
}

// Isotipo de Shiro (gato), del prototipo
export function Isotipo({ tamano }: { tamano: number }) {
  return (
    <svg viewBox="0 0 120 120" width={tamano} height={tamano} aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M24 50 L24 18 L46 36 L74 36 L96 18 L96 104 Q96 112 88 112 L32 112 Q24 112 24 104 Z"
        style={{ fill: 'var(--surface)', stroke: 'var(--primary)', strokeWidth: 8, strokeLinejoin: 'round' }} />
      <path d="M8 76 H112" style={{ fill: 'none', stroke: 'var(--primary)', strokeWidth: 7, strokeLinecap: 'round' }} />
      <rect x="42" y="54" width="8" height="12" rx="4" style={{ fill: 'var(--text)' }} />
      <rect x="70" y="54" width="8" height="12" rx="4" style={{ fill: 'var(--text)' }} />
    </svg>
  );
}
