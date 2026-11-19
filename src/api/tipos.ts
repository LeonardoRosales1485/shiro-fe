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
