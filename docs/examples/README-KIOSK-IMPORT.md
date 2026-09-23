# Kiosk-Demoimport — JSON-Struktur und Beispiel

Diese Anleitung zeigt, wie ein eigener **synthetischer** Datensatz für den Info-Kiosk erstellt und importiert wird.

Sie ergänzt die technische Referenz:

- `docs/SYSING-KIOSK-001_Info-Kiosk-Datenschnittstelle_V1.0.0.md`
- `docs/examples/kiosk-demo-dataset-v1.json`
- `src/lib/kiosk/kiosk-demo-import.ts`

## 1. Wofür ist der Import gedacht?

Der JSON-Import dient ausschließlich dazu, den Info-Kiosk mit **synthetischen Demo-Daten** zu befüllen.

Er ist:

- für Schulung, Vorführung und Abnahme gedacht,
- lokal und read-only gegenüber den produktiven Fachtabellen,
- strikt validiert,
- atomar: entweder wird der gesamte Datensatz übernommen oder gar nichts.

Er ist **keine produktive externe Kiosk-API** und kein allgemeiner Datenimport für Projekte, Tätigkeiten, Monitoring oder Support.

## 2. Schnellstart

Die einfachste Vorlage ist die bereits freigegebene Referenzdatei:

`docs/examples/kiosk-demo-dataset-v1.json`

Vorgehen:

1. Datei kopieren.
2. Nur die synthetischen Werte, Labels, Trends, Hinweise und Status anpassen.
3. `schemaVersion`, `synthetic`, `mode` und `datasetVersion` unverändert lassen.
4. Keine unbekannten Felder ergänzen.
5. Datei als JSON speichern.
6. Über den Kiosk-Demoimport laden.

### Bedienweg in der Anwendung

1. Mit einem Konto anmelden, das `users.manage` besitzt.
2. **Servicemenü** öffnen.
3. **Demo-Datensatz…** wählen.
4. Zum Abschnitt **Kiosk-Demodatensatz** gehen.
5. Bei **Kiosk-Demo-JSON auswählen** die vorbereitete `.json`-Datei auswählen.
6. Auf die Rückmeldung **Kiosk-Demo-JSON importiert.** achten.
7. Die angezeigte Dataset-Version kontrollieren.

Alternativ lädt **Beispieldatensatz laden** den fest eingebauten Referenz-Demostand.

Das technische Kiosk-Konto selbst darf den Demo-Datensatz nicht verwalten. Laden, Importieren und Entfernen sind administrativ und erfordern `users.manage`.

## 3. Verbindliche Top-Level-Struktur

Jede Importdatei hat diese Struktur:

```json
{
  "schemaVersion": "sysing.kiosk.demo.v1",
  "synthetic": true,
  "snapshot": {
    "mode": "demo",
    "datasetVersion": "1.0.0",
    "generatedAt": "2026-09-23T10:00:00Z",
    "observedAt": "2026-09-23T10:00:00Z",
    "domains": []
  }
}
```

### Pflichtfelder

| Feld | Typ | Vorgabe |
| --- | --- | --- |
| `schemaVersion` | String | exakt `sysing.kiosk.demo.v1` |
| `synthetic` | Boolean | exakt `true` |
| `snapshot.mode` | String | exakt `demo` |
| `snapshot.datasetVersion` | String | exakt `1.0.0` |
| `snapshot.generatedAt` | Zeitstempel | gültiger ISO-/RFC-3339-Wert |
| `snapshot.observedAt` | Zeitstempel | gültiger ISO-/RFC-3339-Wert |
| `snapshot.domains` | Array | maximal sechs bekannte Domänen |

Die maximale Dateigröße beträgt **256 KiB**.

## 4. Erlaubte Domänen

Es sind ausschließlich diese Domain-IDs zulässig:

| ID | Bedeutung |
| --- | --- |
| `projects` | Projekte |
| `workPackages` | Arbeitspakete |
| `activities` | Tätigkeiten |
| `availability` | Urlaub / Verfügbarkeit |
| `infrastructure` | Infrastruktur |
| `support` | Support-Postfach |

Eine Domain-ID darf innerhalb einer Importdatei nur einmal vorkommen.

## 5. Aufbau einer Domain

Eine Domain hat folgende Struktur:

```json
{
  "id": "projects",
  "title": "Projekte",
  "level": "warning",
  "metrics": [
    {
      "value": 8,
      "label": "Aktive Projekte",
      "level": "ok"
    }
  ],
  "note": "Synthetischer Demo-Stand"
}
```

### Domain-Felder

| Feld | Pflicht | Typ / Grenze | Bedeutung |
| --- | --- | --- | --- |
| `id` | ja | bekannte Domain-ID | technische Domäne |
| `title` | ja | String, 1–120 Zeichen | sichtbarer Titel |
| `level` | ja | `ok`, `warning`, `critical`, `unknown` | Gesamtstatus |
| `metrics` | ja | Array, max. 50 | Kennzahlen |
| `note` | nein | String, max. 500 Zeichen | Zusatzhinweis |
| `rows` | nein | Array, max. 20 | Statusmatrix, z. B. Infrastruktur |

## 6. Aufbau einer Metrik

```json
{
  "value": 82,
  "label": "Abrechenbarer Anteil",
  "level": "ok",
  "unit": "%",
  "trend": [74, 76, 78, 79, 80, 81, 82]
}
```

### Metric-Felder

| Feld | Pflicht | Typ / Grenze | Bedeutung |
| --- | --- | --- | --- |
| `value` | ja | Zahl oder `null` | Kennzahl; `null` bedeutet unbekannt |
| `label` | ja | String, 1–120 Zeichen | sichtbare Bezeichnung |
| `level` | ja | gültiger Level | Status der Kennzahl |
| `unit` | nein | String, 1–12 Zeichen | z. B. `%`, `h`, `Stk` |
| `trend` | nein | 2–14 nichtnegative Zahlen | Verlauf für kleine Trenddarstellung |

Ein unbekannter Wert wird als `null` angegeben. Verwende **nicht** `0`, wenn der Wert tatsächlich unbekannt ist.

## 7. Optionale Statusmatrix `rows`

Die Statusmatrix ist insbesondere für aggregierte Infrastrukturwerte gedacht.

```json
{
  "label": "Server",
  "breakdown": {
    "ok": 28,
    "warning": 2,
    "critical": 1
  }
}
```

Regeln:

- `label`: 1–120 Zeichen,
- `ok`, `warning`, `critical`: nichtnegative ganze Zahlen,
- maximal 20 Zeilen je Domain.

## 8. Vollständiges Copy-&-Paste-Beispiel

Das folgende Beispiel enthält alle sechs Kiosk-Domänen und ist als Vorlage für einen eigenen synthetischen Demo-Datensatz gedacht.

```json
{
  "schemaVersion": "sysing.kiosk.demo.v1",
  "synthetic": true,
  "snapshot": {
    "mode": "demo",
    "datasetVersion": "1.0.0",
    "generatedAt": "2026-09-23T10:00:00Z",
    "observedAt": "2026-09-23T10:00:00Z",
    "domains": [
      {
        "id": "projects",
        "title": "Projekte",
        "level": "warning",
        "metrics": [
          {
            "value": 8,
            "label": "Aktive Projekte",
            "level": "ok"
          },
          {
            "value": 1,
            "label": "Mit Terminrisiko",
            "level": "warning"
          }
        ],
        "note": "Vollständig synthetische Projektdaten"
      },
      {
        "id": "workPackages",
        "title": "Arbeitspakete",
        "level": "warning",
        "metrics": [
          {
            "value": 24,
            "label": "Offene Arbeitspakete",
            "level": "ok"
          },
          {
            "value": 3,
            "label": "Überfällig",
            "level": "warning"
          }
        ]
      },
      {
        "id": "activities",
        "title": "Tätigkeiten",
        "level": "ok",
        "metrics": [
          {
            "value": 126.5,
            "label": "Stunden im Demo-Zeitraum",
            "level": "ok",
            "unit": "h"
          },
          {
            "value": 82,
            "label": "Abrechenbarer Anteil",
            "level": "ok",
            "unit": "%"
          }
        ],
        "note": "Nur aggregierte synthetische Werte"
      },
      {
        "id": "availability",
        "title": "Urlaub (Mitarbeiter)",
        "level": "ok",
        "metrics": [
          {
            "value": 4,
            "label": "Diese Woche im Urlaub",
            "level": "ok"
          },
          {
            "value": 6,
            "label": "Nächste Woche im Urlaub",
            "level": "ok"
          }
        ],
        "note": "Keine Gründe oder Gesundheitsdaten"
      },
      {
        "id": "infrastructure",
        "title": "Infrastruktur",
        "level": "critical",
        "metrics": [
          {
            "value": 131,
            "label": "OK",
            "level": "ok"
          },
          {
            "value": 8,
            "label": "Warnung",
            "level": "warning"
          },
          {
            "value": 3,
            "label": "Kritisch",
            "level": "critical"
          }
        ],
        "rows": [
          {
            "label": "Server",
            "breakdown": {
              "ok": 28,
              "warning": 2,
              "critical": 1
            }
          },
          {
            "label": "Backup",
            "breakdown": {
              "ok": 18,
              "warning": 1,
              "critical": 0
            }
          }
        ],
        "note": "Keine produktiven Hostnamen oder IP-Adressen"
      },
      {
        "id": "support",
        "title": "Support-Postfach",
        "level": "warning",
        "metrics": [
          {
            "value": 87,
            "label": "Posteingang gesamt",
            "level": "warning",
            "trend": [61, 68, 72, 70, 79, 83, 87]
          },
          {
            "value": 12,
            "label": "Heute",
            "level": "ok",
            "trend": [8, 11, 9, 14, 12, 16, 12]
          }
        ],
        "note": "Nur Mengen und Alter, keine Mailinhalte"
      }
    ]
  }
}
```

Für die offizielle, vollständig gepflegte Referenz verwende weiterhin:

`docs/examples/kiosk-demo-dataset-v1.json`

## 9. Felder, die **nicht** in die Importdatei gehören

Der Runtime-Vertrag des Kiosks enthält mehr Felder als das Importformat. Das ist beabsichtigt.

Insbesondere **nicht** in eine Domain des JSON-Imports eintragen:

- `sourceKind`,
- Domain-`observedAt`,
- `datasetState`,
- `period`,
- technische Benutzer-, Customer- oder Systemhouse-IDs.

Der Import arbeitet mit Strict Validation. Zusätzliche unbekannte Felder führen daher zur Ablehnung.

Nach einem erfolgreichen Import setzt der Importpfad unter anderem:

- `sourceKind = "demo"`,
- Domain-`observedAt` auf den tatsächlichen Ladezeitpunkt.

Die im Snapshot geforderten Felder `generatedAt` und `observedAt` werden syntaktisch validiert. Der geladene Demo-Datensatz erhält anschließend seinen tatsächlichen `loadedAt`-Zeitpunkt.

## 10. Was darf angepasst werden?

Typischerweise anpassbar:

- Zahlenwerte,
- sichtbare Labels,
- Domain-Titel,
- `level`,
- `unit`,
- `trend`,
- `note`,
- `rows`,
- Zeitstempel.

Nicht ändern, solange Schema V1 verwendet wird:

- `schemaVersion = "sysing.kiosk.demo.v1"`,
- `synthetic = true`,
- `snapshot.mode = "demo"`,
- `snapshot.datasetVersion = "1.0.0"`,
- technische Domain-IDs.

## 11. Häufige Importfehler

### „Kiosk-Demo-JSON ist syntaktisch ungültig.“

Typische Ursache:

- fehlendes Komma,
- überzähltes Komma,
- falsche Anführungszeichen,
- unvollständige Klammerung.

### „Ungültiger Zeitstempel“

`generatedAt` oder `observedAt` kann nicht als Datum/Zeit gelesen werden.

Empfehlung:

`2026-09-23T10:00:00Z`

### Unbekannte Domain-ID

Nur die sechs dokumentierten Domain-IDs sind erlaubt.

### Doppelte Kiosk-Domäne

Eine ID wie `projects` darf nicht zweimal im `domains`-Array vorkommen.

### Unbekanntes Feld

Das Schema ist strikt. Schreibfehler oder zusätzliche Felder werden nicht still ignoriert.

Beispiel falsch:

```json
{
  "id": "projects",
  "titel": "Projekte"
}
```

Richtig ist `title`, nicht `titel`.

### Trend wird abgelehnt

Ein `trend` muss:

- mindestens 2,
- höchstens 14,
- ausschließlich nichtnegative endliche Zahlen

enthalten.

### Datei zu groß

Die JSON-Datei darf höchstens 256 KiB groß sein.

## 12. Sicherheits- und Datenschutzregeln

Auch Demo-Daten bleiben bewusst datensparsam.

Nicht in Kiosk-Demodaten aufnehmen:

- echte Namen von Beschäftigten oder Kunden,
- Gesundheits- oder Krankheitsdaten,
- echte E-Mail-Inhalte, Betreffzeilen oder Absender,
- produktive Hostnamen,
- produktive IP-Adressen,
- Passwörter,
- Tokens,
- API-Keys,
- Service-Role-Keys,
- andere produktive Secrets.

Für realitätsnahe Vorführungen verwende ausschließlich erfundene Werte und aggregierte Kennzahlen.

## 13. Technische Importsemantik

Der Ablauf ist:

```text
Datei wählen
  -> Größenprüfung
  -> JSON.parse
  -> Strict Schema Validation
  -> vollständige Normalisierung
  -> atomarer Replace des lokalen Demo-Datensatzes
  -> Kiosk rendert neuen Demo-Snapshot
```

Bei einem Fehler:

- kein Teilimport,
- bestehender Last-good-Datensatz bleibt erhalten,
- keine produktive Supabase-Fachtabelle wird verändert,
- keine Rechte werden erweitert.

## 14. Referenzen

| Zweck | Datei |
| --- | --- |
| Offizielle Importvorlage | `docs/examples/kiosk-demo-dataset-v1.json` |
| Anwenderanleitung | `docs/examples/README-KIOSK-IMPORT.md` |
| TDF-Schnittstellenreferenz | `docs/SYSING-KIOSK-001_Info-Kiosk-Datenschnittstelle_V1.0.0.md` |
| Import-Schema | `src/lib/kiosk/kiosk-demo-import.ts` |
| Runtime-Vertrag | `src/lib/kiosk/kiosk-contract.ts` |
| Default-Demodaten | `src/lib/kiosk/kiosk-demo-dataset.ts` |

## 15. Kurzcheck vor dem Import

- [ ] JSON ist syntaktisch gültig.
- [ ] `schemaVersion` ist `sysing.kiosk.demo.v1`.
- [ ] `synthetic` ist `true`.
- [ ] `mode` ist `demo`.
- [ ] `datasetVersion` ist `1.0.0`.
- [ ] Nur bekannte Domain-IDs werden verwendet.
- [ ] Keine Domain-ID kommt doppelt vor.
- [ ] Keine unbekannten Felder wurden ergänzt.
- [ ] Trends enthalten 2–14 nichtnegative Zahlen.
- [ ] Keine produktiven oder personenbezogenen Daten sind enthalten.
- [ ] Datei ist kleiner als 256 KiB.
