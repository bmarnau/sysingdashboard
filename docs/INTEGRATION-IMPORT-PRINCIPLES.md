# Sysing Dashboard — Providerneutrale Importprinzipien

Stand: 2026-08-17
Status: verbindliche BSF-/Integrationsleitlinie

## 1. Zweck

Diese Leitlinie definiert den gemeinsamen fachlichen Rahmen für externe Datenquellen des Sysing Dashboards. Sie gilt insbesondere für SharePoint, Microsoft Graph, JSON-/CSV-Importe, MCP-Adapter und spätere weitere Provider.

Externe Systeme müssen nicht das vollständige Sysing-Fachmodell liefern. Der Importvertrag muss partielle Quelldaten ausdrücklich zulassen und fehlende Informationen transparent behandeln.

## 2. Grundsatz

**Fehlende Quelldaten dürfen niemals durch erfundene fachliche Werte ersetzt werden. Ein Import darf partiell sein. Identität, Herkunft und bekannte Beziehungen müssen belastbar sein. Fehlende Informationen werden explizit als unbekannt bzw. nicht geliefert behandelt und können später durch andere Quellen, Benutzer oder Sysing-Fachlogik ergänzt werden. AVKK wird ausschließlich innerhalb Sysing geführt und ist keine Pflichtanforderung an externe Datenquellen.**

## 3. Kanonische Verarbeitungskette

Für externe Daten gilt als Zielarchitektur:

```text
SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK
```

Bedeutung:

- **SOURCE** — Quelldaten unverfälscht lesen.
- **NORMALIZE** — providerabhängige Felder auf ein kanonisches Importmodell abbilden.
- **VALIDATE** — Schema, Typen, IDs, Beziehungen und Grenzen prüfen.
- **MATCH** — vorhandene Sysing-Objekte anhand stabiler IDs/Provenienz zuordnen.
- **ENRICH** — fehlende Informationen aus zulässigen weiteren Quellen oder Sysing-Fachlogik ergänzen.
- **REVIEW** — unsichere Zuordnungen oder KI-/Regelvorschläge durch einen Menschen bestätigen lassen.
- **PERSIST** — erst nach erfolgreicher Prüfung in den fachlichen Bestand übernehmen.
- **AVKK** — AVKK wird anschließend innerhalb Sysing separat geführt bzw. ergänzt.

## 4. Drei Feldklassen

### 4.1 Identitäts- und Beziehungsfelder

Beispiele:

- stabile Quell-ID
- Kunden-ID
- Projekt-ID
- Arbeitspaket-ID
- Tätigkeits-ID
- bekannte Parent-/Child-Beziehungen

Diese Felder sind für Matching, Idempotenz und spätere Synchronisation besonders wichtig. Fehlt eine belastbare Identität, kann der Import je nach Objekt BLOCKED sein oder eine manuelle Zuordnung erfordern.

### 4.2 Optionale Quelldaten

Beispiele:

- Beschreibung
- Budget
- Tags
- Stundensatz
- Aufwandsschätzung
- Team
- Abrechnungsinformationen

Fehlen diese Werte in der Quelle, werden sie nicht erfunden. `0`, `false` und leere Strings dürfen nicht als Ersatz für „unbekannt“ verwendet werden, wenn sie fachlich eine konkrete Aussage darstellen.

### 4.3 Sysing-eigene Anreicherung

Beispiele:

- AVKK-Verantwortung
- Kompetenzbewertung
- Konsequenzbewertung
- Kundenverantwortung
- Managementbewertung
- interne Führungs-/Entscheidungsinformationen

Diese Informationen müssen externe Quellen nicht liefern. Sie entstehen im Sysing-Fachmodell bzw. durch kontrollierte Sysing-Prozesse.

## 5. Partial Entity

Das kanonische Importmodell muss partiell befüllbare Objekte unterstützen.

Beispiel eines zulässigen Arbeitspaket-Kandidaten:

```json
{
  "id": "sp-workpackage-2241",
  "title": "Firewall Migration",
  "projectId": "sp-project-815",
  "status": "open"
}
```

Nicht vorhandene optionale Felder sind kein technischer Fehler.

Sysing soll perspektivisch zwischen mindestens folgenden Informationszuständen unterscheiden können:

- vorhanden,
- nicht geliefert,
- unbekannt,
- nicht anwendbar.

Die konkrete Repräsentation (`null`, fehlendes Feld, Metadatenzustand) wird im BSF-Schema festgelegt.

## 6. Keine künstlichen Defaults

Nicht zulässig ist beispielsweise:

```json
{
  "hourlyRate": 0,
  "billable": false,
  "billingStatus": "open"
}
```

wenn diese Werte lediglich gesetzt wurden, weil die Quelle sie nicht besitzt.

`0`, `false` und `open` sind fachliche Aussagen und keine neutralen Platzhalter.

Wenn das bestehende Schema Felder zwingend verlangt, die eine Quelle fachlich nicht liefern kann, ist das Schema zu überprüfen und gegebenenfalls versioniert weiterzuentwickeln. Der Provider-Adapter darf keine erfundenen Werte erzeugen, um eine Validierung künstlich zu bestehen.

## 7. AVKK bei externen Daten

SharePoint, Microsoft Graph und andere externe Quellen müssen keine AVKK-Daten liefern.

Für ein importiertes Objekt sind mindestens folgende Zustände denkbar:

1. **Kein AVKK-Subject vorhanden** — operatives Objekt ist vorhanden, AVKK wurde noch nicht aufgenommen.
2. **AVKK begonnen** — AVKK-Subject vorhanden, Bewertung noch unvollständig.
3. **AVKK vollständig bewertet** — Verantwortung, Kompetenz und Konsequenz sind gemäß aktuellem Fachmodell bewertet.

„AVKK fehlt“ ist damit kein Importfehler, sondern ein zulässiger fachlicher Zustand.

## 8. Providertrennung

Es soll keine separate Fachlogik pro Provider entstehen.

Zielbild:

```text
SharePoint ─┐
Graph ──────┤
CSV ────────┤→ Provider Adapter → Canonical Import Model → Sysing Domain
JSON ───────┤
MCP/Agent ──┘
```

Der Provider-Adapter beantwortet nur die Frage:

> Welche Informationen kennt die Quelle zuverlässig?

Sysing beantwortet anschließend:

> Welche fachliche Bedeutung haben diese Informationen im Sysing-Modell?

Damit bleiben Fachlogik, Datenzugriff und Providerimplementierung getrennt.

## 9. SharePoint

Der SharePoint ist perspektivisch Quelle für reale Systemhausdaten wie:

- Kunden,
- Projekte,
- Arbeitspakete,
- Tätigkeiten,
- Personenreferenzen,
- Status-/Termin-/weitere operative Felder, soweit tatsächlich vorhanden.

AVKK existiert dort nicht und wird nicht vom SharePoint-MCP erzeugt.

Der aktuell entstehende SharePoint-MCP-/API-PoC ist deshalb ein Read-/Normalisierungsadapter und darf als BSF-Vorarbeit genutzt werden, ohne den laufenden MVP-Abschluss zu blockieren.

## 10. Microsoft Graph

Für Microsoft Graph gilt dieselbe Leitlinie.

Beispiel: Eine E-Mail kann nur liefern:

```json
{
  "messageId": "...",
  "sender": "kunde@example.de",
  "subject": "Firewall funktioniert seit heute Morgen nicht",
  "receivedAt": "...",
  "body": "..."
}
```

Diese Quelle kennt möglicherweise weder Kunden-ID noch Projekt, Arbeitspaket, Tätigkeit, Verantwortlichen oder AVKK.

Die spätere Verarbeitung soll deshalb stufenweise erfolgen:

```text
Graph-E-Mail
  ↓
Rohquelle
  ↓
Zuordnung / Matching
  ↓
Kunde? Projekt? Arbeitspaket?
  ↓
TaskCandidate
  ↓
Human Review
  ↓
Sysing-Aufgabe/Tätigkeit
  ↓
AVKK bei Bedarf
```

Unsichere Zuordnungen dürfen nicht als sicher persistiert werden. READ/PROPOSE und Human-in-the-loop bleiben die bevorzugte erste Integrationsstufe.

## 11. Datenqualität und Provenienz

Für importierte Objekte soll später nachvollziehbar sein:

- Quelle/Provider,
- stabile Quell-ID,
- Zeitpunkt der Beobachtung,
- Änderungs-/Freshness-Zeitpunkt soweit verfügbar,
- Mapping-/Match-Status,
- fehlende bzw. nicht gelieferte relevante Felder,
- AVKK-Status.

Eine mögliche spätere technische Metastruktur kann beispielsweise Informationen wie `source`, `sourceId`, `observedAt`, `completeness` oder `missingFields` enthalten. Die konkrete Struktur ist vor Umsetzung versioniert im kanonischen Schema festzulegen.

Eine technische Informationsvollständigkeit darf nicht als Compliance-, Qualitäts-, Mitarbeiter- oder Reifegradscore fehlinterpretiert werden.

## 12. Idempotenz und Konflikte

Wiederholte Imports derselben Quellobjekte dürfen keine Dubletten erzeugen.

Voraussetzungen:

- stabile Quell-IDs,
- Provider-/Source-Provenienz,
- reproduzierbares Matching,
- dokumentierte Update-/Konfliktregeln,
- keine stillen Überschreibungen fachlich relevanter Sysing-Anreicherungen.

Importierte Quelldaten und Sysing-eigene Anreicherungen müssen so getrennt werden, dass ein erneuter Quellimport AVKK oder andere Sysing-Fachinformationen nicht unkontrolliert überschreibt.

## 13. Schema-Folgerung für BSF

Das bestehende JSON-Schema 1.1.0 ist für Export/Import bereits eine wichtige Grundlage. Für providerneutrale API-Integrationen muss im BSF geprüft werden, ob heutige Pflichtfelder zu streng sind.

Insbesondere bei `Activity` sind derzeit Felder wie `duration`, `hourlyRate`, `billable` und `billingStatus` Pflichtfelder. Falls SharePoint oder andere Quellen diese Werte nicht besitzen, dürfen keine künstlichen Defaults eingeführt werden. Stattdessen ist eine versionierte Schemaweiterentwicklung bzw. ein separates Canonical Import Model zu entscheiden.

## 14. TDF-Anforderungen

Diese Integrationsleitlinie ist in SYSING-001 und den technischen Nachweisen insbesondere unter folgenden TDF-Aspekten zu berücksichtigen:

- `TDF-SCHEMA` — versionierte Pflicht-/Optionalfelder und Migration,
- `TDF-IMPORT` — Idempotenz, Diff, Staging, Konflikte und Rollback,
- `TDF-SOURCE` — Source of Truth, Provenienz, Freshness und Konfliktregeln,
- `TDF-TRACE` — Rückverfolgbarkeit fachlicher Aussagen,
- `TDF-AI` — unsichere/KI-gestützte Kandidaten und Human Review,
- `TDF-SEC` — Secrets, Berechtigungen und Providergrenzen,
- `TDF-RESILIENCE` — Verhalten bei fehlenden, veralteten oder nicht erreichbaren Quelldaten.

## 15. Meilensteinzuordnung

### MVP

Keine Änderung des laufenden MVP-Scopes. Petra/F-11 und die formale MVP-Baseline bleiben der operative nächste Pfad.

### BSF

Diese Leitlinie wird verbindlicher Bestandteil von:

- Kundenmodell,
- zentraler Datenhaltung / Providerarchitektur,
- SharePoint-Zielbild und Importvertrag,
- Datenqualitäts-/Provenienzmodell,
- Canonical Import Model / Schemaweiterentwicklung.

SharePoint-Beispieldaten dürfen bereits vor BSF analysiert werden und dienen als reale Mapping-Vorarbeit.

### Post-BSF / Integration

Microsoft Graph und weitere Provider müssen dieselben Importprinzipien verwenden. Vor produktiver Graph-Integration bleibt das Integrations-Readiness-Gate bestehen.
