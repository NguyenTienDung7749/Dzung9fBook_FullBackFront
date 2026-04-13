import { qs } from '../core/dom.js';
import { escapeHTML, formatPrice, normalizeText } from '../core/utils.js';
import {
  buildDetailUrl,
  getBookDisplayAuthor,
  getBookDisplayDescription,
  getBookParentSlug,
  getBookPrimaryImage,
  getBookSubcategorySlug
} from '../data/catalog.js';
import { getCatalogIndex } from '../services/catalog.js';

const EXCLUDED_PAGES = new Set([
  'login',
  'register',
  'orders',
  'order-detail',
  'admin-home',
  'admin-orders',
  'admin-messages',
  'admin-books'
]);

const QUICK_PROMPTS = [
  'Gợi ý sách dưới 200k',
  'Sách cho học sinh / sinh viên',
  'Sách kỹ năng sống',
  'Sách làm quà tặng',
  'Sách nên đọc cho người hay overthinking'
];

let categoriesCache = [];
let booksPromise = null;
let rootBound = false;
let bodyObserver = null;
let advisorState = {
  isOpen: false,
  isLoading: false,
  inputValue: '',
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Mình là DzungAI, trợ lý gợi ý sách nhanh. Bạn có thể bấm một chip bên dưới hoặc mô tả nhu cầu đọc bằng vài từ khóa.'
    }
  ]
};

const getRoot = function () {
  return qs('[data-product-advisor-root]');
};

const shouldRenderAdvisor = function () {
  return !EXCLUDED_PAGES.has(document.body.dataset.page || '');
};

const buildBookSearchText = function (book) {
  return normalizeText([
    book.title,
    getBookDisplayAuthor(book),
    getBookDisplayDescription(book),
    book.categoryLabel,
    book.subcategoryLabel
  ].join(' '));
};

const keywordScore = function (text, keywords) {
  return keywords.reduce(function (score, keyword) {
    return score + (text.includes(keyword) ? 1 : 0);
  }, 0);
};

const ensureCatalogIndex = async function () {
  if (!booksPromise) {
    booksPromise = getCatalogIndex();
  }

  return booksPromise;
};

const buildDetailLink = function (book) {
  const category = getBookParentSlug(categoriesCache, book);
  const subcategory = getBookSubcategorySlug(book);

  return buildDetailUrl(categoriesCache, book, {
    category,
    subcategory
  });
};

const buildPresetConfig = function () {
  return [
    {
      keywords: ['duoi 200k', 'duoi 200', 'gia re', 'tiet kiem', 're'],
      intro: 'Mình chọn 3 cuốn dễ vào giỏ ngay, ưu tiên còn hàng và giá dưới 200k.',
      filter(book) {
        return !book.isSoldOut && Number(book.price) > 0 && Number(book.price) <= 200000;
      },
      score(book) {
        return 240 - Math.round(Number(book.price || 0) / 1000);
      },
      reason(book) {
        return `Giá ${formatPrice(book.price)}, vừa túi tiền để mua thử hoặc thêm cùng lúc vài cuốn.`;
      }
    },
    {
      keywords: ['hoc sinh', 'sinh vien', 'on thi', 'ielts', 'tu hoc', 'hoc tap', 'study'],
      intro: 'Nhóm này ưu tiên các đầu sách dễ ứng dụng cho việc học, tự học và phát triển kỹ năng nền.',
      filter(book) {
        if (book.isSoldOut) {
          return false;
        }

        const parentSlug = getBookParentSlug(categoriesCache, book);
        return parentSlug === 'sach-giao-khoa-giao-trinh'
          || keywordScore(buildBookSearchText(book), ['hoc', 'luyen', 'ielts', 'english', 'tin hoc', 'excel', 'giao khoa', 'tham khao']) > 0;
      },
      score(book) {
        const parentSlug = getBookParentSlug(categoriesCache, book);
        return keywordScore(buildBookSearchText(book), ['hoc', 'luyen', 'ielts', 'english', 'tin hoc', 'excel', 'giao khoa', 'tham khao']) * 8
          + (parentSlug === 'sach-giao-khoa-giao-trinh' ? 22 : 0)
          + (parentSlug === 'sach-phat-trien-ban-than' ? 9 : 0)
          + Math.max(0, 180 - Math.round(Number(book.price || 0) / 2000));
      },
      reason() {
        return 'Hợp với nhu cầu học tập hoặc tự nâng kỹ năng, lại khá dễ áp dụng vào nhịp học hằng ngày.';
      }
    },
    {
      keywords: ['ky nang song', 'phat trien ban than', 'ky nang', 'song tot hon'],
      intro: 'Đây là 3 lựa chọn thiên về kỹ năng sống, thói quen và cân bằng lại nhịp sinh hoạt.',
      filter(book) {
        if (book.isSoldOut) {
          return false;
        }

        const parentSlug = getBookParentSlug(categoriesCache, book);
        const subcategorySlug = getBookSubcategorySlug(book);
        return parentSlug === 'sach-phat-trien-ban-than'
          && (subcategorySlug === 'tam-ly-ky-nang-song' || subcategorySlug === 'sach-hoc-lam-nguoi');
      },
      score(book) {
        const subcategorySlug = getBookSubcategorySlug(book);
        return keywordScore(buildBookSearchText(book), ['ky nang', 'song', 'thoi quen', 'ky luat', 'ban than', 'hanh phuc']) * 6
          + (subcategorySlug === 'tam-ly-ky-nang-song' ? 16 : 8)
          + Math.max(0, 160 - Math.round(Number(book.price || 0) / 2500));
      },
      reason() {
        return 'Thuộc nhóm phát triển bản thân, dễ đọc và hợp để bắt đầu bằng một thay đổi nhỏ nhưng đều đặn.';
      }
    },
    {
      keywords: ['qua tang', 'lam qua', 'qua', 'tang ban', 'gift'],
      intro: 'Mình ưu tiên những cuốn có cảm giác chỉn chu, dễ tặng và hợp nhiều đối tượng nhận quà.',
      filter(book) {
        if (book.isSoldOut) {
          return false;
        }

        const parentSlug = getBookParentSlug(categoriesCache, book);
        return parentSlug === 'sach-van-hoc-trong-nuoc'
          || parentSlug === 'sach-van-hoc-nuoc-ngoai'
          || keywordScore(buildBookSearchText(book), ['bia cung', 'dac biet', 'tang kem', 'bookmark', 'combo', 'box']) > 0;
      },
      score(book) {
        const parentSlug = getBookParentSlug(categoriesCache, book);
        const hasDiscount = Number(book.compareAtPrice || 0) > Number(book.price || 0);
        return keywordScore(buildBookSearchText(book), ['bia cung', 'dac biet', 'tang kem', 'bookmark', 'combo', 'box']) * 9
          + ((parentSlug === 'sach-van-hoc-trong-nuoc' || parentSlug === 'sach-van-hoc-nuoc-ngoai') ? 12 : 0)
          + (hasDiscount ? 5 : 0)
          + Math.max(0, 150 - Math.abs(220 - Math.round(Number(book.price || 0) / 1000)));
      },
      reason() {
        return 'Có vibe tặng quà tốt: bìa đẹp, dễ chọn và đủ an toàn để tặng cho người thích đọc.';
      }
    },
    {
      keywords: ['overthinking', 'bat an', 'lo au', 'noi tam', 'chua lanh', 'suy nghi nhieu'],
      intro: 'Nếu đang hơi quá tải trong đầu, mình ưu tiên những cuốn thiên về chữa lành, bình tĩnh và sắp lại cảm xúc.',
      filter(book) {
        if (book.isSoldOut) {
          return false;
        }

        return getBookParentSlug(categoriesCache, book) === 'sach-phat-trien-ban-than'
          || keywordScore(buildBookSearchText(book), ['bat an', 'binh yen', 'noi tam', 'ton thuong', 'chua lanh', 'diu dang', 'overthinking']) > 0;
      },
      score(book) {
        const subcategorySlug = getBookSubcategorySlug(book);
        return keywordScore(buildBookSearchText(book), ['bat an', 'binh yen', 'noi tam', 'ton thuong', 'chua lanh', 'diu dang', 'overthinking']) * 10
          + (subcategorySlug === 'tam-ly-ky-nang-song' ? 18 : 0)
          + Math.max(0, 170 - Math.round(Number(book.price || 0) / 2200));
      },
      reason() {
        return 'Nội dung nghiêng về cân bằng cảm xúc, rất hợp khi bạn muốn đọc để đầu óc nhẹ lại một chút.';
      }
    }
  ];
};

const resolvePreset = function (prompt) {
  const normalizedPrompt = normalizeText(prompt);
  return buildPresetConfig().find(function (preset) {
    return preset.keywords.some((keyword) => normalizedPrompt.includes(keyword));
  }) || null;
};

const buildGenericRecommendations = function (books, prompt) {
  const tokens = normalizeText(prompt).split(/\s+/).filter((token) => token.length >= 3);
  const rankedBooks = books
    .filter((book) => !book.isSoldOut)
    .map(function (book) {
      const bookText = buildBookSearchText(book);
      const score = tokens.reduce(function (sum, token) {
        if (!bookText.includes(token)) {
          return sum;
        }

        return sum + (normalizeText(book.title).includes(token) ? 5 : 2);
      }, 0) + Math.max(0, 120 - Math.round(Number(book.price || 0) / 2000));

      return {
        book,
        score
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 3)
    .map((entry) => ({
      ...entry.book,
      reason: 'Tiêu đề, mô tả hoặc nhóm sách có độ khớp tốt với nhu cầu bạn vừa nhập.'
    }));

  if (rankedBooks.length) {
    return {
      intro: 'Mình thử ghép nhanh theo từ khóa bạn vừa nhập và chọn ra 3 cuốn có độ khớp tốt nhất.',
      items: rankedBooks
    };
  }

  return {
    intro: 'Mình chưa bắt trúng ý thật chính xác, nên gợi ý trước 3 lựa chọn dễ tiếp cận nhất trong catalog.',
    items: books
      .filter((book) => !book.isSoldOut)
      .slice()
      .sort((first, second) => Number(first.price || 0) - Number(second.price || 0))
      .slice(0, 3)
      .map((book) => ({
        ...book,
        reason: 'Tạm thời mình chưa bắt đúng ý hoàn toàn, nên gợi ý 3 cuốn dễ tiếp cận và còn hàng để bạn bắt đầu.'
      }))
  };
};

const buildRecommendations = async function (prompt) {
  const books = await ensureCatalogIndex();
  const preset = resolvePreset(prompt);

  if (!Array.isArray(books) || !books.length) {
    return {
      intro: 'Catalog hiện chưa phản hồi đúng lúc này. Bạn thử mở lại sau ít phút nhé.',
      items: []
    };
  }

  if (!preset) {
    return buildGenericRecommendations(books, prompt);
  }

  const rankedBooks = books
    .filter((book) => preset.filter(book))
    .map((book) => ({
      book,
      score: preset.score(book)
    }))
    .sort((first, second) => second.score - first.score)
    .slice(0, 3)
    .map((entry) => ({
      ...entry.book,
      reason: preset.reason(entry.book)
    }));

  if (rankedBooks.length) {
    return {
      intro: preset.intro,
      items: rankedBooks
    };
  }

  return buildGenericRecommendations(books, prompt);
};

const buildRecommendationCard = function (book) {
  return `
    <a href="${escapeHTML(buildDetailLink(book))}" class="product-advisor__card">
      <div class="product-advisor__card-media">
        <img src="${escapeHTML(getBookPrimaryImage(book))}" alt="${escapeHTML(book.title)}" class="product-advisor__card-image" loading="lazy" decoding="async">
      </div>
      <div class="product-advisor__card-content">
        <p class="product-advisor__card-reason">${escapeHTML(book.reason || '')}</p>
        <h3 class="product-advisor__card-title">${escapeHTML(book.title)}</h3>
        <p class="product-advisor__card-author">${escapeHTML(getBookDisplayAuthor(book) || 'Dzung9fBook gợi ý')}</p>
        <div class="product-advisor__card-footer">
          <strong>${escapeHTML(formatPrice(book.price))}</strong>
          <span>Xem sách</span>
        </div>
      </div>
    </a>
  `;
};

const buildMessageMarkup = function (message) {
  const cardsMarkup = Array.isArray(message.items) && message.items.length
    ? `<div class="product-advisor__cards">${message.items.map(buildRecommendationCard).join('')}</div>`
    : '';

  return `
    <article class="product-advisor__message product-advisor__message--${message.role}">
      <div class="product-advisor__bubble">
        <p>${escapeHTML(message.text)}</p>
        ${cardsMarkup}
      </div>
    </article>
  `;
};

const renderAdvisor = function () {
  const root = getRoot();
  const isDeprioritized = document.body.classList.contains('checkout-modal-open');

  if (!root) {
    return;
  }

  if (!shouldRenderAdvisor()) {
    root.innerHTML = '';
    return;
  }

  root.innerHTML = `
    <div class="product-advisor ${advisorState.isOpen ? 'is-open' : ''} ${isDeprioritized ? 'is-deprioritized' : ''}">
      <button type="button" class="product-advisor__fab" aria-label="${advisorState.isOpen ? 'Đóng tư vấn sách' : 'Mở tư vấn sách'}" data-advisor-toggle>
        <ion-icon name="${advisorState.isOpen ? 'close-outline' : 'chatbubbles-outline'}" aria-hidden="true"></ion-icon>
      </button>

      <section class="product-advisor__panel" aria-label="Tư vấn chọn sách nhanh">
        <header class="product-advisor__header">
          <div>
            <p class="product-advisor__eyebrow">DzungAI Advisor</p>
            <h2 class="product-advisor__title">Tư vấn sách nhanh</h2>
          </div>
          <button type="button" class="product-advisor__close" aria-label="Đóng tư vấn sách" data-advisor-close>
            <ion-icon name="close-outline" aria-hidden="true"></ion-icon>
          </button>
        </header>

        <div class="product-advisor__messages" data-advisor-messages>
          ${advisorState.messages.map(buildMessageMarkup).join('')}
          ${advisorState.isLoading ? `
            <article class="product-advisor__message product-advisor__message--assistant">
              <div class="product-advisor__bubble product-advisor__bubble--thinking">
                <span></span><span></span><span></span>
              </div>
            </article>
          ` : ''}
        </div>

        <div class="product-advisor__chips">
          ${QUICK_PROMPTS.map((prompt) => `<button type="button" class="product-advisor__chip" data-advisor-prompt="${escapeHTML(prompt)}">${escapeHTML(prompt)}</button>`).join('')}
        </div>

        <form class="product-advisor__form" data-advisor-form>
          <label class="sr-only" for="product-advisor-input">Nhập nhu cầu đọc</label>
          <input id="product-advisor-input" type="text" name="advisorInput" value="${escapeHTML(advisorState.inputValue)}" placeholder="Ví dụ: mình cần sách chữa lành dễ đọc" autocomplete="off">
          <button type="submit" class="btn btn-primary btn-small">Gợi ý</button>
        </form>
      </section>
    </div>
  `;

  const messages = qs('[data-advisor-messages]', root);

  if (messages) {
    messages.scrollTop = messages.scrollHeight;
  }
};

const pushMessage = function (message) {
  advisorState = {
    ...advisorState,
    messages: [...advisorState.messages, message]
  };
  renderAdvisor();
};

const handleAdvisorPrompt = async function (prompt) {
  const normalizedPrompt = String(prompt || '').trim();

  if (!normalizedPrompt || advisorState.isLoading) {
    return;
  }

  pushMessage({
    id: `user-${Date.now()}`,
    role: 'user',
    text: normalizedPrompt
  });

  advisorState = {
    ...advisorState,
    inputValue: '',
    isLoading: true
  };
  renderAdvisor();

  try {
    const payload = await buildRecommendations(normalizedPrompt);
    advisorState = {
      ...advisorState,
      isLoading: false
    };
    pushMessage({
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      text: payload.intro,
      items: payload.items
    });
  } catch (error) {
    advisorState = {
      ...advisorState,
      isLoading: false
    };
    pushMessage({
      id: `assistant-error-${Date.now()}`,
      role: 'assistant',
      text: 'Mình chưa lấy được catalog ở thời điểm này. Bạn thử mở lại sau ít phút nhé.'
    });
    console.error(error);
  }
};

export const initProductAdvisor = function (categories = []) {
  categoriesCache = Array.isArray(categories) ? categories : [];

  if (!shouldRenderAdvisor()) {
    const root = getRoot();

    if (root) {
      root.innerHTML = '';
    }

    return;
  }

  renderAdvisor();

  if (rootBound) {
    return;
  }

  const root = getRoot();

  if (!root) {
    return;
  }

  rootBound = true;

  if (!bodyObserver) {
    bodyObserver = new MutationObserver(function () {
      if (shouldRenderAdvisor()) {
        renderAdvisor();
      }
    });
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  root.addEventListener('click', function (event) {
    if (event.target.closest('[data-advisor-toggle]')) {
      advisorState = {
        ...advisorState,
        isOpen: !advisorState.isOpen
      };
      renderAdvisor();
      return;
    }

    if (event.target.closest('[data-advisor-close]')) {
      advisorState = {
        ...advisorState,
        isOpen: false
      };
      renderAdvisor();
      return;
    }

    const promptButton = event.target.closest('[data-advisor-prompt]');

    if (promptButton) {
      advisorState = {
        ...advisorState,
        isOpen: true
      };
      renderAdvisor();
      void handleAdvisorPrompt(promptButton.dataset.advisorPrompt || '');
    }
  });

  root.addEventListener('input', function (event) {
    const input = event.target.closest('#product-advisor-input');

    if (!input) {
      return;
    }

    advisorState = {
      ...advisorState,
      inputValue: input.value
    };
  });

  root.addEventListener('submit', function (event) {
    const form = event.target.closest('[data-advisor-form]');

    if (!form) {
      return;
    }

    event.preventDefault();
    advisorState = {
      ...advisorState,
      isOpen: true
    };
    renderAdvisor();
    void handleAdvisorPrompt(form.elements.advisorInput?.value || '');
  });
};
