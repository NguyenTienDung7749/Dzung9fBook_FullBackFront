import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  "https://www.vinabook.com/products/nguoi-dan-ba-trong-toi-the-woman-in-me-phat-hanh-ngay-26-4-2024",
  "https://www.vinabook.com/products/bara-lionel-messi-va-su-thang-tram-cua-cau-lac-bo-bong-da-vi-dai-nhat-the-gioi",
  "https://www.vinabook.com/products/dam-mo-lon-cong-viec-gia-dinh-va-tuong-lai-cua-chung-ta",
  "https://www.vinabook.com/products/hanh-trinh-mot-doi-nguoi-nhung-duc-ket-tu-15-nam-o-vi-tri-ceo-cong-ty-walt",
  "https://www.vinabook.com/products/nhung-nha-tu-tuong-lon-foucault-trong-60-phut",
  "https://www.vinabook.com/products/nhung-nha-tu-tuong-lon-konfuzius-trong-60-phut",
  "https://www.vinabook.com/products/nhung-nha-tu-tuong-lon-camus-trong-60-phut",
  "https://www.vinabook.com/products/nhung-nha-tu-tuong-lon-hobbes",
  "https://www.vinabook.com/products/nhung-nha-tu-tuong-lon-adorno-trong-60-phut",
  "https://www.vinabook.com/products/cong-ty-toi-gin-giu-cuoc-doi-cua-toi-trong-nganh-my-pham",
  "https://www.vinabook.com/products/nhan-vat-noi-tieng-the-gioi-cac-lanh-tu-lay-lung",
  "https://www.vinabook.com/products/nhan-vat-noi-tieng-the-gioi-khoa-hoc-va-phat-minh",
  "https://www.vinabook.com/products/nhan-vat-noi-tieng-the-gioi-van-hoa-va-nghe-thuat",
  "https://www.vinabook.com/products/cac-vi-nhan-truyen-cam-hung-khoa-hoc-va-phat-minh",
  "https://www.vinabook.com/products/di-chuc-cua-chu-tich-ho-chi-minh-1",
  "https://www.vinabook.com/products/donald-trump-duoi-goc-nhin-cua-tam-ly-hoc",
  "https://www.vinabook.com/products/loi-bac-day-thanh-thieu-nhi",
  "https://www.vinabook.com/products/ho-chi-minh-ban-ve-dao-duc",
  "https://www.vinabook.com/products/ho-chi-minh-ban-ve-phong-cach",
  "https://www.vinabook.com/products/nhung-mau-chuyen-ve-doi-hoat-dong-cua-ho-chu-tich",
  "https://www.vinabook.com/products/feynman-chuyen-that-nhu-dua-tai-ban-2019",
  "https://www.vinabook.com/products/fear-trump-o-nha-trang",
  "https://www.vinabook.com/products/thien-tai-va-so-phan-chuyen-ke-ve-cac-nha-toan-hoc",
  "https://www.vinabook.com/products/bo-sach-ky-niem-120-nam-ngay-sinh-chu-tich-ho-chi-minh-chu-tich-ho-chi-minh-voi",
  "https://www.vinabook.com/products/bo-sach-ky-niem-120-nam-ngay-sinh-chu-tich-ho-chi-minh-tu-tuong-ho-chi-minh-voi",
  "https://www.vinabook.com/products/bo-sach-ky-niem-120-nam-ngay-sinh-chu-tich-ho-chi-minh-bac-ho-cau-hien",
  "https://www.vinabook.com/products/bo-sach-ky-niem-120-nam-ngay-sinh-chu-tich-ho-chi-minh-120-cau-noi-bai-noi-noi",
  "https://www.vinabook.com/products/284-anh-hung-hao-kiet-cua-viet-nam-tap-4",
  "https://www.vinabook.com/products/dam-dao-voi-khong-tu-tai-ban-2004",
  "https://www.vinabook.com/products/mot-nguoi-viet-tram-lang-tai-ban-2020",
  "https://www.vinabook.com/products/dung-nhu-con-ech-len-day-cot"
];

const CATEGORY_LABEL = 'S\u00E1ch Ph\u00E1t Tri\u1EC3n B\u1EA3n Th\u00E2n';
const SUBCATEGORY_SLUG = 'danh-nhan';
const SUBCATEGORY_LABEL = 'Danh Nhân';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-phat-trien-ban-than', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__phat_trien_danh_nhan_files.txt';
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
