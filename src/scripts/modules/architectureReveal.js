import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$ } from '../core/dom.js';

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function canPinGallery(section) {
  if (
    !section.hasAttribute('data-lifestyle') &&
    !section.hasAttribute('data-appartments') &&
    !section.hasAttribute('data-amenities') &&
    !section.hasAttribute('data-concept') &&
    !section.hasAttribute('data-facade') &&
    !section.hasAttribute('data-landscape')
  ) {
    return true;
  }

  return window.matchMedia('(min-width: 1024px)').matches;
}

function padIndex(value) {
  return String(value).padStart(2, '0');
}

function refreshAfterLayout() {
  const refresh = () => ScrollTrigger.refresh();

  document.addEventListener('sakanela:loaderdone', refresh, { once: true });
  window.addEventListener('load', refresh, { once: true });
}

/**
 * Pinned architecture gallery: stacked images wipe in via clip-path while the
 * text stays still. Lenis ↔ ScrollTrigger sync is handled in initSmoothScroll()
 * (lenis.on('scroll', ScrollTrigger.update) + gsap.ticker).
 */
function initPinnedGallery(
  section,
  slideSelector,
  currentSelector,
  totalSelector,
  pinRoot,
  { trigger, start = 'top top' } = {},
) {
  const slides = $$(slideSelector, section);
  const currentEl = $(currentSelector, section);
  const totalEl = $(totalSelector, section);

  if (!slides.length) {
    return false;
  }

  if (totalEl) {
    totalEl.textContent = padIndex(slides.length);
  }

  slides.forEach((slide, index) => {
    slide.style.zIndex = String(index + 1);
  });

  const setActive = (index) => {
    if (currentEl) {
      currentEl.textContent = padIndex(index + 1);
    }
  };

  setActive(0);

  // First image is already fully visible; nothing to wipe if there is only one.
  if (slides.length < 2 || prefersReducedMotion() || !canPinGallery(section)) {
    return false;
  }

  gsap.set(slides[0], { clipPath: 'inset(0% 0% 0% 0%)' });
  gsap.set(slides.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });

  const pin = pinRoot || section;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: trigger || pin,
      pin,
      scrub: 1,
      start,
      anticipatePin: 1,
      // One viewport of scroll per image after the first. With 5 slides that is
      // 4 wipes, so the pin lasts 4 * innerHeight; invalidateOnRefresh rebuilds
      // this after resize so it stays in sync with the viewport.
      end: () => `+=${window.innerHeight * (slides.length - 1)}`,
      invalidateOnRefresh: true,
      onUpdate(self) {
        setActive(Math.round(self.progress * (slides.length - 1)));
      },
    },
  });
  slides.forEach((slide, index) => {
    if (index === 0) {
      return;
    }

    tl.fromTo(
      slide,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'none' },
      index - 1,
    );
  });

  return true;
}

/**
 * Pinned safety gallery: the copy stays put and one full image fills the
 * frame. Each viewport of scroll wipes the next image in from the left,
 * the horizontal counterpart of the amenities clip reveal.
 */
function initHorizontalGallery(section) {
  if (!section) {
    return false;
  }

  const slides = $$('[data-safety-slide]', section);

  if (slides.length < 2 || prefersReducedMotion() || !window.matchMedia('(min-width: 1024px)').matches) {
    return false;
  }

  const hidden = 'inset(0% 100% 0% 0%)';
  const shown = 'inset(0% 0% 0% 0%)';

  slides.forEach((slide, index) => {
    slide.style.zIndex = String(index + 1);
  });

  gsap.set(slides[0], { clipPath: shown });
  gsap.set(slides.slice(1), { clipPath: hidden });

  section.classList.add('is-horizontal');

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      pin: true,
      scrub: 1,
      start: 'top top',
      anticipatePin: 1,
      end: () => `+=${window.innerHeight * (slides.length - 1)}`,
      invalidateOnRefresh: true,
    },
  });

  slides.forEach((slide, index) => {
    if (index === 0) {
      return;
    }

    tl.fromTo(slide, { clipPath: hidden }, { clipPath: shown, duration: 1, ease: 'none' }, index - 1);
  });

  return true;
}

/**
 * Two overview stacks wipe in together, the same vertical clip as the
 * lifestyle gallery: each next photo is hidden from the top and opens downward.
 */
function initOverviewSlides() {
  const section = $('[data-overview]');

  if (!section) {
    return false;
  }

  const groups = $$('[data-overview-slider]', section)
    .map((stack) => $$('[data-overview-slide]', stack))
    .filter((slides) => slides.length);

  if (!groups.length) {
    return false;
  }

  const hidden = 'inset(100% 0% 0% 0%)';
  const shown = 'inset(0% 0% 0% 0%)';
  const steps = Math.max(...groups.map((slides) => slides.length)) - 1;

  groups.forEach((slides) => {
    slides.forEach((slide, index) => {
      slide.style.zIndex = String(index + 1);
    });
    gsap.set(slides[0], { clipPath: shown });
    gsap.set(slides.slice(1), { clipPath: hidden });
  });

  if (steps < 1 || prefersReducedMotion() || !window.matchMedia('(min-width: 1024px)').matches) {
    return false;
  }

  const frames = $('.about-story__grid', section) || section;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: frames,
      pin: section,
      scrub: 1,
      // Hold once both photos are on screen. The pin lasts one viewport per
      // wipe, then releases when the last photo is fully open.
      start: 'bottom bottom',
      anticipatePin: 1,
      end: () => `+=${window.innerHeight * steps}`,
      invalidateOnRefresh: true,
    },
  });

  for (let step = 0; step < steps; step += 1) {
    groups.forEach((slides) => {
      const slide = slides[step + 1];

      if (!slide) {
        return;
      }

      tl.fromTo(slide, { clipPath: hidden }, { clipPath: shown, duration: 1, ease: 'none' }, step);
    });
  }

  return true;
}

export function initArchitectureReveal() {
  const galleries = [
    {
      section: $('[data-architecture]'),
      slide: '[data-architecture-slide]',
      current: '[data-architecture-counter-current]',
      total: '[data-architecture-counter-total]',
    },
    ...$$('[data-lifestyle]').map((section) => ({
      section,
      slide: '[data-lifestyle-slide]',
      current: '[data-lifestyle-counter-current]',
      total: '[data-lifestyle-counter-total]',
    })),
    ...$$('[data-appartments]').map((section) => ({
      section,
      slide: '[data-appartments-slide]',
      current: '[data-appartments-counter-current]',
      total: '[data-appartments-counter-total]',
      pin: $('.appartments__inner', section),
    })),
    ...$$('[data-amenities]').map((section) => ({
      section,
      slide: '[data-amenities-slide]',
      current: '[data-amenities-counter-current]',
      total: '[data-amenities-counter-total]',
      pin: $('.amenities__inner', section),
    })),
    ...$$('[data-landscape]').map((section) => ({
      section,
      slide: '[data-landscape-slide]',
      current: '[data-landscape-counter-current]',
      total: '[data-landscape-counter-total]',
    })),
  ];

  let pinned = false;

  galleries.forEach(({ section, slide, current, total, pin }) => {
    if (!section) {
      return;
    }

    pinned = initPinnedGallery(section, slide, current, total, pin) || pinned;
  });

  pinned = initHorizontalGallery($('[data-safety]')) || pinned;
  const overview = initOverviewSlides();

  // After the overview pin spacer exists, so this start isn't measured too early.
  const concept = $('[data-concept]');
  const header = $('[data-header]');

  if (concept) {
    pinned =
      initPinnedGallery(
        concept,
        '[data-concept-slide]',
        '[data-concept-counter-current]',
        '[data-concept-counter-total]',
        null,
        {
          // The slider keeps each photo's own ratio, so the section can be
          // taller than the viewport; hold once the slider is centred.
          trigger: $('.architecture__media', concept),
          start: () => `center center+=${(header?.offsetHeight || 0) / 2}`,
        },
      ) || pinned;
  }

  const facade = $('[data-facade]');

  if (facade) {
    pinned =
      initPinnedGallery(
        facade,
        '[data-facade-slide]',
        '[data-facade-counter-current]',
        '[data-facade-counter-total]',
        null,
        {
          // The section is taller than the viewport, so hold once the slider is
          // centred in the space below the header.
          trigger: $('.facade__media', facade),
          start: () => `center center+=${(header?.offsetHeight || 0) / 2}`,
        },
      ) || pinned;
  }

  if (pinned || overview) {
    // Pins are created out of DOM order; refresh them top to bottom so each
    // start includes the spacers of the pins above it.
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    refreshAfterLayout();
  }
}
