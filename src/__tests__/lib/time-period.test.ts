import { describe, expect, it } from "vitest";
import {
  buildChartBuckets,
  calculateMonthlyTargetHours,
  calculateUtilization,
  calculateWeeklyTargetHours,
  germanHolidays,
  getCurrentPeriod,
  getPeriodRangeByKey,
  getWorkingDaysOfMonth,
  getWorkingDaysOfWeek,
  periodKey,
  sumActivitiesInRange,
} from "@/lib/time-period";
import { makeActivity } from "../fixtures/activities";

/**
 * Fokus: reine Datums-/Sollzeit-Logik. Keine DOM-Abhängigkeit.
 */

describe("germanHolidays", () => {
  it("should_returnFixedHolidays_when_yearIs2025", () => {
    // Arrange
    const holidays = germanHolidays(2025).map((d) => d.toISOString().slice(0, 10));

    // Assert – bundesweit gültige Feiertage 2025
    expect(holidays).toContain("2025-01-01"); // Neujahr
    expect(holidays).toContain("2025-04-18"); // Karfreitag
    expect(holidays).toContain("2025-04-21"); // Ostermontag
    expect(holidays).toContain("2025-05-01"); // Tag der Arbeit
    expect(holidays).toContain("2025-05-29"); // Christi Himmelfahrt
    expect(holidays).toContain("2025-06-09"); // Pfingstmontag
    expect(holidays).toContain("2025-10-03"); // Deutsche Einheit
    expect(holidays).toContain("2025-12-25");
    expect(holidays).toContain("2025-12-26");
  });

  it("should_computeEasterMonday_when_yearIs2024", () => {
    // Arrange & Act
    const holidays = germanHolidays(2024).map((d) => d.toISOString().slice(0, 10));

    // Assert – Ostermontag 2024 = 1. April
    expect(holidays).toContain("2024-04-01");
  });
});

describe("getWorkingDaysOfMonth", () => {
  it("should_excludeWeekendsAndHolidays_when_may2025", () => {
    // Arrange
    const days = getWorkingDaysOfMonth(2025, 4); // Mai
    const isoDates = days.map((d) => d.toISOString().slice(0, 10));

    // Assert – 1.5. (Feiertag), 29.5. (Himmelfahrt) und alle Wochenenden fehlen
    expect(isoDates).not.toContain("2025-05-01");
    expect(isoDates).not.toContain("2025-05-29");
    expect(isoDates).not.toContain("2025-05-03"); // Samstag
    expect(isoDates).not.toContain("2025-05-04"); // Sonntag
    expect(days.length).toBe(20);
  });

  it("should_handleLeapYear_when_february2024", () => {
    // Arrange
    const days = getWorkingDaysOfMonth(2024, 1);

    // Assert – Feb 2024 hat 29 Tage, davon 21 Werktage (keine Feiertage)
    expect(days.length).toBe(21);
    expect(days.at(-1)?.getDate()).toBe(29);
  });

  it("should_return20_when_february2025NonLeap", () => {
    const days = getWorkingDaysOfMonth(2025, 1);
    expect(days.length).toBe(20);
    expect(days.at(-1)?.getDate()).toBe(28);
  });

  it("should_excludeChristmasDays_when_december2025", () => {
    const iso = getWorkingDaysOfMonth(2025, 11).map((d) => d.toISOString().slice(0, 10));
    expect(iso).not.toContain("2025-12-25");
    expect(iso).not.toContain("2025-12-26");
  });
});

describe("getWorkingDaysOfWeek", () => {
  it("should_returnFiveDays_when_regularWeek", () => {
    // Arrange – KW 11/2025 (10.–14.3.), keine Feiertage
    const days = getWorkingDaysOfWeek(new Date(2025, 2, 12));
    expect(days.length).toBe(5);
  });

  it("should_returnFourDays_when_weekContainsHoliday", () => {
    // Arrange – KW 18/2025 enthält Tag der Arbeit (Do, 1.5.)
    const days = getWorkingDaysOfWeek(new Date(2025, 3, 30));
    expect(days.length).toBe(4);
  });
});

describe("calculateMonthlyTargetHours", () => {
  it("should_returnConfiguredMonthlyValue_when_fullTime", () => {
    // Konfiguration: Vollzeit 168h. Summierung geht Tag für Tag —
    // Rundungsrauschen kann minimal auftreten, deshalb tolerant vergleichen.
    const hours = calculateMonthlyTargetHours(2025, 2, { monthlyTargetHours: 168 });
    expect(hours).toBeGreaterThan(167.9);
    expect(hours).toBeLessThan(168.1);
  });

  it("should_halveHours_when_workload50Percent", () => {
    const full = calculateMonthlyTargetHours(2025, 2, { monthlyTargetHours: 168 });
    const half = calculateMonthlyTargetHours(2025, 2, {
      monthlyTargetHours: 168,
      workloadPercent: 50,
    });
    expect(half).toBeCloseTo(full / 2, 1);
  });

  it("should_useCustomDailyFn_when_functionInput", () => {
    // 8h pauschal pro Tag, unabhängig von Wochenende/Feiertag
    const hours = calculateMonthlyTargetHours(2025, 0, () => 8);
    // Januar 2025 = 31 Tage * 8h = 248
    expect(hours).toBe(248);
  });
});

describe("calculateWeeklyTargetHours", () => {
  it("should_reduceHours_when_weekHasHoliday", () => {
    const normal = calculateWeeklyTargetHours(new Date(2025, 2, 12), {
      monthlyTargetHours: 168,
    });
    const withHoliday = calculateWeeklyTargetHours(new Date(2025, 3, 30), {
      monthlyTargetHours: 168,
    });
    expect(withHoliday).toBeLessThan(normal);
  });
});

describe("calculateUtilization", () => {
  it("should_returnZero_when_targetIsZero", () => {
    expect(calculateUtilization(10, 0)).toBe(0);
  });

  it("should_returnPercentage_when_targetPositive", () => {
    expect(calculateUtilization(50, 100)).toBe(50);
  });

  it("should_allowOverload_when_actualExceedsTarget", () => {
    expect(calculateUtilization(150, 100)).toBe(150);
  });
});

describe("sumActivitiesInRange & getCurrentPeriod", () => {
  it("should_sumActivitiesInsideRange_when_weekMode", () => {
    // Arrange – KW 11/2025 (Mo 10.3. – So 16.3.)
    const range = getCurrentPeriod("week", new Date(2025, 2, 12));
    const activities = [
      makeActivity({ date: "2025-03-10", duration: 4, billable: true }),
      makeActivity({ date: "2025-03-12", duration: 3, billable: false }),
      makeActivity({ date: "2025-03-20", duration: 8 }), // außerhalb
    ];

    // Act
    const { hours, billable } = sumActivitiesInRange(activities, range);

    // Assert
    expect(hours).toBe(7);
    expect(billable).toBe(4);
  });
});

describe("periodKey round-trip", () => {
  it("should_recreateRange_when_monthKeyRoundtripped", () => {
    const key = periodKey("month", new Date(2025, 4, 15));
    expect(key).toBe("2025-05");
    const range = getPeriodRangeByKey("month", key);
    expect(range?.start.toISOString().slice(0, 10)).toBe("2025-05-01");
    expect(range?.end.toISOString().slice(0, 10)).toBe("2025-06-01");
  });

  it("should_recreateRange_when_weekKeyRoundtripped", () => {
    const key = periodKey("week", new Date(2025, 2, 12));
    expect(key).toBe("2025-W11");
    const range = getPeriodRangeByKey("week", key);
    expect(range?.start.getDay()).toBe(1); // Montag
  });
});

describe("buildChartBuckets", () => {
  it("should_produceFiveWeekdayBuckets_when_weekMode", () => {
    const buckets = buildChartBuckets(
      [makeActivity({ date: "2025-03-10", duration: 2, billable: true })],
      "week",
      new Date(2025, 2, 12),
    );
    expect(buckets.length).toBe(5);
    expect(buckets[0].hours).toBe(2);
    expect(buckets[0].billable).toBe(2);
  });

  it("should_bucketByIsoWeek_when_monthMode", () => {
    const buckets = buildChartBuckets(
      [makeActivity({ date: "2025-03-03", duration: 4 })],
      "month",
      new Date(2025, 2, 15),
    );
    expect(buckets.length).toBeGreaterThan(0);
    expect(buckets.every((b) => b.label.startsWith("KW"))).toBe(true);
  });
});
