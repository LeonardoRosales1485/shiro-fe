// Presentacion de tipos de tarea, prioridades y tableros: icono, tono y textos, como en el prototipo.
import type { Prioridad } from '../api/tipos';
import type { NombreDeIcono } from './Icono';

export const TIPOS: Record<string, { icono: NombreDeIcono; tono: string }> = {
  EPICA: { icono: 'epica', tono: 'is-violet' },
  HISTORIA: { icono: 'historia', tono: 'is-success' },
  TAREA: { icono: 'tarea', tono: 'is-info' },
  BUG: { icono: 'bug', tono: 'is-danger' },
  SUBTAREA: { icono: 'subtarea', tono: 'is-slate' },
};

export const PRIORIDADES: Record<Prioridad, { nombre: string; icono: NombreDeIcono; color: string }> = {
  MAS_ALTA: { nombre: 'Más alta', icono: 'dobleArriba', color: 'var(--danger-text)' },
  ALTA: { nombre: 'Alta', icono: 'arriba', color: 'var(--warning-text)' },
  MEDIA: { nombre: 'Media', icono: 'igual', color: 'var(--info-text)' },
  BAJA: { nombre: 'Baja', icono: 'abajo', color: 'var(--neutral-text)' },
  MAS_BAJA: { nombre: 'Más baja', icono: 'dobleAbajo', color: 'var(--neutral-text)' },
};

// Orden de las prioridades en los selectores (Media primero, como el prototipo)
export const ORDEN_DE_PRIORIDADES: Prioridad[] = ['MEDIA', 'MAS_ALTA', 'ALTA', 'BAJA', 'MAS_BAJA'];

export const ICONOS_DE_TABLERO: Record<string, NombreDeIcono> = {
  PRINCIPAL: 'huella',
  QA: 'bug',
  ANALISIS: 'documento',
  DISENO: 'lapiz',
};

// Titulo de la pagina de un tablero: "Tablero principal" o el nombre del sub-tablero
export function tituloDeTablero(codigo: string, nombre: string): string {
  return codigo === 'PRINCIPAL' ? 'Tablero principal' : nombre;
}

// Iniciales para el avatar (hasta dos letras)
export function iniciales(nombre: string): string {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0].toUpperCase()).join('');
}

// Texto de cada vinculo de una relacion, visto desde la tarea que se muestra
export const VINCULOS: Record<string, string> = {
  BLOQUEA: 'Bloquea',
  BLOQUEADA_POR: 'Está bloqueada por',
  RELACIONA: 'Se relaciona con',
  DUPLICA: 'Duplica',
  DUPLICADA_POR: 'Está duplicada por',
  CLONADA_EN: 'Clonada en',
  CLONADA_DE: 'Clonada de',
};

// Nombre de cada campo en el historial ("cambió el estado")
const CAMPOS: Record<string, string> = {
  titulo: 'el título', descripcion: 'la descripción', estado: 'el estado', prioridad: 'la prioridad', puntos: 'la estimación',
  responsable: 'el responsable', informante: 'el informante', etiquetas: 'las etiquetas', vencimiento: 'el vencimiento',
  sprint: 'el sprint', version: 'las versiones', tipo: 'el tipo', padre: 'la tarea padre',
};

// Frase de una fila del historial, sin el autor: "cambió el estado", "comentó", "creó la subtarea SHI-153"
export function fraseDeHistorial(accion: string, campo: string | null, valorNuevo: string | null): string {
  switch (accion) {
    case 'CREAR': return 'creó la tarea';
    case 'CREAR_SUBTAREA': return `creó la subtarea ${valorNuevo ?? ''}`.trim();
    case 'COMENTAR': return 'comentó';
    case 'ARCHIVAR': return 'archivó la tarea';
    case 'RESTAURAR': return 'restauró la tarea';
    case 'RELACIONAR': return 'cambió las relaciones';
    case 'CLONAR': return 'clonó la tarea';
    case 'ORDENAR_BACKLOG': return 'reordenó el backlog';
    default: return `cambió ${campo ? (CAMPOS[campo] ?? campo) : 'la tarea'}`;
  }
}

// Acciones del historial que muestran el cambio "antes → después"
export const ACCIONES_CON_CAMBIO = ['EDITAR', 'MOVER'];

// Fecha ISO del backend como dd/mm/aaaa, y con hora si se pide (siempre en GMT-3, como la manda el backend)
export function fecha(iso: string | null, conHora = false): string {
  if (!iso) return '';
  const [dia, hora = ''] = iso.split('T');
  const [anio, mes, d] = dia.split('-');
  return conHora && hora ? `${d}/${mes}/${anio} ${hora.slice(0, 5)}` : `${d}/${mes}/${anio}`;
}

// Nombre del autor con la marca de MCP, como en el prototipo
export function autor(nombre: string | null, canal: string | null): string {
  const base = nombre ?? 'Alguien';
  return canal === 'MCP' ? `${base} (vía MCP)` : base;
}

// Nombre del tablero de un proyecto por su codigo (Principal, QA...), o el codigo si no esta
export function nombreDeTablero(tableros: { tipoTableroCodigo: string; tipoTableroNombre: string }[], codigo: string | null): string {
  return tableros.find((t) => t.tipoTableroCodigo === codigo)?.tipoTableroNombre ?? codigo ?? '';
}

// Uuids de los estados terminados de todos los tipos de tablero (Hecho, Aprobado...)
export function estadosTerminados(tipos: { estados: { uuid: string; terminado: boolean }[] }[]): Set<string> {
  return new Set(tipos.flatMap((t) => t.estados.filter((e) => e.terminado).map((e) => e.uuid)));
}

// Hoy en GMT-3 como aaaa-mm-dd (para los campos de fecha)
export function hoy(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
}
