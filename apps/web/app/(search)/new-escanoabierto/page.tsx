import type { Metadata } from 'next';
import { Fragment } from 'react';
import { InfoPage } from '../../../components/sol/info-page';

// Índice del rediseño de Escaño Abierto con Sol. No está enlazado desde la navegación ni se indexa: es para revisar
// cada página antes de publicarla.
export const metadata: Metadata = {
  title: 'Escaño Abierto con Sol · Reforma Digital',
  robots: { index: false, follow: false },
};

const web = '/new-escanoabierto/web';

const secciones = [
  {
    titulo: 'Portada y pestañas',
    paginas: [
      ['Inicio', '/'],
      ['Elecciones 29N', '/elecciones/'],
      ['Geografía', '/geografia/'],
      ['¿Quién lo dijo?', '/quien-lo-dijo/'],
      ['Método', '/metodo/'],
    ],
  },
  {
    titulo: 'Actividad',
    paginas: [
      ['Por día', '/dias/'],
      ['Votaciones', '/votaciones/'],
      ['Leyes', '/leyes/'],
      ['Temas', '/temas/'],
      ['Preguntas al Gobierno', '/preguntas/'],
      ['Explora', '/explora/'],
      ['La semana en el Congreso', '/semana/'],
    ],
  },
  {
    titulo: 'Quién es quién',
    paginas: [
      ['Diputados', '/diputados/'],
      ['Ficha de un diputado', '/diputado/sanchez-perez-castejon-pedro/'],
      ['Grupos', '/grupos/'],
      ['Por orador', '/oradores/'],
      ['Organigrama del Estado', '/organigrama/'],
      ['Tus diputados (una provincia)', '/provincia/albacete/'],
    ],
  },
  {
    titulo: 'Entender',
    paginas: [
      ['Glosario', '/glosario/'],
      ['Cómo se hace una ley', '/como-ley/'],
      ['Un tema', '/tema/clima/'],
      ['Sobre el proyecto', '/sobre/'],
    ],
  },
];

export default function NewEscanoAbierto() {
  return (
    <InfoPage narrow>
      <span className="t-etiqueta info-etiqueta">VISTA PREVIA, SIN PUBLICAR</span>
      <h1>Escaño Abierto con Sol</h1>
      <p className="info-entradilla">
        El rediseño de Escaño Abierto con el sistema Sol, página a página. Los datos son los de{' '}
        <a href="https://www.escanoabierto.com">escanoabierto.com</a>; el código está en{' '}
        <code>apps/web/public/new-escanoabierto/web</code>.
      </p>
      {secciones.map(({ titulo, paginas }) => (
        <Fragment key={titulo}>
          <h2>{titulo}</h2>
          <ul>
            {paginas.map(([nombre, ruta]) => (
              <li key={ruta}>
                <a href={web + ruta}>{nombre}</a>
              </li>
            ))}
          </ul>
        </Fragment>
      ))}
    </InfoPage>
  );
}
