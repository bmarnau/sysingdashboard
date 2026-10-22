# Rückkehr zum GitHub-Stand 65b4790

## Was Sie selbst tun müssen (ich kann es nicht auslösen)
1. Oben im Chat den Reiter **Verlauf (History)** öffnen.
2. Den Eintrag suchen, der dem Commit `65b4790` entspricht: 22.10.2026, 10:58:34 Uhr Berliner Zeit (08:58:34 UTC), „Merge pull request #209“. Das ist der letzte Stand **vor** den Zusatzcommits `9e486930` und `c9ae1033`.
3. Diesen Stand wiederherstellen. Alternativ unter der passenden Chat-Nachricht auf **Revert** klicken.
4. Später entstandene Stände bleiben im Verlauf erhalten und lassen sich bei Bedarf erneut anwenden.

## Danach: Prüfung nur lesend (nach Ihrer Freigabe)
- HEAD und Dateibaum mit GitHub-main `65b479070b640750a83caad0ed5a001623119832` vergleichen.
- Melden, ob `client.ts`, `previewAuthStorage.ts` und `types.ts` noch abweichen.
- Keine Dateiänderungen, keine Datenbankzugriffe, keine Veröffentlichung.

## Kritischer Hinweis
- Diese drei Dateien legt die Plattform selbst an. Wahrscheinlich tauchen sie nach dem Zurücksetzen wieder auf. Ein Tree, der exakt `65b4790` entspricht, ist im verwalteten Arbeitsbereich darum nicht gesichert.
- Wenn Sie einen exakten Stand brauchen, ist das Repository auf GitHub die verlässliche Quelle. Dort können Sie lokal arbeiten oder per PR. Lovable wird dadurch nicht zur Referenz.
- Die Datenbank wird durch das Zurücksetzen nicht verändert. Bereits angewendete Migrationen bleiben aktiv.
