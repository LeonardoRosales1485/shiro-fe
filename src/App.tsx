// Aplicacion: consulta la sesion (cookies del backend) y muestra el ingreso o el espacio de trabajo. Un usuario es
// administrador si puede leer sus propios grupos (solo los administradores pueden).
import { useCallback, useEffect, useState } from 'react';
import { pedir } from './api/cliente';
import type { UsuarioDTO } from './api/tipos';
import { navegar } from './navegacion/ruta';
import { Espacio } from './pantallas/Espacio';
import { Ingreso } from './pantallas/Ingreso';

type Sesion = { usuario: UsuarioDTO; esAdministrador: boolean };

// Sesion actual, o null si no hay (o no se pudo renovar)
async function leerSesion(): Promise<Sesion | null> {
  try {
    const usuario = await pedir<UsuarioDTO>('GET', '/usuario/sesion');
    const esAdministrador = await pedir('GET', `/usuario/${usuario.uuid}/grupos`).then(() => true, () => false);
    return { usuario, esAdministrador };
  } catch {
    return null;
  }
}

export function App() {
  const [sesion, setSesion] = useState<Sesion | null | 'cargando'>('cargando');

  const cargarSesion = useCallback(() => {
    leerSesion().then(setSesion);
  }, []);

  useEffect(() => {
    let vigente = true;
    leerSesion().then((leida) => vigente && setSesion(leida));
    return () => {
      vigente = false;
    };
  }, []);

  const salir = async () => {
    await pedir('POST', '/usuario/cerrar-sesion').catch(() => undefined);
    setSesion(null);
    navegar('/', true);
  };

  if (sesion === 'cargando') {
    return <div className="sh-cargando" role="status"><span className="ui-spinner" aria-hidden="true" /><span className="sh-sr">Cargando</span></div>;
  }
  if (sesion === null) {
    return <Ingreso alIngresar={cargarSesion} />;
  }
  return <Espacio key={sesion.usuario.uuid} esAdministrador={sesion.esAdministrador} alSalir={salir} />;
}
