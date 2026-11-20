// T6.4: tokens de acceso personales para MCP: listar, generar (se muestra una sola vez) y revocar (prototipos
// "Tokens MCP" y "Generar token").
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { error, simularApi, type Respuesta } from '../pruebas/api';
import { Tokens } from './Tokens';

const TOKENS = [
  { uuid: 'k1', nombre: 'Claude Code · escritorio', activo: true, fechaDeCreacion: '2026-11-02T10:00:00.000-03:00', fechaDeRevocacion: null,
    ultimoUso: '2026-11-18T15:40:00.000-03:00' },
  { uuid: 'k0', nombre: 'Agente de pruebas', activo: false, fechaDeCreacion: '2026-10-20T10:00:00.000-03:00', fechaDeRevocacion: '2026-10-29T09:12:00.000-03:00',
    ultimoUso: null },
];

function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}) {
  return simularApi({ 'GET /api/usuario/mis-tokens': { cuerpo: TOKENS }, ...extra });
}

describe('Tokens', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lista los tokens y explica cómo conectar el LLM', async () => {
    api();
    render(<Tokens nombreDelUsuario="Martina Ferreyra" />);

    const tabla = await screen.findByRole('table', { name: 'Tokens' });
    expect(within(tabla).getByRole('row', { name: /Claude Code · escritorio 02\/11\/2026 18\/11\/2026 15:40 Activo/ })).toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /Agente de pruebas 20\/10\/2026 — Revocado el 29\/10\/2026/ })).toBeInTheDocument();
    expect(within(tabla).queryByRole('button', { name: 'Revocar Agente de pruebas' })).not.toBeInTheDocument();
    expect(screen.getByText(/Sus cambios quedan como «Martina Ferreyra \(vía MCP\)»/)).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/api/mcp`)).toBeInTheDocument();
  });

  it('generar un token lo muestra una sola vez para copiarlo', async () => {
    const pedidos = api({ 'POST /api/usuario/crear-token': (cuerpo) => ({ cuerpo: { uuid: 'k2', ...(cuerpo as object), activo: 1, codigo: 'shiro_pat_abc123' } }) });
    const escribir = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: escribir } });
    render(<Tokens nombreDelUsuario="Martina Ferreyra" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Generar token' }));
    const dialogo = screen.getByRole('dialog', { name: 'Generar token MCP' });
    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: 'Claude · notebook' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Generar token' }));

    expect(await screen.findByText('Token «Claude · notebook» generado. Copialo ahora: no se vuelve a mostrar.')).toBeInTheDocument();
    expect(screen.getByText('shiro_pat_abc123')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    await vi.waitFor(() => expect(escribir).toHaveBeenCalledWith('shiro_pat_abc123'));
    expect(pedidos.find((p) => p.ruta === '/api/usuario/crear-token')?.cuerpo).toEqual({ nombre: 'Claude · notebook' });
  });

  it('un nombre repetido muestra el error', async () => {
    api({ 'POST /api/usuario/crear-token': error(400, 'TOKEN_NOMBRE_DUPLICADO', 'Ya tenés un token con ese nombre.') });
    render(<Tokens nombreDelUsuario="Martina Ferreyra" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Generar token' }));
    const dialogo = screen.getByRole('dialog', { name: 'Generar token MCP' });
    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: 'Claude Code · escritorio' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Generar token' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Ya tenés un token con ese nombre.');
  });

  it('revocar pide confirmación y vuelve a leer la lista', async () => {
    const pedidos = api({ 'DELETE /api/usuario/borrar-token/k1': { cuerpo: {} } });
    render(<Tokens nombreDelUsuario="Martina Ferreyra" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Revocar Claude Code · escritorio' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Revocar token' })).getByRole('button', { name: 'Revocar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Se revocó «Claude Code · escritorio». Deja de funcionar al instante.');
    expect(pedidos.some((p) => p.metodo === 'DELETE' && p.ruta === '/api/usuario/borrar-token/k1')).toBe(true);
    expect(pedidos.filter((p) => p.ruta === '/api/usuario/mis-tokens').length).toBe(2);
  });
});
