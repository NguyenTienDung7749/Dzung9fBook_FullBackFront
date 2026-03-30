import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/tu-duy-tien-bac-tien-sinh-ra-tien',
  'https://www.vinabook.com/products/nguyen-tac-giao-dich-trong-ngay-day-trading-101',
  'https://www.vinabook.com/products/tai-chinh-ca-nhan-can-ban-personal-finance-101',
  'https://www.vinabook.com/products/tu-do-tai-chinh',
  'https://www.vinabook.com/products/lam-giau-theo-chu-ky',
  'https://www.vinabook.com/products/bi-mat-khoa-hoc-lam-giau',
  'https://www.vinabook.com/products/200-bi-kip-dung-tien-thong-minh-cho-nguoi-tre',
  'https://www.vinabook.com/products/tien-luat-hap-dan',
  'https://www.vinabook.com/products/hoach-dinh-tai-chinh-nhu-chuyen-gia',
  'https://www.vinabook.com/products/make-money-online-kiem-thu-nhap-thu-dong-khong-gioi-han-trong-gio-lam-viec',
  'https://www.vinabook.com/products/de-tu-do-tai-chinh-tu-con-duong-kinh-doanh-khoi-tao-dau-tu-du-tru-va-tu-do',
  'https://www.vinabook.com/products/tai-chinh-danh-cho-nguoi-so-so-thuc-su-hieu-ve-tai-chinh-doanh-nghiep-trong-giai-doan-sinh-ton',
  'https://www.vinabook.com/products/tu-duy-bang-con-so-cuoc-song-ruc-ro-qua-lang-kinh-toan-hoc',
  'https://www.vinabook.com/products/an-toan-tai-chinh-tron-doi',
  'https://www.vinabook.com/products/ky-nang-quan-ly-tai-chinh-ca-nhan-cho-gen-z',
  'https://www.vinabook.com/products/tam-thu-cua-warren-buffett-danh-cho-con-cai',
  'https://www.vinabook.com/products/su-minh-triet-cua-tai-chinh-di-tim-tinh-nhan-van-trong-the-gioi-cua-rui-ro-va',
  'https://www.vinabook.com/products/the-finance-book-tai-chinh-doanh-nghiep',
  'https://www.vinabook.com/products/dau-tu-tai-chinh-thong-minh-con-duong-lam-giau-cho-nguoi-biet-nam-bat-co-hoi'
];

const CATEGORY_LABEL = 'S\u00e1ch Kinh T\u1ebf';
const SUBCATEGORY_SLUG = 'tai-chinh-ke-toan';
const SUBCATEGORY_LABEL = 'T\u00e0i Ch\u00ednh - K\u1ebf To\u00e1n';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__tai_chinh_ke_toan_files.txt';
const PRUNE_HANDLES = [];

await runLegacyJsonProductImport(import.meta.url, {
  sourceUrls: SOURCE_URLS,
  categoryLabel: CATEGORY_LABEL,
  subcategorySlug: SUBCATEGORY_SLUG,
  subcategoryLabel: SUBCATEGORY_LABEL,
  imagesRootSegments: IMAGES_ROOT_SEGMENTS,
  filesListName: FILES_LIST_NAME,
  mergeStrategy: 'replaceSubcategorySlice',
  targetHandleScope: 'all',
  resetImagesRootBeforeRun: true,
  clearProductDirectoryBeforeWrite: false,
  skipSoldOut: false,
  includeSourceProductId: false,
  fallbackToHtmlMetaImages: false,
  pruneHandles: PRUNE_HANDLES
});
