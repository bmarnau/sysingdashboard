# Golden-Gate-Toolchain-Image: Design

## Zweck und Erfolgskriterium

Das Sysing Dashboard erhält eine lokal und in CI reproduzierbare Linux-
Toolchain für Golden-Gate-Prüfungen. Sie beseitigt die Abhängigkeit von
OneDrive-Reparse-Verzeichnissen und individuellen WSL-Bootstrapzuständen,
ohne Produktcode, Supabase-Schema, RBAC/RLS oder Deployment zu verändern.

Erfolg bedeutet: Ein nicht privilegierter Container führt aus einem
unveränderten Checkout die für BSF-07-P1 relevanten Prüfungen mit den durch
`bun.lock` definierten Abhängigkeiten aus und erzeugt einen klaren PASS- oder
BLOCKED-Befund.

## Entscheidungsrahmen

- Git und `bun.lock` bleiben Source-of-Truth.
- Das Image enthält ausschließlich generische Werkzeuge: Ubuntu, Node 22,
  eine fest gepinnte Bun-Version, Git, Curl, CA-Zertifikate und Unzip.
- Das Image enthält weder Quellcode, `node_modules`, Browser-Binaries,
  Supabase noch Secrets.
- Die Abhängigkeiten werden beim Gate-Lauf mit `bun install --frozen-lockfile`
  hergestellt. Ein Cache darf beschleunigen, aber keine Evidenz ersetzen.
- Der erste Schnitt ist lokal und P1-fokussiert. Die bestehende CI wird nicht
  verändert; eine spätere Angleichung setzt einen erfolgreichen Probelauf und
  eine separate Entscheidung voraus.

## Komponenten

| Komponente | Verantwortung | Nicht enthalten |
| --- | --- | --- |
| `.devcontainer/Dockerfile` | Versionierte Golden-Gate-Linux-Toolchain bereitstellen | Anwendungscode und Abhängigkeiten |
| `.devcontainer/devcontainer.json` | Lokale Entwickleroberfläche auf dasselbe Image binden | Secrets und produktive Dienste |
| `scripts/golden-gate/run-p1-toolchain-gates.sh` | Installation und P1-Gates in fester Reihenfolge ausführen | Mutationen an Produktdaten oder Git-Historie |
| ADR-0039 | Toolchain-Image als kanonischen lokalen Gate-Fallback festlegen | CI-Migration oder Releasefreigabe |
| AQGS-ENV-01 | Ausführungsort, Source-of-Truth und Evidenzregeln ergänzen | Ersatz für Exact-Head-CI/Security |

## Gate-Ablauf

```text
Checkout + bun.lock
        │
        ▼
Container: bun install --frozen-lockfile
        │
        ▼
P1 static: prettier → lint → typecheck → docs → project status → security
        │
        ▼
P1 contracts: Composer + vier Quellvertrags-Suiten
        │
        ▼
PASS oder BLOCKED mit Befehl und Ursache
```

Der Entrypoint bricht beim ersten fehlgeschlagenen obligatorischen Gate ab.
Der Abschlussbefund nennt die ausgeführte Bun-Version, den Git-HEAD, den
Worktree-Status und das fehlgeschlagene Gate. Er schreibt keine Reports in
den Git-Checkout, außer ein vorhandener, ausdrücklich beauftragter Prüfbefehl
tut dies bereits.

## Sicherheit und Grenzen

- Container laufen ohne Produktivsecrets und ohne privilegierten Docker-
  Socket im Container.
- Der Workspace wird ausschließlich als Arbeitsverzeichnis eingebunden;
  keine Quelle wird in das Image kopiert.
- Ein lokaler PASS ist notwendige, aber keine hinreichende Freigabeevidenz.
  Signierter Commit sowie Exact-Head-CI und Security bleiben unverändert
  verpflichtend.
- Die P1-Implementierung, Auth, RLS, RBAC, Supabase-Migrationen und UI sind
  außerhalb des Schnitts.

## Validierung

1. Image bauen und Versionsausgaben für Bun und Node prüfen.
2. Entrypoint gegen den aktuellen P1-Arbeitsstand ausführen.
3. Sicherstellen, dass `bun install --frozen-lockfile` und alle bezeichneten
   Gates den tatsächlichen Exit-Status liefern.
4. Diff-Check und Doku-Sync ausführen.
5. Nach dem Probelauf festhalten, ob die Umgebung für CI-Wiederverwendung
   geeignet ist.

## Folgeentscheidung

Erst nach einem erfolgreichen Probelauf werden das allgemeine Projekt-Template
und die CI-Workflows bewertet. Eine Template-Änderung ist damit kein Teil
dieses Schnitts.
