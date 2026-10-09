// Marathon videos have their OWN designs — slide templates, card position,
// intro / end slides (full video + Short), thumbnail and saved form settings —
// separate from the "Full quiz video (automatic)" ones, so changing one never
// changes the other.
//
// They're stored in ONE Settings field, `marathonDesign`, using the SAME keys
// as the shared long-video fields. `designSite(site, "marathon")` returns the
// site with those values on top, so all the existing code (slideshow, slide
// text, thumbnail…) reads the marathon designs without knowing about them.
// Pure (tested).

export const THUMB_DESIGN_KEYS = ["ytThumbTemplateUrl", "ytThumbEnabled", "ytThumbShowText", "ytThumbShowStream", "ytThumbShowSubject", "ytThumbTextPosition",
  "ytThumbTextColor", "ytThumbAccentColor", "ytThumbBox", "ytThumbAlign", "ytThumbVAlign", "ytThumbFont",
  "ytThumbUppercase", "ytThumbKickerColor", "ytThumbBadgeTextColor", "ytThumbStrokeColor", "ytThumbStrokeWidth",
  "ytThumbShadow", "ytThumbPanelColor", "ytThumbPanelOpacity", "ytThumbPanelRadius",
  "ytThumbHeadlineSize", "ytThumbKickerSize", "ytThumbBadgeSize", "ytThumbLineHeight", "ytThumbRotate"];

export const MARATHON_DESIGN_KEYS = [
  "longVideoQuestionTemplateUrl", "longVideoAnswerTemplateUrl", "longVideoCardBox",
  "longVideoIntroTemplateUrl", "longVideoOutroTemplateUrl", "longVideoShortIntroTemplateUrl", "longVideoShortOutroTemplateUrl",
  "longVideoIntroText", "longVideoOutroText", "longVideoShortIntroText", "longVideoShortOutroText",
  "longVideoDefaults",
  ...THUMB_DESIGN_KEYS,
];

const isMarathon = (design) => design === "marathon";
const clone = (v) => (v && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v);
const plain = (site) => (site && typeof site.toObject === "function" ? site.toObject() : { ...(site || {}) });

// The shared (full-quiz) values of every design key — the starting point the
// first time marathon designs are separated.
export function sharedDesignValues(site) {
  const out = {};
  for (const k of MARATHON_DESIGN_KEYS) if (site?.[k] !== undefined) out[k] = clone(site[k]);
  return out;
}

// The marathon's own design values (before they're separated: the shared ones).
export function marathonDesignValues(site) {
  const m = site?.marathonDesign;
  if (!m || typeof m !== "object") return sharedDesignValues(site);
  const out = {};
  for (const k of MARATHON_DESIGN_KEYS) if (k in m) out[k] = m[k];
  return out;
}

// site → the site a video / editor of this design should read. Normal videos
// get the site unchanged; a marathon gets a read-only copy with its own designs.
export function designSite(site, design) {
  if (!isMarathon(design) || !site) return site;
  return { ...plain(site), ...marathonDesignValues(site) };
}

// First time: copy the current shared designs into marathonDesign, so from now
// on the two are independent. Returns true when it changed the doc (save it).
export function seedMarathonDesign(site) {
  if (!site || (site.marathonDesign && typeof site.marathonDesign === "object")) return false;
  site.marathonDesign = sharedDesignValues(site);
  site.markModified?.("marathonDesign");
  return true;
}
