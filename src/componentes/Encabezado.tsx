// Encabezado de una pagina del espacio: la ubicacion (migas, la ultima es la pagina actual), el titulo y, a la
// derecha, las acciones de la pagina.
import type { ReactNode } from 'react';

type Props = { migas: string[]; titulo: ReactNode; children?: ReactNode };

export function Encabezado({ migas, titulo, children }: Props) {
  return (
    <>
      <div className="ui-page-head">
        <ol className="ui-crumbs" aria-label="Ubicación">
          {migas.map((miga, i) => (
            <li key={miga}>{i === migas.length - 1 ? <span aria-current="page">{miga}</span> : <span>{miga}</span>}</li>
          ))}
        </ol>
      </div>
      <div className="ui-page-head">
        <h1 className="ui-page-title">{titulo}</h1>
        <span className="ui-spacer" />
        {children}
      </div>
    </>
  );
}
