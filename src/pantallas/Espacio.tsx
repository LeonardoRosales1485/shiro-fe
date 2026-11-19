// Espacio de trabajo con sesion (T6.1): carga los proyectos visibles y los catalogos, resuelve la ruta
// /proyecto/{prefijo}/{tablero} (sin ruta va al tablero principal del primer proyecto) o /proyecto/{prefijo}/tarea/{clave}
// (detalle de tarea, T6.2) y muestra el menu, el tablero o el detalle y los modales de crear tarea y proyecto.
import { useEffect, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import { pedidoDePaginado, type Pagina, type ProyectoDTO, type TipoTableroDTO, type TipoTareaDTO, type UsuarioDTO } from '../api/tipos';
import { CrearProyectoModal } from '../componentes/CrearProyectoModal';
import { CrearTareaModal } from '../componentes/CrearTareaModal';
import { Icono } from '../componentes/Icono';
import { MenuLateral, rutaDeTablero } from '../componentes/MenuLateral';
import { navegar, useRuta } from '../navegacion/ruta';
import { Archivados } from './Archivados';
import { Busqueda } from './Busqueda';
import { DetalleDeTarea } from './DetalleDeTarea';
import { Planificacion } from './Planificacion';
import { Tablero } from './Tablero';
import { Tokens } from './Tokens';
import { Versiones } from './Versiones';

type Props = { usuario: UsuarioDTO; esAdministrador: boolean; alSalir: () => void };

type Seccion = 'backlog' | 'versiones';

// Paginas que no son de un proyecto (T6.4)
type General = 'busqueda' | 'archivados' | 'tokens';

const GENERALES: General[] = ['busqueda', 'archivados', 'tokens'];

type Datos = { proyectos: ProyectoDTO[]; tiposDeTablero: TipoTableroDTO[]; tiposDeTarea: TipoTareaDTO[] };

// Prefijo y codigo de tablero (/proyecto/SHI/PRINCIPAL), clave de tarea (/proyecto/SHI/tarea/SHI-12) o seccion de
// planificacion (/proyecto/SHI/backlog, /proyecto/SHI/versiones) de la ruta, o null si la ruta no es de un proyecto
function leerRuta(ruta: string): { prefijo: string; codigo: string | null; clave: string | null; seccion?: Seccion } | null {
  const deSeccion = /^\/proyecto\/([A-Z]{2,6})\/(backlog|versiones)$/.exec(ruta);
  if (deSeccion) return { prefijo: deSeccion[1], codigo: null, clave: null, seccion: deSeccion[2] as Seccion };
  const deTarea = /^\/proyecto\/([A-Z]{2,6})\/tarea\/([A-Za-z0-9-]+)$/.exec(ruta);
  if (deTarea) return { prefijo: deTarea[1], codigo: null, clave: decodeURIComponent(deTarea[2]) };
  const partes = /^\/proyecto\/([A-Z]{2,6})\/([A-Z]+)$/.exec(ruta);
  return partes ? { prefijo: partes[1], codigo: partes[2], clave: null } : null;
}

// Proyectos visibles y catalogos de tableros y tipos de tarea
async function leerDatos(): Promise<Datos> {
  const [proyectos, tiposDeTablero, tiposDeTarea] = await Promise.all([
    pedir<Pagina<ProyectoDTO>>('POST', '/proyecto/paginar', pedidoDePaginado([], 'nombre', 200)),
    pedir<TipoTableroDTO[]>('GET', '/tipo-tablero/listar'),
    pedir<TipoTareaDTO[]>('GET', '/tipo-tarea/listar'),
  ]);
  return { proyectos: proyectos.contenido, tiposDeTablero, tiposDeTarea };
}

export function Espacio({ usuario, esAdministrador, alSalir }: Props) {
  const ruta = useRuta();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'tarea' | 'proyecto' | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    leerDatos()
      .then((leidos) => vigente && setDatos(leidos))
      .catch((e) => vigente && setError(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, []);

  const elegida = leerRuta(ruta);
  const general = GENERALES.find((g) => ruta === `/${g}`) ?? null;
  const [ultimoPrefijo, setUltimoPrefijo] = useState<string | null>(null);
  if (elegida && elegida.prefijo !== ultimoPrefijo) setUltimoPrefijo(elegida.prefijo);
  const proyecto = datos?.proyectos.find((p) => p.prefijo === elegida?.prefijo) ?? null;
  // En las paginas generales el menu sigue mostrando el ultimo proyecto visitado
  const proyectoDelMenu = proyecto ?? datos?.proyectos.find((p) => p.prefijo === ultimoPrefijo) ?? datos?.proyectos[0] ?? null;
  const tablero = proyecto?.tableros.find((t) => t.tipoTableroCodigo === elegida?.codigo) ?? null;
  const tipoDeTablero = datos?.tiposDeTablero.find((t) => t.uuid === tablero?.tipoTableroUuid) ?? null;

  const clave = proyecto && elegida?.clave ? elegida.clave : null;
  const seccion = proyecto && elegida?.seccion ? elegida.seccion : null;

  useEffect(() => {
    if (datos && !tablero && !clave && !seccion && !general && datos.proyectos.length > 0) {
      navegar(rutaDeTablero(datos.proyectos[0].prefijo, 'PRINCIPAL'), true);
    }
  }, [datos, tablero, clave, seccion, general]);

  const alCrearProyecto = (nuevo: ProyectoDTO) => {
    setModal(null);
    setDatos((anteriores) => anteriores && { ...anteriores, proyectos: [...anteriores.proyectos, nuevo] });
    navegar(rutaDeTablero(nuevo.prefijo, 'PRINCIPAL'));
  };

  return (
    <div className="sh-espacio">
      <MenuLateral proyectos={datos?.proyectos ?? []} proyecto={proyectoDelMenu} codigoDeTablero={elegida?.codigo ?? null} seccion={seccion ?? general}
        esAdministrador={esAdministrador} alCrearProyecto={() => setModal('proyecto')} alSalir={alSalir} />
      <main className="ui-main sh-principal">
        {error && <div className="ui-alert is-danger" role="alert"><Icono nombre="alerta" /><span>{error}</span></div>}
        {!datos && !error && <div className="ui-row ui-muted" role="status"><span className="ui-spinner" aria-hidden="true" />Cargando tu espacio...</div>}
        {datos && datos.proyectos.length === 0 && (
          <section className="ui-card">
            <div className="ui-empty">
              <span className="ui-empty-icon"><Icono nombre="columnas" /></span>
              <p className="ui-empty-title">Todavía no ves ningún proyecto</p>
              <p className="ui-empty-text">
                {esAdministrador ? 'Creá el primer proyecto para empezar.' : 'Pedile a un administrador que te dé acceso a un proyecto.'}
              </p>
            </div>
          </section>
        )}
        {general === 'busqueda' && datos && (
          <Busqueda proyectos={datos.proyectos} tiposDeTablero={datos.tiposDeTablero} tiposDeTarea={datos.tiposDeTarea} usuario={usuario} />
        )}
        {general === 'archivados' && <Archivados esAdministrador={esAdministrador} />}
        {general === 'tokens' && <Tokens nombreDelUsuario={usuario.nombre || usuario.nombreDeUsuario} />}
        {proyecto && seccion === 'backlog' && datos && <Planificacion key={proyecto.uuid} proyecto={proyecto} tiposDeTablero={datos.tiposDeTablero} />}
        {proyecto && seccion === 'versiones' && datos && <Versiones key={proyecto.uuid} proyecto={proyecto} tiposDeTablero={datos.tiposDeTablero} />}
        {proyecto && clave && datos && (
          <DetalleDeTarea key={clave} proyecto={proyecto} clave={clave} tiposDeTablero={datos.tiposDeTablero} tiposDeTarea={datos.tiposDeTarea}
            usuario={usuario} />
        )}
        {proyecto && tablero && tipoDeTablero && (
          <Tablero proyecto={proyecto} tablero={tablero} tipoDeTablero={tipoDeTablero} version={version} alNuevaTarea={() => setModal('tarea')} />
        )}
      </main>
      {modal === 'tarea' && proyecto && tablero && datos && (
        <CrearTareaModal proyecto={proyecto} tableroUuid={tablero.uuid} tipos={datos.tiposDeTarea}
          alCrear={() => setVersion((v) => v + 1)} alCerrar={() => setModal(null)} />
      )}
      {modal === 'proyecto' && <CrearProyectoModal alCrear={alCrearProyecto} alCerrar={() => setModal(null)} />}
    </div>
  );
}
