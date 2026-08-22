# Lovable-Prompt — F-11 Delegations-Personenverzeichnis anwenden und prüfen

Stand: 2026-08-22

## Prompt

Arbeite ausschließlich im bestehenden Projekt **Sysing Dashboard** auf Basis des nach Merge aktuellen GitHub-`main`.

## Ziel

Behebe den bereits analysierten F-11-Laufzeitblocker für AVKK-Delegation, ohne die Architektur oder Berechtigungsmatrix zu erweitern:

- bestehende Verantwortliche müssen als korrekter **Vorname Nachname** erscheinen, niemals als technische UUID;
- `teamlead` und `projectmanager` müssen bei vorhandener Berechtigung `avkk.responsibility.assign` aktive zulässige Personen auswählen können;
- vollständige Benutzerprofile dürfen dafür **nicht** freigegeben werden;
- Engineer/Viewer erhalten dadurch keine zusätzlichen Schreib- oder Benutzerverwaltungsrechte.

## Verbindliche Grundlage

Nutze ausschließlich die bereits im Repository enthaltene Implementierung und Migration für `public.avkk_people_directory()`.

Die RPC ist ein datensparsamer AVKK-Vertrag. Sie liefert nur:

- User-ID
- fachlichen Namen, bevorzugt `Vorname Nachname`
- Rolle
- Status

Sie darf keine E-Mail, Telefonnummer, MFA-Daten, Profilbilder oder sonstigen Profildaten offenlegen.

## Vorgehen

1. **Analysieren**
   - Prüfe zuerst den aktuellen GitHub-`main` und bestätige, dass der F-11-Fix mit `avkk_people_directory()` enthalten ist.
   - Prüfe die aktuell verbundene Supabase-Datenbank des Lovable-Projekts.
   - Prüfe vor jeder Änderung, ob die Funktion bereits vorhanden ist und ob ihr SQL dem Repository-Stand entspricht.

2. **Umsetzen**
   - Falls die Migration noch nicht angewendet ist, wende exakt die Repository-Migration für `avkk_people_directory()` auf die mit diesem Lovable-Projekt verbundene Supabase-Datenbank an.
   - Keine pauschale neue SELECT-Policy auf `profiles` oder `user_roles` anlegen.
   - Keine produktiven Schlüssel oder Secrets ausgeben.
   - Keine Rollen oder Demo-Benutzer verändern.
   - Keine produktiven Datenzuordnungen als Test verändern.

3. **Technisch testen**
   - Prüfe, dass `PUBLIC` und `anon` kein EXECUTE auf `avkk_people_directory()` besitzen.
   - Prüfe, dass `authenticated` EXECUTE besitzt.
   - Prüfe, dass die bestehende Self-/Admin-RLS für `profiles` und `user_roles` unverändert bleibt.
   - Prüfe, dass das Frontend ohne TypeScript-/Buildfehler baut.
   - Prüfe in der Preview nur lesend, dass der AVKK-Detaildialog geladen werden kann.

4. **Darstellung prüfen**
   - Personenanzeige verwendet fachlich `Vorname Nachname`, sofern Vor- und Nachname vorhanden sind.
   - Eine technische UUID darf nicht als Personenname gerendert werden.
   - Wenn das Personenverzeichnis nicht verfügbar ist, muss die UI einen verständlichen Fehlerzustand zeigen und neue Delegation deaktivieren statt eine unvollständige Personenliste vorzutäuschen.

5. **Dokumentieren**
   - Ergänze nur notwendige technische Dokumentation zum angewendeten Datenbankstand.
   - F-11 noch **nicht** als vollständig bestanden markieren. Der fachliche Georg-/Petra-Delegationstest erfolgt anschließend manuell.

## Nicht tun

- keine vollständigen Profile für Teamlead/Projektmanager lesbar machen;
- keine neuen Rollen oder Permissions einführen;
- kein personenbezogenes Scoring/Ranglisten;
- keine produktiven Schlüssel, Tokens oder Service-Role-Keys dokumentieren;
- keine automatische Delegation ausführen;
- F-11 nicht auf PASS setzen, solange die manuellen Rollenprüfungen fehlen.

## Abschlussbericht

Berichte am Ende kompakt und überprüfbar:

- GitHub-`main`-Commit
- Migration bereits vorhanden / neu angewendet
- RPC vorhanden: JA/NEIN
- `PUBLIC`/`anon` EXECUTE entzogen: PASS/FAIL
- `authenticated` EXECUTE: PASS/FAIL
- Profile-/Rollen-RLS unverändert: PASS/FAIL
- Build/Tests: PASS/FAIL mit konkretem Befund
- Preview technisch bereit für Georg-Test: JA/NEIN
- noch offene manuelle Abnahme: Georg Marnau, danach Petra Marnau

## Abnahmekriterium dieses Lovable-Schritts

**TECHNISCH BEREIT FÜR MANUELLE F-11-DELEGATIONSABNAHME**, nicht `F-11 PASS` und nicht `MVP BASELINE`.
