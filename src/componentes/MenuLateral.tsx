// Menu lateral (prototipo "Main"): marca, selector de proyecto, tableros del proyecto, administracion (solo
// administradores: usuarios y permisos, importar desde Jira y crear proyecto), tema y salir. Se contrae a riel.
// Planificacion (backlog y sprints, versiones) llega en T6.3; General (busqueda y archivados) y Cuenta (tokens MCP),
// en T6.4; la administracion, en T6.5.
import { useState, type MouseEvent } from 'react';
import type { ProyectoDTO } from '../api/tipos';
import { href, navegar } from '../navegacion/ruta';
import { ICONOS_DE_TABLERO } from './catalogos';
import { Icono, Isotipo, type NombreDeIcono } from './Icono';
import { etiquetaDeTema, useTema } from './Tema';

type Props = {
  proyectos: ProyectoDTO[];
  proyecto: ProyectoDTO | null;
  codigoDeTablero: string | null;
  seccion?: string | null;
  esAdministrador: boolean;
  alCrearProyecto: () => void;
  alSalir: () => void;
};

// Secciones de planificacion del proyecto (T6.3)
const PLANIFICACION: { seccion: string; nombre: string; icono: NombreDeIcono }[] = [
  { seccion: 'backlog', nombre: 'Backlog y sprints', icono: 'lista' },
  { seccion: 'versiones', nombre: 'Versiones', icono: 'caja' },
];

type Grupo = { titulo: string; paginas: { seccion: string; nombre: string; icono: NombreDeIcono }[] };

// Paginas generales del menu, que no dependen del proyecto (T6.4); la administracion (T6.5) solo para administradores
const GENERAL: Grupo = { titulo: 'General', paginas: [{ seccion: 'busqueda', nombre: 'Búsqueda', icono: 'lupa' }, { seccion: 'archivados', nombre: 'Archivados', icono: 'archivo' }] };

const ADMINISTRACION: Grupo = {
  titulo: 'Administración',
  paginas: [{ seccion: 'administracion', nombre: 'Usuarios y permisos', icono: 'escudo' }, { seccion: 'importar', nombre: 'Importar desde Jira', icono: 'descargar' }],
};

const CUENTA: Grupo = { titulo: 'Cuenta', paginas: [{ seccion: 'tokens', nombre: 'Tokens MCP', icono: 'llave' }] };

// Ruta del tablero de un proyecto
export function rutaDeTablero(prefijo: string, codigo: string): string {
  return `/proyecto/${prefijo}/${codigo}`;
}

export function MenuLateral({ proyectos, proyecto, codigoDeTablero, seccion = null, esAdministrador, alCrearProyecto, alSalir }: Props) {
  const [riel, setRiel] = useState(false);
  const [tema, alternarTema] = useTema();
  const ir = (ruta: string) => (evento: MouseEvent) => {
    evento.preventDefault();
    navegar(ruta);
  };
  const etiquetaDelRiel = riel ? 'Expandir menú' : 'Contraer menú';

  return (
    <nav className={`ui-side sh-side ${riel ? 'rail' : ''}`} aria-label="Principal" id="menu-principal">
      <div className="ui-side-brand sh-brand">
        <Isotipo tamano={28} /><span>Shiro</span><span className="ui-spacer" />
        <button className="ui-btn ghost icon sm sh-toggle" type="button" aria-controls="menu-principal" aria-expanded={!riel}
          aria-label={etiquetaDelRiel} title={etiquetaDelRiel} onClick={() => setRiel(!riel)}><Icono nombre="contraer" /></button>
      </div>
      {proyectos.length > 0 && (
        <label className="ui-field sh-side-proj" style={{ padding: '0 4px 8px' }}>
          <span className="ui-label">Proyecto</span>
          <select className="ui-select" value={proyecto?.prefijo ?? ''} onChange={(e) => navegar(rutaDeTablero(e.target.value, 'PRINCIPAL'))}>
            {proyectos.map((p) => <option key={p.uuid} value={p.prefijo}>{`${p.nombre} · ${p.prefijo}`}</option>)}
          </select>
        </label>
      )}
      {proyecto && (
        <>
          <div className="ui-side-title">Tableros</div>
          {proyecto.tableros.map((t) => {
            const activo = t.tipoTableroCodigo === codigoDeTablero;
            const ruta = rutaDeTablero(proyecto.prefijo, t.tipoTableroCodigo);
            return (
              <a key={t.uuid} className={`ui-side-item ${activo ? 'active' : ''}`} href={href(ruta)} aria-current={activo ? 'page' : undefined}
                title={t.tipoTableroNombre} onClick={ir(ruta)}>
                <Icono nombre={ICONOS_DE_TABLERO[t.tipoTableroCodigo] ?? 'columnas'} clase={activo && t.tipoTableroCodigo === 'PRINCIPAL' ? 'ui-icon sh-paw' : 'ui-icon'} />
                <span>{t.tipoTableroNombre}</span>
              </a>
            );
          })}
          <div className="ui-side-title">Planificación</div>
          {PLANIFICACION.map((p) => <Enlace key={p.seccion} pagina={p} ruta={`/proyecto/${proyecto.prefijo}/${p.seccion}`} activo={seccion === p.seccion} />)}
        </>
      )}
      {(esAdministrador ? [GENERAL, ADMINISTRACION, CUENTA] : [GENERAL, CUENTA]).map((grupo) => (
        <div key={grupo.titulo} className="sh-grupo-menu">
          <div className="ui-side-title">{grupo.titulo}</div>
          {grupo.paginas.map((p) => <Enlace key={p.seccion} pagina={p} ruta={`/${p.seccion}`} activo={seccion === p.seccion} />)}
          {grupo === ADMINISTRACION && (
            <button className="ui-side-item sh-side-btn" type="button" title="Crear proyecto" onClick={alCrearProyecto}>
              <Icono nombre="mas" /><span>Crear proyecto</span>
            </button>
          )}
        </div>
      ))}
      <span className="ui-spacer" />
      <button className="ui-side-item sh-side-btn" type="button" title={etiquetaDeTema(tema)} onClick={alternarTema}>
        <Icono nombre={tema === 'dark' ? 'sol' : 'luna'} /><span>{etiquetaDeTema(tema)}</span>
      </button>
      <button className="ui-side-item sh-side-btn" type="button" title="Salir" onClick={alSalir}><Icono nombre="salir" /><span>Salir</span></button>
    </nav>
  );
}

// Enlace del menu a una pagina, con navegacion sin recargar y marca de la pagina actual
function Enlace({ pagina, ruta, activo }: { pagina: { nombre: string; icono: NombreDeIcono }; ruta: string; activo: boolean }) {
  return (
    <a className={`ui-side-item ${activo ? 'active' : ''}`} href={href(ruta)} aria-current={activo ? 'page' : undefined} title={pagina.nombre}
      onClick={(evento) => {
        evento.preventDefault();
        navegar(ruta);
      }}>
      <Icono nombre={pagina.icono} /><span>{pagina.nombre}</span>
    </a>
  );
}
