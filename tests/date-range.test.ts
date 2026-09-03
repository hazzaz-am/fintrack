import { describe, expect, it } from "vitest";
import { resolveDateRange, monthsInRange } from "@/lib/date-range";

describe("resolveDateRange", () => {
  it("resolves a day to its start and end", () => {
    const reference = new Date("2026-09-15T14:30:00");
    const { from, to } = resolveDateRange("day", undefined, reference);
    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(8);
    expect(from.getDate()).toBe(15);
    expect(from.getHours()).toBe(0);
    expect(to.getHours()).toBe(23);
  });

  it("resolves a month to its calendar boundaries", () => {
    const reference = new Date("2026-09-15");
    const { from, to } = resolveDateRange("month", undefined, reference);
    expect(from.getDate()).toBe(1);
    expect(from.getMonth()).toBe(8); // September (0-indexed)
    expect(to.getMonth()).toBe(8);
    expect(to.getDate()).toBe(30);
  });

  it("resolves a year to its calendar boundaries, including across a year edge", () => {
    const reference = new Date("2026-12-31");
    const { from, to } = resolveDateRange("year", undefined, reference);
    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(0);
    expect(from.getDate()).toBe(1);
    expect(to.getMonth()).toBe(11);
    expect(to.getDate()).toBe(31);
  });

  it("resolves a month correctly at a year boundary", () => {
    const reference = new Date("2026-01-15");
    const { from, to } = resolveDateRange("month", undefined, reference);
    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(0);
    expect(to.getMonth()).toBe(0);
    expect(to.getDate()).toBe(31);
  });

  it("resolves a custom range from the given from/to", () => {
    const { from, to } = resolveDateRange("custom", {
      from: new Date("2026-03-05"),
      to: new Date("2026-03-20"),
    });
    expect(from.getDate()).toBe(5);
    expect(from.getMonth()).toBe(2);
    expect(to.getDate()).toBe(20);
    expect(to.getMonth()).toBe(2);
  });

  it("requires both from and to for a custom range", () => {
    expect(() => resolveDateRange("custom", { from: new Date("2026-03-05") })).toThrow();
    expect(() => resolveDateRange("custom")).toThrow();
  });
});

describe("monthsInRange", () => {
  it("returns one month for a range within a single month", () => {
    const range = resolveDateRange("month", undefined, new Date("2026-09-15"));
    expect(monthsInRange(range)).toHaveLength(1);
  });

  it("returns every month spanned by a multi-month range, including a year edge", () => {
    const range = {
      from: new Date("2025-11-01"),
      to: new Date("2026-02-28"),
    };
    const months = monthsInRange(range);
    expect(months).toHaveLength(4);
    expect(months[0].getFullYear()).toBe(2025);
    expect(months[0].getMonth()).toBe(10);
    expect(months[3].getFullYear()).toBe(2026);
    expect(months[3].getMonth()).toBe(1);
  });
});
