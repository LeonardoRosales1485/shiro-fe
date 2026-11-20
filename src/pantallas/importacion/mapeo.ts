// Mapeo de un proyecto de Jira a Shiro (T6.5): tipos del catalogo que responde POST /importacion/conectar y los
// valores propuestos por defecto (por nombre, o por si Jira lo cuenta como terminado, o por nivel), para que el
// administrador solo corrija lo que no coincide.
import type { TipoTableroDTO, TipoTareaDTO } from '../../api/tipos';

export type ElementoDeJira = { idJira: string; nombre: string; nivel?: number | null; terminado?: boolean | null };

export type UsuarioDeJira = { correo: string | null; nombre: string; usuarioUuid: string | null };

export type Catalogo = {
  importacionUuid: string;
  nombreProyectoJira: string;
  tableros: ElementoDeJira[];
  estados: ElementoDeJira[];
  tipos: ElementoDeJira[];
  usuarios: UsuarioDeJira[];
};

// Valor de un select de estado o tipo que pide crear el elemento con el nombre de Jira
export const CREAR = 'crear';

// Nombres en ingles que usa Jira para sus tipos, con el codigo del tipo de Shiro
const TIPOS_DE_JIRA: Record<string, string> = {
  epic: 'EPICA', story: 'HISTORIA', task: 'TAREA', bug: 'BUG', subtask: 'SUBTAREA', 'sub-task': 'SUBTAREA',
};

const normal = (texto: string) => texto.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

// Tablero de Shiro propuesto: el primero de Jira va al principal, los demas no se importan hasta elegirlos
export function tableroPropuesto(indice: number, tiposDeTablero: TipoTableroDTO[]): string {
  return indice === 0 ? tiposDeTablero.find((t) => t.codigo === 'PRINCIPAL')?.uuid ?? '' : '';
}

// Estado de Shiro propuesto para un estado de Jira: el del mismo nombre; si no, el terminado si Jira lo cuenta como
// terminado; si no, el inicial del tablero
export function estadoPropuesto(estado: ElementoDeJira, tipoDeTablero: TipoTableroDTO): string {
  const estados = tipoDeTablero.estados;
  const mismoNombre = estados.find((e) => normal(e.nombre) === normal(estado.nombre));
  const terminado = estado.terminado ? estados.find((e) => e.terminado) : undefined;
  return (mismoNombre ?? terminado ?? estados.find((e) => e.inicial) ?? estados[0])?.uuid ?? '';
}

// Tipo de Shiro propuesto para un tipo de Jira: el del mismo nombre o su equivalente en ingles; si no, por nivel la
// epica y la subtarea; si no, sin importar (vacio)
export function tipoPropuesto(tipo: ElementoDeJira, tiposDeTarea: TipoTareaDTO[]): string {
  const mismoNombre = tiposDeTarea.find((t) => normal(t.nombre) === normal(tipo.nombre));
  const codigo = TIPOS_DE_JIRA[normal(tipo.nombre)] ?? (tipo.nivel === 1 ? 'EPICA' : tipo.nivel === 3 ? 'SUBTAREA' : null);
  return (mismoNombre ?? tiposDeTarea.find((t) => t.codigo === codigo))?.uuid ?? '';
}

// Resumen de una ejecucion (ImportacionDTO.resumen, JSON)
export type Resumen = {
  tareasCreadas: number;
  tareasActualizadas: number;
  tareasPorTipo: Record<string, number>;
  comentarios: number;
  sprints: number;
  versiones: number;
  fallas: { claveJira: string; motivo: string }[];
  advertencias: { claveJira: string; motivo: string }[];
  usuariosImportados: string[];
};

export type EstadoDeImportacion = 'CONECTADA' | 'MAPEADA' | 'EN_CURSO' | 'TERMINADA' | 'FALLIDA' | 'CANCELADA';

export type ImportacionDTO = {
  uuid: string;
  prefijo: string;
  claveProyectoJira?: string;
  nombreProyectoJira?: string | null;
  estado: EstadoDeImportacion;
  resumen?: string | null;
  avance?: string | null;
  cancelacionPedida?: boolean;
  fechaDeCreacion?: string | null;
  fechaDeActualizacion?: string | null;
};

export const NOMBRES_DE_ESTADO: Record<EstadoDeImportacion, string> = {
  CONECTADA: 'Conectada', MAPEADA: 'Mapeada', EN_CURSO: 'En curso', TERMINADA: 'Terminada', FALLIDA: 'Fallida', CANCELADA: 'Cancelada',
};

// Avance de una ejecucion (ImportacionDTO.avance, JSON); los totales son null hasta que se conocen
export type Avance = {
  inicio: string;
  versiones: number;
  versionesTotales: number | null;
  sprints: number;
  sprintsTotales: number | null;
  tareas: number;
  tareasTotales: number | null;
  tareasConComentariosLeidos: number;
  comentarios: number;
  comentariosTotales: number | null;
};

// Lee un JSON guardado en la importacion; null si no hay o no se puede leer
export function leerJson<T>(texto: string | null | undefined): T | null {
  try {
    return texto ? JSON.parse(texto) as T : null;
  } catch {
    return null;
  }
}

// Porcentaje hecho (0 a 100): versiones, sprints, tareas, la lectura de comentarios de cada tarea y los comentarios
export function porcentaje(avance: Avance): number {
  const totales = (avance.versionesTotales ?? 0) + (avance.sprintsTotales ?? 0) + 2 * (avance.tareasTotales ?? 0) + (avance.comentariosTotales ?? 0);
  const hechos = avance.versiones + avance.sprints + avance.tareas + avance.tareasConComentariosLeidos + avance.comentarios;
  return totales === 0 ? 0 : Math.min(99, Math.floor((hechos * 100) / totales));
}

// Minutos que faltan, estimados con lo que tardo hasta ahora; null si todavia no se puede estimar
export function minutosRestantes(avance: Avance, ahora = Date.now()): number | null {
  const hecho = porcentaje(avance);
  if (hecho <= 0) return null;
  const transcurrido = ahora - new Date(avance.inicio).getTime();
  return Math.max(1, Math.round((transcurrido * (100 - hecho)) / hecho / 60000));
}
