# PW-01: Passwort in der Anwendung ändern

Stand: 2026-10-25. Reifegrad: Entwurf. Anlass: Nutzerhinweis 2026-10-25 (Alexa-Zugang, Selbstbedienung fehlt in der App).

## Ausgangslage (aus dem Code auf main)

- Anmeldeseite: Reiter „Reset“ sendet eine Recovery-Mail (`resetPasswordForEmail`), Link führt auf `/reset-password`.
- Servicemenü → „Backend & Auth-Konten…“: Administratoren können eine Recovery-Mail auslösen oder ein Passwort administrativ setzen (nicht für das eigene Konto, Systemadministratoren nur durch Systemadministratoren).
- Es gibt **keine** Funktion „Passwort ändern“ für angemeldete Nutzer und keine Passwort-Aktion in der Benutzerverwaltung.
- Bekannte Grenze: Ohne eigene Absenderdomäne (QS-04) laufen Auth-Mails über den Plattform-Standardabsender, Zustellung unsicher (Befund F-16).

## Anforderungen

| ID    | Anforderung                                                                                                                                                                           | Priorität |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| PW-01 | Ein angemeldeter Nutzer muss sein eigenes Passwort in der Anwendung ändern können (Servicemenü oder Profil), ohne die Anmeldeseite zu nutzen.                                         | muss      |
| PW-02 | Die Änderung muss das aktuelle Passwort abfragen und gegen den Anbieter prüfen, bevor das neue gesetzt wird.                                                                          | muss      |
| PW-03 | Das neue Passwort muss der Regel der Registrierung entsprechen und zweimal eingegeben werden. Fehler müssen mit Grund erscheinen; Passwörter werden nie angezeigt oder protokolliert. | muss      |
| PW-04 | Die Änderung sollte protokolliert werden (z. B. `auth.password_changed`, ohne Passwort).                                                                                              | sollte    |
| PW-05 | In der Benutzerverwaltung sollten je Konto „Passwort zurücksetzen“ (Mail) und für Administratoren „Passwort setzen“ erreichbar sein, mit den Schutzregeln des Servicemenüs.           | sollte    |
| PW-06 | Nach der Änderung sollte die Sitzung gültig bleiben und andere Sitzungen des Nutzers abmelden.                                                                                        | sollte    |

Umfang der ersten Stufe: PW-01 bis PW-03. PW-04 bis PW-06 folgen als zweite Stufe.

## Abnahme (Stufe 1)

1. Angemeldeter Nutzer öffnet „Passwort ändern“, gibt aktuelles und neues Passwort (zweimal) ein, speichert; Erfolgsmeldung; Abmelden und Anmelden mit dem neuen Passwort gelingt.
2. Falsches aktuelles Passwort: Fehlermeldung, nichts wird geändert.
3. Zu schwaches oder abweichend wiederholtes Passwort: Fehlermeldung mit Grund.
4. Kein Passwort erscheint im Klartext in der Oberfläche, in Konsole oder Netzwerkprotokoll des Browsers außer im Anfragekörper zum Anbieter.
5. `src/integrations/supabase/client.ts` und `previewAuthStorage.ts` bleiben unverändert (Vertragstest `supabase-client-contract.test.ts` muss bestehen).
6. Vitest-Tests für Validierung und Fehlerpfade; Hilfeseite ergänzt.

## Risiken

- R-07 (Auth-Broker): Der Test muss auf der veröffentlichten App wiederholt werden, weil der Broker den Auth-Speicher betrifft.
- Idle-Logout nach 5 Minuten: Formular darf bei Ablauf keine Eingaben still verwerfen, sondern auf die Anmeldung leiten.
- Nach Änderung kann eine Recovery-Mail zeitgleich noch gültig sein; bekannt, kein Eingriff in Stufe 1.

## Lovable-Prompt (Stufe 1, schreibend)

```text
Aufgabe PW-01 Stufe 1: "Passwort ändern" für angemeldete Nutzer.

Rahmen
- Nur UI und Client-Logik. Keine Datenbankänderung, keine Migration, keine neue Edge-Funktion.
- Nicht anfassen: src/integrations/supabase/client.ts, src/integrations/supabase/previewAuthStorage.ts, types.ts. Keine neue Datei im Ordner src/integrations/supabase.
- Nicht veröffentlichen.

Umsetzung
1. Im Servicemenü (SessionSettingsDialog oder dem bestehenden Kontomenü) einen Eintrag "Passwort ändern" anlegen, der einen Dialog öffnet.
2. Felder: Aktuelles Passwort, Neues Passwort, Neues Passwort wiederholen. Alle als type=password mit autoComplete current-password bzw. new-password. Passwortsichtbarkeit nicht als Standard.
3. Ablauf: erst supabase.auth.signInWithPassword mit der E-Mail des angemeldeten Nutzers und dem aktuellen Passwort prüfen; bei Fehler Meldung "Das aktuelle Passwort ist nicht korrekt." und abbrechen. Dann supabase.auth.updateUser({ password }). Erfolg: Meldung "Passwort geändert." und Dialog schließen.
4. Validierung wie bei der Registrierung in src/routes/auth.tsx (gleiche Mindestregel, gleiche Fehlertexte, wiederverwenden statt duplizieren). Abweichende Wiederholung: "Die beiden neuen Passwörter stimmen nicht überein." Neues gleich altes Passwort: ablehnen.
5. Anbieterfehler (zu schwach, Limit) mit deutschem Grund anzeigen, nie das Passwort ausgeben oder loggen.
6. Vitest-Tests für Validierung, Fehlerpfade und Erfolgspfad (supabase gemockt). Hilfeseite (src/lib/help-documentation.ts) um "Passwort ändern" ergänzen.

Antwort danach nur mit: Commit-ID, Dateiliste, Testergebnis (npm test), und der Bestätigung, dass client.ts und previewAuthStorage.ts unverändert sind.
```
