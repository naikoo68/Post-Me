// Public pages show names WITHOUT their order prefix ("A) Cash Book" → "Cash
// Book"). Done ONCE, on the API responses the site receives, so every public
// page — streams, subjects, topics, sessions, quizzes, tests, exams, study
// material, search, breadcrumbs, page titles — is covered without each page
// having to remember it. The server already returns lists SORTED by the full
// prefixed name, so the order stays exactly as the prefixes set it.
//
// Management screens (admin panel, creator workspace) keep the prefixes, so
// they can still be edited and reordered.
import { displayName, displayTrail } from "./displayName.js";

// Name-like fields on content objects. ("text" — question wording — and
// "options" are never touched.)
const NAME_KEYS = new Set(["name", "title", "label", "topicName", "subjectName", "streamName", "examName", "quizName", "sessionName", "breadcrumb", "trail", "path"]);
// Short context strings that some APIs send instead of an object.
const CONTEXT_KEYS = new Set(["stream", "subject", "topic", "session", "quiz", "exam", "section"]);

const isManagementPage = () => {
  try {
    const p = (typeof window !== "undefined" && window.location?.pathname) || "";
    return /^\/(admin|creator|client|institute-admin)(\/|$)/.test(p);
  } catch { return false; }
};

// People / accounts are never content — leave their names alone.
const isPerson = (o) => o && typeof o === "object" && ("email" in o || "role" in o || "phone" in o);

function clean(value, depth) {
  if (depth > 8 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  if (typeof value !== "object") return value;
  if (isPerson(value)) return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string" && (NAME_KEYS.has(k) || CONTEXT_KEYS.has(k))) {
      out[k] = /[›|]/.test(v) ? displayTrail(v) : displayName(v);
    } else if (v && typeof v === "object") {
      out[k] = clean(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Applied to every API response on public pages (see lib/api.js) — quiz
// results and search come back from POSTs. No-op on management pages.
export function hidePrefixesForPublic(data) {
  if (isManagementPage()) return data;
  return clean(data, 0);
}
