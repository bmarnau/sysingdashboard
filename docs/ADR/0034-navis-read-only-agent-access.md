# ADR-0034: NAVIS V1 als benutzerbezogener READ-only Agentenzugriff

- **Status**: Proposed
- **Datum**: 2026-09-04

## Kontext

Das Sysing Dashboard soll langfristig mit NAVIS einen eigenen Agenten erhalten. Ein erstes Zielbild ist die natürliche Frage eines angemeldeten Benutzers, beispielsweise vom Smartphone:

`Hallo NAVIS, was liegt heute für mich an?`

Die dafür benötigten Daten sind fachlich und teilweise personenbezogen bzw. kundenbezogen geschützt. Der Zugriff darf weder bestehende RBAC-/RLS-Grenzen umgehen noch eine zweite, agentenspezifische Datenhaltung oder eine dauerhafte Bindung an Supabase/Lovable Cloud erzeugen. Gleichzeitig soll die Architektur später Entra ID und Azure SQL unterstützen können.

## Entscheidung

NAVIS V1 wird als **ausschließlich lesender Agent (READ-only)** geplant.

Der Agent erhält keinen direkten Datenbankzugriff. Der Zugriff erfolgt über einen engen, providerneutralen READ-Vertrag:

```text
NAVIS / Chat-Client
      |
      | OAuth 2.0 / OpenID Connect
      v
NAVIS READ Gateway
      |
      v
PersonalWorkQueryService
      |
      v
providerneutrales Repository
      |
      v
Supabase Adapter (MVP) -> RBAC / Scope / RLS
```

Verbindliche Regeln:

1. Benutzerbezogene Authentifizierung ist erforderlich; **API-key-only ist ausgeschlossen**.
2. Der Benutzerkontext wird serverseitig aus einem geprüften, kurzlebigen Token abgeleitet.
3. Ein technischer API-Key darf, falls später erforderlich, höchstens einen Client/Dienst identifizieren und ersetzt nie Benutzeridentität oder Autorisierung.
4. Service-Role-/Admin-Schlüssel sind im NAVIS-/Chat-/MCP-Clientpfad verboten.
5. NAVIS darf nur explizit registrierte READ-Tools nutzen; generisches SQL, freie Tabellenabfragen oder direkte Supabase-Zugriffe sind verboten.
6. `PersonalWorkQueryService` bestimmt fachlich und deterministisch, was z. B. „meine Arbeit heute" bedeutet.
7. Ein `userId`-Parameter aus Prompt oder Client darf den Self-Scope nicht steuern; die Identität stammt aus dem Auth-Kontext.
8. RBAC, aktive Membership, Customer-/Project-Scope und RLS bleiben unabhängig voneinander wirksam.
9. Cross-Systemhouse, Cross-Customer und IDOR/BOLA müssen fail-closed sein.
10. Antworten führen geeignete Evidence/Provenance/Freshness mit.
11. NAVIS V1 besitzt technisch keine Schreib-, Sende-, Buchungs- oder sonstigen EXECUTE-Werkzeuge.
12. Microsoft Graph ist für die erste Sysing-READ-Frage nicht erforderlich und wird später als separater Provider mit eigenen Scopes integriert.
13. Fachservice und Repository bleiben providerneutral; Supabase ist der MVP-Adapter, später können Azure SQL und Entra ID angebunden werden.
14. Docker-/On-Premises-Betrieb darf durch die Agentenarchitektur nicht verhindert werden.

## Alternativen

### API-Key als alleinige Authentifizierung

Verworfen. Ein API-Key identifiziert nicht ausreichend den fachlichen Benutzer und kann den persönlichen Customer-/Systemhouse-Scope nicht sicher ersetzen.

### Direkter Supabase-/SQL-Zugriff für NAVIS

Verworfen. Er vergrößert die Angriffsfläche, koppelt den Agenten an das Datenbankschema und erschwert Least Privilege, Audit, Providerwechsel sowie IDOR-Schutz.

### Service Role im Agentenbackend

Verworfen für den normalen READ-Pfad. Eine Service Role würde RLS umgehen und die bestehende Benutzer-Sicherheitsgrenze entwerten.

### NAVIS V1 sofort mit PROPOSE/EXECUTE

Verworfen. READ-only reduziert Risiko, erleichtert Nachweisbarkeit und ermöglicht das getrennte Lernen/Testen von Identität, Autorisierung, Datenvertrag und Agentenformulierung.

### Direkte Microsoft-Graph-Anbindung als Voraussetzung

Verworfen. Die Frage nach dem persönlichen Sysing-Arbeitsvorrat kann über den Sysing-Fachvertrag beantwortet werden. Graph ist eine spätere, orthogonale Datenquelle.

## Konsequenzen

Positiv:

- Least Privilege ist technisch erzwingbar.
- NAVIS kann keine produktiven Daten verändern.
- bestehende RBAC-/RLS-Grenzen werden wiederverwendet statt dupliziert.
- Fachlogik bleibt unabhängig von ChatGPT/LLM, Supabase und späteren Providern.
- Azure-SQL-/Entra- und Docker-/On-Premises-Ziele bleiben erreichbar.
- Antworten können durch Evidence/Freshness nachvollziehbar werden.
- der erste Agenten-Schritt ist didaktisch und technisch klar testbar.

Negativ/Trade-offs:

- zusätzlicher Gateway-/Servicevertrag statt direktem Datenbankzugriff,
- Auth-/Token-Integration muss sauber umgesetzt und betrieben werden,
- der bestehende Shared-Read-Datenvertrag muss ggf. um Fälligkeit und persönliche Zuordnung/Verantwortung ergänzt werden,
- spätere Schreibaktionen erfordern bewusst neue Architektur-, Security- und Abnahmeentscheidungen.

## Trust-Boundary / Security-Note

Die wesentliche Trust Boundary liegt nicht im Sprachmodell, sondern in Authentifizierung, NAVIS READ Gateway, serverseitigem Self-/Customer-Scope und RLS. Prompt-Instruktionen sind keine Autorisierung.

Ein Modell darf auch bei manipulierten Prompts keinen Zugriffspfad besitzen, mit dem es:

- den Benutzer-Scope austauscht,
- fremde Customer-/Systemhouse-Daten liest,
- RLS umgeht,
- Service-Role-Rechte erlangt,
- schreibende Tools aufruft.

Die produktive Freigabe setzt positive und negative Auth-/RBAC-/RLS-/IDOR-/Prompt-Injection-Tests sowie Audit-/Freshness-Nachweise voraus.

## Verweise

- `docs/NAVIS-READ-V1-PLAN.md`
- `docs/GESAMTPLAN-SYSING-DASHBOARD.md`
- `docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.2.1.md`
- ADR-0031
- ADR-0032
