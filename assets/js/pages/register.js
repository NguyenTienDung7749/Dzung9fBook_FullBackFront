import { qs } from '../core/dom.js';
import { register } from '../services/auth.js';
import { attachFieldClearHandlers, clearFormState, emailRegex, isValidPhone, setFieldError, showFormMessage } from './forms-shared.js';

const getErrorCode = function (error) {
  return String(error?.code || error?.payload?.code || '').trim();
};

export const initRegisterPage = function () {
  const form = qs('[data-register-form]');

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
    const password = form.password.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();
    const submitButton = qs('button[type="submit"]', form);
    let isValid = true;

    if (!name) {
      setFieldError(form, 'name', 'Vui lòng nhập họ và tên.');
      isValid = false;
    }

    if (!email) {
      setFieldError(form, 'email', 'Vui lòng nhập email.');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setFieldError(form, 'email', 'Email chưa đúng định dạng.');
      isValid = false;
    }

    if (phone && !isValidPhone(phone)) {
      setFieldError(form, 'phone', 'Số điện thoại cần có từ 9 đến 11 chữ số hợp lệ.');
      isValid = false;
    }

    if (!password) {
      setFieldError(form, 'password', 'Vui lòng nhập mật khẩu.');
      isValid = false;
    } else if (password.length < 6) {
      setFieldError(form, 'password', 'Mật khẩu cần có ít nhất 6 ký tự.');
      isValid = false;
    }

    if (!confirmPassword) {
      setFieldError(form, 'confirmPassword', 'Vui lòng nhập lại mật khẩu.');
      isValid = false;
    } else if (confirmPassword !== password) {
      setFieldError(form, 'confirmPassword', 'Mật khẩu nhập lại chưa khớp.');
      isValid = false;
    }

    if (!isValid) {
      showFormMessage(form, 'error', 'Vui lòng hoàn thiện các trường bắt buộc.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalLabel = submitButton.textContent;
      submitButton.textContent = 'Đang tạo tài khoản...';
    }

    void register({ name, email, phone, password }).then(function () {
      showFormMessage(form, 'success', 'Tài khoản đã được tạo. Đang đưa bạn đến trang tài khoản...');
      form.reset();

      window.setTimeout(function () {
        window.location.href = './profile.html';
      }, 800);
    }).catch(function (error) {
      if (getErrorCode(error) === 'AUTH_EMAIL_EXISTS') {
        setFieldError(form, 'email', 'Email này đã được sử dụng.');
        showFormMessage(form, 'error', 'Bạn có thể đăng nhập hoặc dùng một email khác.');
        return;
      }

      showFormMessage(form, 'error', 'Không thể tạo tài khoản lúc này. Vui lòng thử lại sau.');
      console.error(error);
    }).finally(function () {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalLabel || 'Tạo tài khoản';
      }
    });
  });
};
