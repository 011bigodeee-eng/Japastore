# JAPA STORE

Catálogo de moda masculina e streetwear de São Carlos — SP. Next.js App Router, TypeScript, Tailwind CSS 4, Framer Motion, Lucide, React Hook Form, Zod e Supabase. Preparado para Vercel, sem gateway de pagamento ou números de contato fictícios.

## Publicar somente a prévia visual

Para avaliar a estética, importe o repositório na Vercel com o preset Next.js e publique **sem configurar variáveis do Supabase**. A vitrine, os filtros, os produtos e o carrinho funcionam com os dados ilustrativos locais. Não é necessário criar banco, executar migrations ou cadastrar administrador nesta etapa.

Use instalação `npm ci`, build `npm run build` e Node.js 24. O número de WhatsApp não é inventado e pedidos reais permanecem indisponíveis. O link administrativo e as instruções técnicas de conexão ficam ocultos na prévia.

Se já tiver preenchido variáveis do Supabase na Vercel, remova-as dessa implantação para usar o modo demonstrativo. `NEXT_PUBLIC_SITE_URL` é opcional para a prévia; configure o domínio público quando quiser os links de SEO definitivos. As instruções abaixo sobre banco e administração são apenas para ativar a loja real futuramente.

## Desenvolvimento

Requer Node.js 22.12 ou superior (testado com Node 24) e npm. Use o checkout existente; não é necessário criar worktrees.

```sh
npm ci
npm run dev
```

Sem variáveis Supabase, a vitrine usa **8 produtos demonstrativos**, com preços e estoques fictícios explicitamente identificados e ilustrações SVG originais locais. O carrinho pode ser explorado; pedidos ficam bloqueados. O painel não possui senha de demonstração ou modo de gravação local.

As imagens do Instagram não foram fornecidas. Substitua as ilustrações por fotografias autorizadas no painel. Nenhum número de vendas é inventado: “No radar” é uma seleção manual da loja.

## Configurar a loja real no Supabase

1. Crie um projeto Supabase. No SQL Editor, execute **uma vez** `supabase/migrations/001_store.sql`, ou aplique via Supabase CLI (`supabase db push` com o projeto previamente vinculado). A migration cria tabelas, índices, RLS, a função transacional `save_product` e o bucket público `catalog` (JPG/PNG/WebP, até 5 MB por arquivo).
2. Em Project Settings / API, obtenha a URL do projeto e a **publishable key** (a chave anon legada também é compatível). Configure `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
NEXT_PUBLIC_SITE_URL=https://SEU-DOMINIO
```

Esses valores são públicos. **Nunca use `service_role`, secret API key, senha do banco ou JWT administrativo em variáveis `NEXT_PUBLIC_*`.** O frontend só usa a chave pública; as permissões são impostas pelo banco, não pela interface.

3. Em Authentication / Users, crie o usuário proprietário com e-mail e senha seguros. Desabilite cadastro público em Auth / Providers se não quiser contas comuns. Não existe cadastro público no site. No SQL Editor, autorize o UUID obtido em Auth:

```sql
insert into public.admin_users (user_id)
values ('UUID-DO-USUARIO-CRIADO-NO-AUTH');
```

Nenhum usuário pode conceder a si mesmo essa permissão pela API. Para revogar, remova a linha como responsável pelo banco. Configure recuperação de senha e SMTP nas ferramentas do Supabase; a aplicação não implementa fluxo próprio de recuperação.

4. Reinicie `npm run dev` e acesse a rota `/admin`. Cadastre categorias e marcas, depois produtos com descrição, fotos, preço e estoque por combinação de tamanho/cor. O SKU é único. Use a opção Destaque para a seleção “No radar”; marque Lançamento ou configure um preço promocional realmente menor que o original.
5. Na aba Loja, configure WhatsApp com **código do país + DDD + número**, Instagram, logo, banner, textos, entrega e localização. O WhatsApp permanece indisponível até um número válido ser cadastrado. Não inclua dados privados nesses campos, pois são públicos.
6. Confirme na vitrine: produto ativo em categoria ativa, variação disponível, carrinho e link final. A mudança de configurações aparece após atualizar a vitrine. Uma categoria inativa oculta seus produtos. Um erro de Supabase mostra estado de falha; não é substituído silenciosamente por dados demonstrativos.

Se estiver usando o ambiente de nuvem com rede restrita, adicione **o hostname exato do seu projeto** (por exemplo, `SEU-PROJETO.supabase.co`) às configurações de rede. Instalação usa `registry.npmjs.org`. Não é necessário permitir Instagram/WhatsApp para o servidor: esses links são abertos no navegador do cliente.

## Catálogo e pedidos

- Busca por nome/categoria; filtros de categoria, marca, faixa de preço, tamanho, cor e disponibilidade; ordenação por preço, novidades e nome.
- Páginas individuais `/produto/[slug]`, galeria ampliável com navegação e gesto horizontal no mobile, variações e produtos relacionados.
- Carrinho no armazenamento local do navegador (apenas IDs e quantidades), restauração após recarregar e limite por estoque. Também permite trocar tamanho e cor diretamente no carrinho, unindo itens iguais sem ultrapassar o estoque.
- Finalização abre uma mensagem `wa.me` com todos os itens, variações, quantidades e valores atuais. **Não confirma uma compra, não reserva e não desconta estoque.** O lojista confirma estoque, pagamento e entrega no WhatsApp e atualiza o estoque pelo painel.
- Sem pagamento online, frete calculado, rastreamento ou coleta de dados pessoais no site.

## Administração e segurança

- `/admin` exige sessão Supabase e permissão em `admin_users`. RLS protege todas as tabelas, RPC e uploads. Visitantes só veem produtos ativos em categorias ativas; usuários autenticados comuns não podem editar nada.
- Produto, imagens e variações são persistidos na mesma transação. IDs de variações são mantidos ao editar, preservando carrinhos. Falhas de estoque, preço ou SKU revertem a operação inteira.
- Confirmação antes de excluir produtos, marcas ou categorias. Relações em uso impedem exclusão de marcas/categorias; produtos excluídos levam suas imagens/variações relacionais, mas **não** os arquivos físicos.
- Fotos removidas ou uploads abandonados não são apagados automaticamente do Storage. O responsável pode limpar arquivos sem referências no painel Supabase; não remova arquivos em uso.
- Campos de URL aceitam HTTPS. React escapa os textos; o site não renderiza HTML cadastrado. O bucket só aceita arquivos raster; uploads SVG são proibidos. Sessões são geridas pelo cliente oficial Supabase. Evite scripts externos não confiáveis.
- A chave pública não concede privilégios administrativos. Não adicionar chave administrativa para “resolver” erros de RLS.

## Identidade e acessibilidade

Paleta preto/branco/cinza; fontes Inter e Space Grotesk empacotadas localmente via Fontsource (licenças OFL incluídas nos pacotes). SVGs de demonstração originais deste projeto. Intro de 2 segundos, pulável, uma vez por sessão, ignorada com `prefers-reduced-motion`. Navegação normal, foco visível, skip link, diálogos nativos com Escape e contenção de foco, menu mobile, alvos de toque e animações reduzidas. Não há scripts externos para imagens/fontes nem scroll artificial. GSAP/3D não são necessários à composição atual.

As páginas renderizam conteúdo no servidor e atualizam dados no cliente. A otimização Next Image atende os SVGs locais; imagens remotas usam dimensões responsivas e lazy loading, sem proxy irrestrito. Para produção, envie WebP/JPGs otimizados (recomendado até 1600 px); configure um loader CDN restrito se precisar de redimensionamento automático. Imagens de produto têm espaço reservado para evitar saltos.

## Verificações

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm test` executa validação de formulários, restauração de carrinho, estoque, descontos e mensagem WhatsApp. Testa também a migration em PostgreSQL embutido PGlite com papéis anônimo, autenticado e administrador: isolamento RLS, gravação atômica, preservação de IDs e upload protegido. O teste fornece apenas os esquemas mínimos `auth`/`storage`; não substitui um teste no Supabase hospedado com Auth e Storage reais.

Os testes Playwright usam Chromium instalado em `/usr/bin/chromium` no ambiente de nuvem. Em outra máquina, instale um Chromium e defina `CHROMIUM_PATH=/caminho/do/chromium`. O runner inicia `npm run start`, portanto rode build antes. Os cenários cobrem desktop e viewport mobile de 390 px, catálogo, produto, persistência do carrinho, filtros, menu e movimento reduzido. Não há credenciais reais incluídas nos testes.

```sh
npm run format        # formata fontes/configuração
npm run format:check  # verifica formatação
```

## Publicação na Vercel

1. Importe este repositório na Vercel, framework Next.js, raiz do projeto (sem subpasta), Node.js 24, instalação `npm ci` e build `npm run build`.
2. Cadastre as três variáveis públicas acima nos ambientes apropriados. Use o domínio definitivo em `NEXT_PUBLIC_SITE_URL`; o padrão local não serve como URL pública de SEO.
3. No Supabase, aplique a migration, autorize o administrador e configure Authentication / URL Configuration com o domínio de produção.
4. Publique e teste com uma sessão anônima e uma administrativa: catálogo, SKU/estoque, upload pelo celular e mensagem de WhatsApp com as peças corretas. Reimplante após alterar variáveis `NEXT_PUBLIC_*`.

Metadados, Open Graph gerado localmente, `/sitemap.xml` dinâmico e `/robots.txt` estão implementados. A área administrativa declara `noindex` e é excluída dos robôs. Produtos demonstrativos não entram no sitemap. Meça Lighthouse na implantação final com fotos reais; nenhuma pontuação é presumida.

## Organização

- `src/app`: rotas App Router, metadados, estilos globais.
- `src/components/store.tsx`: vitrine, catálogo, produto, menu e carrinho.
- `src/components/admin.tsx`: login e administração.
- `src/lib`: modelos, repositório Supabase, validações e regras de carrinho/pedido.
- `supabase/migrations`: banco, políticas de acesso e Storage.
- `tests`: testes de domínio, banco e navegador.
- `public/images`: ilustrações claramente demonstrativas, prontas para substituição.

O ambiente local pode ser validado sem integrações. A validação de Auth, Storage, publicação e contato reais depende da configuração do projeto Supabase, do administrador, das fotos e do WhatsApp do proprietário.
