# QS-01 Migration A: Lovable-Prompt (Datenbankänderung)

Stand: 2026-10-22 · Status: **Entwurf, nicht freigegeben**
Gilt nach `docs/DATABASE-CHANGE-GOVERNANCE.md` §5. Erst nach Freigabe durch den Betreiber
und nach Anlage der Variant (S0-04) verwenden.

Prüfsummen (SHA-256) der Dateien auf Branch `feat/qs01-migration-a-profile-guard`:

- `supabase/migrations/20261022090000_qs01_a_profile_self_update_guard.sql`:
  `b67df3a1ad42cb47adb6b2760628bbef86666ef6883b22b36e35a0ce3ea79649`
- `supabase/tests/qs01-profile-self-update-guard.sql`:
  `086cd9f4166b96b2774e71300c2f40b10e1fe599f2aa8eb219ae5c3c31752aef`

## Prompt

```text
Aufgabe: Datenbankänderung QS-01 Migration A anwenden. Analysieren, minimal umsetzen,
testen, dokumentieren, Abschlussbericht, stoppen.

1. Repository und Ausgangsstand
   - Repository: bmarnau/sysingdashboard
   - base_sha: <HIER den geprüften SHA der Variant eintragen>
   - Arbeite ausschließlich in einer Variant bzw. auf einem Nicht-main-Zweig. Schreibe nie
     auf main. Wenn die Variant nicht eindeutig an base_sha gebunden ist: stoppen und
     melden, ohne Datenbankzugriff.

2. Zielkontext
   - Verifiziere und nenne vor jeder Änderung das verbundene Supabase-Projekt (nur
     Projekt-Referenz, keine Schlüssel). Stimmt es nicht mit dem erwarteten überein:
     stoppen.

3. Ziel
   - Nutzer dürfen status, email, mfa_enabled, created_at und id ihres eigenen Profils
     nicht mehr ändern; deaktivierte Konten dürfen ihr Profil nicht mehr ändern.

4. Datenmodell und Entitäten
   - Tabelle public.profiles, Trigger-Funktion public.guard_profile_self_update()
     (SECURITY INVOKER), Trigger trg_profiles_guard_self_update, Policy
     profiles_self_update.

5. Scope
   - Genau die Migration supabase/migrations/20261022090000_qs01_a_profile_self_update_guard.sql
     anwenden, byte-identisch aus dem Repository. Datei nicht verändern, nicht neu
     formulieren, nicht umbenennen.

6. Nicht-Scope
   - Keine Migration B (Bootstrap) und keine Migration C (Default-Privilegien).
   - Keine Änderung an Rollen, user_roles, Auth-Konfiguration, Plattform- oder
     Auth-Storage-Einstellungen, keine Datenkorrekturen, keine weiteren Tabellen.

7. Bestehende Grenzen
   - RLS bleibt aktiv. Administratoren (systemadministrator, administrator) behalten
     das Recht, Profile zu ändern. service_role und postgres bleiben unbeschränkt.

8. Migration, Grants, RLS
   - Die Funktion darf für anon und authenticated nicht ausführbar sein.
   - Die Migration läuft in einer Transaktion; History-Eintrag atomar; kein Repair.

9. Rückwärtskompatibilität
   - Keine Datenänderung. Bestehende Profile bleiben unverändert. Clientpfad
     updateOwnProfile sendet nur Name, Anzeigename, Telefon, Profilbild.

10. Negativtests
   - Führe supabase/tests/qs01-profile-self-update-guard.sql (T01 bis T08) gegen eine
     Test- oder Staging-Datenbank aus, nicht gegen produktive Daten. Der Test endet mit
     ROLLBACK.
   - Zusätzlich prüfen, read-only: Nicht-Administrator kann status des eigenen Profils
     nicht setzen; Administrator kann status eines fremden Profils weiterhin setzen.

11. Import, Export, Backup
   - Keine Auswirkung erwartet. Bestätige, dass Backup und Restore die Spalten von
     public.profiles unverändert behandeln.

12. Geheimnisse
   - Keine Secrets, Service-Role-Schlüssel oder produktiven Zugangsdaten in Code, Prompt
     oder Bericht.

13. Ablauf und Bericht
   - Preflight (read-only): Migration History, Pending-Set (erwartet genau diese eine
     Migration), vorhandene Policy profiles_self_update, vorhandene Trigger auf profiles.
   - Danach anwenden, dann Postflight (read-only): Migration History, Funktion und
     Trigger vorhanden, Policy geändert, EXECUTE-Rechte, Advisor-Ergebnis.
   - Bei Abweichung: stoppen mit BLOCKED bzw. FAIL, keine Blind-Reparatur.
   - Abschlussbericht: base_sha, Variant/Branch, Commit, vollständiger Diff, Preflight-
     und Postflight-Ergebnis, Testergebnis, bekannte Restrisiken. Dann stoppen.
```

## Variant-Prompt S0-04 (mit Ausnahme nach ADR-0036 Nachtrag)

```text
Aufgabe: Variant für eine spätere Datenbankänderung vorbereiten (S0-04).
Nur vorbereiten und berichten. Danach stoppen.

1. Ausgangsstand
   - Repository: bmarnau/sysingdashboard, Basis GitHub-main 65b479070b640750a83caad0ed5a001623119832
     (oder neuer). Nenne den vollständigen base_sha.

2. Was du tun sollst
   - Vergleiche den gespeicherten Lovable-Stand mit GitHub-main.
   - Erlaubte, bekannte Abweichung (Plattformdateien): ausschließlich
     src/integrations/supabase/client.ts und src/integrations/supabase/previewAuthStorage.ts.
     Erwartete SHA-256: previewAuthStorage.ts =
     5b00130146b77ecd8ed49f118c640d3e75aa7c5e76695f3b9e3f7f8833719f0a, client.ts =
     f8484c686a271fec973cb843be7cd6efe4ad027ca96ab4b1b3315eff79da26cc.
   - Jede andere Abweichung oder abweichende Prüfsumme: stoppen und melden.
   - Sonst: Lege eine isolierte Variant an, die genau diesem Stand entspricht.
   - Der Branch der GitHub-Verbindung bleibt main; Preview/Publish bleiben unverändert.

3. Nicht tun
   - Keine Migration, kein SQL, kein Datenbankzugriff, keine Codeänderung, kein Commit auf
     main, nicht veröffentlichen, keine Secrets ausgeben, die beiden Plattformdateien
     weder ändern noch "bereinigen".

4. Bericht
   - base_sha, Variant-Name/ID, Liste und Prüfsummen der Abweichungen zu main,
     Supabase-Projekt-Referenz (nur Referenz), Bestätigung Preview/Publish unverändert,
     Unsicherheiten.
```
