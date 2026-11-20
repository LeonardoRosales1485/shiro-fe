// Pasos 2 y 3 de importar desde Jira (T6.5, prototipos "Importar desde Jira · tableros" y "· estados"): a qué tablero
// de Shiro va cada tablero de Jira (o no se importa) y, en cada tablero elegido, a qué estado pasa cada estado de
// Jira; también a qué tipo de Shiro pasa cada tipo de Jira y cuántos días duran los sprints sin fechas. Un estado o
// un tipo sin equivalente se puede crear con el nombre de Jira.
import { useId } from 'react';
import type { TipoTableroDTO, TipoTareaDTO } from '../../api/tipos';
import { CREAR, type Catalogo } from './mapeo';

type PropsTableros = {
  catalogo: Catalogo; tiposDeTablero: TipoTableroDTO[]; tableros: Record<string, string>; alCambiar: (idJira: string, tipo: string) => void;
};

export function PasoTableros({ catalogo, tiposDeTablero, tableros, alCambiar }: PropsTableros) {
  const destinos = Object.values(tableros).filter(Boolean);
  const repetido = tiposDeTablero.find((t) => destinos.filter((d) => d === t.uuid).length > 1);
  return (
    <section className="ui-card sh-tarjeta" aria-label="Tableros">
      <h2 className="ui-card-title" style={{ margin: 0 }}>Tableros de Jira</h2>
      <p className="ui-muted" style={{ margin: 0 }}>Asigná cada uno al tablero principal o a un sub-tablero. Solo se importan las tareas de los tableros asignados.</p>
      <div className="ui-table-wrap">
        <table className="ui-table" aria-label="Tableros de Jira">
          <thead><tr><th>Tablero en Jira</th><th>Tablero en Shiro</th></tr></thead>
          <tbody>
            {catalogo.tableros.map((t) => (
              <tr key={t.idJira}>
                <td>{t.nombre}</td>
                <td>
                  <select className="ui-select" aria-label={`Tablero en Shiro de ${t.nombre}`} value={tableros[t.idJira] ?? ''} onChange={(e) => alCambiar(t.idJira, e.target.value)}>
                    {tiposDeTablero.map((tipo) => <option key={tipo.uuid} value={tipo.uuid}>{tipo.nombre}</option>)}
                    <option value="">No importar</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {repetido && <p className="ui-help" style={{ margin: 0 }}>{`Varios tableros de Jira van a ${repetido.nombre}: sus tareas quedan en un solo tablero.`}</p>}
    </section>
  );
}

type PropsEstados = {
  catalogo: Catalogo; tiposDeTablero: TipoTableroDTO[]; tiposDeTarea: TipoTareaDTO[]; tableros: Record<string, string>;
  estados: Record<string, string>; tipos: Record<string, string>; dias: number;
  alCambiarEstado: (clave: string, valor: string) => void; alCambiarTipo: (idJira: string, valor: string) => void; alCambiarDias: (dias: number) => void;
};

// Clave del estado elegido para un estado de Jira dentro de un tablero de Jira
export const claveDeEstado = (idTablero: string, idEstado: string) => `${idTablero}:${idEstado}`;

export function PasoEstados({ catalogo, tiposDeTablero, tiposDeTarea, tableros, estados, tipos, dias, alCambiarEstado, alCambiarTipo, alCambiarDias }: PropsEstados) {
  const id = useId();
  return (
    <>
      {catalogo.tableros.filter((t) => tableros[t.idJira]).map((t) => {
        const tipo = tiposDeTablero.find((x) => x.uuid === tableros[t.idJira]);
        if (!tipo) return null;
        return (
          <section key={t.idJira} className="ui-card sh-tarjeta" aria-label={`Estados del tablero ${t.nombre}`}>
            <h2 className="ui-card-title" style={{ margin: 0 }}>{`Estados del tablero «${t.nombre}» → ${tipo.nombre}`}</h2>
            <div className="ui-table-wrap">
              <table className="ui-table" aria-label={`Estados de ${t.nombre}`}>
                <thead><tr><th>Estado en Jira</th><th>Estado en Shiro</th></tr></thead>
                <tbody>
                  {catalogo.estados.map((e) => (
                    <tr key={e.idJira}>
                      <td>{e.nombre}</td>
                      <td>
                        <select className="ui-select" aria-label={`Estado en Shiro de ${e.nombre}`} value={estados[claveDeEstado(t.idJira, e.idJira)] ?? ''}
                          onChange={(ev) => alCambiarEstado(claveDeEstado(t.idJira, e.idJira), ev.target.value)}>
                          {tipo.estados.map((s) => <option key={s.uuid} value={s.uuid}>{s.nombre}</option>)}
                          <option value={CREAR}>{`Crear «${e.nombre}»`}</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      <section className="ui-card sh-tarjeta" aria-label="Tipos">
        <h2 className="ui-card-title" style={{ margin: 0 }}>Tipos de Jira</h2>
        <div className="ui-table-wrap">
          <table className="ui-table" aria-label="Tipos de Jira">
            <thead><tr><th>Tipo en Jira</th><th>Tipo en Shiro</th></tr></thead>
            <tbody>
              {catalogo.tipos.map((t) => (
                <tr key={t.idJira}>
                  <td>{t.nombre}</td>
                  <td>
                    <select className="ui-select" aria-label={`Tipo en Shiro de ${t.nombre}`} value={tipos[t.idJira] ?? ''} onChange={(e) => alCambiarTipo(t.idJira, e.target.value)}>
                      {tiposDeTarea.map((x) => <option key={x.uuid} value={x.uuid}>{x.nombre}</option>)}
                      <option value={CREAR}>{`Crear «${t.nombre}»`}</option>
                      <option value="">No importar</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ui-help" style={{ margin: 0 }}>Un estado o tipo nuevo se suma al catálogo y aparece en todos los proyectos. Las tareas de un tipo sin importar quedan en el resumen.</p>
        <div className="ui-field" style={{ maxWidth: 280 }}>
          <label className="ui-label" htmlFor={`${id}-d`}>Días de los sprints sin fechas</label>
          <input id={`${id}-d`} className="ui-input" type="number" min={1} max={90} value={dias} onChange={(e) => alCambiarDias(Number(e.target.value))} />
        </div>
      </section>
    </>
  );
}
