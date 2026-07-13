# ADR-0010: Technical-Debt-Hybrid-Ansatz

- **Status**: Accepted
- **Datum**: 2026-07-13

## Kontext

Prompt 2A.2 fordert einen strukturierten Tech-Debt-Scanner mit ~70 Prüfpunkten
über Architektur, Frontend, Backend, API, Daten, Tests und Doku. Etwa die
Hälfte der Punkte („unklare Modulgrenzen", „zu viele Verantwortlichkeiten",
„Widersprüche zwischen README, Architektur, API und ADR", „instabile Tests")
ist nicht sinnvoll vollautomatisch entscheidbar. Ein rein regelbasierter
Scanner würde genau das erzeugen, was der Prompt verbietet: automatisch
erzeugte Scheinprobleme.

Gleichzeitig ist ein rein manueller Prozess zu leicht zu ignorieren und
skaliert nicht mit Buildständen.

## Entscheidung

Hybrider Ansatz mit einer gemeinsamen Datenstruktur:

1. **Automatisierte Detektoren** (`scripts/tech-debt/detectors/*.mjs`) für
   objektiv messbare Signale: Zyklen, Layer-Verletzungen, überdimensionierte
   Module, Endpoint-Guards, Doku-Drift, Coverage-Lücken kritischer Services,
   Console-Direktnutzung, verwaiste Module.
2. **Kuratierter Manual-Katalog** (`tech-debt/findings.json`) für alles
   Subjektive. Vom Team gepflegt, folgt demselben Schema wie automatische
   Findings.
3. **Ein Aggregator** (`scripts/tech-debt/run.mjs`) validiert beide Quellen,
   mergt, priorisiert nach vorgegebenem Ranking (Security → Datenverlust →
   … → Kosmetik) und produziert JSON-, Voll-Markdown-, Management- und
   Actions-Report sowie einen Diff gegen den vorherigen Lauf.
4. **CI-Gate nur bei Critical**: Höhere Severities gehen als Trend-Metrik in
   den Report, blockieren die Pipeline aber nicht — vermeidet, dass Debt-
   Rauschen zu Bypass-Reflexen wird.

## Alternativen

- **Reiner Auto-Scanner**: verworfen wegen unvermeidbarer False Positives bei
  subjektiven Prompt-Punkten.
- **Reiner Manual-Katalog**: verworfen — kein Regressionsschutz bei
  strukturellem Debt (Zyklen, Layer-Bruch) über Buildstände hinweg.
- **Externe Tools** (madge, knip, SonarQube): bewusst nicht als Muss ergänzt.
  Eigene minimale Detektoren decken die konkret benötigten Signale ohne
  weitere devDep-Fläche ab. Ergänzung über die Zeit möglich, sobald ein
  Signal aus dem Manual-Katalog auffällig oft auftritt.

## Konsequenzen

**Positiv**
- Berichte sind über Runs reproduzierbar (stabile IDs, Diff).
- Subjektive Debt bleibt sichtbar und pflegbar, ohne Auto-Rauschen.
- Critical-Gate zieht harten Boden ein, ohne die Trend-Sicht zu vergiften.

**Negativ / Trade-offs**
- Manual-Katalog braucht Team-Disziplin — verwaist er, fällt der Hybrid
  auf das Niveau eines reinen Auto-Scanners zurück.
- Deterministische IDs sind gegen Datei-Renamings empfindlich (Fund gilt
  dann als „neu"). Bewusst akzeptiert: Renames sind selten, das Signal ist
  informativ, nicht harter Gate.
- Regex-basierte Detektoren (Zyklen, Imports) haben Grenzen bei dynamischen
  Imports und Barrel-Files. Aktuelle Falschtreffer werden über Whitelists
  im jeweiligen Detektor gepflegt, nicht generisch stumm gestellt.

## Nicht implementierte Prüfpunkte (bewusst im Manual-Katalog)

- „Zu viele Verantwortlichkeiten pro Komponente" — braucht semantisches
  Verständnis.
- „Widerspruch zwischen README, Architektur, API und ADR" — braucht Review.
- „Instabile oder zeitabhängige Tests" — Flakiness ist ein CI-Signal,
  kein statisches.
- „Unklare Ownership" — nur mit CODEOWNERS (aktuell nicht vorhanden).
- „Rate-Limit-Vorbereitung" — Design-Entscheidung, kein Detektor-Signal.

## Trust-Boundary / Security-Note

Der Tech-Debt-Scanner liest nur Quellcode und Coverage-Reports; er hat keinen
Zugriff auf Secrets, Produktivdaten oder Azure-Endpunkte. Der bestehende
harte Security-Scan (`scripts/security-check.mjs`) bleibt getrennt und
verantwortlich für Secret- und Header-Prüfungen.
