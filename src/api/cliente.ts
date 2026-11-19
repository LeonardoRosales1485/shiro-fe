// Cliente de la API de Shiro. La sesion viaja en las cookies HttpOnly que setea el backend (access_token y
// refresh_token): el front nunca guarda el JWT. Ante un 401 intenta una vez renovar la sesion con el refresh token y
// repite el pedido. Todo error sale como ErrorDeApi con el codigo del backend; el front decide por el codigo.

export class ErrorDeApi extends Error {
  readonly codigo: string;
  readonly status: number;

  constructor(codigo: string, status: number, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
    this.status = status;
  }
}

// Base de la API: el backend se publica bajo el mismo dominio y la misma base que el front, en /api
const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

// Rutas que no se reintentan con el refresh token (son las que crean o renuevan la sesion)
const SIN_REINTENTO = ['/usuario/iniciar-sesion', '/usuario/ingresar-con-google', '/usuario/refresh-token', '/usuario/cerrar-sesion'];

type Metodo = 'GET' | 'POST' | 'DELETE';

// Hace el pedido y responde el JSON (o undefined si no hay cuerpo). Lanza ErrorDeApi
export async function pedir<T>(metodo: Metodo, ruta: string, cuerpo?: unknown): Promise<T> {
  let respuesta = await enviar(metodo, ruta, cuerpo);
  if (respuesta.status === 401 && !SIN_REINTENTO.includes(ruta)) {
    const renovada = await enviar('POST', '/usuario/refresh-token');
    if (renovada.ok) {
      respuesta = await enviar(metodo, ruta, cuerpo);
    }
  }
  const texto = await respuesta.text();
  const datos = texto ? JSON.parse(texto) : undefined;
  if (!respuesta.ok) {
    throw new ErrorDeApi(datos?.codigo ?? 'ERROR_DESCONOCIDO', respuesta.status,
      datos?.mensajeParaUsuario ?? 'Algo salió mal. Volvé a intentar.');
  }
  return datos as T;
}

// Envia el pedido con las cookies de sesion. Lanza ErrorDeApi SIN_CONEXION si el servidor no responde
async function enviar(metodo: Metodo, ruta: string, cuerpo?: unknown): Promise<Response> {
  try {
    return await fetch(`${BASE}${ruta}`, {
      method: metodo,
      credentials: 'include',
      headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorDeApi('SIN_CONEXION', 0, 'No se pudo conectar con el servidor. Revisá tu conexión.');
  }
}

// Mensaje para mostrar de cualquier error (los que no son de la API, con un texto generico)
export function mensajeDeError(error: unknown): string {
  return error instanceof ErrorDeApi ? error.message : 'Algo salió mal. Volvé a intentar.';
}
