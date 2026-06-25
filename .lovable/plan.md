## Sicherheitsbaseline — Befund (kein Code geändert)

### Geprüfter Umfang
- `src/**` (Frontend + TanStack-Server-Routes), `backend/**`, `config/**`, `.github/workflows/**`.
- Suchen nach: Azure-SDKs, Connection Strings, SAS-Tokens (`sv=`, `sig=`, `AccountKey=`), API-Keys, `fetch`-Ziele, `localStorage`, `dangerouslySetInnerHTML`, Fehler-/Stacktrace-Ausgaben, Eingabevalidierung.

---

### Check-1-Ergebnis

| Punkt | Status | Beleg |
|---|---|---|
| Keine Secrets im Frontend | bestanden | Keine Treffer für `AccountKey`/`AZURE_*`-Werte in `src/`. `config/secretManager.mjs` läuft nur Server-seitig, `consume()` im Dev hart blockiert. |
| Keine SAS-Tokens im Frontend | bestanden | Keine `sv=`/`sig=`/`?se=`-Strings im Bundle-Pfad. Variable `AZURE_STORAGE_SAS` existiert nur als Name in `secretManager.KNOWN` (kein Wert). |
| Keine Connection Strings im Frontend | bestanden | Keine `Server=`/`Endpoint=`/`DefaultEndpointsProtocol`-Literale in `src/`. |
| Keine direkte Azure-Nutzung im Client | bestanden | Frontend ruft ausschließlich `fetch("/api/status")` (`useSystemStatusHealth.ts:57`). Kein `@azure/*`-Import, kein `tedious`, kein `mssql`. „Azure" im Client ist nur ein Export-Format-Label (NDJSON). |
| Keine Stacktraces/Secrets in Fehlerausgaben | bestanden mit Hinweis | `src/routes/api/sync.ts` und `status.ts` antworten generisch (`{ ok:false, error:"Sync failed" }`, Status 500), ohne `err.message`/`err.stack`. `console.error` läuft nur serverseitig (`src/server.ts`, `src/start.ts`) bzw. clientseitig mit eigenen, kurzen Labels — keine Roh-Errors an die UI. |
| Dashboard ohne Azure lauffähig | bestanden | Kein Azure-Pfad im Render-Tree; `/api/sync` liefert im Dev nur Mock-Daten (`assertAzureAllowed()`). UI funktioniert vollständig ohne gesetzte Azure-Secrets. |

---

### Kritische Risiken
Keine.

### Mittlere Risiken
1. **`console.error(error)` in `src/routes/__root.tsx:37` und `src/start.ts:12`** geben das vollständige Error-Objekt aus. Im SSR landet das in Server-Logs (akzeptabel), im Client jedoch in DevTools — keine PII oder Secrets im aktuellen Code, aber als Muster fragil. Empfehlung: nur `error?.message` oder eine ID loggen.
2. **`src/server.ts:65`** loggt `consumeLastCapturedError() ?? new Error("h3 swallowed SSR error: …")` mit komplettem Body. Serverlog, nicht clientseitig sichtbar — Restrisiko, wenn Body Tokens enthielte. Empfehlung: Body auf 256 Zeichen kürzen.
3. **`src/components/ui/chart.tsx:73`** nutzt `dangerouslySetInnerHTML`. Inhalt ist Recharts-CSS aus statischer Config (kein User-Input). Niedrig-mittleres Restrisiko — als Konvention dokumentieren, dass dieser Slot nie User-Input bekommt.

### Niedrige Risiken
4. **localStorage als Datenablage** (`user-management.ts`, `backup-service.ts`, `engineer-target-time.ts`, …): enthält keine Geheimnisse (Filter-Listen in `json-schema.ts`/`backup-service.ts` schließen `password`, `secret`, `token`, `apikey`, `mfa_secret`, `*_token` aktiv aus). Restrisiko: XSS würde Profile lesen können — aktuell aber keine XSS-Senken mit User-Input. Empfehlung: bei späterer Auth keine Session-Token in `localStorage`, sondern in HttpOnly-Cookies.
5. **`/api/sync` ist unauthentifiziert**. Heute liefert es im Dev nur Mock-Daten, in Production triggert es einen Sync-Lauf. Empfehlung: vor Production-Modus eine simple Auth (signierte Header oder `_authenticated`-Layout) ergänzen, sonst kann jeder Besucher Syncs auslösen.
6. **Zod-Schemata in `json-schema.ts`** validieren Typen, aber viele Felder ohne `max(...)`-Längenbegrenzung (`firstName`, `name`, …). Risiko: unbounded Import-Payloads. Empfehlung: einheitliches `max(255)`/`max(2000)` analog zu Input-Validation-Guidelines.
7. **Workflow-Lint-Schritt** (`bun run lint || true`) verschluckt Lint-Fehler. Kein Security-Issue, aber verbirgt Regeln wie `no-eval`. Empfehlung: `|| true` entfernen.

---

### Konkrete Maßnahmen nach Priorität

**P1 — vor Production-Schalter**
- `/api/sync` und ggf. `/api/status` mit Auth absichern (z. B. `requireSupabaseAuth`-Middleware oder Header-Token); aktuell anonym aufrufbar.
- `src/routes/__root.tsx` und `src/start.ts`: nur `error.message` (gekürzt) loggen, keine vollen Objekte.

**P2 — kurzfristig**
- Längenlimits in allen `json-schema.ts`-Strings (`.max(...)`) ergänzen.
- `src/server.ts:65` Body auf max. 256 Zeichen kürzen, bevor er ins Log geht.
- `chart.tsx`-`dangerouslySetInnerHTML`-Slot mit Code-Kommentar gegen User-Input-Wiederverwendung absichern.

**P3 — Hygiene**
- `bun run lint || true` → `bun run lint` in `.github/workflows/ci.yml`.
- Doku im Handbuch ergänzen: „Anonyme `/api/*`-Endpunkte sind nur für Dev-Mock zulässig" und Plan für spätere Auth.
- Security-Memory aktualisieren: „Azure ist optional, nie im Browser-Bundle; `/api/sync` aktuell anonym und nur Mock; passwortlose User-Verwaltung in localStorage".

---

### Geplante nächste Schritte (Build-Mode-Bestätigung nötig)
Wenn du grünes Licht gibst, würde ich in dieser Reihenfolge umsetzen:
1. P1-Logging-Härtung (`__root.tsx`, `start.ts`, `server.ts`).
2. Auth-Gate-Entscheidung für `/api/sync` — **brauche deinen Input**: a) Header-Token aus Build-Secret, b) `_authenticated`-Layout (Supabase aktivieren), oder c) nur in Dev erlaubt, in Production 401.
3. Zod-`max()`-Limits, Lint-Workflow-Fix, Doku/Changelog-Update (1.17.3), Security-Memory aktualisieren.

Keine Code-Änderung in diesem Schritt — der Plan ist die Lieferung.
