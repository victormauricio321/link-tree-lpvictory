/* Casa na Lagoa · Saquarema — interações da landing page.
   Sem dependências. Cada bloco é independente e falha em silêncio. */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Camada de eventos ----------
   Só uma fila em memória. Não faz requisição de rede, não cria cookie e não
   grava nada em storage — por isso a página não precisa de banner de consentimento.

   Para plugar uma ferramenta depois, escolha um dos dois pontos:
     a) window.dataLayer  — o formato que GTM/GA4 já leem; basta carregar o script
        deles que os eventos acumulados até ali continuam na fila;
     b) document.addEventListener('casa:track', e => enviar(e.detail))  — para
        mandar a um endpoint próprio.
   Nada além disso precisa mudar neste arquivo. */
window.dataLayer = window.dataLayer || [];

function track(event, params = {}) {
  const detail = {
    event,
    ...params,
    device: innerWidth < 760 ? 'mobile' : innerWidth < 1100 ? 'tablet' : 'desktop',
  };
  window.dataLayer.push(detail);
  document.dispatchEvent(new CustomEvent('casa:track', { detail }));
}

/* Em que parte da página o elemento está — header/rodapé/barra fixa não são <section>. */
function sectionOf(el) {
  if (el.closest('.site-header')) return 'header';
  if (el.closest('.ctabar')) return 'barra-fixa-mobile';
  if (el.closest('.site-footer')) return 'rodape';
  const section = el.closest('section');
  return section ? (section.id || section.className.split(' ')[0]) : 'desconhecido';
}

/* Delegação: pega qualquer .js-book, inclusive os que forem adicionados depois. */
function initTracking() {
  document.addEventListener('click', (e) => {
    const cta = e.target.closest('.js-book');
    if (!cta) return;
    track('booking_click', {
      cta_text: cta.textContent.trim().replace(/\s+/g, ' '),
      cta_section: sectionOf(cta),
      destination: cta.href,
    });
  });

  // `toggle` não borbulha, então precisa ser por elemento.
  document.querySelectorAll('.faq details').forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) track('faq_open', { question: item.querySelector('summary')?.firstChild?.textContent?.trim() });
    });
  });
}

/* ---------- Header: muda de estado ao sair do hero ---------- */
function initHeader() {
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  if (!header || !hero) return;

  // O header fica "colado" assim que o hero deixa de cobrir o topo.
  new IntersectionObserver(
    ([entry]) => header.classList.toggle('is-stuck', !entry.isIntersecting),
    { rootMargin: '-72px 0px 0px 0px', threshold: 0 }
  ).observe(hero);
}

/* ---------- Reveal das seções ---------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const showAll = () => items.forEach((el) => el.classList.add('is-in'));

  if (REDUCED.matches || !('IntersectionObserver' in window)) { showAll(); return; }

  // Rede de segurança: o conteúdo começa em opacity 0, então se o observer nunca
  // entregar nada (aba em background, prerender, in-app browser), tudo aparece mesmo assim.
  let safety = setTimeout(showAll, 2000);

  const io = new IntersectionObserver((entries) => {
    clearTimeout(safety);
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      // stagger curto entre elementos que entram juntos
      entry.target.style.transitionDelay = `${Math.min(i, 4) * 60}ms`;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  items.forEach((el) => io.observe(el));
}

/* ---------- Lightbox da galeria ----------
   As miniaturas carregam variantes pequenas via srcset, então o lightbox monta a
   URL da versão grande a partir de data-base/data-full em vez de reusar currentSrc
   (que traria a miniatura borrada). */
function initLightbox() {
  const dialog = document.getElementById('lightbox');
  const shots = [...document.querySelectorAll('.js-shot')];
  if (!dialog || !shots.length || typeof dialog.showModal !== 'function') return;

  const srcAvif = document.getElementById('lb-avif');
  const srcWebp = document.getElementById('lb-webp');
  const imgEl = document.getElementById('lb-img');
  const capEl = document.getElementById('lb-caption');
  const curEl = document.getElementById('lb-current');
  const totEl = document.getElementById('lb-total');
  const btnPrev = document.getElementById('lb-prev');
  const btnNext = document.getElementById('lb-next');
  const btnClose = document.getElementById('lb-close');

  const photos = shots.map((btn) => {
    const stem = `${btn.dataset.base}-${btn.dataset.full}`;
    return { avif: `${stem}.avif`, webp: `${stem}.webp`, jpg: `${stem}.jpg`, alt: btn.querySelector('img').alt };
  });

  let index = 0;
  let opener = null;
  totEl.textContent = String(photos.length);

  function show(i) {
    index = (i + photos.length) % photos.length;
    const photo = photos[index];
    srcAvif.srcset = photo.avif;
    srcWebp.srcset = photo.webp;
    imgEl.src = photo.jpg;
    imgEl.alt = photo.alt;
    capEl.textContent = photo.alt;
    curEl.textContent = String(index + 1);
    preload(index + 1);
    preload(index - 1);
  }

  // <link rel=preload type=...> é ignorado pelo navegador que não suporta o formato,
  // então ninguém baixa bytes à toa.
  function preload(i) {
    const photo = photos[(i + photos.length) % photos.length];
    for (const [href, type] of [[photo.avif, 'image/avif'], [photo.webp, 'image/webp']]) {
      if (document.head.querySelector(`link[href="${href}"]`)) continue;
      const link = document.createElement('link');
      link.rel = 'preload'; link.as = 'image'; link.type = type; link.href = href;
      document.head.append(link);
    }
  }

  function open(i, trigger, source) {
    opener = trigger || null;
    show(i);
    dialog.showModal();
    track('gallery_open', { source, photo_index: index + 1, photo_total: photos.length });
  }

  shots.forEach((btn) => {
    btn.addEventListener('click', () => open(Number(btn.dataset.index) || 0, btn, 'foto'));
  });

  const openAll = document.querySelector('.js-open-gallery');
  if (openAll) openAll.addEventListener('click', () => open(0, openAll, 'botao-ver-todas'));

  btnPrev.addEventListener('click', () => show(index - 1));
  btnNext.addEventListener('click', () => show(index + 1));
  btnClose.addEventListener('click', () => dialog.close());

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
  });

  // clique fora da foto fecha
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.classList.contains('lightbox__stage')) dialog.close();
  });

  // devolve o foco para o botão que abriu (depois da restauração automática do <dialog>)
  dialog.addEventListener('close', () => {
    requestAnimationFrame(() => {
      if (opener && document.contains(opener)) opener.focus();
    });
  });

  // swipe horizontal no mobile
  let startX = null;
  dialog.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].clientX; }, { passive: true });
  dialog.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const delta = e.changedTouches[0].clientX - startX;
    if (Math.abs(delta) > 45) show(index + (delta < 0 ? 1 : -1));
    startX = null;
  }, { passive: true });
}

/* ---------- Barra de CTA fixa no mobile ----------
   Aparece depois do hero e some quando o CTA final entra em cena,
   para não competir com ele nem cobrir o botão principal. */
function initCtaBar() {
  const bar = document.getElementById('ctabar');
  const hero = document.querySelector('.hero');
  const final = document.getElementById('reservar');
  if (!bar || !hero || !final) return;

  bar.hidden = false;

  let pastHero = false;
  let atFinal = false;
  const sync = () => bar.classList.toggle('is-visible', pastHero && !atFinal);

  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); },
    { rootMargin: '-40% 0px 0px 0px' }).observe(hero);

  new IntersectionObserver(([e]) => { atFinal = e.isIntersecting; sync(); },
    { threshold: 0.12 }).observe(final);
}

/* ---------- init ---------- */
document.documentElement.classList.remove('no-js');
initHeader();
initReveal();
initLightbox();
initCtaBar();
initTracking();
