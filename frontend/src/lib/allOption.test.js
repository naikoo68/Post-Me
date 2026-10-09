import { describe, it, expect } from "vitest";
import { shuffleQuestion } from "./shuffleOptions.js";

describe("per-attempt option shuffle keeps 'All …' as option D", () => {
  it("over many seeds", () => {
    const q = { _id: "q1", options: ["All of the above", "Delhi", "Mumbai", "Pune"], correct: 0 };
    for (let seed = 1; seed < 60; seed++) {
      const s = shuffleQuestion(q, seed * 7919);
      expect(s.options[3]).toBe("All of the above");
      expect(s.correct).toBe(3);
      expect(s._order[3]).toBe(0); // maps back to the stored index for scoring
    }
  });
});
