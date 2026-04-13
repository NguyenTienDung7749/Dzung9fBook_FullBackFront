import fs from 'node:fs/promises';
import path from 'node:path';
import { BLOG_REVIEW_PAGES } from './blog-review-data.mjs';

const PUBLIC_ROOT = path.resolve('public');
const STATIC_RUNTIME_CONFIG = `window.__DZUNG9FBOOK_RUNTIME__ = Object.freeze({
  providerMode: 'static',
  apiBaseUrl: '/api'
});
`;

const readTemplate = function (...segments) {
  return fs.readFile(path.resolve(...segments), 'utf8');
};

const escapeHtml = function (value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const pageConfigs = [
  {
    output: 'index.html',
    source: 'home.html',
    title: 'Dzung9fBook | Trang chủ',
    description: 'Dzung9fBook là không gian đọc trực tuyến với danh mục sách chọn lọc, dễ tìm và thuận tiện để mua sắm hằng ngày.',
    canonicalPath: './index.html',
    bodyAttributes: 'data-page="home"',
    extraHead: '  <link rel="preload" as="image" href="./assets/images/hero-banner.png">\n  <link rel="preload" as="image" href="./assets/images/hero-bg.jpg">'
  },
  {
    output: 'books.html',
    source: 'books.html',
    title: 'Dzung9fBook | Sách',
    description: 'Khám phá danh mục sách của Dzung9fBook với ô tìm kiếm nhanh, bộ lọc thể loại và trang chi tiết cho từng tựa sách.',
    canonicalPath: './books.html',
    bodyAttributes: 'data-page="books"',
    extraHead: ''
  },
  {
    output: 'blog.html',
    source: 'blog.html',
    title: 'Dzung9fBook | Blog Review Sách',
    description: 'Blog Dzung9fBook là nơi cập nhật các bài review ngắn, ghi chú đọc nhanh và gợi ý đầu sách đang có mặt tại nhà sách.',
    canonicalPath: './blog.html',
    bodyAttributes: 'data-page="blog"',
    extraHead: ''
  },
  {
    output: 'about.html',
    source: 'about.html',
    title: 'Dzung9fBook | Giới thiệu',
    description: 'Tìm hiểu về Dzung9fBook, định hướng phục vụ, phong cách chọn sách và những giá trị tạo nên một trải nghiệm mua sách trực tuyến gần gũi.',
    canonicalPath: './about.html',
    bodyAttributes: 'data-page="about"',
    extraHead: '  <link rel="preload" as="image" href="./assets/images/hero-banner.png">'
  },
  {
    output: 'book-detail.html',
    source: 'book-detail.html',
    title: 'Dzung9fBook | Chi tiết sách',
    description: 'Trang chi tiết sách của Dzung9fBook với thông tin tác giả, thể loại, giá bán và gợi ý đọc tiếp theo.',
    canonicalPath: './book-detail.html',
    bodyAttributes: 'data-page="books" data-layout="book-detail"',
    extraHead: ''
  },
  {
    output: 'cart.html',
    source: 'cart.html',
    title: 'Dzung9fBook | Giỏ hàng',
    description: 'Giỏ hàng Dzung9fBook giúp bạn xem lại những cuốn sách đã chọn, cập nhật số lượng và tổng tạm tính ngay trên trang.',
    canonicalPath: './cart.html',
    bodyAttributes: 'data-page="cart"',
    extraHead: ''
  },
  {
    output: 'login.html',
    source: 'login.html',
    title: 'Dzung9fBook | Đăng nhập',
    description: 'Đăng nhập vào Dzung9fBook để lưu thông tin tài khoản, theo dõi giỏ sách và tiếp tục hành trình đọc của bạn.',
    canonicalPath: './login.html',
    bodyAttributes: 'data-page="login"',
    extraHead: ''
  },
  {
    output: 'register.html',
    source: 'register.html',
    title: 'Dzung9fBook | Đăng ký',
    description: 'Tạo tài khoản Dzung9fBook để lưu thông tin cá nhân, giỏ sách và nhận trải nghiệm mua sắm nhất quán hơn.',
    canonicalPath: './register.html',
    bodyAttributes: 'data-page="register"',
    extraHead: ''
  },
  {
    output: 'contact.html',
    source: 'contact.html',
    title: 'Dzung9fBook | Liên hệ',
    description: 'Liên hệ với Dzung9fBook để được tư vấn đầu sách, hỏi về đơn hàng hoặc cần hỗ trợ chọn sách phù hợp.',
    canonicalPath: './contact.html',
    bodyAttributes: 'data-page="contact"',
    extraHead: ''
  },
  {
    output: 'profile.html',
    source: 'profile.html',
    title: 'Dzung9fBook | Hồ sơ',
    description: 'Trang tài khoản Dzung9fBook, nơi bạn xem lại thông tin cá nhân và tiếp tục hành trình mua sách của mình.',
    canonicalPath: './profile.html',
    bodyAttributes: 'data-page="profile"',
    extraHead: ''
  },
  {
    output: 'orders.html',
    source: 'orders.html',
    title: 'Dzung9fBook | Đơn hàng của bạn',
    description: 'Trang danh sách đơn hàng Dzung9fBook, nơi bạn theo dõi trạng thái xử lý, thanh toán và mở nhanh chi tiết từng đơn đã đặt.',
    canonicalPath: './orders.html',
    bodyAttributes: 'data-page="orders"',
    extraHead: ''
  },
  {
    output: 'order-detail.html',
    source: 'order-detail.html',
    title: 'Dzung9fBook | Chi tiết đơn hàng',
    description: 'Theo dõi chi tiết đơn hàng của bạn tại Dzung9fBook với trạng thái xử lý, thông tin giao nhận và các tựa sách đã đặt.',
    canonicalPath: './order-detail.html',
    bodyAttributes: 'data-page="order-detail"',
    extraHead: ''
  },
  {
    output: 'admin.html',
    source: 'admin.html',
    title: 'Dzung9fBook | Khu quản trị',
    description: 'Điểm vào quản trị tối thiểu để admin mở nhanh các khu vực đơn hàng, tồn kho và tin nhắn liên hệ của Dzung9fBook.',
    canonicalPath: './admin.html',
    bodyAttributes: 'data-page="admin-home"',
    extraHead: ''
  },
  {
    output: 'admin-orders.html',
    source: 'admin-orders.html',
    title: 'Dzung9fBook | Quản lý đơn hàng',
    description: 'Khu vực quản trị tối thiểu để admin theo dõi và cập nhật trạng thái đơn hàng của Dzung9fBook.',
    canonicalPath: './admin-orders.html',
    bodyAttributes: 'data-page="admin-orders"',
    extraHead: ''
  },
  {
    output: 'admin-books.html',
    source: 'admin-books.html',
    title: 'Dzung9fBook | Quản lý tồn kho',
    description: 'Khu vực quản trị tối thiểu để admin cập nhật sold-out và trạng thái tồn kho cho các tựa sách của Dzung9fBook.',
    canonicalPath: './admin-books.html',
    bodyAttributes: 'data-page="admin-books"',
    extraHead: ''
  },
  {
    output: 'admin-messages.html',
    source: 'admin-messages.html',
    title: 'Dzung9fBook | Quản lý liên hệ',
    description: 'Khu vực quản trị tối thiểu để admin theo dõi và cập nhật các tin nhắn liên hệ của Dzung9fBook.',
    canonicalPath: './admin-messages.html',
    bodyAttributes: 'data-page="admin-messages"',
    extraHead: ''
  }
];

const renderPage = function (layout, replacements) {
  return layout
    .replaceAll('{{TITLE}}', escapeHtml(replacements.title))
    .replaceAll('{{DESCRIPTION}}', escapeHtml(replacements.description))
    .replaceAll('{{CANONICAL_PATH}}', escapeHtml(replacements.canonicalPath))
    .replace('{{EXTRA_HEAD}}', replacements.extraHead)
    .replace('{{BODY_ATTRIBUTES}}', replacements.bodyAttributes)
    .replace('{{HEADER}}', replacements.header)
    .replace('{{MAIN}}', replacements.main)
    .replace('{{FOOTER}}', replacements.footer)
    .replace('{{SCRIPTS}}', replacements.scripts);
};

const copyRuntimeDirectory = async function (sourceSegments, targetSegments) {
  const sourcePath = path.resolve(...sourceSegments);
  const targetPath = path.resolve(...targetSegments);

  await fs.rm(targetPath, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.cp(sourcePath, targetPath, { recursive: true, force: true });
};

const renderBlogReviewList = function (items) {
  return `
    <ul class="blog-review-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
};

const renderBlogQuickFacts = function (items) {
  return `
    <ul class="blog-article__facts">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
};

const renderBlogReviewMarkup = function (review) {
  const sectionsMarkup = review.sections.map(function (section) {
    return `
      <section class="blog-review-block">
        <h2>${escapeHtml(section.title)}</h2>
        ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </section>
    `;
  }).join('');

  return `
<main>
  <section class="section blog-article-page">
    <div class="container">
      <article class="blog-article">
        <nav class="blog-article__breadcrumb" aria-label="Breadcrumb">
          <a href="./index.html">Trang chủ</a>
          <span aria-hidden="true">/</span>
          <a href="./blog.html">Blog</a>
          <span aria-hidden="true">/</span>
          <span>${escapeHtml(review.title)}</span>
        </nav>

        <header class="blog-article__header">
          <p class="page-label">Review sách</p>
          <h1 class="page-title">${escapeHtml(review.title)}</h1>
          <div class="blog-article__meta">
            <span>Người viết: Dzung9fBook</span>
            <span>${escapeHtml(review.dateLabel)}</span>
            <span>${escapeHtml(review.readTime)}</span>
          </div>
          <p class="page-description">${escapeHtml(review.dek)}</p>
        </header>

        <figure class="blog-article__cover">
          <img src="${escapeHtml(review.image)}" alt="${escapeHtml(review.imageAlt)}" loading="eager" decoding="async">
        </figure>

        <div class="blog-article__summary">
          <p class="blog-article__lead">${escapeHtml(review.takeaway)}</p>
          ${renderBlogQuickFacts(review.quickFacts)}
        </div>

        <div class="blog-article__content">
          ${sectionsMarkup}

          <section class="blog-article__block">
            <h2>Điểm nổi bật</h2>
            ${renderBlogReviewList(review.focusPoints)}
          </section>

          <section class="blog-article__block">
            <h2>Phù hợp với ai?</h2>
            ${renderBlogReviewList(review.readerNotes)}
          </section>

          <section class="blog-article__block">
            <h2>Mở tiếp nếu thấy hợp gu</h2>
            <p>
              Nếu bài review này đúng với điều bạn đang tìm, bạn có thể mở thẳng trang sách để xem thêm hình ảnh, giá bán và thông tin chi tiết trước khi
              đưa vào giỏ.
            </p>
          </section>
        </div>

        <div class="blog-article__actions">
          <a href="./blog.html" class="btn btn-secondary">Quay lại Blog</a>
          <a href="${escapeHtml(review.bookUrl)}" class="btn btn-primary">Xem sách này</a>
        </div>
      </article>
    </div>
  </section>
</main>
`.trim();
};

const buildTemplatePages = async function (layout, sharedPartials) {
  await Promise.all(pageConfigs.map(async function (config) {
    const mainMarkup = await readTemplate('src', 'templates', 'pages', config.source);
    const output = renderPage(layout, {
      ...config,
      ...sharedPartials,
      main: mainMarkup
    });

    await fs.writeFile(path.resolve(PUBLIC_ROOT, config.output), output.trimEnd() + '\n', 'utf8');
  }));
};

const buildBlogReviewPages = async function (layout, sharedPartials) {
  await Promise.all(BLOG_REVIEW_PAGES.map(async function (review) {
    const output = renderPage(layout, {
      title: `Dzung9fBook | Review ${review.title}`,
      description: review.description,
      canonicalPath: `./${review.output}`,
      bodyAttributes: `data-page="blog-detail" data-blog-slug="${escapeHtml(review.id)}" data-nav-page="blog"`,
      extraHead: `  <link rel="preload" as="image" href="${escapeHtml(review.image)}">`,
      ...sharedPartials,
      main: renderBlogReviewMarkup(review)
    });

    await fs.writeFile(path.resolve(PUBLIC_ROOT, review.output), output.trimEnd() + '\n', 'utf8');
  }));
};

const main = async function () {
  const [layout, header, footer, scripts] = await Promise.all([
    readTemplate('src', 'templates', 'layout.html'),
    readTemplate('src', 'templates', 'partials', 'header.html'),
    readTemplate('src', 'templates', 'partials', 'footer.html'),
    readTemplate('src', 'templates', 'partials', 'scripts.html')
  ]);

  const sharedPartials = { header, footer, scripts };

  await fs.mkdir(PUBLIC_ROOT, { recursive: true });

  await Promise.all([
    copyRuntimeDirectory(['assets', 'css'], ['public', 'assets', 'css']),
    copyRuntimeDirectory(['assets', 'js'], ['public', 'assets', 'js']),
    copyRuntimeDirectory(['assets', 'images'], ['public', 'assets', 'images']),
    fs.copyFile(path.resolve('favicon.svg'), path.resolve(PUBLIC_ROOT, 'favicon.svg')),
    fs.writeFile(path.resolve(PUBLIC_ROOT, 'runtime-config.js'), STATIC_RUNTIME_CONFIG, 'utf8')
  ]);

  await Promise.all([
    buildTemplatePages(layout, sharedPartials),
    buildBlogReviewPages(layout, sharedPartials)
  ]);

  console.log(`Built ${pageConfigs.length + BLOG_REVIEW_PAGES.length} HTML pages.`);
};

main().catch(function (error) {
  console.error(error.message || error);
  process.exitCode = 1;
});
