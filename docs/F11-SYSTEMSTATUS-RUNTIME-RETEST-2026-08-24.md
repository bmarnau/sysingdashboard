# F-11 — Systemstatus Runtime-Re-Test

Stand: 2026-08-24  
Produktstand: `76247b77d9bc9e12738b350f9edfd5227b0a26b4`  
Status: **MANUELL OFFEN**

## Vorbedingungen

- PR #46 gemergt.
- CI #372 / Run `32727820709`: PASS.
- Security #363 / Run `32727820698`: PASS.
- E2E / Accessibility / Technical Debt / Technical Report / Quality Gate: PASS.
- Lovable Editstatus für `76247b77...`: `completed`.
- veröffentlichte App: `https://sysingdashboard.lovable.app`.

## Manueller Prüfschritt

Als System-Administrator:

1. `Einstellungen und Services -> Systemstatus...` öffnen.
2. keine mutierende Aktion ausführen.
3. Screenshot des Dialogs anfertigen; falls nicht alle Bereiche sichtbar sind, zwei Screenshots verwenden.

## Erwartete Kriterien

### SYSSTAT-01 — Lovable Hostingmetadaten

Bei fehlender Hostinginformation neutrale Darstellung `vom Hosting nicht bereitgestellt`; kein fälschlich roter `Not configured`-Fehler für eine tatsächlich veröffentlichte App.

### SYSSTAT-02 — minimale Metadaten

Keine Lovable Project ID in der normalen Statusansicht. Keine Tokens, Schlüssel, Passwörter, Service-Role-Keys oder internen Git-Remotes sichtbar.

### SYSSTAT-03 — aktive MVP-Plattform

Security-Bereich:

- Authentication mode: Supabase,
- Auth-Konfiguration plausibel,
- `Runtime ENV (aktive Plattform)` für Supabase ohne roten Fehler nur wegen fehlender optionaler Azure-Zielvariablen.

### SYSSTAT-04 — Azure als optionaler Zielprovider

Azure-Bereich darf fehlende Zielkonfiguration neutral anzeigen, z. B. `optional` bzw. `optional target — <n> not configured`; fehlende Azure-Zielwerte dürfen nicht die allgemeine Supabase-Security-Ampel rot machen.

## Bewertung

- Runtime-Screenshot: **OFFEN**
- SYSSTAT-01: OFFEN
- SYSSTAT-02: OFFEN
- SYSSTAT-03: OFFEN
- SYSSTAT-04: OFFEN
- Issue #42: bleibt bis zum visuellen Runtime-PASS offen.

## Regel

Automatische Tests und Codeprüfung ersetzen diesen letzten visuellen Nachweis nicht. Erst nach tatsächlicher Sichtprüfung wird dieser Nachweis auf PASS gesetzt.
