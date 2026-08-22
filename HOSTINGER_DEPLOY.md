# Deploy do Mapa Operacional na Hostinger

Esta branch foi isolada para a migração. A `main` e o Site atual não são alterados durante os testes.

## 1. Criar o banco

No hPanel, abra **Sites → Gerenciar → Bancos de dados MySQL** e crie:

- um banco exclusivo para o Mapa Operacional;
- um usuário exclusivo com acesso total a esse banco;
- uma senha forte gerada pelo painel.

Guarde o host, porta, nome do banco e usuário. Não envie a senha por mensagem e não coloque credenciais no GitHub.

## 2. Criar a aplicação Node.js

No hPanel, escolha **Adicionar site → Aplicação Node.js → Importar repositório do GitHub** e use:

- repositório: `Roberiodesigner/mapa-operacional-de-processos`;
- branch: `hostinger`;
- versão do Node.js: `22`;
- framework: `Next.js`;
- pasta raiz: `.`;
- comando de instalação: `npm ci`;
- comando de build: `npm run build`;
- comando de inicialização: `npm start`.

Ative a implantação automática somente para a branch `hostinger` enquanto a migração estiver em validação.

## 3. Configurar as variáveis

Adicione no painel da aplicação:

```text
DB_HOST=host exibido pela Hostinger
DB_PORT=3306
DB_USER=usuário criado no hPanel
DB_PASSWORD=senha criada no hPanel
DB_NAME=nome do banco criado no hPanel
DB_SSL=false
PRIVATE_UPLOADS_PATH=pasta absoluta privada e persistente indicada pela Hostinger
PLATFORM_ADMIN_EMAIL=e-mail exclusivo do proprietário
NEXT_PUBLIC_SUPABASE_URL=URL do projeto de autenticação
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=chave publicável do projeto
ASAAS_ENVIRONMENT=sandbox
ASAAS_API_KEY=chave segura do Asaas
ASAAS_WEBHOOK_TOKEN=token seguro e exclusivo do webhook
```

`PRIVATE_UPLOADS_PATH` não pode apontar para `public/` nem para a raiz publicada do site. A aplicação recusa uploads em produção quando essa variável não está configurada.

## 4. Primeiro deploy de teste

O comando `npm start` executa a migração idempotente `mysql/0000_hostinger.sql` e inicia o Next.js na porta fornecida pela hospedagem. Use primeiro o domínio temporário da Hostinger e valide:

1. página pública e valores dos planos;
2. cadastro, login e recuperação de senha;
3. acesso de cliente em `/app`;
4. acesso exclusivo do proprietário em `/admin/login` e `/admin`;
5. criação e salvamento de mapas;
6. upload e download de evidência;
7. link público `/review/...` em janela anônima;
8. comentário do cliente sem login;
9. checkout Asaas somente no ambiente sandbox.

## 5. Domínio definitivo

Conecte o domínio comprado apenas depois que todos os itens do teste passarem. Em seguida, atualize no Supabase as URLs autorizadas de login e recuperação e cadastre no Asaas a nova URL de webhook exibida pelo painel administrativo.

## Segurança preservada

- `/admin` exige sessão autenticada e registro de `super_admin`;
- clientes comuns não recebem links nem permissões para a área administrativa;
- os links `/review/...` usam token armazenado somente como hash;
- dados e permissões continuam isolados por Workspace;
- segredos ficam nas variáveis da Hostinger, nunca no repositório.
