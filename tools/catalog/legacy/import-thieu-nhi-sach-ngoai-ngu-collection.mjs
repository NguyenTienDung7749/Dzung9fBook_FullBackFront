import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  "https://www.vinabook.com/products/ielts-writing-viet-luan-chat-nhu-nuoc-cat",
  "https://www.vinabook.com/products/tieng-trung-genz-bi-kip-hoc-nhanh-noi-chat",
  "https://www.vinabook.com/products/cam-nang-dich-tai-lieu-y-khoa-tieng-anh-cho-nguoi-moi-bat-dau",
  "https://www.vinabook.com/products/luyen-noi-tieng-trung-cho-nguoi-moi-bat-dau",
  "https://www.vinabook.com/products/660-kanji-pho-bien-n5-1",
  "https://www.vinabook.com/products/214-bo-thu",
  "https://www.vinabook.com/products/3000-tu-vung-tieng-nhat-thong-dung-trung-cap",
  "https://www.vinabook.com/products/2000-tu-vung-tieng-nhat-thong-dung-so-cap",
  "https://www.vinabook.com/products/vui-hoc-hiragana-200-tu-vung-tieng-nhat-pho-thong-cho-nguoi-moi-bat-dau",
  "https://www.vinabook.com/products/bi-quyet-hoc-nhanh-nho-lau-214-bo-thu-tieng-trung",
  "https://www.vinabook.com/products/hacking-your-english-speaking-luyen-noi-tieng-anh-dot-pha",
  "https://www.vinabook.com/products/so-tay-ngu-phap-hsk-tu-co-ban-den-nang-cao-tap-1",
  "https://www.vinabook.com/products/thuc-hanh-dich-tieng-trung-so-trung-cap",
  "https://www.vinabook.com/products/ngon-ngu-trong-the-thao-viet-han",
  "https://www.vinabook.com/products/ielts-premium-seventh-edition",
  "https://www.vinabook.com/products/digital-sat-study-guide-premium-edition",
  "https://www.vinabook.com/products/bo-sach-so-luyen-viet-trong-tieng-trung-bo-thu-net-chu-net-but-bo-3-cuon",
  "https://www.vinabook.com/products/nhap-mon-tieng-trung-danh-cho-nhung-trang-giay-trang",
  "https://www.vinabook.com/products/t2-cam-nang-nang-cap-tu-vung-tieng-trung-theo-chu-de",
  "https://www.vinabook.com/products/t1-cam-nang-nang-cap-tu-vung-tieng-trung-theo-chu-de",
  "https://www.vinabook.com/products/take-note-3000-tu-vung-tieng-anh",
  "https://www.vinabook.com/products/ngu-phap-va-bai-tap-tong-hop-hsk3-hskk-so-sap",
  "https://www.vinabook.com/products/luyen-viet-214-bo-thu-han-tu-thong-dung-tap-2",
  "https://www.vinabook.com/products/tu-hoc-sieu-toc-digital-sat-total-prep",
  "https://www.vinabook.com/products/ly-thuyet-ve-dich-thuat-mot-dan-nhap-ngan",
  "https://www.vinabook.com/products/ngu-phap-tieng-anh-english-grammar-ly-thuyet-va-bai-tap-thuc-hanh",
  "https://www.vinabook.com/products/bai-tap-bo-tro-toan-dien-tieng-anh-3",
  "https://www.vinabook.com/products/15-000-cau-ban-ngu-anh-my-thong-dung-kem-cd",
  "https://www.vinabook.com/products/101-tro-choi-day-tieng-anh-cho-moi-trinh-do",
  "https://www.vinabook.com/products/ngu-phap-tieng-trung-toan-dien",
  "https://www.vinabook.com/products/phonics-1",
  "https://www.vinabook.com/products/luyen-thi-nang-luc-nhat-ngu-n5-doc-hieu-han-tu-nghe-hieu-ngu-phap-tu-vung",
  "https://www.vinabook.com/products/tieng-nhat-cho-moi-nguoi-so-cap-2-ban-moi-ban-dich-va-giai-thich-ngu-phap-tieng-viet",
  "https://www.vinabook.com/products/tieng-nhat-cho-moi-nguoi-so-cap-1-tong-hop-cac-bai-tap-chu-diem",
  "https://www.vinabook.com/products/tieng-nhat-cho-moi-nguoi-so-cap-1-25-bai-luyen-nghe-ban-moi",
  "https://www.vinabook.com/products/luyen-thi-nang-luc-nhat-ngu-n1-ngu-phap",
  "https://www.vinabook.com/products/tap-viet-tieng-han-danh-cho-nguoi-moi-bat-dau-1",
  "https://www.vinabook.com/products/giao-tiep-tieng-anh-tu-tin-trong-moi-tinh-huong-trung-cap-kem-cd",
  "https://www.vinabook.com/products/giao-trinh-chuan-hsk-4-tap-2",
  "https://www.vinabook.com/products/giao-trinh-chuan-hsk-4-tap-1",
  "https://www.vinabook.com/products/toan-thu-tu-hoc-chu-han",
  "https://www.vinabook.com/products/ngu-phap-tieng-anh-ung-dung-trong-ky-nang-viet",
  "https://www.vinabook.com/products/tieng-han-tong-hop-danh-cho-nguoi-viet-nam-so-cap-1-tai-ban-2023",
  "https://www.vinabook.com/products/my-grammar-and-i-ly-thuyet",
  "https://www.vinabook.com/products/learning-english-with-tv-series",
  "https://www.vinabook.com/products/my-grammar-and-i-thuc-hanh",
  "https://www.vinabook.com/products/everyday-english-for-grown-ups",
  "https://www.vinabook.com/products/ben-ban-du-ban-o-noi-dau"
];

const CATEGORY_LABEL = 'S\u00E1ch Thi\u1EBFu Nhi';
const SUBCATEGORY_SLUG = 'sach-ngoai-ngu';
const SUBCATEGORY_LABEL = 'S\u00E1ch Ngo\u1EA1i Ng\u1EEF';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-thieu-nhi', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__thieu_nhi_sach_ngoai_ngu_files.txt';
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
