# Mapa Operacional

Plataforma visual para transformar processos em execução. Esta versão entrega uma página pública completa e o primeiro corte funcional do produto: autenticação, Workspace automático, trial, dashboard, mapa visual, painel de execução e salvamento persistente.

## Funcionalidades implementadas

- página pública responsiva com demonstração, recursos, planos e FAQ;
- acesso protegido por autenticação da plataforma;
- criação automática de Workspace e trial de sete dias;
- dashboard com métricas, saúde, bloqueios e próxima melhor ação;
- criação e navegação entre mapas;
- biblioteca de mapas com busca, favoritos, duplicação, arquivamento, exclusão e compartilhamento por link;
- menu lateral recolhível, mapa em tela ampla e tipografia otimizada para leitura;
- onboarding em cinco passos, reaberto a qualquer momento pelo menu;
- galeria de modelos com categorias, visualização e criação automática de etapas e dependências;
- nós arrastáveis, filhos, irmãos, exclusão, expansão e recolhimento;
- atalhos `Enter`, `Tab`, `Delete`, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` e `Ctrl/Cmd+K`;
- zoom, deslocamento horizontal, pan, undo e redo;
- painel lateral com dados gerais, execução, checklist, comentários, informações e acessos sem senha;
- progresso, status, responsáveis, prioridades, prazos, evidências e bloqueios;
- dependências direcionais com criação, remoção e prevenção de ciclos;
- liberação automática das etapas quando os pré-requisitos são concluídos;
- progresso dos pais calculado pelos filhos;
- saúde, tarefas críticas e próxima ação recalculadas automaticamente;
- histórico operacional persistente;
- upload, download e exclusão de arquivos privados por etapa;
- validação de formato e limite de 10 MB por arquivo;
- conclusão bloqueada quando a etapa exige evidência e nenhuma foi registrada;
- solicitação de aprovação por etapa ou ramo, com revisor e escopo definidos;
- aprovação, pedido de alteração, reenvio e histórico formal de decisões;
- visão restrita do cliente exibindo somente entregas enviadas para revisão;
- conclusão e liberação de dependências somente após a aprovação obrigatória;
- equipe com papéis de proprietário, administrador, editor, executor, comentarista e visualizador;
- permissões por Workspace e por mapa, aplicadas também no backend;
- comentários em threads com respostas, menções, reações e resolução;
- central de notificações para menções, respostas, convites e alterações de acesso;
- atualização operacional protegida para executores, sem liberar a edição estrutural;
- presença ao vivo por mapa, atualização automática e detecção de versões remotas;
- proteção contra sobrescrita quando duas pessoas salvam simultaneamente;
- central Minhas Tarefas com visões pessoal e da equipe, busca e filtros por prazo ou bloqueio;
- execução rápida de progresso diretamente na lista, com abertura da etapa no mapa;
- links públicos de revisão com token aleatório armazenado somente como hash;
- revisão de mapa completo ou ramo específico sem login, em modo estritamente somente leitura;
- marcações numeradas em cards ou no canvas, comentários e respostas identificadas pelo nome do cliente;
- validade, renovação, revogação imediata, rate limit e trilha de auditoria dos links de revisão;
- notificações ao proprietário e exibição das marcações diretamente no mapa interno;
- autosave persistente com feedback visual;
- banco relacional com isolamento por proprietário no backend;
- layout próprio para desktop e mobile.
- tela de login dedicada com autenticação segura via ChatGPT;
- painel Super Admin para clientes, Workspaces, licenças, receita estimada e trilha comercial;
- Configurações → Planos como fonte única de nomes, valores, periodicidade, trial e destaque comercial;
- página pública, área de assinatura e checkout sincronizados automaticamente com os planos salvos;
- Configurações → Integrações com status, ambiente, webhook e teste de conexão do Asaas;
- checkout recorrente hospedado pelo Asaas e liberação de licença somente após confirmação por webhook;
- processamento idempotente de eventos de checkout, pagamento e assinatura.

## Arquitetura

- Next.js, React, TypeScript e Tailwind CSS em Node.js 22;
- Supabase Postgres para todos os dados estruturados;
- Supabase Storage privado para arquivos e evidências;
- autenticação por e-mail com Supabase Auth e isolamento por RLS;
- rotas públicas em `/` e aplicação protegida em `/app`;
- API `/api/workspace` com autorização server-side e limites de payload;
- estado do editor versionado por Workspace;
- tabelas normalizadas por Workspace para mapas, nós, checklists, comentários, dependências e histórico.

## Banco de dados

O bloco SQL idempotente para Postgres 17 está em `supabase/schema.sql`. Ele cria todas as tabelas, índices, políticas RLS e o bucket privado do Storage. Execute-o uma vez no SQL Editor do Supabase antes do primeiro deploy desta branch. As tabelas atuais são:

- `workspaces`: proprietário, datas do trial e plano;
- `project_states`: snapshot versionado do editor;
- `map_records` e `node_records`: mapas e nós pesquisáveis;
- `node_dependencies`: dependências direcionais;
- `node_checklist_records` e `node_comment_records`: execução e colaboração;
- `activity_log_records`: histórico operacional;
- `node_file_records`: metadados dos arquivos privados armazenados no Supabase Storage;
- `audit_log_records`: trilha imutável de uploads e exclusões.
- `approval_records` e `approval_event_records`: solicitações, decisões e histórico de aprovação.
- `workspace_members` e `map_permission_records`: equipe, papéis e acesso granular por mapa;
- `comment_reaction_records` e `notification_records`: reações e notificações colaborativas.
- `workspace_presence_records`: presença temporária por mapa e etapa em edição;
- `review_link_records`: links públicos com escopo, validade, hash e estado de revogação;
- `review_comment_markers`: localização visual dos comentários de clientes;
- `review_rate_limit_records`: proteção contra abuso nos comentários públicos.
- `platform_admins`: administradores globais da plataforma;
- `billing_plans`: catálogo central de planos e preços exibido em toda a plataforma;
- `workspace_licenses`: licença, período e vínculo de cobrança de cada Workspace;
- `billing_checkout_records`: vínculo seguro entre checkout Asaas, Workspace e plano;
- `billing_event_records`: eventos comerciais e webhooks processados com idempotência.

Os registros são vinculados ao Workspace e os identificadores de armazenamento são compostos para evitar colisão entre empresas.

## Desenvolvimento

Requer Node.js 22.13 ou superior.

```bash
npm ci
npm run dev
```

Comandos úteis:

```bash
npm run build
npm test
npm run lint
npm run db:check
```

## Publicação na Hostinger

A branch `supabase-postgres` roda em Node.js puro na Hostinger e usa Supabase Auth, Postgres e Storage. A branch `hostinger` anterior permanece preservada durante a validação. O roteiro completo está em `HOSTINGER_DEPLOY.md`.

## Integração Asaas

Configure `ASAAS_ENVIRONMENT`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` como segredos do ambiente hospedado. Comece em `sandbox`. No painel Super Admin, abra **Configurações → Integrações**, copie a URL do webhook e cadastre-a no Asaas usando o mesmo token seguro. A chave da API nunca é exibida nem salva no banco da aplicação.

## Modelos operacionais

A galeria inclui modelos prontos em fluxo e em mapa radial. O modelo em destaque, **Estratégia de Tráfego Pago — 30 Dias**, cria automaticamente um objetivo central, dez frentes operacionais e 69 tarefas editáveis de preparação, posicionamento, conteúdo, anúncios, atendimento, mensuração e otimização.

O modelo **Segundo Cérebro — Mapa de Conhecimento** cria uma rede visual com núcleo central, oito áreas e 24 notas iniciais. Suas conexões exibem correntes luminosas bidirecionais para representar impulsos neurais entre ideias e memórias.

## Navegação do mapa

- `Shift + rolagem`: movimenta o mapa na horizontal;
- `Ctrl/Cmd + rolagem`: movimenta o mapa na vertical;
- `Espaço + rolagem`: aproxima ou afasta mantendo o ponto do mouse como referência;
- `Espaço + arrastar`: move o canvas mesmo quando o gesto começa sobre um card;
- o botão de olho aproxima somente o card indicado;
- o duplo clique centraliza o card sem alterar o zoom;
- a trava preserva a posição individual do card;
- o guia interativo explica cards, conexões, dependências, atalhos e painel lateral diretamente no mapa.

## Próximas fases

1. envio externo de convites e liberação controlada de acesso ao site;
2. cupons, relatórios financeiros e conciliação avançada;
3. processos reutilizáveis e Decision Log;
4. IA generativa com confirmação obrigatória para alterações.

Não armazene senhas ou credenciais de terceiros. Os campos de acesso aceitam somente plataforma, usuário/e-mail, identificador e referência.
