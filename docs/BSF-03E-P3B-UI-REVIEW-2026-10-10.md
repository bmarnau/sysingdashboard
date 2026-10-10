# BSF-03E P3b – Fortsetzung, Review-Fix und aktuelle Abnahme

Stand: 2026-10-10 · UI-Kandidat: 1.68.0 · Issue: #63

## Ergebnis und Scope

Der vorhandene UI-Kandidat wurde fortgesetzt und erneut geprüft. Basis bleibt
`main@b5acf3d9349bfb132a1a3615878024955d2a4385`; übernommener UI-Head ist
`b6db2f315a1f2081d3ccb7e99875b9c4639f637e`. Kein Merge und kein Deploy.

Die unabhängige, vollständige Branch-Review bestätigte einen Important-Befund:
Der AP-Hook verbarg alte Daten erst, nachdem `useCurrentUser` die neue Identität
publiziert hatte. Während verzögerter Profilreads blieb die vorherige Identität
sichtbar; überlappende Reads konnten sie später wiederherstellen. Die bisherigen
AP-Hook-Tests ersetzten diese kritische Abhängigkeit durch einen synchronen Mock.

Die Korrektur bleibt an der bestehenden Grenze: `useCurrentUser` invalidiert die
publizierte Identität vor jedem asynchronen Read und prüft dessen Aufrufgeneration
vor weiterer Verarbeitung und Publikation. Ältere Session-/Profilantworten können
neuere Identität oder Rolle nicht mehr überschreiben. Der öffentliche Hookvertrag,
RLS, RBAC, Schema, Provider und Abhängigkeiten bleiben unverändert.

## Frische Prüfung am 10.10.2026

Linux, Bun 1.4.2, Node 24.19.0, unverändertes `bun.lock`, Vitest mit `TZ=UTC`.

| Prüfung                                          | Ergebnis                                            |
| ------------------------------------------------ | --------------------------------------------------- |
| Tatsächliche Auth-/Profilgrenze                  | 5/5 zunächst RED, danach 5/5 PASS                   |
| Profil-/AP-Hooks, AP-UI, P3a und Versionsanzeige | 25/25 PASS                                          |
| Vollsuite des korrigierten Kandidaten            | 1076 PASS, 3 FAIL, 4 TODO; 161 Dateien              |
| Vergleich: unverändertes main, Vollsuite         | 1056 PASS, 2 FAIL, 4 TODO; 158 Dateien              |
| Vergleich: API-/Versionsdateien allein auf main  | 34 PASS, 4 TODO                                     |
| Typecheck                                        | PASS nach Korrektur                                 |
| Lint der korrigierten Dateien                    | PASS, 0 Fehler                                      |
| Vollständiger Lint des übernommenen Kandidaten   | PASS, 0 Fehler, 20 bestehende Warnungen             |
| Production Build                                 | PASS nach Korrektur                                 |
| Playwright AP-Arbeitssicht                       | 10/10 PASS nach Korrektur                           |
| Responsive / Accessibility                       | 1280/640/390 ohne Dokument-Overflow; Axe 0 Verstöße |

Die fünf neuen Tests verwenden die echten Produktionshooks `useCurrentUser` und
`useWorkPackageWorkView`. Nur externe Session-, Profil-, Rollen- und AP-Reads werden
simuliert. Geprüft werden sofortiges Ausblenden beim Kontowechsel, verspätete alte
Profile, Signout während eines Reads, überlappende Rollenreads und verspätete
AP-Antworten während des neuen Profilreads.

Der vorhandene Versionsanzeige-Test wurde auf den bereits dokumentierten
Kandidaten 1.68.0 / 04.10.2026 abgeglichen. Die Produktanzeige leitet ihre Version
weiterhin aus dem Changelog ab.

## Grenze der lokalen Vollsuite

Diese drei unveränderten API-Verträge liefen im Kandidaten in den externen
`/api/status`-Timeout:

- `src/__tests__/api/runner.test.ts` → `should_returnResponse_when_GETInvoked`.
- `src/__tests__/api/runner.test.ts` → `should_notLeakSecrets_when_responseSerialized`.
- `src/__tests__/api/smoke/smoke.test.ts` → `status (/api/status) > smoke-runs`.

Der erste und dritte Timeout wurden im vollständigen unveränderten main-Lauf
ebenfalls reproduziert. Die drei API-/Versionsdateien allein bestehen auf main.
Damit hängt die Reproduktion vom Laufkontext ab; die API-Dateien und der
Statushandler sind in diesem UI-Schnitt unverändert. Die zusätzliche
Serialisierungsprüfung ist ausdrücklich ein offener lokaler Nachweis und wird
nicht stillschweigend als bestanden behandelt. Keine Assertions oder Timeouts
wurden abgeschwächt. Die lokale Vollsuite ist **nicht PASS**.

## Browsernachweis

Die bestehenden zehn Playwright-Fälle wurden unverändert ausgeführt. Der reguläre
Browserdownload scheiterte an einem unvollständigen Archiv. Ein ausschließlich
temporärer Prüfadapter verwendete Chromium 153, Loopback-Bindung und deaktivierte
Videoaufzeichnung. Produktabhängigkeiten und reguläre CI-Konfiguration bleiben
unverändert. Die 1280- und 390-Pixel-Screenshots wurden zusätzlich visuell geprüft.
Synthetische E2E-Daten belegen UI-Verhalten; sie ersetzen keine Live-DB-RLS-Abnahme.

## Review-Entscheidungen und verbleibende Grenzen

- **Important behoben:** tatsächlicher Auth-/Profilwechsel, fünf RED→GREEN-Nachweise.
- **Minor zurückgestellt:** Wird ein ausgewählter Kunden-/Owner-/Statusfilter nach
  einem Refresh nicht mehr als Option angeboten, kann seine Anzeige unklar sein.
  Der Filter bleibt aktiv; „Filter zurücksetzen“ entfernt ihn. Ein neutraler
  Hinweis für entfallene Optionen ist ein späterer Präsentationsschnitt.
- **Serverseitiger Rollenentzug ohne Ereignis/Refresh:** kein neuer UI-Read wird
  ohne serverseitige Prüfung freigegeben. Die sofortige Erkennung einer
  unbeobachteten DB-Änderung benötigt einen gesonderten Revalidierungsvertrag.
  Dieser Schnitt führt kein Polling oder Realtime-Abonnement ein.
- **Nicht erneut live abgenommen:** produktive DB/RLS, lokale Windows-Runtime,
  veröffentlichte Lovable-App, Backup/Restore, Bulk und weitere P5-Verträge.
- `currentState.testsPassing` im Manifest bleibt historische Baseline-Evidenz,
  wie `qualityGateEvidenceScope` festlegt; ein lokal roter Kandidatenlauf ersetzt
  diese Baseline nicht. Aktuelle Zahlen stehen in diesem Bericht und den
  zugehörigen Actions-Runs.

## Nächster verbindlicher Schritt

Den korrigierten Head als Draft-PR vorlegen und dessen eigene CI/Security prüfen.
Commit-Signaturen sind vor der Integration gesondert zu belegen; der übernommene
Head `b6db2f31` ist laut GitHub **unsigned**. Erfolgreiche main-Runs ersetzen
keinen Kandidatennachweis. BSF-03E bleibt in Arbeit; P5 und Integrationsfreigabe
bleiben offen.
