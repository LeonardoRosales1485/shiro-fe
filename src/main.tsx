// Punto de entrada del front: carga el design system (tokens antes que componentes) y monta la aplicacion.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos/tokens.css';
import './estilos/bundle.css';
import './estilos/inicio.css';
import { Inicio } from './Inicio';

const raiz = document.getElementById('raiz');
if (!raiz) {
  throw new Error('Falta el elemento #raiz en index.html');
}

createRoot(raiz).render(
  <StrictMode>
    <Inicio />
  </StrictMode>,
);
