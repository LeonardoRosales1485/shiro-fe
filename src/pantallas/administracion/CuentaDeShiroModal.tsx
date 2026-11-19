// Crear cuenta de Shiro (T6.5, prototipo "Crear cuenta de Shiro"): para quien no tiene cuenta de Google de la empresa.
// Pide nombre y correo, propone una contraseña inicial al azar para copiar y compartir por un canal seguro, y los
// grupos. La persona ingresa con su correo como nombre de usuario.
import { useId, useState } from 'react';
import { pedir } from '../../api/cliente';
import { AlertaDeError, Modal } from '../../componentes/Modal';
import { useEnvio } from '../../componentes/useEnvio';
import { ADMINISTRADORES, SUPER_ADMIN, asignarGrupos, type Grupo } from './comun';

type Props = { grupos: Grupo[]; alCrear: (nombre: string) => void; alCerrar: () => void };

const CARACTERES = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Contraseña inicial al azar: cuatro bloques de cuatro caracteres sin los que se confunden (l, 1, O, 0)
export function contrasenaInicial(): string {
  const azar = new Uint32Array(16);
  crypto.getRandomValues(azar);
  const letras = Array.from(azar, (n) => CARACTERES[n % CARACTERES.length]).join('');
  return letras.match(/.{4}/g)?.join('-') ?? letras;
}

export function CuentaDeShiroModal({ grupos, alCrear, alCerrar }: Props) {
  const id = useId();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena] = useState(contrasenaInicial);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [copiada, setCopiada] = useState(false);
  const { enviando, error, setError, enviar } = useEnvio();
  const comunes = grupos.filter((g) => g.nombre !== SUPER_ADMIN && g.nombre !== ADMINISTRADORES);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(contrasena);
      setCopiada(true);
    } catch {
      setError('No se pudo copiar. Seleccioná la contraseña y copiala a mano.');
    }
  };
  const crear = () => enviar(async () => {
    const email = correo.trim();
    const creado = await pedir<{ uuid: string }>('POST', '/usuario/guardar', { nombre: nombre.trim(), nombreDeUsuario: email, email, contrasena });
    if (elegidos.length > 0) await asignarGrupos(creado.uuid, elegidos);
    alCrear(nombre.trim());
  });
  const pie = <>
    <button className="ui-btn ghost" type="button" onClick={alCerrar}>Cancelar</button>
    <button className="ui-btn solid" type="button" disabled={!nombre.trim() || !correo.trim() || enviando} onClick={crear}>Crear cuenta</button>
  </>;
  return (
    <Modal titulo="Crear cuenta de Shiro" alCerrar={alCerrar} pie={pie} ancho={520}>
      <p className="ui-muted" style={{ margin: 0 }}>Para quien no tiene cuenta de Google de la empresa.</p>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-n`}>Nombre y apellido</label>
        <input id={`${id}-n`} className="ui-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-c`}>Correo</label>
        <input id={`${id}-c`} className="ui-input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <span className="ui-help">Ingresa con este correo como nombre de usuario.</span>
      </div>
      <div className="ui-field">
        <label className="ui-label" htmlFor={`${id}-k`}>Contraseña inicial</label>
        <div className="ui-row">
          <input id={`${id}-k`} className="ui-input sh-mono" readOnly value={contrasena} />
          <button className="ui-btn sm" type="button" onClick={copiar}>{copiada ? 'Copiada' : 'Copiar'}</button>
        </div>
        <span className="ui-help">Compartila por un canal seguro.</span>
      </div>
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
