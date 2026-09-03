import { describe, expect, it } from "vitest";
import { resolveCurrentSlot } from "@/lib/recurring-schedule";

// Local-date formatting, not toISOString() — the dev/test environment runs
// ahead of UTC (Asia/Dhaka), so a UTC-based string would show the wrong
// calendar day for a local midnight (same pitfall date-range.test.ts avoids
// by asserting on getFullYear()/getMonth()/getDate() instead of toISOString()).
function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

describe("resolveCurrentSlot", () => {
  it("returns the start date itself as the slot when today is the start date", () => {
    const start = new Date("2026-09-01");
    const slot = resolveCurrentSlot(start, "MONTHLY", undefined, new Date("2026-09-01"));
    expect(slot).not.toBeNull();
    expect(ymd(slot!.slotStart)).toBe(ymd(new Date("2026-09-01")));
    expect(ymd(slot!.slotEnd)).toBe(ymd(new Date("2026-10-01")));
  });

  it("returns null when the template has not started yet", () => {
    const slot = resolveCurrentSlot(new Date("2026-12-01"), "MONTHLY", undefined, new Date("2026-09-01"));
    expect(slot).toBeNull();
  });

  it("advances a weekly slot correctly", () => {
    const start = new Date("2026-09-01");
    const slot = resolveCurrentSlot(start, "WEEKLY", undefined, new Date("2026-09-20"));
    expect(slot).not.toBeNull();
    // 2026-09-01 to 2026-09-20 is 19 days -> 2 full weeks elapsed -> slot starts 2026-09-15
    expect(ymd(slot!.slotStart)).toBe(ymd(new Date("2026-09-15")));
    expect(ymd(slot!.slotEnd)).toBe(ymd(new Date("2026-09-22")));
  });

  it("advances a quarterly slot correctly", () => {
    const start = new Date("2026-01-01");
    const slot = resolveCurrentSlot(start, "QUARTERLY", undefined, new Date("2026-09-01"));
    expect(slot).not.toBeNull();
    expect(ymd(slot!.slotStart)).toBe(ymd(new Date("2026-07-01")));
    expect(ymd(slot!.slotEnd)).toBe(ymd(new Date("2026-10-01")));
  });

  it("advances a yearly slot correctly across multiple years", () => {
    const start = new Date("2024-09-01");
    const slot = resolveCurrentSlot(start, "YEARLY", undefined, new Date("2026-09-15"));
    expect(slot).not.toBeNull();
    expect(ymd(slot!.slotStart)).toBe(ymd(new Date("2026-09-01")));
    expect(ymd(slot!.slotEnd)).toBe(ymd(new Date("2027-09-01")));
  });

  it("handles a month-end start date without rolling into the wrong slot", () => {
    // Jan 31 -> Feb has no 31st (date-fns rolls to Mar 3); this must not make
    // the slot appear "not yet due" when today is only in mid-February.
    const start = new Date("2026-01-31");
    const slot = resolveCurrentSlot(start, "MONTHLY", undefined, new Date("2026-02-15"));
    expect(slot).not.toBeNull();
    expect(ymd(slot!.slotStart)).toBe(ymd(new Date("2026-01-31")));
  });

  it("returns null once the slot would start after the end date", () => {
    const start = new Date("2026-01-01");
    const endDate = new Date("2026-03-01");
    const slot = resolveCurrentSlot(start, "MONTHLY", endDate, new Date("2026-04-01"));
    expect(slot).toBeNull();
  });

  it("still returns a slot on the end date itself", () => {
    const start = new Date("2026-01-01");
    const endDate = new Date("2026-03-01");
    const slot = resolveCurrentSlot(start, "MONTHLY", endDate, new Date("2026-03-01"));
    expect(slot).not.toBeNull();
    expect(ymd(slot!.slotStart)).toBe(ymd(new Date("2026-03-01")));
  });
});
