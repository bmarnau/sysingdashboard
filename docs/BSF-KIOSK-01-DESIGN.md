# BSF-KIOSK-01 — Info-Kiosk Demo-Pilot Design

Stand: 2026-09-14
Status: PLANUNG / IMPLEMENTIERUNGSVERTRAG
Issue: #135
Roadmap: `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md`

## 1. Ziel

BSF-KIOSK-01 liefert die erste sichtbare Kiosk-/Wallboard-Stufe des Sysing Dashboards. Sie soll auf einem
Grossmonitor schnell erfassbar, read-only und mit ausschliesslich synthetischen Demo-/Mock-Daten
vorzeigbar sein.

Der Sprint zieht bewusst nur die Praesentationsschicht und ihre providerneutrale Datenkante vor. Er zieht
keine produktive Datenquelle, keine neue Persistenz und keine neue Authentifizierungsvariante vor.

## 2. Verbindliche Architektur

```text
/_authenticated/kiosk
  -> KioskPage
      -> KioskDataProvider
          -> DemoKioskDataProvider
```

Spaetere Stufe BSF-KIOSK-02:

```text
KioskPage
  -> KioskDataProvider
      -> InternalReadKioskDataProvider
          -> bestehende serverseitige Read-/Projection-Vertraege
```

Die UI kennt weder Supabase noch Graph, SharePoint, Exchange, PRTG, MCP oder einen Agenten.

## 3. Route und Zugriff

Die neue Route liegt unter `_authenticated` und nutzt damit unveraendert den vorhandenen Auth-Gate.

Zielpfad:

```text
/kiosk
```

Fuer die Sichtbarkeit wird die vorhandene Permission `dashboard.view` wiederverwendet. Es wird keine neue
Kiosk-Rolle und keine neue globale Permission eingefuehrt.

KIOSK-01 zeigt nur synthetische Daten. UI-Gating ist deshalb keine Daten-Sicherheitsgrenze. Sobald in
BSF-KIOSK-02 reale interne Daten gelesen werden, bleibt die serverseitige Autorisierung des jeweiligen
Read-Pfads zwingend.

## 4. Session- und Idle-Regel

Der vorhandene Idle-Logout unter `_authenticated` bleibt unveraendert aktiv. KIOSK-01 darf ihn weder
deaktivieren noch durch kuenstliche Aktivitaet zuruecksetzen.

Damit gilt fuer den Pilot:

- innerhalb einer gueltigen Sitzung ist keine laufende Bedienung des Kiosks erforderlich,
- bei Ablauf der zentralen Idle-Policy wird die Sitzung wie bisher beendet,
- keine Kiosk-Sonder-Session,
- kein dauerhaftes Refresh-Token-Sonderverhalten,
- kein Auto-Login,
- kein Service-Account-Pfad.

Ein spaeterer unbeaufsichtigter Dauerbetrieb ist eine eigene Security-/Betriebsentscheidung und wird nicht in
KIOSK-01 versteckt geloest.

## 5. Providervertrag

KIOSK-01 fuehrt ein reines Read-View-Model ein. Es ist keine neue Fachpersistenz und kein konkurrierendes
Domaenenmodell.

Verbindliche Schnittstelle:

```ts
export type KioskLevel = "ok" | "warning" | "critical" | "unknown";

export interface KioskMetric {
  value: number | null;
  label: string;
  level: KioskLevel;
}

export interface KioskDomainSnapshot {
  id: "projects" | "workPackages" | "activities" | "availability" | "infrastructure" | "support";
  title: string;
  level: KioskLevel;
  metrics: KioskMetric[];
  note?: string;
}

export interface KioskSnapshot {
  mode: "demo";
  generatedAt: string;
  observedAt: string;
  domains: KioskDomainSnapshot[];
}

export interface KioskDataProvider {
  getSnapshot(): Promise<KioskSnapshot>;
}
```

Fuer KIOSK-01 ist `mode` absichtlich nur `"demo"`. Eine spaetere Erweiterung auf interne Echt-Daten erfolgt
in BSF-KIOSK-02 bewusst als Vertragsfortschreibung statt durch versteckte Providererkennung in der UI.

## 6. Demo-Provider

`DemoKioskDataProvider` arbeitet rein lokal und deterministisch. Er bekommt eine injizierbare Clock, damit
Zeitstempel in Tests stabil sind.

Die Demodaten enthalten ausschliesslich eindeutig synthetische Bezeichnungen. Keine echten Kunden-,
Personen-, Mail-, Infrastruktur- oder Ticketdaten werden fuer den Pilot in Sourcecode oder Fixtures kopiert.

Vorgesehene Demo-Domaenen:

- Projekte,
- Arbeitspakete,
- Taetigkeiten,
- Verfuegbarkeit/Abwesenheit nur aggregiert,
- Infrastruktur nur aggregiert,
- Support-Postfach nur als Mengen-/Alterswerte.

Nicht enthalten:

- Mailbetreff, Absender, Empfaenger oder Mailinhalt,
- Urlaubsgruende, Diagnosen oder Gesundheitsdaten,
- personenbezogene Leistungsbewertung,
- produktive Hostnamen, IP-Adressen, Kundennamen oder Tickets.

## 7. Szenarien fuer Test und Preview

Der Demo-Provider unterstuetzt genau vier reproduzierbare Szenarien:

```text
default   normale gemischte Demo-Lage
empty     keine fachlichen Eintraege, aber gueltiger Snapshot
unknown   mindestens eine Domaene ohne belastbaren Datenstand
error     Provider-Aufruf liefert einen kontrollierten Fehler
```

Die Route darf fuer Test/Preview einen validierten Query-Parameter `scenario` verwenden. Unbekannte Werte
fallen auf `default` zurueck. Der Parameter aendert keine Berechtigung und keine produktive Datenquelle.

## 8. Refresh

Der Kiosk liest beim Mounten sofort einen Snapshot und danach alle 60 Sekunden erneut.

Verbindlich:

```ts
export const KIOSK_REFRESH_MS = 60_000;
```

Ein Refresh ersetzt den Snapshot atomar. Ein Fehler zerstoert den zuletzt gueltigen Snapshot nicht; die UI
zeigt den Fehlerzustand zusaetzlich sichtbar an. In KIOSK-01 gibt es keine Hintergrundschreiboperation.

## 9. Layout

Primaeres Ziel ist 1920 x 1080 im Browser-Vollbild. Das Layout muss ausserdem bei kleineren Desktopbreiten
kontrolliert umbrechen.

Aufbau:

```text
+------------------------------------------------------------------+
| Sysing Info-Kiosk | DEMO | Datenstand | Zurueck zum Dashboard    |
+------------------------------------------------------------------+
| Projekte          | Arbeitspakete      | Taetigkeiten             |
+------------------------------------------------------------------+
| Verfuegbarkeit    | Infrastruktur      | Support-Postfach          |
+------------------------------------------------------------------+
| Demo-Hinweis / Zustand / letzter Refresh                         |
+------------------------------------------------------------------+
```

Jede Domaene wird als eigenstaendige, reine Praesentationskomponente gerendert. Der Kiosk bekommt keine
Dialoge zum Bearbeiten und keine schreibenden Aktionen.

## 10. Visuelle Semantik

Ampelfarben allein duerfen nie Bedeutung tragen. Jeder Zustand wird mindestens durch Text/Icon und
zugleich durch Farbe vermittelt.

Beispiele:

```text
OK
WARNUNG
KRITISCH
UNBEKANNT
```

Der dauerhaft sichtbare Hinweis `DEMO-DATEN — KEINE LIVE-DATEN` ist Pflicht und darf durch Responsiveness
nicht verschwinden.

Die Konzeptabbildung des Management-Wallboards aus Draft-PR #124 ist visuelle Referenz, keine bindende
Pixelvorlage. KIOSK-01 verwendet die bestehende Sysing-Dashboard-Designsprache und keine zweite
Designbibliothek.

## 11. Komponenten- und Dateigrenzen

Neu vorgesehen:

```text
src/lib/kiosk/kiosk-contract.ts
src/lib/kiosk/demo-kiosk-provider.ts
src/lib/kiosk/demo-kiosk-scenarios.ts
src/components/kiosk/KioskView.tsx
src/components/kiosk/KioskDomainCard.tsx
src/hooks/useKioskSnapshot.ts
src/routes/_authenticated/kiosk.tsx
```

Tests:

```text
src/__tests__/lib/kiosk-contract.test.ts
src/__tests__/lib/demo-kiosk-provider.test.ts
src/__tests__/components/KioskView.test.tsx
src/__tests__/a11y/kiosk.test.tsx
e2e/specs/kiosk/kiosk-demo.spec.ts
```

Geplante kleine Aenderungen:

```text
src/routes/_authenticated/dashboard.tsx
src/lib/help-documentation.ts
```

`src/routeTree.gen.ts` wird niemals manuell editiert.

## 12. Fehler-, Empty- und Unknown-Verhalten

### Loading

Beim ersten Laden wird eine echte, beschriftete Ladeflaeche gezeigt. Kein Layout-Springen auf leere Karten.

### Empty

Ein gueltiger leerer Snapshot zeigt `Keine Demo-Daten fuer diesen Bereich` statt `0` als erfundene
Fachbedeutung.

### Unknown

`unknown` ist ein eigener Zustand und wird nicht auf `ok` oder `0` normalisiert.

### Error

Bei initialem Providerfehler erscheint eine klar erkennbare Fehlerflaeche. Bei Fehler nach bereits gueltigem
Snapshot bleibt der letzte Snapshot sichtbar und wird mit `Aktualisierung fehlgeschlagen` markiert.

## 13. Datenschutz und Security

KIOSK-01 ist bewusst datenarm:

- nur synthetische Werte,
- keine Secrets,
- keine produktiven Identifikatoren,
- kein neuer API-Endpunkt,
- keine DB-/RLS-/Grant-/Function-Aenderung,
- keine Service Role,
- keine Auth-Ausnahme,
- keine Kiosk-spezifische Persistenz.

Der spaetere Grossbildbetrieb mit realen Daten muss Standort, Sichtbarkeit und Datenminimierung erneut
bewerten. Der Demo-Pilot ist keine Freigabe fuer reale personenbezogene Daten auf offenen Monitoren.

## 14. Lovable-Einsatz

Lovable wird fuer KIOSK-01 gezielt als UI-/Preview-Werkzeug eingesetzt.

Reihenfolge:

1. Analyse des aktuellen UI und der vorhandenen Komponenten,
2. Umsetzung ausschliesslich gegen den bereits definierten `KioskDataProvider`,
3. Preview auf 1920 x 1080 und kleinerem Desktop,
4. Accessibility-/Zustandskorrekturen,
5. Dokumentation und Abschlussbericht.

Lovable darf dabei keine Datenbankmigration, Auth-Aenderung, neue Permission, Preview-Auth-Sonderlogik oder
providergebundene Datenbeschaffung einfuehren.

## 15. Abnahmekriterien

KIOSK-01 ist erst abnahmefaehig, wenn alle Punkte belegt sind:

1. `/kiosk` liegt unter dem bestehenden Auth-Gate.
2. `dashboard.view` wird wiederverwendet; keine neue Rolle/Permission.
3. UI konsumiert nur `KioskDataProvider`.
4. Demo-Provider enthaelt nur synthetische Daten.
5. Sechs Domaenen sind darstellbar.
6. `default`, `empty`, `unknown`, `error` sind reproduzierbar.
7. `DEMO-DATEN — KEINE LIVE-DATEN` ist dauerhaft sichtbar.
8. Refresh alle 60 Sekunden ist getestet.
9. Letzter gueltiger Snapshot bleibt bei spaeterem Refresh-Fehler sichtbar.
10. Vorhandener Idle-Logout bleibt unveraendert aktiv.
11. Keine DB-/RLS-/Grant-/Function-Aenderung.
12. Keine neue Lovable-only Laufzeitabhaengigkeit.
13. Component-/Unit-/A11y-/E2E-Tests PASS.
14. Security und vollstaendige CI inklusive Technical Debt und Technical Report & Quality Gate PASS.
15. Dokumentation und Abschlussbericht sind synchron.

## 16. Nicht-Scope

Nicht Bestandteil von BSF-KIOSK-01:

- interne Echt-Daten,
- BSF-03A-Controlling,
- SharePoint,
- Microsoft Graph,
- Exchange Online live,
- PRTG live,
- MCP,
- Agenten/NAVIS,
- unbeaufsichtigte Kiosk-Sonderauthentifizierung,
- neue Management-KPI-Semantik,
- schreibende Kiosk-Aktionen.

## 17. Anschluss

Nach KIOSK-01 folgt BSF-03A / #106. Erst danach ersetzt BSF-KIOSK-02 / #136 bei geeigneten Domaenen den
Demo-Provider durch einen internen, serverseitig autorisierten Read-Provider. Die Kiosk-UI soll dafuer nicht
neu gebaut werden muessen.
