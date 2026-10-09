import { describe, it, expect, vi } from "vitest";

const calls = [];
vi.mock("../../src/config/slideshow.js", async (orig) => ({
  ...(await orig()),
  generateSlideshow: vi.fn(async (qs, o) => {
    calls.push({ n: qs.length, intro: !!o.intro, outro: o.outro || null, from: o.numberFrom, total: o.numberTotal });
    return { filePath: `/tmp/part-${calls.length}.mp4`, duration: 100 * qs.length + (o.intro ? 5 : 0), chapters: [{ question: 1, startSec: o.intro ? 5 : 0 }] };
  }),
}));
const joined = [];
vi.mock("../../src/config/videoCompose.js", async (orig) => ({
  ...(await orig()),
  concatMp4Files: vi.fn(async (parts, out) => { joined.push(...parts); return out; }),
}));

const { renderMarathon, normalizeLongVideoOptions, isTopicLevelSource, MAX_MARATHON_QUESTIONS } = await import("../../src/config/longVideo.js");

describe("Marathon video (whole topic in one video)", () => {
  it("options: up to 2000 questions, always in order, may start part-way (Part 2 → 201)", () => {
    const o = normalizeLongVideoOptions({ marathon: true, count: 9999, start: 201, order: "random" }, {});
    expect([o.marathon, o.count, o.start, o.order]).toEqual([true, MAX_MARATHON_QUESTIONS, 201, "sequential"]);
    expect(normalizeLongVideoOptions({ count: 9999 }, {}).count).toBe(50); // normal videos keep the 50 cap
  });
  it("needs a whole topic, not one quiz", () => {
    expect(isTopicLevelSource({ topic: "t" })).toBe(true);
    expect(isTopicLevelSource({ practiceTopic: "t" })).toBe(true);
    expect(isTopicLevelSource({ topic: "t", quiz: "q" })).toBe(false);
  });
  it("renders one quiz at a time (intro first, end slide last), numbers Question 1 … N across all, joins them", async () => {
    const groups = [{ name: "Quiz 1", questions: [1, 2] }, { name: "Quiz 2", questions: [3] }, { name: "Quiz 3", questions: [4, 5, 6] }];
    const job = { status: "running", notes: [] };
    const r = await renderMarathon(job, { groups, slideBase: {}, intro: { topic: "Cash Book" }, onStatus: () => {} });
    expect(calls).toEqual([{ n: 2, intro: true, outro: null, from: 0, total: 6 }, { n: 1, intro: false, outro: null, from: 2, total: 6 }, { n: 3, intro: false, outro: "full", from: 3, total: 6 }]);
    expect(joined).toEqual(["/tmp/part-1.mp4", "/tmp/part-2.mp4", "/tmp/part-3.mp4"]);
    expect(r.duration).toBe(205 + 100 + 300);
    expect(r.chapters).toEqual([{ label: "Questions 1–2", startSec: 5 }, { label: "Question 3", startSec: 205 }, { label: "Questions 4–6", startSec: 305 }]);
  });
});
