# F-11 Befund: Demo-Personenzuordnung wirkt nicht in „Mein AVKK"

## Diagnose (an echten Daten geprüft, vor jeder Änderung)

Abfragen gegen die Datenbank und Lesen der Seed-, Workspace- und Dialoglogik ergeben **zwei voneinander unabhängige Ursachen**. Keine davon liegt in RLS oder in der Rechteprüfung.

**ROOT CAUSE 1 — Seed aktualisiert bestehende Demo-Fälle nicht.**
Alle acht Demo-Sachverhalte existieren seit dem 13.08.2026, 16:47 UTC im Status `draft`. Alle acht zugehörigen Verantwortungen zeigen weiterhin auf `info@berndmarnau.de` (`5f933b60-…`). Kein einziger Datensatz zeigt auf Alex (`29a5515d-…`) oder Sam (`6118d089-…`). Grund: `seedCase()` in `src/lib/demo-data/avkk-seed.ts` bricht bei einem vorhandenen, nicht geschlossenen Sachverhalt sofort ab (`result.skipped += 1; return;`) — also **vor** der Zuweisung der Verantwortung. Die im Dialog eingestellte Personenzuordnung wird dadurch nie wirksam; ein erneutes Einspielen ändert nichts.

**ROOT CAUSE 2 — Der lokale Aufgabenbestand ist browsergebunden.**
„Mein AVKK" zeigt Alex 16 Aufgaben, 15 davon überfällig. Das ist exakt der Auslieferungsbestand aus `src/data/dashboard.json` (4 Projekte + 6 Arbeitspakete + 6 Tätigkeiten = 16). Alex hat also **keinen** Demo-Bestand im Browser: Projekte, Arbeitspakete und Tätigkeiten liegen in localStorage und werden nicht zwischen Anmeldungen/Browserprofilen geteilt. Die Zeilen von „Mein AVKK" entstehen aus diesem lokalen Bestand; die Objektkennungen (`demo-wp-netz-planung` usw.) fehlen dort, deshalb findet keine Aufgabe ein Dossier — „Mit AVKK-Stand: 0" trotz vorhandener Cloud-Daten.

| Prüfpunkt | Ergebnis |
| --- | --- |
| SEED-FEHLER | ja — Verantwortung wird bei vorhandenen Fällen übersprungen |
| IDENTITÄTSFEHLER | nein — Konten und Rollen existieren korrekt, IDs sind konsistent |
| BESTANDSDATEN-/IDEMPOTENZPROBLEM | ja — Idempotenz verhindert die Aktualisierung der Zuordnung |
| CACHE-FEHLER | nein — `reload()` lädt Subjekte und Aggregate neu |
| RLS-PROBLEM | nein — Leserechte greifen, Befund F-13 bleibt unverändert |
| BETROFFENE SCHICHT | Demo-Seed (Cloud) + lokaler Demo-Bestand (Browser) |

Kritische Anmerkung: Ursache 2 ist kein Fehler des Seeds, sondern eine Folge der Local-First-Architektur (ADR-0003). Solange Projekte und Arbeitspakete lokal liegen, muss **jede** Demo-Person den lokalen Datensatz in ihrem eigenen Browser einspielen. Das gehört als Befund dokumentiert, nicht durch eine Serverablage „repariert" — das wäre ein Architekturwechsel und kein MVP-Fix.

## Minimale Korrektur

### 1. Verantwortung beim erneuten Einspielen abgleichen (`avkk-seed.ts`)

Bei vorhandenem, offenem Demo-Sachverhalt wird nicht mehr abgebrochen, sondern nur die **Verantwortung** abgeglichen:

- Zielperson aus der Persona-Zuordnung ermitteln.
- Trägt bereits genau diese Person die gültige Verantwortung → nichts tun (Idempotenz bleibt).
- Andernfalls: bestehende gültige Verantwortungen des Demo-Falls beenden (`validTo`, kein Löschen — ADR-0026) und die neue Verantwortung setzen.

Kompetenzen und Konsequenzen bleiben unangetastet; es entstehen keine Duplikate und keine neuen Fälle. Das Ergebnisobjekt erhält `reassigned` neben `created`/`skipped`, damit der Dialog die Wirkung sichtbar meldet.

Beschränkung wie bisher: ausschließlich `demo-`-Kennungen, ausschließlich über `AvkkService` unter RLS, ohne Service-Key. Das Beenden fremder Verantwortungen erfordert `avkk.responsibility.assign` — vorhanden bei Administrator, Teamlead und Projektmanager; fehlt sie, wird der Fall gemeldet statt still übergangen.

### 2. Lokalen Bestand für Demo-Personen bedienbar machen (`DemoDataDialog.tsx`)

Hinweisblock plus getrennt auslösbares „Nur lokalen Bestand einspielen": Jede Demo-Person meldet sich an und spielt den lokalen Bestand in ihrem Browser ein — vorhandene Funktion `seedDemoData()`, keine neue Logik, kein Cloud-Schreibvorgang. Ohne diesen Schritt bleibt „Mein AVKK" bei jeder Person leer, unabhängig von der Zuordnung.

### 3. Tests (Regression zu genau diesem Fall)

Neue Tests in `src/__tests__/lib/demo-data/`:

- Persona A → Konto A, Persona B → Konto B: nach dem Seed trägt jeder Fall die richtige Person.
- Wiederholtes Einspielen mit **geänderter** Zuordnung: Verantwortung wird umgehängt, alte Zuordnung beendet, keine Dubletten.
- Wiederholtes Einspielen mit **gleicher** Zuordnung: keine Schreibvorgänge (Idempotenz).
- Ableitung „eigene Verantwortung": Kontext A sieht nur A-Fälle, Kontext B nur B-Fälle; A erhält nie B-Fälle.
- Historisierte (geschlossene) Demo-Fälle werden weiterhin neu angelegt, nicht wiederverwendet.
- Nur `demo-`-Kennungen werden angefasst.

### 4. Dokumentation

`docs/DEMO-USERS.md` (Ablauf um den lokalen Einspielschritt je Person ergänzen), `docs/DEMO-DATA.md` (Abgleichverhalten statt reinem Überspringen), `docs/MVP-ACCEPTANCE-REPORT.md` (F-11 Befundtext, neuer Befund „lokaler Bestand ist browsergebunden"), `docs/ROLE-ACCEPTANCE-09C.md`, `src/lib/help-documentation.ts`, `CHANGELOG.md` und `docs/PROJECT-STATUS.yaml` auf v1.58.9.

## Erwartungstest nach der Korrektur

Bernd öffnet den Demo-Dialog, ordnet die vier Personas zu und spielt erneut ein → Meldung „x Verantwortungen neu zugeordnet". Alex meldet sich an, spielt den lokalen Bestand ein → „Eigene Verantwortung" > 0, „Mit AVKK-Stand" > 0, Kompetenz-, Konsequenz- und Frühindikatorwerte sichtbar. Sam ergibt dieselbe Rolle, aber eine andere Fallmenge.

Ich kann die Anmeldungen nicht selbst durchführen; F-11 bleibt bis zu Ihrer Wiederholungsprüfung **MANUAL VERIFICATION REQUIRED**.

## Nicht Teil dieser Korrektur

Keine neuen Funktionen, keine RLS- oder Rechteänderung (F-13 bleibt offen und getrennt), keine Serververlagerung des lokalen Bestands, kein Löschen historisierter Daten.

## Qualitätsnachweise

Tests, Typecheck, ESLint, Prettier, Build, `docs:check`, `project-status:check`, `rbac:check`, `no-console`, Security-Gates.
