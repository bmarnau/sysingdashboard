---
id: A09
titel: "R-04: Zugänge und Notfallkonto dokumentieren"
status: erledigt
start: 2026-11-06T06:50+01:00
ende: 2026-11-06T06:57+01:00
branch: docs/2026-11-06-tagesbuendel
pr: "286 (Draft, Tagesbündel)"
commit: 75f138bd
ci: "läuft (Head 75f138bd)"
---

# Bericht A09


Stand: 2026-11-06 · nur gelesen, keine Repo-Datei geändert

## Ergebnis

1. Entwurf `ZUGAENGE-UND-NOTFALLKONTO.md` mit 10 Diensten (Tabelle und YAML), 5 Adresszeilen bei den Mail-Aliasen und Prüfliste ZN-01 bis ZN-18.
2. Für keinen Dienst ist eine zweite Person, ein Notfallkonto oder eine Wiederherstellungsadresse im Repo belegt; alle Felder stehen auf „offen“.
3. Neu aufgenommen: Anwendung (Auth-Konten), Passwort-Tresor, Domain bei df.eu, Postfach info@ als eigene Dienste, weil an ihnen alle anderen Wiederherstellungen hängen.
4. Vorschlag für das Register: neuer Hinweis R-04 (MD Zeile 73), Schwerpunkt 3 erweitert (MD Zeile 79), YAML `hinweis` erweitert und Feld `verweise` (YAML Zeilen 78 bis 80); angewendet auf eine Kopie, strikt geparst.
5. YAML strikt gültig (Entwurf und Register-Kopie), Prettier-Prüfung bestanden, Grep auf Adressen und Geheimnis-Muster ohne Fund.

## Beobachtungen

| Punkt                      | Beobachtung                                                                            | Beleg                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Vorlage Kontenübersicht    | Tabelle ohne Werte vorhanden; alle Zweitwege `[offen]`                                 | `docs/NOTFALL-HANDBUCH.md:143-152`                                                  |
| Bus-Faktor                 | Zweite Person „Rolle benennbar, Person offen“; Notfallkonto fehlt                      | `docs/NOTFALL-HANDBUCH.md:185`, `:216`                                              |
| Wiederherstellungsadressen | nicht dokumentiert                                                                     | `docs/NOTFALL-HANDBUCH.md:195`                                                      |
| REST-20, REST-21           | zwei unabhängige Wege je kritischem Dienst; Notfallzugang getrennt und protokolliert   | `docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md:40-41`                            |
| Schutzklasse               | „Zugänge zu Konten“ als kritisch vorgeschlagen, D1 offen                               | `docs/ADR/0042-rto-rpo-schutzklassen.md:42`, `:259`                                 |
| RTO-Vorbehalt              | ADR verlangt Vermerk „bei Verfügbarkeit des Owners“ bei R-04                           | `docs/ADR/0042-rto-rpo-schutzklassen.md:210`                                        |
| Backend-Art                | Lovable Cloud, kein eigenes Supabase-Projekt (Owner und Support)                       | `docs/CURRENT-STATUS.md:64`, `docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml:978`, `:1354` |
| Rückfrage Backend-Art      | in der Publish-Prüfung noch als offen geführt                                          | `docs/LOVABLE-PUBLISH-PRUEFUNG.md:88`                                               |
| Mail-Aliase                | kiosk@ und anzeige@ Alias auf info@, Leser nur Owner                                   | `docs/DATENAUFTRAG-KIOSK-KONTO.md:35-38`                                            |
| Registrar                  | Domain bei df.eu registriert                                                           | `docs/BACKLOG.md:13`, `:17`                                                         |
| Geplante Funktionsadressen | noreply@, support@, security@, admin@ geplant                                          | `docs/BACKLOG.md:30-38`                                                             |
| Register-Prüfskript        | prüft nur IDs und Score; neues Feld `verweise` unkritisch                              | `scripts/check-project-docs.mjs:79-89`                                              |
| Tracker R-04               | Gegenmaßnahme „Betreiberhoheit in BSF-06; bis dahin dokumentierter Exit-/Restore-Pfad“ | `docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml:593-595`                                   |

## Abweichungen und Fragen

1. Rolle von bm@ widersprüchlich: Systemadministrator (`docs/NACHWEISE.yaml:74-75`) gegen „sehr wahrscheinlich kiosk“ (`docs/DATENAUFTRAG-KIOSK-KONTO.md:29`). Für ZN-13 relevant (zweiter Systemadministrator).
2. Backend-Art: `docs/LOVABLE-PUBLISH-PRUEFUNG.md:88` führt die Rückfrage noch als offen, Tracker und CURRENT-STATUS nennen Lovable Cloud als geklärt. Nachziehen?
3. Mail-Anbieter des Postfachs info@ ist im Repo nicht genannt. Betreibt df.eu auch Mail?
4. Wer kommt als zweite berechtigte Person in Frage (Rolle reicht zunächst)? Davon hängen ZN-02, ZN-03 und die Kiosk-Bestätigung (ZN-18) ab.
5. Lässt Lovable ein zweites Projektmitglied mit Zugriff auf Lovable Cloud zu? Nicht belegt; Frage an den Lovable-Support.
6. Welches Produkt dient als Passwort-Tresor, und gibt es einen Notfallzugang dazu?
7. Besteht das Codex-Konto (ADR-0039) noch mit Zugriff auf GitHub?
8. Claude und OneDrive habe ich als „nicht eingestuft“ geführt (keine kritische Projektfunktion belegt). Bitte bestätigen.

## Abschluss

- Prüfung durch Claude Code: keine @-Adresse mit Domain, keine Passwort-, Token- oder Schlüsselwerte in `docs/ZUGAENGE-UND-NOTFALLKONTO.md` (grep).
- Risikoregister: Hinweis R-04 (2026-11-06) und Schwerpunkt 3 in `docs/RISIKOREGISTER.md`, Hinweis und `verweise` in `docs/RISIKOREGISTER.yaml`; Bewertung unverändert (Score 20). Die optionalen Stand-Änderungen im Register sind nicht übernommen.

Hygiene: 0 gemergte Remote-Branches, 7 offene PRs, davon 6 Drafts.

```yaml
Reifegrad: Kontenübersicht als Entwurf, Zweitwege offen
Projektstatus: Publish No-Go (R-07, R-14); R-04 offen (Score 20)
Offene_Fragen:
  - Zweite berechtigte Person (Rolle, Person)?
  - Anbieter des Postfachs info@, Produkt des Passwort-Tresors, Notfallzugang?
  - Lässt Lovable ein zweites Projektmitglied mit Zugriff auf Lovable Cloud zu?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
