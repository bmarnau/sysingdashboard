# Statushinweis zum bisherigen Post-MVP-Plan

Stand: 2026-08-21  
Status: verbindliche Einordnung der Planungsreihenfolge

## Hintergrund

`docs/POST-MVP-PLAN.md` vom 2026-08-10 enthält weiterhin fachlich verwertbare Planungen für Microsoft Graph / Exchange Online, insbesondere die vorgesehenen Sprints 10A–10D.

Die spätere und verbindliche `docs/ROADMAP-MVP-BSF.md` vom 2026-08-17 hat jedoch die Reihenfolge geändert:

1. MVP vollständig abschließen und baselinefähig freigeben.
2. BSF — Betriebsfähiges Systemhaus-Fundament vollständig herstellen.
3. Integrations-Readiness-Gate durchführen.
4. Erst danach Microsoft Graph / Exchange Online beginnen.

Damit ist der alte Post-MVP-Plan **nicht fachlich verworfen**, aber hinsichtlich seines unmittelbaren Startzeitpunkts **überholt**.

## Verbindliche Interpretation

- Microsoft Graph ist **kein Bestandteil des BSF**.
- Die Inhalte aus `POST-MVP-PLAN.md` bleiben als Post-BSF-Integrationsplanung erhalten.
- Die dort beschriebenen Sprints 10A–10D dürfen erst nach `BSF = 100 % / BASELINE` und bestandenem Integrations-Readiness-Gate aktiviert werden.
- Neue Entwicklungsprompts müssen `ROADMAP-MVP-BSF.md` als führende Reihenfolge verwenden.

## Source of Truth

Für die Reihenfolge gilt:

`ROADMAP-MVP-BSF.md` → führend  
`POST-MVP-PLAN.md` → fachliche Detailplanung für die spätere Integrationsphase

Dieser Statushinweis verhindert, dass ein zukünftiger Chat oder Agent den älteren Plan fälschlich als unmittelbar nächsten Sprint interpretiert.
