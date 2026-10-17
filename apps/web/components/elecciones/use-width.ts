'use client';

import { useEffect, useState, type RefObject } from 'react';

// El ancho real de un gráfico, para dibujarlo a su tamaño: así los textos miden lo que dicen.
export function useWidth(ref: RefObject<HTMLElement | null>, fallback: number) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(300, Math.round(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
