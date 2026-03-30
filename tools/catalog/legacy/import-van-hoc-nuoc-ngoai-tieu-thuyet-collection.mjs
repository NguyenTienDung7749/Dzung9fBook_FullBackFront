import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/anh-em-nha-karamazov-bia-cung-tai-ban-2026',
  'https://www.vinabook.com/products/tay-son-long-than-ky-3',
  'https://www.vinabook.com/products/linh-tu-quoc-mau',
  'https://www.vinabook.com/products/cuc-giau-dong',
  'https://www.vinabook.com/products/tong-tu-tay-oan-tap-2',
  'https://www.vinabook.com/products/day-chau-ngoc-ben-canh-linh-lan',
  'https://www.vinabook.com/products/dua-con-gai-hoang-dang-the-prodigal-daughter-tai-ban-2023',
  'https://www.vinabook.com/products/diem-doi-lua-bia-cung-tai-ban-2025',
  'https://www.vinabook.com/products/ba-tong-thong-truoc-hong-sung-shall-we-tell-the-president-tai-ban-2024',
  'https://www.vinabook.com/products/rai-rac-khap-noi-tren-mat-dat',
  'https://www.vinabook.com/products/nhat-ky-dang-thuy-tram-tai-ban-2026',
  'https://www.vinabook.com/products/lu-nguoi-quy-am-bia-cung-tai-ban-2026',
  'https://www.vinabook.com/products/cua-chuot-va-nguoi-bia-cung-tai-ban-2026',
  'https://www.vinabook.com/products/chu-be-mang-pyjama-soc-tai-ban-2026',
  'https://www.vinabook.com/products/khi-anh-chay-ve-phia-em-tai-ban-2026-tang-kem-bookmark-2-mat-boi-cung',
  'https://www.vinabook.com/products/va-roi-nui-vong-tai-ban-2026',
  'https://www.vinabook.com/products/ong-noi-vuot-nguc-tai-ban-2026',
  'https://www.vinabook.com/products/doi-thua-tai-ban-2025',
  'https://www.vinabook.com/products/chuoc-toi-tai-ban-2025',
  'https://www.vinabook.com/products/nguoi-tot-lau-tren',
  'https://www.vinabook.com/products/cu-roi-dat-xanh-tap-1-nguoi-nha-cho',
  'https://www.vinabook.com/products/ban-thao-de-lai-trong-sanh-le-tan',
  'https://www.vinabook.com/products/bai-hoc-tieng-hy-lap',
  'https://www.vinabook.com/products/parallel-world-love-story-chuyen-tinh-o-the-gioi-song-song',
  'https://www.vinabook.com/products/nhung-mua-hoa-ngay-sau',
  'https://www.vinabook.com/products/khu-vuon-mua-ha-tai-ban-2026',
  'https://www.vinabook.com/products/ke-ngoai-cuoc-bia-cung-tai-ban-2026',
  'https://www.vinabook.com/products/anh-den-noi-ben-cang',
  'https://www.vinabook.com/products/tam-quoc-co-mat-tap-2-rong-nau-vuc-sau',
  'https://www.vinabook.com/products/tam-quoc-co-mat-tap-1-ngay-rong-gap-nan',
  'https://www.vinabook.com/products/ghi-chep-ve-mot-vu-hanh-quyet',
  'https://www.vinabook.com/products/lam-ban-voi-bau-troi-tang-kem-khung-hinh-xinh-xan',
  'https://www.vinabook.com/products/dinh-gio-hu',
  'https://www.vinabook.com/products/thep-da-toi-the-day',
  'https://www.vinabook.com/products/ngo-ngo-dong',
  'https://www.vinabook.com/products/kim-van-kieu',
  'https://www.vinabook.com/products/tieng-nui-bia-cung-tai-ban-2025',
  'https://www.vinabook.com/products/tay-nguoi-lanh-gia',
  'https://www.vinabook.com/products/da-co-anh-trong-noi-nho-cua-em-chua',
  'https://www.vinabook.com/products/vi-hon-the-gian-di-cua-toi-rat-de-thuong-luc-o-nha-tap-1',
  'https://www.vinabook.com/products/doi-gio-bui-bia-cung-kem-chu-ky-tac-gia',
  'https://www.vinabook.com/products/doi-gio-bui',
  'https://www.vinabook.com/products/chang-ban-tam-nhan-gian-binh-pham-tang-kem-bookmark-be-hinh-xe-ngua',
  'https://www.vinabook.com/products/song-o-day-song-1',
  'https://www.vinabook.com/products/thoi-xa-vang-1',
  'https://www.vinabook.com/products/nang-ru-ngay-vang-nghieng',
  'https://www.vinabook.com/products/trai-tim-phu-thuy-1',
  'https://www.vinabook.com/products/lung-tay-noi-gio'
];

const CATEGORY_LABEL = 'Sách Văn Học Nước Ngoài';
const SUBCATEGORY_SLUG = 'tieu-thuyet';
const SUBCATEGORY_LABEL = 'Tiểu Thuyết';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-van-hoc-nuoc-ngoai', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__van_hoc_nuoc_ngoai_tieu_thuyet_files.txt';
const PRUNE_HANDLES = [];

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
  fallbackToHtmlMetaImages: true,
  pruneHandles: PRUNE_HANDLES
});
