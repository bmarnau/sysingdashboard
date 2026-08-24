# F-11 — Role Preview Fachentscheidung

Stand: 2026-08-24  
Entscheidung: **N/A — kein Produktbestandteil des aktuellen MVP**

## Ausgangspunkt

Die historische F-11-Abnahmeliste enthielt einen Punkt `Role Preview`. Frühere Formulierungen beschrieben dies als reine Darstellungsumschaltung ohne Rechteerweiterung.

Die erneute Prüfung des aktuellen Produktstands ergab jedoch:

- keinen aktuellen Einstieg im Servicemenü,
- keine aktuelle Produktcode-Implementierung für Role Preview oder Impersonation,
- keine aktuelle ADR- oder Produktanforderung, die diese Funktion für den MVP verlangt,
- reale Rollen-, Negativ- und Mehrbenutzertests sind unabhängig davon vorhanden,
- serverseitige Berechtigungsgrenzen werden durch RBAC/RLS bzw. die bestehenden geschützten Datenpfade nachgewiesen.

## Entscheidung

Der historische Acceptance-Punkt wird für den aktuellen MVP als **nicht anwendbar (N/A)** eingestuft.

Es wird ausdrücklich **keine neue Role-Preview-/Impersonation-Funktion implementiert**, nur um eine veraltete Prüfliste formal zu erfüllen.

## Sicherheitsbegründung

Eine UI-Rollenvorschau wäre kein Ersatz für echte Berechtigungsprüfung. Die für den MVP maßgeblichen Nachweise sind:

- Anmeldung mit realen Rollen,
- rollenbezogene Oberflächenprüfung,
- negative UI-Prüfungen,
- serverseitige Schreibgrenzen,
- RBAC/RLS-Tests,
- Mehrbenutzer-Scope- und Fremdschreibtests.

Diese Nachweise bleiben bestehen und werden durch die N/A-Entscheidung nicht abgeschwächt.

## Zukunft

Falls später für Support, Schulung oder Administration eine sichere Rollenvorschau fachlich gewünscht wird, ist sie als **neues Post-MVP-Feature** zu planen. Dann gelten mindestens:

- reine Darstellung ohne Rechteausweitung,
- kein Impersonation-Schreibpfad,
- klare Kennzeichnung der Vorschau,
- weiterhin serverseitig unveränderte Rechte,
- eigene Tests und Dokumentation.

## Abschluss

`Role Preview` blockiert die F-11-/MVP-Abzeichnung nicht mehr. Status: **N/A durch dokumentierte Produktentscheidung**, nicht `PASS durch Implementierung`.
