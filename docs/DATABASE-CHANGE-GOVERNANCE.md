# Database Change Governance — Sysing Dashboard

Stand: 2026-08-25  
Status: **verbindliche Projektregel**  
Geltungsbereich: Sysing Dashboard, Supabase-MVP und spätere Datenbankprovider

## 1. Verbindliche Grundregel

**Alle Änderungen an einer Datenbank erfolgen ausschließlich über einen ausdrücklich formulierten und freigegebenen Lovable-Prompt.**

ChatGPT, Codex, VS Code, lokale Skripte, direkte SQL-Sessions, Supabase-Connectoren oder andere Werkzeuge dürfen Datenbankänderungen analysieren, planen, prüfen und für einen Lovable-Prompt vorbereiten, aber **nicht selbst produktiv oder gegen die maßgebliche Entwicklungsdatenbank ausführen**.

Diese Regel gilt auch dann, wenn ein anderes Werkzeug technisch in der Lage wäre, die Änderung direkt vorzunehmen.

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

ChatGPT:

- prüft zuerst den aktuellen GitHub-Stand,
- analysiert Ziel, Auswirkungen, Abhängigkeiten und Risiken,
- definiert Datenmodell, Security-Grenzen und Abnahmekriterien,
- prüft aktuelle Supabase-/Provider-Dokumentation, wenn dies für die Änderung relevant ist,
- formuliert den kopierfertigen Lovable-Prompt,
- prüft nach dem Lovable-Lauf Branch/Variant, Commit und vollständigen Diff,
- kontrolliert CI, Security, RLS-/RBAC-Nachweise und Dokumentationsstand,
- führt selbst keine Datenbankänderung aus.

### Codex / VS Code / lokale Werkzeuge

Diese Werkzeuge dürfen:

- Code und Tests außerhalb der Live-Datenbank vorbereiten,
- SQL oder Migrationsentwürfe zu Analysezwecken erstellen,
- statische Tests und lokale Prüfungen durchführen,
- den Lovable-Prompt fachlich vorbereiten.

Sie dürfen die maßgebliche Datenbankänderung nicht direkt anwenden.

### Lovable

Lovable ist für Datenbankänderungen der **einzige reguläre Ausführungspfad**.

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

Kein Schritt in dieser Kette darf durch eine direkte Datenbankänderung eines anderen Werkzeugs abgekürzt werden.

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

Ohne vorherige Änderung dieser Governance sind insbesondere nicht zulässig:

- direkte SQL-Schreiboperationen durch ChatGPT oder Codex,
- direkte Migration über einen Supabase-Connector,
- `apply_migration`, `execute_sql` oder vergleichbare schreibende Connector-Aufrufe außerhalb eines Lovable-Auftrags,
- manuelle Schemaänderungen im Supabase-Dashboard als regulärer Entwicklungsweg,
- direkte produktive Datenkorrekturen zur Umgehung einer Migration,
- RLS-/Grant-Änderungen ohne dokumentierten Lovable-Prompt,
- Datenbankänderungen direkt auf `main`.

## 9. Ausnahmeverfahren

Es gibt **keine stillschweigende technische Ausnahme**.

Soll diese Regel später geändert werden, muss die Änderung selbst ausdrücklich als Governance-Entscheidung dokumentiert, über GitHub nachvollziehbar versioniert und über einen geschützten Pull Request integriert werden.

Bis dahin gilt:

> **Datenbankänderung = Lovable-Prompt als alleiniger regulärer Ausführungspfad.**

## 10. Architekturziel bleibt unverändert

Diese Arbeitsregel macht Lovable nicht zu einer technisch unersetzbaren Laufzeitabhängigkeit.

Die Anwendung muss weiterhin:

- containerfähig,
- providerneutral in der Fachlogik,
- später auf Microsoft Entra ID, Azure SQL und Azure Storage erweiterbar bzw. migrierbar,
- unabhängig von Lovable Cloud betreibbar

bleiben.

Lovable ist hier der verbindliche **Entwicklungs- und Änderungsweg für Datenbankänderungen**, nicht die fachliche oder betriebliche Laufzeitplattform des Produkts.
