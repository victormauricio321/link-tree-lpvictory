/* ==========================================================================
   MDP ODONTOLOGIA — script.js
   Carregado no final do <body>: quando isto roda, o DOM inteiro já existe.

   Ritmo do movimento: fade + deslocamento curto, easing de saída suave.
   Sem bounce, sem overshoot, sem rotação. Um único par de curvas no site todo.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;

  /* ---- Contexto -------------------------------------------------------- */
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var animate = hasGSAP && !prefersReduced;

  /* Modo leve: telas pequenas e aparelhos de toque.

     Vale só para o ScrollSmoother. Com smoothTouch:false ele não suaviza nada
     no toque — mas continua embrulhando os 13.725px da página num
     #smooth-wrapper fixo com #smooth-content transformado, o que tira a
     rolagem do caminho rápido do compositor. Sobra o custo sem o efeito. E hoje
     só existe um data-speed no HTML (o selo do hero), que o initParallax refaz
     sozinho quando o plugin não entra.

     Os rastros NÃO entram aqui: são desenhados no celular também, por decisão
     de projeto. O que os deixou viáveis ali foi trocar o SVG de página inteira
     por um canvas do tamanho da janela (ver initRastros) — medido, a animação
     deixou de custar pintura e GPU. */
  var modoLeve = window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches;

  // Sem GSAP (CDN fora do ar) ou com movimento reduzido: revela tudo de uma vez.
  // A página tem que ser legível antes de ser bonita.
  if (!animate) root.classList.add('motion-off');

  /* ---- Tokens de movimento — os mesmos para o site inteiro -------------

     Sobrou um. A curva das revelações (era EASE_SOFT, a expo.out) e o
     deslocamento de entrada (era Y_SHIFT, 24px) mudaram de casa: agora são
     --ease-reveal e --reveal-y no style.css, porque quem anima a revelação
     é a transição do CSS, não mais um tween. Duplicá-los aqui só criaria
     dois lugares para a mesma decisão. O EASE_OUT continua, no acordeão e
     nos contadores, que seguem no GSAP. */
  var EASE_OUT = 'power2.out';

  var smoother = null;

  /* ======================================================================
     1. SCROLLSMOOTHER
     Rolagem com inércia + data-speed nos elementos decorativos. O plugin
     move #smooth-content por transform e usa a barra de rolagem nativa,
     então a página continua rolável por teclado, roda e barra.
     ====================================================================== */
  function initSmoothScroll() {
    if (!animate || modoLeve || typeof window.ScrollSmoother === 'undefined') return;

    window.gsap.registerPlugin(window.ScrollTrigger, window.ScrollSmoother);

    smoother = window.ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.2,          // segundos para "alcançar" a posição real do scroll
      effects: true,        // liga os data-speed do HTML
      smoothTouch: false,   // no toque, rolagem nativa — inércia própria do SO
      ignoreMobileResize: true
      // normalizeScroll fica desligado de propósito: ele sequestra a rolagem
      // para a thread do JS e window.scrollTo() para de surtir efeito, o que
      // quebra tecnologia assistiva e restauração de posição do navegador.
    });

    root.classList.add('has-smoother');
  }

  /* ======================================================================
     2. ÂNCORAS — rolagem até a seção, descontando a altura do cabeçalho
     ====================================================================== */
  function initAnchors() {
    var headerH = parseInt(
      getComputedStyle(root).getPropertyValue('--header-h'), 10
    ) || 76;

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (!id || id === '#') return;

        var alvo = document.querySelector(id);
        if (!alvo) return;

        e.preventDefault();
        closeMenu();

        if (smoother) {
          smoother.scrollTo(alvo, true, 'top ' + (headerH + 16) + 'px');
        } else {
          var top = alvo.getBoundingClientRect().top + window.pageYOffset - headerH - 16;
          window.scrollTo({ top: top, behavior: prefersReduced ? 'auto' : 'smooth' });
        }
      });
    });
  }

  /* ======================================================================
     3. CABEÇALHO — fundo sólido só depois que a rolagem começa
     ====================================================================== */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;

    var stuck = false;
    function update() {
      var deveGrudar = window.scrollY > 24;
      if (deveGrudar === stuck) return;      // só toca no DOM quando o estado muda
      stuck = deveGrudar;
      header.classList.toggle('is-stuck', stuck);
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ======================================================================
     4. MENU MOBILE
     ====================================================================== */
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');

  function closeMenu() {
    if (!navToggle || !nav) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menu');
    nav.classList.remove('is-open');
    if (smoother) smoother.paused(false);
  }

  function initMenu() {
    if (!navToggle || !nav) return;

    navToggle.addEventListener('click', function () {
      var aberto = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!aberto));
      navToggle.setAttribute('aria-label', aberto ? 'Abrir menu' : 'Fechar menu');
      nav.classList.toggle('is-open', !aberto);
      if (smoother) smoother.paused(!aberto);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        navToggle.focus();
      }
    });
  }

  /* ======================================================================
     5. ACORDEÃO (FAQ)
     Um item aberto por vez. Animação de altura só quando há GSAP.
     ====================================================================== */
  function initAcordeao() {
    var botoes = Array.prototype.slice.call(document.querySelectorAll('.acordeao__botao'));
    if (!botoes.length) return;

    function setPainel(botao, abrir, comAnimacao) {
      var painel = document.getElementById(botao.getAttribute('aria-controls'));
      if (!painel) return;

      botao.setAttribute('aria-expanded', String(abrir));

      if (!animate || !comAnimacao) {
        painel.style.height = abrir ? 'auto' : '0px';
        return;
      }

      window.gsap.to(painel, {
        height: abrir ? 'auto' : 0,
        duration: abrir ? 0.42 : 0.3,   // fechar é mais rápido que abrir
        ease: EASE_OUT,
        onComplete: function () {
          if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        }
      });
    }

    // Estado inicial: respeita o aria-expanded que veio do HTML
    botoes.forEach(function (botao) {
      setPainel(botao, botao.getAttribute('aria-expanded') === 'true', false);
    });

    botoes.forEach(function (botao) {
      botao.addEventListener('click', function () {
        var vaiAbrir = botao.getAttribute('aria-expanded') !== 'true';

        botoes.forEach(function (outro) {
          if (outro !== botao && outro.getAttribute('aria-expanded') === 'true') {
            setPainel(outro, false, true);
          }
        });

        setPainel(botao, vaiAbrir, true);
      });
    });
  }

  /* ======================================================================
     6. ANO DO RODAPÉ
     ====================================================================== */
  function initAno() {
    document.querySelectorAll('[data-ano]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ======================================================================
     6b. FOCO QUE SEGUE O CURSOR

     Só escreve duas custom properties; o degradê em si é CSS. Roda mesmo
     com prefers-reduced-motion: não é movimento autônomo, é a resposta
     direta ao ponteiro — parar de acompanhar seria quebrar a affordance.
     O navegador já agrupa pointermove por quadro, então não há throttle.
     ====================================================================== */
  function initBrilhoCursor() {
    /* A mesma condição do CSS, que só acende o brilho sob @media (hover:hover).
       No toque ele nunca aparece — mas o pointermove disparava assim mesmo, e
       dispara durante o arrasto da rolagem: era um getBoundingClientRect e duas
       custom properties por evento, na main thread, exatamente enquanto o dedo
       rola. As duas propriedades alimentam um radial-gradient que cobre um
       painel de tela cheia, então cada escrita ainda invalidava a pintura dele.
       Trabalho por quadro para um efeito que ninguém ali podia ver. */
    if (!window.matchMedia('(hover: hover)').matches) return;

    document.querySelectorAll('[data-brilho]').forEach(function (painel) {
      painel.addEventListener('pointermove', function (e) {
        var caixa = painel.getBoundingClientRect();
        painel.style.setProperty('--brilho-x', (e.clientX - caixa.left) + 'px');
        painel.style.setProperty('--brilho-y', (e.clientY - caixa.top) + 'px');
      });
    });
  }

  /* ======================================================================
     6b2. CARROSSEL DO HERO

     O único trabalho aqui é duplicar a lista de fotos. A fita anda com
     @keyframes, em CSS; o que ela precisa é que a segunda metade do trilho
     seja idêntica à primeira, para que os -50% do keyframe caiam num quadro
     igual ao inicial e a volta não tenha emenda visível.

     Duplicar por script e não na marcação tem um motivo prático: quem for
     trocar as fotos edita uma lista só, sem risco de as duas cópias saírem
     de sincronia. Roda mesmo com prefers-reduced-motion — o que a
     preferência desliga é a animação, no CSS, não a estrutura.
     ====================================================================== */
  function initCarrossel() {
    document.querySelectorAll('[data-carrossel]').forEach(function (caixa) {
      var trilho = caixa.querySelector('.carrossel__trilho');
      if (!trilho) return;

      var originais = Array.prototype.slice.call(trilho.children);
      if (!originais.length) return;

      originais.forEach(function (slide) {
        var copia = slide.cloneNode(true);
        copia.setAttribute('aria-hidden', 'true');   // não repetir no leitor de tela
        trilho.appendChild(copia);
      });

      // A duração acompanha o tamanho da lista: passo por foto, não por volta.
      caixa.style.setProperty('--carrossel-n', originais.length);
      caixa.classList.add('carrossel--pronto');
    });
  }

  /* ======================================================================
     6b3. ANIMAÇÕES CONTÍNUAS SÓ ENQUANTO ESTÃO EM CENA

     Três animações do site não têm fim: as duas fitas dos carrosséis e os dois
     borrões da aurora. Uma animação de CSS fora da tela não some do orçamento —
     o navegador continua avançando o relógio dela e mantendo a camada viva, e
     as fitas ainda carregam uma mask-image, que obriga a compor em superfície
     separada. Numa página de treze mil pixels isso é a maior parte da visita
     pagando por pixel que ninguém está vendo.

     A margem de 200px religa um pouco antes de entrar, então nunca se vê a
     fita parada. Pausar e retomar não dá salto: o animation-play-state congela
     o relógio onde está e continua dali.
     ====================================================================== */
  function initAnimacoesEmCena() {
    if (!('IntersectionObserver' in window)) return;

    // [ quem observar , o que pausar dentro dele ]
    var grupos = [
      ['.carrossel', '.carrossel__trilho'],
      ['.apresentacao', '.apresentacao__blob']
    ];

    grupos.forEach(function (par) {
      var caixas = document.querySelectorAll(par[0]);
      if (!caixas.length) return;

      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          var alvos = e.target.querySelectorAll(par[1]);
          for (var i = 0; i < alvos.length; i++) {
            alvos[i].style.animationPlayState = e.isIntersecting ? '' : 'paused';
          }
        });
      }, { rootMargin: '200px 0px' });

      caixas.forEach(function (c) { obs.observe(c); });
    });
  }

  /* ======================================================================
     6c/7. ABERTURA DA MARCA E REVELAÇÕES — mudaram de arquivo

     Estavam aqui e agora vivem num <script> embutido no index.html, logo
     acima das tags do GSAP. Não é gosto: é a ordem de carregamento.

     Duas mudanças, nesta ordem. Primeiro elas deixaram de ser tweens do GSAP
     e viraram uma transição de CSS disparada por IntersectionObserver — o
     GSAP reescrevia opacity e transform inline a cada quadro, e como as
     revelações se sucedem sem parar enquanto se desce a página havia quase
     sempre um tween rodando, cada escrita custando recálculo de estilo,
     pintura e composição na main thread. Medido no site publicado, num scroll
     da página inteira com CPU 6x: matar só as revelações tirava 20% do
     RunTask, 58% do UpdateLayoutTree e metade do Layerize. Em CSS, opacity e
     transform são as duas propriedades que o compositor anima sozinho, então
     a revelação inteira sai da main thread.

     Feito isso, elas passaram a não depender mais do GSAP — e continuar
     esperando por ele custava caro. No celular a primeira tela é só o painel
     da marca, e a marca é [data-abertura], ou seja, nasce em opacity 0. Ela
     só aparecia quando este arquivo executava, o que só acontecia depois de
     baixar 52,9 KB de GSAP de um CDN de terceiro. Medido em 4G lento com CPU
     4x, no site publicado: 863 ms de painel cinza vazio entre o FCP e o
     logotipo aparecer. Subindo o bloco para antes das tags do GSAP, a marca
     entra assim que o HTML termina de ser lido.

     Ficou uma cópia só, lá. Duplicar as funções aqui como plano B criaria
     duas versões da mesma decisão para alguém dessincronizar depois.
     ====================================================================== */

  /* ======================================================================
     8. PARALLAX — plano B do data-speed
     Com o ScrollSmoother ativo, os data-speed do HTML já são resolvidos pelo
     plugin (effects: true) e esta função não roda. Ela existe para o caso do
     ScrollSmoother não carregar: aí o mesmo data-speed vira um scrub manual,
     para o movimento não sumir por completo.
     ====================================================================== */
  function initParallax() {
    if (smoother) return;

    var gsap = window.gsap;

    gsap.utils.toArray('[data-speed]').forEach(function (el) {
      var speed = parseFloat(el.dataset.speed);
      if (!speed || speed === 1) return;

      // speed < 1 fica para trás (desce), speed > 1 adianta (sobe).
      var k = (1 - speed) * 50;

      gsap.fromTo(el,
        { yPercent: -k },
        {
          yPercent: k,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('section') || el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8            // amarrado à barra de rolagem, sem saltos
          }
        }
      );
    });
  }

  /* ======================================================================
     7b. SEQUÊNCIA POR TIMELINE
     Entrada encadeada da esquerda para a direita, numa timeline própria em
     vez do stagger genérico — assim o intervalo entre os cards é ajustável
     item a item pelo HTML (data-passo), sem mexer no resto do site.

     O vídeo de referência varre a largura em ~0.59s. Com quatro cards, isso
     equivale a ~0.15s entre um e outro; o data-passo do HTML aplica o 1.5x.
     ====================================================================== */
  /* A sequência da equipe passou a ser tratada junto das outras revelações,
     no initReveals: é o mesmo movimento, só com passo próprio, e agora os
     três casos compartilham o mesmo observer e a mesma transição de CSS. O
     data-passo do HTML continua mandando no intervalo, como antes. */

  /* ======================================================================
     8b. COLUNAS QUE ACOMPANHAM A SEÇÃO
     Equivale ao position:sticky, que não funciona dentro de #smooth-content
     (o transform do ScrollSmoother vira bloco de contenção). O pin do
     ScrollTrigger é a substituição oficial e conversa com o smoother.

     A coluna prende quando o topo dela alcança a folga abaixo do cabeçalho,
     e solta quando o fim do bloco alcança a base dela — nem antes, nem
     invadindo a seção seguinte.
     ====================================================================== */
  function initColunasFixas() {
    // Sem smoother o CSS devolve o position:sticky nativo, que é mais barato
    // e não precisa de pin-spacer. Pinar aqui só criaria conflito.
    if (!smoother) return;

    var gsap = window.gsap;
    var ST = window.ScrollTrigger;

    var headerH = parseInt(
      getComputedStyle(root).getPropertyValue('--header-h'), 10
    ) || 76;
    var folga = headerH + 32;

    // Só no layout de duas colunas. Abaixo de 1025px vira coluna única e
    // prender a lateral não faria sentido. matchMedia limpa sozinho no resize.
    gsap.matchMedia().add('(min-width: 1025px)', function () {
      document.querySelectorAll('[data-fixa]').forEach(function (coluna) {
        var bloco = coluna.parentElement;
        if (!bloco) return;

        ST.create({
          trigger: coluna,
          start: 'top top+=' + folga,
          endTrigger: bloco,
          end: function () {
            return 'bottom top+=' + (folga + coluna.offsetHeight);
          },
          pin: true,
          pinSpacing: false,      // não injeta altura: a grade de 2 colunas continua intacta
          invalidateOnRefresh: true
        });
      });
    });
  }

  /* ======================================================================
     9. CONTADORES
     ====================================================================== */
  function initContadores() {
    var alvos = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    if (!alvos.length) return;

    alvos.forEach(function (el) {
      var destino = parseFloat(el.dataset.count) || 0;
      var sufixo = el.dataset.suffix || '';

      if (!animate) {
        el.textContent = destino + sufixo;
        return;
      }

      /* O onUpdate roda a cada quadro, mas o número mostrado só muda algumas
         dezenas de vezes no percurso inteiro (o maior destino aqui é 98).
         Escrever textContent com o MESMO texto ainda invalida o layout do
         elemento e leva pintura junto — eram ~96 quadros de trabalho para
         cerca de 8 mudanças visíveis, três vezes na página. A guarda abaixo
         só deixa passar quando o inteiro exibido muda de fato. */
      var contador = { valor: 0 };
      var ultimo = null;
      window.gsap.to(contador, {
        valor: destino,
        duration: 1.6,
        ease: EASE_OUT,
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        onUpdate: function () {
          var v = Math.round(contador.valor);
          if (v === ultimo) return;
          ultimo = v;
          el.textContent = v + sufixo;
        },
        onComplete: function () {
          if (ultimo !== destino) el.textContent = destino + sufixo;
        }
      });
    });
  }

  /* ======================================================================
     9b. RASTROS
     Três linhas que saem da borda de baixo do painel de apresentação e descem
     até o topo das fotos da equipe, desenhadas conforme a rolagem.

     A geometria é toda medida, nunca escrita à mão: os x de partida saem do
     centro dos três números das métricas e os de chegada do centro do topo de
     cada foto. Assim o espaçamento inicial é literalmente o das métricas em
     qualquer largura, e no responsivo — onde as duas grades mudam de forma —
     os rastros acompanham sem regra nova.

     O balanço é a soma de duas senoides de períodos incomensuráveis por
     rastro, com amplitude em fração do espaçamento (não em px), para que o
     desenho encolha junto com a tela. Um envelope sin(pi t) zera o balanço nas
     duas pontas: a linha sai exatamente sob o número e chega exatamente no
     meio da foto, e todo o serpenteio acontece no meio do caminho.

     Cada rastro são três traços sobrepostos, como no vídeo de referência —
     medido lá: linha de ~1% da largura do quadro, cabeça 3x mais grossa e o
     brilho caindo de ~235 na cabeça para ~50 na cauda.
     ====================================================================== */
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* Amplitudes em fração do espaçamento, não em px — é o que faz o desenho
     encolher junto com a tela.

     As fases não são aleatórias, apesar do resultado parecer. Para dois
     rastros vizinhos trocarem de lado, a diferença entre os balanços tem de
     vencer um espaçamento inteiro — e ainda por cima num ponto onde o
     envelope não a tenha reduzido. Sai conta demais para fazer à mão, então
     varri as combinações e escolhi a que atende, ao mesmo tempo:

       par 1-2   troca de lado em u 0,31 -> 0,47   (16,1% do percurso)
       par 2-3   troca de lado em u 0,56 -> 0,72   (16,8%)
       par 1-3   nunca se cruza — teria de atravessar dois espaçamentos
       faixa horizontal  -0,36 a +2,39 espaçamentos

     Os dois cruzamentos ficam em alturas separadas, então a trança desce em
     vez de se resolver de uma vez. E os -0,36 mantêm o desenho dentro do
     container: em 1440 o rastro mais à esquerda chega a x=198, com o
     container começando em 113.

     A segunda senoide, com período diferente em cada rastro, é só para o
     serpenteio não sair simétrico. É pequena demais para desfazer a troca de
     lado que a primeira garante. */
  var ONDAS = [
    { a1: 0.74, f1: 1.15, p1: 4.712, a2: 0.15, f2: 2.55, p2: 1.90 },
    { a1: 0.74, f1: 1.15, p1: 2.618, a2: 0.12, f2: 2.10, p2: 4.60 },
    { a1: 0.74, f1: 1.15, p1: 0.262, a2: 0.17, f2: 2.85, p2: 0.80 }
  ];

  var PONTOS = 16;        // vértices por rastro antes de virar bézier
  var MOLDURA_FOLGA = 8;  // a moldura corre por fora da foto, não em cima dela

  /* Texto e botão que o rastro não pode cruzar. Ele não desvia: some.
     Desviar seria o ideal, mas não cabe — entre a coluna de texto do hero e o
     carrossel sobram 64px de corredor livre, e são três rastros com 379px de
     espaçamento. Passariam a se espremer num funil e a abrir de novo, que é o
     oposto de discreto. Apagar o traço nesses trechos resolve sem deformar o
     desenho: a linha se dissolve ao chegar no texto e volta depois dele. */
  var OBSTACULOS = [
    '.hero__copy .eyebrow', '.hero__title', '.hero__lead', '.hero__actions', '.hero__trust',
    '.sobre > .container .eyebrow', '.manifesto', '.sobre__aside',
    '.tratamentos .section-head .eyebrow',
    '.tratamentos .section-head .section-title',
    '.tratamentos .section-head .section-sub',
    /* O título e o texto, não o <li> inteiro: a caixa do benefício embrulha
       também o ícone, o padding e o vão entre as duas linhas, e mascarar tudo
       isso fechava a coluna da direita de ponta a ponta. Assim o rastro passa
       pelas frestas internas do card sem encostar em letra nenhuma. */
    '.beneficio__title', '.beneficio__text',
    '.equipe .section-head .eyebrow',
    '.equipe .section-head .section-title',
    '.doutor__foto'
  ].join(',');

  /* Obstáculo que anda: a coluna dos diferenciais é pinada pelo ScrollTrigger e
     percorre 547px enquanto a seção passa. Um retângulo medido uma vez só
     cobriria a posição inicial dela. Estes são remedidos a cada quadro
     enquanto a seção está em cena — a caixa do aside já embrulha o texto todo
     e o botão, então basta ela. */
  var OBSTACULOS_MOVEIS = '.diferenciais__aside';
  var OBST_FOLGA = 6;     // ar entre o fim do traço e a caixa do texto
  var OBST_SUAVE = 9;     // desfoque da máscara: a dissolução, não um corte

  function criaTraco(classe) {
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('class', classe);
    return p;
  }

  /* Posição de layout, imune a transform.

     getBoundingClientRect devolve onde o elemento ESTÁ, e no carregamento os
     blocos com data-reveal / data-sequencia ainda estão deslocados para baixo
     esperando a revelação. Medido: o card da equipe nascia em translate(0,16px)
     e voltava a zero ao ser revelado — a foto subia 16px e a moldura, desenhada
     antes, ficava cortando ela por 8px em vez de envolvê-la.

     offsetLeft/offsetTop ignoram transform, então entregam a posição de
     repouso. É ela que vale para tudo que é desenhado uma vez só: as âncoras
     dos rastros, os buracos da máscara e as molduras. A única exceção é a
     coluna pinada, cujo transform é justamente o que precisamos seguir. */
  function posLayout(el) {
    var x = 0, y = 0, n = el;
    while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x: x, y: y, w: el.offsetWidth, h: el.offsetHeight };
  }

  /* Catmull-Rom -> cúbicas. Passa por todos os pontos e a tangente de cada um
     é a média dos vizinhos, então não sobra bico nas emendas.

     Voltou a receber só a lista: o corte em intervalos existia para emitir
     cada rastro em pedaços de SVG, e no canvas o rastro é um path só. */
  function suaviza(pts) {
    var a = 0, b = pts.length - 1;
    var d = 'M' + pts[a][0].toFixed(1) + ' ' + pts[a][1].toFixed(1);
    for (var i = a; i < b; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || pts[i + 1];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) +
           ',' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) +
           ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  /* Meia moldura de retângulo arredondado, do meio do topo ao meio da base.
     Duas dessas, uma para cada lado, descem juntas e se encontram embaixo. */
  function meiaMoldura(x, y, w, h, r, direita) {
    var cx = x + w / 2;
    var s = direita ? 1 : 0;
    var xa = direita ? x + w - r : x + r;
    var xb = direita ? x + w : x;
    return 'M' + cx + ' ' + y +
           'H' + xa +
           'A' + r + ' ' + r + ' 0 0 ' + s + ' ' + xb + ' ' + (y + r) +
           'V' + (y + h - r) +
           'A' + r + ' ' + r + ' 0 0 ' + s + ' ' + xa + ' ' + (y + h) +
           'H' + cx;
  }

  function initRastros() {
    var caixa = document.querySelector('.rastros');
    var painel = document.querySelector('.apresentacao');
    var nums = document.querySelectorAll('.metrica__num');
    var fotos = document.querySelectorAll('.doutor__foto');
    if (!caixa || !painel || nums.length < 3 || fotos.length < 3) return;

    /* ------------------------------------------------------------------
       A TELA — canvas do tamanho da JANELA, não da página.

       A mudança que importa aqui é de camada, não de desenho. O traçado, as
       ondas, a máscara e as espessuras continuam sendo os mesmos de antes;
       só o meio em que saem mudou.

       O SVG ocupava 375 x 12.318px, e uma camada desse tamanho cobra caro
       por qualquer mudança: cada escrita de stroke-dashoffset obrigava o
       Blink a refazer a lista de itens de pintura e a re-rasterizar os
       ladrilhos da faixa visível, arrastando junto a superfície da máscara.
       Medido no site publicado, scroll da página inteira com CPU 6x: 1.432
       eventos de Paint, 995ms de Layerize, 1.570ms de GPU — contra 634
       Paint do MESMO desenho parado, sem animação nenhuma. Ou seja: a
       animação sozinha dobrava a pintura da página.

       A mesma cena em canvas preso à janela, limpando e redesenhando tudo a
       cada quadro, sem nenhuma esperteza: 392 Paint, 309ms de Layerize,
       871ms de GPU. Pinta menos que o SVG PARADO, porque o custo por quadro
       deixa de depender da altura da página e passa a depender só do tamanho
       da janela — que não muda.

       Duas alternativas foram medidas antes desta e descartadas, as duas por
       piorarem: revelar por clip-path: inset() (Layerize 407 -> 2.376) e por
       janela deslizante de overflow com transform duplo (Layerize 2.401).
       Nos dois casos o recorte anda, a cull rect do Blink anda junto e a
       camada é repintada de qualquer forma.

       A tela acompanha a rolagem por transform, que o compositor resolve
       sozinho, e o contexto desenha deslocado do mesmo tanto — então a
       geometria continua em px de layout, idêntica à que o SVG usava. */
    var tela = document.createElement('canvas');
    tela.className = 'rastros__tela';
    caixa.appendChild(tela);
    var cx = tela.getContext('2d');

    /* Nada além disto sai do canvas. O <svg> vira régua: os paths existem só
       para o getTotalLength() e para a string 'd' que vira Path2D. Ele não
       renderiza (0 x 0, overflow escondido), então não custa pintura. */
    var regua = document.createElementNS(SVG_NS, 'svg');
    regua.setAttribute('width', 0);
    regua.setAttribute('height', 0);
    regua.setAttribute('aria-hidden', 'true');
    regua.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    caixa.appendChild(regua);

    /* O borrão da dissolução e o canto arredondado dos buracos chegaram ao
       canvas 2D na mesma versão (Chrome 99 / Safari 16.4). Onde faltarem, o
       rastro continua igual e só o corte fica seco em vez de dissolvido —
       degradação discreta, e não uma tela vazia. */
    cx.filter = 'blur(1px)';
    var TEM_BORRAO = cx.filter !== 'none';
    cx.filter = 'none';
    var TEM_CANTO = typeof cx.roundRect === 'function';

    /* Espessura, opacidade e cor continuam morando no CSS. Estes quatro paths
       não desenham nada e não têm 'd' — existem para que o canvas leia os
       valores do mesmo lugar de onde o SVG os lia, em vez de repetir os
       números aqui e criar dois lugares para a mesma decisão. O currentColor
       do .rastros já chega resolvido em .stroke. */
    var ESTILOS = {};
    ['rastro__halo', 'rastro__linha', 'rastro__ponta', 'moldura__lado'].forEach(function (c) {
      var sonda = criaTraco(c);
      regua.appendChild(sonda);
      var e = getComputedStyle(sonda);
      ESTILOS[c] = {
        w: parseFloat(e.strokeWidth) || 1,
        a: parseFloat(e.opacity),
        cor: e.stroke,
        tampa: e.strokeLinecap || 'butt'
      };
    });

    var trilhas = [], molduras = [], i;
    for (i = 0; i < 3; i++) {
      var p2 = criaTraco('rastro__linha');
      regua.appendChild(p2);
      trilhas.push({ regua: p2, forma: null, L: 0, cabeca: 0, y0: 0, y1: 0 });
    }
    /* A moldura NÃO mora no canvas — e isso é a correção de um erro de camada.

       Ela morava. A tela é position:fixed e o conteúdo dela é calculado na
       main thread a partir da posição de rolagem; a foto, essa rola no
       compositor. No celular a rolagem é assíncrona, então basta a main thread
       atrasar um quadro para tudo que está desenhado na tela atrasar junto.
       Nos rastros isso não se enxerga, porque eles flutuam soltos. Na moldura
       se enxerga muito, porque ela abraça a foto: medido no site publicado,
       com rolagem por evento de roda, o vão entre a linha de cima e a borda da
       foto ia de 9,5px parado para 2,5px em movimento. Sete pixels de
       escorregão, e a sensação de duas camadas separadas.

       Agora cada moldura é uma tela PRÓPRIA, pequena, dentro do card. Não
       sobrou nada para sincronizar: ela e a foto estão na mesma caixa de
       layout e recebem exatamente os mesmos transforms — o da revelação de
       entrada e o do :hover inclusive. O desalinhamento deixa de ser algo a
       evitar e passa a ser impossível de construção.

       Tela e não <svg> por causa do custo da entrada. Cheguei a fazer em
       <svg>, e funcionou: o escorregão sumiu. Mas animar stroke-dashoffset em
       elemento do DOM repinta a camada da página, e medido isso dobrava os
       eventos de Paint da rolagem inteira — 361 para 730 — concentrados nos
       1,5s da entrada. Tentei confinar com will-change e com contain:paint;
       nenhum dos dois mudou nada. Atualizar a textura de um canvas, por outro
       lado, não é evento de pintura: com a tela própria os 730 voltam para o
       patamar de quem não tem moldura nenhuma.

       A tela mede a foto mais a folga mais 1px de cada lado. O 1px existe
       porque canvas corta no próprio limite, ao contrário de SVG com overflow
       visível, e o traço é centrado no caminho: sem a sobra, metade da
       espessura seria cortada nas quatro bordas. */
    for (i = 0; i < 3; i++) {
      var card = fotos[i].closest('.doutor') || fotos[i].parentElement;
      var cerca = document.createElement('canvas');
      cerca.className = 'moldura';
      cerca.setAttribute('aria-hidden', 'true');
      card.appendChild(cerca);
      // o path só para medir: getTotalLength não existe em Path2D
      var mRegua = criaTraco('moldura__lado');
      regua.appendChild(mRegua);
      molduras.push({
        tela: cerca, cx: cerca.getContext('2d'), card: card, foto: fotos[i],
        regua: mRegua, esq: null, dir: null, L: 0, w: 0, h: 0
      });
    }

    var buracos = [];  // { x, y, w, h } em coordenada do container
    var moveis = [];   // { el, buraco } — remedidos a cada quadro

    /* O borrão de cada buraco, guardado como imagem.

       ctx.filter='blur()' é uma passagem de GPU por retângulo desenhado.
       Medido nesta build, no scroll da página inteira: os dois ou três
       buracos de um quadro típico levavam 21% de todo o GPUTask (1.761 ->
       1.393ms sem eles) e 5% do RunTask. Mas buraco não muda de quadro em
       quadro — muda quando a geometria muda, que é raro e já tem guarda. Então
       cada um é borrado uma vez e guardado; por quadro sobra um drawImage.

       O selo sai em 1x mesmo em tela 3x. É uma gaussiana de 9px: ampliar não
       tem o que revelar, e a 1x os ~25 buracos ocupam 5,7 MB no celular em vez
       de 23 — memória de duas fotos, para uma volta que é grande.

       Os 25 são selados aqui, junto da medição, e não sob demanda no primeiro
       quadro em que aparecem. Cheguei a fazer sob demanda por suspeitar de
       custo na abertura, mas a medição não confirmou: com trace de main thread
       em 4G lento e CPU 4x, selar tudo de uma vez dá o mesmo RunTask de
       abertura e o mesmo número de tarefas longas que o publicado. Sob
       demanda, em compensação, o custo reaparecia espalhado pela rolagem, que
       é justamente onde ele não pode estar. */
    var MARGEM_BORRAO = Math.ceil(OBST_SUAVE * 3);   // alcance útil da gaussiana

    function selaBuraco(r) {
      if (r.selo && r.selo.gw === r.w && r.selo.gh === r.h) return;   // só o tamanho manda
      var M = MARGEM_BORRAO;
      var c = document.createElement('canvas');
      c.width = Math.ceil(r.w) + M * 2;
      c.height = Math.ceil(r.h) + M * 2;
      var s = c.getContext('2d');
      if (TEM_BORRAO) s.filter = 'blur(' + OBST_SUAVE + 'px)';
      s.fillStyle = '#000';
      s.beginPath();
      if (TEM_CANTO) s.roundRect(M, M, r.w, r.h, 10);
      else s.rect(M, M, r.w, r.h);
      s.fill();
      c.gw = r.w; c.gh = r.h;
      r.selo = c;
    }

    /* Repouso: para tudo que é desenhado uma vez. */
    function poeRectLayout(r, el, origem) {
      var b = posLayout(el);
      r.x = b.x - origem.x - OBST_FOLGA;
      r.y = b.y - origem.y - OBST_FOLGA;
      r.w = b.w + OBST_FOLGA * 2;
      r.h = b.h + OBST_FOLGA * 2;
      selaBuraco(r);
    }

    /* Onde está agora: só para a coluna pinada, cujo transform é o alvo. Ela
       anda mas não muda de tamanho, então o selo dela é reaproveitado. */
    function poeRectVisual(r, el, base) {
      var b = el.getBoundingClientRect();
      r.x = b.left - base.left - OBST_FOLGA;
      r.y = b.top - base.top - OBST_FOLGA;
      r.w = b.width + OBST_FOLGA * 2;
      r.h = b.height + OBST_FOLGA * 2;
      selaBuraco(r);
    }

    /* Os buracos deixaram de ser elementos <rect> dentro de um <g> filtrado e
       passaram a ser quatro números cada. No SVG, mexer num atributo de um
       buraco invalidava o feGaussianBlur inteiro, e o filtro cobria a página
       toda; aqui a lista é só dado, e o borrão é aplicado no canvas apenas
       sobre os buracos que cruzam a janela. */
    function refazMascara(base, origem) {
      buracos.length = 0;
      moveis.length = 0;

      var n, r;
      var alvos = document.querySelectorAll(OBSTACULOS);
      for (n = 0; n < alvos.length; n++) {
        if (!alvos[n].offsetWidth || !alvos[n].offsetHeight) continue;
        r = {};
        poeRectLayout(r, alvos[n], origem);
        buracos.push(r);
      }

      var pinados = document.querySelectorAll(OBSTACULOS_MOVEIS);
      for (n = 0; n < pinados.length; n++) {
        r = {};
        poeRectVisual(r, pinados[n], base);
        buracos.push(r);
        /* Só entra na lista de remedição quem de fato anda. No celular a
           coluna é position:static (ver o responsivo, a partir de 1024px) —
           não sai do lugar nunca. Ela anda em dois casos, e só nesses dois
           entra aqui: com o smoother ligado, porque o initColunasFixas a
           pina; e sem ele, quando o CSS devolve o position:sticky nativo. */
        if (smoother || getComputedStyle(pinados[n]).position === 'sticky') {
          moveis.push({ el: pinados[n], buraco: r });
        }
      }
      return alvos.length + pinados.length;
    }

    function atualizaMoveis() {
      if (!moveis.length) return;
      var base = caixa.getBoundingClientRect();
      for (var n = 0; n < moveis.length; n++) poeRectVisual(moveis[n].buraco, moveis[n].el, base);
    }

    var assinatura = null;   // geometria do último traçado, para não repetir

    function desenha() {
      var base = caixa.getBoundingClientRect();
      var origem = posLayout(caixa);

      /* Medida degenerada: sai sem tocar em nada. Um refresh que caia num
         instante em que a camada mede zero (aconteceu aqui ao trocar a
         viewport, e no celular o refresh de mudança de orientação pega o
         layout no meio da troca) escreveria width=0 no retângulo de fundo da
         máscara — que é o branco que autoriza o desenho. Máscara toda preta,
         rastros invisíveis, e sem novo refresh nada os traz de volta. É
         melhor manter o traçado anterior do que apagar o desenho. */
      if (!base.width || !base.height) return;

      /* A tela tem o tamanho da janela e nunca o da página — é isso que faz o
         custo por quadro parar de crescer com a altura do documento. Abrir um
         item do FAQ cresce o #conteudo e não muda uma linha daqui. */
      origemY = origem.y;
      dimensionaTela();

      var pl = posLayout(painel);
      var y0 = pl.y - origem.y + pl.h;

      var partida = [], chegada = [];
      for (var k = 0; k < 3; k++) {
        var nb = posLayout(nums[k]);
        partida.push(nb.x - origem.x + nb.w / 2);
        var fb = posLayout(fotos[k]);
        chegada.push({
          x: fb.x - origem.x + fb.w / 2,
          y: fb.y - origem.y,
          l: fb.x - origem.x,
          w: fb.w, h: fb.h
        });
      }

      /* Estas sete medidas são a entrada inteira do traçado — âncoras de
         partida, de chegada e a largura da camada. Se nenhuma mudou, o desenho
         sairia idêntico ao que já está na tela, e tudo daqui para baixo é
         trabalho jogado fora: 24 obstáculos remedidos e recriados dentro do
         grupo filtrado (o que força o borrão da página inteira), 51 pontos de
         seno por rastro e seis getTotalLength.

         Isso importa porque desenha() está pendurado no refresh do
         ScrollTrigger, e refresh acontece muito mais do que a geometria muda:
         no fonts.ready, no load, na mudança de orientação e — o pior caso — a
         cada abrir e fechar do FAQ, que fica centenas de pixels ABAIXO de onde
         qualquer rastro passa. Ali só a altura mudou, e a altura já foi
         aplicada acima. */
      var sig = base.width + '|' + y0 + '|' + partida.join(',') + '|' +
        chegada.map(function (c) { return c.x + ',' + c.y + ',' + c.l + ',' + c.w + ',' + c.h; }).join(';');
      if (sig === assinatura) return;
      assinatura = sig;

      refazMascara(base, origem);

      var espaco = Math.abs(partida[1] - partida[0]) || 120;

      /* As margens em que o balanço pode se mexer. No empilhado os três pontos
         de partida deixam de ser equidistantes — a grade das métricas vira
         duas colunas com a terceira centrada embaixo — e o rastro do meio
         nasce perto da borda. Sem trava ele saía 32px para fora da página. */
      var cont = document.querySelector('.tratamentos > .container');
      var cbl = cont ? posLayout(cont) : { x: origem.x, w: base.width };
      /* Caixa de conteúdo, não a de borda: o .container carrega --gutter de
         padding, e é essa margem que o texto respeita. O rastro respeita a
         mesma, senão encosta na beirada da tela no celular. */
      var cs = cont ? getComputedStyle(cont) : null;
      var limEsq = cbl.x - origem.x + (cs ? parseFloat(cs.paddingLeft) : 0);
      var limDir = cbl.x + cbl.w - origem.x - (cs ? parseFloat(cs.paddingRight) : 0);

      for (var t = 0; t < 3; t++) {
        var o = ONDAS[t], x0 = partida[t], alvo = chegada[t];
        var queda = alvo.y - y0;

        // 1) o balanço cru, sem olhar as bordas
        var bruto = [];
        for (var n = 0; n <= PONTOS; n++) {
          var u = n / PONTOS;
          var env = Math.pow(Math.sin(Math.PI * u), 0.85);
          bruto.push({
            base: x0 + (alvo.x - x0) * u,
            s: env * espaco * (o.a1 * Math.sin(2 * Math.PI * o.f1 * u + o.p1) +
                               o.a2 * Math.sin(2 * Math.PI * o.f2 * u + o.p2)),
            y: y0 + queda * u
          });
        }
        // 2) o maior fator que ainda cabe. É por rastro, não geral: assim só
        //    quem está apertado contra a margem perde movimento.
        var k = 1;
        for (var b = 0; b < bruto.length; b++) {
          var pt = bruto[b];
          if (pt.s > 0.01) k = Math.min(k, (limDir - pt.base) / pt.s);
          else if (pt.s < -0.01) k = Math.min(k, (pt.base - limEsq) / -pt.s);
        }
        if (!(k > 0)) k = 0;

        var pts = bruto.map(function (p) { return [p.base + k * p.s, p.y]; });
        var tr = trilhas[t];

        /* Um path por rastro, de novo. Os quatro pedaços da versão anterior
           existiam só para encolher o retângulo invalidado da camada do SVG;
           no canvas não há retângulo invalidado, então o corte perdeu a razão
           de ser — e com ele foram embora as emendas de antialiasing entre
           pedaços e o desvio de posição da cabeça que vinha de somar os
           comprimentos pedaço a pedaço. O traçado volta a ser o original. */
        var ds = suaviza(pts);
        tr.regua.setAttribute('d', ds);
        tr.forma = new Path2D(ds);
        tr.L = tr.regua.getTotalLength();
        tr.cabeca = Math.min(240, tr.L * 0.06);
        tr.y0 = y0;
        tr.y1 = alvo.y;

        /* A moldura é medida contra o CARD, não contra a página: a caixa dela
           só depende de onde a foto está dentro do próprio card, que é
           imune a rolagem. posLayout nos dois lados porque ele ignora
           transform — e a esta altura o card pode estar no meio da revelação
           de entrada, deslocado para baixo. */
        var m = molduras[t];
        var f = MOLDURA_FOLGA;
        var raio = 14 + f;   // concêntrico com o --r-md da foto
        var pc = posLayout(m.card), pf = posLayout(m.foto);
        /* A POSIÇÃO sai do posLayout, que ignora transform — senão um refresh
           que caísse no meio da revelação de entrada, ou com o cursor sobre o
           card, gravaria o deslocamento como se fosse layout.

           O TAMANHO sai do rect, que tem casas decimais. offsetWidth e
           offsetHeight arredondam, e a foto tem altura fracionária no desktop:
           o arredondamento deixava a moldura 0,47px curta embaixo. Translação
           não mexe em largura nem altura, então aqui o rect é seguro. */
        var cf = m.foto.getBoundingClientRect();
        var mw = cf.width + f * 2, mh = cf.height + f * 2;
        m.w = mw + 2; m.h = mh + 2;              // +1px de sobra de cada lado
        m.tela.style.left = (pf.x - pc.x - f - 1) + 'px';
        m.tela.style.top = (pf.y - pc.y - f - 1) + 'px';
        m.tela.style.width = m.w + 'px';
        m.tela.style.height = m.h + 'px';
        m.tela.width = Math.round(m.w * DPR);
        m.tela.height = Math.round(m.h * DPR);
        var dEsq = meiaMoldura(1, 1, mw, mh, raio, false);
        var dDir = meiaMoldura(1, 1, mw, mh, raio, true);
        m.regua.setAttribute('d', dEsq);
        m.esq = new Path2D(dEsq);
        m.dir = new Path2D(dDir);
        m.L = m.regua.getTotalLength();
        /* O comprimento mudou e escrever width/height já apagou a tela, então
           o desenho tem de sair de novo com o progresso atual. */
        aplicaMoldura(progMoldura);
      }

      pintado = null;   // a geometria mudou: o próximo quadro redesenha
    }

    /* ------------------------------------------------------------------
       A TELA E O QUADRO
       ------------------------------------------------------------------ */

    /* Três é o teto de propósito. A tela é 375x812 CSS; a 3x isso são 2,7
       milhões de pixels e 11 MB de textura, que é o que um celular moderno
       já usa para a própria janela. Acima disso a memória cresce sem que se
       enxergue diferença num traço de 1px com 34% de opacidade. */
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var largTela = 0, altTela = 0;

    function dimensionaTela() {
      var l = caixa.clientWidth || window.innerWidth;
      var a = window.innerHeight;
      if (l === largTela && a === altTela) return;
      largTela = l; altTela = a;
      tela.width = Math.round(l * DPR);
      tela.height = Math.round(a * DPR);
      tela.style.width = l + 'px';
      tela.style.height = a + 'px';
      pintado = null;
      telaVazia = true;    // escrever width/height já apaga o canvas
    }

    /* Topo da janela em coordenada de CONTEÚDO.

       Com o ScrollSmoother ligado, o que está à vista não é window.scrollY: o
       plugin desloca #smooth-content por transform e esse transform persegue a
       rolagem real com atraso. gsap.getProperty lê o valor que o próprio GSAP
       acabou de escrever, sem forçar layout. Sem smoother os dois são a mesma
       coisa. */
    var alvoSuave = null;
    function topoConteudo() {
      if (smoother) {
        if (!alvoSuave) alvoSuave = document.querySelector('#smooth-content');
        if (alvoSuave) return -(parseFloat(window.gsap.getProperty(alvoSuave, 'y')) || 0);
      }
      return window.scrollY;
    }

    var origemY = 0;
    var pintado = null;      // assinatura do último quadro desenhado
    var telaVazia = true;    // nada desenhado: dá para pular o quadro inteiro
    var progRastro = 0, progMoldura = 0;

    function faixaVisivel(a, b, topo) {
      return b >= topo - 40 && a <= topo + altTela + 40;
    }

    /* Um quadro inteiro: limpa, desenha os rastros até a cabeça e tira os
       buracos. Só isso — a moldura saiu daqui e vive no card, ver acima. */
    function quadro() {
      if (!largTela) return;
      var janela = topoConteudo();
      var topo = janela - origemY;      // o mesmo, em coordenada do container
      var chave = topo + '|' + progRastro;
      if (chave === pintado) return;
      pintado = chave;

      /* Só com o smoother a tela precisa ser movida à mão: o position:fixed
         dela passa a se referir ao #smooth-content transformado, e não à
         janela. Sem smoother — o caso do celular — o navegador já a mantém
         colada, e nenhum transform é escrito por quadro. */
      if (smoother) tela.style.transform = 'translate3d(0,' + janela + 'px,0)';

      var n, tr, vis, temRastro = false;
      var halo = ESTILOS.rastro__halo, linha = ESTILOS.rastro__linha;
      var ponta = ESTILOS.rastro__ponta;

      /* Primeiro decidir, depois tocar na tela. Boa parte da página não tem
         rastro à vista — antes do início, depois da chegada, e os trechos em
         que a máscara o dissolve por inteiro. Nesses quadros, se a tela já
         está limpa, não há limpeza nem entrega ao compositor: o quadro sai
         daqui sem custo nenhum. */
      for (n = 0; n < trilhas.length; n++) {
        tr = trilhas[n];
        tr.mostra = false;
        if (!tr.forma || !tr.L) continue;
        vis = tr.L * progRastro;
        if (vis <= 0) continue;
        // o desenhado vai da partida até a cabeça; se essa faixa não cruza a
        // janela, não há o que rasterizar
        var yCab = tr.y0 + (tr.y1 - tr.y0) * (vis / tr.L);
        if (!faixaVisivel(tr.y0, yCab, topo)) continue;
        tr.mostra = true; temRastro = true;
      }
      if (!temRastro && telaVazia) return;

      cx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cx.clearRect(0, 0, largTela, altTela);
      cx.translate(0, -topo);          // daqui para baixo, coordenada do container
      telaVazia = !temRastro;

      cx.strokeStyle = linha.cor;
      cx.lineCap = linha.tampa;
      cx.lineJoin = 'round';

      for (n = 0; n < trilhas.length; n++) {
        tr = trilhas[n];
        if (!tr.mostra) continue;
        vis = tr.L * progRastro;

        cx.setLineDash([tr.L, tr.L]);
        cx.lineDashOffset = tr.L - vis;
        cx.globalAlpha = halo.a;  cx.lineWidth = halo.w;  cx.stroke(tr.forma);
        cx.globalAlpha = linha.a; cx.lineWidth = linha.w; cx.stroke(tr.forma);

        // a cabeça: trecho curto e mais forte que anda na frente
        cx.setLineDash([tr.cabeca, tr.L + tr.cabeca]);
        cx.lineDashOffset = tr.cabeca - vis;
        cx.globalAlpha = ponta.a; cx.lineWidth = ponta.w; cx.stroke(tr.forma);
      }
      cx.setLineDash([]);

      /* Os buracos só entram se houver rastro na janela para dissolver, e só
         os que cruzam a janela. No SVG o filtro tinha de cobrir a página
         inteira, porque a região dele era a do elemento; aqui cada buraco já
         chega borrado e o quadro só o estampa. */
      if (temRastro && buracos.length) {
        /* A coluna pinada é remedida aqui, e não num ticker separado: assim
           ela é lida no mesmo quadro em que o buraco vai ser usado, depois de
           o ScrollTrigger já ter aplicado o pin. Antes isso era um gatilho só
           para ligar e desligar um ticker, e o buraco saía um quadro atrás —
           até 326px fora do lugar. Um gatilho a menos, e sem atraso. */
        if (moveis.length) atualizaMoveis();
        cx.globalAlpha = 1;
        cx.globalCompositeOperation = 'destination-out';
        var M = MARGEM_BORRAO;
        for (n = 0; n < buracos.length; n++) {
          var b = buracos[n];
          if (!faixaVisivel(b.y - M, b.y + b.h + M, topo)) continue;
          cx.drawImage(b.selo, b.x - M, b.y - M, b.selo.width, b.selo.height);
        }
        cx.globalCompositeOperation = 'source-over';
      }

      cx.globalAlpha = 1;
    }

    /* O que antes eram nove escritas de estilo por quadro, cada uma
       invalidando a camada de página inteira, virou guardar um número. Quem
       decide se há trabalho a fazer é o quadro(), comparando a assinatura
       (topo da janela + o progresso) com a do último desenho. */
    function aplicaRastro(p) { progRastro = p; }

    /* Cada moldura na sua tela. Só roda durante o 1,5s da entrada; depois
       ninguém mais toca em nenhuma delas. */
    function aplicaMoldura(p) {
      progMoldura = p;
      var e = ESTILOS.moldura__lado;
      for (var n = 0; n < molduras.length; n++) {
        var m = molduras[n];
        if (!m.esq || !m.L) continue;
        var c = m.cx;
        c.setTransform(DPR, 0, 0, DPR, 0, 0);
        c.clearRect(0, 0, m.w, m.h);
        if (p <= 0) continue;
        c.strokeStyle = e.cor;
        c.lineCap = e.tampa;
        c.lineJoin = 'round';
        c.globalAlpha = e.a;
        c.lineWidth = e.w;
        c.setLineDash([m.L, m.L]);
        c.lineDashOffset = m.L * (1 - p);
        c.stroke(m.esq); c.stroke(m.dir);
      }
    }

    desenha();
    caixa.classList.add('rastros--pronto');

    /* A tela acompanha a janela, então o quadro() precisa rodar sempre que a
       rolagem anda — inclusive com movimento reduzido, quando o desenho está
       parado mas a tela continua tendo de se reposicionar. Com o GSAP na mão,
       o ticker dele; sem GSAP, um rAF represado no evento de rolagem. */
    var pendente = false;
    function agenda() {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(function () { pendente = false; quadro(); });
    }
    function ligaLaco() {
      if (window.gsap) window.gsap.ticker.add(quadro);
      else window.addEventListener('scroll', agenda, { passive: true });
      quadro();
    }
    window.addEventListener('resize', function () { dimensionaTela(); agenda(); });

    if (!animate) {          // movimento reduzido: fica desenhado e parado
      aplicaRastro(1);
      aplicaMoldura(1);
      ligaLaco();
      return;
    }

    aplicaRastro(0);
    aplicaMoldura(0);

    var gsap = window.gsap;
    var eRastro = { p: 0 }, eMoldura = { p: 0 };

    gsap.to(eRastro, {
      p: 1,
      ease: 'none',
      onUpdate: function () { aplicaRastro(eRastro.p); },
      scrollTrigger: {
        // "metade do painel": começa quando o meio dele encosta no topo da
        // janela, que é o instante em que o usuário desceu metade da altura.
        trigger: painel,
        start: 'center top',
        endTrigger: fotos[0],
        end: 'top 60%',
        scrub: 0.8,
        invalidateOnRefresh: true
      }
    });

    /* A moldura não é presa à rolagem: assim que o rastro encosta na foto ela
       se desenha sozinha, no próprio tempo. Se dependesse do scroll, quem
       parasse de rolar exatamente no ponto de chegada veria a borda pela
       metade e não entenderia que faltava continuar descendo. */
    window.ScrollTrigger.create({
      trigger: fotos[0],
      start: 'top 60%',        // o mesmo ponto em que o rastro termina
      once: true,
      onEnter: function () {
        gsap.to(eMoldura, {
          p: 1,
          duration: 1.5,
          ease: 'power2.inOut',
          onUpdate: function () { aplicaMoldura(eMoldura.p); }
        });
      }
    });

    /* O gatilho que ligava e desligava um ticker para remedir a coluna pinada
       saiu daqui: a remedição passou para dentro do quadro(), que já sabe se
       há buraco a desenhar naquele instante. */

    ligaLaco();
    window.ScrollTrigger.addEventListener('refresh', desenha);
  }

  /* ======================================================================
     10. BOOT
     ====================================================================== */
  function init() {
    initSmoothScroll();
    initAnchors();
    initHeader();
    initMenu();
    initAcordeao();
    initAno();
    initContadores();
    initBrilhoCursor();   // independe do GSAP e de prefers-reduced-motion
    initCarrossel();      // só monta a fita; quem anda é o CSS
    initAnimacoesEmCena(); // depois do initCarrossel: as fitas já existem
    initRastros();        // desenha sempre; a rolagem só comanda se animate

    if (!animate) return;

    /* As revelações não aparecem nesta lista: já rodaram, no <script> que o
       index.html traz antes das tags do GSAP (ver a seção 6c/7 acima). */
    window.gsap.registerPlugin(window.ScrollTrigger);
    initParallax();
    initColunasFixas();

    // Fontes e imagens mudam a altura da página depois da primeira medição.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); });
    }
    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  }

  init();
})();
