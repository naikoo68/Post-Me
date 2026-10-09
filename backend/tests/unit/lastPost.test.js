import { describe, it, expect } from "vitest";
import { buildLastPost } from "../../src/utils/lastPost.js";

const { longVideoLastPost } = await import("../../src/config/longVideo.js");

// FbSchedule.lastPost — what the schedule row offers to Download / Copy.

describe("buildLastPost", () => {
  it("keeps public media + non-empty texts, drops duplicates and junk", () => {
    const at = new Date("2026-10-08T09:12:00Z");
    const r = buildLastPost({
      at,
      media: [
        { type: "video", label: "Reel video", url: "https://res.cloudinary.com/x/video/upload/v1/r.mp4" },
        { type: "image", label: "Card image", url: "https://res.cloudinary.com/x/image/upload/v1/c.jpg" },
        { type: "image", label: "Again", url: "https://res.cloudinary.com/x/image/upload/v1/c.jpg" }, // duplicate URL
        { type: "video", label: "Missing", url: "" },
        { type: "image", label: "Bad", url: "javascript:alert(1)" },
      ],
      texts: [
        { label: "Instagram caption", text: "Q1 #GK" },
        { label: "Facebook caption", text: "Q1 #GK" }, // same text → collapses
        { label: "YouTube title", text: "" },
      ],
    });
    expect(r).toEqual({
      at,
      media: [
        { type: "video", label: "Reel video", url: "https://res.cloudinary.com/x/video/upload/v1/r.mp4" },
        { type: "image", label: "Card image", url: "https://res.cloudinary.com/x/image/upload/v1/c.jpg" },
      ],
      texts: [{ label: "Instagram caption", text: "Q1 #GK" }],
    });
  });

  it("returns null when there is nothing to keep", () => {
    expect(buildLastPost({ media: [{ url: "" }], texts: [{ text: "  " }] })).toBeNull();
    expect(buildLastPost()).toBeNull();
  });

  it("caps very long text", () => {
    const r = buildLastPost({ texts: [{ label: "Caption", text: "x".repeat(9000) }] });
    expect(r.texts[0].text).toHaveLength(5000);
  });
});

describe("longVideoLastPost", () => {
  it("maps a finished long-video job's downloads", () => {
    const r = longVideoLastPost({
      downloads: {
        reelUrl: "https://cdn/x/short.mp4",
        thumbnailUrl: "https://cdn/x/thumb.jpg",
        igCaption: "Title\n\nWatch on our channel\n\n#tags",
        title: "Title",
        description: "Long description",
      },
    });
    expect(r.media.map((m) => m.label)).toEqual(["Reel / Short video", "Thumbnail"]);
    expect(r.texts.map((t) => t.label)).toEqual(["Instagram caption", "Video title", "Video description"]);
  });

  it("is null for a job with nothing hosted or written", () => {
    expect(longVideoLastPost({})).toBeNull();
  });
});

// ─── Long video vs Short — separate destinations ("Shorts only") ───
const { longVideoTargets, perRunCount, normalizeLongVideoOptions } = await import("../../src/config/longVideo.js");

describe("longVideoTargets", () => {
  it("treats the long video and the Short as separate", () => {
    expect(longVideoTargets({ toYoutube: true, asShort: true })).toEqual({ full: true, short: true, any: true, shortOnly: false });
    expect(longVideoTargets({ toYoutube: false, asShort: true })).toEqual({ full: false, short: true, any: true, shortOnly: true });
    expect(longVideoTargets({ shortToInstagram: true })).toMatchObject({ any: true, shortOnly: true });
    expect(longVideoTargets({})).toMatchObject({ any: false });
  });
});

describe("perRunCount", () => {
  it("uses the Short's question count for Shorts only", () => {
    expect(perRunCount({ toYoutube: false, asShort: true, count: 25, shortCount: 3 })).toBe(3);
    expect(perRunCount({ toYoutube: false, asShort: true, count: 2, shortCount: 3 })).toBe(2);
    expect(perRunCount({ toYoutube: false, asShort: true, count: 0 })).toBe(3); // default Short size
    expect(perRunCount({ toYoutube: true, asShort: true, count: 25, shortCount: 3 })).toBe(25);
  });
});

describe("normalizeLongVideoOptions — Short independence", () => {
  it("keeps a Short-only choice from the new form", () => {
    expect(normalizeLongVideoOptions({ toYoutube: false, asShort: true, shortIndependent: true }, {}).asShort).toBe(true);
  });
  it("does not switch on a hidden Short of an older schedule", () => {
    expect(normalizeLongVideoOptions({ toYoutube: false, asShort: true }, {}).asShort).toBe(false);
    expect(normalizeLongVideoOptions({ toYoutube: true, asShort: true }, {}).asShort).toBe(true);
  });
});
