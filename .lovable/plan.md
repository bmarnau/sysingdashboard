## Ziel

Sicherstellen, dass nur **Tätigkeiten** abgerechnet werden können, Projekt- und Arbeitspaket-Zuordnungen jederzeit optional bleiben, und dass keine inkonsistenten Zustände (z. B. abgerechnete nicht-abrechenbare Tätigkeit, ungültige Referenz auf gelöschtes WP) entstehen können.

## Zentrale Regeln (Single Source of Truth)

Eine neue Hilfsfunktion `normalizeActivity()` / `validateActivity()` in `src/routes/index.tsx` (alternativ in `src/lib/dashboard-data.ts`) erzwingt folgende Invarianten — sie wird in `saveActivity` UND vor jedem `setActivities` in Aufräum-Effekten benutzt:

1. `billable === false` ⇒ `billingStatus = "nicht_abrechenbar"`, `hourlyRate = 0`.
2. `billable === true` ⇒ `billingStatus ∈ {"offen","abgerechnet"}`, `hourlyRate ≥ 0`. Wechsel von `true → false` setzt Status automatisch zurück.
3. `duration > 0`, `date` ist ein gültiges Datum (`YYYY-MM-DD`), `title` getrimmt nicht leer.
4. `workPackageId` ist entweder `null` ODER zeigt auf ein existierendes WP. Unbekannte IDs werden auf `null` normalisiert (keine Fehler-Toasts, stiller Fix beim Laden).
5. Beim Speichern wird `client` aus dem zugeordneten WP/Projekt nur **vorgeschlagen**, niemals erzwungen — leerer Client bleibt erlaubt.

Analog für `WorkPackage`: `projectId` ist `null` oder verweist auf existierendes Projekt, sonst Normalisierung auf `null`.

## UI-Validierung im `ActivityDialog`

- Speichern-Button bleibt nur aktiv, wenn alle Invarianten erfüllt sind. Konkrete Bedingungen:
  - `title.trim().length > 1`
  - `date` gesetzt und parsebar
  - `duration > 0`
  - falls `billable`: `hourlyRate ≥ 0` und `billingStatus ∈ {offen,abgerechnet}`
- Inline-Hinweise unter den betroffenen Feldern (rot, klein) statt nur stiller Disable-Zustand. Zeigt z. B. „Dauer muss > 0 sein", „Stundensatz erforderlich für abrechenbare Tätigkeiten".
- Wenn `billable` abgewählt wird, werden `hourlyRate` und `billingStatus` automatisch konsistent gesetzt (bereits teilweise vorhanden in Z. 1740 — wird erweitert um `hourlyRate = 0`).
- Wenn `billable` aktiviert wird und vorher `hourlyRate === 0` war, wird ein sanfter Default (z. B. letzter benutzter Satz oder 0 mit Hinweis) eingetragen. Reiner Hinweis, keine erzwungene Vorgabe.
- Banner-Hinweis im Dialog: „Abrechnung erfolgt ausschließlich auf Ebene der Tätigkeit." als kurzer Mikrotext oben.

## UI-Validierung in `ProjectDialog` und `WorkPackageDialog`

- Beide Dialoge dürfen keine Abrechnungs-/Stundensatz-Felder anbieten (aktuell tun sie es nicht — wird per Re-Check abgesichert).
- WorkPackageDialog: Auswahl „— Kein Projekt —" bleibt explizit erlaubt und ist der Default beim Neuanlegen. Validierung verbietet leeren Titel, sonst keine erzwungene Zuordnung.
- ProjectDialog: keine Pflicht-Verknüpfungen zu WPs/Tätigkeiten.

## Konsistenz beim Laden & nach Lösch-Operationen

- In der Mount-Phase (`hydrated`-Effekt) werden `activities` und `workPackages` einmal durch `normalize*()` geschickt, um inkonsistente persistierte Zustände aus älteren Versionen zu reparieren (z. B. `billable: false` mit `billingStatus: "offen"` → `"nicht_abrechenbar"`).
- `deleteProject` / `deleteWP` setzen Fremdschlüssel auf `null` (bereits vorhanden, Z. 277/289). Die Normalisierung läuft zusätzlich darüber, falls Race-Conditions o. ä. eintreten.

## Abrechnungs-Aggregationen härten

- `openInvoiceAmount`, `billedThisWeek`-artige Aggregationen filtern strikt nach `a.billable === true && a.billingStatus === "..."`. Verhindert, dass eine inkonsistent gespeicherte „nicht_abrechenbar"-Tätigkeit mit Stundensatz versehentlich in der Summe landet.
- Im Abrechnungs-Tab werden ausschließlich Tätigkeiten gelistet (bereits so), aber zusätzlich werden alle Werte über `billable ? duration * hourlyRate : 0` berechnet — niemals direkt aus WP/Projekt.

## Technische Umsetzung (Dateien)

- `src/routes/index.tsx`
  - Neue Helper `normalizeActivity(a, wpIds)`, `normalizeWorkPackage(w, projectIds)`.
  - Erweiterung `saveActivity` / `saveWP` mit Aufruf der Normalizer.
  - Mount-Effekt: einmaliges Normalisieren nach `loadPersisted`.
  - `ActivityDialog`: erweiterter `valid`-Check, Inline-Fehlertexte, Side-Effect bei `billable`-Toggle inkl. `hourlyRate`.
  - Banner-Mikrotext im Dialog.
- Keine Änderungen an `dashboard.json`-Daten nötig; Normalisierung repariert ggf. bestehende Einträge zur Laufzeit.

## Out of Scope

- Keine Backend-/Cloud-Anbindung.
- Keine Änderungen an Layout, Farben oder Tabs-Struktur.
- Keine neuen Pflichtfelder bei Projekten/Arbeitspaketen.
