# F-11 — Systemstatus Runtime-Retest 2026-08-24

Status: **VORBEREITET / PRODUKTIVER STAND VERÖFFENTLICHT / MANUELLER RETEST OFFEN**

## Zweck

Gezielter manueller Re-Test der in der F-11-Administratorabnahme gefundenen Systemstatus-Findings nach dem technischen Hardening.

## Technische Fix-Evidenz

- Fix-PR: #46
- Merge-Commit auf `main`: `76247b77d9bc9e12738b350f9edfd5227b0a26b4`
- CI #372 / Run `32727820709`: PASS
- Security #363 / Run `32727820698`: PASS
- Static, Unit/Components, Backend, API, RBAC/Security, Import/Export, Backup/Restore, Production Build, Playwright E2E, Accessibility, Technical Debt, aktueller Technical Report und Quality Gate: PASS
- alter PR #43: geschlossen / superseded / nicht gemergt

## Lovable-Synchronisation und Veröffentlichung

Read-only geprüft am 2026-08-24:

- Lovable Edit für `76247b77d9bc9e12738b350f9edfd5227b0a26b4`: `completed`
- Projektstatus: `completed`
- Projekt: `published`
- Produktive URL: `https://sysingdashboard.lovable.app`
- aktuelle Lovable Preview-/Screenshot-Referenz enthält `76247b77`

Damit ist der gezielte manuelle Re-Test auf dem neuen Produktstand zulässig.

## Zu prüfende Findings

### SYSSTAT-01 — Lovable Deploymentstatus

Erwartung nach Fix:

- fehlende Hosting-Metadaten werden neutral als `vom Hosting nicht bereitgestellt` dargestellt,
- kein irreführendes rotes `Not configured`, wenn Lovable die konkrete Deployment-Metadaten nicht an `/api/status` liefert.

### SYSSTAT-02 — Lovable Project ID

Erwartung nach Fix:

- keine Lovable Project ID in der normalen Systemstatusansicht,
- öffentliche `/api/status`-Antwort enthält keine Project ID.

### SYSSTAT-03 — aktive Provider-ENV

Erwartung nach Fix:

- Supabase bleibt produktive MVP-Plattform,
- fehlende optionale Azure-Zielvariablen erzeugen kein allgemeines rotes Security-ENV-Fail,
- `Runtime ENV (aktive Plattform)` zeigt den aktiven Provider korrekt und grün/neutral.

### SYSSTAT-04 — Azure optional/readiness

Erwartung nach Fix:

- Azure-Zielprovider bleibt als optional erkennbar,
- fehlende Azure-Konfiguration wird über Count/neutralen Status dargestellt,
- verborgene ENV-Namen werden nicht mehr als `alle gesetzt` fehlinterpretiert,
- optionale Azure auth mode / Key Vault readiness sind neutral statt rot.

## Manueller Ablauf

1. Als System-Administrator in der veröffentlichten App anmelden.
2. `Einstellungen und Services → Systemstatus…` öffnen.
3. Dialog vollständig prüfen bzw. scrollen.
4. Screenshots so erstellen, dass mindestens Lovable-, Azure- und Security-Abschnitt lesbar sind.
5. Keine mutierende Admin-Aktion durchführen.
6. Ergebnis gegen SYSSTAT-01 bis SYSSTAT-04 bewerten.

## Abschlusskriterium

Issue #42 wird nur dann als `completed` geschlossen, wenn der produktive Runtime-Re-Test die vier erwarteten Darstellungen bestätigt. Bei Abweichung bleibt Issue #42 offen und der konkrete Runtime-Befund wird separat dokumentiert.
