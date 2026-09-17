# BSF-KIOSK-01 — Info-Kiosk Demo-Pilot Design

Stand: 2026-09-17
Status: SPEC REVIEW
Issue: #135
Roadmap: `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md`

## 1. Ziel

BSF-KIOSK-01 liefert die erste sichtbare Kiosk-/Wallboard-Stufe des Sysing Dashboards. Sie soll auf einem Grossmonitor schnell erfassbar, read-only und mit ausschliesslich synthetischen Demo-/Mock-Daten vorzeigbar sein.

Der Sprint umfasst nach der Architekturentscheidung vom 14.09.2026 zusaetzlich den sicheren Kiosk-Betriebsmodus:

- dediziertes Kiosk-Konto,
- minimale Kiosk-Berechtigung,
- keine automatische Abmeldung wegen Inaktivitaet waehrend des Kiosk-Betriebs,
- normale Authentifizierungs-, Sperr- und Widerrufsmechanismen bleiben aktiv,
- Kiosk-Demodaten sind ueber den bestehenden Demo-/Servicebereich kontrolliert ladbar und entfernbar.

Produktive externe Datenquellen, Agenten, MCP und Management-KPI-Neuentwicklung bleiben ausserhalb von KIOSK-01.

## 2. Verbindliche Architektur

```text
Supabase Auth
  -> dediziertes Kiosk-Konto
      -> Rolle kiosk
          -> Permission kiosk.view
              -> /_authenticated/kiosk
                  -> KioskPage
                      -> KioskDataProvider
                          -> DemoKioskDataProvider
                              -> KioskDemoRepository (lokal, synthetisch)
```

Spaetere Stufe BSF-KIOSK-02:

```text
KioskPage
  -> KioskDataProvider
      -> InternalReadKioskDataProvider
          -> bestehende serverseitige Read-/Projection-Vertraege
```

Die UI kennt weder Supabase noch Graph, SharePoint, Exchange, PRTG, MCP oder einen Agenten. Authentifizierung und Autorisierung liegen ausserhalb der Praesentationskomponenten.

## 3. Kiosk-Konto und RBAC

KIOSK-01 fuehrt die technische Rolle `kiosk` und die atomare Permission `kiosk.view` ein.

Die Rolle `kiosk` ist eine Display-/Betriebsrolle, keine Personenrolle. Sie besitzt in V1 ausschliesslich `kiosk.view` und erhaelt insbesondere nicht:

- `dashboard.view`,
- `documentation.view`,
- `avkk.view`,
- `referencedata.view`,
- Schreib-, Export-, Backup-, Benutzer-, Rollen- oder Administrationsrechte.

Das Kiosk-Konto wird als normales Supabase-Auth-Konto administrativ angelegt und aktiviert. Keine Zugangsdaten werden in Sourcecode, Prompt, Dokumentation oder statischer Browserkonfiguration gespeichert.

Die Kiosk-Rolle ist fuer das Konto exklusiv vorgesehen. Benutzerverwaltung und Tests muessen verhindern, dass ein als Kiosk betriebenes Konto zusaetzliche Fach- oder Administrationsrollen erhaelt. Die Datenbank bleibt die massgebliche Autorisierungsgrenze; Client-Gates sind nur Bedienlogik.

## 4. Anmeldung und Wiederanlauf

Der Kiosk verwendet den normalen Loginpfad der Anwendung. Es gibt keinen separaten geheimen Login-Endpunkt und keinen anonymen Kioskzugriff.

Betriebsablauf:

1. Administrator legt das dedizierte Kiosk-Konto an und setzt das Passwort administrativ.
2. Auf dem Kiosk-Geraet wird das Konto einmal regulaer angemeldet.
3. Nach erfolgreicher Anmeldung wird ein Kiosk-Konto auf `/kiosk` gefuehrt.
4. Die normale persistente Supabase-Session darf Browser-/Geraeteneustarts ueberleben, solange sie gueltig und nicht widerrufen ist.
5. Ist keine gueltige Session vorhanden, erscheint wieder der regulaere Login.

Es gibt kein im Browser gespeichertes Klartextpasswort, keinen Auto-Login mit hinterlegten Credentials und keinen Service-Role-Pfad.

Eine bestehende MFA-Regel wird fuer das Kiosk-Konto nicht durch KIOSK-01 umgangen.

## 5. Route und Route-Beschraenkung

Zielpfad:

```text
/kiosk
```

Die Route liegt unter `_authenticated` und verlangt `kiosk.view`.

Ein Kiosk-Konto darf nicht als allgemeiner Viewer durch das restliche Dashboard navigieren. Nicht-Kiosk-Routen werden fuer die Rolle `kiosk` auf `/kiosk` zurueckgefuehrt oder verweigert. Umgekehrt erhalten normale Rollen durch die neue Kiosk-Rolle keine zusaetzlichen Rechte.

Der manuelle Logout bleibt auf der Kiosk-Oberflaeche erreichbar.

## 6. Session- und Idle-Regel

Der bestehende Idle-Logout bleibt fuer alle bisherigen Rollen unveraendert.

Die einzige Ausnahme lautet:

> Ein authentifiziertes Konto mit exklusiver Rolle `kiosk` wird waehrend des Betriebs auf `/kiosk` nicht wegen fehlender Benutzeraktivitaet automatisch abgemeldet.

Die Ausnahme deaktiviert nur die Inaktivitaetsueberwachung. Sie deaktiviert nicht:

- Supabase-Session- und Tokenvalidierung,
- Account-Statuspruefung,
- administratives Sperren oder Deaktivieren,
- manuellen Logout,
- Auth-Fehlerbehandlung,
- spaetere zentrale Sicherheitsrichtlinien.

Die App erzeugt keine kuenstlichen Maus-/Tastaturereignisse und schreibt keine Fake-Aktivitaet in den Idle-Kanal.

Die Kiosk-Session wird weiterhin gegen den angemeldeten Benutzer und den aktiven Kontostatus geprueft. Wird die Authentifizierung ungueltig oder das Konto explizit inaktiv/gesperrt, endet der Kioskzugriff kontrolliert. Ein temporaerer Status-RPC-Fehler darf nicht als stilles Recht zum anonymen Weiterbetrieb interpretiert werden.

## 7. Providervertrag

KIOSK-01 fuehrt ein reines Read-View-Model ein. Es ist keine neue Fachpersistenz und kein konkurrierendes Domaenenmodell.

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
  datasetVersion: string;
  generatedAt: string;
  observedAt: string;
  domains: KioskDomainSnapshot[];
}

export interface KioskDataProvider {
  getSnapshot(): Promise<KioskSnapshot>;
}
```

Fuer KIOSK-01 ist `mode` absichtlich nur `"demo"`. Eine spaetere Erweiterung auf interne Echt-Daten erfolgt in BSF-KIOSK-02 als Vertragsfortschreibung.

## 8. Ladbarer Kiosk-Demodatensatz

Der Kiosk-Demodatensatz ist ein versioniertes, vollstaendig synthetisches Abnahmeartefakt und wird in den bestehenden Demo-Daten-Workflow integriert.

Bedienprinzip:

```text
Servicemenue
  -> Demo-Datensatz
      -> Kiosk-Demodaten laden / neu laden
      -> Kiosk-Demodaten entfernen
```

Nur ein Benutzer mit der bereits fuer Demo-Seed vorgesehenen administrativen/fachlichen Berechtigung darf den Datensatz laden oder entfernen. Das Kiosk-Konto selbst besitzt keine Seed-, Edit- oder Manage-Berechtigung.

KIOSK-01 schreibt keine Kiosk-Demodaten in produktive Fachtabellen und fuehrt keine neue Kiosk-Datenbanktabelle ein. Der Kiosk-Demodatensatz wird lokal und geraete-/browserweit fuer die Entwicklungs-/Demo-Instanz gespeichert, damit ein Administrator ihn auf dem Kiosk-Geraet laden und das anschliessend angemeldete Kiosk-Konto ihn lesen kann.

Der lokale Speicher enthaelt ausschliesslich synthetische Werte und eine Datensatzversion. Er ist nicht benutzerbezogen und nicht fuer produktive Daten vorgesehen.

Verbindlich:

- Laden ist idempotent,
- erneutes Laden stellt den definierten Ausgangszustand wieder her,
- Entfernen loescht den lokalen Kiosk-Demodatensatz vollstaendig,
- kein Service-Role-Key,
- kein direkter DB-Seed,
- kein stiller Fallback auf erfundene Live-Daten,
- nicht geladener Datensatz wird als klarer `not_loaded`-/Empty-Zustand angezeigt.

Die bestehende Betriebsregel bleibt bestehen: persistente Cloud-Demodaten gehoeren nicht in Produktivinstanzen. Der Kiosk-Datensatz vermeidet dieses Problem in KIOSK-01 durch lokale, vollstaendig entfernbare Demo-Persistenz.

## 9. Demo-Domaenen

Der Demodatensatz enthaelt ausschliesslich aggregierte, synthetische Werte fuer:

- Projekte,
- Arbeitspakete,
- Taetigkeiten,
- Verfuegbarkeit/Abwesenheit,
- Infrastruktur,
- Support-Postfach.

Nicht enthalten:

- Mailbetreff, Absender, Empfaenger oder Mailinhalt,
- Urlaubsgruende, Diagnosen oder Gesundheitsdaten,
- personenbezogene Leistungsbewertung,
- produktive Hostnamen, IP-Adressen, Kundennamen oder Tickets.

## 10. Szenarien fuer Test und Preview

Der Demo-Provider unterstuetzt reproduzierbar:

```text
default     normale gemischte Demo-Lage
empty       gueltiger geladener Datensatz ohne fachliche Eintraege
unknown     mindestens eine Domaene ohne belastbaren Datenstand
error       kontrollierter Providerfehler
not_loaded  Kiosk-Demodatensatz wurde auf diesem Geraet noch nicht geladen
```

`unknown` darf nie als `0` oder `ok` dargestellt werden. Unbekannte Query-Werte fallen auf `default` zurueck, sofern ein Datensatz geladen ist.

## 11. Refresh und Last-good

Der Kiosk liest beim Mounten sofort einen Snapshot und danach alle 60 Sekunden erneut.

```ts
export const KIOSK_REFRESH_MS = 60_000;
```

Ein Refresh ersetzt den Snapshot atomar. Ein spaeterer Fehler zerstoert den letzten gueltigen Snapshot nicht; die UI zeigt `Aktualisierung fehlgeschlagen` und den letzten erfolgreichen Datenstand sichtbar an.

Der Refresh ruft nur den Kiosk-Provider auf und erzeugt keine Session-Aktivitaet.

## 12. Layout

Primaeres Ziel ist 1920 x 1080 im Browser-Vollbild; 1366 x 768 bleibt kontrolliert nutzbar.

```text
+------------------------------------------------------------------+
| Sysing Info-Kiosk | Begruessung | DEMO | Abmelden                |
+------------------------------------------------------------------+
| Operative Arbeit  | Infrastruktur       | Support-Postfach         |
| Projekte          | Statussummen        | Posteingang gesamt       |
| Arbeitspakete     | Bereichsmatrix      | Heute / Gestern          |
| Taetigkeiten      | Systemverfuegbarkeit| Aelter (Warnung)         |
| Urlaub            |                     |                           |
+------------------------------------------------------------------+
| Datenstand | Datensatz | letzte Aktualisierung                   |
+------------------------------------------------------------------+
```

Die Oberfläche nutzt helle, neutrale KPI-Flächen. Grün, Amber und Rot sind auf
Status und Risiken begrenzt; gewöhnliche Mengen erhalten keine semantische
Färbung. Große Werte, deutsche Beschriftungen und die gleichmäßige Verteilung
der drei Hauptspalten sichern die Fernlesbarkeit auf Full-HD-Anzeigen.

Der kompakte Kopf enthält Datenstand, Datensatzversion, Aktualisierungsstatus
und das 60-Sekunden-Refreshintervall. Projekte und Arbeitspakete zeigen ihre
synthetischen Statusanteile als Fortschrittsbalken. Die Infrastruktur weist die
Systemverfügbarkeit ausschließlich aggregiert aus. Kleine Support-Verläufe
verwenden optionale, feste synthetische Trendwerte; sie enthalten keine
Mailinhalte, Absender oder andere personenbezogene Angaben und stammen nicht
aus Exchange oder Microsoft Graph.

Der dauerhaft sichtbare Hinweis `DEMO-DATEN — KEINE LIVE-DATEN` ist Pflicht. Farbe ist nie alleinige Statussemantik; `OK`, `WARNUNG`, `KRITISCH` und `UNBEKANNT` werden auch textlich bzw. zugaenglich vermittelt.

### Reservierter Erweiterungsbereich

Die mittlere Spalte der Operativen Steuerungsübersicht enthält unterhalb der
Systemverfügbarkeit einen reservierten Erweiterungsbereich für zukünftige
aggregierte read-only Betriebsinformationen. Der Bereich besitzt derzeit
bewusst keinen Fachdatensatz und keine produktive Datenquelle. Ein konkreter
Datenvertrag wird erst mit einer freigegebenen fachlichen Anforderung ergänzt.

Der technisch als `KioskExtensionArea` abgegrenzte, visuell leere Layout-Slot
nutzt ausschließlich die vorhandene Restfläche der Infrastrukturspalte. Er hat
keine feste oder minimale Höhe, verändert weder Spaltenbreite noch
Gesamthöhe und zeigt heute keine Beschriftung, Karte, Kennzahl oder künstlichen
Zustand.

Eine spätere fachliche Implementierung muss read-only und aggregiert bleiben.
Sie darf keine personenbezogenen Detaildaten, Mailinhalte, Betreffzeilen,
Absender, Gesundheitsdaten, Secrets, produktiven Hostnamen oder IP-Adressen
anzeigen. Provider- und Fachlogik bleiben getrennt. Erst ein späterer,
freigegebener Fachvertrag darf die Zustände `not-configured`, `loading`,
`loaded`, `unknown` und `error` einführen; KIOSK-01 implementiert diese Zustände
für den Erweiterungsbereich ausdrücklich nicht.

## 13. Fehler- und Sicherheitsverhalten

### Loading

Beschriftete Ladeflaeche, kein unerklaertes leeres Layout.

### Not loaded

`Kiosk-Demodaten sind auf diesem Geraet nicht geladen.` Der Kiosk-User erhaelt keinen Ladebutton mit Schreibrecht; die Vorbereitung erfolgt administrativ im Demo-/Servicebereich.

### Empty

`Keine Demo-Daten fuer diesen Bereich` statt erfundener Nullwerte.

### Unknown

Eigener Zustand, keine Normalisierung auf `ok` oder `0`.

### Providerfehler

Beim initialen Fehler erscheint eine kontrollierte Fehlerflaeche. Nach einem erfolgreichen Snapshot bleibt Last-good sichtbar.

### Auth-/Kontofehler

Ohne gueltige Authentifizierung kein Kioskzugriff. Ein explizit deaktiviertes/gesperrtes Konto darf die Idle-Ausnahme nicht in einen Dauerzugriff verwandeln.

## 14. Datenschutz und Grossbildbetrieb

KIOSK-01 zeigt nur synthetische Werte. Trotzdem gelten die spaeteren Betriebsprinzipien bereits jetzt:

- nur aggregierte Informationen auf dem Grossbild,
- keine sensiblen Einzelpersonendaten,
- keine Mailinhalte,
- keine produktiven Infrastrukturkennungen,
- Monitorstandort und Einsehbarkeit werden vor Echtbetrieb bewertet.

Der Demo-Pilot ist keine Freigabe fuer reale personenbezogene Daten auf offen sichtbaren Monitoren.

## 15. Technische Aenderungsgrenzen

KIOSK-01 darf wegen der neuen Betriebsanforderung gezielt folgende sicherheitsrelevante Aenderungen enthalten:

- Erweiterung `public.app_role` um `kiosk`,
- RBAC-Matrix Frontend/Backend um Rolle `kiosk` und Permission `kiosk.view`,
- generierte Supabase-Typen nach Migration,
- Kiosk-spezifische Auswertung der Idle-Logout-Aktivierung,
- Route-Gate fuer `/kiosk` und Beschraenkung des Kiosk-Kontos auf den Kioskbereich.

Nicht erlaubt bleiben:

- Service Role im Normalpfad,
- anonymer Kioskzugriff,
- Klartext-Credentials im Client,
- produktive externe Datenquellen,
- neue Kiosk-Fachdatenbank,
- Umgehung von RLS fuer spaetere Echt-Daten,
- Lovable-spezifische Runtime-Abhaengigkeit.

Jede DB-/RBAC-Aenderung benoetigt Migration, negative Security-Tests, Matrix-Sync und Advisor-/CI-Nachweis vor Abnahme.

## 16. Lovable-Einsatz

Lovable wird erst nach Abschluss der Auth-/RBAC-/Provider-Grundlagen fuer den UI-/Preview-Pass eingesetzt.

Lovable darf keine eigenstaendige Auth-Loesung, keine zweite Kiosk-Rolle, keine Service Role, keine neue Fachdatenpersistenz und keine produktive Providerkopplung einfuehren.

## 17. Abnahmekriterien

KIOSK-01 ist erst abnahmefaehig, wenn alle Punkte belegt sind:

1. Es existiert eine dedizierte Rolle `kiosk` mit ausschliesslich `kiosk.view`.
2. Das Kiosk-Konto wird regulaer ueber Supabase Auth angemeldet; keine eingebetteten Credentials.
3. Ein Kiosk-Konto wird auf `/kiosk` beschraenkt.
4. Der Idle-Logout ist nur fuer Rolle `kiosk` auf `/kiosk` deaktiviert; alle bisherigen Rollen bleiben unveraendert.
5. Manueller Logout, Account-Sperre und Auth-Ungueltigkeit bleiben wirksam.
6. UI konsumiert nur `KioskDataProvider`.
7. Der Kiosk-Demodatensatz ist versioniert, synthetisch, lokal, idempotent ladbar und vollstaendig entfernbar.
8. Das Kiosk-Konto kann Demodaten nicht laden oder veraendern.
9. Sechs Domaenen sind darstellbar.
10. `default`, `empty`, `unknown`, `error`, `not_loaded` sind reproduzierbar.
11. `DEMO-DATEN — KEINE LIVE-DATEN` ist dauerhaft sichtbar.
12. Refresh alle 60 Sekunden ist getestet; Last-good bleibt bei spaeterem Fehler sichtbar.
13. Keine produktive externe Integration und keine Kiosk-Fachdatenbank.
14. Unit-/Component-/A11y-/E2E- sowie negative RBAC-/Session-Tests PASS.
15. Supabase-Migration und RBAC-Mirror sind konsistent; Advisor zeigt keine neue ungeklaerte Security-Warnung.
16. Security und vollstaendige CI inklusive Technical Debt und Technical Report & Quality Gate PASS.
17. Dokumentation und Abschlussbericht sind synchron.

## 18. Nicht-Scope

Nicht Bestandteil von BSF-KIOSK-01:

- interne Echt-Daten,
- BSF-03A-Controlling,
- SharePoint,
- Microsoft Graph,
- Exchange Online live,
- PRTG live,
- MCP,
- Agenten/NAVIS,
- automatische Anmeldung mit gespeichertem Passwort,
- anonymer Dauerbetrieb,
- neue Management-KPI-Semantik,
- schreibende Kiosk-Fachaktionen.

## 19. Anschluss

Nach KIOSK-01 folgt BSF-03A / #106. Erst danach ersetzt BSF-KIOSK-02 / #136 bei geeigneten Domaenen den Demo-Provider durch einen internen, serverseitig autorisierten Read-Provider. Die Kiosk-UI soll dafuer nicht neu gebaut werden muessen.
