# Demo-Anmeldekonten für die Rollenabnahme (F-11)

Sprint 09C · gilt ab Datensatzversion 2.1.0

Der Systemhaus-Demo-Datensatz verteilt seine Sachverhalte auf vier fiktive
Personen. Damit die persönliche Sicht, die Projektsicht und die Führungssicht
tatsächlich unterschiedlich aussehen, braucht jede Person ein eigenes
Anmeldekonto. Ohne Konten läuft alles auf den einspielenden Benutzer — dann ist
kein Mehrbenutzer-Nachweis möglich.

> Nur auf Test-, Schulungs- oder Preview-Instanzen. Nicht produktiv.

## Die vier Personen

| Person                      | Funktion          | Benötigte Rolle  | Fachlicher Scope                                                         |
| --------------------------- | ----------------- | ---------------- | ------------------------------------------------------------------------ |
| Demo Alex Systemtechnik     | Systemingenieur A | `engineer`       | Netzwerkpakete, Fälle A und C (davon einer gefährdet)                    |
| Demo Sam Infrastruktur      | Systemingenieur B | `engineer`       | Microsoft-365- und Backup-Pakete, Fälle B, D, E (alle handlungsrelevant) |
| Demo Petra Projektleitung   | Projektmanagerin  | `projectmanager` | Projekte Netzwerk und Microsoft 365, Fälle F und H                       |
| Demo Georg Geschäftsführung | Führungssicht     | `teamlead`       | Projekt Backup, Fall G, Portfoliosicht über alle Demo-Projekte           |

Die Anzeigenamen sind identisch mit den `assignee`- und `lead`-Werten im
lokalen Datensatz — dadurch passen Arbeitspakete, Tätigkeiten und AVKK-Fälle
zusammen.

## Einrichtung in vier Schritten

1. **Konten anlegen** — je Person einmal über die Anmeldeseite registrieren
   (frei wählbare Testadresse, z. B. `demo.alex@example.invalid`). Kennwörter
   werden nirgends dokumentiert und gehören nicht in dieses Repository.
2. **Anzeigenamen setzen** — im Profil auf den Namen aus der Tabelle ändern,
   damit lokale Zuordnung und Datenbanksicht übereinstimmen.
3. **Rollen vergeben** — als Systemadministrator in der Benutzerverwaltung die
   Rolle aus der Tabelle setzen. Das erste registrierte Konto einer Instanz
   erhält automatisch die Systemadministrator-Rolle; alle weiteren starten als
   `viewer`.
4. **Zuordnen und einspielen** — Servicemenü → „Demo-Datensatz…" → Abschnitt
   „Zuordnung der Demo-Personen": je Person das passende Konto wählen, dann
   „Einspielen". Das Protokoll weist aus, wie viele Verantwortungen auf eigene
   Demo-Konten gezeigt haben.

5. **Lokalen Bestand je Konto einspielen** — sich mit jedem Demo-Konto
   anmelden und im selben Dialog einmal „Einspielen" für den lokalen Bestand
   ausführen. Projekte, Arbeitspakete und Tätigkeiten liegen im Browserprofil
   des jeweiligen Kontos; ohne diesen Schritt zeigt „Mein AVKK" keine
   Demo-Aufgaben, obwohl die Fälle in der Datenbank vorhanden sind.

Eine Änderung der Zuordnung darf jederzeit wiederholt werden: Der Seed hängt
die Verantwortung vorhandener Demofälle auf die neu gewählte Person um, die
bisherige Zuordnung wird historisiert (kein Löschen, ADR-0026). Das Protokoll
weist umgehängte Fälle getrennt aus; fehlende Rechte werden als Fehlermeldung
sichtbar, nicht stillschweigend übergangen.

Anschließend meldet man sich nacheinander mit den Konten an und arbeitet die
Matrix in `docs/ROLE-ACCEPTANCE-09C.md`, Abschnitt 2.6 ab.

## Was dieser Aufbau belegt — und was nicht

**Belegt:** unterschiedliche persönliche Sichten je Anmeldung, korrekte
Verdichtung in Projekt- und Führungssicht, zeilenbezogene Schreibgrenze
(`avkk_can_write`: Systemingenieure schreiben nur auf eigenen oder ihnen
zugeordneten Sachverhalten), Menü- und Rechtegrenzen je Rolle.

**Nicht belegt:** eine Lesetrennung zwischen den Personen. Die Leseregeln der
AVKK-Tabellen prüfen ausschließlich das Recht `avkk.view`; wer lesen darf,
sieht alle Sachverhalte. „Mein AVKK" filtert auf die eigene Verantwortung —
das ist eine Sicht-, keine Datenbanktrennung und im Abnahmebericht als Befund
geführt.

Ebenfalls nicht belegt: eine Trennung von Projekten, Arbeitspaketen und
Tätigkeiten. Dieser Bestand liegt lokal im Browser des jeweiligen Geräts, ohne
Server und ohne Zugriffsregeln. Jedes Demo-Konto muss den lokalen Bestand
deshalb selbst einmal einspielen.

## Rücknahme

Lokaler Bestand: „Entfernen" im selben Dialog, wirkt nur auf `demo-`-Einträge.
AVKK-Fälle: „Stilllegen" — Löschen ist nicht vorgesehen (ADR-0026). Die
Demokonten selbst bleiben bestehen; sie können in der Benutzerverwaltung auf
`inactive` gesetzt werden.
