// Genera src/estilos/tokens.css a partir de src/estilos/tokens.json (bod-prototype-design-system).
// Los colores y sombras tienen valor por modo (claro y oscuro); el resto de los tokens es unico.
// Uso: npm run tokens. El resultado se commitea; no se edita a mano.
import { readFileSync, writeFileSync } from 'node:fs';

const origen = new URL('../src/estilos/tokens.json', import.meta.url);
const destino = new URL('../src/estilos/tokens.css', import.meta.url);
const tokens = JSON.parse(readFileSync(origen, 'utf8'));

const porModo = { light: [], dark: [] };
const unicos = [];

function agregar(nombre, valor) {
  if (typeof valor === 'object') {
    porModo.light.push(`  --${nombre}: ${valor.light};`);
    porModo.dark.push(`  --${nombre}: ${valor.dark};`);
    return;
  }
  unicos.push(`  --${nombre}: ${valor};`);
}

for (const token of tokens.color.tokens) agregar(token.name, token.value);
for (const grupo of ['spacing', 'radius', 'shadow', 'layout']) {
  for (const token of tokens[grupo].tokens) agregar(token.name, token.value);
}
for (const [familia, valor] of Object.entries(tokens.type.families)) agregar(`font-${familia}`, valor);

const fuentes = tokens.type.fonts.map((fuente) => `@font-face {
  font-family: '${fuente.family}';
  src: url('./fuentes/${fuente.file.split('/').pop()}') format('woff2');
  font-weight: ${fuente.weight};
  font-style: ${fuente.style};
  font-display: swap;
}`).join('\n');

const css = `/* Generado por scripts/generar-tokens.mjs desde tokens.json. No editar a mano. */
${fuentes}

:root {
${unicos.join('\n')}
}

:root, [data-theme="light"] {
${porModo.light.join('\n')}
}

[data-theme="dark"] {
${porModo.dark.join('\n')}
}
`;

writeFileSync(destino, css);
console.log(`tokens.css generado: ${porModo.light.length} tokens por modo y ${unicos.length} unicos`);
