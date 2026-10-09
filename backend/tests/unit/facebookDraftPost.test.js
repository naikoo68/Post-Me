import { describe, it, expect, afterEach, vi } from "vitest";
import { postToFacebookPage, postReelToFacebookPage, collectFacebookPublications, liveFbAttempts } from "../../src/config/facebook.js";
import { postLongVideoToFacebookPage } from "../../src/config/fbLongVideo.js";
import { normalizeLongVideoOptions } from "../../src/config/longVideo.js";
import { pickScheduleFields } from "../../src/controllers/facebookController.js";

// "Save as draft" — a Facebook photo/text POST is created as an unpublished
// Page draft (published=false + unpublished_content_type=DRAFT) that the admin
// finishes in Meta Business Suite. It must never fall back to a live publish,
// never be counted in the publication ledger and never get auto-comments.
// global.fetch is mocked; each test uses a UNIQUE pageId (token cache).

const VERSION = "v21.0";
const reply = (data, { ok = true, status = 200 } = {}) => ({ ok, status, json: async () => data });
const field = (opts, key) => {
  const b = opts?.body;
  if (b && typeof b.get === "function") return b.get(key);
  return new URLSearchParams(String(b || "")).get(key);
};
function installFetch(router) {
  const calls = [];
  global.fetch = vi.fn(async (url, opts = {}) => {
    calls.push({ url: String(url), opts, method: opts.method || "GET" });
    return router(String(url), opts);
  });
  return calls;
}
const tokenLookup = (url, opts) => opts.method !== "POST" && url.includes("fields=access_token");

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

describe("postToFacebookPage — draft mode", () => {
  it("creates an image post as a DRAFT on /feed", async () => {
    const pageId = "page-draft-image";
    installFetch((url, opts) => {
      if (tokenLookup(url, opts)) return reply({ access_token: "PAGE_TOKEN" });
      if (url.includes(`/${pageId}/photos`)) return reply({ id: "MEDIA_1" });
      if (url.includes(`/${pageId}/feed`)) {
        expect(field(opts, "published")).toBe("false");
        expect(field(opts, "unpublished_content_type")).toBe("DRAFT");
        expect(JSON.parse(field(opts, "attached_media[0]"))).toEqual({ media_fbid: "MEDIA_1" });
        return reply({ id: `${pageId}_DRAFT_1` });
      }
      throw new Error(`unexpected call: ${url}`);
    });
    const r = await postToFacebookPage({ message: "hi", imageUrl: "https://img/x.png", draft: true }, { pageId, token: "t", version: VERSION });
    expect(r).toEqual({ ok: true, id: `${pageId}_DRAFT_1`, draft: true });
  });

  it("creates a text post as a DRAFT on /feed", async () => {
    const pageId = "page-draft-text";
    installFetch((url, opts) => {
      if (tokenLookup(url, opts)) return reply({ access_token: "PAGE_TOKEN" });
      if (url.includes(`/${pageId}/feed`)) {
        expect(field(opts, "published")).toBe("false");
        expect(field(opts, "unpublished_content_type")).toBe("DRAFT");
        expect(field(opts, "message")).toBe("text only");
        return reply({ id: `${pageId}_DRAFT_2` });
      }
      throw new Error(`unexpected call: ${url}`);
    });
    const r = await postToFacebookPage({ message: "text only", draft: true }, { pageId, token: "t", version: VERSION });
    expect(r.ok).toBe(true);
    expect(r.draft).toBe(true);
  });

  it("does NOT fall back to a live /photos publish when the draft fails", async () => {
    const pageId = "page-draft-nofallback";
    const calls = installFetch((url, opts) => {
      if (tokenLookup(url, opts)) return reply({ access_token: "PAGE_TOKEN" });
      if (url.includes(`/${pageId}/photos`)) return reply({ id: "MEDIA_2" });
      if (url.includes(`/${pageId}/feed`)) return reply({ error: { message: "nope" } }, { ok: false, status: 400 });
      throw new Error(`unexpected call: ${url}`);
    });
    const r = await postToFacebookPage({ message: "hi", imageUrl: "https://img/x.png", draft: true }, { pageId, token: "t", version: VERSION });
    expect(r.ok).toBe(false);
    // Only ONE /photos call (the unpublished upload) — no legacy live publish.
    expect(calls.filter((c) => c.method === "POST" && c.url.includes("/photos"))).toHaveLength(1);
  });

  it("publishes normally (no draft params) when draft is off", async () => {
    const pageId = "page-draft-off";
    installFetch((url, opts) => {
      if (tokenLookup(url, opts)) return reply({ access_token: "PAGE_TOKEN" });
      if (url.includes(`/${pageId}/feed`)) {
        expect(field(opts, "published")).toBeNull();
        expect(field(opts, "unpublished_content_type")).toBeNull();
        return reply({ id: `${pageId}_LIVE` });
      }
      throw new Error(`unexpected call: ${url}`);
    });
    const r = await postToFacebookPage({ message: "live" }, { pageId, token: "t", version: VERSION });
    expect(r).toEqual({ ok: true, id: `${pageId}_LIVE` });
  });
});

describe("draft bookkeeping", () => {
  const attempts = [
    { ok: true, id: "MAIN_DRAFT", pageId: "main", pageLabel: "", draft: true },
    { ok: true, id: "EXTRA_LIVE", pageId: "extra", pageLabel: "Extra" },
  ];

  it("drafts are never recorded as publications", () => {
    expect(collectFacebookPublications(attempts).map((p) => p.id)).toEqual(["EXTRA_LIVE"]);
  });

  it("drafts are masked for comments, keeping the main Page at index 0", () => {
    const live = liveFbAttempts(attempts);
    expect(live[0]).toMatchObject({ id: "MAIN_DRAFT", ok: false });
    expect(live[1]).toMatchObject({ id: "EXTRA_LIVE", ok: true });
  });

  it("pickScheduleFields reads the fbDraft flag", () => {
    expect(pickScheduleFields({ fbDraft: true }).fbDraft).toBe(true);
    expect(pickScheduleFields({}).fbDraft).toBe(false);
  });
});

describe("postReelToFacebookPage — draft mode", () => {
  const reelRouter = (pageId, { failFinish = false } = {}) => (url, opts) => {
    if (tokenLookup(url, opts)) return reply({ access_token: "PAGE_TOKEN" });
    if (url.includes(`/${pageId}/video_reels`) && field(opts, "upload_phase") === "start") return reply({ video_id: "VID_1", upload_url: "https://rupload/x" });
    if (url.startsWith("https://rupload/")) return reply({ success: true });
    if (url.includes("/VID_1?fields=status")) return reply({ status: { video_status: "ready", uploading_phase: { status: "complete" }, processing_phase: { status: "complete" } } });
    if (url.includes(`/${pageId}/video_reels`) && field(opts, "upload_phase") === "finish") {
      if (failFinish) return reply({ error: { message: "finish failed" } }, { ok: false, status: 400 });
      expect(field(opts, "video_state")).toBe("DRAFT");
      return reply({ success: true });
    }
    if (url.includes(`/${pageId}/videos`)) {
      expect(field(opts, "published")).toBe("false");
      expect(field(opts, "unpublished_content_type")).toBe("DRAFT");
      return reply({ id: "FALLBACK_VID" });
    }
    throw new Error(`unexpected call: ${url}`);
  };

  it("finishes the Reel with video_state=DRAFT", async () => {
    const pageId = "page-reel-draft";
    installFetch(reelRouter(pageId));
    const r = await postReelToFacebookPage({ videoUrl: "https://v/x.mp4", description: "d", draft: true }, { pageId, token: "t", version: VERSION });
    expect(r).toEqual({ ok: true, id: "VID_1", draft: true });
  });

  it("keeps the /videos fallback as a draft too", async () => {
    const pageId = "page-reel-draft-fallback";
    installFetch(reelRouter(pageId, { failFinish: true }));
    const r = await postReelToFacebookPage({ videoUrl: "https://v/x.mp4", draft: true }, { pageId, token: "t", version: VERSION });
    expect(r).toEqual({ ok: true, id: "FALLBACK_VID", draft: true });
  });
});

describe("postLongVideoToFacebookPage — draft mode", () => {
  it("uploads as a DRAFT and ignores a publish time", async () => {
    const pageId = "page-long-draft";
    let form = null;
    installFetch((url, opts) => {
      if (tokenLookup(url, opts)) return reply({ access_token: "PAGE_TOKEN" });
      if (url.includes(`/${pageId}/videos`)) { form = opts.body; return reply({ id: "LONG_1" }); }
      throw new Error(`unexpected call: ${url}`);
    });
    const later = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const r = await postLongVideoToFacebookPage({ videoUrl: "https://v/long.mp4", title: "T", publishAt: later, draft: true }, { pageId, token: "t", version: VERSION });
    expect(r.ok).toBe(true);
    expect(r.draft).toBe(true);
    expect(r.scheduled).toBe(false);
    expect(form.get("published")).toBe("false");
    expect(form.get("unpublished_content_type")).toBe("DRAFT");
    expect(form.get("scheduled_publish_time")).toBeNull();
  });

  it("normalizeLongVideoOptions keeps the fbDraft flag", () => {
    expect(normalizeLongVideoOptions({ fbDraft: true }, {}).fbDraft).toBe(true);
    expect(normalizeLongVideoOptions({}, {}).fbDraft).toBe(false);
  });
});
