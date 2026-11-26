import { getEmDashCollection, getEmDashEntry, getMenu, getTaxonomyTerms, search } from 'emdash';
import type { EditProxy, FileValue, ImageValue, PortableTextBlock } from 'emdash';

// Conteúdo editável no EmDash (/_emdash/admin). Os modelos estão em
// seed/seed.json (gerado por seed/gerar-seed.mjs). Cada função devolve objetos
// simples e já validados para os componentes; um campo vazio ou inválido vira o
// valor padrão, para o site nunca quebrar por causa do que foi digitado no admin.

type Dados = Record<string, unknown>;
type Entrada = { id: string; data: Dados; edit: EditProxy };

const str = (v: unknown, padrao = ''): string => (typeof v === 'string' ? v.trim() : padrao);
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null;
const blocos = (v: unknown): PortableTextBlock[] => (Array.isArray(v) ? (v as PortableTextBlock[]) : []);

// O slug vem do banco; `entry.id` pode trazer prefixo de idioma.
const slugDe = (e: Entrada): string => str(e.data.slug) || e.id;

// Links digitados no admin: só do próprio site, http(s) ou mailto.
export function urlSegura(url: unknown): string {
  const u = str(url);
  return /^(\/(?!\/)|https?:\/\/|mailto:|#)/i.test(u) ? u : '';
}

export function ehExterno(url: string): boolean {
  return /^https?:/i.test(url);
}

export function temImagem(valor: unknown): valor is ImageValue {
  return !!valor && typeof valor === 'object' && !!((valor as ImageValue).id || (valor as ImageValue).src);
}

// Endereço de uma imagem de campo. A mídia enviada pelo admin é guardada sem
// `src` (o EmDash o deriva da chave no R2), e uma imagem antiga salva no admin
// antes de ganhar provider "external" também perdia o `src`: o caminho volta do
// id `legado:/wp-content/...`.
export function srcImagem(valor: ImageValue | null | undefined): string {
  if (!valor) return '';
  if (typeof valor.src === 'string' && valor.src) return valor.src;
  if (typeof valor.id === 'string' && valor.id.startsWith('legado:')) return encodeURI(valor.id.slice('legado:'.length));
  const chave = (valor as { meta?: { storageKey?: unknown } }).meta?.storageKey;
  return typeof chave === 'string' && chave ? `/_emdash/api/media/file/${chave}` : '';
}

// Imagens do site antigo ficam em public/ (/wp-content ou /static) e são
// servidas direto; as enviadas pelo admin passam pelo EmDash.
export function ehImagemLegado(valor: ImageValue): boolean {
  return /^\/(wp-content|static)\//.test(srcImagem(valor));
}

export function tamanhoLegivel(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

const DATA = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
export const dataLegivel = (d: Date | null): string => (d ? DATA.format(d) : '');

function data(v: unknown): Date | null {
  if (typeof v !== 'string' && !(v instanceof Date)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const IDIOMAS = { pt: 'pt-BR', fr: 'fr', en: 'en', es: 'es', it: 'it' } as const;
export type Idioma = keyof typeof IDIOMAS;
const idioma = (v: unknown): Idioma => (str(v) in IDIOMAS ? (str(v) as Idioma) : 'pt');

async function listar(colecao: string, ordem: Record<string, 'asc' | 'desc'>): Promise<Entrada[]> {
  const { entries, error } = await getEmDashCollection<string, Dados>(colecao, { orderBy: ordem });
  if (error) throw error;
  return entries as unknown as Entrada[];
}

async function buscar(colecao: string, slug: string): Promise<Entrada | null> {
  const { entry, error } = await getEmDashEntry<string, Dados>(colecao, slug);
  if (error) throw error;
  return (entry as unknown as Entrada | null) ?? null;
}

// ---------- Aparência ----------

const REDES = ['facebook', 'instagram', 'youtube', 'x', 'linkedin', 'academia'] as const;
export type Rede = (typeof REDES)[number];

export type Aparencia = {
  nome: string;
  subtitulo: string;
  logo: ImageValue | null;
  imagemTopo: ImageValue | null;
  cores: { primaria: string; destaque: string; texto: string };
  noticiasHome: number;
  email: string;
  endereco: string;
  redes: { tipo: Rede; url: string }[];
  edit?: EditProxy;
};

export const CORES_PADRAO = { primaria: '#152548', destaque: '#73bfe5', texto: '#333333' };

export const APARENCIA_PADRAO: Aparencia = {
  nome: 'Transfopress Brasil',
  subtitulo: 'Grupo de Estudos da Imprensa em língua estrangeira no Brasil',
  logo: null,
  imagemTopo: null,
  cores: { ...CORES_PADRAO },
  noticiasHome: 3,
  email: '',
  endereco: '',
  redes: [],
};

const HEX = /^#[0-9a-f]{6}$/i;
const cor = (v: unknown, padrao: string) => (typeof v === 'string' && HEX.test(v.trim()) ? v.trim().toLowerCase() : padrao);

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}
function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

export async function getAparencia(): Promise<Aparencia> {
  const p = APARENCIA_PADRAO;
  let e: Entrada | null = null;
  try {
    e = await buscar('aparencia', 'site');
  } catch {
    // Coleção ainda não criada neste banco: fica o padrão.
  }
  if (!e) return p;
  const d = e.data;
  // A cor principal leva texto branco por cima e a do texto fica sobre o fundo
  // claro: as duas precisam de 4,5:1 (WCAG AA). A de destaque aparece sobre a
  // principal. Abaixo disso, vale a padrão.
  const primaria = cor(d.cor_primaria, CORES_PADRAO.primaria);
  const primariaOk = contraste(primaria, '#ffffff') >= 4.5 ? primaria : CORES_PADRAO.primaria;
  const texto = cor(d.cor_texto, CORES_PADRAO.texto);
  const destaque = cor(d.cor_destaque, CORES_PADRAO.destaque);
  const redes = Array.isArray(d.redes)
    ? (d.redes as { tipo?: unknown; url?: unknown }[])
        .filter((r) => REDES.includes(r?.tipo as Rede) && /^https:\/\//i.test(str(r?.url)))
        .map((r) => ({ tipo: r.tipo as Rede, url: str(r.url) }))
    : [];
  const quantas = num(d.noticias_home);
  return {
    nome: str(d.title) || p.nome,
    subtitulo: str(d.subtitulo) || p.subtitulo,
    logo: temImagem(d.logo) ? d.logo : null,
    imagemTopo: temImagem(d.imagem_topo) ? d.imagem_topo : null,
    cores: {
      primaria: primariaOk,
      destaque: contraste(destaque, primariaOk) >= 4.5 ? destaque : CORES_PADRAO.destaque,
      texto: contraste(texto, '#faf9fa') >= 4.5 ? texto : CORES_PADRAO.texto,
    },
    noticiasHome: quantas === null ? p.noticiasHome : Math.max(0, Math.min(12, Math.round(quantas))),
    email: /^[^\s@<>"]+@[^\s@<>"]+$/.test(str(d.contato_email)) ? str(d.contato_email) : '',
    endereco: str(d.contato_endereco),
    redes,
    edit: e.edit,
  };
}

// Só cores validadas (#rrggbb) entram aqui: o resultado é seguro para um <style>.
export function cssAparencia(a: Aparencia): string {
  const { primaria, destaque, texto } = a.cores;
  return `:root{--primaria:${primaria};--primaria-clara:color-mix(in srgb,${primaria} 82%,#fff);--destaque:${destaque};--tinta:${texto}}`;
}

// ---------- Menu ----------

export type ItemMenu = { rotulo: string; url: string; externo: boolean };

const MENU_PADRAO: ItemMenu[] = [
  ['Apresentação', '/'],
  ['Pesquisadores', '/pesquisadores'],
  ['Verbetes', '/verbetes'],
  ['Notícias', '/noticias'],
  ['Memória', '/memoria'],
  ['Publicações', '/publicacoes'],
  ['Contato', '/contato'],
].map(([rotulo, url]) => ({ rotulo, url, externo: false }));

export async function getMenuPrincipal(): Promise<ItemMenu[]> {
  try {
    const menu = await getMenu('principal');
    if (menu && menu.items.length > 0) {
      return menu.items
        .map((item) => {
          const url = urlSegura(item.url);
          return { rotulo: item.label, url, externo: ehExterno(url) };
        })
        .filter((item) => item.url);
    }
  } catch {
    // Sem o menu no banco: fica o padrão.
  }
  return MENU_PADRAO;
}

// ---------- Parceiros ----------

export type Parceiro = { nome: string; logo: ImageValue; link: string; edit: EditProxy };

export async function getParceiros(): Promise<Parceiro[]> {
  try {
    const lista = await listar('parceiros', { ordem: 'asc' });
    return lista
      .filter((e) => temImagem(e.data.logo))
      .map((e) => ({ nome: str(e.data.title), logo: e.data.logo as ImageValue, link: urlSegura(e.data.link), edit: e.edit }));
  } catch {
    return [];
  }
}

// ---------- Páginas ----------

export type Pagina = { slug: string; titulo: string; resumo: string; conteudo: PortableTextBlock[]; edit: EditProxy };

export async function getPagina(slug: string): Promise<Pagina | null> {
  const e = await buscar('paginas', slug);
  if (!e) return null;
  return { slug, titulo: str(e.data.title), resumo: str(e.data.resumo), conteudo: blocos(e.data.conteudo), edit: e.edit };
}

export async function getPaginas(): Promise<Pagina[]> {
  return (await listar('paginas', { title: 'asc' })).map((e) => ({
    slug: slugDe(e),
    titulo: str(e.data.title),
    resumo: str(e.data.resumo),
    conteudo: [],
    edit: e.edit,
  }));
}

// ---------- Notícias, verbetes e memória ----------

export type Colecao = 'noticias' | 'verbetes' | 'memoria';

export type Texto = {
  colecao: Colecao;
  slug: string;
  url: string;
  titulo: string;
  data: Date | null;
  resumo: string;
  imagem: ImageValue | null;
  idioma: Idioma;
  autoria: string;
  tags: { slug: string; rotulo: string }[];
  conteudo: PortableTextBlock[];
  edit: EditProxy;
};

type Termo = { slug: string; label: string };

function paraTexto(colecao: Colecao, e: Entrada): Texto {
  const d = e.data;
  const slug = slugDe(e);
  const termos = ((d.terms as Record<string, Termo[]> | undefined)?.tag ?? []) as Termo[];
  return {
    colecao,
    slug,
    url: `/${colecao}/${encodeURIComponent(slug)}`,
    titulo: str(d.title),
    data: data(d.data),
    resumo: str(d.resumo),
    imagem: temImagem(d.imagem) ? d.imagem : null,
    idioma: idioma(d.idioma),
    autoria: str(d.autoria),
    tags: termos.map((t) => ({ slug: t.slug, rotulo: t.label })),
    conteudo: blocos(d.conteudo),
    edit: e.edit,
  };
}

export async function getTextos(colecao: Colecao): Promise<Texto[]> {
  const ordem: Record<string, 'asc' | 'desc'> = colecao === 'verbetes' ? { title: 'asc' } : { data: 'desc' };
  const lista = (await listar(colecao, ordem)).map((e) => paraTexto(colecao, e));
  if (colecao === 'verbetes') {
    const semArtigo = (s: string) =>
      s.replace(/^(o|a|os|as|le|la|les|l'|il|lo|i|gli|el|the|di|der|die|das)\s+/i, '').normalize('NFD').replace(/[̀-ͯ]/g, '');
    lista.sort((a, b) => semArtigo(a.titulo).localeCompare(semArtigo(b.titulo), 'pt-BR', { sensitivity: 'base' }));
  }
  return lista;
}

// Uma página de uma lista, sem ler a coleção inteira: notícias em ordem de
// data, com filtro opcional por tag (o EmDash filtra a taxonomia no banco).
export async function getTextosPagina(
  colecao: Colecao,
  { limite, deslocamento = 0, tag }: { limite: number; deslocamento?: number; tag?: string },
): Promise<{ itens: Texto[]; temMais: boolean }> {
  const { entries, hasMore, error } = await getEmDashCollection<string, Dados>(colecao, {
    orderBy: { data: 'desc' },
    limit: limite,
    ...(deslocamento > 0 ? { offset: deslocamento } : {}),
    ...(tag ? { where: { tag } } : {}),
  });
  if (error) throw error;
  return { itens: (entries as unknown as Entrada[]).map((e) => paraTexto(colecao, e)), temMais: !!hasMore };
}

export async function getTexto(colecao: Colecao, slug: string): Promise<Texto | null> {
  const e = await buscar(colecao, slug);
  return e ? paraTexto(colecao, e) : null;
}

export async function getTag(slug: string): Promise<{ slug: string; rotulo: string } | null> {
  try {
    const termos = await getTaxonomyTerms('tag');
    const t = termos.find((x) => x.slug === slug);
    return t ? { slug: t.slug, rotulo: t.label } : null;
  } catch {
    return null;
  }
}

// ---------- Downloads ----------

export type Download = {
  slug: string;
  titulo: string;
  descricao: string;
  data: Date | null;
  arquivo: { url: string; nome: string; tamanho?: number } | null;
  edit: EditProxy;
};

function arquivoDe(d: Dados): Download['arquivo'] {
  const f = d.arquivo as FileValue | undefined;
  if (f && typeof f === 'object') {
    const chave = typeof f.meta?.storageKey === 'string' ? f.meta.storageKey : '';
    const url = chave ? `/_emdash/api/media/file/${chave}` : urlSegura(f.src) || urlSegura(f.url);
    if (url) return { url, nome: f.filename ?? '', tamanho: typeof f.size === 'number' ? f.size : undefined };
  }
  const link = urlSegura(d.link);
  return link ? { url: link, nome: decodeURIComponent(link.split('/').pop() ?? '') } : null;
}

function paraDownload(e: Entrada): Download {
  return {
    slug: slugDe(e),
    titulo: str(e.data.title),
    descricao: str(e.data.descricao),
    data: data(e.data.data),
    arquivo: arquivoDe(e.data),
    edit: e.edit,
  };
}

export async function getDownloads(): Promise<Download[]> {
  return (await listar('downloads', { data: 'desc' })).map(paraDownload);
}

export async function getDownload(slug: string): Promise<Download | null> {
  const e = await buscar('downloads', slug);
  return e ? paraDownload(e) : null;
}

// ---------- Busca ----------

export type Resultado = { titulo: string; url: string; trecho: string; tipo: string };

const ROTULO: Record<string, string> = { noticias: 'Notícia', verbetes: 'Verbete', memoria: 'Memória', paginas: 'Página' };

const escapaHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Resumo com as palavras buscadas em <mark>, ignorando acentos e maiúsculas
// como a busca. As posições são achadas no texto cru e cada pedaço é escapado
// depois, para o destaque nunca cair no meio de uma entidade HTML.
function destaca(texto: string, termos: string[]): string {
  let plano = '';
  const origem: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const _ of c) origem.push(i);
    plano += c;
  }
  const alvos = termos.map((t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()).filter(Boolean);
  const marcado = new Array<boolean>(texto.length).fill(false);
  for (const alvo of alvos) {
    for (let p = plano.indexOf(alvo); p !== -1; p = plano.indexOf(alvo, p + alvo.length)) {
      for (let k = p; k < p + alvo.length; k++) marcado[origem[k]] = true;
    }
  }
  let html = '';
  let i = 0;
  while (i < texto.length) {
    let j = i;
    while (j < texto.length && marcado[j] === marcado[i]) j++;
    const pedaco = escapaHtml(texto.slice(i, j));
    html += marcado[i] ? `<mark>${pedaco}</mark>` : pedaco;
    i = j;
  }
  return html;
}

export const MAX_RESULTADOS = 20;

export async function buscarNoSite(q: string): Promise<{ resultados: Resultado[]; temMais: boolean }> {
  const termos = q.replace(/["*^():]/g, ' ').split(/\s+/).filter(Boolean);
  // Termos entre aspas: a busca do EmDash (FTS5) trata cada um como texto.
  const consulta = termos.map((t) => `"${t}"*`).join(' ');
  if (!consulta) return { resultados: [], temMais: false };
  const { items } = await search(consulta, { collections: Object.keys(ROTULO), limit: MAX_RESULTADOS + 1 });
  const achados = items.slice(0, MAX_RESULTADOS);

  // O trecho que o EmDash devolve sai só do título; o resumo de cada item diz
  // mais. Uma leitura por coleção, só dos itens encontrados.
  const resumos = new Map<string, string>();
  const porColecao = new Map<string, string[]>();
  for (const r of achados) if (r.slug) porColecao.set(r.collection, [...(porColecao.get(r.collection) ?? []), r.slug]);
  await Promise.all(
    [...porColecao].map(async ([c, slugs]) => {
      const { entries, error } = await getEmDashCollection<string, Dados>(c, { where: { slug: slugs }, limit: slugs.length });
      if (error) throw error;
      for (const e of entries as unknown as Entrada[]) resumos.set(`${c}/${slugDe(e)}`, str(e.data.resumo));
    }),
  );

  const resultados = achados.map((r) => {
    const slug = r.slug ?? '';
    const url = r.collection === 'paginas' ? (slug === 'apresentacao' ? '/' : `/${slug}`) : `/${r.collection}/${encodeURIComponent(slug)}`;
    return {
      titulo: r.title ?? slug,
      url,
      trecho: destaca(resumos.get(`${r.collection}/${slug}`) ?? '', termos),
      tipo: ROTULO[r.collection] ?? '',
    };
  });
  return { resultados, temMais: items.length > MAX_RESULTADOS };
}
