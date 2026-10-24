# ADR-0037: Kontrollierte Datenaufträge über den Work-/Lovable-Connector

- **Status**: Accepted
- **Datum**: 2026-10-24
- **Ergänzt**: ADR-0035 (Migrationen), Database Change Governance, Golden Dataset Strategy

## Kontext

ADR-0035 regelt ausschließlich Migrationen (Schema-Änderungen). Mit Paket L0c
(Mandanten-Bootstrap) wurde am 2026-10-24 erstmals ein reiner Datenauftrag nötig:
Die Mandantentabellen `systemhouse`, `customer`, `systemhouse_membership`,
`customer_access` und `customer_responsibility` waren live leer, und es gibt weder
UI noch RPC für die erste Mitgliedschaft. Ohne diese Zeilen sind "An Team
veröffentlichen" (L0b) und die Verantwortungsansichten (L2) nicht testbar.

Die ersten Auftragsfassungen waren unvollständig. Der Work-Lauf stoppte
fail-closed, weil die Regeln nicht zur Datenbank passten: interne
Fremdschlüssel-Trigger (`RI_FKey_*`) zählten als Anwendungstrigger, der Kanal läuft
als Rolle `postgres` statt `service_role`, und der Audit-Trigger auf
`customer_responsibility` schreibt eine erwartbare Nebenwirkung in `audit_log`.
Diese Stopps waren korrekt. Die Regeln gehören aber in ein dauerhaftes Dokument.

## Entscheidung

Datenaufträge sind über denselben kontrollierten Connector-Kanal zulässig, wenn
alle folgenden Bedingungen erfüllt sind:

1. **Einzelfreigabe in zwei Stufen.** Der Owner gibt den Auftragstext frei und
   bestätigt nach dem Preflight ausdrücklich mit "Go". Ohne "Go" wird nichts
   geschrieben.
2. **Zielbindung.** Lovable-Projekt-ID, Owner und ein Live-Fingerprint (zum Beispiel
   Zeilenzahl `profiles` und letzte Migrationsversion) müssen gemeinsam passen.
3. **Nur benannte Daten.** Es werden nur im Auftrag aufgeführte Zeilen mit festen
   IDs geschrieben. Demo- und Testdaten sind synthetisch und als DEMO
   gekennzeichnet. Personenbezogene Angaben wie E-Mail-Adressen stehen nicht im
   Auftragstext; Konten werden über Rolle und Status ausgewählt und per
   Konto-ID berichtet.
4. **Read-only Preflight.** Geprüft werden: Leerstand bzw. Abwesenheit der festen
   IDs, Trigger-Inventar, Rolle und Schreibrecht des Kanals. Bei Abweichung wird
   gestoppt, nichts geschrieben und berichtet.
5. **Trigger-Regel.** Es zählen nur Anwendungstrigger (`pg_trigger.tgisinternal =
false`). Interne Fremdschlüssel-Trigger sind erwartet. Jeder Anwendungstrigger
   muss im Auftrag namentlich erlaubt sein. Erwartete Nebenwirkungen (zum Beispiel
   Audit-Zeilen) müssen im Auftrag mit exakter Anzahl genannt sein; jede weitere
   Nebenwirkung führt zum Abbruch und Rollback der Transaktion.
6. **Kanal.** Der Kanal darf als Rolle `postgres` laufen (wie bei Migrationen).
   `SET ROLE`, Rechte-, Policy-, Grant- oder Rollen-Änderungen sind verboten.
7. **Ausführung.** Eine Transaktion, `ON CONFLICT DO NOTHING`, kein Blind-Retry.
8. **Postflight (read-only).** Zeilenzahlen vorher und nachher, eine Probe der
   fachlichen Wirkung (zum Beispiel `is_my_customer`-Matrix oder Join-Probe),
   Live-Fingerprint unverändert, Audit-Zeilenzahl wie erwartet. Die Advisor-Prüfung
   entfällt bei reinen Datenaufträgen, weil weder Schema noch Policies noch
   Berechtigungen verändert werden.
9. **Rückbau.** Nur auf ausdrückliches Kommando und nur über die festen IDs. Zeilen
   in `audit_log` werden nie gelöscht.
10. **Bericht.** Status, Preflight, Konto-IDs mit Anzeigenamen, Zeilenzahlen,
    Probe-Ergebnis, Fehler im Wortlaut.

Produktive Echtdaten dürfen nicht über diesen Weg verändert werden; dafür bleiben
Fachfunktionen der Anwendung oder eine eigene Entscheidung zuständig.

## Konsequenzen

Positiv: Reproduzierbarer, prüfbarer Weg für Demo- und Bootstrap-Daten; die
fail-closed-Stopps bleiben erhalten; die Regeln liegen in Git statt in
Chat-Texten.

Negativ: Die Rolle `postgres` umgeht RLS und ist damit mächtiger als die
vorgesehene `service_role`. Das wird durch die Einzelfreigabe, feste IDs, den
Trigger-Abgleich und den Postflight begrenzt, nicht beseitigt. Jeder Datenauftrag
kostet Aufwand für Preflight und Freigabe.

## Trust-Boundary / Security-Note

Der Connector-Kanal hat Schreibrechte über RLS hinweg. Deshalb gilt: kein Auftrag
ohne Zielbindung und "Go", keine Echtdaten, keine Berechtigungsänderung. Die
beiden Stopps vom 2026-10-24 zeigen, dass der Preflight tatsächlich blockiert.

## Anwendungsbeispiele

- 2026-10-24: Demo-Mandant (1 Systemhaus, 2 Kunden, 2 Mitgliedschaften, 4
  Zugriffe), danach Ergänzung um 2 Kundenverantwortungen mit 2 erwarteten
  Audit-Zeilen. Beide Läufe bestanden den Postflight.
