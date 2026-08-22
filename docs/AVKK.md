# AVKK — Führungs- und Steuerungsmodell des Sysing Dashboards

- **Status**: fachlich definiert (Sprint 07A, v1.51.0), fachlich präzisiert am 22.08.2026
- **Umsetzung**: Datenbank und Services ab Sprint 07B, UI ab Sprint 08, Managementsicht ab Sprint 09
- **Verbindliche Architekturentscheidung**: [ADR-0024](./ADR/0024-avkk-und-reference-data.md)

AVKK steht verbindlich für:

| Buchstabe | Bedeutung         | Leitfrage                                                                                                                       |
| --------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **A**     | **Aufgabe**       | Was genau ist zu tun, bis wann, und woran ist die Erfüllung erkennbar?                                                         |
| **V**     | **Verantwortung** | Fühle ich mich für diese Aufgabe und ihr Ergebnis verantwortlich — und ist klar, wofür ich Verantwortung übernehme?            |
| **K**     | **Kompetenz**     | Sind alle Kompetenzen und Ressourcen vorhanden, um die Aufgabe mit der übernommenen Verantwortung erfolgreich umzusetzen?      |
| **K**     | **Konsequenz**    | Welche negativen Folgen entstehen bei Nichterfüllung — für andere Mitwirkende, für den Kunden und für mich selbst?             |

AVKK ist **nicht nur ein Datenmodell**, sondern eine Führungsmethodik. Das
Datenmodell (Abschnitt 8) ist lediglich die technische Abbildung dieser
Methodik.

Sysing verwendet bewusst **AVKK**. Eine eigenständige Ziel-Dimension gehört
nicht zum Akronym. Der Ziel- und Ergebniskontext ergibt sich im MVP aus Projekt
und Arbeitspaket sowie aus der konkret beschriebenen Aufgabe.

---

## 1. Warum AVKK?

### 1.1 Warum klassische Aufgabenlisten nicht ausreichen

Eine klassische Aufgabenliste beantwortet genau eine Frage: _Was ist offen?_
Sie beantwortet nicht, ob die Aufgabe verstanden und überhaupt umsetzbar ist,
ob Verantwortung tatsächlich übernommen wurde und was passiert, wenn sie
liegen bleibt. In der Praxis entstehen daraus drei wiederkehrende Fehlerbilder:

1. **Scheinzuordnung** — eine Aufgabe hat einen Namen daneben stehen, aber die
   persönliche Verantwortungsübernahme und der konkrete Verantwortungsumfang
   sind nicht geklärt.
2. **Stille Blockade** — die Aufgabe ist zugewiesen, aber Fachwissen, Erfahrung,
   Zeit, Material, Berechtigung, Unterstützung oder andere Ressourcen fehlen.
   Der Status bleibt „in Arbeit", bis der Termin gerissen ist.
3. **Fehlpriorisierung** — alle offenen Aufgaben sehen gleich wichtig aus, weil
   die negativen Folgen des Nichterfüllens für Mitwirkende, Kunde und die eigene
   Arbeit nicht sichtbar sind.

### 1.2 Warum Verantwortung, Kompetenz und Konsequenz dazugehören

- **Verantwortung** beginnt mit der persönlichen Übernahme: Die ausführende
  Person soll sagen können: _„Ich fühle mich für diese Aufgabe und ihr Ergebnis
  verantwortlich."_ Die formale Zuordnung im Dashboard macht anschließend
  sichtbar, **wer** Verantwortung übernommen hat und **wofür** — zum Beispiel
  Ergebnis, Termin, Qualität, Budget, Freigabe oder Koordination.
- **Kompetenz** macht Umsetzbarkeit prüfbar und umfasst ausdrücklich
  **Kompetenzen und Ressourcen**. Erst dadurch wird der wichtigste Frühindikator
  sichtbar: _Aufgabe ist verantwortlich übernommen und zugeordnet, aber wegen
  fehlender Voraussetzungen gefährdet._
- **Konsequenz** macht Priorisierung begründbar. Zuerst wird gefragt, welche
  negativen Folgen die Nichterfüllung für **andere Mitwirkende**, **den Kunden**
  und **mich selbst** hat. Fachliche Kategorien wie Projekt, Vertrag, SLA,
  Compliance oder Informationssicherheit konkretisieren diese drei
  Perspektiven anschließend.

### 1.3 Nutzen je Zielgruppe

| Zielgruppe             | Nutzen                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mitarbeitende          | Können Klarheit und Unterstützungsbedarf sachlich ansprechen. Fehlende Voraussetzungen sind ein Attribut der Aufgabe, keine Bewertung der Person.                  |
| Projektverantwortliche | Sehen Verantwortungs-, Kompetenz- und Ressourcenlücken, bevor Termine reißen; können Zuständigkeiten belastbar nachweisen.                                        |
| Führungskräfte         | Erhalten eine begründete Priorisierung und eine Risikosicht, die auf dokumentierten Auswirkungen beruht statt auf Bauchgefühl.                                    |

### 1.4 Führungsgrundsatz und Abgrenzung

AVKK ist **kein Instrument zur personenbezogenen Leistungsüberwachung**. Es wird
weder als solches beschrieben noch als solches konzipiert. Verboten sind
insbesondere:

- automatisierte Leistungsbewertung oder Rangfolgen von Personen,
- Ableitung von Bewertungen einzelner Mitarbeitender aus Kompetenzlücken,
- Messung oder Scoring eines „Verantwortungsgefühls",
- Erfassung von Gesundheitsdaten oder Gesundheitsdiagnosen.

„Verantwortungsgefühl“ ist eine Führungs- und Klärungsfrage. Das Dashboard
speichert die formale Verantwortungsübernahme und ihren Umfang, aber keinen
psychologischen Messwert. Der Schwerpunkt liegt auf Transparenz,
Unterstützungsbedarf, Priorisierung, Risikoerkennung, Verantwortlichkeit und
Entscheidungsunterstützung. Eine Kompetenzlücke ist eine Aussage über die
**Aufgabe** und ihre Rahmenbedingungen, nicht über die Person.

---

## 2. A — Aufgabe

Die Aufgabe ist der Gegenstand, auf den AVKK angewendet wird. Im MVP sind
**Projekte und Arbeitspakete** die delegierbaren bzw. steuerbaren AVKK-Aufgaben.

### 2.1 Fachlicher MVP-Scope und technische Subject-Typen

| Typ          | Schlüssel     | Rolle im MVP                                                                                              |
| ------------ | ------------- | ---------------------------------------------------------------------------------------------------------- |
| Projekt      | `project`     | **delegierbare AVKK-Aufgabe**                                                                              |
| Arbeitspaket | `workpackage` | **delegierbare AVKK-Aufgabe**                                                                              |
| Tätigkeit    | `activity`    | operativer Arbeits-/Leistungsnachweis; **keine delegierbare AVKK-Aufgabe**; technischer Typ bleibt kompatibel |
| Maßnahme     | `measure`     | reservierter Erweiterungstyp für spätere operative Maßnahmen; **nicht Teil des MVP-Aufgabenscopes**        |

Die bestehende Struktur wird **erweitert, nicht ersetzt**. Es entsteht keine
zweite Facharchitektur: AVKK legt sich als eigene Ebene über die steuerbaren
Objekte und referenziert sie technisch über Typ + Id (`subjectType` +
`subjectId`).

Tätigkeiten bleiben für Kundenansicht, Leistungsnachweis, Abrechnung und
operative Projektsteuerung wichtig. Dass eine Tätigkeit **keine AVKK-Aufgabe**
ist, bedeutet ausdrücklich **nicht**, dass sie nicht bearbeitbar ist. Die
bestehenden `activity.edit`-Rechte bleiben davon unabhängig.

### 2.2 Beziehung zur bestehenden Hierarchie

```text
Projekt                     ← AVKK-Aufgabe im MVP
  └── Arbeitspaket           ← AVKK-Aufgabe im MVP
        └── Tätigkeit        ← operativer Arbeits-/Leistungsnachweis

Maßnahme                     ← späterer Erweiterungstyp
```

AVKK ist optional: Ein Projekt oder Arbeitspaket ohne AVKK-Subject bleibt
uneingeschränkt nutzbar. Bestehende Ansichten, Tätigkeitsbearbeitung,
Import/Export, Abrechnung und Backup funktionieren unabhängig davon weiter.

---

## 3. V — Verantwortung

Verantwortung hat zwei zusammengehörige Ebenen:

1. **persönliche Verantwortungsübernahme** — _„Ich fühle mich für diese Aufgabe
   und ihr Ergebnis verantwortlich."_
2. **sichtbare formale Zuordnung** — wer übernimmt welche Verantwortung für
   Ergebnis, Termin, Qualität oder einen anderen Teilaspekt?

Die Software bildet die zweite Ebene ab und unterstützt damit die erste. Sie
misst oder bewertet kein Verantwortungsgefühl.

### 3.1 Verantwortungsarten (Reference-Data-Katalog `avkk.responsibility_type`)

| Schlüssel       | Anzeigename   |
| --------------- | ------------- |
| `result`        | Ergebnis      |
| `deadline`      | Termin        |
| `quality`       | Qualität      |
| `communication` | Kommunikation |
| `documentation` | Dokumentation |
| `budget`        | Budget        |
| `approval`      | Freigabe      |
| `coordination`  | Koordination  |

### 3.2 Personenbezogene Rolle (Katalog `avkk.responsibility_role`)

| Schlüssel | Anzeigename      |
| --------- | ---------------- |
| `owner`   | Verantwortlicher |
| `deputy`  | Stellvertreter   |

### 3.3 Regeln

- Eine Aufgabe kann **mehrere** Verantwortungszuordnungen besitzen.
- Eine Zuordnung kann **mehrere Verantwortungsarten** umfassen (Mehrfachauswahl).
- Eine **identische aktive Zuordnung** aus Aufgabe, Person, Rolle und denselben
  Verantwortungsarten wird nicht ein zweites Mal gespeichert.
- Pro Verantwortungsart soll genau ein `owner` existieren; mehrere `deputy`
  sind zulässig. Fachlich abweichende Doppelverantwortungen sind ein
  Report-Befund („Verantwortungslücke" / „Doppelverantwortung"), keine pauschale
  harte Datenbankrestriktion — reale Übergangszustände müssen abbildbar bleiben.
- Die Liste der Verantwortungsarten wird **nicht im React-Code hardcodiert**,
  sondern aus Reference Data geladen (siehe [REFERENCE-DATA.md](./REFERENCE-DATA.md)).

---

## 4. K — Kompetenz

Kompetenz beantwortet: _Sind alle Kompetenzen und Ressourcen vorhanden, um die
Aufgabe mit der übernommenen Verantwortung erfolgreich umzusetzen?_
Kompetenz ist ausdrücklich **nicht** auf persönliches Fachwissen reduziert.

### 4.1 Kompetenzdimensionen (Katalog `avkk.competence_dimension`)

| Schlüssel       | Anzeigename   | Beispielhafte Prüffrage                                   |
| --------------- | ------------- | --------------------------------------------------------- |
| `knowledge`     | Fachwissen    | Ist das nötige Fachwissen verfügbar?                      |
| `experience`    | Erfahrung     | Gibt es Erfahrung mit vergleichbaren Aufgaben?            |
| `time`          | Zeit          | Ist die notwendige Zeit eingeplant und frei?              |
| `material`      | Material      | Sind Bauteile, Lizenzen oder Verbrauchsmaterial da?       |
| `tools`         | Werkzeuge     | Sind Werkzeuge, Software und Testumgebungen verfügbar?    |
| `budget`        | Budget        | Ist das Budget freigegeben?                               |
| `authorization` | Berechtigung  | Bestehen die technischen und organisatorischen Rechte?    |
| `support`       | Unterstützung | Sind Zulieferungen, Ansprechpartner, Freigeber verfügbar? |

### 4.2 Bewertung (Katalog `avkk.competence_rating`)

| Schlüssel   | Anzeigename         | Gewicht (für Auswertung) |
| ----------- | ------------------- | ------------------------ |
| `available` | vorhanden           | 2                        |
| `partial`   | teilweise vorhanden | 1                        |
| `missing`   | nicht vorhanden     | 0                        |

Das Gewicht ist ein Attribut des Referenzwerts, damit Auswertungen nicht erneut
im Code kodiert werden müssen.

### 4.3 Abgeleitete Aussage „gefährdet trotz Zuordnung"

Eine Aufgabe gilt fachlich als **gefährdet**, wenn sie eine gültige
Verantwortungszuordnung besitzt **und** mindestens eine Kompetenzdimension mit
`missing` bewertet ist (bzw. mehrere mit `partial`). Die exakte Schwelle ist
konfigurierbar und wird als Service-Regel, nicht als UI-Konstante, umgesetzt.

Jede Kompetenzbewertung kann einen Freitext `note` und ein Feld
`supportNeeded` (bool) tragen — damit ist Unterstützungsbedarf explizit
meldbar, ohne dass daraus eine Personenbewertung wird.

---

## 5. K — Konsequenz

Konsequenz beantwortet: _Welche negativen Folgen entstehen, wenn die Aufgabe
nicht, nicht vollständig oder verspätet umgesetzt wird — für andere
Mitwirkende, für den Kunden und für mich selbst?_

Diese **drei Perspektiven** stehen fachlich vor der Detailkategorisierung:

1. **Andere Mitwirkende** — Abhängigkeiten, Blockaden, Mehrarbeit,
   Informations- oder Terminfolgen für Kolleginnen, Kollegen und weitere
   Beteiligte.
2. **Kunde** — Auswirkungen auf Leistung, Termin, Qualität, Vertrauen,
   Vertrag, SLA oder Zusammenarbeit.
3. **Ich selbst** — Folgen für die eigene Arbeit, Zusagen, Termine,
   nachgelagerte Aufgaben oder notwendige Nacharbeit.

### 5.1 Betroffene Bereiche (Katalog `avkk.consequence_area`)

Die vorhandenen Fachkategorien konkretisieren diese drei Perspektiven:

`own_work` (eigene Arbeit), `team` (Kollegen/Team), `project` (Projekt),
`customer` (Kunde), `management` (Management), `company` (Unternehmen),
`privacy` (Datenschutz), `infosec` (Informationssicherheit),
`compliance` (Compliance), `contract` (Vertrag), `sla` (SLA),
`reputation` (Image), `financial` (wirtschaftliche Auswirkungen).

Die Kategorien sind keine vierte Perspektive neben Mitwirkenden, Kunde und
mir selbst, sondern helfen, die konkreten Folgen fachlich einzuordnen.

### 5.2 Schweregrade (Katalog `avkk.consequence_severity`)

| Schlüssel  | Anzeigename | Rang |
| ---------- | ----------- | ---- |
| `low`      | gering      | 1    |
| `medium`   | mittel      | 2    |
| `high`     | hoch        | 3    |
| `critical` | kritisch    | 4    |

### 5.3 Terminwirkung (Katalog `avkk.schedule_impact`)

| Schlüssel      | Anzeigename                         | Rang |
| -------------- | ----------------------------------- | ---- |
| `none`         | keine                               | 0    |
| `minor`        | gering                              | 1    |
| `delay`        | Verzögerung                         | 2    |
| `major_delay`  | erhebliche Verzögerung / Eskalation | 3    |
| `project_stop` | Projektstopp                        | 4    |

### 5.4 Regeln

- Eine Aufgabe kann mehrere Konsequenzeinträge besitzen (je betroffenem Bereich
  einer).
- Schweregrad und Terminwirkung werden **je Bereich** bewertet; die
  Gesamtkritikalität einer Aufgabe ist das Maximum, berechnet über den `rank`
  der Referenzwerte.
- Bewusst **keine Übermodellierung**: keine Eintrittswahrscheinlichkeit, kein
  Schadensbetrag, keine Risikomatrix im MVP. Diese Erweiterung ist möglich,
  weil Kataloge und Zusatzattribute versioniert erweiterbar sind.

---

## 6. Kontextindikatoren — getrennte Ebene

Kontextindikatoren sind **nicht Bestandteil des Akronyms AVKK**. Sie bilden eine
eigene, optionale fachliche Ebene und werden erst in einem späteren Sprint
umgesetzt.

```text
Aufgabe
   ↓
AVKK
   ├── Verantwortung
   ├── Kompetenz
   └── Konsequenz
   ↓
optionale Kontextindikatoren
```

Beispiele: Stress, Arbeitsbelastung, Kundenzufriedenheit, Teamunterstützung,
Projektstimmung, Eskalationsgrad, subjektive Risikoeinschätzung, Ressourcenlage.

### 6.1 Warum getrennt?

- AVKK-Daten sind sachbezogen und im Team weitgehend transparent nutzbar.
- Kontextindikatoren sind teilweise subjektiv und teilweise personenbezogen.
  Sie brauchen ein anderes Berechtigungs-, Aufbewahrungs- und
  Aggregationsniveau.
- Die Trennung erlaubt es, AVKK produktiv zu betreiben, ohne dass die
  datenschutzrechtliche Prüfung der Kontextindikatoren zum Blocker wird.

### 6.2 Datenschutz- und Führungsgrundsatz (verbindlich)

Personenbezogene Kontextindikatoren dienen **nicht** der Überwachung und
**nicht** der automatisierten Leistungsbewertung einzelner Mitarbeitender. Ihr
Zweck ist ausschließlich:

- Unterstützungsbedarf erkennen,
- Belastungsrisiken erkennen,
- Projekt- und Kundenrisiken sichtbar machen,
- Priorisierungsentscheidungen unterstützen.

Verbindliche Architekturvorgaben für die spätere Umsetzung:

1. Besonders sensible Daten werden **nicht** ohne fachliche,
   datenschutzrechtliche und berechtigungsbezogene Prüfung aufgenommen.
2. Keine Gesundheitsdiagnosen, keine medizinischen Kategorien.
3. Personenbezogene Indikatoren werden in Führungssichten grundsätzlich
   **aggregiert** dargestellt; Einzelwerte sind nur der betroffenen Person und
   explizit berechtigten Rollen zugänglich.
4. Erfassung ist freiwillig; eine fehlende Angabe darf nie als negativer Wert
   interpretiert werden.
5. Aufbewahrungsfristen und Löschregeln werden vor der Aktivierung festgelegt.

---

## 7. Managementerklärung „AVKK verstehen" (verbindlich)

Die Managementübersicht muss das Modell erklären. Ein Managementnutzer soll
Kennzahlen nicht interpretieren müssen, ohne die Methodik zu kennen. Der Bereich
**„AVKK verstehen"** muss mindestens enthalten:

- **A – Aufgabe**: Was genau ist zu tun und ist die Aufgabe gemeinsam klar?
- **V – Verantwortung**: Fühle ich mich für Aufgabe und Ergebnis verantwortlich — und wofür genau übernehme ich Verantwortung?
- **K – Kompetenz**: Sind alle notwendigen Kompetenzen und Ressourcen vorhanden?
- **K – Konsequenz**: Welche negativen Folgen entstehen für andere Mitwirkende, den Kunden und mich selbst?

Zusätzlich zu erklären: Zweck von AVKK, Nutzen für Führung, Verhältnis zu
Kontextindikatoren und die Abgrenzung zur Mitarbeiterüberwachung. Besonders
wichtig: Verantwortungsgefühl ist eine **Führungs- und Klärungsfrage**, kein zu
messender oder zu bewertender Personenwert. Die Erklärung muss kompakt und
dauerhaft erreichbar sein.

---

## 8. Datenmodell und technische Subject-Typen

Das Datenmodell unterstützt aus Kompatibilitäts- und Erweiterungsgründen mehr
Subject-Typen als der aktuelle fachliche MVP-Aufgabenscope.

### 8.1 Entitäten

```text
reference_catalog (1) ──< reference_value (n)
                              ▲
                              │ (FK + Schlüssel-Snapshot)
avkk_subject (1) ──< avkk_responsibility (n) >── profiles
      │
      ├──< avkk_competence (n)
      └──< avkk_consequence (n)

avkk_subject.subjectType/subjectId → project | workpackage | activity | measure
                                     ^^^^^^^^^^^^^^^^^^^^^
                                     MVP-AVKK-Aufgabenscope

activity = technischer Kompatibilitätstyp / operativer Arbeitsnachweis
measure  = reservierter Erweiterungstyp
```

| Entität               | Zweck                                         | Wesentliche Felder                                                                                                                                     |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `avkk_subject`        | AVKK-Kopf zu einem technisch referenzierbaren Subject | `id` (PK, uuid), `subject_type`, `subject_id`, `title_snapshot`, `state`, `created_by`, `created_at`, `updated_at`                              |
| `avkk_responsibility` | Verantwortungszuordnung                       | `id` (PK), `subject_id` (FK), `person_id` (FK profiles), `role_value_id` (FK reference_value), `type_value_ids` (Array/Join), `valid_from`, `valid_to` |
| `avkk_competence`     | Bewertung je Dimension                        | `id` (PK), `subject_id` (FK), `dimension_value_id` (FK), `rating_value_id` (FK), `support_needed` (bool), `note`, `assessed_by`, `assessed_at`         |
| `avkk_consequence`    | Auswirkung je Bereich                         | `id` (PK), `subject_id` (FK), `area_value_id` (FK), `severity_value_id` (FK), `schedule_impact_value_id` (FK), `note`                                  |
| `reference_catalog`   | Katalogdefinition                             | siehe [REFERENCE-DATA.md](./REFERENCE-DATA.md)                                                                                                         |
| `reference_value`     | Katalogwert                                   | siehe [REFERENCE-DATA.md](./REFERENCE-DATA.md)                                                                                                         |

### 8.2 Kardinalitäten

| Beziehung                              | Kardinalität                                    |
| -------------------------------------- | ----------------------------------------------- |
| Aufgabe/Subject → `avkk_subject`       | 1 : 0..1                                        |
| `avkk_subject` → `avkk_responsibility` | 1 : n                                           |
| `avkk_subject` → `avkk_competence`     | 1 : n (max. eine aktive Bewertung je Dimension) |
| `avkk_subject` → `avkk_consequence`    | 1 : n (max. ein aktiver Eintrag je Bereich)     |
| `avkk_responsibility` → `profiles`     | n : 1                                           |
| jede AVKK-Zeile → `reference_value`    | n : 1 je Katalogbezug                           |

### 8.3 Schlüssel und Integrität

- **PK**: durchgängig `uuid` mit `gen_random_uuid()`.
- **FK**: `subject_id` mit `ON DELETE CASCADE`; Referenzen auf
  `reference_value` mit `ON DELETE RESTRICT` — Katalogwerte werden deaktiviert,
  nie gelöscht.
- **Polymorphie**: `subject_type` + `subject_id` ohne Datenbank-FK, da die
  Aufgabenobjekte teilweise clientseitig gehalten werden. Absicherung über
  `CHECK` auf erlaubte technische Typen sowie Service-Validierung. Der
  fachliche MVP-Scope wird zusätzlich in der Anwendung auf `project` und
  `workpackage` begrenzt.
- **Eindeutigkeit**: `UNIQUE (subject_type, subject_id)` auf `avkk_subject`.
- **Verantwortungsduplikate**: Exakt identische aktive Zuordnungen werden in der
  Fachlogik verhindert. Eine pauschale Datenbank-Unique-Regel wäre zu eng, weil
  unterschiedliche Verantwortungsarten und reale Übergangszustände zulässig
  bleiben müssen.

### 8.4 Historisierung und Audit

- Fachliche Historie: `valid_from` / `valid_to` bei Verantwortung; Bewertungen
  werden nicht überschrieben, sondern mit `superseded_at` fortgeschrieben,
  damit Kompetenz- und Konsequenzverläufe auswertbar bleiben.
- Referenzintegrität über die Zeit: jede AVKK-Zeile speichert zusätzlich zum FK
  den unveränderlichen `*_key_snapshot` und `*_label_snapshot` des Katalogwerts.
  Damit bleibt ein historischer Datensatz lesbar, auch wenn der Katalogwert
  später deaktiviert oder umbenannt wird.
- Technisches Audit: Trigger schreiben in das bestehende `public.audit_log`
  (`action = 'avkk.<table>.<op>'`, `target = subject_id`), analog zu
  `audit_user_roles_change()`. Keine zweite Auditinfrastruktur.

### 8.5 Beziehung zu weiteren Bestandsobjekten

| Objekt                | Beziehung zu AVKK                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Benutzer (`profiles`) | Ziel der Verantwortungszuordnung                                                                                                    |
| Rollen (`user_roles`) | Steuern Sichtbarkeit und Änderungsrechte                                                                                            |
| Tätigkeiten           | operative Arbeits-/Leistungsnachweise; wichtig für Kunde, Projektcockpit und Abrechnung, aber keine delegierbaren AVKK-Aufgaben   |
| Dokumente             | später über Reference-Data-Katalog `document_type` und eine Verknüpfungstabelle                                                     |
| Risiken               | Projektmanifest-Risiken bleiben Governance-Artefakt; operative Risiken können später über `measure` angebunden werden             |
| Maßnahmen             | reservierter technischer Typ `measure`, nicht Teil des MVP                                                                          |
| Audit/Historie        | bestehendes `audit_log` plus fachliche Gültigkeitsfelder                                                                            |

---

## 9. RBAC-/RLS-Zielkonzept

### 9.1 Permissions

| v1-String                    | v2-Form                      | Bedeutung                 |
| ---------------------------- | ---------------------------- | ------------------------- |
| `avkk.view`                  | `avkk:view`                  | AVKK-Daten lesen          |
| `avkk.edit`                  | `avkk:edit`                  | AVKK-Daten anlegen/ändern |
| `avkk.responsibility.assign` | `avkk.responsibility:assign` | Verantwortung zuweisen    |
| `avkk.management.view`       | `avkk:manage-view`           | Aggregierte Führungssicht |
| `referencedata.view`         | `referenceData:view`         | Kataloge lesen            |
| `referencedata.manage`       | `referenceData:manage`       | Kataloge pflegen          |

### 9.2 Rollenmatrix

| Rolle               |            avkk.view            |      avkk.edit       | responsibility.assign | management.view | referencedata.view | referencedata.manage |
| ------------------- | :-----------------------------: | :------------------: | :-------------------: | :-------------: | :----------------: | :------------------: |
| systemadministrator |                ✓                |          ✓           |           ✓           |        ✓        |         ✓          |          ✓           |
| administrator       |                ✓                |          ✓           |           ✓           |        ✓        |         ✓          |          ✓           |
| teamlead            |                ✓                |          ✓           |           ✓           |        ✓        |         ✓          |          —           |
| projectmanager      |                ✓                |          ✓           |           ✓           |        ✓        |         ✓          |          —           |
| engineer            |                ✓                | ✓ (eigene Zuordnung) |           —           |        —        |         ✓          |          —           |
| customer            | ✓ (nur eigene Projekte, lesend) |          —           |           —           |        —        |         ✓          |          —           |
| viewer              |           ✓ (lesend)            |          —           |           —           |        —        |         ✓          |          —           |

Die Bearbeitungsrechte für Tätigkeiten (`activity.edit`) sind **nicht** Teil der
AVKK-Verantwortungszuweisung. Projektmanager und Teamleiter behalten ihre
Tätigkeitsbearbeitung; Engineers behalten sie im vorgesehenen eigenen Scope.

### 9.3 RLS-Zielregeln

- **Reference Data**: `SELECT` für `authenticated` auf **aktive** Werte;
  `INSERT/UPDATE` nur bei `has_permission(auth.uid(), 'referencedata.manage')`;
  kein `DELETE` (nur Deaktivierung). `GRANT` an `authenticated` und
  `service_role`; **kein** `anon`-Grant.
- **AVKK-Daten**: `SELECT` für `authenticated` mit `has_permission(...,
'avkk.view')`; Schreiben nur mit `avkk.edit`; Zuweisung von Verantwortung
  zusätzlich mit `avkk.responsibility.assign`. Engineers dürfen nur Zeilen
  ändern, in denen sie selbst verantwortlich sind (`person_id = auth.uid()`)
  oder die sie erstellt haben.
- **Keine pauschalen globalen Schreibrechte**, keine `USING (true)`-Policies für
  Schreiboperationen.
- Kundensicht wird erst freigeschaltet, wenn die Mandanten-/Kunden-Zuordnung aus
  ADR-0007 (Scopes) real vorhanden ist. Bis dahin ist `customer` von AVKK
  ausgeschlossen — das ist bewusst restriktiv.

---

## 10. Reporting

Der Report-Service muss AVKK strukturiert auswerten können. Vorgesehene
Auswertungen:

| Report               | Basis                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Verantwortungsmatrix | Projekt/Arbeitspaket × Verantwortungsart × Person                    |
| Kompetenzübersicht   | Projekt/Arbeitspaket × Dimension × Bewertung                         |
| Kompetenzlücken      | Bewertungen `missing`/`partial` mit `support_needed`                  |
| Konsequenzanalyse    | Perspektive/Bereich × Schweregrad × Terminwirkung                    |
| Kritische Aufgaben   | max. Schweregradrang ≥ hoch **und** Kompetenzlücke                    |
| Projektstatus        | Aggregation über Projekt/Arbeitspaket                                 |
| Managementübersicht  | Aggregation über alle AVKK-Aufgaben, inkl. „AVKK verstehen"-Erklärung |

Tätigkeitsdaten bleiben davon getrennt als operative Grundlage für
Leistungsnachweis, Kundenansicht, Projektcockpit und Abrechnung erhalten. Eine
AVKK-Scope-Korrektur darf diese Datenpfade nicht entfernen oder verfälschen.

Kontextindikatoren müssen später **gemeinsam mit** AVKK auswertbar sein, bleiben
aber logisch und berechtigungstechnisch getrennt (eigene Tabellen, eigene
Policies, Aggregation statt Einzelwert in Führungssichten).

---

## 11. Historische Abgrenzung Sprint 07A

Im ursprünglichen Sprint 07A waren produktive AVKK-Tabellen,
Supabase-Migrationen, AVKK-UI, Management-Cockpit, Kontextindikator-Erfassung,
Report-Service, Corporate-Template-Provider, Outlook/SharePoint/Graph und
KI-Agenten ausdrücklich noch nicht Bestandteil. Diese Abgrenzung ist
historisch; der aktuelle Implementierungsstand wird über Repository, CHANGELOG,
Acceptance-Dokumente und technischen Prüfbericht nachgewiesen.
