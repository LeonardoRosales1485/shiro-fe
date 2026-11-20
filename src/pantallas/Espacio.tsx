// Espacio de trabajo con sesion (T6.1): carga los proyectos visibles y los catalogos, resuelve la ruta
// /proyecto/{prefijo}/{tablero} (sin ruta va al tablero principal del primer proyecto) o /proyecto/{prefijo}/tarea/{clave}
// (detalle de tarea, T6.2) y muestra el menu, el tablero o el detalle y los modales de crear tarea y proyecto.
import { useEffect, useRef, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import { pedidoDePaginado, type Pagina, type ProyectoDTO, type TipoTableroDTO, type TipoTareaDTO, type UsuarioDTO } from '../api/tipos';
import { CrearProyectoModal } from '../componentes/CrearProyectoModal';
import { CrearTareaModal } from '../componentes/CrearTareaModal';
import { CargaDeShiro, ErrorConReintento } from '../componentes/Cargas';
import { iniciales } from '../componentes/catalogos';
import { Icono } from '../componentes/Icono';
import { MenuLateral, rutaDeTablero } from '../componentes/MenuLateral';
import { BotonDeTema } from '../componentes/Tema';
import { useEsTelefono } from '../componentes/useEsTelefono';
import { navegar, useRuta } from '../navegacion/ruta';
import { Administracion } from './Administracion';
import { Archivados } from './Archivados';
import { Busqueda } from './Busqueda';
import { DetalleDeTarea } from './DetalleDeTarea';
import { Importacion } from './Importacion';
import { Planificacion } from './Planificacion';
import { Tablero } from './Tablero';
import { Tokens } from './Tokens';
import { Versiones } from './Versiones';

type Props = { usuario: UsuarioDTO; esAdministrador: boolean; alSalir: () => void };

type Seccion = 'backlog' | 'versiones';

// Paginas que no son de un proyecto (T6.4); administracion e importar, solo para administradores (T6.5)
type General = 'busqueda' | 'archivados' | 'tokens' | 'administracion' | 'importar';

const GENERALES: General[] = ['busqueda', 'archivados', 'tokens'];

const DE_ADMINISTRACION: General[] = ['administracion', 'importar'];

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

// Paginas que en el telefono se usan desde la computadora (T6.6), con su nombre
const SOLO_COMPUTADORA: Partial<Record<General, string>> = { administracion: 'Usuarios y permisos', importar: 'Importar desde Jira', archivados: 'Archivados' };

const TITULOS_GENERALES: Record<General, string> = {
  busqueda: 'Búsqueda', archivados: 'Archivados', tokens: 'Tokens MCP', administracion: 'Usuarios y permisos', importar: 'Importar desde Jira',
};

// Titulo de la barra del telefono para la pagina actual
function tituloMovil(proyecto: ProyectoDTO | null, tablero: ProyectoDTO['tableros'][number] | null, clave: string | null,
  seccion: Seccion | null, general: General | null): string {
  if (general) return TITULOS_GENERALES[general];
  if (!proyecto) return 'Shiro';
  if (clave) return clave;
  if (seccion) return `${proyecto.nombre} · ${seccion === 'backlog' ? 'Backlog' : 'Versiones'}`;
  return tablero ? `${proyecto.nombre} · ${tablero.tipoTableroNombre}` : proyecto.nombre;
}

// Barra superior del telefono (prototipo "Tablero en teléfono"): menu, titulo, tema y quien ingreso
function BarraMovil({ titulo, nombreDelUsuario, alAbrirMenu }: { titulo: string; nombreDelUsuario: string; alAbrirMenu: () => void }) {
  return (
    <header className="sh-barra-movil">
      <button className="ui-btn ghost icon sm" type="button" aria-label="Abrir menú" onClick={alAbrirMenu}><Icono nombre="lista" /></button>
      <h1 className="sh-barra-titulo">{titulo}</h1>
      <span className="ui-spacer" />
      <BotonDeTema />
      <span className="ui-avatar sm" title={nombreDelUsuario}>{iniciales(nombreDelUsuario)}</span>
    </header>
  );
}

// Aviso de una pagina que en el telefono se usa desde la computadora
function SoloComputadora({ pagina }: { pagina: string }) {
  return (
    <section className="ui-card">
      <div className="ui-empty">
        <span className="ui-empty-icon"><Icono nombre="columnas" /></span>
        <p className="ui-empty-title">{`${pagina} se usa desde la computadora.`}</p>
        <p className="ui-empty-text">Abrí Shiro en una computadora para administrar usuarios, permisos, archivados e importaciones.</p>
      </div>
    </section>
  );
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

  const [lectura, setLectura] = useState(0);
  const esTelefono = useEsTelefono();
  const [menuAbierto, setMenuAbierto] = useState(false);
  // El cajon del menu se cierra al navegar
  const [rutaDelMenu, setRutaDelMenu] = useState(ruta);
  if (rutaDelMenu !== ruta) {
    setRutaDelMenu(ruta);
    setMenuAbierto(false);
  }
  // Ruta a la que ir cuando termine la proxima lectura (por ejemplo, el tablero de un proyecto recien importado)
  const destino = useRef<string | null>(null);

  // Lee los proyectos y catalogos al entrar y cada vez que la administracion o la importacion los cambian
  useEffect(() => {
    let vigente = true;
    leerDatos()
      .then((leidos) => {
        if (!vigente) return;
        setDatos(leidos);
        if (destino.current) navegar(destino.current);
        destino.current = null;
      })
      .catch((e) => vigente && setError(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [lectura]);

  const elegida = leerRuta(ruta);
  const general = [...GENERALES, ...(esAdministrador ? DE_ADMINISTRACION : [])].find((g) => ruta === `/${g}`) ?? null;
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

  const menu = (movil?: { nombreDelUsuario: string; rol: string | null; alCerrar: () => void }) => (
    <MenuLateral proyectos={datos?.proyectos ?? []} proyecto={proyectoDelMenu} codigoDeTablero={elegida?.codigo ?? null} seccion={seccion ?? general}
      esAdministrador={esAdministrador} alCrearProyecto={() => setModal('proyecto')} alSalir={alSalir} movil={movil} />
  );
  // Tablero donde se crea una tarea nueva: el abierto o, desde el backlog, el principal
  const tableroParaCrear = tablero ?? proyecto?.tableros.find((t) => t.tipoTableroCodigo === 'PRINCIPAL') ?? null;
  const soloComputadora = esTelefono && general && SOLO_COMPUTADORA[general];

  return (
    <div className={`sh-espacio ${esTelefono ? 'is-movil' : ''}`}>
      {!esTelefono && menu()}
      {esTelefono && (
        <BarraMovil titulo={tituloMovil(proyecto, tablero, clave, seccion, general)} nombreDelUsuario={usuario.nombre || usuario.nombreDeUsuario}
          alAbrirMenu={() => setMenuAbierto(true)} />
      )}
      {esTelefono && menuAbierto && (
        <div className="ui-veil sh-menu-movil" role="dialog" aria-modal="true" aria-label="Menú" onClick={(e) => e.target === e.currentTarget && setMenuAbierto(false)}>
          {menu({ nombreDelUsuario: usuario.nombre || usuario.nombreDeUsuario, rol: esAdministrador ? 'Administrador' : null, alCerrar: () => setMenuAbierto(false) })}
        </div>
      )}
      <main className="ui-main sh-principal">
        {error && <ErrorConReintento mensaje={`No se pudo cargar tu espacio. ${error}`} alReintentar={() => {
          setError(null);
          setLectura((v) => v + 1);
        }} />}
        {!datos && !error && <div className="sh-carga-pantalla"><CargaDeShiro /></div>}
        {soloComputadora && <SoloComputadora pagina={soloComputadora} />}
        {datos && datos.proyectos.length === 0 && !general && (
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
        {general === 'archivados' && !soloComputadora && <Archivados esAdministrador={esAdministrador} />}
        {general === 'tokens' && <Tokens nombreDelUsuario={usuario.nombre || usuario.nombreDeUsuario} />}
        {general === 'administracion' && datos && !soloComputadora && (
          <Administracion usuario={usuario} proyectos={datos.proyectos} tiposDeTablero={datos.tiposDeTablero} alCrearProyecto={() => setModal('proyecto')}
            alCambiarProyectos={() => setLectura((v) => v + 1)} />
        )}
        {general === 'importar' && datos && !soloComputadora && (
          <Importacion tiposDeTablero={datos.tiposDeTablero} tiposDeTarea={datos.tiposDeTarea} alIrAlTablero={(prefijo) => {
            destino.current = rutaDeTablero(prefijo, 'PRINCIPAL');
            setLectura((v) => v + 1);
          }} />
        )}
        {proyecto && seccion === 'backlog' && datos && <Planificacion key={proyecto.uuid} proyecto={proyecto} tiposDeTablero={datos.tiposDeTablero}
          alNuevaTarea={() => setModal('tarea')} />}
        {proyecto && seccion === 'versiones' && datos && <Versiones key={proyecto.uuid} proyecto={proyecto} tiposDeTablero={datos.tiposDeTablero} />}
        {proyecto && clave && datos && (
          <DetalleDeTarea key={clave} proyecto={proyecto} clave={clave} tiposDeTablero={datos.tiposDeTablero} tiposDeTarea={datos.tiposDeTarea}
            usuario={usuario} />
        )}
        {proyecto && tablero && tipoDeTablero && (
          <Tablero proyecto={proyecto} tablero={tablero} tipoDeTablero={tipoDeTablero} version={version} alNuevaTarea={() => setModal('tarea')}
            alImportar={esAdministrador && !esTelefono ? () => navegar('/importar') : undefined} />
        )}
      </main>
      {modal === 'tarea' && proyecto && tableroParaCrear && datos && (
        <CrearTareaModal proyecto={proyecto} tableroUuid={tableroParaCrear.uuid} tipos={datos.tiposDeTarea}
          alCrear={() => setVersion((v) => v + 1)} alCerrar={() => setModal(null)} />
      )}
      {modal === 'proyecto' && <CrearProyectoModal alCrear={alCrearProyecto} alCerrar={() => setModal(null)} />}
    </div>
  );
}
