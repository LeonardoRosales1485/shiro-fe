// Paso 5 de importar desde Jira (T6.5, prototipos "Importación en curso" y "Importar desde Jira · resumen"): mientras
// corre en segundo plano muestra que sigue (se puede cerrar la pantalla); al terminar, cuántas tareas, comentarios,
// sprints y versiones se importaron y lo que hay que revisar (fallas, advertencias y usuarios creados sin acceso).
import { fecha } from '../../componentes/catalogos';
import type { ImportacionDTO, Resumen } from './mapeo';

type Props = { importacion: ImportacionDTO; ocupado: boolean; alVolverAImportar: () => void; alIrAlTablero: () => void };

// Resumen guardado como JSON en la importacion; null si todavia no hay
function leerResumen(importacion: ImportacionDTO): Resumen | null {
  try {
    return importacion.resumen ? JSON.parse(importacion.resumen) as Resumen : null;
  } catch {
    return null;
  }
}

export function ResumenDeImportacion({ importacion, ocupado, alVolverAImportar, alIrAlTablero }: Props) {
  const resumen = leerResumen(importacion);
  const enCurso = importacion.estado === 'EN_CURSO';
  const revisar = resumen ? resumen.fallas.length + resumen.advertencias.length + resumen.usuariosImportados.length : 0;
  return (
    <section className="ui-card sh-tarjeta" aria-label="Resumen de la importación">
      {enCurso && (
        <>
          <div className="ui-row" role="status"><span className="ui-spinner" aria-hidden="true" /><strong>Importando…</strong></div>
          <p className="ui-muted" style={{ margin: 0 }}>Podés cerrar esta pantalla: la importación sigue y el resumen queda en Importar desde Jira.</p>
        </>
      )}
      {importacion.estado === 'FALLIDA' && (
        <div className="ui-alert is-danger" role="alert"><span>La importación no pudo terminar. Revisá la conexión con Jira y volvé a importar.</span></div>
      )}
      {importacion.estado === 'TERMINADA' && (
        <div className="ui-alert is-success"><span>{`Importación terminada${importacion.fechaDeActualizacion ? ` el ${fecha(importacion.fechaDeActualizacion, true)}` : ''}. Validala con el equipo.`}</span></div>
      )}
      {resumen && !enCurso && (
        <>
          <div className="sh-cifras">
            <Cifra titulo="Tareas" valor={resumen.tareasCreadas + resumen.tareasActualizadas} detalle={`${resumen.tareasCreadas.toLocaleString('es-AR')} nuevas · ${resumen.tareasActualizadas.toLocaleString('es-AR')} actualizadas`} />
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
        <div className="ui-row" style={{ justifyContent: 'flex-end' }}>
          <button className="ui-btn" type="button" disabled={ocupado} onClick={alVolverAImportar}>Volver a importar</button>
          {importacion.estado === 'TERMINADA' && <button className="ui-btn solid" type="button" onClick={alIrAlTablero}>Ir al tablero</button>}
        </div>
      )}
      {!enCurso && <p className="ui-help" style={{ margin: 0 }}>Volver a importar trae los cambios hechos en Jira sin duplicar tareas.</p>}
    </section>
  );
}

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: number; detalle: string }) {
  return (
    <div className="ui-card sh-cifra">
      <span className="ui-label">{titulo}</span>
      <strong className="sh-cifra-valor">{valor.toLocaleString('es-AR')}</strong>
      <span className="ui-help">{detalle}</span>
    </div>
  );
}
