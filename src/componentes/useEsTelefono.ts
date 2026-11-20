// Si la pantalla es de telefono (hasta 760 px de ancho, T6.6): la version movil muestra la barra superior, el menu
// como cajon y el tablero por pestañas. Se actualiza si cambia el tamaño de la ventana.
import { useEffect, useState } from 'react';

const CONSULTA = '(max-width: 760px)';

function consultar(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA) : null;
}

export function useEsTelefono(): boolean {
  const [esTelefono, setEsTelefono] = useState(() => consultar()?.matches ?? false);
  useEffect(() => {
    const consulta = consultar();
    if (!consulta) return undefined;
    const alCambiar = () => setEsTelefono(consulta.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);
  return esTelefono;
}
