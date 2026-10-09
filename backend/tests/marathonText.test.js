import { describe, it, expect } from "vitest";
import { marathonTitle, marathonThumbnailLines, marathonIntro, marathonTagNames, marathonDescriptionIntro } from "../src/utils/marathonText.js";
import { introSlidePlan } from "../src/config/slidePlan.js";
import { buildYtTags } from "../src/config/youtube.js";

describe("marathon wording", () => {
  it("title with the subject: Top N MCQs of Topic | Subject | Topic Marathon Quiz", () => {
    expect(marathonTitle({ topic: "Respiration", subject: "Biology", total: 200 })).toBe("Top 200 MCQs of Respiration | Biology | Respiration Marathon Quiz");
    expect(marathonTagNames({ topic: "Respiration", subject: "Biology", total: 200 })).toEqual(["Top MCQs of Respiration", "Top 200 MCQs of Respiration", "Respiration Marathon Quiz", "Biology MCQs", "Biology Marathon Quiz"]);
    expect(marathonDescriptionIntro({ topic: "Respiration", subject: "Biology", total: 200 })).toMatch(/^Top 200 MCQs of Respiration \(Biology\) — Marathon Quiz\./);
  });
  it("title: Top N MCQs of Topic | Topic Marathon Quiz", () => {
    expect(marathonTitle({ topic: "Cash Book", total: 1000 })).toBe("Top 1000 MCQs of Cash Book | Cash Book Marathon Quiz");
  });
  it("title stays within 100 characters for a long topic", () => {
    const t = marathonTitle({ topic: "A Very Long Topic Name About Characteristics And Problems Of Developing Economies", total: 1250 });
    expect(t.length).toBeLessThanOrEqual(100);
    expect(t).toMatch(/^Top 1250 MCQs of A Very Long/);
    expect(t).toMatch(/Marathon Quiz$/);
  });
  it("thumbnail: Top N Questions of Topic + Marathon Quiz badge", () => {
    expect(marathonThumbnailLines({ stream: "Commerce", subject: "Accounts", topic: "Cash Book", total: 1000 }))
      .toEqual({ kicker: "Commerce · Accounts", headline: "Top 1000 Questions of Cash Book", badge: "Marathon Quiz" });
  });
  it("thumbnail: Stream / Subject toggles", () => {
    const base = { stream: "Commerce", subject: "Accounts", topic: "Cash Book", total: 1000 };
    expect(marathonThumbnailLines({ ...base, showStream: false }).kicker).toBe("Accounts");
    expect(marathonThumbnailLines({ ...base, showSubject: false }).kicker).toBe("Commerce");
    expect(marathonThumbnailLines({ ...base, showStream: false, showSubject: false }).kicker).toBe("");
  });
  it("intro text (full video and Short)", () => {
    expect(marathonIntro({ topic: "Cash Book", total: 1000 })).toEqual({
      heading: "Top 1000 Questions of Cash Book",
      line: "Marathon Quiz",
      narration: "Top 1000 Questions of Cash Book. Marathon quiz. Let's begin!",
    });
  });
  it("tags: Top MCQs of Topic, Top N MCQs of Topic, Topic Marathon Quiz", () => {
    expect(marathonTagNames({ topic: "Cash Book", total: 1000 })).toEqual(["Top MCQs of Cash Book", "Top 1000 MCQs of Cash Book", "Cash Book Marathon Quiz"]);
    expect(buildYtTags("#Accounts", { first: ["Top MCQs of Cash Book", ...marathonTagNames({ topic: "Cash Book", total: 1000 })] }))
      .toEqual(["Top MCQs of Cash Book", "Top 1000 MCQs of Cash Book", "Cash Book Marathon Quiz", "Accounts"]);
  });
  it("description intro", () => {
    expect(marathonDescriptionIntro({ topic: "Cash Book", total: 1000, quizzes: 40 }))
      .toBe("Top 1000 MCQs of Cash Book — Marathon Quiz. Question 1 to 1000 of this topic in one video, with answers. Use the chapters to jump to any part.");
  });
});

describe("intro slide with a fixed (marathon) heading", () => {
  const m = marathonIntro({ topic: "Cash Book", total: 1000 });
  it("uses the marathon heading + line and its narration", () => {
    const p = introSlidePlan({ subject: "Accounts", topic: "Cash Book", heading: m.heading, line: m.line, defaultNarration: m.narration });
    expect(p.heading).toBe("Top 1000 Questions of Cash Book");
    expect(p.lines).toEqual(["Marathon Quiz"]);
    expect(p.narration).toBe(m.narration);
  });
  it("the admin's own narration (text box) still wins", () => {
    const p = introSlidePlan({ heading: m.heading, line: m.line, defaultNarration: m.narration, narration: "My own words." });
    expect(p.narration).toBe("My own words.");
  });
  it("normal videos are unchanged", () => {
    expect(introSlidePlan({ subject: "Accounts", topic: "Cash Book" }).heading).toBe("Accounts — Cash Book");
  });
});

import { subjectFromLabel } from "../src/config/longVideo.js";
describe("subject from the picked label", () => {
  it("the part before the topic", () => {
    expect(subjectFromLabel("Science › Biology › Respiration", "Respiration")).toBe("Biology");
    expect(subjectFromLabel("Respiration", "Respiration")).toBe("");
  });
});

import { nextLongVideoPart } from "../src/config/longVideo.js";
import { marathonTitle as mTitle, marathonIntro as mIntro, marathonThumbnailLines as mThumb, marathonDescriptionIntro as mDesc } from "../src/utils/marathonText.js";
describe("marathon in parts (200 per video of a 1000-question topic)", () => {
  it("schedule: Part 1 = 1–200, Part 2 = 201–400 … Part 5 is the last", () => {
    let st = { nextStart: 1, part: 0 };
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const n = nextLongVideoPart({ ...st, perVideo: 200, total: 1000, maxPer: 2000 });
      parts.push([n.part, n.start, n.start + n.count - 1, n.last]);
      st = { nextStart: n.start + n.count, part: n.part };
    }
    expect(parts).toEqual([[1, 1, 200, false], [2, 201, 400, false], [3, 401, 600, false], [4, 601, 800, false], [5, 801, 1000, true]]);
    expect(nextLongVideoPart({ ...st, perVideo: 200, total: 1000, maxPer: 2000 }).done).toBe(true);
  });
  it("texts end with the part", () => {
    expect(mTitle({ topic: "Respiration", subject: "Biology", total: 200, part: 2 })).toBe("Top 200 MCQs of Respiration | Biology | Respiration Marathon Quiz Part 2");
    expect(mIntro({ topic: "Respiration", total: 200, part: 2 })).toEqual({ heading: "Top 200 Questions of Respiration", line: "Marathon Quiz · Part 2", narration: "Top 200 Questions of Respiration. Marathon quiz, part 2. Let's begin!" });
    expect(mThumb({ topic: "Respiration", total: 200, part: 2 }).badge).toBe("Marathon Quiz · Part 2");
    expect(mDesc({ topic: "Respiration", subject: "Biology", total: 200, part: 2, from: 201, to: 400, of: 1000 })).toMatch(/^Top 200 MCQs of Respiration \(Biology\) — Marathon Quiz Part 2\. Questions 201 to 400 of 1000 of this topic/);
  });
});
