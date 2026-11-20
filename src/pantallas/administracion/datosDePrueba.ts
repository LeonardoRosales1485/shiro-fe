// Datos de ejemplo de la administracion para las pruebas (T6.5): usuarios con sus grupos y los grupos.
const DESDE = '2026-09-02T10:00:00.000-03:00';

export const GRUPOS = [
  { uuid: 'gS', nombre: 'SYSADMIN' },
  { uuid: 'gA', nombre: 'ADMIN' },
  { uuid: 'gP', nombre: 'Programadores' },
  { uuid: 'gQ', nombre: 'QA' },
];

function grupo(uuid: string) {
  const elegido = GRUPOS.find((g) => g.uuid === uuid);
  return { uuid, nombre: elegido?.nombre ?? uuid, desde: DESDE };
}

export const USUARIOS = [
  { uuid: 'u0', nombre: 'Martina Ferreyra', nombreDeUsuario: 'martina.ferreyra@blueopendata.com', email: 'martina.ferreyra@blueopendata.com',
    cuentaDeShiro: false, archivado: false, grupos: [grupo('gS')] },
  { uuid: 'u1', nombre: 'Tomás Aguirre', nombreDeUsuario: 'tomas.aguirre@blueopendata.com', email: 'tomas.aguirre@blueopendata.com',
    cuentaDeShiro: false, archivado: false, grupos: [grupo('gA'), grupo('gP')] },
  { uuid: 'u2', nombre: 'Lucas Benítez', nombreDeUsuario: 'lucas.benitez@blueopendata.com', email: 'lucas.benitez@blueopendata.com',
    cuentaDeShiro: false, archivado: false, grupos: [grupo('gP')] },
  { uuid: 'u3', nombre: 'Rocío Villalba', nombreDeUsuario: 'rocio.villalba@consultora-ext.com', email: 'rocio.villalba@consultora-ext.com',
    cuentaDeShiro: true, archivado: false, grupos: [grupo('gQ')] },
  { uuid: 'u4', nombre: 'Pablo Medina', nombreDeUsuario: 'pablo.medina@blueopendata.com', email: 'pablo.medina@blueopendata.com',
    cuentaDeShiro: false, archivado: true, grupos: [grupo('gP')] },
];

export const SUPER_ADMIN = { uuid: 'u0', nombreDeUsuario: 'martina.ferreyra@blueopendata.com', email: null, nombre: 'Martina Ferreyra' };

export const ADMINISTRADOR = { uuid: 'u1', nombreDeUsuario: 'tomas.aguirre@blueopendata.com', email: null, nombre: 'Tomás Aguirre' };
