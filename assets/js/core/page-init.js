import { initAdminBooksPage } from '../pages/admin-books.js';
import { initAdminHomePage } from '../pages/admin-home.js';
import { initAdminMessagesPage } from '../pages/admin-messages.js';
import { initAdminOrdersPage } from '../pages/admin-orders.js';
import { initBookDetailPage } from '../pages/book-detail.js';
import { initBooksPage } from '../pages/books.js';
import { initCartPage } from '../pages/cart.js';
import { initContactPage } from '../pages/contact.js';
import { initLoginPage } from '../pages/login.js';
import { initOrderDetailPage } from '../pages/order-detail.js';
import { initOrdersPage } from '../pages/orders.js';
import { initProfilePage } from '../pages/profile.js';
import { initRegisterPage } from '../pages/register.js';

export const initCurrentPage = async function (categories) {
  const currentPage = document.body.dataset.page;
  const layout = document.body.dataset.layout || '';

  if (currentPage === 'books' && layout === 'book-detail') {
    await initBookDetailPage(categories);
  }

  if (currentPage === 'books' && layout !== 'book-detail') {
    await initBooksPage(categories);
  }

  if (currentPage === 'cart') {
    await initCartPage(categories);
  }

  if (currentPage === 'login') {
    initLoginPage();
  }

  if (currentPage === 'register') {
    initRegisterPage();
  }

  if (currentPage === 'contact') {
    initContactPage();
  }

  if (currentPage === 'profile') {
    initProfilePage(categories);
  }

  if (currentPage === 'orders') {
    initOrdersPage(categories);
  }

  if (currentPage === 'order-detail') {
    initOrderDetailPage();
  }

  if (currentPage === 'admin-home') {
    initAdminHomePage();
  }

  if (currentPage === 'admin-orders') {
    initAdminOrdersPage();
  }

  if (currentPage === 'admin-messages') {
    initAdminMessagesPage();
  }

  if (currentPage === 'admin-books') {
    initAdminBooksPage();
  }
};
