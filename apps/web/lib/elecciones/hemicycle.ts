import type { z } from 'zod';
import type { historySchema, indexSchema } from '../congreso/schema';

// El hemiciclo de verdad: los escaños del plano del Congreso, ordenados por la familia de quien se
// sienta hoy en cada uno y, dentro de ella, de izquierda a derecha. Así, con el resultado de 2023,
// cada escaño queda del color de quien lo ocupa; con otro reparto, las familias se colocan en ese
// mismo orden (el de `familias`).
export function realHemicycle(
  index: z.infer<typeof indexSchema>,
  history: z.infer<typeof historySchema>,
) {
  const plan = index.hemiciclo;
  const plain = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '');
  const sitting = Object.fromEntries(
    (history.elecciones.at(-1)?.partidos ?? []).map(([siglas, , family]) => [
      plain(siglas),
      family,
    ]),
  );
  const order = (formation: string) =>
    history.familias.findIndex(
      (f) =>
        f.id === (sitting[plain(formation)] ?? (formation.includes('PSOE') ? 'PSOE' : 'OTROS')),
    );
  const angle = (x: number, y: number) => Math.atan2(plan.alto - y, x - plan.ancho / 2);
  const points = index.diputados
    .flatMap((d): [number, number, number][] =>
      d.baja || d.x === null || d.y === null ? [] : [[d.x, d.y, order(d.formacion)]],
    )
    .sort(([ax, ay, ak], [bx, by, bk]) => ak - bk || angle(bx, by) - angle(ax, ay))
    .map(([x, y]): [number, number] => [x, y]);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    box: `${Math.min(...xs) - 7} ${Math.min(...ys) - 7} ${Math.max(...xs) - Math.min(...xs) + 14} ${Math.max(...ys) - Math.min(...ys) + 14}`,
    points,
    label: { x: plan.ancho / 2, y: plan.alto * 0.8, size: plan.ancho * 0.075 },
  };
}
