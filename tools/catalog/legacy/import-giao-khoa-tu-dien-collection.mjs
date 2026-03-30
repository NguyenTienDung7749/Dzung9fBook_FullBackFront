import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  "https://www.vinabook.com/products/dai-tu-dien-chu-nom-an-ban-moi-nhat",
  "https://www.vinabook.com/products/han-viet-tu-dien",
  "https://www.vinabook.com/products/hoc-tieng-han-qua-truyen-co-tich",
  "https://www.vinabook.com/products/keo-day-tim-kiem-100-tu-vung-song-ngu-viet-anh-cho-be",
  "https://www.vinabook.com/products/nguyen-trai-quoc-am-tu-dien",
  "https://www.vinabook.com/products/tu-dien-sach-cong-cu-chu-han-cua-viet-nam-va-trung-quoc",
  "https://www.vinabook.com/products/tu-dien-anh-anh-viet-bia-cung-do-298k",
  "https://www.vinabook.com/products/tu-dien-anh-anh-viet-bia-cung-vang-298k",
  "https://www.vinabook.com/products/tu-dien-anh-anh-viet-bia-cung-xanh-dam-298k",
  "https://www.vinabook.com/products/tu-dien-anh-anh-viet-bia-mem-xanh-den-198k",
  "https://www.vinabook.com/products/tu-dien-anh-viet-bia-mem-trang-198k",
  "https://www.vinabook.com/products/tu-dien-anh-viet-100-000-tu-vl",
  "https://www.vinabook.com/products/tu-dien-anh-viet-120-000-tu-vl",
  "https://www.vinabook.com/products/tu-dien-anh-viet-125-000-tu-vl",
  "https://www.vinabook.com/products/tu-dien-anh-viet-79-000-tu-vl",
  "https://www.vinabook.com/products/tu-dien-anh-viet-80-000-tu-vl",
  "https://www.vinabook.com/products/tu-dien-anh-viet-90-000-tu-vl",
  "https://www.vinabook.com/products/tu-dien-anh-anh-viet-danh-cho-hoc-sinh-bia-xanh-do",
  "https://www.vinabook.com/products/tu-dien-anh-viet-45000-tu",
  "https://www.vinabook.com/products/tu-dien-anh-viet-viet-anh-tai-ban-11991999",
  "https://www.vinabook.com/products/tu-dien-anh-viet-225000-muc-tu-va-dinh-nghia-bia-cung-tai-ban-2022",
  "https://www.vinabook.com/products/tu-dien-anh-viet-225000-muc-tu-va-dinh-nghia-tai-ban-2022",
  "https://www.vinabook.com/products/tu-dien-anh-viet-danh-cho-hoc-sinh-bia-xanh-la-cay",
  "https://www.vinabook.com/products/tu-dien-anh-viet-bang-hinh-anh-gioi-thieu-cac-am-chu-cai-day-bang-chu-cai",
  "https://www.vinabook.com/products/tu-dien-ca-phe",
  "https://www.vinabook.com/products/tu-dien-cach-dung-tieng-anh-dictionary-of-english-usage-tai-ban-2011",
  "https://www.vinabook.com/products/tu-dien-nhat-viet-viet-nhat-tai-ban-12062006",
  "https://www.vinabook.com/products/tu-dien-nhat-viet",
  "https://www.vinabook.com/products/tu-dien-thuat-ngu-ngoai-thuong-va-hang-hai-anh-viet-tai-ban-06032003",
  "https://www.vinabook.com/products/tu-dien-tieng-viet-10x16-vl",
  "https://www.vinabook.com/products/tu-dien-tieng-viet-hoang-phe",
  "https://www.vinabook.com/products/tu-dien-tieng-viet-thong-dung-kho-nho-tai-ban",
  "https://www.vinabook.com/products/tu-dien-triet-hoc-an-do-gian-yeu",
  "https://www.vinabook.com/products/tu-dien-viet-anh-75-000-tu",
  "https://www.vinabook.com/products/tu-dien-viet-hoa",
  "https://www.vinabook.com/products/tu-dien-viet-han-ths-le-huy-khoa"
];

const CATEGORY_LABEL = 'S\u00E1ch Gi\u00E1o Khoa - Gi\u00E1o Tr\u00ECnh';
const SUBCATEGORY_SLUG = 'tu-dien';
const SUBCATEGORY_LABEL = 'T\u1EEB \u0110i\u1EC3n';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-giao-khoa-giao-trinh', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__giao_khoa_tu_dien_files.txt';
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
