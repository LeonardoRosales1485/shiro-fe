// Campo de formulario del design system (ui-field): etiqueta, input y ayuda opcional. Lo comparten los modales y
// formularios simples (crear sprint, cuenta de Shiro, conexión con Jira).
type Props = { id: string; etiqueta: string; valor: string; alCambiar: (valor: string) => void; tipo?: string; ayuda?: string };

export function CampoDeTexto({ id, etiqueta, valor, alCambiar, tipo = 'text', ayuda }: Props) {
  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor={id}>{etiqueta}</label>
      <input id={id} className="ui-input" type={tipo} autoComplete="off" value={valor} onChange={(e) => alCambiar(e.target.value)} />
      {ayuda && <span className="ui-help">{ayuda}</span>}
    </div>
  );
}
