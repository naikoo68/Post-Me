// A question saved as type "table" without a real data table (no table, or only
// a header row) is NOT a table question. Regenerate can't fix it — it keeps the
// type and is told a table question "MUST" have tableRows, so the AI invents a
// header-only table and Find Incomplete keeps flagging it. Work out the type it
// really is from its options:
//   • options are journal entries (pipe tables)            → "journal"
//   • options are ledger accounts (To … / By … T-accounts) → "ledger"
//   • plain text options                                   → "mcq"
// Pure — unit-tested. (Mirrored in frontend/src/lib/tableType.js.)

const isBlank = (v) => !String(v ?? "").trim();
// A real table = a header row + at least one row with content.
export function hasRealTable(rows) {
  const r = (Array.isArray(rows) ? rows : []).filter((row) => Array.isArray(row) && row.some((c) => !isBlank(c)));
  return r.length >= 2;
}
const isPipeTable = (t) => String(t ?? "").split(/\r?\n/).filter((l) => l.includes("|")).length >= 2;

// The type a "table" question without a table should have.
export function inferTypeForTablelessQuestion(q) {
  const opts = Array.isArray(q?.options) ? q.options.map((o) => String(o ?? "")) : [];
  const tables = opts.filter(isPipeTable);
  if (tables.length < 2) return "mcq";
  const all = tables.join("\n");
  const header = (tables[0].split(/\r?\n/).find((l) => l.includes("|")) || "").toLowerCase();
  const particularsTwice = (header.match(/particulars/g) || []).length >= 2;
  const toAndBy = /\|\s*to\s+\S/i.test(all) && /\|\s*by\s+\S/i.test(all);
  const journalMarks = /\bdr\.?\b/i.test(all) && !/\bby\s+/i.test(all);
  const asksLedger = /\bledger\b|\bpost(?:ed|ing)?\b|\bT-?account\b/i.test(String(q?.text || "")) && !/\bjournali[sz]e|\bjournal entry\b/i.test(String(q?.text || ""));
  if (particularsTwice || (toAndBy && !journalMarks)) return "ledger";
  if (asksLedger && !journalMarks) return "ledger";
  return "journal";
}

// Is this a "table" question that is really another type?
export const isTablelessTableQuestion = (q) => q?.type === "table" && !hasRealTable(q?.tableRows);

// Does the table GIVE AWAY the answer? The correct option's value appears in a
// table cell — e.g. "By Capital A/c 15,000" / "Total 15,000" when the question
// asks for the total 15,000. Numbers are compared without commas / ₹; text
// options must match a whole cell. Then there is nothing left to work out.
const normCell = (v) => String(v ?? "").replace(/\$|₹|rs\.?|,|\s+/gi, "").replace(/\.0+$/, "").toLowerCase();
export function tableRevealsAnswer(q) {
  const rows = Array.isArray(q?.tableRows) ? q.tableRows : [];
  const opts = Array.isArray(q?.options) ? q.options : [];
  if (!rows.length || !Number.isInteger(q?.correct) || q.correct < 0 || q.correct >= opts.length) return "";
  const ans = String(opts[q.correct] ?? "").trim();
  const key = normCell(ans);
  if (!key || key.length < 2) return "";
  const cells = rows.slice(1).flat().map(normCell); // the header row can name things freely
  return cells.includes(key) ? ans : "";
}
