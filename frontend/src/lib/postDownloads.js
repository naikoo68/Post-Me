// Helpers for the schedule row's "Download / Copy" buttons (FbSchedule.lastPost).

// A URL that makes the browser DOWNLOAD the file instead of opening it. The
// HTML `download` attribute is ignored across origins, so for Cloudinary we ask
// the host to serve it as an attachment (fl_attachment, optionally with a file
// name). Other URLs are returned unchanged (they open in a new tab).
export function downloadUrl(url, name = "") {
  const s = String(url || "").trim();
  if (!/^https?:\/\//i.test(s)) return "";
  if (!s.includes("res.cloudinary.com") || !s.includes("/upload/") || s.includes("/upload/fl_attachment")) return s;
  // Cloudinary file names: letters, digits, - and _ only (no extension).
  const safe = String(name || "").normalize("NFKD").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
  return s.replace("/upload/", `/upload/fl_attachment${safe ? `:${safe}` : ""}/`);
}

// A short file name for a post's media: "<schedule title>-<label>".
export function mediaFileName(title, label) {
  return [title, label].map((x) => String(x || "").trim()).filter(Boolean).join("-") || "post";
}

// Copy text to the clipboard. Falls back to a hidden textarea + execCommand
// for older / non-secure-context mobile browsers. Resolves true on success.
export async function copyText(text) {
  const t = String(text ?? "");
  if (!t) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return !!ok;
  } catch {
    return false;
  }
}

// Pick what a "Post to Facebook" hand-off should share from a lastPost: the
// Facebook caption (falls back to the first text) and the best media for it —
// a Reel/Short video first, then any video, then the first image.
export function pickFacebookPost(lastPost) {
  const media = Array.isArray(lastPost?.media) ? lastPost.media : [];
  const texts = Array.isArray(lastPost?.texts) ? lastPost.texts : [];
  const caption = (texts.find((t) => /facebook/i.test(t.label)) || texts[0])?.text || "";
  const item =
    media.find((m) => m.type === "video" && /reel|short/i.test(m.label)) ||
    media.find((m) => m.type === "video") ||
    media.find((m) => m.type === "image") ||
    null;
  return { caption, media: item };
}

// True when this browser can hand FILES to another app through the native share
// sheet (Android Chrome, iOS Safari, …). Desktop browsers mostly can't.
export function canShareFiles() {
  try {
    if (typeof navigator === "undefined" || !navigator.canShare || !navigator.share || typeof File === "undefined") return false;
    return navigator.canShare({ files: [new File([""], "probe.mp4", { type: "video/mp4" })] });
  } catch {
    return false;
  }
}

// Download a media URL into a File for the share sheet. Throws on network/CORS
// failure so the caller can fall back to a plain download.
export async function fetchShareFile(url, name, type) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const mime = blob.type || (type === "video" ? "video/mp4" : "image/jpeg");
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.startsWith("image/") ? "jpg" : mime.includes("quicktime") ? "mov" : "mp4";
  const safe = String(name || "post").normalize("NFKD").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "post";
  return new File([blob], `${safe}.${ext}`, { type: mime });
}

// The first public video link (YouTube watch / youtu.be / Shorts) in a text.
export function firstVideoLink(text) {
  const m = String(text || "").match(/https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|youtube\.com\/shorts\/[\w-]+)/i);
  return m ? m[0] : "";
}

// Facebook link-share dialog: opens Facebook with the link (and its video
// preview card) already attached. Facebook ignores any pre-filled text.
export function facebookSharerUrl(link) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
}

// What "Post to Facebook" shares for ANY schedule row — even one posted before
// lastPost existed: the saved media + caption when there is one, plus the
// YouTube link from the row's result so the link can always be shared.
export function facebookTargetForSchedule(s) {
  const { caption, media } = pickFacebookPost(s?.lastPost);
  const hay = [...(s?.lastPost?.texts || []).map((t) => t.text), s?.lastResult || ""].join(" ");
  const link = firstVideoLink(hay);
  const name = String(s?.title || s?.source?.label || "").split(" › ").pop();
  return { caption: caption || [name, link && `Watch the video: ${link}`].filter(Boolean).join("\n\n"), media, link };
}

// Same for a "Recent long videos" job (no saved media — share its links).
export function facebookTargetForJob(j) {
  const link = j?.url || j?.shortUrl || "";
  return { caption: [j?.title || j?.label || "", link && `Watch the full video: ${link}`].filter(Boolean).join("\n\n"), media: null, link };
}
