# BSF-03E — Datenbank-Synchronisation 2026-10-14

## Ergebnis

Die veröffentlichte, vollständig von Lovable verwaltete Supabase-Datenbank ist
mit den drei bereits auf GitHub-`main` freigegebenen BSF-03E-Migrationen
synchronisiert. Der Lauf folgte dem kontrollierten Work-/Lovable-Connector-Pfad
aus ADR-0035. Issues #177 und #179 sind nach dem vollständigen Postflight als
erledigt geschlossen.

Angewendete Migrationen, in kanonischer Reihenfolge:

1. `20260922185458_bsf03e_avkk_scope_hardening.sql`
2. `20260927050827_bsf03e_responsibility_mutations.sql`
3. `20260929053733_bsf03e_p3b_due_projection.sql`

Die Migration History endet damit bei `20260929053733`.

## Kontrollierter Ablauf

- Quellstand: freigegebene, unveränderte Migrationsdateien aus GitHub-`main`.
- Zielbindung: Lovable-Projekt, Owner und aktivierter Supabase-Stack wurden vor
  dem Write eindeutig geprüft.
- Pending-Set: exakt die drei oben genannten Migrationen; keine zusätzliche
  Migration und keine nachträgliche History-Reparatur.
- Apply: 3/3 in einer kontrollierten Transaktion mit atomarem History-Eintrag.
- Isolation: Die von Lovable erzeugte Sync-Arbeitsfläche
  `lovable-sync-1791948369` bleibt isoliert und darf nicht nach `main` gemergt
  werden.

## Read-only-Postflight

Der Postflight bestätigte:

- vollständige Migration History bis `20260929053733`,
- aktive RLS-Grenzen und erwartete Policies,
- erwartete BSF-03E-Funktionen, Trigger und Indizes,
- unveränderte fachliche Bestandszahlen,
- erwartete Berechtigungen ohne zusätzliche Service-Role-Normalpfade,
- offizieller Lovable/Supabase-Advisor: 0 ERROR; zwei bereits bekannte WARN,
  keine neue BSF-03E-Warnung.

## Aussagegrenze

Dieser Nachweis schließt das Datenbank-Synchronisationsgate GG-01. Er ersetzt
nicht die Exact-Head-CI/Security-Abnahme des P3b-UI-Kandidaten und nicht die
vollständige P5-Gesamtabnahme von BSF-03E. Er erteilt keine allgemeine Freigabe
für Connector-SQL, fachliche Datenkorrekturen oder Writes in andere Projekte.

## Referenzen

- GitHub Issue #177 — Governance und Apply-Auftrag
- GitHub Issue #179 — kontrollierter Connector-Lauf
- `docs/ADR/0035-kontrollierter-lovable-connector-fallback.md`
- `docs/DATABASE-CHANGE-GOVERNANCE.md`
- `docs/LOVABLE-DATABASE-CHANGE-STANDARD.md`
