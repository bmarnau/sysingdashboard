/**
 * AVKK-Abnahmefälle des Systemhaus-Demo-Datensatzes (Sprint 09B).
 *
 * Zweck: reproduzierbare, fachlich zusammenhängende AVKK-Zustände für die
 * MVP-Abnahme. Jeder Fall ist an ein bestehendes `demo-`-Objekt gekoppelt und
 * bildet genau eine Abnahmesituation ab (A–G).
 *
 * Fachliche Regel: Die Fälle beschreiben ausschließlich Sachverhalte
 * (Aufgabe, Verantwortung, Kompetenz, Konsequenz) — keine Personenbewertung
 * und keine Rangfolge (ADR-0027).
 */

import type { AvkkSubjectType } from "@/lib/avkk/types";

export type DemoAvkkCaseId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export interface DemoCompetenceRating {
  dimensionKey: string;
  ratingKey: "available" | "partial" | "missing";
  supportNeeded?: boolean;
  note?: string;
}

export interface DemoConsequence {
  areaKey: string;
  severityKey: "low" | "medium" | "high" | "critical";
  scheduleImpactKey: "none" | "minor" | "delay" | "major_delay" | "project_stop";
  description: string;
}

export interface DemoAvkkCase {
  caseId: DemoAvkkCaseId;
  /** Kurzbeschreibung der Abnahmesituation (erscheint im Abnahmebericht). */
  situation: string;
  subjectType: AvkkSubjectType;
  /** Verweist auf ein `demo-`-Objekt aus dem lokalen Datensatz. */
  subjectId: string;
  title: string;
  /** Verantwortungszuordnung; `null` bedeutet bewusst nicht zugeordnet. */
  responsibility: {
    roleKey: "owner" | "deputy";
    typeKeys: string[];
    note: string;
  } | null;
  competences: DemoCompetenceRating[];
  consequences: DemoConsequence[];
  /** Erwartetes Ergebnis des Frühindikators bei Standardschwelle (1 / 2). */
  expectedAtRisk: boolean;
}

export const DEMO_AVKK_VERSION = "1.0.0";

export const demoAvkkCases: DemoAvkkCase[] = [
  {
    caseId: "A",
    situation: "Unkritisch — Aufgabe klar, Verantwortung geklärt, Voraussetzungen vorhanden",
    subjectType: "workpackage",
    subjectId: "demo-wp-netz-planung",
    title: "Netzplanung und Segmentierung",
    responsibility: {
      roleKey: "owner",
      typeKeys: ["result", "documentation"],
      note: "Ergebnisverantwortung und Dokumentation eindeutig zugeordnet.",
    },
    competences: [
      { dimensionKey: "knowledge", ratingKey: "available" },
      { dimensionKey: "experience", ratingKey: "available" },
      { dimensionKey: "time", ratingKey: "available" },
      { dimensionKey: "authorization", ratingKey: "available" },
    ],
    consequences: [
      {
        areaKey: "own_work",
        severityKey: "low",
        scheduleImpactKey: "none",
        description: "Abgeschlossene Planung, keine erkennbare Auswirkung auf den Terminplan.",
      },
    ],
    expectedAtRisk: false,
  },
  {
    caseId: "B",
    situation: "Gefährdet — zugeordnet, zwei Voraussetzungen nur teilweise vorhanden",
    subjectType: "workpackage",
    subjectId: "demo-wp-m365-migration",
    title: "Datenmigration Fachbereiche",
    responsibility: {
      roleKey: "owner",
      typeKeys: ["result", "deadline"],
      note: "Ergebnis- und Terminverantwortung zugeordnet, Umfang noch in Abstimmung.",
    },
    competences: [
      { dimensionKey: "knowledge", ratingKey: "available" },
      { dimensionKey: "time", ratingKey: "partial", note: "Parallelprojekt bindet Kapazität." },
      { dimensionKey: "support", ratingKey: "partial", supportNeeded: true },
    ],
    consequences: [
      {
        areaKey: "project",
        severityKey: "medium",
        scheduleImpactKey: "minor",
        description: "Migrationsfenster kann sich verschieben, Termin noch nicht überschritten.",
      },
    ],
    expectedAtRisk: true,
  },
  {
    caseId: "C",
    situation: "Kritisch — wichtige Voraussetzung fehlt, hohe Konsequenz, Handlungsbedarf",
    subjectType: "workpackage",
    subjectId: "demo-wp-netz-rollout",
    title: "Switch-Rollout Gebäude B",
    responsibility: {
      roleKey: "owner",
      typeKeys: ["result", "deadline", "quality"],
      note: "Rollout-Verantwortung liegt vollständig beim Aufgabenverantwortlichen.",
    },
    competences: [
      { dimensionKey: "knowledge", ratingKey: "available" },
      {
        dimensionKey: "material",
        ratingKey: "missing",
        supportNeeded: true,
        note: "Ersatzgeräte nicht lieferbar.",
      },
      { dimensionKey: "time", ratingKey: "partial" },
    ],
    consequences: [
      {
        areaKey: "customer",
        severityKey: "high",
        scheduleImpactKey: "delay",
        description: "Ohne Hardware verschiebt sich die Inbetriebnahme im Gebäude B.",
      },
    ],
    expectedAtRisk: true,
  },
  {
    caseId: "D",
    situation: "Überfällig — Termin überschritten, nachvollziehbare Konsequenz",
    subjectType: "workpackage",
    subjectId: "demo-wp-backup-test",
    title: "Wiederherstellungstest Fachverfahren",
    responsibility: {
      roleKey: "owner",
      typeKeys: ["result", "deadline"],
      note: "Nachweispflicht gegenüber dem Kunden; Termin bereits überschritten.",
    },
    competences: [
      { dimensionKey: "knowledge", ratingKey: "available" },
      {
        dimensionKey: "tools",
        ratingKey: "missing",
        supportNeeded: true,
        note: "Testumgebung nicht verfügbar.",
      },
      { dimensionKey: "time", ratingKey: "missing" },
    ],
    consequences: [
      {
        areaKey: "compliance",
        severityKey: "critical",
        scheduleImpactKey: "major_delay",
        description: "Geforderter Wiederherstellungsnachweis fehlt über den vereinbarten Termin.",
      },
    ],
    expectedAtRisk: true,
  },
  {
    caseId: "E",
    situation: "Kompetenz-/Voraussetzungslücke über mehrere Dimensionen",
    subjectType: "workpackage",
    subjectId: "demo-wp-m365-berechtigungen",
    title: "Berechtigungskonzept und Freigaben",
    responsibility: {
      roleKey: "deputy",
      typeKeys: ["coordination", "communication"],
      note: "Nur Stellvertretung zugeordnet, Freigabeverantwortung ungeklärt.",
    },
    competences: [
      {
        dimensionKey: "authorization",
        ratingKey: "missing",
        supportNeeded: true,
        note: "Freigabe der Fachbereichsleitung fehlt.",
      },
      {
        dimensionKey: "knowledge",
        ratingKey: "partial",
        note: "Zielrollenmodell nur teilweise bekannt.",
      },
      { dimensionKey: "support", ratingKey: "partial", supportNeeded: true },
      { dimensionKey: "budget", ratingKey: "available" },
    ],
    consequences: [
      {
        areaKey: "information_security",
        severityKey: "high",
        scheduleImpactKey: "delay",
        description: "Ohne Freigabe können Berechtigungen nicht verbindlich gesetzt werden.",
      },
    ],
    expectedAtRisk: true,
  },
  {
    caseId: "F",
    situation: "Hohe Kundenkonsequenz auf Projektebene",
    subjectType: "project",
    subjectId: "demo-prj-m365",
    title: "Microsoft-365-Migration",
    responsibility: {
      roleKey: "owner",
      typeKeys: ["result", "communication", "approval"],
      note: "Projektverantwortung inklusive Kundenkommunikation.",
    },
    competences: [
      { dimensionKey: "knowledge", ratingKey: "available" },
      { dimensionKey: "time", ratingKey: "partial" },
      { dimensionKey: "support", ratingKey: "partial" },
    ],
    consequences: [
      {
        areaKey: "customer",
        severityKey: "critical",
        scheduleImpactKey: "delay",
        description: "Verzögerte Migration betrifft den laufenden Geschäftsbetrieb des Kunden.",
      },
      {
        areaKey: "sla",
        severityKey: "high",
        scheduleImpactKey: "minor",
        description: "Vereinbarte Reaktionszeiten stehen unter Druck.",
      },
    ],
    expectedAtRisk: true,
  },
  {
    caseId: "G",
    situation: "Hohe Projekt-/Terminwirkung auf Projektebene",
    subjectType: "project",
    subjectId: "demo-prj-backup",
    title: "Backup- und Wiederanlaufkonzept",
    responsibility: {
      roleKey: "owner",
      typeKeys: ["result", "deadline", "quality"],
      note: "Gesamtverantwortung für den Wiederanlaufnachweis.",
    },
    competences: [
      { dimensionKey: "tools", ratingKey: "missing", supportNeeded: true },
      { dimensionKey: "time", ratingKey: "missing" },
      { dimensionKey: "knowledge", ratingKey: "available" },
    ],
    consequences: [
      {
        areaKey: "project",
        severityKey: "critical",
        scheduleImpactKey: "project_stop",
        description: "Ohne belastbaren Wiederanlauf ist die Abnahme des Projekts nicht möglich.",
      },
    ],
    expectedAtRisk: true,
  },
];

/** Erwartungswerte für die Abnahme — bewusst hier fixiert, nicht berechnet. */
export const DEMO_AVKK_EXPECTATIONS = {
  cases: demoAvkkCases.length,
  atRisk: demoAvkkCases.filter((c) => c.expectedAtRisk).length,
  notAtRisk: demoAvkkCases.filter((c) => !c.expectedAtRisk).length,
  withMissingCompetence: demoAvkkCases.filter((c) =>
    c.competences.some((k) => k.ratingKey === "missing"),
  ).length,
  withSupportNeeded: demoAvkkCases.filter((c) => c.competences.some((k) => k.supportNeeded)).length,
  criticalConsequences: demoAvkkCases.filter((c) =>
    c.consequences.some((k) => k.severityKey === "critical"),
  ).length,
  responsibilityAssigned: demoAvkkCases.filter((c) => c.responsibility !== null).length,
} as const;
