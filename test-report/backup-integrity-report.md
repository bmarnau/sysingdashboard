# Backup-/Restore-/IO-Integritätsbericht
_Generiert: 2026-07-14T03:23:48.931Z_

- Geprüfte Fälle: **48**
- Bestanden: **48**
- Fehlgeschlagen: **0**
- Wiederherstellbarkeit: **ja**

## Kategorien
| Kategorie | Bestanden | Fehlgeschlagen | Findings |
| --- | ---: | ---: | ---: |
| backup | 13 | 0 | 0 |
| restore | 8 | 0 | 0 |
| import | 13 | 0 | 0 |
| export | 13 | 0 | 0 |
| other | 1 | 0 | 0 |

## Bekannte Einschränkungen
- **Keine Prüfsumme im Manifest** — Integrität rein über Struktur/Manifest/Nachvalidierung, siehe ADR-0015.
- **PDF-Export** wird in dieser Suite nicht semantisch validiert (nur Struktur-Tests der Text-Exports); der PDF-Pfad ist über E2E abgedeckt.
- **Rollen-/Scope-Enforcement** rein clientseitig — Backend-RBAC steht offen (SEC-CRIT-001).
