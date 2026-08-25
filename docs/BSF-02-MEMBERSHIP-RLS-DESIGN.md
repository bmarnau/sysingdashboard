# BSF-02 — Membership-/RLS-Design vor der ersten DDL

- Stand: 2026-08-25
- Status: Design zur Abnahme
- Issue: #76
- ADR: `docs/ADR/0031-systemhouse-membership-customer-access.md`

## 1. Ziel

Dieser Zwischenschritt legt die serverseitige Autorisierungsgrenze fest, die vor der ersten gemeinsamen Customer-/Projekt-/Tätigkeits-DDL benötigt wird.

Er implementiert noch keine Datenbankmigration und verändert weder Authentifizierung noch produktive RLS-Policies.

## 2. Ausgangslage

Nach PR #81 existieren providerneutrale Customer-/Shared-Data-Typen und eine verlustfreie Migrationsplanung. Noch offen ist die produktive Sicherheitsgrenze für gemeinsam gespeicherte Daten.

Die heutige Datenbankfunktion `has_permission(uuid, text)` bewertet globale Rollen. Das genügt für BSF-02 nicht, weil kundenbezogene Mehrbenutzerdaten zusätzlich an Systemhouse- und Customer-Scope gebunden sein müssen.

## 3. Autorisierungsmodell

Für jede customerbezogene gemeinsame Zeile werden drei Ebenen getrennt bewertet:

1. Ist der Benutzer authentifiziert und aktiv?
2. Gehört der Benutzer zum betroffenen Systemhaus?
3. Besitzt der Benutzer einen zulässigen Customer-Scope und das benötigte fachliche Recht?

Nur wenn alle für die Operation erforderlichen Bedingungen erfüllt sind, darf die Datenbank den Zugriff erlauben.

## 4. Membership

Eine Systemhouse-Membership ist eine technische Zuordnung zwischen Benutzer und Systemhaus.

Sie darf mindestens folgende Eigenschaften tragen:

- stabile interne ID,
- `systemhouseId`,
- `userId`,
- Status aktiv/inaktiv,
- Gültigkeits- beziehungsweise Auditinformationen, soweit für sichere Änderungen erforderlich.

Membership allein gewährt keinen automatischen Customer-Zugriff.

## 5. Customer Access

Der technische Customer-Zugriff ist eine serverseitig persistierbare Zuordnung eines Benutzers zu einem Customer-Datenraum.

Für BSF-02 muss mindestens zwischen Lesen und Schreiben unterschieden werden können. Die konkrete fachliche Quelle dieser Zuordnung bleibt außerhalb dieses Schritts. BSF-03 kann später Kundenverantwortung als eine solche Quelle verwenden.

Der Zugriff ist immer systemhausgebunden:

```text
systemhouse:{systemhouseId}/customer:{customerId}
```

Historische `tenant:`-Scopes werden nicht automatisch konvertiert oder als Systemhouse-Scope interpretiert.

## 6. Gemeinsame Datenkette

Die aus PR #81 vorbereitete Projektion bleibt fachlich maßgeblich:

```text
Systemhouse
  -> Customer
    -> Project
      -> WorkPackage
        -> Activity
          -> Engineer/Profile
```

Parentlose Bestandsobjekte bleiben zulässig. Eine fehlende Parent-Beziehung darf nicht zu Datenverlust führen. Für die Autorisierung muss deshalb jede gemeinsam persistierte customerbezogene Zeile einen belastbaren `systemhouseId`- und, sobald aufgelöst, `customerId`-Kontext besitzen.

Unaufgelöste Customer-Kontexte werden nicht automatisch für normale Benutzer freigegeben.

## 7. Negative Security-Fälle vor DDL

Die spätere Migration und ihre Tests müssen mindestens folgende Fälle nachweisen:

- Benutzer aus Systemhaus A kann keine Zeile aus Systemhaus B lesen.
- Benutzer aus Systemhaus A kann keine Zeile aus Systemhaus B schreiben.
- Benutzer ohne Customer-Scope erhält keine fremden Customer-Daten.
- Viewer kann gemeinsame Customer-/Project-/WorkPackage-/Activity-Daten nicht schreiben.
- Eine erratene Customer-, Project-, WorkPackage- oder Activity-ID liefert keine Fremddaten.
- UPDATE kann eine Zeile nicht in ein anderes Systemhaus verschieben.
- UPDATE kann eine Zeile nicht in einen Customer verschieben, für den der Benutzer keinen Scope besitzt.
- Parent-Link-Änderungen dürfen keinen Scope-Wechsel umgehen.
- Deaktivierte Membership entzieht den Zugriff.
- Entfernen eines Customer-Scopes entzieht den customerbezogenen Zugriff.

## 8. Positive Security-Fälle

Zusätzlich müssen explizite positive Fälle vorhanden sein:

- aktiver Benutzer mit gültiger Membership und Customer-Read-Scope kann zulässige Daten lesen,
- Benutzer mit gültigem Write-Scope und bestehendem fachlichem Schreibrecht kann zulässige Daten ändern,
- reine Read-Berechtigung erlaubt kein Schreiben,
- Systemadministrator-/Servicepfade funktionieren nur über ausdrücklich definierte und getestete Ausnahmen.

## 9. Supabase-spezifische Regeln

Die Implementierung muss folgende aktuellen Supabase-Eigenschaften berücksichtigen:

- Grants bestimmen, ob `authenticated` ein Objekt über die Data API erreichen kann.
- RLS bestimmt anschließend, welche Zeilen erreichbar sind.
- Neue Tabellen dürfen nicht als automatisch exponiert angenommen werden.
- Neue Tabellen im exponierten Schema erhalten RLS, bevor ein Clientzugriff freigegeben wird.
- UPDATE-Policies benötigen passende SELECT-Sichtbarkeit sowie `USING` und `WITH CHECK`.
- `TO authenticated` allein ist keine Autorisierung gegen IDOR/BOLA.
- SECURITY-DEFINER-Funktionen werden nur bei begründeter Notwendigkeit verwendet; Ausführungsrechte werden explizit eingeschränkt.

## 10. Geplanter Implementierungsablauf

1. DDL und RLS zunächst als Migration im Repository entwerfen.
2. Statische Migrationstests für Tabellen, Grants, RLS und verbotene permissive Muster ergänzen.
3. Keine produktive Datenbankänderung vor grüner Repository-CI.
4. Das inaktive Supabase-Projekt nur bewusst für eine verifizierte Test-/Anwendungsphase reaktivieren.
5. Vor Anwendung Security- und Performance-Advisors erfassen.
6. Migration anwenden und RLS-Negativ-/Positivfälle gegen die echte Datenbank prüfen.
7. Advisors erneut ausführen.
8. Erst nach erfolgreicher DB-Verifikation Adapter und gemeinsamer Read-Pfad aktivieren.

## 11. Nicht-Scope

- keine Customer-Responsibility-Fachlogik,
- keine Customer-UI,
- keine PM-/Teamlead-Sicht,
- keine vollständige Local-First-Ablösung,
- keine Entra-/Azure-Produktivmigration,
- keine Lovable-Credits.

## 12. Abnahme dieses Designs

- Membership ist von Customer Responsibility getrennt.
- Customer Access ist serverseitig und systemhausgebunden.
- globale Rolle allein reicht nicht für Shared-Customer-Zugriff.
- Deny-by-default für fehlende oder unaufgelöste Scopes ist festgelegt.
- Cross-Systemhouse/Cross-Customer/IDOR/Viewer/Scope-Wechsel sind als Tests definiert.
- aktuelle Supabase-Grants-/RLS-Anforderungen sind berücksichtigt.
- keine produktive DB-, Auth- oder RLS-Änderung in diesem Design-PR.
