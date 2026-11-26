# Cabeceras de seguridad del front

MJ-07 del plan de mejoras (OWASP A05). Propuesta para el devops: agregarlas al bloque de Shiro en infra-nginx. La imagen del front (plantilla `vite-react-node-22` de `deploy/`) no las agrega y esa carpeta no se modifica desde el proyecto.

La fuente de verdad es `src/configuracion/cabecerasDeSeguridad.ts`: `vite preview` (puerto 7092) sirve las mismas, y la CI las verifica con `scripts/humo-cabeceras.mjs` sobre el build. Si cambia una, se cambia en los tres lugares.

## Fragmento para infra-nginx

Dentro del `location` que sirve el front de Shiro (no en el del backend `/api`):

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' https://accounts.google.com/gsi/style; img-src 'self' data:; font-src 'self'; connect-src 'self' https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "same-origin" always;
add_header X-Frame-Options "DENY" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

- `add_header` de nginx no se hereda si el `location` ya declara otro `add_header`: hay que repetirlas en cada `location` del front que agregue cabeceras propias.
- `Strict-Transport-Security` solo tiene efecto bajo HTTPS. Si un ambiente se sirve por HTTP, el navegador la ignora.
- El límite de intentos de ingreso del backend (MJ-04) lee la IP del cliente de `X-Real-IP`. El bloque de `/api` tiene que mandarla: `proxy_set_header X-Real-IP $remote_addr;`.

## Qué permite la CSP y por qué

| Directiva | Valor | Motivo |
|---|---|---|
| `default-src` | `'self'` | Todo lo que no se nombra, solo del mismo origen |
| `script-src` | `'self'` y `https://accounts.google.com/gsi/client` | El bundle de Vite y el script del ingreso con Google (`pantallas/Ingreso.tsx`). Sin `unsafe-inline` ni `unsafe-eval` |
| `style-src` | `'self'` y `https://accounts.google.com/gsi/style` | El CSS del bundle y el del botón de Google. Los estilos que React pone por JS no los bloquea la CSP |
| `img-src` | `'self'` y `data:` | Íconos propios. Una imagen externa (por ejemplo, en una descripción importada de Jira) no se carga |
| `connect-src` | `'self'` y `https://accounts.google.com/gsi/` | La API bajo el mismo dominio y el ingreso con Google |
| `frame-src` | `https://accounts.google.com/gsi/` | El botón de Google se dibuja en un iframe |
| `frame-ancestors` | `'none'` | Nadie puede embeber Shiro (igual que `X-Frame-Options: DENY`) |

## Cómo probarlas en local

```bash
npm run build
```

```bash
npx vite preview
```

```bash
node scripts/humo-cabeceras.mjs http://localhost:7092/
```

Con la consola del navegador abierta en `http://localhost:7092/`, un error de CSP aparece como «Refused to load…». El servidor de desarrollo (`npm run dev`, puerto 7091) no las sirve: Vite inyecta scripts en línea para recargar en caliente.
