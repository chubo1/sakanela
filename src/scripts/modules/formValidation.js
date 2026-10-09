import { $, $$ } from '../core/dom.js';
import { on } from '../core/events.js';
import { site, validationMessages } from '../../data/content.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRules(field) {
  return (field.dataset.validate || '')
    .split('|')
    .map((rule) => rule.trim())
    .filter(Boolean);
}

function setFieldState(field, message) {
  const group = field.closest('.field');
  const error = group ? $('.field__error', group) : null;

  field.setAttribute('aria-invalid', message ? 'true' : 'false');

  if (group) {
    group.classList.toggle('is-invalid', Boolean(message));
    group.classList.toggle('is-valid', !message && Boolean(field.value.trim()));
  }

  if (error) {
    error.textContent = message;
  }
}

function validateField(field) {
  const value = field.value.trim();
  const rules = parseRules(field);

  const invalid = rules.reduce((message, rule) => {
    if (message) {
      return message;
    }

    if (rule === 'required' && !value) {
      return validationMessages.required;
    }

    if (rule === 'email' && value && !EMAIL_PATTERN.test(value)) {
      return validationMessages.email;
    }

    if (rule.startsWith('min:')) {
      const min = Number.parseInt(rule.slice(4), 10);
      if (value.length < min) {
        return validationMessages.min(min);
      }
    }

    return '';
  }, '');

  setFieldState(field, invalid);
  return !invalid;
}

function serializeForm(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

async function submitToEndpoint(payload) {
  if (!site.formEndpoint) {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 450);
    });
    return { ok: true, stub: true };
  }

  const response = await fetch(site.formEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return { ok: response.ok, status: response.status };
}

function setStatus(form, type, text) {
  const status = $('[data-form-status]', form);
  if (!status) {
    return;
  }

  status.classList.remove('is-success', 'is-error');
  if (type) {
    status.classList.add(`is-${type}`);
  }
  status.textContent = text;
}

export function initFormValidation(form) {
  if (!form) {
    return;
  }

  const fields = $$('[data-validate]', form);
  const submit = $('[type="submit"]', form);

  fields.forEach((field) => {
    on(field, 'blur', () => validateField(field));
    on(field, 'input', () => {
      if (field.getAttribute('aria-invalid') === 'true') {
        validateField(field);
      }
    });
  });

  on(form, 'submit', async (event) => {
    event.preventDefault();

    const valid = fields.map((field) => validateField(field)).every(Boolean);

    if (!valid) {
      setStatus(form, 'error', validationMessages.formInvalid);
      fields.find((field) => field.getAttribute('aria-invalid') === 'true')?.focus();
      return;
    }

    if (submit) {
      submit.disabled = true;
    }

    setStatus(form, '', 'Sending…');

    try {
      const result = await submitToEndpoint(serializeForm(form));

      if (!result.ok) {
        throw new Error('Request failed');
      }

      form.reset();
      fields.forEach((field) => setFieldState(field, ''));
      setStatus(form, 'success', validationMessages.success);
      form.dispatchEvent(new CustomEvent('form:success', { bubbles: true }));
    } catch (error) {
      console.error(error);
      setStatus(form, 'error', validationMessages.network);
    } finally {
      if (submit) {
        submit.disabled = false;
      }
    }
  });
}
