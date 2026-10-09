// PURE: the "last post" record kept on a schedule (FbSchedule.lastPost) so the
// admin can DOWNLOAD what was posted (image / Reel / Short / video) and COPY
// its texts (captions, YouTube title + description) to re-upload it by hand —
// e.g. to Instagram. One generic shape for every post type:
//   { at, media: [{ type: "image"|"video", label, url }], texts: [{ label, text }] }
// Only public http(s) URLs are kept, empty entries are dropped and duplicates
// (same URL / same text) are removed. Returns null when there is nothing to keep.

const MAX_TEXT = 5000;
const MAX_ITEMS = 8;

const isUrl = (u) => /^https?:\/\/\S+$/i.test(String(u || "").trim());

export function buildLastPost({ media = [], texts = [], at = new Date() } = {}) {
  const seenUrls = new Set();
  const outMedia = [];
  for (const m of media || []) {
    const url = String(m?.url || "").trim();
    if (!isUrl(url) || seenUrls.has(url)) continue;
    seenUrls.add(url);
    outMedia.push({
      type: m.type === "video" ? "video" : "image",
      label: String(m.label || (m.type === "video" ? "Video" : "Image")).slice(0, 60),
      url,
    });
    if (outMedia.length >= MAX_ITEMS) break;
  }
  const seenTexts = new Set();
  const outTexts = [];
  for (const t of texts || []) {
    const text = String(t?.text || "").trim().slice(0, MAX_TEXT);
    if (!text || seenTexts.has(text)) continue;
    seenTexts.add(text);
    outTexts.push({ label: String(t.label || "Caption").slice(0, 60), text });
    if (outTexts.length >= MAX_ITEMS) break;
  }
  if (!outMedia.length && !outTexts.length) return null;
  return { at: at instanceof Date ? at : new Date(at), media: outMedia, texts: outTexts };
}
