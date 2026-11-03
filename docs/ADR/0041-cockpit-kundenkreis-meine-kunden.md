# ADR-0041: Cockpit-Kundenkreis = „Meine Kunden“

- **Status**: Accepted (Owner, 2026-11-02)
- **Datum**: 2026-11-02
- **Ergänzt**: `docs/L2-COCKPIT-SCHNITT-KONZEPT.md` (Abschnitt Kundenkreis), BSF-03 „Meine Kunden“
- **Herkunft**: Befund der Rollenabnahme U5 (PR 271), Entscheidung E-U6-2 des Owners per Auswahlfrage im Chat

## Kontext

Bei der Rollenabnahme U5 in der Lovable-Vorschau sah der Systemadministrator Bernd im
Managementcockpit nur Kunde A, die Projektmanagerin Petra nur Kunde B. Ursache ist der
Kundenkreis des Cockpits: Die Serverfunktion übernimmt die Menge „Meine Kunden“. Für
Systemadministratoren gibt es keine Ausnahme nach Rolle. Bis U5 war das eine Folge des
Entwurfs, aber weder als Entscheidung festgehalten noch für die Rolle Systemadministrator
getestet.

## Entscheidung

Das Managementcockpit zeigt jeder berechtigten Rolle, auch dem Systemadministrator und
dem Administrator, nur die Kunden aus „Meine Kunden“. Ein Kunde gehört dazu, wenn
`is_my_customer` ihn bestätigt: aktives Konto, `dashboard.view`, aktive
Systemhaus-Mitgliedschaft, Kundenzugriff mindestens `read` und eigene aktive
Verantwortung. Einen Gesamtblick über alle Kunden des Systemhauses gibt es im Cockpit nicht.

## Begründung

- **Fail-closed**: Der Kundenkreis entsteht aus einer serverseitig bestätigten Positivliste.
  Breite Leserechte einer Rolle führen nicht automatisch zu mehr Cockpit-Inhalt.
- **Datensparsamkeit**: Das Cockpit zeigt Handlungsbedarf dort, wo die Person Verantwortung
  trägt. Fremde Kunden erscheinen nicht.
- **Keine zweite Scope-Logik**: Das Cockpit nutzt dieselbe Prüfung wie „Meine Kunden“;
  es gibt keinen eigenen Rollen-Sonderweg, den man zusätzlich absichern müsste.

## Beleg

- `supabase/migrations/20260908032151_de29e3b1-88ac-45c2-b58f-abbc20d7a077.sql`, Zeile 145 bis 156:
  Funktion `is_my_customer` (Konto, Permission, Mitgliedschaft, Kundenzugriff, eigene Verantwortung).
- `src/lib/management-cockpit-runtime/management-cockpit.functions.ts`, Zeile 126 bis 130:
  Kundenkreis aus `listMyCustomers`, jeder Kandidat einzeln über `is_my_customer` bestätigt.
- `src/__tests__/backend/management-cockpit.functions.test.ts`, Test
  „Systemadministrator (ADR-0041): nur Kunden aus „Meine Kunden“, kein Gesamtblick ohne eigene
  Verantwortung“: alle Cockpit-Rechte, Quellen mit Zeilen für Kunde A und B, Kunde B ohne
  Bestätigung durch `is_my_customer`; Ergebnis enthält nur Kunde A.

## Alternativen

- Gesamtblick für Systemadministrator und Administrator: verworfen für L2, weil er eine eigene
  Scope-Prüfung mit Migration und Sicherheitstests verlangt.
- Umschalter „Meine Kunden / Alle Kunden“: verworfen aus demselben Grund und wegen zusätzlicher
  Fehlerquelle in der Darstellung.

## Konsequenzen

- Positiv: Ein einziger, getesteter Scope-Pfad; keine Ausweitung des Datenzugriffs durch das Cockpit.
- Negativ: Ein Systemadministrator ohne eigene Kundenverantwortung sieht ein leeres Cockpit. Der
  Leertext muss das künftig verständlich erklären (Backlog, Beobachtung U5).
- Folge: Ein Gesamtblick für Administratoren wäre ein eigenes Paket mit Migration, eigener
  Scope-Funktion, RLS-Prüfung und Sicherheitstests sowie einer neuen ADR.

## Trust-Boundary / Security-Note

Die Grenze bleibt serverseitig (RLS und `is_my_customer`). Der Client übergibt weder Kunde noch
Stichtag noch Rolle; die Anfrage akzeptiert nur ein leeres Objekt.
