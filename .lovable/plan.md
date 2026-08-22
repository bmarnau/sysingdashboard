# F-11 Befund „Öffnen" in Mein AVKK — Analyseergebnis und nächster Schritt

## Kurzfassung

**Reproduzierbar: NEIN (noch nicht).** Eine Reproduktion im Browser als Georg Marnau war in dieser Sitzung technisch nicht möglich: für die Preview liegt aktuell keine angemeldete Sitzung vor (Browser-Auth-Status `signed_out`), und `/dashboard` liegt hinter dem Auth-Gate. Eine Ursache lässt sich damit **nicht** belastbar benennen — jede Aussage dazu wäre geraten.

Was bereits gesichert ist:

- **Stand geprüft:** Der Arbeitsstand entspricht exakt `main` Commit `7bd21ffd44bef1a470f8c0f2a464a6aced863bf0` (Merge PR #19).
- **Keine Laufzeitfehler** im Fehler-Snapshot der Preview zum Zeitpunkt der Meldung.
- **Statische Prüfung ohne Treffer:** Kein globales CSS blendet Overlays aus (`.no-print` und `body.printing-compliance` greifen nur in `@media print`), kein Ancestor des Modals erzeugt einen Containing-Block (`transform`/`filter`/`backdrop-filter` liegt nur auf dem `header`, einem Geschwisterelement), keine `pointer-events`-Regel, kein Error-Boundary, der einen Dialog-Absturz still schlucken würde.
- **Klickpfad plausibel intakt:** `AvkkTaskTable` → `onOpen(row)` → `setSelected` → Render von `AvkkDetailDialog` in `AvkkWorkspaceView`.

## Was der Befund noch sein kann (unbestätigte Hypothesen)

1. Der Dialog mountet, bricht aber beim Laden des Dossiers/Personenverzeichnisses ab und wirkt „leer" oder wird sofort wieder verlassen.
2. Ein Re-Render der Elternkomponente (zentraler Refresh, Katalog-Reload) setzt `selected` faktisch zurück.
3. Der Dialog rendert außerhalb des sichtbaren Scrollbereichs oder unter dem Sticky-Header.
4. Der Klick erreicht den Handler gar nicht (Overlay/Layer im konkreten Viewport der Prüfung).
5. Kein Produktfehler, sondern rollenspezifisch leerer Dialoginhalt, der als „öffnet nicht" wahrgenommen wurde.

## Nächster Schritt (weiterhin ohne Codeänderung)

**Voraussetzung durch dich:** In der Lovable-Preview einmal als Georg Marnau anmelden. Danach steht die Sitzung für die automatisierte Reproduktion zur Verfügung.

Dann führe ich rein lesend aus:

1. Navigation zu `/dashboard`, Reiter „Mein AVKK", Zeile „Switch-Rollout Gebäude B", Klick auf „Öffnen".
2. Beobachtung von: Konsolenausgaben, Netzwerkaufrufen (`avkk_*` RPCs, `avkk_people_directory`), DOM nach dem Klick (existiert das Modal-Element, welche Position/Sichtbarkeit hat es), Scrollposition und Viewport.
3. Prüfung, ob der Modal-Knoten nach kurzer Zeit wieder verschwindet (State-Reset) oder dauerhaft existiert, aber unsichtbar ist.
4. Gegenprobe mit einer zweiten Rolle und einer zweiten Aufgabenzeile, um rollen- bzw. datensatzspezifisch zu unterscheiden.

## Bericht danach

Ich liefere: Reproduzierbar JA/NEIN mit Screenshot-Beleg, konkrete Ursache, betroffene Datei(en), kleinster sicherer Fixvorschlag sowie Test- und Abnahmekriterien. F-11 bleibt bis dahin offen, kein PASS.

## Alternative, falls keine Anmeldung möglich ist

Statt Browser-Reproduktion prüfe ich den Pfad über einen isolierten Komponententest (Render von `AvkkWorkspaceView` mit Demo-Zeile, simulierter Klick, Assertion auf den Dialog). Das deckt Hypothesen 1, 2 und 4 ab, nicht jedoch reine Darstellungsprobleme (Hypothese 3).
