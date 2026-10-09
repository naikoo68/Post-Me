// Decide whether a question has all the CONTENT its type needs to render a
// correct card. The auto-poster (Facebook/Instagram — post, reel, story) uses
// this to SKIP incomplete questions instead of publishing a broken/half-empty
// card (e.g. a flashcard with a blank answer, or an MCQ with a missing option).
//
// "Complete" is defined per question type, matching what the card actually
// draws (see config/socialImage.js and the /q-card + /flashcard pages):
//   • every question:      a non-empty stem (text)
//   • answer options:      present, none blank, with a valid `correct` index
//   • statement:           the statements list (columnA)
//   • matching/pair types: BOTH columns (columnA + columnB)
//   • assertion:           both the assertion AND the reason
//   • table:               a table with a header and at least one data row
//   • rearrange:           at least 2 sentences (columnA)
//   • diagram / image:     the diagram spec / the image
//   • journal / ledger:    nothing extra — their journal entries / T-accounts ARE
//                          the options (pipe tables), checked like any options
// Anything not required by a type is left alone (e.g. we don't force an image
// on an image question or key-points on a flashcard — only the content whose
// absence would visibly break the card).

import { tableRevealsAnswer, hasRealTable } from "./tableType.js";

const FIXED_AR = [
  "Both A and R are true and R is the correct explanation of A",
  "Both A and R are true but R is NOT the correct explanation of A",
  "A is true but R is false",
  "A is false but R is true",
];

// Question types whose card shows the two matching columns to the student.
const COLUMN_TYPES = new Set(["matching", "pair", "pairselect"]);

const asText = (v) => String(v ?? "").trim();
const isFilled = (v) => asText(v) !== "";
// An array counts as filled only when it has at least one entry and NONE of its
// entries are blank — so "one missing option/statement" is treated as missing.
const isArrFilled = (a) => Array.isArray(a) && a.length > 0 && a.every(isFilled);

// A table is usable when it has a header row plus at least one data row and no
// row is completely empty. Single blank CELLS are normal — a corner header
// cell, an empty "Date" / "J.F." column, the unused side of a T-account — and
// must not make a complete table look incomplete.
function isTableFilled(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return false;
  return rows.every((row) => Array.isArray(row) && row.some(isFilled));
}

// Returns { ok: true } when the question can be safely posted, or
// { ok: false, reason } listing the missing content (for logs / admin notices).
export function isQuestionComplete(q) {
  if (!q || typeof q !== "object") return { ok: false, reason: "missing question" };

  const type = asText(q.type) || "mcq";
  const missing = [];

  // Every card renders the stem.
  if (!isFilled(q.text)) missing.push("question text");

  // Answer options + a valid correct index. Every quiz question type in this
  // app presents options as the answer choices, so this applies across types.
  let options = Array.isArray(q.options) ? q.options : [];
  // Fixed-choice types: Assertion–Reason always has the same 4 choices, and a
  // complete 3- or 4-row Pair (count) question its "Only one pair … All four
  // pairs" choices — the site shows those automatically when the saved options
  // are blank (frontend displayOptions), so blank options are NOT missing.
  if (!options.some(isFilled)) {
    if (type === "assertion") options = FIXED_AR;
    else if (type === "pair" && Array.isArray(q.columnA) && Array.isArray(q.columnB) && q.columnA.length === q.columnB.length && [3, 4].includes(q.columnA.length)) options = ["1", "2", "3", "4"];
  }
  if (options.length === 0 || options.some((o) => !isFilled(o))) {
    missing.push("options");
  } else if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < options.length)) {
    missing.push("correct answer");
  }

  // Type-specific content shown on the card.
  if (type === "statement") {
    if (!isArrFilled(q.columnA)) missing.push("statements");
    else if (q.columnA.length < 2) missing.push("a second statement (only one)");
  } else if (COLUMN_TYPES.has(type)) {
    if (!isArrFilled(q.columnA)) missing.push("column A");
    if (!isArrFilled(q.columnB)) missing.push("column B");
    // Only ONE pair / match can't be a real question (2 or more are fine).
    if ((Array.isArray(q.columnA) && q.columnA.length === 1) || (Array.isArray(q.columnB) && q.columnB.length === 1)) missing.push("a second pair (only one)");
  } else if (type === "assertion") {
    if (!isFilled(q.assertion)) missing.push("assertion");
    if (!isFilled(q.reason)) missing.push("reason");
  } else if (type === "table" && !hasRealTable(q.tableRows)) {
    // Saved as "Table" but has no table: it's really a normal MCQ (it renders
    // and narrates as one), so it isn't skipped. Find Incomplete offers
    // "Change to MCQ" to fix the label.
  } else if (type === "table") {
    if (!isTableFilled(q.tableRows)) missing.push("table rows");
    else if (tableRevealsAnswer(q)) missing.push("a table without the answer in it");
  } else if (type === "rearrange") {
    if (!Array.isArray(q.columnA) || q.columnA.filter(isFilled).length < 2) missing.push("sentences to rearrange");
  } else if (type === "diagram") {
    if (!q.viz && !q.graph) missing.push("diagram");
  } else if (type === "image") {
    if (!isFilled(q.image)) missing.push("image");
  }

  return missing.length ? { ok: false, reason: `missing ${missing.join(", ")}` } : { ok: true };
}
