import { qs, qsa } from '../core/dom.js';

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidPhone = function (value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 11;
};

const syncFieldErrorA11y = function (field, errorElement, isInvalid) {
  if (!field || !errorElement?.id) {
    return;
  }

  const describedBy = new Set(String(field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));

  if (isInvalid) {
    describedBy.add(errorElement.id);
    field.setAttribute('aria-invalid', 'true');
  } else {
    describedBy.delete(errorElement.id);
    field.removeAttribute('aria-invalid');
  }

  if (describedBy.size) {
    field.setAttribute('aria-describedby', [...describedBy].join(' '));
  } else {
    field.removeAttribute('aria-describedby');
  }
};

export const showFormMessage = function (form, type, message) {
  const messageBox = qs('[data-form-message]', form);

  if (!messageBox) {
    return;
  }

  messageBox.textContent = message;
  messageBox.className = 'form-message is-visible';
  messageBox.classList.add(type === 'success' ? 'is-success' : 'is-error');
  messageBox.setAttribute('role', type === 'success' ? 'status' : 'alert');
};

export const clearFormMessage = function (form) {
  const messageBox = qs('[data-form-message]', form);

  if (!messageBox) {
    return;
  }

  messageBox.textContent = '';
  messageBox.className = 'form-message';
  messageBox.removeAttribute('role');
};

export const clearFieldError = function (form, fieldName) {
  const errorElement = qs(`[data-error-for="${fieldName}"]`, form);
  const field = form.elements[fieldName];

  if (errorElement) {
    errorElement.textContent = '';
  }

  if (field) {
    field.classList.remove('input-invalid');
    syncFieldErrorA11y(field, errorElement, false);
  }
};

export const setFieldError = function (form, fieldName, message) {
  const errorElement = qs(`[data-error-for="${fieldName}"]`, form);
  const field = form.elements[fieldName];

  if (errorElement) {
    errorElement.textContent = message;
  }

  if (field) {
    field.classList.add('input-invalid');
    syncFieldErrorA11y(field, errorElement, true);
  }
};

export const clearFormState = function (form) {
  qsa('[data-error-for]', form).forEach((errorElement) => {
    clearFieldError(form, errorElement.dataset.errorFor || '');
  });

  clearFormMessage(form);
};

export const attachFieldClearHandlers = function (form) {
  qsa('input, textarea, select', form).forEach((field) => {
    field.addEventListener('input', function () {
      clearFieldError(form, field.name);
      clearFormMessage(form);
    });
  });
};
