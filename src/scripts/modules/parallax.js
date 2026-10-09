import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$ } from '../core/dom.js';

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_SPEED = 0.5;
/** Fallback travel when the layer is not larger than its crop (decorative slabs). */
const FALLBACK_TRAVEL = 0.2;
/** Mild catch-up so motion eases with Lenis instead of locking 1:1 to the wheel. */
const SCRUB = 0.65;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readSpeed(el) {
  const raw = Number.parseFloat(el.dataset.parallaxSpeed ?? String(DEFAULT_SPEED));
  return Number.isFinite(raw) ? raw : DEFAULT_SPEED;
}

function resolveTrigger(el) {
  return el.closest('[data-parallax-trigger]') || el.parentElement || el;
}

function isStickyScene(trigger) {
  return trigger.hasAttribute('data-hero-scene');
}

/** Extra height available to slide without showing gaps. */
function overflowPx(el) {
  const crop = el.parentElement || el;
  return Math.max(0, el.offsetHeight - crop.clientHeight);
}

function travelPx(el, speed) {
  const extra = overflowPx(el);

  if (extra > 1) {
    return extra * Math.abs(speed);
  }

  return Math.max(el.offsetHeight, (el.parentElement || el).clientHeight) * FALLBACK_TRAVEL * Math.abs(speed);
}

function refreshAfterLayout() {
  const refresh = () => ScrollTrigger.refresh();

  document.addEventListener('sakanela:loaderdone', refresh, { once: true });
  window.addEventListener('load', refresh, { once: true });
}

/**
 * Scrubbed parallax for `[data-parallax-speed]`.
 * Sticky hero: moves with content (up) but slower.
 * Other layers: positive = lags; negative = reverse.
 */
export function initParallax() {
  const layers = $$('[data-parallax-speed]');

  if (!layers.length || prefersReducedMotion()) {
    return;
  }

  layers.forEach((el) => {
    const speed = readSpeed(el);
    const trigger = resolveTrigger(el);
    const sticky = isStickyScene(trigger);
    const start = trigger.dataset.parallaxStart || (sticky ? 'top top' : 'top bottom');
    const end = trigger.dataset.parallaxEnd || (sticky ? 'bottom bottom' : 'bottom top');

    if (sticky) {
      // Same direction as content (up on scroll-down), scaled by speed (0–1 = slower→faster).
      gsap.fromTo(
        el,
        { y: 0 },
        {
          y: () => -travelPx(el, speed),
          ease: 'none',
          force3D: true,
          scrollTrigger: {
            trigger,
            start,
            end,
            scrub: SCRUB,
            invalidateOnRefresh: true,
          },
        },
      );
      return;
    }

    const signed = speed < 0 ? -1 : 1;

    gsap.fromTo(
      el,
      { y: () => -travelPx(el, speed) * signed },
      {
        y: () => travelPx(el, speed) * signed,
        ease: 'none',
        force3D: true,
        scrollTrigger: {
          trigger,
          start,
          end,
          scrub: SCRUB,
          invalidateOnRefresh: true,
        },
      },
    );
  });

  ScrollTrigger.refresh();
  refreshAfterLayout();
}
