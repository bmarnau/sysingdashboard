# Sysing → LeadOS — Erkenntnisse aus der praktischen AVKK-Umsetzung

**Stand:** 22.08.2026  
**Quelle:** praktische AVKK-Implementierung und Rollenabnahme im Sysing Dashboard  
**Zweck:** fachliche und technische Lernerfahrungen für die weitere LeadOS-Entwicklung sichern

---

## 1. Einordnung: AVKK und ZAVKK nicht vermischen

LeadOS und Sysing sind fachlich verwandt, aber nicht identisch:

- **LeadOS:** ZAVKK = Ziel → Aufgabe → Verantwortung → Kompetenz → Konsequenz.
- **Sysing Dashboard:** AVKK = Aufgabe → Verantwortung → Kompetenz → Konsequenz.

Der Transfer erfolgt deshalb **nicht als 1:1-Kopie des Modells**. LeadOS behält
seine zusätzliche Ziel-Ebene. Sysing beginnt bewusst bei der Aufgabe; Ziel- und
Ergebniskontext kommen dort aus Projekt und Arbeitspaket.

Übertragbar sind die fachliche Bedeutung der vier gemeinsamen Dimensionen und
die praktischen Erfahrungen aus ihrer technischen Umsetzung.

---

## 2. Verantwortung: persönliche Übernahme vor technischer Zuordnung

Die wichtigste fachliche Präzisierung aus LeadOS lautet sinngemäß:

> Verantwortung ist auch ein Gefühl: Die Person soll für sich klar beantworten
> können, ob sie sich für diese Aufgabe verantwortlich fühlt.

Die Sysing-Umsetzung zeigt, dass dafür zwei Ebenen sauber getrennt werden
müssen:

1. **Führungs-/Klärungsebene:** „Fühle ich mich für diese Aufgabe und ihr
   Ergebnis verantwortlich?“
2. **Systemebene:** Wer hat welche Verantwortung formal übernommen — zum
   Beispiel Ergebnis, Termin, Qualität, Budget, Freigabe oder Koordination?

### Erkenntnis für LeadOS

Das Verantwortungsgefühl sollte im Führungsdialog ausdrücklich geklärt werden.
Es sollte aber **nicht als psychologischer Messwert oder Mitarbeiter-Score**
gespeichert werden. Die Software kann die geklärte Verantwortungsübernahme
sichtbar machen, ohne zu behaupten, das innere Gefühl einer Person messen zu
können.

---

## 3. Kompetenz: Fähigkeiten und Ressourcen gemeinsam betrachten

In der praktischen Umsetzung reicht „Kann die Person das?“ nicht aus.
Umsetzbarkeit hängt gleichzeitig von persönlichen Kompetenzen und äußeren
Ressourcen ab.

Bewährte Prüfdimensionen aus Sysing:

- Fachwissen,
- Erfahrung,
- Zeit,
- Material,
- Werkzeuge und Systeme,
- Budget,
- Berechtigungen,
- Unterstützung und verfügbare Ansprechpartner.

### Erkenntnis für LeadOS

Die Leitfrage sollte lauten:

> Sind alle Kompetenzen und Ressourcen vorhanden, um die Aufgabe mit der
> übernommenen Verantwortung erfolgreich erfüllen zu können?

Eine fehlende Voraussetzung ist zunächst ein **Befund zur Aufgabe und ihren
Rahmenbedingungen**, nicht automatisch ein Defizit der Person.

---

## 4. Konsequenz: zuerst drei menschlich verständliche Perspektiven

Die rein technische Aufzählung von Kategorien wie Projekt, SLA, Datenschutz,
Informationssicherheit oder wirtschaftlichem Schaden ist für die erste
Führungsfrage zu abstrakt.

In Sysing wurde deshalb die Konsequenzfrage fachlich geschärft:

> Welche negativen Folgen entstehen, wenn die Aufgabe nicht, nicht vollständig
> oder zu spät erfüllt wird — für andere Mitwirkende, für den Kunden und für
> mich selbst?

Erst danach helfen Fachkategorien, die Konsequenz genauer zu beschreiben.

### Perspektive 1 — andere Mitwirkende

- Blockaden,
- Abhängigkeiten,
- Mehrarbeit,
- fehlende Informationen,
- Terminverschiebungen,
- zusätzliche Koordination.

### Perspektive 2 — Kunde

- Leistung wird nicht oder verspätet erbracht,
- Qualitätsverlust,
- Termin- oder SLA-Verletzung,
- Vertrauensverlust,
- vertragliche oder wirtschaftliche Folgen.

### Perspektive 3 — ich selbst

- eigene Zusagen werden nicht eingehalten,
- Nacharbeit entsteht,
- nachgelagerte Aufgaben geraten unter Druck,
- eigene Termine oder Verantwortungen werden gefährdet.

### Erkenntnis für LeadOS

Für einen Coaching-/Führungsdialog sind diese drei Perspektiven leichter
verständlich als ein umfangreicher Risikokatalog. Detailkategorien können im
Hintergrund oder in einer Vertiefung folgen.

---

## 5. Delegation braucht mehr als einen „Person auswählen“-Dialog

Die reale Rollenabnahme in Sysing hat gezeigt, dass eine technisch sichtbare
Delegationsfunktion noch lange keine belastbare Delegation ist.

Folgende Punkte mussten praktisch geklärt werden:

- berechtigte Führungskraft darf Verantwortung zuordnen,
- ausführende Rollen dürfen diese Zuordnung nicht eigenmächtig vergeben,
- auswählbare Personen müssen datensparsam und verständlich angezeigt werden,
- technische UUIDs dürfen niemals als Personenname erscheinen,
- Namen müssen konsistent als **Vorname Nachname** dargestellt werden,
- bestehende Verantwortung darf durch eine neue Zuordnung nicht unbemerkt
  ersetzt werden,
- identische aktive Doppelzuordnungen müssen verhindert werden,
- Historisierung muss möglich bleiben.

### Erkenntnis für LeadOS

Eine spätere produktive Delegationsfunktion sollte als eigener fachlicher
Vertrag betrachtet werden: **Wer darf wem was mit welcher Verantwortung
übergeben, und wie wird die Übernahme sichtbar bestätigt?**

---

## 6. Datenminimierung beim Personenverzeichnis

Für die Delegation musste Sysing Personen auswählbar machen, ohne dafür allen
Führungskräften vollständige Benutzerprofile zu öffnen.

Bewährter Minimalvertrag:

- User-ID,
- Vorname Nachname,
- Rolle,
- Aktivstatus.

Nicht erforderlich für die Auswahl:

- E-Mail-Adresse,
- Telefonnummer,
- MFA-Daten,
- Profilbild,
- weitere Profildaten.

### Erkenntnis für LeadOS

Auch bei einer späteren Benutzer-/Mitarbeiterverwaltung sollte immer zuerst
ein **minimaler fachlicher Personenvertrag** definiert werden, statt ein
komplettes Profil als Universalobjekt zu verwenden.

---

## 7. Technische IDs niemals als fachliche Darstellung verwenden

In der ersten Sysing-Abnahme wurde ein Verantwortlicher als UUID angezeigt.
Das war technisch korrekt, fachlich aber unbrauchbar.

Die Korrektur bestand aus:

- datensparsamem Personenverzeichnis,
- zentraler Namensnormalisierung,
- Fallback „Unbekannte Person“ statt sichtbarer UUID.

### Erkenntnis für LeadOS

Fachliche Oberflächen dürfen interne IDs nicht als Ersatz für fehlende
Darstellungsdaten verwenden. Ein technischer Schlüssel ist kein Benutzername.

---

## 8. Duplikate fachlich verhindern, nicht nur optisch

Bei der manuellen Sysing-Abnahme entstand dieselbe Verantwortung zweimal:
Person + Rolle + Verantwortungsarten waren identisch.

Daraus folgten drei Schutzebenen:

1. UI erkennt eine bereits aktive identische Zuordnung und deaktiviert den
   Speichern-Button.
2. Ein lokaler Submit-Lock verhindert parallele Doppel-Requests.
3. Die Fachlogik prüft unmittelbar vor dem Insert erneut auf ein identisches
   aktives Duplikat.

Bereits entstandene Testduplikate wurden **historisierend beendet**, nicht hart
gelöscht.

### Erkenntnis für LeadOS

Wichtige Führungsdaten benötigen eine fachliche Idempotenzregel. Ein
Doppelklick oder wiederholter Request darf nicht zu einer zweiten identischen
Verantwortungsübernahme führen.

---

## 9. Historisierung ist bei Verantwortung wichtiger als Löschen

Verantwortungen ändern sich über die Zeit. Deshalb ist „Datensatz löschen“ für
die spätere Nachvollziehbarkeit häufig die falsche Operation.

In Sysing werden Verantwortungszuordnungen über Gültigkeitszeiträume beendet.
Der Audit-Log dokumentiert die Änderung zusätzlich technisch.

### Erkenntnis für LeadOS

Sobald LeadOS Verantwortung produktiv speichert, sollte früh geklärt werden:

- ab wann gilt eine Verantwortung,
- wann endet sie,
- wer hat sie geändert,
- wie bleiben frühere Zustände nachvollziehbar?

---

## 10. RBAC und RLS gehören zur Fachfunktion

Eine Delegationsfunktion ist nicht allein ein UI-Feature. In Sysing wurde
geprüft, dass:

- Teamleitung und Projektleitung delegieren können,
- Systemingenieure keine fremde Verantwortung zuweisen können,
- Viewer nur lesen,
- Benutzerverwaltung davon getrennt bleibt,
- Datenbankzugriffe dieselben Grenzen serverseitig erzwingen.

### Erkenntnis für LeadOS

Wenn LeadOS über den Prototyp hinausgeht, müssen Rollen und Scopes früh Teil des
Fachmodells werden. „Der Button ist nicht sichtbar“ ist keine ausreichende
Berechtigungskontrolle.

---

## 11. App-Erklärung, kontextsensitive Hilfe und Handbuch müssen dieselbe Sprache sprechen

Während der Sysing-Abnahme wurde sichtbar, dass fachlich korrekte Funktionen
nicht genügen, wenn die Erklärung einen anderen Begriff von Verantwortung oder
Konsequenz vermittelt.

Deshalb gilt jetzt in Sysing:

- dieselbe AVKK-Leitfrage in der App,
- dieselbe Bedeutung in der kontextsensitiven Hilfe,
- ausführlichere Erklärung im Benutzerhandbuch,
- identische fachliche Grundlage in `docs/AVKK.md`.

### Erkenntnis für LeadOS

Die fachliche Sprache ist Teil des Produkts. Besonders bei einer
Führungsmethodik darf die UI nicht eine andere Bedeutung transportieren als
Coaching, Handbuch oder Projektverfassung.

---

## 12. Keine automatisierte Mitarbeiterbewertung aus AVKK/ZAVKK ableiten

Die technische Umsetzung macht Aggregationen und Kennzahlen leicht. Gerade
deshalb braucht es eine klare Grenze.

Nicht aus AVKK/ZAVKK ableiten:

- Mitarbeiter-Rankings,
- Verantwortungsgefühl-Scores,
- automatische Leistungsnoten,
- Personen-Risikowerte aus Kompetenzlücken.

Sinnvoll sind dagegen:

- Aufgabenrisiken,
- fehlende Voraussetzungen,
- unklare oder fehlende Verantwortungen,
- Folgen der Nichterfüllung,
- Unterstützungsbedarf,
- offene Führungsentscheidungen.

Der verantwortliche Mensch entscheidet.

---

## 13. UX-Erkenntnisse aus der Abnahme

Mehrere reale Bedienbefunde entstanden erst beim Durchspielen mit Rollen:

- lange Aufgabentitel dürfen keine Nachbarspalten überlagern,
- ein sichtbarer „Öffnen“-Button muss eindeutig funktionieren,
- Titel/Zeilen sollten einen konsistenten Detail-Einstieg bieten,
- nach erfolgreicher Neuanlage muss ein Formular sichtbar zurückgesetzt werden,
- bereits bestehende Zuordnungen müssen klar vom Formular für eine neue
  Zuordnung getrennt sein,
- Warnungen gegen Duplikate müssen **vor** dem Speichern sichtbar werden.

### Erkenntnis für LeadOS

Führungssoftware muss in der Bedienung besonders eindeutig sein. Nutzer dürfen
nie rätseln müssen, ob sie einen bestehenden Zustand bearbeiten oder einen
neuen erzeugen.

---

## 14. Empfohlener Transfer in die nächste LeadOS-Iteration

Noch **keine** technische 1:1-Übernahme aus Sysing. Stattdessen vor der nächsten
produktiven LeadOS-Stufe diese Fragen als Design-/Discovery-Check verwenden:

1. Wie wird die Verantwortungsübernahme gemeinsam geklärt und anschließend
   sichtbar dokumentiert?
2. Welche Kompetenzen und Ressourcen werden für eine Aufgabe benötigt?
3. Wie werden Konsequenzen zuerst aus Sicht von Mitwirkenden, Kunde und eigener
   Verantwortung besprochen?
4. Welche Rollen dürfen Aufgaben bzw. Verantwortung übergeben oder ändern?
5. Welche Minimaldaten einer Person braucht die Oberfläche wirklich?
6. Wie werden Änderungen historisiert und auditiert?
7. Wie verhindert das System identische Doppelzuordnungen?
8. Wie bleiben App, Coaching-Sprache, Hilfe und Handbuch fachlich synchron?
9. Welche Kennzahlen sind aufgabenbezogen sinnvoll — und welche
   personenbezogenen Auswertungen bleiben bewusst verboten?

---

## 15. Schlussfolgerung

LeadOS und Sysing verfolgen unterschiedliche Produktziele, können sich beim
Thema Verantwortung aber sinnvoll ergänzen:

- **LeadOS** liefert die tiefere Führungs- und Übergabelogik von **ZAVKK**.
- **Sysing** liefert praktische Erfahrung, wie **AVKK** in einer
  rollenbasierten, auditierbaren Unternehmensanwendung technisch belastbar
  umgesetzt und abgenommen werden kann.

Der wichtigste gemeinsame Grundsatz lautet:

> Software kann Klarheit, Verantwortung, Voraussetzungen und Konsequenzen
> sichtbar machen. Sie soll den Führungsdialog unterstützen — nicht den
> verantwortlichen Menschen durch einen Score ersetzen.
