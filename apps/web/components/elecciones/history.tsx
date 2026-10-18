import Link from 'next/link';
import { cn } from '@reforma-digital/design/lib/utils';
import { buttonVariants } from '@reforma-digital/design/ui/button';
import { getGeography, getHistory, read, slug } from '../../lib/congreso/data';
import { historicalProvinceSchema, mapSchema } from '../../lib/congreso/schema';
import { electionLabel, thousands } from '../../lib/elecciones/format';
import { semicircle } from '../../lib/elecciones/hemicycle';
import { electionsHref } from '../../lib/elecciones/pages';
import { brand, shortParty } from '../../lib/elecciones/parties';
import { Icon } from '../brand/icon';
import { href } from '../congreso/common';
import { ProvinceMap, type MapProvince, type Winner } from './province-map';
import { ProvinceTable } from './province-table';
import { Cell, Grid, Label, Legend, ReportIntro, SectionHeading, Stat } from './report';
import { River, type RiverElection } from './river';
import { Tips } from './tips';
import { Years } from './years';

const percent = (n: number, digits = 1) =>
  `${(n * 100).toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })}\u00a0%`;
const longDate = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', ...options }).format(
    new Date(`${iso}T00:00:00Z`),
  );
const milestones: [string, string][] = [
  ['197706', 'Cortes constituyentes'],
  ['198210', 'Mayoría absoluta del PSOE'],
  ['199603', 'Primer Gobierno del PP'],
  ['201111', 'Mayoría absoluta del PP'],
  ['201512', 'Fin del bipartidismo'],
  ['201904', 'Entra Vox'],
];

// «Elecciones desde 1977»: la elección elegida (`?eleccion=AAAAMM`, la última si no hay) en su
// hemiciclo, los 350 escaños legislatura a legislatura, las 52 provincias en un mapa, quién ganó
// cada una en cada elección y la tabla de circunscripciones. Estructura de Escaño Abierto.
export async function ElectionHistory({ election }: { election?: string }) {
  const [history, map, geography] = await Promise.all([
    getHistory(),
    read('elecciones/geo-provincias.json', mapSchema),
    getGeography(),
  ]);
  const E = history.elecciones;
  const found = E.findIndex((x) => x.id === election);
  const k = found >= 0 ? found : E.length - 1;
  const e = E[k];
  if (!e) throw new Error('El histórico de elecciones está vacío');
  // El detalle de cada elección: el ganador de cada provincia es su candidatura más votada (no su
  // familia: en 2015, Podemos e IU iban por separado).
  const details = await Promise.all(
    E.map((x) => read(`elecciones/historico-${x.id}.json`, historicalProvinceSchema)),
  );
  const family = Object.fromEntries(history.familias.map((f) => [f.id, f]));
  const color = (id: string) => family[id]?.color ?? '#8A8F98';
  const label = (x: (typeof E)[number]) => electionLabel(E, x.fecha);
  const yearHref = (x: (typeof E)[number]) => `${electionsHref('historico')}?eleccion=${x.id}`;
  const codes = Object.keys(map.provincias).filter((c) => E.at(-1)?.prov[c]);
  const name = (code: string) => map.provincias[code]?.corto ?? code;
  const provinceHref = (code: string) => {
    const circ = map.provincias[code]?.circ;
    return circ ? href(`provincia/${slug(circ)}`) : electionsHref('historico');
  };
  const winner = (j: number, code: string): Winner | null => {
    const p = details[j]?.prov[code];
    const top = p && [...p.c].sort((a, b) => b[2] - a[2])[0];
    if (!p || !top) return null;
    const short = shortParty(top[0]);
    return {
      name: short,
      brand: brand(short),
      color: color(top[1]),
      share: top[2] / p.validos,
      seats: top[3],
    };
  };
  const winners = codes.map((code) => E.map((_, j) => winner(j, code)));
  const brandColor = Object.fromEntries(
    winners.flat().flatMap((w) => (w ? [[w.brand, w.color] as const] : [])),
  );
  // La candidatura más votada de una familia en una elección, para darle nombre.
  const topName = (x: (typeof E)[number], id: string) => {
    const top = x.partidos.filter(([, , f]) => f === id).sort((a, b) => b[3] - a[3])[0];
    return id === 'OTROS' || !top ? 'Otros' : shortParty(top[0]);
  };

  // La portada: el hemiciclo y la ficha de la elección.
  const withSeats = e.partidos.filter(([, , , , s]) => s > 0).sort((a, b) => b[4] - a[4]);
  const largest = withSeats[0];
  const hemicycle = semicircle();
  const seatColors = history.familias.flatMap((f) =>
    Array<string>(e.fam[f.id]?.[1] ?? 0).fill(f.color),
  );
  const legislature =
    e.legislatura === 'Constituyente' ? 'Cortes constituyentes' : `${e.legislatura} legislatura`;

  // El río: cada familia, con el nombre de su candidatura más votada en cada elección.
  const river: RiverElection[] = E.map((x) => ({
    id: x.id,
    href: yearHref(x),
    short: label(x),
    long: longDate(x.fecha, { month: 'long', year: 'numeric' }),
    start: x.fecha,
    end: x.hasta,
    valid: x.validos,
    fam: x.fam,
    names: Object.fromEntries(history.familias.map((f) => [f.id, topName(x, f.id)])),
  }));

  // Las provincias en la elección elegida.
  const provinces: MapProvince[] = codes.flatMap((code, i) => {
    const p = e.prov[code];
    const d = details[k]?.prov[code];
    if (!p || !d) return [];
    return [
      {
        code,
        name: name(code),
        href: provinceHref(code),
        seats: p.e,
        turnout: p.votantes / p.censo,
        price: p.validos / p.e,
        last: d.ultimo
          ? {
              from: shortParty(d.ultimo.gana),
              to: shortParty(d.ultimo.segundo),
              missing: d.ultimo.faltan,
            }
          : null,
        winner: winners[i]?.[k] ?? null,
        before: k > 0 ? (winners[i]?.[k - 1] ?? null) : null,
        shares: Object.fromEntries(Object.entries(p.fam).map(([f, [v]]) => [f, v / p.validos])),
        rows: d.c
          .filter(([, , v, s]) => s > 0 || v >= d.validos * 0.01)
          .sort((a, b) => b[2] - a[2])
          .slice(0, 7)
          .map(([siglas, f, v, s]) => [shortParty(siglas), color(f), v / d.validos, s]),
        history: winners[i]?.map((w) => w?.brand ?? null) ?? [],
      },
    ];
  });
  const byCode = Object.fromEntries(provinces.map((p) => [p.code, p]));
  const tipFor = (code: string) => {
    const p = byCode[code];
    if (!p) return undefined;
    return [
      p.winner && `Ganó ${p.winner.name} (${percent(p.winner.share)}).`,
      `${p.seats} ${p.seats === 1 ? 'escaño' : 'escaños'} · participación ${percent(p.turnout)} · ${thousands(p.price)} votos por escaño.`,
      p.last && `Último escaño por ${thousands(p.last.missing)} votos.`,
    ]
      .filter(Boolean)
      .join(' ');
  };
  // «Voto a…»: las familias con más del 1 % de los votos en toda España.
  const parties = history.familias
    .filter((f) => (e.fam[f.id]?.[0] ?? 0) >= e.validos * 0.01 && f.id !== 'OTROS')
    .sort((a, b) => (e.fam[b.id]?.[0] ?? 0) - (e.fam[a.id]?.[0] ?? 0))
    .slice(0, 9)
    .map((f) => ({ id: f.id, name: topName(e, f.id), color: f.color }));

  // Elección a elección: las provincias de cada comunidad, con su ganador en cada elección.
  const regions = Object.values(geography.ccaa).map((c) => ({
    name: c.n,
    codes: c.provincias.filter((code) => codes.includes(code)),
  }));
  const legend = new Map<string, string[]>();
  for (const w of winners.flat()) {
    if (!w) continue;
    const names = legend.get(w.color) ?? [];
    if (!names.includes(w.brand)) legend.set(w.color, [...names, w.brand]);
  }

  return (
    <>
      <ReportIntro title="Elecciones desde 1977">
        <p>
          Las {E.length} generales y sus {codes.length} provincias: el hemiciclo de cada una, quién
          ganó dónde y cómo ha cambiado cada circunscripción.
        </p>
      </ReportIntro>
      <Years
        current={e.id}
        items={E.map((x) => ({ id: x.id, label: label(x), href: yearHref(x) }))}
      />
      <Grid>
        <Cell span={7}>
          <svg
            viewBox={hemicycle.box}
            role="img"
            aria-label={`Hemiciclo de ${label(e)}: ${withSeats.map(([s, , , , n]) => `${shortParty(s)} ${n}`).join(', ')}`}
            className="block h-auto w-full"
          >
            {hemicycle.points.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={5.3} fill={seatColors[i] ?? 'var(--muted)'} />
            ))}
            <text
              x={hemicycle.label.x}
              y={hemicycle.label.y}
              textAnchor="middle"
              className="fill-foreground font-heading"
              style={{ fontSize: hemicycle.label.size }}
            >
              {label(e)}
            </text>
          </svg>
          <Legend
            items={[
              ...withSeats.slice(0, 8).map(([s, , f, , n]) => ({
                label: `${shortParty(s)} ${n}`,
                color: color(f),
              })),
              ...(withSeats.length > 8
                ? [{ label: `y ${withSeats.length - 8} más`, color: 'transparent' }]
                : []),
            ]}
          />
        </Cell>
        <Cell span={5}>
          <Label>
            {longDate(e.fecha, { day: 'numeric', month: 'long', year: 'numeric' })} · {legislature}
          </Label>
          <div className="grid gap-1">
            <p className="m-0 text-sm text-muted-foreground">Presidencia</p>
            <p className="m-0 text-lg font-medium">
              {e.presidentes.length
                ? e.presidentes.join(' · ')
                : 'Ninguna investidura: se repitieron las elecciones'}
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-4">
            <Stat value={percent(e.votantes / e.censo)} caption="participación" />
            <Stat value={withSeats.length} caption="candidaturas con escaño" />
            <Stat
              value={largest && largest[4] >= 176 ? 'Sí' : 'No'}
              caption={`mayoría absoluta${largest && largest[4] >= 176 ? ` (${shortParty(largest[0])})` : ''}`}
            />
          </div>
          <ul className="relative m-0 grid list-none gap-1.5 p-0 text-sm">
            {withSeats.slice(0, 7).map(([s, full, f, v, n]) => (
              <li
                key={s}
                title={full}
                className="grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_2.5rem_3.5rem] items-center gap-2"
              >
                <span className="font-medium break-words">{shortParty(s)}</span>
                <span className="relative h-3 rounded-[2px] bg-muted">
                  <i
                    className="absolute inset-y-0 left-0 block rounded-[2px]"
                    style={{ width: `${(n / 350) * 100}%`, background: color(f) }}
                  />
                  <i
                    className="absolute -inset-y-1 block w-px border-l border-dashed border-foreground"
                    style={{ left: `${(176 / 350) * 100}%` }}
                  />
                </span>
                <b className="text-right font-mono font-medium tabular-nums">{n}</b>
                <span className="text-right font-mono text-muted-foreground tabular-nums">
                  {percent(v / e.validos)}
                </span>
              </li>
            ))}
            <li className="grid grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_2.5rem_3.5rem] gap-2">
              <span />
              <span className="relative h-5">
                <span
                  className="absolute -translate-x-1/2 font-mono text-sm whitespace-nowrap text-muted-foreground"
                  style={{ left: `${(176 / 350) * 100}%` }}
                >
                  176 · mayoría absoluta
                </span>
              </span>
            </li>
          </ul>
          <Link
            href={electionsHref(e.id)}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'justify-self-start')}
          >
            La elección y su legislatura, en detalle <Icon name="derecha" size={16} />
          </Link>
        </Cell>
      </Grid>

      <section className="mt-16 grid gap-6">
        <SectionHeading title="Los 350 escaños, legislatura a legislatura">
          Cada familia en su sitio, de 1977 a la disolución de {E.at(-1)?.hasta.slice(0, 4)}, con el
          nombre de su candidatura más votada en cada elección. Pulsa una legislatura para verla en
          toda la página.
        </SectionHeading>
        <Grid>
          <Cell>
            <River
              elections={river}
              families={history.familias.map((f) => ({ id: f.id, color: f.color }))}
              selected={k}
              milestones={milestones.flatMap(([id, text]) => {
                const j = E.findIndex((x) => x.id === id);
                return j >= 0 ? [{ index: j, text }] : [];
              })}
            />
          </Cell>
        </Grid>
      </section>

      <section id="provincias" className="mt-16 grid scroll-mt-28 gap-6">
        <SectionHeading title="Provincia a provincia">
          Las {codes.length} circunscripciones en {label(e)}. Pulsa una provincia para ver su
          resultado.
        </SectionHeading>
        <Grid>
          <ProvinceMap
            key={e.id}
            year={label(e)}
            previous={k > 0 && E[k - 1] ? label(E[k - 1]!) : null}
            years={E.map(label)}
            provinces={provinces}
            parties={parties}
            brandColor={brandColor}
            centres={Object.fromEntries(codes.map((c) => [c, map.provincias[c]?.c ?? [0, 0]]))}
            size={[map.ancho, map.alto]}
            map={
              <svg
                key="mapa"
                viewBox={`0 0 ${map.ancho} ${map.alto}`}
                aria-hidden="true"
                className="block h-auto w-full"
              >
                {codes.map((code) => (
                  <path
                    key={code}
                    d={map.provincias[code]?.d}
                    data-province={code}
                    data-tip={`${name(code)} · ${label(e)}`}
                    data-tip-text={tipFor(code)}
                    data-tip-color={byCode[code]?.winner?.color}
                    className="cursor-pointer fill-muted stroke-background"
                    strokeWidth={0.8}
                  />
                ))}
                <path d={map.canarias} fill="none" className="stroke-border" strokeWidth={0.8} />
              </svg>
            }
          />
        </Grid>
      </section>

      <section className="mt-16 grid gap-6">
        <SectionHeading title="Elección a elección">
          Quién ganó cada provincia en las {E.length} generales. Pulsa un año para verlo arriba;
          pulsa una provincia para abrir su ficha.
        </SectionHeading>
        <Grid>
          <Cell>
            <div className="overflow-x-auto">
              <Tips>
                <table className="w-full min-w-[40rem] table-fixed border-separate border-spacing-0.5 text-sm">
                  <thead>
                    <tr>
                      <th className="w-36" />
                      {E.map((x, j) => (
                        <th key={x.id} className="p-0 font-normal">
                          <Link
                            href={yearHref(x)}
                            scroll={false}
                            aria-current={j === k ? 'page' : undefined}
                            title={longDate(x.fecha, { month: 'long', year: 'numeric' })}
                            className={cn(
                              buttonVariants({
                                variant: j === k ? 'default' : 'ghost',
                                size: 'xs',
                              }),
                              'w-full',
                            )}
                          >
                            ’{label(x).slice(2, 4)}
                            {label(x).length > 4 ? label(x)[5] : ''}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  {regions.map((r) => (
                    <tbody key={r.name}>
                      <tr>
                        <th
                          colSpan={E.length + 1}
                          className="pt-3 pb-1 text-left font-mono text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase"
                        >
                          {r.name}
                        </th>
                      </tr>
                      {r.codes.map((code) => {
                        const i = codes.indexOf(code);
                        return (
                          <tr key={code}>
                            <th className="pr-3 text-left font-normal whitespace-nowrap">
                              <Link href={provinceHref(code)}>{name(code)}</Link>
                            </th>
                            {E.map((x, j) => {
                              const w = winners[i]?.[j];
                              const p = x.prov[code];
                              return (
                                <td
                                  key={x.id}
                                  className={cn(
                                    'h-5 min-w-6 rounded-[2px] p-0',
                                    j === k && 'outline-1 outline-foreground',
                                  )}
                                  style={{ background: w?.color ?? 'transparent' }}
                                  data-tip={w ? `${name(code)} · ${label(x)}` : undefined}
                                  data-tip-text={
                                    w && p
                                      ? `Ganó ${w.name} con el ${percent(w.share)} de los votos; ${w.seats} de ${p.e} ${p.e === 1 ? 'escaño' : 'escaños'}.`
                                      : undefined
                                  }
                                  data-tip-color={w?.color}
                                />
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  ))}
                </table>
              </Tips>
            </div>
            <Legend
              small
              items={[...legend].map(([c, names]) => ({ label: names.join(' · '), color: c }))}
            />
          </Cell>
        </Grid>
      </section>

      <section className="mt-16 grid gap-6">
        <ProvinceTable
          key={e.id}
          year={label(e)}
          selected={k}
          rows={provinces.map((p) => ({
            code: p.code,
            name: p.name,
            href: p.href,
            seats: p.seats,
            seatsHistory: E.map((x) => x.prov[p.code]?.e ?? null),
            turnout: p.turnout,
            price: p.price,
            winner: p.winner ? { name: p.winner.name, color: p.winner.color } : null,
            margin: p.last?.missing ?? null,
          }))}
        />
        <p className="m-0 max-w-[65ch] text-sm text-muted-foreground">
          Fuente: Ministerio del Interior, resultados oficiales de las elecciones al Congreso. Las
          candidaturas se agrupan con su cabecera nacional y cada una se asigna a una familia con
          reglas fijas, iguales para las {E.length} elecciones. Votos válidos en {label(e)}:{' '}
          {thousands(e.validos)}.
        </p>
      </section>
    </>
  );
}
