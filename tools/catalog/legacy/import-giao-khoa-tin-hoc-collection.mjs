import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  "https://www.vinabook.com/products/36-bieu-mau-excel-danh-cho-van-phong",
  "https://www.vinabook.com/products/3ds-max-dung-phim-3d-kien-truc-su-dung-pluf-ins-v-ray-150-rc2-ung-dung-thuc",
  "https://www.vinabook.com/products/ai-loi-va-hai-ai-snake-oil",
  "https://www.vinabook.com/products/ai-va-google-sheets-tu-cong-thuc-don-gian-den-tu-dong-hoa-toan-dien",
  "https://www.vinabook.com/products/bai-tap-mach-dien-tinh-toan-mo-phong-mach-dien-dung-phan-mem-tina",
  "https://www.vinabook.com/products/c-danh-cho-nguoi-bat-dau",
  "https://www.vinabook.com/products/cad-trong-dien-dien-tu-vi-dieu-khien-va-ung-dung",
  "https://www.vinabook.com/products/chat-gpt-thuc-chien",
  "https://www.vinabook.com/products/compute-power-index-ma-nguon-cua-tuong-lai-so",
  "https://www.vinabook.com/products/data-va-ai-thuc-chien-voi-excel-va-power-bi",
  "https://www.vinabook.com/products/giai-ma-tam-ly-hanh-vi-ve-tien",
  "https://www.vinabook.com/products/deepseek-thuc-chien",
  "https://www.vinabook.com/products/dieu-khien-va-giam-sat-trong-cong-nghiep",
  "https://www.vinabook.com/products/gia-cong-khuon-voi-pro-engineer-va-rapidfrom-xor",
  "https://www.vinabook.com/products/giao-dien-nguoi-va-may-voi-s7-intouch",
  "https://www.vinabook.com/products/giao-trinh-thuc-hanh-thiet-ke-kien-truc-revit-toan-tap-dung-cho-cac-phien-ban",
  "https://www.vinabook.com/products/giao-trinh-xu-ly-anh-photoshop-cs5-danh-cho-nguoi-tu-hoc-tap-2-tai-ban-07132013",
  "https://www.vinabook.com/products/giao-trinh-xu-ly-anh-photoshop-cs5-danh-cho-nguoi-tu-hoc-tap-4",
  "https://www.vinabook.com/products/graphics-issue-03-define-the-shapes",
  "https://www.vinabook.com/products/graphics-issue-04-build-the-forms",
  "https://www.vinabook.com/products/graphics-issue-05-explore-the-space",
  "https://www.vinabook.com/products/hanh-trang-lap-trinh",
  "https://www.vinabook.com/products/huong-dan-thuc-hanh-excel-tu-co-ban-den-nang-cao",
  "https://www.vinabook.com/products/huong-dan-thuc-hanh-powerpoint-tu-co-ban-den-nang-cao",
  "https://www.vinabook.com/products/huong-dan-thuc-hanh-word-tu-co-ban-den-nang-cao",
  "https://www.vinabook.com/products/joomla-danh-cho-nguoi-tu-hoc",
  "https://www.vinabook.com/products/khai-thac-ung-dung-adobe-flash-vba-trong-day-hoc-so-va-truyen-thong",
  "https://www.vinabook.com/products/khoa-hoc-cap-toc-ve-ai-danh-cho-chu-doanh-nghiep-tuong-lai",
  "https://www.vinabook.com/products/lap-trinh-he-thong-nhung-voi-raspberry",
  "https://www.vinabook.com/products/lap-trinh-he-thong-thuong-mai-dien-tu",
  "https://www.vinabook.com/products/lap-trinh-iot-voi-arduino-tai-ban-2019",
  "https://www.vinabook.com/products/lap-trinh-ngau-het-say",
  "https://www.vinabook.com/products/lap-trinh-va-cuoc-song",
  "https://www.vinabook.com/products/lap-trinh-voi-plc-s7-1200-va-s7-1500-tai-ban-2019",
  "https://www.vinabook.com/products/lap-trinh-voi-plc-s7-1500-va-rslogix",
  "https://www.vinabook.com/products/mang-truyen-thong-cong-nghiep-scada-ly-thuyet-thuc-hanh",
  "https://www.vinabook.com/products/solidworks-rapidform-xor-danh-cho-nguoi-tu-hoc",
  "https://www.vinabook.com/products/thiet-ke-noi-ngoai-that-giao-trinh-3ds-v-ray-20xx-tu-a-z-tap-1",
  "https://www.vinabook.com/products/thiet-ke-kien-truc-3d-voi-revit-architecture",
  "https://www.vinabook.com/products/thuc-hanh-thiet-ke-chieu-sang-huong-dan-su-dung-dialux-evo",
  "https://www.vinabook.com/products/tu-hoc-3d-max",
  "https://www.vinabook.com/products/tu-hoc-excel-2000-trong-10-tieng-dong-ho",
  "https://www.vinabook.com/products/tu-hoc-nhanh-tin-hoc-cho-nguoi-moi-bat-dau",
  "https://www.vinabook.com/products/tu-hoc-autodesk-mventor-bang-hinh-anh",
  "https://www.vinabook.com/products/tu-hoc-creo-bang-hinh-anh",
  "https://www.vinabook.com/products/ung-dung-ai-trong-cong-viec",
  "https://www.vinabook.com/products/ung-dung-tin-hoc-trien-khai-hieu-qua-chuong-trinh-cdio-va-heeap-tap-2",
  "https://www.vinabook.com/products/ung-dung-vi-xu-ly-va-vi-dieu-khien"
];

const CATEGORY_LABEL = 'S\u00E1ch Gi\u00E1o Khoa - Gi\u00E1o Tr\u00ECnh';
const SUBCATEGORY_SLUG = 'tin-hoc';
const SUBCATEGORY_LABEL = 'Tin H\u1ECDc';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-giao-khoa-giao-trinh', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__giao_khoa_tin_hoc_files.txt';
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
