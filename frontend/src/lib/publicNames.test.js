import { describe, it, expect } from "vitest";
import { displayName, displayTrail } from "./displayName.js";
import { hidePrefixesForPublic } from "./publicNames.js";

describe("order prefixes are hidden from the public", () => {
  it("strips the order prefix only", () => {
    expect(displayName("A) Cash Book")).toBe("Cash Book");
    expect(displayName("(C) JKSSB")).toBe("JKSSB");
    expect(displayName("AB) Ledger")).toBe("Ledger");
    expect(displayName("12. Bank Reconciliation")).toBe("Bank Reconciliation");
    expect(displayName("1) Intro")).toBe("Intro");
    for (const t of ["A. P. J. Abdul Kalam", "U.S. History", "Class 10", "2023-24 Budget", "A)"]) expect(displayName(t)).toBe(t);
    expect(displayTrail("A) JKSSB › B) Accounting › F) Cash Book")).toBe("JKSSB › Accounting › Cash Book");
  });
  it("keeps the server's order and never touches question text or people", () => {
    const list = [{ _id: 1, name: "A) Basic Terminologies" }, { _id: 2, name: "B) Introduction" }, { _id: 3, name: "C) Accounting Equation" }];
    expect(hidePrefixesForPublic(list).map((x) => x.name)).toEqual(["Basic Terminologies", "Introduction", "Accounting Equation"]);
    const q = { text: "A) which is right?", options: ["A) x", "B) y"], topic: { title: "F) Cash Book" }, owner: { name: "B) Ravi", email: "r@x.com" } };
    const out = hidePrefixesForPublic(q);
    expect(out.text).toBe("A) which is right?");
    expect(out.options).toEqual(["A) x", "B) y"]);
    expect(out.topic.title).toBe("Cash Book");
    expect(out.owner.name).toBe("B) Ravi");
  });
});
