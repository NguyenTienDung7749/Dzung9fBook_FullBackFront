import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/noi-noi-buon-ngu-yen',
  'https://www.vinabook.com/products/bon-mua-thuong-em',
  'https://www.vinabook.com/products/song-nui-chua-gia',
  'https://www.vinabook.com/products/nguoi-ti-nan-tap-truyen-ngan',
  'https://www.vinabook.com/products/quy-am-dem-co-hon',
  'https://www.vinabook.com/products/co-le-toi-can-mot-con-meo',
  'https://www.vinabook.com/products/nguoi-tap-lon',
  'https://www.vinabook.com/products/truyen-ngan-dac-sac-2023',
  'https://www.vinabook.com/products/nhat-ky-co-giao-hoc-ky-tet',
  'https://www.vinabook.com/products/moi-su-kien-cuong-deu-den-tu-doi-lan-vap-nga',
  'https://www.vinabook.com/products/999-la-thu-gui-cho-chinh-minh-nhung-la-thu-an-tuong-nhat-phien-ban-song-ngu',
  'https://www.vinabook.com/products/anh-voi-em-hay-cho-voi-meo-tap-3',
  'https://www.vinabook.com/products/chung-ta-co-hen-voi-binh-yen',
  'https://www.vinabook.com/products/silly-gilly-daily-nhat-ky-gilly-co-nang-ham-do-ngo-nhay',
  'https://www.vinabook.com/products/evie-va-chuyen-phieu-luu-o-rung-nhiet-doi',
  'https://www.vinabook.com/products/nhung-nguoi-nhat-tu-te',
  'https://www.vinabook.com/products/phai-long-voi-co-don-tai-ban-2022',
  'https://www.vinabook.com/products/dam-xanh',
  'https://www.vinabook.com/products/bi-mat-trong-dem-bao',
  'https://www.vinabook.com/products/bo-sach-lam-de-hoan-bo-3-cuon',
  'https://www.vinabook.com/products/live-in-love-song-doi-yeu-thuong',
  'https://www.vinabook.com/products/den-luot-ban-lam-than-roi-day',
  'https://www.vinabook.com/products/park-tien-sinh-song-giua-sai-gon',
  'https://www.vinabook.com/products/the-marvelous-land-of-oz-xu-oz-ky-dieu',
  'https://www.vinabook.com/products/phap-su-sieu-pham-xu-oz-phan-2-song-ngu',
  'https://www.vinabook.com/products/phap-su-sieu-pham-xu-oz-phan-1-song-ngu',
  'https://www.vinabook.com/products/nguoi-mat-na-den-tu-nuoc-al-jabr',
  'https://www.vinabook.com/products/yeu-thuong-bang-con-tim-khong-phai-bang-ly-tri',
  'https://www.vinabook.com/products/giac-mong-xuan-trong-ngo-ho-lo',
  'https://www.vinabook.com/products/chuyen-cu-viet-lai-1',
  'https://www.vinabook.com/products/nguoi-chong-vinh-cuu',
  'https://www.vinabook.com/products/tuyet-vong-loi',
  'https://www.vinabook.com/products/tuyen-tap-truyen-ngan-dac-sac-chau-au-b',
  'https://www.vinabook.com/products/thu-gui-bo',
  'https://www.vinabook.com/products/qua-tang-vo-gia',
  'https://www.vinabook.com/products/phep-tac-cua-loai-soi',
  'https://www.vinabook.com/products/bep-sach-lang-soyang',
  'https://www.vinabook.com/products/sau-dong-dat',
  'https://www.vinabook.com/products/doi-ve-co-ban-la-buon-cuoi-tai-ban-2022',
  'https://www.vinabook.com/products/trai-tim-thu-toi-bia-cung',
  'https://www.vinabook.com/products/phuc-cho-ai-khong-thay-ma-tin',
  'https://www.vinabook.com/products/nhung-la-thu-tu-tay-ban-nha',
  'https://www.vinabook.com/products/nhung-nguoi-dan-ong-khong-co-dan-ba-tai-ban-2021',
  'https://www.vinabook.com/products/sau-loi-the-uoc-du-cho-mua-nang-van-thuong-nhau'
];

const CATEGORY_LABEL = 'Sách Văn Học Nước Ngoài';
const SUBCATEGORY_SLUG = 'truyen-ngan';
const SUBCATEGORY_LABEL = 'Truyện Ngắn';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-van-hoc-nuoc-ngoai', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__van_hoc_nuoc_ngoai_truyen_ngan_files.txt';
const PRUNE_HANDLES = [
  'chuyen-tinh-thanh-xuan-bi-hai-cua-toi-qua-nhien-la-sai-lam-tap-11-tang-kem',
  'doi-nhu-mot-tro-dua',
  'moi-no-luc-va-cho-doi-cua-ban-deu-co-y-nghia',
  'thuong-gui-the-gian'
];

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
