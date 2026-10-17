// Art. 162 de la LOREG: un mínimo por provincia (Ceuta y Melilla, uno) y el resto por población,
// con los restos mayores. Con 350 escaños, mínimo 2 y el padrón del decreto da su anexo exacto.
// Port de site/elecciones.js de Escaño Abierto (licencia MIT).
export const singleSeat = new Set(['51', '52']);
export function apportion(population: Record<string, number>, total = 350, minimum = 2) {
  const codes = Object.keys(population);
  const fixed = Object.fromEntries(codes.map((c) => [c, singleSeat.has(c) ? 1 : minimum]));
  const rest = total - Object.values(fixed).reduce((a, b) => a + b, 0);
  const shared = codes.filter((c) => !singleSeat.has(c));
  const quota = shared.reduce((sum, c) => sum + (population[c] ?? 0), 0) / rest;
  const whole = Object.fromEntries(
    shared.map((c) => [c, Math.floor((population[c] ?? 0) / quota)]),
  );
  const remainder = (c: string) => (population[c] ?? 0) / quota - (whole[c] ?? 0);
  const left = rest - Object.values(whole).reduce((a, b) => a + b, 0);
  for (const c of [...shared]
    .sort((a, b) => remainder(b) - remainder(a) || a.localeCompare(b))
    .slice(0, left))
    whole[c] = (whole[c] ?? 0) + 1;
  return Object.fromEntries(codes.map((c) => [c, (fixed[c] ?? 0) + (whole[c] ?? 0)]));
}
