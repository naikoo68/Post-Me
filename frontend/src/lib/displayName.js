// Admins put an ORDER PREFIX in front of names to sort them — "A) Cash Book",
// "B) Journal Entries", "(C) JKSSB", "1) Intro", "12. Ledger". Visitors should
// see only "Cash Book", in the same order. (Backend twin: utils/displayName.js.)
//
// Deliberately strict, because the public transform runs on every name the
// site shows: only "A)" / "(A)" / "AB)" / "1)" / "(1)" / "12." (number + dot +
// space). A lone LETTER + dot ("A. Kumar", "U.S. History") is never touched, so
// people's initials and abbreviations are safe. Never returns "" for a non-empty name.
const ORDER_PREFIX = /^\s*(?:\(\s*(?:[A-Za-z]{1,2}|\d{1,3})\s*\)|(?:[A-Za-z]{1,2}|\d{1,3})\s*\)|\d{1,3}\.(?=\s))\s*/;

export function displayName(name) {
  const s = String(name ?? "");
  const t = s.trim();
  if (!t) return s;
  const out = t.replace(ORDER_PREFIX, "").trim();
  return out || t;
}

// "A) JKSSB › B) Accounting › C) Cash Book" → "JKSSB › Accounting › Cash Book".
export function displayTrail(label) {
  return String(label ?? "").split(/(\s*[›|]\s*)/).map((p, i) => (i % 2 ? p : displayName(p))).join("");
}
