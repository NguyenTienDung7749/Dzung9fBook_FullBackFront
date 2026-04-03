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

const MESSAGE_STATUS_TONES = {
  RECEIVED: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  CLOSED: 'neutral'
};

let state = {
  status: 'idle',
  filter: '',
  searchTerm: '',
  items: [],
  pendingMessageId: '',
  feedbackById: {},
  selectedMessageId: '',
  draftById: {}
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

const normalizeText = function (value) {
  return String(value || '').trim();
};

const normalizeSearchText = function (value) {
  return normalizeText(value).toLowerCase();
};

const normalizeEnumValue = function (value) {
  return normalizeText(value).toUpperCase();
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
  const normalizedStatus = normalizeEnumValue(status);
  return MESSAGE_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Đang xử lý';
};

const resolveMessageStatusTone = function (status) {
  const normalizedStatus = normalizeEnumValue(status);
  return MESSAGE_STATUS_TONES[normalizedStatus] || 'neutral';
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
    <div class="form-message is-visible ${feedback.type === 'success' ? 'is-success' : 'is-error'}" role="${feedback.type === 'success' ? 'status' : 'alert'}">
      ${escapeHTML(feedback.message)}
    </div>
  `;
};

const buildStatusBadgeMarkup = function (label, tone) {
  return `
    <span class="admin-status-badge admin-status-badge--${escapeHTML(tone || 'neutral')}">
      ${escapeHTML(label)}
    </span>
  `;
};

const buildListStatMarkup = function (label, value) {
  return `
    <div class="admin-list-stat">
      <dt>${escapeHTML(label)}</dt>
      <dd>${escapeHTML(value)}</dd>
    </div>
  `;
};

const buildMetaItemMarkup = function (label, value) {
  return `
    <div class="admin-meta__item">
      <dt>${escapeHTML(label)}</dt>
      <dd>${escapeHTML(value)}</dd>
    </div>
  `;
};

const buildMessageOptionsMarkup = function (currentValue) {
  return MESSAGE_STATUS_OPTIONS.map(function ([value, label]) {
    const normalizedValue = normalizeEnumValue(value);
    const isSelected = normalizedValue === normalizeEnumValue(currentValue);
    return `<option value="${normalizedValue}" ${isSelected ? 'selected' : ''}>${escapeHTML(label)}</option>`;
  }).join('');
};

const buildDraftFromMessage = function (message) {
  return {
    status: normalizeEnumValue(message?.status),
    adminNote: normalizeText(message?.adminNote)
  };
};

const getDraftForMessage = function (message) {
  const messageId = normalizeText(message?.id);
  return state.draftById[messageId] || buildDraftFromMessage(message);
};

const setDraftForMessage = function (messageId, draft) {
  state = {
    ...state,
    draftById: {
      ...state.draftById,
      [messageId]: draft
    },
    feedbackById: {
      ...state.feedbackById,
      [messageId]: null
    }
  };
};

const clearDraftForMessage = function (messageId) {
  const nextDraftById = { ...state.draftById };
  delete nextDraftById[messageId];

  state = {
    ...state,
    draftById: nextDraftById
  };
};

const getVisibleItems = function () {
  const searchTerm = normalizeSearchText(state.searchTerm);
  const items = Array.isArray(state.items) ? state.items : [];

  if (!searchTerm) {
    return items;
  }

  return items.filter(function (message) {
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

const syncSelectedMessage = function (visibleItems) {
  const items = Array.isArray(visibleItems) ? visibleItems : [];
  const currentSelection = items.find(function (message) {
    return normalizeText(message.id) === normalizeText(state.selectedMessageId);
  }) || null;
  const nextSelection = currentSelection || items[0] || null;
  const nextSelectedMessageId = normalizeText(nextSelection?.id);

  if (nextSelectedMessageId !== normalizeText(state.selectedMessageId)) {
    state = {
      ...state,
      selectedMessageId: nextSelectedMessageId
    };
  }

  return nextSelection;
};

const buildResultsSummaryMarkup = function (visibleCount, totalCount) {
  const isFiltered = Boolean(normalizeText(state.filter)) || Boolean(normalizeSearchText(state.searchTerm));
  const summaryText = isFiltered
    ? `Đang hiển thị ${visibleCount} / ${totalCount} liên hệ phù hợp với bộ lọc hiện tại.`
    : `Đang hiển thị ${visibleCount} liên hệ mới nhất.`;

  return `<p class="admin-results-summary">${escapeHTML(summaryText)}</p>`;
};

const buildMessageContactLine = function (message) {
  const parts = [
    normalizeText(message?.email) || 'Chưa có email',
    normalizeText(message?.phone) || 'Chưa có số điện thoại'
  ].filter(Boolean);

  return parts.join(' • ');
};

const buildAssignmentLabel = function (message) {
  return normalizeText(message?.handledById) ? 'Đã gán xử lý' : 'Chưa gán xử lý';
};

const buildMessageDetailMarkup = function (message) {
  const messageId = normalizeText(message?.id);
  const draft = getDraftForMessage(message);
  const isPending = normalizeText(state.pendingMessageId) === messageId;
  const feedback = state.feedbackById[messageId] || null;

  return `
    <div class="admin-detail">
      <div class="admin-detail__header">
        <div class="admin-detail__title-block">
          <p class="profile-card__eyebrow">Chi tiết liên hệ</p>
          <h2 class="admin-detail__title">${escapeHTML(message.name || 'Liên hệ')}</h2>
          <p class="admin-detail__text">Gửi lúc ${escapeHTML(formatDateTime(message.createdAt))}</p>
        </div>

        <div class="admin-badge-row">
          ${buildStatusBadgeMarkup(resolveMessageStatusLabel(message.status), resolveMessageStatusTone(message.status))}
          ${buildStatusBadgeMarkup(buildAssignmentLabel(message), normalizeText(message.handledById) ? 'info' : 'neutral')}
        </div>
      </div>

      <dl class="admin-meta admin-meta--detail">
        ${buildMetaItemMarkup('Email', normalizeText(message.email) || 'Chưa có')}
        ${buildMetaItemMarkup('Số điện thoại', normalizeText(message.phone) || 'Chưa có')}
        ${buildMetaItemMarkup('Người xử lý', normalizeText(message.handledById) || 'Chưa gán')}
        ${buildMetaItemMarkup('Người dùng liên kết', normalizeText(message.userId) || 'Khách vãng lai')}
      </dl>

      <div class="admin-message-body">
        <strong>Nội dung liên hệ</strong>
        <p>${escapeHTML(normalizeText(message.message) || 'Chưa có nội dung')}</p>
      </div>

      <form class="admin-status-form" data-admin-message-form data-message-id="${escapeHTML(messageId)}">
        <div class="admin-status-form__grid admin-status-form__grid--stack">
          <label class="form-field">
            <span class="label-text">Trạng thái liên hệ</span>
            <select name="status" ${isPending ? 'disabled' : ''}>
              ${buildMessageOptionsMarkup(draft.status)}
            </select>
          </label>

          <label class="form-field">
            <span class="label-text">Ghi chú nội bộ</span>
            <textarea name="adminNote" rows="4" placeholder="Ghi chú ngắn cho staff/admin khác..." ${isPending ? 'disabled' : ''}>${escapeHTML(draft.adminNote || '')}</textarea>
          </label>
        </div>

        ${buildFeedbackMarkup(feedback)}
        <button class="btn btn-primary" type="submit" data-save-button ${isPending ? 'disabled' : ''}>
          ${isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  `;
};

const buildMessageListItemMarkup = function (message, selectedMessageId) {
  const messageId = normalizeText(message?.id);
  const isSelected = messageId === selectedMessageId;
  const isInteractionLocked = Boolean(normalizeText(state.pendingMessageId));

  return `
    <article class="admin-list-item${isSelected ? ' is-selected' : ''}">
      <button
        class="admin-list-item__button"
        type="button"
        data-admin-message-select
        data-message-id="${escapeHTML(messageId)}"
        aria-pressed="${isSelected ? 'true' : 'false'}"
        ${isInteractionLocked ? 'disabled' : ''}
      >
        <div class="admin-list-item__main">
          <div class="admin-list-item__title-block">
            <p class="admin-list-item__eyebrow">${escapeHTML(formatDateTime(message.createdAt))}</p>
            <h3 class="admin-list-item__title">${escapeHTML(message.name || 'Liên hệ')}</h3>
            <p class="admin-list-item__text">${escapeHTML(buildMessageContactLine(message))}</p>
            <p class="admin-list-item__preview">${escapeHTML(normalizeText(message.message) || 'Chưa có nội dung')}</p>
          </div>

          <div class="admin-badge-row">
            ${buildStatusBadgeMarkup(resolveMessageStatusLabel(message.status), resolveMessageStatusTone(message.status))}
            ${buildStatusBadgeMarkup(buildAssignmentLabel(message), normalizeText(message.handledById) ? 'info' : 'neutral')}
          </div>
        </div>

        <dl class="admin-list-stats">
          ${buildListStatMarkup('Người xử lý', normalizeText(message.handledById) || 'Chưa gán')}
          ${buildListStatMarkup('Tài khoản', normalizeText(message.userId) || 'Khách vãng lai')}
        </dl>
      </button>

      ${isSelected ? `
        <div class="admin-inline-detail">
          ${buildMessageDetailMarkup(message)}
        </div>
      ` : ''}
    </article>
  `;
};

const buildEmptyDetailMarkup = function (title, description) {
  return `
    <div class="admin-detail-empty">
      <p class="profile-card__eyebrow">Chi tiết</p>
      <h2 class="admin-detail__title">${escapeHTML(title)}</h2>
      <p class="admin-detail__text">${escapeHTML(description)}</p>
    </div>
  `;
};

const buildWorkspaceMarkup = function (visibleItems, selectedMessage) {
  return `
    <div class="admin-workspace">
      <section class="profile-card admin-panel admin-workspace__list">
        <div class="admin-panel__header">
          <p class="profile-card__eyebrow">Danh sách</p>
          <h2 class="admin-panel__title">Liên hệ phù hợp</h2>
        </div>

        <div class="admin-list">
          ${visibleItems.map(function (message) {
            return buildMessageListItemMarkup(message, normalizeText(selectedMessage?.id));
          }).join('')}
        </div>
      </section>

      <aside class="profile-card admin-panel admin-workspace__detail">
        ${selectedMessage
          ? buildMessageDetailMarkup(selectedMessage)
          : buildEmptyDetailMarkup(
            'Chưa chọn liên hệ',
            'Chọn một liên hệ từ danh sách bên trái để đọc nội dung đầy đủ và cập nhật ghi chú nội bộ.'
          )}
      </aside>
    </div>
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

  const selectedMessage = syncSelectedMessage(visibleItems);

  container.innerHTML = `
    ${buildResultsSummaryMarkup(visibleItems.length, state.items.length)}
    ${buildWorkspaceMarkup(visibleItems, selectedMessage)}
  `;
};

const setPageStateFromError = function (error) {
  if (error?.status === 401) {
    state = {
      ...state,
      status: 'unauthorized',
      items: [],
      pendingMessageId: '',
      feedbackById: {},
      selectedMessageId: '',
      draftById: {}
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
      feedbackById: {},
      selectedMessageId: '',
      draftById: {}
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
    feedbackById: {},
    draftById: {}
  };
  render();

  try {
    const items = await getAdminMessages(state.filter);
    state = {
      ...state,
      status: 'ready',
      items: Array.isArray(items) ? items : [],
      pendingMessageId: '',
      feedbackById: {},
      draftById: {}
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
      feedbackById: {},
      draftById: {}
    };
    console.error(error);
  }

  render();
};

const bindFilter = function () {
  const filter = getFilter();

  if (!filter) {
    return;
  }

  filter.addEventListener('change', function () {
    state = {
      ...state,
      filter: normalizeText(filter.value),
      feedbackById: {}
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
      searchTerm: normalizeText(searchInput.value)
    };
    render();
  });
};

const bindActions = function () {
  const container = getContent();

  if (!container) {
    return;
  }

  container.addEventListener('click', function (event) {
    const selectButton = event.target.closest('[data-admin-message-select]');

    if (!selectButton || state.pendingMessageId) {
      return;
    }

    const messageId = normalizeText(selectButton.dataset.messageId);

    if (!messageId || messageId === normalizeText(state.selectedMessageId)) {
      return;
    }

    state = {
      ...state,
      selectedMessageId: messageId
    };
    render();
  });

  const syncDraftFromForm = function (form) {
    const messageId = normalizeText(form.dataset.messageId);

    if (!messageId) {
      return;
    }

    setDraftForMessage(messageId, {
      status: normalizeEnumValue(form.elements.status?.value),
      adminNote: normalizeText(form.elements.adminNote?.value)
    });
  };

  container.addEventListener('input', function (event) {
    const form = event.target.closest('[data-admin-message-form]');

    if (!form) {
      return;
    }

    syncDraftFromForm(form);
  });

  container.addEventListener('change', function (event) {
    const form = event.target.closest('[data-admin-message-form]');

    if (!form) {
      return;
    }

    syncDraftFromForm(form);
    render();
  });

  container.addEventListener('submit', function (event) {
    const form = event.target.closest('[data-admin-message-form]');

    if (!form) {
      return;
    }

    event.preventDefault();

    const messageId = normalizeText(form.dataset.messageId);

    if (!messageId || state.pendingMessageId) {
      return;
    }

    const payload = {
      status: normalizeEnumValue(form.elements.status?.value),
      adminNote: normalizeText(form.elements.adminNote?.value)
    };

    setDraftForMessage(messageId, payload);
    state = {
      ...state,
      pendingMessageId: messageId
    };
    render();

    void updateAdminMessageStatus(messageId, payload).then(function (updatedMessage) {
      const normalizedFilter = normalizeEnumValue(state.filter);
      const updatedStatus = normalizeEnumValue(updatedMessage?.status);
      const shouldKeepItem = !normalizedFilter || normalizedFilter === updatedStatus;
      const nextDraftById = { ...state.draftById };
      const nextFeedbackById = { ...state.feedbackById };

      delete nextDraftById[messageId];

      if (!shouldKeepItem) {
        delete nextFeedbackById[messageId];
      } else {
        nextFeedbackById[messageId] = {
          type: 'success',
          message: 'Đã cập nhật trạng thái liên hệ.'
        };
      }

      state = {
        ...state,
        pendingMessageId: '',
        items: shouldKeepItem
          ? state.items.map(function (item) {
            return normalizeText(item.id) === messageId ? { ...item, ...(updatedMessage || {}) } : item;
          })
          : state.items.filter(function (item) {
            return normalizeText(item.id) !== messageId;
          }),
        draftById: nextDraftById,
        feedbackById: nextFeedbackById
      };
      render();
    }).catch(function (error) {
      if (setPageStateFromError(error)) {
        return;
      }

      clearDraftForMessage(messageId);
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
