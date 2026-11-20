// Usuarios y permisos (T6.5, prototipos de administración): solo para el super admin y los Administradores. Pestañas
// Usuarios, Grupos, Permisos y Proyectos; desde el encabezado se crea una cuenta de Shiro o un proyecto. Lee una vez
// los usuarios con sus grupos (GET /usuario/administracion) y los grupos, y los vuelve a leer después de cada cambio.
import { useState } from 'react';
import { pedir } from '../api/cliente';
import { pedidoDePaginado, type Pagina, type ProyectoDTO, type TipoTableroDTO, type UsuarioDTO } from '../api/tipos';
import { Encabezado } from '../componentes/Encabezado';
import { Icono } from '../componentes/Icono';
import { AlertaDeError } from '../componentes/Modal';
import { useAccion } from '../componentes/useAccion';
import { useLectura } from '../componentes/useLectura';
import { SUPER_ADMIN, tieneGrupo, type Grupo, type UsuarioAdministrado } from './administracion/comun';
import { CuentaDeShiroModal } from './administracion/CuentaDeShiroModal';
import { Grupos } from './administracion/Grupos';
import { Permisos } from './administracion/Permisos';
import { ProyectosAdministrados } from './administracion/ProyectosAdministrados';
import { Usuarios } from './administracion/Usuarios';

type Props = {
  usuario: UsuarioDTO;
  proyectos: ProyectoDTO[];
  tiposDeTablero: TipoTableroDTO[];
  alCrearProyecto: () => void;
  alCambiarProyectos: () => void;
};

type Pestana = 'usuarios' | 'grupos' | 'permisos' | 'proyectos';

type Datos = { usuarios: UsuarioAdministrado[]; grupos: Grupo[] };

export function Administracion({ usuario, proyectos, alCrearProyecto, alCambiarProyectos }: Props) {
  const [pestana, setPestana] = useState<Pestana>('usuarios');
  const [vuelta, setVuelta] = useState(0);
  const [creandoCuenta, setCreandoCuenta] = useState(false);
  const { aviso, setAviso, error, ejecutar } = useAccion(() => setVuelta((v) => v + 1));

  const { datos, error: errorDeCarga } = useLectura<Datos>(async () => {
    const [usuarios, grupos] = await Promise.all([
      pedir<UsuarioAdministrado[]>('GET', '/usuario/administracion'),
      pedir<Pagina<Grupo>>('POST', '/rol/paginar', pedidoDePaginado([], 'nombre', 200)),
    ]);
    return { usuarios, grupos: grupos.contenido };
  }, vuelta);

  const avisar = (mensaje: string) => {
    setAviso(mensaje);
    setVuelta((v) => v + 1);
  };
  const yo = datos?.usuarios.find((u) => u.uuid === usuario.uuid);
  const soySuperAdmin = yo ? tieneGrupo(yo, SUPER_ADMIN) : false;
  const pestanas: { id: Pestana; nombre: string }[] = [
    { id: 'usuarios', nombre: `Usuarios (${datos ? datos.usuarios.filter((u) => !u.archivado).length : '…'})` },
    { id: 'grupos', nombre: `Grupos (${datos ? datos.grupos.filter((g) => g.nombre !== SUPER_ADMIN).length : '…'})` },
    { id: 'permisos', nombre: 'Permisos' },
    { id: 'proyectos', nombre: `Proyectos (${proyectos.length})` },
  ];

  return (
    <>
      <Encabezado migas={['Administración', 'Usuarios y permisos']} titulo="Usuarios y permisos">
        <button className="ui-btn" type="button" disabled={!datos} onClick={() => setCreandoCuenta(true)}><Icono nombre="llave" />Cuenta de Shiro</button>
        <button className="ui-btn solid" type="button" onClick={alCrearProyecto}><Icono nombre="mas" />Crear proyecto</button>
      </Encabezado>
      {aviso && <div className="ui-alert is-success" role="status"><span>{aviso}</span></div>}
      <AlertaDeError mensaje={errorDeCarga ? `No se pudieron cargar los usuarios. ${errorDeCarga}` : error} />
      <section className="ui-card sh-tarjeta">
        <div className="ui-tabs" role="tablist" aria-label="Administración">
          {pestanas.map((p) => (
            <button key={p.id} type="button" role="tab" className="ui-tab" aria-selected={p.id === pestana} onClick={() => setPestana(p.id)}>{p.nombre}</button>
          ))}
        </div>
        {!datos && !errorDeCarga && pestana !== 'proyectos' && <div className="ui-skel sh-task-skel" aria-hidden="true" />}
        {datos && pestana === 'usuarios' && (
          <Usuarios usuarios={datos.usuarios} grupos={datos.grupos} soySuperAdmin={soySuperAdmin} ejecutar={ejecutar} avisar={avisar} />
        )}
        {datos && pestana === 'grupos' && (
          <Grupos usuarios={datos.usuarios} grupos={datos.grupos} soySuperAdmin={soySuperAdmin} ejecutar={ejecutar} avisar={avisar}
            alVerPermisos={() => setPestana('permisos')} />
        )}
        {datos && pestana === 'permisos' && <Permisos proyectos={proyectos} grupos={datos.grupos} usuarios={datos.usuarios} />}
        {pestana === 'proyectos' && <ProyectosAdministrados alCambiar={alCambiarProyectos} />}
      </section>
      {creandoCuenta && datos && (
        <CuentaDeShiroModal grupos={datos.grupos} alCerrar={() => setCreandoCuenta(false)} alCrear={(nombre) => {
          setCreandoCuenta(false);
          avisar(`Se creó la cuenta de ${nombre}. Compartí la contraseña por un canal seguro.`);
        }} />
      )}
    </>
  );
}
