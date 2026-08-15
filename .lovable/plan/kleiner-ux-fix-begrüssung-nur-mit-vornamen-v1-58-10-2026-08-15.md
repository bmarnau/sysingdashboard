KLEINER UX-FIX – BEGRÜSSUNG NUR MIT VORNAMEN (v1.58.10)

Ziel
Die Dashboard-Begrüßung soll ausschließlich den Vornamen verwenden, unabhängig von der Schreibweise der gespeicherten Daten: „Guten Tag, Alex." statt „Guten Tag, alex marnau.".

Priorität der Vorname-Ermittlung
1. Profilfeld `firstName` (wenn vorhanden, unverändert bevorzugen, aber getrimmt).
2. Erstes Wort aus dem fachlichen `displayName`.
3. Auth-Metadaten: `given_name`, `first_name`, oder erstes Wort von `full_name`/`name`/`display_name`.
4. Letzter Fallback: Local-Part der E-Mail-Adresse (keine vollständige E-Mail anzeigen).

Normalisierung
- Leerzeichen trimmen und mehrfache Leerzeichen zusammenfassen.
- Beispiele: `alex marnau`, `ALEX MARNAU`, `Alex Marnau`, `aLeX mArNaU` → `Alex`.
- Keine aggressive Umformatierung, die korrekte Eigenschreibweisen zusammengesetzter Namen zerstört.

Betroffene Dateien
- `src/lib/user-display-name.ts`: Neue Funktion `greetingFirstNameOf(sources)`.
- `src/routes/_authenticated/dashboard.tsx`: Zeile 590 nutzt `greetingFirstNameOf()` statt `currentUser.displayName` / `engineerState.name`. Header-/Profilanzeige und Role Preview bleiben unverändert.
- `src/__tests__/lib/user-display-name.test.ts`: Testfälle für Klein-/Großbuchstaben, gemischte Schreibweise, Leerzeichen, Display Name mit Vor- und Nachname, fehlender Display Name, Auth-Metadaten, E-Mail-Fallback, keine E-Mail-Anzeige.

Qualitätssicherung
- `bun test src/__tests__/lib/user-display-name.test.ts` erweitern und ausführen.
- `bun run docs:check` (Doku-Sync-Pflicht: CHANGELOG.md, ggf. `src/lib/help-documentation.ts` Kapitelaktualisierung).
- `bun run lint` (kein Build-Fail).
- `bun run build`.
- `bun run test` (Vollständige Testsuite).

Keine weiteren Funktionen ändern.
