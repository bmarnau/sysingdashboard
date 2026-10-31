# Sysing Dashboard — Project Governance

Stand: 2026-08-08 · Gültig ab Version 1.49.0 · Verbindlich für alle Beitragenden
(Mensch und KI-Agent).

Dieses Dokument ist die **oberste Regelquelle** des Projekts. Es beschreibt, wie
entwickelt, geprüft, dokumentiert und freigegeben wird. Bei Widerspruch gilt:
Governance > ADR > Architektur > Handbuch > Kommentar im Code.

---

## 1. Vision

Das Sysing Dashboard führt Tätigkeiten, Arbeitspakete, Projekte, Zeiten,
Verantwortlichkeiten und Berichte in einer zentralen, verlässlichen und sicher
betreibbaren Anwendung zusammen.

Zielbild:

- persönliches Arbeitsdashboard mit belastbaren Auswertungen,
- mehrbenutzerfähig über RBAC und RLS,
- autonom betreibbar (Docker) ohne unersetzbare Laufzeitabhängigkeit zu einer
  einzelnen Plattform,
- erweiterbar um AVKK-Fachlogik, Reference Data, Reports, Microsoft 365 und
  KI-Agenten — jeweils als klar abgegrenzte Ausbaustufe.

Die maßgebliche, maschinenlesbare Fassung von Vision, Roadmap und Status ist
[`docs/PROJECT-STATUS.yaml`](./PROJECT-STATUS.yaml). Die MVP-Zieldefinition,
Abnahmestrategie und aktuelle Planungslogik sind in
[`docs/MVP-PLAN.md`](./MVP-PLAN.md) festgelegt.

---

## 2. Entwicklungsprinzipien

1. **Analyse vor Umsetzung.** Kein Sprint ohne benannten Ist-Zustand mit Beleg
   (Dateizeile, Testausgabe, Reportbefund). Vermutungen werden als Vermutung
   gekennzeichnet.
2. **Kleiner Schnitt.** Ein Sprint hat ein Thema. Refactoring und Fachlogik
   werden nicht vermischt.
3. **Verhalten unverändert bei Refactoring.** Strukturänderungen sind nur dann
   abgeschlossen, wenn die bestehenden Tests unverändert grün sind.
4. **Rückwärtskompatibilität ist Vertrag.** Formate (Backup, Export, Manifest)
   werden versioniert, nie stillschweigend gebrochen.
5. **Kein toter Code.** Nicht genutzte Module werden entfernt oder als bewusst
   archiviert gekennzeichnet (`archive/`).
6. **Nachweis statt Erfolgsmeldung.** Jede Abschlussmeldung nennt Zahlen:
   Testanzahl, Findings vorher/nachher, Version, Reportstand.
7. **MVP-Fortschritt sichtbar halten.** Nach jedem Sprint-Prompt wird zusätzlich
   ein kompakter Status zu Reifegrad, Weg zum MVP, offenen Themen, Risiken und
   geschätzter Zahl verbleibender Prompts erstellt.

---

## 3. Architekturprinzipien

| ID                    | Regel                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `source-of-truth`     | GitHub ist die maßgebliche Quelle für Code, Dokumentation und Versionsstand.                                |
| `supabase-mvp`        | Supabase ist die führende Daten- und Authentifizierungsplattform des MVP.                                   |
| `provider-separation` | Fachlogik, Authentifizierung, Datenzugriff und providerspezifische Implementierungen sind getrennt.         |
| `portable-runtime`    | Keine unersetzbare Laufzeitabhängigkeit zu einer einzelnen Hostingplattform.                                |
| `container-ready`     | Die Anwendung muss langfristig als Docker-Container autonom betreibbar sein.                                |
| `security-by-design`  | Änderungen sind sicher, testbar, dokumentiert sowie RBAC- und RLS-konform.                                  |
| `no-secrets`          | Keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys in Code, Prompts oder Dokumentation. |
| `layered-access`      | UI greift nie direkt auf Persistenz- oder Providerinterna zu (siehe Abschnitt 4).                           |

---

## 4. Trennung Fachlogik / Infrastruktur

Verbindliches Schichtenmodell (Details und Diagramm:
[`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)):

```text
Präsentation      src/routes, src/components
Facade/Hooks      src/hooks, src/lib/store/useDashboardStore
Fachlogik         src/lib/*-service.ts, src/lib/backup/, src/lib/rbac/
Infrastruktur     src/lib/store/dashboard-persistence.ts, src/integrations/supabase/, src/lib/azure/
```

Harte Regeln:

- `src/routes` und `src/components` importieren nicht direkt die Persistenzschicht.
- Fachlogik kennt keine React-Imports.
- Infrastruktur kennt keine Fachbegriffe der UI.
- Provider-spezifische Details bleiben außerhalb der Fachlogik.

---

## 5. Ablauf: Analyse → Umsetzung → Test → Dokumentation

1. **Analyse** — Ist-Zustand belegen, Zielbild formulieren, Nicht-Ziele benennen,
   Risiken benennen. Ergebnis: Sprintplan.
2. **Umsetzung** — kleinstmöglicher Schnitt, Verhalten erhalten, keine
   Sammeländerungen ohne Bezug zum Sprintziel.
3. **Test** — neue Regeln bekommen einen Test. Bestehende Suiten müssen grün
   bleiben. Manuelle Verifikation wird schriftlich dokumentiert.
4. **Dokumentation** — CHANGELOG, Handbuch, Entwicklungstagebuch,
   `PROJECT-STATUS.yaml`, bei Entscheidungen zusätzlich ein ADR.
5. **MVP-Status** — Reifegrad und verbleibender Weg zum MVP werden nach jedem
   Sprintabschluss neu eingeschätzt und kompakt berichtet.

Kein Schritt darf übersprungen werden. Dokumentation ist Teil der Umsetzung,
nicht Nacharbeit.

---

## 6. Definition of Done

Ein Sprint gilt erst als abgeschlossen, wenn alle Punkte erfüllt und belegt sind:

- [ ] Akzeptanzkriterien des Sprints erfüllt
- [ ] `bun run test` grün (Anzahl im Abschlussbericht genannt)
- [ ] `bun run typecheck` grün
- [ ] `bun run lint` und `bun run lint:no-console` grün
- [ ] Build grün
- [ ] `bun run docs:check` ohne unbegründete Warnung
- [ ] `bun run project-status:check` grün
- [ ] `CHANGELOG.md` mit neuer Version ergänzt
- [ ] Handbuch aktualisiert, sofern betroffen
- [ ] `docs/ENTWICKLUNGSTAGEBUCH.md` fortgeschrieben
- [ ] `docs/PROJECT-STATUS.yaml` aktualisiert und validiert
- [ ] Technischer Prüfbericht neu erzeugt
- [ ] Go-/No-Go für den Folgesprint schriftlich dokumentiert
- [ ] Kompakter MVP-Statusbericht gemäß Abschnitt 11b erstellt

---

## 7. Dokumentationsstrategie

- **Eine Quelle je Aussage.** Versionsstand steht ausschließlich in
  `CHANGELOG.md`; Projekt- und Roadmapstand steht in `PROJECT-STATUS.yaml`.
- **Doku-Sync-Pflicht.** Neue oder geänderte Funktionen werden dokumentiert.
- **Entscheidungen gehören in ein ADR**, nicht in Codekommentare.
- **Dokumentation beschreibt den Ist-Zustand.** Geplantes wird ausdrücklich als
  „geplant" markiert.
- **MVP-Planung** wird in `docs/MVP-PLAN.md` geführt und bei wesentlichen
  Roadmap- oder Abnahmeänderungen aktualisiert.

---

## 8. Qualitätsregeln

| Regel                                 | Prüfung                        |
| ------------------------------------- | ------------------------------ |
| Kein `console.*` in Produktivcode     | `bun run lint:no-console`      |
| Typen vollständig                     | `bun run typecheck`            |
| Keine Layer-Verletzungen              | Tech-Debt-/Architekturprüfung  |
| RBAC-Matrix Frontend = Backend        | `bun run rbac:check`           |
| Dokumentation synchron                | `bun run docs:check`           |
| Projektmanifest gültig                | `bun run project-status:check` |
| Endpunkte inventarisiert und getestet | `bun run api:gate`             |

Findings werden nicht stillschweigend ignoriert. Ein akzeptiertes Finding
braucht Begründung, Ticket und Verfallsdatum.

---

### 8.1 AQGS-TCA-01 — kontinuierlicher Testziel-Abgleich

**Verbindliche Regel:** Der erforderliche Testbestand wird fortlaufend gegen
die fachlichen Ziele, Sicherheitsgrenzen und Abnahmekriterien des jeweils
bearbeiteten Arbeitspakets abgeglichen. Testmenge ist kein Selbstzweck:
Jeder erforderliche Test braucht einen nachvollziehbaren Schutzzweck; jede
Lücke, Doppelung oder Aussonderung braucht eine dokumentierte Entscheidung.

Der Abgleich ist mindestens auszulösen:

1. bei Planung eines Arbeitspakets und bei jeder Änderung seiner Ziele oder
   Risiken,
2. vor der fachlichen Abnahme eines Arbeitspakets beziehungsweise vor einem
   Release Candidate,
3. bei auffälliger Testlaufzeit, instabilen Tests oder wiederholter
   Toolchain-Blockade,
4. bei Änderung einer Schnittstelle, Sicherheitsgrenze, Datenquelle oder eines
   Abnahmekriteriums.

Das Arbeitspaket oder sein Abnahmebericht enthält mindestens eine kompakte
Testziel-Matrix mit `Ziel/Risiko`, `Testebene`, `konkreter Test oder Gate`,
`Evidenz` und `Entscheidung`. Zulässige Entscheidungen sind ausschließlich
`BEIBEHALTEN`, `ERGÄNZEN`, `KONSOLIDIEREN`, `AUSSONDERN` oder `BLOCKED`.

- `KONSOLIDIEREN` ist nur zulässig, wenn derselbe Fehlerfall weiterhin durch
  mindestens einen gleichwertigen, reproduzierbaren Test oder ein Gate
  abgedeckt bleibt.
- `AUSSONDERN` verlangt den Nachweis, dass kein aktuelles Ziel, keine
  Sicherheitsgrenze und kein Abnahmekriterium mehr davon abhängt; die
  Ersatzabdeckung oder bewusste Nichtabdeckung ist zu benennen.
- Sicherheits-, RBAC/RLS-, Datenintegritäts-, Providergrenzen- und
  Golden-Regressionen dürfen nicht allein zur Laufzeitverkürzung entfernt
  oder herabgestuft werden.
- Tests werden in schnelle, änderungsnahe Vertrags-/Modultests und
  vollständige Release-/System-Gates gegliedert. Ein schneller PR-Pfad
  ersetzt nicht die vorgeschriebenen Exact-Head-Gates.
- Nicht ausführbare Tests oder Gates werden mit Ursache und Wiederherstellungs-
  schritt als `BLOCKED` berichtet; fehlende Evidenz ist niemals `PASS`.

Der technische Prüfbericht und der Abschlussbericht nennen das Ergebnis des
Abgleichs sowie verbliebene `BLOCKED`- oder Aussonderungsentscheidungen.
Diese Regel konkretisiert ADR-0036 und gilt für Menschen und KI-Agenten.

### 8.2 AQGS-ENV-01 — OneDrive-Arbeitsbasis und lokale Toolchain-Umgebung

**Verbindliche Regel:** Git-Arbeitscheckouts, Quellcode und prüfbare
Dokumentation dürfen in OneDrive liegen. Abhängigkeitsschwere oder
dateisystemintensive Toolchain-Arbeit (insbesondere `node_modules`,
Paketinstallationen, Bundler-Caches, Browser-Binaries und vollständige
Testläufe) wird in einem lokalen, nicht synchronisierten Arbeitsverzeichnis
unter `C:\tmp` ausgeführt.

- `C:\tmp` ist nur eine reproduzierbare Ausführungsumgebung, nie eine
  Source-of-Truth: Änderungen werden ausschließlich aus dem Git-Checkout
  übernommen und bleiben dort nachvollziehbar.
- Vor einem Gate-Lauf wird der verwendete Commit-SHA zwischen Checkout und
  temporärer Umgebung verglichen. Abweichungen machen die Evidenz ungültig.
- `node_modules` und andere abgeleitete Verzeichnisse dürfen nicht als
  OneDrive-Platzhalter oder Reparse-Verzeichnisse als grüne Toolchain-Evidenz
  gewertet werden. Fehlende Binaries oder unvollständige Paketdateien sind
  `BLOCKED`.
- Die temporäre Umgebung enthält keine Secrets und wird nach Abschluss oder
  bei Vertrauensverlust verworfen und aus dem Checkout erneut hergestellt.
- CI und Exact-Head-Gates bleiben maßgeblich; eine lokale `C:\tmp`-Prüfung
  ersetzt weder einen signierten Kandidaten noch GitHub-CI/Security.
- Ein WSL-Fallback nach ADR-0038 beginnt nur nach einem erfolgreichen
  nichtinteraktiven Preflight (`wsl --status` sowie `wsl -d Ubuntu -- bash -lc
  'true'`). Ein ungültiger Benutzer- oder WSL-Host-Konfigurationswert ist ein
  Infrastrukturblocker und keine fehlgeschlagene Produktprüfung.
- Muss ein WSL-Fallback erst Werkzeuge installieren, prüft er zusätzlich
  `sudo -n true` und die benötigten Basiswerkzeuge. Erfordert Ubuntu eine
  interaktive Berechtigung, wird der konkrete Bootstrap-Befehl an den Benutzer
  übergeben; Zugangsdaten werden weder abgefragt noch verarbeitet.
- Das projektversionierte Toolchain-Image gemäß ADR-0039 ist der kanonische
  lokale Golden-Gate-Fallback. Sein Entrypoint prüft Git-HEAD, Worktree-
  Zustand, Bun- und Node-Versionen und installiert ausschließlich mit
  `bun install --frozen-lockfile`. Vor jedem Lauf bestätigt `docker version`
  auf dem Host den erreichbaren Client und Server. Für Windows-Mounts darf der
  Entrypoint ausschließlich den explizit eingebundenen Workspace als
  `safe.directory` markieren. Alle anwendbaren lokalen P1-Gates laufen im
  Image; native Host-Läufe sind Diagnose, keine Golden-Gate-Evidenz. Ein
  fehlender Docker-Daemon ist `BLOCKED`; ein lokaler Container-PASS ersetzt
  weder Signatur noch Exact-Head-CI/Security.

Diese Regel konkretisiert ADR-0037 und gilt für Menschen und KI-Agenten.

#### Verbindlicher Containerablauf fuer Golden-Gate-Evidenz

Jede KI und jede Person verwendet fuer lokale P1-Gates diesen Ablauf:

1. Im massgeblichen Checkout `docker version` ausfuehren. Nur ein
   ausgegebener Client **und** Server erlauben den naechsten Schritt; sonst
   `BLOCKED` mit der konkreten Docker-Ursache melden.
2. Nach Aenderungen an `.devcontainer/Dockerfile` das Image bauen:
   `docker build -t sysingdashboard-golden-gate:local -f .devcontainer/Dockerfile .`.
   Ohne Dockerfile-Aenderung darf das vorhandene, dokumentierte Image genutzt
   werden.
3. Den Entrypoint im Image regressiv pruefen:
   `docker run --rm -v "${PWD}:/workspace" -w /workspace sysingdashboard-golden-gate:local bash scripts/golden-gate/test-run-p1-toolchain-gates.sh`.
4. Nur mit sauberem Git-Worktree den vollstaendigen P1-Gate-Lauf starten:
   `docker run --rm -v "${PWD}:/workspace" -w /workspace sysingdashboard-golden-gate:local bash scripts/golden-gate/run-p1-toolchain-gates.sh`.
   Ein Dirty Worktree ist absichtlich `BLOCKED`, niemals ein Grund den
   Entrypoint abzuschwaechen.
   Vor dem signierten Kandidaten darf fuer eine vollstaendige Vorabpruefung
   unter `C:\tmp` ein lokaler, ungepushter Clean-Candidate-Snapshot entstehen.
   Seine Dateien muessen den zu pruefenden Aenderungen entsprechen und sein
   Git-Tree wird protokolliert. Der spaetere signierte Exact Head muss den
   identischen Tree haben und die vollstaendigen Gates erneut bestehen; ein
   Snapshot ist niemals PR-, Merge- oder Release-Evidenz.
5. Der vollstaendige Lauf fuehrt im Image Prettier, Lint, Typecheck,
   Docs-Check, Project-Status-Check, Security-Check sowie die fokussierten
   P1-Quell- und Composer-Tests aus. Seine Abhaengigkeiten muessen vorher
   nach Regel 5a vorbereitet und verifiziert sein. Jeder Gate-Name und dessen
   Exit-Status ist Evidenz.
5a. Eine vollstaendige, netzwerkgestuetzte Paketinstallation ist **nicht**
   fuer jeden Kandidatenlauf erforderlich. Der Abhaengigkeitsvertrag ist
   `Image-Digest + Bun-Version + Linux-Plattform + SHA-256(bun.lock)`.
   Fuer jeden bisher nicht vorbereiteten Vertrag laeuft ein eigener,
   begrenzter `dependency-prepare`-Schritt mit
   `bun install --frozen-lockfile --network-concurrency 8`. Er speichert nur
   Bun-Paketcache, `node_modules` und ein Manifest dieses Vertrags in einem
   benannten Docker-Volume; weder Quellcode noch Secrets duerfen darin liegen.
   Die begrenzte Netzparallelitaet verhindert, dass die Bun-
   Standardparallelitaet von 48 Verbindungen den Docker- oder Proxy-Pfad
   ueberfaehrt.
5b. Vor jedem Golden-Gate-Lauf prueft der Entrypoint das Cache-Manifest gegen
   den Abhaengigkeitsvertrag. Bei Uebereinstimmung werden die vorhandenen
   Abhaengigkeiten ohne Netzinstallation genutzt. Bei fehlendem,
   beschaedigtem oder nicht passendem Manifest lautet das Ergebnis
   `BLOCKED/DEPENDENCY_PROVENANCE` mit Aktion `run-dependency-prepare`; der
   Gate-Lauf darf weder einen fremden Cache verwenden noch selbst stillschweigend
   ins Netz gehen. Eine Aenderung von `bun.lock`, Bun-Version, Plattform oder
   Image-Digest erfordert daher genau einen neuen Prepare-Lauf.
   Auf Windows startet jede KI und jede Person beide Schritte ausschliesslich
   ueber `scripts/golden-gate/invoke-p1-toolchain-gates.ps1`: zuerst
   `-Mode Prepare`, danach `-Mode Run`. Der Wrapper erstellt nur die aus dem
   Vertrag abgeleiteten, gelabelten Volumes und bindet sie fuer den jeweiligen
   Lauf ein; `-Mode Run` erstellt fehlende Volumes nicht, sondern bleibt
   `BLOCKED`.
6. Das Image enthaelt Ubuntu, Node 22, eine gepinnte Bun-Version, Git, Curl,
   CA-Zertifikate und Unzip sowie den nicht privilegierten Benutzer `vscode`.
   Es enthaelt weder Quellcode noch `node_modules`, Browser-Binaries,
   Supabase, Secrets oder Docker-Socket. Der Checkout wird nur zur Laufzeit
   eingebunden; der Entrypoint vertraut ausschliesslich diesem Mount als
   `safe.directory`.
7. Lokale Container-Evidenz wird mit Image-Tag/-Digest, Git-HEAD,
   Worktree-Zustand, Gate-Ausgabe und Datum im technischen Pruefbericht
   festgehalten. Sie ist notwendig, aber weder Signatur noch Exact-Head-CI
   oder Exact-Head-Security.
8. Ein Image-Update erfolgt nur als versionskontrollierte Aenderung von
   Dockerfile, Dev-Container-Definition oder Gate-Entrypoint. Danach muessen
   Image-Vertragstest, Entrypoint-Regressionstest und alle anwendbaren P1-
   Gates im neu gebauten Image erneut laufen. Jede neue Tool-Version, jeder
   geaenderte enthaltene Baustein und der neue Image-Digest werden im ADR und
   technischen Pruefbericht erfasst; ohne diese Evidenz bleibt das Update
   `BLOCKED`.
9. Gibt ein Gate innerhalb des vereinbarten Zeitlimits keine Fortschritts- oder
   Abschlussausgabe aus, lautet sein Ergebnis `BLOCKED/TIMEOUT`. Logs, aktives
   Gate, Zeitlimit und betroffener Container werden dokumentiert. Nur der von
   der pruefenden Person oder KI gestartete Container darf danach gezielt
   beendet werden; andere Projektcontainer bleiben unberuehrt. Nachfolgende
   Gates gelten dann als nicht ausgefuehrt.
10. Der Entrypoint meldet jeden Zustand sofort als einzelne, maschinenlesbare
    Zeile: `EVENT timestamp=<UTC> phase=<preflight|gate> status=<START|PASS|
    FAIL|BLOCKED|RETRY> class=<...> reason=<...> action=<...> attempt=<n>`.
    Diese Zeile wird ohne Zusammenfassung oder Ursachenforschung nach aussen
    kommuniziert. Sie nennt damit wann, wo, bei welchem Versuch und weshalb
    der Lauf fortgesetzt, wiederholt oder beendet wurde.
11. `bun install` darf nur mit der dokumentierten Parallelitaet laufen und
    wird bei einem Exit-Code hoechstens dreimal mit kurzer Wartezeit erneut
    versucht (`GG_INSTALL_ATTEMPTS=3`,
    `GG_INSTALL_RETRY_DELAY_SECONDS=5`). Nach dem letzten Versuch lautet der
    Status `BLOCKED` mit Klasse `DEPENDENCY_INSTALL` und Aktion
    `check-network-and-resources`. Es folgt kein automatischer
    Forschungs- oder Reparaturlauf; die weiteren Gates sind `NOT RUN`.
12. Vor einem Kandidatenlauf dokumentiert der Host-Preflight mindestens
   Docker Client/Server, die auf 20 Sekunden begrenzte Registry-Erreichbarkeit
   und den verfuegbaren Speicher. Scheitert einer dieser Punkte, wird der
   Lauf als `BLOCKED/INFRASTRUCTURE_NETWORK` oder
   `BLOCKED/INFRASTRUCTURE_RESOURCE` beendet, ohne den P1-Runner zu starten.
13. Lange Gates senden mindestens alle 30 Sekunden ein `EVENT` mit
    `status=HEARTBEAT`; der Intervallwert ist nur ueber
    `GG_HEARTBEAT_SECONDS` konfigurierbar. Eine KI oder Person kommuniziert
    diese Ereignisse fortlaufend. Wenn die aufrufende Umgebung Standard-Output
    puffert, liest sie Status und letzte Ereignisse read-only mit
    `docker inspect`, `docker logs --tail 30` und
    `docker stats --no-stream` des von ihr gestarteten Containers. CPU-,
    Netzwerk- oder I/O-Aktivitaet bedeutet `RUNNING`; ausbleibende Heartbeats
    und keine Aktivitaet innerhalb des vereinbarten Zeitlimits bedeuten
    `BLOCKED/TIMEOUT`.
14. `dependency-prepare` unterliegt denselben Event-, Heartbeat-, Retry- und
    Host-Preflight-Regeln wie ein Golden-Gate-Lauf. Sein Ergebnis ist nur
    wiederverwendbare Toolchain-Evidenz; es ersetzt weder die Tests des
    konkreten HEAD noch Signatur, Exact-Head-CI oder Exact-Head-Security.
15. Docker-/WSL-Speicher wird nur ueber
    `scripts/golden-gate/clean-docker-toolchain.ps1` gewartet. Der Standardmodus
    ist Inventur ohne Aenderung. Eine Bereinigung verlangt `-Apply` und den
    expliziten Token `CLEAN_GOLDEN_GATE_CACHE`; sie darf ausschliesslich
    gestoppte Container mit dem Label
    `org.sysingdashboard.golden-gate=true` sowie unreferenzierte Volumes mit
    dem Praefix `sysingdashboard-gg-` loeschen. Globale `docker system prune`,
    `docker volume prune`, nicht markierte Artefakte und BuildKit-Caches sind
    verboten. Die Routine berichtet den Docker-WSL-VHDX-Pfad und dessen Groesse,
    kompaktiert die VHDX aber nie automatisch: Das erfordert gestopptes Docker
    Desktop/WSL und kann andere Distributionen beeintraechtigen. Ein solcher
    manueller Wartungsschritt braucht eine gesonderte, dokumentierte Freigabe.
16. Shell-Vertragstests fuer Golden-Gate-Skripte laufen auf Windows verbindlich
    mit der installierten Git Bash und einem vom Test erzeugten temporaeren
    `HOME`. WSL darf fuer diese Tests weder implizit noch als automatischer
    Fallback verwendet werden: Ein fehlender WSL-Zugriff oder eine nicht
    aufloesbare Windows-Pfaduebergabe ist als
    `BLOCKED/INFRASTRUCTURE_SHELL` zu melden, nicht durch Wiederholungen mit
    wechselnden Shells zu kaschieren. Lokale Git-Signing-, Credential- und
    Ignore-Konfigurationen duerfen Test-Fixtures nicht beeinflussen.
17. Jeder Prepare-, Installations-, Cache- und Bereinigungspfad braucht einen
    automatisierten Negativtest. Dieser prueft mindestens den exakten
    Nichtnull-Exit-Code, die maschinenlesbare Fehlerklasse und dass keine
    nachgelagerte Aktion stattfindet. Insbesondere darf ein fehlgeschlagener
    `bun install` niemals als erfolgreicher Prepare-Lauf enden. Ein neu
    beobachteter Infrastrukturfehler wird zuerst als isolierter Vertragstest
    erfasst; erst dann darf die minimal erforderliche Korrektur erfolgen.
18. Wiederholungsregel: Nach einem reproduzierten Infrastrukturfehler wird
    derselbe Befehl hoechstens einmal in der im Standard vorgesehenen Umgebung
    erneut ausgefuehrt. Bleibt er blockiert, wird Ursache, Umgebung, Zeitpunkt
    und naechste Aktion als `BLOCKED` dokumentiert. Weitere Varianten oder
    Ursachenforschung brauchen einen neuen, dokumentierten Testfall oder eine
    ausdrueckliche Freigabe; sie duerfen nicht den Golden-Gate-Lauf verdecken.
19. GitHub-Authentifizierung fuer Golden-Gate-Synchronisation erfolgt nur
    interaktiv ueber `scripts/golden-gate/repair-github-auth.ps1`. Das Skript
    speichert oder protokolliert keine Tokens, prueft `gh auth status` im
    massgeblichen Checkout und fuehrt `git fetch origin --prune` erst nach
    erfolgreicher Verifikation aus. Ein Device-Code wird nur im Terminal
    angezeigt und nie in Dokumentation, Commits oder technische Berichte
    uebernommen.

## 9. Sicherheitsregeln

1. Keine Secrets in Code, Doku, Prompts, Logs oder Tests.
2. Serverseitige Endpunkte validieren jede Eingabe und vertrauen dem Browser nicht.
3. Frontend-RBAC ist Bedienkomfort, keine Sicherheitsgrenze. Durchsetzung erfolgt
   über RLS und serverseitige Prüfungen.
4. Jede neue Tabelle: RLS aktiviert, Policies definiert, Grants gesetzt.
5. Logs werden redigiert.
6. Sicherheitsbefunde der Stufe `critical` blockieren jedes Release.

---

## 10. Versionierungsstrategie

Semantische Versionierung `MAJOR.MINOR.PATCH` für das Dashboard. Jeder
Sprintabschluss erzeugt mindestens eine neue MINOR-Version. Backup-, Prüfbericht-
und Projektmanifest-Schemata werden unabhängig versioniert.

---

## 11. Sprint-Governance

**Startbedingungen**: vorheriger Sprint abgeschlossen und verifiziert;
CHANGELOG, Tagebuch, Prüfbericht und `PROJECT-STATUS.yaml` aktuell.

**Sprintstruktur**: Ziel → Teilaufgaben → Nicht-Bestandteil →
Abnahmekriterien → Abschlussbericht → MVP-Status.

**Abschlussbericht**: neue/geänderte Dokumente, Ergebnis je Teilaufgabe,
Testergebnisse mit Zahlen, Versionsnummer, Prüfbericht, verbleibende Risiken und
Go-/No-Go für den Folgesprint.

### 11a. Phasenmodell

Phase 1 „Technische Plattform" ist mit v1.50.0 abgeschlossen. Phase 2 entwickelt
AVKK, Reference Data, operative Arbeitsansicht, Kontextindikatoren,
Management-Cockpit und Reporting bis zur MVP-Abnahme. Microsoft Graph, Entra ID
und Azure-Datenplattformen sind nicht Bestandteil des MVP.

### 11b. Verbindlicher MVP-Status nach jedem Sprint-Prompt

Nach jedem Sprintabschluss ist folgender kompakter Managementstatus Pflicht:

```text
Projektphase:
Aktueller Reifegrad: <Schätzung in %>
MVP-Ziel: vollständig funktionsfähiges Sysing Dashboard auf Supabase ohne Azure/MS Graph
Dieser Sprint: abgeschlossen | teilweise | blockiert
Wesentliche Fortschritte:
- ...
Offene MVP-Themen:
- ...
Kritische Risiken:
- ...
Geschätzte verbleibende Prompts bis MVP: <Zahl oder Bandbreite>
Nächster Sprint: <ID und Titel>
MVP-Prognose: im Plan | gefährdet | blockiert
```

Der Prozentwert ist eine begründete Managementschätzung, keine mathematisch
exakte Metrik. Ausgangspunkt nach Sprint 07A: ca. 65–70 % und etwa sechs größere
Prompts bis zur MVP-Abnahme.

### 11c. MVP-Abnahme

Die integrierte MVP-Abnahme erfolgt in Sprint 09B. Sie umfasst insbesondere alle
UI-Komponenten, Auth/Session, AVKK, Kontextindikatoren, RBAC/RLS, PDF/Druck,
Exporte, Corporate Document Templates, Backup/Restore und fachliche
Report-Plausibilität. Ergebnis ist `docs/MVP-ACCEPTANCE-REPORT.md` mit
GO, GO WITH FINDINGS oder NO-GO und konkreten Empfehlungen. Details stehen in
`docs/MVP-PLAN.md`.

---

## 12. Rollen der Projektdokumente

| Dokument                              | Rolle                                                          |
| ------------------------------------- | -------------------------------------------------------------- |
| `docs/PROJECT-GOVERNANCE.md`          | Oberste Regelquelle                                            |
| `docs/PROJECT-STATUS.yaml`            | Maschinenlesbare Single Source of Truth für Status und Roadmap |
| `docs/MVP-PLAN.md`                    | MVP-Ziel, Restweg, Gesamttest und Freigaberegeln               |
| `CHANGELOG.md`                        | Version und Änderungshistorie                                  |
| `docs/ARCHITECTURE.md`                | Ist- und Zielarchitektur                                       |
| `docs/ADR/`                           | Architekturentscheidungen                                      |
| `docs/ENTWICKLUNGSTAGEBUCH.md`        | Projektchronik                                                 |
| `test-report/technical-test-report.*` | Technischer Prüf- und Freigabenachweis                         |

---

## 13. Änderung dieser Governance

Änderungen an diesem Dokument erfordern bei der nächsten regulären
Sprintversion einen CHANGELOG-Eintrag und — sofern eine Architektur- oder
Qualitätsregel betroffen ist — ein ADR.
