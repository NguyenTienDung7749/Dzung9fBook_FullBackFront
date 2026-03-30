import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/tro-chuyen-cung-gen-z',
  'https://www.vinabook.com/products/giay-dan-tuong-vang',
  'https://www.vinabook.com/products/cung-cha-toi-auschwits',
  'https://www.vinabook.com/products/giao-tiep-voi-phu-huynh-kho-tinh',
  'https://www.vinabook.com/products/khac-di-khac-den-hoi-ky',
  'https://www.vinabook.com/products/thoat-khoi-dia-nguc-khmer-do-hoi-ky-cua-mot-nguoi-con-song',
  'https://www.vinabook.com/products/am-muu-cau-ket-chinh-tri-hoa-ky-bi-thao-tung-tu-ben-ngoai-nhu-the-nao',
  'https://www.vinabook.com/products/lich-su-cac-ly-thuyet-truyen-thong-histoire-des-theories-de-la-communication',
  'https://www.vinabook.com/products/ao-xua-du-nhau',
  'https://www.vinabook.com/products/vuon-len-tu-day-hanh-trinh-tai-hien-giac-mo-my',
  'https://www.vinabook.com/products/nguoi-chet-biet-dieu-gi',
  'https://www.vinabook.com/products/nha-tranh',
  'https://www.vinabook.com/products/beyond-the-story-10-year-record-of-bts',
  'https://www.vinabook.com/products/long-toi-nhe-khi-me-roi-xa',
  'https://www.vinabook.com/products/sai-gon-chuyen-tap-tang-tap-nghe-choi-lang-dang',
  'https://www.vinabook.com/products/nhan-ban-tu-hon-tuyet-lan',
  'https://www.vinabook.com/products/nhat-ky-anne-frank',
  'https://www.vinabook.com/products/nong-trai-ngo-nghinh-cuoc-song-day-bat-ngo-cua-toi-voi-600-con-vat-giai-cuu',
  'https://www.vinabook.com/products/bill-gates-tham-vong-lon-lao-va-qua-trinh-hinh-thanh-de-che-microsoft',
  'https://www.vinabook.com/products/tu-giac-mo-con-de-uoc-mo-lon-cau-chuyen-ve-hanh-trinh-cua-mot-nguoi-lam-khuyen-hoc',
  'https://www.vinabook.com/products/thu-cho-em',
  'https://www.vinabook.com/products/di-qua-tram-nam',
  'https://www.vinabook.com/products/diep-vien-tam-thao',
  'https://www.vinabook.com/products/chim-noi-giua-paris-va-london-down-and-out-in-paris-and-london',
  'https://www.vinabook.com/products/albert-einstein-mat-nhan-ban',
  'https://www.vinabook.com/products/hello-cac-ban-minh-la-toi-di-code-dao',
  'https://www.vinabook.com/products/100-nha-khoa-hoc-vi-dai-thay-doi-the-gioi',
  'https://www.vinabook.com/products/duong-tran-ngon-lua-khong-bao-gio-tat-tai-ban-2022',
  'https://www.vinabook.com/products/trinh-cong-son-thu-tinh-gui-mot-nguoi-2-2',
  'https://www.vinabook.com/products/ky-uc-theo-dong-doi',
  'https://www.vinabook.com/products/tro-tan-cua-angela',
  'https://www.vinabook.com/products/tu-phu-dien-den-new-york',
  'https://www.vinabook.com/products/kinh-te-nhat-ban-giai-doan-phat-trien-than-ky-1955-1973',
  'https://www.vinabook.com/products/luoc-su-doi-toi-1',
  'https://www.vinabook.com/products/phia-tay-thanh-pho',
  'https://www.vinabook.com/products/tu-truyen-luka-modric',
  'https://www.vinabook.com/products/nguyen-xuan-khanh-mot-nu-cuoi-mim-mot-nghiep-van-xuoi',
  'https://www.vinabook.com/products/co-be-nhin-mua-2-2',
  'https://www.vinabook.com/products/hua-voi-con-ba-nhe-cau-chuyen-ve-niem-hi-vong-vuot-qua-thu-thach-va-chinh-phuc',
  'https://www.vinabook.com/products/hoi-ky-nguyen-hien-le',
  'https://www.vinabook.com/products/chau-phi-nghin-trung-tai-ban-2021',
  'https://www.vinabook.com/products/doi-toi-song-nhac-bay-len-1',
  'https://www.vinabook.com/products/khong-gia-dinh-9-9',
  'https://www.vinabook.com/products/nguoi-ba-tai-gioi-vung-saga',
  'https://www.vinabook.com/products/ngon-tu-bia-cung',
  'https://www.vinabook.com/products/chuyen-phiem-su-hoc-bia-cung',
  'https://www.vinabook.com/products/toi-biet-tai-sao-chim-trong-long-van-hot-i-know-why-the-caged-birds-sings',
  'https://www.vinabook.com/products/starbucks-toi-da-tim-thay-anh-sang-cuoc-doi-trong-nhung-ngay-toi-tam-nhat'
];

const CATEGORY_LABEL = 'Sách Văn Học Nước Ngoài';
const SUBCATEGORY_SLUG = 'hoi-ky-tu-truyen';
const SUBCATEGORY_LABEL = 'Hồi Ký - Tự Truyện';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-van-hoc-nuoc-ngoai', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__van_hoc_nuoc_ngoai_hoi_ky_tu_truyen_files.txt';
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
