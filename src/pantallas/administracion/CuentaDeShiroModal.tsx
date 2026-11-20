// Crear cuenta de Shiro (T6.5, prototipo "Crear cuenta de Shiro", propuesta 56 resuelta el 20/11): para quien no tiene
// cuenta de Google de la empresa. Pide nombre, nombre de usuario, correo y grupos; el backend genera la contraseña
// inicial (POST /usuario/crear-cuenta) y se muestra una sola vez para copiarla y compartirla por un canal seguro. La
// importación desde Jira lo abre con el nombre y el correo de la persona de Jira.
import { useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import { CampoDeTexto } from '../../componentes/CampoDeTexto';
import { AlertaDeError, Modal } from '../../componentes/Modal';
import { useEnvio } from '../../componentes/useEnvio';
import { ADMINISTRADORES, SUPER_ADMIN, type Grupo } from './comun';
import { BotonDeAccion } from '../../componentes/BotonDeAccion';

type Props = {
  grupos: Grupo[];
  inicial?: { nombre: string; correo: string };
  alCrear: (nombre: string) => void;
  alCerrar: () => void;
};

type Creada = { uuid: string; nombre: string; contrasena: string };

export function CuentaDeShiroModal({ grupos, inicial, alCrear, alCerrar }: Props) {
  const id = useId();
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [usuario, setUsuario] = useState('');
  const [correo, setCorreo] = useState(inicial?.correo ?? '');
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [creada, setCreada] = useState<Creada | null>(null);
  const [copiada, setCopiada] = useState(false);
  const { enviando, error, setError, enviar } = useEnvio();
  const comunes = grupos.filter((g) => g.nombre !== SUPER_ADMIN && g.nombre !== ADMINISTRADORES);

  const crear = () => enviar(async () => {
    setCreada(await pedir<Creada>('POST', '/usuario/crear-cuenta', {
      nombre: nombre.trim(), nombreDeUsuario: usuario.trim(), email: correo.trim(), grupos: elegidos,
    }));
  });
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(creada?.contrasena ?? '');
      setCopiada(true);
    } catch {
      setError('No se pudo copiar. Seleccioná la contraseña y copiala a mano.');
    }
  };

  if (creada) {
    return (
      <Modal titulo="Crear cuenta de Shiro" alCerrar={() => alCrear(creada.nombre)} ancho={520}
        pie={<button className="ui-btn solid" type="button" onClick={() => alCrear(creada.nombre)}>Listo</button>}>
        <div className="ui-alert is-success"><span>{`Se creó la cuenta de ${creada.nombre}. La contraseña no se vuelve a mostrar.`}</span></div>
        <div className="ui-field">
          <label className="ui-label" htmlFor={`${id}-k`}>Contraseña inicial</label>
          <div className="ui-row">
            <input id={`${id}-k`} className="ui-input sh-mono" readOnly value={creada.contrasena} />
            <button className="ui-btn sm" type="button" onClick={copiar}>{copiada ? 'Copiada' : 'Copiar'}</button>
          </div>
          <span className="ui-help">Compartila por un canal seguro.</span>
        </div>
        <AlertaDeError mensaje={error} />
      </Modal>
    );
  }

  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <BotonDeAccion clase="ui-btn solid" texto="Crear cuenta" enviando={enviando} deshabilitado={!nombre.trim() || !usuario.trim() || !correo.trim()} alHacerClic={crear} />
  </>;
  return (
    <Modal titulo="Crear cuenta de Shiro" alCerrar={alCerrar} pie={pie} ancho={520}>
      <p className="ui-muted" style={{ margin: 0 }}>Para quien no tiene cuenta de Google de la empresa. La contraseña inicial la genera Shiro.</p>
      <CampoDeTexto id={`${id}-n`} etiqueta="Nombre y apellido" valor={nombre} alCambiar={setNombre} />
      <CampoDeTexto id={`${id}-u`} etiqueta="Nombre de usuario" valor={usuario} alCambiar={setUsuario} ayuda="Con este nombre ingresa a Shiro." />
      <CampoDeTexto id={`${id}-c`} etiqueta="Correo" tipo="email" valor={correo} alCambiar={setCorreo} />
      {comunes.length > 0 && (
        <fieldset className="ui-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="ui-label">Grupos</legend>
          <div className="ui-row" style={{ flexWrap: 'wrap' }}>
            {comunes.map((g) => (
              <label key={g.uuid} className="ui-check">
                <input type="checkbox" checked={elegidos.includes(g.uuid)}
                  onChange={() => setElegidos((antes) => antes.includes(g.uuid) ? antes.filter((x) => x !== g.uuid) : [...antes, g.uuid])} />{g.nombre}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <AlertaDeError mensaje={error} />
    </Modal>
  );
}
