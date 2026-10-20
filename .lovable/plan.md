# Plan: Konto- und Berechtigungsschutz im SysIng Dashboard

## Umfang und Freigabe
- Jetzt ausschließlich diesen Plan erstellen. Keine Projektanalyse, Datenbankabfragen, Code-/Konfigurationsänderungen, Migrationen oder Tests vor Freigabe.
- Nach Freigabe ausschließlich die drei beauftragten Schutzmaßnahmen umsetzen. Keine Tests starten; Datenbankabnahme ausschließlich durch SELECT-Abfragen auf Kataloge/ACL.
- Keine Datenänderungen, Backfills, Änderungen der Rollenvergabe, Deployments oder Veröffentlichungen.

## 1. Verbindlicher Ausgangspunkt
- Nach Freigabe den vollständig abgenommenen GitHub-`main`-SHA und einen ausdrücklich erzeugten, darauf festgelegten Project Variant prüfen. Der aktuelle Ausgangs-SHA ist für diesen Auftrag noch nicht verifiziert.
- Ohne nachgewiesene Variant-/SHA-Bindung keine Umsetzung; Blocker melden. `main` bleibt unverändert.
- Im Variant relevante Architekturregeln und Dokumentationsvorgaben lesen, tatsächliche Auth-Middleware und `/api/sync` lokalisieren sowie vorhandene Admin-Pfade prüfen. Fehlende Pfade als „nicht vorhanden“ melden; keine Ersatzschnittstelle erfinden.
- Datenbankidentität und Istzustand ausschließlich lesend prüfen: Tabellenzahl, Trigger/Funktionen, Definition von `is_account_active`, ACL, Rollenvererbung und bestehende Policies.

## 2. Geschützte Profilfelder
- Einen `BEFORE UPDATE`-Trigger auf `public.profiles` ergänzen, der Änderungen an `status` oder `mfa_enabled` mit `IS DISTINCT FROM` erkennt.
- Solche Änderungen nur für authentifizierte Aufrufer mit `systemadministrator` oder `administrator` sowie für den tatsächlichen `service_role`-Ausführungskontext zulassen; sonst den gesamten Schreibvorgang ablehnen.
- Unveränderte geschützte Felder und Änderungen anderer Profilfelder weiterhin nach bestehender RLS zulassen.
- Vorhandene Admin-Pfade erhalten. Die Rolle der Zielperson darf keine Berechtigung für den Aufrufer begründen.

## 3. TRUNCATE und separate anon-Prüfung
- Die tatsächliche Liste der public-Tabellen mit dem erwarteten Bestand von 25 abgleichen. Bei Abweichungen die Liste offenlegen und den erweiterten Umfang vor Umsetzung klären.
- `TRUNCATE` für `anon` und `authenticated` auf allen 25 Tabellen entziehen; andere Rechte bleiben zunächst unverändert.
- Effektive Rechte inklusive `PUBLIC` und geerbter Rollen prüfen. Verbleibende effektive TRUNCATE-Rechte müssen innerhalb des freigegebenen Umfangs beseitigt werden; keine anderen Rollen pauschal verändern.
- Separat je Tabelle vorhandene anon-Rechte mit anonym erreichbaren Anwendungspfaden und RLS-Policies abgleichen. Bericht mit Tabelle, Recht, nachgewiesenem Bedarf und Abweichung erstellen.
- Das Entfernen anderer anon-Rechte ist nicht Teil dieses Auftrags. Unklaren Bedarf ausdrücklich als „nicht nachgewiesen“ markieren und keine Annahmen über erforderliche öffentliche Zugriffe treffen.
- Default-ACL als Wiederholungsrisiko berichten; keine ungefragte Änderung für zukünftige Tabellen.

## 4. Aktives Konto vor privilegierten Aktionen
- Nach erfolgreicher Authentifizierung in der vorhandenen Auth-Middleware `is_account_active` für die verifizierte Benutzer-ID prüfen, bevor privilegierte Verarbeitung erfolgt.
- Dieselbe Anforderung in der tatsächlichen `/api/sync`-Verarbeitung vor jeder privilegierten Aktion durchsetzen; bestehende Rollen- und Scope-Prüfungen bleiben zusätzlich erforderlich.
- Bei inaktivem Konto, fehlendem Identitätsnachweis oder fehlgeschlagener Aktivitätsprüfung fail-closed abbrechen; keine privilegierten Reads, Writes oder externen Aktionen ausführen.
- Kein Vertrauen auf Browser-Storage, UI-Gating oder mitgesendete fremde Benutzer-IDs. Keine zusätzlichen Auth-Storage-Anpassungen.
- Falls `/api/sync` technische Aufrufer ohne Benutzerkonto unterstützt, deren bestehenden Auth-Vertrag offenlegen und die benötigte Behandlung vor Änderungen klären; keine implizite Ausnahme einführen.

## Technische Umsetzung
- Eine minimale, forward-only SQL-Migration im bestehenden kanonischen Repository-Verfahren für Trigger und ACL erstellen; historische Migrationen nicht ändern.
- Für eine nötige `SECURITY DEFINER`-Triggerfunktion: leerer `search_path`, vollständig qualifizierte Referenzen und keine direkte EXECUTE-Berechtigung für `PUBLIC`, `anon` oder `authenticated`. Aufruferidentität trotz Funktions-Eigentümerkontext sicher prüfen; keine frei wählbaren Metadaten zur service_role-Freigabe verwenden.
- Nur vorhandene Auth-/Sync-Dateien gezielt ändern. Generierte Auth-/Client-Dateien bleiben unangetastet.
- Vor einer Anwendung den verfügbaren Migrationsweg gegen die Projektvorgaben prüfen. Der derzeit bekannte Lovable-Migrationsmechanismus verwendet Drizzle und ist damit nicht zulässig. Ohne zulässigen exakten Migrationsweg keine Live-Anwendung; kanonischen SQL-Entwurf für den kontrollierten GitHub-/CLI-Weg bereitstellen und den Blocker melden.
- Erforderliche aktuelle Dokumentation im freigegebenen Scope aktualisieren; keine historischen Berichte umschreiben, keine Findings eigenmächtig schließen und keine ungefragte Versionserhöhung. Dokumentationsprüfungen und sonstige Test-/Build-Kommandos nicht starten.

## Abnahme: ausschließlich SELECT
1. **TRUNCATE:** Für jede der 25 Tabellen müssen beide Ergebnisse `has_table_privilege('anon', ..., 'TRUNCATE')` und `has_table_privilege('authenticated', ..., 'TRUNCATE')` exakt `false` sein. Vollständige Ergebnisliste und Anzahl ausgeben.
2. **Profil-Trigger:** Über `pg_trigger` und `pg_get_triggerdef` einen aktivierten, passenden `BEFORE UPDATE`-Trigger auf `public.profiles` nachweisen; über `pg_proc` und `pg_get_functiondef` die Feld-, Rollen- und service_role-Prüfung einschließlich Funktionskonfiguration/ACL auflisten.
3. **Aktivitätsfunktion:** Vorhandene Definition, Signatur und Ausführungsrechte von `is_account_active` lesend auflisten.
4. **anon-Abweichungen:** Tabellenweise effektive Rechte, Policies und den belegten beziehungsweise nicht nachgewiesenen Bedarf dokumentieren.

**Grenze der Abnahme:** Katalog-/ACL-SELECTs weisen Datenbankdefinitionen und Rechte nach, aber nicht das Laufzeitverhalten von Middleware oder `/api/sync`. Diese Codeänderungen erhalten eine Diff-/Quellprüfung, bleiben ohne Laufzeitprüfung jedoch funktional unbestätigt. Ein Gesamt-PASS für die drei Maßnahmen darf daraus nicht abgeleitet werden.

## Abschluss und Integration
- Ausgangs-SHA, Variant-/Commit-Bezug, vollständigen Diff, geänderte Dateien, SELECT-Ergebnisse, anon-Abweichungen und verbleibende Risiken melden; ausdrücklich „keine Tests ausgeführt“ festhalten.
- Genau ein nächster Schritt: kontrollierte Integration über GitHub-Branch und Pull Request mit separatem Security-Workflow und vollständiger CI nach eigener Freigabe; kein Merge durch Lovable.