import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  "https://www.vinabook.com/products/20-ngay-on-tap-toan-dien-kien-thuc-tieng-anh-lop-5",
  "https://www.vinabook.com/products/30-de-luyen-thi-tot-nghiep-thpt-2026-dia-li",
  "https://www.vinabook.com/products/30-de-luyen-thi-tot-nghiep-thpt-2026-hoa-hoc",
  "https://www.vinabook.com/products/30-de-luyen-thi-tot-nghiep-thpt-2026-lich-su",
  "https://www.vinabook.com/products/30-de-luyen-thi-tot-nghiep-thpt-2026-mon-toan",
  "https://www.vinabook.com/products/30-de-luyen-thi-tot-nghiep-thpt-2026-tieng-anh",
  "https://www.vinabook.com/products/50-de-luyen-thi-tot-nghiep-thpt-2026-ngu-van",
  "https://www.vinabook.com/products/a-holistic-approach-to-ielts-writing",
  "https://www.vinabook.com/products/bai-giang-on-thi-theo-chu-de-hinh-hoc-11",
  "https://www.vinabook.com/products/bai-tap-bo-tro-va-phat-trien-nang-luc-mon-tieng-anh-lop-10-tap-1",
  "https://www.vinabook.com/products/bai-tap-bo-tro-va-phat-trien-nang-luc-mon-tieng-anh-lop-11-tap-1",
  "https://www.vinabook.com/products/bai-tap-bo-tro-va-phat-trien-nang-luc-mon-tieng-anh-lop-12-tap-1",
  "https://www.vinabook.com/products/bai-tap-bo-tro-va-phat-trien-nang-luc-mon-tieng-anh-lop-6-tap-1",
  "https://www.vinabook.com/products/bai-tap-bo-tro-va-phat-trien-nang-luc-mon-tieng-anh-lop-7-tap-1",
  "https://www.vinabook.com/products/bai-tap-bo-tro-va-phat-trien-nang-luc-mon-tieng-anh-lop-8-tap-1",
  "https://www.vinabook.com/products/bai-tap-bo-tro-va-phat-trien-nang-luc-mon-tieng-anh-lop-9-tap-1",
  "https://www.vinabook.com/products/bai-tap-hinh-hoc-chon-loc-cho-hoc-sinh-trung-hoc-co-so",
  "https://www.vinabook.com/products/bai-tap-so-hoc-va-dai-so-chon-loc-cho-hoc-sinh-trung-hoc-co-so",
  "https://www.vinabook.com/products/be-lam-quen-voi-chu-cai-5-6-tuoi-quyen-2",
  "https://www.vinabook.com/products/be-lam-quen-voi-toan-danh-cho-be-tu-5-6-tuoi-1",
  "https://www.vinabook.com/products/be-vao-lop-1-tap-to-tap-viet-chu-hoa",
  "https://www.vinabook.com/products/be-vao-lop-1-tap-to-chu-cai-quyen-2",
  "https://www.vinabook.com/products/be-vao-lop-1-tap-to-chu-cai-quyen-3",
  "https://www.vinabook.com/products/bo-de-kiem-tra-tieng-viet-lop-1-tap-2",
  "https://www.vinabook.com/products/bo-de-kiem-tra-tieng-viet-lop-2-tap-1",
  "https://www.vinabook.com/products/bo-de-minh-hoa-luyen-thi-thpt-quoc-gia-mon-toan",
  "https://www.vinabook.com/products/bo-de-minh-hoa-luyen-thi-thpt-quoc-gia-nam-2019-mon-hoa-hoc",
  "https://www.vinabook.com/products/bo-de-minh-hoa-luyen-thi-thpt-quoc-gia-nam-2019-mon-lich-su",
  "https://www.vinabook.com/products/bo-de-minh-hoa-luyen-thi-thpt-quoc-gia-nam-2019-mon-tieng-anh-tap-1",
  "https://www.vinabook.com/products/bo-de-minh-hoa-luyen-thi-thpt-quoc-gia-nam-2019-mon-toan",
  "https://www.vinabook.com/products/bo-de-on-luyen-thi-vao-lop-10-thpt-chuyen-mon-ngu-van",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-1-2019-bai-tap-bo-8-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-10-2019-bai-tap-bo-7-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-11-2019-bai-tap-bo-7-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-12-2019-bai-tap-bo-7-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-2-2019-bai-tap-bo-8-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-3-2019-bai-tap-bo-8-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-4-2019-bai-tap-bo-12-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-5-2019-bai-tap-bo-12-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-6-2019-bai-tap-bo-6-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-7-2019-bai-tap-bo-6-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-8-2019-bai-tap-bo-7-cuon",
  "https://www.vinabook.com/products/bo-sach-giao-khoa-lop-9-2019-bai-tap-bo-7-cuon",
  "https://www.vinabook.com/products/bo-sach-hello-chao-lop-1-bo-5-cuon",
  "https://www.vinabook.com/products/boi-duong-hoc-sinh-gioi-thcs-on-thi-vao-lop-10-thpt-chuyen-mon-toan",
  "https://www.vinabook.com/products/boi-duong-hoc-sinh-gioi-thcs-va-on-thi-vao-lop-10-thpt-chuyen-mon-ngu-van",
  "https://www.vinabook.com/products/cac-chu-diem-va-de-on-luyen-vao-lop-10-mon-toan-tap-1",
  "https://www.vinabook.com/products/cac-de-kiem-tra-toan-thuc-te-lop-8-tap-1"
];

const CATEGORY_LABEL = 'S\u00E1ch Gi\u00E1o Khoa - Gi\u00E1o Tr\u00ECnh';
const SUBCATEGORY_SLUG = 'sach-tham-khao';
const SUBCATEGORY_LABEL = 'S\u00E1ch Tham Kh\u1EA3o';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-giao-khoa-giao-trinh', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__giao_khoa_sach_tham_khao_files.txt';
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
