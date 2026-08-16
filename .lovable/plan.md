# Zentraler Daten-Refresh (Sprint 09C)

Ein Refresh-Button im Dashboard-Header lädt alle serverseitigen Daten des angemeldeten Benutzers neu, liest den lokalen Workspace erneut ein und berechnet abgeleitete Sichten neu — ohne Browser-Reload, ohne Schreiboperation.

## Bestandsaufnahme (geprüft)

Es gibt bereits Refresh-Punkte, aber keinen Orchestrator:

- `ReferenceDataService.refresh()` (`src/lib/reference-data/service.ts`) — echter Netz-Reload inkl. Cache-Ersatz
- `useAvkkWorkspace().reload` / `useAvkkManagement().reload` / `useAvkkDossier().reload` — Tick-basiertes Neuladen
- `useReferenceData().reload`, `useUsers().refresh` (`src/hooks/useCurrentUser.ts`), `useSystemStatusHealth().refresh`
- `initDashboardPersistence()` hydratisiert den lokalen Store (Facade `useDashboardPersistence.ts`); `rehydrateFromStorage()` ist derzeit nur intern
- `useCurrentUser` lädt Profil/Rolle nur bei Mount und Auth-Events — kein manueller Reload vorhanden

Es wird also keine zweite Infrastruktur gebaut, sondern ein Koordinator über diese bestehenden Fassaden gelegt.

## Architektur

```text
Header-Button
   ↓
useRefresh() (Hook)
   ↓
RefreshCoordinator (src/lib/refresh/)
   ↓  Schritte
refreshCurrentUser · refreshReferenceData · refreshAvkk · reloadLocalWorkspace
   ↓
bestehende Services (ReferenceDataService, AVKK-Services, Store-Persistenz)
   ↓
Supabase / künftige Provider
```

Kein Supabase-Import in Header oder Koordinator — der Koordinator kennt nur registrierte Schritte.

### Neue Dateien

- `src/lib/refresh/types.ts` — `RefreshStep { id, label, run() }`, `RefreshResult { ok, failed: {id,label}[] , finishedAt }`
- `src/lib/refresh/refresh-coordinator.ts`
  - Registry der Schritte, `runRefresh()` sequenziell-gruppiert (Reference Data zuerst, dann AVKK/User parallel)
  - Single-Flight: laufender Refresh wird bei Mehrfachklick wiederverwendet, kein zweiter Lauf
  - Teilfehler: gescheiterte Schritte werden gesammelt, restliche Daten bleiben gültig
  - Pub/Sub `subscribeRefresh(cb)` + monoton steigender `refreshGeneration()` als Signal für Hooks
- `src/hooks/useRefresh.ts` — `{ running, lastRefreshedAt, failed, refresh() }`
- `src/hooks/useRefreshSignal.ts` — liefert die Generation; Hooks hängen sie in ihre Effekt-Deps
- `src/components/dashboard/header/RefreshButton.tsx` — Icon-Button, `aria-label`/Tooltip „Daten aktualisieren“, Spinner + Rotation während des Laufs, disabled währenddessen, Sonner-Toast „Daten aktualisiert“ bzw. Teilfehlermeldung mit Bereichsnamen, Titel zeigt „Zuletzt aktualisiert: HH:MM“

### Anpassungen bestehender Dateien

- `src/lib/store/dashboard-persistence.ts`: `rehydrateFromStorage()` als `rehydrateDashboardStore()` exportieren (defensiv bei beschädigtem Storage — bestehendes Merge-Verhalten bleibt)
- `src/hooks/useDashboardPersistence.ts`: Facade um `reloadLocalWorkspace()` erweitern (UI-Schicht darf die Persistenz nicht direkt importieren)
- `src/hooks/useCurrentUser.ts`: Ladefunktion über Refresh-Signal erneut ausführbar machen (Rolle/Profil neu aus `profiles`/`user_roles`; keine Rechteänderung, keine neue Session)
- `src/hooks/useAvkkWorkspace.ts`, `useAvkkManagement.ts`, `useAvkkDossier.ts`, `useReferenceData.ts`: Refresh-Generation als zusätzliche Effekt-Abhängigkeit → Mein AVKK, Management, Handlungsbedarf, Frühindikatoren, Filter/Aggregate aktualisieren sich mit
- `src/routes/_authenticated/dashboard.tsx`: `RefreshButton` links neben `LogoutButton` im Header; Kennzahlen/Projekte/AP/Tätigkeiten/Abrechnung leiten sich aus dem Store ab und rechnen nach der Rehydration automatisch neu
- `src/components/DemoDataDialog.tsx`: Refresh-Icon-Button im Block „Zuordnung der Demo-Personen“, Tooltip „Benutzer und Rollen aktualisieren“; nutzt dieselbe `listUsers()`-Fassade, behält gültige Persona-Zuordnungen, markiert nicht mehr vorhandene Konten sichtbar als ungültig und entfernt sie aus der Auswahl. Keine Schreiboperation.

### Garantien

- Kein `window.location.reload()`, keine Realtime-Abos, kein Polling
- Refresh ruft ausschließlich Lesepfade auf; Seed-/Write-Funktionen werden nicht registriert
- RBAC/RLS unverändert; Role Preview wird nicht angefasst
- Session abgelaufen / Benutzer deaktiviert: Schritt meldet Fehler, bestehende Auth-Guards greifen wie bisher; kein White Screen, keine Schleife

## Tests

Neu unter `src/__tests__/lib/refresh/` und `src/__tests__/components/`:

- Koordinator: alle Schritte laufen, Single-Flight bei Mehrfachklick, Teilfehler wird gemeldet ohne die anderen Schritte zu stoppen, Fehler eines Providers wird sauber behandelt
- Signal: AVKK-Hooks laden nach Refresh neu (geänderte Verantwortung erscheint in „Mein AVKK“), Managementdaten werden neu geladen
- Lokaler Bestand: Projekte/AP/Tätigkeiten bleiben nach Rehydration erhalten, Kennzahlen neu berechnet
- Benutzer: Rolle wird neu eingelesen, Role Preview erweitert keine Rechte
- Statische Prüfung: kein `window.location.reload` im Refresh-Pfad, keine Write-Funktion in der Schritt-Registry
- Demo-Dialog: Rollenänderung sichtbar, neues Konto erscheint, gültige Zuordnung bleibt, ungültige wird erkannt, kein AVKK-Write

## Dokumentation & Gates

- Neues Handbuch-Kapitel „Daten aktualisieren“ in `src/lib/help-documentation.ts` (mit `lastUpdated`), inkl. der ehrlichen Grenze: Projekte, Arbeitspakete und Tätigkeiten bleiben local-first im Browser und werden nicht aus einer zentralen Datenbank synchronisiert
- `CHANGELOG.md` (v1.59.0), `docs/PROJECT-STATUS.yaml`, `docs/ENTWICKLUNGSTAGEBUCH.md`, `docs/ARCHITECTURE.md` (Refresh-Schicht)
- Gates: Tests, Typecheck, ESLint/Prettier, Build, `docs:check`, `project-status:check`, `rbac:check`, no-console — ohne Abschwächung

## Bewusst nicht enthalten

Serverpersistenz für lokale Arbeitsobjekte, SharePoint/Graph/Azure, Realtime, Background-Polling, automatische periodische Synchronisation.
