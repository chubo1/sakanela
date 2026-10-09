import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { $$ } from '../core/dom.js';
import { debounce, on } from '../core/events.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const DURATION = 0.8;
const EASE = 'power4.out';
const STAGGER = 0.1;
const SCROLL_START = 'top 85%';
const RESIZE_WAIT = 200;

/**
 * Major editorial text across the multi-page site.
 * Extra blocks can be opted in with [data-line-reveal].
 */
const DEFAULT_SELECTOR = [
  'main h1',
  'main h2:not(.architecture__title):not(.lifestyle__title):not(.appartments__title):not(.amenities__title):not(.safety__title)',
  'main h3:not(.living-card__title)',
  'main p:not(.field__error):not(.field__hint):not(.form__status):not(.architecture__counter):not(.details__value)',
  'main .architecture__title-lead',
  'main .architecture__title-accent',
  'main .lifestyle__title-lead',
  'main .lifestyle__title-accent',
  'main .appartments__title-lead',
  'main .appartments__title-accent',
  'main .amenities__title-line',
  'main .safety__title-line',
  'main .location__places',
  '.site-footer__title',
  '.site-footer__item',
  '.site-footer__heading',
  '.site-footer__list a',
  '.site-footer__bar p',
  '[data-line-reveal]',
].join(', ');

const prepared = new WeakSet();

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function waitForFonts() {
  if (document.fonts?.ready) {
    return document.fonts.ready.catch(() => undefined);
  }

  return Promise.resolve();
}

function whenPageIsRevealed() {
  if (
    !document.querySelector('[data-site-loader]') ||
    document.documentElement.classList.contains('is-loader-done')
  ) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const settle = () => resolve();
    document.addEventListener('sakanela:loaderleave', settle, { once: true });
    document.addEventListener('sakanela:loaderdone', settle, { once: true });
  });
}

function shouldPlayImmediately(el) {
  return el.dataset.lineReveal === 'hero' || Boolean(el.closest('.hero, .page-hero'));
}

function collectTargets(selector) {
  const matches = $$(selector).filter((el) => {
    if (prepared.has(el)) {
      return false;
    }

    if (el.closest('.living-carousel, form, .site-nav, .modal, .cookie-banner')) {
      return false;
    }

    return Boolean(el.textContent.trim());
  });

  const pool = new Set(matches);

  return matches.filter((el) => {
    let parent = el.parentElement;

    while (parent) {
      if (pool.has(parent)) {
        return false;
      }

      parent = parent.parentElement;
    }

    return true;
  });
}

function needsClipWrap(el) {
  return el.matches('a, .site-footer__item');
}

function wrapClipLines(el) {
  const tag = el.matches('.site-footer__item') ? 'div' : 'span';
  const mask = document.createElement(tag);
  mask.className = 'line-reveal__line-mask';
  mask.style.display = 'block';
  mask.style.overflow = 'hidden';

  const line = document.createElement(tag);
  line.className = 'line-reveal__line';
  line.style.display = 'block';

  while (el.firstChild) {
    line.appendChild(el.firstChild);
  }

  mask.appendChild(line);
  el.appendChild(mask);

  return [line];
}

function unwrapClipLines(el) {
  const mask = el.querySelector(':scope > .line-reveal__line-mask');

  if (!mask) {
    return;
  }

  const line = mask.querySelector(':scope > .line-reveal__line') ?? mask;

  while (line.firstChild) {
    el.insertBefore(line.firstChild, mask);
  }

  mask.remove();
}

function splitElement(el) {
  if (needsClipWrap(el)) {
    const lines = wrapClipLines(el);

    return {
      lines,
      revert() {
        unwrapClipLines(el);
      },
    };
  }

  return SplitText.create(el, {
    type: 'lines',
    linesClass: 'line-reveal__line',
    mask: 'lines',
    aria: 'auto',
  });
}

function playLines(lines) {
  return gsap.to(lines, {
    yPercent: 0,
    duration: DURATION,
    ease: EASE,
    stagger: STAGGER,
    overwrite: true,
  });
}

function createItem(el) {
  const item = {
    el,
    split: null,
    trigger: null,
    tween: null,
    played: false,
    immediate: shouldPlayImmediately(el),
  };

  const play = () => {
    if (item.played || !item.split?.lines?.length) {
      return;
    }

    item.played = true;
    item.tween = playLines(item.split.lines);
  };

  const applySplit = (restorePlayed) => {
    item.split = splitElement(el);

    if (!item.split?.lines?.length) {
      item.split?.revert();
      item.split = null;
      return;
    }

    if (restorePlayed) {
      gsap.set(item.split.lines, { yPercent: 0 });
      return;
    }

    gsap.set(item.split.lines, { yPercent: 100 });

    if (item.immediate) {
      return;
    }

    item.trigger = ScrollTrigger.create({
      trigger: el.closest('.site-footer') ?? el,
      start: SCROLL_START,
      once: true,
      onEnter: play,
    });
  };

  const teardown = () => {
    item.trigger?.kill();
    item.trigger = null;
    item.tween?.kill();
    item.tween = null;
    item.split?.revert();
    item.split = null;
  };

  item.play = play;
  item.applySplit = applySplit;
  item.teardown = teardown;

  return item;
}

function markTargets(targets) {
  targets.forEach((el) => {
    prepared.add(el);
    el.classList.add('is-line-reveal');
    el.closest('[data-animate]')?.classList.add('is-line-reveal-host');
  });
}

/**
 * Line-by-line clip reveal. Call with any selector to opt a text block in.
 * Hero copy (`.hero`, `.page-hero`, or `[data-line-reveal="hero"]`) plays on load.
 *
 * @param {string} [selector]
 */
export function initLineReveal(selector = DEFAULT_SELECTOR) {
  const targets = collectTargets(selector);

  if (!targets.length) {
    return undefined;
  }

  markTargets(targets);

  if (prefersReducedMotion()) {
    targets.forEach((el) => el.classList.add('is-line-reveal-ready'));
    return undefined;
  }

  const items = targets.map(createItem);
  let ready = false;

  const setup = async () => {
    await waitForFonts();

    items.forEach((item) => {
      item.applySplit(false);
      item.el.classList.add('is-line-reveal-ready');
    });

    ready = true;
    await whenPageIsRevealed();
    items.filter((item) => item.immediate).forEach((item) => item.play());
    ScrollTrigger.refresh();
  };

  const resplit = debounce(() => {
    if (!ready) {
      return;
    }

    items.forEach((item) => {
      const restorePlayed = item.played || Boolean(item.tween?.isActive());
      item.played = restorePlayed;
      item.teardown();
      item.applySplit(restorePlayed);
    });

    ScrollTrigger.refresh();
  }, RESIZE_WAIT);

  setup();
  on(window, 'resize', resplit);

  return items;
}
