// Confirmacion de una accion que cambia datos (archivar un usuario, un grupo o un proyecto): pregunta, explica que
// pasa y corre la accion; si falla muestra el error sin cerrar.
import type { ReactNode } from 'react';
import { AlertaDeError, Modal } from './Modal';
import { useEnvio } from './useEnvio';

type Props = {
  titulo: string;
  pregunta: string;
  accion: string;
  alConfirmar: () => Promise<unknown>;
  alCerrar: () => void;
  children?: ReactNode;
};

export function ConfirmarModal({ titulo, pregunta, accion, alConfirmar, alCerrar, children }: Props) {
  const { enviando, error, enviar } = useEnvio();
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid is-danger" type="button" disabled={enviando} onClick={() => enviar(async () => {
      await alConfirmar();
    })}>{accion}</button>
  </>;
  return (
    <Modal titulo={titulo} alCerrar={alCerrar} pie={pie} ancho={480}>
      <h3 className="ui-card-title" style={{ margin: 0 }}>{pregunta}</h3>
      {children}
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
