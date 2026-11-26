# Conteúdo: o que fica onde

Tudo é editado no admin do EmDash, em `https://transfopressbrasil.franca.unesp.br/_emdash/admin` (link "Área restrita" no rodapé). Um rascunho não aparece no site; só o que está **publicado**.

## Coleções

| Coleção | Para quê | Onde aparece |
|---|---|---|
| **Páginas** | Apresentação (`apresentacao`), Pesquisadores, Publicações, Memória e Contato | A Apresentação é a página inicial; as outras ficam em `/<slug>`. Não mude o slug das que estão no menu |
| **Notícias** | Notícias e chamadas, com data, resumo, miniatura, idioma e tags | `/noticias`, 12 por página, e as 3 mais recentes na página inicial |
| **Verbetes** | Os verbetes sobre jornais e editores, com autoria | `/verbetes`, em ordem alfabética (sem contar artigos como "O", "Le", "Il") |
| **Memória** | Encontros, lançamentos e outros registros | Cada um em `/memoria/<slug>`. A página **Memória** é o índice: um item novo só aparece lá quando ganha um link nessa página |
| **Downloads** | PDFs e imagens para baixar | `/downloads` |
| **Parceiros** | Logos das instituições do rodapé, com link e ordem | Rodapé de todas as páginas |
| **Aparência** (item `site`) | Nome, descrição curta, logo, imagem de fundo do cabeçalho, cores, quantas notícias na página inicial, e-mail, endereço e redes sociais | Cabeçalho, página inicial e rodapé |

O menu do topo é o menu **principal** (Menus, no admin).

## Publicar uma notícia

1. **Notícias → Novo.** Título, data, resumo (é o que aparece na lista, no Google e ao compartilhar) e o texto.
2. Se quiser, uma miniatura para a lista e as tags (por exemplo `encontro-transfopress`). Cada tag ganha a lista `/noticias?tag=<tag>`.
3. Se o texto não está em português, escolha o idioma: leitores de tela e buscadores passam a ler o texto no idioma certo.
4. Publique.

## Publicar um verbete

Como uma notícia, mais o campo **Autoria** no formato `Nome Sobrenome (INSTITUIÇÃO)`; com mais de um autor, separe por vírgula. A autoria aparece abaixo do título, antes da data.

## Cores e logos

Em **Aparência → site**: as cores são códigos como `#152548`. O site confere o contraste: uma cor que deixaria o texto ilegível é trocada pela original, então se uma mudança "não pegou", tente um tom mais escuro. Logo e imagem de fundo vazios usam os do site antigo.

## Downloads

Um download com arquivo enviado pelo admin usa esse arquivo; os que vieram do site antigo apontam para `/arquivos/<nome>` (campo "Link do arquivo antigo", que não deve ser mudado). Quatro arquivos do site antigo não vieram na exportação e estão como **rascunho** até alguém enviar o PDF: Shûkan Nambei, Eugène Hollender, L'Écho français e Le Messager. Para publicar, abra o item, envie o PDF no campo "Arquivo" e publique.

## Imagens do site antigo

As imagens das notícias e dos verbetes antigos ficam em `public/wp-content/uploads/` e não aparecem na biblioteca de mídia do admin. Elas continuam no texto e podem ser removidas no editor como qualquer imagem; uma imagem nova enviada pelo admin vai para a biblioteca.

Os e-mails pessoais citados nas notícias antigas foram trocados por "[e-mail removido]". Os PDFs de `public/arquivos/` são os documentos originais e não foram alterados.

## Endereços antigos

Os links do site WordPress continuam funcionando: `/?p=123`, `/memory/...`, `/download/...`, `/tag/...`, `/category/...`, os links com barra no fim e a busca `/?s=`. A lista completa está em `legado/redirects.txt`. Mudar o slug de um item antigo quebra o redirecionamento para ele.

## Pelo assistente de IA (MCP)

O site tem um servidor MCP para editar o conteúdo por um assistente de IA. Hoje ele está em `https://transfopress-site.cpps-franca.workers.dev/_emdash/api/mcp` e, depois da troca do domínio, em `https://transfopressbrasil.franca.unesp.br/_emdash/api/mcp`. No Claude Code, este repositório já traz o `.mcp.json`: aprove o servidor `transfopress-site` e rode `/mcp` para entrar com a passkey. No Claude (app ou claude.ai): Configurações → Conectores → Adicionar conector personalizado, com o mesmo endereço. Peça ao assistente para criar como rascunho e confira no admin antes de publicar. Como conectar, permissões e cuidados: [mcp-e-skills.md](mcp-e-skills.md).
