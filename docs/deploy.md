# Deploy

O site roda inteiro na Cloudflare, como um **Worker**, na conta do CPPS e com a mesma arquitetura do site do CPPS (ver `docs/deploy-e-redirects.md` no repositório `cpps-unesp/site-cpps`).

| Recurso | Nome | Binding | Para quê |
|---|---|---|---|
| Worker | `transfopress-site` | — | Páginas, admin (`/_emdash/admin`) e MCP |
| Banco D1 | `transfopress-site` (região ENAM) | `DB` | Conteúdo e usuários |
| Bucket R2 | `transfopress-site-media` | `MEDIA` | Imagens e PDFs enviados pelo admin |
| KV (criado pelo adapter) | — | `SESSION` | Sessões do admin |
| Images (criado pelo adapter) | — | `IMAGES` | Redimensiona as imagens enviadas pelo admin |
| Cron (a cada minuto) | — | — | Publicação agendada e manutenção do EmDash |
| Arquivos estáticos | — | — | Visual, imagens (`/wp-content/uploads/...`) e PDFs (`/arquivos/...`) do site antigo |

Os limites do plano gratuito são por conta: 5 crons, 10 bancos D1 e 10 ms de CPU por requisição. Em 26/11/2026 a conta do CPPS tinha 5 bancos (com este) e outros 5 Workers (`cpps-site`, `cpps-site-teste`, `uptimeflare_worker`, `colabhd-deadman` e `vssh-repo`). Antes do primeiro deploy, confira em cada um (Settings → Triggers) quantos crons já existem: se forem 5, o deploy deste falha ao criar o cron. Aí há três saídas: tirar o cron de outro Worker (o do ambiente de teste do CPPS, por exemplo), passar a conta para o Workers Paid (US$ 5/mês) ou publicar este sem cron, trocando `"crons": ["* * * * *"]` por `"crons": []` no `wrangler.jsonc`. Sem cron, a publicação agendada e a limpeza do EmDash não rodam sozinhas; o resto do site funciona.

## Primeira publicação

Num terminal com o repositório, logado na conta do CPPS (`npx wrangler login`):

1. O banco `transfopress-site` já existe (criado em 26/11/2026, região ENAM) e o `database_id` dele está no `wrangler.jsonc`. Para recriar do zero, apague-o e rode o comando abaixo, copiando o novo `database_id` para o `wrangler.jsonc`, com commit (não é segredo):
   ```bash
   npx wrangler d1 create transfopress-site --location enam
   ```
2. Faça o build e publique **trancado**, com um endereço que o navegador recusa, para ninguém criar o administrador antes de você. Na primeira vez, o Wrangler cria o bucket e o KV.
   ```bash
   npm run build
   npx wrangler deploy --var EMDASH_SITE_URL:https://transfopress-site.invalid
   ```
3. Abra uma página do endereço workers.dev e espere: o primeiro acesso aplica as migrações do banco.
4. Destranque com `npx wrangler deploy` (sem o `--var`) e conclua logo a configuração em `https://transfopress-site.cpps-franca.workers.dev/_emdash/admin`: título, **Sample content** (importa as 5 páginas, 53 notícias, 31 verbetes, 14 posts de memória, 15 downloads, 16 parceiros, a aparência e o menu de `seed/seed.json`), conta e passkey. Use uma passkey **sincronizada** (gerenciador de senhas do Google ou da Apple), não uma presa a um aparelho. O seed é aplicado em partes; se a tela de configuração parar no meio, recarregue que ele continua.
5. Gere a chave de criptografia, guarde uma cópia num cofre de senhas e cadastre:
   ```bash
   npx emdash secrets generate
   npx wrangler secret put EMDASH_ENCRYPTION_KEY
   ```
6. Convide pelo menos mais um administrador (Usuários → Convidar). No plano gratuito o site não manda e-mail: copie o link do convite e envie à pessoa.

## Domínio transfopressbrasil.franca.unesp.br

Hoje o nome aponta para um servidor dentro da unespNET, por isso o site só abre na rede da Unesp. O caminho é o mesmo do `cpps.franca.unesp.br`: um custom hostname do Cloudflare for SaaS na zona `cppsunesp.org`.

1. Antes: pelo menos dois administradores, todos com a sessão aberta no workers.dev, e o ponto de restauração do banco anotado (`npx wrangler d1 time-travel info transfopress-site`).
2. Na zona `cppsunesp.org` (SSL/TLS → Custom Hostnames), acrescente `transfopressbrasil.franca.unesp.br`.
3. Peça a quem cuida do DNS de `franca.unesp.br` para trocar o registro de `transfopressbrasil` por um CNAME para `proxy.cppsunesp.org` e para criar o TXT de validação que a Cloudflare mostrar.
4. Acrescente a rota ao `wrangler.jsonc` e faça o deploy. É rota, não *custom domain*, porque o hostname é da zona `cppsunesp.org`:
   ```jsonc
   "routes": [{ "pattern": "transfopressbrasil.franca.unesp.br/*", "zone_name": "cppsunesp.org" }],
   ```
5. No admin: Settings → General → **Change domain** → `transfopressbrasil.franca.unesp.br`. Com rota, a verificação automática falha (o Worker não atende a uma requisição dele mesmo para a própria rota): use **Use … anyway**. Cada pessoa, ainda logada no workers.dev, usa **Continue on transfopressbrasil.franca.unesp.br** e cadastra uma passkey no domínio.
6. Quando todos entrarem pelo domínio, acrescente `"workers_dev": false` ao `wrangler.jsonc` e troque o endereço do servidor `transfopress-site` no `.mcp.json` pelo do domínio (ver [mcp-e-skills.md](mcp-e-skills.md)).
7. Confira os endereços antigos: `legado/redirects.txt` tem os 422 endereços do site WordPress e o destino de cada um.
   ```bash
   awk '{print $1}' legado/redirects.txt | while read -r u; do
     printf '%s ' "$u"; curl -s -o /dev/null -L -w '%{http_code}\n' "https://transfopressbrasil.franca.unesp.br$u"
   done | grep -v ' 200$'
   ```
   Só devem sobrar 7 endereços, todos dos 4 downloads sem arquivo: os 4 `/download/...` e 3 `/?wpdmdl=...` (ver [conteudo.md](conteudo.md#downloads)).

## Deploys seguintes (Workers Builds)

No painel: Workers & Pages → `transfopress-site` → Settings → Builds → conectar `cpps-unesp/site-transfopress`:

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Production branch:** `main`
- **Builds de outras branches: desligados.** Um preview usaria o mesmo banco da produção.
- Enquanto o site estiver só no workers.dev, defina a variável de build `EMDASH_SITE_URL` com esse endereço, para as imagens enviadas pelo admin serem otimizadas.

Deploys não mexem no conteúdo. Mudar `seed/seed.json` não altera um banco que já existe: um campo ou coleção nova no site no ar é criado pelo admin (Content types) ou pelo MCP, e levado também para o `seed/gerar-seed.mjs`, como no guia [Evolving a Deployed Site](https://docs.emdashcms.com/deployment/schema-evolution/).

## Atualizar o EmDash

Numa branch, rode `npx upgrade-emdash@latest`, leia o `.emdash/UPGRADE.md` que ele gera e descarte o que ele puser em `.agents/`, `.claude/skills/` e `skills-lock.json` (as skills chegam pelo plugin `emdash` do `.claude/settings.json`). As migrações do banco rodam sozinhas no primeiro acesso e só andam para frente: antes, anote o ponto de restauração (`npx wrangler d1 time-travel info transfopress-site`).
