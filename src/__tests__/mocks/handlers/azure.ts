/**
 * MSW-Handler für simulierte Azure-Endpunkte. Deckt die vier bekannten
 * Aktionen aus `src/lib/azure/azure-service.ts` ab. Alle Antworten sind
 * deterministisch und enthalten **keine** echten Zugangsdaten.
 */
import { http, HttpResponse } from "msw";
import { azureConnectionOk, azureImportPreviewSample } from "../../fixtures/azure-responses";

const AZURE_HOST = "https://azure.test.local";

export const azureHandlers = [
  http.get(`${AZURE_HOST}/api/azure/connection-test`, () => HttpResponse.json(azureConnectionOk)),
  http.post(`${AZURE_HOST}/api/azure/export`, () =>
    HttpResponse.json({ ok: true, at: "2026-01-01T00:00:00.000Z", durationMs: 12 }),
  ),
  http.get(`${AZURE_HOST}/api/azure/import/preview`, () =>
    HttpResponse.json(azureImportPreviewSample),
  ),
  http.post(`${AZURE_HOST}/api/azure/import`, () =>
    HttpResponse.json({ ok: true, at: "2026-01-01T00:00:00.000Z", durationMs: 42 }),
  ),
];
