# BSF-KIOSK-02 — Info-Kiosk mit internem Read-Provider

Stand: 2026-09-18
Status: READY NACH BSF-03A-FINALABNAHME / IMPLEMENTIERUNGSVERTRAG
Issue: #136
Vorgänger: BSF-03A / #106
Nachfolger: BSF-03B / #107

## 1. Ziel

BSF-KIOSK-02 bindet den in KIOSK-01 gebauten Info-Kiosk an interne, serverseitig abgesicherte Daten an, ohne eine zweite Kiosk-Fachlogik oder einen zweiten Reporting-Pfad zu schaffen.

Der Demo-Provider bleibt erhalten. Interne Daten werden nur dort gezeigt, wo nach BSF-03A ein belastbarer Read-Vertrag existiert.

## 2. Architektur

```text
KioskView
  -> KioskDataProvider
      -> DemoKioskDataProvider
      -> InternalReadKioskDataProvider
          -> readInternalKioskSnapshotFn
              -> ProjectControllingService
                  -> ProjectControllingRepository
                      -> Supabase User-JWT + RLS
```

Der Kiosk erhält keine direkte Supabase-Abhängigkeit.

## 3. Kein zweiter Aggregationspfad

BSF-KIOSK-02 berechnet Projekt-/AP-/Leistungskennzahlen nicht erneut im Browser.

Die internen Kiosk-Metriken werden aus dem bereits in BSF-03A abgesicherten Controlling-Vertrag erzeugt.

Verbindlich:

- gleiche Customer-/Systemhouse-Grenze,
- gleiche `project.controlling.view`-Permission für interne Leistungsdaten,
- gleiche Kategorie-Semantik,
- gleiche Billable-Semantik,
- gleiche Vollständigkeits-/Too-many-results-Regeln,
- keine eigenen SQL-Summen nur für den Kiosk.

## 4. Quellenkennzeichnung

KIOSK-02 erweitert den Kiosk-Vertrag um eine explizite Quellenart je Domäne:

```text
KioskSourceKind = demo | internal | unavailable
```

Jede `KioskDomainSnapshot` enthält mindestens:

```text
sourceKind
observedAt
```

Der Gesamtsnapshot erhält:

```text
mode = demo | hybrid | internal
```

KIOSK-01 liefert weiterhin ausschließlich `demo`.

KIOSK-02 arbeitet in V1 als `hybrid`, weil nicht für alle sechs Domänen interne Quellen vorhanden sind.

## 5. Interne Domänen in KIOSK-02

Intern befüllt werden:

### Projekte

Quelle: BSF-03A-Controlling für den aktuellen Monat.

Metriken:

- Projekte mit Leistung im Zeitraum,
- Kunden mit Leistung im Zeitraum.

Die Formulierung „mit Leistung im Zeitraum“ ist verbindlich. KIOSK-02 behauptet nicht, damit den vollständigen Projektbestand zu zählen.

### Arbeitspakete

Quelle: BSF-03A-Controlling.

Metriken:

- Arbeitspakete mit Leistung im Zeitraum,
- Kategorie-Zustände im Zeitraum,
- optional Anzahl `Kategorie nicht publiziert` als Datenqualitätsindikator.

### Tätigkeiten

Quelle: BSF-03A-Controlling.

Metriken:

- Anzahl Tätigkeiten,
- Gesamtstunden,
- billable Stunden,
- non-billable Stunden,
- Billable-Quote.

Keine Eurobeträge.

## 6. Domänen ohne interne Quelle

In KIOSK-02 bleiben zunächst:

- Verfügbarkeit/Abwesenheit,
- Infrastruktur,
- Support-Postfach

als eindeutig gekennzeichnete Demo-Domänen erhalten.

Es gibt keinen stillen Wechsel von „interne Quelle ausgefallen“ zu Demo.

Wenn eine interne Domäne nicht gelesen werden kann, gilt:

```text
sourceKind = unavailable
level = unknown
note = interne Daten derzeit nicht verfügbar
```

Die Demo-Domänen bleiben davon unabhängig sichtbar.

## 7. Hybrid-Semantik

Der Header zeigt deutlich:

```text
HYBRID — INTERNE DATEN + DEMO-DATEN
```

Jede Domänenkarte trägt eine Quellenkennzeichnung:

- INTERN,
- DEMO,
- NICHT VERFÜGBAR.

Farbe allein reicht nicht; Text/Icon ist Pflicht.

Damit kann kein Betrachter Demo-Infrastruktur oder Demo-Support versehentlich als Live-Zustand interpretieren.

## 8. Berechtigung

Demo-Modus:

```text
technische Kiosk-Session -> kiosk.view
```

Interner Modus beziehungsweise interne Domänen:

```text
normale angemeldete Leitungs-Session -> project.controlling.view
```

Die bestehende KIOSK-01-Rollenexklusivität bleibt unverändert:

- die technische Rolle `kiosk` besitzt ausschließlich `kiosk.view`,
- `kiosk` erhält **kein** `project.controlling.view`,
- reguläre Rollen erhalten **kein** `kiosk.view`,
- keine neue Permission.

Die interne Server Function prüft `project.controlling.view` selbst. Ein manipulierter Query-Parameter oder ein direkt aufgerufener Client-Provider erweitert keine Rechte.

## 9. Route und Modus

Die bestehende Route `/kiosk` bleibt erhalten.

KIOSK-02 ergänzt:

```text
mode=demo | internal
```

Regeln:

- `mode=demo` bleibt der KIOSK-01-Pfad für die technische `kiosk`-Session mit `kiosk.view`.
- `mode=internal` ist ein expliziter Pfad für normale angemeldete Leitungs-Sessions und verlangt `project.controlling.view` serverseitig.
- ein technisches Kiosk-Konto mit manipuliertem `mode=internal` erhält keinen internen Zugriff.
- kein stiller Fallback von `internal` auf `demo` bei Berechtigungs- oder Datenfehlern.
- KIOSK-02 ändert den Default nicht zwingend auf internal; die explizite Betriebsfreigabe für einen echten Management-Wallboard-Default folgt in KIOSK-03.

## 10. Systemhouse-Scope

Interne Kiosk-Daten werden nie systemhausübergreifend vermischt.

Regeln:

- der zulässige Systemhouse-Scope wird **vor** der Metrikaggregation aufgelöst,
- bei genau einem zulässigen Systemhaus kann dieses automatisch verwendet werden,
- bei mehreren zulässigen Systemhäusern ist `systemhouseId` explizit erforderlich,
- ein unbekannter oder fremder `systemhouseId` führt fail-closed zu keiner internen Anzeige,
- der Server validiert Membership und Customer Access über den bestehenden Controlling-Pfad.

Keine Auswahl anhand eines Anzeigenamens.

## 11. Zeitraum

KIOSK-02 verwendet für interne Projekt-/AP-/Tätigkeitsmetriken standardmäßig:

```text
aktueller Kalendermonat bis heute
```

Damit entspricht der Kiosk der BSF-03A-Defaultperiode.

Der Zeitraum wird im Kiosk sichtbar angezeigt.

KIOSK-02 führt keine frei editierbare Controlling-Filterleiste ein. Für tiefere Analyse verweist der Kiosk auf `/projektcontrolling`.

## 12. Datenstand und Freshness

Ein interner Kiosk darf die Renderzeit nicht als Datenstand ausgeben.

Der heute implementierte BSF-03A-Result enthält diese Freshness-Felder noch nicht. KIOSK-02 ergänzt sie additiv im providerneutralen Result aus den bereits vorhandenen `published_at`-Werten der tatsächlich verwendeten Projection-Zeilen; dafür ist **keine DB-Migration** erforderlich:

```text
oldestPublishedAt
latestPublishedAt
```

KIOSK-02 zeigt mindestens `latestPublishedAt` als Datenstand der internen Domänen und kennzeichnet fehlende Source-Zeitstempel als unbekannt.

Demo-Domänen behalten ihren eigenen Demo-Zeitstempel.

## 13. Fehlerverhalten

### Initialer interner Fehler

Interne Domänen werden `unavailable/unknown`; Demo-Domänen bleiben sichtbar.

### Späterer Refresh-Fehler

Der KIOSK-01-Last-good-Vertrag bleibt erhalten. Ein letzter gültiger interner Snapshot darf weiter angezeigt werden, muss aber sichtbar als nicht aktuell markiert werden.

### Too many results

Wenn BSF-03A für den aktuellen Monat die definierte Ergebnisgrenze überschreitet, wird dies nicht durch abgeschnittene Kiosk-Summen kaschiert. Die internen Leistungsdomänen werden `unavailable` mit Hinweis auf notwendige Filter-/Skalierungsentscheidung.

## 14. Datenschutz

KIOSK-02 zeigt ausschließlich Aggregate.

Nicht im Kiosk:

- Tätigkeitstitel,
- Personennamen,
- Engineer-IDs,
- Kunden-interne Notizen,
- E-Mail-Inhalte,
- Urlaubsgründe,
- Diagnosen,
- Eurobeträge,
- interne Datenbank-UUIDs.

Kundennamen sind für einen offenen Großbildstandort erst in KIOSK-03/BSF-07 als eigene Datenschutzentscheidung zu bewerten. KIOSK-02 kann für Projekt-/Leistungsaggregate kundenneutrale Summen verwenden.

## 15. Vorgesehene Module

Neu:

```text
src/lib/kiosk/internal-kiosk-snapshot.ts
src/lib/kiosk-runtime/internal-kiosk.functions.ts
src/lib/kiosk/internal-kiosk-provider.ts
```

Anpassen:

```text
src/lib/kiosk/kiosk-contract.ts
src/components/kiosk/KioskView.tsx
src/components/kiosk/KioskDomainCard.tsx
src/routes/_authenticated/kiosk.tsx
```

Tests:

```text
src/__tests__/lib/internal-kiosk-snapshot.test.ts
src/__tests__/backend/internal-kiosk.functions.test.ts
src/__tests__/components/KioskView.test.tsx
e2e/specs/kiosk/kiosk-internal.spec.ts
e2e/specs/security/kiosk-internal-scope.spec.ts
```

## 16. Keine neue Datenbankänderung

KIOSK-02 benötigt nach erfolgreichem BSF-03A keine neue fachliche Tabelle, Migration, RLS-Policy oder Permission.

Falls sich während der Umsetzung doch ein DB-Bedarf ergibt, ist das ein Architektur-BLOCKER und keine spontane Kiosk-Migration.

## 17. KIOSK-01-Vertragserweiterung

Der Kiosk-Vertrag wird additiv erweitert:

```text
KioskSnapshot.mode
KioskDomainSnapshot.sourceKind
KioskDomainSnapshot.observedAt
```

Die vorhandenen KIOSK-01-Demo-Szenarien bleiben gültig und setzen:

```text
mode = demo
sourceKind = demo
observedAt = Demo-Zeitstempel
```

Keine bestehende Kiosk-Komponente darf eine Supabase-spezifische Verzweigung erhalten.

## 18. Nicht-Scope

Nicht Bestandteil von KIOSK-02:

- BSF-03B-Finalisierung,
- Vertretung/Project Responsibility,
- BSF-07-Management-KPI-Semantik,
- produktive Abwesenheitsquelle,
- produktive PRTG-/Infrastrukturquelle,
- produktives Exchange-/Support-Postfach,
- SharePoint/Graph,
- MCP,
- Agent/NAVIS,
- unbeaufsichtigte Sonderauthentifizierung,
- personenbezogene Leistungsbewertung.

## 19. Abnahmekriterien

KIOSK-02 ist erst abnahmefähig, wenn:

1. Demo-Provider unverändert nutzbar bleibt.
2. Interner Provider nur über Server Function auf interne Daten zugreift.
3. `project.controlling.view` serverseitig für interne Metriken erforderlich ist.
4. Kein neuer Kiosk-RBAC-/DB-Pfad entsteht.
5. Projekte/AP/Tätigkeiten aus demselben BSF-03A-Vertrag abgeleitet werden.
6. Kein zweiter Stunden-/Billable-Aggregationspfad entsteht.
7. Jede Domäne INTERN/DEMO/NICHT VERFÜGBAR sichtbar kennzeichnet.
8. Interner Ausfall nie still durch Demo-Werte ersetzt wird.
9. Systemhäuser nie vermischt werden.
10. Cross-Systemhouse/Cross-Customer/IDOR-Negativtests PASS sind.
11. Datenstand aus Source-/Projection-Freshness stammt, nicht aus Renderzeit.
12. Keine personenbezogenen Leistungsdetails im Großbild erscheinen.
13. E2E und Accessibility PASS sind.
14. Security und vollständige CI inklusive Technical Debt und Quality Gate PASS sind.
15. Dokumentation und Abschlussbericht synchron sind.
