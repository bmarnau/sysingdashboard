/**
 * ReferenceDataService — fachlicher Servicevertrag aus docs/REFERENCE-DATA.md.
 *
 * Regeln:
 * - Lesen läuft über den Read-Through-Cache (offline nutzbar).
 * - Pflege ist offline gesperrt (`REFDATA_OFFLINE_READONLY`), es wird nichts
 *   lokal vorgemerkt — es gibt keine Synchronisationsarchitektur für Stammdaten.
 * - Werte werden nie gelöscht, nur deaktiviert.
 */

import { ReferenceDataError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { isOnline, onReconnect } from "@/lib/online-status";
import * as repository from "./repository";
import { clearCache } from "./cache";
import type { ReferenceCatalog, ReferenceDataState, ReferenceValue } from "./types";

let state: ReferenceDataState | null = null;

async function ensure(force = false): Promise<ReferenceDataState> {
  if (!state || force) state = await repository.load({ forceRefresh: force });
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
    ? snapshot.catalogs.filter((c) => c.domain === domain)
    : snapshot.catalogs.slice();
  return list.sort((a, b) => a.key.localeCompare(b.key));
}

export async function listValues(
  catalogKey: string,
  options: { includeInactive?: boolean } = {},
): Promise<ReferenceValue[]> {
  const { snapshot } = await ensure();
  return snapshot.values
    .filter((v) => v.catalogKey === catalogKey)
    .filter((v) => options.includeInactive || v.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export async function getValue(
  catalogKey: string,
  valueKey: string,
): Promise<ReferenceValue | null> {
  const values = await listValues(catalogKey, { includeInactive: true });
  return values.find((v) => v.key === valueKey) ?? null;
}

export async function requireValue(catalogKey: string, valueKey: string): Promise<ReferenceValue> {
  const value = await getValue(catalogKey, valueKey);
  if (!value) {
    throw new ReferenceDataError(
      "REFDATA_VALUE_UNKNOWN",
      `Katalogwert ${catalogKey}/${valueKey} existiert nicht.`,
      { context: { catalogKey, valueKey } },
    );
  }
  return value;
}

export async function getCatalogVersion(catalogKey: string): Promise<number | null> {
  const { snapshot } = await ensure();
  return snapshot.catalogs.find((c) => c.key === catalogKey)?.version ?? null;
}

function assertOnlineForWrite(): void {
  if (!isOnline()) {
    throw new ReferenceDataError(
      "REFDATA_OFFLINE_READONLY",
      "Katalogpflege ist ohne Verbindung nicht möglich. Es wurde nichts gespeichert.",
    );
  }
}

export async function createValue(
  payload: Parameters<typeof repository.write.insertValue>[0],
  actorId: string,
): Promise<void> {
  assertOnlineForWrite();
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
 * übernehmen. Fehler werden protokolliert, aber nicht geworfen — ein
 * fehlgeschlagener Reconnect darf die App nicht beenden.
 */
export function registerReconnectRefresh(): () => void {
  return onReconnect(() => {
    void refresh().catch((error: unknown) => {
      logger.error("Reference Data konnte nach Reconnect nicht aktualisiert werden", error);
    });
  });
}

/** Nur für Tests und Abmeldung: In-Memory-Zustand und Cache verwerfen. */
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
