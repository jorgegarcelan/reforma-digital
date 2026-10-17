// es-ES no agrupa los números de cuatro cifras («1340»); aquí siempre llevan punto de miles.
export const thousands = (value: number) =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// «29 sept 2026», a partir de una fecha ISO.
const short = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
export const shortDate = (iso: string) => short.format(new Date(`${iso}T00:00:00Z`));

// El color de una provincia en un mapa de intensidad: de apenas visible (t = 0) al color entero
// (t = 1). En tinta para los votos por escaño y en rojo para los votos que no sirvieron.
export const ramp = (mode: 'price' | 'lost', t: number) =>
  `color-mix(in oklab, ${mode === 'price' ? 'var(--foreground)' : 'var(--brand)'} ${Math.round(12 + 78 * Math.max(0, Math.min(1, t)))}%, var(--muted))`;
