import { qs } from '../core/dom.js';
import { attachFieldClearHandlers, clearFormState, emailRegex, isValidPhone, setFieldError, showFormMessage } from './forms-shared.js';

export const initContactPage = function () {
  const form = qs('[data-contact-form]');

  if (!form) {
    return;
  }

  attachFieldClearHandlers(form);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearFormState(form);

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const message = form.message.value.trim();
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

    showFormMessage(form, 'success', 'Biểu mẫu demo đã ghi nhận thông tin của bạn trên trình duyệt. Phase hiện tại chưa gửi dữ liệu này lên backend liên hệ.');
    form.reset();
  });
};
