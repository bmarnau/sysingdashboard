# ADR-0002: Frontend-RBAC gespiegelt zum Backend

- **Status**: Accepted
- **Datum**: 2026-07-08

## Kontext
Das Dashboard hat Rollen (System-Admin, Admin, Teamleiter, Projektmanager,
Engineer, Kunde, Viewer). UI-Elemente (Buttons, Menüs, Dialoge) müssen abhängig
von der Rolle ein-/ausblendbar sein, ohne für jede Aktion einen Server-Roundtrip
zu machen.

## Entscheidung
Die Permission-Matrix lebt zweimal:

- **Frontend**: `src/lib/rbac/permissions.ts` — `can(user, permission)` +
  `<PermissionGate>`-Komponente.
- **Backend**: `backend/services/rbac.mjs` — identische Matrix.

`scripts/check-rbac.mjs` läuft in CI und schlägt fehl, wenn die beiden Matrizen
divergieren. Komponenten prüfen **nie** direkt `user.role === '…'`, sondern
immer `can()` oder `<PermissionGate permission="…">`.

## Alternativen
- **Nur Backend-RBAC** — jeder UI-Refresh triggert Requests; UX schlecht.
- **Nur Frontend-RBAC** — Server vertraut Client, klassische Privilege-Escalation.
- **RBAC in einer JSON-Datei, beide Runtimes laden** — vermeidet Duplikation,
  koppelt Frontend aber an Runtime-Fetch statt statischer Types (Bundle-Größe,
  Type-Safety verloren).

## Konsequenzen
Positiv:
- UI-Updates sind sofort ohne Latenz.
- Type-safe Permissions in beiden Runtimes.
- Automatisierter Drift-Check.

Negativ:
- Zwei Files pflegen — vergessen des Backend-Updates bricht CI (gewollt).

## Trust-Boundary / Security-Note

**Wichtig für neue Entwickler**: Solange keine echte Authentifizierung aktiv
ist (Entra ID / OAuth2 folgt), ist die Frontend-RBAC **ausschließlich
UX-Komfort und KEINE Sicherheitsgrenze**. `getActiveUser()` liest aus
`localStorage` und ist trivial manipulierbar. Auch das Backend prüft
Permissions derzeit nicht durchgängig — Server-Routen sind offen.

Sobald Auth eingeführt wird:
1. `requireSupabaseAuth`-Middleware (o. ä.) auf allen Server-Functions.
2. `can()` **zusätzlich** server-seitig — nie „nur weil Frontend prüft".
3. Ownership-Filter (`ownerId`) server-seitig durchsetzen; die im Code
   dokumentierte Ownership-Semantik für `workpackage.edit` / `activity.edit`
   ist heute reine Konvention.
