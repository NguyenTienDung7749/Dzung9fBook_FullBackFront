import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/6-bi-quyet-quan-ly-du-an-hieu-qua',
  'https://www.vinabook.com/products/chien-luoc-phan-phoi-hang-hoa-tuyet-voi',
  'https://www.vinabook.com/products/combo-box-sach-the-magic-phep-mau-gom-4-quyen-nguoi-hung-hero-bi-mat-secret-suc-manh-power-phep-mau-magic-hop-do-sang-trong',
  'https://www.vinabook.com/products/giu-nguoi-bang-tam-dan-dat-bang-tam',
  'https://www.vinabook.com/products/how-to-quan-ly-hieu-qua-nguon-nhan-luc',
  'https://www.vinabook.com/products/ky-nguyen-phan-no-bi-kip-ha-nhiet-lan-song-phan-no-cua-cong-dong',
  'https://www.vinabook.com/products/mba-bang-hinh-the-usual-mba',
  'https://www.vinabook.com/products/nghe-thuat-dao-tao-cap-quan-ly-cua-toyota-tai-ban-2026',
  'https://www.vinabook.com/products/nghe-thuat-quan-ly-nhan-su',
  'https://www.vinabook.com/products/nghich-ly-cio',
  'https://www.vinabook.com/products/nha-lanh-dao-khong-chuc-danh-robin-sharma',
  'https://www.vinabook.com/products/nhanh-toi-can-tro-thanh-nha-lanh-dao-trong-30-ngay',
  'https://www.vinabook.com/products/nuoc-co-lanh-dao',
  'https://www.vinabook.com/products/phat-trien-ben-vung-trong-ky-nguyen-vuca',
  'https://www.vinabook.com/products/quan-ly-nghiep-tai-ban-2024',
  'https://www.vinabook.com/products/quan-tri-theo-phong-cach-co-vay',
  'https://www.vinabook.com/products/textbook-quan-tri-nguon-nhan-luc-thoi-dai-moi',
  'https://www.vinabook.com/products/than-chu-quan-tri-chia-khoa-cho-quan-tri-va-lanh-dao-hieu-qua',
  'https://www.vinabook.com/products/the-zen-leader-nha-lanh-dao-thien-10-cu-lat-tu-quan-tri-vo-hon-sang-lanh-dao-tinh-thuc',
  'https://www.vinabook.com/products/to-thu',
  'https://www.vinabook.com/products/tro-choi-cua-nhung-ke-thuc-dung'
];

const CATEGORY_LABEL = 'S\u00e1ch Kinh T\u1ebf';
const SUBCATEGORY_SLUG = 'quan-tri-lanh-dao';
const SUBCATEGORY_LABEL = 'Qu\u1ea3n Tr\u1ecb - L\u00e3nh \u0110\u1ea1o';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__quan_tri_lanh_dao_files.txt';
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
