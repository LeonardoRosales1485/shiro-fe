// T6.1: ingreso con una cuenta de Shiro (usuario y contraseña) y con Google; los errores se muestran en la tarjeta.
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { error, simularApi } from '../pruebas/api';
import { Ingreso } from './Ingreso';

describe('Ingreso', () => {
  afterEach(() => vi.unstubAllGlobals());

  const ingresar = (usuario: string, contrasena: string) => {
    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: usuario } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: contrasena } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
  };

  it('ingresa con usuario y contraseña', async () => {
    const pedidos = simularApi({ 'POST /api/usuario/iniciar-sesion': { cuerpo: { token: 'x', refreshToken: 'y' } } });
    const alIngresar = vi.fn();
    render(<Ingreso alIngresar={alIngresar} />);

    ingresar('demo', '123');

    await vi.waitFor(() => expect(alIngresar).toHaveBeenCalled());
    expect(pedidos[0].cuerpo).toEqual({ nombreDeUsuario: 'demo', contrasena: '123' });
  });

  it('avisa si las credenciales no coinciden', async () => {
    simularApi({ 'POST /api/usuario/iniciar-sesion': error(401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas') });
    render(<Ingreso alIngresar={vi.fn()} />);

    ingresar('demo', 'otra');

    expect(await screen.findByRole('alert')).toHaveTextContent('El usuario o la contraseña no coinciden. Revisalos e intentá de nuevo.');
  });

  it('sin client id de Google el botón de Google está deshabilitado y lo explica', () => {
    render(<Ingreso alIngresar={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Ingresar con Google/ })).toBeDisabled();
    expect(screen.getByText(/El ingreso con Google no está configurado/)).toBeInTheDocument();
  });

  it('muestra el error de Google de otro dominio', async () => {
    simularApi({ 'POST /api/usuario/ingresar-con-google': error(403, 'DOMINIO_DE_GOOGLE_NO_PERMITIDO', 'Solo pueden ingresar cuentas de Google de la organización.') });
    const { container } = render(<Ingreso alIngresar={vi.fn()} clientIdDeGoogle="cliente" />);

    container.dispatchEvent(new CustomEvent('shiro:google', { detail: 'id-token', bubbles: true }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo pueden ingresar cuentas de Google de la organización.');
  });
});
