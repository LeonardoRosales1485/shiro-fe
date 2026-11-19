// Doble de la API para las pruebas: reemplaza fetch y responde segun "METODO /api/ruta". Guarda cada pedido con su
// cuerpo para verificar que mando el front. Una ruta sin respuesta responde 404.
import { vi } from 'vitest';

export type Respuesta = { status?: number; cuerpo?: unknown };

export type Pedido = { metodo: string; ruta: string; cuerpo: unknown };

export function simularApi(rutas: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)>): Pedido[] {
  const pedidos: Pedido[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, opciones: RequestInit = {}) => {
    const metodo = (opciones.method ?? 'GET').toUpperCase();
    const ruta = url.split('?')[0];
    const cuerpo = opciones.body ? JSON.parse(String(opciones.body)) : undefined;
    pedidos.push({ metodo, ruta, cuerpo });
    const definida = rutas[`${metodo} ${ruta}`];
    const respuesta = typeof definida === 'function' ? definida(cuerpo) : definida;
    if (!respuesta) {
      return new Response(JSON.stringify({ codigo: 'NO_ENCONTRADO', mensajeParaUsuario: 'No existe' }), { status: 404 });
    }
    return new Response(respuesta.cuerpo === undefined ? null : JSON.stringify(respuesta.cuerpo), { status: respuesta.status ?? 200 });
  }));
  return pedidos;
}

// Error de la API con su codigo y mensaje, como ErrorResponseDTO
export function error(status: number, codigo: string, mensajeParaUsuario: string): Respuesta {
  return { status, cuerpo: { codigo, mensajeParaUsuario, status: `${status}` } };
}

// Datos de ejemplo: un proyecto con sus cuatro tableros y los estados del principal
export const PROYECTO = {
  uuid: 'p1', nombre: 'Shiro', prefijo: 'SHI', descripcion: null,
  tableros: [
    { uuid: 't1', tipoTableroUuid: 'tt1', tipoTableroCodigo: 'PRINCIPAL', tipoTableroNombre: 'Principal' },
    { uuid: 't2', tipoTableroUuid: 'tt2', tipoTableroCodigo: 'QA', tipoTableroNombre: 'QA' },
  ],
};

export const TIPOS_DE_TABLERO = [
  { uuid: 'tt1', codigo: 'PRINCIPAL', nombre: 'Principal', orden: 1, estados: [
    { uuid: 'e1', nombre: 'Por hacer', orden: 1, inicial: true, terminado: false },
    { uuid: 'e2', nombre: 'En curso', orden: 2, inicial: false, terminado: false },
    { uuid: 'e5', nombre: 'Hecho', orden: 5, inicial: false, terminado: true },
  ] },
  { uuid: 'tt2', codigo: 'QA', nombre: 'QA', orden: 2, estados: [
    { uuid: 'q1', nombre: 'Por probar', orden: 1, inicial: true, terminado: false },
  ] },
];

export const TIPOS_DE_TAREA = [
  { uuid: 'y1', codigo: 'EPICA', nombre: 'Épica', nivel: 1 },
  { uuid: 'y2', codigo: 'HISTORIA', nombre: 'Historia', nivel: 2 },
  { uuid: 'y3', codigo: 'TAREA', nombre: 'Tarea', nivel: 2 },
  { uuid: 'y4', codigo: 'BUG', nombre: 'Bug', nivel: 2 },
  { uuid: 'y5', codigo: 'SUBTAREA', nombre: 'Subtarea', nivel: 3 },
];

export function tarea(clave: string, titulo: string, estadoUuid: string, extra: Record<string, unknown> = {}) {
  return { uuid: `u-${clave}`, clave, titulo, estadoUuid, tipoCodigo: 'TAREA', prioridad: 'MEDIA', puntos: null,
    responsableNombre: null, ...extra };
}

export function pagina<T>(contenido: T[]) {
  return { contenido, totalDeElementos: contenido.length, pagina: 1, tamano: 500 };
}
