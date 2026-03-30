import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  "https://www.vinabook.com/products/sieu-hinh-hoc",
  "https://www.vinabook.com/products/ban-giao-huong-cua-nuoc",
  "https://www.vinabook.com/products/cuon-sach-lon-dau-tien-cua-to-vu-tru",
  "https://www.vinabook.com/products/cuon-sach-lon-dau-tien-cua-to-khung-long",
  "https://www.vinabook.com/products/than-so-hoc-chua-lanh",
  "https://www.vinabook.com/products/lan-theo-dau-ky-uc",
  "https://www.vinabook.com/products/tan-so-rung-dong-quyen-nang-tien-hoa-cua-linh-hon",
  "https://www.vinabook.com/products/kham-pha-the-gioi-dong-vat-phong-phu-qua-bay-tam-bang-do-mo-rong-atlas-dong-vat",
  "https://www.vinabook.com/products/tu-sach-bach-khoa-tri-thuc-bach-khoa-tri-thuc-cho-tre-em",
  "https://www.vinabook.com/products/bach-khoa-thu-ve-cac-loai-phuong-tien-giao-thong",
  "https://www.vinabook.com/products/big-book-of-abc-cuon-sach-khong-lo-ve-bang-chu-cai-tieng-anh",
  "https://www.vinabook.com/products/ao-ho-lao-nhao",
  "https://www.vinabook.com/products/bach-khoa-tri-thuc-cho-tre-em-kham-pha-va-sang-tao-tai-ban-2018",
  "https://www.vinabook.com/products/cung-laila-kham-pha-ve-virus-corona",
  "https://www.vinabook.com/products/giup-be-phat-trien-tiem-nang-toan-hoc-6-tuoi",
  "https://www.vinabook.com/products/hoi-mot-phi-hanh-gia",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-so-tu-duy-tuoi-2-3",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-so-dem-tuoi-6-7",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-so-dem-tuoi-5-6",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-so-dem-tuoi-4-5",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-so-dem-tuoi-3-4",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-so-dem-tuoi-2-3",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-phep-tru-tuoi-5-7",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-phep-cong-tuoi-6-7",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-phep-cong-tuoi-5-6",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-phep-cong-tuoi-4-5",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-phep-cong-phep-tru-nang-cao-tuoi-6-7",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-so-tu-duy-tuoi-3-4",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-so-tu-duy-tuoi-4-5",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-so-tu-duy-tuoi-5-6",
  "https://www.vinabook.com/products/giao-duc-nhat-ban-so-tu-duy-tuoi-6-7",
  "https://www.vinabook.com/products/be-nhan-thuc-the-gioi-ai-cung-mot-gia-dinh-song-ngu",
  "https://www.vinabook.com/products/tai-sao-sao-tim-dap-va-da-day-reo",
  "https://www.vinabook.com/products/tai-sao-sao-thanh-pho-lai-trong-nhu-the",
  "https://www.vinabook.com/products/tai-sao-sao-tau-lai-noi",
  "https://www.vinabook.com/products/tai-sao-sao-giay-khong-bay",
  "https://www.vinabook.com/products/tai-sao-sao-co-lai-xanh",
  "https://www.vinabook.com/products/nhung-loai-bo-pha-ki-luc-bo-ti-hon-an-tuong",
  "https://www.vinabook.com/products/nhung-loai-bo-pha-ki-luc-con-trung-dang-kinh-ngac",
  "https://www.vinabook.com/products/nhung-loai-bo-pha-ki-luc-sieu-nhen",
  "https://www.vinabook.com/products/nhung-loai-bo-pha-ki-luc-con-trung-co-canh",
  "https://www.vinabook.com/products/bach-khoa-thu-thuc-te-ao-tang-cuong-khung-long-3d-tap-2",
  "https://www.vinabook.com/products/bach-khoa-thu-thuc-te-ao-tang-cuong-khung-long-3d-tap-1",
  "https://www.vinabook.com/products/hoi-dap-cung-em-the-gioi-dong-vat",
  "https://www.vinabook.com/products/nhung-tho-san-duoi-day-bien",
  "https://www.vinabook.com/products/nhung-sinh-vat-phi-thuong-co-xua",
  "https://www.vinabook.com/products/nhung-ke-san-moi-hung-ton",
  "https://www.vinabook.com/products/nhung-ga-khong-lo-trai-dat"
];

const CATEGORY_LABEL = 'S\u00E1ch Thi\u1EBFu Nhi';
const SUBCATEGORY_SLUG = 'khoa-hoc-cho-be';
const SUBCATEGORY_LABEL = 'Khoa H\u1ECDc Cho B\u00E9';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-thieu-nhi', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__thieu_nhi_khoa_hoc_cho_be_files.txt';
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
