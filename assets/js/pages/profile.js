import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { buildBooksUrl } from '../data/catalog.js';
import { getOrders } from '../services/orders.js';
import { updateProfile } from '../services/auth.js';
import { getSessionSnapshot, subscribeSessionStore } from '../state/session-store.js';
import { attachFieldClearHandlers, clearFormState, isValidPhone, setFieldError, showFormMessage } from './forms-shared.js';

let categoriesCache = [];
let stopProfileSubscription = null;
let latestProfileKey = '';
let ordersRequestSequence = 0;
let profileActionsBound = false;
let ordersState = {
  status: 'idle',
  profileKey: '',
  items: [],
  error: null
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
  PENDING_CONFIRMATION: 'Chá» xÃ¡c nháº­n',
  CONFIRMED: 'ÄÃ£ xÃ¡c nháº­n',
  CANCELLED: 'ÄÃ£ há»§y',
  COMPLETED: 'HoÃ n táº¥t'
};

const getContainer = function () {
  return qs('[data-profile-content]');
};

const formatOrderDate = function (value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'KhÃ´ng rÃµ thá»i gian';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsedDate);
};

const resolveOrderStatusLabel = function (status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return ORDER_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Äang xá»­ lÃ½';
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
      <h2>Báº¡n chÆ°a Ä‘Äƒng nháº­p</h2>
      <p>ÄÄƒng nháº­p Ä‘á»ƒ lÆ°u thÃ´ng tin liÃªn há»‡, theo dÃµi giá» sÃ¡ch vÃ  mua sáº¯m thuáº­n tiá»‡n hÆ¡n trong láº§n ghÃ© tiáº¿p theo.</p>
      <div class="empty-state__actions">
        <a href="./login.html" class="btn btn-primary">ÄÄƒng nháº­p</a>
        <a href="./register.html" class="btn btn-secondary">Táº¡o tÃ i khoáº£n</a>
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
        <span class="label-text">Há» vÃ  tÃªn</span>
        <input type="text" name="name" value="${nameValue}" placeholder="Nguyá»…n VÄƒn A" ${profileEditorState.pending ? 'disabled' : ''} autocomplete="name">
        <span class="field-error" id="profile-name-error" data-error-for="name"></span>
      </label>

      <label class="form-field">
        <span class="label-text">Sá»‘ Ä‘iá»‡n thoáº¡i</span>
        <input type="tel" name="phone" value="${phoneValue}" placeholder="0983 376 932" ${profileEditorState.pending ? 'disabled' : ''} autocomplete="tel" inputmode="tel">
        <span class="field-error" id="profile-phone-error" data-error-for="phone"></span>
      </label>

      <div class="form-message" data-form-message aria-live="polite"></div>

      <div class="profile-edit-form__actions">
        <button type="submit" class="btn btn-primary" data-profile-save-button ${profileEditorState.pending ? 'disabled' : ''}>
          ${profileEditorState.pending ? 'Äang lÆ°u...' : 'LÆ°u thay Ä‘á»•i'}
        </button>
        <button type="button" class="btn btn-secondary" data-profile-cancel-button ${profileEditorState.pending ? 'disabled' : ''}>
          Há»§y
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
          <dt>Há» vÃ  tÃªn</dt>
          <dd>${escapeHTML(currentUser.name)}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>${escapeHTML(currentUser.email)}</dd>
        </div>
        <div>
          <dt>Sá»‘ Ä‘iá»‡n thoáº¡i</dt>
          <dd>${escapeHTML(currentUser.phone || 'ChÆ°a cáº­p nháº­t')}</dd>
        </div>
      </dl>
    `;
  const actionsMarkup = profileEditorState.isEditing
    ? ''
    : `
      <div class="profile-card__actions">
        <button type="button" class="btn btn-primary" data-profile-edit-button>Chá»‰nh sá»­a thÃ´ng tin</button>
        <a href="${buildBooksUrl(categoriesCache)}" class="btn btn-secondary">Tiáº¿p tá»¥c chá»n sÃ¡ch</a>
        <button type="button" class="btn btn-secondary" data-logout-button>ÄÄƒng xuáº¥t</button>
      </div>
    `;

  return `
    <article class="profile-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">TÃ i khoáº£n Dzung9fBook</p>
        <h2 class="profile-card__title">${escapeHTML(currentUser.name)}</h2>
        <p class="profile-card__text">ThÃ´ng tin nÃ y Ä‘Æ°á»£c dÃ¹ng Ä‘á»ƒ cÃ¡ nhÃ¢n hÃ³a tráº£i nghiá»‡m mua sÃ¡ch, Ä‘iá»n sáºµn checkout vÃ  giá»¯ liÃªn láº¡c khi báº¡n cáº§n há»— trá»£.</p>
      </div>

      ${buildProfileFeedbackMarkup()}
      ${detailsMarkup}
      ${actionsMarkup}
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
          <p class="profile-card__eyebrow">Lá»‹ch sá»­ Ä‘Æ¡n hÃ ng</p>
          <h2 class="profile-card__title">ÄÆ¡n hÃ ng gáº§n Ä‘Ã¢y</h2>
          <p class="profile-card__text">ChÃºng mÃ¬nh Ä‘ang Ä‘á»“ng bá»™ danh sÃ¡ch Ä‘Æ¡n hÃ ng má»›i nháº¥t cho tÃ i khoáº£n cá»§a báº¡n.</p>
        </div>
      </article>
    `;
  }

  if (ordersState.status === 'unsupported') {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lá»‹ch sá»­ Ä‘Æ¡n hÃ ng</p>
          <h2 class="profile-card__title">ÄÆ¡n hÃ ng gáº§n Ä‘Ã¢y</h2>
          <p class="profile-card__text">Lá»‹ch sá»­ Ä‘Æ¡n hÃ ng hiá»‡n chá»‰ há»— trá»£ khi trang Ä‘ang káº¿t ná»‘i vá»›i backend/API mode.</p>
        </div>
      </article>
    `;
  }

  if (ordersState.status === 'error') {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lá»‹ch sá»­ Ä‘Æ¡n hÃ ng</p>
          <h2 class="profile-card__title">ÄÆ¡n hÃ ng gáº§n Ä‘Ã¢y</h2>
          <p class="profile-card__text">Táº¡m thá»i chÆ°a thá»ƒ táº£i lá»‹ch sá»­ Ä‘Æ¡n hÃ ng. Vui lÃ²ng táº£i láº¡i trang hoáº·c thá»­ láº¡i sau Ã­t phÃºt.</p>
        </div>
      </article>
    `;
  }

  if (!getVisibleOrderItems().length) {
    return `
      <article class="profile-card">
        <div class="profile-card__header">
          <p class="profile-card__eyebrow">Lá»‹ch sá»­ Ä‘Æ¡n hÃ ng</p>
          <h2 class="profile-card__title">ÄÆ¡n hÃ ng gáº§n Ä‘Ã¢y</h2>
          <p class="profile-card__text">Báº¡n chÆ°a cÃ³ Ä‘Æ¡n hÃ ng nÃ o. Khi Ä‘áº·t hÃ ng COD thÃ nh cÃ´ng, danh sÃ¡ch sáº½ hiá»‡n á»Ÿ Ä‘Ã¢y.</p>
        </div>

        <div class="profile-card__actions">
          <a href="${buildBooksUrl(categoriesCache)}" class="btn btn-secondary">KhÃ¡m phÃ¡ danh má»¥c sÃ¡ch</a>
        </div>
      </article>
    `;
  }

  const listMarkup = getVisibleOrderItems().map(function (order) {
    return `
      <div class="profile-item">
        <strong>${escapeHTML(order.orderNumber || 'Don hang')}</strong>
        <p class="profile-card__text">NgÃ y táº¡o: ${escapeHTML(formatOrderDate(order.createdAt))}</p>
        <p class="profile-card__text">Tráº¡ng thÃ¡i: ${escapeHTML(resolveOrderStatusLabel(order.status))}</p>
        <p class="profile-card__text">Sá»‘ lÆ°á»£ng sÃ¡ch: ${escapeHTML(String(Number(order.itemCount || 0)))}</p>
        <p class="profile-card__text">Tá»•ng táº¡m tÃ­nh: ${escapeHTML(formatPrice(order.totalAmount || 0))}</p>
        <div class="profile-item__actions">
          <a href="${buildOrderDetailUrl(order.id)}" class="btn btn-secondary">Xem chi tiáº¿t</a>
        </div>
      </div>
    `;
  }).join('');

  return `
    <article class="profile-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">Lá»‹ch sá»­ Ä‘Æ¡n hÃ ng</p>
        <h2 class="profile-card__title">ÄÆ¡n hÃ ng gáº§n Ä‘Ã¢y</h2>
        <p class="profile-card__text">Danh sÃ¡ch Ä‘Æ°á»£c sáº¯p xáº¿p theo thá»© tá»± má»›i nháº¥t trÆ°á»›c Ä‘á»ƒ báº¡n dá»… theo dÃµi vÃ  má»Ÿ láº¡i chi tiáº¿t khi cáº§n.</p>
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
        <h2>Äang táº£i tÃ i khoáº£n</h2>
        <p>ChÃºng mÃ¬nh Ä‘ang kiá»ƒm tra phiÃªn Ä‘Äƒng nháº­p hiá»‡n táº¡i Ä‘á»ƒ hiá»ƒn thá»‹ Ä‘Ãºng thÃ´ng tin cá»§a báº¡n.</p>
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
      setFieldError(form, 'name', 'Vui lÃ²ng nháº­p há» vÃ  tÃªn.');
      isValid = false;
    }

    if (phone && !isValidPhone(phone)) {
      setFieldError(form, 'phone', 'Sá»‘ Ä‘iá»‡n thoáº¡i cáº§n cÃ³ tá»« 9 Ä‘áº¿n 11 chá»¯ sá»‘ há»£p lá»‡.');
      isValid = false;
    }

    if (!isValid) {
      showFormMessage(form, 'error', 'Vui lÃ²ng kiá»ƒm tra láº¡i thÃ´ng tin cá»§a báº¡n.');
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
          message: 'ThÃ´ng tin liÃªn há»‡ cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t.'
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
          setFieldError(nextForm, 'name', 'Vui lÃ²ng nháº­p há» vÃ  tÃªn.');
        }

        if (error?.payload?.code === 'AUTH_INVALID_PAYLOAD' && phone && !isValidPhone(phone)) {
          setFieldError(nextForm, 'phone', 'Sá»‘ Ä‘iá»‡n thoáº¡i cáº§n cÃ³ tá»« 9 Ä‘áº¿n 11 chá»¯ sá»‘ há»£p lá»‡.');
        }

        showFormMessage(
          nextForm,
          'error',
          error?.payload?.message || error?.message || 'KhÃ´ng thá»ƒ cáº­p nháº­t thÃ´ng tin lÃºc nÃ y. Vui lÃ²ng thá»­ láº¡i sau.'
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
  });
};
