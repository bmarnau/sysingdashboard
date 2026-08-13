# Sprint 09C – Nachprüfung F-11: Mehrbenutzer-Demoszenario

Ziel: den Demo-Datensatz so auf mehrere fiktive Personen verteilen, dass die persönlichen, Projekt- und Managementsichten fachlich abnehmbar werden. Keine neuen Produktfunktionen, keine Änderung an RBAC oder RLS.

## Architekturbefund (verifiziert, vor jeder Änderung)

- **AVKK-Sichtbarkeit ist rechte-, nicht zeilenbasiert.** Die Leseregeln auf `avkk_subject` und `avkk_responsibility` prüfen ausschließlich `avkk.view`. Jede Person mit Leserecht sieht damit alle AVKK-Sachverhalte; die Sicht „Mein AVKK" entsteht durch Filterung auf die eigene Verantwortung in der Oberfläche. Das ist eine bewusste Fachentscheidung (Sachverhalt, nicht Personendaten), aber es heißt: **die Trennung Scope A ≠ Scope B ist eine Darstellungs-, keine Datenbanktrennung.** Das wird als Befund ehrlich dokumentiert, nicht durch neue Policies „passend gemacht".
- **Schreibrechte sind zeilenbezogen**: `avkk_can_write` beschränkt Systemingenieure auf selbst angelegte oder ihnen zugeordnete Sachverhalte. Hier ist echte Mehrbenutzer-Prüfung möglich und aussagekräftig.
- **Projekte, Arbeitspakete und Tätigkeiten liegen lokal im Browser** (kein Serverbestand, keine RLS). `assignee` und `lead` sind Freitext („Demo Technik 1"). Eine echte Datentrennung zwischen Systemingenieur A und B existiert dort systembedingt nicht — ebenfalls Befund, nicht Fehler.
- **Verantwortliche Person** ist `avkk_responsibility.person_id` → `profiles.id` → echtes Anmeldekonto. Der heutige Seed setzt für alle Fälle den einspielenden Benutzer ein — genau deshalb wirkt heute „nur ein Benutzer mit Daten".
- Profile können vom Client nicht angelegt werden; sie entstehen ausschließlich bei einer Registrierung. **Echte Demo-Konten sind daher erforderlich** und werden vom Nutzer selbst über die Anmeldeseite angelegt.

## Was gebaut wird

### 1. Personenschicht im bestehenden Demo-Datensatz

Der Systemhaus-Datensatz wird **erweitert, nicht ersetzt**. Vier fiktive Personen als feste Rollen des Datensatzes:

| Persona | Rolle | Fachlicher Scope |
| --- | --- | --- |
| Demo · Alex Systemtechnik | Systemingenieur | Netzwerk-/Infrastrukturpakete, eigene Tätigkeiten, Fälle unkritisch / gefährdet / überfällig |
| Demo · Sam Infrastruktur | Systemingenieur | Microsoft-365- und Backup-Pakete, Voraussetzungslücke, kritischer Fall |
| Demo · Petra Projektleitung | Projektmanager | verantwortet die Demo-Projekte, sieht Aggregation über A und B |
| Demo · Georg Geschäftsführung | Geschäftsführer | Portfolio über alle Demo-Projekte |

Die bestehenden Fälle A–H werden diesen Personen zugeordnet (keine neuen Fälle), Arbeitspakete und Tätigkeiten erhalten passende `assignee`-/`lead`-Werte aus derselben Namensliste.

### 2. Zuordnung im Demo-Dialog

„Demo-Datensatz…" erhält eine Zuordnungsliste: je Persona wird ein vorhandenes Anmeldekonto gewählt (Auswahl aus den Profilen, die dem angemeldeten Administrator sichtbar sind). Nicht zugeordnete Personas fallen wie bisher auf den einspielenden Benutzer zurück. Der Seed schreibt `person_id` entsprechend — weiterhin über den regulären Dienst unter RLS, ohne Service-Key, ohne Auth-Manipulation. Die Warnung „nicht auf Produktivinstanzen" bleibt sichtbar und wird um den Mehrbenutzerhinweis ergänzt.

### 3. Abnahmereferenz

Erwartete Werte je Persona (Fälle gesamt, gefährdet, kritisch, überfällig, Voraussetzungslücke, Projekte, Arbeitspakete) als Konstante neben den bestehenden `DEMO_AVKK_EXPECTATIONS`. Terminabhängige Werte werden über `setDemoBaseDate()` reproduzierbar geprüft, nicht als feste Datumswerte hinterlegt.

### 4. Automatisierte Absicherung

Neue Tests: Persona-Zuordnung vollständig und eindeutig, Scope A ≠ Scope B, Projektmanager-Scope enthält A- und B-Fälle, Managementaggregation über alle Projekte, Idempotenz des Seeds, ausschließlich `demo-`-Kennungen betroffen, keine personenbezogene Rangfolge in der Führungssicht, Role Preview ohne Rechteänderung. Die Tests ergänzen die manuelle Abnahme, sie ersetzen sie nicht.

### 5. Dokumentation

- **`docs/DEMO-USERS.md`** (neu): die vier Personas, benötigte Rolle, fachlicher Scope, Zweck und der Einrichtungsweg (Selbstregistrierung auf der Preview-Instanz, Rollenvergabe durch den Systemadministrator, anschließend Zuordnung im Demo-Dialog). Keine Kennwörter, keine Secrets, keine fremden Domains.
- **`docs/ROLE-ACCEPTANCE-09C.md`**: konkrete Testmatrix (Test · Konto/Rolle · Erwartung · Ergebnis · Status) für Mein AVKK A und B, Management Projektmanager und Geschäftsführung, Role Preview, Negativtest — jeweils mit den Referenzwerten aus Punkt 3.
- **`docs/DEMO-DATA.md`**, **`docs/MVP-ACCEPTANCE-REPORT.md`** (F-11-Status, neue Scope-Befunde), **`docs/PROJECT-STATUS.yaml`**, **`CHANGELOG.md`**, Entwicklungstagebuch. SYSING-001 bleibt unverändert, da sich keine Produktaussage ändert.

## Ausdrücklich nicht Teil dieses Sprints

Keine neuen Boards, Rollen, Reportarten oder Integrationen. Keine Änderung an RLS-Policies, auch nicht, um Demo-Sichten „schöner" zu machen. Aufgedeckte Scope-Probleme werden Befunde.

## Abschluss F-11

Ich kann die Sitzungen nicht selbst wechseln. Der Abschluss ist deshalb zweistufig: die Umgebung wird vollständig vorbereitet und alles automatisiert Prüfbare belegt; F-11 bleibt **MANUAL VERIFICATION REQUIRED**, bis Sie die vier Anmeldungen durchgeführt und die Matrix abgezeichnet haben. Sie erhalten dafür eine kurze Checkliste (Konten anlegen, Rollen setzen, Demo-Daten zuordnen, sechs Sichten prüfen).

## Qualitätsnachweise

Tests, Typecheck, ESLint, Prettier, Build, `docs:check`, `project-status:check`, `rbac:check`, `no-console`. Security-Gates zusätzlich, falls doch ein sicherheitsrelevanter Pfad berührt wird.
