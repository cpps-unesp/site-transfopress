import type { PortableTextBlock } from 'emdash';
import {
  getAparencia,
  getMenuPrincipal,
  getPagina,
  getParceiros,
  getTextos,
  getTextosPagina,
  getDownloads,
  type Texto,
} from '../lib/conteudo';

// Dados das três alternativas de front-end (/prototipos). Só conteúdo real do
// banco: nada aqui é inventado, e os números saem da contagem das coleções.

export type Alternativa = 'a' | 'b' | 'c';

export const ALTERNATIVAS: Record<Alternativa, { nome: string; resumo: string }> = {
  a: { nome: 'Jornal', resumo: 'Página de jornal: a apresentação abre a home como matéria principal, em serifa e com fios.' },
  b: { nome: 'Índice', resumo: 'Sóbria e institucional: leitura confortável da apresentação e um índice claro do que há no site.' },
  c: { nome: 'Acervo', resumo: 'O acervo à frente: as páginas dos periódicos estudados e a linha do tempo dos encontros.' },
};

export async function dadosComuns() {
  const [aparencia, menu, parceiros] = await Promise.all([getAparencia(), getMenuPrincipal(), getParceiros()]);
  return { aparencia, menu, parceiros };
}

// A apresentação começa com uma linha de links (Grupo CNPq | Transfopress
// Internacional | ...). Ela sai do corpo do texto e vira uma linha própria.
function ehLinhaDeLinks(b: PortableTextBlock): boolean {
  const defs = (b as { markDefs?: { _type?: string }[] }).markDefs ?? [];
  return b._type === 'block' && textoDoBloco(b).length < 100 && defs.some((m) => m._type === 'link');
}

export function separarApresentacao(blocos: PortableTextBlock[]): {
  links: PortableTextBlock[];
  corpo: PortableTextBlock[];
  abertura: string;
  resto: PortableTextBlock[];
} {
  const inicio = blocos.findIndex((b) => !ehLinhaDeLinks(b));
  const links = inicio > 0 ? blocos.slice(0, inicio) : [];
  const corpo = inicio > 0 ? blocos.slice(inicio) : blocos;
  // Primeiro parágrafo de verdade: a abertura (lide) nas alternativas B e C.
  const i = corpo.findIndex((b) => b._type === 'block' && textoDoBloco(b).length > 80);
  if (i < 0) return { links, corpo, abertura: '', resto: corpo };
  return { links, corpo, abertura: textoDoBloco(corpo[i]), resto: corpo.filter((_, j) => j !== i) };
}

function textoDoBloco(b: PortableTextBlock): string {
  const filhos = (b as { children?: { text?: string }[] }).children ?? [];
  return filhos.map((c) => c.text ?? '').join('').replace(/\s+/g, ' ').trim();
}

export async function dadosHome() {
  const [apresentacao, noticias, verbetes, memoria, downloads] = await Promise.all([
    getPagina('apresentacao'),
    getTextosPagina('noticias', { limite: 5 }),
    getTextos('verbetes'),
    getTextos('memoria'),
    getDownloads(),
  ]);
  const todasNoticias = await getTextos('noticias');
  const porData = (a: Texto, b: Texto) => (b.data?.getTime() ?? 0) - (a.data?.getTime() ?? 0);
  return {
    apresentacao,
    noticias: noticias.itens,
    verbetesRecentes: [...verbetes].sort(porData).slice(0, 4),
    verbetes,
    verbetesComImagem: [...verbetes].filter((v) => v.imagem).sort(porData),
    // Encontros e lançamentos em ordem cronológica.
    memoria: [...memoria].filter((m) => m.data).sort((a, b) => (a.data!.getTime() - b.data!.getTime())),
    contagem: {
      verbetes: verbetes.length,
      noticias: todasNoticias.length,
      memoria: memoria.length,
      downloads: downloads.length,
    },
  };
}

export const ano = (d: Date | null) => (d ? String(d.getUTCFullYear()) : '');

// Links das alternativas: verbetes ficam dentro do protótipo; o resto vai para
// as páginas atuais do site (que existem).
export const urlVerbete = (alt: Alternativa, t: Texto) => `/prototipos/${alt}/verbetes/${encodeURIComponent(t.slug)}`;
