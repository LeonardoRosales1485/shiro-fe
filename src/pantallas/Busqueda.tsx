// Búsqueda de tareas (T6.4, prototipo "Búsqueda"): en todos los proyectos que el usuario ve, por texto (clave,
// título o descripción) y con filtros de proyecto, tablero, tipo, estado, etiqueta y «Asignadas a mí». Con un
// proyecto elegido se suman responsable (de los usuarios del proyecto), sprint (con «Sin sprint») y versión. Tablero,
// tipo, estado, responsable y sprint aceptan varios valores, que se combinan con O (propuesta 51). Pagina de a 50.
import { useEffect, useId, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import {
  igual, pedidoDePaginado, type Filtro, type Pagina, type ProyectoDTO, type SprintDTO, type TipoTableroDTO, type TipoTareaDTO,
  type UsuarioDelProyectoDTO, type UsuarioDTO, type VersionDTO,
} from '../api/tipos';
import { nombreDeTablero } from '../componentes/catalogos';
import { Encabezado } from '../componentes/Encabezado';
import { AlertaDeError } from '../componentes/Modal';
import { EnlaceATarea } from './detalle/PanelDeDetalles';

type Props = { proyectos: ProyectoDTO[]; tiposDeTablero: TipoTableroDTO[]; tiposDeTarea: TipoTareaDTO[]; usuario: UsuarioDTO };

type Resultado = {
  uuid: string;
  clave: string;
  titulo: string;
  proyectoUuid: string | null;
  tableroCodigo: string | null;
  estadoNombre: string | null;
  responsableNombre: string | null;
  sprintNombre: string | null;
};

type Filtros = {
  texto: string;
  proyecto: string;
  tableros: string[];
  tipos: string[];
  estados: string[];
  responsables: string[];
  sprints: string[];
  version: string;
  etiqueta: string;
  mias: boolean;
};

type Multiple = 'tableros' | 'tipos' | 'estados' | 'responsables' | 'sprints';

const VACIOS: Filtros = { texto: '', proyecto: '', tableros: [], tipos: [], estados: [], responsables: [], sprints: [], version: '', etiqueta: '', mias: false };

// Valor de la opcion «Sin sprint (backlog)» del filtro de sprints
const SIN_SPRINT = 'SIN_SPRINT';

const POR_PAGINA = 50;

// Catalogos del proyecto elegido para los filtros que dependen de el
type DelProyecto = { proyecto: string; usuarios: UsuarioDelProyectoDTO[]; sprints: SprintDTO[]; versiones: VersionDTO[] };

// Grupo de filtros por igualdad para los valores elegidos (dentro de un grupo se combinan con O)
function grupo(campo: string, valores: string[]): Filtro[] {
  return valores.map((valor) => igual(campo, valor));
}

// Pedido de /tarea/paginar con los filtros (un grupo por filtro: los grupos se combinan con Y) y los parametros
function pedidoDeBusqueda(f: Filtros, usuario: string, pagina: number) {
  const grupos: Filtro[][] = [];
  if (f.proyecto) grupos.push([igual('proyecto.uuid', f.proyecto)]);
  grupos.push(grupo('tablero.tipoTablero.codigo', f.tableros), grupo('tipo.codigo', f.tipos), grupo('estado.uuid', f.estados));
  if (f.mias) grupos.push([igual('responsable.uuid', usuario)]);
  else if (f.proyecto) grupos.push(grupo('responsable.uuid', f.responsables));
  if (f.proyecto) {
    grupos.push(f.sprints.map((s) => (s === SIN_SPRINT ? { campo: 'sprint.uuid', operacion: 'is null', valor: '' } : igual('sprint.uuid', s))));
  }
  const parametros = [
    { nombre: 'texto', valor: f.texto.trim() },
    { nombre: 'etiqueta', valor: f.etiqueta.trim() },
    { nombre: 'version', valor: f.proyecto ? f.version : '' },
  ].filter((p) => p.valor);
  return {
    pagina, tamano: POR_PAGINA, filtros: grupos.filter((g) => g.length > 0), ordenes: [{ campo: 'numero', direccion: 'desc' }],
    ...(parametros.length ? { parametros } : {}),
  };
}

export function Busqueda({ proyectos, tiposDeTablero, tiposDeTarea, usuario }: Props) {
  const id = useId();
  const [filtros, setFiltros] = useState<Filtros>(VACIOS);
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<{ tareas: Resultado[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [delProyecto, setDelProyecto] = useState<DelProyecto | null>(null);

  // Busca cada vez que cambian los filtros o la pagina (el texto y la etiqueta esperan a que se deje de escribir)
  useEffect(() => {
    let vigente = true;
    const espera = setTimeout(() => {
      pedir<Pagina<Resultado> & { totalDeElementos: number }>('POST', '/tarea/paginar', pedidoDeBusqueda(filtros, usuario.uuid, pagina))
        .then((leida) => vigente && setResultado({ tareas: leida.contenido, total: leida.totalDeElementos ?? leida.contenido.length }))
        .catch((e) => vigente && setError(mensajeDeError(e)));
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [filtros, pagina, usuario.uuid]);

  // Al elegir un proyecto se piden sus usuarios, sprints y versiones
  useEffect(() => {
    if (!filtros.proyecto) return;
    let vigente = true;
    const proyecto = filtros.proyecto;
    Promise.all([
      pedir<UsuarioDelProyectoDTO[]>('GET', `/proyecto/${proyecto}/usuarios`),
      pedir<Pagina<SprintDTO>>('POST', '/sprint/paginar', pedidoDePaginado([igual('proyecto.uuid', proyecto)], 'inicio', 200)),
      pedir<Pagina<VersionDTO>>('POST', '/version/paginar', pedidoDePaginado([igual('proyecto.uuid', proyecto)], 'nombre', 200)),
    ])
      .then(([usuarios, sprints, versiones]) => vigente && setDelProyecto({ proyecto, usuarios, sprints: sprints.contenido, versiones: versiones.contenido }))
      .catch((e) => vigente && setError(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [filtros.proyecto]);

  const catalogo = delProyecto && delProyecto.proyecto === filtros.proyecto ? delProyecto : null;
  const alternar = (campo: Multiple, valor: string) => {
    const actuales = filtros[campo];
    poner(campo, actuales.includes(valor) ? actuales.filter((v) => v !== valor) : [...actuales, valor]);
  };
  const poner = (campo: keyof Filtros, valor: string | boolean | string[]) => {
    setPagina(1);
    setFiltros((actuales) => ({
      ...actuales, [campo]: valor,
      ...(campo === 'proyecto' ? { responsables: [], sprints: [], version: '' } : {}),
    }));
  };
  const estados = tiposDeTablero.flatMap((t) => [...t.estados].sort((a, b) => a.orden - b.orden).map((e) => ({ ...e, tablero: t.nombre })));
  const tableros = [...new Map(tiposDeTablero.map((t) => [t.codigo, t.nombre])).entries()];
  const proyectoDe = (uuid: string | null) => proyectos.find((p) => p.uuid === uuid);
  const paginas = resultado ? Math.max(1, Math.ceil(resultado.total / POR_PAGINA)) : 1;

  const selector = (campo: keyof Filtros, etiqueta: string, todos: string, opciones: [string, string][]) => (
    <div className="ui-field">
      <label className="ui-label" htmlFor={`${id}-${campo}`}>{etiqueta}</label>
      <select id={`${id}-${campo}`} className="ui-select" value={String(filtros[campo])} onChange={(e) => poner(campo, e.target.value)}>
        <option value="">{todos}</option>
        {opciones.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <Encabezado migas={['Búsqueda']} titulo="Búsqueda">
        <span className="ui-chip is-violet">También disponible por MCP</span>
      </Encabezado>
      <section className="ui-card sh-tarjeta" aria-label="Filtros">
        <div className="ui-field">
          <label className="ui-label" htmlFor={`${id}-texto`}>Buscar</label>
          <input id={`${id}-texto`} className="ui-input" type="search" placeholder="Clave, palabras del título o de la descripción" value={filtros.texto}
            onChange={(e) => poner('texto', e.target.value)} />
        </div>
        <div className="sh-grilla-filtros">
          {selector('proyecto', 'Proyecto', 'Todos', proyectos.map((p) => [p.uuid, p.nombre]))}
          <FiltroMultiple etiqueta="Tablero" opciones={tableros} elegidos={filtros.tableros} alAlternar={(v) => alternar('tableros', v)} />
          <FiltroMultiple etiqueta="Tipo" opciones={tiposDeTarea.map((t) => [t.codigo, t.nombre])} elegidos={filtros.tipos} alAlternar={(v) => alternar('tipos', v)} />
          <FiltroMultiple etiqueta="Estado" opciones={estados.map((e) => [e.uuid, `${e.nombre} (${e.tablero})`])} elegidos={filtros.estados}
            alAlternar={(v) => alternar('estados', v)} />
          {catalogo && !filtros.mias && (
            <FiltroMultiple etiqueta="Responsable" opciones={catalogo.usuarios.map((u) => [u.uuid, u.nombre || u.nombreDeUsuario])} elegidos={filtros.responsables}
              alAlternar={(v) => alternar('responsables', v)} />
          )}
          {catalogo && (
            <FiltroMultiple etiqueta="Sprint" opciones={[[SIN_SPRINT, 'Sin sprint (backlog)'], ...catalogo.sprints.map((s): [string, string] => [s.uuid, s.nombre])]}
              elegidos={filtros.sprints} alAlternar={(v) => alternar('sprints', v)} />
          )}
          {catalogo && selector('version', 'Versión', 'Todas', catalogo.versiones.map((v) => [v.uuid, v.nombre]))}
          <div className="ui-field">
            <label className="ui-label" htmlFor={`${id}-etiqueta`}>Etiqueta</label>
            <input id={`${id}-etiqueta`} className="ui-input" value={filtros.etiqueta} onChange={(e) => poner('etiqueta', e.target.value)} />
          </div>
        </div>
        <div className="ui-row">
          <label className="ui-check"><input type="checkbox" checked={filtros.mias} onChange={(e) => poner('mias', e.target.checked)} />Asignadas a mí</label>
          <span className="ui-spacer" />
          <button className="ui-btn ghost sm" type="button" onClick={() => {
            setPagina(1);
            setFiltros(VACIOS);
          }}>Limpiar filtros</button>
        </div>
      </section>
      <AlertaDeError mensaje={error} />
      {!resultado && !error && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
      {resultado && (
        <section className="ui-card sh-tarjeta" aria-label="Resultados de la búsqueda">
          <p className="ui-muted" style={{ margin: 0 }}>{resultado.total === 1 ? '1 resultado' : `${resultado.total} resultados`}</p>
          {resultado.tareas.length === 0 && <p className="ui-muted" style={{ margin: 0 }}>No hay tareas que coincidan con la búsqueda.</p>}
          {resultado.tareas.length > 0 && (
            <div className="ui-table-wrap">
              <table className="ui-table" aria-label="Resultados">
                <thead><tr><th>Clave</th><th>Título</th><th>Tablero</th><th>Estado</th><th>Responsable</th><th>Sprint</th></tr></thead>
                <tbody>
                  {resultado.tareas.map((t) => {
                    const proyecto = proyectoDe(t.proyectoUuid);
                    return (
                      <tr key={t.uuid}>
                        <td>{proyecto ? <EnlaceATarea prefijo={proyecto.prefijo} clave={t.clave} texto={t.clave} /> : t.clave}</td>
                        <td>{t.titulo}</td>
                        <td>{proyecto ? `${proyecto.nombre} · ${nombreDeTablero(proyecto.tableros, t.tableroCodigo)}` : t.tableroCodigo}</td>
                        <td>{t.estadoNombre}</td>
                        <td>{t.responsableNombre ?? '—'}</td>
                        <td>{t.sprintNombre ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {paginas > 1 && (
            <div className="ui-row">
              <button className="ui-btn ghost sm" type="button" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
              <span className="ui-muted">{`Página ${pagina} de ${paginas}`}</span>
              <button className="ui-btn ghost sm" type="button" disabled={pagina === paginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

// Filtro de varios valores: las opciones como casillas en una lista corta con scroll (los elegidos se combinan con O)
function FiltroMultiple({ etiqueta, opciones, elegidos, alAlternar }: {
  etiqueta: string; opciones: [string, string][]; elegidos: string[]; alAlternar: (valor: string) => void;
}) {
  return (
    <fieldset className="sh-fieldset sh-filtro-multiple">
      <legend className="ui-label">{etiqueta}</legend>
      <div className="sh-filtro-opciones">
        {opciones.map(([valor, texto]) => (
          <label key={valor} className="ui-check"><input type="checkbox" checked={elegidos.includes(valor)} onChange={() => alAlternar(valor)} />{texto}</label>
        ))}
      </div>
      <span className="ui-help">{elegidos.length === 0 ? 'Todos' : `${elegidos.length} elegidos`}</span>
    </fieldset>
  );
}
