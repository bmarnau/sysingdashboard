# Database Change Governance — Sysing Dashboard

Stand: 2026-10-12
Status: **verbindliche Projektregel**  
Geltungsbereich: Sysing Dashboard, Supabase-MVP und spätere Datenbankprovider

## 1. Verbindliche Grundregel

**Datenbankänderungen erfolgen über einen ausdrücklich freigegebenen, kanonischen Migrationspfad. Lovable → Supabase bleibt der bevorzugte reguläre Weg.**

Wenn Lovable nachweislich nicht in der Lage ist, bereits versionierte Supabase-Migrationen unverändert und mit korrekter `supabase_migrations`-Historie anzuwenden, darf ausschließlich der in ADR-0034 definierte **kontrollierte Supabase-CLI-Fallback** verwendet werden.

Der Fallback ist keine allgemeine Freigabe für direkte SQL-Schreiboperationen. GitHub bleibt Source of Truth; Migration, Zielprojekt, Pending-Set, Security-Grenzen und Postflight müssen vorab eindeutig belegt sein.

## 2. Was als Datenbankänderung gilt

Die Regel umfasst insbesondere:

- neue oder geänderte Datenbankschemata,
- Tabellen, Views und Materialized Views,
- Spalten und Datentypen,
- Primary Keys, Foreign Keys und sonstige Constraints,
- Indizes,
- SQL-Funktionen und Stored Procedures,
- Trigger,
- Rollen- und Grant-Änderungen,
- Row Level Security (RLS), Policies und zugehörige Autorisierungsfunktionen,
- Migrationen und deren Anwendung,
- Schema-relevante Seeds oder Bootstrap-Daten,
- Änderungen an Datenbankobjekten für Authentifizierung, RBAC oder Mandanten-/Customer-Scope,
- Änderungen an Data-API-Exposition oder vergleichbaren Provider-Einstellungen, soweit sie Teil des Datenbankzugriffsmodells sind,
- produktive Datenmigrationen oder strukturverändernde Datenkorrekturen.

Reine **Read-only-Inspektion** von Schema, Policies, Logs, Metadaten oder Daten zur Analyse ist keine Datenbankänderung und darf mit geeigneten Werkzeugen erfolgen, sofern keine Secrets offengelegt und keine Schreiboperationen ausgelöst werden.

## 3. Rollenverteilung

### ChatGPT

ChatGPT/Work:

- prüft zuerst den aktuellen GitHub-Stand,
- analysiert Ziel, Auswirkungen, Abhängigkeiten und Risiken,
- definiert Datenmodell, Security-Grenzen und Abnahmekriterien,
- prüft aktuelle Supabase-/Provider-Dokumentation, wenn dies für die Änderung relevant ist,
- formuliert den kopierfertigen Lovable-Prompt,
- prüft nach dem Lovable-Lauf Branch/Variant, Commit und vollständigen Diff,
- kontrolliert CI, Security, RLS-/RBAC-Nachweise und Dokumentationsstand,
- darf nach ausdrücklicher Einzelfreigabe ausschließlich den in ADR-0035
  definierten Work-/Lovable-Connector-Fallback orchestrieren.

### Codex / VS Code / lokale Werkzeuge

Diese Werkzeuge dürfen:

- Code und Tests außerhalb der Live-Datenbank vorbereiten,
- SQL oder Migrationsentwürfe zu Analysezwecken erstellen,
- statische Tests und lokale Prüfungen durchführen,
- den Lovable-Prompt fachlich vorbereiten.

Sie dürfen die maßgebliche Datenbankänderung nicht über Raw-SQL, Dashboard-Klicks oder Connector-Write-Aufrufe anwenden. Codex prüft beim ADR-0035-Fallback ausschließlich Git-Stand, Dateihashes und statische Transaktionsfähigkeit; der produktive Write bleibt an Work und den exakt gebundenen Lovable-Projektconnector delegiert.

### Lovable

Lovable ist für Datenbankänderungen der **bevorzugte reguläre Ausführungspfad**. Kann Lovable den kanonischen Supabase-Migrationspfad nicht unverändert ausführen, stoppt der Lovable-Lauf ohne Ersatzmigration; bei einer vollständig Lovable-verwalteten Datenbank ohne separaten Supabase-Zugang darf danach ADR-0035 greifen.

Lovable arbeitet nur:

- nach einem ausdrücklich freigegebenen Prompt,
- mit eindeutig benanntem Ziel und Nicht-Scope,
- auf einer nachweislich isolierten Variant/Nicht-main-Arbeitsfläche,
- gegen den eindeutig verifizierten Supabase-/Datenbankkontext,
- ohne unaufgeforderte Zusatzänderungen,
- mit anschließendem Test- und Abschlussbericht.

Lovable entscheidet nicht selbstständig über Merge oder Release.

## 4. Verbindlicher Ablauf jeder Datenbankänderung

```text
GitHub-Stand prüfen
  -> Änderung fachlich/technisch analysieren
  -> Security-/RLS-/RBAC-Auswirkungen festlegen
  -> Lovable-Prompt formulieren
  -> Prompt und Zielkontext freigeben
  -> Lovable führt die Änderung isoliert aus
  -> Lovable testet und dokumentiert
  -> GitHub-Diff unabhängig prüfen
  -> Security + CI + DB-/RLS-Negativtests prüfen
  -> manueller fachlicher Retest, wenn erforderlich
  -> Merge ausschließlich über geschützten PR
```

Kein Schritt in dieser Kette darf durch ad-hoc SQL oder einen alternativen Schemapfad abgekürzt werden. Ein ADR-0034-Fallback ersetzt ausschließlich die operative Anwendung bereits freigegebener, versionierter Migrationen; Analyse, Security, Tests, Advisor, Drift-Check und Dokumentation bleiben vollständig erforderlich.

## 5. Mindestinhalt eines Datenbank-Lovable-Prompts

Jeder Prompt für eine Datenbankänderung muss mindestens enthalten:

1. Repository und freigegebenen Ausgangs-Commit bzw. `base_sha`.
2. Eindeutig isolierte Variant/Nicht-main-Arbeitsfläche.
3. Exakt verifizierten Ziel-Datenbank-/Supabase-Kontext.
4. Ziel der Änderung.
5. Fachliches Datenmodell und betroffene Entitäten.
6. Scope und ausdrücklich ausgeschlossenen Nicht-Scope.
7. Bestehende Auth-, RBAC-, RLS- und Providergrenzen.
8. Vorgaben für Migration, Grants, RLS und Deny-by-default, soweit relevant.
9. Anforderungen an Rückwärtskompatibilität und bestehende Daten.
10. Negativtests, insbesondere Cross-Tenant/Systemhouse/Customer und IDOR/BOLA, soweit relevant.
11. Import-/Export-/Backup-/Restore-Auswirkungen, soweit relevant.
12. Verbot von Secrets, Service-Role-Keys oder produktiven Zugangsdaten in Code, Prompt und Bericht.
13. Anweisung: **analysieren -> minimal umsetzen -> testen -> dokumentieren -> Abschlussbericht -> stoppen**.

## 6. Zusätzliche Regeln für Supabase

Solange Supabase der führende MVP-Provider ist, gilt zusätzlich:

- `systemhouseId`, `customerId` und andere Fachschlüssel bleiben providerneutral.
- Supabase-Projektkennungen sind Provider-Metadaten und keine fachlichen Primärschlüssel.
- Vor jeder Änderung muss eindeutig feststehen, gegen welches Supabase-Projekt Lovable arbeitet.
- Grants und RLS werden als getrennte Schutzschichten behandelt.
- `TO authenticated` ist keine fachliche Autorisierung.
- RLS-/Autorisierungsänderungen benötigen explizite Negativtests.
- Service-Role-/Secret-Schlüssel gelangen niemals in Clientcode, Repository, Prompt oder Abschlussbericht.
- Änderungen an produktionsnahen Daten werden nicht allein aus UI-Gating abgeleitet.

## 7. Nachweis und Abnahme

Eine Datenbankänderung gilt erst als abgeschlossen, wenn mindestens dokumentiert sind:

- verwendeter Lovable-Prompt bzw. dessen nachvollziehbarer Inhalt,
- Ausgangs-Commit/`base_sha`,
- Lovable-Variant bzw. Zielbranch,
- tatsächlich erzeugter Commit und vollständiger Diff,
- erzeugte/geänderte Migrationen oder Datenbankobjekte,
- ausgeführte Datenbank-/RLS-/Security-Tests,
- CI- und Security-Gates,
- bekannte Restrisiken,
- Dokumentationsänderungen,
- manueller Retest, sofern fachlich erforderlich,
- Abschlussbericht.

## 8. Verbotene reguläre Wege

Nicht zulässig sind insbesondere:

- direkte SQL-Schreiboperationen durch ChatGPT oder Codex außerhalb des
  ausdrücklich freigegebenen ADR-0035-Fallbacks,
- direkte Migration über einen nicht an das verifizierte Lovable-Projekt
  gebundenen Supabase-Connector,
- `supabase db push --include-all` als Abkürzung,
- `supabase migration repair` oder manuelle History-Einträge zur Kaschierung von Drift,
- `apply_migration`, `execute_sql` oder vergleichbare schreibende Connector-Aufrufe außerhalb eines Lovable-Auftrags,
- manuelle Schemaänderungen im Supabase-Dashboard als regulärer Entwicklungsweg,
- direkte produktive Datenkorrekturen zur Umgehung einer Migration,
- RLS-/Grant-Änderungen ohne dokumentierten Lovable-Prompt,
- Datenbankänderungen direkt auf `main`.

## 9. Kontrollierter Work-/Lovable-Connector-Fallback

Es gibt weiterhin **keine stillschweigende technische Ausnahme**. ADR-0035 definiert jedoch einen ausdrücklich versionierten Fallback für den Sonderfall, dass Lovable eine bereits freigegebene Supabase-Migration nicht kanonisch anwenden kann und der Projekt-Owner im vollständig Lovable-verwalteten Betriebsmodell keinen separaten Supabase-Zugang besitzt.

Der Fallback ist nur zulässig, wenn **alle** Bedingungen erfüllt sind:

1. Die Migrationen liegen bereits versioniert in GitHub vor und sind Bestandteil eines freigegebenen bzw. für die Live-Basis maßgeblichen Git-Stands.
2. Ein Lovable-Preflight hat den kanonischen Apply-Pfad nachweislich als technisch nicht verfügbar oder ungeeignet dokumentiert und **ohne DB-Write** gestoppt.
3. Der lokale Checkout ist sauber und entspricht exakt dem freigegebenen Git-Commit; Dateiname, Git-Blob und SHA-256 jeder Migration sind protokolliert.
4. Die Zielbindung wird über exakte Lovable-Projekt-ID, Owner-Zuordnung, aktivierten Supabase-Stack und projektspezifischen Live-Fingerprint verifiziert.
5. Migration History und Zielobjekte zeigen als Pending-Set exakt die erwarteten Migrationen und keine zusätzlichen unbekannten Änderungen.
6. Die Migrationen sind statisch als transaktional ausführbar geprüft.
7. Die Anwendung erfolgt ausschließlich über den Datenbank-Connector des gebundenen Lovable-Projekts, byte-identisch, geordnet und je Datei in einer Transaktion mit atomarem History-Eintrag. Kein Repair und keine nachträgliche History-Korrektur.
8. Destruktive Änderungen oder produktive Datenmigrationen benötigen weiterhin eine gesonderte explizite Freigabe; der Fallback allein autorisiert sie nicht.
9. Secrets werden weder ausgegeben noch in Logs, Prompts, Code oder Dokumentation übernommen.
10. Direkt danach erfolgt ein read-only Postflight: Migration History, Schemaobjekte, RLS/Grants, Daten-/Count-Invarianten, DB-Verträge und offizieller Security Advisor.
11. Jede Abweichung im Preflight oder Postflight führt zu `BLOCKED` bzw. `FAIL`; es gibt keinen automatischen Blind-Reparaturversuch.

Der Fallback erlaubt **keine** allgemeine produktive SQL-Session und keine fachliche Datenkorrektur. Er ist ausschließlich ein alternativer Ausführungskanal für dieselben versionierten Migrationen.

> **Datenbankänderung = kanonische versionierte Migration; Lovable bevorzugt, kontrollierter Work-/Lovable-Connector-Fallback nur nach ADR-0035.**

## 10. Architekturziel bleibt unverändert

Diese Arbeitsregel macht Lovable nicht zu einer technisch unersetzbaren Laufzeitabhängigkeit.

Die Anwendung muss weiterhin:

- containerfähig,
- providerneutral in der Fachlogik,
- später auf Microsoft Entra ID, Azure SQL und Azure Storage erweiterbar bzw. migrierbar,
- unabhängig von Lovable Cloud betreibbar

bleiben.

Lovable bleibt der bevorzugte Entwicklungs- und Änderungsweg für Datenbankänderungen. ADR-0035 verhindert jedoch, dass ein zusätzlicher Supabase-Operatorzugang zur versteckten Betriebsabhängigkeit wird.
