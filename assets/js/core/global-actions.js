import { logout } from '../services/auth.js';
import { addItem, removeItem, updateItemQuantity } from '../services/cart.js';
import { renderCartPage } from '../pages/cart.js';
import { reportRuntimeError } from './runtime-notice.js';

const flashAddButton = function (button) {
  const originalLabel = button.textContent.trim();
  button.textContent = 'Đã thêm vào giỏ';
  button.disabled = true;
  button.classList.add('is-added');

  window.setTimeout(function () {
    button.textContent = originalLabel;
    button.disabled = false;
    button.classList.remove('is-added');
  }, 1200);
};

const handleCartMutation = async function (mutate, options = {}) {
  await mutate();

  if (options.redirectToCart) {
    window.location.href = './cart.html';
    return;
  }

  if (options.flashButton) {
    flashAddButton(options.flashButton);
  }

  if (document.body.dataset.page === 'cart') {
    await renderCartPage();
  }
};

export const attachGlobalActions = function () {
  document.addEventListener('click', function (event) {
    const buyNowButton = event.target.closest('[data-buy-now]');

    if (buyNowButton) {
      void handleCartMutation(function () {
        return addItem(buyNowButton.dataset.bookId, buyNowButton.dataset.bookHandle);
      }, {
        redirectToCart: true
      }).catch(function (error) {
        reportRuntimeError('Không thể cập nhật giỏ sách lúc này. Vui lòng thử lại sau ít phút.', error);
      });
      return;
    }

    const addButton = event.target.closest('[data-add-to-cart]');

    if (addButton) {
      void handleCartMutation(function () {
        return addItem(addButton.dataset.bookId, addButton.dataset.bookHandle);
      }, {
        flashButton: addButton
      }).catch(function (error) {
        reportRuntimeError('Không thể thêm sách vào giỏ lúc này. Vui lòng thử lại sau.', error);
      });
      return;
    }

    const cartActionButton = event.target.closest('[data-cart-action]');

    if (cartActionButton) {
      const bookId = cartActionButton.dataset.bookId;
      const action = cartActionButton.dataset.cartAction;

      void handleCartMutation(async function () {
        if (action === 'increase') {
          await updateItemQuantity(bookId, 1);
        }

        if (action === 'decrease') {
          await updateItemQuantity(bookId, -1);
        }

        if (action === 'remove') {
          await removeItem(bookId);
        }
      }).catch(function (error) {
        reportRuntimeError('Không thể cập nhật giỏ sách lúc này. Vui lòng tải lại trang rồi thử lại.', error);
      });
      return;
    }

    if (event.target.closest('[data-logout-button]')) {
      void logout().catch(function (error) {
        reportRuntimeError('Không thể đăng xuất lúc này. Vui lòng thử lại sau.', error);
      });
    }
  });
};
