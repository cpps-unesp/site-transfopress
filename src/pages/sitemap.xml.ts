import type { APIRoute } from 'astro';
import { getDownloads, getPaginas, getTextos } from '../lib/conteudo';

// Mapa do site para buscadores: páginas, notícias, verbetes, memória e downloads.
export const GET: APIRoute = async ({ site }) => {
  const [paginas, noticias, verbetes, memoria, downloads] = await Promise.all([
    getPaginas(),
    getTextos('noticias'),
    getTextos('verbetes'),
    getTextos('memoria'),
    getDownloads(),
  ]);
  const caminhos = new Set<string>(['/', '/noticias', '/verbetes', '/downloads']);
  for (const p of paginas) if (p.slug !== 'apresentacao') caminhos.add(`/${encodeURIComponent(p.slug)}`);
  for (const t of [...noticias, ...verbetes, ...memoria]) caminhos.add(t.url);
  for (const d of downloads) if (d.arquivo) caminhos.add(`/downloads/${encodeURIComponent(d.slug)}`);
  const urls = [...caminhos].map((c) => `<url><loc>${new URL(c, site).toString()}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
