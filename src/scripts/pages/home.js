import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $ } from '../core/dom.js';

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hero overlay scene: title fades while History covers the sticky hero.
 * The frame sequence owns the hero image; this only fades the title.
 */
export function initHome() {
  const scene = $('[data-hero-scene]');
  const content = scene ? $('.hero__content, .story__content', scene) : null;

  if (!scene || !content || prefersReducedMotion()) {
    return;
  }

  const history = $('.history', scene);

  gsap.to(content, {
    yPercent: -18,
    opacity: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: history || scene,
      start: history ? 'top bottom' : 'top top',
      end: history ? 'top top' : 'bottom bottom',
      scrub: true,
    },
  });
}
