# Managementübersicht — Engineer Console

Stand: 2026-07-01 · Dashboard-Version: 1.18.3 · Handbuch-Version: 1.5.0

Diese Übersicht richtet sich an nicht-technische Entscheider. Sie fasst
Zielbild, Sicherheitsarchitektur, Betriebsmodell, Rollen, Datenaustausch,
Roadmap sowie Risiken und Gegenmaßnahmen kompakt zusammen. **Keine
Konfigurationswerte, Passwörter, Tokens oder Verbindungszeichenfolgen** sind
Teil dieses Dokuments.

## 1. Zielbild
Die Engineer Console ist ein **lokal betreibbares Dashboard** zur Planung
und Auswertung von Engineering-Leistungen. Eine **optionale** Anbindung an
Azure (SQL / Table Storage) ermöglicht Konsolidierung mehrerer Standorte —
ohne diese Anbindung bleibt das System vollständig nutzbar.

## 2. Sicherheitsarchitektur
- Least-Privilege-Prinzip in allen Modulen (Frontend, Backend, CI).
- Keine Klartext-Secrets im Code oder in Logs; Ausgaben werden maskiert.
- Rollenbasierte Zugriffskontrolle (RBAC) für UI und API.
- Security-Scan (`security-check` + gitleaks) in der CI-Pipeline blockiert
  kritische Funde vor dem Merge.
- Fehlerantworten sind generisch; Stacktraces verlassen den Server nicht.

## 3. ENV-Validierung
Beim Start prüft `config/secretManager` alle erforderlichen
Umgebungsvariablen zentral. Fehler werden aggregiert und mit klarer
Ursachenangabe gemeldet. Betreiber sehen sofort, welche Werte fehlen — noch
bevor die Anwendung Anfragen entgegennimmt.

## 4. Kein Production-Start ohne notwendige ENV-Variablen
Im Modus `production` ist die Validierung **fail-fast**: Fehlt eine Pflicht-
Variable, startet die Anwendung nicht. Dadurch werden Konfigurationsfehler
vor der Inbetriebnahme sichtbar und ein Betrieb mit unvollständiger
Sicherheitskonfiguration wird verhindert.

## 5. DEV-Betrieb ohne Azure-ENV
Im Modus `development` sind Azure-Zugriffe **grundsätzlich blockiert**
(`assertAzureAllowed`). Entwickler und Tester können ohne Cloud-Zugang
arbeiten; versehentliche Datenübertragung in produktive Systeme ist
technisch ausgeschlossen.

## 6. Kein automatischer Sync
Es gibt **keinen** zeitgesteuerten Hintergrund-Sync mit Azure. Jeder
Datenaustausch wird bewusst durch einen berechtigten Benutzer ausgelöst und
protokolliert. Damit bleibt die Kontrolle über den Datenfluss bei den
Fachbereichen.

## 7. Lokaler Betrieb bleibt führend
Die lokale Datenhaltung ist die Quelle der Wahrheit. Azure dient
ausschließlich als **Spiegel** für Konsolidierung und Reporting. Fällt Azure
aus, arbeitet das Dashboard uneingeschränkt weiter.

## 8. Rollenmodell
Sieben klar getrennte Rollen (u. a. System-Administrator, Projekt-Manager,
Engineer, Leser). Berechtigungen sind in einer zentralen Matrix definiert
und werden UI-seitig via `PermissionGate`, serverseitig durch Middleware
erzwungen. Ein Admin-Lockout ist durch eine Prüfroutine ausgeschlossen; ein
CI-Check verhindert Regressionen.

## 9. Export-/Import-Prozess
- **Export**: JSON gemäß versioniertem Schema; sensible Felder werden vor
  Ausgabe entfernt. Zusätzlich PDF, CSV, ZIP-Backup und Azure-Table-Format.
- **Import**: Vierstufiger Wizard mit Vorschau, Diff-Ansicht und
  Feldzuordnung. Vor jedem Import wird automatisch ein Sicherheits-Snapshot
  angelegt (Rollback jederzeit möglich).

## 10. Konflikthandling
Beim Import werden Dubletten über Levenshtein-Distanz erkannt. Konflikte
werden pro Datensatz mit den Optionen „übernehmen", „ignorieren" oder
„zusammenführen" entschieden. Alle Entscheidungen werden im Importprotokoll
festgehalten.

## 11. Systemstatus
Der Dialog „Systemstatus" bietet sieben Sektionen: **Application, GitHub,
Lovable, Azure, Security, Data, Documentation** — plus Backend-Health. Er
zeigt nur secret-freie Metadaten (z. B. Vorhandensein einer Variable, nicht
deren Wert) und ist damit auch für Auditoren geeignet.

## 12. Roadmap: Entra ID
Vorgesehen ist die Anbindung an **Microsoft Entra ID** für Single-Sign-On
und zentrale Rollenzuweisung. Vorbereitet sind Rollen-Resolver und
Mapping-Struktur (`config/roleResolver`, `config/entraMapping.example.json`).

## 13. Roadmap: Azure Key Vault
`config/keyVault.mjs` liegt als Fassade vor. Sobald aktiviert, bezieht der
`secretManager` Secrets direkt aus dem Key Vault — ohne Änderung am
aufrufenden Code. Damit entfallen lokal gespeicherte Secrets in
Produktivumgebungen vollständig.

## 14. Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
| --- | --- |
| Fehlkonfiguration bei Inbetriebnahme | Fail-Fast ENV-Validierung im Prod-Start |
| Secret-Leck über Logs oder Fehler | Maskierung im secretManager, generische Fehlerantworten, CI-Scan |
| Ungewollte Datenübertragung in Prod | DEV-Modus blockiert Azure-Zugriffe technisch |
| Datenverlust beim Import | Automatischer Snapshot + Rollback + Importprotokoll |
| Privilegieneskalation | RBAC-Matrix, Admin-Lockout-Schutz, CI-Konsistenzcheck |
| Azure-Ausfall | Lokaler Betrieb bleibt führend, keine Hintergrund-Syncs |
| Abhängigkeit von externen Paketen | `bun update`, `dependency_scan`, Security-Scan in CI |
| Veraltete Dokumentation | `docs:check` in CI, CHANGELOG als Single Source of Truth |

## Verweise
- Detailliertes Handbuch: In-App unter „Hilfe → Benutzerhandbuch" oder
  Kapitel-Direktsprung über das Hilfe-Menü.
- Änderungshistorie: `CHANGELOG.md` im Projekt-Root.
- Sicherheits-/Betriebs-Details: Handbuch-Kapitel „Sicherheitsprinzipien",
  „ENV-Validierung", „Systemstatus", „Was bei Azure-Ausfall passiert".
