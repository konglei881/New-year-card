import { describe, expect, it } from "vitest";
import { countChars, normalizeInputText, validateBlessing } from "@/utils/validation";

describe("normalizeInputText", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeInputText("  你好   新年  ")).toBe("你好 新年");
  });
});

describe("countChars", () => {
  it("counts by Unicode code points", () => {
    expect(countChars("春节快乐")).toBe(4);
    expect(countChars("a1好")).toBe(3);
  });
});

describe("validateBlessing", () => {
  it("rejects empty", () => {
    const r = validateBlessing("   ");
    expect(r.ok).toBe(false);
  });

  it("rejects only symbols", () => {
    const r = validateBlessing("!!!");
    expect(r.ok).toBe(false);
  });

  it("enforces 4-12 chars", () => {
    expect(validateBlessing("新年").ok).toBe(false);
    expect(validateBlessing("新春快乐").ok).toBe(true);
    expect(validateBlessing("新春快乐万事如意财源广进大吉").ok).toBe(false);
  });
});
