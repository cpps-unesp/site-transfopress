// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import emdash from 'emdash/astro';
import { d1, r2 } from '@emdash-cms/cloudflare';

const SITE = 'https://transfopressbrasil.franca.unesp.br';

// Mesma base dos sites do CPPS (cpps-unesp/site-cpps) e do FoMerco
// (lab-ippri-unesp/site-fomerco): Astro no Cloudflare Workers, com o conteúdo no
// EmDash (banco D1 e mídia no R2). Recursos em wrangler.jsonc.
export default defineConfig({
  site: SITE,
  output: 'server',
  adapter: cloudflare(),
  // A barra de ferramentas do Astro só atrapalha as capturas e a revisão local.
  devToolbar: { enabled: false },
  // Autoriza o serviço de imagens a redimensionar a mídia do EmDash servida pelo
  // próprio domínio. Nos endereços workers.dev, passe EMDASH_SITE_URL no build.
  image: {
    remotePatterns: [
      { hostname: new URL(SITE).hostname, pathname: '/_emdash/api/media/file/**' },
    ],
  },
  integrations: [
    react(),
    emdash({
      database: d1({ binding: 'DB' }),
      storage: r2({ binding: 'MEDIA' }),
      // O admin usa as fontes do sistema: sem isso, o build baixa fontes do
      // Google Fonts e falha quando a rede falha.
      fonts: false,
      admin: { locales: ['pt-BR'] },
      // Aviso de nova versão no admin só depois de 7 dias, como o Dependabot.
      updateCheck: { minimumReleaseAge: '7d' },
    }),
  ],
});
