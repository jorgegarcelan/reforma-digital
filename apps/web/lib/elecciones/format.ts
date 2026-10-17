// es-ES no agrupa los números de cuatro cifras («1340»); aquí siempre llevan punto de miles.
export const thousands = (value: number) =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
