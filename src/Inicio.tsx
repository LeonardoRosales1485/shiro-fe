// Pagina inicial provisoria (F0): muestra el nombre del producto y si el backend responde. Las pantallas
// definitivas salen del prototipo "Shiro — vistas v1" en F6.
import { useEffect, useState } from 'react';

type EstadoDelBackend =
  | { tipo: 'cargando' }
  | { tipo: 'conectado'; version: string }
  | { tipo: 'error' };

// Consulta /api/actuator/info del backend y responde su version, o lanza un error si no responde
async function consultarBackend(): Promise<string> {
  const respuesta = await fetch('/api/actuator/info');
  if (!respuesta.ok) {
    throw new Error(`El backend respondió ${respuesta.status}`);
  }
  const info: { version: string } = await respuesta.json();
  return info.version;
}

export function Inicio() {
  const [estado, setEstado] = useState<EstadoDelBackend>({ tipo: 'cargando' });

  useEffect(() => {
    let vigente = true;
    consultarBackend()
      .then((version) => vigente && setEstado({ tipo: 'conectado', version }))
      .catch(() => vigente && setEstado({ tipo: 'error' }));
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <main className="inicio">
      <section className="ui-card inicio-tarjeta">
        <div className="ui-card-body ui-stack">
          <div>
            <p className="ui-muted inicio-antetitulo">Gestor de trabajo de Blue Open Data</p>
            <h1 className="inicio-titulo">Shiro</h1>
          </div>
          {estado.tipo === 'cargando' && (
            <div className="ui-alert is-neutral" role="status">
              <span className="ui-spinner" aria-hidden="true"></span>
              <span>Consultando el backend...</span>
            </div>
          )}
          {estado.tipo === 'conectado' && (
            <div className="ui-alert is-success" role="status">
              <span>{`Backend conectado: versión ${estado.version}`}</span>
            </div>
          )}
          {estado.tipo === 'error' && (
            <div className="ui-alert is-danger" role="alert">
              <span>No se pudo conectar con el backend. Revisá que esté levantado en el puerto 7090.</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
