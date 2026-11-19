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
