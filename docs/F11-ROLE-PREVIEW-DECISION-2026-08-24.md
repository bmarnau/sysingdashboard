# F-11 — Fachentscheidung Role Preview 2026-08-24

Status: **ENTSCHEIDUNG GETROFFEN — FÜR AKTUELLEN MVP NICHT ANWENDBAR (N/A)**

## Ausgangslage

Die Rollenabnahme aus Sprint 09C enthält historisch einen Prüfschritt `Role Preview`. Frühere Dokumentation beschrieb diese Funktion als reine Darstellungsumschaltung für Administrator/App-Entwickler ohne Rechteerweiterung.

In der aktuellen F-11-Restabnahme wurde festgestellt, dass dieser Prüfschritt nicht mehr zum heutigen Produktstand passt.

## Aktueller technischer Befund

Repository-Prüfung auf aktuellem `main` (`76247b77d9bc9e12738b350f9edfd5227b0a26b4`):

- kein aktueller Einstiegspunkt `Role Preview` im Produktcode,
- keine Komponente/Funktion `RolePreview`,
- keine aktuelle Rollen-Vorschau-/Impersonation-Funktion,
- keine entsprechende aktuelle Produktpflicht aus ADR-0007/ADR-0008,
- verbliebene Referenzen liegen im Wesentlichen in Acceptance-/Hilfe-/Statusdokumentation.

Der aktuelle Berechtigungsnachweis benötigt Role Preview nicht:

- Rollen und Rechte stammen serverseitig aus dem bestehenden RBAC-Modell,
- Viewer-/Negativtests sind separat fachlich und technisch belegt,
- Systemingenieur-, Projektmanager-, Teamlead- und Administrator-Sichten wurden mit realen Rollen bzw. Demo-Konten geprüft,
- serverseitige/RLS-Schreibgrenzen werden nicht durch eine UI-Simulation ersetzt.

## Entscheidung

Für den aktuellen MVP gilt:

> **Role Preview ist kein Bestandteil des freigegebenen Produktumfangs und wird im F-11-Abschluss als `nicht anwendbar (N/A)` behandelt.**

Es wird **keine neue Role-Preview-Funktion nur zur Erfüllung eines historischen Prüfpunkts implementiert**.

Damit gilt ausdrücklich:

- N/A ist kein technischer PASS einer nicht vorhandenen Funktion,
- der historische Acceptance-Punkt wird bei der finalen F-11-Konsolidierung als Produkt-/Dokudrift bereinigt,
- bestehende reale Rollen- und Negativtests bleiben die maßgeblichen Nachweise,
- keine Änderung an Auth, RBAC, RLS oder Benutzerrechten,
- keine Impersonation und keine Rechteausweitung werden eingeführt.

## Zukunftsoption

Eine spätere sichere Rollen-Vorschau kann als eigenständiges Post-MVP-/BSF-Feature neu bewertet werden, falls dafür ein konkreter fachlicher Nutzen entsteht, z. B. Schulung, Support oder UI-Abnahme.

Falls sie später umgesetzt wird, muss sie mindestens:

- reine Darstellung von tatsächlichen Berechtigungsscopes strikt trennen,
- niemals serverseitige Identität/Rolle verändern,
- keine RLS-/RBAC-Grenze umgehen,
- klar als Vorschau gekennzeichnet sein,
- auditiert und mit Negativtests abgesichert sein.

Diese Zukunftsoption ist **kein aktueller Backlog-Blocker**.

## Konsequenz für F-11

Bei der finalen Aktualisierung von `docs/ROLE-ACCEPTANCE-09C.md` wird `Role Preview` von `OPEN` auf `N/A — kein aktueller Produktbestandteil` gesetzt.

Damit verbleibt als manueller Administrator-Restpunkt nur der gezielte produktive Systemstatus-Retest nach PR #46. Anschließend kann die F-11-Dokumentation konsolidiert und der finale Gate-Lauf vorbereitet werden.
