# ADR-0038: Kontrollierter WSL-Toolchain-Fallback für Golden-Gate-Prüfungen

- **Status**: Accepted
- **Datum**: 2026-10-19

## Kontext

Die native Windows-Ausführung von Bun kann die lockfile-definierten
Abhängigkeiten dieses Projekts nicht vollständig bereitstellen: Auch nach dem
Update auf Bun 1.4.3 scheitert die Lifecycle-Queue für `msw` und `workerd`.
OneDrive-Platzhalter und Cache-Junctions verhindern anschließend belastbare
Vollgates. Eine Bereinigung fachfremder Baselinefehler oder eine zweite
Lockfile-Quelle wäre kein minimaler Weg zur P1-Abnahme.

## Entscheidung

Wenn die native Windows-Toolchain einen dokumentierten, reproduzierbaren
Lockfile-Installationsfehler zeigt, dürfen Golden-Gate-Gates in einer lokalen
WSL2-Umgebung ausgeführt werden. Der Prüfcheckout wird zuvor aus dem aktuellen
Git-Stand in einen nicht synchronisierten Linux-Temporärpfad kopiert. Die
Prüfung verwendet ausschließlich `bun.lock`, führt keine Produktivsecrets und
weist Commit-SHA sowie Worktree-Diff vor und nach dem Lauf nach.

## Alternativen

- Native Bun-/OneDrive-Ausführung: verworfen, weil der Fehler unter Bun 1.4.2
  und 1.4.3 reproduzierbar ist.
- npm als Ersatz ohne zweite Lockdatei: verworfen, weil die aufgelösten
  Versionen nicht lockfile-identisch sind und keine Release-Evidenz liefern.
- Breite Bereinigung aller globalen Typecheck-/Lintbefunde: nicht Teil von P1
  und kein minimaler Weg zur Composer-Abnahme.

## Konsequenzen

WSL ist ein kontrollierter lokaler Ausführungsfallback, keine neue
Source-of-Truth. Code, Dokumentation, Commits und Pull Requests bleiben im
Git-Checkout. CI und Exact-Head-Security bleiben weiterhin verbindlich.
Vor jedem Lauf ist der nichtinteraktive WSL-Preflight nach AQGS-ENV-01
erforderlich; fehlerhafte Host- oder Benutzerkonfigurationen werden vor der
Toolchain als Infrastrukturblocker behoben oder dokumentiert.
Benötigt das Bootstrap privilegierte Paketinstallationen, wird `sudo -n true`
vorab geprüft. Bei interaktiver Authentifizierung führt ausschließlich der
Benutzer den dokumentierten Bootstrap aus; Passwörter werden nie an Agenten
oder Logs übergeben.

## Trust-Boundary / Security-Note

Der WSL-Temporärpfad erhält keine Produktivsecrets. Fehlende oder abweichende
Commit-/Diff-Evidenz macht einen Lauf ungültig; der Fallback autorisiert weder
Deployment noch Direkt-Merge.
