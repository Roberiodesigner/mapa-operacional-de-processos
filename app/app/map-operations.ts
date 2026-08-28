export type DuplicableMap = {
  id: string;
  title: string;
  favorite: boolean;
  archived: boolean;
  updatedAt: string;
};

export type DuplicableNode = { id: string; mapId: string; parentId: string | null };
export type DuplicableDependency = { id: string; nodeId: string; dependsOnId: string };

export type TemplateStageDetail = {
  title: string;
  subtitle: string;
  tasks: string[];
  instructions?: string;
};

export type ProcessTemplate = {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  stages: string[];
  layout?: "flow" | "radial" | "knowledge";
  featured?: boolean;
  stageDetails?: TemplateStageDetail[];
  knowledgeClusters?: { title: string; subtitle: string; notes: string[] }[];
};

const rawProcessTemplates: ProcessTemplate[] = [
  {
    id: "vsm-arquitetura-operacional",
    title: "VSM — Arquitetura Operacional Inteligente",
    category: "Operações",
    description: "Modelo navegável para estruturar a empresa por setores e processos, mapear o estado atual, identificar gargalos e desperdícios e preparar o estado futuro com apoio de IA.",
    duration: "8 setores · 50 processos iniciais · VSM",
    layout: "knowledge",
    featured: true,
    stages: ["Direção e Gestão", "Marketing", "Comercial", "Atendimento", "Operações", "Financeiro", "Pessoas e RH", "Tecnologia e Dados"],
    stageDetails: [
      {
        title: "Direção e Gestão",
        subtitle: "Estratégia, governança e melhoria contínua",
        tasks: ["Validar quais processos de gestão realmente existem", "Definir dono e responsáveis de cada processo", "Registrar indicadores já acompanhados", "Identificar decisões centralizadas e gargalos de aprovação", "Priorizar o primeiro processo crítico para detalhamento"],
        instructions: "Expanda este setor para visualizar os processos sugeridos. Confirme, edite, exclua ou acrescente processos conforme a realidade da empresa. Depois escolha um processo e detalhe entrada, saída, responsável, tempo de execução, espera, retrabalho, sistemas, riscos, indicadores e oportunidades de melhoria."
      },
      {
        title: "Marketing",
        subtitle: "Geração de demanda, posicionamento e mensuração",
        tasks: ["Validar os canais de aquisição atuais", "Definir responsáveis por cada fluxo", "Registrar passagem de lead para Comercial", "Mapear tempo de resposta e perdas na passagem", "Selecionar processo prioritário para VSM"],
        instructions: "Use este setor para mapear como a demanda é criada, tratada e entregue ao Comercial. Expanda para ver os processos sugeridos e adapte à operação real."
      },
      {
        title: "Comercial",
        subtitle: "Da prospecção ao fechamento e pós-venda",
        tasks: ["Validar etapas reais do funil", "Definir critérios de avanço", "Registrar responsáveis e sistemas", "Identificar espera, retrabalho e oportunidades perdidas", "Selecionar processo crítico para estado atual e futuro"],
        instructions: "Expanda o Comercial e valide processo por processo. Para cada fluxo importante, registre tempos, handoffs, aprovações, retrabalho, gargalos e KPIs."
      },
      {
        title: "Atendimento",
        subtitle: "Entrada, resolução, escalonamento e satisfação",
        tasks: ["Identificar canais de entrada", "Definir triagem e SLA", "Mapear escalonamentos", "Registrar causas de reabertura e retrabalho", "Definir indicadores de qualidade e velocidade"],
        instructions: "Mapeie o caminho da solicitação do cliente até a resolução. Separe tempo trabalhando de tempo esperando para enxergar o lead time real."
      },
      {
        title: "Operações",
        subtitle: "Execução, qualidade, entrega e melhoria do fluxo",
        tasks: ["Definir entrada e saída de cada processo", "Registrar capacidade e volume", "Medir cycle time e waiting time", "Classificar atividades VA, BVA ou NVA", "Identificar gargalos, filas, retrabalho e desperdícios"],
        instructions: "Este é o núcleo do VSM. Para cada processo escolhido, registre fluxo de materiais/informações, tempos, filas, inventário quando aplicável, erros, retrabalho, responsáveis e sistemas."
      },
      {
        title: "Financeiro",
        subtitle: "Pagamentos, recebimentos, cobrança e controle",
        tasks: ["Validar rotinas financeiras existentes", "Mapear aprovações e alçadas", "Registrar dependências com Comercial e Operações", "Identificar lançamentos duplicados e esperas", "Definir KPIs financeiros do processo"],
        instructions: "Expanda o Financeiro e identifique principalmente esperas por aprovação, duplicação de dados, retrabalho e dependências entre áreas."
      },
      {
        title: "Pessoas e RH",
        subtitle: "Entrada, desenvolvimento, desempenho e saída de pessoas",
        tasks: ["Validar processos de pessoas existentes", "Identificar atividades informais", "Definir responsáveis mesmo sem RH formal", "Mapear dependência de pessoas-chave", "Priorizar processos que afetam capacidade operacional"],
        instructions: "Mesmo empresas sem departamento formal de RH possuem processos de pessoas. Registre quem executa hoje e onde existe dependência excessiva de uma única pessoa."
      },
      {
        title: "Tecnologia e Dados",
        subtitle: "Sistemas, integrações, acessos, dados e automações",
        tasks: ["Listar sistemas críticos", "Mapear integrações entre sistemas", "Identificar digitação duplicada", "Identificar tarefas manuais repetitivas", "Priorizar oportunidades de automação"],
        instructions: "Use este setor para identificar onde dados entram, são transferidos, duplicados ou ficam presos. Marque atividades candidatas a integração, automação ou uso de IA."
      }
    ],
    knowledgeClusters: [
      { title: "Direção e Gestão", subtitle: "Estratégia, governança e melhoria contínua", notes: ["Planejamento estratégico", "Gestão de metas e indicadores", "Gestão de riscos", "Reunião de performance", "Gestão de prioridades", "Melhoria contínua"] },
      { title: "Marketing", subtitle: "Geração de demanda, posicionamento e mensuração", notes: ["Planejamento de marketing", "Geração de demanda", "Conteúdo e campanhas", "Gestão de leads", "Gestão de canais", "Mensuração e otimização"] },
      { title: "Comercial", subtitle: "Da prospecção ao fechamento e pós-venda", notes: ["Prospecção", "Qualificação", "Diagnóstico", "Proposta", "Negociação", "Follow-up", "Fechamento", "Pós-venda"] },
      { title: "Atendimento", subtitle: "Entrada, resolução, escalonamento e satisfação", notes: ["Entrada de solicitações", "Triagem", "Primeiro atendimento", "Resolução", "Escalonamento", "Pesquisa de satisfação"] },
      { title: "Operações", subtitle: "Execução, qualidade, entrega e melhoria do fluxo", notes: ["Recebimento da demanda", "Planejamento operacional", "Execução", "Controle de qualidade", "Entrega", "Tratamento de retrabalho", "Melhoria do processo"] },
      { title: "Financeiro", subtitle: "Pagamentos, recebimentos, cobrança e controle", notes: ["Contas a pagar", "Contas a receber", "Cobrança", "Conciliação", "Fluxo de caixa", "Fechamento financeiro"] },
      { title: "Pessoas e RH", subtitle: "Entrada, desenvolvimento, desempenho e saída de pessoas", notes: ["Recrutamento e seleção", "Onboarding", "Treinamento", "Gestão de desempenho", "Rotinas de pessoas", "Offboarding"] },
      { title: "Tecnologia e Dados", subtitle: "Sistemas, integrações, acessos, dados e automações", notes: ["Acessos e segurança", "Suporte interno", "Sistemas críticos", "Integrações", "Dados e indicadores", "Automações"] }
    ]
  },
  {
    id: "estrategia-trafego-pago-30",
    title: "Estratégia de Tráfego Pago — 30 Dias",
    category: "Marketing",
    description: "Modelo radial completo de tráfego pago, com dez frentes e 69 tarefas prontas para configurar, executar, atender, mensurar e otimizar a campanha.",
    duration: "10 frentes · 69 tarefas",
    layout: "radial",
    featured: true,
    stages: ["Preparação", "Posicionamento", "Conteúdo Estratégico", "Perfil Instagram", "Campanha Meta Ads", "Stories Diários", "Atendimento", "Mensuração", "Otimização Semanal", "Ciclo de 30 Dias"],
    stageDetails: [
      { title: "Preparação", subtitle: "Base técnica e operacional", tasks: ["Pagamento do serviço confirmado", "Acessos Meta e Instagram", "Conta de anúncios configurada", "Forma de pagamento e verba disponível", "Bio, WhatsApp e localização revisados", "Google Maps / Perfil da Empresa atualizado", "Equipe alinhada para atendimento"] },
      { title: "Posicionamento", subtitle: "Mensagem, público e oferta", tasks: ["Definir público prioritário", "Validar promessa principal da marca", "Definir diferenciais de preço e variedade", "Definir tom da comunicação", "Definir ofertas e produtos de maior apelo"] },
      { title: "Conteúdo Estratégico", subtitle: "Reels e criativos da campanha", tasks: ["Reel 1 — aquisição / visitas ao perfil", "Reel 2 — venda / preço", "Reel 3 — branding", "Reel 4 — visita à loja", "Reel 5 — interação / pergunta estratégica", "Selecionar 3 criativos iniciais para anúncio"] },
      { title: "Perfil Instagram", subtitle: "Landing page da campanha", tasks: ["Criar destaque “Comece Aqui”", "Organizar destaque de novidades", "Organizar destaque de provador", "Organizar destaque de ofertas", "Organizar destaque de localização", "Fixar Reel de apresentação", "Fixar Reel de preço/produto", "Fixar conteúdo de localização"] },
      { title: "Campanha Meta Ads", subtitle: "Estrutura, público e orçamento", tasks: ["Criar campanha principal", "Selecionar objetivo / meta de visitas ao perfil", "Configurar mulheres 25–54", "Configurar Valparaíso de Goiás e região útil", "Definir orçamento de R$ 200/semana", "Subir 3 criativos de teste", "Revisar links, destino e identidade", "Publicar campanha"] },
      { title: "Stories Diários", subtitle: "Aquecer quem chega pelo anúncio", tasks: ["Manter presença diária", "Mostrar produto e preço", "Fazer provador / caimento", "Usar enquete ou pergunta", "Mostrar bastidor / movimento da loja", "Inserir chamada para loja, Direct ou WhatsApp"] },
      { title: "Atendimento", subtitle: "Transformar interesse em compra", tasks: ["Responder Direct com agilidade", "Responder WhatsApp com agilidade", "Responder comentários relevantes", "Treinar resposta com postura comercial", "Informar tamanho, cor, preço e alternativas", "Conduzir cliente para visita ou reserva"] },
      { title: "Mensuração", subtitle: "Dados do digital e da loja", tasks: ["Registrar investimento", "Registrar alcance e impressões", "Registrar visitas ao perfil", "Registrar novos seguidores", "Registrar Directs / WhatsApp", "Perguntar “Como conheceu a loja?”", "Registrar visitas atribuídas", "Registrar vendas atribuídas", "Registrar faturamento semanal"] },
      { title: "Otimização Semanal", subtitle: "Aprender, cortar e repetir", tasks: ["Comparar os 3 criativos", "Identificar melhor custo por visita", "Identificar melhor conversão visita → seguidor", "Identificar criativo com mais intenção comercial", "Reduzir ou pausar criativo fraco", "Criar variação do criativo vencedor", "Redistribuir verba quando necessário"] },
      { title: "Ciclo de 30 Dias", subtitle: "Fechamento do teste e próximos passos", tasks: ["Semana 1 — descoberta", "Semana 2 — validação", "Semana 3 — otimização", "Semana 4 — consolidação", "Gerar relatório final", "Documentar aprendizados", "Definir plano do mês 2"] }
    ]
  },
  {
    id: "segundo-cerebro",
    title: "Segundo Cérebro — Mapa de Conhecimento",
    category: "Conhecimento",
    description: "Rede visual inspirada em mapas de conhecimento para conectar ideias, projetos, referências, pessoas e aprendizados em um único lugar.",
    duration: "8 áreas · 24 notas iniciais",
    layout: "knowledge",
    stages: ["Caixa de Entrada", "Projetos Ativos", "Áreas da Vida", "Conhecimentos", "Ideias e Insights", "Referências", "Pessoas e Conversas", "Aprendizados"],
    knowledgeClusters: [
      { title: "Caixa de Entrada", subtitle: "Capture antes de organizar", notes: ["Ideias rápidas", "Assuntos para revisar", "Links pendentes"] },
      { title: "Projetos Ativos", subtitle: "Tudo que está em movimento", notes: ["Projeto principal", "Próxima ação", "Decisões do projeto"] },
      { title: "Áreas da Vida", subtitle: "Responsabilidades contínuas", notes: ["Trabalho e negócios", "Desenvolvimento pessoal", "Saúde e rotina"] },
      { title: "Conhecimentos", subtitle: "O que você está construindo", notes: ["Marketing e vendas", "Tecnologia e ferramentas", "Gestão e processos"] },
      { title: "Ideias e Insights", subtitle: "Conexões que podem crescer", notes: ["Hipóteses", "Oportunidades", "Perguntas abertas"] },
      { title: "Referências", subtitle: "Fontes para consultar", notes: ["Livros e artigos", "Vídeos e cursos", "Sites e documentos"] },
      { title: "Pessoas e Conversas", subtitle: "Conhecimento compartilhado", notes: ["Pessoas-chave", "Reuniões importantes", "Conselhos recebidos"] },
      { title: "Aprendizados", subtitle: "Memória prática", notes: ["Lições aplicadas", "Erros que ensinaram", "Decisões registradas"] }
    ]
  },
  { id: "erp", title: "Implementação de ERP", category: "Tecnologia", description: "Planeje diagnóstico, configuração, integrações, testes, treinamento e implantação.", duration: "6 etapas", stages: ["Levantamento", "Configuração", "Integrações", "Testes", "Treinamento", "Implantação"] },
  { id: "onboarding", title: "Onboarding de cliente", category: "Atendimento", description: "Organize a entrada do cliente do contrato à primeira entrega de valor.", duration: "6 etapas", stages: ["Contrato e acessos", "Reunião de kickoff", "Diagnóstico", "Plano de ação", "Primeira entrega", "Validação do cliente"] },
  { id: "marketing", title: "Campanha de marketing", category: "Marketing", description: "Estruture briefing, criação, aprovação, mídia, acompanhamento e relatório.", duration: "6 etapas", stages: ["Briefing", "Estratégia", "Criação", "Aprovação", "Veiculação", "Otimização e relatório"] },
  { id: "produto", title: "Lançamento de produto", category: "Produto", description: "Coordene pesquisa, oferta, produção, campanha, lançamento e pós-venda.", duration: "6 etapas", stages: ["Pesquisa", "Definição da oferta", "Produção", "Pré-lançamento", "Lançamento", "Pós-venda"] },
  { id: "evento", title: "Organização de evento", category: "Eventos", description: "Controle escopo, fornecedores, divulgação, operação e encerramento.", duration: "6 etapas", stages: ["Conceito e orçamento", "Local e fornecedores", "Divulgação", "Confirmações", "Operação do evento", "Pós-evento"] },
  { id: "vendas", title: "Processo comercial", category: "Vendas", description: "Visualize o caminho completo do lead até o fechamento e onboarding.", duration: "6 etapas", stages: ["Prospecção", "Qualificação", "Diagnóstico", "Proposta", "Negociação", "Fechamento"] },
  { id: "loja-moda", title: "Operação de Loja de Moda", category: "Moda", description: "Mapa radial para coordenar compras, estoque, vitrine, conteúdo, vendas, atendimento, caixa e indicadores.", duration: "8 frentes", layout: "radial", stages: ["Compras e fornecedores", "Estoque", "Vitrine e loja", "Conteúdo", "Campanhas", "Atendimento", "Vendas e caixa", "Indicadores"] },
  { id: "agencia", title: "Gestão de Agência de Marketing", category: "Marketing", description: "Organize clientes, estratégia, criação, mídia, atendimento, entregas, financeiro e crescimento.", duration: "8 frentes", layout: "radial", stages: ["Comercial", "Onboarding", "Estratégia", "Criação", "Tráfego pago", "Atendimento", "Relatórios", "Financeiro"] },
  { id: "trafego-30", title: "Tráfego Pago — Ciclo de 30 Dias", category: "Marketing", description: "Da configuração das contas ao relatório final, com rotina semanal de análise e otimização.", duration: "7 etapas", stages: ["Diagnóstico e acessos", "Oferta e público", "Criativos", "Configuração da campanha", "Publicação", "Otimização semanal", "Relatório de 30 dias"] },
  { id: "restaurante", title: "Operação de Restaurante", category: "Operações", description: "Mapa radial de compras, estoque, cozinha, salão, delivery, equipe, qualidade e financeiro.", duration: "8 frentes", layout: "radial", stages: ["Compras", "Estoque", "Pré-preparo", "Cozinha", "Salão", "Delivery", "Equipe e qualidade", "Financeiro"] },
  { id: "bitrix", title: "Implantação CRM Bitrix", category: "Tecnologia", description: "Configure estrutura, usuários, canais, funis, automações, treinamento e operação assistida.", duration: "7 etapas", stages: ["Diagnóstico", "Estrutura e permissões", "Canais e integrações", "Funis", "Automações", "Treinamento", "Operação assistida"] },
  { id: "formatura", title: "Produção de Formatura Escolar", category: "Eventos", description: "Gerencie escola, alunos, contratos, ensaios, eventos, edição, álbuns e entrega.", duration: "8 etapas", stages: ["Prospecção da escola", "Contrato e autorizações", "Cadastro dos alunos", "Ensaios", "Eventos da formatura", "Seleção e edição", "Álbuns", "Entrega e pós-venda"] },
  { id: "site", title: "Criação de Site ou Landing Page", category: "Projetos", description: "Do briefing à publicação, com conteúdo, design, desenvolvimento, revisão e integrações.", duration: "7 etapas", stages: ["Briefing", "Arquitetura", "Conteúdo", "Design", "Desenvolvimento", "Revisão e testes", "Publicação"] },
  { id: "conteudo-30", title: "Calendário de Conteúdo — 30 Dias", category: "Conteúdo", description: "Planeje pautas, roteiros, produção, edição, aprovação, publicação e análise do mês.", duration: "7 etapas", stages: ["Objetivos e pilares", "Pautas", "Roteiros", "Produção", "Edição", "Publicação", "Análise"] },
  { id: "ecommerce", title: "Operação de E-commerce", category: "Operações", description: "Mapa radial para catálogo, estoque, mídia, pedidos, expedição, atendimento e indicadores.", duration: "8 frentes", layout: "radial", stages: ["Catálogo", "Estoque", "Ofertas", "Tráfego", "Pedidos", "Separação e envio", "Atendimento", "Indicadores"] },
  { id: "influenciadores", title: "Campanha com Influenciadores", category: "Marketing", description: "Selecione perfis, negocie, organize briefing, aprovação, publicação e mensuração.", duration: "6 etapas", stages: ["Objetivo e público", "Seleção de influenciadores", "Negociação", "Briefing e envio", "Publicação", "Mensuração"] }
];

const categoryActions: Record<string, string[]> = {
  Atendimento: ["Confirmar expectativas e canal de contato", "Registrar retorno e aceite do cliente"],
  Conhecimento: ["Relacionar esta área a uma fonte ou ideia existente", "Registrar um aprendizado aplicável"],
  Conteúdo: ["Validar pauta, formato e chamada para ação", "Registrar métricas e aprendizados do conteúdo"],
  Eventos: ["Confirmar orçamento, fornecedor e responsável", "Revisar plano de contingência da etapa"],
  Marketing: ["Validar objetivo, público e indicador principal", "Conferir criativos, oferta e chamada para ação"],
  Moda: ["Conferir estoque, apresentação e padrão de atendimento", "Registrar vendas, giro e oportunidades de melhoria"],
  Operações: ["Confirmar recursos, padrão e responsável pela execução", "Medir qualidade, prazo e ocorrências"],
  Produto: ["Validar hipótese, público e critério de sucesso", "Registrar feedback e decisão de produto"],
  Projetos: ["Confirmar escopo, responsável e critério de aceite", "Documentar riscos, mudanças e decisões"],
  Tecnologia: ["Validar requisitos, acessos e ambiente", "Registrar teste, evidência e aceite técnico"],
  Vendas: ["Definir critério de avanço e próximo contato", "Atualizar CRM, objeções e probabilidade de fechamento"]
};

const normalizeText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function stageAction(stage: string) {
  const value = normalizeText(stage);
  if (/briefing|levantamento|diagnostico|pesquisa|prospeccao/.test(value)) return `Coletar dados e validar o diagnóstico de “${stage}”`;
  if (/configur|estrutura|arquitetura|funil|cadastro/.test(value)) return `Configurar “${stage}” e revisar com uma pessoa responsável`;
  if (/integr|canal|acesso|permiss/.test(value)) return `Testar acessos e o fluxo completo de “${stage}”`;
  if (/teste|revis|homolog|validacao/.test(value)) return `Executar cenários de teste e registrar ajustes de “${stage}”`;
  if (/treinamento|ensaio/.test(value)) return `Preparar material, participantes e confirmação de “${stage}”`;
  if (/aprov|autoriz/.test(value)) return `Solicitar aprovação formal e registrar o retorno de “${stage}”`;
  if (/relatorio|mensur|analise|indicador/.test(value)) return `Consolidar indicadores e interpretar o resultado de “${stage}”`;
  if (/public|implant|lancamento|entrega|evento/.test(value)) return `Executar o checklist de “${stage}” e conferir o plano de contingência`;
  if (/atendimento|pos-venda|operacao assistida/.test(value)) return `Acompanhar solicitações e registrar a próxima ação de “${stage}”`;
  return `Executar a entrega principal de “${stage}” conforme o padrão definido`;
}

export function buildStageDetail(templateId: string, category: string, stage: string, index: number): TemplateStageDetail {
  const categoryTasks = categoryActions[category] ?? categoryActions.Projetos;
  return {
    title: stage,
    subtitle: `Etapa ${index + 1} · execução guiada e documentada`,
    tasks: [
      `Definir resultado esperado e critério de aceite de “${stage}”`,
      stageAction(stage),
      categoryTasks[0],
      categoryTasks[1],
      `Anexar evidência, arquivo ou link de “${stage}”`,
      `Registrar decisão, aprendizado e próxima ação de “${stage}”`
    ],
    instructions: `Complete manualmente responsáveis, datas, orçamento, acessos, links e aprovações que variam em cada projeto. O checklist do modelo “${templateId}” serve como ponto de partida e deve ser confirmado pela equipe.`
  };
}

export const processTemplates: ProcessTemplate[] = rawProcessTemplates.map(template => ({
  ...template,
  stageDetails: template.stages.map((stage, index) => {
    const generated = buildStageDetail(template.title, template.category, stage, index);
    const existing = template.stageDetails?.[index];
    return {
      title: existing?.title ?? generated.title,
      subtitle: existing?.subtitle ?? generated.subtitle,
      tasks: existing?.tasks?.length ? existing.tasks : generated.tasks,
      instructions: existing?.instructions ?? generated.instructions
    };
  })
}));

export type SuggestedMapBlueprint = {
  title: string;
  category: string;
  reason: string;
  stages: string[];
};

const suggestionRules: { match: RegExp; category: string; title: string; reason: string; stages: string[] }[] = [
  { match: /vsm|fluxo de valor|mapear empresa|mapa da empresa|setor|departamento|arquitetura operacional/, category: "Operações", title: "VSM — Arquitetura Operacional Inteligente", reason: "Identifiquei uma necessidade de estruturar setores, processos, gargalos e fluxo de valor da empresa.", stages: ["Direção e Gestão", "Marketing", "Comercial", "Atendimento", "Operações", "Financeiro", "Pessoas e RH", "Tecnologia e Dados"] },
  { match: /marketing|trafego|instagram|anuncio|campanha/, category: "Marketing", title: "Campanha de marketing", reason: "Identifiquei um objetivo de divulgação e aquisição.", stages: ["Objetivo e público", "Oferta", "Conteúdo e criativos", "Configuração dos canais", "Publicação", "Otimização", "Relatório e aprendizados"] },
  { match: /site|landing|pagina|portal/, category: "Projetos", title: "Criação de site", reason: "Identifiquei um projeto digital com etapas de conteúdo, design e publicação.", stages: ["Briefing", "Arquitetura", "Conteúdo", "Design", "Desenvolvimento", "Revisão e testes", "Publicação"] },
  { match: /erp|crm|sistema|software|implantacao/, category: "Tecnologia", title: "Implantação de sistema", reason: "Identifiquei uma implantação tecnológica que exige validação e treinamento.", stages: ["Levantamento", "Planejamento", "Configuração", "Integrações", "Testes", "Treinamento", "Implantação"] },
  { match: /evento|casamento|formatura|aniversario|congresso/, category: "Eventos", title: "Organização de evento", reason: "Identifiquei um evento com fornecedores, operação e contingência.", stages: ["Conceito e orçamento", "Local e fornecedores", "Divulgação", "Confirmações", "Operação", "Pós-evento"] },
  { match: /venda|comercial|lead|cliente|prospeccao/, category: "Vendas", title: "Processo comercial", reason: "Identifiquei um fluxo comercial orientado à conversão.", stages: ["Prospecção", "Qualificação", "Diagnóstico", "Proposta", "Negociação", "Fechamento", "Pós-venda"] },
  { match: /estudo|conhecimento|curso|livro|aprender/, category: "Conhecimento", title: "Plano de conhecimento", reason: "Identifiquei um objetivo de aprendizado e organização de conhecimento.", stages: ["Objetivo de aprendizagem", "Fontes", "Notas e conceitos", "Conexões", "Aplicação prática", "Revisão", "Aprendizados"] },
  { match: /processo|operacao|rotina|procedimento/, category: "Operações", title: "Processo operacional", reason: "Identifiquei uma rotina que pode ser padronizada e medida.", stages: ["Objetivo e escopo", "Entradas", "Preparação", "Execução", "Controle de qualidade", "Entrega", "Melhoria contínua"] }
];

export function suggestMapBlueprint(goal: string): SuggestedMapBlueprint {
  const cleaned = goal.trim().replace(/\s+/g, " ");
  const normalized = normalizeText(cleaned);
  const rule = suggestionRules.find(item => item.match.test(normalized));
  if (rule) return {
    title: cleaned && cleaned.length <= 58 ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : rule.title,
    category: rule.category,
    reason: rule.reason,
    stages: rule.stages
  };
  return {
    title: cleaned && cleaned.length <= 58 ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "Novo mapa inteligente",
    category: "Projetos",
    reason: cleaned ? "Montei uma sequência segura para transformar seu objetivo em execução." : "Escreva uma frase simples; esta estrutura geral já ajuda você a começar.",
    stages: ["Objetivo", "Planejamento", "Preparação", "Execução", "Validação", "Entrega e aprendizados"]
  };
}

export function createTemplateStructure(template: ProcessTemplate, createId: () => string) {
  const mapId = createId();
  const rootId = createId();
  const isRadial = template.layout === "radial";
  const isKnowledge = template.layout === "knowledge";
  const rootX = isKnowledge ? 1175 : isRadial ? 1050 : 80;
  const rootY = isKnowledge ? 700 : isRadial ? 680 : 245;
  const stages = template.stages.map((title, index) => ({
    id: createId(),
    mapId,
    parentId: rootId,
    title,
    x: isKnowledge ? Math.round(1300 + Math.cos(-Math.PI / 2 + index * Math.PI * 2 / template.stages.length) * 610 - 130) : isRadial ? Math.round(1200 + Math.cos(-Math.PI / 2 + index * Math.PI * 2 / template.stages.length) * 850 - 170) : 420 + Math.floor(index / 3) * 330,
    y: isKnowledge ? Math.round(800 + Math.sin(-Math.PI / 2 + index * Math.PI * 2 / template.stages.length) * 405 - 65) : isRadial ? Math.round(760 + Math.sin(-Math.PI / 2 + index * Math.PI * 2 / template.stages.length) * 560 - 80) : 70 + (index % 3) * 155
  }));
  const dependencies = (isRadial || isKnowledge ? [] : stages.slice(1)).map((stage, index) => ({
    id: createId(),
    nodeId: stage.id,
    dependsOnId: stages[index].id
  }));
  return { mapId, rootId, rootX, rootY, stages, dependencies };
}

export function duplicateMapBundle<
  TMap extends DuplicableMap,
  TNode extends DuplicableNode,
  TDependency extends DuplicableDependency,
>(
  sourceMap: TMap,
  allNodes: TNode[],
  allDependencies: TDependency[],
  createId: () => string,
  updatedAt = new Date().toISOString(),
) {
  const mapId = createId();
  const sourceNodes = allNodes.filter(node => node.mapId === sourceMap.id);
  const nodeIds = new Map(sourceNodes.map(node => [node.id, createId()]));
  const nodes = sourceNodes.map(node => ({
    ...node,
    id: nodeIds.get(node.id)!,
    mapId,
    parentId: node.parentId ? nodeIds.get(node.parentId) ?? null : null
  }));
  const dependencies = allDependencies
    .filter(dependency => nodeIds.has(dependency.nodeId) && nodeIds.has(dependency.dependsOnId))
    .map(dependency => ({
      ...dependency,
      id: createId(),
      nodeId: nodeIds.get(dependency.nodeId)!,
      dependsOnId: nodeIds.get(dependency.dependsOnId)!
    }));
  const map = {
    ...sourceMap,
    id: mapId,
    title: `${sourceMap.title} (cópia)`,
    favorite: false,
    archived: false,
    updatedAt
  };
  return { map, nodes, dependencies };
}
