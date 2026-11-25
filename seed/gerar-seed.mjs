#!/usr/bin/env node
// Gera seed/seed.json (modelos de conteúdo e todo o conteúdo do site antigo) e
// src/lib/redirecionamentos.json (endereços antigos que não seguem uma regra).
//
// Fontes, todas em legado/ (exportadas do WordPress em 25/11/2026):
//   conteudo.json   HTML limpo de cada página, notícia, verbete e memória, com
//                   as datas e tags da exportação do painel (WXR)
//   redirects.txt   endereço antigo -> endereço novo
//   estrutura.json  menu, redes, e-mail e logos do rodapé
// As imagens antigas ficam em public/wp-content/uploads (mesmos caminhos de
// antes) e os arquivos de download em public/arquivos.
//
// O seed só vale para banco novo (primeira publicação). Depois disso o conteúdo
// é editado no admin; ver docs/conteudo.md.
//
// Uso: node seed/gerar-seed.mjs

import { readFileSync, writeFileSync, existsSync, readdirSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gutenbergToPortableText } from '@emdash-cms/gutenberg-to-portable-text';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => JSON.parse(readFileSync(join(RAIZ, p), 'utf8'));
const PUBLICO = join(RAIZ, 'public');
const DOMINIO = /^https?:\/\/transfopressbrasil\.franca\.unesp\.br/i;
const IDIOMAS = ['pt', 'fr', 'en', 'es', 'it'];

const conteudo = ler('legado/conteudo.json').itens;
const estrutura = ler('legado/estrutura.json');

// O post "IV Encontro Transfopress Brasil" respondia em /memory/2016/, mas o slug
// dele no WordPress é ivtransfopressbrasil2016.
const SLUG_NOVO = { 'memoria:2016': 'ivtransfopressbrasil2016' };
const slugNovo = (tipo, slug) => SLUG_NOVO[`${tipo}:${slug}`] ?? slug;

// ---------- endereços ----------

const redirecionamentos = {};
for (const linha of readFileSync(join(RAIZ, 'legado/redirects.txt'), 'utf8').split('\n')) {
  const [de, para] = linha.trim().split(/\s+/);
  if (!de || !para) continue;
  redirecionamentos[de] = para.replace(/^\/memoria\/2016$/, '/memoria/ivtransfopressbrasil2016');
}

// Regra geral do site novo para um caminho antigo; null se não houver regra.
export function regraGeral(caminho) {
  const sem = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho;
  let m;
  if ((m = sem.match(/^\/memory\/([^/]+)$/))) return `/memoria/${m[1]}`;
  if (sem === '/memory') return '/memoria';
  if ((m = sem.match(/^\/download\/([^/]+)$/))) return `/downloads/${m[1]}`;
  if (sem === '/download') return '/downloads';
  if ((m = sem.match(/^\/tag\/([^/]+)$/))) return `/noticias?tag=${m[1]}`;
  return sem;
}

// Endereço novo para um link do conteúdo antigo (só os do próprio site).
function linkNovo(href) {
  if (!href) return href;
  let h = href.trim();
  if (DOMINIO.test(h)) h = h.replace(DOMINIO, '') || '/';
  if (!h.startsWith('/') || h.startsWith('//')) return href;
  if (h.startsWith('/wp-content/')) return encodeURI(decodeURI(h));
  const [semHash, hash] = h.split('#');
  const exato = redirecionamentos[semHash] ?? redirecionamentos[`${semHash}/`];
  const novo = exato ?? (semHash.includes('?') ? semHash : regraGeral(semHash));
  return hash ? `${novo}#${hash}` : novo;
}

// Só o que a regra geral não resolve vai para o mapa do middleware.
const mapaMiddleware = {};
for (const [de, para] of Object.entries(redirecionamentos)) {
  const geral = de.includes('?') ? null : regraGeral(de);
  if (geral !== para) mapaMiddleware[de.replace(/(.)\/$/, '$1')] = para;
}

// ---------- imagens ----------

function dimensoes(arquivo) {
  try {
    const fd = openSync(arquivo, 'r');
    const buf = Buffer.alloc(65536);
    const n = readSync(fd, buf, 0, buf.length, 0);
    closeSync(fd);
    if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (buf.toString('ascii', 0, 3) === 'GIF') return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < n - 9) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marca = buf[i + 1];
        const tam = buf.readUInt16BE(i + 2);
        if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
          return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
        }
        i += 2 + tam;
      }
    }
  } catch {
    // sem dimensões: a imagem sai sem width/height
  }
  return {};
}

function arquivoPublico(caminho) {
  try {
    const local = join(PUBLICO, decodeURI(caminho));
    return existsSync(local) ? local : null;
  } catch {
    return null;
  }
}

// Valor de um campo de imagem que aponta para um arquivo antigo em public/.
function imagemLegado(caminho, alt = '') {
  const local = arquivoPublico(caminho);
  if (!local) return undefined;
  const src = encodeURI(decodeURI(caminho));
  return { id: `legado:${decodeURI(caminho)}`, src, alt, filename: basename(local), ...dimensoes(local) };
}

// Miniatura para as listas: a variante de ~300 px do WordPress, se existir.
function miniatura(caminho) {
  if (!caminho) return null;
  const original = caminho.replace(/-\d+x\d+(\.\w+)$/, '$1');
  const pasta = dirname(original);
  const nome = basename(original).replace(/\.\w+$/, '');
  const ext = original.match(/\.\w+$/)?.[0] ?? '';
  try {
    const variantes = readdirSync(join(PUBLICO, decodeURI(pasta)))
      .map((f) => ({ f, m: f.match(new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)x(\\d+)${ext.replace('.', '\\.')}$`)) }))
      .filter((v) => v.m && Number(v.m[1]) >= 250 && Number(v.m[1]) <= 800)
      .sort((a, b) => Number(a.m[1]) - Number(b.m[1]));
    if (variantes[0]) return `${pasta}/${variantes[0].f}`;
  } catch {
    // pasta inexistente
  }
  if (arquivoPublico(original)) return original;
  return arquivoPublico(caminho) ? caminho : null;
}

// ---------- HTML -> Portable Text ----------

const textoDe = (b) => (b.children ?? []).map((c) => c.text ?? '').join('');
const normaliza = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function htmlParaBlocos(html, { titulo, prefixo }) {
  let n = 0;
  const chave = () => `${prefixo}-${(n++).toString(36)}`;
  const embeds = [];

  const h = html
    // links e imagens do próprio site viram caminhos do site novo
    .replace(/(href|src)="([^"]*)"/g, (_, attr, url) => `${attr}="${linkNovo(url.replace(/&amp;/g, '&')).replace(/&/g, '&amp;')}"`)
    // ícones pequenos (o do Facebook ao lado do link) somem
    .replace(/<img\b[^>]*>/g, (tag) => {
      const w = Number(tag.match(/width="(\d+)"/)?.[1] ?? 999);
      const hh = Number(tag.match(/height="(\d+)"/)?.[1] ?? 999);
      return w <= 40 || hh <= 40 ? '' : tag;
    })
    // Galerias e carrosséis do tema (listas de imagens com link para o
    // original): cada imagem vira um parágrafo, agrupado depois em galeria.
    .replace(/<a\b[^>]*>\s*(<img\b[^>]*>)\s*<\/a>/g, '$1')
    .replace(/<li>\s*(<img\b[^>]*>)\s*<\/li>/g, '<p>$1</p>')
    .replace(/<(ul|ol)>\s*((?:<p><img\b[^>]*><\/p>\s*)+)<\/\1>/g, '$2')
    // vídeos e páginas incorporadas viram marcadores, trocados depois por blocos
    .replace(/<iframe\b[^>]*src="([^"]+)"[^>]*>(?:<\/iframe>)?/g, (_, src) => {
      embeds.push(src.replace(/&amp;/g, '&'));
      return `<p>@@EMBED${embeds.length - 1}@@</p>`;
    });

  const blocos = gutenbergToPortableText(h, { keyGenerator: chave });
  const saida = [];
  for (const b of blocos) {
    if (b._type === 'block') {
      const t = textoDe(b).trim();
      const m = t.match(/^@@EMBED(\d+)@@$/);
      if (m) {
        const url = embeds[Number(m[1])];
        if (/youtube\.com|youtu\.be|vimeo\.com/.test(url)) {
          saida.push({ _type: 'embed', _key: chave(), url: url.replace(/^\/\//, 'https://').replace(/^http:/, 'https:') });
        } else if (/^https:/.test(url)) {
          saida.push({ _type: 'iframe', _key: chave(), src: url });
        }
        continue;
      }
      if (!t && !(b.children ?? []).some((c) => c._type !== 'span')) continue;
      b.markDefs = b.markDefs ?? [];
      for (const c of b.children ?? []) {
        if (c._type === 'span') c.marks = c.marks ?? [];
      }
      // Quando a data vem na primeira linha de um parágrafo maior, só a linha sai.
      const primeiro = b.children?.[0];
      if (saida.length < 6 && primeiro?._type === 'span' && /^(publicad|postad)[oa] em [^\n]{4,40}\n$/i.test(primeiro.text) && b.children.length > 1) {
        b.children.shift();
      }
      // "Publicado em ..." / "Postado em ..." no topo viram a data da página;
      // "Atualizado em ..." fica, como uma linha discreta em itálico.
      if (saida.length < 6 && t.length < 90 && /^(publicad|postad|atualizad)[oa] em\b/i.test(t)) {
        const atualizado = t.match(/atualizad[oa] em\b[^\n]*/i)?.[0].trim().replace(/\.?$/, '.');
        if (atualizado) {
          saida.push({
            _type: 'block',
            _key: b._key,
            style: 'normal',
            markDefs: [],
            children: [{ _type: 'span', _key: chave(), text: atualizado.replace(/^./, (c) => c.toUpperCase()), marks: ['em'] }],
          });
        }
        continue;
      }
      saida.push(b);
    } else if (b._type === 'image') {
      const url = b.asset?.url ?? '';
      const local = arquivoPublico(url);
      if (!local) {
        if (/^https:/.test(url)) saida.push(b);
        continue;
      }
      const src = encodeURI(decodeURI(url));
      saida.push({
        _type: 'image',
        _key: chave(),
        asset: { _type: 'reference', _ref: `legado:${decodeURI(url)}`, url: src },
        ...(b.alt ? { alt: b.alt } : {}),
        ...dimensoes(local),
      });
    } else if (b._type === 'break') {
      if (saida.at(-1)?._type !== 'break') saida.push({ ...b, _key: chave() });
    } else {
      saida.push(b);
    }
  }

  // Três ou mais imagens seguidas viram uma galeria.
  for (let i = 0; i < saida.length; i++) {
    let j = i;
    while (j < saida.length && saida[j]._type === 'image') j++;
    if (j - i >= 3) {
      const imagens = saida.slice(i, j);
      saida.splice(i, j - i, { _type: 'gallery', _key: chave(), columns: 3, images: imagens });
    }
  }

  // Rótulos de seção no topo ("VERBETES:", "APRESENTAÇÃO:") e o título repetido saem.
  const alvo = normaliza(titulo);
  let autoria = '';
  for (let i = 0; i < Math.min(4, saida.length); i++) {
    const b = saida[i];
    if (b._type !== 'block') continue;
    const t = textoDe(b).trim();
    const n = normaliza(t);
    // Igual ao título, um pedaço dele, ou ele com um acréscimo curto, como o ano.
    const ehTitulo =
      b.style !== 'normal' &&
      t &&
      (n === alvo || (alvo.startsWith(n) && n.length > 12) || (n.startsWith(alvo) && n.length - alvo.length <= 12));
    if ((b.style !== 'normal' && /:\s*$/.test(t)) || ehTitulo) {
      saida.splice(i, 1);
      i--;
    }
  }

  // Títulos internos começam em h2 (h1 é o título da página) e não pulam níveis.
  const niveis = saida.filter((b) => b._type === 'block' && /^h[1-6]$/.test(b.style)).map((b) => Number(b.style[1]));
  const menor = niveis.length ? Math.min(...niveis) : 2;
  for (const b of saida) {
    if (b._type === 'block' && /^h[1-6]$/.test(b.style)) {
      const novo = Number(b.style[1]) - menor + 2;
      if (novo > 4) {
        b.style = 'normal';
        for (const c of b.children ?? []) if (c._type === 'span' && !c.marks.includes('strong')) c.marks.push('strong');
      } else {
        b.style = `h${novo}`;
      }
    }
  }
  return { blocos: saida, autoria };
}

// ---------- itens ----------

function dataDe(item) {
  const wp = item.datas?.publicacao_wp;
  if (wp?.valor_gmt && !wp.valor_gmt.startsWith('0000')) return new Date(`${wp.valor_gmt.replace(' ', 'T')}Z`).toISOString();
  if (wp?.valor) return new Date(`${wp.valor.replace(' ', 'T')}-03:00`).toISOString();
  const d = item.datas?.publicacao?.valor ?? item.datas?.publicacao_estimada?.valor ?? item.datas?.modificacao?.valor;
  return new Date(d.length === 7 ? `${d}-01T12:00:00-03:00` : d).toISOString();
}

// Resumo: a descrição do Yoast ou o resumo do WordPress; sem eles, o começo do
// texto. Cortado em ~240 caracteres, no fim de uma palavra.
function resumoDe(item, blocos) {
  const texto = (
    item.resumo ||
    blocos
      .filter((b) => b._type === 'block' && b.style === 'normal' && !b.listItem)
      .map(textoDe)
      .join(' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
  if (texto.length <= 240) return texto;
  return `${texto.slice(0, 240).replace(/[\s,;:.–-]+\S*$/, '')}…`;
}

const idiomaDe = (item) => (IDIOMAS.includes(item.idioma) ? item.idioma : 'pt');

const entradas = { paginas: [], noticias: [], verbetes: [], memoria: [], downloads: [], parceiros: [], aparencia: [] };
const termosUsados = new Map();

for (const item of conteudo) {
  if (item.tipo === 'download') continue;
  const slug = item.tipo === 'pagina' ? item.slug : slugNovo(item.tipo, item.slug);
  const { blocos } = htmlParaBlocos(item.html ?? '', { titulo: item.titulo, prefixo: slug.slice(0, 24) });
  const base = {
    title: item.titulo.replace(/\s+/g, ' ').trim(),
    resumo: resumoDe(item, blocos),
    conteudo: blocos,
  };
  if (item.tipo === 'pagina') {
    // O formulário de contato do site antigo (Contact Form 7) não veio: a página
    // aponta para o e-mail do grupo, com link, e o crédito do design fica como nota.
    if (slug === 'contato' && estrutura.email?.atual) {
      const email = estrutura.email.atual;
      let n = 0;
      const chave = () => `contato-${n++}`;
      const bloco = (children, markDefs = []) => ({ _type: 'block', _key: chave(), style: 'normal', markDefs, children });
      const span = (text, marks = []) => ({ _type: 'span', _key: chave(), text, marks });
      base.conteudo = [
        bloco([span('Para falar com o grupo TransfoPress Brasil, escreva para '), span(email, ['email']), span('.')], [
          { _type: 'link', _key: 'email', href: `mailto:${email}` },
        ]),
        bloco([span('Design original do site: Lygia Moritz Design.', ['em'])]),
      ];
      base.resumo = `Contato do grupo TransfoPress Brasil: ${email}.`;
    }
    entradas.paginas.push({ id: `pagina-${slug}`, slug, status: 'published', data: base });
    continue;
  }

  // Verbetes trazem a autoria no topo, em três formatos: "Nome (UNESP)",
  // "VERBETE: Nome (UFG)" (em qualquer estilo) ou "Nome" e "Unesp/CNPq" em
  // dois parágrafos.
  let autoria = '';
  if (item.tipo === 'verbete') {
    const texto = (b) => (b?._type === 'block' && !b.listItem ? textoDe(b).trim() : '');
    const limpa = (s) =>
      s
        .replace(/^VERBETES?:/i, '')
        .replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, '')
        .split('\n')
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(', ');
    const [a, b] = [texto(blocos[0]), texto(blocos[1])];
    if (/^VERBETES?:/i.test(a) && a.length < 150) {
      autoria = limpa(a);
      blocos.shift();
    } else if (blocos[0]?.style === 'normal' && a && a.length < 150 && /\(|UNESP|USP|UF|Univ/i.test(a)) {
      autoria = limpa(a);
      blocos.shift();
    } else if (a && a.length < 60 && !/[.:(]/.test(a) && b && b.length < 40 && /unesp|cnpq|usp|uf|univ/i.test(b)) {
      autoria = `${limpa(a)} (${limpa(b)})`;
      blocos.splice(0, 2);
    }
    // O resumo não deve começar pela autoria.
    base.resumo = resumoDe(item, blocos);
  }

  const imagem = miniatura(item.imagem_destaque);
  const tags = (item.tags ?? []).map((t) => t.slug);
  for (const t of item.tags ?? []) termosUsados.set(t.slug, t.nome);
  const dados = {
    ...base,
    data: dataDe(item),
    idioma: idiomaDe(item),
    ...(imagem ? { imagem: imagemLegado(imagem, '') } : {}),
    ...(item.tipo === 'verbete' ? { autoria } : {}),
  };
  const colecao = { noticia: 'noticias', verbete: 'verbetes', memoria: 'memoria' }[item.tipo];
  entradas[colecao].push({
    id: `${item.tipo}-${slug}`,
    slug,
    status: 'published',
    data: dados,
    ...(item.tipo === 'noticia' && tags.length ? { taxonomies: { tag: tags } } : {}),
  });
}

// Downloads: os arquivos que vieram ficam em public/arquivos; os que não
// existem mais no servidor antigo entram como rascunho, à espera do arquivo.
const arquivos = existsSync(join(PUBLICO, 'arquivos')) ? readdirSync(join(PUBLICO, 'arquivos')) : [];
for (const item of conteudo.filter((i) => i.tipo === 'download')) {
  const arquivo = arquivos.find((f) => f.replace(/\.\w+$/, '') === item.slug);
  entradas.downloads.push({
    id: `download-${item.slug}`,
    slug: item.slug,
    status: arquivo ? 'published' : 'draft',
    data: {
      title: item.titulo.replace(/\s+/g, ' ').trim(),
      descricao: (item.resumo ?? '').trim(),
      data: dataDe(item),
      link: arquivo ? `/arquivos/${arquivo}` : '',
    },
  });
}

// ---------- parceiros, aparência e menu ----------

const PARCEIROS = [
  ['unesp', 'Unesp', 'https://www.unesp.br'],
  ['chcsc', "CHCSC - Centre d'Histoire Culturelle des Sociétés Contemporaines (UVSQ)", 'https://www.chcsc.uvsq.fr'],
  ['orientale', "Università degli Studi di Napoli \"L'Orientale\"", 'https://www.unior.it'],
  ['unicamp', 'Unicamp', 'https://www.unicamp.br'],
  ['ufpr', 'UFPR', 'https://www.ufpr.br'],
  ['ufscar', 'UFSCar', 'https://www.ufscar.br'],
  ['fcrb', 'Fundação Casa de Rui Barbosa', 'https://www.gov.br/fcrb'],
  ['ufrgs', 'UFRGS', 'https://www.ufrgs.br'],
  ['ufma', 'UFMA', 'https://portalpadrao.ufma.br'],
  ['unisinos', 'Unisinos', 'https://www.unisinos.br'],
  ['ucs', 'UCS - Universidade de Caxias do Sul', 'https://www.ucs.br'],
  ['jfb', 'JFB', 'http://jfb.franca.unesp.br'],
  ['unifesp', 'Unifesp', 'https://www.unifesp.br'],
  ['biblioteca-digital', 'Biblioteca Digital da Unesp', ''],
  ['fapesp', 'FAPESP', 'https://fapesp.br'],
  ['cnpq', 'CNPq', 'https://www.gov.br/cnpq'],
];
PARCEIROS.forEach(([slug, nome, link], i) => {
  entradas.parceiros.push({
    id: `parceiro-${slug}`,
    slug,
    status: 'published',
    data: { title: nome, link, ordem: i + 1, logo: imagemLegado(`/static/img/parceiros/${slug}.png`, nome) },
  });
});

entradas.aparencia.push({
  id: 'aparencia-site',
  slug: 'site',
  status: 'published',
  data: {
    title: 'Transfopress Brasil',
    subtitulo: 'Grupo de Estudos da Imprensa em língua estrangeira no Brasil',
    cor_primaria: '#152548',
    cor_destaque: '#73bfe5',
    cor_texto: '#333333',
    noticias_home: 3,
    contato_email: estrutura.email?.atual ?? '',
    contato_endereco: 'UNESP - Faculdade de Ciências Humanas e Sociais\nAv. Eufrásia Monteiro Petráglia, 900\n14409-160 - Franca, SP',
    redes: [
      { tipo: 'facebook', url: 'https://www.facebook.com/transfopressbrasil' },
      { tipo: 'academia', url: 'https://uvsq.academia.edu/TRANSFOPRESSNetwork' },
      { tipo: 'youtube', url: 'https://www.youtube.com/@midiacult' },
    ],
  },
});

const MENU = [
  ['apresentacao', 'Apresentação', '/'],
  ['pesquisadores', 'Pesquisadores', '/pesquisadores'],
  ['verbetes', 'Verbetes', '/verbetes'],
  ['noticias', 'Notícias', '/noticias'],
  ['memoria', 'Memória', '/memoria'],
  ['publicacoes', 'Publicações', '/publicacoes'],
  ['contato', 'Contato', '/contato'],
];

// ---------- modelos ----------

const campo = (slug, label, type, extra = {}) => ({ slug, label, type, ...extra });
const IDIOMA = campo('idioma', 'Idioma do texto (marca o idioma para leitores de tela e buscadores)', 'select', {
  defaultValue: 'pt',
  validation: { options: IDIOMAS },
});
const HEX = { validation: { pattern: '^#[0-9a-fA-F]{6}$' } };

const colecoes = [
  {
    slug: 'paginas',
    label: 'Páginas',
    labelSingular: 'Página',
    description:
      'Páginas fixas: apresentacao (a página inicial), pesquisadores, publicacoes, memoria e contato. O slug é o endereço (/pesquisadores); não mude o slug dessas cinco.',
    icon: 'file-text',
    group: 'Conteúdo',
    sortOrder: 1,
    supports: ['drafts', 'revisions', 'preview', 'search'],
    urlPattern: '/{slug}',
    titleField: 'title',
    fields: [
      campo('title', 'Título', 'string', { required: true, searchable: true }),
      campo('resumo', 'Resumo (aparece no Google e ao compartilhar)', 'text'),
      campo('conteudo', 'Texto', 'portableText', { searchable: true }),
    ],
  },
  {
    slug: 'noticias',
    label: 'Notícias',
    labelSingular: 'Notícia',
    description: 'Notícias, chamadas e eventos, em /noticias. A data define a ordem da lista.',
    icon: 'newspaper',
    group: 'Conteúdo',
    sortOrder: 2,
    supports: ['drafts', 'revisions', 'preview', 'search'],
    urlPattern: '/noticias/{slug}',
    titleField: 'title',
    dateField: 'data',
    admin: { listColumns: ['data', 'idioma'] },
    fields: [
      campo('title', 'Título', 'string', { required: true, searchable: true }),
      campo('data', 'Data de publicação', 'datetime', { required: true, indexed: true }),
      campo('resumo', 'Resumo (lista de notícias, Google e redes sociais)', 'text', { searchable: true }),
      campo('imagem', 'Imagem da lista (miniatura)', 'image'),
      IDIOMA,
      campo('conteudo', 'Texto', 'portableText', { searchable: true }),
    ],
  },
  {
    slug: 'verbetes',
    label: 'Verbetes',
    labelSingular: 'Verbete',
    description: 'Verbetes sobre periódicos e acervos, em /verbetes, em ordem alfabética.',
    icon: 'book-open',
    group: 'Conteúdo',
    sortOrder: 3,
    supports: ['drafts', 'revisions', 'preview', 'search'],
    urlPattern: '/verbetes/{slug}',
    titleField: 'title',
    dateField: 'data',
    admin: { listColumns: ['autoria', 'data'] },
    fields: [
      campo('title', 'Título', 'string', { required: true, searchable: true }),
      campo('autoria', 'Autoria (ex.: Nome Sobrenome (UNESP))', 'string', { searchable: true }),
      campo('data', 'Data de publicação', 'datetime', { required: true, indexed: true }),
      campo('resumo', 'Resumo', 'text', { searchable: true }),
      campo('imagem', 'Imagem da lista (miniatura)', 'image'),
      IDIOMA,
      campo('conteudo', 'Texto', 'portableText', { searchable: true }),
    ],
  },
  {
    slug: 'memoria',
    label: 'Memória',
    labelSingular: 'Registro de memória',
    description:
      'Registros dos encontros e lançamentos, em /memoria/<slug>. O índice da página Memória é o texto da página "memoria" (em Páginas): ao criar um registro, acrescente o link lá.',
    icon: 'archive',
    group: 'Conteúdo',
    sortOrder: 4,
    supports: ['drafts', 'revisions', 'preview', 'search'],
    urlPattern: '/memoria/{slug}',
    titleField: 'title',
    dateField: 'data',
    admin: { listColumns: ['data'] },
    fields: [
      campo('title', 'Título', 'string', { required: true, searchable: true }),
      campo('data', 'Data', 'datetime', { required: true, indexed: true }),
      campo('resumo', 'Resumo', 'text', { searchable: true }),
      campo('imagem', 'Imagem', 'image'),
      IDIOMA,
      campo('conteudo', 'Texto', 'portableText', { searchable: true }),
    ],
  },
  {
    slug: 'downloads',
    label: 'Downloads',
    labelSingular: 'Download',
    description:
      'Arquivos para baixar, em /downloads/<slug>. Envie o arquivo no campo Arquivo; o campo Link é só para os arquivos que vieram do site antigo.',
    icon: 'download',
    group: 'Conteúdo',
    sortOrder: 5,
    supports: ['drafts', 'revisions'],
    urlPattern: '/downloads/{slug}',
    titleField: 'title',
    dateField: 'data',
    admin: { listColumns: ['data'] },
    fields: [
      campo('title', 'Título', 'string', { required: true }),
      campo('descricao', 'Descrição', 'text'),
      campo('data', 'Data', 'datetime', { required: true }),
      campo('arquivo', 'Arquivo', 'file'),
      campo('link', 'Link do arquivo antigo (não mude)', 'string'),
    ],
  },
  {
    slug: 'parceiros',
    label: 'Parceiros',
    labelSingular: 'Parceiro',
    description: 'Logos do rodapé, na ordem do campo Ordem. O logo deve ter fundo transparente ou branco.',
    icon: 'handshake',
    group: 'Configurações',
    sortOrder: 2,
    supports: ['drafts'],
    titleField: 'title',
    admin: { listColumns: ['ordem', 'link'] },
    fields: [
      campo('title', 'Nome (texto alternativo do logo)', 'string', { required: true }),
      campo('logo', 'Logo', 'image', { required: true }),
      campo('link', 'Site (https://...)', 'string'),
      campo('ordem', 'Ordem', 'integer', { required: true }),
    ],
  },
  {
    slug: 'aparencia',
    label: 'Aparência',
    labelSingular: 'Aparência',
    description:
      'Identidade visual, contato e redes: um único item, "site". Cores no formato #rrggbb; uma cor que deixe o texto ilegível é trocada pela padrão.',
    icon: 'palette',
    group: 'Configurações',
    sortOrder: 1,
    supports: ['drafts', 'revisions'],
    titleField: 'title',
    fields: [
      campo('title', 'Nome do site', 'string', { required: true }),
      campo('subtitulo', 'Descrição curta (título da aba e Google)', 'string'),
      campo('logo', 'Logo do cabeçalho (vazio: o logo do Transfopress Brasil)', 'image'),
      campo('imagem_topo', 'Imagem de fundo do cabeçalho (vazio: os jornais antigos)', 'image'),
      campo('cor_primaria', 'Cor principal (azul-marinho: menu ativo, botões, busca)', 'string', HEX),
      campo('cor_destaque', 'Cor de destaque (azul-claro: detalhes sobre a cor principal)', 'string', HEX),
      campo('cor_texto', 'Cor do texto', 'string', HEX),
      campo('noticias_home', 'Quantas notícias recentes mostrar na página inicial (0 esconde)', 'integer'),
      campo('contato_email', 'E-mail de contato', 'string'),
      campo('contato_endereco', 'Endereço', 'text'),
      campo('redes', 'Redes sociais', 'repeater', {
        validation: {
          subFields: [
            {
              slug: 'tipo',
              label: 'Rede',
              type: 'select',
              required: true,
              validation: { options: ['facebook', 'instagram', 'youtube', 'x', 'linkedin', 'academia'] },
            },
            { slug: 'url', label: 'Endereço (https://...)', type: 'string', required: true },
          ],
        },
      }),
    ],
  },
];

const tags = [...termosUsados].sort(([a], [b]) => a.localeCompare(b)).map(([slug, label]) => ({ slug, label }));

const seed = {
  $schema: 'https://emdashcms.com/seed.schema.json',
  version: '1',
  meta: {
    name: 'Transfopress Brasil',
    description: 'Conteúdo do site do Transfopress Brasil, migrado do WordPress',
    author: 'Transfopress Brasil',
  },
  settings: {
    title: 'Transfopress Brasil',
    tagline: 'Grupo de Estudos da Imprensa em língua estrangeira no Brasil',
    timezone: 'America/Sao_Paulo',
  },
  collections: colecoes,
  taxonomies: [
    { name: 'tag', label: 'Tags', labelSingular: 'Tag', hierarchical: false, collections: ['noticias'], terms: tags },
  ],
  menus: [
    {
      name: 'principal',
      label: 'Menu principal',
      items: MENU.map(([chave, label, url]) => ({ id: `item:principal:${chave}`, type: 'custom', label, url })),
    },
  ],
  content: entradas,
};

writeFileSync(join(RAIZ, 'seed/seed.json'), `${JSON.stringify(seed, null, 2)}\n`);
writeFileSync(
  join(RAIZ, 'src/lib/redirecionamentos.json'),
  `${JSON.stringify(Object.fromEntries(Object.entries(mapaMiddleware).sort()), null, 2)}\n`
);
const contagem = Object.fromEntries(Object.entries(entradas).map(([k, v]) => [k, v.length]));
console.log('seed/seed.json:', JSON.stringify(contagem), `tags: ${tags.length}`);
console.log('src/lib/redirecionamentos.json:', Object.keys(mapaMiddleware).length, 'endereços');
