# ADR-0034: Kontrollierter Supabase-CLI-Fallback für kanonische Migrationen

- **Status**: Accepted
- **Datum**: 2026-10-12
- **Ergänzt**: Database Change Governance, Lovable Database Change Standard

## Kontext

GitHub ist Source of Truth für das anwendungseigene Schema und die versionierten Supabase-Migrationen. Die bisherige Database Change Governance legte Lovable als einzigen operativen Ausführungspfad für Änderungen an der maßgeblichen Supabase-Datenbank fest.

Bei GG-01 / BSF-03E zeigte Issue #177 einen reproduzierbaren Grenzfall: Drei bereits auf GitHub-`main` vorhandene Migrationen fehlten in der verbundenen Supabase-Umgebung. Der Lovable-Preflight konnte den Drift read-only bestätigen, hatte aber keinen kanonischen Apply-Pfad für die vorhandenen Dateien. Ein Write hätte Ersatzmigrationen bzw. einen alternativen Schemapfad erzeugt und die Supabase Migration History nicht korrekt fortgeführt.

Eine absolute Lovable-only-Regel würde damit den Git-Migrationsvertrag von der technischen Apply-Fähigkeit eines einzelnen Entwicklungswerkzeugs abhängig machen. Das widerspricht dem Projektziel, keine unersetzbare Lovable-Abhängigkeit zu erzeugen.

## Entscheidung

Lovable → Supabase bleibt der **bevorzugte reguläre DB-Apply-Pfad**.

Wenn Lovable nachweislich nicht in der Lage ist, bereits versionierte Supabase-Migrationen unverändert und mit korrekter `supabase_migrations`-Historie anzuwenden, ist ein kontrollierter lokaler Supabase-CLI-Fallback zulässig.

Der Fallback ist nur freigegeben, wenn alle folgenden Bedingungen erfüllt sind:

1. Die Migrationen sind bereits versioniert und Bestandteil des freigegebenen Git-Stands.
2. Ein Lovable-Preflight hat den kanonischen Apply-Pfad dokumentiert als nicht verfügbar beendet und keinen DB-Write ausgeführt.
3. Der lokale Checkout ist sauber und exakt an den freigegebenen Commit gebunden.
4. `supabase/config.toml` enthält den erwarteten Projekt-Ref; der Zielkontext ist unabhängig verifiziert.
5. `supabase migration list --linked` zeigt exakt die erwarteten Pending-Migrationen und keine zusätzlichen unbekannten Einträge.
6. Der Write erfolgt ausschließlich mit `supabase db push --linked`.
7. `--include-all`, `migration repair`, manuelle History-Einträge, Raw-SQL und Connector-Writes sind verboten.
8. Destruktive Änderungen oder fachliche Datenmigrationen benötigen weiterhin eine gesonderte explizite Freigabe.
9. Direkt nach dem Push werden Migration History, Schemaobjekte, RLS/Grants, relevante Dateninvarianten, DB-Verträge und offizieller Security Advisor read-only geprüft.
10. Jede Abweichung führt fail-closed zu `BLOCKED` oder `FAIL`; es gibt keinen automatischen Reparaturversuch.

Der Fallback ist ein alternativer **Ausführungskanal derselben Git-Migrationen**, keine zweite Migrationsquelle und kein allgemeiner produktiver SQL-Zugang.

## Alternativen

- **Lovable-only trotz fehlendem kanonischem Apply-Pfad**: verworfen, weil der Migrationsvertrag dadurch technisch blockiert und Lovable zur unersetzbaren Änderungsabhängigkeit würde.
- **Ersatzmigration/Drizzle-Kopie**: verworfen, weil Git- und Remote-Migrationshistorie auseinanderlaufen können.
- **Ad-hoc SQL oder Supabase-Dashboard-Klicks**: verworfen, weil Nachvollziehbarkeit und reproduzierbarer Neuaufbau geschwächt werden.
- **Manuelle Migration-History-Reparatur**: verworfen, weil sie tatsächlichen Schema-Drift kaschieren kann.

## Konsequenzen

- Positiv: GitHub bleibt Source of Truth; dieselben Migrationen werden unverändert angewandt.
- Positiv: Die DB-Governance bleibt auch bei Toolausfall handlungsfähig.
- Positiv: Lovable ist nicht technisch unersetzbar.
- Positiv: Preflight und Postflight liefern explizite Evidence-Grenzen.
- Negativ: Der lokale Operator benötigt eine korrekt verknüpfte Supabase-CLI-Umgebung.
- Negativ: Der Fallback erhöht den operativen Prüfaufwand und ist deshalb bewusst eng begrenzt.
- Negativ: Credentials müssen lokal verfügbar sein, dürfen aber nicht in Logs oder Dokumentation erscheinen.

## Trust-Boundary / Security-Note

- Der Fallback darf niemals Projekt-Ref oder Pending-Set raten.
- Keine Service-Role-Keys oder DB-Passwörter werden in Prompts, GitHub, Skripten oder Abschlussberichten ausgegeben.
- RLS/RBAC/Grants werden nicht zur Vereinfachung des Pushes geändert.
- Business-Daten werden nicht über Raw-SQL korrigiert.
- Das Postflight-Gate ist Teil derselben Änderung; ohne Postflight kein DONE.
- Ein erfolgreicher `db push` ersetzt weder CI/Security noch Advisor-/DB-Vertragsevidenz.
