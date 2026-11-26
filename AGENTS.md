# AGENTS.md

Instruções para assistentes de IA que mexem neste repositório: o site do TransfoPress Brasil em EmDash (Astro 7 no Cloudflare Workers, banco D1 e mídia no R2).

## Documentação do EmDash

- Antes de responder sobre APIs, configuração ou comportamento do EmDash, consulte o MCP `emdash-docs` (busca na documentação atual) e o código em `node_modules/emdash/src`. A memória do modelo sobre o EmDash costuma estar desatualizada.
- As skills `emdash:*` (plugin do `.claude/settings.json`) cobrem seed, consultas, Portable Text, CLI, plugins e atualização de versão.
- O MCP `transfopress-site` edita o conteúdo do site no ar, com o papel de quem fez login. Crie como rascunho e peça conferência no admin antes de publicar. Detalhes em `docs/mcp-e-skills.md`.

## Comandos

- `npm run dev`: site local em http://localhost:4321. Banco local com o conteúdo do site antigo: `/_emdash/api/setup/dev-bypass?redirect=/`.
- `npm run ci`: valida o seed, roda `astro check` e faz o build. Rode antes de cada commit.
- `npm run seed`: gera `seed/seed.json`, `src/lib/redirecionamentos.json` e `src/lib/imagens-ampliadas.json` a partir de `legado/`. O CI exige que os três sejam exatamente o que o script gera.

## Regras deste site

- Textos do site, comentários, commits e docs em português do Brasil. Commits no padrão `tipo(escopo): descrição` (feat, fix, docs, chore).
- Conteúdo vive no banco, não no código: mudanças de modelo (coleção ou campo) no site no ar são feitas pelo admin ou pelo MCP e levadas também para `seed/gerar-seed.mjs`.
- Leia o conteúdo só por `src/lib/conteudo.ts`, que valida tudo o que vem do admin. Imagens de campo passam por `srcImagem()`: as do site antigo têm `provider: "external"` e caminho em `/wp-content/...`.
- Listas grandes leem só a página pedida (`getTextosPagina`, com `limit`/`offset`): o plano gratuito do Workers tem 10 ms de CPU por requisição.
- Nada de dado pessoal no repositório: o XML exportado do WordPress tem envios de formulário e nunca entra aqui. E-mails pessoais do conteúdo antigo foram trocados por "[e-mail removido]".
- Recursos da Cloudflare (banco, bucket, Worker, domínio) só se mudam com o ok de quem cuida do site. Passo a passo em `docs/deploy.md`.
