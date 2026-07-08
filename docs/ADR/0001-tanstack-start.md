# ADR-0001: TanStack Start v1 als Framework

- **Status**: Accepted
- **Datum**: 2026-07-08

## Kontext
Das Dashboard braucht SSR (SEO für öffentliche Handbuch-Kapitel, schnelle
First-Paint) sowie typsicheres File-based Routing. Zielplattform ist ein
Cloudflare Worker mit `nodejs_compat` — keine dauerhafte Node-Instanz.

## Entscheidung
TanStack Start v1 mit React 19 und Vite 7. File-based Routing unter
`src/routes/`, Auto-Generierung von `src/routeTree.gen.ts` durch das Vite-Plugin,
Worker-Entry `src/server.ts`.

## Alternativen
- **Next.js 15 (App Router)** — größeres Ökosystem, aber `next/*`-Runtime-Annahmen
  schlecht mit Cloudflare Worker vereinbar (Streaming/Middleware, RSC-Overhead).
- **Remix / React Router 7** — Framework-Wechsel läuft; instabile Migration.
- **Astro + Islands** — nicht für app-artige Dashboards mit lokalem State geeignet.
- **SPA (Vite + React Router)** — kein SSR, schlechtere Ladezeiten, keine
  server-side head-Metadaten.

## Konsequenzen
Positiv:
- Typsicheres Routing (`<Link to>` schlägt bei fehlender Route den Build fehl).
- SSR ohne separaten Node-Prozess (Worker-Deployment).
- `createServerFn` statt Boilerplate-API-Routes für interne RPCs.

Negativ:
- Ökosystem kleiner als Next.js — weniger Beispiel-Code, weniger Blogposts.
- Strikte Bundling-Regeln (kein `ssr.external`, keine Native-Addons).
- Pre-1.0-Muster (vinxi, `entry-client/server`) sind **verboten**, werden aber
  im Netz noch verbreitet dokumentiert — Onboarding-Falle.
