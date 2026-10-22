# QS-01 Migration A: Work-Auftrag nach ADR-0035

Stand: 2026-10-22 · Status: **Freigabe des Projekt-Owners liegt vor (2026-10-22, 14:39)**
Anwendungsweg: kontrollierter Work-/Lovable-Connector-Fallback (ADR-0035). Die Variant (S0-04)
wird für Datenbankänderungen nicht verwendet: Sie kann Änderungen nur vormerken und erlaubt
keinen Pre-/Postflight, und das Lovable-Migrationswerkzeug kann den festen Dateinamen nicht
übernehmen.

## Freigegebene Quelle

| Merkmal                | Wert                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Repository / Branch    | bmarnau/sysingdashboard, `main`                                                                     |
| Freigegebener Commit   | `5af3a80a0726c57235805b296780ff6f37732f80` (oder ein Nachfolger, der die Datei unverändert enthält) |
| Datei                  | `supabase/migrations/20261022090000_qs01_a_profile_self_update_guard.sql`                           |
| Git-Blob-SHA           | `32fe3ea2fe5ee699d7d21f8a2f8f96bb74de26c8`                                                          |
| SHA-256                | `b67df3a1ad42cb47adb6b2760628bbef86666ef6883b22b36e35a0ce3ea79649`                                  |
| Größe                  | 76 Zeilen, 3259 Byte                                                                                |
| Anwendungsmenge        | genau diese eine Migration (Version `20261022090000`)                                               |
| History-Lücken (Stand 2026-10-22, Abgleich + Katalogprüfung) | `20260913213000`, `20260917182000`, `20260917190000`: Objekte live vorhanden, nur History-Nachweis fehlt. **Nicht anwenden** (nur separat dokumentieren). |

## Auftragstext

```text
Aufgabe: Datenbankänderung QS-01 Migration A über den kontrollierten Work-/Lovable-
Connector-Pfad nach ADR-0035 anwenden. Ablauf: Preflight -> Anwenden -> Postflight ->
Bericht -> stoppen. Die Einzelfreigabe des Projekt-Owners für genau diesen Lauf liegt vor.

1. Quelle (freigegebener GitHub-Stand)
   - Repository bmarnau/sysingdashboard, Branch main, Commit
     5af3a80a0726c57235805b296780ff6f37732f80 (oder Nachfolger mit unveränderter Datei).
   - Datei supabase/migrations/20261022090000_qs01_a_profile_self_update_guard.sql,
     Git-Blob 32fe3ea2fe5ee699d7d21f8a2f8f96bb74de26c8, SHA-256
     b67df3a1ad42cb47adb6b2760628bbef86666ef6883b22b36e35a0ce3ea79649, 76 Zeilen, 3259 Byte.
   - Lies die Datei direkt aus GitHub-main, nicht aus einer Variant oder Sync-Arbeitsfläche.
     Protokolliere Dateiname, Blob und SHA-256 vor dem Write. Abweichung: stoppen.

2. Zielbindung (alle Kennungen müssen gemeinsam passen)
   - Exakte Lovable-Projekt-ID, Owner-Zuordnung, aktivierter Supabase-Stack und
     projektspezifischer Live-Fingerprint. Erwartete Supabase-Referenz: zffimqwnrsuzuozsgnlc
     (aus der Projektkonfiguration gemeldet; nur Referenz ausgeben, keine Schlüssel).
   - Ein nur gleichnamiges oder separates Supabase-Projekt genügt nicht. Unklar: stoppen.
   - Es ist ausschließlich der Datenbank-Connector dieses gebundenen Lovable-Projekts erlaubt.

3. Preflight (nur lesend, protokollieren)
   - Migration History: erwartet endet bei 20260929053733; 20261022090000 darf nicht
     vorhanden sein. Anwendungsmenge ist exakt {20261022090000}. Die History-Lücken
     20260913213000, 20260917182000 und 20260917190000 sind bekannt (Objekte live vorhanden,
     Katalogprüfung 2026-10-22) und werden NICHT angewendet und NICHT repariert. Weicht der
     Befund ab (neue Lücken, andere Endversion): stoppen.
   - public.profiles: Zeilenzahl, RLS aktiv, Policy profiles_self_update (Definition; erwartet:
     Ausdruck nur auth.uid() = id, Hash USING/WITH CHECK 593ac56f4ca8fd31037039474d979d9151ac95a93ccad97c91e6c49ad2258f9c),
     vorhandene Trigger, Vorhandensein von profiles_admins_update_all.
   - Funktionen public.has_any_role(uuid, app_role[]) und public.is_account_active(uuid)
     vorhanden; Enum public.app_role enthält systemadministrator und administrator.
   - Sicherheits-Baseline: offizieller Advisor (erwartet 0 ERROR; zwei bekannte WARN).
   - Teilweise vorhandene Zielobjekte (guard_profile_self_update, trg_profiles_guard_self_update)
     oder abweichender Drift: stoppen vor dem Write.

4. Statische Prüfung
   - Bestätige, dass die Datei transaktional ausführbar ist: keine eigenen Transaktions-
     grenzen, kein CONCURRENTLY, VACUUM, REINDEX oder vergleichbar. Sonst BLOCKED.

5. Anwenden
   - Byte-identischer SQL-Inhalt der Datei, in einer einzigen Transaktion, mit Advisory Lock
     und Precondition (Pending-Set und Zielobjekte wie im Preflight). Wrapper dürfen nur
     Transaktion, Lock, Precondition und den History-Eintrag ergänzen.
   - In derselben Transaktion genau eine Migration-History-Zeile: Version 20261022090000,
     Name qs01_a_profile_self_update_guard. Kein Repair, keine nachträgliche
     History-Korrektur.
   - Keine Datenkorrektur, keine weiteren Migrationen. Insbesondere nicht anwenden: den
     Fremdschlüssel reference_value_history_systemhouse_fk (existiert live bereits, Git-Nachzug
     in PR #210), Bootstrap-Admin, Default-
     Privilegien sowie die History-Lücken-Migrationen 20260913213000, 20260917182000 und
     20260917190000 (würden bestehende Objekte überschreiben).

6. Postflight (unmittelbar danach, nur lesend)
   - Migration History enthält 20261022090000 genau einmal und endet dort.
   - Funktion public.guard_profile_self_update: SECURITY INVOKER, Owner postgres,
     search_path public; EXECUTE nur für service_role und Owner, nicht anon, authenticated
     oder PUBLIC.
   - Trigger trg_profiles_guard_self_update: BEFORE UPDATE, FOR EACH ROW auf public.profiles.
   - Policy profiles_self_update: FOR UPDATE TO authenticated; USING und WITH CHECK enthalten
     auth.uid() = id und is_account_active(auth.uid()).
   - RLS auf public.profiles weiterhin aktiv; übrige Policies unverändert.
   - Zeilenzahl von public.profiles identisch zum Preflight; keine Daten verändert.
   - Offizieller Security Advisor: keine neue Meldung durch diese Änderung.
   - Es werden keine Verhaltenstests mit Schreibwirkung gegen Produktivdaten ausgeführt. Der
     Verhaltenstest T01 bis T08 lief in der CI; der fachliche Retest erfolgt durch den Owner.

7. Fehler
   - Bei Fehler oder unklarer Toolantwort kein Blind-Retry. Zuerst Commit- und Objektzustand
     read-only ermitteln, dann berichten. Status ist nur DONE nach erfolgreichem Postflight.

8. Verbote
   - Keine Secrets, Verbindungsdaten oder Tokens ausgeben oder speichern.
   - Keine Änderungen an Code, Repository, Variant oder Sync-Branches; nicht mergen, nicht
     veröffentlichen. Die Sync-Arbeitsfläche (lovable-sync-*) bleibt isoliert und wird nicht
     nach main gemergt.

9. Abschlussbericht
   - Quelle (Commit, Blob, SHA-256), Zielbindung (Projekt-ID, Owner, Referenz, Fingerprint
     ohne Geheimnisse), Preflight-Ergebnis, angewendete Migration mit Zeitpunkt, Postflight-
     Ergebnis je Punkt, Advisor-Ergebnis, Abweichungen, Status DONE oder BLOCKED.
```

## Fachlicher Retest nach DONE (Owner, ca. 5 Minuten)

1. Als normaler Benutzer den eigenen Anzeigenamen oder die Telefonnummer ändern: muss gelingen.
2. Als Administrator den Status eines Kontos ändern (sperren und entsperren): muss gelingen.
3. Anmeldung und Abmeldung: unverändert.

## Rollback

Trigger `trg_profiles_guard_self_update` und Funktion `guard_profile_self_update()` löschen, Policy
`profiles_self_update` auf `USING/WITH CHECK (auth.uid() = id)` zurücksetzen. Keine Datenmigration.
Ein Rollback ist eine neue, eigene freigegebene Migration und kein Ad-hoc-SQL.
