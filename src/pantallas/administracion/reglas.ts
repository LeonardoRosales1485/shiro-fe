// Reglas de permiso por recurso (Spec 2) para la pestaña Permisos (T6.5): tipos, nombres y la misma resolucion que
// EvaluadorDeReglasDePermiso del backend, para mostrar qué hereda una persona de sus grupos.
export type Nivel = 'VER' | 'EDITAR' | 'ARCHIVAR';

export type Efecto = 'PERMITIR' | 'NEGAR';

export type ReglaDTO = {
  uuid: string;
  tipoSujeto: 'ROL' | 'USUARIO';
  rolUuid: string | null;
  usuarioUuid: string | null;
  tipoRecurso: 'PROYECTO' | 'TABLERO';
  proyectoUuid: string | null;
  tableroUuid: string | null;
  nivel: Nivel;
  efecto: Efecto;
};

export const NIVELES: Nivel[] = ['VER', 'EDITAR', 'ARCHIVAR'];

export const NOMBRES_DE_NIVEL: Record<Nivel, string> = { VER: 'Ver', EDITAR: 'Editar', ARCHIVAR: 'Archivar' };

// Verbo de cada nivel para las frases ("puede ver")
export const VERBOS_DE_NIVEL: Record<Nivel, string> = { VER: 'ver', EDITAR: 'editar', ARCHIVAR: 'archivar' };

// Alcance de una regla: el proyecto (tablero null) o uno de sus tableros
export type Alcance = { tablero: string | null; nombre: string };

// Si la regla es sobre el alcance recibido
export function esDelAlcance(regla: ReglaDTO, alcance: Alcance): boolean {
  return alcance.tablero === null ? regla.tipoRecurso === 'PROYECTO' : regla.tableroUuid === alcance.tablero;
}

// Resumen de las reglas de un sujeto sobre un alcance: niveles permitidos y negados ("Editar", "Niega Ver") o «—»
export function resumen(reglas: ReglaDTO[]): string {
  const partes = NIVELES.flatMap((nivel) => reglas.filter((r) => r.nivel === nivel)
    .map((r) => r.efecto === 'PERMITIR' ? NOMBRES_DE_NIVEL[nivel] : `Niega ${NOMBRES_DE_NIVEL[nivel]}`));
  return partes.length ? partes.join(' · ') : '—';
}

// Una regla aplica a su propio nivel; para VER tambien aplican EDITAR y ARCHIVAR, solo cuando permiten
function aplica(regla: ReglaDTO, nivel: Nivel): boolean {
  return regla.nivel === nivel || (nivel === 'VER' && regla.efecto === 'PERMITIR');
}

// Decision con las reglas de un recurso: las del usuario antes que las de sus grupos; null si ninguna aplica
function decidir(reglas: ReglaDTO[], nivel: Nivel): boolean | null {
  const aplicables = reglas.filter((r) => aplica(r, nivel));
  const delUsuario = aplicables.filter((r) => r.tipoSujeto === 'USUARIO');
  const decisivas = delUsuario.length ? delUsuario : aplicables;
  if (!decisivas.length) return null;
  return decisivas.every((r) => r.efecto !== 'NEGAR');
}

// Si las reglas permiten el nivel: primero decide el tablero (si hay) y, si no decide, el proyecto. Sin reglas, no
export function puede(reglas: ReglaDTO[], nivel: Nivel, tablero: string | null): boolean {
  if (tablero) {
    const enElTablero = decidir(reglas.filter((r) => r.tableroUuid === tablero), nivel);
    if (enElTablero !== null) return enElTablero;
  }
  return decidir(reglas.filter((r) => r.tipoRecurso === 'PROYECTO'), nivel) === true;
}
