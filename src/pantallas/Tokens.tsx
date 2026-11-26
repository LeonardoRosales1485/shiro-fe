// Tokens MCP (T6.4, prototipos "Tokens MCP" y "Generar token"): los tokens de acceso personales del usuario para que
// su LLM opere Shiro por MCP con sus mismos permisos, también los revocados, con su último uso (propuesta 50). Generar
// muestra el token una sola vez para copiarlo; revocar lo desactiva al instante. Explica cómo conectar el cliente MCP.
// MJ-14: cada token vence a los 30, 90 o 180 días elegidos al generarlo; se avisan los que vencen en 7 días o menos.
import { useEffect, useId, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import { fecha } from '../componentes/catalogos';
import { Encabezado } from '../componentes/Encabezado';
import { Icono } from '../componentes/Icono';
import { AlertaDeError, Modal } from '../componentes/Modal';
import { useAccion } from '../componentes/useAccion';
import { useEnvio } from '../componentes/useEnvio';
import { BotonDeAccion } from '../componentes/BotonDeAccion';

type Props = { nombreDelUsuario: string };

// Token en la lista (GET /usuario/mis-tokens): tambien los revocados, con su ultimo uso y su vencimiento
type Token = {
  uuid: string; nombre: string; activo: boolean; fechaDeCreacion: string | null; fechaDeRevocacion: string | null; ultimoUso: string | null;
  vence: string | null;
};

// Token recien creado (POST /usuario/crear-token-con-vencimiento): trae el token en claro una sola vez y su vencimiento
type TokenCreado = { uuid: string; nombre: string; codigo: string | null; vence: string | null };

// Vigencias que se pueden elegir al generar un token, en dias (decision D-3: 90 por defecto)
const VIGENCIAS = [30, 90, 180];

// Dias de anticipacion con que se avisa que un token vence
const DIAS_DE_AVISO = 7;

const UN_DIA = 24 * 60 * 60 * 1000;

// Dias que le quedan al token (redondeado hacia arriba); 0 o menos si ya vencio. null si no tiene vencimiento
function diasRestantes(token: { vence: string | null }): number | null {
  return token.vence ? Math.ceil((new Date(token.vence).getTime() - Date.now()) / UN_DIA) : null;
}

// Estado del token en la tabla: revocado, vencido, por vencer o activo
function estado(t: Token): string {
  if (!t.activo) return `Revocado${t.fechaDeRevocacion ? ` el ${fecha(t.fechaDeRevocacion)}` : ''}`;
  const dias = diasRestantes(t);
  if (dias !== null && dias <= 0) return 'Vencido';
  if (dias !== null && dias <= DIAS_DE_AVISO) return `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`;
  return 'Activo';
}

// Tokens activos que vencen dentro del aviso (y todavia sirven)
function porVencer(tokens: Token[]): Token[] {
  return tokens.filter((t) => {
    const dias = diasRestantes(t);
    return t.activo && dias !== null && dias > 0 && dias <= DIAS_DE_AVISO;
  });
}

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
          <span>{`Token «${nuevo.nombre}» generado.${nuevo.vence ? ` Vence el ${fecha(nuevo.vence)}.` : ''} Copialo ahora: no se vuelve a mostrar.`}</span>
          <code className="sh-mono">{nuevo.codigo}</code>
          <button className="ui-btn sm" type="button" onClick={() => copiar(nuevo.codigo ?? '')}>Copiar</button>
        </div>
      )}
      {aviso && <div className="ui-alert is-success" role="status"><span>{aviso}</span></div>}
      {tokens && porVencer(tokens).map((t) => {
        const dias = diasRestantes(t);
        return (
          <div key={t.uuid} className="ui-alert is-warning">
            <span>{`«${t.nombre}» vence en ${dias} ${dias === 1 ? 'día' : 'días'}. Generá uno nuevo y cambialo en tu cliente MCP.`}</span>
          </div>
        );
      })}
      <AlertaDeError mensaje={errorDeCarga ? `No se pudieron cargar los tokens. ${errorDeCarga}` : error} />
      <div className="sh-detalle-principal">
        <section className="ui-card sh-tarjeta">
          {tokens && tokens.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>Todavía no generaste tokens.</p>}
          {!tokens && !errorDeCarga && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
          {tokens && tokens.length > 0 && (
            <div className="ui-table-wrap">
              <table className="ui-table" aria-label="Tokens">
                <thead><tr><th>Nombre</th><th>Creado</th><th>Último uso</th><th>Vence</th><th>Estado</th><th><span className="sh-sr">Acciones</span></th></tr></thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr key={t.uuid}>
                      <td>{t.nombre}</td>
                      <td>{fecha(t.fechaDeCreacion)}</td>
                      <td>{t.ultimoUso ? fecha(t.ultimoUso, true) : '—'}</td>
                      <td>{t.vence ? fecha(t.vence) : '—'}</td>
                      <td>{estado(t)}</td>
                      <td>{t.activo && estado(t) !== 'Vencido' && (
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
          <p className="ui-help" style={{ margin: 0 }}>Un token revocado deja de funcionar al instante, y uno vencido también: generá otro antes de que venza.</p>
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

// Generar un token: pide el nombre (unico entre los tokens del usuario) y en cuantos dias vence
function GenerarTokenModal({ alGenerar, alCerrar }: { alGenerar: (token: TokenCreado) => void; alCerrar: () => void }) {
  const id = useId();
  const [nombre, setNombre] = useState('');
  const [dias, setDias] = useState(90);
  const { enviando, error, enviar } = useEnvio();
  const generar = () => enviar(async () => alGenerar(await pedir<TokenCreado>('POST', '/usuario/crear-token-con-vencimiento',
    { nombre: nombre.trim(), diasDeVigencia: dias })));
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <BotonDeAccion clase="ui-btn solid" texto="Generar token" enviando={enviando} deshabilitado={!nombre.trim()} alHacerClic={generar} />
  </>;
  return (
    <Modal titulo="Generar token MCP" alCerrar={alCerrar} pie={pie} ancho={480}>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-n`}>Nombre</label>
        <input id={`${id}-n`} className="ui-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <span className="ui-help">Para reconocerlo en la lista, por ejemplo el cliente o el equipo donde lo usás.</span>
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-v`}>Vence en</label>
        <select id={`${id}-v`} className="ui-select" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
          {VIGENCIAS.map((v) => <option key={v} value={v}>{`${v} días`}</option>)}
        </select>
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
    <BotonDeAccion clase="ui-btn solid is-danger" texto="Revocar" enviando={enviando} alHacerClic={revocar} />
  </>;
  return (
    <Modal titulo="Revocar token" alCerrar={alCerrar} pie={pie} ancho={440}>
      <p style={{ margin: 0 }}>{`¿Revocar «${token.nombre}»? El LLM que lo use deja de poder entrar a Shiro.`}</p>
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
