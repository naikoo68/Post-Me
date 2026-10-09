import { describe, it, expect } from "vitest";
import { downloadUrl, mediaFileName } from "./postDownloads.js";

describe("downloadUrl", () => {
  const cdn = "https://res.cloudinary.com/demo/video/upload/v1/mystudyguide/reels/abc.mp4";

  it("adds fl_attachment (with a safe file name) to Cloudinary URLs", () => {
    expect(downloadUrl(cdn)).toBe("https://res.cloudinary.com/demo/video/upload/fl_attachment/v1/mystudyguide/reels/abc.mp4");
    expect(downloadUrl(cdn, "Ledger Posting › Reel")).toBe("https://res.cloudinary.com/demo/video/upload/fl_attachment:Ledger_Posting_Reel/v1/mystudyguide/reels/abc.mp4");
  });

  it("keeps existing transformations after the flag", () => {
    const t = "https://res.cloudinary.com/demo/image/upload/c_pad,ar_4:5/v1/x.jpg";
    expect(downloadUrl(t)).toBe("https://res.cloudinary.com/demo/image/upload/fl_attachment/c_pad,ar_4:5/v1/x.jpg");
  });

  it("leaves other URLs alone and rejects non-http values", () => {
    expect(downloadUrl("https://example.com/a.mp4")).toBe("https://example.com/a.mp4");
    expect(downloadUrl(downloadUrl(cdn))).toBe(downloadUrl(cdn)); // not added twice
    expect(downloadUrl("javascript:alert(1)")).toBe("");
    expect(downloadUrl("")).toBe("");
  });
});

describe("mediaFileName", () => {
  it("joins the title and label", () => {
    expect(mediaFileName("Quiz 1", "Reel video")).toBe("Quiz 1-Reel video");
    expect(mediaFileName("", "")).toBe("post");
  });
});
