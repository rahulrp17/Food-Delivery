import { describe, expect, it } from "vitest";
import { formatDateCsv, formatInrCsv, toCsv } from "../utils/csv.js";

describe("csv helpers", () => {
  it("quotes cells and escapes embedded quotes", () => {
    expect(toCsv(["Name"], [['Rice "Special"']])).toBe('"Name"\r\n"Rice ""Special"""\r\n');
  });

  it("guards formula-like text but keeps plain negative numbers intact", () => {
    const csv = toCsv(["Value"], [["=1+1"], ["-3"], [42]]);
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"-3"');
    expect(csv).toContain('"42"');
  });

  it("neutralizes leading tab and carriage return values", () => {
    expect(toCsv(["A"], [["\tcmd"], ["\rpayload"]])).toContain('"\'');
  });

  it("formats paise as INR decimals", () => {
    expect(formatInrCsv(12345)).toBe("123.45");
    expect(formatInrCsv(0)).toBe("0.00");
    expect(formatInrCsv("invalid")).toBe("0.00");
  });

  it("formats dates as ISO and rejects invalid values", () => {
    expect(formatDateCsv("2026-01-02T03:04:05.000Z")).toBe("2026-01-02T03:04:05.000Z");
    expect(formatDateCsv(null)).toBe("");
    expect(formatDateCsv("not-a-date")).toBe("");
  });
});
