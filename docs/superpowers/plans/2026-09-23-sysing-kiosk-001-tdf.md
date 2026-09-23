# SYSING-KIOSK-001 TDF Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine eigenständige, TDF-konforme und reproduzierbar prüfbare Dokumentation der Info-Kiosk-Datenschnittstelle inklusive des bereits freigegebenen synthetischen Beispieldatensatzes erstellen, ohne Lovable und ohne eine neue produktive externe API einzuführen.

**Architecture:** Die Dokumentation trennt drei Ebenen strikt: den providerneutralen Runtime-Vertrag `KioskDataProvider -> KioskSnapshot`, den implementierten lokalen Demo-JSON-Vertrag `sysing.kiosk.demo.v1` und eine nur als Zielbild beschriebene spätere externe Provideranbindung. Die vorhandene Referenzdatei `docs/examples/kiosk-demo-dataset-v1.json` bleibt die einzige führende Demoquelle. Eine kleine Dokumentationsprüfung bindet Dokument, Codevertrag und Beispieldatensatz zusammen, damit keine stille Drift entsteht.

**Tech Stack:** Markdown/TDF, TypeScript-Verträge, Zod-Vertrag `sysing.kiosk.demo.v1`, Node.js-Dokumentationschecks, vorhandene `docx`-Bibliothek, GitHub Actions / bestehende Docs- und CI-Gates.

**Spec:** Führende fachliche Quellen sind `docs/BSF-KIOSK-01-DESIGN.md`, `docs/BSF-KIOSK-01-JSON-DEMO-IMPORT.md`, `docs/BSF-KIOSK-02-DESIGN.md`, `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md`, `src/lib/kiosk/kiosk-contract.ts`, `src/lib/kiosk/kiosk-demo-import.ts`, `src/lib/kiosk/kiosk-demo-dataset.ts` und `docs/examples/kiosk-demo-dataset-v1.json`.

## Global Constraints

- GitHub `bmarnau/sysingdashboard` ist Source of Truth.
- Umsetzung erfolgt ohne Lovable und ohne produktive Laufzeitänderung.
- Keine produktiven Schlüssel, Tokens, Passwörter, Service-Role-Keys, Hostnamen oder IP-Adressen in Dokument oder Beispieldaten.
- `docs/examples/kiosk-demo-dataset-v1.json` bleibt unverändert die führende Default-Demoquelle für KIOSK-01.
- Der implementierte Demo-Importvertrag bleibt exakt `sysing.kiosk.demo.v1`, `synthetic=true`, `datasetVersion=1.0.0`.
- Der Runtime-Vertrag bleibt `KioskDataProvider.getSnapshot(): Promise<KioskSnapshot>`.
- Die sechs Kiosk-Domänen bleiben `projects`, `workPackages`, `activities`, `availability`, `infrastructure`, `support`.
- Demo-, Hybrid- und Internal-Semantik werden dokumentiert; eine produktive externe Kiosk-API wird nicht als umgesetzt dargestellt.
- Supabase ist der aktuelle MVP-Provider für interne Daten; Fach- und Providergrenze bleiben Azure-/Entra-/Docker-portabel.
- Bestehende TDF-Grundsätze gelten: Dokumentidentität, Version, Datum, Geltungsbereich, Ist/Zielbild-Trennung, Traceability, Schema-/Source-/Security-/Resilience-/Release-Aussagen und nachvollziehbare Abnahme.
- Generierte Word/PDF-Artefakte sind Ableitungen derselben Markdown-Quelle; keine zweite redaktionelle Quelle.

## Review Focus

1. **Verwechslung von Runtime-Provider und externer API:** Dokument muss klar ausweisen, dass `KioskDataProvider` intern/providerneutral ist und keine öffentlich produktive HTTP-API darstellt; Dokumentationscheck prüft die Statuskennzeichnung.
2. **Drift zwischen Beispieldatei und Codevertrag:** Check vergleicht `schemaVersion`, `synthetic`, `datasetVersion` und exakt sechs Domain-IDs mit den versionierten Quellen.
3. **Demo-/Live-Verwechslung:** Beispieldaten und Dokument müssen synthetische Daten sowie Demo-/Hybrid-/Internal-Quellen explizit kennzeichnen.
4. **Datenschutz-/Secret-Leak:** Dokument und Beispiel dürfen keine Personen-, Mailinhalte, Gesundheitsdaten, produktiven Hostnamen/IPs oder Secrets enthalten; bestehende Parser-/Security-Grenzen werden unverändert referenziert.
5. **Unreproduzierbares TDF-Artefakt:** Word/PDF müssen aus genau einer Markdown-Quelle erzeugbar sein; Build und visuelle Prüfung werden als Abschlussnachweis dokumentiert.

---

### Task 1: TDF-Quelldokument erstellen

**Files:**
- Create: `docs/SYSING-KIOSK-001_Info-Kiosk-Datenschnittstelle_V1.0.0.md`
- Read-only reference: `src/lib/kiosk/kiosk-contract.ts`
- Read-only reference: `src/lib/kiosk/kiosk-demo-import.ts`
- Read-only reference: `docs/examples/kiosk-demo-dataset-v1.json`

**Interfaces:**
- Consumes: `KioskDataProvider.getSnapshot(): Promise<KioskSnapshot>`, `sysing.kiosk.demo.v1`.
- Produces: dokumentierte TDF-Baseline `SYSING-KIOSK-001 V1.0.0`.

- [ ] **Step 1: Dokumentmetadaten und Statusmodell schreiben**

Pflichtmetadaten:
`document_id`, `title`, `subtitle`, `document_type`, `owner`, `version=1.0.0`, `release_date=2026-09-23`, `source_review_date=2026-09-23`, `classification=intern`.

Statuskennzeichnungen:
`UMGESETZT`, `ZIELBILD`, `BEKANNTE GRENZE`.

- [ ] **Step 2: Ist-Architektur dokumentieren**

Mindestens diese Kette darstellen:

```text
KioskView
  -> KioskDataProvider
      -> DemoKioskDataProvider
      -> InternalReadKioskDataProvider
          -> bestehende serverseitige Read-Services
              -> Supabase User-JWT + RLS
```

Explizit festhalten: keine direkte Supabase-Abhängigkeit der Kiosk-UI und keine produktive externe HTTP-API in KIOSK-01/02.

- [ ] **Step 3: Datenvertrag vollständig beschreiben**

Dokumentieren:
- `KioskSnapshot`,
- `KioskDomainSnapshot`,
- `KioskMetric`,
- Status `ok|warning|critical|unknown`,
- SourceKind `demo|internal|unavailable`,
- Mode `demo|hybrid|internal`,
- Freshness über `observedAt`,
- Zeitraum `period.from/to`,
- sechs Domain-IDs.

- [ ] **Step 4: Demo-JSON-Vertrag und Beispiel erklären**

Top-Level-Beispiel aus `sysing.kiosk.demo.v1`, 256-KiB-Limit, Strict Validation, atomarer Replace, Last-good bei Fehler, keine externen URLs und keine produktive DB-Schreibwirkung.

Referenzdatei:
`docs/examples/kiosk-demo-dataset-v1.json`.

- [ ] **Step 5: Security, Datenschutz, Resilience und Erweiterbarkeit dokumentieren**

Mindestens:
- read-only Kiosk,
- RBAC/RLS bleiben Security Boundary,
- kein Service-Role-Pfad im Browser,
- keine Personen-/Gesundheits-/Mailinhaltsdaten,
- `unknown` bleibt `unknown`, kein stilles `0`,
- interne Fehler -> `unavailable/unknown`, kein stiller Demo-Fallback,
- späterer Provideradapter muss denselben `KioskSnapshot` liefern,
- Supabase/Azure/On-Prem bleiben Adapterfrage, nicht Fachvertragsänderung.

- [ ] **Step 6: Traceability und Abnahme ergänzen**

Quellenmatrix mit Dateipfaden, Tests und KIOSK-01/02-Closure-Evidenz. Keine alten Run-IDs als aktuelle Live-Aussage darstellen; historische Evidenz klar datieren.

- [ ] **Step 7: Commit**

Commit message:
`docs(kiosk): SYSING-KIOSK-001 TDF-Baseline anlegen`.

---

### Task 2: Dokument-Code-Dataset-Driftcheck erstellen

**Files:**
- Create: `scripts/docs/check-sysing-kiosk-001.mjs`
- Modify: `package.json`
- Test input: `docs/SYSING-KIOSK-001_Info-Kiosk-Datenschnittstelle_V1.0.0.md`
- Test input: `docs/examples/kiosk-demo-dataset-v1.json`
- Test input: `src/lib/kiosk/kiosk-contract.ts`
- Test input: `src/lib/kiosk/kiosk-demo-import.ts`
- Test input: `src/lib/kiosk/kiosk-demo-dataset.ts`

**Interfaces:**
- Consumes: versionierte Text-/JSON-Quellen.
- Produces: CLI `bun run docs:kiosk:check`, Exit 0 bei Konsistenz, Exit 1 bei Drift.

- [ ] **Step 1: RED-Prüfung definieren**

Der Check muss fehlschlagen, wenn eine dieser Bedingungen verletzt ist:
- nicht genau eine `SYSING-KIOSK-001_*.md`-Quelle,
- falsche `document_id`,
- Dokumentversion ungleich `1.0.0`,
- JSON `schemaVersion` ungleich Codekonstante,
- JSON `datasetVersion` ungleich Codekonstante,
- `synthetic !== true`,
- Domainliste im JSON ungleich `KIOSK_DOMAIN_IDS`,
- Dokument nennt Schema-Version, Dataset-Version, Referenzdatei oder alle sechs Domain-IDs nicht,
- Dokument behauptet eine produktive externe API sei umgesetzt.

- [ ] **Step 2: Minimalen Node-Check implementieren**

Nur Node-Core verwenden; keine neue Dependency.

- [ ] **Step 3: Package-Script ergänzen**

`"docs:kiosk:check": "node scripts/docs/check-sysing-kiosk-001.mjs"`.

Bestehendes `docs:check` wird additiv erweitert:
`node scripts/check-docs-sync.mjs && node scripts/docs/check-sysing-kiosk-001.mjs`.

- [ ] **Step 4: Check lokal/CI ausführen**

Run:
`bun run docs:kiosk:check`

Expected:
`SYSING-KIOSK-001: PASS`.

Run:
`bun run docs:check`

Expected:
bestehender Doku-Sync plus Kiosk-TDF-Check PASS.

- [ ] **Step 5: Commit**

Commit message:
`test(kiosk-docs): TDF-Vertrag gegen Code und Beispieldaten pruefen`.

---

### Task 3: Reproduzierbaren Word-Build ergänzen

**Files:**
- Create: `scripts/docs/build-sysing-kiosk-001.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: genau eine `docs/SYSING-KIOSK-001_*.md`-Quelle.
- Produces: `SYSING-KIOSK-001_Info-Kiosk-Datenschnittstelle_V1.0.0.docx` in einem per `--out` wählbaren Verzeichnis.

- [ ] **Step 1: Bestehenden SYSING-001-Builder als Layoutreferenz verwenden**

Layoutanforderungen:
- A4,
- Arial,
- TDF-Farbton wie SYSING-001,
- Kopfzeile mit Dokument-ID, Version, Klassifizierung,
- Fußzeile mit Seitenzahl,
- Tabellen ohne abgeschnittene Inhalte,
- Code-/Architekturblöcke monospace und zusammengehalten.

- [ ] **Step 2: Kiosk-Builder implementieren**

Keine Änderung der bestehenden `SYSING-001`-Erzeugung. Der neue Builder verarbeitet ausschließlich `SYSING-KIOSK-001_*.md`.

- [ ] **Step 3: Package-Script ergänzen**

`"docs:kiosk": "node scripts/docs/build-sysing-kiosk-001.mjs"`.

- [ ] **Step 4: Word erzeugen**

Run:
`bun run docs:kiosk -- --out <artifact-dir>`

Expected:
genau eine DOCX-Datei mit Version 1.0.0.

- [ ] **Step 5: Commit**

Commit message:
`build(kiosk-docs): TDF-Word-Ausgabe reproduzierbar machen`.

---

### Task 4: PDF und visuelle TDF-Abnahme

**Files:**
- Generated artifact: `SYSING-KIOSK-001_Info-Kiosk-Datenschnittstelle_V1.0.0.docx`
- Generated artifact: `SYSING-KIOSK-001_Info-Kiosk-Datenschnittstelle_V1.0.0.pdf`
- No generated binary becomes a second editorial source.

**Interfaces:**
- Consumes: DOCX aus Task 3.
- Produces: geprüfte PDF-Fassung derselben Quelle.

- [ ] **Step 1: DOCX rendern und Seiten als PNG prüfen**

Prüfen:
- keine leeren Seiten,
- keine abgeschnittenen Tabellen,
- keine überlaufenden Codeblöcke,
- Kopf-/Fußzeilen konsistent,
- Seitenzahlen sichtbar,
- Überschriftenhierarchie sauber.

- [ ] **Step 2: PDF aus derselben DOCX-Fassung erzeugen**

Keine separate PDF-Redaktion.

- [ ] **Step 3: PDF erneut rendern und visuell gegen DOCX prüfen**

Inhalt, Reihenfolge und Version müssen identisch sein.

- [ ] **Step 4: Artefakte als Build-Ergebnis bereitstellen**

Repository behält Markdown als redaktionelle Source of Truth; DOCX/PDF sind reproduzierbare Distributionsartefakte.

---

### Task 5: Projekt-Dokumentation und Abschlussgate synchronisieren

**Files:**
- Modify: `docs/DEMO-DATA.md`
- Modify: `docs/BSF-CURRENT-PRIORITIES.md` nur soweit Dokumentationsstatus betroffen
- Modify: `docs/ENTWICKLUNGSTAGEBUCH.md`
- Modify: `CHANGELOG.md` nur wenn der Projektstandard für den Dokumentationsstrang einen Versionseintrag verlangt
- PR description / evidence

**Interfaces:**
- Consumes: freigegebene TDF-Baseline und Driftcheck.
- Produces: nachvollziehbarer Projektstatus ohne Chatabhängigkeit.

- [ ] **Step 1: DEMO-DATA um TDF-Referenz ergänzen**

Verlinken:
- `SYSING-KIOSK-001`,
- `kiosk-demo-dataset-v1.json`,
- klare Aussage: Demoimport ist keine produktive externe API.

- [ ] **Step 2: Entwicklungstagebuch ergänzen**

Datum 2026-09-23; Inhalt: TDF-Baseline, vorhandener Providervertrag, Referenzdatensatz, keine Laufzeitänderung.

- [ ] **Step 3: Vollständige relevante Checks ausführen**

Mindestens:
- `bun run docs:kiosk:check`
- `bun run docs:check`
- `bun run format --check` oder bestehender Prettier-Check
- `bun run typecheck`
- betroffene Kiosk-Tests
- GitHub Security / CI auf Exact Head.

- [ ] **Step 4: Review auf Scope-Drift**

Bestätigen:
- keine Produktcodeänderung am Kiosk-Verhalten,
- kein Supabase-Schema-/RLS-Change,
- keine Auth-/RBAC-Änderung,
- keine Lovable-Abhängigkeit,
- Referenz-JSON unverändert.

- [ ] **Step 5: Draft-PR eröffnen**

PR-Titel:
`docs(kiosk): SYSING-KIOSK-001 als TDF-Schnittstellendokument`.

PR enthält:
- Source-of-Truth-Pfade,
- generierte Artefakte,
- Prüfergebnisse,
- Exact Head,
- explizit `RUNTIME CHANGE = NO`,
- explizit `LOVABLE REQUIRED = NO`.

## Definition of Done

`SYSING-KIOSK-001` ist abgeschlossen, wenn:

1. eine eigenständige TDF-Markdown-Quelle V1.0.0 existiert,
2. Runtime-Provider, Demo-JSON und spätere externe Provider klar getrennt sind,
3. der vorhandene Beispieldatensatz die einzige führende Demoquelle bleibt,
4. Dokument-Code-Dataset-Drift automatisiert erkannt wird,
5. DOCX und PDF aus derselben Quelle erzeugt und visuell geprüft sind,
6. Security-/Datenschutz-/Resilience-Grenzen beschrieben sind,
7. Supabase-/Azure-/Docker-Portabilität als Adaptergrenze dokumentiert ist,
8. keine produktive externe API fälschlich als umgesetzt bezeichnet wird,
9. GitHub Required Checks auf dem Exact Head PASS sind,
10. keine Lovable-Aktion zur Umsetzung oder Abnahme erforderlich war.
