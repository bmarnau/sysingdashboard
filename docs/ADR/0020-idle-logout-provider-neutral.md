# ADR-0020: Inaktivitäts-Abmeldung providerneutral, Auth nur im Adapter

- **Status**: Accepted
- **Datum**: 2026-08-02

## Kontext

Sprint 05C fordert eine konfigurierbare automatische Abmeldung bei Inaktivität
(Standard 5 Minuten) mit tabsübergreifender Synchronisierung. Der aktuelle
Auth-Provider ist Lovable Cloud (Supabase); ein späterer Wechsel auf Entra ID
ist im Projekt bereits als Option benannt.

Zusätzlich existierte im Dashboard bisher **keine** manuelle Abmeldung — der
einzige `signOut()`-Pfad lag im Auth-Guard für inaktive Konten.

## Entscheidung

1. Die Inaktivitätslogik (`idle-monitor.ts`, `idle-channel.ts`, `idle-config.ts`)
   ist providerneutral und kennt weder Supabase noch Tokens. Sie arbeitet nur mit
   Zeitstempeln und Callbacks.
2. Der Auth-Bezug liegt ausschließlich in `logout-service.ts`
   (`performLogout`) — dem **einzigen** Abmeldepfad für manuelle und automatische
   Abmeldung.
3. Der Timeout wird serverseitig in `public.app_settings` gehalten
   (Schreibrecht via `has_permission(auth.uid(),'users.manage')`), mit
   `VITE_IDLE_TIMEOUT_MINUTES` und 5 Minuten als Fallback-Kette.
4. Der Monitor rechnet mit absoluten Zeitstempeln statt Timer-Restlaufzeiten.

## Alternativen

- **`setTimeout`-basierter Timer** — einfacher, aber blind gegenüber Standby und
  gedrosselten Hintergrund-Tabs: die Abmeldung käme zu spät.
- **Timeout nur als Umgebungsvariable** — nicht ohne Deployment änderbar; die
  Anforderung nach administrativer Einstellbarkeit wäre nicht erfüllt.
- **Timeout in localStorage pro Gerät** — vom Nutzer manipulierbar und damit
  keine Sicherheitsmaßnahme.
- **Supabase-Session-Laufzeit verkürzen** — betrifft alle Sitzungen unabhängig
  von Aktivität und erzwingt Neuanmeldungen auch bei aktiver Nutzung.

## Konsequenzen

Positiv:

- Providerwechsel betrifft eine Datei.
- Einheitliches Abmeldeverhalten, keine divergierenden Logout-Pfade.
- Administrativ steuerbar, revisionssicher protokolliert (`audit_log`).

Negativ:

- **Rein clientseitige Durchsetzung.** Ein entwendetes Token bleibt bis zu
  seinem serverseitigen Ablauf gültig.
- Zusätzliche Datenbanktabelle und ein Lesezugriff beim Laden des geschützten
  Bereichs.
- Geänderte Werte werden in laufenden fremden Sitzungen erst beim nächsten Laden
  wirksam.

## Trust-Boundary / Security-Note

Über den Tab-Kanal werden ausschließlich Zeitstempel und ein Logout-Signal
verteilt — niemals Tokens, Sitzungsinhalte oder Benutzerdaten. Ungültige
Konfigurationswerte führen niemals zu „kein Timeout", sondern immer zum
nächstniedrigeren Fallback.
