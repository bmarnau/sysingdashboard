# Plan: S0-04 – Variant auf GitHub-main vorbereiten

## Vorprüfung (bereits lesend durchgeführt, 22.10.2026)
- base_sha (GitHub-main): `228addf0a6cc403b0cd2b0a08014bfe5b74603d2`
- Lovable-Stand: HEAD `c1e339b21287e86731ef8b66e62351e717dfd6a0`, keine nicht gespeicherten Änderungen
- Abweichungen zu main, ausschließlich die drei erlaubten Plattformdateien, alle Prüfsummen stimmen:
  - `src/integrations/supabase/client.ts` (geändert): `f8484c686a271fec973cb843be7cd6efe4ad027ca96ab4b1b3315eff79da26cc`
  - `src/integrations/supabase/previewAuthStorage.ts` (neu): `5b00130146b77ecd8ed49f118c640d3e75aa7c5e76695f3b9e3f7f8833719f0a`
  - `src/integrations/supabase/types.ts` (geändert): `ef467ecf24731aa25fc71e51c97e699906832d3ffabac916354507b94e4ed144`
- Supabase-Projekt-Referenz: `zffimqwnrsuzuozsgnlc`

## Wichtiger Hinweis vor Freigabe
Damit Sie diesen Plan sehen können, muss die Plattform die Plandatei `.lovable/plan.md` speichern. Das ist ein vierter Unterschied zu main, der nicht auf Ihrer Ausnahmeliste steht. Nach der Freigabe archiviert die Plattform die Datei automatisch. Bleibt danach noch ein Unterschied in `.lovable/` übrig, stoppe ich gemäß Auftrag.

## Schritte nach Freigabe
1. Abgleich erneut lesend ausführen: main-SHA, Dateiliste und SHA-256 der drei Plattformdateien. Jede andere Abweichung führt zu STOP, Bericht und keiner Variant.
2. Nur bei sauberem Ergebnis eine isolierte Variant anlegen (Name „S0-04 DB-Vorbereitung“). Sie startet vom zuletzt gespeicherten Lovable-Stand. Die Variant erhält keinen Arbeitsauftrag.
3. Die Variant nur lesend prüfen: HEAD und Dateiunterschiede zu base_sha müssen genau die drei Plattformdateien sein, mit identischen Prüfsummen.
4. Bericht mit allen Pflichtfeldern, danach stoppen.

## Nicht Teil des Auftrags
Keine Migration, kein SQL, kein Datenbankzugriff, keine Codeänderung, kein Commit auf main, kein Veröffentlichen, keine Änderung an den drei Plattformdateien. Die GitHub-Verbindung bleibt auf main, Preview und Publish bleiben unverändert.

## Restunsicherheit
- Den verbundenen Git-Sync-Branch kann ich mit meinen Werkzeugen nicht auslesen. Dass er `main` ist, bleibt deshalb nicht unabhängig nachgewiesen.
- Ob die Variant technisch exakt auf base_sha gepinnt werden kann oder nur vom gespeicherten Lovable-Stand startet, belegt erst die Prüfung in Schritt 3.
