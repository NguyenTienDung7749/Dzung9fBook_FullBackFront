import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  "https://www.vinabook.com/products/vitamin-meo-va-nhung-cau-chuyen-bat-tan-tang-kem-bookmark-2-mat",
  "https://www.vinabook.com/products/nhan-ban-tu-non-song-mot-dai-dang-viet-ngan-nam-bia-cung",
  "https://www.vinabook.com/products/non-song-mot-dai-dang-viet-ngan-nam-bia-mem",
  "https://www.vinabook.com/products/tro-choi-tien-hoa-darwin-s-game-tap-1-tap-2-bo-2-tap",
  "https://www.vinabook.com/products/bo-manga-gau-truc-di-lac-tap-1-tap-2-bo-2-tap",
  "https://www.vinabook.com/products/studio-cabana-ban-tinh-ca-cho-em-tap-4",
  "https://www.vinabook.com/products/studio-cabana-ban-tinh-ca-cho-em-tap-3",
  "https://www.vinabook.com/products/vui-duoc-ngay-nao-hay-ngay-nay",
  "https://www.vinabook.com/products/cuoc-noi-day-cua-co-nang-mot-sach",
  "https://www.vinabook.com/products/13-gio-sang-khung-gio-vo-thuc-cho-nhung-cau-chuyen-bat-thuong",
  "https://www.vinabook.com/products/tanukoi-mua-xuan-cua-tanuki-tap-2",
  "https://www.vinabook.com/products/bo-manga-sa-vao-luoi-tinh-voi-shiina-tap-1-3-bo-3-tap",
  "https://www.vinabook.com/products/anh-sao-ben-toi-tap-3",
  "https://www.vinabook.com/products/xu-meo",
  "https://www.vinabook.com/products/van-nhan-ky-noan",
  "https://www.vinabook.com/products/thi-tran-hoa-muoi-gio-tap-4",
  "https://www.vinabook.com/products/thi-tran-hoa-muoi-gio-tap-3",
  "https://www.vinabook.com/products/thi-tran-hoa-muoi-gio-tap-2",
  "https://www.vinabook.com/products/thi-tran-hoa-muoi-gio-tap-1",
  "https://www.vinabook.com/products/making-comics-sang-tac-truyen-tranh",
  "https://www.vinabook.com/products/lot-duoc-vo-chanh-mo-duoc-tiem-nail",
  "https://www.vinabook.com/products/land-animals-origami-dong-vat-tren-can",
  "https://www.vinabook.com/products/gui-em",
  "https://www.vinabook.com/products/e-co-khi-nao-tai-ban",
  "https://www.vinabook.com/products/cuon-sach-nay-danh-cho-ban",
  "https://www.vinabook.com/products/cuoc-song-nhiem-mau-cua-meo-trang-tap-2",
  "https://www.vinabook.com/products/cuoc-song-nhiem-mau-cua-meo-trang-tap-1",
  "https://www.vinabook.com/products/co-my-tu-mot-quyen-sach-ve-nhung-tu-dep-ma-nay-it-dung",
  "https://www.vinabook.com/products/chiec-giay-bong",
  "https://www.vinabook.com/products/cau-lac-bo-nghien-cuu-bi-an-hang-trinh-tham-meo-cap",
  "https://www.vinabook.com/products/cau-chuyen-dai-duong-tap-2",
  "https://www.vinabook.com/products/cau-chuyen-dai-duong-tap-1",
  "https://www.vinabook.com/products/cam-nang-co-cay-ki-quai",
  "https://www.vinabook.com/products/cafe-nang-tho",
  "https://www.vinabook.com/products/biet-ra-sao-ngay-sau",
  "https://www.vinabook.com/products/tanukoi-mua-xuan-cua-tanuki-tap-1",
  "https://www.vinabook.com/products/anh-den-ki-ao-cua-nu-than-bong-dem-tap-2",
  "https://www.vinabook.com/products/nhat-ki-noi-xu-la-tap-5",
  "https://www.vinabook.com/products/yeu-tham-tap-3",
  "https://www.vinabook.com/products/hen-gap-lai-quoc-vuong-cua-toi-tap-4",
  "https://www.vinabook.com/products/bao-ve-sieu-sao-cua-toi-tap-1-ban-thuong",
  "https://www.vinabook.com/products/ban-toi-ai-cung-that-ky-quac-tap-1-ban-thuong",
  "https://www.vinabook.com/products/ban-toi-ai-cung-that-ky-quac-tap-1-ban-db",
  "https://www.vinabook.com/products/ke-ngay-tho-nguoi-tung-trai-va-cau-chuyen-tinh-cua-chung-toi-tap-2",
  "https://www.vinabook.com/products/hen-gap-lai-quoc-vuong-cua-toi-tap-3",
  "https://www.vinabook.com/products/giang-ho-ngo-hem-tap-3",
  "https://www.vinabook.com/products/banh-ngot-nho-ngoc-nghech-tap-3",
  "https://www.vinabook.com/products/nhung-chang-trai-o-loc-phong-quan-tap-16"
];

const CATEGORY_LABEL = 'S\u00E1ch Thi\u1EBFu Nhi';
const SUBCATEGORY_SLUG = 'truyen-thieu-nhi';
const SUBCATEGORY_LABEL = 'Truy\u1EC7n Thi\u1EBFu Nhi';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-thieu-nhi', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__thieu_nhi_truyen_thieu_nhi_files.txt';
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
