import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
import type { NextConfig } from 'next';
import { withBotId } from 'botid/next/config';
const config: NextConfig = {
  transpilePackages: [
    '@reforma-digital/core',
    '@reforma-digital/government',
    '@reforma-digital/db',
    '@reforma-digital/retrieval',
    '@reforma-digital/ai',
    '@reforma-digital/evals',
  ],
  serverExternalPackages: ['postgres', '@langfuse/otel', '@opentelemetry/sdk-node'],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      new URL('https://avatars.githubusercontent.com/u/*?s=640'),
      new URL('https://avatars.githubusercontent.com/u/*?s=160'),
    ],
  },
  redirects() {
    return [
      { source: '/explorar', destination: '/chat', permanent: true },
      { source: '/propuesta', destination: '/#iniciativa', permanent: true },
    ];
  },
  // Rediseño de Escaño Abierto (public/new-escanoabierto/web): los datos vienen de la web publicada y cada ruta de
  // la SPA sirve su index.html.
  rewrites() {
    return {
      beforeFiles: [], // withBotId añade aquí los suyos
      afterFiles: [
        {
          source: '/new-escanoabierto/web/datos/:path*',
          destination: 'https://www.escanoabierto.com/datos/:path*',
        },
      ],
      fallback: [
        {
          source: '/new-escanoabierto/web/:path*',
          destination: '/new-escanoabierto/web/index.html',
        },
      ],
    };
  },
};
export default withBotId(config);
