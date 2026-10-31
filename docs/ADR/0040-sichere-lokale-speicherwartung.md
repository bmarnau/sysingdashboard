# ADR-0040: Sichere lokale Speicherwartung fuer Golden Gate

- **Status**: Accepted
- **Datum**: 2026-10-20

## Kontext

Docker-WSL-Speicher und alte, fuer Golden Gate angelegte Kandidatenverzeichnisse
unter `C:\tmp` koennen den freien Speicher des Endgeraets verringern. Globale
Docker-Prunes und rekursive Loeschbefehle sind dafuer ungeeignet, weil sie
andere Projekte, WSL-Distributionen oder noch benoetigte Evidenz betreffen
koennen.

## Entscheidung

Das Repository stellt eine lokale, abhaengigkeitsfreie PowerShell-CLI mit
optionalem interaktivem Menue bereit. Sie inventarisiert Golden-Gate-Docker-
Artefakte, freien Speicher, Docker-WSL-VHDX-Metadaten und bekannte temporaere
Golden-Gate-Verzeichnisse unter `C:\tmp`.

Der Standardmodus ist immer `Plan` und nur lesend. `Quarantine` verschiebt
einzeln bestaetigte, bekannte Kandidaten in
`C:\tmp\.golden-gate-quarantine\<UTC-Datum>`. `Purge` darf ausschliesslich
Quarantaeneeintraege nach mindestens 14 Tagen und nur mit einem zweiten,
expliziten Bestaetigungstoken endgueltig entfernen.

Docker-Bereinigung verwendet ausschliesslich die bestehende projektbegrenzte
Routine. Sie darf nur die dort freigegebenen Golden-Gate-Container und Volumes
bearbeiten. Die CLI startet oder beendet weder Docker Desktop noch WSL und
kompaktiert keine VHDX-Datei automatisch.

## Alternativen

- `docker system prune --volumes`: verworfen, weil fremde Projekte betroffen
  sein koennen.
- Direkte rekursive Loeschung unter `C:\tmp`: verworfen, weil Herkunft und
  Wiederherstellbarkeit fehlen.
- Automatisches VHDX-Compact: verworfen, weil Docker/WSL dafuer gestoppt sein
  muss und andere Distributionen betroffen sein koennen.

## Konsequenzen

Die Wartung wird nachvollziehbar und risikoarm, gibt Speicher aber nicht immer
sofort frei: Quarantaene belegt bis zum abgelaufenen Aufbewahrungszeitraum
weiter Speicher. Unbekannte Verzeichnisse bleiben sichtbar, aber unberuehrt.

Jede Aenderung protokolliert UTC-Zeit, Modus, Umfang, Grund, Quell- und
Zielpfad sowie freien Speicher davor und danach. Vertragstests muessen
Planmodus, Ausschluss fremder Verzeichnisse, Quarantaene, Wiederherstellung,
Fristpruefung und Bestaetigungstoken abdecken.

## Trust-Boundary / Security-Note

Die CLI arbeitet nur innerhalb der festgelegten Pfad- und Namensgrenzen.
Sie darf keine Secrets auslesen oder protokollieren. Ein gefundener VHDX-Pfad
ist Metadaten-Evidenz, keine Berechtigung zur Veraenderung der Datei.
