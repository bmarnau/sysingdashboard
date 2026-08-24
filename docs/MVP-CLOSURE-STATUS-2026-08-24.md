# Sysing Dashboard — MVP-Abschlussstatus 2026-08-24

Dashboard-Version: `1.59.6`  
F-11: **CLOSED / PASS**  
MVP: **100 % / BASELINE READY — WIRKSAM MIT MERGE VON PR #60**

## 1. Zweck

Dieses Dokument ist die aktuelle Fortschreibung des MVP-Abschlussstatus. `docs/MVP-CLOSURE-STATUS-2026-08-21.md` bleibt als historischer Zwischenstand erhalten.

Der technische und fachliche Abschluss ist nachgewiesen. Der vollständige Konsolidierungsstand wurde mit CI #403 / Run `32745266068` und Security #394 erfolgreich geprüft; Technical Report und Quality Gate sind PASS. Die Baseline wird mit dem Merge des final erneut vollständig grünen Heads von PR #60 nach `main` wirksam.

## 2. Aktueller Produktstand

- Source of Truth: GitHub `bmarnau/sysingdashboard`
- produktive Referenzumgebung: `https://sysingdashboard.lovable.app`
- aktiver MVP-Daten-/Auth-Provider: Supabase
- Dashboard-Version: `1.59.6`
- Azure-/Entra-Pfad: optionales Zielbild, kein aktueller MVP-Laufzeitblocker
- lokale Fachobjekte: dokumentierte Local-First-Grenze bleibt bestehen

Referenz vor diesem Konsolidierungsbranch: `main` Commit `4276f16afc748952f91223a7bed90d8527927d3f`.

## 3. F-11 — abgeschlossen

Die vollständige Rollen- und Administrator-Restabnahme ist abgeschlossen.

Bestätigt sind:

- Systemingenieur-Rollensicht einschließlich eigenem AVKK-Scope und persönlichem Bericht,
- Projektmanager-Sicht einschließlich Projektbericht und Delegation,
- Teamleitungs-/Managementsicht einschließlich Bericht, Delegation und Verbot personenbezogener Ranglisten,
- Viewer-/Negativrolle ohne lokale oder serverseitige Rechteausweitung,
- Mehrbenutzerszenario einschließlich serverseitig abgewiesenem Fremdschreibversuch,
- Benutzerverwaltung und Namensdarstellung,
- Backup-Runtime einschließlich aktueller Dashboard-Persistenz,
- Downloadbereich,
- Log Viewer,
- finale Administrator-Gesamtsicht,
- produktiver Systemstatus-Retest SYSSTAT-01 bis SYSSTAT-04.

`Role Preview` wurde fachlich als **N/A — kein aktueller Produktbestandteil** entschieden.

Maßgebliche Nachweise:

- `docs/ROLE-ACCEPTANCE-09C-FINAL-2026-08-24.md`
- `docs/F11-MVP-CONSOLIDATION-2026-08-24.md`
- die F-11-Runtime-Evidenz aus PR #39

## 4. Technische Gate-Evidenz

PR #39 wurde nach vollständiger F-11-Abnahme gemergt.

CI #398 / Run `32743583294`:

- Setup: PASS
- Static/Format/Lint/TypeScript/RBAC/Docs/Manifest: PASS
- Unit & Components: PASS
- Backend: PASS
- API: PASS
- RBAC & Security: PASS
- Import/Export: PASS
- Backup/Restore: PASS
- Production Build: PASS
- Playwright E2E: PASS
- Accessibility: PASS
- Technical Debt: PASS
- Technical Report: PASS
- Quality Gate: PASS

Security #389: **PASS**.

Der vollständige Abschluss-/Konsolidierungsstand von PR #60 wurde ebenfalls geprüft:

- CI #403 / Run `32745266068`: **PASS**
- Security #394: **PASS**
- Static, Unit/Components, Backend, API, RBAC/Security, Import/Export und Backup/Restore: PASS
- Production Build: PASS
- Playwright E2E: PASS
- Accessibility: PASS
- Technical Debt: PASS
- laufaktueller Technical Report: PASS
- Quality Gate: PASS

Der aktuelle `main` enthält zusätzlich das CSRF-Hardening der TanStack Server Functions aus PR #58 einschließlich bestandener Security-/CI-/E2E-Abnahme.

## 5. Authentifizierung, RBAC, RLS und Datenplattform

### Authentifizierung

Supabase Auth ist der aktive MVP-Authentifizierungsprovider. Geschützte Routen, administrative Serverfunktionen und Backendzugriffe verlangen eine gültige authentifizierte Sitzung.

### RBAC

Rollen und Berechtigungen werden nicht aus manipulierbarem Browserzustand abgeleitet. Reale Rollen- und Negativtests ergänzen die automatisierte RBAC-Matrixprüfung.

### RLS / serverseitige Grenzen

Schreibgrenzen für Cloud-/AVKK-Daten sind serverseitig bzw. über RLS/Permission-Prüfungen abgesichert. Der Mehrbenutzer-Negativtest bestätigt, dass ein unzulässiger Fremdschreibversuch nicht nur in der UI, sondern serverseitig abgewiesen wird.

### Datenplattform

Supabase bleibt die aktive MVP-Plattform. Azure SQL, Azure Table Storage, Azure Blob/SAS sowie Entra sind Erweiterungs-/Migrationsziele und werden im Systemstatus neutral als optional behandelt.

## 6. Betrieb, Portabilität und Sicherheit

- GitHub bleibt Source of Truth.
- Lovable ist die veröffentlichte Referenzumgebung, darf aber keine technisch unersetzbare Fachlogik enthalten.
- Provider-spezifische Logik ist von Fachlogik und Berechtigungsmodell zu trennen.
- Produktive Schlüssel, Tokens, Passwörter und Service-Role-Keys sind nicht Bestandteil der Dokumentation oder Statusansicht.
- Systemstatus zeigt ausschließlich sichere Status-/Metadaten.
- CSRF-Schutz für TanStack Server Functions ist aktiv und regressionsgesichert.
- Docker-/Provider-Portabilität bleibt verbindliches Architekturziel.

## 7. Bekannte Post-MVP-/BSF-Punkte

Der formale F-11-Abschluss bedeutet nicht, dass alle langfristigen Architektur- oder Komfortthemen umgesetzt sind. Dokumentierte Grenzen bleiben sichtbar, insbesondere:

- F-02 Wartbarkeit/Modulgröße,
- F-03 bestehende Lint-/Codequalitätsfindings,
- F-04 weitere Schichtentrennung provider-spezifischer Azure-Pfade,
- F-05 Excel Post-MVP,
- F-06 begrenzte E2E-Abdeckung gegenüber einer vollständigen End-to-End-Fachabnahme,
- F-07 weitere Logger-/Claims-Härtung, soweit noch nicht durch neuere Security-Arbeiten überholt,
- F-08 manueller AVKK-Cloud-Restore,
- F-09 separater Leistungsnachweis-Ausgabepfad,
- F-10 Kontextindikatoren noch nicht produktiv erhoben,
- F-13 AVKK-Lesetrennung als Produktentscheidung,
- F-14 Local-First-Grenze,
- F-15 langfristige Betreiber-/Plattformportabilität,
- F-17 kein technisch erzwungener Passwortwechsel nach administrativer Setzung.

Vor der BSF-Planung werden diese Punkte gegen den jeweils aktuellen technischen Prüfbericht erneut auf Statusdrift geprüft.

## 8. Baseline-Aktivierung

Der vollständige Konsolidierungsstand ist grün gegatet. Deshalb gilt:

> **MVP 100 % / BASELINE READY.**

Die jetzt vorgenommene reine Statusfortschreibung wird selbst noch einmal vollständig durch CI, Security, Technical Report und Quality Gate geprüft. Wenn dieser finale Head ebenfalls grün ist, wird PR #60 mit Head-SHA-Schutz nach `main` gemergt. Mit diesem Merge wird die Baseline wirksam; der resultierende `main`-Commit ist die verbindliche MVP-Baseline.

## 9. Abschlussbericht

- F-18: **CLOSED / PASS**
- F-11: **CLOSED / PASS**
- Backup-Issue #40: **CLOSED**
- Systemstatus-Issue #42: **CLOSED / COMPLETED**
- Role Preview: **N/A — kein aktueller Produktbestandteil**
- Auth/RBAC/RLS: **nachgewiesen im aktuellen MVP-Scope**
- Supabase: **aktive MVP-Plattform**
- Azure/Entra: **optionaler Zukunfts-/Migrationspfad**
- MVP-Baseline: **100 % / BASELINE READY — WIRKSAM MIT MERGE VON PR #60**
