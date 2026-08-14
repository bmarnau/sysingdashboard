# Backend- und Auth-Administration

Stand: 2026-08-14 · Dashboard-Version 1.58.8

## Ausgangslage

Das Dashboard nutzt eine plattformverwaltete Backend-Instanz (Datenbank, Auth,
Serverfunktionen). Der Betreiber besitzt **keinen** eigenen Zugang zu einer
externen Administrationsoberfläche des Plattformanbieters. Verlinkungen dorthin
wären für den Betreiber nicht nutzbar und würden nur technische Kennungen
offenlegen; sie sind deshalb bewusst nicht vorgesehen.

Bewertung: **NEIN** — kein externer Betreiberzugang. Der Befund ist als **F-15
(medium, kein MVP-Blocker)** im MVP-Abnahmebericht geführt.

## Konsequenz: Administration im Dashboard

Servicemenü → **Backend & Auth-Konten…** (nur mit Berechtigung
`users.manage`, also Systemadministrator und Administrator).

Angezeigt werden ausschließlich unkritische Angaben:

- Backend verbunden (ja/nein)
- Auth-Konfigurationsstatus (vollständig / unvollständig / fehlerhaft)
- Liste der Anmeldekonten: E-Mail, Bestätigungsstatus, Rolle, letzte Anmeldung

Nicht angezeigt und nicht gespeichert werden: Schlüssel, Tokens,
Verbindungsadressen, Projektkennungen, Rohmetadaten der Konten.

## Aktionen

| Aktion                         | Zweck                                                         | Schutz                                                                                         |
| ------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Bestätigen                     | Konto ohne bestätigte E-Mail freischalten (Schulung, Abnahme) | Rollenprüfung, Protokolleintrag                                                                |
| Bestätigungsmail erneut senden | Zustellprobleme beheben                                       | Rollenprüfung, Protokolleintrag                                                                |
| Passwort zurücksetzen          | Recovery-Mail an die registrierte Adresse senden              | Rollenprüfung, serverseitige Adressauflösung, Protokolleintrag `auth.password_reset_requested` |
| Konto löschen                  | Fehlerhaft angelegte Konten entfernen                         | eigenes Konto und letzter aktiver Systemadministrator gesperrt                                 |

## Sicherheitsmodell

Die Aktionen laufen in `src/lib/admin/auth-accounts.functions.ts` als
Serverfunktionen:

1. `requireSupabaseAuth` prüft das Zugriffstoken der Anfrage.
2. Im Benutzerkontext wird `has_permission(<user>, 'users.manage')` geprüft.
   Die Prüfung erfolgt **nicht** mit dem privilegierten Client.
3. Erst danach wird der privilegierte Server-Client dynamisch geladen; er ist
   nie Teil des Browser-Bundles.
4. Jede verändernde Aktion schreibt einen Eintrag ins Prüfprotokoll
   (`audit_log`), zusammen mit der handelnden Kontokennung.

Beim Passwort-Reset wird ausschließlich der reguläre Wiederherstellungsablauf
der Auth-Komponente ausgelöst. Administratoren setzen kein Passwort und sehen
weder Passwort noch Recovery-Token; die Zieladresse wird serverseitig aus dem
Konto aufgelöst und nicht vom Browser übernommen. Das Protokoll enthält nur
Aktion, Zielkonto, ausführendes Konto, Zeitstempel und Ergebnis.

Das Dashboard speichert grundsätzlich keine Plattform-Administrationszugänge.
