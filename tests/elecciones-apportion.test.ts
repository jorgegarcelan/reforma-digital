import { describe, expect, it } from 'vitest';
import { apportion } from '../apps/web/lib/elecciones/apportion';

// Padrón sintético: tres provincias, Ceuta (51) y Melilla (52).
const population = { '01': 600, '02': 300, '03': 100, '51': 80, '52': 80 };

describe('reparto de escaños por provincia (art. 162 LOREG)', () => {
  it('da el mínimo a cada provincia, uno a Ceuta y Melilla y el resto por población', () => {
    const seats = apportion(population, 18, 2);
    expect(seats).toEqual({ '01': 8, '02': 5, '03': 3, '51': 1, '52': 1 });
    expect(Object.values(seats).reduce((a, b) => a + b, 0)).toBe(18);
  });

  it('desempata los restos mayores por código y respeta otro mínimo', () => {
    const seats = apportion({ '01': 100, '02': 100, '51': 1, '52': 1 }, 7, 1);
    expect(seats).toEqual({ '01': 3, '02': 2, '51': 1, '52': 1 });
  });
});
