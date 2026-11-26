# Tema próprio do Transfopress Brasil: cores e fontes

Extraído de `style-original.css` (tema "Transfopress Brasil Tema" v1.0) e das capturas em `capturas/`.

## Fonte
- **Source Sans Pro** (Google Fonts, pesos 300 e 400) em tudo: corpo, menu, títulos, links. Fallback `sans-serif`.
- Logo "TRANSFOPRESS BRASIL" é imagem (`logo-transfopress-brasil.png`, 564x93), em versalete preto, com o subtítulo "Transnational network for the study of foreign language press (XVIIIth-XXth century)".
- Tamanhos nas páginas: h1 26px, h2 24px, h3 20px, h4 18px, h5 16px; menu 13px em caixa alta; texto justificado.

## Cores
| Papel | Hex |
|---|---|
| Azul-marinho principal (busca, item ativo do menu, menu móvel, botões, barra de destaque) | `#152548` (= rgb(21,37,72)) |
| Azul-marinho hover / submenu / ativo no móvel | `#33446a`, borda `#36476a`, hover de botão `#143272` |
| Azul-claro de destaque (ícone e texto da busca, subtítulos, hover de submenu) | `#73bfe5` |
| Texto, títulos, links do conteúdo e do menu | `#333333` (links sem cor própria; sublinhados) |
| Texto do botão do menu móvel | `#333e55` |
| Separador "|" do menu | `#757575`; linha sob o menu `#b5b5b5` |
| Sidebar (títulos / links) | `#757575` / `#636363`, tracejado `#a8a8a8` |
| Fundo da página | textura `bg-site.png` (média `#faf9fa`, quase branco) |
| Cabeçalho | foto de jornais antigos `bg_topo.jpg` (1240x211, tons sépia, média `#f2ebe3`), sombra `#ccc` |
| Caixa de post | fundo `#fffbf7`, borda `#ede6db`; separador de lista tracejado `#999` |
| Rodapé | sem cor própria: fundo da página + imagem de logos `rodape-logos.png` |
| Branco | `#ffffff` (texto sobre o marinho) |

Cores inline no conteúdo, vindas do editor e não do tema (não reaproveitar): `#0000ff`, `#008080`, `#00d1d1`, `#33cccc`, `#339966`, `#993300`. `#ffa902`/`#ff7302` são do plugin Download Manager.

## Arquivos
- `logo-transfopress-brasil.png`: logo principal (cabeçalho, esquerda)
- `unesp-logo.png`: logo Unesp (cabeçalho, direita, acima da busca)
- `rodape-logos.png`: tira com os 16 logos (ordem em `../estrutura.json`)
- `bg_topo.jpg`, `bg-site.png`, `lupa-img.png`, `list-icon-pesquisadores.png`: imagens do tema
- `capturas/`: home, notícia, verbete e Pesquisadores em 1440 e 390 px (Chrome headless, 25/11/2026)
