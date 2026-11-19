// Estado de envio de un formulario o modal: corre la accion, marca que se esta enviando y guarda el mensaje de error.
import { useState } from 'react';
import { mensajeDeError } from '../api/cliente';

export function useEnvio() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Corre la accion; si falla deja el mensaje de error para mostrar
  const enviar = async (accion: () => Promise<void>) => {
    setEnviando(true);
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return { enviando, error, setError, enviar };
}
