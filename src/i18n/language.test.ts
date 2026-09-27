import { describe, expect, it } from "vitest";
import { detectSystemLanguage, resolveLanguage } from "./language";

describe("language resolution", () => {
  it("supports the four configured locales and regional variants", () => {
    expect(resolveLanguage("pt-BR")).toBe("pt-BR");
    expect(resolveLanguage("pt-PT")).toBe("pt-BR");
    expect(resolveLanguage("es-MX")).toBe("es");
    expect(resolveLanguage("de-DE")).toBe("de");
  });

  it("falls back to American English for unsupported system languages", () => {
    expect(resolveLanguage("fr-FR")).toBe("en-US");
    expect(detectSystemLanguage(["fr-FR", "en-GB"])).toBe("en-US");
    expect(detectSystemLanguage([])).toBe("en-US");
  });
});
