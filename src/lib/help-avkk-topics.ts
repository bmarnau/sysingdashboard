import type { HelpTopic } from "@/lib/help-documentation";

/**
 * Fachnahe AVKK-Hilfethemen.
 *
 * Die IDs überschreiben bewusst die historischen Built-in-Themen im zentralen
 * Handbuch-Registry. So bleiben kontextsensitive Hilfe und Benutzerhandbuch
 * fachlich auf demselben Stand wie die AVKK-Oberfläche.
 */
export const avkkHelpTopics: HelpTopic[] = [
  {
    id: "avkk-arbeitsplatz",
    title: "Mein AVKK — persönlicher Arbeitsplatz",
    category: "Fachmodell",
    route: "/",
    component: "AvkkWorkspaceView",
    keywords: [
      "AVKK",
      "Arbeitsplatz",
      "Gefährdet",
      "Frühindikator",
      "Verantwortung",
      "Verantwortungsgefühl",
      "Kompetenz",
      "Konsequenz",
      "Filter",
    ],
    lastUpdated: "2026-08-22",
    content: `## Wo finde ich den Arbeitsplatz?
Im Dashboard über den Tab **Mein AVKK** (Berechtigung \`avkk.view\`).

## Was zeigt die Liste?
Die Liste zeigt die für Sie sichtbaren AVKK-Sachverhalte mit Verantwortung,
bewerteten Kompetenzdimensionen, Konsequenzen und dem Frühindikator. Suche,
Sortierung und Filter grenzen die Liste ein.

## Detailansicht
Über **Öffnen** erscheint der AVKK-Detaildialog mit den vier Dimensionen
A – V – K – K. Die vier Dimensionen gehören zusammen und beschreiben die
Situation rund um eine Aufgabe, nicht die Leistung einer Person.

## Verantwortung — mehr als eine formale Zuordnung
Die Leitfrage lautet: **Fühle ich mich für diese Aufgabe und ihr Ergebnis
verantwortlich — und ist für alle klar, wofür ich Verantwortung übernehme?**
Die Zuordnung im Dashboard macht diese Verantwortungsübernahme sichtbar. Das
System speichert und bewertet aber **kein Gefühl** und bildet daraus keinen
Mitarbeiter-Score.

Der Abschnitt **Zugeordnet** zeigt die gültigen Verantwortungen. Das Formular
**Weitere Verantwortung hinzufügen** ergänzt eine weitere Zuordnung; bestehende
Verantwortungen werden nicht ersetzt. Eine bereits identisch aktive Zuordnung
wird erkannt und kann nicht erneut gespeichert werden.

## Kompetenz — Kompetenzen und Ressourcen
Kompetenz fragt nicht nur nach Fachwissen. Entscheidend ist, ob alle
Voraussetzungen zur erfolgreichen Umsetzung vorhanden sind, zum Beispiel
Erfahrung, Zeit, Material, Werkzeuge, Budget, Berechtigungen und Unterstützung.
Eine fehlende Voraussetzung ist eine Aussage über die Aufgabensituation, nicht
eine Bewertung der Person.

## Konsequenz — Folgen der Nichterfüllung
Die Leitfrage lautet: **Welche negativen Folgen entstehen, wenn die Aufgabe
nicht, nicht vollständig oder zu spät erfüllt wird — für andere Mitwirkende,
für den Kunden und für mich selbst?**
Fachliche Kategorien wie Termin, Projekt, SLA, Datenschutz,
Informationssicherheit, Vertrag oder wirtschaftliche Auswirkungen konkretisieren
diese drei Perspektiven.

## Wann gilt ein Sachverhalt als gefährdet?
Wenn eine gültige Verantwortung zugeordnet ist **und** mindestens eine
Kompetenzdimension „nicht vorhanden“ oder mindestens zwei „teilweise
vorhanden“ sind. Die Gründe werden im Kontextblock ausgeschrieben.

## Führungsgrundsatz
AVKK dient der Transparenz, Unterstützung, Priorisierung und Risikoerkennung.
Es ist **kein Instrument zur automatisierten personenbezogenen
Leistungsbewertung**.`,
    relatedTopics: ["avkk-modell", "avkk-management"],
  },
  {
    id: "avkk-modell",
    title: "AVKK — Führungs- und Steuerungsmodell",
    category: "Fachmodell",
    keywords: [
      "AVKK",
      "Aufgabe",
      "Verantwortung",
      "Verantwortungsgefühl",
      "Kompetenz",
      "Ressourcen",
      "Konsequenz",
      "Führung",
      "Steuerung",
      "Priorisierung",
      "Unterstützungsbedarf",
    ],
    lastUpdated: "2026-08-22",
    content: `## Was ist AVKK?
AVKK ist die fachliche Führungsmethodik des Sysing Dashboards. Sie betrachtet
eine Aufgabe über vier zusammengehörige Fragen:

- **A – Aufgabe:** Was genau ist zu tun, bis wann, und woran ist die Erfüllung erkennbar? Ist die Aufgabe für die ausführende Person klar und gemeinsam nachvollziehbar?
- **V – Verantwortung:** Fühle ich mich für diese Aufgabe und ihr Ergebnis verantwortlich — und ist klar, wofür ich Verantwortung übernehme?
- **K – Kompetenz:** Sind alle Kompetenzen und Ressourcen vorhanden, um die Aufgabe mit der übernommenen Verantwortung erfüllen zu können?
- **K – Konsequenz:** Welche negativen Folgen entstehen bei Nichterfüllung — für andere Mitwirkende, für den Kunden und für mich selbst?

AVKK ist **nicht nur ein Datenmodell**. Das Datenmodell bildet die Methodik
technisch ab, ersetzt aber nicht das gemeinsame Verständnis einer Aufgabe.

## Verantwortung: Gefühl klären, nicht Gefühl messen
Verantwortung beginnt mit der persönlichen Übernahme: Eine Person soll sagen
können: **„Ich fühle mich für diese Aufgabe und ihr Ergebnis verantwortlich.“**
Die formale Zuordnung im Dashboard hält anschließend sichtbar fest, wer welche
Verantwortung übernommen hat, zum Beispiel für Ergebnis, Termin, Qualität,
Budget, Freigabe oder Koordination.

Das Dashboard misst nicht, wie stark jemand Verantwortung empfindet, und leitet
daraus keine Bewertung ab. Verantwortungsgefühl ist eine Führungs- und
Klärungsfrage, kein personenbezogener Kennwert.

## Kompetenz: Umsetzbarkeit gemeinsam prüfen
Kompetenz umfasst sowohl persönliche Fähigkeiten als auch die benötigten
Ressourcen und Rahmenbedingungen: Fachwissen, Erfahrung, Zeit, Material,
Werkzeuge, Budget, Berechtigungen und Unterstützung. Fehlt etwas, zeigt AVKK
einen Unterstützungs- oder Klärungsbedarf — keine persönliche Schwäche.

## Konsequenz: die drei Perspektiven zuerst
Konsequenz betrachtet bewusst die **negativen Folgen der Nichterfüllung** aus
drei grundlegenden Perspektiven:

- **andere Mitwirkende:** Welche Abhängigkeiten, Mehrarbeit oder Blockaden entstehen für Kolleginnen, Kollegen oder weitere Beteiligte?
- **Kunde:** Welche Auswirkungen entstehen auf Leistung, Termin, Qualität, Vertrauen oder vertragliche Erwartungen?
- **ich selbst:** Welche Folgen entstehen für meine eigene Arbeit, Zusagen, Termine oder nachgelagerte Aufgaben?

Erst danach helfen fachliche Kategorien wie Projekt, SLA, Datenschutz,
Informationssicherheit, Compliance, Vertrag oder wirtschaftliche Auswirkungen,
die Konsequenzen genauer zu beschreiben.

## Nutzen
- Mitarbeitende können Klarheit und Unterstützungsbedarf sachlich ansprechen.
- Projektverantwortliche erkennen Verantwortungs- und Voraussetzungslücken,
  bevor Termine oder Ergebnisse gefährdet werden.
- Führungskräfte erhalten eine begründete Priorisierung auf Basis der
  dokumentierten Aufgabensituation und ihrer Folgen.

## Abgrenzung
AVKK dient **nicht** der personenbezogenen Leistungsüberwachung. Keine der vier
Dimensionen darf für Mitarbeiter-Rankings, automatisierte Scores oder eine
automatisierte Leistungsbewertung verwendet werden. Der verantwortliche Mensch
entscheidet.`,
    relatedTopics: ["avkk-arbeitsplatz", "avkk-management", "reference-data"],
  },
];
