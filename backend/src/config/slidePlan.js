import { displayName, displayTrail } from "../utils/displayName.js";
// Build the SLIDE PLAN (what each slide shows + what the narrator says) for one
// question. Every question becomes exactly TWO slides — the question, then the
// answer reveal — and it adapts to the question TYPE (it never assumes a plain
// MCQ): assertion/reason, statements and matching columns are shown on the
// question slide with the options. PURE logic (no I/O). The renderer
// (slideRender.js) draws each slide; the TTS service speaks each `narration`.

const LETTERS = ["A", "B", "C", "D", "E", "F"];
import { readFileSync } from "node:fs";
import wordListPath from "word-list";
import { stripNarrationPauses } from "../utils/narrationPauses.js";
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

const asText = (v) => String(v ?? "").trim();
const isFilled = (v) => asText(v) !== "";
const arr = (a) => (Array.isArray(a) ? a.filter((x) => isFilled(x)) : []);

// ---- Words the narrator should NOT read as written ----

// Hindi glosses in brackets are for the screen only: "cash book (रोकड़ बही)"
// and the romanised ones written as math, "cash book ($Rokar-bahi$)" /
// "$(Samayojanpravishti)$", are dropped from the narration. (Plain English
// brackets like "(ITZ)" or "(25 marks)" are kept.)
const ROMANISED_WORDS = (t) => /^[A-Za-z\s\-–'’.]+$/.test(t) && /[A-Za-z]{4,}/.test(t);
// Is a bracket's text a Hindi meaning written in English letters —
// "(Ghata Budget)", "(Santulit Budget)", "(Rokar bahi)"? Yes when, ignoring
// words it shares with the term before it ("Budget"), at least half of its
// words aren't English. Real English brackets — "(excluding borrowings)",
// "(25 marks)", "(ITZ)" — are kept. Names in brackets may also be skipped.
let ENGLISH = null;
function englishWords() {
  if (!ENGLISH) {
    try { ENGLISH = new Set(readFileSync(wordListPath, "utf8").split("\n")); }
    catch { ENGLISH = new Set(); } // no dictionary → never drop plain-letter brackets
  }
  return ENGLISH;
}
// Brackets that introduce an English alternative name are always read:
// "Mumbai (formerly Bombay)", "(also called …)", "(now Kolkata)".
const KEEP_LEAD = /^(?:formerly|earlier|previously|originally|now|also|old name|known as|aka|or|i\.e\.?|e\.g\.?)\b/i;
const QUOTES = /^[\s'"‘’“”`]+|[\s'"‘’“”`]+$/g;
// Any Indian-language or Urdu script. No narrator voice speaks these (they are
// all English voices), so such text is never read aloud.
const INDIC_CHARS = "\u0600-\u06FF\u0750-\u077F\u0900-\u0DFF\uA8E0-\uA8FF\u1CD0-\u1CFF\uFB50-\uFDFF\uFE70-\uFEFF\u200C\u200D";
const HAS_INDIC = new RegExp(`[${INDIC_CHARS}]`);
const INDIC_RUN = new RegExp(`\\s*(?:[/|:–—-]\\s*)?[${INDIC_CHARS}]+(?:[\\s\\d.,;:!?'"“”‘’()\\-–—/|]*[${INDIC_CHARS}]+)*[?!.।॥]*`, "g");

// Is one bracket part a Hindi meaning written in English letters —
// "(bima vyay)", "('bahulak')", "(Rokar bahi)", "(Ghata Budget)"? Names and
// places in brackets — "(New Delhi)", "(Jawaharlal Nehru)", "(Calcutta)" — are
// NOT: they are also missing from the English dictionary, so a "foreign word"
// alone isn't enough. A part is a gloss only when at least half of its own
// words (ignoring words shared with the term before it) aren't English AND
//   • it is quoted ("('bahulak')"), or
//   • it repeats a word of the term before it ("Deficit Budget (Ghata Budget)"), or
//   • it has 2+ words and a non-English one is in lower case ("(bima vyay)",
//     "(Rokar bahi)") — names are written Capitalised, and a single lower-case
//     word is usually a newer English word or term ("(selfie)", "(upi)",
//     "(hundi)"), so it is read.
export function isRomanisedGloss(inner, before = "") {
  const raw = String(inner || "").trim();
  const t = raw.replace(QUOTES, "");
  const quoted = t !== raw && t.length > 0;
  if (!t || KEEP_LEAD.test(t)) return false;
  if (!/^[A-Za-z][A-Za-z\s\-–'’]*$/.test(t)) return false;  // letters only (no numbers, "/", ".")
  const words = t.split(/[\s\-–]+/).filter(Boolean);
  if (words.length > 6 || words.every((w) => /^[A-Z]{2,}$/.test(w))) return false; // long text / acronyms
  const dict = englishWords();
  if (!dict.size) return false;
  const prev = new Set(String(before).toLowerCase().split(/[^a-z]+/).filter(Boolean).slice(-8));
  const norm = (w) => w.toLowerCase().replace(/[’']s$/, "").replace(/['’]/g, "");
  const own = words.filter((w) => !prev.has(norm(w)));
  if (!own.length) return false;
  const foreign = own.filter((w) => norm(w).length >= 3 && !dict.has(norm(w)));
  if (!foreign.length || foreign.length / own.length < 0.5) return false;
  const shared = own.length < words.length;
  const lowerForeign = own.length >= 2 && foreign.some((w) => /^[a-z]/.test(w));
  return quoted || shared || lowerForeign;
}

// One bracket's text → what the narrator keeps of it ("" = drop the bracket).
// Parts split by ";" / "," are judged one by one, so
// "(income from secondary activities; 'gair-sanchalan aay')" keeps the English.
function keepOfBracket(inner, before) {
  const parts = String(inner).split(/(\s*[;,]\s*)/);
  const kept = [];
  for (let i = 0; i < parts.length; i += 2) {
    let part = parts[i];
    if (HAS_INDIC.test(part)) {
      // "(Cash book / रोकड़ बही)" → "Cash book"; Hindi only → dropped.
      part = part.replace(INDIC_RUN, "").replace(/^[\s/|:–—-]+|[\s/|:–—-]+$/g, "");
      if (!/[A-Za-z0-9]/.test(part)) continue;
    }
    if (!part.trim() || isRomanisedGloss(part, before)) continue;
    kept.push({ part: part.trim(), sep: parts[i - 1] || "" });
  }
  return kept.map((k, i) => (i ? k.sep.trim() + " " : "") + k.part).join("").trim();
}

export function dropBracketGlosses(input) {
  let s = String(input ?? "");
  // (Ghata Budget) / (bima vyay; 'vyay') / [रोकड़ बही] — plain brackets (no math).
  s = s.replace(/\s*([([])([^()[\]$\\]*)([)\]])/g, (m, open, inner, close, offset, all) => {
    const keep = keepOfBracket(inner, all.slice(Math.max(0, offset - 80), offset));
    if (!keep) return "";
    return keep === inner.trim() ? m : `${m.match(/^\s*/)[0]}${open}${keep}${close}`;
  });
  // ($Rokar-bahi$)
  s = s.replace(/\s*[([]\s*\$([^$]*)\$\s*[)\]]/g, (m, inner) => (ROMANISED_WORDS(inner.trim()) ? "" : m));
  // $(Rokar-bahi)$
  s = s.replace(/\s*\$\s*[([]([^$()[\]]*)[)\]]\s*\$/g, (m, inner) => (ROMANISED_WORDS(inner.trim()) ? "" : m));
  // Any Hindi / other Indian-script text left outside brackets ("Cash Book /
  // रोकड़ बही", a Hindi line under the English question) is never read.
  s = s.replace(INDIC_RUN, "");
  return s;
}

// Roman numerals → numbers, so "Statements I and II" is read "1 and 2", not
// the word "I". II, III, IV, VI… are always numbers; a lone I / V / X only
// where it clearly is one (after "Statement", "Column", "List", "Part"…, next
// to another numeral "I and II", after "only" / "both", "1-I" in a matching
// option, "(I)", or "I." at the start) — so the pronoun "I" and the variables
// "X" / "V" are left alone. "(ii)" / "(iv)" in lower case → "(2)" / "(4)".
const ROMAN_VAL = { I: 1, V: 5, X: 10, L: 50 };
function romanToInt(r) {
  let n = 0;
  for (let i = 0; i < r.length; i++) {
    const v = ROMAN_VAL[r[i]], next = ROMAN_VAL[r[i + 1]] || 0;
    n += v < next ? -v : v;
  }
  return n;
}
function intToRoman(n) {
  const T = [[50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, r] of T) while (n >= v) { out += r; n -= v; }
  return out;
}
const isRoman = (t) => /^[IVXL]+$/.test(t) && romanToInt(t) > 0 && romanToInt(t) <= 50 && intToRoman(romanToInt(t)) === t;
const KEYWORDS = /(?:statements?|columns?|lists?|parts?|types?|class|classes|phases?|papers?|chapters?|schedules?|articles?|stages?|grades?|sections?|units?|categor(?:y|ies)|sentences?|pairs?|groups?|steps?|levels?|books?|volumes?|plans?|world war|options?|complex(?:es)?|photosystems?|tiers?|periods?|generations?|rounds?|divisions?|trials?|sectors?|zones?|acts?|amendments?|models?|series|forms?|orders?|rules?|cases?|figures?|tables?|regions?|blocks?|only|both|neither|either|and|or|nor)\s*$/i;
// "Can I" / "Do I" … — the pronoun "I" at the end of a question, not a numeral.
const PRONOUN_BEFORE = /\b(?:am|can|could|do|did|does|have|had|may|might|must|shall|should|will|would|was|were|where|what|who|how|when|why|if|then|so|and|but|that|which|than|as)\s*$/i;
const CONNECT = /^\s*(?:,|&|\/|-|–|—|\band\b|\bor\b|\bnor\b|\bto\b)\s*$/i;
export function speakRomanNumerals(input) {
  let s = String(input ?? "");
  // Lower-case list markers: "(ii)" → "(2)".
  s = s.replace(/\((i{1,3}|iv|vi{0,3}|ix|x)\)/g, (m, r) => `(${romanToInt(r.toUpperCase())})`);
  const ms = [...s.matchAll(/\b[IVXL]+\b/g)].filter((m) => isRoman(m[0]));
  if (!ms.length) return s;
  const single = (t) => t === "I" || t === "V" || t === "X" || t === "L";
  const yes = ms.map((m) => {
    const t = m[0];
    if (!single(t)) return true; // II, III, IV, VI, … always numbers
    const before = s.slice(0, m.index), after = s.slice(m.index + t.length);
    if (t === "L") return false;
    if (/(?:\d\s*[-–]\s*)$/.test(before)) return true;                 // "1-I"
    if (/\(\s*$/.test(before) && /^\s*\)/.test(after)) return true;     // "(I)"
    if (/^\s*$/.test(before) && /^\s*[.:)]/.test(after)) return true;   // "I. …" at the start
    if (/^\s*only\b/i.test(after)) return true;                          // "I only"
    // "Complex I", "Photosystem I", "Henry V" — a Capitalised name right before
    // it and nothing after (end of the option / a "." "," ")" …) → a numeral.
    if (/\b[A-Z][a-z]{2,}\s+$/.test(before) && !PRONOUN_BEFORE.test(before) && /^\s*(?:$|[.,;:!?)\]])/.test(after)) return true;
    // "Statement I", "only I" — but "and"/"or" alone need a numeral next to them (below).
    const kw = before.match(KEYWORDS);
    return !!(kw && !/^(?:and|or|nor)$/i.test(kw[0].trim()));
  });
  // A lone I / V / X joined to a numeral ("I and II", "II, V") is one too.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < ms.length; i++) {
      if (yes[i]) continue;
      const near = (j) => {
        if (j < 0 || j >= ms.length || !yes[j]) return false;
        const [a, b] = j < i ? [ms[j], ms[i]] : [ms[i], ms[j]];
        return CONNECT.test(s.slice(a.index + a[0].length, b.index));
      };
      if (near(i - 1) || near(i + 1)) yes[i] = true;
    }
  }
  let out = "", last = 0;
  ms.forEach((m, i) => {
    if (!yes[i]) return;
    out += s.slice(last, m.index) + String(romanToInt(m[0]));
    last = m.index + m[0].length;
  });
  return out + s.slice(last);
}

// Chemical formulas are spelled letter by letter: "CO_2" / "CO₂" / "CO2" →
// "C O 2", "H_2SO_4" → "H 2 S O 4" (a voice read "CO2" as the word "ko 2").
// Only tokens made of REAL element symbols with a number in them, so "MP3",
// "G20", "COVID19" or "B12" are left alone (B12: one element, a plain number).
const ELEMENTS = new Set(("H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr " +
  "Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt " +
  "Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr").split(" "));
const SUB_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
export function speakChemicalFormulas(input) {
  return String(input ?? "").replace(/(?<![A-Za-z0-9_])(?:[A-Z][a-z]?(?:_\{\d+\}|_\d+|[₀-₉]+|\d+)?){1,10}(?![A-Za-z0-9_₀-₉])/g, (tok) => {
    const parts = [...tok.matchAll(/([A-Z][a-z]?)(_\{(\d+)\}|_(\d+)|([₀-₉]+)|(\d+))?/g)];
    if (!parts.length || !parts.every((m) => ELEMENTS.has(m[1]))) return tok;
    const hasNum = parts.some((m) => m[2]);
    const subscriptMark = parts.some((m) => m[3] || m[4] || m[5]); // "_2" / "₂" = clearly a formula
    if (!hasNum || (parts.length < 2 && !subscriptMark)) return tok;
    return parts.map((m) => {
      const letters = m[1].toUpperCase().split("").join(" ");
      const n = m[3] || m[4] || (m[5] ? [...m[5]].map((c) => SUB_DIGITS.indexOf(c)).join("") : "") || m[6] || "";
      return n ? `${letters} ${n}` : letters;
    }).join(" ");
  });
}

// Strip LaTeX / markup so the TTS voice reads clean, natural language rather
// than "$", backslashes and braces. Keeps the words; drops the notation.
export function toSpeech(input) {
  // Screen-only Hindi glosses go first (before the "$" math marks are removed).
  let s = dropBracketGlosses(String(input || ""));
  // Bold / italic markers are for the screen only: "**Vibrant Villages
  // Programme**", "__term__", "*word*" — the voice read the stars aloud
  // ("asterisk asterisk"). Keep the words, drop the markers. A lone "*"
  // between numbers ("2 * 3") is multiplication and is read as "times".
  s = s.replace(/\*\*([^*]+?)\*\*/g, "$1").replace(/__([^_]+?)__/g, "$1")
    .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\w)/g, "$1$2")
    .replace(/(\d)\s*\*\s*(\d)/g, "$1 times $2")
    .replace(/\*+/g, " ");
  // "statement(s) … is/are correct" → "statements … are correct" (a voice
  // would otherwise say "statement s" / "is slash are").
  s = s.replace(/(\w)\(s\)/g, "$1s").replace(/\bis\s*\/\s*are\b/gi, "are").replace(/\bhas\s*\/\s*have\b/gi, "have");
  // Accounting shorthand: "Cash A/c Dr." → "Cash account debit", "₹50,000" → "rupees 50,000".
  s = s.replace(/\bA\/c\b/gi, "account").replace(/\bDr\.(?=\s|$|,)/g, "debit").replace(/\bCr\.(?=\s|$|,)/g, "credit");
  s = s.replace(/₹\s*/g, "rupees ");
  s = s.replace(/\{,\}/g, ","); // "25{,}000" (math-formatted number) → "25,000"
  s = s.replace(/\$/g, " ");
  s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1 over $2");
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "square root of $1");
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");
  s = speakChemicalFormulas(s); // "CO_2" → "C O 2" (before "_2" becomes " 2")
  s = s.replace(/\^\{?([A-Za-z0-9+\-]+)\}?/g, " to the power $1");
  s = s.replace(/_\{?([A-Za-z0-9+\-]+)\}?/g, " $1");
  s = s.replace(/\\times/g, " times ").replace(/\\div/g, " divided by ");
  s = s.replace(/\\pm/g, " plus or minus ").replace(/\\cdot/g, " times ");
  s = s.replace(/\\rightarrow|\\to/g, " gives ").replace(/\\leftarrow/g, " from ");
  // Arrows in sequences ("Organism → Population") become a short pause
  // instead of being read out as "right arrow".
  s = s.replace(/\s*(?:→|->|⟶|⇒)\s*/g, ", ");
  // "Rust = Iron + Oxygen" (quick-recall style) → read the "=" as a word.
  s = s.replace(/\s*=\s*/g, " equals ");
  s = s.replace(/\\[a-zA-Z]+/g, " "); // any remaining commands
  s = s.replace(/[{}\\]/g, " ");
  s = speakRomanNumerals(s);
  // A math span ending at a full stop leaves "20,000 ." — drop the space.
  return s.replace(/\s+/g, " ").replace(/ ([.,;:!?])(?=\s|$)/g, "$1").trim();
}

// Shorten text to at most `max` characters, cutting at the last full sentence
// that fits (or a word boundary with "…" if no sentence fits).
export function clipSentences(text, max) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (end > max * 0.4) return cut.slice(0, end + 1).trim();
  return cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max).trim() + "…";
}

// End a spoken fragment with exactly one full stop (avoids "sea level.." when
// the source text already ends with punctuation).
const said = (t) => {
  const x = toSpeech(t).replace(/[\s.;:,]+$/, "");
  return x ? (/[!?]$/.test(x) ? x : `${x}.`) : "";
};

// ---- Mirrors of the frontend display helpers (frontend/src/lib/questions.js
// and StatementPairView) so the narration matches the slide exactly. ---------

// Split a column saved as one "1. a 2. b" blob; strip leading "1." / "I." markers.
// (?!\d): "6.5%" is a number, not a "6." list marker.
const LEADING_MARKER = /^\s*(?:[IVXLC]{1,5}|\d{1,2})\s*[.)](?!\d)\s*/i;
export function normalizeColumn(list) {
  const items = (Array.isArray(list) ? list : []).map((x) => asText(x)).filter(Boolean);
  if (items.length >= 2) return items.map((x) => x.replace(LEADING_MARKER, "").trim());
  if (items.length === 1) {
    const split = items[0].replace(/\s+/g, " ").split(/\s+(?=(?:[IVXLC]{1,5}|\d{1,2})[.)]\s)/g)
      .map((p) => p.replace(LEADING_MARKER, "").trim()).filter(Boolean);
    if (split.length >= 2) return split;
  }
  return items;
}

const ASSERTION_REASON_OPTIONS = [
  "Both A and R are true and R is the correct explanation of A",
  "Both A and R are true but R is NOT the correct explanation of A",
  "A is true but R is false",
  "A is false but R is true",
];
const NUMBER_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight"];
function pairCountOptions(n) {
  if (n >= 4) return ["Only one pair", "Only two pairs", "Only three pairs", `All ${NUMBER_WORDS[n - 1] || n} pairs`];
  const out = [];
  for (let k = 1; k < n; k++) out.push(`Only ${NUMBER_WORDS[k - 1]} pair${k === 1 ? "" : "s"}`);
  out.push(`All ${NUMBER_WORDS[n - 1] || n} pairs`, "None of the pairs");
  return out;
}
// The options the slide DISPLAYS (rebuilds the fixed assertion / pair-count
// choices when a question was saved with blank option text).
export function displayOptions(q) {
  const opts = Array.isArray(q?.options) ? q.options : [];
  if (q?.type === "assertion" && !(opts.length === 4 && opts.every(isFilled))) return ASSERTION_REASON_OPTIONS.slice();
  if (q?.type === "pair" && (opts.length === 0 || opts.every((o) => !isFilled(o)))) {
    const a = normalizeColumn(q.columnA), b = normalizeColumn(q.columnB);
    if (a.length === b.length && [3, 4].includes(a.length)) return pairCountOptions(a.length);
  }
  return opts;
}

// The stem shown for an assertion question drops an embedded "Assertion (A): …"
// copy when A and R have their own fields (they're read separately).
// The "(A)" / "(R)" markers in an Assertion–Reason QUESTION are for reading
// on screen only — the narrator says "Assertion … Reason …", not "Assertion A
// … Reason R". Used for the question text only; the options are read as
// written ("Both A and R are true…"). Pure.
export function dropAssertionReasonMarks(text) {
  return String(text ?? "")
    // "Assertion (A)", "Reason (R)", "assertion(a):" → "Assertion", "Reason"
    .replace(/\b(Assertions?|Reasons?)\s*\(\s*[ARar]\s*\)/g, "$1")
    // a lone "(A):" / "(R) -" starting a line or the text
    .replace(/(^|\n)\s*\(\s*[AR]\s*\)\s*[:.\-–]?\s*/g, "$1");
}
const saidQ = (t) => said(dropAssertionReasonMarks(t)); // a QUESTION part, spoken

function stemText(q) {
  const text = asText(q?.text);
  if (q?.type !== "assertion" || !(q?.assertion && q?.reason)) return text;
  const idx = text.search(/\bAssertion\b\s*(?:\([Aa]\))?\s*[:-]/);
  if (idx === -1) return text;
  return text.slice(0, idx).trim() || "Consider the following Assertion (A) and Reason (R):";
}

// The prompt shown under the statements / pairs list.
export function closingPrompt(type) {
  if (type === "statement") return "Which of the statement(s) given above is/are correct?";
  if (type === "pair") return "How many of the above pairs are correctly matched?";
  if (type === "pairselect") return "Which of the pairs given above is/are correctly matched?";
  if (type === "rearrange") return "Choose the correct order of the sentences:";
  return "";
}
// Rearrange sentences are labelled with the scheme the options use (letters or Roman).
function rearrangeLabels(q) {
  const opts = arr(q?.options).join(" ");
  const hasRoman = /\b(?:I{1,3}|IV|VI{0,3}|IX|X)\b/.test(opts);
  const hasLetters = /\b[A-H]\b/.test(opts);
  return hasLetters && !hasRoman ? LETTERS.concat(["G", "H"]) : ROMAN.concat(["VII", "VIII"]);
}

// Speak a "(s)" / "is/are" prompt naturally: "statement(s)" → "statements",
// "is/are" → "are".
const speakPrompt = (t) => said(t); // toSpeech turns "(s)" / "is/are" into natural words

// An accounting option stored as a pipe table ("Date | Particulars | … |")
// → "Particulars: Cash A/c, Debit: 5000. …" instead of reading the pipes.
function speakPipeTable(s) {
  const rows = String(s || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l.includes("|"))
    .map((l) => {
      let p = l.split("|");
      if (l.startsWith("|") && l.endsWith("|")) p = p.slice(1, -1);
      return p.map((c) => c.trim());
    })
    .filter((cells) => !cells.every((c) => c === "" || /^:?-{2,}:?$/.test(c)));
  if (rows.length < 2) return "";
  const looksHeader = /account|particular|debit|credit|amount|dr\.?|cr\.?|date|\blf\b/i.test(rows[0].join(" "));
  const header = looksHeader ? rows[0] : ["Account", "Debit", "Credit"];
  const body = looksHeader ? rows.slice(1) : rows;
  // Column names spoken as words; "LF"/"J.F." (folio) columns are skipped.
  const spokenHeader = header.map((h) => {
    const x = String(h || "").trim();
    if (/^(?:l\.?\s*f\.?|j\.?\s*f\.?)$/i.test(x)) return null;
    if (/\b(?:dr\.?|debit)\b/i.test(x)) return "Debit";
    if (/\b(?:cr\.?|credit)\b/i.test(x)) return "Credit";
    if (/particular|account/i.test(x)) return "";
    return x;
  });
  return body.map((r) => r.map((c, i) => {
    if (!c || spokenHeader[i] === null) return "";
    return spokenHeader[i] ? `${spokenHeader[i]} ${c}` : c;
  }).filter(Boolean).join(", "))
    .filter(Boolean).map(said).join(" ");
}
const speakOption = (t) => speakPipeTable(t) || said(t);

// Silence between the option letters of a journal / ledger question.
export const OPTION_PAUSE_SEC = 0.7;

// Journal-entry / ledger questions (or any question whose options are pipe
// tables): reading whole T-accounts / journal tables aloud is long and
// impossible to follow by ear, so the narrator reads ONLY the question text and
// then just the option letters ("Option A. Option B. …"). The tables are still
// shown on screen. Pure.
const isPipeTableText = (t) => String(t || "").split(/\r?\n/).filter((l) => l.includes("|")).length >= 2;
export function isAccountingTableQuestion(q) {
  const type = asText(q?.type);
  if (type === "journal" || type === "ledger") return true;
  return displayOptions(q || {}).some((o) => isPipeTableText(asText(o)));
}
// Drop pipe-table lines ("| Date | Particulars | … |") from text before it is
// spoken, keeping the surrounding sentences. Pure.
export function dropPipeTableLines(text) {
  return String(text ?? "").split(/\r?\n/).filter((l) => !l.includes("|")).join("\n").trim();
}

// Everything the QUESTION slide shows for `q`, for every question type, in the
// on-screen order (stem → columns / statements / pairs / table / figure /
// assertion-reason → closing prompt → options). Returns:
//   { speech, lead, columns, options: [{ badge, text, spokenBadge, spoken }] }
// (`lead` / `columns` feed the fallback SVG slide.)
export function questionSpeechParts(q) {
  const type = asText(q?.type) || "mcq";
  const stem = stemText(q) || "Question";
  const lead = [{ text: stem, emphasis: true }];
  // Journal / ledger: speak the question sentence(s) only — no tables.
  const lettersOnly = isAccountingTableQuestion(q);
  // Tables are NEVER read aloud (any question type): pipe-table lines in the
  // question text are dropped, and a "table" question's rows are skipped —
  // the viewer reads the table on screen; the narrator goes on to the options.
  const speech = [saidQ(dropPipeTableLines(stem) || "Question")];
  let columns = null;
  const colA = normalizeColumn(q?.columnA);
  const colB = normalizeColumn(q?.columnB);

  if (type === "matching" && (colA.length || colB.length)) {
    columns = {
      a: colA.map((t, i) => ({ badge: String(i + 1), text: t })),
      b: colB.map((t, i) => ({ badge: ROMAN[i] || String(i + 1), text: t })),
    };
    if (colA.length) speech.push("Column A: " + colA.map((t, i) => `${i + 1}, ${said(t)}`).join(" "));
    // Spoken as numbers ("1, …") — a voice reads "I" as the word "I".
    if (colB.length) speech.push("Column B: " + colB.map((t, i) => `${i + 1}, ${said(t)}`).join(" "));
  }

  if ((type === "statement" || type === "rearrange") && colA.length) {
    const labels = type === "rearrange" ? rearrangeLabels(q) : null;
    colA.forEach((t, i) => {
      const label = labels ? labels[i] || String(i + 1) : String(i + 1);
      lead.push({ text: `${label}. ${t}` });
      speech.push(`${type === "rearrange" ? "Sentence" : "Statement"} ${label}: ${said(t)}`);
    });
  } else if ((type === "pair" || type === "pairselect") && (colA.length || colB.length)) {
    const n = Math.max(colA.length, colB.length);
    for (let i = 0; i < n; i++) {
      const a = colA[i] || "", b = colB[i] || "";
      if (!a && !b) continue;
      lead.push({ text: `${i + 1}. ${a} — ${b}` });
      speech.push(`Pair ${i + 1}: ${toSpeech(a)}, ${said(b)}`);
    }
  }
  const prompt = closingPrompt(type);
  const hasList = (type === "statement" || type === "rearrange") ? colA.length : (colA.length || colB.length);
  if (prompt && hasList) { lead.push({ text: prompt, muted: true }); speech.push(speakPrompt(prompt)); }


  // Figures can't be read aloud — point the viewer at them.
  const vizTitle = asText(q?.viz?.title || q?.graph?.title);
  if (q?.image || q?.graph || q?.viz) speech.push(vizTitle ? `Look at the figure: ${said(vizTitle)}` : "Look at the figure shown.");

  if (type === "assertion" && (isFilled(q.assertion) || isFilled(q.reason))) {
    if (isFilled(q.assertion)) { lead.push({ label: "Assertion (A)", text: asText(q.assertion) }); speech.push(`Assertion: ${saidQ(q.assertion)}`); }
    if (isFilled(q.reason)) { lead.push({ label: "Reason (R)", text: asText(q.reason) }); speech.push(`Reason: ${saidQ(q.reason)}`); }
  }

  if (type === "matching") speech.push("Choose the correct matching sequence.");

  // Options exactly as displayed: matching uses (A), (B)…; others A, B….
  const options = displayOptions(q).map((t, i) => {
    const text = asText(t);
    const badge = type === "matching" ? `(${String.fromCharCode(65 + i)})` : LETTERS[i] || String(i + 1);
    const spokenBadge = type === "matching" ? String.fromCharCode(65 + i) : badge;
    // Letters-only questions leave `spoken` empty → "Option A." with no details.
    return { badge, text, spokenBadge, spoken: lettersOnly ? "" : speakOption(text) };
  }).filter((o) => o.text);

  return { speech: speech.filter(Boolean).join(" "), lead, columns, options, lettersOnly };
}

// The index / letter of the correct option, if valid.
// Uses the DISPLAYED options, unfiltered, so `correct` still points at the right
// one (filtering blanks would shift the index).
function correctInfo(q) {
  const opts = displayOptions(q);
  const idx = Number.isInteger(q.correct) ? q.correct : -1;
  if (idx < 0 || idx >= opts.length) return null;
  return { index: idx, letter: LETTERS[idx] || String(idx + 1), text: asText(opts[idx]) };
}

// Human topic label for the intro slide ("Subject — Topic" style).
function topicLabel(q, opts = {}) {
  // Order prefixes ("A) Basic Terms") are dropped — only the name is shown / read.
  const bits = [displayTrail(asText(opts.subjectName)), displayName(asText(q.section)), displayName(asText(q.topic))].filter(Boolean);
  // Dedupe while keeping order (subject/topic can repeat).
  const seen = new Set();
  const uniq = bits.filter((b) => (seen.has(b.toLowerCase()) ? false : seen.add(b.toLowerCase())));
  return uniq.slice(0, 2).join(" — ");
}

// What the narrator reads — admin toggles, every one ON by default:
//   question     slide 1: the question text (+ assertion/reason, statements, columns)
//   options      slide 1: every option ("Option A: …")
//   explanation  slide 2: the full explanation
//   keyPoints    slide 2: every key point
//   quickRecall  slide 2: the quick recall line
// (The "Question 2." intro and the correct answer are always read.) Accepts an
// object with those keys (missing / non-boolean → ON).
export const READ_PARTS = ["question", "options", "explanation", "keyPoints", "quickRecall"];
export function normalizeReadOptions(read) {
  const src = read && typeof read === "object" ? read : {};
  return Object.fromEntries(READ_PARTS.map((k) => [k, src[k] !== false]));
}

// The read options saved in the site settings (slideshowReadQuestion, …).
export function readOptionsFromSettings(site) {
  const s = site || {};
  return normalizeReadOptions({
    question: s.slideshowReadQuestion,
    options: s.slideshowReadOptions,
    explanation: s.slideshowReadExplanation,
    keyPoints: s.slideshowReadKeyPoints,
    quickRecall: s.slideshowReadQuickRecall,
  });
}

// Build the TWO slides for one question:
//   slide 1 "question" — the question with everything needed to answer it
//                        (assertion/reason, statements or matching columns, and
//                        the options), read aloud by the narrator;
//   slide 2 "answer"   — the correct answer, then the explanation, key points
//                        and quick recall.
// `role` tells the composer which on-screen time applies (questionSec /
// answerSec — minimums; a slide stays up until its narration ends). `opts` may
// carry { subjectName } for the small topic line, { index, total } when several
// questions share one video ("Question 2 of 5"), and { read } (see above).
export function buildSlidePlan(q, opts = {}) {
  const type = asText(q?.type) || "mcq";
  const stem = asText(q?.text) || "Question";
  const total = Math.max(1, Number(opts.total) || 1);
  const index = Math.max(1, Math.min(total, Number(opts.index) || 1));
  const ofN = total > 1 ? ` ${index} OF ${total}` : "";
  // WHAT the narrator reads (admin choice — see normalizeReadOptions). Every
  // part that's switched on is read IN FULL, never cut to fit the slide time:
  // the slide simply stays up until the narration finishes.
  const read = normalizeReadOptions(opts.read);

  // ---- Slide 1: the question ------------------------------------------------
  const topic = topicLabel(q || {}, opts);
  const meta = [topic, asText(q?.difficulty) || "Medium"].filter(Boolean).join("  ·  ");
  const lead = [{ text: meta, muted: true }]; // + the stem etc. from questionSpeechParts
  // Everything the question slide SHOWS, in the same order (see
  // questionSpeechParts) — so the narrator reads every line students see,
  // incl. the closing prompt ("Which of the statement(s) given above is/are
  // correct?") and "Choose the correct matching sequence".
  const parts = questionSpeechParts(q || {});
  lead.push(...parts.lead);
  const columns = parts.columns;
  const options = parts.options;
  let spoken = total > 1 ? `Question ${index}.` : "";
  if (read.question) spoken += ` ${parts.speech}`;
  // Journal / ledger (letters only): a short real pause between "Option A."
  // and "Option B." — said back to back they ran together.
  let pauses = false;
  if (read.options && options.length) {
    const sep = parts.lettersOnly ? ` [pause ${OPTION_PAUSE_SEC}] ` : " ";
    pauses = parts.lettersOnly && options.length > 1;
    spoken += " " + options.map((o) => (o.spoken ? `Option ${o.spokenBadge}: ${o.spoken}` : `Option ${o.spokenBadge}.`)).join(sep);
  }
  // Something must be spoken (the TTS needs text, and it times the slide).
  if (!spoken.trim()) spoken = "Here is the question.";

  const slides = [
    {
      id: "question",
      role: "question",
      tag: `QUESTION${ofN}`,
      accent: "brand",
      heading: "",
      lead,
      columns,
      options,
      body: [],
      narration: spoken.trim(),
      // The narration carries pause marks → spoken with real silences; the
      // caption is the text without them.
      ...(pauses ? { pauses: true, caption: stripNarrationPauses(spoken) } : {}),
    },
  ];

  // ---- Slide 2: the answer reveal -------------------------------------------
  // The correct answer is always read; the explanation, key points and quick
  // recall are read in full when switched on.
  const correct = correctInfo(q || {});
  const body = [];
  let answerSpoken = "";
  if (correct) {
    body.push({ text: `${correct.letter}. ${correct.text}`, emphasis: true, positive: true });
    // Journal / ledger: just the letter, not the table.
    answerSpoken = parts.lettersOnly
      ? `The correct answer is option ${correct.letter}.`
      : `The correct answer is option ${correct.letter}. ${speakOption(correct.text)}`;
  }
  const keyPoints = arr(q?.keyPoints).map(asText);
  const recall = isFilled(q?.quickRecall) ? asText(q.quickRecall) : "";
  if (isFilled(q?.explanation)) {
    // (On-screen text of the fallback SVG slide only — the normal slide shows
    // the full explanation.)
    body.push({ label: "Explanation", text: clipSentences(asText(q.explanation), 420) });
    // The explanation is read normally, even for journal / ledger questions.
    if (read.explanation) answerSpoken += ` Explanation: ${said(q.explanation)}`;
  }
  if (keyPoints.length && read.keyPoints) {
    answerSpoken += ` Key points: ${keyPoints.map((p) => said(p)).join(" ")}`;
  }
  // The fallback slide shows the quick recall, or the first key point.
  const recallOnScreen = recall || keyPoints[0] || "";
  if (recallOnScreen) body.push({ label: "Quick recall", text: clipSentences(recallOnScreen, 200) });
  if (recall && read.quickRecall) answerSpoken += ` Quick recall: ${said(recall)}`;
  slides.push({
    id: "answer",
    role: "answer",
    tag: `ANSWER${ofN}`,
    accent: "green",
    heading: correct ? `Correct Answer: ${correct.letter}` : "Answer",
    body,
    narration: answerSpoken.trim() || "Here is the answer.",
  });

  return slides;
}

// ---- Intro / outro slides (title + closing call-to-action). Pure. ----------
// An opening title slide for the video: subject / topic, "Let's begin".
// `narration` (optional) replaces the spoken line.
// showSubject / showTopic (default true): the intro can show (and say) only the
// topic, only the subject, or both. With both off it's a plain "Quiz Time".
export function introSlidePlan({ subject = "", topic = "", siteName = "", narration = "", showSubject = true, showTopic = true, heading: fixedHeading = "", line = "", defaultNarration = "" } = {}) {
  // A fixed heading (Marathon: "Top 1000 Questions of X" / "Marathon Quiz")
  // replaces the Subject — Topic title. The admin's narration still wins.
  if (asText(fixedHeading)) {
    const sub = asText(line) || "Let's begin!";
    return {
      id: "intro",
      role: "intro",
      tag: siteName ? asText(siteName) : "QUIZ",
      accent: "brand",
      heading: asText(fixedHeading),
      lines: [sub],
      body: [{ text: sub, emphasis: true }],
      narration: asText(narration) || asText(defaultNarration) || `${said(fixedHeading)} ${said(sub)}`,
    };
  }
  subject = showSubject === false ? "" : subject;
  topic = showTopic === false ? "" : topic;
  const title = [asText(subject), asText(topic)].filter(Boolean).join(" — ");
  const heading = title || "Quiz Time";
  return {
    id: "intro",
    role: "intro",
    tag: siteName ? asText(siteName) : "QUIZ",
    accent: "brand",
    heading,
    lines: ["Let's begin!"],
    body: [{ text: "Let's begin!", emphasis: true }],
    narration: asText(narration) || `${title ? `${said(title)} ` : ""}Let's begin the quiz.`,
  };
}

// Default spoken lines for the end slides (they match the end-slide templates).
export const DEFAULT_OUTRO_NARRATION = {
  full: "Thanks for watching! Subscribe, like and share for more.",
  short: "Thanks for watching! Subscribe, like and share for more. Watch the full quiz, visit the channel.",
};

// A closing slide. kind "short" → thanks + "watch the full quiz, visit the
// channel"; otherwise the normal "thanks for watching, subscribe/like/share".
// `narration` (optional) replaces the spoken line.
export function outroSlidePlan(kind = "full", { siteName = "", narration = "" } = {}) {
  if (kind === "short") {
    return {
      id: "outro",
      role: "shortoutro",
      tag: siteName ? asText(siteName) : "",
      accent: "brand",
      heading: "Thanks for watching!",
      lines: ["Subscribe · Like · Share for more", "Watch the full quiz — visit the channel"],
      body: [{ text: "Subscribe · Like · Share for more", emphasis: true }, { text: "Watch the full quiz — visit the channel" }],
      narration: asText(narration) || DEFAULT_OUTRO_NARRATION.short,
    };
  }
  return {
    id: "outro",
    role: "outro",
    tag: siteName ? asText(siteName) : "",
    accent: "brand",
    heading: "Thanks for watching!",
    lines: ["Subscribe · Like · Share", "for more"],
    body: [{ text: "Subscribe · Like · Share", emphasis: true }, { text: "for more" }],
    narration: asText(narration) || DEFAULT_OUTRO_NARRATION.full,
  };
}
