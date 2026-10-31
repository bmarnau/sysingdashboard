# Golden-Gate Storage Maintenance: Design

## Ziel und Erfolgskriterien

Eine lokale PowerShell-CLI/TUI schafft nachvollziehbaren Speicher ueber
Golden-Gate-Artefakte frei, ohne Docker, WSL, fremde Projekte oder unbekannte
`C:\tmp`-Inhalte zu gefaehrden. Erfolg bedeutet: Jede potenziell destruktive
Aktion ist vorab sichtbar, einzeln bestaetigt, reversibel oder fristgebunden
und vollstaendig protokolliert.

## Ablage und Komponenten

Die App liegt im Standard-Repository `sysingdashboard-codex` unter
`scripts/golden-gate/storage-maintenance.ps1`.

- **Inventur** liest C:-Freiplatz, Docker-Status, Docker-WSL-VHDX-Metadaten,
  die bestehende Docker-Purge-Planung und bekannte `C:\tmp`-Kandidaten.
- **Klassifikation** akzeptiert nur bekannte, durch den Golden-Gate-Standard
  erzeugte Verzeichnisnamen, zunaechst `sysingdashboard-p1-candidate-*`.
  Alles andere wird als `UNKNOWN` angezeigt und nie zur Aktion angeboten.
- **Quarantaene** verschiebt einen explizit gewaelten Kandidaten atomar soweit
  das Dateisystem dies erlaubt in `C:\tmp\.golden-gate-quarantine\<UTC>\`.
  Das Manifest speichert Originalpfad, Zeit, Groesse und Grund.
- **Wiederherstellung** verschiebt einen Quarantaeneintrag nur an seinen
  Originalpfad zurueck, wenn dieser noch nicht existiert.
- **Endbereinigung** akzeptiert ausschliesslich Quarantaeneintraege mit Alter
  von mindestens 14 mal 24 Stunden und zweitem Bestaetigungstoken.
- **Ereignisprotokoll** ist append-only im Quarantaeneverzeichnis und erfasst
  Modus, UTC-Zeit, Ergebnis, Klassifikation sowie Speicher davor/danach.

## Schnittstelle

Die CLI stellt diese Modi bereit:

```text
storage-maintenance.ps1 -Mode Plan [-Scope Docker|Tmp|All]
storage-maintenance.ps1 -Mode Quarantine -CandidateId <id> -ConfirmationToken QUARANTINE_GOLDEN_GATE_TMP
storage-maintenance.ps1 -Mode Restore -CandidateId <id> -ConfirmationToken RESTORE_GOLDEN_GATE_TMP
storage-maintenance.ps1 -Mode Purge -CandidateId <id> -ConfirmationToken PURGE_GOLDEN_GATE_QUARANTINE
storage-maintenance.ps1 -Interactive
```

`-Interactive` zeigt dieselben Daten und fragt vor dem Aufruf eines
schreibenden Modus erneut nach Token und Kandidaten-ID. Die interaktive Ansicht
besitzt keine weitergehenden Rechte als die CLI.

## Sicherheits- und Fehlerverhalten

- Ohne passenden Modus, Kandidaten-ID und Token bleibt jede schreibende Aktion
  `BLOCKED`.
- Alle Pfade werden vor Aktion kanonisiert und muessen innerhalb von `C:\tmp`
  oder dessen Quarantaeneverzeichnis liegen.
- Docker wird nur mit `Plan` ueber die vorhandene Purge-Routine inventarisiert;
  Docker-`Apply`, VHDX-Compact, Docker- oder WSL-Stopp liegen ausserhalb der
  App.
- Fehlende Rechte, belegter Zielpfad, nicht vorhandener Kandidat oder
  unzureichendes Alter bleiben konkrete `BLOCKED`-Ereignisse; es erfolgt keine
  automatische Ursachenforschung.

## Testplan

1. Unit-/Vertragstests: unbekannte Pfade, Pfadtraversal, Token, Alter,
   Kandidatenklassifikation und Docker-Delegation.
2. Isolierter `C:\tmp`-Fixture: Plan erkennt nur den markierten Kandidaten;
   Quarantaene und Restore erhalten Inhalte und Manifest.
3. Purge-Fixture: juenger als 14 Tage wird blockiert; kuenstlich gealtertes
   Manifest wird erst mit zweitem Token bereinigt.
4. Docker-Testlauf: nur eindeutig gelabelte Test-Artefakte werden durch den
   bestehenden Plan/Apply-Vertrag erfasst; fremde Artefakte bleiben sichtbar
   ausgeschlossen.
5. Testbericht: Freiplatz vor/nach jedem schreibenden Schritt und alle Events
   werden in der Golden-Gate-Evidenz dokumentiert.

## Nicht im Umfang

Keine allgemeine Windows-Datentraegerbereinigung, keine automatische
VHDX-Kompaktierung, keine Fremdprojektbereinigung, keine Netzwerkdienste und
keine GUI-Abhaengigkeit.
