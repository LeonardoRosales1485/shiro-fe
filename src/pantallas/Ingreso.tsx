// Ingreso (T6.1, prototipos "Ingreso" e "Ingreso rechazado"): con la cuenta de Google de la empresa o con una cuenta
// de Shiro (usuario o correo y contraseña). El backend setea las cookies de sesion; el front solo avisa que ingreso.
// Google Identity Services se carga solo si hay client id (VITE_GOOGLE_CLIENT_ID); sin el, el boton queda
// deshabilitado y lo explica.
import { useEffect, useEffectEvent, useState, type FormEvent } from 'react';
import { ErrorDeApi, mensajeDeError, pedir } from '../api/cliente';
import { Icono, Isotipo } from '../componentes/Icono';
import { AlertaDeError } from '../componentes/Modal';
import { BotonDeTema } from '../componentes/Tema';

type Props = { alIngresar: () => void; clientIdDeGoogle?: string };

// Evento (en window) con el ID token de Google que dispara el callback de Google Identity Services
const EVENTO_DE_GOOGLE = 'shiro:google';

const MENSAJES: Record<string, string> = {
  CREDENCIALES_INVALIDAS: 'El usuario o la contraseña no coinciden. Revisalos e intentá de nuevo.',
  NO_AUTENTICADO: 'Tu usuario está archivado y no puede ingresar. Pedile a un administrador que lo restaure.',
};

// Mensaje del error de ingreso: los conocidos con el texto del prototipo, el resto con el del backend
function mensajeDeIngreso(error: unknown): string {
  return error instanceof ErrorDeApi && MENSAJES[error.codigo] ? MENSAJES[error.codigo] : mensajeDeError(error);
}

export function Ingreso({ alIngresar, clientIdDeGoogle = import.meta.env.VITE_GOOGLE_CLIENT_ID }: Props) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingresarCon = async (ruta: string, cuerpo: unknown) => {
    setEnviando(true);
    setError(null);
    try {
      await pedir('POST', ruta, cuerpo);
      alIngresar();
    } catch (e) {
      setError(mensajeDeIngreso(e));
    } finally {
      setEnviando(false);
    }
  };

  const ingresarConGoogle = useEffectEvent((idToken: string) => ingresarCon('/usuario/ingresar-con-google', { idToken }));

  useEffect(() => {
    if (!clientIdDeGoogle) return;
    const alRecibir = (evento: Event) => ingresarConGoogle((evento as CustomEvent<string>).detail);
    window.addEventListener(EVENTO_DE_GOOGLE, alRecibir);
    return () => window.removeEventListener(EVENTO_DE_GOOGLE, alRecibir);
  }, [clientIdDeGoogle]);

  const abrirGoogle = () => cargarGoogle(clientIdDeGoogle as string, (idToken) =>
    window.dispatchEvent(new CustomEvent(EVENTO_DE_GOOGLE, { detail: idToken })));

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    ingresarCon('/usuario/iniciar-sesion', { nombreDeUsuario: usuario.trim(), contrasena });
  };

  return (
    <div className="sh-ingreso">
      <div className="sh-ingreso-tema"><BotonDeTema /></div>
      <div className="ui-card sh-ingreso-tarjeta">
        <div className="ui-row" style={{ gap: 12 }}><Isotipo tamano={44} /><span className="sh-marca" aria-hidden="true">Shiro</span></div>
        <div style={{ display: 'grid', gap: 4 }}>
          <h1 className="sh-ingreso-titulo">Ingresá a tu espacio</h1>
          <p className="ui-muted" style={{ margin: 0 }}>Usá tu cuenta de Google de la empresa.</p>
        </div>
        <button className="ui-btn solid lg block" type="button" disabled={!clientIdDeGoogle || enviando} onClick={abrirGoogle}>
          <Icono nombre="entrar" />Ingresar con Google
        </button>
        <p className="ui-help" style={{ margin: 0, textAlign: 'center' }}>
          {clientIdDeGoogle ? 'Solo cuentas de la organización' : 'El ingreso con Google no está configurado en este servidor: usá una cuenta de Shiro.'}
        </p>
        <div className="sh-separador">o con una cuenta de Shiro</div>
        <form style={{ display: 'grid', gap: 16 }} onSubmit={enviar}>
          <label className="ui-field"><span className="ui-label">Usuario o correo</span>
            <input className="ui-input" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} /></label>
          <label className="ui-field"><span className="ui-label">Contraseña</span>
            <input className="ui-input" type="password" autoComplete="current-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} /></label>
          <AlertaDeError mensaje={error} />
          <button className="ui-btn outline block" type="submit" disabled={!usuario.trim() || !contrasena || enviando}>Ingresar</button>
        </form>
        <p className="ui-help" style={{ margin: 0 }}>Las cuentas propias de Shiro las crea un administrador.</p>
      </div>
    </div>
  );
}

type GoogleId = { accounts: { id: { initialize: (opciones: object) => void; prompt: () => void } } };

// Carga Google Identity Services (una vez) y abre el selector de cuenta; entrega el ID token al callback
function cargarGoogle(clientId: string, alRecibir: (idToken: string) => void): void {
  const abrir = () => {
    const google = (window as unknown as { google: GoogleId }).google;
    google.accounts.id.initialize({ client_id: clientId, callback: (respuesta: { credential: string }) => alRecibir(respuesta.credential) });
    google.accounts.id.prompt();
  };
  if ((window as unknown as { google?: GoogleId }).google) {
    abrir();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = abrir;
  document.head.appendChild(script);
}
