# F-11 Backup-Runtime-Re-Test — Vorherzustand 2026-08-24

## Zweck

Dieser Nachweis dokumentiert den sichtbaren Ausgangszustand unmittelbar vor dem manuellen Backup-Re-Test nach PR #41. Die Beobachtungen stammen aus dem vom Betreiber bereitgestellten Screenshot der veröffentlichten Referenzumgebung und werden hier transkribiert, damit die Abnahme nicht ausschließlich an einem Chat-Anhang hängt.

## Sichtbarer Ausgangszustand

Prüfzeitpunkt: 2026-08-24, unmittelbar vor dem manuellen Re-Test.

- Dialog `Backup` öffnet vollständig und ohne sichtbaren Renderfehler.
- Anzeige `Letztes automatisches Backup`: **24.8.2026, 12:18:10**.
- Downloadbereich zeigt **28** Einträge.
- Neuester Eintrag: `dashboard-backup-2026-08-24-12-18.zip`.
- Neuester Eintrag: **24.8.2026, 12:18:10 · 26.7 KB · automatisch · geprüft**.
- Der neueste automatische Lauf ist mit grünem Prüfstatus dargestellt; die frühere Warnung `Keine typischen App-Schlüssel erkannt ...` ist bei diesem neuen Lauf nicht sichtbar.
- Im chronologisch sortierten sichtbaren Verlauf ist für den 24.08.2026 genau ein automatischer Backup-Eintrag sichtbar; der nächste Eintrag stammt vom 23.08.2026.
- Historische Einträge vor dem Fix bleiben erwartungsgemäß mit `mit Warnungen` sichtbar und werden durch den Fix nicht rückwirkend verändert.
- Der Button `Backup jetzt erstellen` ist verfügbar; für diesen Vorher-Nachweis wurde noch kein neuer manueller Lauf ausgelöst.

## Zwischenbewertung

Bereits vor dem eigentlichen manuellen Re-Test bestätigt der sichtbare neue automatische Lauf zwei erwartete Runtime-Effekte des Fixes:

1. Der aktuelle Dashboard-Speichervertrag wird vom Backup offenbar erkannt, da der neue Lauf als `geprüft` statt `mit Warnungen` erscheint.
2. Für den aktuellen Tag ist im sichtbaren chronologischen Verlauf kein doppelter automatischer Lauf erkennbar.

Der noch offene manuelle Re-Test muss zusätzlich bestätigen, dass ein manuelles Backup den Wert `Letztes automatisches Backup` **nicht** verändert und selbst ohne die frühere App-Key-Warnung abgeschlossen wird.

## Nächster Testschritt

1. Ausgangswert festhalten: `Letztes automatisches Backup = 24.8.2026, 12:18:10`.
2. Genau einmal `Backup jetzt erstellen` auslösen.
3. Nach Abschluss prüfen:
   - genau ein neuer manueller Eintrag;
   - Status `geprüft` bzw. keine frühere App-Key-Warnung;
   - `Letztes automatisches Backup` bleibt **24.8.2026, 12:18:10**;
   - neuesten Protokolleintrag aufklappen und `Prüfung`/`ZIP` kontrollieren;
   - keine Löschung, kein Restore, kein zweites manuelles Backup.

## Status

Vorherzustand: **DOKUMENTIERT**  
Automatischer neuer Lauf nach Fix: **SICHTBAR GEPRÜFT**  
Manueller Runtime-Re-Test: **NOCH OFFEN**  
Issue #40: **OFFEN bis manueller Re-Test PASS**  
F-11: weiterhin `MANUAL VERIFICATION REQUIRED`.
