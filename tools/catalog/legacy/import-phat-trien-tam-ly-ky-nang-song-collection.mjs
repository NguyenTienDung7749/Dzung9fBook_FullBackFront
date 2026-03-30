import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  "https://www.vinabook.com/products/nuoi-duong-con-nguoi-phan-bien",
  "https://www.vinabook.com/products/loi-song-khong-dinh-kien-hanh-phuc-khi-ta-ngung-phan-xet",
  "https://www.vinabook.com/products/dung-de-bi-dat-mui-tu-duy-phan-bien-cho-gen-z",
  "https://www.vinabook.com/products/cham-dut-xung-dot-noi-tam-tu-hon-loan-den-diem-tinh",
  "https://www.vinabook.com/products/luoc-su-ve-tinh-ban-kham-pha-ban-nang-gan-ket-cua-loai-nguoi",
  "https://www.vinabook.com/products/ke-ai-ky",
  "https://www.vinabook.com/products/vui-voi-viec-minh-lam-feel-good-productivity",
  "https://www.vinabook.com/products/the-big-questions-of-life-song-trong-coi-vo-thuong",
  "https://www.vinabook.com/products/tan-man-ve-tinh-yeu-somehow",
  "https://www.vinabook.com/products/minh-triet-tu-noi-bat-an-the-wisdom-of-insecurity",
  "https://www.vinabook.com/products/chinh-sach-uu-dai-cua-fahasa-thoi-gian-giao-hang-giao-nhanh-va-uy-tin-chinh-sach-doi-tra-doi-tra-mien-phi-toan-quoc-chinh-sach-khach-si-uu-dai-khi-mua-so-luong-lon-tri-tue-cua-soi-dau-dan",
  "https://www.vinabook.com/products/phu-nu-40",
  "https://www.vinabook.com/products/duong-muu",
  "https://www.vinabook.com/products/tuoi-tre-khong-cho-ta-san-sang",
  "https://www.vinabook.com/products/nguoi-la-dan-duong",
  "https://www.vinabook.com/products/be-useful-song-co-ich-7-nguyen-tac-lam-chu-cuoc-doi",
  "https://www.vinabook.com/products/tam-ly-hoc-danh-cho-phai-nu",
  "https://www.vinabook.com/products/suc-manh-an-giau-khai-pha-tiem-nang-vo-han-trong-ban",
  "https://www.vinabook.com/products/minh-dinh-lam-gi-ay-nhi-nghe-thuat-khai-pha-suc-manh-nao-bo-va-su-dung-tri-nho",
  "https://www.vinabook.com/products/hanh-trinh-chua-lanh",
  "https://www.vinabook.com/products/su-song-bat-kha",
  "https://www.vinabook.com/products/tro-chuyen-voi-noi-dau-va-vuot-qua-ton-thuong",
  "https://www.vinabook.com/products/thanh-cong-ma-khong-can-gong-nghe-thuat-song-kieu-phap",
  "https://www.vinabook.com/products/ung-dung-lieu-phap-he-thong-gia-dinh-noi-tam-trong-tinh-yeu",
  "https://www.vinabook.com/products/co-do-co-xanh-red-flag-green-flag",
  "https://www.vinabook.com/products/lam-viec-voi-nguoi-kho-tinh",
  "https://www.vinabook.com/products/bac-thay-quan-ly-thoi-gian",
  "https://www.vinabook.com/products/suc-manh-cua-ky-luat-ban-than",
  "https://www.vinabook.com/products/su-dung-di-cua-ngon-tu",
  "https://www.vinabook.com/products/cang-diu-dang-cang-dat-gia-the-worth-of-gentleness",
  "https://www.vinabook.com/products/nguoi-nam-cham-bi-mat-cua-luat-hap-dan-tai-ban-2025",
  "https://www.vinabook.com/products/tac-dong-tinh-gon",
  "https://www.vinabook.com/products/tro-thanh-nguoi-dang-gia-nhat",
  "https://www.vinabook.com/products/dam-bi-ghet",
  "https://www.vinabook.com/products/tu-duy-mo-1",
  "https://www.vinabook.com/products/manifest-7-buoc-de-thay-doi-cuoc-doi-ban-mai-mai",
  "https://www.vinabook.com/products/healthy-theo-cach-trendy",
  "https://www.vinabook.com/products/tim-binh-yen-trong-gia-dinh",
  "https://www.vinabook.com/products/ban-con-dang-vuong-van-mot-nguoi",
  "https://www.vinabook.com/products/hoc-nhu-mot-chuyen-gia-ap-dung-cac-cong-cu-tren-nen-tang-khoa-hoc-de-chinh-phuc-moi-kien-thuc-va-ky-nang",
  "https://www.vinabook.com/products/tuan-lam-viec-4-gio-bia-cung-sach-tinh-gon",
  "https://www.vinabook.com/products/mot-nguoi-rung-thong-thai",
  "https://www.vinabook.com/products/ky-luat-khong-phai-cuoc-chien-voi-ban-than",
  "https://www.vinabook.com/products/viet-de-chua-lanh-anh-sang-chua-lanh-tu-ngoi-but-vo-tan",
  "https://www.vinabook.com/products/tam-tri-chung-ta-thay-doi-nhu-the-nao",
  "https://www.vinabook.com/products/giai-ma-than-so-hoc-cac-ky-thuat-ung-dung-than-so-hoc-vao-kham-pha-ban-than-va-du-doan-van-menh",
  "https://www.vinabook.com/products/doi-than-vung-the-thau-suot-ben-trong-vung-vang-giua-bao-giong",
  "https://www.vinabook.com/products/tinh-nu-tu-do-nhin-thau-nhung-ham-muon-va-noi-so-hai-ben-trong"
];

const CATEGORY_LABEL = 'S\u00E1ch Ph\u00E1t Tri\u1EC3n B\u1EA3n Th\u00E2n';
const SUBCATEGORY_SLUG = 'tam-ly-ky-nang-song';
const SUBCATEGORY_LABEL = 'Tâm Lý - Kỹ Năng Sống';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-phat-trien-ban-than', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__phat_trien_tam_ly_ky_nang_song_files.txt';
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
