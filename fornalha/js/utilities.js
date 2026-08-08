/* ============================================================================
   utilities.js — helpers reutilizáveis, sem estado global
   ============================================================================ */

export const qs  = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * Observa um elemento sentinela e avisa quando ele sai/entra na viewport.
 * Sentinela em vez de listener de `scroll`: o listener roda no main thread
 * dezenas de vezes por segundo e força leitura de layout (reflow).
 * @returns {() => void} função para desconectar
 */
export function watchSentinel(el, onChange, options = {}) {
  if (!el) return () => {};
  const io = new IntersectionObserver(
    ([entry]) => onChange(entry.isIntersecting, entry),
    options
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Trava o scroll do documento (menu aberto). */
export function lockScroll() {
  document.documentElement.classList.add('is-locked');
}

export function unlockScroll() {
  document.documentElement.classList.remove('is-locked');
}

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Mantém o Tab dentro de um contêiner enquanto ele estiver aberto.
 * Devolve a função de limpeza — quem abre é responsável por fechar.
 */
export function trapFocus(container) {
  if (!container) return () => {};

  const onKeydown = (e) => {
    if (e.key !== 'Tab') return;
    const items = qsa(FOCUSABLE, container).filter((el) => el.offsetParent !== null);
    if (!items.length) return;

    const first = items[0];
    const last  = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', onKeydown);
  return () => container.removeEventListener('keydown', onKeydown);
}
