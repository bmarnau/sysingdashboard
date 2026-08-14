# AVKK UI Quick Check (v1.58.3) — Befunde und Behebungsvorschlag

Reine Analyse, keine Änderung durchgeführt. Nachfolgend die Befunde und ein Vorschlag,
was bei Freigabe behoben würde (ohne DB-, RLS/RBAC- oder Architekturänderung).

## Finding 1 — Gespeicherte Kompetenzbewertung wird nicht vorausgewählt

- Schweregrad: hoch (UI-Korrektheit)
- Ursache: `DimensionRow` in `src/components/avkk/AvkkCompetenceSection.tsx` initialisiert
  `ratingKey`, `supportNeeded`, `note` per `useState(value?...)`. Der Dialog rendert sofort,
  das Dossier lädt asynchron (`useAvkkDossier`). Beim Mount ist `competences = []`, also
  `value = null` → `""`. Es gibt weder `useEffect`-Nachführung noch `key`-Reset, wenn das
  Dossier eintrifft. Deshalb bleibt „— nicht bewertet —“ stehen, obwohl darunter korrekt
  „Gespeichert: vorhanden“ bzw. „Gespeichert: nicht vorhanden“ aus dem Serverstand steht
  („vorhanden“/„nicht vorhanden“ sind Katalog-Labels der Bewertung, kein Systemzustand).
- Auswirkung: Anwender halten den Stand für ungespeichert, bewerten erneut; Doppel-Erfassung
  und Fehleinschätzung des Frühindikators.
- MVP-relevant: ja
- Empfehlung: Feldwerte auf den geladenen Wert nachführen (Reset per `key={dimension.key + (value?.id ?? "leer")}`
  oder `useEffect`-Sync) und die Zeile erst nach Ladeende rendern.

## Finding 2 — Feldbeschriftung „Gespeichert: vorhanden“ ist mehrdeutig

- Schweregrad: mittel
- Ursache: Der Hinweistext mischt Statuswort und Katalogwert ohne Dimensionsbezug.
- Auswirkung: „Gespeichert: nicht vorhanden“ liest sich als „nichts gespeichert“, meint aber
  „Voraussetzung ist nicht vorhanden“.
- MVP-relevant: ja (Verständlichkeit im Abnahmetest)
- Empfehlung: Formulierung „Aktuelle Bewertung: <Label> (gespeichert am …)“.

## Finding 3 — Verantwortungsauswahl ist ein Erfassungsformular ohne Kennzeichnung

- Schweregrad: mittel
- Ursache: `AvkkResponsibilitySection` listet aktive Zuordnungen und zeigt darunter ein
  leeres Formular („— Person wählen —“). Das ist bewusst ein Hinzufügen-Formular: gespeichert
  wird per `assignResponsibility` ein zusätzlicher Eintrag; bestehende Verantwortliche werden
  nicht ersetzt und lassen sich in der UI auch nicht beenden (Repository hätte `end`).
- Auswirkung: Anwender vermuten, die Auswahl zeige oder ersetze den gespeicherten Stand.
  Real entstehen unbeabsichtigt mehrere parallele Verantwortliche.
- MVP-relevant: ja (nur Beschriftung), Beenden-Funktion nach MVP
- Empfehlung: Abschnitt in „Zugeordnet“ und „Weitere Verantwortung hinzufügen“ trennen.

## Finding 4 — Überschreibrisiko begrenzt, aber Notiz/Unterstützungsbedarf gehen verloren

- Schweregrad: mittel
- Ursache: Speichern ist ausschließlich explizit pro Abschnitt; leeres Rating ist per
  `disabled={ratingKey === ""}` gesperrt. Ein Öffnen/Schließen setzt also nichts zurück.
  Aber: Weil die Felder nicht initialisiert werden (Finding 1), schreibt ein erneutes
  Speichern die vorhandene Notiz und den Haken „Unterstützung nötig“ als leer/false fort
  (Superseding), ohne dass der Anwender das sieht.
- Auswirkung: stiller Verlust von Notiz und Unterstützungsbedarf.
- MVP-relevant: ja
- Empfehlung: mit Finding 1 zusammen beheben (Initialisierung löst es).

## Finding 5 — Kennzahlen in „Mein AVKK“ teils unscharf

- Schweregrad: niedrig
- Ursache: Kacheln tragen nur Kurzlabels ohne Definition. Konkret:
  „Vollständig“ = Verantwortung ≥ 1 UND alle Dimensionen bewertet UND mindestens eine
  Konsequenz; „Mit AVKK-Stand“ = Dossier existiert (auch leer); „Eigene Verantwortung“ =
  angemeldete Person ist zugeordnet; „Gefährdet“ und „Überfällig“ überschneiden sich mit
  „Aufgaben“ und untereinander (keine disjunkten Mengen).
- Auswirkung: Summen wirken widersprüchlich („Gefährdet“ + „Vollständig“ > „Aufgaben“).
- MVP-relevant: nein
- Empfehlung: `title`/`aria-description` je Kachel mit einer Satzdefinition, keine
  fachliche Neugestaltung.

## Finding 6 — Lange Aufgabenbezeichnungen werden ohne Ausweg abgeschnitten

- Schweregrad: niedrig
- Ursache: In `AvkkTaskTable` ist die Titelspalte auf `max-w-[16rem] truncate`, Bezug auf
  `max-w-[12rem] truncate`, in der Kartenansicht ebenfalls `truncate` — ohne `title`-Attribut.
  Im Dialogkopf steht der Titel im Modal-Titel, dort ungekürzt.
- Auswirkung: Aufgaben mit gleichem Präfix sind in der Liste nicht unterscheidbar.
- MVP-relevant: nein
- Empfehlung: `title={row.task.title}` ergänzen, in der Kartenansicht zweizeilig umbrechen.

## Gesamtaussage

- BESTEHENDE WERTE BEIM ÖFFNEN KORREKT INITIALISIERT: NEIN
- RISIKO UNBEABSICHTIGTEN ÜBERSCHREIBENS: JA (Notiz und Unterstützungsbedarf, nicht die Bewertung selbst)
- MVP-BLOCKER: NEIN (kein Datenverlust der Bewertung, Historie bleibt erhalten)
- EMPFEHLUNG: Findings 1–4 vor MVP beheben, Findings 5–6 nach MVP

## Umsetzungsvorschlag bei Freigabe (rein Frontend)

1. `AvkkCompetenceSection.tsx`: Zeilen erst nach Ladeende rendern und Feldwerte per `key`
   an den geladenen Datensatz binden; Hinweistext neu formulieren.
2. `AvkkResponsibilitySection.tsx`: Überschriften „Zugeordnet“ / „Weitere Verantwortung
   hinzufügen“ ergänzen.
3. `AvkkDetailDialog.tsx`: `loading` an die Abschnitte durchreichen.
4. `AvkkTaskTable.tsx`: `title`-Attribute ergänzen.
5. Doku-Sync: CHANGELOG-Eintrag und Handbuchkapitel AVKK anpassen, `bun run docs:check`.
