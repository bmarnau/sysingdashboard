# ADR-0039: Kanonisches Golden-Gate-Toolchain-Image

- **Status**: Accepted
- **Datum**: 2026-10-19

## Kontext

Die native Windows-/OneDrive-Toolchain und der kontrollierte WSL-Fallback
können die durch `bun.lock` definierte P1-Prüfumgebung nicht zuverlässig
bereitstellen. Die bestehende GitHub-CI verwendet bereits Ubuntu und Bun,
jedoch noch keine versionierte, lokal wiederverwendbare Toolchain-Definition.

## Entscheidung

Das Projekt führt ein eigenes, versionskontrolliertes Dev-Container-Image als
kanonischen lokalen Golden-Gate-Toolchain-Fallback ein. Es pinnt Ubuntu, Node
22 und Bun, enthält nur generische Build-Werkzeuge und führt das P1-Gate über
einen projektversionierten Entrypoint aus. Abhängigkeiten werden ausschließlich
mit `bun install --frozen-lockfile` aus `bun.lock` hergestellt.

Das Image enthält weder Arbeitsquellcode noch `node_modules`, Browser-Binaries,
Supabase, Docker-Socket oder Secrets. Der Gate-Lauf bindet den Checkout ein,
läuft nicht als Root und protokolliert HEAD, Worktree-Zustand sowie Bun-/Node-
Versionen.

## Alternativen

- Native Windows-/OneDrive-Toolchain: verworfen, weil Reparse-Verzeichnisse
  und Bun-Lifecyclefehler keine belastbare lokale Evidenz liefern.
- WSL-Toolchain als alleiniger Standard: verworfen, weil deren Bootstrap vom
  Benutzer- und Hostzustand abhängt.
- npm-Fallback ohne zweite Lockdatei: verworfen, weil er nicht
  lockfile-identische Versionen auflöst.

## Konsequenzen

Ein erfolgreicher lokaler Containerlauf ist notwendige lokale Evidenz, ersetzt
aber keinen signierten Kandidaten, keine Exact-Head-CI und keine Exact-Head-
Security. Die bestehende CI und gemeinsame Templates werden erst nach einem
erfolgreichen P1-Pilot separat bewertet. Das Image verändert weder Produktcode
noch Deployment.

## Trust-Boundary / Security-Note

Container erhalten keine Produktivsecrets. Nicht verfügbare Docker-
Infrastruktur wird als `BLOCKED` dokumentiert; sie darf nicht durch einen
unspezifizierten Host-Fallback als PASS ersetzt werden.
