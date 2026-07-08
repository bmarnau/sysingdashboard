# ADR-0005: Frontend-Logger + IndexedDB-Ringbuffer statt Sentry

- **Status**: Accepted
- **Datum**: 2026-07-08

## Kontext
Debugging beim Kunden vor Ort erfordert nachvollziehbare Logs, aber das
Dashboard verarbeitet potenziell projekt- und kundenspezifische Daten
(Arbeitspaket-Titel, Kundennamen). Ein automatischer Log-Upload zu einem
US-basierten SaaS ist datenschutzrechtlich problematisch.

## Entscheidung
Eigener strukturierter Logger (`src/lib/logger.ts`) mit Levels
`debug` / `info` / `warn` / `error`. In DEV zusätzlich Console-Ausgabe, in PROD
persistiert ein **Ringbuffer in IndexedDB** (`src/lib/logger.indexeddb.ts`,
letzte N Einträge). Kein automatischer Upload. Export per Nutzer-Aktion aus dem
Systemstatus-Dialog.

`scripts/check-no-console.mjs` verhindert in CI direkte `console.*`-Aufrufe
außerhalb der Logger-Interna.

## Alternativen
- **Sentry / Datadog RUM** — automatische Fehlererfassung, aber DSGVO-Aufwand
  (AVV, Sub-Prozessor-Register), monatliche Kosten, PII-Scrubbing wäre unsere
  Verantwortung.
- **Nur `console.*`** — geht in Cloudflare-Worker-Logs verloren, im Browser
  nach Refresh weg.
- **Server-Endpoint zum Log-Upload** — braucht Backend-DB, Auth, Retention-
  Policy; unverhältnismäßig für aktuelle Betriebsgröße.

## Konsequenzen
Positiv:
- Keine Kundendaten verlassen den Browser ohne explizite Nutzeraktion.
- Zero externe Kosten.
- Logger-API zwingt zu strukturiertem Kontext (`{ userId, operation, … }`)
  statt String-Concat.

Negativ:
- **Keine automatische Fehler-Alerting** — Bugs werden erst gemeldet, wenn ein
  Nutzer sich beschwert.
- Aggregierte Fehlerstatistik über alle Nutzer fehlt.
- IndexedDB kann von Nutzern manuell gelöscht werden — Logs sind nicht
  „forensisch sicher".

## Trust-Boundary / Security-Note
**Nie Secrets/Tokens loggen.** Nur IDs. Der Logger schwärzt selbst nicht —
Aufrufer sind verantwortlich. Ein zukünftiger PII-Scrubber (Regex-basiert vor
dem IndexedDB-Write) ist offen.
