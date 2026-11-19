// Paso 1 de importar desde Jira (T6.5, prototipo "Importar desde Jira · conexión"): URL del sitio de Jira Cloud, correo
// y token de API de la cuenta, clave del proyecto de Jira y prefijo del proyecto en Shiro. Conectar guarda el token
// cifrado en el backend (no se vuelve a mostrar ni se guarda en el navegador) y responde el catalogo para mapear.
import { useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import { AlertaDeError } from '../../componentes/Modal';
import { useEnvio } from '../../componentes/useEnvio';
import type { Catalogo } from './mapeo';

type Props = { alConectar: (catalogo: Catalogo, prefijo: string) => void };

export function PasoConexion({ alConectar }: Props) {
  const id = useId();
  const [url, setUrl] = useState('');
  const [correo, setCorreo] = useState('');
  const [token, setToken] = useState('');
  const [clave, setClave] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const { enviando, error, enviar } = useEnvio();
  const completo = url.trim() && correo.trim() && token && clave.trim() && prefijo.trim();

  const conectar = () => enviar(async () => {
    const elegido = prefijo.trim().toUpperCase();
    const catalogo = await pedir<Catalogo>('POST', '/importacion/conectar', {
      url: url.trim(), correo: correo.trim(), token, claveProyecto: clave.trim().toUpperCase(), prefijo: elegido,
    });
    setToken('');
    alConectar(catalogo, elegido);
  });

  const campo = (sufijo: string, etiqueta: string, valor: string, cambiar: (v: string) => void, extra: Record<string, string> = {}) => (
    <div className="ui-field">
      <label className="ui-label" htmlFor={`${id}-${sufijo}`}>{etiqueta}</label>
      <input id={`${id}-${sufijo}`} className="ui-input" value={valor} onChange={(e) => cambiar(e.target.value)} {...extra} />
    </div>
  );

  return (
    <section className="ui-card sh-tarjeta" aria-label="Conectar con Jira">
      <h2 className="ui-card-title" style={{ margin: 0 }}>Conectar con Jira</h2>
      {campo('u', 'URL de Jira', url, setUrl, { type: 'url', placeholder: 'https://empresa.atlassian.net' })}
      {campo('c', 'Correo de la cuenta', correo, setCorreo, { type: 'email' })}
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-t`}>Token de la API</label>
        <input id={`${id}-t`} className="ui-input" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
        <span className="ui-help">Se guarda cifrado y se usa solo para importar este proyecto. No se vuelve a mostrar.</span>
      </div>
      {campo('k', 'Clave del proyecto en Jira', clave, setClave, { placeholder: 'PTR' })}
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-p`}>Prefijo en Shiro</label>
        <input id={`${id}-p`} className="ui-input sh-mono" maxLength={6} value={prefijo} onChange={(e) => setPrefijo(e.target.value.toUpperCase())} />
        <span className="ui-help">De 2 a 6 letras. Las tareas importadas quedan J-PREFIJO-número de Jira y las nuevas siguen PREFIJO-n. Para volver a importar, usá el prefijo de ese proyecto.</span>
      </div>
      <AlertaDeError mensaje={error} />
      <div className="ui-row" style={{ justifyContent: 'flex-end' }}>
        <button className="ui-btn solid" type="button" disabled={!completo || enviando} onClick={conectar}>Conectar</button>
      </div>
    </section>
  );
}
