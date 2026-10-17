'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@reforma-digital/design/lib/utils';
import { Button } from '@reforma-digital/design/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@reforma-digital/design/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@reforma-digital/design/ui/tabs';
import { dhondt } from '../../lib/elecciones/dhondt';
import { ramp, thousands } from '../../lib/elecciones/format';
import { Cell, Heading, Label } from './report';
import { Tips } from './tips';

export type PriceProvince = {
  code: string;
  name: string;
  seats: number;
  valid: number;
  lost: number;
  // Las candidaturas con al menos el 0,5 % (las demás no cambian el reparto): [siglas, color, votos].
  parties: [string, string, number][];
};

const decimal = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = (n: number) => `${Math.round(n * 100)} %`;

// La provincia elegida manda en todo: la cifra grande, la balanza, el mapa y el simulador.
export function YourVote({
  provinces,
  initial,
  year,
  average,
  map,
  ranges,
  kpis,
  beside,
  middle,
}: {
  provinces: PriceProvince[];
  initial: string;
  year: string;
  average: number;
  map: ReactNode;
  ranges: { price: [number, number]; lost: [number, number] };
  kpis: ReactNode;
  beside: ReactNode;
  middle: ReactNode;
}) {
  const [code, setCode] = useState(initial);
  const [mode, setMode] = useState<'price' | 'lost'>('price');
  const byCode = new Map(provinces.map((p) => [p.code, p]));
  const price = (p: PriceProvince) => p.valid / p.seats;
  const sorted = [...provinces].sort((a, b) => price(a) - price(b));
  const cheapest = sorted[0];
  const dearest = sorted.at(-1);
  const current = byCode.get(code) ?? cheapest;
  const box = useRef<HTMLDivElement>(null);
  // El mapa llega dibujado del servidor con los dos colores de cada provincia (`data-price` y
  // `data-lost`): aquí se pinta el del modo elegido y se marca la provincia.
  useEffect(() => {
    for (const path of box.current?.querySelectorAll<SVGElement>('[data-province]') ?? []) {
      path.toggleAttribute('data-active', path.getAttribute('data-province') === code);
      path.style.fill = path.getAttribute(mode === 'price' ? 'data-price' : 'data-lost') ?? '';
    }
  }, [code, mode]);
  if (!current || !cheapest || !dearest) return null;

  const mine = price(current);
  const sentence =
    current.code === dearest.code ? (
      <>
        Es la provincia donde un escaño costó más votos. Un voto aquí pesa{' '}
        <b>{decimal(price(dearest) / price(cheapest))} veces menos</b> que uno de {cheapest.name}.
      </>
    ) : (
      <>
        {mine < average ? 'Menos' : 'Más'} que la media de España ({thousands(average)}). Un voto de{' '}
        {current.name} pesa <b>{decimal(price(dearest) / mine)} veces</b> uno de {dearest.name}
        {current.code === cheapest.code ? ', la que más' : ''}.
      </>
    );
  const choose = (next: string | null | undefined) => next && byCode.has(next) && setCode(next);
  const [low, high] = ranges[mode];

  return (
    <>
      <Cell className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center lg:gap-10">
        <div className="grid content-start gap-4">
          <Label>¿Cuánto vale tu voto?</Label>
          <ProvinceSelect provinces={provinces} value={current.code} onChange={choose} />
          <p className="m-0 grid gap-1" aria-live="polite">
            <b className="font-heading text-6xl leading-none font-normal tracking-tight tabular-nums lg:text-7xl">
              {thousands(mine)}
            </b>
            <span className="text-muted-foreground">votos costó cada escaño en {year}</span>
          </p>
          <p className="m-0 max-w-[48ch] text-sm leading-relaxed text-muted-foreground [&_b]:font-medium [&_b]:text-foreground">
            {sentence}
          </p>
        </div>
        <Balance provinces={provinces} selected={current.code} onSelect={choose} />
      </Cell>
      {kpis}
      <Cell span={6}>
        <Heading
          title={mode === 'price' ? 'Votos por escaño en cada provincia' : 'Votos que no sirvieron'}
        >
          {mode === 'price'
            ? 'Votos válidos entre escaños: cuanto más intenso, más caro. Pulsa una provincia para hacerla tuya.'
            : 'Parte de los votos de cada provincia que fue a candidaturas sin escaño allí. Con pocos escaños en juego se pierden muchos más.'}
        </Heading>
        <Tabs value={mode} onValueChange={(value) => setMode(value === 'lost' ? 'lost' : 'price')}>
          <TabsList aria-label="Qué se pinta">
            <TabsTrigger value="price" className="px-3">
              Votos por escaño
            </TabsTrigger>
            <TabsTrigger value="lost" className="px-3">
              Votos que no sirvieron
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div
          ref={box}
          className="[&_[data-active]]:stroke-foreground [&_[data-active]]:[stroke-width:2.5] [&_[data-province]]:cursor-pointer [&_[data-province]]:transition-[fill] [&_[data-province]]:duration-300"
          onClick={(event) =>
            choose(
              event.target instanceof Element
                ? event.target.closest('[data-province]')?.getAttribute('data-province')
                : null,
            )
          }
        >
          <Tips>{map}</Tips>
        </div>
        <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground">
          {mode === 'price' ? thousands(low) : percent(low)}
          <span
            className="block h-2.5 w-32 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${ramp(mode, 0)}, ${ramp(mode, 1)})`,
            }}
          />
          {mode === 'price' ? `${thousands(high)} votos` : percent(high)}
        </p>
      </Cell>
      {beside}
      {middle}
      <Simulator key={current.code} province={current} provinces={provinces} onProvince={choose} />
    </>
  );
}

function ProvinceSelect({
  provinces,
  value,
  onChange,
}: {
  provinces: PriceProvince[];
  value: string;
  onChange: (value: string | null) => void;
}) {
  const items = [...provinces]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((p) => ({ value: p.code, label: p.name }));
  return (
    <Select value={value} onValueChange={onChange} items={items}>
      <SelectTrigger aria-label="Provincia" className="w-full max-w-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// La balanza: cada provincia es una bola, del tamaño de sus escaños, de la más barata a la más cara.
function Balance({
  provinces,
  selected,
  onSelect,
}: {
  provinces: PriceProvince[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  const W = 640;
  const H = 170;
  const m = 16;
  const balls = useMemo(() => {
    const xs = provinces.map((p) => ({ p, v: p.valid / p.seats, r: 3 + Math.sqrt(p.seats) * 1.9 }));
    const low = Math.min(...xs.map((b) => b.v));
    const high = Math.max(...xs.map((b) => b.v));
    const placed: { p: PriceProvince; x: number; y: number; r: number }[] = [];
    // Enjambre: cada bola, en la primera altura libre alrededor del centro.
    for (const b of [...xs].sort((a, c) => c.r - a.r)) {
      const x = m + ((b.v - low) / (high - low || 1)) * (W - 2 * m);
      let y = H / 2;
      for (let k = 0; k < 60; k++) {
        y = H / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 3;
        if (placed.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + b.r + 1)) break;
      }
      placed.push({ p: b.p, x, y: Math.max(b.r, Math.min(H - b.r, y)), r: b.r });
    }
    return placed;
  }, [provinces]);
  const ends = [...balls].sort((a, b) => a.x - b.x);
  const labelled = [ends[0], ends.at(-1), balls.find((b) => b.p.code === selected)].filter(
    (b, i, all): b is (typeof balls)[number] => !!b && all.indexOf(b) === i,
  );
  return (
    <div className="grid gap-2">
      <p className="m-0 flex justify-between font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
        <span>Más barato</span>
        <span>Más caro</span>
      </p>
      <Tips>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Votos por escaño en cada provincia, de la más barata a la más cara"
          className="block h-auto w-full overflow-visible"
        >
          <line x1={m} x2={W - m} y1={H / 2} y2={H / 2} className="stroke-border" />
          {balls.map((b) => (
            <circle
              key={b.p.code}
              cx={b.x}
              cy={b.y}
              r={b.r}
              className={cn(
                'cursor-pointer transition-colors',
                b.p.code === selected
                  ? 'fill-foreground'
                  : 'fill-muted-foreground/35 hover:fill-muted-foreground/60',
              )}
              data-tip={b.p.name}
              data-tip-text={`${thousands(b.p.valid / b.p.seats)} votos por escaño · ${b.p.seats} escaños`}
              onClick={() => onSelect(b.p.code)}
            />
          ))}
          {labelled.map((b) => (
            <text
              key={b.p.code}
              x={Math.min(W - 4, Math.max(4, b.x))}
              y={b.y - b.r - 6}
              textAnchor={b.x < 60 ? 'start' : b.x > W - 60 ? 'end' : 'middle'}
              className={cn(
                'pointer-events-none text-[12px]',
                b.p.code === selected ? 'fill-foreground font-medium' : 'fill-muted-foreground',
              )}
            >
              {b.p.name}
            </text>
          ))}
        </svg>
      </Tips>
      <p className="m-0 text-sm text-muted-foreground">
        Cada bola es una provincia, del tamaño de sus escaños. Pulsa una para hacerla tuya.
      </p>
    </div>
  );
}

// «Juega con los votos»: el reparto D'Hondt de la provincia con sus votos reales, que se pueden
// cambiar; la tabla de cocientes dice por qué cada escaño fue a quien fue.
function Simulator({
  province,
  provinces,
  onProvince,
}: {
  province: PriceProvince;
  provinces: PriceProvince[];
  onProvince: (code: string | null) => void;
}) {
  const real = Object.fromEntries(province.parties.map(([name, , votes]) => [name, votes]));
  const color = Object.fromEntries(province.parties.map(([name, c]) => [name, c]));
  const rest = province.valid - Object.values(real).reduce((a, b) => a + b, 0);
  const [votes, setVotes] = useState(real);
  const valid = rest + Object.values(votes).reduce((a, b) => a + b, 0);
  const run = (v: Record<string, number>) =>
    dhondt(v, province.seats, rest + Object.values(v).reduce((a, b) => a + b, 0));
  const r = run(votes);
  const realResult = run(real).result;
  const last = r.won.at(-1);
  const out = r.next.find((q) => q.party !== last?.party) ?? r.next[0];
  const top = Math.max(1, ...Object.values(votes));
  const changed = province.parties.some(([name]) => votes[name] !== real[name]);
  // Cuántos votos más necesita una candidatura para sacar un escaño más (búsqueda binaria).
  const oneMore = (party: string) => {
    const now = r.result[party] ?? 0;
    let lowV = votes[party] ?? 0;
    let highV = lowV + province.valid;
    if ((run({ ...votes, [party]: highV }).result[party] ?? 0) <= now) return;
    while (highV - lowV > 1) {
      const mid = Math.floor((lowV + highV) / 2);
      if ((run({ ...votes, [party]: mid }).result[party] ?? 0) > now) highV = mid;
      else lowV = mid;
    }
    setVotes({ ...votes, [party]: highV });
  };
  const columns = Math.min(province.seats, 12);
  const winners = new Set(r.won.map((q) => `${q.party}|${q.divisor}`));
  const rows = province.parties.filter(([name]) => (votes[name] ?? 0) >= r.barrier && votes[name]);

  return (
    <Cell>
      <div className="grid gap-2">
        <Label>Juega con los votos</Label>
        <h2 className="m-0 flex flex-wrap items-center gap-x-3 gap-y-2 font-heading text-[28px] leading-tight font-normal">
          ¿Cuántos votos cambian un escaño en
          <ProvinceSelect provinces={provinces} value={province.code} onChange={onProvince} />?
        </h2>
        <p className="m-0 max-w-[75ch] text-muted-foreground">
          {province.seats === 1
            ? 'Aquí se reparte un solo escaño: se lo lleva quien más votos tiene.'
            : `Los ${province.seats} escaños se reparten por rondas: cada uno va a la candidatura con el cociente más alto, y sus votos se dividen entre uno más (÷2, ÷3…) para la ronda siguiente. Solo entran las que pasan del 3 % de los votos válidos.`}
        </p>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0">
        {province.parties.map(([name]) => {
          const v = votes[name] ?? 0;
          const seats = r.result[name] ?? 0;
          const passes = v > 0 && v >= r.barrier;
          const delta = seats - (realResult[name] ?? 0);
          return (
            <li
              key={name}
              className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 text-sm max-sm:grid-cols-[minmax(0,6rem)_minmax(0,1fr)]"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <i className="block size-2.5 rounded-full" style={{ background: color[name] }} />
                {name}
              </span>
              <span className="grid gap-1">
                <input
                  type="range"
                  min={0}
                  max={Math.round((real[name] ?? 0) * 2 + province.valid * 0.02)}
                  step={Math.max(1, Math.round(province.valid / 2000))}
                  value={v}
                  aria-label={`Votos de ${name}`}
                  onChange={(event) => setVotes({ ...votes, [name]: Number(event.target.value) })}
                  className="w-full"
                  style={{ accentColor: color[name] }}
                />
                <span className="flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: seats }, (_, j) => (
                    <i
                      key={j}
                      className="block size-2.5 rounded-[2px]"
                      style={{ background: color[name] }}
                    />
                  ))}
                  <i
                    className="block h-1 self-center rounded-full bg-muted"
                    style={{ width: `${((passes ? v / (seats + 1) : v) / top) * 60}%` }}
                  />
                </span>
              </span>
              <span className="flex items-center justify-end gap-3 max-sm:col-span-2 max-sm:justify-start">
                <span className="font-mono tabular-nums">
                  {thousands(v)}
                  {v !== real[name] && (
                    <small className="ml-1 text-muted-foreground">
                      ({v > (real[name] ?? 0) ? '+' : '−'}
                      {thousands(Math.abs(v - (real[name] ?? 0)))})
                    </small>
                  )}
                </span>
                <span className="w-16 text-right font-mono tabular-nums">
                  {passes ? (
                    <>
                      <b className="font-medium">{seats}</b> esc.
                      {delta !== 0 && (
                        <small className={cn('ml-1', delta > 0 ? 'text-[#3C8C6A]' : 'text-brand')}>
                          {delta > 0 ? '+' : '−'}
                          {Math.abs(delta)}
                        </small>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">&lt; 3 %</span>
                  )}
                </span>
                <Button variant="outline" size="sm" onClick={() => oneMore(name)}>
                  +1 escaño
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p
          className="m-0 max-w-[75ch] text-sm text-muted-foreground [&_b]:font-medium [&_b]:text-foreground"
          aria-live="polite"
        >
          {last ? (
            <>
              El último escaño fue para <b>{last.party}</b>, con {thousands(last.value)} (÷
              {last.divisor}).
              {out && (
                <>
                  {' '}
                  El cociente más alto que se queda fuera es el de <b>{out.party}</b>:{' '}
                  {thousands(out.value)}.
                </>
              )}{' '}
              Barrera del 3 %: {thousands(r.barrier)} votos de {thousands(valid)} válidos.
            </>
          ) : (
            'Ninguna candidatura pasa la barrera.'
          )}
        </p>
        <Button variant="outline" disabled={!changed} onClick={() => setVotes(real)}>
          Resultado real
        </Button>
      </div>
      {rows.length > 0 && (
        <div className="grid gap-2">
          <h3 className="m-0 text-base font-medium">La tabla de cocientes</h3>
          <p className="m-0 text-sm text-muted-foreground">
            Los votos de cada candidatura entre 1, 2, 3… Los {province.seats} cocientes más altos se
            llevan los escaños (en color); el recuadro marca el último y el discontinuo, el primero
            que se queda fuera.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs tabular-nums">
              <thead>
                <tr>
                  <th />
                  {Array.from({ length: columns }, (_, d) => (
                    <th
                      key={d}
                      className="px-2 py-1.5 text-right font-normal text-muted-foreground"
                    >
                      ÷{d + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([name]) => (
                  <tr key={name} className="border-t border-border">
                    <th className="py-1.5 pr-3 text-left font-sans text-sm font-medium whitespace-nowrap">
                      {name}
                    </th>
                    {Array.from({ length: columns }, (_, d) => {
                      const won = winners.has(`${name}|${d + 1}`);
                      return (
                        <td
                          key={d}
                          className={cn(
                            'px-2 py-1.5 text-right',
                            last?.party === name &&
                              last.divisor === d + 1 &&
                              'outline-2 -outline-offset-2 outline-foreground',
                            out?.party === name &&
                              out.divisor === d + 1 &&
                              'outline-dashed outline-2 -outline-offset-2 outline-foreground',
                          )}
                          style={
                            won
                              ? {
                                  background: `color-mix(in oklab, ${color[name]} 35%, var(--background))`,
                                }
                              : undefined
                          }
                        >
                          {thousands((votes[name] ?? 0) / (d + 1))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {province.seats > columns && (
            <p className="m-0 text-xs text-muted-foreground">
              Se muestran los {columns} primeros divisores.
            </p>
          )}
        </div>
      )}
    </Cell>
  );
}
