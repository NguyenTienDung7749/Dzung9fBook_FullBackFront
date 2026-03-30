import { SITE_ORIGIN } from './shared/collection-import-support.mjs';
import { runLegacyCollectionImport } from './shared/run-collection-import.mjs';

const CATEGORY_BUSINESS = 'S\u00e1ch Kinh T\u1ebf';

const COLLECTION_CONFIGS = [
  {
    name: 'Tai Chinh - Ke Toan',
    subcategorySlug: 'tai-chinh-ke-toan',
    categoryLabel: CATEGORY_BUSINESS,
    pageUrls: [
      `${SITE_ORIGIN}/collections/tai-chinh-tien-te?page=1`,
      `${SITE_ORIGIN}/collections/tai-chinh-tien-te?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'tai-chinh-ke-toan'],
    filesListName: '__tai_chinh_ke_toan_files.txt'
  },
  {
    name: 'Khoi Nghiep',
    subcategorySlug: 'khoi-nghiep',
    categoryLabel: CATEGORY_BUSINESS,
    pageUrls: [
      `${SITE_ORIGIN}/collections/khoi-nghiep-ky-nang-lam-viec?page=1`,
      `${SITE_ORIGIN}/collections/khoi-nghiep-ky-nang-lam-viec?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'khoi-nghiep'],
    filesListName: '__khoi_nghiep_files.txt'
  }
];

await runLegacyCollectionImport(import.meta.url, {
  collectionConfigs: COLLECTION_CONFIGS,
  pageEntryMode: 'handles',
  mergeStrategy: 'replaceBySubcategory',
  allocateUniqueIds: false,
  includeSourceProductId: false,
  useCollectionImageFallback: false,
  logScope: 'subcategory'
});
