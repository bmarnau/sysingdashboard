---
id: A18
titel: "Gemeinsamer Ladeweg für alle Demodaten inkl. Kiosk: Analyse und Vorschlag"
status: erledigt
start: 2026-11-06T06:06+01:00
ende: 2026-11-06T06:12+01:00
branch: keiner
pr: keiner
commit: keiner
ci: entfällt
---

# Bericht A18

Grundlage: Arbeitsbaum `C:\dev\sysingdashboard`, Branch `docs/2026-11-06-tagesbuendel` (origin/main 34f20a3 plus Doku). Nur gelesen; keine Datei im Repository geändert, kein Live-System, kein GitHub-Schreibzugriff.

## Ergebnis

1. Heute gibt es zwei getrennte Ladewege: Systemhaus-Demodaten (Dialog „Demo-Datensatz…“, sichtbar mit `avkk.edit`, je Konto gespeichert) und Kiosk-Demodaten (gleicher Dialog, Knöpfe nur mit `users.manage`, kontounabhängig je Browser gespeichert).
2. Die Rolle `kiosk` erreicht keinen der beiden Wege: Sie wird auf `/kiosk` festgehalten und hat nur `kiosk.view`. Umgekehrt sieht ein Admin die Kiosk-Demo-Ansicht nie, weil `/kiosk` im Demomodus nur für `kiosk.view` offen ist.
3. Der Kiosk-Datensatz 1.1.0 enthält keine Datumswerte; nur `loadedAt` dient als Datenstand. Eine Verschiebung ist für ihn nicht nötig, nur die Kennzeichnung (DM-11).
4. Empfehlung: Variante A (Kiosk-Datensatz in der Kiosk-Ansicht aus dem eingebauten Generator erzeugen, ohne neues Recht) als Teil von Paket 2b, danach Variante D (gemeinsames Lademodul) zusammen mit Paket 2a. B und C werden nicht empfohlen.
5. Aufwand A etwa 5 h, D zusätzlich etwa 4 h auf 2a; KK-07 wird damit prüfbar.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Menüpunkt Demo-Datensatz | nur mit `avkk.edit` | `src/components/dashboard/header/ServiceMenu.tsx:267-275` |
| Lokaler Systemhaus-Seed | ohne eigene Rechteprüfung, Dialog-Knopf | `src/components/DemoDataDialog.tsx:85-91, 198-200`; `src/lib/demo-data/seed.ts:34-52` |
| Kiosk laden/import/entfernen | `requirePermission(actor, "users.manage")` | `src/lib/kiosk/kiosk-demo-service.ts:12, 21, 27`; `src/components/kiosk/KioskDemoDataSection.tsx:20, 88-108` |
| Rolle kiosk | nur `kiosk.view` (Frontend und DB) | `src/lib/rbac/permissions.ts:213`; `supabase/migrations/20260921095742_bsf03b_performance_statement.sql:56` |
| Kiosk-Rolle festgehalten | jede Seite außer `/kiosk` wird umgeleitet | `src/lib/kiosk/kiosk-session-policy.ts:20-25` |
| Kiosk-Datensatz ohne Datum | feste Kennzahlen, `loadedAt` als Datenstand | `src/lib/kiosk/kiosk-demo-dataset.ts:13-118` |

## Ist-Zustand

### Systemhaus-Demodaten (lokal, je Konto und Browser)

| Merkmal | Ist | Beleg |
| --- | --- | --- |
| Einstieg | Servicemenü → „Demo-Datensatz…“, angezeigt mit `avkk.edit` | `src/components/dashboard/header/ServiceMenu.tsx:267-275` |
| Rechteprüfung beim Einspielen | keine in `seedDemoData`; Schutz nur durch Sichtbarkeit des Menüpunkts | `src/lib/demo-data/seed.ts:34-52`, `src/components/DemoDataDialog.tsx:85-91` |
| Erzeugung | `buildDemoDataset()` liefert Version 2.2.0, `baseDate`, Projekte, Arbeitspakete, Tätigkeiten | `src/lib/demo-data/dataset.ts:12, 607-615` |
| Datumslogik | `baseDate` aus `new Date().toISOString().slice(0, 10)` (UTC); `day(offset)` rechnet in UTC | `src/lib/demo-data/dataset.ts:23-37` |
| Ablage | `dashboardStore`, persistiert unter `northbit-dashboard-v2::<userId>` | `src/lib/store/dashboard-persistence.ts:35-40`, `src/lib/user-management.ts:186-189` |
| Folge | je Konto und je Browser einzeln einspielen; Dialog weist darauf hin | `src/components/DemoDataDialog.tsx:192-196` |
| Schutz eigener Daten | nur Einträge mit Präfix `demo-` werden ersetzt oder entfernt | `src/lib/demo-data/seed.ts:21-23, 54-66`; `src/lib/demo-data/dataset.ts:11-14` |
| Aktualität | `getDemoFreshness` leitet den Stichtag aus `demo-act-1` ab, „veraltet“ ab 3 Tagen | `src/lib/demo-data/seed.ts:68-106`; Anzeige `src/components/DemoDataDialog.tsx:56` |

### Kiosk-Demodaten (lokal, je Browser, kontounabhängig)

| Merkmal | Ist | Beleg |
| --- | --- | --- |
| Einstieg | Abschnitt „Kiosk-Demodatensatz“ im selben Dialog | `src/components/DemoDataDialog.tsx:208` |
| Rechte | Knöpfe gesperrt ohne `users.manage`; Dienst wirft „Permission denied“ | `src/components/kiosk/KioskDemoDataSection.tsx:20, 88-115`; `src/lib/kiosk/kiosk-demo-service.ts:11-29` |
| Erzeugung | `createKioskDemoDataset(now)`, Version `1.1.0`, `loadedAt = now().toISOString()`, `observedAt = loadedAt` | `src/lib/kiosk/kiosk-demo-dataset.ts:3, 98-118` |
| Ablage | `localStorage` `northbit-kiosk-demo-dataset-v1`, nicht kontobezogen | `src/lib/kiosk/kiosk-demo-repository.ts:9, 38-46` |
| Versionsprüfung | Datensatz anderer Version wird als nicht vorhanden gelesen | `src/lib/kiosk/kiosk-demo-repository.ts:15-23` |
| Abmelden | entfernt nur `sb-*-auth-token`, Kiosk-Datensatz bleibt | `src/lib/session/logout-service.ts:41-44` |
| Import | JSON `sysing.kiosk.demo.v1`, `synthetic: true`, max. 256 KiB; `generatedAt`/`observedAt` der Datei werden durch `loadedAt = now` ersetzt | `src/lib/kiosk/kiosk-demo-import.ts:5-6, 51-65, 96-111` |
| Anzeige | Demomodus ist Standard; Provider liest `localStorage`, ohne Datensatz Zustand `not_loaded` | `src/routes/_authenticated/kiosk.tsx:11-18, 28-34`; `src/lib/kiosk/demo-kiosk-provider.ts:51-61, 74-75` |
| Meldung ohne Datensatz | „Kiosk-Demodaten sind auf diesem Gerät nicht geladen.“ | `src/components/kiosk/KioskView.tsx:165-169` |
| Kennzeichnung | „DEMO-DATEN — KEINE LIVE-DATEN“, Datenstand aus `observedAt` | `src/components/kiosk/KioskView.tsx:62-65, 103-104` |
| Handbuch | Laden am Gerät mit einem Konto mit `users.manage` | `src/lib/help-documentation.ts:450-459, 464` |

### Warum die Rolle kiosk nicht laden kann

1. Die Rolle hat nur `kiosk.view` (`src/lib/rbac/permissions.ts:213`; DB: `supabase/migrations/20260921095742_bsf03b_performance_statement.sql:56`, Erstfassung `supabase/migrations/20260914062100_bsf_kiosk_01_permission_and_exclusivity.sql:49`). Test und Matrix sichern das ab (`src/__tests__/lib/kiosk-rbac.test.ts:18`, `docs/RBAC-MATRIX.md:19, 51, 80`).
2. Ein Konto mit `kiosk.view` wird von jeder Seite auf `/kiosk` umgeleitet (`src/lib/kiosk/kiosk-session-policy.ts:20-25`, Prüfung in `src/routes/_authenticated/route.tsx:101-142`). Das Servicemenü mit dem Dialog ist damit nicht erreichbar.
3. Selbst mit erreichbarem Dialog fehlt `users.manage`; `users.manage` ist auf Systemadministrator und Administrator beschränkt (`src/lib/rbac/permissions.ts:113, 132, 157`).

Gegenrichtung: Der Systemadministrator hat `kiosk.view` ausdrücklich nicht (`supabase/migrations/20260921095742_bsf03b_performance_statement.sql:21`). Ein Konto ohne `kiosk.view` wird von `/kiosk` ohne `mode=internal` auf `/dashboard` umgeleitet (`src/lib/kiosk/kiosk-session-policy.ts:28-35`). Die Kiosk-Demo-Ansicht ist also **nur** für die Rolle `kiosk` sichtbar, das Laden **nur** für Rollen, die sie nie sehen. Der heutige Ablauf funktioniert nur, weil der Datensatz kontounabhängig im Browser liegt: Admin lädt, meldet sich ab, Kiosk-Konto meldet sich an (KK-08, `docs/DATENAUFTRAG-KIOSK-KONTO.md:104`).

### Rechte-Matrix (Auszug, belegt)

| Recht | sysadmin | admin | teamlead | projmgr | engineer | customer | viewer | kiosk | Beleg |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `avkk.edit` (Menüpunkt Demo-Datensatz) | ja | ja | ja | ja | ja | nein | nein | nein | `src/lib/rbac/permissions.ts:136, 160, 178, 195, 208, 211-212` |
| `users.manage` (Kiosk-Datensatz laden) | ja | ja | nein | nein | nein | nein | nein | nein | `src/lib/rbac/permissions.ts:132, 157` |
| `kiosk.view` (Kiosk-Demo-Ansicht) | nein | nein | nein | nein | nein | nein | nein | ja | `src/lib/rbac/permissions.ts:213`; DB `…20260921095742_bsf03b_performance_statement.sql:21, 56` |

## Varianten

```yaml
- id: A
  name: Kiosk-Datensatz in der Kiosk-Ansicht automatisch aus dem eingebauten Generator
  beschreibung: >-
    Der Demo-Provider erzeugt beim Start der Kiosk-Ansicht im Demomodus den Datensatz
    mit createKioskDemoDataset (statisch im Bundle, kein Netzwerkzugriff), wenn im
    localStorage kein gültiger Datensatz der aktuellen Version liegt, und speichert ihn
    unter northbit-kiosk-demo-dataset-v1. Ein importierter Datensatz bleibt Vorrang.
    Das Szenario not_loaded bleibt als Test- und Vorführzustand erhalten. Betroffen:
    demo-kiosk-provider.ts (Zeilen 74-75), Handbuch info-kiosk, CHANGELOG.
  aufwand_h: 5
  rechtefolgen: >-
    Kein neues Recht. Die Erzeugung läuft hinter kiosk.view, das die Route bereits
    verlangt. users.manage bleibt für Import und Entfernen im Dialog. RBAC-Matrix,
    Migrationen und kiosk-rbac.test.ts bleiben unverändert.
  risiken:
    - Der Zustand "nicht geladen" tritt für die Rolle kiosk nicht mehr auf; Handbuch und KK-07 müssen angepasst werden.
    - Der Knopf „Kiosk-Demodaten entfernen“ wirkt auf dem Anzeigegerät nur bis zum nächsten Laden der Ansicht; das muss im Handbuch stehen.
    - loadedAt wird bei jeder Neuerzeugung aktuell; ohne schärfere Kennzeichnung (DM-11) wirkt der Datenstand wie live.
    - Geringes Sicherheitsrisiko, weil nur Konstanten aus dem Bundle ausgegeben werden, keine Live-Daten, keine Beträge, keine Personen.
  test:
    - Unit demo-kiosk-provider ohne Datensatz liefert datasetState loaded, Version 1.1.0, sourceKind demo.
    - Unit mit importiertem Datensatz bleibt dieser erhalten (kein Überschreiben).
    - Unit mit veralteter Version wird neu erzeugt.
    - Unit Szenario not_loaded liefert weiter not_loaded.
    - KK-07 am Anzeigegerät mit anzeige@ in einem frischen privaten Fenster, Erwartung Demowerte und "DEMO-DATEN — KEINE LIVE-DATEN"; KK-05 dann mit Aussagekraft wiederholen.
  abgrenzung: Deckt DM-10 und DM-11 nur mit ab, wenn die Kennzeichnung in Paket 2b geschärft wird; berührt DM-01 bis DM-09 und ZP-01 bis ZP-06 nicht, weil der Kiosk-Datensatz kein Datum hat.
- id: B
  name: Eigenes Recht kiosk.demo.load
  beschreibung: >-
    Neues Recht kiosk.demo.load für kiosk, systemadministrator und administrator.
    Die Kiosk-Ansicht zeigt im Zustand not_loaded einen Knopf "Demodatensatz laden",
    KioskDemoDataSection prüft das neue Recht statt users.manage.
  aufwand_h: 10
  rechtefolgen: >-
    Erweitert Permission, ROLE_PERMISSIONS, RBAC-MATRIX und check-rbac. Bricht die
    Invariante "kiosk besitzt ausschließlich kiosk.view" (docs/RBAC-MATRIX.md:80,
    kiosk-rbac.test.ts:18). Für Parität mit has_permission ist eine Migration nötig,
    obwohl die Prüfung rein im Browser wirkt.
  risiken:
    - Migration und Lovable-Sync nötig; fällt in die Publish-Sperre (R-07) und den Merge-Stopp bei schreibenden Lovable-Aufträgen.
    - Die Rechteprüfung im Browser ist nur Bedienschutz; das Recht suggeriert eine Sicherheit, die es nicht gibt.
    - Bedienknopf auf einem öffentlich sichtbaren Anzeigegerät.
    - Eine Entscheidung (ADR) zur Änderung der Kiosk-Invariante wäre nötig.
  test:
    - kiosk-rbac.test.ts und check-rbac an neue Matrix anpassen.
    - Migrationstest has_permission für kiosk.demo.load je Rolle.
    - Komponententest Knopf sichtbar nur mit kiosk.demo.load.
    - KK-07 am Anzeigegerät mit anzeige@ durch Drücken des Knopfes.
  abgrenzung: Kein Bezug zu DM-01 bis DM-14 außer DM-10 und DM-11; ZP-01 bis ZP-06 nicht berührt.
- id: C
  name: Serverseitig bereitgestellter synthetischer Snapshot
  beschreibung: >-
    Ein synthetischer Kiosk-Snapshot liegt in der Datenbank oder wird von einer
    Server-Funktion erzeugt und ist mit kiosk.view lesbar. Alle Geräte erhalten
    denselben Stand; die Aktualisierung erfolgt monatlich per Datenauftrag wie 2c
    oder per Zeitplan (DM-13).
  aufwand_h: 20
  rechtefolgen: >-
    Neue Tabelle oder Funktion mit RLS auf kiosk.view; die Rolle kiosk erhält
    erstmals einen Datenbank-Lesezugriff über has_permission hinaus. Pflege nur
    per Datenauftrag nach ADR-0037 mit zwei Freigaben.
  risiken:
    - Neue Server-Angriffsfläche und RLS-Fehler könnten Daten an die Rolle kiosk geben; heute liest kiosk im Demomodus nichts aus der Datenbank.
    - Migration und Publish nötig; blockiert durch R-07.
    - Jeder Inhaltswechsel ist ein Datenauftrag (Bus-Faktor 1, R-04).
    - Höchster Aufwand ohne fachlichen Mehrwert, weil der Datensatz keine Datumswerte hat.
  test:
    - RLS-Test, dass nur kiosk den Snapshot liest und der Snapshot keine Mandantendaten enthält.
    - Vertrags-Test des Snapshots gegen kioskDemoImportSchema.
    - KK-07 auf zwei Geräten mit identischem Stand.
  abgrenzung: Berührt DM-12 und DM-13 (Server, Zeitplan); DM-13 verlangt dafür vorher eine ADR.
- id: D
  name: Gemeinsames Lademodul für alle lokalen Demodaten (A plus 2a)
  beschreibung: >-
    Ein Modul ensureLocalDemoData(rolle, now) in src/lib/demo-data bündelt beide
    Wege. Beim Start der App bzw. der Kiosk-Ansicht prüft es den Bezugsmonat und
    erzeugt oder verschiebt die Daten. Für Rollen mit dashboard.view verschiebt es
    gespeicherte demo-Einträge in ganzen Tagen (Paket 2a); für kiosk erzeugt es den
    Kiosk-Datensatz wie in Variante A. Ein gemeinsamer Datenstand-Text nach DM-11.
  aufwand_h: 4
  rechtefolgen: >-
    Wie A, kein neues Recht. Das automatische Verschieben ändert nur demo-Einträge
    im eigenen Browserbestand (DM-03). Ob das automatische Ersteinspielen für alle
    Rollen gelten soll, ist eine Owner-Entscheidung; empfohlen ist nur Verschieben
    vorhandener Demodaten, nicht automatisches Einspielen.
  risiken:
    - Fehler im Präfixfilter würden eigene lokale Daten verändern (DM-03).
    - Zeitzonen und Monatsenden fehleranfällig (Befund 6a, S0-05, U3b).
    - Aufwand gilt zusätzlich zu Paket 2a (2 bis 3 Tage laut Bericht 2026-11-04).
  test:
    - Alle Tests aus A.
    - ZP-01 bis ZP-06 unter TZ Europe/Berlin, UTC und America/New_York (DM-09).
    - Golden Dataset mit festem Stichtag 2026-09-14 unverändert (DM-08, ZP-06).
    - Zweiter Lauf im selben Monat ändert nichts (DM-05).
  abgrenzung: Setzt DM-01 bis DM-11 und DM-14 mit um (Paket 2a/2b); DM-12 bleibt Datenauftrag 2c, DM-13 bleibt Backlog mit ADR.
```

Aufwand jeweils einschließlich Tests, Handbuch und CHANGELOG, Schätzung in Analogie zu F-KK-01 (2 bis 2,5 h, `docs/BACKLOG.md:333`) und Paket 2b (0,5 Tage, `docs/BERICHT-2026-11-04-HANDBUCH-DEMODATEN.md:119`). Nicht durch Messung belegt.

## Zeitbezug

| Quelle | Datumswerte | Aktualisierung heute | Soll | Beleg |
| --- | --- | --- | --- | --- |
| Systemhaus lokal (5b) | relativ beim Einspielen (`day(offset)` ab `baseDate`), danach absolut | nur durch erneutes Einspielen; Hinweis „veraltet“ ab 3 Tagen | Paket 2a: beim Laden und beim Monatswechsel in ganzen Tagen verschieben, Bezugsmonat speichern, `berlinDate` statt UTC (DM-01, DM-02, DM-04 bis DM-07) | `src/lib/demo-data/dataset.ts:23-37`; `src/lib/demo-data/seed.ts:68-106`; `docs/BERICHT-2026-11-04-HANDBUCH-DEMODATEN.md:96-102` |
| Basisdaten `dashboard.json` (5a) | absolut, Mai 2026 | nie | Paket 2a (DM-01, DM-03) | `docs/BERICHT-2026-11-04-HANDBUCH-DEMODATEN.md:49` |
| Live-Demo-Mandant (5c) | absolut seit TD-01 Stufe b (2026-10-28) | Monatslauf 2c per Datenauftrag, `s_neu - s_alt` positiv und Vielfaches von 7, `s_neu` in Europe/Berlin; erster Lauf `s_neu = 2026-11-25` | wie Vorlage; Entscheidungen E-2c-1 bis E-2c-3 offen | `docs/DATENAUFTRAG-DEMODATEN-MONAT.md:7, 25-29, 49, 58-60, 189-193` |
| Kiosk-Datensatz (5d) | keine Datumswerte; Bezeichnungen „Heute“, „Gestern“, „Diese Woche“ und Trendreihen ohne Datum; einziger Zeitwert `loadedAt` | keine nötig; Datenstand bleibt auf dem Ladezeitpunkt stehen | kein Basisdatum, keine Verschiebung; nur Datenstand und Kennzeichnung (DM-10, DM-11). Bei Variante A ist `loadedAt` der Erzeugungszeitpunkt und muss als „synthetisch erzeugt am …“ erscheinen | `src/lib/kiosk/kiosk-demo-dataset.ts:43, 53-54, 88-92, 111-117`; `src/lib/kiosk/demo-kiosk-provider.ts:77, 86`; `docs/BERICHT-2026-11-04-HANDBUCH-DEMODATEN.md:52, 61` |
| Golden Dataset (5e) | fester Stichtag 2026-09-14 | nie | unverändert (DM-08, ZP-06) | `docs/BERICHT-2026-11-04-HANDBUCH-DEMODATEN.md:53, 84` |

Folgerungen:

- Der Kiosk braucht keinen Zeitbezug im Sinne von DM-01 bis DM-09. „Jeden Monat aktuell“ ist für den Kiosk damit bereits erfüllt, sobald der Datensatz überhaupt geladen ist; der Engpass ist allein der Ladeweg.
- Die Zahl „Stunden im Demo-Zeitraum: 126,5 h“ ist ein fester Wert ohne Monat (`src/lib/kiosk/kiosk-demo-dataset.ts:43`). Der Kiosk zeigt also nie 0,0 h wie die Monatskachel des Dashboards.
- Für Paket 2a sollte die Verschiebung lokal ebenso wie in 2c ein Vielfaches von 7 Tagen sein, damit Wochentage erhalten bleiben. Der Bericht vom 04.11. verlangt nur „ganze Tage“ (DM-06); die Festlegung auf Vielfache von 7 ist für 2a nicht ausdrücklich entschieden (Offene Frage 2).
- Wird der Kiosk-Datensatz mit einer neuen Version ausgeliefert, liest das Gerät den alten Datensatz als nicht vorhanden (`src/lib/kiosk/kiosk-demo-repository.ts:19`). Ohne Variante A muss dann wieder ein Admin am Gerät laden; mit A wird er automatisch neu erzeugt.

## Empfehlung

Reihenfolge, alles nach dem Publish (Owner-Entscheidung 05.11., `docs/BACKLOG.md:327, 331`):

1. **Paket 2b mit Variante A** (etwa 5 h plus 2b-Rest): Kiosk-Datensatz in der Kiosk-Ansicht automatisch erzeugen; Datenstand als „synthetischer Demo-Stand, erzeugt am …“ (DM-11); Handbuch `info-kiosk` (`src/lib/help-documentation.ts:450-464`) und KK-07 anpassen. Damit ist der Kiosk unabhängig von Admin-Konto und Browserpflege. KK-07 wird zur Pflichtprüfung in EV-0006.
2. **Paket 2a mit Variante D** (2 bis 3 Tage für 2a plus etwa 4 h für das gemeinsame Modul): Verschieben der lokalen Systemhaus-Demodaten beim Laden und Monatswechsel in ganzen Tagen, Basisdatum über `berlinDate` (`src/lib/avkk/work-package-work-view.ts:32`), Tests ZP-01 bis ZP-06. Das gemeinsame Modul ruft für die Rolle `kiosk` die Erzeugung aus Schritt 1 auf.
3. **Paket 2c** unverändert als monatlicher Datenauftrag nach `docs/DATENAUFTRAG-DEMODATEN-MONAT.md` (DM-12); der Kiosk ist davon nicht betroffen, weil er den Live-Demo-Mandanten im Demomodus nicht liest.
4. **B und C nicht umsetzen.** B bricht die Kiosk-Invariante ohne Sicherheitsgewinn; C schafft eine Server-Angriffsfläche für Daten ohne Datum. C nur neu bewerten, falls Kiosk-Demodaten künftig zentral gepflegt und auf allen Geräten gleich sein müssen (dann zusammen mit DM-13 und ADR).

Abgrenzung:

| Bereich | Durch A18 berührt | Bemerkung |
| --- | --- | --- |
| DM-01 bis DM-09, DM-14 | nur über Variante D | Kiosk hat keine Datumswerte; A ändert daran nichts |
| DM-10, DM-11 | ja (A, Paket 2b) | Kennzeichnung bleibt; Datenstand wird präzisiert |
| DM-12 | nein | Live-Demo-Mandant, Datenauftrag 2c |
| DM-13 | nur Variante C | erst nach ADR |
| ZP-01 bis ZP-06 | nur über Variante D | für den Kiosk gegenstandslos; ZP-06 (Golden Dataset) unverändert |
| F-KK-01 | nein | eigener Backlog-Punkt (`docs/BACKLOG.md:333`), kann im selben PR wie A erledigt werden, da beide `/kiosk` betreffen |

## Offene Fragen, Risiken, Abweichungen

Offene Fragen an den Owner:

1. Darf der Kiosk-Datensatz in der Kiosk-Ansicht ohne Admin-Handlung entstehen (Variante A), und soll „Kiosk-Demodaten entfernen“ auf dem Anzeigegerät dann entfallen oder nur noch den Import zurücksetzen?
2. Soll die lokale Verschiebung in Paket 2a wie 2c ein Vielfaches von 7 Tagen sein oder genau auf den heutigen Tag rechnen (DM-06 nennt nur „ganze Tage“)?
3. Soll das gemeinsame Modul (D) fehlende Systemhaus-Demodaten automatisch einspielen oder nur vorhandene verschieben? Empfehlung: nur verschieben.
4. Wird KK-07 mit Variante A zur Pflichtprüfung in EV-0006 (heute „nur dokumentiert“, `docs/DATENAUFTRAG-KIOSK-KONTO.md:103, 108`)?

Risiken:

- Mit automatisch aktuellem `loadedAt` wirkt der Kiosk-Datenstand wie live; DM-11 muss vor oder mit A umgesetzt sein.
- Der lokale Systemhaus-Seed hat keine eigene Rechteprüfung, nur die Sichtbarkeit des Menüpunkts (`src/lib/demo-data/seed.ts:34`, `src/components/DemoDataDialog.tsx:85`). Für ein automatisches Modul (D) ist das unkritisch, solange nur `demo-`-Einträge im eigenen Browserbestand betroffen sind; es ist aber zu dokumentieren.
- Aufwandswerte sind Schätzungen ohne Messung.

Abweichungen:

- Die Prüfpunkte ZP-01 bis ZP-06 stehen im Bericht vom 04.11. (`docs/BERICHT-2026-11-04-HANDBUCH-DEMODATEN.md:77-84`) und zusätzlich bewertet für den Live-Mandanten in `docs/DATENAUFTRAG-DEMODATEN-MONAT.md:66-68`; keine Abweichung zur Annahme des Auftrags.
- `scripts/git-hygiene.mjs` ohne `--fix` führt `git fetch --prune` aus (`scripts/git-hygiene.mjs:41`); das aktualisiert nur Remote-Tracking-Referenzen, keine Dateien im Repository.
- Ob im Live-System bereits auf einem Gerät ein Kiosk-Datensatz liegt, ist nicht ermittelbar (nur lesend im Code).

Hygiene: gemergte Remote-Branches 0, gemergte lokale Branches 0 (`node scripts/git-hygiene.mjs`); offene PRs 8, davon Drafts 7 (`gh pr list --state open --json isDraft`: 287, 286, 285, 283, 282, 278, 124 Draft; 155 kein Draft).

```yaml
Reifegrad: Analyse abgeschlossen, Umsetzung nicht begonnen (nach dem Publish geplant)
Projektstatus: Golden Gate offen; Publish No-Go (R-07); Paket 2a/2b und A18-Umsetzung nach dem Publish
Offene_Fragen:
  - Variante A freigeben (Kiosk-Datensatz ohne Admin-Handlung erzeugen)?
  - Lokale Verschiebung 2a in Vielfachen von 7 Tagen oder genau auf heute?
  - Gemeinsames Modul nur verschieben oder auch automatisch einspielen?
  - KK-07 mit Variante A als Pflichtprüfung in EV-0006?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
