import { EXPANDED_COLLECTION_CONFIGS } from './config/expanded-collections.mjs';
import { runLegacyCollectionImport } from './shared/run-collection-import.mjs';

await runLegacyCollectionImport(import.meta.url, {
  collectionConfigs: EXPANDED_COLLECTION_CONFIGS,
  pageEntryMode: 'entries',
  mergeStrategy: 'replaceByCategorySubcategory',
  allocateUniqueIds: true,
  includeSourceProductId: true,
  useCollectionImageFallback: true,
  logScope: 'categorySubcategory'
});
