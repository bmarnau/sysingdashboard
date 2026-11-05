# Bericht bun audit: zwei kritische Funde

Stand: 2026-11-05 · Auftrag A02 (ops/queue) · Grundlage: `main` 9ab42d15, `bun.lock` · bun 1.4.3 · Art: nur lesen

## Ergebnis

1. `bun audit` meldet 60 Funde (2 kritisch, 25 hoch, 24 mittel, 9 niedrig) in 16 Paketen.
2. Kritisch 1: `dompurify@3.4.13` über `jspdf`, GHSA-cg2g-xh64-v4q7. Das Paket ist Laufzeit im Client, der betroffene Pfad wird von der App aber nicht aufgerufen.
3. Kritisch 2: `shell-quote@1.9.0` über `@tanstack/devtools-vite > launch-editor`, GHSA-pqg4-j6r4-53mv. Das Paket wirkt nur im lokalen Entwicklungsserver und ist nicht im ausgelieferten Stand enthalten.
4. Der Fund GHSA-qx66-fv34-fjm8 (TanStack Start) ist auf `main` behoben (PR 276, gemergt 2026-11-03). Der Release-Commit 1.69.0 (3732df26, 2026-10-21) enthielt noch verwundbare Versionen.
5. Ob der veröffentlichte Stand 1.69.0 verwundbar ist, lässt sich aus dem Repository nicht belegen. Es ist wahrscheinlich, weil Publish den Lovable-Projektstand ausliefert (R-07).

## Funde

| Fund | Paket und Pfad                                                                                                                               | Advisory                                                                 | betroffen        | behoben                          | Laufzeit                                            | Angriffspfad in dieser App                                                                                                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------- | -------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1   | `dompurify@3.4.13` · `jspdf > dompurify` (optionale Abhängigkeit, `bun.lock:1009`, `:1213`)                                                  | GHSA-cg2g-xh64-v4q7, SAFE_FOR_TEMPLATES-Umgehung in Shadow-Root-Inhalten | >=3.4.4 <=3.4.16 | 3.4.17 (laut `npm view` aktuell) | Client (PDF-Erzeugung)                              | nicht erreichbar: `jsPDF` wird in `src/lib/pdf-export.ts:1` und `src/lib/report/renderers/pdf.ts:9` genutzt, `doc.html()` (der einzige Weg zu DOMPurify) kommt im Code nicht vor; `SAFE_FOR_TEMPLATES` wird nicht gesetzt |
| K2   | `shell-quote@1.9.0` · `@lovable.dev/vite-tanstack-config > @tanstack/devtools-vite > launch-editor > shell-quote` (`bun.lock:1223`, `:1459`) | GHSA-pqg4-j6r4-53mv, Befehlseinschleusung in `quote()`                   | >=1.8.4 <1.11.0  | 1.11.0 (aktuell 1.12.0)          | nur Entwicklung (Vite-Devtools, „im Editor öffnen“) | nur lokal: Ein Angreifer müsste einen präparierten Dateinamen an den laufenden Dev-Server eines Entwicklers schicken; nicht im veröffentlichten Bundle                                                                    |

Gekürzte Ausgabe von `bun audit`:

```text
dompurify@3.4.13
  jspdf > dompurify
  critical: DOMPurify SAFE_FOR_TEMPLATES bypass: split template expressions survive in attached shadow root content on DOM output modes (>=3.4.4 <=3.4.16) - https://github.com/advisories/GHSA-cg2g-xh64-v4q7
  high: DOMPurify IN_PLACE: hook that removes a parent or sibling leaves the detached subtree's event handlers armed (<=3.4.16) - GHSA-mrv2-3pqr-j5jr
shell-quote@1.9.0
  @lovable.dev/vite-tanstack-config > @tanstack/devtools-vite > launch-editor > shell-quote
  critical: shell-quote: `quote()` command injection via a line terminator in a token after a `{ comment }` token (>=1.8.4 <1.11.0) - https://github.com/advisories/GHSA-pqg4-j6r4-53mv
60 vulnerabilities (2 critical, 25 high, 24 moderate, 9 low)
```

## Vorschlag zur Behebung

| Fund | Maßnahme                                                                                                                              | Kompatibilitätsrisiko  | Prüfumfang                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| K1   | `dompurify` auf 3.4.17 anheben, über `overrides` in `package.json` (der Bereich `^3.3.1` von `jspdf` erlaubt das), Lockfile mitführen | gering (Patch-Version) | Build, Unit-Tests zu `pdf-export` und Report-Renderer, E2E Export (PDF-Download) |
| K2   | `shell-quote` auf 1.12.0 über `overrides` (Bereich `^1.8.4` von `launch-editor` erlaubt das), Lockfile mitführen                      | sehr gering (nur Dev)  | Build, `npm run dev` startet, Devtools öffnen                                    |

Ein Update pro PR. Beide nur nach Beauftragung (Lovable-Grenzen LG-05 bis LG-08). Nach dem Merge muss Lovable den Stand übernehmen, sonst bleibt der veröffentlichte Stand unverändert.

## Veröffentlichter Stand 1.69.0

| Punkt                               | Befund                                                                                                                                                              | Beleg                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Release-Commit 1.69.0               | 3732df26 vom 2026-10-21                                                                                                                                             | `git log -G'1\.69\.0' -- CHANGELOG.md`                                |
| TanStack im Release-Commit          | `@tanstack/react-start@1.168.26`, `@tanstack/start-server-core@1.169.15`, beide im verwundbaren Bereich von GHSA-qx66-fv34-fjm8 (behoben ab 1.168.60 bzw. 1.169.39) | `git show 3732df26:bun.lock`, `gh api advisories/GHSA-qx66-fv34-fjm8` |
| TanStack auf `main`                 | 1.168.60 und 1.169.39, behoben                                                                                                                                      | `bun.lock` auf 9ab42d15, PR 276 (Merge 44b5ebf5)                      |
| Quelle des veröffentlichten Bundles | nicht ermittelbar: kein Tag v1.69.0, Publish liefert den Lovable-Projektstand aus (`docs/LOVABLE-PUBLISH-PRUEFUNG.md`, R-07)                                        | `git tag --list 'v1.6*'` endet bei v1.65.0                            |
| Einschätzung                        | wahrscheinlich verwundbar (XSS in Antworten von Server-Funktionen, ohne Anmeldung), Prüfung nur am ausgelieferten Bundle möglich                                    | Ableitung, kein Beleg                                                 |

## Grenzen

- Keine Pakete geändert, kein Zugriff auf das Live-System.
- Die übrigen 58 Funde (hoch, mittel, niedrig) sind nicht bewertet. Darunter sind `sharp` (2 × hoch) und `browserslist`. Eine Sammelbewertung sollte im Backlog stehen.
