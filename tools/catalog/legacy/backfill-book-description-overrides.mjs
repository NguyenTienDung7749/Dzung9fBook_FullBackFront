import { DESCRIPTION_OVERRIDES } from './config/description-overrides.mjs';
import { runLegacyDescriptionOverrides } from './shared/run-description-overrides.mjs';

await runLegacyDescriptionOverrides(import.meta.url, {
  descriptionOverrides: DESCRIPTION_OVERRIDES
});
