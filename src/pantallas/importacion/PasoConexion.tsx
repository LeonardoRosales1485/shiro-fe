// Paso 1 de importar desde Jira (T6.5, prototipo "Importar desde Jira · conexión", propuesta 53 resuelta el 20/11):
// URL del sitio de Jira Cloud, correo y token de API. «Probar conexión» lista los proyectos de Jira visibles con esas
// credenciales (sin guardar nada); se elige uno y el prefijo del proyecto en Shiro (propone la clave de Jira).
// «Conectar» guarda el token cifrado en el backend (no se vuelve a mostrar ni queda en el navegador) y responde el
// catálogo para mapear.
import { useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import { CampoDeTexto } from '../../componentes/CampoDeTexto';
import { AlertaDeError } from '../../componentes/Modal';
import { useEnvio } from '../../componentes/useEnvio';
import type { Catalogo } from './mapeo';

type Props = { alConectar: (catalogo: Catalogo, prefijo: string) => void };

type ProyectoDeJira = { clave: string; nombre: string };

export function PasoConexion({ alConectar }: Props) {
  const id = useId();
  const [url, setUrl] = useState('');
  const [correo, setCorreo] = useState('');
  const [token, setToken] = useState('');
  const [proyectos, setProyectos] = useState<ProyectoDeJira[] | null>(null);
  const [clave, setClave] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const { enviando, error, enviar } = useEnvio();
  const credenciales = () => ({ url: url.trim(), correo: correo.trim(), token });

  const probar = () => enviar(async () => {
    setProyectos(await pedir<ProyectoDeJira[]>('POST', '/importacion/proyectos-de-jira', credenciales()));
    setClave('');
  });
  const elegir = (elegida: string) => {
    setClave(elegida);
    setPrefijo(/^[A-Z]{2,6}$/.test(elegida) ? elegida : '');
  };
  const conectar = () => enviar(async () => {
    const elegido = prefijo.trim().toUpperCase();
    const catalogo = await pedir<Catalogo>('POST', '/importacion/conectar', { ...credenciales(), claveProyecto: clave, prefijo: elegido });
    setToken('');
    alConectar(catalogo, elegido);
  });
  const cambiarCredencial = (cambiar: (v: string) => void) => (valor: string) => {
    cambiar(valor);
    setProyectos(null);
  };


  return (
    <section className="ui-card sh-tarjeta" aria-label="Conectar con Jira">
      <h2 className="ui-card-title" style={{ margin: 0 }}>Conectar con Jira</h2>
      <CampoDeTexto id={`${id}-u`} etiqueta="URL de Jira" tipo="url" valor={url} alCambiar={cambiarCredencial(setUrl)} />
      <CampoDeTexto id={`${id}-c`} etiqueta="Correo de la cuenta" tipo="email" valor={correo} alCambiar={cambiarCredencial(setCorreo)} />
      <CampoDeTexto id={`${id}-t`} etiqueta="Token de la API" tipo="password" valor={token} alCambiar={cambiarCredencial(setToken)}
        ayuda="Se guarda cifrado al conectar y se usa solo para importar este proyecto. No se vuelve a mostrar." />
      <div className="ui-row">
        <button className="ui-btn" type="button" disabled={!url.trim() || !correo.trim() || !token || enviando} onClick={probar}>Probar conexión</button>
        {proyectos && <span className="ui-chip is-success" role="status">{`Conectado: ${proyectos.length} ${proyectos.length === 1 ? 'proyecto visible' : 'proyectos visibles'}.`}</span>}
      </div>
      {proyectos && (
        <>
          <div className="ui-field">
            <label className="ui-label" htmlFor={`${id}-k`}>Proyecto de Jira</label>
            <select id={`${id}-k`} className="ui-select" value={clave} onChange={(e) => elegir(e.target.value)}>
              <option value="">Elegí un proyecto…</option>
              {proyectos.map((p) => <option key={p.clave} value={p.clave}>{`${p.clave} · ${p.nombre}`}</option>)}
            </select>
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor={`${id}-p`}>Prefijo en Shiro</label>
            <input id={`${id}-p`} className="ui-input sh-mono" maxLength={6} value={prefijo} onChange={(e) => setPrefijo(e.target.value.toUpperCase())} />
            <span className="ui-help">De 2 a 6 letras. Las tareas importadas quedan J-PREFIJO-número de Jira y las nuevas siguen PREFIJO-n. Para volver a importar, usá el prefijo de ese proyecto.</span>
          </div>
        </>
      )}
      <AlertaDeError mensaje={error} />
      {proyectos && (
        <div className="ui-row" style={{ justifyContent: 'flex-end' }}>
          <button className="ui-btn solid" type="button" disabled={!clave || !prefijo.trim() || enviando} onClick={conectar}>Conectar</button>
        </div>
      )}
    </section>
  );
}
