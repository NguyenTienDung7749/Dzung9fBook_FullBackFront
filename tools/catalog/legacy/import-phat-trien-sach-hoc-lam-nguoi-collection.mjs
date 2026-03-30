import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  "https://www.vinabook.com/products/canh-bao-day-khong-phai-chuyen-dua-sach-cu",
  "https://www.vinabook.com/products/loi-vang-cua-bo-danh-cho-con-gai",
  "https://www.vinabook.com/products/combo-sach-minh-triet-cua-dich-gia-nguyen-phong-bo-14-cuon-1",
  "https://www.vinabook.com/products/thoi-quen-hanh-phuc-happy-habits-energize-your-career-and-life-in-4-minutes-a",
  "https://www.vinabook.com/products/khoi-nguon-nang-luc-truyen-cam-hung-be-a-mindsetter",
  "https://www.vinabook.com/products/neu-biet-ngay-mai-roi-quan-tro",
  "https://www.vinabook.com/products/hay-ton-trong-no-luc-cua-mot-co-gai",
  "https://www.vinabook.com/products/hay-nam-lay-tay-nhau",
  "https://www.vinabook.com/products/khi-ga-mo-toa-sang",
  "https://www.vinabook.com/products/suc-manh-cua-muc-dich",
  "https://www.vinabook.com/products/my-pham-tri-tue",
  "https://www.vinabook.com/products/song-nhu-nhung-cai-cay",
  "https://www.vinabook.com/products/osho-mat-troi-tam-thuc",
  "https://www.vinabook.com/products/doi-song-con-nguoi-va-xa-hoi-hom-nay-2-2",
  "https://www.vinabook.com/products/quy-luat-cua-nhan-sinh",
  "https://www.vinabook.com/products/chon-song-hanh-phuc",
  "https://www.vinabook.com/products/hoc-o-truong-hoc-o-sach-vo-hoc-lan-nhau-va-hoc-nhan-dan-tai-ban-2020",
  "https://www.vinabook.com/products/luot-song-khung-hoang-trung-nien",
  "https://www.vinabook.com/products/40-chiu-choi-dinh-cao-cuoc-doi",
  "https://www.vinabook.com/products/phep-mau-de-vuot-len-chinh-minh",
  "https://www.vinabook.com/products/nghe-co-thy-ke-chuyen-bi-quyet-giup-tre-tu-tin",
  "https://www.vinabook.com/products/tang-cuong-tri-nho-va-kha-nang-tap-trung-tai-ban-2020",
  "https://www.vinabook.com/products/ngon-ngu-co-the-tai-ban-2019",
  "https://www.vinabook.com/products/lop-hoc-hanh-phuc-day-tho-va-hoc-trong-chanh-niem-meena-srinivasan",
  "https://www.vinabook.com/products/goc-khuat-cua-yeu-thuong",
  "https://www.vinabook.com/products/chet-boi-gia-tao-thuc-tinh-truoc-khi-danh-mat-chinh-minh",
  "https://www.vinabook.com/products/ky-luat-lam-nen-con-nguoi",
  "https://www.vinabook.com/products/hoc-mot-dang-lam-mot-neo-1",
  "https://www.vinabook.com/products/ky-nang-noi-chuyen-voi-moi-nguoi-o-moi-noi-moi-luc-1",
  "https://www.vinabook.com/products/an-nhien-giua-nhung-bon-be",
  "https://www.vinabook.com/products/chiec-birkin-mau-cam",
  "https://www.vinabook.com/products/7-buoc-thiet-lap-ke-hoach-cuoc-doi",
  "https://www.vinabook.com/products/ban-cang-manh-me-the-gioi-cang-yeu-mem",
  "https://www.vinabook.com/products/bq-nang-luc-song-sot-trong-ky-nguyen-moi",
  "https://www.vinabook.com/products/song-co-ke-hoach",
  "https://www.vinabook.com/products/chung-ta-da-thuc-su-hieu-nhau-chua",
  "https://www.vinabook.com/products/cuon-sach-nho-giup-ban-song-khoe-den-gia",
  "https://www.vinabook.com/products/giu-thang-bang-trong-mot-the-gioi-chenh-venh-tai-ban-2020",
  "https://www.vinabook.com/products/ren-luyen-tu-duy-logic",
  "https://www.vinabook.com/products/thay-doi-hay-la-chet-1",
  "https://www.vinabook.com/products/thay-doi-tam-tri-bat-ky-ai",
  "https://www.vinabook.com/products/hieu-ban-than-quen-ban-than",
  "https://www.vinabook.com/products/tu-duy-dat-cuoc",
  "https://www.vinabook.com/products/ky-nang-song-danh-cho-hoc-sinh-hoc-cach-song-song-bang-ca-trai-tim-tai-ban-2019",
  "https://www.vinabook.com/products/khong-so-duong-dai-van-dam-chi-so-ban-than-dau-hang",
  "https://www.vinabook.com/products/toi-quyet-dinh-song-cho-chinh-toi",
  "https://www.vinabook.com/products/24-bi-quyet-dan-dat-ban-toi-thanh-cong",
  "https://www.vinabook.com/products/24-bi-quyet-de-ban-duoc-yeu-quy"
];

const CATEGORY_LABEL = 'S\u00E1ch Ph\u00E1t Tri\u1EC3n B\u1EA3n Th\u00E2n';
const SUBCATEGORY_SLUG = 'sach-hoc-lam-nguoi';
const SUBCATEGORY_LABEL = 'Sách Học Làm Người';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-phat-trien-ban-than', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__phat_trien_sach_hoc_lam_nguoi_files.txt';
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
