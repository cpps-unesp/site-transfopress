import { defineMiddleware } from 'astro:middleware';
import mapa from './lib/redirecionamentos.json';

// Endereços do site antigo (WordPress) para os do site novo, com 301 para os
// buscadores e os links já publicados acompanharem. O mapa com os casos
// especiais (?p=123, ?wpdmdl=123 e slugs que mudaram) é gerado por
// seed/gerar-seed.mjs a partir de legado/redirects.txt.
const REDIRECIONA = mapa as Record<string, string>;

// Admin do EmDash, arquivos do build e arquivos estáticos ficam como estão.
const INTOCADO = /^\/(_|\.well-known\/|wp-content\/|static\/|arquivos\/|robots\.txt|favicon|sitemap\.xml)/;

const CATEGORIAS: Record<string, string> = {
  noticias: '/noticias',
  verbetes: '/verbetes',
  memory: '/memoria',
  'encontro-transfopress': '/noticias?tag=encontro-transfopress',
  'seminarios-transfopress-europa': '/noticias',
};

function destino(url: URL): string | null {
  const { pathname, searchParams } = url;

  if (pathname === '/') {
    for (const chave of ['p', 'page_id', 'wpdmdl']) {
      const valor = searchParams.get(chave);
      if (valor) return REDIRECIONA[`/?${chave === 'page_id' ? 'p' : chave}=${valor}`] ?? '/';
    }
    const busca = searchParams.get('s');
    if (busca !== null) return `/busca?q=${encodeURIComponent(busca)}`;
    return null;
  }

  const sem = pathname.replace(/\/+$/, '') || '/';
  if (REDIRECIONA[sem]) return REDIRECIONA[sem];

  let m: RegExpMatchArray | null;
  if ((m = sem.match(/^\/memory(?:\/([^/]+))?$/))) return m[1] ? `/memoria/${m[1]}` : '/memoria';
  if ((m = sem.match(/^\/download(?:\/([^/]+))?$/))) return m[1] ? `/downloads/${m[1]}` : '/downloads';
  if ((m = sem.match(/^\/tag\/([^/]+)$/))) return `/noticias?tag=${m[1]}`;
  if ((m = sem.match(/^\/category\/([^/]+)/))) return CATEGORIAS[m[1]] ?? '/noticias';
  if (/^\/(wp-admin|wp-login\.php)/.test(sem)) return '/_emdash/admin';
  if (/^\/(feed|comments\/feed)$/.test(sem) || /\/feed$/.test(sem)) return '/noticias';
  if (/^\/(noticias|verbetes)\/page\/\d+$/.test(sem)) return sem.replace(/\/page\/\d+$/, '');
  // Sem a barra final, como os links do site novo.
  if (sem !== pathname) return `${sem}${url.search}`;
  return null;
}

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;
  if (INTOCADO.test(pathname)) return next();
  const novo = destino(context.url);
  // Destino sempre no próprio site: nunca "//outro-dominio".
  if (novo && !novo.startsWith('//') && novo !== `${pathname}${context.url.search}`) return context.redirect(novo, 301);
  return next();
});
