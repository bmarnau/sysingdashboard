# ADR-0007: RBAC v2 — Resource Types, Scopes und Permission Groups

- **Status**: Accepted
- **Datum**: 2026-07-12

## Kontext

Die heutige RBAC-Matrix (ADR-0002) ist bewusst flach: sieben Rollen × eine
globale Permission-Liste. Für den geplanten Ausbau reicht das nicht mehr:

- **Multi-Customer**: das Dashboard soll pro IT-Systemhaus mehrere Mandanten
  und pro Mandant mehrere Kunden bedienen. Ein Engineer arbeitet für einen
  Kunden, ein Kunde-Login sieht ausschließlich seinen eigenen Bestand.
- **Azure Resource APIs**: Aktionen wie `azure.subscription:import` oder
  `azure.resourceGroup:build` sind ressourcenbezogen, nicht global.
- **Azure Entra ID**: Zuweisungen kommen später aus Entra-Gruppen und müssen
  sauber auf interne Rollen/Permissions abbilden lassen — inkl. Ablauf und
  Herkunftsnachweis.

Ein Big-Bang-Umbau würde Aufrufseiten in Dutzenden Komponenten brechen und
die heutige `check-rbac.mjs`-Invariante gefährden.

## Entscheidung

Wir führen **v2 additiv** ein, ohne die v1-Matrix zu verändern:

1. **Resource Types**: `tenant`, `customer`, `project`, `workpackage`,
   `activity`, `azure.subscription`, `azure.resourceGroup`, `system`.
2. **Scope-Format** (String): `tenant:{id}/customer:{id}/project:{id}/…`,
   Wildcards mit `*`, Root `*`.
3. **Permission-Format v2**: `resource:action` (z. B. `project:edit`).
   Koexistiert mit den heutigen v1-Strings (`project.edit`).
4. **Permission Groups**: benannte Bündel — UI-Composer und Ziel für
   Entra-Gruppen-Mappings. Rollen bleiben primär.
5. **RoleAssignment**: Datenmodell `principal × role × scope × source ×
   expiresAt`. Ersetzt später den impliziten „eine Rolle pro User"-Wert
   aus `UserProfile.role`.
6. **`evaluateAccess()`** ist der zukünftige Ersatz für `can()`. Solange
   keine Assignments existieren, delegiert die Funktion 1:1 an v1 → keine
   Aufrufsite-Änderung nötig.

Die v1-Matrix (`src/lib/rbac/permissions.ts` +
`backend/services/rbac.mjs`) und `scripts/check-rbac.mjs` bleiben in dieser
Iteration **unverändert**.

## Alternativen

- **Big-Bang-Migration auf Casbin/oso**: reifer, aber verlangt Runtime im
  Cloudflare Worker und macht die heutige statische Type-Sicherheit zunichte.
- **RBAC ausschließlich im Backend**: erzwingt Server-Roundtrips für jede
  UI-Sichtbarkeit; für Local-First (ADR-0003) unbrauchbar.
- **Direktes Ableiten aus Entra-Gruppen ohne interne Rollen**: koppelt
  Anwendungslogik an Verzeichnisverwaltung; jede Umbenennung einer AAD-Gruppe
  wäre ein Breaking Change.

## Konsequenzen

**Positiv**

- Vorbereitung Multi-Customer, Azure-Ressourcen und Entra-Mapping ohne
  Breaking Change.
- Klare Migration: neue Aufrufer verwenden `evaluateAccess()`, alte bleiben
  auf `can()`; beide liefern heute identische Ergebnisse.
- Datenmodell dokumentiert (Assignments, Groups, Scopes) → spätere UI
  greift auf definierte Typen zu.

**Negativ**

- Duplikation: zwei Permission-Formate (`.` vs `:`) parallel — bis v3 die
  v1-Aufrufe migriert. Muss in ADR-0008 explizit abgeschlossen werden.
- v2-Typen sind **noch nicht** im Backend-Mirror abgebildet. Backend-Scope-
  Prüfung folgt, sobald der Server sie tatsächlich braucht (kein Aufwand
  ohne Nutzen).

## Trust-Boundary / Security-Note

Wie ADR-0002: solange keine echte Authentifizierung aktiv ist, sind alle
Prüfungen UI-Komfort. Assignments sind aktuell rein lokal, ohne
Signaturprüfung. Mit Aktivierung von Entra ID / OAuth2 muss zusätzlich:

1. Backend `evaluateAccess()` als Middleware auf jedem privilegierten
   Endpoint aufrufen.
2. `RoleAssignment.source === "entra"` mit Refresh-Zyklus + Group-Claims
   verifizieren.
3. Scope-Prüfung server-seitig gegen die tatsächlichen Ressourcen-Ids
   (nicht nur String-Matching des Client-Payloads).

## Migrationspfad

| Iteration | Änderung |
| --------- | -------- |
| v1 (heute) | Matrix flach, `can()` global. |
| v2 (dieses ADR) | Typen, Groups, Assignments, `evaluateAccess()` als Fallback → kein Aufrufer-Umbau. |
| v3 | v1-Permission-Strings alias auf v2, Aufrufer schrittweise auf `evaluateAccess(user, perm, { scope })` umstellen. |
| v4 | Backend-Mirror für Assignments; `check-rbac.mjs` erweitert um Scope-Invarianten. |
| v5 | Entra-ID-Sync aktiv; `RoleAssignment.source = "entra"` durchgereicht. |
