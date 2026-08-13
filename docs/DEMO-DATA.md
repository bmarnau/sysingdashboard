# Systemhaus-Demo-Datensatz

Reproduzierbarer, vollständig fiktiver Datensatz für Schulung, Vorführung und
MVP-Abnahme. Er ist ein Abnahmeartefakt nach `docs/MVP-PLAN.md` Abschnitt 3.3.

| Merkmal          | Wert                                                  |
| ---------------- | ----------------------------------------------------- |
| Datensatzversion | `DEMO_DATASET_VERSION` (aktuell 2.1.0)                |
| AVKK-Fallversion | `DEMO_AVKK_VERSION`                                   |
| Kennungspräfix   | `demo-`                                               |
| Stichtag         | aktueller Tag, überschreibbar via `setDemoBaseDate()` |
| Bedienung        | Servicemenü → „Demo-Datensatz…"                       |
| Berechtigung     | `avkk.edit`                                           |

## Inhalt

### Lokaler Bestand (`src/lib/demo-data/dataset.ts`)

- 3 Projekte: Netzwerkmodernisierung, Microsoft-365-Migration, Backup-Konzept
- zugehörige Arbeitspakete in unterschiedlichen Lagen (im Plan, gefährdet, überfällig)
- Tätigkeiten mit abrechenbaren und nicht abrechenbaren Anteilen

### AVKK-Abnahmefälle (`src/lib/demo-data/avkk-dataset.ts`)

Acht zusammenhängende Fälle A–H (Fallversion 1.1.0), die jede Bewertungslage
genau einmal abdecken: unkritisch, gefährdet, kritisch, überfällig,
Voraussetzungslücke, Wissens- und Informationslücke, hohe Kundenkonsequenz,
hohe Terminwirkung. `DEMO_AVKK_EXPECTATIONS` hält die erwartete Einstufung je
Fall fest und ist damit die Prüfliste der manuellen Abnahme. Die Abdeckung
selbst ist maschinell abgesichert
(`src/__tests__/lib/demo-data/avkk-dataset.test.ts`).

> **Verbindliche Betriebsregel — kein Demo-Seed auf Produktivinstanzen.**
> AVKK-Daten werden historisiert und nicht gelöscht (ADR-0026); die Rücknahme
> legt Demofälle nur still. Eine Instanz mit eingespielten Demodaten gilt ohne
> Neuaufbau nicht mehr als saubere Produktivinstanz. Demodaten gehören
> ausschließlich in Entwicklungs-, Schulungs- und Abnahmeinstanzen.

## Personenschicht (ab 2.1.0)

Der Datensatz verteilt seine Inhalte auf vier fiktive Personen: Demo Alex
Systemtechnik und Demo Sam Infrastruktur (Systemingenieure), Demo Petra
Projektleitung und Demo Georg Geschäftsführung. Die Anzeigenamen sind zugleich
die `assignee`- und `lead`-Werte des lokalen Bestands
(`src/lib/demo-data/personas.ts`). Die Erwartungswerte je Person werden aus dem
Datensatz abgeleitet (`persona-expectations.ts`) und sind damit nicht pflegbar
veraltet.

Im Demo-Dialog lässt sich je Person ein vorhandenes Anmeldekonto zuordnen; der
Seed schreibt dieses Konto als verantwortliche Person. Ohne Zuordnung fällt
alles auf den einspielenden Benutzer zurück. Einrichtung der Konten:
`docs/DEMO-USERS.md`.

> **Grenze:** Die AVKK-Leseregeln prüfen ausschließlich `avkk.view`. Die
> Personentrennung wirkt in der Sicht („Mein AVKK") und beim Schreiben
> (`avkk_can_write`), nicht beim Lesen. Projekte, Arbeitspakete und Tätigkeiten
> liegen lokal im Browser und kennen überhaupt keine Personentrennung.

## Stichtag

Der Stichtag ist standardmäßig der aktuelle Tag. Ein fester Stichtag würde die
Fälle mit der Zeit entwerten: „im Plan" würde irgendwann überfällig und die
Abnahmeerwartungen wären nicht mehr erfüllbar. Für reproduzierbare Testläufe
setzt `setDemoBaseDate("YYYY-MM-DD")` einen festen Stichtag; der tatsächlich
verwendete Wert steht als `baseDate` im erzeugten Datensatz und gehört in den
Abnahmebericht.

## Einspielen

Das Einspielen ist idempotent: vorhandene, offene Demo-Sachverhalte werden
übersprungen, es entstehen keine Duplikate. Der Cloud-Seed läuft über den
regulären `AvkkService` unter RLS und den Rechten des angemeldeten Benutzers —
kein Service-Role-Key, kein direkter Datenbankzugriff.

## Rücknahme und ihre Grenze

| Bereich      | Rücknahme                                      |
| ------------ | ---------------------------------------------- |
| lokal        | vollständiges Entfernen aller `demo-`-Einträge |
| AVKK (Cloud) | Stilllegen, **kein Löschen**                   |

AVKK-Tabellen erlauben grundsätzlich kein Löschen (ADR-0026), damit
Führungsentscheidungen belegbar bleiben. `retireAvkkDemoData()` setzt den
Sachverhalt auf `closed` und markiert Kompetenzbewertungen und Konsequenzen
über `superseded_at` als abgelöst. Demofälle verbleiben deshalb dauerhaft als
abgeschlossene Historie in der Datenbank.

Konsequenz für die Praxis: Eine Instanz, in der Demodaten eingespielt wurden,
ist keine saubere Produktivinstanz mehr. Vorführungen gehören in eine
Demoinstanz oder in die Entwicklungsumgebung.

## Module

| Datei                                       | Aufgabe                                   |
| ------------------------------------------- | ----------------------------------------- |
| `src/lib/demo-data/dataset.ts`              | lokaler Datensatz, Stichtagslogik         |
| `src/lib/demo-data/seed.ts`                 | Einspielen/Entfernen des lokalen Bestands |
| `src/lib/demo-data/avkk-dataset.ts`         | AVKK-Fälle A–G und Erwartungswerte        |
| `src/lib/demo-data/avkk-seed.ts`            | Cloud-Seed und Stilllegung                |
| `src/lib/demo-data/personas.ts`             | Personen und Objektzuordnung              |
| `src/lib/demo-data/persona-expectations.ts` | Abnahmereferenz je Person                 |
| `src/lib/demo-data/index.ts`                | öffentliche API                           |
| `src/components/DemoDataDialog.tsx`         | Bedienoberfläche                          |
