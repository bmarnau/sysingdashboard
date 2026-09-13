/**
 * Fassade des Reference-Data-Plattformdienstes.
 *
 * UI und Hooks importieren ausschließlich aus dieser Datei — nie aus
 * `adapter.ts` (Supabase) oder `cache.ts`.
 */
export { ReferenceDataService } from "./service";
export {
  listCatalogs,
  listValues,
  getValue,
  requireValue,
  getCatalogVersion,
  createValue,
  updateValue,
  deactivateValue,
  refresh,
  currentState,
  registerReconnectRefresh,
  resetForTests,
} from "./service";
export { CATALOG_KEYS } from "./types";
export type { ListValuesOptions } from "./service";
export type {
  CatalogKey,
  ReferenceCatalog,
  ReferenceDataAccessContext,
  ReferenceDataSnapshot,
  ReferenceDataState,
  ReferenceScopeType,
  ReferenceValue,
} from "./types";
