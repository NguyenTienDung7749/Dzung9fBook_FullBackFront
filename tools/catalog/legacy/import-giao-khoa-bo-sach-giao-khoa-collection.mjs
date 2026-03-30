import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  "https://www.vinabook.com/products/chuan-bi-cho-be-vao-lop-1-tap-to-chu-cai-quyen-2-tai-ban-2020",
  "https://www.vinabook.com/products/chuan-bi-cho-be-vao-lop-mot-tui-10-cuon-tai-ban-2018",
  "https://www.vinabook.com/products/tu-sach-tu-duy-toan-hoc-hq-nhan-biet-so-dem",
  "https://www.vinabook.com/products/tu-sach-tu-duy-toan-hoc-hq-be-lam-quen-phep-cong-co-nho",
  "https://www.vinabook.com/products/tu-sach-tu-duy-toan-hoc-hq-be-lam-quen-phep-tru-co-nho",
  "https://www.vinabook.com/products/tu-sach-tu-duy-toan-hoc-hq-giup-be-thanh-thao-phep-cong-va-phep-tru",
  "https://www.vinabook.com/products/tu-sach-tu-duy-toan-hoc-hq-lam-quen-phan-bu-va-phep-tinh-nham",
  "https://www.vinabook.com/products/tu-sach-tu-duy-toan-hoc-hq-lam-quen-voi-so-thu-tu-va-phep-tinh",
  "https://www.vinabook.com/products/tu-sach-tu-duy-toan-hoc-hq-luyen-tap-phep-tinh-co-nho",
  "https://www.vinabook.com/products/tu-sach-tu-duy-toan-hoc-hq-vui-hoc-phep-tru-so-nho-hon-5"
];

const CATEGORY_LABEL = 'S\u00E1ch Gi\u00E1o Khoa - Gi\u00E1o Tr\u00ECnh';
const SUBCATEGORY_SLUG = 'bo-sach-giao-khoa';
const SUBCATEGORY_LABEL = 'B\u1ED9 S\u00E1ch Gi\u00E1o Khoa';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-giao-khoa-giao-trinh', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__giao_khoa_bo_sach_giao_khoa_files.txt';
const PRUNE_HANDLES = [];

await runLegacyJsonProductImport(import.meta.url, {
  sourceUrls: SOURCE_URLS,
  categoryLabel: CATEGORY_LABEL,
  subcategorySlug: SUBCATEGORY_SLUG,
  subcategoryLabel: SUBCATEGORY_LABEL,
  imagesRootSegments: IMAGES_ROOT_SEGMENTS,
  filesListName: FILES_LIST_NAME,
  mergeStrategy: 'replaceTargetHandles',
  targetHandleScope: 'slice',
  resetImagesRootBeforeRun: false,
  clearProductDirectoryBeforeWrite: true,
  skipSoldOut: true,
  includeSourceProductId: true,
  fallbackToHtmlMetaImages: true,
  pruneHandles: PRUNE_HANDLES
});
