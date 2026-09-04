# NAVIS READ V1 - Architektur- und Umsetzungsplan

Stand: 2026-09-04  
Status: BESCHLOSSENES ZIELBILD / noch nicht produktiv umgesetzt  
Bezug: BSF-10 KI-/Agenten-Labor, SYSING-001, ADR-0034

## 1. Zweck

NAVIS ist der Eigenname des zukünftigen Agenten des Sysing Dashboards. NAVIS V1 wird bewusst als rein lesender Agent geplant. Das erste fachliche Ziel ist eine belastbare Antwort auf Fragen wie:

`Hallo NAVIS, was liegt heute für mich an?`

Die Antwort darf nur aus dem autorisierten persönlichen Arbeitskontext des angemeldeten Benutzers entstehen. NAVIS besitzt in V1 keine Schreib-, Sende-, Buchungs- oder Automatisierungsrechte.

## 2. Verbindliche V1-Grenze

Erlaubt:

- autorisierte Daten lesen,
- priorisieren und zusammenfassen,
- fachliche Zusammenhänge erklären,
- Evidence/Provenance/Freshness nennen,
- Deep Links oder sichere Objektverweise liefern, sofern autorisiert.

Nicht erlaubt:

- Projekte, Arbeitspakete, Tätigkeiten oder AVKK-Daten anlegen/ändern/löschen,
- Status/Priorität verändern,
- Zeiten oder Leistungen buchen,
- Mails senden oder produktive Entwürfe anlegen,
- Kalender oder SharePoint verändern,
- beliebiges SQL oder generische Tabellenabfragen,
- Service-Role-/Admin-Bypass.

Jede spätere PROPOSE-/EXECUTE-Stufe benötigt eine neue Architektur- und Sicherheitsentscheidung.

## 3. Zielarchitektur

```text
Smartphone / Desktop / Chat-Oberfläche
               |
               | OAuth 2.0 / OpenID Connect
               | kurzlebiger Benutzerkontext
               v
        NAVIS READ Gateway
               |
               | registrierte READ-Tools
               v
     PersonalWorkQueryService
               |
               | deterministische Fachregeln
               v
       providerneutrales Repository
               |
               +--> Supabase Adapter (MVP)
               |       |
               |       +--> RBAC / Membership / Customer Scope / RLS
               |
               +--> später Azure SQL Adapter

strukturierte, minimale Daten + Evidence/Freshness
               |
               v
             NAVIS
               |
               v
     verständliche READ-only Antwort
```

## 4. Identität und Authentifizierung

NAVIS V1 braucht eine echte Benutzeridentität. API-key-only ist ausgeschlossen.

Geplanter Grundsatz:

- OAuth 2.0 / OpenID Connect für benutzerbezogene Anmeldung,
- kurzlebige Access Tokens,
- serverseitige Ableitung der Sysing-Identität,
- keine frei wählbare `userId` im Agenten-Tool,
- heute Mapping auf Supabase Auth möglich,
- später Entra ID als austauschbarer Identity Provider,
- keine produktiven Tokens/Secrets in Prompts, Logs oder Repository.

Ein API-Key kann später optional einen technischen Client kennzeichnen, ersetzt aber niemals Benutzeridentität und Autorisierung.

## 5. Autorisierung und Trust Boundaries

Jeder READ-Aufruf muss mindestens folgende Grenzen respektieren:

1. gültige Benutzeridentität,
2. aktives Konto,
3. aktive Systemhouse-Mitgliedschaft,
4. benötigte Permission, z. B. `dashboard.view`,
5. Customer-/Project-Scope,
6. RLS auf Datensatzebene,
7. Cross-Systemhouse/Cross-Customer/IDOR/BOLA fail-closed.

RLS bleibt die letzte Datenbankschranke. UI-Filterung und Agenten-Prompt sind keine Sicherheitsgrenzen.

## 6. Fachvertrag `PersonalWorkQueryService`

Die Fachlogik entscheidet, was „für mich" und „heute" bedeutet. Das Sprachmodell darf diese Zuordnung nicht selbst herstellen.

V1-Kandidaten:

- `getMyWorkForToday()`
- `getMyOverdueWork()`
- `getMyOpenWorkPackages()`
- `getMyCustomerContext(customerId)`

Mögliche Fachregel für `getMyWorkForToday()`:

```text
relevante Arbeit heute =
    eigene/zugeordnete offene Arbeitspakete
  + heute fällige offene Arbeitspakete
  + überfällige offene Arbeitspakete
  + gültige eigene Verantwortlichkeiten, soweit für die Frage relevant
```

Die endgültige Regel muss versioniert, testbar und unabhängig vom Modell formuliert sein.

## 7. Datenvertrag

Für eine verlässliche persönliche Tagesabfrage müssen mindestens verfügbar sein:

- stabile Objekt-ID,
- Systemhouse-/Customer-Scope,
- Projekt- und Arbeitspaketbezug,
- Status,
- Priorität,
- Fälligkeit bzw. Zeitbezug,
- persönliche Zuordnung/Verantwortung,
- optional AVKK-Kontext,
- Source/Provenance,
- Freshness/Datenstand.

Falls Fälligkeit oder persönliche Zuordnung im Shared-Read-Modell noch nicht ausreichend zentral verfügbar sind, werden diese im regulären Domänen-/Projection-Modell ergänzt. Es entsteht keine NAVIS-Sonderdatenbank.

## 8. Evidence und Audit

NAVIS-Antworten müssen belegbar sein. Der READ-Pfad liefert deshalb strukturierte Evidence, ohne unnötig Chat-Inhalte zu protokollieren.

Mindestens:

- sichere Objekt-/Quellreferenz,
- Datenstand,
- Provider/normalisierte Herkunft,
- ausgeführter READ-Tool-Name,
- Benutzer-/Scope-Kontext in auditierbarer, datensparsamer Form,
- Ergebnisstatus erlaubt/verweigert.

## 9. Microsoft Graph ist zunächst orthogonal

NAVIS V1 benötigt Microsoft Graph nicht, um Sysing-Dashboard-Daten zu lesen. Später können Microsoft-365-Quellen als getrennte Provider hinzukommen:

- Exchange Online / Mail,
- Kalender,
- SharePoint.

Jede Quelle erhält eigene Scopes, Provideradapter, Security-Gates und Audit-Regeln. Ein M365-Token darf nicht still als genereller Sysing-Zugriff dienen und umgekehrt.

## 10. Lern- und Umsetzungsstufen

### BSF-10A - NAVIS READ Contract Lab

- Mock-/Demodaten,
- PersonalWorkQueryService als providerneutraler Vertrag,
- kleine registrierte READ-Tool-Liste,
- Evidence/Freshness,
- keine produktiven Secrets,
- Negativtests gegen Scope-Escape.

Gate: sichere, reproduzierbare Demo `Was liegt heute für mich an?` ausschließlich READ.

### BSF-10B - Auth-/Scope-Prototyp

- Benutzeridentität über Auth-Adapter,
- OAuth/OIDC-Zielvertrag,
- Ableitung des Self-Scope aus authentifizierter Identität,
- RBAC/RLS-/IDOR-Negativtests,
- weiterhin keine Schreibwerkzeuge.

Gate: kein Benutzer kann durch Toolparameter oder Prompt einen fremden Scope erzwingen.

### Produktiver NAVIS-READ-Pilot nach BSF-FINAL und Integration Readiness

- realer READ-Gateway-Endpunkt,
- kontrollierte echte Daten,
- OAuth/OIDC,
- Rate Limits/Monitoring/Audit,
- Docker-/On-Premises-kompatibler Betrieb,
- mobile/desktop Nutzung,
- Security-/Datenschutz-/Betriebsfreigabe.

Gate: `Was liegt heute für mich an?` liefert ausschließlich aktuellen eigenen autorisierten Arbeitskontext.

## 11. Testmatrix

Positive Tests:

- Benutzer erhält eigene fällige Arbeit,
- eigene überfällige Arbeit wird erkannt,
- erlaubter Customer-Kontext wird korrekt geliefert,
- Antwort enthält Freshness/Evidence.

Negative Tests:

- fremde `userId` im Prompt/Toolparameter -> DENY/ignoriert,
- fremder Customer -> DENY,
- anderes Systemhouse -> DENY,
- deaktivierter Benutzer -> DENY,
- fehlende Membership -> DENY,
- fehlende Permission -> DENY,
- direkte Objekt-ID ohne Scope -> DENY,
- versuchte Prompt-Injection auf SQL/Service Role -> keine Tool-Fähigkeit vorhanden,
- Schreibaufforderung wie „setze erledigt" -> NAVIS erklärt READ-only Grenze, keine Änderung.

Regression:

- bestehende RBAC/RLS-Suite bleibt grün,
- Shared-Read-/Publish-Pfade bleiben unverändert sicher,
- Providervertrag enthält keine Supabase-spezifische Fachlogik,
- keine neue Lovable-Cloud-Laufzeitabhängigkeit.

## 12. Abnahmekriterien NAVIS V1

- [ ] READ-only technisch erzwungen, nicht nur per Prompt.
- [ ] API-key-only ausgeschlossen.
- [ ] Kein Service-Role-Key im Agentenpfad.
- [ ] Benutzeridentität serverseitig aus geprüftem Token abgeleitet.
- [ ] PersonalWorkQueryService providerneutral.
- [ ] Supabase bleibt Adapter, nicht Fachvertrag.
- [ ] RBAC + Membership + Customer Scope + RLS wirksam.
- [ ] Cross-Scope-/IDOR-Negativtests PASS.
- [ ] Evidence/Provenance/Freshness vorhanden.
- [ ] Audit datensparsam vorhanden.
- [ ] Docker-/On-Premises-Fähigkeit nicht blockiert.
- [ ] Azure SQL/Entra ID später ohne Änderung der Fachlogik anschließbar.
- [ ] TDF SYSING-001, Architektur- und Prüfbericht synchron aktualisiert.

## 13. Nichtziele von V1

- kein autonomer Agent,
- kein PROPOSE mit produktivem Seiteneffekt,
- kein EXECUTE,
- kein E-Mail-/Kalender-/SharePoint-Schreiben,
- kein Agenten-eigenes Berechtigungsmodell,
- kein zweiter Datenbestand,
- keine direkte Datenbankfreigabe an ChatGPT/LLM.

## 14. Referenzen

- `docs/GESAMTPLAN-SYSING-DASHBOARD.md`
- `docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.2.1.md` (Living Source; Metadatenversion 0.3.0)
- `docs/ADR/0031-systemhouse-membership-customer-access.md`
- `docs/ADR/0032-bsf-02c-shared-projection.md`
- `docs/ADR/0034-navis-read-only-agent-access.md`
- `docs/POST-MVP-PLAN.md`
