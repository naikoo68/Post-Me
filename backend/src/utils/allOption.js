// "All …" options ("All of the above", "All of these", "All four pairs", "All
// three statements", "All the above" …) always sit in the LAST slot (D). Every
// place that saves or reorders options calls pinAllOption() as its final step,
// so a shuffle / balance / rebuild can never move one to A, B or C. The correct
// answer and the per-option notes move with their option, so nothing becomes
// wrong. Pure — unit-tested. (Mirrored in frontend/src/lib/allOption.js.)

// "All" + (of)(the) + above / these / them / a count / pairs / statements …
// Not "All animals are mammals" — the word after "all" must be one of these.
const ALL_OPTION = /^all\s+(?:of\s+)?(?:the\s+)?(?:above|these|those|them|given|listed|mentioned|options|statements?|pairs?|choices|correct|(?:two|three|four|five|six|2|3|4|5|6)\b)/i;

const clean = (s) => String(s ?? "")
  .replace(/\$|\\text\s*\{|[{}*_`]/g, "")
  .replace(/^\s*(?:\(?[A-Da-d1-4]\)|[A-Da-d1-4][.)])\s*/, "") // a typed "(D) " / "D. " label
  .replace(/^[\s"'“‘(]+/, "")
  .trim();

export const isAllOption = (opt) => ALL_OPTION.test(clean(opt));

// Index of the "All …" option, or -1.
export function allOptionIndex(options) {
  const opts = Array.isArray(options) ? options : [];
  return opts.findIndex((o) => isAllOption(o));
}

// → { options, correct, optionExplanations, moved } with the "All …" option in
// the last slot (swapped with whatever was there). Unchanged when there's no
// "All" option or it's already last.
export function pinAllOption(options, correct, optionExplanations) {
  const opts = Array.isArray(options) ? options.slice() : [];
  const last = opts.length - 1;
  const at = allOptionIndex(opts);
  if (last < 1 || at < 0 || at === last) return { options: opts, correct, optionExplanations, moved: false };
  [opts[at], opts[last]] = [opts[last], opts[at]];
  let oe = optionExplanations;
  if (Array.isArray(oe)) {
    oe = oe.slice();
    while (oe.length <= last) oe.push("");
    [oe[at], oe[last]] = [oe[last], oe[at]];
  }
  let c = correct;
  if (Number.isInteger(c)) c = c === at ? last : c === last ? at : c;
  return { options: opts, correct: c, optionExplanations: oe, moved: true };
}

// In place on a question-like object { options, correct, optionExplanations }.
// Skips Assertion–Reason (its four fixed choices are an ordered rubric).
export function pinAllOptionOn(obj, type) {
  if (!obj || !Array.isArray(obj.options) || (type || obj.type) === "assertion") return false;
  const r = pinAllOption(obj.options, obj.correct, obj.optionExplanations);
  if (!r.moved) return false;
  obj.options = r.options;
  if (r.correct !== undefined) obj.correct = r.correct;
  if (r.optionExplanations !== undefined) obj.optionExplanations = r.optionExplanations;
  return true;
}
