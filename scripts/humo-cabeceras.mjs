// Humo de las cabeceras de seguridad (MJ-07): pide la pagina y verifica que traiga cada cabecera esperada.
// Uso: node scripts/humo-cabeceras.mjs [url]. Por defecto, vite preview en local (http://localhost:7092/).
// Reintenta durante 30 segundos mientras el servidor arranca. Sale con 1 si falta o difiere alguna cabecera.
const url = process.argv[2] ?? 'http://localhost:7092/';

// Las mismas que src/configuracion/cabecerasDeSeguridad.ts; la CSP se compara por sus directivas clave
const esperadas = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
};
const directivasDeLaCsp = ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'"];

async function pedirConReintentos() {
  const limite = Date.now() + 30_000;
  for (;;) {
    try {
      return await fetch(url);
    } catch (error) {
      if (Date.now() > limite) throw error;
      await new Promise((resolver) => setTimeout(resolver, 1000));
    }
  }
}

const respuesta = await pedirConReintentos();
const fallas = [];
for (const [nombre, valor] of Object.entries(esperadas)) {
  if (respuesta.headers.get(nombre) !== valor) fallas.push(`${nombre}: esperaba "${valor}" y llego "${respuesta.headers.get(nombre)}"`);
}
const csp = respuesta.headers.get('content-security-policy') ?? '';
for (const directiva of directivasDeLaCsp) {
  if (!csp.includes(directiva)) fallas.push(`content-security-policy sin "${directiva}"`);
}
if (csp.includes('unsafe-inline')) fallas.push('content-security-policy permite unsafe-inline');
if (fallas.length > 0) {
  console.error(`[cabeceras] ${url} no trae las cabeceras de seguridad:\n  ${fallas.join('\n  ')}`);
  process.exit(1);
}
console.log(`[cabeceras] ${url} trae las cabeceras de seguridad`);
