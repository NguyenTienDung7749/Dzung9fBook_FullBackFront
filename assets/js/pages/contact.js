import { qs } from '../core/dom.js';
import { isApiProviderMode } from '../config/runtime.js';
import { submitContact } from '../services/contact.js';
import { attachFieldClearHandlers, clearFormState, emailRegex, isValidPhone, setFieldError, showFormMessage } from './forms-shared.js';

const getSuccessMessage = function () {
  return isApiProviderMode()
    ? 'Dzung9fBook đã nhận được liên hệ của bạn và sẽ phản hồi sớm qua email hoặc số điện thoại đã cung cấp.'
    : 'Biểu mẫu demo đã ghi nhận thông tin của bạn trên trình duyệt. Khi chạy qua backend/API mode, dữ liệu này sẽ được gửi vào hệ thống liên hệ thật.';
};

export const initContactPage = function () {
  const form = qs('[data-contact-form]');

  if (!form) {
    return;
  }

  attachFieldClearHandlers(form);

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearFormState(form);

    const submitButton = qs('button[type="submit"]', form);
    const name = String(form.elements.name?.value || '').trim();
    const email = String(form.elements.email?.value || '').trim();
    const phone = String(form.elements.phone?.value || '').trim();
    const message = String(form.elements.message?.value || '').trim();
    let isValid = true;

    if (!name) {
      setFieldError(form, 'name', 'Vui lòng cho Dzung9fBook biết tên của bạn.');
      isValid = false;
    }

    if (!email) {
      setFieldError(form, 'email', 'Vui lòng nhập email để Dzung9fBook phản hồi.');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setFieldError(form, 'email', 'Email chưa đúng định dạng.');
      isValid = false;
    }

    if (phone && !isValidPhone(phone)) {
      setFieldError(form, 'phone', 'Số điện thoại cần có từ 9 đến 11 chữ số hợp lệ.');
      isValid = false;
    }

    if (!message) {
      setFieldError(form, 'message', 'Vui lòng nhập nội dung bạn muốn gửi.');
      isValid = false;
    } else if (message.length < 10) {
      setFieldError(form, 'message', 'Nội dung nên có ít nhất 10 ký tự để Dzung9fBook hỗ trợ đúng hơn.');
      isValid = false;
    }

    if (!isValid) {
      showFormMessage(form, 'error', 'Vui lòng kiểm tra lại thông tin trước khi gửi.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalLabel = submitButton.textContent;
      submitButton.textContent = 'Đang gửi liên hệ...';
    }

    try {
      await submitContact({
        name,
        email,
        ...(phone ? { phone } : {}),
        message
      });
      showFormMessage(form, 'success', getSuccessMessage());
      form.reset();
    } catch (error) {
      showFormMessage(
        form,
        'error',
        error?.payload?.message || error?.message || 'Không thể gửi liên hệ lúc này. Vui lòng thử lại sau ít phút.'
      );
      console.error(error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalLabel || 'Gửi liên hệ';
      }
    }
  });
};
