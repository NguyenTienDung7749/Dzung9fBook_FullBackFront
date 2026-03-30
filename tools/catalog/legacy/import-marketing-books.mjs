import { MARKETING_BOOK_IMPORT_CONFIG } from './config/marketing-books.mjs';
import { runLegacyJsonProductImport } from './shared/run-json-product-import.mjs';

await runLegacyJsonProductImport(import.meta.url, MARKETING_BOOK_IMPORT_CONFIG);
