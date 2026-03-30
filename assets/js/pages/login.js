import { qs } from '../core/dom.js';
import { login } from '../services/auth.js';
import { attachFieldClearHandlers, clearFormState, emailRegex, setFieldError, showFormMessage } from './forms-shared.js';

const getErrorCode = function (error) {
  return String(error?.code || error?.payload?.code || '').trim();
};

export const initLoginPage = function () {
  const form = qs('[data-login-form]');

  if (!form) {
    return;
  }

  attachFieldClearHandlers(form);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearFormState(form);

    const email = form.email.value.trim();
    const password = form.password.value.trim();
    let isValid = true;

    if (!email) {
      setFieldError(form, 'email', 'Vui lòng nhập email của bạn.');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setFieldError(form, 'email', 'Email chưa đúng định dạng.');
      isValid = false;
    }

    if (!password) {
      setFieldError(form, 'password', 'Vui lòng nhập mật khẩu.');
      isValid = false;
    } else if (password.length < 6) {
      setFieldError(form, 'password', 'Mật khẩu cần có ít nhất 6 ký tự.');
      isValid = false;
    }

    if (!isValid) {
      showFormMessage(form, 'error', 'Vui lòng kiểm tra lại thông tin đăng nhập.');
      return;
    }

    void login({ email, password }).then(function () {
      showFormMessage(form, 'success', 'Đăng nhập thành công. Đang đưa bạn đến trang tài khoản...');

      window.setTimeout(function () {
        window.location.href = './profile.html';
      }, 800);
    }).catch(function (error) {
      if (getErrorCode(error) === 'AUTH_INVALID_CREDENTIALS') {
        showFormMessage(form, 'error', 'Email hoặc mật khẩu chưa chính xác.');
        return;
      }

      showFormMessage(form, 'error', 'Không thể đăng nhập lúc này. Vui lòng thử lại sau.');
      console.error(error);
    });
  });
};
