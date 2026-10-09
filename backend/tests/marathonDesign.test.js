import { describe, it, expect } from "vitest";
import { designSite, seedMarathonDesign, marathonDesignValues } from "../src/utils/marathonDesign.js";
import { slideTextConfigFromSite, thumbConfigFromSite } from "../src/config/youtube.js";

const shared = () => ({
  siteName: "MSG",
  longVideoShortOutroTemplateUrl: "https://x/full-end.png",
  longVideoShortOutroText: { narration: "Full quiz end" },
  ytThumbTemplateUrl: "https://x/full-thumb.png",
  longVideoQuestionTemplateUrl: "https://x/full-q.png",
});

describe("marathon designs are independent of the full quiz video", () => {
  it("before separating, a marathon reads the shared designs", () => {
    const s = shared();
    expect(designSite(s, "marathon").longVideoShortOutroTemplateUrl).toBe("https://x/full-end.png");
    expect(designSite(s, "")).toBe(s); // normal videos: the site itself
  });

  it("seeding copies the shared designs once", () => {
    const s = shared();
    expect(seedMarathonDesign(s)).toBe(true);
    expect(seedMarathonDesign(s)).toBe(false);
    expect(s.marathonDesign.ytThumbTemplateUrl).toBe("https://x/full-thumb.png");
  });

  it("changing the marathon design leaves the full quiz one alone (and back)", () => {
    const s = shared();
    seedMarathonDesign(s);
    s.marathonDesign = { ...s.marathonDesign, longVideoShortOutroTemplateUrl: "https://x/marathon-end.png", longVideoShortOutroText: { narration: "Marathon end" } };
    s.ytThumbTemplateUrl = "https://x/new-full-thumb.png"; // a full-quiz change
    const m = designSite(s, "marathon");
    expect(slideTextConfigFromSite(m, "shortoutro").templateUrl).toBe("https://x/marathon-end.png");
    expect(slideTextConfigFromSite(m, "shortoutro").narration).toBe("Marathon end");
    expect(slideTextConfigFromSite(s, "shortoutro").templateUrl).toBe("https://x/full-end.png");
    expect(thumbConfigFromSite(m).templateUrl).toBe("https://x/full-thumb.png");
    expect(thumbConfigFromSite(s).templateUrl).toBe("https://x/new-full-thumb.png");
    expect(m.siteName).toBe("MSG"); // everything else still comes from the site
  });

  it("the seed is a copy, not shared objects", () => {
    const s = shared();
    seedMarathonDesign(s);
    s.longVideoShortOutroText.narration = "changed";
    expect(marathonDesignValues(s).longVideoShortOutroText.narration).toBe("Full quiz end");
  });
});
