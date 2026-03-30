import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/hon-don-va-khu-vuon',
  'https://www.vinabook.com/products/mua-da-co',
  'https://www.vinabook.com/products/tho',
  'https://www.vinabook.com/products/tu-tu-cham-cham',
  'https://www.vinabook.com/products/tuong-van-tu-su'
];

const CATEGORY_LABEL = 'Sách Văn Học Trong Nước';
const SUBCATEGORY_SLUG = 'tho-ca';
const SUBCATEGORY_LABEL = 'Thơ Ca';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-van-hoc-trong-nuoc', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__van_hoc_tho_ca_files.txt';
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
