import { EXPANDED_COLLECTION_CONFIGS } from './config/expanded-collections.mjs';
import { runLegacyCollectionImageBackfill } from './shared/run-collection-image-backfill.mjs';

await runLegacyCollectionImageBackfill(import.meta.url, {
  collectionConfigs: EXPANDED_COLLECTION_CONFIGS
});
