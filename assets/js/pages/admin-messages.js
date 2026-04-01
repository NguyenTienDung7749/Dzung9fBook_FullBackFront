import { qs } from '../core/dom.js';
import { escapeHTML } from '../core/utils.js';
import { isApiProviderMode } from '../config/runtime.js';
import { getAdminMessages, updateAdminMessageStatus } from '../services/admin.js';

const MESSAGE_STATUS_LABELS = {
  RECEIVED: 'Mới nhận',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đã đóng'
};

const MESSAGE_STATUS_OPTIONS = [
  ['RECEIVED', 'Mới nhận'],
  ['IN_PROGRESS', 'Đang xử lý'],
  ['RESOLVED', 'Đã giải quyết'],
  ['CLOSED', 'Đã đóng']
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
    return 'Không rõ thời gian';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsedDate);
};

const resolveMessageStatusLabel = function (status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return MESSAGE_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Đang xử lý';
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
    ? `Đang hiển thị ${visibleCount} / ${totalCount} liên hệ phù hợp với bộ lọc hiện tại.`
    : `Đang hiển thị ${visibleCount} liên hệ mới nhất.`;

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
        <h2 class="profile-card__title">${escapeHTML(message.name || 'Liên hệ')}</h2>
        <p class="profile-card__text">Gửi lúc ${escapeHTML(formatDateTime(message.createdAt))}</p>
      </div>

      <dl class="admin-meta">
        <div class="admin-meta__item">
          <dt>Email</dt>
          <dd>${escapeHTML(message.email || 'Chưa có')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Số điện thoại</dt>
          <dd>${escapeHTML(message.phone || 'Chưa có')}</dd>
        </div>
        <div class="admin-meta__item">
          <dt>Người xử lý</dt>
          <dd>${escapeHTML(message.handledById || 'Chưa gán')}</dd>
        </div>
      </dl>

      <div class="admin-message-body">
        <strong>Nội dung liên hệ</strong>
        <p>${escapeHTML(message.message || 'Chưa có nội dung')}</p>
      </div>

      <form class="admin-status-form" data-admin-message-form data-message-id="${escapeHTML(messageId)}">
        <div class="admin-status-form__grid admin-status-form__grid--stack">
          <label class="form-field">
            <span class="label-text">Trạng thái liên hệ</span>
            <select name="status" ${isPending ? 'disabled' : ''}>
              ${buildMessageOptionsMarkup(message.status)}
            </select>
          </label>

          <label class="form-field">
            <span class="label-text">Ghi chú nội bộ</span>
            <textarea name="adminNote" rows="4" placeholder="Ghi chú ngắn cho staff/admin khác..." ${isPending ? 'disabled' : ''}>${escapeHTML(message.adminNote || '')}</textarea>
          </label>
        </div>

        ${buildFeedbackMarkup(feedback)}
        <button class="btn btn-primary" type="submit" data-save-button ${isPending ? 'disabled' : ''}>
          ${isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
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
      'Admin UI chỉ hỗ trợ khi chạy backend',
      'Trang này cần API mode để tải và cập nhật dữ liệu quản trị.',
      '<a href="./index.html" class="btn btn-secondary">Quay về trang chủ</a>'
    );
    return;
  }

  if (state.status === 'loading' || state.status === 'idle') {
    container.innerHTML = buildStateMarkup(
      'Đang tải danh sách liên hệ',
      'Chúng mình đang đồng bộ các tin nhắn hỗ trợ mới nhất từ backend.'
    );
    return;
  }

  if (state.status === 'unauthorized') {
    container.innerHTML = buildStateMarkup(
      'Bạn cần đăng nhập',
      'Vui lòng đăng nhập bằng tài khoản staff/admin để truy cập khu vực quản trị liên hệ.',
      '<a href="./login.html" class="btn btn-primary">Đăng nhập</a>'
    );
    return;
  }

  if (state.status === 'forbidden') {
    container.innerHTML = buildStateMarkup(
      'Bạn không có quyền truy cập',
      'Tài khoản hiện tại không thuộc nhóm staff/admin nên không thể dùng trang quản trị này.',
      '<a href="./profile.html" class="btn btn-secondary">Về hồ sơ</a>'
    );
    return;
  }

  if (state.status === 'error') {
    container.innerHTML = buildStateMarkup(
      'Không thể tải tin nhắn hỗ trợ',
      'Backend chưa phản hồi ổn định lúc này. Vui lòng thử tải lại trang hoặc quay lại sau.',
      '<a href="./admin-messages.html" class="btn btn-primary">Thử tải lại</a>'
    );
    return;
  }

  const visibleItems = getVisibleItems();

  if (!state.items.length) {
    container.innerHTML = buildStateMarkup(
      'Chưa có liên hệ phù hợp',
      state.filter
        ? 'Không có tin nhắn nào khớp với bộ lọc trạng thái hiện tại.'
        : 'Danh sách liên hệ hiện đang trống.'
    );
    return;
  }

  if (!visibleItems.length) {
    container.innerHTML = buildStateMarkup(
      'Không có kết quả phù hợp',
      'Không tìm thấy tin nhắn nào khớp với từ khóa tìm kiếm hiện tại.'
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
            message: 'Đã cập nhật trạng thái liên hệ.'
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
            message: error?.payload?.message || error?.message || 'Không thể lưu thay đổi lúc này.'
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
