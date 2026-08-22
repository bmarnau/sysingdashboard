# Sysing Dashboard — MVP-/F-11-Rebaseline 2026-08-22

Stand: 22.08.2026  
Status: **MVP Hardening / finale manuelle Verifikation noch offen**  
Autoritative Codebasis beim Start dieses Rebaseline: `main` auf `33faa39a7be0e98fa9ec7de6ea406825f91da311`

## 1. Zweck

Dieses Dokument bringt die technische und fachliche Abnahme auf den Stand vom
22.08.2026. Es ersetzt keine historischen Handoffs, sondern korrigiert Aussagen,
die durch die fortgesetzte F-11-Abnahme und die anschliessenden Hardening-Fixes
ueberholt wurden.

Verbindliche Grundregel bleibt: Ein MVP-/F-11-Abschluss wird **nicht** aus
Einzeltests abgeleitet. Er setzt automatisierte Gates, dokumentierte
Rollen-/Sicherheitsgrenzen und die noch ausstehenden manuellen Endpruefungen
voraus.

## 2. Aktueller fachlicher AVKK-Stand

AVKK steht fuer:

- **A — Aufgabe**: Was ist zu tun, bis wann und woran ist die Erfuellung
  erkennbar?
- **V — Verantwortung**: Die persoenliche Verantwortungsuebernahme wird durch
  eine Zuordnung sichtbar gemacht. Das System misst kein Gefuehl und bewertet
  keine Person.
- **K — Kompetenz**: Sind Fachwissen, Erfahrung, Zeit, Material, Werkzeuge,
  Budget, Berechtigung und Unterstuetzung vorhanden, um die uebernommene
  Verantwortung erfuellen zu koennen?
- **K — Konsequenz**: Welche negativen Folgen entstehen bei Nichterfuellung —
  fuer andere Mitwirkende, fuer den Kunden und fuer mich selbst?

### MVP-Aufgabenscope

Delegierbare AVKK-Aufgaben sind ausschliesslich:

1. Projekte
2. Arbeitspakete

Taetigkeiten sind operative Arbeits- und Leistungsnachweise. Sie koennen je nach
Rolle bearbeitet werden, sind aber keine delegierbaren AVKK-Aufgaben. `measure`
ist ein Zukunftsthema und gehoert nicht stillschweigend in den MVP-Scope.

Der Scope wurde in der produktiven Rollenabnahme visuell bestaetigt: Bei Petra
Marnau wurden 7 Projekte + 11 Arbeitspakete = 18 AVKK-Aufgaben angezeigt; 12
Taetigkeiten wurden nicht mehr mitgezaehlt.

## 3. F-11 Mehrbenutzer-Abnahme — nachgewiesener Stand

### Systemingenieur — Alex Marnau

Nachgewiesen:

- eigener AVKK-Arbeitsbereich
- Kompetenzpflege und Persistenz im eigenen Scope
- persoenlicher Bericht
- keine Managementsicht
- keine Verantwortungszuordnung
- rollenfremde Schreibversuche werden abgewiesen

Status: **PASS fuer die bereits ausgefuehrten F-11-Schritte**.

### Systemingenieur — Sam Marnau

Nachgewiesen:

- eigener AVKK-Arbeitsbereich
- Lesbarkeit zulaessiger fremder Sachverhalte
- keine rollenfremde AVKK-Schreibberechtigung
- technische Personen-ID wird nicht mehr statt eines Namens angezeigt

Status: **PASS fuer die bereits ausgefuehrten F-11-Schritte**.

### Projektmanager — Petra Marnau

Nachgewiesen:

- Profil-/Kopfbereich zeigt `Petra Marnau` konsistent
- AVKK Management verfuegbar
- MVP-Aufgabenscope Projekt + Arbeitspaket visuell bestaetigt
- neue Erklaerungen zu Verantwortung und Konsequenz sichtbar
- lange AVKK-Aufgabentitel ueberlagern keine Nachbarspalten
- neue Verantwortung auf Projekt `Cloud Identity 2026` angelegt:
  `Sam Marnau — Verantwortlicher — Ergebnis`
- Speicherung und Persistenz nach Neuladen bestaetigt

Status: **PASS fuer Delegation und die ausgefuehrten Projektmanager-Schritte**.

### Teamleiter — Georg Marnau

Nachgewiesen:

- AVKK Management / Fuehrungssicht
- Verantwortungszuordnung
- exakter aktiver Duplikatfall wird erkannt und Speichern deaktiviert
- gueltige neue Delegation und Persistenz wurden geprueft
- keine personenbezogene Rangliste oder automatisierte Leistungsbewertung

Status: **PASS fuer die ausgefuehrten Teamleiter-Schritte**.

### Viewer

Nachgewiesen:

- lesende Rolle
- keine unzulaessigen Fach- oder AVKK-Schreibaktionen
- keine Management-/Benutzerverwaltungsrechte

Status: **PASS fuer die ausgefuehrten Negativtests**.

### System-Administrator — Bernd Marnau

Nachgewiesen:

- Anmeldung als System-Administrator
- Service-/Administrationsmenue
- `Benutzer & Profile` / Benutzerverwaltung
- sechs Benutzer und Rollenzuordnungen sichtbar
- Rollen-Dropdown mit den vorgesehenen Rollen
- reale Rollenaenderung eines Testkontos `Viewer -> Kunde -> Viewer`
  erfolgreich; Ausgangszustand wiederhergestellt

Noch nicht final manuell nachgeprueft:

- Systemstatus nach Security-Fix PR #30
- Benutzerliste nach Namensnormalisierung PR #31
- Backup-/Download-/Log-Viewer-/Technischer-Pruefbericht-Dialoge als finaler
  Administrator-Sichttest

Status: **PARTIAL PASS — finaler manueller Administratorabschluss bewusst
verschoben**.

## 4. Role Preview — Korrektur eines historischen Abnahmepunkts

Die bisherige Abnahmedokumentation nennt teilweise einen `Role Preview` und
verweist dafuer auf `src/__tests__/lib/rbac/access.test.ts`.

Die aktuelle Code- und Testpruefung zeigt:

- Es gibt im aktuellen Service-/Benutzermenue keinen Role-Preview-Einstieg.
- `access.test.ts` prueft Scope-/Access-Entscheidungen, aber keinen Role Preview.
- Der alte `onProfileSwitch`-Parameter im User-Dialog ist nur aus
  API-Kompatibilitaetsgruenden vorhanden und hat mit echter Authentifizierung
  keine Wirkung.
- Die wirksame Rolle stammt aus der Supabase-Session bzw. `public.user_roles`.

Damit ist `Role Preview` **keine aktuelle MVP-Produktfunktion und kein noch zu
implementierendes F-11-Feature**. Rollen werden mit realen Testkonten bzw. realen,
auditierten Rollenzuweisungen geprueft. Eine simulierte Browser-Rolle darf die
server-/datenbankseitige Berechtigung gerade nicht veraendern.

Historische Dokumente, die Role Preview als PASS oder als automatisierten
Testnachweis auffuehren, sind an diesem Punkt ueberholt und duerfen nicht als
aktueller Freigabenachweis verwendet werden.

## 5. Security-Hardening vom 22.08.2026

### Repository-Metadaten im Systemstatus

Im Systemstatus wurde statt der kanonischen oeffentlichen GitHub-Adresse eine
interne Hosting-Git-Remote dargestellt. Die Analyse zeigte zwei
Expositionspfade:

1. `/api/status` uebernahm eine Runtime-Repository-Variable.
2. Der Vite-Build las `remote.origin.url` und uebernahm den Wert in
   browserseitige Build-Metadaten.

Da `/api/status` bewusst oeffentlich ist und Hosting-Remotes Zugangsinformationen
enthalten koennen, wurde der Befund als Security-Fehler behandelt.

PR #30 hat beide Pfade geschlossen:

- Repository-Metadaten sind auf die kanonische oeffentliche Projektadresse
  `https://github.com/bmarnau/sysingdashboard` begrenzt.
- Der Browser-Build liest keine Git-Remote mehr aus.
- Ein Regressionstest simuliert eine credential-haltige Runtime-Remote und
  prueft, dass sie nicht im Status auftaucht.
- Ein statischer Guard verhindert die Wiedereinfuehrung von
  `remote.origin.url` in Browser-Build-Metadaten.

Automatische Nachweise fuer den getesteten PR-Head:

- Security: PASS
- Static / TypeScript / RBAC / Docs: PASS
- Unit & Components: PASS
- Backend inkl. Leak-Regression: PASS
- API: PASS
- Production Build: PASS
- Playwright: PASS
- Technical Report & Quality Gate: PASS

GitHub-Merge und Lovable-Synchronisation wurden verifiziert. Der sichtbare
Systemstatus-Retest wird mit den uebrigen manuellen Browserpruefungen gebuendelt.

## 6. Weitere Hardening-Fixes des aktuellen Stands

Neben dem Security-Fix sind insbesondere folgende Korrekturen integriert:

- AVKK-Personenverzeichnis mit minimalen Daten statt Freigabe kompletter Profile
- MVP-Aufgabenscope Projekt + Arbeitspaket
- Duplikatschutz fuer identische aktive Verantwortungszuordnungen
- Fachliche AVKK-Erklaerungen in App, kontextsensitiver Hilfe und Handbuch
- Profilnamens-Normalisierung
- AVKK-Managementtabellen ohne Spaltenueberlauf
- Benutzerverwaltung verwendet dieselbe zentrale Namensnormalisierung wie der
  Dashboard-Kopf

Die jeweiligen Aenderungs-PRs wurden vor Merge durch CI und Security geprueft.

## 7. Supabase, Daten und Backup — aktuelle Grenze

Supabase ist die fuehrende MVP-Plattform fuer:

- Authentifizierung
- Profile und Rollen
- globale Einstellungen
- Audit
- Reference Data
- AVKK-Fuehrungsdaten

Projekte, Arbeitspakete und Taetigkeiten werden im aktuellen MVP weiterhin
browser-/local-first gefuehrt.

Backupformat 2.0 sichert den lokalen Bestand sowie AVKK-/Reference-Data-Snapshots.
Der Browser-Restore validiert AVKK vollstaendig, schreibt diese Daten aber
bewusst **nicht** in Supabase zurueck. Ein Datenbank-Restore ist Aufgabe der
Datenbank-/Provider-Ebene und darf nicht als transaktionaler Browser-Restore
vorgetaeuscht werden (ADR-0026).

## 8. Docker- und Azure-/Entra-Readiness

### Docker

Verbindliches Ziel ist ein spaeterer autonomer Containerbetrieb ohne
unersetzbare Lovable-Cloud-Abhaengigkeit.

Heute nachgewiesen:

- fachliche und providerspezifische Schichten sind getrennt
- Server-Services sind weitgehend framework-freie ESM-Module
- Konfiguration erfolgt ueber Environment-Variablen
- GitHub ist Code- und Dokumentationsquelle

Noch nicht nachgewiesen:

- Dockerfile / Container-Image
- reproduzierbarer Container-Build
- Reverse Proxy / TLS-Betrieb
- Health-/Start-/Stop-Smoke im Container

Bewertung: **Readiness vorhanden, Containerbetrieb noch nicht abgenommen**.

### Azure / Entra

Azure SQL, Azure Table Storage und Entra ID sind nicht Laufzeitprovider des MVP.
Die Architektur soll den spaeteren Providerwechsel ermoeglichen. Vorhandene
Provider-Separation und serverseitige Integrationsgrenzen sind ein
Readiness-Nachweis, aber kein Live-Azure-/Entra-Funktionstest.

## 9. Technischer Pruefbericht — aktueller Nachweisdrift

Der in der App gebundene `test-report/technical-test-report.json` ist noch ein
historischer Stand vom 13.08.2026 und nennt Dashboard 1.58.1. CI erzeugt zwar bei
jedem PR einen frischen technischen Bericht als Artefakt, dieser wird aber nicht
automatisch in den gebundenen Repository-Bericht uebernommen.

Folgerung:

- Ein gruener CI-Quality-Gate ist ein gueltiger Nachweis fuer den geprueften
  PR-Head.
- Der in der App angezeigte technische Bericht ist **bis zur erneuten
  Generierung und Bindung nicht der aktuelle Freigabenachweis**.
- Vor dem finalen MVP-Abschluss muss der Bericht aus den aktualisierten
  Evidenzquellen neu erzeugt, Integritaet geprueft und als aktueller Stand
  gebunden werden.

## 10. Manuell verschobene Restpruefungen

Die folgenden Schritte werden bewusst gebuendelt spaeter durchgefuehrt und sind
bis dahin **nicht PASS**:

1. Systemstatus nach PR #30: ausschliesslich kanonische GitHub-URL, keine interne
   Remote.
2. Benutzerverwaltung nach PR #31: konsistente Schreibweise `Vorname Nachname`.
3. Administrator-Sichttests fuer Backup, Downloads, Log Viewer und technischen
   Pruefbericht.
4. Finaler Abgleich der sichtbaren technischen Berichtsversion mit dem neu
   erzeugten Repository-Bericht.

## 11. Freigabestatus

Aktueller Status: **GO FOR CONTINUED MVP HARDENING — MANUAL FINAL VERIFICATION
REQUIRED**.

Nicht zulaessig sind derzeit die Aussagen:

- `F-11 vollstaendig abgeschlossen`
- `MVP 100 %`
- `FINAL READY`

Erst nach Aktualisierung des technischen Berichts und den in Abschnitt 10
aufgefuehrten manuellen Restpruefungen kann der formale MVP-Abschluss bewertet
werden.
