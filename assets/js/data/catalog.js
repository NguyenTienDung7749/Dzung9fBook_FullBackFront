import { extractPlainTextFromMarkup, normalizeSpecKey, normalizeText, slugifyText } from '../core/utils.js';

const CATALOG_BASE = './assets/data/catalog';
const BOOKS_PER_PAGE = 12;
const BOOK_SORT_OPTIONS = new Set(['featured', 'title-asc', 'title-desc', 'price-asc', 'price-desc']);
const BOOK_IMAGE_BASE = './assets/images/books/marketing-ban-hang';
const LEGACY_BOOK_IMAGE_BASES = [
  './assets/images/products/sach-kinh-te/marketing-ban-hang',
  'assets/images/products/sach-kinh-te/marketing-ban-hang'
];
const bookDescriptionAnalysisCache = new Map();

const CANONICAL_SPEC_LABELS = new Map([
  ['ma hang', 'Mã hàng'],
  ['ma san pham', 'Mã hàng'],
  ['code', 'Mã hàng'],
  ['isbn', 'ISBN'],
  ['barcode', 'Barcode - ISBN'],
  ['barcode isbn', 'Barcode - ISBN'],
  ['tac gia', 'Tác giả'],
  ['tac gia dich gia', 'Tác giả / Dịch giả'],
  ['nguoi dich', 'Người dịch'],
  ['nha cung cap', 'Nhà cung cấp'],
  ['ten nha cung cap', 'Nhà cung cấp'],
  ['nha phat hanh', 'Nhà phát hành'],
  ['don vi phat hanh', 'Nhà phát hành'],
  ['dvph', 'Nhà phát hành'],
  ['nha xuat ban', 'Nhà xuất bản'],
  ['nxb', 'NXB'],
  ['nam xb', 'Năm XB'],
  ['ngay xuat ban', 'Ngày xuất bản'],
  ['ngay phat hanh', 'Ngày phát hành'],
  ['nam phat hanh', 'Ngày phát hành'],
  ['trong luong', 'Trọng lượng'],
  ['khoi luong', 'Khối lượng'],
  ['so trang', 'Số trang'],
  ['kich thuoc', 'Kích thước'],
  ['kich thuoc bao bi', 'Kích thước'],
  ['kho sach', 'Kích thước'],
  ['kho', 'Kích thước'],
  ['ngon ngu', 'Ngôn ngữ'],
  ['dinh dang', 'Định dạng'],
  ['hinh thuc', 'Hình thức'],
  ['loai bia', 'Hình thức']
]);

const SPEC_DISPLAY_LABELS = new Map([
  ['Mã hàng', 'Mã hàng'],
  ['ISBN', 'ISBN'],
  ['Barcode - ISBN', 'Barcode - ISBN'],
  ['Tác giả', 'Tác giả'],
  ['Tác giả / Dịch giả', 'Tác giả / Dịch giả'],
  ['Người dịch', 'Người dịch'],
  ['Nhà cung cấp', 'Nhà phát hành'],
  ['Nhà phát hành', 'Nhà phát hành'],
  ['Nhà xuất bản', 'Nhà xuất bản'],
  ['NXB', 'Nhà xuất bản'],
  ['Năm XB', 'Năm XB'],
  ['Ngày xuất bản', 'Ngày phát hành'],
  ['Ngày phát hành', 'Ngày phát hành'],
  ['Trọng lượng', 'Khối lượng'],
  ['Khối lượng', 'Khối lượng'],
  ['Số trang', 'Số trang'],
  ['Kích thước', 'Kích thước'],
  ['Ngôn ngữ', 'Ngôn ngữ'],
  ['Định dạng', 'Định dạng'],
  ['Hình thức', 'Hình thức']
]);

const SPEC_DISPLAY_ORDER = new Map([
  ['Mã hàng', 10],
  ['ISBN', 20],
  ['Barcode - ISBN', 30],
  ['Tác giả', 40],
  ['Tác giả / Dịch giả', 50],
  ['Người dịch', 60],
  ['Nhà phát hành', 70],
  ['Nhà xuất bản', 80],
  ['Năm XB', 90],
  ['Ngày phát hành', 100],
  ['Khối lượng', 110],
  ['Số trang', 120],
  ['Kích thước', 130],
  ['Ngôn ngữ', 140],
  ['Định dạng', 150],
  ['Hình thức', 160]
]);

const bookDetailProfiles = {
  'sach-kinh-te': {
    lead: 'Tập trung vào góc nhìn thực tế và những ý tưởng có thể mang vào công việc hằng ngày.'
  },
  'sach-van-hoc-trong-nuoc': {
    lead: 'Một nhịp đọc giàu cảm xúc, gần gũi và dễ chạm vào ký ức rất riêng của người đọc Việt.'
  },
  'sach-van-hoc-nuoc-ngoai': {
    lead: 'Mở ra một mạch đọc rộng hơn về thế giới, con người và những bối cảnh ngoài trải nghiệm quen thuộc.'
  },
  'sach-thieu-nhi': {
    lead: 'Giữ nhịp kể nhẹ nhàng, dễ gần và đủ sáng để việc đọc trở thành trải nghiệm vui vẻ hơn.'
  },
  'sach-phat-trien-ban-than': {
    lead: 'Đưa ra những gợi ý gần gũi để bạn sắp xếp lại nhịp sống, cảm xúc và thói quen mỗi ngày.'
  },
  'sach-giao-khoa-giao-trinh': {
    lead: 'Được trình bày theo hướng có hệ thống, giúp việc học và tra cứu diễn ra rõ ràng hơn.'
  },
  default: {
    lead: 'Một lựa chọn gọn gàng để bạn bắt đầu hoặc nối dài mạch đọc đang quan tâm.'
  }
};

let categoriesPromise;
let catalogIndexPromise;
let lookupPromise;
const detailPromiseCache = new Map();

const loadJson = async function (relativePath) {
  const response = await fetch(relativePath, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Không thể tải ${relativePath}: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const normalizeBookAssetPath = function (value) {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return '';
  }

  const normalizedPath = rawValue.replace(/\\/g, '/');

  if (/^(?:https?:)?\/\//i.test(normalizedPath) || normalizedPath.startsWith('data:')) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith(BOOK_IMAGE_BASE)) {
    return normalizedPath;
  }

  const legacyBase = LEGACY_BOOK_IMAGE_BASES.find((prefix) => normalizedPath.startsWith(prefix));

  if (legacyBase) {
    return `${BOOK_IMAGE_BASE}${normalizedPath.slice(legacyBase.length)}`;
  }

  if (normalizedPath.startsWith('./')) {
    return normalizedPath;
  }

  return `./${normalizedPath.replace(/^\/+/, '')}`;
};

export const normalizeCatalogBook = function (book) {
  const gallery = Array.isArray(book.gallery) ? [...new Set(book.gallery.map(normalizeBookAssetPath).filter(Boolean))] : [];
  const image = normalizeBookAssetPath(book.image) || gallery[0] || './assets/images/feature-1.png';

  return {
    ...book,
    handle: String(book.handle || slugifyText(book.title)),
    image,
    gallery: gallery.length ? gallery : [image],
    parentSlug: String(book.parentSlug || slugifyText(book.categoryLabel || book.category)),
    subcategorySlug: String(book.subcategorySlug || book.subcategory || '').trim(),
    categoryLabel: String(book.categoryLabel || book.category || '').trim(),
    subcategoryLabel: String(book.subcategoryLabel || '').trim()
  };
};

const sortNodesByOrder = function (nodes) {
  return [...nodes]
    .map((node, index) => ({ node, index }))
    .sort((first, second) => {
      const firstOrder = Number.isFinite(first.node.order) ? first.node.order : Number.POSITIVE_INFINITY;
      const secondOrder = Number.isFinite(second.node.order) ? second.node.order : Number.POSITIVE_INFINITY;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return first.index - second.index;
    })
    .map((entry) => entry.node);
};

export const normalizeCategories = function (categories) {
  return sortNodesByOrder(Array.isArray(categories) ? categories : []).map((parent) => ({
    ...parent,
    slug: parent.slug || slugifyText(parent.label),
    children: sortNodesByOrder(Array.isArray(parent.children) ? parent.children : []).map((child) => ({
      ...child,
      slug: child.slug || slugifyText(child.label)
    }))
  }));
};

export const loadCategories = async function () {
  if (!categoriesPromise) {
    categoriesPromise = loadJson(`${CATALOG_BASE}/categories.json`).then(normalizeCategories);
  }

  return categoriesPromise;
};

export const loadCatalogIndex = async function () {
  if (!catalogIndexPromise) {
    catalogIndexPromise = loadJson(`${CATALOG_BASE}/catalog-index.json`).then((books) => books.map(normalizeCatalogBook));
  }

  return catalogIndexPromise;
};

export const normalizeCatalogLookup = function (items) {
  return (Array.isArray(items) ? items : []).reduce((lookup, item) => {
    const id = Number(item?.id);
    const handle = String(item?.handle || '').trim();

    if (Number.isFinite(id) && handle) {
      lookup.push({ id, handle });
    }

    return lookup;
  }, []);
};

export const loadCatalogLookup = async function () {
  if (!lookupPromise) {
    lookupPromise = loadJson(`${CATALOG_BASE}/lookup.json`).then(normalizeCatalogLookup);
  }

  return lookupPromise;
};

export const loadBookDetailByHandle = async function (handle) {
  const normalizedHandle = String(handle || '').trim();

  if (!normalizedHandle) {
    return null;
  }

  if (!detailPromiseCache.has(normalizedHandle)) {
    detailPromiseCache.set(normalizedHandle, loadJson(`${CATALOG_BASE}/books/${normalizedHandle}.json`).then(normalizeCatalogBook));
  }

  return detailPromiseCache.get(normalizedHandle);
};

export const resolveBookDetailFromSearch = async function (search = window.location.search) {
  const params = new URLSearchParams(search);
  const handle = params.get('handle') || '';

  if (handle) {
    return loadBookDetailByHandle(handle);
  }

  const id = params.get('id');

  if (!id) {
    return null;
  }

  const lookup = await loadCatalogLookup();
  const match = lookup.find((book) => Number(book.id) === Number(id));
  return match ? loadBookDetailByHandle(match.handle) : null;
};

export const findParentCategory = function (categories, slug) {
  return categories.find((item) => item.slug === slug) || null;
};

export const findParentCategoryByLabel = function (categories, label) {
  const normalizedLabel = normalizeText(label);
  return categories.find((item) => normalizeText(item.label) === normalizedLabel) || null;
};

export const findSubcategory = function (categories, parentSlug, subcategorySlug) {
  const parent = findParentCategory(categories, parentSlug);

  if (!parent) {
    return null;
  }

  return parent.children.find((item) => item.slug === subcategorySlug) || null;
};

export const getParentCategoryForBook = function (categories, book) {
  return findParentCategoryByLabel(categories, book.categoryLabel || book.category) || findParentCategory(categories, book.parentSlug) || null;
};

export const getBookParentSlug = function (categories, book) {
  return getParentCategoryForBook(categories, book)?.slug || String(book.parentSlug || '').trim() || slugifyText(book.categoryLabel || book.category);
};

export const getBookSubcategorySlug = function (book) {
  return String(book.subcategorySlug || book.subcategory || '').trim();
};

export const getCategoriesTotalCount = function (categories) {
  return categories.reduce((sum, category) => sum + Number(category.bookCount || 0), 0);
};

export const buildBooksUrl = function (categories, { category = 'all', subcategory = '', q = '', sort = 'featured', page = 1 } = {}) {
  const params = new URLSearchParams();

  if (category && category !== 'all') {
    params.set('category', category);
  }

  if (category && category !== 'all' && subcategory && findSubcategory(categories, category, subcategory)) {
    params.set('subcategory', subcategory);
  }

  if (q) {
    params.set('q', q);
  }

  if (sort && sort !== 'featured' && BOOK_SORT_OPTIONS.has(sort)) {
    params.set('sort', sort);
  }

  if (Number(page) > 1) {
    params.set('page', String(page));
  }

  const queryString = params.toString();
  return `./books.html${queryString ? `?${queryString}` : ''}`;
};

export const buildDetailUrl = function (categories, book, context = {}) {
  const params = new URLSearchParams();
  params.set('handle', String(book.handle || ''));
  params.set('id', String(book.id));

  if (context.category && context.category !== 'all') {
    params.set('category', context.category);
  }

  if (context.category && context.category !== 'all' && context.subcategory && findSubcategory(categories, context.category, context.subcategory)) {
    params.set('subcategory', context.subcategory);
  }

  if (context.q) {
    params.set('q', context.q);
  }

  if (context.sort && context.sort !== 'featured' && BOOK_SORT_OPTIONS.has(context.sort)) {
    params.set('sort', context.sort);
  }

  if (Number(context.page) > 1) {
    params.set('page', String(context.page));
  }

  return `./book-detail.html?${params.toString()}`;
};

export const getBooksStateFromUrl = function (categories, search = window.location.search) {
  const params = new URLSearchParams(search);
  const query = params.get('q') || '';
  const requestedCategory = params.get('category') || 'all';
  const requestedSubcategory = params.get('subcategory') || '';
  const requestedSort = params.get('sort') || 'featured';
  const requestedPage = Number.parseInt(params.get('page') || '1', 10);

  let category = requestedCategory;
  let subcategory = requestedSubcategory;
  let sort = requestedSort;
  let page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  let changed = false;

  if (category !== 'all' && !findParentCategory(categories, category)) {
    category = 'all';
    subcategory = '';
    changed = true;
  }

  if (category === 'all') {
    if (requestedCategory !== 'all' || subcategory) {
      changed = true;
    }

    subcategory = '';
  } else if (subcategory && !findSubcategory(categories, category, subcategory)) {
    subcategory = '';
    changed = true;
  }

  if (!BOOK_SORT_OPTIONS.has(sort)) {
    sort = 'featured';
    changed = true;
  }

  if (page !== requestedPage || page < 1) {
    page = 1;
    changed = true;
  }

  return { category, subcategory, query, sort, page, changed };
};

export const updateBooksUrl = function (categories, state) {
  const nextUrl = buildBooksUrl(categories, state).replace('./', '');
  history.replaceState({}, '', nextUrl);
};

export const getCategorySummaryLabel = function (categories, state) {
  if (state.category === 'all') {
    return 'Tất cả sách';
  }

  const parent = findParentCategory(categories, state.category);

  if (!parent) {
    return 'Tất cả sách';
  }

  if (!state.subcategory) {
    return parent.label;
  }

  const child = findSubcategory(categories, state.category, state.subcategory);
  return child ? `${parent.label} / ${child.label}` : parent.label;
};

export const filterBooks = function (categories, books, state) {
  const normalizedQuery = normalizeText(state.query);

  return books.filter((book) => {
    const parentSlug = getBookParentSlug(categories, book);
    const bookSubcategory = getBookSubcategorySlug(book);
    const searchableText = normalizeText(`${book.title} ${getBookDisplayAuthor(book)}`);
    const matchesCategory = state.category === 'all' || parentSlug === state.category;
    const matchesSubcategory = !state.subcategory || bookSubcategory === state.subcategory;
    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);

    return matchesCategory && matchesSubcategory && matchesQuery;
  });
};

export const sortBooks = function (books, sort) {
  const items = [...books];

  if (sort === 'title-asc') {
    return items.sort((first, second) => first.title.localeCompare(second.title, 'vi'));
  }

  if (sort === 'title-desc') {
    return items.sort((first, second) => second.title.localeCompare(first.title, 'vi'));
  }

  if (sort === 'price-asc') {
    return items.sort((first, second) => Number(first.price) - Number(second.price));
  }

  if (sort === 'price-desc') {
    return items.sort((first, second) => Number(second.price) - Number(first.price));
  }

  return items;
};

export const getPaginationWindow = function (totalPages, currentPage) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push('ellipsis-start');
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push('ellipsis-end');
  }

  pages.push(totalPages);
  return pages;
};

export const getBackContextForBook = function (categories, book, search = window.location.search) {
  const params = new URLSearchParams(search);
  const requestedCategory = params.get('category') || '';
  const requestedSubcategory = params.get('subcategory') || '';
  const requestedQuery = (params.get('q') || '').trim();
  const requestedSort = params.get('sort') || 'featured';
  const requestedPage = Number.parseInt(params.get('page') || '1', 10);

  if (requestedCategory && findParentCategory(categories, requestedCategory)) {
    return {
      category: requestedCategory,
      subcategory: requestedSubcategory && findSubcategory(categories, requestedCategory, requestedSubcategory) ? requestedSubcategory : '',
      q: requestedQuery,
      sort: BOOK_SORT_OPTIONS.has(requestedSort) ? requestedSort : 'featured',
      page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
    };
  }

  const bookCategory = getBookParentSlug(categories, book);
  const bookSubcategory = getBookSubcategorySlug(book);

  return {
    category: bookCategory,
    subcategory: bookSubcategory && findSubcategory(categories, bookCategory, bookSubcategory) ? bookSubcategory : '',
    q: requestedQuery,
    sort: BOOK_SORT_OPTIONS.has(requestedSort) ? requestedSort : 'featured',
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  };
};

export const getRelatedBooks = function (categories, books, selectedBook) {
  const selectedParent = getBookParentSlug(categories, selectedBook);
  const selectedSubcategory = getBookSubcategorySlug(selectedBook);
  const otherBooks = books.filter((book) => Number(book.id) !== Number(selectedBook.id));

  const sameSubcategory = selectedSubcategory
    ? otherBooks.filter((book) => getBookParentSlug(categories, book) === selectedParent && getBookSubcategorySlug(book) === selectedSubcategory)
    : [];

  const sameParent = otherBooks.filter((book) => {
    return getBookParentSlug(categories, book) === selectedParent && !sameSubcategory.some((item) => Number(item.id) === Number(book.id));
  });

  const fallback = otherBooks.filter((book) => {
    return !sameSubcategory.some((item) => Number(item.id) === Number(book.id))
      && !sameParent.some((item) => Number(item.id) === Number(book.id));
  });

  return [...sameSubcategory, ...sameParent, ...fallback].slice(0, 3);
};

const getCanonicalSpecLabel = function (value) {
  return CANONICAL_SPEC_LABELS.get(normalizeSpecKey(value)) || '';
};

const getDisplaySpecLabel = function (value) {
  return SPEC_DISPLAY_LABELS.get(value) || value;
};

const getSpecValueRichness = function (value) {
  const text = String(value || '').trim();

  if (!text) {
    return 0;
  }

  let score = text.length;

  if (/\d/.test(text) && /[a-zA-ZÀ-ỹ]/u.test(text)) {
    score += 8;
  }

  if (/(?:cm|mm|gram|gam|trang|tiếng|bìa)/i.test(text)) {
    score += 10;
  }

  if (/[x×]/i.test(text)) {
    score += 4;
  }

  return score;
};

const dedupeSpecItems = function (specs) {
  const specMap = new Map();

  specs.forEach((spec) => {
    if (!spec || !spec.label || !spec.value) {
      return;
    }

    const label = getDisplaySpecLabel(String(spec.label).trim());
    const value = String(spec.value).trim();

    if (!label || !value) {
      return;
    }

    const currentSpec = specMap.get(label);

    if (!currentSpec || getSpecValueRichness(value) > getSpecValueRichness(currentSpec.value)) {
      specMap.set(label, { label, value });
    }
  });

  return [...specMap.values()].sort((first, second) => {
    const firstOrder = SPEC_DISPLAY_ORDER.get(first.label) || Number.POSITIVE_INFINITY;
    const secondOrder = SPEC_DISPLAY_ORDER.get(second.label) || Number.POSITIVE_INFINITY;

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    return first.label.localeCompare(second.label, 'vi');
  });
};

const buildBookFieldSpecs = function (book) {
  return [
    { label: 'Mã hàng', value: book.sku },
    { label: 'Tác giả', value: book.author },
    { label: 'Nhà phát hành', value: book.publisher },
    { label: 'Năm XB', value: book.year },
    { label: 'Ngôn ngữ', value: book.language },
    { label: 'Số trang', value: book.pages },
    { label: 'Kích thước', value: book.size },
    { label: 'Khối lượng', value: book.weight },
    { label: 'Hình thức', value: book.bookType }
  ];
};

const findSpecValue = function (specs, labels) {
  for (const label of labels) {
    const canonicalLabel = getCanonicalSpecLabel(label) || label;
    const displayLabel = getDisplaySpecLabel(canonicalLabel);
    const match = specs.find((item) => item.label === displayLabel && item.value);

    if (match) {
      return match.value;
    }
  }

  return '';
};

export const getBookPrimaryImage = function (book) {
  return normalizeBookAssetPath(book.image) || getBookGalleryImages(book)[0] || './assets/images/feature-1.png';
};

export const getBookGalleryImages = function (book) {
  if (Array.isArray(book.gallery) && book.gallery.length) {
    return [...new Set(book.gallery.map(normalizeBookAssetPath).filter(Boolean))];
  }

  return book.image ? [getBookPrimaryImage(book)] : [];
};

const getBookDescriptionAnalysis = function (book) {
  const cacheKey = `${book.id || book.handle || book.title || ''}::${book.descriptionHtml || ''}`;
  const fallbackMarkup = `<p>${book.descriptionText || 'Thông tin sản phẩm đang được cập nhật.'}</p>`;
  const rawMarkup = typeof book.descriptionHtml === 'string' && book.descriptionHtml.trim()
    ? book.descriptionHtml.trim()
    : fallbackMarkup;

  if (bookDescriptionAnalysisCache.has(cacheKey)) {
    return bookDescriptionAnalysisCache.get(cacheKey);
  }

  const normalizeDescriptionBlockText = function (value) {
    return normalizeSpecKey(String(value || ''));
  };

  const parseInlineSpec = function (value) {
    const normalizedValue = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
    const separatorIndex = normalizedValue.indexOf(':');

    if (separatorIndex <= 0) {
      return null;
    }

    const label = getCanonicalSpecLabel(normalizedValue.slice(0, separatorIndex));
    const detailValue = normalizedValue.slice(separatorIndex + 1).trim();

    if (!label || !detailValue) {
      return null;
    }

    return {
      label: getDisplaySpecLabel(label),
      value: detailValue
    };
  };

  const ignoredBlocks = new Set(['thong tin san pham', 'ten nha cung cap']);
  const template = document.createElement('template');
  template.innerHTML = rawMarkup;

  const blockNodes = [...template.content.childNodes].reduce((items, node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      items.push(node);
      return items;
    }

    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const paragraph = document.createElement('p');
      paragraph.textContent = node.textContent.trim();
      items.push(paragraph);
    }

    return items;
  }, []);

  const extractedSpecs = [];
  const cleanedNodes = blockNodes.reduce((items, node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return items;
    }

    const tagName = node.tagName.toLowerCase();

    if (tagName === 'ul' || tagName === 'ol') {
      const clone = node.cloneNode(true);
      const listItems = [...clone.children].filter((child) => child.tagName === 'LI');
      const recognizedItems = [];

      listItems.forEach((item) => {
        const spec = parseInlineSpec(item.textContent);

        if (!spec) {
          return;
        }

        recognizedItems.push({ element: item, spec });
      });

      const shouldExtractSpecs = recognizedItems.length >= 3
        && recognizedItems.length >= Math.ceil(listItems.length / 2);

      if (!shouldExtractSpecs) {
        items.push(node);
        return items;
      }

      recognizedItems.forEach((entry) => {
        extractedSpecs.push(entry.spec);
        entry.element.remove();
      });

      if ([...clone.children].some((child) => normalizeDescriptionBlockText(child.textContent))) {
        items.push(clone);
      }

      return items;
    }

    const inlineSpec = parseInlineSpec(node.textContent);
    const isSimpleSpecBlock = inlineSpec
      && node.children.length === 0
      && node.textContent.trim().length <= 140;

    if (isSimpleSpecBlock) {
      extractedSpecs.push(inlineSpec);
      return items;
    }

    items.push(node);
    return items;
  }, []);

  const seenBlocks = new Set();
  const cleanedMarkup = cleanedNodes.reduce((items, node) => {
    const blockText = normalizeDescriptionBlockText(node.textContent);

    if (!blockText || ignoredBlocks.has(blockText) || seenBlocks.has(blockText)) {
      return items;
    }

    seenBlocks.add(blockText);
    items.push(node.outerHTML);
    return items;
  }, []).join('');

  const analysis = {
    markup: cleanedMarkup || fallbackMarkup,
    cleanedText: extractPlainTextFromMarkup(cleanedMarkup || fallbackMarkup),
    extractedSpecs: dedupeSpecItems(extractedSpecs)
  };

  bookDescriptionAnalysisCache.set(cacheKey, analysis);
  return analysis;
};

export const getBookSpecs = function (book) {
  const descriptionAnalysis = getBookDescriptionAnalysis(book);

  return dedupeSpecItems([
    ...(Array.isArray(book.specs) ? book.specs : []),
    ...buildBookFieldSpecs(book),
    ...descriptionAnalysis.extractedSpecs
  ]);
};

export const getBookDisplayAuthor = function (book) {
  return book.author || findSpecValue(getBookSpecs(book), ['tac gia', 'tac gia dich gia']);
};

export const getBookDisplayDescription = function (book) {
  const rawDescription = String(book.description || '').trim();

  if (rawDescription && !normalizeSpecKey(rawDescription).includes('dong bo tu trang san pham goc')) {
    return rawDescription;
  }

  const cleanedText = getBookDescriptionAnalysis(book).cleanedText || String(book.descriptionText || '').trim();

  if (!cleanedText || normalizeSpecKey(cleanedText).includes('dong bo tu trang san pham goc')) {
    return '';
  }

  return cleanedText.length > 220
    ? `${cleanedText.slice(0, 217).trimEnd()}...`
    : cleanedText;
};

export const getBookDescriptionMarkup = function (book) {
  return getBookDescriptionAnalysis(book).markup;
};

export const getBookGalleryCaption = function (book, index, total) {
  if (total <= 1) {
    return book.title;
  }

  return `${book.title} - ảnh ${index + 1}`;
};

export const getBookDetailProfile = function (categories, book) {
  return bookDetailProfiles[getBookParentSlug(categories, book)] || bookDetailProfiles.default;
};

export const getBookInternalCode = function (book) {
  return book.sku || `BK-${String(book.id).padStart(3, '0')}`;
};

export { BOOKS_PER_PAGE, BOOK_SORT_OPTIONS };
