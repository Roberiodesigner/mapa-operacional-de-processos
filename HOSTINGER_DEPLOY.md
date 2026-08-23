# Deploy do Mapa Operacional na Hostinger com Supabase

Esta migração está isolada na branch `supabase-postgres`. A branch `hostinger` atual continua preservada até a validação final.

## 1. Preparar o Supabase

1. Abra o projeto **Mapa Operacional** no Supabase.
2. Entre em **SQL Editor → New query**.
3. Copie todo o conteúdo de `supabase/schema.sql`, execute e confirme a mensagem de sucesso.
4. Em **Storage**, confirme que o bucket privado `mapa-operacional-private` foi criado.
5. Em **Authentication → URL Configuration**, cadastre o domínio temporário da Hostinger e, depois, o domínio definitivo nas Redirect URLs.

O SQL cria todas as tabelas, índices, administrador inicial, RLS e políticas do Storage. Não crie tabelas manualmente no phpMyAdmin; o MySQL da Hostinger deixa de ser usado nesta branch.

## 2. Obter a conexão Postgres

No Supabase, abra **Connect → ORMs → Drizzle** e escolha a conexão **Session pooler** compatível com IPv4. Copie a URI, mas mantenha literalmente o marcador `[YOUR-PASSWORD]` dentro dela.

Na Hostinger, salve a senha real separadamente em `DATABASE_PASSWORD`. A aplicação codifica automaticamente caracteres como `@`, `#`, `%`, `/` e `:`, sem exigir que você monte manualmente uma URI. A senha é segredo e nunca deve ser enviada por mensagem ou commitada no GitHub.

## 3. Configurar a aplicação Node.js

No hPanel, use a aplicação Node.js já criada e altere para:

- repositório: `Roberiodesigner/mapa-operacional-de-processos`;
- branch: `supabase-postgres` durante a validação;
- versão do Node.js: `22`;
- framework: `Next.js`;
- diretório raiz: `.`;
- instalação: `npm ci`;
- build: `npm run build`;
- inicialização: `npm start`.

## 4. Variáveis da Hostinger

Configure uma por uma ou importe um arquivo `.env` baseado em `.env.example`:

```text
PLATFORM_ADMIN_EMAIL=roberiolimarl77@gmail.com
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
DATABASE_URL=postgresql://postgres.SEU_PROJECT_REF:[YOUR-PASSWORD]@HOST_DO_SESSION_POOLER:5432/postgres
DATABASE_PASSWORD=SUA_SENHA_REAL_DO_BANCO
DATABASE_POOL_SIZE=5
SUPABASE_STORAGE_BUCKET=mapa-operacional-private
ASAAS_ENVIRONMENT=sandbox
ASAAS_API_KEY=SUA_CHAVE_SECRETA
ASAAS_WEBHOOK_TOKEN=SEU_TOKEN_PROPRIO
```

Em `DATABASE_URL`, não troque `[YOUR-PASSWORD]` pela senha. Coloque a senha somente em `DATABASE_PASSWORD`; são duas variáveis diferentes.

Não configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` nem `PRIVATE_UPLOADS_PATH`. Elas pertenciam à versão MySQL anterior. `DATABASE_PASSWORD`, sem o prefixo `DB_`, é a variável nova e correta para o Supabase.

`SUPABASE_SERVICE_ROLE_KEY` também não é necessária nesta implementação. O Storage recebe a sessão autenticada e respeita as políticas RLS; isso reduz o impacto de um segredo vazado.

## 5. Reimplantar e validar

Clique em **Reimplantar** e aguarde o build terminar. Valide no domínio temporário:

1. cadastro, login, recuperação e logout;
2. criação automática do Workspace e carregamento de `/app`;
3. criação, edição e salvamento de mapas;
4. painel `/admin` somente com o e-mail administrativo;
5. alteração de planos refletida na página pública;
6. upload, download e exclusão de evidências;
7. link `/review/...` numa janela anônima;
8. comentário externo sem login;
9. convite e permissões de um usuário autenticado;
10. checkout Asaas no sandbox.

## 6. Domínio definitivo

Depois da validação, conecte o domínio definitivo, atualize as Redirect URLs do Supabase e a URL do webhook no Asaas. A troca de domínio não exige alterar o banco.

## Segurança

- a aplicação roda em Node.js puro, sem runtime Cloudflare;
- o Postgres é acessado somente no servidor por `DATABASE_URL`;
- todas as tabelas públicas possuem RLS;
- Workspaces usam `auth.uid()` e vínculo de membros para isolamento;
- o bucket é privado e os arquivos ficam sob o prefixo do Workspace;
- `/admin` continua separado e exige Super Admin;
- links de revisão armazenam somente o hash do token;
- nenhuma credencial real fica no repositório.
