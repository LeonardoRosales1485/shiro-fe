// Tipos de los DTO del backend que usa el front (contrato en shiro-be/docs/api/openapi.yaml).

export type UsuarioDTO = { uuid: string; nombreDeUsuario: string; email: string | null };

export type TableroDTO = { uuid: string; tipoTableroUuid: string; tipoTableroCodigo: string; tipoTableroNombre: string };

export type ProyectoDTO = { uuid: string; nombre: string; prefijo: string; descripcion: string | null; tableros: TableroDTO[] };

export type EstadoDTO = { uuid: string; nombre: string; orden: number; inicial: boolean; terminado: boolean };

export type TipoTableroDTO = { uuid: string; codigo: string; nombre: string; orden: number; estados: EstadoDTO[] };

export type TipoTareaDTO = { uuid: string; codigo: string; nombre: string; nivel: number };

export type Prioridad = 'MAS_ALTA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'MAS_BAJA';

export type TareaDTO = {
  uuid: string;
  clave: string;
  titulo: string;
  estadoUuid: string;
  tipoCodigo: string;
  prioridad: Prioridad;
  puntos: number | null;
  responsableNombre: string | null;
};

export type Pagina<T> = { contenido: T[] };

export type Filtro = { campo: string; operacion: string; valor: string };

// Pedido de POST /{recurso}/paginar (las paginas empiezan en 1)
export function pedidoDePaginado(filtros: Filtro[], campoDeOrden: string, tamano = 500) {
  return { pagina: 1, tamano, filtros: filtros.length ? [filtros] : [], ordenes: [{ campo: campoDeOrden, direccion: 'asc' }] };
}

export type TareaHijaDTO = { uuid: string; clave: string; titulo: string; tipoCodigo: string; estadoNombre: string | null };

// Detalle completo de una tarea (GET /tarea/uuid/{uuid}); los campos sin "Uuid" de las relaciones son de solo lectura
export type TareaDetalleDTO = {
  uuid: string;
  clave: string;
  titulo: string;
  tipoCodigo: string;
  tipoNombre: string | null;
  descripcion: string | null;
  estadoUuid: string;
  estadoNombre: string | null;
  prioridad: Prioridad;
  puntos: number | null;
  tableroUuid: string;
  tableroCodigo: string | null;
  proyectoUuid: string | null;
  responsableUuid: string | null;
  responsableNombre: string | null;
  informanteUuid: string | null;
  informanteNombre: string | null;
  padreUuid: string | null;
  padreClave: string | null;
  sprintUuid: string | null;
  sprintNombre: string | null;
  vencimiento: string | null;
  etiquetas: { texto: string }[] | null;
  versiones: { versionUuid: string; nombre: string; estado: string }[] | null;
  hijas: TareaHijaDTO[] | null;
  fechaDeCreacion: string | null;
  fechaDeActualizacion: string | null;
};

export type Canal = 'WEB' | 'MCP' | 'IMPORTACION';

export type ComentarioDTO = { uuid: string; tareaUuid: string; cuerpo: string; autorNombre: string | null; canal: Canal | null; fecha: string | null };

export type HistorialDTO = {
  uuid: string;
  accion: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  canal: Canal | null;
  usuarioNombre: string | null;
  fechaDeCreacion: string | null;
};

// Como ve esta tarea una relacion (GET /tarea/{uuid}/relaciones)
export type Vinculo = 'BLOQUEA' | 'BLOQUEADA_POR' | 'RELACIONA' | 'DUPLICA' | 'DUPLICADA_POR' | 'CLONADA_EN' | 'CLONADA_DE';

export type RelacionDeTareaDTO = {
  uuid: string;
  vinculo: Vinculo;
  tareaUuid: string;
  tareaClave: string;
  tareaTitulo: string;
  tareaEstadoNombre: string | null;
  tareaArchivada: boolean;
};

export type DatoAClonar = 'DESCRIPCION' | 'PRIORIDAD' | 'ETIQUETAS' | 'PUNTOS' | 'RESPONSABLE' | 'VERSIONES' | 'COMENTARIOS' | 'SUBTAREAS';

// Filtro por igualdad de un campo, para los paginados
export function igual(campo: string, valor: string): Filtro {
  return { campo, operacion: '=', valor };
}
