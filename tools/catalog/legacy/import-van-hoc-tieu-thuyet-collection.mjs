import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/chuyen-con-oc-sen-muon-biet-tai-sao-no-cham-chap-tai-ban-2025',
  'https://www.vinabook.com/products/cay-cam-ngot-cua-toi-an-ban-dac-biet-20-nam-thanh-lap-nha-nam-bia-cung',
  'https://www.vinabook.com/products/trai-tim-cua-hon-ma',
  'https://www.vinabook.com/products/ke-lua-dao-o-khoang-hang-nhat',
  'https://www.vinabook.com/products/thanh-pho-va-nhung-buc-tuong-bat-dinh',
  'https://www.vinabook.com/products/phut-biet-ly',
  'https://www.vinabook.com/products/ba-chi-em-phan-3-cua-tho-xam-o-auschwitz',
  'https://www.vinabook.com/products/ket-tinh-tham-lang',
  'https://www.vinabook.com/products/hieu-sach-tren-dao',
  'https://www.vinabook.com/products/con-dao-nho-cua-emiri',
  'https://www.vinabook.com/products/toi-muon-bao-ve-cau-du-phai-mat-di-tinh-yeu-nay',
  'https://www.vinabook.com/products/ca-cao-mau',
  'https://www.vinabook.com/products/layla-linh-hon-bi-danh-trao',
  'https://www.vinabook.com/products/nhan-sinh-du-rong-lon-muon-kiep-van-gap-nguoi',
  'https://www.vinabook.com/products/hoi-co-thi-nhan',
  'https://www.vinabook.com/products/benh-an-cua-than-linh-3',
  'https://www.vinabook.com/products/nhung-ta',
  'https://www.vinabook.com/products/gio-tu-thoi-khuat-mat',
  'https://www.vinabook.com/products/toi-tim-minh-giua-thang-nam',
  'https://www.vinabook.com/products/he-n-ye-u',
  'https://www.vinabook.com/products/nhung-chang-trai-xau-tinh',
  'https://www.vinabook.com/products/w-hay-la-ky-uc-tuoi-tho',
  'https://www.vinabook.com/products/vo-moi-cua-chong-toi'
];

const CATEGORY_LABEL = 'Sách Văn Học Trong Nước';
const SUBCATEGORY_SLUG = 'tieu-thuyet';
const SUBCATEGORY_LABEL = 'Tiểu Thuyết';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-van-hoc-trong-nuoc', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__van_hoc_tieu_thuyet_files.txt';
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
  fallbackToHtmlMetaImages: false,
  pruneHandles: PRUNE_HANDLES
});
