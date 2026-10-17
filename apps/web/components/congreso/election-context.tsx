import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@reforma-digital/design/ui/table';
import { Card, CardContent } from '@reforma-digital/design/ui/card';

import { balanceSchema, metricsSchema, ageSchema } from '../../lib/congreso/schema';
import Link from 'next/link';
import { electionsHref } from '../../lib/elecciones/pages';
import { Metrics } from '../elecciones/metrics';
import { Municipalities } from '../elecciones/municipalities';
import { Expiring } from '../elecciones/expiring';
import { LegislatureFigures } from '../elecciones/legislature';
import { Repeat } from '../elecciones/repeat';
import { ReportIntro, ReportSection, ReportStats } from '../elecciones/report';
import { getElections, read, congressUrl, getGeography } from '../../lib/congreso/data';
import { Source, Empty, Filters, Pagination, date, href, number } from './common';

export async function ElectionContext({
  detail,
  query,
  page,
}: {
  detail: string;
  query: string;
  page: number;
}) {
  const election = await getElections();
  const source = await read('elecciones/elecciones.json', balanceSchema);
  if (detail === 'caducan') return <Expiring />;
  if (detail === 'legislatura') return <LegislatureFigures />;
  if (detail === 'metricas') return <Metrics />;
  if (detail === 'mapa') return <Municipalities query={query} page={page} />;
  if (detail === 'voto') {
    const age = await read('elecciones/voto-edad.json', ageSchema);
    const geography = await getGeography();
    return (
      <>
        <ReportIntro title="La geografía del voto">
          <p>
            La edad, la renta y el territorio ayudan a describir agregados; no permiten inferir el
            voto de una persona.
          </p>
        </ReportIntro>
        <ReportSection title="Voto por edad">
          <p>{age.fuente}. Estimaciones ajustadas al resultado, no recuentos individuales.</p>
          <div
            className={
              'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
            }
          >
            {age.edades.map((label, i) => (
              <Card
                key={label}
                render={
                  <article
                    className={
                      'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                    }
                  />
                }
              >
                <CardContent>
                  <h3>{label}</h3>
                  <ReportStats
                    items={Object.entries(age.ajustado[i] || {}).map(([p, n]) => [`${n} %`, p])}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          <Source url={age.url}>Estudio de origen</Source>
        </ReportSection>
        <ReportSection title="El territorio">
          <div
            className={
              'cg-grid grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-5 [@media(max-width:_800px)]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media(max-width:_560px)]:[grid-template-columns:1fr]'
            }
          >
            {Object.entries(geography.provincias).map(([id, p]) => (
              <Card
                key={id}
                render={
                  <Link
                    className={
                      'cg-card [overflow-wrap:anywhere] [&_h2]:[font-size:28px] [&_h3]:text-lg [&_h3]:[line-height:1.3] [&_h3]:[margin:12px_0] [&_p]:[color:var(--text-secondary)] [&_p]:[margin:12px_0] [&_.cg-stats]:gap-5 [&_.cg-stats_dd]:[font-size:28px] [&_.cg-stats_dt]:[max-width:14ch]'
                    }
                    href={href(`geografia/${id}`)}
                  />
                }
              >
                <CardContent>
                  <h3>{p.n}</h3>
                  <p>
                    {number(p.renta)} € por persona · {p.edad} años de edad media · {p.dens}{' '}
                    habitantes/km²
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ReportSection>
      </>
    );
  }
  return <Repeat />;
}
