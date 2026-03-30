import fs from 'node:fs/promises';
import path from 'node:path';

const PUBLIC_ROOT = path.resolve('public');
const STATIC_RUNTIME_CONFIG = `window.__DZUNG9FBOOK_RUNTIME__ = Object.freeze({
  providerMode: 'static',
  apiBaseUrl: '/api'
});
`;

const readTemplate = function (...segments) {
  return fs.readFile(path.resolve(...segments), 'utf8');
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
  }
];

const renderPage = function (layout, replacements) {
  return layout
    .replaceAll('{{TITLE}}', replacements.title)
    .replaceAll('{{DESCRIPTION}}', replacements.description)
    .replaceAll('{{CANONICAL_PATH}}', replacements.canonicalPath)
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

const main = async function () {
  const [layout, header, footer, scripts] = await Promise.all([
    readTemplate('src', 'templates', 'layout.html'),
    readTemplate('src', 'templates', 'partials', 'header.html'),
    readTemplate('src', 'templates', 'partials', 'footer.html'),
    readTemplate('src', 'templates', 'partials', 'scripts.html')
  ]);

  await fs.mkdir(PUBLIC_ROOT, { recursive: true });

  await Promise.all([
    copyRuntimeDirectory(['assets', 'css'], ['public', 'assets', 'css']),
    copyRuntimeDirectory(['assets', 'js'], ['public', 'assets', 'js']),
    copyRuntimeDirectory(['assets', 'images'], ['public', 'assets', 'images']),
    fs.copyFile(path.resolve('favicon.svg'), path.resolve(PUBLIC_ROOT, 'favicon.svg')),
    fs.writeFile(path.resolve(PUBLIC_ROOT, 'runtime-config.js'), STATIC_RUNTIME_CONFIG, 'utf8')
  ]);

  await Promise.all(pageConfigs.map(async (config) => {
    const mainMarkup = await readTemplate('src', 'templates', 'pages', config.source);
    const output = renderPage(layout, {
      ...config,
      header,
      footer,
      scripts,
      main: mainMarkup
    });
    await fs.writeFile(path.resolve(PUBLIC_ROOT, config.output), output.trimEnd() + '\n', 'utf8');
  }));

  console.log(`Built ${pageConfigs.length} HTML pages.`);
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
