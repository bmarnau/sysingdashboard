# Archive

Historischer Code, der aktuell nicht mehr im Runtime-Pfad genutzt wird,
aber zu Referenz- und Rollback-Zwecken erhalten bleibt.

**Regeln:**

- Kein Build-System (Vite, TanStack, CI) importiert aus diesem Verzeichnis.
- Änderungen an Dateien hier lösen keine Handbuch- oder Doku-Sync-Pflicht aus.
- Wiederherstellung erfolgt bewusst durch Verschieben zurück ins Repo mit
  begleitender ADR/CHANGELOG-Notiz.

## Inhalt

- `legacy-standalone-backend/` — Node-ESM-HTTP-Server, ersetzt in v1.16.0
  durch TanStack-Server-Routen unter `src/routes/api/`. Archiviert in v1.27.2.
