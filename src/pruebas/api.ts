// Doble de la API para las pruebas: reemplaza fetch y responde segun "METODO /api/ruta". Guarda cada pedido con su
// cuerpo para verificar que mando el front. Una ruta sin respuesta responde 404.
import { vi } from 'vitest';
import type { TareaDetalleDTO } from '../api/tipos';

export type Respuesta = { status?: number; cuerpo?: unknown; texto?: string };

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
    if (respuesta.texto !== undefined) {
      return new Response(respuesta.texto, { status: respuesta.status ?? 200, headers: { 'Content-Type': 'text/markdown' } });
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

// Detalle completo de una tarea (GET /tarea/uuid/{uuid})
export function tareaDetalle(extra: Record<string, unknown> = {}): TareaDetalleDTO {
  return {
    uuid: 'u-SHI-149', clave: 'SHI-149', titulo: 'Clave duplicada al crear dos tareas a la vez', tipoCodigo: 'BUG', tipoNombre: 'Bug',
    descripcion: 'Si dos personas crean una tarea a la vez, reciben la misma clave.', estadoUuid: 'e2', estadoNombre: 'En curso',
    prioridad: 'MAS_ALTA', puntos: 3, tableroUuid: 't1', tableroCodigo: 'PRINCIPAL', proyectoUuid: 'p1',
    responsableUuid: 'us1', responsableNombre: 'Lucas Benítez', informanteUuid: 'us2', informanteNombre: 'Carla Domínguez',
    padreUuid: null, padreClave: null, sprintUuid: 's14', sprintNombre: 'Sprint 14', vencimiento: '2026-11-20',
    etiquetas: [{ texto: 'claves' }, { texto: 'concurrencia' }], versiones: [{ versionUuid: 'v1', nombre: '1.0.0', estado: 'SIN_PUBLICAR' }],
    hijas: [
      { uuid: 'u-SHI-152', clave: 'SHI-152', titulo: 'Secuencia por proyecto', tipoCodigo: 'SUBTAREA', estadoNombre: 'Hecho' },
      { uuid: 'u-SHI-153', clave: 'SHI-153', titulo: 'Prueba de concurrencia', tipoCodigo: 'SUBTAREA', estadoNombre: 'En curso' },
    ],
    fechaDeCreacion: '2026-11-18T11:05:00.000-03:00', fechaDeActualizacion: '2026-11-18T15:42:00.000-03:00', version: 7,
    ...extra,
  } as TareaDetalleDTO;
}

export const RELACIONES = [
  { uuid: 'r1', vinculo: 'CLONADA_DE', tareaUuid: 'u-SHI-147', tareaClave: 'SHI-147', tareaTitulo: 'Dos tareas con la misma clave',
    tareaEstadoNombre: 'Probando', tareaArchivada: false },
  { uuid: 'r2', vinculo: 'BLOQUEA', tareaUuid: 'u-SHI-128', tareaClave: 'SHI-128', tareaTitulo: 'Importar sprints',
    tareaEstadoNombre: 'En curso', tareaArchivada: false },
];

export const COMENTARIOS = [
  { uuid: 'c1', tareaUuid: 'u-SHI-149', cuerpo: 'Se reproduce 3 de cada 10 veces.', autorNombre: 'Carla Domínguez', canal: 'WEB',
    fecha: '2026-11-18T11:06:00.000-03:00' },
  { uuid: 'c2', tareaUuid: 'u-SHI-149', cuerpo: 'Cambio la generación de claves.', autorNombre: 'Lucas Benítez', canal: 'MCP',
    fecha: '2026-11-18T15:41:00.000-03:00' },
];

export const HISTORIAL = [
  { uuid: 'h1', accion: 'MOVER', campo: 'estado', valorAnterior: 'Por hacer', valorNuevo: 'En curso', canal: 'WEB',
    usuarioNombre: 'Lucas Benítez', fechaDeCreacion: '2026-11-18T15:42:00.000-03:00' },
  { uuid: 'h2', accion: 'EDITAR', campo: 'puntos', valorAnterior: null, valorNuevo: '3', canal: 'MCP',
    usuarioNombre: 'Lucas Benítez', fechaDeCreacion: '2026-11-18T15:40:00.000-03:00' },
];

export const USUARIO = { uuid: 'us1', nombreDeUsuario: 'lucas', email: null };

// Usuarios con acceso al proyecto (GET /proyecto/{uuid}/usuarios)
export const USUARIOS_DEL_PROYECTO = [
  { uuid: 'us2', nombreDeUsuario: 'carla', nombre: 'Carla Domínguez' },
  { uuid: 'us1', nombreDeUsuario: 'lucas', nombre: 'Lucas Benítez' },
  { uuid: 'us3', nombreDeUsuario: 'sinnombre', nombre: null },
];

// Sprints del proyecto (POST /sprint/paginar)
export const SPRINTS = [
  { uuid: 's13', nombre: 'Sprint 13', estado: 'CERRADO', inicio: '2026-10-26', fin: '2026-11-06', proyectoUuid: 'p1' },
  { uuid: 's14', nombre: 'Sprint 14', estado: 'ACTIVO', inicio: '2026-11-09', fin: '2026-11-20', proyectoUuid: 'p1' },
  { uuid: 's15', nombre: 'Sprint 15', estado: 'PLANIFICADO', inicio: '2026-11-23', fin: '2026-12-04', proyectoUuid: 'p1' },
];

// Tarea de un sprint o del backlog, con su tablero
export function tareaDePlan(clave: string, titulo: string, extra: Record<string, unknown> = {}) {
  return { uuid: `u-${clave}`, clave, titulo, estadoUuid: 'e1', estadoNombre: 'Por hacer', tipoCodigo: 'TAREA', prioridad: 'MEDIA',
    puntos: null, responsableNombre: null, tableroCodigo: 'PRINCIPAL', tableroUuid: 't1', ...extra };
}

// Versiones del proyecto (POST /version/paginar)
export const VERSIONES = [
  { uuid: 'v10', nombre: '1.0.0', estado: 'SIN_PUBLICAR', fechaDePublicacion: null, proyectoUuid: 'p1', cantidadDeTareas: 3, publicadaPorNombre: null },
  { uuid: 'v09', nombre: '0.9.0', estado: 'PUBLICADA', fechaDePublicacion: '2026-10-30', proyectoUuid: 'p1', cantidadDeTareas: 27,
    publicadaPorNombre: 'Martina Ferreyra' },
];

// Tareas de una version (GET /version/{uuid}/tareas)
export const TAREAS_DE_VERSION = [
  { uuid: 'u-SHI-104', clave: 'SHI-104', titulo: 'Ingreso con Google', tipoCodigo: 'HISTORIA', tipoNombre: 'Historia',
    tableroCodigo: 'PRINCIPAL', estadoNombre: 'Hecho', terminada: true },
  { uuid: 'u-SHI-118', clave: 'SHI-118', titulo: 'Columnas fijas', tipoCodigo: 'TAREA', tipoNombre: 'Tarea',
    tableroCodigo: 'PRINCIPAL', estadoNombre: 'En curso', terminada: false },
  { uuid: 'u-SHI-098', clave: 'SHI-098', titulo: 'Token revocado', tipoCodigo: 'BUG', tipoNombre: 'Bug',
    tableroCodigo: 'QA', estadoNombre: 'Aprobado', terminada: true },
];

// Simula una pantalla de telefono (max-width 760px) para las pruebas de la version movil (T6.6)
export function simularTelefono() {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: true, media: consulta, onchange: null,
    addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}
