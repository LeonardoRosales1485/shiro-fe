// Espacio de trabajo con sesion (T6.1): carga los proyectos visibles y los catalogos, resuelve la ruta
// /proyecto/{prefijo}/{tablero} (sin ruta va al tablero principal del primer proyecto) y muestra el menu, el tablero
// y los modales de crear tarea y proyecto.
import { useEffect, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import { pedidoDePaginado, type Pagina, type ProyectoDTO, type TipoTableroDTO, type TipoTareaDTO } from '../api/tipos';
import { CrearProyectoModal } from '../componentes/CrearProyectoModal';
import { CrearTareaModal } from '../componentes/CrearTareaModal';
import { Icono } from '../componentes/Icono';
import { MenuLateral, rutaDeTablero } from '../componentes/MenuLateral';
import { navegar, useRuta } from '../navegacion/ruta';
import { Tablero } from './Tablero';

type Props = { esAdministrador: boolean; alSalir: () => void };

type Datos = { proyectos: ProyectoDTO[]; tiposDeTablero: TipoTableroDTO[]; tiposDeTarea: TipoTareaDTO[] };

// Prefijo y codigo de tablero de la ruta, o null si la ruta no es de un tablero
function leerRuta(ruta: string): { prefijo: string; codigo: string } | null {
  const partes = /^\/proyecto\/([A-Z]{2,6})\/([A-Z]+)$/.exec(ruta);
  return partes ? { prefijo: partes[1], codigo: partes[2] } : null;
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

export function Espacio({ esAdministrador, alSalir }: Props) {
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
  const proyecto = datos?.proyectos.find((p) => p.prefijo === elegida?.prefijo) ?? null;
  const tablero = proyecto?.tableros.find((t) => t.tipoTableroCodigo === elegida?.codigo) ?? null;
  const tipoDeTablero = datos?.tiposDeTablero.find((t) => t.uuid === tablero?.tipoTableroUuid) ?? null;

  useEffect(() => {
    if (datos && !tablero && datos.proyectos.length > 0) {
      navegar(rutaDeTablero(datos.proyectos[0].prefijo, 'PRINCIPAL'), true);
    }
  }, [datos, tablero]);

  const alCrearProyecto = (nuevo: ProyectoDTO) => {
    setModal(null);
    setDatos((anteriores) => anteriores && { ...anteriores, proyectos: [...anteriores.proyectos, nuevo] });
    navegar(rutaDeTablero(nuevo.prefijo, 'PRINCIPAL'));
  };

  return (
    <div className="sh-espacio">
      <MenuLateral proyectos={datos?.proyectos ?? []} proyecto={proyecto} codigoDeTablero={elegida?.codigo ?? null}
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
