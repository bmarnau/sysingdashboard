# ADR-0024: AVKK als Führungsmodell und Reference Data als Plattformdienst

- **Status**: Accepted
- **Datum**: 2026-08-08

## Kontext

Mit Abschluss von Phase 1 (technische Plattform, v1.50.0) beginnt Phase 2
(Fachmodell). Das Dashboard führt heute Projekte, Arbeitspakete und Tätigkeiten
als reine Aufgabenobjekte mit hartkodierten Status- und Prioritätswerten
(`src/lib/dashboard-data.ts`, `src/components/dashboard/constants.ts`). Damit
lässt sich weder Verantwortung differenziert zuordnen noch Umsetzbarkeit oder
Auswirkung bewerten; jede fachliche Wertänderung erfordert ein Release.

Gefordert ist ein fachliches Führungsmodell (AVKK: Aufgabe, Verantwortung,
Kompetenz, Konsequenz), das bestehende Objekte erweitert statt ersetzt, sowie
eine pflegbare Grundlage für Auswahlwerte.

## Entscheidung

1. **AVKK ist eine Führungsmethodik**, deren Datenmodell als eigene Ebene über
   den bestehenden Objekten liegt. Verknüpfung über `subject_type` +
   `subject_id` (`project`, `workpackage`, `activity`, neu `measure`), 1:0..1 je
   Aufgabe. Bestehende Strukturen bleiben unverändert.
2. **Verantwortung** wird zweidimensional erfasst (Rolle: Verantwortlicher /
   Stellvertreter; Art: Ergebnis, Termin, Qualität, …), mehrfach je Aufgabe.
3. **Kompetenz** wird je Dimension (Fachwissen, Erfahrung, Zeit, Material,
   Werkzeuge, Budget, Berechtigung, Unterstützung) mit vorhanden / teilweise /
   nicht vorhanden bewertet. Daraus wird der Frühindikator „zugeordnet, aber
   gefährdet" abgeleitet.
4. **Konsequenz** wird je betroffenem Bereich mit Schweregrad und Terminwirkung
   bewertet. Bewusst ohne Eintrittswahrscheinlichkeit oder Schadensbetrag.
5. **Kontextindikatoren** (Stress, Belastung, Stimmung, …) sind **nicht** Teil
   von AVKK, sondern eine spätere, getrennt berechtigte Ebene mit Aggregation
   in Führungssichten.
6. **Reference Data** wird als allgemeiner Plattformdienst eingeführt
   (`reference_catalog`, `reference_value`, `reference_value_history`), gespeichert
   in Supabase, mit Versionierung, Deaktivierung statt Löschung und
   Schlüssel-/Label-Snapshot beim Konsumenten. AVKK ist der erste Konsument,
   nicht der Eigentümer.
7. **Sprint 07A liefert ausschließlich Architektur und Dokumentation.**
   Migrationen, Services, RBAC-Erweiterungen und UI folgen ab Sprint 07B.

Details: [`docs/AVKK.md`](../AVKK.md), [`docs/REFERENCE-DATA.md`](../REFERENCE-DATA.md).

## Alternativen

- **AVKK-Felder direkt an Projekt/Arbeitspaket/Tätigkeit hängen**: verworfen —
  vervielfacht identische Spalten über drei Entitäten und verhindert den
  späteren Aufgabentyp `measure`.
- **Eine generische Aufgabentabelle, die die bestehenden Objekte ersetzt**:
  verworfen — Big-Bang-Migration mit Bruch von Import/Export, Backup 2.0 und
  allen Dashboard-Ansichten, ohne fachlichen Mehrwert in Phase 2.
- **Kataloge als JSON im Repository**: verworfen — jede fachliche Änderung wäre
  ein Deployment, ohne Historie und Benutzerpflege.
- **Kontextindikatoren als fünfte AVKK-Dimension**: verworfen — vermischt
  sachbezogene Steuerungsdaten mit personenbezogenen, datenschutzsensiblen
  Angaben und würde die Einführung von AVKK an deren Prüfung koppeln.
- **Externes MDM-/Stammdatensystem**: verworfen für den MVP — Betriebs- und
  Integrationsaufwand ohne aktuellen Nutzen; Servicevertrag hält den Weg offen.

## Konsequenzen

**Positiv**

- Verantwortung, Umsetzbarkeit und Auswirkung werden erstmals strukturiert und
  auswertbar; „gefährdet trotz Zuordnung" wird zum Frühindikator.
- Auswahlwerte werden ohne Release pflegbar, versioniert und auditiert.
- Bestehende Fachobjekte, Import/Export und Backup 2.0 bleiben unverändert.
- Report-Service und Managementübersicht bekommen eine definierte Datenbasis.

**Negativ**

- Zusätzliche Ebene bedeutet mehr Joins und mehr Pflegeaufwand; AVKK bleibt
  deshalb optional je Aufgabe.
- Polymorphe Verknüpfung (`subject_type` + `subject_id`) ohne Datenbank-FK ist
  ein bewusster Integritätskompromiss, solange Aufgabenobjekte noch nicht in
  Supabase liegen. Absicherung über `CHECK` und Service-Validierung; Ablösung
  durch echte FKs ist dokumentierter Migrationspfad.
- Reference Data in Supabase steht im Spannungsverhältnis zu ADR-0003
  (Local-First). Ausgleich: verbindlicher Read-Through-Cache, Schreibsperre bei
  Offline-Betrieb.
- Zwei Snapshot-Felder je Katalogbezug erzeugen Redundanz — akzeptiert, weil
  Historie sonst unlesbar wird.

## Trust-Boundary / Security-Note

- AVKK-Daten sind personenbezogen (Verantwortungszuordnung, Bewertungen).
  Zugriff ausschließlich über RLS-Policies mit `has_permission()`; keine
  `USING (true)`-Policies für Schreiboperationen, kein `anon`-Grant.
- Engineers dürfen nur Zeilen ändern, in denen sie selbst verantwortlich sind
  oder die sie erstellt haben.
- `customer` erhält erst dann Zugriff, wenn die Mandanten-/Kunden-Scopes aus
  ADR-0007 real existieren.
- AVKK darf nicht zur personenbezogenen Leistungsüberwachung verwendet werden.
  Kompetenzlücken sind Aussagen über die Aufgabe, nicht über die Person.
  Kontextindikatoren mit Personenbezug werden nur aggregiert in
  Führungssichten dargestellt, sind freiwillig und unterliegen vor Aktivierung
  einer Datenschutzprüfung inklusive Aufbewahrungs- und Löschregeln.
