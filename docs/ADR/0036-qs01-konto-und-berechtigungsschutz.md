# ADR-0036: QS-01 Konto- und Berechtigungsschutz

- **Status**: Proposed
- **Datum**: 2026-10-22
- **Bezug**: Golden-Gate-Tracker QS-01, Database Change Governance, ADR-0035
- **Betrifft**: `profiles`, `handle_new_user`, Default-Privilegien, Audit-Schreibpfad

## Kontext

Die Sicherheitsprüfung für das Golden Gate (L8-Abnahme: kein offener CRITICAL- oder
HIGH-Befund) fand fünf Befunde. Die Einstufung ist eine eigene Einschätzung und wird
mit dem Betreiber abgestimmt.

| Befund                  | Beschreibung                                                                                    | Einstufung                                                        | Stand                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| SEC-PROFILE-SELF-UPDATE | `profiles_self_update` erlaubt jede Spalte der eigenen Zeile (`status`, `email`, `mfa_enabled`) | HIGH                                                              | Migration A (PR #205), nicht angewendet |
| SEC-ACTIVE-ACCOUNT      | Selbstupdate prüft nicht, ob das Konto aktiv ist                                                | MEDIUM                                                            | Migration A (PR #205), nicht angewendet |
| SEC-AUDIT-ERRORS        | `writeAudit` verschluckte Datenbankfehler (`{ error }` statt Ausnahme)                          | MEDIUM                                                            | behoben, PR #204 auf main               |
| SEC-BOOTSTRAP-ADMIN     | Erste Registrierung wird Systemadministrator, solange keiner existiert                          | MEDIUM (frische Installation), LOW (laufende Datenbank mit Admin) | Entwurf offen                           |
| SEC-DEFAULT-ACL         | Default-Privilegien vergeben `ALL` (inkl. TRUNCATE) an `anon` und `authenticated`               | LOW bis MEDIUM                                                    | Entwurf offen                           |

Bewertungsgrundlage: TRUNCATE ist über die Data-API (PostgREST) nicht erreichbar; das
Risiko entsteht nur bei direktem Datenbankzugriff mit diesen Rollen. Der Bootstrap-Befund
wirkt nur, solange kein Systemadministrator existiert.

## Entscheidung

1. **Migration A (Profil-Selbstupdate)** zuerst, getrennt von B und C.
   - `BEFORE UPDATE`-Trigger `guard_profile_self_update` als **SECURITY INVOKER**. Bei
     SECURITY DEFINER wäre `current_user` immer der Funktionseigentümer und die Prüfung
     wirkungslos.
   - Über die Data-API (`current_user = authenticated`) sind `id`, `status`, `email`,
     `mfa_enabled`, `created_at` für Nicht-Administratoren gesperrt. `service_role`,
     `postgres` und SECURITY-DEFINER-Funktionen bleiben unberührt.
   - Administratoren (`systemadministrator`, `administrator`) pflegen Profile weiter über
     die Benutzerverwaltung.
   - **Kein Spalten-GRANT**, weil Administratoren dieselbe Rolle `authenticated` nutzen.
   - Policy `profiles_self_update` verlangt zusätzlich `is_account_active(auth.uid())`.
2. **Migration B (Bootstrap)** getrennt.
   - Der erste Systemadministrator wird an eine konfigurierte Admin-E-Mail gebunden.
   - Ablage: nicht öffentlicher `app_settings`-Eintrag (Entscheidung des Betreibers,
     2026-10-21).
   - Abwärtskompatibel: Ohne Eintrag bleibt das bisherige Verhalten, damit bestehende
     Datenbanktests und frische Entwicklungsdatenbanken funktionieren.
   - Voraussetzung: Klärung, ob die E-Mail-Bestätigung im Hosting aktiv ist. Ohne
     Bestätigung darf die Bindung an die E-Mail allein nicht als Nachweis gelten.
3. **Migration C (Default-Privilegien)** getrennt.
   - `TRUNCATE`, `REFERENCES`, `TRIGGER` von `anon` und `authenticated` entziehen, für
     bestehende Tabellen und als Default-Privileg.
   - Vorab ein read-only Inventar von `pg_default_acl` und den Tabellen-ACLs der
     Live-Datenbank (auch andere Grantor-Rollen als `postgres`).
4. **SEC-AUDIT-ERRORS** ist ein reiner Codefix und braucht keinen Datenbankpfad.

## Anwendungsweg

Datenbankänderungen folgen `docs/DATABASE-CHANGE-GOVERNANCE.md`: Lovable-Variant mit
verifizierter `base_sha`, Preflight, byte-identische Anwendung, Postflight, getrennte
Migrationen. Kein Raw-SQL, kein `migration repair`. Ein Merge der Migration nach `main`
erfolgt erst, wenn der Anwendungsweg abgestimmt ist, damit ein Sync keine Anwendung
außerhalb des Governance-Pfads auslöst.

Der Lovable-Prompt für Migration A liegt in
`docs/QS-01-LOVABLE-PROMPT-MIGRATION-A.md`.

## Nachweise (Migration A)

- DB-Vertragstest `supabase/tests/qs01-profile-self-update-guard.sql` (T01–T08) besteht in
  CI auf einer lokalen Supabase-Instanz (Rebuild aus Migrationen).
- Schema-Snapshot und Drift-Check sind grün. Die generierten Typen ändern sich nicht
  (Trigger-Funktionen erscheinen dort nicht).
- Bestehende Clientpfade: `updateOwnProfile` sendet nur Name, Anzeigename, Telefon,
  Profilbild; `status` sendet nur die Administrationsverwaltung.

## Risiken und Restfragen

- **SPoF Administrator**: Der Last-Sysadmin-Schutz bleibt unverändert; Migration A berührt
  ihn nicht.
- **E-Mail-Änderung durch Nutzer**: Nach A kann ein Nutzer `profiles.email` nicht mehr
  selbst ändern. Ein Auth-Flow zur E-Mail-Änderung müsste die Spalte serverseitig
  nachführen. Heute existiert im Client kein solcher Pfad.
- **Rollback A**: Trigger und Funktion löschen, Policy auf `auth.uid() = id`
  zurücksetzen. Keine Datenmigration.
- **Nicht gegen die Live-Datenbank geprüft**: Preflight und Postflight stehen aus.

## Konsequenzen

Nach Anwendung von A kann ein Konto seinen Status und seine Authentifizierungsfelder nicht
mehr selbst setzen. Der Test T01–T08 sichert den Vertrag dauerhaft ab.

## Nachtrag 2026-10-22: Variant-Ausnahme für den Lovable-Auth-Broker

Lovable legt in jeder neuen Arbeitskopie automatisch den Auth-Storage-Broker
(`previewAuthStorage.ts`, Änderung in `client.ts`) an, auch nach einer Rücksetzung auf
den GitHub-Stand (Beleg: Commit `a1ef0ec` Rücksetzung, danach `3fd8f74` am selben Tag).
Der Broker ist per Governance verboten (Recovery PR #66,
`src/__tests__/security/supabase-client-contract.test.ts`). Eine Variant ist deshalb nie
exakt identisch mit `main`.

**Entscheidung (Betreiber, 2026-10-22):** Für die Variant (S0-04) gilt eine begrenzte
Ausnahme.

1. Die Abweichung zu `main` darf ausschließlich `client.ts` und `previewAuthStorage.ts`
   betreffen. Jede weitere Abweichung stoppt den Auftrag.
2. Erwartete Prüfsummen (SHA-256, Stand `3fd8f74`):
   - `previewAuthStorage.ts`: `5b00130146b77ecd8ed49f118c640d3e75aa7c5e76695f3b9e3f7f8833719f0a`
   - `client.ts` mit Broker: `f8484c686a271fec973cb843be7cd6efe4ad027ca96ab4b1b3315eff79da26cc`
   - Weichen die Prüfsummen ab, stoppt der Auftrag und meldet den Unterschied.
3. Weder die Variant noch ihre Sync-Branches werden nach `main` gemergt.
4. Die Ausnahme gilt nur für die Datenbankanwendung, nicht für Preview oder Publish.
5. Vor der Publish-Entscheidung ist zu klären, ob Lovable aus der eigenen Arbeitskopie
   oder aus `main` veröffentlicht (Risiko R-07 im Tracker).
