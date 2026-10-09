// The words a MARATHON video (every quiz of a topic in one video) uses on
// YouTube / Facebook: title, thumbnail, intro slides (full video + Short) and
// extra tags — all built around "Top N MCQs of <Topic>". N = the marathon's
// total question count (the Short says the same N, it's a teaser for it).
// Pure (tested) — normal full-quiz videos never use these.
const clean = (s) => String(s || "").replace(/^[A-Z]\)\s*/, "").replace(/[<>"#]/g, " ").replace(/\s+/g, " ").trim();
const num = (n) => Math.max(0, Math.round(Number(n) || 0));

// "Top 200 MCQs of Respiration | Biology | Respiration Marathon Quiz" (≤ 100
// chars — YouTube's limit). Too long → the topic repeat goes first, then the subject.
// part > 0 (the topic split into several marathon videos) → "… Marathon Quiz Part 2".
export function marathonTitle({ topic = "", subject = "", total = 0, part = 0 } = {}) {
  const t = clean(topic) || "This Topic";
  const sub = clean(subject);
  const s = sub && sub.toLowerCase() !== t.toLowerCase() ? ` | ${sub}` : "";
  const n = num(total);
  const p = num(part) ? ` Part ${num(part)}` : "";
  const head = n ? `Top ${n} MCQs of ${t}` : `Top MCQs of ${t}`;
  for (const c of [`${head}${s} | ${t} Marathon Quiz${p}`, `${head}${s} | Marathon Quiz${p}`, `${head} | Marathon Quiz${p}`]) if (c.length <= 100) return c;
  const tail = ` | Marathon Quiz${p}`;
  return `${head.slice(0, 100 - tail.length).trim()}${tail}`;
}
const partLabel = (part) => (num(part) ? `Marathon Quiz · Part ${num(part)}` : "Marathon Quiz");

// "Top 1000 Questions of Photosynthesis" — the big line on the thumbnail and
// on both intro slides.
export function marathonHeadline({ topic = "", total = 0 } = {}) {
  const t = clean(topic) || "This Topic";
  const n = num(total);
  return n ? `Top ${n} Questions of ${t}` : `Top Questions of ${t}`;
}

// Thumbnail text: small "Stream · Subject" line, the headline, "Marathon Quiz" badge.
// showStream / showSubject (thumbnail toggles, default on) hide either name;
// both off → no small line at all.
export function marathonThumbnailLines({ stream = "", subject = "", topic = "", total = 0, part = 0, showStream = true, showSubject = true } = {}) {
  const kicker = [showStream === false ? "" : clean(stream), showSubject === false ? "" : clean(subject)].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ");
  return {
    kicker: kicker.slice(0, 60),
    headline: marathonHeadline({ topic, total }).slice(0, 80),
    badge: partLabel(part),
  };
}

// Intro slide (full video AND the Short): heading + sub-line + spoken line.
// The admin's own narration (Intro / Short intro text box) still wins.
export function marathonIntro({ topic = "", total = 0, part = 0 } = {}) {
  const heading = marathonHeadline({ topic, total });
  return {
    heading,
    line: partLabel(part),
    narration: `${heading}. Marathon quiz${num(part) ? `, part ${num(part)}` : ""}. Let's begin!`,
  };
}

// Extra YouTube tags (readable, with spaces): "Top MCQs of X", "Top N MCQs of X", "X Marathon Quiz".
// + the subject: "Biology MCQs", "Biology Marathon Quiz".
export function marathonTagNames({ topic = "", subject = "", total = 0 } = {}) {
  const t = clean(topic);
  if (!t) return [];
  const sub = clean(subject);
  const n = num(total);
  const out = [`Top MCQs of ${t}`, n ? `Top ${n} MCQs of ${t}` : "", `${t} Marathon Quiz`,
    sub && sub.toLowerCase() !== t.toLowerCase() ? `${sub} MCQs` : "", sub && sub.toLowerCase() !== t.toLowerCase() ? `${sub} Marathon Quiz` : ""];
  return out.filter(Boolean).map((x) => x.slice(0, 100))
    .filter((x, i, a) => a.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);
}

// First line of the description.
// One run of Question 1 … N — the quizzes are not shown separately.
// A part: "… — Marathon Quiz Part 2. Questions 201 to 400 of 1000 of this topic …".
export function marathonDescriptionIntro({ topic = "", subject = "", total = 0, part = 0, from = 0, to = 0, of = 0, breadcrumb = "" } = {}) {
  const t = clean(topic) || "this topic";
  const sub = clean(subject);
  const n = num(total);
  const p = num(part);
  const range = p && num(from) && num(to) ? `Questions ${num(from)} to ${num(to)}${num(of) ? ` of ${num(of)}` : ""}` : n ? `Question 1 to ${n}` : "Every question";
  return `Top ${n ? `${n} ` : ""}MCQs of ${t}${sub && sub.toLowerCase() !== t.toLowerCase() ? ` (${sub})` : ""} — Marathon Quiz${p ? ` Part ${p}` : ""}. ${range} of this topic in one video, with answers${breadcrumb ? ` — ${breadcrumb}` : ""}. Use the chapters to jump to any part.`;
}
