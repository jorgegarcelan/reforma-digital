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
