# Druck des technischen Prüfberichts — Architektur und Verifikation

Stand: 1.44.3 (Sprint 05B)

## Problem

Bis 1.44.2 lieferte „Drucken / PDF" im Compliance-Dialog einen leeren oder stark
abgeschnittenen Ausdruck. Zwei Ursachen:

1. Der Bericht wurde innerhalb des Radix-Dialogs gedruckt. Dessen Layout
   (`position: fixed`, `max-height`, `overflow: auto`) beschneidet den Inhalt im
   Print-Medium auf die sichtbare Fläche — Folgeseiten entstehen nicht.
2. Die Print-Regel blendete alles außer dem Bericht per `:not(:has(...))` aus.
   Das traf auch den Portal-Container selbst, wodurch der Bericht mit
   verschwand.

## Lösung

- `src/components/compliance/ComplianceReportPrint.tsx` rendert eine
  eigenständige, vollständige Fassung des Berichts (11 Abschnitte). Alle Werte
  stammen aus `test-report/technical-test-report.json`; nichts ist hart kodiert.
- `src/components/TechnicalReportDialog.tsx` erzeugt beim Druck ein
  `div#technical-report-print-root` **direkt als Kind von `document.body`** und
  rendert die Print-Fassung per `createPortal` hinein. Damit ist der Ausdruck
  vom Dialog-Layout vollständig entkoppelt.
- Sichtbarkeit steuert die Body-Klasse `printing-compliance` in `src/styles.css`:
  im `@media print` werden alle direkten Body-Kinder ausgeblendet, nur das
  Print-Root bleibt sichtbar (`display: block`, statischer Fluss).

## Ablaufhärtung

```
printing = true
  → rAF → rAF        (zwei Frames: Portal ist im Layout)
  → body.classList.add("printing-compliance")
  → window.print()
  → afterprint | Fallback 1500 ms → aufräumen (Klasse entfernen, printing = false)
```

- `cancelled`-Flag im Effekt-Cleanup verhindert unter React StrictMode einen
  zweiten `window.print()`-Aufruf.
- `finally` um `window.print()` stellt sicher, dass der Fallback-Timer auch bei
  Exception gesetzt wird.
- `done`-Flag macht das Aufräumen idempotent (afterprint **und** Timer).

## Verifikation (Playwright, headless Chromium)

Skript-Ablauf: Dashboard öffnen → Servicemenü → „Technischer Prüfbericht…" →
„Drucken / PDF" → DOM inspizieren, danach `page.pdf()`.

Beobachtet:

| Prüfung                                    | Ergebnis                                                |
| ------------------------------------------ | ------------------------------------------------------- |
| `#technical-report-print-root` vorhanden   | ja                                                      |
| direktes Kind von `body`                   | ja                                                      |
| `body.class` enthält `printing-compliance` | ja                                                      |
| Abschnitte im Print-Root                   | 11 von 11                                               |
| Findings im Print-Root                     | 72 (= Reportstand)                                      |
| übrige Body-Kinder im Print-Medium         | `display: none`                                         |
| `window.print()`-Aufrufe pro Klick         | 1 (StrictMode-sicher)                                   |
| PDF-Seiten                                 | 49, Kopf-, Findings- und Nachweisabschnitte vollständig |

Hinweis: `page.pdf()` löst `window.print()` nicht aus. Für automatisierte
Cleanup-Tests muss `afterprint` manuell dispatcht werden oder der 1500-ms-
Fallback abgewartet werden.
