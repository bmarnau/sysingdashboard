# Accessibility Compliance (WCAG 2.1 AA) — v1.23.0

## Kritisches Feedback zur Vorlage

Die Vorlage ist inhaltlich richtig, aber mehrere Punkte passen nicht 1:1 zu diesem Projekt. Ich weiche bewusst ab:

1. **`jest-axe` ist die falsche Bibliothek.** Wir nutzen Vitest, nicht Jest. `jest-axe` funktioniert zwar unter Vitest, bringt aber Jest-Typings mit und verwirrt Wartende. **Alternative:** `vitest-axe` — API-kompatibel (`toHaveNoViolations`, `axe`), aber mit Vitest-Matchern und -Typen.
2. **`@axe-core/react` ist überflüssig.** Das ist ein DEV-Runtime-Hook, der Violations in die Browser-Console loggt — redundant, weil wir bereits CI-Tests haben und einen Logger. Wir installieren nur `axe-core` (transitiv über `vitest-axe`).
3. **Lighthouse in CI ist Overkill und flaky.** Für ein serverseitig gerendertes B2B-Dashboard ohne öffentlichen Deploy-Preview aus dem CI heraus braucht Lighthouse-CI einen laufenden Server + Chromium + stabile Netzwerklatenz. Das kostet 60–90 s pro Lauf und produziert falsch-negative Reports bei jedem Renderer-Update. **Alternative:** Axe-Tests decken ~57 % der WCAG-Kriterien automatisiert ab (Deque-Zahl); der Rest ist manuell (Tastatur, Screenreader, Kontext). Lighthouse als **optionaler `bun run a11y:lighthouse`-Script** lokal, nicht in CI.
4. **`role="table"` auf `<table>` ist redundantes ARIA** (ESLint-Regel `no-redundant-roles`). Semantisches HTML reicht. Streiche diesen Punkt.
5. **PDF-Tagging via jsPDF** ist mit den vorhandenen Mitteln praktisch nicht in AA-Qualität hinzubekommen (jsPDF unterstützt PDF/UA nur rudimentär, kein Structure-Tree). Ehrliche Lösung: PDF-Export als **„nicht barrierefrei, nutzen Sie den TXT-/JSON-Export"** kennzeichnen (Hinweis im Export-Dialog) und den bereits vorhandenen `text-export.ts` als A11y-konforme Alternative bewerben. Alles andere wäre Feigenblatt.
6. **Runtime-Hydration-Fehler zuerst.** Die Runtime-Errors zeigen Hydration-Mismatches durch die Dashlane-Browser-Extension (`data-dashlane-rid`). Das ist **kein Bug in unserem Code**, aber wir setzen `suppressHydrationWarning` auf die betroffenen `<input>`/`<button>`-Elemente, sonst überschattet der Log jede echte A11y-Warnung. Kleiner Fix, gehört inhaltlich mit rein.

## Umsetzung

### Wave A — Testing-Infrastruktur (in diesem PR)

**Neue Dev-Deps**
- `vitest-axe` (bringt `axe-core` transitiv)

**Neue/geänderte Dateien**
- `src/__tests__/setup.ts` — `expect.extend(matchers)` aus `vitest-axe/matchers`
- `src/__tests__/a11y/smoke.test.tsx` — Smoke-Test für die kritischsten Render-Pfade:
  - Dashboard-Header (isoliert, ohne kompletten `<Dashboard/>`, um Test-Runtime beherrschbar zu halten)
  - `ExportDialog` (open)
  - `UserManagementDialog` (open)
  - `AzureDataDialog` (open)
  - `PermissionGate` (denied state)
- `src/__tests__/a11y/keyboard.test.tsx` — expliziter Tab-Reihenfolge-Test für Header und einen Dialog (`userEvent.tab()`).

**Warum nicht `<Dashboard/>` komplett?** `src/routes/index.tsx` rendert ~3000 Zeilen mit Router/Query-Kontext. Ein vollständiger Render dauert im Test 3–5 s und produziert Violations, die zu Handler-Komponenten gehören und nicht zum Layout — nicht lokalisierbar. Isolierte Smoke-Tests pro Panel sind aussagekräftiger.

### Wave A — Fixes für bekannte Violations

Vorab identifiziert (Sichtprüfung + Skill-Guide):
- **Icon-only Buttons ohne `aria-label`**: Suchergebnisse, Header-Icons, Azure-History-Row-Actions. Fix: `aria-label` ergänzen.
- **`h-screen` → `h-dvh`** in vollhöhen-Layouts (Mobile-Viewport-Bug).
- **`suppressHydrationWarning` für Extension-Attribute** auf `<input>` (Search-Feld) und Top-Level Header-Buttons.
- **Live-Region für Toaster**: `sonner` setzt `aria-live` selbst; nichts zu tun. Aber Import/Sync-Status-Meldungen in `AzureStatusPanel` bekommen `role="status" aria-live="polite"`.
- **Kontrast**: Skill-Guide-Regel bereits erfüllt (Design-Tokens). Ich prüfe ausschließlich, ob irgendwo `text-muted-foreground/50` oder ähnliche Verdünnungen stehen.

### Wave A — CI

`.github/workflows/ci.yml`: Kein neuer Job — die a11y-Tests laufen im bestehenden `test:coverage`-Schritt automatisch mit, weil sie unter `src/__tests__/` liegen. Ein separater Step wäre reine Kosmetik.

### Wave A — Dokumentation

- Neues Handbuch-Topic `barrierefreiheit` mit:
  - Testabdeckung (was ist automatisiert, was manuell)
  - Bekannte Einschränkungen (PDF-Export siehe oben)
  - Tastaturkürzel-Liste (aus bestehenden Handlern extrahieren)
- `CHANGELOG.md` v1.23.0-Eintrag.
- `src/lib/help-documentation.ts` `lastUpdated` setzen.

### Nicht in diesem PR (bewusst ausgeschlossen)

- Lighthouse-CI-Integration (Overkill, siehe oben) — nur lokal als optionales `bun run a11y:lighthouse` (nutzt bestehendes `lighthouse`-CLI, kein package.json-Zwang).
- Full-Dashboard-`axe(<Dashboard/>)`-Test (siehe oben).
- PDF-Tagging (siehe oben — dokumentierte Einschränkung stattdessen).
- Screen-Reader-Manual-QA-Skript — nicht automatisierbar; im Handbuch dokumentiert, wo NVDA/VoiceOver-Checks nötig sind.

## Erwartete Ergebnisse

- 94 → ~104 Tests (10 neue A11y-Tests), grün
- Keine `console.error` mehr durch Hydration-Mismatches
- `docs:check` grün
- Alle Icon-only Buttons haben Accessible Name

## Technische Details

**vitest-axe Setup-Ergänzung**
```ts
// src/__tests__/setup.ts (Ergänzung)
import * as axeMatchers from "vitest-axe/matchers";
import { expect } from "vitest";
expect.extend(axeMatchers);
```

**Test-Pattern**
```tsx
import { axe } from "vitest-axe";
it("ExportDialog: keine A11y-Violations", async () => {
  const { container } = render(<ExportDialog open onOpenChange={() => {}} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

**Hydration-Fix**
```tsx
<input suppressHydrationWarning ... />
```

## Offene Frage

Willst du wirklich Lighthouse als optionalen lokalen Script (`bun run a11y:lighthouse`) drin haben, oder ganz weglassen? Ich tendiere zum Weglassen — die Dev-Dep wiegt 300+ MB.
