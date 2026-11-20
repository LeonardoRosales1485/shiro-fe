// Punto de entrada del front: carga el design system (tokens antes que componentes), las piezas de Shiro y monta la
// aplicacion con el tema guardado.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos/tokens.css';
import './estilos/bundle.css';
import './estilos/shiro.css';
import './estilos/aplicacion.css';
import './estilos/carga-gato.css';
import { App } from './App';
import { aplicarTema } from './componentes/Tema';

const raiz = document.getElementById('raiz');
if (!raiz) {
  throw new Error('Falta el elemento #raiz en index.html');
}

aplicarTema();
createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
