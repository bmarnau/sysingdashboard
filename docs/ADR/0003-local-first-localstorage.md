# ADR-0003: Local-First mit localStorage

- **Status**: Accepted
- **Datum**: 2026-07-08

## Kontext
Systemingenieure arbeiten oft in Umgebungen mit unzuverlässiger Konnektivität
(Kundenstandorte, VPN-Wechsel). Erfassungslatenz (Ticket, Zeit) muss auch
offline sub-100 ms bleiben. Persistenz-Vorgänge dürfen den UI-Thread nicht
blockieren.

## Entscheidung
- **Primärer Store**: `localStorage`, user-scoped über `userScopedKey(base)`
  (`base::<userId>`) — verhindert Datenlecks zwischen Konten am selben Gerät.
- **Schreiben**: debounced 300 ms via `src/lib/store/dashboard-persistence.ts`.
- **Cross-Tab-Sync**: `window.addEventListener('storage', …)`.
- **Azure-Sync**: **manuell** über Button (`POST /api/sync`), nicht kontinuierlich.
- **IndexedDB**: nur für den Logger-Ringbuffer (`src/lib/logger.indexeddb.ts`),
  **nicht** für Domänendaten.

## Alternativen
- **IndexedDB für alles** — asynchron, Muster inkompatibel mit synchronem
  `useSyncExternalStore`-Snapshot, viel Boilerplate für < 2 MB Daten.
- **Server-first + optimistic UI** — braucht funktionierende Netzwerkverbindung
  und einen realen Backend-DB-Layer; letzterer existiert (noch) nicht.
- **CRDT-Bibliothek (Yjs, Automerge)** — Overkill für Single-User pro Tab;
  wird ggf. für Multi-Tab-Live-Sync später relevant.

## Konsequenzen
Positiv:
- Offline sofort funktionsfähig, PWA-ready.
- Kein Backend-DB nötig für MVP.
- Simple Backups: „ZIP über allen keys".

Negativ:
- **5–10 MB Quota** je Origin — genügt aktuell, aber Export-Historien wachsen.
  `saveUsers()` kapselt `try/catch` gegen Quota-Fehler, aber es gibt kein
  automatisches Housekeeping.
- Keine Server-Wahrheit — Multi-Device-Sync erfordert manuellen Azure-Export
  auf Gerät A, Import auf Gerät B.
- localStorage ist synchron und blockierend — Debouncing ist Pflicht (siehe
  `dashboard-persistence.ts`), sonst UI-Jank bei jeder Änderung.
