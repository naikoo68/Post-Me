import { describe, it, expect } from "vitest";
import { toSpeech } from "../src/config/slidePlan.js";

describe("Complex I / Photosystem I are read as numbers", () => {
  it("numerals", () => {
    expect(toSpeech("Complex I")).toBe("Complex 1");
    expect(toSpeech("Complex IV")).toBe("Complex 4");
    expect(toSpeech("Complex I and Complex II")).toBe("Complex 1 and Complex 2");
    expect(toSpeech("Photosystem I absorbs light")).toBe("Photosystem 1 absorbs light");
    expect(toSpeech("Electrons pass from Complex I to Complex III.")).toBe("Electrons pass from Complex 1 to Complex 3.");
    expect(toSpeech("Type I diabetes")).toBe("Type 1 diabetes");
  });
  it("the pronoun I is left alone", () => {
    for (const t of ["Can I go?", "I think so", "What should I do?", "Then I left.", "Rahul and I went home."]) expect(toSpeech(t)).toBe(t);
  });
});
