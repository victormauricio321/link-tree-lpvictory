/* ============================================================================
   main.js — ponto de entrada
   ----------------------------------------------------------------------------
   Cada init é tolerante à ausência do seu alvo: as seções entram uma a uma,
   e um init que quebra derruba os seguintes.
   ============================================================================ */

import { qs, qsa, watchSentinel, lockScroll, unlockScroll, trapFocus } from './utilities.js';
import { initReveal } from './animations.js';

/* ----------------------------------------------------------------------------
   Header — ganha filete ao sair do topo.
   Detectado por sentinela de 1px, não por listener de scroll.
   ---------------------------------------------------------------------------- */
function initHeader() {
  const header   = qs('[data-header]');
  const sentinel = qs('[data-header-sentinel]');
  if (!header || !sentinel) return;

  watchSentinel(sentinel, (isAtTop) => {
    header.classList.toggle('is-scrolled', !isAtTop);
  });
}

/* ----------------------------------------------------------------------------
   Menu mobile
   Contrato de acessibilidade: aria-expanded · Esc fecha · foco entra no
   primeiro item · foco VOLTA ao botão ao fechar · Tab não escapa.
   ---------------------------------------------------------------------------- */
function initMenu() {
  const toggle = qs('[data-menu-toggle]');
  const panel  = qs('[data-menu-panel]');
  const scrim  = qs('[data-menu-scrim]');
  const main   = qs('#conteudo');
  if (!toggle || !panel) return;

  let releaseFocus = null;

  // Classe em vez de `hidden`: `visibility` já remove da ordem de tabulação e
  // da árvore de acessibilidade, e ainda permite animar por transform.
  const open = () => {
    toggle.setAttribute('aria-expanded', 'true');
    panel.classList.add('is-open');
    main?.toggleAttribute('inert', true);   // o resto da página sai do alcance
    lockScroll();
    releaseFocus = trapFocus(panel);
    qs('a, button', panel)?.focus();
    document.addEventListener('keydown', onKeydown);
  };

  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    main?.toggleAttribute('inert', false);
    unlockScroll();
    releaseFocus?.();
    releaseFocus = null;
    document.removeEventListener('keydown', onKeydown);
    toggle.focus();   // devolver o foco é o passo que quase todo mundo esquece
  };

  const onKeydown = (e) => { if (e.key === 'Escape') close(); };

  toggle.addEventListener('click', () => {
    toggle.getAttribute('aria-expanded') === 'true' ? close() : open();
  });

  scrim?.addEventListener('click', close);
  panel.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="#"]')) close();
  });
}

/* ----------------------------------------------------------------------------
   Barra CTA fixa (mobile) — DOIS gatilhos.
   Aparece quando o hero sai. Some quando o fechamento entra: sem o segundo
   gatilho, o usuário veria dois CTAs concorrentes na mesma tela exatamente
   no momento da conversão.
   ---------------------------------------------------------------------------- */
function initCtaBar() {
  const bar   = qs('[data-cta-bar]');
  const hero  = qs('[data-hero]');
  const final = qs('[data-final-cta]');
  if (!bar || !hero) return;

  let heroVisible  = true;
  let finalVisible = false;

  const sync = () => {
    bar.classList.toggle('is-visible', !heroVisible && !finalVisible);
  };

  watchSentinel(hero, (visible) => { heroVisible = visible; sync(); });
  if (final) watchSentinel(final, (visible) => { finalVisible = visible; sync(); });
}

/* ----------------------------------------------------------------------------
   CTA de plataforma de pedido — um componente, dois lugares, zero plataformas
   no código
   ----------------------------------------------------------------------------
   A configuração inteira mora nos `data-*` do <template> em index.html: nome,
   URL, ícone e rótulo opcional. Não há — e não pode haver — nenhum `if` por
   plataforma aqui. iFood, Goomer, Anota AI, Cardápio Web, Delivery Direto e
   plataforma própria são o mesmo caso: um nome e uma URL.

   Os pontos de uso são `[data-cta-slot]`, e o VALOR do atributo são os
   modificadores daquele lugar (`btn--sm site-header__cta` no header,
   `btn--block` na barra fixa). É isso que impede header e barra de divergirem:
   a marcação do botão existe uma vez só, no <template>, e o que muda entre os
   dois é uma lista de modificadores declarada no HTML, não outro trecho de
   marcação para alguém esquecer de atualizar.

   Sem URL, os slots são REMOVIDOS. Esconder por CSS deixaria um link para
   lugar nenhum na ordem de tabulação e na árvore de acessibilidade.
   ---------------------------------------------------------------------------- */
function initPlataforma() {
  const tpl   = qs('[data-cta-plataforma]');   // R4: ancorado no data-*
  const slots = qsa('[data-cta-slot]');
  if (!tpl || !slots.length) return;

  const {
    plataforma = '', url = '', icone = '#i-bag',
    rotulo = '', rotuloCurto = '',
  } = tpl.dataset;
  const destino = url.trim();

  // Não configurado: nenhum vestígio no DOM, nem o slot vazio.
  if (!destino) {
    slots.forEach((s) => s.remove());
    return;
  }

  const nome     = plataforma.trim();
  const completo = rotulo.trim() || `Ver no ${nome}`.trim();
  // Forma curta para lugares apertados. Em 320px a barra fixa divide ~129px
  // entre dois botões, e "Ver no Delivery Direto" quebrava em duas linhas —
  // medido. O nome sozinho cabe, e o ícone já diz que é para pedir.
  const curto    = rotuloCurto.trim() || nome || completo;

  slots.forEach((slot) => {
    const texto = slot.hasAttribute('data-cta-curto') ? curto : completo;
    const link  = tpl.content.firstElementChild.cloneNode(true);
    link.href = destino;
    // O aria-label usa SEMPRE a forma completa: quem ouve não tem o contexto
    // visual que torna o rótulo curto compreensível.
    link.setAttribute('aria-label', `${completo} (abre em nova aba)`);
    link.classList.add(...slot.dataset.ctaSlot.split(/\s+/).filter(Boolean));
    qs('use', link).setAttribute('href', icone);
    qs('[data-cta-rotulo]', link).textContent = texto;
    slot.replaceWith(link);
  });
}

/* ---------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // `initReveal` PRIMEIRO, e não por último: é o único init que decide se o
  // conteúdo aparece. Rodando depois, qualquer exceção nos outros três deixava
  // a página inteira presa em opacity:0 — falha muda, sem nada na tela.
  try {
    initReveal();
  } catch (erro) {
    // Sem observer, o estado oculto não pode continuar existindo. Devolver a
    // marca `no-js` é o mesmo caminho do navegador sem JS: tudo visível.
    document.documentElement.classList.replace('js', 'no-js');
    console.error('initReveal falhou — revelação desligada, conteúdo liberado.', erro);
  }

  // O resto é enriquecimento: se um quebrar, a página continua legível e
  // navegável. Isolar cada um é o que torna verdadeira a promessa do cabeçalho
  // deste arquivo.
  for (const init of [initHeader, initMenu, initCtaBar, initPlataforma]) {
    try { init(); } catch (erro) { console.error(`${init.name} falhou.`, erro); }
  }
});
