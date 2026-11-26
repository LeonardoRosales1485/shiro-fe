// Cabeceras de seguridad del front (MJ-07 del plan de mejoras). Las sirve vite preview para probarlas en local y son
// las mismas que se le proponen a infra-nginx (docs/cabeceras-de-seguridad.md). La CSP no permite scripts ni estilos
// en linea: solo los del propio sitio y los de Google Identity Services, que carga el ingreso con Google
// (pantallas/Ingreso.tsx). Las imagenes externas (por ejemplo, en una descripcion en Markdown) no se cargan.

// Content-Security-Policy, directiva por directiva
export const POLITICA_DE_CONTENIDO = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com/gsi/client",
  "style-src 'self' https://accounts.google.com/gsi/style",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://accounts.google.com/gsi/",
  'frame-src https://accounts.google.com/gsi/',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

// Cabeceras de endurecimiento de cada respuesta del front
export const CABECERAS_DE_SEGURIDAD: Record<string, string> = {
  'Content-Security-Policy': POLITICA_DE_CONTENIDO,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};
