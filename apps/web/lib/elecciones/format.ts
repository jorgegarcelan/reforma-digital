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

// Texto oscuro o claro según lo luminoso que sea el color de fondo (en `#rrggbb`).
export const ink = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? '#1A1A1A' : '#FFFFFF';
};

// El año de una elección y, si ese año hubo dos (2019), también el mes.
const shortMonth = new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', month: 'short' });
export const electionLabel = (all: { fecha: string }[], fecha: string) =>
  all.filter((x) => x.fecha.slice(0, 4) === fecha.slice(0, 4)).length > 1
    ? `${fecha.slice(0, 4)} ${shortMonth.format(new Date(`${fecha}T00:00:00Z`))}`
    : fecha.slice(0, 4);
