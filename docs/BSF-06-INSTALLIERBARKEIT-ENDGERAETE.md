# BSF-06 — Installierbarkeit, Betreiberhoheit und Endgeräte

Stand: 2026-09-09  
Status: verbindliche Planung für BSF-06  
Bezug: Issue #121, `docs/GESAMTPLAN-SYSING-DASHBOARD.md`, `docs/SPRINT-PLAN-MVP-BSF.md`

## 1. Ziel

BSF-06 ist der verbindliche Meilenstein, an dem das Sysing Dashboard nicht nur als veröffentlichte Webanwendung funktioniert, sondern als technisch portables, dokumentiertes und reproduzierbar betreibbares Produkt nachgewiesen wird.

Dabei werden drei Reifegrade ausdrücklich getrennt:

1. Browserbasierte Nutzung auf unterschiedlichen Endgeräten.
2. Belastbarer produktiver Multi-Device-Betrieb auf einer stabilen zentralen/synchronisierten Datenbasis.
3. Saubere autonome Installation / Self-Hosting einschließlich Endgeräte-Abnahme und Entscheidung über eine installierbare PWA.

## 2. Reifegrad A — Browserbasierte Nutzung

Dieser Reifegrad kann bereits vor BSF-04 und BSF-06 erreicht sein, sofern eine zentrale veröffentlichte Umgebung erreichbar ist.

Zielplattformen mindestens:

- Windows Desktop/Notebook,
- macOS,
- Linux,
- Android Smartphone/Tablet,
- iPhone/iPad.

Browser-first bleibt die Baseline.

Wichtig:

- Browserzugriff ist noch keine autonome Installation.
- Eine funktionierende Lovable-Veröffentlichung ist kein Nachweis für Betreiberhoheit.
- UI-Gating bleibt keine Security Boundary; Auth, RBAC, RLS und Customer-Scope werden serverseitig durchgesetzt.

## 3. Reifegrad B — belastbarer produktiver Multi-Device-Betrieb

Wesentliche Voraussetzung ist BSF-04 mit stabiler zentraler/synchronisierter Datenstrategie.

Erst wenn Source of Truth, Local-First-Grenze, Konflikt-/Staleness-/Offline-Verhalten, stabile IDs, Backup/Restore und Providergrenzen geklärt sind, kann der Betrieb auf mehreren Endgeräten als belastbar gelten.

BSF-04 ist deshalb die zentrale Vorstufe für echten Multi-Device-Betrieb.

## 4. Reifegrad C — autonome Installation / Self-Hosting

Das formale Gate liegt in BSF-06.

Nach erfolgreichem BSF-06-Gate soll eine Organisation das Sysing Dashboard unabhängig von Lovable Cloud reproduzierbar installieren, konfigurieren, aktualisieren, sichern, wiederherstellen und betreiben können.

Mindestens erforderlich:

- Docker-Container bzw. dokumentierter Container-Stack,
- Supabase/Postgres-Portabilität bzw. klar dokumentierter MVP-Betriebspfad,
- sichere Runtime-Konfiguration und Secret-Verwaltung,
- Setup-, Update-, Rollback- und Restore-Pfad,
- real getestetes Backup/Restore,
- Health-/Logging-Grundlage,
- Betriebs- und Installationsdokumentation,
- Exit-/Migrationspfad,
- keine technisch unersetzbare Lovable-Cloud-Runtime,
- Vorbereitung auf Microsoft Entra ID, Azure SQL und Azure Storage.

## 5. Endgeräte-Installierbarkeit / PWA

Docker löst die Serverinstallation, nicht die app-artige Installation auf Endgeräten.

Deshalb gehört zu BSF-06 eine ausdrückliche Entscheidung, ob eine Progressive Web App (PWA) die geeignete Installationsform für V1 ist.

### 5.1 Zielbild PWA

Wenn PWA umgesetzt wird, soll das Sysing Dashboard auf unterstützten Endgeräten aus dem Browser installierbar und anschließend wie eine eigenständige Anwendung startbar sein.

Mindestens zu prüfen bzw. umzusetzen:

- Web App Manifest,
- geeignete Icons und Metadaten,
- Standalone-Start,
- definierter Update-/Versionspfad,
- Installations- und Update-Tests,
- Auth-/Logout-Verhalten im installierten Modus,
- Device-Loss-/Logout-/Cache-Clear-Verhalten,
- dokumentierte Browser-/OS-Matrix.

### 5.2 Sicherheitsgrenzen

Besonders wichtig:

- keine produktiven Secrets im Client,
- keine unkontrollierte Offline-Speicherung sensibler Customer-/Leistungsdaten,
- Service-Worker-/Cache-Strategie fail-safe und datenschutzkonform,
- Session-/Token-Lebenszyklus auf gemeinsam genutzten Endgeräten berücksichtigen,
- Logout muss lokal gehaltene sensible Daten soweit technisch vorgesehen verlässlich beseitigen,
- HTTPS/TLS im produktiven Betrieb,
- RBAC/RLS/Customer-Scope bleiben serverseitige Sicherheitsgrenzen.

## 6. Native Apps

Native iOS-, Android- oder Windows-Apps sind für V1 nicht erforderlich, sofern Browser/PWA die fachlichen, sicherheitstechnischen und betrieblichen Anforderungen erfüllen.

Eine spätere native App benötigt eine eigene fachliche Begründung und eine eigene Architekturentscheidung.

## 7. Voraussetzungen in der Sprintfolge

BSF-06 beginnt planmäßig erst nach:

1. BSF-03 bis BSF-03C einschließlich Customer-/Responsibility-/Leistungssichten,
2. BSF-DOC-01 bis BSF-DOC-03,
3. BSF-04 zentrale/synchronisierte Datenstrategie,
4. BSF-04A soweit vorgesehen,
5. BSF-05 Canonical Import / Providervertrag.

Strategischer Pfad:

`BSF-03 -> BSF-03D -> BSF-03A -> BSF-03B -> BSF-03E -> BSF-03C -> DOC-01 -> DOC-02 -> DOC-03 -> BSF-04 -> BSF-04A -> BSF-05 -> BSF-06 -> BSF-07 -> BSF-09 -> BSF-10 -> BSF-FINAL`

## 8. Abnahmekriterien BSF-06

BSF-06 gilt erst als DONE, wenn mindestens folgende Nachweise vorliegen:

### Betrieb / Docker

- Installation aus Dokumentation reproduzierbar,
- Start/Restart reproduzierbar,
- Update-/Rollback-Pfad getestet,
- Backup/Restore getestet,
- sichere Runtime-Konfiguration nachgewiesen,
- keine Lovable-only Laufzeitabhängigkeit,
- Health/Logging-Basis vorhanden,
- Exit-/Migrationspfad dokumentiert.

### Endgeräte

- Browser-Nutzung auf definierter Endgeräte-Matrix geprüft,
- responsive Bedienbarkeit ausreichend,
- Auth/Logout auf den unterstützten Plattformen geprüft,
- PWA-Entscheidung dokumentiert.

Falls PWA umgesetzt wird zusätzlich:

- Installation PASS,
- Update PASS,
- Standalone-Start PASS,
- Auth/Logout PASS,
- Cache-/Offline-Verhalten PASS,
- keine unkontrollierte Offline-Exposition sensibler Daten.

### Governance / Qualität

- Security PASS,
- vollständige CI/E2E/Accessibility/Quality-Gates PASS,
- Betriebs-/Installationsdokumentation aktuell,
- technischer Prüfbericht synchron,
- SYSING-001 synchron,
- keine produktiven Secrets, Tokens, Passwörter oder Service-Role-Keys in Code, Doku oder Logs.

## 9. Definition des Meilensteins

Nach erfolgreichem BSF-06 soll folgende Aussage belastbar zutreffen:

> Das Sysing Dashboard kann auf einem neuen, geeigneten Docker-/On-Premises-Host nach Dokumentation reproduzierbar installiert und betrieben werden. Berechtigte Benutzer können anschließend mit unterstützten Desktop- und Mobilgeräten sicher darauf zugreifen; falls PWA freigegeben ist, kann die Anwendung auf diesen Geräten app-artig installiert und betrieben werden.

BSF-06 ist damit kein Komfortsprint, sondern ein Pflicht-Gate vor BSF-FINAL.
