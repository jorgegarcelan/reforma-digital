import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@reforma-digital/design/ui/table';
import { getHistory } from '../../lib/congreso/data';
import { municipalityVotes } from '../../lib/congreso/queries';
import { electionsHref } from '../../lib/elecciones/pages';
import { Filters, Pagination } from '../congreso/common';
import { MunicipalMap, type MapGroup } from './municipal-map';
import { Cell, Grid, Heading, ReportIntro } from './report';

const nationalists = ['BILDU', 'ERC', 'BNG', 'PNV', 'CIU', 'CC'];
const percent = (n: number) =>
  `${(n * 100).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

// «Municipio a municipio»: el voto de 2019 y 2023 en los 8.131 municipios y cuánto cambió entre las
// dos, con un buscador como alternativa al mapa. Estructura de Escaño Abierto.
export async function Municipalities({ query, page }: { query: string; page: number }) {
  const [history, votes] = await Promise.all([getHistory(), municipalityVotes(query, page)]);
  const recent = history.elecciones.filter((e) => e.id === '201911' || e.id === '202307');
  const voted = (families: string[]) =>
    recent.some((e) => families.some((f) => (e.fam[f]?.[0] ?? 0) > 0));
  const groups: MapGroup[] = history.familias.flatMap((f) => {
    if (nationalists.includes(f.id)) {
      return f.id === nationalists[0]
        ? [
            {
              id: 'NAC',
              name: 'Nacionalistas y regionalistas',
              color: '#8F8270',
              families: nationalists,
            },
          ]
        : [];
    }
    return [{ id: f.id, name: f.nombre, color: f.color, families: [f.id] }];
  });

  const present = groups.filter((g) => voted(g.families));
  // En la tabla, los grupos que se presentaron en 2023 (sin «Otros» aparte: completan el 100 %).
  const shown = present.filter((g) => g.id !== 'OTROS');

  return (
    <>
      <ReportIntro title="Municipio a municipio">
        <p>El voto de 2019 y 2023 en los 8.131 municipios y cuánto cambió entre las dos.</p>
      </ReportIntro>
      <Grid>
        <Cell>
          <MunicipalMap groups={present} />
        </Cell>
      </Grid>
      <section className="mt-16 grid gap-6">
        <Heading title="Busca tu municipio">
          El voto del 23 de julio de 2023 en cada municipio, por grupos de partidos.
        </Heading>
        <Filters action={electionsHref('mapa')} query={query} />
        <div className="overflow-x-auto rounded-2xl ring-1 ring-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Municipio</TableHead>
                <TableHead className="text-right">Participación</TableHead>
                {shown.map((g) => (
                  <TableHead key={g.id} className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <i className="block size-2 rounded-full" style={{ background: g.color }} />
                      {g.name}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {votes.rows.map(([code, name, row]) => {
                const total = row.slice(2).reduce((t, v) => t + v, 0) || 1;
                return (
                  <TableRow key={code}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {percent((row[1] ?? 0) / (row[0] || 1))}
                    </TableCell>
                    {shown.map((g) => (
                      <TableCell key={g.id} className="text-right font-mono tabular-nums">
                        {percent(
                          g.families.reduce(
                            (t, f) => t + (row[2 + votes.orden.indexOf(f)] ?? 0),
                            0,
                          ) / total,
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {!votes.rows.length && (
                <TableRow>
                  <TableCell colSpan={shown.length + 2} className="text-muted-foreground">
                    Ningún municipio con ese nombre.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination page={page} total={votes.total} params={{ q: query }} />
      </section>
      <p className="m-0 mt-6 max-w-[65ch] text-sm text-muted-foreground">
        Voto de los residentes en España (el voto desde el extranjero no se reparte por municipio).
        Fuente: Ministerio del Interior; geometrías del IGN.
      </p>
    </>
  );
}
