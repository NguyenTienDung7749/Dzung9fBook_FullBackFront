import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

const SOURCE_URLS = [
  'https://www.vinabook.com/products/cua-hang-ma-quai-combo-2-tap',
  'https://www.vinabook.com/products/khi-dia-nguc-trong-rong',
  'https://www.vinabook.com/products/mon-qua-den-tu-coi-chet'
];

const CATEGORY_LABEL = 'Sách Văn Học Nước Ngoài';
const SUBCATEGORY_SLUG = 'vien-tuong';
const SUBCATEGORY_LABEL = 'Viễn Tưởng';
const IMAGES_ROOT_SEGMENTS = ['assets', 'images', 'books', 'sach-van-hoc-nuoc-ngoai', SUBCATEGORY_SLUG];
const FILES_LIST_NAME = '__van_hoc_nuoc_ngoai_vien_tuong_files.txt';
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
