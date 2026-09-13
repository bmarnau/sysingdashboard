/**
 * ReferenceDataService — fachlicher Servicevertrag aus docs/REFERENCE-DATA.md.
 *
 * Regeln:
 * - Lesen läuft über den principal-/tenant-sicheren Read-Through-Cache.
 * - Pflege ist offline gesperrt (`REFDATA_OFFLINE_READONLY`).
 * - Werte werden nie gelöscht, nur deaktiviert.
 * - Systemhouse-Kataloge werden niemals ohne expliziten Systemhouse-Scope
 *   als gemischte Werteliste ausgeliefert.
 */

import { ReferenceDataError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { isOnline, onReconnect } from "@/lib/online-status";
import * as repository from "./repository";
import { clearCache } from "./cache";
import type { ReferenceCatalog, ReferenceDataState, ReferenceValue } from "./types";

let state: ReferenceDataState | null = null;

/**
 * Repository.load() prüft bei jedem Zugriff den aktuellen Principal/Scope.
 * Dadurch kann ein Benutzerwechsel nie den In-Memory-State des Vorgängers
 * wiederverwenden; ein frischer Cache verhindert trotzdem unnötige Value-Reads.
 */
async function ensure(force = false): Promise<ReferenceDataState> {
  state = await repository.load({ forceRefresh: force });
  return state;
}

export async function refresh(): Promise<ReferenceDataState> {
  return ensure(true);
}

export function currentState(): ReferenceDataState | null {
  return state;
}

export async function listCatalogs(domain?: string): Promise<ReferenceCatalog[]> {
  const { snapshot } = await ensure();
  const list = domain
    ? snapshot.catalogs.filter((catalog) => catalog.domain === domain)
    : snapshot.catalogs.slice();
  return list.sort((a, b) => a.key.localeCompare(b.key));
}

export interface ListValuesOptions {
  includeInactive?: boolean;
  systemhouseId?: string;
}

export async function listValues(
  catalogKey: string,
  options: ListValuesOptions = {},
): Promise<ReferenceValue[]> {
  const { snapshot } = await ensure();
  const catalog = snapshot.catalogs.find((entry) => entry.key === catalogKey);
  if (!catalog) return [];

  if (catalog.scopeType === "systemhouse") {
    if (!options.systemhouseId) return [];
    if (!snapshot.accessContext.systemhouseIds.includes(options.systemhouseId)) return [];
  }

  return snapshot.values
    .filter((value) => value.catalogKey === catalogKey)
    .filter((value) =>
      catalog.scopeType === "systemhouse"
        ? value.systemhouseId === options.systemhouseId
        : value.systemhouseId === null,
    )
    .filter((value) => options.includeInactive || value.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export async function getValue(
  catalogKey: string,
  valueKey: string,
  options: Pick<ListValuesOptions, "systemhouseId"> = {},
): Promise<ReferenceValue | null> {
  const values = await listValues(catalogKey, { ...options, includeInactive: true });
  return values.find((value) => value.key === valueKey) ?? null;
}

export async function requireValue(
  catalogKey: string,
  valueKey: string,
  options: Pick<ListValuesOptions, "systemhouseId"> = {},
): Promise<ReferenceValue> {
  const value = await getValue(catalogKey, valueKey, options);
  if (!value) {
    throw new ReferenceDataError(
      "REFDATA_VALUE_UNKNOWN",
      `Katalogwert ${catalogKey}/${valueKey} existiert im angeforderten Scope nicht.`,
      { context: { catalogKey, valueKey, systemhouseId: options.systemhouseId } },
    );
  }
  return value;
}

export async function getCatalogVersion(catalogKey: string): Promise<number | null> {
  const { snapshot } = await ensure();
  return snapshot.catalogs.find((catalog) => catalog.key === catalogKey)?.version ?? null;
}

function assertOnlineForWrite(): void {
  if (!isOnline()) {
    throw new ReferenceDataError(
      "REFDATA_OFFLINE_READONLY",
      "Katalogpflege ist ohne Verbindung nicht möglich. Es wurde nichts gespeichert.",
    );
  }
}

async function assertWriteScope(systemhouseId?: string | null): Promise<void> {
  if (!systemhouseId) return;
  const { snapshot } = await ensure();
  if (!snapshot.accessContext.systemhouseIds.includes(systemhouseId)) {
    throw new ReferenceDataError(
      "REFDATA_SCOPE_DENIED",
      "Der angeforderte Systemhaus-Kontext gehört nicht zum aktiven Benutzer.",
      { context: { systemhouseId } },
    );
  }
}

export async function createValue(
  payload: Parameters<typeof repository.write.insertValue>[0],
  actorId: string,
): Promise<void> {
  assertOnlineForWrite();
  await assertWriteScope(payload.systemhouseId);
  await repository.write.insertValue(payload, actorId);
  await refresh();
}

export async function updateValue(
  id: string,
  patch: Parameters<typeof repository.write.updateValue>[1],
  actorId: string,
): Promise<void> {
  assertOnlineForWrite();
  await repository.write.updateValue(id, patch, actorId);
  await refresh();
}

/** Deaktivierung statt Löschung. */
export async function deactivateValue(id: string, actorId: string): Promise<void> {
  assertOnlineForWrite();
  await repository.write.updateValue(
    id,
    { isActive: false, validTo: new Date().toISOString() },
    actorId,
  );
  await refresh();
}

/**
 * Reconnect-Verhalten: Kataloge neu laden, Cache ersetzen, Deaktivierungen
 * übernehmen. Fehler werden protokolliert, aber nicht geworfen.
 */
export function registerReconnectRefresh(): () => void {
  return onReconnect(() => {
    void refresh().catch((error: unknown) => {
      logger.error("Reference Data konnte nach Reconnect nicht aktualisiert werden", error);
    });
  });
}

/** Nur für Tests/Abmeldung: In-Memory-Zustand und Reference-Data-Caches verwerfen. */
export function resetForTests(): void {
  state = null;
  clearCache();
}

export const ReferenceDataService = {
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
};
