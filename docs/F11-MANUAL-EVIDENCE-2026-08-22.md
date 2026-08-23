# F-11 Manual Evidence — 2026-08-22

## Zweck

Dieses Dokument hält ausschließlich den am 22.08.2026 tatsächlich belegten manuellen Abnahmestand fest. Es ersetzt nicht `docs/ROLE-ACCEPTANCE-09C.md`, sondern dient als nachvollziehbare Evidenzbasis für dessen späteren Abschluss.

Nicht durchgeführte oder verschobene Prüfungen werden ausdrücklich als offen geführt und nicht als bestanden interpretiert.

## Nachgewiesene Rollen- und UI-Prüfungen

### Petra Marnau — Projektmanager

Status: **PASS für Delegation**

Nachgewiesen:

- Profilname wird im Dashboard korrekt als `Petra Marnau` angezeigt.
- AVKK Management ist verfügbar.
- AVKK-Aufgabenscope zeigt nur Projekte und Arbeitspakete: 7 Projekte + 11 Arbeitspakete = 18 AVKK-Aufgaben; die 12 Tätigkeiten werden nicht als AVKK-Aufgaben gezählt.
- Lange AVKK-Aufgabentitel bleiben in der ersten Tabellenspalte und überlagern `Projekt / Kontext` nicht.
- Projekt `Cloud Identity 2026` geöffnet.
- Neue Verantwortung `Sam Marnau — Verantwortlicher — Ergebnis` erfolgreich angelegt.
- Nach Hard Reload blieb die Zuordnung erhalten.
- Das Formular `Weitere Verantwortung hinzufügen` wurde nach erfolgreichem Speichern zurückgesetzt.

### Georg Marnau — Teamleiter

Status: **PASS für Delegation und Managementsicht**

Nachgewiesen:

- Management-Cockpit vorhanden.
- Keine personenbezogene Rangliste oder automatisierte Leistungsbewertung.
- Delegation im AVKK-Detail möglich.
- Exakter aktiver Duplikatfall `Sam Marnau — Stellvertreter — Koordination` wird erkannt.
- Warnung `Diese Verantwortung ist bereits aktiv zugeordnet.` erscheint.
- Speichern ist für den exakten aktiven Duplikatfall deaktiviert.
- Nach Bereinigung des historischen Testduplikats blieb exakt eine aktive Zuordnung bestehen.

### Administrator / System-Administrator — Bernd Marnau

Status: **TEILWEISE PASS; Restprüfung verschoben**

Nachgewiesen:

- Anmeldung als `System-Administrator`.
- Servicemenü mit administrativen Funktionen verfügbar.
- `Benutzer & Profile` und Reiter `Benutzerverwaltung` verfügbar.
- Benutzer und Rollen sichtbar.
- Rollenänderung funktional geprüft mit Alexa Marnau: `Viewer -> Kunde -> Viewer`.
- Ausgangszustand des Testkontos wurde wiederhergestellt.

Noch offen:

- visueller Systemstatus-Retest nach Security-Fix #30 und Systemstatus-Erweiterung #33,
- Backup / Downloadbereich / Log Viewer,
- Technischer Prüfbericht,
- weitere manuelle Administrator-Sichtprüfungen.

## Security-Befund Systemstatus / Repository-URL

Beim manuellen Systemstatus wurde statt der kanonischen öffentlichen Repository-URL eine interne Hosting-Git-Remote angezeigt. Da `/api/status` bewusst öffentlich ist und Build-Metadaten im Browser ausgeliefert werden, wurde dies als Security-Befund behandelt.

Erwartete kanonische Repository-URL:

`https://github.com/bmarnau/sysingdashboard`

Technische Behebung:

- PR #30 `Security: öffentliche Repository-Metadaten von internen Git-Remotes trennen`
- interner Git-Remote wird nicht mehr in `__BUILD_INFO__` eingebettet,
- `/api/status` liefert ausschließlich die kanonische öffentliche Repository-URL,
- UI-/Commit-Links interpretieren keine beliebigen Runtime-Remotes mehr,
- Regressionstest gegen credential-haltige Runtime-Remote,
- statischer Security-Guard gegen Wiedereinführung.

Automatische Abnahme PR #30:

- Security: PASS
- CI: PASS
- Static / TypeScript / RBAC / Docs: PASS
- Unit & Components: PASS
- Backend inklusive Leak-Regression: PASS
- API: PASS
- RBAC & Security: PASS
- Import / Export: PASS
- Backup / Restore: PASS
- Production Build: PASS
- Playwright E2E: PASS
- Accessibility: PASS
- Technical Debt: PASS
- Technical Report & Quality Gate: PASS

Manueller Runtime-Retest nach Merge bleibt verschoben.

## Systemstatus / Supabase-Backendnachweis — PR #33

Nach dem Security-Fix #30 wurde der Systemstatus technisch vervollständigt, ohne
den öffentlichen `/api/status` um sensible Backenddetails zu erweitern.

Technische Umsetzung:

- PR #33 `Fix/F-11: Systemstatus mit sicherem Supabase-Backendnachweis`,
- Merge-Commit `77d0f535e08ea637d6e1ca9c9d248ca006c1b395`,
- Supabase wird als aktuelle MVP-Datenplattform ausgewiesen,
- Auth-Konfigurationsstatus wird secret-frei dargestellt,
- echter Backendnachweis läuft ausschließlich hinter gültiger Anmeldung und
  serverseitigem `users.manage`,
- Teamleiter mit `systemstatus.view`, aber ohne `users.manage`, lösen keinen
  Admin-Backendstatuscall aus,
- Rückgabe des geschützten Status enthält nur Provider und Verbindungsstatus —
  keine Benutzerliste, URL, Projektkennung, Keys, Tokens oder Rohmetadaten,
- fehlender Git-Commit in einer Hosting-Runtime wird neutral als
  `vom Hosting nicht bereitgestellt` gekennzeichnet.

Automatische Abnahme PR #33 auf Head
`b63c4eacbb327c462a3b6a9b0c019e6702deb76b`:

- Security Workflow #305: PASS,
- CI #315: PASS,
- Static / Prettier / ESLint / TypeScript / RBAC / Docs / Manifest: PASS,
- Unit & Components: PASS,
- Backend: PASS,
- API: PASS,
- RBAC & Security: PASS,
- Import / Export: PASS,
- Backup / Restore: PASS,
- Production Build: PASS,
- Playwright E2E: PASS,
- Accessibility: PASS,
- Technical Debt: PASS,
- Technical Report & Quality Gate: PASS.

GitHub `main` wurde nach Merge exakt auf `77d0f535e08ea637d6e1ca9c9d248ca006c1b395`
verifiziert. Lovable hat denselben Merge-Commit als `completed` verarbeitet. Der
Lovable-Projektstatus bestätigt außerdem ein aktiviertes Datenbank-Backend mit
Stack `supabase`.

Diese Nachweise belegen Code, Gates und GitHub→Lovable-Synchronisation. Sie
ersetzen **nicht** die noch ausstehende visuelle Browserabnahme des produktiven
Systemstatus.

## Namensdarstellung in der Benutzerverwaltung

Beim Administrator-Test wurden in der Benutzerliste einzelne gespeicherte Anzeigenamen mit fehlerhafter Vornamensschreibweise sichtbar, z. B. `petra Marnau`.

Technische Behebung:

- PR #31 `Fix: Namen in der Benutzerverwaltung konsistent darstellen`
- Anzeige nutzt dieselbe zentrale Profilnamensauflösung wie der Dashboard-Kopf,
- gespeicherte Profildaten werden nicht verändert,
- komplexe Nachnamensschreibweisen bleiben erhalten,
- vollständige CI und Security PASS.

Manueller visueller Retest ist verschoben.

## Role Preview — offener Driftbefund

Die bestehende Checkliste `docs/ROLE-ACCEPTANCE-09C.md` fordert einen manuellen `Role Preview`-Nachweis und beschrieb ihn bisher als reine Darstellungsumschaltung ohne Rechteerweiterung.

Die Prüfung des aktuellen `main` ergibt jedoch:

- kein Role-Preview-Einstieg im aktuellen Servicemenü,
- keine aktuelle Produktcode-Implementierung per Repository-Code-Suche,
- keine entsprechende Funktion in ADR-0007 oder ADR-0008,
- die Referenzen finden sich im Wesentlichen in Abnahme-, Hilfe- und Statusdokumentation.

Bewertung: **Dokumentations-/Produktdrift offen.**

Keine automatische Korrektur und keine neue Role-Preview-Funktion wird ohne fachliche Entscheidung ergänzt. Für den späteren Abschluss ist zu entscheiden, ob:

1. Role Preview wieder als sichere reine UI-Simulation implementiert werden soll, oder
2. der historische Abnahmepunkt aus F-11 entfernt bzw. als nicht mehr zutreffend dokumentiert wird.

Bis dahin bleibt dieser Punkt **OPEN** und darf nicht als PASS gewertet werden.

## Weitere offene manuelle Prüfungen

Die restlichen manuellen Prüfungen wurden auf Wunsch des Betreibers bewusst verschoben. Dazu gehören insbesondere:

- visueller Runtime-Sichttest des Systemstatus nach PR #30/#33,
- visueller Namens-Retest Benutzerverwaltung nach PR #31,
- Backup / Downloadbereich / Log Viewer,
- Technischer Prüfbericht,
- abschließende Administratorabnahme,
- Entscheidung und ggf. Nachweis zu Role Preview.

## Abgrenzung

Die Verschiebung manueller Sichtprüfungen ändert nichts an bereits bestandenen automatischen Sicherheitsgrenzen. F-11 bleibt jedoch formal **MANUAL VERIFICATION REQUIRED**, bis die offenen fachlichen Sichtprüfungen abgeschlossen und `docs/ROLE-ACCEPTANCE-09C.md` entsprechend finalisiert wurden.
