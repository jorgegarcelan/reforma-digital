'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@reforma-digital/design/lib/utils';
import { Button } from '@reforma-digital/design/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@reforma-digital/design/ui/tabs';
import { apportion, singleSeat } from '../../lib/elecciones/apportion';
import { thousands } from '../../lib/elecciones/format';

const gain = '#3C8C6A';

export function Apportionment({
  population,
  current,
  provinces,
}: {
  population: Record<string, number>;
  current: Record<string, number>;
  provinces: Record<string, { name: string; href: string }>;
}) {
  const [total, setTotal] = useState(350);
  const [minimum, setMinimum] = useState(2);
  const seats = apportion(population, total, minimum);
  const codes = Object.keys(population).sort((a, b) => (population[b] ?? 0) - (population[a] ?? 0));
  const perSeat = codes
    .filter((c) => !singleSeat.has(c))
    .map((c) => ({ c, people: (population[c] ?? 0) / (seats[c] ?? 1) }))
    .sort((a, b) => a.people - b.people);
  const light = perSeat[0];
  const heavy = perSeat.at(-1);
  const moved = codes.reduce((sum, c) => sum + Math.max(0, (seats[c] ?? 0) - (current[c] ?? 0)), 0);
  const name = (c: string) => provinces[c]?.name ?? c;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="grid gap-2">
          <span className="text-sm text-muted-foreground">Mínimo por provincia</span>
          <Tabs value={String(minimum)} onValueChange={(value) => setMinimum(Number(value))}>
            <TabsList aria-label="Mínimo de escaños por provincia">
              {[1, 2, 3, 4].map((v) => (
                <TabsTrigger key={v} value={String(v)} className="px-3.5">
                  {v}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <label className="grid min-w-60 flex-1 gap-2">
          <span className="text-sm text-muted-foreground">
            Diputados en el Congreso:{' '}
            <b className="font-mono font-medium text-foreground tabular-nums">{total}</b>
          </span>
          <input
            type="range"
            min={300}
            max={400}
            step={1}
            value={total}
            onChange={(event) => setTotal(Number(event.target.value))}
            className="accent-foreground"
          />
          <small className="text-xs text-muted-foreground">
            La Constitución permite entre 300 y 400
          </small>
        </label>
        <Button
          variant="outline"
          disabled={total === 350 && minimum === 2}
          onClick={() => {
            setTotal(350);
            setMinimum(2);
          }}
        >
          Volver a la ley actual
        </Button>
      </div>
      <dl className="m-0 grid gap-6 border-y border-border py-5 sm:grid-cols-2" aria-live="polite">
        {light && heavy && (
          <div className="flex flex-col-reverse justify-end gap-1">
            <dt className="max-w-[44ch] text-sm leading-snug text-muted-foreground">
              pesa un voto de {name(light.c)} frente a uno de {name(heavy.c)} (
              {thousands(light.people)} y {thousands(heavy.people)} habitantes por escaño)
            </dt>
            <dd className="m-0 font-heading text-[40px] leading-none tracking-tight tabular-nums">
              {(heavy.people / light.people).toLocaleString('es-ES', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              ×
            </dd>
          </div>
        )}
        <div className="flex flex-col-reverse justify-end gap-1">
          <dt className="text-sm leading-snug text-muted-foreground">
            {moved === 1 ? 'escaño cambiaría' : 'escaños cambiarían'} de provincia respecto al
            reparto del 29N
          </dt>
          <dd className="m-0 font-heading text-[40px] leading-none tracking-tight tabular-nums">
            {moved}
          </dd>
        </div>
      </dl>
      <ol className="m-0 grid list-none gap-1 p-0">
        {codes.map((c) => {
          const now = seats[c] ?? 0;
          const before = current[c] ?? 0;
          return (
            <li
              key={c}
              className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm"
            >
              <Link href={provinces[c]?.href ?? '#'} className="no-underline hover:underline">
                {name(c)}
              </Link>
              <span className="flex flex-wrap gap-0.5" aria-hidden="true">
                {Array.from({ length: Math.max(now, before) }, (_, j) => (
                  <i
                    key={j}
                    className={cn(
                      'block size-2.5 rounded-[2px]',
                      j < Math.min(now, before)
                        ? 'bg-muted-foreground/45'
                        : now > before
                          ? ''
                          : 'border-[1.5px] border-brand',
                    )}
                    style={
                      j >= Math.min(now, before) && now > before ? { background: gain } : undefined
                    }
                  />
                ))}
              </span>
              <span className="text-right font-mono tabular-nums">
                {now}
                {now !== before && (
                  <small className={cn('ml-1', now > before ? 'text-[#3C8C6A]' : 'text-brand')}>
                    {now > before ? '+' : '−'}
                    {Math.abs(now - before)}
                  </small>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="m-0 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="block size-2.5 rounded-[2px] bg-muted-foreground/45" />
          Escaño que ya tiene hoy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="block size-2.5 rounded-[2px]" style={{ background: gain }} />
          Ganaría
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="block size-2.5 rounded-[2px] border-[1.5px] border-brand" />
          Perdería
        </span>
      </p>
    </div>
  );
}
