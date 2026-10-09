import { describe, it, expect } from "vitest";
import { buildSlidePlan, OPTION_PAUSE_SEC } from "../src/config/slidePlan.js";
import { splitNarrationPauses } from "../src/utils/narrationPauses.js";

describe("table questions: the table is never read", () => {
  it("skips a table question's rows, reads the options", () => {
    const q = { type: "table", text: "Study the table and answer.", tableRows: [["Year", "Sales"], ["2020", "500"], ["2021", "700"]], options: ["500", "700", "1200", "200"], correct: 2 };
    const [s] = buildSlidePlan(q);
    expect(s.narration).not.toMatch(/Row|table, |Sales|2021/);
    expect(s.narration).toMatch(/Study the table and answer\./);
    expect(s.narration).toMatch(/Option A: 500\. Option B: 700\./);
  });
  it("drops a pipe table written inside the question text", () => {
    const q = { type: "mcq", text: "Find the total.\n| Item | Cost |\n|---|---|\n| Pen | 10 |", options: ["10", "20"], correct: 0 };
    expect(buildSlidePlan(q)[0].narration).not.toMatch(/Item|Pen|\|/);
  });
});

describe("journal / ledger: a pause between the option letters", () => {
  const q = { type: "journal", text: "Pass the journal entry for cash sales.", options: ["| Account | Dr | Cr |\n| Cash | 500 | |", "| Account | Dr | Cr |\n| Sales | 500 | |", "x", "y"], correct: 0 };
  it("Option A. [pause] Option B. …", () => {
    const [s] = buildSlidePlan(q);
    expect(s.pauses).toBe(true);
    const parts = splitNarrationPauses(s.narration);
    expect(parts.filter((p) => p.pause === OPTION_PAUSE_SEC)).toHaveLength(3);
    expect(parts.filter((p) => p.text).map((p) => p.text)).toEqual(["Pass the journal entry for cash sales. Option A.", "Option B.", "Option C.", "Option D."]);
    expect(s.caption).not.toMatch(/\[pause/);
  });
  it("normal questions have no pause marks", () => {
    const [s] = buildSlidePlan({ type: "mcq", text: "Q?", options: ["a", "b"], correct: 0 });
    expect(s.pauses).toBeUndefined();
    expect(s.narration).not.toMatch(/\[pause/);
  });
});
