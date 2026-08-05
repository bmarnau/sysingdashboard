/**
 * Statische Textdokumente, die jedem Backup-Archiv beiliegen.
 */

export const README_MD = `# Dashboard-Backup

Dieses ZIP enthält ein vollständiges Daten-Backup des Systemingenieur-Dashboards.

## Inhalt

- \`manifest.json\` – Metadaten und die vollständige Zuordnungstabelle
  \`entries[]\` (logischer Name, Ziel-Schlüssel, Speicheradresse, SHA-256-Prüfsumme,
  Größe, Dateityp). Nur darüber erfolgt die Wiederherstellung.
- \`data/…\` – die gesicherten localStorage-Einträge; die Dateinamen sind reine
  Speicheradressen ohne fachliche Bedeutung
- \`archive-index.json\` – Index der lokalen Export-Ablage (ohne Blobs)
- \`INSTALL.md\` – Anleitung zur Wiederherstellung und zum Quellcode-Export
- \`.env.example\` – Platzhalter für umgebungsspezifische Werte

## Hinweis zu Quellcode

Aus der laufenden Browser-App heraus kann der Quellcode des Dashboards
nicht gesichert werden. Den vollständigen, installierbaren Projekt-Quellcode
für Ihren eigenen Webserver erhalten Sie über Lovable (Code-Editor →
Codebase herunterladen) oder über die GitHub-Integration. Details siehe
\`INSTALL.md\`.
`;

export const INSTALL_MD = `# Installation & Wiederherstellung

## 1. Daten wiederherstellen

Die Dateien unter \`data/\` entsprechen jeweils einem Eintrag im localStorage.
Zum Wiederherstellen können sie in einem neuen Dashboard über die geplante
"Restore"-Funktion eingespielt werden, oder manuell:

1. Öffnen Sie das Dashboard in Ihrem Browser.
2. Öffnen Sie die DevTools (F12) → Application → Local Storage.
3. Für jeden Eintrag in \`manifest.json\` → \`entries[]\` mit gesetztem
   \`storageKey\`: Schlüssel = \`storageKey\`, Wert = Inhalt der Datei unter
   \`path\`. Der Dateiname selbst ist bedeutungslos.
4. Seite neu laden.

## 2. Quellcode für eigenen Webserver

Das ZIP enthält bewusst KEINEN Quellcode — die App läuft im Browser und hat
keinen Zugriff auf das Projekt-Repository.

Sie erhalten den vollständigen Quellcode auf zwei Wegen:

### A) Direkter Download (empfohlen)
1. In Lovable den Code-Editor öffnen.
2. Unten in der Datei-Seitenleiste auf **Codebase herunterladen** klicken.
3. Das ZIP enthält Quellcode, Konfigurationen, \`public/\`-Assets und
   Build-Skripte.

### B) Über GitHub
1. Im Lovable-Editor: Plus-Menü (+) → GitHub → Projekt verbinden.
2. Auf GitHub das Repository öffnen → **Code → Download ZIP** oder
   \`git clone <repo-url>\`.

### Anschließend lokal bauen
\`\`\`bash
npm install        # oder: bun install
npm run build      # oder: bun run build
\`\`\`

Das Build-Resultat (\`dist/\` bzw. der Server-Output) kann auf jedem
statischen Webserver oder Edge-Host bereitgestellt werden.

## 3. .env

Echte Zugangsdaten werden NIE in dieses Backup geschrieben. Verwenden Sie
\`.env.example\` als Vorlage und tragen Sie Ihre Werte direkt auf dem
Zielserver ein.
`;

export const ENV_EXAMPLE = `# Beispiel-Umgebungsvariablen für das Dashboard.
# Echte Werte gehören NICHT in dieses Backup — auf dem Zielserver setzen.

# VITE_SUPABASE_URL=https://<project>.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
`;
