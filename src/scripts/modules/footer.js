import { $, $$ } from '../core/dom.js';
import { on } from '../core/events.js';
import { getLenis } from './smoothScroll.js';

const COOKIE_KEY = 'sakanela-cookie-consent';

function readConsent() {
  try {
    return window.localStorage.getItem(COOKIE_KEY);
  } catch {
    return null;
  }
}

function writeConsent(value) {
  try {
    window.localStorage.setItem(COOKIE_KEY, value);
  } catch {
    // Private mode or blocked storage should still close the banner.
  }
}

function initCookieBanner() {
  const banner = $('[data-cookie-banner]');

  if (!banner) {
    return;
  }

  if (!readConsent()) {
    banner.hidden = false;
  }

  const dismiss = (value) => {
    writeConsent(value);
    banner.hidden = true;
  };

  const accept = $('[data-cookie-accept]', banner);
  const decline = $('[data-cookie-decline]', banner);

  if (accept) {
    on(accept, 'click', () => dismiss('accepted'));
  }

  if (decline) {
    on(decline, 'click', () => dismiss('declined'));
  }
}

function scrollToTarget(target) {
  const lenis = getLenis();

  if (lenis) {
    lenis.scrollTo(target, { duration: 1.2 });
    return;
  }

  if (target === 0) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (target instanceof Element) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function initFooterLinks() {
  $$('.site-footer a[href^="#"]').forEach((link) => {
    on(link, 'click', (event) => {
      const hash = link.getAttribute('href');

      if (!hash || hash === '#') {
        return;
      }

      if (link.hasAttribute('data-back-to-top') || hash === '#top') {
        event.preventDefault();
        scrollToTarget(0);
        return;
      }

      const target = $(hash);

      if (!target) {
        return;
      }

      event.preventDefault();
      scrollToTarget(target);
    });
  });
}

export function initFooter() {
  initCookieBanner();
  initFooterLinks();
}
