# SYSING-KIOSK-001 — Info-Kiosk-Datenschnittstelle

## Dokumentmetadaten

- **document_id:** SYSING-KIOSK-001
- **title:** Info-Kiosk-Datenschnittstelle
- **subtitle:** Providervertrag, Demo-JSON, Beispieldatensatz und Integrationsgrenzen
- **document_type:** Technische Schnittstellen- und Betriebsdokumentation (TDF)
- **owner:** Projekt Sysing Dashboard
- **version:** 1.0.0
- **release_date:** 2026-09-23
- **source_review_date:** 2026-09-23
- **classification:** intern
- **status:** BASELINE
- **source_of_truth:** GitHub-Repository `bmarnau/sysingdashboard`
- **referenzdatensatz:** `docs/examples/kiosk-demo-dataset-v1.json`
- **demo_schema:** `sysing.kiosk.demo.v1`
- **runtime_contract:** `KioskDataProvider.getSnapshot(): Promise<KioskSnapshot>`

## 0. Lesehinweis und Statuskennzeichnung

Dieses Dokument trennt den implementierten Ist-Zustand bewusst vom späteren Integrationszielbild.

| Kennzeichnung   | Bedeutung                                                                 |
| --------------- | ------------------------------------------------------------------------- |
| UMGESETZT       | Im aktuellen Repository als Produkt- oder Dokumentationsvertrag vorhanden |
| ZIELBILD        | Geplante Erweiterungsrichtung, noch kein produktiver Schnittstellenpfad   |
| BEKANNTE GRENZE | Bewusste Einschränkung des aktuellen Stands                               |

**Wichtig:** Der Info-Kiosk besitzt heute **keine produktive externe HTTP-API**. Implementiert sind ein providerneutraler Runtime-Vertrag innerhalb der Anwendung, ein interner Read-Provider und ein strikt synthetischer Demo-JSON-Import. Eine spätere externe Datenquelle muss über einen Adapter an denselben Runtime-Vertrag angebunden werden.

## 1. Zweck

Der Info-Kiosk ist eine read-only Steuerungsübersicht für große Bildschirme und übersichtliche Managementsichten. Er verdichtet operative Informationen in wenige belastbare Kennzahlen, ohne Detaildaten oder personenbezogene Leistungswerte in die Großbildsicht zu übernehmen.

Die Datenschnittstelle hat vier Aufgaben:

1. eine stabile Grenze zwischen Kiosk-UI und Datenquellen bilden,
2. Demo-, interne und nicht verfügbare Quellen eindeutig kennzeichnen,
3. synthetische Beispieldaten reproduzierbar importierbar machen,
4. spätere Providerwechsel ermöglichen, ohne die Kiosk-Fachlogik neu zu schreiben.

## 2. Geltungsbereich

### 2.1 UMGESETZT

- providerneutraler `KioskDataProvider`,
- Runtime-Datenvertrag `KioskSnapshot`,
- Demo-Provider,
- interner Read-Provider für ausgewählte Domänen,
- Demo-/Hybrid-/Internal-Modell,
- Quellenstatus `demo|internal|unavailable`,
- lokaler Demo-JSON-Import `sysing.kiosk.demo.v1`,
- versionierter Beispieldatensatz,
- 60-Sekunden-Refresh-Vertrag,
- Empty-/Unknown-/Error-/Unavailable-Verhalten,
- Kiosk-RBAC- und RLS-Grenzen.

### 2.2 ZIELBILD

- zusätzliche interne oder externe Provideradapter,
- produktive Datenquellen für Infrastruktur, Verfügbarkeit und Support,
- optionaler serverseitiger Integrationsendpunkt, falls ein späterer Anwendungsfall ihn benötigt.

### 2.3 BEKANNTE GRENZE

Der Demo-JSON-Import ist **kein allgemeiner Produktivimport** und **keine externe Kiosk-API**. Er schreibt ausschließlich in das lokale Kiosk-Demo-Repository und bleibt vom späteren Canonical-Import-Pfad getrennt.

## 3. Architektur

### 3.1 Schichtenmodell

```text
KioskView
  |
  v
KioskDataProvider
  |----------------------------|
  v                            v
DemoKioskDataProvider     InternalReadKioskDataProvider
  |                            |
  v                            v
KioskDemoRepository       serverseitige Read-Services
                               |
                               v
                        Supabase User-JWT + RLS
```

Die UI kennt nur den `KioskDataProvider`. Datenquellen, Autorisierung und Datenzugriff bleiben außerhalb der Präsentationskomponenten.

### 3.2 Trennung der Verantwortungen

| Schicht                       | Verantwortung                       | Darf nicht                                     |
| ----------------------------- | ----------------------------------- | ---------------------------------------------- |
| KioskView                     | Darstellung, Status, Refresh        | eigene SQL-/Supabase-Logik ausführen           |
| KioskDataProvider             | Snapshot liefern                    | UI-Zustände oder Rendering steuern             |
| DemoKioskDataProvider         | synthetische Demoquelle lesen       | produktive Daten behaupten                     |
| InternalReadKioskDataProvider | interne Aggregate projizieren       | RLS/RBAC umgehen                               |
| Read-Services                 | fachliche serverseitige Aggregation | Service-Role im normalen Browserpfad verwenden |
| Supabase/RLS                  | Daten- und Scopegrenze              | durch UI-Filter ersetzt werden                 |

## 4. Runtime-Vertrag

Führende Codequelle:

`src/lib/kiosk/kiosk-contract.ts`

### 4.1 Providerinterface

```ts
export interface KioskDataProvider {
  getSnapshot(): Promise<KioskSnapshot>;
}
```

Jeder heutige oder spätere Provider liefert denselben fachlichen Snapshot. Ein Providerwechsel darf daher keine Änderung der Kiosk-Komponenten erfordern.

### 4.2 KioskSnapshot

```ts
export interface KioskSnapshot {
  mode: "demo" | "hybrid" | "internal";
  datasetState: "loaded" | "not_loaded";
  datasetVersion: string;
  generatedAt: string;
  observedAt: string | null;
  period?: {
    from: string;
    to: string;
  };
  domains: KioskDomainSnapshot[];
}
```

| Feld             | Bedeutung                                        |
| ---------------- | ------------------------------------------------ |
| `mode`           | Gesamtmodus des Snapshots                        |
| `datasetState`   | Datensatz geladen oder nicht geladen             |
| `datasetVersion` | Version des zugrunde liegenden Kiosk-Datensatzes |
| `generatedAt`    | Zeitpunkt der Snapshot-Erzeugung                 |
| `observedAt`     | fachlicher Datenstand, nicht bloße Renderzeit    |
| `period`         | optionaler fachlicher Betrachtungszeitraum       |
| `domains`        | Kiosk-Domänen mit Quelle, Status und Metriken    |

### 4.3 KioskDomainSnapshot

```ts
export interface KioskDomainSnapshot {
  id: KioskDomainId;
  title: string;
  level: "ok" | "warning" | "critical" | "unknown";
  sourceKind: "demo" | "internal" | "unavailable";
  observedAt: string | null;
  metrics: KioskMetric[];
  note?: string;
  rows?: KioskStatusBreakdownRow[];
}
```

### 4.4 KioskMetric

```ts
export interface KioskMetric {
  value: number | null;
  label: string;
  level: "ok" | "warning" | "critical" | "unknown";
  unit?: string;
  trend?: number[];
}
```

`value=null` ist ein zulässiger unbekannter Wert. Ein unbekannter Wert darf nicht still zu `0` normalisiert werden.

## 5. Domänenvertrag

Der Kiosk V1 kennt exakt sechs Domain-IDs:

| Domain-ID        | Anzeige                | KIOSK-02-Quelle | Zweck                                     |
| ---------------- | ---------------------- | --------------- | ----------------------------------------- |
| `projects`       | Projekte               | intern          | Projektaggregate                          |
| `workPackages`   | Arbeitspakete          | intern          | AP-Aggregate und Datenqualität            |
| `activities`     | Tätigkeiten            | intern          | Anzahl, Stunden, billable/non-billable    |
| `availability`   | Urlaub / Verfügbarkeit | Demo            | aggregierte Abwesenheitsmenge ohne Gründe |
| `infrastructure` | Infrastruktur          | Demo            | aggregierte Statuswerte                   |
| `support`        | Support-Postfach       | Demo            | Mengen und Alter, keine Mailinhalte       |

Im Hybridmodus sind damit drei Domänen `internal` und drei Domänen `demo`. Fällt eine interne Quelle aus, wird sie `unavailable`; sie wird **nicht** still durch Demo-Daten ersetzt.

## 6. Status- und Quellensemantik

### 6.1 Level

| Level      | Bedeutung                        |
| ---------- | -------------------------------- |
| `ok`       | fachlich unauffällig             |
| `warning`  | Aufmerksamkeit erforderlich      |
| `critical` | kritischer Zustand               |
| `unknown`  | keine belastbare Aussage möglich |

Ein Level ist keine Personenbewertung. Es beschreibt ausschließlich den Zustand der jeweiligen aggregierten Domäne oder Metrik.

### 6.2 SourceKind

| sourceKind    | Bedeutung                             | UI-Kennzeichnung |
| ------------- | ------------------------------------- | ---------------- |
| `demo`        | synthetische Daten                    | DEMO             |
| `internal`    | intern autorisiert gelesene Daten     | INTERN           |
| `unavailable` | interne Quelle nicht belastbar lesbar | NICHT VERFÜGBAR  |

### 6.3 Mode

| mode       | Bedeutung                                 |
| ---------- | ----------------------------------------- |
| `demo`     | ausschließlich synthetische Demo-Daten    |
| `hybrid`   | Kombination aus internen und Demo-Domänen |
| `internal` | ausschließlich interne Providerdaten      |

## 7. Freshness und Refresh

`KIOSK_REFRESH_MS = 60_000`.

Der Refresh fragt den Provider erneut ab. Fachlicher Datenstand und Renderzeit bleiben getrennt:

- `generatedAt`: Zeitpunkt der Snapshot-Erzeugung,
- `observedAt`: fachlicher Datenstand,
- Domain-`observedAt`: domänenspezifischer Datenstand.

Bei internen Daten wird der fachliche Datenstand aus den zugrunde liegenden Source-/Projection-Freshness-Werten abgeleitet. Eine aktuelle Renderzeit darf keinen alten Datenstand als aktuell erscheinen lassen.

## 8. Demo-JSON-Vertrag

Führende Codequelle:

`src/lib/kiosk/kiosk-demo-import.ts`

Schema-Version:

`sysing.kiosk.demo.v1`

Maximale Dateigröße:

`256 KiB`

### 8.1 Top-Level-Struktur

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

### 8.2 Verbindliche Regeln

- `schemaVersion` muss exakt `sysing.kiosk.demo.v1` sein.
- `synthetic` muss exakt `true` sein.
- `snapshot.mode` muss exakt `demo` sein.
- `datasetVersion` ist in V1 `1.0.0`.
- Zeitstempel müssen parsebare ISO-/RFC-3339-Werte sein.
- Domain-IDs müssen aus dem bekannten Sechser-Satz stammen.
- Doppelte Domain-IDs werden abgelehnt.
- unbekannte Felder werden durch die Strict-Schemas abgelehnt.
- Level sind nur `ok|warning|critical|unknown`.
- Werte sind endliche Zahlen oder `null`.
- Trends enthalten 2 bis 14 nichtnegative endliche Zahlen.
- Parse-/Schemafehler führen zu keinem Teilimport.

## 9. Beispieldatensatz

Verbindliche Referenzdatei:

`docs/examples/kiosk-demo-dataset-v1.json`

Sie ist gleichzeitig:

- Default-Demoquelle,
- Referenz für `sysing.kiosk.demo.v1`,
- Testfixture,
- Vorlage für angepasste vollständig synthetische Szenarien.

### 9.1 Kernaussagen des Referenzstands

Der Datensatz enthält unter anderem:

- 8 aktive Demo-Projekte,
- 24 offene Demo-Arbeitspakete,
- 126,5 Demo-Stunden,
- 82 % abrechenbaren Demo-Anteil,
- aggregierte Urlaubsanzahlen ohne Gründe,
- aggregierte Infrastrukturzustände ohne Hostnamen/IP-Adressen,
- Supportmengen und Alter ohne Betreff, Absender oder Inhalt.

Diese Werte sind **Demowerte**. Sie sind keine Aussage über einen produktiven Systemhauszustand.

### 9.2 Keine zweite Demoquelle

`src/lib/kiosk/kiosk-demo-dataset.ts` und die Referenzdatei müssen semantisch denselben Default-Demostand repräsentieren. Der bestehende Vertragstest schützt diese Gleichheit vor Drift.

## 10. Importablauf

```text
JSON-Datei
  |
  v
Groessenpruefung (max. 256 KiB)
  |
  v
JSON.parse
  |
  v
Zod Strict Validation
  |
  v
Normalisierung in KioskDemoDataset
  |
  v
atomarer Replace im lokalen KioskDemoRepository
  |
  v
DemoKioskDataProvider
  |
  v
KioskSnapshot
```

Bei einem Fehler bleibt der bisherige Last-good-Datensatz erhalten.

Der Import:

- lädt keine externe URL,
- führt keinen Code aus,
- schreibt nicht in produktive Supabase-Fachtabellen,
- benötigt keine Service Role,
- erweitert den Benutzer nicht um Rechte.

## 11. Interner Read-Provider

KIOSK-02 ergänzt einen internen Provider für Projekte, Arbeitspakete und Tätigkeiten.

Der Datenfluss lautet:

```text
InternalReadKioskDataProvider
  -> readInternalKioskSnapshotFn
      -> ProjectControllingService
          -> ProjectControllingRepository
              -> Supabase User-JWT + RLS
```

Die Kiosk-Schicht berechnet keine zweite parallele Projektcontrolling-Fachlogik. Sie projiziert bestehende, serverseitig abgesicherte Aggregate.

### 11.1 Datenminimierung

Interne Kiosk-Daten enthalten keine:

- Tätigkeitstitel,
- Personennamen,
- Engineer-IDs,
- internen Datenbank-IDs in der Anzeige,
- Eurobeträge,
- Nachrichteninhalte,
- Gesundheitsdaten.

## 12. Authentifizierung, RBAC und RLS

### 12.1 Technischer Kiosk-Account

Die exklusive Rolle `kiosk` besitzt `kiosk.view`. Sie erhält nicht automatisch `project.controlling.view`.

### 12.2 Interne Daten

Interne Leistungsdaten erfordern weiterhin die normalen Sicherheitsgrenzen:

- gültige angemeldete Session,
- erforderliche Permission,
- aktives Systemhouse Membership,
- zulässiger Customer-/Controlling-Scope,
- bestehende RLS-Policies.

UI-Filter sind keine Security Boundary.

### 12.3 Service Role

Im normalen Browser-/Kiosk-Datenpfad ist keine Service Role vorgesehen.

## 13. Datenschutz und Informationssicherheit

Der Kiosk folgt Datenminimierung als Default.

Nicht Bestandteil des Kiosk-Datenvertrags sind:

- Gesundheits- oder Krankheitsgründe,
- personenbezogene Leistungsrankings,
- Mailtexte, Betreffzeilen oder Absenderadressen,
- Passwörter, Tokens, Schlüssel oder andere Secrets,
- produktive Hostnamen oder IP-Adressen im Demo-Datensatz.

Urlaub/Verfügbarkeit wird ausschließlich als aggregierte Menge dargestellt.

## 14. Fehler- und Degraded-Mode-Verhalten

### 14.1 Demoimport

Ungültige Datei:

- Import wird vollständig abgelehnt,
- Last-good bleibt erhalten,
- kein Teilzustand,
- kein vollständiger JSON-Inhalt im Fehlerlog.

### 14.2 Interne Quelle

Interne Quelle nicht belastbar:

```text
sourceKind = unavailable
level = unknown
note = interne Daten derzeit nicht verfügbar
```

Es gibt keinen stillen Wechsel zu Demo-Daten.

### 14.3 Nicht geladener Demo-Datensatz

`datasetState = not_loaded` ist ein expliziter Zustand und nicht mit einem leeren oder fehlerhaften Datensatz gleichzusetzen.

## 15. Providererweiterung

### 15.1 Verbindliche Adapterregel

Ein neuer Provider implementiert:

`KioskDataProvider.getSnapshot(): Promise<KioskSnapshot>`

und liefert ausschließlich den bestehenden fachlichen Vertrag.

### 15.2 Beispiel für spätere Provider

```text
KioskView
  -> KioskDataProvider
      -> SupabaseInternalProvider       [heute teilweise umgesetzt]
      -> DemoProvider                   [heute umgesetzt]
      -> AzureSqlKioskProvider          [ZIELBILD]
      -> MonitoringAdapter              [ZIELBILD]
      -> SupportMailboxAggregateAdapter [ZIELBILD]
```

Azure SQL, Microsoft Graph oder andere Quellen dürfen keine eigene Kiosk-UI-Semantik etablieren. Sie werden in Adapter übersetzt.

## 16. Externe Schnittstelle — Zielbild, nicht Ist-Zustand

Eine produktive externe HTTP-/REST-/MCP-Schnittstelle für den Kiosk ist derzeit **nicht umgesetzt**.

Falls sie später benötigt wird, gelten mindestens:

- serverseitige Authentifizierung und Autorisierung,
- Mandanten-/Systemhouse-/Customer-Scope,
- versionierter Vertrag,
- Source-/Freshness-Provenienz,
- Rate-/Timeout-/Fehlerverhalten,
- kein direktes Durchreichen provider-spezifischer Strukturen,
- Ausgabe im `KioskSnapshot`-Fachmodell,
- Docker-/On-Premises-Betrieb ohne Lovable-Laufzeitabhängigkeit.

## 17. Portabilität

Der Kioskvertrag trennt Fachmodell und Provider:

```text
Fachvertrag
  KioskSnapshot
       ^
       |
Provider Adapter
  Supabase heute
  Azure SQL spaeter
  weitere Quellen spaeter
```

Damit bleibt der Kiosk mit dem Projektziel kompatibel:

- Supabase als MVP-Provider,
- spätere Entra-ID-/Azure-SQL-/Azure-Storage-Erweiterung,
- autonome Docker-/On-Premises-Laufzeit,
- Lovable Cloud nicht als technisch unersetzbare Laufzeitabhängigkeit.

## 18. TDF-Prüfklassen

| Prüfklasse     | Anwendung auf SYSING-KIOSK-001                                           |
| -------------- | ------------------------------------------------------------------------ |
| TDF-TRACE      | Jede Kernbehauptung verweist auf Code, Design oder Closure-Evidenz       |
| TDF-SCHEMA     | `sysing.kiosk.demo.v1`, Dataset-Version und Pflichtfelder dokumentiert   |
| TDF-IMPORT     | Größe, Strict Validation, Atomizität und Last-good beschrieben           |
| TDF-SOURCE     | Demo/Internal/Unavailable, observedAt und Source of Truth beschrieben    |
| TDF-SEC        | RBAC, RLS, Service-Role-Grenze, Secrets und Datenminimierung beschrieben |
| TDF-RESILIENCE | unknown, unavailable, not_loaded und Last-good beschrieben               |
| TDF-RELEASE    | UMGESETZT, ZIELBILD und BEKANNTE GRENZE getrennt                         |

## 19. Traceability

| Aussage                 | Primärquelle                               |
| ----------------------- | ------------------------------------------ |
| Runtime-Providervertrag | `src/lib/kiosk/kiosk-contract.ts`          |
| Demo-Schemavertrag      | `src/lib/kiosk/kiosk-demo-import.ts`       |
| Default-Demodaten       | `src/lib/kiosk/kiosk-demo-dataset.ts`      |
| Referenz-JSON           | `docs/examples/kiosk-demo-dataset-v1.json` |
| KIOSK-01 Architektur    | `docs/BSF-KIOSK-01-DESIGN.md`              |
| Demoimport              | `docs/BSF-KIOSK-01-JSON-DEMO-IMPORT.md`    |
| KIOSK-01 Abnahme        | `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md`  |
| Interner Read-Provider  | `docs/BSF-KIOSK-02-DESIGN.md`              |
| KIOSK-02 Abnahme        | `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md`  |
| Golden-Dataset-Bezug    | `docs/GOLDEN-DATASET-STRATEGY.md`          |

## 20. Abnahmekriterien

SYSING-KIOSK-001 V1.0.0 ist als TDF-Baseline freigabefähig, wenn:

1. Dokument-ID, Version, Datum und Geltungsbereich eindeutig sind.
2. Runtime-Provider, Demo-JSON und spätere externe Provider getrennt beschrieben sind.
3. `KioskDataProvider` und `KioskSnapshot` dem aktuellen Code entsprechen.
4. alle sechs Domain-IDs korrekt dokumentiert sind.
5. `sysing.kiosk.demo.v1` und `datasetVersion=1.0.0` mit der Referenzdatei übereinstimmen.
6. der Referenzdatensatz unverändert führende Demoquelle bleibt.
7. Security-/Datenschutz-/Resilience-Grenzen dokumentiert sind.
8. keine produktive externe API als umgesetzt dargestellt wird.
9. ein automatisierter Dokument-Code-Dataset-Check PASS ist.
10. Word und PDF aus derselben Markdown-Quelle erzeugbar und visuell geprüft sind.

## 21. Glossar

| Begriff     | Bedeutung                                                   |
| ----------- | ----------------------------------------------------------- |
| Kiosk       | Read-only Steuerungsübersicht / Wallboard                   |
| Provider    | Adapter, der einen `KioskSnapshot` liefert                  |
| Snapshot    | vollständiger Kiosk-Datenstand für einen Refresh            |
| Domain      | fachlicher Kiosk-Bereich, z. B. Projekte oder Infrastruktur |
| Demo        | vollständig synthetische Daten                              |
| Internal    | intern autorisiert gelesene Daten                           |
| Unavailable | interne Datenquelle nicht belastbar verfügbar               |
| observedAt  | fachlicher Datenstand                                       |
| generatedAt | Erzeugungszeit des Snapshots                                |
| Last-good   | letzter erfolgreich validierter Demo-Datensatz              |
| RLS         | Row Level Security in PostgreSQL/Supabase                   |
| TDF         | Technical Documentation Framework                           |

## 22. Versionshistorie

| Version | Datum      | Änderung                                                                                    |
| ------- | ---------- | ------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-09-23 | Erste eigenständige TDF-Baseline für Kiosk-Providervertrag, Demo-JSON und Referenzdatensatz |

## 23. Freigabeentscheidung

**Dokumentstatus:** BASELINE / zur technischen Abnahme vorgesehen.

**Runtime Change:** NO.

**Database Change:** NO.

**Auth/RBAC/RLS Change:** NO.

**Lovable Required:** NO.

**Produktive externe Kiosk-API:** NICHT UMGESETZT.

Die Veröffentlichung dieses Dokuments ändert keine Laufzeitfunktion. Sie dokumentiert den bestehenden KIOSK-01/02-Vertrag und schafft eine reproduzierbare Grundlage für spätere Providerintegrationen.
