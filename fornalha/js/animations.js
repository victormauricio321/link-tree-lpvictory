/* ============================================================================
   animations.js — revelação ao scroll
   ----------------------------------------------------------------------------
   Dois níveis (ver global.css §6):
     a) sem JS ............... conteúdo visível
     b) IntersectionObserver . UM observer para a página inteira, disparo único

   "Sem JS" inclui o JS que não chegou: file://, 404 ou exceção no init. O CSS
   esconde sob `html.js`, então o caminho de falha precisa devolver `no-js` —
   feito pelo `onerror` do <script type="module"> e pelo try/catch de main.js.
   Ver a armadilha documentada em global.css §6.

   O caminho por `animation-timeline: view()` foi removido: era bidirecional
   por natureza e desfazia a revelação no scroll de volta. A justificativa
   completa está em global.css §6.
   ============================================================================ */

import { qsa } from './utilities.js';

/**
 * Lê um token numérico de uma declaração JÁ resolvida. O ritmo do escalonamento
 * é decisão de design e mora em variables.css — repetir o número aqui criaria
 * duas fontes da mesma verdade, e uma delas ficaria para trás na primeira
 * mudança.
 *
 * Recebe a declaração em vez de chamar `getComputedStyle` por conta própria:
 * cada chamada obriga o navegador a resolver o estilo na hora, e havia duas
 * aqui. Medido no Lighthouse (CPU 4x mais lenta): 40ms de reflow forçado
 * apontando exatamente para esta linha.
 */
function token(estilo, nome, padrao) {
  const n = parseFloat(estilo.getPropertyValue(nome));
  return Number.isFinite(n) ? n : padrao;
}

/**
 * Aplica o atraso escalonado como custom property, para que a duração e a
 * curva continuem vindo dos tokens — o JS só decide o *quando*.
 */
function applyStagger() {
  // Uma leitura de estilo para os dois tokens, e nenhuma escrita antes dela:
  // ler-escrever-ler no mesmo laço é o que transforma um recálculo em vários.
  const raiz  = getComputedStyle(document.documentElement);
  const passo = token(raiz, '--stagger', 40);       // ms por item
  const teto  = token(raiz, '--stagger-max', 5);    // acima disso o último demora demais

  qsa('[data-reveal-group]').forEach((group) => {
    qsa('[data-reveal]', group).forEach((el, i) => {
      const step = Math.min(i, teto - 1);
      el.style.setProperty('--reveal-delay', `${step * passo}ms`);
    });
  });
}

export function initReveal() {
  const targets = qsa('[data-reveal]');
  if (!targets.length) return;

  // Depois do primeiro quadro: aí o navegador já resolveu o estilo para
  // pintar, e a leitura de token sai de graça em vez de forçar um recálculo
  // no meio do carregamento. Nada é perdido — o observer é assíncrono de
  // qualquer forma, e o CSS já entrega o estado inicial.
  requestAnimationFrame(applyStagger);

  // Um observer para todos os alvos. `prefers-reduced-motion` NÃO é consultado
  // aqui de propósito: o CSS já entrega o estado final sob a media query, e
  // desligar o observer deixaria o conteúdo preso em opacity:0 se o usuário
  // trocasse a preferência com a página aberta.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        // Revela UMA vez. Reanimar no scroll de volta irrita e gasta CPU.
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0 }
  );

  targets.forEach((el) => io.observe(el));
}
