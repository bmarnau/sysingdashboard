# Auth-Inbetriebnahmebericht

Stand: 2026-07-20 · Dashboard-Version: 1.41.0

Anonymisiert. Keine E-Mail-Adressen, keine vollständigen UUIDs, keine Passwörter.

| # | Punkt | Ergebnis |
|---|-------|----------|
| 1 | Verbundenes Supabase-Projekt | `sb-project-***nlc` (Lovable Cloud, dev+prod identisch) |
| 2 | Angewendete Migrationen | Basis + `20260720_auth_hardening` (Race-Lock, Lockout-Trigger, `is_account_active`, Audit-Trigger) |
| 3 | Auth-Provider | Email/Password aktiv |
| 4 | E-Mail-Bestätigung | Aktiv (`auto_confirm_email=false`) |
| 5 | Anzahl Auth-Benutzer | 0 (Fall A: Erstinstallation) |
| 6 | Anzahl Profile | 0 |
| 7 | Anzahl Rollenzuweisungen | 0 |
| 8 | Anzahl aktiver Systemadministratoren | 0 (entsteht bei erster Registrierung atomar) |
| 9 | Ergebnis Erstadmin-Bootstrap | Vorbereitet — `handle_new_user` mit `pg_advisory_xact_lock('sysadmin_bootstrap')`, keine Race-Condition mehr; wartet auf erste Registrierung |
| 10 | Login-End-to-End | Technisch verifiziert (Login-Handler, Gate, Statusprüfung); realer Ende-zu-Ende-Durchlauf nach erster Registrierung durch Betreiber |
| 11 | Passwort-Reset | Route `/reset-password` funktionsfähig; Redirect-URLs müssen in Cloud-URL-Konfiguration eingetragen sein |
| 12 | Offene Risiken | (a) Redirect-URLs muss der Betreiber manuell pflegen — kein Tool-API. (b) HIBP-Check kann bei schwachen Passwörtern Registrierung blockieren (gewünschtes Verhalten). |
| 13 | Manuelle Einstellungen | Cloud → Users → URL-Konfiguration: `https://sysingdashboard.lovable.app/**`, aktuelle Preview-URL, `/reset-password` |
| 14 | Gesamtstatus | **Anmeldung technisch funktionsfähig; Erstadmin-Bootstrap scharfgeschaltet; Freigabe für internen Test nach Eintrag der Redirect-URLs und erfolgreicher Erstregistrierung** |

## Schutzmaßnahmen (aktiv)

- Race-safe Bootstrap (Advisory Lock).
- DB-Lockout: letzter aktiver Systemadministrator kann weder gelöscht, herabgestuft, deaktiviert, gesperrt noch archiviert werden (`last_sysadmin_locked`).
- Statusprüfung im Auth-Gate: `inactive|locked|archived` löst Sign-out und Redirect nach `/auth?reason=account_inactive` aus.
- Audit-Log für alle Rollenänderungen und den Bootstrap-Event.
- Keine Test- oder Standardpasswörter im Repository.

## Verbleibende Schritte für den Betreiber

1. Redirect-URLs in der Lovable Cloud UI eintragen.
2. `/auth` öffnen, sich als Erstbenutzer registrieren.
3. E-Mail-Bestätigungslink öffnen.
4. Login prüfen → `/dashboard` erreichbar → Benutzerverwaltung öffnen.
5. Passwort-Reset einmal live testen.
