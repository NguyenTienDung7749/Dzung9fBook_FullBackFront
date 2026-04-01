import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { buildBooksUrl } from '../data/catalog.js';
import { getAdminMe } from '../services/admin.js';
import { getOrders } from '../services/orders.js';
import { updateProfile } from '../services/auth.js';
import { getSessionSnapshot, subscribeSessionStore } from '../state/session-store.js';
import { attachFieldClearHandlers, clearFormState, isValidPhone, setFieldError, showFormMessage } from './forms-shared.js';

let categoriesCache = [];
let stopProfileSubscription = null;
let latestProfileKey = '';
let latestAdminProfileKey = '';
let ordersRequestSequence = 0;
let adminAccessRequestSequence = 0;
let profileActionsBound = false;
let ordersState = {
  status: 'idle',
  profileKey: '',
  items: [],
  error: null
};
let adminAccessState = {
  status: 'idle',
  profileKey: '',
  user: null
};
let profileEditorState = {
  isEditing: false,
  pending: false,
  feedback: null,
  draft: {
    name: '',
    phone: ''
  }
};

const ORDER_STATUS_LABELS = {
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất'
};

const getContainer = function () {
  return qs('[data-profile-content]');
};

const formatOrderDate = function (value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Không rõ thời gian';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsedDate);
};

const resolveOrderStatusLabel = function (status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return ORDER_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Đang xử lý';
};

const buildOrderDetailUrl = function (orderId) {
  const normalizedOrderId = String(orderId || '').trim();
  return normalizedOrderId
    ? `./order-detail.html?id=${encodeURIComponent(normalizedOrderId)}`
    : './profile.html';
};

const buildProfileKey = function (user) {
  return String(user?.id || user?.email || user?.name || '').trim();
};

const buildProfileDraft = function (user) {
  return {
    name: String(user?.name || ''),
    phone: String(user?.phone || '')
  };
};

const resetOrdersState = function () {
  ordersState = {
    status: 'idle',
    profileKey: '',
    items: [],
    error: null
  };
};

const resetAdminAccessState = function () {
  adminAccessState = {
    status: 'idle',
    profileKey: '',
    user: null
  };
};

const resetProfileEditorState = function (user = null) {
  profileEditorState = {
    isEditing: false,
    pending: false,
    feedback: null,
    draft: buildProfileDraft(user)
  };
};

const buildProfileFeedbackMarkup = function () {
  if (!profileEditorState.feedback?.message) {
    return '';
  }

  return `
    <div class="form-message is-visible ${profileEditorState.feedback.type === 'success' ? 'is-success' : 'is-error'}" role="${profileEditorState.feedback.type === 'success' ? 'status' : 'alert'}">
      ${escapeHTML(profileEditorState.feedback.message)}
    </div>
  `;
};

const renderAnonymousState = function (container) {
  container.innerHTML = `
    <div class="empty-state empty-state--profile">
      <h2>Bạn chưa đăng nhập</h2>
      <p>Đăng nhập để lưu thông tin liên hệ, theo dõi giỏ sách và mua sắm thuận tiện hơn trong lần ghé tiếp theo.</p>
      <div class="empty-state__actions">
        <a href="./login.html" class="btn btn-primary">Đăng nhập</a>
        <a href="./register.html" class="btn btn-secondary">Tạo tài khoản</a>
      </div>
    </div>
  `;
};

const buildProfileEditFormMarkup = function () {
  const nameValue = escapeHTML(String(profileEditorState.draft?.name || ''));
  const phoneValue = escapeHTML(String(profileEditorState.draft?.phone || ''));

  return `
    <form class="profile-edit-form" data-profile-edit-form novalidate>
      <label class="form-field">
        <span class="label-text">Họ và tên</span>
        <input type="text" name="name" value="${nameValue}" placeholder="Nguyễn Văn A" ${profileEditorState.pending ? 'disabled' : ''} autocomplete="name">
        <span class="field-error" id="profile-name-error" data-error-for="name"></span>
      </label>

      <label class="form-field">
        <span class="label-text">Số điện thoại</span>
        <input type="tel" name="phone" value="${phoneValue}" placeholder="0983 376 932" ${profileEditorState.pending ? 'disabled' : ''} autocomplete="tel" inputmode="tel">
        <span class="field-error" id="profile-phone-error" data-error-for="phone"></span>
      </label>

      <div class="form-message" data-form-message aria-live="polite"></div>

      <div class="profile-edit-form__actions">
        <button type="submit" class="btn btn-primary" data-profile-save-button ${profileEditorState.pending ? 'disabled' : ''}>
          ${profileEditorState.pending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
        <button type="button" class="btn btn-secondary" data-profile-cancel-button ${profileEditorState.pending ? 'disabled' : ''}>
          Hủy
        </button>
      </div>
    </form>
  `;
};

const buildProfileCardMarkup = function (currentUser) {
  const detailsMarkup = profileEditorState.isEditing
    ? buildProfileEditFormMarkup()
    : `
      <dl class="profile-card__details">
        <div>
          <dt>Họ và tên</dt>
          <dd>${escapeHTML(currentUser.name)}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>${escapeHTML(currentUser.email)}</dd>
        </div>
        <div>
          <dt>Số điện thoại</dt>
          <dd>${escapeHTML(currentUser.phone || 'Chưa cập nhật')}</dd>
        </div>
      </dl>
    `;
  const actionsMarkup = profileEditorState.isEditing
    ? ''
    : `
      <div class="profile-card__actions">
        <button type="button" class="btn btn-primary" data-profile-edit-button>Chỉnh sửa thông tin</button>
        <a href="${buildBooksUrl(categoriesCache)}" class="btn btn-secondary">Tiếp tục chọn sách</a>
        <button type="button" class="btn btn-secondary" data-logout-button>Đăng xuất</button>
      </div>
    `;

  return `
    <article class="profile-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">Tài khoản Dzung9fBook</p>
        <h2 class="profile-card__title">${escapeHTML(currentUser.name)}</h2>
        <p class="profile-card__text">Thông tin này được dùng để cá nhân hóa trải nghiệm mua sách, điền sẵn checkout và giữ liên lạc khi bạn cần hỗ trợ.</p>
      </div>

      ${buildProfileFeedbackMarkup()}
      ${detailsMarkup}
      ${actionsMarkup}
    </article>
  `;
};

const buildAdminAccessCardMarkup = function () {
  if (adminAccessState.status !== 'ready' || !adminAccessState.user) {
    return '';
  }

  return `
    <article class="profile-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">Khu quản trị</p>
        <h2 class="profile-card__title">Lối vào dành cho staff/admin</h2>
        <p class="profile-card__text">Tài khoản hiện tại có thể mở nhanh khu quản trị để xử lý đơn hàng, tồn kho sách và các tin nhắn liên hệ.</p>
      </div>

      <div class="profile-card__actions">
        <a href="./admin.html" class="btn btn-primary">Vào khu quản trị</a>
      </div>
    </article>
  `;
};

const getVisibleOrderItems = function () {
  return Array.isArray(ordersState.items) ? ordersState.items : [];
};

const buildOrderHistoryMarkup = function () {
  if (ordersState.status === 'loading' || ordersState.status === 'idle') {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lịch sử đơn hàng</p>
          <h2 class="profile-card__title">Đơn hàng gần đây</h2>
          <p class="profile-card__text">Chúng mình đang đồng bộ danh sách đơn hàng mới nhất cho tài khoản của bạn.</p>
        </div>
      </article>
    `;
  }

  if (ordersState.status === 'unsupported') {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lịch sử đơn hàng</p>
          <h2 class="profile-card__title">Đơn hàng gần đây</h2>
          <p class="profile-card__text">Lịch sử đơn hàng hiện chỉ hỗ trợ khi trang đang kết nối với backend/API mode.</p>
        </div>
      </article>
    `;
  }

  if (ordersState.status === 'error') {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lịch sử đơn hàng</p>
          <h2 class="profile-card__title">Đơn hàng gần đây</h2>
          <p class="profile-card__text">Tạm thời chưa thể tải lịch sử đơn hàng. Vui lòng tải lại trang hoặc thử lại sau ít phút.</p>
        </div>
      </article>
    `;
  }

  if (!getVisibleOrderItems().length) {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lịch sử đơn hàng</p>
          <h2 class="profile-card__title">Đơn hàng gần đây</h2>
          <p class="profile-card__text">Bạn chưa có đơn hàng nào. Khi đặt hàng COD thành công, danh sách sẽ hiện ở đây.</p>
        </div>

        <div class="profile-card__actions">
          <a href="${buildBooksUrl(categoriesCache)}" class="btn btn-secondary">Khám phá danh mục sách</a>
        </div>
      </article>
    `;
  }

  const listMarkup = getVisibleOrderItems().map(function (order) {
    return `
      <div class="profile-item">
        <strong>${escapeHTML(order.orderNumber || 'Don hang')}</strong>
        <p class="profile-card__text">Ngày tạo: ${escapeHTML(formatOrderDate(order.createdAt))}</p>
        <p class="profile-card__text">Trạng thái: ${escapeHTML(resolveOrderStatusLabel(order.status))}</p>
        <p class="profile-card__text">Số lượng sách: ${escapeHTML(String(Number(order.itemCount || 0)))}</p>
        <p class="profile-card__text">Tổng tạm tính: ${escapeHTML(formatPrice(order.totalAmount || 0))}</p>
        <div class="profile-item__actions">
          <a href="${buildOrderDetailUrl(order.id)}" class="btn btn-secondary">Xem chi tiết</a>
        </div>
      </div>
    `;
  }).join('');

  return `
    <article class="profile-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">Lịch sử đơn hàng</p>
        <h2 class="profile-card__title">Đơn hàng gần đây</h2>
        <p class="profile-card__text">Danh sách được sắp xếp theo thứ tự mới nhất trước để bạn dễ theo dõi và mở lại chi tiết khi cần.</p>
      </div>

      <div class="profile-grid">
        ${listMarkup}
      </div>
    </article>
  `;
};

const syncEditFormBindings = function () {
  const container = getContainer();
  const form = qs('[data-profile-edit-form]', container);

  if (form) {
    attachFieldClearHandlers(form);
  }
};

export const renderProfilePage = function () {
  const container = getContainer();

  if (!container) {
    return;
  }

  const session = getSessionSnapshot();
  const currentUser = session.currentUser;

  if (!currentUser) {
    resetProfileEditorState();
  } else if (!profileEditorState.isEditing && !profileEditorState.pending) {
    profileEditorState = {
      ...profileEditorState,
      draft: buildProfileDraft(currentUser)
    };
  }

  if (session.authStatus === 'loading' && !currentUser) {
    container.innerHTML = `
      <div class="empty-state empty-state--profile">
        <h2>Đang tải tài khoản</h2>
        <p>Chúng mình đang kiểm tra phiên đăng nhập hiện tại để hiển thị đúng thông tin của bạn.</p>
      </div>
    `;
    return;
  }

  if (!currentUser) {
    renderAnonymousState(container);
    return;
  }

  container.innerHTML = `
    <div class="profile-grid">
      ${buildProfileCardMarkup(currentUser)}
      ${buildAdminAccessCardMarkup()}
      ${buildOrderHistoryMarkup()}
    </div>
  `;

  syncEditFormBindings();
};

const loadOrdersForCurrentUser = async function (profileKey) {
  const requestId = ordersRequestSequence + 1;
  ordersRequestSequence = requestId;
  ordersState = {
    status: isApiProviderMode() ? 'loading' : 'unsupported',
    profileKey,
    items: [],
    error: null
  };
  renderProfilePage();

  if (!isApiProviderMode()) {
    return;
  }

  try {
    const items = await getOrders();

    if (requestId !== ordersRequestSequence) {
      return;
    }

    ordersState = {
      status: 'ready',
      profileKey,
      items: Array.isArray(items) ? items : [],
      error: null
    };
  } catch (error) {
    if (requestId !== ordersRequestSequence) {
      return;
    }

    ordersState = {
      status: error?.code === 'ORDERS_UNSUPPORTED' || error?.status === 501 ? 'unsupported' : 'error',
      profileKey,
      items: [],
      error
    };
    console.error(error);
  }

  renderProfilePage();
};

const loadAdminAccessForCurrentUser = async function (profileKey) {
  const requestId = adminAccessRequestSequence + 1;
  adminAccessRequestSequence = requestId;
  adminAccessState = {
    status: isApiProviderMode() ? 'loading' : 'unsupported',
    profileKey,
    user: null
  };
  renderProfilePage();

  if (!isApiProviderMode()) {
    return;
  }

  try {
    const adminUser = await getAdminMe();

    if (requestId !== adminAccessRequestSequence) {
      return;
    }

    adminAccessState = {
      status: 'ready',
      profileKey,
      user: adminUser || null
    };
  } catch (error) {
    if (requestId !== adminAccessRequestSequence) {
      return;
    }

    adminAccessState = {
      status: error?.status === 401
        ? 'unauthorized'
        : error?.status === 403
          ? 'forbidden'
          : error?.code === 'ADMIN_UNSUPPORTED' || error?.status === 501
            ? 'unsupported'
            : 'error',
      profileKey,
      user: null
    };

    if (error?.status !== 401 && error?.status !== 403 && error?.status !== 501 && error?.code !== 'ADMIN_UNSUPPORTED') {
      console.error(error);
    }
  }

  renderProfilePage();
};

const syncProfileOrders = function () {
  const session = getSessionSnapshot();
  const currentUser = session.currentUser;

  if (!currentUser) {
    latestProfileKey = '';
    ordersRequestSequence += 1;
    resetOrdersState();
    resetProfileEditorState();
    renderProfilePage();
    return;
  }

  const profileKey = buildProfileKey(currentUser);

  if (!profileKey) {
    renderProfilePage();
    return;
  }

  if (profileKey === latestProfileKey && ordersState.profileKey === profileKey && ordersState.status !== 'idle') {
    renderProfilePage();
    return;
  }

  latestProfileKey = profileKey;
  void loadOrdersForCurrentUser(profileKey);
};

const syncProfileAdminAccess = function () {
  const session = getSessionSnapshot();
  const currentUser = session.currentUser;

  if (!currentUser) {
    latestAdminProfileKey = '';
    adminAccessRequestSequence += 1;
    resetAdminAccessState();
    renderProfilePage();
    return;
  }

  const profileKey = buildProfileKey(currentUser);

  if (!profileKey) {
    renderProfilePage();
    return;
  }

  if (profileKey === latestAdminProfileKey && adminAccessState.profileKey === profileKey && adminAccessState.status !== 'idle') {
    renderProfilePage();
    return;
  }

  latestAdminProfileKey = profileKey;
  void loadAdminAccessForCurrentUser(profileKey);
};

const bindProfileActions = function () {
  const container = getContainer();

  if (!container || profileActionsBound) {
    return;
  }

  profileActionsBound = true;

  container.addEventListener('click', function (event) {
    const editButton = event.target.closest('[data-profile-edit-button]');
    const cancelButton = event.target.closest('[data-profile-cancel-button]');
    const currentUser = getSessionSnapshot().currentUser;

    if (editButton && currentUser) {
      profileEditorState = {
        isEditing: true,
        pending: false,
        feedback: null,
        draft: buildProfileDraft(currentUser)
      };
      renderProfilePage();
      return;
    }

    if (cancelButton && currentUser) {
      profileEditorState = {
        isEditing: false,
        pending: false,
        feedback: null,
        draft: buildProfileDraft(currentUser)
      };
      renderProfilePage();
    }
  });

  container.addEventListener('input', function (event) {
    const form = event.target.closest('[data-profile-edit-form]');

    if (!form) {
      return;
    }

    const fieldName = String(event.target.name || '').trim();

    if (fieldName !== 'name' && fieldName !== 'phone') {
      return;
    }

    profileEditorState = {
      ...profileEditorState,
      feedback: null,
      draft: {
        ...profileEditorState.draft,
        [fieldName]: event.target.value
      }
    };
  });

  container.addEventListener('submit', function (event) {
    const form = event.target.closest('[data-profile-edit-form]');

    if (!form) {
      return;
    }

    event.preventDefault();

    if (profileEditorState.pending) {
      return;
    }

    clearFormState(form);

    const name = String(profileEditorState.draft?.name || '').trim();
    const phone = String(profileEditorState.draft?.phone || '').trim();
    let isValid = true;

    if (!name) {
      setFieldError(form, 'name', 'Vui lòng nhập họ và tên.');
      isValid = false;
    }

    if (phone && !isValidPhone(phone)) {
      setFieldError(form, 'phone', 'Số điện thoại cần có từ 9 đến 11 chữ số hợp lệ.');
      isValid = false;
    }

    if (!isValid) {
      showFormMessage(form, 'error', 'Vui lòng kiểm tra lại thông tin của bạn.');
      return;
    }

    profileEditorState = {
      ...profileEditorState,
      pending: true,
      feedback: null,
      draft: {
        name,
        phone
      }
    };
    renderProfilePage();

    void updateProfile({
      name,
      phone
    }).then(function (payload) {
      profileEditorState = {
        isEditing: false,
        pending: false,
        feedback: {
          type: 'success',
          message: 'Thông tin liên hệ của bạn đã được cập nhật.'
        },
        draft: buildProfileDraft(payload?.user || getSessionSnapshot().currentUser)
      };
      renderProfilePage();
    }).catch(function (error) {
      profileEditorState = {
        ...profileEditorState,
        pending: false
      };
      renderProfilePage();

      const nextForm = qs('[data-profile-edit-form]', getContainer());

      if (nextForm) {
        if (error?.payload?.code === 'AUTH_INVALID_PAYLOAD' && !name) {
          setFieldError(nextForm, 'name', 'Vui lòng nhập họ và tên.');
        }

        if (error?.payload?.code === 'AUTH_INVALID_PAYLOAD' && phone && !isValidPhone(phone)) {
          setFieldError(nextForm, 'phone', 'Số điện thoại cần có từ 9 đến 11 chữ số hợp lệ.');
        }

        showFormMessage(
          nextForm,
          'error',
          error?.payload?.message || error?.message || 'Không thể cập nhật thông tin lúc này. Vui lòng thử lại sau.'
        );
      }

      console.error(error);
    });
  });
};

export const initProfilePage = function (categories) {
  categoriesCache = categories;

  if (typeof stopProfileSubscription === 'function') {
    stopProfileSubscription();
  }

  bindProfileActions();

  stopProfileSubscription = subscribeSessionStore(function () {
    syncProfileOrders();
    syncProfileAdminAccess();
  });
};
