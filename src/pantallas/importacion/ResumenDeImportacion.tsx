// Paso 5 de importar desde Jira (T6.5, prototipos "Importación en curso" y "Importar desde Jira · resumen", propuesta
// 55 resuelta el 20/11): mientras corre muestra cuándo empezó, cuánto falta, el porcentaje y cuántas tareas,
// comentarios, sprints y versiones lleva de cuántos hay, y permite cancelarla (no queda nada de esa ejecución); se
// puede cerrar la pantalla. Al terminar muestra lo importado y lo que hay que revisar.
import { CargaConAvance } from '../../componentes/Cargas';
import { fecha } from '../../componentes/catalogos';
import { leerJson, minutosRestantes, porcentaje, type Avance, type ImportacionDTO, type Resumen } from './mapeo';

type Props = {
  importacion: ImportacionDTO;
  ocupado: boolean;
  alVolverAImportar: () => void;
  alCancelar: () => void;
  alIrAlTablero: () => void;
};

const numero = (valor: number) => valor.toLocaleString('es-AR');

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });

export function ResumenDeImportacion({ importacion, ocupado, alVolverAImportar, alCancelar, alIrAlTablero }: Props) {
  const resumen = leerJson<Resumen>(importacion.resumen);
  const avance = leerJson<Avance>(importacion.avance);
  const enCurso = importacion.estado === 'EN_CURSO';
  const terminada = importacion.estado === 'TERMINADA';
  const revisar = resumen ? resumen.fallas.length + resumen.advertencias.length + resumen.usuariosImportados.length : 0;
  return (
    <section className="ui-card sh-tarjeta" aria-label="Resumen de la importación">
      {enCurso && <EnCurso avance={avance} cancelando={importacion.cancelacionPedida === true} ocupado={ocupado} alCancelar={alCancelar} />}
      {importacion.estado === 'FALLIDA' && (
        <div className="ui-alert is-danger" role="alert"><span>{`La importación no pudo terminar. ${resumen?.fallas[0]?.motivo ?? 'Revisá la conexión con Jira y volvé a importar.'}`}</span></div>
      )}
      {importacion.estado === 'CANCELADA' && (
        <div className="ui-alert is-warning" role="status"><span>Se canceló la importación: no se importó nada de esta ejecución.</span></div>
      )}
      {terminada && (
        <div className="ui-alert is-success"><span>{`Importación terminada${importacion.fechaDeActualizacion ? ` el ${fecha(importacion.fechaDeActualizacion, true)}` : ''}. Validala con el equipo.`}</span></div>
      )}
      {resumen && terminada && (
        <>
          <div className="sh-cifras">
            <Cifra titulo="Tareas" valor={resumen.tareasCreadas + resumen.tareasActualizadas} detalle={`${numero(resumen.tareasCreadas)} nuevas · ${numero(resumen.tareasActualizadas)} actualizadas`} />
            <Cifra titulo="Comentarios" valor={resumen.comentarios} detalle="nuevos" />
            <Cifra titulo="Sprints" valor={resumen.sprints} detalle="importados" />
            <Cifra titulo="Versiones" valor={resumen.versiones} detalle="importadas" />
          </div>
          <h3 className="ui-card-title" style={{ margin: 0 }}>{`Para revisar (${revisar})`}</h3>
          {revisar === 0 && <p className="ui-muted" style={{ margin: 0 }}>No hay nada para revisar.</p>}
          <ul className="sh-vinculos">
            {resumen.fallas.map((f) => <li key={`f-${f.claveJira}-${f.motivo}`}><span>{`No se importó ${f.claveJira}: ${f.motivo}`}</span></li>)}
            {resumen.advertencias.map((a) => <li key={`a-${a.claveJira}-${a.motivo}`}><span>{`${a.claveJira}: ${a.motivo}`}</span></li>)}
            {resumen.usuariosImportados.length > 0 && (
              <li><span>{`Usuarios creados sin acceso: ${resumen.usuariosImportados.join(', ')}. Sus tareas los tienen de responsable.`}</span></li>
            )}
          </ul>
        </>
      )}
      {!enCurso && (
        <>
          <div className="ui-row" style={{ justifyContent: 'flex-end' }}>
            <button className="ui-btn" type="button" disabled={ocupado} onClick={alVolverAImportar}>Volver a importar</button>
            {terminada && <button className="ui-btn solid" type="button" onClick={alIrAlTablero}>Ir al tablero</button>}
          </div>
          <p className="ui-help" style={{ margin: 0 }}>Volver a importar trae los cambios hechos en Jira sin duplicar tareas.</p>
        </>
      )}
    </section>
  );
}

// Importacion en curso: hora de inicio, tiempo estimado, porcentaje, conteos y cancelar
function EnCurso({ avance, cancelando, ocupado, alCancelar }: { avance: Avance | null; cancelando: boolean; ocupado: boolean; alCancelar: () => void }) {
  const hecho = avance ? porcentaje(avance) : 0;
  const faltan = avance ? minutosRestantes(avance) : null;
  const conteo = (nombre: string, hechos: number, totales: number | null) => (totales === null ? `${nombre}: leyendo de Jira…` : `${nombre} ${numero(hechos)} de ${numero(totales)}`);
  return (
    <>
      <div className="ui-row" role="status"><span className="ui-spinner" aria-hidden="true" /><strong>{cancelando ? 'Cancelando…' : 'Importando…'}</strong></div>
      {avance && (
        <p className="ui-muted" style={{ margin: 0 }}>
          {`Empezó a las ${hora(avance.inicio)}${faltan ? ` · faltan unos ${faltan} ${faltan === 1 ? 'minuto' : 'minutos'}` : ''}`}
        </p>
      )}
      <CargaConAvance porcentaje={hecho} etiqueta="Avance de la importación" />
      {avance && (
        <ul className="sh-vinculos">
          <li><span>{conteo('Tareas', avance.tareas, avance.tareasTotales)}</span></li>
          <li><span>{avance.comentariosTotales === null && avance.tareasTotales !== null
            ? `Comentarios: leyendo de Jira (${numero(avance.tareasConComentariosLeidos)} de ${numero(avance.tareasTotales)} tareas)`
            : conteo('Comentarios', avance.comentarios, avance.comentariosTotales)}</span></li>
          <li><span>{conteo('Sprints', avance.sprints, avance.sprintsTotales)}</span></li>
          <li><span>{conteo('Versiones', avance.versiones, avance.versionesTotales)}</span></li>
        </ul>
      )}
      <p className="ui-muted" style={{ margin: 0 }}>Podés cerrar esta pantalla: la importación sigue y el resumen queda en Importar desde Jira.</p>
      <div className="ui-row" style={{ justifyContent: 'flex-end' }}>
        <button className="ui-btn outline is-danger" type="button" disabled={cancelando || ocupado} onClick={alCancelar}>Cancelar importación</button>
      </div>
      <p className="ui-help" style={{ margin: 0 }}>Si la cancelás, no queda nada de esta ejecución: lo importado antes sigue igual.</p>
    </>
  );
}

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: number; detalle: string }) {
  return (
    <div className="ui-card sh-cifra">
      <span className="ui-label">{titulo}</span>
      <strong className="sh-cifra-valor">{numero(valor)}</strong>
      <span className="ui-help">{detalle}</span>
    </div>
  );
}
