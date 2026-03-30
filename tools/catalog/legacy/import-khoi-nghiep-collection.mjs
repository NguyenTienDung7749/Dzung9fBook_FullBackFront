import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/tu-duy-lam-giau-nhung-bai-noi-chuyen-bat-hu-cua-napoleon-hill-tai-ban-2025',
  'https://www.vinabook.com/products/think-and-grow-rich-nghi-giau-va-lam-giau-kinh-nghiem-lam-giau-tu-nhung-bac-thay-hang-dau-the-gioi',
  'https://www.vinabook.com/products/khoa-hoc-cap-toc-ve-tu-ban-va-tien-bac-bai-hoc-tu-thanh-pho-dat-do-nhat-the-gioi',
  'https://www.vinabook.com/products/thiet-ke-va-bai-tri-cua-hang-ban-le',
  'https://www.vinabook.com/products/chien-luoc-san-pham',
  'https://www.vinabook.com/products/kiem-tien-bang-video-ngan',
  'https://www.vinabook.com/products/lua-chon-ryan-levesque',
  'https://www.vinabook.com/products/khoi-nghiep-lua-chon-hay-ban-nang',
  'https://www.vinabook.com/products/noi-dung-ngan-chien-luoc-dai',
  'https://www.vinabook.com/products/day-con-lam-giau-03-huong-dan-dau-tu-de-tro-thanh-nha-dau-tu-lao-luyen',
  'https://www.vinabook.com/products/khoi-nghiep-lang-man-va-thuc-te',
  'https://www.vinabook.com/products/khoi-nghiep-nganh-ban-le',
  'https://www.vinabook.com/products/lam-the-nao-xay-dung-doanh-nghiep-thanh-cong',
  'https://www.vinabook.com/products/10-quy-luat-thuong-mai-dien-tu',
  'https://www.vinabook.com/products/thuc-hanh-khoi-nghiep',
  'https://www.vinabook.com/products/loi-tat-khoi-nghiep',
  'https://www.vinabook.com/products/dung-de-mat-bo',
  'https://www.vinabook.com/products/bo-luat-lao-dong',
  'https://www.vinabook.com/products/nhan-chuoi-cua-hang',
  'https://www.vinabook.com/products/khoi-nghiep-kinh-doanh-ca-phe',
  'https://www.vinabook.com/products/9-lan-khoi-nghiep',
  'https://www.vinabook.com/products/trai-nghiem-ban-le-doc-dao',
  'https://www.vinabook.com/products/khoi-nghiep-kinh-doanh-online-ban-hang-hieu-qua-tren-shopee',
  'https://www.vinabook.com/products/den-sahara-mo-quan-tra-da',
  'https://www.vinabook.com/products/suc-manh-thuong-mai-dien-tu',
  'https://www.vinabook.com/products/tren-lung-khong-tuong',
  'https://www.vinabook.com/products/khoi-nghiep-du-kich',
  'https://www.vinabook.com/products/digital-marketing-cho-nha-quan-ly',
  'https://www.vinabook.com/products/ke-toan-via-he',
  'https://www.vinabook.com/products/khoi-nghiep-tren-xe-lan',
  'https://www.vinabook.com/products/ai-tang-luong-cho-ban',
  'https://www.vinabook.com/products/khoi-nghiep-ban-le',
  'https://www.vinabook.com/products/dinh-vi-ban-than',
  'https://www.vinabook.com/products/ca-nhan-hoa-khoi-nghiep',
  'https://www.vinabook.com/products/khoi-nghiep-khong-doi-tuoi',
  'https://www.vinabook.com/products/kiem-tien-tu-tik-tok-bang-cach-nao',
  'https://www.vinabook.com/products/coach-khoi-nghiep-doc-lap-bang-ky-nang-khai-van',
  'https://www.vinabook.com/products/education-kinh-doanh-giao-duc-tai-thi-truong-viet-nam',
  'https://www.vinabook.com/products/khoi-nghiep-tinh-gon-3-3',
  'https://www.vinabook.com/products/huong-dan-kiem-tien-tren-tiktok',
  'https://www.vinabook.com/products/xiaomi-hanh-trinh-mot-cong-ty-khoi-nghiep-tro-thanh-thuong-hieu-toan-cau',
  'https://www.vinabook.com/products/nghe-thuat-kiem-tien-cua-nguoi-do-thai-tai-ban-2020'
];

const CATEGORY_LABEL = 'S\u00e1ch Kinh T\u1ebf';
const SUBCATEGORY_SLUG = 'khoi-nghiep';
const SUBCATEGORY_LABEL = 'Kh\u1edfi Nghi\u1ec7p';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__khoi_nghiep_files.txt';
const PRUNE_HANDLES = [];

await runLegacyJsonProductImport(import.meta.url, {
  sourceUrls: SOURCE_URLS,
  categoryLabel: CATEGORY_LABEL,
  subcategorySlug: SUBCATEGORY_SLUG,
  subcategoryLabel: SUBCATEGORY_LABEL,
  imagesRootSegments: IMAGES_ROOT_SEGMENTS,
  filesListName: FILES_LIST_NAME,
  mergeStrategy: 'byHandle',
  targetHandleScope: 'all',
  resetImagesRootBeforeRun: false,
  clearProductDirectoryBeforeWrite: true,
  skipSoldOut: false,
  includeSourceProductId: false,
  fallbackToHtmlMetaImages: false,
  pruneHandles: PRUNE_HANDLES
});
