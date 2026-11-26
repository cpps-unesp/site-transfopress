# MCP e skills de agente

Três peças ajudam um assistente de IA (Claude, Cursor, Copilot, Codex...) a trabalhar com este site. O `.mcp.json` e o `.claude/settings.json` deste repositório já trazem as três para o Claude Code.

| Peça | Para quê | Onde |
|---|---|---|
| MCP da documentação (`emdash-docs`) | Pesquisar a documentação atual do EmDash | `https://docs.emdashcms.com/mcp` |
| MCP do site (`transfopress-site`) | Ler e editar o conteúdo do site | `/_emdash/api/mcp` do site |
| Skills de agente (`emdash:*`) | Instruções do EmDash para quem mexe no código | plugin `emdash@emdash` |

## MCP da documentação

Público, só de leitura e sem login. Tem uma ferramenta, `search_docs`, que pesquisa em docs.emdashcms.com. Com ele o assistente consulta a documentação da versão atual em vez de confiar na memória. Não lê nem altera o site. As perguntas vão para os servidores do EmDash, então não ponha segredo nem dado pessoal nelas.

- **Claude Code:** já está no `.mcp.json`; aprove o servidor `emdash-docs` ao abrir o projeto.
- **Claude (app e claude.ai):** Configurações → Conectores → Adicionar conector personalizado, com `https://docs.emdashcms.com/mcp`. Assim ele vale em qualquer conversa, para todos os sites.
- **Codex:** `codex mcp add emdash-docs --url https://docs.emdashcms.com/mcp`.

## MCP do site: editar o conteúdo por um assistente

O EmDash já vem com um servidor MCP ligado (opção `mcp` da integração, `true` por padrão; o `astro.config.mjs` não a desliga). Ele fica em:

| Ambiente | Endereço do MCP |
|---|---|
| Produção, até a troca do domínio | `https://transfopress-site.cpps-franca.workers.dev/_emdash/api/mcp` |
| Produção, depois da troca | `https://transfopressbrasil.franca.unesp.br/_emdash/api/mcp` |
| Local (`npm run dev`) | `http://localhost:4321/_emdash/api/mcp` |

O endpoint só responde a quem está autenticado, e cada pessoa age com o papel que tem no admin: um Contributor continua só criando rascunhos, mesmo pelo assistente. As ferramentas cobrem conteúdo (listar, ler, criar, editar, publicar), mídia, busca, taxonomias, menus e o modelo de conteúdo.

### Conectar

- **OAuth (recomendado).** O site publica a descoberta OAuth e aceita registro dinâmico de cliente: basta informar o endereço do MCP. O cliente abre o admin no navegador, a pessoa entra com a passkey e aprova as permissões. A sessão do admin no navegador, sozinha, não autentica o MCP.
  - **Claude Code:** o `.mcp.json` já traz o servidor `transfopress-site`. Aprove-o e rode `/mcp` para fazer o login.
  - **Claude (app e claude.ai):** Configurações → Conectores → Adicionar conector personalizado, com o endereço do MCP.
- **Token de API.** Para clientes sem OAuth ou para automação: no admin, Configurações → API Tokens. Para o dia a dia bastam `content:read`, `content:write`, `media:read` e `media:write`; deixe `admin`, `schema:write`, `settings:manage` e os `transfer:*` (exportar e importar o site) para a pessoa. Configure o cliente com o cabeçalho `Authorization: Bearer <token>` e guarde o token num cofre de senhas, nunca num arquivo do repositório.

Na troca do domínio ([deploy.md](deploy.md#domínio-transfopressbrasilfrancaunespbr)), troque o endereço no `.mcp.json` e reconecte os clientes: o login vale para o endereço em que foi feito.

### Cuidados

- O MCP grava direto no banco de produção, como o admin. Peça ao assistente para criar como **rascunho** e confira no admin antes de publicar.
- Em edições em lote, anote antes o ponto de restauração do banco: `npx wrangler d1 time-travel info transfopress-site`.
- Mudar o modelo de conteúdo pelo MCP (criar coleção ou campo) altera só este banco; leve a mudança também para `seed/gerar-seed.mjs` (ver [Evolving a Deployed Site](https://docs.emdashcms.com/deployment/schema-evolution/)).
- Para desligar o MCP, `mcp: false` na integração `emdash()` do `astro.config.mjs`.

## Skills de agente: mexer no código

As [skills oficiais do EmDash](https://github.com/emdash-cms/skills) (licença MIT) ensinam o assistente a trabalhar com o EmDash: `building-emdash-site` (modelo de conteúdo, seed, consultas, Portable Text, menus, taxonomias, deploy), `emdash-cli`, `creating-plugins`, `upgrading-emdash` e, para migrações, `wordpress-theme-to-emdash` e `wordpress-plugin-to-emdash`.

- **Claude Code:** o `.claude/settings.json` registra o marketplace `emdash-cms/skills` e ativa o plugin `emdash`. Ao abrir o projeto, o Claude Code pede para confiar no marketplace e instala o plugin; as skills aparecem como `emdash:building-emdash-site` etc. Para pegar versões novas: `/plugin marketplace update emdash`.
- **Outros assistentes:** `npx skills add emdash-cms/skills` instala para Cursor, Copilot, Codex, Gemini CLI e outros. Não faça commit do `.agents/` nem do `skills-lock.json` que ele gera: as cópias no repositório envelhecem.
- O `npx upgrade-emdash@latest` (ver [Atualizar o EmDash](deploy.md#atualizar-o-emdash)) também roda esse instalador. Descarte o que ele gerar em `.agents/`, `.claude/skills/` e `skills-lock.json`.

As regras específicas deste site estão no [`AGENTS.md`](../AGENTS.md).
