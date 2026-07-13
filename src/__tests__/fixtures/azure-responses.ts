/**
 * Deterministische Azure-Antworten für MSW-Handler und Service-Tests.
 * Enthalten **keine** echten Credentials oder Endpunkte.
 */

export const azureConnectionOk = {
  ok: true,
  at: "2026-01-01T00:00:00.000Z",
  durationMs: 21,
  message: "Verbindung zum Mock erfolgreich.",
};

export const azureImportPreviewSample = {
  scope: "Alle Bereiche (Mock)",
  counts: { toCreate: 3, toUpdate: 1, toDelete: 0, conflicts: 1 },
  conflictSamples: [
    { id: "wp-test-1", field: "name", local: "AP Test", remote: "AP Test (Azure)" },
  ],
  generatedAt: "2026-01-01T00:00:00.000Z",
};
