# F-11 — Datensparsames Personenverzeichnis für AVKK-Delegation

Stand: 2026-08-22
Status: technische Korrektur vor manueller Delegationsabnahme

## Befund

Projektmanager und Teamleiter besitzen fachlich beabsichtigt die Berechtigung `avkk.responsibility.assign`. Die bisherigen RLS-Regeln von `profiles` und `user_roles` geben Nicht-Administratoren jedoch im Wesentlichen nur den eigenen Profil-/Rollendatensatz frei. Dadurch entstanden zwei gekoppelte Fehler:

1. bereits zugeordnete fremde Verantwortliche konnten als technische UUID erscheinen;
2. im Delegationsfeld war für Georg Marnau nur Georg Marnau auswählbar.

Eine pauschale Freigabe vollständiger Profile wäre für diesen Zweck unverhältnismäßig und würde Benutzerverwaltung und AVKK-Fachfunktion vermischen.

## Korrektur

Die Datenbankfunktion `public.avkk_people_directory()` stellt einen minimalen AVKK-Personenvertrag bereit.

Ausgegeben werden ausschließlich:

- Benutzer-ID,
- fachlicher Anzeigename,
- primäre Rolle,
- Kontostatus.

Nicht ausgegeben werden insbesondere E-Mail, Telefon, MFA-Status, Profilbild oder weitere Profildaten.

### Sichtregeln

- Aufruf nur für authentifizierte Benutzer mit `avkk.view`.
- Benutzer mit `avkk.responsibility.assign` erhalten aktive Personen als mögliche Delegationsempfänger.
- Benutzer mit reinem `avkk.view` erhalten nur Personen, die bereits in einer aktiven AVKK-Verantwortung vorkommen; damit können vorhandene Verantwortungen als Name statt UUID angezeigt werden.
- `PUBLIC` und `anon` besitzen kein Execute-Recht.

## Namensstandard

Für Personenanzeigen gilt im AVKK-Kontext verbindlich:

1. `Vorname Nachname`, sofern Profildaten dies ermöglichen;
2. gepflegter Anzeigename als Fallback;
3. `Unbenannt` nur als letzter serverseitiger Fallback.

Eine technische UUID wird in der UI niemals als Personenname ausgegeben. Kann ein Name trotz Verzeichnisvertrag nicht aufgelöst werden, erscheint neutral `Person nicht verfügbar`.

## Fehlerverhalten

Kann das Personenverzeichnis nicht geladen werden, bleibt vorhandene Verantwortung lesbar. Neue Verantwortung wird in diesem Zustand nicht zugeordnet. Die Oberfläche zeigt den Integrationsfehler ausdrücklich an, statt eine unvollständige Personenliste als vollständig erscheinen zu lassen.

## Datenschutz- und Architekturbegründung

Der Vertrag folgt Least Privilege und trennt fachliche AVKK-Namensauflösung von der administrativen Benutzerverwaltung. Die bestehende `profiles`-RLS wird nicht für Teamlead/Projektmanager aufgeweicht. Die provider-spezifische Supabase-Funktion ist hinter einem kleinen Client-Service gekapselt und kann bei einem späteren Providerwechsel durch einen äquivalenten Directory-Provider ersetzt werden.

## Automatisierte Abnahmekriterien

- Bekannte Verantwortliche werden mit vollständigem Namen dargestellt.
- Unbekannte technische IDs werden nicht als Personenname gerendert.
- Der Client nutzt ausschließlich `avkk_people_directory` für diesen Zusatzvertrag.
- Fehler der RPC werden weitergegeben; es gibt keinen stillen Rückfall auf vollständige Profile.
- Bestehende RBAC-/RLS-Regeln für Benutzerverwaltung bleiben unverändert.

## Noch manuell zu prüfen

Nach Anwendung der Migration in der Lovable-Supabase-Umgebung:

1. Georg Marnau sieht beim bestehenden Verantwortlichen einen vollständigen Namen statt UUID.
2. Georg Marnau sieht weitere aktive Demo-Mitarbeiter im Personenfeld.
3. Delegation als Stellvertretung kann gespeichert und nach Hard Reload erneut angezeigt werden.
4. Petra Marnau besteht denselben Delegationsnachweis als `projectmanager`.
5. Engineer/Viewer erhalten dadurch keine Benutzerverwaltung und keine zusätzlichen AVKK-Schreibrechte.

F-11 bleibt bis zu diesen manuellen Nachweisen `MANUAL VERIFICATION REQUIRED`.

## Angewendeter Datenbankstand

Stand 2026-08-22 wurde die Repository-Migration
`supabase/migrations/20260822103100_f11_avkk_people_directory.sql` unverändert auf die mit
diesem Projekt verbundene Backend-Datenbank angewendet.

Technisch geprüft:

- `public.avkk_people_directory()` ist vorhanden (`SECURITY DEFINER`, `STABLE`, `search_path = ''`).
- `PUBLIC` und `anon` besitzen kein `EXECUTE`; ausführbar sind ausschließlich `authenticated`
  (sowie `postgres`/`service_role` als Eigentümer- bzw. Wartungsrollen).
- Die Policies von `profiles` und `user_roles` sind unverändert (Self- bzw. Admin-Sicht).

Der Linterhinweis „Signed-In Users Can Execute SECURITY DEFINER Function" ist für diesen
Vertrag beabsichtigt: die Funktion prüft die Berechtigungen `avkk.view` bzw.
`avkk.responsibility.assign` intern und gibt nur Name, Rolle und Status aus.

F-11 bleibt `MANUAL VERIFICATION REQUIRED` (Abnahme Georg Marnau, danach Petra Marnau).
