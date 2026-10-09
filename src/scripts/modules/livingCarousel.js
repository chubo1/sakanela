import Swiper from 'swiper';
import { A11y, Scrollbar } from 'swiper/modules';
import 'swiper/swiper.css';
// eslint-disable-next-line import/no-unresolved -- packaged via Swiper export map
import 'swiper/css/scrollbar';
import { $ } from '../core/dom.js';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Home “Way of living” gallery: Swiper with a bottom scrollbar progress bar.
 */
export function initLivingCarousel() {
  const root = $('[data-living-carousel]');
  const slider = root ? $('[data-living-carousel-slider]', root) : null;
  const scrollbar = root ? $('[data-living-carousel-scrollbar]', root) : null;

  if (!root || !slider || !scrollbar) {
    return null;
  }

  return new Swiper(slider, {
    modules: [A11y, Scrollbar],
    slidesPerView: 1.15,
    spaceBetween: 16,
    speed: prefersReducedMotion() ? 0 : 650,
    grabCursor: true,
    watchOverflow: true,
    observer: true,
    observeParents: true,
    breakpoints: {
      576: {
        slidesPerView: 2.15,
        spaceBetween: 18,
      },
      768: {
        slidesPerView: 2.6,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 3.4,
        spaceBetween: 22,
      },
      1280: {
        slidesPerView: 4,
        spaceBetween: 24,
      },
    },
    scrollbar: {
      el: scrollbar,
      draggable: true,
      hide: false,
      snapOnRelease: true,
    },
    a11y: {
      enabled: true,
    },
  });
}
