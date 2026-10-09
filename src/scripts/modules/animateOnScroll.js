import { $$ } from '../core/dom.js';
import { createObserver } from '../core/observer.js';

export function initAnimateOnScroll() {
  const items = $$('[data-animate]').filter(
    (el) => !el.classList.contains('is-line-reveal') && !el.classList.contains('is-line-reveal-host'),
  );

  if (!items.length) {
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = createObserver((entries, instance) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add('is-visible');
      instance.unobserve(entry.target);
    });
  });

  observer.observe(items);
}
