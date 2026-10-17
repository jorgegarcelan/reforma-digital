'use client';

import { useEffect, useMemo, useState, type PointerEvent } from 'react';
import { Button } from '@reforma-digital/design/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@reforma-digital/design/ui/select';
import { geoMunicipalitiesSchema, municipalityVotesSchema } from '../../lib/congreso/schema';
import type { z } from 'zod';
import { thousands } from '../../lib/elecciones/format';
import { Legend } from './report';
import { Tips } from './tips';

export type MapGroup = { id: string; name: string; color: string; families: string[] };
type Votes = z.infer<typeof municipalityVotesSchema>;
type Geo = z.infer<typeof geoMunicipalitiesSchema>;
type Loaded = { geo: Geo; votes: Record<'202307' | '201911', Votes> };

const elections = [
  { value: '202307', label: '23 de julio de 2023' },
  { value: '201911', label: '10 de noviembre de 2019' },
] as const;
const down = '#9A6B4F';
const percent = (n: number, digits = 0) =>
  `${(n * 100).toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
const mix = (color: string, t: number) =>
  `color-mix(in oklab, ${color} ${Math.round(12 + 88 * Math.max(0, Math.min(1, t)))}%, var(--muted))`;
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))] ?? 0;
};
// La parte de los votos de un grupo en un municipio (sobre los votos a candidaturas).
const share = (votes: Votes, code: string, group: MapGroup) => {
  const row = votes.municipios[code];
  if (!row) return null;
  const total = row.slice(2).reduce((t, v) => t + v, 0);
  if (!total) return null;
  return group.families.reduce((t, f) => t + (row[2 + votes.orden.indexOf(f)] ?? 0), 0) / total;
};
const points = (n: number) =>
  `${(n * 100).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pt`;
const load = async <T,>(path: string, schema: z.ZodType<T>) => {
  const response = await fetch(`/api/congreso/datasets/${path}`);
  if (!response.ok) throw new Error(`No se ha podido cargar ${path}`);
  return schema.parse(await response.json());
};

// El voto en los 8.131 municipios, en 2019 o en 2023, y cuánto cambió entre las dos. El mapa pesa
// cerca de un megabyte: se pide al abrir la página, no va dentro del HTML.
export function MunicipalMap({ groups }: { groups: MapGroup[] }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [election, setElection] = useState<'202307' | '201911'>('202307');
  const [mode, setMode] = useState('PP');
  const [change, setChange] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([
      load('elecciones/geo-municipios.json', geoMunicipalitiesSchema),
      load('elecciones/municipios-202307.json', municipalityVotesSchema),
      load('elecciones/municipios-201911.json', municipalityVotesSchema),
    ])
      .then(([geo, v23, v19]) => live && setData({ geo, votes: { '202307': v23, '201911': v19 } }))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const comparable = mode !== 'first';
  const showChange = change && comparable;

  const view = useMemo(() => {
    if (!data) return null;
    const votes = data.votes[showChange ? '202307' : election];
    const codes = Object.keys(data.geo.municipios);
    const fill: Record<string, string> = {};
    if (mode === 'first') {
      const seen = new Set<string>();
      for (const code of codes) {
        let best: MapGroup | undefined;
        let most = -1;
        for (const g of groups) {
          if (g.id === 'OTROS') continue;
          const v = share(votes, code, g) ?? -1;
          if (v > most) {
            most = v;
            best = g;
          }
        }
        if (best && most > 0) {
          fill[code] = best.color;
          seen.add(best.id);
        }
      }
      return { fill, legend: groups.filter((g) => seen.has(g.id)), scale: null };
    }
    const group = groups.find((g) => g.id === mode);
    const value = (code: string, v: Votes) => {
      if (mode === 'turnout') {
        const row = v.municipios[code];
        return row && row[0] ? (row[1] ?? 0) / row[0] : null;
      }
      return group ? share(v, code, group) : null;
    };
    const values: Record<string, number> = {};
    for (const code of codes) {
      const now = value(code, votes);
      if (now === null) continue;
      if (showChange) {
        const then = value(code, data.votes['201911']);
        if (then !== null) values[code] = now - then;
      } else values[code] = now;
    }
    const list = Object.values(values);
    const color = group?.color ?? 'var(--foreground)';
    if (showChange) {
      const limit = Math.max(Math.abs(quantile(list, 0.02)), Math.abs(quantile(list, 0.98)), 0.001);
      for (const [code, v] of Object.entries(values))
        fill[code] = mix(v >= 0 ? color : down, Math.abs(v) / limit);
      return { fill, legend: null, scale: { from: -limit, to: limit, color, change: true } };
    }
    const lo = mode === 'turnout' ? quantile(list, 0.02) : 0;
    const hi = quantile(list, 0.98);
    for (const [code, v] of Object.entries(values))
      fill[code] = mix(color, (v - lo) / (hi - lo || 1));
    return { fill, legend: null, scale: { from: lo, to: hi, color, change: false } };
  }, [data, election, mode, showChange, groups]);

  // El detalle de cada municipio se calcula al pasar por encima.
  const describe = (event: PointerEvent<SVGSVGElement>) => {
    const path =
      event.target instanceof Element ? event.target.closest('[data-municipality]') : null;
    const code = path?.getAttribute('data-municipality');
    if (!path || !code || !data) return;
    const votes = data.votes[showChange ? '202307' : election];
    const row = votes.municipios[code];
    if (!row) return path.setAttribute('data-tip-text', 'Sin datos');
    const top = groups
      .map((g) => [g, share(votes, code, g) ?? 0] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([g, v]) => `${g.name} ${percent(v, 1)}`);
    path.setAttribute(
      'data-tip-text',
      `Participación ${percent((row[1] ?? 0) / (row[0] || 1), 1)} · censo ${thousands(row[0] ?? 0)}. ${top.join(' · ')}.`,
    );
  };

  const modes = [
    ...groups
      .filter((g) => g.id !== 'OTROS')
      .map((g) => ({ value: g.id, label: `Voto a ${g.name}` })),
    { value: 'first', label: 'Primera fuerza' },
    { value: 'turnout', label: 'Participación' },
  ];
  const scale = view?.scale;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={election}
          items={[...elections]}
          disabled={showChange}
          onValueChange={(v) => v && setElection(v === '201911' ? '201911' : '202307')}
        >
          <SelectTrigger aria-label="Elección" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {elections.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mode} items={modes} onValueChange={(v) => v && setMode(v)}>
          <SelectTrigger aria-label="Qué se pinta" className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modes.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showChange ? 'default' : 'outline'}
          aria-pressed={showChange}
          disabled={!comparable}
          onClick={() => setChange(!change)}
        >
          Cambio desde 2019
        </Button>
      </div>
      {failed ? (
        <p className="m-0 text-muted-foreground">No se ha podido cargar el mapa municipal.</p>
      ) : !data || !view ? (
        <p className="m-0 text-muted-foreground" aria-live="polite">
          Cargando los 8.131 municipios…
        </p>
      ) : (
        <Tips>
          <svg
            viewBox={`0 0 ${data.geo.ancho} ${data.geo.alto}`}
            role="img"
            aria-label={`Mapa de los municipios: ${modes.find((m) => m.value === mode)?.label}${showChange ? ', cambio desde 2019' : ''}`}
            className="block h-auto w-full"
            onPointerOver={describe}
          >
            {Object.entries(data.geo.municipios).map(([code, [name, d]]) => (
              <path
                key={code}
                d={d}
                data-municipality={code}
                data-tip={name}
                fill={view.fill[code] ?? 'var(--muted)'}
                className="stroke-card [stroke-width:0.35] hover:stroke-foreground hover:[stroke-width:1.5]"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </Tips>
      )}
      {view?.legend && (
        <Legend small items={view.legend.map((g) => ({ label: g.name, color: g.color }))} />
      )}
      {scale && (
        <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground">
          {scale.change ? `−${points(Math.abs(scale.from))}` : percent(scale.from)}
          <span
            className="block h-2.5 w-32 rounded-full"
            style={{
              background: scale.change
                ? `linear-gradient(90deg, ${mix(down, 1)}, var(--muted), ${mix(scale.color, 1)})`
                : `linear-gradient(90deg, ${mix(scale.color, 0)}, ${mix(scale.color, 1)})`,
            }}
          />
          {scale.change ? `+${points(scale.to)}` : `${percent(scale.to)} o más`}
        </p>
      )}
    </div>
  );
}
