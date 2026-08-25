# ADR-0032 — BSF-02C als abgeleitete persistente Shared Projection

- **Status**: Accepted
- **Datum**: 2026-08-25
- **Vorgänger**: ADR-0030, ADR-0031

## Kontext

Project, WorkPackage und Activity werden im aktuellen MVP weiterhin benutzerspezifisch
Local-First im Browser gespeichert. Ein Server kann diese Daten nicht aus dem
`localStorage` eines anderen Benutzers lesen. Gleichzeitig benötigen BSF-03 und spätere
Führungssichten einen serverseitig lesbaren, Customer-gebundenen Mehrbenutzerpfad.

Eine vollständige zentrale, kanonische Datenhaltung würde BSF-04 vorwegnehmen. Eine
reine Read-API ohne persistente Projektion kann das Local-First-Problem technisch nicht
lösen. Deshalb wird für BSF-02C nur der gemeinsam benötigte Datenschnitt persistiert.

## Entscheidung

### 1. Persistente Shared Projection statt kanonischer Zentraldatenbank

BSF-02C führt abgeleitete, persistente Shared-Projection-Objekte für Project,
WorkPackage und Activity ein. Die Local-First-Arbeitskopie bleibt bis BSF-04 die
operative Quelle des jeweiligen Benutzers.

Die Projektion ist additiv und enthält nur Felder, die für gemeinsame Customer-Sichten
benötigt werden. Import, Export, Backup und Restore werden in BSF-02C nicht auf die
Projektion als neue kanonische Quelle umgestellt.

### 2. Customer Scope bleibt harte Sicherheitsgrenze

Jede Projection-Zeile trägt `systemhouse_id` und `customer_id`. Lesen und Schreiben
müssen serverseitig mindestens folgende Bedingungen erfüllen:

1. aktives Konto,
2. aktive und zeitlich gültige Systemhouse-Membership,
3. aktiven und zeitlich gültigen Customer Access für exakt
   `(systemhouse_id, customer_id)`,
4. das fachliche Ressourcenrecht der jeweiligen Operation.

`dashboard.view`, eine globale Rolle oder eine bekannte Objekt-ID reichen allein nicht.

### 3. Server-Route ist zusätzliche Validierung, nicht die Security Boundary

Der bevorzugte Publish-Pfad ist:

```text
Browser
  -> dedizierte Server-Function/Route
  -> Supabase mit demselben User-JWT
  -> Grants + RLS
```

Die Server-Route validiert Payload und Session erneut. Sie ersetzt RLS nicht.
Authenticated-Benutzer dürfen eine Publish-Regel nicht durch direkte Data-API-DML
umgehen können. Deshalb müssen die DB-Policies selbst Customer-Scope, fachliche
Permission und die jeweilige Publisher-/Ownership-Regel erzwingen.

Im normalen Publish-Pfad wird keine Service Role verwendet.

### 4. Publish-Autorität wird explizit getrennt

Für Project- und WorkPackage-Strukturdaten ist mindestens erforderlich:

- Customer Access `write`,
- `project.edit`.

Ein Engineer erhält nicht allein aus `workpackage.edit` das Recht, beliebige gemeinsame
WorkPackage-Strukturdaten zu veröffentlichen, solange keine belastbare serverseitige
WorkPackage-Ownership existiert.

Für Activity gilt zusätzlich:

- Customer Access `write`,
- `activity.edit`,
- `engineer_id = auth.uid()`.

Damit kann ein manipulierter Client keine Leistung einem anderen Benutzer zuschreiben.
Ein administrativer Fremd-Publish-Pfad ist nicht Teil von BSF-02C.

### 5. Publisher ist Provenance, nicht automatisch Objektidentität

Bestehende lokale Source-IDs wie `P-101` oder `WP-2041` sind nicht nachweislich
systemhausweit eindeutig. Identische Fixture-IDs und user-scoped Local-First-Buckets
machen Kollisionen möglich.

`published_by` wird deshalb als Provenance-/Autoritätsmerkmal gespeichert, aber nicht
unreflektiert als Bestandteil einer fachlichen Project-/WorkPackage-Identität verwendet.
Sonst würden zwei berechtigte Publisher dasselbe fachliche Objekt als getrennte
Projektwelten duplizieren.

Vor DDL muss für jede Entity eine eindeutige, AVKK-kompatible Identitätsregel festgelegt
werden. Bestehende Source-IDs werden nicht still neu vergeben. Falls Eindeutigkeit nur
publisher-scoped beweisbar ist, muss dies als Übergangsmodell ausdrücklich dokumentiert
und bei Reads deduplizierungsfrei behandelt werden.

### 6. Parent- und Customer-Auflösung ist fail-closed

Nur eindeutig aufgelöste Customer-Zuordnungen dürfen veröffentlicht werden.

Für Parent-Beziehungen gilt:

- `none`: ein ausdrücklich parentloses Objekt darf `NULL` als Parent besitzen,
- `linked`: der referenzierte Parent muss serverseitig vorhanden und Customer-konsistent
  sein,
- `missing`: nicht veröffentlichen; als unresolved/skipped melden.

Es gibt keine automatische Customer-Zuordnung allein aus `project.client` oder einem
ähnlichen Anzeigenamen.

### 7. Stale Projection wird publisher-eigen zurückgezogen

BSF-02C verwendet Soft Withdraw bzw. eine äquivalente Aktivkennzeichnung statt globalem
Cascade-Delete. Snapshot-Reconciliation darf nur Projection-Zeilen zurückziehen, für die
der aktuelle Publisher autoritativ ist.

Ein Publisher darf dadurch keine Projektionen anderer Benutzer löschen oder
still überschreiben.

### 8. Mehrere Publisher werden sichtbar statt still zusammengeführt

BSF-02C baut keine vollständige Konflikt- oder Sync-Engine. Mindestens gespeichert bzw.
nachweisbar werden jedoch Publisher, Publish-Zeitpunkt und eine geeignete Revisions- oder
Source-Hash-Information, damit konkurrierende Publikationen sichtbar und auditierbar
bleiben.

Stilles unkontrolliertes Last-Writer-Wins ist nicht zulässig.

### 9. Providergrenze bleibt erhalten

Domänenmodell, Publish-Service und Read-Service bleiben providerneutral. Supabase ist der
MVP-Adapter. Spätere Azure-SQL-/Entra-/Docker-/On-Premises-Implementierungen müssen den
gleichen fachlichen Contract abbilden können.

Der bestehende `/api/sync`-Pfad wird nicht wiederverwendet; er bleibt Azure Import/Export.

## Alternativen

- **Kanonische zentrale Project-/WorkPackage-/Activity-Tabellen**: verworfen für BSF-02C,
  weil dies BSF-04 vorwegnehmen würde.
- **Reine serverseitige Read-API ohne Persistenz**: verworfen, weil der Server fremdes
  Browser-`localStorage` nicht lesen kann.
- **Service-Role-Publish**: verworfen als Normalweg, weil dadurch die User-RLS-Grenze
  unnötig umgangen würde.
- **Publisher im Unique-Key als endgültige Fachidentität**: nicht akzeptiert, weil
  mehrere berechtigte Publisher sonst parallele Kopien desselben fachlichen Objekts
  erzeugen können.

## Konsequenzen

- BSF-03 kann auf einer echten serverseitigen Customer-Datenbasis aufbauen.
- Local-First bleibt zunächst erhalten; BSF-04 bleibt notwendig.
- Publishing wird sicherheitskritischer und benötigt echte RLS-/Grant-Negativtests.
- ID-Kollisionen und konkurrierende Publisher müssen vor DDL explizit gelöst werden.
- Unresolved Daten bleiben lokal erhalten und werden nicht geraten oder verworfen.

## Trust-Boundary / Security-Note

Die Sicherheitsgrenze liegt in der Datenbank und im serverseitigen Contract, nicht in der
UI und nicht allein in der Publish-Route. Jede später freigegebene DML-Operation muss in
RLS selbst Customer Access, fachliche Permission und Ownership/Publisher-Regeln prüfen.

DB-, RLS-, Grant- und Function-Änderungen werden gemäß
`docs/DATABASE-CHANGE-GOVERNANCE.md` ausschließlich über einen ausdrücklich
freigegebenen Lovable-Prompt umgesetzt.
