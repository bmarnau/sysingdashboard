
# Analysebericht – Auth‑Initialisierung SysIng Dashboard

Nur Analyse. Es wurden keine Dateien geändert.

## 1. Wo genau entsteht die Meldung?

Die Textzeile „**Die Anmeldung ist noch nicht konfiguriert. Bitte den Administrator kontaktieren.**" wird in `src/routes/index.tsx` (Zeilen ~82‑99) und `src/routes/auth.tsx` gerendert, sobald der Landing‑State bzw. der Auth‑Screen den Zustand `config-error` erreicht.

Ausgelöst wird der Zustand von `trySupabase()` in `src/integrations/supabase/safe-client.ts`, das seinerseits `getAuthConfigurationStatus()` aus `src/integrations/supabase/config.ts` aufruft.

## 2. Welche Bedingung löst sie aus?

`getAuthConfigurationStatus()` liefert `status: "missing"`, wenn *im Browser‑Bundle* weder `VITE_SUPABASE_URL` noch `VITE_SUPABASE_PUBLISHABLE_KEY` einen String‑Wert haben. Der `process.env`‑Fallback ist im Browser nie definiert.

## 3. Beweis aus dem live veröffentlichten Bundle

Untersucht: `https://sysingdashboard.lovable.app/assets/index-BsH2O_C8.js` (Haupt‑Chunk der aktuell publizierten Version).

- Keine der beiden erwarteten Konstanten kommt vor: kein `sb_publishable_…`, kein `zffimqwnrsuzuozsgnlc.supabase.co`, kein Vorkommen von `VITE_SUPABASE_URL` oder `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Der kompilierte Funktionskörper von `getAuthConfigurationStatus` (im Bundle `qj()`) sieht so aus:

  ```js
  function qj(){
    const t = Z0("SUPABASE_URL"),
          e = Z0("SUPABASE_PUBLISHABLE_KEY"),
          r = [];
    if(!t) r.push("SUPABASE_URL");
    if(!e) r.push("SUPABASE_PUBLISHABLE_KEY");
    if(r.length>0) return { status:"missing", ... };
    ...
  }
  ```

  Das ist ausschließlich der `readProcessEnv`‑Zweig. Der statische Block

  ```ts
  const VITE_SUPABASE_URL = typeof import.meta.env.VITE_SUPABASE_URL === "string" && ... ? ... : undefined;
  ```

  wurde vollständig als Dead‑Code entfernt, weil Vite `import.meta.env.VITE_SUPABASE_URL` **zur Build‑Zeit statisch durch `undefined` ersetzt** hat.

- Analog kompilierte `client.ts` (im Bundle `GC()`) enthält nur den `process.env.SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`‑Zweig; der VITE‑Fallback ist verschwunden.

Ergänzung Preview: In der Dev‑Preview (`localhost:8080`) sind die Variablen dagegen präsent — `curl /src/integrations/supabase/config.ts` zeigt `import.meta.env = { ..., VITE_SUPABASE_URL: "https://zffimqwnrsuzuozsgnlc.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_gMJ…" }`. Deshalb funktioniert die Preview, die Published‑App aber nicht.

## 4. Welche Konfiguration fehlt?

`VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` (sowie optional `VITE_SUPABASE_PROJECT_ID`) **waren beim Erzeugen des veröffentlichten Builds nicht in der Umgebung des Build‑Runners gesetzt**. Vite ist ein Compile‑Time‑Replacer; Variablen, die zur Build‑Zeit fehlen, sind zur Laufzeit unwiederbringlich `undefined` — auch wenn sie später in Lovable Cloud injiziert werden.

Zum Vergleich lokal:
- `.env` und Prozess‑Env enthalten `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` — Preview‑Build ist deshalb ok.
- Im publizierten Bundle: alle drei fehlen → Bundle geht in den „missing"‑Pfad.

## 5. Programmfehler oder Konfigurationsproblem?

**Konfigurationsproblem im Publish‑Build**, kein Programmfehler.

Der Code in `config.ts` (v1.41.1) und `client.ts` ist korrekt: statischer `import.meta.env`‑Zugriff, sauberer Fallback, Fehler wird abgefangen. Die Meldung ist genau der Zustand, für den er entworfen wurde. Der defekte Teil ist der Build‑Kontext.

Anmerkung: In der Preview zeigt sich zusätzlich `VITE_SUPABASE_ANON_KEY` als gesetzt, obwohl die App diesen Namen nirgends liest — die App verlangt `VITE_SUPABASE_PUBLISHABLE_KEY`. Für das Fehlerbild irrelevant, aber ein Namens‑Alias‑Risiko.

## 6. Betroffene Dateien (Nur zur Orientierung – keine Änderung geplant)

| Datei | Rolle |
|---|---|
| `src/integrations/supabase/config.ts` | Statuslogik `getAuthConfigurationStatus` (löst „missing" aus) |
| `src/integrations/supabase/safe-client.ts` | Cached‑Fassade, gibt `{ ok:false, config }` zurück |
| `src/integrations/supabase/client.ts` | Wirft „Missing Supabase environment variable(s)…" bei Direktzugriff |
| `src/routes/index.tsx` | Rendert das Banner im State `config-error` |
| `src/routes/auth.tsx` | Rendert den identischen Hinweis und sperrt Formulare |
| `src/routes/_authenticated/route.tsx` | Leitet bei `!ok` nach `/auth?reason=unavailable` |
| `.env.example` | Dokumentiert die benötigten Variablennamen |

Nicht betroffen: `AuthContext`/`SessionProvider` — im Projekt existiert kein solcher Wrapper. Auth‑State wird pro Route über `supabase.auth.getSession()` / `onAuthStateChange` gelesen. Das ist funktional korrekt.

## 7. Weitere geprüfte Punkte

- **Supabase Auth Settings** (Cloud): Email/Password aktiv, Confirm‑Email aktiv, HIBP aktiv, Anonymous aus — laut Commissioning‑Report ok. Nicht ursächlich.
- **Redirect‑URLs**: pflegt der Betreiber manuell in der Cloud‑URL‑Konfiguration; sie beeinflussen Reset/Bestätigung, nicht das Erkennen der Konfiguration im Client.
- **Publish‑Konfiguration**: Frontend‑Änderungen werden erst nach „Update" im Publish‑Dialog live. Solange der letzte publizierte Build ohne VITE‑Vars gebaut wurde, bleibt die Fehlermeldung sichtbar, selbst wenn im Editor alles „grün" ist.
- **App‑Start‑Initialisierung**: `__root.tsx` legt keine Auth‑Provider an, kein globaler `onAuthStateChange` — passt zu unserer Analyse (kein Bug hier).

## 8. Handlungsempfehlungen (nur Vorschlag, keine Umsetzung)

Priorität 1 – Ursache beseitigen:
1. Sicherstellen, dass beim Erzeugen des veröffentlichten Builds `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (und `VITE_SUPABASE_PROJECT_ID`) in der Umgebung des Build‑Runners existieren. Danach in Lovable neu publizieren („Update" im Publish‑Dialog); die Vite‑Ersetzung erfolgt bei diesem neuen Build.
2. Nach dem Neupublizieren im publizierten Bundle (`/assets/index-*.js`) verifizieren, dass die Host‑URL und `sb_publishable_…` im JS‑Text vorkommen. Erst dann liefert `getAuthConfigurationStatus()` „configured".

Priorität 2 – Diagnose robuster machen (optional, für spätere Runde):
3. Build‑Zeit‑Guard: kleiner Vite‑Plugin/Assertion, der `bun run build` abbricht, wenn `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` nicht gesetzt sind — verhindert, dass jemals wieder ein „stiller" Broken‑Publish entsteht.
4. Fehlerbanner in `index.tsx`/`auth.tsx` um einen expliziten Hinweis erweitern, dass ein Neu‑Publizieren nötig ist (Betreiber‑Ansprache). Nur Text‑Änderung.
5. `VITE_SUPABASE_ANON_KEY` als Alias in `config.ts` akzeptieren oder aus `.env`‑Vorlagen entfernen, um Verwechslung mit `VITE_SUPABASE_PUBLISHABLE_KEY` auszuschließen.

## Zusammenfassung

Die Meldung ist **kein Programmfehler**. Sie erscheint, weil das aktuell veröffentlichte Frontend‑Bundle ohne die `VITE_SUPABASE_*`‑Werte kompiliert wurde. Vite hat die entsprechenden Zweige zur Build‑Zeit als Dead‑Code entfernt; im Browser fällt `getAuthConfigurationStatus()` auf `process.env` zurück, das dort nicht existiert, und meldet korrekt „missing". Preview funktioniert, weil dort die Variablen zum Zeitpunkt des Vite‑Transforms vorhanden sind. Behebung ausschließlich über einen neuen Publish‑Build mit gesetzten `VITE_SUPABASE_*`‑Variablen.
