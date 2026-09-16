import { describe, expect, it } from "vitest";
import { subjectVars } from "./subject-scope";

describe("subjectVars", () => {
  it("tanımlı ders için üç değişkeni token'a bağlar", () => {
    const vars = subjectVars("subject-math") as Record<string, string>;
    expect(vars["--s"]).toBe("var(--subject-math)");
    expect(vars["--s-soft"]).toBe(
      "var(--subject-math-soft, color-mix(in srgb, var(--subject-math) 12%, white))",
    );
    expect(vars["--s-ink"]).toBe(
      "var(--subject-math-ink, color-mix(in srgb, var(--subject-math) 80%, black))",
    );
  });

  it("yedek renk için de aynı biçimi üretir (soft/ink color-mix'ten türer)", () => {
    const vars = subjectVars("subject-r2") as Record<string, string>;
    expect(vars["--s"]).toBe("var(--subject-r2)");
    expect(vars["--s-soft"]).toContain("color-mix(in srgb, var(--subject-r2) 12%, white)");
    expect(vars["--s-ink"]).toContain("color-mix(in srgb, var(--subject-r2) 80%, black)");
  });

  it("sadece üç CSS değişkeni döndürür", () => {
    expect(Object.keys(subjectVars("subject-tr"))).toEqual(["--s", "--s-soft", "--s-ink"]);
  });
});
