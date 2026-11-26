// T6.4: tokens de acceso personales para MCP: listar, generar (se muestra una sola vez) y revocar (prototipos
// "Tokens MCP" y "Generar token"). MJ-14: cada token vence (30, 90 o 180 días, elegidos al generarlo) y la pantalla
// avisa los que vencen en 7 días o menos.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { error, simularApi, type Respuesta } from '../pruebas/api';
import { Tokens } from './Tokens';

const TOKENS = [
  { uuid: 'k1', nombre: 'Claude Code · escritorio', activo: true, fechaDeCreacion: '2026-11-02T10:00:00.000-03:00', fechaDeRevocacion: null,
    ultimoUso: '2026-11-18T15:40:00.000-03:00', vence: '2027-01-31T10:00:00.000-03:00' },
  { uuid: 'k0', nombre: 'Agente de pruebas', activo: false, fechaDeCreacion: '2026-10-20T10:00:00.000-03:00', fechaDeRevocacion: '2026-10-29T09:12:00.000-03:00',
    ultimoUso: null, vence: '2027-01-18T10:00:00.000-03:00' },
];

// Hoy en las pruebas: 26/11/2026 al mediodía
const HOY = new Date('2026-11-26T12:00:00.000-03:00');

function api(extra: Record<string, Respuesta | ((cuerpo: unknown) => Respuesta)> = {}) {
  return simularApi({ 'GET /api/usuario/mis-tokens': { cuerpo: TOKENS }, ...extra });
}

describe('Tokens', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(HOY);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('lista los tokens y explica cómo conectar el LLM', async () => {
    api();
    render(<Tokens nombreDelUsuario="Martina Ferreyra" />);

    const tabla = await screen.findByRole('table', { name: 'Tokens' });
    expect(within(tabla).getByRole('row', { name: /Claude Code · escritorio 02\/11\/2026 18\/11\/2026 15:40 31\/01\/2027 Activo/ })).toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /Agente de pruebas 20\/10\/2026 — 18\/01\/2027 Revocado el 29\/10\/2026/ })).toBeInTheDocument();
    expect(within(tabla).queryByRole('button', { name: 'Revocar Agente de pruebas' })).not.toBeInTheDocument();
    expect(screen.getByText(/Sus cambios quedan como «Martina Ferreyra \(vía MCP\)»/)).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/api/mcp`)).toBeInTheDocument();
  });

  it('avisa los tokens activos que vencen en 7 días o menos y marca los vencidos', async () => {
    simularApi({ 'GET /api/usuario/mis-tokens': { cuerpo: [
      { ...TOKENS[0], vence: '2026-11-29T12:00:00.000-03:00' },
      { ...TOKENS[1], uuid: 'k3', nombre: 'Viejo', activo: true, fechaDeRevocacion: null, vence: '2026-11-20T10:00:00.000-03:00' },
      { ...TOKENS[0], uuid: 'k4', nombre: 'Lejano', vence: '2026-12-10T12:00:00.000-03:00' },
    ] } });
    render(<Tokens nombreDelUsuario="Martina Ferreyra" />);

    const tabla = await screen.findByRole('table', { name: 'Tokens' });
    expect(within(tabla).getByRole('row', { name: /Claude Code · escritorio .* 29\/11\/2026 Vence en 3 días/ })).toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /Viejo .* 20\/11\/2026 Vencido/ })).toBeInTheDocument();
    expect(within(tabla).queryByRole('button', { name: 'Revocar Viejo' })).not.toBeInTheDocument();
    expect(within(tabla).getByRole('row', { name: /Lejano .* 10\/12\/2026 Activo/ })).toBeInTheDocument();
    expect(screen.getByText('«Claude Code · escritorio» vence en 3 días. Generá uno nuevo y cambialo en tu cliente MCP.')).toBeInTheDocument();
    expect(screen.queryByText(/«Lejano» vence/)).not.toBeInTheDocument();
  });

  it('generar un token lo muestra una sola vez para copiarlo', async () => {
    const pedidos = api({ 'POST /api/usuario/crear-token-con-vencimiento': (cuerpo) => ({ cuerpo: { uuid: 'k2', nombre: (cuerpo as { nombre: string }).nombre,
      codigo: 'shiro_pat_abc123', vence: '2026-12-26T12:00:00.000-03:00' } }) });
    const escribir = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: escribir } });
    render(<Tokens nombreDelUsuario="Martina Ferreyra" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Generar token' }));
    const dialogo = screen.getByRole('dialog', { name: 'Generar token MCP' });
    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: 'Claude · notebook' } });
    expect(within(dialogo).getByLabelText('Vence en')).toHaveValue('90');
    fireEvent.change(within(dialogo).getByLabelText('Vence en'), { target: { value: '30' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Generar token' }));

    expect(await screen.findByText('Token «Claude · notebook» generado. Vence el 26/12/2026. Copialo ahora: no se vuelve a mostrar.')).toBeInTheDocument();
    expect(screen.getByText('shiro_pat_abc123')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    await vi.waitFor(() => expect(escribir).toHaveBeenCalledWith('shiro_pat_abc123'));
    expect(pedidos.find((p) => p.ruta === '/api/usuario/crear-token-con-vencimiento')?.cuerpo).toEqual({ nombre: 'Claude · notebook', diasDeVigencia: 30 });
  });

  it('un nombre repetido muestra el error', async () => {
    api({ 'POST /api/usuario/crear-token-con-vencimiento': error(400, 'TOKEN_NOMBRE_DUPLICADO', 'Ya tenés un token con ese nombre.') });
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
