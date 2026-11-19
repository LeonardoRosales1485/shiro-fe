// Tokens MCP (T6.4, prototipos "Tokens MCP" y "Generar token"): los tokens de acceso personales del usuario para que
// su LLM opere Shiro por MCP con sus mismos permisos, también los revocados, con su último uso (propuesta 50). Generar
// muestra el token una sola vez para copiarlo; revocar lo desactiva al instante. Explica cómo conectar el cliente MCP.
import { useEffect, useId, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import { fecha } from '../componentes/catalogos';
import { Encabezado } from '../componentes/Encabezado';
import { Icono } from '../componentes/Icono';
import { AlertaDeError, Modal } from '../componentes/Modal';
import { useAccion } from '../componentes/useAccion';
import { useEnvio } from '../componentes/useEnvio';

type Props = { nombreDelUsuario: string };

// Token en la lista (GET /usuario/mis-tokens): tambien los revocados, con su ultimo uso
type Token = { uuid: string; nombre: string; activo: boolean; fechaDeCreacion: string | null; fechaDeRevocacion: string | null; ultimoUso: string | null };

// Token recien creado (POST /usuario/crear-token): trae el token en claro una sola vez
type TokenCreado = { uuid: string; nombre: string; codigo: string | null };

// Direccion del servidor MCP de este Shiro (el backend se publica en /api, bajo la misma base que el front)
const URL_MCP = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/mcp`;

export function Tokens({ nombreDelUsuario }: Props) {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const [generando, setGenerando] = useState(false);
  const [nuevo, setNuevo] = useState<TokenCreado | null>(null);
  const [aRevocar, setARevocar] = useState<Token | null>(null);
  const { aviso, setAviso, error, setError } = useAccion(() => setVuelta((v) => v + 1));

  useEffect(() => {
    let vigente = true;
    pedir<Token[]>('GET', '/usuario/mis-tokens')
      .then((leidos) => vigente && setTokens(leidos))
      .catch((e) => vigente && setErrorDeCarga(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [vuelta]);

  const copiar = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setAviso('Token copiado.');
    } catch {
      setError('No se pudo copiar. Seleccioná el token y copialo a mano.');
    }
  };

  return (
    <>
      <Encabezado migas={['Cuenta', 'Tokens MCP']} titulo="Tokens MCP">
        <button className="ui-btn solid" type="button" onClick={() => setGenerando(true)}><Icono nombre="llave" />Generar token</button>
      </Encabezado>
      <p className="ui-muted" style={{ marginTop: 0 }}>
        {`Con un token tu LLM opera Shiro por MCP con tus mismos permisos, administración incluida. Sus cambios quedan como «${nombreDelUsuario} (vía MCP)».`}
      </p>
      {nuevo?.codigo && (
        <div className="ui-alert is-success sh-token-nuevo">
          <span>{`Token «${nuevo.nombre}» generado. Copialo ahora: no se vuelve a mostrar.`}</span>
          <code className="sh-mono">{nuevo.codigo}</code>
          <button className="ui-btn sm" type="button" onClick={() => copiar(nuevo.codigo ?? '')}>Copiar</button>
        </div>
      )}
      {aviso && <div className="ui-alert is-success" role="status"><span>{aviso}</span></div>}
      <AlertaDeError mensaje={errorDeCarga ? `No se pudieron cargar los tokens. ${errorDeCarga}` : error} />
      <div className="sh-detalle-principal">
        <section className="ui-card sh-tarjeta">
          {tokens && tokens.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>Todavía no generaste tokens.</p>}
          {!tokens && !errorDeCarga && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
          {tokens && tokens.length > 0 && (
            <div className="ui-table-wrap">
              <table className="ui-table" aria-label="Tokens">
                <thead><tr><th>Nombre</th><th>Creado</th><th>Último uso</th><th>Estado</th><th><span className="sh-sr">Acciones</span></th></tr></thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr key={t.uuid}>
                      <td>{t.nombre}</td>
                      <td>{fecha(t.fechaDeCreacion)}</td>
                      <td>{t.ultimoUso ? fecha(t.ultimoUso, true) : '—'}</td>
                      <td>{t.activo ? 'Activo' : `Revocado${t.fechaDeRevocacion ? ` el ${fecha(t.fechaDeRevocacion)}` : ''}`}</td>
                      <td>{t.activo && (
                        <button className="ui-btn ghost sm" type="button" aria-label={`Revocar ${t.nombre}`} onClick={() => setARevocar(t)}>Revocar</button>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="ui-card sh-tarjeta" aria-label="Conectar tu LLM">
          <h2 className="ui-card-title">Conectar tu LLM</h2>
          <p style={{ margin: 0 }}>Agregá Shiro como servidor MCP en tu cliente con esta dirección y el token como clave (encabezado Authorization: Bearer).</p>
          <p style={{ margin: 0 }}>URL: <code className="sh-mono">{URL_MCP}</code></p>
          <p className="ui-help" style={{ margin: 0 }}>Un token revocado deja de funcionar al instante.</p>
        </section>
      </div>
      {generando && (
        <GenerarTokenModal alCerrar={() => setGenerando(false)} alGenerar={(token: TokenCreado) => {
          setGenerando(false);
          setNuevo(token);
          setVuelta((v) => v + 1);
        }} />
      )}
      {aRevocar && (
        <RevocarTokenModal token={aRevocar} alCerrar={() => setARevocar(null)} alRevocar={() => {
          setAviso(`Se revocó «${aRevocar.nombre}». Deja de funcionar al instante.`);
          setARevocar(null);
          setVuelta((v) => v + 1);
        }} />
      )}
    </>
  );
}

// Generar un token: pide el nombre (unico entre los tokens del usuario)
function GenerarTokenModal({ alGenerar, alCerrar }: { alGenerar: (token: TokenCreado) => void; alCerrar: () => void }) {
  const id = useId();
  const [nombre, setNombre] = useState('');
  const { enviando, error, enviar } = useEnvio();
  const generar = () => enviar(async () => alGenerar(await pedir<TokenCreado>('POST', '/usuario/crear-token', { nombre: nombre.trim() })));
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid" type="button" disabled={!nombre.trim() || enviando} onClick={generar}>Generar token</button>
  </>;
  return (
    <Modal titulo="Generar token MCP" alCerrar={alCerrar} pie={pie} ancho={480}>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-n`}>Nombre</label>
        <input id={`${id}-n`} className="ui-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <span className="ui-help">Para reconocerlo en la lista, por ejemplo el cliente o el equipo donde lo usás.</span>
      </div>
      <p className="ui-help" style={{ margin: 0 }}>El token tiene tus mismos permisos, administración incluida. Se muestra una sola vez.</p>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}

// Revocar un token: deja de funcionar al instante
function RevocarTokenModal({ token, alRevocar, alCerrar }: { token: Token; alRevocar: () => void; alCerrar: () => void }) {
  const { enviando, error, enviar } = useEnvio();
  const revocar = () => enviar(async () => {
    await pedir('DELETE', `/usuario/borrar-token/${token.uuid}`);
    alRevocar();
  });
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid is-danger" type="button" disabled={enviando} onClick={revocar}>Revocar</button>
  </>;
  return (
    <Modal titulo="Revocar token" alCerrar={alCerrar} pie={pie} ancho={440}>
      <p style={{ margin: 0 }}>{`¿Revocar «${token.nombre}»? El LLM que lo use deja de poder entrar a Shiro.`}</p>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
