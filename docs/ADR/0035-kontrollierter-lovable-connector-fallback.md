# ADR-0035: Kontrollierter Work-/Lovable-Connector-Fallback

- **Status**: Accepted
- **Datum**: 2026-10-13
- **Supersedes**: ADR-0034
- **Ergänzt**: Database Change Governance, Lovable Database Change Standard

## Kontext

ADR-0034 erlaubte für bereits versionierte Migrationen einen lokalen
Supabase-CLI-Fallback, wenn Lovable keinen kanonischen Apply-Pfad bereitstellt.
Dieser Fallback setzt jedoch voraus, dass der Operator Zugriff auf das
Supabase-Projekt und eine verknüpfte CLI-Sitzung besitzt.

Das Sysing Dashboard verwendet im MVP eine vollständig von Lovable verwaltete
Supabase-Datenbank. Der Projekt-Owner besitzt absichtlich keinen separaten
Supabase-Zugang. Für GG-01 / BSF-03E waren deshalb weder der reguläre
Lovable-Migrationspfad noch der lokale CLI-Fallback ausführbar, obwohl:

- die drei Migrationen bereits unverändert auf GitHub-`main` lagen,
- Lovable die verbundene Datenbank eindeutig lesen konnte,
- der Drift und das exakte Pending-Set feststanden und
- der authentifizierte Work-/Lovable-Datenbank-Connector Transaktions-, DDL-
  und Migration-History-Rechte auf genau dieser Projektbindung besaß.

Damit war nicht das Schema, sondern der bisher vorausgesetzte Operatorzugang
der verbleibende Blocker.

## Entscheidung

Lovables normaler verwalteter Migrationspfad bleibt der bevorzugte Weg. Wenn er
vorhandene Supabase-Migrationen nicht unverändert mit ihrer exakten History
anwenden kann und ein separater Supabase-Zugang im Lovable-Betriebsmodell nicht
existiert, ist ein kontrollierter Work-/Lovable-Connector-Fallback zulässig.

Er ist nur freigegeben, wenn alle folgenden Bedingungen erfüllt sind:

1. Der Projekt-Owner hat den konkreten Connector-Fallback ausdrücklich
   freigegeben.
2. Die Migrationen sind bereits Bestandteil des freigegebenen GitHub-Stands.
   Dateiname, Git-Blob und SHA-256 werden vor dem Write protokolliert.
3. Das Ziel wird über die exakte Lovable-Projekt-ID, die Owner-Zuordnung, den
   aktivierten Supabase-Stack und einen projektspezifischen Live-Fingerprint
   gebunden. Ein nur gleichnamiges oder separates Supabase-Projekt reicht nicht.
4. Migration History, Zielobjekte und relevante Dateninvarianten werden
   read-only geprüft. Das Pending-Set muss exakt der Freigabe entsprechen.
5. Eine statische Prüfung bestätigt, dass die Dateien transaktional ausführbar
   sind. Eigene Transaktionsgrenzen, `CONCURRENTLY`, `VACUUM`, `REINDEX` oder
   vergleichbare nicht transaktionale Befehle führen zu `BLOCKED`.
6. Der Write erfolgt ausschließlich über den Datenbank-Connector des exakt
   gebundenen Lovable-Projekts. Andere Supabase-Connectoren sind verboten.
7. Jede Migrationsdatei wird byte-identisch und in Versionsreihenfolge in einer
   eigenen Transaktion ausgeführt. In derselben Transaktion wird genau eine
   History-Zeile mit Version und Namen ergänzt. Dadurch existiert kein Zustand,
   in dem Schema und History getrennt committen.
8. Der History-Eintrag ist Bestandteil des Apply-Vorgangs und keine nachträgliche
   Reparatur. Bereits vorhandene Versionen, teilweise vorhandene Zielobjekte oder
   konkurrierender Drift stoppen fail-closed vor dem Write.
9. Fachliche Produktivdaten werden nicht korrigiert, ersetzt oder als
   Hilfskonstruktion verändert. Zulässig sind ausschließlich die Wirkungen der
   bereits freigegebenen Migrationen.
10. Unmittelbar danach werden History, Zielobjekte, RLS/Grants,
    Daten-/Count-Invarianten, DB-Verträge und der offizielle Security Advisor
    read-only geprüft.
11. Bei Fehler oder unklarer Toolantwort gibt es keinen Blind-Retry. Zuerst wird
    der tatsächliche Commit- und Objektzustand read-only ermittelt.

Der Connector-Fallback ist kein allgemeiner produktiver SQL-Zugang. Er ist ein
eng begrenzter Ausführungskanal für bereits freigegebene, kanonische
Git-Migrationen in einer Lovable-verwalteten Datenbank.

## Alternativen

- **Supabase-Zugang für den Projekt-Owner erzwingen**: verworfen, weil dies dem
  bewusst Lovable-verwalteten Betriebsmodell widerspricht.
- **Weiter auf den lokalen CLI-Fallback warten**: verworfen, weil ohne
  Supabase-Projektzugang kein ausführbarer Pfad entsteht.
- **Drizzle- oder Ersatzmigration erzeugen**: verworfen, weil Git- und
  Live-Historie auseinanderlaufen würden.
- **Schema ohne atomaren History-Eintrag anwenden**: verworfen, weil ein
  nicht reproduzierbarer Zwischenzustand entstünde.

## Konsequenzen

- Positiv: Der Lovable-Betrieb benötigt keinen zusätzlichen Supabase-Account.
- Positiv: GitHub bleibt Source of Truth; Dateiinhalte und Versionsreihenfolge
  bleiben unverändert.
- Positiv: Schemaänderung und Migration History werden atomar gekoppelt.
- Positiv: Work, Codex und Lovable besitzen klar getrennte Aufgaben:
  Codex prüft Git-Artefakte, Work orchestriert Gates und Lovable bindet die DB.
- Negativ: Der Fallback besitzt hohe DB-Rechte und benötigt deshalb eine
  ausdrückliche Einzelfreigabe sowie vollständige Pre-/Postflight-Evidence.
- Negativ: Er ist nur für kleine, vorab geprüfte Pending-Sets geeignet und kein
  Ersatz für einen regulären Migrationsdienst.

## Trust-Boundary / Security-Note

- Projekt-ID, Git-Commit, Dateihashes und Live-Fingerprint müssen gemeinsam
  passen; eine einzelne Kennung genügt nicht.
- SQL stammt ausschließlich aus den freigegebenen Migrationsdateien. Wrapper
  dürfen nur Transaktion, Advisory Lock, Precondition und atomaren
  Migration-History-Eintrag ergänzen.
- Secrets, Verbindungsdaten und Tokens werden weder ausgegeben noch gespeichert.
- RLS/RBAC/Grants werden nicht außerhalb der Migration aufgeweicht.
- Der Fallback darf keine Business-Datenkorrektur enthalten.
- Ohne erfolgreichen Postflight lautet der Status nicht `DONE`.
