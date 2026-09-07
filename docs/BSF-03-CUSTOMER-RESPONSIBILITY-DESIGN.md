# BSF-03 – Customer Responsibility / „Meine Kunden“

Stand: 2026-09-07\
Issue: #105\
Voraussetzung: BSF-02 / BSF-02C vollständig DONE

## 1. Ziel

BSF-03 ergänzt auf der bestehenden, serverseitig abgesicherten Customer-/Shared-Projection-Basis die erste echte kundenbezogene Arbeitssicht:

`Meine Kunden -> Kunde -> Projekte -> Arbeitspakete -> Tätigkeiten`

Customer Responsibility ist eine **fachliche Beziehung** zwischen Benutzer und Kunde. Sie ist **keine globale Rolle** und ersetzt weder Systemhouse Membership noch Customer Access noch fachliche Ressourcenrechte.

## 2. Verbindliche Trennung

Die drei Ebenen bleiben getrennt:

1. `systemhouse_membership` – technische Zugehörigkeit zu einem Systemhaus,
2. `customer_access` – technische Read-/Write-Zugriffsschranke auf einen Customer-Datenraum,
3. `customer_responsibility` – fachliche Verantwortung für einen Kunden.

Customer Responsibility darf niemals als RLS-Bypass oder als implizites globales Schreibrecht verwendet werden.

## 3. V1-Fachregeln

- Ein geeigneter interner Systemingenieur kann für mehrere Kunden verantwortlich sein.
- Ein Kunde besitzt in V1 höchstens **einen aktiven verantwortlichen Systemingenieur**.
- Zulässige verantwortliche Rollen: `systemadministrator`, `administrator`, `teamlead`, `projectmanager`, `engineer`.
- `viewer` und `customer` sind keine zulässigen Träger der internen Kundenverantwortung.
- Customer Identity bleibt `(systemhouseId, customerId)`.
- Benutzeridentität bleibt die stabile interne User-ID; Namen sind nur Anzeigeattribute.
- Verantwortung erhält einen Lifecycle statt Hard Delete: aktiv/beendet bzw. `valid_from`/`valid_to`.
- Historische Verantwortungen bleiben für Audit/Nachvollziehbarkeit erhalten.

## 4. Sichtbarkeitsvertrag „Meine Kunden“

Ein Kunde erscheint in „Meine Kunden“ nur, wenn **alle** Bedingungen erfüllt sind:

1. angemeldeter Benutzer ist aktiv,
2. aktive/zeitlich gültige Systemhouse Membership für dasselbe `systemhouse_id`,
3. aktive Customer Responsibility für exakt denselben `(systemhouse_id, customer_id, user_id)`-Scope,
4. mindestens aktiver `customer_access` mit `read` oder `write`,
5. erforderliches Basisrecht `dashboard.view`.

Damit gilt fail-closed:

`Meine Kunden = Responsibility ∩ Membership ∩ CustomerAccess ∩ Permission`

Eine Responsibility ohne gültigen Customer Access ist fachlich sichtbar als inkonsistente Konfiguration für Administration/Audit, darf dem Benutzer aber **keine Kundendaten eröffnen**.

## 5. Schreibrechte

Verantwortung selbst erweitert **keine** Schreibrechte.

Für Änderungen an Project/WorkPackage/Activity gelten weiterhin ausschließlich:

- `customer_access = write`,
- jeweilige fachliche Permission wie `project.edit`, `workpackage.edit`, `activity.edit`,
- bestehende Server-/RLS-Regeln.

Ein verantwortlicher Engineer mit nur `read`-Customer-Access sieht den Kunden, darf ihn aber nicht allein aufgrund der Verantwortung verändern.

## 6. Datenmodell V1

Vorgesehene providerneutrale Entität:

`CustomerResponsibility`

Mindestens:

- `id`
- `systemhouseId`
- `customerId`
- `userId`
- `status` (`active` / `ended` oder äquivalenter Lifecycle)
- `validFrom`
- `validTo?`
- `createdAt`
- `createdBy?`
- `updatedAt`
- `updatedBy?`

Datenbankseitig muss für V1 sichergestellt werden, dass pro `(systemhouse_id, customer_id)` höchstens eine aktive Verantwortung existiert. Historische beendete Zeilen dürfen parallel vorhanden bleiben.

## 7. Providergrenze

Fachlogik bleibt providerneutral:

`CustomerResponsibilityRepository -> CustomerResponsibilityService -> konkreter Provider`

Supabase ist der MVP-Provider. Spätere Entra-/Azure-SQL-/Azure-Storage- oder On-Premises-Provider dürfen das Fachmodell nicht ändern müssen.

Keine Lovable-Cloud-only Runtime-Abhängigkeit.

## 8. Server-/RLS-Sicherheitsvertrag

Mindestens folgende Regeln sind verpflichtend:

- deny by default,
- Cross-Systemhouse DENY,
- Cross-Customer DENY,
- IDOR/BOLA DENY,
- Responsibility allein reicht nicht für Customer-Datenzugriff,
- Customer Access allein macht einen Kunden nicht automatisch zu „Mein Kunde“,
- `dashboard.view` allein reicht weder für Responsibility noch Customer-Daten,
- `viewer` und `customer` können keine interne Customer Responsibility erhalten,
- Verantwortung erzeugt kein globales Rollenrecht,
- UI-Gating ist keine Security Boundary,
- keine Service Role im Browser oder normalen User-Pfad,
- RLS auf jeder neu exponierten `public`-Tabelle,
- explizite Grants; nicht auf implizite Data-API-Default-Grants verlassen.

## 9. Verantwortungsverwaltung

BSF-03 V1 trennt die **Nutzung** der Verantwortung von ihrer **Verwaltung**.

Für die Vergabe/Änderung ist ein eigener, eng begrenzter Management-Pfad vorzusehen. Bis zur finalen Implementierungsentscheidung darf dafür weder `users.manage` noch `avkk.responsibility.assign` semantisch zweckentfremdet werden.

Bevorzugte Richtung: eigene Permission `customer.responsibility.manage`, zugeordnet nur den fachlich dafür vorgesehenen internen Rollen. Diese Permission wird vor Implementierung separat gegen die RBAC-Matrix geprüft.

## 10. V1-UX

Mindestens:

### „Meine Kunden“

- Liste ausschließlich der fachlich verantworteten **und** technisch zulässigen Kunden,
- Kundenname,
- Status,
- eigener Verantwortungsstatus,
- Read-/Write-Indikator aus `customer_access`,
- leere Sicht mit verständlichem Hinweis, wenn keine zulässigen Kunden vorhanden sind.

### Kundendetail

- Kundenkopf,
- verantwortlicher Systemingenieur,
- Read-/Write-Status,
- zulässige Project-/WorkPackage-/Activity-Daten ausschließlich über den bestehenden Shared-Projection-Read-Pfad,
- keine fremden Customer-Daten.

## 11. Negativtest-Matrix vor Produktcode

Mindestens:

- R01 aktiver Verantwortlicher + Membership + read Access -> Kunde sichtbar,
- R02 aktiver Verantwortlicher + write Access -> sichtbar; Schreiben nur mit zusätzlicher Ressourcenpermission,
- R03 Responsibility ohne Customer Access -> Kundendaten DENY,
- R04 Customer Access ohne Responsibility -> nicht in „Meine Kunden“,
- R05 fremdes Systemhouse -> DENY,
- R06 fremder Customer -> DENY,
- R07 erratene Customer-ID / IDOR -> DENY,
- R08 inaktive Membership -> DENY,
- R09 inaktive/abgelaufene Responsibility -> nicht sichtbar,
- R10 inaktiver/abgelaufener Customer Access -> DENY,
- R11 `viewer` als Responsibility-Ziel -> DENY,
- R12 `customer` als Responsibility-Ziel -> DENY,
- R13 Responsibility darf keine globale Rolle/Permission hinzufügen,
- R14 read-only Verantwortlicher kann Shared Projection nicht schreiben,
- R15 fremde Responsibility nicht unberechtigt ändern/beenden,
- R16 zweiter gleichzeitig aktiver Verantwortlicher für denselben Customer -> DENY,
- R17 historisch beendete Responsibility bleibt auditierbar,
- R18 Rollen-Preview verändert nur Darstellung und umgeht keine Server-/RLS-Regel.

## 12. Import/Export und Backup/Restore

Vor Abschluss von BSF-03 ist zu prüfen:

- ob Customer Responsibility Bestandteil des kanonischen Backups werden muss,
- ob Restore die stabilen User-/Customer-IDs korrekt wiederherstellt oder fail-closed abweist,
- ob allgemeiner JSON-Import Responsibility bewusst **nicht** ungeprüft setzen darf,
- keine Namensidentität beim Import/Restore.

## 13. Lovable-Einsatz

Plan laut Snapshot: **1–2 Prompts**.

Vorgesehene Aufteilung:

1. **DB-/Security-Prompt**: Schema, Grants, RLS, sichere Management-/Read-Grenze, reproduzierbare Negativtests.
2. **UI-/Preview-Prompt nur falls nötig**: „Meine Kunden“ und Kundendetail nach festem Serververtrag, Rollen-Preview/Accessibility.

Lovable arbeitet ausschließlich auf isolierter Nicht-`main`-Variant; Integration nur über GitHub-PR und Required Checks.

## 14. Supabase-2026-Hinweis

Die aktuelle Supabase-Plattform stellt neu angelegte Tabellen nicht mehr verlässlich automatisch über die Data API bereit; Grants und RLS sind getrennte Sicherheitslagen. Eine neue `customer_responsibility`-Tabelle benötigt daher bewusst:

- explizite erforderliche Grants,
- RLS sofort aktiv,
- eng begrenzte Policies,
- keine implizite `anon`-Freigabe.

## 15. Nicht-Scope

- BSF-03D AP-Kategorien,
- BSF-03A PM-Controlling,
- BSF-03B Teamlead-Leistungsnachweis,
- BSF-03E Vertretungs-/Personensicht,
- BSF-03C Kunden-PDF,
- Abrechnung,
- vollständige Local-First-Ablösung (BSF-04),
- produktive Microsoft-/Graph-Integration.

## 16. Definition of Done

BSF-03 ist erst DONE, wenn:

- Daten-/Security-Contract implementiert und reproduzierbar negativ getestet,
- „Meine Kunden“ ausschließlich erlaubte Kunden zeigt,
- Kundendetail ausschließlich zulässige Shared-Projection-Daten liest,
- Verantwortung keine globale Rolle und keine impliziten Schreibrechte erzeugt,
- Cross-Systemhouse/Cross-Customer/IDOR/Viewer-Fälle PASS,
- Import/Export-/Backup-Restore-Auswirkungen geprüft,
- Rollen-Preview und Accessibility geprüft,
- Security + vollständige Exact-Head-CI inkl. E2E, Technical Debt und Technical Report & Quality Gate PASS,
- betroffene Hilfe/Dokumentation/Entwicklungstagebuch/Status synchron,
- Abschlussbericht erstellt,
- nächster Sprint BSF-03D / #103 eindeutig freigegeben.
