# BSF-KIOSK-01 — JSON-Demoimport

Stand: 2026-09-14
Status: VERBINDLICHE ERGAENZUNG ZU KIOSK-01
Issue: #135
PR: #141

## 1. Entscheidung

KIOSK-01 erhaelt eine kleine, ausschliesslich fuer synthetische Kiosk-Demodaten bestimmte JSON-Importschnittstelle.

Der Import ist **kein** Vorgriff auf BSF-05A. BSF-05A bleibt der spaetere allgemeine, providerneutrale Canonical-Import-Pfad fuer reale oder partielle Quelldaten. KIOSK-01 importiert nur den klar abgegrenzten Demo-Vertrag `sysing.kiosk.demo.v1` in das lokale `KioskDemoRepository`.

Der mitgelieferte Beispieldatensatz ist zugleich:

- Referenz fuer den JSON-Vertrag,
- Default-Demodatensatz fuer KIOSK-01,
- Testfixture fuer Import-/Validierungs-/Reload-Tests,
- Vorlage fuer manuell angepasste, weiterhin vollstaendig synthetische Demo-Szenarien.

Damit existiert nur eine fuehrende Demo-Datenquelle und kein zweiter, abweichender Seed-Datensatz.

## 2. Bedienung

Im bestehenden Servicebereich wird KIOSK-01 erweitert:

```text
Servicemenue
  -> Demo-Datensatz
      -> Kiosk-Beispieldatensatz laden / neu laden
      -> Kiosk-Demodaten aus JSON importieren
      -> Kiosk-Demodaten entfernen
```

Nur Benutzer mit der bereits fuer Demo-Seed vorgesehenen Berechtigung duerfen laden, importieren oder entfernen.

Die Rolle `kiosk` besitzt ausschliesslich `kiosk.view` und darf keine Import-/Seed-/Edit-Aktion ausfuehren.

## 3. Importvertrag

Dateiformat: UTF-8 JSON.

Top-Level-Vertrag:

```json
{
  "schemaVersion": "sysing.kiosk.demo.v1",
  "synthetic": true,
  "snapshot": {
    "mode": "demo",
    "datasetVersion": "1.0.0",
    "generatedAt": "2026-09-14T00:00:00Z",
    "observedAt": "2026-09-14T00:00:00Z",
    "domains": []
  }
}
```

Verbindliche Regeln:

- `schemaVersion` muss exakt `sysing.kiosk.demo.v1` sein.
- `synthetic` muss `true` sein.
- `snapshot.mode` muss `demo` sein.
- `datasetVersion` ist Pflicht und wird sichtbar/nachvollziehbar gespeichert.
- `generatedAt` und `observedAt` muessen gueltige RFC-3339-Zeitstempel sein.
- Domaenen-IDs muessen aus dem bekannten Kiosk-V1-Satz stammen.
- Domaenen-IDs duerfen nicht doppelt vorkommen.
- Statuswerte sind nur `ok`, `warning`, `critical`, `unknown`.
- Metrikwerte sind endliche Zahlen oder `null`; `unknown` darf nicht still zu `0` normalisiert werden.
- Unbekannte Felder, unbekannte Domaenen oder ungueltige Typen fuehren fail-closed zur Ablehnung.
- Maximale Importdateigroesse: 256 KiB.

## 4. Domaenen

Der KIOSK-01-Vertrag kennt genau diese Domaenen:

- `projects`,
- `workPackages`,
- `activities`,
- `availability`,
- `infrastructure`,
- `support`.

Der Referenzdatensatz enthaelt jede Domaene genau einmal.

Der Vertrag enthaelt keine Felder fuer:

- Kunden- oder Personennamen,
- Mailbetreff/-inhalt/-adressen,
- produktive Hostnamen oder IP-Adressen,
- Gesundheits-/Urlaubsgruende,
- personenbezogene Leistungsbewertungen,
- Tokens, Passwoerter oder andere Secrets.

## 5. Persistenz und Atomizitaet

Der Import schreibt ausschliesslich in das lokale, geraete-/browserweite `KioskDemoRepository`.

Ablauf:

```text
JSON-Datei
  -> Groessenpruefung
  -> JSON-Parse
  -> Schema-/Semantikvalidierung
  -> Normalisierung in KioskSnapshot
  -> atomarer Replace im KioskDemoRepository
  -> KioskDataProvider liest neuen Snapshot
```

Bei Parse-, Schema- oder Semantikfehlern gilt:

- kein Teilimport,
- keine Aenderung des bisher gespeicherten Datensatzes,
- klarer, datensparsamer Fehlerhinweis,
- keine Ausgabe des kompletten importierten JSON in Logs oder Fehlermeldungen.

Wiederholter Import derselben Datei ist idempotent. Ein gueltiger Neuimport ersetzt den vorherigen Demo-Datensatz vollstaendig.

## 6. Referenzdatei

Verbindliche Beispieldatei im Repository:

`docs/examples/kiosk-demo-dataset-v1.json`

Diese Datei ist die fuehrende Default-Demoquelle fuer KIOSK-01. Der Service-Menuepunkt `Kiosk-Beispieldatensatz laden / neu laden` muss denselben Dateninhalt verwenden und darf keinen separat gepflegten, abweichenden Seed erzeugen.

## 7. Security- und Scope-Grenze

Der Demo-JSON-Import:

- nutzt keine Service Role,
- schreibt nicht in produktive Supabase-Fachtabellen,
- fuehrt keine neue Kiosk-Fachdatenbank ein,
- umgeht weder RBAC noch RLS,
- akzeptiert keine externe URL als Importquelle,
- laedt keine JSON-Datei selbsttaetig aus dem Internet,
- fuehrt keinen Code aus und interpretiert keine HTML-/Script-Inhalte,
- ist im Kiosk-Konto nicht erreichbar.

## 8. Tests

Mindestens:

1. Referenzdatei importierbar — PASS.
2. Reimport derselben Referenzdatei idempotent — PASS.
3. Gueltiger angepasster synthetischer Datensatz ersetzt atomar — PASS.
4. Falsche `schemaVersion` — DENY.
5. `synthetic=false` oder fehlend — DENY.
6. `mode != demo` — DENY.
7. unbekannte Domaene — DENY.
8. doppelte Domaenen-ID — DENY.
9. unbekannter Level-Wert — DENY.
10. ungueltiger Zeitstempel — DENY.
11. Datei > 256 KiB — DENY.
12. syntaktisch defektes JSON — DENY.
13. fehlgeschlagener Import veraendert Last-good-Datensatz nicht — PASS.
14. Rolle `kiosk` kann Importfunktion nicht ausfuehren — DENY.
15. Entfernen loescht importierten Datensatz vollstaendig — PASS.
16. `not_loaded` erscheint nach Entfernen korrekt — PASS.

## 9. Abnahmekriterien

Der JSON-Demoimport ist fuer KIOSK-01 abgenommen, wenn:

- die Referenzdatei versioniert im Repository liegt,
- Referenzdatei und Default-Demoquelle identisch sind,
- der Import nur berechtigten Demo-/Admin-Benutzern zur Verfuegung steht,
- ungueltige Dateien fail-closed und ohne Teilpersistenz abgelehnt werden,
- ein gueltiger Import atomar und idempotent ist,
- das Kiosk-Konto read-only bleibt,
- keine produktive DB-/Providerkopplung entsteht,
- Unit-/RBAC-/E2E-/Accessibility-/Security-/CI-Gates PASS sind.

## 10. Beziehung zu BSF-05A

KIOSK-01 definiert bewusst **keinen** allgemeinen Datenimport.

BSF-05A bleibt zustaendig fuer:

- providerneutrales Canonical Import Model,
- reale/partielle Quelldaten,
- Provenienz/Freshness,
- Matching/Resolution,
- Customer-/Systemhouse-Scope,
- Idempotenz ueber reale Producer-/Providerdaten.

Der Kiosk-Demoimport darf spaeter als lokale Testfixture weiterbestehen, wird aber nicht zum Produktivimport erweitert.
