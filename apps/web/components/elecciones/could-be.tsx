'use client';

import { useState } from 'react';
import { cn } from '@reforma-digital/design/lib/utils';
import { thousands } from '../../lib/elecciones/format';
import { Cell, Heading, Label } from './report';
import { Tips } from './tips';

export type LastSeat = {
  code: string;
  name: string;
  missing: number;
  from: { party: string; family: string };
  to: { party: string; family: string };
};
type Family = { id: string; name: string; color: string; seats: number };

const W = 640;
const H = 240;
const m = { l: 30, r: 12, t: 30, b: 32 };
const presets = [
  [1_000, '1.000'],
  [5_000, '5.000'],
  [10_000, '10.000'],
] as const;

// «El Congreso que pudo ser»: en cada provincia, el último escaño se decidió por unos pocos votos.
// Si todos los que se decidieron por menos de una cifra hubieran caído del otro lado…
export function CouldBe({
  seats,
  families,
  hemicycle,
  voters,
}: {
  seats: LastSeat[];
  families: Family[];
  hemicycle: { box: string; points: [number, number][] };
  voters: number;
}) {
  const most = seats.at(-1)?.missing ?? 1000;
  const maxLog = Math.log10(Math.max(1000, most));
  const [level, setLevel] = useState(Math.min(Math.log10(5000), maxLog));
  const budget = 10 ** level;
  const flipped = seats.filter((s) => s.missing <= budget);
  const used = flipped.reduce((sum, s) => sum + s.missing, 0);
  const color = Object.fromEntries(families.map((f) => [f.id, f.color]));
  const name = Object.fromEntries(families.map((f) => [f.id, f.name]));
  const change: Record<string, number> = {};
  for (const s of flipped) {
    change[s.from.family] = (change[s.from.family] ?? 0) - 1;
    change[s.to.family] = (change[s.to.family] ?? 0) + 1;
  }
  const after = families.map((f) => ({ ...f, after: f.seats + (change[f.id] ?? 0) }));
  // El hemiciclo: los escaños, de izquierda a derecha, con el color de cada familia en su orden.
  const colors = after.flatMap((f) => Array<string>(Math.max(0, f.after)).fill(f.color));
  // Los cambios agrupados: de qué familia a cuál y en qué provincias.
  const groups = new Map<string, LastSeat[]>();
  for (const s of flipped) {
    const key = `${s.from.family}>${s.to.family}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  const x = (v: number) =>
    m.l + ((Math.log10(Math.max(100, v)) - 2) / (maxLog - 2)) * (W - m.l - m.r);
  const y = (n: number) => H - m.b - (n / seats.length) * (H - m.t - m.b);
  const steps = seats
    .map(
      (s, i) =>
        `${i ? '' : `M${x(100)} ${y(0)}`}L${x(s.missing)} ${y(i)}L${x(s.missing)} ${y(i + 1)}`,
    )
    .join('');
  const rounded = (v: number) => {
    const r = 10 ** (Math.floor(Math.log10(v)) - 1);
    return Math.round(v / r) * r;
  };

  return (
    <Cell>
      <div className="grid gap-2">
        <Label>El último escaño</Label>
        <Heading title="El Congreso que pudo ser">
          En cada provincia, el último escaño se decidió por unos pocos votos. ¿Y si todos los que
          se decidieron por menos de una cifra hubieran caído del otro lado?
        </Heading>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
        <svg
          viewBox={hemicycle.box}
          role="img"
          aria-label="Hemiciclo con los escaños que cambiarían"
          className="block h-auto w-full"
        >
          {hemicycle.points.map(([px, py], i) => (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={5.3}
              fill={colors[i] ?? 'var(--muted)'}
              className="transition-[fill] duration-500"
            />
          ))}
        </svg>
        <div className="grid gap-5" aria-live="polite">
          <dl className="m-0 grid grid-cols-2 gap-4">
            <div className="flex flex-col-reverse justify-end gap-1">
              <dt className="text-sm leading-snug text-muted-foreground">
                escaños se decidieron por menos de {thousands(rounded(budget))} votos
              </dt>
              <dd className="m-0 font-heading text-[40px] leading-none tabular-nums">
                {flipped.length}
              </dd>
            </div>
            <div className="flex flex-col-reverse justify-end gap-1">
              <dt className="text-sm leading-snug text-muted-foreground">
                votos, sumándolos todos, bastaban para darles la vuelta
                {flipped.length > 0 &&
                  `: el ${((used / voters) * 100).toLocaleString('es-ES', { maximumFractionDigits: used / voters < 0.01 ? 2 : 1 })} % de los que votaron`}
              </dt>
              <dd className="m-0 font-heading text-[40px] leading-none tabular-nums">
                {thousands(used)}
              </dd>
            </div>
          </dl>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm">
            {after
              .filter((f) => f.seats || f.after)
              .map((f) => {
                const d = f.after - f.seats;
                return (
                  <li
                    key={f.id}
                    className="grid grid-cols-[10px_minmax(0,1fr)_3rem_2.5rem] items-center gap-2"
                  >
                    <i className="block size-2.5 rounded-full" style={{ background: f.color }} />
                    <span>{f.name}</span>
                    <b className="text-right font-mono font-medium tabular-nums">{f.after}</b>
                    <small
                      className={cn(
                        'text-right font-mono',
                        d > 0 ? 'text-[#3C8C6A]' : 'text-brand',
                      )}
                    >
                      {d ? `${d > 0 ? '+' : '−'}${Math.abs(d)}` : ''}
                    </small>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
      <div className="grid gap-3 border-t border-border pt-6">
        <p className="m-0 text-sm text-muted-foreground">
          Cada punto es un escaño, colocado según los votos que le faltaron al segundo para
          quitárselo al primero. <b className="font-medium text-foreground">Mueve la línea:</b> los
          que quedan a su izquierda cambian de manos.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Por menos de</span>
          {presets.map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={Math.abs(level - Math.log10(v)) < 0.005}
              onClick={() => setLevel(Math.min(maxLog, Math.log10(v)))}
              className="min-h-9 rounded-full px-3 font-mono text-xs transition-colors hover:bg-muted aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={level >= maxLog - 0.005}
            onClick={() => setLevel(maxLog)}
            className="min-h-9 rounded-full px-3 font-mono text-xs transition-colors hover:bg-muted aria-pressed:bg-foreground aria-pressed:text-background"
          >
            Todos
          </button>
        </div>
        <Tips>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            aria-hidden="true"
            className="block h-auto w-full overflow-visible"
          >
            <g className="fill-muted-foreground font-mono text-[10px]">
              {[1e3, 1e4, 1e5]
                .filter((v) => Math.log10(v) < maxLog - 0.1)
                .map((v) => (
                  <text key={v} x={x(v)} y={H - m.b + 16} textAnchor="middle">
                    {thousands(v)}
                  </text>
                ))}
              <text x={W - m.r} y={H - 2} textAnchor="end">
                votos que le faltaron al segundo →
              </text>
            </g>
            <path d={steps} fill="none" className="stroke-border" />
            {seats.map((s, i) => (
              <circle
                key={s.code}
                cx={x(s.missing)}
                cy={y(i + 1)}
                r={4.4}
                fill={s.missing <= budget ? color[s.to.family] : 'var(--background)'}
                stroke={color[s.to.family]}
                strokeWidth={1.5}
                data-tip={s.name}
                data-tip-text={`${s.from.party} → ${s.to.party}: le faltaron ${thousands(s.missing)} votos`}
                data-tip-color={color[s.to.family]}
              />
            ))}
            <line
              x1={x(budget)}
              x2={x(budget)}
              y1={m.t - 12}
              y2={H - m.b}
              className="stroke-foreground"
              strokeWidth={1.5}
            />
            <text
              x={x(budget)}
              y={m.t - 18}
              textAnchor={x(budget) > W * 0.75 ? 'end' : x(budget) < W * 0.2 ? 'start' : 'middle'}
              className="fill-foreground font-mono text-[11px]"
            >
              menos de {thousands(rounded(budget))} votos
            </text>
          </svg>
        </Tips>
        <input
          type="range"
          min={2}
          max={maxLog}
          step={0.01}
          value={level}
          onChange={(event) => setLevel(Number(event.target.value))}
          aria-label="Votos que se reparten"
          aria-valuetext={`menos de ${thousands(rounded(budget))} votos: ${flipped.length} escaños cambian`}
          className="w-full accent-foreground"
        />
      </div>
      {groups.size > 0 && (
        <div className="grid gap-3 border-t border-border pt-6">
          <Label>Quién se los lleva</Label>
          <ul className="m-0 grid list-none gap-2 p-0">
            {[...groups]
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([key, list]) => {
                const [from = '', to = ''] = key.split('>');
                return (
                  <li
                    key={key}
                    className="grid gap-1 text-sm sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-4"
                  >
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <i
                        className="block size-2.5 rounded-full"
                        style={{ background: color[from] }}
                      />
                      {name[from] ?? from}
                      <span className="text-muted-foreground">→</span>
                      <i
                        className="block size-2.5 rounded-full"
                        style={{ background: color[to] }}
                      />
                      {name[to] ?? to}
                      <b className="ml-1 font-mono">{list.length}</b>
                    </span>
                    <span className="text-muted-foreground">
                      {list.map((s) => s.name).join(', ')}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </Cell>
  );
}
