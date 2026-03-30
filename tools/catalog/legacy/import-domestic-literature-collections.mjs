import { SITE_ORIGIN } from './shared/collection-import-support.mjs';
import { runLegacyCollectionImport } from './shared/run-collection-import.mjs';

const CATEGORY_DOMESTIC_LITERATURE = 'S\u00e1ch V\u0103n H\u1ecdc Trong N\u01b0\u1edbc';

const COLLECTION_CONFIGS = [
  {
    name: 'Tieu Thuyet',
    subcategorySlug: 'tieu-thuyet',
    categoryLabel: CATEGORY_DOMESTIC_LITERATURE,
    pageUrls: [
      `${SITE_ORIGIN}/collections/tieu-thuyet-1?page=1`,
      `${SITE_ORIGIN}/collections/tieu-thuyet-1?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-van-hoc-trong-nuoc', 'tieu-thuyet'],
    filesListName: '__van_hoc_tieu_thuyet_files.txt'
  },
  {
    name: 'Truyen Ngan - Tan Van',
    subcategorySlug: 'truyen-ngan-tan-van',
    categoryLabel: CATEGORY_DOMESTIC_LITERATURE,
    pageUrls: [
      `${SITE_ORIGIN}/collections/truyen-ngan-tan-van?page=2`,
      `${SITE_ORIGIN}/collections/truyen-ngan-tan-van?page=3`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-van-hoc-trong-nuoc', 'truyen-ngan-tan-van'],
    filesListName: '__van_hoc_truyen_ngan_tan_van_files.txt'
  },
  {
    name: 'Tho Ca',
    subcategorySlug: 'tho-ca',
    categoryLabel: CATEGORY_DOMESTIC_LITERATURE,
    pageUrls: [
      `${SITE_ORIGIN}/collections/tho-ca-1`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-van-hoc-trong-nuoc', 'tho-ca'],
    filesListName: '__van_hoc_tho_ca_files.txt'
  },
  {
    name: 'Trinh Tham',
    subcategorySlug: 'trinh-tham',
    categoryLabel: CATEGORY_DOMESTIC_LITERATURE,
    pageUrls: [
      `${SITE_ORIGIN}/collections/truyen-trinh-tham-vu-an-1?page=1`,
      `${SITE_ORIGIN}/collections/truyen-trinh-tham-vu-an-1?page=2`
    ],
    imagesRootRelative: ['assets', 'images', 'books', 'sach-van-hoc-trong-nuoc', 'trinh-tham'],
    filesListName: '__van_hoc_trinh_tham_files.txt'
  }
];

await runLegacyCollectionImport(import.meta.url, {
  collectionConfigs: COLLECTION_CONFIGS,
  pageEntryMode: 'handles',
  mergeStrategy: 'replaceByCategorySubcategory',
  allocateUniqueIds: true,
  includeSourceProductId: true,
  useCollectionImageFallback: false,
  logScope: 'subcategory'
});
