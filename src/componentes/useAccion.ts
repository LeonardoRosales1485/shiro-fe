// Acciones de una pantalla que cambian datos: marca que hay una en curso, muestra su aviso o su error y, si salio
// bien, avisa para volver a leer (alTerminar).
import { useState } from 'react';
import { mensajeDeError } from '../api/cliente';

export function useAccion(alTerminar: () => void) {
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Corre la accion; si sale bien muestra el mensaje (si hay) y llama a alTerminar
  const ejecutar = async (accion: () => Promise<unknown>, mensaje: string | null) => {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      await accion();
      if (mensaje) setAviso(mensaje);
      alTerminar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  };

  return { ocupado, aviso, setAviso, error, setError, ejecutar };
}
