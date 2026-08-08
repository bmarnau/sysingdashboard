# AVKK — Führungs- und Steuerungsmodell des Sysing Dashboards

- **Status**: fachlich definiert (Sprint 07A, v1.51.0)
- **Umsetzung**: Datenbank und Services ab Sprint 07B, UI ab Sprint 08, Managementsicht ab Sprint 09
- **Verbindliche Architekturentscheidung**: [ADR-0024](./ADR/0024-avkk-und-reference-data.md)

AVKK steht verbindlich für:

| Buchstabe | Bedeutung        | Leitfrage                                                       |
| --------- | ---------------- | --------------------------------------------------------------- |
| **A**     | **Aufgabe**      | Was ist konkret zu erledigen bzw. zu erreichen?                 |
| **V**     | **Verantwortung**| Wer ist wofür verantwortlich?                                   |
| **K**     | **Kompetenz**    | Sind die Voraussetzungen zur erfolgreichen Umsetzung vorhanden? |
| **K**     | **Konsequenz**   | Welche Auswirkungen entstehen bei Nichterfüllung?               |

AVKK ist **nicht nur ein Datenmodell**, sondern eine Führungsmethodik. Das
Datenmodell (Abschnitt 8) ist lediglich die technische Abbildung dieser
Methodik.

---

## 1. Warum AVKK?

### 1.1 Warum klassische Aufgabenlisten nicht ausreichen

Eine klassische Aufgabenliste beantwortet genau eine Frage: *Was ist offen?*
Sie beantwortet nicht, ob die Aufgabe überhaupt umsetzbar ist, wer für welchen
Teilaspekt einsteht und was passiert, wenn sie liegen bleibt. In der Praxis
entstehen daraus drei wiederkehrende Fehlerbilder:

1. **Scheinzuordnung** — eine Aufgabe hat einen Namen daneben stehen, aber
   niemand weiß, ob damit Ergebnis, Termin, Qualität oder nur Koordination
   gemeint ist.
2. **Stille Blockade** — die Aufgabe ist zugewiesen, aber Zeit, Material,
   Berechtigung oder Zulieferung fehlen. Der Status bleibt „in Arbeit", bis der
   Termin gerissen ist.
3. **Fehlpriorisierung** — alle offenen Aufgaben sehen gleich wichtig aus, weil
   die Auswirkung des Nichterfüllens nirgends steht.

### 1.2 Warum Verantwortung, Kompetenz und Konsequenz dazugehören

- **Verantwortung** macht die Zuordnung eindeutig und differenziert: nicht
  „Person X macht das", sondern „Person X verantwortet das Ergebnis, Person Y
  die Freigabe".
- **Kompetenz** macht Umsetzbarkeit prüfbar. Erst dadurch wird der wichtigste
  Frühindikator sichtbar: *Aufgabe ist verantwortlich zugeordnet, aber wegen
  fehlender Voraussetzungen gefährdet.*
- **Konsequenz** macht Priorisierung begründbar, weil die Auswirkung auf Kunde,
  Projekt, Vertrag, SLA, Compliance oder Informationssicherheit dokumentiert
  ist.

### 1.3 Nutzen je Zielgruppe

| Zielgruppe             | Nutzen                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Mitarbeitende          | Können Unterstützungsbedarf sachlich melden, ohne sich rechtfertigen zu müssen. Fehlende Voraussetzungen sind ein Attribut der Aufgabe, keine Bewertung der Person. |
| Projektverantwortliche | Sehen Kompetenzlücken und Verantwortungslücken, bevor Termine reißen; können Zuständigkeiten belastbar nachweisen.                       |
| Führungskräfte         | Erhalten eine begründete Priorisierung und eine Risikosicht, die auf dokumentierten Auswirkungen beruht statt auf Bauchgefühl.           |

### 1.4 Führungsgrundsatz und Abgrenzung

AVKK ist **kein Instrument zur personenbezogenen Leistungsüberwachung**. Es wird
weder als solches beschrieben noch als solches konzipiert. Verboten sind
insbesondere:

- automatisierte Leistungsbewertung oder Rangfolgen von Personen,
- Ableitung von Bewertungen einzelner Mitarbeitender aus Kompetenzlücken,
- Erfassung von Gesundheitsdaten oder Gesundheitsdiagnosen.

Der Schwerpunkt liegt auf Transparenz, Unterstützungsbedarf, Priorisierung,
Risikoerkennung, Verantwortlichkeit und Entscheidungsunterstützung. Eine
Kompetenzlücke ist eine Aussage über die **Aufgabe** und ihre Rahmenbedingungen,
nicht über die Person.

---

## 2. A — Aufgabe

Die Aufgabe ist der Gegenstand, auf den AVKK angewendet wird.

### 2.1 Aufgabentypen

| Typ             | Schlüssel     | Bestehende Entsprechung im Dashboard                 |
| --------------- | ------------- | ---------------------------------------------------- |
| Tätigkeit       | `activity`    | `Activity` (`src/lib/dashboard-data.ts`)             |
| Arbeitspaket    | `workpackage` | `WorkPackage`                                        |
| Projekt         | `project`     | `Project`                                            |
| Maßnahme        | `measure`     | **neu** — bisher keine Entsprechung                  |

Die bestehende Struktur wird **erweitert, nicht ersetzt**. Es entsteht keine
zweite Facharchitektur: AVKK legt sich als eigene Ebene über die vorhandenen
Objekte und referenziert sie über Typ + Id (`subjectType` + `subjectId`).

Die Prüfung des Bestands hat ergeben, dass es außer den drei genannten
Objekten heute keine weiteren steuerbaren Fachobjekte gibt. `Engineer` ist
Stammdatum und keine Aufgabe. Risiken (`risks` im Projektmanifest) und offene
Punkte des Prüfberichts sind heute Dokumentationsartefakte; sobald sie
operativ geführt werden, sind sie als Aufgabentyp `measure` abzubilden — genau
dafür ist der neue Typ vorgesehen.

### 2.2 Beziehung zur bestehenden Hierarchie

```text
Projekt
  └── Arbeitspaket
        └── Tätigkeit
Maßnahme (kann eigenständig oder an Projekt/Arbeitspaket gehängt sein)

jedes dieser Objekte kann genau ein AVKK-Subject besitzen
```

AVKK ist optional: ein Objekt ohne AVKK-Subject bleibt uneingeschränkt nutzbar.
Bestehende Ansichten, Import/Export und Backup funktionieren unverändert.

---

## 3. V — Verantwortung

Verantwortung beschreibt **wer** und zusätzlich **wofür**.

### 3.1 Verantwortungsarten (Reference-Data-Katalog `avkk.responsibility_type`)

| Schlüssel        | Anzeigename    |
| ---------------- | -------------- |
| `result`         | Ergebnis       |
| `deadline`       | Termin         |
| `quality`        | Qualität       |
| `communication`  | Kommunikation  |
| `documentation`  | Dokumentation  |
| `budget`         | Budget         |
| `approval`       | Freigabe       |
| `coordination`   | Koordination   |

### 3.2 Personenbezogene Rolle (Katalog `avkk.responsibility_role`)

| Schlüssel   | Anzeigename    |
| ----------- | -------------- |
| `owner`     | Verantwortlicher |
| `deputy`    | Stellvertreter |

### 3.3 Regeln

- Eine Aufgabe kann **mehrere** Verantwortungszuordnungen besitzen.
- Eine Zuordnung kann **mehrere Verantwortungsarten** umfassen (Mehrfachauswahl).
- Pro Verantwortungsart soll genau ein `owner` existieren; mehrere `deputy`
  sind zulässig. Verletzungen sind ein Report-Befund („Verantwortungslücke" /
  „Doppelverantwortung"), keine harte Datenbankrestriktion — sonst lassen sich
  reale Übergangszustände nicht abbilden.
- Die Liste der Verantwortungsarten wird **nicht im React-Code hardcodiert**,
  sondern aus Reference Data geladen (siehe [REFERENCE-DATA.md](./REFERENCE-DATA.md)).

---

## 4. K — Kompetenz

Kompetenz beantwortet: *Sind die Voraussetzungen vorhanden, um die Aufgabe
erfolgreich umzusetzen?* Kompetenz ist ausdrücklich **nicht** auf persönliches
Fachwissen reduziert.

### 4.1 Kompetenzdimensionen (Katalog `avkk.competence_dimension`)

| Schlüssel       | Anzeigename   | Beispielhafte Prüffrage                                  |
| --------------- | ------------- | -------------------------------------------------------- |
| `knowledge`     | Fachwissen    | Ist das nötige Fachwissen verfügbar?                      |
| `experience`    | Erfahrung     | Gibt es Erfahrung mit vergleichbaren Aufgaben?            |
| `time`          | Zeit          | Ist die notwendige Zeit eingeplant und frei?              |
| `material`      | Material      | Sind Bauteile, Lizenzen oder Verbrauchsmaterial da?       |
| `tools`         | Werkzeuge     | Sind Werkzeuge, Software und Testumgebungen verfügbar?    |
| `budget`        | Budget        | Ist das Budget freigegeben?                               |
| `authorization` | Berechtigung  | Bestehen die technischen und organisatorischen Rechte?    |
| `support`       | Unterstützung | Sind Zulieferungen, Ansprechpartner, Freigeber verfügbar? |

### 4.2 Bewertung (Katalog `avkk.competence_rating`)

| Schlüssel   | Anzeigename            | Gewicht (für Auswertung) |
| ----------- | ---------------------- | ------------------------ |
| `available` | vorhanden              | 2                        |
| `partial`   | teilweise vorhanden    | 1                        |
| `missing`   | nicht vorhanden        | 0                        |

Das Gewicht ist ein Attribut des Referenzwerts, damit Auswertungen nicht erneut
im Code kodiert werden müssen.

### 4.3 Abgeleitete Aussage „gefährdet trotz Zuordnung"

Eine Aufgabe gilt fachlich als **gefährdet**, wenn sie eine gültige
Verantwortungszuordnung besitzt **und** mindestens eine Kompetenzdimension mit
`missing` bewertet ist (bzw. mehrere mit `partial`). Die exakte Schwelle ist
konfigurierbar und wird in Sprint 07B als Service-Regel, nicht als
UI-Konstante, umgesetzt.

Jede Kompetenzbewertung kann einen Freitext `note` und ein Feld
`supportNeeded` (bool) tragen — damit ist Unterstützungsbedarf explizit
meldbar, ohne dass daraus eine Personenbewertung wird.

---

## 5. K — Konsequenz

Konsequenz beantwortet: *Welche Auswirkungen entstehen, wenn die Aufgabe nicht,
nicht vollständig oder verspätet umgesetzt wird?*

### 5.1 Betroffene Bereiche (Katalog `avkk.consequence_area`)

`own_work` (eigene Arbeit), `team` (Kollegen/Team), `project` (Projekt),
`customer` (Kunde), `management` (Management), `company` (Unternehmen),
`privacy` (Datenschutz), `infosec` (Informationssicherheit),
`compliance` (Compliance), `contract` (Vertrag), `sla` (SLA),
`reputation` (Image), `financial` (wirtschaftliche Auswirkungen).

### 5.2 Schweregrade (Katalog `avkk.consequence_severity`)

| Schlüssel  | Anzeigename | Rang |
| ---------- | ----------- | ---- |
| `low`      | gering      | 1    |
| `medium`   | mittel      | 2    |
| `high`     | hoch        | 3    |
| `critical` | kritisch    | 4    |

### 5.3 Terminwirkung (Katalog `avkk.schedule_impact`)

| Schlüssel        | Anzeigename                        | Rang |
| ---------------- | ---------------------------------- | ---- |
| `none`           | keine                              | 0    |
| `minor`          | gering                             | 1    |
| `delay`          | Verzögerung                        | 2    |
| `major_delay`    | erhebliche Verzögerung / Eskalation | 3    |
| `project_stop`   | Projektstopp                       | 4    |

### 5.4 Regeln

- Eine Aufgabe kann mehrere Konsequenzeinträge besitzen (je betroffenem Bereich
  einer).
- Schweregrad und Terminwirkung werden **je Bereich** bewertet; die
  Gesamtkritikalität einer Aufgabe ist das Maximum, berechnet über den `rank`
  der Referenzwerte.
- Bewusst **keine Übermodellierung**: keine Eintrittswahrscheinlichkeit, kein
  Schadensbetrag, keine Risikomatrix in Sprint 07A/07B. Diese Erweiterung ist
  möglich, weil Kataloge und Zusatzattribute versioniert erweiterbar sind.

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

## 7. Managementerklärung „AVKK verstehen" (verbindlich für Sprint 09)

Die Managementübersicht muss das Modell erklären. Ein Managementnutzer soll
Kennzahlen nicht interpretieren müssen, ohne die Methodik zu kennen. Der Bereich
**„AVKK verstehen"** ist damit ein Abnahmekriterium von Sprint 09 und muss
mindestens enthalten:

- **A – Aufgabe**: Was soll erreicht werden?
- **V – Verantwortung**: Wer ist wofür verantwortlich?
- **K – Kompetenz**: Sind die notwendigen Voraussetzungen vorhanden?
- **K – Konsequenz**: Welche Auswirkungen entstehen bei Nichterfüllung?

Zusätzlich zu erklären: Zweck von AVKK, Nutzen für Führung, Verhältnis zu
Kontextindikatoren und die Abgrenzung zur Mitarbeiterüberwachung. Die Erklärung
muss kompakt und dauerhaft erreichbar sein (nicht nur einmalig beim ersten
Aufruf). In Sprint 07A wird dazu **keine UI** implementiert.

---

## 8. Datenmodell-Entwurf (Ziel für Sprint 07B)

Entwurf — **keine Migration in Sprint 07A**. Namen sind Vorschläge, Details
werden in 07B final festgelegt.

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
```

| Entität               | Zweck                                    | Wesentliche Felder                                                                                                       |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `avkk_subject`        | AVKK-Kopf zu genau einer Aufgabe         | `id` (PK, uuid), `subject_type`, `subject_id`, `title_snapshot`, `state`, `created_by`, `created_at`, `updated_at`         |
| `avkk_responsibility` | Verantwortungszuordnung                  | `id` (PK), `subject_id` (FK), `person_id` (FK profiles), `role_value_id` (FK reference_value), `type_value_ids` (Array/Join), `valid_from`, `valid_to` |
| `avkk_competence`     | Bewertung je Dimension                   | `id` (PK), `subject_id` (FK), `dimension_value_id` (FK), `rating_value_id` (FK), `support_needed` (bool), `note`, `assessed_by`, `assessed_at` |
| `avkk_consequence`    | Auswirkung je Bereich                    | `id` (PK), `subject_id` (FK), `area_value_id` (FK), `severity_value_id` (FK), `schedule_impact_value_id` (FK), `note`      |
| `reference_catalog`   | Katalogdefinition                        | siehe [REFERENCE-DATA.md](./REFERENCE-DATA.md)                                                                             |
| `reference_value`     | Katalogwert                              | siehe [REFERENCE-DATA.md](./REFERENCE-DATA.md)                                                                             |

### 8.2 Kardinalitäten

| Beziehung                                   | Kardinalität |
| ------------------------------------------- | ------------ |
| Aufgabe → `avkk_subject`                    | 1 : 0..1     |
| `avkk_subject` → `avkk_responsibility`      | 1 : n        |
| `avkk_subject` → `avkk_competence`          | 1 : n (max. eine aktive Bewertung je Dimension) |
| `avkk_subject` → `avkk_consequence`         | 1 : n (max. ein aktiver Eintrag je Bereich)     |
| `avkk_responsibility` → `profiles`          | n : 1        |
| jede AVKK-Zeile → `reference_value`         | n : 1 je Katalogbezug |

### 8.3 Schlüssel und Integrität

- **PK**: durchgängig `uuid` mit `gen_random_uuid()`.
- **FK**: `subject_id` mit `ON DELETE CASCADE`; Referenzen auf
  `reference_value` mit `ON DELETE RESTRICT` — Katalogwerte werden deaktiviert,
  nie gelöscht.
- **Polymorphie**: `subject_type` + `subject_id` ohne Datenbank-FK, da die
  Aufgabenobjekte in Phase 2 noch teilweise clientseitig gehalten werden.
  Absicherung über `CHECK` auf erlaubte Typen sowie Service-Validierung.
  Sobald Projekte/Arbeitspakete/Tätigkeiten selbst in Supabase liegen, wird die
  Polymorphie durch drei Teiltabellen mit echten FKs ersetzt (dokumentierte
  Migrationsoption).
- **Eindeutigkeit**: `UNIQUE (subject_type, subject_id)` auf `avkk_subject`.

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

| Objekt              | Beziehung zu AVKK                                                                 |
| ------------------- | ---------------------------------------------------------------------------------- |
| Benutzer (`profiles`) | Ziel der Verantwortungszuordnung                                                   |
| Rollen (`user_roles`) | Steuern Sichtbarkeit und Änderungsrechte (Abschnitt 9)                            |
| Dokumente           | später über Reference-Data-Katalog `document_type` und eine Verknüpfungstabelle    |
| Risiken             | Projektmanifest-Risiken bleiben Governance-Artefakt; operative Risiken werden als Aufgabentyp `measure` geführt |
| Maßnahmen           | neuer Aufgabentyp `measure`                                                        |
| Audit/Historie      | bestehendes `audit_log` plus fachliche Gültigkeitsfelder                            |

---

## 9. RBAC-/RLS-Zielkonzept (Entwurf für Sprint 07B)

### 9.1 Vorgesehene Permissions

Diese Strings sind **entworfen, aber noch nicht** in
`src/lib/rbac/permissions.ts` eingetragen — das erfolgt gemeinsam mit der
Migration in Sprint 07B, damit `check-rbac.mjs` und die Security-Suite in 07A
unverändert grün bleiben.

| v1-String                   | v2-Form                       | Bedeutung                              |
| --------------------------- | ----------------------------- | -------------------------------------- |
| `avkk.view`                 | `avkk:view`                   | AVKK-Daten lesen                       |
| `avkk.edit`                 | `avkk:edit`                   | AVKK-Daten anlegen/ändern              |
| `avkk.responsibility.assign`| `avkk.responsibility:assign`  | Verantwortung zuweisen                 |
| `avkk.management.view`      | `avkk:manage-view`            | Aggregierte Führungssicht              |
| `referencedata.view`        | `referenceData:view`          | Kataloge lesen                         |
| `referencedata.manage`      | `referenceData:manage`        | Kataloge pflegen                       |

### 9.2 Rollenmatrix (Ziel)

| Rolle                  | avkk.view | avkk.edit | responsibility.assign | management.view | referencedata.view | referencedata.manage |
| ---------------------- | :-------: | :-------: | :-------------------: | :-------------: | :----------------: | :------------------: |
| systemadministrator    | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| administrator          | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| teamlead               | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| projectmanager         | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| engineer               | ✓ | ✓ (eigene Zuordnung) | — | — | ✓ | — |
| customer               | ✓ (nur eigene Projekte, lesend) | — | — | — | ✓ | — |
| viewer                 | ✓ (lesend) | — | — | — | ✓ | — |

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

## 10. Reporting (Vorbereitung, keine Implementierung)

Der geplante konfigurierbare Report-Service muss AVKK strukturiert auswerten
können. Vorgesehene Auswertungen:

| Report               | Basis                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Verantwortungsmatrix | Aufgabe × Verantwortungsart × Person                               |
| Kompetenzübersicht   | Aufgabe × Dimension × Bewertung                                    |
| Kompetenzlücken      | Bewertungen `missing`/`partial` mit `support_needed`               |
| Konsequenzanalyse    | Bereich × Schweregrad × Terminwirkung                              |
| Kritische Aufgaben   | max. Schweregradrang ≥ hoch **und** Kompetenzlücke                 |
| Projektstatus        | Aggregation über Projekt/Arbeitspaket                              |
| Managementübersicht  | Aggregation über alle Aufgaben, inkl. „AVKK verstehen"-Erklärung   |

Kontextindikatoren müssen später **gemeinsam mit** AVKK auswertbar sein, bleiben
aber logisch und berechtigungstechnisch getrennt (eigene Tabellen, eigene
Policies, Aggregation statt Einzelwert in Führungssichten).

---

## 11. Abgrenzung Sprint 07A

Nicht Bestandteil dieses Sprints: produktive AVKK-Tabellen,
Supabase-Migrationen, AVKK-UI, Management-Cockpit, Kontextindikator-Erfassung,
Report-Service, Corporate-Template-Provider, Outlook/SharePoint/Graph und
KI-Agenten.
