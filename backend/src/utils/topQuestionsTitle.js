// Full quiz videos (automatic title): one more part at the end —
//   "JKSSB | Biology | Vitamin's | Quiz 3 (25 Questions) | Top 25 Questions of Vitamin's"
// and the description's first line starts with it. Pure (tested).
const clean = (s) => String(s || "").replace(/^[A-Z]\)\s*/, "").replace(/[<>"#|]/g, " ").replace(/\s+/g, " ").trim();

// "Top 25 Questions of Vitamin's" ("" without a topic or count).
export function topQuestionsLine({ topic = "", count = 0 } = {}) {
  const t = clean(topic);
  const n = Math.round(Number(count) || 0);
  return t && n > 0 ? `Top ${n} Questions of ${t}` : "";
}

// "Top 25 Questions" — the TITLE add-on (the topic is already in the title).
export function topQuestionsTitlePart(count = 0) {
  const n = Math.round(Number(count) || 0);
  return n > 0 ? `Top ${n} Questions` : "";
}

// Add "| Top 25 Questions" at the end of the title. If that goes over
// YouTube's 100 characters, drop the "(25 Questions)" count instead (the new
// part already says it) — the stream / subject / topic are never removed:
//   "JKSSB | Current Affairs 2026 | Current Affairs of Jan 2026 to July 2026 | Quiz 3 (25 Questions)"
//   → "JKSSB | Current Affairs 2026 | Current Affairs of Jan 2026 to July 2026 | Quiz 3 | Top 25 Questions"
// Still too long → the title is left as it was.
export function withTopLine(title, part) {
  const t = String(title || "").trim();
  if (!part || !t || t.toLowerCase().includes(part.toLowerCase())) return t;
  const full = `${t} | ${part}`;
  if (full.length <= 100) return full;
  const noCount = `${t.replace(/\s*\(\d+\s+Questions?\)/i, "").trim()} | ${part}`;
  return noCount.length <= 100 ? noCount : t;
}

// The automatic FULL QUIZ VIDEO title, in the order the admin asked for:
//   "Top 25 MCQs of Current Affairs of Jan 2026 to July 2026 | Current Affairs 2026 | JKSSB | Quiz 3"
// = Top N MCQs of <Topic> | Subject | Stream | Quiz (no "(N Questions)").
// Over YouTube's 100 characters → the subject, then the stream are dropped;
// still too long → "" (the caller keeps its older title).
export function fullQuizTitle({ stream = "", subject = "", topic = "", quiz = "", part = 0, count = 0 } = {}) {
  const n = Math.round(Number(count) || 0);
  const t = clean(topic) || clean(subject);
  const top = t ? `Top ${n ? `${n} ` : ""}MCQs of ${t}` : "";
  const p = Math.round(Number(part) || 0);
  const q = clean(quiz);
  const last = q ? `${q}${p ? ` (Part ${p})` : ""}` : p ? `Part ${p}` : "";
  const join = (parts) => {
    const seen = new Set();
    return parts.filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())).join(" | ");
  };
  for (const out of [join([top, clean(subject), clean(stream), last]), join([top, clean(stream), last]), join([top, last])]) {
    if (out && out.length <= 100) return out;
  }
  return "";
}
