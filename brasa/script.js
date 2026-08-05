// Movimento (essência do crav): revelação na entrada + nav que some ao descer.
// ponytail: IntersectionObserver + CSS cobrem a revelação. O scrub amarrado ao
// scroll está em style.css via animation-timeline nativo — GSAP só se precisar
// de seção pinada ou timeline multi-passo.
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-in')),
  { threshold: 0.15, rootMargin: '0px 0px -10%' }
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Inércia de rolagem (o crav usa Lenis). Nativo não tem momentum de wheel, só
// scroll-behavior para âncoras — por isso a dependência de 3KB se justifica.
// Se o CDN cair, a página continua rolando normalmente.
if (window.Lenis && !reduced) {
  new Lenis({ autoRaf: true, anchors: true, duration: 1.1 });
}

// clicar no seletor de idioma grava a escolha e desliga a detecção automática
// da raiz para sempre — vontade explícita do usuário vence palpite do navegador.
document.querySelectorAll('.lang a').forEach((a) =>
  a.addEventListener('click', () => {
    try { localStorage.setItem('brasa-lang', a.getAttribute('hreflang').slice(0, 2)); } catch (e) {}
  })
);

const nav = document.querySelector('.nav');
const toggle = document.querySelector('.nav__toggle');

const setMenu = (open) => {
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
};

toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
nav.querySelectorAll('.nav__links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

// setas do cardápio: rolam uma carta por clique e sumem nas extremidades.
// ponytail: `disabled` já dá o estado semântico e o CSS faz o fade em cima dele —
// sem classe extra, e o leitor de tela anuncia o botão como indisponível.
const strip = document.querySelector('.strip');
if (strip) {
  const prev = document.querySelector('.strip__nav--prev');
  const next = document.querySelector('.strip__nav--next');
  const step = () => {
    const card = strip.querySelector('.card');
    return card.offsetWidth + (parseFloat(getComputedStyle(strip).columnGap) || 0);
  };
  const sync = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    prev.disabled = strip.scrollLeft <= 1;
    next.disabled = strip.scrollLeft >= max - 1;
  };
  prev.addEventListener('click', () => strip.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => strip.scrollBy({ left: step(), behavior: 'smooth' }));
  strip.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();
}

let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  // com o menu aberto a barra não pode fugir junto com o painel
  if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > 120 && y > lastY);
  lastY = y;
}, { passive: true });
