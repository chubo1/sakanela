import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$ } from '../core/dom.js';
import { on } from '../core/events.js';
import { createObserver } from '../core/observer.js';
import { getLenis } from '../modules/smoothScroll.js';

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function initSectionNav() {
  const nav = $('[data-section-nav]');

  if (!nav) {
    return;
  }

  const items = $$('[data-section-link]', nav)
    .map((link) => {
      const id = (link.getAttribute('href') || '').replace(/^#/, '');
      const section = id ? document.getElementById(id) : null;

      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (!items.length) {
    return;
  }

  const label = $('.section-nav__label', nav);
  const defaultLabel = label ? label.textContent.trim() : '';

  const setLabel = (text) => {
    if (!label || label.textContent.trim() === text) {
      return;
    }

    gsap.killTweensOf(label);

    if (prefersReducedMotion()) {
      label.textContent = text;
      return;
    }

    gsap
      .timeline()
      .to(label, { y: -6, opacity: 0, duration: 0.18, ease: 'power2.in' })
      .call(() => {
        label.textContent = text;
      })
      .fromTo(label, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
  };

  const setActive = (id) => {
    let tone = 'light';
    let activeText = defaultLabel;

    items.forEach(({ link, section }) => {
      const active = section.id === id;
      link.classList.toggle('is-active', active);

      if (active) {
        link.setAttribute('aria-current', 'true');
        tone = section.dataset.navTone || 'light';
        activeText = link.textContent.trim();
      } else {
        link.removeAttribute('aria-current');
      }
    });

    nav.dataset.tone = tone;
    setLabel(activeText);
  };

  let scrollLock = null;

  const syncActive = () => {
    if (scrollLock) {
      return;
    }

    const bandTop = window.innerHeight * 0.35;
    const bandBottom = window.innerHeight * 0.6;
    const current = items.find(({ section }) => {
      const box = section.getBoundingClientRect();
      return box.top <= bandBottom && box.bottom >= bandTop;
    });

    setActive(current ? current.section.id : null);
  };

  const observer = new IntersectionObserver(syncActive, {
    rootMargin: '-35% 0px -40% 0px',
    threshold: [0, 0.25, 0.6],
  });

  const closeButton = $('[data-section-nav-close]', nav);
  const list = $('.section-nav__list', nav);

  if (closeButton && list) {
    const links = $$('.section-nav__link', list);
    let motion = null;

    const readOpenHeight = () => {
      const previous = list.style.height;
      list.style.height = 'auto';
      const height = list.offsetHeight;
      list.style.height = previous;
      return height;
    };

    const setExpanded = (expanded) => {
      closeButton.setAttribute('aria-expanded', String(expanded));
      closeButton.setAttribute(
        'aria-label',
        expanded ? 'Close project story' : 'Open project story',
      );
      list.setAttribute('aria-hidden', String(!expanded));

      if (expanded) {
        list.removeAttribute('inert');
      } else {
        list.setAttribute('inert', '');
      }

      if (motion) {
        motion.kill();
        motion = null;
      }

      if (prefersReducedMotion()) {
        nav.classList.toggle('is-collapsed', !expanded);
        gsap.set(list, { clearProps: 'height,overflow' });
        gsap.set(links, { clearProps: 'transform,opacity' });
        return;
      }

      if (expanded) {
        const startHeight = list.getBoundingClientRect().height;
        gsap.set(list, { height: startHeight, overflow: 'hidden' });
        nav.classList.remove('is-collapsed');
        const endHeight = readOpenHeight();

        motion = gsap.timeline({
          onComplete: () => {
            gsap.set(list, { height: 'auto', overflow: 'visible' });
          },
        });

        motion.fromTo(
          list,
          { height: startHeight },
          { height: endHeight, duration: 0.65, ease: 'power3.inOut' },
          0,
        );

        motion.fromTo(
          links,
          { y: -16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.04,
            ease: 'power2.out',
          },
          0.06,
        );

        return;
      }

      gsap.set(list, { height: list.offsetHeight, overflow: 'hidden' });
      nav.classList.add('is-collapsed');

      motion = gsap.timeline({
        onComplete: () => {
          gsap.set(list, { clearProps: 'height,overflow' });
          gsap.set(links, { clearProps: 'transform,opacity' });
        },
      });

      motion.to(
        links,
        {
          y: -16,
          opacity: 0,
          duration: 0.34,
          stagger: { each: 0.03, from: 'end' },
          ease: 'power2.in',
        },
        0,
      );

      motion.to(list, { height: 0, duration: 0.58, ease: 'power3.inOut' }, 0.05);
    };

    on(closeButton, 'click', () => {
      setExpanded(nav.classList.contains('is-collapsed'));
    });
  }

  items.forEach(({ link, section }) => {
    observer.observe(section);

    on(link, 'click', (event) => {
      event.preventDefault();
      setActive(section.id);

      window.clearTimeout(scrollLock);
      const release = () => {
        window.clearTimeout(scrollLock);
        scrollLock = null;
        syncActive();
      };

      const lenis = getLenis();

      if (lenis) {
        scrollLock = window.setTimeout(release, 1600);
        lenis.scrollTo(section, { duration: 1.2, onComplete: release });
        return;
      }

      scrollLock = window.setTimeout(release, 1000);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const footer = $('.site-footer');

  if (!footer) {
    return;
  }

  const footerObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry) {
        return;
      }

      nav.classList.toggle('is-hidden', entry.isIntersecting);
    },
    { threshold: 0.2 },
  );

  footerObserver.observe(footer);
}

function stickDetails(details) {
  const overflow = details.offsetHeight - window.innerHeight;

  details.style.top = `${overflow > 0 ? -overflow : 0}px`;
}

function initDetailsScroll() {
  const scene = $('[data-details-scene]');
  const details = scene ? $('.details', scene) : null;
  const inner = scene ? $('.details__inner', scene) : null;
  const cover = scene ? $('.behind', scene) : null;

  if (!scene || !details || !inner || !cover || prefersReducedMotion()) {
    return;
  }

  const applyStick = () => stickDetails(details);

  applyStick();
  ScrollTrigger.addEventListener('refreshInit', applyStick);

  const overlapStart = () => (details.offsetHeight > window.innerHeight ? 'bottom bottom' : 'top top');

  gsap.fromTo(
    inner,
    { y: 0 },
    {
      y: () => -Math.round(window.innerHeight * 0.16),
      ease: 'none',
      force3D: true,
      scrollTrigger: {
        trigger: details,
        start: overlapStart,
        endTrigger: cover,
        end: 'top top',
        scrub: 0.65,
        invalidateOnRefresh: true,
      },
    },
  );
}

function parseStatValue(text) {
  const match = text.trim().match(/^([\d.]+)(.*)$/);

  if (!match) {
    return null;
  }

  const [, numeric, suffix] = match;
  const grouped = /^\d{1,3}(\.\d{3})+$/.test(numeric);

  return {
    target: Number(grouped ? numeric.replace(/\./g, '') : numeric),
    group: grouped ? '.' : '',
    suffix,
  };
}

function formatStatValue(value, { group, suffix }) {
  const digits = String(Math.round(value));
  const body = group ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, group) : digits;

  return `${body}${suffix}`;
}

function initCounters() {
  const figures = $$('.details__value');

  if (!figures.length || prefersReducedMotion()) {
    return;
  }

  const specs = figures
    .map((el) => {
      const label = (el.textContent || '').trim();
      const spec = parseStatValue(label);

      if (!spec || !Number.isFinite(spec.target)) {
        return null;
      }

      el.setAttribute('aria-label', label);
      el.textContent = formatStatValue(0, spec);

      return { el, label, ...spec };
    })
    .filter(Boolean);

  if (!specs.length) {
    return;
  }

  const observer = createObserver((entries, instance) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      const spec = specs.find((item) => item.el === entry.target);

      if (!spec) {
        return;
      }

      const state = { value: 0 };
      const delayStep = Number(spec.el.closest('[data-animate-delay]')?.dataset.animateDelay || 0);

      gsap.to(state, {
        value: spec.target,
        duration: 1.6,
        delay: delayStep * 0.08,
        ease: 'power3.out',
        onUpdate: () => {
          spec.el.textContent = formatStatValue(state.value, spec);
        },
        onComplete: () => {
          spec.el.textContent = formatStatValue(spec.target, spec);
          spec.el.setAttribute('aria-label', spec.label);
        },
      });

      instance.unobserve(spec.el);
    });
  });

  observer.observe(specs.map((spec) => spec.el));
}

export function initAbout() {
  initSectionNav();
  initCounters();
  initDetailsScroll();
}
