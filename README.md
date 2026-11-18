# Shiro (front)

> Front de Shiro, gestor de trabajo de Blue Open Data. React 19 + Vite 7 + TypeScript, con el design system
> bod-prototype-design-system (`tokens.css` y `bundle.css`, clases `ui-*`).

## Requisitos

- Node 22 o superior.
- El backend (shiro-be) levantado en el puerto 7090 para que `/api` responda.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm ci` | Instala las dependencias exactas del `package-lock.json` |
| `npm run dev` | Servidor de desarrollo en http://localhost:7091; reenvía `/api` a http://localhost:7090 |
| `npm test` | Pruebas con Vitest y Testing Library |
| `npm run build` | Chequeo de tipos y build de producción en `dist/` |
| `npm run tokens` | Regenera `src/estilos/tokens.css` desde `src/estilos/tokens.json` |

La guía completa para levantar back, base y front está en
[`shiro-be/docs/levantar-en-local.md`](https://github.com/LeonardoRosales1485/shiro-be/blob/claude/jolly-newton-jqin42/docs/levantar-en-local.md).

## Design system

- `src/estilos/tokens.json`, `bundle.css` y `fuentes/Montserrat.woff2` vienen de bod-prototype-design-system.
- `tokens.css` se genera con `npm run tokens`; no se edita a mano.
- Se usan las clases `ui-*` y los tokens `var(--...)`; no se escriben colores, radios ni sombras sueltos.

## Despliegue

`deploy/` es la carpeta del deployer de sm-template y `deploy.yml` usa la plantilla `vite-react-node-22`
(nginx en el contenedor). En los servidores, infra-nginx publica el backend bajo el mismo dominio en `/api`.
En local conviene `npm run dev`: el contenedor del front no reenvía `/api` al backend.
