// Post Me is web-only (no Capacitor app). Kept so copied pages that build
// share links keep working.
export const isNativeApp = () => false;

// The public website address for links people share or open elsewhere.
export function siteOrigin() {
  if (typeof window === "undefined" || !window.location) return "";
  return window.location.origin;
}
