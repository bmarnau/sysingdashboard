# Automatische Abmeldung bei Inaktivität (Session-Timeout)

Stand: Sprint 05C (v1.45.0)

## Ziel

Unbeaufsichtigte Arbeitsplätze dürfen keinen dauerhaften Zugriff auf das
Dashboard erlauben. Nach einer konfigurierbaren Zeit ohne Nutzeraktivität wird
die Sitzung beendet und der Benutzer auf die Anmeldeseite geleitet.

## Architektur

| Modul | Verantwortung |
| --- | --- |
| `src/lib/session/idle-config.ts` | Wirksamer Timeout (Systemeinstellung → Env → Standard), Validierung, Speichern |
| `src/lib/session/idle-monitor.ts` | Providerneutrale Inaktivitätslogik (absolute Zeitstempel, Aktivitätsereignisse, Warn-/Ablauf-Callbacks) |
| `src/lib/session/idle-channel.ts` | Tab-Synchronisierung (`BroadcastChannel`, Fallback `storage`), Persistenz des letzten Aktivitätszeitpunkts |
| `src/lib/session/logout-service.ts` | Auth-Adapter: einziger Abmeldepfad (Supabase `signOut` + lokale Bereinigung + Redirect) |
| `src/hooks/useIdleLogout.ts` | Verdrahtung; nur unter `_authenticated/` gemountet |
| `src/components/session/IdleWarningDialog.tsx` | Warnung mit Countdown |
| `src/components/session/SessionSettingsDialog.tsx` | Administrative Einstellung |

Nur `logout-service.ts` kennt Supabase. Ein Providerwechsel (z. B. Entra ID)
betrifft ausschließlich diese Datei.

## Konfiguration

Priorität: `app_settings.idle_timeout_minutes` → `VITE_IDLE_TIMEOUT_MINUTES` → 5 Minuten.

- Erlaubt: ganze Zahlen von 1 bis 480.
- Ungültig (leer, Text, 0, negativ, Dezimal, > 480) → nächster Wert der Kette,
  protokolliert über den zentralen Logger (ohne Rohwert).
- Eine Deaktivierung ist nicht vorgesehen.
- Vorwarnung: 60 Sekunden, höchstens jedoch 20 % des Timeouts (min. 10 s).

Schreibzugriff auf die Systemeinstellung: Berechtigung `users.manage`; erzwungen
durch die Datenbank-Regel `app_settings_admin_update/insert`
(`has_permission(auth.uid(), 'users.manage')`). Jede Änderung erzeugt einen
Eintrag im `audit_log`.

## Aktivitätserkennung

`mousemove`, `mousedown`, `pointerdown`, `keydown`, `wheel`, `scroll`,
`touchstart` (Throttle 2 s für den Broadcast). Sichtbarwerden des Tabs gilt
**nicht** als Aktivität, löst aber eine sofortige Neubewertung aus.

Der Monitor rechnet mit absoluten Zeitstempeln und prüft im Sekundentakt.
Dadurch werden Standby, gedrosselte Hintergrund-Timer und Systemzeitsprünge
korrekt erkannt (sofortige Abmeldung nach Wiederaufnahme).

Nach einem Reload wird der letzte Aktivitätszeitpunkt aus dem lokalen Speicher
gelesen — mit Plausibilitätsprüfung (nicht in der Zukunft, nicht älter als das
Doppelte des Timeouts), sonst gilt er als unbrauchbar.

## Mehrere Tabs

Über den Kanal werden ausschließlich `{ type: "activity", timestamp }` und
`{ type: "logout", timestamp }` verteilt — keine Tokens, keine Benutzerdaten.
Aktivität in einem Tab hält alle Tabs angemeldet; der Ablauf meldet alle Tabs ab.
Ein Guard im Logout-Service verhindert Mehrfachabmeldungen.

## Bekannte Grenze

Die Durchsetzung ist clientseitig. Ein bereits entwendetes Zugriffstoken bleibt
bis zu seinem serverseitigen Ablauf gültig; die Maßnahme schützt gegen
unbeaufsichtigte Arbeitsplätze, nicht gegen Token-Diebstahl. Eine echte
serverseitige Idle-Durchsetzung (kürzere Token-Laufzeit plus serverseitige
Aktivitätsprüfung) ist ein eigener Arbeitsschritt (siehe ADR-0020).
