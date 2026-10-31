# SDD ledger — plan: docs/superpowers/plans/2026-10-17-bsf-07-golden-gate-delivery.md

Setup: isolated branch `codex/gg-l2-01-management-cockpit-domain` at `fd8aa71`; manual SDD workspace because the provided Bash script cannot execute in this Windows session.
Pre-flight: Task 1 produces `ManagementCockpit`; Task 2 consumes that exact DTO; Task 3 consumes the P2 DTO. No interface conflict found.
Task 1: Ruling: retain the already completed TDD RED→GREEN seed cases and expand them before P2 — preserves P0 contract without introducing a second service — cost if wrong: P1 may need one compatibility rename.
Task 1: RED→GREEN — duplicate Project Controlling rows now deduplicate by scope, project, work package, reason, and correlation; focused Bun test 11/11 PASS.
