import Link from "next/link";

const features = [
  ["01", "Mapa que executa", "Cada etapa pode ter responsável, prazo, prioridade, checklist e evidências."],
  ["02", "Clareza em tempo real", "Progresso, bloqueios, aprovações e riscos ficam visíveis sem poluir o canvas."],
  ["03", "Memória operacional", "Decisões, arquivos, comentários e aprendizados permanecem ligados ao processo."],
  ["04", "Próxima melhor ação", "O sistema organiza o que precisa de atenção agora, por impacto e urgência."],
  ["05", "Colaboração com contexto", "Equipe e cliente acompanham apenas o que precisam, com permissões claras."],
  ["06", "Processos reutilizáveis", "Transforme projetos concluídos em playbooks e templates cada vez melhores."],
];

const faqs = [
  ["É apenas um mapa mental?", "Não. O mapa é a interface visual de um sistema completo de execução, colaboração e documentação."],
  ["Preciso instalar algum programa?", "Não. A plataforma funciona no navegador e foi desenhada para desktop e celular."],
  ["Meus dados somem quando o teste termina?", "Não. Seus dados permanecem preservados. A edição fica pausada até a contratação de um plano."],
  ["Posso compartilhar com clientes?", "Sim. Você poderá liberar um mapa ou somente um ramo, com permissão para visualizar, comentar ou aprovar."],
];

function ProductMap() {
  return (
    <div className="product-map" aria-label="Demonstração de um processo visual">
      <div className="map-toolbar">
        <span className="traffic-dots"><i /><i /><i /></span>
        <span>Implementação Sistema ERP</span>
        <span className="saved-dot">● Salvo</span>
      </div>
      <div className="map-stage">
        <span className="map-line line-a" /><span className="map-line line-b" /><span className="map-line line-c" />
        <div className="map-node root-node"><small>PROJETO</small><strong>Implementação ERP</strong><span><b>42%</b> em andamento</span><i><em style={{ width: "42%" }} /></i></div>
        <div className="map-node child-one"><small>ETAPA</small><strong>Levantamento</strong><span><b>100%</b> concluído</span><i><em style={{ width: "100%" }} /></i></div>
        <div className="map-node child-two"><small>ETAPA</small><strong>Configuração</strong><span><b>65%</b> em andamento</span><i><em style={{ width: "65%" }} /></i></div>
        <div className="map-node child-three"><small>ETAPA</small><strong>Integrações</strong><span><b>0%</b> · 1 bloqueio</span><i><em style={{ width: "8%" }} /></i></div>
        <div className="activity-pill"><span>RL</span> Robério está em Configuração</div>
        <div className="zoom-control"><button aria-label="Diminuir zoom">−</button><b>82%</b><button aria-label="Aumentar zoom">+</button></div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Navegação principal">
        <Link className="brand" href="/"><span>MO</span> Mapa Operacional</Link>
        <div className="nav-links"><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><a href="#planos">Planos</a></div>
        <Link className="button button-ghost" href="/app">Entrar</Link>
      </nav>

      <section className="hero shell">
        <div className="eyebrow"><span>●</span> Da estratégia à execução, em um só lugar</div>
        <h1>Transforme processos em mapas.<br /><em>E mapas em execução.</em></h1>
        <p>Planeje visualmente, transforme cada etapa em tarefas, acompanhe o progresso e documente todo o processo sem sair do mapa.</p>
        <div className="hero-actions"><Link className="button button-primary" href="/app">Testar grátis por 7 dias <span>→</span></Link><a className="button button-secondary" href="#como-funciona">Ver como funciona</a></div>
        <div className="trust-row"><span>✓ Sem cartão</span><span>✓ Primeiro mapa em 60 segundos</span><span>✓ Cancele quando quiser</span></div>
        <ProductMap />
      </section>

      <section className="problem-section"><div className="shell problem-grid"><div><span className="section-label">O PROBLEMA</span><h2>O trabalho está espalhado.<br />O contexto também.</h2></div><div className="problem-copy"><p>Ideias em mapas. Tarefas em outra ferramenta. Arquivos perdidos no Drive. Decisões no WhatsApp. No final, ninguém enxerga o processo inteiro.</p><p className="solution-line"><strong>O Mapa Operacional conecta tudo isso.</strong> A visão continua simples, mas cada etapa carrega tudo o que é necessário para executar.</p></div></div></section>

      <section className="section shell" id="como-funciona">
        <span className="section-label">COMO FUNCIONA</span>
        <div className="section-heading"><h2>Do pensamento ao processo<br />em três movimentos.</h2><p>Comece visualmente. Adicione profundidade quando precisar. Termine com conhecimento que pode ser reutilizado.</p></div>
        <div className="steps-grid"><article><span>01</span><h3>Estruture</h3><p>Crie o mapa do projeto e organize objetivos, etapas, tarefas, riscos e decisões.</p></article><article><span>02</span><h3>Execute</h3><p>Defina responsáveis, prazos, dependências, aprovações e evidências diretamente nos nós.</p></article><article><span>03</span><h3>Aprenda</h3><p>Preserve o histórico, registre aprendizados e transforme o projeto em processo reutilizável.</p></article></div>
      </section>

      <section className="section features-section" id="recursos"><div className="shell"><span className="section-label">INTELIGÊNCIA OPERACIONAL</span><div className="section-heading"><h2>Menos controle manual.<br />Mais clareza para decidir.</h2><p>Uma interface limpa por fora e um sistema completo de gestão por dentro.</p></div><div className="features-grid">{features.map(([number,title,description])=><article key={title}><span>{number}</span><h3>{title}</h3><p>{description}</p><i>↗</i></article>)}</div></div></section>

      <section className="section shell pricing-section" id="planos"><span className="section-label">PLANOS SIMPLES</span><div className="section-heading"><h2>Comece pequeno.<br />Organize algo grande.</h2><p>Sete dias para experimentar tudo, sem cartão. Escolha o plano somente quando o produto fizer sentido para você.</p></div><div className="pricing-grid">
        <article className="price-card"><div><span>Mensal</span><p>Flexibilidade para começar</p></div><h3><sup>R$</sup> 5<small>/mês</small></h3><ul><li>Mapas e tarefas ilimitados</li><li>Colaboração com a equipe</li><li>Histórico e documentação</li><li>Templates operacionais</li></ul><Link className="button button-secondary" href="/app">Começar teste grátis</Link></article>
        <article className="price-card highlighted"><div className="popular">MAIS VANTAJOSO</div><div><span>Anual</span><p>Economize e evolua seus processos</p></div><h3><sup>R$</sup> 49<small>/ano</small></h3><ul><li>Todos os recursos do plano mensal</li><li>Dois meses de economia</li><li>Playbooks reutilizáveis</li><li>Inteligência operacional</li></ul><Link className="button button-primary" href="/app">Testar grátis por 7 dias <span>→</span></Link></article>
      </div></section>

      <section className="section faq-section"><div className="shell faq-grid"><div><span className="section-label">PERGUNTAS FREQUENTES</span><h2>Antes de começar,<br />talvez você queira saber.</h2></div><div>{faqs.map(([q,a],index)=><details key={q} open={index===0}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section>

      <section className="final-cta shell"><div><span className="section-label light">COMECE AGORA</span><h2>Seu próximo processo pode ser muito mais claro.</h2><p>Crie o primeiro mapa em menos de 60 segundos.</p></div><Link className="button button-white" href="/app">Testar grátis por 7 dias <span>→</span></Link></section>
      <footer className="shell footer"><Link className="brand" href="/"><span>MO</span> Mapa Operacional</Link><p>© 2026. Processos claros. Execução inteligente.</p><div><a href="#planos">Planos</a><a href="#recursos">Recursos</a></div></footer>
    </main>
  );
}
