// Boton de una accion que espera al servidor (prototipo "Loaders" · acciones en botones, T6.6): mientras se envía
// cambia su texto («Guardando…», «Clonando…»), se bloquea y muestra el spinner del sistema de diseño.
type Props = {
  clase: string;
  texto: string;
  enviando: boolean;
  deshabilitado?: boolean;
  tipo?: 'button' | 'submit';
  alHacerClic?: () => void;
};

// Texto de la accion en curso: «Crear tarea» → «Creando…», «Guardar» → «Guardando…»
const EN_CURSO: [RegExp, string][] = [
  [/^Crear\b/, 'Creando'], [/^Guardar\b/, 'Guardando'], [/^Cerrar\b/, 'Cerrando'], [/^Restaurar\b/, 'Restaurando'], [/^Conectar\b/, 'Conectando'],
  [/^Generar\b/, 'Generando'], [/^Revocar\b/, 'Revocando'], [/^Archivar\b/, 'Archivando'], [/^Relacionar\b/, 'Relacionando'], [/^Clonar\b/, 'Clonando'],
  [/^Ingresar\b/, 'Ingresando'], [/^Publicar\b/, 'Publicando'], [/^Iniciar\b/, 'Iniciando'], [/^Agregar\b/, 'Agregando'],
];

export function textoEnCurso(texto: string): string {
  const regla = EN_CURSO.find(([patron]) => patron.test(texto));
  return regla ? `${regla[1]}…` : `${texto}…`;
}

export function BotonDeAccion({ clase, texto, enviando, deshabilitado = false, tipo = 'button', alHacerClic }: Props) {
  return (
    <button className={clase} type={tipo} disabled={deshabilitado || enviando} aria-busy={enviando || undefined} onClick={alHacerClic}>
      {enviando && <span className="ui-spinner sm" aria-hidden="true" />}
      {enviando ? textoEnCurso(texto) : texto}
    </button>
  );
}
