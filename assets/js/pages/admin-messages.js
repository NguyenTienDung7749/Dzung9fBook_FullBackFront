import { qs } from '../core/dom.js';
import { escapeHTML } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { getAdminMessages, updateAdminMessageStatus } from '../services/admin.js';

const MESSAGE_STATUS_LABELS = {
  RECEIVED: 'Má»›i nháº­n',
  IN_PROGRESS: 'Äang xá»­ lÃ½',
  RESOLVED: 'ÄÃ£ giáº£i quyáº¿t',
  CLOSED: 'ÄÃ£ Ä‘Ã³ng'
};

const MESSAGE_STATUS_OPTIONS = [
  ['RECEIVED', 'Má»›i nháº­n'],
  ['IN_PROGRESS', 'Äang xá»­ lÃ½'],
  ['RESOLVED', 'ÄÃ£ giáº£i quyáº¿t'],
  ['CLOSED', 'ÄÃ£ Ä‘Ã³ng']
];

let state = {
  status: 'idle',
  filter: '',
  searchTerm: '',
  items: [],
  pendingMessageId: '',
  feedbackById: {}
};

const getContent = function () {
  return qs('[data-admin-messages-content]');
};

const getFilter = function () {
  return qs('[data-admin-messages-filter]');
};

const getSearchInput = function () {
  return qs('[data-admin-messages-search]');
};

const normalizeSearchText = function (value) {
  return String(value || '').trim().toLowerCase();
};

const formatDateTime = function (value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'KhÃ´ng rÃµ thá»i gian';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsedDate);
};

const resolveMessageStatusLabel = function (status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return MESSAGE_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Äang xá»­ lÃ½';
};

const buildStateMarkup = function (title, description, actionMarkup = '') {
  return `
    <div class="empty-state">
      <h2>${title}</h2>
      <p>${description}</p>
      ${actionMarkup ? `<div class="empty-state__actions">${actionMarkup}</div>` : ''}
    </div>
  `;
};

const buildFeedbackMarkup = function (feedback) {
  if (!feedback?.message) {
    return '<div class="form-message"></div>';
  }

  return `
    <div class="form-message is-visible ${feedback.type === 'success' ? 'is-success' : 'is-error'}">
      ${escapeHTML(feedback.message)}
    </div>
  `;
};

const buildMessageOptionsMarkup = function (currentValue) {
  return MESSAGE_STATUS_OPTIONS.map(function ([value, label]) {
    const normalizedValue = String(value || '').trim().toUpperCase();
    const isSelected = normalizedValue === String(currentValue || '').trim().toUpperCase();
    return `<option value="${normalizedValue}" ${isSelected ? 'selected' : ''}>${escapeHTML(label)}</option>`;
  }).join('');
};

const getVisibleItems = function () {
  const searchTerm = normalizeSearchText(state.searchTerm);

  if (!searchTerm) {
    return Array.isArray(state.items) ? state.items : [];
  }

  return (Array.isArray(state.items) ? state.items : []).filter(function (message) {
    return [
      message.name,
      message.email,
      message.phone,
      message.message,
      message.adminNote
    ].some(function (value) {
      return normalizeSearchText(value).includes(searchTerm);
    });
  });
};

const buildResultsSummaryMarkup = function (visibleCount, totalCount) {
  const isFiltered = Boolean(String(state.filter || '').trim()) || Boolean(normalizeSearchText(state.searchTerm));
  const summaryText = isFiltered
    ? `Äang hiá»ƒn thá»‹ ${visibleCount} / ${totalCount} liÃªn há»‡ phÃ¹ há»£p vá»›i bá»™ lá»c hiá»‡n táº¡i.`
    : `Äang hiá»ƒn thá»‹ ${visibleCount} liÃªn há»‡ má»›i nháº¥t.`;

  return `<p class="admin-results-summary">${escapeHTML(summaryText)}</p>`;
};

const buildMessageCardMarkup = function (message) {
  const messageId = String(message?.id || '').trim();
  const isPending = state.pendingMessageId === messageId;
  const feedback = state.feedbackById[messageId] || null;

  return `
    <article class="profile-card admin-card">
      <div class="profile-card__header">
        <p class="profile-card__eyebrow">${escapeHTML(resolveMessageStatusLabel(message.status))}</p>
        <h2 class="profile-card__title">${escapeHTML(message.name || 'LiÃªn há»‡')}</h2>
        <p class="profile-card__text">Gá»­i lÃºc ${escapeHTML(formatDateTime(message.createdAt))}</p>
      </div>

      <dl class="admin-meta">
        <div class="admin-meta__item">
          <dt>Email</dt>
          <dd>${escapeHTML(message.email || 'ChÆ°a cÃ³')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Sá»‘ Ä‘iá»‡n thoáº¡i</dt>
          <dd>${escapeHTML(message.phone || 'ChÆ°a cÃ³')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>NgÆ°á»i xá»­ lÃ½</dt>
          <dd>${escapeHTML(message.handledById || 'ChÆ°a gÃ¡n')}</dd>
        </div>
      </dl>

      <div class="admin-message-body">
        <strong>Ná»™i dung liÃªn há»‡</strong>
        <p>${escapeHTML(message.message || 'ChÆ°a cÃ³ ná»™i dung')}</p>
      </div>

      <form class="admin-status-form" data-admin-message-form data-message-id="${escapeHTML(messageId)}">
        <div class="admin-status-form__grid admin-status-form__grid--stack">
          <label class="form-field">
            <span class="label-text">Tráº¡ng thÃ¡i liÃªn há»‡</span>
            <select name="status" ${isPending ? 'disabled' : ''}>
              ${buildMessageOptionsMarkup(message.status)}
            </select>
          </label>

          <label class="form-field">
            <span class="label-text">Ghi chÃº ná»™i bá»™</span>
            <textarea name="adminNote" rows="4" placeholder="Ghi chÃº ngáº¯n cho staff/admin khÃ¡c..." ${isPending ? 'disabled' : ''}>${escapeHTML(message.adminNote || '')}</textarea>
          </label>
        </div>

        ${buildFeedbackMarkup(feedback)}
        <button class="btn btn-primary" type="submit" data-save-button ${isPending ? 'disabled' : ''}>
          ${isPending ? 'Äang lÆ°u...' : 'LÆ°u thay Ä‘á»•i'}
        </button>
      </form>
    </article>
  `;
};

const render = function () {
  const container = getContent();

  if (!container) {
    return;
  }

  if (!isApiProviderMode()) {
    container.innerHTML = buildStateMarkup(
      'Admin UI chá»‰ há»— trá»£ khi cháº¡y backend',
      'Trang nÃ y cáº§n API mode Ä‘á»ƒ táº£i vÃ  cáº­p nháº­t dá»¯ liá»‡u quáº£n trá»‹.',
      '<a href="./index.html" class="btn btn-secondary">Quay vá» trang chá»§</a>'
    );
    return;
  }

  if (state.status === 'loading' || state.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Äang táº£i danh sÃ¡ch liÃªn há»‡',
      'ChÃºng mÃ¬nh Ä‘ang Ä‘á»“ng bá»™ cÃ¡c tin nháº¯n há»— trá»£ má»›i nháº¥t tá»« backend.'
    );
    return;
  }

  if (state.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Báº¡n cáº§n Ä‘Äƒng nháº­p',
      'Vui lÃ²ng Ä‘Äƒng nháº­p báº±ng tÃ i khoáº£n staff/admin Ä‘á»ƒ truy cáº­p khu vá»±c quáº£n trá»‹ liÃªn há»‡.',
      '<a href="./login.html" class="btn btn-primary">ÄÄƒng nháº­p</a>'
    );
    return;
  }

  if (state.status === 'forbidden') {
    container.innerHTML = buildStateMarkup(
      'Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p',
      'TÃ i khoáº£n hiá»‡n táº¡i khÃ´ng thuá»™c nhÃ³m staff/admin nÃªn khÃ´ng thá»ƒ dÃ¹ng trang quáº£n trá»‹ nÃ y.',
      '<a href="./profile.html" class="btn btn-secondary">Vá» há»“ sÆ¡</a>'
    );
    return;
  }

  if (state.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'KhÃ´ng thá»ƒ táº£i tin nháº¯n há»— trá»£',
      'Backend chÆ°a pháº£n há»“i á»•n Ä‘á»‹nh lÃºc nÃ y. Vui lÃ²ng thá»­ táº£i láº¡i trang hoáº·c quay láº¡i sau.',
      '<a href="./admin-messages.html" class="btn btn-primary">Thá»­ táº£i láº¡i</a>'
    );
    return;
  }

  const visibleItems = getVisibleItems();

  if (!state.items.length) {
    container.innerHTML = buildStateMarkup(
      'ChÆ°a cÃ³ liÃªn há»‡ phÃ¹ há»£p',
      state.filter
        ? 'KhÃ´ng cÃ³ tin nháº¯n nÃ o khá»›p vá»›i bá»™ lá»c tráº¡ng thÃ¡i hiá»‡n táº¡i.'
        : 'Danh sÃ¡ch liÃªn há»‡ hiá»‡n Ä‘ang trá»‘ng.'
    );
    return;
  }

  if (!visibleItems.length) {
    container.innerHTML = buildStateMarkup(
      'KhÃ´ng cÃ³ káº¿t quáº£ phÃ¹ há»£p',
      'KhÃ´ng tÃ¬m tháº¥y tin nháº¯n nÃ o khá»›p vá»›i tá»« khÃ³a tÃ¬m kiáº¿m hiá»‡n táº¡i.'
    );
    return;
  }

  container.innerHTML = `
    ${buildResultsSummaryMarkup(visibleItems.length, state.items.length)}
    <div class="admin-list">
      ${visibleItems.map(buildMessageCardMarkup).join('')}
    </div>
  `;
};

const setPageStateFromError = function (error) {
  if (error?.status === 401) {
    state = {
      ...state,
      status: 'unauthorized',
      items: [],
      pendingMessageId: '',
      feedbackById: {}
    };
    render();
    return true;
  }

  if (error?.status === 403) {
    state = {
      ...state,
      status: 'forbidden',
      items: [],
      pendingMessageId: '',
      feedbackById: {}
    };
    render();
    return true;
  }

  return false;
};

const loadMessages = async function () {
  state = {
    ...state,
    status: 'loading',
    items: [],
    pendingMessageId: '',
    feedbackById: {}
  };
  render();

  try {
    const items = await getAdminMessages(state.filter);
    state = {
      ...state,
      status: 'ready',
      items: Array.isArray(items) ? items : [],
      pendingMessageId: '',
      feedbackById: {}
    };
  } catch (error) {
    if (setPageStateFromError(error)) {
      return;
    }

    state = {
      ...state,
      status: 'error',
      items: [],
      pendingMessageId: '',
      feedbackById: {}
    };
    console.error(error);
  }

  render();
};

const updateMessageInState = function (messageId, patch) {
  state = {
    ...state,
    items: state.items.map(function (item) {
      return item.id === messageId ? { ...item, ...patch } : item;
    })
  };
};

const bindFilter = function () {
  const filter = getFilter();

  if (!filter) {
    return;
  }

  filter.addEventListener('change', function () {
    state = {
      ...state,
      filter: String(filter.value || '').trim()
    };
    void loadMessages();
  });
};

const bindSearch = function () {
  const searchInput = getSearchInput();

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener('input', function () {
    state = {
      ...state,
      searchTerm: String(searchInput.value || '').trim()
    };
    render();
  });
};

const bindActions = function () {
  const container = getContent();

  if (!container) {
    return;
  }

  container.addEventListener('submit', function (event) {
    const form = event.target.closest('[data-admin-message-form]');

    if (!form) {
      return;
    }

    event.preventDefault();

    const messageId = String(form.dataset.messageId || '').trim();

    if (!messageId || state.pendingMessageId) {
      return;
    }

    state = {
      ...state,
      pendingMessageId: messageId,
      feedbackById: {
        ...state.feedbackById,
        [messageId]: null
      }
    };
    render();

    void updateAdminMessageStatus(messageId, {
      status: String(form.elements.status?.value || '').trim(),
      adminNote: String(form.elements.adminNote?.value || '').trim()
    }).then(function (updatedMessage) {
      updateMessageInState(messageId, updatedMessage || {});
      state = {
        ...state,
        pendingMessageId: '',
        feedbackById: {
          ...state.feedbackById,
          [messageId]: {
            type: 'success',
            message: 'ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i liÃªn há»‡.'
          }
        }
      };
      render();
    }).catch(function (error) {
      if (setPageStateFromError(error)) {
        return;
      }

      state = {
        ...state,
        pendingMessageId: '',
        feedbackById: {
          ...state.feedbackById,
          [messageId]: {
            type: 'error',
            message: error?.payload?.message || error?.message || 'KhÃ´ng thá»ƒ lÆ°u thay Ä‘á»•i lÃºc nÃ y.'
          }
        }
      };
      render();
      console.error(error);
    });
  });
};

export const initAdminMessagesPage = function () {
  if (!getContent()) {
    return;
  }

  bindFilter();
  bindSearch();
  bindActions();
  render();
  void loadMessages();
};
