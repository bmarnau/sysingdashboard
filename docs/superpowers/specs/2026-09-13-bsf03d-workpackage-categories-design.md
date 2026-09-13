# BSF-03D – Arbeitspaket-Kategorien Design

## Status

Freigegebenes Design für Issue #103.

## Ziel

Arbeitspakete erhalten eine optionale, systemhausweit gepflegte Hauptkategorie. Kategorien werden nicht im UI hart codiert, sondern über den bestehenden Reference-Data-Plattformdienst bereitgestellt. Die Erweiterung bleibt providerneutral, tenant-sicher, RBAC/RLS-konform und rückwärtskompatibel zu bestehenden Arbeitspaketen, JSON-Import/Export und Backup.

## Fachlicher Vertrag

- Kategorie ist optional; Default ist `keine Kategorie`.
- Ein Arbeitspaket besitzt in V1 höchstens eine primäre Kategorie.
- Freie `tags` bleiben unabhängig bestehen.
- Kategorien gelten systemhausweit für alle Kunden desselben Systemhauses.
- Kategorien verschiedener Systemhäuser dürfen weder gelesen noch verwendet werden.
- Kategorien werden deaktiviert statt hart gelöscht.
- Deaktivierte Kategorien bleiben bei Altbeständen sichtbar, sind aber für neue Zuweisungen nicht auswählbar.
- Kategorie erzwingt keine Aussage über Billable, Priorität oder Status.
- AP-Templates dürfen später eine Kategorie nur als änderbaren Vorschlag setzen.

## Architekturentscheidung

Der bestehende Reference-Data-Dienst wird tenant-fähig erweitert. Es entsteht keine parallele `workpackage_category`-Sondertabelle.

### Scope-Modell

`reference_catalog` erhält:

- `scope_type text NOT NULL DEFAULT 'global'`
- zulässige Werte: `global | systemhouse`

`reference_value` erhält:

- `systemhouse_id uuid NULL`

`reference_value_history` erhält den Systemhausbezug für historische Nachvollziehbarkeit.

Regeln:

- bestehende AVKK- und andere Kataloge bleiben `global`.
- `workpackage.category` wird `systemhouse`-gescoped.
- globale Werte haben `systemhouse_id IS NULL`.
- systemhausbezogene Werte haben zwingend `systemhouse_id IS NOT NULL`.
- die fachliche Eindeutigkeit systemhausbezogener Werte ist `(catalog_id, systemhouse_id, key)`.
- der technische Key einer Kategorie wird nach Anlage nicht mehr verändert; Label, Beschreibung, Sortierung und Aktivstatus bleiben pflegbar.

## RLS / RBAC

Der bestehende Reference-Data-Vertrag bleibt Grundlage.

Lesen eines systemhausbezogenen Werts erfordert:

1. `referencedata.view`,
2. aktive Membership des angemeldeten Benutzers im betroffenen Systemhaus.

Pflege eines systemhausbezogenen Werts erfordert:

1. `referencedata.manage`,
2. aktive Membership im betroffenen Systemhaus.

Die bestehende Rollenmatrix bleibt unverändert:

- Systemadministrator: lesen + pflegen,
- Administrator: lesen + pflegen,
- Teamlead: lesen,
- Projectmanager: lesen,
- Engineer: lesen,
- Viewer: lesen, aber keine AP-Schreibrechte,
- Customer: keine zusätzlichen AP-Schreibrechte.

UI-Gating ist keine Sicherheitsgrenze. RLS und serverseitige Berechtigungen bleiben maßgeblich.

## WorkPackage-Vertrag

`WorkPackage` wird additiv erweitert:

```ts
categoryKey?: string | null;
categoryLabel?: string | null;
```

Bedeutung:

- `categoryKey`: stabile fachliche Identität,
- `categoryLabel`: Snapshot des Anzeigenamens zur Erfassungszeit.

`null` oder fehlende Felder bedeuten `keine Kategorie`.

Bei Speicherung eines Arbeitspakets darf nur ein aktiver `workpackage.category`-Wert aus dem aktiven Systemhauskontext neu zugewiesen werden. Deaktivierte Werte dürfen nur als bestehende historische Referenz erhalten bleiben.

## UI

### Arbeitspaket-Dialog

Der bestehende Dialog erhält ein Feld `Kategorie`:

- `— Keine Kategorie —`
- aktive Kategorien des aktuellen Systemhauses.

Deaktivierte Kategorie eines bestehenden AP wird als `(<deaktiviert>)` lesbar dargestellt, aber nicht als normale neue Auswahl angeboten.

### Stammdatenpflege

Es entsteht eine schlanke Seite `Arbeitspaket-Kategorien`.

Funktionen:

- Werte auflisten,
- neuen Wert anlegen,
- Label/Beschreibung/Sortierung ändern,
- Wert deaktivieren,
- kein Hard Delete.

Keine generische neue Reference-Data-Admin-Suite in diesem Sprint.

## Systemhaus-Kontext

Hat ein Benutzer genau eine aktive Membership, wird das Systemhaus automatisch verwendet.

Hat ein pflegeberechtigter Benutzer mehrere aktive Memberships, muss die Kategorieverwaltung den Systemhauskontext explizit wählen. Katalogwerte verschiedener Systemhäuser dürfen nie in einer gemeinsamen Liste vermischt werden.

## Cache V2

Der bisherige globale Browser-Key `sysing.referencedata.v1` ist für tenant-bezogene Stammdaten nicht ausreichend.

Reference Data erhält einen principal-/scope-sicheren Cache V2.

Anforderungen:

- Cache ist mindestens an Benutzer-ID und Systemhauskontext gebunden.
- Logout bzw. Benutzerwechsel darf keine Werte eines vorherigen Benutzers sichtbar machen.
- alte V1-Caches werden nicht als tenant-sichere Quelle für systemhausbezogene Werte verwendet.
- Cache enthält weiterhin keine Tokens oder Secrets.
- Offline-Lesen bleibt für den zuletzt gültigen Benutzer-/Systemhauskontext möglich; Offline-Pflege bleibt gesperrt.

## Import / Export

Das JSON-Schema wird additiv erweitert.

`WorkPackageSchema` erhält optional:

```ts
categoryKey?: string | null;
categoryLabel?: string | null;
```

Regeln:

- altes JSON ohne Kategorie bleibt gültig,
- `null` / fehlend = keine Kategorie,
- aktiver bekannter Key des Zielsystemhauses wird übernommen,
- deaktivierter Key darf historische Bestände repräsentieren,
- unbekannter oder fremder Systemhaus-Key wird nicht still umgedeutet,
- Import meldet kontrolliert Warnung/Konflikt statt stiller Substitution.

## Backup / Restore

Reference-Data-Backup wird um Scope-Information erweitert:

- `scopeType`,
- `systemhouseId` für systemhausbezogene Werte.

Restore-/Validierungslogik muss Cross-Systemhouse-Zuordnungen ablehnen und bestehende alte Backups ohne Kategorie weiterhin akzeptieren.

## Controlling-Vertrag

BSF-03D bereitet BSF-03A vor. Controlling darf später nach `categoryKey` filtern und aggregieren. Das Snapshot-Label dient nur Anzeige/Historie, nicht Identität.

## Nicht-Scope

- keine kundenindividuellen Kategorien,
- keine Mehrfach-Hauptkategorien,
- keine automatische Billable-/Priority-/Status-Ableitung,
- keine Template-Implementierung,
- keine generische Stammdaten-Plattform-UI,
- keine Änderung der bestehenden Customer-Access-Grenzen.

## Tests / Abnahmekriterien

Mindestens nachweisen:

1. Systemhaus A sieht keine Kategorie von Systemhaus B.
2. Systemhaus A kann keine Kategorie von B einem AP zuweisen.
3. `referencedata.manage` + aktive Membership erlaubt Pflege.
4. Ohne `referencedata.manage` ist Pflege DENY.
5. Ohne aktive Membership ist systemhausbezogener Read/Write DENY.
6. Viewer erhält keine neuen AP-Schreibrechte.
7. Neues AP hat standardmäßig keine Kategorie.
8. Maximal eine Kategorie pro AP.
9. Tags bleiben unabhängig.
10. Deaktivierte Kategorie bleibt in Altbestand lesbar.
11. Deaktivierte Kategorie ist für neue Zuweisungen nicht auswählbar.
12. Browser-Benutzerwechsel leakt keinen fremden Cache.
13. Altes JSON ohne Kategorie importiert weiterhin.
14. Unbekannte/fremde Kategorie wird fail-safe behandelt.
15. Backup enthält Scope und bleibt rückwärtskompatibel.
16. Security-, Static-, Unit/Component-, Backend/API-, RBAC-, Import/Export-, Backup/Restore-, Build-, Playwright-, Accessibility-, Technical-Debt- und Quality-Gates PASS.

## Sicherheitsinvarianten

- kein Service-Role-Key im Browser,
- keine neuen breiten SELECT-Policies auf Personen- oder Customer-Tabellen,
- keine Cross-Systemhouse-Freigabe,
- keine Secrets in Code, Tests oder Dokumentation,
- Providertrennung bleibt erhalten,
- GitHub bleibt führende Codebasis.
