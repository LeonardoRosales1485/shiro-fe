// Lectura de datos de una pantalla: corre la funcion al montar y cada vez que cambia "vuelta", guarda el resultado o
// el mensaje de error, y descarta la respuesta si la pantalla ya cambio (pedido viejo).
import { useEffect, useState } from 'react';
import { mensajeDeError } from '../api/cliente';

export function useLectura<T>(leer: () => Promise<T>, vuelta: number) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    leer().then((leidos) => vigente && setDatos(leidos)).catch((e) => vigente && setError(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
    // La funcion de lectura se arma en cada render: solo "vuelta" pide leer de nuevo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vuelta]);
  return { datos, error };
}
