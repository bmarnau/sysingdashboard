# Sysing Dashboard — Backlog

Stand: 2026-08-17
Status: lebendes, chat-unabhängiges Backlog

GitHub ist die maßgebliche Quelle. Neue Backlog-Einträge werden hier fachlich beschrieben und bei Einplanung in Sprint-/Meilensteinplanung mit `docs/ROADMAP-MVP-BSF.md` synchronisiert.

## BSF — Produktdomain & Auth-Mail-Infrastruktur

**Status:** geplant  
**Meilenstein:** BSF — Betriebsfähiges Systemhaus-Fundament  
**Priorität:** hoch / früh im BSF  
**Aufwand:** ca. 1–2 Lovable-Prompts plus DNS-/df.eu-Konfiguration

### Ausgangslage

Die Domain `sysingdashboard.de` ist bei df.eu registriert. Der aktuelle plattformverwaltete Standard-Mailversand der Lovable-Cloud-Auth-Instanz ist für Registrierung, Bestätigung und Passwort-Recovery an externe Empfänger nicht zuverlässig genug. Das wurde bei der F-11-Abnahme praktisch sichtbar.

### Ziel

`sysingdashboard.de` wird die offizielle Produkt- und Betriebsdomain des Sysing Dashboards. Domain-, App- und Mailstruktur sollen so aufgebaut werden, dass sie langfristig unabhängig von einer einzelnen Hosting-/Entwicklungsplattform nutzbar bleiben.

### Geplante Domainstruktur

- `sysingdashboard.de` / `www.sysingdashboard.de`: Produkt-/Informationsseite oder kontrollierte Weiterleitung
- `app.sysingdashboard.de`: bevorzugte produktive Adresse der Dashboard-Anwendung
- `board.sysingdashboard.de`: derzeit nicht erforderlich; nur bei späterem fachlichem Bedarf
- Domainnamen und Basis-URLs dürfen nicht hart im Code verdrahtet werden, sondern müssen konfigurierbar bleiben

### Geplante Funktionsadressen

- `noreply@sysingdashboard.de`: automatisierte Auth-/Systemmails
- `info@sysingdashboard.de`: allgemeiner Kontakt
- `support@sysingdashboard.de`: Support
- `security@sysingdashboard.de`: Sicherheitshinweise / Responsible Disclosure
- `admin@sysingdashboard.de`: technische Administration

Kontakt- oder Supportformulare sind zunächst **nicht** Bestandteil dieses Arbeitspakets. Die Adressen können anfangs als normale Postfächer/Aliase betrieben werden.

### Auth- und Mailbetrieb

Der BSF-Schritt soll einen kontrollierten und belastbaren Mailpfad für mindestens folgende Auth-Funktionen bereitstellen:

- Registrierung
- E-Mail-Bestätigung
- Passwort-Recovery
- sicherheitsrelevante Systemhinweise, soweit später erforderlich

Dazu gehören mindestens:

- eigener/geeigneter Mailanbieter bzw. SMTP-/Transaktionsmailpfad
- Absendername `SysIng Dashboard`
- Absenderadresse bevorzugt `noreply@sysingdashboard.de`
- Reply-To nach fachlicher Entscheidung
- SPF
- DKIM
- DMARC, zunächst mit Monitoring
- Ende-zu-Ende-Zustelltests an externe Empfänger
- nachvollziehbare Fehler-/Zustellprotokollierung ohne sensible Inhalte
- keine SMTP-Zugangsdaten, Tokens oder sonstigen Secrets im Code oder in der Dokumentation

### Architektur- und Sicherheitsanforderungen

- Mail- und Domainkonfiguration über Environment-/Provider-Konfiguration
- keine harte Lovable-Cloud-Abhängigkeit
- Fachlogik von Mailprovider/SMTP-Implementierung trennen
- Auth-, Daten- und Mailprovider austauschbar halten
- Secrets ausschließlich in geeigneter Server-/Secret-Verwaltung
- keine Zugangsdaten im Client
- Rate-Limits und Missbrauchsschutz berücksichtigen
- Datenschutz und Logging-Grenzen dokumentieren
- Docker-/On-Premises-Betrieb langfristig berücksichtigen

### Bezug zu bestehenden Findings

- F-15: fehlender externer Betreiberzugang zur plattformverwalteten Backend-Instanz bleibt ein eigener Portabilitäts-/Betreiberhoheitsbefund
- F-16/F-17 bzw. administrative Passwort-Wiederherstellung sind kurzfristige MVP-/Betriebsmechanismen und ersetzen den produktiven Mail-/Recovery-Kanal nicht
- der eigene Domain-/Mailpfad ist die langfristig belastbare Lösung für Auth-Mailzustellung

### TDF / SYSING-001

SYSING-001 soll die Domain-, Auth-Mail- und Betriebsarchitektur ab dem Zeitpunkt ihrer Planung und Umsetzung entsprechend dem tatsächlichen Reifegrad darstellen. Geplante und umgesetzte Zustände müssen klar getrennt bleiben.

### Abnahmekriterien

Das Arbeitspaket ist abgeschlossen, wenn mindestens:

1. `sysingdashboard.de` als offizielle Produktdomain dokumentiert ist,
2. `app.sysingdashboard.de` als bevorzugte App-Adresse technisch vorbereitet bzw. produktiv nutzbar ist,
3. URLs konfigurierbar und nicht hart codiert sind,
4. der Auth-Mailversand über einen kontrollierten Absender der eigenen Domain erfolgt,
5. SPF, DKIM und DMARC geprüft sind,
6. Registrierung, E-Mail-Bestätigung und Passwort-Recovery Ende-zu-Ende erfolgreich getestet wurden,
7. Zustellfehler nachvollziehbar bewertet werden können,
8. keine Secrets im Client/Repository/Dokumentation vorhanden sind,
9. Handbuch, Betriebsdokumentation, technischer Prüfbericht und SYSING-001 synchronisiert sind.

### Nicht Bestandteil dieses Arbeitspakets

- Microsoft Graph
- Exchange-Online-Mailauswertung
- automatischer E-Mail-Ausgang aus Fachprozessen
- Kontakt-/Supportformulare
- KI-/Agentenfunktionen

Diese Themen bleiben gemäß Roadmap nachgelagert.
