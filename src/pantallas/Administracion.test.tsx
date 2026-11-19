// T6.5: administración de usuarios y grupos (prototipos "Administración · usuarios", "Administración · grupos",
// "Crear cuenta de Shiro" y "Nuevo grupo"). Solo para el super admin y los Administradores.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROYECTO, TIPOS_DE_TABLERO, simularApi, type Respuesta } from '../pruebas/api';
import { Administracion } from './Administracion';
import { ADMINISTRADOR, GRUPOS, SUPER_ADMIN, USUARIOS } from './administracion/datosDePrueba';

function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}) {
  return simularApi({
    'GET /api/usuario/administracion': { cuerpo: USUARIOS },
    'POST /api/rol/paginar': { cuerpo: { contenido: GRUPOS } },
    ...extra,
  });
}

function mostrar(usuario = SUPER_ADMIN) {
  render(<Administracion usuario={usuario} proyectos={[PROYECTO]} tiposDeTablero={TIPOS_DE_TABLERO} alCrearProyecto={vi.fn()}
    alCambiarProyectos={vi.fn()} />);
}

describe('Administracion · usuarios', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lista las personas con su ingreso, sus grupos y su estado, filtra y muestra los archivados', async () => {
    api();
    mostrar();

    const tabla = await screen.findByRole('table', { name: 'Usuarios' });
    expect(within(tabla).getByRole('row', { name: /Martina Ferreyra Super admin martina.ferreyra@blueopendata.com Google/ })).toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /Tomás Aguirre .* Google Administradores Programadores Activo/ })).toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /Rocío Villalba .* Cuenta de Shiro QA Activo/ })).toBeInTheDocument();
    expect(within(tabla).queryByText('Pablo Medina')).not.toBeInTheDocument();
    expect(within(tabla).queryByRole('button', { name: 'Grupos de Martina Ferreyra' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar archivados' }));
    expect(within(tabla).getByRole('row', { name: /Pablo Medina .* Archivado/ })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Grupo'), { target: { value: 'gQ' } });
    expect(within(tabla).getAllByRole('row')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Grupo'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'benitez' } });
    expect(within(tabla).getByText('Lucas Benítez')).toBeInTheDocument();
    expect(within(tabla).getAllByRole('row')).toHaveLength(2);
  });

  it('crea una cuenta de Shiro con su contraseña inicial y sus grupos', async () => {
    const pedidos = api({
      'POST /api/usuario/guardar': (cuerpo) => ({ cuerpo: { uuid: 'u9', ...(cuerpo as object) } }),
      'POST /api/usuario/u9/grupos': { cuerpo: [] },
    });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Cuenta de Shiro' }));
    const modal = screen.getByRole('dialog', { name: 'Crear cuenta de Shiro' });
    fireEvent.change(within(modal).getByLabelText('Nombre y apellido'), { target: { value: 'Ana Externa' } });
    fireEvent.change(within(modal).getByLabelText('Correo'), { target: { value: 'ana@proveedor.com' } });
    fireEvent.click(within(modal).getByRole('checkbox', { name: 'QA' }));
    const contrasena = (within(modal).getByLabelText('Contraseña inicial') as HTMLInputElement).value;
    expect(contrasena.length).toBeGreaterThanOrEqual(14);
    expect(within(modal).queryByRole('checkbox', { name: 'Administradores' })).not.toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Se creó la cuenta de Ana Externa. Compartí la contraseña por un canal seguro.')).toBeInTheDocument();
    expect(pedidos.find((p) => p.ruta === '/api/usuario/guardar')?.cuerpo).toEqual({
      nombre: 'Ana Externa', nombreDeUsuario: 'ana@proveedor.com', email: 'ana@proveedor.com', contrasena,
    });
    expect(pedidos.find((p) => p.ruta === '/api/usuario/u9/grupos')?.cuerpo).toEqual({ grupos: ['gQ'] });
  });

  it('cambia los grupos de una persona', async () => {
    const pedidos = api({ 'POST /api/usuario/u2/grupos': { cuerpo: [] } });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Grupos de Lucas Benítez' }));
    const modal = screen.getByRole('dialog', { name: 'Grupos de Lucas Benítez' });
    expect(within(modal).getByRole('checkbox', { name: 'Programadores' })).toBeChecked();
    fireEvent.click(within(modal).getByRole('checkbox', { name: 'QA' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/usuario/u2/grupos')?.cuerpo).toEqual({ grupos: ['gP', 'gQ'] }));
  });

  it('archiva y restaura una persona', async () => {
    const pedidos = api({ 'POST /api/usuario/u2/archivar': { cuerpo: {} }, 'POST /api/usuario/u4/restaurar': { cuerpo: {} } });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Archivar Lucas Benítez' }));
    const modal = screen.getByRole('dialog', { name: 'Archivar usuario' });
    expect(within(modal).getByText(/no puede ingresar, sus tokens se revocan y sus tareas conservan el responsable/)).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Archivar' }));
    expect(await screen.findByText('Se archivó a Lucas Benítez.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar archivados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar Pablo Medina' }));
    await waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/usuario/u4/restaurar')).toBe(true));
    expect(pedidos.some((p) => p.ruta === '/api/usuario/u2/archivar')).toBe(true);
  });

  it('un Administrador no administra al super admin ni a otros Administradores, ni suma al grupo Administradores', async () => {
    api();
    mostrar(ADMINISTRADOR);

    await screen.findByRole('table', { name: 'Usuarios' });
    expect(screen.queryByRole('button', { name: 'Grupos de Martina Ferreyra' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archivar Tomás Aguirre' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grupos de Lucas Benítez' }));
    expect(within(screen.getByRole('dialog')).getByRole('checkbox', { name: 'Administradores' })).toBeDisabled();
  });
});

describe('Administracion · grupos', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lista los grupos con cuántas personas tienen, y suma y saca personas', async () => {
    const pedidos = api({ 'POST /api/usuario/u3/grupos': { cuerpo: [] }, 'POST /api/usuario/u2/grupos': { cuerpo: [] } });
    mostrar();

    fireEvent.click(await screen.findByRole('tab', { name: 'Grupos (3)' }));
    expect(screen.getByRole('button', { name: 'Administradores 1 persona' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Programadores 2 personas' }));
    const detalle = screen.getByRole('region', { name: 'Programadores' });
    expect(within(detalle).getByText('Tomás Aguirre')).toBeInTheDocument();

    fireEvent.change(within(detalle).getByLabelText('Sumar persona'), { target: { value: 'u3' } });
    fireEvent.click(within(detalle).getByRole('button', { name: 'Sumar' }));
    await waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/usuario/u3/grupos')?.cuerpo).toEqual({ grupos: ['gQ', 'gP'] }));

    fireEvent.click(within(detalle).getByRole('button', { name: 'Sacar a Lucas Benítez' }));
    await waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/usuario/u2/grupos')?.cuerpo).toEqual({ grupos: [] }));
  });

  it('el grupo Administradores es del sistema: solo el super admin suma personas', async () => {
    api();
    mostrar(ADMINISTRADOR);

    fireEvent.click(await screen.findByRole('tab', { name: 'Grupos (3)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Administradores 1 persona' }));
    const detalle = screen.getByRole('region', { name: 'Administradores' });
    expect(within(detalle).getByText('Grupo del sistema')).toBeInTheDocument();
    expect(within(detalle).queryByLabelText('Sumar persona')).not.toBeInTheDocument();
    expect(within(detalle).queryByRole('button', { name: /Archivar grupo/ })).not.toBeInTheDocument();
  });

  it('crea un grupo con sus personas y archiva un grupo', async () => {
    const pedidos = api({
      'POST /api/rol/guardar': (cuerpo) => ({ cuerpo: { uuid: 'gE', ...(cuerpo as object) } }),
      'POST /api/usuario/u3/grupos': { cuerpo: [] },
      'POST /api/rol/gQ/archivar': { cuerpo: {} },
    });
    mostrar();

    fireEvent.click(await screen.findByRole('tab', { name: 'Grupos (3)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo grupo' }));
    const modal = screen.getByRole('dialog', { name: 'Nuevo grupo' });
    fireEvent.change(within(modal).getByLabelText('Nombre'), { target: { value: 'Externos' } });
    fireEvent.change(within(modal).getByLabelText('Sumar persona'), { target: { value: 'u3' } });
    expect(within(modal).getByText('Rocío Villalba')).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Crear grupo' }));

    await waitFor(() => expect(pedidos.find((p) => p.ruta === '/api/usuario/u3/grupos')?.cuerpo).toEqual({ grupos: ['gQ', 'gE'] }));
    expect(pedidos.find((p) => p.ruta === '/api/rol/guardar')?.cuerpo).toEqual({ nombre: 'Externos', permisos: [] });

    fireEvent.click(screen.getByRole('button', { name: 'QA 1 persona' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archivar grupo QA' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Archivar grupo' })).getByRole('button', { name: 'Archivar' }));
    await waitFor(() => expect(pedidos.some((p) => p.ruta === '/api/rol/gQ/archivar')).toBe(true));
  });
});
