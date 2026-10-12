# Escaño Abierto con Sol

Vista previa del rediseño de [Escaño Abierto](https://www.escanoabierto.com) con Sol. El índice de páginas está en
`/new-escanoabierto` y no se enlaza desde la navegación.

Es la web estática de [jorgegarcelan/escano-abierto](https://github.com/jorgegarcelan/escano-abierto) (rama
`estetica-reforma`, MIT), con dos cambios para que viva aquí:

- `<base href="/new-escanoabierto/web/">` y enlaces relativos; `rutaDe()` e `idDeRuta()` (en `app.js`) añaden y
  quitan ese prefijo.
- Sin analítica. Los datos (`datos/`) se piden a escanoabierto.com mediante el rewrite de `apps/web/next.config.ts`,
  que también sirve `index.html` en cualquier ruta.

Lo propio de Sol está en `marcas/sol.css` (cómo se compone la web) y `marcas/sol.js` (chevrones y flechas);
`marcas/sol/` son `tokens.css` y `botones.css` de este repositorio.
