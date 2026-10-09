// eslint-disable-next-line import/no-extraneous-dependencies
import gsap from 'gsap';
import { $ } from '../core/dom.js';
import { on } from '../core/events.js';
// Vite raw import — the SVG is parsed and masked at runtime.
// eslint-disable-next-line import/no-unresolved, import/extensions
import logoMarkup from '../../assets/images/en_logo.svg?raw';

const SVG_NS = 'http://www.w3.org/2000/svg';
const INTRO_DURATION = 1;
const INTRO_EASE = 'circ.inOut';
const AFTER_INTRO = 0.8;
const EXIT_FALLBACK_MS = 1600;
const DISMISS_DURATION = 0.6;
const LOGO_VIEWBOX = '0 0 218.96 28.12';
const MASK_PAD = 1.2;
const X_TRAVEL = 18;
const Y_TRAVEL = 70;
const SUBTITLE_TRAVEL = 36;
const DIRECTION_CYCLE = [{ x: X_TRAVEL }, { y: -Y_TRAVEL }, { x: -X_TRAVEL }, { y: Y_TRAVEL }];

let introTween = null;
let loaderTemplate = '';
let maskUid = 0;
let dismissing = null;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function finish(loader) {
  document.documentElement.classList.remove('is-loading');
  document.documentElement.classList.add('is-loader-done');
  document.body.classList.remove('is-loading');
  loader.remove();
  document.dispatchEvent(new CustomEvent('sakanela:loaderdone'));
}

function playExit(loader) {
  const right = $('[data-loader-panel="right"]', loader);

  loader.classList.add('is-leaving');
  loader.setAttribute('aria-busy', 'false');
  loader.setAttribute('aria-hidden', 'true');
  document.dispatchEvent(new CustomEvent('sakanela:loaderleave'));

  let settled = false;
  const settle = () => {
    if (settled) {
      return;
    }
    settled = true;
    finish(loader);
  };

  if (right) {
    on(right, 'transitionend', (event) => {
      if (event.propertyName === 'transform') {
        settle();
      }
    });
  }

  window.setTimeout(settle, EXIT_FALLBACK_MS);
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, String(value));
  });
  return el;
}

function pathStartX(el) {
  const d = el.getAttribute('d') || '';
  const match = d.match(/^[Mm]\s*(-?\d*\.?\d+)/);
  return match ? Number(match[1]) : 0;
}

function unionBox(nodes) {
  return nodes.reduce((acc, node) => {
    const box = node.getBBox();
    if (!acc) {
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }

    const right = Math.max(acc.x + acc.width, box.x + box.width);
    const bottom = Math.max(acc.y + acc.height, box.y + box.height);
    const x = Math.min(acc.x, box.x);
    const y = Math.min(acc.y, box.y);
    return { x, y, width: right - x, height: bottom - y };
  }, null);
}

function paddedBox(box, padX = MASK_PAD, padY = MASK_PAD) {
  return {
    x: box.x - padX,
    y: box.y - padY,
    width: box.width + padX * 2,
    height: box.height + padY * 2,
  };
}

function parseLogoSource() {
  const parsed = new DOMParser().parseFromString(logoMarkup, 'image/svg+xml');
  const source = parsed.documentElement;

  if (!source || parsed.querySelector('parsererror')) {
    throw new Error('Could not parse loader logo SVG');
  }

  return source;
}

function decorateSvg(svg) {
  svg.classList.add('site-loader__logo');
  svg.removeAttribute('id');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Sakanela by Silk Development');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('viewBox', LOGO_VIEWBOX);
  svg.setAttribute('overflow', 'hidden');
  svg.setAttribute('focusable', 'false');
}

function addMaskRect(defs, index, box) {
  const id = `loader-mask-${maskUid}-${index}`;
  const mask = svgEl('mask', { id, maskUnits: 'userSpaceOnUse' });
  const rect = svgEl('rect', {
    class: `logo-rect${index}`,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    fill: '#fff',
  });
  mask.appendChild(rect);
  defs.appendChild(mask);
  return { id, rect };
}

function applyMasks(svg) {
  maskUid += 1;

  const letters = [...svg.querySelectorAll('.st0')].sort((a, b) => pathStartX(a) - pathStartX(b));
  const subtitleNodes = [...svg.querySelectorAll('.st1')];
  const letterBoxes = letters.map((letter) => letter.getBBox());
  const wordmarkBottom = Math.max(...letterBoxes.map((box) => box.y + box.height), 0);
  const wordmarkSlot = { y: 0, height: wordmarkBottom + MASK_PAD };

  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = svgEl('defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  const pieces = [];
  const rects = [];

  letters.forEach((letter, index) => {
    const slot = paddedBox(letterBoxes[index]);
    const { id, rect } = addMaskRect(defs, index, {
      x: slot.x,
      y: wordmarkSlot.y,
      width: slot.width,
      height: wordmarkSlot.height,
    });
    letter.setAttribute('mask', `url(#${id})`);
    letter.classList.add(`logo-path${index}`);
    pieces.push(letter);
    rects.push(rect);
  });

  if (subtitleNodes.length) {
    const slot = paddedBox(unionBox(subtitleNodes), MASK_PAD, MASK_PAD + 0.6);
    const { id, rect } = addMaskRect(defs, letters.length, slot);
    subtitleNodes.forEach((node) => {
      node.setAttribute('mask', `url(#${id})`);
      node.classList.add(`logo-path${letters.length}`);
    });
    pieces.push(subtitleNodes);
    rects.push(rect);
  }

  return { pieces, rects };
}

function directionFor(index, isSubtitle) {
  if (isSubtitle) {
    return { y: SUBTITLE_TRAVEL };
  }

  return DIRECTION_CYCLE[index % DIRECTION_CYCLE.length];
}

function mountLogo(loader) {
  const brand = $('[data-loader-brand]', loader);

  if (!brand) {
    return null;
  }

  const svg = document.importNode(parseLogoSource(), true);
  decorateSvg(svg);
  brand.replaceChildren(svg);
  svg.getBoundingClientRect();

  const { pieces, rects } = applyMasks(svg);
  return { svg, pieces, rects };
}

function killIntro() {
  if (introTween) {
    introTween.kill();
    introTween = null;
  }
}

function addPieceFrom(timeline, rect, piece, vars, index) {
  if (index === 0) {
    timeline.from(rect, vars);
    timeline.from(piece, vars, 0);
    return;
  }

  timeline.from(rect, vars, '<=5%');
  timeline.from(piece, vars, '<=0%');
}

/**
 * Plays the logo intro on a loader node. Call again to replay from the start.
 * Returns the GSAP timeline so it can be `.restart()`ed or chained.
 */
export function playLoaderIntro(loader, { exit = false } = {}) {
  const target = loader || $('[data-site-loader]');

  if (!target) {
    return null;
  }

  const mounted = mountLogo(target);

  if (!mounted) {
    if (exit) {
      playExit(target);
    }
    return null;
  }

  killIntro();
  target.classList.remove('is-leaving');

  const { svg, pieces, rects } = mounted;

  gsap.set(svg, { autoAlpha: 1 });
  svg.classList.add('is-ready');

  const tl = gsap.timeline({
    defaults: { ease: INTRO_EASE, duration: INTRO_DURATION },
  });

  pieces.forEach((piece, index) => {
    const isSubtitle = Array.isArray(piece);
    addPieceFrom(tl, rects[index], piece, directionFor(index, isSubtitle), index);
  });

  if (exit) {
    tl.add(() => playExit(target), `+=${AFTER_INTRO}`);
  }

  introTween = tl;
  return tl;
}

/**
 * Fades the preloader out and releases the page. Used by the hero sequence
 * once every frame is decoded. Safe to call more than once.
 */
export function dismissLoader() {
  if (dismissing) {
    return dismissing;
  }

  const loader = $('[data-site-loader]');
  killIntro();

  if (!loader) {
    if (!document.documentElement.classList.contains('is-loader-done')) {
      document.documentElement.classList.remove('is-loading');
      document.documentElement.classList.add('is-loader-done');
      document.body.classList.remove('is-loading');
      document.dispatchEvent(new CustomEvent('sakanela:loaderdone'));
    }
    dismissing = Promise.resolve();
    return dismissing;
  }

  dismissing = new Promise((resolve) => {
    gsap.to(loader, {
      autoAlpha: 0,
      duration: DISMISS_DURATION,
      ease: 'power2.out',
      onComplete: () => {
        finish(loader);
        resolve();
      },
    });
  });

  return dismissing;
}

function resetPageForLoader() {
  document.documentElement.classList.remove('is-loader-done');
  document.documentElement.classList.add('is-loading');
  document.body.classList.add('is-loading');
}

/**
 * Remounts the preloader and replays the full sequence (logo, then panels).
 * Exposed on `window.playSakanelaLoader` for console / replay-button testing.
 */
export function replayLoader() {
  killIntro();
  resetPageForLoader();

  const existing = $('[data-site-loader]');
  if (existing) {
    existing.remove();
  }

  if (!loaderTemplate) {
    return null;
  }

  document.body.insertAdjacentHTML('afterbegin', loaderTemplate);
  const loader = $('[data-site-loader]');
  loader.setAttribute('aria-busy', 'true');
  loader.setAttribute('aria-hidden', 'false');
  return playLoaderIntro(loader, { exit: true });
}

export function initLoader() {
  const loader = $('[data-site-loader]');

  if (!loader) {
    document.documentElement.classList.remove('is-loading');
    return;
  }

  loaderTemplate = loader.outerHTML;
  globalThis.playSakanelaLoader = replayLoader;

  if (prefersReducedMotion()) {
    finish(loader);
    return;
  }

  document.documentElement.classList.add('is-loading');
  document.body.classList.add('is-loading');
  loader.setAttribute('aria-busy', 'true');
  loader.setAttribute('aria-hidden', 'false');

  // Home keeps the loader up until the hero sequence has decoded every frame.
  const waitForHero = Boolean($('[data-hero-sequence]'));
  playLoaderIntro(loader, { exit: !waitForHero });
}
