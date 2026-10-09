import { describe, it, expect } from "vitest";
import { topQuestionsLine, topQuestionsTitlePart, withTopLine } from "../src/utils/topQuestionsTitle.js";

describe("full quiz video: '| Top N Questions' at the end of the title", () => {
  it("adds it (topic is already in the title)", () => {
    expect(withTopLine("JKSSB | Biology | Vitamin's | Quiz 3 (25 Questions)", topQuestionsTitlePart(25))).toBe("JKSSB | Biology | Vitamin's | Quiz 3 (25 Questions) | Top 25 Questions");
  });
  it("too long → drops '(25 Questions)', keeps everything else", () => {
    const out = withTopLine("JKSSB | Current Affairs 2026 | Current Affairs of Jan 2026 to July 2026 | Quiz 3 (25 Questions)", topQuestionsTitlePart(25));
    expect(out).toBe("JKSSB | Current Affairs 2026 | Current Affairs of Jan 2026 to July 2026 | Quiz 3 | Top 25 Questions");
    expect(out.length).toBeLessThanOrEqual(100);
  });
  it("description line still names the topic", () => {
    expect(topQuestionsLine({ topic: "Vitamin's", count: 25 })).toBe("Top 25 Questions of Vitamin's");
    expect(topQuestionsLine({ topic: "", count: 25 })).toBe("");
  });
});

import { fullQuizTitle } from "../src/utils/topQuestionsTitle.js";
describe("full quiz video title: Top N MCQs of Topic | Subject | Stream | Quiz", () => {
  it("order", () => {
    expect(fullQuizTitle({ stream: "JKSSB", subject: "Biology", topic: "Vitamin's", quiz: "Quiz 3", count: 25 })).toBe("Top 25 MCQs of Vitamin's | Biology | JKSSB | Quiz 3");
    expect(fullQuizTitle({ stream: "JKSSB", subject: "Biology", topic: "Vitamin's", quiz: "Quiz 3", part: 2, count: 25 })).toBe("Top 25 MCQs of Vitamin's | Biology | JKSSB | Quiz 3 (Part 2)");
  });
  it("long topic fits", () => {
    const t = fullQuizTitle({ stream: "JKSSB", subject: "Current Affairs 2026", topic: "Current Affairs of Jan 2026 to July 2026", quiz: "Quiz 3", count: 25 });
    expect(t).toBe("Top 25 MCQs of Current Affairs of Jan 2026 to July 2026 | Current Affairs 2026 | JKSSB | Quiz 3");
    expect(t.length).toBeLessThanOrEqual(100);
  });
});
