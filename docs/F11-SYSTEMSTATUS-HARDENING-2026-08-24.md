# F-11 Systemstatus-Hardening — 2026-08-24

## Zweck

Dieser Nachweis dokumentiert die technische Bearbeitung der Systemstatus-Findings aus der manuellen F-11-Runtime-Abnahme.

Ausgangsbasis: GitHub `main` auf `a6b0379f19289c5e94f5ee16fb0a0b4b3904db95` nach Merge von PR #41.

Tracking: Issue #42.

## Findings und Korrektur

### SYSSTAT-01 — Lovable Deploymentstatus

**Befund:** Eine veröffentlichte App konnte `Deployment status: Not configured` anzeigen, wenn Lovable keine Deployment-ENV-Metadaten in die Runtime injiziert.

**Korrektur:**

- feste Publish-URL darf weiterhin aus den bekannten Projektmetadaten stammen,
- Deploymentstatus wird ausschließlich aus Hosting-Metadaten abgeleitet,
- fehlen diese Metadaten, zeigt die UI neutral `vom Hosting nicht bereitgestellt`,
- `Last deployment` wird bei fehlendem Hosting-Zeitstempel ebenfalls neutral dargestellt.

Damit wird `unbekannt` nicht mehr als `nicht deployed` interpretiert.

### SYSSTAT-02 — Lovable Project ID

**Befund:** Die normale secret-freie Betriebsübersicht zeigte eine provider-spezifische Projektkennung.

**Korrektur:**

- `/api/status` liefert keine `projectId` mehr,
- der Systemstatus zeigt keine Project-ID-Zeile mehr,
- Regressionstest stellt sicher, dass auch eine gesetzte `LOVABLE_PROJECT_ID` nicht in den öffentlichen Payload gelangt.

Interne Providerkonfiguration wird dadurch nicht verändert.

### SYSSTAT-03 — optionale Azure-ENV als globaler Security-Fehler

**Befund:** Supabase ist der produktive MVP-Provider, aber die allgemeine Security-ENV-Ampel nutzte die historische Azure-Pflichtliste und zeigte fehlende zukünftige Azure-Variablen als roten Fehler.

**Korrektur:**

- `security.envValidation` bewertet nur die aktuell aktive Auth-Plattform,
- Standardprovider ist `supabase`, dafür sind die Azure-Secrets keine Pflichtwerte,
- bei später aktivem Entra-Provider werden die derzeit bekannten Mindestwerte `AZURE_CLIENT_ID` und `AZURE_TENANT_ID` geprüft,
- in Produktion werden fehlende ENV-Namen nicht öffentlich ausgegeben; Counts bleiben verfügbar,
- optionale Azure-Konfiguration wird separat unter `azure` ausgewiesen.

Die eigentliche Azure-Secret-Verwendung über `consume()` und echte Verbindungsanforderungen werden nicht aufgeweicht.

### SYSSTAT-04 — verborgene Azure-ENV-Namen als `alle gesetzt`

**Befund:** In Produktion enthält `azure.missingEnv` aus Sicherheitsgründen keine Namen. Die UI wertete die leere Liste fälschlich als `alle gesetzt`.

**Korrektur:**

- UI nutzt `azure.missingEnvCount`,
- fehlende optionale Azure-Zielwerte werden neutral als `optional target — N not configured` dargestellt,
- Namen werden nur dargestellt, wenn der Payload sie tatsächlich freigibt,
- `Azure auth mode` und `Key Vault readiness` werden bei fehlender optionaler Azure-Konfiguration neutral statt als roter Fehler dargestellt.

## Sicherheits- und Architekturgrenze

Unverändert:

- Supabase ist produktiver MVP-Daten-/Auth-Provider,
- RBAC und RLS unverändert,
- keine Datenbankmigration,
- keine Änderung an Benutzer-/Rollenrechten,
- keine Secret-Werte im Statuspayload,
- keine Connection Strings, Tokens oder Service-Role-Keys,
- Azure bleibt optionaler Zielprovider,
- Provider-spezifische Betriebsmetadaten werden minimiert.

## Geänderte Produktbereiche

- `backend/services/statusService.mjs`
- `src/types/backend.d.ts`
- `src/hooks/useSystemStatusHealth.ts`
- `src/components/SystemStatusDialog.tsx`
- `src/components/azure/AzureStatusPanel.tsx`
- `src/__tests__/backend/status.test.ts`

## Automatisierte Abnahmekriterien

Die Regression muss mindestens beweisen:

1. kanonische öffentliche GitHub-URL bleibt erhalten,
2. credential-bearing Runtime-Git-Remotes werden nicht exponiert,
3. Lovable Project ID wird nicht exponiert,
4. fehlende Lovable-Hostingmetadaten werden als unbekannt (`null`) modelliert,
5. Supabase-Runtime bleibt ohne optionale Azure-ENV global `ok`,
6. Azure-Missing-Count bleibt separat verfügbar,
7. später aktives Entra verlangt weiterhin Client-/Tenant-ID,
8. Secret-Werte werden weiterhin nicht serialisiert.

Danach vollständige Repository-CI und Security ausführen.

## Manueller Re-Test nach Merge und Lovable-Sync

Nur Systemstatus öffnen und prüfen:

- Lovable Publish URL korrekt,
- fehlender Deploymentstatus neutral `vom Hosting nicht bereitgestellt` oder echte Hostinginformation,
- keine Project ID sichtbar,
- `Runtime ENV (aktive Plattform)` für Supabase grün/ok,
- Azure-Bereitschaft als optional und nicht als globaler Security-Fail,
- keine Secrets/Zugangsdaten sichtbar.

Bis CI/Security, Merge, Lovable-Sync und diesem Re-Test bleibt Issue #42 offen.
