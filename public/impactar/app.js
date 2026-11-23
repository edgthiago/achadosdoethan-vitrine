(function () {
  "use strict";

  // Número de contato da Tamiles (formato internacional, sem símbolos)
  var WHATS_NUMERO = "5585988565067";
  var WHATS_EXIBIDO = "(85) 98856-5067";

  var PERFIS = {
    C: {
      nome: "Comunicador",
      cor: "#F5B700",
      resumo: "Você é extrovertido, dinâmico e adaptável. Prefere ambientes com interação e movimento, trabalha bem em equipe e se comunica com facilidade.",
      forca: "Cria conexão rápido, inspira o time e traz ideias novas. As pessoas gostam de trabalhar com você porque sentem energia e reconhecimento.",
      cuidado: "Detalhes, prazos e acompanhamento constante podem ficar em segundo plano. Em momentos de pressão, a empolgação pode deixar a mensagem menos clara.",
      passo: "Antes de cada conversa importante, escreva em uma frase o que precisa ficar combinado. Depois, confirme com a pessoa o que ela entendeu."
    },
    E: {
      nome: "Executor",
      cor: "#D8433B",
      resumo: "Você é decidido e orientado a resultados. Tem energia, coragem para assumir riscos e foco total em atingir metas.",
      forca: "Decide rápido, assume responsabilidade e mantém o time em movimento. Funciona muito bem em crises e em metas desafiadoras.",
      cuidado: "O ritmo pode atropelar quem precisa de mais tempo, e a cobrança direta pode soar dura. Há risco de microgestão quando a pressa aparece.",
      passo: "Ao delegar, explique o objetivo e o prazo e deixe a pessoa escolher como fazer. Combine pontos de acompanhamento, em vez de checar o tempo todo."
    },
    P: {
      nome: "Planejador",
      cor: "#2E8B62",
      resumo: "Você é calmo, disciplinado e valoriza rotina, regras e estabilidade. Mantém a tranquilidade até em situações de emergência.",
      forca: "Traz constância, escuta com paciência e dá segurança para o time. Seu trabalho é consistente e cuidadoso.",
      cuidado: "Mudanças rápidas e conflitos podem ser adiados por querer evitar atrito. Às vezes a decisão demora mais do que o time precisa.",
      passo: "Escolha uma conversa difícil que você vem adiando e use o modelo F.I.E.A.: Fato, Impacto, Expectativa e Acordo. Marque para esta semana."
    },
    A: {
      nome: "Analista",
      cor: "#1F4E9C",
      resumo: "Você é detalhista, rigoroso e busca excelência em tudo que faz. Aprende rápido e gosta de entender cada tarefa a fundo.",
      forca: "Entrega com precisão, enxerga riscos cedo e toma decisões bem fundamentadas. O time confia na sua qualidade.",
      cuidado: "A busca por informação completa pode atrasar decisões, e o silêncio em conflitos pode ser lido como distância.",
      passo: "Defina um limite de informação para decidir, por exemplo \"com 80% dos dados eu decido\". Conte ao time o porquê das suas decisões."
    }
  };

  var DICAS = [
    { chave: "C", texto: "Seja caloroso e positivo, crie conexão antes do assunto técnico e reconheça conquistas. Evite frieza e excesso de tecnicidade." },
    { chave: "E", texto: "Seja direto e objetivo, foque em resultados e demonstre segurança. Evite rodeios e detalhes desnecessários." },
    { chave: "P", texto: "Seja gentil e calmo, apresente mudanças de forma gradual e garanta suporte. Evite pressão, urgência extrema e abordagens agressivas." },
    { chave: "A", texto: "Use dados, lógica e clareza, respeite os processos e dê tempo para analisar. Evite improviso, falta de informação e pressão por decisões rápidas." }
  ];

  // C = Comunicador, E = Executor, P = Planejador, A = Analista
  var PERGUNTAS = [
    { t: "Quando surge um problema inesperado no time, qual é a sua primeira reação?", o: [
      ["E", "Decidir rápido e distribuir as tarefas."],
      ["C", "Reunir todos, conversar e animar o grupo."],
      ["P", "Manter a calma e seguir o que já foi combinado."],
      ["A", "Levantar dados e entender a causa antes de agir."] ] },
    { t: "Como é um dia de trabalho ideal para você?", o: [
      ["C", "Trocar ideias com muita gente e variar de atividade."],
      ["E", "Bater metas e resolver desafios difíceis."],
      ["P", "Seguir uma rotina previsível, sem sobressaltos."],
      ["A", "Ter tempo para aprofundar um assunto com qualidade."] ] },
    { t: "Ao dar um feedback, o que você costuma fazer?", o: [
      ["C", "Começo elogiando e criando conexão."],
      ["E", "Vou direto ao ponto."],
      ["P", "Escolho o momento certo e falo com gentileza."],
      ["A", "Levo fatos e exemplos preparados."] ] },
    { t: "Quando alguém discorda de você, o que acontece?", o: [
      ["E", "Defendo minha posição com firmeza."],
      ["C", "Tento convencer com entusiasmo."],
      ["P", "Evito o confronto e busco um acordo."],
      ["A", "Peço os argumentos e analiso com lógica."] ] },
    { t: "Uma mudança de última hora chega. Como você se sente?", o: [
      ["C", "Animado, gosto de novidade."],
      ["E", "Tudo bem, se levar ao resultado."],
      ["P", "Desconfortável, prefiro ser avisado antes."],
      ["A", "Inseguro, se não tiver informação suficiente."] ] },
    { t: "O que mais incomoda você em um time?", o: [
      ["E", "Falta de iniciativa e de resultado."],
      ["C", "Falta de interação e de energia."],
      ["P", "Pressão e urgência sem planejamento."],
      ["A", "Trabalho feito sem cuidado e sem critério."] ] },
    { t: "Para se sentir reconhecido, o que você precisa?", o: [
      ["C", "Ser visto e elogiado diante dos outros."],
      ["E", "Atingir a meta e receber mais responsabilidade."],
      ["P", "Sentir estabilidade e respeito."],
      ["A", "Ver minha qualidade e minha precisão valorizadas."] ] },
    { t: "Nas reuniões, qual é o seu papel mais comum?", o: [
      ["C", "Falo bastante e trago ideias."],
      ["E", "Conduzo e cobro decisões."],
      ["P", "Escuto e observo."],
      ["A", "Pergunto os detalhes e peço dados."] ] },
    { t: "Qual é a sua maior força como líder?", o: [
      ["C", "Inspirar e se comunicar."],
      ["E", "Determinação e foco."],
      ["P", "Constância e paciência."],
      ["A", "Precisão e senso crítico."] ] },
    { t: "Quando você delega uma tarefa, como faz?", o: [
      ["E", "Defino a meta e cobro o resultado."],
      ["C", "Explico com entusiasmo e confio."],
      ["P", "Explico passo a passo e ofereço suporte contínuo."],
      ["A", "Detalho as instruções e os critérios de qualidade."] ] },
    { t: "Sob muita pressão, o que você tende a fazer?", o: [
      ["E", "Acelerar e assumir o controle."],
      ["C", "Falar mais e buscar apoio nas pessoas."],
      ["P", "Ficar quieto e seguir o processo."],
      ["A", "Me recolher para pensar."] ] },
    { t: "Como você prefere receber uma informação?", o: [
      ["E", "Resumida, com a conclusão primeiro."],
      ["C", "Em uma conversa, de forma leve."],
      ["P", "Com calma e tempo para absorver."],
      ["A", "Organizada, com dados e justificativa."] ] }
  ];

  var el = function (id) { return document.getElementById(id); };
  var atual = 0;
  var respostas = [];      // letra escolhida em cada pergunta
  var ordens = [];         // ordem embaralhada das opções de cada pergunta
  var resultadoAtual = null;

  function embaralhar(lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function linkWhats(mensagem) {
    var base = "https://wa.me/" + WHATS_NUMERO;
    return mensagem ? base + "?text=" + encodeURIComponent(mensagem) : base;
  }

  function configurarLinksGerais() {
    var msg = "Olá, Tamiles! Vim pelo site da Impactar e quero saber mais sobre os treinamentos.";
    document.querySelectorAll("[data-whats]").forEach(function (a) {
      a.href = linkWhats(msg);
      a.target = "_blank";
      a.rel = "noopener";
    });
    document.querySelectorAll("[data-whats-empresa]").forEach(function (a) {
      a.href = linkWhats("Olá, Tamiles! Vim pelo site da Impactar e quero agendar uma conversa sobre treinamento para a minha empresa.");
    });
    var flutuante = document.querySelector(".flutuante");
    var hero = document.querySelector(".hero");
    if (flutuante && hero && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entradas) {
        flutuante.hidden = entradas[0].isIntersecting;
      }, { threshold: 0 }).observe(hero);
    }
    document.querySelectorAll("[data-whats-texto]").forEach(function (a) {
      a.href = linkWhats(msg);
      a.textContent = WHATS_EXIBIDO;
    });
    el("ano").textContent = new Date().getFullYear();
  }

  function desenharPergunta() {
    var p = PERGUNTAS[atual];
    if (!ordens[atual]) ordens[atual] = embaralhar(p.o);
    el("pergunta").textContent = p.t;
    el("progresso").textContent = "Pergunta " + (atual + 1) + " de " + PERGUNTAS.length;
    el("barra-preenchida").style.width = (atual / PERGUNTAS.length * 100) + "%";
    el("voltar").hidden = atual === 0;

    var box = el("opcoes");
    box.innerHTML = "";
    ordens[atual].forEach(function (op, i) {
      var label = document.createElement("label");
      label.className = "opcao";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "resp";
      input.value = op[0];
      input.id = "op-" + atual + "-" + i;
      if (respostas[atual] === op[0]) input.checked = true;
      var span = document.createElement("span");
      span.textContent = op[1];
      label.appendChild(input);
      label.appendChild(span);
      box.appendChild(label);
      input.addEventListener("change", function () { escolher(op[0]); });
    });
  }

  function escolher(letra) {
    respostas[atual] = letra;
    window.setTimeout(function () {
      if (atual < PERGUNTAS.length - 1) {
        atual++;
        desenharPergunta();
        var primeira = document.querySelector(".opcao input");
        if (primeira) primeira.focus({ preventScroll: true });
      } else {
        concluir();
      }
    }, 220);
  }

  function calcular() {
    var pontos = { C: 0, E: 0, P: 0, A: 0 };
    respostas.forEach(function (r) { if (r) pontos[r]++; });
    var ordem = ["C", "E", "P", "A"].sort(function (a, b) { return pontos[b] - pontos[a]; });
    return { pontos: pontos, ordem: ordem };
  }

  function concluir() {
    el("barra-preenchida").style.width = "100%";
    var r = calcular();
    var p1 = r.ordem[0], p2 = r.ordem[1];
    var empate = r.pontos[p1] === r.pontos[p2];
    resultadoAtual = { principal: p1, secundario: p2, empate: empate, pontos: r.pontos };
    var dados = PERFIS[p1];

    el("res-selo").textContent = empate
      ? "Seu resultado: perfil misto, " + PERFIS[p1].nome + " e " + PERFIS[p2].nome
      : "Seu perfil predominante";
    el("titulo-resultado").textContent = empate ? PERFIS[p1].nome + " e " + PERFIS[p2].nome : dados.nome;
    el("res-resumo").textContent = dados.resumo + (empate ? " Você também mostra forte tendência de " + PERFIS[p2].nome + ": " + PERFIS[p2].resumo.charAt(0).toLowerCase() + PERFIS[p2].resumo.slice(1) : "");
    el("res-forca").textContent = dados.forca;
    el("res-cuidado").textContent = dados.cuidado;
    el("res-passo").textContent = dados.passo;

    var dl = el("res-dicas");
    dl.innerHTML = "";
    DICAS.forEach(function (d) {
      var wrap = document.createElement("div");
      wrap.style.setProperty("--cor", PERFIS[d.chave].cor);
      if (d.chave === p1) wrap.className = "destaque";
      var dt = document.createElement("dt");
      dt.textContent = "Com o " + PERFIS[d.chave].nome + (d.chave === p1 ? " (como você)" : "");
      var dd = document.createElement("dd");
      dd.textContent = d.texto;
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      dl.appendChild(wrap);
    });

    atualizarLinkResultado();
    var secao = el("resultado");
    secao.hidden = false;
    secao.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    el("titulo-resultado").setAttribute("tabindex", "-1");
    el("titulo-resultado").focus({ preventScroll: true });
  }

  function atualizarLinkResultado() {
    if (!resultadoAtual) return;
    var nome = el("nome").value.trim();
    var perfil = PERFIS[resultadoAtual.principal].nome;
    var texto = resultadoAtual.empate
      ? "perfil misto: " + perfil + " e " + PERFIS[resultadoAtual.secundario].nome
      : "perfil predominante: " + perfil + (resultadoAtual.pontos[resultadoAtual.secundario] > 0 ? " (segundo: " + PERFIS[resultadoAtual.secundario].nome + ")" : "");
    var msg = "Olá, Tamiles!" + (nome ? " Meu nome é " + nome + "." : "") +
      " Fiz o diagnóstico no site da Impactar e meu resultado foi " + texto + ". Quero saber qual treinamento combina comigo.";
    el("res-whats").href = linkWhats(msg);
  }

  function refazer() {
    atual = 0;
    respostas = [];
    ordens = [];
    resultadoAtual = null;
    el("resultado").hidden = true;
    desenharPergunta();
    el("diagnostico").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    configurarLinksGerais();
    desenharPergunta();
    el("voltar").addEventListener("click", function () {
      if (atual > 0) { atual--; desenharPergunta(); }
    });
    el("form-quiz").addEventListener("submit", function (e) { e.preventDefault(); });
    el("nome").addEventListener("input", atualizarLinkResultado);
    el("refazer").addEventListener("click", refazer);
  });
})();
