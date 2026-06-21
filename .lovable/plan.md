## Ziel
Sichere Handhabung von Azure-Secrets, kompatibel mit öffentlichem GitHub-Repo. Anwendung bleibt ohne gesetzte Werte lauffähig (Dev-Modus liefert Mocks, siehe `config/env.js`).

## Änderungen

### 1. `.env.example` (neu, committed)
```
# Azure-Verbindungen — nur in Production benötigt.
# Im Development-Modus (NODE_ENV != production) werden Mock-Daten verwendet.
AZURE_SQL_CONNECTION=
AZURE_TABLE_CONNECTION=
AZURE_STORAGE_SAS=
AZURE_CLIENT_ID=
AZURE_TENANT_ID=
```

### 2. `.gitignore` (erweitert)
Ergänze expliziten Block, auch wenn `*.local` bereits viel abfängt:
```
# Secrets
.env
.env.*
!.env.example
```

### 3. `config/secretManager.js` (neu)
Kapselt jeden ENV-Zugriff. Eigenschaften:
- **Keine Defaultwerte** für echte Verbindungen — `undefined` bleibt `undefined`.
- **Keine Roh-Strings nach außen**: öffentliche API gibt nur Booleans, maskierte Vorschauen (`"ab12…ef90"`, immer ≤ 8 sichtbare Zeichen) oder geprüfte Token-Handles zurück.
- **Privilegierter Roh-Zugriff** nur über `consume(name)` — wirft im Dev-Modus (`isDev()` aus `config/env.js`), kennzeichnet im Production-Code die einzigen erlaubten Aufrufstellen (Azure-Client-Konstruktion).
- **Logging-Schutz**: `toString`/`toJSON` der zurückgegebenen Handles geben `"[REDACTED]"`; Hilfsfunktion `mask(value)` für Diagnose-Ausgaben.
- **Keine eigenen `console.log`-Aufrufe** mit Werten; nur Namen bekannter Variablen.

Skizze:
```js
const { isDev } = require("./env");

const KNOWN = [
  "AZURE_SQL_CONNECTION",
  "AZURE_TABLE_CONNECTION",
  "AZURE_STORAGE_SAS",
  "AZURE_CLIENT_ID",
  "AZURE_TENANT_ID",
];

function raw(name) {
  return (typeof process !== "undefined" && process.env && process.env[name]) || undefined;
}

function has(name) { return Boolean(raw(name)); }

function mask(value) {
  if (!value) return "";
  const s = String(value);
  if (s.length <= 8) return "•".repeat(s.length);
  return `${s.slice(0, 2)}…${s.slice(-2)} (len=${s.length})`;
}

function preview(name) { return mask(raw(name)); }

function status() {
  return Object.fromEntries(KNOWN.map((n) => [n, has(n)]));
}

// Einziger Weg an den Klartext — nur in Production erlaubt.
function consume(name) {
  if (isDev()) {
    throw new Error(`[secretManager] consume('${name}') ist im Dev-Modus blockiert.`);
  }
  if (!KNOWN.includes(name)) {
    throw new Error(`[secretManager] Unbekannter Secret-Name '${name}'.`);
  }
  const v = raw(name);
  if (!v) throw new Error(`[secretManager] Secret '${name}' ist nicht gesetzt.`);
  return v;
}

module.exports = { has, preview, status, consume, KNOWN };
```

### 4. README-Hinweis (optional, kurzer Abschnitt)
- `.env.example` nach `.env` kopieren, leer lassen für Dev.
- Production-Deployment setzt Variablen über Hosting-Secrets, nie commiten.

## Was NICHT getan wird
- Keine `dotenv`-Abhängigkeit installiert — Lovable/Cloudflare-Workers nutzen eigene ENV-Injection; lokal kann `vite` mit `.env` arbeiten. Bei Bedarf später nachrüsten.
- Keine Anpassung bestehender Services (es gibt aktuell keinen Azure-Client im Repo).

## Kritisches Feedback / Alternativen
1. **`.env` taugt im Cloudflare-Worker-Build dieses Projekts nur eingeschränkt.** Runtime-Secrets gehören in Lovable Cloud Secrets bzw. Wrangler-`.dev.vars` (bereits in `.gitignore`). Empfehlung: `.env` ausschließlich als Konvention für lokale Node-Skripte behandeln und im README klarstellen — sonst entsteht der Eindruck, ein `.env` würde im deployten Worker gelesen.
2. **`config/secretManager.js` als CommonJS** passt zu `config/env.js`, ist aber für den App-Code (ESM/TS) umständlich. Alternative: zusätzliche `config/secretManager.d.ts` oder direkt eine `.ts`-Variante. Vorschlag bleibt CJS für Konsistenz mit dem bestehenden `env.js`; bei Wunsch auf TS umstelle.
3. **Maskierung mit Längenangabe** (`len=…`) erleichtert Debugging, leakt aber Längen-Metadaten. Falls strenger gewünscht: nur `"[set]"`/`"[unset]"` via `status()` zurückgeben und `preview()` entfernen.
4. **Echte Härtung** gegen versehentliches Logging erreicht man nicht in JS-Library-Code allein — ergänzend wäre ein Pre-Commit-Hook (`gitleaks`) oder ein CI-Scan sinnvoll. Kann als Folgeschritt eingeplant werden.
