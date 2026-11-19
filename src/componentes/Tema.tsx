// Tema claro u oscuro: se guarda en el navegador (preferencia de la persona) y se aplica con data-theme en <html>.
import { useSyncExternalStore } from 'react';
import { Icono } from './Icono';

type Tema = 'light' | 'dark';

const CLAVE = 'shiro.tema';

const CAMBIO = 'shiro:tema';

function temaActual(): Tema {
  try {
    return window.localStorage.getItem(CLAVE) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function suscribir(aviso: () => void): () => void {
  window.addEventListener(CAMBIO, aviso);
  return () => window.removeEventListener(CAMBIO, aviso);
}

// Aplica el tema guardado al documento (al iniciar la aplicacion)
export function aplicarTema(): void {
  document.documentElement.dataset.theme = temaActual();
}

// Hook con el tema actual y la funcion que lo alterna
export function useTema(): [Tema, () => void] {
  const tema = useSyncExternalStore(suscribir, temaActual);
  const alternar = () => {
    try {
      window.localStorage.setItem(CLAVE, tema === 'dark' ? 'light' : 'dark');
    } catch {
      // Sin almacenamiento el tema dura lo que la pagina
    }
    document.documentElement.dataset.theme = tema === 'dark' ? 'light' : 'dark';
    window.dispatchEvent(new Event(CAMBIO));
  };
  return [tema, alternar];
}

// Texto del boton que cambia el tema
export function etiquetaDeTema(tema: Tema): string {
  return tema === 'dark' ? 'Pasar a modo claro' : 'Pasar a modo oscuro';
}

// Boton con icono para cambiar el tema (pantallas sin menu)
export function BotonDeTema() {
  const [tema, alternar] = useTema();
  return (
    <button className="ui-btn ghost icon" type="button" aria-label={etiquetaDeTema(tema)} title={etiquetaDeTema(tema)} onClick={alternar}>
      <Icono nombre={tema === 'dark' ? 'sol' : 'luna'} />
    </button>
  );
}
