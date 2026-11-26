# Site do TransfoPress Brasil

Site do **TransfoPress Brasil**, a rede de pesquisa sobre a imprensa em língua estrangeira publicada no Brasil (séculos XVIII a XX), com os verbetes, as notícias e a memória dos encontros. Endereço: https://transfopressbrasil.franca.unesp.br.

É a versão em [EmDash](https://emdashcms.com) do site em WordPress 4.3.1 (2015) que só abria dentro da unespNET. O visual (cabeçalho, menu, cores, fontes e logos dos parceiros) e os endereços foram mantidos: os links antigos, como `/?p=123`, `/memory/...` e `/download/...`, levam com 301 para a página certa. A base técnica é a mesma do site do CPPS ([cpps-unesp/site-cpps](https://github.com/cpps-unesp/site-cpps)) e do FoMerco ([lab-ippri-unesp/site-fomerco](https://github.com/lab-ippri-unesp/site-fomerco)): Astro no Cloudflare Workers, banco D1 e mídia no R2.

## Para quem edita o conteúdo

Tudo é editado em `/_emdash/admin` (link "Área restrita" no rodapé), com login por passkey. O que fica onde, como publicar uma notícia ou um verbete e como trocar logos e cores: [docs/conteudo.md](docs/conteudo.md).

## Para quem mexe no código

```bash
npm install
npm run dev        # http://localhost:4321 (o admin local tem um atalho sem passkey, mostrado no terminal)
npm run ci         # valida o seed, checa os tipos e faz o build
```

No primeiro `npm run dev` o banco local é criado com os modelos de `seed/seed.json`. Para ter também o conteúdo do site antigo, conclua a configuração em `/_emdash/admin` marcando **Sample content**, ou abra `/_emdash/api/setup/dev-bypass?redirect=/`.

| Onde | O quê |
|---|---|
| `src/pages/` | Páginas: início, páginas fixas, notícias (com filtro por tag), verbetes, memória, downloads, busca, sitemap e 404 |
| `src/lib/conteudo.ts` | Leitura e validação do conteúdo do EmDash |
| `src/middleware.ts` + `src/lib/redirecionamentos.json` | Redirecionamentos dos endereços do WordPress |
| `src/layouts/Base.astro` | Cabeçalho, menu, busca e rodapé com os parceiros |
| `public/static/` | Visual do site antigo: CSS, fontes (Source Sans 3) e imagens |
| `public/wp-content/uploads/`, `public/arquivos/` | Imagens e PDFs do site antigo, nos mesmos caminhos de antes |
| `legado/` | Exportação do WordPress: conteúdo limpo, estrutura, tema e lista dos endereços antigos |
| `seed/gerar-seed.mjs` → `seed/seed.json` | Modelos de conteúdo e conteúdo inicial, gerados a partir de `legado/`. Edite o script e rode `npm run seed` |
| `wrangler.jsonc` | Worker, banco, bucket e cron |

O CI confere que `seed/seed.json`, `src/lib/redirecionamentos.json` e `src/lib/imagens-ampliadas.json` são exatamente o que o script gera: depois de mudar o script ou `legado/`, rode `npm run seed` e faça commit dos três.

Deploy, domínio e atualização do EmDash: [docs/deploy.md](docs/deploy.md). Assistentes de IA: o `AGENTS.md` tem as regras do repositório, e [docs/mcp-e-skills.md](docs/mcp-e-skills.md) explica o MCP da documentação do EmDash, o MCP do site e as skills.
