// Texto en Markdown (descripcion de una tarea, comentarios) dibujado como HTML (decision 43 del 19/11). marked lo
// convierte y DOMPurify quita todo lo que pueda ejecutar codigo (scripts, atributos on*, enlaces javascript:) antes de
// ponerlo en la pagina. Los enlaces abren en otra pestaña.
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useMemo } from 'react';

// Abre los enlaces en otra pestaña sin darle acceso a esta (se registra una vez para toda la aplicacion)
DOMPurify.addHook('afterSanitizeAttributes', (nodo) => {
  if (nodo.tagName === 'A' && nodo.getAttribute('href')) {
    nodo.setAttribute('target', '_blank');
    nodo.setAttribute('rel', 'noopener noreferrer');
  }
});

// HTML seguro del Markdown recibido (saltos de linea simples como en el texto original)
export function markdownSeguro(texto: string): string {
  const html = marked.parse(texto, { async: false, breaks: true, gfm: true });
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export function Markdown({ texto }: { texto: string }) {
  const html = useMemo(() => markdownSeguro(texto), [texto]);
  // El HTML ya paso por DOMPurify en markdownSeguro
  // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
  return <div className="sh-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
