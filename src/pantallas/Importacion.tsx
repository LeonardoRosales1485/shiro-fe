// Importar desde Jira (T6.5, prototipos "Importar desde Jira"): solo para el super admin y los Administradores. Lista
// las importaciones anteriores y guía una nueva en cinco pasos: conexión, tableros, estados (y tipos), usuarios y
// resumen. La ejecución corre en segundo plano en el backend: se consulta su estado hasta que termina.
import { useEffect, useState } from 'react';
import { mensajeDeError, pedir } from '../api/cliente';
import type { Pagina, TipoTableroDTO, TipoTareaDTO } from '../api/tipos';
import { fecha } from '../componentes/catalogos';
import { Encabezado } from '../componentes/Encabezado';
import { AlertaDeError } from '../componentes/Modal';
import { useAccion } from '../componentes/useAccion';
import type { UsuarioAdministrado } from './administracion/comun';
import {
  CREAR, NOMBRES_DE_ESTADO, estadoPropuesto, tableroPropuesto, tipoPropuesto, type Catalogo, type ImportacionDTO,
} from './importacion/mapeo';
import { PasoConexion } from './importacion/PasoConexion';
import { PasoEstados, PasoTableros, claveDeEstado } from './importacion/PasosDeMapeo';
import { PasoUsuarios } from './importacion/PasoUsuarios';
import { ResumenDeImportacion } from './importacion/ResumenDeImportacion';

type Props = {
  tiposDeTablero: TipoTableroDTO[];
  tiposDeTarea: TipoTareaDTO[];
  alIrAlTablero: (prefijo: string) => void;
  // Milisegundos entre consultas del estado de una importacion en curso
  intervaloDeConsulta?: number;
};

const PASOS = ['Conexión', 'Tableros', 'Estados', 'Usuarios', 'Resumen'];

export function Importacion({ tiposDeTablero, tiposDeTarea, alIrAlTablero, intervaloDeConsulta = 2000 }: Props) {
  const [paso, setPaso] = useState(0);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [prefijo, setPrefijo] = useState('');
  const [tableros, setTableros] = useState<Record<string, string>>({});
  const [estados, setEstados] = useState<Record<string, string>>({});
  const [tipos, setTipos] = useState<Record<string, string>>({});
  const [dias, setDias] = useState(14);
  const [usuarios, setUsuarios] = useState<UsuarioAdministrado[]>([]);
  const [anteriores, setAnteriores] = useState<ImportacionDTO[] | null>(null);
  const [importacion, setImportacion] = useState<ImportacionDTO | null>(null);
  const { ocupado, error, setError, ejecutar } = useAccion(() => undefined);

  useEffect(() => {
    let vigente = true;
    pedir<Pagina<ImportacionDTO>>('POST', '/importacion/paginar', { pagina: 1, tamano: 20, filtros: [], ordenes: [{ campo: 'fechaDeCreacion', direccion: 'desc' }] })
      .then((pagina) => vigente && setAnteriores(pagina.contenido))
      .catch((e) => vigente && setError(mensajeDeError(e)));
    pedir<UsuarioAdministrado[]>('GET', '/usuario/administracion').then((leidos) => vigente && setUsuarios(leidos)).catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [setError]);

  // Mientras corre, vuelve a leer la importacion cada intervaloDeConsulta
  const enCurso = importacion?.estado === 'EN_CURSO' ? importacion.uuid : null;
  useEffect(() => {
    if (!enCurso) return undefined;
    const espera = setTimeout(() => {
      pedir<ImportacionDTO>('GET', `/importacion/uuid/${enCurso}`).then(setImportacion).catch((e) => setError(mensajeDeError(e)));
    }, intervaloDeConsulta);
    return () => clearTimeout(espera);
  }, [enCurso, importacion, intervaloDeConsulta, setError]);

  const alConectar = (leido: Catalogo, elegido: string) => {
    setCatalogo(leido);
    setPrefijo(elegido);
    setTableros(Object.fromEntries(leido.tableros.map((t, i) => [t.idJira, tableroPropuesto(i, tiposDeTablero)])));
    setTipos(Object.fromEntries(leido.tipos.map((t) => [t.idJira, tipoPropuesto(t, tiposDeTarea)])));
    setEstados({});
  };

  // Al pasar a estados, propone los que falten para cada tablero elegido (respeta los ya elegidos)
  const irAEstados = () => {
    if (!catalogo) return;
    const propuestos: Record<string, string> = {};
    for (const t of catalogo.tableros) {
      const tipo = tiposDeTablero.find((x) => x.uuid === tableros[t.idJira]);
      if (tipo) catalogo.estados.forEach((e) => { propuestos[claveDeEstado(t.idJira, e.idJira)] = estadoPropuesto(e, tipo); });
    }
    setEstados((antes) => ({ ...propuestos, ...Object.fromEntries(Object.entries(antes).filter(([clave]) => clave in propuestos)) }));
    setPaso(2);
  };

  const importar = () => ejecutar(async () => {
    if (!catalogo) return;
    const mapeo = {
      tableros: catalogo.tableros.filter((t) => tableros[t.idJira]).map((t) => ({
        idJira: t.idJira, tipoTableroUuid: tableros[t.idJira], estados: catalogo.estados.map((e) => {
          const elegido = estados[claveDeEstado(t.idJira, e.idJira)];
          return { idJira: e.idJira, estadoUuid: elegido === CREAR ? null : elegido, crear: elegido === CREAR };
        }),
      })),
      tipos: catalogo.tipos.filter((t) => tipos[t.idJira]).map((t) => ({
        idJira: t.idJira, tipoTareaUuid: tipos[t.idJira] === CREAR ? null : tipos[t.idJira], crear: tipos[t.idJira] === CREAR,
      })),
      duracionDeSprintEnDias: dias,
    };
    await pedir('POST', `/importacion/${catalogo.importacionUuid}/mapeo`, mapeo);
    setImportacion(await pedir<ImportacionDTO>('POST', `/importacion/${catalogo.importacionUuid}/ejecutar`));
    setPaso(4);
  }, null);

  const verResumen = (uuid: string) => ejecutar(async () => {
    setImportacion(await pedir<ImportacionDTO>('GET', `/importacion/uuid/${uuid}`));
    setPaso(4);
  }, null);
  const volverAImportar = () => importacion && ejecutar(async () => {
    setImportacion(await pedir<ImportacionDTO>('POST', `/importacion/${importacion.uuid}/ejecutar`));
  }, null);

  const algunTablero = Object.values(tableros).some(Boolean);
  return (
    <>
      <Encabezado migas={['Administración', 'Importar desde Jira']} titulo="Importar desde Jira" />
      <ol className="sh-pasos" aria-label="Pasos">
        {PASOS.map((nombre, i) => (
          <li key={nombre} className={i === paso ? 'is-actual' : i < paso ? 'is-hecho' : ''} aria-current={i === paso ? 'step' : undefined}>
            <span className="sh-paso-numero">{i + 1}</span>{nombre}
          </li>
        ))}
      </ol>
      <AlertaDeError mensaje={error} />
      {paso === 0 && (
        <>
          <PasoConexion alConectar={alConectar} />
          {catalogo && (
            <div className="ui-alert is-success" role="status">
              <span>{`Conectado con «${catalogo.nombreProyectoJira}»: ${catalogo.tableros.length} tableros, ${catalogo.tipos.length} tipos y ${catalogo.usuarios.length} usuarios.`}</span>
            </div>
          )}
          {catalogo && (
            <div className="ui-row" style={{ justifyContent: 'flex-end' }}>
              <button className="ui-btn solid" type="button" onClick={() => setPaso(1)}>Siguiente: tableros</button>
            </div>
          )}
          <Anteriores anteriores={anteriores} ocupado={ocupado} alVer={verResumen} />
          <p className="ui-help" style={{ margin: 0 }}>Se importan tareas, comentarios, sprints y versiones. El historial de cambios de Jira no se importa. Las claves de Jira se conservan como J-PREFIJO-número.</p>
        </>
      )}
      {paso === 1 && catalogo && (
        <>
          <PasoTableros catalogo={catalogo} tiposDeTablero={tiposDeTablero} tableros={tableros}
            alCambiar={(idJira, tipo) => setTableros((antes) => ({ ...antes, [idJira]: tipo }))} />
          <Navegacion alAnterior={() => setPaso(0)} siguiente="Siguiente: estados" deshabilitado={!algunTablero} alSiguiente={irAEstados} />
        </>
      )}
      {paso === 2 && catalogo && (
        <>
          <PasoEstados catalogo={catalogo} tiposDeTablero={tiposDeTablero} tiposDeTarea={tiposDeTarea} tableros={tableros} estados={estados} tipos={tipos} dias={dias}
            alCambiarEstado={(clave, valor) => setEstados((antes) => ({ ...antes, [clave]: valor }))}
            alCambiarTipo={(idJira, valor) => setTipos((antes) => ({ ...antes, [idJira]: valor }))} alCambiarDias={setDias} />
          <Navegacion alAnterior={() => setPaso(1)} siguiente="Siguiente: usuarios" deshabilitado={dias < 1 || dias > 90} alSiguiente={() => setPaso(3)} />
        </>
      )}
      {paso === 3 && catalogo && (
        <>
          <PasoUsuarios catalogo={catalogo} usuarios={usuarios} />
          <Navegacion alAnterior={() => setPaso(2)} siguiente="Importar" deshabilitado={ocupado} alSiguiente={importar} />
        </>
      )}
      {paso === 4 && importacion && (
        <ResumenDeImportacion importacion={importacion} ocupado={ocupado} alVolverAImportar={volverAImportar}
          alIrAlTablero={() => alIrAlTablero(importacion.prefijo || prefijo)} />
      )}
    </>
  );
}

// Botones Anterior y Siguiente de un paso
function Navegacion({ alAnterior, siguiente, deshabilitado, alSiguiente }: { alAnterior: () => void; siguiente: string; deshabilitado: boolean; alSiguiente: () => void }) {
  return (
    <div className="ui-row" style={{ justifyContent: 'flex-end' }}>
      <button className="ui-btn ghost" type="button" onClick={alAnterior}>Anterior</button>
      <button className="ui-btn solid" type="button" disabled={deshabilitado} onClick={alSiguiente}>{siguiente}</button>
    </div>
  );
}

// Importaciones anteriores con su estado; desde cada una se abre su resumen (y se vuelve a importar)
function Anteriores({ anteriores, ocupado, alVer }: { anteriores: ImportacionDTO[] | null; ocupado: boolean; alVer: (uuid: string) => void }) {
  if (!anteriores || anteriores.length === 0) return null;
  return (
    <section className="ui-card sh-tarjeta">
      <h2 className="ui-card-title" style={{ margin: 0 }}>Importaciones anteriores</h2>
      <div className="ui-table-wrap">
        <table className="ui-table" aria-label="Importaciones anteriores">
          <thead><tr><th>Prefijo</th><th>Proyecto en Jira</th><th>Estado</th><th>Última vez</th><th><span className="sh-sr">Acciones</span></th></tr></thead>
          <tbody>
            {anteriores.map((i) => (
              <tr key={i.uuid}>
                <td className="sh-mono">{i.prefijo}</td>
                <td>{i.nombreProyectoJira ?? i.claveProyectoJira ?? '—'}</td>
                <td>{NOMBRES_DE_ESTADO[i.estado]}</td>
                <td>{fecha(i.fechaDeActualizacion ?? i.fechaDeCreacion ?? null)}</td>
                <td>{['EN_CURSO', 'TERMINADA', 'FALLIDA'].includes(i.estado) && (
                  <button className="ui-btn ghost sm" type="button" aria-label={`Ver resumen de ${i.prefijo}`} disabled={ocupado} onClick={() => alVer(i.uuid)}>Ver resumen</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
