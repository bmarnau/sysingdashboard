# ADR-0040: Kontinuierlicher Testziel-Abgleich und Testökonomie

- **Status**: Accepted (Owner, 2026-10-31)
- **Datum**: 2026-10-31
- **Ergänzt**: ADR-0009, ADR-0017, ADR-0018, ADR-0029 (CI-, Test- und Release-Governance)
- **Herkunft**: Übernommen aus `backup/codex-2026-10-31` (dort ADR-0036, Stand 2026-10-19). Die Regel `AQGS-TCA-01` steht seit der Annahme in `docs/PROJECT-GOVERNANCE.md` (Abschnitt 8a).

## Kontext

Das Projekt besitzt bewusst breite Test-, Sicherheits-, Dokumentations- und
Release-Gates. Mit wachsendem Umfang entsteht jedoch das Risiko, dass Tests
ohne aktuellen Schutzzweck weiterlaufen, dieselben Fehler mehrfach prüfen oder
neue fachliche Ziele ohne passende Evidenz hinzukommen. Eine reine
Testanzahl oder ein pauschales Vollsuite-Gebot beantwortet nicht, ob die
notwendigen Ziele wirksam und verhältnismäßig abgesichert sind.

Gleichzeitig wäre ein unkontrolliertes Kürzen von Tests unvereinbar mit den
Sicherheits-, Datenintegritäts-, RBAC/RLS- und Golden-Gate-Verträgen.

## Entscheidung

Die Projekt-Governance erhält die verbindliche Regel `AQGS-TCA-01`:

1. Jedes Arbeitspaket gleicht seine Ziele, Risiken und Abnahmekriterien gegen
   die erforderlichen Tests und Gates ab.
2. Der Abgleich wird bei Planung, Ziel-/Risikoänderung, vor Abnahme oder
   Release Candidate sowie bei auffälliger Laufzeit, Instabilität oder
   Toolchain-Blockade wiederholt.
3. Die Evidenz wird als kompakte Matrix `Ziel/Risiko → Testebene → konkreter
Test/Gate → Ergebnis → Entscheidung` im Arbeits- oder Abschlussbericht
   geführt.
4. Tests dürfen nur mit dokumentierter gleichwertiger Ersatzabdeckung
   konsolidiert oder mit begründetem Wegfall eines Schutzzwecks ausgesondert
   werden.
5. Schutztests für Security, RBAC/RLS, Datenintegrität, Providergrenzen und
   Golden Results werden nicht zur Laufzeitverkürzung herabgestuft.
6. Der schnelle, änderungsnahe Testpfad und die vollständigen Exact-Head-
   Gates bleiben getrennte Evidenzstufen.
7. Ein nicht verfügbares Gate bleibt `BLOCKED`; es darf nicht durch eine
   Erfolgsmeldung oder nicht gleichwertige Evidenz zu `PASS` umgedeutet werden.

## Alternativen

- **Tests pauschal reduzieren:** verworfen, weil dies Risiken und
  Abnahmekriterien nicht sichtbar macht.
- **Immer alle Tests lokal ausführen:** verworfen, weil es schnelle
  Fehlererkennung und vollständige Freigabeevidenz unnötig vermischt.
- **Nur Laufzeitgrenzen vorgeben:** verworfen, weil Laufzeit ohne Bezug zum
  Schutzzweck keine sichere Optimierung steuert.
- **Unveränderten Bestand ohne Review beibehalten:** verworfen, weil Drift,
  Doppelungen und unbelegte Lücken so unsichtbar bleiben.

## Konsequenzen

- Positiv: Jeder Testbestand bleibt auf aktuelle Ziele und Risiken bezogen.
- Positiv: Doppelungen können kontrolliert konsolidiert werden, ohne Schutz
  still zu verlieren.
- Positiv: Toolchain- oder Evidenzlücken werden als `BLOCKED` sichtbar statt
  mit Testumfang verwechselt.
- Negativ: Jedes Arbeitspaket braucht eine kleine, gepflegte Ziel-Test-Matrix.
- Negativ: Aussonderungsentscheidungen erfordern nachvollziehbare Review- und
  Dokumentationsarbeit.
- Entscheidung 2026-10-31: Ob die Regel Mehraufwand pro Arbeitspaket
  verursacht, wird beim ersten Paket nach Annahme mitgemessen.

## Annahme

Der Owner hat den ADR am 2026-10-31 mit "ADR-0040 annehmen" angenommen. Die Regel gilt ab dem nächsten Arbeitspaket; der Mehraufwand wird dort mitgemessen.

## Trust-Boundary / Security-Note

Die Regel ändert keine Sicherheitsgrenzen. Sie verbietet ausdrücklich, Tests
für Security, RBAC/RLS, Datenintegrität, Providertrennung oder Golden Results
allein aus Laufzeitgründen zu entfernen oder abzuschwächen.
