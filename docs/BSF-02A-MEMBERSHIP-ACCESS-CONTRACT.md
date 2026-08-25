# BSF-02A — Providerneutraler Membership-/Customer-Access-Contract

Stand: 2026-08-25  
Status: Implementierung zur Abnahme  
Issue: #83  
Grundlage: ADR-0031 / PR #82

## Ziel

Dieser Schritt bildet die spätere serverseitige RLS-Entscheidung zunächst als reine, providerneutrale Fachfunktion ab. Damit sind die Sicherheitsregeln reproduzierbar testbar, bevor eine Supabase-Migration gegen das richtige Projekt erzeugt und ausgeführt wird.

## Umgesetzt

`src/lib/customer-data/access.ts` definiert:

- technische Systemhouse-Membership,
- technischen Customer-Access-Scope,
- getrennte Read-/Write-Stufen,
- Gültigkeitszeiträume und Aktivstatus,
- eine Deny-by-default-Zugriffsentscheidung.

Die Entscheidung benötigt immer:

```text
fachliches Ressourcenrecht
  UND
aktive Systemhouse-Membership
  UND
aktiven Customer-Scope für exakt (systemhouseId, customerId)
```

Ein `write`-Scope erlaubt Lesen und Schreiben. Ein `read`-Scope erlaubt niemals Schreiben.

## Sicherheitsregeln

- Customer-ID ohne passendes `systemhouseId` reicht nie aus.
- Membership allein gewährt keinen Customer-Zugriff.
- Customer-Scope allein gewährt ohne Membership keinen Zugriff.
- Customer-Scope allein erzeugt ohne fachliches Ressourcenrecht kein Schreibrecht.
- inaktive, zukünftige, abgelaufene oder ungültig datierte Zuordnungen failen geschlossen.
- erratene Customer-IDs erhalten keinen Zugriff.
- der providerneutrale Contract enthält bewusst keinen impliziten Systemadministrator-Bypass.
- privilegierte Service-/Adminpfade müssen später separat, explizit und testbar umgesetzt werden.

## Tests

`src/__tests__/unit/customer-access.test.ts` prüft mindestens:

- positiven Read-Fall,
- `write`-Scope darf lesen,
- `read`-Scope darf nicht schreiben,
- fehlendes fachliches Schreibrecht blockiert trotz `write`-Scope,
- Cross-Systemhouse deny,
- Cross-Customer deny,
- erratene Customer-ID deny,
- inaktive Membership deny,
- zukünftige/abgelaufene Membership deny,
- inaktiver/ zukünftiger/abgelaufener Customer-Scope deny,
- kein impliziter Systemadmin-Bypass,
- ungültige Gültigkeitsdaten failen geschlossen.

Die bereits vorhandene Security-Layer-Prüfung überwacht `src/lib/customer-data` zusätzlich darauf, dass keine Supabase- oder privilegierten Serverclients in die providerneutralen Fachmodule gelangen.

## Supabase-/DDL-Gate

Die Live-DDL bleibt in diesem Schritt bewusst ausgesetzt.

Verifizierter Projektbezug im Repository:

```text
supabase/config.toml -> zffimqwnrsuzuozsgnlc
```

Der aktuell verfügbare Supabase-Connector zeigt dagegen ausschließlich:

```text
ondriolofnxpuockhxrc
```

Da diese Kennungen nicht übereinstimmen, wird über den Connector keine Datenbank verändert.

Zusätzlich steht in der aktuellen Ausführungsumgebung keine Supabase-CLI zur Verfügung und der Code-Container besitzt keinen externen DNS-Zugriff. Entsprechend wird kein Migrationsdateiname manuell erfunden. Die spätere Migration wird regulär mit `supabase migration new ...` gegen einen eindeutig verifizierten Projekt-/Workspace-Kontext erzeugt.

## Aktuelle Supabase-Regeln für die spätere Umsetzung

Für den späteren DDL-/RLS-PR gelten nach aktueller Supabase-Dokumentation weiterhin:

- Grants und RLS sind getrennte Schutzschichten.
- Neue `public`-Tabellen dürfen nicht als automatisch Data-API-exponiert angenommen werden.
- RLS muss auf exponierten Tabellen aktiv sein.
- UPDATE benötigt eine passende SELECT-Policy sowie `USING` und `WITH CHECK`.
- `TO authenticated` allein ist keine fachliche Autorisierung.
- Service-Role-/Secret-Schlüssel bleiben ausschließlich serverseitig.

## Nicht-Scope

- keine Supabase-Migration oder Live-DDL,
- keine Auth-/RLS-Runtimeänderung,
- keine Customer-UI,
- keine Kundenverantwortung aus BSF-03,
- keine Projektmanager-/Teamlead-Funktion,
- keine Versionsanhebung,
- keine Lovable-Credits.

## Nächster Schritt

Nach grüner Abnahme dieses Contracts:

1. korrekten Supabase-Projektbezug für `zffimqwnrsuzuozsgnlc` herstellen oder anderweitig eindeutig bestätigen,
2. Supabase-CLI in einem geeigneten Entwicklungs-/CI-Kontext verwenden,
3. Migration regulär erzeugen,
4. `systemhouse`, `systemhouse_membership`, `customer` und technischen Customer-Access-Scope mit expliziten Grants + RLS implementieren,
5. echte RLS-Negativtests gegen die Datenbank ausführen,
6. erst danach gemeinsame Project-/WorkPackage-/Activity-Projektionen anbinden.
