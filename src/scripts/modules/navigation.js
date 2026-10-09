import { $, $$ } from '../core/dom.js';
import { on, throttle } from '../core/events.js';
import { getLenis } from './smoothScroll.js';

const STICKY_OFFSET = 8;

function pathToPage(pathname) {
  const file = pathname.split('/').pop();

  if (!file || file === 'index.html') {
    return 'index.html';
  }

  return file;
}

function setActiveLinks() {
  const current = pathToPage(window.location.pathname);

  $$('[data-nav-link]').forEach((link) => {
    const href = pathToPage(link.getAttribute('href') || '');
    link.classList.toggle('is-active', href === current);
    if (href === current) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function setYear() {
  $$('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}

export function initNavigation() {
  const header = $('[data-header]');
  const toggle = $('[data-nav-toggle]');
  const nav = $('[data-nav]');

  setActiveLinks();
  setYear();

  if (header) {
    const heroTrack = $('[data-hero-track]');

    // On home the header stays transparent until the hero frame sequence has finished.
    const stickyOffset = () => {
      if (!heroTrack) {
        return STICKY_OFFSET;
      }

      const sequenceEnd =
        heroTrack.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
      return Math.max(STICKY_OFFSET, sequenceEnd);
    };

    const onScroll = throttle(() => {
      header.classList.toggle('is-stuck', window.scrollY > stickyOffset());
    }, 80);

    on(window, 'scroll', onScroll, { passive: true });
    onScroll();
  }

  if (!toggle || !nav) {
    return;
  }

  let closeTimer = 0;

  const finishClose = () => {
    nav.classList.remove('is-closing');
    window.clearTimeout(closeTimer);
    closeTimer = 0;
  };

  const lockScroll = (lock) => {
    document.documentElement.classList.toggle('is-nav-open', lock);
    document.body.classList.toggle('is-nav-open', lock);

    const lenis = getLenis();

    if (!lenis) {
      return;
    }

    if (lock) {
      lenis.stop();
      return;
    }

    lenis.start();
  };

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    lockScroll(open);

    if (open) {
      finishClose();
      nav.classList.add('is-open');
      return;
    }

    if (!nav.classList.contains('is-open') && !nav.classList.contains('is-closing')) {
      return;
    }

    nav.classList.remove('is-open');
    nav.classList.add('is-closing');

    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(finishClose, 560);
  };

  on(nav, 'transitionend', (event) => {
    if (event.target === nav && event.propertyName === 'transform' && nav.classList.contains('is-closing')) {
      finishClose();
    }
  });

  on(toggle, 'click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
  });

  on(nav, 'click', (event) => {
    if (event.target.closest('a')) {
      setOpen(false);
    }
  });

  on(document, 'keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });
}
