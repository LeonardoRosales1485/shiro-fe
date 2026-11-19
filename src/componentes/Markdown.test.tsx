// Decision 43 del 19/11: la descripcion y los comentarios se dibujan como Markdown, sin HTML peligroso.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('dibuja el formato', () => {
    const { container } = render(<Markdown texto={'**Pasos:** abrir dos sesiones\n\n- una\n- dos\n\n[guía](https://ejemplo.com)'} />);

    expect(screen.getByText('Pasos:').tagName).toBe('STRONG');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'guía' })).toHaveAttribute('href', 'https://ejemplo.com');
  });

  it('quita el HTML peligroso', () => {
    const { container } = render(<Markdown texto={'Hola <script>alert(1)</script><img src="x" onerror="alert(2)"> [clic](javascript:alert(3))'} />);

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href') ?? '').not.toContain('javascript');
  });

  it('los enlaces abren en otra pestaña', () => {
    render(<Markdown texto="[guía](https://ejemplo.com)" />);

    expect(screen.getByRole('link', { name: 'guía' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'guía' })).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
