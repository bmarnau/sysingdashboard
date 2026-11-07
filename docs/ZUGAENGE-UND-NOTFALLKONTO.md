# Zugänge und Notfallkonto (R-04)

Stand: 2026-11-07 (Verweise auf das Notfallhandbuch auf Abschnitte umgestellt, A31) · Auftrag A09 · Status: Entwurf · Keine Zugangsdaten in dieser Datei

## 1 Zweck

Diese Übersicht mindert den Bus-Faktor 1 aus R-04 („Einzelner Betreiber als SPoF für Freigaben und Supabase-Zugriff“, Score 20, `docs/RISIKOREGISTER.md:16`). Sie beschreibt je Dienst, wer Zugang hat, wie ein Konto wiederhergestellt wird, ob ein Notfallkonto (Break-Glass) besteht und wer als zweite berechtigte Person vorgesehen ist.

Sie füllt die Vorlage „Konten und Zugänge“ des Notfallhandbuchs (`docs/NOTFALL-HANDBUCH.md` (Abschnitt 3)) und schließt, sobald alle Felder belegt sind, die Lücken 2 und 12 (`docs/NOTFALL-HANDBUCH.md` (Lücke 2, Lücke 12)). Anforderungen: REST-20 und REST-21 (`docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md:40-41`). Szenarien: N7 Kontoinhaber nicht verfügbar (`docs/NOTFALL-HANDBUCH.md` (N7)) und N9 Domain, DNS, Auth-Konfiguration (`docs/NOTFALL-HANDBUCH.md` (N9)).

Nach ADR-0042 (Entwurf) gelten die RTO-Werte nur „bei Verfügbarkeit des Owners“, bis eine zweite berechtigte Person oder ein Notfallkonto besteht (`docs/ADR/0042-rto-rpo-schutzklassen.md:210`, `:234`).

## 2 Regeln

1. In dieser Datei stehen keine Werte: kein Passwort, kein Token, kein Schlüssel, keine Wiederherstellungscodes, keine vollständigen E-Mail-Adressen, keine Telefonnummern, keine Tresor-Inhalte.
2. Konten stehen nur mit dem Teil vor dem @ (zum Beispiel info@), wie in `docs/NACHWEISE.yaml:3`. Personen stehen nur mit ihrer Rolle (Owner, zweite Person).
3. Für Zugangsdaten steht nur der Ort: „Passwort-Tresor, Eintrag: …“. Der Eintragsname darf keinen Wert verraten.
4. Unbekannte Angaben müssen als „offen“ stehen. Nichts darf geschätzt oder ergänzt werden, was nicht belegt ist.
5. Für jeden Dienst der Schutzklasse kritisch muss es zwei unabhängige Zugangswege geben (REST-20). Zugänge zu Konten sind nach ADR-0042 als kritisch vorgeschlagen (`docs/ADR/0042-rto-rpo-schutzklassen.md:42`; Entscheidung D1 offen, `:259`).
6. Das Notfallkonto muss getrennt vom Alltagszugang geführt werden: anderer Tresor, anderes Gerät, andere Wiederherstellungsadresse, anderer zweiter Faktor. Jede Nutzung muss im Notfallprotokoll (`docs/NOTFALL-HANDBUCH.md` (Abschnitt 5)) vermerkt werden; danach werden Passwörter und Schlüssel erneuert (REST-21, `docs/NOTFALL-HANDBUCH.md` (Kontenregel 2)).
7. Das Postfach info@ darf nicht die einzige Wiederherstellungsadresse sein (`docs/NOTFALL-HANDBUCH.md` (Kontenregel 3), `docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md:249`).

## 3 Dienste

Schutzklasse ist ein Vorschlag nach ADR-0042 (nicht beschlossen). „Owner“ meint den einzigen heutigen Betreiber.

| Dienst                            | Zweck                                                                                      | Konto                                                                       | Wiederherstellung                | Notfallkonto | Zweite Person                                                             | Zugang (Ort)                    | Support                                               | Schutzklasse (Vorschlag) |
| --------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------- | ------------ | ------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------- | ------------------------ |
| GitHub                            | Git (führende Quelle), CI, PRs, Merge per REST                                             | Owner-Konto bmarnau (Repository bmarnau/sysingdashboard)                    | offen                            | offen        | Rolle: Vertretung für Merge und Freigabe; Person offen                    | Passwort-Tresor, Eintrag: offen | offen                                                 | kritisch                 |
| Lovable                           | Editor, Preview, Publish, Sync mit GitHub                                                  | Owner-Konto (Name offen)                                                    | offen                            | offen        | Rolle: Vertretung Projektzugang; Person offen                             | Passwort-Tresor, Eintrag: offen | Ticket im bestehenden Vorgang (E-Mail an den Support) | kritisch                 |
| Lovable Cloud (Backend, Supabase) | Daten, Auth, Auth-Mailversand (plattformverwaltet)                                         | kein eigenes Supabase-Konto; Zugang nur über das Lovable-Projekt des Owners | hängt am Lovable-Konto           | offen        | Rolle: Vertretung Datenaufträge (ADR-0037, Freigabe 2); Person offen      | wie Lovable                     | Lovable-Support (Lovable Cloud)                       | kritisch                 |
| Anwendung (Auth-Konten)           | Systemadministration der App                                                               | info@ aktiver Systemadministrator; bm@ Rolle ungeklärt                      | Rücksetz-Mails an Postfach info@ | offen        | Rolle: zweiter Systemadministrator; Person offen                          | Passwort-Tresor, Eintrag: offen | intern (Owner)                                        | kritisch                 |
| Domain und DNS                    | Erreichbarkeit, künftige Produktdomain, Mail-Domain                                        | Kundenkonto beim Registrar df.eu; Inhaber offen                             | offen                            | offen        | Rolle: Vertretung Domainverwaltung; Person offen                          | Passwort-Tresor, Eintrag: offen | df.eu-Support, Weg offen                              | kritisch                 |
| Mail (Postfach info@)             | Kontakt, Wiederherstellungsadresse der App-Konten, Ziel der Aliase kiosk@ und anzeige@     | Postfach info@; Mail-Anbieter nicht belegt (offen)                          | offen                            | offen        | Rolle: Mitleser oder Vertretung; Person offen (heute liest nur der Owner) | Passwort-Tresor, Eintrag: offen | offen                                                 | kritisch                 |
| TeamDrive                         | Ablage von Backups (W2) und Notfallmappe (W5)                                              | Owner                                                                       | offen                            | offen        | Rolle: Notfallzugang zweites Gerät oder zweite Person; Person offen       | Passwort-Tresor, Eintrag: offen | offen                                                 | kritisch                 |
| Passwort-Tresor                   | Ablage aller Zugangsdaten und des Dump-Schlüssels                                          | Produkt und Konto offen                                                     | offen                            | offen        | Rolle: Notfallzugriff auf den Tresor; Person offen                        | entfällt (ist selbst der Ort)   | offen                                                 | kritisch                 |
| Claude (Chat und Claude Code)     | Aufträge, Review, Planung                                                                  | Owner                                                                       | offen                            | offen        | nicht erforderlich, solange N2 aus Git wieder aufnehmbar ist              | Passwort-Tresor, Eintrag: offen | offen                                                 | nicht eingestuft         |
| OneDrive                          | Persönliche Dateiablage des Owners; alter Prototyp; keine Arbeitsklone, keine Notfallmappe | Owner                                                                       | offen                            | offen        | nicht erforderlich (keine Projektfunktion belegt)                         | Passwort-Tresor, Eintrag: offen | offen                                                 | nicht eingestuft         |

Belege:

- GitHub: Repository-Name und REST-Merge (`CLAUDE.md:16`); Vorlage `docs/NOTFALL-HANDBUCH.md` (Abschnitt 3).
- Lovable: `docs/NOTFALL-HANDBUCH.md` (Abschnitt 3); Support per E-Mail im Ticket zu R-07 (`docs/LOVABLE-PUBLISH-PRUEFUNG.md:76-79`); Publish nur aus Lovable (`docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml:1354-1355`).
- Lovable Cloud: Backend-Art laut Owner und Support Lovable Cloud, kein eigenes Supabase-Projekt (`docs/CURRENT-STATUS.md:64`, `docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml:978`, `:1354`); plattformverwalteter Auth-Mailversand (`docs/BACKLOG.md:17`); Vorlage `docs/NOTFALL-HANDBUCH.md` (Abschnitt 3).
- Anwendung: info@ aktiver Systemadministrator (`docs/DATENAUFTRAG-KIOSK-KONTO.md:77`, `:88`); Rolle von bm@ ungeklärt (`docs/DATENAUFTRAG-KIOSK-KONTO.md:29`, abweichend `docs/NACHWEISE.yaml:74-75`); Schutz des letzten Systemadministrators durch den Trigger `protect_last_sysadmin_profile` (`docs/DATENAUFTRAG-KIOSK-KONTO.md:77`).
- Domain und DNS: Registrar df.eu (`docs/BACKLOG.md:13`, `:17`); Vorlage `docs/NOTFALL-HANDBUCH.md` (Abschnitt 3).
- Mail: Aliase und Leser (`docs/DATENAUFTRAG-KIOSK-KONTO.md:35-38`); Wiederherstellungsadresse nicht dokumentiert (`docs/NOTFALL-HANDBUCH.md` (Lücke 12)).
- TeamDrive: Entscheidung des Owners 2026-11-03 (`docs/NOTFALL-HANDBUCH.md` (Abschnitt 4), `docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md:108`); Eignung REST-15 offen (`docs/NOTFALL-HANDBUCH.md` (Lücke 9)).
- Passwort-Tresor: als Ort genannt (`docs/NOTFALL-HANDBUCH.md` (Vorspann, Abschnitt 4)); Kosten nicht ermittelt (`docs/ADR/0042-rto-rpo-schutzklassen.md:147`).
- Claude: `docs/NOTFALL-HANDBUCH.md` (Abschnitt 3), Szenario N2 (`docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md:205`); ADR-0039.
- OneDrive: Arbeitsklone entfernt (`docs/CURRENT-STATUS.md:75`); alter Prototyp (`docs/BACKLOG.md:298`); Notfallmappe außerhalb von OneDrive (`docs/NOTFALL-HANDBUCH.md` (Vorspann, Abschnitt 4)).

```yaml
# Zugänge und Notfallkonto (R-04), Entwurf A09, Stand 2026-11-06.
# Keine Werte: nur Rollen, lokaler Teil von Konten und Orte. Unbekanntes = offen.
version: 1
stand: 2026-11-06
status: entwurf
dienste:
  - dienst: GitHub
    zweck: Git als führende Quelle, CI, PRs, Merge per REST
    konto: Owner-Konto bmarnau (Repository bmarnau/sysingdashboard)
    wiederherstellung: offen
    notfallkonto: offen
    zweite_person: "Rolle: Vertretung für Merge und Freigabe; Person offen"
    zugang_ort: "Passwort-Tresor, Eintrag: offen"
    support: offen
    schutzklasse_vorschlag: kritisch
    beleg: ["CLAUDE.md:16", "docs/NOTFALL-HANDBUCH.md Abschnitt 3"]
    stand: 2026-11-06
  - dienst: Lovable
    zweck: Editor, Preview, Publish, Sync mit GitHub
    konto: Owner-Konto (Name offen)
    wiederherstellung: offen
    notfallkonto: offen
    zweite_person: "Rolle: Vertretung Projektzugang; Person offen"
    zugang_ort: "Passwort-Tresor, Eintrag: offen"
    support: Ticket im bestehenden Vorgang (E-Mail an den Lovable-Support)
    schutzklasse_vorschlag: kritisch
    beleg: ["docs/NOTFALL-HANDBUCH.md Abschnitt 3", "docs/LOVABLE-PUBLISH-PRUEFUNG.md:76-79"]
    stand: 2026-11-06
  - dienst: Lovable Cloud (Backend, Supabase)
    zweck: Daten, Auth, plattformverwalteter Auth-Mailversand
    konto: kein eigenes Supabase-Konto; Zugang nur über das Lovable-Projekt des Owners
    wiederherstellung: hängt am Lovable-Konto
    notfallkonto: offen
    zweite_person: "Rolle: Vertretung Datenaufträge (ADR-0037, Freigabe 2); Person offen"
    zugang_ort: wie Lovable
    support: Lovable-Support (Lovable Cloud)
    schutzklasse_vorschlag: kritisch
    beleg:
      - "docs/CURRENT-STATUS.md:64"
      - "docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml:978"
      - "docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml:1354"
      - "docs/BACKLOG.md:17"
    stand: 2026-11-06
  - dienst: Anwendung (Auth-Konten)
    zweck: Systemadministration der App
    konto: "info@ aktiver Systemadministrator; bm@ Rolle ungeklärt"
    wiederherstellung: "Rücksetz-Mails an Postfach info@"
    notfallkonto: offen
    zweite_person: "Rolle: zweiter Systemadministrator; Person offen"
    zugang_ort: "Passwort-Tresor, Eintrag: offen"
    support: intern (Owner)
    schutzklasse_vorschlag: kritisch
    beleg:
      - "docs/DATENAUFTRAG-KIOSK-KONTO.md:29"
      - "docs/DATENAUFTRAG-KIOSK-KONTO.md:77"
      - "docs/DATENAUFTRAG-KIOSK-KONTO.md:88"
      - "docs/NACHWEISE.yaml:74-75"
    stand: 2026-11-06
  - dienst: Domain und DNS
    zweck: Erreichbarkeit, künftige Produktdomain, Mail-Domain
    konto: "Kundenkonto beim Registrar df.eu; Inhaber offen"
    wiederherstellung: offen
    notfallkonto: offen
    zweite_person: "Rolle: Vertretung Domainverwaltung; Person offen"
    zugang_ort: "Passwort-Tresor, Eintrag: offen"
    support: "df.eu-Support, Weg offen"
    schutzklasse_vorschlag: kritisch
    beleg: ["docs/BACKLOG.md:13", "docs/BACKLOG.md:17", "docs/NOTFALL-HANDBUCH.md Abschnitt 3"]
    stand: 2026-11-06
  - dienst: Mail (Postfach info@)
    zweck: Kontakt, Wiederherstellungsadresse der App-Konten, Ziel der Aliase kiosk@ und anzeige@
    konto: "Postfach info@; Mail-Anbieter nicht belegt (offen)"
    wiederherstellung: offen
    notfallkonto: offen
    zweite_person: "Rolle: Mitleser oder Vertretung; Person offen (heute liest nur der Owner)"
    zugang_ort: "Passwort-Tresor, Eintrag: offen"
    support: offen
    schutzklasse_vorschlag: kritisch
    beleg: ["docs/DATENAUFTRAG-KIOSK-KONTO.md:35-38", "docs/NOTFALL-HANDBUCH.md Lücke 12"]
    stand: 2026-11-06
  - dienst: TeamDrive
    zweck: Ablage von Backups (W2) und Notfallmappe (W5)
    konto: Owner
    wiederherstellung: offen
    notfallkonto: offen
    zweite_person: "Rolle: Notfallzugang von zweitem Gerät oder zweiter Person; Person offen"
    zugang_ort: "Passwort-Tresor, Eintrag: offen"
    support: offen
    schutzklasse_vorschlag: kritisch
    beleg:
      [
        "docs/NOTFALL-HANDBUCH.md Abschnitt 4",
        "docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md:108",
      ]
    stand: 2026-11-06
  - dienst: Passwort-Tresor
    zweck: Ablage aller Zugangsdaten und des Dump-Schlüssels
    konto: Produkt und Konto offen
    wiederherstellung: offen
    notfallkonto: offen
    zweite_person: "Rolle: Notfallzugriff auf den Tresor; Person offen"
    zugang_ort: entfällt (ist selbst der Ort)
    support: offen
    schutzklasse_vorschlag: kritisch
    beleg: ["docs/NOTFALL-HANDBUCH.md Vorspann", "docs/NOTFALL-HANDBUCH.md Abschnitt 4"]
    stand: 2026-11-06
  - dienst: Claude (Chat und Claude Code)
    zweck: Aufträge, Review, Planung
    konto: Owner
    wiederherstellung: offen
    notfallkonto: offen
    zweite_person: nicht erforderlich, solange N2 aus dem Git-Stand wieder aufnehmbar ist
    zugang_ort: "Passwort-Tresor, Eintrag: offen"
    support: offen
    schutzklasse_vorschlag: nicht eingestuft
    beleg: ["docs/NOTFALL-HANDBUCH.md Abschnitt 3", "docs/ADR/0039-claude-code-statt-codex.md"]
    stand: 2026-11-06
  - dienst: OneDrive
    zweck: Persönliche Dateiablage des Owners; alter Prototyp; keine Arbeitsklone, keine Notfallmappe
    konto: Owner
    wiederherstellung: offen
    notfallkonto: offen
    zweite_person: nicht erforderlich (keine Projektfunktion belegt)
    zugang_ort: "Passwort-Tresor, Eintrag: offen"
    support: offen
    schutzklasse_vorschlag: nicht eingestuft
    beleg: ["docs/CURRENT-STATUS.md:75", "docs/BACKLOG.md:298", "docs/NOTFALL-HANDBUCH.md Vorspann"]
    stand: 2026-11-06
```

## 4 Mail-Aliase

| Adresse (lokaler Teil)                | Art                           | Ziel  | Leser     | Zweck                                              | Stand                                                    | Beleg                                         |
| ------------------------------------- | ----------------------------- | ----- | --------- | -------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| info@                                 | Postfach                      | –     | nur Owner | Kontakt; Wiederherstellung der App-Konten          | in Betrieb                                               | `docs/DATENAUFTRAG-KIOSK-KONTO.md:35-37`      |
| kiosk@                                | Alias                         | info@ | nur Owner | altes Kiosk-Konto (Rolle viewer), wird archiviert  | in Betrieb                                               | `docs/DATENAUFTRAG-KIOSK-KONTO.md:14`, `:35`  |
| anzeige@                              | Alias                         | info@ | nur Owner | neues Kiosk-Konto (Weg B)                          | festgelegt; Einrichtung ist Vorbedingung V, nicht belegt | `docs/DATENAUFTRAG-KIOSK-KONTO.md:35`, `:70`  |
| bm@                                   | offen                         | offen | offen     | Testkonto, Anzeigegerät bis Weg B; wird archiviert | offen                                                    | `docs/DATENAUFTRAG-KIOSK-KONTO.md:14`, `:112` |
| noreply@, support@, security@, admin@ | geplant (Postfach oder Alias) | offen | offen     | Funktionsadressen für BSF                          | geplant; Einrichtung nicht belegt                        | `docs/BACKLOG.md:30-38`                       |

Folge: Alle Auth-Mails der App-Konten landen im Postfach info@, das nur der Owner liest. Fällt der Owner oder das Postfach aus, kann niemand ein Kennwort zurücksetzen lassen (`docs/DATENAUFTRAG-KIOSK-KONTO.md:38`).

## 5 Prüfliste Notfallmappe

Ergänzt den Inhalt der Notfallmappe (`docs/NOTFALL-HANDBUCH.md` (Abschnitt 4)). Jeder Punkt gilt erst mit Beleg (Datum, Ablageort, bei Kopien SHA-256) als erledigt.

- [ ] **ZN-01** Diese Übersicht liegt als datierte Kopie in der Notfallmappe (TeamDrive und lokaler Datenträger außerhalb von OneDrive), mit SHA-256. Bezug N7, `docs/NOTFALL-HANDBUCH.md` (Abschnitt 4).
- [ ] **ZN-02** Je Dienst der Schutzklasse kritisch ist ein zweiter, unabhängiger Zugangsweg eingetragen: zweite berechtigte Person oder Notfallkonto. Bezug REST-20, N7, `docs/NOTFALL-HANDBUCH.md` (Kontenregel 1).
- [ ] **ZN-03** Die zweite berechtigte Person ist mit Rolle benannt und hat ihre Rolle schriftlich angenommen (Ort des Belegs: offen). Bezug REST-20, N7.
- [ ] **ZN-04** Jedes Notfallkonto ist getrennt vom Alltagszugang: anderer Tresor, anderes Gerät, andere Wiederherstellungsadresse, anderer zweiter Faktor. Bezug REST-21, `docs/NOTFALL-HANDBUCH.md` (Kontenregel 2).
- [ ] **ZN-05** Ort der Wiederherstellungscodes für den zweiten Faktor je Dienst ist eingetragen (nur Ort, keine Codes). Bezug REST-21, N7.
- [ ] **ZN-06** Je Konto ist die Wiederherstellungsadresse eingetragen (nur lokaler Teil oder Rolle). Bezug N9, Lücke 12 (`docs/NOTFALL-HANDBUCH.md` (Lücke 12)).
- [ ] **ZN-07** Mindestens ein Konto je kritischem Dienst hat eine Wiederherstellungsadresse außerhalb des Postfachs info@ und außerhalb der eigenen Domain. Bezug N9, `docs/NOTFALL-HANDBUCH.md` (Kontenregel 3).
- [ ] **ZN-08** Domain beim Registrar df.eu: Inhaber, Kundenkonto (nur Rolle), Ablauf und Verlängerung, Support-Weg eingetragen. Bezug N9, `docs/NOTFALL-HANDBUCH.md` (Abschnitt 3).
- [ ] **ZN-09** Inventar S5 (Domain, DNS, Redirect-URLs, Auth-Provider, Lovable-Verbindung; nur Namen) liegt vor. Bezug N9, `docs/NOTFALL-HANDBUCH.md` (N9, Lücke 4).
- [ ] **ZN-10** Notfallzugriff auf den Passwort-Tresor selbst ist geregelt (zweite Person oder versiegelter Notfallzugang; Ort eingetragen). Bezug REST-20, REST-21.
- [ ] **ZN-11** TeamDrive ist von einem zweiten Gerät oder durch eine zweite Person erreichbar. Bezug REST-20, N7, `docs/NOTFALL-HANDBUCH.md` (Abschnitt 4).
- [ ] **ZN-12** Der Dump-Schlüssel liegt im Passwort-Tresor, nicht im TeamDrive-Bereich der Dumps. Bezug REST-21, `docs/NOTFALL-HANDBUCH.md` (Abschnitt 4).
- [ ] **ZN-13** In der App besteht ein zweites aktives Systemadministrator-Konto oder eine dokumentierte Begründung, warum nicht. Bezug REST-20, N7.
- [ ] **ZN-14** Mail-Aliase (Abschnitt 4) sind mit Ziel und Lesern aktuell; die Einrichtung von anzeige@ ist belegt. Bezug N9.
- [ ] **ZN-15** Kontakt- und Support-Wege je Dienst sind eingetragen, inklusive offener Ticketvorgänge (nur Vorgangsbezug, keine Inhalte). Bezug N7, `docs/NOTFALL-HANDBUCH.md` (N7, Abschnitt 4).
- [ ] **ZN-16** Notfallprotokoll (`docs/NOTFALL-HANDBUCH.md` (Abschnitt 5)) ist für die Nutzung eines Notfallkontos vorbereitet; nach jeder Nutzung werden Passwörter und Schlüssel erneuert. Bezug REST-21.
- [ ] **ZN-17** Planübung N7 halbjährlich und N9 jährlich durchgeführt, Protokoll im Git. Bezug REST-13, REST-19, `docs/NOTFALL-HANDBUCH.md` (Abschnitt 7, N7, Abschnitt 7, N9).
- [ ] **ZN-18** Nachträgliche Bestätigung der Kiosk-Abweichung von ADR-0037 durch die zweite Person liegt vor. Bezug R-04, `docs/DATENAUFTRAG-KIOSK-KONTO.md:47`, `:54`.

## 6 Offene Punkte

1. Zweite berechtigte Person: Rolle benennbar, Person offen (`docs/NOTFALL-HANDBUCH.md` (Lücke 2)). Owner-Entscheidung nötig.
2. Notfallkonto (Break-Glass): für keinen Dienst belegt.
3. Wiederherstellungsadressen aller Konten: offen (Lücke 12).
4. Mail-Anbieter des Postfachs info@: im Repo nicht belegt; ob df.eu auch Mail betreibt, ist offen.
5. Inhaber und Kundenkonto der Domain bei df.eu: offen.
6. Produkt und Notfallzugang des Passwort-Tresors: offen.
7. Ob Lovable einen zweiten Projektzugang (Mitglied, Workspace-Rolle) zulässt und ob dieser auch Lovable Cloud umfasst: nicht belegt (Lovable-Support fragen).
8. Rolle von bm@ widersprüchlich: Systemadministrator (`docs/NACHWEISE.yaml:74-75`) gegen sehr wahrscheinlich kiosk (`docs/DATENAUFTRAG-KIOSK-KONTO.md:29`). Mailweg von bm@ offen.
9. Ob ein Codex-Konto (abgelöst durch ADR-0039) noch Zugriff auf GitHub oder andere Dienste hat: offen.
10. Schutzklassen sind ein Vorschlag (ADR-0042, D1 offen).

## 7 Pflege

Diese Datei muss aktualisiert werden:

- bei jeder Änderung an Konten, Rollen, Aliasen, Wiederherstellungsadressen oder Support-Wegen;
- wenn eine zweite Person benannt oder ein Notfallkonto angelegt, genutzt oder erneuert wird;
- nach jeder Nutzung eines Notfallkontos (mit Verweis auf das Notfallprotokoll);
- nach jeder Planübung N7 oder N9 und nach jedem Vorfall;
- bei der Prüfung von R-04 im Risikoregister (nächste Prüfung laut `docs/RISIKOREGISTER.md:16`: 2026-11-09);
- zusammen mit der Notfallmappe: nach jedem Release, mindestens einmal im Quartal (`docs/NOTFALL-HANDBUCH.md` (Abschnitt 4)).

Bei jeder Aktualisierung müssen `Stand:` und der YAML-Wert `stand` angepasst und die Kopie in der Notfallmappe erneuert werden (ZN-01).
