import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/co-ai-giu-gium-nhung-lang-quen',
  'https://www.vinabook.com/products/neu-nhu-khong-the-noi-neu-nhu-tai-ban-2025',
  'https://www.vinabook.com/products/mua-ngang',
  'https://www.vinabook.com/products/nhung-manh-vo',
  'https://www.vinabook.com/products/nguoi-giao-vien-tan-nhan',
  'https://www.vinabook.com/products/dem-cho-chuot-tuyen-tap-nhung-vu-an-ki-ao-cua-mikihiko-renjo-tap-2',
  'https://www.vinabook.com/products/dem-cho-chuot-tuyen-tap-nhung-vu-an-ki-ao-cua-mikihiko-renjo-tap-1',
  'https://www.vinabook.com/products/vi-con-co-nhung-ngay-mai',
  'https://www.vinabook.com/products/mo-mat-ra-di-em',
  'https://www.vinabook.com/products/la-thu-cha-gui-con-gai',
  'https://www.vinabook.com/products/doi-song-tinh-thuc',
  'https://www.vinabook.com/products/toi-co-trieu-chung-kem-yeu-u',
  'https://www.vinabook.com/products/365-ngay-manifest',
  'https://www.vinabook.com/products/nhung-ke-nguoc-doi',
  'https://www.vinabook.com/products/cham-cham-truong-thanh-thong-dong-ruc-ro',
  'https://www.vinabook.com/products/gui-den-ban-mot-cai-om-am-ap-1',
  'https://www.vinabook.com/products/tinh-yeu-bo-xit',
  'https://www.vinabook.com/products/moses-tren-binh-nguyen',
  'https://www.vinabook.com/products/tung-gan-bo-tung-yeu-thuong-tang-kem-postcard',
  'https://www.vinabook.com/products/ho-nuoc-mua-xuan',
  'https://www.vinabook.com/products/thang-nam-giau-trong-vat-ao-ba',
  'https://www.vinabook.com/products/co-nguoi-doi-com',
  'https://www.vinabook.com/products/phan-quyet-den-tu-dia-nguc-nhung-toi-ac-ky-la-nhat-trong-lich-su-toi-pham',
  'https://www.vinabook.com/products/dau-the-gian-khac-nghiet-van-mong-em-diu-dang',
  'https://www.vinabook.com/products/co-rang-chieu-roi-co-anh-sao-troi',
  'https://www.vinabook.com/products/gia-nhu-co-nguoi-noi-voi-toi',
  'https://www.vinabook.com/products/nhat-ky-cua-bo-hanh-trinh-19-nam-truong-thanh-cung-nguu-nguu',
  'https://www.vinabook.com/products/phu-quoc-bien-can-thien-duong-hay-chi-la-loi-hua-suong',
  'https://www.vinabook.com/products/mot-nguoi-so-co-don-hai-nguoi-so-phu-long',
  'https://www.vinabook.com/products/muoi-nam-tuoi-hai-muoi',
  'https://www.vinabook.com/products/nep-nha-tu-goc-re-den-ngon-gio',
  'https://www.vinabook.com/products/dau-hieu-cua-tinh-yeu',
  'https://www.vinabook.com/products/nam-ngu-ngoai-trien-de',
  'https://www.vinabook.com/products/danh-tac-van-hoc-viet-nam-chi-pheo-tai-ban-2025',
  'https://www.vinabook.com/products/nhung-giac-mo-cho-binh-minh-len',
  'https://www.vinabook.com/products/nhe-nhang-song-diu-dang-yeu',
  'https://www.vinabook.com/products/moi-ngay-don-binh-minh-la-mot-ngay-dang-song',
  'https://www.vinabook.com/products/thuong-gui-the-gian',
  'https://www.vinabook.com/products/tam-biet-toi-cua-nhieu-nam-ve-truoc-song-ngu-han-viet',
  'https://www.vinabook.com/products/giua-nhung-lan-sinh-ra',
  'https://www.vinabook.com/products/banh-ve-chao-ga-cho-tam-hon',
  'https://www.vinabook.com/products/thoi-gian-bieu-ca-dem',
  'https://www.vinabook.com/products/nhung-vet-thuong-lanh',
  'https://www.vinabook.com/products/thanh-pho-thieu-mot-bua-com-nha',
  'https://www.vinabook.com/products/nha-toi-co-mot-ba-me-luoi',
  'https://www.vinabook.com/products/roi-mai-sau-co-duyen-se-gap-lai',
  'https://www.vinabook.com/products/phia-tren-la-may-troi-truoc-mat-la-trung-khoi'
];

const CATEGORY_LABEL = 'Sách Văn Học Trong Nước';
const SUBCATEGORY_SLUG = 'truyen-ngan-tan-van';
const SUBCATEGORY_LABEL = 'Truyện Ngắn - Tản Văn';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-van-hoc-trong-nuoc', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__van_hoc_truyen_ngan_tan_van_files.txt';
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
