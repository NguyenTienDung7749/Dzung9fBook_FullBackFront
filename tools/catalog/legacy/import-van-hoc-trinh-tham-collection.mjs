import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/bup-be-dang-ngu-tai-ban-2026',
  'https://www.vinabook.com/products/duoi-lop-da-nguoi-chuyen-ky-bi-nua-dem',
  'https://www.vinabook.com/products/muoi-bay-nam-mat-tich',
  'https://www.vinabook.com/products/nui-cam',
  'https://www.vinabook.com/products/bi-mat-cua-thien-than',
  'https://www.vinabook.com/products/chuyen-bay-tu-than',
  'https://www.vinabook.com/products/nguoi-ho-tu-vu-deu-phai-chet',
  'https://www.vinabook.com/products/vi-ngay-tho',
  'https://www.vinabook.com/products/bong-ma-o-casino',
  'https://www.vinabook.com/products/nguoi-tim-xac-tap-4',
  'https://www.vinabook.com/products/sadie-neu-co-chet-su-that-se-bi-chon-vui',
  'https://www.vinabook.com/products/truy-tim-bong-den',
  'https://www.vinabook.com/products/chim-trang-sa-vao-rung-tham',
  'https://www.vinabook.com/products/buoc-ngoat-cuoi-cung',
  'https://www.vinabook.com/products/chuyen-gia-tam-ly-mac-nam-qua-den',
  'https://www.vinabook.com/products/gui-nhung-nguoi-khong-duoc-bao-ve',
  'https://www.vinabook.com/products/ti-nam-nu-hai-tac',
  'https://www.vinabook.com/products/san-anh-di-dem-tron-bo',
  'https://www.vinabook.com/products/combo-sach-ghi-chep-phap-y-bo-3-cuon',
  'https://www.vinabook.com/products/ten-cua-doa-hong-tai-ban-2024',
  'https://www.vinabook.com/products/the-mystery-of-the-blue-train-bi-mat-chuyen-tau-xanh',
  'https://www.vinabook.com/products/mexico-ky-an',
  'https://www.vinabook.com/products/ghi-chep-phap-y-tap-2-khi-tu-thi-biet-noi',
  'https://www.vinabook.com/products/ghi-chep-phap-y-nhung-thi-the-khong-hoan-chinh',
  'https://www.vinabook.com/products/noa-mua-xuan-thuc-giac',
  'https://www.vinabook.com/products/ghi-chep-phap-y-nhung-cai-chet-bi-an'
];

const CATEGORY_LABEL = 'Sách Văn Học Trong Nước';
const SUBCATEGORY_SLUG = 'trinh-tham';
const SUBCATEGORY_LABEL = 'Trinh Thám';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-van-hoc-trong-nuoc', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__van_hoc_trinh_tham_files.txt';
const PRUNE_HANDLES = [
  'nhung-co-gai-mat-tich',
  'vi-khach-cuoi-cung'
];

await runLegacyJsonProductImport(import.meta.url, {
  sourceUrls: SOURCE_URLS,
  categoryLabel: CATEGORY_LABEL,
  subcategorySlug: SUBCATEGORY_SLUG,
  subcategoryLabel: SUBCATEGORY_LABEL,
  imagesRootSegments: IMAGES_ROOT_SEGMENTS,
  filesListName: FILES_LIST_NAME,
  mergeStrategy: 'replaceTargetHandles',
  targetHandleScope: 'all',
  resetImagesRootBeforeRun: false,
  clearProductDirectoryBeforeWrite: true,
  skipSoldOut: true,
  includeSourceProductId: true,
  fallbackToHtmlMetaImages: false,
  pruneHandles: PRUNE_HANDLES
});
