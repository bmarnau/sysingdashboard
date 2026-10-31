# ADR-0037: OneDrive-Arbeitsbasis und temporäre Toolchain-Umgebung

- **Status**: Accepted
- **Datum**: 2026-10-19

## Kontext

Git-Checkout und Dokumentation liegen teilweise in OneDrive. Die synchronisierte
Dateisystemschicht kann bei umfangreichen JavaScript/TypeScript-Abhängigkeiten
unvollständige Reparse-/Platzhalterverzeichnisse erzeugen. Dadurch fehlen trotz
eines gültigen Lockfiles Paketdateien oder `.bin`-Binaries und Qualitätsgates
sind nicht reproduzierbar.

## Entscheidung

Der Git-Checkout bleibt die einzige Source-of-Truth und darf in OneDrive
liegen. Für Paketinstallationen und dateisystemintensive Toolchain-Schritte wird
eine aus demselben Commit hergestellte, nicht synchronisierte temporäre Umgebung
unter `C:\tmp` verwendet. Die Commit-Identität wird vor jedem evidenzrelevanten
Lauf geprüft. Temporäre Verzeichnisse enthalten keine Secrets und werden nicht
committet oder als Arbeitsquelle verwendet.

## Alternativen

- Toolchain vollständig in OneDrive ausführen: verworfen, weil die beobachteten
  unvollständigen Paketdateien keine verlässliche Gate-Evidenz zulassen.
- Checkout aus OneDrive verlagern: nicht gewählt; dies wäre eine größere
  organisatorische Änderung und ist für den sicheren Toolchain-Pfad nicht
  erforderlich.

## Konsequenzen

Die Toolchain wird reproduzierbar, während Code, Dokumentation und Git-Historie
am bestehenden Arbeitsort bleiben. Der zusätzliche temporäre Pfad muss vor
einem Gate stets denselben Commit enthalten und darf niemals CI, Exact-Head-
Security oder den signierten Git-Kandidaten ersetzen.

## Trust-Boundary / Security-Note

`C:\tmp` ist nicht vertrauenswürdiger als der Checkout und enthält keine
Produktivsecrets. Sicherheits- und Freigabenachweise bleiben an den
Git-Commit und die serverseitigen Gates gebunden.
