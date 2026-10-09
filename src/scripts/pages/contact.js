import { $ } from '../core/dom.js';
import { on } from '../core/events.js';
import { initFormValidation } from '../modules/formValidation.js';

function initModal(modal) {
  if (!modal) {
    return {
      open() {},
      close() {},
    };
  }

  const close = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.removeProperty('overflow');
  };

  const open = () => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('[data-modal-close]', modal)?.focus();
  };

  on(modal, 'click', (event) => {
    if (
      event.target.closest('[data-modal-close]') ||
      event.target === $('[data-modal-backdrop]', modal)
    ) {
      close();
    }
  });

  on(document, 'keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      close();
    }
  });

  return { open, close };
}

export function initContact() {
  const form = $('[data-contact-form]');
  const modal = $('[data-modal="success"]');
  const dialog = initModal(modal);

  initFormValidation(form);

  if (form) {
    on(form, 'form:success', () => dialog.open());
  }
}
