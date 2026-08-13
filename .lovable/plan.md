# Sprint 09B – Finaler MVP-Release-Candidate-Check

Kein Feature-Sprint. Ziel ist eine belastbare, nachweisgestützte Freigabeentscheidung
(GO / GO WITH FINDINGS / NO-GO) für den tatsächlichen Repository-Stand.

## Ausgangslage (bereits verifiziert)

- Der Stand im Repository ist **v1.58.0**, nicht v1.57.0 wie im Auftrag angenommen.
  v1.58.0 enthält bereits den achten AVKK-Demofall, die Produktivwarnung im Demo-Dialog,
  SYSING-001 V0.2.0, den zusammengeführten ADR-Index (0001–0028) und einen ersten
  `docs/MVP-ACCEPTANCE-REPORT.md`.
- `src/lib/pdf-export.ts` (486 Zeilen) existiert weiterhin parallel zur Reporting-Schicht
  und wird von `PdfPreviewDialog`, `DownloadCenterDialog` und `useExportDialog` genutzt.
- Excel taucht in der Reporting-Schicht nicht als Renderer auf (nur CSV/JSON/PDF/Word/Druck).

Diese Punkte werden im Bericht als Ist-Stand geführt, nicht überschrieben.

## Vorgehen

1. **Ist-Stand verifizieren** — gemeldete Fähigkeiten (Auth, RBAC/RLS, AVKK, Reference Data,
   Management, Reporting, Backup 2.0, Demo-Seed, TDF, ADR) gegen Code und Tests prüfen,
   nicht gegen CHANGELOG/PROJECT-STATUS.
2. **Release-Gate-Lauf vollständig** — Tests, Typecheck, ESLint (Errors/Warnings einzeln
   berichtet, inkl. Bestandsverstöße), Prettier, Build, `docs:check`, `project-status:check`,
   `rbac:check`, no-console, Security-Checks, Architektur-/Layer-Checks, Tech-Debt.
   Die tatsächliche finale Testzahl wird berichtet.
3. **SYSING-001** — PDF-Fassung gegen den aktuellen Markdown-Quellstand abgleichen
   (Inhaltsprüfsumme). Bei Übereinstimmung: visuelle PDF-Abnahme = PASSED.
   Word-Fassung separat und ehrlich bewerten (visuell geprüft oder nicht).
   Inhaltlicher Finalcheck der Statuskennzeichnung: Zukunftsthemen (SharePoint, Graph,
   Exchange, TaskCandidates, Mailausgang, KI-Copilot, Agent Lab, Entra ID, Azure) dürfen
   nirgends als umgesetzt erscheinen; SharePoint-Zielbild als READ/SYNC, AVKK als
   zusätzliche Sysing-Fachschicht; KI-Reifegrade 0–5 als Lernmodell, providerneutral.
4. **Demo-Datensatz final prüfen** — Version, Demo-Kennzeichnung, Idempotenz, RLS-Weg ohne
   privilegierten Schlüssel, `setDemoBaseDate()`, Stilllegung statt Löschung, keine echten
   Daten/Secrets. Abdeckung der geforderten AVKK-Lagen gegen die Fälle prüfen; fehlende
   Lagen (z. B. fehlende Zeit, fehlendes Material, fehlende Berechtigung) werden als Finding
   dokumentiert, nicht stillschweigend als abgedeckt gemeldet.
5. **Betriebsgrenze Demodaten** — Nachweis, dass die Regel „nur Dev-/Test-/Demo-Instanz"
   in `docs/DEMO-DATA.md`, Acceptance Report, Betriebsdoku und Demo-UI steht. Keine
   Hard-Delete-Hintertür.
6. **Rollen-/UI-Abnahme** — Status je Rolle (Systemingenieur, Projektmanager, Geschäftsführer,
   Admin/Role Preview, Negativtest) vollständig erfassen. Was nicht technisch durchgeführt
   wurde, wird MANUAL VERIFICATION REQUIRED, nicht PASSED.
7. **RBAC und RLS getrennt nachweisen** — inkl. `avkk.view`, `avkk.edit`,
   `avkk.management.view`, Reporting, Export, Reference Data, Demo-Seed, administrative
   Funktionen, Role Preview. Direkter Datenzugriff wird gegen die Datenbank geprüft,
   nicht nur die UI. Ergebnis getrennt als PASSED/FINDING.
8. **Reporting final** — je Report (persönlich, PM, Management, Leistungsnachweis,
   SYSING-001) und je Format (PDF, Druck, Word, JSON, CSV) Erzeugbarkeit, Berechtigung,
   Datenrichtigkeit, Layout- und visueller Prüfstatus, Grenzen. Excel wird als
   GEPLANT/POST-MVP geführt.
9. **Legacy-PDF-Pfad entscheiden** — `src/lib/pdf-export.ts` wird in diesem Sprint **nicht**
   migriert (drei Aufrufstellen, 486 Zeilen, nicht verhaltensneutral). Er wird als
   technische Schuld mit Finding-ID und Ziel-Sprint dokumentiert.
10. **Backup/Restore** — Manifest 2.0, SHA-256, Größe, Typ, fehlende/verwaiste Dateien,
    doppelte Keys, Legacy-Format, AVKK, Reference Data. Die AVKK-Restore-Grenze erhält
    eine eindeutige Entscheidung: ACCEPTED FOR MVP oder MVP BLOCKER, mit Begründung.
11. **Cross-Format-Konsistenz** — ausgewählte Demofälle über Fachdaten, UI, Management,
    JSON, CSV, PDF, Word, Backup vergleichen; Abweichungen als Finding.
12. **ADR-Gesamtreview** — Tabelle über alle 28 ADRs (Status, weiterhin gültig,
    MVP-relevant, Finding) plus Summenzeile; Schwerpunkte Local-First vs. Supabase,
    AVKK, RLS/RBAC, polymorphe Referenzen, Backup, Management, Reporting, TemplateProvider,
    TDF, Docker, Providerneutralität, Azure/Entra.
13. **Architektur-/Portabilitätscheck** — Docker-Autonomie, keine unersetzbare
    Cloud-Abhängigkeit, Konfiguration über Environment/Provider, keine Windows-Pfade in
    Fachlogik, saubere Trennung Auth/Fachlogik/Datenzugriff.
14. **Security final** — bekannte Findings zusammentragen; `avkk_can_write` gegen die
    bestehende Ausnahme prüfen (boolesche Rückgabe, kein Datenleck, `search_path`, Grants,
    ADR-0025). Unverändert ⇒ accepted LOW. Neue Findings separat.
15. **Artefakte erzeugen/aktualisieren** — technischer Prüfbericht neu gegen diesen
    Release Candidate (mit Version und Commit), `docs/MVP-ACCEPTANCE-REPORT.md` auf die
    geforderte Gliederung erweitern, Findings einzeln klassifiziert (ID, Titel,
    Beschreibung, Nachweis, Auswirkung, Schweregrad, Blocker ja/nein, Entscheidung,
    Maßnahme, Ziel-Sprint) — keine Sammelfindings.
16. **Doku-Synchronisation** — CHANGELOG (v1.58.1 als Abnahmeversion), PROJECT-STATUS.yaml,
    MVP-PLAN, DEMO-DATA, SYSING-001, Acceptance Report, Prüfbericht, ADR-Index,
    Entwicklungstagebuch, Benutzerhandbuch. Keine Versionsinkonsistenz.
17. **Entscheidung und Abschlussausgabe** — im vorgegebenen Kurzformat, inklusive
    MVP-Reifegrad, verbleibender Prompts und nächstem Schritt (MVP RELEASE / BASELINE
    oder 09C – MVP Hardening, dann nur mit den Findings aus dieser Abnahme).

## Technische Hinweise

- Änderungen am Produktivcode bleiben auf risikoarme Korrekturen beschränkt, die für den
  Abnahmenachweis nötig sind; alles andere wird Finding für 09C.
- Ein Hydration-Mismatch auf `/auth` stammt nachweislich von einer Browser-Erweiterung
  (Dashlane-Attribute) und wird als Nicht-Finding vermerkt.
- Die Gate-Ergebnisse werden roh berichtet: keine Abschwächung, keine kosmetische
  Bereinigung von Zahlen.
