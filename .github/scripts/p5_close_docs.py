from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 occurrence, got {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    result, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 regex match, got {count}")
    return result


# CHANGELOG
path = "CHANGELOG.md"
text = read(path)
marker = "## 1.60.0 - 2026-09-13\n"
entry = """## 1.61.0 - 2026-09-13

- **Kundenverantwortung verwalten (BSF-03 P5, Issue #105)**: Neuer, von „Meine Kunden“ getrennter Bereich für Systemadministrator, Administrator und Teamlead. Verantwortungen können systemhausweit zugewiesen, gewechselt und beendet werden, auch ohne eigenen operativen Kundenzugriff.
- **Least-Privilege-Managementsicht**: Die Verwaltung zeigt ausschließlich Kundenkopf, aktuelle primäre Verantwortung und eine datenminimierte Kandidatenliste. Sie erzeugt keinen Zugriff auf Projekte, Arbeitspakete oder Tätigkeiten.
- **RLS bleibt eng**: Self-only-Regeln auf Profilen, Rollen und Systemhaus-Zugehörigkeiten sowie der Customer-Access-Scope wurden nicht verbreitert. Öffentliche P5-RPCs laufen als SECURITY INVOKER; der notwendige Fremdleseanteil ist auf private Helper mit leerem search_path begrenzt.
- **Atomarer Lifecycle**: Ein Wechsel beendet die alte und erzeugt die neue Responsibility in derselben Transaktion; ungültige Zielpersonen rollen den gesamten Wechsel zurück. Historie bleibt erhalten, Hard Delete findet nicht statt.
- **Sicherheit und Tests**: R19–R31, Unit-/Security-Verträge und E2E decken Datenminimierung, Cross-Systemhouse, IDOR/BOLA, Viewer/Customer-Ausschluss, Zuweisen, Wechseln, Beenden und Rollback ab.
- **UI-Konsistenz**: Der gemeinsame Kundenseitenrahmen behält für die persönliche Sicht „Meine Kunden“ und zeigt in der Managementroute ausdrücklich „Kundenverantwortung“.

"""
text = once(text, marker, entry + marker, "changelog")
write(path, text)

# PROJECT-STATUS
path = "docs/PROJECT-STATUS.yaml"
text = read(path)
text = once(text, 'dashboard: "1.60.0"', 'dashboard: "1.61.0"', "manifest version")
old_state = """  currentSprint: "BSF-03"
  currentSprintTitle: "Kundenverantwortung und Kundensicht"
  currentSprintStatus: "in-progress"
  nextSprint: "BSF-03D"
  previousSprint: "BSF-02"
  previousSprintStatus: "completed"
  releaseReadiness: "passed"
  testsPassing: 696"""
new_state = """  currentSprint: "BSF-03D"
  currentSprintTitle: "Arbeitspaket-Kategorien"
  currentSprintStatus: "planned"
  nextSprint: "BSF-03A"
  previousSprint: "BSF-03"
  previousSprintStatus: "completed"
  releaseReadiness: "passed"
  testsPassing: 704"""
text = once(text, old_state, new_state, "manifest current state")
text = once(
    text,
    '      - "BSF-03 P3/P4 Runtime/UI Meine Kunden und Kundendetail integriert und vollständig gegatet"',
    '      - "BSF-03 P3/P4 Runtime/UI Meine Kunden und Kundendetail integriert und vollständig gegatet"\n      - "BSF-03 P5 Kundenverantwortung mit datensparsamer Managementsicht, atomarem Lifecycle und unverändert engem operativem Kundenscope umgesetzt"\n      - "BSF-03 Kundenverantwortung und Kundensicht vollständig abgeschlossen"',
    "phase3 outcomes",
)
completed = """  - id: "BSF-03"
    title: "Kundenverantwortung und Kundensicht"
    version: "1.61.0"
    status: "completed"
    summary: >-
      Customer Responsibility als systemhausgebundene Beziehung umgesetzt; persönliche
      fail-closed Sicht Meine Kunden und read-only Kundendetail sowie getrennte,
      datensparsame Managementsicht für Zuweisen, Wechseln und Beenden integriert.
      Responsibility erzeugt weder operativen Customer Access noch Schreibrechte;
      Cross-Systemhouse/IDOR und Zielrollen werden serverseitig erzwungen.
"""
text = once(text, '  - id: "BSF-01"\n', completed + '  - id: "BSF-01"\n', "completed BSF-03")
text = regex_once(
    text,
    r'(  - id: "BSF-03"\n    title: "Kundenverantwortung und Kundensicht"\n    status: ")in-progress("\n)',
    r'\1completed\2',
    "roadmap BSF-03",
)
text = once(text, "    passing: 696", "    passing: 704", "quality tests")
text = once(text, 'currentRelease: "1.60.0"', 'currentRelease: "1.61.0"', "release version")
text = once(
    text,
    '    - "docs/BSF-03-RUNTIME-UI-MEINE-KUNDEN-2026-09-13.md"',
    '    - "docs/BSF-03-RUNTIME-UI-MEINE-KUNDEN-2026-09-13.md"\n    - "docs/BSF-03-RESPONSIBILITY-MANAGEMENT-READ-CONTRACT-2026-09-13.md"\n    - "docs/BSF-03-CLOSURE-2026-09-13.md"',
    "release evidence",
)
text = once(
    text,
    'nextReleaseTarget: "BSF-03 P5 Kundenverantwortung verwalten"',
    'nextReleaseTarget: "BSF-03D Arbeitspaket-Kategorien"',
    "next release",
)
write(path, text)

# CURRENT-STATUS
path = "docs/CURRENT-STATUS.md"
text = read(path)
text = once(text, "- Dashboard-Version: `1.60.0`", "- Dashboard-Version: `1.61.0`", "current status version")
section = """### BSF-03 — DONE / Issue #105

BSF-03 „Kundenverantwortung und Kundensicht“ ist mit P1–P5 fachlich abgeschlossen. P1/P2 lieferten das Datenbank-/Security-Fundament, P3/P4 die persönliche fail-closed Sicht **Meine Kunden** und das read-only Kundendetail, P5 ergänzt die getrennte Managementsicht **Kundenverantwortung**.

Verbindlicher Endzustand:

- Customer Identity bleibt `(systemhouseId, customerId)`,
- Responsibility ist Beziehung/Scope und keine globale Rolle,
- Responsibility allein erzeugt weder `customer_access` noch Schreibrechte,
- `Meine Kunden` bleibt die Schnittmenge aus aktiver Membership, eigener aktiver Responsibility, Customer Access >= read und `dashboard.view`,
- `Kundenverantwortung` ist davon getrennt und nur mit `customer.responsibility.manage` nutzbar,
- Systemadministrator, Administrator und Teamlead dürfen Responsibility für Kunden des eigenen Systemhauses verwalten, auch ohne eigenen operativen Customer Access,
- Kandidaten werden nur als ID + Anzeigename geliefert; bestehende Self-only-RLS wurde nicht verbreitert,
- Wechsel erfolgt atomar, Historie bleibt erhalten, Hard Delete findet nicht statt,
- Cross-Systemhouse, IDOR/BOLA, Viewer/Customer-Ziele und manipulierte Browserrollen bleiben DENY.

P5-Evidenz: Migration `20260913150000_bsf03_p5_responsibility_management`, SQL-Vertrag R19–R31, Live-Read-only-Prüfung von Funktionsmodus/Grants/RLS sowie 90 Unit-/Component-Testdateien mit 704 PASS / 4 TODO auf dem geprüften Funktions-Head. Abschlussnachweis: `docs/BSF-03-CLOSURE-2026-09-13.md`.

Nach finalem PR-#132-Merge ist **BSF-03D — Arbeitspaket-Kategorien (#103)** der nächste Entwicklungsschritt.

"""
text = regex_once(text, r"### BSF-03 — IN ARBEIT / Issue #105\n.*?(?=## F-11)", section, "current status BSF-03")
write(path, text)

# PRIORITIES
path = "docs/BSF-CURRENT-PRIORITIES.md"
text = read(path)
section = """### BSF-03 — Kundenverantwortung / Kundensicht (#105) — DONE

P1–P5 sind umgesetzt. `Meine Kunden` bleibt persönliche fail-closed Sicht; `Kundenverantwortung` ist die getrennte systemhausweite Managementsicht ohne zusätzlichen operativen Customer Access.

Nachweise: PR #118, #127, #128 und P5-PR #132; R19–R31; Unit-/Security-/E2E-Verträge; Live-Schema-Prüfung; `docs/BSF-03-CLOSURE-2026-09-13.md`.

### Nächster Schritt: BSF-03D — Arbeitspaket-Kategorien (#103)

BSF-03D ist der nächste fachliche Sprint: systemhausweite editierbare Kategorien als optionale stabile Auswertungsdimension, ohne implizite Billable-/Prioritäts-/Status-Semantik.

"""
text = regex_once(text, r"### BSF-03 — Kundenverantwortung / „Meine Kunden“ \(#105\) — IN ARBEIT\n.*?(?=## Lovable-/Werkzeugsteuerung)", section, "priorities BSF-03")
text = once(
    text,
    "2. **BSF-03 — IN ARBEIT; P5 NÄCHSTER SCHRITT**\n3. **BSF-03D — GEPLANT / bis BSF-03-Abschluss gesperrt**",
    "2. **BSF-03 — DONE**\n3. **BSF-03D — NÄCHSTER SCHRITT / FREIGEGEBEN**",
    "priorities order",
)
write(path, text)

# SPRINT PLAN
path = "docs/SPRINT-PLAN-MVP-BSF.md"
text = read(path)
focus = """### 2.1 Aktueller Fokus 13.09.2026

1. **BSF-02 / BSF-02C — DONE**
2. **BSF-03 P1/P2 — DONE**
3. **BSF-03 P3/P4 — DONE**
4. **BSF-03 P5 — ABSCHLUSSKANDIDAT in PR #132**: Managementsicht, Datenminimierung, atomarer Lifecycle, R19–R31, Version 1.61.0.
5. **BSF-03D — NÄCHSTER SPRINT nach finaler PR-#132-/Main-Verifikation**

"""
text = regex_once(text, r"### 2\.1 Aktueller Fokus 13\.09\.2026\n.*?(?=### 2\.2)", focus, "sprint focus")
text = once(
    text,
    "`BSF-03/P5 → BSF-03-Abschluss → BSF-03D → BSF-03A → BSF-03B → BSF-03E → BSF-03C → BSF-DOC-01 → BSF-DOC-02 → BSF-DOC-03 → BSF-04 → BSF-04A → BSF-05 → BSF-06 → BSF-07 → BSF-09 → BSF-10 → BSF-FINAL → INTEGRATION-READINESS`",
    "`BSF-03D → BSF-03A → BSF-03B → BSF-03E → BSF-03C → BSF-DOC-01 → BSF-DOC-02 → BSF-DOC-03 → BSF-04 → BSF-04A → BSF-05 → BSF-06 → BSF-07 → BSF-09 → BSF-10 → BSF-FINAL → INTEGRATION-READINESS`",
    "sprint sequence",
)
bsf03 = """### BSF-03 — Kundenverantwortung und „Meine Kunden“ (#105)

- P1/P2 Datenbank-/Security-Fundament: **DONE**.
- P3/P4 persönliche fail-closed Sicht `Meine Kunden` + read-only Kundendetail: **DONE**.
- P5 getrennte Managementsicht `Kundenverantwortung`: **DONE / PR #132 Abschlusskandidat**.
- Management erzeugt keinen operativen Customer Access; Read-Vertrag ist datenminimiert und die Self-only-RLS bleibt eng.
- Responsibility-Wechsel ist atomar und historisiert; Cross-Systemhouse/IDOR/BOLA bleiben DENY.
- Abschlussdokument: `docs/BSF-03-CLOSURE-2026-09-13.md`.
- Status: **ABSCHLUSSKANDIDAT** bis finaler Exact-Head-/Merge-/Main-Nachweis.

"""
text = regex_once(text, r"### BSF-03 — Kundenverantwortung und „Meine Kunden“ \(#105\)\n.*?(?=### BSF-03D)", bsf03, "sprint BSF-03")
write(path, text)

# DEVELOPMENT DIARY
path = "docs/ENTWICKLUNGSTAGEBUCH.md"
text = read(path)
text = once(text, "Stand: 2026-09-13 · Dashboard-Version 1.60.0", "Stand: 2026-09-13 · Dashboard-Version 1.61.0", "diary version")
text = once(
    text,
    "| Aktueller Stand     | Version 1.60.0; MVP-Baseline CLOSED/PASS; BSF-03 P3/P4 „Meine Kunden“ read-only umgesetzt; P5 Verantwortungsverwaltung offen.",
    "| Aktueller Stand     | Version 1.61.0; MVP-Baseline CLOSED/PASS; BSF-03 Kundenverantwortung und Kundensicht P1–P5 abgeschlossen; BSF-03D folgt.",
    "diary management",
)
heading = "## 2026-09-13 — Version 1.61.0 — BSF-03 P5 / Kundensicht abgeschlossen"
if heading in text:
    raise SystemExit("diary closure already exists")
appendix = f"""

{heading}

- Separate Managementsicht **Kundenverantwortung** für Systemadministrator, Administrator und Teamlead.
- Systemhausweite Responsibility-Verwaltung ohne impliziten operativen Customer Access.
- Kandidaten auf ID + Anzeigename minimiert; bestehende Personen-RLS nicht verbreitert.
- Wechsel atomar/historisiert; ungültige Ziele rollen vollständig zurück.
- Migration, Grants und RLS live read-only geprüft; R19–R31 sowie Unit-/Security-/E2E-Schutz ergänzt.
- UI-Shell-Titel nach unabhängigem Review test-first korrigiert.
- Abschlussnachweis: `docs/BSF-03-CLOSURE-2026-09-13.md`.
- Nächster Sprint nach finalem Merge: **BSF-03D — Arbeitspaket-Kategorien**.
"""
text = text.rstrip() + appendix + "\n"
write(path, text)
