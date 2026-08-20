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
- autosave persistente com feedback visual;
- banco relacional com isolamento por proprietário no backend;
- layout próprio para desktop e mobile.

## Arquitetura

- Next.js/Vinext, React, TypeScript e Tailwind CSS;
- Cloudflare D1 e Drizzle ORM para dados estruturados;
- Cloudflare R2 para arquivos e evidências privadas;
- autenticação delegada ao ambiente de hospedagem;
- rotas públicas em `/` e aplicação protegida em `/app`;
- API `/api/workspace` com autorização server-side e limites de payload;
- estado do editor versionado por Workspace;
- tabelas normalizadas por Workspace para mapas, nós, checklists, comentários, dependências e histórico.

## Banco de dados

O schema está em `db/schema.ts` e a migration gerada em `drizzle/`. As tabelas atuais são:

- `workspaces`: proprietário, datas do trial e plano;
- `project_states`: snapshot versionado do editor;
- `map_records` e `node_records`: mapas e nós pesquisáveis;
- `node_dependencies`: dependências direcionais;
- `node_checklist_records` e `node_comment_records`: execução e colaboração;
- `activity_log_records`: histórico operacional;
- `node_file_records`: metadados dos arquivos privados armazenados no R2;
- `audit_log_records`: trilha imutável de uploads e exclusões.
- `approval_records` e `approval_event_records`: solicitações, decisões e histórico de aprovação.
- `workspace_members` e `map_permission_records`: equipe, papéis e acesso granular por mapa;
- `comment_reaction_records` e `notification_records`: reações e notificações colaborativas.

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
npm run db:generate
```

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

1. atualização colaborativa em tempo real e presença no mapa;
2. envio externo de convites e liberação controlada de acesso ao site;
3. billing mensal/anual e bloqueio após o trial;
4. processos reutilizáveis, Decision Log e IA generativa com confirmação obrigatória.

Não armazene senhas ou credenciais de terceiros. Os campos de acesso aceitam somente plataforma, usuário/e-mail, identificador e referência.
