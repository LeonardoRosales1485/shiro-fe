// Tipos y reglas compartidas de la administracion (T6.5): usuarios con sus grupos (GET /usuario/administracion),
// grupos (roles del Core) y los nombres visibles de los grupos del sistema.
import { pedir } from '../../api/cliente';

export type GrupoDeUsuario = { uuid: string; nombre: string; desde: string | null };

export type UsuarioAdministrado = {
  uuid: string;
  nombre: string | null;
  nombreDeUsuario: string;
  email: string | null;
  cuentaDeShiro: boolean;
  archivado: boolean;
  grupos: GrupoDeUsuario[];
};

export type Grupo = { uuid: string; nombre: string };

// Nombres de los grupos del sistema: el super admin y los Administradores
export const SUPER_ADMIN = 'SYSADMIN';

export const ADMINISTRADORES = 'ADMIN';

// Nombre visible de un grupo
export function nombreDeGrupo(nombre: string): string {
  if (nombre === SUPER_ADMIN) return 'Super admin';
  if (nombre === ADMINISTRADORES) return 'Administradores';
  return nombre;
}

// Nombre visible de una persona
export function nombreDePersona(usuario: { nombre: string | null; nombreDeUsuario: string }): string {
  return usuario.nombre || usuario.nombreDeUsuario;
}

export function tieneGrupo(usuario: UsuarioAdministrado, nombre: string): boolean {
  return usuario.grupos.some((g) => g.nombre === nombre);
}

// Si quien administra puede cambiar a esta persona: nadie toca al super admin, y solo el super admin toca a los
// Administradores (ProteccionDeAdministradores del backend)
export function puedeAdministrar(usuario: UsuarioAdministrado, soySuperAdmin: boolean): boolean {
  if (tieneGrupo(usuario, SUPER_ADMIN)) return false;
  return soySuperAdmin || !tieneGrupo(usuario, ADMINISTRADORES);
}

// Reemplaza los grupos de una persona (POST /usuario/{uuid}/grupos)
export function asignarGrupos(uuid: string, grupos: string[]): Promise<unknown> {
  return pedir('POST', `/usuario/${uuid}/grupos`, { grupos });
}

// Uuids de los grupos de una persona
export function uuidsDeGrupos(usuario: UsuarioAdministrado): string[] {
  return usuario.grupos.map((g) => g.uuid);
}

// Texto de una cantidad de personas
export function personas(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'persona' : 'personas'}`;
}

// Datos y acciones que la administracion pasa a las pestañas de usuarios y grupos
export type PropsDePestana = {
  usuarios: UsuarioAdministrado[];
  grupos: Grupo[];
  soySuperAdmin: boolean;
  ejecutar: (accion: () => Promise<unknown>, mensaje: string | null) => Promise<void>;
  avisar: (mensaje: string) => void;
};
