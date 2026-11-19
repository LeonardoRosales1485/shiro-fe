// Navegacion minima con la History API (sin libreria de rutas): la ruta es el path sin la base de la aplicacion.
import { useSyncExternalStore } from 'react';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const CAMBIO = 'shiro:navegacion';

// Ruta actual, sin la base (siempre empieza con /)
function rutaActual(): string {
  const path = window.location.pathname;
  const sinBase = BASE && path.startsWith(BASE) ? path.slice(BASE.length) : path;
  return sinBase || '/';
}

function suscribir(aviso: () => void): () => void {
  window.addEventListener('popstate', aviso);
  window.addEventListener(CAMBIO, aviso);
  return () => {
    window.removeEventListener('popstate', aviso);
    window.removeEventListener(CAMBIO, aviso);
  };
}

// Hook con la ruta actual; se actualiza al navegar y con atras y adelante del navegador
export function useRuta(): string {
  return useSyncExternalStore(suscribir, rutaActual);
}

// Va a la ruta recibida; con reemplazar no deja una entrada nueva en el historial
export function navegar(ruta: string, reemplazar = false): void {
  if (reemplazar) {
    window.history.replaceState(null, '', BASE + ruta);
  } else {
    window.history.pushState(null, '', BASE + ruta);
  }
  window.dispatchEvent(new Event(CAMBIO));
}

// Href con la base de la aplicacion, para los enlaces
export function href(ruta: string): string {
  return BASE + ruta;
}
